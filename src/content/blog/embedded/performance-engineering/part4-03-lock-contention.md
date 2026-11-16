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

> **"Contention은 같은 lock을 두 thread 이상이 동시에 쟁탈하는 상황이며, wait time이 throughput을 결정합니다."** 8 vCPU에서 일을 전부 lock 안에 넣으면 thread를 8개로 늘려도 1개일 때보다 느렸습니다.

## 어떤 문제를 푸는가

멀티스레드 코드에서 lock 자체는 가볍습니다. 아래 측정에서 경쟁자가 없는 `pthread_mutex_lock`의 대기 시간 중앙값은 22 ns였습니다. 문제는 contention입니다. 한 thread가 lock을 쥐고 있는 동안 다른 thread들이 대기하면 그 대기 시간이 곧 throughput 손실입니다. 은행 창구가 하나뿐이면 손님을 여덟 명 데려와도 처리 속도는 창구 하나의 속도를 넘지 못합니다.

Contention을 줄이려면 먼저 측정이 필요합니다. "느린 것 같다"가 아니라 "어느 lock에서 평균 몇 µs 대기하는가"를 알아야 lock granularity 조정, RW-lock 도입, lock-free 전환 같은 다음 결정을 할 수 있습니다.

이 글의 숫자는 모두 `lockbench.c`를 Debian 13 arm64 게스트(QEMU 11.1.3 HVF, 8 vCPU, host Apple M2 Pro, 커널 6.12.116, GCC 14.2.0, glibc 2.41)에서 돌린 결과입니다. 조합마다 5회 돌려 중앙값을 적었고, 측정 중 같은 Mac에서 다른 작업도 돌고 있었습니다.

## 핵심 지표

| 지표 | 의미 | `lockbench`에서 재는 방법 |
|---|---|---|
| **Hold time** | lock을 보유한 시간 | 임계구역 안의 일의 양(`IN`)으로 고정 |
| **Wait time** | lock을 요청한 뒤 얻기까지의 시간 | `lock()` 앞뒤의 `clock_gettime` 차이 |
| **Acquisition rate** | 초당 lock 횟수 | 전체 연산 수 ÷ wall time |
| **Handoff 비율** | 직전 소유자와 다른 thread가 lock을 얻은 비율 | 임계구역 안에서 직전 owner와 비교 |

평균만 보면 놓치는 것이 많아서 p99 대기 시간도 같이 기록합니다. 아래에서 보듯 평균 대기가 175 µs인데 p99가 250 ns인 경우도 있었습니다.

`lockbench`는 thread마다 정해진 횟수의 연산을 하고, 연산마다 lock 밖에서 `OUT` 단위, lock 안에서 `IN` 단위의 빈 루프를 돕니다. lock은 glibc 기본 `pthread_mutex_t` 또는 직접 만든 ticket spinlock입니다.

```c title="lockbench.c (발췌)"
for (long i = 0; i < OPS; i++) {
    work(OUT);                                     /* lock 밖의 일 */
    slot_t *s = &slots[nstripe > 1 ? rand_r(&seed) % nstripe : 0];
    long t0 = now(); lock(s); waits[id * OPS + i] = now() - t0;
    s->acq++; if (s->owner != id) { s->handoff++; s->owner = id; }
    work(IN);                                      /* lock 안의 일 (hold time) */
    unlock(s);
}
```

빌드는 `gcc -O2 -pthread lockbench.c -o lockbench`, 실행은 `./lockbench mutex|ticket T STRIPES IN OUT OPS`입니다. 단일 thread에서 `IN=10000`짜리 연산이 초당 0.048백만 번 돌았으므로, 일 1단위는 이 환경에서 약 2 ns입니다.

## perf lock — kernel lock과 userspace mutex 구분

`perf lock`이 무엇을 보는지부터 확인해야 합니다. [Linux 6.12 perf-lock 문서](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-lock.txt)의 `record`/`report`/`contention`은 커널의 lock tracepoint를 읽습니다. pthread mutex는 경쟁이 없으면 커널에 들어가지 않습니다. 1 thread로 2만 번 lock/unlock한 `lockbench`를 `perf stat -e syscalls:sys_enter_futex`로 세면 futex 시스템 콜은 1번뿐이었습니다. 그래서 `perf lock`에도 직접 보이지 않습니다. 실제로 8 thread가 mutex 하나를 다투는 `lockbench`를 기록해 봤습니다.

```bash
perf lock record -o /tmp/pl.data -- ./lockbench mutex 8 1 1000 9000 20000
perf lock contention -i /tmp/pl.data
```

```text
 contended   total wait     max wait     avg wait         type   caller

       172     27.11 ms      3.06 ms    157.60 us     spinlock   do_futex+0xe8
        97     13.31 ms      3.06 ms    137.19 us     spinlock   futex_wait_setup+0x80
         1      4.92 us      4.92 us      4.92 us     spinlock   sched_balance_update_blocked_averages+0x58
```

이 실행에서 userspace mutex는 160,000번 획득됐지만, `perf lock`이 본 것은 futex 구현 안의 *커널* spinlock 경합 270번입니다. 같은 실행을 `perf stat -e syscalls:sys_enter_futex,context-switches`로 세면 futex 시스템 콜 184,907번, context switch 72,670번이었습니다. 즉 `perf lock`은 "어느 pthread mutex가 뜨거운가"가 아니라 "futex 경로가 커널 안에서 얼마나 부딪혔는가"를 알려 줍니다. 어느 userspace lock인지는 `lockbench`처럼 직접 계측하거나 uprobe로 붙여야 합니다.

Debian의 perf 6.12.117은 BPF skeleton 없이 빌드되어 있어서 `perf lock contention -b`는 `switch 'b' is not available because no BUILD_BPF_SKEL=1`로 거부됐습니다. 위 출력은 tracepoint 기록(`record`) 방식입니다.

## ftrace — 이름·상태 전이·누락을 확인

`perf lock`이 읽는 tracepoint는 tracefs에서 바로 볼 수 있습니다. 이 게스트의 `/sys/kernel/tracing/events/lock/`에는 `contention_begin`과 `contention_end`만 있었습니다.

```text
name: contention_begin
ID: 286
format:
	field:void * lock_addr;	offset:8;	size:8;	signed:0;
	field:unsigned int flags;	offset:16;	size:4;	signed:0;

print fmt: "%p (flags=%s)", REC->lock_addr, __print_flags(REC->flags, "|", { (1U << 0), "SPIN" }, { (1U << 1), "READ" }, { (1U << 2), "WRITE" }, { (1U << 3), "RT" }, { (1U << 4), "PERCPU" }, { (1U << 5), "MUTEX" } )
```

(공통 필드 4줄은 줄였습니다.) `lock_acquire`·`lock_release`가 없는 이유는 v6.12 `include/trace/events/lock.h`에서 이 이벤트들이 `#ifdef CONFIG_LOCKDEP` 안에 있고, `lock_contended`·`lock_acquired`는 다시 `CONFIG_LOCK_STAT` 안에 있기 때문입니다. Debian 배포 커널은 lockdep을 켜지 않으므로, 배포 커널에서 쓸 수 있는 것은 *경합이 시작되고 끝난 시점*뿐입니다. 경합 없이 바로 얻은 획득과 hold time은 이 tracepoint로 알 수 없습니다.

## FreeRTOS — Lock 통계

FreeRTOS에서는 trace 매크로가 같은 역할을 합니다. FreeRTOS-Kernel(V11.1.0+, commit `ca759444`) 기준으로 `xSemaphoreTake()`는 `semphr.h:298`에서 `xQueueSemaphoreTake()`로 바뀌고, 이 함수는 상황마다 다른 매크로를 부릅니다.

| 상황 | 호출되는 매크로 | 위치 (`queue.c`) |
|---|---|---|
| 바로 획득 | `traceQUEUE_RECEIVE(pxQueue)` | 1698행 |
| 기다려야 해서 block 직전 | `traceBLOCKING_ON_QUEUE_RECEIVE(pxQueue)` | 1787행 |
| timeout으로 실패 | `traceQUEUE_RECEIVE_FAILED(pxQueue)` | 1751·1870행 |

`include/FreeRTOS.h`는 이 매크로들을 기본으로 빈 정의로 둡니다(797행 `traceQUEUE_RECEIVE` 등). 그래서 `configUSE_TRACE_FACILITY=1`만 켜서는 lock 대기 통계가 생기지 않고, Tracealyzer·SystemView 같은 recorder가 이 매크로를 정의해야 합니다. 비재귀 mutex의 take에는 `traceTAKE_MUTEX` 같은 전용 매크로가 없고 queue 매크로를 공유한다는 점도 recorder 설정에서 놓치기 쉽습니다(전용 매크로는 `traceTAKE_MUTEX_RECURSIVE`처럼 재귀 mutex용만 있습니다). 이 글에서는 FreeRTOS 타깃을 실행하지 않았고, 위 내용은 소스만 근거로 합니다.

## Amdahl과 Gunther — Lock의 영향

병렬화의 한계를 보여 주는 Amdahl 식은 lock contention 분석에도 적용됩니다.

$$S = \frac{1}{s + \frac{1 - s}{N}}$$

여기서 $s$는 serial fraction(lock으로 보호되는 비율), $N$은 CPU 수입니다.

$$S(s=0.1, N=8) = \frac{1}{0.1 + 0.9 / 8} = 4.7, \quad S(s=0.1, N=64) = \frac{1}{0.1 + 0.9 / 64} = 8.8$$

Amdahl 식은 lock 자체의 비용을 0으로 봅니다. 실제로는 얼마나 맞는지 `IN=1000`, `OUT=9000`(s = 0.1)으로 재 봤습니다.

| T | Mops/s (중앙값) | 측정 speedup | Amdahl 예측 | 평균 wait | p99 wait |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.048 | 1.00 | 1.00 | 22 ns | 42 ns |
| 2 | 0.078 | 1.63 | 1.82 | 1.9 µs | 34.8 µs |
| 4 | 0.076 | 1.58 | 3.08 | 14.1 µs | 247 µs |
| 8 | 0.117 | 2.44 | 4.71 | 31.8 µs | 410 µs |

측정값은 모든 T에서 Amdahl 예측보다 낮았고, 8 thread에서는 예측의 절반 수준이었습니다. 차이는 Amdahl이 빼 놓은 비용에서 옵니다. 앞 절의 `perf stat`이 보여 준 futex 시스템 콜 18만 번과 context switch 7만 번이 그 비용입니다. T=2의 5회 범위가 0.024~0.089 Mops/s로 넓었다는 점도 적어 둡니다. 게스트 vCPU가 host에서 다른 작업과 CPU를 나눠 쓰기 때문입니다.

Gunther의 Universal Scalability Law처럼 contention·coherency 항을 더한 모델도 있지만, 이 글에서는 fit하지 않았습니다. 대신 [6-03 Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)에서 다룹니다.

## Lock Convoy

lock이 풀린 순간 누가 다음 주인이 되는지는 구현이 정합니다. 엘리베이터 문 앞에 줄을 서는 방식(FIFO)과 문이 열리면 가장 가까운 사람이 타는 방식이 다른 것과 같습니다. `lockbench`의 handoff 비율로 두 방식을 비교했습니다(4 thread, `IN=100`, `OUT=100`).

| Lock | Mops/s | handoff 비율 | p99 wait |
|---|---:|---:|---:|
| glibc `pthread_mutex_t` (기본 type) | 1.230 | 0.318 | 42.8 µs |
| ticket spinlock (FIFO) | 1.913 | 0.998 | 1.96 µs |

ticket lock은 정의상 번호표 순서대로 넘기므로 handoff가 거의 1이었습니다. glibc mutex는 68% 정도를 직전 소유자가 다시 가져갔습니다. 이 조합에서는 공정한 ticket lock이 throughput도 1.56배 높고 p99도 훨씬 짧았습니다. 다만 ticket lock은 기다리는 동안 CPU를 계속 쓰는 spinlock이고 mutex는 futex로 잠들 수 있어서, 차이가 "공정성" 하나에서만 온 것은 아닙니다. spin과 sleep의 비교는 [4-04 Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)에서 다룹니다.

불공정성이 극단으로 가면 starvation이 됩니다. 일을 전부 lock 안에 넣은 경우(`IN=10000`, `OUT=0`)를 8 thread로 돌렸습니다.

| T | Mops/s | handoff 비율 | 평균 wait | p99 wait |
|---:|---:|---:|---:|---:|
| 1 | 0.048 | 0.000 | 20 ns | 42 ns |
| 8 | 0.036 | 0.007 | 175 µs | 250 ns |

8 thread가 1 thread보다 25% 느렸습니다. handoff가 0.7%라는 것은 거의 항상 방금 unlock한 thread가 다시 lock을 잡았다는 뜻입니다. 그래서 획득의 99%는 대기 250 ns 이내로 끝났지만, 나머지 1%가 평균을 175 µs로 끌어올렸습니다. 평균과 p99가 정반대 이야기를 할 때는 분포 전체를 봐야 합니다.

## Lock Granularity

lock 하나로 모든 것을 보호하면 단순하지만, 서로 관계없는 작업까지 한 줄로 세웁니다.

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

Fine-grained는 contention을 분산하지만, 두 경로가 서로 반대 순서로 lock 두 개를 잡으면 deadlock 가능한 실행이 생깁니다. 매번 발생하지는 않으므로 테스트로 잡기 어렵습니다. lock 순서 규칙을 문서로 정하고, Helgrind의 잠금 순서 검사처럼 순서 역전을 보고하는 도구로 확인합니다.

## Striped Lock

Hash table이나 connection pool처럼 키로 접근하는 자료구조에서는 lock을 여러 개 두고 키로 고르는 striped lock이 유용합니다.

```c
mutex_t locks[16];

void access(unsigned key) {
    unsigned idx = key % 16;
    mutex_take(&locks[idx]);
    /* access table[key] */
    mutex_give(&locks[idx]);
}
```

`lockbench`의 `STRIPES` 인자가 이 구조입니다. 8 thread, `IN=1000`, `OUT=1000`에서 stripe 수만 바꿨습니다.

| Stripe 수 | Mops/s | 평균 wait | p99 wait |
|---:|---:|---:|---:|
| 1 | 0.152 | 37.3 µs | 376 µs |
| 16 | 0.605 | 5.5 µs | 131 µs |

stripe를 16개로 나누자 throughput이 3.98배가 됐습니다. 16배가 되지 않는 것은 thread가 8개뿐이고, 무작위 키가 같은 stripe에 몰리는 경우가 있기 때문입니다. `slot_t`에 padding을 넣어 stripe끼리 다른 cache line에 두었다는 점도 중요합니다. lock 배열이 한 line에 붙어 있으면 [4-02](/blog/embedded/performance-engineering/part4-02-false-sharing)의 false sharing이 다시 생깁니다.

## RW-Lock으로 read 분산

읽기가 대부분인 데이터라면 reader끼리는 동시에 들어가게 하는 RW-lock을 쓸 수 있습니다.

```c
pthread_rwlock_t rw = PTHREAD_RWLOCK_INITIALIZER;

void reader(void) {
    pthread_rwlock_rdlock(&rw);
    read_data();
    pthread_rwlock_unlock(&rw);
}

void writer(void) {
    pthread_rwlock_wrlock(&rw);
    write_data();
    pthread_rwlock_unlock(&rw);
}
```

어느 write 비율에서 mutex보다 나빠지는지는 reader 임계구역 길이, writer 빈도, 구현의 reader/writer 우선 정책에 따라 달라서 이 글에서는 고정 기준을 두지 않습니다. [4-06 RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)에서 직접 비교합니다.

## Hold Time을 짧게

같은 양의 일을 lock 안에 둘지 밖에 둘지만 바꿔도 결과가 크게 달라집니다.

```c
/* 회피 — lock 안에서 expensive 작업 */
mutex_take(&mtx);
expensive_compute();
update_var();
mutex_give(&mtx);

/* Good — 짧은 critical section */
expensive_compute();
mutex_take(&mtx);
update_var();
mutex_give(&mtx);
```

`lockbench`에서 연산당 일의 총량을 10,000단위로 같게 두고, 전부 안(`IN=10000, OUT=0`)과 10%만 안(`IN=1000, OUT=9000`)을 8 thread로 비교했습니다.

| 배치 | 8 thread Mops/s | 1 thread 대비 |
|---|---:|---:|
| 전부 lock 안 | 0.036 | 0.75배 |
| 10%만 lock 안 | 0.117 | 2.44배 |

hold time을 줄인 것만으로 3.25배가 됐습니다. 계산을 lock 밖으로 옮길 때는 그 계산이 읽는 데이터가 lock 없이 읽어도 되는지, 결과를 쓸 때 다른 writer가 먼저 값을 바꾸지 않았는지 다시 확인해야 합니다.

## Latency-Sensitive 코드에서 try-lock

`pthread_mutex_trylock()`처럼 즉시 실패를 돌려주는 API는 "못 잡으면 다른 일을 하거나 나중에 다시 시도"할 수 있는 task 경로에서 씁니다. FreeRTOS에서는 `xSemaphoreTake(m, 0)`이 같은 역할입니다. 반대로 ISR에서는 mutex를 쓰지 않습니다. FreeRTOS `semphr.h`의 `xSemaphoreCreateMutex()` 설명(703행)은 "Mutex type semaphores cannot be used from within interrupt service routines"라고 적습니다. ISR에서 task로 데이터를 넘길 때는 `xQueueSendFromISR()` 같은 `FromISR` API를 씁니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Lock 안에서 expensive 작업

```c
mutex_take(&db_lock);
http_get(url);   /* 네트워크 대기 동안 다른 task 모두 대기 */
mutex_give(&db_lock);
```

데이터를 미리 가져온 뒤 lock은 갱신 순간에만 잡습니다. 위 hold time 표의 0.75배가 이 패턴의 결과입니다.

> ⚠️ 측정 없이 추정

"lock contention이 의심된다"고만 하고 재지 않으면 엉뚱한 lock을 고치기 쉽습니다. 특히 `perf lock` 결과를 pthread mutex 통계로 읽는 실수가 흔합니다. 위 실행처럼 `perf lock`에 나온 것은 `do_futex`의 커널 spinlock이었습니다.

> ⚠️ 모든 read에 lock

```c
mutex_take(&cfg_lock);
int v = cfg.value;
mutex_give(&cfg_lock);
```

값 하나를 읽으려고 lock을 잡는 대신 `cfg.value`를 `atomic_int`로 바꾸고 release/acquire로 읽을 수 있습니다. 하드웨어에서 정렬된 load가 원자적이라는 사실과 C 표준의 data race 규칙은 별개이므로, 일반 `int`를 lock 없이 읽는 것은 writer가 있는 한 data race입니다. 여러 field를 한꺼번에 일관되게 읽어야 한다면 여전히 lock이나 seqlock([4-06](/blog/embedded/performance-engineering/part4-06-rw-lock))이 필요합니다.

> ⚠️ ISR과 task에 다른 lock

```c
/* ISR */
spinlock_take(&sl);
/* Task */
mutex_take(&mtx);   /* 다른 lock이라 서로를 배제하지 못함 */
```

두 쪽이 다른 lock을 잡으면 서로를 막지 못합니다. ISR과 task 사이는 queue 같은 `FromISR` API로 넘기거나, 단일 코어라면 task 쪽에서 `taskENTER_CRITICAL()`로 인터럽트를 막고 접근합니다.

## 측정 계획과 한계

이 글의 측정은 모두 한 게스트, 한 lock 구현(glibc 2.41 기본 mutex와 직접 만든 ticket lock)에서 나왔습니다. 게스트 vCPU는 host의 스케줄링을 받으므로 lock owner가 host에서 선점되면 대기가 길어집니다. `perf lock`의 `max wait 3.06 ms` 같은 값에는 이 영향이 섞여 있을 수 있습니다. 실제 타깃에서 같은 판단을 하려면 같은 lock identity의 요청·획득·해제 시각을 직접 남기고, 평균과 p99를 함께 보고, CPU migration·preemption 여부를 같이 기록합니다.

## 정리

- 경쟁 없는 mutex 대기는 22 ns였지만, 8 thread가 하나를 다투자 평균 31.8 µs, p99 410 µs가 됐습니다.
- `perf lock`은 커널 lock tracepoint를 읽습니다. pthread mutex 경합은 `do_futex`의 커널 spinlock 경합으로만 보였습니다.
- 배포 커널(lockdep 없음)에서 쓸 수 있는 lock tracepoint는 `contention_begin`/`contention_end`뿐입니다.
- s = 0.1에서 측정 speedup은 Amdahl 예측보다 낮았습니다(8 thread 2.44배 대 4.71배). futex 비용이 차이를 만듭니다.
- glibc mutex는 직전 소유자가 다시 잡는 경우가 많았고(handoff 0.318), 일을 전부 lock 안에 두면 8 thread가 1 thread보다 느렸습니다.
- stripe 16개로 throughput 3.98배, hold time을 10%로 줄여 3.25배를 얻었습니다.

다음 편은 **Spinlock 성능** — busy-wait가 언제 유리한지 분석합니다.

## 관련 항목

- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
