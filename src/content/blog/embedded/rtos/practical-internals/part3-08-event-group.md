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

이번 글에서는 Event Group의 자료구조와 동작을 살펴봅니다. SetBits, WaitBits, Sync barrier까지 한꺼번에 다룹니다. 실행 결과는 FreeRTOS V11.2.0(commit `0adc196d`)을 `ARM_CM3` 포트로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 출력입니다(`arm-none-eabi-gcc` 16.2.0).

event group은 공항 출발 안내판과 비슷합니다. 안내판의 칸(bit)이 켜지면 그 칸을 보고 있던 사람은 모두 동시에 알아챕니다. 한 사람만 알아채고 나머지는 모르는 사물함 열쇠(semaphore)와는 다릅니다.

## 자료 구조

`EventBits_t`는 `TickType_t`와 같은 폭입니다. 대기 중인 task의 event list item 값(`TickType_t`)에 "어떤 bit를, 어떤 조건으로" 기다리는지를 담아 두기 때문입니다. 그래서 상위 8 bit는 control 용도로 예약됩니다. `include/event_groups.h:41-56`은 32-bit tick에서 `eventCLEAR_EVENTS_ON_EXIT_BIT 0x01000000`, `eventUNBLOCKED_DUE_TO_BIT_SET 0x02000000`, `eventWAIT_FOR_ALL_BITS 0x04000000`, 그리고 예약 영역 전체를 `eventEVENT_BITS_CONTROL_BYTES 0xff000000`으로 정의합니다. 16·64-bit tick도 같은 방식으로 상위 1 byte를 예약합니다.

같은 프로그램을 32-bit tick과 16-bit tick(`configTICK_TYPE_WIDTH_IN_BITS = TICK_TYPE_WIDTH_16_BITS`)으로 각각 빌드해 찍은 값입니다.

```text
sizeof(EventBits_t)=4, control mask 0xff000000 -> 24 user bits
sizeof(EventBits_t)=2, control mask 0x0000ff00 -> 8 user bits
```

64-bit tick은 이 Cortex-M3 포트가 지원하지 않아(`portmacro.h`의 `#error`) 돌리지 않았고, 헤더 정의상 56 bit입니다. control bit를 user flag로 넘기면 `xEventGroupSetBits()`·`xEventGroupWaitBits()`의 `configASSERT`(`event_groups.c:563`, `:328`)에 걸립니다.

## SetBits — Bit 켜기와 Wake

`xEventGroupSetBits()`(`event_groups.c:547`)는 `vTaskSuspendAll()`로 scheduler를 멈춘 뒤 bit를 OR하고, `xTasksWaitingForBits` 목록 전체를 한 번 훑습니다. 각 task의 item 값에서 control bit를 떼어 AND/OR 조건을 검사하고(`:584-587`), 만족하면 그 순간의 bits에 `eventUNBLOCKED_DUE_TO_BIT_SET`을 붙여 item에 남긴 채 깨웁니다(`:626`). clear-on-exit인 task의 대기 bit는 `uxBitsToClear`에 모아 두었다가(`:614`) 순회가 끝난 뒤 한 번에 지웁니다(`:637`).

clear를 순회 뒤로 미루기 때문에 같은 bit를 기다리던 task는 모두 깨어납니다. W1(priority 2)·W2(priority 3)가 둘 다 clear-on-exit로 bit 0을 기다리게 한 뒤 bit 0을 한 번만 켰습니다.

```text
broadcast: W1,W2 wait bit0 with clear-on-exit; set bit0 once
  SetBits returned 0x0
  W2 woke, returned 0x1, bits now 0x0
  W1 woke, returned 0x1, bits now 0x0
```

둘 다 `0x1`을 받았습니다. clear-on-exit는 token을 한 명에게만 주는 semaphore 규칙이 아닙니다. `SetBits`의 반환값이 `0x0`인 것도 눈여겨볼 만합니다. `event_groups.h:485-486`은 반환값을 "the value of the event group at the time the call to xEventGroupSetBits() returns"라고 정의합니다. 깨어난 task가 bit를 지운 뒤의 값이라, 방금 켠 bit가 반환값에 없을 수 있습니다.

## WaitBits — AND/OR/Clear-on-exit

`xEventGroupWaitBits()`(`event_groups.c:312`)는 조건이 이미 만족되면 그 시점의 bits를 반환하고, 요청에 따라 대기 bit를 지웁니다(`:353`). 만족하지 않으면 대기에 들어가고, timeout으로 깨어난 경우(`eventUNBLOCKED_DUE_TO_BIT_SET`이 없을 때, `:423`)에는 현재 bits를 다시 읽어 조건을 한 번 더 검사합니다. 반환값은 성공 여부가 아니라 bits이므로, 호출자가 기다린 조건을 반환값으로 다시 검사해야 합니다.

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

위 함수를 test task에서 그대로 호출했고 assert가 모두 통과했습니다. 마지막 두 줄이 timeout 경로입니다. 3 tick을 기다린 뒤 0을 반환했고, tick은 3 이상 흘렀습니다.

```text
check_event_contract: all asserts passed
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

`xEventGroupSync()`(`event_groups.c:185`)는 set과 wait-for-all과 clear를 scheduler를 멈춘 상태에서 한 번에 합니다. 마지막으로 도착한 task는 bit를 켜는 순간 조건이 만족되므로 기다리지 않고 대기 bit를 지웁니다(`:218`). 먼저 와 있던 task들은 `eventCLEAR_EVENTS_ON_EXIT_BIT | eventWAIT_FOR_ALL_BITS`로 등록돼 있다가(`:231`) 그때 함께 ready가 됩니다. ready가 됐다는 것은 각자 priority 순서대로 CPU를 받는다는 뜻이고, 단일 코어에서 동시에 실행된다는 뜻은 아닙니다.

## ISR-safe variant

```c
BaseType_t xEventGroupSetBitsFromISR(EventGroupHandle_t eg,
                                      EventBits_t bits,
                                      BaseType_t *pxHigherPriorityTaskWoken);
```

SetBits는 waiter 수만큼 목록을 훑으므로 ISR 안에서 하기에는 길이가 정해지지 않은 작업입니다. 그래서 `xEventGroupSetBitsFromISR()`(`event_groups.c:817`)는 bit를 직접 켜지 않고 `xTimerPendFunctionCallFromISR(vEventGroupSetBitsCallback, xEventGroup, uxBitsToSet, pxHigherPriorityTaskWoken)`(`:826`)으로 timer daemon task에 일을 넘깁니다. command queue가 가득 차면 `pdFAIL`이 돌아옵니다.

실제로 그런지 확인하려고 NVIC의 ISPR에 IRQ 5를 직접 pending시키고, 그 ISR에서 `xEventGroupSetBitsFromISR(eg, 0x4, &w)` 직후 `xEventGroupGetBitsFromISR()`로 bits를 읽었습니다. priority 5의 waiter가 bit 2를 기다리고, 제어 task는 priority 4, daemon은 priority 7입니다.

```text
FromISR: pend IRQ 5, ISR calls xEventGroupSetBitsFromISR(0x4)
  waiter got 0x4 in task context
  in ISR: pend returned 1, woken=1, bits seen inside ISR 0x0
```

ISR 안에서 읽은 bits는 `0x0`입니다. 요청만 queue에 들어갔고 아직 켜지지 않았습니다. `woken=1`은 daemon(priority 7)이 제어 task(priority 4)보다 높아서 나온 값이고, waiter를 깨웠다는 뜻이 아닙니다. ISR이 끝나자 daemon이 bit를 켜고, waiter(5)가 제어 task보다 먼저 돌아서 출력 순서가 뒤집혔습니다.

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

binary semaphore 세 개로 같은 일을 하면 세 번 take해야 하고, 순서가 정해지지 않은 event를 기다리는 동안 다른 조건이 다시 꺼졌는지 알 수 없습니다. AND wait 한 번이면 세 bit가 동시에 켜진 순간을 한 번에 받습니다. 위 코드의 `wifi_event_t`·`start_mqtt_client()`는 설명용 이름이고 특정 Wi-Fi SDK의 API가 아닙니다.

## Performance

이 글에서는 사이클을 재지 않았습니다. 이 커널을 올린 실보드가 없어서, 예전 판의 "waiter당 40 cycle"·"block+wake 200 cycle"은 출처가 없어 지웠습니다. 소스로 확인되는 것은 비용의 모양입니다. SetBits는 `vTaskSuspendAll()`과 `xTaskResumeAll()` 사이에서 waiter 목록을 한 번 훑으므로 waiter 수에 비례합니다. 이 구간은 scheduler만 멈추고 interrupt는 열어 둡니다. 단일 코어 빌드에서 깨운 task를 옮기는 `vTaskRemoveFromUnorderedEventList()`(`tasks.c:5487`)는 scheduler가 멈췄다는 assert만 하고 interrupt를 막지 않습니다. interrupt를 막는 구간은 `xTaskResumeAll()`(`tasks.c:4011`)이 pending ready list를 옮길 때의 critical section입니다.

## 자주 하는 실수

> ⚠️ 24-bit를 넘는 사용

32-bit tick 구성에서 user bits는 24개이며, 16/64-bit 구성은 각각 8/56개입니다. 실제 폭을 확인하고 EventBits_t 폭에 맞는 상수를 사용합니다.

> ⚠️ Clear-on-exit와 Wait-for-all 혼동

`xClearOnExit=pdTRUE` + `xWaitForAllBits=pdFALSE` 조합은 조건을 만족시킨 bit만이 아니라 **기다린 bit 전부**를 지웁니다. 코드가 `uxEventBits &= ~uxBitsToWaitFor`이기 때문입니다(`event_groups.c:353`). 0x3을 켜 두고 "0x3 중 아무거나"를 clear-on-exit로 기다렸습니다.

```text
clear-on-exit + wait-any clears every waited bit: set 0x3, wait any of 0x3
  returned 0x3, bits now 0x0
```

하나만 소비하려 했다면 bit 1까지 사라진 셈입니다.

> ⚠️ Polling 식 SetBits

`while(...) xEventGroupSetBits(eg, X);` 패턴은 호출마다 scheduler를 멈추고 wait list를 처음부터 훑습니다. bit가 이미 켜져 있어도 그 작업은 똑같이 합니다. *상태가 변할 때*만 호출합니다.

> ⚠️ Race — Test-and-set이 없음

```c
bits = xEventGroupGetBits(eg);
if (bits & BIT_X) {
    /* 여기서 다른 task가 clear할 수 있음 */
    do_stuff();
}
```

`xEventGroupWaitBits()`의 clear-on-exit를 쓰면 검사와 clear가 한 번에 일어나지만, 앞의 broadcast 실행처럼 여러 waiter가 같은 bit를 함께 받습니다. 한 명만 가져가야 하는 자원이면 mutex나 semaphore를 씁니다.

## 정리

- Event Group의 user bit 폭은 tick 구성에 따라 8/24/56개입니다.
- **AND / OR / Clear-on-exit** 세 조합으로 다양한 동기화 패턴을 만들 수 있습니다.
- **SetBits**는 조건을 만족한 waiter를 모두 ready로 옮기고, clear는 순회가 끝난 뒤에 합니다. 반환값은 호출이 끝날 때의 bits입니다.
- **xEventGroupSync**는 barrier 역할을 합니다. 다중 task rendezvous에 적합합니다.
- ISR에서의 set은 timer daemon에 defer되고, ISR 안에서는 아직 bit가 켜지지 않습니다.

다음 [3-09](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)는 **ISR-safe API**, 즉 *FromISR* 함수군의 내부 구현입니다.

## 근거 자료

- [FreeRTOS V11.2.0 event_groups.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/event_groups.c), [event_groups.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/event_groups.h): 폭·snapshot·clear·deferred ISR 처리. 본문 줄 번호는 이 태그 기준입니다.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
