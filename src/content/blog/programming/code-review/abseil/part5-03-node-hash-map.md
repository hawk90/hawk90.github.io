---
title: "absl::node_hash_map — stable pointer가 필요할 때"
date: 2026-06-10T09:13:00
description: "Part 5-03: absl::node_hash_map — flat_hash_map의 노드 기반 변형, value pointer 안정성 보장, std::unordered_map 마이그레이션 경로."
series: "Abseil Code Review"
seriesOrder: 29
tags: [cpp, abseil, container, hash-map, stability]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::node_hash_map`은 Swiss Table 위에 **노드 indirection**을 얹은 변형이다. flat의 cache 친화 lookup을 유지하면서 value pointer/reference 안정성을 보장한다. `std::unordered_map`을 *그대로* 대체하려는 경우의 drop-in이며, `flat_hash_map`의 rehash 비용이 부담스러운 큰 value에 적합하다.

## 동기

`flat_hash_map`은 value를 슬롯에 직접 저장한다. rehash가 일어나면 모든 value가 *이동*된다.

문제 둘.

1. value가 크면 이동 비용이 크다.
2. 외부에서 value 주소를 보관할 수 없다 — rehash 후 주소가 바뀐다.

`std::unordered_map`은 이 두 문제를 노드 기반 설계로 해소한다. value는 별도 heap 노드에, 슬롯은 노드 포인터만 갖는다. `node_hash_map`은 Swiss Table에 같은 인디렉션 전략을 도입했다.

## API와 사용법

```cpp
#include "absl/container/node_hash_map.h"

absl::node_hash_map<std::string, BigStruct> m;
m.emplace("key", BigStruct{});

BigStruct* p = &m["key"];
m.emplace("other", BigStruct{});  // rehash 가능
// p는 여전히 유효 — value 노드가 별도 heap에 있음
```

인터페이스는 `flat_hash_map`과 동일하다. 차이는 **포인터/참조 안정성**뿐.

## 안정성 보장

`node_hash_map`은 다음을 보장한다.

- value의 *포인터/참조*: insert, erase, rehash에도 안정.
- value의 *iterator*: rehash에서 무효화될 수 있다 (`flat` 동일).

iterator와 포인터의 안정성이 다르다는 점이 미묘하다. 포인터를 들고 있어도 *iterator로 재방문*할 때는 새로 `find`를 거쳐야 한다.

```cpp
absl::node_hash_map<std::string, BigStruct> m;
auto it = m.emplace("key", BigStruct{}).first;
BigStruct* p = &it->second;

m.emplace("other", BigStruct{});

// iterator 위험
// *it;            // UB 가능 (rehash)

// 포인터는 안전
*p;                // OK
```

## std::unordered_map vs node_hash_map vs flat_hash_map

| 항목 | unordered_map | node_hash_map | flat_hash_map |
|---|---|---|---|
| 슬롯 storage | 노드 ptr chain | 노드 ptr (Swiss) | value 직접 |
| value 포인터 안정 | O | O | X |
| iterator 안정 (rehash) | O | X | X |
| iterator 안정 (insert 다른 키) | O | O | X |
| lookup cache miss | 2~3회 | 1~2회 | 0~1회 |
| heterogeneous lookup | C++20 부분 | 처음부터 | 처음부터 |
| `node_type` extract/insert | C++17 | O | X |

`node_hash_map`이 정확히 `unordered_map`의 안정성 — *value pointer*만 — 을 보장하면서 hash 구조는 Swiss Table을 쓴다.

## 내부 구현

`node_hash_map`은 슬롯에 `pair<const K, V>*`를 저장한다. flat의 slot 크기는 (K, V) 직접이지만, node의 slot은 8바이트 포인터다. 슬롯이 작아 cache line당 더 많은 슬롯을 담을 수 있다. lookup은 다음과 같다.

```cpp
// 의사 코드
slot = FindSlot(hash);   // Swiss Table probing
if (slot->ptr == nullptr) return end();
if (slot->ptr->first == key) return slot->ptr;
// 다음 슬롯 ...
```

key 비교 시 한 번의 indirection이 필요하다 — 슬롯의 포인터를 deref해 노드의 key를 읽는다. flat은 슬롯에서 바로 key를 읽는다. 그래서 *lookup은 flat이 더 빠르다*. 다만 노드 크기가 작아 probing 범위가 좁고, 큰 value의 rehash 비용이 없다는 점이 상쇄.

## 코드 리뷰 포인트

**1. value 주소 노출 API**

```cpp
class Cache {
 public:
  BigStruct* Get(absl::string_view key);  // 반환 포인터 lifetime 보장 필요
 private:
  absl::node_hash_map<std::string, BigStruct> map_;
};
```

API가 *value 주소*를 반환하면 `flat`은 위험하다. `node`를 쓰거나 value를 `unique_ptr<BigStruct>`로 래핑.

**2. 큰 value type**

value sizeof가 32B 이상이면 `node`가 보통 빠르다. rehash 빈도, value 이동 비용을 같이 고려.

대략 가이드:

- value < 16B → flat
- 16B ≤ value < 64B → 워크로드에 따라
- value ≥ 64B → node 또는 `unique_ptr`

**3. unordered_map 마이그레이션**

```cpp
// 회피 — 안정성 가정이 깨질 수 있음
std::unordered_map<K, V> → absl::flat_hash_map<K, V>

// 안전 — 동일 안정성
std::unordered_map<K, V> → absl::node_hash_map<K, V>
```

마이그레이션 시 pointer-stability 가정에 의존하는 코드가 있으면 `node`로 먼저 옮기고, 점진적으로 `flat`을 검토한다.

## 안티패턴

**모든 hash map을 node로 통일**

이는 `unordered_map`의 비효율을 그대로 복제한다. 안정성이 *필요하지 않은* 코드에서는 flat이 정답.

**iterator 안정성 가정**

```cpp
auto it = m.find("key");
m.emplace(...);    // rehash 가능
LOG(INFO) << it->second;  // 위험 — node도 iterator는 무효화
```

포인터만 안정하다. iterator는 보관하지 말 것.

**node_hash_set과의 일관성**

`absl::node_hash_set`도 동일 트레이드오프로 존재한다. 큰 element + 포인터 안정성 + Swiss Table 구조가 필요하면 사용.

## 정리

- `node_hash_map`은 Swiss Table + 노드 indirection.
- value 포인터/참조 안정 보장, iterator는 rehash에서 무효화.
- 큰 value, pointer-stability API, `unordered_map` drop-in 마이그레이션에 적합.
- 작은 value에서는 flat이 더 빠르다.

## 다음 편

[Part 5-04 — btree_map](/blog/programming/code-review/abseil/part5-04-btree-map)에서 sorted 컨테이너의 cache-friendly 대안을 본다.

## 관련 항목

- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Part 5-04 — btree_map](/blog/programming/code-review/abseil/part5-04-btree-map)
- [Part 5-07 — Swiss Table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)
- [Folly Part 7-02 — F14NodeMap](/blog/programming/code-review/folly/part7-02-f14-node-map)
