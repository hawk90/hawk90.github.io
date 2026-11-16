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

이 질문에 대한 답이 걸리는 시간은 1-10의 RTA에서 모든 전환에 더해지는 항입니다. 그래서 ready list 자료구조는 다음 비용을 놓고 고릅니다.

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

찾기는 O(1)이지만 삽입이 **O(N)** 입니다. 은행 창구에서 손님이 올 때마다 줄 전체를 우선순위대로 다시 세우는 것과 같습니다. task가 ready가 될 때마다(매 tick, 매 give) 이 삽입이 일어나므로, 최악 삽입 시간이 ready task 수에 비례해 늘어납니다.

## FreeRTOS 기본 — Array of Lists (Generic)

각 priority 별로 *별도 doubly-linked list*를 둡니다.

```c
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

우선순위마다 줄을 따로 세우는 셈입니다. 32 priority면 list 32개이고, 이 장의 config(`configMAX_PRIORITIES 8`)에서는 8개입니다([`tasks.c` L475](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L475)). 같은 priority 안에서는 *round-robin*이 자연스럽게 됩니다(1-03의 time slicing 실험).

### 다음 task 찾기

FreeRTOS V11.2.0 단일 코어 generic 선택 매크로 `taskSELECT_HIGHEST_PRIORITY_TASK()`([`tasks.c` L194-L208](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L194-L208))를 함수 모양으로 옮긴 조각입니다. 이 모드에서 `uxTopReadyPriority`는 bitmap이 아니라 "ready task가 있을 수 있는 가장 높은 priority"이며, **큰 priority부터 내려갑니다**. idle task가 늘 우선순위 0에 ready로 있으므로 루프는 0에서 반드시 멈춥니다(`configASSERT( uxTopPriority )`).

```c
UBaseType_t top = uxTopReadyPriority;
while (listLIST_IS_EMPTY(&pxReadyTasksLists[top])) {
    configASSERT(top > 0);
    --top;
}
listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, &pxReadyTasksLists[top]);
uxTopReadyPriority = top;
```

선택의 최악 검색은 priority 수 P에 비례하는 O(P)입니다. 0부터 올라가며 처음 비어 있지 않은 list를 고르면 낮은 priority나 idle을 선택해 정책이 뒤집힙니다. `listGET_OWNER_OF_NEXT_ENTRY`는 값을 반환하지 않고 첫 인자에 결과를 넣는 매크로입니다.

### Insert / Remove

```c
vListInsertEnd(&pxReadyTasksLists[priority], &task->xStateListItem);
uxListRemove(&task->xStateListItem);
```

알려진 item의 제거와 `vListInsertEnd`는 O(1) 포인터 조작입니다. 반면 정렬 삽입 `vListInsert`는 list를 처음부터 훑어 자리를 찾으므로 O(N)입니다([`list.c`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/list.c)). ready list는 `vListInsertEnd`만 쓰고, 정렬이 필요한 delayed list와 event list가 `vListInsert`를 씁니다.

이 generic 방식은 C만으로 되어 있어서 모든 포트에서 동작합니다. CLZ 명령이 없는 Cortex-M0(ARMv6-M)와 Cortex-M23(ARMv8-M Baseline) 포트는 이 방식만 씁니다(아래).

## FreeRTOS 최적화 — Bitmap + CLZ

`configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`로 켜면 highest-priority 검색이 priority 수와 상관없는 몇 개의 명령이 됩니다. Cortex-M3 포트에서는 이 값의 기본이 1이고, `configMAX_PRIORITIES`가 32를 넘으면 `#error`입니다([`ARM_CM3/portmacro.h` L141-L170](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h#L141-L170)).

```c
volatile UBaseType_t uxTopReadyPriority;  // bit N = priority N에 ready task 있음
List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

이 모드에서 `uxTopReadyPriority`는 *32 bit bitmap*입니다. priority 5에 task가 하나라도 있으면 bit 5가 켜집니다. 엘리베이터 버튼판의 불 켜진 층과 같아서, 맨 위에 켜진 불만 찾으면 됩니다.

Ready list의 자료구조를 그림으로 보면 이렇습니다. priority bitmap의 set bit 위치가 곧 list array의 index가 되고, CLZ 한 명령으로 가장 높은 priority를 찾습니다.

![Ready list bitmap과 priority별 linked list](/images/blog/rtos/diagrams/part2-01-ready-list-bitmap.svg)

### CLZ — bit 위치와 코드 생성 확인

```c
// ARM CLZ (Count Leading Zeros) intrinsic
unsigned int uxTopPriority = (31UL - __builtin_clz((unsigned)uxTopReadyPriority));
listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, &pxReadyTasksLists[uxTopPriority]);
```

CLZ는 *상위 비트부터 0의 개수*를 셉니다. 포트는 이 식을 `portGET_HIGHEST_PRIORITY()`로 정의합니다(`ARM_CM3/portmacro.h` L168). 0 입력에서는 CLZ가 32를 내므로, idle이 늘 ready라서 bitmap이 0이 되지 않는다는 전제가 여기서도 쓰입니다.

아래 "재현" 절의 `priority-probe.c`를 arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m4 -O2`로 컴파일한 결과입니다. 0 검사(`cbz`) 뒤 핵심은 두 명령입니다.

```text
00000000 <highest_priority>:
   0:	cbz	r0, c <highest_priority+0xc>
   2:	clz	r0, r0
   6:	rsb	r0, r0, #31
   a:	bx	lr
   c:	movs	r0, #32
   e:	bx	lr
```

같은 파일을 `-mcpu=cortex-m0`으로 컴파일하면 `clz` 대신 `bl __clzsi2`가 나오고 `nm`에 `U __clzsi2`가 남습니다. ARMv6-M에는 CLZ가 없어 libgcc 함수 호출로 바뀌는 것입니다. 전체 선택에는 이 두 명령 말고도 인덱스 계산과 list 접근이 더해집니다. V11.2.0 `ARM_CM3` 포트의 `tasks.c`를 컴파일한 `vTaskSwitchContext`에도 `clz` 하나가 들어 있었습니다.

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

Cortex-M3 포트에서 `portRECORD_READY_PRIORITY`는 `( uxReadyPriorities ) |= ( 1UL << ( uxPriority ) )`, reset은 `&= ~( 1UL << ( uxPriority ) )`입니다(`ARM_CM3/portmacro.h` L163-L164). C 한 줄이지만 load-modify-store이므로, 커널은 이를 critical section이나 scheduler suspend 안에서만 부릅니다(1-06의 `counter++`와 같은 이유).

> 💡 CLZ는 ARMv7-M(Cortex-M3/M4/M7)과 ARMv8-M Mainline(Cortex-M33 등)에 있고, ARMv6-M(Cortex-M0/M0+)과 ARMv8-M Baseline(Cortex-M23)에는 없습니다. FreeRTOS는 이를 포트에서 다르게 처리합니다. Cortex-M23 포트는 `#error ARMv8-M baseline implementations (such as Cortex-M23) do not support port-optimised task selection.`을 냅니다([`ARM_CM23_NTZ/non_secure/portmacrocommon.h` L559](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM23_NTZ/non_secure/portmacrocommon.h#L559)). Cortex-M0 포트의 `portmacro.h`에는 관련 매크로가 아예 없어서, 1로 켜고 `tasks.c`를 컴파일하면 `implicit declaration of function 'portRECORD_READY_PRIORITY'` 등 세 개의 오류가 났습니다(arm-none-eabi-gcc 16.2.0).

## 교육용 8×8 Bitmap — 64 priority

32비트 bitmap 하나로는 32 priority까지만 됩니다. 그 이상은 bitmap을 두 단계로 쌓습니다. 8bit group bitmap과 8개의 8bit detail bitmap은 **8×8=64개** priority를 나타냅니다. 아파트 동 번호판과 각 동의 층 번호판을 따로 두는 것과 같습니다. 256개를 나타내려면 group이 32개 필요하므로 group bitmap도 한 단계 더 쌓아야 합니다.

```c
uint8_t ready_groups;
uint8_t ready_bits[8];
// priority p: group=p/8, bit=p%8, 0 <= p < 64
```

CLZ가 없으면 8bit 값마다 가장 낮은 set bit 위치를 담은 256 entry 표(LUT)를 써서 group 한 번, detail 한 번 찾습니다. 여기서 256은 8bit 입력 패턴의 수이지 priority 수가 아닙니다. 이 교육용 구조는 이 장의 실험에서 실행하지 않았습니다.

## Linux fair scheduler — 버전 구분

Linux의 일반 task(fair class)는 다른 문제를 풉니다. 가장 급한 task가 아니라 *CPU를 가장 덜 받은* task를 고릅니다. v6.5까지의 CFS는 RB tree에 task를 *virtual runtime* 순으로 넣고 *가장 왼쪽 노드*를 다음 task로 골랐습니다. 아래 두 필드는 v6.12 `kernel/sched/sched.h`의 `struct cfs_rq`(L662, L668)에도 그대로 있습니다.

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

찾기는 leftmost 캐시 덕에 O(1), 삽입·삭제는 O(log N)입니다.

CFS는 *fair share*를 추구하므로 RTOS와 목적이 다릅니다. 게다가 v6.6부터는 선택 규칙도 바뀌었습니다. v6.12 [`Documentation/scheduler/sched-eevdf.rst`](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/Documentation/scheduler/sched-eevdf.rst?h=v6.12)는 "The Linux kernel began transitioning to EEVDF in version 6.6"이라고 적습니다. `kernel/sched/fair.c`에서 `pick_eevdf()`는 v6.5에는 없고 v6.6부터 있습니다. EEVDF는 eligible한 task 중 virtual deadline이 가장 이른 것을 고르므로, 최신 Linux의 선택을 "최소 vruntime 노드"라고 설명하면 틀립니다. 이 장은 Linux scheduler를 실행해 보지 않았습니다.

## 한 표로 비교

| 범위 | 검색 | 삽입·제거 |
| --- | --- | --- |
| FreeRTOS V11.2.0 generic 단일 코어 | 최고 priority에서 하향 검색 O(P) | `vListInsertEnd`·알려진 item 제거 O(1) |
| FreeRTOS Cortex-M3/M4 optimized | bitmap + CLZ, 최대 32 priority | 같음, bitmap bit 갱신 추가 |
| 교육용 8×8 bitmap | group + detail 두 번, 64 priority | bit 두 개 갱신 |
| Zephyr v3.7.0 | `CONFIG_SCHED_DUMB`(linked list), `CONFIG_SCHED_SCALABLE`(red/black tree), `CONFIG_SCHED_MULTIQ`(priority별 queue, `SCHED_DEADLINE`과 함께 못 씀) 중 선택 | backend마다 다름 |
| Linux fair class | CFS(≤ v6.5) leftmost, EEVDF(v6.6~) eligible 중 earliest deadline | O(log N) |

Zephyr 행은 v3.7.0 [`kernel/Kconfig` L307-L340](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig#L307-L340)의 세 선택지입니다. 이 장의 config에서 TCB 크기는 88바이트(1-02)였고, 크기는 config에 따라 달라집니다.

## Wait list — Ready list와 짝

ready list만 있으면 RTOS는 동작하지 않습니다. semaphore·mutex·queue 각자가 *대기 중 task*를 보관하는 wait list를 가집니다.

FreeRTOS에서는 queue의 `xTasksWaitingToSend`·`xTasksWaitingToReceive`가 wait list이고(1-09의 `QueueDefinition`), semaphore와 mutex도 같은 구조를 씁니다. task를 이 list에 거는 `vTaskPlaceOnEventList()`는 정렬 삽입 `vListInsert()`를 씁니다([`tasks.c` L5317](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L5317)). 정렬 키는 task를 만들 때 `xEventListItem`에 넣어 둔 `configMAX_PRIORITIES - uxPriority`입니다(L1940). 값이 작을수록 앞에 오므로 priority가 높은 task가 head에 섭니다. 깨울 때는 head 하나만 꺼내면 *가장 우선해야 할 task*가 나옵니다(`xTaskRemoveFromEventList()`).

## TCB가 두 list에 동시 link

여기서 흥미로운 디테일이 있습니다. 한 task는 *timeout 대기의 state list와 event wait list 양쪽*에 들어가야 할 때가 있습니다.

```c
typedef struct {
    /* ... */
    ListItem_t xStateListItem;    // ready / blocked / suspended 중 하나
    ListItem_t xEventListItem;    // 특정 이벤트 wait list
} tskTCB;
```

FreeRTOS는 TCB에 **두 개의 ListItem**을 둡니다(1-02의 `tskTCB`). 하나는 상태 list용, 다른 하나는 이벤트 list용입니다. timeout이 걸린 semaphore wait는 `xStateListItem`으로 delayed list에, `xEventListItem`으로 semaphore의 wait list에 동시에 걸립니다. 아래 tick 코드가 timeout으로 깨울 때는 event list 쪽도 함께 떼어 내고, semaphore give로 먼저 깨어나면 `xTaskRemoveFromEventList()`가 delayed list 쪽을 떼어 냅니다.

## Delayed list — Timeout이 있는 task

`vTaskDelay()`나 timeout 있는 `xSemaphoreTake()`를 호출한 task는 *delayed list*로 갑니다. tick마다 expired task를 ready로 옮깁니다.

두 list의 선언은 [`tasks.c` L476-L477](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L476-L477)에 있습니다. 아래는 tick ISR이 부르는 `xTaskIncrementTick()`의 해당 루프([L4767-L4822](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4767-L4822))에서 coverage marker와 주석, 선점 판정 부분을 뺀 것입니다.

```c
for( ; ; )
{
    if( listLIST_IS_EMPTY( pxDelayedTaskList ) != pdFALSE )
    {
        xNextTaskUnblockTime = portMAX_DELAY;
        break;
    }
    pxTCB = listGET_OWNER_OF_HEAD_ENTRY( pxDelayedTaskList );
    xItemValue = listGET_LIST_ITEM_VALUE( &( pxTCB->xStateListItem ) );
    if( xConstTickCount < xItemValue )
    {
        xNextTaskUnblockTime = xItemValue;
        break;
    }
    listREMOVE_ITEM( &( pxTCB->xStateListItem ) );
    if( listLIST_ITEM_CONTAINER( &( pxTCB->xEventListItem ) ) != NULL )
        listREMOVE_ITEM( &( pxTCB->xEventListItem ) );
    prvAddTaskToReadyList( pxTCB );
    /* ... 선점 필요 여부 판정 ... */
}
```

delayed list는 깨어날 tick 순으로 정렬되어 있으므로 head만 보고 "아직 아니다"를 판정하면 바로 멈춥니다. 다음 깨어날 시각은 `xNextTaskUnblockTime`에 캐시해 두어, 그 전 tick에서는 이 루프에 아예 들어오지 않습니다.

list 두 개를 두는 이유는 *tick counter wrap-around* 때문입니다. wrap이 일어나는 순간 두 list를 교환합니다. 자세한 two-list 동작은 [2-02](/blog/embedded/rtos/practical-internals/part2-02-blocked-list)에서 다룹니다.

## 자주 하는 실수

> ⚠️ priority를 32단계 다 쓰기

priority 하나마다 `List_t` 하나가 ready list 배열에 생깁니다. 필요한 구분 수는 RM이라면 서로 다른 주기의 수입니다(1-03). 같은 priority로 합친 task끼리는 time slicing으로 번갈아 돌므로 RTA에서 서로를 간섭 항에 넣어 다시 계산합니다.

> ⚠️ wait list 순서를 가정

FreeRTOS의 queue wait list는 priority 순이지만(`queue.c` L114-L115 주석 "Stored in priority order"), 같은 priority끼리는 먼저 온 순입니다. 다른 RTOS로 옮길 때 이 순서가 같다고 가정하면, 그 RTOS가 FIFO로 깨우는 경우 가장 급한 task가 맨 뒤에 섭니다.

> ⚠️ Generic mode와 Opt mode를 혼동

Cortex-M0에서 `configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`로 두면 위처럼 빌드가 깨집니다. 반대로 Cortex-M3에서 generic mode로 두면 선택이 O(P)가 되는 대신 코드는 조금 작아집니다. 이 장의 config로 `tasks.c`를 컴파일하면 text가 optimized 7,972바이트, generic 7,792바이트였습니다.

## 정리

- FreeRTOS ready list는 **priority 별 doubly-linked list 배열**입니다.
- **Bitmap + CLZ**가 Cortex-M3/M4에서 선택을 `clz` + `rsb` 두 명령으로 줄입니다. M0·M23 포트는 generic만 씁니다.
- 8×8 bitmap은 64 priority를 나타내며, 256 entry LUT의 256은 입력 패턴 수입니다.
- Linux fair class는 v6.5까지 CFS(RB tree + vruntime), v6.6부터 EEVDF입니다. RTOS와는 목표 자체가 다릅니다.
- TCB가 두 ListItem을 가져 state list와 event wait list 양쪽에 동시에 link 됩니다.

다음 편은 **Blocked List 자료구조** — timeout 정렬과 delta list 기법을 다룹니다.

## 재현 — 실제 list API와 선택 방향

다음은 V11.2.0의 `list.c`를 링크하는 작은 **정책 모델**입니다. 실제 kernel의 `vTaskSwitchContext` 전체가 아닙니다. priority 7 두 개·3·idle 0을 넣고, 높은 priority 선택과 같은 priority 회전·제거 뒤 fallback을 검사합니다.

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

`priority-probe.c`만 Cortex-M4와 Cortex-M0으로 따로 컴파일해 위의 CLZ 코드 생성을 확인했습니다. 저장소의 `scripts/verify-rtos-scheduler-list-examples.mjs`(`FREERTOS_KERNEL_DIR`=V11.2.0)가 두 파일을 본문에서 추출해 실제 `list.c`와 링크하고, `PASS actual list API: priority 7/3/0, same-priority rotation, removal`을 출력합니다.

## 1차 자료와 재현 범위

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): generic 선택(L194), delayed list(L476, L4767), event list 삽입(L5317, L1940)
- [list.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/list.c), [ARM_CM3/portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h) L141-L170, ARM_CM23 `portmacrocommon.h` L559
- Zephyr v3.7.0 `kernel/Kconfig`, Linux v6.5/v6.6/v6.12 `kernel/sched/fair.c`·`sched.h`·`sched-eevdf.rst`

CLZ·code size·M0 빌드 결과는 arm-none-eabi-gcc 16.2.0으로 컴파일해 얻었습니다. Linux와 Zephyr scheduler는 실행하지 않았습니다.

## 관련 항목

- [1-02: Task와 Thread 개념](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [2-02: Blocked List 자료구조](/blog/embedded/rtos/practical-internals/part2-02-blocked-list)
- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
