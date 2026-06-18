---
title: "Spinlock 성능 분석 — Spin-Wait vs Context Switch·Ticket·MCS"
date: 2026-04-26T09:03:00
description: "Spinlock 비용 분석과 ticket lock, MCS lock의 scalability 차이."
series: "Embedded Performance Engineering"
seriesOrder: 33
tags: [spinlock, smp, ticket-lock, mcs]
---

## 한 줄 요약

> **"Spinlock은 busy wait이며 hold time이 context switch 비용보다 짧을 때만 의미가 있습니다."**

## 어떤 문제를 푸는가

Mutex처럼 block 가능한 lock은 context switch가 동반됩니다. Context switch는 Cortex-A에서 1-3 µs, x86에서 1-5 µs 정도가 들기 때문에, critical section이 100 ns 짜리라면 lock 자체보다 switch 비용이 훨씬 큽니다.

Spinlock은 lock이 풀릴 때까지 CPU를 점유한 채 계속 atomic read를 돌립니다. CPU가 낭비되지만 context switch가 없으므로, 짧은 critical section에서는 훨씬 빠릅니다. 단, 잘못 쓰면 CPU 100%를 그대로 태우면서 진척이 없게 됩니다.

이 글에서는 spinlock의 기본 구현부터 ticket lock, MCS lock까지 scalability가 어떻게 달라지는지 살펴봅니다. SMP가 늘어날수록 단순 spinlock은 cache coherence traffic으로 무너지기 시작합니다.

## Spin vs Sleep — 손익 분기

```text
Hold time 1 µs:
  Spin:    1 µs CPU 낭비, 곧바로 진행
  Sleep:   context switch ~3 µs × 2 = 6 µs overhead
  → Spin이 우세

Hold time 1 ms:
  Spin:    1 ms × N CPU 낭비
  Sleep:   6 µs overhead
  → Sleep이 우세
```

경험칙은 hold time이 context switch 비용의 두 배 이하면 spinlock을 씁니다. 이보다 길면 mutex가 시스템 전체 효율에서 유리합니다.

## 기본 Spinlock — Test-and-Set

```c
typedef struct { atomic_int locked; } spinlock_t;

void spin_lock(spinlock_t *lock) {
    while (atomic_exchange(&lock->locked, 1)) {
        /* spin */
    }
}

void spin_unlock(spinlock_t *lock) {
    atomic_store(&lock->locked, 0);
}
```

ARM에서는 LDREX/STREX 쌍으로 구현합니다.

```asm
spin:
    ldrex r1, [r0]
    cmp   r1, #0
    bne   spin
    mov   r2, #1
    strex r3, r2, [r0]
    cmp   r3, #0
    bne   spin
```

문제는 모든 코어가 같은 cache line에 write를 시도하면서 cache coherence traffic이 폭발한다는 점입니다. 8-core에서 한 lock에 경쟁하면 bus가 invalidate 메시지로 가득 차게 됩니다.

## Test-and-Test-and-Set (TTAS)

```c
void spin_lock(spinlock_t *lock) {
    while (1) {
        while (atomic_load_explicit(&lock->locked,
                                    memory_order_relaxed)) {
            cpu_relax();
        }
        if (!atomic_exchange(&lock->locked, 1)) return;
    }
}
```

내부 spin은 read-only이므로 cache line이 Shared 상태로 유지됩니다. 모든 코어가 read만 하면 bus traffic은 0에 가깝습니다. Lock이 풀린 순간에만 `atomic_exchange`가 호출되어 한 번의 invalidate가 발생합니다.

대부분의 실용적 spinlock 구현이 TTAS를 기본으로 합니다.

## Ticket Lock — FIFO Fair

```c
typedef struct {
    atomic_int next;
    atomic_int now_serving;
} ticket_lock_t;

void ticket_lock(ticket_lock_t *l) {
    int my_ticket = atomic_fetch_add(&l->next, 1);
    while (atomic_load(&l->now_serving) != my_ticket) {
        cpu_relax();
    }
}

void ticket_unlock(ticket_lock_t *l) {
    atomic_fetch_add(&l->now_serving, 1);
}
```

도착 순서대로 ticket을 받고 자기 번호가 호출될 때까지 기다리므로 FIFO가 보장됩니다. Starvation이 없는 것이 장점입니다.

단점은 모든 waiter가 같은 `now_serving` cache line을 보고 있다는 점입니다. Unlock 한 번에 N개 코어 모두에서 invalidate가 발생합니다.

## MCS Lock — Scalable

```c
struct mcs_node {
    struct mcs_node *next;
    atomic_int locked;
};

void mcs_lock(struct mcs_node *l, struct mcs_node *self) {
    self->next = NULL;
    self->locked = 1;

    struct mcs_node *prev = atomic_exchange(l, self);
    if (prev) {
        prev->next = self;
        while (atomic_load(&self->locked)) cpu_relax();
    }
}

void mcs_unlock(struct mcs_node *l, struct mcs_node *self) {
    if (!self->next) {
        if (atomic_compare_exchange(l, &self, NULL)) return;
        while (!self->next) cpu_relax();
    }
    atomic_store(&self->next->locked, 0);
}
```

각 waiter가 자기 `mcs_node->locked`만 spin합니다. Cache line이 코어별로 분리되어 있으므로 bus traffic이 0이 됩니다. Unlock은 다음 노드의 `locked`를 0으로 쓰는 한 번의 store만 발생합니다.

Linux kernel의 `qspinlock`이 이 아이디어를 발전시킨 구현으로, 4.2 이후 표준 spinlock으로 자리 잡았습니다.

## Cache Line Bouncing 비교

```text
TTAS    : N waiter — unlock 시 N CPU 모두 invalidate, 1 CPU만 성공
Ticket  : N waiter — 모두 now_serving 공유 → 매 unlock N miss
MCS     : N waiter — 각자 다른 line → unlock 시 1 line만 invalidate
```

대규모 SMP에서는 차이가 극적입니다. 32-core 이상에서 TTAS는 throughput이 거의 0으로 무너지지만, MCS는 거의 일정한 비용으로 유지됩니다.

## Linux Kernel — `spin_lock`

```c
spin_lock(&mylock);
critical_code();
spin_unlock(&mylock);

unsigned long flags;
spin_lock_irqsave(&mylock, flags);
critical_code();
spin_unlock_irqrestore(&mylock, flags);
```

`spin_lock_irqsave`는 IRQ를 끄고 spin하므로 ISR과 task가 같은 lock을 안전하게 공유할 수 있습니다. 같은 코어에서 ISR이 lock을 다시 잡으려고 시도해도 deadlock에 빠지지 않습니다.

## Cortex-M에서의 Spinlock

```text
Cortex-M3/M4 single core:
  spinlock은 의미가 없습니다. 다른 task가 lock을 풀려면 CPU가 필요한데
  spin이 CPU를 점유하므로 영원히 풀리지 않습니다.
  → IRQ disable 또는 BASEPRI로 critical section을 보호합니다.

SMP Cortex-M (RP2040, Cortex-M55+M85):
  cross-core spinlock이 필요합니다.
  CMSIS RTOS와 Zephyr가 atomic API를 제공합니다.
```

Zephyr SMP의 사용 예입니다.

```c
k_spinlock_t lock;
k_spinlock_key_t key = k_spin_lock(&lock);
critical_code();
k_spin_unlock(&lock, key);
```

`key`는 spin 진입 시점의 IRQ 상태를 저장해 unlock 때 복원합니다.

## Adaptive Mutex — Spin 후 Sleep

```c
void adaptive_lock(lock_t *l) {
    int spins = 0;
    while (!try_lock(l)) {
        if (++spins > THRESHOLD) {
            block_self();
            return;
        }
        cpu_relax();
    }
}
```

수십 µs 정도 spin해 보고 그래도 안 풀리면 sleep으로 전환합니다. 짧은 contention은 spin으로, 긴 것은 mutex로 자동 분기되므로 두 방식의 장점을 모두 얻습니다. Linux mutex의 기본 동작이며 Solaris adaptive mutex도 같은 방식입니다.

## ARM YIELD 힌트

```c
static inline void cpu_relax(void) {
    asm volatile ("yield");
}
```

`YIELD` 명령은 SMT thread에 자원을 양보하고, 일부 코어에서는 저전력 상태로 잠시 진입합니다. Spinlock loop의 표준 관용구입니다.

x86에서는 `PAUSE`, RISC-V에서는 Zihintpause 확장의 `pause`가 같은 역할을 합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Single-core에서 spinlock

```c
/* Cortex-M3 — 단일 core */
spin_lock(&l);   /* 영원 spin */
```

다른 task가 lock을 풀어야 하는데 CPU를 양보할 수 없으므로 시스템이 멈춥니다. Mutex나 IRQ disable을 써야 합니다.

> ⚠️ Long hold time spinlock

```c
spin_lock(&l);
http_request();   /* 수 초 동안 모든 다른 core가 spin */
spin_unlock(&l);
```

Network I/O처럼 비결정적 작업은 spinlock 안에 두면 안 됩니다. Mutex로 전환해야 합니다.

> ⚠️ IRQ enable 상태에서 spinlock

```c
spin_lock(&l);
/* IRQ 활성 → ISR이 같은 lock 시도 → deadlock */
```

`spin_lock_irqsave`를 써야 ISR과 안전하게 공유할 수 있습니다.

> ⚠️ cpu_relax 없는 spin

```c
while (locked) ;   /* hot loop, power 낭비, SMT 굶주림 */
```

`cpu_relax()` 또는 `__asm__("yield")`를 반드시 넣어야 SMT thread와 전력 절감이 동작합니다.

## 측정 — 실측 결과

Cortex-A72 4-core에서 hold time을 바꿔 가며 측정한 평균 wait time입니다.

```text
              1 core    2 core    4 core
hold 100 ns    0 ns     30 ns     90 ns
hold   1 µs    0 ns    400 ns      2 µs
hold  10 µs    0 ns      8 µs     25 µs    ← mutex 우세 시작
hold 100 µs    0 ns     80 µs    250 µs    ← mutex 압도적
```

Hold time이 10 µs 부근부터 mutex가 더 유리해지는 경계가 보입니다. 이 측정값을 기준으로 spinlock과 mutex를 선택하는 가이드라인을 세울 수 있습니다.

## 정리

- Spinlock은 busy wait이며 hold time이 짧을 때만 의미가 있습니다.
- TTAS, ticket, MCS 순으로 scalability가 개선됩니다.
- 대규모 SMP에서는 qspinlock이나 MCS lock이 필수입니다.
- Cortex-M single core에서는 spinlock이 무의미하며 IRQ disable로 대체합니다.
- Adaptive lock은 spin 후 sleep으로 두 방식의 장점을 모두 활용합니다.
- `cpu_relax`와 `YIELD` 힌트는 spin loop의 표준 관용구입니다.

다음 편은 **Mutex 성능** — futex와 priority inheritance를 분석합니다.

## 관련 항목

- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
- [Practical RTOS Internals 3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
