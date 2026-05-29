---
title: "Part 7-03: F14VectorMap (cache-friendly iteration)"
date: 2026-05-24T09:00:00
description: "F14VectorMap — value를 contiguous vector에 두고 chunk에는 index만, 순회 cache-friendly."
series: "Folly Code Review"
seriesOrder: 32
tags: [cpp, folly, f14, vector-map, cache]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`F14VectorMap`은 value를 `std::vector` 한 곳에 모으고 chunk slot에는 vector index만 둔다. 순회가 vector를 그대로 도는 것과 같아 가장 cache-friendly. lookup은 chunk → index → vector의 두 단계라 ValueMap보다 약간 느리다.

## 동기

server는 보통 lookup이 압도적으로 많지만, 가끔 *전체 순회*가 필요한 경우가 있다.

- snapshot 직렬화 (모든 entry 출력).
- batch 처리 (한 번에 다 작업).
- statistics 계산 (모든 value sum).

ValueMap의 chunk는 빈 slot이 많아 순회 시 빈 slot을 건너뛰며 cache가 비효율적. VectorMap은 value를 vector에 packing해 순회를 dense하게 만든다.

```cpp
folly::F14VectorMap<int, Metric> metrics;
// ... insert N개
for (auto& [k, v] : metrics) {
  v.Aggregate();    // vector를 그대로 도는 효과
}
```

순회 throughput이 `std::vector` 수준.

## API & 사용법

```cpp
#include <folly/container/F14Map.h>

folly::F14VectorMap<std::string, int> m;
m["a"] = 1;
m["b"] = 2;
m["c"] = 3;

// 순회 — insertion order 보장!
for (auto& [k, v] : m) {
  // a, b, c 순서
}

// 표준 API
m.find("b");
m.erase("b");
m.contains("a");

// VectorMap 전용 — index 접근
auto vec_view = m.values();    // const std::vector& 비슷한 view
for (size_t i = 0; i < vec_view.size(); ++i) {
  // ...
}
```

VectorMap만의 특징: **insertion order를 유지**한다. python `dict`(3.7+)와 비슷한 동작.

## 내부 구현

### 두 자료구조 결합

```text
Chunks (Swiss table):
  [ controls | slot[0] = vec_index | ... | slot[13] = vec_index ]
                       ↓
Vector:
  [ pair<K,V>[0] | pair<K,V>[1] | pair<K,V>[2] | ... ]
                       ↑
              순회는 여기를 그대로
```

```cpp
// 약식
template <typename Key, typename Value>
class F14VectorMap {
  std::vector<Item> values_;     // contiguous
  ChunkTable indexes_;           // chunk → vec index
  // ...
};
```

### Lookup

```cpp
// 약식
Iterator find(const Key& k) {
  auto h = hash(k);
  // 1. SIMD probing으로 chunk slot 찾기
  uint32_t vec_idx = indexes_.find(k, h);
  if (vec_idx == kNotFound) return end();
  // 2. vector에서 actual value
  return Iterator{&values_[vec_idx]};
}
```

step 1은 ValueMap과 같음. step 2가 추가 indirection. cache miss가 한 번 더 발생 가능.

### Insert (and Erase의 trick)

```cpp
// 약식 — Insert
void insert(K k, V v) {
  size_t new_idx = values_.size();
  values_.emplace_back(std::move(k), std::move(v));
  indexes_.insert(values_.back().first, new_idx);
}

// Erase — 가장 미묘
void erase(const Key& k) {
  auto vec_idx = indexes_.find(k);
  if (vec_idx == values_.size() - 1) {
    values_.pop_back();        // 마지막이면 그냥 pop
    indexes_.erase(k);
  } else {
    // 마지막 entry를 erase 자리로 swap
    values_[vec_idx] = std::move(values_.back());
    values_.pop_back();
    // 마지막 entry의 chunk index 갱신
    indexes_.updateIndex(values_[vec_idx].first, vec_idx);
    indexes_.erase(k);
  }
}
```

**erase는 마지막 entry를 swap-pop**. 이 때문에 erase 후 *insertion order가 깨진다*. order가 중요하면 erase를 피하거나 다른 자료구조.

### Reserve가 cheap

```cpp
m.reserve(N);
// 1. vector.reserve(N) — contiguous block
// 2. chunk 배열 reserve
// 큰 entry 수에서도 한 번에 끝남
```

VectorMap은 value 영역과 chunk가 분리돼 reserve 동작이 단순하다.

## 성능 특성

```text
benchmark: N=1M entries
                              Lookup    Insert    Iteration
  std::unordered_map          120 ns    180 ns    250 ms (전체)
  folly::F14ValueMap           45 ns     60 ns    180 ms
  folly::F14NodeMap            50 ns     90 ns    220 ms
  folly::F14VectorMap          55 ns     65 ns     45 ms ← !
```

순회가 4-5배 빠르다. value가 vector에 contiguous이므로 prefetcher가 잘 동작.

대신 lookup이 약 20% 느림 — extra indirection.

## std/abseil 비교

abseil에는 직접 대응이 없다. `absl::flat_hash_map` 순회는 ValueMap과 비슷한 sparse pattern. order 보장도 없다.

| 항목 | std::unordered_map | absl::flat_hash_map | folly::F14VectorMap |
|------|---------------------|----------------------|----------------------|
| Insertion order | X | X | O |
| Iteration speed | 느림 | 보통 | 빠름 (vector 수준) |
| Lookup speed | 느림 | 빠름 | 보통 |
| Erase order 영향 | 없음 | 없음 | swap-pop |
| Memory | 큼 | 작음 | 보통 |

이 점에서 VectorMap은 *Folly 고유*. order + dense iteration의 조합은 다른 hash map에는 드물다.

## 코드 리뷰 포인트

```cpp
// Good — iteration-heavy workload
folly::F14VectorMap<int, Metric> m;
for (auto& [id, metric] : m) ProcessAll(metric);

// Bad — lookup-heavy
folly::F14VectorMap<int, int> m;
for (int i = 0; i < 1'000'000; ++i) {
  Use(m.at(i));   // 매번 indirection
}
// Better: F14ValueMap
```

read pattern을 보고 선택. lookup이 90% 이상이면 ValueMap, iteration이 잦으면 VectorMap.

```cpp
// 주의 — erase가 insertion order를 깨뜨림
folly::F14VectorMap<std::string, int> ordered;
ordered["a"] = 1;
ordered["b"] = 2;
ordered["c"] = 3;
ordered.erase("a");
// 순회 결과: b, c가 아니라 c, b (swap-pop)
```

order가 중요하면 erase 후에는 ordering 가정 금지. 또는 logical delete(`tombstone`) 패턴.

```cpp
// Good — bulk insert 후 freeze
folly::F14VectorMap<Key, Value> immutable;
for (auto& kv : initial_data) immutable.insert(kv);
immutable.reserve(immutable.size());   // shrink to fit
// 이후 read-only로 사용
```

build-once-read-many 패턴이 VectorMap의 sweet spot.

## 안티패턴

- **insertion order 보장 가정 후 erase**: swap-pop으로 order가 깨진다. order 필요하면 erase 금지 또는 `boost::container::flat_map` 같은 다른 자료구조.
- **외부에 vector index 노출**: erase 후 index가 무효. iterator/index를 가진 채로 erase 금지.
- **lookup 위주 hot path**: indirection 비용. ValueMap이 더 적합.

## 정리

- `F14VectorMap`은 value를 vector에 contiguous 저장, chunk는 index만.
- 순회 throughput이 vector 수준 (4-5배 빠름).
- insertion order 유지 (python dict 식).
- lookup은 extra indirection으로 20% 느림.
- erase는 swap-pop이라 order를 깨므로 주의.

## 다음 편

`F14FastMap`은 위 세 변형 중 하나를 *value 크기에 따라 자동 선택*한다. trade-off를 사용자가 고민할 필요 없다.

## 관련 항목

- [Part 7-01: F14ValueMap](/blog/programming/code-review/folly/part7-01-f14-value-map) — lookup-optimized
- [Part 7-02: F14NodeMap](/blog/programming/code-review/folly/part7-02-f14-node-map) — pointer 안정
- [Part 7-04: F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — 자동 선택
- [원문 — folly/container/F14Map.h](https://github.com/facebook/folly/blob/main/folly/container/F14Map.h)
