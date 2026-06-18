---
title: "Event Group 분석 — Bit Flag·AND/OR Wait·Sync Barrier"
date: 2026-05-06T09:29:00
description: "FreeRTOS Event Group — 24-bit flag, AND·OR semantics, clear-on-exit, multi-task sync."
series: "Practical RTOS Internals"
seriesOrder: 29
tags: [event-group, bit-flag, and-or, sync-barrier]
draft: false
---

## 한 줄 요약

> **"Event Group은 24-bit flag와 wait list로 구성된다"** — *여러 task를 한 번에 wake*할 수 있다는 점이 핵심입니다.

이번 글에서는 Event Group의 자료구조와 동작을 살펴봅니다. SetBits, WaitBits, Sync barrier까지 한꺼번에 다룹니다.

## 자료 구조

```c
typedef struct EventGroupDef_t {
    EventBits_t uxEventBits;          // 24-bit flag (8 bits = control)
    List_t xTasksWaitingForBits;      // 대기 task list
    
    UBaseType_t uxEventGroupNumber;   // debug
    uint8_t ucStaticallyAllocated;
} EventGroup_t;

typedef uint32_t EventBits_t;
#define eventEVENT_BITS_CONTROL_BYTES  0xff000000UL   // 상위 8-bit 예약
```

24-bit는 사용자 flag로 쓰이고, 나머지는 컨트롤 비트(clear-on-exit, wait-for-all, unblocked)로 예약돼 있습니다.

## SetBits — Bit 켜기와 Wake

```c
EventBits_t xEventGroupSetBits(EventGroupHandle_t xEventGroup,
                                const EventBits_t uxBitsToSet) {
    EventBits_t uxBitsToClear = 0;
    BaseType_t xMatchFound = pdFALSE;
    
    vTaskSuspendAll();
    {
        ListItem_t *pxListItem = listGET_HEAD_ENTRY(&xEventGroup->xTasksWaitingForBits);
        
        eventGroup->uxEventBits |= uxBitsToSet;
        
        /* 대기 task 순회 — 조건 만족 시 wake */
        while (pxListItem != listGET_END_MARKER(&xEventGroup->xTasksWaitingForBits)) {
            EventBits_t uxBitsWaitedFor = listGET_LIST_ITEM_VALUE(pxListItem);
            EventBits_t uxControlBits = uxBitsWaitedFor & eventEVENT_BITS_CONTROL_BYTES;
            uxBitsWaitedFor &= ~eventEVENT_BITS_CONTROL_BYTES;
            
            if ((uxControlBits & eventWAIT_FOR_ALL_BITS) == 0) {
                /* OR — 하나라도 match */
                if ((uxBitsWaitedFor & xEventGroup->uxEventBits) != 0) {
                    xMatchFound = pdTRUE;
                }
            } else {
                /* AND — 모두 match */
                if ((uxBitsWaitedFor & xEventGroup->uxEventBits) == uxBitsWaitedFor) {
                    xMatchFound = pdTRUE;
                }
            }
            
            if (xMatchFound) {
                if (uxControlBits & eventCLEAR_EVENTS_ON_EXIT_BIT) {
                    uxBitsToClear |= uxBitsWaitedFor;
                }
                vTaskRemoveFromUnorderedEventList(pxListItem,
                    xEventGroup->uxEventBits | eventUNBLOCKED_DUE_TO_BIT_SET);
            }
            pxListItem = pxNext;
            xMatchFound = pdFALSE;
        }
        
        /* Clear-on-exit 누적 적용 */
        xEventGroup->uxEventBits &= ~uxBitsToClear;
    }
    xTaskResumeAll();
    
    return xEventGroup->uxEventBits;
}
```

핵심은 *모든 대기 task를 순회하면서 조건을 만족하는 task를 모두 wake*한다는 점입니다. Queue나 Mutex와 다른 부분이 바로 여기입니다.

## WaitBits — AND/OR/Clear-on-exit

```c
EventBits_t xEventGroupWaitBits(EventGroupHandle_t xEventGroup,
                                 const EventBits_t uxBitsToWaitFor,
                                 const BaseType_t xClearOnExit,
                                 const BaseType_t xWaitForAllBits,
                                 TickType_t xTicksToWait) {
    EventBits_t uxReturn;
    
    vTaskSuspendAll();
    {
        EventBits_t uxCurrentEventBits = xEventGroup->uxEventBits;
        
        /* 즉시 만족하는가? */
        if (xWaitForAllBits == pdFALSE) {
            /* OR */
            if ((uxCurrentEventBits & uxBitsToWaitFor) != 0) {
                uxReturn = uxCurrentEventBits;
                if (xClearOnExit) {
                    xEventGroup->uxEventBits &= ~uxBitsToWaitFor;
                }
                xTaskResumeAll();
                return uxReturn;
            }
        } else {
            /* AND */
            if ((uxCurrentEventBits & uxBitsToWaitFor) == uxBitsToWaitFor) {
                uxReturn = uxCurrentEventBits;
                if (xClearOnExit) {
                    xEventGroup->uxEventBits &= ~uxBitsToWaitFor;
                }
                xTaskResumeAll();
                return uxReturn;
            }
        }
        
        /* 만족하지 않음 — block */
        if (xTicksToWait != 0) {
            EventBits_t uxControlBits = 0;
            if (xClearOnExit) uxControlBits |= eventCLEAR_EVENTS_ON_EXIT_BIT;
            if (xWaitForAllBits) uxControlBits |= eventWAIT_FOR_ALL_BITS;
            
            vTaskPlaceOnUnorderedEventList(&xEventGroup->xTasksWaitingForBits,
                uxBitsToWaitFor | uxControlBits, xTicksToWait);
        }
    }
    xTaskResumeAll();
    portYIELD_WITHIN_API();
    
    /* Wake 후 — list item value에 결과가 인코딩돼 있음 */
    uxReturn = uxTaskResetEventItemValue();
    return uxReturn & ~eventEVENT_BITS_CONTROL_BYTES;
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

*Set과 Wait, Auto-clear*가 원자적으로 묶여 있습니다. 3개 task가 모두 도착하면 세 task가 동시에 wake됩니다.

## ISR-safe variant

```c
BaseType_t xEventGroupSetBitsFromISR(EventGroupHandle_t eg,
                                      EventBits_t bits,
                                      BaseType_t *pxHigherPriorityTaskWoken);
```

ISR에서 *task를 깨우는 작업*은 **timer service task에 defer**됩니다. daemon task가 실제 set 처리를 맡습니다. 이렇게 해야 ISR이 짧게 유지됩니다.

```text
ISR → xTimerPendFunctionCallFromISR(set_bits_fn, eg, bits)
        → Daemon task가 깨어나 실제 SetBits 호출
```

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

```text
SetBits: 
- vTaskSuspendAll: 5 cycle
- iterate wait list: 30 cycle × N waiters
- match check: 10 cycle × N
- portYIELD_WITHIN_API: 50 cycle
Total ≈ 60 + N × 40 cycle

WaitBits (즉시 만족): 30 cycle
WaitBits (block + wake): ~200 cycle
```

Critical section 대신 *scheduler suspend*를 사용하므로 ISR 잠금이 발생하지 않습니다.

## 자주 하는 실수

> ⚠️ 24-bit를 넘는 사용

`(1 << 24)` 이상은 컨트롤 비트와 충돌합니다. `configUSE_16_BIT_TICKS=1` 환경에서는 *8-bit*만 가능합니다.

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

`xEventGroupWaitBits + ClearOnExit`로 원자성을 확보하는 것이 안전합니다.

## 정리

- Event Group은 **24-bit flag와 wait list** 조합입니다.
- **AND / OR / Clear-on-exit** 세 조합으로 다양한 동기화 패턴을 만들 수 있습니다.
- **SetBits**는 모든 대기 task를 동시에 wake합니다(queue/mutex와 다른 점입니다).
- **xEventGroupSync**는 barrier 역할을 합니다. 다중 task rendezvous에 적합합니다.
- ISR에서의 set은 *daemon task에 defer*됩니다.

다음 편은 **ISR-safe API**, 즉 *FromISR* 함수군의 내부 구현입니다.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
