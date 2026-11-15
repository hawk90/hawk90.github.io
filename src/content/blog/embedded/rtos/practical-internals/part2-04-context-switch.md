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

RISC-V의 x0은 항상 0이므로 저장할 필요가 없습니다. 포트가 공통 불변값으로 관리하는 gp 등의 처리도 별도로 확인해야 합니다. 저장 공간은 태스크 스택일 수도 있고 TCB 또는 별도 확장 context 영역일 수도 있습니다.

## 언제 발생하는가

Context switch가 트리거되는 시점은 크게 세 가지입니다.

- **Tick 인터럽트** — time slice 만료 또는 더 우선순위 높은 task가 ready
- **Blocking 시스템 호출** — `vTaskDelay`, `xSemaphoreTake` 등이 block을 유발
- **ISR 종료 시점** — ISR이 더 우선순위 높은 task를 wake 시켰을 때

세 경우 모두 결국 *스케줄러가 호출*되고, 스케줄러가 *현재와 다른 task*를 선택하면 switch가 일어납니다.

## Caller-saved vs Callee-saved

AAPCS32의 일반 함수 호출에서는 R0–R3·R12가 임시값이고 R4–R8·R10–R11·SP는 보존 대상입니다. R9의 역할은 플랫폼 규약에 따릅니다. LR은 호출·복귀 경로에 맞춰 별도로 다룹니다.

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

ARM_CM4F 포트는 TCB의 첫 필드를 저장된 스택 포인터로 사용합니다. 다음 코드는 그 접근 계약만 표현한 축약형이며 실제 TCB 정의 전체가 아닙니다.

```c
struct ContextView {
    StackType_t *pxTopOfStack;
    /* Other task metadata is omitted. */
};
```

32비트 타깃에서 이 포인터는 4 byte이지만 TCB 전체 크기나 전환 중 갱신되는 모든 메타데이터의 크기를 뜻하지는 않습니다. 태스크 우선순위, 목록 항목, 이름, 설정에 따른 추가 상태는 실제 tasks.c의 TCB_t 정의를 확인해야 합니다.

## 첫 시작 — 가짜 stack frame

처음 실행할 태스크에는 이전 중단점이 없습니다. pxPortInitialiseStack은 복원 코드가 읽을 초기 프레임을 구성하여 첫 예외 복귀가 태스크 진입점으로 향하게 만듭니다.

| 초기화 항목 | ARM_CM4F V11.2.0 동작 |
| --- | --- |
| xPSR | 0x01000000으로 Thumb 상태 지정 |
| PC | 태스크 함수 주소 bit 0을 지워 기록 |
| thread LR | 포트의 task-return 오류 경로 |
| R0 | 태스크 인자 |
| EXC_RETURN | 0xFFFFFFFD |
| R1–R3·R12·R4–R11 | 공간을 확보하되 이 함수가 임의 디버그 패턴으로 채우지 않음 |

이 프레임을 SVC handler가 복원합니다. 초기 정렬용 오프셋과 태스크 생성 시의 스택 채움 정책도 있으므로, 위 17 word만 보고 태스크의 전체 스택 크기를 정해서는 안 됩니다.

## Cooperative vs Preemptive

FreeRTOS에서 configUSE_PREEMPTION은 자동 선점 정책을 선택합니다. 협력형 구성에서도 yield와 blocking으로 태스크가 바뀔 수 있고, 선점형에서도 스케줄러가 같은 태스크를 선택하면 실제 전환은 없습니다.

| 구분 | 협력형 | 선점형 |
| --- | --- | --- |
| 대표 전환 계기 | 명시적 yield 또는 blocking | yield·blocking 외에 더 높은 우선순위 태스크 준비 등 |
| 응답 시간에 미치는 요소 | 실행 태스크가 CPU를 내놓는 시점 | IRQ 마스크·스케줄러 지연·우선순위 정책 등 |

선점형 설정만으로 응답 시간 상한이 보장되지는 않습니다. 최악 실행 시간과 임계 구역, 인터럽트 부하를 함께 분석해야 합니다.

## 비용 — 얼마나 걸리는가

실제 비용은 코어·클록·메모리 wait state·캐시·컴파일 옵션·준비 태스크 수·FP 상태·중첩 IRQ에 따라 달라집니다. 출처와 측정 조건이 없는 70 cycle 또는 0.4 µs를 일반적인 FreeRTOS 전환 시간으로 사용할 수 없습니다.

측정할 때는 yield 요청부터 다음 태스크 실행까지인지, PendSV handler만인지 먼저 정합니다. DWT 또는 GPIO를 이용해 측정 코드의 비용을 분리하고 반복 표본의 분포와 최대 관찰값을 기록합니다. 최대 관찰값은 곧 WCET 보장값이 아닙니다.

## Stack size — 얼마나 잡아야 할까

| 항목 | 이 포트에서 확인할 범위 |
| --- | --- |
| 기본 PSP context | 17 × 4 = 68 byte |
| FP 확장 추가분 | HW 18 + SW 16 = 34 word, 136 byte |
| 기본 + FP 전체 | 51 word = 204 byte, 정렬 보정 별도 |
| 태스크 실행 중 호출·지역 변수 | 실제 호출 경로·컴파일 옵션·라이브러리별 분석 |
| handler와 중첩 IRQ | 별도 MSP 사용량 분석 |

HW FP 추가분에는 S0–S15·FPSCR뿐 아니라 reserved word도 포함됩니다. 첫 예외 프레임은 태스크 PSP를 차지하지만, handler 진입 뒤 중첩되는 예외는 MSP 쪽 사용량을 늘립니다.

모든 태스크에 적용할 고정 권장 크기 대신 호출 그래프·확장 상태·최악 경로를 분석하고 overflow 검사와 watermark를 보조 관찰로 사용합니다. 한 번 실행한 watermark만으로 미실행 경로의 여유까지 보장할 수 없습니다.

## FPU — Lazy stacking

Cortex-M4F의 FP context 관리는 FPCCR 설정, CONTROL.FPCA 및 예외 프레임 형식에 연관됩니다. Lazy stacking은 FP 하위 레지스터 저장을 지연할 수 있지만 프레임 공간과 필요한 보존 작업이 사라지는 것은 아닙니다.

ARM_CM4F PendSV는 **EXC_RETURN bit 4**로 확장 프레임 여부를 판단하여 S16–S31을 조건부 저장합니다. 이 비트는 CONTROL.FPCA 자체가 아닙니다. FP를 쓰지 않는 태스크에서 대량 FP 저장은 생략되지만 검사 명령까지 비용이 0이 되는 것은 아닙니다.

## RISC-V는 어떻게 다른가

기본 RISC-V trap 진입은 mepc·mcause·mstatus 같은 CSR을 갱신하지만 범용 레지스터를 메모리에 자동 push하지 않습니다. handler가 사용할 레지스터와 태스크 재개에 필요한 확장 상태를 소프트웨어로 보존합니다.

mscratch를 이용한 스택 교환은 선택 가능한 소프트웨어 계약입니다. 초기값과 중첩 trap 정책이 필요하며 모든 포트가 같은 방식을 쓰지는 않습니다. 이 차이만으로 Cortex-M보다 빠르거나 느리다고 결론내릴 수는 없습니다.

## Cortex-A·Linux — 비교군

MMU가 있는 시스템에서는 주소 공간·ASID·권한 상태도 고려합니다. 같은 주소 공간의 스레드 전환이 매번 TLB invalidate나 cache flush를 요구하는 것은 아닙니다. 다른 프로세스라도 ASID와 커널의 매핑 관리 정책에 따라 처리가 달라집니다.

코어 종류만으로 수십 µs라는 전환 비용을 정할 수 없습니다. 다음 두 장에서는 ARMv7-A AArch32의 banked register와 RV32I의 trap 프레임을 각각 구체적인 범위로 나눠 봅니다.

## 자주 하는 실수

- **다른 포트의 프레임 크기를 혼용합니다.** EXC_RETURN·FP·정렬 보정이 포함됐는지 확인합니다.
- **MSP와 PSP 사용량을 합쳐 태스크 스택만 늘립니다.** handler용 MSP도 별도로 크기를 분석해야 합니다.
- **FP 사용을 켜고 정수 태스크만 시험합니다.** FP 태스크와 ISR, lazy 상태, 전환 조합을 타깃에서 검증해야 합니다.
- **물리적으로 보이는 모든 상태를 태스크별 상태로 취급합니다.** ABI와 포트가 보존하는 상태, 커널 공통 상태, 장치 상태를 구분해야 합니다.

## 정리

- Context는 태스크 재개에 필요한 상태이며 저장 범위는 ISA·ABI·포트에 따릅니다.
- ARM_CM4F V11.2.0 기본 context는 HW 8 + SW 9 = **17 word, 68 byte**입니다.
- FP context 추가분은 reserved word를 포함해 136 byte이며 정렬 보정은 별도입니다.
- TCB의 저장 SP는 복원 진입점이고 TCB 전체나 스케줄러 작업의 전부가 아닙니다.
- 초기 프레임은 첫 예외 복귀를 태스크 진입점으로 연결합니다.
- 비용과 스택 여유는 실제 설정과 실행 경로로 검증해야 합니다.

다음 편은 ARM Cortex-M Context Switch입니다. PendSV에서 EXC_RETURN을 태스크별로 저장하는 이유를 따라갑니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): 초기 프레임·PendSV·SVC.
- [Arm AAPCS32 2025Q1](https://github.com/ARM-software/abi-aa/blob/2025Q1/aapcs32/aapcs32.rst): 함수 호출의 레지스터 보존 계약.
- [RISC-V Machine-Level ISA 1.13](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html): trap 진입과 CSR.

## 관련 항목

- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-06: ARM Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
