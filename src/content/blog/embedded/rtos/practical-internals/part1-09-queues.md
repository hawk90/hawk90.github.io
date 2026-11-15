---
title: "큐와 메시지 패싱 — Producer-Consumer·Ring Buffer·전달 의미"
slug: "embedded/rtos/practical-internals/part1-09-queues"
date: 2026-05-04T09:09:00
description: "Task 간 데이터 전달의 표준입니다. FreeRTOS는 by-value copy이며, 대용량은 pointer queue로 처리합니다."
series: "Practical RTOS Internals"
seriesOrder: 9
tags: [queue, message-passing, producer-consumer, ring-buffer]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"공유 메모리 + lock보다 message passing"** — 큐는 데이터와 동기화를 한 번에 처리합니다.

## Queue — 전달 의미부터 정하기

Mutex와 공유 buffer 패턴을 먼저 보겠습니다.

```c
SemaphoreHandle_t mtx;
SharedBuffer_t shared;

void producer(void *arg) {
    while (1) {
        Data_t data = read_sensor();
        xSemaphoreTake(mtx, portMAX_DELAY);
        shared.data = data;            // 같은 mutex를 지키면 이 대입은 보호됨
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

이 예는 같은 mutex를 올바르게 취득한 경로끼리 동시 접근을 분리합니다. 문제는 polling과 최신값 overwrite여서 중간 샘플이 유실될 수 있다는 점입니다. 모든 항목을 전달하려는 요구라면 bounded queue와 포화 정책을 대안으로 비교합니다.

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
        if (xQueueReceive(q, &data, portMAX_DELAY) == pdPASS) process(data);
    }
}
```

Mutex와 signal, buffer가 통합되어 producer-consumer를 한 줄로 표현할 수 있습니다.

## Queue 내부 — Ring Buffer

![Queue ring buffer + 2 wait lists](/images/blog/practical-internals/diagrams/part1-09-queue-ringbuffer.svg)

FreeRTOS V11.2.0 queue 구조의 개념 필드를 단순화한 설명입니다. 실제 소스에서는 포인터 일부가 union 안에 있고 구조·조건부 필드가 다릅니다. ABI나 완성된 구현으로 복사하지 않습니다.

```c
typedef struct QueueDefinition {
    int8_t *pcHead;             // buffer 시작
    int8_t *pcTail;             // buffer 끝
    int8_t *pcWriteTo;          // 다음 write 위치
    int8_t *pcReadFrom;         // 마지막으로 읽은 위치(실제 receive 경로에서 다음 위치로 이동)
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

실제 API의 대기·timeout·재검사 처리를 생략한 **설명용 의사 코드**입니다. 이 이름의 함수를 FreeRTOS와 함께 정의하거나 단순한 wait 등록→unlock→block 순서를 독립 구현으로 쓰면 안 됩니다.

```c
BaseType_t send_sketch(QueueModel_t *q, const void *item, TickType_t timeout) {
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

큐가 item 전체를 copy 합니다. 정해진 item size만큼 바이트를 복사합니다. 그 구조체 안의 포인터 대상까지 deep copy하지는 않습니다. 대용량에서는 복사 비용·정적 저장 공간을 따로 측정합니다.

```c
typedef struct {
    uint8_t buf[1024];          // 1 KB
    int size;
} BigMsg_t;

// 매 send마다 sizeof(BigMsg_t) byte copy, size 필드와 padding 포함
QueueHandle_t q = xQueueCreate(5, sizeof(BigMsg_t));
```

item 저장 공간은 `5 * sizeof(BigMsg_t)`이며 queue 제어 구조와 allocator 비용은 별도입니다. 32비트 int·정렬 4인 일반 배치에서는 `sizeof(BigMsg_t)=1028`이라 item만 5140바이트입니다. 정확한 값은 대상 ABI에서 확인합니다. 각 성공 send/receive는 item size만큼 복사합니다.

### By-Reference (Pointer Queue)

포인터 값 자체는 복사하지만 payload 복사를 생략합니다. 수명·소유권 이전·실패 시 회수·동시 수정 방지는 애플리케이션 책임입니다. 항상 더 빠르다는 결론은 전체 pool 관리 비용까지 비교해야 합니다.

```c
QueueHandle_t q = xQueueCreate(5, sizeof(BigMsg_t *));

void producer(void *arg) {
    BigMsg_t *msg = pool_alloc();
    if (msg == NULL) return;
    fill(msg);
    if (xQueueSend(q, &msg, portMAX_DELAY) != pdPASS) pool_free(msg);
    // 성공 후 sender는 msg를 수정·재사용·해제하지 않음
}

void consumer(void *arg) {
    BigMsg_t *msg;
    while (1) {
        if (xQueueReceive(q, &msg, portMAX_DELAY) == pdPASS) {
            process(msg);
            pool_free(msg);
        }                  // 수신 후 해제
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

한 writer·한 reader 계약을 지키거나 외부에서 직렬화해야 합니다. 여러 writer/reader를 지원하려고 blocking 호출 전체를 임의로 critical section에 넣으면 안 됩니다. 직렬화 방식과 timeout·대기 계약을 함께 검토합니다.

### Message Buffer (FreeRTOS 10+)

가변 길이 message를 다룹니다. 각 message에 length prefix가 붙습니다.

```c
MessageBufferHandle_t mb = xMessageBufferCreate(1024);
xMessageBufferSend(mb, "Hello", 5, timeout);
xMessageBufferSend(mb, "World!", 6, timeout);
// 충분한 수신 buffer가 있고 각 send가 성공했다면 5byte 뒤 6byte message
// buffer가 너무 작으면 해당 message를 쪼개 반환한다고 가정하지 않음
```

### Mailbox

큐가 항상 1 슬롯만 가집니다. 가장 최근 데이터만 유지하며, 옛 데이터를 덮어씁니다.

```c
QueueHandle_t latest = xQueueCreate(1, sizeof(Data_t));
// 생성 성공을 확인한 뒤 사용. overwrite는 길이1 queue 전용
xQueueOverwrite(latest, &data);
xQueuePeek(latest, &data, 0); // 반환 성공 확인 필요, 비파괴 read
```

최신 상태(예: battery level)를 관찰하는 용도에 사용할 수 있습니다. 여러 consumer에게 모든 갱신을 각각 전달하는 broadcast를 자동 보증하지는 않습니다.

## 동기화 vs 통신

| 패턴 | 도구 |
| --- | --- |
| 자원 보호 (data integrity) | Mutex |
| 이벤트 알림 | Semaphore / Task Notification |
| 데이터 전달 | **Queue** |
| 가변 byte stream | Stream Buffer |
| 가변 길이 message | Message Buffer |

Queue는 데이터 전달과 동기화를 통합합니다. 가장 흔히 쓰이는 IPC입니다.

## Performance — 같은 조건으로 비교

“32비트 MCU니까 memcpy가 4 byte/cycle”이라는 보편식은 없습니다. 복사 코드·정렬·메모리 wait state·cache·bus 경합과 kernel의 critical/wakeup 비용을 함께 측정합니다. item size·queue 길이·대기자·성공/포화·ISR/task 문맥을 고정하고 send/receive 경계를 정해야 합니다.

이 장의 host 검사는 전달 의미와 경계만 확인하며 cycle 수나 실제 MCU latency를 측정하지 않습니다.

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

storage와 control block이 queue 사용 기간 내내 유효해야 합니다. static/dynamic 선택은 제품 수명·용량·오류 정책으로 정합니다.

## 자주 하는 실수

> ⚠️ Queue 가득 차 block 됨

`xQueueSend` 호출 시 queue가 full이고 timeout이 양수이면 sender가 block될 수 있습니다. 의도와 다르다면 timeout=0으로 non-blocking 모드를 씁니다.

> ⚠️ By-reference 후 메모리 free

```c
xQueueSend(q, &ptr, ...);
free(ptr);   // ← 수신자가 read 전에 free → crash
```

수신자가 free 책임을 지거나 메모리 풀을 사용해야 합니다.

> ⚠️ ISR에서 normal queue send

`xQueueSend()`(FromISR 아님)를 호출하면 crash 합니다. 항상 FromISR 버전을 써야 합니다.

> ⚠️ Item size mismatch

`xQueueCreate(10, sizeof(int))`로 만들고 큰 `Data_t`를 send하면 int 크기 부분만 복사돼 데이터가 잘리고, receive 대상은 복사 폭보다 작으면 overflow할 수 있습니다. 반대로 item size가 source 객체보다 크면 send에서 out-of-bounds read가 됩니다. Item size 일치를 반드시 확인해야 합니다.

## 정리

- Queue는 **Ring buffer + 2 wait list** 구조로, 데이터와 동기화를 통합합니다.
- By-value는 item 크기만큼 복사하며 내부 포인터는 별도입니다. Pointer queue는 payload 복사를 줄이는 대신 소유권·실패 회수가 필요합니다.
- 변종으로 **Stream Buffer**(byte), **Message Buffer**(가변), **Mailbox**(overwrite)가 있습니다.
- ISR과 task 사이의 표준 패턴입니다.

다음 편(Part 1 마지막)에서는 **실시간성 분석**으로 Latency, Jitter, Deadline, WCET를 다룹니다.

## 실제 kernel을 사용한 host 경계 검사

다음 함수는 V11.2.0 POSIX controller task에서 실행합니다. by-value 복사, full/empty 실패와 FIFO·wraparound를 확인합니다. 보드 IRQ·cycle·모든 interleaving을 검증한 결과가 아닙니다.

```c title="queue-check.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "queue.h"
void check_queue(void) {
    QueueHandle_t q = xQueueCreate(2, sizeof(int));
    assert(q);
    int value = 42, out = 0;
    assert(xQueueSend(q, &value, 0) == pdPASS);
    value = 99;
    assert(xQueueReceive(q, &out, 0) == pdPASS && out == 42);
    assert(xQueueReceive(q, &out, 0) == errQUEUE_EMPTY);
    for (int round = 0; round < 3; ++round) {
        int a = round * 2, b = a + 1;
        assert(xQueueSend(q, &a, 0) == pdPASS);
        assert(xQueueSend(q, &b, 0) == pdPASS);
        assert(xQueueSend(q, &value, 0) == errQUEUE_FULL);
        assert(xQueueReceive(q, &out, 0) == pdPASS && out == a);
        assert(xQueueReceive(q, &out, 0) == pdPASS && out == b);
    }
    vQueueDelete(q);
}
```

`scripts/verify-rtos-ipc-examples.mjs`가 본문에서 추출해 실행합니다. API 계약은 [공식 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h), 구현은 [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c)를 고정해 대조합니다. [stream_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stream_buffer.h)의 단일 writer/reader·blocking 제약도 별도로 확인합니다. 앞의 API 조각들은 platform 선언과 초기화가 필요한 설명입니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [3-07: 큐 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
