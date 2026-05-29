---
title: "Part 5-04: btree_map — sorted, cache-friendly B-tree"
date: 2026-05-24T07:00:00
description: "Part 5-04: absl::btree_map — std::map(red-black tree)의 B-tree 대체, cache locality와 메모리 효율, sorted 컨테이너의 새 기준."
series: "Abseil Code Review"
seriesOrder: 30
tags: [cpp, abseil, container, btree, sorted]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::btree_map`은 sorted associative container를 **B-tree**로 구현한다. `std::map`의 red-black tree가 노드당 1 key + 좌우 child pointer를 강제하는 반면, B-tree 노드는 *여러 key*를 packed하게 들고 있어 cache line 활용도가 높다. 같은 key 수에서 lookup/insert가 빠르고 메모리도 절약된다.

## 동기

`std::map`의 표준 구현은 거의 항상 red-black tree다. 노드마다 *1 key + 2 child pointer + parent pointer + color bit*. 메모리 overhead가 크고, traversal마다 노드 jump → cache miss.

```text
RB-tree 노드 (대략 64-bit):
[key, value, left*, right*, parent*, color, padding]
overhead ≥ 32 bytes per key
```

B-tree는 다르다. 한 노드가 *수십 개 key*를 담는다. cache line(64B)에 여러 key가 들어간다.

```text
B-tree 노드 (256 bytes 기준):
[key, key, ..., key, child*, child*, ..., child*]
overhead per key: 노드 헤더 / N
```

Abseil의 `btree_map`은 노드 크기를 cache line의 배수에 맞춰 설계해 modern CPU에서 `std::map`보다 2~4배 빠른 lookup을 보인다.

두 자료구조의 차이를 그림으로 비교하면 다음과 같다.

![btree_map 노드 vs RB-tree](/images/blog/abseil/diagrams/part5-04-btree-map-node.svg)

## API와 사용법

```cpp
#include "absl/container/btree_map.h"

absl::btree_map<int, std::string> m;
m[1] = "one";
m[2] = "two";
m[3] = "three";

// 정렬된 순회
for (const auto& [k, v] : m) {
  // k는 오름차순
}

// 범위 쿼리
auto lo = m.lower_bound(2);
auto hi = m.upper_bound(10);
for (auto it = lo; it != hi; ++it) { /*...*/ }
```

`std::map`과 동일 인터페이스. `lower_bound`/`upper_bound`/`equal_range`, reverse iteration 모두 지원.

## std::map 대비 차이

| 항목 | std::map (RB-tree) | absl::btree_map |
|---|---|---|
| 노드 fan-out | 2 (binary) | 수십 |
| key 단위 overhead | ~32 B | ~수 B |
| lookup 캐시 친화 | 약 | 강 |
| 노드 분할 비용 | 없음 (rotation) | 있음 (드뭄) |
| pointer/iterator 안정 (insert) | O | X — 노드 분할 시 무효화 |
| pointer/iterator 안정 (erase) | O | X — 노드 merge 시 무효화 |
| 메모리 사용 | 큼 | 작음 |
| 평균 lookup | baseline | ~2~4x |

가장 큰 트레이드오프는 **iterator/pointer 안정성**이다. `std::map`은 노드 단위 인디렉션이 강해서 안정적이고, `btree_map`은 노드 분할/병합으로 무효화될 수 있다.

## 내부 구현

`btree_map`의 노드 헤더는 다음과 비슷하다.

```cpp
// absl/container/internal/btree.h (요약)
template <typename Params>
class btree_node {
  using slot_type = typename Params::slot_type;

  btree_node* parent_;
  field_type position_;   // 부모에서의 위치
  field_type count_;      // 현재 key 개수
  field_type max_count_;  // 노드 최대 key 개수
  slot_type slots_[kMaxSlots];
  // leaf가 아니면 child pointer 배열도
};
```

노드 크기는 `target_node_size` 매개변수(기본 256B)에 맞춰 컴파일 타임에 결정된다. 작은 key type이면 한 노드에 수십 개 key가 들어간다.

lookup은 노드 안에서 binary search(또는 linear search — small N에서 더 빠름)로 위치를 찾고, 필요하면 child 노드로 내려간다. 트리 높이는 `log_N`이지만 N이 크므로 실제 깊이는 매우 얕다.

**10M 원소:**

- std::map: ~23 level (log_2)
- btree_map: ~4 level (log_64)

## 코드 리뷰 포인트

**1. `std::map` → `btree_map`**

대부분의 sorted map은 `btree_map`이 더 빠르다. 단, pointer 안정성을 가정하는 코드를 검수.

```cpp
// std::map의 관용구 — btree에서는 위험
auto* p = &m[key];
m.emplace(other_key, ...);  // 노드 분할 가능 → p dangling
*p = ...;
```

값을 직접 보관하지 말고 매번 `find` 또는 `unique_ptr` 보관.

**2. `std::set` → `absl::btree_set`**

`absl::btree_set`도 같은 트레이드오프로 제공된다. 정렬된 unique 집합이 필요하면 `btree_set`.

**3. multimap / multiset 대응**

`absl::btree_multimap`, `absl::btree_multiset`도 제공된다. `std::multimap`보다 빠르고 메모리 효율도 높다.

**4. iteration이 hot path**

range-for iteration 또한 cache-friendly하다. 노드 내부 순회는 인접 메모리, 노드 간 점프만 cache miss.

```cpp
// 정렬된 순회 자주 — btree_map이 적합
for (const auto& [k, v] : sorted_index) Process(k, v);
```

## 안티패턴

**hash로 충분한 곳에 btree**

정렬·범위 쿼리·`lower_bound`가 *필요하지 않으면* hash map이 압도적으로 빠르다.

| 워크로드 | 추천 |
|---|---|
| 키 lookup only | `flat_hash_map` |
| 정렬 순회·범위 쿼리 | `btree_map` |
| stable pointer 필요 + 정렬 | `std::map` 또는 `btree_map` + indirection |

**pointer 보관**

```cpp
// 회피
auto* p = &m[k];
m.emplace(...);
use(p);   // UB 가능

// Good
m[k] = ...;  // operator[] 마지막에
```

또는 value를 `unique_ptr`로.

**iterator 캐시**

```cpp
auto it = m.find(k);
m.emplace(...);   // 노드 분할 → it 무효화 가능
use(it);
```

iterator도 보관 금지.

## node_handle (C++17 호환)

```cpp
auto node = m.extract(key);
node.key() = new_key;  // key 수정 후
m.insert(std::move(node));
```

`absl::btree_map`은 C++17의 node_handle API를 지원해 key를 수정할 수 있다. 일반 `m[k]`로는 불가능한 동작.

## 정리

- `btree_map`은 B-tree 기반 sorted map. cache 친화, 메모리 효율.
- `std::map` 대비 2~4배 빠른 lookup, 노드 fan-out 수십.
- iterator/pointer가 노드 분할/병합으로 무효화될 수 있다.
- 정렬·범위 쿼리가 필요 없으면 `flat_hash_map`이 더 빠르다.
- multi 변형(`btree_multimap`, `btree_multiset`)도 제공.

## 다음 편

[Part 5-05 — FixedArray](/blog/programming/code-review/abseil/part5-05-fixed-array)에서 동적 크기지만 stack 할당을 노리는 배열을 본다.

## 관련 항목

- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Part 5-05 — FixedArray](/blog/programming/code-review/abseil/part5-05-fixed-array)
- [Part 5-06 — InlinedVector](/blog/programming/code-review/abseil/part5-06-inlined-vector)
- [Abseil — B-tree containers](https://abseil.io/blog/20190813-btree)
