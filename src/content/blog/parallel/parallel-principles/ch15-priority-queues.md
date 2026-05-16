---
title: "Chapter 15: Priority Queue"
date: 2026-05-12T15:00:00
description: "동시 우선순위 큐 — Heap 기반 / Skiplist 기반 / Linden-Jonsson Relaxed PQ."
series: "The Art of Multiprocessor Programming"
seriesOrder: 15
tags: [parallel, concurrency, book-review, amp, priority-queue, heap, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 15 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 15.1 Priority Queue의 동시성 도전

Priority Queue (PQ) — 우선순위가 가장 높은 원소를 빠르게 꺼낸다.

```cpp
// C++20 인터페이스 개념
template<typename T, typename Priority>
class PriorityQueue {
public:
    void insert(T item, Priority priority);
    std::optional<T> extract_min();
};
```

**자연스러운 병렬성이 없다**. 모든 extract가 한 점 — 가장 우선 — 을 향한다. 그 점이 hot spot.

이게 PQ의 본질적 어려움. Stack/Queue/Hash와는 본질적으로 다르다.

## 15.2 Heap 기반 PQ

순차 PQ의 표준 — Binary Heap.

```
Heap (min-heap):
        1
       / \
      3   2
     / \ / \
    7  5 8  4
```

- O(log N) insert, extractMin
- 배열로 구현 가능 (캐시 친화적)

**동시 구현의 어려움** — heap 연산은 sift-up / sift-down으로 위에서 아래까지 가로지른다. 락을 어디까지 잡을지 모름.

### Hunt et al.의 Concurrent Heap

각 노드에 락. **bottom-up insert + top-down extract**.

```cpp
// C++20 — Concurrent Heap Insert 개념
#include <mutex>
#include <vector>
#include <atomic>

template<typename T>
class ConcurrentHeap {
    struct Node {
        T value;
        std::mutex mtx;
    };

    std::vector<Node> heap_;
    std::atomic<size_t> size_{0};

public:
    void insert(T value) {
        // 1. 락 없이 leaf 위치 확보
        size_t pos = size_.fetch_add(1, std::memory_order_relaxed);
        heap_[pos].value = value;

        // 2. sift-up: 부모와 비교하면서 swap
        while (pos > 0) {
            size_t parent = (pos - 1) / 2;

            // 부모와 자식 모두 락 — 순서 중요
            std::scoped_lock lock(heap_[parent].mtx, heap_[pos].mtx);

            if (heap_[pos].value < heap_[parent].value) {
                std::swap(heap_[pos].value, heap_[parent].value);
                pos = parent;
            } else {
                break;
            }
        }
    }
};
```

```c
// C11 — Concurrent Heap Insert 개념
#include <stdatomic.h>
#include <threads.h>
#include <stdlib.h>

typedef struct {
    int value;
    mtx_t mtx;
} HeapNode;

typedef struct {
    HeapNode* nodes;
    atomic_size_t size;
    size_t capacity;
} ConcurrentHeap;

void heap_insert(ConcurrentHeap* heap, int value) {
    // 1. leaf 위치 확보
    size_t pos = atomic_fetch_add(&heap->size, 1);
    heap->nodes[pos].value = value;

    // 2. sift-up
    while (pos > 0) {
        size_t parent = (pos - 1) / 2;

        // 락 순서: 항상 작은 인덱스 먼저
        if (parent < pos) {
            mtx_lock(&heap->nodes[parent].mtx);
            mtx_lock(&heap->nodes[pos].mtx);
        } else {
            mtx_lock(&heap->nodes[pos].mtx);
            mtx_lock(&heap->nodes[parent].mtx);
        }

        if (heap->nodes[pos].value < heap->nodes[parent].value) {
            int tmp = heap->nodes[pos].value;
            heap->nodes[pos].value = heap->nodes[parent].value;
            heap->nodes[parent].value = tmp;

            mtx_unlock(&heap->nodes[pos].mtx);
            mtx_unlock(&heap->nodes[parent].mtx);
            pos = parent;
        } else {
            mtx_unlock(&heap->nodes[pos].mtx);
            mtx_unlock(&heap->nodes[parent].mtx);
            break;
        }
    }
}
```

복잡하다. 그리고 root 근처에서 경합이 폭발.

## 15.3 Skiplist 기반 PQ

14장의 skiplist를 그대로 사용. 가장 작은 원소는 리스트의 head 다음 노드.

```
Skiplist:
head → 1 → 3 → 5 → 7 → 10 → ...
       ↑
    extractMin은 이걸 꺼냄
```

**Insert**: 정렬된 위치 찾고 lock-free 삽입.
**ExtractMin**: head.next를 꺼냄.

```cpp
// C++20 — Skiplist 기반 PQ ExtractMin
#include <atomic>
#include <optional>

template<typename T>
class SkiplistPQ {
    struct Node {
        T value;
        std::atomic<Node*> next;
        std::atomic<bool> marked{false};
    };

    std::atomic<Node*> head_;

public:
    std::optional<T> extract_min() {
        while (true) {
            Node* first = head_.load(std::memory_order_acquire);
            Node* target = first->next.load(std::memory_order_acquire);

            if (target == nullptr) {
                return std::nullopt;  // 비어 있음
            }

            // CAS로 marked 설정
            bool expected = false;
            if (target->marked.compare_exchange_strong(
                    expected, true,
                    std::memory_order_acq_rel)) {
                // 물리적 제거는 나중에 (lazy deletion)
                return target->value;
            }
            // 다른 스레드가 먼저 mark → 재시도
        }
    }
};
```

```c
// C11 — Skiplist 기반 PQ ExtractMin
#include <stdatomic.h>
#include <stdbool.h>
#include <stddef.h>

typedef struct SkipNode {
    int value;
    _Atomic(struct SkipNode*) next;
    atomic_bool marked;
} SkipNode;

typedef struct {
    _Atomic(SkipNode*) head;
} SkiplistPQ;

bool skiplist_extract_min(SkiplistPQ* pq, int* out_value) {
    while (1) {
        SkipNode* first = atomic_load(&pq->head);
        SkipNode* target = atomic_load(&first->next);

        if (target == NULL) {
            return false;  // 비어 있음
        }

        bool expected = false;
        if (atomic_compare_exchange_strong(&target->marked, &expected, true)) {
            *out_value = target->value;
            return true;
        }
        // 재시도
    }
}
```

**문제** — extractMin도 결국 head 근처에서 경합. Skiplist의 동시성 이득이 PQ에서는 약함.

## 15.4 Relaxed Priority Queue

핵심 통찰 — **엄격한 우선순위가 정말 필요한가?**

```
엄격한 PQ: extractMin은 가장 작은 원소를 반환
Relaxed PQ: extractMin은 가장 작은 K개 중 하나를 반환 (K는 작은 상수)
```

엄밀히는 잘못된 답이지만, 대부분의 응용에서 K가 작으면 충분.

**예** — 작업 스케줄러. 우선순위가 가장 높은 작업을 처리하고 싶지만, K개의 차이는 큰 문제가 아님.

## 15.5 Linden-Jonsson Relaxed PQ

Linden과 Jonsson의 2013년 알고리즘. Skiplist를 기반으로 한 relaxed PQ.

**아이디어**:

- Skiplist 사용 (정렬)
- extractMin이 head.next부터 K개 안에서 **랜덤하게** 선택
- 여러 스레드가 다른 노드를 동시에 extract → 경합 분산

```cpp
// C++20 — Linden-Jonsson Relaxed ExtractMin
#include <atomic>
#include <random>
#include <optional>

template<typename T>
class RelaxedPQ {
    static constexpr int K = 8;  // relaxation 파라미터

    struct Node {
        T value;
        std::atomic<Node*> next;
        std::atomic<bool> marked{false};
    };

    std::atomic<Node*> head_;
    thread_local static std::mt19937 rng_;

public:
    std::optional<T> extract_min() {
        std::uniform_int_distribution<int> dist(0, K - 1);
        int pos = dist(rng_);

        Node* target = head_.load(std::memory_order_acquire)->next.load();

        // pos번째 노드로 이동
        for (int i = 0; i < pos && target != nullptr; ++i) {
            Node* next = target->next.load(std::memory_order_acquire);
            if (next != nullptr) {
                target = next;
            }
        }

        if (target == nullptr) {
            return std::nullopt;
        }

        // CAS로 mark
        bool expected = false;
        if (target->marked.compare_exchange_strong(
                expected, true, std::memory_order_acq_rel)) {
            return target->value;
        }

        return std::nullopt;  // 실패 시 재시도 또는 반환
    }
};
```

```c
// C11 — Linden-Jonsson Relaxed ExtractMin
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>
#include <time.h>

#define RELAXATION_K 8

typedef struct RelaxedNode {
    int value;
    _Atomic(struct RelaxedNode*) next;
    atomic_bool marked;
} RelaxedNode;

typedef struct {
    _Atomic(RelaxedNode*) head;
} RelaxedPQ;

bool relaxed_extract_min(RelaxedPQ* pq, int* out_value) {
    int pos = rand() % RELAXATION_K;

    RelaxedNode* target = atomic_load(&pq->head);
    target = atomic_load(&target->next);

    // pos번째로 이동
    for (int i = 0; i < pos && target != NULL; ++i) {
        RelaxedNode* next = atomic_load(&target->next);
        if (next != NULL) {
            target = next;
        }
    }

    if (target == NULL) {
        return false;
    }

    bool expected = false;
    if (atomic_compare_exchange_strong(&target->marked, &expected, true)) {
        *out_value = target->value;
        return true;
    }

    return false;
}
```

**핵심** — K개 중 하나만 처리하면 되므로 N 스레드가 N개의 다른 노드를 처리 가능. Hot spot 분산.

**성능** — N 스레드에서 거의 N배 빠름. Linden-Jonsson은 PQ 동시성의 큰 진전.

## 15.6 SprayList — 더 강한 분산

Alistarh et al.의 2014년 알고리즘. Skiplist를 위에서부터 랜덤 워크.

```
Level 3: head ─ A ─ B ─ C
                 │
                 ↓ random walk
                 │
Level 2: head ─ A ─ B ─ C ─ D
                       │
Level 0: head ─ ... 일부 노드
```

위 레벨에서 랜덤 워크 → 아래 레벨에서 가까운 노드 extract.

**장점**:
- Spread가 매우 큼 — 여러 스레드가 거의 충돌 안 함
- 평균적으로 K = O(N log N) 같은 비교적 큰 K

**단점**:
- 정확도가 더 약함 (반환값이 글로벌 최소에서 멀 수 있음)

## 15.7 작업 스케줄링의 실용성

PQ의 가장 흔한 응용 — **작업 큐**.

```cpp
// C++20 — 간단한 작업 스케줄러
#include <queue>
#include <mutex>
#include <functional>
#include <thread>
#include <vector>

class TaskScheduler {
    struct Task {
        int priority;
        std::function<void()> work;

        bool operator<(const Task& other) const {
            return priority > other.priority;  // min-heap
        }
    };

    std::priority_queue<Task> queue_;
    std::mutex mtx_;
    std::atomic<bool> running_{true};
    std::vector<std::jthread> workers_;

public:
    explicit TaskScheduler(int num_threads) {
        for (int i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this] { worker_loop(); });
        }
    }

    void submit(int priority, std::function<void()> work) {
        std::lock_guard lock(mtx_);
        queue_.push({priority, std::move(work)});
    }

    void stop() {
        running_.store(false, std::memory_order_release);
    }

private:
    void worker_loop() {
        while (running_.load(std::memory_order_acquire)) {
            std::function<void()> work;
            {
                std::lock_guard lock(mtx_);
                if (!queue_.empty()) {
                    work = std::move(queue_.top().work);
                    queue_.pop();
                }
            }
            if (work) {
                work();
            } else {
                std::this_thread::yield();
            }
        }
    }
};
```

이 컨텍스트에서.

- **Strict PQ**: 가장 우선 작업이 정확히 먼저 — 그러나 hot spot
- **Relaxed PQ**: 거의 우선 — 충분, 그리고 빠름

실전에서는 거의 항상 relaxed PQ. 또는 다중 PQ (각 스레드가 자기 큐) + work stealing (16장에서).

## 15.8 Multi-Queue PQ

각 스레드(또는 sharded group)가 자기 작은 PQ를 가진다.

```cpp
// C++20 — Multi-Queue PQ
#include <vector>
#include <queue>
#include <mutex>
#include <optional>
#include <random>

template<typename T>
class MultiQueuePQ {
    struct LocalQueue {
        std::priority_queue<T, std::vector<T>, std::greater<T>> pq;
        std::mutex mtx;
    };

    std::vector<LocalQueue> queues_;
    int num_queues_;

public:
    explicit MultiQueuePQ(int num_queues)
        : queues_(num_queues), num_queues_(num_queues) {}

    void insert(T item, int hint = -1) {
        int idx = (hint >= 0) ? hint % num_queues_
                              : std::hash<std::thread::id>{}(
                                    std::this_thread::get_id()) % num_queues_;
        std::lock_guard lock(queues_[idx].mtx);
        queues_[idx].pq.push(std::move(item));
    }

    std::optional<T> extract_min(int hint = -1) {
        // 1. 자기 큐에서 시도
        int idx = (hint >= 0) ? hint % num_queues_
                              : std::hash<std::thread::id>{}(
                                    std::this_thread::get_id()) % num_queues_;

        {
            std::lock_guard lock(queues_[idx].mtx);
            if (!queues_[idx].pq.empty()) {
                T item = std::move(queues_[idx].pq.top());
                queues_[idx].pq.pop();
                return item;
            }
        }

        // 2. Work stealing — 다른 큐에서 훔침
        thread_local std::mt19937 rng(std::random_device{}());
        for (int attempts = 0; attempts < num_queues_; ++attempts) {
            int victim = std::uniform_int_distribution<int>(0, num_queues_ - 1)(rng);
            std::lock_guard lock(queues_[victim].mtx);
            if (!queues_[victim].pq.empty()) {
                T item = std::move(queues_[victim].pq.top());
                queues_[victim].pq.pop();
                return item;
            }
        }

        return std::nullopt;
    }
};
```

```c
// C11 — Multi-Queue PQ (간략화)
#include <stdatomic.h>
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

#define MAX_QUEUE_SIZE 1024

typedef struct {
    int items[MAX_QUEUE_SIZE];
    size_t size;
    mtx_t mtx;
} LocalPQ;

typedef struct {
    LocalPQ* queues;
    int num_queues;
} MultiQueuePQ;

void multi_pq_insert(MultiQueuePQ* mpq, int item, int thread_id) {
    int idx = thread_id % mpq->num_queues;
    mtx_lock(&mpq->queues[idx].mtx);

    // 간단한 삽입 (실제로는 heap 유지)
    if (mpq->queues[idx].size < MAX_QUEUE_SIZE) {
        mpq->queues[idx].items[mpq->queues[idx].size++] = item;
        // heapify-up 생략
    }

    mtx_unlock(&mpq->queues[idx].mtx);
}

bool multi_pq_extract(MultiQueuePQ* mpq, int thread_id, int* out_value) {
    // 1. 자기 큐 시도
    int idx = thread_id % mpq->num_queues;
    mtx_lock(&mpq->queues[idx].mtx);

    if (mpq->queues[idx].size > 0) {
        *out_value = mpq->queues[idx].items[0];
        // heapify-down 생략
        mpq->queues[idx].size--;
        mtx_unlock(&mpq->queues[idx].mtx);
        return true;
    }
    mtx_unlock(&mpq->queues[idx].mtx);

    // 2. Work stealing
    for (int i = 0; i < mpq->num_queues; ++i) {
        int victim = rand() % mpq->num_queues;
        mtx_lock(&mpq->queues[victim].mtx);

        if (mpq->queues[victim].size > 0) {
            *out_value = mpq->queues[victim].items[0];
            mpq->queues[victim].size--;
            mtx_unlock(&mpq->queues[victim].mtx);
            return true;
        }
        mtx_unlock(&mpq->queues[victim].mtx);
    }

    return false;
}
```

**장점**: 극도로 적은 경합.
**단점**: 글로벌 최소가 반환된다는 보장 거의 없음.

이게 모던 work-stealing 스케줄러(Cilk, Tokio, Go)의 기본 구조.

## 15.9 PQ는 본질적으로 어렵다

이 챕터의 메시지 — **모든 자료구조가 동시 친화적이지 않다**.

- Stack, Queue, Hash: 자연스러운 병렬성 있음
- Sorted List, Skiplist: 어느 정도 있음
- **Priority Queue: 본질적으로 hot spot 있음**

PQ를 강제로 lock-free로 만들 수는 있다. 그러나 **strict semantics + 좋은 성능 + lock-free**의 셋을 동시에는 불가능에 가깝다.

대신 **semantics를 약하게** 해서 (relaxed) 성능을 얻는다. 또는 **자료구조 자체를 바꿔서** (multi-queue + work stealing) 다른 모델을 채택.

## 15.10 실용적 권장

| 상황 | C++ 추천 | C 추천 |
|---|---|---|
| 순차 PQ | `std::priority_queue` | 직접 구현 또는 라이브러리 |
| 짧은 임계 + strict | `std::mutex` + heap | `mtx_t` + heap |
| 동시 + relaxed OK | oneTBB `concurrent_priority_queue` | Linden-Jonsson 구현 |
| 작업 스케줄링 | Multi-queue + work stealing | Multi-queue + work stealing |

직접 lock-free PQ는 거의 항상 잘못. 라이브러리 사용 권장.

## 정리

- PQ는 **본질적으로 hot spot** — 모든 extract가 한 점을 향함
- **Heap 기반** 동시 PQ는 복잡하고 경합 심함
- **Skiplist 기반**도 head 근처 경합 존재
- **Relaxed PQ** — semantics 양보로 성능 얻기 (Linden-Jonsson, SprayList)
- 실용적으로는 **multi-queue + work stealing** (모던 스케줄러)
- 모든 자료구조가 동시 친화적이진 않다 — **PQ는 어려운 케이스**

## 한국 개발자의 함정

```
1. *Priority Queue로 작업 스케줄링 = 자연스러움*
   - 단일 PQ는 hot spot
   - 수십~수백 스레드면 처리량 급락
   - Multi-queue + work stealing이 표준

2. *std::priority_queue + std::mutex로 충분*
   - 단일 락 (coarse-grained)
   - 고경합에선 매우 느림
   - 작은 워크로드만 OK

3. *Relaxed PQ는 잘못된 답*
   - 응용이 K-relaxed 허용하면 정답
   - 작업 스케줄러, 그래프 탐색에선 거의 항상 OK
   - 항상 strict가 필요한 건 아님

4. *Heap이 빠르니까 동시도 빠를 것*
   - Heap의 sift-up/sift-down이 동시에선 매우 어려움
   - root 경합 폭발
   - Skiplist 기반 또는 multi-queue 권장
```

## 실무 적용

```
이론 → 실무:
- Strict Concurrent Heap   → std::priority_queue + std::mutex
- Skiplist-based PQ        → 직접 구현 또는 oneTBB
- Relaxed PQ               → 학술적 (Linden-Jonsson, SprayList)
- Multi-queue + steal      → Intel oneTBB, libdispatch

언어별:
- C++: std::priority_queue + std::mutex (단순), TBB::concurrent_priority_queue
- C: 직접 구현 + mtx_t, 또는 외부 라이브러리
- Rust: BinaryHeap + Mutex, crossbeam
- Go: container/heap + sync.Mutex

작업 스케줄러 설계:
- Per-thread local queue (LIFO) + global queue (FIFO/PQ)
- Idle 스레드가 다른 스레드의 큐에서 steal
- 우선순위는 *대략적으로*만 유지
```

## 자기 점검

```
□ PQ가 동시성에 본질적으로 어려운 이유?
□ Heap 기반 동시 PQ의 어려움?
□ Skiplist 기반 PQ가 hot spot을 어떻게 완화?
□ Relaxed PQ의 K 의미?
□ Linden-Jonsson과 SprayList 차이?
□ Multi-queue + work stealing의 트레이드오프?
```

## 다음 장 예고

다음 장은 **Futures, Scheduling, Work Distribution** — work stealing의 정식 다룸.

## 관련 항목

- [Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
- [Ch 16: Futures and Scheduling](/blog/parallel/parallel-principles/ch16-futures-scheduling-and-work-distribution)
- [C++ Concurrency in Action Ch 9: 스레드 풀](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
- [C++ Concurrency in Action Ch 4: future](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
