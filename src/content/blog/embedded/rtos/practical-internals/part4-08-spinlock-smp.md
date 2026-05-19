---
title: "4-08: SMP Spinlock — LDREX/STREX·DMB·IRQ-Safe"
date: 2026-05-19T20:00:00
description: "ARM LDREX/STREX exclusive monitor. DMB barrier. spin_lock_irqsave. Ticket·MCS."
series: "Practical RTOS Internals"
seriesOrder: 40
tags: [spinlock, smp, ldrex, strex, dmb]
draft: true
---

## 한 줄 요약

> **"SMP Spinlock = LDREX/STREX + DMB"** — ARM atomic primitive.

## LDREX/STREX — Exclusive Monitor

```asm
loop:
    ldrex r1, [r0]    ; load with exclusive monitor
    cmp r1, #0
    bne loop          ; locked? retry
    mov r2, #1
    strex r3, r2, [r0]  ; conditional store
    cmp r3, #0
    bne loop          ; STREX 실패? retry
    dmb               ; acquire barrier
```

Exclusive monitor — *thread-local hardware flag*:
- LDREX → flag set + address tag
- STREX → flag·tag check → 성공 시 store + flag clear, 실패 시 store skip

다른 core가 *같은 address write* 시 — flag clear → 이 core STREX 실패.

## ARMv8 — Improved Atomic

```asm
; ARMv8.1 LSE (Large System Extensions)
casal w0, w1, [x2]    ; Compare-and-Swap, Acquire-Release
ldaddal w0, w1, [x2]  ; Load-Add, Acquire-Release
swpal w0, w1, [x2]    ; Swap
```

단일 명령 atomic + barrier. ARMv8.1+ (Cortex-A55/A75+).

## C 구현 — atomic_compare_exchange

```c
#include <stdatomic.h>

atomic_int lock;

void spin_lock_basic(atomic_int *l) {
    int expected = 0;
    while (!atomic_compare_exchange_strong(l, &expected, 1)) {
        expected = 0;
        cpu_relax();
    }
}

void spin_unlock_basic(atomic_int *l) {
    atomic_store_explicit(l, 0, memory_order_release);
}
```

`memory_order_acq_rel` 또는 명시 `acquire/release`로 fence.

## Test-and-Test-and-Set

```c
void spin_lock_ttas(atomic_int *l) {
    while (1) {
        while (atomic_load_explicit(l, memory_order_relaxed)) cpu_relax();
        int expected = 0;
        if (atomic_compare_exchange_weak_explicit(
                l, &expected, 1,
                memory_order_acquire, memory_order_relaxed))
            return;
    }
}
```

Spin loop이 *읽기만* — cache line S state 유지, bus traffic 0.

## spin_lock_irqsave

```c
void spin_lock_irqsave(spinlock_t *l, unsigned long *flags) {
    *flags = __get_PRIMASK();
    __disable_irq();
    while (atomic_exchange(&l->locked, 1)) {
        __set_PRIMASK(*flags);   /* IRQ allow during spin */
        cpu_relax();
        __disable_irq();
    }
}

void spin_unlock_irqrestore(spinlock_t *l, unsigned long flags) {
    atomic_store_explicit(&l->locked, 0, memory_order_release);
    __set_PRIMASK(flags);
}
```

ISR과 task 둘 다 *같은 lock 사용* 시 — IRQ disable로 self-preempt 방지.

## DMB·DSB·ISB

```c
__DMB();   /* memory access ordering */
__DSB();   /* memory + 모든 명령 complete */
__ISB();   /* pipeline flush */
```

Spinlock acquire 후 *DMB acquire-side*, release 전 *DMB release-side*.

ARMv8 `DMB ISH` (Inner Shareable) — *cluster 안만 동기화*. 빠름.

## ARM CPU Cache Bouncing

```text
SMP 4 core — same spinlock contention:
  core 0 LDREX → cache line shared
  core 1 LDREX → 같은 line shared
  core 0 STREX → cache line modified (others invalidated)
  core 1 STREX → fail, retry
  /* line bounces — 매 cycle invalidate */
```

→ **TTAS·Ticket·MCS** 패턴으로 완화 (4-04 spinlock chapter 참고).

## Ticket Lock — Linux Kernel 기본

```c
typedef struct {
    atomic_int next;
    atomic_int now_serving;
} ticket_lock_t;

void ticket_lock(ticket_lock_t *l) {
    int my = atomic_fetch_add_explicit(&l->next, 1, memory_order_relaxed);
    while (atomic_load_explicit(&l->now_serving, memory_order_acquire) != my)
        cpu_relax();
}

void ticket_unlock(ticket_lock_t *l) {
    atomic_fetch_add_explicit(&l->now_serving, 1, memory_order_release);
}
```

FIFO 공평. 그러나 *모든 waiter가 same line* → 매 unlock 시 broadcast.

## qspinlock — Linux 4.2+

Per-CPU MCS-style queue. 작은 contention에 *ticket lock과 비슷*, 큰 contention에 *훨씬 우수*.

```text
4-core: ticket과 비슷
32-core: qspinlock 3-5x faster
64-core: qspinlock 10x+ faster
```

Embedded SMP (2-4 core) — ticket으로 충분.

## RP2040 — Hardware Spinlock

```c
spin_lock_t *lock = spin_lock_instance(0);   /* 0-31 hardware lock */
uint32_t saved = spin_lock_blocking(lock);
critical();
spin_unlock(lock, saved);
```

RP2040 (dual M0+) — *32 hardware spinlock*. SIO peripheral. *Cache coherence 없이도 안전*.

## FreeRTOS SMP — portGET_TASK_LOCK·portGET_ISR_LOCK

```c
/* FreeRTOS 11 SMP 내부 */
portGET_TASK_LOCK();   /* task-side spinlock */
portGET_ISR_LOCK();    /* ISR-side spinlock */
critical_section();
portRELEASE_ISR_LOCK();
portRELEASE_TASK_LOCK();
```

두 lock 분리 — *nested ISR* 처리. ARM port — `__LDREX/__STREX` 기반.

## Zephyr `k_spin_lock`

```c
k_spinlock_t lock;
k_spinlock_key_t key = k_spin_lock(&lock);
critical();
k_spin_unlock(&lock, key);
```

내부 — atomic CAS + IRQ off (key에 저장).

## ARM Atomic Cost (Cortex-A72)

```text
LDREX/STREX (uncontended):        ~5 cycle
LDADD (LSE, uncontended):         ~3 cycle
LDREX/STREX (contended, retry):   ~20-50 cycle
CAS (contended):                  ~30-80 cycle
DMB ISH:                          ~10-20 cycle
DMB SY (full):                    ~30-50 cycle
```

Lock-free vs lock — *contention 정도* 따라 cross-over.

## 자주 하는 실수

> ⚠️ LDREX 후 다른 memory access

```c
ldrex r1, [r0]
ldr r2, [r3]   /* ← exclusive monitor *clear* — STREX 항상 실패 */
strex ...
```

→ LDREX와 STREX 사이 *짧고 단순*하게.

> ⚠️ DMB 누락

```c
spin_lock(...);
shared_data = ...;
/* DMB 없으면 write 다른 core에 안 보일 수 */
spin_unlock(...);
```

→ release barrier 명시 (`memory_order_release`).

> ⚠️ Spinlock 안 함수 호출 with sleep

```c
spin_lock(&l);
xQueueReceive(q, ..., portMAX_DELAY);   /* ← sleep with lock — 다른 core 다 대기 */
spin_unlock(&l);
```

→ short critical only.

> ⚠️ Nested lock without ordering

```c
core 0: spin_lock(&a); spin_lock(&b);
core 1: spin_lock(&b); spin_lock(&a);
/* → SMP deadlock */
```

→ 전역 lock ordering.

## 정리

- SMP spinlock = **LDREX/STREX + DMB** (ARMv7) / **CASAL** (ARMv8.1).
- `spin_lock_irqsave` — ISR ↔ task 공용 lock.
- **TTAS·Ticket·qspinlock** — cache bouncing 완화.
- RP2040 — *hardware spinlock 32개*.
- DMB ISH — cluster 안만 — 빠름.
- 짧은 critical만 — sleep/IRQ block 금지.

다음 편은 **Software Timer**.

## 관련 항목

- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
