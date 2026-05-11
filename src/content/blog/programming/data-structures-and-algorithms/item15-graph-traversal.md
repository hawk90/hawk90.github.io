---
title: "DSA 15: 그래프 표현 + DFS/BFS"
date: 2026-03-04T10:00:00
description: "인접 행렬 vs 인접 리스트 선택, DFS와 BFS의 두 순회."
tags: [Data Structure, Algorithm, Graph, DFS, BFS]
series: "Data Structures and Algorithms"
seriesOrder: 15
draft: false
---

## 한 줄 요약

> **"노드 + 간선 = 그래프"** — 표현 방식(행렬/리스트)이 알고리즘 비용을 좌우.

## 어떤 문제를 푸는가

- **소셜 네트워크** — 사용자가 노드, 친구 관계가 간선
- **지도 / 내비게이션** — 도시·교차로 노드, 도로 간선
- **웹** — 페이지 노드, 링크 간선
- **컴파일러 의존성** — 모듈 그래프
- **회로 / 화학 분자** — 자연스러운 그래프

거의 모든 관계 데이터가 그래프.

## 용어

- **방향 vs 무방향** (directed / undirected)
- **가중치** (weighted) — 간선마다 비용
- **밀도** — sparse (간선 적음) / dense (간선 많음)
- **사이클** — 출발로 돌아오는 경로
- **DAG** — Directed Acyclic Graph (사이클 없는 방향 그래프)

## 표현 — 두 가지

### 1. 인접 행렬 (Adjacency Matrix)

```
    A B C D
  A [0 1 0 1]
  B [1 0 1 0]
  C [0 1 0 1]
  D [1 0 1 0]
```

`adj[i][j] = 1` 이면 i→j 간선 있음.

| 측면 | 인접 행렬 |
| --- | --- |
| 메모리 | O(V²) — 노드 수의 제곱 |
| 간선 존재 검사 | O(1) |
| 노드의 모든 이웃 순회 | O(V) — 행 전체 봐야 |
| 간선 추가/삭제 | O(1) |

→ **dense graph (E ≈ V²)** 또는 **빈번한 간선 검사**에 적합.

### 2. 인접 리스트 (Adjacency List)

```
A → [B, D]
B → [A, C]
C → [B, D]
D → [A, C]
```

각 노드가 이웃 리스트.

| 측면 | 인접 리스트 |
| --- | --- |
| 메모리 | O(V + E) |
| 간선 존재 검사 | O(deg(v)) |
| 노드의 모든 이웃 순회 | O(deg(v)) — 효율 |
| 간선 추가 | O(1) |

→ **sparse graph (E ≪ V²)** 에 적합. **대부분 실무에서 표준**.

## C++ 구현 — 인접 리스트

```cpp
#include <vector>
#include <utility>

class Graph {
    int V;
    std::vector<std::vector<int>> adj;   // adj[u] = u의 이웃들

public:
    explicit Graph(int v) : V(v), adj(v) {}

    void addEdge(int u, int v, bool directed = false) {
        adj[u].push_back(v);
        if (!directed) adj[v].push_back(u);
    }

    const std::vector<int>& neighbors(int u) const { return adj[u]; }
    int size() const { return V; }
};
```

### 가중치 그래프

```cpp
class WeightedGraph {
    int V;
    std::vector<std::vector<std::pair<int, int>>> adj;   // (이웃, 가중치)

public:
    explicit WeightedGraph(int v) : V(v), adj(v) {}

    void addEdge(int u, int v, int w, bool directed = false) {
        adj[u].push_back({v, w});
        if (!directed) adj[v].push_back({u, w});
    }
};
```

## C 구현 — 인접 리스트

```c
#define MAX_V 1000

typedef struct EdgeNode {
    int to;
    struct EdgeNode* next;
} EdgeNode;

EdgeNode* adj[MAX_V];
int V;

void graph_init(int v) {
    V = v;
    for (int i = 0; i < v; ++i) adj[i] = NULL;
}

void graph_add_edge(int u, int v, int directed) {
    EdgeNode* e = malloc(sizeof(EdgeNode));
    e->to = v; e->next = adj[u]; adj[u] = e;
    if (!directed) {
        EdgeNode* e2 = malloc(sizeof(EdgeNode));
        e2->to = u; e2->next = adj[v]; adj[v] = e2;
    }
}
```

## DFS (Depth-First Search) — 깊이 우선

가능한 한 **깊이 들어간 후** 더 이상 못 가면 backtrack.

<img src="/images/blog/dsa/diagrams/item15-graph-bfs.svg" alt="BFS 방문 예시 그래프" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

스택 사용 (재귀 = 시스템 스택).

### C++ 구현 — 재귀

```cpp
void dfs(const Graph& g, int u, std::vector<bool>& visited) {
    visited[u] = true;
    std::cout << u << " ";
    for (int v : g.neighbors(u))
        if (!visited[v]) dfs(g, v, visited);
}

void dfsAll(const Graph& g) {
    std::vector<bool> visited(g.size(), false);
    for (int u = 0; u < g.size(); ++u)
        if (!visited[u]) dfs(g, u, visited);
}
```

### C++ 구현 — 명시적 스택

```cpp
void dfsIterative(const Graph& g, int start) {
    std::vector<bool> visited(g.size(), false);
    std::stack<int> st;
    st.push(start);

    while (!st.empty()) {
        int u = st.top(); st.pop();
        if (visited[u]) continue;
        visited[u] = true;
        std::cout << u << " ";
        for (int v : g.neighbors(u))
            if (!visited[v]) st.push(v);
    }
}
```

## BFS (Breadth-First Search) — 너비 우선

레벨별 순회 — **최단 거리 (간선 수)** 보장.

```
시작: A
방문 순서: A, B, E, C, D
```

큐 사용.

### C++ 구현

```cpp
void bfs(const Graph& g, int start) {
    std::vector<bool> visited(g.size(), false);
    std::queue<int> q;
    q.push(start);
    visited[start] = true;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        std::cout << u << " ";
        for (int v : g.neighbors(u))
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
    }
}
```

## DFS vs BFS

| | DFS | BFS |
| --- | --- | --- |
| 자료구조 | 스택 (또는 재귀) | 큐 |
| 메모리 | O(h) — 깊이 | O(w) — 너비 |
| 최단 경로 (간선 수) | ❌ 보장 X | ✅ 보장 |
| 사이클 검사 | ✅ 자연스러움 | ✅ |
| 위상 정렬 | ✅ | ⚠️ Kahn's algorithm |
| 백트래킹 | ✅ | ❌ |

## 시간 복잡도

| | 인접 행렬 | 인접 리스트 |
| --- | --- | --- |
| DFS / BFS | O(V²) | O(V + E) |

대부분 sparse graph라 **인접 리스트 + O(V + E)**가 표준.

## 응용

| 응용 | DFS / BFS |
| --- | --- |
| **미로 / 길찾기 (간선 가중치 X)** | BFS |
| **연결 성분 검사** | 둘 다 |
| **사이클 검사** | DFS |
| **위상 정렬** (item 21) | DFS |
| **SCC** (item 21) | DFS (Tarjan, Kosaraju) |
| **이분 그래프 검사** | BFS (색칠) |
| **2D 그리드 영역** | DFS (재귀) 또는 BFS |

## 트레이드오프 — 한눈에

| 차원 | DFS | BFS |
| --- | --- | --- |
| 깊은 곳 빨리 | ✅ | ❌ |
| 가까운 거 우선 | ❌ | ✅ |
| 메모리 (균형 트리) | ✅ O(log) | O(n/2) |
| 메모리 (긴 트리) | O(n) | ✅ O(1~2) |
| 코드 단순성 | ✅ 재귀 | ⚠️ 큐 필요 |

## 실제 사례

- **모든 그래프 알고리즘의 기초**
- **웹 크롤러** — BFS (가까운 페이지부터)
- **소셜 네트워크 친구의 친구** — BFS
- **컴파일러 의존성 분석** — DFS
- **GC mark phase** — BFS 또는 DFS

## 다음

- [연결 성분, MST (Kruskal, Prim)](/blog/programming/data-structures-and-algorithms/item16-connected-components-mst)
