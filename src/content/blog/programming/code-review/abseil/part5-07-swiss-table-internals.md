---
title: "Part 5-07: Swiss Table internals — control byte, SIMD probing"
date: 2026-05-24T10:00:00
description: "Part 5-07: Swiss Table 내부 — H1/H2 해시 분할, control byte 그룹, SSE2/SSE3/NEON SIMD probing, tombstone 처리."
series: "Abseil Code Review"
seriesOrder: 33
tags: [cpp, abseil, swiss-table, simd, internals]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

Swiss Table은 **57비트 해시(H1)로 슬롯 그룹 인덱스**를, **7비트 해시(H2)로 슬롯 내 빠른 필터링**을 하는 open-addressing hash table이다. 핵심은 16개 슬롯의 control byte를 *한 번의 SIMD 명령(SSE2 `_mm_cmpeq_epi8` 또는 NEON `vceqq_u8`)*으로 비교해 후보를 찾는 점. CppCon 2017 Matt Kulukundis 강연으로 공개된 이래 abseil, F14(Meta), boost::unordered_flat 등이 채택했다.

## 핵심 아이디어

전통 open-addressing의 문제: probing 시 매 슬롯마다 key 비교(메모리 접근 + comparator 호출)가 필요하다. 슬롯이 empty/deleted/full인지도 분리 정보가 필요.

Swiss Table은 **control byte**라는 메타데이터 배열을 따로 둔다. 각 슬롯 1바이트.

**control byte 의미:**

- bit 7 = 1 → 빈 슬롯 (empty / deleted / sentinel 구분은 하위 비트)
- bit 7 = 0 → full 슬롯, 하위 7비트 = H2 (해시 일부)

specific values:
- `0b1xxxxxxx`: empty=`0b10000000`, deleted=`0b11111110`, sentinel=`0b11111111`
- `0b0xxxxxxx`: full, 하위 7비트가 H2

전체 동작을 한눈에 정리하면 다음과 같다.

![Swiss Table H1/H2 split과 SIMD match](/images/blog/abseil/diagrams/part5-07-swiss-table-internals.svg)

## H1, H2 분할

64비트 해시를 두 부분으로 나눈다.

64-bit hash = `[H1 (57 bits) | H2 (7 bits)]`.

| 부분 | 용도 |
|------|------|
| H1 | `H1 % capacity` → 시작 슬롯 그룹 인덱스 |
| H2 | control byte와 비교될 7-bit fingerprint |

H2가 같다고 key가 같다는 보장은 없다 (7비트만 비교). 하지만 *다르면 확실히 다르다* — 즉, 빠른 필터다.

## SIMD probing

slots는 그룹 단위로 처리한다. 한 그룹 = 16 슬롯 (SSE2 기준). 검색 흐름:

```cpp
// 의사 코드
size_t probe = H1 % capacity;
while (true) {
  Group g = LoadGroup(ctrl + probe);   // 16 ctrl bytes를 SIMD 레지스터로
  Mask candidates = g.Match(H2);        // H2와 일치하는 비트 마스크 (16비트)
  for (int i : candidates) {
    if (key_equal(slot[probe+i].key, key)) return slot[probe+i];
  }
  if (g.HasEmpty()) return end();       // empty 만나면 종료
  probe = (probe + GroupSize) & mask;
}
```

`Group::Match(H2)`는 SSE2에서 다음 한 줄이다.

```cpp
__m128i ctrl = _mm_loadu_si128((__m128i*)ctrl_ptr);
__m128i target = _mm_set1_epi8(H2);
__m128i eq = _mm_cmpeq_epi8(ctrl, target);
uint16_t mask = _mm_movemask_epi8(eq);
```

16개 슬롯을 1 cycle에 비교한다. 후보가 평균 0~1개이므로 실제 key 비교는 거의 없다.

### scalar vs SIMD probe — 그림

이 한 줄 SIMD가 어떤 차이를 만드는지 직관적으로 보면:

![SIMD parallel probing](/images/blog/cpp-concepts/diagrams/simd-parallel-probing.svg)

scalar 구현은 16번의 직렬 비교가 필요하지만, `_mm_cmpeq_epi8`는 단일 명령으로 16-way 비교를 수행한다. 결과 비트마스크는 `_mm_movemask_epi8`로 16-bit 정수로 압축되고 `bsf`로 첫 매치 인덱스를 뽑는다. 평균 probe 길이를 10\~16배 줄이는 핵심 트릭이다.

## NEON / portable fallback

ARM64는 NEON으로 같은 동작이 가능하다.

```cpp
// 요약
uint8x16_t ctrl = vld1q_u8(ctrl_ptr);
uint8x16_t target = vdupq_n_u8(H2);
uint8x16_t eq = vceqq_u8(ctrl, target);
// 16비트 mask 추출은 NEON에 직접 명령이 없어 별도 변환
```

SSE2/NEON이 없는 플랫폼은 portable fallback. 8바이트 그룹, scalar 비교.

```cpp
// absl/container/internal/raw_hash_set.h (요약 fallback)
struct GroupPortableImpl {
  uint64_t ctrl;
  BitMask Match(h2_t hash) const {
    // SWAR (SIMD Within A Register) trick
    auto x = ctrl ^ (LSBs * static_cast<uint64_t>(hash));
    return BitMask((x - LSBs) & ~x & MSBs);
  }
};
```

SWAR(SIMD within a register) bit trick으로 8 슬롯을 한 번에 비교. 진짜 SIMD보다 느리지만 portable.

## tombstone (deleted)

erase가 일어나면 슬롯은 *empty*가 아니라 *deleted*(tombstone)이 된다. probing 중 deleted는 *건너뛰고 계속*, empty는 *종료* — 같은 키가 더 뒤에 있을 가능성이 없기 때문.

tombstone이 누적되면 probe 거리가 길어진다. Swiss Table은 임계치(`load_factor + tombstone_factor`)에 도달하면 `rehash_and_grow_if_necessary`로 정리한다.

## probing 전략 — quadratic

probe 인덱스는 다음과 같이 증가한다.

```cpp
size_t probe = H1 % capacity;
size_t group_index = 0;
while (...) {
  // 그룹 검사
  group_index++;
  probe = (probe + group_index * GroupSize) & mask;
}
```

triangular numbers (1, 3, 6, 10, ...) × GroupSize. capacity가 2의 거듭제곱이면 모든 슬롯을 정확히 한 번씩 방문하는 수학적 보장이 있다(triangular number theorem).

## capacity 정책

capacity는 항상 `2^k - 1`. 마지막 슬롯이 sentinel 역할.

```text
capacity = 15 → ctrl[16] = sentinel
capacity = 31 → ctrl[32] = sentinel
```

이 sentinel이 `End()` iterator 종료 조건이다.

## load factor

기본 max load factor는 0.875 (7/8). H2가 7비트라 같은 H2 collision이 평균 1/128. 슬롯 그룹 16에서 평균 후보가 거의 0~1.

load_factor를 낮추면 (예: 0.5) lookup이 빨라지지만 메모리 사용이 늘어난다. abseil은 0.875로 균형을 잡는다.

## 실제 코드 위치

`absl/container/internal/raw_hash_set.h`가 핵심 구현. flat_hash_map, flat_hash_set, node_hash_map, node_hash_set이 모두 `raw_hash_set<Policy>`를 instantiation한다.

```cpp
// 요약
class CommonFields {
  ctrl_t* ctrl_;        // control byte 배열
  void* slots_;         // 슬롯 배열
  size_t size_;
  size_t capacity_;
};

template <typename Policy, ...>
class raw_hash_set {
  CommonFields settings_;

  iterator find(const key_type& key) const {
    auto hash = hash_function()(key);
    auto seq = probe(ctrl_, hash, capacity_);
    while (true) {
      Group g{ctrl_ + seq.offset()};
      for (uint32_t i : g.Match(H2(hash))) {
        if (Policy::apply(EqualElement{key, eq_}, slot_at(seq.offset() + i)))
          return iterator_at(seq.offset() + i);
      }
      if (g.MaskEmpty()) return end();
      seq.next();
    }
  }
};
```

`Policy`가 key 추출/비교/이동/소멸을 정의한다. set/map은 같은 코어를 공유하고 Policy만 다르다.

## 비교 — F14 (Meta)

Meta의 F14도 같은 아이디어다 — 14비트 fingerprint를 한 cache line(14 슬롯)에 packed. abseil의 H2 7비트보다 충돌 가능성이 낮다(false candidate 적음). 트레이드오프: 슬롯당 메타 크기가 더 크다.

| 항목 | abseil Swiss | Meta F14 |
|---|---|---|
| fingerprint bits | 7 | 14 |
| 그룹 크기 | 16 (SSE2) | 14 (cache line aligned) |
| metadata 위치 | 별도 배열 | 슬롯과 같은 청크 |

두 구현 모두 std::unordered_map보다 압도적으로 빠르다. 워크로드에 따라 미세 차이.

## 코드 리뷰 포인트

이 절은 *내부* 설명이라 직접적인 리뷰 룰은 적다. 다만:

- **hash function 품질이 중요하다.** H2가 7비트라 hash가 분포가 나쁘면 collision이 폭증.
- **load_factor 변경은 잘 모르면 손대지 않는다.** abseil 기본이 균형점.
- **erase가 많은 워크로드**는 tombstone 누적으로 점차 느려진다. 주기적 rehash 검토.

## 정리

- Swiss Table = H1(슬롯 인덱스) + H2(7비트 fingerprint) + control byte 그룹.
- 16개 슬롯의 control byte를 SIMD 한 명령으로 비교.
- empty/deleted 분리로 probe 종료 조건이 정확.
- triangular probing으로 모든 슬롯 방문 보장.
- tombstone 누적 시 자동 rehash.
- abseil flat_hash_map/set, node_hash_map/set 모두 `raw_hash_set<Policy>` 위에 있음.

## 다음 편

Part 5가 끝났다. [Part 6-01 — absl::Mutex](/blog/programming/code-review/abseil/part6-01-mutex)에서 동기화 primitive로 넘어간다.

## 관련 항목

- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Part 5-03 — node_hash_map](/blog/programming/code-review/abseil/part5-03-node-hash-map)
- [Folly Part 7-05 — F14 internals](/blog/programming/code-review/folly/part7-05-f14-internals)
- [CppCon 2017 — Matt Kulukundis, Designing a Fast, Efficient, Cache-friendly Hash Table](https://www.youtube.com/watch?v=ncHmEUmJZf4)
