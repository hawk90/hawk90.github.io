---
title: "4-04: Spinlock — Spin-Wait vs Context Switch·Ticket·MCS Lock"
date: 2026-05-08T13:00:00
description: "Spinlock 비용 분석. Test-and-set, ticket lock, MCS lock. SMP 한정 의미."
series: "Embedded Performance Engineering"
seriesOrder: 32
tags: [spinlock, smp, ticket-lock, mcs]
draft: true
---

## 한 줄 요약

> **"Spinlock = busy wait"** — hold time *짧을 때만* 의미 있음.

## Spin-Wait vs Sleep

```text
Hold time 1 µs:
  Spin:    1 µs CPU 낭비 (그러나 빠름)
  Sleep:   context switch ~3 µs × 2 = 6 µs overhead
  → Spin 우세

Hold time 1 ms:
  Spin:    1 ms × N CPU 낭비
  Sleep:   6 µs overhead
  → Sleep 우세
```

**경험칙** — hold time < 2 × context switch cost → spinlock.

## Basic Spinlock — Test-and-Set

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

ARM `LDREX/STREX`:

```asm
spin:
    ldrex r1, [r0]      ; load
    cmp r1, #0
    bne spin            ; locked → retry
    mov r2, #1
    strex r3, r2, [r0]  ; try set
    cmp r3, #0
    bne spin            ; STREX fail → retry
```

문제 — *모든 CPU가 same line cache invalidate* → bus storm.

## Test-and-Test-and-Set (TTAS)

```c
void spin_lock(spinlock_t *lock) {
    while (1) {
        /* Read-only loop — cache shared state, no bus traffic */
        while (atomic_load_explicit(&lock->locked, memory_order_relaxed)) {
            cpu_relax();   // PAUSE/YIELD hint
        }
        /* Now try to acquire */
        if (!atomic_exchange(&lock->locked, 1)) return;
    }
}
```

Spin은 *읽기만* — cache line이 S state 유지 → 다른 CPU read도 hit.
Lock 풀린 순간만 *atomic_exchange* (M state) — bus 한 번만.

## Ticket Lock — FIFO Fair

```c
typedef struct {
    atomic_int next;     // 다음 발급 번호
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

장점 — *FIFO 공평*, starvation 없음.
단점 — *모든 waiter가 같은 now_serving cache line* → unlock 시 *bus storm*.

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
        while (atomic_load(&self->locked)) cpu_relax();   // local spin
    }
}

void mcs_unlock(struct mcs_node *l, struct mcs_node *self) {
    if (!self->next) {
        if (atomic_compare_exchange(l, &self, NULL)) return;
        while (!self->next) cpu_relax();
    }
    atomic_store(&self->next->locked, 0);   // wake next
}
```

각 waiter가 *자기 cache line만 spin* — bus traffic 0. Linux kernel `qspinlock`도 비슷한 아이디어 (queued spinlock).

## Cache Line Bouncing 비교

```text
TTAS:     N waiter — unlock 시 N CPU 모두 invalidate, 한 CPU만 성공
Ticket:   N waiter — 모두 같은 now_serving line → 매 unlock N 미스
MCS:      N waiter — 각자 다른 line → unlock 시 1 line만 invalidate
```

대규모 SMP (32+ core)에선 *MCS / qspinlock 필수*.

## Linux Kernel — `spin_lock`

```c
spin_lock(&mylock);
critical_code();
spin_unlock(&mylock);

/* 또는 IRQ disable */
unsigned long flags;
spin_lock_irqsave(&mylock, flags);
critical_code();
spin_unlock_irqrestore(&mylock, flags);
```

`spin_lock_irqsave` — IRQ off + spin → ISR에서도 동일 lock 사용 가능.

## Cortex-M — Spinlock?

```text
Cortex-M 단일 코어 → spinlock 의미 없음
  → 그냥 IRQ disable / BASEPRI
  
SMP Cortex-M (M7 dual-core, M55+M85) → spinlock 필요
  → CMSIS RTOS·Zephyr가 atomic API 제공
```

```c
/* Zephyr SMP */
k_spinlock_t lock;
k_spinlock_key_t key = k_spin_lock(&lock);
critical_code();
k_spin_unlock(&lock, key);
```

## RTOS Adaptive — Spin then Block

```c
void adaptive_lock(...) {
    int spins = 0;
    while (try_lock() == false) {
        if (++spins > THRESHOLD) {
            block_self();   // wait list 등록
            return;
        }
        cpu_relax();
    }
}
```

처음 *수십 µs* spin → 안 풀리면 sleep. Linux mutex 기본 동작 (adaptive mutex).

## ARM PAUSE Hint — `YIELD`

```c
static inline void cpu_relax(void) {
    asm volatile ("yield");
}
```

`YIELD` 명령:
- SMT thread에 hint
- 일부 CPU — power 절약 (low-power state 진입)
- *spinlock loop의 표준*

x86 — `PAUSE`. RISC-V — `pause` (Zihintpause 확장).

## Spinlock Performance — 실측 (Cortex-A72 4-core)

```text
1 core: 거의 0 overhead (uncontended)
2 core, hold 100 ns: ~30 ns avg wait
4 core, hold 1 µs:    ~2 µs avg wait
4 core, hold 10 µs:   ~25 µs avg wait — *blocking lock이 유리*
```

## Lock Elision (HLE/RTM)

```c
/* Intel TSX */
asm volatile (
    "xacquire lock; xchg %0, %1"
    : ...
);
```

Hardware가 *speculative* lock acquire — 충돌 없으면 lock 효과 없음, 충돌 시 abort + retry.

ARM TME (Transactional Memory Extension) — 일부 Cortex-X에서 지원. 일반 임베디드엔 미지원.

## 자주 하는 실수

> ⚠️ Single-core에서 spinlock

```c
/* Cortex-M3 — 단일 core */
spin_lock(&l);  // ← 영원 spin (다른 task가 풀어줘야 하는데 CPU 못 줌)
```

→ mutex 또는 IRQ disable.

> ⚠️ Long hold time spinlock

```c
spin_lock(&l);
http_request();   // ← 수 초 — *모든 다른 core spin*
spin_unlock(&l);
```

→ mutex (sleep).

> ⚠️ Spinlock 안 IRQ enable

```c
spin_lock(&l);   // IRQ 활성 상태
                  // → ISR이 같은 lock 시도 → deadlock
```

→ `spin_lock_irqsave`.

> ⚠️ cpu_relax 없음

```c
while (locked) ;   // ← hot loop, power 낭비, SMT thread 굶주림
```

→ `cpu_relax()` 또는 `__asm__("yield")`.

## 정리

- Spinlock = **busy wait**, hold 짧을 때 우세.
- TTAS·**Ticket**·**MCS** — scalability 점진적 개선.
- 대규모 SMP — *qspinlock·MCS*.
- Cortex-M single core — 의미 없음, IRQ disable 사용.
- **Adaptive lock** — spin 후 sleep.
- `cpu_relax`·`YIELD` hint 필수.

다음 편은 **Mutex 성능**.

## 관련 항목

- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
