---
title: "DSA 33: 모던 그래프 — Tarjan SCC, 위상 정렬 응용"
date: 2026-03-09T13:00:00
description: "강한 연결 요소 찾기 — Kosaraju vs Tarjan. 위상 정렬의 실전 응용."
tags: [Data Structure, Algorithm, Graph, SCC, Tarjan, Kosaraju]
series: "Data Structures and Algorithms"
seriesOrder: 33
draft: false
---

## 한 줄 요약

> **"방향 그래프에서 서로 도달 가능한 노드 그룹"** — Kosaraju (직관적), Tarjan (한 번 DFS).

## 어떤 문제를 푸는가

방향 그래프에서:
- **모듈 의존성** — 순환 의존 그룹 검출
- **웹 페이지 구조** — 강하게 연결된 페이지 묶음
- **2-SAT** — 명제 논리 충족 가능성
- **언어 클래스 인스턴스 분석** — 불변 클래스 그룹

→ **SCC** (Strongly Connected Component) — 그룹 내 모든 노드가 서로 도달 가능.

```
[A → B → C]   ← SCC1: {A, B, C}가 서로 도달 가능
   ↑   ↓
[D ← C ]
[D → E]      ← SCC2: {D, E}
[E → D]
```

## SCC의 응용

### 1. 위상 정렬에서 사이클 검출

DAG가 아니면 위상 정렬 불가 — 사이클은 정확히 SCC가 2개 이상 노드를 가진 경우.

### 2. 컴포넌트 그래프 (Condensation)

각 SCC를 한 노드로 축약 → DAG. 그 위에서 위상 정렬 등 가능.

### 3. 2-SAT

명제 (a ∨ ¬b) ∧ (b ∨ c) 같은 식을 implication graph로 만들고 SCC 분석 → O(n+m)에 충족 가능 여부.

## Kosaraju 알고리즘

### 직관

1. 그래프에서 DFS → finish time 순으로 스택에 push
2. **그래프의 transpose** (모든 간선 뒤집기)
3. 스택에서 pop 순서로 transpose에서 DFS → 각 DFS 트리가 한 SCC

### C++ 구현

```cpp
#include <vector>
#include <stack>

class Kosaraju {
    int V;
    std::vector<std::vector<int>> adj, radj;
    std::vector<bool> visited;
    std::stack<int> finishStack;

    void dfs1(int u) {
        visited[u] = true;
        for (int v : adj[u]) if (!visited[v]) dfs1(v);
        finishStack.push(u);
    }

    void dfs2(int u, std::vector<int>& component) {
        visited[u] = true;
        component.push_back(u);
        for (int v : radj[u]) if (!visited[v]) dfs2(v, component);
    }

public:
    Kosaraju(int v) : V(v), adj(v), radj(v) {}

    void addEdge(int u, int v) {
        adj[u].push_back(v);
        radj[v].push_back(u);   // transpose
    }

    std::vector<std::vector<int>> findSCCs() {
        // 1단계 DFS
        visited.assign(V, false);
        for (int u = 0; u < V; ++u) if (!visited[u]) dfs1(u);

        // 2단계 DFS (transpose, finish 역순)
        visited.assign(V, false);
        std::vector<std::vector<int>> sccs;
        while (!finishStack.empty()) {
            int u = finishStack.top(); finishStack.pop();
            if (!visited[u]) {
                std::vector<int> comp;
                dfs2(u, comp);
                sccs.push_back(comp);
            }
        }
        return sccs;
    }
};
```

**시간**: O(V + E) — DFS 두 번.

## Tarjan 알고리즘 — 한 번 DFS

### 직관

각 노드에 두 값:
- `disc[u]` — DFS 발견 시간
- `low[u]` — u에서 도달 가능한 가장 작은 disc

`low[u] == disc[u]` 인 노드 = SCC의 루트.

### C++ 구현

```cpp
#include <vector>
#include <stack>

class Tarjan {
    int V, timer = 0;
    std::vector<std::vector<int>> adj;
    std::vector<int> disc, low;
    std::vector<bool> onStack;
    std::stack<int> st;
    std::vector<std::vector<int>> sccs;

    void dfs(int u) {
        disc[u] = low[u] = timer++;
        st.push(u);
        onStack[u] = true;

        for (int v : adj[u]) {
            if (disc[v] == -1) {
                dfs(v);
                low[u] = std::min(low[u], low[v]);
            } else if (onStack[v]) {
                low[u] = std::min(low[u], disc[v]);
            }
        }

        if (low[u] == disc[u]) {   // SCC 루트
            std::vector<int> comp;
            while (true) {
                int v = st.top(); st.pop();
                onStack[v] = false;
                comp.push_back(v);
                if (v == u) break;
            }
            sccs.push_back(comp);
        }
    }

public:
    Tarjan(int v) : V(v), adj(v), disc(v, -1), low(v, -1), onStack(v, false) {}

    void addEdge(int u, int v) { adj[u].push_back(v); }

    std::vector<std::vector<int>> findSCCs() {
        for (int u = 0; u < V; ++u) if (disc[u] == -1) dfs(u);
        return sccs;
    }
};
```

**시간**: O(V + E) — **DFS 한 번**. 실측 약 2배 빠름.

## C 구현 — Kosaraju 골격

```c
int adj[MAX_V][MAX_V], radj[MAX_V][MAX_V];
int adj_size[MAX_V], radj_size[MAX_V];
int visited[MAX_V];
int finish_stack[MAX_V], stack_top = 0;

void dfs1(int u) {
    visited[u] = 1;
    for (int i = 0; i < adj_size[u]; ++i)
        if (!visited[adj[u][i]]) dfs1(adj[u][i]);
    finish_stack[stack_top++] = u;
}

void dfs2(int u) {
    visited[u] = 1;
    printf("%d ", u);
    for (int i = 0; i < radj_size[u]; ++i)
        if (!visited[radj[u][i]]) dfs2(radj[u][i]);
}

void kosaraju(int V) {
    for (int u = 0; u < V; ++u) if (!visited[u]) dfs1(u);
    for (int u = 0; u < V; ++u) visited[u] = 0;
    while (stack_top > 0) {
        int u = finish_stack[--stack_top];
        if (!visited[u]) {
            printf("SCC: ");
            dfs2(u);
            printf("\n");
        }
    }
}
```

## Kosaraju vs Tarjan

| | Kosaraju | Tarjan |
| --- | --- | --- |
| DFS 횟수 | 2 | 1 |
| transpose 그래프 | 필요 | 불필요 |
| 코드 단순 | ✅ 더 직관 | ⚠️ low/disc 트릭 |
| 캐시 친화 | ⚠️ | ✅ |
| 메모리 | 2× (adj + radj) | 1× |
| 실용 | 둘 다 OK | 약간 우위 |

## 실제 응용 패턴

### 1. 컴포넌트 그래프 + 위상 정렬

```cpp
auto sccs = tarjan.findSCCs();   // 각 SCC ID
// SCC 사이의 간선들로 condensation graph 만들기
// 그 위에서 위상 정렬 → 의존성 순서
```

### 2. 2-SAT

n 변수 + m 절. implication graph 구성 → SCC. `x`와 `¬x`가 같은 SCC면 unsat.

```cpp
// 변수 x_i는 노드 2i (양), 2i+1 (음)
// (a ∨ b) → 두 implication: ¬a → b, ¬b → a
```

O(n + m) — 2-SAT는 다항 시간 (3-SAT는 NP-완전).

## 트레이드오프 — 한눈에

| 차원 | SCC |
| --- | --- |
| 시간 | ✅ O(V + E) |
| 컴포넌트 그래프 | ✅ DAG로 변환 |
| 2-SAT 해결 | ✅ |
| 응용 풍부 | ✅ |

## 실제 사례

- **컴파일러** — 강하게 연결된 모듈 분석
- **웹 그래프 분석** — link analysis
- **2-SAT 문제** (CSP)
- **dependency cycle 검출** (Bazel, Cargo)
- **Linux kernel modules** dependency

## 다음

- [DP 패턴 카탈로그](/blog/programming/data-structures-and-algorithms/item34-dp-patterns)
