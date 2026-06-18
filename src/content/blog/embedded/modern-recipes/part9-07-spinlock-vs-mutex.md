---
title: "Spinlock vs Mutex 결정 가이드 — Context Switch·Hold Time"
date: 2026-04-18T09:06:00
description: "Lock hold time, 코어 수, preemption, real-time 요구사항에 따라 spinlock과 mutex를 어떻게 고를지 ticket lock과 MCS lock까지 함께 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 107
tags: [recipes, concurrency, lock]
---

## 한 줄 요약

> **"Hold time이 µs 단위면 spinlock, ms 단위면 mutex."** SMP가 아니면 spinlock은 거의 의미가 없습니다.

## 어떤 상황에서 쓰나

Linux kernel처럼 ISR과 process context, multi-CPU가 섞인 환경에서 둘을 매번 골라야 합니다. driver의 짧은 register update는 spinlock, file I/O 같은 긴 작업은 mutex가 답입니다.

사용자 공간 multi-thread 응용에서도 같은 결정이 나옵니다. ms 단위 작업에 spinlock을 쓰면 CPU가 burn되고, ns 단위 작업에 mutex를 쓰면 context switch 비용이 작업 자체보다 큽니다.

## 핵심 개념

```text
mutex (sleep lock)
  contention 시 caller가 sleep → context switch
  hold time이 길수록 유리
  ISR에서 사용 금지

spinlock (busy lock)
  contention 시 caller가 busy wait
  hold time이 매우 짧을 때만 유리
  ISR과 process context 모두 사용 가능
  Linux: spin_lock_irqsave가 IRQ까지 disable
```

판단 기준입니다.

| hold time | 권장 |
|-----------|------|
| < 1 µs (수십 cycle) | spinlock 또는 atomic |
| 1~10 µs | spinlock (SMP) / mutex (UP) |
| > 10 µs | mutex |
| ISR context | 반드시 `spinlock(_irqsave)` |
| single-CPU | spinlock의 의미 없음 (`preempt_disable`로 대체) |

advanced spinlock variants도 있습니다.

| ticket lock | FIFO 보장 — fairness |
|---|---|
| MCS lock | 각 CPU가 자기 cache line에서 spin — 확장성 |
| qspinlock | Linux의 표준 — 짧은 contention은 ticket, 긴 건 MCS |

## 코드 / 실제 사용 예

### Linux kernel spinlock

```c
DEFINE_SPINLOCK(my_lock);

/* process context */
spin_lock(&my_lock);
critical_section();
spin_unlock(&my_lock);

/* process + ISR 둘 다 접근 가능한 자원 */
spin_lock_irqsave(&my_lock, flags);
critical_section();
spin_unlock_irqrestore(&my_lock, flags);
```

`spin_lock`은 preemption만 disable, `spin_lock_irqsave`는 IRQ까지 disable합니다. ISR과 race가 가능한 자원이면 후자가 필수입니다.

### Linux kernel mutex

```c
DEFINE_MUTEX(my_mtx);

mutex_lock(&my_mtx);
file_io();
mutex_unlock(&my_mtx);

/* timeout */
if (mutex_lock_interruptible(&my_mtx)) return -ERESTARTSYS;

/* ISR/atomic context는 절대 사용 불가 — mutex_lock은 sleep */
```

mutex는 sleep 가능한 context에서만 씁니다. ISR이나 spinlock 안에서는 안 됩니다.

### Userspace spinlock (단순 구현)

```cpp
struct spinlock {
    std::atomic<int> v{0};

    void lock(void) {
        int expected = 0;
        while (!v.compare_exchange_weak(
                expected, 1, std::memory_order_acquire)) {
            expected = 0;
            __asm__ volatile("yield" ::: "memory");
        }
    }

    void unlock(void) {
        v.store(0, std::memory_order_release);
    }
};
```

contention 시 yield로 backoff합니다. 그러나 진짜 busy wait는 SMP에서만 의미가 있습니다.

### Ticket lock (FIFO 보장)

```cpp
struct ticket_lock {
    std::atomic<unsigned> next{0};
    std::atomic<unsigned> now{0};

    void lock(void) {
        unsigned my = next.fetch_add(1, std::memory_order_acquire);
        while (now.load(std::memory_order_acquire) != my) {
            __asm__ volatile("yield" ::: "memory");
        }
    }

    void unlock(void) {
        now.fetch_add(1, std::memory_order_release);
    }
};
```

번호표를 받아 자기 차례를 기다리는 구조입니다. 모든 thread가 같은 line(`now`)을 read해서 cache line ping-pong이 발생하지만, fairness는 보장됩니다.

### MCS lock (per-CPU spin)

```cpp
struct mcs_node {
    std::atomic<mcs_node *> next{nullptr};
    std::atomic<bool> locked{false};
};

void mcs_lock(mcs_node **tail, mcs_node *me) {
    mcs_node *prev = tail->exchange(me, std::memory_order_acquire);
    if (prev) {
        me->locked.store(true, std::memory_order_relaxed);
        prev->next.store(me, std::memory_order_release);
        while (me->locked.load(std::memory_order_acquire))
            __asm__ volatile("yield" ::: "memory");
    }
}

void mcs_unlock(mcs_node **tail, mcs_node *me) {
    mcs_node *succ = me->next.load(std::memory_order_acquire);
    if (!succ) {
        mcs_node *exp = me;
        if (tail->compare_exchange_strong(exp, nullptr)) return;
        while (!(succ = me->next.load(std::memory_order_acquire)));
    }
    succ->locked.store(false, std::memory_order_release);
}
```

각 thread는 *자기 line*에서 spin합니다. cache line ping-pong이 사라져 코어 수에 거의 선형으로 scaling됩니다.

### qspinlock (Linux 표준 선택)

| 짧은 contention | MCS 1단계 — 빠름 |
|---|---|
| 긴 contention | MCS chain — fair |
| 0 contention | CAS 한 줄 |

Linux는 4.2부터 qspinlock이 표준입니다. 일반 코드는 그냥 spin_lock을 부르면 됩니다.

### Decision tree

```text
질문 1: 작업이 sleep 가능한가?
   no → spinlock (ISR/atomic context)
   yes → 질문 2

질문 2: hold time이 얼마인가?
   < 1 µs    spinlock 또는 atomic 직접
   1~10 µs   spinlock (SMP에서만)
   > 10 µs   mutex

질문 3: contention이 큰가? (코어 ≥ 8, 동시 thread > 4)
   yes      MCS / qspinlock 사용
   no       기본 spinlock으로 충분
```

## 측정 / 성능 비교

```text
Cortex-A72 8-core, no contention
spinlock acquire/release         15 cycle
mutex lock/unlock (futex)        ~50 ns (uncontended fast path)
ticket lock                      18 cycle
MCS lock                         20 cycle

contention 8 thread, 100 ns critical section
basic spinlock                   ~2 µs/op (cache ping-pong)
ticket lock                      ~1.8 µs/op
MCS lock                         ~300 ns/op (각자 자기 line)
mutex                            ~600 ns/op (context switch)
```

contention이 크면 MCS가 압도적입니다. mutex도 의외로 잘 동작합니다.

```text
spinlock vs mutex (hold time별, 4 thread)
hold 100 ns: spinlock 0.4 µs/op, mutex 0.9 µs/op
hold 10 µs: spinlock 12 µs/op, mutex 11 µs/op
hold 100 µs: spinlock 80 µs/op, mutex 105 µs/op
```

hold time이 길어지면 mutex가 더 효율적입니다.

## 자주 보는 함정

> Single-CPU에서 spinlock 사용

```c
spin_lock(&x);   /* UP에서는 preempt_disable과 같음 — spin할 다른 코어 없음 */
```

UP(Uniprocessor) kernel에서는 spinlock이 preempt_disable로 컴파일됩니다. 의미가 다릅니다.

> Sleep을 spinlock 안에서

```c
spin_lock(&x);
msleep(10);     /* BUG — spin 상태로 sleep 불가능 */
spin_unlock(&x);
```

spinlock 안에서는 sleep 가능한 모든 함수가 금지입니다.

> ISR에서 mutex

```c
void irq_handler(...) {
    mutex_lock(&m);     /* sleep 시도 → kernel oops */
}
```

ISR은 sleep 불가능합니다. 항상 spinlock_irqsave를 씁니다.

> Hold time이 가변

```c
spin_lock(&x);
if (rare_path) {
    file_io();    /* 평소는 빠르지만 가끔 ms 단위 */
}
spin_unlock(&x);
```

rare path의 ms 작업이 모든 thread를 spin하게 만듭니다. lock을 잘게 쪼개거나 mutex로 옮깁니다.

> Spinlock 안에서 atomic backoff 없음

```c
while (!try_lock());    /* hot read — system 전반 영향 */
```

yield 또는 pause로 backoff를 둡니다.

## 정리

- Hold time < 1 µs면 spinlock 또는 atomic, > 10 µs면 mutex가 일반 규칙입니다.
- ISR과 race 가능한 자원은 반드시 spinlock_irqsave입니다.
- Single-CPU에서 spinlock은 preempt_disable과 같습니다.
- contention이 크면 MCS / qspinlock으로 확장성을 회복합니다.
- spinlock 안에서는 sleep 가능한 모든 작업이 금지입니다.
- hold time이 가변이면 lock을 쪼개거나 mutex로 옮깁니다.
- Linux는 4.2부터 qspinlock이 기본이므로 일반 코드는 spin_lock만 부르면 됩니다.

다음 편은 **ABA 문제 회피**입니다.

## 관련 항목

- [PRTOS 1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [6-05: Mutex 활용](/blog/embedded/modern-recipes/part6-05-mutex-usage)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)
- [PE 4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [PE 4-05: Mutex](/blog/embedded/performance-engineering/part4-05-mutex)
