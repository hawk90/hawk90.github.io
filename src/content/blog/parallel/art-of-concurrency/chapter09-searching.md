---
title: "Ch 9: Searching"
date: 2025-05-20T09:00:00
description: "병렬 검색 알고리즘 — 선형 검색, 이진 검색, 트리 검색"
series: "The Art of Concurrency"
seriesOrder: 9
tags: [concurrency, searching, parallel-search, binary-search, tree]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 검색의 병렬화

**검색은 정렬보다 병렬화하기 어렵다**. 본질적으로 순차적인 측면이 있기 때문.

```
검색 종류:

1. 선형 검색: O(N)
   - 데이터 분할로 병렬화 가능
   - 조기 종료 문제

2. 이진 검색: O(log N)
   - 이미 매우 빠름
   - 의존성으로 병렬화 어려움

3. 트리 검색: O(log N) ~ O(N)
   - 트리 구조에 따라 다름
   - 여러 쿼리 동시 처리 가능
```

---

## 병렬 선형 검색

**가장 직관적인 병렬화**: 데이터를 분할해 각 스레드가 담당.

### 데이터 분할

```
N개 원소, P개 스레드:

Thread 0: A[0 .. N/P - 1]
Thread 1: A[N/P .. 2N/P - 1]
...
Thread P-1: A[(P-1)N/P .. N-1]

각 스레드: 로컬 구간 선형 검색
발견 시: 결과 보고
```

```
의사코드:

parallel_linear_search(A, N, target, num_threads):
    found_index = -1  // 공유 변수
    found_flag = false

    parallel_for t = 0 to num_threads-1:
        start = t * (N / num_threads)
        end = (t + 1) * (N / num_threads)

        for i = start to end-1:
            if found_flag:  // 다른 스레드가 찾음
                break

            if A[i] == target:
                // 원자적으로 업데이트
                atomic_set(found_index, i)
                atomic_set(found_flag, true)
                break

    return found_index
```

```
복잡도:
- 순차: O(N)
- 병렬: O(N/P) 평균
- 최선: O(1) — 첫 원소에서 발견
- 최악: O(N/P) — 마지막 원소 또는 없음
```

### 조기 종료

**핵심 도전**: 한 스레드가 찾으면 다른 스레드도 멈춰야.

```
조기 종료 전략:

1. 플래그 폴링:
   if (found_flag) break;
   - 매 반복 검사
   - 오버헤드 있음

2. 취소 토큰:
   if (cancel_token.is_set()) return;
   - 플래그와 유사
   - 더 구조화된 접근

3. 스레드 취소:
   cancel_thread(other_threads);
   - OS 지원 필요
   - 복잡하고 위험
```

```
문제: 찾는 값이 없을 때

해결책:
1. 모든 스레드 완료 대기
2. 타임아웃 설정
3. 분할 크기 제한 후 반복
```

**복수 결과 처리**:

```
시나리오: 값이 여러 번 나타남

전략 1: 첫 번째만 반환
- 조기 종료
- 어떤 "첫 번째"인지 불확실

전략 2: 모든 위치 수집
- 각 스레드 로컬 리스트
- 마지막에 병합

전략 3: 특정 조건의 첫 번째
- 인덱스가 가장 작은 것
- 병렬 최소값 찾기 필요

parallel_find_all(A, N, target):
    results = thread_local list per thread

    parallel_for i = 0 to N-1:
        if A[i] == target:
            results[thread_id].append(i)

    return merge(results)
```

---

## 병렬 이진 검색

**이미 O(log N)**이므로 병렬화 이점이 적다.

### 한계와 기회

```
순차 이진 검색:

binary_search(A, N, target):
    lo = 0, hi = N - 1
    while lo <= hi:
        mid = (lo + hi) / 2
        if A[mid] == target:
            return mid
        else if A[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

시간: O(log N)
예: N = 10억 → ~30 비교
```

```
병렬화의 한계:

문제: 각 단계가 이전 결과에 의존
- mid 계산 → 비교 → lo/hi 결정 → 다음 mid
- 순차적 의존성 체인

1회 검색을 P배 빠르게? 어렵다.
```

**기회: 여러 검색 동시 실행**:

```
배치 검색:

입력: 정렬된 배열 A, 쿼리 Q[0..M-1]
출력: 각 쿼리의 결과

parallel_batch_search(A, N, Q, M):
    results = new array[M]

    parallel_for i = 0 to M-1:
        results[i] = binary_search(A, N, Q[i])

    return results

M개 검색, P 스레드:
- 순차: O(M log N)
- 병렬: O(M log N / P)
```

**기회: 검색 공간 분할**:

```
p-way 분할 검색:

아이디어: 한 번에 여러 분할점 검사

target 검색:
1. 배열을 P+1 구간으로 분할
2. P개 분할점과 병렬 비교
3. target이 속한 구간 결정
4. 해당 구간에서 재귀

예 (P=3):
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
         ↑        ↑         ↑
    분할점: A[3]=4, A[6]=7, A[9]=10

target = 8:
병렬 비교: 8>4, 8>7, 8<10
→ 구간 [7..9]에서 계속
```

```
복잡도 분석:

단계 수: log_{P+1}(N)
각 단계: P 비교 (병렬)

순차: O(log N)
P-way: O(log_{P+1}(N)) = O(log N / log(P+1))

개선 비율: log(P+1)
P=3: ~2배 깊이 감소
P=7: ~3배 깊이 감소

하지만: 각 단계의 병렬 비교 오버헤드
→ 작은 N에서는 손해
```

---

## 병렬 트리 검색

**트리 구조에서의 검색**: BFS vs DFS, 작업 분배.

### BFS vs DFS

```
BFS (너비 우선):
- 레벨별 탐색
- 각 레벨 내 노드들은 독립적
- 레벨 동기화 필요

       1
      ╱ ╲
     2   3       레벨 0: [1]
    ╱╲   ╱╲      레벨 1: [2, 3] 병렬
   4  5 6  7     레벨 2: [4, 5, 6, 7] 병렬
```

```
DFS (깊이 우선):
- 경로별 탐색
- 분기점에서 병렬화
- 작업 불균형 가능

       1
      ╱ ╲
     2   3
    ╱╲   ╱╲
   4  5 6  7

spawn: 2 서브트리
parallel: 3 서브트리
```

**비교**:

| 특성 | BFS | DFS |
|------|-----|-----|
| 메모리 | O(너비) — 넓은 트리에서 큼 | O(깊이) — 깊은 트리에서 작음 |
| 첫 발견 | 최단 경로 보장 | 경로에 따라 다름 |
| 병렬화 | 레벨 병렬 | 서브트리 병렬 |
| 동기화 | 레벨마다 배리어 | 분기점에서만 |

### 작업 분배

```
DFS 작업 스틸링:

문제: 트리가 불균형하면 스레드 간 작업 불균형

해결: 작업 스틸링 (Work Stealing)

Thread 0: 왼쪽 서브트리 탐색
Thread 1: 오른쪽 서브트리 탐색

Thread 1 끝남 → Thread 0의 작업 큐에서 훔침
```

```
작업 스틸링 구조:

각 스레드: deque (양방향 큐)

push_bottom(): 자기 작업 추가
pop_bottom(): 자기 작업 가져옴
pop_top(): 다른 스레드가 훔쳐감

work_stealing_search(root, target):
    my_deque.push(root)

    while not found:
        if my_deque.not_empty():
            node = my_deque.pop_bottom()
        else:
            // 다른 스레드에서 훔침
            node = steal_from_others()
            if node == null:
                break  // 모든 작업 완료

        if node.value == target:
            found = true
            return node

        for child in node.children:
            my_deque.push(child)
```

```
BFS 레벨 병렬:

parallel_bfs_search(root, target):
    current_level = [root]

    while current_level.not_empty():
        // 현재 레벨 병렬 검사
        found = parallel_for node in current_level:
            if node.value == target:
                return node

        if found:
            return found

        // 다음 레벨 생성
        next_level = []
        parallel_for node in current_level:
            for child in node.children:
                next_level.append(child)

        current_level = next_level

    return null
```

**특수 트리 구조**:

```
균형 이진 트리 (BST):
- 이진 검색과 유사
- O(log N) 깊이
- 병렬화 이점 적음

B-트리 / B+트리:
- 높은 분기 계수
- 각 노드에서 여러 키 검색 가능
- 디스크 I/O에 최적화

Trie (접두사 트리):
- 문자열 검색
- 각 문자 레벨 병렬화 가능
- 접두사 검색에 효율적
```

---

## 정리

- **병렬 선형 검색**: 데이터 분할, 조기 종료 중요
- **병렬 이진 검색**: 단일 검색은 이점 적음, 배치 검색 유효
- **병렬 트리 검색**: BFS는 레벨 병렬, DFS는 서브트리 병렬
- **작업 스틸링**: 불균형 트리에서 부하 균형

---

## 핵심 비교

| 알고리즘 | 순차 | 병렬 | 병렬화 전략 |
|----------|------|------|-------------|
| 선형 검색 | O(N) | O(N/P) | 데이터 분할 |
| 이진 검색 | O(log N) | O(log N) | 배치/P-way |
| BFS | O(V+E) | O((V+E)/P) | 레벨 병렬 |
| DFS | O(V+E) | O((V+E)/P) | 서브트리 병렬 |

| 문제 | 해결책 |
|------|--------|
| 조기 종료 | 플래그 폴링, 취소 토큰 |
| 복수 결과 | 로컬 리스트 + 병합 |
| 작업 불균형 | 작업 스틸링 |
| 의존성 | 배치 처리, P-way 분할 |

---

## 관련 항목

- [Ch 8: Sorting](/blog/parallel/art-of-concurrency/chapter08-sorting) — 정렬 후 검색
- [Ch 10: Graph Algorithms](/blog/parallel/art-of-concurrency/chapter10-graph-algorithms) — 그래프에서 BFS/DFS
- [Ch 5: Threading Libraries](/blog/parallel/art-of-concurrency/chapter05-threading-libraries) — 동기화 프리미티브
- [Ch 4: Eight Simple Rules](/blog/parallel/art-of-concurrency/chapter04-eight-rules) — 작업 분배 규칙
