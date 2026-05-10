---
title: "DSA 31: Disjoint Set 깊이 — Path Compression + Union by Rank"
date: 2026-06-09T11:00:00
description: "두 최적화로 amortized O(α(n)) ≈ O(1) — Kruskal·연결 검사의 표준."
tags: [Data Structure, Algorithm, Union-Find, Disjoint Set]
series: "Data Structures and Algorithms"
seriesOrder: 31
draft: true
---

## 한 줄 요약

> **"path compression + union by rank → 거의 상수 시간"** — Kruskal MST와 함께 가장 자주 등장.

## 어떤 문제를 푸는가

[item 14](/blog/programming/data-structures-and-algorithms/item14-selection-tree-forest-set)에서 단순 Union-Find 봄. 단순 구현은 트리가 편향되어 **O(n)** worst.

→ 두 최적화로 사실상 O(1):
- **Path Compression** — find 시 모든 노드를 루트에 직접 연결
- **Union by Rank** — 작은 트리를 큰 트리에 붙임

## Path Compression

`find(x)`로 루트 찾으며 **거쳐온 모든 노드를 루트에 직결**.

```
처음:                  find(7) 후:
   1                       1
  /                      / | | |
 2                      2  3 5 7
 |                      |
 3
 |
 5
 |
 7
```

다음 find가 O(1).

## Union by Rank (또는 Size)

각 트리의 **rank** (대략 높이)를 추적. union 시 **rank 작은 트리를 큰 쪽에 붙임**.

```
rank=2 ⊕ rank=3 → rank=3 (큰 쪽 그대로)
rank=2 ⊕ rank=2 → rank=3 (한쪽이 다른 쪽에 붙으면서 +1)
```

→ 트리가 깊어지지 않게 막음.

## 두 최적화 결합 — α(n)

수학적으로 amortized 시간:

> O(α(n))   ← α는 inverse Ackermann

α(n) ≤ 4 (n < 2^65536). 사실상 **상수**.

## C++ 구현

```cpp
#include <vector>
#include <numeric>

class DisjointSet {
    std::vector<int> parent;
    std::vector<int> rank_;

public:
    explicit DisjointSet(int n) : parent(n), rank_(n, 0) {
        std::iota(parent.begin(), parent.end(), 0);    // parent[i] = i
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]);   // ◄── path compression
        return parent[x];
    }

    bool unite(int a, int b) {
        int ra = find(a);
        int rb = find(b);
        if (ra == rb) return false;        // 이미 같은 그룹

        if (rank_[ra] < rank_[rb]) {
            parent[ra] = rb;
        } else if (rank_[ra] > rank_[rb]) {
            parent[rb] = ra;
        } else {
            parent[rb] = ra;
            ++rank_[ra];
        }
        return true;
    }

    bool connected(int a, int b) {
        return find(a) == find(b);
    }
};

// 사용
DisjointSet ds(10);
ds.unite(1, 2);
ds.unite(3, 4);
ds.unite(2, 3);
ds.connected(1, 4);   // true
```

## 반복 버전 path compression (스택 오버플로 회피)

```cpp
int find(int x) {
    int root = x;
    while (parent[root] != root) root = parent[root];

    // 다시 한 번 경로 압축
    while (parent[x] != root) {
        int next = parent[x];
        parent[x] = root;
        x = next;
    }
    return root;
}
```

## C 구현

```c
#define N 1000

int parent[N];
int rank_[N];

void ds_init(int n) {
    for (int i = 0; i < n; ++i) {
        parent[i] = i;
        rank_[i] = 0;
    }
}

int ds_find(int x) {
    if (parent[x] != x) parent[x] = ds_find(parent[x]);
    return parent[x];
}

int ds_unite(int a, int b) {
    int ra = ds_find(a), rb = ds_find(b);
    if (ra == rb) return 0;

    if (rank_[ra] < rank_[rb]) parent[ra] = rb;
    else if (rank_[ra] > rank_[rb]) parent[rb] = ra;
    else { parent[rb] = ra; ++rank_[ra]; }
    return 1;
}
```

## Path Halving / Splitting (대안)

재귀 없이 path compression 효과를 부분적으로:

```cpp
// Path halving — 한 노드 건너 뛰면서 부모를 조부모로
int find(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // 부모를 조부모로
        x = parent[x];
    }
    return x;
}
```

코드 단순 + 실측 거의 같은 성능.

## Union by Size — 대안

`rank` 대신 **트리 크기(size)** 추적. 같은 효과.

```cpp
class DisjointSetBySize {
    std::vector<int> parent, size_;
public:
    DisjointSetBySize(int n) : parent(n), size_(n, 1) {
        std::iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    void unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return;
        if (size_[ra] < size_[rb]) std::swap(ra, rb);
        parent[rb] = ra;
        size_[ra] += size_[rb];
    }
    int size(int x) { return size_[find(x)]; }
};
```

`size()` 조회가 자연스러운 boundus.

## 시간 복잡도 비교

| 구현 | find | union |
| --- | --- | --- |
| 단순 (parent만) | O(n) worst | O(n) worst |
| + path compression만 | amortized O(log n) | amortized O(log n) |
| + union by rank만 | O(log n) | O(log n) |
| **둘 다** | amortized O(α(n)) ≈ **O(1)** | amortized O(α(n)) |

## 응용

- **Kruskal MST** (item 16) — 사이클 검사
- **그래프 연결 성분** — n번 union, 그룹 수 = 성분 수
- **친구 관계 그룹화** — 소셜 분석
- **이미지 영역 분리** (connected component labeling)
- **percolation theory** — Princeton 알고리즘 강의 단골
- **오프라인 LCA** (Lowest Common Ancestor)
- **dynamic connectivity** — 그래프 변경에 대응

## 트레이드오프 — 한눈에

| 차원 | Disjoint Set |
| --- | --- |
| union/find | ✅ amortized O(1) |
| 그룹 멤버 나열 | ❌ O(n) — 별도 필요 |
| 그룹 split | ❌ — 일반적으로 지원 X |
| 메모리 | ✅ O(n) — 두 배열만 |
| 코드 단순 | ✅ 30줄 |

## 실제 사례

- **Kruskal**의 사이클 검사 — 거의 모든 MST 구현
- **이미지 처리** — connected component labeling
- **컴파일러** — type unification (HM 타입 추론)
- **분산 시스템** — gossip protocol에서 cluster ID

## 다음

- [확률적 자료구조](/blog/programming/data-structures-and-algorithms/item32-probabilistic-data-structures)
