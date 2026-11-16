---
title: "Semaphore 내부 구현 추적 — Counter·Wait List·ISR-Safe Variant"
slug: "embedded/rtos/practical-internals/part3-02-semaphore-impl"
date: 2026-05-06T09:23:00
description: "FreeRTOS semaphore = Queue wrapper. Counter + priority-sorted wait list."
series: "Practical RTOS Internals"
seriesOrder: 23
tags: [semaphore, wait-list, counter, queue, isr-safe]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0**의 semaphore는 item size가 0인 Queue 구조를 사용하며 uxMessagesWaiting이 현재 count를 나타냅니다. 중요한 부분은 count 증감뿐 아니라 **count를 다시 확인하고 event list에 등록한 뒤 block하는 경계**입니다. 단순 check→unlock→block 코드로 이 계약을 대체할 수 없습니다.

## Semaphore와 Queue의 연결

같은 태그의 `semphr.h`에서 `xSemaphoreCreateBinary()`는 `xQueueGenericCreate( 1, semSEMAPHORE_QUEUE_ITEM_LENGTH, queueQUEUE_TYPE_BINARY_SEMAPHORE )`이고(L167), `xSemaphoreTake()`는 `xQueueSemaphoreTake()`(L298), `xSemaphoreGive()`는 block time `semGIVE_BLOCK_TIME`(0)의 `xQueueGenericSend()`입니다(L460). 길이가 최대 count이고 item 크기가 0인 queue라고 보면 됩니다. 손님을 받는 줄이 있는 빈 쟁반 꽂이와 같아서, 쟁반(데이터)은 없고 몇 개가 꽂혀 있는지(count)만 셉니다.

| 상태 | binary | counting |
| --- | --- | --- |
| 최대 count | 1 | 생성 시 지정 |
| 초기 count | xSemaphoreCreateBinary는 0 | 생성 시 지정 |
| take 성공 | count 감소 | count 감소 |
| give 성공 | count 증가 | count 증가 |
| 가득 찬 상태에서 give | 실패, count 유지 | 실패, count 유지 |

payload를 복사하지 않아도 Queue control block과 wait list 두 개의 관리 비용은 남습니다. 이 시리즈의 QEMU config(Cortex-M3, `configUSE_TRACE_FACILITY 1`)에서 `sizeof(StaticSemaphore_t)`는 80바이트였습니다. 1-09에서 본 `QueueDefinition`의 조건부 필드(queue set, trace)에 따라 달라집니다. waiter의 event/state list item은 TCB의 일부이므로 semaphore마다 새 ListItem을 할당하지 않습니다.

## Take — 즉시 성공과 Block 경로

`queue.c`의 `xQueueSemaphoreTake()`(L1655)는 `for( ; ; )` 반복문(L1682) 안에서 count를 검사합니다. 줄 번호는 V11.2.0 `queue.c`입니다.

| 단계 | 소스 |
| --- | --- |
| 최초 검사 | `taskENTER_CRITICAL()`(L1684) 안에서 count가 양수면 `uxMessagesWaiting`을 1 줄이고 반환(L1698) |
| 즉시 실패 | count 0이고 timeout 0이면 `errQUEUE_EMPTY`(L1741-L1750) |
| 기다릴 준비 | 첫 반복에서 `vTaskInternalSetTimeOutState()`(L1756) |
| lock | critical section을 나와 `vTaskSuspendAll()`(L1771)과 `prvLockQueue()`(L1772) |
| 재검사 | `xTaskCheckForTimeOut()`(L1775), 아직 비었는지 `prvIsQueueEmpty()`(L1781) |
| block 등록 | `vTaskPlaceOnEventList( &xTasksWaitingToReceive, ... )`(L1802) |
| 재개 | `prvUnlockQueue()`(L1803), `xTaskResumeAll()`(L1805) |
| 깨어난 뒤 | 반복문 처음으로 돌아가 count를 다시 검사 |

critical section을 나온 뒤 block 등록까지 사이에 ISR이 give하면 어떻게 될까요. 이때 queue는 lock 상태라서 `xQueueGiveFromISR()`는 count만 올리고(L1396) event list는 건드리지 않은 채 `cTxLock`만 올립니다(L1400, L1486). 뒤이어 `prvUnlockQueue()`가 `cTxLock`을 보고 방금 event list에 들어간 task를 꺼내 ready로 만듭니다(L2510, L2537). 그래서 "확인 → 등록" 사이의 give를 잃지 않습니다.

## Give와 Priority-Sorted Wait List

give는 count를 증가시키고 `xTasksWaitingToReceive`의 head task를 ready로 옮깁니다. event list는 `vListInsert()`로 priority 순 정렬되고, 같은 priority끼리는 먼저 온 순입니다(2-01). ready가 된 task는 아직 token을 가진 것이 아니라, 실행될 때 위 반복문에서 count를 다시 검사해 가져갑니다.

QEMU에서 우선순위가 다른 task 다섯을 L1(1)·M1(2)·H(3)·M2(2)·L2(1) 순으로 하나씩 block시킨 뒤, 우선순위 4의 감독 task가 token 다섯 개를 연달아 give했습니다.

```text
blocked in order L1 M1 H M2 L2 (prio 1 2 3 2 1); acquired in order: H M1 M2 L1 L2 
```

priority가 높은 H가 먼저, 같은 priority인 M1·M2와 L1·L2는 block한 순서대로 가져갔습니다. 감독 task가 give하는 동안 block하지 않았기 때문에 깨어난 순서와 획득 순서가 같았습니다. give하는 task가 중간에 양보한다면 먼저 깨어난 task보다 더 높은 task가 새로 와서 token을 가져갈 수도 있습니다.

## 작은 예제 — 초기값·포화·Timeout

다음은 **assert를 켠 test task**에서 호출하는 계약 검사입니다. NDEBUG를 정의하면 assert 안의 API 호출까지 사라지므로 그 빌드로 실행하면 안 됩니다. 이 함수를 위 QEMU 프로그램의 감독 task에서 실제 커널로 호출했고 `semaphore-contract.c passed (3 ticks incl. the 3-tick timeout)`가 나왔습니다.

```c title="semaphore-contract.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
void check_semaphore_contract(void) {
    SemaphoreHandle_t b = xSemaphoreCreateBinary();
    assert(b != NULL);
    assert(xSemaphoreTake(b, 0) == pdFALSE);
    assert(xSemaphoreGive(b) == pdTRUE);
    assert(xSemaphoreGive(b) == pdFALSE);
    assert(xSemaphoreTake(b, 0) == pdTRUE);
    vSemaphoreDelete(b);
    SemaphoreHandle_t s = xSemaphoreCreateCounting(2, 0);
    assert(s != NULL);
    assert(xSemaphoreGive(s) == pdTRUE);
    assert(xSemaphoreGive(s) == pdTRUE);
    assert(xSemaphoreGive(s) == pdFALSE);
    assert(xSemaphoreTake(s, 0) == pdTRUE);
    assert(xSemaphoreTake(s, 0) == pdTRUE);
    TickType_t start = xTaskGetTickCount();
    assert(xSemaphoreTake(s, 3) == pdFALSE);
    assert((TickType_t)(xTaskGetTickCount() - start) >= 3);
    vSemaphoreDelete(s);
}
```

3 tick은 커널 tick 기준 timeout이며, 1-04에서 본 것처럼 `vTaskDelay(1)`이 0~1 tick을 쉬듯 이 timeout도 tick 경계에서 끝납니다. 위 실행에서는 함수 전체가 3 tick 걸렸습니다.

## ISR-Safe Variant

`xSemaphoreGiveFromISR()`는 block하지 않고, count가 최대면 `errQUEUE_FULL`을 돌려줍니다(1-07의 QEMU 실험: binary에 세 번 give → 1, 0, 0). `pxHigherPriorityTaskWoken`은 호출자가 `pdFALSE`로 초기화하며, 필요할 때 `portYIELD_FROM_ISR`로 전환을 요청합니다.

```c title="semaphore-irq.c"
#include "FreeRTOS.h"
#include "semphr.h"
extern SemaphoreHandle_t event_sem;
extern void ack_event_irq(void), record_event_drop(void);
void event_irq(void) {
    BaseType_t woken = pdFALSE;
    ack_event_irq();
    if (xSemaphoreGiveFromISR(event_sem, &woken) != pdTRUE)
        record_event_drop();
    portYIELD_FROM_ISR(woken);
}
```

`record_event_drop`도 ISR 안에서 도므로 block하는 API를 부르면 안 됩니다. binary semaphore는 이미 pending인 사건을 합치므로, 사건 수가 중요하면 counting semaphore를, 사건마다 데이터가 있으면 queue를 씁니다. `xSemaphoreTakeFromISR()`도 있지만 block할 수 없고, mutex에 쓰면 holder 없는 mutex를 만듭니다(1-08의 QEMU 실험).

## Lost Wakeup 방지

문제의 핵심은 count 검사가 0인 시점과 task가 실제 대기 상태로 등록되는 사이에 give가 올 수 있다는 점입니다. 임계 구역에서 count만 읽고 mask를 푼 다음 독립적인 block 함수를 부르면, 그 사이 들어온 give는 아직 아무도 기다리지 않는 event list를 보고 끝나므로 task는 그 사건을 놓칩니다.

FreeRTOS는 이 사이를 두 장치로 막습니다. task 쪽 give는 scheduler가 멈춰 있어(`vTaskSuspendAll()`) 끼어들 수 없고, ISR 쪽 give는 queue lock 때문에 event list 대신 `cTxLock`에 흔적을 남기며, `prvUnlockQueue()`가 그 흔적을 처리합니다(위 표 아래 설명). 재검사(`prvIsQueueEmpty()`, L1781)는 lock을 건 뒤에 다시 하므로, lock 전에 들어온 give도 놓치지 않습니다.

## Mutex·다른 RTOS와의 차이

FreeRTOS semaphore에는 owner와 priority inheritance가 없습니다(1-07). mutex도 같은 Queue를 쓰지만 holder와 재귀 횟수, TCB의 보유 mutex 수와 inheritance·disinheritance 경로가 더해집니다(1-08, 3-03).

Zephyr v3.7.0의 `k_sem`도 count와 wait queue로 되어 있습니다. `z_impl_k_sem_give()`는 `z_unpend_first_thread( &sem->wait_q )`로 대기 thread가 있으면 count를 올리지 않고 그 thread에 바로 넘기고, `z_impl_k_sem_take()`는 count가 0이면 `z_pend_curr()`로 기다립니다([`kernel/sem.c` L96-L104, L132-L158](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/sem.c#L96-L158)). wait queue의 자료구조는 `CONFIG_WAITQ_SCALABLE`(red/black tree)과 `CONFIG_WAITQ_DUMB`(linked list) 중 하나를 고릅니다([`kernel/Kconfig` L360-L375](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig#L360-L375)).

## 자주 하는 실수

- **binary semaphore가 처음부터 available하다고 가정합니다.** 새 binary API의 초기 count는 0이며, 필요하면 생성 후 명시적으로 give합니다.
- **give 반환값을 무시합니다.** 포화되면 사건 수가 보존되지 않을 수 있습니다.
- **wake와 획득을 같은 단계로 봅니다.** 원본은 깨어난 뒤에도 count를 다시 검사합니다.
- **ISR에서 task API나 mutex를 사용합니다.** task API는 `configASSERT`에 걸리고(1-02), mutex의 TakeFromISR은 조용히 성공해 holder 없는 mutex를 만듭니다(1-08).
- **semaphore를 삭제하며 대기 task를 방치합니다.** `vQueueDelete()`는 대기 task를 깨우지 않고 메모리만 해제하므로, 그 task의 event list item이 해제된 메모리를 가리킵니다. 삭제 전에 모든 이용자를 먼저 정리합니다.

## 정리

- count는 uxMessagesWaiting이며 semaphore의 item size는 0입니다.
- 초기 count·최대값·포화 반환값을 확인합니다.
- block 등록에는 count 재검사·timeout·event-list 동기화가 필요합니다.
- give는 head waiter를 ready로 만들고, 그 task가 실행될 때 count를 다시 검사해 가져갑니다. QEMU에서 대기자 다섯은 priority 순, 같은 priority는 FIFO로 깨어났습니다.
- ISR give가 "확인 → block 등록" 사이에 와도 queue lock(`cTxLock`)과 `prvUnlockQueue()`가 잃지 않게 합니다.

다음 [3-03 Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)에서 Queue 구조에 owner·recursive count·priority inheritance가 어떻게 연결되는지 확인합니다.

## 근거 자료

- [FreeRTOS V11.2.0 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): 생성·take·give·ISR API 계약.
- [같은 태그 queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c): xQueueSemaphoreTake·prvLockQueue·prvUnlockQueue와 event 처리.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): event list·timeout·ready 전이.
- [Zephyr v3.7.0 kernel/sem.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/sem.c).
- QEMU 실험: `order.c` + `semaphore-contract.c`, FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
