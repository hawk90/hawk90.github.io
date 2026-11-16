---
title: "Context Switch 원리 분석 — 레지스터 저장·복원·Stack Frame"
slug: "embedded/rtos/practical-internals/part2-04-context-switch"
date: 2026-05-05T09:14:00
description: "Context switch는 태스크 재개에 필요한 상태를 보존하고 다음 태스크의 상태를 복원하는 과정입니다. FreeRTOS ARM_CM4F 포트를 기준으로 저장 프레임과 비용의 경계를 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 14
tags: [context-switch, register, stack-frame, caller-saved, callee-saved]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

Context switch는 **중단한 태스크를 같은 실행 상태로 재개할 수 있도록 필요한 상태를 보존하고, 다음 태스크의 상태를 복원하는 과정**입니다. 저장 대상과 위치는 ISA, ABI, RTOS 포트에 따라 다릅니다. 이 글의 구체적인 프레임 계산은 FreeRTOS **V11.2.0, GCC/ARM_CM4F, 32비트 스택 word**를 기준으로 합니다.

## Context란 무엇인가

태스크가 레지스터에 보관한 계산 결과, 다음에 실행할 PC, 스택 위치와 상태 레지스터 등이 재개에 필요한 context입니다. FP·벡터·TLS·권한 상태는 지원 기능과 포트 정책에 따라 추가됩니다. 모든 장치 레지스터나 CPU 전체 상태를 매번 복제하는 것은 아닙니다.

| 항목 | Cortex-M4F | ARMv7-A AArch32 | RV32I M-mode |
| --- | --- | --- | --- |
| 범용 상태 | R0–R12, thread LR | R0–R12, 실행 모드의 LR | x1–x31 중 포트가 보존하는 상태 |
| 스택 | 태스크 PSP, 별도 handler MSP | banked SP와 태스크 SP 관리 | x2(sp), 필요하면 소프트웨어로 ISR 스택 전환 |
| 재개 위치·상태 | 예외 프레임 PC/xPSR와 EXC_RETURN | 복귀 PC와 CPSR/SPSR | mepc/mstatus |
| 선택적 확장 | S0–S31, FPSCR 등 | 지원 VFP/NEON 레지스터 | 지원 FP·벡터·플랫폼 확장 |

RISC-V의 x0은 항상 0이므로 저장할 필요가 없습니다. 저장 공간은 태스크 스택일 수도 있고 TCB 또는 별도 확장 context 영역일 수도 있습니다. 책을 읽다 덮을 때 책갈피와 메모를 끼워 두는 것과 같아서, 무엇을 끼워 둘지는 다시 펼칠 사람(ISA와 포트)이 정합니다.

## 언제 발생하는가

Context switch가 트리거되는 시점은 크게 세 가지입니다.

- **Tick 인터럽트** — time slice 만료 또는 더 우선순위 높은 task가 ready
- **Blocking 시스템 호출** — `vTaskDelay`, `xSemaphoreTake` 등이 block을 유발
- **ISR 종료 시점** — ISR이 더 우선순위 높은 task를 wake 시켰을 때

세 경우 모두 결국 *스케줄러가 호출*되고, 스케줄러가 *현재와 다른 task*를 선택하면 switch가 일어납니다. 2-03의 QEMU 전환 기록이 세 경우를 모두 보여 줍니다.

## Caller-saved vs Callee-saved

AAPCS32의 일반 함수 호출에서는 R0–R3·R12가 임시값이고 "A subroutine must preserve the contents of the registers r4-r8, r10, r11 and SP"입니다([AAPCS32 2025Q1](https://github.com/ARM-software/abi-aa/blob/2025Q1/aapcs32/aapcs32.rst) L880-L881). R9는 "Platform register"로, 역할은 플랫폼이 정합니다(L866).

그러나 인터럽트는 함수 호출 경계가 아닌 명령 사이에서도 발생합니다. 중단한 코드가 임시 레지스터의 값을 계속 사용할 수 있으므로, 일반 호출에서 caller-saved라는 이유로 버릴 수 없습니다. Cortex-M의 기본 예외 프레임과 포트의 소프트웨어 저장이 이 상태를 나눠 보존합니다.

## Cortex-M의 두 단계 save — HW + SW

Cortex-M4F에서 PSP를 쓰던 태스크가 예외에 진입하면 HW가 기본 8 word를 태스크 PSP에 쌓습니다. handler 자체는 MSP에서 실행하며, 포트가 추가 상태를 PSP 쪽에 저장합니다.

| 낮은 주소부터의 순서 | 저장 주체 | word 수 |
| --- | --- | ---: |
| R4–R11, handler LR의 EXC_RETURN | ARM_CM4F PendSV | 9 |
| R0–R3, R12, thread LR, return PC, xPSR | 예외 진입 HW | 8 |

이 포트의 **기본 context는 17 word = 68 byte**입니다. EXC_RETURN은 thread 함수의 LR과 다른 값이므로 두 저장 슬롯을 혼동하면 안 됩니다. FP 확장 프레임과 정렬 보정 word는 이 표에서 제외했습니다. 다른 Cortex-M 포트의 16 word 프레임과 섞어 계산하지 않습니다.

## 전체 흐름

1. 예외 진입 시 HW가 태스크 PSP에 기본 프레임을 만듭니다. FP 상태에 따라 확장 프레임도 필요합니다.
2. PendSV가 EXC_RETURN bit 4를 확인하고 필요하면 S16–S31을 저장한 뒤 R4–R11과 EXC_RETURN을 저장합니다.
3. 저장 후 PSP 값을 현재 TCB의 pxTopOfStack에 기록합니다.
4. 포트가 RTOS API 사용 가능 IRQ를 마스크하고 스케줄러를 호출합니다.
5. 다음 TCB의 pxTopOfStack에서 R4–R11과 **그 태스크의** EXC_RETURN을 복원합니다.
6. EXC_RETURN에 맞춰 S16–S31을 복원하고 PSP를 설정합니다.
7. 예외 복귀가 나머지 HW 프레임을 복원하여 태스크를 재개합니다.

스케줄러 호출 중 MSP에 사용하는 임시 저장 공간은 태스크 PSP의 68 byte와 별도입니다. 목록·통계·TLS·런타임 훅 등 스케줄러가 수행하는 작업도 포인터 교체 외에 있을 수 있습니다.

## TCB가 들고 있는 것은 SP 하나뿐

ARM_CM4F 포트는 TCB의 첫 필드를 저장된 스택 포인터로 사용합니다. 다음 코드는 그 접근 계약만 표현한 축약형이며 실제 TCB 정의 전체(1-02의 `tskTCB`)가 아닙니다.

```c
struct ContextView {
    StackType_t *pxTopOfStack;
    /* Other task metadata is omitted. */
};
```

32비트 타깃에서 이 포인터는 4 byte이고, 1-02의 config에서 TCB 전체는 88 byte였습니다. 포트 어셈블리가 알아야 하는 것은 이 첫 4 byte뿐이라서, 아래 QEMU 실험도 task handle을 `uint32_t **`로 읽어 저장된 frame을 바로 찾습니다.

## 첫 시작 — 가짜 stack frame

처음 실행할 태스크에는 이전 중단점이 없습니다. pxPortInitialiseStack은 복원 코드가 읽을 초기 프레임을 구성하여 첫 예외 복귀가 태스크 진입점으로 향하게 만듭니다.

| 초기화 항목 | ARM_CM4F V11.2.0 동작 |
| --- | --- |
| xPSR | 0x01000000으로 Thumb 상태 지정 |
| PC | 태스크 함수 주소 bit 0을 지워 기록 |
| thread LR | 포트의 task-return 오류 경로 |
| R0 | 태스크 인자 |
| EXC_RETURN | 0xFFFFFFFD |
| R1–R3·R12·R4–R11 | 포인터만 내려 공간을 확보. 값은 task 생성 때 채운 `0xa5`(1-02) |

값의 근거는 [`ARM_CM4F/port.c` L92-L100, L213-L226](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L213-L226)입니다. 이 프레임을 SVC handler가 복원합니다. 초기 정렬용 오프셋 1 word도 있으므로 생성 직후 이미 18 word가 쓰인 상태에서 시작합니다.

### QEMU에서 저장된 frame 읽기

표의 숫자를 실제 stack에서 확인했습니다. FreeRTOS V11.2.0 `ARM_CM4F` 포트를 arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m4 -mfloat-abi=hard -mfpu=fpv4-sp-d16 -O2`로 빌드해 FPU가 있는 QEMU `mps2-an386`(Cortex-M4)에서 돌렸습니다. 정수만 쓰는 `int_task`와 `float` 연산을 하는 `fp_task`가 같은 우선순위에서 `taskYIELD()`를 반복하고, 우선순위가 높은 감독 task가 두 task가 쉬는 동안 저장된 frame을 읽습니다.

```c title="frames.c (발췌)"
static void dump(const char*name, TaskHandle_t h){
  uint32_t *sp = *(uint32_t**)h;                  /* pxTopOfStack is the first TCB member */
  uint32_t exc = sp[8];                            /* r4-r11 then r14 (EXC_RETURN) */
  int fp = !(exc & 0x10);
  uint32_t *hw = sp + 9 + (fp ? 16 : 0);           /* hardware frame: r0 r1 r2 r3 r12 lr pc xpsr */
  unsigned words = 9 + (fp ? 16 : 0) + 8 + (fp ? 18 : 0);
  /* ... print ... */ }
```

```text
before start: int_task initial frame EXC_RETURN=0xfffffffd PC=0x44c xPSR=0x1000000 R0=0x0
int_task: EXC_RETURN=0xfffffffd FP frame=no   stacked PC=0x464 xPSR=0x1000000  context=17 words (68 bytes)
fp_task : EXC_RETURN=0xffffffed FP frame=yes  stacked PC=0x49e xPSR=0x1000000  context=51 words (204 bytes)
```

생성 직후 frame에는 초기값이 그대로 있습니다. EXC_RETURN 0xFFFFFFFD, PC는 `int_task`의 주소(0x44c, `nm` 기준 0x44c~0x46d)에서 bit 0을 지운 값, xPSR 0x01000000, R0는 인자 0입니다. 실행 중 저장된 frame에서는 `fp_task`만 EXC_RETURN이 0xFFFFFFED로 bit 4가 0이었습니다. 이 가정대로 offset을 잡자 두 task 모두 stacked PC가 자기 함수 안(`int_task` 0x464, `fp_task` 0x49e, `nm` 기준 0x470~0x4af)을 가리키고 xPSR의 T bit가 서 있었습니다. 레이아웃 계산이 맞다는 뜻입니다. 정수 task는 17 word, FP task는 51 word를 썼습니다.

## Cooperative vs Preemptive

FreeRTOS에서 configUSE_PREEMPTION은 자동 선점 정책을 선택합니다. 협력형 구성에서도 yield와 blocking으로 태스크가 바뀔 수 있고, 선점형에서도 스케줄러가 같은 태스크를 선택하면 실제 전환은 없습니다.

| 구분 | 협력형 | 선점형 |
| --- | --- | --- |
| 대표 전환 계기 | 명시적 yield 또는 blocking | yield·blocking 외에 더 높은 우선순위 태스크 준비 등 |
| 응답 시간에 미치는 요소 | 실행 태스크가 CPU를 내놓는 시점 | IRQ 마스크·스케줄러 지연·우선순위 정책 등 |

선점형에서도 critical section과 상위 우선순위 간섭이 응답 시간에 더해집니다. 1-10의 QEMU 측정에서 낮은 task의 critical section만으로 최대 release latency가 147에서 9,588 count로 늘었습니다.

## 비용 — 얼마나 걸리는가

비용의 하드웨어 부분은 Cortex-M4 TRM(DDI 0439B 3.9.1)이 줍니다. zero wait state에서 예외 진입 12 cycle, 복귀 12 cycle, tail-chaining 6 cycle입니다. 그 위에 PendSV 코드가 저장·복원하는 레지스터 수가 더해지는데, 위 실험처럼 FP를 쓴 task는 소프트웨어 저장만 16 word가 많습니다. 이 장에서는 실제 보드의 cycle을 재지 않았고, QEMU는 cycle을 모델링하지 않으며 DWT CYCCNT도 0으로 읽힙니다(1-10).

측정할 때는 yield 요청부터 다음 태스크 실행까지인지, PendSV handler만인지 먼저 정합니다. 2-03의 `traceTASK_SWITCHED_IN()` 위치에서 DWT를 읽으면 "선택 직후"까지가 되고, 다음 task의 첫 명령에서 읽으면 레지스터 복원까지 들어갑니다. 반복 표본의 최대 관찰값은 WCET 보장값이 아닙니다.

## Stack size — 얼마나 잡아야 할까

| 항목 | 이 포트에서 확인할 범위 |
| --- | --- |
| 기본 PSP context | 17 × 4 = 68 byte |
| FP 확장 추가분 | HW 18 + SW 16 = 34 word, 136 byte |
| 기본 + FP 전체 | 51 word = 204 byte, 정렬 보정 별도 |
| 태스크 실행 중 호출·지역 변수 | 1-02 실험: `uint32_t buf[128]` 하나로 143 word |
| handler와 중첩 IRQ | MSP 쪽 |

HW FP 추가분 18 word는 S0–S15 16개, FPSCR, reserved 1개입니다(DDI 0403E.b B1.5.7 Figure B1-4, FPSCR offset 0x60, reserved 0x64). 첫 예외 프레임은 태스크 PSP를 차지하지만, handler 진입 뒤 중첩되는 예외는 MSP를 씁니다.

그래서 task stack 크기는 "실행 중 최대 사용량 + 51 word(FP task) 또는 17 word"입니다. 실행 중 최대 사용량은 watermark로 관찰하되, 한 번 실행한 watermark는 실행하지 않은 경로를 담지 못합니다(1-02).

## FPU — Lazy stacking

Cortex-M4F의 FP context 관리는 FPCCR 설정, CONTROL.FPCA 및 예외 프레임 형식에 연관됩니다. Lazy stacking에서는 예외 진입 때 S0–S15·FPSCR 자리만 잡아 두고 실제 저장은 handler가 FP 명령을 처음 쓸 때로 미룹니다(DDI 0403E.b B1.5.7 "FP lazy context save"). 자리는 잡히므로 위 51 word는 lazy stacking에서도 그대로입니다.

ARM_CM4F PendSV는 **EXC_RETURN bit 4**로 확장 프레임 여부를 판단하여 S16–S31을 조건부 저장합니다(`tst r14, #0x10`, [`ARM_CM4F/port.c` L516-L518](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L516-L518)). 위 실험의 0xFFFFFFFD(bit 4 = 1)와 0xFFFFFFED(bit 4 = 0)가 그 비트입니다. FP를 쓰지 않는 태스크도 이 `tst`와 조건 분기는 거칩니다.

## RISC-V는 어떻게 다른가

기본 RISC-V trap 진입은 mepc·mcause·mstatus 같은 CSR을 갱신하지만 범용 레지스터를 메모리에 자동 push하지 않습니다. privileged spec은 "When a trap is taken into M-mode, mepc is written with the virtual address of the instruction that was interrupted"라고만 적습니다([Machine-Level ISA](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html) "Machine Exception Program Counter"). handler가 사용할 레지스터는 모두 소프트웨어로 보존합니다.

mscratch는 spec이 "Typically, it is used to hold a pointer to a machine-mode hart-local context space and swapped with a user register upon entry to an M-mode trap handler"라고 소개하는 레지스터입니다. "typically"라는 말 그대로 쓰는 방식은 포트가 정하며, FreeRTOS RISC-V 포트는 [2-07](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)에서 봅니다.

## Cortex-A·Linux — 비교군

MMU가 있는 시스템에서는 주소 공간도 context의 일부입니다. 같은 주소 공간의 thread 사이 전환은 페이지 테이블을 바꾸지 않습니다. 다른 프로세스로 갈 때는 페이지 테이블 base 같은 주소 공간 상태도 바꿉니다. 다음 두 장에서는 ARMv7-A AArch32의 banked register와 RV32I의 trap 프레임을 각각 봅니다.

## 자주 하는 실수

- **다른 포트의 프레임 크기를 혼용합니다.** ARM_CM3는 r4-r11 8 word만 저장하므로 16 word이고, ARM_CM4F는 EXC_RETURN까지 9 word를 저장해 17 word입니다(1-02의 `port.c` L467과 위 실험).
- **MSP와 PSP 사용량을 합쳐 태스크 스택만 늘립니다.** ISR의 지역 변수는 MSP에 쌓이므로 task마다 더할 필요가 없습니다.
- **FP 사용을 켜고 정수 태스크만 시험합니다.** 위 실험처럼 FP를 쓴 task만 34 word를 더 씁니다. FP task로 stack 여유를 따로 확인합니다.
- **물리적으로 보이는 모든 상태를 태스크별 상태로 취급합니다.** 주변 장치 레지스터는 context가 아니므로, 두 task가 같은 장치를 쓰면 mutex로 나눕니다.

## 정리

- Context는 태스크 재개에 필요한 상태이며 저장 범위는 ISA·ABI·포트에 따릅니다.
- ARM_CM4F V11.2.0 기본 context는 HW 8 + SW 9 = **17 word, 68 byte**입니다.
- FP context 추가분은 reserved word를 포함해 136 byte이며 정렬 보정은 별도입니다.
- TCB의 저장 SP는 복원 진입점이고 TCB 전체나 스케줄러 작업의 전부가 아닙니다.
- 초기 프레임은 첫 예외 복귀를 태스크 진입점으로 연결합니다.
- QEMU `mps2-an386`에서 저장된 frame을 직접 읽어 17 word(EXC_RETURN 0xFFFFFFFD)와 51 word(0xFFFFFFED)를 확인했습니다.

다음 편은 ARM Cortex-M Context Switch입니다. PendSV에서 EXC_RETURN을 태스크별로 저장하는 이유를 따라갑니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): 초기 프레임(L213-L226)·PendSV(L516-L540)·SVC.
- ARM DDI 0403E.b B1.5.6·B1.5.7(예외 frame, FP frame), ARM DDI 0439B 3.9.1(진입·복귀 cycle).
- QEMU 실험: `frames.c`, FreeRTOS V11.2.0 `ARM_CM4F` + `heap_4`, arm-none-eabi-gcc 16.2.0, QEMU 11.1.3 `mps2-an386 -icount shift=5`.
- [Arm AAPCS32 2025Q1](https://github.com/ARM-software/abi-aa/blob/2025Q1/aapcs32/aapcs32.rst): 함수 호출의 레지스터 보존 계약.
- [RISC-V Machine-Level ISA 1.13](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html): trap 진입과 CSR.

## 관련 항목

- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-06: ARM Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
