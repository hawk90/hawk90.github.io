---
title: "Part 9-08: utility (apply, in_place 등)"
date: 2026-05-25T09:00:00
description: "absl::apply, in_place_t, integer_sequence — std 미도착 또는 가독성 보강 헬퍼 모음."
series: "Abseil Code Review"
seriesOrder: 55
tags: [cpp, abseil, utility, apply, in-place]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## utility 헤더가 모은 작은 도구들

`absl/utility/utility.h`는 *std 미도착 시기에 필요하던 작은 헬퍼*를 모은 곳이다. 대부분 C++17/20에서 std로 들어왔지만 코드 호환을 위해 유지된다.

```cpp
#include "absl/utility/utility.h"

// 1. apply — tuple 풀어서 함수 호출
auto sum = absl::apply([](int a, int b, int c) { return a + b + c; },
                       std::make_tuple(1, 2, 3));   // 6

// 2. in_place_t / in_place_index_t — emplace tag
absl::optional<std::vector<int>> v(absl::in_place, {1, 2, 3});

// 3. integer_sequence / make_index_sequence — variadic 헬퍼
template <typename... Ts>
void PrintAll(std::tuple<Ts...> t) {
    PrintImpl(t, absl::make_index_sequence<sizeof...(Ts)>{});
}

// 4. exchange — 값 swap 한 줄
T old = absl::exchange(slot, new_value);
```

## absl::apply — tuple 인자 풀기

```cpp
auto f = [](int a, std::string b, double c) { /* ... */ };
auto args = std::make_tuple(1, std::string("x"), 3.14);

absl::apply(f, args);   // f(1, "x", 3.14)
```

C++17에 `std::apply`가 들어왔으므로 그 환경에서는 std 별칭. 일반화된 콜백 처리, decorator, mock framework 내부에서 자주 등장.

```cpp
// 실용 예 — 호출 정보를 캡처해 나중에 실행
struct CallRecord {
    std::function<void(std::tuple<int, std::string>)> invoker;
    std::tuple<int, std::string> args;
};

void RecordAndReplay(CallRecord r) {
    absl::apply(r.invoker, r.args);
}
```

## in_place_t — 직접 생성

`optional`/`variant`/`any`의 in-place 생성 tag.

```cpp
absl::optional<std::vector<int>> v(absl::in_place, 10, 0);
// vector<int>(10, 0) 직접 생성 — 임시 vector 생성 없음

absl::variant<std::string, int> x(absl::in_place_index<0>, "hello");
absl::variant<std::string, int> y(absl::in_place_type<int>, 42);

absl::any a(absl::in_place_type<std::vector<int>>, {1, 2, 3});
```

C++17의 `std::in_place`, `std::in_place_type`, `std::in_place_index`와 동일.

## integer_sequence — variadic 헬퍼

variadic template과 tuple 인덱싱을 함께 다룰 때.

```cpp
template <typename Tup, std::size_t... I>
void PrintImpl(const Tup& t, absl::index_sequence<I...>) {
    ((std::cout << std::get<I>(t) << " "), ...);
}

template <typename... Ts>
void Print(const std::tuple<Ts...>& t) {
    PrintImpl(t, absl::make_index_sequence<sizeof...(Ts)>{});
}

Print(std::make_tuple(1, "hello", 3.14));   // 1 hello 3.14
```

C++14 `std::make_index_sequence`의 polyfill. C++17 fold expression(`(... , expr)`)과 결합해 variadic을 깔끔히 처리.

## absl::exchange — 한 줄 swap

```cpp
class Resource {
public:
    Resource(Resource&& other) noexcept
        : handle_(absl::exchange(other.handle_, kInvalidHandle)) {}

    Resource& operator=(Resource&& other) noexcept {
        if (this != &other) {
            std::swap(handle_, other.handle_);
        }
        return *this;
    }
};
```

`exchange(target, new_value)`는 *old value를 반환* 하고 target에 new_value를 넣는다. move ctor의 표준 관용구.

## absl::launder

C++17 `std::launder`. union·placement-new·reinterpret_cast 후 *aliasing 규칙*을 컴파일러에게 알린다.

```cpp
alignas(T) std::byte storage[sizeof(T)];
T* p = new (storage) T();
T* clean = absl::launder(p);   // strict aliasing safe
```

custom allocator, in-place storage 구현에서만 등장. 일반 코드는 거의 만나지 않는다.

## 그 외 작은 helpers

```cpp
// to_address — fancy pointer를 raw로
T* p = absl::to_address(it);   // iterator → raw pointer (가능한 경우)

// move_if_noexcept — strong exception safety 보장
T moved = absl::move_if_noexcept(x);
```

대부분 std에 들어왔고, Abseil polyfill은 C++11/14 코드의 호환 layer다.

## 작은 예시 — Variadic logging helper

```cpp
template <typename... Args>
void DebugLog(absl::string_view label, Args&&... args) {
    auto tup = std::forward_as_tuple(std::forward<Args>(args)...);

    auto format = [label](auto&&... xs) {
        return absl::StrCat(label, ": ", absl::AlphaNum(xs)..., "");
    };

    LOG(INFO) << absl::apply(format, tup);
}

DebugLog("counts", 1, 2, 3, "go");   // "counts: 1 2 3 go"
```

`apply` + `forward_as_tuple` 조합으로 가변 인자를 한 번에 forward.

## 회피 패턴

```cpp
// 회피 — boilerplate
template <typename Tup, std::size_t... I>
auto Call(F f, Tup t, std::index_sequence<I...>) {
    return f(std::get<I>(t)...);
}

// Good
auto r = absl::apply(f, t);
```

```cpp
// 회피 — optional에 임시 객체 만들고 move
absl::optional<std::vector<int>> v;
v = std::vector<int>(10, 0);   // 임시 + move

// Good — in_place로 직접
absl::optional<std::vector<int>> v(absl::in_place, 10, 0);
```

## 정리

- `absl::apply` — tuple을 함수 인자로 풀어 호출. C++17 std::apply의 polyfill.
- `absl::in_place`/`in_place_type`/`in_place_index` — optional/variant/any in-place 생성 tag.
- `absl::make_index_sequence` + fold expression — variadic 처리.
- `absl::exchange` — move ctor 한 줄 관용구.
- 대부분 std에 들어왔으므로 C++17 이상 빌드에서는 std 별칭.

## 다음 장 예고

[Part 10-01: AbslHashValue](/blog/programming/code-review/abseil/part10-01-abseil-hash-value) — 사용자 타입을 해시 가능하게.

## 관련 항목

- [Part 9-03: absl::optional](/blog/programming/code-review/abseil/part9-03-optional)
- [Part 9-04: absl::variant](/blog/programming/code-review/abseil/part9-04-variant)
- [Part 9-06: absl::any](/blog/programming/code-review/abseil/part9-06-any)
- [원문 — utility](https://github.com/abseil/abseil-cpp/blob/master/absl/utility/utility.h)
