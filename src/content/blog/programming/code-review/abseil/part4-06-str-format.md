---
title: "Part 4-06: StrFormat — type-safe printf, FormatSpec"
date: 2026-05-24T01:00:00
description: "Part 4-06: absl::StrFormat — printf 호환 syntax의 type-safe 포맷팅, FormatSpec 컴파일 타임 검증, FormatUntyped."
series: "Abseil Code Review"
seriesOrder: 24
tags: [cpp, abseil, strings, strformat, format]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::StrFormat`은 printf 형식 문자열의 syntax를 그대로 쓰면서 **type 검증을 컴파일 타임에** 한다. `%d`에 `std::string`을 넘기면 컴파일 에러다. C++20의 `std::format`이 표준화되기 전부터 Google이 써 온 안전한 포맷 API다.

## 동기

`printf`/`snprintf`는 syntax는 익숙하지만 안전하지 않다.

```cpp
// 회피 — UB
char buf[64];
snprintf(buf, sizeof(buf), "id=%d", "string_not_int");  // type 불일치
snprintf(buf, sizeof(buf), "%s", nullptr);              // glibc 외에는 UB
snprintf(buf, 4, "%s", "too long");                     // 잘림 — 실수 잡기 어려움
```

C++의 `std::stringstream`은 안전하지만 형식 표현력이 떨어지고 locale에 묶인다. `absl::StrFormat`은 printf의 표현력 + C++의 type 안전성을 결합한다.

format spec과 인자 타입이 컴파일 타임에 매칭되는 흐름은 다음과 같다.

![StrFormat type-safe printf](/images/blog/abseil/diagrams/part4-06-str-format-spec.svg)

## API와 사용법

```cpp
#include "absl/strings/str_format.h"

namespace absl {
template <typename... Args>
std::string StrFormat(const FormatSpec<Args...>& format, const Args&... args);

template <typename... Args>
bool StrAppendFormat(std::string* dst, const FormatSpec<Args...>& format,
                     const Args&... args);

template <typename... Args>
ABSL_MUST_USE_RESULT int SNPrintF(char* out, size_t n,
                                  const FormatSpec<Args...>& format,
                                  const Args&... args);
}
```

기본 사용은 printf와 동일하다.

```cpp
std::string s = absl::StrFormat("user=%d action=%s", 42, "login");
// "user=42 action=login"

std::string ip = absl::StrFormat("%d.%d.%d.%d", 192, 168, 0, 1);

double pi = 3.141592653589;
std::string f = absl::StrFormat("%.4f", pi);  // "3.1416"
```

`std::string`과 `absl::string_view`는 `%s`로 받는다 — `.c_str()` 변환 불필요.

```cpp
std::string name = "Alice";
absl::string_view sv = "Bob";
absl::StrFormat("hello %s and %s", name, sv);
```

이 한 가지만으로도 raw printf보다 알로케이션이 줄어든다.

## type-safe 검증

`FormatSpec`은 가변 인자 템플릿 wrapper다. format string과 인자 타입이 일치하지 않으면 컴파일 에러다.

```cpp
// 회피 — 컴파일 에러
absl::StrFormat("id=%d", "not_int");
// error: format string requires int, got const char[*]

absl::StrFormat("%s", 42);
// error: format string requires string-like, got int
```

`FormatSpec`은 `constexpr`이라 string literal은 컴파일 타임 검증이 가능하다. 런타임 결정 format은 별도 API가 필요하다 — 다음 절.

## FormatUntyped — 동적 format

format string이 런타임에 결정되는 경우(예: 로그 템플릿 외부 설정)는 `FormatUntyped` 또는 `ParsedFormat<...>`을 쓴다.

```cpp
absl::UntypedFormatSpec spec("%d %s");
std::string out;
if (!absl::FormatUntyped(&out, spec, {absl::FormatArg(42), absl::FormatArg("hi")})) {
  // 검증 실패 (인자 타입 불일치 등)
}
```

타입 안전성은 *런타임으로* 미뤄지나, format 자체는 파싱·검증된다. printf의 raw UB는 발생하지 않는다.

`ParsedFormat<chars...>`로 미리 컴파일하면 반복 사용 시 파싱 비용을 절약한다.

```cpp
absl::ParsedFormat<'d','s'> spec("%d %s");
for (auto [n, s] : items) {
  std::string line = absl::StrFormat(spec, n, s);
}
```

## 내부 구현

핵심 흐름은 다음과 같다.

```cpp
// absl/strings/internal/str_format/extension.h (요약)
class FormatRawSink {
 public:
  virtual void Write(string_view s) = 0;
};

class FormatSinkImpl {
  std::string* buffer_;
 public:
  void Append(string_view s) { buffer_->append(s.data(), s.size()); }
};
```

각 conversion specifier(`%d`, `%s`, `%f`)는 대응 *converter* 함수가 있다. 컴파일러는 format string을 파싱해 각 위치별 converter를 인자 타입과 매칭한다. 매칭이 안 되면 `static_assert` 또는 SFINAE 실패로 컴파일 에러.

런타임에는 sink(buffer)에 순차 write한다. 한 호출당 alloc 0~1회.

## std::format / printf 비교

| API | type 안전 | format 표현력 | 컴파일 타임 검증 | locale-free |
|---|---|---|---|---|
| `printf` | X | 강 | X | X |
| `std::stringstream` | O | 약 | — | X |
| `std::format` (C++20) | O | 강 | constexpr | O |
| `absl::StrFormat` | O | 강 (printf 호환) | constexpr | O |

`std::format`은 새 syntax(`{0:.4f}`)다. `absl::StrFormat`은 printf syntax를 유지해 마이그레이션 비용이 낮다.

## 코드 리뷰 포인트

**1. snprintf → StrFormat**

```cpp
// 회피
char buf[256];
snprintf(buf, sizeof(buf), "user=%d ip=%s ms=%lld", uid, ip.c_str(), ms);
std::string s(buf);

// Good
std::string s = absl::StrFormat("user=%d ip=%s ms=%lld", uid, ip, ms);
// .c_str() 불필요, 잘림 없음, type 검증
```

**2. log message format**

LOG 시스템이 stream 기반(`<<`)이라도, 단일 line을 미리 만들어 넘기는 게 유리한 경우가 있다.

```cpp
LOG(WARNING) << absl::StrFormat("slow query: %.2f ms (threshold=%.2f)",
                                 elapsed_ms, threshold_ms);
```

**3. 가변 정밀도 출력**

`%.*f` 같은 가변 width/precision도 지원한다.

```cpp
int prec = 6;
absl::StrFormat("%.*f", prec, 3.141592);  // "3.141592"
```

## 안티패턴

**format string에 사용자 입력**

printf 계열의 고전적 취약점. format에 user input이 그대로 들어가면 conversion specifier가 주입된다. `StrFormat`은 type 검증이 강하지만, 사용자 입력은 *인자*로 넘긴다.

```cpp
// 회피 — UB / 보안 문제
absl::StrFormat(user_supplied, ...);

// Good
absl::StrFormat("%s", user_supplied);
```

**과도한 format 비용 hot path**

`StrFormat`은 빠르지만 `StrCat`보다 무겁다(format string 파싱). 컴파일 타임에 specifier가 단순한 추가뿐이라면 `StrCat`이 더 빠르다.

```cpp
// hot path
absl::StrFormat("k=%d", n);   // 더 무거움
absl::StrCat("k=", n);        // 더 가벼움
```

format이 단순 concat 수준이면 `StrCat`, 정렬/정밀도/지수 표기가 필요하면 `StrFormat`.

## 정리

- `StrFormat`은 printf syntax + 컴파일 타임 type 검증.
- `%s`는 `std::string`, `absl::string_view`를 받는다(`.c_str()` 불필요).
- 동적 format은 `FormatUntyped` / `ParsedFormat`.
- buffer alloc 0~1회, locale-free, type-safe.
- 사용자 입력은 *format이 아니라 인자*로.

## 다음 편

[Part 4-07 — ASCII 함수](/blog/programming/code-review/abseil/part4-07-ascii-functions)에서 locale-free ASCII 유틸을 본다.

## 관련 항목

- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Part 4-05 — StrJoin](/blog/programming/code-review/abseil/part4-05-str-join)
- [Tip of the Week #29: StrFormat](https://abseil.io/tips/29)
