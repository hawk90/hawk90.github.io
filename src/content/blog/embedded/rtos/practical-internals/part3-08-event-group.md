---
title: "3-08: Event Group — Bit Flag·AND/OR Wait·Sync Barrier"
date: 2026-05-13T05:00:00
description: "FreeRTOS Event Group — 24-bit flag, AND·OR semantics, clear-on-exit, multi-task sync."
series: "Practical RTOS Internals"
seriesOrder: 29
tags: [event-group, bit-flag, and-or, sync-barrier]
draft: true
---

## 한 줄 요약

> **"Event Group = 24-bit flag + wait list"** — *여러 task 한 번에 wake* 가능한 게 핵심.

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

24-bit user flag — 그 외 컨트롤 비트 (clear-on-exit, wait-for-all, unblocked).

## SetBits — Bit 켜기 + Wake

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

핵심 — *모든 대기 task* 순회하며 조건 만족하는 *모두* wake. Queue/Mutex와 다른 점.

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
        
        /* 즉시 만족? */
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
        
        /* 만족 안 — block */
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
    
    /* Wake 후 — list item value에 결과 인코딩 */
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
    /* 셋 다 도착해야 여기 */
}
```

*Set + Wait + Auto-clear* 원자적. 3 task 모두 도착하면 셋 다 wake.

## ISR-safe variant

```c
BaseType_t xEventGroupSetBitsFromISR(EventGroupHandle_t eg,
                                      EventBits_t bits,
                                      BaseType_t *pxHigherPriorityTaskWoken);
```

ISR에서 *task 깨우는 작업*은 **timer service task에 defer** — daemon task가 set 처리. ISR 길이 짧게 유지.

```text
ISR → xTimerPendFunctionCallFromISR(set_bits_fn, eg, bits)
        → Daemon task가 깨어나서 실제 SetBits 호출
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
    /* 세 가지 모두 만족할 때까지 */
    xEventGroupWaitBits(net_eg, BIT_ALL_READY,
        pdFALSE, pdTRUE /* AND */, portMAX_DELAY);
    
    start_mqtt_client();
}
```

Multi-event 의존 task 동기화 — *binary semaphore 3 개*보다 깔끔.

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

Critical section 대신 *scheduler suspend* 사용 — ISR 잠금 없음.

## 자주 하는 실수

> ⚠️ 24-bit 초과 사용

`(1 << 24)` 이상 → 컨트롤 비트와 충돌. `configUSE_16_BIT_TICKS=1` 시 *8-bit*만 가능.

> ⚠️ Clear-on-exit·Wait-for-all 혼동

`xClearOnExit=pdTRUE` + `xWaitForAllBits=pdFALSE` — *wait한 모든 bit clear* (현재 set bit만 아님). 의도와 다른 동작.

> ⚠️ Polling 식 SetBits

`while(...) xEventGroupSetBits(eg, X);` — wait list 매번 walk → CPU 낭비. *상태 변화 시*만.

> ⚠️ Race — Test-and-set 없음

```c
bits = xEventGroupGetBits(eg);
if (bits & BIT_X) {
    /* 여기서 다른 task가 clear할 수 있음 */
    do_stuff();
}
```

`xEventGroupWaitBits + ClearOnExit`로 원자성.

## 정리

- Event Group = **24-bit flag + wait list**.
- **AND / OR / Clear-on-exit** 세 조합으로 다양한 동기화.
- **SetBits** = 모든 대기 task 동시 wake (queue/mutex와 다른 점).
- **xEventGroupSync** = barrier — 다중 task rendezvous.
- ISR set은 *daemon task에 defer*.

다음 편은 **ISR-safe API** — *FromISR* 함수군 내부.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
