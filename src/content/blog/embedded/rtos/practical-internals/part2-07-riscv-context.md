---
title: "RISC-V Context Switch 분석 — ECALL·mret·CSR"
date: 2026-05-05T09:17:00
description: "RISC-V는 모든 레지스터 SW save. ECALL/mret + CSR (mscratch/mepc/mcause/mstatus)."
series: "Practical RTOS Internals"
seriesOrder: 17
tags: [riscv, ecall, mret, csr, mscratch, mepc]
draft: false
---

## 한 줄 요약

> RISC-V는 ISA를 단순하게 유지하는 대신 push를 모두 SW에 맡깁니다. Cortex-M의 HW auto-push가 없기 때문에 모든 레지스터를 직접 save해야 합니다.

## RISC-V Privilege Levels

| Mode | 비트 | 용도 |
| --- | --- | --- |
| **M** (Machine) | 11 | Highest — bare-metal, RTOS |
| **S** (Supervisor) | 01 | Linux kernel |
| **U** (User) | 00 | Application |

임베디드 RTOS(FreeRTOS, Zephyr)는 M-mode에서만 동작합니다. Linux는 M, S, U를 모두 사용합니다.

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

GP 레지스터가 32개입니다. ARM의 16개보다 많아서 context save 크기도 그만큼 커집니다.

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

**External IRQ 발생:**


**1. mepc ← 현재 PC**


**2. mcause ← interrupt number**


**3. mstatus.MIE → mstatus.MPIE (save)**


**4. mstatus.MIE = 0 (disable)**


**5. PC ← mtvec**

레지스터 자동 push가 전혀 없습니다. handler가 모든 레지스터를 SW로 저장해야 합니다.

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

길고 수작업이 많습니다. Cortex-M의 12 cycle auto-push와 큰 차이를 보입니다.

## mret — Exception Return

```asm
mret
# 1. PC ← mepc
# 2. mstatus.MIE ← mstatus.MPIE
# 3. Mode ← mstatus.MPP (보통 M으로)
```

ARM의 `bx lr`과 special return value 조합과 달리, RISC-V는 단일 명령으로 끝납니다. 그만큼 단순합니다.

## ECALL — System Call / OS API

User mode에서 `ecall`을 실행하면 M-mode로 trap합니다.

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

RTOS API 호출은 보통 `ecall`을 거칩니다. M-mode에서만 동작하는 RTOS라면 trap 없이 함수 호출로 처리할 수도 있습니다.

## mscratch — Context Save 트릭

ISR에 진입했을 때 task의 SP를 어디에 잠시 보관해야 할까요. 답은 `mscratch`입니다.

```c
// init
mscratch = ISR_stack_top;

// ISR entry
csrrw sp, mscratch, sp
// 이제 sp = ISR stack, mscratch = task SP
```

ARM의 PSP/MSP HW 자동 전환과 비슷한 효과를 내지만, RISC-V에서는 모두 수동입니다.

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

RISC-V interrupt controller는 두 가지 표준으로 나뉩니다.

| | PLIC (Platform-Level Interrupt Controller) | CLIC (Core-Local Interrupt Controller) |
| --- | --- | --- |
| 표준화 | RISC-V 공식 | extension (대부분 vendor) |
| 외부 IRQ | 다수 (1000+) | 256 |
| Nesting | 없음 (SW 처리) | HW preemption (priority) |
| 표준 채택 | Linux SoC (HiFive, JH7110) | MCU (ESP32-C3, Greenwich SiFive E) |

CLIC는 Cortex-M의 NVIC와 유사하게 nested IRQ와 priority를 지원합니다.

## 비트맵·CLZ

RISC-V는 CLZ(Count Leading Zeros) 명령이 기본으로 없습니다. Zbb extension에 포함되어 있지만 옵션입니다. 그래서 FreeRTOS 포트는 generic mode를 사용합니다.

```c
// Cortex-M
uxTopPriority = 31 - __clz(uxTopReadyPriority);   // 1 cycle

// RISC-V (Zbb 없음)
while (...) --uxTopPriority;                       // O(P)
```

성능 차이 자체는 작습니다. RTOS scheduler는 호출 빈도가 낮기 때문입니다.

## RISC-V vs Cortex-M — 요약

| 항목 | Cortex-M | RISC-V |
| --- | --- | --- |
| **Register count** | 16 GP | 32 GP |
| **Auto-push on IRQ** | 8 word HW | 0 (SW) |
| **Stack pointers** | 2 (MSP/PSP) | 1 + mscratch trick |
| **Context switch** | ~70 cycle | ~150-200 cycle |
| **Interrupt latency** | 12 cycle | 6 cycle (entry만) |
| **Bit manipulation** | CLZ 1 cycle | Zbb 옵션 |

RISC-V는 ISA가 더 단순한 대신 SW overhead가 커서 살짝 느립니다. 최근에는 HW extension으로 그 격차를 좁히는 흐름이 이어지고 있습니다.

## ESP32-C3 / GD32V — MCU 예

RISC-V 32-bit MCU 채택이 빠르게 확산되고 있습니다. ESP32-C3, BL602, GD32V 등이 대표적입니다. FreeRTOS port가 그대로 동작합니다.

```c
// FreeRTOSConfig.h
#define configMTIME_BASE_ADDRESS        ( 0x4400BFF8UL )   // ESP32-C3
#define configMTIMECMP_BASE_ADDRESS     ( 0x44004000UL )
```

## 자주 하는 실수

> ⚠️ Manual push를 빠뜨립니다

Cortex-M 감각 그대로 handler 첫 줄에 곧장 코드를 작성하면 레지스터가 깨집니다. RISC-V는 모든 레지스터를 직접 push해야 합니다.

> ⚠️ mscratch를 다른 용도로 씁니다

ISR 외의 코드에서 `mscratch` 값을 바꾸면 context save가 깨집니다. ISR entry와 exit에서만 사용해야 합니다.

> ⚠️ mepc를 복원하지 않습니다

`mret` 전에 `mepc`를 반드시 복원해야 합니다. 그러지 않으면 엉뚱한 PC로 jump하게 됩니다.

> ⚠️ CSR의 atomicity를 가정합니다

`csrr`과 `csrw` 사이에는 interrupt가 끼어들 수 있습니다. atomic이 필요하면 `csrrw`, `csrrs`, `csrrc`를 사용해야 합니다.

## 정리

- RISC-V는 32개의 GP 레지스터를 가지며, 모든 레지스터를 SW로 save합니다.
- ECALL로 trap하고 mret로 복귀하는 단순한 모델입니다.
- `mscratch` CSR로 ISR stack을 swap하는 트릭을 사용합니다.
- CLIC가 Cortex-M의 NVIC 역할을 합니다.
- ESP32-C3, BL602 같은 RISC-V MCU가 빠르게 늘고 있습니다.

다음 편은 tick과 타이머입니다. SysTick과 generic timer를 다룹니다.

## 관련 항목

- [2-06: Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [ESP32-C3 Mastering](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview)
