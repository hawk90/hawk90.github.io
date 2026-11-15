---
title: "SMP RTOS 설계 — Ready List·Affinity·IPI·Load Balancing"
slug: "embedded/rtos/practical-internals/part4-07-smp-rtos"
date: 2026-05-07T09:39:00
description: "FreeRTOS V11.2.0과 Zephyr 3.7.0의 실제 공유 ready queue를 살펴봅니다. CPU affinity, port IPI, local IRQ mask와 SMP 배제, RP2040 SRAM 공유의 경계를 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 39
tags: [smp, multicore, affinity, ipi, load-balancing]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"SMP RTOS는 여러 core가 하나의 OS 인스턴스를 공유합니다."** — 여러 core에서 공유하는 자료구조의 접근 주체와 동기화를 다시 분석해야 합니다.

## 어떤 문제를 푸는가

single-core RTOS에서는 *한 시점에 한 task만 실행*된다는 가정이 모든 설계의 바탕이었습니다. task와 ISR의 공유 상태도 동기화가 필요합니다. 단일 core에서 적절한 IRQ mask가 보호하던 범위를 SMP에 그대로 적용할 수는 없습니다. 멀티코어가 들어오면 이 가정이 모두 깨집니다. core 0과 core 1이 *같은 ready list*를 동시에 만지고, 한 core가 IRQ를 막아도 *다른 core는 멀쩡히 진행*합니다.

해결 방향은 두 갈래입니다. **AMP**(Asymmetric Multi-Processing)는 각 core에 *별도의 OS 인스턴스*를 두고 IPC로 통신합니다. 자동차의 Cortex-A(Linux) + Cortex-R(RTOS) 조합이 전형입니다. **SMP**(Symmetric Multi-Processing)는 하나의 OS가 *모든 core를 통합 관리*합니다. Linux, FreeRTOS 11 SMP, Zephyr SMP가 여기 속합니다.

이번 편은 SMP에 집중합니다. AMP는 4-12편에서 OpenAMP를 중심으로 다룹니다.

## Ready List를 어떻게 둘 것인가

SMP scheduler 설계의 첫 결정은 *ready list를 하나로 둘 것인가, core마다 둘 것인가*입니다. 두 선택은 lock 비용과 cache locality 사이의 trade-off가 다릅니다.

### Global Ready List

```c
struct ready_list global_ready;
spinlock_t        global_lock;

void schedule(int core) {
    spin_lock(&global_lock);
    Task *t = pick_highest(&global_ready);
    spin_unlock(&global_lock);
    run_on(core, t);
}
```

위 코드는 배치 개념만 보이는 의사 코드입니다. 실제로는 선택과 함께 task를 실행 중으로 예약하고 affinity·현재 다른 core에서 실행 중인지·preemption 정책을 검사해야 합니다. 그렇지 않으면 같은 task를 두 core가 선택할 수 있습니다.

장점은 단순함입니다. *어느 core에서 보든 같은 list*이므로 부하 균형이 자연스럽게 맞춰집니다. 한 core가 idle이면 곧바로 ready list 머리에서 task를 집어가면 됩니다.

단점은 lock contention입니다. core 수가 늘어날수록 `global_lock` 위에서 충돌이 폭증합니다. ready list 자료구조 자체도 cache line이 *core 사이를 핑퐁*합니다. 어느 core 수에서 병목이 되는지는 lock hold time·ready 전이 빈도·메모리 계층과 workload로 측정합니다.

### Per-Core Ready List

```c
struct ready_list per_core_ready[NUM_CORES];
spinlock_t        per_core_lock[NUM_CORES];

void schedule(int core) {
    spin_lock(&per_core_lock[core]);
    Task *t = pick_highest(&per_core_ready[core]);
    spin_unlock(&per_core_lock[core]);
    run_on(core, t);
}
```

일반적인 per-core 설계는 local scheduling과 migration을 분리합니다. 원격 wake·migration 때 다른 queue의 lock도 필요할 수 있으므로 contention이 없다는 보장은 아닙니다. 위 의사 코드 역시 실제 scheduler 구현은 아닙니다.

단점은 *부하가 자동으로 맞춰지지 않는다*는 것입니다. core 0의 list에 task 10개가 쌓이고 core 1이 idle이어도, *명시적 load balancing이 없으면* core 1은 계속 놀게 됩니다. periodic balance나 work stealing 같은 추가 메커니즘이 필요합니다.

두 구조를 나란히 놓고 보면 trade-off가 분명해집니다. Global은 하나의 lock 위에 코어가 모이고, Per-Core는 코어마다 자기 list를 만지지만 migration이 별도로 필요합니다.

![SMP global vs per-core ready list](/images/blog/rtos/diagrams/part4-07-smp-ready-lists.svg)

### 어느 쪽을 고를까

| 항목 | Global | Per-Core |
|---|---|---|
| 공유 경로 | 공통 queue와 lock | local queue + remote wake/migration |
| 배치 | affinity와 실행 중 task 제외 필요 | queue 선택·migration 정책 필요 |
| 확인할 비용 | lock hold/wait 분포 | local 비용과 cross-queue 비용 |

core 수만으로 선택을 확정하지 않습니다. 두 구조 모두 priority·affinity·자원 간섭을 포함해 분석합니다. 그림은 일반 설계 비교이며 Zephyr의 per-CPU queue를 뜻하지 않습니다.

## FreeRTOS 11 SMP

이 글의 기준은 **FreeRTOS-Kernel V11.2.0**입니다. 지원되는 SMP port와 board integration이 먼저 필요합니다. configNUMBER_OF_CORES만 바꾸어 단일 core port를 SMP로 만들 수는 없습니다.

```c
#define configNUMBER_OF_CORES 2
#define configUSE_CORE_AFFINITY 1
```

V11.2.0 tasks.c는 공유된 priority별 ready list와 core별 current TCB를 사용합니다. kernel의 task/ISR lock 획득·해제와 원격 yield는 port 계약을 따릅니다. 두 lock이 있다는 사실만으로 application의 임의 nesting·IRQ 경로가 deadlock-free가 되지는 않습니다. configRUN_MULTIPLE_PRIORITIES와 task preemption disable 조건도 별도입니다.

```c title="smp-affinity.c"
#include "FreeRTOS.h"
#include "task.h"

/* SMP/affinity-enabled port에서 호출. task는 생성 순간부터 CPU0만 허용. */
BaseType_t create_cpu0_task(TaskFunction_t fn, TaskHandle_t *out)
{
    if (fn == NULL || out == NULL) return pdFAIL;
    return xTaskCreateAffinitySet(fn, "ctrl", 256, NULL, 2,
                                  (UBaseType_t)1, out);
}
```

일반 xTaskCreate 직후 affinity를 바꾸면 그 사이 task가 이미 실행될 수 있습니다. 생성 시 affinity API는 그 초기 실행 창을 피하는 데 유용합니다. stack depth 단위와 생성 실패도 확인합니다.



ESP-IDF의 `portMUX_TYPE`은 FreeRTOS SMP variant의 또 다른 예입니다. ESP32 dual core에서 `portENTER_CRITICAL(&mux)`가 *spinlock + IRQ disable*을 한 번에 처리합니다.

## Zephyr SMP

Zephyr **3.7.0**의 SMP 문서는 per-CPU run queue를 유지하지 않는다고 명시합니다. 따라서 FreeRTOS와 Zephyr를 단순히 global 대 per-core 구현으로 나눌 수 없습니다. CONFIG_SCHED_CPU_MASK와 scheduler backend의 제약도 해당 버전 문서를 따릅니다.

CPU mask를 바꾸는 thread는 runnable 상태여서는 안 됩니다. 예를 들어 생성 시 K_FOREVER로 시작을 보류한 thread에 k_thread_cpu_pin(thread, 0)을 호출하고 성공을 확인한 뒤 k_thread_start를 호출하는 흐름을 사용합니다. 기존 runnable thread를 임의로 수정하는 예제를 복사하지 않습니다.

이 절은 API 계약 설명이며 Zephyr board build·SMP 실행 검증은 포함하지 않습니다.

## IPI — Cross-Core 동기화의 기본

core 0이 *다른 core에 즉시 알려야* 할 때 IPI(Inter-Processor Interrupt)를 보냅니다. GIC 기반 ARM 시스템에서는 SGI가 IPI 전달 수단이 될 수 있으며 vector 배치는 OS/port가 정합니다.

```c
/* Linux */
smp_call_function_single(target_cpu, fn, arg, /*wait=*/true);

/* FreeRTOS 11 SMP */
portYIELD_CORE(target_core);
```

대표 용도가 셋입니다. 첫째, higher-priority task가 *다른 core에서 ready*가 되었을 때 그 core를 깨워 reschedule을 trigger합니다. 둘째, MMU page table을 바꾼 뒤 *모든 core의 TLB를 invalidate*시키는 TLB shootdown입니다. 셋째, kernel panic 시 *모든 core를 정지*시키는 broadcast입니다.

embedded SMP에서 가장 자주 보는 패턴은 첫 번째입니다. core 0이 ISR에서 task를 unblock했는데 그 task의 priority가 core 1에서 실행 중인 task보다 높다면, port가 제공하는 원격 reschedule 경로를 요청합니다. PendSV는 일부 Cortex-M port의 수단이지 모든 SMP의 interrupt 이름은 아닙니다. masking·상위 IRQ·scheduler 상태 때문에 즉시 실행이 보장되지 않습니다.

## Critical Section을 다시 정의하기

local IRQ mask는 다른 core를 정지시키지 않습니다. 같은 core ISR도 같은 lock을 쓸 때는 IRQ 재진입을 막고 inter-core lock도 획득해야 합니다. task 전용 공유 상태는 sleep 가능한 mutex 등 접근 조건에 맞는 수단을 고릅니다.

```c
spinlock_t lock;

unsigned long flags;
spin_lock_irqsave(&lock, flags);
critical_section();
spin_unlock_irqrestore(&lock, flags);
```

IRQ disable은 *내 core 안에서 ISR이 끼어드는 것*을 막고, spinlock은 *다른 core가 같은 자료구조에 들어오는 것*을 막습니다. 같은 자료구조의 모든 참여자가 동일한 계약을 지켜야 합니다. Linux kernel 문맥의 예이며 일반 FreeRTOS API가 아닙니다.

```c
__disable_irq();                /* ← 다른 core 안 보호 — SMP에서 깨짐 */
critical_section();
__enable_irq();
```

single-core에서 동작하던 코드가 *SMP에서 silent하게 깨지는* 가장 흔한 패턴입니다.

## Cache Coherency가 곧 비용

cache가 있는 SMP에서 공유 line의 ownership 이동·false sharing은 비용의 한 원인입니다. lock queue·interconnect·IRQ mask·preemption 비용도 분리해야 합니다. 출처·build·workload 없는 Cortex-A72 cycle 표는 성능 근거가 될 수 없어 사용하지 않습니다.

**RP2040의 두 Cortex-M0+에는 일반 data cache가 없습니다.** SRAM 값을 다른 core가 읽기 위해 data-cache flush를 해야 한다는 설명은 틀립니다. XIP flash cache와 SRAM 공유는 다른 문제입니다. 공유 데이터에는 언어 차원의 race 방지, memory ordering, SIO hardware spinlock 또는 SDK 동기화가 필요합니다. FIFO는 통신 수단의 하나이며 shared SRAM을 대신해야만 하는 유일한 수단은 아닙니다.

Cortex-M0+에서 C atomic이 항상 lock-free라고 가정하지 않습니다. 해당 toolchain/SDK 구현의 지원 범위를 확인합니다.

## Affinity 결정 — RT에는 좁게, Best-Effort에는 넓게

affinity는 허용 core 집합을 제한합니다. pinning은 locality·간섭 분석에 도움이 될 수 있지만 고정 core의 overload를 악화시킬 수도 있습니다. migration이 매번 모든 cache를 cold로 만드는 것은 아니며 cache topology·working set에 따라 다릅니다.

RT task를 반드시 pin해야 한다는 일반 규칙 대신, 허용 집합별 응답 시간·resource blocking·IRQ 배치·migration 비용을 분석합니다. best-effort task의 넓은 affinity도 자동 최적 부하 균형을 보장하지 않습니다.

## Load Balancing의 기본 패턴

per-core queue 설계는 periodic balance, remote wake 배치, idle pull 등 정책을 조합할 수 있습니다. global queue도 affinity·동시에 실행 중인 task를 고려해야 하므로 단순한 머리 pop만으로 배치가 끝나지 않습니다.

FreeRTOS와 Zephyr의 실제 정책을 설명할 때는 해당 source revision과 config를 사용합니다. Linux EAS나 특정 UI 배치 정책을 모든 embedded SMP의 동작으로 옮겨 적지 않습니다.

## SMP context switch overhead 측정

측정 시 같은 core의 hot/cold working set, migration, shared lock, IRQ wake를 따로 수집합니다. timestamp 위치·clock·compiler·cache 상태·sample 수와 latency 분포를 기록해야 합니다. 재현 자료 없는 1/2/4/10 µs 표를 일반 비용으로 사용하지 않습니다.

단일 core POSIX port의 host 검사는 실제 SMP 동시 실행·IPI·cache 간섭이나 MCU WCET를 검증하지 않습니다.

## 자주 보는 함정과 안티패턴

> 경고 — local IRQ mask를 전체 시스템 배제로 오해

다른 core에서 접근하는 상태를 local mask만으로 보호할 수 없습니다. 반대로 task-only 상태까지 모두 spinlock으로 바꿀 필요는 없습니다. 실제 접근 주체와 sleep/IRQ 제약을 기록합니다.

> 경고 — port와 application lock의 nesting을 혼동

FreeRTOS kernel task/ISR lock 순서를 application lock에 임의로 적용하지 않습니다. lock을 가진 채 block하거나 같은 core ISR이 같은 lock을 재획득하면 진행을 막을 수 있습니다.

> 경고 — affinity를 timing 보증으로 사용

pinning 후에도 IRQ·shared memory·DMA·다른 task의 간섭이 남습니다. 실제 deadline 증거는 별도로 필요합니다.

## 정리

- SMP는 공유 상태의 inter-core 동기화와 local IRQ 재진입을 구분해야 합니다.
- FreeRTOS V11.2.0과 Zephyr 3.7.0을 per-core queue 대 global queue로 잘못 대비하지 않습니다.
- affinity 생성 API, port remote-yield와 scheduler config의 계약을 확인합니다.
- RP2040 SRAM 공유에는 data-cache flush보다 적절한 동기화·ordering이 문제입니다.
- pinning·core 수·알고리즘 이름만으로 성능·WCET를 보증하지 않습니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h): affinity와 SMP port 계약.
- [Zephyr 3.7.0 SMP](https://docs.zephyrproject.org/3.7.0/kernel/services/smp/smp.html), [thread API](https://docs.zephyrproject.org/3.7.0/doxygen/html/group__thread__apis.html): queue와 CPU mask 조건.
- [RP2040 datasheet](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf): Cortex-M0+, SRAM, SIO, XIP cache.



다음 편은 [4-08 SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)에서 LDREX/STREX와 ticket/MCS lock 구조를 풉니다.

## 관련 항목

- [2-03: Scheduler Algorithm](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
