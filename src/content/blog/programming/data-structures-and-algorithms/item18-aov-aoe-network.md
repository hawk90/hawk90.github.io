---
title: "DSA 18: AOV / AOE 네트워크 — 위상 정렬과 임계 경로"
date: 2026-06-04T13:00:00
description: "활동 네트워크로 작업 일정 관리 — 의존성 순서와 최장 경로(임계)."
tags: [Data Structure, Algorithm, Graph, Topological Sort, Critical Path]
series: "Data Structures and Algorithms"
seriesOrder: 18
draft: true
---

## 한 줄 요약

> **"작업 의존성 그래프 → 가능한 순서 + 가장 오래 걸리는 경로 = 프로젝트 일정의 핵심"**

## 어떤 문제를 푸는가

프로젝트는 작업의 모음 — 어떤 작업은 다른 작업이 끝난 후에야 시작 가능.

- "어떤 순서로 진행 가능한가?" → **AOV + 위상 정렬**
- "프로젝트 최단 완료 시간은?" → **AOE + 임계 경로**

## AOV (Activity On Vertex)

**노드 = 활동**, **간선 = 선행 관계**.

```
A → B  (A가 끝나야 B 시작)
A → C
B → D
C → D
```

대학 수강 신청 (선수 과목), 빌드 시스템 (Makefile), 패키지 의존성 등.

## 위상 정렬 (Topological Sort)

DAG의 노드를 **선행 관계 순서**로 나열. 여러 답 가능.

```
DAG:    A → B → D
        A → C → D

가능한 정렬:
- A, B, C, D
- A, C, B, D
```

**조건**: 사이클 없어야 (cycle 있으면 위상 정렬 불가).

### 두 알고리즘

| | 방법 | 자료구조 |
| --- | --- | --- |
| **Kahn (BFS류)** | 진입 차수 0인 노드부터 제거 | 큐 |
| **DFS** | DFS 후 finish time 역순 | 스택 (재귀) |

### Kahn 알고리즘 — C++

```cpp
#include <queue>
#include <vector>

std::vector<int> topologicalSort(int V, const std::vector<std::vector<int>>& adj) {
    std::vector<int> inDegree(V, 0);
    for (int u = 0; u < V; ++u)
        for (int v : adj[u]) ++inDegree[v];

    std::queue<int> q;
    for (int u = 0; u < V; ++u)
        if (inDegree[u] == 0) q.push(u);

    std::vector<int> result;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        result.push_back(u);

        for (int v : adj[u]) {
            if (--inDegree[v] == 0) q.push(v);
        }
    }

    if ((int)result.size() != V) {
        // 사이클 존재
        return {};
    }
    return result;
}
```

**시간**: O(V + E).

### DFS 기반 — C++

```cpp
void dfsTopo(int u, const std::vector<std::vector<int>>& adj,
             std::vector<bool>& visited, std::stack<int>& finishStack) {
    visited[u] = true;
    for (int v : adj[u])
        if (!visited[v]) dfsTopo(v, adj, visited, finishStack);
    finishStack.push(u);   // ◄── 재귀 끝날 때 push (finish time)
}

std::vector<int> topologicalSortDFS(int V, const std::vector<std::vector<int>>& adj) {
    std::vector<bool> visited(V, false);
    std::stack<int> finishStack;

    for (int u = 0; u < V; ++u)
        if (!visited[u]) dfsTopo(u, adj, visited, finishStack);

    std::vector<int> result;
    while (!finishStack.empty()) {
        result.push_back(finishStack.top());
        finishStack.pop();
    }
    return result;
}
```

`finishStack` 역순 = 위상 정렬.

### C 구현 — Kahn

```c
int adj[MAX_V][MAX_V];
int adj_size[MAX_V];
int in_degree[MAX_V];

void topological_sort(int V) {
    int queue[MAX_V], front = 0, rear = 0;

    for (int u = 0; u < V; ++u) in_degree[u] = 0;
    for (int u = 0; u < V; ++u)
        for (int i = 0; i < adj_size[u]; ++i)
            in_degree[adj[u][i]]++;

    for (int u = 0; u < V; ++u)
        if (in_degree[u] == 0) queue[rear++] = u;

    while (front < rear) {
        int u = queue[front++];
        printf("%d ", u);
        for (int i = 0; i < adj_size[u]; ++i) {
            int v = adj[u][i];
            if (--in_degree[v] == 0) queue[rear++] = v;
        }
    }
}
```

## AOE (Activity On Edge)

**노드 = 이벤트** (작업의 시작·종료 시점), **간선 = 활동** (가중치 = 소요 시간).

```
   A ──5──→ B ──3──→ D
   ↓ 2      ↓ 1      ↑ 4
   E ──6──→ C ───────┘
```

응용:
- **PERT 차트** — 프로젝트 관리
- **공정 일정** — 제조 라인
- **빌드 시간 분석** — 어떤 단계가 병목

## 임계 경로 (Critical Path)

시작에서 종료까지의 **가장 긴 경로**. 이 길이가 **프로젝트 최단 완료 시간**.

→ 임계 경로 위 활동은 **지연 불가** — 단 1초만 늦어도 전체 지연.

### 알고리즘

1. **위상 정렬**
2. 각 노드의 **earliest event time** 계산 (위상 순서대로)
3. 각 노드의 **latest event time** 계산 (역위상 순서)
4. earliest = latest 인 활동들이 임계 경로

### C++ 구현

```cpp
struct AOEEdge { int v, w; };

void criticalPath(int V, const std::vector<std::vector<AOEEdge>>& adj) {
    auto topo = topologicalSort(V, /* ... */);

    std::vector<int> earliest(V, 0);
    for (int u : topo)
        for (const auto& [v, w] : adj[u])
            earliest[v] = std::max(earliest[v], earliest[u] + w);

    int projectTime = *std::max_element(earliest.begin(), earliest.end());

    std::vector<int> latest(V, projectTime);
    for (int i = topo.size() - 1; i >= 0; --i) {
        int u = topo[i];
        for (const auto& [v, w] : adj[u])
            latest[u] = std::min(latest[u], latest[v] - w);
    }

    // 임계 활동: earliest[u] + w == latest[v] && earliest[u] == latest[u]
    std::cout << "임계 경로 활동:\n";
    for (int u = 0; u < V; ++u)
        for (const auto& [v, w] : adj[u])
            if (earliest[u] + w == latest[v] && earliest[u] == latest[u])
                std::cout << u << " -> " << v << "\n";
}
```

## 트레이드오프 — 한눈에

| 차원 | AOV / AOE |
| --- | --- |
| 위상 정렬 | ✅ O(V+E) |
| 임계 경로 | ✅ O(V+E) |
| 사이클 검출 (DAG 검증) | ✅ 위상 정렬 불가 = 사이클 |
| 동적 변경 | ⚠️ 매번 다시 계산 |

## 실제 사례

- **Make / Bazel / Ninja** — 빌드 의존성 (위상 정렬)
- **Spreadsheet 셀 재계산 순서**
- **태스크 스케줄러** (e.g., Airflow DAG)
- **PERT 차트** — 프로젝트 일정
- **컴파일러 명령어 의존성 분석**

## 다음

- [단순 정렬 (Bubble, Selection, Insertion)](/blog/programming/data-structures-and-algorithms/item19-simple-sort)
