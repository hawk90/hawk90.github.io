---
title: "3-03: Mutex 내부 구현 — Owner 추적, Recursion Count, ISR 금지"
date: 2026-05-08T24:00:00
description: "Mutex = Semaphore + pxMutexHolder + uxBasePriority. Recursive variant는 lock-count."
series: "Practical RTOS Internals"
seriesOrder: 24
tags: [mutex, owner, recursion, lock-count, queue]
draft: true
---

## 한 줄 요약

> **"Mutex = Semaphore + pxMutexHolder"** — owner 추적만 추가하면 PI까지 가능.

## FreeRTOS Mutex 구조

```c
typedef Queue_t Mutex_t;   // 같은 자료구조 재활용

// 추가 활용
union {
    /* Queue 일반 사용 */
    struct {
        TaskHandle_t xMutexHolder;     // ← Mutex 전용
        UBaseType_t uxRecursiveCallCount;
    } xSemaphore;
    
    struct {
        /* Queue 일반 fields */
    } xQueue;
} u;
```

Queue의 *공용 영역*을 mutex 시 *owner + recursion count*로 재해석.

## Take 흐름

```c
BaseType_t xQueueTakeMutexRecursive(QueueHandle_t mutex, TickType_t xTicksToWait) {
    BaseType_t result;
    
    portENTER_CRITICAL();
    
    if (mutex->pxMutexHolder == pxCurrentTCB) {
        /* Same task — recursive take */
        mutex->u.xSemaphore.uxRecursiveCallCount++;
        portEXIT_CRITICAL();
        return pdPASS;
    }
    portEXIT_CRITICAL();
    
    /* 다른 task 또는 처음 take */
    result = xQueueGenericReceive(mutex, NULL, xTicksToWait, pdFALSE);
    if (result == pdPASS) {
        mutex->pxMutexHolder = pxCurrentTCB;
        mutex->u.xSemaphore.uxRecursiveCallCount = 1;
    }
    return result;
}
```

## Give 흐름 — Owner 검증

```c
BaseType_t xQueueGenericSend(QueueHandle_t mutex, ...) {
    portENTER_CRITICAL();
    
    /* Owner 확인 */
    if (mutex->pxMutexHolder != NULL && 
        mutex->pxMutexHolder != pxCurrentTCB) {
        portEXIT_CRITICAL();
        return pdFAIL;   // Non-owner는 give 못 함
    }
    
    /* Recursive count 감소 */
    if (--mutex->u.xSemaphore.uxRecursiveCallCount > 0) {
        portEXIT_CRITICAL();
        return pdPASS;
    }
    
    /* Count = 0 — 실제 release */
    mutex->pxMutexHolder = NULL;
    /* Priority Inheritance 복원 */
    vTaskPriorityDisinheritAfterTimeout(...);
    
    /* Wake waiter */
    if (!list_empty(&xTasksWaitingToReceive)) {
        wake_highest_priority_waiter();
    }
    
    portEXIT_CRITICAL();
    return pdPASS;
}
```

## Priority Inheritance — Owner의 priority 동적 boost

```c
void vTaskPriorityInherit(TaskHandle_t pxMutexHolder) {
    TCB_t *holder = (TCB_t *)pxMutexHolder;
    
    if (holder->uxPriority < pxCurrentTCB->uxPriority) {
        /* Boost — base priority 저장 후 변경 */
        if (holder->uxBasePriority == 0)
            holder->uxBasePriority = holder->uxPriority;
        holder->uxPriority = pxCurrentTCB->uxPriority;
        /* Ready list에서 위치 조정 */
        rebalance_ready_list(holder);
    }
}
```

대기 task가 *owner의 priority 임시 상속*. Take 시점에 호출.

## Priority Disinheritance — 복원

```c
BaseType_t vTaskPriorityDisinherit(TaskHandle_t pxMutexHolder) {
    TCB_t *holder = (TCB_t *)pxMutexHolder;
    
    if (holder->uxBasePriority != holder->uxPriority) {
        /* Restore original */
        holder->uxPriority = holder->uxBasePriority;
        holder->uxBasePriority = 0;
        rebalance_ready_list(holder);
        return pdTRUE;
    }
    return pdFALSE;
}
```

Mutex give 시 *원래 priority* 복원. Chain inheritance (mutex 여러 개)도 정확히 처리.

## Recursive Mutex

```c
SemaphoreHandle_t mtx = xSemaphoreCreateRecursiveMutex();

xSemaphoreTakeRecursive(mtx, ...);   // count = 1
xSemaphoreTakeRecursive(mtx, ...);   // count = 2 (same task)
xSemaphoreGiveRecursive(mtx);        // count = 1
xSemaphoreGiveRecursive(mtx);        // count = 0 → release
```

`uxRecursiveCallCount`로 *재진입 횟수* 추적. Owner check + count로 안전.

## ISR 금지 이유

```c
xSemaphoreTakeFromISR(mutex, ...);   // ✗ 컴파일 에러
```

ISR은 *task가 아님* — owner 될 수 없음. *pxMutexHolder가 무의미*. 사용 시 *논리 오류 + PI 깨짐*.

## Deadlock — Lock Ordering

```c
// Task A
xSemaphoreTake(mtx_X, ...);
xSemaphoreTake(mtx_Y, ...);

// Task B
xSemaphoreTake(mtx_Y, ...);
xSemaphoreTake(mtx_X, ...);
```

**Circular wait** → deadlock. 해결 — *글로벌 lock order* 강제 (예: 항상 X 먼저).

## Timeout 활용

```c
if (xSemaphoreTake(mtx, pdMS_TO_TICKS(100)) != pdTRUE) {
    log_warning("mutex timeout — possible deadlock");
    return ERROR;
}
```

`portMAX_DELAY` 대신 *유한 timeout* — deadlock 감지·복구.

## Mutex Hold Time — 짧게

Mutex 보유 task의 priority가 *높게 boost된 상태*. Hold time이 길수록 *다른 task에 영향* + *PI 효과 길어짐*.

목표 — *수 µs 이하*.

## Static Allocation

```c
StaticSemaphore_t mtx_buf;
SemaphoreHandle_t mtx = xSemaphoreCreateMutexStatic(&mtx_buf);
```

Safety-critical (자동차·항공) 표준.

## Zephyr — k_mutex

```c
struct k_mutex {
    _wait_q_t wait_q;
    struct k_thread *owner;
    uint32_t lock_count;
    int owner_orig_prio;
};
```

비슷한 구조 + *내장 PI*.

## 자주 하는 실수

> ⚠️ Non-owner give

return `pdFAIL` — 무시하면 logic 깨짐. 항상 return 확인.

> ⚠️ Recursive mutex 잘못 사용

`xSemaphoreTake` 와 `xSemaphoreTakeRecursive` 혼용 → 미정의 동작. 시작 시 *한 종류 정함*.

> ⚠️ ISR에서 mutex

ISR ↔ task signal엔 semaphore 또는 task notification. Mutex 금지.

> ⚠️ Mutex 후 long blocking

다른 mutex take·queue receive (infinite timeout) → cascading wait·deadlock.

## 정리

- Mutex = **Queue + pxMutexHolder + uxRecursiveCallCount**.
- Owner 검증으로 *non-owner give 차단*.
- **Priority Inheritance** = take 시 boost, give 시 복원.
- Recursive variant는 *count* 추적.
- ISR에서 사용 불가 — semaphore·task notification 대체.

다음 편은 **Priority Inversion 문제** — Mars Pathfinder 상세.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
