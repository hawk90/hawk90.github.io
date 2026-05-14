---
title: "Chapter 12: Counting, Sorting, Distributed Coordination"
date: 2026-05-12
description: "Counting Network, Bitonic Sorting Network. Combining Tree로 카운터 경합 분산."
series: "The Art of Multiprocessor Programming"
seriesOrder: 12
tags: [parallel, concurrency, book-review, amp, counting-network, combining-tree, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 12 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 12.1 카운터의 동시성 문제

가장 단순한 자료구조 — 카운터.

### C++20/23 단순 카운터

```cpp
#include <atomic>

class SimpleCounter {
private:
    std::atomic<long> counter{0};

public:
    long increment() {
        return counter.fetch_add(1, std::memory_order_relaxed) + 1;
    }

    long get() const {
        return counter.load(std::memory_order_relaxed);
    }
};
```

### C11 단순 카운터

```c
#include <stdatomic.h>

typedef struct {
    _Atomic long counter;
} SimpleCounter;

void simple_counter_init(SimpleCounter* c) {
    atomic_store(&c->counter, 0);
}

long simple_counter_increment(SimpleCounter* c) {
    return atomic_fetch_add_explicit(&c->counter, 1, memory_order_relaxed) + 1;
}

long simple_counter_get(const SimpleCounter* c) {
    return atomic_load_explicit(&c->counter, memory_order_relaxed);
}
```

수 천 스레드가 같은 카운터를 동시에 증가하면 — 모두가 같은 cache line을 경쟁한다. 11장의 stack과 같은 문제.

해법은 **경합을 분산**하는 것.

## 12.2 Combining Tree

여러 스레드의 증가를 트리로 **합쳐서** 처리.

```
스레드들의 증가:
  T1: +1, T2: +1, T3: +1, T4: +1
       │       │       │       │
       └───┬───┘       └───┬───┘
           │ +2             │ +2
           └───────┬────────┘
                   │ +4
                CENTRAL COUNTER
```

리프에서 시작해 트리를 올라가면서 증가량을 합친다. 루트에서는 한 번의 atomic 증가만.

**장점**: 루트의 경합이 O(N)에서 O(1)로.
**단점**: 트리 순회 비용. 그리고 각 노드도 동기화 필요.

## 12.3 Counting Network

더 강력한 아이디어 — **counting network**.

```
           ┌── balancer ──┐
입력 N ────┤               ├──── 출력 (균등 분산)
           └── balancer ──┘
```

**Balancer** — 입력 두 개를 받아 두 개를 출력. 출력은 번갈아 교차.

### C++20/23 Balancer

```cpp
#include <atomic>

class Balancer {
private:
    std::atomic<bool> toggle{false};

public:
    // 다음 출력 라인 반환 (0 또는 1)
    int traverse() {
        // XOR로 토글하고 이전 값 반환
        bool old = toggle.fetch_xor(true, std::memory_order_relaxed);
        return old ? 1 : 0;
    }
};
```

### C11 Balancer

```c
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    _Atomic bool toggle;
} Balancer;

void balancer_init(Balancer* b) {
    atomic_store(&b->toggle, false);
}

int balancer_traverse(Balancer* b) {
    // XOR로 토글하고 이전 값 반환
    bool old = atomic_fetch_xor_explicit(&b->toggle, true, memory_order_relaxed);
    return old ? 1 : 0;
}
```

이 balancer들을 트리로 엮으면 — N 입력이 N 출력으로 균등하게 분배된다. **counting** = 각 출력 라인의 호출 횟수가 거의 같음.

### Bitonic Counting Network

가장 유명한 counting network. Bitonic sorting network와 같은 구조.

```
8 입력 → 8 출력
깊이: O(log² N)
폭: N
```

## 12.4 왜 Network인가

카운터를 N개로 쪼개면 카운팅 자체는 빠르다. 그러나 **각 카운터의 인덱스 분배**가 새 문제.

Counting network는 그 분배를 **하드웨어 없이 분산적으로** 해결.

```
요청 → counting network → 카운터[i] 증가
              ↑
        각 카운터는 거의 같은 빈도로 증가
```

여러 카운터의 합 = 전체 카운트. 각 카운터의 경합은 N분의 1.

## 12.5 Sorting Network

Counting network와 같은 구조 — 다만 balancer 대신 **comparator**.

### C++20/23 Comparator

```cpp
#include <algorithm>
#include <utility>

// 두 값을 비교하여 정렬
template<typename T>
std::pair<T, T> comparator(T a, T b) {
    if (a <= b) {
        return {a, b};  // out[0] = min, out[1] = max
    } else {
        return {b, a};
    }
}

// Bitonic Merge (재귀적)
template<typename T>
void bitonicMerge(std::vector<T>& arr, int low, int count, bool ascending) {
    if (count > 1) {
        int k = count / 2;
        for (int i = low; i < low + k; i++) {
            if ((arr[i] > arr[i + k]) == ascending) {
                std::swap(arr[i], arr[i + k]);
            }
        }
        bitonicMerge(arr, low, k, ascending);
        bitonicMerge(arr, low + k, k, ascending);
    }
}

// Bitonic Sort (재귀적)
template<typename T>
void bitonicSort(std::vector<T>& arr, int low, int count, bool ascending) {
    if (count > 1) {
        int k = count / 2;
        bitonicSort(arr, low, k, true);       // 오름차순
        bitonicSort(arr, low + k, k, false);  // 내림차순
        bitonicMerge(arr, low, count, ascending);
    }
}
```

### C11 Comparator

```c
#include <stdlib.h>

// 두 값을 비교하여 정렬
void comparator(int* a, int* b) {
    if (*a > *b) {
        int temp = *a;
        *a = *b;
        *b = temp;
    }
}

// Bitonic Merge
void bitonic_merge(int* arr, int low, int count, int ascending) {
    if (count > 1) {
        int k = count / 2;
        for (int i = low; i < low + k; i++) {
            if ((arr[i] > arr[i + k]) == ascending) {
                int temp = arr[i];
                arr[i] = arr[i + k];
                arr[i + k] = temp;
            }
        }
        bitonic_merge(arr, low, k, ascending);
        bitonic_merge(arr, low + k, k, ascending);
    }
}

// Bitonic Sort
void bitonic_sort(int* arr, int low, int count, int ascending) {
    if (count > 1) {
        int k = count / 2;
        bitonic_sort(arr, low, k, 1);       // 오름차순
        bitonic_sort(arr, low + k, k, 0);   // 내림차순
        bitonic_merge(arr, low, count, ascending);
    }
}
```

**Bitonic Sorting Network** — N 개의 값을 O(log² N) 깊이로 정렬.

```
입력: [3, 1, 4, 1, 5, 9, 2, 6]
출력: [1, 1, 2, 3, 4, 5, 6, 9]
```

CPU의 SIMD 명령어나 GPU에서 정렬을 구현할 때 자주 사용. 깊이가 작아서 병렬화에 유리.

## 12.6 Combining Tree vs Counting Network

| 측면 | Combining Tree | Counting Network |
|---|---|---|
| 깊이 | O(log N) | O(log² N) |
| 경합 | 트리 노드마다 | balancer마다 (적음) |
| 메모리 | O(N) | O(N log N) |
| 복잡도 | 보통 | 매우 복잡 |
| 실용성 | 가끔 사용 | 거의 안 사용 |

Counting network는 이론적으로 우아하지만 실용성은 제한적. Combining tree나 sharded counter가 더 흔히 쓰인다.

## 12.7 실용적 대안 — Sharded Counter

### C++20/23 Sharded Counter

```cpp
#include <atomic>
#include <array>
#include <thread>
#include <numeric>

template<size_t NumShards = 16>
class ShardedCounter {
private:
    // Cache line padding으로 false sharing 방지
    struct alignas(64) PaddedAtomic {
        std::atomic<long> value{0};
    };

    std::array<PaddedAtomic, NumShards> shards;

    size_t getShardIndex() const {
        // 스레드 ID 해시로 샤드 선택
        auto id = std::hash<std::thread::id>{}(std::this_thread::get_id());
        return id % NumShards;
    }

public:
    void increment() {
        size_t idx = getShardIndex();
        shards[idx].value.fetch_add(1, std::memory_order_relaxed);
    }

    long get() const {
        long sum = 0;
        for (const auto& shard : shards) {
            sum += shard.value.load(std::memory_order_relaxed);
        }
        return sum;
    }
};
```

### C11 Sharded Counter

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <pthread.h>

#define NUM_SHARDS 16
#define CACHE_LINE_SIZE 64

typedef struct {
    _Alignas(CACHE_LINE_SIZE) _Atomic long value;
    char padding[CACHE_LINE_SIZE - sizeof(_Atomic long)];
} PaddedAtomic;

typedef struct {
    PaddedAtomic shards[NUM_SHARDS];
} ShardedCounter;

void sharded_counter_init(ShardedCounter* c) {
    for (int i = 0; i < NUM_SHARDS; i++) {
        atomic_store(&c->shards[i].value, 0);
    }
}

static size_t get_shard_index(void) {
    // pthread_self()를 해시로 사용
    return (size_t)pthread_self() % NUM_SHARDS;
}

void sharded_counter_increment(ShardedCounter* c) {
    size_t idx = get_shard_index();
    atomic_fetch_add_explicit(&c->shards[idx].value, 1, memory_order_relaxed);
}

long sharded_counter_get(const ShardedCounter* c) {
    long sum = 0;
    for (int i = 0; i < NUM_SHARDS; i++) {
        sum += atomic_load_explicit(&c->shards[i].value, memory_order_relaxed);
    }
    return sum;
}
```

각 스레드가 자기 샤드만 증가. 경합 분산.

- `NUM_SHARDS`를 코어 수에 맞춤
- 읽기는 모든 샤드 합산 (느림)
- 쓰기는 매우 빠름

`Striped64` (Java), `folly::CachelinePadded` (C++) 등이 비슷한 패턴.

## 12.8 분산 좌표 — 더 넓은 컨텍스트

이 챕터의 다른 메시지 — **카운팅 자체가 분산 좌표 문제**.

```
여러 스레드 → 각자 고유 번호 받고 싶음
```

이게 분산 ID 생성, 분산 트랜잭션의 타임스탬프, 분산 락의 토큰 같은 문제로 일반화된다.

- **Lamport Timestamp** — 인과 관계 보존하는 분산 카운터
- **Vector Clock** — 더 정밀한 인과 관계
- **Snowflake ID** — Twitter의 분산 ID 생성

이런 알고리즘들이 counting network의 분산 시스템 친척이다.

## 12.9 Lock-Free Counter

### C++20/23 Lock-Free Counter (CAS 기반)

```cpp
#include <atomic>

class LockFreeCounter {
private:
    std::atomic<long> value{0};

public:
    // CAS 기반 (fetch_add보다 느림, 예시용)
    long incrementCAS() {
        long old = value.load(std::memory_order_relaxed);
        while (!value.compare_exchange_weak(
            old, old + 1,
            std::memory_order_relaxed,
            std::memory_order_relaxed)) {
            // old가 자동으로 현재 값으로 갱신됨
        }
        return old + 1;
    }

    // fetch_add 기반 (권장)
    long increment() {
        return value.fetch_add(1, std::memory_order_relaxed) + 1;
    }

    long get() const {
        return value.load(std::memory_order_relaxed);
    }
};
```

### C11 Lock-Free Counter

```c
#include <stdatomic.h>

typedef struct {
    _Atomic long value;
} LockFreeCounter;

void lock_free_counter_init(LockFreeCounter* c) {
    atomic_store(&c->value, 0);
}

// CAS 기반
long lock_free_counter_increment_cas(LockFreeCounter* c) {
    long old = atomic_load_explicit(&c->value, memory_order_relaxed);
    while (!atomic_compare_exchange_weak_explicit(
        &c->value, &old, old + 1,
        memory_order_relaxed,
        memory_order_relaxed)) {
        // old가 자동으로 현재 값으로 갱신됨
    }
    return old + 1;
}

// fetch_add 기반 (권장)
long lock_free_counter_increment(LockFreeCounter* c) {
    return atomic_fetch_add_explicit(&c->value, 1, memory_order_relaxed) + 1;
}

long lock_free_counter_get(const LockFreeCounter* c) {
    return atomic_load_explicit(&c->value, memory_order_relaxed);
}
```

단일 카운터의 lock-free 구현. 경합 시 매우 느림.

`fetch_add`가 있으면 한 명령으로: x86의 `LOCK XADD`. 매우 빠르지만 여전히 경합 심하면 한계.

## 정리

- 카운터의 경합 — 모든 스레드가 같은 cache line 경쟁
- **Combining Tree** — 트리로 증가량 합산, 루트 경합 O(1)
- **Counting Network** — balancer로 균등 분산
- **Sorting Network** — comparator로 정렬, GPU/SIMD에 유리
- 실용적으로는 **Sharded Counter**가 가장 단순하고 효과적
- 분산 좌표 문제 — Lamport timestamp, vector clock 등으로 일반화

## 한국 개발자의 함정

```
1. *std::atomic::fetch_add*이 무조건 빠름
   - 저경합에선 빠름
   - 고경합에선 cache line ping-pong으로 느림
   - Sharded counter로 분산

2. *Counting Network = 실용적*
   - 깊이가 O(log² N)이라 메모리 많이 씀
   - 구현 복잡, 실전에선 거의 안 씀
   - Sharded counter가 더 효과적

3. *Sharded counter는 항상 좋음*
   - 쓰기는 빠르지만 *읽기는 O(N)*
   - 읽기 빈도가 높으면 오히려 손해
   - 대부분 쓰기/읽기 비율로 결정

4. *Lamport timestamp = 완벽한 인과 관계*
   - Lamport는 *부분* 순서만
   - Vector clock이 정확한 인과 관계
   - 트레이드오프 인지 필요
```

## 실무 적용

```
이론 → 실무:
- Combining Tree        → 거의 안 씀 (이론적)
- Counting Network      → 학술적
- Sharded Counter       → folly::ThreadCachedInt, boost::atomic
- Lock-Free Counter     → std::atomic<long> / _Atomic long
- Padded Counter        → folly::CachelinePadded

언어별:
- C++: std::atomic, folly::ThreadCachedInt, boost::lockfree
- C: stdatomic.h + 직접 샤딩 구현
- Java: LongAdder, LongAccumulator, DoubleAdder
- Go: sync/atomic + per-CPU sharding (간접)
- Rust: std::sync::atomic, crossbeam

분산 ID:
- Snowflake (Twitter) → Discord/Instagram/대부분 회사 도입
- ULID / UUID v7 → 시간 순서 보존
- HLC (Hybrid Logical Clock) → CockroachDB / Spanner
```

## 자기 점검

```
□ Combining Tree와 Sharded Counter 차이?
□ Counting Network의 깊이와 폭?
□ Sharded counter가 단일 atomic보다 빠른 시나리오?
□ Cache line padding의 역할?
□ Lamport timestamp의 한계?
□ Snowflake ID의 구조?
```

## 다음 장 예고

다음 장은 **Concurrent Hashing** — 동시 해시 테이블의 설계.

## 관련 항목

- [Ch 11: Stack과 Elimination](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — Anderson queue lock이 비슷한 구조
- [Ch 13: Concurrent Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
- [C++ Concurrency in Action Ch 5: Atomic Operations](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
