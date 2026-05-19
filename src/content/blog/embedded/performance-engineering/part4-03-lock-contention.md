---
title: "4-03: Lock Contention — Wait·Hold·Convoy·측정"
date: 2026-05-08T12:00:00
description: "Wait time·hold time·contention ratio. perf lock, trace point. Lock convoy 회피."
series: "Embedded Performance Engineering"
seriesOrder: 31
tags: [lock, contention, wait-time, hold-time, convoy]
draft: true
---

## 한 줄 요약

> **"Contention = 같은 lock 쟁탈"** — wait time이 throughput 결정.

## 핵심 지표

| 지표 | 의미 |
|---|---|
| **Hold time** | lock 보유 시간 |
| **Wait time** | lock 대기 시간 |
| **Acquisition rate** | 초당 lock 횟수 |
| **Contention ratio** | wait / (wait + hold) |

```text
이상적: contention < 5%
주의:    5-20%
심각:    > 20% — 재설계 필요
```

## perf lock — Linux

```bash
sudo perf lock record ./prog
sudo perf lock report

# 출력 예:
# Name                  acquired   wait_total(s)    wait_avg(s)
# spinlock_a               12345          0.234       0.000019
# mutex_b                    400          1.520       0.003800   ← 주범
```

`wait_total` 큰 lock — bottleneck. `acquired × wait_avg`로 정렬.

## ftrace lock_events

```bash
echo lock_acquire > /sys/kernel/debug/tracing/set_event
echo lock_release >>  /sys/kernel/debug/tracing/set_event
cat /sys/kernel/debug/tracing/trace_pipe
```

각 lock event timestamp — *시계열 분석*.

## FreeRTOS — Lock 통계

`configUSE_TRACE_FACILITY=1` + Tracealyzer / SystemView:

```text
Per-task:
  - blocked on which semaphore
  - total blocked time
  - max wait time
  
Per-semaphore:
  - total give count
  - max queue waiters
```

## Amdahl·Gunther — Lock 영향

```text
S = 1 / (s + (1-s) / N)

s — serial fraction (lock 보호 영역)
N — CPU 수

S(s=0.1, N=8) = 1 / (0.1 + 0.9/8) = 4.7   ← 5x near peak
S(s=0.1, N=64) = 1 / (0.1 + 0.9/64) = 8.8 ← 8.8x — saturated
```

Lock fraction 10% → CPU 64개 줘도 *9x만* 빨라짐.

## Lock Convoy

```text
Lock 풀린 직후:
  - 깨어난 task가 *queue 순서대로* lock 잡음
  - 같은 priority task들 — *FIFO 의존*
  - Lock 잡은 task가 곧 다시 lock 잡음 (loop)
  - → 같은 순서로 줄섬 — *convoy*
```

Convoy 회피:
- Lock hold time 짧게
- 일부 lock fair → unfair으로 (가장 빠른 task 먼저 — overall throughput ↑)
- Lock 더 잘게 분리

## Lock Granularity

```c
/* Coarse-grained — 1 lock 전체 보호 */
mutex_t global_lock;

mutex_take(&global_lock);
do_lots();   // 다른 thread 다 대기
mutex_give(&global_lock);

/* Fine-grained — 여러 lock */
mutex_t lock_a, lock_b, lock_c;

mutex_take(&lock_a);
work_a();
mutex_give(&lock_a);

mutex_take(&lock_b);
work_b();
mutex_give(&lock_b);
```

Fine은 *contention 분산* — 그러나 *deadlock 위험 ↑*.

## Striped Lock

```c
mutex_t locks[16];   // 16 stripes

void access(int key) {
    int idx = key % 16;
    mutex_take(&locks[idx]);
    /* access table[key] */
    mutex_give(&locks[idx]);
}
```

같은 key는 같은 lock, 다른 key는 분산. Database·hash table 흔한 패턴.

## RW-Lock으로 read 분산

```c
rwlock_t rw;

void reader(void) {
    rwlock_read_lock(&rw);   // 동시 여러 reader OK
    read_data();
    rwlock_read_unlock(&rw);
}

void writer(void) {
    rwlock_write_lock(&rw);   // exclusive
    write_data();
    rwlock_write_unlock(&rw);
}
```

Read 위주 워크로드 — read 동시성 활용.

## Lock-Free 대안

Single-producer single-consumer queue, atomic counter — lock 없이 가능.

다음 part chapter 참고.

## Hold Time 짧게

```c
/* 회피 — lock 동안 *expensive 작업* */
mutex_take(&mtx);
expensive_compute();   // 100 ms
update_var();
mutex_give(&mtx);

/* Good — 짧은 critical section */
expensive_compute();   // lock 밖
mutex_take(&mtx);
update_var();
mutex_give(&mtx);
```

`update_var()`만 lock 보호.

## Latency-sensitive Code 안 lock

```c
ISR or RT task:
mutex_take(&mtx, 0);   // try-only
if (got) {
    update();
    mutex_give(&mtx);
} else {
    log_skipped();   // 또는 deferred
}
```

Real-time task가 *block 안 됨* — 다른 task 양보.

## 자동차 — Lock Profile

```text
Brake ECU loop 1 ms:
  - measurement: 200 µs
  - control: 300 µs
  - actuator: 200 µs
  - logging: 300 µs   ← lock 잡으면 risk

→ logging은 *lock-free queue로 deferred*
```

ASIL-D — critical section *최악 case* 보장 필수.

## 자주 하는 실수

> ⚠️ Lock 안 expensive 작업

```c
mutex_take(&db_lock);
http_get(url);   // ← 수 초 가능, 다른 task 다 정지
mutex_give(&db_lock);
```

→ data 사전 fetch 후 lock 짧게.

> ⚠️ Profiling 안 함

"Lock contention 의심" — 측정 없이 추정. *perf lock 또는 trace*로 확인.

> ⚠️ 모든 read에 lock

```c
mutex_take(&cfg_lock);
int v = cfg.value;
mutex_give(&cfg_lock);
```

`int v = cfg.value;`는 atomic (32-bit aligned) — lock 불필요. RCU·atomic_load로 대체.

> ⚠️ ISR과 task에 다른 lock

```c
ISR: spinlock_take(&sl);
Task: mutex_take(&mtx);   // ← 다른 lock? 보호 안 됨
```

ISR ↔ task 동기화 → *event group·queue* 사용 (mutex 아님).

## 정리

- 핵심 지표 — **wait·hold·contention ratio**.
- **perf lock**·**ftrace**로 측정.
- Amdahl — 10% serial로도 *9x 한계*.
- **Lock convoy** — fair queueing의 부작용.
- Granularity·striping·RW-lock·lock-free로 분산.
- Hold time *짧게*가 가장 효과적.

다음 편은 **Spinlock**.

## 관련 항목

- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
