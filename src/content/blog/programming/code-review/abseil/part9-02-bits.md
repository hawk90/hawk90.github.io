---
title: "Part 9-02: bits (popcount, countl_zero)"
date: 2026-05-25T03:00:00
description: "absl::popcount, countl_zero, countr_zero — C++20 <bit>의 polyfill. SwissTable·해시·정수 압축의 핵심 primitive."
series: "Abseil Code Review"
seriesOrder: 49
tags: [cpp, abseil, numeric, bits, popcount]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## C++20 `<bit>`의 polyfill

C++20에서 `<bit>` 헤더가 들어왔다. `std::popcount`, `std::countl_zero`, `std::countr_zero`, `std::bit_width` 등. C++14/17 코드베이스에서는 쓸 수 없지만 Abseil이 동일 인터페이스를 미리 제공한다.

```cpp
#include "absl/numeric/bits.h"

uint32_t x = 0b1011'0100;

int pop  = absl::popcount(x);       // 4 — 1 비트 개수
int lz   = absl::countl_zero(x);    // 24
int tz   = absl::countr_zero(x);    // 2
int lo1  = absl::countl_one(x);     // 0
int tz1  = absl::countr_one(x);     // 0
int bw   = absl::bit_width(x);      // 8 — 표현에 필요한 비트 수
bool p2  = absl::has_single_bit(x); // false (2의 거듭제곱이 아님)
```

## 표 — 함수 카탈로그

| 함수 | 의미 | 입력 0일 때 |
|------|------|------------|
| `popcount(x)` | 1 비트 개수 | 0 |
| `countl_zero(x)` | 왼쪽(MSB) 0 개수 | N (모두 0) |
| `countr_zero(x)` | 오른쪽(LSB) 0 개수 | N |
| `countl_one(x)` | 왼쪽 1 개수 | 0 |
| `countr_one(x)` | 오른쪽 1 개수 | 0 |
| `bit_width(x)` | 비트 폭 (최상위 1의 위치 + 1) | 0 |
| `bit_ceil(x)` | x 이상 최소 2의 거듭제곱 | 1 |
| `bit_floor(x)` | x 이하 최대 2의 거듭제곱 | 0 |
| `has_single_bit(x)` | x가 2의 거듭제곱? | false |
| `rotl(x, s)` | 왼쪽 비트 회전 | 0 |
| `rotr(x, s)` | 오른쪽 비트 회전 | 0 |

타입은 *unsigned integer 한정*(uint8_t/uint16_t/uint32_t/uint64_t). signed 입력은 컴파일 에러.

## 실제 어디 쓰이나

### SwissTable의 SIMD 메타데이터

`absl::flat_hash_map`의 group 검색은 16바이트 메타에서 매칭 비트마스크를 만들고 `countr_zero`로 슬롯 인덱스를 뽑는다.

```cpp
// 의사 코드 — 실제는 SIMD intrinsic
uint16_t mask = MatchFingerprint(group, fingerprint);
while (mask) {
    int idx = absl::countr_zero(mask);
    if (slots[idx].key == key) return slots[idx].value;
    mask &= mask - 1;   // 가장 낮은 1 비트 끄기
}
```

### 가변 길이 정수 인코딩

```cpp
int BytesNeeded(uint64_t x) {
    if (x == 0) return 1;
    int bits = absl::bit_width(x);
    return (bits + 6) / 7;   // 7비트씩 묶기 (varint)
}
```

### 해시맵 capacity 계산

```cpp
size_t NextPowerOfTwo(size_t n) {
    return absl::bit_ceil(n);
}

size_t IndexMask(size_t capacity) {
    // capacity는 2의 거듭제곱
    return capacity - 1;
}
```

## 컴파일러 매핑

| 함수 | x86 BMI/POPCNT | ARM |
|------|----------------|-----|
| `popcount` | `popcnt` | `cnt` |
| `countl_zero` | `lzcnt` | `clz` |
| `countr_zero` | `tzcnt` / `bsf` | `rbit + clz` |

Abseil은 하드웨어 instruction이 있으면 그것을, 없으면 portable bit-twiddle로 fallback. 인라인 호출이 *단일 instruction*으로 컴파일되는 게 보통이다.

## 회피 패턴

```cpp
// 회피 — manual loop
int Popcount(uint32_t x) {
    int c = 0;
    while (x) { c += x & 1; x >>= 1; }
    return c;
}

// Good — hardware popcnt
int c = absl::popcount(x);
```

```cpp
// 회피 — branch로 가장 높은 비트 찾기
int Log2(uint32_t x) {
    int r = 0;
    while (x >>= 1) ++r;
    return r;
}

// Good
int r = absl::bit_width(x) - 1;   // x == 0이면 -1, 호출 전 검사
```

```cpp
// 회피 — 2의 거듭제곱 검사
bool IsPow2(uint32_t x) { return x && !(x & (x - 1)); }

// Good
bool p = absl::has_single_bit(x);
```

## C++20 마이그레이션

Abseil 함수들은 `std::` 짝과 1:1 시그니처 호환이다. 컴파일러를 C++20으로 올렸다면 다음과 같이 치환 가능.

```cpp
// before
#include "absl/numeric/bits.h"
int c = absl::popcount(x);

// after
#include <bit>
int c = std::popcount(x);
```

`namespace absl = std;` 같은 alias는 안 되지만 `using std::popcount;` 정도면 단일 함수 단위 마이그레이션이 가능하다.

## 작은 예시 — Bit Set 순회

```cpp
// uint64 비트마스크의 set 비트 인덱스를 모두 순회
void ForEachSet(uint64_t mask, std::function<void(int)> f) {
    while (mask) {
        int idx = absl::countr_zero(mask);
        f(idx);
        mask &= mask - 1;   // lowest set bit clear
    }
}

ForEachSet(0b10101100, [](int i) { std::cout << i << "\n"; });
// 2, 3, 5, 7
```

이 패턴은 SwissTable group search, bitmap allocator, sparse vector 순회 등 어디서나 등장한다.

## 정리

- `<bit>`의 polyfill — C++14/17 코드베이스에서 `popcount`·`countl_zero` 등 사용 가능.
- 입력은 unsigned 정수 한정. 0 입력 시 정의 명확(undefined behavior 없음).
- 하드웨어 popcnt/lzcnt가 있으면 그쪽으로 단일 instruction 컴파일.
- `bit_ceil`/`has_single_bit` — capacity 계산, 2의 거듭제곱 체크.
- `countr_zero` + `mask & (mask-1)` 패턴은 set bit 순회의 정석.

## 다음 장 예고

[Part 9-03: absl::optional](/blog/programming/code-review/abseil/part9-03-optional) — `std::optional`의 polyfill.

## 관련 항목

- [Part 9-01: int128 / uint128](/blog/programming/code-review/abseil/part9-01-int128)
- [Part 5-07: Swiss table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)
- [원문 — Numeric Bits](https://abseil.io/docs/cpp/guides/numeric#bit-manipulation)
