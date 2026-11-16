---
title: "ARM Cortex-M Context Switch — PendSV·MSP/PSP 어셈블리 추적"
slug: "embedded/rtos/practical-internals/part2-05-cortex-m-context"
date: 2026-05-05T09:15:00
description: "Cortex-M context switch는 PendSV 예외와 dual-stack 모델로 압축됩니다. FreeRTOS port의 PendSV 핸들러 어셈블리를 한 줄씩 따라가며 EXC_RETURN, BASEPRI, lazy FPU까지 풀어봅니다."
series: "Practical RTOS Internals"
seriesOrder: 15
tags: [cortex-m, pendsv, msp, psp, svc, assembly]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0 GCC/ARM_CM4F**에서는 PendSV가 현재 태스크의 R4–R11·EXC_RETURN과 필요한 FP 상태를 저장하고 다음 태스크를 복원합니다. 이 글은 해당 포트의 비 MPU 구성과 Cortex-M4F를 기준으로 설명합니다. 모든 Cortex-M 포트의 프레임이 같지는 않습니다.

## 왜 PendSV인가

이 포트는 일반 ISR 안에서 곧바로 태스크 스택을 갈아끼우지 않고 PendSV를 요청합니다. PendSV를 가장 낮은 우선순위로 설정하면 모든 활성 handler가 끝난 뒤에야 PendSV가 들어오므로, 중첩된 ISR이 남아 있는 상태에서 task stack을 바꾸는 일이 없습니다. 무대 전환을 막이 내려간 뒤에만 하는 것과 같습니다.

원본 port.c는 PendSV와 SysTick의 서로 다른 필드를 **같은 SHPR3 레지스터**에 설정합니다. 두 값 모두 `portMIN_INTERRUPT_PRIORITY`(255)를 각 필드 위치로 shift한 것입니다(1-04, `ARM_CM3/port.c` L55-L57과 같은 정의).

```c
portNVIC_SHPR3_REG |= portNVIC_PENDSV_PRI;
portNVIC_SHPR3_REG |= portNVIC_SYSTICK_PRI;
```

숫자가 작을수록 높은 NVIC 우선순위입니다. PendSV 실행 중에도 더 높은 우선순위 IRQ는 들어옵니다. 그 ISR의 frame은 MSP에 쌓이므로 PendSV가 다루는 PSP frame은 건드리지 않습니다. 다만 `vTaskSwitchContext()`를 부르는 구간은 BASEPRI로 막혀 있어, FreeRTOS API를 쓰는 IRQ는 그 구간에 끼어들지 못합니다(아래).

## PendSV trigger — yield의 정체

yield 요청은 ICSR의 PENDSVSET에 1을 써서 예외를 pending으로 만듭니다. 다음은 원본의 배리어 동작을 독립 어셈블리로 표현한 예제입니다.

```asm title="request-pendsv.S"
.syntax unified
.thumb
.text
.global request_pendsv
.thumb_func
request_pendsv:
    ldr r0, =0xe000ed04
    ldr r1, =0x10000000
    str r1, [r0]
    dsb
    isb
    bx lr
```

이 함수를 task에서 부르면 PendSV는 `isb` 직후 들어옵니다. ISR이나 critical section 안에서 부르면 그 우선순위와 BASEPRI가 풀릴 때까지 pending으로 남습니다. DSB는 앞선 메모리 접근의 완료를 기다리고 ISB는 변경된 실행 상태를 반영하도록 명령 실행을 동기화합니다. 1-04의 `request_switch` objdump가 C 매크로 `portYIELD_FROM_ISR(pdTRUE)`도 같은 세 명령(`str`, `dsb`, `isb`)이 됨을 보여 줍니다.

## Dual-stack model — MSP와 PSP

| 스택 | 이 포트에서의 용도 |
| --- | --- |
| MSP | 부팅과 handler 실행, 스케줄러 호출 중 임시 저장 |
| PSP | 각 태스크의 실행 스택과 그 태스크의 첫 예외 프레임 |

PSP에서 실행하던 Thread가 예외에 진입하면 **자동 프레임은 PSP에 만들어지고**, handler 실행은 MSP를 사용합니다(DDI 0403E.b B1.5.6). handler 안에서 중첩되는 예외의 프레임은 MSP를 차지합니다. 그래서 task stack에는 task당 첫 예외 frame 하나(17 또는 51 word, 2-04)만 더하면 됩니다.

첫 태스크를 시작할 때 SVC handler가 초기 프레임의 EXC_RETURN을 복원합니다. 0xFFFFFFFD로 예외 복귀하면 Thread + PSP가 선택됩니다. 원본 SVC handler가 CONTROL.SPSEL에 직접 1을 쓰는 것은 아닙니다. Handler에서는 항상 MSP를 사용하며 CONTROL.SPSEL은 Thread의 선택을 나타냅니다.

다음 그림은 FP 확장과 정렬 word를 제외한 기본 프레임입니다. HW의 thread LR 슬롯과 SW의 EXC_RETURN 슬롯을 구별해서 보세요.

![ARM_CM4F 기본 PSP 프레임: 낮은 주소부터 R4–R11, EXC_RETURN, HW 기본 프레임](/images/blog/rtos/diagrams/part2-05-pendsv-context-save.svg)

## PendSV 핸들러 — 한 줄씩 풀기

원본 handler([`ARM_CM4F/port.c` L504-L550](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L504-L550))의 동작을 세 단계로 나눠 봅니다. 아래 세 조각은 원본 asm 문자열에서 주석과 빈 줄, XMC4000 errata용 `#ifdef WORKAROUND_PMU_CM001` 블록(L544-L549)을 뺀 연속 발췌이고, `%0`(`configMAX_SYSCALL_INTERRUPT_PRIORITY` 입력 operand)만 이름으로 바꿔 적었습니다.

먼저 PSP를 읽고 FP 확장 여부에 따라 S16–S31을 저장합니다. 이어 R4–R11과 **현재 태스크의 EXC_RETURN**을 저장하고 그 주소를 TCB 첫 필드에 기록합니다.

```asm
    mrs r0, psp
    isb
    ldr r3, =pxCurrentTCB
    ldr r2, [r3]
    tst r14, #0x10
    it eq
    vstmdbeq r0!, {s16-s31}
    stmdb r0!, {r4-r11, r14}
    str r0, [r2]
```

다음은 MSP에 작업 레지스터를 잠시 보존하고 BASEPRI를 설정한 뒤 vTaskSwitchContext를 호출하는 구간입니다. 이 MSP 저장은 태스크의 PSP 프레임과 별도이며, BL이 덮어쓰는 handler LR에 다음 태스크의 EXC_RETURN을 맡겨서는 안 됩니다.

```asm
    stmdb sp!, {r0, r3}
    mov r0, #configMAX_SYSCALL_INTERRUPT_PRIORITY
    msr basepri, r0
    dsb
    isb
    bl vTaskSwitchContext
    mov r0, #0
    msr basepri, r0
    ldmia sp!, {r0, r3}
```

마지막에는 새 TCB에서 PSP와 EXC_RETURN을 함께 읽습니다. 새 태스크의 프레임 형식에 따라 FP 상위 레지스터를 복원하고 예외 복귀합니다.

```asm
    ldr r1, [r3]
    ldr r0, [r1]
    ldmia r0!, {r4-r11, r14}
    tst r14, #0x10
    it eq
    vldmiaeq r0!, {s16-s31}
    msr psp, r0
    isb
    bx r14
```

원래 태스크의 EXC_RETURN을 그대로 사용하면 정수 태스크와 FP 태스크 사이에서 HW가 잘못된 프레임 형식을 해석할 수 있습니다. 그래서 r14 저장은 단순한 호출 LR 보존이 아니라 **태스크별 복귀 계약의 일부**입니다.

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

표는 FP extension이 있는 구현의 정의입니다(DDI 0403E.b B1.5.8 Table B1-9). FreeRTOS task는 늘 Thread mode + PSP로 돌므로, task로 돌아갈 때 r14는 **0xFFFFFFFD**(FP를 안 쓴 task) 또는 **0xFFFFFFED**(FP를 쓴 task) 둘 중 하나입니다. 2-04의 QEMU 실험에서 저장된 frame을 읽었을 때 나온 값도 이 둘이었습니다. `bx r14` 한 줄이 *이 정보를 그대로 HW에 전달*합니다. 표에 없는 값을 쓰면 UsageFault가 납니다.

## 첫 task 시작 — SVC를 쓰는 이유

원본 prvPortStartFirstTask는 vector table의 초기 MSP를 복구하고 CONTROL을 초기화한 뒤 SVC를 발생시킵니다. 첫 태스크에는 저장할 이전 context가 없으므로 SVC handler가 초기 태스크의 프레임을 복원하는 역할을 합니다.

다음은 V11.2.0 ARM_CM4F `vPortSVCHandler`([`port.c` L260-L274](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L260-L274))의 asm에서 주석과 `.ltorg`를 뺀 발췌입니다. 초기 스택에는 R4–R11 다음에 EXC_RETURN 슬롯이 이미 있어야 합니다.

```asm
    ldr r3, =pxCurrentTCB
    ldr r1, [r3]
    ldr r0, [r1]
    ldmia r0!, {r4-r11, r14}
    msr psp, r0
    isb
    mov r0, #0
    msr basepri, r0
    bx r14
```

LR에 임의로 비트를 OR해서 EXC_RETURN을 만드는 코드와 이 프레임 형식을 섞으면 저장 슬롯이 어긋납니다. 이 포트에서는 초기 스택에 기록한 0xFFFFFFFD를 복원해서 사용합니다.

## SysTick — Time slice trigger

원본 `xPortSysTickHandler`는 BASEPRI를 올리고 `xTaskIncrementTick()`을 호출합니다. 반환값이 `pdTRUE`면 PENDSVSET을 쓰고 마스크를 해제합니다. `pdTRUE`가 되는 세 경로는 1-04에서 봤습니다.

여기서 SysTick은 태스크 레지스터를 직접 교체하지 않습니다. tick 처리와 전환 요청을 담당하고 실제 저장·복원은 PendSV가 수행합니다. tick handler, ISR yield 매크로, 명시적 yield가 같은 전환 경로로 모이는 구조입니다.

## BASEPRI — 똑똑한 IRQ mask

BASEPRI에는 NVIC priority 필드 형식으로 인코딩한 값을 씁니다. "BASEPRI has the same format as those fields"이고 "A value of zero disables masking by BASEPRI"입니다(DDI 0403E.b B1.4.3). 구현 priority bit가 4개이고 논리 경계가 5라면 다음처럼 0x50이 됩니다. 이 장의 QEMU config는 8비트를 모두 쓰는 `(5<<5)` = 0xA0이었습니다(1-05).

```c title="priority-encoding.c"
#define IMPLEMENTED_PRIORITY_BITS 4U
#define LOGICAL_MAX_SYSCALL_PRIORITY 5U
#define ENCODED_MAX_SYSCALL_PRIORITY     (LOGICAL_MAX_SYSCALL_PRIORITY << (8U - IMPLEMENTED_PRIORITY_BITS))
_Static_assert(ENCODED_MAX_SYSCALL_PRIORITY == 0x50U,
               "BASEPRI uses encoded priority bits");
```

이 구성에서 논리 5–15의 IRQ는 해당 BASEPRI 마스크에 걸리고 0–4는 걸리지 않습니다. 마스크 밖의 높은 긴급도 ISR이 FreeRTOS API를 부르면 `vPortValidateInterruptPriority()`의 `configASSERT`에 걸립니다(1-05의 QEMU 실험: 0x80 → `port.c` line 803).

PRIMASK를 설정하는 `cpsid i`는 실행 우선순위를 0으로 올립니다(DDI 0403E.b B1.4.3, "Setting PRIMASK to 1 raises the execution priority to 0"). 그래서 configurable-priority 예외는 막지만 고정 우선순위 −2의 NMI와 −1의 HardFault는 막지 못합니다. BASEPRI가 없는 Cortex-M0 포트는 `portDISABLE_INTERRUPTS()`를 바로 `cpsid i`로 정의합니다([`ARM_CM0/portmacro.h` L308](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM0/portmacro.h#L308)). M0에서는 critical section이 모든 IRQ를 막는다는 뜻입니다.

## FPU — Lazy stacking

EXC_RETURN bit 4가 0이면 확장 FP 프레임 형식입니다. CONTROL.FPCA는 bit 2의 별도 상태이며 PendSV의 tst r14,#0x10을 FPCA 직접 검사라고 부르면 안 됩니다.

HW 확장 공간은 S0–S15·FPSCR·reserved word의 18 word이고 SW는 S16–S31의 16 word를 추가 보존합니다. 기본 68 byte에 136 byte가 더해져 204 byte이고, 2-04의 QEMU `mps2-an386` 실험에서 FP를 쓴 task의 EXC_RETURN이 이 확장 형식(0xFFFFFFED)이었습니다. FP 경로를 건너뛰는 task도 `tst`와 조건 명령은 거칩니다.

FreeRTOS CM4F 포트는 scheduler를 시작할 때 FPCCR의 ASPEN·LSPEN 두 bit를 켭니다([`port.c` L88-L89, L448](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L448)). ASPEN이 켜져 있으면 FP 명령을 쓴 문맥에서 예외가 날 때마다 하드웨어가 S0–S15·FPSCR 자리를 잡고, LSPEN이 켜져 있으면 실제 저장은 handler가 FP를 처음 쓸 때로 미룹니다. 그래서 ISR이 C 코드로 FP를 써도 S0–S15는 하드웨어가 보존하고, S16–S31은 AAPCS상 callee-saved라 컴파일러가 보존합니다.

## SVC vs PendSV — 한눈에

| | SVC | PendSV |
| --- | --- | --- |
| Trigger | `SVC #N` 명령 | ICSR.PENDSVSET = 1 |
| Priority | 설정 가능(FreeRTOS CM4F 포트는 `portNVIC_SHPR2_REG = 0`으로 최고 우선순위 0에 둠, [`port.c` L431-L435](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L431-L435)) | FreeRTOS 포트가 255로 설정 |
| 용도 | OS API entry, 첫 task 시작 | Context switch |
| 발생 시점 | 동기적 예외, 우선순위·마스크 제약 확인 | pending 뒤 우선순위·마스크 조건이 허용할 때 |

SVC는 *동기적 시스템 호출*, PendSV는 *비동기적 지연 context switch*에 쓰입니다.

## Cortex-M0/M0+의 차이

ARMv6-M에는 BASEPRI와 CLZ가 없고, 16비트 Thumb `stm`/`ldm`은 r0-r7만 다룹니다. CLZ가 없어 FreeRTOS M0 포트는 generic 선택만 쓰고(2-01), BASEPRI가 없어 critical section이 `cpsid i`입니다(위).

다음 예제는 **R4–R11 보존 순서만** 보이는 독립 subroutine입니다. FreeRTOS PendSV 전체가 아니며 예외 복귀·TCB·IRQ 보호는 포함하지 않습니다. 입력 R0는 32 byte의 유효한 저장 버퍼입니다. 낮은 레지스터를 먼저 저장한 뒤 높은 레지스터를 옮겨야 원래 R4–R7을 잃지 않습니다.

```asm title="m0-register-roundtrip.S"
.syntax unified
.thumb
.text
.global m0_register_roundtrip
.thumb_func
m0_register_roundtrip:
    stmia r0!, {r4-r7}
    mov r4, r8
    mov r5, r9
    mov r6, r10
    mov r7, r11
    stmia r0!, {r4-r7}
    subs r0, #16
    ldmia r0!, {r4-r7}
    mov r8, r4
    mov r9, r5
    mov r10, r6
    mov r11, r7
    subs r0, #32
    ldmia r0!, {r4-r7}
    bx lr
```

이 루틴을 `-mcpu=cortex-m0`으로 어셈블하면 ARMv6-M 명령만으로 통과합니다. 실행은 QEMU `mps2-an385`(Cortex-M3, ARMv6-M 명령을 그대로 실행)에서 bare-metal로 했습니다. r4-r11에 0x44444444~0xBBBBBBBB를 넣고 호출한 뒤 버퍼와 레지스터를 비교했습니다.

```text
r4 saved=0x44444444 after=0x44444444
r5 saved=0x55555555 after=0x55555555
r6 saved=0x66666666 after=0x66666666
r7 saved=0x77777777 after=0x77777777
r8 saved=0x88888888 after=0x88888888
r9 saved=0x99999999 after=0x99999999
r10 saved=0xaaaaaaaa after=0xaaaaaaaa
r11 saved=0xbbbbbbbb after=0xbbbbbbbb
PASS r4-r11 stored in order and restored
```

버퍼에 r4~r11이 순서대로 들어갔고, 루틴이 중간에 r4~r7을 덮어쓴 뒤 버퍼에서 되돌렸으므로 r4~r7 복원도 확인됩니다. r8~r11은 저장과 복원 사이에 바뀌지 않으므로 이 시험은 그 복원 경로까지는 검증하지 못합니다. 실제 ARM_CM0 포트의 PendSV는 이 전사에 더해 PSP 저장, `cpsid i`, `vTaskSwitchContext` 호출을 합니다([`ARM_CM0/port.c`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM0/port.c)).

## 자주 하는 실수

- **다른 포트의 프레임과 SVC 코드를 혼합합니다.** R4–R11만 복원하는 코드와 EXC_RETURN 슬롯이 있는 초기 프레임을 섞지 않습니다.
- **PendSV 우선순위를 높입니다.** 활성 handler를 남긴 채 태스크 전환을 하지 않도록 포트의 최저 우선순위 설정을 지킵니다.
- **BASEPRI에 논리 숫자 5를 그대로 씁니다.** 구현되지 않은 하위 bit는 RAZ이므로(DDI 0403E.b B1.5.4 "Maximum supported priority value") 4비트 구현에서 0x05는 0이 되고, BASEPRI 0은 마스크를 끕니다. 구현 bit 수만큼 shift해 0x50으로 씁니다.
- **모든 프레임이 MSP에 저장된다고 생각합니다.** 태스크의 첫 예외 프레임은 PSP 사용량에 포함됩니다.
- **M0에서 높은 레지스터를 먼저 R4–R7로 옮깁니다.** 덮어쓰기 전에 원래 낮은 레지스터를 보존해야 합니다.

## 정리

- 이 장의 기준은 FreeRTOS V11.2.0 GCC/ARM_CM4F입니다.
- PSP 프레임에는 R4–R11뿐 아니라 태스크별 EXC_RETURN도 저장합니다.
- SVC는 초기 스택의 EXC_RETURN을 읽어 첫 태스크로 복귀합니다.
- BASEPRI 값은 NVIC 형식으로 인코딩하고 API 사용 가능 IRQ 계약을 지킵니다.
- FP 확장은 HW 18 + SW 16 word이며 EXC_RETURN bit 4로 복원 형식을 구분합니다.
- M0에서는 낮은 레지스터를 먼저 저장해야 높은 레지스터를 옮길 수 있습니다(QEMU에서 r4~r11 저장 순서와 r4~r7 복원 확인).

다음 편은 ARMv7-A AArch32의 banked register와 실제 ARM_CA9 포트를 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): 이 장의 handler·초기 스택·우선순위 설정 기준.
- [같은 태그의 portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): yield·BASEPRI 계약.
- [같은 태그의 ARM_CM0 port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM0/port.c): M0의 실제 저장·복원 구현.

## 관련 항목

- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
- [2-06: ARM Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [3-09: ISR 안에서 RTOS API 호출](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
