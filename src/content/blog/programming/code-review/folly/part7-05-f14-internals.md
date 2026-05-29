---
title: "Part 7-05: F14 internals (SIMD probing)"
date: 2026-05-24T11:00:00
description: "F14 chunk 구조와 SIMD probing — SSE2/AVX/NEON dispatch, H1/H2 hash split, 14-slot 선택 이유."
series: "Folly Code Review"
seriesOrder: 34
tags: [cpp, folly, f14, simd, internals]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

F14의 핵심은 hash를 H1(chunk index)과 H2(7-bit fragment)로 쪼개 SIMD 명령 한 번으로 14 slot의 H2를 동시에 비교하는 것이다. 평균 lookup은 1.0-1.5 chunk probe로 끝난다.

## 동기

Open addressing hash map의 핵심 비용은 *probe 횟수*다. 일반 linear probing은 슬롯을 하나씩 본다. quadratic은 좀 낫지만 cache 비효율. SIMD가 있다면 16 byte를 한 instruction으로 비교할 수 있는데, hash slot 메타 정보를 16 byte 안에 담는 데 모든 노력이 들어간다.

```text
naive linear probing — N slot 보기
  cache miss N/8 회
  비교 N 회

SIMD chunk probing — 14 slot 한 번에
  cache miss 1 회 (chunk가 cache line)
  SIMD compare 1 회 → bitmask
  실제 key compare는 hit 후보(평균 < 1) 만
```

이게 absl::flat_hash_map / folly::F14 의 *왜 빠른가*에 대한 한 줄 답.

## Chunk 구조

![F14 Chunk Layout](/images/blog/folly/diagrams/part7-05-f14-chunk.svg)

`controls`가 16 byte인 이유: SSE2 register가 정확히 16 byte. ARM NEON도 128-bit register. 한 번에 load + compare 가능.

`slots`는 14개. 16 - 2(overflow counter + sentinel) = 14. 이 숫자가 클래스 이름의 14다.

### Control byte의 의미

```text
each control byte (8 bit)
  bit 7   = empty?   (1 = empty)
  bit 6   = full?    (1 = occupied)
  bit 5-0 = H2 fragment (6-bit, 정확히는 약간 다름)

특수 값:
  0x80 = Empty
  0xFE = Tombstone (deleted, probe 계속)
```

(folly version에 따라 bit packing이 약간 다르다. SSE2 movemask가 sign bit을 보는 점은 같다.)

### Hash split — H1 / H2

```cpp
// 약식
uint64_t h = hasher(key);
size_t   chunk_idx = (h >> 7) & chunk_mask_;   // H1
uint8_t  fragment  = h & 0x7F;                 // H2 (7-bit)
```

- **H1**: chunk 선택 (어느 chunk를 본다).
- **H2**: 같은 chunk 안 slot 식별 (control byte와 비교).

H2가 일치하면 *key 비교 후보*가 된다. 다르면 100% miss.

## SIMD probing — SSE2

![F14 SIMD probing 3-step](/images/blog/folly/diagrams/part7-05-f14-simd-probing.svg)

### 왜 SIMD가 본질적인가

scalar vs SIMD 차이를 일반화해 보면:

![SIMD parallel probing](/images/blog/cpp-concepts/diagrams/simd-parallel-probing.svg)

F14의 chunk size = 14 (SSE2 16 중 14 slot + 1 control header + 1 overflow counter)도 같은 논리에서 나온다. SIMD register 폭에 chunk를 맞춰야 비교가 1 instruction으로 끝난다.

```cpp
// folly/container/detail/F14Mask.h 약식
struct DenseMaskIter {
  uint32_t mask;
  bool more() const { return mask != 0; }
  unsigned next() {
    unsigned i = __builtin_ctz(mask);   // 첫 1 비트
    mask &= mask - 1;                   // 그 비트 끄기
    return i;
  }
};

DenseMaskIter matchesSSE(const __m128i& controls, uint8_t fragment) {
  __m128i target = _mm_set1_epi8(fragment);
  __m128i cmp    = _mm_cmpeq_epi8(controls, target);
  uint32_t mask  = _mm_movemask_epi8(cmp);
  return DenseMaskIter{mask};
}
```

3 instruction:

1. `set1_epi8`: 16-byte register를 fragment로 채움.
2. `cmpeq_epi8`: control[i] == fragment ? 0xFF : 0x00.
3. `movemask_epi8`: 각 byte의 MSB를 모아 16-bit mask.

mask의 각 bit가 *그 slot이 match 후보*. `__builtin_ctz`로 lowest set bit을 찾아 한 번에 한 후보씩 처리.

## SIMD probing — NEON

```cpp
// 약식 — ARM NEON
DenseMaskIter matchesNEON(uint8x16_t controls, uint8_t fragment) {
  uint8x16_t target = vdupq_n_u8(fragment);
  uint8x16_t cmp    = vceqq_u8(controls, target);
  // 16 byte → 16-bit mask 만들기는 SSE보다 번거롭다
  uint8x8_t  narrow = vshrn_n_u16(vreinterpretq_u16_u8(cmp), 4);
  uint64_t   m;
  vst1_u64(&m, vreinterpret_u64_u8(narrow));
  // m의 every-nibble 패턴 → 16-bit mask
  return DenseMaskIter{packNibbles(m)};
}
```

NEON은 `movemask` equivalent가 없어 한 단계 더 거친다. 그래도 byte-by-byte 비교보다 압도적으로 빠르다.

## SWAR fallback

SIMD 없는 platform(작은 임베디드 등)을 위한 폴백.

```cpp
// 8-byte SWAR로 8개 byte를 한 word에 비교
uint64_t cmp_swar(uint64_t controls8, uint8_t fragment) {
  uint64_t target = 0x0101010101010101 * fragment;
  uint64_t x = controls8 ^ target;     // match면 0
  // zero byte detection
  return ((x - 0x0101010101010101) & ~x & 0x8080808080808080);
}
```

`(x - 1) & ~x & 0x80` 트릭으로 byte zero를 찾는다. 16 byte를 두 word로 나눠 처리.

## Probe sequence

```cpp
// 약식 — full lookup
Iterator find(const Key& k) {
  uint64_t h = hash(k);
  size_t chunk_idx = (h >> 7) & mask_;
  uint8_t frag = (h & 0x7F);

  for (size_t probe = 0; ; ++probe) {
    Chunk& c = chunks_[chunk_idx];
    auto matches = matchesSSE(c.controls(), frag);
    while (matches.more()) {
      size_t slot = matches.next();
      if (KeyEqual{}(slotKey(c, slot), k)) return makeIter(c, slot);
    }
    if (!c.hostedOverflow()) return end();
    // linear probe to next chunk
    chunk_idx = (chunk_idx + 1) & mask_;
  }
}
```

성공 lookup:

- 평균 1.0 chunk probe (대부분 첫 chunk).
- SIMD compare 1회.
- Key compare 1회 (H2가 7-bit이므로 false positive 1/128).

실패 lookup:

- 평균 1.05 chunk probe.
- 빈 slot 존재 → 즉시 end.

## 왜 14 slot인가

16 byte register - 2 byte overhead = 14 slot. overhead는:

1. **overflow counter** (1 byte): 이 chunk가 다른 chunk로 넘쳐 흘러간 entry 수. erase 시 tombstone 결정에 사용.
2. **sentinel/padding** (1 byte): SIMD compare에서 마지막 byte를 항상 unmatched로 만들어 false hit 방지.

14는 magical number가 아니라 *register size - bookkeeping*의 결과.

absl::flat_hash_map은 16 slot group + 별도 metadata로 다른 packing 선택. trade-off가 있다. folly는 cache locality를 약간 더 중시.

## Tombstone vs Empty

```cpp
// erase 후 control byte
if (chunk_has_overflow) {
  control[slot] = TOMBSTONE;   // probe 계속해야 함
} else {
  control[slot] = EMPTY;       // probe 멈춤 OK
}
```

tombstone이 많아지면 lookup이 길어진다. F14는 erase 시 overflow 체크해 tombstone 회피 가능하면 EMPTY로 표시. rehash가 자연스럽게 tombstone을 청소.

## std/abseil 비교

| 항목 | std::unordered_map | absl::flat_hash_map | folly::F14 |
|------|---------------------|----------------------|--------------|
| 구조 | separate chaining | open addressing | open addressing |
| group | N/A | 16 slot | 14 slot |
| SIMD | X | SSE2 + ARM | SSE2 + AVX + NEON + SWAR |
| probe | linked list | quadratic | linear chunk |
| max load | 1.0+ | 0.875 | 0.875 |
| pointer 안정 | yes | flat=no, node=yes | Value=no, Node=yes |

성능은 absl과 folly가 거의 동등. 차이는 platform support 폭(folly가 더 넓음)과 variant 종류(folly가 Vector/Fast 추가).

## 코드 리뷰 포인트

```cpp
// Good — hash quality 확인
struct MyKey { uint64_t a, b; };
namespace folly {
template <> struct hasher<MyKey> {
  size_t operator()(const MyKey& k) const {
    return hash::SpookyHashV2::Hash64(&k, sizeof(k), 0);
  }
};
}
```

H2(7-bit)가 잘 분포해야 false positive가 적다. `MurmurHash`, `SpookyHash`, `xxhash`, `WyHash` 등 quality hash를 쓴다.

```cpp
// Bad — 사용자 hash가 lower 7-bit이 일정
struct BadHasher {
  size_t operator()(int k) const { return k * 4; }  // bit 0-1 always 0
};
// H2가 8개 값으로 제한 → SIMD 가속 효과 1/16
```

H2 distribution이 깨지면 SIMD 가속이 사라진다. multiplicative hash나 더 좋은 hash로.

## 안티패턴

- **load factor를 0.95+로 강제**: SIMD 가속 효과가 사라지고 tombstone 누적. default(0.875) 유지.
- **빈번한 erase + reserve 미호출**: tombstone이 쌓이면 lookup이 점점 느려진다. 주기적 rehash(`m.reserve(m.size())`)로 청소.
- **hash function이 trivial(identity)**: H1/H2 분리가 망가져 collision 폭발.

## 정리

- chunk 16-byte control + 14 slot 구조로 SIMD compare 한 번에 14개 비교.
- H1(chunk index), H2(7-bit fragment) hash split.
- SSE2/AVX/NEON 모두 지원, SWAR 폴백.
- 평균 1.0-1.5 chunk probe로 lookup 완료.
- hash quality가 SIMD 가속의 전제.

## 다음 편

Part 8로 넘어가 Folly의 컨테이너 라이브러리(SmallVector, FixedString, AtomicHashMap, ConcurrentHashMap, EvictingCacheMap)를 본다.

## 관련 항목

- [Part 7-01: F14ValueMap](/blog/programming/code-review/folly/part7-01-f14-value-map) — 표층 API
- [Part 7-04: F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — variant 선택
- [Meta engineering blog — F14](https://engineering.fb.com/2019/04/25/developer-tools/f14/)
- [Abseil Swiss Tables blog](https://abseil.io/blog/20180927-swisstables)
- [원문 — folly/container/F14Map.h](https://github.com/facebook/folly/blob/main/folly/container/F14Map.h)
