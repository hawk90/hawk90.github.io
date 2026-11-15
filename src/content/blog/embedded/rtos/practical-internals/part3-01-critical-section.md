---
title: "Critical Section 구현 비교 — IRQ Disable·BASEPRI·Spinlock"
slug: "embedded/rtos/practical-internals/part3-01-critical-section"
date: 2026-05-06T09:22:00
description: "3 가지 구현 — cpsid/BASEPRI mask, taskENTER_CRITICAL, SMP spinlock. Hold time이 latency 결정."
series: "Practical RTOS Internals"
seriesOrder: 22
tags: [critical-section, irq-disable, basepri, spinlock]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

임계 구역은 **어떤 실행 주체를 배제하는지**가 먼저입니다. IRQ mask는 로컬 코어의 일부 예외를 제한하고, scheduler suspend는 task 전환을 제한하며, SMP lock은 다른 코어와의 상호 배제를 제공합니다. 이 글의 구체적인 FreeRTOS 경로는 **V11.2.0 단일 코어 GCC/ARM_CM4F**를 기준으로 합니다.

## IRQ Disable — 이전 상태를 복원하기

Cortex-M의 PRIMASK는 구성 가능한 우선순위의 예외 활성화를 막지만 NMI와 HardFault까지 막는 전역 정지 장치는 아닙니다. 진입 전부터 IRQ가 꺼져 있을 수 있으므로 종료 시 무조건 enable하는 코드보다 저장·복원 계약이 필요합니다.

다음은 실제 MCU의 CMSIS device header를 포함한 뒤 사용하는 **로컬 PRIMASK 예제**입니다. RTOS task critical API와 임의로 혼합하지 않으며, 호출 순서대로 중첩을 풀어야 합니다.

```c title="irq-state.c"
#include <stdint.h>
/* Include the actual MCU CMSIS device header before this file. */
uint32_t irq_save(void) {
    uint32_t saved = __get_PRIMASK();
    __disable_irq();
    return saved;
}
void irq_restore(uint32_t saved) {
    __set_PRIMASK(saved);
}
```

이 예제만으로 MMIO write 완료·DMA visibility·cache 유지까지 보장하지 않습니다. 장치 접근의 barrier와 memory 속성은 architecture·vendor 계약을 따릅니다.

## BASEPRI — 우선순위 범위 확인

BASEPRI를 제공하는 Cortex-M에서 0이 아닌 BASEPRI 값은 해당 threshold와 같거나 **수치가 더 큰** priority를 제한합니다. 수치가 작은 고긴급도 예외는 계속 실행될 수 있습니다. NVIC의 논리 priority와 register에 shift된 encoded 값도 구분해야 합니다.

FreeRTOS ARM_CM4F는 configMAX_SYSCALL_INTERRUPT_PRIORITY를 encoded BASEPRI mask로 사용합니다. mask 밖의 고긴급도 ISR은 RTOS API를 호출하면 안 됩니다. BASEPRI가 없는 Cortex-M 포트까지 같은 구현으로 설명하지 않습니다.

## taskENTER_CRITICAL의 실제 경로

V11.2.0 ARM_CM4F의 portENTER_CRITICAL은 vPortEnterCritical을 호출합니다. 이 함수는 interrupt mask를 설정하고 uxCriticalNesting을 증가시키며, 첫 진입에서 ISR context가 아닌지 assertion으로 검사합니다. vPortExitCritical은 nesting을 감소시키고 0이 될 때 mask를 해제합니다.

vTaskSuspendAll을 함께 호출하는 구현은 아닙니다. 또한 이 task API가 임의의 raw BASEPRI 상태까지 stack처럼 저장·복원하는 것도 아닙니다. 직접 register를 만지는 코드와 kernel nesting 계약을 섞으면 더 강한 기존 mask를 잘못 완화할 수 있습니다.

## Nested Critical Section

다음은 task context에서 두 함수가 중첩되는 예제입니다. 내부 호출 뒤에도 바깥 구간이 보호되므로 두 필드를 일관된 상태로 갱신할 수 있습니다. 실행 전 scheduler·해당 포트 설정을 준비해야 합니다.

```c title="critical-update.c"
#include <stdint.h>
#include "FreeRTOS.h"
#include "task.h"
struct CriticalTotals { uint32_t calls, items; };
static struct CriticalTotals totals;
static void count_call(void) {
    taskENTER_CRITICAL();
    ++totals.calls;
    taskEXIT_CRITICAL();
}
void critical_update(void) {
    taskENTER_CRITICAL();
    count_call();
    ++totals.items;
    taskEXIT_CRITICAL();
}
struct CriticalTotals critical_snapshot(void) {
    taskENTER_CRITICAL();
    struct CriticalTotals copy = totals;
    taskEXIT_CRITICAL();
    return copy;
}
```

단일 코어에서 같은 kernel critical 계약을 지키는 task/ISR 접근만 보호 범위에 넣습니다. 이 API로 마스크되지 않는 ISR이나 DMA가 totals에 접근하면 이 설계는 충분하지 않습니다. 다른 코어까지 포함하는 구현은 SMP 포트의 계약을 별도로 확인합니다.

## ISR-safe Critical Section

허용된 priority의 ISR에서는 해당 포트가 제공하는 FromISR 저장·복원 API를 사용합니다. ISR이라는 이유만으로 모든 IRQ·SMP 접근·memory ordering 문제가 자동 해결되지는 않습니다.

```c title="isr-critical.c"
#include "FreeRTOS.h"
#include "task.h"
extern void update_isr_state(void);
void update_from_isr(void) {
    UBaseType_t saved = taskENTER_CRITICAL_FROM_ISR();
    update_isr_state();
    taskEXIT_CRITICAL_FROM_ISR(saved);
}
```

## SMP Spinlock

로컬 IRQ mask는 다른 코어의 접근을 막지 않습니다. SMP에서는 해당 RTOS 포트가 정의한 spinlock과 IRQ·preemption 제어를 함께 검토합니다. 확인하지 않은 portSPINLOCK_ENTER 같은 이름을 공통 FreeRTOS API로 설치하지 않습니다.

아래는 C11 atomic_flag를 사용하는 **try-lock 원리 예제**입니다. 한 번 시도하고 결과를 반환하며 RTOS critical API의 대체 구현은 아닙니다. holder가 실행될 수 없는데 caller가 계속 spin하면 진행이 멈출 수 있습니다.

```c title="flag-lock.c"
#include <stdatomic.h>
#include <stdbool.h>
static atomic_flag guard = ATOMIC_FLAG_INIT;
bool try_guard(void) {
    return !atomic_flag_test_and_set_explicit(&guard, memory_order_acquire);
}
void release_guard(void) {
    atomic_flag_clear_explicit(&guard, memory_order_release);
}
```

성공한 owner만 release해야 하며 재귀·공정성·priority inheritance는 제공하지 않습니다. compiler가 선택하는 명령은 target·ISA extension·옵션에 따라 다르므로 ARMv8이라는 이름만으로 항상 CASAL이 생성된다고 할 수 없습니다.

## Hold Time과 계측

50 µs 동안 mask가 유지된다는 가정이면 그 구간에 들어온 **mask 대상 IRQ**는 잔여 구간만큼 서비스가 늦어질 수 있습니다. high-urgency ISR·NMI까지 모두 같은 지연을 받는다는 뜻은 아닙니다. 전체 응답에는 다른 간섭과 exception 처리도 더해집니다.

보편적인 10 µs 안전선을 두는 대신 deadline·최대 도착률·중첩 IRQ·lock 대기와 보호 구간의 상한을 분석합니다. block 가능한 API, allocator·I/O·로그를 그 안에 넣으면 길이나 의존성을 제한하기 어려워집니다.

DWT/GPIO로 계측할 때는 **가장 바깥 진입부터 마지막 종료까지**를 측정합니다. 전역 last_enter 하나를 중첩 진입마다 덮어쓰는 wrapper는 바깥 구간을 잃습니다. clock read·marker 비용, counter wrap, mask 설정 전후 경계와 계측 자체의 영향도 기록합니다. 이 글에 보드별 hold-time 실측표는 없습니다.

## IRQ Mask와 Scheduler Suspend

| 방법 | 단일 코어에서 제한하는 대상 | 남는 경쟁 |
| --- | --- | --- |
| PRIMASK | 구성 가능한 예외 활성화 | NMI·HardFault·DMA 등 |
| BASEPRI | threshold 범위의 예외 | 더 높은 긴급도 IRQ·DMA 등 |
| vTaskSuspendAll | task 전환 | ISR·DMA 등 |
| SMP lock | 동일 lock을 따르는 다른 실행 주체 | lock을 따르지 않는 접근 |

scheduler suspend는 mutex가 아니며 내부에서 block하면 안 됩니다. task끼리의 데이터라고 해도 SMP 구성에서는 전역 배제 여부를 따로 확인합니다. 장시간 작업에는 소유권과 대기 정책을 제공하는 mutex가 더 적합할 수 있습니다.

## Atomic과 Memory Barrier의 한계

atomic counter 갱신은 한 변수의 원자성을 제공하지만 여러 필드의 일관성이나 node 수명을 자동 보장하지 않습니다. pointer CAS만 추가한 linked stack은 ABA와 해제된 node 접근까지 해결하지 못하므로 완성된 lock-free 자료구조 예제로 제시하지 않습니다.

일반 shared_data와 flag 사이에 barrier만 넣어 C의 data race를 해결할 수도 없습니다. release/acquire 게시 계약, 실제 atomic object와 데이터 수명·재사용 규칙이 필요합니다. [1-06 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)의 one-shot 예제와 달리 반복 게시에는 별도의 ownership/ack 설계가 필요합니다.

## 정리

- 먼저 경쟁하는 task·ISR·다른 코어·DMA를 구분합니다.
- raw mask는 이전 상태와 중첩 복원 계약을 확인합니다.
- ARM_CM4F task critical은 nesting과 BASEPRI를 사용하며 scheduler suspend와 다릅니다.
- FromISR API에도 priority·포트·공유 데이터 계약이 있습니다.
- 시간 상한·공정성·진행성은 critical이나 atomic 이름만으로 보장되지 않습니다.

다음 [3-02 Semaphore 내부 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)에서 counter 검사와 block 등록 사이 race를 kernel이 어떻게 처리하는지 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c), [portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): nesting·BASEPRI·ISR mask.
- [GCC atomic built-ins](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html): memory order와 target별 구현.
- [Arm CMSIS 6.1.0 core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h): Cortex-M register interface. PRIMASK accessor는 같은 배포판의 compiler header에서 확인합니다.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-02: Semaphore 내부](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [4-08: Spinlock과 SMP](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
