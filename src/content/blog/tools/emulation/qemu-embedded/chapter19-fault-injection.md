---
title: "Ch 19: 임베디드 Fault Injection"
date: 2026-05-17T19:00:00
description: "Clock skew·power glitch·watchdog — embedded fault 시뮬레이션."
tags: [QEMU, fault-injection, watchdog, robustness, ASIL]
series: "QEMU Embedded Emulation"
seriesOrder: 19
draft: true
---

자동차·항공·의료 같은 *safety-critical* 시스템은 fault가 발생해도 안전해야 합니다(ISO 26262 ASIL, DO-178C, IEC 62304). *Functional safety test*는 실 HW에 fault를 *인위적으로* 주입하는 게 표준이지만, 비용과 재현성이 부담입니다. QEMU에서 같은 fault를 *결정적*으로 주입할 수 있으면 수천 시나리오를 CI로 자동화할 수 있습니다.

## Embedded fault 카테고리

| 카테고리 | 예 |
|----------|-----|
| **Clock** | skew, drift, jitter, stop |
| **Power** | brownout, glitch, undervoltage lockout |
| **Sensor** | stuck-at, drift, intermittent |
| **Memory** | bit-flip(SEU), ECC error, RAM 손상 |
| **Peripheral** | timeout, hang, register corruption |
| **Communication** | packet loss, frame error, bus arbitration fail |

safety-critical 시스템은 *이 모든 fault*에 *안전 상태*로 복귀해야 합니다.

## QMP — Fault 주입 API

QEMU **QMP**(QEMU Machine Protocol)는 JSON 기반 monitor protocol. fault 주입의 핵심 도구.

```bash
qemu-system-aarch64 -M virt -m 1G -nographic \
    -kernel Image \
    -qmp tcp:localhost:4444,server,nowait
```

Python으로 attach.

```python
import qemu.qmp as qmp

q = qmp.QEMUMonitorProtocol(('localhost', 4444))
q.connect()
print(q.command('query-status'))
```

이로써 *외부 test harness*가 QEMU의 *내부 상태*를 조작할 수 있습니다.

## Clock fault — skew·drift·stop

QOM property로 clock frequency를 *runtime에* 변경.

```python
# Clock drift 주입 (정상 24MHz → 23.99MHz로 0.04% drift)
q.command('qom-set', path='/machine/clk24m',
          property='frequency', value=23990000)

# 한참 후 정상화
time.sleep(5)
q.command('qom-set', path='/machine/clk24m',
          property='frequency', value=24000000)
```

guest의 timer interrupt가 *drift된 주파수*로 도착해 *scheduler timing* test 가능.

## Power glitch / brownout

custom power management device를 만들어 *전압을 시뮬레이션*.

```c
/* QEMU 측 — power management device */
typedef struct PwrMgr {
    SysBusDevice parent;
    MemoryRegion mmio;
    int vdd_mv;            /* QOM property */
    qemu_irq    brownout_irq;
} PwrMgr;

static void pwrmgr_set_vdd(Object *obj, Visitor *v, const char *name,
                            void *opaque, Error **errp) {
    PwrMgr *s = PWRMGR(obj);
    visit_type_int(v, name, &s->vdd_mv, errp);
    if (s->vdd_mv < 1800) {
        qemu_set_irq(s->brownout_irq, 1);   /* brownout IRQ trigger */
    }
}

static void pwrmgr_class_init(ObjectClass *klass, void *data) {
    object_class_property_add(klass, "vdd_mv", "int",
                              NULL, pwrmgr_set_vdd, NULL, NULL);
}
```

driver의 *brownout ISR*이 호출되는지 확인.

```c
/* Driver — brownout handler */
static irqreturn_t pwrmgr_brownout_isr(int irq, void *dev_id) {
    dev_emerg(&pdev->dev, "BROWNOUT detected, saving critical state\n");
    /* NVRAM write, safe shutdown */
    save_critical_state();
    return IRQ_HANDLED;
}
```

QMP에서 trigger.

```python
# brownout 시뮬레이션
q.command('qom-set', path='/machine/pwrmgr',
          property='vdd_mv', value=1500)
```

driver가 *3초 안에 safe shutdown*했는지 dmesg 검증.

## Watchdog timeout

watchdog peripheral을 *정지*시켜 deadlock 시 reset이 *정상 동작*하는지 검증.

```python
# QEMU 일시정지로 guest watchdog 못 받아 timeout 유도
q.command('stop')
time.sleep(10)
# Watchdog reset 발생 확인
q.command('cont')
```

부팅 로그에 *reset 표식*이 있어야 정상.

```text
SBSA Generic Watchdog Reset...
[    0.000000] Booting Linux on physical CPU 0x0000000000
...
```

## RAM bit-flip — SEU 시뮬레이션

Single-Event Upset(SEU)를 흉내. 임의 주소에 *비트 변경*.

```python
# 1. 현재 값 dump
q.command('memsave',
          val=0x40001234, size=4,
          filename='/tmp/before')

# 2. 1 byte 변경된 새 데이터로 overwrite
import struct
with open('/tmp/before', 'rb') as f:
    data = f.read()
flipped = bytes([data[0] ^ 0x01]) + data[1:]
with open('/tmp/flipped', 'wb') as f:
    f.write(flipped)

q.command('pmemsave',
          val=0x40001234, size=4,
          filename='/tmp/flipped')

# ECC handler 동작 확인
```

ECC 사용 메모리라면 driver의 *ECC error reporter*가 fired되어야 함.

## EDAC — Error Detection And Correction

Linux의 **EDAC** subsystem이 ECC error를 *집계*합니다.

```bash
guest$ cat /sys/devices/system/edac/mc/mc0/ce_count
# correctable error count

guest$ cat /sys/devices/system/edac/mc/mc0/ue_count
# uncorrectable error count
```

bit-flip 주입 후 *correctable이 +1*인지 확인.

## Sensor fault

I2C/SPI sensor의 stuck-at·drift·intermittent를 모사.

```python
# I2C device의 register 강제 변경
q.command('qom-set',
          path='/machine/i2c1/sensor@48',
          property='temperature_c',
          value=85)   # 정상 25C → 85C (overtemp)
```

driver의 *thermal trip* logic 검증.

## Recovery 코드 검증

fault 주입의 *진짜 가치*는 *recovery path*를 확인하는 것.

| Fault | 검증할 path |
|-------|--------------|
| brownout | NVRAM save·safe shutdown |
| watchdog | reset → cold boot → state restore |
| ECC UE | retry·degrade·crash |
| sensor stuck | calibration·alarm·shutdown |

이 path들이 *코드에 있어도 평소엔 실행 안 됨*. fault injection 없이는 *진짜 동작하는지* 알 수 없습니다.

## 시나리오 자동화 — pytest

```python
# test_fault.py
import pytest
import qmp_helper as qh

@pytest.fixture
def qemu_with_qmp():
    yield qh.start_qemu_with_qmp()

@pytest.mark.parametrize("voltage_mv", [1500, 1700, 1800])
def test_brownout_recovery(qemu_with_qmp, voltage_mv):
    q = qemu_with_qmp
    qh.boot_to_login(q)

    q.command('qom-set', path='/machine/pwrmgr',
              property='vdd_mv', value=voltage_mv)

    qh.wait_for_log_line(q, "BROWNOUT detected", timeout=3)
    qh.wait_for_log_line(q, "Critical state saved", timeout=2)
```

100개 시나리오가 *5분* 안에. 실 HW로 fault injection을 한다면 *몇 시간 또는 며칠*.

## Use case 정리

| 도메인 | 표준 | QEMU 활용 |
|--------|------|-----------|
| Automotive | ISO 26262 ASIL-D | brownout·sensor stuck·watchdog |
| Avionics | DO-178C | ECC·watchdog·memory partition |
| Medical | IEC 62304 | alarm path·sensor failure |
| Industrial | IEC 61508 SIL-3 | fault detection coverage |

각 표준이 *fault injection*을 *수십~수백 시나리오* 요구합니다.

## Coverage 측정

fault 주입 후 *어떤 코드 path가 실행*되었는지 측정.

```bash
# gcov 활성 빌드
make CFLAGS_KERNEL="-fprofile-arcs -ftest-coverage" Image

# 실행 후 gcov 데이터 추출 후
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory cov-html
```

*평소엔 0% coverage*인 fault handler가 fault injection 후 *>50% coverage*가 되어야 정상.

## Mutation testing 결합

fault injection × mutated code. driver의 *robustness*를 *수학적*으로 검증.

```bash
# driver 코드의 if (err) ... 를 if (!err)로 mutation
# fault injection test가 여전히 통과하면 → handler가 *진짜* 동작 안 함
```

## 흔한 함정

- **QMP timeout** — 동기 명령이 *오래* 걸리면 timeout. async event 활용.
- **시나리오 재현 불가** — 비결정적 wait/sleep 사용 시. *boot log line* 기반 동기화.
- **fault가 너무 자주** — driver가 매번 reset state. *간격* 조절.
- **실 HW와의 gap** — QEMU에서 통과해도 실 HW에서는 timing 차이로 실패 가능. *추가* HW fault injection도 필요.

## 정리

- **Fault injection**은 safety-critical 시스템의 *복구 path* 검증 핵심 — ISO 26262, DO-178C, IEC 62304.
- 카테고리: clock·power·sensor·memory·peripheral·communication.
- **QMP**가 QEMU의 fault 주입 API — Python으로 자동화.
- Clock drift는 `qom-set frequency`, brownout은 custom pwrmgr device, watchdog은 `stop`/`cont`, RAM bit-flip은 `pmemsave`.
- driver의 *recovery path*가 *평소엔 실행 안 됨* — fault injection으로만 검증 가능.
- pytest + parametrize로 *수백 시나리오 자동화*. 실 HW 대비 *시간 절감 큼*.
- gcov coverage + mutation testing 결합으로 robustness *수학적* 측정.

## 다음 장 예고

마지막 장은 *모든 것을 결합한 환경* — **크로스 플랫폼 CI matrix**. ARM·RISC-V·x86 모두를 *매 commit*에 자동 검증하는 흐름.

## 관련 항목

- [Ch 18: 보드 bringup](/blog/tools/emulation/qemu-embedded/chapter18-board-bringup)
- [Ch 20: CI matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)
- [QEMU Fake Device — AER Emulation](/blog/tools/emulation/qemu-fake-device/chapter21-aer-emulation)
- [Developing Safety-Critical Software](/blog/embedded/avionics/developing-safety-critical/chapter01-assurance-overview)
