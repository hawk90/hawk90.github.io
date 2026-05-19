---
title: "4-07: SMP RTOS — Ready List 설계, Affinity, IPI, Load Balancing"
date: 2026-05-19T19:00:00
description: "FreeRTOS 11 SMP와 Zephyr SMP를 단일 ready list와 per-CPU ready list 두 축으로 비교합니다. task affinity, IPI, cross-core wake, cache coherency 경계까지 설계 관점에서 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 39
tags: [smp, multicore, affinity, ipi, load-balancing]
---

## 한 줄 요약

> **"SMP RTOS는 여러 core가 하나의 OS 인스턴스를 공유합니다."** — single-core RTOS의 *모든 자료구조*에 *동시 접근 가능성*이 추가됩니다.

## 어떤 문제를 푸는가

single-core RTOS에서는 *한 시점에 한 task만 실행*된다는 가정이 모든 설계의 바탕이었습니다. ready list에 동시 접근하는 주체는 없고, critical section은 `__disable_irq()` 한 줄이면 충분했습니다. 멀티코어가 들어오면 이 가정이 모두 깨집니다. core 0과 core 1이 *같은 ready list*를 동시에 만지고, 한 core가 IRQ를 막아도 *다른 core는 멀쩡히 진행*합니다.

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

장점은 단순함입니다. *어느 core에서 보든 같은 list*이므로 부하 균형이 자연스럽게 맞춰집니다. 한 core가 idle이면 곧바로 ready list 머리에서 task를 집어가면 됩니다.

단점은 lock contention입니다. core 수가 늘어날수록 `global_lock` 위에서 충돌이 폭증합니다. ready list 자료구조 자체도 cache line이 *core 사이를 핑퐁*합니다. 4 core 정도까지는 단순함의 이득이 크지만, 8 core 이상에서는 확장성 한계가 명확합니다.

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

각 core가 *자기 ready list만* 만집니다. lock contention이 거의 없고, list 자료구조도 *core local cache*에 머뭅니다. Linux CFS가 이 구조를 씁니다.

단점은 *부하가 자동으로 맞춰지지 않는다*는 것입니다. core 0의 list에 task 10개가 쌓이고 core 1이 idle이어도, *명시적 load balancing이 없으면* core 1은 계속 놀게 됩니다. periodic balance나 work stealing 같은 추가 메커니즘이 필요합니다.

두 구조를 나란히 놓고 보면 trade-off가 분명해집니다. Global은 하나의 lock 위에 코어가 모이고, Per-Core는 코어마다 자기 list를 만지지만 migration이 별도로 필요합니다.

![SMP global vs per-core ready list](/images/blog/rtos/diagrams/part4-07-smp-ready-lists.svg)

### 어느 쪽을 고를까

| 항목 | Global | Per-Core |
|---|---|---|
| Lock contention | 높음 | 낮음 |
| Cache locality | 나쁨 | 좋음 |
| Load balance | 자동 | 별도 구현 필요 |
| 확장성 | ~4 core | 수십 core |
| 결정성 분석 | 쉬움 | 어려움 |

소규모 embedded SMP(2~4 core)는 global이 합리적이고, 8 core 이상이거나 일반 컴퓨팅 워크로드는 per-core가 표준입니다.

## FreeRTOS 11 SMP

2022년 발표된 FreeRTOS 11은 *공식 SMP*를 도입했습니다. 핵심 config 세 줄이 전부입니다.

```c
#define configNUMBER_OF_CORES               4
#define configUSE_CORE_AFFINITY             1
#define configUSE_TASK_PREEMPTION_DISABLE   1
```

내부 구현은 *single ready list + 두 단계 spinlock*입니다. task lock과 ISR lock을 분리해 nested ISR 시나리오에서도 deadlock이 생기지 않게 합니다. 자세한 spinlock 구조는 다음 편 [4-08 SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)에서 다룹니다.

```c
TaskHandle_t  h;
xTaskCreate(task_fn, "ctrl", 2048, NULL, 5, &h);

/* CPU 0, 1만 사용 */
UBaseType_t mask = (1U << 0) | (1U << 1);
vTaskCoreAffinitySet(h, mask);

/* 현재 어느 core에서 실행 중인가 */
BaseType_t core = portGET_CORE_ID();
```

ESP-IDF의 `portMUX_TYPE`은 FreeRTOS SMP variant의 또 다른 예입니다. ESP32 dual core에서 `portENTER_CRITICAL(&mux)`가 *spinlock + IRQ disable*을 한 번에 처리합니다.

## Zephyr SMP

Zephyr는 *per-CPU runqueue*에 *global priority scheduler*를 얹은 구조입니다. 각 CPU는 자기 runqueue를 가지지만, scheduler 자체는 전체 시스템에서 *가장 우선순위 높은 task*가 *가장 한가한 core*에 가도록 push/pull balancing을 수행합니다.

```c
K_THREAD_STACK_DEFINE(stack, 2048);
struct k_thread thread;

k_thread_create(&thread, stack, K_THREAD_STACK_SIZEOF(stack),
                entry_fn, NULL, NULL, NULL,
                K_PRIO_PREEMPT(5), 0, K_NO_WAIT);

/* Affinity 설정 — CPU 0에만 고정 */
k_thread_cpu_mask_disable_all(&thread);
k_thread_cpu_mask_enable(&thread, 0);
```

balancing 정책은 두 가지로 나뉩니다. *push*는 한 core가 ready로 만든 새 task를 *다른 idle core*로 IPI를 보내 즉시 깨우는 방식입니다. *pull*은 idle이 된 core가 *다른 core의 runqueue에서 task를 가져오는* 방식입니다. Zephyr는 두 가지를 모두 씁니다.

## IPI — Cross-Core 동기화의 기본

core 0이 *다른 core에 즉시 알려야* 할 때 IPI(Inter-Processor Interrupt)를 보냅니다. ARM Cortex-A의 GIC는 SGI(Software Generated Interrupt) 0~15를 IPI에 할당합니다.

```c
/* Linux */
smp_call_function_single(target_cpu, fn, arg, /*wait=*/true);

/* FreeRTOS 11 SMP */
portYIELD_CORE(target_core);
```

대표 용도가 셋입니다. 첫째, higher-priority task가 *다른 core에서 ready*가 되었을 때 그 core를 깨워 reschedule을 trigger합니다. 둘째, MMU page table을 바꾼 뒤 *모든 core의 TLB를 invalidate*시키는 TLB shootdown입니다. 셋째, kernel panic 시 *모든 core를 정지*시키는 broadcast입니다.

embedded SMP에서 가장 자주 보는 패턴은 첫 번째입니다. core 0이 ISR에서 task를 unblock했는데 그 task의 priority가 core 1에서 실행 중인 task보다 높다면, core 1에 IPI를 보내 PendSV를 trigger해야 즉시 preempt됩니다.

## Critical Section을 다시 정의하기

single-core에서 IRQ를 끄면 critical section이 보장됐습니다. SMP에서는 *내 core의 IRQ만* 막힙니다. 다른 core는 그대로 진행하므로 *spinlock + IRQ disable* 조합이 필수입니다.

```c
spinlock_t lock;

unsigned long flags;
spin_lock_irqsave(&lock, &flags);
critical_section();
spin_unlock_irqrestore(&lock, flags);
```

IRQ disable은 *내 core 안에서 ISR이 끼어드는 것*을 막고, spinlock은 *다른 core가 같은 자료구조에 들어오는 것*을 막습니다. 두 가지가 함께 있어야 race가 없습니다.

```c
__disable_irq();                /* ← 다른 core 안 보호 — SMP에서 깨짐 */
critical_section();
__enable_irq();
```

single-core에서 동작하던 코드가 *SMP에서 silent하게 깨지는* 가장 흔한 패턴입니다.

## Cache Coherency가 곧 비용

SMP의 모든 동기화 비용은 결국 *cache line 이동*으로 환산됩니다. Cortex-A는 CCI(Cache Coherent Interconnect)나 DSU(DynamIQ Shared Unit)로 hardware coherency를 제공하지만, 그 동작도 공짜는 아닙니다.

```text
Cortex-A72 측정 (uncontended → contended):
  같은 cache line 읽기      : 4 cycle  → 80 cycle
  같은 cache line 쓰기      : 4 cycle  → 150 cycle
  spinlock acquire (한가)    : 12 cycle → 70 cycle
  context switch overhead   : ~500 cycle → 1500 cycle (cold cache)
```

같은 task가 *다른 core로 옮겨가면* 모든 cache가 cold입니다. RT critical task는 affinity로 한 core에 고정해 cache locality를 유지하는 편이 결정성에 좋습니다.

dual-core Cortex-M(RP2040 등)은 *hardware coherency가 아예 없습니다*. core 0이 SRAM에 쓴 값을 core 1이 읽으려면 *명시적 cache flush 또는 hardware FIFO*를 거쳐야 합니다.

```c
#include "pico/multicore.h"

void core1_entry(void) {
    for (;;) {
        uint32_t v = multicore_fifo_pop_blocking();
        process(v);
    }
}

int main(void) {
    multicore_launch_core1(core1_entry);
    for (;;) {
        multicore_fifo_push_blocking(value);
    }
}
```

RP2040의 SIO FIFO는 *coherency가 없는 SoC*에서 안전하게 통신하기 위해 hardware로 제공되는 통로입니다.

## Affinity 결정 — RT에는 좁게, Best-Effort에는 넓게

| 항목 | Affinity 고정 | Migration 허용 |
|---|---|---|
| Cache locality | 좋음 | 매번 cold |
| 결정성 | 높음 | 낮음 |
| Load balance | 불균등 | 자동 |
| 적합한 task | RT critical, control loop | 일반 worker, idle background |

자동차 ADAS 같은 RT task는 *특정 core에 affinity 고정*이 안전합니다. core 사이를 옮겨다니면 cache miss가 누적되어 WCET 분석이 깨집니다. 반면 background sync나 best-effort UI task는 migration을 허용해 *전체 core 활용률*을 높이는 편이 낫습니다.

```c
/* RT control loop — core 0 고정 */
vTaskCoreAffinitySet(rt_task, 1U << 0);

/* Best-effort worker — 어느 core든 OK */
vTaskCoreAffinitySet(worker_task, (1U << 0) | (1U << 1) | (1U << 2) | (1U << 3));
```

## Load Balancing의 기본 패턴

per-CPU runqueue 구조에서는 *주기적 balancing*이 필요합니다. 가장 단순한 형태는 *가장 loaded core에서 가장 idle core로 task 하나 옮기기*입니다.

```c
void balance_load(void) {
    int max_load = -1, min_load = INT_MAX;
    int max_core = -1, min_core = -1;

    for (int i = 0; i < NUM_CORES; i++) {
        int l = runqueue_load(i);
        if (l > max_load) { max_load = l; max_core = i; }
        if (l < min_load) { min_load = l; min_core = i; }
    }

    if (max_load - min_load > MIGRATE_THRESHOLD) {
        Task *t = pick_movable(max_core);
        if (t != NULL) migrate(t, min_core);
    }
}
```

Linux CFS는 이 위에 *NUMA topology*와 *energy model*까지 얹어 훨씬 정교한 결정을 내립니다. big.LITTLE이나 DynamIQ 환경에서는 *foreground UI는 big core, background sync는 little core*로 자동 배치하는 EAS(Energy-Aware Scheduler)가 표준입니다.

embedded SMP에서는 보통 *훨씬 단순한 정책*으로 충분합니다. 4 core 시스템이면 *RT task는 affinity로 고정*하고 *나머지는 global ready list에 맡기는* 조합이 합리적입니다.

## SMP context switch overhead 측정

같은 core 안의 switch와 cross-core switch는 비용 차이가 큽니다. Cortex-A53 1.2 GHz, 4 core SMP에서 측정한 예입니다.

```text
같은 core, hot cache    : 1200 cycle  (≈1.0 µs)
같은 core, cold cache   : 2500 cycle  (≈2.1 µs)
cross-core migration    : 5000 cycle  (≈4.2 µs)
cross-cluster (big↔little) : 12000 cycle (≈10 µs)
```

`cross-core migration`이 hot cache 대비 *4배*입니다. cross-cluster는 *10배*입니다. RT task에 affinity를 거는 이유가 숫자로 드러납니다.

## 자주 보는 함정과 안티패턴

> 경고 — single-core 패턴을 SMP에 그대로 가져다 씀

`__disable_irq()` 한 줄로 critical section을 만들던 코드는 SMP에서 *조용히 깨집니다*. 컴파일러는 경고하지 않습니다. *모든 critical section을 spinlock + IRQ disable로 검토*해야 합니다.

> 경고 — RT task에 affinity 없이 방치

```c
xTaskCreate(rt_control_task, ...);   /* affinity = ALL → migration 발생 */
```

core 사이를 옮겨다니면서 cache miss가 누적되어 *주기마다 WCET가 다르게* 나옵니다. RT task는 *반드시 affinity로 고정*합니다.

> 경고 — dual-M에서 coherency 가정

RP2040 같은 dual Cortex-M0+는 *hardware coherency가 없습니다*. core 0이 쓴 값을 core 1이 읽을 때 *낡은 값*을 볼 수 있습니다. SIO FIFO나 atomic register 또는 명시적 memory barrier를 써야 안전합니다.

> 경고 — global lock 남발

```c
spin_lock(&global);
do_long_critical();        /* core 4개가 모두 대기 */
spin_unlock(&global);
```

global lock 위의 critical section이 길면 *시스템 처리량 자체*가 떨어집니다. fine-grained lock으로 쪼개거나, lock-free 자료구조로 옮기는 것이 답입니다.

## 정리

- SMP RTOS는 *한 OS가 모든 core를 관리*하는 모델로, 모든 ready list와 critical section이 *동시 접근 가능성*을 가집니다.
- ready list는 *global*과 *per-core* 두 갈래로 갈라지며, 소규모 embedded(2~4 core)는 global, 그 이상은 per-core가 합리적입니다.
- FreeRTOS 11 SMP는 *single ready list + task/ISR 이중 spinlock* 구조를 채택했습니다.
- Zephyr SMP는 *per-CPU runqueue + push/pull balancing*으로 확장성을 가집니다.
- IPI는 *cross-core wake와 TLB shootdown*의 기본 도구로, ARM에서는 GIC SGI를 씁니다.
- SMP critical section은 *spinlock + IRQ disable* 조합이 필수이며, IRQ disable만으로는 보호되지 않습니다.
- cache coherency는 hardware로 제공되지만 *cross-core migration*은 hot cache 대비 수 배의 비용을 가져옵니다.
- RT critical task는 *affinity로 한 core에 고정*, best-effort task는 *migration 허용*이 일반적인 결정 기준입니다.

다음 편은 [4-08 SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)에서 LDREX/STREX와 ticket/MCS lock 구조를 풉니다.

## 관련 항목

- [2-03: Scheduler Algorithm](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
