---
title: "DSA 14: 선택 트리·포레스트·집합 표현 (Union-Find 입문)"
date: 2026-03-03T14:00:00
description: "k-way merge용 selection tree, 포레스트로 표현하는 disjoint set."
tags: [Data Structure, Algorithm, Tournament, Union-Find]
series: "Data Structures and Algorithms"
seriesOrder: 14
draft: false
---

## 한 줄 요약

> **"여러 정렬된 입력을 효율적으로 병합하기 위한 토너먼트 트리 + 그룹 합치기를 위한 포레스트"**

## 1. 선택 트리 (Selection Tree / Tournament Tree)

### 어떤 문제

k개의 정렬된 입력 스트림을 병합하고 싶음 — k-way merge.

매번 k개 중 가장 작은 걸 골라야 → 단순 비교는 O(k). N개 출력 시 O(Nk).

→ **토너먼트 트리**로 O(N log k).

### 구조

<img src="/images/blog/dsa/diagrams/item14-selection-tree.svg" alt="선택 트리 (winner tree)" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

각 내부 노드 = **두 자식의 승자**(작은 값). 루트 = 전체 최솟값.

### 두 종류

- **승자 트리 (winner tree)** — 부모 = 자식 중 승자
- **패자 트리 (loser tree)** — 부모 = 자식 중 패자, 루트 위에 따로 승자 보관 — 갱신이 빠름

### 갱신 — O(log k)

루트 = 최솟값. 그 leaf에서 다음 값을 가져와 — 부모로 올라가며 비교.

### C++ 구현 — 단순 승자 트리 (k-way merge)

```cpp
#include <queue>

template<typename T>
T kwayMerge(const std::vector<std::vector<T>>& sources) {
    using Pair = std::pair<T, int>;   // (value, source index)
    std::priority_queue<Pair, std::vector<Pair>, std::greater<Pair>> pq;

    std::vector<int> idx(sources.size(), 0);
    for (std::size_t i = 0; i < sources.size(); ++i)
        if (!sources[i].empty()) pq.push({sources[i][0], i});

    std::vector<T> result;
    while (!pq.empty()) {
        auto [v, i] = pq.top(); pq.pop();
        result.push_back(v);
        if (++idx[i] < sources[i].size())
            pq.push({sources[i][idx[i]], i});
    }
    return result;
}
```

`std::priority_queue`(min-heap)를 토너먼트 트리 대신 사용 — 동등 효과 O(log k).

### 응용

- **외부 정렬** (External Sort) — 디스크의 sorted run들을 병합
- **DB 쿼리** — sorted index들의 merge join
- **검색 엔진** — posting list merge

---

## 2. 포레스트 (Forest)

> 트리들의 집합 = 포레스트

서로 다른 트리 N개의 모음. 응용:
- **disjoint set** (다음)
- **이진 트리 → 일반 트리 변환** 시 임시 표현

## 3. 집합 표현 — Disjoint Set (Union-Find) 입문

### 어떤 문제

원소 N개를 여러 그룹으로 나눠 관리:
- **union(a, b)** — a 그룹과 b 그룹 합치기
- **find(a)** — a가 속한 그룹의 대표 찾기

응용:
- **MST의 Kruskal** (item 23) — 사이클 검사
- **그래프 연결 성분**
- **친구 관계 그룹**, **이미지 영역 분리**

### 단순 구현 (포레스트)

각 그룹을 **하나의 트리**로 — 루트가 그룹 대표.

```
3       6           9
|       |          /|\
1   →   2,5,8  →  4 7 10
```

`parent[i]` 배열만 있으면 됨 — `parent[root] = root`.

### C++ 구현

```cpp
class DisjointSet {
    std::vector<int> parent;

public:
    explicit DisjointSet(int n) : parent(n) {
        for (int i = 0; i < n; ++i) parent[i] = i;   // 각자 자기 자신
    }

    int find(int x) {
        while (parent[x] != x) x = parent[x];
        return x;
    }

    void unite(int a, int b) {
        int ra = find(a);
        int rb = find(b);
        if (ra != rb) parent[ra] = rb;     // ra의 루트를 rb로
    }

    bool connected(int a, int b) { return find(a) == find(b); }
};

// 사용
DisjointSet ds(10);
ds.unite(1, 2);
ds.unite(2, 3);
ds.connected(1, 3);   // true
ds.connected(1, 4);   // false
```

### C 구현

```c
#define N 1000

int parent[N];

void ds_init(int n) {
    for (int i = 0; i < n; ++i) parent[i] = i;
}

int ds_find(int x) {
    while (parent[x] != x) x = parent[x];
    return x;
}

void ds_unite(int a, int b) {
    int ra = ds_find(a);
    int rb = ds_find(b);
    if (ra != rb) parent[ra] = rb;
}
```

### 함정 — 단순 구현은 트리가 편향될 수 있음

```
unite(1,2), unite(2,3), unite(3,4), ..., unite(n-1, n)
→ 트리가 일렬로 — find가 O(n)
```

→ **path compression + union by rank** 최적화 필요. 자세히는 [item 31](/blog/programming/algorithms/data-structures-and-algorithms/item31-disjoint-set-detail) (Part B의 Union-Find 깊이 보기).

### 시간 복잡도 (단순 vs 최적화)

| | find | union |
| --- | --- | --- |
| **단순** | O(n) (편향) | O(n) |
| **+ path compression** | amortized O(log n) | amortized O(log n) |
| **+ union by rank** | amortized O(log n) | amortized O(log n) |
| **둘 다** | amortized O(α(n)) ≈ O(1) | amortized O(α(n)) ≈ O(1) |

α는 inverse Ackermann — 실용적으로 ≤ 4.

## 트레이드오프 — 한눈에

| 차원 | Disjoint Set |
| --- | --- |
| union/find (최적화) | ✅ 거의 O(1) |
| 그룹 멤버 나열 | ❌ O(n) — 별도 자료구조 필요 |
| 그룹 분리 (split) | ❌ 어려움 — 보통 지원 안 함 |
| 메모리 | ✅ O(n) |

## 실제 사례

- **Kruskal MST** (item 23)
- **그래프 연결 성분** 검사
- **percolation theory** — Princeton의 알고리즘 강의 단골 예제
- **이미지 connected component labeling**

## 다음

- [그래프 표현 + DFS/BFS](/blog/programming/algorithms/data-structures-and-algorithms/item15-graph-traversal)
