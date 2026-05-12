---
title: "DSA 30: Skip List"
date: 2026-03-09T10:00:00
description: "확률적 균형 — 정렬 트리만큼 빠르면서 구현 단순. Redis sorted set의 토대."
tags: [Data Structure, Algorithm, Skip List, Probabilistic]
series: "Data Structures and Algorithms"
seriesOrder: 30
draft: false
---

## 한 줄 요약

> **"여러 층의 정렬된 연결 리스트 — 위층은 빠른 길, 아래층은 정확한 길"** — 평균 O(log n), 균형 코드 없음.

## 어떤 문제를 푸는가

균형 BST (AVL, RB)는 **회전 등 코드 복잡**. 삽입·삭제 시 균형 유지 로직이 길음.

Skip list:
- 확률적 균형 — 회전·색칠 X
- 평균 O(log n) (high probability)
- 코드 짧음
- 동시성(Lock-free) 친화

→ **단순함 + 성능**의 절충.

## 직관

정렬된 연결 리스트는 검색 O(n) (매 노드 거쳐야).

→ **여러 층** — 위층은 노드 일부만 (express 차선), 아래층은 모두.

```
Level 3:  [1] -----------------> [9]
Level 2:  [1] ----> [4] -------> [9]
Level 1:  [1]-[2]-[4]-[6]-[8]-[9]
```

검색 14: 위층부터 — 너무 크면 한 층 내려가, 작거나 같으면 옆으로.

## 핵심 — 노드의 층 (level)

각 노드의 층은 **확률적**으로 결정:
- level 1 (가장 아래): 항상
- level 2: 확률 p = 1/2 (또는 1/4)
- level 3: 확률 p² = 1/4
- ...

→ 높은 층 노드는 적어 (express). 평균 level은 약 log_(1/p)(n).

## 검색

```
시작: 가장 위층의 head
1. 다음 노드가 target 이하면 → 옆으로
2. 너무 크면 → 한 층 아래로
3. 가장 아래층까지 가면 종료
```

평균 O(log n).

## C++ 구현

```cpp
#include <random>
#include <vector>
#include <iostream>

template<typename T>
class SkipList {
    static constexpr int MAX_LEVEL = 16;
    static constexpr float P = 0.5;

    struct Node {
        T value;
        std::vector<Node*> next;   // next[i] = level i의 다음 노드
        Node(T v, int level) : value(v), next(level + 1, nullptr) {}
    };

    Node* head;
    int   level = 0;
    std::mt19937 rng{std::random_device{}()};

    int randomLevel() {
        int lvl = 0;
        std::uniform_real_distribution<float> dist(0, 1);
        while (dist(rng) < P && lvl < MAX_LEVEL) ++lvl;
        return lvl;
    }

public:
    SkipList() : head(new Node(T(), MAX_LEVEL)) {}

    bool contains(T v) const {
        Node* cur = head;
        for (int i = level; i >= 0; --i)
            while (cur->next[i] && cur->next[i]->value < v)
                cur = cur->next[i];
        cur = cur->next[0];
        return cur && cur->value == v;
    }

    void insert(T v) {
        std::vector<Node*> update(MAX_LEVEL + 1, head);
        Node* cur = head;
        for (int i = level; i >= 0; --i) {
            while (cur->next[i] && cur->next[i]->value < v)
                cur = cur->next[i];
            update[i] = cur;
        }

        int lvl = randomLevel();
        if (lvl > level) {
            for (int i = level + 1; i <= lvl; ++i) update[i] = head;
            level = lvl;
        }

        Node* newNode = new Node(v, lvl);
        for (int i = 0; i <= lvl; ++i) {
            newNode->next[i] = update[i]->next[i];
            update[i]->next[i] = newNode;
        }
    }

    bool remove(T v) {
        std::vector<Node*> update(MAX_LEVEL + 1, head);
        Node* cur = head;
        for (int i = level; i >= 0; --i) {
            while (cur->next[i] && cur->next[i]->value < v)
                cur = cur->next[i];
            update[i] = cur;
        }
        cur = cur->next[0];
        if (!cur || cur->value != v) return false;

        for (int i = 0; i <= level; ++i) {
            if (update[i]->next[i] != cur) break;
            update[i]->next[i] = cur->next[i];
        }
        delete cur;
        while (level > 0 && !head->next[level]) --level;
        return true;
    }
};

// 사용
SkipList<int> sl;
sl.insert(3); sl.insert(7); sl.insert(1); sl.insert(5);
sl.contains(5);   // true
sl.remove(7);
```

## C 구현

```c
#define MAX_LEVEL 16

typedef struct SkipNode {
    int value;
    struct SkipNode** next;   // 동적 배열
    int level;
} SkipNode;

typedef struct {
    SkipNode* head;
    int level;
} SkipList;

SkipNode* skip_node_new(int v, int level) {
    SkipNode* n = malloc(sizeof(SkipNode));
    n->value = v;
    n->level = level;
    n->next = calloc(level + 1, sizeof(SkipNode*));
    return n;
}

int random_level(void) {
    int lvl = 0;
    while (rand() & 1 && lvl < MAX_LEVEL) ++lvl;
    return lvl;
}

void sl_init(SkipList* sl) {
    sl->head = skip_node_new(0, MAX_LEVEL);
    sl->level = 0;
}

int sl_contains(const SkipList* sl, int v) {
    SkipNode* cur = sl->head;
    for (int i = sl->level; i >= 0; --i)
        while (cur->next[i] && cur->next[i]->value < v)
            cur = cur->next[i];
    cur = cur->next[0];
    return cur && cur->value == v;
}

void sl_insert(SkipList* sl, int v) {
    SkipNode* update[MAX_LEVEL + 1];
    SkipNode* cur = sl->head;
    for (int i = sl->level; i >= 0; --i) {
        while (cur->next[i] && cur->next[i]->value < v)
            cur = cur->next[i];
        update[i] = cur;
    }
    int lvl = random_level();
    if (lvl > sl->level) {
        for (int i = sl->level + 1; i <= lvl; ++i) update[i] = sl->head;
        sl->level = lvl;
    }
    SkipNode* node = skip_node_new(v, lvl);
    for (int i = 0; i <= lvl; ++i) {
        node->next[i] = update[i]->next[i];
        update[i]->next[i] = node;
    }
}
```

## 시간 복잡도

| | 평균 (high probability) |
| --- | --- |
| 검색 | O(log n) |
| 삽입 | O(log n) |
| 삭제 | O(log n) |

worst-case는 O(n)이지만 확률 매우 낮음.

## Skip List vs Balanced BST

| | Skip List | RB Tree |
| --- | --- | --- |
| 평균 | O(log n) | O(log n) |
| worst | O(n) (확률 낮음) | ✅ O(log n) |
| 코드 | ✅ 단순 | ❌ 복잡 |
| 동시성 (lock-free) | ✅ 친화 | ❌ 어려움 |
| 메모리 | 평균 약간 더 | — |
| range query | ✅ 자연스러움 (level 0 = sorted list) | OK |

## 실제 사례

- **Redis Sorted Set (zset)** — Skip List + 해시 테이블
- **LevelDB / RocksDB** — MemTable
- **Java `ConcurrentSkipListMap`** — lock-free 동시성
- **Lucene** — 검색 인덱스 일부

## 트레이드오프 — 한눈에

| 차원 | Skip List |
| --- | --- |
| 코드 단순 (BST 대비) | ✅ |
| 평균 성능 | ✅ |
| Lock-free 친화 | ✅ |
| worst-case 보장 X | ⚠️ 확률적 |
| 메모리 약간 多 | ⚠️ |

## 다음

- [Disjoint Set 깊이 보기](/blog/programming/algorithms/data-structures-and-algorithms/item31-disjoint-set-detail)
