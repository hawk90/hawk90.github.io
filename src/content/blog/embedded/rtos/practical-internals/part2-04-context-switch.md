---
title: "Context Switch 원리 분석 — 레지스터 저장·복원·Stack Frame"
date: 2026-05-05T09:14:00
description: "Context switch는 결국 CPU의 모든 가시 상태를 task 스택에 통째로 복제하는 일입니다. 어디서 발생하고, 무엇을 저장하고, 비용은 얼마인지 아키텍처 중립적으로 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 14
tags: [context-switch, register, stack-frame, caller-saved, callee-saved]
---

## 한 줄 요약

> **"Context switch = CPU의 모든 가시 상태를 task별 스택에 복제하는 일"** — 무엇이 가시 상태인지 정확히 아는 게 출발점입니다.

## Context란 무엇인가

CPU 안에는 *현재 실행 중인 코드만의 상태*가 잔뜩 들어 있습니다. 다른 task로 넘어가려면 이걸 한 톨도 빠짐없이 보관해야 다음에 깨어났을 때 *정확히 그 자리*에서 이어갈 수 있습니다. 이 상태 전체를 묶어 **context**라고 부릅니다.

아키텍처별로 무엇이 포함되는지 봅니다.

| 항목 | Cortex-M | Cortex-A | RISC-V |
| --- | --- | --- | --- |
| 범용 레지스터 | R0-R12 | R0-R12 | x0-x31 (32개) |
| Stack Pointer | SP (R13) | mode별 SP_user / _irq / _svc | x2 (sp) |
| Link Register | LR (R14) | LR (R14) | x1 (ra) |
| Program Counter | PC (R15) | PC (R15) | pc |
| Status | xPSR | CPSR | mstatus |
| FPU | S0-S31, FPSCR | D0-D31, FPSCR | f0-f31 |

이걸 모두 *지금 task의 스택*에 push하고, 다음 task의 스택에서 pop 하면 context switch가 완성됩니다.

## 언제 발생하는가

Context switch가 트리거되는 시점은 크게 세 가지입니다.

- **Tick 인터럽트** — time slice 만료 또는 더 우선순위 높은 task가 ready
- **Blocking 시스템 호출** — `vTaskDelay`, `xSemaphoreTake` 등이 block을 유발
- **ISR 종료 시점** — ISR이 더 우선순위 높은 task를 wake 시켰을 때

세 경우 모두 결국 *스케줄러가 호출*되고, 스케줄러가 *현재와 다른 task*를 선택하면 switch가 일어납니다.

## Caller-saved vs Callee-saved

여기서 잠깐 짚어야 할 개념이 있습니다. ARM AAPCS 같은 호출 규약은 레지스터를 두 부류로 나눕니다.

| | 의미 | ARM 레지스터 |
| --- | --- | --- |
| **Caller-saved** | 호출자가 *필요하면 스스로 보존* | R0-R3, R12 |
| **Callee-saved** | 함수가 *수정하면 복원 책임* | R4-R11 |

평범한 함수 호출 (`BL`) 시점에는 *caller-saved만 위태*합니다. 그래서 일반 함수는 callee-saved 레지스터를 건드릴 필요가 없으면 *아무것도 저장하지 않아도* 됩니다.

그러나 context switch는 다릅니다. 다른 task가 *어떤 레지스터에 무엇이 들어 있다고 가정*하는지 알 수 없으므로 **모든 레지스터를 보존**해야 합니다. 이 차이가 context save 코드를 길게 만듭니다.

## Cortex-M의 두 단계 save — HW + SW

ARM Cortex-M에는 영리한 최적화가 있습니다. 예외(인터럽트 포함)가 들어올 때 **HW가 자동으로 8개 레지스터를 push**합니다. caller-saved에 해당하는 것들입니다.

```text
SP (낮은 주소)
  ↓
[R0, R1, R2, R3, R12, LR, return PC, xPSR]   ← HW가 자동 push (8 word)
  ↑ 새 SP

[R4, R5, R6, R7, R8, R9, R10, R11]            ← SW가 마저 push (8 word)
```

이렇게 하면 ISR 안에서 *caller-saved를 자유롭게 써도* HW가 알아서 복원해 줍니다. RTOS port code는 *callee-saved (R4-R11) 8개만 더 push*하면 context 전체가 보존됩니다. 합쳐서 16 word, 64 byte입니다.

이 구조를 흔히 **"half-saved frame"** 이라고 부릅니다. 절반은 HW, 절반은 SW.

## 전체 흐름

context switch 한 번이 진행되는 순서를 풀어보면 이렇게 됩니다.

```text
1. HW 예외 진입  → R0-R3, R12, LR, PC, xPSR 자동 push (current task SP에)
2. SW 핸들러    → R4-R11 push, 새 SP 값 확보
3. TCB 갱신    → 현재 task의 pxTopOfStack = 새 SP
4. 스케줄러 호출 → pxCurrentTCB를 다음 task로 교체
5. 새 SP 로드   → 다음 task의 pxTopOfStack
6. SW 핸들러    → R4-R11 pop
7. HW 예외 종료 → R0-R3, R12, LR, PC, xPSR 자동 pop, PC가 새 task의 코드로
```

3번에서 6번이 *스택을 갈아끼우는* 한순간입니다. 그 외에는 전부 push/pop의 대칭입니다.

## TCB가 들고 있는 것은 SP 하나뿐

```c
typedef struct {
    StackType_t *pxTopOfStack;   // ← context switch가 갱신하는 유일한 값
    /* ... 그 외 priority, name, list item 등 */
} TCB_t;
```

여기서 본질적인 통찰이 있습니다. **context의 모든 정보는 스택 안에 있고, TCB는 그 스택의 꼭대기 주소 하나만 들고 있습니다.** 그래서 context switch가 갱신하는 메타데이터는 결국 *4 byte 포인터* 한 개뿐입니다.

## 첫 시작 — 가짜 stack frame

task가 처음 schedule 될 때는 *복원할 stack frame이 아직 없습니다*. 그래서 task 생성 시 RTOS가 *마치 이전에 한 번 빠져나간 듯* 가짜 frame을 미리 쌓아 둡니다.

FreeRTOS의 `pxPortInitialiseStack`이 만드는 초기 stack은 대략 이렇습니다.

```text
초기 task stack (높은 주소 → 낮은 주소)

[xPSR = 0x01000000]          ← Thumb mode
[PC   = task_function]        ← 첫 schedule 시 jump 할 주소
[LR   = task_exit_error]      ← task가 return 하면 호출 (보통 panic)
[R12  = 0xCCCCCCCC]           ← 디버그용 패턴
[R3   = 0xBBBBBBBB]
[R2   = 0xAAAAAAAA]
[R1   = 0x99999999]
[R0   = arg_ptr]              ← task 함수에 전달할 인자
[R11..R4 = 0x...]             ← 임의 패턴
  ↑ pxTopOfStack
```

첫 schedule이 일어나면 R4-R11 pop, exception return으로 R0-R3 / R12 / LR / PC / xPSR pop, PC가 `task_function`을 가리키므로 *자연스럽게 task 코드로 점프*합니다. 마치 이전에 그 자리에서 빠져나간 것처럼 보이는 작은 트릭입니다.

## Cooperative vs Preemptive

context switch가 일어나는 *주도권*에 따라 두 모드로 나뉩니다.

| | Cooperative | Preemptive |
| --- | --- | --- |
| 트리거 | task가 명시적으로 yield | tick / ISR이 강제 |
| 응답성 | task 의지에 의존 | RTOS가 보장 |
| 구현 단순도 | 매우 단순 | 복잡 |
| 사용 | 옛 Mac OS, Win 3.1 | 모든 현대 RTOS |

현대 임베디드 RTOS는 거의 모두 *preemptive*이며, *cooperative만* 쓰는 설정은 특수한 경우입니다 (`configUSE_PREEMPTION = 0`).

## 비용 — 얼마나 걸리는가

Cortex-M4 @ 168 MHz 기준으로 한 번의 context switch가 쓰는 시간을 분해해 보면 이렇습니다.

| 단계 | cycle | 시간 |
| --- | --- | --- |
| HW exception entry (push 8) | 12 | 72 ns |
| SW push R4-R11 | ~10 | 60 ns |
| 스케줄러 결정 | 20~100 | 0.1~0.6 µs |
| SW pop R4-R11 | ~10 | 60 ns |
| HW exception exit (pop 8) | 12 | 72 ns |
| **합계** | **~70** | **~0.4 µs** |

ms 단위로 도는 task switch에서 0.4 µs는 무시할 만한 비용입니다. 다만 *μs 단위 ISR 응답*이 필요한 시스템에서는 이 비용도 무시할 수 없습니다.

## Stack size — 얼마나 잡아야 할까

context 자체는 17 word (68 byte)면 끝나지만, 실제 task는 그것보다 훨씬 많은 스택을 씁니다.

| 항목 | byte |
| --- | --- |
| Context (full save) | 17 × 4 = 68 |
| FPU full save | 33 × 4 = 132 |
| Nested IRQ × N | 8 × N |
| Local 변수 | 함수 깊이 × 평균 |
| printf 등 라이브러리 | 200+ |

권장 시작값은 **256 word (1 KB)** 입니다. `printf`나 `snprintf` 한 번이 200 byte 가까이 쓰는 경우가 흔하므로 여유를 둬야 합니다. `uxTaskGetStackHighWaterMark()`로 측정 후 조정하는 게 안전합니다.

## FPU — Lazy stacking

FPU는 *S0-S31 + FPSCR* 도합 33 word를 차지합니다. 매 switch마다 이걸 다 push하면 비용이 두 배가 됩니다.

Cortex-M4F / M7는 **lazy stacking**으로 이 비용을 회피합니다. *FPU를 실제로 사용한 task만* FP regs를 push하고, FPU를 안 쓴 task는 *FP context 자체를 건너뜁니다*. CONTROL register의 FPCA bit로 사용 여부를 추적합니다.

## RISC-V는 어떻게 다른가

RISC-V에는 ARM의 *HW auto-push가 없습니다*. 예외가 들어와도 PC와 status만 잠깐 보관할 뿐, *모든 레지스터는 SW가 직접* push 해야 합니다.

```text
csrrw   t0, mscratch, t0     # 임시 레지스터 swap
sw      x1, 0(t0)
sw      x2, 4(t0)
...
sw      x31, 124(t0)
```

장점은 *HW가 단순*하고 ISR이 *얼마나 push 할지 선택 가능*하다는 점입니다. 단점은 latency 자체는 *ARM보다 살짝 느림*입니다. ARMv8-M Mainline의 "secure / non-secure stacking"이 RISC-V 방식과 비슷한 면이 있습니다.

## Cortex-A·Linux — 비교군

Cortex-A처럼 *MMU를 가진* 시스템에서는 context switch에 *추가 비용*이 붙습니다.

- TLB invalidate (process 전환 시)
- L1 cache flush 가능성
- ASID 갱신

수십 µs 단위로 늘어납니다. RTOS가 *MMU 없는 Cortex-M*에 머무는 한 이런 비용은 없습니다. 이게 임베디드 RTOS의 latency 우위 비결 중 하나입니다.

## 자주 하는 실수

> ⚠️ Stack을 너무 작게

68 byte context + nested IRQ + local + printf로 256 byte도 부족할 수 있습니다. stack overflow 검출용 canary나 watermark 도구를 항상 켜둡니다.

> ⚠️ FPU enable 후 lazy stacking을 인지 못 함

ISR 안에서 FP 명령을 쓰면 task가 보유하던 FP context가 깨질 수 있습니다. 보통 FreeRTOS port가 자동 처리하지만, *ISR에서 FP 사용은 일단 피하는* 게 안전합니다.

> ⚠️ MSP / PSP 혼동

ISR은 MSP, task는 PSP를 씁니다. 이 구분을 잊고 ISR 안에서 task stack을 가정하면 *전혀 다른 메모리*를 건드리게 됩니다. Cortex-M 구체 사항은 다음 편에서 다룹니다.

## 정리

- Context switch는 **CPU의 모든 가시 레지스터를 task별 스택에 복제**하는 일입니다.
- Cortex-M은 **HW가 절반, SW가 절반** 처리합니다. 합쳐서 16 word, 64 byte의 frame이 만들어집니다.
- TCB가 들고 있는 것은 **pxTopOfStack 포인터 하나**가 전부이고, 실제 context는 모두 스택 안에 있습니다.
- 첫 schedule을 위해 task 생성 시 **가짜 stack frame**을 미리 쌓아 둡니다.
- Cortex-M4 @ 168 MHz에서 switch 비용은 **약 0.4 µs**입니다.
- RISC-V는 HW auto-push가 없어 *전부 SW로* 저장합니다. 더 단순하지만 살짝 더 느립니다.

다음 편은 **ARM Cortex-M Context Switch** — PendSV 핸들러의 어셈블리를 한 줄씩 따라갑니다.

## 관련 항목

- [2-03: Scheduler 알고리즘 구현](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-06: ARM Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
