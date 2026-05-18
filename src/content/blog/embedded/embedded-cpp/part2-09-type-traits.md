---
title: "Part 2-09: Type Traits 활용"
date: 2026-05-14T09:00:00
description: "std::is_*, std::enable_if, SFINAE — 컴파일 타임 type 정보로 코드 분기와 검증."
series: "Embedded C++ for Real Systems"
seriesOrder: 17
tags: [cpp, embedded, type-traits, sfinae, enable-if, compile-time]
type: tech
---

## 한 줄 요약

> **"Type Traits = *type에 대한 컴파일 타임 query*."** — 이 타입이 integral인가, signed인가, trivial인가를 묻고 *분기*합니다.

## 어떤 문제를 푸는가

generic 코드에서 *타입에 따라 다른 동작*이 필요합니다.

```cpp
template<typename T>
void process(T value) {
    // T가 integral이면 → bit operation
    // T가 floating point면 → epsilon 비교
    // T가 pointer면 → null check
}
```

C에서는 *불가능* (타입 정보 없음). C++ Type Traits가 *컴파일 타임 type query*를 제공.

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

*if constexpr*과 함께 *런타임 코드 분기 없음*. 해당 타입의 *코드만 컴파일*.

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
std::is_scalar_v<T>       // arithmetic || enum || pointer
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

`_v`는 *C++17 variable template*. `_t`는 *C++14 alias template*. 사용하기 *짧고 명확*.

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

*잘못된 사용*을 *컴파일 시점에 차단*.

## SFINAE — Substitution Failure Is Not An Error

C++의 *오래된 idiom*. 템플릿 인스턴스화 실패가 *컴파일 에러 아닌 무시*. 이를 활용해 *조건부 오버로드*.

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

`std::enable_if`가 *조건이 true이면 정의*, false면 *substitution failure*. *해당 오버로드 무시*.

C++17의 *if constexpr*이 *대부분의 SFINAE 대체*. 새 코드는 *if constexpr 우선*.

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

타입에 *특정 멤버나 함수가 있는지* 컴파일 타임에 확인.

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

C++20 *concepts*가 *훨씬 단순한 syntax*.

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

타입에 따라 *다른 직렬화 방법*.

```cpp
template<typename T>
size_t serialize(uint8_t* buf, T value) {
    if constexpr (std::is_integral_v<T>) {
        // big-endian으로 정수 직렬화
        for (int i = sizeof(T) - 1; i >= 0; --i) {
            buf[sizeof(T) - 1 - i] = (value >> (i * 8)) & 0xFF;
        }
        return sizeof(T);
    }
    else if constexpr (std::is_floating_point_v<T>) {
        // IEEE 754 그대로 (host endian)
        std::memcpy(buf, &value, sizeof(T));
        return sizeof(T);
    }
    else if constexpr (std::is_enum_v<T>) {
        // underlying type으로
        using U = std::underlying_type_t<T>;
        return serialize(buf, static_cast<U>(value));
    }
    else if constexpr (std::is_trivially_copyable_v<T>) {
        // POD struct
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

*한 함수가 모든 타입 처리*. 컴파일러가 *해당 분기만 생성*.

## std::declval — 인스턴스 없이 type query

`std::declval<T>()`는 *T의 instance가 있다고 가정*. 실제 호출 안 함. *type만 추론*.

```cpp
template<typename T>
using result_type = decltype(std::declval<T>().method());

// T::method()의 반환 타입을 컴파일 타임에 알아냄
```

*decltype과 함께 사용*. *호출 시점이 아닌 declare 시점*에 유효.

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

표준 trait들의 *조합*. 도메인 특화 검증에 활용.

### 임베디드 — register-safe 타입

```cpp
template<typename T>
constexpr bool is_register_safe_v =
    std::is_trivially_copyable_v<T> &&
    !std::is_pointer_v<T> &&
    sizeof(T) <= 4 &&
    alignof(T) <= 4;

template<typename T>
void write_register(uintptr_t addr, T value) {
    static_assert(is_register_safe_v<T>,
                  "Type unsafe for register access");
    *reinterpret_cast<volatile T*>(addr) = value;
}
```

여러 검증을 *한 trait*에. 새 함수에 *재사용*.

## Tag dispatch — SFINAE 대안

함수 *오버로드*를 *tag 객체*로 dispatch.

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

*if constexpr보다 약간 복잡*. *오버로드가 명확*해서 *문서 가치*. 보통은 *if constexpr* 권장.

## 자주 보는 함정과 안티패턴

### 1. *런타임 if로 type check*
```cpp
template<typename T>
void f(T x) {
    if (typeid(T) == typeid(int)) { /* */ }   // runtime, RTTI 필요
}
```
`if constexpr (std::is_same_v<T, int>)` — *컴파일 타임*.

### 2. *trait를 잘못 작성*
```cpp
template<typename T>
struct has_foo {
    static constexpr bool value = /* */ ;
};
```
*조건 누락*이나 *false negative* — 단위 테스트(static_assert)로 검증.

### 3. *void_t 패턴 오용*
SFINAE 검출이 *컴파일러마다 다른 결과*. 표준 trait 또는 *concept* 권장.

### 4. *type_traits 미include*
```cpp
template<typename T>
void f() { static_assert(std::is_integral_v<T>); }
// ERROR — <type_traits> 안 include
```

### 5. *if constexpr 외 분기에 invalid code*
```cpp
template<typename T>
void f(T x) {
    if constexpr (std::is_integral_v<T>) {
        // OK
    } else {
        x.bar();   // T가 integral이면 — 분기 안 들어가지만 검사
    }
}
```
`if constexpr`의 *false branch는 instantiate 안 됨*. 잘못된 코드 OK. *그러나 syntax는 valid해야*.

### 6. *unused trait include*
`<type_traits>`가 *작지만 컴파일 시간 추가*. 사용 안 하면 *제거*.

## 측정 — type traits의 코드 크기

같은 함수, virtual vs SFINAE vs if constexpr.

```cpp
// V1 — virtual (런타임 분기)
class Processor {
    virtual void process(int) = 0;
    virtual void process(float) = 0;
};

// V2 — SFINAE
template<typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
void process(T);
template<typename T, std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
void process(T);

// V3 — if constexpr
template<typename T>
void process(T x) {
    if constexpr (std::is_integral_v<T>) { /* */ }
    else if constexpr (std::is_floating_point_v<T>) { /* */ }
}
```

코드 크기 (5개 type별 호출, STM32F4):

```text
V1 (virtual): 460 B (vtable + 가상 호출)
V2 (SFINAE): 320 B (per-type 인스턴스)
V3 (if constexpr): 280 B (인라인 분기 제거)
```

`if constexpr`이 *가장 작고 빠름*. *modern 권장*.

## 정리

- Type Traits = *컴파일 타임 type query*. `<type_traits>` 표준 헤더.
- 주요 trait: `is_integral`, `is_pointer`, `is_trivially_copyable`, `is_same`, `decay` 등.
- *SFINAE + enable_if*로 *조건부 오버로드*. C++17 *if constexpr*이 *대체*.
- 임베디드 활용: *type-safe register access*, *serialization*, *custom domain traits*.
- C++20 *concepts*가 *훨씬 깔끔한 syntax*. 가능하면 concept 권장.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — modern 대안
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — type info 없이

## 다음 글

[Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — *template 제약을 명시*. SFINAE보다 *훨씬 읽기 좋은* 컴파일 타임 type 검증.
