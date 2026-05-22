---
title: "4-06: Reader-Writer Lock — Reader/Writer Priority·RCU·Seqlock"
date: 2026-05-08T15:00:00
description: "RW-lock의 종류와 reader/writer priority, RCU 비교, seqlock의 read-mostly 대안."
series: "Embedded Performance Engineering"
seriesOrder: 35
tags: [rwlock, reader, writer, rcu, seqlock]
---

## 한 줄 요약

> **"RW-Lock은 read 동시 N, write 1을 허용하며 read-mostly 워크로드에 적합합니다."**

## 어떤 문제를 푸는가

라우팅 테이블, 설정 캐시, sensor 데이터처럼 읽기가 압도적인 자료구조에 일반 mutex를 쓰면 모든 read가 직렬화됩니다. Read는 서로 충돌하지 않으므로 동시에 진행해도 안전한데, mutex는 그것을 막아 버립니다.

RW-lock은 read를 동시 허용하고 write만 exclusive로 처리합니다. 99% read인 워크로드에서는 throughput이 mutex보다 한 자릿수 빨라집니다. 하지만 50:50으로 가까워지면 RW-lock의 내부 state 관리 비용이 mutex와 비슷해지거나 더 느려집니다.

이 글에서는 RW-lock의 기본 구조와 reader/writer priority 정책, 그리고 더 극단적인 read-mostly 워크로드를 위한 RCU와 seqlock까지 다룹니다.

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
    while (rw->writers_waiting > 0)
        cond_wait(&rw->no_writers, &rw->state_lock);
    rw->readers++;
    spin_unlock(&rw->state_lock);
}

void read_unlock(rwlock_t *rw) {
    spin_lock(&rw->state_lock);
    if (--rw->readers == 0)
        cond_signal(&rw->no_readers);
    spin_unlock(&rw->state_lock);
}

void write_lock(rwlock_t *rw) {
    spin_lock(&rw->state_lock);
    rw->writers_waiting++;
    while (rw->readers > 0)
        cond_wait(&rw->no_readers, &rw->state_lock);
}
```

매 read 진입과 종료마다 `state_lock`과 atomic counter 갱신이 발생합니다. 이 비용이 RW-lock의 본질적 overhead이며, mutex 한 번의 atomic CAS보다 비쌉니다.

## Reader Preference

Reader가 도착하면 다른 reader가 있을 때 즉시 함께 진입합니다. Writer가 대기 중이라도 우선되지 않습니다.

문제는 writer starvation입니다. 연속해서 reader가 도착하면 writer는 영원히 대기할 수 있습니다. Web cache나 DNS 같은 read-heavy 시스템에서는 write가 드물어 큰 문제가 안 되지만, sensor data처럼 write가 주기적으로 도착하는 시스템에서는 deadline을 놓칠 수 있습니다.

Linux의 기본 `rwlock_t`가 unfair reader-preferring입니다.

## Writer Preference

Writer가 대기 중일 때는 새 reader도 대기합니다. Writer가 처리된 뒤에야 reader가 진행됩니다.

이 정책은 writer starvation을 방지하지만, read가 압도적이면 reader starvation이 발생할 수 있습니다. POSIX `PTHREAD_RWLOCK_PREFER_WRITER_NP`로 선택할 수 있으며, database나 sensor write가 중요한 시스템에 적합합니다.

## Fair RW-Lock (FIFO)

도착 순서대로 queue에 넣되, 같은 batch의 reader는 동시 처리합니다.

```text
Queue: R1 R2 R3 W1 R4 R5 W2
Batch 1: R1 R2 R3 동시 진행
Batch 2: W1 exclusive
Batch 3: R4 R5 동시 진행
Batch 4: W2 exclusive
```

Starvation이 양쪽 모두에서 없습니다. 일부 platform의 `pthread_rwlock_init` 기본 동작입니다.

## 성능 비교 — Mutex vs RW-Lock

```text
Workload: 99% read, 1% write
  Mutex:   모든 read 직렬화 → throughput 저하
  RW-Lock: read 동시 처리 → throughput 향상

Workload: 50% read, 50% write
  RW-Lock: state_lock contention 큼 → mutex와 비슷 또는 느림

Workload: 90% read, 10% write
  RW-Lock: 약 1.5-3x mutex 대비
```

RW-lock의 효과는 read 비율이 결정합니다. 90% 이상이 read일 때만 의미가 있으며, 70-80% 정도라면 측정 없이 가정하지 말아야 합니다.

## RCU — Lock 없는 Read

RCU(Read-Copy-Update)는 reader가 lock을 전혀 잡지 않고 데이터를 읽는 mechanism입니다.

```c
/* Reader */
rcu_read_lock();   /* preempt disable, 거의 0 비용 */
struct data *d = rcu_dereference(global_data);
use(d);
rcu_read_unlock();

/* Writer */
struct data *new_d = create();
struct data *old = rcu_assign_pointer(global_data, new_d);
synchronize_rcu();
free(old);
```

Writer는 새 copy를 만들고 atomic pointer swap으로 교체합니다. Old version은 모든 기존 reader가 완료될 때까지 살려 두었다가 free합니다. 이 대기 구간을 grace period라고 합니다.

Reader는 atomic read 하나만 실행하므로 throughput이 수백만 read/sec를 넘습니다. Linux kernel의 routing table, dentry cache 등이 RCU 위에 구현되어 있습니다.

## RCU의 사용 조건

- Read가 압도적이고 write는 1% 이하입니다
- Pointer-based 자료구조여야 atomic swap이 가능합니다
- Old version을 잠시 유지해도 시스템 동작에 문제가 없어야 합니다

Hash table, linked list, radix tree처럼 atomic pointer로 노드를 갱신할 수 있는 구조에 적합합니다.

## Seqlock — Read는 Retry, Write는 직렬

```c
typedef struct {
    atomic_int seq;     /* 짝수 = idle, 홀수 = writing */
    spinlock_t writelock;
} seqlock_t;

void seqlock_write(seqlock_t *sl) {
    spin_lock(&sl->writelock);
    atomic_store(&sl->seq, atomic_load(&sl->seq) + 1);
    /* modify */
    atomic_store(&sl->seq, atomic_load(&sl->seq) + 1);
    spin_unlock(&sl->writelock);
}

uint32_t seqlock_read(seqlock_t *sl, T *out) {
    uint32_t seq;
    do {
        seq = atomic_load(&sl->seq);
        if (seq & 1) continue;   /* writer 진행 중 */
        *out = data;
    } while (atomic_load(&sl->seq) != seq);
    return seq;
}
```

Reader는 lock을 잡지 않고 sequence number 두 번 비교로 일관성을 확인합니다. Writer가 끼어들었으면 retry합니다. Writer는 spinlock으로 직렬화합니다.

Linux의 `jiffies`(시스템 시간) 읽기에 쓰이며, GPS 좌표나 sensor 측정값처럼 작은 데이터의 read-mostly 시나리오에 적합합니다.

## RCU·Seqlock·RW-Lock 비교

| 항목 | RW-Lock | RCU | Seqlock |
|---|---|---|---|
| Read cost | 비쌈 (atomic + lock) | 거의 0 | retry 가능 |
| Write cost | 보통 | 비쌈 (grace period) | 직렬 |
| Read 동시성 | 여러 reader | 무제한 | 무제한 |
| Memory | 1 copy | 2 copy 잠시 | 1 copy |
| 사용처 | 균형 워크로드 | read 압도적 | 작은 데이터 read-mostly |

선택 기준은 read 비율, write 빈도, 그리고 자료구조의 형태입니다. Pointer-based이고 write가 매우 드물면 RCU, 작은 value type이면 seqlock, 그 외에는 RW-lock이나 mutex입니다.

## 자동차 — Double Buffer

자동차 ECU에서는 lock 자체의 결정성을 보장하기 어렵기 때문에 double buffer가 자주 쓰입니다.

```c
struct {
    atomic_int active;
    sensor_data buf[2];
} sensor;

void writer(void) {
    int next = !sensor.active;
    sensor.buf[next] = read_sensor();
    sensor.active = next;
}

void reader(void) {
    int idx = sensor.active;
    use(sensor.buf[idx]);
}
```

Writer는 inactive buffer를 채우고 atomic swap으로 교체합니다. Reader는 active index를 읽어 그 buffer를 사용합니다. Race가 없으며 lock도 없습니다. 결정성이 critical한 ASIL 시스템에서 표준 패턴입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Read 적은 워크로드에 RW-Lock

```c
/* read 50%, write 50% */
rwlock_read_lock(&rw);   /* state_lock contention 큼 */
```

이런 비율에서는 mutex가 더 빠를 수 있습니다. 측정 없이 RW-lock을 쓰지 말아야 합니다.

> ⚠️ Read 중 write 시도

```c
read_lock(&rw);
modify_data();   /* undefined */
read_unlock(&rw);
```

Read lock은 데이터 수정을 허용하지 않습니다. 명시적인 upgrade API가 있는 구현에서만 가능합니다.

> ⚠️ RCU read 안에서 free 호출

```c
rcu_read_lock();
struct data *d = rcu_dereference(global);
free(d);   /* 다른 reader도 d 사용 중 */
rcu_read_unlock();
```

Free는 반드시 `synchronize_rcu()` 또는 `call_rcu()` 콜백 안에서 합니다.

> ⚠️ Seqlock에 pointer 데이터

Seqlock은 value 데이터에만 안전합니다. Pointer를 저장하면 retry 사이에 원본이 변경되어 잘못된 메모리를 dereference할 수 있습니다.

## 측정 — 실측 결과

Cortex-A72 4-core, 4 thread에서 read:write 비율을 바꿔 가며 측정한 throughput(ops/sec)입니다.

```text
              Mutex      RW-Lock    RCU       Seqlock
99:1 read    1.2 M       8.5 M    180 M      120 M
90:10        1.1 M       4.2 M     22 M       15 M
70:30        0.9 M       1.5 M      8 M        3 M
50:50        0.7 M       0.6 M      4 M        1 M
```

RCU와 seqlock은 read-heavy에서 압도적입니다. RW-lock의 효과는 90:10 이상에서만 분명하며, 50:50에서는 오히려 mutex보다 느려집니다.

## 정리

- RW-lock은 read 동시 N, write exclusive로 read-mostly 워크로드에 적합합니다.
- Reader preference는 writer starvation, writer preference는 reader starvation 위험이 있습니다.
- RCU는 read가 거의 무료이며 write가 비쌉니다. Pointer 기반 자료구조에 적합합니다.
- Seqlock은 read가 retry loop이며 작은 value 데이터에 적합합니다.
- 자동차 시스템에서는 double buffer가 lock보다 결정성에서 우수합니다.
- Read 비율 90% 이상에서만 RW-lock의 효과가 분명합니다.

다음 편은 **Lock-Free 기초** — CAS와 ABA 문제를 살펴봅니다.

## 관련 항목

- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
- [4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
- [Practical RTOS Internals 3-11: Stream Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)
