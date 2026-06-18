---
title: "Abseil ASCII 함수 — locale-free 분류·대소문자 변환"
date: 2026-06-10T09:09:00
description: "Part 4-07: absl::ascii_* — locale 독립 ASCII 분류, AsciiStrToLower / AsciiStrToUpper / StripAsciiWhitespace."
series: "Abseil Code Review"
seriesOrder: 25
tags: [cpp, abseil, strings, ascii, locale]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`<cctype>`의 `isalpha`, `tolower`는 *현재 locale*에 따라 결과가 달라진다. Abseil의 `absl::ascii_isalpha`, `absl::ascii_tolower`, `absl::AsciiStrToLower`는 **locale 무시**로 동작한다. 결과가 process-wide locale 설정에 흔들리지 않고, 캐시 친화적인 lookup table로 빠르다.

## 동기

C++ 표준 `<cctype>` 함수의 시그니처와 함정.

```cpp
#include <cctype>

bool b = std::isalpha((unsigned char)c);  // int 인자 — char가 음수면 UB
```

세 가지 함정이 동시에 있다.

1. **locale 의존**: 터키어 locale에서 `tolower('I')`는 dotless i. 프로그램이 `setlocale`을 호출하면 같은 코드의 결과가 바뀐다.
2. **char 부호 함정**: `std::isalpha`는 `int`를 받는다. `char`가 signed이고 음수이면 UB. 사용자는 `(unsigned char)` 캐스트를 매번 해야 한다.
3. **느림**: locale-aware 구현은 매 호출마다 locale lookup이 일어난다.

Abseil은 이 셋을 한 번에 해결한다.

## API와 사용법

```cpp
#include "absl/strings/ascii.h"

namespace absl {
// 분류
bool ascii_isalpha(unsigned char c);
bool ascii_isdigit(unsigned char c);
bool ascii_isalnum(unsigned char c);
bool ascii_isspace(unsigned char c);
bool ascii_ispunct(unsigned char c);
bool ascii_isxdigit(unsigned char c);
bool ascii_isupper(unsigned char c);
bool ascii_islower(unsigned char c);
bool ascii_isprint(unsigned char c);
bool ascii_iscntrl(unsigned char c);
// ...

// 변환
char ascii_tolower(unsigned char c);
char ascii_toupper(unsigned char c);

// 문자열 단위
std::string AsciiStrToLower(absl::string_view s);
std::string AsciiStrToUpper(absl::string_view s);
void AsciiStrToLower(std::string* s);     // in-place
void AsciiStrToUpper(std::string* s);

// 공백 제거
absl::string_view StripLeadingAsciiWhitespace(absl::string_view str);
absl::string_view StripTrailingAsciiWhitespace(absl::string_view str);
absl::string_view StripAsciiWhitespace(absl::string_view str);
}
```

기본 사용은 표준 함수와 같다.

```cpp
if (absl::ascii_isalpha(c)) { /*...*/ }

std::string lower = absl::AsciiStrToLower("Hello World");
// "hello world"

absl::string_view trimmed = absl::StripAsciiWhitespace("  hello  ");
// "hello"
```

`StripAsciiWhitespace`는 alloc 없이 view를 잘라 반환한다. 입력 문자열의 substring view다.

## 내부 구현 — lookup table

`absl::ascii_*`는 256-byte lookup table을 인덱싱한다. branch 없는 단일 메모리 접근이다.

```cpp
// absl/strings/ascii.h (요약)
namespace ascii_internal {
extern const unsigned char kPropertyBits[256];
extern const char kToLower[256];
extern const char kToUpper[256];

constexpr unsigned char kAlpha   = 0x01;
constexpr unsigned char kDigit   = 0x02;
constexpr unsigned char kSpace   = 0x04;
// ...
}  // namespace ascii_internal

inline bool ascii_isalpha(unsigned char c) {
  return (ascii_internal::kPropertyBits[c] & ascii_internal::kAlpha) != 0;
}

inline char ascii_tolower(unsigned char c) {
  return ascii_internal::kToLower[c];
}
```

테이블은 1 KiB가 안 된다. L1 캐시에 항상 머문다. 분기 없이 단일 인덱스 조회이므로 SIMD 루프 안에서도 사용 가능하다.

`AsciiStrToLower`는 SIMD optimization을 노린다. 큰 문자열에서 `<cctype>`의 루프보다 수 배 빠르다.

## std 비교 + 보안 노트

`std::isalpha((unsigned char)c)` 형태는 보안 코드에서 흔한 패턴이다. signedness 함정을 우회하기 위해서다. Abseil은 인자 타입을 `unsigned char`로 못 박아 캐스트를 강제한다(또는 `int` overload 제거). 함수 호출만으로 함정이 사라진다.

| 함수 | locale 의존 | 함정 | 성능 |
|---|---|---|---|
| `std::isalpha(int)` | O | char signed→음수 UB | locale lookup |
| `std::tolower(int)` | O | 동일 | locale lookup |
| `absl::ascii_isalpha(uchar)` | X | 없음 | table lookup |
| `absl::ascii_tolower(uchar)` | X | 없음 | table lookup |

## 코드 리뷰 포인트

**1. case-insensitive 비교**

```cpp
// 회피 — locale 의존
bool eq = strcasecmp(a.c_str(), b.c_str()) == 0;

// Good — locale 무시
bool eq = absl::EqualsIgnoreCase(a, b);
```

`EqualsIgnoreCase`는 두 view를 받는 ascii-only 비교다.

**2. config key normalization**

```cpp
// Good
std::string key_norm = absl::AsciiStrToLower(absl::StripAsciiWhitespace(input));
```

`StripAsciiWhitespace`로 view를 자르고 `AsciiStrToLower`로 string을 만든다. trailing/leading whitespace는 view 차원에서 해결.

**3. 식별자 검증**

```cpp
bool IsValidIdentifier(absl::string_view s) {
  if (s.empty() || !absl::ascii_isalpha(s[0])) return false;
  for (char c : s) {
    if (!absl::ascii_isalnum(c) && c != '_') return false;
  }
  return true;
}
```

`isalpha`/`isalnum`이 *항상* ASCII 의미인 것을 보장한다.

## 안티패턴

**Unicode 처리에 ascii_***

이름 그대로 ASCII만 다룬다. UTF-8 한글, 일본어, accented char는 *별도 라이브러리*(ICU 등)로 처리한다. `absl::ascii_isalpha(0xED)`는 false다.

```cpp
// 회피 — 한국어 텍스트에 ASCII 분류
for (char c : "한글") {
  if (absl::ascii_isalpha(c)) { /* false — 다 false */ }
}
```

ASCII가 아닌 입력이 *예상*되는 경계는 명시적으로 처리한다.

**`std::tolower` 람다 mix**

```cpp
// 회피 — 모호한 의도
std::transform(s.begin(), s.end(), s.begin(), ::tolower);

// Good
absl::AsciiStrToLower(&s);  // in-place, 분명한 의도
```

`::tolower`(C 함수)는 가장 위험한 형태다. signed char 함정 + locale 의존 + 미세한 동작 변경.

## 정리

- `absl::ascii_*`는 locale 무시, table lookup, signedness-safe.
- `<cctype>`의 세 함정(locale·signedness·성능)을 한 번에 해소.
- 문자열 단위 변환은 `AsciiStrToLower`, in-place도 지원.
- `StripAsciiWhitespace`는 view를 잘라 alloc 없이 트림.
- Unicode 처리는 별도 라이브러리.

## 다음 편

[Part 4-08 — Escape / Base64](/blog/programming/code-review/abseil/part4-08-escaping-base64)에서 안전한 escape와 base64 인코딩을 본다.

## 관련 항목

- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Part 4-06 — StrFormat](/blog/programming/code-review/abseil/part4-06-str-format)
- [Part 4-08 — Escape / Base64](/blog/programming/code-review/abseil/part4-08-escaping-base64)
