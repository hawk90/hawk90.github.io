---
title: "Chapter 14: Skiplist와 균형 검색"
date: 2026-05-06T14:00:00
description: "Skiplist의 동시성 친화성. Lock-Free Skiplist. 균형 트리(BST)가 동시성에 부적합한 이유."
series: "The Art of Multiprocessor Programming"
seriesOrder: 14
tags: [parallel, concurrency, book-review, amp, skiplist, lock-free, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 14 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 비유로 먼저 — 고속도로 휴게소·동전 던지기·마킹 후 청소

이 챕터를 한 줄로 요약하면 — *균형 트리의 회전은 동시성을 죽인다, 그래서 회전 없는 정렬을 쓴다*. 그 "회전 없는 정렬"이 skiplist다.

**Skiplist — 고속도로 휴게소 비유.** 1번 국도(level 0)에는 *모든 휴게소*가 있다. 2번 도로(level 1)에는 절반만, 3번 도로(level 2)에는 그 절반의 절반만. 4번, 5번으로 갈수록 큰 도시 휴게소만 남는다.

서울에서 부산까지 갈 때 처음에는 5번 도로의 *주요 휴게소*만 보고 빠르게 남쪽으로. 가까워지면 4번, 3번으로 내려가 더 세밀하게. 마지막 1번에서 정확한 도착점을 찾는다. 이게 O(log N) 검색.

**동전 던지기로 높이 결정.** 새 휴게소가 들어올 때 *자기가 몇 번 도로까지 등장할지* 동전을 던져 정한다. 앞면이 나오는 만큼 위 도로에도 등장. 평균적으로 자연스럽게 *기하 분포* — 휴게소의 절반은 1번 도로만, 1/4은 2번까지, 1/8은 3번까지. 회전이나 균형 작업이 필요 없다.

**Lazy skiplist — 마킹 후 청소.** 휴게소를 폐쇄할 때 *간판부터 떼지 말고* "폐쇄됨" 스티커를 먼저 붙인다. 그러면 지나가는 차들은 그 휴게소를 *건너뛴다*. 실제로 부지를 정리하는 건 나중 청소차가 한다. 이게 logical delete + physical delete의 분리.

이 그림을 머리에 넣고 본문을 보면 lock-free 코드의 mark bit, fullyLinked, marked 같은 디테일이 갑자기 자연스럽다.

## 14.1 정렬된 검색의 동시성

이전 챕터들은 stack / queue / hash 같은 **순서 없는** 자료구조였다. 정렬된 자료구조는 더 어렵다.

```
연산:
- contains(x): x가 있는가?
- add(x): x를 정렬 위치에 삽입
- remove(x): x 제거
- successor(x): x보다 큰 가장 작은 값
- predecessor(x): x보다 작은 가장 큰 값
```

균형 이진 트리 (Red-Black, AVL)가 순차에서는 표준. 그러나 **동시에서는 부적합**.

## 14.2 균형 트리의 동시성 문제

### 비유 — 도서관 책장 재정렬

균형 이진 트리에서 한 원소를 추가하면 *균형이 깨져* 회전이 일어난다. 회전은 *부모-자식 관계 여러 쌍*을 동시에 갱신한다.

도서관 비유로 옮기면 — 책 한 권 추가하려고 *책장 두세 칸을 통째로 재배치*하는 일. 그동안 다른 사서가 "1층 한국문학 코너에서 책 한 권"을 가지러 갔는데 *코너 자체가 옮겨지는 중*이라면, 어디서 무엇을 찾아야 할지 모른다.

회전을 동시에 안전하게 만들려면 *영향받는 노드 전부에 락*을 잡아야 하는데, 회전이 어디까지 번질지 사전에 모른다. 미리 다 잡으면 *전역 잠금*이 되어 동시성이 사라진다.

이게 RB-tree, AVL-tree가 동시성에서 거의 안 쓰이는 본질적 이유다.

```
        50
       /  \
      30   70
     /  \   \
    20  40  80
```

삽입/삭제 시 **rebalancing**이 트리의 큰 부분을 만진다. 회전(rotation)은 여러 노드의 포인터를 동시에 갱신해야 한다.

```
80 추가 후 rebalance:
회전 ── 여러 부모 자식 관계 동시 갱신
```

- 락을 잡기 어렵다 (어디까지 잡을지 모름)
- Lock-free 구현이 매우 복잡 (다중 포인터 atomic 갱신)
- 회전 중 동시 작업이 깨질 위험

이게 **균형 트리가 동시성에서 거의 쓰이지 않는** 이유.

## 14.3 Skiplist — 정렬과 동시성의 친구

### 다시 — 고속도로 휴게소

앞의 휴게소 그림을 좀 더 정확히 본다.

```text
level 4:  서울 ━━━━━━━━━━━━━━━━━━━━ 대전 ━━━━━━━━━━━━━━━━━━━━ 부산
level 3:  서울 ━━━━━━ 천안 ━━━━━━━ 대전 ━━━━ 대구 ━━━━━━━━ 부산
level 2:  서울 ━ 평택 ━ 천안 ━━ 청주 ━ 대전 ━ 김천 ━ 대구 ━ 양산 ━ 부산
level 1:  서울 ━ ... (더 촘촘) ...                              ━ 부산
level 0:  *모든 휴게소*  (가장 촘촘, 모두 등장)
```

서울에서 부산을 찾을 때 level 4부터 본다. "대전이 부산보다 앞이군" → 대전으로. 거기서 level 3으로 내려와 "대구가 부산보다 앞" → 대구. level 2에서 "양산이 부산보다 앞" → 양산. level 0에서 부산. 평균 O(log N) hop.

각 휴게소는 *자기가 몇 번 도로까지 보일지*를 입주할 때 동전 던지기로 정한다. 큰 도시는 우연히 동전이 여러 번 앞면이 나와 high level이 되고, 작은 휴게소는 level 0만. 통계적으로 자연스러운 분포가 나온다.

W. Pugh가 1989년 발명한 자료구조. 균형 트리의 대안.

![Skiplist 구조](/images/blog/parallel/diagrams/skiplist-structure.svg)

**Skiplist의 핵심**:

- 각 노드가 **랜덤 높이** (1, 2, 3, ...)를 가짐
- 높이 h의 노드는 0~h-1 레벨의 리스트에 모두 등장
- 평균 O(log N) 검색
- 균형 트리와 같은 성능, 그러나 회전 없음

### Sequential Skiplist 베이스라인 + 레벨 분포

Pugh의 원본 분석. 노드 높이는 기하 분포 `Pr[height ≥ k] = p^(k−1)`. 보통 `p = 1/2` 또는 `p = 1/4`.

```text
P = 1/2일 때 기댓값:
  레벨 0의 노드 수: N
  레벨 1: N/2
  레벨 2: N/4
  ...
  레벨 k: N/2^k

  총 노드 포인터 수: N (1 + 1/2 + 1/4 + ...) ≤ 2N
  → 노드당 평균 2개 next 포인터
```

검색의 기대 비용. 레벨 `L = ⌈log₂ N⌉`부터 시작해 아래로 내려가면서 각 레벨마다 평균 `1/p` 번의 비교. 따라서 `O((log N) / p) = O(log N)`.

```cpp
// Sequential Skiplist 검색 — 락 없는 baseline
Node* find(int key, Node** preds, Node** succs) {
    Node* pred = head;
    for (int lv = MAX_LEVEL - 1; lv >= 0; --lv) {
        Node* curr = pred->next[lv];
        while (curr != tail && curr->key < key) {
            pred = curr;
            curr = curr->next[lv];
        }
        preds[lv] = pred;
        succs[lv] = curr;
    }
    return (succs[0] != tail && succs[0]->key == key) ? succs[0] : nullptr;
}
```

이 baseline은 모든 동시 변형의 골격이다. `LazySkipList`도 `LockFreeSkipList`도 첫 번째 단계는 *각 레벨에서 predecessor/successor 쌍을 모으는 동일한 traversal*. 차이는 그 뒤의 검증과 변경 방식.

### C++20/23 Skiplist 노드

```cpp
#include <atomic>
#include <memory>
#include <limits>
#include <random>
#include <vector>

template<typename K, typename V>
class SkipList {
private:
    static constexpr int MAX_LEVEL = 32;
    static constexpr double P = 0.5;  // 레벨 증가 확률

    struct Node {
        K key;
        V value;
        int height;
        std::vector<std::atomic<Node*>> next;

        Node(K k, V v, int h)
            : key(std::move(k)), value(std::move(v)), height(h), next(h) {
            for (int i = 0; i < h; ++i) {
                next[i].store(nullptr, std::memory_order_relaxed);
            }
        }

        // Sentinel 노드용
        Node(int h) : height(h), next(h) {
            for (int i = 0; i < h; ++i) {
                next[i].store(nullptr, std::memory_order_relaxed);
            }
        }
    };

    Node* head;
    std::atomic<int> currentLevel{1};

    int randomLevel() {
        thread_local std::mt19937 gen(std::random_device{}());
        thread_local std::uniform_real_distribution<double> dist(0.0, 1.0);

        int level = 1;
        while (dist(gen) < P && level < MAX_LEVEL) {
            level++;
        }
        return level;
    }

public:
    SkipList() {
        head = new Node(MAX_LEVEL);
    }

    // 검색
    bool contains(const K& key) const {
        Node* pred = head;

        for (int level = MAX_LEVEL - 1; level >= 0; --level) {
            Node* curr = pred->next[level].load(std::memory_order_acquire);

            while (curr != nullptr && curr->key < key) {
                pred = curr;
                curr = curr->next[level].load(std::memory_order_acquire);
            }
        }

        Node* curr = pred->next[0].load(std::memory_order_acquire);
        return curr != nullptr && curr->key == key;
    }
};
```

### C11 Skiplist 노드

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>
#include <time.h>

#define MAX_LEVEL 32
#define P 0.5

typedef struct SkipNode {
    int key;
    int value;
    int height;
    _Atomic(struct SkipNode*)* next;  // 레벨별 next 포인터 배열
} SkipNode;

typedef struct {
    SkipNode* head;
    _Atomic int current_level;
} SkipList;

static SkipNode* create_node(int key, int value, int height) {
    SkipNode* node = malloc(sizeof(SkipNode));
    node->key = key;
    node->value = value;
    node->height = height;
    node->next = malloc(sizeof(_Atomic(SkipNode*)) * height);

    for (int i = 0; i < height; i++) {
        atomic_store(&node->next[i], NULL);
    }

    return node;
}

static int random_level(void) {
    int level = 1;
    while ((double)rand() / RAND_MAX < P && level < MAX_LEVEL) {
        level++;
    }
    return level;
}

void skiplist_init(SkipList* sl) {
    sl->head = create_node(0, 0, MAX_LEVEL);  // Sentinel
    atomic_store(&sl->current_level, 1);
    srand(time(NULL));
}

bool skiplist_contains(const SkipList* sl, int key) {
    SkipNode* pred = sl->head;

    for (int level = MAX_LEVEL - 1; level >= 0; --level) {
        SkipNode* curr = atomic_load_explicit(&pred->next[level],
                                               memory_order_acquire);

        while (curr != NULL && curr->key < key) {
            pred = curr;
            curr = atomic_load_explicit(&curr->next[level],
                                         memory_order_acquire);
        }
    }

    SkipNode* curr = atomic_load_explicit(&pred->next[0], memory_order_acquire);
    return curr != NULL && curr->key == key;
}
```

위 레벨에서 빠르게 건너뛰고, 아래 레벨로 갈수록 정밀하게.

## 14.4 왜 Skiplist가 동시성에 좋은가

균형 트리와 달리.

- **국소적 수정** — 한 키 삽입/삭제는 그 키 주변의 몇 노드만 만짐
- **회전 없음** — 다중 포인터 atomic 갱신 불필요
- **각 레벨이 독립** — 위 레벨이 깨져도 아래 레벨에서 정확성 회복 가능

Lock-free 구현이 균형 트리보다 훨씬 단순. 그래서 모든 모던 동시성 라이브러리에 skiplist 기반 정렬 컨테이너가 있다.

- `java.util.concurrent.ConcurrentSkipListMap`
- `tbb::concurrent_unordered_set`
- ...

## 14.5 Lock-Free Skiplist

기본 구조는 9장의 lock-free linked list를 각 레벨마다 적용한 것.

### C++20/23 Lock-Free Skiplist (간략화)

```cpp
#include <atomic>
#include <optional>

template<typename K, typename V>
class LockFreeSkipList {
private:
    static constexpr int MAX_LEVEL = 32;

    struct Node {
        K key;
        V value;
        int topLevel;

        // 각 레벨의 next 포인터 + marked bit
        std::vector<std::atomic<uintptr_t>> next;

        Node(K k, V v, int height)
            : key(std::move(k)), value(std::move(v)), topLevel(height), next(height) {
            for (int i = 0; i < height; ++i) {
                next[i].store(0, std::memory_order_relaxed);
            }
        }

        // marked bit 헬퍼
        static bool isMarked(uintptr_t ptr) {
            return (ptr & 1) != 0;
        }

        static Node* getRef(uintptr_t ptr) {
            return reinterpret_cast<Node*>(ptr & ~1UL);
        }

        static uintptr_t mark(Node* node) {
            return reinterpret_cast<uintptr_t>(node) | 1;
        }

        static uintptr_t unmark(Node* node) {
            return reinterpret_cast<uintptr_t>(node) & ~1UL;
        }
    };

    Node* head;
    Node* tail;

    int randomLevel() {
        thread_local std::mt19937 gen(std::random_device{}());
        thread_local std::uniform_real_distribution<> dis(0, 1);
        int level = 1;
        while (dis(gen) < 0.5 && level < MAX_LEVEL) level++;
        return level;
    }

    // find: 각 레벨에서 key보다 작은 마지막 노드와 그 다음 노드 찾기
    bool find(const K& key, Node** preds, Node** succs) {
        bool marked;
        Node* pred;
        Node* curr;
        Node* succ;

    retry:
        pred = head;
        for (int level = MAX_LEVEL - 1; level >= 0; --level) {
            curr = Node::getRef(pred->next[level].load(std::memory_order_acquire));

            while (true) {
                if (curr == tail) break;

                uintptr_t next = curr->next[level].load(std::memory_order_acquire);
                marked = Node::isMarked(next);
                succ = Node::getRef(next);

                // marked 노드는 물리적으로 제거
                while (marked) {
                    uintptr_t expected = reinterpret_cast<uintptr_t>(curr);
                    if (!pred->next[level].compare_exchange_weak(
                        expected,
                        reinterpret_cast<uintptr_t>(succ),
                        std::memory_order_release,
                        std::memory_order_relaxed)) {
                        goto retry;
                    }
                    curr = succ;
                    if (curr == tail) break;
                    next = curr->next[level].load(std::memory_order_acquire);
                    marked = Node::isMarked(next);
                    succ = Node::getRef(next);
                }

                if (curr == tail || curr->key >= key) break;

                pred = curr;
                curr = succ;
            }

            preds[level] = pred;
            succs[level] = curr;
        }

        return curr != tail && curr->key == key;
    }

public:
    LockFreeSkipList() {
        head = new Node(K{}, V{}, MAX_LEVEL);
        tail = new Node(K{}, V{}, MAX_LEVEL);

        for (int i = 0; i < MAX_LEVEL; ++i) {
            head->next[i].store(reinterpret_cast<uintptr_t>(tail),
                                std::memory_order_relaxed);
        }
    }

    bool add(const K& key, const V& value) {
        int topLevel = randomLevel();
        Node* preds[MAX_LEVEL];
        Node* succs[MAX_LEVEL];

        while (true) {
            if (find(key, preds, succs)) {
                return false;  // 이미 존재
            }

            Node* newNode = new Node(key, value, topLevel);

            // 레벨 0부터 연결
            for (int level = 0; level < topLevel; ++level) {
                newNode->next[level].store(reinterpret_cast<uintptr_t>(succs[level]),
                                           std::memory_order_relaxed);
            }

            // 레벨 0에서 CAS로 삽입
            uintptr_t expected = reinterpret_cast<uintptr_t>(succs[0]);
            if (!preds[0]->next[0].compare_exchange_strong(
                expected,
                reinterpret_cast<uintptr_t>(newNode),
                std::memory_order_release,
                std::memory_order_relaxed)) {
                delete newNode;
                continue;  // 재시도
            }

            // 나머지 레벨 연결
            for (int level = 1; level < topLevel; ++level) {
                while (true) {
                    expected = reinterpret_cast<uintptr_t>(succs[level]);
                    if (preds[level]->next[level].compare_exchange_strong(
                        expected,
                        reinterpret_cast<uintptr_t>(newNode),
                        std::memory_order_release,
                        std::memory_order_relaxed)) {
                        break;
                    }
                    find(key, preds, succs);  // 위치 재탐색
                }
            }

            return true;
        }
    }

    bool contains(const K& key) {
        Node* preds[MAX_LEVEL];
        Node* succs[MAX_LEVEL];
        return find(key, preds, succs);
    }
};
```

### C11 Lock-Free Skiplist (간략화)

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>

#define MAX_LEVEL 32

typedef struct LFNode {
    int key;
    int value;
    int top_level;
    _Atomic(uintptr_t)* next;  // marked bit 포함
} LFNode;

typedef struct {
    LFNode* head;
    LFNode* tail;
} LockFreeSkipList;

// Marked bit 헬퍼
static inline bool is_marked(uintptr_t ptr) {
    return (ptr & 1) != 0;
}

static inline LFNode* get_ref(uintptr_t ptr) {
    return (LFNode*)(ptr & ~1UL);
}

static inline uintptr_t mark_ptr(LFNode* node) {
    return (uintptr_t)node | 1;
}

static LFNode* create_lf_node(int key, int value, int height) {
    LFNode* node = malloc(sizeof(LFNode));
    node->key = key;
    node->value = value;
    node->top_level = height;
    node->next = malloc(sizeof(_Atomic(uintptr_t)) * height);

    for (int i = 0; i < height; i++) {
        atomic_store(&node->next[i], 0);
    }

    return node;
}

void lf_skiplist_init(LockFreeSkipList* sl) {
    sl->head = create_lf_node(INT_MIN, 0, MAX_LEVEL);
    sl->tail = create_lf_node(INT_MAX, 0, MAX_LEVEL);

    for (int i = 0; i < MAX_LEVEL; i++) {
        atomic_store(&sl->head->next[i], (uintptr_t)sl->tail);
    }
}

// find: 각 레벨에서 predecessor와 successor 찾기
static bool lf_find(LockFreeSkipList* sl, int key,
                    LFNode** preds, LFNode** succs) {
    LFNode* pred;
    LFNode* curr;
    LFNode* succ;
    bool marked;

retry:
    pred = sl->head;

    for (int level = MAX_LEVEL - 1; level >= 0; --level) {
        curr = get_ref(atomic_load_explicit(&pred->next[level],
                                            memory_order_acquire));

        while (true) {
            if (curr == sl->tail) break;

            uintptr_t next = atomic_load_explicit(&curr->next[level],
                                                   memory_order_acquire);
            marked = is_marked(next);
            succ = get_ref(next);

            // marked 노드 물리적 제거
            while (marked) {
                uintptr_t expected = (uintptr_t)curr;
                if (!atomic_compare_exchange_weak_explicit(
                    &pred->next[level],
                    &expected,
                    (uintptr_t)succ,
                    memory_order_release,
                    memory_order_relaxed)) {
                    goto retry;
                }
                curr = succ;
                if (curr == sl->tail) break;
                next = atomic_load_explicit(&curr->next[level],
                                            memory_order_acquire);
                marked = is_marked(next);
                succ = get_ref(next);
            }

            if (curr == sl->tail || curr->key >= key) break;

            pred = curr;
            curr = succ;
        }

        preds[level] = pred;
        succs[level] = curr;
    }

    return curr != sl->tail && curr->key == key;
}

bool lf_skiplist_contains(LockFreeSkipList* sl, int key) {
    LFNode* preds[MAX_LEVEL];
    LFNode* succs[MAX_LEVEL];
    return lf_find(sl, key, preds, succs);
}

bool lf_skiplist_add(LockFreeSkipList* sl, int key, int value) {
    int top_level = 1;
    while ((double)rand() / RAND_MAX < 0.5 && top_level < MAX_LEVEL) {
        top_level++;
    }

    LFNode* preds[MAX_LEVEL];
    LFNode* succs[MAX_LEVEL];

    while (true) {
        if (lf_find(sl, key, preds, succs)) {
            return false;  // 이미 존재
        }

        LFNode* new_node = create_lf_node(key, value, top_level);

        // 레벨 0부터 연결
        for (int level = 0; level < top_level; level++) {
            atomic_store(&new_node->next[level], (uintptr_t)succs[level]);
        }

        // 레벨 0에서 CAS로 삽입
        uintptr_t expected = (uintptr_t)succs[0];
        if (!atomic_compare_exchange_strong_explicit(
            &preds[0]->next[0],
            &expected,
            (uintptr_t)new_node,
            memory_order_release,
            memory_order_relaxed)) {
            free(new_node->next);
            free(new_node);
            continue;
        }

        // 나머지 레벨 연결 (간략화)
        for (int level = 1; level < top_level; level++) {
            while (true) {
                expected = (uintptr_t)succs[level];
                if (atomic_compare_exchange_strong_explicit(
                    &preds[level]->next[level],
                    &expected,
                    (uintptr_t)new_node,
                    memory_order_release,
                    memory_order_relaxed)) {
                    break;
                }
                lf_find(sl, key, preds, succs);
            }
        }

        return true;
    }
}
```

세부 구현은 매우 복잡 — Pugh가 1989년에 단순화한 lock-based 버전을 제시하고, Fraser/Harris 등이 2000년대에 lock-free 버전을 완성.

### Find 헬퍼 — 마킹된 노드의 물리적 제거

`LockFreeSkipListSet`의 `find()`는 단순히 위치를 찾는 게 아니다. *지나가면서 marked 노드를 물리적으로 떼어낸다* (Listing 14.18의 핵심).

```cpp
// LockFreeSkipListSet::find — 책 Listing 14.18의 핵심 로직
bool find(int key, Node** preds, Node** succs) {
retry:
    Node* pred = head;
    for (int lv = MAX_LEVEL - 1; lv >= 0; --lv) {
        Node* curr = unmark(pred->next[lv].load());
        while (true) {
            auto [succ, marked] = unpack(curr->next[lv].load());
            // 마킹된 curr는 *그 자리에서 잘라낸다*
            while (marked) {
                Node* expected = curr;
                if (!pred->next[lv].compare_exchange_strong(expected, succ))
                    goto retry;  // 다른 스레드가 변경 → 재시도
                curr = succ;
                std::tie(succ, marked) = unpack(curr->next[lv].load());
            }
            if (curr->key >= key) break;
            pred = curr;
            curr = succ;
        }
        preds[lv] = pred;
        succs[lv] = curr;
    }
    return succs[0]->key == key;
}
```

이게 Harris-Michael 패턴의 skiplist 확장. **삭제는 두 단계**.

1. **Logical 삭제** — 노드의 모든 레벨에서 next 포인터의 mark bit 설정 (위 레벨부터 아래로).
2. **Physical 삭제** — find()가 지나가면서 잘라낸다.

logical 삭제가 끝나는 순간 그 노드는 set에서 *사라진 것으로 간주*. 물리적 unlink는 lazy.

## 14.6 Lazy Skiplist

### 비유 — 마킹 후 청소

휴게소 그림을 한 번 더. 도로공사가 한 휴게소를 닫는다고 하자. 두 가지 방식.

**즉시 철거 방식.** 간판 떼고, 진입로 막고, 부지 정리까지 한 번에. 그동안 *지나가던 운전자*는 "분명 여기 휴게소가 있다고 표시되어 있었는데 사라졌다"며 혼란.

**마킹 후 청소 방식.** 간판은 그대로 두고 "폐쇄" 스티커만 붙인다. 운전자는 스티커 보고 그냥 지나간다. 부지 정리는 *다음 청소차가 지나갈 때* 한다.

후자가 lazy skiplist다. 본문의 두 atomic flag.

- **`fullyLinked`** — 입주 공사가 끝났는가. 끝났을 때만 검색 결과로 인정.
- **`marked`** — 폐쇄 스티커가 붙었는가. 붙었으면 결과에서 제외.

`contains(x)`가 *락을 전혀 잡지 않는다*는 게 lazy의 매력. 그저 두 스티커를 확인할 뿐. 검색은 wait-free.

`add`와 `remove`는 락을 잡지만 *국소적*이다. 입주할 휴게소의 이웃 몇 개만 잡으면 된다. 트리의 회전처럼 *전역적인 재구성*은 없다.

복잡한 lock-free 대신 lazy 패턴 (9장과 같은 방식) 적용한 skiplist.

### LazySkipListSet (Listing 14.7) — fullyLinked + marked

책 Listing 14.7의 핵심 두 플래그.

- **`fullyLinked`** — 노드가 *모든 레벨에 연결*되었는가. 삽입의 lineariztion point.
- **`marked`** — 노드가 logically 삭제되었는가. 삭제의 linearization point.

`contains(x)`는 락을 전혀 잡지 않는다. 단지.

```cpp
// LazySkipListSet::contains — 책 Listing 14.7
bool contains(int key) {
    Node *preds[MAX_LEVEL], *succs[MAX_LEVEL];
    int lFound = find(key, preds, succs);
    return lFound != -1
        && succs[lFound]->fullyLinked.load()
        && !succs[lFound]->marked.load();
}
```

**완전한 wait-free 검색**. 락 없이 두 atomic flag만 확인.

`add(x)`는.

1. `find()`로 위치와 found 레벨 확인. found이고 marked 아님 → fullyLinked 기다린 후 false 반환.
2. found 아님 → topLevel까지의 *모든 predecessor*에 락 획득.
3. **검증** — 잡은 락이 여전히 유효한가 (각 pred가 marked 아니고 그 next가 여전히 succ).
4. 유효하면 새 노드 삽입 (아래 레벨부터 위로) → `fullyLinked = true`.

검증 단계가 lazy의 본질. 락이 잡힌 뒤에도 *상태가 변하지 않았음*을 확인. 아니면 풀고 처음부터.

### C++20/23 Lazy Skiplist

```cpp
#include <atomic>
#include <mutex>
#include <vector>
#include <optional>

template<typename K, typename V>
class LazySkipList {
private:
    static constexpr int MAX_LEVEL = 32;

    struct Node {
        K key;
        V value;
        int topLevel;
        std::atomic<bool> marked{false};   // logical 삭제
        std::atomic<bool> fullyLinked{false};
        std::mutex lock;
        std::vector<std::atomic<Node*>> next;

        Node(K k, V v, int height)
            : key(std::move(k)), value(std::move(v)), topLevel(height), next(height) {
            for (int i = 0; i < height; ++i) {
                next[i].store(nullptr, std::memory_order_relaxed);
            }
        }
    };

    Node* head;
    Node* tail;

    int randomLevel() {
        thread_local std::mt19937 gen(std::random_device{}());
        thread_local std::uniform_real_distribution<> dis(0, 1);
        int level = 1;
        while (dis(gen) < 0.5 && level < MAX_LEVEL) level++;
        return level;
    }

    // 락 없이 찾기
    int find(const K& key, Node** preds, Node** succs) {
        int found = -1;
        Node* pred = head;

        for (int level = MAX_LEVEL - 1; level >= 0; --level) {
            Node* curr = pred->next[level].load(std::memory_order_acquire);

            while (curr != tail && curr->key < key) {
                pred = curr;
                curr = curr->next[level].load(std::memory_order_acquire);
            }

            if (found == -1 && curr != tail && curr->key == key) {
                found = level;
            }

            preds[level] = pred;
            succs[level] = curr;
        }

        return found;
    }

public:
    LazySkipList() {
        head = new Node(K{}, V{}, MAX_LEVEL);
        tail = new Node(K{}, V{}, MAX_LEVEL);

        for (int i = 0; i < MAX_LEVEL; ++i) {
            head->next[i].store(tail, std::memory_order_relaxed);
        }
    }

    bool add(const K& key, const V& value) {
        int topLevel = randomLevel();
        Node* preds[MAX_LEVEL];
        Node* succs[MAX_LEVEL];

        while (true) {
            int found = find(key, preds, succs);

            if (found != -1) {
                Node* nodeFound = succs[found];
                if (!nodeFound->marked.load(std::memory_order_acquire)) {
                    // fullyLinked 될 때까지 대기
                    while (!nodeFound->fullyLinked.load(std::memory_order_acquire)) {
                        std::this_thread::yield();
                    }
                    return false;  // 이미 존재
                }
                continue;  // marked — 재시도
            }

            // 락 획득
            std::vector<std::unique_lock<std::mutex>> locks;
            Node* pred;
            Node* succ;
            bool valid = true;

            for (int level = 0; valid && level < topLevel; ++level) {
                pred = preds[level];
                succ = succs[level];
                locks.emplace_back(pred->lock);

                // 검증: pred가 삭제 안 됐고 succ가 여전히 다음인지
                valid = !pred->marked.load(std::memory_order_acquire) &&
                        pred->next[level].load(std::memory_order_acquire) == succ;
            }

            if (!valid) continue;

            // 새 노드 생성 및 연결
            Node* newNode = new Node(key, value, topLevel);
            for (int level = 0; level < topLevel; ++level) {
                newNode->next[level].store(succs[level], std::memory_order_relaxed);
                preds[level]->next[level].store(newNode, std::memory_order_release);
            }

            newNode->fullyLinked.store(true, std::memory_order_release);
            return true;
        }
    }

    bool contains(const K& key) {
        Node* preds[MAX_LEVEL];
        Node* succs[MAX_LEVEL];
        int found = find(key, preds, succs);

        return found != -1 &&
               succs[found]->fullyLinked.load(std::memory_order_acquire) &&
               !succs[found]->marked.load(std::memory_order_acquire);
    }

    bool remove(const K& key) {
        Node* preds[MAX_LEVEL];
        Node* succs[MAX_LEVEL];
        Node* victim = nullptr;
        bool isMarked = false;
        int topLevel = -1;

        while (true) {
            int found = find(key, preds, succs);

            if (!isMarked) {
                if (found == -1) return false;

                victim = succs[found];
                topLevel = victim->topLevel;

                if (!victim->fullyLinked.load(std::memory_order_acquire) ||
                    victim->marked.load(std::memory_order_acquire)) {
                    return false;
                }

                // victim 락 획득 및 논리적 삭제
                victim->lock.lock();
                if (victim->marked.load(std::memory_order_acquire)) {
                    victim->lock.unlock();
                    return false;
                }
                victim->marked.store(true, std::memory_order_release);
                isMarked = true;
            }

            // 물리적 삭제를 위해 predecessor 락 획득
            std::vector<std::unique_lock<std::mutex>> locks;
            bool valid = true;

            for (int level = 0; valid && level < topLevel; ++level) {
                Node* pred = preds[level];
                locks.emplace_back(pred->lock);
                valid = !pred->marked.load(std::memory_order_acquire) &&
                        pred->next[level].load(std::memory_order_acquire) == victim;
            }

            if (!valid) continue;

            // 물리적으로 제거
            for (int level = topLevel - 1; level >= 0; --level) {
                preds[level]->next[level].store(
                    victim->next[level].load(std::memory_order_acquire),
                    std::memory_order_release);
            }

            victim->lock.unlock();
            return true;
        }
    }
};
```

Lock-free보다 단순하면서 비슷한 성능. 실용적으로 자주 쓰이는 형태.

### 성능 비교 — 균형 트리 vs Skiplist

Herlihy-Shavit이 14장 말미에서 보고하는 측정. 평균적으로.

| 척도 | 균형 BST (Red-Black) | Lock-Free Skiplist |
|------|---------------------|--------------------|
| 검색 평균 | log₂ N (정확) | log₂ N (확률적) |
| 삽입 평균 | O(log N) + 1~2 rotation | O(log N) + CAS 수회 |
| 동시 변경 친화성 | 매우 낮음 (회전이 큰 부분 만짐) | 매우 높음 (국소적) |
| Cache 친화성 | 높음 (자식이 인접 가능) | 낮음 (노드 크기 가변) |
| Lock-free 구현 난이도 | 극도로 어려움 | 어렵지만 가능 |
| Worst case | 보장 (log N) | 확률적 (매우 드문 worst) |

이게 **lock-free에서 skiplist가 사실상 표준**이 된 이유. 정확성과 구현 가능성의 균형.

다만 *순차 환경에서는* 균형 트리가 cache 친화성으로 여전히 우세. `std::map`이 RB-tree인 이유다.

## 14.7 다른 정렬 자료구조

skiplist 외에 동시성 정렬 자료구조.

**B-Tree**

- 디스크 기반 정렬에 표준
- 동시 B-Tree: B-link tree (1981), OLFIT
- 위에서 아래로 잠그며 내려가는 latching

**Hopscotch Hashing**

- 정렬은 아니지만 cache-friendly
- 가까운 bucket으로 swap하며 충돌 해결

**LSM Tree**

- Log-Structured Merge Tree
- LevelDB, RocksDB, Cassandra
- 쓰기 최적, 동시성 친화적

각각 다른 사용 사례. 메모리 정렬은 skiplist, 디스크 정렬은 B-tree, 쓰기 집약은 LSM tree.

## 14.8 균형 트리는 죽었나

순차에서는 여전히 균형 트리가 표준 (`std::map`, `TreeMap`). 동시에서는 거의 안 쓰임.

이유 — 위에서 설명한 회전의 동시성 문제. 그리고 skiplist가 같은 성능을 동시 친화적으로 제공.

다만 균형 트리의 lock-free 변형 연구는 계속된다. 예: BST with relaxed balance, k-tree 등.

## 14.9 Skiplist의 단점

완벽한 자료구조는 없다. Skiplist의 단점.

**1. 메모리 오버헤드**

각 노드가 평균 2개의 다음 포인터. 8 byte x 2 = 16 byte 오버헤드 per node. 균형 트리(8 byte x 2 = 16 byte)와 비슷하지만, 노드 수가 같으면 노드 자체가 다양한 높이라 캐시 친화성이 더 나쁠 수 있음.

**2. 랜덤성**

높이가 랜덤이라 worst case가 이론상 가능 (매우 드물지만). 균형 트리는 worst case가 보장.

**3. 캐시**

균형 트리는 노드의 자식이 메모리에 묶이도록 배치 가능. Skiplist는 어렵다.

따라서 **메모리 정렬, 동시성 필요** -> Skiplist. **순차, worst case 보장 필요** -> 균형 트리.

## 시스템 사례 — 어디서 skiplist가 살아 있나

### Java `ConcurrentSkipListMap` / `ConcurrentSkipListSet`

`java.util.concurrent`의 정렬된 동시 컨테이너 표준. Doug Lea가 책의 lock-free skiplist를 거의 그대로 구현했다. CAS 기반 mark bit, lazy physical delete까지 동일.

이 컨테이너의 *범위 쿼리*(`subMap`, `headMap`, `tailMap`)가 강력하다. 정렬된 키에 대한 동시 범위 스캔은 `ConcurrentHashMap`이 못 한다. 그래서 timestamp·priority 같은 정렬 키 워크로드의 사실상 디폴트.

### Redis sorted set (`zset`)

Redis의 `ZADD`, `ZRANGE`, `ZRANGEBYSCORE`가 다루는 sorted set이 *skiplist + hash table* 듀얼 구조. 정렬 순회는 skiplist, O(1) lookup은 hash. 두 자료구조가 같은 노드를 가리킨다.

Redis는 single-thread라 동시성 이슈는 없지만, *왜 skiplist를 골랐는가*는 14장의 메시지와 같다 — 회전 없는 정렬, 구현 단순함. Salvatore Sanfilippo가 "skiplist는 디버깅이 쉽다"라고 직접 적었다.

cluster 모드에서는 여러 노드가 키 공간을 나눠 가지므로 노드 안에서는 single-thread, 노드 간에는 키 공간 분리로 동시성을 얻는다. 13장의 sharding 모델이다.

### LevelDB / RocksDB memtable

LSM-tree의 *memtable* — 쓰기가 메모리에 누적되는 정렬된 자료구조. LevelDB와 RocksDB 모두 *concurrent skiplist*다.

특이한 점은 *read는 lock-free, write는 single-writer*. LSM은 write가 한 곳에만 들어오는 모델(WAL 후 memtable)이라 strict concurrent write가 필요 없다. 그래서 *읽기는 wait-free, 쓰기는 직렬화*된 hybrid가 가장 단순한 답이다.

memtable이 일정 크기에 도달하면 *immutable*으로 전환되어 background에서 SSTable로 flush된다. 그동안 새 memtable이 만들어진다. 이게 LSM의 *level 0 진입 시점*.

세 사례 모두 skiplist가 *정렬 + 동시성*을 동시에 요구하는 자리에 자리 잡았음을 보여준다. 균형 트리가 못 한 일을 차지했다.

## 정리

- 균형 이진 트리는 **동시성에 부적합** — 회전이 다중 포인터 갱신
- **Skiplist** — 같은 성능, 회전 없음, 동시 친화적
- Lock-Free Skiplist는 lock-free linked list의 각 레벨 적용
- 실용적으로는 **Lazy Skiplist** 또는 striped lock 기반
- 정렬된 동시 컨테이너의 사실상 표준 — skiplist

## 한국 개발자의 함정

```
1. *Red-Black Tree로 동시 정렬 컨테이너*
   - 회전이 다중 포인터 갱신 → 매우 어려움
   - 학계에서도 lock-free RBT는 드묾
   - Skiplist가 사실상 표준

2. *std::map을 동시에 써도 됨*
   - std::map은 thread-unsafe
   - 별도 뮤텍스로 래핑해도 coarse locking
   - tbb::concurrent_map 또는 skiplist 사용

3. *Skiplist = 항상 빠름*
   - 캐시 친화성은 균형 트리만 못함
   - 메모리 오버헤드 큼 (포인터 평균 2개 per node)
   - 순차 / single-thread는 std::map이 더 빠를 수 있음

4. *Lock-Free Skiplist 직접 구현*
   - 9장 lock-free list의 누적 어려움
   - logical/physical 삭제 + marked bit 매 레벨
   - 라이브러리 사용 강력 권장
```

## 실무 적용

```
이론 → 실무:
- Lock-Free Skiplist     → java.util.concurrent.ConcurrentSkipListMap
- Skiplist + striped     → folly::ConcurrentSkipList
- B-link tree            → DB 인덱스 (PostgreSQL, MySQL InnoDB)
- LSM Tree               → LevelDB, RocksDB, Cassandra, ScyllaDB

언어별:
- C++: folly::ConcurrentSkipList, tbb::concurrent_map
- C: 직접 구현 (위 코드 참고) 또는 라이브러리
- Java: ConcurrentSkipListMap / ConcurrentSkipListSet
- Redis: 정렬 집합(ZSET)이 skiplist 기반
- Rust: crossbeam-skiplist

언제 정렬된 동시 컨테이너?
- 범위 쿼리 (range scan) 필요
- 순서가 의미 있음 (timestamp 등)
- 그 외엔 ConcurrentHashMap이 더 빠름
```

## 자기 점검

- [ ] 균형 이진 트리가 동시성에 부적합한 이유?
- [ ] Skiplist의 *랜덤 높이* 메커니즘?
- [ ] Lock-Free Skiplist의 각 레벨 처리?
- [ ] Lazy Skiplist의 동작?
- [ ] Skiplist의 단점 (메모리, 캐시)?
- [ ] B-tree vs LSM tree vs Skiplist 사용 자리?

## 다음 장 예고

다음 장은 **Priority Queue** — 우선순위 큐의 동시성 구현.

## 관련 항목

- [Ch 13: Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [Ch 15: Priority Queues](/blog/parallel/parallel-principles/ch15-priority-queues)
- [C++ Concurrency in Action Ch 6: Lock-based 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
