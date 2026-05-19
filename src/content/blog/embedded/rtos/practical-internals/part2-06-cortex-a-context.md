---
title: "2-06: ARM Cortex-A Context Switch — Mode 전환, SVC, Banked Registers"
date: 2026-05-08T16:00:00
description: "Cortex-A의 7 모드와 모드별 banked register. 모드 간 SP·LR 별도 — Cortex-M보다 복잡."
series: "Practical RTOS Internals"
seriesOrder: 16
tags: [cortex-a, svc, mode, banked-registers, mmu]
draft: true
---

## 한 줄 요약

> **"Cortex-A = 7 모드 + banked registers"** — Cortex-M의 2 SP (MSP/PSP)와 다른 차원.

## Cortex-A의 7 모드

| 모드 | 비트 | 용도 |
| --- | --- | --- |
| User (USR) | 10000 | Application |
| FIQ | 10001 | Fast IRQ |
| IRQ | 10010 | 일반 IRQ |
| Supervisor (SVC) | 10011 | OS kernel |
| Abort (ABT) | 10111 | Memory fault |
| Undefined (UND) | 11011 | Undef instruction |
| System (SYS) | 11111 | Privileged user mode |

각 모드 진입 시 *CPSR.M[4:0]* 자동 설정.

## Banked Registers

```text
User:  R0  R1  R2  ... R7  R8     R9     R10    R11    R12    R13    R14    PC  CPSR
FIQ:   R0  R1  R2  ... R7  R8_fiq R9_fiq R10_fiq R11_fiq R12_fiq R13_fiq R14_fiq    SPSR_fiq
IRQ:   R0  R1  R2  ... R7  R8     R9     R10    R11    R12    R13_irq R14_irq    SPSR_irq
SVC:   R0  R1  R2  ... R7  R8     R9     R10    R11    R12    R13_svc R14_svc    SPSR_svc
```

**R13 (SP), R14 (LR)이 모드별 별도** — 모드 진입 시 *자동 banked*. FIQ는 추가로 R8-R12까지 banked → fast context save.

## Mode 진입 시

```text
User mode 실행 중 → IRQ 발생
1. CPSR → SPSR_irq 복사 (이전 상태 보존)
2. LR_irq = return address
3. CPSR.M = IRQ mode
4. PC = vector table[IRQ]
```

User의 R13/R14는 *그대로 보존* (banked라). IRQ 모드의 R13_irq/R14_irq 사용.

## Context Switch 흐름

Cortex-A RTOS (FreeRTOS Cortex-A port·Zephyr Cortex-A):

```asm
@ 현재 task 저장 (SVC mode에서)
stmfd sp!, {r0-r12, lr}           @ banked R13_svc 사용
mrs r0, spsr
stmfd sp!, {r0}                    @ SPSR (user의 CPSR) 보존

@ FPU 사용 시
vstmdb sp!, {d0-d15}
vstmdb sp!, {d16-d31}
fmrx r0, fpscr
stmfd sp!, {r0}

@ TCB->sp 갱신
ldr r1, =pxCurrentTCB
ldr r1, [r1]
str sp, [r1]

@ scheduler
bl vTaskSwitchContext

@ 새 task 로드
ldr r1, =pxCurrentTCB
ldr r1, [r1]
ldr sp, [r1]                       @ 새 SP

@ FPU 복원 (lazy 가능)
ldmfd sp!, {r0}
vmsr fpscr, r0
vldmia sp!, {d16-d31}
vldmia sp!, {d0-d15}

@ SPSR + 일반 regs 복원
ldmfd sp!, {r0}
msr spsr_cxsf, r0
ldmfd sp!, {r0-r12, lr}
subs pc, lr, #0                    @ exception return → user mode
```

훨씬 *수동적이고 길다* — Cortex-M의 HW automation 부재.

## SVC — 시스템 콜 entry

User mode → SVC 명령 → SVC mode 진입. RTOS의 *API entry point*.

```c
// User
syscall(SYSCALL_YIELD);

// asm
svc #0    @ SVC handler로 trap
```

SVC handler가 *적절한 OS API 호출*. Linux의 system call이 같은 메커니즘.

## MMU·Cache 영향

Cortex-A는 MMU 보유 → context switch 시:

- *TLB invalidate* (필요시)
- *Cache flush·invalidate* (잘못된 cache content 방지)
- ASID (Address Space ID) 갱신

```c
__asm("dsb ish");
__asm("tlbi vmalle1is");
__asm("dsb ish");
__asm("isb");
```

수십 µs 추가. *같은 process 내 thread switch*는 가벼움, *다른 process*는 비쌈.

## NEON / VFP

Cortex-A의 SIMD/FP unit. Context에 *D0-D31 (256 byte)* 추가. **Lazy save** 권장.

## TrustZone — Secure/Non-secure World

Cortex-A는 두 world. Context switch가 *world 간 가능*:

```text
NS world task → SMC → Secure world (OP-TEE)
```

`SMC` 명령 trap to *EL3 Monitor*. World switch는 *모든 GP regs + FP regs + S/NS state* 보관.

## 비용 — Cortex-M vs Cortex-A

| | Cortex-M3 (168MHz) | Cortex-A53 (1.5GHz) |
| --- | --- | --- |
| Context switch | ~70 cycle (0.4 µs) | ~300 cycle + cache/TLB (수 µs) |
| FPU lazy save | 0 (사용 안 한 task) | 작음 |
| Process switch | (없음) | TLB flush 10 µs + cold cache 100 µs+ |

Cortex-A의 process switch 비용이 *훨씬 큼* — RTOS는 보통 *single process, multiple thread* 모델 채택.

## Zephyr Cortex-A Port

```c
// arch/arm/core/cortex_a_r_aarch32/swap.S
z_arm_pendsv:
    /* ... */
    stmfd sp!, {r0-r12, lr}
    /* ... */
```

FreeRTOS는 *FreeRTOS-Plus-FAT-SL Cortex-A 포트*. NXP·ST·Xilinx가 자체 BSP 제공.

## 자주 하는 실수

> ⚠️ Mode 잘못

User mode에서 *privileged 명령* 시도 → Undef trap. RTOS는 *SVC mode*에서 동작 가정.

> ⚠️ TLB invalidate 누락

MMU 변경 후 *기존 translation 사용* → 잘못된 메모리 접근.

> ⚠️ Cache 일관성

DMA 후 *cache invalidate* 필요. Coherent cache는 비싸므로 *명시 관리* 흔함.

## 정리

- Cortex-A = **7 모드 + banked R13/R14** — Cortex-M의 2 SP보다 복잡.
- Context switch가 *완전 SW* — HW automation 없음.
- MMU·Cache·TLB 영향으로 *수 µs* 비용.
- Process switch는 *thread switch보다 훨씬 비쌈*.

다음 편은 **RISC-V Context Switch** — ECALL, mret, CSR.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
