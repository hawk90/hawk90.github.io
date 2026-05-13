---
title: "Ch 8: Type Deduction / Templates / Lambdas / Aliases"
date: 2025-05-13T08:00:00
description: "auto / CTAD / Lambdas / Template Metaprogramming / Concepts / Boost / Aliases."
tags: [Google, C++, Style-Guide, auto, Lambda, Template, Concepts]
series: "Google C++ Style"
seriesOrder: 8
draft: false
---

> 모던 C++의 기능들. *언제 써도 좋고, 언제는 안 좋은지* — 가이드의 판단.

## Type Deduction — `auto`

### 규칙

> 타입이 *자명*할 때만 — `auto`.

```cpp
// 좋음 — 자명:
auto it = v.begin();   // iterator 타입 자명
auto p = std::make_unique<Foo>();   // make_unique → unique_ptr

// 회피 — 불명확:
auto result = ComputeSomething();   // 무슨 타입?
auto x = GetValue();                // int? double? Status?
```

### 판단 기준

```
auto OK:
- 우변의 타입이 — 읽는 사람에게 명확
- 긴 타입 (iterator, function 등)
- 템플릿 인자 추론
```

### Range-based for

```cpp
// 좋음:
for (const auto& item : items) { ... }
for (auto& item : items) { ... }
for (auto&& item : items) { ... }
```

### Structured Bindings

```cpp
// 좋음:
auto [name, age] = GetPersonInfo();
for (const auto& [key, value] : my_map) { ... }
```

이름 — 명확. 인덱싱 (`.first` / `.second`)보다 가독성 좋음.

## Class Template Argument Deduction (CTAD)

### 규칙

> 신중히. *명백히 도움*될 때만.

```cpp
// 좋음 (CTAD):
std::vector v = {1, 2, 3};       // vector<int> 추론
std::pair p = {"hello", 42};      // pair<const char*, int> 추론

// 회피 — 모호한 경우:
std::vector v(other_vec);   // 복사? 1개 원소?
```

CTAD는 — *명시적으로 잘 동작하는 곳*에만.

## Lambda Expressions

### 규칙

> 짧게. 명시적 capture 권장.

### Capture 명시

```cpp
// 좋음 — 명시:
[&counter](int x) { counter += x; }
[counter](int x) { return counter + x; }

// 회피 — 디폴트 capture:
[&](int x) { /* ... */ }   // & 전부 — 무엇을 캡처?
[=](int x) { /* ... */ }   // = 전부 — 무엇을?
```

### Init Capture

```cpp
// 좋음:
auto callback = [data = std::move(big_data)]() {
    Process(data);
};
```

`move`를 — capture에서 표현.

### 짧게

```cpp
// 좋음 — 짧음:
auto cmp = [](int a, int b) { return a > b; };
std::sort(v.begin(), v.end(), cmp);

// 회피 — 길음:
auto big_lambda = [&](int x) {
    // 50줄 ...
};
```

긴 람다 — 함수로.

### `mutable` 신중히

```cpp
// 신중:
auto counter = [count = 0]() mutable {
    return ++count;
};
```

상태 있는 람다 — 의도 명확할 때만.

## Template Metaprogramming

### 규칙

> **회피.** 대안 있으면 — 대안.

```cpp
// 회피 — 복잡한 메타프로그래밍:
template <typename T>
struct is_container {
    template <typename U>
    static auto test(U*) -> decltype(std::begin(std::declval<U>()), std::true_type{});
    template <typename>
    static std::false_type test(...);
    static constexpr bool value = decltype(test<T>(nullptr))::value;
};

// 좋음 — C++20 Concepts:
template <typename T>
concept Container = requires(T t) { std::begin(t); std::end(t); };
```

### 이유

```
- 가독성 — 매우 낮음
- 컴파일 에러 — 거대하고 이해 불가
- 유지 보수 — 어려움
- 컴파일 시간 — 폭증
```

### 허용 사례

- 라이브러리 *내부* (Abseil 등의 구현)
- 다른 방법이 — 정말 없을 때

## Concepts and Constraints (C++20)

### 규칙

> **권장.** 가독성을 위해.

```cpp
// 좋음 — Concepts:
template <Container T>
void Process(const T& c) {
    for (const auto& x : c) { /* ... */ }
}

// vs. SFINAE (회피):
template <typename T,
          typename = std::enable_if_t<has_begin_v<T>>>
void Process(const T& c) { /* ... */ }
```

### 표준 Concepts

```cpp
#include <concepts>

template <std::integral T>
T Add(T a, T b) { return a + b; }

template <std::ranges::range R>
void Process(R&& r) { /* ... */ }
```

## Boost

### 규칙

> 사용 가능한 — 일부 라이브러리만.

```
승인됨:
- Boost.Asio (네트워크) — 일부
- Boost.Format
- Boost.Multi-index
- Boost.Variant (C++17 std::variant 이전)

회피:
- Boost.Lambda (구식)
- Boost.MPL (Hana 등으로 대체)
```

승인 목록 — *시간에 따라 변경*. 표준에 포함되면 — 표준 사용 (e.g., `std::optional`, `std::variant`).

## Other C++ Features

### Designated Initializers (C++20)

```cpp
struct Point { double x, y, z; };

// 좋음:
Point p = {.x = 1.0, .y = 2.0, .z = 3.0};
```

가독성 좋음.

### `if constexpr`

```cpp
template <typename T>
void Process(T x) {
    if constexpr (std::is_integral_v<T>) {
        // 정수 처리
    } else {
        // 그 외
    }
}
```

`enable_if` 대신 — 깔끔.

## Aliases

### `using` 선호

```cpp
// 좋음 (C++ 스타일):
using FooMap = std::map<std::string, Foo>;
template <typename T>
using Ptr = std::unique_ptr<T>;

// 회피 (C 스타일):
typedef std::map<std::string, Foo> FooMap;
```

`using`이 — 더 명확, 템플릿 가능.

### 공개 / 비공개

```cpp
// 공개 인터페이스:
namespace mylib {
using FooHandle = std::unique_ptr<Foo>;   // API의 일부
}

// 비공개 (.cc 안):
namespace {
using IntPair = std::pair<int, int>;   // 구현 디테일
}
```

공개 alias — 잘 문서화. 변경 — *API breaking*.

### 노출 신중

```cpp
// 헤더 — 광범위 노출:
using std::string;   // 헤더 안 — 회피!

// .cc 안 — OK:
using std::string;
```

## 정리

- **`auto`** — 자명할 때만
- **Structured bindings** — 권장
- **CTAD** — 신중히
- **Lambda** — 명시적 capture, 짧게
- **Template metaprogramming** — 회피
- **Concepts** — 권장
- **Boost** — 승인된 라이브러리만
- **`using` alias** — `typedef`보다 선호

## 다음 장 예고

다음 — **Naming**. 모든 식별자 명명 규칙.

## 관련 항목

- [Ch 7: const / Numbers / Macros](/blog/embedded/standards/google-cpp/chapter07-features-const-macros)
- [Ch 9: Naming](/blog/embedded/standards/google-cpp/chapter09-naming)
