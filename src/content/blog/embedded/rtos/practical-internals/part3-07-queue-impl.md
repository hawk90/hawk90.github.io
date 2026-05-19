---
title: "3-07: Queue 내부 구현 — Ring Buffer, 2 Wait Lists, Atomic Send/Receive"
date: 2026-05-07T04:00:00
description: "FreeRTOS Queue 코드 — pcWriteTo·pcReadFrom·uxMessagesWaiting + xTasksWaitingToSend/Receive."
series: "Practical RTOS Internals"
seriesOrder: 28
tags: [queue, ring-buffer, wait-list, atomic]
draft: false
---

## 한 줄 요약

> **"Queue는 Ring buffer와 2개의 wait list로 구성된다"** — Send와 Receive 양쪽 모두 blocking이 가능합니다.

이번 글에서는 FreeRTOS Queue의 내부 구조를 따라가 봅니다. Ring buffer, 두 wait list, ISR-safe 처리까지 한 번에 다룹니다.

## Queue Structure

```c
typedef struct QueueDefinition {
    int8_t *pcHead;                  // buffer 시작
    int8_t *pcWriteTo;               // 다음 write 위치
    union {
        int8_t *pcReadFrom;          // Queue 일반
        UBaseType_t uxRecursiveCallCount;   // Mutex 시
    } u;
    
    List_t xTasksWaitingToSend;      // queue full 대기
    List_t xTasksWaitingToReceive;   // queue empty 대기
    
    volatile UBaseType_t uxMessagesWaiting;
    UBaseType_t uxLength;            // max items
    UBaseType_t uxItemSize;          // bytes/item
    
    volatile int8_t cRxLock;         // ISR 안전성용
    volatile int8_t cTxLock;
    
    uint8_t ucStaticallyAllocated;
    uint8_t ucQueueType;
} Queue_t;
```

## Send 흐름

```c
BaseType_t xQueueGenericSend(QueueHandle_t q, const void *item, 
                              TickType_t xTicksToWait, BaseType_t xCopyPosition) {
    portENTER_CRITICAL();
    
    if (q->uxMessagesWaiting < q->uxLength || xCopyPosition == queueOVERWRITE) {
        /* Space available — copy item */
        prvCopyDataToQueue(q, item, xCopyPosition);
        
        /* Wake highest-priority receiver if any */
        if (listLIST_IS_EMPTY(&q->xTasksWaitingToReceive) == pdFALSE) {
            if (xTaskRemoveFromEventList(&q->xTasksWaitingToReceive) != pdFALSE) {
                /* Higher priority — yield */
                queueYIELD_IF_USING_PREEMPTION();
            }
        }
        portEXIT_CRITICAL();
        return pdPASS;
    }
    
    /* Queue full */
    if (xTicksToWait == 0) {
        portEXIT_CRITICAL();
        return errQUEUE_FULL;
    }
    
    /* Block on send */
    vTaskPlaceOnEventList(&q->xTasksWaitingToSend, xTicksToWait);
    portEXIT_CRITICAL();
    portYIELD_WITHIN_API();
    /* ... 깨어난 후 재시도 ... */
}
```

## Ring Buffer Wrap

```c
static void prvCopyDataToQueue(Queue_t *q, const void *src, BaseType_t pos) {
    if (q->uxItemSize == 0) {
        /* Semaphore mode — counter만 사용 */
        if (q->ucQueueType == queueQUEUE_TYPE_MUTEX) {
            /* Mutex give */
            xTaskPriorityDisinherit(q->pxMutexHolder);
            q->pxMutexHolder = NULL;
        }
    } else if (pos == queueSEND_TO_BACK) {
        memcpy(q->pcWriteTo, src, q->uxItemSize);
        q->pcWriteTo += q->uxItemSize;
        if (q->pcWriteTo >= q->pcTail) {
            q->pcWriteTo = q->pcHead;   // wrap
        }
    } else if (pos == queueSEND_TO_FRONT) {
        q->u.pcReadFrom -= q->uxItemSize;
        if (q->u.pcReadFrom < q->pcHead) {
            q->u.pcReadFrom = q->pcTail - q->uxItemSize;   // wrap
        }
        memcpy(q->u.pcReadFrom, src, q->uxItemSize);
    } else if (pos == queueOVERWRITE) {
        /* Mailbox mode */
        memcpy(q->pcWriteTo, src, q->uxItemSize);
        /* uxMessagesWaiting 증가시키지 않음 */
        return;
    }
    q->uxMessagesWaiting++;
}
```

## Receive — 대칭 구조

```c
BaseType_t xQueueReceive(QueueHandle_t q, void *buffer, TickType_t xTicksToWait) {
    portENTER_CRITICAL();
    
    if (q->uxMessagesWaiting > 0) {
        prvCopyDataFromQueue(q, buffer);
        q->uxMessagesWaiting--;
        
        /* Sender waiter wake */
        if (!list_empty(&q->xTasksWaitingToSend)) {
            xTaskRemoveFromEventList(&q->xTasksWaitingToSend);
        }
        portEXIT_CRITICAL();
        return pdPASS;
    }
    
    /* Empty */
    if (xTicksToWait == 0) {
        portEXIT_CRITICAL();
        return errQUEUE_EMPTY;
    }
    
    vTaskPlaceOnEventList(&q->xTasksWaitingToReceive, xTicksToWait);
    portEXIT_CRITICAL();
    portYIELD_WITHIN_API();
    /* ... */
}
```

## cRxLock·cTxLock — ISR Safety

```c
volatile int8_t cRxLock;   // -1 = unlocked, 0+ = ISR queued sends count
volatile int8_t cTxLock;
```

ISR이 *FromISR send*를 호출하면 task를 깨워야 합니다. 그런데 ISR 중에 *task list를 직접 수정*하는 것은 위험합니다. 그래서 **lock 카운터를 사용**합니다.

```c
xQueueSendFromISR(...) {
    /* ... copy item ... */
    if (q->cTxLock == queueUNLOCKED) {
        /* Scheduler running — wake 직접 수행 */
        wake_receiver();
    } else {
        /* Locked — count up */
        q->cTxLock++;
    }
}
```

Unlock 시점에 누적된 wake가 한꺼번에 처리됩니다.

## Generic Send — xCopyPosition

```c
queueSEND_TO_BACK    // 일반 FIFO
queueSEND_TO_FRONT   // LIFO 동작
queueOVERWRITE       // Mailbox (1 slot, 덮어쓰기)
```

다양한 동작이 *같은 API에 인자만 다르게* 들어가 표현됩니다.

## Performance

```text
Send / Receive (empty wait list):
- portENTER_CRITICAL: 5 cycle
- check queue state: 10 cycle
- memcpy item: itemSize / 4 × 1 cycle
- wake check: 10 cycle
- portEXIT_CRITICAL: 5 cycle

Total ≈ 30 + itemSize/4 cycle
```

작은 item(약 16 byte)이면 34 cycle, 약 0.2 µs입니다. *매우 빠릅니다*.

## Stream Buffer — Byte 단위

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
```

가변 길이 byte stream을 다룹니다. *1:1 producer/consumer를 전제*로 하므로 lock-free 구현이 가능합니다.

## Message Buffer — 가변 길이

```c
xMessageBufferSend(mb, msg, msg_len, timeout);
```

각 message에 *length prefix*가 붙어, 수신 시 정확한 size를 알 수 있습니다.

## 자주 하는 실수

> ⚠️ Item size mismatch

`xQueueCreate(10, sizeof(int))`로 만든 큐에 `struct`를 send하면 메모리가 깨집니다.

> ⚠️ Static 잘못 사용

Static queue도 *storage buffer를 별도로 할당*해야 합니다. `xQueueCreateStatic`을 씁니다.

> ⚠️ Pointer queue 후 free

수신자가 read하기 전에 sender가 free하면 dangling pointer가 됩니다. *Memory pool*로 관리하는 것이 좋습니다.

> ⚠️ Queue 크기 underestimate

10개로 설정했는데 burst로 50개가 들어오면 drop이 발생합니다. 크기 모니터링이 필요합니다.

## 정리

- Queue는 **Ring buffer와 2개의 wait list** 조합입니다.
- **uxMessagesWaiting**이 상태를 표현하고, **pcWriteTo·pcReadFrom**이 ring 내 위치를 관리합니다.
- **cTxLock·cRxLock**으로 ISR 안전성을 확보합니다.
- Send 시 *가장 높은 priority의 receiver를 wake*합니다.
- Send to front, overwrite, by-pointer 같은 variant가 있습니다.

다음 편은 **Event Group**입니다.

## 관련 항목

- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-08: Event Group 구현](/blog/embedded/rtos/practical-internals/part3-08-event-group)
