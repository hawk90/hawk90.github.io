---
title: "Part 5-02: GPIO 추상화"
date: 2026-05-17T02:00:00
description: "GPIO pin = type — 컴파일 타임에 핀 설정 검증, runtime 비용 0."
series: "Embedded C++ for Real Systems"
seriesOrder: 38
tags: [cpp, embedded, gpio, template, type-safe, hal]
type: tech
---

## 한 줄 요약

> **"각 GPIO pin이 *고유 type*."** — 두 pin 섞을 수 없음. 잘못된 사용 = *컴파일 에러*.

## 어떤 문제를 푸는가

전통 C GPIO 사용:

```c
#define LED_PORT GPIOA
#define LED_PIN  5

HAL_GPIO_WritePin(LED_PORT, LED_PIN, GPIO_PIN_SET);

// 다른 곳
#define BUTTON_PORT GPIOC
#define BUTTON_PIN  13

HAL_GPIO_WritePin(LED_PORT, BUTTON_PIN, GPIO_PIN_SET);   // 오타 — 컴파일 통과
```

매크로는 *type 없음*. *섞이는 실수 컴파일러 못 잡음*.

C++ template 기반 GPIO:

```cpp
using Led    = Gpio<GpioA, 5>;
using Button = Gpio<GpioC, 13>;

Led::set();          // OK
Button::set();       // OK
Led::set();          // 다른 함수에서 다시 OK
// Led::set(Button); // 컴파일 에러
```

*Pin이 type* — *섞이지 않음*.

## 기본 — Static GPIO class

[Part 2-06 Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics) 보강.

```cpp
template<uintptr_t Port, uint8_t Pin>
class Gpio {
    static_assert(Pin < 16, "Pin must be 0-15");

    struct PortRegs {
        volatile uint32_t MODER;
        volatile uint32_t OTYPER;
        volatile uint32_t OSPEEDR;
        volatile uint32_t PUPDR;
        volatile uint32_t IDR;
        volatile uint32_t ODR;
        volatile uint32_t BSRR;
        // ...
    };

    static PortRegs& port() {
        return *reinterpret_cast<PortRegs*>(Port);
    }

public:
    static void set() {
        port().BSRR = 1u << Pin;
    }

    static void clear() {
        port().BSRR = 1u << (Pin + 16);
    }

    static void toggle() {
        port().ODR ^= 1u << Pin;
    }

    static bool read() {
        return (port().IDR >> Pin) & 1;
    }

    static void configure(GpioMode mode) {
        constexpr uint32_t shift = Pin * 2;
        uint32_t v = port().MODER;
        v &= ~(0b11u << shift);
        v |= static_cast<uint32_t>(mode) << shift;
        port().MODER = v;
    }
};

using LedRed = Gpio<0x40020000, 5>;   // GPIOA pin 5
using Button = Gpio<0x40020800, 13>;  // GPIOC pin 13

LedRed::configure(GpioMode::Output);
LedRed::set();

if (Button::read()) {
    LedRed::toggle();
}
```

*Pin number도 컴파일 타임*. *invalid pin은 static_assert*.

## 어셈블리 출력

```cpp
LedRed::set();
```

```text
LedRed::set():
    ldr     r3, =0x40020018      ; BSRR address
    movs    r2, #32              ; 1 << 5
    str     r2, [r3]
    bx      lr
```

C 매크로의 결과와 *완전 동일*. *zero-cost abstraction*.

## Pin 그룹 — 여러 pin 동시 조작

```cpp
template<typename... Gpios>
class GpioGroup {
public:
    static void set_all() { (Gpios::set(), ...); }
    static void clear_all() { (Gpios::clear(), ...); }
};

using Leds = GpioGroup<Led1, Led2, Led3>;

Leds::set_all();
Leds::clear_all();
```

C++17 fold expression으로 *variadic 처리*. 각 호출 *별도 어셈블리* — 같은 port면 *컴파일러가 자동 결합 가능*.

## Pin 출력 직접 조작 (한 번에)

```cpp
template<uintptr_t Port, uint32_t Mask>
class GpioMask {
public:
    static void set_all() {
        *reinterpret_cast<volatile uint32_t*>(Port + 0x18) = Mask;
    }

    static void clear_all() {
        *reinterpret_cast<volatile uint32_t*>(Port + 0x18) = Mask << 16;
    }
};

using LedGroup = GpioMask<0x40020000, (1<<5) | (1<<6) | (1<<7)>;

LedGroup::set_all();   // 3 pin 한 번에 set
```

*한 atomic store*. 빠름. 단 *같은 port에 한정*.

## Configuration — Compile-time 검증

```cpp
struct PinConfig {
    GpioMode mode;
    bool pull_up;
    bool open_drain;
    GpioSpeed speed;
};

template<uintptr_t Port, uint8_t Pin, PinConfig Cfg>
class ConfiguredGpio {
    static_assert(Pin < 16);
    static_assert(!(Cfg.mode == GpioMode::Output && Cfg.pull_up),
                  "Output mode shouldn't have pull-up");

public:
    static void init() {
        // Cfg 기반 register 설정
        // 컴파일러가 if constexpr로 분기 제거
    }

    static void set() { /* */ }
};

using Led = ConfiguredGpio<0x40020000, 5,
    PinConfig{GpioMode::Output, false, false, GpioSpeed::High}>;

Led::init();
Led::set();
```

*잘못된 configuration이 빌드 에러*. C++20의 *NTTP (non-type template parameter) 객체*.

## Concept으로 GPIO interface 정의 (C++20)

```cpp
template<typename T>
concept GpioPin = requires {
    { T::set() }    -> std::same_as<void>;
    { T::clear() }  -> std::same_as<void>;
    { T::read() }   -> std::same_as<bool>;
    { T::toggle() } -> std::same_as<void>;
};

template<GpioPin Led>
void blink_n_times(int n, int delay_ms) {
    for (int i = 0; i < n; ++i) {
        Led::set();
        sleep_ms(delay_ms);
        Led::clear();
        sleep_ms(delay_ms);
    }
}

blink_n_times<LedRed>(5, 500);
```

*GpioPin 만족하는 type만* — *컴파일 타임에 인터페이스 검증*.

## Alternative function 매핑

대부분 peripheral pin은 *alternative function*. ([STM32 datasheet] 참조)

```cpp
enum class AltFn : uint8_t {
    AF0 = 0, AF1, AF2, AF3, AF4, AF5, AF6, AF7,
    AF8, AF9, AF10, AF11, AF12, AF13, AF14, AF15,
};

template<uintptr_t Port, uint8_t Pin>
class Gpio {
    // ...

public:
    template<AltFn Af>
    static void configure_alt() {
        configure(GpioMode::AlternateFn);
        // AFR[0] for pin 0-7, AFR[1] for pin 8-15
        constexpr int afr_idx = Pin / 8;
        constexpr int shift = (Pin % 8) * 4;
        uint32_t v = port().AFR[afr_idx];
        v &= ~(0b1111u << shift);
        v |= static_cast<uint32_t>(Af) << shift;
        port().AFR[afr_idx] = v;
    }
};

// USART2 TX = PA2, AF7
using Usart2Tx = Gpio<0x40020000, 2>;
Usart2Tx::configure_alt<AltFn::AF7>();
```

template parameter로 *AF 컴파일 타임*. *runtime 비교 없음*.

## Interrupt — EXTI 통합

```cpp
template<typename Pin>
class GpioInterrupt {
public:
    static void enable(InterruptEdge edge) {
        // EXTI 설정 — Pin의 port/pin을 기반
        constexpr uint32_t exti_line = Pin::pin_number;
        // ...
    }

    static void on_interrupt() {
        // 호출자가 정의
    }
};
```

[ARM CMSIS NVIC API]와 통합하면 *interrupt handler*도 type-safe.

## 임베디드 — 보드 설정 헤더

```cpp
// board_config.h
namespace board {
    using Led1     = Gpio<0x40020000, 5>;
    using Led2     = Gpio<0x40020000, 6>;
    using Button   = Gpio<0x40020800, 13>;
    using Uart2Tx  = Gpio<0x40020000, 2>;
    using Uart2Rx  = Gpio<0x40020000, 3>;
    using SpiSck   = Gpio<0x40020400, 13>;
    using SpiMiso  = Gpio<0x40020400, 14>;
    using SpiMosi  = Gpio<0x40020400, 15>;
}

// app.cpp
#include "board_config.h"

using board::Led1;
using board::Button;

Led1::configure(GpioMode::Output);
Led1::set();
```

*보드별 설정 헤더*. 다른 보드는 *다른 헤더*. *app 코드 그대로*.

## 다중 보드 지원

```cpp
#if defined(BOARD_STM32_DISCOVERY)
    using Led1   = Gpio<0x40020000, 5>;
    using Button = Gpio<0x40020800, 13>;
#elif defined(BOARD_NUCLEO_F401)
    using Led1   = Gpio<0x40020000, 5>;
    using Button = Gpio<0x40020800, 13>;
#elif defined(BOARD_CUSTOM)
    using Led1   = Gpio<0x40020800, 0>;
    using Button = Gpio<0x40021000, 1>;
#endif
```

build flag로 *보드 선택*. *application 코드는 변경 없음*.

## 자주 보는 함정과 안티패턴

### 1. *Pin number runtime 변수*
```cpp
void set_pin(int pin) {   // template parameter 아님
    GPIOA->BSRR = 1u << pin;   // runtime
}
```
*template으로 컴파일 타임*. type safety + zero-cost.

### 2. *configure 누락*
```cpp
Led::set();   // configure 안 함 — invalid mode
```
*configure 강제* — RAII 또는 *명시 호출 강제*.

### 3. *Port clock 활성화 누락*
GPIO 사용 전 *port clock enable* 필요.

```cpp
template<uintptr_t Port, uint8_t Pin>
class Gpio {
public:
    static void enable_clock() {
        // RCC->AHB1ENR |= corresponding bit
    }
};
```

### 4. *동일 pin을 여러 type alias*
```cpp
using Led1   = Gpio<0x40020000, 5>;
using LedDup = Gpio<0x40020000, 5>;   // 같은 pin — 의도 모호
```
*한 type만 사용*.

### 5. *Static configuration vs runtime*
*Production에서 pin이 변경되어야* 한다면 template 안 됨. *runtime 설정 필요*.

### 6. *Speed 설정 누락*
high-speed peripheral (SPI, UART)에 *low speed pin* → signal 못 따라감. *configure에서 speed 명시*.

## 측정 — Macro vs Template GPIO

같은 LED blink loop.

```text
# C macro
#define LED_SET()   (GPIOA->BSRR = 1<<5)
#define LED_CLEAR() (GPIOA->BSRR = 1<<21)

while (1) {
    LED_SET();
    delay_ms(500);
    LED_CLEAR();
    delay_ms(500);
}

# 어셈블리 (set):
ldr     r3, =0x40020018
movs    r2, #32
str     r2, [r3]

# C++ template
while (1) {
    Led::set();
    delay_ms(500);
    Led::clear();
    delay_ms(500);
}

# 어셈블리 (set):
ldr     r3, =0x40020018
movs    r2, #32
str     r2, [r3]

# 완전 동일
```

C++ 추가 비용 *0*. 추가 *type safety + IDE 지원*.

## 정리

- GPIO pin은 template instantiated type이며 pin마다 별도 type을 갖습니다.
- Port와 Pin number를 모두 컴파일 타임에 결정하므로 invalid pin은 `static_assert`로 잡힙니다.
- Concept으로 GPIO interface를 정의하면 generic 함수가 type-safe해집니다.
- Board-specific type alias 헤더로 다중 보드를 지원합니다.
- Configuration도 컴파일 타임에 결정하며 `if constexpr`로 분기합니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 4-05: Type-safe Flags](/blog/embedded/embedded-cpp/part4-05-type-safe-flags)
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction)
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction)

## 다음 글

[Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — *UART, SPI, I2C 같은 peripheral*을 *type-safe class*로.
