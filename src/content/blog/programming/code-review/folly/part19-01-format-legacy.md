---
title: "folly::format — legacy formatter 분석"
date: 2026-06-08T09:08:00
description: "folly::format의 historical 위치, fmt와의 관계, std::format으로의 마이그레이션 경로."
series: "Folly Code Review"
seriesOrder: 80
tags: [cpp, folly, format, legacy, migration]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `folly::format`은 fmt와 `std::format`이 표준에 들어오기 전의 type-safe formatter다. 새 코드는 fmt/std::format을 쓰되 fbcode에 깊이 박힌 legacy `folly::format`을 어떻게 마이그레이션하는지 안다.

## 동기

C++ formatter의 역사는 셋이다.

1. **printf** — type-unsafe, format string과 인자가 컴파일러 체크 안 됨.
2. **iostream** — type-safe지만 verbose, locale 동작 미묘.
3. **type-safe formatter** — Python-style `{}` 플레이스홀더. 컴파일 타임 체크.

Folly는 2014~2015년경 자체 formatter `folly::format`을 만들었다. 같은 시기에 외부 `fmt` 라이브러리(Victor Zverovich)가 성장 중이었고, fmt가 결국 C++20 `std::format`으로 표준화됐다. 그래서 folly 내부에는 두 세대가 공존한다.

| 시점 | 도구 |
|------|------|
| ~2015 | `folly::format` 도입 |
| 2015~2020 | folly가 fmt를 의존성으로 통합 (Part 5-02) |
| 2020+ | `std::format` 표준화 |
| 현재 | folly 새 코드는 fmt, 레거시 코드는 `folly::format` 잔존 |

## API

```cpp
#include <folly/Format.h>

// 1. format → folly::Formatter (operator<<로 출력 가능)
std::cout << folly::format("hello {}, {}\n", name, age);

// 2. format → fbstring (str())
auto s = folly::format("x={}, y={}", x, y).str();

// 3. format-into a writer
folly::format(folly::stringPrinter(buffer), "value = {}", v);

// 4. positional
auto a = folly::format("{0}-{1}-{0}", "x", "y").str();   // "x-y-x"

// 5. width/precision
auto b = folly::format("{:>10}", "hi").str();    // "        hi"
auto c = folly::format("{:.3f}", 3.14159).str(); // "3.142"
```

표층 API는 `std::format`/`fmt::format`과 유사. Python-style `{}` 플레이스홀더.

### 차이점

```cpp
// folly::format → Formatter 객체 반환 (lazy)
auto fmt = folly::format("x={}", x);
std::cout << fmt;    // 이 시점에 format 수행
auto s = fmt.str();  // 또는 str() 호출

// fmt::format / std::format → string 반환 (eager)
auto s2 = fmt::format("x={}", x);  // 즉시 std::string
```

`folly::format`은 *lazy*다. operator<<나 `.str()`이 호출돼야 실제 포맷팅. 한 번 만들고 여러 sink에 출력 가능한 장점, 그러나 형식 검사가 lazy하다는 단점.

`std::format` / `fmt::format`은 *eager*. 즉시 string 생성, compile-time 검사 가능.

## 내부 구현 개요

```cpp
// folly/Format.h 약식
template <bool ContainerMode, class... Args>
class Formatter {
 public:
  Formatter(StringPiece fmt, Args&&... args)
    : fmt_(fmt), args_(std::forward<Args>(args)...) {}

  template <class Out>
  void operator()(Out& out) const {
    // 1. fmt_ 파싱 (runtime)
    // 2. 각 {}에 args_의 해당 element를 변환
    // 3. out에 write
  }

  fbstring str() const {
    fbstring s;
    auto adapter = stringAppender(s);
    (*this)(adapter);
    return s;
  }
};
```

핵심은 runtime parsing. format string 안의 `{}`, `{:>10}` 같은 패턴을 *호출 시점*에 파싱. fmt/`std::format`은 컴파일러가 일부 검사 가능 (constexpr format string).

## std::format / fmt와의 비교

| 항목 | folly::format | fmt::format | std::format (C++20) |
|------|----------------|--------------|----------------------|
| 시점 | 2014 | 2014~ | 2020 |
| 평가 | lazy | eager | eager |
| compile-time 검사 | 약 | 강 (constexpr fmt) | 강 (`std::format_string`) |
| custom formatter | 가능 | `fmt::formatter<T>` | `std::formatter<T>` |
| sink | iterator/Out callback | iterator | `format_to`/`back_inserter` |
| 표준 | folly | 외부 | std |
| 의존성 | folly | header-only | std lib |
| 컴파일 시간 | 보통 | 큼 | 큼 |

`folly::format`의 약점은 *compile-time 검사*. format string의 `{}` 수와 인자 수가 다르거나, 타입이 호환 안 될 때 *runtime exception*. fmt/std::format은 그걸 컴파일 타임에 잡는다.

```cpp
// folly — runtime throw
folly::format("x={}, y={}", 42).str();   // y 인자 없음 → 예외

// std::format — compile error (C++20+)
auto s = std::format("x={}, y={}", 42);  // 컴파일 안 됨
```

## 마이그레이션 경로

```cpp
// Before (legacy)
auto s = folly::format("{}-{}", a, b).str();
LOG(INFO) << folly::format("x={}, y={}", x, y);

// After (fmt)
auto s = fmt::format("{}-{}", a, b);
LOG(INFO) << fmt::format("x={}, y={}", x, y);

// After (std::format, C++20+)
auto s = std::format("{}-{}", a, b);
```

대부분 1:1 변환. 주의:

- `folly::format`이 *lazy*라 여러 sink에 나눠 출력하던 코드는 string 한 번 만들어 여러 sink에 보내야.
- custom formatter는 `folly::FormatValue<T>` → `fmt::formatter<T>` 또는 `std::formatter<T>` 재작성.
- format string의 일부 확장 syntax (예: container 출력) 가 fmt에 없을 수 있음 — 호환 변환 필요.

## Custom formatter — folly 방식

```cpp
// folly 방식
namespace folly {
template <>
class FormatValue<MyType> {
 public:
  explicit FormatValue(const MyType& v) : v_(v) {}

  template <class FormatCallback>
  void format(FormatArg& arg, FormatCallback& cb) const {
    cb(folly::to<fbstring>(v_.toString()));
  }

 private:
  const MyType& v_;
};
}
```

```cpp
// fmt 방식
namespace fmt {
template <>
struct formatter<MyType> : formatter<std::string> {
  template <class FormatContext>
  auto format(const MyType& v, FormatContext& ctx) const {
    return formatter<std::string>::format(v.toString(), ctx);
  }
};
}
```

fmt 방식이 더 깔끔 — base formatter 상속으로 width/alignment 자동 처리.

## 코드 리뷰 포인트

- 새 코드에 `folly::format` 등장 → fmt 또는 std::format으로 변경 권유.
- legacy 코드의 lazy 평가 의존이 있는지 — string으로 한 번에 만들어도 되는 코드인지 확인.
- format string이 runtime concat (`folly::format(prefix + "{}", x)`)인가 — compile-time 검사 의미 없음. fmt도 같은 한계.
- custom FormatValue가 있으면 fmt::formatter 재작성.

## 자주 보는 안티패턴

```cpp
// 1. folly::format 객체를 보관 후 늦게 .str()
auto fmt = folly::format("x={}", x);   // x가 reference로 캡처될 수도
sleep(100);
auto s = fmt.str();                     // x가 살아있어야 — 위험

// 2. format string이 동적
std::string fmtStr = LoadTemplate();
folly::format(fmtStr, args...).str();   // compile-time 검사 불가능

// 3. exception 무시
auto s = folly::format("{} {}", x).str();   // arg 수 불일치 → 예외
// → catch 없으면 process abort
```

## std::format으로 가는 미래

C++20 std::format이 표준이 됐고 C++23에서 `std::print`/`std::println`도 들어왔다. fbcode가 점진적으로 다음 순서로 이동.

1. 새 코드: `fmt::format` (사용 가능하면).
2. C++20 사용 가능한 환경: `std::format`.
3. legacy `folly::format`: 점진적 변환.

`folly::format`은 *유지*되지만 활발한 개선은 받지 않는다. 새 기능은 fmt/std에 의존.

## 정리

- `folly::format`은 fmt/std::format 이전 시대의 type-safe formatter.
- lazy 평가, runtime parsing — fmt/std는 eager + compile-time 검사.
- 새 코드는 fmt 또는 std::format 선택.
- legacy 코드 마이그레이션은 대부분 1:1, custom formatter만 재작성.
- `folly::format`이 fbcode에 깊이 박혀 있어 한동안 공존.

## 다음 편

[Part 19-02: folly::demangle](/blog/programming/code-review/folly/part19-02-demangle)에서 typeid 디망글링을 본다.

## 관련 항목

- [Folly Part 5-02 — fmt 통합](/blog/programming/code-review/folly/part5-02-fmt-format-integration)
- [Folly Part 6-01 — to<T>](/blog/programming/code-review/folly/part6-01-to-try-to)
- [원문 — folly/Format.h](https://github.com/facebook/folly/blob/main/folly/Format.h)
- [fmt 라이브러리](https://fmt.dev)
