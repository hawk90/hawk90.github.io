---
title: "absl::variant 분석"
date: 2026-06-12T09:03:00
description: "absl::variant — std::variant의 polyfill. 타입-안전 union과 visitor 패턴."
series: "Abseil Code Review"
seriesOrder: 51
tags: [cpp, abseil, types, variant, visitor]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## std와의 관계

`absl::variant`는 `absl::optional`과 같은 방식으로 *C++17 이상에서는 std의 별칭*이다.

```cpp
#include "absl/types/variant.h"

absl::variant<int, std::string, double> v = 42;
v = std::string("hello");
v = 3.14;
```

C++14/Abseil-polyfill 시기에 작성된 코드도 그대로 동작한다.

## 기본 사용

```cpp
absl::variant<int, std::string> v = 10;

// 현재 들어 있는 인덱스
size_t i = v.index();   // 0

// 타입 검사
if (absl::holds_alternative<int>(v)) {
    int x = absl::get<int>(v);
}

// 인덱스 기반
double d = absl::get<0>(v);   // ❌ 타입 안 맞음 — bad_variant_access

// 안전 getter
if (const int* p = absl::get_if<int>(&v)) {
    use(*p);
}
```

## Visitor 패턴

여러 타입을 한 번에 처리하려면 visitor.

```cpp
absl::variant<int, std::string, double> v = ...;

std::string s = absl::visit([](const auto& val) -> std::string {
    if constexpr (std::is_same_v<std::decay_t<decltype(val)>, int>) {
        return absl::StrCat("int=", val);
    } else if constexpr (std::is_same_v<std::decay_t<decltype(val)>, std::string>) {
        return absl::StrCat("str=", val);
    } else {
        return absl::StrCat("dbl=", val);
    }
}, v);
```

C++17 `if constexpr` + lambda 조합이 표준 visitor 작성법이다. 더 깔끔하게는 *overloaded* 패턴:

```cpp
template <typename... Ts>
struct overloaded : Ts... { using Ts::operator()...; };
template <typename... Ts> overloaded(Ts...) -> overloaded<Ts...>;

absl::variant<int, std::string, double> v = ...;
std::string s = absl::visit(overloaded{
    [](int n)              { return absl::StrCat("int=", n); },
    [](const std::string& s){ return absl::StrCat("str=", s); },
    [](double d)           { return absl::StrCat("dbl=", d); },
}, v);
```

가독성이 크게 좋다.

## 언제 variant를 쓰나

여러 *동등한 의미*의 타입이 한 슬롯에 들어갈 때.

```cpp
// API 응답 — 성공 or 에러 메시지 or rate-limited
absl::variant<Response, ApiError, RateLimited> result = Call();

// 토큰 — 숫자, 식별자, 문자열 리터럴
absl::variant<int64_t, std::string, double> Token;

// 이벤트 — 각각 다른 페이로드
struct ClickEvent { int x, y; };
struct KeyEvent { int code; };
struct ScrollEvent { double delta; };
absl::variant<ClickEvent, KeyEvent, ScrollEvent> Event;
```

상속 + virtual 함수 대안으로 *closed set*에 적합. 새 타입을 추가할 때 모든 visitor가 컴파일 에러로 알려준다(빠진 case 발견).

## monostate — 비어 있는 상태

variant는 *기본 생성 시 첫 번째 타입의 기본값*을 가진다. "비어 있음" 상태가 필요하면 `monostate`를 첫 번째로.

```cpp
absl::variant<absl::monostate, Request, Response> conn;
// 기본 — monostate (아직 어떤 메시지도 안 옴)
```

## get vs get_if

```cpp
absl::variant<int, std::string> v = "hello";

// get<T> — 잘못된 타입이면 throw
auto s = absl::get<std::string>(v);   // OK
auto n = absl::get<int>(v);            // ❌ throw absl::bad_variant_access

// get_if<T> — 잘못된 타입이면 nullptr
if (auto* p = absl::get_if<std::string>(&v)) {
    use(*p);
}
```

코드 리뷰에서 *`get`을 무방비로 부르는 것*은 흔한 지적이다. 항상 `holds_alternative` 가드 또는 `get_if` 사용.

## 비교

같은 인덱스의 같은 타입이면 그 타입의 비교. 인덱스가 다르면 *인덱스 순서*.

```cpp
absl::variant<int, std::string> a = 5;
absl::variant<int, std::string> b = std::string("hello");

a < b;   // true — int(index 0) < string(index 1)
```

이 의미가 헷갈리므로 변형 비교는 가급적 명시적 visit으로 한다.

## variant의 비용

| 측면 | 비용 |
|------|------|
| sizeof | `max(sizeof(Ts)) + index` (정렬 패딩 포함) |
| 접근 | tag check + branch — branchless 불가 |
| visit | constexpr-resolved jump table (대부분 분기 한 번) |
| construct/destroy | 활성 타입의 ctor/dtor 호출 |

`union` 직접 사용보다 살짝 무겁지만(인덱스 1바이트 + 동적 분기) *type safety*가 그 비용을 정당화한다.

## 회피 패턴

```cpp
// 회피 — variant<int, int> 같은 모호한 alternative
absl::variant<int, int> v;   // ❌ 컴파일 에러는 아니지만 의미 불분명

// Good — 별칭으로 의도 분리
struct UserId { int v; };
struct OrderId { int v; };
absl::variant<UserId, OrderId> v;
```

```cpp
// 회피 — visitor에 모든 alternative 안 다룸
absl::visit(overloaded{
    [](int n) { /* ... */ },
    // string은? — overload mismatch → 컴파일 에러로 잡힘 (good!)
}, v);
```

`overloaded` 패턴의 장점이 여기서 드러난다. 새 alternative를 추가하면 컴파일이 깨져서 모든 호출 지점에서 처리하게 강제한다.

## 작은 예시 — 토큰화 결과

```cpp
struct Number { double value; };
struct Identifier { std::string name; };
struct StringLit { std::string text; };
struct Punct { char ch; };

using Token = absl::variant<Number, Identifier, StringLit, Punct>;

std::string Print(const Token& t) {
    return absl::visit(overloaded{
        [](const Number& n)    { return absl::StrCat("NUM(", n.value, ")"); },
        [](const Identifier& i){ return absl::StrCat("ID(", i.name, ")"); },
        [](const StringLit& s) { return absl::StrCat("STR(\"", s.text, "\")"); },
        [](const Punct& p)     { return absl::StrCat("'", std::string(1, p.ch), "'"); },
    }, t);
}
```

## 정리

- `absl::variant`는 C++17 이상에서 `std::variant`의 별칭.
- type-safe union — `holds_alternative`/`get_if`/`visit`로 안전 접근.
- `overloaded{...} + visit` 패턴이 visitor 작성의 표준.
- *closed set*의 다형성에 적합 — 상속 + virtual의 가벼운 대안.
- `get<T>`는 throw하므로 무방비 호출 회피, `get_if`/`holds_alternative` 우선.
- `absl::monostate`로 비어 있는 상태 표현.

## 다음 장 예고

[Part 9-05: absl::span](/blog/programming/code-review/abseil/part9-05-span) — 연속 메모리 view.

## 관련 항목

- [Part 9-03: absl::optional](/blog/programming/code-review/abseil/part9-03-optional)
- [Part 3-02: StatusOr](/blog/programming/code-review/abseil/part3-02-status-or)
- [Effective Modern C++ — 항목 14: noexcept](/blog/programming/cpp/effective-modern-cpp)
- [원문 — absl::variant](https://abseil.io/docs/cpp/guides/types#variant)
