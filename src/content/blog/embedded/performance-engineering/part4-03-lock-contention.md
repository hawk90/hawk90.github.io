---
title: "Lock Contention 분석 — Wait·Hold·Convoy·측정 기법"
date: 2026-04-26T09:02:00
description: "Wait time과 hold time, contention ratio를 측정하고 lock convoy를 회피하는 법."
series: "Embedded Performance Engineering"
seriesOrder: 32
tags: [lock, contention, wait-time, hold-time, convoy]
---

## 한 줄 요약

> **"Contention은 같은 lock을 두 thread 이상이 동시에 쟁탈하는 상황이며, wait time이 throughput을 결정합니다."**

## 어떤 문제를 푸는가

멀티스레드 코드에서 lock 자체는 cycle 단위로 가볍습니다. 문제는 contention입니다. 한 thread가 lock을 쥐고 있는 동안 다른 thread들이 대기하면, 그 대기 시간이 곧 throughput 손실로 직결됩니다. CPU를 8개 늘려도 모두 같은 lock 앞에서 줄을 서면 1-core 성능과 다르지 않게 됩니다.

Contention을 줄이려면 먼저 측정이 필요합니다. "느린 것 같다"가 아니라 "어느 lock에서 평균 몇 µs 대기하고 있다"를 알아야 합니다. 그래야 lock granularity 조정, RW-lock 도입, lock-free 전환 같은 다음 결정을 할 수 있습니다.

이 글에서는 contention의 핵심 지표를 정의하고, Linux와 RTOS에서 측정하는 도구를 소개하며, lock convoy와 striping 같은 실전 패턴을 정리합니다.

## 핵심 지표

| 지표 | 의미 |
|---|---|
| **Hold time** | lock을 보유한 시간 |
| **Wait time** | lock을 얻기까지 대기한 시간 |
| **Acquisition rate** | 초당 lock 횟수 |
| **Contention ratio** | wait / (wait + hold) |

```text
이상적: contention < 5%
주의:   5-20%
심각:   > 20% — 재설계가 필요합니다
```

특히 contention ratio가 20%를 넘으면, lock 자체보다 큰 구조적 문제가 있을 가능성이 높습니다. 한 코어가 lock을 푼 순간 모든 다른 코어가 깨어나는 thundering herd 같은 패턴도 같은 증상을 만들어 냅니다.

## perf lock — Linux 측정

```bash
sudo perf lock record ./prog
sudo perf lock report

# 출력 예
# Name                  acquired   wait_total(s)    wait_avg(s)
# spinlock_a               12345          0.234       0.000019
# mutex_b                    400          1.520       0.003800
```

`wait_total`이 큰 lock이 bottleneck입니다. 위 예시에서는 `mutex_b`가 400번만 acquire되지만 누적 대기 시간이 1.52초로 전체의 대부분을 차지하므로, 이 lock을 먼저 분석해야 합니다.

`acquired × wait_avg`로 정렬하면 시스템 전체의 누적 손실을 한눈에 볼 수 있습니다.

## ftrace lock_events

`perf lock`이 통계라면 `ftrace`는 시계열입니다.

```bash
echo lock_acquire > /sys/kernel/debug/tracing/set_event
echo lock_release >> /sys/kernel/debug/tracing/set_event
cat /sys/kernel/debug/tracing/trace_pipe
```

각 lock event마다 timestamp가 찍히므로 특정 시점에 어떤 thread가 어느 lock을 잡고 있었는지 재구성할 수 있습니다. Lock convoy나 priority inversion처럼 패턴이 중요한 문제에 효과적입니다.

## FreeRTOS — Lock 통계

`configUSE_TRACE_FACILITY=1` 옵션을 켜고 Tracealyzer나 SystemView를 연결하면 per-task, per-semaphore 통계를 받을 수 있습니다.

```text
Per-task:
  - blocked on which semaphore
  - total blocked time
  - max wait time

Per-semaphore:
  - total give count
  - max queue waiters
```

RTOS에서는 max wait time이 평균보다 중요합니다. Real-time deadline은 worst case로 결정되기 때문입니다.

## Amdahl과 Gunther — Lock의 영향

병렬화의 한계를 보여 주는 Amdahl 식은 lock contention 분석에도 그대로 적용됩니다.

$$S = \frac{1}{s + \frac{1 - s}{N}}$$

여기서 $s$는 serial fraction(lock으로 보호되는 비율), $N$은 CPU 수입니다.

$$S(s=0.1, N=8) = \frac{1}{0.1 + 0.9 / 8} = 4.7, \quad S(s=0.1, N=64) = \frac{1}{0.1 + 0.9 / 64} = 8.8$$

Serial fraction이 10%만 되어도 CPU 64개를 줘도 8.8배만 빨라집니다. Gunther의 Universal Scalability Law는 contention과 coherency overhead를 추가로 모델링하므로, 실측 데이터와 더 잘 맞습니다.

## Lock Convoy

Lock이 풀린 직후 깨어난 task들이 같은 순서로 다시 줄을 서는 현상을 lock convoy라고 합니다. 같은 priority의 task들이 fair queueing 정책 아래서 자주 발생합니다.

회피 방법은 다음과 같습니다.

- Lock hold time을 짧게 유지합니다
- 일부 lock에서는 unfair 정책을 허용해 가장 빠른 task가 먼저 잡도록 합니다
- Lock을 더 잘게 분리해 동시 진입 가능성을 늘립니다

Unfair lock은 fairness를 희생하는 대신 cache locality와 throughput을 얻습니다. 같은 thread가 lock을 연속으로 잡으면 cache hit이 그대로 유지되기 때문입니다.

## Lock Granularity

```c
/* Coarse-grained — 하나의 lock으로 전체 보호 */
mutex_t global_lock;

mutex_take(&global_lock);
do_lots();
mutex_give(&global_lock);

/* Fine-grained — 여러 lock으로 분리 */
mutex_t lock_a, lock_b, lock_c;

mutex_take(&lock_a);
work_a();
mutex_give(&lock_a);

mutex_take(&lock_b);
work_b();
mutex_give(&lock_b);
```

Fine-grained는 contention을 분산하지만 deadlock 위험이 올라갑니다. 두 lock을 잡는 순서가 thread마다 다르면 즉시 데드락이 발생합니다. Lock ordering 규칙을 문서화하고 정적 분석으로 검증하는 것이 안전합니다.

## Striped Lock

Hash table이나 connection pool처럼 키로 접근하는 자료구조에서는 striped lock이 유용합니다.

```c
mutex_t locks[16];

void access(int key) {
    int idx = key % 16;
    mutex_take(&locks[idx]);
    /* access table[key] */
    mutex_give(&locks[idx]);
}
```

같은 키는 같은 lock으로 직렬화되지만, 다른 키는 16배까지 동시 처리됩니다. Java의 `ConcurrentHashMap`이 이 방식을 씁니다.

## RW-Lock으로 read 분산

```c
rwlock_t rw;

void reader(void) {
    rwlock_read_lock(&rw);
    read_data();
    rwlock_read_unlock(&rw);
}

void writer(void) {
    rwlock_write_lock(&rw);
    write_data();
    rwlock_write_unlock(&rw);
}
```

읽기가 압도적인 워크로드에서 reader 동시성을 활용할 수 있습니다. 단, write가 30%를 넘으면 RW-lock의 내부 state 관리 비용이 mutex보다 비싸지므로 효과가 줄어듭니다. 자세한 내용은 4-06 편에서 다룹니다.

## Hold Time을 짧게

```c
/* 회피 — lock 안에서 expensive 작업 */
mutex_take(&mtx);
expensive_compute();   /* 100 ms */
update_var();
mutex_give(&mtx);

/* Good — 짧은 critical section */
expensive_compute();
mutex_take(&mtx);
update_var();
mutex_give(&mtx);
```

가장 효과 큰 최적화는 lock granularity 조정도 striping도 아닌, hold time을 줄이는 것입니다. Critical section을 좁히는 것이 lock 자체를 바꾸는 것보다 항상 우선합니다.

## Latency-Sensitive 코드에서 try-lock

```c
/* ISR 또는 RT task */
if (mutex_try_take(&mtx, 0)) {
    update();
    mutex_give(&mtx);
} else {
    log_skipped();
}
```

Real-time task가 block되면 deadline을 놓치므로, try-lock으로 우회 경로를 만듭니다. 놓친 update는 다음 cycle에서 처리하거나 deferred queue로 넘깁니다.

## 자동차 — Lock Profile 예

```text
Brake ECU loop 1 ms:
  - measurement: 200 µs
  - control:     300 µs
  - actuator:    200 µs
  - logging:     300 µs   ← lock 잡으면 risk
```

ASIL-D 시스템에서는 critical section의 worst case가 보장되어야 합니다. Logging처럼 비결정적 길이의 작업은 lock-free queue로 deferred 처리해 control loop를 막지 않도록 설계합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Lock 안에서 expensive 작업

```c
mutex_take(&db_lock);
http_get(url);   /* 수 초 가능, 다른 task 모두 정지 */
mutex_give(&db_lock);
```

데이터를 미리 fetch한 뒤 lock은 짧게 잡아야 합니다.

> ⚠️ 측정 없이 추정

"Lock contention이 의심된다"고 추정만 하고 perf lock이나 trace로 확인하지 않으면, 잘못된 lock을 최적화하기 쉽습니다.

> ⚠️ 모든 read에 lock

```c
mutex_take(&cfg_lock);
int v = cfg.value;
mutex_give(&cfg_lock);
```

32-bit aligned 정수 read는 atomic합니다. `atomic_load`나 RCU로 대체하면 contention을 0으로 줄일 수 있습니다.

> ⚠️ ISR과 task에 다른 lock

```c
ISR: spinlock_take(&sl);
Task: mutex_take(&mtx);   /* 다른 lock — 보호 안 됨 */
```

ISR과 task 사이는 event group이나 queue로 동기화해야 하며, 같은 mutex를 공유하면 ISR에서 block될 수 없으므로 의미가 없습니다.

## 측정 — 실측 결과

Cortex-A72 4-core에서 같은 mutex를 100 thread가 경쟁할 때 측정한 결과입니다.

```text
Hold time   Wait avg    Wait p99    Contention ratio
  100 ns     50 ns       200 ns       33%
    1 µs    700 ns         5 µs       41%
   10 µs     30 µs       150 µs       75%
  100 µs    400 µs       2 ms         80%
```

Hold time이 10 µs를 넘기 시작하면 contention ratio가 70%를 넘어 throughput이 거의 1-core 수준이 됩니다. 측정 데이터로 hold time 1 µs를 목표선으로 잡는 근거가 됩니다.

## 정리

- Lock contention의 핵심 지표는 hold time, wait time, contention ratio입니다.
- Linux에서는 `perf lock`과 ftrace, RTOS에서는 Tracealyzer로 측정합니다.
- Amdahl 식으로 serial fraction 10%만 되어도 64-core scaling이 9배 한계입니다.
- Lock convoy는 fair queueing의 부작용이며 unfair 정책이 throughput에는 유리합니다.
- Granularity 조정, striping, RW-lock, lock-free로 contention을 분산할 수 있습니다.
- 가장 효과 큰 최적화는 hold time 자체를 줄이는 것입니다.

다음 편은 **Spinlock 성능** — busy-wait가 언제 유리한지 분석합니다.

## 관련 항목

- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
