---
title: "Lock Contention 분석 — Wait·Hold·Convoy·측정 기법"
slug: "embedded/performance-engineering/part4-03-lock-contention"
date: 2026-04-26T09:02:00
description: "Wait time과 hold time, contention ratio를 측정하고 lock convoy를 회피하는 법."
series: "Embedded Performance Engineering"
seriesOrder: 32
tags: [lock, contention, wait-time, hold-time, convoy]
topics: ["embedded"]
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
| **호출의 대기 비율** | wait / (wait + hold) |

이 비율은 같은 호출에서 정의한 wait·hold의 비교 예이며 모든 도구의 표준 contention ratio가 아닙니다. 여러 thread의 wait 합은 wall time보다 클 수 있습니다. 보편적인5/20% 임계값을 두지 않고 호출 수·누적 wait·tail·workload 전체 지연을 함께 봅니다.

## perf lock — kernel lock과 userspace mutex 구분

[Linux6.12 perf-lock 문서](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-lock.txt)의 `record/report/contention`은 kernel lock event·지원 BPF 수집 경로를 사용합니다. 임의 pthread mutex의 모든 acquire/hold를 자동 계측하는 도구가 아닙니다. Config·tracepoint·BPF·권한과 event 유무를 먼저 확인합니다.

```bash
perf lock record -- ./prog
perf lock report -k wait_total
```

미실행 조사 예입니다. `acquired`, `contended`, `avg_wait`, `wait_total` 등의 지원 field와 단위를 선택한 release의 help/report로 확인합니다. 평균이 어떤 표본을 분모로 쓰는지 모른 채 acquired × average로 누적 시간을 재구성하지 않습니다. Userspace lock은 동일한 mutex의 요청·성공·release를 직접 instrument하거나 검증된 uprobe/라이브러리 도구를 사용하고, futex slow path만의 관측과 구분합니다.

## ftrace — 이름·상태 전이·누락을 확인

Tracefs의 `available_events`와 해당 `events/.../format`을 읽습니다. Kernel6.12의 lock acquire/release와 contention begin/end는 서로 다른 관측점이며, 단순 acquire 요청 시각을 실제 소유 시작 시각으로 보지 않습니다. 한 task가 요청·성공·해제를 맞출 수 있는지, reset·lost event·recursive path를 어떻게 처리하는지 확인해야 합니다. 이 환경에서는 실제 perf/ftrace session을 실행하지 않았습니다.

## FreeRTOS — Lock 통계

Tracealyzer·SystemView 등의 integration은 kernel·recorder·trace hook·transport version에 따라 구성합니다. `configUSE_TRACE_FACILITY=1` 하나가 모든 통계를 제공한다고 가정하지 않습니다. Task block·ready·running과 lock 소유 시간을 구분하고 ISR·overflow·lost event를 기록합니다. 관측한 최대 wait가 WCET 증명은 아닙니다.

## Amdahl과 Gunther — Lock의 영향

병렬화의 한계를 보여 주는 Amdahl 식은 lock contention 분석에도 그대로 적용됩니다.

$$S = \frac{1}{s + \frac{1 - s}{N}}$$

여기서 $s$는 serial fraction(lock으로 보호되는 비율), $N$은 CPU 수입니다.

$$S(s=0.1, N=8) = \frac{1}{0.1 + 0.9 / 8} = 4.7, \quad S(s=0.1, N=64) = \frac{1}{0.1 + 0.9 / 64} = 8.8$$

Serial fraction이 10%만 되어도 CPU 64개를 줘도 8.8배만 빨라집니다. 추가 contention·coherency 비용은 별도 모델로 fit할 수 있지만 더 복잡한 식이 항상 실측에 맞는 것은 아닙니다.

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

Fine-grained는 contention을 분산하지만 deadlock 위험이 올라갑니다. 서로 반대 순서로 lock을 얻는 경로가 있으면 deadlock 가능한 실행이 생깁니다. 매번 즉시 발생한다는 뜻은 아닙니다. Lock ordering 규칙을 문서화하고 정적 분석으로 검증하는 것이 안전합니다.

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

같은 키는 같은 lock으로 직렬화되지만, 다른 키도 같은 stripe에 충돌할 수 있습니다. 현재 Java 구현을 고정16stripe라고 가정하거나16배 성능을 약속하지 않습니다. 예시의 key는 음수가 아닌 값이라는 전제가 필요합니다.

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

읽기가 압도적인 워크로드에서 reader 동시성을 활용할 수 있습니다. 전환점은 reader 비용·writer 빈도·fairness·구현에 따라 달라 보편적인 write30% 기준을 두지 않습니다. 자세한 내용은 4-06 편에서 다룹니다.

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

가장 효과 큰 최적화는 lock granularity 조정도 striping도 아닌, hold time을 줄이는 것입니다. 계산을 lock 밖으로 옮길 때 snapshot·재검증·다른 writer와의 일관성이 유지되는지 먼저 확인합니다.

## Latency-Sensitive 코드에서 try-lock

Try-lock 실패를 처리할 수 있는 task 경로에서만 우회 정책을 검토합니다. 일반 mutex를 ISR에서 호출해도 된다는 뜻은 아닙니다. ISR/task 간에는 해당 OS의 ISR-safe API·critical-section 규칙·우선순위 조건을 따릅니다. Deferred queue도 용량·overflow·deadline 실패 정책을 검증해야 하며 lock-free라는 이름만으로 안전·WCET를 보장하지 않습니다.

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

Hardware의 aligned load 가능성과 C/C++ data-race 규칙은 다릅니다. Concurrent writer가 있으면 적절한 atomic 또는 동기화가 필요하며, 여러 field의 일관성·object lifetime은 추가 계약입니다.

> ⚠️ ISR과 task에 다른 lock

```c
ISR: spinlock_take(&sl);
Task: mutex_take(&mtx);   /* 다른 lock — 보호 안 됨 */
```

ISR과 task 사이는 event group이나 queue로 동기화해야 하며, 같은 mutex를 공유하면 ISR에서 block될 수 없으므로 의미가 없습니다.

## 측정 계획과 한계

기존 A72·100thread wait/p99 표는 실제 명령·환경·raw 결과가 없어 제거했습니다. 이 장에서는 target lock benchmark를 실행하지 않았습니다. 같은 lock identity에 대한 요청·성공·release 시각, sample 누락, CPU migration·preemption, workload 결과를 함께 남겨야 합니다. 누적 wait가 큰 lock을 찾은 뒤 hold 자체가 긴지 owner가 deschedule됐는지 다른 원인을 비교합니다.

## 정리

- Lock contention의 핵심 지표는 hold time, wait time, contention ratio입니다.
- Kernel lock·userspace mutex·RTOS event의 계측 경계를 구분합니다.
- Amdahl 식으로 serial fraction 10%만 되어도 64-core scaling이 9배 한계입니다.
- Fairness 변경은 starvation·tail latency·locality의 영향을 함께 평가합니다.
- Granularity 조정, striping, RW-lock, lock-free로 contention을 분산할 수 있습니다.
- 가장 효과 큰 최적화는 hold time 자체를 줄이는 것입니다.

다음 편은 **Spinlock 성능** — busy-wait가 언제 유리한지 분석합니다.

## 관련 항목

- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
