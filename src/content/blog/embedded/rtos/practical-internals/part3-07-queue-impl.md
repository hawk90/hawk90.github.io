---
title: "3-07: Queue 내부 구현 — Ring Buffer, 2 Wait Lists, Atomic Send/Receive"
date: 2026-05-08T04:00:00
description: "FreeRTOS Queue 코드 — pcWriteTo·pcReadFrom·uxMessagesWaiting + xTasksWaitingToSend/Receive."
series: "Practical RTOS Internals"
seriesOrder: 28
tags: [queue, ring-buffer, wait-list, atomic]
draft: true
---

## 한 줄 요약

> **"Queue = Ring buffer + 2 wait lists"** — Send/Receive 양쪽 모두 blocking 가능.

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
    /* ... 깨어남 후 재시도 ... */
}
```

## Ring Buffer Wrap

```c
static void prvCopyDataToQueue(Queue_t *q, const void *src, BaseType_t pos) {
    if (q->uxItemSize == 0) {
        /* Semaphore mode — counter만 */
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
        /* uxMessagesWaiting 증가 안 함 */
        return;
    }
    q->uxMessagesWaiting++;
}
```

## Receive — 대칭

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

ISR이 *FromISR send* 시 task wake 필요. 그러나 ISR 도중 *task list 직접 수정*은 위험 → **lock 카운터 사용**:

```c
xQueueSendFromISR(...) {
    /* ... copy item ... */
    if (q->cTxLock == queueUNLOCKED) {
        /* Scheduler running — wake 직접 */
        wake_receiver();
    } else {
        /* Locked — count up */
        q->cTxLock++;
    }
}
```

Unlock 시 누적된 wake 일괄 처리.

## Generic Send — xCopyPosition

```c
queueSEND_TO_BACK    // 일반 FIFO
queueSEND_TO_FRONT   // LIFO 동작
queueOVERWRITE       // Mailbox (1 slot, 덮어쓰기)
```

다양한 동작이 *같은 API + 인자*.

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

작은 item (~16 byte) = 34 cycle ≈ 0.2 µs. *매우 빠름*.

## Stream Buffer — Byte 단위

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
```

가변 길이 byte stream. *1:1 producer/consumer 전제* — lock-free 가능.

## Message Buffer — 가변 길이

```c
xMessageBufferSend(mb, msg, msg_len, timeout);
```

각 message에 *length prefix* — 수신 시 정확 size.

## 자주 하는 실수

> ⚠️ Item size mismatch

`xQueueCreate(10, sizeof(int))` 후 `struct` send → 메모리 corruption.

> ⚠️ Static 잘못 사용

Static queue도 *storage buffer 별도 할당* 필요. `xQueueCreateStatic`.

> ⚠️ Pointer queue 후 free

수신자 read 전 sender가 free → dangling pointer. *Memory pool*.

> ⚠️ Queue 크기 underestimate

10개로 했는데 burst 50개 → drop. 크기 모니터링.

## 정리

- Queue = **Ring buffer + 2 wait lists**.
- **uxMessagesWaiting**으로 state, **pcWriteTo·pcReadFrom**으로 ring 위치.
- **cTxLock·cRxLock** ISR 안전성.
- Send 시 *highest priority receiver wake*.
- Send to front / overwrite / by-pointer variants.

다음 편은 **Event Group**.

## 관련 항목

- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-08: Event Group 구현](/blog/embedded/rtos/practical-internals/part3-08-event-group)
