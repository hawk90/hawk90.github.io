---
title: "5-01: FreeRTOS 소스 분석 — tasks.c·queue.c·port.c"
date: 2026-05-20T02:00:00
description: "FreeRTOS 소스 구조. tasks.c·queue.c·port.c. pxCurrentTCB·scheduler 흐름·port layer."
series: "Practical RTOS Internals"
seriesOrder: 46
tags: [freertos, source-analysis, tasks, queue, port]
draft: true
---

## 한 줄 요약

> **"FreeRTOS = 3 핵심 파일"** — tasks.c (scheduler), queue.c (IPC), port.c (architecture).

## 디렉토리 구조

```text
FreeRTOS-Kernel/
├── include/                  # public API headers
│   ├── FreeRTOS.h
│   ├── task.h
│   ├── queue.h
│   ├── semphr.h
│   └── ...
├── tasks.c                   # ★ scheduler
├── queue.c                   # ★ queue·semaphore·mutex
├── timers.c                  # software timer
├── event_groups.c            # event group
├── stream_buffer.c           # stream/message buffer
├── list.c                    # double linked list
├── croutine.c                # co-routine (legacy)
├── portable/                 # port-specific
│   ├── GCC/ARM_CM4F/         # Cortex-M4F GCC
│   ├── GCC/ARM_CM33_NTZ/     # Cortex-M33
│   ├── GCC/RISC-V/           # RISC-V
│   ├── MemMang/              # heap_1, 2, 3, 4, 5
│   └── ...
└── License/
```

코어 — *< 20K lines C*. 매우 작은 RTOS.

## tasks.c — Scheduler 핵심

### pxCurrentTCB

```c
/* tasks.c */
PRIVILEGED_DATA TCB_t * volatile pxCurrentTCB = NULL;
```

*현재 실행 중인 task*. Context switch에서 갱신.

### TCB 구조

```c
typedef struct tskTaskControlBlock {
    volatile StackType_t * pxTopOfStack;     /* ← MUST be first */
    
    #if (portUSING_MPU_WRAPPERS == 1)
    xMPU_SETTINGS xMPUSettings;
    #endif
    
    ListItem_t  xStateListItem;    /* ready·delay·suspend list */
    ListItem_t  xEventListItem;    /* queue·semaphore wait */
    UBaseType_t uxPriority;
    StackType_t *pxStack;
    char        pcTaskName[configMAX_TASK_NAME_LEN];
    
    #if (portSTACK_GROWTH > 0)
    StackType_t *pxEndOfStack;
    #endif
    
    #if (configUSE_MUTEXES == 1)
    UBaseType_t uxBasePriority;    /* PI base */
    UBaseType_t uxMutexesHeld;
    #endif
    
    /* ... other fields */
} tskTCB;
```

`pxTopOfStack` 첫 필드 — context switch assembly에서 *offset 0으로 access*.

## Ready List 구조

```c
PRIVILEGED_DATA static List_t pxReadyTasksLists[configMAX_PRIORITIES];

/* 각 priority의 ready task list */
```

`configMAX_PRIORITIES` (보통 5-32) — 각 priority별 *FIFO list*.

### Top-Ready-Priority — 최적화

```c
#if (configUSE_PORT_OPTIMISED_TASK_SELECTION == 1)
    static volatile UBaseType_t uxTopReadyPriority;
#endif

/* portmacro.h에서 */
#define portRECORD_READY_PRIORITY(uxPriority, uxTopReadyPriority) \
    (uxTopReadyPriority) |= (1 << (uxPriority))
#define portGET_HIGHEST_PRIORITY(uxTopPriority, uxReadyPriorities) \
    uxTopPriority = (31 - __CLZ(uxReadyPriorities))
```

Cortex-M *CLZ* 명령으로 *O(1) priority lookup*. 32 priority 한 cycle.

## xTaskCreate 흐름

```c
BaseType_t xTaskCreate(TaskFunction_t pxTaskCode, const char *pcName,
                       configSTACK_DEPTH_TYPE usStackDepth,
                       void *pvParameters, UBaseType_t uxPriority,
                       TaskHandle_t *pxCreatedTask) {
    /* 1. Allocate TCB + stack */
    StackType_t *pxStack = pvPortMalloc(usStackDepth * sizeof(StackType_t));
    TCB_t *pxNewTCB = pvPortMalloc(sizeof(TCB_t));
    
    /* 2. Initialize TCB */
    prvInitialiseNewTask(pxTaskCode, pcName, usStackDepth, pvParameters,
                         uxPriority, pxCreatedTask, pxNewTCB, NULL);
    
    /* 3. Add to ready list */
    prvAddNewTaskToReadyList(pxNewTCB);
    
    return pdPASS;
}
```

`prvInitialiseNewTask` 안 — *initial stack frame* 설정 (port-specific).

## Initial Stack Frame — Cortex-M

```c
/* portable/GCC/ARM_CM4F/port.c */
StackType_t *pxPortInitialiseStack(StackType_t *pxTopOfStack,
                                    TaskFunction_t pxCode, void *pvParameters) {
    /* Cortex-M context — hardware stack frame */
    pxTopOfStack--; *pxTopOfStack = portINITIAL_XPSR;      /* xPSR — Thumb */
    pxTopOfStack--; *pxTopOfStack = (StackType_t)pxCode;   /* PC */
    pxTopOfStack--; *pxTopOfStack = (StackType_t)prvTaskExitError;   /* LR */
    pxTopOfStack -= 5;                                      /* R12, R3, R2, R1 */
    *pxTopOfStack = (StackType_t)pvParameters;             /* R0 */
    
    /* Software stacked — R4-R11 */
    pxTopOfStack -= 8;
    
    return pxTopOfStack;
}
```

Task 시작 시 *PendSV가 pop* → 자동 R0=parameters, PC=task entry.

## vTaskSwitchContext

```c
void vTaskSwitchContext(void) {
    if (uxSchedulerSuspended != pdFALSE) {
        xYieldPending = pdTRUE;
        return;
    }
    
    xYieldPending = pdFALSE;
    
    /* Find highest ready priority */
    taskSELECT_HIGHEST_PRIORITY_TASK();
}

#define taskSELECT_HIGHEST_PRIORITY_TASK() \
    UBaseType_t uxTopPriority;            \
    portGET_HIGHEST_PRIORITY(uxTopPriority, uxTopReadyPriority); \
    listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB, &(pxReadyTasksLists[uxTopPriority]))
```

`listGET_OWNER_OF_NEXT_ENTRY` — *round-robin* (FIFO) within same priority.

## PendSV Handler — Context Switch

```asm
; portable/GCC/ARM_CM4F/portasm.c
PendSV_Handler:
    mrs r0, psp
    isb
    
    ldr r3, =pxCurrentTCB
    ldr r2, [r3]
    
    /* Save FPU if used */
    tst lr, #0x10
    it eq
    vstmdbeq r0!, {s16-s31}
    
    /* Save R4-R11 + LR */
    stmdb r0!, {r4-r11, lr}
    str r0, [r2]   ; save SP to TCB
    
    /* Call scheduler */
    push {r3}
    cpsid f
    bl vTaskSwitchContext
    cpsie f
    pop {r3}
    
    /* Load new context */
    ldr r1, [r3]
    ldr r0, [r1]
    
    ldmia r0!, {r4-r11, lr}
    
    tst lr, #0x10
    it eq
    vldmiaeq r0!, {s16-s31}
    
    msr psp, r0
    isb
    bx lr   ; hardware pops xPSR, PC, etc.
```

50 cycle 이내 context switch (Cortex-M4 @ 168 MHz → 300 ns).

## queue.c — IPC 기반

### Queue·Semaphore·Mutex 통합

```c
typedef struct QueueDefinition {
    int8_t *pcHead;
    int8_t *pcWriteTo;
    union {
        int8_t *pcReadFrom;        /* queue */
        UBaseType_t uxRecursiveCallCount;   /* recursive mutex */
    } u;
    
    List_t xTasksWaitingToSend;
    List_t xTasksWaitingToReceive;
    
    volatile UBaseType_t uxMessagesWaiting;
    UBaseType_t uxLength;
    UBaseType_t uxItemSize;
    
    volatile int8_t cRxLock;
    volatile int8_t cTxLock;
    
    /* For mutex */
    UBaseType_t uxQueueType;
} Queue_t;

typedef Queue_t Semaphore_t;
typedef Queue_t Mutex_t;
```

Queue·semaphore·mutex 모두 *Queue_t 재활용* — single implementation.

## xQueueGenericSend

```c
BaseType_t xQueueGenericSend(QueueHandle_t xQueue, const void *pvItemToQueue,
                              TickType_t xTicksToWait, BaseType_t xCopyPosition) {
    Queue_t *pxQueue = xQueue;
    
    for (;;) {
        taskENTER_CRITICAL();
        {
            if (pxQueue->uxMessagesWaiting < pxQueue->uxLength) {
                prvCopyDataToQueue(pxQueue, pvItemToQueue, xCopyPosition);
                
                /* Wake receiver if waiting */
                if (listLIST_IS_EMPTY(&pxQueue->xTasksWaitingToReceive) == pdFALSE) {
                    if (xTaskRemoveFromEventList(&pxQueue->xTasksWaitingToReceive) != pdFALSE) {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
                taskEXIT_CRITICAL();
                return pdPASS;
            }
            else {
                if (xTicksToWait == 0) {
                    taskEXIT_CRITICAL();
                    return errQUEUE_FULL;
                }
                /* Block */
                vTaskPlaceOnEventList(&pxQueue->xTasksWaitingToSend, xTicksToWait);
            }
        }
        taskEXIT_CRITICAL();
        portYIELD_WITHIN_API();
        /* Retry after wakeup */
    }
}
```

Critical section + event list wait — classical RTOS pattern.

## port.c — Architecture Layer

### Cortex-M4F port.c

```c
BaseType_t xPortStartScheduler(void) {
    /* Set PendSV·SysTick lowest priority */
    portNVIC_SHPR3_REG |= portNVIC_PENDSV_PRI;
    portNVIC_SHPR3_REG |= portNVIC_SYSTICK_PRI;
    
    /* Setup SysTick */
    vPortSetupTimerInterrupt();
    
    /* Initialize FPU (if used) */
    vPortEnableVFP();
    *(portFPCCR) |= portASPEN_AND_LSPEN_BITS;
    
    /* Start first task — SVC */
    __asm volatile (
        "svc 0  \n"   /* trigger SVC handler */
    );
    
    return 0;
}
```

`svc 0` → `SVC_Handler` → 첫 task의 context를 PSP에 setup + jump.

## SysTick — Time Tick

```c
void xPortSysTickHandler(void) {
    portDISABLE_INTERRUPTS();
    {
        if (xTaskIncrementTick() != pdFALSE) {
            /* Higher priority task ready — yield */
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    portENABLE_INTERRUPTS();
}
```

매 tick — *time slice expired·delay 만료* 검사. Higher ready → PendSV.

## Critical Section — BASEPRI

```c
#define portDISABLE_INTERRUPTS() \
    __asm volatile ( \
        "msr basepri, %0\n" \
        "isb\n" "dsb\n" \
        : : "r"(configMAX_SYSCALL_INTERRUPT_PRIORITY) \
    )

#define portENABLE_INTERRUPTS()  __set_BASEPRI(0)
```

BASEPRI 사용 — *high priority IRQ는 통과*. Hard-RT critical IRQ는 *FreeRTOS 영향 없음*.

## CMSIS-RTOS v2 Wrapper

```c
osThreadId_t osThreadNew(osThreadFunc_t func, void *argument,
                          const osThreadAttr_t *attr) {
    /* Wrap xTaskCreate */
    TaskHandle_t handle;
    xTaskCreate(func, attr->name, attr->stack_size / 4,
                argument, attr->priority, &handle);
    return (osThreadId_t)handle;
}
```

CMSIS-RTOS — *vendor 독립 API*. 그러나 FreeRTOS·RTX·Zephyr 모두 wrapper.

## FreeRTOS 11 — SMP

```c
#define configNUMBER_OF_CORES 4

/* Per-core pxCurrentTCB */
TCB_t * volatile pxCurrentTCBs[configNUMBER_OF_CORES];
#define pxCurrentTCB  pxCurrentTCBs[xPortGetCoreID()]
```

SMP — *per-core current* + global ready list. Cortex-A53·Cortex-M55 + M85 etc.

## License

```text
FreeRTOS Kernel — MIT License
  - 자유 사용
  - 상업·임베디드 OK
  - 출처·copyright 유지

FreeRTOS-Plus (extensions):
  - 별도 license — 대부분 commercial 제약 있음
```

## 자주 하는 실수

> ⚠️ `pxTopOfStack` field 위치

```c
typedef struct {
    int dummy;
    StackType_t *pxTopOfStack;   /* ← 첫 필드 아님 → context switch 깨짐 */
} tskTCB;
```

→ 절대 *struct 첫 필드*.

> ⚠️ Port 파일 mix-up

```c
/* Cortex-M4 binary에 Cortex-M3 port */
```

→ chip별 port 정확히. CM3 ≠ CM4 ≠ CM4F ≠ CM7.

> ⚠️ Critical section 길게

```c
taskENTER_CRITICAL();
hash_compute(big_data);   /* ← 수 ms — IRQ 차단 */
taskEXIT_CRITICAL();
```

→ critical은 *수 µs*만.

> ⚠️ Heap_1 + xTaskCreate 반복

```c
/* heap_1 — no free */
xTaskCreate(task, ...);
vTaskDelete(NULL);   /* → memory leak (heap_1) */
```

→ heap_4+ 또는 *static*.

## 정리

- FreeRTOS = **tasks.c + queue.c + port.c**.
- TCB의 `pxTopOfStack` first field.
- Ready list = *priority별 FIFO list*.
- Top-priority lookup = CLZ O(1).
- PendSV = context switch handler.
- BASEPRI critical section — *high IRQ는 통과*.

다음 편은 **Zephyr 소스 분석**.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [5-02: Zephyr 소스](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
