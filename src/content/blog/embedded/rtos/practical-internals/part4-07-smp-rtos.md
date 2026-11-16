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

해결 방향은 두 갈래입니다. **AMP**(Asymmetric Multi-Processing)는 각 core에 *별도의 OS 인스턴스*를 두고 IPC로 통신합니다. **SMP**(Symmetric Multi-Processing)는 하나의 OS가 *모든 core를 통합 관리*합니다. 주방 하나에 요리사 둘이 같은 주문서 꽂이를 보는 것이 SMP이고, 주방을 둘로 나누고 창구로 접시를 주고받는 것이 AMP입니다.

이번 편은 SMP에 집중합니다. AMP는 4-12편에서 OpenAMP를 중심으로 다룹니다. 이 글은 코드를 돌리지 않았습니다. FreeRTOS V11.2.0(commit `0adc196d`)에서 `configNUMBER_OF_CORES`를 처리하는 port는 `portable/ThirdParty/GCC/RP2040`, `portable/ThirdParty/xClang/XCOREAI`, `portable/CCRH/F1Kx`뿐이고(`grep -rl configNUMBER_OF_CORES portable`), 이 중 이 Mac의 QEMU로 띄울 수 있는 target이 없습니다. 아래 FreeRTOS·Zephyr·Linux 내용은 모두 해당 태그의 소스와 문서에서 확인한 것입니다.

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

단점은 lock contention입니다. 모든 core의 scheduling이 `global_lock` 하나를 지나가므로, core가 늘수록 한 core가 lock을 쥔 동안 다른 core가 기다리는 시간이 늘어납니다. cache가 있는 SMP라면 ready list가 담긴 cache line도 core 사이를 오갑니다.

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

per-core 설계는 자기 queue에서 고르는 일과 다른 core로 옮기는(migration) 일을 나눕니다. 다른 core의 task를 깨우거나 옮길 때는 그 core의 lock도 잡아야 하므로 contention이 0이 되지는 않습니다. 위 코드도 배치 개념만 보이는 의사 코드입니다.

단점은 *부하가 자동으로 맞춰지지 않는다*는 것입니다. core 0의 list에 task 10개가 쌓이고 core 1이 idle이어도, *명시적 load balancing이 없으면* core 1은 계속 놀게 됩니다. periodic balance나 work stealing 같은 추가 메커니즘이 필요합니다.

두 구조를 나란히 놓고 보면 trade-off가 분명해집니다. Global은 하나의 lock 위에 코어가 모이고, Per-Core는 코어마다 자기 list를 만지지만 migration이 별도로 필요합니다.

![SMP global vs per-core ready list](/images/blog/rtos/diagrams/part4-07-smp-ready-lists.svg)

### 어느 쪽을 고를까

| 항목 | Global | Per-Core |
|---|---|---|
| 공유 경로 | 공통 queue와 lock | local queue + remote wake/migration |
| 배치 | affinity와 실행 중 task 제외 필요 | queue 선택·migration 정책 필요 |
| 확인할 비용 | lock hold/wait 분포 | local 비용과 cross-queue 비용 |

그림은 일반 설계 비교입니다. 아래에서 보듯 FreeRTOS V11.2.0과 Zephyr v3.7.0은 둘 다 global 쪽입니다.

## FreeRTOS 11 SMP

이 글의 기준은 **FreeRTOS-Kernel V11.2.0**입니다. SMP는 port가 `portGET_CORE_ID()`, `portYIELD_CORE()`, `portGET_TASK_LOCK()`·`portGET_ISR_LOCK()` 같은 매크로를 제공해야 동작합니다. 앞에서 본 세 port만 이것을 갖고 있어서, 단일 core port에서 `configNUMBER_OF_CORES`만 2로 바꾸면 빌드되지 않습니다.

```c
#define configNUMBER_OF_CORES 2
#define configUSE_CORE_AFFINITY 1
```

V11.2.0 `tasks.c`의 구조는 global ready list입니다. priority별 ready list `pxReadyTasksLists[configMAX_PRIORITIES]`는 하나뿐이고(`tasks.c:475`), core마다 다른 것은 현재 task 포인터 `pxCurrentTCBs[configNUMBER_OF_CORES]`(`:467`)입니다. `prvSelectHighestPriorityTask(xCoreID)`(`:1005`)가 이 공유 list를 훑으며 "다른 core에서 이미 실행 중이 아닌가"(`xTaskRunState == taskTASK_NOT_RUNNING`, `:1086`)와 affinity bit(`:1089`)를 확인합니다. 그래서 같은 task를 두 core가 고르지 않습니다.

lock은 둘입니다. task lock과 ISR lock이고, `vTaskSwitchContext()`는 주석대로 "Must always acquire the task lock first"(`:5206`)라는 순서를 지킵니다. 다른 core에 다시 고르라고 알리는 일은 `prvYieldCore()` 매크로(`:344-365`)가 합니다. 대상이 자기 core면 `xYieldPendings`만 세우고, 다른 core면 port의 `portYIELD_CORE(xCoreID)`를 부릅니다. `configRUN_MULTIPLE_PRIORITIES`는 기본 0(`include/FreeRTOS.h:405-406`)이라, 기본 설정에서는 서로 다른 priority의 task가 동시에 돌지 않습니다.

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

`xTaskCreateAffinitySet()`의 시그니처는 `include/task.h:394-400`에 있고, affinity mask가 `xTaskCreate()`보다 한 인자 더 있습니다. `xTaskCreate()`로 만든 뒤 `vTaskCoreAffinitySet()`(`task.h:1363`)으로 바꾸면, 그 사이 다른 core가 task를 이미 집어 갔을 수 있습니다. 생성 때 mask를 주면 그 틈이 없습니다. mask는 TCB의 `uxCoreAffinityMask`(`tasks.c:383`)에 저장되고, 주석은 `UBaseType_t`가 core 수 이상의 bit를 가져야 한다고 적습니다.

## Zephyr SMP

Zephyr v3.7.0의 SMP 문서(`doc/kernel/services/smp/smp.rst:98-121`)는 "The kernel does not keep a per-CPU run queue"라고 적습니다. Zephyr도 FreeRTOS처럼 하나의 run queue를 모든 CPU가 봅니다. 같은 문서는 CPU mask(`CONFIG_SCHED_CPU_MASK`)를 켜면 scheduler가 mask를 검사하느라 list를 끝까지 훑어야 해서, `CONFIG_SCHED_DUMB` backend에서만 쓸 수 있다고 적습니다.

같은 절은 `k_thread_cpu_mask_*` API가 runnable thread에 대해서는 불법이고 "-EINVAL"을 돌려준다고 적습니다. `k_thread_cpu_pin()`의 doc comment(`include/zephyr/kernel.h:932-946`)도 "The thread must not be currently runnable"입니다. 그래서 `K_FOREVER` delay로 만들어 시작을 보류한 thread에 `k_thread_cpu_pin(thread, 0)`을 호출하고, 반환값을 확인한 뒤 `k_thread_start()`로 시작합니다. 이 순서는 문서에서 확인했고 실행하지는 않았습니다.

## IPI — Cross-Core 동기화의 기본

core 0이 *다른 core에 즉시 알려야* 할 때 IPI(Inter-Processor Interrupt)를 보냅니다. 옆 요리사의 어깨를 두드리는 일입니다. 어떤 하드웨어로 두드리는지(GIC의 SGI, RP2040의 SIO FIFO interrupt 등)는 port가 정합니다.

```c
/* Linux v6.12 include/linux/smp.h:50 */
int smp_call_function_single(int cpuid, smp_call_func_t func, void *info, int wait);

/* FreeRTOS V11.2.0: port가 정의, tasks.c의 prvYieldCore()가 호출 */
portYIELD_CORE(xCoreID);
```

FreeRTOS에서 IPI를 쓰는 곳은 reschedule 하나입니다. core 0이 ISR에서 task를 깨웠는데 그 task가 core 1에서 도는 task보다 높다면, `prvYieldForTask()`(`tasks.c:890`)가 대상 core를 골라 `prvYieldCore()`로 `portYIELD_CORE()`를 부릅니다. 이미 yield를 요청해 둔 core에는 다시 보내지 않도록 `taskTASK_SCHEDULED_TO_YIELD` 상태를 둡니다(`:359-362`). 받는 core가 interrupt를 막고 있으면 그만큼 늦게 처리됩니다.

## Critical Section을 다시 정의하기

local IRQ mask는 다른 core를 정지시키지 않습니다. 같은 core ISR도 같은 lock을 쓸 때는 IRQ 재진입을 막고 inter-core lock도 획득해야 합니다. task 전용 공유 상태는 sleep 가능한 mutex 등 접근 조건에 맞는 수단을 고릅니다.

```c
spinlock_t lock;

unsigned long flags;
spin_lock_irqsave(&lock, flags);
critical_section();
spin_unlock_irqrestore(&lock, flags);
```

IRQ disable은 *내 core 안에서 ISR이 끼어드는 것*을 막고, spinlock은 *다른 core가 같은 자료구조에 들어오는 것*을 막습니다. 같은 자료구조를 만지는 모든 코드가 같은 lock을 써야 합니다. 위 코드는 Linux kernel API입니다. FreeRTOS SMP의 `taskENTER_CRITICAL()`은 같은 두 일을 합니다. SMP용 `vTaskEnterCritical()`(`tasks.c:7023`)은 `portDISABLE_INTERRUPTS()`로 interrupt를 막고, nesting이 처음일 때 task lock과 ISR lock을 차례로 잡습니다(`:7027`, `:7035-7036`).

```c
__disable_irq();                /* ← 다른 core 안 보호 — SMP에서 깨짐 */
critical_section();
__enable_irq();
```

single-core에서는 이것이 완전한 critical section이었지만, SMP에서는 다른 core가 같은 자료구조에 그대로 들어옵니다. 컴파일러도 경고하지 않습니다.

## Cache Coherency가 곧 비용

cache가 있는 SMP에서는 두 core가 같은 cache line을 번갈아 쓰면 line의 소유권이 오가는 비용이 듭니다. 서로 다른 변수라도 같은 line에 있으면 같은 비용이 드는데(false sharing), 이 글에서는 측정하지 않았습니다. 예전 판의 Cortex-A72 cycle 표는 출처가 없어 지웠습니다.

**RP2040의 SRAM 앞에는 data cache가 없습니다.** RP2040 datasheet(build-date 2025-02-20) 2.6.3.1 "XIP Cache"는 칩의 16 kB cache가 XIP 서브시스템 안에 있고 "only affects accesses to XIP flash, so software does not have to consider cache coherence, unless performing flash programming operations"라고 적습니다. 그래서 다른 core가 SRAM 값을 보게 하려고 data cache를 flush한다는 설명은 틀립니다. 공유 데이터에 필요한 것은 동기화입니다. 같은 datasheet 2.3.1.3은 SIO의 hardware spinlock 32개를 설명합니다. 이 RP2040 내용은 datasheet로만 확인했고 실행하지 않았습니다.

## Affinity 결정 — RT에는 좁게, Best-Effort에는 넓게

affinity는 task가 돌 수 있는 core 집합을 줄입니다. RT task를 한 core에 묶으면 그 task가 어느 core에서 돌지 정해지므로, 그 core에 묶인 task들만 놓고 응답 시간을 따질 수 있습니다. 대신 그 core에 일이 몰려도 다른 core가 도와주지 못합니다. 넓은 affinity의 best-effort task는 빈 core를 쓸 수 있지만, FreeRTOS V11.2.0처럼 global list를 쓰는 커널에서는 그 task가 어느 core에서 돌지 매번 달라집니다.

## Load Balancing의 기본 패턴

per-core queue 설계는 주기적 balance, 깨울 때 core 고르기, 놀고 있는 core가 남의 queue에서 가져오기(idle pull) 같은 정책을 조합합니다. global queue를 쓰는 FreeRTOS V11.2.0과 Zephyr v3.7.0에는 별도 balancer가 없습니다. 놀고 있는 core가 공유 list에서 자기가 돌릴 수 있는 가장 높은 task를 고르는 것이 곧 balancing입니다. 그 대신 앞의 `prvSelectHighestPriorityTask()`처럼 "이미 다른 core에서 실행 중인가"와 affinity를 매번 검사합니다.

## SMP context switch overhead 측정

이 글에서는 측정하지 않았습니다. 예전 판의 "1/2/4/10 µs" 표는 재현 자료가 없어 지웠습니다. 잰다면 같은 core에서의 switch, migration이 끼는 switch, IPI로 깨우는 경우를 나눠, 실보드의 cycle counter로 분포를 남겨야 합니다.

## 자주 보는 함정과 안티패턴

> 경고 — local IRQ mask를 전체 시스템 배제로 오해

다른 core에서 접근하는 상태를 local mask만으로 보호할 수 없습니다. 반대로 task끼리만 만지는 상태라면 block할 수 있는 mutex로 충분합니다. 변수마다 누가 만지는지(어느 core, task인지 ISR인지) 적어 두고 lock을 고릅니다.

> 경고 — port와 application lock의 nesting을 혼동

spinlock을 쥔 채 block하면, 그 lock을 기다리는 다른 core는 block한 task가 깨어날 때까지 돌기만 합니다. 같은 core의 ISR이 task가 쥔 spinlock을 잡으려 하면 영원히 돕니다. 그래서 ISR과 공유하는 spinlock은 앞의 `spin_lock_irqsave()`처럼 interrupt를 먼저 막고 잡습니다.

> 경고 — affinity를 timing 보증으로 사용

pinning 후에도 그 core로 오는 IRQ, 다른 core와 공유하는 bus·memory의 간섭은 남습니다. deadline은 pinning한 상태에서 따로 측정합니다.

## 정리

- local IRQ mask는 다른 core를 막지 못합니다. SMP critical section은 IRQ mask와 inter-core lock을 함께 씁니다.
- FreeRTOS V11.2.0과 Zephyr v3.7.0은 둘 다 하나의 공유 ready list(run queue)를 씁니다.
- FreeRTOS는 "다른 core에서 실행 중이 아님"과 affinity bit를 검사해 task를 고르고, 다른 core는 `portYIELD_CORE()`로 깨웁니다.
- affinity는 생성 때(`xTaskCreateAffinitySet()`) 주고, Zephyr CPU mask는 runnable이 아닌 thread에만 바꿉니다.
- RP2040의 cache는 XIP flash용뿐이라 SRAM 공유에 cache flush는 필요 없고 동기화가 필요합니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h), [FreeRTOS.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h): affinity와 SMP port 계약.
- [Linux v6.12 include/linux/smp.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/smp.h).
- [Zephyr 3.7.0 SMP](https://docs.zephyrproject.org/3.7.0/kernel/services/smp/smp.html), [thread API](https://docs.zephyrproject.org/3.7.0/doxygen/html/group__thread__apis.html): queue와 CPU mask 조건.
- [RP2040 datasheet](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf): Cortex-M0+, SRAM, SIO, XIP cache.



다음 편은 [4-08 SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)에서 LDREX/STREX와 ticket/MCS lock 구조를 풉니다.

## 관련 항목

- [2-03: Scheduler Algorithm](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
