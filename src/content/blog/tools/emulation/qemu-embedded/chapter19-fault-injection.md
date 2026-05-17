---
title: "Ch 19: 임베디드 Fault Injection"
date: 2025-09-02T19:00:00
description: "Clock skew·power glitch·watchdog — embedded fault 시뮬레이션."
tags: [QEMU, fault-injection, watchdog, robustness]
series: "QEMU Embedded Emulation"
seriesOrder: 19
draft: true
---

## 이 챕터의 의도

자동차, 항공, 의료 같은 safety-critical 시스템은 fault가 발생해도 안전해야 한다(ISO 26262 ASIL, DO-178C, IEC 62304). Functional safety test는 실 HW에 fault를 인위적으로 주입하는 게 표준이지만 비용과 재현성이 부담이다. QEMU에서 같은 fault를 결정적으로 주입할 수 있으면 수천 시나리오를 CI로 자동화할 수 있다.

## 핵심 항목

- ✦ Embedded-specific fault 카테고리
  - **Clock** — skew, drift, jitter, stop
  - **Power** — brownout, glitch, undervoltage lockout
  - **Sensor** — stuck-at, drift, intermittent
  - **Memory** — bit-flip (SEU), ECC error, RAM 손상
  - **Peripheral** — timeout, hang, register corruption
  - **Communication** — packet loss, frame error, bus arbitration fail
- ✦ **QEMU monitor + QMP** — fault 주입 API
- ✦ Clock skew simulation — `qtest_set_irq` + `timer_mod` 조작, virtual clock 가속/감속
- ✦ Timer drift — TSC offset 주입, scheduler test
- ✦ Power glitch / brownout — voltage signal device 추가, brownout reset trigger
- ✦ **Watchdog timeout test** — watchdog peripheral 정지, deadlock 시 reset 확인
- ✦ EDAC (Error Detection And Correction) — memory module ECC error 주입
- ✦ RAM bit-flip — `memory_region_set_dirty` + 임의 주소 write로 NV cell 시뮬레이션
- ✦ Fault model — single-event upset, stuck-at-1/0, transient
- ✦ Use case
  - Automotive — ASIL-D ECU, brownout 후 정상 부팅
  - Avionics — DO-178C, watchdog 무한 루프 시 reboot
  - Medical — IEC 62304, alarm 누락 검증
- ✦ Recovery 코드 검증 — driver의 `error_recovery` path, ECC scrub, retry
- ◦ Coverage 측정 — fault 주입 후 코드 path 도달도
- ◦ Mutation testing 결합 — fault injection × mutated code

## 다이어그램 (4)

1. Fault 카테고리 매트릭스 (Power/Clock/Sensor/Memory × persistent/transient)
2. QMP fault injection 흐름 — test harness → QMP → QEMU → guest
3. Watchdog timeout test 시퀀스 (정상 → 멈춤 → WDT → reset)
4. RAM bit-flip 후 ECC scrub recovery flow

## 코드 sketch

```python
# Python 테스트 하니스 — QMP로 fault 주입
import qemu.qmp as qmp

q = qmp.QEMUMonitorProtocol(('localhost', 4444))
q.connect()

# 1. Clock drift 주입
q.command('qom-set', path='/machine/clk24m', property='frequency', value=23990000)
# (시스템이 240Hz timer interrupt를 0.04% drift로 받음)

# 2. Watchdog stop
q.command('stop')
time.sleep(2)
# expect: guest watchdog reset triggered

# 3. RAM bit-flip
q.command('memsave', val=0x40001234, size=4, filename='/tmp/before')
q.command('pmemsave', val=0x40001234, size=4, filename='/tmp/flipped')
# verify ECC handler 동작

# 4. Power brownout (custom device)
q.command('qom-set', path='/machine/pwrmgr', property='vdd_mv', value=1500)
# expect: brownout detection ISR
```

```c
/* QEMU 측 — custom power management device */
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
        qemu_set_irq(s->brownout_irq, 1);   /* trigger ISR */
    }
}

static void pwrmgr_class_init(ObjectClass *klass, void *data) {
    object_class_property_add(klass, "vdd_mv", "int", NULL, pwrmgr_set_vdd, NULL, NULL);
}
```

```c
/* Driver 측 — brownout ISR */
static irqreturn_t pwrmgr_brownout_isr(int irq, void *dev_id) {
    dev_emerg(&pdev->dev, "BROWNOUT detected, saving critical state\n");
    /* NVRAM write, safe shutdown */
    save_critical_state();
    return IRQ_HANDLED;
}
```

## 레퍼런스

- ISO 26262 part 6 (Product development at the software level)
- DO-178C (Software Considerations in Airborne Systems)
- IEC 62304 (Medical device software)
- QEMU `qapi/`, `Documentation/devel/qapi.rst`
- "Fault Injection Techniques" — Hsueh et al. (IEEE Computer 1997)
- QEMU `tests/qtest/` — qtest framework 활용 예

## 관련 항목

- [Ch 12: RTOS](/blog/tools/emulation/qemu-embedded/chapter12-rtos) (기존)
- [Ch 18: 보드 bringup](/blog/tools/emulation/qemu-embedded/chapter18-board-bringup)
- [Ch 20: CI matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)
- [QEMU Fake Device Ch 21: AER injection](/blog/tools/emulation/qemu-fake-device/chapter21-aer-emulation)
