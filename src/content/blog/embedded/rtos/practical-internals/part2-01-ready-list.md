---
title: "Ready List 자료구조 분석 — Linked List·Bitmap·O(1) Scheduler"
slug: "embedded/rtos/practical-internals/part2-01-ready-list"
date: 2026-05-05T09:11:00
description: "FreeRTOS V11.2.0 ready list와 priority bitmap을 대조하고, 실제 list API로 선택·회전·제거를 확인합니다. 교육용 8×8 bitmap은 64우선순위로 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 11
tags: [scheduler, ready-list, bitmap, linked-list, o1]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> Ready 선택 비용은 scheduler latency의 한 요소입니다. 삽입·제거·우선순위 정책·예외·lock·context 비용까지 구분해 확인합니다.

## 스케줄러가 푸는 문제

전환이 필요한 tick·API·ISR 이후 경로에서 스케줄러가 같은 질문을 던집니다.

> **"지금 ready 상태인 task 중 가장 높은 priority는 누구인가?"**

이 질문에 대한 답이 일정한 시간 안에 나오지 않으면 RTOS의 *determinism*은 무너집니다. 그래서 ready list 자료구조는 대상 task 수·메모리·최악 응답 요구에 맞춰 다음 비용을 비교해야 합니다.

- 다음 task 검색의 상한과 실제 비용
- 삽입·삭제·우선순위 변경의 상한
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

찾기는 O(1)이지만 삽입이 **O(N)** 입니다. 대상 수와 호출 빈도가 작으면 허용할 수도 있습니다. Big-O만으로 실제 deadline 만족 여부를 결정하지 않습니다.

## FreeRTOS 기본 — Array of Lists (Generic)

각 priority 별로 *별도 doubly-linked list*를 둡니다.

```c
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

32 priority면 list 32개입니다. 같은 priority 안에서는 *round-robin*이 자연스럽게 됩니다.

### 다음 task 찾기

FreeRTOS V11.2.0 단일 코어 generic 선택의 핵심을 줄인 조각입니다. `uxTopReadyPriority`는 가능한 최고 ready priority의 캐시이며, **큰 priority부터 내려갑니다**. Idle ready 불변조건과 list 보호 계약이 필요합니다.

```c
UBaseType_t top = uxTopReadyPriority;
while (listLIST_IS_EMPTY(&pxReadyTasksLists[top])) {
    configASSERT(top > 0);
    --top;
}
listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, &pxReadyTasksLists[top]);
uxTopReadyPriority = top;
```

선택의 최악 검색은 priority 수P에 따른O(P)입니다. 0부터 처음 nonempty를 고르면 낮은 priority나 idle을 선택해 정책이 뒤집힙니다. 위 매크로는 반환 함수가 아니라 출력 인자를 받는 실제 API 형식입니다.

### Insert / Remove

```c
vListInsertEnd(&pxReadyTasksLists[priority], &task->xStateListItem);
uxListRemove(&task->xStateListItem);
```

알려진 item의 제거와 `vListInsertEnd`는 O(1) 포인터 조작입니다. 정렬 삽입 `vListInsert`는 위치 검색이 필요해 O(N)일 수 있으므로 혼동하지 않습니다.

이 generic 방식은 *어떤 CPU에서도* 동작하는 안전한 선택입니다. Cortex-M0처럼 비트 연산이 빈약한 코어가 그 대상입니다.

## FreeRTOS 최적화 — Bitmap + CLZ

`configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`로 켜면 이를 지원하는 포트의 bitmap 폭 안에서 highest-priority 검색을 상수 개수의 연산으로 줄일 수 있습니다. 포트별 지원과 `configMAX_PRIORITIES` 제한을 확인합니다.

```c
volatile UBaseType_t uxTopReadyPriority;  // bit N = priority N에 ready task 있음
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

`uxTopReadyPriority`는 *32 bit bitmap*입니다. priority 5에 task가 하나라도 있으면 bit 5가 켜집니다.

Ready list의 자료구조를 그림으로 보면 이렇습니다. priority bitmap의 set bit 위치가 곧 list array의 index가 되고, CLZ 한 명령으로 가장 높은 priority를 찾습니다.

![Ready list bitmap과 priority별 linked list](/images/blog/rtos/diagrams/part2-01-ready-list-bitmap.svg)

### CLZ — bit 위치와 코드 생성 확인

```c
// ARM CLZ (Count Leading Zeros) intrinsic
unsigned int uxTopPriority = (31UL - __builtin_clz((unsigned)uxTopReadyPriority));
listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, &pxReadyTasksLists[uxTopPriority]);
```

`__clz(x)`는 *상위 비트부터 0의 개수*를 셉니다. Cortex-M4에서는 CLZ 명령으로 내려갈 수 있지만 전체 선택에는 인덱스 계산·list 접근·보호 비용도 있습니다. 0 입력과 폭을 검토하고, 명령 수나 CLZ 지연 하나를 scheduler 전체의 cycle로 계산하지 않습니다.

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

`portRECORD_READY_PRIORITY`는 보통 `uxTopReadyPriority |= (1UL << priority)` 한 줄, reset도 `&= ~(1UL << priority)` 한 줄입니다. C 표현식 한 줄이 단일 명령이라는 뜻은 아닙니다. bitmap과 list의 일관된 갱신·동기화가 추가로 필요합니다.

> 💡 CLZ는 ARMv7-M (Cortex-M3/M4/M7), ARMv8-M부터 있습니다. Cortex-M0/M0+에는 이 CLZ 명령이 없습니다. 선택 설정이 자동 fallback되는지 가정하지 말고 해당 포트의 매크로·지원 여부를 확인합니다. 이 차이를 모르고 M0에서 최적화를 켜면 빌드가 깨집니다.

## 교육용 8×8 Bitmap — 64 priority

8bit group bitmap과8개의8bit detail bitmap은 **8×8=64개** priority를 나타냅니다. 256개를 표시하려면32개 group을 구분하는 상위 구조 등 다른 구성이 필요합니다. 이 예제를 uC/OS-III의 실제256priority 구현이라고 부르지 않습니다.

```c
uint8_t ready_groups;
uint8_t ready_bits[8];
// priority p: group=p/8, bit=p%8, 0 <= p < 64
```

8bit 패턴에 대한256entry의 least-set-bit LUT를 쓸 수 있습니다. LUT entry 수256은 표현하는 priority 수256과 다릅니다. group과detail이0인 경우를 먼저 처리하고 우선순위 숫자 방향을 정의해야 합니다. 아래 host 실험은 FreeRTOS list만 사용하며, 이 교육용 LUT나 특정 uC/OS 판의 scheduler를 실행하지 않습니다.

## Linux fair scheduler — 버전 구분

과거 CFS의 기본 비교를 설명하면, 일반 fair class에서 *virtual runtime*을 기준으로 합니다. RB tree에 task들을 vruntime 순서로 넣고, *가장 왼쪽 노드*가 다음 task입니다.

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

찾기는 cache 덕에 O(1), 삽입·삭제는 O(log N)입니다. tree 검색·회전 등의 상수 비용이 있어 log₂N 하나가 정확한 비교 횟수나 cycle 수는 아닙니다.

CFS는 *fair share*를 추구하므로 RTOS와 목적이 다릅니다. Linux6.6부터 fair scheduler의 EEVDF 전환도 진행됐으므로 최신 Linux의 선택을 단순히 “최소 vruntime 노드”라고 설명하면 안 됩니다. [kernel EEVDF 문서](https://docs.kernel.org/scheduler/sched-eevdf.html)의 eligibility·virtual deadline을 확인합니다. 이 장은 Linux 전체 scheduling class를 실행 분석하지 않습니다.

## 한 표로 비교

| 범위 | 검색·변경 조건 |
| --- | --- |
| FreeRTOS V11.2.0 generic 단일 코어 | ready별 array-of-lists, 캐시에서 하향 검색O(P), end삽입·알려진item제거O(1) |
| ARM_CM4F optimized | 포트의32bit bitmap 제한 안에서 highest검색 상수 개수연산, list비용 별도 |
| 교육용8×8 bitmap | 64priority. LUT의256입력패턴과구분 |
| Zephyr | simple/scalable/multiqueue 등 설정에 따른 backend·deadline/affinity 제약 확인 |
| Linux fair class | 특정kernel revision의CFS/EEVDF 선택을구분, RT class와동일시하지않음 |

TCB/list 크기와 최대 priority를 RTOS 이름만으로 고정하지 않습니다. ABI·tick 폭·integrity 설정에 따른 실제 크기는 다음 장의 공식 헤더 검사로 확인합니다.

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

여기서 흥미로운 디테일이 있습니다. 한 task는 *timeout 대기의 state list와 event wait list 양쪽*에 들어가야 할 때가 있습니다.

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

list 두 개를 두는 이유는 *tick counter wrap-around* 때문입니다. wrap이 일어나는 순간 두 list를 교환합니다. 자세한 two-list 동작은 [2-02](/blog/embedded/rtos/practical-internals/part2-02-blocked-list)에서 다룹니다.

## 자주 하는 실수

> ⚠️ priority를 32단계 다 쓰기

필요한 priority 구분은 task의deadline·blocking·분석으로 정합니다. priority를 잘게 나눌수록 메모리도 늘고 *우선순위 설계*도 어려워집니다. 같은priority로합치면상호간섭과release/실행기회를다시분석해야합니다.

> ⚠️ wait list 순서를 가정

priority-sorted라고 가정했는데 실제 구현이 FIFO면 가장 우선해야 할 task가 *맨 뒤*에 있을 수 있습니다. RTOS 별로 정책이 다르니 문서 확인이 필요합니다.

> ⚠️ Generic mode와 Opt mode를 혼동

Cortex-M0에서 `configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`로 두면 CLZ가 없어 빌드가 깨집니다. 반대로 Cortex-M4에서 generic mode로 두면 속도·코드크기·port검증을비교해선택합니다. 최적화가무조건공짜라는뜻은아닙니다.

## 정리

- Ready list는 **priority 별 doubly-linked list 배열**이 사실상 표준입니다.
- **Bitmap + CLZ**가 Cortex-M3+ 에서 O(1) 스케줄러를 만듭니다. 단 두 명령이면 답이 나옵니다.
- 교육용8×8 bitmap은64priority를표현합니다. 특정커널의구현·priority수와혼동하지않습니다.
- Linux CFS는 **RB tree + vruntime**으로 fairness를 추구합니다. RTOS와는 목표 자체가 다릅니다.
- TCB가두ListItem을가져 state list와event wait list 양쪽에 동시에 link 됩니다. 임베디드 linked-list의 트릭입니다.

다음 편은 **Blocked List 자료구조** — timeout 정렬과 delta list 기법을 다룹니다.

## 재현 — 실제 list API와 선택 방향

다음은 V11.2.0의 `list.c`를 링크하는 작은 **정책 모델**입니다. 실제 kernel의 `vTaskSwitchContext` 전체가 아닙니다. priority7 두 개·3·idle0을 넣고, 높은 priority 선택과 같은 priority 회전·제거 뒤 fallback을 검사합니다.

```c title="priority-probe.c"
_Static_assert(sizeof(unsigned) == 4, "32-bit unsigned required");
unsigned highest_priority(unsigned bitmap) {
    if (bitmap == 0) return 32; // 없는 priority: __builtin_clz(0)을 피함
    return 31u - (unsigned)__builtin_clz(bitmap);
}
```

```c title="ready-list-check.c"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "FreeRTOS.h"
#include "list.h"
unsigned highest_priority(unsigned bitmap);
typedef struct { unsigned priority; ListItem_t item; } TaskModel;
static List_t ready[8];
static unsigned bitmap;
static void add(TaskModel *task, unsigned priority) {
    assert(priority < 8);
    task->priority = priority;
    vListInitialiseItem(&task->item);
    listSET_LIST_ITEM_OWNER(&task->item, task);
    vListInsertEnd(&ready[priority], &task->item);
    bitmap |= 1u << priority;
}
static TaskModel *pick(void) {
    unsigned generic = 7;
    while (listLIST_IS_EMPTY(&ready[generic])) {
        assert(generic > 0); --generic;
    }
    assert(highest_priority(bitmap) == generic);
    TaskModel *out;
    listGET_OWNER_OF_NEXT_ENTRY(out, &ready[generic]);
    return out;
}
static void remove_task(TaskModel *task) {
    uxListRemove(&task->item);
    if (listLIST_IS_EMPTY(&ready[task->priority])) bitmap &= ~(1u << task->priority);
}
int main(void) {
    assert(highest_priority(0) == 32);
    assert(highest_priority(1u << 31) == 31);
    for (unsigned i = 0; i < 8; ++i) vListInitialise(&ready[i]);
    TaskModel idle, a, b, c;
    add(&idle, 0); add(&a, 3); add(&b, 7); add(&c, 7);
    assert(pick() == &b); assert(pick() == &c);
    remove_task(&b); remove_task(&c);
    assert(pick() == &a);
    remove_task(&a); assert(pick() == &idle);
    puts("PASS actual list API: priority 7/3/0, same-priority rotation, removal");
}
```

`priority-probe.c`만 Cortex-M4로 `-O2 -S` 컴파일해 CLZ 코드 생성을 따로 확인합니다. list 모델의 host 성공을 실제 MCU scheduler의 cycle 측정으로 환산하지 않습니다.

## 1차 자료와 재현 범위

[FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)와[list.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/list.c)를 기준으로generic방향·end삽입·cursor를대조합니다. 위실제list API 검사는priority7/3/idle0선택·회전·제거를확인합니다. 전체kernel WCET·SMP·특정uC/OS/Linux실행을검증한것은아닙니다.

## 관련 항목

- [1-02: Task와 Thread 개념](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [2-02: Blocked List 자료구조](/blog/embedded/rtos/practical-internals/part2-02-blocked-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
