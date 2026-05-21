---
title: "Chapter 15: Priority Queue"
date: 2026-05-06T15:00:00
description: "동시 우선순위 큐 — Heap 기반 / Skiplist 기반 / Linden-Jonsson Relaxed PQ."
series: "The Art of Multiprocessor Programming"
seriesOrder: 15
tags: [parallel, concurrency, book-review, amp, priority-queue, heap, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 15 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 비유로 먼저 — 영화관 줄·학교 학년반·가족 회의·등록처

이 챕터의 어려움은 한 줄로 — *모든 extract가 root 한 점을 노린다*. 그 점에서 경합이 폭발한다. 그래서 15장의 모든 기법은 "그 한 점을 어떻게 흩을까"의 변주.

**Bounded PQ — 영화관 좌석 등급별 줄.** VIP, R석, S석, A석, B석... 각 등급마다 *자기 줄*이 있다. 좌석 안내원은 *현재 비어 있지 않은 가장 높은 등급*의 줄을 본다. 같은 등급 안에서는 직렬이지만 등급 사이는 완전 병렬. 우선순위가 *작은 정수 집합*인 OS 스케줄러의 nice 값(-20..19)이 정확히 이 모델.

**Tree of bins — 학교 학년·반.** 우선순위가 *임의 정수*면 영화관 줄로는 부족하다. 학년-반-번호의 *trie*로 일반화. 비트 단위로 좌/우 분기해 leaf에 도달. 가장 왼쪽 leaf가 최소.

**Heap with per-node lock — 가족 회의.** 가족 단위로 결정을 내린다. 부모와 자식의 swap은 *두 가족만의 결정* — 옆 가족은 동시에 자기 회의를 진행할 수 있다. 다만 *큰집*(root)에서의 결정은 모두가 기다린다. 이게 Hunt et al.의 fine-grained heap.

**SkipQueue — 등록처에 줄을 서는데 자연 정렬.** Skiplist가 이미 정렬되어 있으므로 head.next가 최소. 여러 사람이 동시에 *서로 다른 앞자리*에 마킹하면 자연스럽게 분산. 다만 모두가 *맨 앞을 노리는* 본성은 그대로라 cache line ping-pong은 남는다.

비유에서 보다시피, PQ는 자연 병렬성이 *없다*. 13장 해시와 정반대. 그래서 어디까지 양보할지 — strict semantics를 깰지 말지 — 가 핵심 결정이다.

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

## 15.1a BoundedPriorityQueue (Listing 15.4) — Bin Array

### 다시 — 영화관 좌석 등급별 줄

```text
VIP 줄    ━━ [손님 a]
R석 줄    ━━ [손님 b, c]
S석 줄    ━━ [손님 d, e, f]
A석 줄    ━━ [손님 g]
B석 줄    ━━ []  ← 비었음
```

좌석 안내원은 *위에서부터* 비지 않은 줄을 찾아 첫 손님을 받는다. `extractMin()` = "VIP 비었으면 R, R 비었으면 S, ..."

여러 안내원이 동시에 일해도 *같은 줄을 동시에 처리할 때만* 부딪힌다. 줄이 5개면 안내원 5명까지는 거의 부딪힐 일이 없다.

이게 작동하는 조건은 *등급 수가 적어야* 한다는 것. 100명짜리 영화관에 좌석 등급을 100개 둘 수는 없다. 그래서 OS 스케줄러처럼 *우선순위가 작은 정수 집합*인 응용에 한정된다.

가장 단순한 동시 PQ. 우선순위 값이 *작은 정수 범위*에 속한다고 가정.

```text
priority 0 ┐
priority 1 │── 각 우선순위마다 lock-free queue (bin)
priority 2 │
...        │
priority M ┘
```

각 bin이 독립 큐. `insert(item, p)`는 `bin[p].enqueue(item)`. `extractMin()`은 *비어 있지 않은 가장 낮은 인덱스의 bin*에서 dequeue.

```cpp
// BoundedPriorityQueue — 책 Listing 15.4의 핵심
template<typename T, int M>
class BoundedPriorityQueue {
    std::array<LockFreeQueue<T>, M> bins;  // 10장의 lock-free queue 재사용
    std::atomic<int> minHint{0};            // 어디서부터 검색 시작할지 hint

public:
    void insert(T item, int p) {
        bins[p].enqueue(std::move(item));
        // hint 갱신: 더 작은 priority면 업데이트
        int curr = minHint.load(std::memory_order_relaxed);
        while (p < curr &&
               !minHint.compare_exchange_weak(curr, p)) { /* retry */ }
    }

    std::optional<T> extractMin() {
        int start = minHint.load(std::memory_order_acquire);
        for (int p = start; p < M; ++p) {
            if (auto item = bins[p].dequeue()) {
                // hint를 p로 (이후 다른 스레드 도움)
                int curr = minHint.load(std::memory_order_relaxed);
                if (curr < p) minHint.compare_exchange_weak(curr, p);
                return item;
            }
        }
        return std::nullopt;
    }
};
```

**장점** — bin이 독립이라 같은 우선순위 작업은 자연스러운 병렬성. lock-free queue가 그대로 활용된다.

**한계** — `M`이 작아야 한다 (모든 bin 스캔이 `O(M)`). 우선순위가 *연속된 작은 정수*인 응용에만 적합. OS 스케줄러의 priority class(예: nice -20..19)처럼.

## 15.1b UnboundedPriorityQueue (Listing 15.10) — Tree of Bins

우선순위가 큰 범위거나 실수면 bin 배열이 불가능. **트리로 일반화**.

책 Listing 15.10의 `UnboundedPriorityQueue` — bin들을 **이진 트리**로 조직. 트리의 각 leaf가 우선순위 구간 하나의 bin이고, 트리의 high bit부터 우선순위를 따라 내려간다.

```text
                  [0, ∞)
                 /       \
          [0, M/2)        [M/2, ∞)
           /    \           /    \
         ...    ...       ...    ...
        bin    bin       bin    bin
```

`insert(item, p)`는 트리를 따라 내려가서 leaf bin에 넣는다. 새 leaf가 필요하면 트리를 확장.

```cpp
// UnboundedPriorityQueue — 책 Listing 15.10의 핵심 개념
template<typename T>
class UnboundedPriorityQueue {
    struct TreeNode {
        std::atomic<TreeNode*> left{nullptr};
        std::atomic<TreeNode*> right{nullptr};
        LockFreeQueue<T> bin;  // leaf만 의미 있음
    };

    TreeNode* root;

    void insert(T item, uint64_t p) {
        TreeNode* node = root;
        for (int bit = 63; bit >= 0; --bit) {
            // 비트별로 좌/우 분기 (CAS로 lazy하게 자식 노드 생성)
            std::atomic<TreeNode*>& child =
                (p & (1ULL << bit)) ? node->right : node->left;
            TreeNode* next = child.load();
            if (!next) {
                next = new TreeNode();
                TreeNode* exp = nullptr;
                if (!child.compare_exchange_strong(exp, next)) {
                    delete next;
                    next = exp;
                }
            }
            node = next;
        }
        node->bin.enqueue(std::move(item));
    }
};
```

**핵심** — 트리가 *우선순위 비트의 trie*. extract는 항상 leftmost 살아있는 leaf로. 무한히 많은 우선순위를 다룰 수 있다.

다만 leftmost 검색이 다시 hot spot이 된다는 게 PQ의 본질적 한계.

## 15.2 Heap 기반 PQ

### 비유 — 가족 회의

Heap을 *가계도*로 본다. root는 가장 높은 어른, 그 아래로 자식, 손주.

순차 heap의 sift-up — 새 가족원이 들어왔을 때 *부모와 비교해 자기가 더 우선이면 자리 바꿈*. 윗대까지 반복.

이걸 동시에 하려면? 각 부모-자식 swap이 *두 사람만의 결정*이라는 점에 주목한다. 옆 가족(다른 형제 라인)은 *동시에* 자기 회의 가능.

Hunt et al.의 트릭 — **부모-자식 두 노드의 락만 잡는다**. 부모와 자식이 swap을 결정하면 *그 두 락만*. 다른 가족 회의는 동시 진행.

```text
            [01]                ← root 락 (extract 중)
           /    \
        [03]    [02]             ← 가족 단위로 락
        / \      / \
      [07][05] [08][04]
```

문제 — root는 *모든 extract*가 노리는 점. 가족이 100가구라도 *큰집 결정* 한 번에 모두 멈춘다. fine-grained heap도 root 경합은 해결 못 한다.

이게 PQ가 본질적으로 어려운 이유다.

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

### FineGrainedHeap — 노드별 락 + percolation

책 15.2절의 `FineGrainedHeap`은 위 Hunt et al. 패턴을 더 정밀화. **각 노드마다 락 + 상태 enum**.

```cpp
// FineGrainedHeap의 노드 상태
enum class Status { EMPTY, AVAILABLE, BUSY };

struct HeapNode {
    int priority;
    std::atomic<Status> status;
    std::thread::id owner;  // BUSY일 때 작업 중인 스레드
    std::mutex mtx;
};
```

**Bottom-up insert** (percolate up).

1. `size++`로 leaf 자리 확보 → `status = BUSY` + `owner = me`.
2. 부모 락 잡고 비교. 부모 priority가 더 크면 swap.
3. 부모로 올라가서 반복. 도착하면 `status = AVAILABLE`.

**Top-down extract** (percolate down).

1. root 락 → 마지막 leaf와 swap → leaf 제거.
2. root에서 *더 작은 자식*과 비교하며 내려감 (sift-down).
3. 매 단계 자식 락 획득. 부모-자식 *둘만* 락 — 그래서 fine-grained.

이게 책 15.2의 핵심. **두 방향 percolation이 동시 진행 가능**하다는 게 동시성 이득.

**문제** — root는 여전히 모든 extract의 hot spot. 그래서 다음 절들이 등장.

## 15.3 Skiplist 기반 PQ

### 비유 — 미시간호 등록처

대학 등록처에 학번 순으로 줄이 자연 정렬되어 있다. 가장 앞은 학번이 가장 낮은(=우선) 학생.

직원 여러 명이 동시에 *맨 앞부터 한 명씩 처리*한다. 첫 직원이 1번 학생을 *마킹*하면 두 번째 직원은 자연스럽게 2번 학생으로 넘어간다. 세 번째는 3번. CAS 실패가 자연 back-off 역할.

```text
head ━ 1(mark)━ 2(mark)━ 3 ━ 4 ━ 5 ━ ...
        ↑          ↑         ↑
      직원 A     직원 B    직원 C가 노리는 자리
```

이게 SkipQueue의 영리한 점 — *엄밀한 strict PQ semantics를 유지하면서* 어느 정도 분산을 얻는다.

다만 cache 관점에서는 여전히 *head 근처 line이 ping-pong*된다. 모두가 같은 영역을 마킹하기 때문. 스레드 수가 늘면 ping-pong 비용이 폭증한다. 그래서 다음 절들이 *semantics를 양보*해 분산을 더 얻는다.

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

### SkipQueue (Listing 15.15) — Skiplist 기반 정식 PQ

책 Listing 15.15의 `SkipQueue` — 14장 `LockFreeSkipListSet`을 PQ로 그대로 활용. 핵심은.

- `insert(p)` = skiplist에 `p`를 add.
- `extractMin()` = head부터 *마킹되지 않은 첫 노드*를 마킹하고 반환.

```cpp
// SkipQueue — 책 Listing 15.15의 핵심
template<typename T>
class SkipQueue {
    LockFreeSkipList<int, T> list;

public:
    void insert(int prio, T item) {
        list.add(prio, std::move(item));
    }

    std::optional<T> extractMin() {
        Node* curr = list.head->next[0].load();
        while (curr != list.tail) {
            // CAS로 marked 설정 시도
            uintptr_t next = curr->next[0].load();
            if (!isMarked(next)) {
                uintptr_t marked = next | 1;
                if (curr->next[0].compare_exchange_strong(next, marked)) {
                    // 성공 — 이 노드를 internal find()가 나중에 unlink
                    return curr->value;
                }
            }
            curr = getRef(curr->next[0].load());
        }
        return std::nullopt;  // 비었음
    }
};
```

**왜 두 단계가 다른가**.

- Skiplist의 `remove(key)` — 키로 위치 찾고 마킹. O(log N).
- `extractMin()` — 항상 head.next부터 순차. 평균 O(1)이지만 *경합 시 O(스레드 수)*.

여러 스레드가 동시에 extract하면 각자 head, head.next, head.next.next ... 를 시도한다. CAS 실패가 자연스러운 **back-off** 역할 — 결과적으로 N개 스레드가 N개의 서로 다른 minimum-after-mark 노드를 가져간다.

이게 SkipQueue의 영리한 점. *엄밀한 strict PQ semantics를 유지하면서* 어느 정도 분산을 얻는다. 다만 N이 커지면 cache line ping-pong이 심해진다.

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

## 시스템 사례 — 어디서 PQ가 살아 있나

### Kafka delayed messages / time wheel

Apache Kafka 같은 메시지 브로커가 *지연 전송*을 다룰 때 모든 메시지를 PQ에 넣어 *가장 빠른 만기*부터 처리한다 — 단순한 답.

문제는 *수백만 timer*가 들어올 때 PQ의 root 경합이 폭발한다는 것. 그래서 시스템들은 *hierarchical timing wheel* (Varghese-Lauck 1987)을 쓴다. 우선순위(=시각)를 *시·분·초·밀리초*로 분해해 *여러 ring buffer*로 분산. 같은 ms 안 timer만 같은 슬롯에서 다툰다.

이게 15장의 trick — **PQ의 hot spot을 피하려면 자료구조 자체를 바꾼다**. Kafka, Netty, kernel timer가 모두 timing wheel 기반.

### Java `PriorityBlockingQueue`

`java.util.concurrent`의 표준 동시 PQ. *binary heap + ReentrantLock + Condition*. 책의 15.10 표에서 "짧은 임계 + strict" 자리.

이 구현은 *coarse-grained*다. 모든 작업이 단일 락 뒤에서 직렬. 그러나 *간결함과 strict semantics*가 매력. 워크로드가 작거나 락 경합이 본질적으로 작으면 충분.

내부 trade-off — *queue full*은 unbounded라 막지 않지만 `take()`는 block한다. 그래서 `BlockingQueue` 인터페이스를 만족. Producer-Consumer 패턴의 보편적 답.

### OS scheduler (Linux CFS, BFS, ...)

리눅스의 CFS(Completely Fair Scheduler)는 *red-black tree*로 task를 정렬한다. 가장 작은 vruntime을 가진 task가 *최우선*. 형식적으로 정렬된 자료구조지만, *per-CPU runqueue*를 두고 task가 CPU 사이를 이주(load balance)하는 식으로 동시성 문제를 회피.

즉 CFS는 *single-thread sort + multi-queue*. 13~15장의 비유로 보면 — 각 CPU가 자기 호텔을 운영, 손님 이주는 *주기적인 load balancer*가 담당. PQ 안의 동시 경합을 *동시 PQ 자체를 안 만드는* 방식으로 회피한 답.

modern scheduler (Go, Tokio, Cilk)는 *work stealing*. 자기 큐가 비면 옆 큐의 *뒷부분*을 훔친다. 우선순위는 *대략적으로만* 유지 — relaxed semantics. 책 15.8과 같은 모델이다.

세 사례가 보여주는 패턴 — *strict PQ를 동시에 만들지 말고 다른 모델로 우회하라*. 15장의 본질적 메시지다.

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

- [ ] PQ가 동시성에 본질적으로 어려운 이유?
- [ ] Heap 기반 동시 PQ의 어려움?
- [ ] Skiplist 기반 PQ가 hot spot을 어떻게 완화?
- [ ] Relaxed PQ의 K 의미?
- [ ] Linden-Jonsson과 SprayList 차이?
- [ ] Multi-queue + work stealing의 트레이드오프?

## 다음 장 예고

다음 장은 **Futures, Scheduling, Work Distribution** — work stealing의 정식 다룸.

## 관련 항목

- [Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
- [Ch 16: Futures and Scheduling](/blog/parallel/parallel-principles/ch16-futures-scheduling-and-work-distribution)
- [C++ Concurrency in Action Ch 9: 스레드 풀](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
- [C++ Concurrency in Action Ch 4: future](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
