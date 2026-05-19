---
title: "2-07: RISC-V Context Switch — ECALL, mret, CSR"
date: 2026-05-08T17:00:00
description: "RISC-V는 모든 레지스터 SW save. ECALL/mret + CSR (mscratch/mepc/mcause/mstatus)."
series: "Practical RTOS Internals"
seriesOrder: 17
tags: [riscv, ecall, mret, csr, mscratch, mepc]
draft: true
---

## 한 줄 요약

> **"RISC-V = 단순함 = 수동 push"** — Cortex-M의 HW auto-push 없음. 모든 레지스터 SW save.

## RISC-V Privilege Levels

| Mode | 비트 | 용도 |
| --- | --- | --- |
| **M** (Machine) | 11 | Highest — bare-metal, RTOS |
| **S** (Supervisor) | 01 | Linux kernel |
| **U** (User) | 00 | Application |

임베디드 RTOS (FreeRTOS·Zephyr)는 *M-mode only*. Linux는 *M + S + U*.

## RISC-V Registers

```text
x0  (zero)       — hardwired 0
x1  (ra)         — return address
x2  (sp)         — stack pointer
x3  (gp)         — global pointer
x4  (tp)         — thread pointer
x5-7 (t0-t2)     — temporaries
x8  (s0/fp)      — saved/frame pointer
x9  (s1)         — saved
x10-x17 (a0-a7)  — arguments/return
x18-x27 (s2-s11) — saved
x28-x31 (t3-t6)  — temporaries
```

32 GP regs. ARM (16)보다 많음 → context save 더 큼.

## Key CSRs (Control and Status Registers)

| CSR | 의미 |
| --- | --- |
| **mstatus** | Status (IE bit, MPP 모드 등) |
| **mepc** | Exception PC — interrupt 복귀 |
| **mcause** | Exception 원인 |
| **mtval** | Fault address (memory fault 시) |
| **mtvec** | Vector table base |
| **mscratch** | Free scratch — context save에 활용 |
| **mip** | Interrupt pending |
| **mie** | Interrupt enable |

## Interrupt 진입 — Cortex-M보다 적은 자동화

```text
External IRQ 발생:
1. mepc ← 현재 PC
2. mcause ← interrupt number
3. mstatus.MIE → mstatus.MPIE (save)
4. mstatus.MIE = 0 (disable)
5. PC ← mtvec
```

**레지스터 자동 push 없음** — handler가 *모두 SW save*.

## ISR Save Sequence

```asm
isr_handler:
    csrrw sp, mscratch, sp        # ISR stack으로 swap

    # 32 regs 모두 push
    addi sp, sp, -128
    sw x1,  0(sp)
    sw x2,  4(sp)                  # original sp 저장 (mscratch에 있음)
    sw x3,  8(sp)
    ...
    sw x31, 124(sp)
    
    # CSR도 push
    csrr t0, mepc
    sw t0, 128(sp)
    csrr t0, mstatus
    sw t0, 132(sp)

    # actual ISR
    jal isr_body

    # restore (역순)
    lw t0, 132(sp)
    csrw mstatus, t0
    lw t0, 128(sp)
    csrw mepc, t0
    lw x31, 124(sp)
    ...
    lw x1, 0(sp)
    addi sp, sp, 128

    csrrw sp, mscratch, sp        # task stack 복귀
    mret                            # MEPC로 jump
```

길고 *수작업*. Cortex-M의 12-cycle auto-push와 큰 차이.

## mret — Exception Return

```asm
mret
# 1. PC ← mepc
# 2. mstatus.MIE ← mstatus.MPIE
# 3. Mode ← mstatus.MPP (보통 M으로)
```

ARM의 `bx lr` + special return value와 다르게 *단일 명령*. 단순.

## ECALL — System Call / OS API

User mode → `ecall` → trap to M-mode.

```asm
user_task:
    li a7, SYS_YIELD
    ecall                          # trap → mtvec
    ...

m_mode_trap:
    csrr t0, mcause
    li t1, CAUSE_ECALL_M           # 또는 CAUSE_ECALL_U
    beq t0, t1, handle_syscall
    # ...
```

RTOS의 API 호출이 ecall로. M-mode RTOS에선 *trap 없이 직접 호출*도 가능.

## mscratch — Context Save 트릭

ISR 진입 시 *task의 SP를 어디에 save?* → **mscratch**.

```c
// init
mscratch = ISR_stack_top;

// ISR entry
csrrw sp, mscratch, sp
// 이제 sp = ISR stack, mscratch = task SP
```

ARM의 PSP/MSP HW 자동 전환과 비슷하지만 *수동*.

## FreeRTOS RISC-V Port

```c
// portasm.S
xPortStartFirstTask:
    /* mscratch에 stack top 저장 */
    la t0, xISRStackTop
    lw t0, 0(t0)
    csrw mscratch, t0
    
    /* pxCurrentTCB 로드 */
    la t1, pxCurrentTCB
    lw sp, 0(t1)                  /* sp = TCB->pxTopOfStack */
    
    /* CSR 복원 */
    lw t0, 0(sp)
    csrw mstatus, t0
    addi sp, sp, 4
    
    /* GP regs 복원 */
    lw x1, 0(sp)
    lw x3, 8(sp)
    ...
    lw x31, 116(sp)
    addi sp, sp, 124
    
    mret                           /* mepc로 jump = task 시작 */
```

## CLIC vs PLIC

RISC-V interrupt controller — 2 표준:

| | PLIC (Platform-Level Interrupt Controller) | CLIC (Core-Local Interrupt Controller) |
| --- | --- | --- |
| 표준화 | RISC-V 공식 | extension (대부분 vendor) |
| 외부 IRQ | 다수 (1000+) | 256 |
| Nesting | 없음 (SW 처리) | HW preemption (priority) |
| 표준 채택 | Linux SoC (HiFive, JH7110) | MCU (ESP32-C3, Greenwich SiFive E) |

CLIC가 Cortex-M의 NVIC와 유사 — *nested IRQ + priority*.

## 비트맵·CLZ

RISC-V는 *CLZ* (Count Leading Zeros) 없음 (Zbb extension에 있지만 옵션). FreeRTOS 포트는 *generic mode* 사용.

```c
// Cortex-M
uxTopPriority = 31 - __clz(uxTopReadyPriority);   // 1 cycle

// RISC-V (Zbb 없음)
while (...) --uxTopPriority;                       // O(P)
```

성능 차이는 작음 — RTOS scheduler 호출 빈도 낮음.

## RISC-V vs Cortex-M — 요약

| 항목 | Cortex-M | RISC-V |
| --- | --- | --- |
| **Register count** | 16 GP | 32 GP |
| **Auto-push on IRQ** | 8 word HW | 0 (SW) |
| **Stack pointers** | 2 (MSP/PSP) | 1 + mscratch trick |
| **Context switch** | ~70 cycle | ~150-200 cycle |
| **Interrupt latency** | 12 cycle | 6 cycle (entry만) |
| **Bit manipulation** | CLZ 1 cycle | Zbb 옵션 |

RISC-V는 *더 단순*하지만 *더 느림* (SW overhead). 추세 — *HW extension*으로 따라잡기.

## ESP32-C3 / GD32V — MCU 예

RISC-V 32-bit MCU 채택 확산. ESP32-C3·BL602·GD32V 등. FreeRTOS port가 *자동 동작*.

```c
// FreeRTOSConfig.h
#define configMTIME_BASE_ADDRESS        ( 0x4400BFF8UL )   // ESP32-C3
#define configMTIMECMP_BASE_ADDRESS     ( 0x44004000UL )
```

## 자주 하는 실수

> ⚠️ Manual push 빼먹음

Cortex-M 습관으로 *handler 첫 줄에 바로 코드* → register 깨짐. RISC-V는 *모든 reg push 필수*.

> ⚠️ mscratch 잘못 사용

다른 곳에서 mscratch 변경 → context save 실패. *오직 ISR entry/exit*에만.

> ⚠️ mepc 갱신 안 함

mret 전에 *mepc 복원 필수*. 안 하면 잘못된 PC로 jump.

> ⚠️ CSR atomicity 가정

`csrr·csrw` 사이에 *interrupt 가능*. atomic하게 *csrrw·csrrs·csrrc* 사용.

## 정리

- RISC-V = 32 GP regs, **모든 레지스터 SW save**.
- ECALL trap + mret return의 단순 모델.
- mscratch CSR로 *ISR stack swap* 트릭.
- CLIC가 Cortex-M의 NVIC 역할.
- ESP32-C3·BL602 등 RISC-V MCU 확산.

다음 편은 **Tick과 타이머** — SysTick, generic timer.

## 관련 항목

- [2-06: Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [ESP32-C3 Mastering](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview)
