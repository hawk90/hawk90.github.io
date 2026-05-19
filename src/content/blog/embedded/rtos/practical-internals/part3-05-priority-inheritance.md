---
title: "3-05: Priority Inheritance 구현 — Inherit·Disinherit·Chain"
date: 2026-05-08T02:00:00
description: "FreeRTOS PI 코드 분석 — vTaskPriorityInherit, vTaskPriorityDisinherit, chain handling."
series: "Practical RTOS Internals"
seriesOrder: 26
tags: [priority-inheritance, pi, inherit, disinherit]
draft: true
---

## 한 줄 요약

> **"PI = take 시 boost, give 시 복원"** — uxBasePriority가 원래 값 보존.

## TCB의 PI Field

```c
typedef struct {
    UBaseType_t uxPriority;       // 현재 priority (boost 시 변경)
    UBaseType_t uxBasePriority;   // 원래 priority (PI 해제 시 복원)
    UBaseType_t uxMutexesHeld;    // 보유 mutex 수
    /* ... */
} TCB_t;
```

`uxBasePriority`가 PI의 핵심. *영구 가치*, `uxPriority`만 *임시 변경*.

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

호출 시점 — *Mutex take 실패 + waiter 추가 직후*. Wait list에 들어가기 전에 boost.

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

Mutex give 시 호출. **모든 mutex 해제된 후에만 priority 복원** — 여러 mutex 보유 시 단계적 복원.

시간축 위에서 보면 boost의 의미가 분명해집니다. High가 mutex M을 기다리는 순간 Low의 priority가 일시적으로 High level까지 올라가, Mid가 그 사이를 끼어들지 못합니다.

![Priority inheritance timeline](/images/blog/rtos/diagrams/part3-05-priority-inheritance.svg)

## Multi-Mutex 시나리오

```text
T_low가 mutex A·B 동시 보유
T_high1 → A 대기 → T_low priority boost (high1 level)
T_high2 → B 대기 → 이미 boost 됐으면 변화 X

T_low release A:
  uxMutexesHeld = 1
  → priority 유지 (B 때문)
T_low release B:
  uxMutexesHeld = 0
  → priority 복원
```

## Chained Inheritance

```text
T_high → mutex X 대기 → T_med 보유
T_med → mutex Y 대기 → T_low 보유

T_high가 X 대기 시:
  T_med priority boost (high level)
T_med가 Y 대기 시:
  T_low priority boost (high level — boosted T_med의 level)
```

`xTaskCheckForChainedInheritance()`가 *recursive boost*.

## Disinherit After Timeout

```c
void vTaskPriorityDisinheritAfterTimeout(TaskHandle_t pxMutexHolder, 
                                          UBaseType_t uxHighestPriorityWaitingTask) {
    /* Waiter timeout 시 — 더 이상 그 priority로 boost할 이유 없음 */
    /* 남은 waiters 중 가장 높은 priority로 *부분 복원* */
}
```

Timeout 발생 시 — *그 waiter의 priority 영향 제거*.

## Time Slicing과 Boost 상호작용

Boost 된 task가 *original priority의 다른 task*와 같은 priority가 됨 → round-robin 가능. 의도된 동작.

## Implementation Overhead

```text
Inherit:    ~50 cycle (list remove + insert + bitmap update)
Disinherit: ~50 cycle (역)
Chain:      depth × inherit cost
```

Cortex-M4 @ 168 MHz → 0.3 µs/op. *무시 가능*.

## Zephyr — k_mutex의 PI

```c
struct k_mutex {
    _wait_q_t wait_q;
    struct k_thread *owner;
    uint32_t lock_count;
    int owner_orig_prio;   // ← Zephyr의 base priority
};
```

비슷한 구조. PI 활성/비활성 옵션.

## Linux PREEMPT_RT rtmutex

```c
struct rt_mutex_base {
    raw_spinlock_t wait_lock;
    struct rb_root_cached waiters;  // RB tree
    struct task_struct *owner;
};
```

**RB tree로 waiters 정렬** — O(log N) priority manipulation. Linux의 다른 sleeping lock (futex 등) 보다 더 정교.

## 자주 하는 실수

> ⚠️ Inherit 후 manual priority 변경

`vTaskPrioritySet()`로 priority 변경 시 `uxBasePriority`도 같이 변경 필요. FreeRTOS API가 처리.

> ⚠️ Multiple mutex deep nesting

3+ mutex 동시 보유 시 *chain 깊이 증가*. *Lock order + 단순 설계*로 회피.

> ⚠️ ISR에서 PI 가정

ISR은 task 아님 — PI 무의미. ISR ↔ task는 *task notification*.

## 정리

- PI = **take 시 boost, give 시 복원**.
- `uxBasePriority`가 원래 가치 보존.
- **Multi-mutex** = uxMutexesHeld == 0 일 때만 복원.
- **Chained inheritance**도 처리 — recursive boost.
- Linux PREEMPT_RT의 rtmutex가 RB tree로 정교.

다음 편은 **Priority Ceiling Protocol** 구현.

## 관련 항목

- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-06: Priority Ceiling Protocol](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)
