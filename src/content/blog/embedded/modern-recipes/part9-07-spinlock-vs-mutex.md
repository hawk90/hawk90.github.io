---
title: "Spinlock vs Mutex 결정 가이드 — Context Switch·Hold Time"
slug: "embedded/modern-recipes/part9-07-spinlock-vs-mutex"
date: 2026-04-18T09:06:00
description: "Lock hold time, 코어 수, preemption, real-time 요구사항에 따라 spinlock과 mutex를 어떻게 고를지 ticket lock과 MCS lock까지 함께 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 107
tags: [recipes, concurrency, lock]
topics: ["embedded"]
---

## 한 줄 요약

> **"기다리는 동안 CPU를 태우며 도는 것이 spinlock, 잠드는 것이 mutex입니다."** 어느 쪽이 맞는지는 hold time만으로 정해지지 않습니다. 이 글은 커널 소스로 두 lock의 계약을 확인하고, 사용자 공간에서 네 가지 lock을 같은 조건으로 돌려 *스레드가 코어보다 많아지는 순간* 공정한 spinlock이 멈춰 서는 것을 보여 줍니다.

## 어떤 상황에서 쓰나

Linux 커널처럼 인터럽트 문맥과 프로세스 문맥이 섞이는 곳에서는 매번 둘 중 하나를 고릅니다. 사용자 공간 멀티스레드 프로그램에서도 같은 질문이 나옵니다. 화장실 문에 비유하면 spinlock은 문 앞에 서서 계속 손잡이를 돌려 보는 것이고, mutex는 번호표를 받고 의자에서 잠드는 쪽입니다. 금방 나올 사람이면 서서 기다리는 게 빠르지만, 기다리는 사람이 의자 수(코어 수)보다 많아지면 서 있는 사람이 정작 안에 있는 사람의 자리를 막게 됩니다.

## 핵심 개념

Linux v6.12 소스와 문서에서 두 lock의 계약을 확인하면 다음과 같습니다. 표의 spinlock 칸은 `CONFIG_PREEMPT_RT`가 꺼진 커널 기준입니다.

| 항목 | spinlock | mutex | 근거 |
|------|----------|-------|------|
| 잡을 때 하는 일 | `spin_lock()`은 `preempt_disable()` 후 lock 획득 | `mutex_lock()`은 `might_sleep()`으로 시작 | `include/linux/spinlock_api_smp.h` 130–135행, `kernel/locking/mutex.c` 281–283행 |
| IRQ 차단 | `spin_lock_irqsave()`는 `local_irq_save()` 후 `preempt_disable()` | 없음 | `spinlock_api_smp.h` 104–111행 |
| 쓸 수 있는 문맥 | 인터럽트 문맥 포함 | "may not be used in hardware or software interrupt contexts such as tasklets and timers" | `Documentation/locking/mutex-design.rst` 88–89행 |
| 기다리는 방식 | 돎 | 잠깐 돌다가(optimistic spinning) 대기열에서 잠듦 | `mutex-design.rst` 45–73행 |
| 단일 CPU(UP) 커널 | `__LOCK()`이 `preempt_disable()`만 함 | — | `include/linux/spinlock_api_up.h` 27–31행 |

v6.12의 `CONFIG_PREEMPT_RT` 커널에서는 `spinlock_t`가 rt_mutex 기반의 잠드는 lock이 되어(`spin_lock()`이 `rt_spin_lock()`을 부릅니다, `include/linux/spinlock_rt.h` 43–46행) 선점을 막지 않고, `_irqsave`도 CPU 인터럽트 상태를 바꾸지 않습니다(`Documentation/locking/locktypes.rst` 46–50행, 232–239행).

Mutex 문서는 kernel mutex가 형식적으로는 잠드는 lock이지만 "busy-waiting for a few cycles instead of immediately sleeping"하는 optimistic spinning 경로 덕분에 실제로는 혼합형이라고 설명합니다(69–73행).

### 공정한 spinlock들

| 이름 | 성질 | 근거 |
|---|---|---|
| ticket lock | 번호표 순서대로 획득(FIFO). 모든 대기자가 같은 `now`를 읽음 | 아래 코드 |
| MCS lock | 대기자가 각자 자기 node에서 돔. 큐 순서대로 획득 | Mellor-Crummey·Scott, ACM TOCS 9(1) 1991, Fig. 5 |
| qspinlock | MCS를 바탕으로 {tail, next->locked}를 32비트 하나에 압축하고, 첫 대기자는 자기 node 대신 lock 비트에서 돎 | v6.12 `kernel/locking/qspinlock.c` 32–62행 |

arm64는 `ARCH_USE_QUEUED_SPINLOCKS`를 선택합니다(`arch/arm64/Kconfig` 90행). qspinlock을 "짧은 contention은 ticket, 긴 건 MCS"인 혼합형으로 설명하는 글이 있지만, 위 소스 주석은 그런 전환을 말하지 않습니다.

## 코드 / 실제 사용 예

### Linux kernel spinlock

```c
DEFINE_SPINLOCK(my_lock);
unsigned long flags;

/* process context only */
spin_lock(&my_lock);
critical_section();
spin_unlock(&my_lock);

/* shared with an interrupt handler */
spin_lock_irqsave(&my_lock, flags);
critical_section();
spin_unlock_irqrestore(&my_lock, flags);
```

위 표대로 `spin_lock`은 선점만 막고, `spin_lock_irqsave`는 그 CPU의 인터럽트도 막습니다. 같은 lock을 인터럽트 핸들러도 잡는다면 프로세스 문맥 쪽은 `_irqsave`를 써야 합니다. 그렇지 않으면 lock을 쥔 채 같은 CPU에서 인터럽트가 들어와 그 핸들러가 같은 lock에서 영원히 돕니다.

### Linux kernel mutex

```c
DEFINE_MUTEX(my_mtx);

mutex_lock(&my_mtx);
file_io();
mutex_unlock(&my_mtx);

if (mutex_lock_interruptible(&my_mtx))
    return -ERESTARTSYS;      /* a signal arrived while waiting */
```

`mutex_lock()`의 첫 줄이 `might_sleep()`이므로, `CONFIG_DEBUG_ATOMIC_SLEEP`이 켜진 커널에서는 잠들 수 없는 문맥에서 부르면 경고가 납니다. 인터럽트 문맥과 spinlock을 쥔 구간에서는 쓰지 않습니다.

### Userspace spinlock 세 가지

사용자 공간에서 측정하려고 세 spinlock을 한 헤더에 만들었습니다. TTAS(test-and-test-and-set)는 CAS가 실패하면 읽기만 하며 기다리고, ticket lock은 번호표, MCS lock은 Mellor-Crummey·Scott 논문 Fig. 5를 옮기되 `locked`를 exchange 전에 세웠습니다(논문은 exchange 뒤에 `I->locked := true`를 합니다).

```cpp
// locks.h — test-and-test-and-set, ticket and MCS spinlocks
#include <atomic>

static inline void cpu_relax() { __asm__ volatile("yield" ::: "memory"); }

struct tas_lock {
    std::atomic<int> v{0};
    void lock() {
        for (;;) {
            int expected = 0;
            if (v.compare_exchange_weak(expected, 1, std::memory_order_acquire,
                                        std::memory_order_relaxed)) return;
            while (v.load(std::memory_order_relaxed)) cpu_relax();   // spin on a read
        }
    }
    void unlock() { v.store(0, std::memory_order_release); }
};

struct ticket_lock {
    std::atomic<unsigned> next{0};
    std::atomic<unsigned> now{0};
    void lock() {
        unsigned my = next.fetch_add(1, std::memory_order_relaxed);
        while (now.load(std::memory_order_acquire) != my) cpu_relax();
    }
    void unlock() { now.store(now.load(std::memory_order_relaxed) + 1, std::memory_order_release); }
};

struct alignas(128) mcs_node {
    std::atomic<mcs_node *> next{nullptr};
    std::atomic<bool> locked{false};
};

struct mcs_lock {
    std::atomic<mcs_node *> tail{nullptr};
    void lock(mcs_node *me) {                       // Mellor-Crummey & Scott 1991, Fig. 5
        me->next.store(nullptr, std::memory_order_relaxed);
        me->locked.store(true, std::memory_order_relaxed);
        mcs_node *prev = tail.exchange(me, std::memory_order_acq_rel);
        if (prev) {
            prev->next.store(me, std::memory_order_release);
            while (me->locked.load(std::memory_order_acquire)) cpu_relax();   // spin on my own line
        }
    }
    void unlock(mcs_node *me) {
        mcs_node *succ = me->next.load(std::memory_order_acquire);
        if (!succ) {
            mcs_node *expected = me;
            if (tail.compare_exchange_strong(expected, nullptr, std::memory_order_acq_rel)) return;
            while (!(succ = me->next.load(std::memory_order_acquire))) cpu_relax();
        }
        succ->locked.store(false, std::memory_order_release);
    }
};
```

MCS 코드에서 빠뜨리기 쉬운 줄이 `lock()` 첫 줄 `me->next = nullptr`입니다. 논문 Fig. 5는 `fetch_and_store` 전에 `I->next := nil`을 합니다. 같은 node를 다시 쓸 때 이전 `next`가 남아 있으면 `unlock()`이 엉뚱한 후계자에게 lock을 넘깁니다.

### 측정 프로그램

같은 critical section(`critical()`, `noinline`)을 네 lock으로 감싸고, 스레드 수와 hold time을 바꿔 처리량과 "CPU 시간 / 벽시계 시간"을 잽니다. 후자가 스레드 수에 가까우면 모든 스레드가 계속 CPU를 쓰고 있다는 뜻입니다. 공유 `counter`가 정확히 `threads × ops`이면 상호 배제가 지켜졌다는 뜻입니다.

```cpp
// lockbench.cpp — throughput and CPU burn of four locks for a given hold time and thread count
#include "locks.h"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <pthread.h>
#include <sys/resource.h>
#include <thread>
#include <vector>

static volatile unsigned long sink;
static long counter;                              // plain; the lock must protect it

__attribute__((noinline)) static void critical(long n)   // identical critical section for every lock
{
    for (long i = 0; i < n; i++) sink = sink + 1;
    counter++;
}

int main(int argc, char **argv)
{
    const char *kind = argv[1];
    int threads = std::atoi(argv[2]);
    long hold = std::atol(argv[3]);               // loop iterations inside the lock
    long ops = std::atol(argv[4]);                // lock/unlock pairs per thread
    tas_lock tas; ticket_lock tkt; mcs_lock mcs;
    pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;

    auto body = [&](int) {
        mcs_node node;
        for (long i = 0; i < ops; i++) {
            if (!std::strcmp(kind, "tas")) { tas.lock(); critical(hold); tas.unlock(); }
            else if (!std::strcmp(kind, "ticket")) { tkt.lock(); critical(hold); tkt.unlock(); }
            else if (!std::strcmp(kind, "mcs")) { mcs.lock(&node); critical(hold); mcs.unlock(&node); }
            else { pthread_mutex_lock(&mtx); critical(hold); pthread_mutex_unlock(&mtx); }
        }
    };
    struct rusage r0, r1;
    getrusage(RUSAGE_SELF, &r0);
    auto t0 = std::chrono::steady_clock::now();
    std::vector<std::thread> t;
    for (int i = 0; i < threads; i++) t.emplace_back(body, i);
    for (auto &x : t) x.join();
    std::chrono::duration<double> wall = std::chrono::steady_clock::now() - t0;
    getrusage(RUSAGE_SELF, &r1);
    double cpu = (r1.ru_utime.tv_sec - r0.ru_utime.tv_sec) + (r1.ru_utime.tv_usec - r0.ru_utime.tv_usec) / 1e6
               + (r1.ru_stime.tv_sec - r0.ru_stime.tv_sec) + (r1.ru_stime.tv_usec - r0.ru_stime.tv_usec) / 1e6;
    std::printf("%-6s threads=%2d hold=%6ld  %8.0f k ops/s  cpu/wall %4.1f  %s\n", kind, threads, hold,
                threads * ops / wall.count() / 1e3, cpu / wall.count(),
                counter == threads * ops ? "ok" : "COUNTER WRONG");
}
```

먼저 TSan으로 네 lock 모두 상호 배제가 맞는지 확인했습니다(Mac, Apple clang 21.0.0).

```text
$ clang++ -std=c++17 -O1 -g -fsanitize=thread lockbench.cpp -o lb_tsan   # Apple clang 21, M2 Pro
$ for k in tas ticket mcs mutex; do ./lb_tsan $k 4 10 20000; done
tas    threads= 4 hold=    10       966 k ops/s  cpu/wall  3.0  ok
ticket threads= 4 hold=    10       137 k ops/s  cpu/wall  2.7  ok
mcs    threads= 4 hold=    10       285 k ops/s  cpu/wall  2.9  ok
mutex  threads= 4 hold=    10       934 k ops/s  cpu/wall  1.5  ok
```

### Mac 측정: 1·4·24 스레드

Apple M2 Pro(코어 12개)에서 스레드 1·4·24개, hold 0·200·20,000번 반복으로 돌렸습니다. 각 실행은 30초에서 끊었습니다.

```bash
#!/bin/bash
# macOS sweep: 1, 4 threads and 24 threads (twice the 12 cores); each run capped at 30 s
clang++ -std=c++17 -O2 -Wall lockbench.cpp -o lockbench || exit 1
cat > calib.cpp <<'C'
#include <chrono>
#include <cstdio>
static volatile unsigned long sink;
int main() { auto t0 = std::chrono::steady_clock::now(); for (long i = 0; i < 100000000; i++) sink = sink + 1;
  std::chrono::duration<double, std::nano> d = std::chrono::steady_clock::now() - t0; std::printf("work loop: %.2f ns per iteration\n", d.count() / 1e8); }
C
clang++ -O2 calib.cpp -o calib && ./calib
for hold in 0 200 20000; do
  ops=$(( hold == 20000 ? 2000 : 200000 ))
  for th in 1 4 24; do
    for k in tas ticket mcs mutex; do
      perl -e 'alarm 30; exec @ARGV' ./lockbench $k $th $hold $ops || echo "$k threads=$th hold=$hold  timeout (>30 s)"
    done
  done
done
```

```text
host: Apple M2 Pro (8P+4E = 12 cores), macOS 27.2.1, Apple clang 21.0.0
$ bash run_mac.sh
work loop: 0.30 ns per iteration
tas    threads= 1 hold=     0    200275 k ops/s  cpu/wall  1.0  ok
ticket threads= 1 hold=     0    125186 k ops/s  cpu/wall  1.0  ok
mcs    threads= 1 hold=     0    123676 k ops/s  cpu/wall  1.0  ok
mutex  threads= 1 hold=     0     99227 k ops/s  cpu/wall  1.0  ok
tas    threads= 4 hold=     0      4645 k ops/s  cpu/wall  3.9  ok
ticket threads= 4 hold=     0      8266 k ops/s  cpu/wall  4.0  ok
mcs    threads= 4 hold=     0      6029 k ops/s  cpu/wall  4.0  ok
mutex  threads= 4 hold=     0     39878 k ops/s  cpu/wall  2.8  ok
tas    threads=24 hold=     0      2091 k ops/s  cpu/wall  9.5  ok
ticket threads=24 hold=0  timeout (>30 s)
mcs threads=24 hold=0  timeout (>30 s)
mutex  threads=24 hold=     0     50686 k ops/s  cpu/wall  9.0  ok
tas    threads= 1 hold=   200     13062 k ops/s  cpu/wall  1.0  ok
ticket threads= 1 hold=   200     11908 k ops/s  cpu/wall  1.0  ok
mcs    threads= 1 hold=   200     12355 k ops/s  cpu/wall  1.0  ok
mutex  threads= 1 hold=   200      3712 k ops/s  cpu/wall  1.0  ok
tas    threads= 4 hold=   200      3459 k ops/s  cpu/wall  3.7  ok
ticket threads= 4 hold=   200      2232 k ops/s  cpu/wall  4.0  ok
mcs    threads= 4 hold=   200      2397 k ops/s  cpu/wall  4.0  ok
mutex  threads= 4 hold=   200      1701 k ops/s  cpu/wall  2.7  ok
tas    threads=24 hold=   200      1088 k ops/s  cpu/wall  8.1  ok
ticket threads=24 hold=200  timeout (>30 s)
mcs threads=24 hold=200  timeout (>30 s)
mutex  threads=24 hold=   200      2053 k ops/s  cpu/wall  9.9  ok
tas    threads= 1 hold= 20000       145 k ops/s  cpu/wall  1.0  ok
ticket threads= 1 hold= 20000        38 k ops/s  cpu/wall  1.0  ok
mcs    threads= 1 hold= 20000       147 k ops/s  cpu/wall  1.0  ok
mutex  threads= 1 hold= 20000        37 k ops/s  cpu/wall  1.0  ok
tas    threads= 4 hold= 20000        41 k ops/s  cpu/wall  3.5  ok
ticket threads= 4 hold= 20000        37 k ops/s  cpu/wall  4.0  ok
mcs    threads= 4 hold= 20000        42 k ops/s  cpu/wall  4.0  ok
mutex  threads= 4 hold= 20000        55 k ops/s  cpu/wall  1.1  ok
tas    threads=24 hold= 20000        19 k ops/s  cpu/wall  9.3  ok
ticket threads=24 hold=20000  timeout (>30 s)
mcs threads=24 hold=20000  timeout (>30 s)
mutex  threads=24 hold= 20000        77 k ops/s  cpu/wall  1.2  ok
```

### Linux guest에서도 같은 현상

같은 측정(`run.sh`, 스레드 1·4·12개)을 Debian 13 arm64 guest(vCPU 6개, g++ 14.2.0, glibc 2.41)에서 돌렸습니다. 이 guest는 다른 작업과 함께 쓰여 측정 도중 부하가 올라갔으므로(로그 끝의 load average) 처리량 숫자는 싣지 않고, 결과가 부하와 상관없이 같았던 줄만 옮깁니다.

```text
# Debian 13 arm64 guest (QEMU -accel hvf, 6 vCPU, Apple M2 Pro), kernel 6.12.116+deb13-arm64, g++ 14.2.0, glibc 2.41; start:  14:30:35 up  1:26,  2 users,  load average: 0.33, 4.50, 4.30
tas    threads=12 hold=     0      1789 k ops/s  cpu/wall  5.7  ok
ticket threads=12 hold=0  timeout (>30 s)
mcs threads=12 hold=0  timeout (>30 s)
mutex  threads=12 hold=     0     14568 k ops/s  cpu/wall  5.9  ok
tas    threads=12 hold=   200      2507 k ops/s  cpu/wall  5.6  ok
ticket threads=12 hold=200  timeout (>30 s)
mcs threads=12 hold=200  timeout (>30 s)
mutex  threads=12 hold=   200      2036 k ops/s  cpu/wall  5.7  ok
tas    threads=12 hold= 20000        39 k ops/s  cpu/wall  5.4  ok
ticket threads=12 hold=20000  timeout (>30 s)
mcs threads=12 hold=20000  timeout (>30 s)
mutex  threads=12 hold= 20000        69 k ops/s  cpu/wall  1.1  ok
# end:  14:33:43 up  1:29,  2 users,  load average: 11.46, 7.96, 5.70
```

## 측정 / 성능 비교

위 두 측정에서 일관되게 나온 것은 세 가지입니다.

- **스레드가 코어보다 많으면 ticket lock과 MCS lock은 30초 안에 끝나지 않았습니다.** Mac 24스레드(코어 12개), guest 12스레드(vCPU 6개) 모두, 세 hold time 모두에서 그랬습니다. 같은 조건에서 TTAS와 mutex는 끝났습니다. 공정한 lock은 *다음 차례*로 정해진 스레드가 실행 중이 아니면, 다른 스레드가 모두 돌며 기다려도 아무도 lock을 얻지 못합니다. 그 스레드가 다시 스케줄될 때까지 lock이 넘어가지 않기 때문입니다. MCS 논문도 FIFO lock은 "likely to waste CPU resources if spinning processes may be preempted"이고, 이때는 test-and-set lock이 "will allow latecomers to acquire the lock when processes that arrived earlier are not running"이라고 적습니다(Mellor-Crummey·Scott 1991, 'Discussion and Recommendations', 52쪽).
- **기다리는 동안 spinlock은 CPU를 다 썼고 mutex는 덜 썼습니다.** Mac 4스레드·hold 20,000에서 ticket·MCS는 CPU/벽시계가 4.0, TTAS는 3.5였고, mutex는 1.1이었습니다. 처리량은 비슷하거나 mutex가 더 높았습니다. 기다리는 스레드가 잠들어 있으면 그 CPU를 다른 일에 쓸 수 있습니다.
- **스레드가 하나일 때도 lock 사이에 차이가 났습니다.** Mac hold 20,000에서 TTAS와 MCS는 145~147 k ops/s, ticket과 mutex는 37~38 k ops/s였습니다. 경합이 없는 열이고 이 측정은 그 차이의 원인을 가르지 않았으므로, 이 열은 lock 비교에 쓰지 않습니다.

## 자주 보는 함정

> ⚠️ 스레드가 코어보다 많은데 공정한 spinlock

위 측정의 timeout 줄이 이 경우입니다. 사용자 공간에서 스레드 수를 코어 수 이하로 묶을 수 없다면, 기다리다 잠드는 mutex를 씁니다. PREEMPT_RT가 아닌 커널의 spinlock은 잡는 순간 선점을 막으므로(`preempt_disable()`) lock을 쥔 스레드가 그 사이 밀려나지 않습니다. 사용자 공간 spinlock에는 그런 보장이 없습니다.

> ⚠️ 단일 CPU에서 spinlock을 "돌며 기다리는 lock"으로 생각

```c
spin_lock(&x);   /* on a UP kernel this is preempt_disable() plus annotations */
```

UP 커널의 `__LOCK()`은 `preempt_disable()`만 합니다(`spinlock_api_up.h` 27–31행). 돌 상대가 없으므로 선점만 막으면 충분합니다. 인터럽트와 공유하는 데이터라면 여전히 `_irqsave`가 필요합니다.

> ⚠️ spinlock 안에서 sleep

```c
spin_lock(&x);
msleep(10);     /* sleeping while preemption is disabled */
spin_unlock(&x);
```

Spinlock은 선점을 막은 상태이므로 그 안에서 잠들 수 있는 함수를 부르지 않습니다. 이 글은 이 코드를 실행하지 않았습니다. 이 글의 Debian 커널은 `CONFIG_PREEMPT_COUNT`가 꺼져 있어([9-03](/blog/embedded/modern-recipes/part9-03-rcu-basics)) 선점 카운트로 이런 실수를 잡는 장치가 동작하지 않으므로, 개발 중에는 `CONFIG_DEBUG_ATOMIC_SLEEP`(이 옵션이 `PREEMPT_COUNT`를 select합니다, `lib/Kconfig.debug` 1573–1575행)을 켠 커널로 확인합니다.

> ⚠️ 인터럽트 핸들러에서 mutex

```c
static irqreturn_t irq_handler(int irq, void *dev)
{
    mutex_lock(&m);     /* mutex-design.rst: not in hardware or software interrupt contexts */
    ...
}
```

인터럽트 문맥에서는 `spin_lock`(필요하면 `spin_lock_irqsave`)을 씁니다.

> ⚠️ Hold time이 들쭉날쭉한 critical section

```c
spin_lock(&x);
if (rare_path)
    file_io();    /* usually fast, occasionally milliseconds */
spin_unlock(&x);
```

드물게라도 오래 걸리는 경로가 있으면 그동안 다른 CPU가 모두 돕니다. 그 경로를 lock 밖으로 빼거나 mutex로 옮깁니다.

## 정리

- PREEMPT_RT가 아닌 커널에서 `spin_lock`은 선점을 막고, `spin_lock_irqsave`는 인터럽트까지 막습니다. PREEMPT_RT 커널에서는 `spinlock_t`가 잠드는 lock이 됩니다. `mutex_lock`은 잠들 수 있어 인터럽트 문맥에서 쓰지 않습니다.
- Kernel mutex는 잠깐 돌다가 잠드는 혼합형이고, Linux의 qspinlock은 MCS를 32비트 word 하나로 압축한 구현입니다.
- 사용자 공간에서 스레드가 코어보다 많으면 ticket·MCS lock은 30초 안에 끝나지 않았습니다(Mac, Linux guest 모두).
- 기다리는 동안 spinlock은 CPU를 다 썼고 mutex는 그 CPU를 비워 두었습니다.
- MCS lock은 node를 다시 쓸 때 `next`를 먼저 비워야 합니다(논문 Fig. 5).
- 처리량 비교는 실제 critical section과 스레드 수로 대상에서 잽니다.

다음 편은 [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)입니다.

## 관련 항목

- [PRTOS 1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [6-05: Mutex 활용](/blog/embedded/modern-recipes/part6-05-mutex-usage)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)
- [PE 4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [PE 4-05: Mutex](/blog/embedded/performance-engineering/part4-05-mutex)
