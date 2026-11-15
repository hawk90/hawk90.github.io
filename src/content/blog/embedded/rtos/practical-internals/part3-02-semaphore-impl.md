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

같은 태그의 semphr.h에서 xSemaphoreCreateBinary는 길이 1·item size 0의 queue 생성을 사용하고, xSemaphoreTake는 xQueueSemaphoreTake로 연결됩니다. xSemaphoreGive는 block time 0으로 queue send 경로를 사용합니다. counting semaphore는 최대 count와 초기 count를 별도로 지정합니다.

| 상태 | binary | counting |
| --- | --- | --- |
| 최대 count | 1 | 생성 시 지정 |
| 초기 count | xSemaphoreCreateBinary는 0 | 생성 시 지정 |
| take 성공 | count 감소 | count 감소 |
| give 성공 | count 증가 | count 증가 |
| 가득 찬 상태에서 give | 실패, count 유지 | 실패, count 유지 |

payload를 복사하지 않아도 Queue control block과 wait list 등의 관리 비용은 남습니다. 고정 80 byte라고 가정하지 않으며 ABI·config·trace·allocation 설정으로 실제 sizeof를 확인해야 합니다. waiter의 event/state list item은 TCB의 일부이므로 semaphore마다 새 ListItem을 할당한다고 계산하지 않습니다.

## Take — 즉시 성공과 Block 경로

queue.c의 xQueueSemaphoreTake는 반복문 안에서 count를 검사합니다. count가 양수면 감소시키고 성공하며, 0이고 wait time도 0이면 실패합니다. 기다릴 수 있으면 timeout 상태와 queue/event-list 동기화 경로를 거칩니다.

| 경계 | V11.2.0 소스에서 확인할 동작 |
| --- | --- |
| 최초 검사 | task critical 안에서 count 확인 |
| 기다릴 준비 | timeout 상태 설정 후 scheduler suspend·queue lock |
| 재검사 | 남은 timeout과 queue empty 상태 확인 |
| block 등록 | vTaskPlaceOnEventList로 event wait와 timeout 경로 연결 |
| 재개 | queue unlock·scheduler resume 후 필요 시 yield |
| 깨어난 뒤 | 반복문에서 count를 다시 검사하여 획득 또는 timeout 결정 |

실제 코드는 queue lock의 deferred event 처리를 포함합니다. ISR이 그 사이 count를 바꿨다는 사실을 놓치지 않도록 재검사와 unlock 경로가 연결됩니다. 깨어났다는 이유만으로 무조건 pdPASS를 반환하거나 event item을 두 번 등록하는 축약 구현은 원본과 다릅니다.

## Give와 Priority-Sorted Wait List

give는 count를 증가시키고 필요하면 기다리는 task를 ready로 옮깁니다. 통상 event list는 높은 task priority가 먼저 오도록 정렬됩니다. 이는 waiter가 ready가 되는 순서와 관련되며, ready가 됐다는 사실이 이미 token을 소유했거나 즉시 CPU를 받았다는 뜻은 아닙니다.

동일 priority의 순서도 priority 변경·timeout·재시도·다른 실행 주체가 있는 전체 프로그램의 공정성 보장으로 확대하지 않습니다. 누가 먼저 획득했는지 확인하려면 blocked 상태와 give 시점·실제 take 성공을 함께 기록해야 합니다.

## 작은 예제 — 초기값·포화·Timeout

다음은 **assert를 켠 test task**에서 호출하는 계약 검사입니다. 동적 allocation과 counting semaphore가 활성화된 FreeRTOS V11.2.0을 전제로 하며, 생산 코드의 오류 처리 전체를 대신하지 않습니다. NDEBUG를 정의해 assert 내부 호출이 사라지는 빌드로 실행하면 안 됩니다.

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

3 tick은 커널 tick 기준 timeout이며 정확한 wall-clock 지연이나 복귀 상한이 아닙니다. counter가 다시 채워지는 경쟁이 없는 이 테스트와 달리, 실제 프로그램은 wake 원인·count 재검사·scheduler 지연이 함께 작용합니다.

## ISR-Safe Variant

xSemaphoreGiveFromISR는 block하지 않고 count 포화 시 실패할 수 있습니다. pxHigherPriorityTaskWoken은 호출자가 pdFALSE로 초기화하며, 필요할 때 portYIELD_FROM_ISR로 전환을 요청합니다. 아래 코드는 실제 peripheral ACK와 허용 IRQ priority·유효한 semaphore를 외부 통합이 제공해야 합니다.

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

record_event_drop도 ISR-safe이며 짧고 block하지 않아야 합니다. binary semaphore는 이미 pending인 사건을 누적 보존하지 못하므로 사건 수가 중요하면 count 한계나 queue·다른 전달 방식을 검토합니다. xSemaphoreTakeFromISR도 있지만 block할 수 없고 mutex에는 사용할 수 없습니다.

## Lost Wakeup 방지

문제의 핵심은 count 검사가 0인 시점과 task가 실제 대기 상태로 등록되는 사이에 give가 올 수 있다는 점입니다. 임계 구역에서 count만 읽고 mask를 푼 다음 독립적인 block 함수를 부르면, 그 사이 전달된 사건을 기다리는 task가 영원히 못 볼 수 있습니다.

원본은 scheduler suspend·queue lock·empty 재검사·event list·deferred unlock 처리를 조합합니다. 단순 critical pair 하나만 보여 주고 race가 해결됐다고 선언하지 않습니다. SMP와 ISR 동기화의 자세한 동작은 해당 포트와 config로 확인합니다.

## Mutex·다른 RTOS와의 차이

semaphore에는 일반적으로 task owner와 priority inheritance 계약이 없습니다. mutex도 Queue를 재사용하지만 owner와 보유 mutex 수, inheritance·disinheritance 경로가 추가됩니다. ISR 신호 전달과 task 소유 자원 보호는 서로 다른 용도입니다.

Zephyr k_sem도 count와 wait queue를 사용하지만 내부 구조·wait-queue backend·선택 정책은 버전과 Kconfig에 따라 확인해야 합니다. FreeRTOS 구조나 특정 linked-list 구현을 그대로 대입하지 않습니다. 이 장의 소스 추적과 실행 예제는 FreeRTOS V11.2.0 범위입니다.

## 자주 하는 실수

- **binary semaphore가 처음부터 available하다고 가정합니다.** 새 binary API의 초기 count는 0이며, 필요하면 생성 후 명시적으로 give합니다.
- **give 반환값을 무시합니다.** 포화되면 사건 수가 보존되지 않을 수 있습니다.
- **wake와 획득을 같은 단계로 봅니다.** 원본은 깨어난 뒤에도 count를 다시 검사합니다.
- **ISR에서 task API나 mutex를 사용합니다.** 지원되는 FromISR API·priority·즉시 반환 계약을 확인합니다.
- **semaphore를 삭제하며 대기 task를 방치합니다.** 객체 수명과 모든 이용자의 종료를 먼저 조정해야 합니다.

## 정리

- count는 uxMessagesWaiting이며 semaphore의 item size는 0입니다.
- 초기 count·최대값·포화 반환값을 확인합니다.
- block 등록에는 count 재검사·timeout·event-list 동기화가 필요합니다.
- give는 ready 전이를 유도하지만 token 획득과 즉시 실행까지 보장하지 않습니다.
- ISR에는 지원 priority와 FromISR API·객체 수명 계약이 필요합니다.

다음 [3-03 Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)에서 Queue 구조에 owner·recursive count·priority inheritance가 어떻게 연결되는지 확인합니다.

## 근거 자료

- [FreeRTOS V11.2.0 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): 생성·take·give·ISR API 계약.
- [같은 태그 queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c): xQueueSemaphoreTake·prvLockQueue·prvUnlockQueue와 event 처리.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): event list·timeout·ready 전이.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
