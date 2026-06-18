---
title: "큐와 메시지 패싱 — Producer-Consumer·Ring Buffer·전달 의미"
date: 2026-05-04T09:09:00
description: "Task 간 데이터 전달의 표준입니다. FreeRTOS는 by-value copy이며, 대용량은 pointer queue로 처리합니다."
series: "Practical RTOS Internals"
seriesOrder: 9
tags: [queue, message-passing, producer-consumer, ring-buffer]
draft: false
---

## 한 줄 요약

> **"공유 메모리 + lock보다 message passing"** — 큐는 데이터와 동기화를 한 번에 처리합니다.

## Queue — Task 간 통신의 정답

Mutex와 공유 buffer 패턴을 먼저 보겠습니다.

```c
SemaphoreHandle_t mtx;
SharedBuffer_t shared;

void producer(void *arg) {
    while (1) {
        Data_t data = read_sensor();
        xSemaphoreTake(mtx, portMAX_DELAY);
        shared.data = data;            // ← race condition 위험
        shared.ready = 1;
        xSemaphoreGive(mtx);
    }
}

void consumer(void *arg) {
    while (1) {
        xSemaphoreTake(mtx, portMAX_DELAY);
        if (shared.ready) {
            Data_t data = shared.data;
            shared.ready = 0;
        }
        xSemaphoreGive(mtx);
    }
}
```

Polling이 필요하고 복잡합니다. 대안이 **Queue**입니다.

```c
QueueHandle_t q = xQueueCreate(10, sizeof(Data_t));

void producer(void *arg) {
    while (1) {
        Data_t data = read_sensor();
        xQueueSend(q, &data, portMAX_DELAY);
    }
}

void consumer(void *arg) {
    Data_t data;
    while (1) {
        xQueueReceive(q, &data, portMAX_DELAY);  // 자동 block
        process(data);
    }
}
```

Mutex와 signal, buffer가 통합되어 producer-consumer를 한 줄로 표현할 수 있습니다.

## Queue 내부 — Ring Buffer

![Queue ring buffer + 2 wait lists](/images/blog/practical-internals/diagrams/part1-09-queue-ringbuffer.svg)

FreeRTOS의 큐 구현은 다음과 같습니다.

```c
typedef struct QueueDefinition {
    int8_t *pcHead;             // buffer 시작
    int8_t *pcTail;             // buffer 끝
    int8_t *pcWriteTo;          // 다음 write 위치
    int8_t *pcReadFrom;         // 다음 read 위치
    UBaseType_t uxMessagesWaiting;  // 현재 항목 수
    UBaseType_t uxLength;       // 최대 항목 수
    UBaseType_t uxItemSize;     // 각 항목 byte
    List_t xTasksWaitingToSend;     // queue full 대기
    List_t xTasksWaitingToReceive;  // queue empty 대기
} Queue_t;
```

**Ring buffer와 2개의 wait list**로 구성됩니다. 송신자와 수신자 모두 block 가능합니다.

## Send/Receive 흐름

### Send

```c
BaseType_t xQueueSend(QueueHandle_t q, const void *item, TickType_t timeout) {
    portENTER_CRITICAL();
    if (q->uxMessagesWaiting < q->uxLength) {
        memcpy(q->pcWriteTo, item, q->uxItemSize);
        q->pcWriteTo += q->uxItemSize;
        if (q->pcWriteTo >= q->pcTail) q->pcWriteTo = q->pcHead;  // wrap
        q->uxMessagesWaiting++;
        // Receive waiter 깨움
        wake_first_waiter(&q->xTasksWaitingToReceive);
        portEXIT_CRITICAL();
        return pdTRUE;
    }
    // Full — block
    add_to_wait_list(&q->xTasksWaitingToSend, current_task);
    portEXIT_CRITICAL();
    block_with_timeout(timeout);
    /* ... 재시도 또는 timeout return */
}
```

### Receive

Send와 대칭입니다. Empty 시 xTasksWaitingToReceive에 block 하고, 새 item이 도착하면 wake 합니다.

## By-Value vs By-Reference

### By-Value (FreeRTOS 기본)

큐가 item 전체를 copy 합니다. 안전하지만 대용량 데이터에는 비효율적입니다.

```c
typedef struct {
    uint8_t buf[1024];          // 1 KB
    int size;
} BigMsg_t;

// 매 send마다 1024 byte memcpy
QueueHandle_t q = xQueueCreate(5, sizeof(BigMsg_t));
```

5개 × 1 KB = 5 KB의 큐 RAM이 필요하고, 매 send/receive마다 1 KB를 copy 해야 합니다.

### By-Reference (Pointer Queue)

Pointer만 큐에 넣어 copy가 없습니다. 빠르지만 수명 관리는 발신자와 수신자의 책임입니다.

```c
QueueHandle_t q = xQueueCreate(5, sizeof(BigMsg_t *));

void producer(void *arg) {
    BigMsg_t *msg = pool_alloc();   // 메모리 풀에서
    fill(msg);
    xQueueSend(q, &msg, portMAX_DELAY);   // pointer만
}

void consumer(void *arg) {
    BigMsg_t *msg;
    while (1) {
        xQueueReceive(q, &msg, portMAX_DELAY);
        process(msg);
        pool_free(msg);                  // 수신 후 해제
    }
}
```

> ⚠️ **수명 관리**가 까다롭습니다. sender가 msg를 재사용하거나 free 하면 데이터가 깨집니다. 메모리 풀과 결합해 쓰는 것이 좋습니다.

## Queue 변종

### Stream Buffer (FreeRTOS 10+)

바이트 stream 전용입니다(UART RX 등). 1:1 producer/consumer를 전제합니다.

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
xStreamBufferReceive(sb, buf, sizeof(buf), timeout);
```

가변 길이이고 효율적입니다. Multi-producer 환경에서는 외부 동기화가 필요합니다.

### Message Buffer (FreeRTOS 10+)

가변 길이 message를 다룹니다. 각 message에 length prefix가 붙습니다.

```c
MessageBufferHandle_t mb = xMessageBufferCreate(1024);
xMessageBufferSend(mb, "Hello", 5, timeout);
xMessageBufferSend(mb, "World!", 6, timeout);
// Receive 시 정확히 5 byte, 그 다음 6 byte
```

### Mailbox

큐가 항상 1 슬롯만 가집니다. 가장 최근 데이터만 유지하며, 옛 데이터를 덮어씁니다.

```c
xQueueOverwrite(q, &data);   // 큐 full이어도 OK, 옛것 덮어씀
xQueuePeek(q, &data, 0);     // 비파괴 read
```

상태 broadcast(예: battery level)에 유용합니다.

## 동기화 vs 통신

| 패턴 | 도구 |
| --- | --- |
| 자원 보호 (data integrity) | Mutex |
| 이벤트 알림 | Semaphore / Task Notification |
| 데이터 전달 | **Queue** |
| 가변 byte stream | Stream Buffer |
| 가변 길이 message | Message Buffer |

Queue는 데이터 전달과 동기화를 통합합니다. 가장 흔히 쓰이는 IPC입니다.

## Performance — Copy 비용

```c
// 작은 데이터 (sizeof(Data_t) ≤ 32 byte)
xQueueSend(q, &data, ...);   // memcpy 32 byte ≈ 8 cycle on 32-bit MCU

// 큰 데이터 (1 KB)
xQueueSend(q, &big, ...);    // memcpy 1 KB ≈ 250 cycle
```

ARMv7-M memcpy는 약 4 byte/cycle입니다. 작은 message는 by-value로도 충분히 빠릅니다.

## ISR에서 사용

```c
// ISR
BaseType_t woken = pdFALSE;
xQueueSendFromISR(q, &data, &woken);
portYIELD_FROM_ISR(woken);
```

**Top-half ISR + Bottom-half task** 패턴의 표준 도구입니다.

## Static 할당

```c
StaticQueue_t q_buf;
uint8_t q_storage[10 * sizeof(Data_t)];

QueueHandle_t q = xQueueCreateStatic(
    10,                  // length
    sizeof(Data_t),      // item size
    q_storage,           // storage buffer
    &q_buf               // queue control block
);
```

Safety-critical에서 표준으로 씁니다.

## 자주 하는 실수

> ⚠️ Queue 가득 차 block 됨

`xQueueSend` 호출 시 queue가 full이면 sender가 block 됩니다. 의도와 다르다면 timeout=0으로 non-blocking 모드를 씁니다.

> ⚠️ By-reference 후 메모리 free

```c
xQueueSend(q, &ptr, ...);
free(ptr);   // ← 수신자가 read 전에 free → crash
```

수신자가 free 책임을 지거나 메모리 풀을 사용해야 합니다.

> ⚠️ ISR에서 normal queue send

`xQueueSend()`(FromISR 아님)를 호출하면 crash 합니다. 항상 FromISR 버전을 써야 합니다.

> ⚠️ Item size mismatch

`xQueueCreate(10, sizeof(int))`로 만들고 `Data_t`를 send 하면 memory corruption이 발생합니다. Item size 일치를 반드시 확인해야 합니다.

## 정리

- Queue는 **Ring buffer + 2 wait list** 구조로, 데이터와 동기화를 통합합니다.
- **By-value(copy)**가 기본이며 안전합니다. **By-reference(pointer)**는 빠르지만 수명 관리가 필요합니다.
- 변종으로 **Stream Buffer**(byte), **Message Buffer**(가변), **Mailbox**(overwrite)가 있습니다.
- ISR과 task 사이의 표준 패턴입니다.

다음 편(Part 1 마지막)에서는 **실시간성 분석**으로 Latency, Jitter, Deadline, WCET를 다룹니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [3-07: 큐 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
