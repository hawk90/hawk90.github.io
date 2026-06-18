---
title: "Critical Section 구현 비교 — IRQ Disable·BASEPRI·Spinlock"
date: 2026-05-06T09:22:00
description: "3 가지 구현 — cpsid/BASEPRI mask, taskENTER_CRITICAL, SMP spinlock. Hold time이 latency 결정."
series: "Practical RTOS Internals"
seriesOrder: 22
tags: [critical-section, irq-disable, basepri, spinlock]
draft: false
---

## 한 줄 요약

> **"짧고 정확하게."** Critical section 안에서 하는 작업이 곧 시스템 latency의 한계가 됩니다.

## 3 가지 구현

### 1. IRQ Disable — 가장 강력합니다

```c
__disable_irq();   // PRIMASK = 1
critical_code();
__enable_irq();
```

PRIMASK는 NMI와 HardFault를 제외한 모든 IRQ를 mask합니다. 가장 단순하면서도 강력한 방법입니다.

### 2. BASEPRI Mask — Selective

```c
uint32_t basepri = configMAX_SYSCALL_INTERRUPT_PRIORITY;
__set_BASEPRI(basepri);
critical_code();
__set_BASEPRI(0);
```

BASEPRI 이상 우선순위만 mask하기 때문에 motor 제어나 timing 같은 고우선 HW critical IRQ는 계속 동작합니다.

### 3. taskENTER_CRITICAL — RTOS Wrapper

```c
taskENTER_CRITICAL();   // BASEPRI mask + scheduler suspend
critical_code();
taskEXIT_CRITICAL();
```

내부:
```c
#define taskENTER_CRITICAL()  portENTER_CRITICAL()
#define portENTER_CRITICAL()  vPortRaiseBASEPRI()

void vPortRaiseBASEPRI(void) {
    uint32_t ulNewBASEPRI = configMAX_SYSCALL_INTERRUPT_PRIORITY;
    __asm volatile (
        "msr basepri, %0\n"
        "dsb\n"
        "isb\n"
        : : "r" (ulNewBASEPRI) : "memory"
    );
    uxCriticalNesting++;
}
```

`uxCriticalNesting` 카운터를 통해 nested critical section을 안전하게 처리합니다.

## Nested Critical Section

```c
void func_a(void) {
    taskENTER_CRITICAL();   // nesting = 1
    func_b();
    taskEXIT_CRITICAL();    // nesting = 0
}

void func_b(void) {
    taskENTER_CRITICAL();   // nesting = 2
    critical_code();
    taskEXIT_CRITICAL();    // nesting = 1, BASEPRI 아직 unmask 안 함
}
```

가장 바깥쪽 EXIT에서만 BASEPRI를 0으로 되돌립니다. 덕분에 서로 다른 코드 모듈끼리 안전하게 호출할 수 있습니다.

## ISR-safe Critical Section

```c
UBaseType_t uxSavedInterruptStatus;
uxSavedInterruptStatus = taskENTER_CRITICAL_FROM_ISR();
isr_critical_code();
taskEXIT_CRITICAL_FROM_ISR(uxSavedInterruptStatus);
```

ISR 내부에서는 별도의 API를 씁니다. 이미 IRQ context이므로 BASEPRI 상태를 저장하고 복원하는 것만으로 충분합니다.

## SMP Spinlock

다중 코어 환경에서는 한 코어에서 IRQ를 disable한다고 해도 다른 코어의 access를 막을 수 없습니다.

```c
void spin_lock(spinlock_t *lock) {
    while (__atomic_exchange_n(&lock->locked, 1, __ATOMIC_ACQUIRE)) {
        while (__atomic_load_n(&lock->locked, __ATOMIC_RELAXED))
            asm volatile("yield");
    }
}

void spin_unlock(spinlock_t *lock) {
    __atomic_store_n(&lock->locked, 0, __ATOMIC_RELEASE);
}
```

Test-and-set과 memory barrier를 함께 사용합니다. ARMv7 이상에서는 `ldrex/strex`를, ARMv8 이상에서는 `casal`을 활용합니다.

### 단일 코어 + SMP 동시 지원

```c
// FreeRTOS SMP
portSPINLOCK_ENTER(&xCoreSpinlock);   // SMP면 spin, UP면 IRQ mask
critical_code();
portSPINLOCK_EXIT(&xCoreSpinlock);
```

## Hold Time이 결정하는 것

**Critical section 50 µs:**

- → 모든 ISR이 *최대 50 µs* 지연
- → Interrupt latency *50 µs 추가*
- → Hard real-time deadline 1 ms이면 위험

Hold time 가이드라인은 다음과 같습니다.

- ✓ 10 µs 이하, 수십 instruction 정도
- ✓ 변수 update, 짧은 list 조작
- ✗ printf, malloc, file I/O
- ✗ 다른 mutex acquire

## 측정 — Critical Section 길이

```c
void taskENTER_CRITICAL_TRACED(void) {
    uint32_t t = DWT->CYCCNT;
    taskENTER_CRITICAL();
    last_enter = t;
}

void taskEXIT_CRITICAL_TRACED(void) {
    uint32_t elapsed = DWT->CYCCNT - last_enter;
    taskEXIT_CRITICAL();
    log_max(elapsed);
}
```

Production 빌드에서는 `#define`으로 제거하고 debug 빌드에서만 측정하도록 분리하는 편이 좋습니다.

## Lock-free 대안

```c
// Atomic counter (no critical section!)
atomic_fetch_add(&counter, 1);

// Compare-And-Swap
do {
    old = atomic_load(&head);
    new = old->next;
} while (!atomic_compare_exchange(&head, &old, new));
```

Single variable update라면 atomic 연산만으로도 충분합니다. 복잡한 자료구조에만 critical section을 적용하는 것이 좋습니다.

## ISR Disable의 Hidden Cost

```c
__disable_irq();
// ↑ 이 instruction은 1 cycle
// 그러나 *모든 pending IRQ가 그 사이 대기*
//   ↳ tail-chaining 효과로 EXIT 후 *연달아 처리*
// 다른 ISR의 latency가 critical 길이만큼 증가
```

짧은 critical section을 자주 사용하더라도 누적된 ISR latency에는 분명한 영향을 미칩니다.

## Disable IRQ vs Suspend Scheduler

```c
// (1) IRQ disable
__disable_irq();   // ISR·task 모두 막음
// (2) Scheduler suspend only
vTaskSuspendAll();   // task만 막음, ISR은 계속
```

ISR과 경쟁하는 데이터라면 IRQ disable을 사용합니다. task끼리만 경쟁한다면 scheduler suspend로 충분합니다.

## Memory Barrier — Reordering 방지

ARM과 RISC-V는 relaxed memory model을 따릅니다. 컴파일러와 CPU 모두 명령을 reorder할 수 있습니다.

```c
// 잘못된 예
shared_data = value;
flag = 1;                  // ← reorder 가능: flag 먼저 set

// 옳음
shared_data = value;
__sync_synchronize();       // DMB
flag = 1;
```

`atomic_store_explicit(&flag, 1, memory_order_release)`로 일관성을 보장할 수 있습니다.

## Critical Section 길이 — RTOS별 평균

| RTOS | Max critical | 비고 |
| --- | --- | --- |
| FreeRTOS | ~수십 cycle | 짧은 list 조작 |
| Zephyr | ~수십 cycle | k_spin_lock 짧음 |
| Linux PREEMPT_RT | < 10 µs | RT 보장 |
| Linux mainline | ms 단위 | RT 아님 |

Linux mainline은 RTOS가 아닙니다. critical section을 ms 단위로 유지하기 때문에 real-time 보장을 기대할 수 없습니다.

## 자주 하는 실수

> ⚠️ Critical section 안에서 `printf`를 호출합니다

수 ms 동안 걸리면 시스템이 그대로 멈춥니다. `printf`는 반드시 critical 밖에서 호출합니다.

> ⚠️ Nested critical을 잘못 다룹니다

`uxCriticalNesting`을 제대로 추적하지 않으면 너무 일찍 exit하여 race가 발생합니다.

> ⚠️ IRQ disable로 고우선 HW IRQ까지 막아 버립니다

Motor 제어 IRQ가 ms 단위로 지연되면 시스템 자체가 fail합니다. 이런 경우에는 BASEPRI를 사용합니다.

> ⚠️ 단일 코어에서 spinlock을 사용합니다

Spinlock은 busy wait입니다. 단일 코어에서는 lock holder가 진행되지 못해 영원히 spin하게 됩니다. UP 환경에서는 IRQ mask로 대체합니다.

## 정리

- 도구는 IRQ disable, BASEPRI mask, `taskENTER_CRITICAL` 세 가지이고, SMP에서는 spinlock이 추가됩니다.
- BASEPRI는 priority-aware이기 때문에 고우선 HW IRQ를 보호할 수 있습니다.
- Hold time은 10 µs 이하를 목표로 합니다.
- Nested critical은 `uxCriticalNesting` 카운터로 안전하게 처리합니다.
- Single variable은 atomic 연산으로 처리하면 critical section 없이도 안전합니다.

다음 편에서는 **Semaphore 내부 구현**(counter와 wait list)을 살펴봅니다.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-02: Semaphore 내부](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [4-08: Spinlock과 SMP](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
