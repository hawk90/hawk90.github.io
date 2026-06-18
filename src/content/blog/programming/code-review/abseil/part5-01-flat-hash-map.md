---
title: "absl::flat_hash_map — Swiss Table 기반 hash map"
date: 2026-06-10T09:11:00
description: "Part 5-01: absl::flat_hash_map — Swiss Table 채택 배경, std::unordered_map 대비 cache locality와 성능, pointer/iterator 안정성 트레이드오프."
series: "Abseil Code Review"
seriesOrder: 27
tags: [cpp, abseil, container, hash-map, swiss-table]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::flat_hash_map`은 Swiss Table 구조를 채택한 open-addressing hash map이다. `std::unordered_map`이 강제하는 노드 단위 할당과 chain-list 순회를 *연속 메모리에 SIMD-friendly한 metadata*로 대체해 lookup이 평균 2~3배 빠르다. 대신 모든 mutation에서 iterator·pointer가 무효화된다.

## 동기

`std::unordered_map`의 표준 규약은 노드 기반이다. 각 (key, value) 쌍이 별도 heap node에 있고, bucket은 노드 포인터 chain을 들고 있다. 결과:

- lookup마다 **두 번 이상의 cache miss** — bucket 배열 → chain head → 노드 → 노드.
- key 비교 전 *해시 비교*가 별도 메모리 접근.
- erase가 stable iterator를 요구해 노드 풀링이 강제.

`flat_hash_map`은 표준 규약을 일부 깨고 cache 친화 설계를 택한다.

- 슬롯이 *연속 배열*에 직접 저장 (open addressing).
- 슬롯 위 16바이트 **control byte 그룹**이 *해시 partial* + *상태(empty/deleted/full)*를 들고 있어 SIMD로 한 번에 16개 슬롯을 스캔한다.
- erase가 iterator를 무효화함을 허용하는 대신 packing이 단순해진다.

Swiss Table 자체의 내부 구조는 [Part 5-07 — Swiss Table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)에서 본다. 여기서는 사용 측면.

구조를 한눈에 보면 다음과 같다.

![flat_hash_map 메모리 레이아웃](/images/blog/abseil/diagrams/part5-01-flat-hash-map-layout.svg)

## API와 사용법

```cpp
#include "absl/container/flat_hash_map.h"

absl::flat_hash_map<std::string, int> counts;
counts["a"] = 1;
counts.emplace("b", 2);

if (auto it = counts.find("a"); it != counts.end()) {
  LOG(INFO) << it->second;
}

for (const auto& [k, v] : counts) {
  // ...
}
```

인터페이스는 `std::unordered_map`과 거의 동일하다. 마이그레이션은 보통 헤더 교체와 typedef 변경으로 끝난다.

```cpp
// before
std::unordered_map<K, V> m;
// after
absl::flat_hash_map<K, V> m;
```

## 내부 구현 — open addressing

`flat_hash_map`은 *open addressing* hash table이다. node chain 대신 flat 배열에 직접 slot을 둔다.

![Open addressing probing](/images/blog/cpp-concepts/diagrams/hash-table-probing.svg)

hash 충돌 시 다음 slot으로 probe해 빈 자리를 찾는다. cache locality는 좋지만 load factor가 높을수록 probe 길이가 늘어 rehash가 필요해진다. Swiss Table은 여기에 *SIMD로 16-slot 그룹을 1 cmp로 검사*하는 트릭을 더해 probe 비용을 상쇄한다 (Part 5-07).

## 내부 구현 — heterogeneous lookup

표준은 C++20부터 일부 heterogeneous lookup을 지원하지만, `flat_hash_map`은 처음부터 강력하다.

```cpp
absl::flat_hash_map<std::string, int> m;
m["hello"] = 1;

// std::unordered_map: 임시 std::string 생성 후 lookup
auto it = m.find(absl::string_view("hello"));   // OK — no alloc
auto it2 = m.find("hello");                      // OK — no alloc
```

`Hash`와 `Eq`가 transparent하면(`is_transparent` typedef) `string_view`로 직접 lookup이 가능하다. Abseil은 `absl::Hash`/`std::equal_to<>`를 기본으로 transparent 처리한다.

## std::unordered_map 비교

| 항목 | std::unordered_map | absl::flat_hash_map |
|---|---|---|
| storage | 노드 chain | open addressing flat array |
| lookup cache miss | 2~3회 | 0~1회 |
| iterator/pointer 안정성 | insert/erase에 stable | rehash·erase에서 무효화 |
| `node_type` (split) | C++17 지원 | 미지원 (`node_hash_map` 별도) |
| heterogeneous lookup | C++20 부분 | 처음부터 강력 |
| value 이동 비용 | 없음 (노드 재사용) | rehash 시 모든 value 이동 |
| 평균 lookup | baseline | ~2-3x 빠름 |
| 메모리 사용 | 노드 헤더 overhead | ctrl byte + slot |

## 코드 리뷰 포인트

**1. value 크기 vs flat 선택**

`flat_hash_map`은 (key, value)가 *직접* 배열에 저장된다. value가 크면(>32B 정도) rehash 비용이 커진다. 큰 value는 `node_hash_map` 또는 `flat_hash_map<K, std::unique_ptr<V>>`를 고려한다.

```cpp
// 회피 — value 64B + rehash 비용
absl::flat_hash_map<int, BigStruct> m;

// Good
absl::flat_hash_map<int, std::unique_ptr<BigStruct>> m;
// 또는
absl::node_hash_map<int, BigStruct> m;
```

`node_hash_map`은 [Part 5-03](/blog/programming/code-review/abseil/part5-03-node-hash-map)에서 본다.

**2. pointer/iterator 보관 금지**

```cpp
auto* p = &m["key"];   // 위험
m.insert({"other", 0});  // rehash 가능 — p dangling
```

`std::unordered_map`은 노드 안정성을 보장하지만 `flat_hash_map`은 아니다. value 주소를 보관해야 하면 `node_hash_map` 또는 value를 `unique_ptr`로.

**3. reserve로 rehash 비용 절감**

```cpp
absl::flat_hash_map<int, int> m;
m.reserve(expected_size);   // 한 번에 alloc, 이후 rehash 없음
for (...) m.emplace(...);
```

`reserve(n)`은 load factor를 고려해 충분한 슬롯을 잡는다.

**4. heterogeneous lookup 활용**

```cpp
absl::flat_hash_map<std::string, int> m;
absl::string_view key = LookupKeyFromInput();
auto it = m.find(key);     // no alloc, no string copy
```

`std::unordered_map`은 같은 코드에 임시 string alloc이 발생한다 (C++20 transparent 미지원 시).

## 안티패턴

**큰 value 직접 저장**

```cpp
absl::flat_hash_map<int, std::array<char, 4096>> m;
// rehash가 일어나면 모든 4KB value를 이동
// — std::move 가능이라도 cache 영향 큼
```

value 크기가 클 때는 `unique_ptr<V>` 또는 `node_hash_map`.

**const_iterator로 mutate 회피 시도**

`flat_hash_map`은 `iterator`/`const_iterator`가 모두 같은 안정성을 가진다(둘 다 무효화). const_iterator를 들고 있어도 rehash 위험은 동일.

**std::map처럼 사용**

hash map은 *순서 보장 없음*이다. ordered traversal이 필요하면 `absl::btree_map` ([Part 5-04](/blog/programming/code-review/abseil/part5-04-btree-map)).

## 정리

- `flat_hash_map`은 Swiss Table 기반 open-addressing.
- 연속 메모리 + 16-slot SIMD 스캔으로 lookup 2~3배 빠르다.
- iterator/pointer가 rehash·erase에서 무효화된다.
- value가 크면 `unique_ptr` 또는 `node_hash_map`.
- heterogeneous lookup이 처음부터 강력 — `string_view`로 lookup 가능.

## 다음 편

[Part 5-02 — flat_hash_set](/blog/programming/code-review/abseil/part5-02-flat-hash-set)에서 set 대응을 짧게 본다.

## 관련 항목

- [Part 5-02 — flat_hash_set](/blog/programming/code-review/abseil/part5-02-flat-hash-set)
- [Part 5-03 — node_hash_map](/blog/programming/code-review/abseil/part5-03-node-hash-map)
- [Part 5-07 — Swiss Table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)
- [Folly Part 7-01 — F14ValueMap](/blog/programming/code-review/folly/part7-01-f14-value-map) — Meta의 동일 컨셉
- [Tip of the Week #136: Unordered Containers](https://abseil.io/tips/136)
