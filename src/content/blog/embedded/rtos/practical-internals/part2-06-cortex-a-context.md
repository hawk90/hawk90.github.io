---
title: "ARM Cortex-A Context Switch — Mode 전환·SVC·Banked Registers"
date: 2026-05-05T09:16:00
description: "Cortex-A의 7 모드와 모드별 banked register. 모드 간 SP·LR 별도 — Cortex-M보다 복잡."
series: "Practical RTOS Internals"
seriesOrder: 16
tags: [cortex-a, svc, mode, banked-registers, mmu]
draft: false
---

## 한 줄 요약

> Cortex-A는 7개의 모드와 모드별 banked register를 갖습니다. Cortex-M의 2 SP(MSP/PSP) 구조와는 차원이 다른 복잡도입니다.

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

모드에 진입하면 `CPSR.M[4:0]`이 해당 모드 값으로 자동 설정됩니다.

## Banked Registers

```text
User:  R0  R1  R2  ... R7  R8     R9     R10    R11    R12    R13    R14    PC  CPSR
FIQ:   R0  R1  R2  ... R7  R8_fiq R9_fiq R10_fiq R11_fiq R12_fiq R13_fiq R14_fiq    SPSR_fiq
IRQ:   R0  R1  R2  ... R7  R8     R9     R10    R11    R12    R13_irq R14_irq    SPSR_irq
SVC:   R0  R1  R2  ... R7  R8     R9     R10    R11    R12    R13_svc R14_svc    SPSR_svc
```

R13(SP)과 R14(LR)는 모드별로 별도 레지스터를 갖습니다. 모드 진입 시 자동으로 banked 레지스터가 활성화됩니다. FIQ는 R8부터 R12까지도 추가로 banked되어 있어서 context save를 빠르게 끝낼 수 있습니다.

## Mode 진입 시

```text
User mode 실행 중 → IRQ 발생
1. CPSR → SPSR_irq 복사 (이전 상태 보존)
2. LR_irq = return address
3. CPSR.M = IRQ mode
4. PC = vector table[IRQ]
```

User mode의 R13과 R14는 banked되어 있으므로 그대로 보존됩니다. IRQ mode에서는 R13_irq와 R14_irq를 사용합니다.

## Context Switch 흐름

Cortex-A용 RTOS(FreeRTOS Cortex-A port, Zephyr Cortex-A)의 context switch는 다음과 같습니다.

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

코드가 훨씬 길고 모두 수동입니다. Cortex-M의 HW automation에 해당하는 기능이 없기 때문입니다.

## SVC — 시스템 콜 entry

User mode에서 SVC 명령을 실행하면 SVC mode로 진입합니다. RTOS의 API entry point 역할을 합니다.

```c
// User
syscall(SYSCALL_YIELD);

// asm
svc #0    @ SVC handler로 trap
```

SVC handler가 들어온 번호에 맞춰 OS API를 호출합니다. Linux의 system call이 같은 메커니즘으로 동작합니다.

## MMU·Cache 영향

Cortex-A는 MMU를 가지므로 context switch 시 다음 작업이 추가됩니다.

- 필요할 때 TLB를 invalidate합니다.
- 잘못된 cache content가 남지 않도록 cache를 flush 또는 invalidate합니다.
- ASID(Address Space ID)를 갱신합니다.

```c
__asm("dsb ish");
__asm("tlbi vmalle1is");
__asm("dsb ish");
__asm("isb");
```

이 과정만으로도 수십 µs가 추가됩니다. 같은 process 안의 thread switch는 가볍지만, process 자체를 바꿀 때는 비용이 크게 늘어납니다.

## NEON / VFP

Cortex-A의 SIMD/FP unit입니다. context에 D0부터 D31까지 256 byte가 추가됩니다. lazy save를 사용하는 편이 좋습니다.

## TrustZone — Secure/Non-secure World

Cortex-A는 두 개의 world를 갖습니다. context switch가 world 사이에서도 일어날 수 있습니다.

```text
NS world task → SMC → Secure world (OP-TEE)
```

`SMC` 명령은 EL3 Monitor로 trap합니다. world switch는 모든 GP 레지스터, FP 레지스터, S/NS state를 함께 저장합니다.

## 비용 — Cortex-M vs Cortex-A

| | Cortex-M3 (168MHz) | Cortex-A53 (1.5GHz) |
| --- | --- | --- |
| Context switch | ~70 cycle (0.4 µs) | ~300 cycle + cache/TLB (수 µs) |
| FPU lazy save | 0 (사용 안 한 task) | 작음 |
| Process switch | (없음) | TLB flush 10 µs + cold cache 100 µs+ |

Cortex-A의 process switch 비용은 thread switch에 비해 훨씬 큽니다. 그래서 RTOS는 보통 single process에 여러 thread를 두는 모델을 택합니다.

## Zephyr Cortex-A Port

```c
// arch/arm/core/cortex_a_r_aarch32/swap.S
z_arm_pendsv:
    /* ... */
    stmfd sp!, {r0-r12, lr}
    /* ... */
```

FreeRTOS는 FreeRTOS-Plus의 Cortex-A 포트로 대응합니다. NXP, ST, Xilinx는 자체 BSP를 제공합니다.

## 자주 하는 실수

> ⚠️ Mode를 잘못 잡습니다

User mode에서 privileged 명령을 시도하면 Undef trap이 발생합니다. RTOS 코드는 SVC mode에서 동작한다는 가정 위에서 짜야 합니다.

> ⚠️ TLB invalidate를 빠뜨립니다

MMU 매핑을 바꾼 뒤 기존 translation을 그대로 쓰면 잘못된 메모리에 접근하게 됩니다.

> ⚠️ Cache 일관성을 놓칩니다

DMA 동작 후에는 cache invalidate가 필요합니다. coherent cache는 비싸기 때문에 명시적으로 관리하는 경우가 많습니다.

## 정리

- Cortex-A는 7개의 모드와 모드별 banked R13/R14를 갖습니다. Cortex-M의 2 SP 구조보다 복잡합니다.
- Context switch가 완전히 SW로 처리됩니다. HW automation이 없습니다.
- MMU, cache, TLB 처리로 수 µs 단위의 비용이 듭니다.
- Process switch는 thread switch보다 훨씬 비쌉니다.

다음 편은 RISC-V context switch입니다. ECALL, mret, CSR을 다룹니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
