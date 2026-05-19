---
title: "5-04: RTOS 포팅 가이드 — 새 아키텍처에 옮기는 절차"
date: 2026-05-20T05:00:00
description: "FreeRTOS와 Zephyr의 port 계층을 따라가며 새 아키텍처에 RTOS를 옮기는 절차를 정리합니다. initial stack frame, context switch assembly, tick source, critical section primitive까지 한 번에 잡습니다."
series: "Practical RTOS Internals"
seriesOrder: 49
tags: [porting, architecture, port-c, context-switch, tick]
---

## 한 줄 요약

> **"포팅은 여섯 가지만 구현하면 끝납니다."** — 초기 스택, 스케줄러 시작, 수동 yield, tick, critical section 진입/탈출 그리고 context switch 핸들러입니다.

## 어떤 문제를 푸는가

새 SoC가 손에 들어왔는데 공식 BSP가 없거나, 사내 ASIC에 RTOS를 올려야 하거나, 익숙한 RTOS를 *지원되지 않는 RISC-V 변종*에 옮겨야 하는 상황이 의외로 자주 생깁니다. RTOS 본체를 다시 짤 일은 거의 없습니다. *port layer만 새로 작성*하면 됩니다.

이번 편의 목표는 두 가지입니다. 첫째, port layer가 RTOS와 아키텍처 사이에 *정확히 어느 경계*를 그리는지 정리합니다. 둘째, FreeRTOS Cortex-M port를 기준으로 *최소 여섯 가지 구현물*을 추리고, RISC-V와 Cortex-A로 확장될 때 무엇이 추가되는지를 봅니다.

전체 구조를 잡아 두면 새 아키텍처 포팅이 *2~3일짜리 작업*으로 좁혀집니다.

## 포팅 대상 — 여섯 가지 함수

```text
1. pxPortInitialiseStack    — 초기 stack frame을 만들어 둠
2. xPortStartScheduler      — 첫 task로 진입
3. vPortYield               — 수동 reschedule trigger
4. xPortSysTickHandler      — tick interrupt 진입점
5. vPortEnterCritical       — IRQ disable + nesting
6. vPortExitCritical        — IRQ enable + nesting

+ Context switch 본체 (PendSV·trap·SWI 어셈블리)
```

이 여섯 가지가 RTOS 본체와 아키텍처 사이의 *유일한 인터페이스*입니다. 다른 코드는 모두 C 표준에 머뭅니다.

## 1. 초기 스택 프레임

가장 미묘한 부분입니다. *첫 task가 실행되기 전에* stack 위에 *컨텍스트 스위치가 한 번 일어났던 흔적*을 만들어 두어야 합니다. PendSV(또는 trap)가 pop할 때 자동으로 task 진입점으로 점프하도록 모양을 모사합니다.

```c
StackType_t *pxPortInitialiseStack(StackType_t *pxTopOfStack,
                                    TaskFunction_t pxCode,
                                    void *pvParameters)
{
    /* Cortex-M의 하드웨어 stack frame */
    pxTopOfStack--; *pxTopOfStack = portINITIAL_XPSR;          /* Thumb bit */
    pxTopOfStack--; *pxTopOfStack = (StackType_t)pxCode;       /* PC */
    pxTopOfStack--; *pxTopOfStack = (StackType_t)prvTaskExitError;  /* LR */
    pxTopOfStack -= 5;                                          /* R12,R3,R2,R1 */
    *pxTopOfStack = (StackType_t)pvParameters;                 /* R0 */

    /* 소프트웨어 stack frame — R4-R11 */
    pxTopOfStack -= 8;
    return pxTopOfStack;
}
```

Cortex-M에서는 하드웨어가 IRQ entry/exit에서 R0-R3, R12, LR, PC, xPSR을 *자동 push/pop*합니다. 그래서 초기 stack에 *하드웨어가 pop할 영역*과 *소프트웨어가 직접 복원할 영역*을 둘 다 미리 깔아 둡니다.

첫 PendSV가 끝나면 자연스럽게 R0=`pvParameters`, PC=`pxCode` 상태로 task가 시작됩니다.

## 2. 스케줄러 시작

```c
BaseType_t xPortStartScheduler(void)
{
    portNVIC_SHPR3_REG |= portNVIC_PENDSV_PRI;     /* PendSV·SysTick 최저 */
    portNVIC_SHPR3_REG |= portNVIC_SYSTICK_PRI;

    portNVIC_SYSTICK_LOAD = (configCPU_CLOCK_HZ / configTICK_RATE_HZ) - 1;
    portNVIC_SYSTICK_CTRL = portNVIC_SYSTICK_ENABLE | portNVIC_SYSTICK_INT
                          | portNVIC_SYSTICK_CLK;

    vPortEnableVFP();
    *(portFPCCR) |= portASPEN_AND_LSPEN_BITS;

    __asm volatile ("svc 0");      /* 첫 task로 진입 */
    return 0;                       /* never reached */
}
```

PendSV는 *항상 최저 priority*여야 합니다. 그래야 다른 모든 IRQ가 끝난 뒤에야 컨텍스트 스위치가 일어납니다. SysTick도 같은 priority로 두는 것이 보통입니다.

`svc 0`이 `SVC_Handler`로 진입하면 그 안에서 `pxCurrentTCB`의 stack을 PSP로 옮기고 `bx lr`로 빠져나오면서 첫 task가 시작됩니다.

## 3. 수동 yield

`taskYIELD()` 호출 시 PendSV bit를 set해 컨텍스트 스위치를 *명시적으로* 요청합니다.

```c
static inline void vPortYield(void)
{
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    __asm volatile ("dsb" ::: "memory");
    __asm volatile ("isb");
}
```

`dsb`와 `isb`가 핵심입니다. PendSV가 *즉시* 발생해 다음 명령 전에 컨텍스트 스위치가 일어나도록 메모리 배리어를 강제합니다.

## 4. Tick 핸들러

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

Tick의 두 역할이 한 줄에 모입니다. *time slice 만료* 검사와 *delay countdown*입니다. `xTaskIncrementTick`이 더 높은 priority task를 ready로 만들었다면 PendSV를 set해 핸들러 복귀 직후 스위치를 트리거합니다.

## 5/6. Critical Section

```c
static portFORCE_INLINE void vPortEnterCritical(void)
{
    portDISABLE_INTERRUPTS();
    uxCriticalNesting++;
}

static portFORCE_INLINE void vPortExitCritical(void)
{
    if (--uxCriticalNesting == 0) {
        portENABLE_INTERRUPTS();
    }
}

#define portDISABLE_INTERRUPTS()  \
    __set_BASEPRI(configMAX_SYSCALL_INTERRUPT_PRIORITY)
#define portENABLE_INTERRUPTS()   __set_BASEPRI(0)
```

nesting counter가 *중첩 critical section*을 안전하게 만듭니다. 안쪽 함수가 critical 안에서 또 critical을 호출해도 *가장 바깥*에서만 IRQ가 다시 enable됩니다.

BASEPRI를 쓰면 *configMAX_SYSCALL_INTERRUPT_PRIORITY*보다 낮은 IRQ만 막힙니다. 높은 priority의 hard-RT IRQ는 critical section 안에서도 통과합니다.

## PendSV 핸들러 — 컨텍스트 스위치 본체

```asm
PendSV_Handler:
    cpsid i                     ; disable IRQ
    mrs r0, psp
    isb

    ldr r3, =pxCurrentTCB
    ldr r2, [r3]

    ; FPU 컨텍스트 (lazy stacking 체크)
    tst lr, #0x10
    it eq
    vstmdbeq r0!, {s16-s31}

    ; R4-R11 + EXC_RETURN
    stmdb r0!, {r4-r11, lr}
    str r0, [r2]                ; SP 저장

    push {r0, r3}
    bl vTaskSwitchContext       ; C 스케줄러 호출
    pop {r0, r3}

    ldr r1, [r3]                ; new pxCurrentTCB
    ldr r0, [r1]                ; new SP
    ldmia r0!, {r4-r11, lr}

    tst lr, #0x10
    it eq
    vldmiaeq r0!, {s16-s31}

    msr psp, r0
    isb
    cpsie i
    bx lr                       ; HW pops {R0-R3,R12,LR,PC,xPSR}
```

Cortex-M4F 168 MHz 기준 30~50 사이클이면 끝납니다. *FPU lazy stacking*을 잘못 다루면 다음 task가 *FPU 레지스터 garbage*를 가지고 시작하므로 `tst lr, #0x10`으로 EXC_RETURN의 *FP 비트*를 확인하는 것이 중요합니다.

## RISC-V Port — Trap 한 진입점

```asm
trap_handler:
    csrrw sp, mscratch, sp      ; user SP ↔ kernel SP swap
    addi sp, sp, -(32 * 4)
    sw x1, 1*4(sp)
    sw x2, 2*4(sp)
    /* x3..x31 저장 */

    csrr a0, mcause
    csrr a1, mepc
    call handle_trap            ; C 핸들러 — 결과적으로 새 task SP 반환

    lw x1, 1*4(sp)
    /* 복원 */
    addi sp, sp, 32 * 4
    csrrw sp, mscratch, sp
    mret
```

RISC-V는 *trap entry가 한 곳*으로 모입니다. timer interrupt, ecall, exception이 같은 `mtvec`을 거치므로 핸들러 진입에서 `mcause`를 분기합니다. `mscratch`에 kernel SP를 보관해 user/kernel SP swap을 한 명령으로 처리하는 패턴이 ARM의 MSP/PSP와 비슷합니다.

자세한 컨텍스트 스위치 절차는 [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)에서 다룹니다.

## Cortex-A Port — 더 큰 컨텍스트

Cortex-A는 컨텍스트가 훨씬 큽니다.

```text
Cortex-A 컨텍스트:
  R0-R15 + CPSR + 모드별 SPSR
  VFP/NEON s0-s31 또는 d0-d31
  여러 mode (SVC·IRQ·FIQ·Abort·System·User)
  MMU page table base (TTBR0/TTBR1)
  L1·L2 cache 영향

포팅 분량: Cortex-M port의 약 5배
```

GIC를 통한 interrupt routing, generic timer 기반 tick, EL0/EL1 분리(armv8) 같은 요소가 추가됩니다.

```c
void vPortSetupTimerInterrupt(void)
{
    uint64_t freq;
    __asm volatile ("mrs %0, cntfrq_el0" : "=r"(freq));
    uint64_t reload = freq / configTICK_RATE_HZ;
    __asm volatile ("msr cntp_tval_el0, %0" :: "r"(reload));
    __asm volatile ("msr cntp_ctl_el0, %0" :: "r"(1U));
    gic_enable_irq(TIMER_IRQ);
}
```

Cortex-A의 `cntpct_el0`는 *모든 코어가 공유하는 free-running counter*입니다. SMP에서 코어별로 같은 시간 축을 보장하므로 tick source로 적합합니다.

## SMP Port — Per-Core current

```c
TCB_t *pxCurrentTCBs[configNUMBER_OF_CORES];
#define pxCurrentTCB pxCurrentTCBs[portGET_CORE_ID()]

static inline uint32_t portGET_CORE_ID(void)
{
    uint32_t mpidr;
    __asm volatile ("mrs %0, mpidr_el1" : "=r"(mpidr));
    return mpidr & 0xFF;
}
```

`pxCurrentTCB`를 코어 수만큼 둡니다. 단일 코어 코드가 매크로만으로 SMP에서 동작하도록 설계된 부분입니다. critical section은 *spinlock + IRQ disable* 조합으로 확장됩니다. 자세한 구조는 [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 다룹니다.

## Zephyr arch/ 디렉터리

Zephyr는 *arch와 SoC를 분리*합니다.

```text
zephyr/arch/
├── arm/
│   └── core/cortex_m/        # 공통 Cortex-M
├── riscv/
└── arm64/

zephyr/soc/
├── arm/st_stm32/
├── riscv/sifive_freedom/
└── ...
```

새 SoC를 지원하려면 `soc/` 아래 디렉터리를 만들고 devicetree binding을 추가합니다. arch 자체에 손댈 일은 *완전히 새 ISA가 아닌 한* 거의 없습니다.

## Tickless Idle Port

```c
void portSUPPRESS_TICKS_AND_SLEEP(TickType_t xExpectedIdleTime)
{
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;
    SysTick->LOAD = xExpectedIdleTime *
                    (configCPU_CLOCK_HZ / configTICK_RATE_HZ);
    SysTick->VAL = 0;
    SysTick->CTRL |= SysTick_CTRL_ENABLE_Msk;

    __WFI();

    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;
    TickType_t elapsed = /* counter에서 계산 */;
    vTaskStepTick(elapsed);

    SysTick->LOAD = (configCPU_CLOCK_HZ / configTICK_RATE_HZ) - 1;
    SysTick->VAL = 0;
    SysTick->CTRL |= SysTick_CTRL_ENABLE_Msk;
}
```

idle 시 SysTick을 *다음 wake까지의 시간*으로 재설정하고 `WFI`로 CPU를 잠재웁니다. 깨어난 뒤 경과 시간을 `vTaskStepTick`으로 보정합니다. 배터리 구동 시스템에서 핵심적인 power 절감 경로입니다.

## 새 아키텍처에 옮길 때 — 단계 절차

```text
1. Toolchain 준비
   - GCC·LLVM·proprietary 컴파일러
   - newlib 또는 musl libc

2. Initial stack frame 결정
   - 어느 레지스터를 stack에 미리 깔 것인가
   - 첫 task entry로 어떻게 점프시킬 것인가

3. Context switch 어셈블리
   - callee-saved 레지스터 save/restore
   - SP swap
   - FPU/Vector 레지스터 lazy 전략

4. Tick source
   - SysTick·architectural timer·external timer
   - IRQ 등록 + priority

5. Critical section primitive
   - IRQ disable/enable
   - atomic 명령 (LDREX/STREX, LR/SC, csrrci)

6. 검증
   - 단순 task 두 개로 ping-pong delay
   - semaphore·queue 단위 테스트
   - stack overflow hook 동작 확인
```

FreeRTOS는 `portable/` 아래 *port template*을 두고 있고, Zephyr는 `arch/template`이 있으니 그대로 복사해서 시작하는 편이 빠릅니다.

## 자주 보는 함정

> 경고 — EXC_RETURN 값 잘못

Cortex-M에서 PendSV 진입 시 LR에 들어 있는 *EXC_RETURN*은 정확한 비트 패턴이어야 합니다. PSP·Thumb·non-FP 컨텍스트의 경우 `0xFFFFFFFD`입니다. 잘못 저장/복원하면 다음 task의 첫 명령에서 hard fault가 납니다.

> 경고 — PendSV priority를 최고로 설정

```c
portNVIC_PENDSV_PRI = 0;   /* 최고 priority */
```

PendSV는 *최저 priority*여야 합니다. 그래야 다른 ISR이 모두 끝난 뒤에야 컨텍스트 스위치가 일어납니다. 잘못 설정하면 IRQ 안에서 컨텍스트 스위치가 발생해 어셈블리 상태가 깨집니다.

> 경고 — Tick frequency 과도

```c
configTICK_RATE_HZ = 10000;   /* 100 µs tick */
```

매 tick의 SysTick ISR + 잠재적 PendSV로 overhead가 누적됩니다. 일반 시스템에서는 1000 Hz가 표준이고, tickless를 켜면 더 낮춰도 무방합니다.

> 경고 — Critical section nesting 무시

```c
portENTER_CRITICAL();
portENTER_CRITICAL();
portEXIT_CRITICAL();    /* 여기서 IRQ가 풀려 버림 */
portEXIT_CRITICAL();
```

nesting counter 없이 IRQ를 직접 enable/disable하면 안쪽 함수가 critical 안에서 또 critical을 호출했을 때 *가장 안쪽 EXIT*에서 IRQ가 풀려 race가 발생합니다.

> 경고 — FPU lazy stacking 무시

Cortex-M4F에서 FPU를 사용하면 EXC_RETURN의 FP 비트를 확인해 S16-S31을 *조건부로* save/restore해야 합니다. 무조건 저장하면 overhead가 늘고, 무조건 생략하면 다음 task가 *FPU garbage*를 가지고 시작합니다.

## 정리

- RTOS 포팅은 *여섯 가지 함수 + 컨텍스트 스위치 어셈블리*로 좁힙니다.
- 초기 스택 프레임은 *컨텍스트 스위치가 한 번 일어났던 흔적*을 미리 만들어 두는 작업입니다.
- 스케줄러 시작은 SVC나 trap을 거쳐 첫 task의 PSP를 set하고 진입점으로 점프합니다.
- Tick은 *time slice 만료*와 *delay countdown*을 함께 처리하며, 필요 시 PendSV를 set해 스위치를 트리거합니다.
- Critical section은 nesting counter + IRQ disable로 *중첩 안전*을 보장합니다.
- RISC-V는 trap이 한 진입점으로 모이며, `mscratch`로 SP swap을 한 명령에 처리합니다.
- Cortex-A는 컨텍스트와 mode가 많아 포팅 분량이 약 5배로 늘고, GIC와 generic timer가 추가됩니다.
- SMP는 `pxCurrentTCB`를 코어별 배열로 두고 spinlock을 더하는 확장이며, 매크로 한 줄로 단일 코어 코드와 호환을 유지합니다.

다음 편은 [5-05 RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)에서 프로젝트별로 어떤 RTOS를 골라야 하는지 결정 매트릭스를 정리합니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-10: Syscall 구현](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
