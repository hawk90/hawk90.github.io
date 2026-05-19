---
title: "Chapter 9: Linked List — Locking의 역할"
date: 2026-05-06T09:00:00
description: "동시성 리스트의 진화 — 거대 락, 미세 락, optimistic, lazy, lock-free."
series: "The Art of Multiprocessor Programming"
seriesOrder: 9
tags: [parallel, concurrency, book-review, amp, linked-list, lock-free, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 9 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 9.1 동시성 자료구조의 진화

가장 단순한 자료구조 — 정렬된 연결 리스트 — 를 통해 동시성 자료구조 설계의 5단계 진화를 본다.

각 단계는 직전 단계의 한계를 극복한다. 이 흐름이 모든 동시성 자료구조 디자인의 일반적 패턴이다.

```
1. Coarse-Grained — 거대 락
2. Fine-Grained — 노드별 락
3. Optimistic — 낙관적 잠금
4. Lazy — 게으른 삭제
5. Lock-Free — 락 없음
```

## 9.2 Coarse-Grained — 거대 락

```cpp
// C++20 Coarse-Grained Linked List
#include <mutex>
#include <memory>
#include <limits>

template <typename T>
class CoarseList {
    struct Node {
        T item;
        int key;
        std::unique_ptr<Node> next;

        Node(int k) : key(k), next(nullptr) {}
        Node(T i, int k) : item(std::move(i)), key(k), next(nullptr) {}
    };

    std::unique_ptr<Node> head_;
    std::mutex mtx_;

public:
    CoarseList() {
        head_ = std::make_unique<Node>(std::numeric_limits<int>::min());
        head_->next = std::make_unique<Node>(std::numeric_limits<int>::max());
    }

    bool add(T item, int key) {
        std::lock_guard lock(mtx_);

        Node* pred = head_.get();
        Node* curr = pred->next.get();

        while (curr->key < key) {
            pred = curr;
            curr = curr->next.get();
        }

        if (curr->key == key) {
            return false;  // 이미 존재
        }

        auto new_node = std::make_unique<Node>(std::move(item), key);
        new_node->next = std::move(pred->next);
        pred->next = std::move(new_node);
        return true;
    }

    bool remove(int key) {
        std::lock_guard lock(mtx_);

        Node* pred = head_.get();
        Node* curr = pred->next.get();

        while (curr->key < key) {
            pred = curr;
            curr = curr->next.get();
        }

        if (curr->key != key) {
            return false;  // 존재하지 않음
        }

        pred->next = std::move(curr->next);
        return true;
    }

    bool contains(int key) {
        std::lock_guard lock(mtx_);

        Node* curr = head_->next.get();
        while (curr->key < key) {
            curr = curr->next.get();
        }
        return curr->key == key;
    }
};
```

```c
// C11 Coarse-Grained Linked List
#include <pthread.h>
#include <stdlib.h>
#include <stdbool.h>
#include <limits.h>

typedef struct Node {
    int item;
    int key;
    struct Node* next;
} Node;

typedef struct {
    Node* head;
    pthread_mutex_t mtx;
} CoarseList;

Node* node_create(int item, int key) {
    Node* node = malloc(sizeof(Node));
    node->item = item;
    node->key = key;
    node->next = NULL;
    return node;
}

void coarse_init(CoarseList* list) {
    list->head = node_create(0, INT_MIN);
    list->head->next = node_create(0, INT_MAX);
    pthread_mutex_init(&list->mtx, NULL);
}

bool coarse_add(CoarseList* list, int item, int key) {
    pthread_mutex_lock(&list->mtx);

    Node* pred = list->head;
    Node* curr = pred->next;

    while (curr->key < key) {
        pred = curr;
        curr = curr->next;
    }

    if (curr->key == key) {
        pthread_mutex_unlock(&list->mtx);
        return false;  // 이미 존재
    }

    Node* new_node = node_create(item, key);
    new_node->next = curr;
    pred->next = new_node;

    pthread_mutex_unlock(&list->mtx);
    return true;
}

bool coarse_remove(CoarseList* list, int key) {
    pthread_mutex_lock(&list->mtx);

    Node* pred = list->head;
    Node* curr = pred->next;

    while (curr->key < key) {
        pred = curr;
        curr = curr->next;
    }

    if (curr->key != key) {
        pthread_mutex_unlock(&list->mtx);
        return false;
    }

    pred->next = curr->next;
    free(curr);

    pthread_mutex_unlock(&list->mtx);
    return true;
}

bool coarse_contains(CoarseList* list, int key) {
    pthread_mutex_lock(&list->mtx);

    Node* curr = list->head->next;
    while (curr->key < key) {
        curr = curr->next;
    }

    bool found = (curr->key == key);
    pthread_mutex_unlock(&list->mtx);
    return found;
}
```

**장점**: 단순. 정확성 분명.
**단점**: **모든 작업이 순차적**. 멀티 코어 이득 없음.

기준선(baseline). 빠른 prototype에 좋다.

## 9.3 Fine-Grained — 노드별 락

각 노드에 락. **Hand-over-hand locking** (또는 lock coupling).

```cpp
// C++20 Fine-Grained Linked List (Hand-over-Hand Locking)
#include <mutex>
#include <memory>
#include <limits>

template <typename T>
class FineList {
    struct Node {
        T item;
        int key;
        std::unique_ptr<Node> next;
        mutable std::mutex mtx;

        Node(int k) : key(k), next(nullptr) {}
        Node(T i, int k) : item(std::move(i)), key(k), next(nullptr) {}
    };

    std::unique_ptr<Node> head_;

public:
    FineList() {
        head_ = std::make_unique<Node>(std::numeric_limits<int>::min());
        head_->next = std::make_unique<Node>(std::numeric_limits<int>::max());
    }

    bool add(T item, int key) {
        head_->mtx.lock();
        Node* pred = head_.get();
        Node* curr = pred->next.get();
        curr->mtx.lock();

        while (curr->key < key) {
            pred->mtx.unlock();      // 직전 락 풀고
            pred = curr;              // 한 칸 이동
            curr = curr->next.get();
            curr->mtx.lock();         // 다음 락 잡기
        }

        if (curr->key == key) {
            pred->mtx.unlock();
            curr->mtx.unlock();
            return false;
        }

        auto new_node = std::make_unique<Node>(std::move(item), key);
        new_node->next = std::move(pred->next);
        pred->next = std::move(new_node);

        pred->mtx.unlock();
        curr->mtx.unlock();
        return true;
    }

    bool remove(int key) {
        head_->mtx.lock();
        Node* pred = head_.get();
        Node* curr = pred->next.get();
        curr->mtx.lock();

        while (curr->key < key) {
            pred->mtx.unlock();
            pred = curr;
            curr = curr->next.get();
            curr->mtx.lock();
        }

        if (curr->key != key) {
            pred->mtx.unlock();
            curr->mtx.unlock();
            return false;
        }

        pred->next = std::move(curr->next);
        pred->mtx.unlock();
        curr->mtx.unlock();
        return true;
    }

    bool contains(int key) {
        head_->mtx.lock();
        Node* pred = head_.get();
        Node* curr = pred->next.get();
        curr->mtx.lock();

        while (curr->key < key) {
            pred->mtx.unlock();
            pred = curr;
            curr = curr->next.get();
            curr->mtx.lock();
        }

        bool found = (curr->key == key);
        pred->mtx.unlock();
        curr->mtx.unlock();
        return found;
    }
};
```

```c
// C11 Fine-Grained Linked List
#include <pthread.h>
#include <stdlib.h>
#include <stdbool.h>
#include <limits.h>

typedef struct FineNode {
    int item;
    int key;
    struct FineNode* next;
    pthread_mutex_t mtx;
} FineNode;

typedef struct {
    FineNode* head;
} FineList;

FineNode* fine_node_create(int item, int key) {
    FineNode* node = malloc(sizeof(FineNode));
    node->item = item;
    node->key = key;
    node->next = NULL;
    pthread_mutex_init(&node->mtx, NULL);
    return node;
}

void fine_init(FineList* list) {
    list->head = fine_node_create(0, INT_MIN);
    list->head->next = fine_node_create(0, INT_MAX);
}

bool fine_add(FineList* list, int item, int key) {
    pthread_mutex_lock(&list->head->mtx);
    FineNode* pred = list->head;
    FineNode* curr = pred->next;
    pthread_mutex_lock(&curr->mtx);

    while (curr->key < key) {
        pthread_mutex_unlock(&pred->mtx);  // 직전 락 풀고
        pred = curr;                        // 한 칸 이동
        curr = curr->next;
        pthread_mutex_lock(&curr->mtx);     // 다음 락 잡기
    }

    if (curr->key == key) {
        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
        return false;
    }

    FineNode* new_node = fine_node_create(item, key);
    new_node->next = curr;
    pred->next = new_node;

    pthread_mutex_unlock(&pred->mtx);
    pthread_mutex_unlock(&curr->mtx);
    return true;
}

bool fine_remove(FineList* list, int key) {
    pthread_mutex_lock(&list->head->mtx);
    FineNode* pred = list->head;
    FineNode* curr = pred->next;
    pthread_mutex_lock(&curr->mtx);

    while (curr->key < key) {
        pthread_mutex_unlock(&pred->mtx);
        pred = curr;
        curr = curr->next;
        pthread_mutex_lock(&curr->mtx);
    }

    if (curr->key != key) {
        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
        return false;
    }

    pred->next = curr->next;
    pthread_mutex_unlock(&pred->mtx);
    pthread_mutex_unlock(&curr->mtx);
    // Note: curr를 free하기 전에 다른 스레드가 접근하지 않음을 보장해야 함
    free(curr);
    return true;
}

bool fine_contains(FineList* list, int key) {
    pthread_mutex_lock(&list->head->mtx);
    FineNode* pred = list->head;
    FineNode* curr = pred->next;
    pthread_mutex_lock(&curr->mtx);

    while (curr->key < key) {
        pthread_mutex_unlock(&pred->mtx);
        pred = curr;
        curr = curr->next;
        pthread_mutex_lock(&curr->mtx);
    }

    bool found = (curr->key == key);
    pthread_mutex_unlock(&pred->mtx);
    pthread_mutex_unlock(&curr->mtx);
    return found;
}
```

매 시점에 **인접 두 노드**의 락을 잡는다. 손에 손 잡고.

**장점**: 다른 부분에서 동시 작업 가능.
**단점**: 락 획득/해제 비용이 큼. 매 노드마다.

## 9.4 Optimistic — 낙관적 잠금

대부분의 시간에 경합이 없다는 가정. 락 없이 검색하고, 수정할 때만 락.

```cpp
// C++20 Optimistic Linked List
#include <mutex>
#include <atomic>
#include <limits>

template <typename T>
class OptimisticList {
    struct Node {
        T item;
        int key;
        Node* next;
        mutable std::mutex mtx;

        Node(int k) : key(k), next(nullptr) {}
        Node(T i, int k) : item(std::move(i)), key(k), next(nullptr) {}
    };

    Node* head_;

    // 검증: pred에서 curr이 여전히 도달 가능한가?
    bool validate(Node* pred, Node* curr) {
        Node* node = head_;
        while (node->key <= pred->key) {
            if (node == pred) {
                return pred->next == curr;
            }
            node = node->next;
        }
        return false;
    }

public:
    OptimisticList() {
        head_ = new Node(std::numeric_limits<int>::min());
        head_->next = new Node(std::numeric_limits<int>::max());
    }

    bool add(T item, int key) {
        while (true) {
            // 1. 락 없이 찾기
            Node* pred = head_;
            Node* curr = pred->next;
            while (curr->key < key) {
                pred = curr;
                curr = curr->next;
            }

            // 2. 락 잡기
            std::scoped_lock lock(pred->mtx, curr->mtx);

            // 3. 검증 — 그 사이 변경 없었나?
            if (validate(pred, curr)) {
                if (curr->key == key) {
                    return false;  // 이미 존재
                }
                // 안 변했음 — 삽입
                Node* new_node = new Node(std::move(item), key);
                new_node->next = curr;
                pred->next = new_node;
                return true;
            }
            // 4. 변했음 — 다시 시작
        }
    }

    bool remove(int key) {
        while (true) {
            Node* pred = head_;
            Node* curr = pred->next;
            while (curr->key < key) {
                pred = curr;
                curr = curr->next;
            }

            std::scoped_lock lock(pred->mtx, curr->mtx);

            if (validate(pred, curr)) {
                if (curr->key != key) {
                    return false;
                }
                pred->next = curr->next;
                // Note: 메모리 회수는 별도 처리 필요 (hazard pointer 등)
                return true;
            }
        }
    }

    bool contains(int key) {
        while (true) {
            Node* pred = head_;
            Node* curr = pred->next;
            while (curr->key < key) {
                pred = curr;
                curr = curr->next;
            }

            std::scoped_lock lock(pred->mtx, curr->mtx);

            if (validate(pred, curr)) {
                return curr->key == key;
            }
        }
    }
};
```

```c
// C11 Optimistic Linked List
#include <pthread.h>
#include <stdlib.h>
#include <stdbool.h>
#include <limits.h>

typedef struct OptNode {
    int item;
    int key;
    struct OptNode* next;
    pthread_mutex_t mtx;
} OptNode;

typedef struct {
    OptNode* head;
} OptimisticList;

OptNode* opt_node_create(int item, int key) {
    OptNode* node = malloc(sizeof(OptNode));
    node->item = item;
    node->key = key;
    node->next = NULL;
    pthread_mutex_init(&node->mtx, NULL);
    return node;
}

void opt_init(OptimisticList* list) {
    list->head = opt_node_create(0, INT_MIN);
    list->head->next = opt_node_create(0, INT_MAX);
}

// 검증: pred에서 curr이 여전히 도달 가능한가?
bool opt_validate(OptimisticList* list, OptNode* pred, OptNode* curr) {
    OptNode* node = list->head;
    while (node->key <= pred->key) {
        if (node == pred) {
            return pred->next == curr;
        }
        node = node->next;
    }
    return false;
}

bool opt_add(OptimisticList* list, int item, int key) {
    while (true) {
        // 1. 락 없이 찾기
        OptNode* pred = list->head;
        OptNode* curr = pred->next;
        while (curr->key < key) {
            pred = curr;
            curr = curr->next;
        }

        // 2. 락 잡기 (데드락 방지: 순서대로)
        pthread_mutex_lock(&pred->mtx);
        pthread_mutex_lock(&curr->mtx);

        // 3. 검증
        if (opt_validate(list, pred, curr)) {
            if (curr->key == key) {
                pthread_mutex_unlock(&pred->mtx);
                pthread_mutex_unlock(&curr->mtx);
                return false;
            }
            OptNode* new_node = opt_node_create(item, key);
            new_node->next = curr;
            pred->next = new_node;
            pthread_mutex_unlock(&pred->mtx);
            pthread_mutex_unlock(&curr->mtx);
            return true;
        }

        // 4. 변했음 — 다시 시작
        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
    }
}

bool opt_remove(OptimisticList* list, int key) {
    while (true) {
        OptNode* pred = list->head;
        OptNode* curr = pred->next;
        while (curr->key < key) {
            pred = curr;
            curr = curr->next;
        }

        pthread_mutex_lock(&pred->mtx);
        pthread_mutex_lock(&curr->mtx);

        if (opt_validate(list, pred, curr)) {
            if (curr->key != key) {
                pthread_mutex_unlock(&pred->mtx);
                pthread_mutex_unlock(&curr->mtx);
                return false;
            }
            pred->next = curr->next;
            pthread_mutex_unlock(&pred->mtx);
            pthread_mutex_unlock(&curr->mtx);
            // Note: curr 메모리 회수는 별도 처리 필요
            return true;
        }

        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
    }
}

bool opt_contains(OptimisticList* list, int key) {
    while (true) {
        OptNode* pred = list->head;
        OptNode* curr = pred->next;
        while (curr->key < key) {
            pred = curr;
            curr = curr->next;
        }

        pthread_mutex_lock(&pred->mtx);
        pthread_mutex_lock(&curr->mtx);

        if (opt_validate(list, pred, curr)) {
            bool found = (curr->key == key);
            pthread_mutex_unlock(&pred->mtx);
            pthread_mutex_unlock(&curr->mtx);
            return found;
        }

        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
    }
}
```

**장점**: 검색이 락 없이 빠름. 캐시 트래픽 적음.
**단점**: validation 비용. 경합 심하면 무한 재시도.

## 9.5 Lazy — 게으른 삭제

삭제를 두 단계로.

1. **Logical delete** — 노드에 `marked` 플래그
2. **Physical delete** — 실제로 next 포인터에서 제거

검색은 marked 노드를 무시한다.

```cpp
// C++20 Lazy Linked List
#include <mutex>
#include <atomic>
#include <limits>

template <typename T>
class LazyList {
    struct Node {
        T item;
        int key;
        Node* next;
        std::atomic<bool> marked{false};
        mutable std::mutex mtx;

        Node(int k) : key(k), next(nullptr) {}
        Node(T i, int k) : item(std::move(i)), key(k), next(nullptr) {}
    };

    Node* head_;

    // 간단한 검증: pred와 curr이 유효하고 연결되어 있는가?
    bool validate(Node* pred, Node* curr) {
        return !pred->marked.load(std::memory_order_acquire) &&
               !curr->marked.load(std::memory_order_acquire) &&
               pred->next == curr;
    }

public:
    LazyList() {
        head_ = new Node(std::numeric_limits<int>::min());
        head_->next = new Node(std::numeric_limits<int>::max());
    }

    bool add(T item, int key) {
        while (true) {
            Node* pred = head_;
            Node* curr = pred->next;
            while (curr->key < key) {
                pred = curr;
                curr = curr->next;
            }

            std::scoped_lock lock(pred->mtx, curr->mtx);

            if (validate(pred, curr)) {
                if (curr->key == key) {
                    return false;
                }
                Node* new_node = new Node(std::move(item), key);
                new_node->next = curr;
                pred->next = new_node;
                return true;
            }
        }
    }

    bool remove(int key) {
        while (true) {
            Node* pred = head_;
            Node* curr = pred->next;
            while (curr->key < key) {
                pred = curr;
                curr = curr->next;
            }

            std::scoped_lock lock(pred->mtx, curr->mtx);

            if (validate(pred, curr)) {
                if (curr->key != key) {
                    return false;
                }
                // 1. Logical delete
                curr->marked.store(true, std::memory_order_release);
                // 2. Physical delete
                pred->next = curr->next;
                // Note: 메모리 회수는 별도 처리
                return true;
            }
        }
    }

    // Wait-free contains!
    bool contains(int key) {
        Node* curr = head_->next;
        while (curr->key < key) {
            curr = curr->next;
        }
        return curr->key == key &&
               !curr->marked.load(std::memory_order_acquire);
    }
};
```

```c
// C11 Lazy Linked List
#include <pthread.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>
#include <limits.h>

typedef struct LazyNode {
    int item;
    int key;
    struct LazyNode* next;
    atomic_bool marked;
    pthread_mutex_t mtx;
} LazyNode;

typedef struct {
    LazyNode* head;
} LazyList;

LazyNode* lazy_node_create(int item, int key) {
    LazyNode* node = malloc(sizeof(LazyNode));
    node->item = item;
    node->key = key;
    node->next = NULL;
    atomic_init(&node->marked, false);
    pthread_mutex_init(&node->mtx, NULL);
    return node;
}

void lazy_init(LazyList* list) {
    list->head = lazy_node_create(0, INT_MIN);
    list->head->next = lazy_node_create(0, INT_MAX);
}

bool lazy_validate(LazyNode* pred, LazyNode* curr) {
    return !atomic_load_explicit(&pred->marked, memory_order_acquire) &&
           !atomic_load_explicit(&curr->marked, memory_order_acquire) &&
           pred->next == curr;
}

bool lazy_add(LazyList* list, int item, int key) {
    while (true) {
        LazyNode* pred = list->head;
        LazyNode* curr = pred->next;
        while (curr->key < key) {
            pred = curr;
            curr = curr->next;
        }

        pthread_mutex_lock(&pred->mtx);
        pthread_mutex_lock(&curr->mtx);

        if (lazy_validate(pred, curr)) {
            if (curr->key == key) {
                pthread_mutex_unlock(&pred->mtx);
                pthread_mutex_unlock(&curr->mtx);
                return false;
            }
            LazyNode* new_node = lazy_node_create(item, key);
            new_node->next = curr;
            pred->next = new_node;
            pthread_mutex_unlock(&pred->mtx);
            pthread_mutex_unlock(&curr->mtx);
            return true;
        }

        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
    }
}

bool lazy_remove(LazyList* list, int key) {
    while (true) {
        LazyNode* pred = list->head;
        LazyNode* curr = pred->next;
        while (curr->key < key) {
            pred = curr;
            curr = curr->next;
        }

        pthread_mutex_lock(&pred->mtx);
        pthread_mutex_lock(&curr->mtx);

        if (lazy_validate(pred, curr)) {
            if (curr->key != key) {
                pthread_mutex_unlock(&pred->mtx);
                pthread_mutex_unlock(&curr->mtx);
                return false;
            }
            // 1. Logical delete
            atomic_store_explicit(&curr->marked, true, memory_order_release);
            // 2. Physical delete
            pred->next = curr->next;
            pthread_mutex_unlock(&pred->mtx);
            pthread_mutex_unlock(&curr->mtx);
            return true;
        }

        pthread_mutex_unlock(&pred->mtx);
        pthread_mutex_unlock(&curr->mtx);
    }
}

// Wait-free contains!
bool lazy_contains(LazyList* list, int key) {
    LazyNode* curr = list->head->next;
    while (curr->key < key) {
        curr = curr->next;
    }
    return curr->key == key &&
           !atomic_load_explicit(&curr->marked, memory_order_acquire);
}
```

**장점**:
- 검색이 락 없음 — 정말 빠름
- `contains()` 같은 read-only 작업이 거의 free

**단점**: 메모리 점유 (marked 노드 즉시 해제 안 됨).

이 패턴이 **wait-free contains**의 핵심 — 검색만큼은 정확히 wait-free.

## 9.6 Lock-Free Linked List

CAS만 사용. 락 전혀 없음.

```cpp
// C++20 Lock-Free Linked List (Harris's Algorithm 기반)
#include <atomic>
#include <limits>
#include <cstdint>

template <typename T>
class LockFreeList {
    struct Node {
        T item;
        int key;
        std::atomic<Node*> next;

        Node(int k) : key(k), next(nullptr) {}
        Node(T i, int k) : item(std::move(i)), key(k), next(nullptr) {}
    };

    // Tagged pointer: low bit = marked
    static Node* get_ptr(Node* p) {
        return reinterpret_cast<Node*>(
            reinterpret_cast<uintptr_t>(p) & ~uintptr_t(1));
    }

    static bool is_marked(Node* p) {
        return reinterpret_cast<uintptr_t>(p) & 1;
    }

    static Node* mark(Node* p) {
        return reinterpret_cast<Node*>(
            reinterpret_cast<uintptr_t>(p) | 1);
    }

    Node* head_;

    // Find: pred와 curr을 찾으면서 marked 노드 정리
    std::pair<Node*, Node*> find(int key) {
        while (true) {
            Node* pred = head_;
            Node* curr = get_ptr(pred->next.load(std::memory_order_acquire));

            while (true) {
                Node* succ = curr->next.load(std::memory_order_acquire);
                while (is_marked(succ)) {
                    // Physical delete of marked node
                    Node* expected = curr;
                    if (!pred->next.compare_exchange_weak(expected, get_ptr(succ),
                            std::memory_order_release, std::memory_order_relaxed)) {
                        break;  // 재시작
                    }
                    curr = get_ptr(succ);
                    succ = curr->next.load(std::memory_order_acquire);
                }
                if (curr->key >= key) {
                    return {pred, curr};
                }
                pred = curr;
                curr = get_ptr(succ);
            }
        }
    }

public:
    LockFreeList() {
        head_ = new Node(std::numeric_limits<int>::min());
        head_->next.store(new Node(std::numeric_limits<int>::max()),
                          std::memory_order_relaxed);
    }

    bool add(T item, int key) {
        Node* new_node = new Node(std::move(item), key);
        while (true) {
            auto [pred, curr] = find(key);
            if (curr->key == key) {
                delete new_node;
                return false;
            }
            new_node->next.store(curr, std::memory_order_relaxed);
            Node* expected = curr;
            if (pred->next.compare_exchange_strong(expected, new_node,
                    std::memory_order_release, std::memory_order_relaxed)) {
                return true;
            }
        }
    }

    bool remove(int key) {
        while (true) {
            auto [pred, curr] = find(key);
            if (curr->key != key) {
                return false;
            }

            Node* succ = get_ptr(curr->next.load(std::memory_order_acquire));

            // 1. Logical delete: mark curr->next
            Node* expected = succ;
            if (!curr->next.compare_exchange_strong(expected, mark(succ),
                    std::memory_order_release, std::memory_order_relaxed)) {
                continue;  // 다른 스레드가 먼저 marked
            }

            // 2. Physical delete: pred->next = succ
            expected = curr;
            pred->next.compare_exchange_strong(expected, succ,
                std::memory_order_release, std::memory_order_relaxed);
            // 실패해도 OK — find에서 정리됨
            return true;
        }
    }

    bool contains(int key) {
        Node* curr = get_ptr(head_->next.load(std::memory_order_acquire));
        while (curr->key < key) {
            curr = get_ptr(curr->next.load(std::memory_order_acquire));
        }
        return curr->key == key &&
               !is_marked(curr->next.load(std::memory_order_acquire));
    }
};
```

**핵심 트릭**: `next` 포인터에 marked 비트를 함께 저장. CAS 한 번으로 둘을 atomic하게.

```
포인터 (low bit가 marked):
  raw:    0x12345678 → 노드 + unmarked
  marked: 0x12345679 → 노드 + marked
```

**장점**: 진정한 lock-free. 한 스레드의 stall이 다른 스레드를 막지 않음.
**단점**: 매우 복잡. ABA 문제, 메모리 회수 어려움.

## 9.7 단계별 성능 비교

벤치마크 (개략 경향).

| 알고리즘 | Read-Heavy | Mix | Write-Heavy |
|---|---|---|---|
| Coarse | 매우 느림 | 매우 느림 | 매우 느림 |
| Fine-Grained | 보통 | 보통 | 빠름 |
| Optimistic | 빠름 | 보통 | 보통 |
| Lazy | 매우 빠름 | 빠름 | 빠름 |
| Lock-Free | 매우 빠름 | 빠름 | 매우 빠름 |

**Lazy**가 실용적으로 가장 좋다. 복잡도 vs 성능 트레이드오프가 적절.

Lock-free는 이론적으로 최고지만 구현 복잡도가 매우 크다 — 라이브러리(folly, junction 등)를 쓰는 게 현실적.

## 9.8 일반화 가능한 교훈

이 챕터의 진화 패턴이 모든 동시성 자료구조에 적용된다.

**1. Coarse부터 시작**

정확성 확보. 기준선.

**2. Hot path를 분리**

읽기만 하는 경로는 락을 안 잡거나, 짧게만.

**3. Logical vs Physical 분리**

삭제, 업데이트를 두 단계로 — 로지컬 표시 + 물리적 처리.

**4. CAS로 atomic 두 작업**

포인터 + 플래그 같이 묶기.

**5. 메모리 회수에 주의**

Lock-free는 GC 또는 hazard pointer 필요.

## 정리

- 동시성 자료구조 진화 — **Coarse → Fine → Optimistic → Lazy → Lock-Free**
- **Hand-over-hand locking** — 인접 두 노드만 락
- **Optimistic** — 락 없이 찾고 락 잡고 검증
- **Lazy** — logical / physical 삭제 분리
- **Lock-Free** — CAS + tagged pointer
- **Lazy**가 실용성과 성능의 가장 좋은 절충

## 한국 개발자의 함정

```
1. *Coarse-grained lock으로 충분*하다는 오해
   - 단일 스레드 성능, 멀티 코어에서 *확장성 0*
   - Throughput 측정 필요

2. *Fine-grained가 항상 빠름*
   - Hand-over-hand는 *충돌 적을 때*
   - 작은 리스트는 coarse가 더 빠를 수 있음

3. *Lock-free가 항상 좋음*
   - 구현 복잡 + ABA 위험
   - GC 없는 언어는 메모리 회수 어려움 (hazard pointer)

4. *Optimistic = 무조건 좋음*
   - 검증 단계의 비용
   - Conflict 빈도 따라 다름
```

## 실무 적용

```
이론 → 실무:
- Coarse              → std::mutex + std::list (단순한 경우)
- Fine (hand-over-hand) → 학술적, 잘 안 씀
- Optimistic           → Java ConcurrentHashMap (size 같은 작업)
- Lazy                 → Java ConcurrentSkipListMap
- Lock-Free            → folly::ConcurrentSkipList (C++)

C++20 선택 기준:
- 짧은 critical section + 낮은 충돌 → optimistic / lazy
- 긴 critical section → coarse 또는 fine + condition var
- 높은 충돌 → coarse 또는 lock-free with backoff

라이브러리 권장:
- C++: folly::ConcurrentHashMap, tbb::concurrent_hash_map
- C: 직접 구현보다 검증된 라이브러리 사용
```

## 자기 점검

```
□ Hand-over-hand locking이 데드락 회피하는 메커니즘?
□ Optimistic의 validation 단계?
□ Lazy의 logical / physical 삭제 분리?
□ Lock-free linked list의 어려움 (CAS만으로 부족)?
□ Hazard pointer가 필요한 이유?
```

## 다음 장 예고

다음 장은 **Concurrent Queue와 ABA 문제** — lock-free queue 디자인.

## 관련 항목

- [Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [Ch 6: Universal Construction](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [C++ Concurrency in Action Ch 6: Lock-based 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
