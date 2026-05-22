---
title: "Chapter 7: 스핀 락과 경합"
date: 2026-05-06T07:00:00
description: "스핀 락의 설계 — TAS, TTAS, exponential backoff, queue locks (Anderson, CLH, MCS)."
series: "The Art of Multiprocessor Programming"
seriesOrder: 7
tags: [parallel, concurrency, book-review, amp, spinlock, mcs, clh, cache, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 7 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 들어가며 — *기다림*의 두 자세

락을 못 잡았을 때 스레드는 무엇을 할 수 있는가. 두 가지뿐이다. *잠들거나*, *계속 시도하거나*. 잠드는 쪽은 OS의 도움이 필요하다. 깨우는 데에도 도움이 필요하다. 컨텍스트 스위치, 스케줄러 호출, TLB 비우기. 모두 합쳐 수 µs 단위의 비용이다.

이 비용이 *락 보유 시간*보다 크다면 잠드는 쪽이 손해다. 짧게 잡고 짧게 쓰는 락이라면 그냥 *서서 기다리는* 편이 빠르다. 이 챕터는 그 *서서 기다리는* 락 — **스핀 락** — 의 설계를 다룬다.

비유로 옮기면 다음과 같다.

| 상황 | 잠들기 (blocking lock) | 서서 기다리기 (spin lock) |
|---|---|---|
| 화장실 줄 | 의자에 앉아 잡지 읽다 차례 오면 알림 | 문 앞에 서서 손잡이 계속 잡아당기기 |
| 비용 | 의자로 가는 시간 + 알림 받는 시간 | 손잡이 잡아당기는 동안 다른 일 못 함 |
| 유리한 조건 | 차례까지 오래 걸릴 때 | 차례가 *금방* 올 때 |

이 챕터의 모든 알고리즘은 *서서 기다리는 방식*을 점점 정교하게 만든다. TAS는 무작정 잡아당긴다. TTAS는 *문틈으로 먼저 살핀다*. backoff는 *몇 초 기다렸다 다시 잡는다*. queue lock은 *번호표를 받아 줄을 선다*. 비유의 진화가 곧 알고리즘의 진화다.

## 7.1 왜 스핀 락인가

뮤텍스 / 세마포어는 OS의 도움을 받는다. 락을 못 잡으면 OS가 스레드를 재운다 (block). 깨우는 데 컨텍스트 스위치 비용이 든다.

**스핀 락**(spin lock)은 OS를 안 부른다. 락을 못 잡으면 그냥 **반복해서 시도**한다.

```cpp
// C++20 스핀 락의 기본 개념
#include <atomic>

class SpinLock {
    std::atomic_flag flag_ = ATOMIC_FLAG_INIT;
public:
    void lock() {
        while (flag_.test_and_set(std::memory_order_acquire)) {
            // busy-wait
        }
    }

    void unlock() {
        flag_.clear(std::memory_order_release);
    }

    bool try_lock() {
        return !flag_.test_and_set(std::memory_order_acquire);
    }
};
```

```c
// C11 스핀 락의 기본 개념
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    atomic_flag flag;
} SpinLock;

void spinlock_init(SpinLock* lock) {
    atomic_flag_clear(&lock->flag);
}

void spinlock_lock(SpinLock* lock) {
    while (atomic_flag_test_and_set_explicit(&lock->flag, memory_order_acquire)) {
        // busy-wait
    }
}

void spinlock_unlock(SpinLock* lock) {
    atomic_flag_clear_explicit(&lock->flag, memory_order_release);
}

bool spinlock_try_lock(SpinLock* lock) {
    return !atomic_flag_test_and_set_explicit(&lock->flag, memory_order_acquire);
}
```

**언제 스핀 락이 좋은가**:
- 락 보유 시간이 매우 짧을 때 (수 µs 이하)
- 컨텍스트 스위치 비용이 클 때
- 멀티코어 (싱글 코어에서는 의미 없음)

**언제 안 좋은가**:
- 락 보유 시간이 길 때
- 스레드 수 ≥ 코어 수일 때
- 우선순위 역전 가능 시스템

## 7.2 가장 단순한 스핀 락 — TAS Lock

> **비유** — *공용 화장실 문 앞에 선 사람들*. 모두가 손잡이를 *동시에* 잡아당긴다. 누군가 들어가면 손잡이가 잠긴 채로 돌아가지만, 다른 사람들은 그래도 *계속 잡아당긴다*. 손잡이를 잡아당기는 행위 자체가 *문에 흔들림*을 남긴다 — 안에 있는 사람도 그 진동을 느낀다. 이것이 *cache line invalidation*에 해당한다. 잡아당기는 사람이 많을수록 문은 더 흔들리고, 안의 사람도 일이 늦어진다.

```cpp
// C++20 TAS Lock
#include <atomic>

class TASLock {
    std::atomic<bool> state_{false};
public:
    void lock() {
        while (state_.exchange(true, std::memory_order_acquire)) {
            // busy-wait
        }
    }

    void unlock() {
        state_.store(false, std::memory_order_release);
    }
};
```

```c
// C11 TAS Lock
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    atomic_bool state;
} TASLock;

void tas_init(TASLock* lock) {
    atomic_init(&lock->state, false);
}

void tas_lock(TASLock* lock) {
    while (atomic_exchange_explicit(&lock->state, true, memory_order_acquire)) {
        // busy-wait
    }
}

void tas_unlock(TASLock* lock) {
    atomic_store_explicit(&lock->state, false, memory_order_release);
}
```

**문제** — 모든 스레드가 같은 변수에 대해 exchange를 반복한다.

- exchange는 **write** 연산
- 매 exchange마다 **캐시 무효화** (다른 코어의 cache line invalidation)
- 캐시 라인이 코어 사이를 핑퐁한다 (cache line bouncing)
- 결과: 락이 풀려 있을 때조차 성능 저하

### 버스 트래픽 모델 — MESI 관점

이 캐시 핑퐁의 정체를 알기 위해 MESI 프로토콜을 본다. 책 7.4절은 이 흐름을 캐시 코히런스 관점에서 정리한다.

**MESI 상태:**

- M (Modified)  — 이 코어만 가짐, 메모리와 다름 (dirty)
- E (Exclusive) — 이 코어만 가짐, 메모리와 같음
- S (Shared)    — 여러 코어가 동일한 값 공유
- I (Invalid)   — 무효

TAS의 한 라운드를 시나리오로 풀면:

![TAS 캐시 핑퐁 — 코어 A/B/C가 같은 cache line의 ownership을 RFO로 빼앗으며 M↔I 상태가 진동한다](/images/blog/parallel-principles/diagrams/ch07-tas-cache-pingpong.svg)

이렇게 *N개 코어*가 동시에 시도하면, 매 시도마다 RFO 트래픽이 발생한다. 락이 안 풀려 있어도 그렇다. 책의 분석은 TAS의 throughput이 코어 수에 *역비례*하는 영역이 있음을 보인다.

TTAS는 다르다. read-only 단계에서는 라인이 S 상태로 *모든* 코어에 복제되어 있다. invalidate가 없다. 락이 풀려야 release write가 그 라인을 invalidate시키고, 그제서야 모든 코어가 한 번씩 다시 읽는다.

**TTAS 라이프사이클:**

- 락 보유 중 — 라인 S (모든 코어 캐시) → invalidate 트래픽 0
- unlock     — 라인 M (해제 코어) → 다른 코어들 I
- 경쟁 라운드 — 모두 한 번 RFO → 한 코어만 성공
- 다시 정착   — 라인 S 또는 M

책의 그림 7.4 (TAS vs TTAS 측정) — TAS는 코어 4~8에서 throughput이 무너지고, TTAS는 그래도 평탄하게 유지된다. 그러나 TTAS도 *경쟁이 풀린 순간의 동시 RFO 폭주*는 막지 못한다. 이를 *thundering herd*라 부른다. 다음 절의 backoff가 이 문제를 다룬다.

## 7.3 TTAS Lock — 캐시 친화적

> **비유** — 손잡이를 잡아당기기 전에 *문틈으로 먼저 들여다본다*. 안에 사람이 보이면 그냥 *지켜만* 본다. 지켜보는 행위는 문에 흔들림을 주지 않는다. 안의 사람이 나오면 그제서야 모두가 손잡이를 잡아당긴다 — 이때만 짧게 혼란하다. 평소엔 조용하다.

```cpp
// C++20 TTAS Lock
#include <atomic>

class TTASLock {
    std::atomic<bool> state_{false};
public:
    void lock() {
        while (true) {
            // 먼저 그냥 읽기 (cache에서)
            while (state_.load(std::memory_order_relaxed)) {
                // spin on local cache
            }
            // 풀린 것 같으면 exchange 시도
            if (!state_.exchange(true, std::memory_order_acquire)) {
                return;
            }
        }
    }

    void unlock() {
        state_.store(false, std::memory_order_release);
    }
};
```

```c
// C11 TTAS Lock
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    atomic_bool state;
} TTASLock;

void ttas_init(TTASLock* lock) {
    atomic_init(&lock->state, false);
}

void ttas_lock(TTASLock* lock) {
    while (true) {
        // 먼저 그냥 읽기 (cache에서)
        while (atomic_load_explicit(&lock->state, memory_order_relaxed)) {
            // spin on local cache
        }
        // 풀린 것 같으면 exchange 시도
        if (!atomic_exchange_explicit(&lock->state, true, memory_order_acquire)) {
            return;
        }
    }
}

void ttas_unlock(TTASLock* lock) {
    atomic_store_explicit(&lock->state, false, memory_order_release);
}
```

**Test-and-test-and-set**.

먼저 **read**만 한다 — 캐시에서 읽으므로 다른 코어에 영향 없음. 락이 풀린 것 같으면 그때 exchange 시도.

| 락 | 매 시도 | 캐시 효과 |
|----|---------|----------|
| TAS | write | cache invalidation |
| TTAS | read 반복, 풀려야 exchange | cache hit, write 한 번만 |

성능이 크게 개선된다. 다만 락이 풀린 직후엔 여전히 모두가 동시에 exchange를 시도해 경합 발생.

## 7.4 Exponential Backoff

> **비유** — 인터넷이 끊겨 모뎀이 재접속을 시도하는 광경. 첫 실패는 1초 후 재시도. 또 실패하면 2초. 다음은 4초. 8초. 모두가 같은 순간에 재시도하면 다시 충돌하기 때문에, 대기 시간을 점점 늘려 *부딪힐 확률*을 떨어뜨린다. Ethernet의 충돌 회피, TCP의 혼잡 제어가 같은 아이디어다.

경합이 심하면 — **기다린다**.

```cpp
// C++20 Backoff Lock
#include <atomic>
#include <thread>
#include <chrono>
#include <random>

class BackoffLock {
    std::atomic<bool> state_{false};
    static constexpr int MIN_DELAY = 1;
    static constexpr int MAX_DELAY = 1000;

public:
    void lock() {
        thread_local std::mt19937 rng(std::random_device{}());
        int delay = MIN_DELAY;

        while (true) {
            while (state_.load(std::memory_order_relaxed)) {
                // spin on local cache
            }
            if (!state_.exchange(true, std::memory_order_acquire)) {
                return;
            }
            // 실패 — backoff
            std::uniform_int_distribution<int> dist(0, delay);
            std::this_thread::sleep_for(std::chrono::microseconds(dist(rng)));
            delay = std::min(delay * 2, MAX_DELAY);
        }
    }

    void unlock() {
        state_.store(false, std::memory_order_release);
    }
};
```

```c
// C11 Backoff Lock
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>
#include <time.h>

#ifdef _WIN32
#include <windows.h>
#define sleep_us(us) Sleep((us) / 1000)
#else
#include <unistd.h>
#define sleep_us(us) usleep(us)
#endif

#define MIN_DELAY 1
#define MAX_DELAY 1000

typedef struct {
    atomic_bool state;
} BackoffLock;

void backoff_init(BackoffLock* lock) {
    atomic_init(&lock->state, false);
    srand((unsigned)time(NULL));
}

void backoff_lock(BackoffLock* lock) {
    int delay = MIN_DELAY;

    while (true) {
        while (atomic_load_explicit(&lock->state, memory_order_relaxed)) {
            // spin on local cache
        }
        if (!atomic_exchange_explicit(&lock->state, true, memory_order_acquire)) {
            return;
        }
        // 실패 — backoff
        int wait = rand() % (delay + 1);
        sleep_us(wait);
        delay = delay * 2;
        if (delay > MAX_DELAY) delay = MAX_DELAY;
    }
}

void backoff_unlock(BackoffLock* lock) {
    atomic_store_explicit(&lock->state, false, memory_order_release);
}
```

매번 락 획득 실패하면 대기 시간을 늘린다 (지수적). 경합이 심할수록 더 오래 기다리고, 경합이 줄어들면 다시 짧아진다.

TCP의 혼잡 제어와 비슷한 아이디어.

### Backoff 파라미터 — minDelay와 maxDelay

책은 두 상수를 강조한다.

| 파라미터 | 역할 | 너무 작으면 | 너무 크면 |
|---|---|---|---|
| `MIN_DELAY` | 첫 실패의 대기 | 즉시 재시도, RFO 폭주 | 짧은 critical section에서 헛 대기 |
| `MAX_DELAY` | 상한 캡 | 경쟁 심하면 다시 폭주 | starvation, latency 폭발 |

지수 증가의 base는 보통 2. 책은 다음 패턴을 권한다.

```text
실패 i회 후 대기 시간 ∈ [0, min(MIN * 2^i, MAX)]
```

랜덤화가 핵심이다. 모두가 같은 시점에 같은 시간 기다리면 다시 충돌한다 — Ethernet CSMA/CD의 binary exponential backoff와 정확히 같은 이유.

| 시나리오 | MIN_DELAY | MAX_DELAY |
|---|---|---|
| 짧은 critical section, 많은 스레드 | 1 µs | 100 µs |
| 긴 critical section, 적당한 스레드 | 10 µs | 1 ms |
| NUMA 멀리 떨어진 노드 | 100 µs | 10 ms |

**한계** — 여전히 모든 스레드가 같은 변수를 본다. 폭발적 경합에는 한계. 게다가 적절한 MIN/MAX는 *워크로드별*로 다르고, 자동 튜닝이 어렵다. Queue lock은 이 문제를 다른 방향으로 푼다.

## 7.5 Queue Locks — 공정한 락

> **비유** — 은행 창구의 번호표 기계. 들어와서 *번호표*를 뽑으면 자기 순서가 정해진다. 자기 번호가 호출될 때까지 의자에 앉아 있는다. 누구도 새치기 못 한다. 도착 순서대로 처리된다. 호출은 직원이 *직접 마이크로 한 번* 부르고 끝 — 모두가 듣지만, 한 번만 부른다. 이것이 queue lock의 *공정성*과 *낮은 캐시 트래픽*의 본질이다.

지금까지의 락은 **공정하지 않다**. 다른 스레드가 우연히 먼저 락을 잡을 수 있고, 어떤 스레드는 영원히 못 잡을 수도 있다 (starvation).

**Queue Lock**은 대기 순서를 큐로 관리한다.

- 락을 원하는 스레드는 큐에 등록
- 큐의 앞부터 순서대로 락 획득
- FIFO 공정성

세 가지 유명한 queue lock — Anderson, CLH, MCS.

## 7.6 Anderson Queue Lock

```cpp
// C++20 Anderson Queue Lock
#include <atomic>
#include <vector>
#include <thread>

class AndersonLock {
    std::vector<std::atomic<bool>> flags_;
    std::atomic<int> tail_{0};
    int size_;
    static thread_local int my_slot_;

public:
    explicit AndersonLock(int num_threads)
        : flags_(num_threads), size_(num_threads) {
        flags_[0].store(true, std::memory_order_relaxed);  // 첫 슬롯은 락 보유
        for (int i = 1; i < size_; ++i) {
            flags_[i].store(false, std::memory_order_relaxed);
        }
    }

    void lock() {
        int slot = tail_.fetch_add(1, std::memory_order_relaxed) % size_;
        my_slot_ = slot;
        while (!flags_[slot].load(std::memory_order_acquire)) {
            // spin on my slot
        }
    }

    void unlock() {
        flags_[my_slot_].store(false, std::memory_order_relaxed);
        flags_[(my_slot_ + 1) % size_].store(true, std::memory_order_release);
    }
};

thread_local int AndersonLock::my_slot_ = 0;
```

```c
// C11 Anderson Queue Lock
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct {
    atomic_bool* flags;
    atomic_int tail;
    int size;
} AndersonLock;

// Thread-local storage (C11 _Thread_local)
_Thread_local int anderson_my_slot = 0;

void anderson_init(AndersonLock* lock, int num_threads) {
    lock->flags = malloc(sizeof(atomic_bool) * num_threads);
    lock->size = num_threads;
    atomic_init(&lock->tail, 0);

    atomic_init(&lock->flags[0], true);  // 첫 슬롯은 락 보유
    for (int i = 1; i < num_threads; ++i) {
        atomic_init(&lock->flags[i], false);
    }
}

void anderson_destroy(AndersonLock* lock) {
    free(lock->flags);
}

void anderson_lock(AndersonLock* lock) {
    int slot = atomic_fetch_add_explicit(&lock->tail, 1, memory_order_relaxed) % lock->size;
    anderson_my_slot = slot;
    while (!atomic_load_explicit(&lock->flags[slot], memory_order_acquire)) {
        // spin on my slot
    }
}

void anderson_unlock(AndersonLock* lock) {
    atomic_store_explicit(&lock->flags[anderson_my_slot], false, memory_order_relaxed);
    atomic_store_explicit(&lock->flags[(anderson_my_slot + 1) % lock->size],
                          true, memory_order_release);
}
```

각 스레드가 **자기 슬롯**을 본다. 다른 스레드의 슬롯과 캐시 라인 분리하면 false sharing 없음.

**문제** — 슬롯 수 = 스레드 수만큼 필요. 메모리 비용.

## 7.7 CLH Lock

```cpp
// C++20 CLH Lock
#include <atomic>
#include <memory>

struct CLHNode {
    std::atomic<bool> locked{true};
};

class CLHLock {
    std::atomic<CLHNode*> tail_;
    static thread_local CLHNode* my_node_;
    static thread_local CLHNode* my_pred_;

public:
    CLHLock() {
        auto initial = new CLHNode();
        initial->locked.store(false, std::memory_order_relaxed);
        tail_.store(initial, std::memory_order_relaxed);
    }

    ~CLHLock() {
        delete tail_.load(std::memory_order_relaxed);
    }

    void lock() {
        if (!my_node_) my_node_ = new CLHNode();
        my_node_->locked.store(true, std::memory_order_relaxed);

        my_pred_ = tail_.exchange(my_node_, std::memory_order_acq_rel);

        while (my_pred_->locked.load(std::memory_order_acquire)) {
            // spin on predecessor's node
        }
    }

    void unlock() {
        my_node_->locked.store(false, std::memory_order_release);
        my_node_ = my_pred_;  // 노드 재사용
    }
};

thread_local CLHNode* CLHLock::my_node_ = nullptr;
thread_local CLHNode* CLHLock::my_pred_ = nullptr;
```

```c
// C11 CLH Lock
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct CLHNode {
    atomic_bool locked;
} CLHNode;

typedef struct {
    _Atomic(CLHNode*) tail;
} CLHLock;

_Thread_local CLHNode* clh_my_node = NULL;
_Thread_local CLHNode* clh_my_pred = NULL;

CLHNode* clh_node_create(void) {
    CLHNode* node = malloc(sizeof(CLHNode));
    atomic_init(&node->locked, true);
    return node;
}

void clh_init(CLHLock* lock) {
    CLHNode* initial = clh_node_create();
    atomic_store_explicit(&initial->locked, false, memory_order_relaxed);
    atomic_init(&lock->tail, initial);
}

void clh_lock(CLHLock* lock) {
    if (!clh_my_node) clh_my_node = clh_node_create();
    atomic_store_explicit(&clh_my_node->locked, true, memory_order_relaxed);

    clh_my_pred = atomic_exchange_explicit(&lock->tail, clh_my_node, memory_order_acq_rel);

    while (atomic_load_explicit(&clh_my_pred->locked, memory_order_acquire)) {
        // spin on predecessor's node
    }
}

void clh_unlock(CLHLock* lock) {
    atomic_store_explicit(&clh_my_node->locked, false, memory_order_release);
    clh_my_node = clh_my_pred;  // 노드 재사용
}
```

각 스레드가 **선임자의 노드**를 본다. 노드는 캐시 라인 단위로 정렬되어 false sharing 없음.

**장점** — 메모리 O(N + L), 매우 효율적.
**단점** — NUMA 시스템에서 선임자 노드가 다른 메모리 노드에 있을 수 있음.

## 7.8 MCS Lock

> **비유**: 줄을 선 사람들이 *자기 어깨에만* 손을 얹고 기다린다. 앞 사람이 일을 마치면 *내 어깨를 톡 친다*. 나는 내 어깨만 보면 된다. 옆 사람의 어깨를 곁눈질할 필요도 없고, 앞 사람의 등을 볼 필요도 없다. 멀티 소켓(NUMA) 환경에서 *내 어깨가 곧 내 메모리*이므로 모든 polling이 자기 소켓 안에서 끝난다.

```cpp
// C++20 MCS Lock
#include <atomic>

struct MCSNode {
    std::atomic<MCSNode*> next{nullptr};
    std::atomic<bool> locked{false};
};

class MCSLock {
    std::atomic<MCSNode*> tail_{nullptr};
    static thread_local MCSNode my_node_;

public:
    void lock() {
        my_node_.next.store(nullptr, std::memory_order_relaxed);
        my_node_.locked.store(true, std::memory_order_relaxed);

        MCSNode* pred = tail_.exchange(&my_node_, std::memory_order_acq_rel);

        if (pred != nullptr) {
            pred->next.store(&my_node_, std::memory_order_release);
            while (my_node_.locked.load(std::memory_order_acquire)) {
                // spin on my own node
            }
        }
    }

    void unlock() {
        MCSNode* next = my_node_.next.load(std::memory_order_acquire);

        if (next == nullptr) {
            MCSNode* expected = &my_node_;
            if (tail_.compare_exchange_strong(expected, nullptr,
                    std::memory_order_release, std::memory_order_relaxed)) {
                return;  // 후임자 없음
            }
            // 후임자가 연결 중 — 기다림
            while ((next = my_node_.next.load(std::memory_order_acquire)) == nullptr) {
                // spin
            }
        }
        next->locked.store(false, std::memory_order_release);
    }
};

thread_local MCSNode MCSLock::my_node_;
```

```c
// C11 MCS Lock
#include <stdatomic.h>
#include <stdbool.h>
#include <stddef.h>

typedef struct MCSNode {
    _Atomic(struct MCSNode*) next;
    atomic_bool locked;
} MCSNode;

typedef struct {
    _Atomic(MCSNode*) tail;
} MCSLock;

_Thread_local MCSNode mcs_my_node = {0};

void mcs_init(MCSLock* lock) {
    atomic_init(&lock->tail, NULL);
}

void mcs_lock(MCSLock* lock) {
    atomic_store_explicit(&mcs_my_node.next, NULL, memory_order_relaxed);
    atomic_store_explicit(&mcs_my_node.locked, true, memory_order_relaxed);

    MCSNode* pred = atomic_exchange_explicit(&lock->tail, &mcs_my_node, memory_order_acq_rel);

    if (pred != NULL) {
        atomic_store_explicit(&pred->next, &mcs_my_node, memory_order_release);
        while (atomic_load_explicit(&mcs_my_node.locked, memory_order_acquire)) {
            // spin on my own node
        }
    }
}

void mcs_unlock(MCSLock* lock) {
    MCSNode* next = atomic_load_explicit(&mcs_my_node.next, memory_order_acquire);

    if (next == NULL) {
        MCSNode* expected = &mcs_my_node;
        if (atomic_compare_exchange_strong_explicit(&lock->tail, &expected, NULL,
                memory_order_release, memory_order_relaxed)) {
            return;  // 후임자 없음
        }
        // 후임자가 연결 중 — 기다림
        while ((next = atomic_load_explicit(&mcs_my_node.next, memory_order_acquire)) == NULL) {
            // spin
        }
    }
    atomic_store_explicit(&next->locked, false, memory_order_release);
}
```

각 스레드가 **자기 노드**를 본다 — 진정으로 local. NUMA 친화적.

**장점** — NUMA에서도 좋음, 진정한 local spin.
**단점** — release가 복잡 (next 포인터 동기화 필요).

CLH와 MCS는 실전에서 가장 자주 보이는 queue lock.

### CLH vs MCS — 어디서 다른가

책의 표현으로 둘은 *같은 아이디어를 다른 방향에서* 푼 것이다.

| 항목 | CLH | MCS |
|---|---|---|
| spin 위치 | 선임자(`pred`)의 노드 | 자기 노드 |
| 노드 소유 | 풀어진 후 *선임자가* 사용 | 항상 자기 자신만 |
| 메모리 위치 | 캐시는 OK, NUMA는 risky | 진정한 local — NUMA OK |
| unlock 복잡도 | O(1), flag만 false | next 포인터 sync 필요 |
| linked list | 암묵적 (pred 포인터로) | 명시적 (next 포인터로) |

NUMA 시스템 — 다중 소켓 — 에서는 MCS가 일관되게 우세하다. CLH의 spin 노드가 다른 소켓에 있으면 모든 polling이 inter-socket coherence 트래픽이 된다. MCS는 자기 노드를 보므로 자기 소켓 안에서 끝난다.

반면 *단일 소켓*에서는 CLH의 unlock이 단순해서 살짝 우세할 때가 많다.

## 7.9 Timeout(Abortable) Lock

스레드가 영원히 기다릴 수 없는 경우 — 우선순위 역전 회피, 응답 시간 제약, 자원 release. 책은 queue lock에 *timeout*을 더한 variant를 제시한다.

```cpp
// C++20 Timeout Lock — try_lock_for 인터페이스
#include <atomic>
#include <chrono>

class TimeoutLock {
    std::atomic<bool> state_{false};

public:
    template <typename Rep, typename Period>
    bool try_lock_for(std::chrono::duration<Rep, Period> timeout) {
        auto deadline = std::chrono::steady_clock::now() + timeout;
        while (state_.exchange(true, std::memory_order_acquire)) {
            if (std::chrono::steady_clock::now() >= deadline) {
                return false;  // 포기
            }
            // spin or backoff
        }
        return true;
    }

    void unlock() {
        state_.store(false, std::memory_order_release);
    }
};
```

Queue lock에 timeout을 추가하면 어렵다 — 큐의 한 노드가 *포기*하면 후임자가 영원히 기다린다. 책의 해법:

**abortable queue lock 아이디어:**

- 1. 포기 결정 시 자기 노드를 'aborted' 상태로 표시
- 2. unlock 시 aborted 노드를 건너뛰며 다음 정상 후임자에 hand-off
- 3. 큐 구조 안 변경 — 표시만으로 진행

CLH-abortable / MCS-abortable 모두 이 패턴을 따른다. Java의 `ReentrantLock.tryLock(timeout)`이 내부적으로 비슷한 abortable variant를 쓴다.

## 7.10 비교

![스핀락 타입 비교](/images/blog/parallel/diagrams/spinlock-types.svg)

| 락 | 경합 시 캐시 트래픽 | 공정성 | 메모리 | NUMA |
|---|---|---|---|---|
| TAS | 매우 높음 | 없음 | 1 단어 | 나쁨 |
| TTAS | 중간 | 없음 | 1 단어 | 나쁨 |
| Backoff TTAS | 낮음 | 없음 | 1 단어 | 나쁨 |
| Anderson | 매우 낮음 | FIFO | O(L × N) | 보통 |
| CLH | 매우 낮음 | FIFO | O(N + L) | 보통 |
| MCS | 매우 낮음 | FIFO | O(N + L) | 좋음 |

L = 스레드 수, N = 락의 개수.

## 7.11 실제 OS의 락

Linux 커널 / glibc의 락은 더 복잡하다.

- **Adaptive Mutex** — 짧게 스핀하다가 실패하면 sleep
- **Futex** — 빠른 경로 (atomic) + 느린 경로 (kernel)
- **Hierarchical Lock** — NUMA 토폴로지를 고려

이 챕터의 알고리즘들이 그 토대가 된다.

## 7.12 시스템 사례 — 책 밖의 알고리즘

이 챕터의 락이 실제 시스템 어디에 있는지 정리한다.

**Linux kernel — qspinlock (queued spinlock)**

리눅스 커널의 기본 spinlock은 2014년부터 *qspinlock*이다. 이름이 시사하듯 MCS의 변종이다. 4바이트 안에 *대기자 수 + tail 포인터*를 인코딩해 메모리를 아끼고, NUMA 친화적인 local spin을 유지한다.

**qspinlock 32비트 레이아웃:**

- [ tail (16b) | pending (1b) | locked (1b) | reserved ]
- locked = 1: 누가 락 잡음
- pending = 1: 첫 대기자 (큐를 만들기 전 fast path)
- tail: 큐 꼬리 CPU 번호 (MCS 노드 식별)

빠른 경로 — 경합 없을 때 — 는 cmpxchg 한 번. 경합이 보이면 *pending* 자리에 표시, 둘 이상이면 그제서야 진짜 MCS 큐를 만든다. 이 *점진적 전환*이 책의 TTAS-Backoff에서 queue lock으로 가는 흐름과 정확히 일치한다.

**glibc — pthread_spin_lock**

POSIX의 pthread spinlock은 가장 단순하다. 아키텍처별로 TAS 또는 TTAS. backoff도 큐도 없다. 짧은 critical section에 *직접* 쓰라는 인터페이스.

**glibc/nptl/pthread_spin_lock.c (x86):**

- while (atomic_exchange (lock, 1))
- while (*lock)
- __asm__ ("pause");

`pause` 명령어가 핵심이다. busy spin에서 CPU 파이프라인 stall을 피하고, hyperthreading 짝꿍에게 자원을 양보한다. *문틈으로 살피는 동안 숨 쉬기*에 해당한다.

**Java — VarHandle과 LockSupport**

Java의 표준 락은 `ReentrantLock`이지만, 내부 구현은 AQS(AbstractQueuedSynchronizer)다. AQS는 CLH의 변형 — 명시적 큐 노드를 만들고, `LockSupport.park()`로 스레드를 *재운다*. 책의 abortable queue lock과 거의 같다.

JDK 9 이후 `VarHandle`이 등장하면서 사용자가 직접 atomic CAS / TAS 기반 락을 작성할 수 있게 됐다. 짧은 critical section을 위한 사용자 정의 spinlock이 가능해진 것.

```java
// Java 사용자 정의 TAS spinlock (개념적)
import java.lang.invoke.VarHandle;
import java.lang.invoke.MethodHandles;

class TASLock {
    private volatile int state = 0;
    private static final VarHandle STATE;
    static {
        try {
            STATE = MethodHandles.lookup()
                .findVarHandle(TASLock.class, "state", int.class);
        } catch (ReflectiveOperationException e) {
            throw new ExceptionInInitializerError(e);
        }
    }
    void lock() {
        while ((int) STATE.compareAndExchange(this, 0, 1) != 0) {
            Thread.onSpinWait();  // x86 pause 대응
        }
    }
    void unlock() {
        STATE.setRelease(this, 0);
    }
}
```

`Thread.onSpinWait()`가 JIT를 통해 `pause` 명령어로 내려간다 — glibc 구현과 같은 트릭이다.

| 시스템 | 알고리즘 | 비고 |
|---|---|---|
| Linux kernel | qspinlock (MCS 변형) | fast path는 cmpxchg, contention 시 큐 |
| glibc pthread | TTAS + pause | 단순, 사용자 책임으로 짧게 |
| Java AQS | CLH 변형 + park | abortable, 다양한 동기화 도구의 토대 |
| C++20 표준 | `std::atomic_flag::wait` | OS futex 위임 (실은 hybrid) |

책의 추상 알고리즘이 *그대로* 실제 시스템에 들어가 있다. 다만 fast path 최적화, NUMA hint, 인터럽트 처리 같은 *현실의 잡음*이 코드를 덮는다.

## 정리

- **스핀 락**은 짧은 락 보유 + 멀티 코어에서 효율적
- **TAS** — 단순하지만 캐시 트래픽 폭발
- **TTAS** — read만 반복 후 exchange, 캐시 친화적
- **Exponential Backoff** — 경합 심할 때 대기
- **Queue Lock** — 공정성 + 로컬 스핀 (Anderson / CLH / MCS)
- 실전에서는 CLH / MCS가 가장 인기

## 한국 개발자의 함정

**1. *Spinlock = 무조건 빠름*이라는 오해**

- 짧은 락에만 빠름
- 긴 락은 CPU 낭비

**2. *while(!flag) {}* 단순 스핀**

- 캐시 트래픽 폭발
- TTAS / backoff 필요

**3. *Linux mutex = pthread_mutex_t***

- 실은 futex (사용자 공간 atomic + kernel 대기)
- 경합 없으면 spin도 안 함

## 실무 적용

**이론 → 실무:**

- TAS / TTAS         → spinlock_t (Linux kernel)
- CLH / MCS          → 고경합 영역의 spinlock
- Backoff            → futex 대기 전 spin

**리눅스 커널:**

- spin_lock()        → TTAS + backoff 변형
- arch_spin_lock     → 아키텍처별 최적화

**C++20:**

- std::atomic_flag::test_and_set  → 직접 spinlock
- std::atomic<T>::exchange        → TAS 락 구현
- std::atomic<T>::compare_exchange_* → CAS 기반 락

**C11:**

- atomic_flag_test_and_set → 직접 spinlock
- atomic_exchange          → TAS 락 구현
- atomic_compare_exchange_* → CAS 기반 락

## 자기 점검

- [ ] TAS / TTAS 캐시 동작 차이?
- [ ] Exponential backoff의 이유?
- [ ] CLH vs MCS 큐 락 차이?
- [ ] NUMA에서의 락 성능?

## 다음 장 예고

다음 장은 **Monitors와 Blocking Synchronization** — 스핀이 아닌 OS 도움 받는 동기화.

## 관련 항목

- [Ch 6: Consensus](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [C++ Concurrency in Action Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
