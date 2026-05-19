---
title: "1-09: 큐와 메시지 패싱 — Producer-Consumer, Ring Buffer, By-Value vs By-Reference"
date: 2026-05-08T09:00:00
description: "Task 간 데이터 전달의 표준. FreeRTOS는 by-value copy. 대용량은 pointer queue."
series: "Practical RTOS Internals"
seriesOrder: 9
tags: [queue, message-passing, producer-consumer, ring-buffer]
draft: true
---

## 한 줄 요약

> **"공유 메모리 + lock보다 message passing"** — 큐는 *데이터 + 동기화*를 한 번에.

## Queue — Task 간 통신의 정답

Mutex + 공유 buffer 패턴:

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

→ Polling 필요·복잡. 대안 — **Queue**.

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

*Mutex + signal + buffer*가 통합되어 *한 줄*에 producer-consumer.

## Queue 내부 — Ring Buffer

![Queue ring buffer + 2 wait lists](/images/blog/practical-internals/diagrams/part1-09-queue-ringbuffer.svg)

FreeRTOS의 큐 구현:

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

**Ring buffer + 2 wait list**. 송신자·수신자 모두 block 가능.

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

대칭. Empty 시 *xTasksWaitingToReceive에 block*, 새 item 도착 시 wake.

## By-Value vs By-Reference

### By-Value (FreeRTOS 기본)

큐가 *item 전체를 copy*. 안전하지만 *대용량 data*에 비효율.

```c
typedef struct {
    uint8_t buf[1024];          // 1 KB
    int size;
} BigMsg_t;

// 매 send마다 1024 byte memcpy
QueueHandle_t q = xQueueCreate(5, sizeof(BigMsg_t));
```

5개 × 1 KB = 5 KB 큐 RAM. + 매 send/receive 1 KB copy.

### By-Reference (Pointer Queue)

Pointer만 큐에 — *copy 없음*. 빠르지만 *수명 관리*가 발신자/수신자 책임.

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

> ⚠️ **수명 관리**가 까다로움 — sender가 msg 재사용·free 시 데이터 깨짐. *메모리 풀*과 결합.

## Queue 변종

### Stream Buffer (FreeRTOS 10+)

바이트 stream 전용 (UART RX 등). 1:1 producer/consumer 전제.

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
xStreamBufferReceive(sb, buf, sizeof(buf), timeout);
```

가변 길이·effiicient. *Multi-producer는 외부 동기화*.

### Message Buffer (FreeRTOS 10+)

가변 길이 message. 각 message에 length prefix.

```c
MessageBufferHandle_t mb = xMessageBufferCreate(1024);
xMessageBufferSend(mb, "Hello", 5, timeout);
xMessageBufferSend(mb, "World!", 6, timeout);
// Receive 시 정확히 5 byte, 그 다음 6 byte
```

### Mailbox

큐 항상 *1 슬롯*만. 가장 최근 데이터만 유지 — 옛 데이터 덮어씀.

```c
xQueueOverwrite(q, &data);   // 큐 full이어도 OK, 옛것 덮어씀
xQueuePeek(q, &data, 0);     // 비파괴 read
```

상태 broadcast (battery level 등)에 유용.

## 동기화 vs 통신

| 패턴 | 도구 |
| --- | --- |
| 자원 보호 (data integrity) | Mutex |
| 이벤트 알림 | Semaphore / Task Notification |
| 데이터 전달 | **Queue** |
| 가변 byte stream | Stream Buffer |
| 가변 길이 message | Message Buffer |

Queue가 *데이터 전달 + 동기화*를 통합 — 가장 흔히 쓰이는 IPC.

## Performance — Copy 비용

```c
// 작은 데이터 (sizeof(Data_t) ≤ 32 byte)
xQueueSend(q, &data, ...);   // memcpy 32 byte ≈ 8 cycle on 32-bit MCU

// 큰 데이터 (1 KB)
xQueueSend(q, &big, ...);    // memcpy 1 KB ≈ 250 cycle
```

ARMv7-M memcpy ≈ 4 byte/cycle. 작은 message는 *by-value 충분히 빠름*.

## ISR에서 사용

```c
// ISR
BaseType_t woken = pdFALSE;
xQueueSendFromISR(q, &data, &woken);
portYIELD_FROM_ISR(woken);
```

**Top-half ISR + Bottom-half task** 패턴의 표준 도구.

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

Safety-critical에서 표준.

## 자주 하는 실수

> ⚠️ Queue 가득 차 block 됨

`xQueueSend` 호출 시 *queue full*이면 *sender block*. 의도와 다르면 *timeout=0*으로 non-blocking.

> ⚠️ By-reference 후 메모리 free

```c
xQueueSend(q, &ptr, ...);
free(ptr);   // ← 수신자가 read 전에 free → crash
```

수신자가 *free 책임* 또는 *메모리 풀* 사용.

> ⚠️ ISR에서 normal queue send

`xQueueSend()` (FromISR 아님) → crash. 항상 FromISR.

> ⚠️ Item size mismatch

`xQueueCreate(10, sizeof(int))`로 만들고 `Data_t` send → memory corruption. Item size 일치 확인.

## 정리

- Queue = **Ring buffer + 2 wait list** — 데이터 + 동기화 통합.
- **By-value (copy)**가 기본, 안전. **By-reference (pointer)**가 빠르나 수명 관리.
- **Stream Buffer** (byte), **Message Buffer** (가변), **Mailbox** (overwrite) 변종.
- ISR ↔ task 표준 패턴.

다음 편 (Part 1 마지막) — **실시간성 분석** — Latency·Jitter·Deadline·WCET.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [3-07: 큐 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
