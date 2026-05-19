---
title: "2-05: ARM Cortex-M Context Switch — PendSV, MSP/PSP, 어셈블리"
date: 2026-05-07T15:00:00
description: "Cortex-M context switch는 PendSV 예외와 dual-stack 모델로 압축됩니다. FreeRTOS port의 PendSV 핸들러 어셈블리를 한 줄씩 따라가며 EXC_RETURN, BASEPRI, lazy FPU까지 풀어봅니다."
series: "Practical RTOS Internals"
seriesOrder: 15
tags: [cortex-m, pendsv, msp, psp, svc, assembly]
---

## 한 줄 요약

> **"PendSV가 Cortex-M context switch의 정석"** — 우선순위를 최저로 두어 *다른 ISR이 모두 끝난 뒤*에만 전환이 일어나게 합니다.

## 왜 PendSV인가

ISR 한가운데서 *직접* context switch를 시도하면 곤란한 일이 생깁니다.

- 아직 처리 중이던 pending 인터럽트들이 *밀려서 늦어집니다*
- 예외 nesting이 *깊어져 stack frame이 꼬입니다*
- EXC_RETURN 값이 *예상과 달라져* HW state가 깨질 위험이 있습니다

해결책은 *context switch만을 위한 별도 예외*를 두고, 그 예외의 priority를 **가장 낮게** 잡는 것입니다. 그게 **PendSV**입니다.

```c
// port.c — PendSV와 SysTick을 우선순위 최저로
portNVIC_SYSPRI2_REG = portNVIC_PENDSV_PRI;   // PendSV = 0xFF
portNVIC_SYSPRI3_REG = portNVIC_SYSTICK_PRI;  // SysTick도 낮춤
```

이렇게 두면 PendSV는 *다른 모든 ISR이 끝난 뒤*에만 실행됩니다. context switch가 *예외 chain의 가장 끝*에서 일어나므로 nesting이 깨질 일이 없습니다.

## PendSV trigger — yield의 정체

task가 yield 하면 RTOS는 PendSV를 *pending 상태*로 표시합니다.

```c
#define portYIELD()                                  \
{                                                    \
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;  \
    __dsb(portSY_FULL_READ_WRITE);                   \
    __isb(portSY_FULL_READ_WRITE);                   \
}
```

ICSR (Interrupt Control and State Register)의 *PENDSVSET bit*에 1을 쓰면 PendSV가 pending 됩니다. 현재 ISR이 끝나는 순간 (또는 즉시) PendSV가 실행됩니다.

DSB / ISB는 *write가 실제로 끝나고* pipeline이 flush 된 뒤에 진행하게 만드는 barrier입니다. 이게 없으면 CPU가 yield 호출을 *순서 바꿔* 처리할 수 있습니다.

## Dual-stack model — MSP와 PSP

Cortex-M에는 **stack pointer가 두 개** 있습니다.

| | 용도 |
| --- | --- |
| **MSP** (Main Stack Pointer) | Reset, 예외, OS 코드 |
| **PSP** (Process Stack Pointer) | task 코드 |

ISR이 진입할 때 SP는 *자동으로 MSP로 전환*되고, 예외 return 때 원래 (PSP)로 돌아갑니다. 이렇게 둘로 나눠 두면 *task끼리는 PSP만 갈아끼우면 되고* ISR은 항상 같은 MSP를 씁니다. stack 관리가 깔끔해집니다.

전환 흐름은 이렇습니다.

```text
Reset    → MSP 사용 → main()
              ↓
RTOS init  → 첫 task 시작을 위해 SVC trigger
              ↓
SVC handler → PSP 설정 + CONTROL.SPSEL = 1
              ↓
Exception return → PSP로 task code 진입

이후 ISR 진입 → 자동으로 MSP로 전환
이후 ISR 종료 → 원래 (PSP)로 복귀
```

CONTROL register의 *bit 1 (SPSEL)* 이 0이면 MSP, 1이면 PSP입니다.

전체 그림을 한 장으로 정리하면 이렇습니다. HW가 자동 push하는 8개 레지스터와 SW가 push하는 R4-R11이 어떻게 stack에 쌓이고, EXC_RETURN 값이 어떻게 return mode를 결정하는지가 한눈에 보입니다.

![Cortex-M context switch stack frame](/images/blog/rtos/diagrams/part2-05-pendsv-context-save.svg)

## PendSV 핸들러 — 한 줄씩 풀기

FreeRTOS의 `xPortPendSVHandler`를 따라가 봅니다. 16 줄이 채 안 되지만 일어나는 일은 많습니다.

```asm
xPortPendSVHandler:
    mrs r0, psp                /* (1) 현재 task의 PSP를 r0에 */
    isb

    ldr r3, =pxCurrentTCB      /* (2) pxCurrentTCB 변수 주소 */
    ldr r2, [r3]               /* (3) 현재 TCB 포인터 */

    stmdb r0!, {r4-r11}        /* (4) R4-R11을 task stack에 push */

    str r0, [r2]               /* (5) TCB->pxTopOfStack = 새 SP */

    stmdb sp!, {r3, r14}       /* (6) r3, lr 보존 (BL 위함) */
    mov r0, #configMAX_SYSCALL_INTERRUPT_PRIORITY
    msr basepri, r0            /* (7) IRQ mask */
    dsb
    isb

    bl vTaskSwitchContext      /* (8) pxCurrentTCB 갱신 */

    mov r0, #0
    msr basepri, r0            /* (9) IRQ unmask */
    ldmia sp!, {r3, r14}       /* (10) r3, lr 복원 */

    ldr r1, [r3]               /* (11) 새 pxCurrentTCB */
    ldr r0, [r1]               /* (12) 새 pxTopOfStack */
    ldmia r0!, {r4-r11}        /* (13) R4-R11 pop */
    msr psp, r0                /* (14) PSP 갱신 */
    isb
    bx r14                     /* (15) Exception return → HW가 R0-R3, R12, LR, PC, xPSR pop */
```

핵심을 묶어 보면 이렇습니다.

- **(1)~(5)**: 현재 task의 context 마무리 save. HW가 이미 R0-R3 / R12 / LR / PC / xPSR을 PSP에 push해 두었으므로, SW는 R4-R11만 더 push하고 새 SP를 TCB에 기록하면 끝납니다.
- **(6)~(10)**: 스케줄러 호출. `vTaskSwitchContext()`가 다음 task를 정하고 `pxCurrentTCB`를 갱신합니다. 이 동안에는 BASEPRI로 *RTOS critical IRQ만 mask*합니다.
- **(11)~(15)**: 새 task의 context 복원. 새 TCB에서 pxTopOfStack을 가져와 R4-R11을 pop하고 PSP에 기록합니다. `bx r14` (15)에서 *HW가 자동으로* 나머지 8 word를 pop하고 PC가 새 task 코드를 향합니다.

이 마지막 `bx r14`가 마법입니다. `r14`에는 *EXC_RETURN 값*이 들어 있는데, HW가 그 값을 보고 "thread mode + PSP + 가능하다면 FP frame까지" 알아서 처리합니다.

## EXC_RETURN — `r14`의 특수 값

예외 진입 시 LR에 들어오는 값은 일반 return address가 아닙니다. 0xFFFFFFF0 영역의 특수 패턴으로, 어떻게 return할지를 인코딩합니다.

| EXC_RETURN | 의미 |
| --- | --- |
| 0xFFFFFFF1 | Handler mode return (MSP, FP 없음) |
| 0xFFFFFFF9 | Thread mode + MSP |
| 0xFFFFFFFD | Thread mode + PSP |
| 0xFFFFFFE1 | Handler mode + FP frame |
| 0xFFFFFFE9 | Thread mode + MSP + FP frame |
| 0xFFFFFFED | Thread mode + PSP + FP frame |

RTOS task로 돌아갈 때 LR은 거의 항상 **0xFFFFFFFD** (또는 FP 쓰는 task면 0xFFFFFFED) 입니다. `bx r14` 한 줄이 *이 정보를 그대로 HW에 전달*합니다.

## 첫 task 시작 — SVC를 쓰는 이유

부팅 직후에는 *현재 실행 중인 task가 없습니다*. context restore의 대상이 비어 있는 셈입니다. 그래서 FreeRTOS는 *SVC*를 통해 첫 task를 시작합니다.

```asm
vPortStartFirstTask:
    ldr  r0, =0xE000ED08       @ VTOR address
    ldr  r0, [r0]
    ldr  r0, [r0]              @ MSP 초기값 = vector table[0]
    msr  msp, r0               @ MSP 초기화 (kernel 깨끗하게)
    cpsie i                    @ IRQ enable
    cpsie f
    dsb
    isb
    svc 0                      @ SVC trigger
    nop
```

SVC 핸들러가 *첫 task의 context*를 복원합니다.

```asm
vPortSVCHandler:
    ldr  r3, =pxCurrentTCB
    ldr  r1, [r3]
    ldr  r0, [r1]              @ 첫 task의 pxTopOfStack
    ldmia r0!, {r4-r11}        @ R4-R11 pop
    msr  psp, r0               @ PSP 설정
    isb
    mov  r0, #0
    msr  basepri, r0
    orr  r14, #0xd             @ EXC_RETURN = 0xFFFFFFFD (thread mode + PSP)
    bx   r14                   @ HW가 R0-R3, R12, LR, PC, xPSR pop
```

마지막 두 줄이 핵심입니다. LR에 0xFFFFFFFD를 만들어 두고 `bx r14`로 return 하면 HW가 *PSP를 사용하는 thread mode*로 떨어뜨립니다. 그 즉시 PC는 task 함수의 첫 명령을 가리키고 있습니다.

## SysTick — Time slice trigger

매 tick마다 SysTick ISR이 호출됩니다. tick count를 늘리고, preempt가 필요하면 PendSV를 trigger합니다.

```c
void xPortSysTickHandler(void)
{
    vPortRaiseBASEPRI();              /* RTOS IRQ만 mask */

    if (xTaskIncrementTick() != pdFALSE) {
        /* 더 우선순위 높은 task가 ready → preempt */
        portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    }

    vPortClearBASEPRIFromISR();
}
```

SysTick 자체는 가벼운 ISR로 끝나고, *실제 context switch는 PendSV가 처리*합니다. 이 분업이 핵심입니다.

## BASEPRI — 똑똑한 IRQ mask

`cpsid i`는 *모든 IRQ를 mask* 합니다. 너무 둔탁한 망치입니다. critical HW IRQ (안전 핵심)도 막혀 버립니다.

대신 BASEPRI는 *priority가 N 이하인 IRQ만* mask 합니다.

```c
#define configMAX_SYSCALL_INTERRUPT_PRIORITY  5

// priority 0~4: 절대 mask 안 됨 (안전 핵심 HW IRQ)
// priority 5+ : RTOS critical section에서 mask
```

FreeRTOS는 *RTOS API를 호출 가능한 ISR*만 mask 대상으로 둡니다. 자동차 ESC처럼 *수 μs도 양보할 수 없는 IRQ*는 RTOS에 관여하지 못하는 대신 *언제든 즉시 실행*됩니다.

## FPU — Lazy stacking

Cortex-M4F / M7는 FPU 사용을 *task별로 추적*합니다. CONTROL.FPCA bit이 1이면 그 task가 FPU를 썼다는 표시입니다.

PendSV는 FPCA bit를 보고 *FPU regs도 push 할지* 결정합니다.

```asm
tst   r14, #0x10             @ EXC_RETURN bit 4 = FPCA
it    eq
vstmdbeq r0!, {s16-s31}      @ FPU 쓴 task만 S16-S31 push
```

S0-S15는 *HW가 자동으로* push해 줍니다. S16-S31만 SW가 처리합니다. FPU 안 쓴 task는 이 코드를 건너뛰므로 *추가 오버헤드가 0*입니다.

## SVC vs PendSV — 한눈에

| | SVC | PendSV |
| --- | --- | --- |
| Trigger | `SVC #N` 명령 | ICSR.PENDSVSET = 1 |
| Priority | 설정 가능 | 보통 최저 |
| 용도 | OS API entry, 첫 task 시작 | Context switch |
| 발생 시점 | 즉시 (sync) | 다른 ISR 모두 종료 후 |

SVC는 *동기적 시스템 호출*, PendSV는 *비동기적 지연 context switch*에 쓰입니다.

## Cortex-M0/M0+의 차이

ARMv6-M (M0, M0+)에는 *Cortex-M3+에 있는 명령들*이 없습니다.

- **CLZ 명령 없음** — bitmap 스케줄러 최적화 불가
- **STMDB / LDM with high regs 제한** — R8-R11을 직접 stack에 push 못 함
- **BASEPRI 없음** — 거친 `cpsid i`로 IRQ 막아야 함

그래서 M0 port는 *추가 명령 시퀀스*가 들어갑니다.

```asm
@ Cortex-M0: R8-R11을 R0-R3에 옮긴 뒤 push
mov   r4, r8
mov   r5, r9
mov   r6, r10
mov   r7, r11
stmia r0!, {r4-r7}
@ 그 다음 R4-R7 push
stmia r0!, {r4-r7}
```

명령 수가 더 많지만 결과는 같습니다. RTOS port code의 95%는 동일하고, *몇 줄만 다른* 형태입니다.

## 자주 하는 실수

> ⚠️ PendSV priority를 잘못 설정

`configKERNEL_INTERRUPT_PRIORITY`보다 높게 두면 *다른 ISR이 PendSV를 preempt*하면서 context가 망가질 수 있습니다. **항상 최저로** 둡니다.

> ⚠️ MSP에서 task code를 실행

CONTROL.SPSEL을 설정하지 않으면 task가 *MSP 위에서 실행*됩니다. 그러면 ISR과 stack을 공유하게 되어 nested IRQ로 stack overflow가 납니다.

> ⚠️ ISR에서 FPU를 쓰면서 lazy stacking을 무시

FP 명령을 *ISR 안에서* 쓰면 task의 FP context가 깨질 수 있습니다. 일반적으로는 ISR에서 FP 연산 자체를 피하는 게 안전합니다.

> ⚠️ `cpsid i`로 모든 IRQ mask

안전 핵심 HW IRQ까지 막힙니다. 가능하면 BASEPRI만 씁니다.

## 정리

- Cortex-M context switch의 모든 길은 **PendSV로 통합**됩니다. 우선순위는 항상 최저로 둡니다.
- **MSP는 ISR/OS, PSP는 task**가 씁니다. CONTROL.SPSEL bit로 전환됩니다.
- `bx r14`로 return 할 때 `r14`에 들어 있는 **EXC_RETURN 값**이 HW에게 어떻게 unstack 할지 알려줍니다.
- **SVC**는 첫 task 시작과 OS API entry용, **PendSV**는 context switch 전용입니다.
- **BASEPRI mask**가 RTOS critical section의 핵심입니다. 안전 핵심 IRQ는 절대 막지 않습니다.
- **FPU lazy stacking**으로 FP를 안 쓴 task의 switch 오버헤드는 0입니다.
- Cortex-M0/M0+는 CLZ와 BASEPRI가 없어 port code 몇 줄이 달라집니다.

다음 편은 **ARM Cortex-A Context Switch** — SVC, 모드 전환, MMU가 만드는 추가 비용을 다룹니다.

## 관련 항목

- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
- [2-06: ARM Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [1-06: ISR 안에서 RTOS API 호출](/blog/embedded/rtos/practical-internals/part1-06-isr-api)
