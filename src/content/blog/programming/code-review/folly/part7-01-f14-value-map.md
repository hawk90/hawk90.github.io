---
title: "folly::F14ValueMap vs std::unordered_map"
date: 2026-06-05T09:12:00
description: "F14ValueMap의 in-place value 저장과 std::unordered_map node-based의 차이, 성능과 reference 안정성."
series: "Folly Code Review"
seriesOrder: 30
tags: [cpp, folly, f14, hash-map, simd]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`F14ValueMap`은 value를 chunk slot에 in-place 저장하는 Swiss-table 계열 hash map이다. `std::unordered_map`(node-based)보다 lookup 2-3배, insert 1.5-2배 빠르고 메모리도 작다. 대신 rehash 시 reference/iterator가 무효화된다.

## 동기

`std::unordered_map`은 separate chaining 기반이다. 각 bucket이 linked list, 각 노드는 별도 할당. cache miss가 매 lookup마다 1-2회 발생.

```text
std::unordered_map<int, int>의 lookup 비용
  1. bucket 인덱스 계산 (hash & mask)
  2. bucket 배열 접근   (cache miss 1회)
  3. linked list 순회   (cache miss N회, N=avg chain length)
  4. key 비교
```

Swiss-table(Google의 absl::flat_hash_map)이 이 문제에 답을 냈다. F14는 그 idea를 가져와 chunk 단위 SIMD probing, 5-bit hash fragment, 14-slot per chunk로 다듬은 변형이다.

```cpp
folly::F14ValueMap<std::string, int> m;
m["a"] = 1;
m["b"] = 2;
// internally: chunks of 14 slots, SIMD가 14개 동시 검사
```

## API & 사용법

`F14ValueMap`은 `std::unordered_map`의 거의 모든 멤버를 제공한다.

```cpp
#include <folly/container/F14Map.h>

folly::F14ValueMap<std::string, int> m;

// 표준 인터페이스
m.emplace("hello", 1);
m["world"] = 2;
m.find("hello");
m.contains("world");      // C++20 식 (folly는 더 일찍 제공)
m.erase("hello");

// F14 전용
m.reserve(1000);          // chunk 할당 미리
m.bucket_count();         // chunk 수 × 14
m.computeStats();         // chunk fullness, collision 등
```

큰 차이는 rehash 동작이다. `std::unordered_map`은 rehash 후에도 *node pointer는 유지*된다. F14ValueMap은 값을 옮기므로 pointer가 invalid.

```cpp
folly::F14ValueMap<int, std::string> m;
auto& ref = m[1];          // 1을 추가
ref = "hello";
for (int i = 0; i < 100; ++i) m[i] = "x";   // rehash 가능
// ref는 이제 invalid — UB
```

이게 NodeMap이 따로 있는 이유.

## 내부 구현

### Open addressing 기반 위에 chunk

F14는 *open addressing* 위에 SIMD-friendly *chunk*를 얹은 구조다. 먼저 일반 open addressing의 기본 동작이 어떻게 흐르는지부터.

![Open addressing probing](/images/blog/cpp-concepts/diagrams/hash-table-probing.svg)

hash로 첫 위치를 잡고, 충돌이면 probe하며 이어진다. 일반 구현은 한 slot씩 비교하지만, F14는 *14-slot chunk*를 한 단위로 묶어 SIMD로 한 번에 비교한다 — probe count가 평균 1\~2 chunk로 떨어진다.

### Chunk 구조

![F14 chunk layout](/images/blog/folly/diagrams/part7-01-f14-chunk-layout.svg)

```text
[ control bytes (16B) | slot[0] | slot[1] | ... | slot[13] | overflow counter (1B) ]
```

한 chunk는 14개 slot. control bytes는 각 slot의 상태와 hash fragment(7-bit).

```text
control byte:
  bit 7   : empty/full
  bit 6   : tombstone/live
  bit 5-1 : 5-bit hash fragment (H2)
  bit 0   : reserved
```

(folly는 시기에 따라 정확히 7-bit fragment를 다르게 packing 한다. core idea는 같다.)

### Lookup 흐름

```cpp
// 약식
Iterator find(const Key& k) {
  size_t h = hash(k);
  size_t chunk_idx = (h >> 7) & mask_;     // H1
  uint8_t fragment = h & 0x7F;             // H2

  while (true) {
    Chunk& c = chunks_[chunk_idx];
    // SIMD 비교: 14 control bytes vs fragment
    uint32_t hits = SimdMatch(c.controls, fragment);
    while (hits) {
      int slot = __builtin_ctz(hits);
      if (c.slots[slot].key == k) return Iterator{...};
      hits &= hits - 1;                    // 다음 hit
    }
    if (!c.hasOverflow()) return end();    // 빈 slot 있음
    chunk_idx = (chunk_idx + 1) & mask_;
  }
}
```

핵심:

1. hash를 H1(chunk 선택)과 H2(slot 식별) 두 part로 분리.
2. SIMD 명령어 1번으로 14개 control byte를 fragment와 비교.
3. hit이면 key 전체 비교, miss면 다음 chunk.

`SimdMatch`는 platform별로 다르다.

- x86 SSE2: `_mm_cmpeq_epi8` + `_mm_movemask_epi8`.
- x86 AVX2: 32-byte 처리 가능 (folly는 16B chunk라 SSE2 충분).
- ARM NEON: `vceqq_u8` + `vshrn_n_u16`.
- 폴백: 8 byte씩 SWAR(`(c ^ fragment) - 0x01... & ~ ...`).

### Memory layout 효과

```text
std::unordered_map<int, int> 64개 항목 메모리:
  bucket[]          : 128 * 8 = 1024 B
  node[]            : 64 * (sizeof(int)*2 + next ptr) = 1024 B  (다른 영역)
  총                : ~2 KB, 두 영역 cache miss
  per entry        : ~32 B

folly::F14ValueMap<int, int> 64개 항목:
  chunks[5]         : 5 * (16 + 14*8 + 1) = ~640 B  (한 영역)
  per entry        : ~10 B
```

3분의 1 메모리, 한 cache line에 여러 entry. dense 검색에서 absolute 차이가 크다.

## std/abseil 비교

```cpp
// std
std::unordered_map<K, V> std_map;

// abseil
absl::flat_hash_map<K, V> abs_map;     // open addressing, value in slot
absl::node_hash_map<K, V> abs_node;    // 별도 node, pointer 안정

// folly
folly::F14ValueMap<K, V> f14v;         // value in chunk slot
folly::F14NodeMap<K, V>  f14n;         // 별도 node, pointer 안정
folly::F14VectorMap<K, V> f14vec;      // value in vector
folly::F14FastMap<K, V>  f14fast;      // 크기에 따라 자동 선택
```

`F14ValueMap`은 `absl::flat_hash_map`과 사상이 같다. 차이:

| 항목 | absl::flat_hash_map | folly::F14ValueMap |
|------|---------------------|--------------------|
| Group size | 16 slot | 14 slot |
| Control byte | 7-bit + sentinel | 비슷한 packing |
| Probe | quadratic | linear (chunk 단위) |
| max load factor | 0.875 | 0.875 |
| Allocator hook | 표준 | 표준 + Meta 확장 |
| 이름 규칙 | flat = value, node = pointer | Value/Node/Vector/Fast |

성능은 거의 동등. workload에 따라 5-10% 차이.

## 코드 리뷰 포인트

```cpp
// Bad — pointer를 long-lived 저장
folly::F14ValueMap<int, std::string> m;
const std::string* p = &m[1];
m.emplace(...);             // rehash 가능
LOG(INFO) << *p;            // UB

// Good — Node map 또는 key로 보관
folly::F14NodeMap<int, std::string> mn;
const std::string* p = &mn[1];   // stable

// 또는
int key = 1;
LOG(INFO) << m[key];        // 매번 lookup, stable
```

ValueMap에서 reference를 외부로 노출하지 않는다. 필요하면 NodeMap 또는 key를 저장.

```cpp
// Bad — reserve 없이 큰 insert
folly::F14ValueMap<int, int> m;
for (int i = 0; i < 1'000'000; ++i) m.emplace(i, i);
// rehash 여러 번

// Good
folly::F14ValueMap<int, int> m;
m.reserve(1'000'000);
for (int i = 0; i < 1'000'000; ++i) m.emplace(i, i);
```

`reserve`는 final size에 맞춰 chunk를 미리 할당한다. rehash 비용이 0.

## 안티패턴

- **`operator[]`로 의도 모호한 access**: `operator[]`는 없으면 *기본값 생성 + insert*. read-only면 `find`/`at` 또는 C++17 `contains`.
- **iterator 보관 후 insert**: 어떤 hash map이든 위험. F14는 더 strict — *모든* insert가 잠재적 rehash. iterator는 즉시 사용.
- **shadow hash function 작성**: `folly::F14*Map`은 `folly::hasher<K>` 또는 `std::hash<K>` default. 사용자 hash가 충돌이 잦으면 SIMD 가속 무의미. quality 좋은 hash 사용 (folly의 `Hash.h`).

## 정리

- `F14ValueMap`은 chunk 14-slot + SIMD probing의 flat hash map.
- `std::unordered_map` 대비 lookup 2-3배, 메모리 1/3.
- value in-place 저장 → rehash 시 reference/iterator 무효화.
- pointer 안정성이 필요하면 `F14NodeMap`(다음 글).
- `reserve`로 rehash 피하기.

## 다음 편

`F14NodeMap`은 value를 별도 node에 두어 pointer 안정성을 제공한다. 어떻게 동작하고 어떤 경우에 쓰는지.

## 관련 항목

- [Part 7-02: F14NodeMap](/blog/programming/code-review/folly/part7-02-f14-node-map) — pointer 안정 변형
- [Part 7-04: F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — 자동 선택
- [Part 7-05: F14 internals](/blog/programming/code-review/folly/part7-05-f14-internals) — SIMD probing 상세
- [원문 — folly/container/F14Map.h](https://github.com/facebook/folly/blob/main/folly/container/F14Map.h)
- [Meta engineering blog — F14](https://engineering.fb.com/2019/04/25/developer-tools/f14/)
