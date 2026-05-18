---
title: "3-02: Semaphore 내부 구현 — Counter, Wait List, ISR-Safe Variant"
date: 2026-05-12T23:00:00
description: "FreeRTOS semaphore = Queue wrapper. Counter + priority-sorted wait list."
series: "Practical RTOS Internals"
seriesOrder: 23
tags: [semaphore, wait-list, counter, queue, isr-safe]
draft: true
---

## 한 줄 요약

> **"FreeRTOS Semaphore = 0-byte item Queue"** — Counter는 Queue의 `uxMessagesWaiting`.

## FreeRTOS Trick — Semaphore = Queue

```c
#define xSemaphoreCreateBinary() \
    xQueueGenericCreate(1, 0, queueQUEUE_TYPE_BINARY_SEMAPHORE)

#define xSemaphoreTake(sem, t)   xQueueSemaphoreTake(sem, t)
#define xSemaphoreGive(sem)      xQueueGenericSend(sem, NULL, 0, queueSEND_TO_BACK)
```

**Item size = 0**. Queue의 *counter*만 활용. Code 재사용 = *작은 footprint*.

## Counter 동작

```c
// Binary semaphore
SemaphoreHandle_t = Queue {
    .uxLength = 1,           // max count
    .uxMessagesWaiting = 0,  // current count
    .uxItemSize = 0,
    /* ... */
};

// Take (P) — counter--
BaseType_t xQueueSemaphoreTake(...) {
    portENTER_CRITICAL();
    if (uxMessagesWaiting > 0) {
        uxMessagesWaiting--;
        portEXIT_CRITICAL();
        return pdPASS;
    }
    /* Empty — block */
    prvAddCurrentTaskToWaitList(&xTasksWaitingToReceive);
    portEXIT_CRITICAL();
    block_with_timeout(timeout);
}

// Give (V) — counter++
BaseType_t xQueueGenericSend(...) {
    portENTER_CRITICAL();
    if (uxMessagesWaiting < uxLength) {
        uxMessagesWaiting++;
        /* Wake highest-priority waiter if any */
        if (!list_empty(&xTasksWaitingToReceive)) {
            TCB_t *winner = listGET_OWNER_OF_HEAD_ENTRY(&xTasksWaitingToReceive);
            xTaskRemoveFromEventList(&xTasksWaitingToReceive);
            /* now winner is on Ready list */
        }
        portEXIT_CRITICAL();
        return pdPASS;
    }
    portEXIT_CRITICAL();
    return errQUEUE_FULL;  // Counting sem이 max 도달
}
```

## Counting Semaphore

```c
SemaphoreHandle_t sem = xSemaphoreCreateCounting(10, 0);
//                                                ↑   ↑
//                                            max   initial
```

uxLength = 10. **Counter가 0-10 사이** → 10개 자원 풀.

## Priority-Sorted Wait List

```c
List_t xTasksWaitingToReceive;   // sorted by task priority
```

Give 시 *highest priority waiter 우선* wake — fair share 아닌 *RTOS priority 존중*.

```c
void prvAddCurrentTaskToWaitList(List_t *pxEventList) {
    /* Priority value를 sort key로 사용 (역순) */
    listSET_LIST_ITEM_VALUE(
        &pxCurrentTCB->xEventListItem,
        configMAX_PRIORITIES - pxCurrentTCB->uxPriority   /* invert */
    );
    vListInsert(pxEventList, &pxCurrentTCB->xEventListItem);
}
```

높은 priority = *작은 value* → list 앞쪽. Pop head = highest priority.

## ISR-Safe Variant

```c
BaseType_t xSemaphoreGiveFromISR(SemaphoreHandle_t sem, BaseType_t *pxHigherPriorityTaskWoken) {
    portENTER_CRITICAL_FROM_ISR();   // BASEPRI save·set
    
    if (uxMessagesWaiting < uxLength) {
        uxMessagesWaiting++;
        
        if (!list_empty(&xTasksWaitingToReceive)) {
            TCB_t *waiter = peek_head(&xTasksWaitingToReceive);
            if (waiter->uxPriority > pxCurrentTCB->uxPriority) {
                *pxHigherPriorityTaskWoken = pdTRUE;
            }
            xTaskRemoveFromEventList(&xTasksWaitingToReceive);
        }
        portEXIT_CRITICAL_FROM_ISR(savedStatus);
        return pdPASS;
    }
    portEXIT_CRITICAL_FROM_ISR(savedStatus);
    return errQUEUE_FULL;
}
```

다른 점:
- `taskENTER_CRITICAL_FROM_ISR()` (BASEPRI 저장·복원)
- *Block 없음* — 즉시 return
- `pxHigherPriorityTaskWoken` 출력 — *ISR exit 시 yield 결정*

## Take with Timeout

```c
BaseType_t xSemaphoreTake(SemaphoreHandle_t sem, TickType_t xTicksToWait) {
    /* ... 위 동일 ... */
    
    if (uxMessagesWaiting == 0) {
        if (xTicksToWait == 0) return pdFAIL;
        
        prvAddCurrentTaskToWaitList(&xTasksWaitingToReceive);
        vTaskPlaceOnEventList(&xTasksWaitingToReceive, xTicksToWait);
        portEXIT_CRITICAL();
        
        portYIELD_WITHIN_API();   // → Scheduler 호출
        
        /* 깨어남 — wake 원인 확인 */
        if (xTaskCheckForTimeOut(&xTimeOut, &xTicksToWait) != pdFALSE) {
            /* Timeout */
            uxListRemove(&pxCurrentTCB->xEventListItem);
            return pdFAIL;
        }
        return pdPASS;
    }
}
```

타임아웃 처리 — *Delayed list*에도 동시 등록. timeout 만료 → tick ISR이 wake.

## Lost Wakeup 방지

```c
// 단순 구현 (잘못된)
if (!flag) {
    wait();        // ← (1)
}
// ISR이 flag=1로 만들고 signal — wait() 전이라면 lost
```

해결 — **Counter + critical section**:

```c
portENTER_CRITICAL();
if (counter == 0) {
    add_to_wait_list();
    portEXIT_CRITICAL();
    block();
}
```

ISR이 *counter 보고 wake 결정* + critical section이 *race 차단*.

## 메모리

```c
sizeof(Queue_t) ≈ 80 byte
+ ListItem_t × waiter count
+ (Counting sem은 추가 메모리 없음 — 동일 80 byte)
```

작음 — 임베디드에 부담 적음.

## Mutex와의 차이

Mutex도 *내부적으로 Queue* (`queueQUEUE_TYPE_MUTEX`):

| | Semaphore | Mutex |
| --- | --- | --- |
| `uxQueueType` | BINARY_SEMAPHORE | MUTEX |
| Owner 추적 | ✗ | ✓ (`pxMutexHolder`) |
| Priority inheritance | ✗ | ✓ |
| ISR Give | ✓ | ✗ |

Mutex의 추가 로직 = *owner check + PI*. 3-03에서 자세히.

## Zephyr — k_sem

```c
struct k_sem {
    _wait_q_t wait_q;     // doubly-linked list
    uint32_t count;
    uint32_t limit;
};
```

비슷한 *counter + wait queue*. FreeRTOS의 Queue trick 없이 *전용 구조*.

## 자주 하는 실수

> ⚠️ Counting sem max 초과 give

추가 give → `errQUEUE_FULL` 반환, counter 변화 X. 정상 동작이지만 *return value 확인*.

> ⚠️ Wait list가 FIFO라고 가정

FreeRTOS는 *priority-sorted*. 같은 priority일 때만 FIFO.

> ⚠️ ISR에서 Take

`xSemaphoreTakeFromISR`도 있지만 *timeout 0만 의미* — block 못 함. ISR ↔ task signal엔 *Give만 ISR*.

> ⚠️ Binary semaphore 초기값 가정

`xSemaphoreCreateBinary()`는 *count = 0* — 첫 take 즉시 block. *available 시작*이면 직후 `xSemaphoreGive()`.

## 정리

- FreeRTOS Semaphore = **0-byte item Queue** 재활용.
- Counter + **priority-sorted wait list**.
- `xSemaphoreGiveFromISR` + `pxHigherPriorityTaskWoken` = ISR signal 표준.
- Lost wakeup은 *counter + critical section*으로 차단.
- Mutex와는 *owner·PI*가 차이.

다음 편은 **Mutex 내부 구현** — Owner tracking + Priority Inheritance.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
