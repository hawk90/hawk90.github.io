---
title: "5-04: RTOS Porting — Architecture·Context Switch·Tick·6 함수"
date: 2026-05-20T05:00:00
description: "RTOS를 새 architecture에 포팅. port.c·portmacro.h·portasm.s. 6개 핵심 함수."
series: "Practical RTOS Internals"
seriesOrder: 49
tags: [porting, architecture, port-c, context-switch]
draft: true
---

## 한 줄 요약

> **"RTOS porting = 6 함수만 구현하면 됨"** — Context save/restore + tick + critical section.

## 포팅 대상 — 6 핵심 함수

```text
1. pxPortInitialiseStack    — 초기 stack 구성
2. xPortStartScheduler      — scheduler 시작
3. vPortYield               — manual yield
4. vPortSysTickHandler      — tick interrupt
5. vPortEnterCritical       — IRQ disable
6. vPortExitCritical        — IRQ enable

+ Context switch assembly (PendSV·SWI·trap)
```

각 architecture별 *port directory*에 구현.

## 1. pxPortInitialiseStack

```c
StackType_t *pxPortInitialiseStack(
    StackType_t *pxTopOfStack,
    TaskFunction_t pxCode,
    void *pvParameters)
{
    /* 초기 stack frame — context switch 시 *pop될 register* 들 설정 */
    
    /* Cortex-M 예 */
    pxTopOfStack--; *pxTopOfStack = portINITIAL_XPSR;        /* xPSR */
    pxTopOfStack--; *pxTopOfStack = (StackType_t)pxCode;     /* PC */
    pxTopOfStack--; *pxTopOfStack = (StackType_t)prvTaskExitError;  /* LR */
    pxTopOfStack -= 5;                                        /* R12 R3 R2 R1 */
    *pxTopOfStack = (StackType_t)pvParameters;               /* R0 */
    pxTopOfStack -= 8;                                        /* R4-R11 */
    
    return pxTopOfStack;
}
```

Task 첫 실행 — *fake context switch*. Hardware pop이 R0=parameters·PC=entry로 자동 설정.

## 2. xPortStartScheduler

```c
BaseType_t xPortStartScheduler(void)
{
    /* 1. PendSV·SysTick priority 설정 (lowest) */
    portNVIC_SHPR3_REG |= portNVIC_PENDSV_PRI;
    portNVIC_SHPR3_REG |= portNVIC_SYSTICK_PRI;
    
    /* 2. SysTick 시작 (configTICK_RATE_HZ) */
    portNVIC_SYSTICK_LOAD = (configCPU_CLOCK_HZ / configTICK_RATE_HZ) - 1;
    portNVIC_SYSTICK_CTRL = portNVIC_SYSTICK_ENABLE | ...;
    
    /* 3. FPU 활성 (옵션) */
    
    /* 4. 첫 task로 jump — SVC 또는 직접 manipulation */
    __asm volatile ("svc 0");
    
    return 0;   /* never reached */
}
```

SVC_Handler가 *첫 task의 PSP 설정 + bx lr* → 첫 task 실행.

## 3. vPortYield — Manual Reschedule

```c
void vPortYield(void)
{
    /* PendSV trigger */
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    
    /* Memory barrier — PendSV 즉시 발생 보장 */
    __asm volatile ("dsb" ::: "memory");
    __asm volatile ("isb");
}
```

`taskYIELD()` 호출 시 — `vPortYield()` → PendSV 발생 → context switch.

## 4. SysTick Handler

```c
void xPortSysTickHandler(void)
{
    /* Critical section */
    uint32_t prev_basepri = ulPortRaiseBASEPRI();
    {
        /* Tick increment + 깨어날 task check */
        if (xTaskIncrementTick() != pdFALSE) {
            /* Higher priority task ready → PendSV */
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    vPortSetBASEPRI(prev_basepri);
}
```

Tick의 *두 역할* — time slice + delay countdown.

## 5/6. Critical Section

```c
static inline void vPortEnterCritical(void)
{
    portDISABLE_INTERRUPTS();
    /* nesting count */
    uxCriticalNesting++;
}

static inline void vPortExitCritical(void)
{
    if (--uxCriticalNesting == 0) {
        portENABLE_INTERRUPTS();
    }
}

#define portDISABLE_INTERRUPTS() \
    __set_BASEPRI(configMAX_SYSCALL_INTERRUPT_PRIORITY)

#define portENABLE_INTERRUPTS()  __set_BASEPRI(0)
```

Nesting count — *중첩 critical 안전*.

## PendSV Handler — Context Switch

```asm
PendSV_Handler:
    cpsid i                     ; disable IRQ
    
    mrs r0, psp                 ; current task SP
    isb
    
    ldr r3, =pxCurrentTCB       ; current TCB
    ldr r2, [r3]
    
    ; Save FPU context (if used)
    tst lr, #0x10
    it eq
    vstmdbeq r0!, {s16-s31}
    
    ; Save R4-R11 + LR (EXC_RETURN)
    stmdb r0!, {r4-r11, lr}
    
    str r0, [r2]                ; save SP to TCB
    
    ; Call C scheduler
    push {r0, r3}
    bl vTaskSwitchContext
    pop {r0, r3}
    
    ; Load new task context
    ldr r1, [r3]                ; new pxCurrentTCB
    ldr r0, [r1]                ; new SP
    
    ldmia r0!, {r4-r11, lr}
    
    tst lr, #0x10
    it eq
    vldmiaeq r0!, {s16-s31}
    
    msr psp, r0
    isb
    
    cpsie i                     ; enable IRQ
    bx lr                       ; hw pops {R0-R3, R12, LR, PC, xPSR}
```

~30-50 cycle context switch. Cortex-M4 168 MHz → 300 ns.

## RISC-V Port — Different

```asm
trap_handler:
    csrrw sp, mscratch, sp      ; swap user SP ↔ kernel SP
    
    addi sp, sp, -(32 * 4)
    sw x1, 1*4(sp)
    sw x2, 2*4(sp)
    ; ... save all x4-x31
    
    csrr a0, mcause
    csrr a1, mepc
    
    call handle_trap
    
    ; Restore — possibly different context (new task)
    lw x1, 1*4(sp)
    ; ...
    addi sp, sp, 32 * 4
    
    csrrw sp, mscratch, sp
    mret
```

RISC-V — `mscratch` register로 kernel SP 보관. ARM Cortex-M MSP/PSP과 비슷.

## Cortex-A Port — More Complex

```text
Cortex-A:
  - 더 큰 register set (R0-R15 + CPSR + SPSR_*)
  - Multiple modes (SVC·IRQ·FIQ·Abort·System·User)
  - VFP·NEON registers (s0-s31 또는 d0-d31)
  - MMU·page table
  - Cache (L1·L2)
  
Port 복잡도 — Cortex-M의 ~5x
```

`portable/GCC/ARM_CA9/port.c` — FreeRTOS Cortex-A9 port. Linux kernel 같은 *큰 context*.

## SMP Port — Per-Core

```c
/* FreeRTOS 11 SMP */
TCB_t *pxCurrentTCBs[configNUMBER_OF_CORES];
#define pxCurrentTCB pxCurrentTCBs[portGET_CORE_ID()]

static inline uint32_t portGET_CORE_ID(void) {
    uint32_t mpidr;
    __asm volatile ("mrs %0, mpidr_el1" : "=r"(mpidr));
    return mpidr & 0xFF;
}
```

Per-core current task + spinlock 추가.

## Tick Source — Generic Timer

```c
/* Cortex-A — generic timer */
vPortSetupTimerInterrupt(void) {
    uint64_t freq;
    __asm volatile ("mrs %0, cntfrq_el0" : "=r"(freq));
    
    uint64_t reload = freq / configTICK_RATE_HZ;
    __asm volatile ("msr cntp_tval_el0, %0" :: "r"(reload));
    __asm volatile ("msr cntp_ctl_el0, %0" :: "r"(1));   /* enable */
    
    /* Register IRQ handler */
    gic_enable_irq(TIMER_IRQ);
}
```

Cortex-A generic timer (CNTPCT) — *각 core 동기*. SMP에 적합.

## Tickless Idle Port

```c
/* configUSE_TICKLESS_IDLE = 1 */
void portSUPPRESS_TICKS_AND_SLEEP(TickType_t xExpectedIdleTime) {
    /* SysTick 정지 */
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;
    
    /* 다음 expiry까지 sleep */
    SysTick->LOAD = xExpectedIdleTime * (configCPU_CLOCK_HZ / configTICK_RATE_HZ);
    SysTick->VAL = 0;
    SysTick->CTRL |= SysTick_CTRL_ENABLE_Msk;
    
    __WFI();   /* CPU sleep */
    
    /* Wake — elapsed 계산 */
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;
    TickType_t elapsed = ...;
    vTaskStepTick(elapsed);
    
    /* Restore normal tick */
    SysTick->LOAD = (configCPU_CLOCK_HZ / configTICK_RATE_HZ) - 1;
    SysTick->VAL = 0;
    SysTick->CTRL |= SysTick_CTRL_ENABLE_Msk;
}
```

Sleep 모드 진입 + tick 자동 catch-up. Battery 절약.

## 새 Architecture Port 단계

```text
1. Toolchain 준비
   - GCC·LLVM·proprietary
   - newlib·musl libc
   
2. Initial stack frame 정의
   - 어느 register를 stack에 두나?
   - 첫 task 실행 시 어떻게 jump?
   
3. Context switch routine
   - Save all callee-saved register
   - Switch SP
   - Restore new register
   
4. Tick source
   - Architectural timer 또는 별도 timer
   - Interrupt handler 등록
   
5. Critical section primitive
   - IRQ disable/enable
   - Atomic 명령 (LDREX/STREX 또는 LR/SC)
   
6. Test
   - 단순 task 2개 — 무한 loop with delay
   - Mutex·queue 단위 테스트
```

FreeRTOS·Zephyr 모두 *port template* 제공.

## Common Pitfalls

> ⚠️ Initial stack frame 잘못

```c
/* Cortex-M EXC_RETURN value 잘못 → next task에서 fault */
```

→ 정확한 EXC_RETURN: 0xFFFFFFFD (PSP·Thumb·non-FP).

> ⚠️ Pendsv priority 잘못

```c
portNVIC_PENDSV_PRI = 0;   /* highest */
```

→ PendSV는 *lowest priority* — 모든 ISR 끝나고 처리.

> ⚠️ Tick frequency 너무 높음

```c
configTICK_RATE_HZ = 10000;   /* 100 µs tick — overhead 큼 */
```

→ 1000 Hz 표준. Tickless면 더 낮아도 OK.

> ⚠️ Critical section nesting 무시

```c
portENTER_CRITICAL();
portENTER_CRITICAL();
portEXIT_CRITICAL();   /* IRQ 풀림 — 다음 EXIT 무용지물 */
portEXIT_CRITICAL();
```

→ nesting counter.

## 정리

- RTOS porting = **6 함수 + assembly context switch**.
- Initial stack frame = *fake context switch에서 pop될 형태*.
- PendSV·trap = context switch handler.
- Tick = SysTick·architectural timer + 매 tick scheduler invoke.
- Critical section = BASEPRI·`cpsid i`·`csrrci`.
- SMP — per-core current + spinlock 추가.

다음 편은 **RTOS 선택 가이드**.

## 관련 항목

- [5-03: RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)
- [5-05: Selection Guide](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
