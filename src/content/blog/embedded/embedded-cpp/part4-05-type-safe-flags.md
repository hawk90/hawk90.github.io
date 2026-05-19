---
title: "Part 4-05: Type-safe Flags"
date: 2026-05-07T05:00:00
description: "enum class + bit operators — type-safe 비트 플래그. 의도하지 않은 변환 차단."
series: "Embedded C++ for Real Systems"
seriesOrder: 33
tags: [cpp, embedded, enum-class, bit-flags, type-safe]
type: tech
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
constexpr bool has_flag(Flag a, Flag b) noexcept {
    return (static_cast<uint32_t>(a) & static_cast<uint32_t>(b))
        == static_cast<uint32_t>(b);
}
```

연산자는 namespace 안이나 enum과 같은 scope에 두어 ADL로 찾도록 합니다.

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

`#define MODE_OUTPUT` 매크로보다 type-safe하며 디버거에서 enum 이름을 그대로 확인할 수 있습니다.

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

ISR에서 상태 검사가 명확해집니다.

## To-string for logging

flag 값을 문자열로 출력할 때도 활용합니다.

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

C++20 이후 reflection이 추가되면 자동 to_string이 가능해집니다. 현재는 수동으로 작성합니다.

## Strongly-typed Flags<E>

C++의 `std::bitset`처럼 wrapper class로 감싸는 방식입니다.

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

한 번의 operator 정의로 모두 처리할 수 있지만 enum을 직접 쓰는 것보다 약간 무겁습니다.

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
`enum class` + operator는 zero-cost이며 컴파일러가 모두 인라인합니다.

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

생성된 코드가 완전히 동일하며 zero-cost입니다.

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

[Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — 상태와 전이를 type-safe하게. enum + switch부터 std::variant까지.
