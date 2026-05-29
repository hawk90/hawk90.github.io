---
title: "Part 7-04: F14FastMap (auto-select)"
date: 2026-05-24T10:00:00
description: "F14FastMap — key/value 크기로 ValueMap과 VectorMap 중 자동 선택, 사용자 trade-off 제거."
series: "Folly Code Review"
seriesOrder: 33
tags: [cpp, folly, f14, fast-map, auto]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`F14FastMap`은 `sizeof(pair<K,V>)`를 보고 컴파일 타임에 `F14ValueMap`(작은 value) 또는 `F14VectorMap`(큰 value)으로 alias 된다. 사용자가 trade-off를 고민하지 않아도 적절한 변형을 얻는다.

## 동기

세 가지 변형(Value/Node/Vector)이 있으면 매번 무엇을 쓸지 결정해야 한다. 대부분의 코드는 굳이 차이를 고민할 필요가 없다 — *대충 빠르면 된다*.

- value가 작으면 chunk inline이 cache-friendly → ValueMap.
- value가 크면 chunk slot에 큰 객체가 들어가면 메모리 낭비 → VectorMap.

이 결정을 컴파일러가 한다. `sizeof(Item)`이 임계치(48 byte) 이하면 ValueMap, 초과면 VectorMap.

```cpp
folly::F14FastMap<int, int>             // → ValueMap (sizeof(pair) = 8)
folly::F14FastMap<std::string, BigObj>  // → VectorMap (sizeof(pair) > 48)
```

## API & 사용법

API는 ValueMap과 동일하다. 단, 어느 variant로 alias 되었느냐에 따라 *세부 동작이 다르다*.

```cpp
#include <folly/container/F14Map.h>

folly::F14FastMap<int, std::string> small;
// VectorMap으로 dispatch (pair<int, string> = 40 bytes... 임계치 부근)

folly::F14FastMap<int, int> tiny;
// ValueMap (8 bytes)

folly::F14FastMap<std::string, std::array<char, 256>> big;
// VectorMap

// 모두 같은 인터페이스
small.emplace(1, "a");
small.find(1);
for (auto& [k, v] : small) { ... }
```

VectorMap이 선택된 경우 *insertion order*가 유지된다. ValueMap이면 순서 없다. 코드가 양쪽을 모두 동작해야 하면 *순서를 가정하면 안 된다*.

## 내부 구현

### 간단한 type dispatch

```cpp
// 약식 — folly/container/F14Map.h
namespace detail {
  constexpr size_t kF14VectorMapThreshold = 24;

  template <typename K, typename V>
  using FastSelect = std::conditional_t<
      (sizeof(std::pair<K, V>) <= kF14VectorMapThreshold) &&
       folly::is_trivially_relocatable_v<std::pair<K, V>>,
      F14ValueMap<K, V>,
      F14VectorMap<K, V>>;
}

template <typename K, typename V>
using F14FastMap = detail::FastSelect<K, V>;
```

(정확한 임계치와 trait는 folly 버전마다 다르다. core idea는 단순 `if constexpr`.)

조건:

1. `sizeof(pair)` ≤ 임계치 (작은 value).
2. `is_trivially_relocatable` (rehash move 안전).

둘 다 만족하면 ValueMap, 아니면 VectorMap.

### Trivially relocatable

`folly`는 자체 trait `IsRelocatable`을 가진다. `std::pair`, primitive, POD는 자동으로 relocatable. 사용자 타입은 다음과 같이 표시.

```cpp
struct Big {
  std::array<char, 64> buf;
};
namespace folly { template <> struct IsRelocatable<Big> : std::true_type {}; }
```

relocatable이면 rehash 시 byte-wise memmove로 옮길 수 있어 ValueMap이 안전하다. 아니면 VectorMap이 선택돼 옮길 일이 적다.

## 사용 결정 — 언제 FastMap

```text
F14FastMap을 쓰는 경우:
  - 정책 정하기 귀찮음. 그냥 빠른 것.
  - workload가 lookup-heavy도, iteration-heavy도 명확하지 않음.
  - team 코드 베이스에서 일관성을 원함.

명시적 선택을 쓰는 경우:
  - lookup만 한다 → F14ValueMap
  - 순회/snapshot이 잦다 → F14VectorMap
  - pointer 안정성 필요 → F14NodeMap
  - 큰 value이고 erase 잦다 → F14NodeMap (VectorMap의 swap-pop 회피)
```

대부분 새 코드는 `F14FastMap`이 default.

## std/abseil 비교

abseil에는 자동 선택이 없다. `flat_hash_map` 또는 `node_hash_map`을 사용자가 명시.

| 항목 | abseil | folly |
|------|--------|-------|
| 자동 선택 | X | F14FastMap |
| 명시 variants | flat, node | Value, Node, Vector |
| Insertion order | X | VectorMap만 |
| Trait based | X | `is_trivially_relocatable` |

folly의 FastMap은 abseil 식 *명시적 선택*에 대한 한 가지 답. 코드 작성 부담을 낮춘다.

## 코드 리뷰 포인트

```cpp
// Good — 일반적 경우 FastMap
folly::F14FastMap<int, int> counters;

// Bad — pointer 안정성 필요한데 FastMap
folly::F14FastMap<int, std::string> m;
auto* p = &m[1];
m[2] = "...";   // rehash 가능, ValueMap으로 alias 되면 UB
```

FastMap이 어느 variant인지 모르므로 *reference 안정성을 요구하는 코드는 명시적으로 NodeMap*. FastMap은 "포인터 유지 안 한다"는 약속.

```cpp
// 주의 — order에 의존하면 FastMap 안 됨
folly::F14FastMap<int, int> m;
m.insert({1, 1}); m.insert({2, 2});
for (auto& [k, v] : m) {
  // 순서가 1, 2일 수도, 2, 1일 수도
}
```

FastMap의 순서는 컴파일 결과에 따라 다르다. 순서가 의미 있으면 `F14VectorMap`을 명시.

```cpp
// Good — value 크기 명시적
struct Stat { uint64_t count; uint64_t total; };  // 16 byte
folly::F14FastMap<int, Stat> stats;  // ValueMap으로 dispatch
```

작은 POD value면 FastMap이 ValueMap을 선택해 최적.

## 안티패턴

- **`F14FastMap`을 NodeMap 대체로 사용**: FastMap은 절대로 NodeMap을 선택하지 않는다. pointer 안정성 필요하면 NodeMap 명시.
- **value type을 incomplete type으로 FastMap에**: `sizeof(pair)`를 계산해야 하므로 complete type 필요. forward declared type은 못 씀.
- **순서가 깨지는 곳에서 VectorMap default 가정**: FastMap이 `int → int` 같은 작은 type을 받으면 ValueMap 선택. 순서 없다.

## 정리

- `F14FastMap`은 `sizeof(pair)` 기반 컴파일 타임 dispatch.
- 작은 value → `F14ValueMap`, 큰 value → `F14VectorMap`.
- `F14NodeMap`은 자동 선택 안 함 — 필요하면 명시.
- order/pointer 안정성에 의존하지 않는 일반 코드의 default.
- variant가 무엇인지 모르므로 *변형별 특수 동작 가정 금지*.

## 다음 편

마지막으로 F14의 SIMD probing 내부를 본다. control byte 구조, H1/H2 hash split, NEON/SSE2 dispatch.

## 관련 항목

- [Part 7-01: F14ValueMap](/blog/programming/code-review/folly/part7-01-f14-value-map)
- [Part 7-03: F14VectorMap](/blog/programming/code-review/folly/part7-03-f14-vector-map)
- [Part 7-05: F14 internals](/blog/programming/code-review/folly/part7-05-f14-internals) — SIMD 상세
- [원문 — folly/container/F14Map.h](https://github.com/facebook/folly/blob/main/folly/container/F14Map.h)
