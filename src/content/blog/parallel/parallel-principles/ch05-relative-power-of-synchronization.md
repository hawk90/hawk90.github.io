---
title: "Chapter 5: 동기화 프리미티브의 상대적 능력"
date: 2026-05-06T05:00:00
description: "Consensus 문제로 동기화 도구의 위계를 정의한다. read/write는 0, FAA/test-and-set는 2, CAS는 무한대."
series: "The Art of Multiprocessor Programming"
seriesOrder: 5
tags: [parallel, concurrency, book-review, amp, consensus, cas, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
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

위계를 정의하는 도구는 **consensus**다. 형식적으로 다음 세 속성을 동시에 만족하는 wait-free 객체를 가리킨다.

```text
N-process Consensus Object:

  proposed[i] = 스레드 i가 제안한 입력
  decide(i)   = 스레드 i가 받는 결정값

  속성:
  (1) Consistency / Agreement
      ∀ i, j:  decide(i) == decide(j)
      모든 스레드는 같은 값을 결정한다.

  (2) Validity
      ∃ i:  decide(j) == proposed[i] for all j
      결정값은 *누군가가 실제로 제안한 값*이어야 한다.
      "기본값 42를 항상 반환" 같은 trivial한 풀이는 무효.

  (3) Wait-Freedom
      decide()는 유한한 step 안에 반드시 반환한다.
      다른 스레드의 진행 속도와 무관.
```

```text
예시 — 3-process consensus:
  스레드 1: input = 5
  스레드 2: input = 7
  스레드 3: input = 9

  → 모두 같은 출력. 5, 7, 9 중 하나. (구현에 따라 달라짐)
  → 단, 출력은 셋 중 하나여야 함 — 임의 값 안 됨.
```

Wait-freedom이 가장 까다로운 조건이다. 다음 절들에서 보겠지만, 어떤 객체는 *겹치는 호출이 없을 때*에는 쉽게 풀지만, *겹칠 때*는 무한 루프에 빠질 수 있다. 그런 풀이는 consensus를 "푼다"고 부르지 않는다.

## 5.3 Consensus Number

객체 X의 **consensus number** = X와 read/write 레지스터만 사용해서 N 스레드 consensus를 wait-free로 풀 수 있는 최대 N.

이 수가 동기화 프리미티브의 "능력"이다.

## 5.4 Read/Write의 Consensus Number

**놀라운 사실** — read/write 레지스터만으로는 **2-consensus도 못 푼다**. 책의 **Theorem 5.4.1**.

### Critical State 증명 기법

증명은 "critical state argument"라 불리는 우아한 기법을 쓴다.

```text
정의 (state의 분류):
  bivalent  — 이 상태에서 0/1 모두 미래 결정값으로 가능.
  0-valent  — 어떤 step 순서로도 결정값은 0이 됨.
  1-valent  — 어떤 step 순서로도 결정값은 1이 됨.
  univalent = 0-valent ∪ 1-valent.

  critical state — bivalent이면서, 두 스레드 A, B의
                   다음 한 step만 다르게 실행하면 0-valent / 1-valent로
                   각각 갈리는 상태.
```

이런 critical state는 *반드시 존재한다*. 초기 상태는 두 스레드의 입력이 (0,1)이면 bivalent — 누가 먼저 어떻게 진행하든 0이 결정될 수도, 1이 결정될 수도 있는 시작점. 알고리즘이 진행하면 결국 univalent에 도달해야 한다 (그래야 합의가 성립). 그 경계 어딘가에 critical state가 있다.

### 모순 도출

이제 critical state에서 무슨 일이 일어나는지 본다. A의 다음 step과 B의 다음 step이 모두 read/write라고 가정.

```text
case 1 — A와 B가 *서로 다른 레지스터*에 작업:
   A가 자기 레지스터 r_A에 read/write.
   B는 r_A를 본 적도, 볼 일도 없음.
   그러므로 B의 시각에서 "A가 한 step 했는지 안 했는지" 구분 불가.
   → A step 후의 상태에서 B만 단독으로 끝까지 실행한 결과
     = A가 아무것도 안 한 상태에서 B만 단독으로 실행한 결과.
   둘은 같은 결정값을 내야 함. 그런데 가정상 둘은 0/1로 갈린다 — 모순.

case 2 — A와 B가 *같은 레지스터 r*에 작업:
   2a) 둘 다 read:    r에 변화 없음 — case 1과 같은 모순.
   2b) A write, B read:
        A가 먼저 write하든 안 하든, B가 단독 실행하는 동안
        한 번 더 read해서 A의 흔적을 본다 할지라도,
        B 혼자만 실행할 때 결정은 미리 정해져 있어야 함 — 모순 도출.
   2c) 둘 다 write:
        write 순서가 어떻든 *마지막에 남는 값은 둘째 write*.
        즉 A 먼저 write → B write 한 상태 = B만 single-write한 상태.
        두 시나리오에서 결정값은 같아야 함 — 모순.
```

모든 경우가 모순이므로, critical state 자체가 존재할 수 없다 — 그러나 critical state는 위에서 봤듯 반드시 존재해야 한다. 가정이 잘못된 것이다. 가정은 "read/write만으로 wait-free 2-consensus가 풀린다". 따라서 이 가정은 거짓.

```
∴  Read/Write의 Consensus Number = 1
```

이게 5장의 핵심 결과 중 하나다. **read/write만으로는 wait-free 동기화를 거의 못 한다**. Critical state 기법은 이후 모든 lower bound 증명에서 재활용된다.

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

### FIFO Queue의 Consensus Number — Theorem 5.6.2

같은 카테고리에 **FIFO queue**가 들어간다. 큐의 consensus number가 정확히 2임을 증명한다.

```text
2-consensus 풀이 (queue를 보조 객체로 사용):

  shared queue Q = init [WINNER, LOSER]   // 두 token 미리 enqueue
  shared int proposed[2]                  // 각자의 입력 기록

  decide(i, my_input):
      proposed[i] = my_input
      token = Q.dequeue()                 // 둘 중 하나 받음
      if token == WINNER:
          return proposed[i]
      else:
          return proposed[1 - i]
```

WINNER를 받은 스레드의 입력이 결정값. queue의 FIFO 속성이 단 한 명의 winner를 보장한다.

그러나 *3-consensus*는 큐만으로 못 푼다. 증명은 critical state 기법의 변형 — 두 스레드 A, B가 모두 큐에 next step으로 dequeue를 한다고 하자.

```text
case — A와 B가 모두 큐의 다음 dequeue 권한을 노림:
   A가 먼저 dequeue: A는 head, B는 그 다음 element를 가져감.
   B가 먼저 dequeue: B는 head, A는 그 다음 element를 가져감.

   queue 입장에서 보면, 두 시나리오에서 *남은 queue 상태*가 다르다.
   그러나 *제3의 스레드 C* 단독으로 끝까지 실행하면,
   C는 어느 시나리오에서든 같은 결정을 내야 함 — 그런데 큐 상태가 다르니
   C가 다른 token을 받을 수 있고, 결정이 갈릴 수 있음.
```

좀 더 정밀한 인자가 필요하지만, 결론은: FIFO queue로는 정확히 2 스레드까지만 wait-free consensus 가능하다.

```
FIFO Queue의 Consensus Number = 2
```

같은 결과가 stack, fetch-and-add, test-and-set, swap에도 성립한다. 이들은 모두 **2-consensus까지만 풀 수 있는 "synchronization primitives의 두 번째 계층"**이다.

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

### Theorem 5.10.1 — CAS의 N-consensus 보편 풀이

이게 책의 **Theorem 5.10.1**의 핵심이다. CAS가 임의의 N에 대해 wait-free N-consensus를 푸는 알고리즘이 존재한다.

```text
정확성 분석:

  agreement:
    decision 객체는 단 한 번 NULL → v 로만 천이.
    이후 어떤 CAS도 expected=NULL과 매칭 실패 → 모두 같은 v를 받음.

  validity:
    v는 어떤 스레드의 my_input이었음 — 누군가가 실제로 제안한 값.

  wait-freedom:
    CAS 한 번이면 종료. 실패해도 expected에 결정값이 들어와 즉시 반환.
    재시도 루프 없음 — 정확히 O(1) step.
```

이게 wait-free 보장의 가장 강한 형태다. **Bounded wait-free** — 단 한 번의 atomic operation으로 끝난다.

```
CAS의 Consensus Number = ∞
```

### Wait-Free Hierarchy의 시사점

5장 마지막에서 책은 **Wait-Free Hierarchy Theorem**을 정리한다.

```text
Consensus number c인 객체로는,
  c개 이하의 스레드 환경에서만 임의의 wait-free 동시 객체를 구현 가능.
  c+1 이상의 스레드에 대해서는 *어떤 객체* 구현이 원천 불가능.
```

이게 6장의 **Universal Construction**으로 가는 다리다. CAS는 consensus number ∞이므로, **모든** N에 대해 모든 객체를 wait-free로 구현할 수 있다 — 즉 universal.

```text
Hierarchy 위계 요약:
  level 1:  read/write 단독       — wait-free 객체 구현 거의 불가능
  level 2:  TAS, FAA, queue, stack — 2 스레드까지만 OK
  level ∞:  CAS, LL/SC             — 임의 N에서 OK (universal)
```

이 위계는 *영원하다* — read/write를 백날 조합해도 TAS를 못 만들고, TAS를 백날 조합해도 CAS를 못 만든다. 하드웨어가 그 능력을 직접 제공해야 한다.

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
