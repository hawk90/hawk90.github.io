---
title: "Blocked List 자료구조 — Timeout 정렬·Delta List·Two-List Scheme"
date: 2026-05-05T09:12:00
description: "Blocked task의 timeout 관리. Sorted list + tick wraparound 처리. FreeRTOS의 2-list scheme."
series: "Practical RTOS Internals"
seriesOrder: 12
tags: [scheduler, blocked-list, timeout, delta-list, tick-wraparound]
draft: false
---

## 한 줄 요약

> Blocked list는 timeout 기준으로 정렬해 둡니다. 매 tick마다 head만 확인하면 되므로 O(1)로 만료된 task만 깨울 수 있습니다.

## 요구사항

`vTaskDelay(100)`을 호출하면 다음 동작이 필요합니다.

- Task가 Blocked list로 이동합니다.
- 100 tick이 지나면 자동으로 wake합니다.
- Tick ISR은 매 ms마다 검사를 돌리므로 충분히 빨라야 합니다.

가장 단순한 방법은 매 tick마다 모든 blocked task의 deadline을 비교하는 것입니다. O(N)이라 task가 많아지면 곧 한계에 부딪힙니다.

## Sorted Delta List

짧은 timeout이 앞에 오도록 정렬하고, 절대 카운터 대신 직전 노드와의 차이(delta)를 저장합니다.

```text
Sorted by absolute timeout:
[A: 50ms]→[B: 80ms]→[C: 200ms]

Delta list (시간 변화 누적):
[A: 50ms]→[B: 30ms (=80-50)]→[C: 120ms (=200-80)]
```

Tick마다 head의 delta만 1 감소시킵니다. O(1)로 끝납니다.

```c
if (head_delta-- == 0) {
    wake(head);
    advance_head();
}
```

새 task가 들어올 때만 O(N)으로 위치를 찾습니다. 임베디드에서는 추가 빈도가 낮으므로 amortized 비용이 충분히 작습니다.

## FreeRTOS — Two-List Scheme

Tick wraparound가 골치 아픈 문제입니다. uint32_t tick은 약 49일이면 한 바퀴를 돕니다. wrap 이후에는 과거의 timeout 값이 마치 expired처럼 보이게 됩니다.

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
    vListInsert(pxOverflowDelayedTaskList, &task->xStateListItem);
} else {
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

while (xTickCount >= listGET_ITEM_VALUE_OF_HEAD_ENTRY(pxDelayedTaskList)) {
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
    TickValue_t xItemValue;       // sort key — 여기에 timeout 저장
    struct ListItem *pxNext;
    struct ListItem *pxPrevious;
    void *pvOwner;                 // 일반 TCB_t*
    struct List *pxContainer;      // 현재 속한 list
} ListItem_t;
```

`vListInsert`는 `xItemValue`를 비교해 위치를 정합니다. 한 번에 O(N)이지만 task 추가 자체가 드물어서 amortized 비용은 충분히 낮습니다.

## End Marker — List 순회 종료

```c
typedef struct {
    UBaseType_t uxNumberOfItems;
    ListItem_t *pxIndex;          // 현재 순회 위치
    MiniListItem_t xListEnd;      // sentinel
} List_t;
```

`xListEnd.xItemValue = portMAX_DELAY`는 모든 정상 task보다 큰 값이므로 항상 list의 끝에 위치합니다. 순회는 이 end marker에 도달하면 종료됩니다.

## Suspended List vs Blocked List

```c
List_t xPendingReadyList;          // ISR이 wake했지만 scheduler 못 깨운 task
List_t xSuspendedTaskList;         // vTaskSuspend()된 task
List_t pxReadyTasksLists[N];        // ready
List_t xDelayedTaskList1, xDelayedTaskList2;   // blocked with timeout
```

각 list는 서로 배타적입니다. task는 한 번에 하나의 list에만 속합니다.

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

Timer task가 주기적으로 깨어나서 만료된 timer의 callback을 호출하고, 다음 만료 시점까지 다시 잠듭니다.

## Scheduler Suspended 시

`vTaskSuspendAll()`을 호출한 동안에는 tick 카운트만 진행되고 ready list로의 이동은 보류됩니다. Resume 시점에 놓친 wake를 한꺼번에 처리합니다.

```c
void vTaskSuspendAll(void) { ++uxSchedulerSuspended; }

BaseType_t xTaskResumeAll(void) {
    --uxSchedulerSuspended;
    if (uxSchedulerSuspended == 0) {
        // missed tick 보충
        while (xPendedTicks > 0) {
            xTaskIncrementTick();
            xPendedTicks--;
        }
    }
}
```

## 메모리 효율

| 자료구조 | 메모리 |
| --- | --- |
| `List_t` | 20 byte (Cortex-M) |
| `ListItem_t` | 24 byte |
| `MiniListItem_t` (sentinel) | 16 byte |

task 10개에 sync object 5개를 잡아도 list 인프라가 차지하는 메모리는 약 500 byte 정도입니다. 임베디드 환경에서도 부담이 작은 수준입니다.

## 자주 하는 실수

> ⚠️ Timeout을 너무 짧게 잡습니다

`vTaskDelay(0)`은 yield와 같은 의미입니다. `vTaskDelay(1)`은 1 tick 뒤에 wake되는데, 실제 시간은 tick rate에 따라 달라집니다. 1 kHz면 1 ms, 100 Hz면 10 ms입니다.

> ⚠️ Wraparound 시점을 가정합니다

uptime이 49일을 넘기면 wraparound가 발생합니다. `xTickCount + delay` 형태의 상대 timeout만 사용하고, 절대 시점끼리의 비교는 피해야 합니다.

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

## 관련 항목

- [2-01: Ready List 자료구조](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
