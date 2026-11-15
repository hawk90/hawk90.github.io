---
title: "Scheduler 알고리즘 구현 추적 — Next-Task Selection 로직"
slug: "embedded/rtos/practical-internals/part2-03-scheduler-algorithm"
date: 2026-05-05T09:13:00
description: "FreeRTOS pxCurrentTCB 결정. CLZ 최적화, tie-breaking, scheduler entry points."
series: "Practical RTOS Internals"
seriesOrder: 13
tags: [scheduler, next-task, pxcurrenttcb, clz]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> 다음 실행 task 선택과 레지스터 전환을 구분합니다. 선택 함수도 trace·통계·stack 검사·TLS 등 설정별 작업을 수행하므로 포인터 대입만으로 설명하지 않습니다.

## Scheduler Entry Points

| 트리거 | 함수 |
| --- | --- |
| ARM_CM4F tick ISR | `xTaskIncrementTick()` 결과에 따라 PendSV 요청 |
| Yield (`taskYIELD()`) | PendSV → `vTaskSwitchContext()` |
| Task block (`vTaskDelay` 등) | `portYIELD()` 경로 |
| ISR이 task wake → `portYIELD_FROM_ISR()` | PendSV pending |
| `xTaskResumeAll()` | pending-ready·누적tick을 처리하고 필요하면 포트 yield 요청 |

여기서는 FreeRTOS V11.2.0 단일 코어 ARM_CM4F 포트를 기준으로 합니다. 이 포트에서 PendSV가 실제 task context를 전환합니다. 다른 아키텍처의 scheduler entry를 모두 PendSV로 설명하지 않습니다. scheduler는 어떤 task로 갈지 결정만 합니다.

## FreeRTOS — vTaskSwitchContext()

핵심 분기만 줄인 설명용 골격입니다. 실제 V11.2.0 함수와 같은 독립 구현이 아닙니다.

```c
void selection_sketch(void) {
    if (uxSchedulerSuspended) {
        xYieldPendings[0] = pdTRUE;
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
    uxTopPriority = (31UL - (uint32_t) ucPortCountLeadingZeros((uxReadyPriorities)))
```

이 포트의 bitmap 폭이 고정되어 있을 때 CLZ 기반 검색은 상수 개수 연산입니다. 실제scheduler 전체의cycle수가1이라는뜻은아닙니다. Cortex-M0의CLZ지원·optimized설정은포트별로확인하며자동fallback을가정하지않습니다.

## Round-Robin in Same Priority

`listGET_OWNER_OF_NEXT_ENTRY`는 `pxIndex`를 한 칸 이동시킨 뒤 그 위치의 task를 반환합니다. 같은priority의실행가능task를순환할수있습니다. blocking·상위priority간섭·tick위상때문에실제CPU시간을정확히같게나눈다는보장은아닙니다.

```text
[T1] → [T2] → [T3]   같은 priority
 ↑pxIndex
pxIndex가 sentinel에서 시작한다면:
첫 호출: T1 선택, pxIndex는 T1
두 번째: T2 선택, pxIndex는 T2
세 번째: T3 선택, pxIndex는 T3
다음 호출: T1 선택(끝 marker 건너뜀)
```

`configUSE_TIME_SLICING = 1`(기본값)이면 선점형구성에서같은priority ready task가여럿이면tick기반회전을요청할수있습니다. 비활성화해도명시적yield·blocking으로선택은바뀔수있습니다.

## Idle Task — 항상 priority 0

다른 모든 task가 Blocked 상태에 있어도 priority 0의 Idle task는 ready 상태를 유지합니다. 덕분에 scheduler는 항상 실행할 task를 찾을 수 있고, 빈 ready list를 만나 무한 루프에 빠지는 일도 없습니다.

## Multi-Core (SMP) Scheduler

V11.2.0의SMP구성은코어별current task와공유ready구조·affinity제약을사용합니다.

```c
TCB_t *pxCurrentTCBs[configNUMBER_OF_CORES];
```

코어마다 별도로 next-task를 결정하고, 공유 자료구조는 cross-core spin lock으로 보호합니다. Task affinity를 지정하면 특정 코어에서만 실행되게 묶을 수도 있습니다.

```c
vTaskCoreAffinitySet(taskHandle, 0x01);  // Core 0만
```

고정은cache locality나장치소유권에도움이될수있지만,부하분산과해당코어deadline에미치는영향을분석한뒤선택합니다.

## Cooperative Mode

`configUSE_PREEMPTION = 0`이면 tick ISR은 카운터만 증가시키고 scheduler는 호출하지 않습니다. task는yield외에도blocking·suspend등으로실행권을넘길수있습니다. FromISR의명시적yield경로는포트·설정으로별도확인합니다.

## Critical Section과 Scheduler

```c
taskENTER_CRITICAL();
// ARM_CM4F: BASEPRI와nesting. vTaskSuspendAll 호출과별개
atomic_work();
taskEXIT_CRITICAL();
```

`uxCriticalNesting` 카운터로 중첩된 critical section을 추적해 안전하게 풉니다.

## Trace Hooks

```c
traceTASK_SWITCHED_IN()      // 새 task 시작
traceTASK_SWITCHED_OUT()     // 이전 task가 CPU 실행권을 넘김, 삭제/종료 뜻 아님
traceTASK_CREATE(task)       // 생성
```

Tracealyzer, SystemView, Segger RTT 같은 도구들이 이 hook을 활용합니다.

## 자주 하는 실수

> ⚠️ scheduler가 항상 동작한다고 가정합니다. scheduler suspended 동안 현재task는계속실행하고ISR도허용됩니다. 다른task로의일반전환이보류되며그안에서blocking API를호출하면안됩니다.

> ⚠️ ISR에서 `pxCurrentTCB`를 직접 변경합니다. list 일관성이 깨지므로 FromISR 계열 API만 사용해야 합니다.

> ⚠️ time slicing이 기본이라고 가정합니다. `configUSE_TIME_SLICING = 0`이면 tick기반time slicing은비활성화되지만명시적yield·blocking에의한동일priority순환까지금지되는것은아닙니다.

## 정리

- task 선택과실제context저장/복원을구분하고각함수의설정별부가작업도확인합니다.
- CLZ와 bitmap을 조합하면 next-task 선택이 O(1)에 끝납니다.
- 같은 priority 안에서는 list cursor로 round-robin을 돌립니다.
- Idle task는 priority 0에서 항상 ready 상태로 대기합니다.

다음 편은 context switch의 원리입니다. 레지스터 저장과 복원을 다룹니다.

## 재현 — 실제 ARM optimized 헤더

아래는 해당 포트의 실제매크로를호출하는컴파일검사입니다. bitmap0은호출전에제외하며,최대priority33인설정은헤더가컴파일오류로거절하는지도검사합니다. 전체scheduler의시간측정은아닙니다.

```c title="optimized-config.c"
#include "FreeRTOS.h"
#include "task.h"
unsigned inspect_optimized_selection(UBaseType_t bitmap) {
    if (bitmap == 0) return configMAX_PRIORITIES;
    UBaseType_t top;
    portGET_HIGHEST_PRIORITY(top, bitmap);
    return (unsigned)top;
}
```

## 재현 — tick slicing 없이 명시적 yield

아래는 `configUSE_TIME_SLICING=0`인 공식 POSIX 포트에서 controller priority3, worker둘 priority2로 실행하는 host 예제입니다. worker의 명시적 yield가 같은 priority 실행 순서를 바꾸는 것을 확인합니다. 각 worker의 실제 CPU시간·보드선점latency는측정하지않습니다.

```c title="yield-check.c"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
static SemaphoreHandle_t done;
static unsigned trace[4], count;
static int passed;
static void worker(void *arg) {
    unsigned id = (unsigned)(uintptr_t)arg;
    trace[count++] = id;
    taskYIELD();
    trace[count++] = id + 2;
    assert(xSemaphoreGive(done) == pdTRUE);
    vTaskDelete(NULL);
}
static void controller(void *arg) {
    (void)arg;
    done = xSemaphoreCreateCounting(2, 0); assert(done);
    assert(xTaskCreate(worker, "A", 2048, (void *)(uintptr_t)0, 2, NULL) == pdPASS);
    assert(xTaskCreate(worker, "B", 2048, (void *)(uintptr_t)1, 2, NULL) == pdPASS);
    assert(xSemaphoreTake(done, pdMS_TO_TICKS(2000)) == pdTRUE);
    assert(xSemaphoreTake(done, pdMS_TO_TICKS(2000)) == pdTRUE);
    assert(count == 4);
    for (unsigned i = 0; i < 4; ++i) assert(trace[i] == i);
    vSemaphoreDelete(done);
    vTaskDelay(2);
    passed = 1;
    vTaskEndScheduler();
}
int main(void) {
    assert(xTaskCreate(controller, "control", 2048, NULL, 3, NULL) == pdPASS);
    vTaskStartScheduler(); assert(passed);
    puts("PASS actual POSIX kernel: explicit yield rotates equal priorities with tick slicing disabled");
}
```

저장소의 `scripts/verify-rtos-scheduler-list-examples.mjs`가 세 장의 named 블록을 추출하고 공식 source/header와 링크·컴파일합니다. scheduler내부코드조각은독립구현이나live보드계측예제가아닙니다.

## 1차 자료와 확인 범위

[FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)의`vTaskSwitchContext`·`xTaskResumeAll`과[ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c)의SysTick/PendSV경로를대조합니다. 아래host검사는공식POSIX포트의동일priority명시적yield만확인합니다. 보드전환cycle·모든SMP/affinity/선점경로를실행검증한결과가아닙니다.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
