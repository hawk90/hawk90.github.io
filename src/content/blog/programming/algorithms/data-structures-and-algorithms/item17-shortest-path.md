---
title: "DSA 17: 최단 경로 — Dijkstra, Bellman-Ford, Floyd-Warshall"
date: 2026-03-04T12:00:00
description: "한 노드에서 / 모든 쌍 사이의 최단 경로 세 알고리즘."
tags: [Data Structure, Algorithm, Graph, Shortest Path]
series: "Data Structures and Algorithms"
seriesOrder: 17
draft: false
---

## 한 줄 요약

> **"A에서 B로 가는 가장 싼 길"** — 음수 간선 유무·단일 vs 전쌍에 따라 세 알고리즘.

## 어떤 문제를 푸는가

- **내비게이션** — 가장 빠른 길
- **네트워크 라우팅** — 가장 적은 latency
- **게임 AI / 길찾기** — A*의 토대
- **통화 환전** — 최저 비용 경로
- **dependency 자동 해결** — DAG 위의 최단 (or 최장) 경로

## 세 알고리즘 비교

| 알고리즘 | 문제 | 음수 간선 | 시간 |
| --- | --- | --- | --- |
| **Dijkstra** | 단일 출발 → 모든 곳 | ❌ 안 됨 | O((V+E) log V) |
| **Bellman-Ford** | 단일 출발 → 모든 곳 | ✅ OK (음수 사이클 검출) | O(VE) |
| **Floyd-Warshall** | 모든 쌍 | ✅ OK | O(V³) |

## 1. Dijkstra — 음수 없는 경우 (가장 빠름)

### 직관

매번 **현재까지 가장 짧은 거리**의 노드 선택 → 그곳을 거쳐 이웃의 거리 갱신.

**핵심**: 음수 간선 없으면 한 번 확정된 노드는 다시 갱신 안 됨.

### C++ 구현

```cpp
#include <queue>
#include <vector>
#include <limits>

std::vector<int> dijkstra(int V, int src,
                          const std::vector<std::vector<std::pair<int, int>>>& adj) {
    std::vector<int> dist(V, INT_MAX);
    dist[src] = 0;

    // (현재 거리, 노드)
    std::priority_queue<std::pair<int, int>,
                        std::vector<std::pair<int, int>>,
                        std::greater<>> pq;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;       // 더 짧은 거리 이미 처리됨

        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
```

**시간**: O((V + E) log V) — heap 사용.

### ⚠️ 음수 간선 안 됨

```
A → B: 1
A → C: 4
B → C: -10
```

Dijkstra: A 처리 후 C 거리 4로 확정 → B를 거치는 -9 길을 놓침.

→ 음수면 **Bellman-Ford**.

## 2. Bellman-Ford — 음수 OK + 사이클 검출

### 직관

V-1번 **모든 간선을 완화**(relax) → 모든 최단 경로 발견.

V번째에 또 변화하면 → **음수 사이클** 존재.

### C++ 구현

```cpp
struct Edge { int u, v, w; };

std::vector<int> bellmanFord(int V, int src, const std::vector<Edge>& edges) {
    std::vector<int> dist(V, INT_MAX);
    dist[src] = 0;

    for (int i = 0; i < V - 1; ++i) {
        for (const Edge& e : edges) {
            if (dist[e.u] != INT_MAX && dist[e.u] + e.w < dist[e.v])
                dist[e.v] = dist[e.u] + e.w;
        }
    }

    // 음수 사이클 검사
    for (const Edge& e : edges) {
        if (dist[e.u] != INT_MAX && dist[e.u] + e.w < dist[e.v]) {
            std::cerr << "음수 사이클 존재!\n";
            return {};
        }
    }
    return dist;
}
```

**시간**: O(VE) — Dijkstra보다 느림.

### 응용 — 통화 차익 검출

`A → B → C → A` 경로의 가중치 합이 음수면 무한히 돈 벌 수 있음 (가상). 통화 거래소에서 차익 거래 기회 검출.

## 3. Floyd-Warshall — 모든 쌍

### 직관

DP. `dist[i][j]` = i에서 j로의 최단 거리.

<img src="/images/blog/dsa/diagrams/item17-floyd-warshall.svg" alt="Floyd-Warshall DP 행렬 진화" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

```
for k in 0..V-1:           # 중간 노드로 k 허용
    for i in 0..V-1:
        for j in 0..V-1:
            dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
```

### C++ 구현

```cpp
std::vector<std::vector<int>> floydWarshall(int V,
                                            const std::vector<std::vector<int>>& weight) {
    auto dist = weight;   // 초기: 직접 간선 가중치 (또는 INF)

    for (int k = 0; k < V; ++k)
        for (int i = 0; i < V; ++i)
            for (int j = 0; j < V; ++j)
                if (dist[i][k] != INT_MAX && dist[k][j] != INT_MAX
                    && dist[i][k] + dist[k][j] < dist[i][j])
                    dist[i][j] = dist[i][k] + dist[k][j];

    return dist;
}
```

**시간**: O(V³). 공간 O(V²). 코드 3줄 — 가장 단순.

### 음수 사이클

`dist[i][i] < 0` 이면 노드 i가 음수 사이클에 속함.

## C 구현 — Dijkstra (인접 행렬, 간략)

```c
#define INF INT_MAX

int dist[MAX_V];
int visited[MAX_V];
int graph[MAX_V][MAX_V];

void dijkstra(int V, int src) {
    for (int i = 0; i < V; ++i) {
        dist[i] = INF;
        visited[i] = 0;
    }
    dist[src] = 0;

    for (int count = 0; count < V; ++count) {
        // 가장 가까운 미방문 노드
        int u = -1, minDist = INF;
        for (int i = 0; i < V; ++i) {
            if (!visited[i] && dist[i] < minDist) {
                u = i; minDist = dist[i];
            }
        }
        if (u == -1) break;
        visited[u] = 1;

        for (int v = 0; v < V; ++v) {
            if (!visited[v] && graph[u][v] != INF
                && dist[u] + graph[u][v] < dist[v])
                dist[v] = dist[u] + graph[u][v];
        }
    }
}
```

O(V²) — heap 없는 단순 구현.

## 시간 복잡도 비교

| 알고리즘 | 시간 | 메모리 | 음수 |
| --- | --- | --- | --- |
| **Dijkstra (heap)** | O((V+E) log V) | O(V) | ❌ |
| **Dijkstra (배열)** | O(V²) | O(V) | ❌ |
| **Bellman-Ford** | O(VE) | O(V) | ✅ |
| **Floyd-Warshall** | O(V³) | O(V²) | ✅ |
| **Johnson** (생략) | O(V² log V + VE) | O(V²) | ✅ |

## 어느 걸 언제?

- **양수 가중치 + 단일 출발** → Dijkstra
- **음수 가능 + 단일 출발** → Bellman-Ford
- **모든 쌍 + 작은 그래프** (V ≤ 400~500) → Floyd-Warshall
- **모든 쌍 + 큰 sparse graph** → V번 Dijkstra (또는 Johnson)

## 트레이드오프 — 한눈에

| 차원 | Dijkstra |
| --- | --- |
| 빠름 (음수 없음) | ✅ |
| 음수 가중치 | ❌ |
| heap 필요 (O(log V)) | ⚠️ |

| 차원 | Floyd-Warshall |
| --- | --- |
| 코드 단순 (3중 루프) | ✅ |
| 모든 쌍 | ✅ |
| O(V³) | ❌ 큰 그래프 X |
| 음수 OK | ✅ |

## 실제 사례

- **OSPF / IS-IS 라우팅** — Dijkstra 변형
- **RIP** — Bellman-Ford 변형
- **자동차 내비** — Dijkstra + A*
- **통화 차익** — Bellman-Ford
- **소셜 거리** — Floyd-Warshall (작은 그룹)

## 다음

- [AOV/AOE 네트워크](/blog/programming/algorithms/data-structures-and-algorithms/item18-aov-aoe-network)
