---
title: "2-03: Scheduler 알고리즘 구현 — Next-Task Selection 로직"
date: 2026-05-08T13:00:00
description: "FreeRTOS pxCurrentTCB 결정. CLZ 최적화, tie-breaking, scheduler entry points."
series: "Practical RTOS Internals"
seriesOrder: 13
tags: [scheduler, next-task, pxcurrenttcb, clz]
draft: true
---

## 한 줄 요약

> **"Scheduler = pxCurrentTCB 갱신"** — 그게 전부. 나머지는 context switch가 처리.

## Scheduler Entry Points

| 트리거 | 함수 |
| --- | --- |
| Tick ISR | `vTaskSwitchContext()` |
| Yield (`taskYIELD()`) | PendSV → `vTaskSwitchContext()` |
| Task block (`vTaskDelay` 등) | `portYIELD()` 경로 |
| ISR이 task wake → `portYIELD_FROM_ISR()` | PendSV pending |
| `xTaskResumeAll()` | direct |

핵심 — **PendSV** 예외가 *context switch 수행*. Scheduler는 *결정만*.

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

- `uxTopReadyPriority` cache
- 빈 priority list 만나면 *내려가며 검색*

## Optimized Selection (Cortex-M, ARMv7-M+)

```c
#define portGET_HIGHEST_PRIORITY(uxTopPriority, uxReadyPriorities) \
    uxTopPriority = (31UL - (uint32_t) __clz((uxReadyPriorities)))
```

**CLZ (Count Leading Zeros)** = 1 cycle. **O(1)**. ARMv6-M (Cortex-M0)에는 CLZ 없어 generic mode.

## Round-Robin in Same Priority

`listGET_OWNER_OF_NEXT_ENTRY` — *pxIndex 이동* 후 다음 task. 같은 priority의 task들이 fair share.

```text
[T1] → [T2] → [T3]   같은 priority
 ↑pxIndex
첫 호출: T1, pxIndex → T2
두 번째: T2, pxIndex → T3
세 번째: T3, pxIndex → T1
```

`configUSE_TIME_SLICING = 1` (default) 시 tick마다 round-robin.

## Idle Task — 항상 priority 0

다른 모든 task가 Blocked → Idle만 ready (priority 0). Scheduler가 *항상* idle 찾을 수 있어 *무한 루프 안 함*.

## Multi-Core (SMP) Scheduler

FreeRTOS SMP (10.5+):

```c
TCB_t *pxCurrentTCBs[configNUMBER_OF_CORES];
```

각 코어별 next-task 결정 + *cross-core spin lock*. Task affinity로 *특정 core*만 실행 가능.

```c
vTaskCoreAffinitySet(taskHandle, 0x01);  // Core 0만
```

Cache locality·HW peripheral은 specific core에 유용.

## Cooperative Mode

`configUSE_PREEMPTION = 0` 시 tick ISR은 *count만 증가*, scheduler 호출 X. 전환은 *yield 시에만*.

## Critical Section과 Scheduler

```c
taskENTER_CRITICAL();
// ↑ scheduler suspended + IRQ masked (BASEPRI)
atomic_work();
taskEXIT_CRITICAL();
```

`uxCriticalNesting` 카운터로 nested critical section 안전.

## Trace Hooks

```c
traceTASK_SWITCHED_IN()      // 새 task 시작
traceTASK_SWITCHED_OUT()     // 이전 task 종료
traceTASK_CREATE(task)       // 생성
```

Tracealyzer·SystemView·Segger RTT가 hook 활용.

## 자주 하는 실수

> ⚠️ Scheduler가 *항상 running* 가정 — Suspended 시 ISR 외 task 멈춤.

> ⚠️ ISR에서 pxCurrentTCB 직접 변경 — list inconsistency. FromISR API만.

> ⚠️ time slicing 가정 — `configUSE_TIME_SLICING = 0`이면 같은 priority round-robin *없음*.

## 정리

- Scheduler = `pxCurrentTCB` 갱신.
- **CLZ + bitmap = O(1)** next-task.
- 같은 priority *list cursor*로 round-robin.
- Idle task = priority 0, *항상 ready*.

다음 편은 **Context Switch 원리** — 레지스터 저장·복원.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
