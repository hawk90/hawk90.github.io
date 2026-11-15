---
title: "Mutex 성능 분석 — Futex·Adaptive·Priority Inheritance"
slug: "embedded/performance-engineering/part4-05-mutex"
date: 2026-04-26T09:04:00
description: "Mutex blocking 비용과 Linux futex 2-stage, adaptive mutex, priority inheritance overhead."
series: "Embedded Performance Engineering"
seriesOrder: 34
tags: [mutex, blocking, futex, adaptive, priority-inheritance]
topics: ["embedded"]
---

## 한 줄 요약

> **"Mutex는 block 가능한 lock이며, hold time이 길수록 spinlock보다 유리합니다."**

## 어떤 문제를 푸는가

Spinlock은 짧은 critical section에 적합하지만 hold time이 µs 단위를 넘기 시작하면 CPU 낭비가 시스템 전체 throughput을 깎습니다. Mutex는 lock을 얻지 못한 thread를 sleep 시키고 holder가 unlock할 때 wake up 시키므로, 다른 thread가 그 CPU를 쓸 수 있습니다.

문제는 sleep과 wake가 공짜가 아니라는 점입니다. 한 번의 context switch가 1-5 µs, wake up까지 합치면 10 µs 가까이 들기도 합니다. 이 비용을 어떻게 줄이느냐가 modern mutex 구현의 핵심입니다.

이 글에서는 Linux futex의 2-stage 구조, adaptive mutex가 spin과 block을 어떻게 결합하는지, 그리고 priority inheritance가 real-time 시스템에서 어떤 overhead를 만드는지 살펴봅니다.

## Mutex 비용 분해

| 경로 | 보통 관찰할 동작 | 비용을 바꾸는 요인 |
|------|------------------|-------------------|
| Uncontended (waiter 없음) | userspace atomic fast path | mutex 구현, CPU, compiler |
| Contended (waiter 있음) | park/wake 및 scheduler 개입 가능 | scheduler, runnable task, affinity, load |

Uncontended path에서 syscall이 생략되는 구현이 많지만, 정확한 instruction 수와 latency는 platform과 library에 따라 다릅니다. Contention은 대기와 scheduling 비용을 추가할 수 있으므로 target에서 경로별로 측정합니다.

## Linux Futex — Fast Userspace Mutex

Linux는 mutex를 futex 위에 구현합니다. Uncontended 시에는 userspace atomic만으로 끝나고, contended 시에만 kernel이 개입합니다.

Linux의 futex는 userspace word와 kernel wait/wake operation을 결합하는 primitive입니다. 실제 pthread mutex 구현은 glibc 및 mutex 종류에 따라 달라집니다 ([`futex(2)` 매뉴얼](https://man7.org/linux/man-pages/man2/futex.2.html)).

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

Priority inheritance는 holder의 priority와 대기열을 갱신하므로 구현과 lock chain에 따라 추가 비용이 생깁니다. 고정된 최대 비용이나 공통 chain-depth 한계는 여기서 가정하지 않습니다. 실시간 시스템에서는 대상 RTOS의 PI 프로토콜과 최대 동시 lock chain을 확인하고, 그 조건을 응답시간 분석에 포함해야 합니다.

## FreeRTOS Mutex 측정

```c
TickType_t start = xTaskGetTickCount();
xSemaphoreTake(mtx, portMAX_DELAY);
TickType_t wait = xTaskGetTickCount() - start;
```

Tick 단위 측정은 해상도가 낮으므로, 정확한 분석에는 SEGGER SystemView나 Percepio Tracealyzer를 사용합니다.

```text
Mutex_DB (일관성을 보이는 예시 데이터):
  total_acquired:   12345
  total_block_time: 12.34 ms
  max_block_time:     45 µs
  blocked_count:    2345
```

이 값은 실제 측정 결과가 아닙니다. `max_block_time × blocked_count`가 total보다 크므로 합계 조건과 양립할 수 있는 예시값입니다.

`max_block_time`은 RTOS에서 평균과 별도로 봐야 합니다. 관측한 최댓값도 workload와 측정 구간에 한정되므로, worst-case schedulability 증명과 같지는 않습니다.

## Robust Mutex

```c
pthread_mutexattr_setrobust(&attr, PTHREAD_MUTEX_ROBUST);
```

공유 프로세스 사이에서 쓰려면 robust 설정과 별도로 `pthread_mutexattr_setpshared(&attr, PTHREAD_PROCESS_SHARED)`도 설정해야 합니다. 기본 process-private mutex는 다른 프로세스와 공유할 수 없습니다 ([`pthread_mutexattr_setpshared(3)`](https://man7.org/linux/man-pages/man3/pthread_mutexattr_setpshared.3.html)).

이 속성은 robust mutex를 만들기 위한 일부 설정이며 실제 mutex 생성까지는 생략한 개요입니다. Robust mutex의 owner가 종료되면 다음 `pthread_mutex_lock()`은 lock을 획득하면서 `EOWNERDEAD`를 반환합니다. 보호 상태를 복구한 뒤 `pthread_mutex_consistent()`를 호출해야 합니다 ([robust mutex 매뉴얼](https://man7.org/linux/man-pages/man3/pthread_mutexattr_setrobust.3.html), [`pthread_mutex_consistent(3)`](https://man7.org/linux/man-pages/man3/pthread_mutex_consistent.3.html)).

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

## 측정 — 기록해야 할 항목

아래 값은 결과 보고서에서 기록할 항목의 예시이며, 특정 Cortex-A53/glibc 시스템의 측정값이 아닙니다. Uncontended 경로와 contention 경로를 분리하고 CPU, OS/libc, mutex 종류, thread 수, 반복 횟수, 분포를 함께 기록해야 비교할 수 있습니다.

| 경로 | 측정할 항목 | 함께 기록할 조건 |
|------|-------------|----------------|
| Uncontended lock/unlock | latency 분포 | CPU, OS/libc, mutex 종류, compiler |
| Contended lock/unlock | waiter 대기와 wake latency | thread 수, affinity, critical-section 시간 |
| Adaptive mutex | spin 성공 비율과 park 횟수 | 구현별 정책과 관측 도구 |
| PI mutex | boost/chain 구간의 latency | RT 정책, priority, lock-chain 길이 |

일반적으로 contention은 추가 대기와 scheduler 개입을 만들 수 있지만, 그 크기는 구현과 부하에 따라 달라집니다. 수치 없이 lock-free나 striping이 더 낫다고 결론내리지 말고 대표 workload에서 비교합니다.

## 정리

- Mutex는 block 가능한 lock이며 hold time이 길 때 spinlock보다 유리합니다.
- Linux futex는 uncontended path에서 syscall이 0이므로 매우 빠릅니다.
- Adaptive mutex는 짧은 spin 후 block으로 두 방식의 장점을 결합합니다.
- Priority inheritance 비용은 구현과 lock chain에 따라 달라지므로 대상 RTOS 설정과 응답시간 분석으로 확인합니다.
- Mutex는 자원 보호용, semaphore는 signaling용으로 구분합니다.
- Real-time loop에서는 항상 finite timeout과 fault path를 둡니다.

다음 편은 **Reader-Writer Lock** — read-mostly 워크로드의 최적화 패턴입니다.

## 관련 항목

- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
