---
title: "Type Traits 임베디드 활용 — SFINAE·is_pod·컴파일 타임 검사"
slug: "embedded/embedded-cpp/part2-09-type-traits"
date: 2026-04-29T09:17:00
description: "std::is_*, std::enable_if, SFINAE — 컴파일 타임 type 정보로 코드 분기와 검증."
series: "Embedded C++ for Real Systems"
seriesOrder: 17
tags: [cpp, embedded, type-traits, sfinae, enable-if, compile-time]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"Type Traits = type에 대한 컴파일 타임 query."** — 이 타입이 integral인가, signed인가, trivial인가를 묻고 그에 따라 분기합니다.

## 어떤 문제를 푸는가

generic 코드에서는 타입에 따라 다른 동작이 필요합니다.

```cpp
template<typename T>
void process(T value) {
    // T가 integral이면 → bit operation
    // T가 floating point면 → epsilon 비교
    // T가 pointer면 → null check
}
```

C11의 `_Generic`도 타입에 따라 식을 선택할 수 있습니다. C++에서는 표준 trait와 템플릿으로 타입 속성을 조합하고 제약을 표현합니다. C++ Type Traits가 컴파일 타임 type query를 제공합니다.

```cpp
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        // integral 전용
    } else if constexpr (std::is_floating_point_v<T>) {
        // float 전용
    } else if constexpr (std::is_pointer_v<T>) {
        // pointer 전용
    }
}
```

`if constexpr`과 함께 쓰면 런타임 코드 분기가 사라지고, 해당 타입에 맞는 코드만 컴파일됩니다.

## 표준 Type Traits (`<type_traits>`)

### Primary categories

```cpp
std::is_void_v<T>
std::is_integral_v<T>       // bool, char, int, long ...
std::is_floating_point_v<T> // float, double, long double
std::is_array_v<T>
std::is_pointer_v<T>
std::is_reference_v<T>
std::is_function_v<T>
std::is_class_v<T>          // class, struct
std::is_enum_v<T>
std::is_union_v<T>
```

### Composite categories

```cpp
std::is_arithmetic_v<T>   // integral || floating_point
std::is_fundamental_v<T>  // arithmetic || void || nullptr_t
std::is_object_v<T>       // 변수가 될 수 있는 타입
std::is_scalar_v<T>       // arithmetic, enum, pointer, member pointer, nullptr_t
```

### Type properties

```cpp
std::is_const_v<T>
std::is_volatile_v<T>
std::is_signed_v<T>
std::is_unsigned_v<T>
std::is_trivially_copyable_v<T>
std::is_standard_layout_v<T>
std::is_pod_v<T>          // deprecated in C++20
std::is_empty_v<T>
std::is_final_v<T>
std::is_abstract_v<T>
```

### Relationships

```cpp
std::is_same_v<T, U>
std::is_base_of_v<Base, Derived>
std::is_convertible_v<From, To>
```

### Type transformations

```cpp
std::remove_const_t<T>
std::remove_reference_t<T>
std::remove_pointer_t<T>
std::add_const_t<T>
std::decay_t<T>           // 함수/배열 → 포인터, ref/cv 제거
std::underlying_type_t<E> // enum의 underlying type
std::make_signed_t<T>
std::make_unsigned_t<T>
```

`_v`는 C++17의 variable template, `_t`는 C++14의 alias template입니다. 짧고 명확해 사용이 편합니다.

## 임베디드 — type-safe register access

```cpp
template<typename T>
void write_register(uintptr_t addr, T value) {
    static_assert(std::is_trivially_copyable_v<T>,
                  "Only trivially copyable types");
    static_assert(sizeof(T) <= 4,
                  "Register write up to 4 bytes only");
    *reinterpret_cast<volatile T*>(addr) = value;
}

write_register<uint32_t>(GPIO_BASE + ODR, 0xFF);   // OK
write_register<std::string>(...)                   // ERROR — not trivially copyable
write_register<uint64_t>(...)                      // ERROR — too large
```

잘못된 사용을 컴파일 시점에 차단합니다.

## SFINAE — Substitution Failure Is Not An Error

C++의 오래된 idiom입니다. 함수 템플릿의 타입 추론·치환 중 immediate context에서 생긴 실패는 후보를 제외하는 데 쓰이며, 이를 활용해 조건부 오버로드를 구성합니다.

```cpp
// 정수 전용
template<typename T,
         std::enable_if_t<std::is_integral_v<T>, int> = 0>
void process(T value) {
    // integral logic
}

// 부동소수 전용
template<typename T,
         std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
void process(T value) {
    // float logic
}

process(5);      // OK — int 버전
process(1.5f);   // OK — float 버전
process("str");  // ERROR — 둘 다 안 맞음
```

`std::enable_if`는 조건이 true이면 정의를 남기고, false이면 substitution failure로 처리해 해당 오버로드를 무시합니다.

C++17의 `if constexpr`은 함수 본문 안의 구현 선택을 단순하게 만듭니다. 후보 함수 자체를 오버로드 집합에서 제외하는 SFINAE와는 역할이 다릅니다. C++20 concepts도 시그니처의 제약을 표현하는 선택지입니다.

```cpp
// if constexpr — 훨씬 깔끔
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        // integral logic
    } else if constexpr (std::is_floating_point_v<T>) {
        // float logic
    } else {
        static_assert(sizeof(T) == 0, "Unsupported type");
    }
}
```

## void_t — SFINAE 검출 idiom

타입에 특정 멤버나 함수가 있는지를 컴파일 타임에 확인합니다.

```cpp
template<typename, typename = void>
struct has_to_string : std::false_type {};

template<typename T>
struct has_to_string<T, std::void_t<decltype(std::declval<T>().to_string())>>
    : std::true_type {};

template<typename T>
constexpr bool has_to_string_v = has_to_string<T>::value;
```

```cpp
struct Foo { std::string to_string() const { return ""; } };
struct Bar {};

static_assert(has_to_string_v<Foo>);
static_assert(!has_to_string_v<Bar>);

template<typename T>
void log(T value) {
    if constexpr (has_to_string_v<T>) {
        write_log(value.to_string());
    } else {
        write_log("(unsupported type)");
    }
}
```

C++20의 concepts가 훨씬 단순한 syntax를 제공합니다.

```cpp
// C++20
template<typename T>
concept Stringifiable = requires(T t) {
    { t.to_string() } -> std::convertible_to<std::string>;
};

template<typename T>
void log(T value) {
    if constexpr (Stringifiable<T>) {
        write_log(value.to_string());
    } else {
        write_log("(unsupported)");
    }
}
```

## 임베디드 — Serialization with traits

타입에 따라 다른 직렬화 방법을 골라 씁니다.

```cpp
template<typename T>
size_t serialize(uint8_t* buf, T value) {
    if constexpr (std::is_integral_v<T>) {
        static_assert(!std::is_same_v<T, bool>, "bool needs its own wire format");
        using U = std::make_unsigned_t<T>;
        U bits = static_cast<U>(value);
        // big-endian으로 정수 직렬화
        for (int i = sizeof(T) - 1; i >= 0; --i) {
            buf[sizeof(T) - 1 - i] = (bits >> (i * 8)) & 0xFF;
        }
        return sizeof(T);
    }
    else if constexpr (std::is_floating_point_v<T>) {
        // host object representation; IEEE 754 여부와 endian은 별도 확인
        std::memcpy(buf, &value, sizeof(T));
        return sizeof(T);
    }
    else if constexpr (std::is_enum_v<T>) {
        // underlying type으로
        using U = std::underlying_type_t<T>;
        return serialize(buf, static_cast<U>(value));
    }
    else if constexpr (std::is_trivially_copyable_v<T>) {
        // trivially copyable struct의 객체 표현; padding 포함
        std::memcpy(buf, &value, sizeof(T));
        return sizeof(T);
    }
    else {
        static_assert(sizeof(T) == 0, "Unsupported type for serialization");
    }
}

uint8_t buf[16];
serialize(buf, uint16_t(0x1234));   // big-endian integer
serialize(buf, 1.5f);                // float
serialize(buf, MyEnum::Foo);         // underlying int
serialize(buf, MyPOD{...});          // memcpy
serialize(buf, std::string{});       // ERROR — not trivially copyable
```

이 함수는 표현을 복사하는 예이며 이식 가능한 wire format을 보장하지 않습니다. padding, 부동소수점 표현, endian, 포인터 멤버를 별도로 고려해야 합니다. 출력 버퍼에 `sizeof(T)` 이상 공간이 있다는 호출자 계약도 필요합니다.

## std::declval — 인스턴스 없이 type query

`std::declval<T>()`는 T의 인스턴스가 있다고 가정합니다. 실제로 호출하지 않으며 type만 추론합니다.

```cpp
template<typename T>
using result_type = decltype(std::declval<T>().method());

// T::method()의 반환 타입을 컴파일 타임에 알아냄
```

`decltype`과 함께 사용합니다. 호출 시점이 아닌 declare 시점에 유효합니다.

## Custom traits 만들기

```cpp
// "포인터인가 + 정수인가" 조합 trait
template<typename T>
struct is_pointer_or_integer
    : std::bool_constant<std::is_pointer_v<T> || std::is_integral_v<T>> {};

template<typename T>
constexpr bool is_pointer_or_integer_v = is_pointer_or_integer<T>::value;

static_assert(is_pointer_or_integer_v<int>);
static_assert(is_pointer_or_integer_v<int*>);
static_assert(!is_pointer_or_integer_v<float>);
```

표준 trait들의 조합으로, 도메인 특화 검증에 활용합니다.

### 임베디드 — register-safe 타입

```cpp
template<typename T>
constexpr bool is_register_safe_v =
    std::is_unsigned_v<T> && std::is_integral_v<T> &&
    !std::is_same_v<T, bool> &&
    sizeof(T) <= 4 &&
    alignof(T) <= 4;

template<typename T>
void write_register(uintptr_t addr, T value) {
    static_assert(is_register_safe_v<T>,
                  "Type unsafe for register access");
    *reinterpret_cast<volatile T*>(addr) = value;
}
```

여러 타입 조건을 묶어 재사용하지만 이 trait만으로 MMIO 안전을 증명할 수는 없습니다. 허용된 레지스터 폭·주소 정렬·접근 권한·쓰기 부작용은 해당 MCU 매뉴얼 계약입니다. trivially copyable이라는 이유로 임의 struct를 volatile 대입하는 것도 일반적인 MMIO 구현이 아닙니다.

## Tag dispatch — SFINAE 대안

함수 오버로드를 tag 객체로 dispatch합니다.

```cpp
struct integral_tag {};
struct floating_tag {};

template<typename T>
auto get_tag() {
    if constexpr (std::is_integral_v<T>) return integral_tag{};
    else if constexpr (std::is_floating_point_v<T>) return floating_tag{};
}

void process_impl(int value, integral_tag) {
    // integral
}

void process_impl(float value, floating_tag) {
    // float
}

template<typename T>
void process(T value) {
    process_impl(value, get_tag<T>());
}
```

`if constexpr`보다 약간 복잡하지만, 오버로드가 명확해 문서로서의 가치가 있습니다. 일반적으로는 `if constexpr`을 권장합니다.

## 자주 보는 함정과 안티패턴

### 1. 런타임 if로 type check
```cpp
template<typename T>
void f(T x) {
    if (typeid(T) == typeid(int)) { /* */ }   // runtime, RTTI 필요
}
```
`if constexpr (std::is_same_v<T, int>)`로 컴파일 타임에 처리합니다.

### 2. trait를 잘못 작성
```cpp
template<typename T>
struct has_foo {
    static constexpr bool value = /* */ ;
};
```
조건 누락이나 false negative가 생길 수 있으므로, `static_assert`로 단위 테스트를 작성해 검증합니다.

### 3. void_t 패턴 오용
검출한 식이 반환 타입·const 자격·참조 수식까지 원하는 계약을 나타내는지 확인합니다. 올바른 표준 코드가 컴파일러마다 임의로 다르게 동작하는 것으로 설명하지 않습니다.

### 4. type_traits 미include
```cpp
template<typename T>
void f() { static_assert(std::is_integral_v<T>); }
// ERROR — <type_traits> 안 include
```

### 5. if constexpr 외 분기에 invalid code
```cpp
template<typename T>
void f(T x) {
    if constexpr (std::is_integral_v<T>) {
        // OK
    } else {
        x.bar();   // T가 integral이면 이 종속 식의 분기는 인스턴스화하지 않음
    }
}
```
`if constexpr`의 false branch는 인스턴스화되지 않으므로 의미상 잘못된 코드도 통과할 수 있지만, syntax 자체는 valid해야 합니다.

### 6. 사용하지 않는 trait 헤더 include
`<type_traits>`는 작지만 컴파일 시간을 추가합니다. 쓰지 않으면 제거합니다.

## is_pod 대신 필요한 계약 검사

`std::is_pod`는 C++20에서 deprecated입니다. raw byte 복사의 전제에는 `is_trivially_copyable`, 레이아웃 관련 조건에는 `is_standard_layout`을 따로 검사합니다. 어느 trait도 padding·endianness·수신 바이트의 유효한 값 여부를 해결하지 않습니다.

## 작은 예제 — 검출과 정수 직렬화 경계

```cpp title="traits-check.cpp"
#include <array>
#include <cassert>
#include <cstdint>
#include <type_traits>
#include <utility>
template<class T, class=void> struct has_ready : std::false_type {};
template<class T> struct has_ready<T, std::void_t<decltype(std::declval<const T&>().ready())>>
    : std::is_same<decltype(std::declval<const T&>().ready()), bool> {};
struct Good { bool ready() const { return true; } };
struct Wrong { int ready() const { return 1; } };
static_assert(has_ready<Good>::value && !has_ready<Wrong>::value);
static_assert(std::is_scalar_v<decltype(nullptr)>);
static_assert(std::is_scalar_v<int Good::*>);
template<class T> auto big_endian(T value) {
    static_assert(std::is_integral_v<T> && !std::is_same_v<T,bool>, "integer except bool");
    using U=std::make_unsigned_t<T>;
    U bits=static_cast<U>(value);
    std::array<std::uint8_t,sizeof(T)> out{};
    for (unsigned i=0; i<sizeof(T); ++i)
        out[sizeof(T)-1-i]=static_cast<std::uint8_t>(bits>>(i*8));
    return out;
}
int main() {
    auto a=big_endian(std::uint16_t{0x1234});
    assert(a[0]==0x12 && a[1]==0x34);
    auto b=big_endian(std::int16_t{-2});
    assert(b[0]==0xff && b[1]==0xfe);
#ifdef BAD_BOOL
    big_endian(true);
#endif
}
```

Clang 23.1.3 arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors traits-check.cpp -o traits-check && ./traits-check`로 확인했습니다. `-DBAD_BOOL`은 컴파일 실패합니다. unsigned 변환 후 shift하여 음수 signed shift에 의존하지 않으며, 8비트 바이트와 고정 폭 정수 타입을 제공하는 환경을 대상으로 합니다.

[C++20 N4861 type traits](https://timsong-cpp.github.io/cppwp/n4861/meta.unary.cat)와 [타입 치환 규칙](https://timsong-cpp.github.io/cppwp/n4861/temp.deduct)을 참고합니다. virtual/SFINAE/if constexpr의 보편적인 크기 순위는 이 예제로 측정하지 않았습니다.

## 정리

- Type Traits는 컴파일 타임 type query이며 `<type_traits>` 표준 헤더가 제공합니다.
- 주요 trait는 `is_integral`, `is_pointer`, `is_trivially_copyable`, `is_same`, `decay` 등이 있습니다.
- SFINAE와 `enable_if`로 조건부 오버로드를 만들며, C++17의 `if constexpr`은 본문 분기를 선택하며 후보 제외와는 구분합니다.
- 임베디드에서는 type-safe register access, serialization, custom domain traits에 활용합니다.
- C++20 concepts가 훨씬 깔끔한 syntax이므로 가능하면 concept을 권장합니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — modern 대안
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — type info 없이

## 다음 글

[Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — template 제약을 시그니처에 명시합니다. SFINAE보다 훨씬 읽기 좋은 컴파일 타임 type 검증을 다룹니다.
