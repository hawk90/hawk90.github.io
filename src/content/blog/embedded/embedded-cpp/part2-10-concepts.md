---
title: "Part 2-10: Concepts (C++20)"
date: 2026-05-14T10:00:00
description: "Template 제약을 명시 — SFINAE의 가독성 개선, 에러 메시지 명확화, 자체 문서화."
series: "Embedded C++ for Real Systems"
seriesOrder: 18
tags: [cpp, embedded, concepts, cpp20, templates, constraints]
type: tech
---

## 한 줄 요약

> **"Concepts = *templates의 type safety*."** — *어떤 type을 받는지* 함수 시그니처에 명시. 에러 메시지가 *읽힙니다*.

## 어떤 문제를 푸는가

C++20 이전의 templates는 *받을 수 있는 type 제약*이 *코드에 안 보입니다*.

```cpp
template<typename T>
T add(T a, T b) {
    return a + b;
}

add(1, 2);        // OK
add(1.5, 2.5);    // OK
add(std::string("a"), std::string("b"));   // OK
add(MyStruct{}, MyStruct{});               // ERROR — operator+ 없으면 컴파일 에러
```

에러 메시지는 *수십 줄의 내부 detail*. *사용자는 이해 어려움*.

```text
error: no match for 'operator+' (operand types are 'MyStruct' and 'MyStruct')
note: candidates are:
note:  /usr/include/c++/11/bits/stl_iterator.h:1234:5: note: ...
note:  /usr/include/c++/11/bits/stl_function.h:567:1: note: ...
(continue for 30 lines)
```

C++20 **concepts**는 *제약을 시그니처에 명시*하고 *명확한 에러*를 제공.

## Concept 정의

```cpp
#include <concepts>

template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template<Addable T>
T add(T a, T b) {
    return a + b;
}

add(1, 2);                  // OK
add(MyStructWithoutPlus{}, MyStructWithoutPlus{});
// ERROR — but with clear message:
// error: no matching function for call to 'add'
// note: candidate template ignored: constraints not satisfied
// note: because 'MyStructWithoutPlus' does not satisfy 'Addable'
```

*에러 메시지가 의미 있음*. *Addable 만족 안 함*이 *즉시 명시*.

## Concept syntax 세 가지

### 1. `requires` clause

```cpp
template<typename T>
requires std::integral<T>
T square(T x) {
    return x * x;
}
```

### 2. 짧은 form

```cpp
template<std::integral T>
T square(T x) {
    return x * x;
}
```

### 3. abbreviated function template

```cpp
auto square(std::integral auto x) {
    return x * x;
}
```

가장 짧음. *함수 시그니처 자체가 제약*. 권장.

## 표준 concepts (`<concepts>`)

```cpp
// 기본 type
std::integral<T>
std::signed_integral<T>
std::unsigned_integral<T>
std::floating_point<T>

// 관계
std::same_as<T, U>
std::derived_from<Derived, Base>
std::convertible_to<From, To>
std::common_with<T, U>

// 비교
std::equality_comparable<T>
std::totally_ordered<T>
std::three_way_comparable<T>

// 호출 가능
std::invocable<F, Args...>
std::predicate<F, Args...>

// 생성/이동
std::default_initializable<T>
std::copy_constructible<T>
std::move_constructible<T>
std::movable<T>
std::copyable<T>

// 범위 (ranges)
std::ranges::range<R>
std::ranges::input_range<R>
std::ranges::random_access_range<R>
```

C++ Core Library가 *대부분 표준 concepts* 제공. *직접 정의 거의 불필요*.

## `requires` expression

custom concept 정의의 *기본 도구*.

```cpp
template<typename T>
concept Container = requires(T c) {
    typename T::value_type;        // 1. nested type 존재
    typename T::iterator;
    { c.begin() } -> std::same_as<typename T::iterator>;   // 2. method 시그니처
    { c.end() } -> std::same_as<typename T::iterator>;
    { c.size() } -> std::convertible_to<std::size_t>;     // 3. 변환 가능 반환
};
```

requires 안 4가지 표현:

1. **Simple requirement** — `expr;` — expr이 valid이어야
2. **Type requirement** — `typename T::xxx;` — nested type 존재
3. **Compound requirement** — `{ expr } -> Concept;` — expr 결과가 concept 만족
4. **Nested requirement** — `requires Concept<T>;` — 또 다른 concept 적용

## 임베디드 — Driver concept

```cpp
template<typename T>
concept Driver = requires(T d) {
    { d.init() }       -> std::same_as<bool>;
    { d.reset() }      -> std::same_as<void>;
    { d.is_ready() }   -> std::convertible_to<bool>;
};

template<Driver D>
void register_driver(D& driver) {
    if (!driver.init()) {
        log_error("driver init failed");
        return;
    }
    // ...
}
```

*Driver 만족 안 하는 type*은 *시그니처에서 거부*. *function body 안 검사 불필요*.

## 임베디드 — 컴파일 타임 dispatch with concepts

if constexpr + concepts.

```cpp
template<typename T>
concept HasUserDeserialize = requires(T t, const uint8_t* buf, size_t len) {
    { t.deserialize(buf, len) } -> std::same_as<bool>;
};

template<typename T>
bool decode(T& obj, const uint8_t* buf, size_t len) {
    if constexpr (HasUserDeserialize<T>) {
        return obj.deserialize(buf, len);
    } else if constexpr (std::is_trivially_copyable_v<T>) {
        if (len < sizeof(T)) return false;
        std::memcpy(&obj, buf, sizeof(T));
        return true;
    } else {
        static_assert(sizeof(T) == 0,
                      "Type must have deserialize() or be trivially copyable");
    }
}
```

*우선순위*가 *코드에 명시*. *type별 분기*가 *자연스럽게 읽힘*.

## Concept 조합

`&&` (and), `||` (or)로 *조합*.

```cpp
template<typename T>
concept NumericSerializable =
    std::integral<T> ||
    std::floating_point<T>;

template<typename T>
concept LightweightNumeric =
    NumericSerializable<T> &&
    sizeof(T) <= 4;

template<LightweightNumeric T>
void write_field(T value) {
    // ...
}

write_field(int8_t(5));        // OK
write_field(float(1.5f));      // OK
write_field(double(1.5));      // ERROR — double은 8 byte
write_field(std::string());    // ERROR — not numeric
```

## CRTP + Concepts — 강력한 결합

[Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)의 CRTP를 *concept로 명확화*.

```cpp
template<typename T>
concept LoggerImpl = requires(T t, const char* msg) {
    { t.log_impl(msg) } -> std::same_as<void>;
};

template<LoggerImpl Derived>
class LoggerBase {
public:
    void log(const char* msg) {
        static_cast<Derived*>(this)->log_impl(msg);
    }
};

class UartLogger : public LoggerBase<UartLogger> {
public:
    void log_impl(const char* msg) { /* */ }
};

class BadLogger : public LoggerBase<BadLogger> {
public:
    // log_impl 누락 — 컴파일 에러
};
// error: BadLogger does not satisfy 'LoggerImpl'
```

*CRTP base의 type 매개변수가 concept 만족*해야. *missing method*가 *명확한 에러*.

## Concept으로 SFINAE 대체

```cpp
// SFINAE (C++17)
template<typename T,
         std::enable_if_t<std::is_integral_v<T>, int> = 0>
T abs(T x) {
    return x < 0 ? -x : x;
}

// Concept (C++20)
template<std::integral T>
T abs(T x) {
    return x < 0 ? -x : x;
}

// abbreviated (C++20)
auto abs(std::integral auto x) {
    return x < 0 ? -x : x;
}
```

C++20이 *압도적으로 짧고 명확*.

## 임베디드 — Range-based 알고리즘

```cpp
#include <ranges>

template<std::ranges::input_range R>
auto sum(R&& range) {
    typename std::ranges::range_value_t<R> total{};
    for (auto&& val : range) total += val;
    return total;
}

int arr[] = {1, 2, 3, 4, 5};
auto s = sum(arr);   // 15

std::array<float, 3> floats = {1.0f, 2.0f, 3.0f};
auto sf = sum(floats);   // 6.0f
```

*어떤 range든* — *array, vector, std::array, 사용자 컨테이너*. concept만 만족하면 OK.

## Concept 오버로드 — 더 specific 우선

```cpp
template<std::integral T>
void print(T value) { /* integer 전용 */ }

template<std::floating_point T>
void print(T value) { /* float 전용 */ }

template<typename T>
void print(T value) { /* fallback */ }

print(1);       // integer 버전
print(1.5);     // float 버전
print("str");   // fallback
```

*더 제약된 concept*이 *우선*. *오버로드 resolution이 명확*.

## 자주 보는 함정과 안티패턴

### 1. *concept 너무 복잡*
```cpp
template<typename T>
concept Foo = requires(T t) {
    { t.method1() } -> std::convertible_to<int>;
    { t.method2() } -> std::same_as<void>;
    { t.method3(int(0), float(0.0f)) } -> std::same_as<bool>;
    typename T::value_type;
    typename T::iterator;
    requires std::integral<typename T::value_type>;
    // ... 20 more
};
```
*작은 concept으로 분해*. 조합으로.

### 2. *requires 표현 잘못*
```cpp
template<typename T>
concept Foo = requires(T t) {
    t.bar();   // 호출만 됨 (반환 타입 무관)
    { t.baz() } -> std::same_as<int>;   // 반환 정확히 int
    { t.qux() } -> std::convertible_to<int>;   // int로 변환 가능
};
```
*표현마다 의미 다름*. 의도에 맞게.

### 3. *concept 없이 templates*
```cpp
template<typename T>
T process(T x);   // 어떤 T든 받음
```
*문서/사용자 친화성 떨어짐*. concept으로 *제약 명시*.

### 4. *concept와 macro 혼동*
concept은 *type system*. macro는 *텍스트 치환*. 다름.

### 5. *toolchain 미지원*
ARM Compiler 6, IAR 일부는 *C++20 concepts 미지원*. *C++17과 SFINAE 폴백* 또는 toolchain 업그레이드.

### 6. *나만의 concept 과용*
표준 concept이 *이미 있는데* 직접 정의. `std::integral` 대신 `MyInt` 만들기.

## 측정 — concept 사용 시 코드 변화

같은 함수, C++17 SFINAE vs C++20 concept.

```cpp
// C++17 — SFINAE
template<typename T,
         std::enable_if_t<std::is_integral_v<T>, int> = 0>
T add(T a, T b) { return a + b; }

// C++20 — concept
template<std::integral T>
T add(T a, T b) { return a + b; }
```

코드 크기: *동일*. concept은 *컴파일 시점에만 영향*. 런타임 동일.

컴파일 시간: concept이 *약간 빠름* (SFINAE 추론보다 단순).

에러 메시지: concept이 *훨씬 짧고 명확*.

## C++20 concepts의 *실용 가치*

1. **에러 메시지** — 가장 큰 이점. 30줄 → 1-2줄.
2. **자체 문서화** — 함수 시그니처가 *제약 명시*.
3. **오버로드 명확화** — 더 specific concept 우선.
4. **SFINAE 대체** — 짧고 읽기 좋음.

## 정리

- Concepts = *template 제약을 시그니처에 명시*. C++20.
- 표준 concepts: `<concepts>` + `<ranges>` 풍부.
- 3가지 syntax: `requires`, `template<Concept T>`, `auto func(Concept auto x)`.
- *CRTP + concept*으로 *interface 명확*. 누락 멤버는 *명확한 에러*.
- SFINAE 대체. *짧고 읽기 좋음*. 에러 메시지 *훨씬 명확*.
- toolchain 확인 필수 — GCC 10+, Clang 12+. ARM Compiler 6는 부분.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 2-09: Type Traits](/blog/embedded/embedded-cpp/part2-09-type-traits) — SFINAE
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++20 채택 결정

## 다음 글 (Part 3 시작)

[Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc) — *임베디드의 첫 번째 원칙*. `new`, `malloc` 없이 *modern C++*를 쓰는 패턴.
