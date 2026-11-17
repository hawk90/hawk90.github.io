---
title: "Reader-Writer Lock 성능 — Reader/Writer Priority·RCU·Seqlock"
slug: "embedded/performance-engineering/part4-06-rw-lock"
date: 2026-04-26T09:05:00
description: "RW-lock의 종류와 reader/writer priority, RCU 비교, seqlock의 read-mostly 대안."
series: "Embedded Performance Engineering"
seriesOrder: 35
tags: [rwlock, reader, writer, rcu, seqlock]
topics: ["embedded"]
---

## 한 줄 요약

> **"RW-Lock은 read 동시 N, write 1을 허용하지만, read 구간이 짧으면 reader 카운터 자체가 병목이 되어 mutex보다 느려집니다."**

## 어떤 문제를 푸는가

라우팅 테이블, 설정 캐시, sensor 데이터처럼 읽기가 압도적인 자료구조에 일반 mutex를 쓰면 모든 read가 직렬화됩니다. Read는 서로 충돌하지 않으므로 동시에 진행해도 안전한데, mutex는 그것을 막아 버립니다. 도서관 열람실에 비유하면 mutex는 "한 번에 한 명만 입장"이고, RW-lock은 "열람은 여럿이, 책 교체 작업 중에만 출입 금지"입니다.

그런데 RW-lock도 공짜가 아닙니다. 열람실 입구에 출입 명부(reader 카운터)가 하나뿐이라면, 사람이 짧게 자주 드나들수록 명부 앞에 줄이 섭니다. 이 글은 그 비용을 실제로 재고, read 구간 길이와 read 비율에 따라 mutex, `pthread_rwlock_t`, seqlock, userspace RCU의 순위가 어떻게 뒤바뀌는지 보여 줍니다.

이 글의 측정은 모두 같은 환경입니다. Apple M2 Pro 위의 QEMU 11.1.3(`-accel hvf -cpu host`, vCPU 4개, 3 GiB) Debian 13 arm64 guest, kernel 6.12.116, gcc 14.2.0 `-O2`, glibc 2.41, liburcu 0.15.2입니다. 호스트는 다른 작업과 공유했고 측정 중 load average가 20~30이었으므로, 값은 5회 실행의 중앙값과 범위로 적습니다.

## 기본 구조

RW-lock이 왜 짧은 구간에서 느린지는 구현을 보면 바로 보입니다. glibc 2.41의 [`nptl/pthread_rwlock_common.c`](https://sourceware.org/git/?p=glibc.git;a=blob;f=nptl/pthread_rwlock_common.c;hb=refs/tags/glibc-2.41)에서 read lock은 `__readers`라는 32-bit word 하나에 reader 수와 상태 비트를 함께 담습니다. `rdlock`은 이 word에 `atomic_fetch_add_acquire`를 하고(353행), `rdunlock`은 같은 word를 `atomic_compare_exchange_weak_release`로 갱신합니다(254행).

```c
/* glibc-2.41 nptl/pthread_rwlock_common.c:353 (rdlock fast path) */
r = (atomic_fetch_add_acquire (&rwlock->__data.__readers,
                               (1 << PTHREAD_RWLOCK_READER_SHIFT))
     + (1 << PTHREAD_RWLOCK_READER_SHIFT));
```

즉 reader끼리는 데이터를 공유하지 않아도 **카운터 cache line은 공유**합니다. Reader 네 개가 서로 다른 코어에서 진입·퇴장할 때마다 이 line의 소유권이 코어 사이를 오갑니다. Read 구간이 수십 ns라면 이 소유권 이동이 전체 시간을 지배합니다.

## Reader Preference

Reader preference는 reader가 하나라도 들어와 있으면 새 reader도 즉시 함께 들어가는 정책입니다. Writer가 기다리고 있어도 양보하지 않습니다. [`pthread_rwlockattr_setkind_np(3)`](https://man7.org/linux/man-pages/man3/pthread_rwlockattr_setkind_np.3.html)(man-pages 6.19)은 glibc의 기본값이 `PTHREAD_RWLOCK_PREFER_READER_NP`이고 "As long as there are readers, the writer will be starved"라고 적습니다.

이 문장을 그대로 재현해 봤습니다. Reader 3개가 read lock을 약 20 µs씩 잡되 서로 겹치게 돌고, writer 1개가 1 ms마다 `pthread_rwlock_clockwrlock`(200 ms timeout)으로 write lock을 요청합니다. 2초씩 5회 실행한 중앙값입니다([`starve.c`](#측정--비교-실험-설계)).

| 정책 | 2초간 write 성공 | writer 대기 p50 | writer 대기 max | reader 작업 수 |
|---|---:|---:|---:|---:|
| 기본값 (`PREFER_READER_NP`) | 136 | 9,134 µs | 98,456 µs | 290,811 |
| `PREFER_WRITER_NONRECURSIVE_NP` | 1,876 | 39 µs | 3,894 µs | 262,969 |

기본값에서 writer는 1 ms 주기로 2,000번 가까이 시도할 수 있는 시간에 136번만 들어갔고, 한 번 기다릴 때 중앙값이 9 ms, 최악은 98 ms였습니다. Writer 우선으로 바꾸면 reader 작업량이 약 10% 줄어드는 대신 writer 대기가 두 자릿수 µs로 떨어집니다.

Linux kernel의 `rwlock_t`는 이와 별개의 API입니다. v6.12 [`Documentation/locking/locktypes.rst`](https://docs.kernel.org/locking/locktypes.html)는 non-PREEMPT_RT kernel의 `rwlock_t`를 "fair, thus preventing writer starvation"이라고 설명합니다(301~303행). arm64는 `ARCH_USE_QUEUED_RWLOCKS`를 선택하므로(`arch/arm64/Kconfig:89`) 이 fairness는 `kernel/locking/qrwlock.c`의 queued rwlock이 제공합니다. 반대로 PREEMPT_RT에서는 `rwlock_t`가 rt_mutex 기반으로 바뀌고, 같은 문서가 "a preempted low-priority reader will continue holding its lock, thus starving even high-priority writers"라고 적습니다(305~318행).

## Writer Preference

Writer preference는 writer가 대기 중이면 새 reader도 줄을 서게 하는 정책입니다. glibc에서는 GNU 확장 `pthread_rwlockattr_setkind_np()`에 `PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP`를 넘깁니다.

```c
pthread_rwlockattr_t attr;
pthread_rwlockattr_init(&attr);
pthread_rwlockattr_setkind_np(&attr, PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP);
pthread_rwlock_init(&rw, &attr);
```

이름에 `NONRECURSIVE`가 붙은 이유가 중요합니다. 같은 man page는 `PTHREAD_RWLOCK_PREFER_WRITER_NP`가 "ignored by glibc"라고 적습니다. POSIX가 read lock의 재귀 획득을 허용하므로, writer 우선 정책에서 재귀 read를 하면 "reader가 이미 lock을 쥔 채 writer 뒤에 줄을 서는" 자기 교착이 생기기 때문입니다. `NONRECURSIVE` 쪽은 재귀 read lock을 하지 않는다는 약속을 받는 대신 writer starvation을 막습니다.

## Fair RW-Lock (FIFO)

Reader와 writer를 도착 순서대로 줄 세우고, 연속한 reader는 한 묶음으로 동시에 들여보내는 방식입니다. 은행 창구 번호표와 같아서 누구도 무한정 밀리지 않습니다.

Linux의 queued rwlock이 이 계열입니다. `kernel/locking/qrwlock.c`의 `queued_read_lock_slowpath()`는 바로 진입하지 못한 reader를 wait queue에 넣고, 주석에 적힌 예외(interrupt context의 reader는 writer가 *대기만* 하는 중이면 queue를 건너뜀, 26~35행)를 빼면 `wait_lock`을 잡은 순서대로 처리합니다. glibc `pthread_rwlock_t`의 기본값은 이 방식이 아니라 앞 절의 reader preference입니다.

## 성능 비교 — Mutex vs RW-Lock

같은 프로그램([`rwbench.c`](#측정--비교-실험-설계))으로 다섯 방식을 비교했습니다. 공유 데이터는 `uint64_t` 4개이고, write는 네 값을 모두 1씩 올리며, read는 네 값을 복사한 뒤 모두 같은지 검사합니다. 각 thread는 xorshift 난수로 read/write를 고르고 0.5초 동안 돕니다. 아래 표는 **4 thread**, read 구간이 복사뿐인 경우의 중앙값(단위 Mops/s, 5회)입니다.

| read 비율 | mutex | rwlock (기본) | rwlock (writer 우선) | seqlock | urcu |
|---:|---:|---:|---:|---:|---:|
| 100% | 34.50 | 9.70 | 8.41 | 609.84 | 557.40 |
| 99.9% | 31.04 | 14.71 | 8.68 | 481.74 | 95.52 |
| 99% | 35.36 | 5.06 | 5.03 | 167.83 | 34.92 |
| 90% | 38.75 | 6.20 | 0.39 | 61.83 | 6.28 |
| 50% | 19.60 | 10.90 | 0.31 | 29.59 | 1.18 |

여기서 가장 중요한 결과는 **read가 100%인데도 rwlock이 mutex보다 3.6배 느리다**는 점입니다. 앞 절의 `__readers` word를 네 코어가 매번 RMW하기 때문입니다. Mutex 쪽은 다르게 움직였습니다. 같은 조건을 `perf stat -e context-switches,task-clock`으로 3회 재 보니 mutex는 0.5초에 context switch가 46,029~60,729회, CPU 사용이 2.93~3.15개였고, rwlock은 13~24회에 3.98~4.00개였습니다. Mutex에서는 기다리는 thread가 futex에서 잠들고 깨어 있는 thread가 lock을 연달아 다시 잡으므로 lock line이 한 코어에 머무는 시간이 길고, rwlock에서는 네 thread가 모두 깨어 같은 line을 번갈아 씁니다.

Read 구간을 길게 만들면 순위가 뒤집힙니다. 같은 프로그램에 read 구간 안에서 `volatile` 루프 1,000회(1 thread 기준 한 번에 약 2.1 µs)를 추가했습니다.

| read 비율 | thread | mutex | rwlock (기본) | rwlock (writer 우선) |
|---:|---:|---:|---:|---:|
| 100% | 1 | 0.47 | 0.48 | 0.47 |
| 100% | 4 | 0.15 | 0.49 (0.40~1.29) | 0.94 (0.70~1.55) |
| 99% | 4 | 0.28 | 0.63 | 0.95 |

이제 4 thread에서 rwlock이 mutex의 2~6배입니다. 다만 범위가 넓고, vCPU 4개가 이상적으로 병렬이었다면 나왔을 1.9 Mops/s(1 thread 값의 4배)에는 못 미쳤습니다. 정리하면 RW-lock의 이득을 결정하는 것은 read 비율만이 아니라 **read 구간이 카운터 갱신 비용보다 충분히 긴가**입니다.

## RCU — Lock 없는 Read

RCU(Read-Copy-Update)는 reader가 lock도, 공유 카운터 RMW도 하지 않고 포인터 하나를 읽는 방식입니다. 신문 가판대에 비유하면 writer는 새 판을 따로 인쇄해 가판대에 올려놓고, 이미 옛 판을 들고 간 독자가 다 읽을 때까지 옛 판의 폐기를 미룹니다. 이 기다리는 구간이 grace period입니다.

Kernel에서 writer가 옛 포인터를 회수하려면 `rcu_assign_pointer()`가 아니라 `rcu_replace_pointer()`를 씁니다. v6.12 `include/linux/rcupdate.h:616`의 정의를 보면 `rcu_replace_pointer()`가 옛 값을 읽은 뒤 `rcu_assign_pointer()`를 부르고 옛 값을 돌려줍니다. `rcu_assign_pointer()` 자체는 값을 돌려주지 않습니다.

```c
/* Reader */
rcu_read_lock();
struct cfg *c = rcu_dereference(global_cfg);
use(c);
rcu_read_unlock();

/* Writer (cfg_lock으로 writer끼리 직렬화) */
struct cfg *new_c = build_new_cfg();
struct cfg *old = rcu_replace_pointer(global_cfg, new_c,
                                      lockdep_is_held(&cfg_lock));
synchronize_rcu();   /* 기존 reader가 모두 끝날 때까지 대기 */
kfree(old);
```

Reader 쪽 비용은 kernel 설정에 따라 다릅니다. `CONFIG_PREEMPT_RCU`가 꺼진 kernel에서 `__rcu_read_lock()`은 `preempt_disable()` 하나입니다(`rcupdate.h:91~94`). 이 글의 Debian kernel은 `CONFIG_TREE_RCU=y`이고 `CONFIG_PREEMPT_RCU`가 없으므로 이 경로입니다. `CONFIG_PREEMPT_RCU` kernel은 같은 구간을 선점할 수 있습니다([`whatisRCU.rst`](https://docs.kernel.org/RCU/whatisRCU.html) `rcu_read_lock()` 절).

Kernel 안의 실제 사용처로는 IPv4 routing 조회(`net/ipv4/fib_trie.c:1444`의 `fib_table_lookup()` 위에 "should be called with rcu_read_lock" 주석)와 pathname lookup의 RCU-walk(`Documentation/filesystems/path-lookup.rst`)가 있습니다.

## RCU의 사용 조건

Userspace에서는 [liburcu](https://liburcu.org/)로 같은 구조를 씁니다. 위 표의 `urcu` 열은 `urcu-memb` flavor이고, writer가 write마다 `urcu_memb_synchronize_rcu()`로 grace period를 기다린 뒤 옛 객체를 `free()`합니다. 결과가 RCU의 조건을 그대로 보여 줍니다.

- Read 100%에서는 557 Mops/s로 mutex의 16배였습니다. Reader가 공유 line을 쓰지 않기 때문입니다.
- Read 99%에서는 34.92로 mutex(35.36)와 같아졌고, 90%에서는 6.28까지 떨어졌습니다. Write마다 grace period를 동기로 기다리는 비용입니다.
- 1 thread, read 50%에서는 4.98 Mops/s, 즉 write 한 번에 수백 ns가 grace period 대기에 들어갔습니다.

그래서 RCU는 write가 드물거나, writer가 `call_rcu()`처럼 회수를 미뤄 grace period를 기다리지 않는 구조에 맞습니다. 또 writer가 새 사본을 만들어 포인터 하나로 교체해야 하므로 linked list, hash table, radix tree처럼 포인터로 이어진 구조여야 합니다.

## Seqlock — Read는 Retry, Write는 직렬

Seqlock은 reader가 아무것도 쓰지 않고 sequence 번호를 읽기 전후로 두 번 비교하는 방식입니다. 시험지 버전 번호와 같습니다. 문제를 다 푼 뒤 버전이 바뀌었으면(writer가 끼어들었으면) 다시 풉니다. v6.12 [`Documentation/locking/seqlock.rst`](https://docs.kernel.org/locking/seqlock.html)는 writer가 구간 시작과 끝에서 번호를 올려, 쓰는 중에는 홀수가 된다고 설명합니다.

Kernel API는 `read_seqbegin()`/`read_seqretry()`와 `write_seqlock()`/`write_sequnlock()`입니다. 이 글의 userspace 버전은 C11 atomic으로 같은 순서를 만들었습니다. Reader는 첫 번째 번호를 acquire로 읽고, 데이터를 relaxed로 읽은 뒤 acquire fence를 두고 두 번째 번호를 읽습니다.

```c
/* rwbench.c의 seqlock reader */
for (;;) {
    s1 = atomic_load_explicit(&seq, memory_order_acquire);
    if (s1 & 1) { retries++; continue; }            /* writer 진행 중 */
    for (int i = 0; i < 4; i++)
        d.v[i] = atomic_load_explicit(&sdata[i], memory_order_relaxed);
    atomic_thread_fence(memory_order_acquire);
    s2 = atomic_load_explicit(&seq, memory_order_relaxed);
    if (s1 == s2) break;
    retries++;
}
```

4 thread 표에서 seqlock은 모든 read 비율에서 가장 빨랐습니다. 다섯 방식 375회 실행 전체에서 값이 어긋난 read(`torn`)는 0건이었습니다. 대가는 retry입니다. 4 thread에서 read 한 번당 재시도가 99.9%일 때 0.245회, 99%일 때 0.584회, 90%일 때 0.445회, 50%일 때 1.089회였습니다.

Kernel의 실제 예로 `jiffies_64`가 있습니다. v6.12 `kernel/time/jiffies.c:46~58`의 `get_jiffies_64()`는 `read_seqcount_begin(&jiffies_seq)`/`read_seqcount_retry()` 루프로 64-bit 값을 읽습니다. 단, 이 함수는 `#if (BITS_PER_LONG < 64)` 안에 있어 32-bit kernel에서만 쓰입니다. 64-bit에서는 한 번의 load로 읽을 수 있기 때문입니다.

## RCU·Seqlock·RW-Lock 비교

| 항목 | RW-Lock (glibc) | RCU (liburcu) | Seqlock |
|---|---|---|---|
| Read 비용 | 공유 word RMW 2회 | 포인터 load, 공유 쓰기 없음 | 번호 load 2회 + retry |
| Write 비용 | write lock | 사본 생성 + grace period | 번호 증가 2회, writer끼리 직렬 |
| 4 thread, read 100% | 9.70 Mops/s | 557.40 Mops/s | 609.84 Mops/s |
| 4 thread, read 90% | 6.20 Mops/s | 6.28 Mops/s | 61.83 Mops/s |
| 데이터 형태 | 제한 없음 | 포인터로 교체 가능한 구조 | 포인터 없는 작은 값 |
| Writer starvation | 기본값에서 발생(위 표) | 없음 | reader가 writer를 막지 않음 |

선택 순서는 데이터 형태가 먼저입니다. 포인터 없는 작은 값이면 seqlock, 포인터로 이어진 구조이고 write가 드물면 RCU, read 구간이 길고 둘 다 맞지 않으면 RW-lock, read 구간이 짧고 경합이 있으면 오히려 mutex를 먼저 측정해 봅니다.

## 자동차 — Double Buffer

임베디드 코드에서 자주 보는 "버퍼 두 개 + active index" 패턴은 lock이 없지만 **찢어진 읽기를 막지 못합니다**. Reader가 `buf[active]`를 복사하는 동안 writer가 두 번 갱신하면, 두 번째 갱신은 reader가 읽고 있는 바로 그 버퍼에 씁니다.

```c
/* dbuf.c — 회피: reader가 읽는 중인 버퍼를 writer가 다시 쓸 수 있음 */
void writer(void) {
    int next = !atomic_load_explicit(&active, memory_order_relaxed);
    for (int i = 0; i < 8; i++) atomic_store_explicit(&buf[next][i], v, memory_order_relaxed);
    atomic_store_explicit(&active, next, memory_order_release);
}
```

필드 8개를 relaxed atomic으로 만들어 C 수준의 data race를 없앤 상태에서도, writer 1개와 reader 1개를 1초씩 5회 돌리면 read의 0.64%(중앙값, 범위 0.51~0.77%)가 서로 다른 갱신의 값을 섞어 읽었습니다. Reader가 writer보다 확실히 빠르다는 보장이 없다면 이 패턴은 앞 절의 seqlock처럼 번호로 재검사하거나, reader가 쓰는 버퍼를 writer에게 알리는 방식으로 바꿔야 합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ 짧은 read 구간에 RW-Lock

```c
pthread_rwlock_rdlock(&rw);
d = shared;            /* 32바이트 복사뿐 */
pthread_rwlock_unlock(&rw);
```

위 표에서 4 thread, read 100%일 때 이 코드는 mutex보다 3.6배 느렸습니다. 구간이 짧으면 mutex나 seqlock을 먼저 측정합니다.

> ⚠️ Read lock을 쥔 채 write lock 요청

```c
pthread_rwlock_rdlock(&rw);
pthread_rwlock_wrlock(&rw);   /* 업그레이드 아님 */
```

POSIX(IEEE Std 1003.1-2024)의 [`pthread_rwlock_wrlock()`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_rwlock_trywrlock.html)은 호출 thread가 이미 read든 write든 lock을 쥐고 있으면 "the call shall either deadlock or return [EDEADLK]"라고 정합니다. pthread에는 read→write 업그레이드 API가 없으므로 read lock을 풀고 write lock을 새로 잡은 뒤 상태를 다시 확인합니다.

> ⚠️ RCU read 구간 안에서 free

```c
rcu_read_lock();
struct cfg *c = rcu_dereference(global_cfg);
kfree(c);   /* 다른 reader도 c를 쓰는 중 */
rcu_read_unlock();
```

회수는 `synchronize_rcu()` 뒤에 하거나 `call_rcu()` 콜백에서 합니다. `whatisRCU.rst`의 `rcu_read_lock()` 절은 read 구간 동안 RCU로 보호되는 데이터가 "guaranteed to remain unreclaimed"라고 적는데, 이 보장은 writer가 grace period를 지킬 때만 성립합니다.

> ⚠️ Seqlock에 포인터 데이터

`seqlock.rst` 33~34행은 "This mechanism cannot be used if the protected data contains pointers, as the writer can invalidate a pointer that the reader is following"라고 적습니다. Reader가 retry로 값을 버리기 전에 이미 해제된 메모리를 따라갈 수 있기 때문입니다.

## 측정 — 비교 실험 설계

이 글의 표는 세 프로그램에서 나왔습니다. 모두 위 환경의 guest에서 `gcc -O2 -pthread`로 빌드했습니다.

| 프로그램 | 명령 | 측정 |
|---|---|---|
| `rwbench.c` | `./rwbench <mutex\|rwlock\|rwlock_wp\|seqlock\|urcu> <threads> <read‰> 0.5 [work]` (`-lurcu-memb`) | 처리량, 찢어진 read 수, seqlock retry |
| `starve.c` | `./starve <default\|wp> 3 2` | writer 성공 횟수, 대기 분포 |
| `dbuf.c` | `./dbuf 1` | double buffer의 찢어진 read 비율 |

설계에서 지킨 것은 세 가지입니다. 첫째, 모든 방식이 같은 데이터와 같은 검사(`torn` 카운트)를 써서 빠르지만 틀린 구현이 표에 끼지 않게 했습니다. 둘째, read 구간 길이를 따로 바꿔 "read 비율"과 "구간 길이"의 효과를 분리했습니다. 셋째, 처리량만 보지 않고 writer 대기 분포(p50, max)를 함께 기록했습니다. RCU 열은 write마다 동기 grace period를 기다리는 가장 비싼 사용법이라는 점도 함께 읽어야 합니다.

## 정리

아래 수치는 모두 이 글의 측정 환경(Apple M2 Pro 위 HVF Debian 13 arm64 게스트)에서 잰 값이며, 다른 CPU나 보드의 값이 아닙니다.

- glibc `pthread_rwlock_t`의 read는 공유 `__readers` word를 RMW하므로, 짧은 read 구간에서는 read 100%에서도 mutex보다 느렸습니다(4 thread, 9.70 대 34.50 Mops/s).
- Read 구간이 약 2 µs가 되자 같은 4 thread에서 rwlock이 mutex의 2~6배가 됐습니다.
- glibc 기본값은 reader preference이고, 겹치는 reader 3개 앞에서 writer 대기가 중앙값 9 ms, 최악 98 ms였습니다. `PREFER_WRITER_NONRECURSIVE_NP`로 39 µs까지 줄었습니다.
- Seqlock은 4 thread 표의 모든 비율에서 가장 빨랐지만 read 한 번당 0.245~1.089회 retry가 있었고, 포인터 데이터에는 쓸 수 없습니다.
- RCU는 read 100%에서 mutex의 16배였지만 write마다 grace period를 기다리면 read 99%에서 이미 이점이 사라졌습니다.
- 버퍼 두 개 + index 패턴은 측정에서 read의 0.64%가 찢어졌습니다.

다음 편은 **Lock-Free 기초** — CAS와 ABA 문제를 살펴봅니다.

## 관련 항목

- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
- [4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
- [Practical RTOS Internals 3-11: Stream Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)
