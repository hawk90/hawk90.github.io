---
title: "Chapter 5: 동기화 프리미티브의 상대적 능력"
date: 2026-05-12T05:00:00
description: "Consensus 문제로 동기화 도구의 위계를 정의한다. read/write는 0, FAA/test-and-set는 2, CAS는 무한대."
series: "The Art of Multiprocessor Programming"
seriesOrder: 5
tags: [parallel, concurrency, book-review, amp, consensus, cas, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 5 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 5.1 왜 동기화의 "능력"인가

하드웨어가 제공하는 동기화 프리미티브는 다양하다.

- read / write (그냥 메모리)
- test-and-set
- fetch-and-add (FAA)
- compare-and-swap (CAS)
- load-link / store-conditional (LL/SC)

이 도구들은 모두 같은 능력을 가지는가? **아니다**. Herlihy의 충격적 결과는 이 도구들 사이에 **위계**가 존재한다는 것이다.

## 5.2 Consensus 문제

위계를 정의하는 도구는 **consensus**다.

**Consensus 문제**:
- N개의 스레드가 각자 입력값을 가진다
- 모두가 같은 출력값에 동의해야 한다
- 그 출력값은 누군가의 입력값이어야 한다
- **Wait-free**해야 한다

```
스레드 1: input = 5
스레드 2: input = 7
스레드 3: input = 9

→ 모두 같은 출력 (5 또는 7 또는 9 중 하나)
```

## 5.3 Consensus Number

객체 X의 **consensus number** = X와 read/write 레지스터만 사용해서 N 스레드 consensus를 wait-free로 풀 수 있는 최대 N.

이 수가 동기화 프리미티브의 "능력"이다.

## 5.4 Read/Write의 Consensus Number

**놀라운 사실** — read/write 레지스터만으로는 **2-consensus도 못 푼다**.

증명은 우아하다. 2 스레드 consensus를 read/write만으로 풀려고 시도하면, 어느 시점에서 두 스레드의 상태가 구분 불가능한 "두 가지 가능한 결과"의 상태에 도달할 수 있고, 그 상태에서 어느 쪽이 먼저 작업해도 결과가 갈린다 — wait-free 불가능.

```
Read/Write의 Consensus Number = 1
```

이게 5장의 핵심 결과 중 하나다. **read/write만으로는 wait-free 동기화를 거의 못 한다**.

## 5.5 Test-and-Set, FAA의 Consensus Number

```cpp
// C++20: Test-and-Set 시뮬레이션
#include <atomic>

class TestAndSet {
    std::atomic<bool> state{false};

public:
    bool testAndSet() {
        // atomic하게: old = state; state = true; return old
        return state.exchange(true, std::memory_order_seq_cst);
    }

    void reset() {
        state.store(false, std::memory_order_seq_cst);
    }
};
```

```c
// C11: Test-and-Set 시뮬레이션
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    _Atomic bool state;
} TestAndSet;

void tas_init(TestAndSet* t) {
    atomic_init(&t->state, false);
}

bool tas_test_and_set(TestAndSet* t) {
    // atomic하게: old = state; state = true; return old
    return atomic_exchange_explicit(&t->state, true, memory_order_seq_cst);
}

void tas_reset(TestAndSet* t) {
    atomic_store_explicit(&t->state, false, memory_order_seq_cst);
}
```

**Test-and-Set**으로 2-consensus를 풀 수 있다.

```cpp
// C++20: Test-and-Set 기반 2-consensus
#include <atomic>
#include <optional>

class TASConsensus {
    std::atomic<bool> lock{false};
    std::atomic<int> decision{-1};  // -1은 미결정

public:
    int decide(int my_input) {
        // 첫 번째 시도자가 결정
        if (!lock.exchange(true, std::memory_order_seq_cst)) {
            // 내가 첫 번째
            decision.store(my_input, std::memory_order_seq_cst);
            return my_input;
        } else {
            // 다른 스레드가 먼저
            while (decision.load(std::memory_order_seq_cst) == -1) {
                // 결정 대기
            }
            return decision.load(std::memory_order_seq_cst);
        }
    }
};
```

```c
// C11: Test-and-Set 기반 2-consensus
#include <stdatomic.h>

typedef struct {
    _Atomic bool lock;
    _Atomic int decision;  // -1은 미결정
} TASConsensus;

void tas_consensus_init(TASConsensus* c) {
    atomic_init(&c->lock, false);
    atomic_init(&c->decision, -1);
}

int tas_consensus_decide(TASConsensus* c, int my_input) {
    // 첫 번째 시도자가 결정
    if (!atomic_exchange_explicit(&c->lock, true, memory_order_seq_cst)) {
        // 내가 첫 번째
        atomic_store_explicit(&c->decision, my_input, memory_order_seq_cst);
        return my_input;
    } else {
        // 다른 스레드가 먼저
        int result;
        while ((result = atomic_load_explicit(&c->decision,
                memory_order_seq_cst)) == -1) {
            // 결정 대기
        }
        return result;
    }
}
```

첫 testAndSet에서 false를 받은 스레드가 자기 input을 결정으로 쓴다. 다른 스레드는 그것을 읽는다.

그러나 **3 스레드** consensus는 풀 수 없다. (자세한 증명 생략)

```
Test-and-Set, FAA의 Consensus Number = 2
```

## 5.6 Compare-and-Swap의 Consensus Number

```cpp
// C++20: Compare-and-Swap (CAS)
#include <atomic>

class CASObject {
    std::atomic<int> state{0};

public:
    bool compareAndSwap(int expected, int new_value) {
        // atomic하게: if (state == expected) { state = new_value; return true; }
        //            else { return false; }
        return state.compare_exchange_strong(expected, new_value,
                std::memory_order_seq_cst,
                std::memory_order_seq_cst);
    }

    int get() {
        return state.load(std::memory_order_seq_cst);
    }
};
```

```c
// C11: Compare-and-Swap (CAS)
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    _Atomic int state;
} CASObject;

void cas_init(CASObject* c) {
    atomic_init(&c->state, 0);
}

bool cas_compare_and_swap(CASObject* c, int expected, int new_value) {
    // atomic하게: if (state == expected) { state = new_value; return true; }
    //            else { return false; }
    return atomic_compare_exchange_strong_explicit(&c->state,
            &expected, new_value,
            memory_order_seq_cst,
            memory_order_seq_cst);
}

int cas_get(CASObject* c) {
    return atomic_load_explicit(&c->state, memory_order_seq_cst);
}
```

**CAS**는 무한히 많은 스레드의 consensus를 풀 수 있다.

```cpp
// C++20: CAS 기반 N-consensus
#include <atomic>

class CASConsensus {
    std::atomic<int> decision{-1};  // -1은 미결정 (sentinel)

public:
    int decide(int my_input) {
        int expected = -1;
        if (decision.compare_exchange_strong(expected, my_input,
                std::memory_order_seq_cst,
                std::memory_order_seq_cst)) {
            // 내가 처음 — 내 input이 결정
            return my_input;
        } else {
            // 다른 스레드가 먼저 — 그 값을 반환
            // (expected에 실제 값이 들어있음)
            return expected;
        }
    }
};
```

```c
// C11: CAS 기반 N-consensus
#include <stdatomic.h>

typedef struct {
    _Atomic int decision;  // -1은 미결정 (sentinel)
} CASConsensus;

void cas_consensus_init(CASConsensus* c) {
    atomic_init(&c->decision, -1);
}

int cas_consensus_decide(CASConsensus* c, int my_input) {
    int expected = -1;
    if (atomic_compare_exchange_strong_explicit(&c->decision,
            &expected, my_input,
            memory_order_seq_cst,
            memory_order_seq_cst)) {
        // 내가 처음 — 내 input이 결정
        return my_input;
    } else {
        // 다른 스레드가 먼저 — expected에 실제 값이 들어있음
        return expected;
    }
}
```

CAS는 **첫 번째 시도자만 성공**하게 만든다. 나머지는 그 결과를 따른다. 스레드 수가 N개여도 작동한다.

```
CAS의 Consensus Number = ∞
```

## 5.7 결과 — 동기화 위계

| Consensus Number | 동기화 도구 |
|---|---|
| 1 | read / write 레지스터 |
| 2 | test-and-set, fetch-and-add, 큐, 스택 |
| ∞ | compare-and-swap, load-link/store-conditional |

이게 동기화 도구의 위계다. 낮은 수의 도구로는 높은 수의 도구를 시뮬레이션할 수 없다.

## 5.8 왜 이게 중요한가

이 결과의 실용적 의미.

**1. CAS는 "universal"**

CAS만 있으면 어떤 wait-free 동기화 문제도 풀 수 있다. 그래서 모든 모던 lock-free 자료구조가 CAS를 핵심 도구로 쓴다.

**2. test-and-set은 부족**

스핀 락을 구현하는 데는 test-and-set으로 충분하다. 그러나 더 복잡한 wait-free 자료구조 (queue, stack, list)에는 CAS가 필요하다.

**3. read/write만으로는 한계**

순수 read/write만 쓰는 알고리즘은 wait-free가 불가능하거나, 매우 제한적이다. Lamport's Bakery 같은 알고리즘이 가능한 건 그것이 **wait-free가 아니기 때문**이다 (다른 스레드의 진행에 의존).

## 5.9 C++20/23과 C11의 프리미티브

```cpp
// C++20: 각 프리미티브의 실제 사용
#include <atomic>

std::atomic<int> counter{0};
std::atomic<bool> flag{false};

// Read/Write (Consensus Number 1)
void read_write_example() {
    int val = counter.load(std::memory_order_seq_cst);      // read
    counter.store(val + 1, std::memory_order_seq_cst);      // write
}

// Exchange / Test-and-Set (Consensus Number 2)
void exchange_example() {
    bool old = flag.exchange(true, std::memory_order_seq_cst);  // TAS
    int prev = counter.exchange(42, std::memory_order_seq_cst);
}

// Fetch-and-Add (Consensus Number 2)
void faa_example() {
    int old = counter.fetch_add(1, std::memory_order_seq_cst);  // FAA
    counter.fetch_sub(1, std::memory_order_seq_cst);
}

// Compare-and-Swap (Consensus Number ∞)
void cas_example() {
    int expected = 0;
    bool success = counter.compare_exchange_strong(expected, 1,
            std::memory_order_seq_cst,
            std::memory_order_seq_cst);

    // weak 버전 — 루프에서 사용
    expected = counter.load();
    while (!counter.compare_exchange_weak(expected, expected + 1,
            std::memory_order_seq_cst,
            std::memory_order_relaxed)) {
        // expected가 자동으로 갱신됨
    }
}
```

```c
// C11: 각 프리미티브의 실제 사용
#include <stdatomic.h>
#include <stdbool.h>

_Atomic int counter = 0;
_Atomic bool flag = false;

// Read/Write (Consensus Number 1)
void read_write_example(void) {
    int val = atomic_load_explicit(&counter, memory_order_seq_cst);   // read
    atomic_store_explicit(&counter, val + 1, memory_order_seq_cst);   // write
}

// Exchange / Test-and-Set (Consensus Number 2)
void exchange_example(void) {
    bool old = atomic_exchange_explicit(&flag, true, memory_order_seq_cst);  // TAS
    int prev = atomic_exchange_explicit(&counter, 42, memory_order_seq_cst);
}

// Fetch-and-Add (Consensus Number 2)
void faa_example(void) {
    int old = atomic_fetch_add_explicit(&counter, 1, memory_order_seq_cst);  // FAA
    atomic_fetch_sub_explicit(&counter, 1, memory_order_seq_cst);
}

// Compare-and-Swap (Consensus Number ∞)
void cas_example(void) {
    int expected = 0;
    bool success = atomic_compare_exchange_strong_explicit(&counter,
            &expected, 1,
            memory_order_seq_cst,
            memory_order_seq_cst);

    // weak 버전 — 루프에서 사용
    expected = atomic_load_explicit(&counter, memory_order_seq_cst);
    while (!atomic_compare_exchange_weak_explicit(&counter,
            &expected, expected + 1,
            memory_order_seq_cst,
            memory_order_relaxed)) {
        // expected가 자동으로 갱신됨
    }
}
```

## 5.10 ARM/x86의 실제 프리미티브

| 아키텍처 | 프리미티브 | Consensus Number |
|---|---|---|
| x86 | LOCK CMPXCHG (CAS) | ∞ |
| x86 | LOCK XADD (FAA) | 2 |
| ARM | LDREX/STREX (LL/SC) | ∞ |
| ARM | LDADD (FAA, ARMv8.1) | 2 |

모던 CPU는 CAS 또는 LL/SC를 제공한다. 그래서 lock-free 알고리즘이 가능하다.

## 5.11 Universal Construction 예고

다음 장의 예고 — **임의의 객체를 wait-free로 구현할 수 있다**, CAS만 있으면.

```
Universal Construction:
순차 명세 + CAS → wait-free 구현
```

이게 6장에서 본격적으로 다룬다. CAS가 "universal"이라는 의미가 명확해진다.

## 정리

- **동기화 도구의 위계** — Consensus Number로 정의
- **Read/Write** — Consensus Number 1, wait-free 동기화 거의 못 함
- **Test-and-Set, FAA** — Consensus Number 2, 스핀 락 OK
- **CAS** — Consensus Number ∞, universal
- 모든 모던 lock-free 자료구조의 핵심 도구가 CAS인 이유

## 한국 개발자의 함정

```
1. *atomic은 모두 같은 능력*이라는 오해
   - read/write atomic (con. number 1)
   - TAS/FAA (con. number 2)
   - CAS (con. number ∞)
   - 셋이 *다른 위계*

2. *FAA로 충분*하다는 착각
   - 큐 enqueue는 OK
   - 일반 자료구조는 CAS 필요

3. *CAS 한 번이면 끝*
   - CAS 루프 (compare_exchange_weak in loop)
   - ABA 문제 (다음 챕터)

4. *compare_exchange_strong vs weak* 혼동
   - strong: 항상 실제 비교 수행
   - weak: spurious failure 가능 (루프에서 사용)
   - 성능 차이 — weak가 일부 아키텍처에서 더 빠름
```

## 실무 적용

```
이론 → 실무:
- read/write atomic    → bool / int 단순 플래그
- TAS                  → 가장 단순한 spinlock
- FAA                  → counter, sequencer
- CAS                  → lock-free queue / stack / hash

C++20/23 atomic:
- std::atomic<T>::load() / store()       — read/write
- std::atomic<T>::exchange()             — TAS-like
- std::atomic<T>::fetch_add()            — FAA
- std::atomic<T>::compare_exchange_*()   — CAS

C11 atomic:
- atomic_load() / atomic_store()         — read/write
- atomic_exchange()                      — TAS-like
- atomic_fetch_add()                     — FAA
- atomic_compare_exchange_*()            — CAS

Java:
- AtomicInteger.get() / set()            — read/write
- AtomicBoolean.getAndSet()              — TAS
- AtomicInteger.incrementAndGet()        — FAA
- AtomicReference.compareAndSet()        — CAS
```

## 자기 점검

```
□ Consensus Number 정의?
□ FLP impossibility (read/write 한계)?
□ TAS / FAA / CAS의 consensus number?
□ CAS가 universal하다는 의미?
□ ABA 문제 미리 예측?
□ compare_exchange_strong vs weak 차이?
```

## 다음 장 예고

다음 장은 **Universality of Consensus** — CAS가 왜 universal한지의 증명.

## 관련 항목

- [Ch 4: 공유 메모리 기초](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory)
- [Ch 6: Universality of Consensus](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem) — ABA 문제
- [C++ Concurrency in Action Ch 5: 메모리 모델](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types) — `compare_exchange_strong`
