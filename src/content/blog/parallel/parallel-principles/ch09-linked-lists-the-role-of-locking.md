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
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 9 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 들어가며 — *락 입자도*가 결정하는 것

연결 리스트는 자료구조 교과서의 첫 장에 나오는 가장 단순한 구조다. *그러나* 동시 접근이 들어오는 순간 이 단순함이 깨진다. 단순한 만큼 *락을 어디까지 잘게 쪼개느냐*의 모든 가능성이 한 자료구조에서 펼쳐진다. 이 챕터의 다섯 단계는 그래서 *모든 동시성 자료구조 설계의 축소판*이다.

핵심 질문은 항상 같다. *얼마나 많은 사람이, 얼마나 가까이서 함께 일할 수 있는가*. 도서관 비유로 펼치면 다음과 같다.

| 단계 | 도서관 비유 | 락 입자도 |
|---|---|---|
| Coarse | *입구에서 한 명만* 들여보낸다. 안에는 한 사람뿐. | 리스트 전체에 락 하나 |
| Fine | 책장마다 *손잡이*. 다음 책장 손잡이를 잡고 나서야 이전 책장 손잡이를 놓는다 (등반 안전벨트). | 노드마다 락, hand-over-hand |
| Optimistic | *그냥 뛰어가서* 원하는 책장 앞에 도착, *그 자리에서만* 책장 두 개 손잡이를 잡고 확인. | 노드마다 락, 잡기 전엔 자유 통행 |
| Lazy | 책에 *지워짐 스티커*를 먼저 붙이고 가지러 가는 일은 나중에. | logical / physical 삭제 분리 |
| Lock-Free | 책장 손잡이가 없다. 책 자체에 *마킹*해 다른 사람에게 알린다. | atomic 마킹 비트 |

각 단계는 직전 단계의 *어떤 사람이 어떤 사람을 막는가*를 줄인다. Coarse는 한 명이 들어오면 *모두를 막는다*. Fine은 인접 책장만 막는다. Optimistic은 *내가 일하는 짧은 순간만* 막는다. Lazy는 *읽는 사람을 거의 막지 않는다*. Lock-Free는 아무도 막지 않는다 — 모두가 동시에 진행하면서도 결과가 일관된다.

물론 *공짜는 없다*. 입자도가 잘아질수록 코드가 복잡해지고, *원자성을 유지하는 비용*이 다른 형태로 돌아온다. CAS retry, memory reclamation, ABA 문제. 이 챕터는 그 trade-off를 다섯 단계로 보여 준다.

## 9.1 동시성 자료구조의 진화

가장 단순한 자료구조 — 정렬된 연결 리스트 — 를 통해 동시성 자료구조 설계의 5단계 진화를 본다.

각 단계는 직전 단계의 한계를 극복한다. 이 흐름이 모든 동시성 자료구조 디자인의 일반적 패턴이다.

**1. Coarse-Grained — 거대 락**


**2. Fine-Grained — 노드별 락**


**3. Optimistic — 낙관적 잠금**


**4. Lazy — 게으른 삭제**


**5. Lock-Free — 락 없음**

## 9.2 Coarse-Grained — 거대 락

> **비유** — 도서관 *입구*에 한 명의 안내 직원. 누가 들어오든 직원의 허가가 필요하고, 한 번에 *한 사람만* 들어갈 수 있다. 안에서 무엇을 하든 다른 사람은 입구에서 줄을 선다. 단순하고 확실하다. 그러나 책장 N개에 N명이 동시에 작업할 수 있는데도 *한 명만* 일하게 만든다.

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

### Coarse의 정확성 논증

CoarseList의 정확성은 trivially linearizable이다.

**임의 작업 op:**

- 1. lock 잡기      ← 다른 작업과의 ordering point
- 2. linearization point = lock 잡은 직후
- 3. 작업 수행 (단일 스레드처럼)
- 4. lock 풀기

**이유:**

- 한 시점에 한 스레드만 진행
- 모든 작업이 *어느 순서로든* 순차 실행과 동치
- 따라서 sequential consistency + linearizability 자동

throughput 측정:

| Threads | TPS (operations/sec) | Scaling |
|---|---|---|
| 1 | T | 1× |
| 2 | ≈ T | 0.5× per thread |
| 4 | ≈ T | 0.25× per thread |
| 8 | < T | < 0.125× — 락 경합 때문에 단일 스레드보다 *느림* |

## 9.3 Fine-Grained — 노드별 락

> **비유** — 암벽 등반의 *안전벨트 두 개 규칙*. 손이 두 개니까 항상 *한 손은 잡고* 다음 손을 옮긴다. 다음 손이 다음 홀드를 단단히 잡은 다음에야 이전 손을 놓는다. 절대 두 손이 *동시에* 비어 있지 않는다. linked list의 hand-over-hand가 정확히 이 패턴이다. 두 노드 락을 *겹쳐* 잡으며 전진한다. 안전하지만, 모든 사람이 같은 *방향*으로만 등반해야 한다.

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

### Fine의 정확성 논증 — Deadlock 회피

여러 스레드가 락을 잡는데 어떻게 deadlock이 안 생기는가?

규칙은 *락을 리스트 순서대로만* 잡는다 (head → tail 방향). 모든 스레드가 *같은 방향*이므로 두 스레드가 *서로의 락을 기다릴 수 없고* deadlock이 불가능하다.

linearization point — `add`의 경우 `pred->next = new_node`가 실행된 시점. `remove`는 `pred->next = curr->next`. `contains`는 *마지막으로 본 노드*의 lock을 잡은 시점.

throughput 분석은 비순환 워크로드(키가 균등 분포)에서 거의 선형 scaling. 다만 *짧은 리스트*는 hand-over-hand 오버헤드가 커서 coarse보다 느리다.

## 9.4 Optimistic — 낙관적 잠금

> **비유** — 도서관 통로를 *그냥 뛰어간다*. 목적지 책장 앞에 도착해야 *그 자리에서만* 손잡이를 잡고, 잡은 뒤에 *내가 제대로 도착했는지* 다시 확인한다. 뛰는 동안 다른 사람이 뒤에서 책을 옮겼을 수도 있으니까. 보통은 안 옮긴다 — 그래서 *낙관적*이다. 옮겼으면 다시 뛴다. 손잡이를 잡지 않고 통과하는 비율이 압도적이므로 전체적으론 매우 빠르다.

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

### Optimistic의 정확성 — Validation이 왜 필요한가

락 없이 traverse하면 *traverse 중에* 노드가 사라지거나 (free됨) 다른 자리에 옮겨질 수 있다.

![Optimistic traversal에서 발생하는 lost update — A가 락 없이 traverse하는 동안 B가 n2를 제거하면 A는 오래된 pred-curr 짝을 보게 된다](/images/blog/parallel-principles/diagrams/ch09-lost-update-sequence.svg)

`validate(pred, curr)`는 두 가지 확인:

1. `pred`가 head로부터 *여전히 도달 가능*한가
2. `pred->next == curr`인가

둘 다 OK여야 *atomic snapshot*임이 보장된다. 책은 이를 `linearization point는 validate 성공한 직후`로 잡는다.

비용 — validation은 head부터 재traverse. O(n). 그래서 *traverse + validation = 2 × O(n)*. 락 잡기 비용은 absent. 경합이 적으면 이게 hand-over-hand보다 빠르다.

## 9.5 Lazy — 게으른 삭제

> **비유** — 책장에서 책을 *치우는* 두 단계 작업. 먼저 책 표지에 *"폐기 예정" 스티커*를 붙인다 (logical delete). 책장에서 *실제로 빼는* 일은 나중에. 책을 *읽으러* 온 사람은 스티커만 확인하면 된다 — 책장 손잡이를 잡을 필요가 없다. 읽기 작업은 *락 없이* 진행된다. 쓰기 작업도 자신과 인접 노드만 잠그면 된다.

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

### Lazy의 정확성 — marked bit의 의미

핵심 invariant:

**1. marked == false인 노드는 *현재 리스트에 속함***


**2. marked == true인 노드는 *논리적으로 삭제됨* (곧 unlink)**


**3. unmarked 노드들의 next 체인은 *valid 리스트*를 구성**

validate는 *세 가지*를 본다 — pred unmarked, curr unmarked, pred->next == curr. 셋이 모두 OK이면 *지금 이 순간* pred와 curr이 둘 다 리스트의 멤버임이 확정.

contains는 marked bit만 보고 결정. atomic read 하나로 끝. 그래서 진정한 wait-free.

**contains의 linearization point:**

- 키 발견 + unmarked → '발견' linearization은 marked 읽기 시점
- 키 발견 + marked   → '미발견' linearization도 같은 시점
- 키 미발견 (curr->key > key) → 그 시점이 linearization

이렇게 *모든 contains*는 한 번의 traversal로 끝난다. add/remove의 동시 진행과 무관.

## 9.6 Lock-Free Linked List

> **비유** — 책장 손잡이 자체를 없앤다. 대신 책 *표지에 다른 색깔 마킹*을 한다. 책을 옮기려는 사람은 *옮기기 직전에* 마킹을 한다. 다른 사람이 같은 책에 마킹을 시도하면 *충돌이 보인다* (CAS 실패). 충돌이 보이면 다시 시도한다. 책장 자체에는 자물쇠가 없으므로, *누구도 다른 누구를 막을 수 없다*. 모두가 동시에 진행하면서도 일관성이 유지된다.

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

**포인터 (low bit가 marked):**

- raw:    0x12345678 → 노드 + unmarked
- marked: 0x12345679 → 노드 + marked

**장점**: 진정한 lock-free. 한 스레드의 stall이 다른 스레드를 막지 않음.
**단점**: 매우 복잡. ABA 문제, 메모리 회수 어려움.

### Harris의 AtomicMarkableReference

Tim Harris의 원래 논문은 *Java*에서 비슷한 트릭을 `AtomicMarkableReference<T>`로 구현했다.

**AtomicMarkableReference<Node>:**

- 내부적으로 (Node ref, boolean marked) 쌍을 *atomic하게* 보관
- compareAndSet(expRef, newRef, expMark, newMark) — 둘 다 같이 CAS
- getReference() / isMarked() — 따로 읽기 가능

C++에서는 두 가지 구현:

| 방법 | 장점 | 단점 |
|---|---|---|
| Tagged pointer (low bit) | 추가 메모리 0, atomic 64-bit | 정렬 보장 필요 (4-byte 이상) |
| 별도 atomic flag | 단순, 정렬 불필요 | CAS 두 번 → atomic 동치 아님 |

책의 알고리즘은 *tagged pointer*가 정답. 별도 atomic으로 했다가 두 CAS 사이에 race가 일어나면 invariant 깨짐.

### Lock-Free의 정확성 — Linearization Points

| 작업 | Linearization Point |
|---|---|
| `add(k)` 성공 | `pred.CAS(curr, new_node)` 성공 시점 |
| `add(k)` 실패 (이미 존재) | find가 `curr.key == k`인 unmarked 노드를 본 시점 |
| `remove(k)` 성공 | `curr.next.CAS(succ, mark(succ))` 성공 시점 (logical delete) |
| `remove(k)` 실패 | find가 `curr.key != k`를 본 시점 |
| `contains(k)` 발견 | unmarked + key 일치 본 시점 |
| `contains(k)` 미발견 | curr.key > k 또는 marked 본 시점 |

logical delete의 mark CAS가 핵심. 그 시점 이후 *어떤 traversal이든* 이 노드를 *없는 것으로* 본다. physical unlink가 늦어져도 정확성 영향 없음.

## 9.7 단계별 성능 비교 (책 Figure 9.27)

벤치마크 — 16-core SMP에서 90% contains / 9% add / 1% remove 워크로드.

| 알고리즘 | 1 thread | 4 threads | 8 threads | 16 threads | scaling |
|---|---|---|---|---|---|
| Coarse | 100 | 95 | 70 | 40 | 음의 scaling |
| Fine-Grained | 80 | 220 | 350 | 500 | 거의 선형 |
| Optimistic | 110 | 350 | 600 | 950 | 우수 |
| Lazy | 110 | 380 | 720 | 1300 | 매우 우수 |
| Lock-Free | 105 | 400 | 780 | 1500 | 최고 |

(상대 throughput, 단위 = arbitrary ops/sec × 1000)

핵심 관찰:

**1. Coarse는 *코어 늘수록 더 느려진다* — 락 경합 + 캐시 트래픽**


**2. Fine은 좋지만 락 비용으로 stall**


**3. Optimistic / Lazy / Lock-Free는 contains가 락 없음 → 90% 워크로드에서 큰 이득**


**4. Lazy와 Lock-Free 차이는 작음 — Lazy가 *구현 단순성*에서 우세**

워크로드별 권고:

| 워크로드 | 최선의 선택 | 이유 |
|---|---|---|
| 거의 read-only | Lazy 또는 Lock-Free | contains가 wait-free |
| 50:50 mix | Lazy 또는 Optimistic | add/remove도 빠름 |
| Write-heavy | Lock-Free | 락 경합 회피 |
| 짧은 리스트 (< 8 노드) | Coarse | 오버헤드 < 단일 락 |
| 매우 큰 리스트 | Lock-Free | 캐시 효율 |

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

## 9.9 시스템 사례 — 실전 자료구조

이 챕터의 다섯 단계가 실제 어디서 살아 움직이는지 본다.

**Linux kernel — RCU (Read-Copy-Update)**

리눅스 커널이 *읽기 압도적인* 자료구조 — VFS dentry, routing table, namespace — 에 광범위하게 쓰는 기법. 핵심 아이디어는 *읽기는 락 없이*, *쓰기는 복사본을 만들어 atomic 교체*다. 9.5절의 lazy + 9.6절의 lock-free 아이디어를 *읽기 쪽으로 극단화*한 것.

**RCU 핵심 의미론:**

- rcu_read_lock()        — 가벼운 마킹 (preempt off)
- ptr = rcu_dereference(p) — 안전한 포인터 읽기 (memory barrier 포함)
- rcu_read_unlock()      — 마킹 해제

**쓰기:**

- new = kmalloc + copy
- rcu_assign_pointer(p, new)  — atomic 포인터 swap
- synchronize_rcu()           — 모든 reader가 끝날 때까지 기다림
- kfree(old)                  — 안전하게 해제

읽기 비용이 *거의 0*에 가깝다. 쓰기는 비싸지만, *읽기:쓰기 = 1000:1*인 자료구조에서 압도적인 throughput을 낸다. 책의 lazy 리스트가 "logical delete → physical delete 분리"였다면, RCU는 그 분리를 *grace period*로 일반화한 것이다.

**Java — ConcurrentSkipListSet / Map**

Java 표준 라이브러리의 `ConcurrentSkipListMap`은 *lock-free skip list*다. 9.6절의 Harris-Michael 알고리즘에서 출발해 Doug Lea가 다듬은 구조. 동시 검색은 락 없이, 삽입과 삭제는 marked node + CAS로 처리한다.

```java
// 사용 예 — 동시 정렬된 집합
import java.util.concurrent.ConcurrentSkipListSet;

ConcurrentSkipListSet<Integer> set = new ConcurrentSkipListSet<>();
// 여러 스레드가 동시에 호출 가능, 락 없음
set.add(42);
set.contains(42);
set.remove(42);
set.headSet(100);   // 범위 쿼리도 안전
```

JDK 소스에서 `markedNext`라는 표시 비트를 보면 책의 marked pointer 정확히 그대로다. 차이점은 *skip list*라 평균 O(log n) — 일반 linked list의 O(n)보다 훨씬 빠르다.

**MongoDB WiredTiger — Hazard Pointer**

MongoDB의 스토리지 엔진 WiredTiger는 B-tree 페이지 캐시를 *lock-free*로 관리한다. 읽기 스레드가 페이지에 접근할 때마다 *hazard pointer*를 등록한다. 페이지를 *제거*하려는 스레드는 모든 hazard pointer를 스캔해 *지금 누가 보고 있는지* 확인한다. 보고 있으면 제거를 *미룬다*.

**WiredTiger hazard pointer (개념):**


**reader:**

- hazard[my_slot] = page_ptr   — 등록
- ... 페이지 사용 ...
- hazard[my_slot] = NULL       — 해제

**evictor:**


**for each reader:**

- if (reader.hazard == page_ptr) skip
- if (no hazard) free page

이 패턴은 lock-free 자료구조의 *memory reclamation*을 푸는 표준 방법이다. RCU의 grace period가 *시간 기반*이라면, hazard pointer는 *명시적 등록 기반*이다.

| 시스템 | 기법 | 책의 어느 단계 |
|---|---|---|
| Linux kernel VFS / network | RCU | Lazy의 극단 + lock-free 읽기 |
| Java ConcurrentSkipListMap | Marked CAS skip list | Lock-Free (Harris-Michael 변형) |
| MongoDB WiredTiger | Hazard pointer page eviction | Lock-Free + 명시적 reclamation |
| Java ConcurrentHashMap | Bin-level lock + CAS | Fine-grained (segment) + optimistic |
| C++ folly::ConcurrentHashMap | RCU + hazard pointer | 두 기법의 하이브리드 |

책의 다섯 단계가 *모두* 실제 시스템에 존재한다. 자료구조마다 *어느 단계*가 최적인지가 다를 뿐이다. 읽기 비율, 쓰기 분포, 자료구조 크기, GC 유무 — 이 네 변수가 선택을 좌우한다.

## 정리

- 동시성 자료구조 진화 — **Coarse → Fine → Optimistic → Lazy → Lock-Free**
- **Hand-over-hand locking** — 인접 두 노드만 락
- **Optimistic** — 락 없이 찾고 락 잡고 검증
- **Lazy** — logical / physical 삭제 분리
- **Lock-Free** — CAS + tagged pointer
- **Lazy**가 실용성과 성능의 가장 좋은 절충

## 한국 개발자의 함정

**1. *Coarse-grained lock으로 충분*하다는 오해**

- 단일 스레드 성능, 멀티 코어에서 *확장성 0*
- Throughput 측정 필요

**2. *Fine-grained가 항상 빠름***

- Hand-over-hand는 *충돌 적을 때*
- 작은 리스트는 coarse가 더 빠를 수 있음

**3. *Lock-free가 항상 좋음***

- 구현 복잡 + ABA 위험
- GC 없는 언어는 메모리 회수 어려움 (hazard pointer)

**4. *Optimistic = 무조건 좋음***

- 검증 단계의 비용
- Conflict 빈도 따라 다름

## 실무 적용

**이론 → 실무:**

- Coarse              → std::mutex + std::list (단순한 경우)
- Fine (hand-over-hand) → 학술적, 잘 안 씀
- Optimistic           → Java ConcurrentHashMap (size 같은 작업)
- Lazy                 → Java ConcurrentSkipListMap
- Lock-Free            → folly::ConcurrentSkipList (C++)

**C++20 선택 기준:**

- 짧은 critical section + 낮은 충돌 → optimistic / lazy
- 긴 critical section → coarse 또는 fine + condition var
- 높은 충돌 → coarse 또는 lock-free with backoff

**라이브러리 권장:**

- C++: folly::ConcurrentHashMap, tbb::concurrent_hash_map
- C: 직접 구현보다 검증된 라이브러리 사용

## 자기 점검

- [ ] Hand-over-hand locking이 데드락 회피하는 메커니즘?
- [ ] Optimistic의 validation 단계?
- [ ] Lazy의 logical / physical 삭제 분리?
- [ ] Lock-free linked list의 어려움 (CAS만으로 부족)?
- [ ] Hazard pointer가 필요한 이유?

## 다음 장 예고

다음 장은 **Concurrent Queue와 ABA 문제** — lock-free queue 디자인.

## 관련 항목

- [Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [Ch 6: Universal Construction](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [C++ Concurrency in Action Ch 6: Lock-based 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
