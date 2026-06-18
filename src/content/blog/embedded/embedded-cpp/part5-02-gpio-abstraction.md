---
title: "GPIO 추상화 패턴 — Template·Concept으로 보드 독립성"
date: 2026-05-02T09:38:00
description: "GPIO pin = type — 컴파일 타임에 핀 설정 검증, runtime 비용 0."
series: "Embedded C++ for Real Systems"
seriesOrder: 38
tags: [cpp, embedded, gpio, template, type-safe, hal]
type: tech
---

## 한 줄 요약

> **"각 GPIO pin이 고유한 type을 갖습니다."** 두 pin을 섞을 수 없고, 잘못 쓰면 컴파일 에러가 납니다.

## 어떤 문제를 푸는가

전통적인 C GPIO 사용 방식입니다.

```c
#define LED_PORT GPIOA
#define LED_PIN  5

HAL_GPIO_WritePin(LED_PORT, LED_PIN, GPIO_PIN_SET);

// 다른 곳
#define BUTTON_PORT GPIOC
#define BUTTON_PIN  13

HAL_GPIO_WritePin(LED_PORT, BUTTON_PIN, GPIO_PIN_SET);   // 오타 — 컴파일 통과
```

매크로는 type이 없습니다. 섞이는 실수를 컴파일러가 잡지 못합니다.

C++ template 기반 GPIO는 다음과 같습니다.

```cpp
using Led    = Gpio<GpioA, 5>;
using Button = Gpio<GpioC, 13>;

Led::set();          // OK
Button::set();       // OK
Led::set();          // 다른 함수에서 다시 OK
// Led::set(Button); // 컴파일 에러
```

Pin이 type이므로 섞이지 않습니다.

## 기본 — Static GPIO class

[Part 2-06 Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)의 내용을 보강합니다.

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

Pin number도 컴파일 타임에 결정됩니다. invalid pin은 `static_assert`로 잡힙니다.

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

C 매크로의 결과와 완전히 동일합니다. zero-cost abstraction입니다.

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

C++17 fold expression으로 variadic을 처리합니다. 각 호출은 별도 어셈블리로 나오지만 같은 port면 컴파일러가 자동으로 결합할 수 있습니다.

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

한 번의 atomic store로 끝나 빠릅니다. 단 같은 port에 한정됩니다.

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

잘못된 configuration이 빌드 에러로 잡힙니다. C++20의 NTTP(non-type template parameter) 객체를 활용합니다.

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

`GpioPin`을 만족하는 type만 허용됩니다. 컴파일 타임에 인터페이스가 검증됩니다.

## Alternative function 매핑

대부분의 peripheral pin은 alternative function을 가집니다(STM32 datasheet 참조).

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

template parameter로 AF를 컴파일 타임에 결정합니다. runtime 비교가 없습니다.

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

ARM CMSIS NVIC API와 통합하면 interrupt handler도 type-safe해집니다.

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

보드별 설정 헤더를 둡니다. 다른 보드는 다른 헤더를 쓰고, app 코드는 그대로 유지됩니다.

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

build flag로 보드를 선택합니다. application 코드는 그대로입니다.

## 자주 보는 함정과 안티패턴

### 1. Pin number를 runtime 변수로

```cpp
void set_pin(int pin) {   // template parameter 아님
    GPIOA->BSRR = 1u << pin;   // runtime
}
```

template으로 컴파일 타임에 결정하면 type safety와 zero-cost를 함께 얻습니다.

### 2. configure 누락

```cpp
Led::set();   // configure 안 함 — invalid mode
```

configure를 RAII나 명시적 호출로 강제합니다.

### 3. Port clock 활성화 누락

GPIO 사용 전에 port clock을 enable해야 합니다.

```cpp
template<uintptr_t Port, uint8_t Pin>
class Gpio {
public:
    static void enable_clock() {
        // RCC->AHB1ENR |= corresponding bit
    }
};
```

### 4. 동일 pin에 여러 type alias

```cpp
using Led1   = Gpio<0x40020000, 5>;
using LedDup = Gpio<0x40020000, 5>;   // 같은 pin — 의도 모호
```

한 type만 사용합니다.

### 5. Static configuration vs runtime

production에서 pin이 변경되어야 한다면 template 방식으로는 부족합니다. runtime 설정이 필요합니다.

### 6. Speed 설정 누락

high-speed peripheral(SPI, UART)에 low speed pin을 쓰면 signal을 따라가지 못합니다. configure에서 speed를 명시합니다.

## 측정 — Macro vs Template GPIO

같은 LED blink loop 비교입니다.

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

C++ 추가 비용은 0입니다. 추가로 type safety와 IDE 지원을 얻습니다.

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

[Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — UART, SPI, I2C 같은 peripheral을 type-safe class로 다룹니다.
