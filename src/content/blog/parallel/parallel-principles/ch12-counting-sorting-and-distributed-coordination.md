---
title: "Chapter 12: Counting, Sorting, Distributed Coordination"
date: 2026-05-06T12:00:00
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

![Combining Tree — 단계별 합산](/images/blog/parallel/diagrams/ch12-combining-tree.svg)

리프에서 시작해 트리를 올라가면서 증가량을 합친다. 루트에서는 한 번의 atomic 증가만.

**장점**: 루트의 경합이 O(N)에서 O(1)로.
**단점**: 트리 순회 비용. 그리고 각 노드도 동기화 필요.

## 12.3 Counting Network

더 강력한 아이디어 — **counting network**.

**Balancer 네트워크**: $N$개 입력이 여러 balancer를 거쳐 출력으로 *균등 분산*된다.

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

### Balancer의 형식 정의

책은 balancer를 *수학적 객체*로 정의한다. 한 balancer가 받은 토큰 수를 $x_0, x_1$, 내보낸 토큰 수를 $y_0, y_1$이라 하면:

- **보존 (conservation)**: $x_0 + x_1 = y_0 + y_1$
- **균등 (step property)**: $y_0 = \lceil (x_0 + x_1) / 2 \rceil$, $y_1 = \lfloor (x_0 + x_1) / 2 \rfloor$

즉 들어온 토큰을 정확히 둘로 쪼개되, 홀수면 0번 출력이 하나 더 받는다. 이게 *step property*다.

**Quiescent state**: 모든 입력 토큰이 출력에 도달한 상태. counting network는 quiescent에서만 step property를 보장. 작동 중에는 일시적으로 불균등할 수 있다.

### Bitonic Counting Network — 재귀적 구성

가장 유명한 counting network. Bitonic sorting network와 같은 구조.

$\mathrm{Bitonic}[2k]$를 재귀적으로 정의한다.

```text
Bitonic[2]:        하나의 balancer
Bitonic[2k]:
   1. 입력을 두 그룹으로 나눠 각각 Bitonic[k] 적용
   2. 그 결과를 Merger[2k]로 합침

Merger[2k]:
   1. 두 그룹의 *짝수 인덱스끼리*, *홀수 인덱스끼리* 각각 Merger[k]
   2. 출력 인접 쌍에 balancer 한 층
```

깊이 점화식: $D(2k) = D(k) + M(2k)$, $M(2k) = M(k) + 1$, $M(2) = 1$.

해를 풀면 $D(2k) = \binom{\log 2k + 1}{2} = \Theta(\log^2 N)$. **폭** $N$, **깊이** $O(\log^2 N)$, balancer 총 수 $O(N \log^2 N)$.

```text
8 입력 → 8 출력
깊이: O(log² N) = 6
폭: N = 8
balancer 수: N(log² N)/4 = 12
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

## 12.4.1 Diffracting Tree — 깊이 O(log N)

Bitonic counting network는 깊이가 $O(\log^2 N)$이다. **Diffracting Tree**는 깊이 $O(\log N)$의 대안. Shavit-Zemach(1994)가 제안.

기본 아이디어 — 각 노드에 *prism*이라 부르는 작은 elimination array를 둔다. 11장의 elimination과 같은 발상이다.

```text
요청이 balancer 노드에 도착:
    if prism에서 다른 요청과 만남:
        두 요청이 *서로 반대 출력*으로 분기 — balancer는 안 거침
    else:
        평소대로 balancer를 거쳐 자식 노드로
```

두 요청이 prism에서 매치되면 한 명은 왼쪽 자식, 다른 한 명은 오른쪽 자식으로 향한다. balancer를 건드리지 않고도 step property를 유지한다 — 두 명이 각각 다른 출력으로 갔으므로 conservation 만족.

```text
        ┌─ balancer ─┐
        │   prism    │
   요청1│            │요청2
        └─ 매치 → 분기┘
```

| 자료구조 | 깊이 | balancer 경합 |
|---|---|---|
| Combining Tree | $\log N$ | 트리 노드마다 |
| Bitonic Counting | $\log^2 N$ | balancer마다 |
| Diffracting Tree | $\log N$ | prism에 흡수됨 |

이론적으로 가장 우아한 분산 카운터. 실용성은 prism의 elimination 오버헤드 때문에 제한적.

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

```text
입력: [3, 1, 4, 1, 5, 9, 2, 6]
출력: [1, 1, 2, 3, 4, 5, 6, 9]
```

CPU의 SIMD 명령어나 GPU에서 정렬을 구현할 때 자주 사용. 깊이가 작아서 병렬화에 유리.

### 0/1 Principle — Sorting Network 검증의 마법

비교 기반 sorting network의 *모든* 입력에 대해 정확성을 검증하려면 $N!$ 순열을 확인해야 한다. 그러나 다음 정리로 단순화된다.

> **0/1 Principle**: comparator로만 구성된 네트워크가 모든 0/1 시퀀스(총 $2^N$ 개)를 정렬한다면, 모든 입력을 정렬한다.

**증명 직관**: 어떤 수 $x$에 대해 "$x$보다 큰가?"를 묻는 함수 $f_x$를 모든 원소에 적용하면 0/1 시퀀스가 된다. comparator는 monotonic하므로 이 변환을 통과시킨다. 따라서 0/1 시퀀스가 정렬되면 원래 시퀀스도 정렬.

이 정리 덕분에 — **$N!$이 아니라 $2^N$만 검증**하면 sorting network의 정확성이 증명된다. Bitonic, Odd-Even Merge, AKS network 모두 이 원리로 검증.

### Counting Network ↔ Sorting Network 대응

책의 우아한 관찰 — counting network에서 balancer를 comparator로 *그대로 바꾸면* sorting network가 된다.

```text
Balancer(x₀, x₁):  토큰을 두 출력에 균등 분배
Comparator(a, b):  min/max를 두 출력에 분배

같은 토폴로지에서:
  balancer 사용 → counting network
  comparator 사용 → sorting network
```

이게 책 Theorem 12.4의 핵심: *step property*를 만족하는 토폴로지는 0/1 시퀀스에 대한 정렬과 동치다. 그래서 모든 counting network는 자동으로 sorting network이고, 그 역도 (충분히 균형 잡힌 토폴로지면) 성립.

## 12.5.1 Sample Sort — 큰 데이터의 병렬 정렬 (책 12.7)

Sorting network는 깊이가 $O(\log^2 N)$이라 데이터가 크면 무겁다. 큰 데이터에는 **Sample Sort**가 표준이다.

```text
1. 데이터 N개를 P개 스레드에 균등 분배 (각자 N/P개)
2. 각 스레드가 자기 몫에서 P-1개를 *샘플* 추출
3. 모든 샘플(P(P-1)개)을 모아 정렬, 균등 간격으로 *splitter* P-1개 선택
4. 각 스레드가 자기 데이터를 splitter에 따라 P 버킷으로 분배
5. 버킷 i를 스레드 i가 받음 (all-to-all 통신)
6. 각 스레드가 자기 버킷을 sequential sort
```

`splitter`가 *quantile에 가까운* 값이라서 각 버킷이 대략 $N/P$ 크기. 부하 균형이 좋다.

| 단계 | 복잡도 | 통신 |
|---|---|---|
| 샘플 정렬 | $O(P^2 \log P)$ | 중앙 |
| 버킷 분배 | $O(N/P \cdot \log P)$ | 로컬 |
| All-to-all | $O(N/P)$ per pair | 글로벌 |
| 로컬 정렬 | $O((N/P) \log(N/P))$ | 없음 |

총 작업량 $O(N \log N)$, 통신은 $O(N)$ — 거의 최적.

이게 MPI 클러스터, 분산 데이터베이스의 정렬에 흔히 쓰이는 알고리즘. Hadoop의 TeraSort도 sample sort 계열.

## 12.6 Combining Tree vs Counting Network

| 측면 | Combining Tree | Counting Network |
|---|---|---|
| 깊이 | O(log N) | O(log² N) |
| 경합 | 트리 노드마다 | balancer마다 (적음) |
| 메모리 | O(N) | O(N log N) |
| 복잡도 | 보통 | 매우 복잡 |
| 실용성 | 가끔 사용 | 거의 안 사용 |

Counting network는 이론적으로 우아하지만 실용성은 제한적. Combining tree나 sharded counter가 더 흔히 쓰인다.

## 12.6.1 분산 카운팅 성능 — 누가 이기는가 (책 figure 12.19)

책 12.10의 실험은 다음 카운터들을 동시 스레드 수에 따라 비교한다.

| 카운터 | 16 thread | 64 thread | 256 thread |
|---|---|---|---|
| Single fetch_add | 매우 빠름 | 정체 | 후퇴 |
| Combining Tree | 중간 | 빠름 | 빠름 |
| Bitonic Counting | 느림 | 중간 | 매우 빠름 |
| Diffracting Tree | 중간 | 빠름 | 매우 빠름 |

**해석**:

- **저병렬 (16 이하)**: single atomic이 이긴다. 분산 구조는 오버헤드만 추가.
- **중병렬 (64)**: combining tree가 이긴다. 트리 합산이 효과를 본다.
- **고병렬 (256+)**: counting / diffracting tree가 이긴다. 분산이 필수.

이 *crossover*가 분산 자료구조의 일반적 패턴이다 — 임계점 이하에서는 단순 구조가 항상 이긴다. 임계점은 하드웨어 (캐시 일관성 비용, 코어 수)에 따라 다르다.

**현대 적용**: NUMA 서버는 노드당 수십 코어이므로 임계점이 자주 넘는다. AWS의 Graviton3는 64코어, Intel Sapphire Rapids는 60코어 — 단일 fetch_add가 병목이 되는 워크로드가 흔하다.

그래서 **단순한 sharded counter (12.7절)가 실용적인 답**이 된다. counting network의 학술적 우아함은 입증되었지만, 구현 복잡도 대비 sharded counter의 이득이 크다.

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
