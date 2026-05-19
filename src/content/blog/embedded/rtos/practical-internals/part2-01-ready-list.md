---
title: "2-01: Ready List 자료구조 — Linked List, Bitmap, O(1) Scheduler"
date: 2026-05-12T11:00:00
description: "Ready 상태 task를 보관하는 자료구조 선택이 곧 스케줄러 latency를 결정합니다. FreeRTOS의 array-of-lists, bitmap + CLZ 최적화, uC/OS의 8×8 LUT까지 한 번에 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 11
tags: [scheduler, ready-list, bitmap, linked-list, o1]
---

## 한 줄 요약

> **"Ready list는 스케줄러의 거의 전부"** — 다음에 실행할 task를 얼마나 빨리 찾느냐가 곧 RTOS의 latency 한계입니다.

## 스케줄러가 푸는 문제

매 tick마다, 매 system call마다, 매 ISR-exit마다 스케줄러가 같은 질문을 던집니다.

> **"지금 ready 상태인 task 중 가장 높은 priority는 누구인가?"**

이 질문에 대한 답이 일정한 시간 안에 나오지 않으면 RTOS의 *determinism*은 무너집니다. 그래서 ready list 자료구조는 다음 세 조건을 모두 만족해야 합니다.

- 다음 task 찾기가 **O(1) 또는 O(log N)**
- task 삽입·삭제도 **O(1)**
- 임베디드답게 **메모리가 작아야** 함

이 조건을 어떻게 만족하느냐로 RTOS 마다 색깔이 나뉩니다.

## 가장 단순한 시도 — 정렬된 단일 list

```c
List_t xReadyList;  // priority 내림차순 정렬

// 다음 task — head
TCB_t *next = listGET_OWNER_OF_HEAD_ENTRY(&xReadyList);

// insert — 적절한 위치 찾기
for (item = head; item != end; item = item->next) {
    if (item->priority < new_task->priority) break;
}
```

찾기는 O(1)이지만 삽입이 **O(N)** 입니다. block/unblock이 빈번한 RTOS에서는 받아들이기 어렵습니다.

## FreeRTOS 기본 — Array of Lists (Generic)

각 priority 별로 *별도 doubly-linked list*를 둡니다.

```c
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

32 priority면 list 32개입니다. 같은 priority 안에서는 *round-robin*이 자연스럽게 됩니다.

### 다음 task 찾기

```c
// configUSE_PORT_OPTIMISED_TASK_SELECTION = 0
UBaseType_t uxTopReadyPriority = 0;
while (listLIST_IS_EMPTY(&pxReadyTasksLists[uxTopReadyPriority])) {
    if (++uxTopReadyPriority >= configMAX_PRIORITIES) break;
}
pxCurrentTCB = listGET_OWNER_OF_NEXT_ENTRY(
    &pxReadyTasksLists[uxTopReadyPriority]);
```

위에서부터 비어있지 않은 list를 찾을 때까지 순회합니다. **O(P)** — priority 수에 비례합니다. 32 priority면 최악의 경우 32회 비교가 필요합니다.

### Insert / Remove

```c
vListInsert(&pxReadyTasksLists[priority], &task->xStateListItem);
uxListRemove(&task->xStateListItem);
```

doubly-linked list라 양쪽 다 O(1)입니다.

이 generic 방식은 *어떤 CPU에서도* 동작하는 안전한 선택입니다. Cortex-M0처럼 비트 연산이 빈약한 코어가 그 대상입니다.

## FreeRTOS 최적화 — Bitmap + CLZ

`configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`로 켜면 Cortex-M3 이상에서 진짜 **O(1)** 으로 바뀝니다.

```c
volatile UBaseType_t uxTopReadyPriority;  // bit N = priority N에 ready task 있음
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

`uxTopReadyPriority`는 *32 bit bitmap*입니다. priority 5에 task가 하나라도 있으면 bit 5가 켜집니다.

### CLZ — 1 cycle로 가장 높은 priority 찾기

```c
// ARM CLZ (Count Leading Zeros) intrinsic
unsigned int uxTopPriority = (31UL - __clz(uxTopReadyPriority));
pxCurrentTCB = listGET_OWNER_OF_NEXT_ENTRY(
    &pxReadyTasksLists[uxTopPriority]);
```

`__clz(x)`는 *상위 비트부터 0의 개수*를 셉니다. ARMv7-M 이상의 **CLZ 명령은 1 cycle**입니다. 32 priority도 1 cycle에 답이 나옵니다.

생성되는 어셈블리는 두 줄짜리입니다.

```asm
clz r1, r0          @ r1 = leading zero count of bitmap
rsb r1, r1, #31     @ r1 = 31 - r1
```

### bitmap 유지

Insert와 remove 때 bitmap을 함께 갱신합니다.

```c
// Insert — 비어있던 list라면 bit set
portRECORD_READY_PRIORITY(priority, uxTopReadyPriority);
vListInsertEnd(&pxReadyTasksLists[priority], item);

// Remove — list가 비면 bit clear
uxListRemove(item);
if (listLIST_IS_EMPTY(&pxReadyTasksLists[priority])) {
    portRESET_READY_PRIORITY(priority, uxTopReadyPriority);
}
```

`portRECORD_READY_PRIORITY`는 보통 `uxTopReadyPriority |= (1UL << priority)` 한 줄, reset도 `&= ~(1UL << priority)` 한 줄입니다. 단일 명령으로 끝납니다.

> 💡 CLZ는 ARMv7-M (Cortex-M3/M4/M7), ARMv8-M부터 있습니다. Cortex-M0/M0+ (ARMv6-M)에는 없어서 자동으로 generic 모드로 떨어집니다. 이 차이를 모르고 M0에서 최적화를 켜면 빌드가 깨집니다.

## uC/OS-III — 8 × 8 Bitmap + Lookup Table

CLZ 명령이 없던 시절의 우아한 답입니다. 256 priority를 *2단 bitmap*으로 다룹니다.

```c
CPU_INT08U  OSPrioRdyGrp;                    // group bit (1 byte)
CPU_INT08U  OSPrioTbl[OS_CFG_PRIO_MAX / 8];  // detail (32 byte for 256 prio)
```

priority `p`를 *group = p / 8*, *bit = p % 8*로 나눕니다. group에 ready task가 있으면 `OSPrioRdyGrp`의 해당 bit가 켜집니다.

### Lookup Table

```c
// 8-bit pattern → 가장 낮은 bit 위치
static const CPU_INT08U OSUnMapTbl[256] = {
    0, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    /* ... 256 entries ... */
};

CPU_INT08U group = OSUnMapTbl[OSPrioRdyGrp];
CPU_INT08U bit   = OSUnMapTbl[OSPrioTbl[group]];
CPU_INT08U prio  = (group << 3) + bit;
```

LUT 두 번 lookup으로 priority가 나옵니다. 8-bit MCU에서도 진정한 O(1)입니다. 256 byte LUT가 필요하지만, ROM에 두면 RAM은 거의 안 씁니다.

## Linux CFS — Red-Black Tree

Linux Completely Fair Scheduler는 priority 대신 *virtual runtime*을 기준으로 합니다. RB tree에 task들을 vruntime 순서로 넣고, *가장 왼쪽 노드*가 다음 task입니다.

```c
struct cfs_rq {
    struct rb_root_cached tasks_timeline;
    struct sched_entity *curr;
};

// 다음 task — cached leftmost
se = rb_first_cached(&cfs_rq->tasks_timeline);

// insert / remove
__enqueue_entity(cfs_rq, se);  // O(log N)
__dequeue_entity(cfs_rq, se);  // O(log N)
```

찾기는 cache 덕에 O(1), 삽입·삭제는 O(log N)입니다. task 1000개라도 약 10 비교면 끝납니다.

CFS는 *fair share*를 추구하므로 RTOS와 목적이 다릅니다. 임베디드 RTOS가 priority-O(1)을 고집하는 이유는 *throughput이 아니라 latency*가 목표이기 때문입니다.

## 한 표로 비교

| RTOS | 자료구조 | 다음 task | Insert | 최대 prio | TCB 오버헤드 |
| --- | --- | --- | --- | --- | --- |
| FreeRTOS (generic) | Array of lists | O(P) | O(1) | 32 | ~24 B |
| FreeRTOS (Cortex-M opt) | Bitmap + list | **O(1)** | O(1) | 32 | ~24 B |
| uC/OS-III | 8×8 bitmap + LUT | **O(1)** | O(1) | 256 | ~20 B |
| RT-Thread | Bitmap + list | **O(1)** | O(1) | 32 | ~24 B |
| Zephyr | Priority queue | O(1) | O(1)~O(log N) | 64 | 가변 |
| Linux CFS | RB tree | O(1) cached | O(log N) | 40 nice | 수백 B |

임베디드 RTOS는 거의 예외 없이 **bitmap + linked-list-per-priority** 조합으로 수렴합니다.

## Wait list — Ready list와 짝

ready list만 있으면 RTOS는 동작하지 않습니다. semaphore·mutex·queue 각자가 *대기 중 task*를 보관하는 wait list를 가집니다.

```c
typedef struct {
    int count;
    List_t xTasksWaitingToTake;   // priority-sorted
} Semaphore_t;

// 자원 해제 시 — 가장 높은 priority부터 wake
TCB_t *next = listGET_OWNER_OF_HEAD_ENTRY(&xTasksWaitingToTake);
move_to_ready_list(next);
```

wait list는 priority-sorted로 두는 게 일반적입니다. wake 시 head만 보면 *가장 우선해야 할 task*가 즉시 나옵니다.

## TCB가 두 list에 동시 link

여기서 흥미로운 디테일이 있습니다. 한 task는 *동시에 ready list와 wait list 양쪽*에 들어가야 할 때가 있습니다.

```c
typedef struct {
    /* ... */
    ListItem_t xStateListItem;    // ready / blocked / suspended 중 하나
    ListItem_t xEventListItem;    // 특정 이벤트 wait list
} tskTCB;
```

FreeRTOS는 TCB에 **두 개의 ListItem**을 둡니다. 하나는 상태 list용, 다른 하나는 이벤트 list용입니다. 이렇게 하면 timeout이 걸린 semaphore wait의 경우 *delayed list와 wait list 양쪽*에 자연스럽게 들어갑니다. 둘 중 어느 쪽에서 먼저 깨어나든 일관된 처리가 가능합니다.

## Delayed list — Timeout이 있는 task

`vTaskDelay()`나 timeout 있는 `xSemaphoreTake()`를 호출한 task는 *delayed list*로 갑니다. tick마다 expired task를 ready로 옮깁니다.

```c
static List_t xDelayedTaskList1;   // wake-up tick 오름차순
static List_t xDelayedTaskList2;   // tick overflow 대비 swap

// tick ISR 안
while (xTickCount >= listGET_ITEM_VALUE_OF_HEAD_ENTRY(&xDelayedTaskList1)) {
    TCB_t *t = listGET_OWNER_OF_HEAD_ENTRY(&xDelayedTaskList1);
    uxListRemove(&t->xStateListItem);
    move_to_ready_list(t);
}
```

list 두 개를 두는 이유는 *tick counter wrap-around* 때문입니다. wrap이 일어나는 순간 두 list를 교환합니다. 자세한 동작은 2-08편에서 다룹니다.

## 자주 하는 실수

> ⚠️ priority를 32단계 다 쓰기

대부분의 시스템은 5~10단계로 충분합니다. priority를 잘게 나눌수록 메모리도 늘고 *우선순위 설계*도 어려워집니다. 같은 priority의 task는 round-robin으로 도니 합쳐도 큰 문제가 없습니다.

> ⚠️ wait list 순서를 가정

priority-sorted라고 가정했는데 실제 구현이 FIFO면 가장 우선해야 할 task가 *맨 뒤*에 있을 수 있습니다. RTOS 별로 정책이 다르니 문서 확인이 필요합니다.

> ⚠️ Generic mode와 Opt mode를 혼동

Cortex-M0에서 `configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`로 두면 CLZ가 없어 빌드가 깨집니다. 반대로 Cortex-M4에서 generic mode로 두면 *공짜 O(1)*을 버리는 셈입니다.

## 정리

- Ready list는 **priority 별 doubly-linked list 배열**이 사실상 표준입니다.
- **Bitmap + CLZ**가 Cortex-M3+ 에서 O(1) 스케줄러를 만듭니다. 단 두 명령이면 답이 나옵니다.
- uC/OS-III의 **8×8 bitmap + LUT**는 CLZ가 없는 시대의 우아한 답입니다.
- Linux CFS는 **RB tree + vruntime**으로 fairness를 추구합니다. RTOS와는 목표 자체가 다릅니다.
- TCB가 *두 ListItem*을 가져 ready list와 wait list 양쪽에 동시에 link 됩니다. 임베디드 linked-list의 트릭입니다.

다음 편은 **Blocked List 자료구조** — timeout 정렬과 delta list 기법을 다룹니다.

## 관련 항목

- [1-02: Task와 Thread 개념](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [2-02: Blocked List 자료구조](/blog/embedded/rtos/practical-internals/part2-02-blocked-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
