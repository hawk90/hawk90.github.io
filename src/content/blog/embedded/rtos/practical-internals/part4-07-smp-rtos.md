---
title: "4-07: SMP RTOS — Per-Core·Global Ready·Affinity·Load Balance"
date: 2026-05-19T19:00:00
description: "FreeRTOS 11 SMP, Zephyr SMP. Per-core vs global runqueue. Task affinity. IPI."
series: "Practical RTOS Internals"
seriesOrder: 39
tags: [smp, multicore, affinity, ipi, load-balancing]
draft: true
---

## 한 줄 요약

> **"SMP RTOS = 여러 core가 한 OS"** — single-core RTOS의 *훨씬 복잡한 형제*.

## SMP vs AMP

```text
SMP (Symmetric Multi-Processing):
  - 모든 core가 *같은 OS* 인스턴스
  - 공유 메모리·자원
  - Linux·FreeRTOS 11 SMP·Zephyr
  
AMP (Asymmetric Multi-Processing):
  - 각 core가 *별도 OS*
  - IPC로 통신 (OpenAMP·RPMsg)
  - 자동차 — Cortex-A (Linux) + Cortex-R (RTOS)
```

이번 편 — SMP. AMP는 4-12 편.

## Ready List 설계

### Per-Core Ready List

```c
struct ready_list per_core_ready[NUM_CORES];

void schedule(int core) {
    Task *t = pick_highest(&per_core_ready[core]);
    run(t);
}
```

장점:
- Cache locality (per-core data)
- Lock contention 적음
- Linux 표준

단점:
- 불균등 부하 — *load balancing 필요*

### Global Ready List

```c
struct ready_list global_ready;
spinlock_t global_lock;

void schedule(int core) {
    spin_lock(&global_lock);
    Task *t = pick_highest(&global_ready);
    spin_unlock(&global_lock);
    run(t);
}
```

장점:
- 단순
- 자동 load balance

단점:
- *lock contention*
- Cache thrashing

소규모 SMP (2-4 core) — global도 OK. 대규모 — per-core.

## FreeRTOS 11 SMP

```c
#define configNUMBER_OF_CORES   4
#define configUSE_CORE_AFFINITY 1
#define configUSE_TASK_PREEMPTION_DISABLE 1
```

```c
TaskHandle_t task;
xTaskCreate(task_fn, "name", 2048, NULL, 5, &task);

/* CPU 0,1만 사용 */
UBaseType_t mask = (1 << 0) | (1 << 1);
vTaskCoreAffinitySet(task, mask);

/* 현재 어느 core? */
BaseType_t current_core = portGET_CORE_ID();
```

Global ready list + per-core current. Critical section은 *spinlock + IRQ off*.

## Zephyr SMP

```c
struct k_thread thread;
K_THREAD_STACK_DEFINE(stack, 2048);

k_thread_create(&thread, stack, K_THREAD_STACK_SIZEOF(stack),
                entry, NULL, NULL, NULL,
                K_PRIO_PREEMPT(5), 0, K_NO_WAIT);

/* Affinity */
k_thread_cpu_mask_disable_all(&thread);
k_thread_cpu_mask_enable(&thread, 0);   /* CPU 0만 */
```

Zephyr — *per-CPU runqueue* + global priority scheduler.

## IPI (Inter-Processor Interrupt)

Core 0이 *다른 core* 깨움:

```c
/* Linux */
smp_call_function_single(target_cpu, func, arg, wait);

/* FreeRTOS 11 SMP */
portYIELD_CORE(target_core);
```

용도:
- Higher priority task wake on other core
- TLB shootdown (page table 변경)
- Context switch trigger

Cortex-A GIC — *SGI* (Software Generated Interrupt) 0-15 사용.

## Critical Section — SMP

Single-core:

```c
__disable_irq();
critical();
__enable_irq();
```

SMP:

```c
spinlock_t lock;

spin_lock_irqsave(&lock, flags);
critical();
spin_unlock_irqrestore(&lock, flags);
```

IRQ off로 *현재 core* 보호, spinlock으로 *다른 core* 보호.

## Cache Coherency — Critical

```text
SMP 시 — cache coherency 필수
  - Cortex-A ACE (CCI-400 내)
  - Cortex-M dual-core (RP2040, etc.)는 hardware 지원 다름
  
RP2040 (Cortex-M0+ × 2):
  - Coherency *없음*
  - 명시적 lock·event 필수
  - SIO (Single-cycle IO) — atomic register
```

## RP2040 — Dual M0+ Example

```c
#include "pico/multicore.h"

void core1_entry(void) {
    while (1) {
        uint32_t data = multicore_fifo_pop_blocking();
        process(data);
    }
}

int main(void) {
    multicore_launch_core1(core1_entry);
    while (1) {
        multicore_fifo_push_blocking(value);
    }
}
```

FIFO hardware — *coherence 없는 SoC*에서 안전 통신.

## Affinity vs Migration

```c
/* Affinity — 특정 core에 고정 */
vTaskCoreAffinitySet(task, (1 << 0));

/* Migration — 자동 또는 명시 */
vTaskCoreAffinitySet(task, ALL_CORES);   /* migration OK */
```

장점/단점:

| 항목 | Affinity | Migration |
|---|---|---|
| Cache locality | 좋음 | 매번 cold |
| Load balance | 불균등 | 자동 |
| 결정성 | 좋음 | 나쁨 |
| 사용처 | RT task | best-effort |

## Load Balancing

```c
/* 주기적 — 가장 loaded core → 가장 idle core */
void balance(void) {
    int max_load = -1, min_load = INT_MAX;
    int max_core = -1, min_core = -1;
    
    for (int i = 0; i < NUM_CORES; i++) {
        int l = load_of(i);
        if (l > max_load) { max_load = l; max_core = i; }
        if (l < min_load) { min_load = l; min_core = i; }
    }
    
    if (max_load - min_load > THRESHOLD) {
        Task *t = pick_movable(max_core);
        migrate(t, min_core);
    }
}
```

Linux CFS — *주기적 + heuristic*. RT에선 *migration overhead* 고려.

## big.LITTLE / DynamIQ — Energy-Aware

```text
4 × Cortex-A76 (Big) + 4 × Cortex-A55 (Little)

Task 분류:
  Foreground UI → Big
  Background sync → Little
  Burst encode → Big 임시
  Idle polling → Little
```

Linux EAS (Energy-Aware Scheduler) — *energy model* 기반 자동 배치.

## RTOS — SMP 적용 사례

| RTOS | SMP | 특징 |
|---|---|---|
| FreeRTOS 11 | ✓ | global ready + per-core, affinity |
| Zephyr | ✓ | per-CPU runqueue |
| ThreadX | ✓ (SMP variant) | global, simple |
| VxWorks | ✓ | mature, automotive |
| QNX | ✓ | microkernel |
| INTEGRITY | ✓ | safety-cert |
| FreeRTOS 9 이하 | ✗ | single-core only |

## 자동차·항공 — SMP

```text
자동차 Cortex-A53 cluster:
  Core 0: 인포테인먼트
  Core 1: 인스트루먼트 클러스터
  Core 2: ADAS sensor fusion
  Core 3: 통신 (V2X, OTA)
  
각 core *별도 affinity* — 결정성 보장
```

ASIL-D ECU는 보통 *Cortex-R (lock-step)* — SMP 아님.

## 자주 하는 실수

> ⚠️ Single-core 패턴 그대로 SMP

```c
__disable_irq();   /* ← 다른 core 안 보호! */
critical();
```

→ spinlock + IRQ off.

> ⚠️ Affinity 안 줘서 RT task bouncing

```c
xTaskCreate(rt_task, ...);   /* affinity = ALL → migration */
```

→ critical RT는 *narrow affinity*.

> ⚠️ Coherency 가정한 dual-M

```c
RP2040 — core 0 writes data, core 1 reads — *coherence 없음*
```

→ FIFO·atomic register·explicit fence.

> ⚠️ Global lock 남발

```c
spin_lock(&global);
critical();   /* core 4개 다 대기 */
```

→ fine-grained lock + lock-free.

## 정리

- SMP RTOS — **여러 core 한 OS**.
- **Per-core** ready list가 modern 표준.
- **IPI**로 cross-core wake·sync.
- Cortex-A — coherency hardware, Cortex-M dual은 *없음*.
- FreeRTOS 11·Zephyr — SMP 표준 RTOS.
- 자동차·항공 — *RT critical은 affinity*, *best-effort는 migration*.

다음 편은 **SMP Spinlock**.

## 관련 항목

- [4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
