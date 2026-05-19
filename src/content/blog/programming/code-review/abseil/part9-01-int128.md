---
title: "Part 9-01: int128 / uint128"
date: 2026-05-25T02:00:00
description: "absl::int128, uint128 — 64비트로 부족한 곳을 메우는 128비트 정수. 컴파일러 builtin과 emulation 양쪽을 가린 ABI."
series: "Abseil Code Review"
seriesOrder: 48
tags: [cpp, abseil, numeric, int128, integer]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 왜 128비트가 필요한가

64비트 정수의 한계는 두 곳에서 자주 부딪힌다.

- **광범위 timestamp** — 나노초 epoch는 64비트로 ~292년. 마이크로초로는 ~58만 년. 곱·누적이 들어가면 부족해진다.
- **누적 통계** — `count × value²` 같은 분산 계산.
- **암호·해시 합성** — SipHash, BLAKE 같은 알고리즘이 128비트 중간 결과를 요구.

Clang/GCC는 `__int128`을 비표준 확장으로 제공하지만 MSVC는 없다. Abseil은 *모든 플랫폼*에 동일 인터페이스를 보장한다.

비트 레이아웃과 carry 처리는 다음과 같다.

![uint128 비트 레이아웃과 carry](/images/blog/abseil/diagrams/part9-01-int128-bit-layout.svg)

```cpp
#include "absl/numeric/int128.h"

absl::uint128 u = absl::MakeUint128(0x12345678, 0xabcdef0123456789);
absl::int128  s = absl::MakeInt128(-1, 0);

absl::uint128 sum = u + absl::Uint128Max();
```

## 생성

문법이 약간 다른 두 가지 생성 방식이 있다.

```cpp
// 1. 64-bit half-pair (high, low)
absl::uint128 a = absl::MakeUint128(0xdead'beef, 0xcafe'0000'0000);

// 2. 정수 리터럴 변환
absl::uint128 b = 42;
absl::int128  c = -100;

// 3. 상수
absl::uint128 max_u = absl::Uint128Max();
absl::int128  min_s = absl::Int128Min();
absl::int128  max_s = absl::Int128Max();
```

리터럴은 64비트까지만 직접 들어간다. 큰 값은 두 64비트 조각으로 합성하거나 곱·shift로 만든다.

```cpp
absl::uint128 trillion_squared = absl::uint128{1'000'000'000'000ULL} *
                                  absl::uint128{1'000'000'000'000ULL};
```

## 산술

C++ 산술 연산자가 모두 오버로드된다. 컴파일러가 `__int128`을 지원하면 그것을 사용하고, 아니면 long-arithmetic emulation으로 fallback.

```cpp
absl::uint128 a = absl::MakeUint128(1, 0);   // 2^64
absl::uint128 b = a + 1;                      // 2^64 + 1

absl::uint128 m = a * a;                      // 2^128 — overflow
                                              //   m == 0 (low 128 bits)

absl::uint128 d = m / a;                      // 0 / a == 0

absl::uint128 sh = absl::uint128{1} << 100;   // 2^100
```

부호 있는 경우 overflow는 *implementation-defined* (대부분 wrap)이다.

## 64-bit 분해

`Uint128High64`/`Uint128Low64`로 두 절반을 꺼낼 수 있다.

```cpp
absl::uint128 v = ...;
uint64_t hi = absl::Uint128High64(v);
uint64_t lo = absl::Uint128Low64(v);
```

직렬화 시 두 64비트로 나누어 저장하는 패턴이 흔하다.

```cpp
void Encode(absl::uint128 v, char* buf) {
    uint64_t hi = absl::Uint128High64(v);
    uint64_t lo = absl::Uint128Low64(v);
    std::memcpy(buf, &hi, 8);
    std::memcpy(buf + 8, &lo, 8);
}
```

## 문자열 변환

```cpp
absl::uint128 v = absl::MakeUint128(0x1234, 0x5678);
std::string s = absl::StrCat(v);
// "340282366920938463463374607431768211456" 같은 십진수

std::ostringstream os;
os << std::hex << v;   // 16진수 출력
```

`StrCat`/`StreamFormatter`가 자동 지원한다. 파싱은 `absl::SimpleAtoi`로.

```cpp
absl::uint128 parsed;
if (!absl::SimpleAtoi("123456789012345678901234567890", &parsed)) {
    return absl::InvalidArgumentError("bad number");
}
```

## std::numeric_limits 호환

```cpp
static_assert(std::numeric_limits<absl::uint128>::is_integer);
static_assert(std::numeric_limits<absl::uint128>::digits == 128);

absl::uint128 max = std::numeric_limits<absl::uint128>::max();
```

C++20부터는 `std::uint128_t`가 제안되었지만 표준 진입이 아직 미정. Abseil은 그 사이의 명확한 안정 답이다.

## 작은 예시 — 큰 카운터

```cpp
class GlobalRequestCounter {
public:
    void Increment(uint64_t bytes) {
        absl::MutexLock lock(&mu_);
        count_ += 1;
        bytes_total_ += absl::uint128{bytes};
    }

    absl::uint128 BytesTotal() const {
        absl::MutexLock lock(&mu_);
        return bytes_total_;
    }

private:
    mutable absl::Mutex mu_;
    uint64_t count_ ABSL_GUARDED_BY(mu_) = 0;
    absl::uint128 bytes_total_ ABSL_GUARDED_BY(mu_) = 0;
};
```

petabyte 누적이 우습게 들어간다. 64비트면 16EB(2^64 바이트)에서 wrap.

## 코드 리뷰 체크리스트

```cpp
// 회피 — __int128 비표준 직접 사용
__int128 v = ...;   // ❌ MSVC 안 됨

// Good — absl::int128
absl::int128 v = ...;
```

```cpp
// 회피 — high/low 합성 시 부호 혼동
absl::int128 v = (static_cast<absl::int128>(hi) << 64) | lo;   // ⚠️ 부호 확장

// Good — 명시 helper
absl::int128 v = absl::MakeInt128(hi, lo);
```

```cpp
// 회피 — JSON 직렬화에 그대로
std::string s = absl::StrCat(v);    // 10진수 문자열 → JSON number는 53비트 제한
// → 문자열로 wrap 또는 hi/lo 두 필드로 분해
```

## 정리

- `absl::int128`/`uint128`은 모든 플랫폼 통합 128비트 정수.
- 컴파일러 builtin(`__int128`) 가능 시 그것을 사용, 아니면 emulation.
- `MakeUint128(hi, lo)` / `MakeInt128(hi, lo)`로 생성, `Uint128High64`/`Uint128Low64`로 분해.
- 산술·shift·비교 연산자 전부 오버로드. overflow는 wrap.
- `StrCat`·`SimpleAtoi`로 문자열 변환. `numeric_limits` 호환.

## 다음 장 예고

[Part 9-02: bits](/blog/programming/code-review/abseil/part9-02-bits) — popcount, countl_zero 등 비트 연산.

## 관련 항목

- [Part 9-02: bits](/blog/programming/code-review/abseil/part9-02-bits)
- [Part 4-03: StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [원문 — Numeric](https://abseil.io/docs/cpp/guides/numeric)
