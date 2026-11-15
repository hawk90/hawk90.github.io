---
title: "Type-safe Flags 패턴 — Enum Class·Strong Typedef·Tag"
slug: "embedded/embedded-cpp/part4-05-type-safe-flags"
date: 2026-05-01T09:33:00
description: "enum class + bit operators — type-safe 비트 플래그. 의도하지 않은 변환 차단."
series: "Embedded C++ for Real Systems"
seriesOrder: 33
tags: [cpp, embedded, enum-class, bit-flags, type-safe]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"`enum class` 위에 `operator|`만 정의하면 type-safe bit flag가 됩니다."** 정수 변환을 차단하고 의도를 명확히 드러냅니다.

## 어떤 문제를 푸는가

전통적인 C bit flag는 다음과 같이 씁니다.

```c
#define FLAG_READ    (1 << 0)
#define FLAG_WRITE   (1 << 1)
#define FLAG_EXECUTE (1 << 2)
#define FLAG_USER    (1 << 3)

int permissions = FLAG_READ | FLAG_WRITE;

// 문제
int speed = 42;
permissions |= speed;   // 무관한 정수 OR — 의미 없음, 컴파일 통과
```

flag와 일반 정수가 같은 type이므로 섞이는 실수를 컴파일러가 잡지 못합니다.

C++의 `enum class`와 연산자 정의를 함께 쓰면 type-safe가 됩니다.

```cpp
enum class Permission : uint32_t {
    Read    = 1 << 0,
    Write   = 1 << 1,
    Execute = 1 << 2,
    User    = 1 << 3,
};

constexpr Permission operator|(Permission a, Permission b) {
    return static_cast<Permission>(
        static_cast<uint32_t>(a) | static_cast<uint32_t>(b));
}

Permission p = Permission::Read | Permission::Write;   // OK
int speed = 42;
p |= speed;   // ERROR — type mismatch
```

정수와 섞이지 않으며 의도가 명확히 드러납니다.

## 기본 패턴

```cpp
enum class Flag : uint32_t {
    None     = 0,
    Option1  = 1 << 0,
    Option2  = 1 << 1,
    Option3  = 1 << 2,
    All      = Option1 | Option2 | Option3,
};

// 비트 OR
constexpr Flag operator|(Flag a, Flag b) noexcept {
    return static_cast<Flag>(
        static_cast<uint32_t>(a) | static_cast<uint32_t>(b));
}

// 비트 AND
constexpr Flag operator&(Flag a, Flag b) noexcept {
    return static_cast<Flag>(
        static_cast<uint32_t>(a) & static_cast<uint32_t>(b));
}

// 비트 NOT
constexpr Flag operator~(Flag a) noexcept {
    return static_cast<Flag>(~static_cast<uint32_t>(a));
}

// 비트 XOR
constexpr Flag operator^(Flag a, Flag b) noexcept {
    return static_cast<Flag>(
        static_cast<uint32_t>(a) ^ static_cast<uint32_t>(b));
}

// 복합 연산자
constexpr Flag& operator|=(Flag& a, Flag b) noexcept { a = a | b; return a; }
constexpr Flag& operator&=(Flag& a, Flag b) noexcept { a = a & b; return a; }
constexpr Flag& operator^=(Flag& a, Flag b) noexcept { a = a ^ b; return a; }

// bool 변환
template<typename E>
constexpr bool has_flag(E a, E b) noexcept {
    using U = std::underlying_type_t<E>;
    return (static_cast<U>(a) & static_cast<U>(b)) == static_cast<U>(b);
}
template<typename E>
constexpr bool has_any(E a, E mask) noexcept {
    using U = std::underlying_type_t<E>;
    return (static_cast<U>(a) & static_cast<U>(mask)) != 0;
}
```

연산자는 enum과 같은 namespace에 두어 ADL로 찾도록 합니다. has_flag는 mask의 모든 bit가 있는지 검사하며 빈 mask에는 true입니다. 하나라도 있는지 보려면 has_any를 쓰고 빈 mask에는 false입니다. 예시는 <cstdint>와 <type_traits>가 필요합니다.

## 사용 예

```cpp
Flag p = Flag::Option1 | Flag::Option2;

if (has_flag(p, Flag::Option1)) {
    // Option1 있음
}

p |= Flag::Option3;       // 추가
p &= ~Flag::Option1;      // 제거
p ^= Flag::Option2;       // toggle
```

C++ idiomatic한 형태입니다.

## Template으로 자동화

enum마다 operator를 정의하기는 번거롭습니다. 매크로나 trait로 자동화합니다.

### Trait + concept (C++20)

```cpp
template<typename E>
struct enable_bit_flags : std::false_type {};

template<typename E>
constexpr bool enable_bit_flags_v = enable_bit_flags<E>::value;

template<typename E>
concept BitFlags = std::is_enum_v<E> && enable_bit_flags_v<E>;

// 한 번만 정의
template<BitFlags E>
constexpr E operator|(E a, E b) noexcept {
    using U = std::underlying_type_t<E>;
    return static_cast<E>(static_cast<U>(a) | static_cast<U>(b));
}

template<BitFlags E>
constexpr E operator&(E a, E b) noexcept {
    using U = std::underlying_type_t<E>;
    return static_cast<E>(static_cast<U>(a) & static_cast<U>(b));
}

// ... operator~, ^, |=, &=, ^=

// 사용
enum class Permission : uint32_t { Read = 1, Write = 2, Execute = 4 };

template<>
struct enable_bit_flags<Permission> : std::true_type {};

// 이제 자동
Permission p = Permission::Read | Permission::Write;
```

새 enum을 추가할 때 `enable_bit_flags<E>` 특수화 한 줄만 더 쓰면 나머지는 자동입니다.

### Macro 버전 (간단)

```cpp
#define DEFINE_BIT_FLAGS(E)                                                   \
    constexpr E operator|(E a, E b) noexcept {                                \
        using U = std::underlying_type_t<E>;                                  \
        return static_cast<E>(static_cast<U>(a) | static_cast<U>(b));         \
    }                                                                          \
    constexpr E operator&(E a, E b) noexcept {                                \
        using U = std::underlying_type_t<E>;                                  \
        return static_cast<E>(static_cast<U>(a) & static_cast<U>(b));         \
    }                                                                          \
    constexpr E operator~(E a) noexcept {                                     \
        using U = std::underlying_type_t<E>;                                  \
        return static_cast<E>(~static_cast<U>(a));                            \
    }                                                                          \
    constexpr E& operator|=(E& a, E b) noexcept { a = a | b; return a; }      \
    constexpr E& operator&=(E& a, E b) noexcept { a = a & b; return a; }      \
    /* ... */

enum class Permission : uint32_t { Read = 1, Write = 2 };
DEFINE_BIT_FLAGS(Permission)
```

매크로는 C++17 이전 환경에 잘 맞고, C++20 이상에서는 template을 선호합니다.

## 임베디드 — Register Bit Flags

ARM Cortex의 register flag를 type-safe하게 다룰 수 있습니다.

STM32F407 MODER의 pin별 2-bit mode는 서로 독립인 bit flag가 아닙니다. pull-up/down·speed·output type도 서로 다른 register field이므로 하나의 enum OR로 섞지 않습니다. 다음은 실제 MMIO 대신 일반 정수에서 field encoding을 검사하는 순수 함수입니다.

```cpp title="gpio-mode.h"
#pragma once
#include <cstdint>
enum class GpioMode : std::uint32_t { Input = 0, Output = 1, Alternate = 2, Analog = 3 };
constexpr bool update_mode(std::uint32_t before, unsigned pin, GpioMode mode,
                           std::uint32_t& after) {
    if (pin >= 16 || static_cast<std::uint32_t>(mode) > 3) return false;
    const unsigned shift = pin * 2;
    const std::uint32_t mask = 3U << shift;
    after = (before & ~mask) | (static_cast<std::uint32_t>(mode) << shift);
    return true;
}
```

field 폭은 2bit이며 pin 범위를 shift 전에 검사합니다. 실제 GPIO register를 갱신할 때는 clock·경합·volatile 접근과 RMW 안전성까지 MCU 계약에 맞춰야 합니다. 위 함수의 host 성공을 MMIO 실행 성공으로 해석하지 않습니다.

## 임베디드 — Status Register Flags

```cpp
enum class UartStatus : uint32_t {
    None           = 0,
    DataReady      = 1U << 5,   // STM32F407 USART_SR RXNE
    Overrun        = 1U << 3,   // ORE
    NoiseDetected  = 1U << 2,   // NE
    FramingError   = 1U << 1,   // FE
    ParityError    = 1U << 0,   // PE
    AnyError       = Overrun | NoiseDetected | FramingError | ParityError,
};

template<>
struct enable_bit_flags<UartStatus> : std::true_type {};

UartStatus read_status() {
    return static_cast<UartStatus>(USART2->SR);
}

void uart_isr() {
    auto status = read_status();

    if (has_flag(status, UartStatus::DataReady)) {
        read_data();
    }
    if (has_any(status, UartStatus::AnyError)) {
        log_error("UART error");
        clear_errors();
    }
}
```

ISR에서 상태 검사가 명확해집니다.

## To-string과 bounded 출력

조합 flag는 단일 enum 이름과 다릅니다. 각 bit를 검사해 출력하되 destination capacity 전체를 strncat의 잔여 길이처럼 넘기면 overflow가 날 수 있습니다. 아래 snprintf는 출력할 값과 buffer 길이를 함께 받으며 n=0도 처리합니다.

```cpp
#include <cstdio>
void format_status(UartStatus status, char* buffer, std::size_t n) {
    if (n == 0) return;
    const int needed = std::snprintf(buffer, n, "rx=%d error=%d",
        has_any(status, UartStatus::DataReady), has_any(status, UartStatus::AnyError));
    if (needed < 0 || static_cast<std::size_t>(needed) >= n) {
        // encoding 실패 또는 truncation: application 정책으로 처리
    }
}
```

이 조각은 n>0이면 buffer가 n바이트의 유효한 저장 공간을 가리킨다는 전제입니다. 자동 reflection 지원을 가정하지 않고 실제 toolchain에서 제공되는 변환 기능 또는 명시적 변환표를 사용합니다.

## Strongly-typed Flags<E>

C++의 `std::bitset`처럼 wrapper class로 감싸는 방식입니다.

```cpp title="flags.h"
#pragma once
#include <type_traits>
template<typename E>
class Flags {
    static_assert(std::is_enum_v<E>);
    using U = std::underlying_type_t<E>;
    U value_ = 0;
    explicit constexpr Flags(U bits) : value_(bits) {}
public:
    constexpr Flags() = default;
    constexpr Flags(E e) : value_(static_cast<U>(e)) {}
    constexpr Flags operator|(Flags other) const { return Flags(static_cast<U>(value_ | other.value_)); }
    constexpr Flags operator&(Flags other) const { return Flags(static_cast<U>(value_ & other.value_)); }
    constexpr Flags operator~() const { return Flags(static_cast<U>(~value_)); }
    constexpr Flags& operator|=(Flags other) { return *this = *this | other; }
    constexpr Flags& operator&=(Flags other) { return *this = *this & other; }
    constexpr bool has_all(E mask) const { const U m = static_cast<U>(mask); return (value_ & m) == m; }
    constexpr bool has_any(E mask) const { return (value_ & static_cast<U>(mask)) != 0; }
    constexpr U value() const { return value_; }
};
```

~는 underlying type의 유효하지 않은 enum bit도 켤 수 있습니다. 정해진 domain mask로 제한하거나 기존 flags에서 제거할 bit에만 AND하는 정책을 정합니다. wrapper가 raw enum보다 항상 느리거나 항상 같다고 단정하지 않고 생성 코드를 확인합니다.


Flags는 하나의 underlying 정수 값을 저장합니다. raw 정수 constructor를 private로 두어 무관한 정수의 암묵 변환을 막고 compound operator를 실제로 제공합니다.

## 자주 보는 함정과 안티패턴

### 1. `enum class` 없는 enum
```cpp
enum Permission { Read = 1, Write = 2 };   // 옛 enum
int x = Read;   // 암묵 변환
```

항상 `enum class`를 사용하고, 옛 enum은 legacy 호환 용도로만 둡니다.

### 2. operator 정의 누락
```cpp
enum class Flag : uint32_t { A = 1, B = 2 };
auto x = Flag::A | Flag::B;   // ERROR — operator| 없음
```

매크로나 template으로 자동화합니다.

### 3. underlying type 명시 안 함
```cpp
enum class Flag { A = 1 << 30 };   // int 가정 — 32-bit 한계
```

항상 `: uint32_t` 같은 underlying type을 명시합니다.

### 4. bit position 실수
```cpp
enum class Flag { A = 1, B = 2, C = 3 };   // C는 A|B와 같음 — flag 아님
```

`A = 1 << 0, B = 1 << 1, C = 1 << 2`처럼 비트 위치를 명확히 합니다.

### 5. enum value 충돌
```cpp
enum class A { X = 1 };
enum class B { X = 2 };
A::X | B::X;   // type 다름 — 컴파일 에러 (의도된 안전)
```

같은 enum의 flag끼리만 조합합니다.

### 6. Strongly typed flags의 overhead 가정
간단한 조합은 최적화할 수 있지만 인라인과 동일한 instruction 수가 언어 보장은 아닙니다. 실제 target·옵션에서 비교합니다.

## Strong typedef와 tag를 구분하기

flag의 enum domain을 나누는 것과 같은 underlying 값에 서로 다른 용도를 부여하는 것은 다른 문제입니다. tag parameter로 만든 strong typedef는 pin 번호와 channel 번호 같은 수치를 섞지 못하게 합니다.

```cpp title="flags-check.cpp"
#include "flags.h"
#include "gpio-mode.h"
#include <cassert>
#include <cstdint>
#include <iostream>
enum class Permission : std::uint32_t { None = 0, Read = 1, Write = 2, Both = 3 };
enum class Other : std::uint32_t { Read = 1 };
template<typename Tag> struct ResourceId { explicit ResourceId(unsigned v) : value(v) {} unsigned value; };
struct PinTag; struct ChannelTag;
using Pin = ResourceId<PinTag>; using Channel = ResourceId<ChannelTag>;
int main() {
    Flags<Permission> p;
    p |= Permission::Read;
    assert(p.has_any(Permission::Both) && !p.has_all(Permission::Both));
    p |= Permission::Write; assert(p.has_all(Permission::Both));
    p &= ~Flags<Permission>(Permission::Read);
    assert(!p.has_any(Permission::Read) && p.has_all(Permission::Write));
    assert(p.has_all(Permission::None) && !p.has_any(Permission::None));
    std::uint32_t result = 0;
    assert(update_mode(0xFFFFFFFFU, 5, GpioMode::Output, result));
    assert(result == ((0xFFFFFFFFU & ~(3U << 10)) | (1U << 10)));
    assert(!update_mode(result, 16, GpioMode::Output, result));
    assert(!update_mode(result, 0, static_cast<GpioMode>(4), result));
    Pin pin(5); Channel channel(2); (void)pin; (void)channel;
#ifdef BAD_ENUM_MIX
    p |= Other::Read;
#endif
#ifdef BAD_TAG_MIX
    pin = channel;
#endif
    std::cout << "flags compound/any/all/field/tag checks passed\n";
}
```

Clang 23.1.3 C++17 host에서 ASan·UBSan으로 실행했습니다. compound operator·any/all·빈 mask·유효/무효 pin·이웃 field 보존을 확인하고, 다른 enum과 tag를 섞는 경우 각각 컴파일 실패를 확인했습니다. board MMIO와 raw 코드 대비 성능은 실행하지 않았습니다.

## 1차 자료

- [C++ draft: enum declarations](https://eel.is/c++draft/dcl.enum), [overloaded operators](https://eel.is/c++draft/over.oper) — domain과 연산자 계약
- [ST RM0090](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf) — GPIO MODER 2bit field와 USART_SR bit 배치

## 정리

- C의 `#define FLAG_X (1<<n)` 대신 `enum class`와 bit operator를 함께 씁니다.
- 무관한 정수와 섞이지 않으므로 type safety가 보장됩니다.
- Template이나 매크로로 operator를 자동 정의합니다.
- 임베디드의 register flag와 status flag에 적합합니다.
- 단순 조합의 최적화 결과는 실제 target과 옵션으로 확인합니다.

## 관련 항목

- [Part 2-09: Type Traits](/blog/embedded/embedded-cpp/part2-09-type-traits) — concept 활용
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — type-safe register
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)

## 다음 글

[Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — 상태와 전이를 type-safe하게. enum + switch부터 std::variant까지.
