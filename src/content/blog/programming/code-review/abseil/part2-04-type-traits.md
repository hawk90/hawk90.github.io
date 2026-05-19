---
title: "Part 2-04: type_traits (negation, conjunction, void_t)"
date: 2026-05-23T09:00:00
description: "Part 2-04: absl::negation, absl::conjunction, absl::void_t — C++17 type_traits의 C++14 polyfill과 SFINAE 활용."
series: "Abseil Code Review"
seriesOrder: 9
tags: [cpp, abseil, type-traits, sfinae, meta-programming]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: `absl::negation`, `absl::conjunction`, `absl::disjunction`, `absl::void_t`는 C++17이 표준화한 type_traits 유틸리티의 C++14 polyfill이다. short-circuit evaluation과 SFINAE 친화성이 핵심이다.

## 어떤 문제를 푸는가

template metaprogramming에서 "조건을 합치는" 작업은 흔하다.

```cpp
template <typename T>
std::enable_if_t<std::is_integral_v<T> && !std::is_same_v<T, bool>, void>
DoSomething(T t);
```

`&&`로 직접 묶는 방식은 C++14까지는 SFINAE에서 short-circuit이 보장되지 않았다. 즉, 첫 조건이 거짓이어도 두 번째 조건이 instantiated되어 hard error를 일으킬 수 있다. C++17의 `std::conjunction`이 이 문제를 해결했고, `absl::conjunction`은 C++14에서도 같은 동작을 제공한다.

## absl::negation — 부정

```cpp
// absl/meta/type_traits.h
template <typename T>
struct negation : std::integral_constant<bool, !T::value> {};
```

`std::negation` (C++17)과 동일.

```cpp
template <typename T>
using is_not_void = absl::negation<std::is_void<T>>;

static_assert(is_not_void<int>::value);
static_assert(!is_not_void<void>::value);
```

`!` 한 번 쓰는 것과 차이는 없어 보이지만, 다른 traits와 조합할 때 의미가 살아난다.

## absl::conjunction — AND (short-circuit)

```cpp
template <typename... Ts>
struct conjunction : std::true_type {};

template <typename T>
struct conjunction<T> : T {};

template <typename T, typename... Ts>
struct conjunction<T, Ts...>
    : std::conditional_t<bool(T::value), conjunction<Ts...>, T> {};
```

핵심은 `std::conditional_t`다. 첫 조건이 false면 나머지를 instantiate하지 않는다.

```cpp
// 위험한 패턴 — &&로 합치면 두 번째가 항상 instantiated
template <typename T>
std::enable_if_t<
    sizeof(T) > 0 && HasIteratorTrait<T>::value,
    void
> Process(T t);

// 안전한 방식 — conjunction으로 short-circuit
template <typename T>
std::enable_if_t<
    absl::conjunction<
        std::integral_constant<bool, (sizeof(T) > 0)>,
        HasIteratorTrait<T>
    >::value,
    void
> Process(T t);
```

## absl::disjunction — OR (short-circuit)

```cpp
template <typename... Ts>
struct disjunction : std::false_type {};

template <typename T>
struct disjunction<T> : T {};

template <typename T, typename... Ts>
struct disjunction<T, Ts...>
    : std::conditional_t<bool(T::value), T, disjunction<Ts...>> {};
```

대칭 구조다. 첫 조건이 true면 나머지를 instantiate하지 않는다.

```cpp
template <typename T>
using is_numeric = absl::disjunction<
    std::is_integral<T>,
    std::is_floating_point<T>
>;

static_assert(is_numeric<int>::value);
static_assert(is_numeric<double>::value);
static_assert(!is_numeric<std::string>::value);
```

## absl::void_t — SFINAE 핵심 도구

```cpp
template <typename...>
using void_t = void;
```

단순해 보이지만 SFINAE의 가장 강력한 도구 중 하나. "이 type 표현식이 valid한가"를 검사한다.

```cpp
// T가 iterator를 가졌는가?
template <typename T, typename = void>
struct has_iterator : std::false_type {};

template <typename T>
struct has_iterator<T, absl::void_t<typename T::iterator>>
    : std::true_type {};

static_assert(has_iterator<std::vector<int>>::value);
static_assert(!has_iterator<int>::value);
```

작동 원리:

1. primary template은 `false_type` 상속.
2. partial specialization이 `T::iterator`를 시도. 성공하면 `void`로 evaluation되어 specialization 선택.
3. 실패하면 SFINAE로 primary template fallback.

### 더 복잡한 예시 — detection idiom

```cpp
// T가 begin()을 가졌는가?
template <typename T, typename = void>
struct has_begin : std::false_type {};

template <typename T>
struct has_begin<T, absl::void_t<decltype(std::declval<T>().begin())>>
    : std::true_type {};

// begin()과 end()를 모두 가졌는가?
template <typename T, typename = void>
struct is_iterable : std::false_type {};

template <typename T>
struct is_iterable<T, absl::void_t<
    decltype(std::declval<T>().begin()),
    decltype(std::declval<T>().end())
>> : std::true_type {};
```

`void_t`는 가변 인자 template이므로 여러 표현식을 한꺼번에 검사할 수 있다.

## std와의 비교

C++17 이후로는 표준 type_traits가 같은 기능을 제공한다.

| Abseil | C++17 std |
|---|---|
| `absl::negation<T>` | `std::negation<T>` |
| `absl::conjunction<Ts...>` | `std::conjunction<Ts...>` |
| `absl::disjunction<Ts...>` | `std::disjunction<Ts...>` |
| `absl::void_t<Ts...>` | `std::void_t<Ts...>` |

C++14를 타깃하는 코드에서는 Abseil 버전이 필요. C++17 이상이면 std로 옮기는 것이 권장된다.

```cpp
// 권장 마이그레이션
// before
using has_x = absl::conjunction<HasFoo<T>, HasBar<T>>;

// after (C++17+)
using has_x = std::conjunction<HasFoo<T>, HasBar<T>>;
```

## absl 추가 traits

표준에 없는 traits도 있다.

### type_identity

C++20에서 표준화된 `type_identity`의 polyfill.

```cpp
template <typename T>
struct type_identity { using type = T; };

template <typename T>
void Print(T value, typename absl::type_identity<T>::type other);
// 두 인자가 다른 type이면 첫 인자만 deduction
```

### is_trivially_*

오래된 컴파일러에서 부정확한 `std::is_trivially_*`를 컴파일러 builtin으로 직접 구현. 지금은 대부분의 컴파일러가 표준 traits를 정확히 구현하므로 사용 빈도 감소.

## 코드 리뷰 포인트

```cpp
// 회피 — &&로 SFINAE 조건을 합침 (C++14)
template <typename T>
std::enable_if_t<
    std::is_integral_v<T> && (sizeof(T) > 4),
    void
> Process(T t);

// Good — conjunction
template <typename T>
std::enable_if_t<
    absl::conjunction<
        std::is_integral<T>,
        std::integral_constant<bool, (sizeof(T) > 4)>
    >::value,
    void
> Process(T t);
```

```cpp
// 회피 — detection을 매번 손으로
template <typename T>
auto HasBegin(int) -> decltype(std::declval<T>().begin(), std::true_type{});
template <typename T>
auto HasBegin(...) -> std::false_type;

// Good — void_t 패턴
template <typename T, typename = void>
struct HasBegin : std::false_type {};

template <typename T>
struct HasBegin<T, absl::void_t<decltype(std::declval<T>().begin())>>
    : std::true_type {};
```

리뷰에서:

1. **C++ 표준 버전이 무엇인가** — C++17+이면 std로 옮길 것.
2. **SFINAE에서 &&를 쓰는가** — short-circuit이 필요하면 conjunction.
3. **detection idiom을 재발명하는가** — void_t 패턴 권장.

## 자주 보는 안티패턴

```cpp
// 회피 — concept이 있는데도 conjunction 사용 (C++20)
template <typename T>
requires absl::conjunction<...>::value
void Process(T t);

// Good — concept 직접 사용
template <typename T>
requires std::integral<T>
void Process(T t);
```

```cpp
// 회피 — type_traits를 macro로 감쌈
#define HAS_BEGIN(T) HasBegin<T>::value
if constexpr (HAS_BEGIN(MyType)) { ... }
// 매크로보다 traits를 직접 쓰는 게 디버깅에 유리.
```

## 정리

- `absl::conjunction`, `absl::disjunction`은 short-circuit AND/OR. C++17 `std::conjunction`의 polyfill.
- `absl::negation`은 traits 부정.
- `absl::void_t`는 detection idiom의 핵심. "이 표현식이 valid한가"를 검사.
- C++17 이상이면 std로 옮길 것.
- C++20 concept이 있으면 traits보다 우선.

## 다음 편

Part 2-05에서 Abseil의 conformance / policy 매크로를 본다. `ABSL_DEPRECATED_IF_UNAVAILABLE` 같은 정책 매크로가 어떻게 마이그레이션을 점진적으로 가능하게 하는지.

## 관련 항목

- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_*](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [Part 2-05: Conformance / policy](/blog/programming/code-review/abseil/part2-05-conformance-policy)
- [Part 9-03: absl::optional](/blog/programming/code-review/abseil/part9-03-optional)
- [Part 9-04: absl::variant](/blog/programming/code-review/abseil/part9-04-variant)
- [Effective Modern C++: alias declarations](/blog/programming/cpp/effective-modern-cpp)
- [원문 — absl/meta/type_traits.h](https://github.com/abseil/abseil-cpp/blob/master/absl/meta/type_traits.h)
