---
title: "consteval과 constinit 분석 — C++20 컴파일 타임 강제 메커니즘"
slug: "embedded/embedded-cpp/part2-05-consteval-constinit"
date: 2026-04-29T09:13:00
description: "C++20의 컴파일 타임 강제 — consteval은 함수 호출을, constinit은 변수 초기화를 컴파일 타임에 강제합니다."
series: "Embedded C++ for Real Systems"
seriesOrder: 13
tags: [cpp, embedded, cpp20, consteval, constinit, compile-time]
type: tech
topics: ["embedded"]
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
- `constinit`은 지정한 static/thread 저장 기간 변수의 동적 초기화를 금지합니다. 초기값을 RAM에 복사하는 시작 코드나 이후 읽기·수정 비용까지 제거하지는 않습니다. `constinit int counter = 0;`과 `constinit int pi_thousand = 3141;`을 arm-none-eabi-g++ 16.2.0으로 컴파일하면 `counter`는 `.bss`, `pi_thousand`는 `.data`에 놓였고 `.init_array`는 없었습니다. `.data`에 놓인 값은 [Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code)의 Reset_Handler가 Flash에서 RAM으로 복사합니다.

## `consteval` — Immediate Function

`consteval`로 선언된 함수는 immediate function입니다. 일반 호출 위치의 immediate invocation은 상수식이어야 합니다. 다른 immediate function 내부나 `if consteval` 분기 같은 immediate context는 규칙이 다르므로 단순히 모든 함수 선언의 인자가 리터럴이어야 한다는 뜻은 아닙니다.

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

void invalid_port();   // constexpr가 아닌 오류 함수
void invalid_pin();

consteval PinId make_pin(int port, int pin) {
    if (port < 0 || port > 7) invalid_port();   // 상수 평가에서 닿으면 컴파일 에러
    if (pin < 0 || pin > 15) invalid_pin();
    return {port, pin};
}

constexpr PinId kLed = make_pin(0, 5);   // OK
constexpr PinId kBad = make_pin(9, 5);   // ERROR at compile time
```

상수 평가가 constexpr가 아닌 함수 호출에 닿으면 상수식이 아니므로 컴파일 오류가 됩니다. 오류 경로에 `throw`를 쓰는 예제가 많지만, 이 시리즈의 기본 플래그인 `-fno-exceptions`에서는 실행하지 않는 `throw` 문장도 컴파일 오류입니다. arm-none-eabi-g++ 16.2.0은 `error: exception handling disabled, use '-fexceptions' to enable`, Clang 23.1.5는 `error: cannot use 'throw' with exceptions disabled`로 멈췄습니다([Part 2-04](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced#컴파일-타임-register-비트-마스크-생성)). 그래서 이 글의 예제는 모두 비constexpr 오류 함수를 부릅니다. consteval 함수는 런타임에 불리지 않으므로 이 오류 함수는 선언만 있고 정의가 없어도 링크됩니다.

### 매크로 vs consteval

매크로의 전통적 역할을 `consteval`로 대체합니다. 타입 안전성과 디버깅 가능성을 함께 얻습니다.

```cpp
// 매크로 — 타입 없음, 디버깅 안 됨
#define PIN_MASK(p) (1u << (p))

// consteval — 타입 안전
consteval uint32_t pin_mask(int pin) {
    if (pin < 0 || pin > 31) invalid_pin();
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

immediate context 안에서 주소를 일시적으로 사용할 수는 있지만, immediate function의 포인터를 상수식 결과로 밖에 보존해 런타임 dispatch에 쓸 수는 없습니다. 아래 `p2` 줄에 Clang 23.1.5는 `error: cannot take address of consteval function 'f' outside of an immediate invocation`, g++-16은 `error: taking address of an immediate function 'consteval int f(int)'`을 냈습니다.

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

constinit auto* g_logger = make_logger();     // 결과 포인터도 상수 초기화 요건을 만족해야 함
```

[Part 1-06: Static Initialization Order Fiasco](/blog/embedded/embedded-cpp/part1-06-startup-code)를 언어 차원에서 방지합니다. 이 키워드를 붙인 변수의 동적 초기화만 차단합니다. 다른 전역 객체의 초기화와 종료 순서, 하드웨어 준비 시점의 접근까지 해결하지는 않습니다.

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
void invalid_color();   // constexpr가 아닌 오류 함수

class Color {
public:
    constexpr Color(uint8_t r, uint8_t g, uint8_t b)
        : r_(r), g_(g), b_(b) {}

    consteval Color(uint32_t hex)
        : r_((hex >> 16) & 0xFF), g_((hex >> 8) & 0xFF), b_(hex & 0xFF)
    {
        if (hex > 0xFFFFFF) invalid_color();
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

C++20의 `std::is_constant_evaluated()`도 평가 문맥을 구분하지만 `if consteval`의 true 분기는 immediate context이므로 immediate function 호출 규칙까지 완전히 같지는 않습니다.

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

`validate_config()`가 모든 검증을 컴파일 타임에 수행합니다. invalid configuration은 빌드 실패로 이어지고, 런타임 검증 코드는 남지 않습니다. 남는 것은 결과를 담은 변수 하나입니다. `max_tasks`·`stack_size_per_task` 검사만 남긴 축소판을 arm-none-eabi-g++ 16.2.0 `-std=c++20 -Os`로 컴파일하면 `config::config_validated`가 `.data`에 1바이트로 놓였습니다. 이 변수가 필요 없으면 `static_assert(config::validate_config());` 한 줄로 바꿔 저장 공간도 없앨 수 있습니다.

## `consteval` lambda

C++20부터 lambda에도 `consteval`을 붙일 수 있습니다.

```cpp
constexpr auto times_two = [](int x) consteval { return x * 2; };

constexpr int a = times_two(5);    // 10
int b = times_two(read_input());    // ERROR
```

람다도 일반 consteval 함수와 같은 규칙을 따르므로, 지역 범위에서 쓰는 컴파일 타임 전용 헬퍼를 매크로 대신 만들 수 있습니다.

## 자주 보는 함정과 안티패턴

### 1. constexpr 매개변수로 immediate function 호출

`constexpr int h(int x) { return f(x); }`처럼 일반 비템플릿 함수의 매개변수를 consteval 함수 `f`에 바로 넘기면 C++23에서도 오류입니다. Clang 23.1.5는 `-std=c++20`·`-std=c++23` 모두 `error: call to consteval function 'f' is not a constant expression`, g++-16도 두 모드 모두 `error: call to consteval function 'f(x)' is not a constant expression`이었습니다. 반면 같은 본문의 함수 템플릿 `template <class T> constexpr T ht(T x) { return f(x); }`는 두 컴파일러, 두 모드 모두 통과했습니다. P2564R3("consteval needs to propagate up")이 템플릿 특수화·람다 같은 immediate-escalating 함수를 스스로 immediate function이 되게 했기 때문입니다. 비템플릿 함수에서 이 호출이 필요하면 C++23의 `if consteval` 안에서 부릅니다.

### 2. constinit은 mutable
```cpp
constinit int counter = 0;
counter++;   // OK — constinit은 mutable
```
const 효과는 없고 초기화 시점만 보장합니다. const까지 원하면 `constinit const`로 씁니다.

### 3. consteval 안에서 dynamic alloc
C++20부터 같은 상수 평가 안에서 해제하는 transient allocation은 가능합니다. `new`로 얻은 저장 공간을 영구 보존하는 포인터 상수와 구분합니다. 아래 예제가 할당·해제 경로를 실제 컴파일합니다.

### 4. macro와 consteval 혼동
`consteval`은 함수입니다. 블록 형태, multi-statement, 변수 정의가 모두 가능하며 매크로처럼 텍스트 치환되지 않습니다. 런타임 호출이 없으므로 일반적인 런타임 디버거의 step into 대상으로 가정할 수 없습니다.

### 5. toolchain 미지원
벤더 이름만으로 지원 여부를 단정하지 않습니다. 설치한 버전의 C++ 모드와 `__cpp_consteval`, `__cpp_constinit`을 확인하고 최소 예제를 컴파일합니다.

### 6. constinit 변수의 destructor
`constinit`은 초기화만 제약하고 소멸은 제약하지 않습니다. 소멸자가 있는 타입이면 `main` 반환이나 `exit` 때 소멸자가 돌고, 그 등록(`__aeabi_atexit` 등, [Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#-fno-use-cxa-atexit--등록-방식-변경))도 남습니다. `main`이 끝나지 않는 firmware에서는 소멸자가 돌지 않지만 등록 코드와 소멸자 본문은 이미지에 남습니다.

## 작은 예제 — 정상 설정, 잘못된 핀, 런타임 초기화

C++23으로 평가 문맥을 분리합니다. 핀 오류 경로는 비constexpr 함수에 도달해 상수식이 되지 않으므로 `-fno-exceptions`에서도 잘못된 설정을 거부합니다.

```cpp title="immediate-check.cpp"
#include <cstdint>
void invalid_pin();
consteval std::uint32_t pin_mask(int pin) {
    if (pin < 0 || pin >= 32) invalid_pin();
    return std::uint32_t{1} << pin;
}
consteval int allocate() {
    int* p = new int(42); int value = *p; delete p; return value;
}
constexpr int twice(int x) {
    if consteval { return allocate() + x; }
    else { return x * 2; }
}
constinit int counter = 0;
#ifdef BAD_PIN
constexpr auto mask = pin_mask(32);
#else
constexpr auto mask = pin_mask(5);
#endif
#ifdef BAD_INIT
int read_io();
constinit int bad = read_io();
#endif
static_assert(allocate() == 42);
static_assert(twice(2) == 44);
static_assert(mask == 32);
int main(int argc, char**) { ++counter; return twice(argc) == 2 && counter == 1 ? 0 : 1; }
```

Homebrew Clang 23.1.5와 g++-16, arm64 macOS에서 `clang++ -std=c++23 -Wall -Wextra -pedantic-errors -fno-exceptions immediate-check.cpp -o immediate-check && ./immediate-check`가 경고 없이 exit 0이었습니다. 거부 경로의 진단입니다.

```text
# -DBAD_PIN, Clang 23.1.5
error: constexpr variable 'mask' must be initialized by a constant expression
error: call to consteval function 'pin_mask' is not a constant expression
# -DBAD_PIN, g++-16
error: call to non-'constexpr' function 'void invalid_pin()'
# -DBAD_INIT, Clang 23.1.5
error: variable does not have a constant initializer
# -DBAD_INIT, g++-16
error: 'constinit' variable 'bad' does not have a constant initializer
error: call to non-'constexpr' function 'int read_io()'
```

[C++20 N4861 상수 평가 규칙](https://timsong-cpp.github.io/cppwp/n4861/expr.const), [constinit 규칙](https://eel.is/c++draft/dcl.constinit), [WG21 P1938R3 if consteval](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p1938r3.html)을 참고합니다.

## `consteval`의 실용적 가치

1. **매크로 대체** — 타입 검사와 상수식 진단을 얻습니다.
2. **컴파일 타임 검증** — invalid input을 컴파일 시점에 차단합니다.
3. **API 설계** — 컴파일 타임 보장을 함수 시그니처에 명시합니다.

```cpp
// 의도 명확
consteval PinId make_pin(int port, int pin);

// "이 함수는 컴파일 타임 인자만 받습니다" — 시그니처 자체가 문서
```

## 정리

- `consteval`은 함수의 컴파일 타임 호출을 강제하며, 런타임 호출은 컴파일 에러로 막힙니다.
- `constinit`은 지정한 변수의 동적 초기화를 거부하며, 전역 자원 간 전체 초기화·종료 순서를 대신 설계하지는 않습니다.
- 매크로를 대체하면서 타입 안전성과 검증 가능성을 함께 얻습니다.
- C++20 기능이며 설치한 언어 모드·기능 매크로·최소 예제로 지원 여부를 확인합니다.
- `if consteval`(C++23)로 컴파일과 런타임을 분기할 수 있습니다.

## 관련 항목

- [Part 2-03: constexpr 기초](/blog/embedded/embedded-cpp/part2-03-constexpr-basics) — constexpr 출발
- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 알고리즘
- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — Static Init Fiasco
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++20 채택 결정

## 다음 글

[Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics) — 컴파일 타임 다형성의 핵심 도구입니다. type-safe하고 zero-cost인 generic 코드를 다룹니다.
