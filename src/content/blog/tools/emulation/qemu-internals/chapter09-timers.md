---
title: "Ch 9: 타이머와 클럭"
date: 2026-05-17T09:00:00
description: "QEMU의 시간 관리, RTC, 타이머 구현을 이해한다."
tags: [QEMU, Timer, Clock, RTC, icount]
series: "QEMU Internals"
seriesOrder: 9
draft: true
---

QEMU의 *시간 관리*는 *real time*과 *virtual time*을 명확히 분리합니다. host wall clock과 guest의 시뮬레이션 시간이 *다른 속도*로 흐를 수 있고, 그 차이가 *deterministic 시뮬레이션*과 *real-time guest 호환*을 모두 가능하게 합니다.

## 세 가지 clock

| Clock | 의미 |
|-------|------|
| `QEMU_CLOCK_REALTIME` | host wall clock (monotonic) |
| `QEMU_CLOCK_VIRTUAL` | guest virtual time |
| `QEMU_CLOCK_HOST` | host monotonic clock (시계 변경 무관) |
| `QEMU_CLOCK_VIRTUAL_RT` | virtual time이지만 real time과 동기 |

대부분의 device timer는 `QEMU_CLOCK_VIRTUAL`을 사용. guest의 timer가 *그 안에서* 일어남.

## 시간 측정

```c
int64_t now = qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL);
int64_t now_ms = qemu_clock_get_ms(QEMU_CLOCK_VIRTUAL);
```

`ns` 단위가 표준. host clock은 `CLOCK_MONOTONIC_RAW`(Linux) 또는 OS-specific.

## QEMUTimer 사용

```c
typedef struct DeviceState {
    /* ... */
    QEMUTimer *timer;
} DeviceState;

static void timer_callback(void *opaque) {
    DeviceState *s = opaque;
    /* 시간 만료 시 호출 */
    do_periodic_work(s);

    /* 다음 expiry 재예약 */
    timer_mod(s->timer,
              qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + 1000000);  /* 1ms */
}

static void realize(DeviceState *dev, Error **errp) {
    DeviceState *s = MY_DEVICE(dev);
    s->timer = timer_new_ns(QEMU_CLOCK_VIRTUAL, timer_callback, s);
}

static void unrealize(DeviceState *dev) {
    DeviceState *s = MY_DEVICE(dev);
    timer_free(s->timer);
}
```

`timer_mod`로 *expiry time set*. 만료되면 main loop가 *callback 호출*.

## ARM Generic Timer

ARM CPU의 *built-in* timer. 각 CPU core가 가짐.

| Component | 역할 |
|-----------|------|
| **Physical timer** | EL2/EL3 |
| **Virtual timer** | EL1 (guest용) |
| **Hypervisor timer** | EL2 |
| **Secure physical timer** | EL3 |

```c
/* virt 머신에서 자동 생성 */
qdev_get_gpio_in(DEVICE(cpu), ARM_TIMER_VIRTUAL_IRQ)
```

guest Linux의 `arch_timer`가 이 timer를 사용.

## RTC — Real Time Clock

wall clock을 제공.

| Model | 사용처 |
|-------|--------|
| `mc146818rtc` | x86 standard PC |
| `pl031` | ARM PrimeCell |
| `goldfish_rtc` | virt 머신 (Android emulator 시작) |

```c
DeviceState *rtc = qdev_new("pl031");
sysbus_realize(SYS_BUS_DEVICE(rtc), &error_fatal);
sysbus_mmio_map(SYS_BUS_DEVICE(rtc), 0, 0x09010000);
```

guest가 *전원 켤 때*의 시간을 RTC에서 읽음. host wall clock 또는 *고정값*으로 설정 가능.

```bash
qemu-system-x86_64 -rtc base=utc           # host UTC
qemu-system-x86_64 -rtc base=2020-01-01    # 고정 시점
qemu-system-x86_64 -rtc base=localtime     # host local
```

## icount — 명령어 카운트 기반 시간

```bash
qemu-system-x86_64 -icount shift=0
```

`shift=N`: *명령어 1개 = 2^N ns*. shift=0이면 1ns/instruction.

| Mode | 의미 |
|------|------|
| disabled | virtual time이 *real time 따라감* (기본) |
| `shift=auto` | runtime에 조정 |
| `shift=N` | 고정 |

`icount`의 장점: *결정론적 시뮬레이션*. 같은 input은 같은 timing. 디버깅·regression에 유용.

단점: *느림*. high-throughput workload에 부적합.

## ARM Generic Timer 옵션

```bash
qemu-system-aarch64 -cpu cortex-a72 -machine virt,...
```

`-rtc clock=vm`이면 virtual time, `clock=host`면 host time. default는 host.

## Timer warp

virtual time이 *real time*보다 *늦으면* `timer_warp_clock`이 *시간을 앞당김*. idle 상태에서 *기다리지 않고* 다음 expiry로 점프.

```c
/* main loop의 일부 */
if (deadline < INT64_MAX) {
    qemu_clock_run_timers(QEMU_CLOCK_VIRTUAL);
    /* virtual time 진행 */
    qemu_clock_warp(QEMU_CLOCK_VIRTUAL);
}
```

이 메커니즘으로 *idle guest*가 host CPU를 *낭비하지 않음*.

## Clock notifier

clock 변경 시 callback.

```c
qemu_clock_register_reset_notifier(QEMU_CLOCK_VIRTUAL, &notifier);
```

migration 시 *clock이 destination host로 전송*되어 *jump* 가능. device가 *그 jump를 안다*면 적절히 처리.

## Migration의 timer 처리

VMState가 timer state를 자동 전송.

```c
VMSTATE_TIMER_PTR(timer, MyState),
```

migration 후 destination QEMU가 *남은 시간*으로 timer 재예약.

## NTP·PTP 결합

guest 안에서 ntpd/chronyd 같은 time daemon이 동작 가능. virtual clock의 *drift*를 *NTP server*로 보정.

PTP(Precision Time Protocol)는 sub-µs 동기에 사용. KVM이 *KVM_PTP_CLOCK_NS*를 통해 host clock을 직접 노출.

```bash
ls /dev/ptp*
# /dev/ptp_kvm
```

## 흔한 함정

- **`QEMU_CLOCK_REALTIME` 사용** — real time이 *guest 진행*과 무관. timer가 *real 시간*에 fire되어 guest 입장에서 *드물게* 발사.
- **timer leak** — realize에서 만들고 unrealize에서 *해제 잊음*. memory leak.
- **icount overhead** — 고도 throughput에 *5~10×* 느려짐. *deterministic 필요한 시점*에만.
- **migration 후 RTC drift** — destination host가 다른 시간이면 *guest 시간이 jump*. NTP로 후속 동기.

## 정리

- QEMU는 *real time*(host wall clock)과 *virtual time*(guest simulation)을 분리.
- `QEMU_CLOCK_VIRTUAL`이 device timer의 표준. `QEMU_CLOCK_REALTIME`은 host에 묶임.
- `QEMUTimer`로 expiry callback 등록. `timer_mod`/`timer_new_ns`.
- **ARM Generic Timer**가 ARM CPU의 built-in timer. EL별 분리.
- **RTC**(mc146818, pl031, goldfish_rtc)가 wall clock — `-rtc base=...`.
- **icount**로 *결정론적 simulation*. shift=N으로 cycle/instruction 조정.
- **Timer warp**로 idle 시 virtual time 점프 — host CPU 낭비 방지.
- **PTP**(/dev/ptp_kvm)로 host-guest sub-µs 동기.

## 다음 장 예고

다음 장은 *시간을 넘어 공간으로* — **live migration**. 실행 중인 VM을 다른 host로 옮기는 메커니즘.

## 관련 항목

- [Ch 8: 인터럽트 컨트롤러](/blog/tools/emulation/qemu-internals/chapter08-interrupt-controller)
- [Ch 10: 마이그레이션](/blog/tools/emulation/qemu-internals/chapter10-migration)
- [QEMU Embedded — RTOS Timing](/blog/tools/emulation/qemu-embedded/chapter12-rtos)
