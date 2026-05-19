---
title: "3-02: Semaphore 내부 구현 — Counter, Wait List, ISR-Safe Variant"
date: 2026-05-07T23:00:00
description: "FreeRTOS semaphore = Queue wrapper. Counter + priority-sorted wait list."
series: "Practical RTOS Internals"
seriesOrder: 23
tags: [semaphore, wait-list, counter, queue, isr-safe]
draft: false
---

## 한 줄 요약

> **"FreeRTOS Semaphore는 item size가 0인 Queue로 구현되어 있습니다."** Counter 역할은 Queue의 `uxMessagesWaiting`이 그대로 맡습니다.

## FreeRTOS Trick — Semaphore = Queue

```c
#define xSemaphoreCreateBinary() \
    xQueueGenericCreate(1, 0, queueQUEUE_TYPE_BINARY_SEMAPHORE)

#define xSemaphoreTake(sem, t)   xQueueSemaphoreTake(sem, t)
#define xSemaphoreGive(sem)      xQueueGenericSend(sem, NULL, 0, queueSEND_TO_BACK)
```

Item size를 0으로 두고 Queue의 counter만 활용합니다. 같은 코드를 재사용하기 때문에 footprint도 작게 유지됩니다.

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

`uxLength`가 10이고 counter는 0과 10 사이를 오갑니다. 자원 풀이 10개인 셈입니다.

## Priority-Sorted Wait List

```c
List_t xTasksWaitingToReceive;   // sorted by task priority
```

Give 시점에 가장 높은 priority의 waiter를 먼저 깨웁니다. fair share가 아니라 RTOS priority를 우선합니다.

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

높은 priority일수록 value가 작아 list 앞쪽에 배치됩니다. head를 pop하면 자연스럽게 highest priority가 나옵니다.

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

차이점은 다음과 같습니다.

- `taskENTER_CRITICAL_FROM_ISR()`로 BASEPRI를 저장·복원합니다.
- Block 동작이 없으며 즉시 return합니다.
- `pxHigherPriorityTaskWoken` 출력으로 ISR exit 시 yield 여부를 결정합니다.

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

timeout 처리에서는 task를 delayed list에도 함께 등록합니다. timeout이 만료되면 tick ISR이 해당 task를 깨웁니다.

## Lost Wakeup 방지

```c
// 단순 구현 (잘못된)
if (!flag) {
    wait();        // ← (1)
}
// ISR이 flag=1로 만들고 signal — wait() 전이라면 lost
```

이 문제는 counter와 critical section을 함께 써서 해결합니다.

```c
portENTER_CRITICAL();
if (counter == 0) {
    add_to_wait_list();
    portEXIT_CRITICAL();
    block();
}
```

ISR은 counter를 보고 wake 여부를 결정하고, critical section은 race를 차단합니다.

## 메모리

```c
sizeof(Queue_t) ≈ 80 byte
+ ListItem_t × waiter count
+ (Counting sem은 추가 메모리 없음 — 동일 80 byte)
```

전체적으로 작은 편이라 임베디드 환경에 부담이 적습니다.

## Mutex와의 차이

Mutex 역시 내부적으로 Queue를 사용합니다(`queueQUEUE_TYPE_MUTEX`).

| | Semaphore | Mutex |
| --- | --- | --- |
| `uxQueueType` | BINARY_SEMAPHORE | MUTEX |
| Owner 추적 | ✗ | ✓ (`pxMutexHolder`) |
| Priority inheritance | ✗ | ✓ |
| ISR Give | ✓ | ✗ |

Mutex의 추가 로직은 owner check와 priority inheritance입니다. 3-03에서 자세히 살펴봅니다.

## Zephyr — k_sem

```c
struct k_sem {
    _wait_q_t wait_q;     // doubly-linked list
    uint32_t count;
    uint32_t limit;
};
```

기본 구성은 counter와 wait queue로 같습니다. 다만 FreeRTOS의 Queue trick 없이 전용 구조를 둔다는 점이 다릅니다.

## 자주 하는 실수

> ⚠️ Counting semaphore의 max를 넘겨 give합니다

추가로 give를 호출하면 `errQUEUE_FULL`이 반환되고 counter는 변하지 않습니다. 동작 자체는 정상이지만 return value를 반드시 확인해야 합니다.

> ⚠️ Wait list가 FIFO라고 가정합니다

FreeRTOS의 wait list는 priority-sorted입니다. FIFO 순서가 보장되는 것은 같은 priority의 task끼리뿐입니다.

> ⚠️ ISR에서 Take를 시도합니다

`xSemaphoreTakeFromISR`도 존재하지만 timeout 0 의미밖에 없어서 block할 수 없습니다. ISR과 task 간 신호 전달은 ISR에서 Give만 하는 패턴으로 설계합니다.

> ⚠️ Binary semaphore의 초기값을 임의로 가정합니다

`xSemaphoreCreateBinary()`는 count가 0으로 시작합니다. 첫 take가 즉시 block에 걸리므로 처음부터 available 상태가 필요하다면 생성 직후 `xSemaphoreGive()`를 호출해야 합니다.

## 정리

- FreeRTOS Semaphore는 item size가 0인 Queue를 재활용한 구조입니다.
- counter와 priority-sorted wait list가 핵심입니다.
- `xSemaphoreGiveFromISR`와 `pxHigherPriorityTaskWoken` 조합이 ISR signal의 표준 패턴입니다.
- Lost wakeup은 counter와 critical section의 조합으로 차단합니다.
- Mutex와 비교했을 때 차이는 owner 추적과 priority inheritance입니다.

다음 편에서는 **Mutex 내부 구현**에서 owner tracking과 priority inheritance를 다룹니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
