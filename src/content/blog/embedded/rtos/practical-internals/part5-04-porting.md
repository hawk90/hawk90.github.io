---
title: "RTOS 포팅 가이드 — 새 아키텍처에 옮기는 절차"
slug: "embedded/rtos/practical-internals/part5-04-porting"
date: 2026-05-08T09:49:00
description: "FreeRTOS와 Zephyr의 port 계층을 따라가며 새 아키텍처에 RTOS를 옮기는 절차를 정리합니다. initial stack frame, context switch assembly, tick source, critical section primitive까지 한 번에 잡습니다."
series: "Practical RTOS Internals"
seriesOrder: 49
tags: [porting, architecture, port-c, context-switch, tick]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> 시작·저장/복원·tick·mask를 출발점으로 ABI와 board integration을 검증합니다. — 초기 스택, 스케줄러 시작, 수동 yield, tick, critical section 진입/탈출 그리고 context switch 핸들러입니다.

## 어떤 문제를 푸는가

새 SoC가 손에 들어왔는데 공식 BSP가 없거나, 사내 ASIC에 RTOS를 올려야 하거나, 익숙한 RTOS를 *지원되지 않는 RISC-V 변종*에 옮겨야 하는 상황이 의외로 자주 생깁니다. RTOS 본체를 다시 짤 일은 거의 없습니다. *port layer만 새로 작성*하면 됩니다.

이번 편의 목표는 두 가지입니다. 첫째, port layer가 RTOS와 아키텍처 사이에 *정확히 어느 경계*를 그리는지 정리합니다. 둘째, FreeRTOS Cortex-M port를 기준으로 *최소 여섯 가지 구현물*을 추리고, RISC-V와 Cortex-A로 확장될 때 무엇이 추가되는지를 봅니다.

이 글은 FreeRTOS V11.2.0 ARM_CM4F를 기준으로 포팅 경계를 설명합니다. 실제 새 architecture port의 기간·완료 여부는 ABI·interrupt controller·memory·SMP/MPU와 검증 범위에 따라 달라집니다.

## 포팅 대상 — 여섯 가지 함수

1. `pxPortInitialiseStack` — 초기 stack frame을 만들어 둠
2. `xPortStartScheduler` — 첫 task로 진입
3. `vPortYield` — 수동 reschedule trigger
4. `xPortSysTickHandler` — tick interrupt 진입점
5. `vPortEnterCritical` — IRQ disable + nesting
6. `vPortExitCritical` — IRQ enable + nesting

여기에 Context switch 본체(PendSV·trap·SWI 어셈블리)가 추가됩니다.

여섯 항목은 읽는 출발점입니다. portmacro.h의 type/alignment/barrier·mask save/restore, startup/linker·IRQ vector·heap/library와 MPU/SMP 추가 계약까지 확인해야 합니다. yield가 모든 port에서 vPortYield라는 C 함수인 것도 아닙니다.

## 1. 초기 스택 프레임

실제 V11.2.0 ARM_CM4F의 pxPortInitialiseStack과 SVC/PendSV 복원 순서를 맞춥니다. 저장 SP에서 R4–R11, EXC_RETURN, hardware frame의 R0–R3/R12/LR/PC/xPSR 순서입니다. 기존 예는 EXC_RETURN slot을 빼먹었습니다.

```c title="m4-frame-fixture.c"
#include <stdint.h>
/* Layout 비교용 fixture. MCU port나 실제 실행 가능한 task stack 생성기가 아님. */
void make_m4_basic_fixture(uint32_t storage[18], uint32_t pc,
                           uint32_t argument, uint32_t task_return)
{
    for (unsigned i = 0; i < 18; ++i) storage[i] = 0;
    storage[8] = UINT32_C(0xfffffffd); /* EXC_RETURN */
    storage[9] = argument;           /* R0 */
    storage[14] = task_return;       /* task LR */
    storage[15] = pc & UINT32_C(0xfffffffe);
    storage[16] = UINT32_C(0x01000000); /* xPSR Thumb state */
}
```

실제 port는 사용하지 않는 register slot을 모두 0으로 초기화하지 않습니다. fixture는 initialized slot의 상대 위치만 비교합니다. initial top 정렬·reserved word·FP/exception alignment 추가 조건도 port별로 확인합니다. 첫 실행은 해당 port의 SVC 경로이며 반드시 첫 PendSV가 시작하는 것은 아닙니다.

## 2. 스케줄러 시작

V11.2.0 xPortStartScheduler는 priority·FPU·timer·critical nesting 등을 준비한 뒤 prvPortStartFirstTask로 들어갑니다. 이 startup helper가 MSP/interrupt 상태와 SVC 시작을 처리합니다. `svc 0` 한 줄만 일반 C 함수에 넣은 코드가 완전한 startup을 대체하지 않습니다.

vector alias·VTOR/MSP·ISR priority validation·clock/tick와 port config를 실제 board에 맞춰 확인합니다. 해당 CM4F port의 PendSV/SysTick priority 조건을 다른 architecture의 규칙으로 일반화하지 않습니다.

## 3. 수동 yield

`taskYIELD()` 호출 시 PendSV bit를 set해 컨텍스트 스위치를 *명시적으로* 요청합니다.

```c
static inline void vPortYield(void)
{
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    __asm volatile ("dsb" ::: "memory");
    __asm volatile ("isb");
}
```

`dsb`와 `isb`가 핵심입니다. 요청 store와 instruction stream의 ordering을 맞춥니다. masking·현재 exception priority·scheduler 상태가 남아 있으므로 다음 명령 전에 반드시 task가 바뀐다는 보장은 아닙니다.

## 4. Tick 핸들러

```c
void xPortSysTickHandler(void)
{
    portDISABLE_INTERRUPTS();
    {
        if (xTaskIncrementTick() != pdFALSE) {
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    portENABLE_INTERRUPTS();
}
```

Tick의 두 역할이 한 줄에 모입니다. *time slice 만료* 검사와 *delay countdown*입니다. `xTaskIncrementTick`이 더 높은 priority task를 ready로 만들었다면 PendSV를 set해 핸들러 복귀 직후 스위치를 트리거합니다.

## 5/6. Critical Section

실제 CM4F task critical은 nesting counter와 BASEPRI를 함께 사용하며 entry 문맥과 exit underflow를 검사합니다. 저장된 mask를 복원하는 FromISR 경로와 구분합니다. 어설픈 decrement/enable 조각을 port 구현으로 복사하지 않습니다.

threshold와 같거나 수치가 큰 encoded IRQ priority가 mask되며, 더 긴급한 IRQ는 kernel API 호출 제한을 지켜야 합니다. PRIMASK/BASEPRI는 DMA나 다른 core를 정지시키지 않습니다. [Critical section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)을 따릅니다.

## PendSV 핸들러 — 컨텍스트 스위치 본체

복사할 정본은 [V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c)의 xPortPendSVHandler입니다. R4–R11/EXC_RETURN과 조건부 FP register, task SP·MSP의 ABI 정렬, BASEPRI와 scheduler 호출을 함께 보존합니다.

PRIMASK를 전체 함수에서 임의로 켜거나 외부 출처 없는 30–50 cycle 수치를 채택하지 않습니다. 실제 port object compile/disassembly가 성공해도 task·FP switch·IRQ nesting이 실행 검증된 것은 아닙니다.

## RISC-V Port — Trap 한 진입점

trap entry는 mtvec의 direct/vectored 설정과 delegation에 따라 다릅니다. M-mode의 mcause/mepc/mstatus, 원래 SP·caller/callee-saved register, interrupt nesting과 FP/vector 상태를 실제 port 계약대로 저장합니다.

mscratch swap은 한 설계 패턴이지 모든 RTOS의 필수 규칙이 아닙니다. swap 직후 kernel SP를 task x2 슬롯에 저장하거나 handler가 반환한 새 SP를 무시하는 불완전한 trap 조각은 사용하지 않습니다. [RISC-V context](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)의 저장/복원 모델과 실제 port를 대조합니다.

## Cortex-A Port — 더 큰 컨텍스트

AArch32는 R0–R15·CPSR/SPSR·mode bank와 VFP/NEON을, AArch64는 X register·SP·ELR/SPSR와 FP/SIMD·exception level을 구분합니다. 두 ISA의 register 목록과 system-register assembly를 섞지 않습니다.

GIC와 architectural timer·memory attributes·MMU/TLB·cache와 IRQ routing은 사용 port/SoC가 정합니다. Cortex-M의 다섯 배라는 고정 분량이나 모든 core가 완전히 같은 counter를 자동 제공한다는 설명은 검증 근거가 아닙니다. timer compare 재설정·IRQ ACK와 counter 주파수도 확인합니다.

## SMP Port — Per-Core current

core별 current TCB 외에도 inter-core lock·memory ordering·IPI·초기화·scheduler reservation·affinity·per-core interrupt와 timer 계약이 필요합니다. MPIDR affinity field를 무조건 연속 CPU index로 사용하는 mapping은 안전하지 않습니다. [SMP 설명](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)과 실제 port를 함께 확인합니다.

## Zephyr arch/ 디렉터리

Zephyr v3.7.0의 arch·soc·board·devicetree와 Kconfig를 구분합니다. 기존 architecture가 있어도 exception·timer·interrupt controller·cache/MPU와 SoC integration의 추가 검증이 필요합니다. 과거 soc/arm/... 경로를 모든 release의 현재 구조라고 제시하지 않습니다.

## Tickless Idle Port

tickless는 counter 최대 폭·idle 재확인 race·IRQ pending·조기 wake·elapsed tick와 next unblock 경계를 함께 처리합니다. macro 이름을 임의 C 함수로 다시 정의하고 idle_ticks를 SysTick LOAD에 곱하는 조각은 올바른 port가 아닙니다.

[Tickless Idle](/blog/embedded/rtos/practical-internals/part2-09-tickless)과 실제 V11.2.0 port의 vPortSuppressTicksAndSleep를 기준으로 구현합니다. hardware sleep·wake clock·power 결과는 board에서 따로 검증합니다.

## 새 아키텍처에 옮길 때 — 단계 절차

1. **Toolchain 준비** — GCC·LLVM·proprietary 컴파일러, newlib 또는 musl libc.
2. **Initial stack frame 결정** — 어느 레지스터를 stack에 미리 깔 것인가, 첫 task entry로 어떻게 점프시킬 것인가.
3. **Context switch 어셈블리** — callee-saved 레지스터 save/restore, SP swap, FPU/Vector 레지스터 lazy 전략.
4. **Tick source** — SysTick·architectural timer·external timer, IRQ 등록 + priority.
5. **Critical section primitive** — IRQ disable/enable, atomic 명령 (LDREX/STREX, LR/SC, csrrci).
6. **검증** — 단순 task 두 개로 ping-pong delay, semaphore·queue 단위 테스트, stack overflow hook 동작 확인.

지원되는 유사 port를 고정 revision에서 비교하되 존재를 확인하지 않은 arch/template 경로를 출발점으로 제시하지 않습니다. compiler·ABI·privilege·interrupt controller가 같은지 먼저 확인합니다.

## 자주 보는 함정

- EXC_RETURN과 basic/extended frame·Thumb state를 혼동하지 않습니다.
- tick rate는 해상도·IRQ overhead·sleep 요구로 선택하며 1000 Hz가 모든 시스템의 표준은 아닙니다.
- nested critical의 mask/owner 규칙과 ISR API 경계를 구분합니다.
- FPU/vector context와 AAPCS/RISC-V stack alignment를 실제 build로 검사합니다.
- 최소 검증은 첫 실행·반복 switch·preemption·block/unblock·timeout/wrap·IRQ nesting·fault와 SMP/MPU 활성 조합을 포함해야 합니다.

## 정리

포팅은 정해진 여섯 함수의 작성만으로 끝나지 않습니다. source/config를 고정하고 frame·ABI·IRQ·timer·memory·library 통합을 단계별로 확인합니다. host fixture·object compile은 유용하지만 실제 새 board port의 실행 완료와 다릅니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/ARM_CM4F).
- [FreeRTOS V11.2.0 RISC-V](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/RISC-V).
- [Zephyr v3.7.0](https://github.com/zephyrproject-rtos/zephyr/tree/v3.7.0).



다음 편은 [5-05 RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)에서 프로젝트별로 어떤 RTOS를 골라야 하는지 결정 매트릭스를 정리합니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-10: Syscall 구현](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
