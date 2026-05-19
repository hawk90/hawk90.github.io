---
title: "2-03: Scheduler 알고리즘 구현 — Next-Task Selection 로직"
date: 2026-05-07T13:00:00
description: "FreeRTOS pxCurrentTCB 결정. CLZ 최적화, tie-breaking, scheduler entry points."
series: "Practical RTOS Internals"
seriesOrder: 13
tags: [scheduler, next-task, pxcurrenttcb, clz]
draft: false
---

## 한 줄 요약

> Scheduler가 하는 일은 `pxCurrentTCB`를 갱신하는 것뿐입니다. 나머지는 context switch가 알아서 처리합니다.

## Scheduler Entry Points

| 트리거 | 함수 |
| --- | --- |
| Tick ISR | `vTaskSwitchContext()` |
| Yield (`taskYIELD()`) | PendSV → `vTaskSwitchContext()` |
| Task block (`vTaskDelay` 등) | `portYIELD()` 경로 |
| ISR이 task wake → `portYIELD_FROM_ISR()` | PendSV pending |
| `xTaskResumeAll()` | direct |

핵심은 PendSV 예외가 실제 context switch를 수행한다는 점입니다. scheduler는 어떤 task로 갈지 결정만 합니다.

## FreeRTOS — vTaskSwitchContext()

```c
void vTaskSwitchContext(void) {
    if (uxSchedulerSuspended) {
        xYieldPending = pdTRUE;
        return;
    }
    taskSELECT_HIGHEST_PRIORITY_TASK();   // pxCurrentTCB 갱신
    traceTASK_SWITCHED_IN();
}
```

## Generic Selection (CLZ 없는 시스템)

```c
#define taskSELECT_HIGHEST_PRIORITY_TASK() \
{ \
    UBaseType_t uxTopPriority = uxTopReadyPriority; \
    while (listLIST_IS_EMPTY(&pxReadyTasksLists[uxTopPriority])) { \
        --uxTopPriority; \
    } \
    listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, \
                                 &pxReadyTasksLists[uxTopPriority]); \
    uxTopReadyPriority = uxTopPriority; \
}
```

- `uxTopReadyPriority`를 캐시로 활용합니다.
- 빈 priority list를 만나면 한 단계씩 내려가며 검색합니다.

## Optimized Selection (Cortex-M, ARMv7-M+)

```c
#define portGET_HIGHEST_PRIORITY(uxTopPriority, uxReadyPriorities) \
    uxTopPriority = (31UL - (uint32_t) __clz((uxReadyPriorities)))
```

CLZ(Count Leading Zeros)는 단일 cycle에 끝나므로 O(1)입니다. ARMv6-M(Cortex-M0)에는 CLZ가 없어서 generic mode로 떨어집니다.

## Round-Robin in Same Priority

`listGET_OWNER_OF_NEXT_ENTRY`는 `pxIndex`를 한 칸 이동시킨 뒤 그 위치의 task를 반환합니다. 같은 priority의 task들이 공평하게 시간을 나눠 갖습니다.

```text
[T1] → [T2] → [T3]   같은 priority
 ↑pxIndex
첫 호출: T1, pxIndex → T2
두 번째: T2, pxIndex → T3
세 번째: T3, pxIndex → T1
```

`configUSE_TIME_SLICING = 1`(기본값)이면 tick마다 round-robin이 돌아갑니다.

## Idle Task — 항상 priority 0

다른 모든 task가 Blocked 상태에 있어도 priority 0의 Idle task는 ready 상태를 유지합니다. 덕분에 scheduler는 항상 실행할 task를 찾을 수 있고, 빈 ready list를 만나 무한 루프에 빠지는 일도 없습니다.

## Multi-Core (SMP) Scheduler

FreeRTOS SMP(10.5 이상)는 다음과 같이 동작합니다.

```c
TCB_t *pxCurrentTCBs[configNUMBER_OF_CORES];
```

코어마다 별도로 next-task를 결정하고, 공유 자료구조는 cross-core spin lock으로 보호합니다. Task affinity를 지정하면 특정 코어에서만 실행되게 묶을 수도 있습니다.

```c
vTaskCoreAffinitySet(taskHandle, 0x01);  // Core 0만
```

cache locality나 특정 HW peripheral 접근이 중요한 task는 특정 코어에 고정해 두는 편이 유리합니다.

## Cooperative Mode

`configUSE_PREEMPTION = 0`이면 tick ISR은 카운터만 증가시키고 scheduler는 호출하지 않습니다. task 전환은 명시적으로 yield할 때만 일어납니다.

## Critical Section과 Scheduler

```c
taskENTER_CRITICAL();
// ↑ scheduler suspended + IRQ masked (BASEPRI)
atomic_work();
taskEXIT_CRITICAL();
```

`uxCriticalNesting` 카운터로 중첩된 critical section을 추적해 안전하게 풉니다.

## Trace Hooks

```c
traceTASK_SWITCHED_IN()      // 새 task 시작
traceTASK_SWITCHED_OUT()     // 이전 task 종료
traceTASK_CREATE(task)       // 생성
```

Tracealyzer, SystemView, Segger RTT 같은 도구들이 이 hook을 활용합니다.

## 자주 하는 실수

> ⚠️ scheduler가 항상 동작한다고 가정합니다. suspended 상태에서는 ISR을 제외한 task가 멈춥니다.

> ⚠️ ISR에서 `pxCurrentTCB`를 직접 변경합니다. list 일관성이 깨지므로 FromISR 계열 API만 사용해야 합니다.

> ⚠️ time slicing이 기본이라고 가정합니다. `configUSE_TIME_SLICING = 0`이면 같은 priority에서도 round-robin이 일어나지 않습니다.

## 정리

- scheduler가 하는 일은 `pxCurrentTCB`를 갱신하는 것뿐입니다.
- CLZ와 bitmap을 조합하면 next-task 선택이 O(1)에 끝납니다.
- 같은 priority 안에서는 list cursor로 round-robin을 돌립니다.
- Idle task는 priority 0에서 항상 ready 상태로 대기합니다.

다음 편은 context switch의 원리입니다. 레지스터 저장과 복원을 다룹니다.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
