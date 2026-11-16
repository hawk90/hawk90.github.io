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

이 글은 FreeRTOS V11.2.0(commit `0adc196d`) `queue.c`를 기준으로 Queue의 내부 구조를 따라가 봅니다. Ring buffer, 두 wait list, ISR-safe 처리까지 한 번에 다룹니다. 본문의 실행 결과는 모두 같은 커널을 `ARM_CM3` 포트로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 출력입니다(`arm-none-eabi-gcc` 16.2.0, `heap_4.c`).

queue는 우체국 사서함 줄과 비슷합니다. 칸 수(`uxLength`)와 칸 크기(`uxItemSize`)가 처음에 정해지고, 편지를 넣는 사람과 꺼내는 사람이 각자 줄을 섭니다. 칸이 다 차면 넣으려는 사람이, 비면 꺼내려는 사람이 기다립니다.

## Queue Structure

`Queue_t`(struct tag `QueueDefinition`, `queue.c:103-140`)에서 핵심 필드만 역할별로 보면 다음과 같습니다. 표에 없는 필드(queue set 포인터, trace 번호, static 할당 표시 등)는 `configUSE_QUEUE_SETS`·`configUSE_TRACE_FACILITY` 같은 설정에 따라 붙습니다.

| 필드 | 역할 |
| --- | --- |
| pcHead·pcWriteTo | 저장소 시작·다음 복사 위치 |
| u.xQueue.pcTail·pcReadFrom | ring 끝 다음 byte·**마지막으로 읽은** 위치 (`queue.c:68-72`) |
| u.xSemaphore | 같은 union을 semaphore/mutex 상태로 사용 |
| xTasksWaitingToSend·Receive | 공간·데이터를 기다리는 task, priority 순 정렬 (`queue.c:114-115`) |
| uxMessagesWaiting·uxLength·uxItemSize | 현재 항목 수·최대 항목 수·항목 byte 수 |
| cRxLock·cTxLock | queue가 lock된 동안 제거·추가된 항목 수. unlocked는 `-1`, locked는 `0`부터 (`queue.c:52-53`, `121-122`) |

## Send 흐름

`xQueueGenericSend()`는 공간이 있으면 critical section 안에서 `prvCopyDataToQueue()`로 복사하고, receiver가 기다리고 있으면 깨웁니다. 공간이 없으면 timeout 0일 때 바로 `errQUEUE_FULL`을 돌려주고, 아니면 scheduler를 멈추고 queue를 lock한 채 timeout을 다시 확인한 뒤 `xTasksWaitingToSend`에 들어갑니다. 깨어나면 처음부터 다시 공간을 확인하는 루프입니다. 그래서 깨어났다는 사실만으로 성공을 반환하지 않습니다.

`queueOVERWRITE`는 길이 1인 mailbox용입니다. `prvCopyDataToQueue()`(`queue.c:2393`)의 overwrite 분기는 `uxMessagesWaiting > 0`이면 먼저 1을 빼고, 함수 끝에서 공통으로 1을 더합니다. 그래서 비어 있을 때는 count가 1이 되고, 차 있을 때는 1을 유지한 채 payload만 바뀝니다.

## Ring Buffer Wrap

wrap은 나머지 연산이 아니라 포인터 비교로 처리합니다. 경로마다 방향이 다릅니다.

| 경로 | 복사 위치 | 이동과 wrap (`queue.c`) |
| --- | --- | --- |
| send to back | `pcWriteTo` | `+= uxItemSize`, `>= pcTail`이면 `pcHead`로 |
| send to front·overwrite | `pcReadFrom` | `-= uxItemSize`, `< pcHead`이면 `pcTail - uxItemSize`로 |
| receive | 먼저 이동한 `pcReadFrom` | `+= uxItemSize`, `>= pcTail`이면 `pcHead`로 (`prvCopyDataFromQueue()`, `:2476`) |

send-to-front가 `pcReadFrom` 자리에 바로 쓸 수 있는 이유는 `pcReadFrom`이 "다음에 읽을 곳"이 아니라 "마지막으로 읽은 곳"을 가리키기 때문입니다. 다음 receive가 한 칸 전진해서 읽으므로, 그 자리에 쓰고 한 칸 물러나면 맨 앞에 끼운 셈이 됩니다.

다음은 assert가 켜진 test task에서 원본 API의 copy·front·wrap·mailbox 경계를 확인하는 예제입니다. 동적 allocation을 쓰고 NDEBUG는 정의하지 않습니다.

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

이 함수를 그대로 test task에서 호출했고, assert 17개가 모두 통과했습니다. `a = 99`로 바꾼 뒤 받은 값이 1이라는 점이 "포인터가 아니라 값을 복사한다"는 증거입니다.

```text
check_queue_contract: all asserts passed
```

## Receive — 대칭 구조

`xQueueReceive()`는 데이터가 있으면 복사하고 count를 줄인 뒤, `xTasksWaitingToSend`에 task가 있으면 그중 맨 앞을 ready로 옮깁니다. 비어 있으면 send와 같은 lock·timeout 재검사 루프를 거쳐 `xTasksWaitingToReceive`에 들어갑니다.

두 wait list는 priority 순입니다. `vTaskPlaceOnEventList()`(`tasks.c:5296`)가 `vListInsert()`(`:5317`)로 넣는데, event list item 값이 `configMAX_PRIORITIES - priority`라서 높은 priority가 앞에 섭니다. 먼저 줄 선 순서는 같은 priority끼리만 의미가 있습니다. R1(priority 1)을 먼저 block시키고 R3(priority 3)를 나중에 block시킨 뒤 항목을 하나씩 보냈습니다.

```text
wake order: R1(prio1) blocks first, then R3(prio3); send 1 item
  R3 (prio 3) received 42
  R1 (prio 1) received 43
```

## cRxLock·cTxLock — ISR Safety

task 쪽 send/receive는 block 준비를 하는 동안 scheduler만 멈추고 interrupt는 열어 둡니다. 그 사이 ISR이 같은 queue에 넣거나 빼면, payload와 count는 바뀌어도 event list는 건드리면 안 됩니다. 이때 쓰는 것이 lock count입니다. 은행 창구가 잠시 "정리 중" 팻말을 걸어 두면 손님(ISR)은 서류만 놓고 가고, 창구 직원이 팻말을 내릴 때 놓인 서류 수만큼 처리하는 식입니다.

`xQueueGenericSendFromISR()`(`queue.c:1160`)는 `cTxLock == queueUNLOCKED`이면 그 자리에서 receiver를 깨웁니다(`:1217`). lock 중이면 `prvIncrementQueueTxLock()`으로 count만 올립니다(`:1313`). 나중에 task가 `prvUnlockQueue()`(`:2497`)를 부르면 그 count만큼 `xTasksWaitingToReceive`를 처리합니다. 그러니 "ISR은 절대 task list를 수정하지 않는다"는 설명은 틀립니다. lock이 안 걸린 queue라면 ISR 안에서 event list를 직접 고칩니다.

## Generic Send — xCopyPosition

```c
queueSEND_TO_BACK    // 일반 FIFO
queueSEND_TO_FRONT   // LIFO 동작
queueOVERWRITE       // Mailbox (1 slot, 덮어쓰기)
```

`include/queue.h:68-70`에 정의된 값은 각각 0·1·2입니다. `xQueueSend()`, `xQueueSendToFront()`, `xQueueOverwrite()`는 모두 `xQueueGenericSend()`에 이 값만 달리 넘기는 매크로입니다.

## Performance

이 글에서는 사이클을 재지 않았습니다. 이 커널을 올린 실보드가 없고, QEMU의 시간은 실리콘의 시간이 아니기 때문입니다. 그래서 예전 판의 "30+itemSize/4 cycle"과 "0.2 µs"는 출처가 없어 지웠습니다. 소스로 확인되는 사실은 복사가 `memcpy()` 한 번(`uxItemSize` byte)이고, 이 복사가 critical section 안에서 일어난다는 점입니다. 큰 구조체를 값으로 넣으면 그만큼 interrupt mask 구간이 길어지므로, 큰 payload는 포인터를 넣는 편이 낫습니다.

## Stream Buffer — Byte 단위

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);
xStreamBufferSend(sb, data, len, timeout);
```

가변 길이 byte stream을 다룹니다. `include/message_buffer.h:38-49`의 NOTE는 stream buffer와 그 위에 만든 message buffer가 "FreeRTOS 객체 중 유일하게" writer 하나, reader 하나를 가정한다고 적습니다. writer나 reader가 여럿이면 application이 호출을 직렬화해야 합니다.

## Message Buffer — 가변 길이

```c
xMessageBufferSend(mb, msg, msg_len, timeout);
```

각 message 앞에 `configMESSAGE_BUFFER_LENGTH_TYPE`(기본 `size_t`, `include/FreeRTOS.h:2867`) 크기의 길이 필드가 붙습니다. 64 byte message buffer에 10 byte를 넣고 빈 공간을 찍으면 14 byte가 줄어 있습니다. 받을 버퍼가 message보다 작으면 0을 반환하고 message는 그대로 남습니다(`message_buffer.h:541-542`).

```text
message buffer 64 bytes: free=64
after 10-byte message: free=50 (sizeof(configMESSAGE_BUFFER_LENGTH_TYPE)=4)
receive into 4-byte buffer -> 0 bytes (message stays)
receive into 16-byte buffer -> 10 bytes
```

## 자주 하는 실수

> ⚠️ Item size mismatch

queue는 생성 시 정한 `uxItemSize` byte만 복사하고, 넘긴 포인터가 가리키는 객체의 크기는 모릅니다. 4 byte queue에 8 byte 구조체를 보내면 경고도 없이 앞 4 byte만 갑니다.

```text
item size mismatch is not detected: queue item 4 bytes, send from 8-byte struct
  received 7 (b=8 dropped)
```

반대로 source나 destination이 `uxItemSize`보다 작으면 `memcpy()`가 그 범위를 넘어 읽거나 씁니다. 양쪽 항목 크기를 같은 타입으로 맞춥니다.

> ⚠️ Static 잘못 사용

Static queue도 *storage buffer를 별도로 할당*해야 합니다. `xQueueCreateStatic`을 씁니다.

> ⚠️ Pointer queue 후 free

수신자가 read하기 전에 sender가 free하면 dangling pointer가 됩니다.포인터를 보낸 뒤에는 그 버퍼의 소유권이 수신자에게 넘어갔다고 정하고, 수신자가 처리한 뒤 반납하는 규칙을 둡니다.

> ⚠️ Queue 크기 underestimate

burst가 `uxLength`를 넘으면 timeout 0 send는 `errQUEUE_FULL`을 돌려주고 항목은 버려집니다. `uxQueueMessagesWaiting()`이나 `uxQueueSpacesAvailable()`을 주기적으로 기록해 최대 점유를 확인하고 길이를 정합니다.

## 정리

- Queue는 **Ring buffer와 2개의 wait list** 조합입니다.
- **uxMessagesWaiting**이 상태를 표현하고, **pcWriteTo·pcReadFrom**이 ring 내 위치를 관리합니다.
- **cTxLock·cRxLock**은 queue가 lock된 동안 ISR이 한 일을 세어 두었다가 unlock 때 처리하게 합니다.
- wait list는 priority 순이라 먼저 기다린 task가 아니라 높은 priority task가 먼저 깨어납니다.
- Send to front, overwrite variant가 있고, 항목은 항상 값으로 복사됩니다(`queue.h:446`). 큰 데이터는 포인터를 값으로 넣습니다.

다음 [3-08](/blog/embedded/rtos/practical-internals/part3-08-event-group)은 **Event Group**입니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c), [queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): 구조·copy·overwrite·timeout·lock 처리. 본문 줄 번호는 이 태그 기준입니다.
- [message_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/message_buffer.h), [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): writer/reader 가정, event list 정렬.

## 관련 항목

- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-08: Event Group 구현](/blog/embedded/rtos/practical-internals/part3-08-event-group)
