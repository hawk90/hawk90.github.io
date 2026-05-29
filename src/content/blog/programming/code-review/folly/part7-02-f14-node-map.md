---
title: "Part 7-02: F14NodeMap (stable pointer)"
date: 2026-05-24T08:00:00
description: "F14NodeMap — value를 별도 heap node에 두어 pointer/reference 안정성을 보장하는 F14 변형."
series: "Folly Code Review"
seriesOrder: 31
tags: [cpp, folly, f14, node-map, stability]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`F14NodeMap`은 chunk slot에 *value pointer*만 두고 실제 value는 별도 heap node에 둔다. `std::unordered_map`처럼 reference/pointer가 rehash 후에도 유효하다. ValueMap보다 한 단계 indirection이 추가되지만 안정성을 얻는다.

## 동기

`F14ValueMap`은 빠르지만 reference가 흔들린다. 다음 상황에서는 ValueMap을 쓸 수 없다.

- 값이 큰 객체(MB급 buffer)라 *복사 비용*이 부담.
- 다른 자료구조가 map value의 pointer를 보관 (graph node 등).
- value가 *비복사 타입* (mutex, atomic).
- iterator가 *오래 살아야* 한다 (async chain 중간).

이런 use case는 `std::unordered_map`이 자연스럽지만 lookup 성능이 떨어진다. `F14NodeMap`은 F14의 SIMD probing + std-like pointer 안정성을 결합한다.

```cpp
folly::F14NodeMap<int, std::mutex> mutex_pool;
auto& m = mutex_pool[key];   // mutex는 movable 아님
m.lock();
// 다른 thread가 insert 해도 &m 유효
```

## API & 사용법

ValueMap과 동일한 인터페이스.

```cpp
#include <folly/container/F14Map.h>

folly::F14NodeMap<std::string, BigObject> m;
m.emplace("key1", BigObject{...});

// reference 안정 — rehash 통과
const auto& obj = m["key1"];
m.reserve(10000);     // rehash 가능
LOG(INFO) << obj.id;  // 여전히 OK

// iterator 안정 — std::unordered_map과 같음
auto it = m.find("key1");
m.emplace("key2", ...);
it->second.UpdateField();   // 여전히 OK
```

차이는 implementation detail이다. 사용자 코드는 `Value` ↔ `Node`만 바꾸면 된다(보통).

## 내부 구현

### Slot 구조

```text
ValueMap slot:   [ Key | Value ]                   in-place
NodeMap slot:    [ Node* ]                          heap node 가리킴
                       ↓
                  [ Key | Value ]  (별도 heap)
```

chunk 구조(14 slot + control byte)는 동일. 차이는 slot이 pointer라는 점.

```cpp
// 약식 — folly/container/detail/F14Map-pre.h
template <typename Key, typename Value>
struct NodeContainerPolicy {
  using Item = std::pair<Key, Value>;
  using Slot = Item*;     // pointer만 chunk에

  static Item& itemAt(Slot& s) { return *s; }
  static Slot constructSlot(Item&& v, Allocator& a) {
    return new (a.allocate(1)) Item(std::move(v));
  }
};
```

`Slot`이 `Item*`이므로 rehash로 chunk가 옮겨져도 *node pointer 자체*는 그대로. node 메모리는 처음 emplace 시 할당하고 erase 전까지 안 옮긴다.

### Insert 동작

```cpp
// 약식
auto emplace(K key, V value) {
  // 1. node를 먼저 heap에 할당
  auto* node = allocator_.allocate(1);
  new (node) Item(std::move(key), std::move(value));

  // 2. chunk에 slot pointer 저장 (rehash 가능)
  auto [slot, inserted] = tableEmplace(node->first, node);
  if (!inserted) {
    node->~Item();
    allocator_.deallocate(node, 1);
  }
}
```

allocation 한 번 extra. 큰 value면 chunk 안에 inline 저장보다 오히려 메모리가 작다(chunk가 빈 slot까지 reserve하므로).

### Rehash 비용

ValueMap rehash는 value를 새 chunk로 *move*. value의 move cost가 영향.

NodeMap rehash는 *pointer만 복사*. value는 옮기지 않으므로 rehash 비용이 작다(특히 큰 value에서).

```text
N=10K, sizeof(V)=1KB
  F14ValueMap rehash:   ~10ms (move 10K개의 1KB)
  F14NodeMap  rehash:   ~0.1ms (pointer 10K개만)
```

ValueMap이 빠르려면 value가 작아야 한다. value가 커지면 NodeMap의 indirection 비용 < ValueMap의 move 비용.

## std/abseil 비교

```cpp
// abseil
absl::node_hash_map<K, V> m;   // std-like pointer 안정

// std
std::unordered_map<K, V> std_map;   // pointer 안정 (chaining)

// folly
folly::F14NodeMap<K, V> f14n;
```

| 항목 | std::unordered_map | absl::node_hash_map | folly::F14NodeMap |
|------|---------------------|----------------------|--------------------|
| pointer 안정 | O | O | O |
| iterator 안정 | O (insert/erase 다른 노드는) | O | O |
| 구조 | chaining | Swiss + pointer slot | Swiss + pointer slot |
| Lookup | cache miss 많음 | SIMD 가속 | SIMD 가속 |
| Insert allocation | node 매번 | node 매번 | node 매번 |

`absl::node_hash_map`과 사상 동일. 성능은 거의 같다. ValueMap 대비 lookup이 한 indirection만큼 (보통 10-20%) 느리다.

## 코드 리뷰 포인트

```cpp
// Bad — small value인데 NodeMap
folly::F14NodeMap<int, int> tiny;
// 매 entry마다 16-byte 정도 heap alloc

// Good
folly::F14ValueMap<int, int> tiny;   // chunk inline
```

value가 작으면 NodeMap의 heap allocation 오버헤드가 일반 lookup 비용을 압도한다. ValueMap 또는 FastMap.

```cpp
// Good — 큰 value, 외부 pointer 필요
folly::F14NodeMap<UserId, UserProfile> profiles;
const UserProfile* p = &profiles.at(id);
// 다른 thread/chain이 p를 가져다 쓰는 동안 insert 안전
```

```cpp
// Bad — value가 movable이라고 ValueMap을 쓰지만 lifetime 위반
folly::F14ValueMap<int, std::string> m;
auto& s = m[1];
m.insert({2, "..."});       // rehash 가능
s += "x";                   // UB

// Good — NodeMap
folly::F14NodeMap<int, std::string> mn;
auto& s = mn[1];
mn.insert({2, "..."});
s += "x";                   // OK
```

## 안티패턴

- **`mutex`/`atomic`/`condition_variable` 같은 비이동 타입을 ValueMap에**: rehash 시 move가 컴파일 에러 또는 UB. 항상 NodeMap.
- **node hash 함수와 key compare가 같지 않은 두 map을 섞기**: extract/merge 시 ABI 호환이 깨진다. 두 map 모두 동일 trait.
- **node를 직접 `delete` 시도**: `extract()` API로 안전한 ownership transfer. 임의 delete는 chunk 상태 무효화.

## 정리

- `F14NodeMap`은 chunk에 pointer만, value는 heap node.
- `std::unordered_map` 수준의 pointer/reference 안정성.
- 큰 value, 비이동 타입, 외부 pointer 노출 시 선택.
- 작은 value에는 overhead 크다 — ValueMap 우선.
- `absl::node_hash_map`과 등가.

## 다음 편

`F14VectorMap`은 또 다른 접근이다. value를 별도 `std::vector`에 두고 chunk에는 index만 둔다. cache-friendly iteration이 가능하다.

## 관련 항목

- [Part 7-01: F14ValueMap](/blog/programming/code-review/folly/part7-01-f14-value-map) — inline value 변형
- [Part 7-03: F14VectorMap](/blog/programming/code-review/folly/part7-03-f14-vector-map) — vector backing
- [Part 7-04: F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — 자동 선택
- [원문 — folly/container/F14Map.h](https://github.com/facebook/folly/blob/main/folly/container/F14Map.h)
