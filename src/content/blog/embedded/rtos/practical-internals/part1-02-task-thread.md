---
title: "Task와 Thread 개념 — TCB·상태 머신·생명 주기 분석"
slug: "embedded/rtos/practical-internals/part1-02-task-thread"
date: 2026-05-04T09:02:00
description: "Task는 stack과 TCB, 상태로 구성됩니다. 5상태 머신(Running·Ready·Blocked·Suspended·Deleted)과 그 전이를 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 2
tags: [rtos, task, tcb, state-machine, lifecycle]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"Task = stack + TCB + state"입니다.** 세 가지가 갖춰지면 RTOS가 task로 인식합니다.

## Task의 본질 — 세 가지 구성

| 요소 | 역할 |
| --- | --- |
| **Stack** | 함수 호출·로컬 변수·인터럽트 시 레지스터 저장 |
| **TCB** (Task Control Block) | 메타데이터 (state, priority, stack pointer, ...) |
| **State** | Running / Ready / Blocked / ... |

이 셋이 있으면 RTOS scheduler가 *교대로 실행*할 수 있습니다.

## TCB — Task Control Block

FreeRTOS V11.2.0 [`tasks.c` L374-L452](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L374-L452)의 `tskTCB`에서 단일 코어·MPU 없음 구성에 항상 들어가는 필드와 `configUSE_MUTEXES == 1`일 때의 두 필드만 옮겼습니다. 주석은 원문 주석을 줄여 옮겼습니다. 나머지 필드(`xMPUSettings`, `uxCoreAffinityMask`, `ulRunTimeCounter`, `ulNotifiedValue[]` 등)는 각각 `#if`로 감싸여 있어 설정에 따라 생기거나 사라집니다.

```c
typedef struct tskTaskControlBlock {
    volatile StackType_t * pxTopOfStack; /* 마지막으로 push한 위치. 반드시 첫 멤버 */
    ListItem_t xStateListItem;           /* 이 항목이 걸린 list가 곧 상태(Ready·Blocked·Suspended) */
    ListItem_t xEventListItem;           /* event list(queue·semaphore 대기열)에 걸 때 */
    UBaseType_t uxPriority;              /* 0이 가장 낮음 */
    StackType_t * pxStack;               /* stack 시작 */
    char pcTaskName[ configMAX_TASK_NAME_LEN ];
    /* ... #if 조건부 필드 ... */
    UBaseType_t uxBasePriority;          /* configUSE_MUTEXES: 우선순위 상속 전 값 */
    UBaseType_t uxMutexesHeld;
    /* ... */
} tskTCB;
```

`pxTopOfStack`이 첫 멤버여야 하는 이유는 포트 어셈블리가 `pxCurrentTCB`가 가리키는 주소에서 바로 stack pointer를 읽기 때문입니다. 무엇을 그 stack에 저장하는지는 포트가 정합니다. Cortex-M3에서는 예외 진입 때 하드웨어가 r0-r3, r12, lr, pc, xPSR 8 word를 쌓고(DDI 0403E.b B1.5.6 "Exception entry behavior"), PendSV handler가 나머지 r4-r11을 `stmdb r0!, {r4-r11}`으로 저장합니다([`ARM_CM3/port.c` L467](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L467)). FPU가 있는 Cortex-M4F 포트는 EXC_RETURN의 bit 4를 `tst r14, #0x10`으로 검사해 task가 FPU를 썼을 때만 s16-s31을 더 저장합니다([`ARM_CM4F/port.c` L516-L520](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L516-L520)). 그래서 같은 커널이라도 FPU를 쓴 task와 쓰지 않은 task의 저장 frame 크기가 다릅니다.

## Stack — Task별 독립

각 task의 stack 크기는 호출 깊이·로컬 객체·라이브러리·포트별 exception frame으로 정해집니다. Cortex-M의 FreeRTOS 포트에서 task는 PSP를, ISR은 MSP를 쓰므로 ISR 안의 지역 변수는 task stack이 아니라 main stack에 쌓입니다. 다만 예외 진입 때 하드웨어가 쌓는 8 word frame은 인터럽트당한 task의 PSP 위에 쌓입니다(DDI 0403E.b B1.5.6).

```c
void pid_task(void *arg) {
    int local_var = 0;        // stack에
    update();                 // BL이 return address를 LR에 넣음 (DDI 0403E.b A7.7.18)
    ...
}

// 생성 시 stack size 명시
xTaskCreate(pid_task, "PID", 256, NULL, 3, NULL);
//                            ^^^
//                            256 × sizeof(StackType_t) = 1 KB (32-bit)
```

high-water mark는 "지금까지 한 번도 건드리지 않은 word 수"입니다. `uxTaskGetStackHighWaterMark()`가 이것을 셀 수 있는 이유는 task를 만들 때 stack 전체를 `0xa5`(`tskSTACK_FILL_BYTE`)로 채워 두기 때문입니다. 이 채우기는 `configCHECK_FOR_STACK_OVERFLOW > 1`, `configUSE_TRACE_FACILITY`, `INCLUDE_uxTaskGetStackHighWaterMark` 중 하나가 켜져 있을 때만 합니다([`tasks.c` L127-L134, L1843-L1848](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L127-L134)). 아직 지나가지 않은 최악 경로는 이 값에 나타나지 않습니다. 이 한계는 [4-06](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)에서 canary·MPU와 함께 다룹니다.

## Task State — 5 상태 머신

![Task 5-state machine](/images/blog/practical-internals/diagrams/part1-02-task-states.svg)

| State | 의미 |
| --- | --- |
| **Running** | 해당 코어에서 선택된 task. ISR 실행 중에는 그 task의 명령 실행은 중단됩니다. |
| **Ready** | 실행 가능, CPU 대기 (scheduler가 골라줘야 합니다) |
| **Blocked** | 이벤트 대기 (semaphore·queue·delay·notification) |
| **Suspended** | `vTaskSuspend()`로 실행 후보에서 제외. timeout 없이(`portMAX_DELAY`) 기다리는 task도 내부적으로는 suspended list에 들어가지만 `eTaskGetState()`는 이를 `eBlocked`로 보고합니다 |
| **Deleted** | 자기 자신을 지운 task는 `xTasksWaitingTermination`에 들어가고 TCB·stack은 idle task가 해제합니다. 실행 중이 아닌 다른 task를 지우면 `vTaskDelete()`가 그 자리에서 `prvDeleteTCB()`를 부릅니다([`tasks.c` L2262-L2336](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L2262-L2336)) |

### 전이 — 누가 트리거하나

| 전이 | 트리거 |
| --- | --- |
| Ready → Running | Scheduler (preemption 또는 yield 시) |
| Running → Ready | 고우선 task로 선점 또는 같은 우선순위로 yield/time slice |
| Running → Blocked | task 자신이 wait API 호출 |
| Running/Ready/Blocked → Suspended | 허용된 task 문맥에서 대상 suspend 또는 자기 suspend |
| Blocked → Ready | 이벤트 발생 (semaphore give, queue send, timeout) |
| Suspended → Ready | vTaskResume() |
| 유효한 task → Deleted | vTaskDelete() — 자기 또는 다른 task가 호출. 정리 시점은 위 표 |

> 💡 `taskYIELD()`에 의한 Running → Ready 전이도 자발적입니다. 반면 wait API를 호출해도 이벤트가 이미 있거나 timeout이 0이면 block하지 않고 바로 돌아옵니다. 이 그림은 개념 전이이며 모든 내부 list 이동을 표현한 것은 아닙니다.

### QEMU에서 상태 읽어 보기

상태를 말로만 보면 헷갈리므로 `eTaskGetState()`로 직접 읽어 봤습니다([`tasks.c` L2508](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L2508)). 우선순위 3의 감독 task `sup`이 1 tick 쉬는 동안 `blk`는 `vTaskDelay(100)`에 들어가고, `sus`는 자기 자신을 suspend하고, `del`은 자기 자신을 지우고, 우선순위 1의 `rdy`는 쉬지 않고 돕니다. 그다음 `sup`이 각 상태와 남은 heap을 출력합니다.

```c title="states.c (발췌)"
static void blk(void*a){(void)a; for(;;) vTaskDelay(100);}
static void rdy(void*a){(void)a; for(;;){} }
static void sus(void*a){(void)a; vTaskSuspend(NULL); for(;;){} }
static void del(void*a){(void)a; vTaskDelete(NULL); }
static void sup(void*a){(void)a;
  vTaskDelay(1);   /* let blk, sus, del run once; rdy keeps spinning at prio 1 */
  pr("sup (caller) = %s\n", st(eTaskGetState(xTaskGetCurrentTaskHandle())));
  pr("blk=%s rdy=%s sus=%s del=%s\n",st(eTaskGetState(hBlk)),st(eTaskGetState(hRdy)),st(eTaskGetState(hSus)),st(eTaskGetState(hDel)));
  pr("free heap before idle runs = %u\n",(unsigned)xPortGetFreeHeapSize());
  vTaskSuspend(hRdy); vTaskDelay(5);   /* idle (prio 0) can run only now */
  pr("free heap after idle ran   = %u\n",(unsigned)xPortGetFreeHeapSize());
  /* ... */
}
```

빌드와 실행 환경은 [1-01](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3` + `heap_4`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`).

```text
sup (caller) = eRunning
blk=eBlocked rdy=eReady sus=eSuspended del=eDeleted
free heap before idle runs = 57440
free heap after idle ran   = 58568
```

`del`은 이미 자기 자신을 지웠지만 `rdy`가 CPU를 놓지 않는 동안 idle task가 돌지 못해 TCB와 stack이 heap에 그대로 남아 있었습니다. `rdy`를 suspend해 idle에게 CPU가 돌아가자 free heap이 1,128바이트 늘었습니다. 이 구성의 TCB(`sizeof(StaticTask_t)`)는 88바이트이고 `heap_4`는 블록마다 8바이트 헤더를 붙이므로, stack (1,024 + 8)과 TCB (88 + 8)를 더하면 정확히 1,128바이트입니다. 높은 우선순위 task가 쉬지 않으면 삭제한 task의 메모리가 돌아오지 않는다는 뜻입니다.

## Task 생성 — FreeRTOS 예

```c
TaskHandle_t pid_handle = NULL;

BaseType_t result = xTaskCreate(
    pid_task,               // 함수
    "PID",                  // 이름 (디버깅용)
    256,                    // stack size (words)
    NULL,                   // 함수에 전달할 인자
    3,                      // priority (0 = lowest)
    &pid_handle             // 핸들 (제어용)
);

if (result != pdPASS) {
    /* 메모리 부족 — heap 확인 */
}
```

이 *한 줄*에서 RTOS는 다음 일을 합니다.
1. `xTaskCreate`는 동적으로 TCB를 할당합니다. `xTaskCreateStatic`은 호출자가 제공한 저장 공간을 사용합니다.
2. Stack을 할당합니다.
3. 포트의 초기 context frame에 task 진입 PC·인자·task return 오류 경로 등을 준비합니다.
4. Ready list에 추가합니다.
5. scheduler가 실행 중이고 새 task의 우선순위가 호출자보다 높으면 `configUSE_PREEMPTION == 1`에서 바로 새 task로 전환합니다. 생성이 실패하면(`errCOULD_NOT_ALLOCATE_REQUIRED_MEMORY`) 아무 것도 ready list에 들어가지 않으므로 반환값을 검사합니다.

## Task 함수의 패턴

```c
void pid_task(void *arg) {
    /* 초기화 (1회) */
    init_pid();

    /* 메인 루프 */
    while (1) {
        wait_for_event();      // Blocked로 들어감
        process();             // Ready → Running
    }

    /* 이 무한루프에서는 도달하지 않음. 유한 작업이라면 종료 경로에서 호출. */
    vTaskDelete(NULL);
}
```

> ⚠️ FreeRTOS task entry는 return하지 않는 계약입니다. Cortex-M3 포트는 초기 stack frame의 LR에 `portTASK_RETURN_ADDRESS`(기본 `prvTaskExitError`)를 넣어 둡니다([`ARM_CM3/port.c` L193, L202-L225](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L193)). task 함수가 return하면 그 함수로 들어가 `configASSERT`를 일부러 실패시키고 인터럽트를 끈 채 멈춥니다. 유한 task는 `vTaskDelete(NULL)`로 종료하고, 그 이후 핸들을 재사용하지 않습니다.

## Idle Task — 항상 존재하는 최저 우선순위 task

아래는 V11.2.0 `prvIdleTask`([`tasks.c` L5801-L5930](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L5801))를 단일 코어·선점 구성으로 줄였습니다. 주석과 coverage marker, SMP 분기를 뺐습니다.

```c
static portTASK_FUNCTION( prvIdleTask, pvParameters )
{
    for( ; configCONTROL_INFINITE_LOOP(); )
    {
        prvCheckTasksWaitingTermination();          /* 자기 삭제한 task의 TCB·stack 해제 */
        #if ( ( configUSE_PREEMPTION == 1 ) && ( configIDLE_SHOULD_YIELD == 1 ) )
            if( listCURRENT_LIST_LENGTH( &( pxReadyTasksLists[ tskIDLE_PRIORITY ] ) ) > ( UBaseType_t ) configNUMBER_OF_CORES )
                taskYIELD();                         /* 우선순위 0 task가 더 있으면 양보 */
        #endif
        #if ( configUSE_IDLE_HOOK == 1 )
            vApplicationIdleHook();
        #endif
        #if ( configUSE_TICKLESS_IDLE != 0 )
            /* xExpectedIdleTime >= configEXPECTED_IDLE_TIME_BEFORE_SLEEP 이면
               scheduler를 멈추고 portSUPPRESS_TICKS_AND_SLEEP( xExpectedIdleTime ) */
        #endif
    }
}
```

단일 코어의 idle priority는 `tskIDLE_PRIORITY`(0)입니다. 사용자 task도 우선순위 0으로 만들 수 있고, 이때 `configIDLE_SHOULD_YIELD`(기본 1, `FreeRTOS.h` L366-L367)가 켜져 있으면 idle은 한 바퀴마다 양보합니다(L5850). tickless sleep은 예상 idle 시간이 `configEXPECTED_IDLE_TIME_BEFORE_SLEEP`(기본 2 tick, `FreeRTOS.h` L2709-L2714) 이상일 때만 들어갑니다(L5883, L5898-L5901).

## Static vs Dynamic 할당

| | Static | Dynamic (heap) |
| --- | --- | --- |
| API | `xTaskCreateStatic` | `xTaskCreate` |
| 메모리 | 컴파일 타임 결정 | 런타임 heap_X에서 |
| Fragmentation | 없음 | 가능 |
| `tasks.c` text (아래 측정) | 8,152 B (static만) | 7,972 B (dynamic만) + `heap_4.c` 990 B |
| 검증 항목 | 저장 공간 수명·용량·재사용 계약 | 최악 지연·실패 처리·fragmentation 계약 |

code size 행은 V11.2.0 `tasks.c`를 이 장의 config로 arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m3 -mthumb -O2`로 컴파일하고 `arm-none-eabi-size`로 잰 text 크기입니다. 둘 다 켜면 8,652 B였습니다. static 쪽이 오히려 조금 큰 것은 `configSUPPORT_STATIC_ALLOCATION`이면 idle·timer task도 정적으로 만드는 경로가 들어가기 때문입니다. 차이를 만드는 것은 `heap_4.c`의 990 B와 `configTOTAL_HEAP_SIZE` 크기의 bss입니다.

static 메모리도 task가 사용하는 동안 살아 있어야 합니다. 삭제 시 호출자 저장 공간이 heap처럼 free되지는 않으며, 재사용은 task가 더 이상 실행되지 않고 cleanup이 끝난 뒤에만 합니다.

## Thread vs Task — 용어 차이

RTOS 세계의 *전통적 용어*는 **task**입니다. POSIX, Zephyr, 일부 자료에서는 **thread**를 씁니다.

| 용어 | 사용처 |
| --- | --- |
| **Task** | FreeRTOS(`xTaskCreate`) |
| **Thread** | Zephyr(`k_thread_create`, v3.7.0 `include/zephyr/kernel.h` L332), Eclipse ThreadX(`tx_thread_create`), POSIX(`pthread_create`, POSIX.1-2024) |
| **Process** | Linux (별도 메모리 공간) |

ThreadX는 RTOS지만 API가 `tx_thread_create`입니다(`common/inc/tx_api.h`). 이름이 task든 thread든 메모리 보호 계약은 따로입니다. FreeRTOS도 MPU 포트(`portable/GCC/ARM_CM3_MPU` 등)를 쓰면 task마다 접근 영역을 나눌 수 있고, 기본 포트에서는 모든 task가 한 주소 공간을 씁니다.

## 자주 하는 실수

> ⚠️ Stack 너무 작음

32비트 StackType_t에서 256 words는 1 KiB라는 단위 변환일 뿐 충분성의 근거는 아닙니다. 같은 QEMU 예제에서 256 word task가 `uint32_t buf[128]` 하나를 채우자 high-water mark가 246에서 103 word로 떨어졌습니다. 배열 하나로 stack의 절반 넘게 쓴 셈입니다.

```c title="states.c (발췌)"
static void stk(void*a){(void)a;
  pr("stk: high-water mark at entry      = %u words\n",(unsigned)uxTaskGetStackHighWaterMark(NULL));
  volatile uint32_t buf[128]; for(int i=0;i<128;i++) buf[i]=i;
  pr("stk: after touching uint32_t[128]  = %u words\n",(unsigned)uxTaskGetStackHighWaterMark(NULL));
  vTaskDelete(NULL); }
```

```text
stk: high-water mark at entry      = 246 words
stk: after touching uint32_t[128]  = 103 words
```

> ⚠️ Task에서 return

위에서 언급했듯이 **무한 루프 + delay**가 표준 패턴입니다.

> ⚠️ ISR에서 normal API 호출

ISR에서 `xQueueSend()`를 부르면 Cortex-M3 포트에서는 `vPortEnterCritical()`의 검사에 걸립니다. 이 함수는 critical section에 처음 들어갈 때 ICSR의 VECTACTIVE가 0인지 `configASSERT`로 확인합니다([`ARM_CM3/port.c` L426-L440](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L426-L440)). 같은 QEMU 예제에서 TIMER0 IRQ를 pending시키고 handler에서 `xQueueSend(q,&v,0)`을 부르자 다음처럼 멈췄습니다.

```text
pending TIMER0 IRQ (prio 0xE0) whose handler calls xQueueSend()
ASSERT failed: portable/GCC/ARM_CM3/port.c line 438
```

`configASSERT`를 정의하지 않은 빌드에서는 이 검사 자체가 사라지고 ISR 안에서 task용 경로가 그대로 실행됩니다. **FromISR 변종**을 사용합니다.

> ⚠️ Priority 인플레이션

모든 task를 high priority로 설정해도 의미가 없습니다. *task 간 상대적* 순서가 중요합니다.

## 정리

- Task는 **Stack과 TCB, State**로 구성됩니다.
- 5 상태가 있습니다 (Running, Ready, Blocked, Suspended, Deleted).
- 전이는 *자발적*(blocked) 또는 *강제적*(preempted)입니다.
- **Idle Task**가 항상 존재하여 tickless와 정리를 담당합니다.
- stack은 단위·포트별 frame·최악 호출 경로·실측 high-water mark와 검출 한계를 함께 확인합니다.

다음 편에서는 **스케줄링 알고리즘**을 다룹니다. Round Robin, Priority-based, EDF, Rate Monotonic을 살펴봅니다.

## 재현 — 공식 헤더의 단위와 생성 API 검사

아래는 FreeRTOS V11.2.0 ARM_CM4F 포트의 실제 헤더를 대상으로 한 **컴파일 검사**입니다. config에서 static/dynamic allocation과 `INCLUDE_xTaskDelayUntil`을 활성화해야 합니다. 실행 결과는 앞 절의 QEMU 예제가 보여 줍니다.

```c title="task-api-check.c"
#include "FreeRTOS.h"
#include "task.h"
_Static_assert(sizeof(StackType_t) == 4, "this probe targets ARM_CM4F");
_Static_assert(sizeof(StackType_t[256]) == 1024, "words versus bytes");
#ifdef REQUIRE_ONE_MS
_Static_assert(pdMS_TO_TICKS(1) > 0, "1ms rounds to zero ticks");
#endif
static StaticTask_t tcb;
static StackType_t stack[256];
static void worker(void *arg) {
    (void)arg;
    for (;;) vTaskDelay(1);
}
BaseType_t create_dynamic(TaskHandle_t *out) {
    return xTaskCreate(worker, "worker", 256, NULL, 1, out);
}
TaskHandle_t create_static(void) {
    return xTaskCreateStatic(worker, "worker", 256, NULL, 1, stack, &tcb);
}
```

1 kHz tick에서 1 ms는 1 tick이지만 100 Hz에서는 0으로 절삭됩니다. `REQUIRE_ONE_MS`를 켠 후자를 컴파일하면 static assertion이 실패해야 합니다. 저장소의 `scripts/verify-rtos-fundamentals-examples.mjs`는 공식 V11.2.0 헤더를 직접 써서 이 단위 검사와 생성 API 호출을 컴파일하고, 100 Hz 빌드가 `1ms rounds to zero ticks`로 실패하는지 확인합니다. `FREERTOS_KERNEL_DIR`에 V11.2.0 소스를 주고 돌리면 `PASS`로 끝납니다.

## 1차 자료와 검증 범위

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): `tskTCB`(L374), `vTaskDelete`(L2213), `eTaskGetState`(L2508), `prvIdleTask`(L5801)
- [ARM_CM3 port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c): `pxPortInitialiseStack`(L182), `vPortEnterCritical`(L426), PendSV 저장(L467)
- [ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): FPU 조건부 저장(L516-L540)
- ARM DDI 0403E.b (ARMv7-M Architecture Reference Manual) B1.5.6 Exception entry behavior

TCB와 idle 코드는 위 소스에서 줄여 옮긴 발췌입니다. 상태·heap·stack·ISR 오용 출력은 QEMU `mps2-an385`(icount 가상 시간)에서 실행한 결과이며, 실제 보드의 사이클 수나 지연은 재지 않았습니다.

## 관련 항목

- [1-01: RTOS가 필요한 이유](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
