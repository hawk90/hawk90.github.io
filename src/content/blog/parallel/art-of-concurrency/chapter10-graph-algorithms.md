---
title: "Ch 10: Graph Algorithms"
date: 2025-05-20T10:00:00
description: "병렬 그래프 알고리즘 — BFS, DFS, 최단 경로, 연결 요소"
series: "The Art of Concurrency"
seriesOrder: 10
tags: [concurrency, graph, bfs, dfs, shortest-path, connected-components]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 그래프 알고리즘의 병렬화

**그래프 문제는 병렬화가 까다롭다**. 불규칙한 메모리 접근과 의존성 때문.

```
그래프 표현:

인접 리스트 (희소 그래프):
0: [1, 2]
1: [0, 2, 3]
2: [0, 1, 3]
3: [1, 2]

인접 행렬 (밀집 그래프):
  0 1 2 3
0 0 1 1 0
1 1 0 1 1
2 1 1 0 1
3 0 1 1 0
```

**병렬화 도전**:

| 도전 | 설명 |
|------|------|
| 불규칙 접근 | 이웃이 메모리에 흩어짐 |
| 의존성 | 방문 여부 확인 필요 |
| 부하 불균형 | 정점별 이웃 수 차이 |
| 동기화 | 레벨/상태 업데이트 |

---

## 병렬 BFS

**레벨별 탐색**으로 자연스러운 병렬 경계.

### 레벨 동기 BFS

```
순차 BFS:

bfs(G, source):
    visited[source] = true
    queue.push(source)

    while queue.not_empty():
        u = queue.pop()
        for v in G.neighbors(u):
            if not visited[v]:
                visited[v] = true
                queue.push(v)
```

```
레벨 동기 병렬 BFS:

level_sync_bfs(G, source):
    visited[source] = true
    current_frontier = [source]
    level = 0

    while current_frontier.not_empty():
        next_frontier = []

        // 현재 프런티어 병렬 처리
        parallel_for u in current_frontier:
            for v in G.neighbors(u):
                // 원자적 업데이트
                if atomic_CAS(visited[v], false, true):
                    next_frontier.append(v)

        current_frontier = next_frontier
        level++
```

```
시각화 (레벨별):

Source: 0
레벨 0: [0]
        │
        ▼
레벨 1: [1, 2]      ← 병렬 처리
        │
        ▼
레벨 2: [3, 4, 5]   ← 병렬 처리
        │
        ▼
레벨 3: [6, 7]      ← 병렬 처리
```

**동기화 필요성**:

```
문제: 같은 정점이 여러 번 방문될 수 있음

예:
정점 1과 2가 모두 정점 5를 이웃으로 가짐

Thread A: 정점 1 처리 → 정점 5 발견
Thread B: 정점 2 처리 → 정점 5 발견

동시에 visited[5] = true 시도

해결: Compare-And-Swap (CAS)
if (atomic_CAS(&visited[v], false, true)) {
    // 이 스레드만 v를 프런티어에 추가
    next_frontier.append(v);
}
```

### 프런티어 기반 접근

**프런티어 자료구조**가 성능에 중요.

```
선택지:

1. 배열 + 인덱스:
   - 프런티어 = 배열
   - next_index = 원자 카운터
   - 장점: 단순
   - 단점: 크기 예측 필요

2. 비트맵:
   - 비트 단위로 방문 표시
   - 장점: 메모리 효율
   - 단점: 비트 조작 오버헤드

3. Bag (병렬 백):
   - 무작위 삽입/추출
   - 장점: 락 프리 가능
   - 단점: 순서 보장 안 됨
```

```
비트맵 기반 프런티어:

bitmap_bfs(G, source):
    current = new Bitmap(V)
    next = new Bitmap(V)
    current.set(source)

    while current.any_set():
        // 비트 단위 병렬 처리
        parallel_for word_idx = 0 to V/64:
            word = current.words[word_idx]
            while word != 0:
                bit = lowest_set_bit(word)
                u = word_idx * 64 + bit

                for v in G.neighbors(u):
                    // 원자적 비트 설정
                    atomic_or(&next.words[v/64], 1 << (v%64))

                word &= (word - 1)  // 처리한 비트 제거

        swap(current, next)
        next.clear()
```

**최적화 전략**:

```
방향 최적화 (Direction-Optimizing):

관찰:
- 프런티어가 작을 때: 바깥으로 확장 (Top-Down)
- 프런티어가 클 때: 안쪽에서 검사 (Bottom-Up)

Top-Down:
for u in frontier:
    for v in out_neighbors(u):
        if not visited[v]: ...

Bottom-Up:
for v in not_visited:
    for u in in_neighbors(v):
        if u in frontier:
            visit(v)
            break

전환 기준:
if frontier_size > threshold * num_edges:
    switch to bottom-up
```

---

## 병렬 DFS

**DFS는 BFS보다 병렬화하기 어렵다**.

### 도전과 한계

```
순차 DFS:

dfs(G, u, visited):
    visited[u] = true
    for v in G.neighbors(u):
        if not visited[v]:
            dfs(G, v, visited)

문제:
- 각 재귀 호출이 이전 방문 정보에 의존
- 스택 기반 → 순차적
```

```
병렬화 시도:

parallel_dfs(G, u, visited):
    visited[u] = true
    children = []
    for v in G.neighbors(u):
        if atomic_CAS(visited[v], false, true):
            children.append(v)

    // 자식들을 병렬로 탐색
    parallel_for c in children:
        parallel_dfs(G, c, visited)

문제:
- DFS 순서가 깨짐
- 깊이 우선 성질 상실
- 스패닝 트리 구조 달라짐
```

**실용적 접근**:

```
1. 서브그래프 분할:
   - 그래프를 분할
   - 각 파티션에서 독립 DFS
   - 경계에서 동기화

2. 부분 순서 유지:
   - 같은 깊이의 분기만 병렬
   - 깊이 우선 성질 부분 유지

3. 여러 소스 병렬:
   - 연결 요소별 소스
   - 각 요소 독립 DFS
```

```
서브트리 병렬 DFS:

subtree_parallel_dfs(G, root):
    visited[root] = true
    subtree_roots = []

    for v in G.neighbors(root):
        if atomic_CAS(visited[v], false, true):
            subtree_roots.append(v)

    // 서브트리들을 병렬로
    parallel_for r in subtree_roots:
        sequential_dfs(G, r, visited)

장점: 독립적 서브트리는 병렬
단점: 루트 근처에서만 병렬성
```

---

## 병렬 최단 경로

### Dijkstra 병렬화

**Dijkstra는 본질적으로 순차적**이지만 일부 병렬화 가능.

```
순차 Dijkstra:

dijkstra(G, source):
    dist[source] = 0
    PQ.insert(source, 0)

    while PQ.not_empty():
        u = PQ.extract_min()

        for v in G.neighbors(u):
            new_dist = dist[u] + weight(u, v)
            if new_dist < dist[v]:
                dist[v] = new_dist
                PQ.decrease_key(v, new_dist)

병렬화 어려움:
- extract_min이 전역 동기화점
- 각 반복이 이전 결과에 의존
```

**병렬화 접근**:

```
1. 이웃 완화 병렬화:

parallel_relax(u, neighbors):
    parallel_for v in neighbors:
        new_dist = dist[u] + weight(u, v)
        atomic_min(&dist[v], new_dist)

제한: 이웃 수에 의존, 희소 그래프에서 효과 적음

2. 배치 처리:

batch_dijkstra(G, source):
    // 여러 정점을 한 번에 처리
    while not done:
        batch = extract_k_min(PQ, k)

        parallel_for u in batch:
            for v in G.neighbors(u):
                relax(u, v)

문제: 최단 경로 보장 깨질 수 있음
```

### Delta-stepping

**Dijkstra의 병렬 버전**으로 설계된 알고리즘.

```
아이디어:
거리를 δ 단위 버킷으로 나눔
같은 버킷의 정점들은 거의 병렬로 처리 가능

버킷:
B[0]: dist in [0, δ)
B[1]: dist in [δ, 2δ)
B[2]: dist in [2δ, 3δ)
...
```

```
delta_stepping(G, source, delta):
    dist[source] = 0
    B[0].insert(source)
    i = 0

    while any bucket non-empty:
        // 현재 버킷 처리
        S = empty set

        while B[i].not_empty():
            // 가벼운 간선 (weight < δ) 완화
            Req = []
            parallel_for v in B[i]:
                for (v, w) in light_edges(v):
                    Req.append((w, dist[v] + weight(v,w)))

            B[i].clear()

            parallel_for (w, d) in Req:
                relax(w, d)  // 같은 버킷에 다시 넣을 수도

        S.add_all_relaxed()

        // 무거운 간선 (weight ≥ δ) 완화
        parallel_for v in S:
            for (v, w) in heavy_edges(v):
                relax(w, dist[v] + weight(v,w))

        // 다음 비어있지 않은 버킷으로
        i = find_next_nonempty_bucket()
```

```
복잡도:
- 최악: O(V × 최대 버킷 방문 + E)
- δ 선택이 중요:
  - 작은 δ: 많은 버킷, 적은 병렬성
  - 큰 δ: 적은 버킷, 많은 반복

권장: δ = 평균 간선 가중치 / 평균 차수
```

---

## 연결 요소

**병렬 Union-Find**로 효율적인 연결 요소 찾기.

```
문제: 무방향 그래프의 연결 요소 식별

순차 Union-Find:
for (u, v) in edges:
    union(find(u), find(v))

각 정점의 대표자가 같으면 같은 요소
```

```
병렬 Union-Find:

초기화:
parent[i] = i for all i (자기 자신이 대표)

parallel_connected_components(G):
    // 모든 간선 병렬 처리
    parallel_for (u, v) in G.edges:
        // 락 프리 유니온
        while true:
            pu = find(u)
            pv = find(v)

            if pu == pv:
                break  // 이미 같은 요소

            // 작은 번호가 대표가 되도록
            if pu > pv:
                swap(pu, pv)

            // CAS로 유니온
            if atomic_CAS(&parent[pv], pv, pu):
                break  // 성공

            // 실패하면 다시 시도
```

```
Find 연산 (경로 압축):

find(x):
    root = x
    while parent[root] != root:
        root = parent[root]

    // 경로 압축 (병렬에서 주의)
    while parent[x] != root:
        next = parent[x]
        atomic_CAS(&parent[x], next, root)  // 실패해도 OK
        x = next

    return root
```

**레이블 전파**:

```
아이디어:
각 정점이 이웃의 레이블 중 최소값으로 업데이트

label_propagation(G):
    label[v] = v for all v

    changed = true
    while changed:
        changed = false

        parallel_for v in G.vertices:
            min_label = label[v]
            for u in G.neighbors(v):
                min_label = min(min_label, label[u])

            if min_label < label[v]:
                label[v] = min_label
                changed = true

수렴 후: 같은 레이블 = 같은 연결 요소
```

---

## 정리

- **병렬 BFS**: 레벨 동기, 프런티어 기반, 방향 최적화
- **병렬 DFS**: 어려움, 서브트리 병렬이 실용적
- **Delta-stepping**: Dijkstra의 병렬 버전
- **연결 요소**: 병렬 Union-Find, 레이블 전파

---

## 핵심 비교

| 알고리즘 | 병렬화 수준 | 핵심 기법 | 도전 |
|----------|-------------|-----------|------|
| BFS | 높음 | 레벨 동기 | 동기화 오버헤드 |
| DFS | 낮음 | 서브트리 병렬 | 순서 의존성 |
| Dijkstra | 중간 | Delta-stepping | 전역 최소값 |
| 연결 요소 | 높음 | 병렬 Union-Find | CAS 경합 |

| 기법 | 장점 | 단점 |
|------|------|------|
| 레벨 동기 | 자연스러운 경계 | 배리어 오버헤드 |
| 방향 최적화 | 큰 프런티어 효율 | 전환 오버헤드 |
| Delta-stepping | 병렬성 증가 | δ 선택 어려움 |
| 레이블 전파 | 단순 | 수렴 시간 가변 |

---

## 관련 항목

- [Ch 9: Searching](/blog/parallel/art-of-concurrency/chapter09-searching) — BFS/DFS 기초
- [Ch 6: Parallel Sum and Prefix Scan](/blog/parallel/art-of-concurrency/chapter06-parallel-sum-prefix) — 프런티어 인덱싱
- [Ch 5: Threading Libraries](/blog/parallel/art-of-concurrency/chapter05-threading-libraries) — 원자 연산
- [Tanenbaum Ch 6: Coordination](/blog/parallel/distributed-systems-tanenbaum/chapter06-coordination) — 분산 그래프 알고리즘
