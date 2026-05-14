---
title: "Chapter 7: 스핀 락과 경합"
date: 2026-05-12T07:00:00
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

## 7.3 TTAS Lock — 캐시 친화적

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

```
TAS:  매 시도마다 write → cache invalidation
TTAS: read만 반복 → cache hit
      풀려야 exchange → write 한 번만
```

성능이 크게 개선된다. 다만 락이 풀린 직후엔 여전히 모두가 동시에 exchange를 시도해 경합 발생.

## 7.4 Exponential Backoff

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

**한계** — 여전히 모든 스레드가 같은 변수를 본다. 폭발적 경합에는 한계.

## 7.5 Queue Locks — 공정한 락

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

## 7.9 비교

| 락 | 경합 시 캐시 트래픽 | 공정성 | 메모리 | NUMA |
|---|---|---|---|---|
| TAS | 매우 높음 | 없음 | 1 단어 | 나쁨 |
| TTAS | 중간 | 없음 | 1 단어 | 나쁨 |
| Backoff TTAS | 낮음 | 없음 | 1 단어 | 나쁨 |
| Anderson | 매우 낮음 | FIFO | O(L × N) | 보통 |
| CLH | 매우 낮음 | FIFO | O(N + L) | 보통 |
| MCS | 매우 낮음 | FIFO | O(N + L) | 좋음 |

L = 스레드 수, N = 락의 개수.

## 7.10 실제 OS의 락

Linux 커널 / glibc의 락은 더 복잡하다.

- **Adaptive Mutex** — 짧게 스핀하다가 실패하면 sleep
- **Futex** — 빠른 경로 (atomic) + 느린 경로 (kernel)
- **Hierarchical Lock** — NUMA 토폴로지를 고려

이 챕터의 알고리즘들이 그 토대가 된다.

## 정리

- **스핀 락**은 짧은 락 보유 + 멀티 코어에서 효율적
- **TAS** — 단순하지만 캐시 트래픽 폭발
- **TTAS** — read만 반복 후 exchange, 캐시 친화적
- **Exponential Backoff** — 경합 심할 때 대기
- **Queue Lock** — 공정성 + 로컬 스핀 (Anderson / CLH / MCS)
- 실전에서는 CLH / MCS가 가장 인기

## 한국 개발자의 함정

```
1. *Spinlock = 무조건 빠름*이라는 오해
   - 짧은 락에만 빠름
   - 긴 락은 CPU 낭비

2. *while(!flag) {}* 단순 스핀
   - 캐시 트래픽 폭발
   - TTAS / backoff 필요

3. *Linux mutex = pthread_mutex_t*
   - 실은 futex (사용자 공간 atomic + kernel 대기)
   - 경합 없으면 spin도 안 함
```

## 실무 적용

```
이론 → 실무:
- TAS / TTAS         → spinlock_t (Linux kernel)
- CLH / MCS          → 고경합 영역의 spinlock
- Backoff            → futex 대기 전 spin

리눅스 커널:
- spin_lock()        → TTAS + backoff 변형
- arch_spin_lock     → 아키텍처별 최적화

C++20:
- std::atomic_flag::test_and_set  → 직접 spinlock
- std::atomic<T>::exchange        → TAS 락 구현
- std::atomic<T>::compare_exchange_* → CAS 기반 락

C11:
- atomic_flag_test_and_set → 직접 spinlock
- atomic_exchange          → TAS 락 구현
- atomic_compare_exchange_* → CAS 기반 락
```

## 자기 점검

```
□ TAS / TTAS 캐시 동작 차이?
□ Exponential backoff의 이유?
□ CLH vs MCS 큐 락 차이?
□ NUMA에서의 락 성능?
```

## 다음 장 예고

다음 장은 **Monitors와 Blocking Synchronization** — 스핀이 아닌 OS 도움 받는 동기화.

## 관련 항목

- [Ch 6: Consensus](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [C++ Concurrency in Action Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
