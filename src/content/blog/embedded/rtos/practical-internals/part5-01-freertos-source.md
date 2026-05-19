---
title: "5-01: FreeRTOS 소스 분석 — tasks.c·queue.c·port.c"
date: 2026-05-07T02:00:00
description: "FreeRTOS-Kernel 저장소의 핵심 파일 셋을 따라가며 xTaskCreate부터 PendSV까지의 흐름을 정리합니다. TCB·ready list·port 계층 사이의 경계가 어떻게 그어져 있는지 source 수준에서 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 46
tags: [freertos, source-analysis, tasks, queue, port]
---

## 한 줄 요약

> **"FreeRTOS 커널은 세 파일만 이해하면 전체가 보입니다."** — `tasks.c`가 스케줄러, `queue.c`가 IPC, `port.c`가 아키텍처 경계입니다.

## 어떤 문제를 푸는가

FreeRTOS는 1만 줄 안팎의 작은 커널입니다. 그래도 처음 소스를 열면 어디부터 읽어야 할지 막막합니다. 파일 수십 개, 매크로 수백 개, `#if` 분기가 함수 한 줄 단위로 박혀 있습니다.

이 글의 목표는 *세 핵심 파일*만 골라 읽는 길을 만드는 것입니다. `tasks.c`에서 스케줄러의 자료구조와 진입점을 따라가고, `queue.c`에서 큐·세마포어·뮤텍스가 같은 구현을 공유하는 모습을 보고, `port.c`에서 아키텍처에 의존하는 경계가 어디까지인지 확인합니다. 이 흐름을 한 번 잡아 두면 SMP, MPU, tickless 같은 확장 옵션도 같은 지도 위에서 자연스럽게 읽힙니다.

저장소는 `github.com/FreeRTOS/FreeRTOS-Kernel`입니다. 커널만 분리되어 있어 빌드 시스템과 BSP에 끌려다니지 않고 본체만 읽기 좋습니다.

## 저장소 구조와 진입점

```text
FreeRTOS-Kernel/
├── include/                       # public API
│   ├── FreeRTOS.h                 # 모든 컴파일 단위의 시작
│   ├── task.h
│   ├── queue.h
│   └── semphr.h
├── tasks.c                        # 스케줄러 본체 (~5000 lines)
├── queue.c                        # 큐·세마포어·뮤텍스 통합
├── timers.c                       # software timer
├── event_groups.c
├── stream_buffer.c
├── list.c                         # 양방향 list 자료구조
├── portable/                      # 아키텍처별 port
│   ├── GCC/ARM_CM4F/
│   ├── GCC/ARM_CM33_NTZ/
│   ├── GCC/RISC-V/
│   └── MemMang/                   # heap_1 ~ heap_5
└── License/
```

읽는 순서는 `FreeRTOS.h` → `list.c` → `tasks.c` → `queue.c` → `portable/<your-arch>/port.c`가 자연스럽습니다. `list.c`를 먼저 보는 이유는 ready list와 wait list의 모든 연결이 같은 자료구조 위에 얹혀 있기 때문입니다.

## tasks.c — 스케줄러 본체

`tasks.c`의 첫 줄에 가까운 곳에 *모든 것*의 출발점이 있습니다.

```c
PRIVILEGED_DATA TCB_t * volatile pxCurrentTCB = NULL;
```

지금 어느 CPU에서 *어느 task가 돌고 있는지*를 가리키는 단일 포인터입니다. 컨텍스트 스위치는 결국 이 포인터를 바꾸고 그 안의 `pxTopOfStack`을 새 PSP로 옮기는 일입니다.

TCB는 task의 모든 상태를 담는 구조체입니다.

```c
typedef struct tskTaskControlBlock {
    volatile StackType_t * pxTopOfStack;   /* MUST be first */

    #if (portUSING_MPU_WRAPPERS == 1)
    xMPU_SETTINGS xMPUSettings;
    #endif

    ListItem_t  xStateListItem;            /* ready/delay/suspend */
    ListItem_t  xEventListItem;            /* queue/semaphore wait */
    UBaseType_t uxPriority;
    StackType_t *pxStack;
    char        pcTaskName[configMAX_TASK_NAME_LEN];

    #if (configUSE_MUTEXES == 1)
    UBaseType_t uxBasePriority;            /* PI base */
    UBaseType_t uxMutexesHeld;
    #endif
    /* ... 다른 필드 */
} tskTCB;
```

`pxTopOfStack`이 *반드시 첫 필드*여야 합니다. 컨텍스트 스위치 어셈블리가 TCB 포인터를 받으면 offset 0에서 SP를 꺼내고 새 SP를 다시 그 자리에 저장합니다. 이 필드를 옮기면 어셈블리와 C 구조가 어긋나면서 첫 스위치 직후 모든 task가 깨집니다.

ready list는 priority별로 분리되어 있습니다.

```c
PRIVILEGED_DATA static List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

각 priority가 *FIFO list*입니다. 같은 priority 안에서 round-robin이 자연스럽게 돌아가는 이유입니다. 최상위 priority를 찾는 일은 별도의 비트맵으로 가속됩니다.

```c
#if (configUSE_PORT_OPTIMISED_TASK_SELECTION == 1)
    static volatile UBaseType_t uxTopReadyPriority;
#endif

#define portRECORD_READY_PRIORITY(uxPriority, uxTopReadyPriority) \
    (uxTopReadyPriority) |= (1U << (uxPriority))
#define portGET_HIGHEST_PRIORITY(uxTopPriority, uxReadyPriorities) \
    uxTopPriority = (31U - __CLZ(uxReadyPriorities))
```

Cortex-M의 `CLZ` 한 명령으로 최상위 ready priority가 한 사이클에 나옵니다. 32개 priority 안에서는 *O(1) 결정*입니다.

## xTaskCreate부터 PendSV까지

새 task 하나가 만들어져서 실제로 실행되기까지의 흐름을 함수 이름으로만 추리면 다음과 같습니다.

```c
BaseType_t xTaskCreate(TaskFunction_t pxTaskCode,
                       const char *pcName,
                       configSTACK_DEPTH_TYPE usStackDepth,
                       void *pvParameters,
                       UBaseType_t uxPriority,
                       TaskHandle_t *pxCreatedTask)
{
    StackType_t *pxStack = pvPortMalloc(usStackDepth * sizeof(StackType_t));
    TCB_t *pxNewTCB = pvPortMalloc(sizeof(TCB_t));

    prvInitialiseNewTask(pxTaskCode, pcName, usStackDepth, pvParameters,
                         uxPriority, pxCreatedTask, pxNewTCB, NULL);

    prvAddNewTaskToReadyList(pxNewTCB);
    return pdPASS;
}
```

`prvInitialiseNewTask` 안에서 *initial stack frame*이 만들어집니다. 이 부분이 port 계층으로 위임됩니다.

```c
/* portable/GCC/ARM_CM4F/port.c */
StackType_t *pxPortInitialiseStack(StackType_t *pxTopOfStack,
                                    TaskFunction_t pxCode,
                                    void *pvParameters)
{
    pxTopOfStack--; *pxTopOfStack = portINITIAL_XPSR;
    pxTopOfStack--; *pxTopOfStack = (StackType_t)pxCode;
    pxTopOfStack--; *pxTopOfStack = (StackType_t)prvTaskExitError;
    pxTopOfStack -= 5;                              /* R12, R3, R2, R1 */
    *pxTopOfStack = (StackType_t)pvParameters;      /* R0 */
    pxTopOfStack -= 8;                              /* R4-R11 */
    return pxTopOfStack;
}
```

이렇게 *가짜 컨텍스트 스위치*가 stack 위에 한 번 펼쳐져 있어야 첫 PendSV가 pop할 때 자연스럽게 task의 진입점으로 점프합니다.

스케줄러는 `vTaskSwitchContext`에서 다음 실행 대상을 결정합니다.

```c
void vTaskSwitchContext(void)
{
    if (uxSchedulerSuspended != pdFALSE) {
        xYieldPending = pdTRUE;
        return;
    }
    xYieldPending = pdFALSE;
    taskSELECT_HIGHEST_PRIORITY_TASK();
}

#define taskSELECT_HIGHEST_PRIORITY_TASK()                          \
    UBaseType_t uxTopPriority;                                      \
    portGET_HIGHEST_PRIORITY(uxTopPriority, uxTopReadyPriority);    \
    listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB,                       \
                                &(pxReadyTasksLists[uxTopPriority]))
```

`listGET_OWNER_OF_NEXT_ENTRY`가 같은 priority list 안에서 *다음 항목*을 가리키므로, 같은 priority의 task들은 자연스럽게 round-robin으로 순환합니다.

실제 레지스터 교체는 PendSV 핸들러가 합니다.

```asm
PendSV_Handler:
    mrs r0, psp
    isb
    ldr r3, =pxCurrentTCB
    ldr r2, [r3]

    tst lr, #0x10
    it eq
    vstmdbeq r0!, {s16-s31}

    stmdb r0!, {r4-r11, lr}
    str r0, [r2]               ; save SP into TCB

    push {r3}
    cpsid f
    bl vTaskSwitchContext
    cpsie f
    pop {r3}

    ldr r1, [r3]               ; new pxCurrentTCB
    ldr r0, [r1]               ; new SP
    ldmia r0!, {r4-r11, lr}

    tst lr, #0x10
    it eq
    vldmiaeq r0!, {s16-s31}

    msr psp, r0
    isb
    bx lr                      ; HW pops {R0-R3, R12, LR, PC, xPSR}
```

Cortex-M4 168 MHz에서 한 번 스위치에 30~50 사이클입니다. 300 ns 안쪽으로 마무리됩니다.

## queue.c — 하나의 구현으로 세 가지 IPC

`queue.c`를 처음 보면 놀라는 부분이 있습니다. 큐, 세마포어, 뮤텍스가 *같은 자료구조*를 공유합니다.

```c
typedef struct QueueDefinition {
    int8_t *pcHead;
    int8_t *pcWriteTo;
    union {
        int8_t *pcReadFrom;                   /* 큐 모드 */
        UBaseType_t uxRecursiveCallCount;     /* recursive mutex */
    } u;

    List_t xTasksWaitingToSend;
    List_t xTasksWaitingToReceive;

    volatile UBaseType_t uxMessagesWaiting;
    UBaseType_t uxLength;
    UBaseType_t uxItemSize;

    volatile int8_t cRxLock;
    volatile int8_t cTxLock;

    UBaseType_t uxQueueType;
} Queue_t;

typedef Queue_t Semaphore_t;
typedef Queue_t Mutex_t;
```

세마포어는 *길이 1, item 크기 0인 큐*이고, 뮤텍스는 추가로 owner와 recursion count를 들고 다니는 큐입니다. 한 구현을 셋이 공유하므로 버그 수정과 검증이 한 곳에 집중됩니다.

송신 경로는 [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)에서 더 자세히 다루지만, 골격만 보면 critical section과 event list 패턴이 그대로 드러납니다.

```c
BaseType_t xQueueGenericSend(QueueHandle_t xQueue,
                              const void *pvItemToQueue,
                              TickType_t xTicksToWait,
                              BaseType_t xCopyPosition)
{
    Queue_t *pxQueue = xQueue;
    for (;;) {
        taskENTER_CRITICAL();
        {
            if (pxQueue->uxMessagesWaiting < pxQueue->uxLength) {
                prvCopyDataToQueue(pxQueue, pvItemToQueue, xCopyPosition);

                if (listLIST_IS_EMPTY(&pxQueue->xTasksWaitingToReceive) == pdFALSE) {
                    if (xTaskRemoveFromEventList(&pxQueue->xTasksWaitingToReceive) != pdFALSE) {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
                taskEXIT_CRITICAL();
                return pdPASS;
            }
            if (xTicksToWait == 0) {
                taskEXIT_CRITICAL();
                return errQUEUE_FULL;
            }
            vTaskPlaceOnEventList(&pxQueue->xTasksWaitingToSend, xTicksToWait);
        }
        taskEXIT_CRITICAL();
        portYIELD_WITHIN_API();
    }
}
```

`vTaskPlaceOnEventList`는 현재 task를 *event list*에 끼우고 ready list에서 빼는 작업입니다. 깨우는 쪽은 `xTaskRemoveFromEventList`로 빼서 ready로 돌립니다. 큐, 세마포어, 뮤텍스가 모두 이 한 쌍의 함수에 의존합니다.

## port.c — 아키텍처 경계

`portable/<toolchain>/<arch>/port.c`가 아키텍처에 의존하는 모든 동작을 떠맡습니다. Cortex-M4F를 예로 보면, 스케줄러의 시작 자체가 SVC 한 줄로 압축됩니다.

```c
BaseType_t xPortStartScheduler(void)
{
    portNVIC_SHPR3_REG |= portNVIC_PENDSV_PRI;
    portNVIC_SHPR3_REG |= portNVIC_SYSTICK_PRI;

    vPortSetupTimerInterrupt();      /* SysTick */
    vPortEnableVFP();
    *(portFPCCR) |= portASPEN_AND_LSPEN_BITS;

    __asm volatile ("svc 0");        /* 첫 task로 진입 */
    return 0;
}
```

`svc 0`이 `SVC_Handler`로 떨어지면 그 안에서 `pxCurrentTCB`가 가리키는 task의 stack을 PSP로 옮기고 `bx lr`로 빠져나오면서 첫 task가 시작됩니다.

매 tick의 진입점은 SysTick 핸들러입니다.

```c
void xPortSysTickHandler(void)
{
    portDISABLE_INTERRUPTS();
    {
        if (xTaskIncrementTick() != pdFALSE) {
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    portENABLE_INTERRUPTS();
}
```

`xTaskIncrementTick`이 time slice 만료와 delay 카운트다운을 모두 처리하고, 더 높은 priority의 task가 깨어났다면 PendSV bit를 set해서 핸들러 복귀 직후에 컨텍스트 스위치가 일어나도록 합니다.

critical section은 BASEPRI를 사용합니다.

```c
#define portDISABLE_INTERRUPTS()                                  \
    __asm volatile (                                              \
        "msr basepri, %0\n"                                       \
        "isb\n" "dsb\n"                                           \
        : : "r"(configMAX_SYSCALL_INTERRUPT_PRIORITY)             \
    )

#define portENABLE_INTERRUPTS()  __set_BASEPRI(0)
```

`configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 *낮은 priority의 IRQ만* 막힙니다. 그보다 높은 hard-RT IRQ는 critical section 안에서도 그대로 통과하므로, 안전 회로처럼 응답 시간이 절대적으로 중요한 IRQ는 FreeRTOS의 영향을 받지 않게 설계할 수 있습니다.

## 흥미로운 세 곳

소스를 끝까지 따라가 보면 의외로 인상적인 코드가 모입니다. 세 곳을 꼽으면 다음과 같습니다.

첫째, `uxTopReadyPriority` 비트맵과 `CLZ` 결합입니다. 평범한 정수 한 워드가 *32 priority에 대한 O(1) lookup*을 만들어 냅니다. 비트맵의 단순함과 명령어 한 줄이 합쳐졌습니다.

둘째, `Queue_t`가 세 IPC를 동시에 표현하는 union 설계입니다. 큐의 read 포인터와 뮤텍스의 recursion count가 같은 union 자리를 공유합니다. 코드가 늘지 않은 채 기능이 셋으로 갈라집니다.

셋째, 첫 task의 진입을 위한 *가짜 stack frame*입니다. `pxPortInitialiseStack`이 만든 모양은 *PendSV가 어떻게 pop할지*를 정확히 모사합니다. 실행과 자료구조가 서로를 거울처럼 비추는 부분입니다.

## SMP — FreeRTOS 11

FreeRTOS 11에서 SMP가 공식화되면서 `pxCurrentTCB`가 *배열*로 바뀌었습니다.

```c
TCB_t * volatile pxCurrentTCBs[configNUMBER_OF_CORES];
#define pxCurrentTCB  pxCurrentTCBs[xPortGetCoreID()]
```

매크로 한 줄로 단일 코어 코드가 그대로 동작합니다. ready list는 여전히 *하나*이고, task/ISR 두 단계 spinlock으로 보호됩니다. 구조의 자세한 비교는 [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 다룹니다.

## 빌드 — CMake 모듈로 묶기

최근 FreeRTOS는 CMake 통합이 깔끔해졌습니다.

```cmake
add_subdirectory(FreeRTOS-Kernel)

target_link_libraries(my_firmware PRIVATE
    freertos_kernel
    freertos_config       # FreeRTOSConfig.h 가진 INTERFACE 타깃
)

target_include_directories(freertos_config INTERFACE
    ${CMAKE_SOURCE_DIR}/config)
```

`freertos_config`는 사용자 측에서 정의하는 INTERFACE 타깃입니다. 여기에 `FreeRTOSConfig.h`의 위치를 알려 주면 커널이 그 헤더를 끌어다 씁니다.

## 자주 보는 함정

> 경고 — `pxTopOfStack`을 첫 필드에서 옮김

TCB 구조체 안에서 `pxTopOfStack`이 첫 필드가 아니면 컨텍스트 스위치 어셈블리가 엉뚱한 주소를 SP로 사용합니다. 첫 PendSV 직후 hard fault로 죽습니다.

> 경고 — Cortex-M3 binary에 Cortex-M4F port 링크

`portable/GCC/ARM_CM3`과 `ARM_CM4F`는 FPU 처리와 BASEPRI 사용이 다릅니다. 디렉터리 한 단계 잘못 잡으면 빌드는 통과해도 런타임에 무한 fault가 납니다.

> 경고 — critical section 안에서 긴 작업

`taskENTER_CRITICAL`이 BASEPRI로 IRQ를 막는 동안은 SysTick도 멈춥니다. 안에서 hash 계산이나 printf를 호출하면 *수 ms 동안 모든 RT IRQ가 막힙니다*. critical은 수 µs 안에 끝나는 작업에만 씁니다.

> 경고 — heap_1에서 `vTaskDelete` 반복

heap_1은 free가 동작하지 않으므로 `vTaskDelete`를 호출해도 메모리가 돌아오지 않습니다. 동적 생성/삭제가 있는 시스템은 heap_4 이상으로 옮겨야 합니다.

## 정리

- FreeRTOS 커널은 `tasks.c` + `queue.c` + `port.c` 세 파일을 중심으로 읽으면 전체 구조가 잡힙니다.
- `pxCurrentTCB`는 시스템 전체에서 *현재 실행 중인 task*를 가리키는 단일 포인터이며, 컨텍스트 스위치의 회전축입니다.
- ready list는 priority별 FIFO이며, `uxTopReadyPriority` 비트맵과 `CLZ`로 최상위 priority를 한 사이클에 찾습니다.
- 큐·세마포어·뮤텍스는 `Queue_t` 하나를 공유하므로 검증과 버그 수정이 한 곳에 모입니다.
- port 계층은 `pxPortInitialiseStack`, `xPortStartScheduler`, `xPortSysTickHandler`, PendSV 핸들러, BASEPRI 매크로로 좁혀집니다.
- SMP는 `pxCurrentTCB`를 배열로 바꾸고 spinlock을 추가한 확장이며, 단일 코어 구조와 같은 지도 위에서 읽힙니다.
- critical section은 BASEPRI 기반이므로 *configMAX_SYSCALL_INTERRUPT_PRIORITY*보다 높은 IRQ는 그대로 통과합니다.

다음 편은 [5-02 Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)에서 devicetree와 driver model 위에서 동작하는 더 큰 RTOS를 봅니다.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [3-02: Semaphore 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
