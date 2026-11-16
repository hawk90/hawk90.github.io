---
title: "MPMC Queue 구현 — Multi-producer Multi-consumer Lock-Free"
slug: "embedded/modern-recipes/part9-10-mpmc-queue"
date: 2026-04-18T09:09:00
description: "MPMC와 SPSC 차이, Vyukov 큐, Disruptor의 ring과 sequence, bounded와 unbounded 비교를 실측과 함께 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 110
tags: [recipes, concurrency, queue, mpmc]
topics: ["embedded"]
---

## 한 줄 요약

> **"MPMC 큐는 slot마다 '지금 누구 차례인가'를 적어 두는 자료구조입니다."** SPSC는 head/tail 두 index로 충분하지만, 생산자와 소비자가 여럿이면 slot마다 sequence 번호가 필요합니다. 이 글은 Vyukov의 bounded MPMC queue를 구현해 모든 값이 정확히 한 번 나오는지 확인하고, mutex 큐·moodycamel 큐와 처리량을 직접 비교합니다.

## 어떤 상황에서 쓰나

Worker pool, packet pipeline, 로그 수집처럼 여러 스레드가 넣고 여러 스레드가 꺼내는 곳입니다. 은행 번호표에 비유하면, 손님(생산자)과 창구(소비자)가 모두 여럿이라 번호표 기계 하나와 전광판 하나로는 모자라고, 창구마다 "몇 번 손님 차례인지"를 따로 표시해야 합니다. 그 표시가 slot의 sequence 번호입니다.

흔히 "lock-free MPMC가 mutex 큐보다 몇 배 빠르다"고 하지만, 아래 측정에서 이 Mac의 4P/4C 조건으로는 `std::mutex` + `std::queue`가 두 lock-free 큐보다 빨랐습니다. Lock-free를 고르는 이유는 처리량보다 *lock을 쥔 스레드가 멈춰도 다른 스레드가 진행한다*는 성질에 있고, 처리량은 자기 조건에서 재 봐야 합니다.

## 핵심 개념

| 구성 | 필요한 것 |
|---|---|
| SPSC | head와 tail, 각자 한 스레드만 씀 ([9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)) |
| MPMC (bounded, Vyukov) | slot마다 sequence 번호, enqueue·dequeue 위치를 CAS로 예약 |

Vyukov는 이 큐를 "MPMC, array-based, fails on overflow ... blocking producers and consumers queue"로 분류하고, "not lockfree in the official meaning, just implemented by means of atomic RMW operations w/o mutexes", 연산마다 CAS 한 번이라고 적습니다([1024cores, Bounded MPMC queue, 2022-11-27 보관본](https://web.archive.org/web/20221127075938/https://www.1024cores.net/home/lock-free-algorithms/queues/bounded-mpmc-queue)). 생산자가 위치를 예약하고 데이터를 다 쓰기 전에 멈추면, 그 slot을 기다리는 소비자도 진행하지 못하기 때문입니다.

라이브러리로는 다음이 있습니다.

| 큐 | 설명 | 근거 |
|-------|------|------|
| `boost::lockfree::queue` | lock-free MPMC 큐, Michael·Scott의 *Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms* 기반. `fixed_sized`·`capacity`로 고정 크기 설정 가능 | Boost 1.86 문서, Boost.Lockfree 개요·Rationale |
| `moodycamel::ConcurrentQueue` | MPMC 큐. README가 "not linearizable"이라고 밝힘. 한 생산자가 넣은 순서는 지키지만 생산자 사이의 전체 순서는 보장하지 않음 | concurrentqueue v1.0.4 README 48–52, 74–80행 |

Boost는 이 글에서 빌드해 돌리지 않았고, moodycamel은 아래에서 돌렸습니다.

## 코드 / 실제 사용 예

### Vyukov bounded MPMC

1024cores 원문의 구조를 C++17로 옮겼습니다. `intptr_t` 차이 계산, 세 갈래 분기, `pos + N`으로 slot을 다음 바퀴에 넘기는 부분은 원문과 같습니다. 원문은 64바이트 패딩을 쓰지만, 이 글의 측정 기계(M2)의 cache line이 128 B라([9-09](/blog/embedded/modern-recipes/part9-09-false-sharing)) `alignas(128)`로 바꿨습니다.

```cpp
// mpmc.h — bounded MPMC queue after Dmitry Vyukov's 1024cores design
#include <atomic>
#include <cstddef>
#include <cstdint>

template <typename T, size_t N>                  // N must be a power of two
class mpmc_queue {
    static_assert(N >= 2 && (N & (N - 1)) == 0, "N must be a power of two");
    struct cell {
        std::atomic<size_t> seq;
        T data;
    };
    alignas(128) cell buf_[N];
    alignas(128) std::atomic<size_t> enq_pos_{0};
    alignas(128) std::atomic<size_t> deq_pos_{0};

public:
    mpmc_queue() { for (size_t i = 0; i < N; i++) buf_[i].seq.store(i, std::memory_order_relaxed); }

    bool try_enqueue(const T &v)
    {
        size_t pos = enq_pos_.load(std::memory_order_relaxed);
        cell *c;
        for (;;) {
            c = &buf_[pos & (N - 1)];
            size_t seq = c->seq.load(std::memory_order_acquire);
            intptr_t dif = (intptr_t)seq - (intptr_t)pos;
            if (dif == 0) {
                if (enq_pos_.compare_exchange_weak(pos, pos + 1, std::memory_order_relaxed))
                    break;                       // slot is ours
            } else if (dif < 0) {
                return false;                    // full
            } else {
                pos = enq_pos_.load(std::memory_order_relaxed);   // someone moved ahead
            }
        }
        c->data = v;
        c->seq.store(pos + 1, std::memory_order_release);        // publish to consumers
        return true;
    }

    bool try_dequeue(T &out)
    {
        size_t pos = deq_pos_.load(std::memory_order_relaxed);
        cell *c;
        for (;;) {
            c = &buf_[pos & (N - 1)];
            size_t seq = c->seq.load(std::memory_order_acquire);
            intptr_t dif = (intptr_t)seq - (intptr_t)(pos + 1);
            if (dif == 0) {
                if (deq_pos_.compare_exchange_weak(pos, pos + 1, std::memory_order_relaxed))
                    break;
            } else if (dif < 0) {
                return false;                    // empty
            } else {
                pos = deq_pos_.load(std::memory_order_relaxed);
            }
        }
        out = c->data;
        c->seq.store(pos + N, std::memory_order_release);        // hand the slot back to producers
        return true;
    }
};
```

Slot의 sequence 번호가 상태를 나타냅니다.

- `seq == pos`: 위치 `pos`의 생산자가 쓸 수 있습니다. 생산자가 `enq_pos_`를 CAS로 하나 올려 자리를 잡고, 데이터를 쓴 뒤 `seq = pos + 1`로 공개합니다.
- `seq == pos + 1`: 위치 `pos`의 소비자가 읽을 수 있습니다. 소비자가 `deq_pos_`를 CAS로 잡고, 읽은 뒤 `seq = pos + N`으로 다음 바퀴의 생산자에게 넘깁니다.
- 차이가 음수면 생산자 쪽은 가득 참, 소비자 쪽은 비었음입니다. 양수면 다른 스레드가 앞질렀으니 위치를 다시 읽습니다.

### 시험: 모든 값이 정확히 한 번 나오는가

생산자 P개가 각자 서로 다른 값 200만 개를 넣고, 소비자 C개가 꺼낸 값의 합과 개수를 셉니다. 합이 1부터 전체 개수까지의 합과 같고 개수도 같으면 잃어버리거나 두 번 나온 값이 없습니다. 소비자는 자기 몫을 지역 변수로 세고 끝날 때 한 번만 공유 카운터에 더합니다. 처음 판에서는 꺼낼 때마다 공유 카운터를 올렸는데, 그 카운터 자체가 경합 지점이 되어 모든 큐의 숫자를 낮췄습니다.

```cpp
// qbench.cpp — P producers, C consumers move ITEMS values; checks every value arrives exactly once
#include "mpmc.h"
#include "spsc.h"
#include "concurrentqueue.h"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

struct mutex_queue {
    std::mutex m; std::queue<unsigned long> q;
    bool try_enqueue(unsigned long v) { std::lock_guard<std::mutex> g(m); q.push(v); return true; }
    bool try_dequeue(unsigned long &v) { std::lock_guard<std::mutex> g(m); if (q.empty()) return false; v = q.front(); q.pop(); return true; }
};

template <class Q>
void run(const char *name, Q &q, int P, int C, unsigned long per_producer)
{
    std::atomic<int> producers_done{0};
    std::atomic<unsigned long> got{0}, sum{0};
    const unsigned long total = per_producer * P;
    std::vector<std::thread> t;
    auto t0 = std::chrono::steady_clock::now();
    for (int p = 0; p < P; p++)
        t.emplace_back([&, p] {
            for (unsigned long i = 0; i < per_producer; i++) {
                unsigned long v = p * per_producer + i + 1;
                while (!q.try_enqueue(v)) {}
            }
            producers_done.fetch_add(1, std::memory_order_release);
        });
    for (int c = 0; c < C; c++)
        t.emplace_back([&] {                     // count locally; touch shared counters once at the end
            unsigned long v, s = 0, n = 0;
            for (;;) {
                if (q.try_dequeue(v)) { s += v; n++; continue; }
                if (producers_done.load(std::memory_order_acquire) == P) {
                    while (q.try_dequeue(v)) { s += v; n++; }
                    break;
                }
            }
            sum += s; got += n;
        });
    for (auto &x : t) x.join();
    std::chrono::duration<double> d = std::chrono::steady_clock::now() - t0;
    unsigned long expect = total * (total + 1) / 2;
    std::printf("%-12s %dP/%dC  %6.1f M items/s  %s\n", name, P, C, total / d.count() / 1e6,
                sum == expect && got == total ? "all items once" : "LOST OR DUPLICATED");
}

int main(int argc, char **argv)
{
    unsigned long n = argc > 1 ? std::strtoul(argv[1], nullptr, 10) : 2000000;
    { static spsc_queue<unsigned long, 1024> q; run("spsc", q, 1, 1, n); }
    { static mpmc_queue<unsigned long, 1024> q; run("vyukov", q, 1, 1, n); }
    { static mpmc_queue<unsigned long, 1024> q; run("vyukov", q, 4, 4, n); }
    { moodycamel::ConcurrentQueue<unsigned long> q; run("moodycamel", q, 4, 4, n); }
    { mutex_queue q; run("mutex+queue", q, 4, 4, n); }
}
```

```cpp
// spsc.h — single-producer single-consumer ring for comparison
#include <atomic>
#include <cstddef>

template <typename T, size_t N>
struct spsc_queue {
    static_assert((N & (N - 1)) == 0, "N must be a power of two");
    alignas(128) std::atomic<size_t> head{0};
    alignas(128) std::atomic<size_t> tail{0};
    alignas(128) T buf[N];

    bool try_enqueue(const T &v) {
        size_t h = head.load(std::memory_order_relaxed);
        size_t n = (h + 1) & (N - 1);
        if (n == tail.load(std::memory_order_acquire)) return false;
        buf[h] = v;
        head.store(n, std::memory_order_release);
        return true;
    }
    bool try_dequeue(T &v) {
        size_t t = tail.load(std::memory_order_relaxed);
        if (t == head.load(std::memory_order_acquire)) return false;
        v = buf[t];
        tail.store((t + 1) & (N - 1), std::memory_order_release);
        return true;
    }
};
```

```text
host: Apple M2 Pro (8P+4E), macOS 27.2.1, Apple clang 21.0.0; moodycamel concurrentqueue v1.0.4
$ clang++ -std=c++17 -O2 qbench.cpp -o qbench && ./qbench   # 3 rounds, 2M items per producer
spsc         1P/1C    21.7 M items/s  all items once
vyukov       1P/1C    75.9 M items/s  all items once
vyukov       4P/4C     5.4 M items/s  all items once
moodycamel   4P/4C     6.2 M items/s  all items once
mutex+queue  4P/4C    13.9 M items/s  all items once
spsc         1P/1C    19.7 M items/s  all items once
vyukov       1P/1C    63.1 M items/s  all items once
vyukov       4P/4C     6.0 M items/s  all items once
moodycamel   4P/4C     5.9 M items/s  all items once
mutex+queue  4P/4C    14.5 M items/s  all items once
spsc         1P/1C    18.5 M items/s  all items once
vyukov       1P/1C    49.1 M items/s  all items once
vyukov       4P/4C     6.5 M items/s  all items once
moodycamel   4P/4C     5.6 M items/s  all items once
mutex+queue  4P/4C    15.6 M items/s  all items once
$ clang++ -std=c++17 -O1 -g -fsanitize=thread qbench.cpp -o qbench_tsan && ./qbench_tsan 20000
   1 moodycamel   4P/4C     0.2 M items/s  all items once
   1 mutex+queue  4P/4C     0.3 M items/s  all items once
   1 spsc         1P/1C     1.3 M items/s  all items once
   3 SUMMARY: ThreadSanitizer: data race concurrentqueue.h:2544 in bool moodycamel::ConcurrentQueue<unsigned long, moodycamel::ConcurrentQueueDefaultTraits>::ImplicitProducer::enqueue<(moodycamel::ConcurrentQueue<unsigned long, moodycamel::ConcurrentQueueDefaultTraits>::AllocationMode)1, unsigned long const&>(unsigned long const&)
   1 vyukov       1P/1C     2.0 M items/s  all items once
   1 vyukov       4P/4C     1.7 M items/s  all items once
```

모든 실행에서 값이 정확히 한 번씩 나왔습니다. TSan 판에서 Vyukov 큐와 SPSC, mutex 큐는 경고가 없었고, moodycamel은 `concurrentqueue.h` 2544행(slot에 원소를 placement-new하는 줄)에서 data race 경고가 세 번 나왔습니다. 그 경고가 실제 버그인지 TSan이 이 라이브러리의 동기화를 이해하지 못한 것인지는 이 글에서 분석하지 않았습니다.

### SPSC 비교

위 `spsc.h`는 [9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)의 ring과 같은 구조입니다. 생산자·소비자가 하나씩이면 CAS 없이 load/store만으로 됩니다. 다만 이 측정의 1P/1C에서는 SPSC(18.5~21.7 M items/s)가 Vyukov 큐(49.1~75.9)보다 느렸습니다. SPSC는 원소마다 상대의 index(공유 head/tail)를 읽어야 하지만, Vyukov 큐는 각자 slot의 sequence만 보고 공유 위치는 자기 쪽 것만 건드리므로 두 스레드가 같은 line을 덜 주고받는 것으로 보입니다. 이 설명은 측정에서 나온 추론이고 따로 확인하지 않았습니다. "SPSC가 항상 가장 빠르다"는 이 측정에서는 성립하지 않았습니다.

### moodycamel::ConcurrentQueue

```cpp
#include "concurrentqueue.h"

moodycamel::ConcurrentQueue<int> q;
q.enqueue(42);
int v;
q.try_dequeue(v);

int items[16];
size_t n = q.try_dequeue_bulk(items, 16);   /* take up to 16 at once */
```

v1.0.4 헤더에서 `enqueue`(995행), `try_dequeue`(1125행), `try_dequeue_bulk`(1231행)를 확인했습니다. Unbounded가 기본이라 생산자가 계속 빠르면 메모리를 계속 씁니다. 위 측정의 4P/4C에서 5.6~6.2 M items/s였습니다.

## 측정 / 성능 비교

위 `qbench` 세 라운드의 범위입니다(Apple M2 Pro, macOS 27.2.1, Apple clang 21.0.0, `-O2`, 원소는 `unsigned long`, 큐 크기 1024).

| 큐 | 1P/1C (M items/s) | 4P/4C (M items/s) |
| --- | --- | --- |
| SPSC ring | 18.5~21.7 | — |
| Vyukov bounded MPMC | 49.1~75.9 | 5.4~6.5 |
| moodycamel `ConcurrentQueue` | — | 5.6~6.2 |
| `std::mutex` + `std::queue` | — | 13.9~15.6 |

4P/4C에서는 mutex 큐가 두 lock-free 큐의 두 배 넘게 빨랐습니다. 원소가 작고 enqueue·dequeue 사이에 하는 일이 없어 경합이 가장 심한 조건이고, macOS의 `std::mutex`가 이 조건에서 잘 동작한 결과입니다. 원소를 처리하는 일이 긴 경우나 스레드 수가 코어 수보다 많아 lock을 쥔 스레드가 선점되는 경우는 이 글에서 재지 않았으므로, 그런 조건에서는 실제 작업을 넣고 다시 잽니다. "lock-free MPMC가 mutex보다 5~10배"라는 주장은 이 측정으로 뒷받침되지 않았습니다.

## 자주 보는 함정

> ⚠️ `fetch_add` 하나로 MPMC를 만듦

```cpp
size_t pos = head.fetch_add(1);
buf[pos & mask] = v;    /* no way to know the slot was consumed, or for a consumer to know it is filled */
```

`fetch_add`는 생산자마다 다른 위치를 주므로 생산자끼리 같은 칸을 동시에 쓰지는 않습니다. 문제는 그 칸이 *이전 바퀴의 값이 아직 읽히지 않은 칸*인지, 소비자 입장에서 *값이 다 쓰인 칸*인지 알 방법이 없다는 것입니다. Vyukov 큐의 sequence 번호가 바로 그 두 정보를 칸마다 담습니다.

> ⚠️ Unbounded라고 capacity를 잊음

```cpp
moodycamel::ConcurrentQueue<Big> q;
for (;;) q.enqueue(make_big());    /* grows until memory runs out */
```

생산자가 소비자보다 빠르면 메모리가 계속 늘어납니다. Bounded 큐는 `try_enqueue`가 `false`를 돌려주므로, 그때 버릴지·기다릴지·덮어쓸지를 정해 둡니다.

> ⚠️ head와 tail을 같은 line에

```cpp
struct queue {
    std::atomic<size_t> head;
    std::atomic<size_t> tail;     /* same cache line */
};
```

[9-09](/blog/embedded/modern-recipes/part9-09-false-sharing)의 측정처럼 간격은 대상 칩의 line 크기로 둡니다. M2에서는 64 B로도 부족했습니다.

> ⚠️ SPSC 큐를 MPMC로 씀

```cpp
spsc_queue<unsigned long, 1024> q;
std::thread p1([&] { q.try_enqueue(1); });   /* two producers on an SPSC queue */
std::thread p2([&] { q.try_enqueue(2); });
```

SPSC의 `try_enqueue`는 `head`를 읽고 쓰는 사이에 다른 생산자가 끼어들지 않는다고 가정합니다. 생산자가 둘이면 같은 칸을 쓰고 한 값이 사라집니다. 타입 이름으로 구분해 섞어 쓰지 않습니다.

> ⚠️ 큰 원소를 값으로 넣음

```cpp
mpmc_queue<huge_struct, 1024> q;    /* every enqueue/dequeue copies huge_struct */
```

큰 원소는 pool에서 할당한 포인터나 index만 큐에 넣습니다. FreeRTOS queue에서의 같은 판단은 [6-06](/blog/embedded/modern-recipes/part6-06-queue-usage)에 있습니다.

## 정리

- MPMC 큐는 slot마다 sequence 번호를 두어 "쓸 차례"와 "읽을 차례"를 칸 단위로 표시합니다.
- Vyukov bounded 큐는 4P/4C에서 모든 값을 정확히 한 번 전달했고 TSan도 조용했습니다. 원저자는 이 큐를 엄밀한 의미의 lock-free가 아니라고 분류합니다.
- 이 Mac의 4P/4C에서는 `std::mutex` + `std::queue`가 Vyukov 큐와 moodycamel보다 빨랐습니다. 처리량은 실제 작업으로 재야 합니다.
- 1P/1C에서는 Vyukov 큐가 단순 SPSC ring보다 빨랐습니다.
- moodycamel은 linearizable하지 않고, TSan이 내부에서 경고를 냈습니다.
- Bounded 큐는 가득 찼을 때의 정책을, unbounded 큐는 메모리 상한을 정해 둡니다.

이 글로 Part 9 **Concurrency 응용**을 마칩니다.

## 관련 항목

- [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [9-09: False Sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
- [ECPP 4-04: Lock-Free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
- [PE 4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
