---
title: "4-05: Mutex 성능 — Futex·Adaptive·Priority Inheritance"
date: 2026-05-08T14:00:00
description: "Mutex blocking 비용과 Linux futex 2-stage, adaptive mutex, priority inheritance overhead."
series: "Embedded Performance Engineering"
seriesOrder: 33
tags: [mutex, blocking, futex, adaptive, priority-inheritance]
---

## 한 줄 요약

> **"Mutex는 block 가능한 lock이며, hold time이 길수록 spinlock보다 유리합니다."**

## 어떤 문제를 푸는가

Spinlock은 짧은 critical section에 적합하지만 hold time이 µs 단위를 넘기 시작하면 CPU 낭비가 시스템 전체 throughput을 깎습니다. Mutex는 lock을 얻지 못한 thread를 sleep 시키고 holder가 unlock할 때 wake up 시키므로, 다른 thread가 그 CPU를 쓸 수 있습니다.

문제는 sleep과 wake가 공짜가 아니라는 점입니다. 한 번의 context switch가 1-5 µs, wake up까지 합치면 10 µs 가까이 들기도 합니다. 이 비용을 어떻게 줄이느냐가 modern mutex 구현의 핵심입니다.

이 글에서는 Linux futex의 2-stage 구조, adaptive mutex가 spin과 block을 어떻게 결합하는지, 그리고 priority inheritance가 real-time 시스템에서 어떤 overhead를 만드는지 살펴봅니다.

## Mutex 비용 분해

```text
Uncontended (waiter 없음):
  - atomic CAS         5-20 cycle
  - 함수 호출 overhead 10 cycle
  - 총 ~30 cycle ≈ 10-100 ns

Contended (waiter 있음):
  - waiter park (syscall)   1-3 µs
  - holder unlock + wake    1-3 µs
  - context switch          1-3 µs
  - 총 ~10 µs
```

Uncontended path는 lock-free 수준으로 빠릅니다. 비용은 contention에서만 발생합니다. 따라서 같은 mutex라도 contention rate에 따라 100배 이상 비용이 달라집니다.

## Linux Futex — Fast Userspace Mutex

Linux는 mutex를 futex 위에 구현합니다. Uncontended 시에는 userspace atomic만으로 끝나고, contended 시에만 kernel이 개입합니다.

```c
/* Pseudo-code */
void mutex_lock(int *m) {
    if (atomic_cmpxchg(m, 0, 1) == 0) return;   /* fast path */

    do {
        if (*m == 2 || atomic_cmpxchg(m, 1, 2) != 0)
            futex_wait(m, 2);
    } while (atomic_cmpxchg(m, 0, 2) != 0);
}

void mutex_unlock(int *m) {
    if (atomic_fetch_sub(m, 1) != 1) {
        *m = 0;
        futex_wake(m, 1);
    }
}
```

상태는 세 가지입니다. 0은 free, 1은 locked without waiter, 2는 locked with waiter입니다. Waiter가 없을 때는 syscall이 한 번도 발생하지 않으므로 uncontended path가 매우 빠릅니다.

## Adaptive Mutex — 짧으면 Spin

```c
void adaptive_mutex_lock(mutex_t *m) {
    int spins = 100;
    while (spins--) {
        if (try_lock(m)) return;
        cpu_relax();
    }
    futex_wait(...);
}
```

Linux `PTHREAD_MUTEX_ADAPTIVE_NP`와 Solaris adaptive mutex가 이 구조입니다. 짧은 contention은 spin으로 해결해 block 비용을 회피하고, 긴 hold time일 때만 sleep으로 전환합니다.

Spin 횟수는 휴리스틱이며 보통 수십에서 수백 cycle 정도입니다. 실측해서 워크로드에 맞게 조정할 수 있습니다.

## Priority Inheritance

Real-time 시스템에서 low priority task가 mutex를 보유한 상태로 medium priority task에 의해 preempt되면, high priority task가 그 mutex를 기다리는 동안 medium이 계속 실행됩니다. 이것이 priority inversion이며, 1997년 Mars Pathfinder를 멈춘 원인으로 유명합니다.

Priority inheritance는 holder의 priority를 임시로 waiter의 priority로 끌어올려 이 문제를 해결합니다.

```c
/* Take with PI */
if (lock_held_by_lower_priority_task) {
    boost_holder_priority(my_priority);
    if (holder waits on another lock) {
        propagate further;
    }
}

/* Release */
restore_priority();
```

Overhead는 다음과 같습니다.

- Chain inheritance가 발생하면 수십 µs까지 늘어날 수 있습니다
- Wait list 재정렬에 O(log N) 또는 O(N)이 필요합니다
- Holder TCB 접근으로 cache miss가 추가됩니다

ASIL-D 자동차나 항공 시스템에서는 chain depth가 유한임을 보장해야 하며, 보통 3 이하로 제한합니다.

## FreeRTOS Mutex 측정

```c
TickType_t start = xTaskGetTickCount();
xSemaphoreTake(mtx, portMAX_DELAY);
TickType_t wait = xTaskGetTickCount() - start;
```

Tick 단위 측정은 해상도가 낮으므로, 정확한 분석에는 SEGGER SystemView나 Percepio Tracealyzer를 사용합니다.

```text
Mutex_DB:
  total_acquired:   12345
  total_block_time: 1234 ms
  max_block_time:     45 µs
  blocked_count:    2345
```

`max_block_time`이 RTOS에서는 평균보다 중요합니다. Worst case가 deadline 안에 들어와야 schedulable합니다.

## Robust Mutex

```c
pthread_mutexattr_setrobust(&attr, PTHREAD_MUTEX_ROBUST);
```

Mutex를 보유한 thread가 죽으면 다음 take 시 `EOWNERDEAD`를 반환해 복구할 기회를 줍니다.

```c
int err = pthread_mutex_lock(&mtx);
if (err == EOWNERDEAD) {
    /* State 복구 */
    pthread_mutex_consistent(&mtx);
}
```

Safety-critical 시스템이나 multi-process 환경에서 한 process가 crash해도 다른 process가 정상 진행할 수 있게 해 줍니다.

## Recursive Mutex의 비용

```c
recursive_mutex_take(&m);   /* count++ — atomic 한 번 */
recursive_mutex_take(&m);   /* count++ */
recursive_mutex_give(&m);   /* count-- */
recursive_mutex_give(&m);   /* count-- → 0 → 실제 unlock */
```

매 take와 give마다 atomic 연산과 owner thread ID 비교가 추가됩니다. Non-recursive보다 살짝 비싸므로 가능하면 일반 mutex를 쓰고, 함수 구조를 재설계해 재귀를 피하는 것이 좋습니다.

## Mutex vs Semaphore — 어느 것을 쓸까

| 항목 | Mutex | Semaphore |
|---|---|---|
| Owner 개념 | 있음 | 없음 |
| Recursive | 가능 | 불가능 |
| Priority Inheritance | 지원 | 없음 |
| ISR에서 give | 금지 | 가능 |
| 의미 | mutual exclusion | counting, signaling |

Mutex는 자원 보호용입니다. 같은 thread가 take와 give를 모두 해야 하며 owner가 명확합니다. Binary semaphore는 ISR이 task에 signal을 보내는 용도로 쓰며, give와 take를 다른 context가 해도 됩니다.

## 자동차 ECU — Mutex 패턴

```c
/* Brake task — 1 ms loop, mutex는 timeout으로 짧게 */
if (xSemaphoreTake(brake_data_mtx, pdMS_TO_TICKS(1)) == pdTRUE) {
    read_data();
    xSemaphoreGive(brake_data_mtx);
} else {
    use_last_known();
}
```

Real-time loop에서는 mutex가 영원히 block되지 않도록 반드시 finite timeout을 명시합니다. Lock 획득 실패 시 fault path가 명확히 정의되어 있어야 하며, 위 예시처럼 last known good value를 쓰는 fallback이 일반적입니다.

## Apple os_unfair_lock

```c
#include <os/lock.h>
os_unfair_lock lock = OS_UNFAIR_LOCK_INIT;
os_unfair_lock_lock(&lock);
critical();
os_unfair_lock_unlock(&lock);
```

iOS와 macOS에서 권장하는 lock입니다. 매우 가벼우며 짧은 spin 후 thread를 park 합니다. Priority donation도 자동으로 처리합니다. 기존 `OSSpinLock`은 priority inversion 위험으로 deprecated 되었습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ ISR 안에서 mutex

```c
ISR: xSemaphoreTake(mtx);   /* block 가능 → fault */
```

ISR은 block될 수 없으므로 mutex 대신 binary semaphore의 `FromISR` API를 사용해야 합니다.

> ⚠️ 무한 timeout

```c
xSemaphoreTake(mtx, portMAX_DELAY);   /* deadlock 시 영원 대기 */
```

Production 코드에서는 항상 finite timeout과 fault 처리 경로를 둡니다.

> ⚠️ Nested mutex의 순서 불일치

```c
xSemaphoreTake(a);
xSemaphoreTake(b);   /* 다른 task가 a 대기 + b 보유 시 deadlock */
```

Lock ordering 규칙을 정해 모든 코드가 같은 순서로 잡도록 해야 합니다.

> ⚠️ Priority inversion 무시한 RT design

Low priority task가 mutex를 잡고 있을 때 medium이 CPU를 점유하면 high priority task가 deadline을 놓칩니다. PI mutex를 쓰고 WCET 분석을 같이 해야 합니다.

## 측정 — 실측 결과

Cortex-A53 4-core, glibc futex mutex의 결과입니다.

```text
                       Latency      비고
Uncontended lock        30 ns       atomic CAS만
Uncontended unlock      20 ns       atomic store
Contended lock          8 µs        futex_wait + switch
Contended unlock        3 µs        futex_wake
Adaptive spin success  200 ns       spin 단계에서 성공
PI inherit (depth 1)    1 µs        priority boost
PI inherit (depth 3)    4 µs        chain propagation
```

Uncontended path와 contended path가 100배 이상 차이가 납니다. Contention이 빈번한 lock은 lock-free나 striping으로 분산하는 것이 필요합니다.

## 정리

- Mutex는 block 가능한 lock이며 hold time이 길 때 spinlock보다 유리합니다.
- Linux futex는 uncontended path에서 syscall이 0이므로 매우 빠릅니다.
- Adaptive mutex는 짧은 spin 후 block으로 두 방식의 장점을 결합합니다.
- Priority inheritance는 chain overhead가 있으며 자동차 시스템에서는 depth 제한이 필요합니다.
- Mutex는 자원 보호용, semaphore는 signaling용으로 구분합니다.
- Real-time loop에서는 항상 finite timeout과 fault path를 둡니다.

다음 편은 **Reader-Writer Lock** — read-mostly 워크로드의 최적화 패턴입니다.

## 관련 항목

- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
