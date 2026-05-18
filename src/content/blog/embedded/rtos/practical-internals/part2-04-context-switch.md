---
title: "2-04: Context Switch 원리 — 레지스터 저장·복원·Stack Frame"
date: 2026-05-12T14:00:00
description: "Context switch = 한 task의 모든 레지스터 stack에 push, 다른 task의 stack에서 pop. Caller-saved vs callee-saved의 차이가 핵심."
series: "Practical RTOS Internals"
seriesOrder: 14
tags: [context-switch, register, stack-frame, caller-saved, callee-saved]
draft: true
---

## 한 줄 요약

> **"Context switch = 모든 레지스터 task별 stack에 보관"** — CPU의 모든 가시 상태를 *완전 복제*.

## 무엇이 Context인가

CPU에서 *현재 task만의 상태* 모두:

| 항목 | Cortex-M | Cortex-A | RISC-V |
| --- | --- | --- | --- |
| General-purpose regs | R0-R12 | R0-R12 | x0-x31 (32) |
| Stack Pointer | SP (R13) | SP_user/_irq/_svc... (mode별) | x2 (sp) |
| Link Register | LR (R14) | LR (R14) | x1 (ra) |
| Program Counter | PC (R15) | PC (R15) | pc |
| Status | xPSR | CPSR | mstatus |
| FPU regs (있으면) | S0-S31, FPSCR | D0-D31, FPSCR | f0-f31 |

Context switch = *이 모든 것을 stack push, 새 task stack에서 pop*.

## Caller-Saved vs Callee-Saved

ARM AAPCS (Procedure Call Standard):

| | 의미 | ARM 레지스터 |
| --- | --- | --- |
| **Caller-saved** (scratch) | 호출자가 *필요하면 보존* | R0-R3, R12 |
| **Callee-saved** (non-volatile) | 함수가 *수정 시 복원 책임* | R4-R11 |

**중요 — 함수 호출 (BL) 시점에선 *caller-saved만 위태*** (호출자가 미리 stack에 보관). Context switch는 *함수 호출과 다르게 모든 레지스터 보존*.

## Cortex-M Exception Entry — 자동 Push

Exception (interrupt 포함) 진입 시 HW가 *자동으로 stack에 push*:

```text
SP (lower addresses)
  ↓
[R0, R1, R2, R3, R12, LR, return PC, xPSR]   ← HW 자동 push (8 word)
  ↑ 새 SP

추가로 SW (RTOS port code)가 R4-R11 push해야 callee-saved 보존
```

이게 **half-saved frame**의 핵심. RTOS port는 *나머지 8 word만* 보관.

## Two-Step Context Switch

```text
1. HW exception entry → R0-R3, R12, LR, PC, xPSR 자동 push
2. SW (PendSV handler) → R4-R11 push, SP 저장
3. Scheduler 결정 (pxCurrentTCB 갱신)
4. SW → 새 task의 SP load, R4-R11 pop
5. HW exception exit → 자동 pop
6. 새 task resume
```

## TCB의 SP 저장

```c
typedef struct {
    StackType_t *pxTopOfStack;   // ← 이 값만 갱신/복원
    /* ... */
} TCB_t;
```

Context switch의 *모든 것은 이 한 포인터*. 다른 모든 정보는 *stack 안*에 있음.

## Stack Layout — 처음 시작 시

Task 생성 시 *미리 stack에 가짜 context*를 쌓아둠. 첫 schedule 시 *마치 이전에 빠져나간 듯* pop으로 자연스럽게 시작.

```text
초기 stack (FreeRTOS pxPortInitialiseStack):
[xPSR=0x01000000]          ← Thumb mode
[PC=task_function]          ← 시작 주소
[LR=task_exit_error]        ← return 시 호출
[R12=0xCCCCCCCC]
[R3=0xBBBBBBBB]
[R2=0xAAAAAAAA]
[R1=0x99999999]
[R0=arg_ptr]                ← task에 전달할 인자
[R11..R4=0x...]             ← 임의 패턴 (디버그용)
  ↑ pxTopOfStack
```

첫 schedule → pop → R4-R11 복원 → exception return → 자동 pop (R0-R3, R12, LR, PC, xPSR) → **PC가 task_function이라 그곳으로 jump**. 마법 같은 시작.

## Context Switch 비용

| 단계 | 시간 (Cortex-M4 @ 168 MHz) |
| --- | --- |
| Exception entry (HW push) | 12 cycle (72 ns) |
| SW push R4-R11 | ~10 cycle |
| Scheduler decision | ~20-100 cycle |
| SW pop R4-R11 | ~10 cycle |
| Exception exit (HW pop) | 12 cycle |
| **Total** | **~70 cycle ≈ 0.4 µs** |

ms 단위 task switch에서 0.4 µs는 *무시할 만*.

## FPU — Lazy Stacking

```c
#if (__FPU_USED == 1)
// 매 context switch마다 32 FP regs push/pop?
#endif
```

Cortex-M4F/M7는 FPU 사용 task만 *FP regs 추가 push*. **Lazy stacking** — FPU 사용 안 한 task는 *FP regs 무시*. CONTROL.FPCA bit으로 표시.

## Stack Size — 얼마나 필요한가

| 항목 | byte |
| --- | --- |
| Context (full save) | 17 word × 4 = 68 B |
| FPU full save | 33 word × 4 = 132 B |
| Nested IRQ × N | 8 word × N |
| User local vars | N |
| printf 등 라이브러리 | 200+ B |

권장 — **최소 256 word (1 KB)**. 복잡한 task는 512+. `uxTaskGetStackHighWaterMark()`로 측정.

## Stack Pointer 종류 (Cortex-M)

| SP | 사용처 |
| --- | --- |
| **MSP** (Main SP) | Reset·exception·OS 기본 |
| **PSP** (Process SP) | Task별 SP (RTOS가 사용) |

ISR은 *MSP 사용*, task는 *PSP*. **CONTROL register**의 bit 1로 결정.

```text
Reset → MSP → main() → RTOS init → 첫 task로 SVC → PSP로 전환 → task 코드
   ↓
ISR 진입: MSP로 자동 복귀 → ISR 코드 → MSP로 push → exit 시 PSP로
```

## RISC-V 차이

ARM의 *exception entry HW push*가 RISC-V엔 *없음*. *모든 레지스터 SW로 push*. 더 단순하지만 *느림*:

```asm
csrrw t0, mscratch, t0       // 임시 swap
sw x1, 0(t0)
sw x2, 4(t0)
...
sw x31, 124(t0)
```

대신 *RISC-V interrupt latency*는 ~수십 cycle. ARMv8-M의 "fast model"이 RISC-V와 유사.

## SMP Context Switch

각 코어 *독립 PendSV·IPI*. 한 코어의 switch가 다른 코어 영향 X. *cross-core wake*는 IPI로 trigger.

## Cache·TLB 영향

큰 시스템 (Cortex-A)에선 *cache flush·TLB invalidate* 가 context switch에 추가:

```c
// task가 다른 process로 전환 시 TLB flush
__asm("dsb ish; tlbi vmalle1is; dsb ish; isb");
```

수십 µs 추가. RTOS는 *MMU 미사용*이라 TLB 무관 — Cortex-M 빠름.

## 자주 하는 실수

> ⚠️ Stack 너무 작음

Context (68 B) + nested IRQ + locals → 256 B 초과. Canary로 검출.

> ⚠️ MSP vs PSP 혼동

ISR에서 SP를 PSP라고 가정 → crash. *별도 stack 사용* 인지.

> ⚠️ FPU enable 후 task에서 lazy stacking 인지 안 함

CONTROL.FPCA bit 잘못 처리 시 *FP context 손실*. FreeRTOS port가 자동 처리하지만 ISR 도중 FP 사용 시 명시.

## 정리

- Context switch = **모든 가시 레지스터 task별 stack에 보관**.
- Cortex-M의 *exception entry HW push* (R0-R3, R12, LR, PC, xPSR)로 절반 자동.
- *SW에서 R4-R11 push/pop* 책임.
- **TCB의 pxTopOfStack**이 모든 정보 — 갱신이 핵심.
- 비용 ≈ 0.4 µs (Cortex-M4 168MHz).

다음 편은 **ARM Cortex-M Context Switch** — PendSV·MSP/PSP 어셈블리.

## 관련 항목

- [2-03: Scheduler 알고리즘](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
