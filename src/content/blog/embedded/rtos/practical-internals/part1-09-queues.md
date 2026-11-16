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

Mutex와 signal, buffer가 통합되어 producer-consumer를 한 줄로 표현할 수 있습니다. 회전초밥 레일과 비슷합니다. 주방은 접시를 올리기만 하고 손님은 내려오는 접시를 집기만 하며, 레일이 가득 차면 주방이 기다리고 비면 손님이 기다립니다.

## Queue 내부 — Ring Buffer

![Queue ring buffer + 2 wait lists](/images/blog/practical-internals/diagrams/part1-09-queue-ringbuffer.svg)

아래는 FreeRTOS V11.2.0 [`queue.c` L103-L136](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c#L103-L136)의 `QueueDefinition`에서 조건부 필드(`ucStaticallyAllocated`, queue set, trace)를 뺀 것입니다. 주석은 원문을 줄였습니다. `pcTail`과 `pcReadFrom`은 union 안의 `QueuePointers_t`(L68-L72)에 있어서, 같은 자리를 mutex일 때는 1-08의 `SemaphoreData_t`가 씁니다.

```c
typedef struct QueueDefinition
{
    int8_t * pcHead;           /* storage 시작 */
    int8_t * pcWriteTo;        /* 다음 빈 자리 */
    union
    {
        QueuePointers_t xQueue;     /* pcTail, pcReadFrom */
        SemaphoreData_t xSemaphore; /* mutex holder, recursive count */
    } u;
    List_t xTasksWaitingToSend;             /* 우선순위 순 */
    List_t xTasksWaitingToReceive;          /* 우선순위 순 */
    volatile UBaseType_t uxMessagesWaiting; /* 현재 item 수 */
    UBaseType_t uxLength;                   /* item 개수(바이트 아님) */
    UBaseType_t uxItemSize;
    volatile int8_t cRxLock;   /* queue lock 중 받은 수 */
    volatile int8_t cTxLock;   /* queue lock 중 보낸 수 */
} xQUEUE;
```

**Ring buffer와 2개의 wait list**로 구성됩니다. 송신자와 수신자 모두 block 가능하고, 두 list는 우선순위 순으로 정렬되어 가장 높은 대기자가 먼저 깨어납니다.

## Send/Receive 흐름

### Send

ring buffer에 넣는 부분은 `prvCopyDataToQueue()`의 `queueSEND_TO_BACK` 분기입니다([`queue.c` L2421-L2429](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c#L2421-L2429)).

```c
else if( xPosition == queueSEND_TO_BACK )
{
    ( void ) memcpy( ( void * ) pxQueue->pcWriteTo, pvItemToQueue, ( size_t ) pxQueue->uxItemSize );
    pxQueue->pcWriteTo += pxQueue->uxItemSize;

    if( pxQueue->pcWriteTo >= pxQueue->u.xQueue.pcTail )
    {
        pxQueue->pcWriteTo = pxQueue->pcHead;
    }
```

`xQueueGenericSend()`(L942)는 이 함수를 critical section 안에서 부른 뒤 `xTasksWaitingToReceive`에 대기자가 있으면 `xTaskRemoveFromEventList()`로 깨웁니다(L1042). 가득 찼고 timeout이 0이면 바로 `errQUEUE_FULL`을 돌려줍니다(L1087-L1089). timeout이 있으면 critical section을 나와 queue를 lock(`prvLockQueue`, L1111)한 상태에서 timeout을 검사하고, `xTasksWaitingToSend`에 자신을 걸고(L1119) block합니다. 깨어나면 루프 처음으로 돌아가 다시 시도합니다. queue lock은 그사이 ISR이 queue를 고쳐도 event list는 건드리지 않게 하는 장치이며, [3-07](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)에서 자세히 봅니다.

### Receive

Send와 대칭입니다. Empty 시 xTasksWaitingToReceive에 block 하고, 새 item이 도착하면 wake 합니다.

## By-Value vs By-Reference

### By-Value (FreeRTOS 기본)

큐가 item 전체를 copy 합니다. 위 `memcpy`처럼 정해진 item size만큼 바이트를 복사하고, 그 구조체 안의 포인터 대상까지 deep copy하지는 않습니다.

```c
typedef struct {
    uint8_t buf[1024];          // 1 KB
    int size;
} BigMsg_t;

// 매 send마다 sizeof(BigMsg_t) byte copy, size 필드와 padding 포함
QueueHandle_t q = xQueueCreate(5, sizeof(BigMsg_t));
```

item 저장 공간은 `5 * sizeof(BigMsg_t)`이며 queue 제어 구조와 allocator 비용은 별도입니다. arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m3`에서 `sizeof(BigMsg_t)`는 1028, item 저장 공간은 5,140바이트였습니다(아래 QEMU 실행). 각 성공 send/receive는 item size만큼 복사합니다.

### By-Reference (Pointer Queue)

포인터 값 자체는 복사하지만 payload 복사를 생략합니다. 택배 상자 대신 사물함 열쇠를 건네는 셈이라, 열쇠를 건넨 뒤에도 사물함을 비우지 않을 책임이 남습니다. 수명·소유권 이전·실패 시 회수·동시 수정 방지는 애플리케이션 책임이고, pool 관리 비용은 별도입니다.

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

> ⚠️ **수명 관리**가 까다롭습니다. sender가 send 뒤에 msg를 재사용하거나 free 하면 receiver가 바뀐 데이터나 해제된 메모리를 읽습니다. 고정 크기 메모리 풀([4-05](/blog/embedded/rtos/practical-internals/part4-05-memory-pool))과 결합하면 "receiver가 반납" 규칙 하나로 정리됩니다.

## Queue 변종

### Stream Buffer (FreeRTOS 10+)

V10.0.0에서 추가된 바이트 stream 전용 객체입니다(`History.txt` "Changes between FreeRTOS V9.0.1 and FreeRTOS V10.0.0"). writer 하나와 reader 하나를 전제합니다.

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
xStreamBufferReceive(sb, buf, sizeof(buf), timeout);
```

`stream_buffer.h`는 "unlike other FreeRTOS objects, it is not safe to have multiple different writers or multiple different readers"라고 적고, 여럿이면 호출을 응용이 직렬화하라고 합니다([`stream_buffer.h` L36-L46](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stream_buffer.h#L36-L46)). writer와 reader가 서로 다른 task나 ISR인 것은 괜찮습니다. 자세한 계약은 [3-11](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)에서 다룹니다.

### Message Buffer (FreeRTOS 10+)

가변 길이 message를 다룹니다. 각 message에 length prefix가 붙습니다.

```c
MessageBufferHandle_t mb = xMessageBufferCreate(1024);
xMessageBufferSend(mb, "Hello", 5, timeout);
xMessageBufferSend(mb, "World!", 6, timeout);
```

QEMU에서 이 두 message를 넣은 뒤, 4바이트와 16바이트 수신 버퍼로 차례로 받아 봤습니다.

```text
message buffer free before=1024
after Hello+World!: free=1005 (sizeof(configMESSAGE_BUFFER_LENGTH_TYPE)=4)
receive into 4-byte buffer -> 0
receive into 16-byte buffer -> 5 "Hello"
next receive -> 6 "World!"
```

두 message가 1,024바이트 중 19바이트를 썼습니다. 내용 11바이트에 message마다 길이 prefix(`configMESSAGE_BUFFER_LENGTH_TYPE`, 기본 `size_t` = 4바이트)가 붙었기 때문입니다. 4바이트 버퍼로 받으면 잘라서 주지 않고 0을 돌려주며 message는 그대로 남습니다. `message_buffer.h`의 "If xBufferLengthBytes is too small to hold the next message then the message will be left in the message buffer and 0 will be returned."와 같습니다([`message_buffer.h` L541-L542](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/message_buffer.h#L541-L542)). 0은 "비어 있음"과 같은 값이므로, 받는 쪽은 `xMessageBufferNextLengthBytes()`로 다음 길이를 먼저 볼 수 있습니다.

### Mailbox

큐가 항상 1 슬롯만 가집니다. 가장 최근 데이터만 유지하며, 옛 데이터를 덮어씁니다.

```c
QueueHandle_t latest = xQueueCreate(1, sizeof(Data_t));
// 생성 성공을 확인한 뒤 사용. overwrite는 길이1 queue 전용
xQueueOverwrite(latest, &data);
xQueuePeek(latest, &data, 0); // 반환 성공 확인 필요, 비파괴 read
```

게시판에 붙은 공지 한 장과 같아서, 새 공지를 붙이면 옛 공지는 떼어집니다. QEMU에서 10, 20, 30을 차례로 `xQueueOverwrite()`한 뒤 `xQueuePeek()`했습니다.

```text
mailbox after overwrite 10,20,30: peek=30, still waiting=1
xQueueOverwrite on a length-2 queue -> ASSERT failed: queue.c line 955
```

peek는 꺼내지 않으므로 item은 그대로 1개 남아, 여러 task가 같은 최신값을 읽을 수 있습니다. 다만 그 사이의 10과 20은 아무도 보지 못했습니다. 길이가 1이 아닌 queue에 overwrite하면 `xQueueGenericSend()` 첫머리의 `configASSERT( !( ( xCopyPosition == queueOVERWRITE ) && ( pxQueue->uxLength != 1 ) ) )`에 걸립니다([`queue.c` L955](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c#L955)).

## 동기화 vs 통신

| 패턴 | 도구 |
| --- | --- |
| 자원 보호 (data integrity) | Mutex |
| 이벤트 알림 | Semaphore / Task Notification |
| 데이터 전달 | **Queue** |
| 가변 byte stream | Stream Buffer |
| 가변 길이 message | Message Buffer |

Queue는 데이터 전달과 동기화를 통합합니다. FreeRTOS의 semaphore와 mutex도 item 크기 0인 queue 위에 만들어져 있습니다(1-07, 1-08).

## Performance — 같은 조건으로 비교

복사 비용이 item 크기에 비례한다는 점은 QEMU에서도 보입니다. 대기자 없는 queue에 `xQueueSend()` + `xQueueReceive()` 한 쌍을 critical section 안에서 돌리고, 전후의 SysTick 현재값(SYST_CVR) 차이를 쟀습니다.

```c title="qdemo.c (발췌)"
static uint32_t span(QueueHandle_t q, void *item, void *out){ uint32_t a,b; taskENTER_CRITICAL(); a=CVR; xQueueSend(q,item,0); xQueueReceive(q,out,0); b=CVR; taskEXIT_CRITICAL(); return a-b; }
```

```text
sizeof(BigMsg_t)=1028, 5 items=5140 bytes
send+receive, SysTick counts (QEMU icount virtual time): 4B item=153, 1028B item=6707, pointer item=154
```

4바이트 item과 포인터 item은 거의 같았고, 1,028바이트 item은 약 44배였습니다. 두 가지를 감안해야 합니다. 첫째, 이 값은 icount 가상 시간이라 실행한 명령 수에 비례할 뿐 실제 보드의 cycle이 아닙니다. 둘째, 이 하네스의 `memcpy`는 바이트 단위 단순 루프이고, 다른 구현으로는 재지 않았습니다. 그래도 "payload 크기가 커지면 by-value 비용이 그만큼 커지고, 포인터 queue는 크기와 무관하다"는 방향은 커널 코드(`memcpy( ..., uxItemSize )`)에서 그대로 나옵니다. 실제 보드의 cycle은 이 장에서 재지 않았습니다.

## ISR에서 사용

```c
// ISR
BaseType_t woken = pdFALSE;
xQueueSendFromISR(q, &data, &woken);
portYIELD_FROM_ISR(woken);
```

**Top-half ISR + Bottom-half task** 패턴에서 ISR이 데이터를 넘길 때 씁니다. 가득 차면 `errQUEUE_FULL`이 돌아오므로 1-05의 UART 실험처럼 drop을 셉니다.

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

storage와 control block이 queue 사용 기간 내내 유효해야 합니다. `vQueueDelete()`는 static으로 만든 queue의 저장 공간을 해제하지 않습니다(`queue.c` L2282-L2284).

## 자주 하는 실수

> ⚠️ Queue 가득 차 block 됨

`xQueueSend` 호출 시 queue가 full이고 timeout이 양수이면 sender가 block됩니다. 의도와 다르다면 timeout=0으로 호출하고 `errQUEUE_FULL`을 처리합니다.

> ⚠️ By-reference 후 메모리 free

```c
xQueueSend(q, &ptr, ...);
free(ptr);   // ← 수신자가 읽기 전에 해제: use-after-free
```

수신자가 해제된 메모리를 읽는 것은 C에서 정의되지 않은 동작입니다. MPU를 쓰지 않는 Cortex-M에서는 해제된 heap 영역도 같은 SRAM이라 읽기 자체는 fault를 내지 않으므로, 이 버그는 crash가 아니라 틀린 데이터로 나타납니다. 수신자가 free 책임을 지거나 메모리 풀을 사용해야 합니다.

> ⚠️ ISR에서 normal queue send

`xQueueSend()`(FromISR 아님)를 호출하면 Cortex-M3 포트에서는 `ASSERT failed: portable/GCC/ARM_CM3/port.c line 438`에서 멈춥니다(1-02의 QEMU 실험). 항상 FromISR 버전을 써야 합니다.

> ⚠️ Item size mismatch

`xQueueCreate(10, sizeof(int))`로 만들고 큰 `Data_t`를 send하면 int 크기 부분만 복사돼 데이터가 잘리고, receive 대상은 복사 폭보다 작으면 overflow할 수 있습니다. 반대로 item size가 source 객체보다 크면 send에서 out-of-bounds read가 됩니다. Item size 일치를 반드시 확인해야 합니다.

## 정리

- Queue는 **Ring buffer + 2 wait list** 구조로, 데이터와 동기화를 통합합니다.
- By-value는 item 크기만큼 복사하며 내부 포인터는 별도입니다. Pointer queue는 payload 복사를 줄이는 대신 소유권·실패 회수가 필요합니다.
- 변종으로 **Stream Buffer**(byte), **Message Buffer**(가변), **Mailbox**(overwrite)가 있습니다.
- message buffer는 message마다 4바이트 길이를 더 쓰고, 수신 버퍼가 작으면 0을 돌려줍니다.
- by-value 비용은 item 크기에 비례합니다(QEMU 가상 시간: 4B 153, 1028B 6707 SysTick count).

다음 편(Part 1 마지막)에서는 **실시간성 분석**으로 Latency, Jitter, Deadline, WCET를 다룹니다.

## 실제 kernel을 사용한 host 경계 검사

다음 함수는 V11.2.0 POSIX controller task에서 실행합니다. by-value 복사, full/empty 실패와 FIFO·wraparound를 확인합니다.

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

`scripts/verify-rtos-ipc-examples.mjs`가 본문에서 추출해 실행하며, `FREERTOS_KERNEL_DIR`=V11.2.0에서 `PASS ... queue copy/FIFO/wraparound`를 출력합니다. API 계약은 [queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h), 구현은 [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c), 단일 writer/reader 제약은 [stream_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stream_buffer.h)를 기준으로 합니다. QEMU 실행(`qdemo.c`)은 FreeRTOS V11.2.0 `ARM_CM3` + `heap_4` + `stream_buffer.c`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [3-07: 큐 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
