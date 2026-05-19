---
title: "3-01: Critical Section 구현 — IRQ Disable, BASEPRI, Spinlock"
date: 2026-05-08T22:00:00
description: "3 가지 구현 — cpsid/BASEPRI mask, taskENTER_CRITICAL, SMP spinlock. Hold time이 latency 결정."
series: "Practical RTOS Internals"
seriesOrder: 22
tags: [critical-section, irq-disable, basepri, spinlock]
draft: true
---

## 한 줄 요약

> **"짧게 + 정확히"** — Critical section 안 작업이 *시스템 latency 한계*.

## 3 가지 구현

### 1. IRQ Disable — 가장 강력

```c
__disable_irq();   // PRIMASK = 1
critical_code();
__enable_irq();
```

PRIMASK가 *모든 IRQ mask* (NMI·HardFault 제외). 가장 단순·강력.

### 2. BASEPRI Mask — Selective

```c
uint32_t basepri = configMAX_SYSCALL_INTERRUPT_PRIORITY;
__set_BASEPRI(basepri);
critical_code();
__set_BASEPRI(0);
```

**priority ≥ BASEPRI만 mask** — 고우선 HW critical IRQ (motor·timing)는 계속 동작.

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

`uxCriticalNesting` 카운터로 *nested critical section* 안전.

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

가장 *바깥 EXIT*에서만 BASEPRI 0. 안전한 *서로 다른 코드 모듈* 호출.

## ISR-safe Critical Section

```c
UBaseType_t uxSavedInterruptStatus;
uxSavedInterruptStatus = taskENTER_CRITICAL_FROM_ISR();
isr_critical_code();
taskEXIT_CRITICAL_FROM_ISR(uxSavedInterruptStatus);
```

ISR 내부의 *별도 API* — 이미 IRQ context이므로 *BASEPRI 상태 저장/복원*만.

## SMP Spinlock

다중 코어 — 한 코어 IRQ disable로는 *다른 코어 access* 못 막음.

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

**Test-and-set** + memory barrier. ARMv7+ `ldrex/strex` 또는 ARMv8+ `casal`.

### 단일 코어 + SMP 동시 지원

```c
// FreeRTOS SMP
portSPINLOCK_ENTER(&xCoreSpinlock);   // SMP면 spin, UP면 IRQ mask
critical_code();
portSPINLOCK_EXIT(&xCoreSpinlock);
```

## Hold Time이 결정하는 것

```text
Critical section 50 µs:
  → 모든 ISR이 *최대 50 µs* 지연
  → Interrupt latency *50 µs 추가*
  → Hard real-time deadline 1 ms이면 위험
```

**Hold time 가이드라인**:
- ✓ ≤ 10 µs (수십 instruction)
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

Production 빌드에선 *#define으로 제거*, debug 빌드에서만 측정.

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

Single-variable update면 *atomic*으로 충분. *복잡한 자료구조*만 critical section.

## ISR Disable의 Hidden Cost

```c
__disable_irq();
// ↑ 이 instruction은 1 cycle
// 그러나 *모든 pending IRQ가 그 사이 대기*
//   ↳ tail-chaining 효과로 EXIT 후 *연달아 처리*
// 다른 ISR의 latency가 critical 길이만큼 증가
```

빈번한 짧은 critical도 *누적 ISR latency* 영향.

## Disable IRQ vs Suspend Scheduler

```c
// (1) IRQ disable
__disable_irq();   // ISR·task 모두 막음
// (2) Scheduler suspend only
vTaskSuspendAll();   // task만 막음, ISR은 계속
```

ISR과 *경쟁 자료*면 IRQ disable. *task끼리만*이면 suspend.

## Memory Barrier — Reordering 방지

ARM/RISC-V relaxed memory model — 컴파일러·CPU가 *명령 reorder*.

```c
// 잘못된 예
shared_data = value;
flag = 1;                  // ← reorder 가능: flag 먼저 set

// 옳음
shared_data = value;
__sync_synchronize();       // DMB
flag = 1;
```

`atomic_store_explicit(&flag, 1, memory_order_release)`로 일관성 보장.

## Critical Section 길이 — RTOS별 평균

| RTOS | Max critical | 비고 |
| --- | --- | --- |
| FreeRTOS | ~수십 cycle | 짧은 list 조작 |
| Zephyr | ~수십 cycle | k_spin_lock 짧음 |
| Linux PREEMPT_RT | < 10 µs | RT 보장 |
| Linux mainline | ms 단위 | RT 아님 |

**Linux mainline은 RTOS 아님** — critical section을 ms 단위 유지. RT 보장 X.

## 자주 하는 실수

> ⚠️ Critical 안 printf

수 ms 걸림 → 시스템 freeze. *항상 critical 밖*.

> ⚠️ Nested critical 잘못

uxCriticalNesting 추적 안 함 → 너무 일찍 exit → race.

> ⚠️ IRQ disable로 *고우선 HW IRQ*까지 막음

Motor 제어 IRQ가 ms 단위 지연 → 시스템 fail. **BASEPRI 사용**.

> ⚠️ Spinlock 단일 코어에 사용

Spin = busy wait — 단일 코어에선 *영원히 spin*. UP에선 IRQ mask.

## 정리

- 3 도구 — **IRQ disable, BASEPRI mask, taskENTER_CRITICAL** (+ SMP spinlock).
- `BASEPRI`가 *priority-aware* — 고우선 HW IRQ 보호.
- **Hold time ≤ 10 µs** 목표.
- Nested critical은 *uxCriticalNesting* 카운터.
- Single variable은 atomic으로 critical 없이.

다음 편은 **Semaphore 내부 구현** — counter + wait list.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-02: Semaphore 내부](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [4-08: Spinlock과 SMP](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
