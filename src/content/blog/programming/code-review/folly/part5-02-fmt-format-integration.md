---
title: "folly의 fmt::format 통합 — 모던 포맷팅 채택"
date: 2026-06-05T09:06:00
description: "Folly가 fmt 라이브러리를 채택한 이유, formatter customization, sformat/format 차이."
series: "Folly Code Review"
seriesOrder: 24
tags: [cpp, folly, fmt, format, strings]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

Folly는 자체 `folly::format`을 거두고 `{fmt}`를 채택했다. `sformat`은 wrapper로 남았으나 새 코드는 `fmt::format`을 직접 쓰는 것이 정답이다.

## 동기

C++20의 `<format>`은 `{fmt}`의 fork이지만 컴파일러 지원이 늦었고 매크로 디버깅이 어려웠다. Meta는 다음을 원했다.

- `printf`의 성능, `iostream`의 type safety.
- `Python str.format` 수준의 가독성.
- locale 비의존 (data center에서 locale은 일관성을 깬다).
- 사용자 타입에 대한 customization point.

초기에는 `folly::sformat`이 자체 구현이었으나 `{fmt}`가 더 빠르고 표준에 가까워지자 2018년경 dependency로 흡수했다. 지금은 `folly/Format.h`가 대부분 `fmt`로 forward 한다.

```cpp
folly::sformat("user={} count={}", user, n);   // 여전히 동작
fmt::format("user={} count={}", user, n);      // 더 권장
```

## API & 사용법

```cpp
#include <folly/Format.h>
#include <fmt/format.h>

// 1. 문자열 반환
std::string s = fmt::format("v={:.2f}", 3.14159);  // "v=3.14"

// 2. 출력 stream에 쓰기
fmt::print(stderr, "[{}] {}\n", level, msg);

// 3. 미리 컴파일된 format
constexpr auto fmt_spec = FMT_COMPILE("id={} value={}");
auto s2 = fmt::format(fmt_spec, id, val);  // 런타임 파싱 없음

// 4. 위치 인자
fmt::format("{1} > {0}", 10, 20);  // "20 > 10"

// 5. 명명 인자 (folly::sformat 한정)
folly::sformat("{name} is {age}", FOLLY_FORMAT_NAMED(name, age));
```

`folly::format`은 lazy expression을 반환한다(operator<< 또는 `.str()` 호출 시 평가). `fmt::format`은 eager `std::string`을 반환한다. 일반 use case에서는 차이가 무의미하므로 후자가 단순하다.

## 내부 구현

`fmt`의 핵심은 *format string을 컴파일 타임에 파싱*하고 type-erased writer로 출력하는 것이다.

```cpp
// 약식
template <typename... Args>
std::string format(format_string<Args...> spec, Args&&... args) {
  basic_memory_buffer<char> buf;        // SSO 500-byte stack buffer
  vformat_to(buf, spec, fmt::make_format_args(args...));
  return std::string(buf.data(), buf.size());
}
```

`format_string<Args...>`는 `consteval` 생성자로 컴파일 타임 파싱하며, placeholder 수와 타입이 인자와 다르면 *컴파일 에러*가 난다. `printf`의 런타임 mismatch와 결정적으로 다르다.

`make_format_args`는 인자를 type tag + pointer 쌍의 작은 배열로 만든다. 평균 16 byte 정도라 stack에 머문다. virtual call 없이 switch로 dispatch한다.

### sformat vs fmt::format 성능

```text
benchmark: format "user={} count={}" with string + int
  fmt::format         28 ns
  folly::sformat      40 ns  (fmt에 위임 + folly wrapper)
  ostringstream      450 ns
  snprintf           120 ns
```

`sformat`은 wrapper overhead 약 12 ns. 새 코드는 `fmt::format`을 직접 호출해도 무방하다.

## Customization — 사용자 타입 formatter

특정 타입을 fmt가 출력하게 하려면 `fmt::formatter` 특화를 둔다.

```cpp
struct UserId {
  uint64_t value;
};

template <>
struct fmt::formatter<UserId> {
  // 1. parse: 포맷 specifier 해석
  constexpr auto parse(format_parse_context& ctx) {
    auto it = ctx.begin(), end = ctx.end();
    // {} 만 지원
    if (it != end && *it != '}') throw format_error("invalid");
    return it;
  }

  // 2. format: 실제 출력
  template <typename FormatContext>
  auto format(const UserId& u, FormatContext& ctx) const {
    return fmt::format_to(ctx.out(), "U#{:016x}", u.value);
  }
};

// 이제 자동 동작
fmt::format("id={}", UserId{0xabc});  // "id=U#0000000000000abc"
```

`parse`에서 추가 specifier(`{:short}`, `{:long}`)를 받으면 출력 형태를 사용자 정의할 수 있다. fbcode에서 `folly::Range`, `folly::dynamic`, `folly::Optional`이 이런 특화를 갖고 있다.

### Folly가 제공하는 formatter

```cpp
fmt::format("{}", folly::StringPiece{"hi"});      // "hi"
fmt::format("{}", folly::dynamic{1, 2, 3});       // "[1,2,3]"
fmt::format("{}", folly::Range<int*>{arr, n});    // "[1, 2, 3]"
```

## std/abseil 비교

| 항목 | `printf` | `<format>` (C++20) | `fmt::format` | `absl::StrFormat` |
|------|---------|---------------------|---------------|--------------------|
| Type safety | 컴파일 X | 컴파일 O | 컴파일 O | 컴파일 O (`absl::ParsedFormat`) |
| 사용자 타입 | X | formatter 특화 | formatter 특화 | `AbslStringify` |
| 컴파일 시간 | 짧음 | 중간 | 길음 (template-heavy) | 짧음 |
| Locale | 의존 | 선택 | 비의존 (default) | 비의존 |
| 성능 | 빠름 | fmt와 비슷 | 매우 빠름 | 매우 빠름 |
| Header-only | N/A | std | 선택 | 컴파일 단위 |

`absl::StrFormat`은 `printf` syntax를 쓰는 반면 fmt는 Python `{}` syntax다. fbcode/Meta는 후자를 선호한다.

## 코드 리뷰 포인트

```cpp
// Bad — 매번 format string 파싱
for (int i = 0; i < N; ++i) {
  log_buf += fmt::format("[{}] ", i);
}

// Good — FMT_COMPILE로 컴파일 타임 파싱
constexpr auto spec = FMT_COMPILE("[{}] ");
for (int i = 0; i < N; ++i) {
  fmt::format_to(std::back_inserter(log_buf), spec, i);
}
```

루프 안의 format은 hot path에서 `FMT_COMPILE` + `format_to`로 바꾸면 2-3배 빨라진다.

```cpp
// Bad — format이 throw할 수 있음을 무시
auto s = fmt::format(user_input_fmt, value);  // injection

// Good — 사용자 입력은 format string으로 쓰지 않는다
auto s = fmt::format("{}", value);
```

format string이 외부 입력이면 placeholder count mismatch로 `fmt::format_error`가 던져진다. injection 회피를 위해 *format string은 항상 컴파일 타임 상수*다.

## 안티패턴

- **`folly::format`의 lazy expression을 그대로 함수에 전달**: 평가 시점이 모호해진다. `.str()` 또는 `fmt::format`으로 즉시 문자열로 변환.
- **wide-char 출력에 `fmt::format` 사용**: UTF-8 데이터에 `wstring`을 끼면 인코딩 변환 비용이 든다. UTF-8 표현은 `std::string`으로 유지하고 출력 단계에서만 변환.
- **로그에 `fmt::format` 호출 후 즉시 버림**: 로그 레벨 필터를 통과하지 못해도 format 호출은 일어난다. `XLOG(INFO, "{}", val)` 처럼 매크로 lazy form 사용.

## 정리

- `{fmt}`는 컴파일 타임 파싱 + type-safe placeholder로 `printf` 대체.
- `folly::sformat`은 wrapper로 남아 호환성을 유지하나 새 코드는 `fmt::format` 권장.
- 사용자 타입은 `fmt::formatter` 특화로 `{}` 안에 자유롭게 사용.
- hot path는 `FMT_COMPILE`로 런타임 파싱 제거.
- format string은 항상 컴파일 타임 상수, 사용자 입력은 인자로만.

## 다음 편

다음은 `folly::StringPiece`가 `std::string_view`와 어떻게 같고 다른지, 그리고 왜 둘 다 남아 있는지 본다.

## 관련 항목

- [Part 5-01: FBString](/blog/programming/code-review/folly/part5-01-fbstring) — sformat이 다루는 문자열 타입
- [Part 11-01: folly::dynamic](/blog/programming/code-review/folly/part11-01-dynamic) — fmt formatter 특화 사례
- [원문 — folly/Format.h](https://github.com/facebook/folly/blob/main/folly/Format.h)
- [원문 — {fmt}](https://github.com/fmtlib/fmt)
