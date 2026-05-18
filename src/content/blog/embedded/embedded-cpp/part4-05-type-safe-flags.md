---
title: "Part 4-05: Type-safe Flags"
date: 2026-05-16T05:00:00
description: "enum class + bit operators — type-safe 비트 플래그. 의도하지 않은 변환 차단."
series: "Embedded C++ for Real Systems"
seriesOrder: 33
tags: [cpp, embedded, enum-class, bit-flags, type-safe]
type: tech
---

## 한 줄 요약

> **"`enum class` + `operator|` 정의 = *type-safe bit flag*."** — 정수 변환 차단, 의도 명확.

## 어떤 문제를 푸는가

전통적 C bit flag.

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

*flag와 일반 정수가 같은 type*. *섞이는 실수* 컴파일러 못 잡음.

C++ `enum class` + 연산자 정의로 *type-safe*:

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

*정수와 섞이지 않음*. *명확한 의도*.

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
constexpr bool has_flag(Flag a, Flag b) noexcept {
    return (static_cast<uint32_t>(a) & static_cast<uint32_t>(b))
        == static_cast<uint32_t>(b);
}
```

연산자 *namespace 안* 또는 *enum과 같은 scope*. ADL로 찾기.

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

C++ idiomatic.

## Template으로 자동화

매 enum마다 *operators 정의* 귀찮음. *Macro* 또는 *trait*.

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

새 enum 추가 — *enable_bit_flags<E> 특수화 1줄*. 나머지 *자동*.

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

매크로 사용. C++17 이전에 좋음. C++20+는 *template 선호*.

## 임베디드 — Register Bit Flags

ARM Cortex 등의 register flag를 *type-safe*하게.

```cpp
enum class GpioConfig : uint32_t {
    None        = 0,
    InputPullUp = 0b001,
    InputPullDown = 0b010,
    Output      = 0b011,
    AlternateFn = 0b100,
    AnalogMode  = 0b111,
    HighSpeed   = 1 << 4,
    OpenDrain   = 1 << 5,
};

template<>
struct enable_bit_flags<GpioConfig> : std::true_type {};

void configure_gpio(int pin, GpioConfig cfg) {
    uint32_t reg = GPIOA->MODER;
    reg &= ~(0b111 << (pin * 2));
    reg |= static_cast<uint32_t>(cfg & GpioConfig::AnalogMode) << (pin * 2);
    GPIOA->MODER = reg;

    if (has_flag(cfg, GpioConfig::HighSpeed)) {
        GPIOA->OSPEEDR |= 1 << (pin * 2);
    }
    if (has_flag(cfg, GpioConfig::OpenDrain)) {
        GPIOA->OTYPER |= 1 << pin;
    }
}

configure_gpio(5, GpioConfig::Output | GpioConfig::HighSpeed);
```

*매크로 #define MODE_OUTPUT보다* type-safe. *디버거에서 enum 이름 확인 가능*.

## 임베디드 — Status Register Flags

```cpp
enum class UartStatus : uint32_t {
    None           = 0,
    DataReady      = 1 << 0,
    Overrun        = 1 << 1,
    NoiseDetected  = 1 << 2,
    FramingError   = 1 << 3,
    ParityError    = 1 << 4,
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
    if (has_flag(status, UartStatus::AnyError)) {
        log_error("UART error");
        clear_errors();
    }
}
```

ISR에서 *상태 검사 명확*.

## To-string for logging

flag 값을 *문자열로 출력*.

```cpp
constexpr const char* to_string(GpioConfig cfg) {
    // 단일 값은 단순
    switch (cfg) {
        case GpioConfig::None: return "None";
        case GpioConfig::Output: return "Output";
        // ...
    }
    return "Combined";   // 여러 비트
}

// 또는 combined 처리
void format_flags(GpioConfig cfg, char* buf, size_t n) {
    buf[0] = 0;
    if (has_flag(cfg, GpioConfig::HighSpeed)) strncat(buf, "HighSpeed|", n);
    if (has_flag(cfg, GpioConfig::OpenDrain)) strncat(buf, "OpenDrain|", n);
    // ...
    // 마지막 | 제거
    size_t len = strlen(buf);
    if (len > 0 && buf[len - 1] == '|') buf[len - 1] = 0;
}
```

C++20 *reflection* 추가되면 *자동 to_string* 가능. 현재는 *수동*.

## Strongly-typed Flags<E>

C++의 `std::bitset`처럼 *wrapper class*.

```cpp
template<typename E>
class Flags {
    using U = std::underlying_type_t<E>;
    U value_;

public:
    constexpr Flags() : value_(0) {}
    constexpr Flags(E e) : value_(static_cast<U>(e)) {}
    constexpr Flags(U v) : value_(v) {}

    constexpr Flags operator|(Flags other) const { return value_ | other.value_; }
    constexpr Flags operator&(Flags other) const { return value_ & other.value_; }
    constexpr Flags operator~() const { return ~value_; }

    constexpr bool has(E flag) const {
        return (value_ & static_cast<U>(flag)) == static_cast<U>(flag);
    }

    constexpr U value() const { return value_; }
};

// 사용
Flags<Permission> p;
p = Permission::Read;
p |= Permission::Write;

if (p.has(Permission::Read)) { /* */ }
```

*operator 정의 한 번에 다*. 단 *enum 직접 사용보다 조금 무거움*.

## 자주 보는 함정과 안티패턴

### 1. *enum class 없는 enum*
```cpp
enum Permission { Read = 1, Write = 2 };   // 옛 enum
int x = Read;   // 암묵 변환
```
*항상 enum class*. 옛 enum은 *legacy 호환*만.

### 2. *operator 정의 누락*
```cpp
enum class Flag : uint32_t { A = 1, B = 2 };
auto x = Flag::A | Flag::B;   // ERROR — operator| 없음
```
*매크로 또는 template으로 자동화*.

### 3. *underlying type 명시 안 함*
```cpp
enum class Flag { A = 1 << 30 };   // int 가정 — 32-bit 한계
```
*항상 `: uint32_t`* 등 명시.

### 4. *bit position 실수*
```cpp
enum class Flag { A = 1, B = 2, C = 3 };   // C는 A|B와 같음 — flag 아님
```
*명확한 비트 위치*: `A = 1 << 0, B = 1 << 1, C = 1 << 2`.

### 5. *enum value 충돌*
```cpp
enum class A { X = 1 };
enum class B { X = 2 };
A::X | B::X;   // type 다름 — 컴파일 에러 (의도된 안전)
```
*같은 enum의 flag만 조합*.

### 6. *Strongly typed flags의 overhead 가정*
`enum class` + operator는 *zero-cost*. *컴파일러가 모두 인라인*.

## 측정 — type-safe vs raw

```cpp
// V1 — raw int
int flags = (1 << 0) | (1 << 1);

// V2 — enum class with operators
auto flags = MyFlag::A | MyFlag::B;
```

어셈블리:

```text
V1:
    mov  r0, #3       ; 1 | 2 = 3

V2:
    mov  r0, #3       ; 동일
```

*완전 동일*. zero-cost.

## 정리

- C의 `#define FLAG_X (1<<n)` 대신 `enum class`와 bit operator를 함께 씁니다.
- 무관한 정수와 섞이지 않으므로 type safety가 보장됩니다.
- Template이나 매크로로 operator를 자동 정의합니다.
- 임베디드의 register flag와 status flag에 적합합니다.
- 컴파일 결과가 동일하므로 zero-cost입니다.

## 관련 항목

- [Part 2-09: Type Traits](/blog/embedded/embedded-cpp/part2-09-type-traits) — concept 활용
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — type-safe register
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)

## 다음 글

[Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — *상태와 전이를 type-safe하게*. enum + switch부터 std::variant까지.
