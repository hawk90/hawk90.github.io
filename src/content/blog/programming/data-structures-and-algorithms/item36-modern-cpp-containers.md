---
title: "DSA 36: 모던 C++ 컨테이너 활용 가이드"
date: 2026-06-10T12:00:00
description: "vector, deque, list, map, unordered_map, set — 언제 무엇을."
tags: [C++, STL, Container]
series: "Data Structures and Algorithms"
seriesOrder: 36
draft: false
---

## 한 줄 요약

> **"모던 C++에선 직접 자료구조 X — STL을 잘 쓰는 게 핵심"** — 컨테이너 선택 가이드.

## STL 컨테이너 한눈에

| 컨테이너 | 내부 | 임의 접근 | 끝 삽입 | 중간 삽입 | 검색 | 정렬 |
| --- | --- | --- | --- | --- | --- | --- |
| `vector` | 동적 배열 | O(1) | amortized O(1) | O(n) | O(n) (O(log) 정렬 시) | 별도 sort |
| `deque` | 블록 배열 | O(1) | amortized O(1) | O(n) | O(n) | — |
| `list` | doubly linked | O(n) | O(1) | O(1) | O(n) | 자체 sort |
| `forward_list` | singly linked | O(n) | O(n) | O(1) (after) | O(n) | 자체 sort |
| `array` | 고정 배열 | O(1) | — | — | O(n) | — |
| `set` / `map` | RB 트리 | — | — | O(log n) | O(log n) | 자동 정렬 |
| `multiset/multimap` | RB 트리 | — | — | O(log n) | O(log n) | 자동 정렬 (중복 OK) |
| `unordered_set/map` | 해시 | — | — | O(1) avg | O(1) avg | — |
| `priority_queue` | heap | — | O(log n) | — | top O(1) | — |
| `stack` / `queue` | adapter | — | O(1) | — | — | — |

## 의사결정 트리 — 어떤 컨테이너?

<img src="/images/blog/dsa/diagrams/item36-container-flowchart.svg" alt="STL 컨테이너 선택 흐름도" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 1. `vector` — 거의 항상 default

```cpp
std::vector<int> v;
v.push_back(1);
v.push_back(2);
v[0] = 3;          // O(1) 임의 접근
v.size();
v.reserve(1000);   // 미리 용량 확보 → 재할당 없음
```

### 언제

- 거의 모든 상황의 default
- 빈번한 끝 삽입
- 임의 접근
- 캐시 친화 필요

### 함정

- 중간 삽입은 O(n) — 자주면 deque 또는 list
- iterator/reference invalidation — push_back 시 재할당 가능

## 2. `deque` — 양 끝 모두 빈번

```cpp
std::deque<int> d;
d.push_back(1);
d.push_front(0);
d[0];   // O(1) — vector보다 약간 느림
```

### 언제

- 양쪽 끝 빈번 삽입/삭제 (큐 + 스택)
- 큰 객체 + 재할당 비용 회피 — `vector`는 모두 한 블록 복사 (deque은 블록 단위)

### `std::queue`, `std::stack`의 기본 컨테이너

```cpp
std::queue<int> q;   // 내부 deque
std::stack<int> s;   // 내부 deque
```

## 3. `list` — 거의 안 씀

```cpp
std::list<int> l;
l.push_back(1);
auto it = l.begin();
l.insert(it, 99);   // O(1) — iterator 위치
```

### 언제

- 빈번한 중간 삽입·삭제 + iterator 안정성 필요
- splice (다른 list와 결합) 빈번

> ⚠️ **모던 C++에선 vector가 거의 항상 빠름** — 캐시 친화. 진짜 필요한 케이스만.

## 4. `set` / `map` — 정렬된 검색

```cpp
std::set<int> s = {3, 1, 4, 1, 5, 9, 2, 6};   // 자동 정렬 + 중복 제거
for (int x : s) std::cout << x << " ";          // 1 2 3 4 5 6 9

std::map<std::string, int> scores;
scores["Alice"] = 90;
scores["Bob"] = 85;
auto it = scores.find("Alice");
if (it != scores.end()) std::cout << it->second;
```

### 언제

- 정렬된 순회 필요
- 범위 검색 (`lower_bound`, `upper_bound`)
- 검색·삽입·삭제 모두 O(log n) 보장

### 내부

Red-Black 트리. 노드마다 포인터·color 메타데이터 → 메모리 多.

## 5. `unordered_set` / `unordered_map` — 평균 O(1) 검색

```cpp
std::unordered_map<std::string, int> m;
m["Alice"] = 90;
auto it = m.find("Alice");   // O(1) avg
```

### 언제

- 가장 빈번한 검색 (정렬 불필요)
- 키가 hashable

### 함정

- 정렬된 순회 ❌
- worst-case O(n) — 악의적 입력 / 나쁜 해시
- 사용자 정의 타입은 `std::hash` 특수화 필요

## 6. `priority_queue` — heap

```cpp
std::priority_queue<int> maxPq;    // max-heap (default)
std::priority_queue<int, std::vector<int>, std::greater<int>> minPq;

maxPq.push(3); maxPq.push(1); maxPq.push(5);
maxPq.top();   // 5
maxPq.pop();
```

## 7. `array` — 컴파일 타임 고정 크기

```cpp
std::array<int, 100> arr;   // 스택, 100개 int
arr.fill(0);
arr[0] = 1;
```

C 스타일 배열 + STL 인터페이스. 크기 고정.

## 모던 패턴 — `std::unordered_map`이 충분히 빠르지 않을 때

### Robin Hood Hashing / Open Addressing

표준 `unordered_map`은 chaining → 캐시 비친화. `absl::flat_hash_map` (Abseil), `boost::unordered_flat_map` 같은 open addressing 구현이 2~3배 빠른 경우 多.

```cpp
#include <absl/container/flat_hash_map.h>
absl::flat_hash_map<std::string, int> m;
```

### `std::pmr` (Polymorphic Memory Resource, C++17)

특정 자원에서 할당 — 임베디드, 게임에서 유용.

```cpp
#include <memory_resource>
std::pmr::monotonic_buffer_resource pool(1024);
std::pmr::vector<int> v(&pool);   // pool에서 할당
```

## 흔한 실수

### ⚠️ 1. `vector` 안에서 push_back 후 iterator 사용

```cpp
auto it = v.begin();
v.push_back(99);   // 재할당 가능
*it = 5;           // ❌ dangling
```

### ⚠️ 2. `unordered_map`에 사용자 정의 키 (`std::hash` 없음)

컴파일 에러 또는 잘못된 동작. `std::hash` 특수화 필수.

### ⚠️ 3. `list`를 무지성 사용

90%는 vector가 빠름. 진짜 빈번한 중간 삽입·삭제만 list.

### ⚠️ 4. `map[key]`가 키 없을 때 자동 삽입

```cpp
if (m["foo"] > 0) { ... }   // "foo" 없으면 0으로 삽입됨!
```

→ `find`로 확인:
```cpp
auto it = m.find("foo");
if (it != m.end() && it->second > 0) { ... }
```

## 기본 가이드

| 상황 | 추천 |
| --- | --- |
| 일반 배열 | `vector` |
| 양쪽 끝 큐 | `deque` (또는 `vector`로 fixed-size) |
| 정렬된 검색 | `set` / `map` |
| 빠른 검색 | `unordered_set` / `unordered_map` |
| top 우선순위 | `priority_queue` |
| 스택 / 큐 | `stack` / `queue` |
| 작은 고정 크기 | `array` |
| 진짜 list 필요 | `list` (드뭄) |

## 트레이드오프 — 한눈에

| 차원 | STL 컨테이너 |
| --- | --- |
| 검증된 구현 | ✅ |
| 캐시 친화 (vector) | ✅ |
| 일반화·범용 | ✅ |
| 핫패스 최적화 (특수 사용) | ⚠️ 외부 라이브러리 (Abseil 등) |

## 실제 사례

- **`std::vector`** — 거의 모든 동적 배열
- **`std::unordered_map`** — 모든 해시 기반 lookup
- **`std::set`** — 정렬된 컬렉션
- **`std::priority_queue`** — Dijkstra·시뮬레이션
- **Abseil flat_hash_map** — Google 코드베이스, 고성능 해시

## 다음

- [캐시 친화 자료구조](/blog/programming/data-structures-and-algorithms/item37-cache-friendly)
