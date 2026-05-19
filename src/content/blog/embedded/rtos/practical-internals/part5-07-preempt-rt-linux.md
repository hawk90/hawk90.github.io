---
title: "5-07: PREEMPT_RT Linux — Mainline 6.12·Xenomai 4·EVL"
date: 2026-05-07T08:00:00
description: "2024년 9월 Linux 6.12 mainline에 합류한 PREEMPT_RT의 핵심 변경을 정리하고, Xenomai 4·EVL과 함께 RTOS와의 선택 기준을 비교합니다. threaded IRQ·sleeping spinlock·cyclictest까지 한 지도에 모읍니다."
series: "Practical RTOS Internals"
seriesOrder: 52
tags: [preempt-rt, linux, xenomai, evl, real-time-linux]
---

## 한 줄 요약

> **"PREEMPT_RT는 Linux를 real-time 운영체제로 바꿉니다."** — 2024년 9월 Linux 6.12 mainline에 합류하면서 *별도 patch 없이 활성 가능*해졌고, RTOS와 Linux의 경계가 다시 그어졌습니다.

## 어떤 문제를 푸는가

지금까지 임베디드 시스템 설계는 단순한 이분법을 따랐습니다. *hard real-time*이 필요하면 RTOS(FreeRTOS, VxWorks 등), *풍부한 stack과 driver*가 필요하면 Linux입니다. 두 요건이 *동시에* 필요하면 dual-core SoC에 두 OS를 따로 올리는 AMP 구조가 일반적이었습니다.

PREEMPT_RT는 이 구도를 바꿉니다. *Linux 자체가 RT 응답성*을 가지도록 커널 핵심 자료구조를 바꾸는 patch이며, 20년의 외부 patch 유지 끝에 2024년 9월 Linux 6.12에 mainline merge되었습니다. 이제 RTOS와 *비교 가능한 latency*를 가진 Linux를 *모든 distro*에서 활성할 수 있습니다.

이번 편의 목표는 두 가지입니다. 첫째, PREEMPT_RT가 mainline에서 *무엇을 어떻게 바꾸는지* 정리합니다. 둘째, Xenomai 4/EVL의 dual-kernel 접근과 비교하고, RTOS와 PREEMPT_RT를 가르는 *결정 기준*을 명확히 합니다.

## Mainline 합류 — 20년의 종착점

```text
2004        Ingo Molnar (Red Hat) PREEMPT_RT 시작
2005~2023   외부 patch로 유지, 매 LTS마다 backport
2023        대부분 변경사항이 mainline merge 진행
2024-09     Linux 6.12에서 *CONFIG_PREEMPT_RT* 정식 활성
```

이제 모든 distro의 *기본 kernel*에서 CONFIG_PREEMPT_RT를 켜고 빌드할 수 있습니다. Yocto, Buildroot, Debian Real-Time 모두 별도 patch 관리 부담이 사라졌습니다. 산업·자동차 시스템 설계의 *분수령*입니다.

## 핵심 변경 1 — Threaded IRQ

PREEMPT_RT의 가장 중요한 변경입니다. 모든 ISR을 *별도 kernel thread*로 옮깁니다.

```text
Mainline Linux (PREEMPT):
  ISR 진입 → 즉시 실행 → softirq deferred
  ISR 자체는 *priority 없음*, 일반 process를 막음

PREEMPT_RT:
  ISR 진입 → 짧은 ack → kthread wake
  kthread가 일반 scheduler에서 *priority로 경합*
  → 응답성을 priority로 통제 가능
```

```bash
ps -eo pid,pri,comm | grep irq
# 4321 49 [irq/16-eth0]
# 4322 48 [irq/17-usb1]
# 4323 50 [irq/27-i2c-1]
```

각 IRQ가 *별도 thread*로 보입니다. `chrt`로 priority를 조정하거나 `taskset`으로 코어를 고정할 수 있습니다. RT critical IRQ를 *가장 높은 priority*로 두고 best-effort IRQ를 낮추는 식의 통제가 일반화됩니다.

## 핵심 변경 2 — Sleeping Spinlock

Mainline Linux의 `spin_lock`은 *busy-wait*입니다. PREEMPT_RT에서는 내부적으로 *RT-mutex*로 변환됩니다.

```text
Mainline:
  spin_lock() → CPU busy-wait
  block 불가, IRQ는 막힘

PREEMPT_RT:
  spin_lock() → RT-mutex
  block 가능, priority inheritance 자동
  대기 중 IRQ는 통과
```

거의 모든 kernel lock이 *block 가능*해집니다. 그 결과 *kernel 안에서 길게 잡혀 있던 lock*이 RT critical thread의 응답을 막던 문제가 사라집니다. Priority inheritance도 자동으로 적용되어 Mars Pathfinder류의 priority inversion이 *kernel 안에서도* 차단됩니다.

순수 spinning이 필요한 *극히 짧은 영역*은 `raw_spinlock_t`로 별도 표시되어 그대로 남습니다.

## 핵심 변경 3 — High-Resolution Timer

```c
struct hrtimer t;
hrtimer_init(&t, CLOCK_MONOTONIC, HRTIMER_MODE_REL);
t.function = my_callback;
hrtimer_start(&t, ktime_set(0, 100 * 1000), HRTIMER_MODE_REL);  /* 100 µs */
```

`hrtimer`는 mainline에도 있지만 PREEMPT_RT에서 *callback 시점의 jitter*가 크게 줄어듭니다. 일반 PREEMPT 커널에서는 callback이 wakeup 후 *수 ms 지연*되는 경우가 있지만, PREEMPT_RT는 *수십 µs* 안에 들어옵니다.

## 핵심 변경 4 — RCU와 NO_HZ

```text
PREEMPT_RT의 RCU:
  - preemptible RCU (rcupdate를 RT thread가 막지 않음)
  - 일부 callback을 별도 kthread로 분리

NO_HZ_FULL:
  - 지정 코어에서 *tick 자체를 꺼서* application interference 제거
  - isolcpus와 함께 사용해 RT 코어 격리
```

이 두 변경이 *RT 코어를 사실상 격리*할 수 있게 만듭니다. application은 system call을 제외하면 거의 *RTOS와 같은 결정성*을 얻습니다.

## Latency 측정 — cyclictest

```bash
sudo cyclictest -p 99 -t -n -m -h 200 -i 1000

# T: 0 ( 1234) P:99 I:1000 C:1000000 Min:  2  Act:  4  Avg:  5  Max:  67
# T: 1 ( 1235) P:99 I:1000 C:1000000 Min:  3  Act:  5  Avg:  6  Max: 312
```

`Max`가 worst-case wakeup jitter입니다. RT 시스템에서는 이 값이 *deadline 안*에 들어와야 합니다. 잘 튜닝된 PREEMPT_RT 시스템에서는 100-300 µs 안쪽이 일반적입니다.

```text
Mainline Linux (PREEMPT):
  IRQ latency 평균 10-50 µs
  worst case 수 ms

PREEMPT_RT (Cortex-A53 튜닝):
  IRQ latency 평균 5-15 µs
  worst case 100-300 µs

RTOS (Cortex-M4 FreeRTOS):
  IRQ latency 80-100 ns
  worst case 수 µs
```

PREEMPT_RT는 *수십 µs ~ 수백 µs* 영역입니다. *수 µs hard RT*가 필요하면 여전히 RTOS의 영역입니다.

## Xenomai 4 / EVL — Dual Kernel

PREEMPT_RT보다 *더 강한 hard RT 보장*이 필요하면 Xenomai 4 또는 그 후속인 EVL Core가 선택지입니다. 구조가 다릅니다.

```text
PREEMPT_RT:
  단일 Linux kernel을 RT로 만듦
  모든 application이 Linux syscall 사용 가능
  worst case 100-300 µs

Xenomai 4 / EVL:
  Linux + 별도 RT layer (co-kernel)
  Hardware IRQ → RT layer → Linux (또는 RT app)
  RT app은 *Linux syscall 못 씀* (전용 API)
  worst case ~10 µs
```

Xenomai 4는 *out-of-tree patch*로 유지되며, EVL Core가 최신 후속입니다. RT app은 `evl_*` API를 통해 작성되고, 일반 Linux process와 *완전히 분리된 시간 축*에서 실행됩니다.

```c
#include <evl/evl.h>

void rt_thread(void)
{
    evl_attach_self("/rt_app:1");
    evl_set_thread_mode(EVL_T_WOSS, NULL);   /* warn on out-of-band switch */

    for (;;) {
        evl_usleep(1000);                    /* 1 ms RT sleep — guaranteed */
        do_real_time_work();
    }
}
```

`EVL_T_WOSS`(warn on switch)는 RT thread가 *실수로 Linux syscall로 빠질 때* 경고합니다. RT 영역과 best-effort 영역 사이의 경계를 코드에서 명시적으로 유지합니다.

## 두 접근 비교

| 항목 | PREEMPT_RT | Xenomai 4 / EVL |
|---|---|---|
| Mainline 통합 | ✓ (Linux 6.12, 2024) | × (out-of-tree patch) |
| Hard RT 보장 | soft (~100 µs) | hard (~10 µs) |
| Linux API | full | RT side 제한 |
| Driver 호환 | 모든 driver | 전용 RT driver 필요 |
| 학습 곡선 | 낮음 | 높음 |
| 자동차 ABS 적용 | marginal | 적합 |
| HMI·인포테인먼트 | 적합 | overkill |
| 채택 추세 | 빠르게 확대 | 특수 분야 유지 |

PREEMPT_RT의 mainline 합류로 *상당수의 산업·자동차 시스템*이 dual-kernel 부담 없이 single-kernel PREEMPT_RT로 전환되고 있습니다. Xenomai/EVL은 *진짜 µs-level hard RT*가 필요한 좁은 영역에 집중되어 갑니다.

## 산업 PLC — Linux + PREEMPT_RT

```text
Bosch Rexroth·Siemens·Beckhoff:
  PREEMPT_RT Linux on Cortex-A
  EtherCAT slave (1-10 µs cycle)
  Codesys runtime
  OPC-UA·MQTT 통합

2024년 이후:
  mainline PREEMPT_RT로 LTS kernel 채택 가속
  Yocto·Debian Real-Time 표준화
```

산업 자동화에서 PREEMPT_RT가 *de facto 표준*에 가까워지고 있습니다. EtherCAT slave의 1 ms cycle은 PREEMPT_RT의 latency budget 안에 무난히 들어갑니다.

## 자동차 — Linux + RT + 별도 ASIL 코어

```text
BMW iX·Tesla Model 3·Mercedes EQS·현대 IONIQ 5:
  인포테인먼트·UX  Linux
  일부 ECU         PREEMPT_RT
  ASIL-D safety   별도 Cortex-R lock-step + AUTOSAR

자동차 주류 trend:
  ECU consolidation — 여러 ECU를 하나의 큰 SoC로 통합
  Linux + PREEMPT_RT가 non-safety 영역을 모두 차지
  ASIL-D만 별도 Cortex-R 또는 RH850 island에 분리
```

자동차는 *완전 단일 kernel*로 가지 않습니다. ASIL-D 인증이 필요한 safety 기능은 *별도 lock-step 코어*에 남기고, 나머지를 Linux + PREEMPT_RT로 통합하는 구조가 표준이 되어 갑니다.

## 적용 사례

### ROS 2 + PREEMPT_RT

```text
ROS 2 + PREEMPT_RT:
  servo control 1 kHz
  센서 acquisition
  path planning (best-effort)
  safety monitor (RT critical)

채택: Universal Robots, Boston Dynamics, KUKA
```

ROS 2는 RT-friendly로 재설계되어 PREEMPT_RT 위에서 *deterministic 응답*을 가집니다. 산업용 협동 로봇과 모바일 로봇 분야에서 표준에 가깝습니다.

### 프로 오디오

```text
Linux audio professional:
  JACK audio server
  PREEMPT_RT kernel
  48 kHz/96 kHz · sub-ms latency

음악 production·라이브 sound 사용.
```

오디오 production은 *수 ms 이상의 jitter*가 청감으로 인지됩니다. PREEMPT_RT의 latency budget이 이 요구와 잘 맞습니다.

## Tuning — RT 성능 추출

```bash
# 1. CPU isolation
isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3   # kernel cmdline

# 2. CPU frequency 고정
sudo cpupower frequency-set -g performance

# 3. SMT (hyperthreading) 비활성
echo off | sudo tee /sys/devices/system/cpu/smt/control

# 4. RT process 설정
chrt -f 80 ./rt_app                          # SCHED_FIFO priority 80

# 5. application 내부
mlockall(MCL_CURRENT | MCL_FUTURE);          # swap 방지
sched_setscheduler(0, SCHED_FIFO, &param);   # 자체 priority 설정
```

자동차와 산업 분야에서 *수년간 검증된 튜닝 표준*입니다. 한 가지라도 빠지면 latency budget이 즉시 무너집니다.

## Yocto·Buildroot 통합

```bash
# Yocto local.conf
PREFERRED_VERSION_linux-yocto = "6.12%"
KERNEL_FEATURES_append = " features/rt/rt.scc"
```

Yocto 6.12+는 PREEMPT_RT가 *built-in feature*로 제공됩니다. 산업 OS image 구성에서 별도 patch 관리 없이 한 줄로 RT kernel을 활성할 수 있습니다.

## RTOS vs Linux PREEMPT_RT — 결정 기준

```text
RTOS 선택:
  hard RT < 10 µs deadline
  footprint < 1 MB
  인증 (ASIL-D, DO-178C Level A)
  single-purpose 디바이스
  MCU 클래스 하드웨어

Linux PREEMPT_RT 선택:
  soft RT (10 µs - 1 ms deadline)
  footprint > 50 MB OK
  다양한 driver·protocol 필요
  multi-purpose 시스템
  Cortex-A·x86 SoC

Hybrid (자동차·로봇 표준):
  Cortex-A + Linux PREEMPT_RT (인포테인먼트·ROS)
  Cortex-R + RTOS·AUTOSAR (safety-critical)
  OpenAMP로 IPC
```

경계가 명확합니다. *µs deterministic이 필요한 MCU 영역*은 RTOS, *수십 ~ 수백 µs로 충분한 SoC 영역*은 PREEMPT_RT입니다. 자동차와 로봇은 *두 영역을 한 보드 안*에 함께 두는 hybrid가 표준입니다.

## 자주 보는 함정

> 경고 — PREEMPT_RT를 hard RT로 가정

```text
"PREEMPT_RT는 µs 보장" → ABS·airbag에 적용
→ worst case 100-300 µs → safety budget 초과
```

PREEMPT_RT는 *soft RT*입니다. 진짜 µs hard RT가 필요하면 Xenomai/EVL 또는 RTOS를 별도 코어에 두어야 합니다.

> 경고 — Mainline 코드를 PREEMPT_RT 검증 없이 사용

```c
spin_lock(&l);
msleep(10);
```

mainline에서 `spin_lock`은 busy-wait이므로 안에서 `msleep` 호출은 명백한 버그입니다. PREEMPT_RT에서는 *spin_lock이 mutex*가 되어 sleep이 허용되지만, *기대 동작이 달라지므로* 코드 의도를 검증해야 합니다.

> 경고 — CPU isolation 없이 RT app

```bash
chrt -f 80 ./rt_app
```

SCHED_FIFO priority만 올리고 *코어 isolation*을 안 하면, 다른 process나 kernel 작업이 같은 코어에 끼어들어 latency budget이 깨집니다. `isolcpus` + 전용 코어가 표준 구성입니다.

> 경고 — RT app 무한 루프

```c
while (1) ;   /* SCHED_FIFO + 무한 루프 → 시스템 hang */
```

SCHED_FIFO는 *yield 없이 무한 점유*가 가능합니다. RT thread의 sleep/yield를 명시하지 않으면 *kernel 다른 작업*까지 막혀 시스템이 사실상 정지합니다. `RTLIMIT`이나 watchdog으로 보호합니다.

## 정리

- PREEMPT_RT는 *Linux 자체를 real-time*으로 만드는 patch이며, 2024년 9월 Linux 6.12에서 mainline에 합류했습니다.
- Threaded IRQ로 모든 ISR이 priority를 가진 thread가 되어, *RT critical IRQ*를 명시적으로 통제할 수 있습니다.
- Sleeping spinlock으로 kernel 내부 lock도 *block 가능*해지고 priority inheritance가 자동으로 적용됩니다.
- Latency는 *soft RT 영역(100-300 µs worst case)*이며, *수 µs hard RT*는 여전히 RTOS의 영역입니다.
- Xenomai 4 / EVL은 dual-kernel 구조로 *수 µs hard RT*를 보장하지만, 학습 곡선과 driver 호환성 제약이 따릅니다.
- 산업 PLC와 ROS 2 기반 로봇은 PREEMPT_RT가 사실상 표준이 되어 가고 있습니다.
- 자동차는 *Cortex-A + Linux PREEMPT_RT*와 *Cortex-R + RTOS·AUTOSAR*를 한 보드 안에 두는 hybrid 구조가 표준입니다.
- 결정 기준은 *deadline 단위, footprint, 인증 요건*에 의해 단순하게 갈립니다.

이번 글로 *Practical RTOS Internals* 시리즈 전체가 마무리됩니다. Part 1부터 Part 5까지 60+ 편을 거치며 task와 ISR, 동기화, scheduling, 메모리, 컨텍스트 스위치, SMP, 그리고 주요 RTOS 소스 분석까지 한 지도 위에 모았습니다.

## 관련 항목

- [1-01: 왜 RTOS인가](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
- [5-06: Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
