---
title: "2-01: Ready List 자료구조 — Linked List, Bitmap, O(1) Scheduler"
date: 2026-05-12T11:00:00
description: "Ready 상태 task 보관 자료구조. FreeRTOS linked-list-per-priority vs O(1) bitmap scheduler 트레이드오프."
series: "Practical RTOS Internals"
seriesOrder: 11
tags: [scheduler, ready-list, bitmap, linked-list, o1]
draft: true
---

## 한 줄 요약

> **"Ready list = scheduler의 모든 것"** — 어떻게 다음 task를 *빠르게* 찾느냐가 자료구조의 핵심.

## 요구사항

Scheduler가 매 tick·context switch마다 호출하는 *highest-priority ready task 찾기*. 좋은 자료구조:

- **O(1) 또는 O(log N)** — task 수와 무관해야
- **삽입·삭제 O(1)** — block/unblock이 빈번
- **메모리 효율** — 임베디드는 RAM 부족

## 1. FreeRTOS — Array of Lists

```c
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

**각 priority별 doubly-linked list**. 32 priority면 32 list.

### 다음 task 찾기

```c
// configUSE_PORT_OPTIMISED_TASK_SELECTION = 0 (generic)
UBaseType_t uxTopReadyPriority = 0;
while (listLIST_IS_EMPTY(&pxReadyTasksLists[uxTopReadyPriority])) {
    if (++uxTopReadyPriority >= configMAX_PRIORITIES) break;
}
pxCurrentTCB = listGET_OWNER_OF_NEXT_ENTRY(&pxReadyTasksLists[uxTopReadyPriority]);
```

O(P) — priority 수에 비례. 32 priority면 worst 32 iteration.

### Insert / Remove

```c
vListInsert(&pxReadyTasksLists[priority], &task->xStateListItem);  // O(1)
uxListRemove(&task->xStateListItem);  // O(1)
```

Doubly-linked list라 O(1).

### 메모리

```text
configMAX_PRIORITIES (32) × sizeof(List_t) ≈ 32 × 20 byte = 640 byte
+ TCB의 ListItem_t ≈ 24 byte/task
```

작은 시스템에 *과한 낭비* — priority 적으면 OK.

## 2. FreeRTOS Optimized — Bitmap + List

`configUSE_PORT_OPTIMISED_TASK_SELECTION = 1` (Cortex-M, ARM).

```c
volatile UBaseType_t uxTopReadyPriority;   // bit N = priority N 비어있지 않음
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

### 다음 task 찾기

```c
// ARM CLZ (Count Leading Zeros) 명령
unsigned int uxTopPriority = (31UL - __clz(uxTopReadyPriority));
pxCurrentTCB = listGET_OWNER_OF_NEXT_ENTRY(&pxReadyTasksLists[uxTopPriority]);
```

**CLZ = 1 cycle** on Cortex-M3+. 32 priority도 O(1).

### Insert / Remove

```c
// Insert
portRECORD_READY_PRIORITY(priority, uxTopReadyPriority);  // bit set
vListInsertEnd(&pxReadyTasksLists[priority], item);

// Remove (마지막 task이면 bit clear)
uxListRemove(item);
if (listLIST_IS_EMPTY(&pxReadyTasksLists[priority])) {
    portRESET_READY_PRIORITY(priority, uxTopReadyPriority);
}
```

여전히 O(1). Bitmap 1 bit set/clear는 *atomic* (single instruction).

> 💡 **CLZ 명령**이 *Cortex-M3+, ARMv7-M*부터. ARMv6-M (Cortex-M0)에는 *없어* generic mode 사용.

## 3. Linux CFS — Red-Black Tree

Linux Completely Fair Scheduler — *Priority 아닌 virtual runtime* 기준.

```c
struct cfs_rq {
    struct rb_root tasks_timeline;   // RB tree
    struct sched_entity *curr;
    /* ... */
};
```

각 task의 *vruntime* (virtual runtime) — 적게 쓴 task가 왼쪽. *leftmost가 다음*.

### 다음 task 찾기

```c
se = rb_first_cached(&cfs_rq->tasks_timeline);  // O(1) cache
```

### Insert / Remove

```c
__enqueue_entity(&cfs_rq, se);  // O(log N)
__dequeue_entity(&cfs_rq, se);  // O(log N)
```

O(log N) — task 1000개도 ~10 비교.

### 트레이드오프

- ✓ 정확한 fairness — *모든 task가 fair share*
- ✓ Priority *연속적* (nice -20 ~ 19)
- ✗ O(log N) > RTOS의 O(1) — 실시간성 약함
- ✗ 큰 메모리 (RB tree 노드)

→ Linux는 *throughput* + *fairness*, RTOS는 *latency* + *priority*. 본질적 차이.

## 4. uC/OS-III — 8 × 8 Bitmap

256 priority. **8 × 8 bitmap** — 1 byte로 group + 1 byte로 detail.

```c
CPU_INT08U OSPrioTbl[OS_CFG_PRIO_MAX / 8];   // 32 byte for 256 priority
CPU_INT08U OSPrioRdyGrp;                      // group bit
```

### 다음 task

```c
// LUT (lookup table) — 8-bit pattern → highest bit 위치
static const CPU_INT08U OSUnMapTbl[256] = {0, 0, 1, 0, 2, 0, 1, 0, 3, ...};
prio = (OSUnMapTbl[OSPrioRdyGrp] << 3) + OSUnMapTbl[OSPrioTbl[group]];
```

CLZ 명령 없는 옛 8-bit·16-bit MCU에서 *table lookup으로 O(1)*. 가장 우아한 옛 기법.

## 5. Zephyr — Multiqueue (per CPU)

SMP 지원. 각 CPU별 *ready queue*:

```c
struct _ready_q {
    struct _priq priq;       // priority queue (linked list per prio 또는 RB tree)
    struct k_thread *cache;  // 마지막 swap result
};
```

ARMv8-A에선 atomic ops로 *coordinated multi-CPU* 동작.

## 6. RT-Thread — Priority Group + List

uC/OS-III와 유사. 32 priority면 *bit 1개로 group + bit 5개로 prio* = 32 bit.

## 비교 표

| RTOS | 자료구조 | 찾기 | Insert | 최대 prio | 메모리/task |
| --- | --- | --- | --- | --- | --- |
| FreeRTOS (generic) | Array of lists | O(P) | O(1) | 32 | ~24 B |
| FreeRTOS (Cortex-M opt) | Bitmap + list | **O(1)** | O(1) | 32 | ~24 B |
| Linux CFS | RB tree | O(1) cached | O(log N) | 40 | ~수백 B |
| uC/OS-III | 8×8 bitmap + LUT | **O(1)** | O(1) | 256 | ~20 B |
| Zephyr | Priority queue | O(1) | O(1)-O(log N) | 64 | ~중간 |
| RT-Thread | Bitmap + list | **O(1)** | O(1) | 32 | ~24 B |

**임베디드 RTOS = O(1) 또는 그에 준하는 방식이 표준**.

## Wait List vs Ready List

각 sync object (semaphore·mutex·queue)도 *wait list* 보유 — *blocked* task들. 우선순위 정렬 또는 FIFO.

```c
typedef struct Semaphore {
    int count;
    List_t xTasksWaitingToTake;   // priority-sorted
} Semaphore_t;

// 자원 해제 시
TCB_t *next = listGET_OWNER_OF_HEAD_ENTRY(&xTasksWaitingToTake);  // highest prio
wake_task(next);
```

priority-sorted wait list → wake 시 *highest prio 즉시* 선택.

## TCB의 List 항목

```c
typedef struct {
    /* ... */
    ListItem_t xStateListItem;    // ready/blocked/suspended list 중 하나에 link
    ListItem_t xEventListItem;    // 특정 이벤트 wait 시 추가 link
} tskTCB;
```

**2개 list에 동시 link** — embedded linked list 자료구조의 효율. 한 task가 동시에 *ready list*와 *semaphore wait list*에 존재 가능.

## TickType_t — Timeout 관리

Blocked task가 *deadline* 가지면 *delayed list*에도 link. tick마다 *expired task 깨움*.

```c
List_t xDelayedTaskList1;       // 정렬된 list
List_t xDelayedTaskList2;       // tick wrap 대비 swap

// tick ISR
if (xTickCount == listGET_ITEM_VALUE_OF_HEAD_ENTRY(&xDelayedTaskList1)) {
    // expired → ready
}
```

타이머·timeout이 *delayed list*로 일원화. 자세한 건 2-08 (Tick과 타이머).

## 자주 하는 실수

> ⚠️ Priority too many

32 priority 다 사용 → 메모리 낭비·관리 복잡. 5-10단계로 충분.

> ⚠️ Wait list 순서 가정

priority-sorted라 가정했는데 FIFO 구현이면 *highest task가 마지막*. RTOS 문서 확인.

> ⚠️ Generic vs Opt 인지 못함

Cortex-M0 (CLZ 없음)는 generic mode 자동. 그러나 *configUSE_PORT_OPTIMISED_TASK_SELECTION = 1*로 잘못 설정하면 빌드 에러.

## 정리

- Ready list = **priority별 array of lists**가 가장 흔함.
- **Bitmap + CLZ**가 O(1) scheduler의 핵심.
- uC/OS-III의 **8×8 bitmap + LUT**가 CLZ 없는 시스템의 우아한 답.
- Linux CFS는 **RB tree + vruntime** — fairness 우선.
- TCB가 *2개 list*에 동시 link (state + event) — embedded list의 효율.

다음 편은 **Blocked List 자료구조** — timeout 정렬, delta list.

## 관련 항목

- [1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [2-02: Blocked List](/blog/embedded/rtos/practical-internals/part2-02-blocked-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
