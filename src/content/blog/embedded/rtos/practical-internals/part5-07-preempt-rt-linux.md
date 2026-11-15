---
title: "PREEMPT_RT Linux — Mainline 6.12·Xenomai 4·EVL"
slug: "embedded/rtos/practical-internals/part5-07-preempt-rt-linux"
date: 2026-05-08T09:52:00
description: "Linux 6.12의 PREEMPT_RT 지원 조건과 핵심 변경을 정리하고, Xenomai 4·EVL과 함께 RTOS와의 선택 기준을 비교합니다. threaded IRQ·sleeping spinlock·cyclictest까지 한 지도에 모읍니다."
series: "Practical RTOS Internals"
seriesOrder: 52
tags: [preempt-rt, linux, xenomai, evl, real-time-linux]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"PREEMPT_RT는 Linux를 real-time 운영체제로 바꿉니다."** — Linux 6.12의 mainline 지원과 실제 architecture·config·driver 조건을 구분해야 합니다. OS 이름만으로 deadline이 보장되지는 않습니다.

## 어떤 문제를 푸는가

지금까지 임베디드 시스템 설계는 단순한 이분법을 따랐습니다. *hard real-time*이 필요하면 RTOS(FreeRTOS, VxWorks 등), *풍부한 stack과 driver*가 필요하면 Linux입니다. 두 요건이 *동시에* 필요하면 dual-core SoC에 두 OS를 따로 올리는 AMP 구조가 일반적이었습니다.

PREEMPT_RT는 이 구도를 바꿉니다. *Linux 자체가 RT 응답성*을 가지도록 커널 핵심 자료구조를 바꾸는 patch이며, 20년의 외부 patch 유지 끝에 2024년 9월 Linux 6.12에 mainline merge되었습니다. 사용 architecture의 ARCH_SUPPORTS_RT와 kernel config·배포판 build·driver를 확인해야 합니다. 모든 distro의 기본 binary가 RT kernel이라는 뜻은 아닙니다.

이번 편의 목표는 두 가지입니다. 첫째, PREEMPT_RT가 mainline에서 *무엇을 어떻게 바꾸는지* 정리합니다. 둘째, Xenomai 4/EVL의 dual-kernel 접근과 비교하고, RTOS와 PREEMPT_RT를 가르는 *결정 기준*을 명확히 합니다.

## Mainline 합류 — 20년의 종착점

Linux 6.12 mainline에 필요한 지원이 통합된 것과 각 architecture/config·distro image에서 CONFIG_PREEMPT_RT를 선택할 수 있는 조건은 별개입니다. 6.12보다 오래된 제품 kernel은 해당 RT patch/backport의 유지 범위를 확인해야 합니다. merge window와 정식 release 시점도 구분합니다.

이 글은 Linux 6.12 lock/NO_HZ 문서와 Linux realtime/EVL 공식 문서를 대조합니다. board kernel을 build·boot하거나 cyclictest를 실행한 보고서는 아닙니다.

## 핵심 변경 1 — Threaded IRQ

많은 interrupt handler를 scheduler가 관리하는 thread 문맥으로 옮깁니다. 모든 IRQ가 예외 없이 thread가 되는 것은 아닙니다. low-level primary handler와 IRQF_NO_THREAD·per-CPU 등 예외 조건을 확인합니다.

IRQ thread의 policy·priority·affinity는 application과 driver의 dependency·처리량·deadline을 함께 분석해 정합니다. IRQ마다 무조건 별도 thread가 하나 있고 가장 중요한 IRQ를 무조건 최고 priority로 두면 안전하다는 규칙은 없습니다.

```bash
# Linux에서 실제 thread를 관찰하는 read-only 예. 이 host에서는 실행하지 않음.
ps -eLo pid,tid,cls,rtprio,comm
```

hard IRQ 진입부터 device ACK·thread wake·application 소비까지 단계별 지연을 나누어 관찰합니다.

## 핵심 변경 2 — Sleeping Spinlock

non-RT의 spinlock_t는 spinning/preemption-disabled 동작을 사용하지만 **일반 spin_lock이 IRQ까지 끄지는 않습니다.** IRQ 보호는 _irq/_irqsave 변형 등 별도 계약입니다.

PREEMPT_RT의 spinlock_t는 rt_mutex 기반의 다른 구현으로 바뀌고 PI를 사용합니다. 그러나 raw_spinlock_t·bit spinlock은 실제 spinning 경로로 남으며, lock을 기다릴 수 있다는 사실이 보호 구간에서 임의 msleep을 허용하는 API 계약은 아닙니다. 두 kernel config에 모두 맞는 실행 문맥·lock nesting 규칙을 지켜야 합니다.

PI도 IRQ-disabled/raw lock 구간·deadlock·모든 resource interference를 제거하지 않습니다. owner progress·최대 hold time을 실제 workload로 확인합니다.

## 핵심 변경 3 — High-Resolution Timer

hrtimer 자체는 PREEMPT_RT 전용이 아닙니다. hard/soft callback mode와 실제 kernel revision의 실행 문맥을 확인합니다. callback의 clock·resolution과 thread가 실제 실행되는 latency는 다릅니다. PREEMPT면 수 ms, RT면 수십 µs라는 보편적인 비교값은 이 글에서 측정하지 않았습니다.

## 핵심 변경 4 — RCU와 NO_HZ

preemptible RCU·callback offload·NO_HZ_FULL은 서로 다른 config와 조건을 가집니다. nohz_full은 모든 interrupt·timer·kernel/firmware 간섭을 제거하지 않으며 해당 CPU에 runnable task가 여럿인 경우 등 tick을 유지하는 조건도 있습니다.

IRQ routing·housekeeping CPU·RCU·scheduler domain·device/DMA/shared cache를 함께 검토합니다. isolcpus/nohz_full/rcu_nocbs 문자열 하나가 RTOS와 같은 결정성이나 deadline을 자동 보장하지 않습니다.

## Latency 측정 — cyclictest

cyclictest는 예정 wake 시각과 실제 실행 시각의 차이를 관찰합니다. 출력의 Max는 **실험 중 관찰 최대값**이며 입증된 WCET나 IRQ 진입부터 application 완료까지 전체 latency가 아닙니다.

```bash
# Linux test machine에서 rt-tests version/help로 지원 옵션부터 확인
cyclictest --help
# 예: privilege·CPU·priority·기간은 검증 계획에 맞춰 별도 지정
# cyclictest -p 80 -t 1 -m -i 1000 -D 60s
```

kernel/config·board/firmware·clock/power·CPU affinity·IRQ 배치·memory locking·load·duration·sample/drop/overflow와 histogram을 함께 남깁니다. 짧은 idle 측정 max가 deadline보다 작다는 이유만으로 모든 상황의 상한을 증명하지 않습니다.

```js title="parse-cyclictest.mjs"
export function parseCyclictest(text) {
    const rows = [];
    for (const line of text.split(/\r?\n/)) {
        if (!/^\s*T:/.test(line)) continue;
        const m = /^\s*T:\s*(\d+)\s+\(\s*\d+\)\s+P:\s*\d+\s+I:\s*\d+\s+C:\s*(\d+)\s+Min:\s*(\d+)\s+Act:\s*(\d+)\s+Avg:\s*(\d+)\s+Max:\s*(\d+)\s*$/.exec(line);
        if (!m) throw new Error('unsupported T row format');
        const [id, count, min, act, avg, max] = m.slice(1).map(Number);
        if (![id,count,min,act,avg,max].every(Number.isSafeInteger) ||
            count === 0 || min > max || act < min || act > max || avg < min || avg > max)
            throw new RangeError('invalid measurement row');
        rows.push({id, count, observedMinUs:min, observedMaxUs:max});
    }
    if (rows.length === 0) throw new Error('no measurement rows');
    return rows;
}
```

이 parser는 해당 기본 T-row 형식·µs 단위만 지원합니다. 다른 옵션의 출력·ns 단위·histogram·JSON은 별도 format contract가 필요합니다. host synthetic fixture로 검증했으며 실제 kernel latency를 측정한 것은 아닙니다.

## Xenomai 4 / EVL — Dual Kernel

EVL은 Linux in-band와 out-of-band 실행을 구분하며 kernel/core와 libevl의 API/ABI revision을 맞춰야 합니다. EVL을 Xenomai 4와 무관한 단순 후속 제품으로 나누거나 모든 board에서 ~10 µs를 보장한다고 표현하지 않습니다.

일반 POSIX thread가 evl_attach_self로 EVL에 붙을 수 있습니다. mainline Linux service를 호출하면 in-band로 전환되어 latency 보증 조건이 달라질 수 있습니다. Linux syscall이 절대 불가능한 별도 시간 축이라는 설명은 맞지 않습니다.

evl_set_thread_mode의 fd·mask·output parameter는 사용 release의 실제 signature를 확인합니다. EVL_T_WOSS 진단과 evl_usleep 호출 한 줄은 period·deadline 보증을 대신하지 않습니다. 이 글은 EVL core/lib를 build·실행하지 않았습니다.

## 두 접근 비교

| 비교 축 | PREEMPT_RT | EVL 계열 |
|---|---|---|
| 실행 구조 | mainline RT config와 Linux scheduler | in-band Linux + out-of-band RT services |
| 검증 대상 | arch/config·driver·lock/IRQ·application | matching core/lib ABI·RT services/driver·stage 전환 |
| deadline | 실제 hardware/workload에서 검증 | 실제 hardware/workload·OOB 유지 조건에서 검증 |

hard/soft RT는 요구와 deadline 위반의 결과·보증 근거를 포함한 시스템 속성입니다. PREEMPT_RT=항상 soft100µs, EVL=항상 hard10µs라는 숫자 등급으로 나누지 않습니다. 모든 driver가 RT 적합하거나 특정 ABS에 자동 적합하다는 표도 사용하지 않습니다.

## 산업 PLC — Linux + PREEMPT_RT

fieldbus IRQ·DMA·frame 처리부터 application 제어/출력까지 실제 budget을 나눕니다. EtherCAT cycle 수치만으로 user task deadline 달성을 판단하지 않습니다. 해당 회사·제품·kernel/config의 공개 근거 없는 채택 목록과 고정 latency 표는 이 글의 실행 증거가 아닙니다.

## 자동차 — Linux + RT + 별도 ASIL 코어

Linux와 별도 RT/safety domain을 조합할 수 있지만, 차종 이름이나 ASIL label만으로 동일한 Cortex-R·lock-step·AUTOSAR 구조를 추정하지 않습니다. OS 분리 후에도 shared memory·DMA·IRQ·power/reset 간섭과 통신 실패를 검증해야 합니다.

## 적용 사례

### ROS 2와 오디오

ROS 2 node·executor·DDS·allocator·driver와 kernel scheduler를 함께 구성해야 end-to-end latency를 평가할 수 있습니다. RT-friendly API나 PREEMPT_RT 사용만으로 deterministic 응답이 완성되지는 않습니다.

오디오도 sample rate뿐 아니라 period/buffer·device·IRQ·processing budget과 underrun을 관찰합니다. 회사 채택 목록·고정 ms 허용치보다 재현 가능한 workload와 deadline 증거를 사용합니다.

## Tuning — RT 성능 추출

먼저 read-only로 kernel config·policy·IRQ affinity·clock/power와 현재 병목을 확인합니다. CPU isolation, frequency/power 제한, memory prefault/locking과 RT scheduling은 각 원인이 확인된 뒤 비교 실험합니다.

모든 시스템에서 SMT를 끄거나 특정 CPU를 격리해야 하는 것은 아니며 governor performance가 모든 hardware에서 고정 주파수를 뜻하지 않습니다. mlockall도 stack·heap prefault와 resource limit·실패 처리를 생략할 수 없습니다. priority 변경이 dependency와 housekeeping을 굶기지 않는지도 확인합니다.

## Yocto·Buildroot 통합

Yocto release와 kernel version은 같은 번호 체계가 아닙니다. 선택한 BSP/kernel recipe·machine과 rt feature/fragment 지원을 확인하고 최종 .config·image에서 CONFIG_PREEMPT_RT를 검증합니다. 오래된 _append 문법이나 KERNEL_FEATURES 한 줄을 모든 Yocto release에 복사하지 않습니다.

Buildroot도 선택한 kernel tree/config·architecture와 필요한 RT patch/backport 여부를 확인합니다. Linux 6.12라는 이름만으로 모든 이전 BSP의 patch 유지가 사라지지는 않습니다.

## RTOS vs Linux PREEMPT_RT — 결정 기준

deadline과 허용 위반·필수 driver/API·memory/power·격리·assurance·유지보수에 대해 동일 workload로 비교합니다. 10 µs/1 MB/50 MB 같은 고정 경계로 OS를 자동 배정하지 않습니다.

hybrid도 한 선택지지만 IPC·peer reset·shared resource 간섭까지 검증해야 합니다. 실제 조건을 명시한 측정·분석 근거를 기준으로 고릅니다.

## 자주 보는 함정

- 평균·관찰 Max를 모든 상황의 deadline 상한으로 사용하지 않습니다.
- 일반 spin_lock과 IRQ masking을 혼동하거나 RT에서 임의 sleep을 허용하지 않습니다.
- priority만 높이거나 isolation만 켜서 전체 간섭이 사라졌다고 가정하지 않습니다.
- SCHED_FIFO의 긴 CPU 점유와 recovery/RT throttling·RLIMIT_RTTIME 정책을 실제 지원 환경에서 확인합니다.

## 정리

Linux 6.12 지원 조건, 실제 lock/IRQ 문맥과 측정 범위를 구분합니다. PREEMPT_RT·EVL·MCU RTOS 모두 product의 deadline을 이름만으로 보장하지 않으며 관찰 결과와 잔여 조건을 함께 기록해야 합니다.

## 근거 자료

- [Linux 6.12 lock types](https://docs.kernel.org/6.12/locking/locktypes.html), [NO_HZ](https://docs.kernel.org/6.12/timers/no_hz.html).
- [Linux realtime differences](https://docs.kernel.org/6.18/core-api/real-time/differences.html): IRQ/thread·hrtimer 문맥은 사용 revision과 대조.
- [Linux Foundation cyclictest](https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/start), [측정 원리 FAQ](https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/faq).
- [EVL thread API](https://evlproject.org/core/user-api/thread/), [API revisions](https://evlproject.org/core/user-api/api-revs/).



이번 글로 *Practical RTOS Internals* 시리즈 전체가 마무리됩니다. Part 1부터 Part 5까지 프롤로그 포함 53편을 거치며 task와 ISR, 동기화, scheduling, 메모리, 컨텍스트 스위치, SMP, 그리고 주요 RTOS 소스 분석까지 한 지도 위에 모았습니다.

## 관련 항목

- [1-01: 왜 RTOS인가](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
- [5-06: Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
