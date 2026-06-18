---
title: "absl::flat_hash_set — set 버전 Swiss Table"
date: 2026-06-10T09:12:00
description: "Part 5-02: absl::flat_hash_set — flat_hash_map의 set 대응, value-as-key 구조, dedup/membership 워크로드 패턴."
series: "Abseil Code Review"
seriesOrder: 28
tags: [cpp, abseil, container, hash-set, swiss-table]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::flat_hash_set`은 `flat_hash_map`의 set 대응이다. value 자체가 key 역할을 하며, Swiss Table 구조와 성능 특성, iterator 무효화 규칙은 동일하다. dedup, membership test, set 연산에서 `std::unordered_set` 대비 같은 성능 우위를 누린다.

## 동기

`flat_hash_set`은 `flat_hash_map<K, void>`로 생각하면 된다. (key, value)가 아니라 *key만*. 사용 시나리오:

- 중복 제거 (dedup)
- 빠른 membership test
- 작은 집합 연산(intersection, union)

```cpp
absl::flat_hash_set<std::string> seen;
for (const auto& line : input) {
  if (seen.insert(line).second) {
    Process(line);  // 첫 등장만 처리
  }
}
```

`insert(x).second`가 *처음 삽입했는가*를 알려준다. 이는 표준 set의 관용구다.

## API와 사용법

```cpp
#include "absl/container/flat_hash_set.h"

absl::flat_hash_set<int> s = {1, 2, 3};

s.insert(4);
s.emplace(5);

if (s.contains(3)) { /*...*/ }
if (s.count(3) > 0) { /*...*/ }   // 동일
if (auto it = s.find(3); it != s.end()) { /*...*/ }

s.erase(1);
```

C++20부터 `std::unordered_set`에도 `contains`가 있지만, Abseil은 처음부터 제공했다. 가독성 측면에서 `contains`를 선호.

## heterogeneous lookup

```cpp
absl::flat_hash_set<std::string> words;
words.insert("hello");

absl::string_view query = "hello";
if (words.contains(query)) { /*...*/ }   // no alloc
if (words.contains("hello")) { /*...*/ } // no alloc
```

`std::unordered_set<std::string>::contains(string_view)`는 C++20까지도 transparent 동작이 약하다. heterogeneous lookup이 자연스럽게 동작하는 점이 코드 가독성에 크다.

## set 연산

표준 set과 마찬가지로 `<algorithm>`의 set 연산은 *정렬된 입력*을 가정하므로 hash set에는 부적합하다. 직접 작성한다.

```cpp
// 교집합
absl::flat_hash_set<int> Intersect(const absl::flat_hash_set<int>& a,
                                   const absl::flat_hash_set<int>& b) {
  const auto& smaller = a.size() < b.size() ? a : b;
  const auto& larger = a.size() < b.size() ? b : a;
  absl::flat_hash_set<int> r;
  r.reserve(smaller.size());
  for (int x : smaller) {
    if (larger.contains(x)) r.insert(x);
  }
  return r;
}
```

작은 쪽을 순회하고 큰 쪽에 contains로 조회하는 것이 O(min(|a|,|b|))이라 표준 코드보다 빠르다.

## std::unordered_set 비교

차이는 `flat_hash_map` 대 `std::unordered_map`과 동일하다.

| 항목 | std::unordered_set | absl::flat_hash_set |
|---|---|---|
| storage | 노드 chain | open-addressing flat array |
| lookup cache miss | 2~3회 | 0~1회 |
| iterator 안정성 | insert/erase에 stable | rehash·erase에서 무효화 |
| heterogeneous lookup | C++20 부분 | 처음부터 강력 |
| 평균 lookup | baseline | ~2-3x |

## 내부 구현

`flat_hash_set`은 `flat_hash_map<T, void>`의 type alias가 아니다(value type이 없는 별도 instantiation). 다만 Swiss Table 코어를 공유하므로 [Part 5-07](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)에서 설명할 control byte / SIMD 스캔 / probing 전략이 그대로 적용된다.

## 코드 리뷰 포인트

**1. `count` → `contains`**

```cpp
// 회피
if (s.count(x)) { /*...*/ }

// Good
if (s.contains(x)) { /*...*/ }
```

`count`는 multiset 시절의 유산이다. `flat_hash_set`에서 `count`는 항상 0 또는 1이다. `contains`가 의도 표현이 더 좋다.

**2. dedup 패턴**

```cpp
// 회피 — O(n²)
std::vector<std::string> dedup;
for (const auto& s : input) {
  if (std::find(dedup.begin(), dedup.end(), s) == dedup.end()) {
    dedup.push_back(s);
  }
}

// Good — O(n) 평균
absl::flat_hash_set<absl::string_view> seen;
std::vector<absl::string_view> dedup;
for (absl::string_view s : input) {
  if (seen.insert(s).second) dedup.push_back(s);
}
```

순서 보존 dedup의 표준 패턴.

**3. 큰 element는 unique_ptr**

```cpp
// 회피
absl::flat_hash_set<BigStruct> s;  // rehash 시 대량 이동

// Good
absl::flat_hash_set<std::unique_ptr<BigStruct>, ByPtrHash, ByPtrEq> s;
// 또는
absl::node_hash_set<BigStruct> s;
```

`flat_hash_map`과 동일한 트레이드오프.

## 안티패턴

**ordered traversal 가정**

hash set은 순서 보장이 없다. 같은 process 안에서도 hash seed가 매 실행마다 달라질 수 있다. 결정적 순서가 필요하면 `absl::btree_set` 또는 결과를 `std::sort`.

**큰 value를 `flat_hash_set`에 직접**

rehash 시 모든 원소가 *이동*된다. 무거운 객체는 indirection을 통한다.

## 정리

- `flat_hash_set`은 `flat_hash_map`의 set 대응, 성능 특성과 무효화 규칙 동일.
- `contains`로 가독성 좋은 membership test.
- heterogeneous lookup으로 `string_view` 조회에 alloc 없음.
- dedup, set 연산은 `insert(x).second` 또는 `contains` 기반 패턴.
- 큰 원소는 `unique_ptr` 또는 `node_hash_set`.

## 다음 편

[Part 5-03 — node_hash_map](/blog/programming/code-review/abseil/part5-03-node-hash-map)에서 stable pointer가 필요한 경우의 대안을 본다.

## 관련 항목

- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Part 5-03 — node_hash_map](/blog/programming/code-review/abseil/part5-03-node-hash-map)
- [Part 5-04 — btree_map](/blog/programming/code-review/abseil/part5-04-btree-map)
- [Part 5-07 — Swiss Table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)
