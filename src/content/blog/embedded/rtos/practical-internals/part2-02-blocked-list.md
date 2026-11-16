---
title: "Blocked List 자료구조 — Timeout 정렬·Delta List·Two-List Scheme"
slug: "embedded/rtos/practical-internals/part2-02-blocked-list"
date: 2026-05-05T09:12:00
description: "Blocked task의 timeout 관리. Sorted list + tick wraparound 처리. FreeRTOS의 2-list scheme."
series: "Practical RTOS Internals"
seriesOrder: 12
tags: [scheduler, blocked-list, timeout, delta-list, tick-wraparound]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> Blocked list는 timeout 기준으로 정렬해 둡니다. 만료가 없으면 head를 확인하고, k개가 만료되면 최소O(k)의 해제 작업이 필요합니다. 삽입·wraparound·동시 이벤트도 별도로 다룹니다.

## 요구사항

`vTaskDelay(100)`을 호출하면 다음 동작이 필요합니다.

- Task가 Blocked list로 이동합니다.
- 100 tick이 지나면 자동으로 wake합니다.
- Tick ISR은 매 tick 이 검사를 돌리고, 그 시간은 1-10의 latency 측정에서 본 128 count처럼 모든 task의 지연에 더해집니다.

가장 단순하게는 매 tick마다 모든 blocked task의 deadline을 비교합니다. 병원 대기실에서 간호사가 매분 모든 환자의 예약 시각을 확인하는 셈이라, 비용이 blocked task 수 N에 비례해 매 tick 듭니다.

## Sorted Delta List

짧은 timeout이 앞에 오도록 정렬하고, 절대 카운터 대신 직전 노드와의 차이(delta)를 저장하는 방식입니다. FreeRTOS는 이 방식을 쓰지 않고 아래 two-list scheme에서 절대 tick을 키로 씁니다. 비교를 위해 delta list를 먼저 봅니다.

```text
Sorted by absolute timeout:
[A: 50ms]→[B: 80ms]→[C: 200ms]

Delta list (시간 변화 누적):
[A: 50ms]→[B: 30ms (=80-50)]→[C: 120ms (=200-80)]
```

만료 전에는 head의 delta만 감소시키지만, 같은 tick에 여러 노드가 만료되면 모두 처리해야 합니다. 아래는 양수 timeout만 등록하고 0 timeout은 이미 Ready로 처리했다는 설명용 모델입니다.

```c
if (head != NULL && head->delta > 0) --head->delta;
while (head != NULL && head->delta == 0) {
    wake(head);
    advance_head();
}
```

새 task가 들어올 때만 O(N)으로 위치를 찾습니다. 삽입은 task가 block할 때마다 일어나므로, 주기 task가 많은 시스템에서는 매 tick 여러 번 일어납니다. 아래 "자주 하는 실수"에서 FreeRTOS `vListInsert()`의 실제 비용을 잽니다.

## FreeRTOS — Two-List Scheme

Tick wraparound가 골치 아픈 문제입니다. 32bit tick과 1 kHz에서는 2³² ms ≈ 49.7일에 순환하고, 16bit tick(`TICK_TYPE_WIDTH_16_BITS`)이면 65.5초입니다. 지금 tick이 0xFFFFFFF0이고 32 tick 뒤에 깨워야 하면 깨어날 시각은 0x10입니다. 이 값을 그냥 정렬된 list에 넣으면 지금보다 *작은* 키라서 head에 서고, 다음 tick에 바로 만료된 것으로 보입니다. 24시간 시계에서 23시에 "2시간 뒤 알람"을 1시로 적어 두면 바로 울리는 것과 같습니다.

해결책은 list 두 개를 동시에 운영하는 것입니다. 두 list는 [`tasks.c` L476-L477](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L476-L477)에 선언되어 있고, 포인터 `pxDelayedTaskList`와 `pxOverflowDelayedTaskList`가 각각을 가리킵니다. 오늘 날짜 알람은 오늘 목록에, 자정을 넘는 알람은 내일 목록에 따로 적어 두는 방식입니다.

### Insert

아래는 `prvAddCurrentTaskToDelayedList()`([`tasks.c` L8579](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L8579))에서 `INCLUDE_vTaskSuspend == 1` 경로의 핵심입니다(L8611-L8645, coverage marker와 trace 생략).

```c
if( ( xTicksToWait == portMAX_DELAY ) && ( xCanBlockIndefinitely != pdFALSE ) )
{
    listINSERT_END( &xSuspendedTaskList, &( pxCurrentTCB->xStateListItem ) );
}
else
{
    xTimeToWake = xConstTickCount + xTicksToWait;
    listSET_LIST_ITEM_VALUE( &( pxCurrentTCB->xStateListItem ), xTimeToWake );
    if( xTimeToWake < xConstTickCount )
    {
        vListInsert( pxOverflowDelayedList, &( pxCurrentTCB->xStateListItem ) );
    }
    else
    {
        vListInsert( pxDelayedList, &( pxCurrentTCB->xStateListItem ) );
        if( xTimeToWake < xNextTaskUnblockTime )
            xNextTaskUnblockTime = xTimeToWake;
    }
}
```

덧셈 결과가 원래 값보다 작아졌다면 wrap을 넘은 것이므로 overflow list에 넣습니다. `portMAX_DELAY`로 무한 대기하면 delayed list가 아니라 suspended list로 가므로 timeout 검사 대상에서 아예 빠집니다(그래서 `eTaskGetState()`는 suspended list의 task라도 event list나 notification을 기다리면 `eBlocked`, `vTaskDelay(portMAX_DELAY)`처럼 아무것도 기다리지 않으면 `eSuspended`로 보고합니다, [`tasks.c` L2554-L2590](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L2554-L2590)).

### Tick ISR

`xTaskIncrementTick()`은 tick을 올린 뒤 값이 0이 되면 `taskSWITCH_DELAYED_LISTS()`를 부릅니다([`tasks.c` L4754](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4754)). 이 매크로(L264-L276)는 두 포인터를 맞바꾸고, 그 직전에 지금 list가 비어 있는지 `configASSERT`로 확인하며, `xNumOfOverflows`를 1 올립니다. 만료 검사 루프는 2-01에서 본 `for( ; ; )` 루프(L4767)입니다.

만료가 없는 tick에는 이 루프에 들어가지도 않습니다. `xConstTickCount >= xNextTaskUnblockTime`일 때만 들어가고, 들어가면 만료된 task 수 k만큼 반복합니다.

### QEMU에서 실제 wrap 넘기기

49.7일을 기다릴 수는 없으므로 `configINITIAL_TICK_COUNT`(기본 0, [`FreeRTOS.h` L2899-L2900](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h#L2899-L2900))를 0xFFFFFFF0으로 두고 빌드했습니다. 같은 우선순위 2의 task 셋이 tick 0xFFFFFFF0에서 각각 5, 20, 32 tick을 `vTaskDelay()`합니다.

```c title="wrap.c (발췌)"
static void sleeper(void*a){ TickType_t d=(TickType_t)(uintptr_t)a; TickType_t t0=xTaskGetTickCount(); vTaskDelay(d);
  TickType_t t1=xTaskGetTickCount(); pr("delay %2u: called at 0x%x, woke at 0x%x, elapsed %u ticks\n",(unsigned)d,(unsigned)t0,(unsigned)t1,(unsigned)(t1-t0)); done++; vTaskDelete(NULL); }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2 -DconfigINITIAL_TICK_COUNT=0xFFFFFFF0u`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

```text
delay  5: called at 0xfffffff0, woke at 0xfffffff5, elapsed 5 ticks
delay 20: called at 0xfffffff0, woke at 0x4, elapsed 20 ticks
delay 32: called at 0xfffffff0, woke at 0x10, elapsed 32 ticks
```

5 tick짜리는 wrap 전에 일반 list에서 깨어났고, 20·32 tick짜리는 overflow list에 들어갔다가 tick이 0이 되는 순간 list가 바뀐 뒤 각각 0x4, 0x10에 정확히 깨어났습니다. 세 task 모두 `t1 - t0`가 요청한 tick 수와 같았습니다. unsigned 뺄셈은 wrap을 넘어도 차이를 올바르게 계산하기 때문입니다.

## ListItem_t의 xItemValue

FreeRTOS의 list 항목은 `xItemValue`를 갖습니다. 아래는 [`list.h` L144-L153](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/list.h#L144-L153)에서 integrity check 매크로(`configUSE_LIST_DATA_INTEGRITY_CHECK_BYTES`가 1일 때만 필드가 됨)를 뺐습니다.

```c
struct xLIST_ITEM
{
    configLIST_VOLATILE TickType_t xItemValue;          /* 정렬 키. delayed list에서는 깨어날 tick */
    struct xLIST_ITEM * configLIST_VOLATILE pxNext;
    struct xLIST_ITEM * configLIST_VOLATILE pxPrevious;
    void * pvOwner;                                     /* 보통 TCB */
    struct xLIST * configLIST_VOLATILE pxContainer;     /* 지금 걸려 있는 list */
};
```

`vListInsert`는 `xItemValue`를 비교해 위치를 정합니다. 같은 값이 이미 있으면 그 뒤에 넣으므로([`list.c` L155-L156](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/list.c#L155-L156)) 같은 tick에 깨어날 task는 block한 순서대로 깨어납니다.

## End Marker — List 순회 종료

```c
/* list.h V11.2.0 L172-L179, integrity check 매크로 생략 */
typedef struct xLIST
{
    configLIST_VOLATILE UBaseType_t uxNumberOfItems;
    ListItem_t * configLIST_VOLATILE pxIndex; /* listGET_OWNER_OF_NEXT_ENTRY가 마지막으로 돌려준 item */
    MiniListItem_t xListEnd;                  /* 최대 키를 가진 끝 표시 */
} List_t;
```

`xListEnd.xItemValue = portMAX_DELAY`는 최대 정렬 키이므로 항상 list의 끝에 위치합니다. 정상 item도 `portMAX_DELAY`를 키로 가질 수 있는데, 아래 재현 예제의 마지막 검사가 이 경우에도 item이 끝 표시 앞에 들어가는 것을 확인합니다. 순회는 이 end marker에 도달하면 종료됩니다.

## Suspended List vs Blocked List

```c
List_t pxReadyTasksLists[ configMAX_PRIORITIES ];  /* L475: ready */
List_t xDelayedTaskList1, xDelayedTaskList2;       /* L476-L477: timeout 대기 */
List_t xPendingReadyList;                          /* L480: scheduler가 멈춘 동안 ready가 된 task */
List_t xTasksWaitingTermination;                   /* L484: 자기 삭제 후 idle의 정리 대기(1-02) */
List_t xSuspendedTaskList;                         /* L491: vTaskSuspend() + portMAX_DELAY 대기 */
```

줄 번호는 V11.2.0 `tasks.c`입니다. 각 **ListItem 하나**는 한 번에 하나의 list에만 연결됩니다(`pxContainer`가 하나). task에는 state/event item이 따로 있어 두 list에 동시에 연결될 수 있습니다. `xPendingReadyList`에는 `xStateListItem`이 아니라 `xEventListItem`이 걸립니다. scheduler가 멈춰 있어 state list를 건드릴 수 없으므로 event item을 빌려 씁니다(L5444). `xSuspendedTaskList`에는 `vTaskSuspend()`된 task와 `portMAX_DELAY`로 무한 대기하는 task가 함께 들어갑니다.

## Wait List — Sync Object 측

FreeRTOS semaphore는 별도 구조체 없이 queue의 `xTasksWaitingToReceive`를 wait list로 씁니다(1-07, 1-09). timeout을 걸고 semaphore를 기다리는 task는 두 개의 list에 동시에 link됩니다.

1. delayed list에 timeout 처리용으로 들어갑니다. `xStateListItem`을 통해 연결됩니다.
2. semaphore의 `xTasksWaitingToReceive`에 자원 wake용으로 들어갑니다. `xEventListItem`을 통해 연결됩니다.

자원이 release되거나 timeout이 발생하면 양쪽에서 제거된 뒤 ready list로 이동합니다.

## Timer List

`xTimerCreate()`로 생성한 software timer도 같은 two-list 구조를 따로 가집니다. `timers.c`의 `xActiveTimerList1/2`와 `pxCurrentTimerList`·`pxOverflowTimerList`가 그것이고([`timers.c` L143-L146](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/timers.c#L143-L146)), tick wrap 때 두 포인터를 바꾸는 것도 같습니다(L1108). 정렬 키는 timer의 만료 tick입니다.

Timer task는 command queue와 다음 만료 시점을 기준으로 대기하다가 만료된 timer의 callback을 호출하고, 다음 만료 시점까지 다시 잠듭니다. 자세한 구조는 [4-09](/blog/embedded/rtos/practical-internals/part4-09-software-timer)에서 봅니다.

## Scheduler Suspended 시

`vTaskSuspendAll()`을 호출한 동안에는 tick ISR이 `xTickCount`를 올리지 않고 `xPendedTicks`만 1 올립니다([`tasks.c` L4958](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4958)). 현재 task는 계속 실행하고 ISR도 허용됩니다. `xTaskResumeAll()`은 두 단계로 따라잡습니다. 아래는 [L4040-L4118](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4040-L4118)에서 coverage marker·주석·SMP 분기를 뺐습니다.

```c
while( listLIST_IS_EMPTY( &xPendingReadyList ) == pdFALSE )
{
    pxTCB = listGET_OWNER_OF_HEAD_ENTRY( ( &xPendingReadyList ) );
    listREMOVE_ITEM( &( pxTCB->xEventListItem ) );
    portMEMORY_BARRIER();
    listREMOVE_ITEM( &( pxTCB->xStateListItem ) );
    prvAddTaskToReadyList( pxTCB );
    if( pxTCB->uxPriority > pxCurrentTCB->uxPriority )
        xYieldPendings[ xCoreID ] = pdTRUE;
}
/* ... */
TickType_t xPendedCounts = xPendedTicks; /* Non-volatile copy. */
if( xPendedCounts > ( TickType_t ) 0U )
{
    do
    {
        if( xTaskIncrementTick() != pdFALSE )
            xYieldPendings[ xCoreID ] = pdTRUE;
        --xPendedCounts;
    } while( xPendedCounts > ( TickType_t ) 0U );
    xPendedTicks = 0;
}
```

먼저 멈춘 동안 ISR이 ready로 만든 task를 옮기고, 그다음 놓친 tick 수만큼 `xTaskIncrementTick()`을 다시 불러 delayed list 만료를 처리합니다. 그래서 scheduler를 오래 멈추면 resume 한 번에 여러 tick의 처리가 몰립니다.

## 메모리 효율

아래 값은 **ARM32 포인터·32bit tick·`configUSE_LIST_DATA_INTEGRITY_CHECK_BYTES` 0**인 V11.2.0 헤더를 대상으로 한 컴파일 검사의 값입니다(아래 `list-sizes.c`).

| 설정 | ListItem_t | MiniListItem_t | List_t |
| --- | ---: | ---: | ---: |
| `configUSE_MINI_LIST_ITEM=1` | 20 | 12 | 20 |
| `configUSE_MINI_LIST_ITEM=0` | 20 | 20 | 28 |

포인터와 tick이 모두 32bit라 `ListItem_t`는 5 word = 20바이트이고, `MiniListItem_t`는 `pvOwner`·`pxContainer`가 빠져 3 word = 12바이트입니다. task마다 `ListItem_t`가 둘(state, event), 우선순위마다 `List_t`가 하나 있습니다. 64bit host나 integrity bytes·16bit tick 설정에서는 값이 달라집니다.

## 자주 하는 실수

> ⚠️ Timeout을 너무 짧게 잡습니다

`vTaskDelay(0)`은 block하지 않고 `taskYIELD_WITHIN_API()`만 부르므로 yield와 같습니다([`tasks.c` L2465, L2491-L2493](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L2465)). `vTaskDelay(1)`은 다음 tick 경계에 깨어나므로, 1-04의 QEMU 실험처럼 호출 위상에 따라 0.1 tick만 쉬기도 했습니다. 1 kHz에서 "최소 1 ms"를 보장하려면 `vTaskDelay(2)`가 필요합니다.

> ⚠️ Wraparound 시점을 가정합니다

응용 코드가 절대 tick을 `if (now >= deadline)`처럼 비교하면 wrap 직후 틀립니다. 위 QEMU 실험처럼 `now - start >= timeout` 형태의 unsigned 뺄셈은 wrap을 넘어도 맞습니다. 재시도하며 남은 timeout을 계산할 때는 커널의 `vTaskSetTimeOutState()`·`xTaskCheckForTimeOut()`가 같은 일을 해 줍니다.

> ⚠️ Wait list를 peek한 뒤 그대로 사용합니다

`listGET_OWNER_OF_HEAD_ENTRY(...)`로 가져온 task가 그사이 tick ISR의 timeout 처리로 list에서 빠지면, 들고 있는 포인터는 더 이상 그 list의 head가 아닙니다. 커널이 이런 peek를 critical section이나 scheduler suspend 안에서만 하는 이유입니다.

> ⚠️ Long sorted insert를 간과합니다

`vListInsert()`는 list를 앞에서부터 훑습니다. QEMU에서 0, 10, 50, 100개 item이 있는 list의 끝에 하나를 넣는 시간을 SysTick count로 쟀습니다.

```text
vListInsert into list of   0 items: 17 SysTick counts
vListInsert into list of  10 items: 57 SysTick counts
vListInsert into list of  50 items: 217 SysTick counts
vListInsert into list of 100 items: 418 SysTick counts
```

item 하나당 약 4 count씩 선형으로 늘었습니다(icount 가상 시간, 명령 수에 비례). 이 삽입은 `prvAddCurrentTaskToDelayedList()` 안에서 scheduler를 멈춘 채 일어나므로, blocked task가 많을수록 block하는 쪽의 비용이 커집니다.

## 정리

- Blocked list는 깨어날 tick 순으로 정렬되며, `xNextTaskUnblockTime` 전에는 검사조차 하지 않습니다.
- Two-list scheme으로 tick wraparound를 처리합니다. QEMU에서 0xFFFFFFF0부터 20·32 tick을 기다린 task가 0x4·0x10에 깨어났습니다.
- `vListInsert()`는 O(N)입니다(QEMU: 100개 list에 418 count).
- `ListItem_t`의 `xItemValue`가 정렬 키(timeout)로 동작합니다.
- TCB는 state list와 event list에 동시에 link됩니다.
- sync object의 wait list도 같은 자료구조를 사용합니다.

다음 편은 scheduler 알고리즘 구현입니다. 다음 task를 선택하는 로직을 다룹니다.

## 재현 — 같은 tick 만료·wrap·헤더 크기

이 예제는 실제 list API 위에 만든 **8bit 시간 모델**입니다. 250에서 시작해 255와 wrap 후 2에 만료되는 항목을 검사하고, 같은 키의 두 항목을 같은 tick에 모두 제거합니다. 실제 커널의 32bit wrap은 앞의 QEMU 실험이 보여 줍니다.

```c title="delayed-list-check.c"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "FreeRTOS.h"
#include "list.h"
typedef struct { int id; ListItem_t item; } Entry;
int main(void) {
    List_t a, b;
    vListInitialise(&a); vListInitialise(&b);
    List_t *current = &a, *overflow = &b;
    uint8_t now = 250;
    const unsigned delays[3] = {5, 8, 8};
    Entry entries[3];
    for (unsigned i = 0; i < 3; ++i) {
        entries[i].id = (int)i;
        vListInitialiseItem(&entries[i].item);
        listSET_LIST_ITEM_OWNER(&entries[i].item, &entries[i]);
        uint8_t wake = (uint8_t)(now + delays[i]);
        listSET_LIST_ITEM_VALUE(&entries[i].item, wake);
        vListInsert(wake < now ? overflow : current, &entries[i].item);
    }
    unsigned count = 0;
    for (unsigned elapsed = 1; elapsed <= 8; ++elapsed) {
        now = (uint8_t)(now + 1);
        if (now == 0) { List_t *tmp = current; current = overflow; overflow = tmp; }
        while (!listLIST_IS_EMPTY(current) && now >= listGET_ITEM_VALUE_OF_HEAD_ENTRY(current)) {
            Entry *entry = listGET_OWNER_OF_HEAD_ENTRY(current);
            assert(entry->id == (int)count);
            assert(elapsed == (count == 0 ? 5u : 8u));
            uxListRemove(&entry->item); ++count;
        }
    }
    assert(count == 3 && listLIST_IS_EMPTY(current));
    Entry max_key;
    vListInitialiseItem(&max_key.item);
    listSET_LIST_ITEM_OWNER(&max_key.item, &max_key);
    listSET_LIST_ITEM_VALUE(&max_key.item, portMAX_DELAY);
    vListInsert(current, &max_key.item); // sentinel과 같은 최대 key의 실제 API 경계
    assert(listGET_OWNER_OF_HEAD_ENTRY(current) == &max_key);
    uxListRemove(&max_key.item);
    puts("PASS actual list API with 8-bit time model: simultaneous expiry, wrap, max key");
}
```

```c title="list-sizes.c"
#include "FreeRTOS.h"
#include "list.h"
_Static_assert(sizeof(void *) == 4 && sizeof(TickType_t) == 4, "ARM32/tick32 probe");
_Static_assert(sizeof(ListItem_t) == 20, "integrity=0 ListItem");
#if configUSE_MINI_LIST_ITEM == 1
_Static_assert(sizeof(MiniListItem_t) == 12 && sizeof(List_t) == 20, "mini sentinel");
#else
_Static_assert(sizeof(MiniListItem_t) == 20 && sizeof(List_t) == 28, "full sentinel");
#endif
char observed_list_size[sizeof(List_t)];
```

`list-sizes.c`는 integrity 검사 0·32bit tick·ARM_CM4F 조건에서 mini 0/1 두 경우를 교차 컴파일합니다. 저장소의 `scripts/verify-rtos-scheduler-list-examples.mjs`(`FREERTOS_KERNEL_DIR`=V11.2.0)가 두 파일을 본문에서 추출해 컴파일·실행하고 `PASS actual list API with 8-bit time model: simultaneous expiry, wrap, max key`를 출력합니다.

## 1차 자료와 실행 범위

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): `prvAddCurrentTaskToDelayedList`(L8579), `taskSWITCH_DELAYED_LISTS`(L264, 호출 L4754), `xTaskResumeAll`(L4040-L4118), `xPendedTicks`(L4958)
- [list.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/list.h) L144-L179, [list.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/list.c) L155-L156, [timers.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/timers.c) L143-L146

wrap과 `vListInsert` 비용은 FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 실행했습니다. count는 가상 시간이며 실제 보드의 cycle이 아닙니다.

## 관련 항목

- [2-01: Ready List 자료구조](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
