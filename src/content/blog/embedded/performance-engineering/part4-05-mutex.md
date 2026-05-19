---
title: "4-05: Mutex 성능 — Futex·Adaptive·Priority Inheritance"
date: 2026-05-08T14:00:00
description: "Mutex blocking 비용. Linux futex 2-stage. Adaptive mutex. Priority inheritance overhead."
series: "Embedded Performance Engineering"
seriesOrder: 33
tags: [mutex, blocking, futex, adaptive, priority-inheritance]
draft: true
---

## 한 줄 요약

> **"Mutex = block 가능 lock"** — hold time 길 때 *spinlock보다 우세*.

## Mutex 비용

```text
Uncontended (no waiter):
  - atomic CAS — 5-20 cycle
  - 함수 호출 overhead — 10 cycle
  - 총 ~30 cycle ≈ 100 ns @ 3 GHz

Contended (waiter):
  - waiter park (syscall) — 1-3 µs
  - holder unlock + wake — 1-3 µs
  - context switch — 1-3 µs
  - 총 ~10 µs
```

Spinlock 100 ns × 1000 cycle = 100 µs spin → mutex 더 빠를 수.

## Linux Futex (Fast Userspace Mutex)

```text
1. Uncontended path — userspace atomic, syscall 0개
   → 매우 빠름

2. Contended path — syscall (FUTEX_WAIT, FUTEX_WAKE)
   → kernel wait queue
```

```c
/* Pseudo-code */
void mutex_lock(int *m) {
    if (atomic_cmpxchg(m, 0, 1) == 0) return;   // fast path
    
    /* Contended */
    do {
        if (*m == 2 || atomic_cmpxchg(m, 1, 2) != 0)
            futex_wait(m, 2);
    } while (atomic_cmpxchg(m, 0, 2) != 0);
}

void mutex_unlock(int *m) {
    if (atomic_fetch_sub(m, 1) != 1) {
        *m = 0;
        futex_wake(m, 1);   // 한 waiter 깨움
    }
}
```

State 0 (free), 1 (locked no waiter), 2 (locked with waiter).

## Adaptive Mutex — 짧으면 spin

```c
void adaptive_mutex_lock(mutex_t *m) {
    int spins = 100;
    while (spins--) {
        if (try_lock(m)) return;
        cpu_relax();
    }
    /* Block */
    futex_wait(...);
}
```

Linux PTHREAD_MUTEX_ADAPTIVE_NP, Solaris adaptive mutex.

짧은 hold time — spin이 *block 비용 회피*. 긴 hold time — block.

## Priority Inheritance — Overhead

```c
/* Take with PI */
if (lock_held_by_lower_priority_task) {
    boost_holder_priority(my_priority);
    /* Chain */
    if (holder waits on another lock) {
        propagate further;
    }
}

/* Release */
restore_priority();
```

Overhead:
- Chain inheritance — *수십 µs* 가능
- Wait list 재정렬 — O(log N) 또는 O(N)
- Cache miss + lock TCB

Linux PTHREAD_PRIO_INHERIT, FreeRTOS PI mutex.

자동차·항공 — *유한 chain depth* 보장 필요 (보통 ≤ 3).

## FreeRTOS Mutex 측정

```c
TickType_t start = xTaskGetTickCount();
xSemaphoreTake(mtx, portMAX_DELAY);
TickType_t wait = xTaskGetTickCount() - start;
```

또는 trace:
- SEGGER SystemView — 시각화
- Percepio Tracealyzer — *per-mutex 통계*

```text
Mutex_DB:
  total_acquired:  12345
  total_block_time: 1234 ms
  max_block_time:    45 µs
  blocked_count:    2345
```

## Robust Mutex

```c
pthread_mutexattr_setrobust(&attr, PTHREAD_MUTEX_ROBUST);
```

Mutex 보유 thread *죽음* → 다음 take 시 *EOWNERDEAD* 반환 → 복구 가능.

```c
int err = pthread_mutex_lock(&mtx);
if (err == EOWNERDEAD) {
    /* State 복구 */
    pthread_mutex_consistent(&mtx);
}
```

Safety-critical에 유용.

## Recursive Mutex 비용

```c
recursive_mutex_take(&m);   // count++ — *atomic 한 번*
recursive_mutex_take(&m);   // count++
recursive_mutex_give(&m);   // count--
recursive_mutex_give(&m);   // count-- → 0 → 실제 unlock
```

각 take/give — atomic + count compare. *조금 더 비쌈*. 가능하면 non-recursive 사용.

## Reader Count·Writer Wait

RW-Mutex (별도 chapter) — read 동시 N개, write exclusive.

```c
struct rwlock {
    atomic_int readers;
    atomic_int writers_waiting;
    spinlock_t state_lock;
};
```

읽기 위주 워크로드 — RW가 *훨씬 빠름*.

## Mutex vs Semaphore — 사용 시점

| 항목 | Mutex | Semaphore |
|---|---|---|
| Owner | 있음 | 없음 |
| Recursive | 가능 | X |
| Priority Inheritance | 있음 | 없음 |
| ISR give | 금지 (owner 없음) | 가능 (signal) |
| 의미 | mutual exclusion | counting / signaling |

**Mutex** — 자원 보호.  
**Binary semaphore** — task ↔ ISR signal, *event*.

## 자동차 ECU — Mutex 패턴

```c
/* Brake task — 1 ms loop, mutex 짧게 */
xSemaphoreTake(brake_data_mtx, pdMS_TO_TICKS(1));   // timeout
if (got) {
    read_data();
    xSemaphoreGive(brake_data_mtx);
} else {
    /* Worst case — fault, use last known */
    use_last_known();
}
```

*Timeout 명시* — block 영원 방지. Fault path 명시.

## Apple/Mach OS — os_unfair_lock

```c
#include <os/lock.h>
os_unfair_lock lock = OS_UNFAIR_LOCK_INIT;
os_unfair_lock_lock(&lock);
critical();
os_unfair_lock_unlock(&lock);
```

매우 가벼움 — *spin 후 thread park*. Priority donation 자동. iOS·macOS spinlock 대체.

## 자주 하는 실수

> ⚠️ ISR 안 mutex

```c
ISR: xSemaphoreTake(mtx);   // ✗ block 가능 → fault
```

→ semaphore + FromISR.

> ⚠️ Long blocking mutex

```c
xSemaphoreTake(mtx, portMAX_DELAY);   // ← deadlock 시 영원
```

→ 유한 timeout.

> ⚠️ Mutex 안 mutex (nested)

```c
xSemaphoreTake(a);
xSemaphoreTake(b);   // ← b 다른 task가 a 대기 시 deadlock
```

→ lock ordering.

> ⚠️ PI 무시한 RT design

```c
/* Low priority task가 mutex 보유 */
/* Med priority task가 CPU 점유 */
/* High priority task가 mutex 대기 */
/* → Priority Inversion */
```

→ *PI mutex* 사용 + WCET 분석.

## 정리

- Mutex = **block 가능**, hold time 길 때 우세.
- Linux **futex** — uncontended는 syscall 0.
- **Adaptive mutex** — 짧은 spin 후 block.
- **Priority Inheritance**는 chain overhead — 자동차·항공 *유한 보장*.
- Mutex (owner) vs Semaphore (signal) 구분.
- `os_unfair_lock`·`pthread_mutex_lock` 가벼움.

다음 편은 **RW-Lock**.

## 관련 항목

- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
