---
title: "2-02: Blocked List 자료구조 — Timeout 정렬, Delta List, Two-List Scheme"
date: 2026-05-12T12:00:00
description: "Blocked task의 timeout 관리. Sorted list + tick wraparound 처리. FreeRTOS의 2-list scheme."
series: "Practical RTOS Internals"
seriesOrder: 12
tags: [scheduler, blocked-list, timeout, delta-list, tick-wraparound]
draft: true
---

## 한 줄 요약

> **"Tick마다 expired task만 깨움"** — Blocked list는 *sorted timeout*. 매 tick O(1) 확인.

## 요구사항

`vTaskDelay(100)` 호출 시:
- Task가 *Blocked list*에 들어감
- *100 tick 후* 자동 wake
- Tick ISR은 *매 ms 검사* — 빨라야

Naive 방법 — 매 tick에 *모든 blocked task의 deadline 비교*. O(N) per tick. **느림**.

## Sorted Delta List

**짧은 timeout 우선 정렬** + *증가 카운터 대신 delta 저장*.

```text
Sorted by absolute timeout:
[A: 50ms]→[B: 80ms]→[C: 200ms]

Delta list (시간 변화 누적):
[A: 50ms]→[B: 30ms (=80-50)]→[C: 120ms (=200-80)]
```

**Tick 시 head의 delta만 -1**. O(1).

```c
if (head_delta-- == 0) {
    wake(head);
    advance_head();
}
```

뉴 task가 추가될 때만 O(N)으로 위치 찾음. 임베디드에선 *추가는 드물어* 효율적.

## FreeRTOS — Two-List Scheme

**Tick wraparound** 문제 — uint32_t tick이 ~49일 만에 wrap. Wrap 후 *과거 timeout 같이 expired처럼 보임*.

해결 — *2개 list 동시 운영*:

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

Overflow timeout은 *overflow list*에. Wraparound 시점에 *swap*.

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

**Sorted list** + 매 tick *head 확인*. O(1) (보통) / O(expired count) (다중 expire).

## ListItem_t의 xItemValue

FreeRTOS의 list 항목은 *xItemValue* 보유:

```c
typedef struct ListItem {
    TickValue_t xItemValue;       // sort key — 여기에 timeout 저장
    struct ListItem *pxNext;
    struct ListItem *pxPrevious;
    void *pvOwner;                 // 일반 TCB_t*
    struct List *pxContainer;      // 현재 속한 list
} ListItem_t;
```

Sorted insert (`vListInsert`)가 *xItemValue 비교*로 위치 결정. O(N) but task 추가가 드물어 amortized OK.

## End Marker — List 순회 종료

```c
typedef struct {
    UBaseType_t uxNumberOfItems;
    ListItem_t *pxIndex;          // 현재 순회 위치
    MiniListItem_t xListEnd;      // sentinel
} List_t;
```

`xListEnd.xItemValue = portMAX_DELAY` — 모든 정상 task보다 큰 값. *항상 list 끝*. 순회 시 *end marker 도달*로 종료 판정.

## Suspended List vs Blocked List

```c
List_t xPendingReadyList;          // ISR이 wake했지만 scheduler 못 깨운 task
List_t xSuspendedTaskList;         // vTaskSuspend()된 task
List_t pxReadyTasksLists[N];        // ready
List_t xDelayedTaskList1, xDelayedTaskList2;   // blocked with timeout
```

각 list가 *서로 배타적* — task는 *한 번에 한 list에만*.

## Wait List — Sync Object 측

```c
typedef struct Semaphore {
    int count;
    List_t xTasksWaitingToTake;    // 자원 대기 task들
} Semaphore_t;
```

자원 부족으로 blocked한 task는 *3 list에 동시 link*:
1. `xDelayedTaskList` — timeout 처리용 (`xStateListItem` 통해)
2. `xTasksWaitingToTake` — 자원 wake용 (`xEventListItem` 통해)
3. (없음) — 이미 ready 아님

자원이 release 되거나 timeout 시 → 둘 다에서 제거 → ready list로.

## Timer List

`xTimerCreate()`로 만든 software timer도 *별도 list* — `pxCurrentTimerList`. 같은 sorted pattern.

Timer task가 *주기적으로 wake* → expired timer callback 호출 → 다음 expiration까지 다시 sleep.

## Scheduler Suspended 시

`vTaskSuspendAll()` 호출 후엔 *tick 진행만 카운트*, ready list로 *이동 안 함*. Resume 시 *모든 missed wake 한 번에 처리*.

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

10 task + 5 sync object = ~500 byte for list infrastructure. 임베디드에 부담 적음.

## 자주 하는 실수

> ⚠️ Timeout이 너무 짧음

`vTaskDelay(0)`은 yield와 동의어. `vTaskDelay(1)`이 *1 tick 후 wake* — tick rate에 의존 (1 kHz면 1 ms, 100 Hz면 10 ms).

> ⚠️ Wraparound 시점 가정

49 day-uptime 시 wraparound. *상대적 timeout*만 사용 (`xTickCount + delay`), 절대 시점 비교 금지.

> ⚠️ Wait list peek 후 사용

`listGET_OWNER_OF_HEAD_ENTRY(...)` 후 *task가 timeout으로 제거*되면 stale pointer. Critical section 안에서 처리.

> ⚠️ Long sorted insert

100+ task가 동시 blocked + 매번 새 task add → 매 add마다 O(N). 드물지만 *고우선·고빈도 timeout* 사용 시 주의.

## 정리

- Blocked list = **timeout-sorted**, tick마다 *head 확인*.
- **Two-list scheme**으로 tick wraparound 안전 처리.
- ListItem_t의 *xItemValue*가 sort key (timeout).
- TCB가 *동시 2 list에 link* — state list + event list.
- Sync object의 wait list도 같은 자료구조.

다음 편은 **Scheduler 알고리즘 구현** — 다음 task 선택 로직.

## 관련 항목

- [2-01: Ready List 자료구조](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
