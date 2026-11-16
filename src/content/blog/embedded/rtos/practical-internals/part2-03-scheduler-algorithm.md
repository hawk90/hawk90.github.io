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
| Cortex-M tick ISR | `xTaskIncrementTick()`이 `pdTRUE`면 PendSV pend(1-04의 세 경로) |
| Yield (`taskYIELD()`) | `portYIELD()` = ICSR에 PENDSVSET |
| Task block (`vTaskDelay` 등) | `taskYIELD_WITHIN_API()` → `portYIELD()` |
| ISR이 task wake → `portYIELD_FROM_ISR(pdTRUE)` | PendSV pend |
| `xTaskResumeAll()` | pending-ready·누적 tick을 처리하고 `xYieldPendings`가 서 있으면 yield |

여기서는 FreeRTOS V11.2.0 단일 코어 Cortex-M 포트를 기준으로 합니다. 다섯 경로 모두 결국 PendSV를 pend하고, PendSV handler가 `vTaskSwitchContext()`를 불러 다음 task를 고른 뒤 레지스터를 바꿉니다. 무엇을 고르는 일과 레지스터를 바꾸는 일은 나뉘어 있고, 이 장은 앞쪽을 다룹니다.

## FreeRTOS — vTaskSwitchContext()

아래는 V11.2.0 단일 코어 `vTaskSwitchContext()`([`tasks.c` L5109](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L5109))에서 주석·coverage marker를 빼고, run-time stats·errno·TLS 블록을 `/* ... */`로 줄인 것입니다.

```c
void vTaskSwitchContext( void )
{
    traceENTER_vTaskSwitchContext();
    if( uxSchedulerSuspended != ( UBaseType_t ) 0U )
    {
        xYieldPendings[ 0 ] = pdTRUE;        /* 전환을 미루고 표시만 */
    }
    else
    {
        xYieldPendings[ 0 ] = pdFALSE;
        traceTASK_SWITCHED_OUT();
        /* ... configGENERATE_RUN_TIME_STATS: 나가는 task의 실행 시간 누적 ... */
        taskCHECK_FOR_STACK_OVERFLOW();
        /* ... configUSE_POSIX_ERRNO ... */
        taskSELECT_HIGHEST_PRIORITY_TASK();  /* pxCurrentTCB 갱신 */
        traceTASK_SWITCHED_IN();
        portTASK_SWITCH_HOOK( pxCurrentTCB );
        /* ... errno, TLS 복원 ... */
    }
}
```

scheduler가 멈춰 있으면 고르지 않고 `xYieldPendings[0]`만 세워 두고, 이 표시는 `xTaskResumeAll()`이 확인합니다(2-02). stack overflow 검사가 여기 있다는 점도 눈여겨볼 만합니다. `configCHECK_FOR_STACK_OVERFLOW`를 1이나 2로 두면(기본 0, `FreeRTOS.h` L701-L703, 이 장의 QEMU 구성도 0) 나가는 task의 stack을 전환할 때마다 검사하므로, overflow가 일어난 순간이 아니라 다음 전환 때 발견됩니다.

## Generic Selection (CLZ 없는 시스템)

```c
#define taskSELECT_HIGHEST_PRIORITY_TASK() \
{ \
    UBaseType_t uxTopPriority = uxTopReadyPriority; \
    while (listLIST_IS_EMPTY(&pxReadyTasksLists[uxTopPriority])) { \
        configASSERT( uxTopPriority ); \
        --uxTopPriority; \
    } \
    listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, \
                                 &pxReadyTasksLists[uxTopPriority]); \
    uxTopReadyPriority = uxTopPriority; \
}
```

[`tasks.c` L194-L208](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L194-L208)의 매크로를 `do { } while(0)`와 주석만 빼고 옮겼습니다.

- `uxTopReadyPriority`를 캐시로 활용합니다. task가 ready가 될 때 그 priority가 더 높으면 올라갑니다.
- 빈 priority list를 만나면 한 단계씩 내려가며 검색합니다.

## Optimized Selection (Cortex-M, ARMv7-M+)

```c
#define portGET_HIGHEST_PRIORITY(uxTopPriority, uxReadyPriorities) \
    uxTopPriority = (31UL - (uint32_t) ucPortCountLeadingZeros((uxReadyPriorities)))
```

[`ARM_CM3/portmacro.h` L168](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h#L168)의 정의입니다. CLZ 기반 검색은 priority 수와 상관없이 `clz` + `rsb` 두 명령이고(2-01의 objdump), 선택 전체에는 list 접근이 더해집니다. Cortex-M0 포트에는 이 매크로가 없고 Cortex-M23 포트는 `#error`를 냅니다(2-01).

## Round-Robin in Same Priority

`listGET_OWNER_OF_NEXT_ENTRY`는 `pxIndex`를 한 칸 이동시킨 뒤 그 위치의 task를 결과 인자에 넣습니다([`list.h` L286-L297](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/list.h#L286-L297)). 그래서 같은 priority의 실행 가능 task가 차례로 돌아갑니다. 차례가 돈다는 것이지 CPU 시간을 똑같이 나눈다는 뜻은 아닙니다. 1 tick 중간에 block한 task는 그 slice의 나머지를 잃습니다.

```text
[T1] → [T2] → [T3]   같은 priority
 ↑pxIndex
pxIndex가 sentinel에서 시작한다면:
첫 호출: T1 선택, pxIndex는 T1
두 번째: T2 선택, pxIndex는 T2
세 번째: T3 선택, pxIndex는 T3
다음 호출: T1 선택(끝 marker 건너뜀)
```

`configUSE_TIME_SLICING = 1`(기본값)이면 선점형 구성에서 같은 priority ready task가 여럿일 때 tick마다 회전을 요청합니다. 0으로 꺼도 명시적 yield·blocking·선점 뒤의 재선택에서는 같은 회전이 일어납니다(1-03의 QEMU 실험).

### QEMU에서 전환 순서 기록하기

`traceTASK_SWITCHED_IN()`은 위 함수에서 새 task가 정해진 직후 불리는 매크로입니다. 이를 FreeRTOSConfig.h 쪽에서 정의해 전환될 때마다 task 이름과 tick을 기록했습니다.

```c title="trace.h"
extern void trace_in(const char *name);
#define traceTASK_SWITCHED_IN() trace_in(pxCurrentTCB->pcTaskName)
```

task 구성은 다음과 같습니다. A·B(우선순위 2)는 1 tick씩 CPU를 쓰고 `taskYIELD()`합니다. HI(3)는 3 tick을 잔 뒤 1 tick 일하고 semaphore를 기다립니다. IRQ(4)는 7 tick을 잔 뒤 TIMER0 IRQ를 pending시키고, ISR이 그 semaphore를 give합니다. `Tmr`는 FreeRTOS의 timer task(우선순위 7)입니다.

```text
0:Tmr 0:IRQ 0:HI 0:A 1:B 2:A 2:B 2:A 3:HI 4:B 5:A 5:B 5:A 6:B 7:IRQ 7:HI
```

형식은 `tick:이름`입니다. tick 0에는 우선순위 순으로 Tmr, IRQ, HI가 한 번씩 돌고 각자 block한 뒤 A가 잡습니다. 이후 A와 B가 번갈아 돌며, 같은 tick에 여러 번 바뀐 것은 `taskYIELD()`와 tick의 time slicing이 겹친 경우입니다. tick 3에는 delay가 끝난 HI가 tick ISR 경로로 선점해 들어왔고, tick 4에 semaphore에서 block하자 B가 이어받았습니다. tick 7에는 IRQ task가 깨어나 IRQ를 pending시키고, ISR이 HI를 ready로 만든 뒤 IRQ task가 다시 잠들자 HI가 돌았습니다. ISR 시점에는 HI(3)가 돌던 IRQ task(4)보다 낮아서 `xHigherPriorityTaskWoken`이 서지 않았고, 전환은 IRQ task의 block에서 일어났습니다. FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 실행했습니다.

## Idle Task — 항상 priority 0

다른 모든 task가 Blocked 상태에 있어도 priority 0의 Idle task는 ready 상태를 유지합니다. idle은 block하는 API를 부르지 않기 때문입니다(1-02의 `prvIdleTask`). 덕분에 generic 선택 루프는 늦어도 0에서 멈추고, 위 `configASSERT( uxTopPriority )`가 이 불변 조건을 검사합니다. idle hook에서 block하는 API를 부르면 이 전제가 깨집니다.

## Multi-Core (SMP) Scheduler

V11.2.0의 SMP 구성(`configNUMBER_OF_CORES > 1`)은 코어별 current task 배열과, 모든 코어가 함께 쓰는 ready list를 씁니다.

```c
TCB_t *pxCurrentTCBs[configNUMBER_OF_CORES];
```

코어마다 `prvSelectHighestPriorityTask(xCoreID)`로 next-task를 정하고(1-03), 공유 자료구조는 포트가 제공하는 두 lock(`portGET_TASK_LOCK`, `portGET_ISR_LOCK`)으로 보호합니다([`tasks.c` L874-L875](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L874-L875)). `configUSE_CORE_AFFINITY == 1`이면 `vTaskCoreAffinitySet()`(L3010)으로 특정 코어에서만 실행되게 묶을 수 있습니다.

```c
vTaskCoreAffinitySet(taskHandle, 0x01);  // Core 0만
```

mask의 bit n이 core n입니다. 묶인 task는 다른 코어가 비어 있어도 그 코어에서만 돌므로, 그 코어의 RTA에 넣어 계산합니다.

## Cooperative Mode

`configUSE_PREEMPTION = 0`이면 tick ISR은 tick을 세고 delay가 끝난 task를 ready로 옮기지만 전환은 요청하지 않습니다. task는 yield 외에도 blocking·suspend로 실행권을 넘깁니다. ISR의 `portYIELD_FROM_ISR(pdTRUE)`는 이 구성에서도 PendSV를 pend해 전환합니다(1-04의 QEMU 실험).

## Critical Section과 Scheduler

```c
taskENTER_CRITICAL();
// Cortex-M: BASEPRI와 nesting. vTaskSuspendAll 호출과 별개
atomic_work();
taskEXIT_CRITICAL();
```

Cortex-M 포트는 `uxCriticalNesting` 카운터로 중첩을 셉니다. `vPortExitCritical()`은 카운터가 0이 될 때만 BASEPRI를 0으로 돌려놓습니다([`ARM_CM3/port.c` L443-L452](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L443-L452)). critical section 안에서 `taskYIELD()`를 부르면 PendSV는 pend되지만, PendSV도 BASEPRI에 막혀 있다가 마지막 `taskEXIT_CRITICAL()`에서 들어옵니다.

## Trace Hooks

```c
traceTASK_SWITCHED_IN()      // 새 task 시작
traceTASK_SWITCHED_OUT()     // 이전 task가 CPU 실행권을 넘김, 삭제/종료 뜻 아님
traceTASK_CREATE(task)       // 생성
```

세 매크로 모두 `FreeRTOS.h`에서 비어 있는 기본 정의를 가지며(`traceTASK_CREATE`는 L828), 응용이 FreeRTOSConfig.h에서 정의하면 그 코드가 커널 안에 들어갑니다. 위 QEMU 실험의 `trace.h`가 그 예입니다. trace 도구 연동은 [2-11](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)에서 다룹니다.

## 자주 하는 실수

> ⚠️ scheduler가 항상 동작한다고 가정합니다. scheduler suspended 동안 현재 task는 계속 실행하고 ISR도 허용됩니다. 다른 task로의 전환은 위 `xYieldPendings[0]` 표시만 남기고 보류됩니다. 그 안에서 blocking API를 부르면 `xQueueGenericSend()` 등의 `configASSERT( !( ( xTaskGetSchedulerState() == taskSCHEDULER_SUSPENDED ) && ( xTicksToWait != 0 ) ) )`에 걸립니다.

> ⚠️ ISR에서 `pxCurrentTCB`를 직접 변경합니다. PendSV는 `pxCurrentTCB`가 가리키는 TCB에 나가는 task의 stack pointer를 저장하므로(2-05), 바꿔 버리면 엉뚱한 TCB에 저장됩니다. FromISR 계열 API만 사용합니다.

> ⚠️ time slicing을 끄면 같은 priority가 절대 바뀌지 않는다고 가정합니다. `configUSE_TIME_SLICING = 0`이면 tick 기반 회전만 꺼지고, 명시적 yield·blocking·선점 뒤에는 여전히 회전합니다(1-03, 아래 `yield-check.c`).

## 정리

- task 선택(`vTaskSwitchContext`)과 레지스터 저장·복원(PendSV)은 나뉘어 있고, 선택 함수는 stack overflow 검사·trace·run-time stats도 합니다.
- CLZ와 bitmap을 조합하면 next-task 선택이 priority 수와 무관한 몇 명령이 됩니다.
- `traceTASK_SWITCHED_IN()`으로 실제 전환 순서를 기록할 수 있습니다(QEMU 실험).
- 같은 priority 안에서는 list cursor로 round-robin을 돌립니다.
- Idle task는 priority 0에서 항상 ready 상태로 대기합니다.

다음 편은 context switch의 원리입니다. 레지스터 저장과 복원을 다룹니다.

## 재현 — 실제 ARM optimized 헤더

아래는 해당 포트의 실제 매크로를 호출하는 컴파일 검사입니다. bitmap 0은 호출 전에 제외하며, 최대 priority 33인 설정은 헤더가 컴파일 오류로 거절하는지도 검사합니다.

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

아래는 `configUSE_TIME_SLICING=0`인 공식 POSIX 포트에서 controller priority 3, worker 둘 priority 2로 실행하는 host 예제입니다. worker의 명시적 yield가 같은 priority 실행 순서를 바꾸는 것을 확인합니다.

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

저장소의 `scripts/verify-rtos-scheduler-list-examples.mjs`(`FREERTOS_KERNEL_DIR`=V11.2.0)가 2-01~2-03의 named 블록을 추출해 공식 source/header와 링크·컴파일하고, 이 장의 두 검사는 `PASS actual POSIX kernel: explicit yield rotates equal priorities with tick slicing disabled`로 끝납니다.

## 1차 자료와 확인 범위

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): `vTaskSwitchContext`(L5109), generic 선택(L194-L208), SMP lock(L874), `vTaskCoreAffinitySet`(L3010)
- [ARM_CM3 port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c)·[portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h): `vPortExitCritical`(L443), `portGET_HIGHEST_PRIORITY`(L168)

전환 순서 기록은 QEMU에서 실행한 결과이고, SMP·affinity 경로는 소스만 읽었습니다.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
