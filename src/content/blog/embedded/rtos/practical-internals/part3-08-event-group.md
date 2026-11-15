---
title: "Event Group 분석 — Bit Flag·AND/OR Wait·Sync Barrier"
slug: "embedded/rtos/practical-internals/part3-08-event-group"
date: 2026-05-06T09:29:00
description: "FreeRTOS V11.2.0의 tick 폭에 따른 event bits, AND·OR·clear-on-exit·broadcast와 timer daemon으로 미루는 ISR 요청을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 29
tags: [event-group, bit-flag, and-or, sync-barrier]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0** Event Group은 bit 상태와 wait list를 사용합니다. 여러 task의 조건을 한 set 동작에서 만족시킬 수 있지만, ready 전이와 CPU에서의 동시 실행은 다른 의미입니다.

이번 글에서는 Event Group의 자료구조와 동작을 살펴봅니다. SetBits, WaitBits, Sync barrier까지 한꺼번에 다룹니다.

## 자료 구조

EventBits_t는 TickType_t와 연결됩니다. V11.2.0은 상위 8개 bit를 control 용도로 예약하므로 16/32/64-bit tick 구성의 user bit 수는 각각 **8/24/56**입니다. 이 값은 configTICK_TYPE_WIDTH_IN_BITS와 해당 태그 event_groups.h로 확인합니다.

내부 EventGroup_t에는 현재 event bits와 대기 task 목록, config별 관리 필드가 있습니다. application은 control bit를 user flag로 사용하면 안 됩니다.

## SetBits — Bit 켜기와 Wake

xEventGroupSetBits는 bit를 OR한 뒤 기다리는 task를 순회합니다. 각 task의 AND/OR 조건과 clear-on-exit flag를 해석하고, 조건을 만족하면 관찰 snapshot을 event item에 저장해 task를 unblock합니다. clear 대상 bits는 누적하여 순회 뒤 적용합니다.

따라서 동일 bit를 기다리는 여러 task가 모두 깨어날 수 있습니다. clear-on-exit는 token을 단 하나의 consumer에게 독점 배분하는 mutex/semaphore 규칙이 아닙니다. task가 실제 실행할 때의 현재 bits와 반환된 snapshot도 구분해야 합니다.

## WaitBits — AND/OR/Clear-on-exit

즉시 만족하면 검사 시점 snapshot을 반환하고 요청에 따라 bits를 clear합니다. 불만족이면 timeout에 따라 대기하며, timeout 후에도 실제 bits를 재확인하는 경로가 있습니다. 반환값이 success bool인 것처럼 해석하지 말고 기다린 조건을 다시 검사합니다.

다음은 assert가 켜진 test task용 계약 검사입니다. 동적 allocation과 event-group 지원을 전제로 합니다.

```c title="event-contract.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "task.h"
#include "event_groups.h"
void check_event_contract(void) {
    EventGroupHandle_t e = xEventGroupCreate(); assert(e != NULL);
    assert(xEventGroupSetBits(e, 1) == 1);
    assert(xEventGroupWaitBits(e, 3, pdFALSE, pdTRUE, 0) == 1);
    assert(xEventGroupWaitBits(e, 3, pdTRUE, pdFALSE, 0) == 1);
    assert(xEventGroupGetBits(e) == 0);
    assert(xEventGroupSetBits(e, 3) == 3);
    assert(xEventGroupWaitBits(e, 3, pdTRUE, pdTRUE, 0) == 3);
    assert(xEventGroupGetBits(e) == 0);
    TickType_t start = xTaskGetTickCount();
    assert(xEventGroupWaitBits(e, 1, pdFALSE, pdTRUE, 3) == 0);
    assert((TickType_t)(xTaskGetTickCount() - start) >= 3);
    vEventGroupDelete(e);
}
```

## Sync Barrier — Rendezvous Pattern

```c
EventBits_t xEventGroupSync(EventGroupHandle_t xEventGroup,
                             const EventBits_t uxBitsToSet,
                             const EventBits_t uxBitsToWaitFor,
                             TickType_t xTicksToWait);

/* 사용 예 — 3 task barrier */
#define TASK_A_DONE  (1 << 0)
#define TASK_B_DONE  (1 << 1)
#define TASK_C_DONE  (1 << 2)
#define ALL_DONE     (TASK_A_DONE | TASK_B_DONE | TASK_C_DONE)

void task_a(void *p) {
    /* ... work ... */
    xEventGroupSync(eg, TASK_A_DONE, ALL_DONE, portMAX_DELAY);
    /* 셋 다 도착해야 여기에 도달 */
}
```

*Set과 Wait, Auto-clear*가 원자적으로 묶여 있습니다. 모든 참여 bit가 모이면 조건을 만족한 task들이 ready가 됩니다. timeout·task 삭제·여러 세대의 barrier 재사용 계약을 함께 확인해야 하며, 동시에 실행된다는 뜻은 아닙니다.

## ISR-safe variant

```c
BaseType_t xEventGroupSetBitsFromISR(EventGroupHandle_t eg,
                                      EventBits_t bits,
                                      BaseType_t *pxHigherPriorityTaskWoken);
```

ISR에서 *task를 깨우는 작업*은 **timer service task에 defer**됩니다. daemon task가 실제 set 처리를 맡습니다. 이렇게 해야 ISR이 짧게 유지됩니다.

처리 흐름은 두 단계로 나뉩니다. 먼저 ISR이 `xTimerPendFunctionCallFromISR(set_bits_fn, eg, bits)`로 실제 작업을 예약합니다. 그러면 daemon task가 요청을 받아 실제 set 동작을 수행합니다. command queue가 가득 차면 요청이 실패할 수 있으므로 반환값을 확인합니다. woken은 이 deferred command에 따른 daemon wake와 관련되며 최종 waiter 전원이 즉시 실행됐다는 뜻이 아닙니다.

## 사용 예 — Wi-Fi 연결 상태 머신

```c
#define BIT_CONNECTED   (1 << 0)
#define BIT_GOT_IP      (1 << 1)
#define BIT_DNS_READY   (1 << 2)
#define BIT_ALL_READY   (BIT_CONNECTED | BIT_GOT_IP | BIT_DNS_READY)

void wifi_event_handler(wifi_event_t e) {
    if (e == WIFI_CONNECTED)
        xEventGroupSetBits(net_eg, BIT_CONNECTED);
    if (e == WIFI_GOT_IP)
        xEventGroupSetBits(net_eg, BIT_GOT_IP);
    if (e == WIFI_DNS_READY)
        xEventGroupSetBits(net_eg, BIT_DNS_READY);
}

void app_task(void *p) {
    /* 세 조건이 모두 만족될 때까지 대기 */
    xEventGroupWaitBits(net_eg, BIT_ALL_READY,
        pdFALSE, pdTRUE /* AND */, portMAX_DELAY);
    
    start_mqtt_client();
}
```

여러 event에 의존하는 task를 동기화할 때 *binary semaphore를 3개* 두는 것보다 훨씬 깔끔합니다.

## Performance

SetBits는 waiter를 순회하므로 대기 수와 조건·trace·port 경로에 영향을 받습니다. 출처 없는 waiter당 40 cycle이나 block+wake 200 cycle 표를 실측으로 사용하지 않습니다. scheduler suspend를 사용해도 내부 kernel 경로의 interrupt mask까지 전혀 없다는 보장은 아닙니다.

## 자주 하는 실수

> ⚠️ 24-bit를 넘는 사용

32-bit tick 구성에서 user bits는 24개이며, 16/64-bit 구성은 각각 8/56개입니다. 실제 폭을 확인하고 EventBits_t 폭에 맞는 상수를 사용합니다.

> ⚠️ Clear-on-exit와 Wait-for-all 혼동

`xClearOnExit=pdTRUE` + `xWaitForAllBits=pdFALSE` 조합은 *wait한 모든 bit를 clear*합니다(현재 set된 bit만이 아닙니다). 의도와 다른 동작이 자주 일어나는 지점입니다.

> ⚠️ Polling 식 SetBits

`while(...) xEventGroupSetBits(eg, X);` 패턴은 wait list를 매번 walk해 CPU를 낭비합니다. *상태가 변할 때*만 호출합니다.

> ⚠️ Race — Test-and-set이 없음

```c
bits = xEventGroupGetBits(eg);
if (bits & BIT_X) {
    /* 여기서 다른 task가 clear할 수 있음 */
    do_stuff();
}
```

wait와 clear를 kernel API에 맡길 수 있지만 broadcast 규칙 때문에 자원의 단일 소비까지 보장하지는 않습니다. 독점 획득이면 mutex·semaphore 등 목적에 맞는 객체를 선택합니다.

## 정리

- Event Group의 user bit 폭은 tick 구성에 따라 8/24/56개입니다.
- **AND / OR / Clear-on-exit** 세 조합으로 다양한 동기화 패턴을 만들 수 있습니다.
- **SetBits**는 조건을 만족한 여러 waiter를 ready로 옮길 수 있습니다.
- **xEventGroupSync**는 barrier 역할을 합니다. 다중 task rendezvous에 적합합니다.
- ISR에서의 set은 *daemon task에 defer*됩니다.

다음 편은 **ISR-safe API**, 즉 *FromISR* 함수군의 내부 구현입니다.

## 근거 자료

- [FreeRTOS V11.2.0 event_groups.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/event_groups.c), [event_groups.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/event_groups.h): 폭·snapshot·clear·deferred ISR 처리.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
