---
title: "GPIO 추상화 패턴 — Template·Concept으로 보드 독립성"
slug: "embedded/embedded-cpp/part5-02-gpio-abstraction"
date: 2026-05-02T09:38:00
description: "GPIO pin을 타입으로 표현하고, 컴파일 타임 설정·가짜 backend·concept으로 계약을 검사합니다."
series: "Embedded C++ for Real Systems"
seriesOrder: 38
tags: [cpp, embedded, gpio, template, type-safe, hal]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"각 GPIO pin이 고유한 type을 갖습니다."** 두 pin을 섞을 수 없고, 잘못 쓰면 컴파일 에러가 납니다.

## 어떤 문제를 푸는가

전통적인 C GPIO 사용 방식입니다.

```c
#define LED_PORT GPIOA
#define LED_PIN  GPIO_PIN_5

HAL_GPIO_WritePin(LED_PORT, LED_PIN, GPIO_PIN_SET);

// 다른 곳
#define BUTTON_PORT GPIOC
#define BUTTON_PIN  GPIO_PIN_13

HAL_GPIO_WritePin(LED_PORT, BUTTON_PIN, GPIO_PIN_SET);   // 오타 — 컴파일 통과
```

매크로는 type이 없습니다. 섞이는 실수를 컴파일러가 잡지 못합니다.

C++ template 기반 GPIO는 다음과 같습니다.

```cpp
using Led    = Gpio<0x40020000, 5>;
using Button = Gpio<0x40020800, 13>;

Led::set();          // OK
Button::set();       // OK
Led::set();          // 다른 함수에서 다시 OK
// Led::set(Button); // 컴파일 에러
```

같은 Port·Pin 조합의 alias는 같은 타입입니다. 각 이름이 고유한 소유권을 만들지는 않으며 `Button::set()`도 API에 있으면 호출할 수 있습니다. 입력 전용·출력 전용 정책까지 검사하려면 제공하는 메서드를 분리해야 합니다.

## 기본 — Static GPIO class

[Part 2-06 Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)의 내용을 보강합니다.

```cpp
template<uintptr_t Port, uint8_t Pin>
class Gpio {
    static_assert(Pin < 16, "Pin must be 0-15");
    // <cstdint> 포함; GpioMode enum은 Part 5-01 또는 아래 완전 예제 참조

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

arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -mthumb -Os`로 `LedRed::set()` 한 줄짜리 함수를 컴파일한 결과입니다.

```text
00000000 <_Z7led_setv>:
   0:	ldr	r3, [pc, #4]	@ (8 <_Z7led_setv+0x8>)
   2:	movs	r2, #32
   4:	str	r2, [r3, #24]
   6:	bx	lr
   8:	.word	0x40020000
```

포트 주소를 literal pool에서 읽고, BSRR(offset 24)에 `1 << 5` = 32를 한 번 씁니다. 함수 호출은 남지 않았습니다. 보드의 GPIO 파형은 측정하지 않았습니다.

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

C++17 fold expression으로 variadic을 처리합니다. 각 호출이 volatile BSRR store라서 컴파일러가 합치지 않습니다. 같은 port의 5·6·7번 핀으로 컴파일하면 `GpioGroup::set_all()`은 `str`이 세 번(32, 64, 128), 아래 `GpioMask::set_all()`은 `movs r2, #224` 뒤 `str` 한 번이었습니다. 세 핀이 같은 순간에 바뀌어야 하면 mask API로 한 번의 쓰기를 명시합니다.

## Pin 출력 직접 조작 (한 번에)

```cpp
template<uintptr_t Port, uint32_t Mask>
class GpioMask {
    static_assert((Mask & 0xffff0000u) == 0, "only pins 0..15");
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

같은 port의 BSRR에 한 번의 쓰기로 여러 출력 비트를 set/reset합니다. ODR 읽기와 쓰기를 나눌 필요가 없다는 의미이며 C++ thread atomic이나 여러 port 동시 변경을 의미하지는 않습니다.

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
    // output의 pull-up도 허용되는 하드웨어 설정; 회로 정책은 별도 검사

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

이 스케치는 C++20 structural type NTTP 표현만 보이며 init/set은 구현하지 않았습니다. 출력 모드의 pull-up을 무조건 금지하면 open-drain 등의 유효한 회로를 거부할 수 있습니다. 아래 완전한 fake backend 예제에서 mode·pull·open-drain 필드를 실제 반영하고 경계를 확인합니다.

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

STM32F4의 GPIO 핀은 AFR 레지스터의 4비트 필드로 AF0~AF15 중 하나를 고르고, 각 번호가 어느 peripheral 기능인지는 품번별 datasheet의 alternate function 표가 정합니다.

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
        configure(GpioMode::Alt);
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

template parameter로 AF를 컴파일 타임에 결정합니다. AF 번호를 상수로 고정할 수 있지만 그 번호가 해당 핀에서 어떤 peripheral 기능을 뜻하는지는 MCU·패키지별 datasheet를 확인해야 합니다. 타입의 숫자 범위 검사만으로 연결 유효성을 증명하지 않습니다.

## Interrupt — EXTI 통합

GPIO 타입에 port·pin 정보를 담아 EXTI 매핑에 전달할 수 있습니다. 실제 구현은 SYSCFG 매핑, trigger edge, pending 해제, 공유 IRQ handler와 NVIC 설정을 포함해야 합니다. GPIO concept을 만족하는 것만으로 이 설정이나 ISR 안전성이 보장되지는 않으며 여기서는 EXTI 드라이버를 구현하지 않습니다.

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
#if defined(BOARD_CUSTOM_A)
    using Led1   = Gpio<0x40020000, 5>;
    using Button = Gpio<0x40020800, 13>;
#elif defined(BOARD_CUSTOM_B)
    using Led1   = Gpio<0x40020c00, 12>;
    using Button = Gpio<0x40020800, 13>;
#elif defined(BOARD_CUSTOM)
    using Led1   = Gpio<0x40020800, 0>;
    using Button = Gpio<0x40021000, 1>;
#endif
```

위 분기는 실제 Discovery/Nucleo 보드 핀맵이 아닌 사용자 보드 alias 예시입니다. 보드의 회로도·LED active level·버튼 pull과 pin mux를 확인해 별도로 정의합니다. application API가 같은 경우 호출부를 유지할 수 있습니다.

## 자주 보는 함정과 안티패턴

### 1. Pin number를 runtime 변수로

```cpp
void set_pin(int pin) {   // template parameter 아님
    GPIOA->BSRR = 1u << pin;   // runtime
}
```

runtime `pin`이면 shift가 명령으로 남고 범위 검사도 runtime `if`가 됩니다. template으로 결정하면 위 `LedRed::set()`처럼 즉치값 store 하나가 되고, 범위 밖 핀은 `static_assert`로 컴파일 단계에서 막힙니다.

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

### 6. 출력 slew 설정 누락

STM32F4의 OSPEEDR 필드는 출력 드라이버의 slew 특성(Low/Medium/High/Very high speed)을 고르며, UART baud나 SPI clock 주파수 그 자체가 아닙니다. 부하·전압·EMI·신호 무결성을 고려해 설정하고 보드에서 확인합니다.

## 작은 예제 — 설정을 실제 backend에 적용

다음 코드는 MMIO 주소 대신 fake 저장소에 설정을 적용합니다. 핀 범위·concept·필드 보존을 검증하지만 실제 레지스터의 쓰기 부작용이나 전기 신호를 대신하지 않습니다.

```cpp title="gpio-check.cpp"
#include <cassert>
#include <concepts>
#include <cstdint>
enum class Mode : std::uint32_t { Input, Output, Alternate, Analog };
struct Config { Mode mode; bool pull_up; bool open_drain; };
struct Fake {
    static inline std::uint32_t mode=0, pull=0, type=0, last=0;
    static inline int writes=0;
    static void command(std::uint32_t v) { last=v; ++writes; }
};
template<class Bus, unsigned Pin, Config Cfg> struct Gpio {
    static_assert(Pin < 16, "pin must be below 16");
    static void init() {
        constexpr unsigned shift=Pin*2;
        Bus::mode=(Bus::mode & ~(3u<<shift)) | (static_cast<unsigned>(Cfg.mode)<<shift);
        Bus::pull=(Bus::pull & ~(3u<<shift)) | (unsigned(Cfg.pull_up)<<shift);
        Bus::type=(Bus::type & ~(1u<<Pin)) | (unsigned(Cfg.open_drain)<<Pin);
    }
    static void set() { Bus::command(1u<<Pin); }
    static void clear() { Bus::command(1u<<(Pin+16)); }
};
template<class T> concept Output = requires {
    { T::set() } -> std::same_as<void>;
    { T::clear() } -> std::same_as<void>;
};
using Led=Gpio<Fake,5,Config{Mode::Output,true,true}>;
static_assert(Output<Led>);
int main() {
    Fake::mode=3; Led::init();
    assert(Fake::mode==(3u|(1u<<10)));
    assert(Fake::pull==(1u<<10) && Fake::type==(1u<<5));
    Led::set(); assert(Fake::last==32 && Fake::writes==1);
    Led::clear(); assert(Fake::last==(1u<<21) && Fake::writes==2);
#ifdef BAD_PIN
    Gpio<Fake,16,Config{Mode::Output,false,false}>::set();
#endif
}
```

Homebrew Clang 23.1.5와 g++-16, arm64 macOS에서 `clang++ -std=c++20 -Wall -Wextra -pedantic-errors gpio-check.cpp -o gpio-check && ./gpio-check`가 exit 0으로 출력+pull-up·open-drain 허용, 다른 mode 필드 보존, 두 BSRR 명령을 통과했습니다. `-DBAD_PIN`은 g++-16에서 `error: static assertion failed: pin must be below 16`으로 거부됩니다.

[ST HAL GPIO v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_gpio.c)는 pin 인자를 비트 mask로 받고 set/reset에 BSRR을 사용합니다. 실제 MCU 주소와 비트 정의는 [STM32F407xx CMSIS v2.6.10](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.10/Include/stm32f407xx.h)을 참고합니다.

## 정리

- GPIO pin은 template instantiated type이며 pin마다 별도 type을 갖습니다.
- Port와 Pin number를 모두 컴파일 타임에 결정하므로 invalid pin은 `static_assert`로 잡힙니다.
- Concept으로 GPIO interface를 정의하면 generic 함수가 type-safe해집니다.
- Board-specific type alias 헤더로 다중 보드를 지원합니다.
- Configuration도 C++20 class 타입 NTTP로 컴파일 타임에 고정할 수 있습니다(위 `gpio-check.cpp`).

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 4-05: Type-safe Flags](/blog/embedded/embedded-cpp/part4-05-type-safe-flags)
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction)
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction)

## 다음 글

[Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — UART, SPI, I2C 같은 peripheral을 type-safe class로 다룹니다.
