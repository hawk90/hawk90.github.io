---
title: "5-07: PREEMPT_RT Linux — Mainline·Xenomai·EVL Core 비교"
date: 2026-05-20T08:00:00
description: "PREEMPT_RT mainline (Linux 6.12, 2024). Threaded IRQ, sleeping spinlock. Xenomai·EVL dual-kernel."
series: "Practical RTOS Internals"
seriesOrder: 52
tags: [preempt-rt, linux, xenomai, evl, real-time-linux]
draft: true
---

## 한 줄 요약

> **"PREEMPT_RT = Linux를 real-time으로"** — 2024년 mainline 합류. RTOS 대체할 수 있는 영역 확대.

## 역사 — PREEMPT_RT Mainline 합류

```text
2004년: Ingo Molnar (Red Hat) PREEMPT_RT patch 시작
~ 2024년: 외부 patch로 20년 유지
2024년 9월: Linux 6.12에 *fully mainline merge*
  → 모든 distro에서 CONFIG_PREEMPT_RT=y 활성 가능
```

산업계·자동차·로봇 — *변화의 분수령*.

## PREEMPT_RT 핵심 변경

### 1. Threaded IRQ — 모든 ISR이 kthread

```text
Mainline Linux (PREEMPT):
  ISR → 즉시 실행 → IRQ 빠르게 종료 → softirq deferred

PREEMPT_RT:
  ISR → 짧은 ack만 → kthread로 wake
  kthread가 *일반 schedule*
  → ISR 자체가 priority 갖는 thread
```

```bash
# IRQ thread 보기
ps -eo pid,pri,comm | grep irq
# 4321 49 [irq/16-eth0]
# 4322 48 [irq/17-usb1]
```

각 IRQ가 *별도 thread* — `chrt`·`taskset`으로 priority·affinity 통제.

### 2. Sleeping Spinlock — RT-mutex

```text
Mainline:
  spin_lock() — busy wait
  
PREEMPT_RT:
  spin_lock() → 내부에서 *RT-mutex* 사용
  → block 가능 → IRQ 응답 빠름
```

거의 모든 kernel lock이 *block 가능*. Priority inheritance 자동.

### 3. High-Resolution Timer

```c
struct hrtimer t;
hrtimer_init(&t, CLOCK_MONOTONIC, HRTIMER_MODE_REL);
t.function = callback;
hrtimer_start(&t, ktime_set(0, 100000), HRTIMER_MODE_REL);   /* 100 µs */
```

`hrtimer` — nanosecond 해상도. Mainline에도 있지만 *PREEMPT_RT에서 더 정확*.

## Latency Performance

```text
Mainline Linux (PREEMPT):
  IRQ latency avg 10-50 µs
  worst case 수 ms

PREEMPT_RT:
  IRQ latency avg 5-15 µs
  worst case 100-300 µs (튜닝 시)
  
RTOS (FreeRTOS Cortex-M):
  IRQ latency 80-100 ns
  worst case 수 µs
```

PREEMPT_RT는 *수십 µs ~ 수백 µs* range. *수 µs hard RT*는 RTOS.

## Cyclictest — Latency 측정

```bash
sudo cyclictest -p 99 -t -n -m -h 200 -i 1000

# 출력
# T: 0 ( 1234) P:99 I:1000 C:1000000 Min:  2  Act:    4  Avg:    5  Max:      67
# T: 1 ( 1235) P:99 I:1000 C:1000000 Min:  3  Act:    5  Avg:    6  Max:     312
```

Max latency = *worst case wakeup jitter*. Hard RT 시스템에선 *deadline 안*여야.

## Xenomai 4 — Dual Kernel

```text
Xenomai 4 (EVL Core):
  - Linux + 별도 RT layer (Cobalt → EVL)
  - Hard RT (수 µs)
  - Linux는 일반 schedule (best-effort)
  
Architecture:
  Hardware IRQ → EVL Core → Linux (또는 RT app)
  
RT app — *Linux syscall 못 씀* (special API).
```

Xenomai 4 = *진짜 hard RT* Linux. 자동차 ABS·산업 제어에서 사용.

## EVL Core

```c
#include <evl/evl.h>

void rt_thread(void) {
    evl_attach_self("/rt_app:1");   /* RT context 진입 */
    evl_set_thread_mode(EVL_T_WOSS, NULL);   /* warning if switch oob */
    
    while (1) {
        evl_usleep(1000);   /* 1 ms RT sleep — *guaranteed* */
        do_real_time_work();
    }
}
```

EVL — Xenomai 4 후속. Linux 6.x kernel에 *out-of-tree patch*. Hard RT 보장.

## RT 비교 — PREEMPT_RT vs Xenomai

| 항목 | PREEMPT_RT | Xenomai 4 / EVL |
|---|---|---|
| Mainline | ✓ (2024) | × (patch) |
| Hard RT 보장 | soft (~100 µs) | hard (~10 µs) |
| Linux API | full | partial (RT side) |
| Driver compat | 모든 driver | 특수 RT driver만 |
| 학습 곡선 | 낮음 | 높음 |
| 자동차 ABS | marginal | 적합 |
| HMI·정보계 | 적합 | overkill |

## 산업 PLC — Linux + PREEMPT_RT

```text
Bosch Rexroth·Siemens·Beckhoff:
  - PREEMPT_RT Linux on Cortex-A
  - EtherCAT slave (1-10 µs cycle)
  - Codesys runtime
  
2024+ trend: PREEMPT_RT mainline → 더 큰 채택
```

## 자동차 — Linux + RT

```text
BMW iX·Tesla Model 3·Mercedes EQS:
  - 인포테인먼트 Linux
  - PREEMPT_RT 통합 (일부 ECU)
  - ASIL-D는 *별도 Cortex-R lock-step*
  
자동차 *주류 trend*:
  - 다양한 ECU 통합 (consolidation)
  - Linux로 *non-safety-critical 모두*
  - Cortex-R + AUTOSAR로 *ASIL-D만*
```

## Real-Time Linux 적용 사례

### Robot Operating System (ROS 2)

```text
ROS 2 + PREEMPT_RT:
  - Servo control 1 kHz
  - Sensor data acquisition
  - Path planning (best-effort)
  - Human safety (RT critical)
```

ROS 2 — RT support 정식. Universal Robots·Boston Dynamics 사용.

### Audio·Pro Tools

```text
Linux Audio Pro:
  - JACK audio server
  - PREEMPT_RT kernel
  - 48 kHz/96 kHz · sub-ms latency
  
음악 production·라이브 sound 사용.
```

## Tuning — Performance

```bash
# Isolate CPU for RT
isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3   /* kernel cmdline */

# Disable CPU frequency scaling
sudo cpupower frequency-set -g performance

# Disable hyperthreading (latency)
echo off | sudo tee /sys/devices/system/cpu/smt/control

# Lock memory
mlockall(MCL_CURRENT | MCL_FUTURE);

# Real-time scheduling
chrt -f 80 ./rt_app   /* SCHED_FIFO priority 80 */
```

자동차·산업 — *수년간 검증된 tuning 표준*.

## Yocto·Buildroot Integration

```bash
# Yocto layer
git clone git://git.yoctoproject.org/meta-rt-tests

# local.conf
PREFERRED_VERSION_linux-yocto = "6.12%"
KERNEL_FEATURES_append = " features/rt/rt.scc"
```

Yocto 6.12+ — *PREEMPT_RT built-in*. 산업 OS image 표준.

## "RTOS vs Linux RT" — 결정 기준

```text
RTOS 선택:
  - Hard RT < 10 µs deadline
  - Footprint < 1 MB
  - 인증 (ASIL-D·DO-178C Level A)
  - Single-purpose device

Linux PREEMPT_RT 선택:
  - Soft RT (10 µs - 1 ms deadline)
  - Footprint > 50 MB OK
  - 다양한 driver·protocol 필요
  - Multi-purpose

Hybrid:
  - Cortex-A (Linux PREEMPT_RT) + Cortex-R (RTOS)
  - Multi-OS architecture (자동차 표준)
```

## 자주 하는 실수

> ⚠️ PREEMPT_RT = hard RT 가정

```text
"PREEMPT_RT로 µs 보장"
→ 실제 worst case 100-300 µs
→ ABS·airbag엔 *부족*
```

→ 진짜 hard RT는 *Xenomai 4 / EVL / RTOS*.

> ⚠️ Mainline vs PREEMPT_RT 차이 무시

```c
spin_lock(&l);
msleep(10);   /* mainline OK, PREEMPT_RT는 spin_lock이 *내부 mutex* — sleep OK이지만 *주의* */
```

→ PREEMPT_RT 호환 코드 검증.

> ⚠️ CPU isolation 없이 RT app

```bash
chrt -f 80 ./rt_app   /* SCHED_FIFO but kernel·다른 process 영향 */
```

→ isolcpus + dedicated core.

> ⚠️ Buggy RT app

```c
while (1) ;   /* SCHED_FIFO, infinite loop → 시스템 hang */
```

→ Watchdog 또는 `RTLIMIT`.

## 정리

- PREEMPT_RT = **Linux real-time**, 2024 mainline.
- Threaded IRQ·sleeping spinlock·priority inheritance.
- **Soft RT** (100 µs worst case) — 산업·자동차 인포테인먼트.
- **Xenomai 4 / EVL** = 진짜 hard RT Linux.
- "RTOS vs Linux RT" — *deadline·footprint·인증*에 따라.
- Hybrid (Cortex-A Linux + Cortex-R RTOS) = 자동차 표준.

이번 series **Practical RTOS Internals 전체 완료** (Part 1-5, 60+편).

## 관련 항목

- [5-06: NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
- [Performance Engineering 3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
- [4-12: AMP·OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
