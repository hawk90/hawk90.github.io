---
title: "Queue 내부 구현 추적 — Ring Buffer·2 Wait Lists·Atomic Send/Receive"
slug: "embedded/rtos/practical-internals/part3-07-queue-impl"
date: 2026-05-06T09:28:00
description: "FreeRTOS Queue 코드 — pcWriteTo·pcReadFrom·uxMessagesWaiting + xTasksWaitingToSend/Receive."
series: "Practical RTOS Internals"
seriesOrder: 28
tags: [queue, ring-buffer, wait-list, atomic]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"Queue는 Ring buffer와 2개의 wait list로 구성된다"** — Send와 Receive 양쪽 모두 blocking이 가능합니다.

이 글은 FreeRTOS V11.2.0 queue.c를 기준으로 Queue의 내부 구조를 따라가 봅니다. Ring buffer, 두 wait list, ISR-safe 처리까지 한 번에 다룹니다.

## Queue Structure

Queue_t의 선택된 필드를 역할별로 보면 다음과 같습니다. ABI·config에 따라 선택 필드가 달라지므로 아래 표를 완전한 구조체 정의나 고정 sizeof로 사용하지 않습니다.

| 필드 | 역할 |
| --- | --- |
| pcHead·pcWriteTo | 저장소 시작·다음 복사 위치 |
| u.xQueue.pcTail·pcReadFrom | ring 끝·이전 읽기 위치 |
| u.xSemaphore | 같은 union을 semaphore/mutex 상태로 사용 |
| xTasksWaitingToSend·Receive | 공간·데이터를 기다리는 task |
| uxMessagesWaiting·uxLength·uxItemSize | 현재 항목 수·최대 항목 수·항목 byte 수 |
| cRxLock·cTxLock | queue lock 중 제거·추가된 항목의 deferred event 처리 |

## Send 흐름

xQueueGenericSend는 공간 확인·항목 복사·receiver wake뿐 아니라 timeout, scheduler suspend, queue lock과 재검사를 처리합니다. full 상태의 timeout 0 요청은 실패하며, 기다린 뒤 깨어났다는 사실만으로 send 성공을 반환하지 않습니다.

queueOverwrite는 길이 1인 mailbox용입니다. 비어 있을 때는 count가 1이 되고, 이미 채워져 있으면 count 1을 유지하며 payload를 교체합니다. 원본의 이 구분을 생략하면 첫 overwrite가 receive되지 않는 잘못된 모델을 만들게 됩니다.

## Ring Buffer Wrap

일반 queue는 고정 크기 항목을 복사하며 pcWriteTo가 끝에 닿으면 시작으로 돌아갑니다. receive의 read pointer와 send-to-front 경로도 각각 wrap을 처리합니다. memcpy 한 번과 나머지 연산 하나만으로 전체 send/receive를 구현할 수는 없습니다.

다음은 **assert가 켜진 test task**에서 원본 API의 copy·front·wrap·mailbox 경계를 확인하는 예제입니다. 동적 allocation을 지원하고 NDEBUG는 정의하지 않습니다.

```c title="queue-contract.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "queue.h"
void check_queue_contract(void) {
    QueueHandle_t q = xQueueCreate(2, sizeof(int));
    assert(q != NULL);
    int a = 1, b = 2, c = 3, out = 0;
    assert(xQueueSend(q, &a, 0) == pdTRUE); a = 99;
    assert(xQueueSend(q, &b, 0) == pdTRUE);
    assert(xQueueSend(q, &c, 0) == pdFALSE);
    assert(xQueueReceive(q, &out, 0) == pdTRUE && out == 1);
    assert(xQueueSend(q, &c, 0) == pdTRUE);
    assert(xQueueReceive(q, &out, 0) == pdTRUE && out == 2);
    assert(xQueueSendToFront(q, &a, 0) == pdTRUE);
    assert(xQueueReceive(q, &out, 0) == pdTRUE && out == 99);
    assert(xQueueReceive(q, &out, 0) == pdTRUE && out == 3);
    assert(xQueueReceive(q, &out, 0) == pdFALSE);
    vQueueDelete(q);
    q = xQueueCreate(1, sizeof(int)); assert(q != NULL);
    assert(xQueueOverwrite(q, &a) == pdTRUE);
    assert(uxQueueMessagesWaiting(q) == 1);
    assert(xQueueOverwrite(q, &b) == pdTRUE);
    assert(uxQueueMessagesWaiting(q) == 1);
    assert(xQueueReceive(q, &out, 0) == pdTRUE && out == 2);
    vQueueDelete(q);
}
```

## Receive — 대칭 구조

xQueueReceive는 데이터가 있으면 복사하고 count를 감소시킨 뒤 필요한 sender를 ready로 옮깁니다. empty 상태에서 기다릴 때는 timeout과 queue-lock 재검사 경로를 거칩니다. event-list 등록·yield·복귀 후 재시도를 원본 소스와 함께 추적해야 합니다.

## cRxLock·cTxLock — ISR Safety

cRxLock은 lock 중 제거된 항목, cTxLock은 추가된 항목에 관한 count입니다. -1은 unlocked이고 0은 locked이지만 아직 변경이 없는 상태입니다. 이 lock은 ISR이 payload에 접근하는 것을 전부 막는 하드웨어 lock과 다릅니다.

FromISR 경로도 허용 priority의 interrupt mask 아래에서 event list를 직접 처리할 수 있습니다. queue가 lock되어 있으면 event-list 처리를 미루기 위한 count를 기록하고 prvUnlockQueue에서 필요한 wake 처리를 수행합니다. “ISR은 절대 task list를 수정하지 않는다”는 설명은 원본과 다릅니다.

## Generic Send — xCopyPosition

```c
queueSEND_TO_BACK    // 일반 FIFO
queueSEND_TO_FRONT   // LIFO 동작
queueOVERWRITE       // Mailbox (1 slot, 덮어쓰기)
```

다양한 동작이 *같은 API에 인자만 다르게* 들어가 표현됩니다.

## Performance

항목 복사 크기·memory 배치·waiter·timeout·port yield·trace hook에 따라 비용이 달라집니다. 30+itemSize/4 cycle이라는 출처 없는 식이나 0.2 µs를 실측으로 제시하지 않습니다. 실제 compiler·config·보드·반복 측정과 실패 경로를 함께 기록해야 합니다.

## Stream Buffer — Byte 단위

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
```

가변 길이 byte stream을 다룹니다. 기본 계약은 single writer·single reader입니다. 내부 critical·notification 경로가 있으므로 queue와 달리 무조건 lock-free라고 설명하지 않습니다.

## Message Buffer — 가변 길이

```c
xMessageBufferSend(mb, msg, msg_len, timeout);
```

각 message에 *length prefix*가 붙어, 수신 시 정확한 size를 알 수 있습니다.

## 자주 하는 실수

> ⚠️ Item size mismatch

queue는 생성 시 정한 byte 수를 복사합니다. 더 큰 struct를 보내면 일부만 전달될 수 있고, 더 작은 source/destination이면 범위를 벗어난 접근이 생길 수 있습니다. 양쪽 항목 크기를 맞춥니다.

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

## 근거 자료

- [FreeRTOS V11.2.0 queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c), [queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): 구조·copy·overwrite·timeout·lock 처리.

## 관련 항목

- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-08: Event Group 구현](/blog/embedded/rtos/practical-internals/part3-08-event-group)
