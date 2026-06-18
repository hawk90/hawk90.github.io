---
title: "folly::to·tryTo — text↔num 변환 분석"
date: 2026-06-05T09:09:00
description: "folly::to의 throw-on-error 변환, tryTo의 Expected 반환, 양방향 string/number 처리."
series: "Folly Code Review"
seriesOrder: 27
tags: [cpp, folly, conv, to, conversion]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::to<T>(src)`는 source/target 타입 쌍을 컴파일 타임에 dispatch해 변환을 수행한다. 실패 시 throw. `folly::tryTo<T>(src)`는 `Expected<T, ConversionCode>`를 반환해 throw 없이 분기한다.

## 동기

C++의 변환 API는 산만하다.

- `std::stoi` → 예외, locale 의존, partial parse.
- `std::from_chars` → exception-free, locale 비의존이지만 C++17이고 API가 낮은 레벨.
- `std::to_string` → locale 비의존이나 부동소수 출력이 부정확.
- `boost::lexical_cast` → 통일된 API지만 stringstream 기반이라 느리다.

fbcode는 *log 한 줄, ID parsing, query string* 같은 곳에서 매 마이크로초가 보이는 경로다. 통일된 빠른 API가 필요했다.

```cpp
int n = folly::to<int>("42");
std::string s = folly::to<std::string>(3.14);
double d = folly::to<double>(s);

auto r = folly::tryTo<int>("not-a-number");
if (r.hasValue()) Use(*r);
```

## API & 사용법

```cpp
#include <folly/Conv.h>

// 1. throw-on-error
int   i = folly::to<int>("42");                   // OK
int   j = folly::to<int>("abc");                  // throws ConversionError
auto  s = folly::to<std::string>(42);             // "42"
auto  d = folly::to<double>("3.14");

// 2. 부분 parse — view를 진행시키며 자른다
folly::StringPiece sp = "42,17";
int x = folly::to<int>(&sp);   // x=42, sp=",17"

// 3. tryTo — Expected 반환
folly::Expected<int, folly::ConversionCode> r = folly::tryTo<int>("99");
if (r) { Use(*r); }
else   { LOG(WARNING) << "code=" << static_cast<int>(r.error()); }

// 4. 여러 인자를 한 문자열로
std::string s2 = folly::to<std::string>("id=", id, ",v=", val);

// 5. variadic — output buffer에 append
std::string out;
folly::toAppend("count=", n, " of ", total, &out);
```

`folly::to<std::string>(a, b, c)`는 `+` operator overload 없이 가변 인자를 받아 한 번에 만든다. 모든 인자의 size를 미리 계산해 reserve 한다.

## 내부 구현

### dispatch 구조

```cpp
// 약식 — folly/Conv.h
template <class Tgt, class Src>
Tgt to(const Src& src) {
  if constexpr (std::is_same_v<Tgt, Src>) return src;
  else return detail::Converter<Tgt, Src>::convert(src);
}
```

`Converter`는 SFINAE/`if constexpr`로 source-target 쌍마다 specialize 된다. 주요 분기는 다음과 같다.

| Source → Target | 구현 |
|------------------|------|
| integer → string | `to_ascii_base10` (lookup table) |
| float → string | Ryu(Grisu3) 또는 dtoa |
| string → integer | `digits_to`로 자릿수별 SWAR |
| string → float | `strtod` 또는 자체 fast parser |
| variadic → string | 각 size 계산 → reserve → append |

### integer → string의 자릿수 lookup

```cpp
// 약식 — 2자리씩 처리
constexpr char digits[] =
  "0001020304050607080910111213141516..."  // "00".."99"
;

uint32_t to_ascii_base10(char* buf, uint64_t v) {
  // 8자리씩 SWAR 분할
  // 마지막 2-3자리만 1자리씩 처리
  // ...
}
```

`itoa` 구현이 char by char 처리한다면 folly는 2-digit pair를 lookup table로 한 번에 쓴다. 10^16 까지의 정수에서 약 2배 빠르다.

### string → integer의 SWAR

```cpp
// 약식 — 8 바이트를 한 word로 처리
uint64_t parse_8_digits_swar(const char* s) {
  uint64_t word;
  memcpy(&word, s, 8);
  word -= 0x3030303030303030ULL;     // '0' 8개 빼기
  // multiply chain 로 자리수 결합
  // ...
  return result;
}
```

8자리 정수를 한 instruction 흐름으로 parse. fbcode의 query string·log 라인 parsing에서 큰 차이.

### tryTo의 Expected 반환

```cpp
// 약식
template <class Tgt, class Src>
Expected<Tgt, ConversionCode> tryTo(const Src& src) {
  Tgt result;
  auto code = detail::Converter<Tgt, Src>::tryConvert(src, &result);
  if (code == ConversionCode::SUCCESS) return result;
  return makeUnexpected(code);
}
```

`tryConvert`는 errno 같은 thread-local 상태 없이 enum을 직접 반환한다. exception unwinding cost가 hot path에서 사라진다.

`ConversionCode`는 EMPTY_INPUT, INVALID_LEADING_CHAR, NON_DIGIT_CHAR, OVERFLOW, NEGATIVE_OVERFLOW 등 12개 정도. 호출자가 어떤 실패인지 분기 가능하다.

## std/abseil 비교

```cpp
// std::from_chars (C++17) — 저수준이지만 가장 빠른 표준
int v;
auto r = std::from_chars(sv.data(), sv.data() + sv.size(), v);
if (r.ec == std::errc{}) { /* ok */ }

// abseil
int v2;
if (absl::SimpleAtoi("42", &v2)) { /* ok */ }
std::string s = absl::StrCat(1, ",", 2.5);

// folly
int v3 = folly::to<int>("42");                   // throws
auto r3 = folly::tryTo<int>("42");               // Expected
std::string s2 = folly::to<std::string>(1, ",", 2.5);
```

| 항목 | `std::from_chars` | `absl::SimpleAtoi` | `folly::tryTo` |
|------|-------------------|---------------------|-----------------|
| Exception | 없음 | 없음 | tryTo는 없음, to는 throw |
| Return | `from_chars_result` | bool | `Expected<T, Code>` |
| Float | C++17 (libstdc++ 늦게) | `SimpleAtod` | `tryTo<double>` |
| Locale | 비의존 | 비의존 | 비의존 |
| 가변 to_string | X | `StrCat`, `StrAppend` | `to<std::string>(...)`, `toAppend` |

세 라이브러리 모두 locale 비의존. 표준이 `from_chars`를 늦게 도입한 탓에 folly와 abseil이 더 풍부한 API를 제공한다.

## 코드 리뷰 포인트

```cpp
// Bad — hot path에서 throw 의존
for (auto& s : tokens) {
  try {
    Process(folly::to<int>(s));
  } catch (...) { Skip(); }
}

// Good — tryTo로 분기
for (auto& s : tokens) {
  if (auto r = folly::tryTo<int>(s)) Process(*r);
  else Skip();
}
```

throw는 happy path가 throw 비율이 낮으면 빠르지만, *throw 비율이 높으면* 수백 배 느려진다. 외부 입력 parsing은 항상 `tryTo`.

```cpp
// Bad — std::string 누적
std::string s;
for (int i = 0; i < N; ++i) {
  s += folly::to<std::string>(i) + ",";   // 매번 임시 할당
}

// Good — toAppend로 in-place
std::string s;
for (int i = 0; i < N; ++i) {
  folly::toAppend(i, ",", &s);            // s에 직접 append
}
```

`toAppend`는 임시 string을 만들지 않고 target buffer에 바로 쓴다.

## 안티패턴

- **`std::to_string(double)`을 fbcode에 섞기**: locale 의존 출력이라 다른 노드에서 다른 결과. `folly::to<std::string>(double)` 또는 `fmt::format`로 통일.
- **`tryTo`의 `Expected` 검사를 `value()`로**: error case에서 throw. `if (r) *r` 또는 `r.value_or(default)`.
- **부분 parse에 view 진행 미적용**: `folly::to<int>(&sp)`는 sp를 진행시킨다. 같은 입력을 두 번 parse 하면 안 된다.

## 정리

- `to<T>(src)`는 통일된 변환 API, 실패 시 throw.
- `tryTo<T>(src)`는 `Expected<T, ConversionCode>` 반환, 외부 입력에 적합.
- variadic `to<std::string>(...)`, `toAppend(...)`로 한 번에 누적.
- 내부적으로 lookup table, SWAR로 std::stoi/std::to_string 대비 2-5배 빠름.
- locale 비의존. `std::from_chars`보다 high-level이고 풍부.

## 다음 편

다음은 사용자 정의 타입을 `folly::to` 변환 가능하게 만드는 customization point를 본다.

## 관련 항목

- [Part 6-02: Conv customization](/blog/programming/code-review/folly/part6-02-conv-customization) — `parseTo`/`toAppend` 특화
- [Part 6-03: Conv performance](/blog/programming/code-review/folly/part6-03-conv-performance) — benchmark 상세
- [Part 13-01: exception_wrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper) — Expected와 함께 쓰는 에러 처리
- [원문 — folly/Conv.h](https://github.com/facebook/folly/blob/main/folly/Conv.h)
