---
title: "Part 17-04: SpookyHashV2 — fast non-crypto hash"
date: 2026-05-27T17:00:00
description: "SpookyHashV2의 ARX (Add/Rotate/Xor) 기반 빠른 hash — F14의 hasher 기본 후보."
series: "Folly Code Review"
seriesOrder: 75
tags: [cpp, folly, hash, spookyhash]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `SpookyHashV2`는 Bob Jenkins의 빠른 non-cryptographic hash다. F14의 기본 hasher 후보로 분포·속도 모두 좋고, 결정적이라 sharding에도 쓸 수 있다.

## 동기

좋은 hash 함수는 다음 셋을 만족해야 한다.

1. **빠르다** — 입력 byte당 처리 비용이 작다.
2. **분포가 좋다** — avalanche test, χ² test 통과.
3. **결정적** — 같은 입력에 같은 출력.

`std::hash`는 1만 만족. `Fingerprint64`는 1,2,3 모두 OK지만 *느림*. `SpookyHashV2`는 셋 다 충족하면서 가장 빠른 축에 든다.

```text
대략적 throughput (단일 코어, 큰 입력)
  std::hash            (구현체 의존, 보통 ~1 GB/s)
  Fingerprint64         ~ 1.5 GB/s
  SpookyHashV2          ~ 6 GB/s
  xxHash3               ~ 10 GB/s (SIMD)
  WyHash                ~ 8 GB/s
  Crypto (SHA-2)         ~ 0.5 GB/s
```

`SpookyHash`는 SIMD 없이도 ARX(Add-Rotate-XOR) 연산만으로 6 GB/s를 낸다. instruction-level parallelism이 잘 풀린다.

## API

```cpp
#include <folly/hash/SpookyHashV2.h>

// one-shot
uint64_t h = folly::hash::SpookyHashV2::Hash64(
  data, len, /*seed=*/0);

uint32_t h32 = folly::hash::SpookyHashV2::Hash32(data, len, 0);

void Hash128Pair(const void* data, size_t len,
                 uint64_t* h1, uint64_t* h2) {
  folly::hash::SpookyHashV2::Hash128(data, len, h1, h2);
}

// streaming
folly::hash::SpookyHashV2 spooky;
spooky.Init(seed1, seed2);
spooky.Update(part1, len1);
spooky.Update(part2, len2);
uint64_t h1, h2;
spooky.Final(&h1, &h2);
```

세 가지 출력 크기 (32/64/128) 모두 같은 알고리즘에서 derive. 64-bit가 일반.

## 알고리즘 — ARX

```text
state: 12 x uint64_t (96 byte)

매 96-byte 블록 마다:
  for i in 0..12:
    state[i] += input[i]
    state[(i+11)%12] ^= state[(i+2)%12]
    state[(i+1)%12] = ROL(state[(i+1)%12], rotConst[i])
    state[i] += state[(i+1)%12]
```

operation:

- **Add** — `state[i] += input[i]`
- **Rotate** — `state[i] = ROL(state[i], k)`
- **XOR** — `state[i] ^= state[j]`

세 가지 모두 1-cycle 명령. 12-word state가 register pressure에 맞고 ILP가 최대.

## 내부 구현

```cpp
// folly/hash/SpookyHashV2.cpp 약식
void SpookyHashV2::Update(const void* msg, size_t len) {
  // 1. accumulate to internal buffer until 96-byte aligned
  // 2. process 96-byte blocks directly
  // 3. save remainder
  while (len >= sc_blockSize) {  // 96 bytes
    Mix(reinterpret_cast<const uint64_t*>(p),
        h0, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11);
    p   += sc_blockSize;
    len -= sc_blockSize;
  }
  std::memcpy(remainder_, p, len);
}

static void Mix(const uint64_t* d,
                uint64_t& h0, uint64_t& h1, /* ... */) {
  h0 += d[0];  h2 ^= h10; h11 ^= h0;  h0 = Rot64(h0, 11);  h11 += h1;
  h1 += d[1];  h3 ^= h11; h0  ^= h1;  h1 = Rot64(h1, 32);  h0  += h2;
  // ... 12회 repeat
}
```

`Mix`가 12 line으로 펼쳐져 inline. compiler가 register에 다 올린다.

## F14의 hasher로

```cpp
struct MyKey { uint64_t a, b; };

namespace folly {
template <>
struct hasher<MyKey> {
  size_t operator()(const MyKey& k) const noexcept {
    return hash::SpookyHashV2::Hash64(&k, sizeof(k), 0);
  }
};
}

folly::F14FastMap<MyKey, V> m;
```

F14는 H1/H2 분리를 위해 hash quality가 높을수록 좋다. SpookyHashV2는 avalanche가 좋아 H2 7-bit이 거의 균등 분포. SIMD compare의 hit rate가 최대화된다.

기본 `std::hash`도 쓸 수 있지만 lower bit 분포가 약하면 H2가 편향돼 SIMD 가속 효과가 떨어진다.

## std와의 비교

| 항목 | std::hash | SpookyHashV2 | xxHash3 | WyHash |
|------|-----------|----------------|----------|---------|
| 결정성 | X | O | O | O |
| 큰 입력 throughput | 보통 | 6 GB/s | 10 GB/s | 8 GB/s |
| 작은 입력 (≤16 byte) | 빠름 | 빠름 | 빠름 | 매우 빠름 |
| avalanche | 구현체 의존 | 좋음 | 좋음 | 좋음 |
| seed | 보통 X | O | O | O |
| 표준 | C++ | folly | 외부 | 외부 |

가장 빠른 비-cryptographic hash는 xxHash3 또는 WyHash. SpookyHash는 *folly 안에서 일관성*과 *결정성*을 동시 제공.

## Cryptographic vs non-cryptographic

| 속성 | non-crypto | crypto |
|------|-------------|--------|
| 충돌 발견 | adversary가 만들 수 있음 | computationally infeasible |
| preimage attack | 가능 | infeasible |
| 속도 | 매우 빠름 | 느림 |
| 사용처 | hash table, dedup, shard | password, MAC, integrity |

SpookyHashV2는 *비-cryptographic*. 사용자 입력을 신뢰할 수 없으면 (예: 외부에서 hash key를 보내고 충돌 attack을 시도) cryptographic hash 필요. fbcode에서는 internal RPC라 SpookyHash로 충분.

## 코드 리뷰 포인트

- 외부 입력으로 hash key를 만드는 곳에 non-crypto hash — DoS 가능. Crypto hash 또는 random seed 매번.
- `std::hash` 결과를 sharding 키로 — 결정적이지 않음. SpookyHash 또는 Fingerprint.
- F14 hasher가 trivial (identity 같은) — H2 분포 깨짐. SpookyHash 같은 quality hash.
- 작은 키 (≤16 byte)에 SpookyHash 한 번 — 오버헤드 클 수 있음. WyHash가 작은 키에 더 적합.

## 자주 보는 안티패턴

```cpp
// 1. seed를 매번 random — 결정성 잃음
uint64_t h = SpookyHashV2::Hash64(data, len, std::random_device{}());
// → seed 고정해야 다른 process에서 비교 가능

// 2. 32-bit truncate해서 사용
uint32_t h32 = static_cast<uint32_t>(SpookyHashV2::Hash64(...));
// → 32-bit이 필요하면 Hash32() 호출 (별도 mixing)

// 3. 동일 객체를 두 번 update (잘못된 incremental 사용)
SpookyHashV2 s; s.Init(0, 0);
s.Update(data, len);
s.Final(&h1, &h2);
s.Update(more, more_len);  // 초기화 안 했음 — 의도 불명
s.Final(&h1b, &h2b);
```

## 실전 — Bloom filter

```cpp
class BloomFilter {
  std::vector<uint64_t> bits_;
  size_t k_;   // hash 개수

  void add(folly::ByteRange data) {
    uint64_t h1, h2;
    folly::hash::SpookyHashV2::Hash128(data.data(), data.size(), &h1, &h2);
    // double hashing trick — h1 + i*h2
    for (size_t i = 0; i < k_; ++i) {
      size_t bit = (h1 + i * h2) % (bits_.size() * 64);
      bits_[bit / 64] |= (uint64_t(1) << (bit % 64));
    }
  }
};
```

SpookyHashV2의 128-bit 결과를 둘로 쪼개 *double hashing*. 한 hash 계산으로 k개의 가짜 hash를 얻는다.

## 정리

- `SpookyHashV2`는 ARX 기반 fast non-crypto hash, 6 GB/s.
- 결정적 — 다른 머신에서 같은 결과.
- F14의 기본 hasher 후보로 분포가 좋다.
- cryptographic은 아님 — 외부 input에서 attack 우려시 별도 도구.
- 더 빠른 hash가 필요하면 xxHash3 / WyHash 외부.

## 다음 편

Part 18로 넘어가 init, Indestructible, MicroLock류를 본다.

## 관련 항목

- [Folly Part 17-03 — Fingerprint](/blog/programming/code-review/folly/part17-03-hash-fingerprint)
- [Folly Part 7-05 — F14 internals](/blog/programming/code-review/folly/part7-05-f14-internals)
- [원문 — folly/hash/SpookyHashV2.h](https://github.com/facebook/folly/blob/main/folly/hash/SpookyHashV2.h)
- [Bob Jenkins SpookyHash 페이지](http://burtleburtle.net/bob/hash/spooky.html)
