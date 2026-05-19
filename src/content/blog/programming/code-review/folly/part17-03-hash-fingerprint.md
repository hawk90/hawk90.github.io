---
title: "Part 17-03: Fingerprint64 / 128 — 분산 hash"
date: 2026-05-27T16:00:00
description: "Fingerprint의 polynomial Rabin-Karp 기반 hash — sharding, dedup, content addressing."
series: "Folly Code Review"
seriesOrder: 74
tags: [cpp, folly, hash, fingerprint, sharding]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `Fingerprint64/128`은 polynomial Rabin-Karp 기반 fixed-size hash다. `std::hash`가 in-process container용이라면 fingerprint는 *서로 다른 프로세스/머신에서 같은 입력에 같은 결과*를 보장해 sharding과 dedup의 키가 된다.

## 동기

`std::hash`는 다음을 *보장하지 않는다*.

- 같은 입력에 같은 출력 (다른 컴파일러 / 다른 실행 사이).
- 분포가 좋다는 것.
- 충돌 attack 저항.

이것들이 *in-process hash container*에서는 큰 문제가 아니다. 같은 process가 끝나면 hash 결과는 무관. 그러나 다음 경우는 결정적이다.

- **sharding** — `hash(key) % N`으로 어느 서버로 보낼지 결정. 모든 client가 같은 hash 함수를 써야.
- **content addressing** — Git blob, IPFS CID. 같은 내용이면 같은 hash.
- **dedup** — log dedup, dataset dedup. 다른 머신에서 같은 hash.

이 자리에 `std::hash`는 부적합. `Fingerprint64/128`이 답이다.

```cpp
#include <folly/Fingerprint.h>

folly::Fingerprint64 fp;
fp.update(data, len);
uint64_t h = fp.value();

// 또는 one-shot
uint64_t h2 = folly::Fingerprint64{}.update(data, len).value();
```

## 알고리즘 — Rabin-Karp polynomial hash

```text
입력: byte stream b[0], b[1], ..., b[n-1]
다항식: H(x) = b[0]*x^(n-1) + b[1]*x^(n-2) + ... + b[n-1]
       mod P(x)

P(x) = 64-bit irreducible polynomial over GF(2)
       (Folly가 고른 specific polynomial)

연산: GF(2) 다항식 산술 (XOR + shift)
```

핵심 특성:

1. **분포 균등** — 좋은 polynomial에서 거의 균등.
2. **incremental computable** — `update(chunk)` 반복 가능.
3. **다른 머신에서 같은 결과** — polynomial이 hardcoded.

```cpp
// folly/Fingerprint.h 약식
class Fingerprint64 {
 public:
  Fingerprint64& update(const uint8_t* data, size_t len) noexcept {
    for (size_t i = 0; i < len; ++i) {
      // GF(2)^64 다항식 mul + xor
      val_ = mulPoly(val_) ^ data[i];
    }
    return *this;
  }
  uint64_t value() const noexcept { return val_; }

 private:
  uint64_t val_ = 0;

  static uint64_t mulPoly(uint64_t x) noexcept {
    // hardcoded irreducible polynomial과 GF(2) multiply
    // 보통 lookup table로 가속
    return /* ... */;
  }
};
```

실제 구현은 8-byte chunk 단위 처리 + lookup table로 SWAR 가속. 그래도 SpookyHash나 xxhash보다 *느리다*. 결정적이고 sharding-safe하다는 게 가치.

## Fingerprint128 — 128-bit variant

```cpp
folly::Fingerprint128 fp;
fp.update(data, len);
auto [hi, lo] = fp.value();
// hi, lo: uint64_t 두 개
```

64-bit가 충분치 않을 때 (예: 수억 객체 dedup, birthday paradox로 충돌 우려) 128-bit 사용. 두 개의 독립된 polynomial 결과를 (hi, lo)에 담는다.

birthday bound 계산:

```text
64-bit : ~2^32 객체에서 50% 충돌 확률
128-bit: ~2^64 객체에서 50% 충돌 확률
```

수억 객체면 64-bit도 안전하지만 *완전* 안전이 필요하면 128.

## API 패턴

```cpp
// streaming
folly::Fingerprint64 fp;
fp.update(part1, len1);
fp.update(part2, len2);
auto h = fp.value();

// one-shot from StringPiece
auto h2 = folly::Fingerprint64{}
  .update(reinterpret_cast<const uint8_t*>(s.data()), s.size())
  .value();

// content-defined chunking 같은 곳에서 sliding window도 가능
// (별도 RollingFingerprint 클래스 — Folly에는 없고 직접 구현)
```

## std::hash 비교

```cpp
struct Key { std::string s; };

// in-process container
std::unordered_map<Key, V, std::hash<Key>> m;   // OK

// sharding
size_t shard = std::hash<Key>{}(k) % N;          // BAD — 다른 process에서 다른 결과 가능
size_t shard = folly::Fingerprint64{}.update(
  reinterpret_cast<const uint8_t*>(k.s.data()), k.s.size()).value() % N;   // OK
```

| 항목 | std::hash | folly::Fingerprint64 | xxhash / WyHash | SpookyHash |
|------|-----------|------------------------|------------------|--------------|
| 결정성 | 보장 안 함 | 보장 | 보장 (seed 고정) | 보장 |
| 분포 | 구현체 의존 | 좋음 | 매우 좋음 | 매우 좋음 |
| 속도 | 빠름 | 보통 | 매우 빠름 (SIMD) | 매우 빠름 |
| 64/128 | 64 | 64/128 | 64/128 | 64/128 |
| 사용처 | in-process | sharding/dedup | general fast | general fast |
| 표준 | C++ | folly | 외부 | 외부 |

`xxhash`나 `WyHash`가 더 빠르지만 folly 내부에서 sharding 키로는 `Fingerprint`가 *역사적 표준*. 새 코드라면 `SpookyHashV2`(다음 절) 또는 외부 xxhash도 검토.

## absl::Hash와의 비교

`absl::Hash<T>`는 *in-process* hash다. 같은 binary 안에서는 결정적이지만 binary 사이엔 다를 수 있다. `std::hash`의 더 일관된 버전.

```cpp
absl::Hash<Key> h;
size_t v = h(k);
```

sharding에는 부적합 — fingerprint류가 옳다.

## 코드 리뷰 포인트

- sharding 코드에 `std::hash` — 즉시 `Fingerprint64`로 교체.
- fingerprint를 `unordered_map` 키로 — 의도가 *고정 키*가 아니면 over-engineering. `std::hash`가 빠르다.
- 64-bit fingerprint로 *수십억* 객체 dedup — 128-bit 검토.
- 같은 데이터에 *다른 alignment*로 update — fingerprint는 byte stream 단위라 영향 없지만 *byte order*는 영향 있음. portable한 byte 순서로 input 만들어야.

## 자주 보는 안티패턴

```cpp
// 1. struct를 raw bytes로 fingerprint
struct K { int a; int b; };
K k{1, 2};
fp.update(reinterpret_cast<const uint8_t*>(&k), sizeof(K));
// → padding/endianness/struct layout 의존 — 다른 머신에서 다른 결과

// 2. fingerprint를 cryptographic hash로 오해
// → 의도적 충돌 만들 수 있음. Adversarial 입력엔 BLAKE3 / SHA-2.

// 3. fingerprint을 32-bit으로 잘라 sharding
size_t shard = (fp.value() & 0xFFFFFFFF) % N;
// → lower bit의 분포가 떨어질 수 있음. fp 전체로 modulo.
```

## 실전 — log dedup

```cpp
folly::F14FastSet<uint64_t> seenFingerprints;

void IngestLog(folly::StringPiece line) {
  auto fp = folly::Fingerprint64{}
    .update(reinterpret_cast<const uint8_t*>(line.data()), line.size())
    .value();
  if (!seenFingerprints.insert(fp).second) {
    return;   // 중복 — drop
  }
  Persist(line);
}
```

같은 line이 들어오면 hash가 같아 중복 검출. 다른 서버가 같은 line을 emit해도 dedup 가능 — fingerprint가 결정적이라 가능한 패턴.

## 정리

- `Fingerprint64/128`은 다른 머신에서 같은 입력에 같은 결과를 보장하는 hash.
- Rabin-Karp polynomial 기반, GF(2) 산술 + lookup table.
- sharding, content addressing, dedup 같은 자리에 `std::hash`가 아니라 fingerprint를 사용.
- cryptographic 강도는 *없음* — adversarial 입력에는 BLAKE3/SHA-2.
- 더 빠른 일반 hash가 필요하면 다음 절 SpookyHashV2 또는 외부 xxhash.

## 다음 편

[Part 17-04: SpookyHashV2](/blog/programming/code-review/folly/part17-04-spooky-hash)에서 fast non-crypto hash를 본다.

## 관련 항목

- [Folly Part 17-04 — SpookyHashV2](/blog/programming/code-review/folly/part17-04-spooky-hash)
- [Folly Part 7-05 — F14 internals](/blog/programming/code-review/folly/part7-05-f14-internals) — hash quality 요구
- [원문 — folly/Fingerprint.h](https://github.com/facebook/folly/blob/main/folly/Fingerprint.h)
