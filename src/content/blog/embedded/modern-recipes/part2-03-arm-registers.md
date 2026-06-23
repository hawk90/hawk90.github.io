---
title: "ARM 레지스터 구조 분석 — R0~R15·CPSR·SPSR·Banked Registers"
date: 2026-04-11T09:15:00
description: "R0-R15·xPSR·CONTROL·PRIMASK·BASEPRI — register set 전체 지도."
series: "Modern Embedded Recipes"
seriesOrder: 15
tags: [recipes, arm, registers]
draft: false
---

## 한 줄 요약

> **"Cortex-M 레지스터는 R0 ~ R15 + 6개의 special입니다."** 단순해 보이지만, IRQ 처리·context switch의 모든 코드가 이 레지스터들을 직접 다룹니다.

## 어떤 상황에서 쓰나

- RTOS context switch 코드 작성/디버깅
- Fault handler에서 stack frame 분석
- 인라인 어셈블리로 cycle 단위 최적화
- 디스어셈블리 읽기

## 핵심 개념

### 1) General-purpose register R0 ~ R15

Cortex-M은 16개의 32-bit 레지스터를 갖습니다.

| 레지스터 | 별명 | 용도 (AAPCS) |
| --- | --- | --- |
| R0 ~ R3 | arg / scratch | 함수 인자, return 값 |
| R4 ~ R11 | callee-saved | 함수 안 임시 변수 |
| R12 | IP | intra-procedure call scratch |
| R13 | SP | Stack Pointer (MSP / PSP) |
| R14 | LR | Link Register (return 주소) |
| R15 | PC | Program Counter |

AAPCS(ARM Application Procedure Call Standard)가 함수 호출 시 누가 어떤 레지스터를 보존할지를 정합니다.

### 2) SP — MSP vs PSP

Cortex-M은 두 개의 stack pointer를 갖습니다.

```text
MSP (Main Stack Pointer)   — reset 시, IRQ handler에서 사용
PSP (Process Stack Pointer) — RTOS task가 사용
```

RTOS는 각 task에 PSP를 따로 줘서, IRQ가 발생해도 MSP로 전환되어 task stack을 침범하지 않게 합니다.

```c
// CONTROL register bit[1] = 0 → MSP, 1 → PSP
__set_CONTROL(0x02);   // PSP 사용
__set_PSP(task_stack_top);
```

### 3) LR — Link Register와 EXC_RETURN

LR은 두 가지 의미를 갖습니다. 일반 함수 호출에서는 return 주소, IRQ 진입 시에는 EXC_RETURN(special value)입니다.

```text
EXC_RETURN (Cortex-M3/M4)
   0xFFFFFFF1 — handler mode, MSP
   0xFFFFFFF9 — thread mode, MSP
   0xFFFFFFFD — thread mode, PSP
```

`BX LR`로 IRQ를 나갈 때 CPU가 이 값을 보고 올바른 stack을 복원합니다. 정상 함수 return은 PC에 LR을 복사하는 것과 같습니다.

### 4) xPSR — Program Status Register

xPSR은 3개의 view로 나뉩니다.

| 부분 | bit | 의미 |
| --- | --- | --- |
| APSR | 31 ~ 27 | N, Z, C, V, Q flag |
| IPSR | 8 ~ 0 | 현재 처리 중인 IRQ 번호 |
| EPSR | 26, 24, 15 ~ 10 | Thumb mode bit (T), ICI/IT |

```c
uint32_t psr = __get_xPSR();
int irq_num = psr & 0x1FF;   // IPSR 부분
```

T bit이 0이면 illegal state(Cortex-M은 항상 Thumb)이므로 hardfault가 발생합니다.

### 5) Special registers — CONTROL, PRIMASK, BASEPRI, FAULTMASK

```text
CONTROL    — privilege level, SP 선택, FPU active
PRIMASK    — bit 0 = 1이면 모든 configurable IRQ 차단 (NMI/HardFault 제외)
FAULTMASK  — bit 0 = 1이면 NMI 제외 모든 fault/IRQ 차단
BASEPRI    — 8-bit, 이 값 이상의 priority는 차단 (M3+, 0이면 disable)
```

```c
// Critical section — IRQ 차단
__disable_irq();         // PRIMASK = 1
/* ... */
__enable_irq();          // PRIMASK = 0

// 부분 차단 — priority 5 이상만 (낮은 priority만 차단)
__set_BASEPRI(5 << (8 - __NVIC_PRIO_BITS));
```

BASEPRI는 FreeRTOS critical section에서 자주 쓰입니다. SysTick보다 높은 priority의 IRQ는 critical section 중에도 처리됩니다.

## 코드 / 실제 사용 예

Cortex-M context switch의 핵심 부분입니다.

```asm
PendSV_Handler:
    cpsid i                          @ IRQ disable
    
    mrs r0, psp                      @ R0 = PSP (current task stack)
    
    @ M4 + FPU 시: lazy stacking 처리
    tst r14, #0x10
    it eq
    vstmdbeq r0!, {s16-s31}
    
    @ R4 ~ R11을 push (R0 ~ R3, R12, LR, PC, xPSR은 HW가 자동 push)
    stmdb r0!, {r4-r11, lr}
    
    @ save SP to TCB
    ldr r1, =current_tcb
    ldr r1, [r1]
    str r0, [r1]
    
    @ scheduler
    bl scheduler_next
    
    @ load next TCB → SP
    ldr r1, =current_tcb
    ldr r1, [r1]
    ldr r0, [r1]
    
    @ pop R4 ~ R11
    ldmia r0!, {r4-r11, lr}
    
    tst r14, #0x10
    it eq
    vldmiaeq r0!, {s16-s31}
    
    msr psp, r0                      @ PSP = new task stack
    cpsie i
    bx lr                            @ EXC_RETURN으로 복귀
```

HW가 자동 stacking 하는 8개 register(R0 ~ R3, R12, LR, PC, xPSR)와 SW가 직접 처리하는 8개(R4 ~ R11)를 나눠 다룹니다.

## 측정 / 비교

| 레지스터 종류 | 개수 | 32-bit 폭 | 비고 |
| --- | --- | --- | --- |
| GP (R0 ~ R12) | 13 | O | 일반 연산 |
| SP / LR / PC | 3 | O | 특수 의미 |
| xPSR | 1 | O | status flag |
| PRIMASK | 1 | O (1 bit 의미) | IRQ mask |
| BASEPRI | 1 | O (8 bit 의미) | 부분 IRQ mask |
| FAULTMASK | 1 | O (1 bit) | fault mask |
| CONTROL | 1 | O (3 bit) | privilege/SP |
| FPU s0 ~ s31 | 32 | O | FPU 옵션 |

| IRQ entry 시 HW push | 자동 |
| --- | --- |
| R0, R1, R2, R3, R12, LR, PC, xPSR | 8 word = 32 byte |

## 자주 보는 함정

> ⚠️ Privileged mode 가정 코드를 unprivileged에서 실행

CONTROL[0]을 1로 설정한 task가 privileged register(SCB, NVIC 등)에 접근하면 BusFault. RTOS에서 unprivileged task를 만들 때 confirm.

> ⚠️ Inline assembly에서 R0 ~ R3 clobber 누락

GCC inline asm에서 `clobbers`에 누락하면 컴파일러가 그 레지스터에 변수를 두고 있어 손상시킵니다.

> ⚠️ FPU context 저장 누락

M4 FPU 사용 task의 context switch에서 FPU register(s0 ~ s31)를 저장 안 하면 다른 task가 FPU 결과를 덮어씁니다. lazy stacking + FPCAR 활용.

> ⚠️ BASEPRI를 priority bit 정렬 안 하고 설정

BASEPRI는 priority bit이 MSB 쪽에 정렬돼 있습니다. NVIC priority 5를 BASEPRI=5로 쓰면 안 됩니다. `5 << (8 - NVIC_PRIO_BITS)`로 변환.

> ⚠️ xPSR Thumb bit 클리어

context switch 또는 fault inject 시 xPSR의 T bit(bit 24)를 0으로 만들면 BX 후 illegal state로 hardfault.

## 정리

- Cortex-M은 R0 ~ R15와 special register(CONTROL, PRIMASK, BASEPRI, FAULTMASK, xPSR)로 구성됩니다.
- SP는 MSP / PSP로 나뉩니다. RTOS는 task에 PSP를 줘 stack 격리를 합니다.
- IRQ entry 시 HW가 8 register를 자동 push합니다. SW가 나머지 8 register를 추가로 push.
- BASEPRI는 부분 IRQ 차단에 씁니다. FreeRTOS critical section의 기반입니다.
- Privilege level, FPU context, T bit 같은 작은 실수가 fault를 부릅니다.

다음 편에서는 **Cortex-M 예외 처리**를 다룹니다. NVIC, tail-chaining, late-arrival의 하드웨어 동작입니다.

## 관련 항목

- [2-01: Cortex-M 시리즈 비교](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)
- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [2-09: TrustZone-M 기초](/blog/embedded/modern-recipes/part2-09-trustzone-m)
- 더 깊이 — [Practical RTOS Internals: Context Switch 구현](/blog/embedded/rtos/practical-internals/00-preface)
