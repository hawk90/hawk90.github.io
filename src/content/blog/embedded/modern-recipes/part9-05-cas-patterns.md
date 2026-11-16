---
title: "Compare-And-Swap 패턴 — Stack·Counter·Linked List 적용"
slug: "embedded/modern-recipes/part9-05-cas-patterns"
date: 2026-04-18T09:04:00
description: "CAS loop, strong과 weak CAS, ABA 회피, exponential backoff, spurious failure까지 CAS 사용의 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 105
tags: [recipes, concurrency, atomic, cas]
topics: ["embedded"]
---

## 한 줄 요약

> **"CAS = `if (*p == old) *p = new`를 *원자적으로*."** Lock-free 자료구조의 hot path는 대부분 CAS loop입니다. 이 글은 CAS가 실제로 어떤 명령이 되는지, 경합에서 얼마나 실패하는지, 어디서 memory order가 빠지면 깨지는지를 컴파일러 출력과 실행으로 확인합니다.

## 어떤 상황에서 쓰나

`fetch_add`처럼 하드웨어가 한 번에 해 주는 연산으로 표현되지 않는 갱신이 대상입니다. "최댓값을 넘기지 않고 1 올리기", "리스트 머리에 node 붙이기", "lock 상태를 0에서 1로 바꾸기"가 그렇습니다. 은행 창구에 비유하면, 통장 잔액을 보고(load) 새 잔액을 계산한 뒤, 창구 직원에게 "잔액이 아직 그 금액이면 이렇게 바꿔 주세요"라고 요청하는 것입니다. 그 사이 누가 입금했으면 요청은 거절되고, 새 잔액을 받아 다시 계산합니다.

## 핵심 개념

```cpp
bool compare_exchange_strong(T &expected, T desired);
bool compare_exchange_weak  (T &expected, T desired);
```

`*this == expected`이면 `desired`를 쓰고 `true`, 아니면 현재 값을 `expected`에 담고 `false`를 돌려줍니다. 실패하면 `expected`가 이미 최신 값이므로 그대로 다음 시도에 쓰면 됩니다.

둘의 차이는 C++ working draft [atomics.types.operations]에 있습니다. p27은 "A weak compare-and-exchange operation may fail spuriously", 즉 값이 같아도 `false`를 돌려줄 수 있다고 정하고, Note 5는 그 덕분에 load-locked/store-conditional 기계에서 구현할 수 있으며 "When a compare-and-exchange is in a loop, the weak version will yield better performance on some platforms. When a weak compare-and-exchange would require a loop and a strong one would not, the strong one is preferable."라고 적습니다. 같은 절의 Example 1이 표준이 기대하는 loop 모양입니다.

```cpp
expected = current.load();
do {
    desired = function(expected);
} while (!current.compare_exchange_weak(expected, desired));
```

### Weak와 strong은 무엇으로 컴파일되나

"some platforms"가 무엇인지는 컴파일러 출력으로 보입니다. Debian 13 arm64 guest의 g++ 14.2.0으로 두 함수를 ARMv8.0(LL/SC만 있음)과 ARMv8.1(LSE `cas` 있음)용으로 컴파일했습니다.

```cpp
// ws.cpp — what weak and strong compare_exchange compile to
#include <atomic>

bool cas_weak(std::atomic<int> &a, int &expected, int desired)
{
    return a.compare_exchange_weak(expected, desired, std::memory_order_relaxed);
}

bool cas_strong(std::atomic<int> &a, int &expected, int desired)
{
    return a.compare_exchange_strong(expected, desired, std::memory_order_relaxed);
}
```

```text
### g++ -std=c++17 -O2 -march=armv8-a -mno-outline-atomics -c ws.cpp   (g++ 14.2.0, aarch64)
0000000000000000 <cas_weak(std::atomic<int>&, int&, int)>:
   0:	ldr	w3, [x1]
   4:	ldxr	w4, [x0]
   8:	cmp	w4, w3
   c:	b.ne	18 <cas_weak(std::atomic<int>&, int&, int)+0x18>  // b.any
  10:	stxr	w5, w2, [x0]
  14:	cmp	w5, #0x0
  18:	cset	w0, eq	// eq = none
  1c:	b.eq	24 <cas_weak(std::atomic<int>&, int&, int)+0x24>  // b.none
  20:	str	w4, [x1]
  24:	ret

0000000000000028 <cas_strong(std::atomic<int>&, int&, int)>:
  28:	ldr	w3, [x1]
  2c:	ldxr	w4, [x0]
  30:	cmp	w4, w3
  34:	b.ne	40 <cas_strong(std::atomic<int>&, int&, int)+0x18>  // b.any
  38:	stxr	w5, w2, [x0]
  3c:	cbnz	w5, 2c <cas_strong(std::atomic<int>&, int&, int)+0x4>
  40:	cset	w0, eq	// eq = none
  44:	b.eq	4c <cas_strong(std::atomic<int>&, int&, int)+0x24>  // b.none
  48:	str	w4, [x1]
  4c:	ret
### g++ -std=c++17 -O2 -march=armv8.1-a -c ws.cpp   (g++ 14.2.0, aarch64)
0000000000000000 <cas_weak(std::atomic<int>&, int&, int)>:
   0:	ldr	w4, [x1]
   4:	mov	w3, w4
   8:	cas	w3, w2, [x0]
   c:	cmp	w3, w4
  10:	cset	w0, eq	// eq = none
  14:	b.eq	1c <cas_weak(std::atomic<int>&, int&, int)+0x1c>  // b.none
  18:	str	w3, [x1]
  1c:	ret

0000000000000020 <cas_strong(std::atomic<int>&, int&, int)>:
  20:	ldr	w4, [x1]
  24:	mov	w3, w4
  28:	cas	w3, w2, [x0]
  2c:	cmp	w3, w4
  30:	cset	w0, eq	// eq = none
  34:	b.eq	3c <cas_strong(std::atomic<int>&, int&, int)+0x1c>  // b.none
  38:	str	w3, [x1]
  3c:	ret
```

ARMv8.0에서 weak는 `ldxr`/`stxr`을 한 번만 시도하고, `stxr`이 실패하면 그대로 `false`를 돌려줍니다(spurious failure). Strong은 `cbnz w5, 2c`로 `stxr` 실패 시 스스로 다시 돌므로 루프가 하나 더 있습니다. 바깥에 이미 loop가 있다면 이 안쪽 루프는 중복입니다. ARMv8.1에서는 둘 다 `cas` 한 명령이라 차이가 없습니다. LSE를 쓰도록 컴파일한 코드에서는 weak와 strong이 같은 명령이 되고, LL/SC로 컴파일한 코드에서만 차이가 생깁니다. 이 글의 macOS 바이너리는 LSE로 컴파일됩니다(아래 `contend`의 `fetch_add`가 `ldadd`).

## 코드 / 실제 사용 예

### 기본 CAS loop — saturating counter

`fetch_add`로는 "MAX를 넘기지 않는다"를 지킬 수 없습니다. 더한 뒤에야 넘쳤는지 알기 때문입니다. CAS loop는 쓰기 전에 검사하므로 넘칠 일이 없습니다.

```cpp
// sat.cpp — saturating counter: 8 threads try to add 1M each, the counter must stop at MAX
#include <atomic>
#include <cstdio>
#include <thread>
#include <vector>

constexpr int MAX = 5000000;
std::atomic<int> counter{0};

bool inc_saturating()
{
    int cur = counter.load(std::memory_order_relaxed);
    do {
        if (cur >= MAX) return false;            // already full: give up, do not write
    } while (!counter.compare_exchange_weak(cur, cur + 1, std::memory_order_relaxed));
    return true;
}

int main()
{
    std::atomic<long> accepted{0};
    std::vector<std::thread> t;
    for (int i = 0; i < 8; i++)
        t.emplace_back([&] { long ok = 0; for (int k = 0; k < 1000000; k++) ok += inc_saturating(); accepted += ok; });
    for (auto &th : t) th.join();
    std::printf("counter %d (MAX %d), accepted increments %ld of 8000000\n",
                counter.load(), MAX, accepted.load());
    return counter.load() != MAX || accepted.load() != MAX;
}
```

```text
$ clang++ -std=c++17 -O2 -g -fsanitize=thread sat.cpp -o sat && ./sat
counter 5000000 (MAX 5000000), accepted increments 5000000 of 8000000
exit=0
```

스레드 8개가 800만 번 시도했고, 정확히 500만 번만 받아들여져 카운터가 MAX에서 멈췄습니다. 이 카운터는 다른 데이터를 공개하지 않으므로 relaxed로 충분합니다. 카운터 값으로 "이제 버퍼가 찼다" 같은 판단을 하고 그 버퍼를 읽는다면 acquire/release가 필요합니다.

### Lock-free stack push

```cpp
struct node { node *next; int val; };
std::atomic<node *> top;

void push(int v)
{
    node *n = new node{nullptr, v};
    node *cur = top.load(std::memory_order_relaxed);
    do {
        n->next = cur;
    } while (!top.compare_exchange_weak(cur, n, std::memory_order_release,
                                        std::memory_order_relaxed));
}
```

실패하면 `cur`가 새 `top`으로 갱신되므로 loop 본문은 `n->next = cur` 한 줄입니다. 성공 쪽 order가 release인 이유는 아래 "Memory order 누락" 함정에서 실행으로 봅니다. 이 push는 [9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)의 Treiber stack에서 8스레드로 돌렸습니다.

### CAS로 만든 spinlock

```cpp
// spin.cpp — test-and-set spinlock from one CAS; 8 threads bump a plain int under it
#include <atomic>
#include <cstdio>
#include <thread>
#include <vector>

std::atomic<int> locked{0};
long shared_count;                               // plain variable, protected by the lock

bool try_lock()
{
    int expected = 0;
    return locked.compare_exchange_strong(expected, 1, std::memory_order_acquire,
                                          std::memory_order_relaxed);
}
void lock()   { while (!try_lock()) { while (locked.load(std::memory_order_relaxed)) {} } }
void unlock() { locked.store(0, std::memory_order_release); }

int main()
{
    std::vector<std::thread> t;
    for (int i = 0; i < 8; i++)
        t.emplace_back([] { for (int k = 0; k < 200000; k++) { lock(); shared_count++; unlock(); } });
    for (auto &th : t) th.join();
    std::printf("shared_count %ld (expected 1600000)\n", shared_count);
    return shared_count != 1600000;
}
```

```text
$ clang++ -std=c++17 -O2 -g -fsanitize=thread spin.cpp -o spin && ./spin
shared_count 1600000 (expected 1600000)
exit=0
```

`lock()`은 CAS가 실패하면 `locked`가 0이 될 때까지 *읽기만* 하며 기다립니다(test-and-test-and-set). 기다리는 동안 CAS를 계속 걸면 매번 cache line을 쓰기 상태로 가져오기 때문입니다. 성공 쪽 acquire와 `unlock()`의 release가 짝을 이뤄 `shared_count++`가 서로 겹치지 않았고, TSan도 race를 보고하지 않았습니다. 이 lock은 공정하지 않습니다. 특정 스레드가 계속 지는 것을 막으려면 ticket lock 같은 순서 보장이 필요하고, 그 비교는 [9-07](/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex)에서 합니다.

### Exponential backoff

경합이 심할 때 실패한 스레드를 잠깐 쉬게 하면 cache line을 덜 빼앗아 전체 처리량이 오를 *수도* 있습니다. 실제로 오르는지 쟀습니다. 스레드 1·2·4·8개가 카운터 하나를 각자 200만 번 올립니다. `faa`는 `fetch_add`, `cas`는 backoff 없는 CAS loop, `backoff`는 실패할 때마다 AArch64 `yield` 힌트를 1, 2, 4, …, 1024번 실행하는 CAS loop입니다.

```cpp
// contend.cpp — one shared counter, N threads: fetch_add vs CAS loop vs CAS loop + backoff
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <thread>
#include <vector>

std::atomic<long> counter;
constexpr int OPS = 2000000;

static inline void cpu_relax() { __asm__ volatile("yield" ::: "memory"); }   // AArch64 YIELD hint

void inc_faa() { counter.fetch_add(1, std::memory_order_relaxed); }

void inc_cas()
{
    long cur = counter.load(std::memory_order_relaxed);
    while (!counter.compare_exchange_weak(cur, cur + 1, std::memory_order_relaxed)) {}
}

void inc_cas_backoff()
{
    long cur = counter.load(std::memory_order_relaxed);
    unsigned delay = 1;
    while (!counter.compare_exchange_weak(cur, cur + 1, std::memory_order_relaxed)) {
        for (unsigned i = 0; i < delay; i++) cpu_relax();
        if (delay < 1024) delay *= 2;
        cur = counter.load(std::memory_order_relaxed);
    }
}

int main(int argc, char **argv)
{
    int threads = std::atoi(argv[2]);
    void (*inc)() = !std::strcmp(argv[1], "faa") ? inc_faa
                  : !std::strcmp(argv[1], "cas") ? inc_cas : inc_cas_backoff;
    std::vector<std::thread> t;
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < threads; i++) t.emplace_back([inc] { for (int k = 0; k < OPS; k++) inc(); });
    for (auto &th : t) th.join();
    std::chrono::duration<double> s = std::chrono::steady_clock::now() - t0;
    std::printf("%-8s threads=%d  %6.1f M incs/s  (counter %ld)\n", argv[1], threads,
                threads * (double)OPS / s.count() / 1e6, counter.load());
}
```

```text
host: Apple M2 Pro (8P+4E), macOS 27.2.1, Apple clang 21.0.0
$ clang++ -std=c++17 -O2 contend.cpp -o contend
# round 1
faa      threads=1   489.5 M incs/s  (counter 2000000)
cas      threads=1   487.3 M incs/s  (counter 2000000)
backoff  threads=1   449.1 M incs/s  (counter 2000000)
faa      threads=2   210.1 M incs/s  (counter 4000000)
cas      threads=2   334.5 M incs/s  (counter 4000000)
backoff  threads=2   275.4 M incs/s  (counter 4000000)
faa      threads=4    88.5 M incs/s  (counter 8000000)
cas      threads=4    94.0 M incs/s  (counter 8000000)
backoff  threads=4    80.4 M incs/s  (counter 8000000)
faa      threads=8    43.0 M incs/s  (counter 16000000)
cas      threads=8   115.8 M incs/s  (counter 16000000)
backoff  threads=8    63.9 M incs/s  (counter 16000000)
# round 2
faa      threads=1   378.9 M incs/s  (counter 2000000)
cas      threads=1   460.8 M incs/s  (counter 2000000)
backoff  threads=1   253.0 M incs/s  (counter 2000000)
faa      threads=2   225.6 M incs/s  (counter 4000000)
cas      threads=2   204.2 M incs/s  (counter 4000000)
backoff  threads=2   274.3 M incs/s  (counter 4000000)
faa      threads=4   102.6 M incs/s  (counter 8000000)
cas      threads=4   102.5 M incs/s  (counter 8000000)
backoff  threads=4   174.1 M incs/s  (counter 8000000)
faa      threads=8   123.1 M incs/s  (counter 16000000)
cas      threads=8    62.4 M incs/s  (counter 16000000)
backoff  threads=8    79.1 M incs/s  (counter 16000000)
# round 3
faa      threads=1   442.7 M incs/s  (counter 2000000)
cas      threads=1   426.3 M incs/s  (counter 2000000)
backoff  threads=1   316.3 M incs/s  (counter 2000000)
faa      threads=2   148.4 M incs/s  (counter 4000000)
cas      threads=2   151.2 M incs/s  (counter 4000000)
backoff  threads=2   202.4 M incs/s  (counter 4000000)
faa      threads=4    78.0 M incs/s  (counter 8000000)
cas      threads=4    77.3 M incs/s  (counter 8000000)
backoff  threads=4   109.6 M incs/s  (counter 8000000)
faa      threads=8    65.2 M incs/s  (counter 16000000)
cas      threads=8    67.6 M incs/s  (counter 16000000)
backoff  threads=8    89.1 M incs/s  (counter 16000000)
```

세 라운드의 범위를 보면 스레드 8개에서 `cas`는 62~116, `backoff`는 64~89, `faa`는 43~123 M incs/s였습니다. 라운드마다 순위가 바뀌어 이 Mac에서는 backoff가 일관되게 이긴다고 말할 수 없습니다. 스레드가 하나면 CAS가 실패하지 않아 backoff 코드는 한 번도 돌지 않으므로, 1스레드 열에서 backoff 판이 253~449 M로 다른 둘(426~487, 379~490)보다 낮게 나온 라운드는 실행 간 흔들림입니다. Backoff의 효과는 코어 수, 경합 정도, `yield`가 그 코어에서 실제로 무엇을 하는지에 달려 있으므로, 넣을지는 자기 시스템에서 재고 정합니다. `objdump -d contend`로 보면 `inc_faa`는 `ldadd x9, x8, [x8]` 한 명령이라 재시도 루프가 없지만, 이 측정에서 CAS loop와의 차이는 라운드 간 흔들림보다 작았습니다.

### Tagged pointer로 ABA 회피

포인터와 함께 매번 1씩 늘어나는 tag를 같이 비교하면, 같은 주소가 돌아와도 tag가 달라 CAS가 실패합니다. 그러려면 16바이트를 한 번에 CAS해야 하는데, 이것이 lock-free인지는 플랫폼마다 다릅니다.

```cpp
// tagged.cpp — is a 16-byte {pointer, tag} atomic lock-free here?
#include <atomic>
#include <cstdint>
#include <cstdio>

struct node;
struct tagged_ptr { node *p; std::uint64_t tag; };
std::atomic<tagged_ptr> top{tagged_ptr{nullptr, 0}};

bool bump(tagged_ptr expected)
{
    return top.compare_exchange_weak(expected, tagged_ptr{expected.p, expected.tag + 1});
}

int main()
{
    std::printf("sizeof(tagged_ptr) = %zu, is_always_lock_free = %d, is_lock_free() = %d\n",
                sizeof(tagged_ptr), (int)std::atomic<tagged_ptr>::is_always_lock_free,
                (int)top.is_lock_free());
    return bump(tagged_ptr{nullptr, 0}) ? 0 : 1;
}
```

```text
### macOS: clang++ -std=c++17 -O2 tagged.cpp -o tagged && ./tagged   (Apple clang 21.0.0)
sizeof(tagged_ptr) = 16, is_always_lock_free = 1, is_lock_free() = 1
exit=0
10000054c:     	caspal	x4, x5, x2, x3, [x8]
### Debian 13 arm64 (g++ 14.2.0)
$ g++ -std=c++17 -O2 tagged.cpp -o tagged
/usr/bin/ld: /tmp/ccE8H5sx.o: in function `bump(tagged_ptr)':
tagged.cpp:(.text+0x28): undefined reference to `__atomic_compare_exchange_16'
/usr/bin/ld: /tmp/ccE8H5sx.o: in function `main':
tagged.cpp:(.text.startup+0x10): undefined reference to `__atomic_is_lock_free'
collect2: error: ld returned 1 exit status
$ g++ -std=c++17 -O2 tagged.cpp -o tagged -latomic && ./tagged; echo exit=$?
sizeof(tagged_ptr) = 16, is_always_lock_free = 0, is_lock_free() = 0
exit=0
$ objdump -d --no-show-raw-insn -C tagged | grep -E 'bl.*<(bump|__atomic_compare_exchange_16)'
 7b4:	bl	940 <bump(tagged_ptr)>
 968:	bl	700 <__atomic_compare_exchange_16@plt>
```

macOS의 Apple clang은 이 16바이트 CAS를 LSE `caspal` 한 명령으로 만들었고 `is_always_lock_free`가 1이었습니다. Debian의 g++ 14.2.0은 `is_always_lock_free`가 0이었고, CAS를 libatomic의 `__atomic_compare_exchange_16` 호출로 보냈으며 `-latomic` 없이는 링크되지 않았습니다. 런타임 `is_lock_free()`도 0을 돌려줬습니다. 같은 M2 위의 같은 코드라도 컴파일러와 런타임 라이브러리에 따라 lock-free 여부가 달라집니다. Tag가 몇 비트면 충분한지와 다른 ABA 회피법은 [9-08](/blog/embedded/modern-recipes/part9-08-aba-problem)에서 다룹니다.

### Compare-exchange + sequence number

Vyukov의 bounded MPMC queue는 CAS로 enqueue 위치를 예약하고, 칸마다 둔 sequence 번호로 "이 칸이 지금 쓸 수 있는가"와 "다 썼다"를 알립니다. 아래는 [9-10](/blog/embedded/modern-recipes/part9-10-mpmc-queue)에서 TSan으로 시험한 구현의 enqueue 부분입니다.

```cpp
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
```

CAS가 실패했을 때는 `pos`가 이미 최신 값으로 갱신돼 있으므로 바로 다시 시도합니다. 칸의 sequence가 앞서 있으면(`dif > 0`) 다른 생산자가 앞질렀으니 위치를 다시 읽고, 뒤처져 있으면(`dif < 0`) 큐가 가득 찬 것입니다. CAS가 실패했을 때 `false`를 돌려주면 "가득 참"과 "경합으로 한 번 졌음"을 구분하지 못하므로, 실패는 재시도로 처리합니다. `intptr_t` 차이 계산과 세 갈래 분기는 1024cores 원문 그대로입니다([2022-11-27 보관본](https://web.archive.org/web/20221127075938/https://www.1024cores.net/home/lock-free-algorithms/queues/bounded-mpmc-queue)).

## 측정 / 성능 비교

위 `contend.cpp`의 결과가 이 글의 측정입니다(Apple M2 Pro, macOS 27.2.1, Apple clang 21.0.0, `-O2`).

| 스레드 | `fetch_add` (M incs/s) | CAS loop | CAS loop + backoff |
| ---: | --- | --- | --- |
| 1 | 379~490 | 426~487 | 253~449 |
| 2 | 148~226 | 151~334 | 202~275 |
| 4 | 78~103 | 77~102 | 80~174 |
| 8 | 43~123 | 62~116 | 64~89 |

스레드가 하나에서 둘로 늘자 세 방식 모두 처리량이 크게 떨어졌습니다. 카운터 하나가 담긴 cache line이 두 코어 사이를 오가기 시작하기 때문입니다. 이 표에서 확실한 결론은 "공유 카운터 하나에 여럿이 쓰면 방식과 상관없이 느려진다"까지입니다. 그래서 가장 효과가 큰 처방은 CAS를 더 잘 거는 것이 아니라, 스레드마다 자기 카운터를 두고 읽을 때 합치는 sharding입니다([9-03](/blog/embedded/modern-recipes/part9-03-rcu-basics)의 per-CPU 카운터).

## 자주 보는 함정

> ⚠️ Loop 안에서 strong

```cpp
long cur = p.load();
while (!p.compare_exchange_strong(cur, cur + 1)) {}   /* inner retry loop on LL/SC machines */
```

위 ARMv8.0 출력처럼 strong은 안에 재시도 루프를 하나 더 갖습니다. 바깥에 이미 loop가 있으면 weak를 씁니다. LSE 코어에서는 둘이 같은 명령이라 차이가 없습니다.

> ⚠️ CAS 결과를 무시

```cpp
p.compare_exchange_weak(cur, next);    /* may have failed, even spuriously */
```

Weak CAS는 값이 같아도 실패할 수 있습니다(p27). 반환값을 보지 않으면 갱신이 조용히 빠집니다.

> ⚠️ Backoff 없이 hot CAS — 그리고 backoff가 늘 답은 아님

위 측정처럼 이 Mac에서는 backoff가 일관되게 이기지 않았습니다. 경합 자체를 줄이는 sharding이 먼저이고, backoff는 잰 뒤에 넣습니다.

> ⚠️ Publish하는 CAS를 relaxed로 씀

```cpp
// relaxed_push.cpp — publishing a node with a relaxed CAS, then reading its payload
#include <atomic>
#include <cstdio>
#include <thread>

struct node { node *next; int val; };
std::atomic<node *> top{nullptr};

#ifndef PUSH_ORDER
#define PUSH_ORDER std::memory_order_relaxed
#endif

int main()
{
    std::thread producer([] {
        for (int i = 0; i < 1000; i++) {
            node *n = new node{nullptr, i};       // plain writes to the node
            node *cur = top.load(std::memory_order_relaxed);
            do { n->next = cur; } while (!top.compare_exchange_weak(cur, n, PUSH_ORDER,
                                                                      std::memory_order_relaxed));
        }
    });
    long seen = 0;
    for (int spins = 0; spins < 1000000; spins++)
        if (node *n = top.load(std::memory_order_acquire)) seen += n->val;   // reads n->val
    producer.join();
    std::printf("done (%ld)\n", seen);
}
```

```text
$ clang++ -std=c++17 -O2 -g -fsanitize=thread relaxed_push.cpp -o rp && ./rp
WARNING: ThreadSanitizer: data race (pid=51364)
  Read of size 4 at 0x00010cf00b98 by main thread:
    #0 main relaxed_push.cpp:25 (rp:arm64+0x1000007b4)
  Previous write of size 4 at 0x00010cf00b98 by thread T1:
    #0 main::$_0::operator()() const relaxed_push.cpp:17 (rp:arm64+0x1000008dc)
SUMMARY: ThreadSanitizer: data race relaxed_push.cpp:25 in main
done (997762239)
ThreadSanitizer: reported 1 warnings
exit=134
$ clang++ -std=c++17 -O2 -g -fsanitize=thread -DPUSH_ORDER=std::memory_order_release relaxed_push.cpp -o rp2 && ./rp2
done (985415448)
exit=0
```

Producer가 `new node{nullptr, i}`로 쓴 `val`을 consumer가 읽는데, push의 CAS가 relaxed면 둘 사이에 happens-before가 없어 TSan이 data race를 보고했습니다. `-DPUSH_ORDER=std::memory_order_release`로 바꾸면 consumer의 acquire load와 짝을 이뤄 경고가 사라졌습니다. 다른 스레드가 읽을 데이터를 공개하는 CAS는 성공 쪽을 release 이상으로 둡니다.

> ⚠️ ABA 무시

```cpp
node *cur = top.load();
while (cur && !top.compare_exchange_weak(cur, cur->next)) {}   /* cur may be freed and reused */
```

`cur`가 꺼내져 해제되고 같은 주소로 다시 할당돼 `top`에 돌아오면 CAS는 성공하지만 `cur->next`는 옛 값입니다. [9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)의 hazard pointer나 위의 tagged pointer로 막고, 자세한 재현은 [9-08](/blog/embedded/modern-recipes/part9-08-aba-problem)에서 봅니다.

## 정리

- CAS는 "값이 그대로면 바꾼다"를 원자적으로 하는 연산이고, 실패하면 최신 값을 돌려줍니다.
- Weak는 spurious failure를 허용합니다(C++ [atomics.types.operations]p27). ARMv8.0에서는 strong이 안쪽 재시도 루프를 하나 더 가졌고, ARMv8.1 LSE에서는 둘 다 `cas` 한 명령이었습니다.
- Saturating counter는 CAS loop로 정확히 MAX에서 멈췄습니다.
- 16바이트 tagged pointer CAS는 macOS clang에서 `caspal`, Debian g++에서는 libatomic 호출이었습니다.
- 이 Mac에서 backoff는 일관되게 이기지 않았습니다. 공유 카운터 경합은 sharding으로 줄입니다.
- 데이터를 공개하는 CAS가 relaxed면 TSan이 race를 보고했습니다. 성공 쪽은 release로 둡니다.

다음 편은 [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)입니다. Memory order마다 ARM 명령이 어떻게 달라지는지 봅니다.

## 관련 항목

- [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)
- [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
- [ECPP 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
