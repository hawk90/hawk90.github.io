---
title: "Part 2-05: consteval과 constinit"
date: 2026-05-07T05:00:00
description: "C++20의 컴파일 타임 강제 — consteval은 함수 호출을, constinit은 변수 초기화를 컴파일 타임에 강제합니다."
series: "Embedded C++ for Real Systems"
seriesOrder: 13
tags: [cpp, embedded, cpp20, consteval, constinit, compile-time]
type: tech
---

## 한 줄 요약

> **"`constexpr`은 가능, `consteval`은 강제."** — 런타임 호출을 언어가 차단합니다.

## 어떤 문제를 푸는가

`constexpr`은 상황에 따라 런타임에도 호출됩니다. 컴파일 타임 보장이 필요한 경우 의도가 모호해집니다.

```cpp
constexpr int square(int x) { return x * x; }

constexpr int a = square(5);        // 컴파일 타임
int b = square(read_input());        // 런타임 — 의도 아님
```

`b`도 컴파일이 되어 버립니다. 컴파일 타임만 허용하고 싶었지만 막을 수 없습니다.

C++20의 **`consteval`**과 **`constinit`**이 이 빈틈을 메웁니다.

- `consteval`은 함수가 컴파일 타임에만 호출되도록 강제합니다. 런타임 호출은 컴파일 에러입니다.
- `constinit`은 변수 초기화가 컴파일 타임에 완료되도록 강제합니다. 런타임 초기화는 컴파일 에러입니다.

## `consteval` — Immediate Function

`consteval`로 선언된 함수는 immediate function입니다. 모든 호출이 컴파일 타임에 일어나며, 런타임 인자는 컴파일 에러로 잡힙니다.

```cpp
consteval int square(int x) {
    return x * x;
}

constexpr int a = square(5);     // OK — 25, 컴파일 타임

int input = read_input();
int b = square(input);            // ERROR — input은 런타임 값
```

### 임베디드 — 매직 넘버 차단

`consteval`로 컴파일 타임에 검증된 값만 받게 만듭니다.

```cpp
struct PinId {
    int port;
    int pin;
};

consteval PinId make_pin(int port, int pin) {
    if (port < 0 || port > 7) throw "invalid port";   // 컴파일 에러로 변환
    if (pin < 0 || pin > 15) throw "invalid pin";
    return {port, pin};
}

constexpr PinId kLed = make_pin(0, 5);   // OK
constexpr PinId kBad = make_pin(9, 5);   // ERROR at compile time
```

여기서 `throw`는 런타임 예외를 던지는 게 아니라 컴파일 에러로 변환됩니다. invalid configuration을 컴파일 시점에 차단합니다.

### 매크로 vs consteval

매크로의 전통적 역할을 `consteval`로 대체합니다. 타입 안전성과 디버깅 가능성을 함께 얻습니다.

```cpp
// 매크로 — 타입 없음, 디버깅 안 됨
#define PIN_MASK(p) (1u << (p))

// consteval — 타입 안전
consteval uint32_t pin_mask(int pin) {
    if (pin < 0 || pin > 31) throw "invalid pin";
    return 1u << pin;
}

constexpr uint32_t led_mask = pin_mask(5);   // OK
constexpr uint32_t bad      = pin_mask(35);  // 컴파일 에러
```

## `consteval` vs `constexpr` 비교

| | `constexpr` | `consteval` |
| --- | --- | --- |
| 컴파일 타임 호출 | OK | OK |
| 런타임 호출 | OK | **ERROR** |
| 런타임 인자 | OK (런타임 호출됨) | ERROR |
| const 함수 포인터로 변환 | OK | ERROR |
| C++ 표준 | C++11 (확장) | C++20 |

### 함수 포인터

`consteval` 함수는 함수 포인터로 변환할 수 없으므로 런타임 dispatch가 불가능합니다.

```cpp
consteval int f(int);
constexpr int g(int);

auto p1 = &g;   // OK — constexpr은 런타임 호출 가능
auto p2 = &f;   // ERROR — consteval은 함수 포인터 안 됨
```

매크로 대용으로는 적합하지만, 전략 객체로 쓰기에는 부적합합니다.

## `constinit` — Static Initialization 강제

`constinit`은 변수가 컴파일 타임에 초기화되도록 강제합니다. 런타임 초기화 시도는 컴파일 에러입니다.

```cpp
constinit int counter = 0;                    // OK
constinit int pi_thousand = 3141;             // OK
constinit int from_register = read_io();      // ERROR — runtime

constinit auto* g_logger = make_logger();     // OK if make_logger is constexpr
```

[Part 1-06: Static Initialization Order Fiasco](/blog/embedded/embedded-cpp/part1-06-startup-code)를 언어 차원에서 방지합니다. 모든 static 변수가 `main` 진입 전에 초기화되도록 보장합니다.

### `const` vs `constinit` vs `constexpr`

```cpp
const int     a = 10;          // 컴파일 또는 런타임에 초기화 가능
constinit int b = 10;          // 컴파일 타임에 초기화 강제, 이후 변경 가능
constexpr int c = 10;          // 컴파일 타임에 초기화 강제, 이후 변경 불가
```

- `const`는 상수 동작만 보장하며 초기화 시점은 불명입니다.
- `constinit`은 컴파일 타임 초기화를 강제하지만 값은 mutable입니다.
- `constexpr`은 컴파일 타임 초기화와 이후 immutable을 모두 보장합니다.

### 임베디드 — 위험한 static 초기화 방지

```cpp
// 안전 — constexpr static
constexpr Logger g_logger = make_logger(LogLevel::Info);   // OK if Logger constexpr

// 위험 — 런타임 dynamic init
Logger g_logger2 = make_logger(read_config());   // runtime, fiasco 위험

// 안전 — constinit으로 강제 차단
constinit Logger g_logger3 = make_logger(LogLevel::Info);   // 컴파일 타임만 허용
```

`constinit`이 컴파일 에러로 변환해 예상치 못한 런타임 초기화를 막아 줍니다.

## `constexpr` 멤버 함수 + `consteval` 추가

`constexpr` 클래스 안에서 일부 멤버만 `consteval`로 만들 수 있습니다.

```cpp
class Color {
public:
    constexpr Color(uint8_t r, uint8_t g, uint8_t b)
        : r_(r), g_(g), b_(b) {}

    consteval Color(uint32_t hex)
        : r_((hex >> 16) & 0xFF), g_((hex >> 8) & 0xFF), b_(hex & 0xFF)
    {
        if (hex > 0xFFFFFF) throw "invalid color";
    }

    constexpr uint32_t to_hex() const {
        return (r_ << 16) | (g_ << 8) | b_;
    }

private:
    uint8_t r_, g_, b_;
};

constexpr Color a(255, 0, 0);     // OK — RGB
constexpr Color b(0xFF0000);      // OK — hex constructor (consteval)
constexpr Color c(0x1FFFFFF);     // ERROR — invalid hex (consteval 검증)
```

안전한 인자만 허용하는 constructor를 `consteval`로 만들 수 있습니다.

## `if consteval` (C++23)

함수 안에서 현재 호출이 컴파일 타임인지 런타임인지를 보고 분기합니다.

```cpp
constexpr int compute(int x) {
    if consteval {
        // 컴파일 타임 호출 — 더 정확한 알고리즘
        return slow_but_precise(x);
    } else {
        // 런타임 호출 — 빠른 근사
        return fast_approximate(x);
    }
}

constexpr int a = compute(10);   // slow_but_precise
int b = compute(read_input());    // fast_approximate
```

C++20에서는 `std::is_constant_evaluated()`로 같은 효과를 냈으며, C++23의 `if consteval`이 더 깔끔합니다.

## 임베디드 — Compile-Time Configuration Validation

설정 헤더가 유효한지를 컴파일 시점에 전부 검증합니다.

```cpp
// config.h
namespace config {
    constexpr int max_tasks = 16;
    constexpr int stack_size_per_task = 2048;
    constexpr int system_clock_hz = 168'000'000;
    constexpr int uart_baud = 115200;
}

// validation.h
namespace config {

consteval bool validate_config() {
    static_assert(max_tasks > 0 && max_tasks <= 64,
                  "max_tasks must be in [1, 64]");
    static_assert(stack_size_per_task >= 256,
                  "stack too small");
    static_assert(system_clock_hz >= 1'000'000,
                  "system clock too slow");
    static_assert(uart_baud == 9600 || uart_baud == 115200 || uart_baud == 921600,
                  "non-standard baud rate");

    constexpr int total_stack = max_tasks * stack_size_per_task;
    constexpr int available_ram = 128 * 1024;
    static_assert(total_stack < available_ram, "stack exceeds RAM");

    return true;
}

constinit bool config_validated = validate_config();

}   // namespace config
```

`validate_config()`가 모든 검증을 컴파일 타임에 수행합니다. invalid configuration은 빌드 실패로 이어지고, 런타임 검증 코드는 남지 않습니다.

## `consteval` lambda

C++20부터 lambda에도 `consteval`을 붙일 수 있습니다.

```cpp
constexpr auto times_two = [](int x) consteval { return x * 2; };

constexpr int a = times_two(5);    // 10
int b = times_two(read_input());    // ERROR
```

매크로의 대체로 점점 자연스러워지고 있습니다.

## 자주 보는 함정과 안티패턴

### 1. consteval 함수를 다른 constexpr 안에서 호출
```cpp
consteval int f(int x) { return x * 2; }
constexpr int g(int x) { return f(x); }   // OK in C++23, ERROR in C++20

constexpr int a = g(5);      // OK — 컴파일 타임 chain
int b = g(read_input());     // ERROR — g가 f를 런타임으로 호출 못 함
```
C++20과 C++23의 동작이 다릅니다. C++23이 더 관대합니다.

### 2. constinit은 mutable
```cpp
constinit int counter = 0;
counter++;   // OK — constinit은 mutable
```
const 효과는 없고 초기화 시점만 보장합니다. const까지 원하면 `constinit const`로 씁니다.

### 3. consteval 안에서 dynamic alloc
C++20에서는 불가능하며, C++26 정도까지 기다려야 합니다.

### 4. macro와 consteval 혼동
`consteval`은 함수입니다. 블록 형태, multi-statement, 변수 정의가 모두 가능하며 매크로처럼 텍스트 치환되지 않습니다. 디버거로 step into도 됩니다.

### 5. toolchain 미지원
ARM Compiler 6, IAR 일부는 C++20 `consteval`을 지원하지 않습니다. toolchain 확인이 필수입니다.

### 6. constinit 변수의 destructor
`constinit` 변수도 프로그램 종료 시 destructor가 호출됩니다. 임베디드는 `main`이 끝나지 않으므로 거의 무관하지만, exit 패턴이 있다면 주의해야 합니다.

## 측정 — consteval과 constinit의 코드 효과

같은 코드에 `constexpr`, `consteval`, `constinit`을 각각 적용해 봅니다.

```cpp
// 모두 같은 결과 (Flash에 상수 박힘)
// 차이는 — 잘못된 사용을 *컴파일러가 차단*하는지

constexpr int a = 42;          // 0 운영비
consteval int f() { return 42; }
constexpr int b = f();         // 0 운영비 + 강제 컴파일 타임

constinit int c = 42;          // 0 운영비 + 강제 정적 초기화
```

런타임 비용은 동일하게 0이며, 컴파일 시점 검증의 강도만 달라집니다.

## `consteval`의 실용적 가치

1. **매크로 대체** — 타입 안전성과 디버깅 가능성을 함께 얻습니다.
2. **컴파일 타임 검증** — invalid input을 컴파일 시점에 차단합니다.
3. **API 설계** — 컴파일 타임 보장을 함수 시그니처에 명시합니다.

```cpp
// 의도 명확
consteval PinId make_pin(int port, int pin);

// "이 함수는 컴파일 타임 인자만 받습니다" — 시그니처 자체가 문서
```

## 정리

- `consteval`은 함수의 컴파일 타임 호출을 강제하며, 런타임 호출은 컴파일 에러로 막힙니다.
- `constinit`은 변수의 컴파일 타임 초기화를 강제하므로 Static Initialization Order Fiasco를 방지합니다.
- 매크로를 대체하면서 타입 안전성과 검증 가능성을 함께 얻습니다.
- C++20 기능이며 GCC 10+, Clang 12+가 필요하므로 toolchain 지원을 반드시 확인합니다.
- `if consteval`(C++23)로 컴파일과 런타임을 분기할 수 있습니다.

## 관련 항목

- [Part 2-03: constexpr 기초](/blog/embedded/embedded-cpp/part2-03-constexpr-basics) — constexpr 출발
- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 알고리즘
- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — Static Init Fiasco
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++20 채택 결정

## 다음 글

[Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics) — 컴파일 타임 다형성의 핵심 도구입니다. type-safe하고 zero-cost인 generic 코드를 다룹니다.
