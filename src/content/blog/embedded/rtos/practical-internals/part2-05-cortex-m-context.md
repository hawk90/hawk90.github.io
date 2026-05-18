---
title: "2-05: ARM Cortex-M Context Switch — PendSV, MSP/PSP, 어셈블리"
date: 2026-05-12T15:00:00
description: "Cortex-M의 PendSV 예외가 context switch의 정석. SVC로 첫 task 시작, PendSV로 전환."
series: "Practical RTOS Internals"
seriesOrder: 15
tags: [cortex-m, pendsv, msp, psp, svc, assembly]
draft: true
---

## 한 줄 요약

> **"PendSV = Cortex-M context switch"** — 우선순위 *최저*로 설정해 *다른 ISR 모두 끝난 후*에만 전환.

## 왜 PendSV인가

ISR 도중 *직접 context switch*하면:
- Pending IRQ들이 *대기*
- 예외 nesting 복잡
- HW state 깨질 위험

해결 — **PendSV 예외 + 최저 priority**:

```c
// FreeRTOSConfig.h
#define configKERNEL_INTERRUPT_PRIORITY     (255)   // 가장 낮음 (Cortex-M 8-bit)
```

PendSV는 *모든 다른 ISR 끝난 후*에만 실행. Context switch가 *예외 chain의 마지막*에서 발생 → 깔끔.

## PendSV Trigger

```c
// FreeRTOS portYIELD()
#define portYIELD()                                  \
{                                                    \
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;  \
    __dsb(portSY_FULL_READ_WRITE);                   \
    __isb(portSY_FULL_READ_WRITE);                   \
}
```

ICSR (Interrupt Control and State Register)의 *PENDSVSET bit*에 1 쓰기 → PendSV pending. 가능한 시점에 실행.

## PendSV Handler — 어셈블리

```asm
xPortPendSVHandler:
    mrs r0, psp                /* 현재 task의 PSP 읽기 */
    isb

    ldr r3, =pxCurrentTCB      /* TCB pointer 주소 */
    ldr r2, [r3]               /* TCB 자체 */

    /* R4-R11 push (HW가 자동 push 안 한 것들) */
    stmdb r0!, {r4-r11}

    /* TCB->pxTopOfStack = r0 (새 SP) */
    str r0, [r2]

    /* Critical section — scheduler 호출 동안 IRQ mask */
    stmdb sp!, {r3, r14}
    mov r0, #configMAX_SYSCALL_INTERRUPT_PRIORITY
    msr basepri, r0
    dsb
    isb

    bl vTaskSwitchContext      /* pxCurrentTCB 갱신 */

    mov r0, #0
    msr basepri, r0            /* IRQ unmask */
    ldmia sp!, {r3, r14}

    /* 새 task 로드 */
    ldr r1, [r3]               /* 새 pxCurrentTCB */
    ldr r0, [r1]               /* 새 pxTopOfStack */
    ldmia r0!, {r4-r11}        /* R4-R11 pop */
    msr psp, r0                /* PSP 갱신 */
    isb
    bx r14                     /* Exception return → HW가 R0-R3, R12, LR, PC, xPSR pop */
```

**핵심 단계**:
1. 현재 task의 SP (PSP) 캡처
2. R4-R11을 그 stack에 push
3. TCB->pxTopOfStack = 새 SP 저장
4. `vTaskSwitchContext()` 호출 → pxCurrentTCB 갱신
5. 새 TCB에서 새 pxTopOfStack 로드
6. R4-R11 pop
7. Exception return → HW 자동 pop으로 *새 task 코드*에 jump

## MSP vs PSP

```text
Reset → MSP 사용 → main()
                ↓
        RTOS 초기화 → 첫 task로 SVC trigger
                ↓
        SVC handler가 PSP 설정 + CONTROL.SPSEL=1
                ↓
        Exception return → PSP로 task 코드 진입

ISR 진입: 현재 SP가 PSP면 → MSP로 자동 전환
ISR 도중: MSP 사용
ISR 종료: 원래 (PSP 또는 MSP)로 복귀
```

**CONTROL register**:
- Bit 0 (nPRIV): 0=privileged, 1=unprivileged
- Bit 1 (SPSEL): 0=MSP, 1=PSP

## FreeRTOS port.c — 첫 Task 시작

```c
BaseType_t xPortStartScheduler(void) {
    /* ... NVIC 설정 ... */
    portNVIC_SYSPRI2_REG = configKERNEL_INTERRUPT_PRIORITY;  // PendSV 최저
    portNVIC_SYSPRI3_REG = configKERNEL_INTERRUPT_PRIORITY;  // SysTick 최저
    
    vPortStartFirstTask();    /* asm — 첫 task로 jump */
    return 0;                  /* 도달 안 함 */
}

vPortStartFirstTask:
    ldr r0, =0xE000ED08        /* VTOR */
    ldr r0, [r0]
    ldr r0, [r0]               /* MSP 초기값 = vector table[0] */
    msr msp, r0
    cpsie i                    /* IRQ enable */
    cpsie f
    dsb
    isb
    svc 0                       /* SVC → vPortSVCHandler */
    nop
```

## vPortSVCHandler — SVC로 PSP 설정

```asm
vPortSVCHandler:
    ldr r3, =pxCurrentTCB
    ldr r1, [r3]
    ldr r0, [r1]                /* 첫 task의 pxTopOfStack */
    ldmia r0!, {r4-r11}         /* R4-R11 pop */
    msr psp, r0                 /* PSP 설정 */
    isb
    mov r0, #0
    msr basepri, r0
    orr r14, #0xd               /* exception return = thread mode, PSP */
    bx r14                      /* HW pop으로 task 코드 jump */
```

`r14 = 0xFFFFFFFD` (exception return value) — *thread mode, PSP 사용*. HW가 그 의미대로 unstack.

## SysTick — Time Slicing

```c
void xPortSysTickHandler(void) {
    /* IRQ mask */
    vPortRaiseBASEPRI();
    
    if (xTaskIncrementTick() != pdFALSE) {
        /* preempt 필요 → PendSV pending */
        portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    }
    
    vPortClearBASEPRIFromISR();
}
```

매 1 ms SysTick → tick count 증가 → preempt 결정 시 PendSV trigger.

## Lazy FPU Stacking

```c
#define configENABLE_FPU            1
#define configENABLE_MPU            0
```

FPU 활성 시 — *FP regs 사용 task만* 추가 push. CONTROL.FPCA bit로 추적. PendSV handler에 *FPU 처리 코드*가 자동 들어감.

```asm
/* FPU 부분 — FreeRTOS port */
tst r14, #0x10                 /* FPCA bit */
it eq
vstmdbeq r0!, {s16-s31}       /* FPU 사용 시 push */
```

## 인터럽트 Mask

| Method | 효과 |
| --- | --- |
| `cpsid i` | 모든 IRQ mask (PRIMASK) |
| `BASEPRI = N` | priority ≤ N IRQ만 mask |

FreeRTOS는 **BASEPRI** 선호 — *RTOS IRQ만 mask, 고우선 HW IRQ는 계속 동작*.

```c
#define configMAX_SYSCALL_INTERRUPT_PRIORITY  5
// priority 0-4는 mask 안 됨 — 안전 critical HW IRQ
// priority 5+는 mask 가능 — 일반 ISR
```

## SVC vs PendSV — 언제 어느 것

| | SVC | PendSV |
| --- | --- | --- |
| **트리거** | `SVC #N` instruction | ICSR.PENDSVSET = 1 |
| **Priority** | 임의 | 최저 |
| **용도** | API entry, 첫 task 시작 | Context switch |
| **Nested IRQ 시** | 즉시 trap | 다른 IRQ 후 |

## 자주 하는 실수

> ⚠️ PendSV priority 잘못

`configKERNEL_INTERRUPT_PRIORITY`보다 높이 설정 → 다른 ISR이 PendSV 중 끼어들면 context corruption.

> ⚠️ MSP에서 task 코드 시도

CONTROL.SPSEL 설정 안 함 → MSP 위에서 task 실행 → ISR과 stack 충돌.

> ⚠️ FPU enable 후 lazy stacking 인지 안 함

ISR에서 FPU 명령 사용 시 task의 FP context 손실.

> ⚠️ `cpsid i`로 모든 IRQ mask

고우선 HW critical IRQ까지 막힘. BASEPRI 사용.

## 정리

- **PendSV** = Cortex-M context switch 메커니즘 (priority 최저).
- **MSP** = ISR·OS, **PSP** = task. CONTROL.SPSEL로 결정.
- SVC = 첫 task 시작·OS API entry.
- BASEPRI mask = RTOS critical section.
- FPU lazy stacking으로 FP 미사용 task overhead 0.

다음 편은 **ARM Cortex-A Context Switch** — SVC·모드 전환.

## 관련 항목

- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
- [2-06: Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [1-05: 인터럽트와 RTOS (BASEPRI)](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
