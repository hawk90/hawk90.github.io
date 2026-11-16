---
title: "Cortex-M 레지스터 구조 분석 — R0~R15·xPSR·CONTROL·Mask Registers"
slug: "embedded/modern-recipes/part2-03-arm-registers"
date: 2026-04-11T09:15:00
description: "R0-R15·xPSR·CONTROL·PRIMASK·BASEPRI — register set 전체 지도."
series: "Modern Embedded Recipes"
seriesOrder: 15
tags: [recipes, arm, registers]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cortex-M 레지스터는 R0 ~ R15와 xPSR·PRIMASK·FAULTMASK·BASEPRI·CONTROL입니다."** 단순해 보이지만, IRQ 처리·context switch의 모든 코드가 이 레지스터들을 직접 다룹니다.

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
| R4 ~ R11 | variable (callee-saved) | 함수 호출 뒤에도 보존되는 지역 변수. R9는 플랫폼 ABI가 역할을 정함 |
| R12 | IP | intra-procedure call scratch |
| R13 | SP | Stack Pointer (MSP / PSP) |
| R14 | LR | Link Register (return 주소) |
| R15 | PC | Program Counter |

AAPCS(ARM Application Procedure Call Standard)가 함수 호출 시 누가 어떤 레지스터를 보존할지를 정합니다.

### 2) SP — MSP vs PSP

Cortex-M은 두 개의 stack pointer를 갖습니다.

- **MSP (Main Stack Pointer)** — reset 직후와 exception handler가 씁니다.
- **PSP (Process Stack Pointer)** — thread mode에서 CONTROL.SPSEL=1일 때 씁니다. RTOS task가 여기에 해당합니다.

RTOS는 각 task에 PSP를 따로 줍니다. 예외가 발생하면 하드웨어가 레지스터 8개를 그 task의 PSP stack에 쌓고, handler 자체는 항상 MSP를 쓰므로 handler의 stack 사용이 task stack을 침범하지 않습니다.

PSP를 먼저 채운 뒤 CONTROL.SPSEL(bit 1)을 바꿔야 합니다. 순서를 거꾸로 하면 아직 설정하지 않은 PSP로 stack을 쓰게 됩니다.

```c
// CONTROL bit[1] (SPSEL) = 0 → MSP, 1 → PSP (thread mode)
__set_PSP(task_stack_top);
__set_CONTROL(__get_CONTROL() | CONTROL_SPSEL_Msk);   // CMSIS 구현이 MSR 뒤 ISB까지 실행
```

### 3) LR — Link Register와 EXC_RETURN

LR은 두 가지 의미를 갖습니다. 일반 함수 호출에서는 return 주소, IRQ 진입 시에는 EXC_RETURN(special value)입니다.

| EXC_RETURN | 돌아갈 곳 | FP context |
| --- | --- | --- |
| `0xFFFFFFF1` | handler mode, MSP | 없음 |
| `0xFFFFFFF9` | thread mode, MSP | 없음 |
| `0xFFFFFFFD` | thread mode, PSP | 없음 |
| `0xFFFFFFE1` / `0xFFFFFFE9` / `0xFFFFFFED` | 위와 같은 순서 | stack에 FP 영역 있음 (bit 4 = 0) |

표는 ARMv7-M Architecture Reference Manual(DDI 0403E.e) Table B1-9 "EXC_RETURN definition of exception return behavior, with FP extension"을 옮긴 것입니다.

아래 context switch 코드의 `tst r14, #0x10`이 이 bit 4를 봅니다. QEMU `mps2-an386`(Cortex-M4 + FPU)에서 SVC handler 진입 시 LR을 읽어 보면 상황마다 값이 바뀌는 것이 그대로 보입니다(재현 방법은 아래 "QEMU에서 직접 돌려 보기").

```text
CONTROL at reset = 0x00000000
EXC_RETURN (thread, MSP)         = 0xFFFFFFF9
SVC IPSR = 0x0000000B
CONTROL after SPSEL = 0x00000002
EXC_RETURN (thread, PSP)         = 0xFFFFFFFD
CONTROL after FP op = 0x00000006
EXC_RETURN (thread, PSP, FP ctx) = 0xFFFFFFED
SysTick IPSR = 0x0000000F
```

CONTROL.SPSEL(bit 1)을 켜면 `0x2`, 첫 FP 명령을 실행하면 CONTROL.FPCA(bit 2)가 켜져 `0x6`이 되고, 그 상태에서 들어간 예외의 EXC_RETURN은 bit 4가 0인 `0xFFFFFFED`가 됩니다. SVC의 IPSR 11과 SysTick의 IPSR 15는 다음 절의 exception 번호입니다.

`BX LR`로 IRQ를 나갈 때 CPU가 이 값을 보고 올바른 stack을 복원합니다. 정상 함수 return은 PC에 LR을 복사하는 것과 같습니다.

### 4) xPSR — Program Status Register

xPSR은 3개의 view로 나뉩니다.

| 부분 | bit | 의미 |
| --- | --- | --- |
| APSR | 31 ~ 27 (M4는 GE 19 ~ 16 추가) | N, Z, C, V, Q flag |
| IPSR | 8 ~ 0 | 현재 처리 중인 exception 번호 (외부 IRQ는 IRQn + 16) |
| EPSR | 26 ~ 25, 24, 15 ~ 10 | Thumb mode bit (T), ICI/IT |

IPSR 값은 NVIC의 IRQ 번호가 아니라 exception 번호입니다. 0~15는 Reset·HardFault·SysTick 같은 시스템 예외가 쓰고, 외부 IRQ는 16부터 시작합니다(CMSIS `NVIC_USER_IRQ_OFFSET` = 16).

```c
uint32_t psr = __get_xPSR();
uint32_t exc_num = psr & 0x1FF;      // IPSR: exception 번호 (0이면 thread mode)
int32_t irqn = (int32_t)exc_num - 16; // 외부 IRQ일 때만 0 이상
```

Cortex-M은 Thumb 상태로만 실행되므로 T bit이 0인 채로 실행하면 UsageFault(INVSTATE)가 발생합니다. UsageFault를 켜 두지 않았다면(`SCB->SHCSR`의 USGFAULTENA) HardFault로 올라갑니다.

### 5) Special registers — CONTROL, PRIMASK, BASEPRI, FAULTMASK

| 레지스터 | 역할 |
|----------|------|
| `CONTROL` | privilege level, SP 선택, FPU active |
| `PRIMASK` | bit 0 = 1이면 모든 configurable IRQ 차단 (NMI/HardFault 제외) |
| `FAULTMASK` | bit 0 = 1이면 NMI 제외 모든 fault/IRQ 차단 (M3+) |
| `BASEPRI` | 8-bit, 우선순위 값이 이 값 이상인(덜 급한) 예외 차단 (M3+, 0이면 disable) |

```c
// Critical section — IRQ 차단
__disable_irq();         // PRIMASK = 1
/* ... */
__enable_irq();          // PRIMASK = 0

// 부분 차단 — 우선순위 값 5 이상(덜 급한 IRQ)만 차단, 0~4는 계속 처리
__set_BASEPRI(5 << (8 - __NVIC_PRIO_BITS));
```

`mps2-an386` 모델에서 `__NVIC_PRIO_BITS`를 3으로 두고 IRQ0을 우선순위 3, IRQ1을 6으로 설정한 뒤 BASEPRI 구간 안에서 둘을 함께 pending시켰습니다. 우선순위 3인 IRQ0은 즉시 실행되고, 6인 IRQ1은 BASEPRI를 0으로 되돌린 뒤에야 실행됩니다.

```text
BASEPRI = 5 << (8 - __NVIC_PRIO_BITS); pend IRQ0 and IRQ1
  BASEPRI register = 0x000000A0
  IRQ0 (prio 3) ran
  (still inside BASEPRI section)
  IRQ1 (prio 6) ran
  BASEPRI = 0
```

레지스터에 실제로 들어간 값이 5가 아니라 `0xA0`(= 5 << 5)이라는 점이 아래 "BASEPRI 정렬" 함정의 근거입니다.

FreeRTOS의 ARM_CM3·ARM_CM4F 포트는 critical section에 들어갈 때 BASEPRI를 `configMAX_SYSCALL_INTERRUPT_PRIORITY`로 올립니다. 그래서 이보다 급한(값이 작은) IRQ는 critical section 중에도 처리됩니다. 대신 그런 IRQ에서는 FreeRTOS API를 부를 수 없습니다.

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

HW가 자동 stacking 하는 8개 register(R0 ~ R3, R12, LR, PC, xPSR)와 SW가 직접 처리하는 8개(R4 ~ R11)를 나눠 다룹니다. SW 쪽은 EXC_RETURN이 든 LR도 함께 저장해, 복귀할 task가 FP context를 썼는지 bit 4로 다시 판단합니다. FreeRTOS ARM_CM4F 포트의 `xPortPendSVHandler`도 같은 순서로 저장·복원하며, `cpsid i` 대신 BASEPRI로 IRQ를 막는다는 점만 다릅니다.

### QEMU에서 직접 돌려 보기

위 `PendSV_Handler`를 `.S` 파일에 그대로 넣고(`.syntax unified`, `.thumb` 지시어만 추가), 두 task가 `s16`에 서로 다른 float를 둔 채 PendSV로 번갈아 양보하게 했습니다. C 쪽은 `current_tcb`, `scheduler_next()`와 초기 stack frame만 제공합니다. 초기 frame은 위에서부터 xPSR=`0x01000000`, PC=task 함수, LR, R12, R3~R1, R0=인자 순서의 HW frame 8 word 아래에, `ldmia r0!, {r4-r11, lr}`가 읽을 R4~R11 8 word와 EXC_RETURN=`0xFFFFFFFD` 1 word를 둡니다.

- 툴체인: arm-none-eabi-gcc 16.2.0, CMSIS_6(commit `69b5aa3`)의 `core_cm4.h`, newlib 없이 `-nostdlib`
- 타깃: QEMU 11.1.3 `qemu-system-arm -M mps2-an386`, 출력은 semihosting(`SYS_WRITE0`)
- 하네스: vector table과 `.data`/`.bss` 초기화만 하는 `startup.c`, FLASH `0x00000000`·RAM `0x20000000`의 `link.ld`

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -ffreestanding -O1 -g \
  -Iharness -ICMSIS_6/CMSIS/Core/Include -nostdlib -T harness/link.ld \
  harness/startup.c harness/semi.c main.c pendsv.S -o p2-03.elf
qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native,userspace=on -kernel p2-03.elf
```

```text
task A s16 bits = 0x3FA00000
task B s16 bits = 0x40200000
task A s16 bits = 0x3FA00000
task B s16 bits = 0x40200000
task A s16 bits = 0x3FA00000
task B s16 bits = 0x40200000
done
```

`0x3FA00000`은 1.25f, `0x40200000`은 2.5f의 비트 패턴입니다. 각 task가 양보하고 돌아온 뒤에도 자기 `s16` 값을 그대로 갖고 있으므로, `vstmdbeq`/`vldmiaeq`가 callee-saved FP 레지스터를 제대로 저장·복원한 것입니다. QEMU는 기능 모델이라 이 실행은 순서와 값의 정확성을 확인할 뿐 cycle 수는 재지 않습니다.

## 측정 / 비교

| 레지스터 종류 | 개수 | 32-bit 폭 | 비고 |
| --- | --- | --- | --- |
| GP (R0 ~ R12) | 13 | O | 일반 연산 |
| SP / LR / PC | 3 | O | 특수 의미 |
| xPSR | 1 | O | status flag |
| PRIMASK | 1 | O (1 bit 의미) | IRQ mask |
| BASEPRI | 1 | O (8 bit 의미) | 부분 IRQ mask |
| FAULTMASK | 1 | O (1 bit) | fault mask |
| CONTROL | 1 | O (M4F 기준 nPRIV·SPSEL·FPCA 3 bit) | privilege/SP/FP |
| FPU s0 ~ s31 | 32 | O | FPU 옵션 |

| IRQ entry 시 HW push | 자동 |
| --- | --- |
| R0, R1, R2, R3, R12, LR, PC, xPSR | 8 word = 32 byte |
| FP context 사용 중(M4F) | 위 8개 + S0 ~ S15·FPSCR |

## 자주 보는 함정

> ⚠️ Privileged mode 가정 코드를 unprivileged에서 실행

CONTROL[0](nPRIV)을 1로 설정한 task가 System Control Space(SCB, NVIC 등)에 접근하면 BusFault가 납니다(STIR처럼 따로 허용한 레지스터만 예외). ARMv7-M ARM은 "Unprivileged access to the PPB causes BusFault errors unless otherwise stated"라고 적고, 예외로 CCR.USERSETMPEND를 켠 경우의 STIR을 듭니다. 같은 QEMU 하네스에서 CONTROL을 `0x3`(nPRIV + SPSEL)으로 바꾼 뒤 `SCB->ICSR`을 읽으면 다음과 같이 됩니다.

```text
CONTROL (unprivileged, PSP) = 0x00000003
BusFault CFSR = 0x00008200
  BFAR = 0xE000ED04
```

CFSR의 bit 9(PRECISERR)와 bit 15(BFARVALID)가 켜졌고, BFAR가 ICSR 주소 `0xE000ED04`를 가리킵니다. RTOS에서 unprivileged task를 만들 때는 이런 접근을 SVC 같은 privileged 경로로 옮겨야 합니다.

> ⚠️ Inline assembly에서 R0 ~ R3 clobber 누락

GCC 매뉴얼의 Extended Asm "Clobbers and Scratch Registers" 절은 컴파일러가 출력 operand의 변경만 안다고 적습니다. asm이 그 밖의 레지스터를 바꾸면 clobber 목록에 적어야 하고, 빠뜨리면 컴파일러는 그 레지스터에 둔 값이 그대로라고 가정합니다.

> ⚠️ FPU context 저장 누락

M4F에서 하드웨어는 S0 ~ S15와 FPSCR만 자동으로 쌓습니다. S16 ~ S31은 context switch 코드가 직접 저장해야 하고(위 코드의 `vstmdbeq`), 빠뜨리면 다른 task가 FPU 결과를 덮어씁니다. 자동 저장분은 lazy stacking으로 실제 FP 명령이 나올 때까지 미뤄지며, 예약된 위치는 FPCAR에 기록됩니다.

> ⚠️ BASEPRI를 priority bit 정렬 안 하고 설정

BASEPRI는 priority bit이 MSB 쪽에 정렬돼 있습니다. NVIC priority 5를 BASEPRI=5로 쓰면 안 됩니다. `5 << (8 - NVIC_PRIO_BITS)`로 변환.

> ⚠️ xPSR Thumb bit 클리어

새 task의 초기 stack frame을 만들 때 xPSR의 T bit(bit 24)를 빠뜨리면, exception return으로 그 task에 들어가는 순간 UsageFault(INVSTATE)가 납니다. QEMU 하네스에서 xPSR=`0x00000000`인 frame으로 복귀시켜 보면, UsageFault를 켰을 때와 끈 때가 다르게 보입니다.

```text
# SHCSR.USGFAULTENA = 1
UsageFault CFSR = 0x00020000
  UFSR.INVSTATE = 0x00000001
# SHCSR.USGFAULTENA = 0
HardFault HFSR = 0x40000000
  CFSR = 0x00020000
```

UsageFault를 끄면 같은 INVSTATE(CFSR bit 17)가 HardFault로 올라가고 HFSR의 FORCED(bit 30)가 켜집니다. FreeRTOS ARM_CM4F 포트(`port.c`의 `portINITIAL_XPSR`)는 초기 xPSR을 `0x01000000`(T bit만 1)으로 넣습니다.

## 정리

- Cortex-M은 R0 ~ R15와 special register(CONTROL, PRIMASK, BASEPRI, FAULTMASK, xPSR)로 구성됩니다. A-profile의 CPSR·SPSR·모드별 banked register는 없고, ARMv7-M 기준으로 banked인 것은 SP(MSP·PSP)뿐입니다.
- IPSR은 IRQ 번호가 아니라 exception 번호입니다(외부 IRQ = IRQn + 16).
- SP는 MSP / PSP로 나뉩니다. RTOS는 task에 PSP를 줘 stack 격리를 합니다.
- IRQ entry 시 HW가 8 register를 자동 push하고, context switch 코드가 R4 ~ R11(FP 사용 시 S16 ~ S31까지)을 추가로 저장합니다.
- BASEPRI는 부분 IRQ 차단에 씁니다. FreeRTOS critical section의 기반입니다.
- Privilege level, FPU context, T bit 같은 작은 실수가 fault를 부릅니다.

다음 편에서는 **Cortex-M 예외 처리**를 다룹니다. NVIC, tail-chaining, late-arrival의 하드웨어 동작입니다.

## 관련 항목

- [2-01: Cortex-M 시리즈 비교](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)
- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [2-09: TrustZone-M 기초](/blog/embedded/modern-recipes/part2-09-trustzone-m)
- 더 깊이 — [Practical RTOS Internals: Context Switch 구현](/blog/embedded/rtos/practical-internals/00-preface)
