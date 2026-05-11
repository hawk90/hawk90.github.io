---
title: "DSA 39: 자료구조 선택 가이드 — 어떤 상황에 무엇을"
date: 2026-03-11T12:00:00
description: "결정 트리로 빠르게 선택 — 임의 접근, 정렬, 탐색, 우선순위, 키-값."
tags: [Data Structure, Decision Tree, Guide]
series: "Data Structures and Algorithms"
seriesOrder: 39
draft: false
---

## 한 줄 요약

> **"질문 4가지면 답 나옴"** — 정렬? / 키-값? / 임의 접근? / 빈번한 작업.

## 결정 트리

<img src="/images/blog/dsa/diagrams/item39-selection-guide.svg" alt="자료구조 선택 가이드" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 시간 복잡도 표

| 자료구조 | 검색 | 삽입 | 삭제 | 임의 접근 | 정렬 |
| --- | --- | --- | --- | --- | --- |
| `vector` | O(n) (sorted: O(log)) | end O(1) amortized | O(n) | **O(1)** | 수동 sort |
| `deque` | O(n) | 양 끝 O(1) | O(n) | O(1) | 수동 |
| `list` | O(n) | O(1) | O(1) (iterator) | O(n) | 자체 |
| `set` / `map` | O(log n) | O(log n) | O(log n) | — | **자동** |
| `unordered_set/map` | **O(1) avg** | O(1) avg | O(1) avg | — | — |
| `priority_queue` | top O(1), find O(n) | O(log n) | top O(log n) | — | — |
| `stack/queue` | top/front O(1) | O(1) | O(1) | — | — |
| `array` | O(n) | — | — | O(1) | 수동 |

## 사용 사례별 추천

### "친구 목록"

- 정렬 필요 없음, 빠른 lookup → **`unordered_set<UserID>`**
- 정렬 필요 (UI 순서) → **`set<UserID>`** 또는 vector + sort

### "방문자 카운트"

- 키 → 카운트 → **`unordered_map<IP, int>`**
- 메모리 빡빡 / 근사 OK → **HyperLogLog**

### "최근 본 항목 LRU 캐시"

- **`list` + `unordered_map`** — list로 순서, map으로 O(1) lookup
- 또는 표준 라이브러리 LRU 라이브러리

### "이벤트 시뮬레이션 / 작업 스케줄러"

- 시간 우선순위 → **`priority_queue<Event>`**

### "DFS / BFS"

- DFS → **`stack`** (또는 재귀)
- BFS → **`queue`**

### "텍스트 자동 완성"

- 접두사 검색 → **Trie** (item 29)
- 단순 단어 → **`set`** + `lower_bound` 도 가능

### "DB 인덱스"

- 디스크 → **B+ Tree** (item 28)
- 메모리 → **RB tree** (`std::map`)

### "그래프"

- Sparse → **인접 리스트** (`vector<vector<int>>`)
- Dense → **인접 행렬** (`vector<vector<int>>` 2D)
- 가중치 → `vector<vector<pair<int,int>>>`

### "범위 합 (range sum)"

- 정적 → **prefix sum 배열**
- 동적 (업데이트) → **Fenwick Tree (BIT)** 또는 **Segment Tree**

### "k번째 큰 / 작은"

- 한 번 → **Quickselect** (`std::nth_element`)
- 스트림 → **min-heap (k 크기) 유지**

### "동시 (멀티스레드) 큐"

- mutex + condition_variable + `queue` (단순)
- 고성능 → **lock-free queue** (Boost.Lockfree, moodycamel)

## 흔한 안티패턴

| 패턴 | 더 좋은 선택 |
| --- | --- |
| `list`로 무지성 시작 | `vector` 먼저 시도 |
| `map[key]` 존재 검사 | `find(key) != end()` |
| `vector::erase` 중간 빈번 | `list` 또는 swap-with-last |
| 매번 `vector` 정렬 | 정렬 유지면 `set` 또는 `lower_bound` 삽입 |
| 큰 객체 `vector<T>` | `vector<unique_ptr<T>>` 또는 SoA |

## 메모리 vs 속도

| 빠름 | 메모리 |
| --- | --- |
| `unordered_map` (open addressing) | 작음 (체이닝보다) |
| `flat_hash_map` (Abseil) | 더 작음 |
| Bloom filter | 매우 작음 (false positive 감수) |

## 빠른 결정 카드

```
필요한 것              →  자료구조

정수 빠른 lookup        →  unordered_map / unordered_set
문자열 빠른 lookup       →  unordered_map<string, ...>
정렬된 컬렉션            →  set / map
top 우선순위             →  priority_queue
FIFO                   →  queue
LIFO                   →  stack
배열                   →  vector (default)
양쪽 끝 큐              →  deque
중간 삽입 빈번 (드뭄)    →  list
고정 크기 배열           →  array
키 접두사 검색           →  Trie
union/find             →  DisjointSet
범위 query (정적)        →  prefix sum
범위 query (동적)        →  Fenwick / Segment tree
근사 멤버십              →  Bloom filter
근사 카운트              →  HyperLogLog
근사 빈도                →  Count-Min Sketch
디스크 인덱스            →  B-tree / B+tree
빈번한 그래프 표현        →  인접 리스트
```

## 핵심 원칙

1. **default는 `vector`** — 90%는 충분
2. **정렬 필요하면 `set/map`** — RB tree, O(log n) 보장
3. **빠른 lookup 정렬 X** → `unordered_map`
4. **측정 후 최적화** — 추측 X
5. **표준 라이브러리 먼저** — 직접 구현 X

## 관련 글

- [모던 C++ 컨테이너](/blog/programming/data-structures-and-algorithms/item36-modern-cpp-containers) — 컨테이너별 깊이
- [캐시 친화](/blog/programming/data-structures-and-algorithms/item37-cache-friendly) — 실측 성능
- [전체 overview](/blog/programming/data-structures-and-algorithms/item40-series-overview) — 시리즈 마무리
