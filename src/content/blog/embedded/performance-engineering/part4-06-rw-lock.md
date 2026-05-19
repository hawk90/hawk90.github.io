---
title: "4-06: Reader-Writer Lock — Reader/Writer Priority·RCU·Seqlock"
date: 2026-05-08T15:00:00
description: "RW-lock 종류. Reader/Writer priority. RCU 비교. Seqlock — read-mostly의 다른 답."
series: "Embedded Performance Engineering"
seriesOrder: 34
tags: [rwlock, reader, writer, rcu, seqlock]
draft: true
---

## 한 줄 요약

> **"RW-Lock = Read 동시 N, Write 1"** — read-mostly 워크로드에 적합.

## 기본 구조

```c
typedef struct {
    atomic_int readers;
    atomic_int writers_waiting;
    spinlock_t state_lock;
    cond_var_t no_readers, no_writers;
} rwlock_t;

void read_lock(rwlock_t *rw) {
    spin_lock(&rw->state_lock);
    while (rw->writers_waiting > 0) cond_wait(&rw->no_writers, &rw->state_lock);
    rw->readers++;
    spin_unlock(&rw->state_lock);
}

void read_unlock(rwlock_t *rw) {
    spin_lock(&rw->state_lock);
    if (--rw->readers == 0) cond_signal(&rw->no_readers);
    spin_unlock(&rw->state_lock);
}

void write_lock(rwlock_t *rw) {
    spin_lock(&rw->state_lock);
    rw->writers_waiting++;
    while (rw->readers > 0) cond_wait(&rw->no_readers, &rw->state_lock);
    /* state_lock 보유 — exclusive write */
}

void write_unlock(rwlock_t *rw) {
    rw->writers_waiting--;
    cond_signal(&rw->no_writers);
    spin_unlock(&rw->state_lock);
}
```

## Reader Priority

```text
Reader 도착 시 → 즉시 lock (다른 reader 있으면 같이)
Writer 도착 → reader 모두 끝날 때까지 대기

문제 — *writer starvation*. 연속 reader가 새 reader 끼어들 때마다 writer 영원 대기.
```

Linux 기본 `rwlock_t` — *unfair reader-preferring*. Web cache·DNS 같이 *write 드문* 시 OK.

## Writer Priority

```text
Reader 도착 + writer 대기 중 → reader 대기
Writer 끝나면 reader 진행

문제 — read-heavy일 때 *reader starvation*도 가능.
```

POSIX `PTHREAD_RWLOCK_PREFER_WRITER_NP`. Database 같이 *write가 중요한* 시.

## Fair RW-Lock (FIFO)

```text
도착 순서대로 queue
  - Reader: 같은 batch의 reader 동시 처리
  - Writer: exclusive
```

`pthread_rwlock_init` default 일부 platform. Linux는 *preferring writer fair* 옵션 있음.

## 성능 비교 — Mutex vs RW-Lock

```text
Workload: 99% read, 1% write
  Mutex:   매 read도 serialized → throughput ↓
  RW-Lock: read 병행 → throughput ↑↑

Workload: 50% read, 50% write
  RW-Lock state_lock contention 큼 → mutex와 비슷 또는 *느림*
```

RW-Lock은 *read 압도적*일 때만 의미.

## RCU (Read-Copy-Update) — Lock 없는 read

```c
/* Reader */
rcu_read_lock();   /* 거의 0 비용 — preempt disable 또는 no-op */
struct data *d = rcu_dereference(global_data);
use(d);
rcu_read_unlock();

/* Writer */
struct data *new_d = create();
struct data *old = rcu_assign_pointer(global_data, new_d);
synchronize_rcu();   /* 모든 reader 완료 대기 */
free(old);
```

Reader — *lock 없음*, atomic read만.
Writer — 새 copy 만들고 atomic 포인터 swap, 옛 reader 끝나면 free.

Linux kernel 핵심 mechanism — *수 백만 read/sec* 가능.

## RCU 사용 조건

- **Read 압도적** (write 1% 이하)
- **Pointer-based structure** (linked list·tree)
- **Old version 잠시 유지 OK** (writer가 *grace period* 대기)

Hash table·routing table 등에 흔히 사용.

## Seqlock — Read는 lock-free, Write는 직렬

```c
typedef struct {
    atomic_int seq;   /* 짝수 = idle, 홀수 = writing */
    spinlock_t writelock;
} seqlock_t;

void seqlock_write(seqlock_t *sl) {
    spin_lock(&sl->writelock);
    atomic_store(&sl->seq, atomic_load(&sl->seq) + 1);   /* 홀수 */
    /* modify */
    atomic_store(&sl->seq, atomic_load(&sl->seq) + 1);   /* 짝수 */
    spin_unlock(&sl->writelock);
}

uint32_t seqlock_read(seqlock_t *sl, uint32_t *out) {
    uint32_t seq;
    do {
        seq = atomic_load(&sl->seq);
        if (seq & 1) continue;   /* writer 진행 중 */
        *out = data;
        /* 다시 seq 확인 — 변경됐으면 retry */
    } while (atomic_load(&sl->seq) != seq);
    return seq;
}
```

Reader — *lock 없음*, *seq 일치하면 OK*. Writer는 직렬화.

Linux `jiffies` (시간), GPS·sensor data 등 *작은 데이터 + read-heavy*에 적합.

## RCU·Seqlock vs RW-Lock 정리

| 항목 | RW-Lock | RCU | Seqlock |
|---|---|---|---|
| Read cost | 비쌈 (atomic·lock) | 거의 0 | retry 가능 |
| Write cost | 보통 | 비쌈 (grace period) | 직렬 |
| Read 동시성 | 여러 reader | 무제한 | 무제한 |
| Memory | 1 copy | 2 copy 잠시 | 1 copy |
| 사용처 | 균형 | read 압도적 | 작은 데이터 read-mostly |

## STM·UM·HLE — Hardware Transactional

Intel TSX — `xbegin`/`xend`로 *speculative critical section*. 충돌 없으면 lock 없이 진행, 충돌 시 abort.

ARM TME — 일부 Cortex-X (v9.2+) 지원. 일반 임베디드 미지원.

## 자동차·항공 — RW-Lock

```text
센서 데이터 — 다수 task read (control loop·logging·telemetry)
                 1 task write (sensor driver)
```

→ RW-Lock 또는 *double buffer*:

```c
struct {
    atomic_int active;
    sensor_data buf[2];
} sensor;

void writer(void) {
    int next = !sensor.active;
    sensor.buf[next] = read_sensor();
    sensor.active = next;   /* atomic swap */
}

void reader(void) {
    int idx = sensor.active;
    use(sensor.buf[idx]);
}
```

Race-free, lock 없음. *결정성*.

## 자주 하는 실수

> ⚠️ Read 적은 워크로드에 RW-Lock

```c
/* read 50%, write 50% */
rwlock_read_lock(&rw);   /* state_lock contention 큼 */
```

→ mutex가 더 빠를 수.

> ⚠️ Read 중 write 시도

```c
read_lock(&rw);
modify_data();   /* ← undefined! */
read_unlock(&rw);
```

→ upgrade API 명시.

> ⚠️ RCU read 안 free 호출

```c
rcu_read_lock();
struct data *d = rcu_dereference(global);
free(d);   /* ✗ — 다른 reader도 d 사용 중일 수 */
rcu_read_unlock();
```

→ `synchronize_rcu()` 후 free.

> ⚠️ Seqlock에 pointer

```c
seqlock_t sl;
struct big *ptr;

writer: ptr = new;   /* race 가능 — seq 검사 사이 ptr 변경 */
```

Seqlock은 *value type 데이터*에만 안전 (pointer 포함 시 retry-safe).

## 정리

- RW-Lock — **read 동시, write exclusive**.
- Reader priority (default Linux) — writer starvation 가능.
- Writer priority — read-heavy 시 reader starvation 가능.
- **RCU** — read 거의 무료, write 비쌈, read-mostly.
- **Seqlock** — read는 retry-loop, write 직렬.
- 자동차 — *double buffer*가 *결정성*에서 우수.

다음 편은 **Lock-Free**.

## 관련 항목

- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
- [4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
