---
title: "DSA 25: Leftist / Binomial / Fibonacci Heap"
date: 2026-05-15T01:00:00
description: "두 힙을 효율적으로 병합 — Dijkstra, Prim의 점근 개선."
tags: [Data Structure, Algorithm, Heap, Mergeable Heap]
series: "Data Structures and Algorithms"
seriesOrder: 25
draft: true
---

## 한 줄 요약

> **"두 힙을 빠르게 합치고 싶을 때"** — 일반 힙 merge는 O(n), Leftist O(log n), Fibonacci amortized O(1).

## 어떤 문제를 푸는가

[item 12 일반 힙](/blog/programming/algorithms/data-structures-and-algorithms/item12-heap-priority-queue)의 약점:
- **두 힙 merge** = O(n) — 모두 다시 build-heap

응용에서 merge가 잦으면 비쌈:
- **Dijkstra**, **Prim** — decrease-key를 효율적으로
- **이벤트 시뮬레이션** — 여러 큐 합치기
- **graph 알고리즘 일반**

→ Mergeable heap 3종.

## 1. Leftist Heap (좌측 우선)

### 직관

이진 트리. **왼쪽 자식의 깊이가 오른쪽보다 길도록** 유지.

→ 오른쪽 경로가 짧음 → merge가 오른쪽 경로만 따라가면 O(log n).

### npl (null path length)

각 노드 v: `npl(v)` = v에서 NULL leaf까지의 최단 경로 길이.

규칙: `npl(left(v)) ≥ npl(right(v))`.

### Merge — O(log n)

```
1. 두 힙 H1, H2의 루트 비교
2. 작은 쪽이 새 루트, 그 오른쪽 서브트리와 다른 힙을 재귀 merge
3. leftist property 깨지면 자식 swap
```

### insert / extract-min

- insert: 단일 노드 힙 만들고 merge — O(log n)
- extract-min: 루트 제거 → 두 자식을 merge — O(log n)

## 2. Binomial Heap

### 직관

여러 **binomial tree** 의 모음. 각 binomial tree는 정해진 모양(B_k는 노드 2^k개).

```
B_0:  ·
B_1:  ·-·
B_2:  ·-·-·
       \
        ·
B_3:  ... (8 nodes)
```

n개 노드 = 어떤 B_k들의 합 (이진 표현).

### 핵심 연산

| | 시간 |
| --- | --- |
| insert | amortized O(1), worst O(log n) |
| find-min | O(log n) (모든 root 비교) |
| extract-min | O(log n) |
| merge | **O(log n)** |
| decrease-key | O(log n) |

merge: 두 binomial tree 모음을 병합 — 같은 차수 끼리 결합 (이진 덧셈처럼).

## 3. Fibonacci Heap

### 직관

Binomial heap의 일반화 + **lazy 연산**.

핵심 기법:
- merge·insert는 **그냥 root 리스트에 추가** — O(1)
- extract-min 때만 정리 (consolidation)
- decrease-key — 부모와 비교, 깨지면 cut + cascading cut

### 시간 복잡도 (amortized)

| | 시간 |
| --- | --- |
| insert | **O(1)** |
| find-min | **O(1)** |
| merge | **O(1)** |
| decrease-key | **O(1)** |
| extract-min | O(log n) |
| delete | O(log n) |

→ Dijkstra·Prim에서 **O(E + V log V)** 가능 (binary heap O(E log V) → 개선).

### 그러나 ⚠️

- 상수 인자가 매우 큼
- 코드 복잡 (수백 줄)
- 캐시 비친화

→ **이론적 우월, 실용은 binary heap**. 표준 라이브러리 거의 채택 X.

## 비교 표

| | Binary Heap | Leftist | Binomial | Fibonacci |
| --- | --- | --- | --- | --- |
| insert | O(log n) | O(log n) | amortized O(1) | **O(1)** |
| find-min | O(1) | O(1) | O(log n) | O(1) |
| extract-min | O(log n) | O(log n) | O(log n) | O(log n) |
| decrease-key | O(log n) | O(log n) | O(log n) | **O(1)** |
| merge | O(n) | O(log n) | O(log n) | **O(1)** |
| 코드 단순성 | ✅ | ⚠️ | ❌ | ❌❌ |
| 실용 | ✅ 표준 | ⚠️ 일부 | ⚠️ 일부 | ❌ 거의 안 씀 |

## C++ 구현 — Leftist Heap (간략)

```cpp
struct LNode {
    int value;
    int npl = 0;
    LNode* left  = nullptr;
    LNode* right = nullptr;
};

LNode* merge(LNode* a, LNode* b) {
    if (!a) return b;
    if (!b) return a;
    if (a->value > b->value) std::swap(a, b);    // a가 작은 쪽

    a->right = merge(a->right, b);

    if (!a->left || (a->left->npl < a->right->npl))
        std::swap(a->left, a->right);

    a->npl = (a->right ? a->right->npl : -1) + 1;
    return a;
}

class LeftistHeap {
    LNode* root = nullptr;
public:
    void push(int v) { root = merge(root, new LNode{v}); }
    int  pop() {
        int v = root->value;
        LNode* old = root;
        root = merge(root->left, root->right);
        delete old;
        return v;
    }
    int top() const { return root->value; }
    bool empty() const { return root == nullptr; }
};
```

## C 구현 — Leftist Heap

```c
typedef struct LNode {
    int value;
    int npl;
    struct LNode* left;
    struct LNode* right;
} LNode;

LNode* leftist_merge(LNode* a, LNode* b) {
    if (!a) return b;
    if (!b) return a;
    if (a->value > b->value) { LNode* t = a; a = b; b = t; }

    a->right = leftist_merge(a->right, b);

    int ll = a->left ? a->left->npl : -1;
    int lr = a->right ? a->right->npl : -1;
    if (ll < lr) {
        LNode* t = a->left; a->left = a->right; a->right = t;
    }
    a->npl = (a->right ? a->right->npl : -1) + 1;
    return a;
}
```

## 실제 사례 — Fibonacci Heap의 위상

- **이론적**: Dijkstra·Prim의 점근 한계 개선 — CLRS 19장
- **실용적**: 거의 안 씀. binary heap이 상수 인자 우위.
- **Leftist**: 학습용. 일부 함수형 언어 라이브러리.
- **Binomial**: Java `java.util.PriorityQueue` 일부 구현, Boost.Heap.

## 트레이드오프 — 한눈에

| 차원 | Mergeable Heaps |
| --- | --- |
| Merge 효율 | ✅ binary보다 우수 |
| 코드 복잡 | ❌ 매우 |
| 캐시 친화 | ❌ |
| 실무 채택 | ❌ 드뭄 |

> ⚠️ **알아두되 직접 구현 X**. binary heap이 거의 항상 정답.

## 다음

- [AVL 트리 — 회전·균형](/blog/programming/algorithms/data-structures-and-algorithms/item26-avl-tree)
