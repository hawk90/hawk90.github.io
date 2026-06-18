---
title: "Mutex 내부 구현 추적 — Owner·Recursion Count·ISR 금지"
date: 2026-05-06T09:24:00
description: "Mutex = Semaphore + pxMutexHolder + uxBasePriority. Recursive variant는 lock-count."
series: "Practical RTOS Internals"
seriesOrder: 24
tags: [mutex, owner, recursion, lock-count, queue]
draft: false
---

## 한 줄 요약

> **"Mutex는 Semaphore에 `pxMutexHolder`만 추가한 형태입니다."** owner를 추적할 수 있게 되면 priority inheritance까지 자연스럽게 구현됩니다.

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

Queue의 공용 영역을 mutex 모드에서는 owner와 recursion count로 재해석합니다.

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

대기 task가 owner의 priority를 일시적으로 상속하도록 만듭니다. take 시점에 이 함수가 호출됩니다.

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

Mutex를 give할 때 원래 priority로 복원합니다. mutex가 여러 개 얽힌 chain inheritance도 정확하게 처리합니다.

## Recursive Mutex

```c
SemaphoreHandle_t mtx = xSemaphoreCreateRecursiveMutex();

xSemaphoreTakeRecursive(mtx, ...);   // count = 1
xSemaphoreTakeRecursive(mtx, ...);   // count = 2 (same task)
xSemaphoreGiveRecursive(mtx);        // count = 1
xSemaphoreGiveRecursive(mtx);        // count = 0 → release
```

`uxRecursiveCallCount`로 재진입 횟수를 추적합니다. owner check와 count를 함께 검증하므로 안전합니다.

## ISR 금지 이유

```c
xSemaphoreTakeFromISR(mutex, ...);   // ✗ 컴파일 에러
```

ISR은 task가 아니므로 owner가 될 수 없습니다. `pxMutexHolder`가 의미를 잃어버리기 때문에 ISR에서 사용하면 logic이 깨지고 priority inheritance가 동작하지 않습니다.

## Deadlock — Lock Ordering

```c
// Task A
xSemaphoreTake(mtx_X, ...);
xSemaphoreTake(mtx_Y, ...);

// Task B
xSemaphoreTake(mtx_Y, ...);
xSemaphoreTake(mtx_X, ...);
```

circular wait가 발생해 deadlock으로 이어집니다. 해결 방법은 글로벌 lock order를 강제하는 것입니다. 예를 들어 항상 X를 먼저 take하도록 규칙을 정합니다.

## Timeout 활용

```c
if (xSemaphoreTake(mtx, pdMS_TO_TICKS(100)) != pdTRUE) {
    log_warning("mutex timeout — possible deadlock");
    return ERROR;
}
```

`portMAX_DELAY` 대신 유한한 timeout을 두면 deadlock을 감지하고 복구할 수 있습니다.

## Mutex Hold Time — 짧게

Mutex를 보유한 task의 priority는 boost된 상태에 머무릅니다. Hold time이 길어질수록 다른 task에 미치는 영향이 커지고 priority inheritance 효과도 오래 지속됩니다.

목표는 수 µs 이하로 유지하는 것입니다.

## Static Allocation

```c
StaticSemaphore_t mtx_buf;
SemaphoreHandle_t mtx = xSemaphoreCreateMutexStatic(&mtx_buf);
```

자동차나 항공처럼 safety-critical 영역에서는 정적 할당이 표준입니다.

## Zephyr — k_mutex

```c
struct k_mutex {
    _wait_q_t wait_q;
    struct k_thread *owner;
    uint32_t lock_count;
    int owner_orig_prio;
};
```

기본 구조는 비슷하고 priority inheritance가 내장되어 있습니다.

## 자주 하는 실수

> ⚠️ Non-owner가 give를 호출합니다

`pdFAIL`이 반환되는데, 이를 무시하면 logic이 그대로 깨집니다. 항상 return 값을 확인합니다.

> ⚠️ Recursive mutex를 잘못 사용합니다

`xSemaphoreTake`와 `xSemaphoreTakeRecursive`를 섞어 쓰면 미정의 동작으로 이어집니다. 시작 시 한 종류로 정해 두는 편이 좋습니다.

> ⚠️ ISR에서 mutex를 사용합니다

ISR과 task 사이의 신호 전달에는 semaphore나 task notification을 사용합니다. Mutex는 ISR에서 사용하면 안 됩니다.

> ⚠️ Mutex를 잡은 채 long blocking을 합니다

다른 mutex take나 queue receive를 infinite timeout으로 호출하면 cascading wait가 발생하고 deadlock으로 이어지기 쉽습니다.

## 정리

- Mutex는 Queue에 `pxMutexHolder`와 `uxRecursiveCallCount`를 추가한 구조입니다.
- Owner를 검증하여 non-owner가 give를 호출하는 경우를 차단합니다.
- Priority inheritance는 take 시 priority를 boost하고 give 시 복원합니다.
- Recursive variant는 count로 재진입을 추적합니다.
- ISR에서는 사용할 수 없으며 semaphore나 task notification으로 대체합니다.

다음 편에서는 **Priority Inversion 문제**를 Mars Pathfinder 사례와 함께 자세히 살펴봅니다.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
