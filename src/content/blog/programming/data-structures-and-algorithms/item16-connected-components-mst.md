---
title: "DSA 16: 연결 성분과 MST (Kruskal, Prim)"
date: 2026-03-04T11:00:00
description: "그래프의 분리된 영역 찾기 + 최소 비용 신장 트리 두 알고리즘."
tags: [Data Structure, Algorithm, Graph, MST, Kruskal, Prim]
series: "Data Structures and Algorithms"
seriesOrder: 16
draft: false
---

## 한 줄 요약

> **"모든 노드를 가장 적은 비용으로 연결하기"** — Kruskal (간선 정렬 + Union-Find), Prim (Dijkstra류).

## 1. 연결 성분 (Connected Components)

무방향 그래프에서 서로 도달 가능한 노드들의 그룹.

### C++ 구현

```cpp
int countComponents(const Graph& g) {
    std::vector<bool> visited(g.size(), false);
    int count = 0;
    for (int u = 0; u < g.size(); ++u) {
        if (!visited[u]) {
            dfs(g, u, visited);   // (item 15의 dfs)
            ++count;
        }
    }
    return count;
}
```

→ DFS 한 바퀴 = 한 성분. 시간 O(V + E).

방향 그래프에선 **SCC** (Strongly Connected Component) — [item 21](/blog/programming/data-structures-and-algorithms/item21-topological-sort-scc)에서 자세히.

---

## 2. MST (Minimum Spanning Tree)

### 어떤 문제

가중치 그래프에서:
- **모든 노드 연결**
- **사이클 없음** (트리)
- **간선 가중치 합 최소**

응용:
- **네트워크 설계** — 모든 도시를 가장 싼 비용으로 케이블 연결
- **클러스터링** — single-linkage hierarchical clustering
- **회로 설계** — 최소 길이 와이어

### 두 표준 알고리즘

| 알고리즘 | 전략 | 핵심 자료구조 |
| --- | --- | --- |
| **Kruskal** | 간선 가중치 오름차순 → 사이클 안 만들면 추가 | Union-Find |
| **Prim** | 시작 노드부터 트리 키워가며 가장 싼 간선 추가 | Priority Queue |

## 2.1 Kruskal

```
1. 모든 간선을 가중치 오름차순 정렬
2. 작은 간선부터 검사:
   - 사이클 안 생기면 (= 두 끝점이 다른 컴포넌트면) MST에 추가
   - 사이클 생기면 (= 같은 컴포넌트면) 무시
3. (V-1)개 간선 추가될 때까지 반복
```

사이클 검사 = **Union-Find**.

### C++ 구현

```cpp
#include <vector>
#include <algorithm>

struct Edge { int u, v, w; };

class DisjointSet {   // (item 14의 단순 버전)
    std::vector<int> parent;
public:
    DisjointSet(int n) : parent(n) { for (int i = 0; i < n; ++i) parent[i] = i; }
    int find(int x) { while (parent[x] != x) x = parent[x]; return x; }
    void unite(int a, int b) { parent[find(a)] = find(b); }
};

std::vector<Edge> kruskal(int V, std::vector<Edge>& edges) {
    std::sort(edges.begin(), edges.end(), [](auto& a, auto& b) { return a.w < b.w; });

    DisjointSet ds(V);
    std::vector<Edge> mst;

    for (const Edge& e : edges) {
        if (ds.find(e.u) != ds.find(e.v)) {
            ds.unite(e.u, e.v);
            mst.push_back(e);
            if ((int)mst.size() == V - 1) break;
        }
    }
    return mst;
}
```

**시간 복잡도**: O(E log E) — 정렬이 지배. Union-Find는 거의 O(1).

## 2.2 Prim

```
1. 시작 노드에서 출발
2. MST에 포함되지 않은 노드 중 가장 싼 간선으로 연결되는 노드 선택
3. 모든 노드가 포함될 때까지 반복
```

매번 "가장 싼" 간선 선택 = **Priority Queue**.

### C++ 구현

```cpp
#include <queue>
#include <vector>

int prim(int V, const std::vector<std::vector<std::pair<int, int>>>& adj) {
    std::vector<bool> inMST(V, false);
    std::priority_queue<std::pair<int, int>,
                        std::vector<std::pair<int, int>>,
                        std::greater<>> pq;   // (weight, node)
    pq.push({0, 0});   // 시작 노드 0
    int totalWeight = 0;
    int count = 0;

    while (!pq.empty() && count < V) {
        auto [w, u] = pq.top(); pq.pop();
        if (inMST[u]) continue;
        inMST[u] = true;
        totalWeight += w;
        ++count;

        for (auto [v, weight] : adj[u])
            if (!inMST[v]) pq.push({weight, v});
    }
    return totalWeight;
}
```

**시간 복잡도**: O(E log V) — Dijkstra와 같은 패턴.

## C 구현 — Kruskal (간략)

```c
typedef struct { int u, v, w; } Edge;

int parent[MAX_V];

int find(int x) { while (parent[x] != x) x = parent[x]; return x; }
void unite(int a, int b) { parent[find(a)] = find(b); }

int compare_edge(const void* a, const void* b) {
    return ((Edge*)a)->w - ((Edge*)b)->w;
}

void kruskal(int V, Edge* edges, int E) {
    qsort(edges, E, sizeof(Edge), compare_edge);
    for (int i = 0; i < V; ++i) parent[i] = i;

    int total = 0, count = 0;
    for (int i = 0; i < E && count < V - 1; ++i) {
        if (find(edges[i].u) != find(edges[i].v)) {
            unite(edges[i].u, edges[i].v);
            total += edges[i].w;
            ++count;
        }
    }
    printf("MST 총 가중치: %d\n", total);
}
```

## Kruskal vs Prim — 어느 걸?

| 측면 | Kruskal | Prim |
| --- | --- | --- |
| 그래프 표현 | 간선 리스트 | 인접 리스트 |
| Sparse (E ≪ V²) | ✅ 빠름 | ✅ 빠름 |
| Dense (E ≈ V²) | ⚠️ 정렬 비용 | ✅ |
| 외부 정렬 가능 | ✅ (간선 디스크) | ❌ |
| 분산 처리 | ✅ | ⚠️ |
| 코드 단순성 | ✅ Union-Find만 | ⚠️ priority queue |

기본은 **Kruskal** (단순 + Union-Find가 익숙). dense면 Prim.

## 정확성 — Cut property

> 어떤 cut(노드를 두 그룹으로 나눔)에서 가장 가벼운 간선은 어떤 MST에 반드시 포함된다.

Kruskal과 Prim 모두 이 cut property로 정확성 증명. (자세한 건 CLRS 23장)

## 트레이드오프 — 한눈에

| 차원 | MST |
| --- | --- |
| 모든 노드 연결, 비용 최소 | ✅ |
| Kruskal: O(E log E) | ✅ |
| Prim: O(E log V) | ✅ |
| 음수 가중치 | ✅ OK (Dijkstra와 다름) |
| 방향 그래프 | ❌ — Arborescence (다른 알고리즘) |

## 실제 사례

- **네트워크 설계** — 통신 케이블, 도로
- **클러스터링** — 데이터 그룹화
- **이미지 분할**
- **회로 설계**

## 다음

- [최단 경로 (Dijkstra, Bellman-Ford, Floyd)](/blog/programming/data-structures-and-algorithms/item17-shortest-path)
