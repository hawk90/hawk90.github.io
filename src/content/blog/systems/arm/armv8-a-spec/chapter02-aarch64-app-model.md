---
title: "Ch 2: AArch64 Application-Level Programmers' Model"
date: 2026-03-01T02:00:00
description: "Part A — X0-X30·SP·PC·PSTATE·NZCV."
series: "ARMv8-A Architecture Reference Manual"
seriesOrder: 2
tags: [armv8-a, aarch64, registers, app-level]
draft: true
---

## 한 줄 요약

> **"AArch64 = 31 GP regs + SP + PC + PSTATE + 32 SIMD"** — application 시점의 view.

## AArch64 Register Set

```text
General-purpose registers (64-bit):
  X0 ~ X30        31 GP registers
  XZR             zero register (always 0)
  
  W0 ~ W30        32-bit views of X0~X30
                  (writing W → upper 32 bits zero)

Special:
  SP              Stack Pointer (64-bit)
  PC              Program Counter (64-bit) — not directly accessible
  PSTATE          Processor State (flags + control)

SIMD·FP registers:
  V0 ~ V31        128-bit SIMD/FP registers
  Q0 ~ Q31        128-bit views (quad-word)
  D0 ~ D31        64-bit  (double-word)
  S0 ~ S31        32-bit  (single-word)
  H0 ~ H31        16-bit  (half-word, FP16)
  B0 ~ B31        8-bit
  
SVE (optional):
  Z0 ~ Z31        128~2048 bit variable-length vectors
  P0 ~ P15        predicate registers (variable length)
```

ARMv7-A는 16 GP, ARMv8-A는 *31 GP*. 큰 변화.

## Register 명명 — X·W·Q·D·S·H·B

```text
같은 물리 register, 다른 view:

64-bit register file:
  X0 = 64-bit access
  W0 = lower 32-bit access
  (write W0 → upper 32-bit clear to 0)

128-bit SIMD register file:
  V0 = full 128-bit
  Q0 = 128-bit quad-word (same as V0)
  D0 = lower 64-bit double
  S0 = lower 32-bit single
  H0 = lower 16-bit half (FP16)
  B0 = lower 8-bit byte

예:
  add  X0, X1, X2     ; 64-bit add
  add  W0, W1, W2     ; 32-bit add, upper W0 clear
  fadd S0, S1, S2     ; single-precision FP add
  fmul D0, D1, D2     ; double-precision FP mul
  add  V0.4S, V1.4S, V2.4S  ; SIMD 4×32-bit lanes
```

Write-on-W → upper clear는 *AArch32 호환 위한 design*.

## Stack Pointer — SP·SP_ELx

```text
Stack Pointer per EL:
  SP_EL0    EL0 (application)
  SP_EL1    EL1 (OS kernel)
  SP_EL2    EL2 (hypervisor)
  SP_EL3    EL3 (secure monitor)

각 EL — *own SP*

Application program (EL0):
  SP = SP_EL0
  
Kernel mode (EL1):
  Can use SP_EL1 (separate kernel stack)
  Or SP_EL0 (for syscall)
  → PSTATE.SP bit 결정

SP alignment:
  16-byte aligned at function boundary
  Per AAPCS64 (ABI)
  
SP_EL0 vs SP_EL1 example:
  Syscall entry:
    Save SP_EL0
    Switch to SP_EL1
    Use kernel stack
  Syscall exit:
    Restore SP_EL0
    Switch back
```

각 EL의 *separate stack* — 보안·격리.

## Program Counter — PC

```text
PC:
  Current instruction address
  64-bit
  Not directly readable·writable

Reading PC:
  Indirect — ADR·ADRP instruction
  
  adr  X0, label   ; X0 = address of label (PC-relative)
  adrp X0, label   ; X0 = page-aligned PC-relative

Branch:
  B   label        ; direct branch
  BL  func         ; branch with link (X30 = return address)
  BR  X0           ; branch to register
  BLR X0           ; branch with link to register
  RET              ; return (PC = X30)

Exception:
  PC saved in ELR_ELx
  Return — ERET (PC = ELR_ELx)
```

PC — *implicit register*. Indirect access.

## PSTATE — Processor State

```text
PSTATE bits (AArch64):

Condition flags (NZCV):
  N   Negative   - result negative
  Z   Zero       - result zero
  C   Carry      - unsigned overflow
  V   Overflow   - signed overflow

Execution state:
  SS    Software Step
  IL    Illegal Execution
  
Mask (interrupts):
  D     Debug exception mask
  A     SError exception mask
  I     IRQ mask
  F     FIQ mask

Current EL:
  EL    Current Exception Level (0~3)
  SP    Stack pointer select (0 or current EL)
  
Other:
  PAN   Privileged Access Never
  UAO   User Access Override
  DIT   Data Independent Timing
  SSBS  Speculative Store Bypass Safe
  BTYPE Branch Target Type
  TCO   Tag Check Override
```

PSTATE — *프로세서 상태 + control*.

## NZCV — Condition Flags

```text
Arithmetic flag update:

ADDS / SUBS / ANDS / ... (S suffix):
  Flags 갱신
  
ADD / SUB / AND / ... (no S):
  Flags 변경 없음

Compare:
  CMP X0, X1    ; subs xzr, x0, x1 (flags 갱신)
  CMN X0, X1    ; adds xzr, x0, x1
  TST X0, X1    ; ands xzr, x0, x1

Conditional branch (B.cond):
  B.EQ  / B.NE   ; Z bit
  B.LT  / B.GE   ; N XOR V
  B.LE  / B.GT   ; (N XOR V) OR Z
  B.LO  / B.HS   ; C bit (unsigned)
  B.LS  / B.HI   ; C AND !Z
  B.VS  / B.VC   ; V bit
  B.MI  / B.PL   ; N bit

Conditional select:
  CSEL Xd, Xn, Xm, cond
    Xd = (cond true) ? Xn : Xm
  
  CSINC, CSINV, CSNEG — variants
```

NZCV — *모든 conditional logic*의 기반.

## Calling Convention — AAPCS64

```text
AAPCS64 (Procedure Call Standard for AArch64):

Argument·Return:
  X0~X7   First 8 integer/pointer arguments
          Return value (X0·X1)
  V0~V7   First 8 FP·SIMD arguments / return
  Stack   9번째+ argument
  
Caller-saved (volatile):
  X0~X18
  V0~V7, V16~V31

Callee-saved (preserved):
  X19~X28
  V8~V15 (lower 64 bits만)
  
Special:
  X29     Frame Pointer (FP)
  X30     Link Register (LR) — return address (BL stores)
  
Stack:
  16-byte aligned at function call boundary
  Stack frame:
    [SP+0]  saved FP (X29)
    [SP+8]  saved LR (X30)
    ...     locals
```

ABI — *모든 OS·compiler 공통*.

## Function 호출 예

```c
int add(int a, int b) {
    return a + b;
}

int main(void) {
    return add(3, 5);
}
```

```asm
add:
    add     w0, w0, w1    ; W0 = W0 + W1 (32-bit add)
    ret                    ; return (PC = X30)

main:
    stp     x29, x30, [sp, -16]!   ; save FP, LR
    mov     x29, sp                ; FP = SP
    
    mov     w0, 3                  ; arg0 = 3
    mov     w1, 5                  ; arg1 = 5
    bl      add                    ; call add (X30 = ret addr)
    
    ldp     x29, x30, [sp], 16     ; restore FP, LR
    ret
```

AArch64 — *load·store + register* model. RISC.

## Atomic·Exclusive Monitor

```text
Exclusive access (ARMv8.0 base):

  LDXR/LDAXR Wt, [Xn]     ; load exclusive
  STXR/STLXR Ws, Wt, [Xn] ; store exclusive (Ws = success)
  CLREX                    ; clear monitor

Spin lock pattern:
  retry:
    ldaxr w0, [x1]          ; load exclusive (acquire)
    cbz   w0, claimed       ; if 0 → take
    wfe                      ; wait for event
    b     retry              ; retry
  claimed:
    mov   w0, #1
    stlxr w2, w0, [x1]      ; store exclusive (release)
    cbnz  w2, retry         ; store fail → retry

LSE (ARMv8.1+):
  CAS / CASP / SWP / LDADD / LDSET / ... 
  Single-instruction atomic
  Lock-free 데이터 구조 효율
  
  cas w0, w1, [x2]    ; atomic compare-and-swap

Load-acquire / Store-release semantics:
  LDAR Xt, [Xn]       ; load + acquire fence
  STLR Xt, [Xn]       ; store + release fence
```

LSE — *modern atomic*. 일반 spinlock보다 효율적.

## FP·SIMD — V0~V31

```text
128-bit V registers — Multiple views:

Scalar FP:
  S0 / D0 / H0          single·double·half precision
  
SIMD lanes:
  V0.16B    16 × 8-bit byte
  V0.8H     8 × 16-bit half
  V0.4S     4 × 32-bit single
  V0.2D     2 × 64-bit double
  V0.4H     4 × 16-bit half (FP16)
  V0.8B     8 × 8-bit byte (lower half)
  V0.2S     2 × 32-bit single (lower half)
  V0.D[0]   lower 64-bit (scalar D access)
  V0.S[0]   lower 32-bit (scalar S access)

NEON instructions:
  add  v0.4s, v1.4s, v2.4s   ; SIMD add 4 lanes
  fmul v0.2d, v1.2d, v2.2d   ; SIMD FP mul 2 lanes
  
Load·Store SIMD:
  ld1 {v0.4s}, [x0]          ; load 4 single
  st1 {v0.4s}, [x0]          ; store 4 single
  ld4 {v0-v3.4s}, [x0]       ; load 4 vectors interleaved
```

SIMD lanes — *parallel 데이터 처리*. DSP·image·signal.

## SVE·SVE2 — 가변 길이

```text
SVE (Scalable Vector Extension):
  ARMv8.2+ optional
  Variable length (128~2048 bit, multiple of 128)
  
SVE2:
  ARMv9.0+ base
  More instructions

Z registers (SVE):
  Z0~Z31    Variable-length vectors
  
Predicate registers:
  P0~P15    Per-lane mask

VL (Vector Length):
  Runtime configurable
  Hardware dependent (Fugaku — 512 bit)
  
Code:
  Length-agnostic
  Same binary runs on different VL hardware
  
사용:
  HPC (Fugaku)
  AI inference·training
  Future Cortex-A (Cortex-A715+)
```

SVE — *변수 length SIMD*. Future ARM.

## TLS·Thread Pointer

```text
Thread-Local Storage (TLS):
  TPIDR_EL0   Thread Pointer per EL0 thread
  TPIDR_EL1   per EL1 thread
  TPIDRRO_EL0 read-only TLS

  Linux glibc:
    TPIDR_EL0 points to per-thread TLS block
    pthread_self() = TPIDR_EL0
  
  Access:
    mrs x0, tpidr_el0   ; read thread pointer
  
ELF __thread variable:
  Compiler emits:
    mrs x0, tpidr_el0
    add x0, x0, #offset  ; per-variable offset
```

TLS — *thread-local 변수 access*.

## Endianness

```text
ARMv8-A — *bi-endian*:
  Configurable runtime (SCTLR_ELx.E bit)
  Big-endian 또는 little-endian
  
실제 사용:
  거의 모든 OS — little-endian
  Linux ARM — LE
  Android — LE
  iOS — LE
  
  Big-endian — embedded·networking 일부
  Cisco IOS XR — BE (ARM port)
```

Little-endian — *de facto*. BE는 niche.

## Memory Access Alignment

```text
Alignment:
  PSTATE.A bit = enable alignment check
  
  Aligned access:
    1-byte access — always
    2-byte — 2-byte aligned
    4-byte — 4-byte aligned
    8-byte — 8-byte aligned
    16-byte — 16-byte aligned
  
  Unaligned access:
    Normal memory — usually allowed (perf hit)
    Device memory — fault
    
ARM 권장:
  - Natural alignment
  - 16-byte alignment for SIMD
  - SP — 16-byte aligned
  - Compiler-generated code — 보통 aligned
```

Alignment — *성능 + safety*.

## Avionics·Embedded 적용

```text
Cortex-A series — 적용:
  Mission computer (FCC·FMS)
  AI inference (image·radar)
  Comm processor
  
Cortex-R52 / R82:
  Safety-critical
  Cortex-A 보조 (actuator·sensor controller)
  
인증 — Cortex-A:
  CAST-32A·AMC 20-193 (multi-core)
  Vendor cert kit (NXP·TI·NVIDIA 등)
  
한국 사례:
  KSLV-II — Cortex-A 기반 FCC
  KF-21 — Cortex-A mission computer
  자동차 ADAS — Cortex-A·R
```

ARMv8-A — *avionics modernization*.

## 자주 하는 실수

> ⚠️ W register 64-bit assumption

```text
mov w0, #0xFFFFFFFF    ; W0 = 0xFFFFFFFF, X0 = 0x00000000_FFFFFFFF
                       ; upper 32 bit cleared
```

→ 64-bit 값은 *X register* 사용.

> ⚠️ SP align 위반

```text
sub sp, sp, #8    ; 8-byte subtract → SP misaligned
push x0           ; ABI violation
```

→ 16-byte multiple 유지.

> ⚠️ Caller-saved register 가정

```text
function call 후 X9 값 사용
→ Volatile, 다음 call에서 destroy
```

→ Callee-saved (X19+) 사용 or save·restore.

> ⚠️ Memory ordering 무시

```text
multi-core shared memory
→ Plain load·store → race
```

→ DMB·LDAR·STLR 등 ordering.

## 정리

- AArch64 — **31 GP regs (X0~X30) + SP + PC + PSTATE + 32 SIMD**.
- **NZCV** — condition flags, conditional logic 기반.
- **AAPCS64** — calling convention.
- **Exclusive monitor + LSE atomic** — lock·CAS.
- **V registers** — 128-bit SIMD (NEON), variable views.
- **SVE·SVE2** — variable-length vector, HPC·AI.
- **TPIDR_EL0** — TLS thread pointer.
- ARMv8-A — *avionics modernization* 핵심 platform.

다음 편은 **AArch64 Exception Levels·System Registers**.

## 관련 항목

- [Ch 1: Overview](/blog/systems/arm/armv8-a-spec/chapter01-overview)
- [Digital Avionics Handbook Ch 4: Computer Architecture](/blog/embedded/avionics/digital-avionics-handbook/chapter04-computer-architecture)
- [원문 — ARM ARM Part A](https://developer.arm.com/documentation/ddi0487/latest)
