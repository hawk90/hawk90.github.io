---
title: "3-05: Priority Inheritance 구현 — Inherit·Disinherit·Chain"
date: 2026-05-07T02:00:00
description: "FreeRTOS PI 코드 분석 — vTaskPriorityInherit, vTaskPriorityDisinherit, chain handling."
series: "Practical RTOS Internals"
seriesOrder: 26
tags: [priority-inheritance, pi, inherit, disinherit]
draft: false
---

## 한 줄 요약

> **"PI는 take 시 boost하고 give 시 복원한다"** — `uxBasePriority`가 원래 값을 보존합니다.

이번 글에서는 FreeRTOS의 PI 구현을 코드 수준에서 살펴봅니다. inherit과 disinherit, 그리고 chained 상황까지 따라가 봅니다.

## TCB의 PI Field

```c
typedef struct {
    UBaseType_t uxPriority;       // 현재 priority (boost 시 변경)
    UBaseType_t uxBasePriority;   // 원래 priority (PI 해제 시 복원)
    UBaseType_t uxMutexesHeld;    // 보유 mutex 수
    /* ... */
} TCB_t;
```

`uxBasePriority`가 PI 구현의 핵심입니다. 이 값은 *영구적인 우선순위*이고, `uxPriority`는 *임시로 변경되는 값*입니다.

## Inherit — Boost

```c
void vTaskPriorityInherit(TaskHandle_t pxMutexHolder) {
    TCB_t *holder = (TCB_t *)pxMutexHolder;
    
    /* Caller (current task)가 더 높은 priority면 */
    if (holder->uxPriority < pxCurrentTCB->uxPriority) {
        /* Ready list에서 제거 */
        if (listIS_CONTAINED_WITHIN(
            &(pxReadyTasksLists[holder->uxPriority]),
            &(holder->xStateListItem))) {
            uxListRemove(&(holder->xStateListItem));
            /* Bitmap 정리 */
            taskRESET_READY_PRIORITY(holder->uxPriority);
        }
        
        /* Priority boost */
        holder->uxPriority = pxCurrentTCB->uxPriority;
        
        /* New priority list로 재삽입 */
        prvAddTaskToReadyList(holder);
    }
}
```

호출 시점은 *Mutex take 실패 직후, waiter 추가 시점*입니다. Wait list에 들어가기 직전에 boost가 일어납니다.

## Disinherit — 복원

```c
BaseType_t xTaskPriorityDisinherit(TaskHandle_t pxMutexHolder) {
    TCB_t *holder = (TCB_t *)pxMutexHolder;
    BaseType_t xReturn = pdFALSE;
    
    /* uxMutexesHeld 감소 */
    holder->uxMutexesHeld--;
    
    /* 모든 mutex 해제됐는가? */
    if (holder->uxMutexesHeld == 0) {
        /* 원래 priority 복원 */
        if (holder->uxPriority != holder->uxBasePriority) {
            uxListRemove(&(holder->xStateListItem));
            taskRESET_READY_PRIORITY(holder->uxPriority);
            
            holder->uxPriority = holder->uxBasePriority;
            
            prvAddTaskToReadyList(holder);
            xReturn = pdTRUE;
        }
    }
    return xReturn;
}
```

Mutex give 시점에 호출됩니다. **모든 mutex가 해제된 후에만 priority가 복원**된다는 점이 중요합니다. 여러 mutex를 동시에 보유한 경우 단계적으로만 복원됩니다.

시간축 위에서 보면 boost의 의미가 분명해집니다. High가 mutex M을 기다리는 순간 Low의 priority가 일시적으로 High level까지 올라가, 그 사이 Mid가 끼어들지 못합니다.

![Priority inheritance timeline](/images/blog/rtos/diagrams/part3-05-priority-inheritance.svg)

## Multi-Mutex 시나리오

- `T_low`가 mutex A와 B를 동시 보유 중.
- `T_high1`이 A를 대기하면 → `T_low`의 priority가 high1 level로 boost.
- `T_high2`가 B를 대기하면 → 이미 boost된 상태이므로 변화 없음.
- `T_low`가 A를 release하면 `uxMutexesHeld = 1`이 되어 priority는 B 때문에 유지됩니다.
- `T_low`가 B를 release하면 `uxMutexesHeld = 0`이 되어 priority가 복원됩니다.

## Chained Inheritance

- `T_high`가 mutex X를 대기, `T_med`가 보유 중.
- `T_med`는 mutex Y를 대기, `T_low`가 보유 중.

전파 순서

1. `T_high`가 X를 대기할 때 `T_med`의 priority가 high level로 boost.
2. `T_med`가 Y를 대기할 때 `T_low`의 priority도 high level로 boost (boost된 `T_med`의 level).

`xTaskCheckForChainedInheritance()`가 *recursive boost*를 담당합니다.

## Disinherit After Timeout

```c
void vTaskPriorityDisinheritAfterTimeout(TaskHandle_t pxMutexHolder, 
                                          UBaseType_t uxHighestPriorityWaitingTask) {
    /* Waiter timeout 시 — 더 이상 그 priority로 boost할 이유 없음 */
    /* 남은 waiters 중 가장 높은 priority로 *부분 복원* */
}
```

Timeout이 발생하면 *해당 waiter의 priority 영향만 제거*합니다.

## Time Slicing과 Boost 상호작용

Boost된 task는 *원래 같은 priority에 있던 다른 task*와 같은 레벨이 되어 round-robin 대상에 포함됩니다. 이는 의도된 동작입니다.

## Implementation Overhead

- **Inherit** — ~50 cycle (list remove + insert + bitmap update)
- **Disinherit** — ~50 cycle (역방향)
- **Chain** — depth × inherit cost

Cortex-M4 @ 168 MHz 기준 0.3 µs/op입니다. *무시 가능한 수준*입니다.

## Zephyr — k_mutex의 PI

```c
struct k_mutex {
    _wait_q_t wait_q;
    struct k_thread *owner;
    uint32_t lock_count;
    int owner_orig_prio;   // ← Zephyr의 base priority
};
```

구조는 비슷합니다. PI 활성/비활성을 옵션으로 고를 수 있습니다.

## Linux PREEMPT_RT rtmutex

```c
struct rt_mutex_base {
    raw_spinlock_t wait_lock;
    struct rb_root_cached waiters;  // RB tree
    struct task_struct *owner;
};
```

**Waiters를 RB tree로 정렬**해 O(log N)으로 priority 조작이 가능합니다. Linux의 다른 sleeping lock(예: futex)보다 한층 정교합니다.

## 자주 하는 실수

> ⚠️ Inherit 후 manual priority 변경

`vTaskPrioritySet()`로 priority를 바꾸면 `uxBasePriority`도 함께 갱신해야 합니다. FreeRTOS API가 이 처리를 대신해 줍니다.

> ⚠️ Multiple mutex deep nesting

3개 이상의 mutex를 동시에 보유하면 *chain 깊이가 증가*합니다. *Lock order와 단순한 설계*로 회피하는 것이 정답입니다.

> ⚠️ ISR에서 PI 가정

ISR은 task가 아니므로 PI 자체가 무의미합니다. ISR과 task 사이 통신은 *task notification*을 씁니다.

## 정리

- PI는 **take 시 boost하고 give 시 복원**합니다.
- `uxBasePriority`가 원래 값을 보존합니다.
- **Multi-mutex** 상황에서는 `uxMutexesHeld == 0`일 때만 복원됩니다.
- **Chained inheritance**도 recursive boost로 처리합니다.
- Linux PREEMPT_RT의 rtmutex는 RB tree로 더 정교하게 구현돼 있습니다.

다음 편은 **Priority Ceiling Protocol** 구현입니다.

## 관련 항목

- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-06: Priority Ceiling Protocol](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)
