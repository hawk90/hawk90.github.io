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
- Tick ISR은 설정한 tick 간격마다 검사를 돌리므로 충분히 빨라야 합니다.

가장 단순한 방법은 매 tick마다 모든 blocked task의 deadline을 비교하는 것입니다. O(N)이라 task가 많아지면 곧 한계에 부딪힙니다.

## Sorted Delta List

짧은 timeout이 앞에 오도록 정렬하고, 절대 카운터 대신 직전 노드와의 차이(delta)를 저장합니다.

```text
Sorted by absolute timeout:
[A: 50ms]→[B: 80ms]→[C: 200ms]

Delta list (시간 변화 누적):
[A: 50ms]→[B: 30ms (=80-50)]→[C: 120ms (=200-80)]
```

만료 전에는 head의 delta만 감소시키지만, 같은 tick에 여러 노드가 만료되면 모두 처리해야 합니다. 아래는 양수 timeout만 등록하고0 timeout은 이미 Ready로 처리했다는 설명용 모델입니다.

```c
if (head != NULL && head->delta > 0) --head->delta;
while (head != NULL && head->delta == 0) {
    wake(head);
    advance_head();
}
```

새 task가 들어올 때만 O(N)으로 위치를 찾습니다. 추가 빈도와 최악 길이를 실제 워크로드에서 검토해야 합니다. 임베디드라는 이유로 삽입이 드물다고 가정하지 않습니다.

## FreeRTOS — Two-List Scheme

Tick wraparound가 골치 아픈 문제입니다. 32bit tick과1kHz라는 조건에서는 약49.7일에 순환합니다. tick 폭과주파수가 다르면 시간이 달라집니다. wrap 이후에는 과거의 timeout 값이 마치 expired처럼 보이게 됩니다.

해결책은 list 두 개를 동시에 운영하는 것입니다.

```c
List_t xDelayedTaskList1;       // 현재 tick wrap 전
List_t xDelayedTaskList2;       // 다음 wrap 후
List_t *pxDelayedTaskList = &xDelayedTaskList1;
List_t *pxOverflowDelayedTaskList = &xDelayedTaskList2;
```

### Insert

```c
xTimeToWake = xTickCount + xTicksToDelay;
if (xTimeToWake < xTickCount) {     // overflow!
    listSET_LIST_ITEM_VALUE(&task->xStateListItem, xTimeToWake);
    vListInsert(pxOverflowDelayedTaskList, &task->xStateListItem);
} else {
    listSET_LIST_ITEM_VALUE(&task->xStateListItem, xTimeToWake);
    vListInsert(pxDelayedTaskList, &task->xStateListItem);
}
```

overflow가 발생할 timeout은 overflow list로 넣어 두고, wraparound 시점에 두 list를 swap합니다.

### Tick ISR

```c
xTickCount++;
if (xTickCount == 0) {              // wraparound
    swap(pxDelayedTaskList, pxOverflowDelayedTaskList);
}

while (!listLIST_IS_EMPTY(pxDelayedTaskList) &&
       xTickCount >= listGET_ITEM_VALUE_OF_HEAD_ENTRY(pxDelayedTaskList)) {
    TCB_t *task = listGET_OWNER_OF_HEAD_ENTRY(pxDelayedTaskList);
    uxListRemove(&task->xStateListItem);
    move_to_ready(task);
}
```

sorted list와 매 tick head 확인의 조합입니다. 보통은 O(1)이고, 같은 tick에 여러 개가 만료될 때만 만료 개수에 비례합니다.

## ListItem_t의 xItemValue

FreeRTOS의 list 항목은 `xItemValue`를 갖습니다.

```c
typedef struct ListItem {
    TickType_t xItemValue;       // sort key — 여기에 timeout 저장
    struct ListItem *pxNext;
    struct ListItem *pxPrevious;
    void *pvOwner;                 // 일반 TCB_t*
    struct List *pxContainer;      // 현재 속한 list
} ListItem_t;
```

`vListInsert`는 `xItemValue`를 비교해 위치를 정합니다. 한 번에 O(N)이지만 삽입 길이와 빈도에 따른 최악 비용을 따로 분석해야 합니다.

## End Marker — List 순회 종료

```c
typedef struct {
    UBaseType_t uxNumberOfItems;
    ListItem_t *pxIndex;          // 현재 순회 위치
    MiniListItem_t xListEnd;      // sentinel
} List_t;
```

`xListEnd.xItemValue = portMAX_DELAY`는 최대 정렬 키이므로(정상 item의 키와 같을 수도 있음) 항상 list의 끝에 위치합니다. 순회는 이 end marker에 도달하면 종료됩니다.

## Suspended List vs Blocked List

```c
List_t xPendingReadyList;          // ISR이 wake했지만 scheduler 못 깨운 task
List_t xSuspendedTaskList;         // vTaskSuspend()된 task
List_t pxReadyTasksLists[N];        // ready
List_t xDelayedTaskList1, xDelayedTaskList2;   // blocked with timeout
```

각 **ListItem 하나**는 한 번에 하나의 list에만 연결됩니다. task에는 state/event item이 따로 있어 두 list에 동시에 연결될 수 있습니다. `xPendingReadyList`는 scheduler 재개까지 event item을 보관하는 경로도 포함합니다. `xSuspendedTaskList`의 내부 사용과 명시적인 suspended 상태도 동일시하지 않습니다.

## Wait List — Sync Object 측

```c
typedef struct Semaphore {
    int count;
    List_t xTasksWaitingToTake;    // 자원 대기 task들
} Semaphore_t;
```

자원 부족으로 blocked된 task는 두 개의 list에 동시에 link됩니다.

1. `xDelayedTaskList`에 timeout 처리용으로 들어갑니다. `xStateListItem`을 통해 연결됩니다.
2. `xTasksWaitingToTake`에 자원 wake용으로 들어갑니다. `xEventListItem`을 통해 연결됩니다.

자원이 release되거나 timeout이 발생하면 양쪽에서 제거된 뒤 ready list로 이동합니다.

## Timer List

`xTimerCreate()`로 생성한 software timer도 별도의 list(`pxCurrentTimerList`)를 사용합니다. 정렬 방식은 동일합니다.

Timer task는 timer command와다음만료시점을기준으로대기하다가 만료된 timer의 callback을 호출하고, 다음 만료 시점까지 다시 잠듭니다.

## Scheduler Suspended 시

`vTaskSuspendAll()`을 호출한 동안에는 V11.2.0의 tick ISR은 `xPendedTicks`를 누적하는 경로를 사용하며 `xTickCount` 갱신과 정상 만료 처리를 재개 때 따라잡습니다. 현재 task는 계속 실행하고 ISR도 허용됩니다. Resume 시점에 놓친 wake를 한꺼번에 처리합니다.

```c
void vTaskSuspendAll(void) { ++uxSchedulerSuspended; }

BaseType_t xTaskResumeAll(void) {
    --uxSchedulerSuspended;
    if (uxSchedulerSuspended == 0) {
        // 설명용 골격: 실제 구현은 pending-ready event/state 제거도 먼저 처리
        // missed tick 보충
        while (xPendedTicks > 0) {
            xTaskIncrementTick();
            xPendedTicks--;
        }
    }
}
```

## 메모리 효율

고정된“TCB당24바이트”같은 수치를 일반화하지 않습니다. 아래 값은 **ARM32 포인터·32bit tick·integrity검사0**인 V11.2.0 헤더를 대상으로 한 컴파일 검사의 조건부 값입니다.

| 설정 | ListItem_t | MiniListItem_t | List_t |
| --- | ---: | ---: | ---: |
| `configUSE_MINI_LIST_ITEM=1` | 20 | 12 | 20 |
| `configUSE_MINI_LIST_ITEM=0` | 20 | 20 | 28 |

64bit host나 integrity bytes·tick 폭이 다른 설정에서는 달라집니다. list 수와 item을 소유한task/object 수를 세어야 총량을 구할 수 있습니다.

## 자주 하는 실수

> ⚠️ Timeout을 너무 짧게 잡습니다

`vTaskDelay(0)`은 yield와 같은 의미입니다. `vTaskDelay(1)`은 1 tick 뒤에 wake되는데, 실제 시간은 tick rate에 따라 달라집니다. 1kHz tick 구간은1ms,100Hz는10ms지만, 호출→다음tick의위상과Ready→실행지연때문에그길이의정확한wall-time대기는아닙니다.

> ⚠️ Wraparound 시점을 가정합니다

순환 시간은 tick 폭과 주파수로 계산합니다. 임의의절대tick비교나단순덧셈만으로안전해지지않습니다. 커널의상대timeout/API와wrap처리계약을따르고,지원가능한delay범위·재시도시남은timeout을확인합니다.

> ⚠️ Wait list를 peek한 뒤 그대로 사용합니다

`listGET_OWNER_OF_HEAD_ENTRY(...)`로 가져온 task가 timeout으로 제거되면 포인터가 stale 상태가 됩니다. 반드시 critical section 안에서 다뤄야 합니다.

> ⚠️ Long sorted insert를 간과합니다

100개 이상의 task가 동시에 blocked 상태이면서 매번 새 task가 추가되면 add마다 O(N) 비용이 나옵니다. 드문 상황이지만 고우선·고빈도 timeout을 사용할 때는 주의가 필요합니다.

## 정리

- Blocked list는 timeout 기준으로 정렬되며, tick마다 head만 확인합니다.
- Two-list scheme으로 tick wraparound를 안전하게 처리합니다.
- `ListItem_t`의 `xItemValue`가 정렬 키(timeout)로 동작합니다.
- TCB는 state list와 event list에 동시에 link됩니다.
- sync object의 wait list도 같은 자료구조를 사용합니다.

다음 편은 scheduler 알고리즘 구현입니다. 다음 task를 선택하는 로직을 다룹니다.

## 재현 — 같은 tick 만료·wrap·헤더 크기

이 예제는 실제 list API 위에 만든 **8bit 시간 모델**입니다. kernel의 실제 tick 폭이나 IRQ 처리가 아닙니다.250에서시작해255와wrap후2에만료되는항목을검사하고,같은키의두항목을같은tick에모두제거합니다.

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

`list-sizes.c`는integrity검사0·32bit tick·ARM_CM4F조건에서mini0/1두경우를교차컴파일합니다. runtime메모리총량이나모든설정의크기보장은아닙니다.

## 1차 자료와 실행 범위

[FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)의`prvAddCurrentTaskToDelayedList`·`xTaskIncrementTick`·`xTaskResumeAll`과[list.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/list.h)를고정해대조합니다. 위kernel조각은수정포인트를설명하는골격이며전체lock·timeout·event처리를구현한독립커널이아닙니다. 아래실험은실제list API와축소된8bit시간모델,ARM헤더크기검사범위입니다. 실제kernel의49.7일uptime이나최악tick ISR을실행측정하지않습니다.

## 관련 항목

- [2-01: Ready List 자료구조](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
