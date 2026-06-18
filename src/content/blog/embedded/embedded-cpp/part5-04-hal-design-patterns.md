---
title: "임베디드 HAL 설계 패턴 — Static·Dynamic·Hybrid 비교"
date: 2026-05-02T09:40:00
description: "범용 HAL 구조 — 벤더 종속성 격리, 다중 보드/MCU 지원, 시리즈 마무리."
series: "Embedded C++ for Real Systems"
seriesOrder: 40
tags: [cpp, embedded, hal, abstraction, portability, board-support]
type: tech
---

## 한 줄 요약

> **"HAL은 application과 hardware 사이의 통역입니다."** 벤더를 바꿔도 application 영향이 0이 되는 것이 목표입니다.

## 어떤 문제를 푸는가

벤더 HAL(STM32 HAL, NXP MCUXpresso, Nordic SDK)은 벤더에 종속됩니다. 보드 변경은 application 대수정으로 이어집니다.

```c
// STM32
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);

// NXP
GPIO_PortToggle(GPIO5, 1u << 6);

// Nordic
nrf_gpio_pin_set(LED_PIN);
```

같은 LED toggle이지만 API가 완전히 다릅니다. application이 이 모두를 알아야 하니 이식이 불가능해집니다.

**HAL**(Hardware Abstraction Layer)은 통일된 interface를 제공합니다.

```cpp
// Generic HAL
hal::Led::set();

// 내부적으로 보드별 분기 — application은 모름
```

이 글이 시리즈의 마지막입니다. 전체 패턴을 정리하면서 HAL 설계를 다룹니다.

## HAL의 3 계층

HAL은 보통 세 계층으로 쌓입니다. Application은 인터페이스만 보고, 벤더별 구현은 그 아래에 숨어 있습니다.

![HAL 3 계층 — App → Interface → Vendor → Hardware](/images/blog/embedded-cpp/diagrams/part5-04-hal-layers.svg)

각 계층은 위에서 아래로만 의존합니다. 위 계층은 아래의 구체 구현을 모르고, 인터페이스만 통해 호출합니다.

## 패턴 1 — Interface + Implementation

```cpp
// hal/gpio.h
namespace hal {

class IGpio {
public:
    virtual ~IGpio() = default;
    virtual void set() = 0;
    virtual void clear() = 0;
    virtual bool read() const = 0;
    virtual void toggle() = 0;
};

}   // namespace hal
```

```cpp
// hal/stm32/gpio_stm32.cpp
namespace hal::stm32 {

class StmGpio : public hal::IGpio {
    GPIO_TypeDef* port_;
    uint16_t pin_;

public:
    StmGpio(GPIO_TypeDef* port, uint16_t pin) : port_(port), pin_(pin) {}

    void set() override { HAL_GPIO_WritePin(port_, pin_, GPIO_PIN_SET); }
    void clear() override { HAL_GPIO_WritePin(port_, pin_, GPIO_PIN_RESET); }
    bool read() const override { return HAL_GPIO_ReadPin(port_, pin_); }
    void toggle() override { HAL_GPIO_TogglePin(port_, pin_); }
};

}
```

```cpp
// application
void blink(hal::IGpio& led) {
    led.set();
    sleep_ms(500);
    led.clear();
    sleep_ms(500);
}

// main (board-specific wiring)
hal::stm32::StmGpio led(GPIOA, GPIO_PIN_5);
blink(led);
```

장점은 다음과 같습니다.

- Application 코드는 IGpio 인터페이스만 봅니다
- Vendor 변경은 StmGpio를 NxpGpio로 바꾸는 것으로 끝납니다
- 테스트에서 MockGpio를 주입할 수 있습니다

단점은 다음과 같습니다.

- Virtual call overhead가 작지만 존재합니다
- vtable과 RTTI 비용이 듭니다

## 패턴 2 — Template-based HAL (Zero-cost)

Virtual 대신 CRTP를 씁니다.

```cpp
// hal/gpio_base.h
namespace hal {

template<typename Derived>
class GpioBase {
public:
    void set()    { static_cast<Derived*>(this)->set_impl(); }
    void clear()  { static_cast<Derived*>(this)->clear_impl(); }
    bool read()   { return static_cast<Derived*>(this)->read_impl(); }
    void toggle() { static_cast<Derived*>(this)->toggle_impl(); }
};

}
```

```cpp
// hal/stm32/gpio_stm32.h
namespace hal::stm32 {

template<uintptr_t Port, uint8_t Pin>
class StmGpio : public hal::GpioBase<StmGpio<Port, Pin>> {
public:
    void set_impl()    { /* direct register write */ }
    void clear_impl()  { /* */ }
    bool read_impl()   { /* */ return false; }
    void toggle_impl() { /* */ }
};

}
```

```cpp
// application — template으로 generic
template<typename Gpio>
void blink(Gpio& led) {
    led.set();
    sleep_ms(500);
    led.clear();
    sleep_ms(500);
}

// main
hal::stm32::StmGpio<0x40020000, 5> led;
blink(led);   // 컴파일 타임 dispatch, zero cost
```

장점은 다음과 같습니다.

- Zero overhead로 virtual call이 없습니다
- Compile-time 검증이 가능합니다
- Inline이 가능합니다

단점은 다음과 같습니다.

- Application도 template이라 header에 정의해야 합니다
- type이 폭증할 수 있습니다

## 패턴 3 — typedef 기반 (가장 단순)

```cpp
// board_config.h — 보드별 헤더
#if defined(STM32F4)
    using LedGpio = hal::stm32::StmGpio<0x40020000, 5>;
    using ButtonGpio = hal::stm32::StmGpio<0x40020800, 13>;
#elif defined(NRF52)
    using LedGpio = hal::nrf::NrfGpio<NRF_P0, 13>;
    using ButtonGpio = hal::nrf::NrfGpio<NRF_P0, 11>;
#endif
```

```cpp
// application
void blink() {
    LedGpio::set();
    sleep_ms(500);
    LedGpio::clear();
    sleep_ms(500);
}
```

장점은 다음과 같습니다.

- Compile-time에 보드를 선택합니다
- Application은 그냥 `LedGpio`를 씁니다
- zero overhead입니다

단점은 다음과 같습니다.

- 런타임에 보드를 변경할 수 없습니다(보통은 괜찮습니다)

## 패턴 4 — Mixed (interface + template)

복잡한 시스템에서는 application은 interface로, driver는 template으로 다룹니다.

```cpp
class IUart {
public:
    virtual ~IUart() = default;
    virtual void send(const uint8_t* data, size_t len) = 0;
    virtual size_t recv(uint8_t* data, size_t len) = 0;
};

template<uintptr_t Address>
class StmUart : public IUart {
    // direct register 구현
public:
    void send(const uint8_t* data, size_t len) override { /* */ }
    size_t recv(uint8_t* data, size_t len) override { /* */ return 0; }
};

// Application
void process(IUart& uart) {
    uart.send(...);
}

// main
StmUart<0x40004400> uart2;
process(uart2);
```

application은 interface로 polymorphic하게 동작합니다. driver는 최적 구현으로 유지합니다.

## 디렉토리 구조

```text
project/
├── hal/
│   ├── include/hal/
│   │   ├── gpio.h           # IGpio interface
│   │   ├── uart.h           # IUart interface
│   │   └── ...
│   ├── stm32/
│   │   ├── gpio_stm32.h
│   │   ├── gpio_stm32.cpp
│   │   └── ...
│   ├── nrf/
│   │   └── ...
│   └── mock/                # 테스트용
│       ├── mock_gpio.h
│       └── ...
├── board/
│   ├── stm32_discovery.h    # 보드별 type alias
│   ├── nrf_dk.h
│   └── ...
└── app/
    └── main.cpp              # application
```

벤더별로 별도 directory를 둡니다. CMake에서 조건부로 컴파일합니다.

```cmake
if(BOARD STREQUAL "STM32_DISCOVERY")
    add_subdirectory(hal/stm32)
    set(BOARD_HEADER "board/stm32_discovery.h")
elseif(BOARD STREQUAL "NRF_DK")
    add_subdirectory(hal/nrf)
    set(BOARD_HEADER "board/nrf_dk.h")
endif()

target_compile_definitions(${TARGET} PRIVATE BOARD_HEADER="${BOARD_HEADER}")
```

## Mock HAL — Testing

```cpp
class MockGpio : public hal::IGpio {
public:
    bool state = false;
    std::vector<bool> history;

    void set() override { state = true; history.push_back(true); }
    void clear() override { state = false; history.push_back(false); }
    bool read() const override { return state; }
    void toggle() override { state = !state; history.push_back(state); }
};

TEST(BlinkTest, BlinksTwice) {
    MockGpio led;
    blink_twice(led);

    EXPECT_EQ(led.history.size(), 4);   // set, clear, set, clear
    EXPECT_TRUE(led.history[0]);
    EXPECT_FALSE(led.history[1]);
}
```

application 로직을 host에서 테스트할 수 있습니다. 하드웨어 없이도 가능합니다.

## Application 설계 — Dependency Injection

[Part 4-08](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives)의 패턴을 적용합니다.

```cpp
class System {
    hal::IGpio& led_;
    hal::IUart& uart_;
    hal::ISpi& spi_;

public:
    System(hal::IGpio& led, hal::IUart& uart, hal::ISpi& spi)
        : led_(led), uart_(uart), spi_(spi) {}

    void run() {
        led_.set();
        uart_.send_string("Started\n");
        // ...
    }
};

// main
hal::stm32::StmGpio led(GPIOA, GPIO_PIN_5);
hal::stm32::StmUart uart(USART2);
hal::stm32::StmSpi spi(SPI1);

System system(led, uart, spi);
system.run();
```

모든 dependency를 명시합니다. test에서는 mock을 주입할 수 있습니다.

## 임베디드 — Vendor switch 시나리오

같은 application을 STM32에서 NXP로 옮기는 경우입니다.

```cpp
// Application — 변경 없음
void process(hal::IUart& uart, hal::IGpio& led) {
    uart.send_string("hello");
    led.toggle();
}

// main — STM32 build
hal::stm32::StmUart uart(USART2);
hal::stm32::StmGpio led(GPIOA, 5);
process(uart, led);

// main — NXP build (다른 파일)
hal::nxp::NxpUart uart(UART2);
hal::nxp::NxpGpio led(GPIO5, 6);
process(uart, led);
```

HAL implementation만 다릅니다. application 코드는 변경되지 않습니다. 이것이 HAL의 목적입니다.

## 시리즈 마무리 — 40 chapter 정리

이 시리즈가 다룬 핵심을 정리합니다.

### Part 1 — Foundation (8)
- C++ vs C 비용 측정
- 컴파일러 플래그 (-fno-exceptions/-fno-rtti/-Os/-flto)
- 런타임 + libc + startup
- 코드 크기 분석
- ABI 호환성
- 링커 스크립트
- C++ 표준 선택

### Part 2 — Zero-Cost Abstractions (10)
- RAII (기초/실전)
- constexpr (기초/고급)
- consteval/constinit
- Templates (기초/비용)
- Static Polymorphism (CRTP)
- Type Traits
- Concepts (C++20)

### Part 3 — Memory & Error (10)
- No dynamic alloc
- Custom allocator
- Pool allocator
- std::pmr
- No-exception design
- Error handling patterns
- std::expected
- No-RTTI design
- Smart pointer choice
- Ownership model

### Part 4 — Advanced Patterns (8)
- Intrusive containers
- ETL library
- Lock-free basics/containers
- Type-safe flags
- State machine
- Compile-time FSM
- Singleton alternatives

### Part 5 — Hardware Abstraction (4)
- Register 추상화
- GPIO 추상화
- Peripheral 추상화
- HAL 설계 패턴 (이 글)

## 핵심 메시지

1. **Modern C++의 대부분은 zero-cost입니다** — 측정한 뒤에 사용합니다
2. **임베디드는 끄는 기술입니다** — `-fno-exceptions`, `-fno-rtti`, `-fno-threadsafe-statics`
3. **정적 할당을 우선합니다** — `std::array`, ETL, pool, placement new
4. **컴파일 타임으로 옮깁니다** — `constexpr`, template, CRTP, concepts
5. **소유권을 명시합니다** — `unique_ptr`이 기본, `shared_ptr`은 드물게, raw pointer는 non-owning에만 씁니다
6. **DI가 Singleton보다 낫습니다** — main에서 wiring합니다
7. **HAL로 vendor를 격리합니다** — application을 portable하게 만듭니다

## 다음 시리즈 추천

이 시리즈가 Modern C++ in Embedded를 다뤘다면 다음으로는 이런 시리즈를 추천합니다.

- **[Embedded Performance Engineering](/blog/embedded/performance-engineering)** — 측정과 최적화 (50 chapters)
- **[Practical RTOS Internals](/blog/embedded/rtos/practical-internals)** — FreeRTOS/Zephyr/RT-Thread 소스 분석 (45 chapters)
- **[Modern Embedded Recipes](/blog/embedded/modern-recipes)** — 일상 recipe 모음 (145 recipes)
- **Refactoring Catalog** — Fowler 61 패턴
- **[GoF Design Patterns](/blog/programming/design/gof-design-patterns)** — 23 패턴

## 자주 보는 함정과 안티패턴

### 1. HAL이 너무 두꺼움

모든 추상화에 virtual을 두면 small MCU에 부담이 됩니다. Mix나 template을 활용합니다.

### 2. Application에 vendor 누출

```cpp
// application 코드
HAL_GPIO_WritePin(...);   // STM32 직접 호출 — 포터블 깨짐
```

`hal::` namespace로만 호출합니다.

### 3. Mock 없음

host에서 application 로직을 테스트할 수 없게 됩니다. Mock HAL을 함께 작성합니다.

### 4. Board-specific 헤더 누락

모든 보드에 전체 HAL을 들고 다니지 않도록 board config 헤더로 분리합니다.

### 5. Vendor switch 시나리오 미고려

처음부터 벤더 종속을 가정하면 나중에 재작성하게 됩니다. HAL interface를 처음부터 설계합니다.

### 6. Performance 측정 안 함

HAL이 얼마나 비싼지를 모릅니다. 측정 도구를 활용합니다([Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) 참조).

## 정리

- HAL은 application과 vendor 사이의 통역 계층입니다.
- 패턴은 3가지로 나뉩니다 — Interface (virtual), Template (CRTP), Typedef (compile-time).
- Board-specific 헤더로 type alias를 통일합니다.
- Mock HAL을 두면 host에서 테스트할 수 있습니다.
- DI로 dependency wiring을 명시합니다.

## 관련 항목

- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction)
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction)
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)
- [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives)
- TDD Pattern 49: Extract Interface

## 시리즈 마무리

40 chapter, 5 Part로 Modern C++의 임베디드 사용을 전 범위에서 다뤘습니다. 측정 가능한 주장만 사용했고, 끄는 기술과 켜는 기술의 균형을 강조했습니다.

C++가 임베디드에서 안전하게 강력하다는 사실을 증명하는 것이 시리즈의 목표였습니다. RAII, constexpr, templates, concepts, `std::expected`, `std::variant` 같은 도구는 런타임 비용 없이 코드 품질을 끌어올립니다.

C++ 도입을 망설이던 팀에는 증거가 되기를, 이미 C++를 쓰는 팀에는 더 깊은 활용이 되기를, 처음 임베디드를 만나는 Modern C++ 개발자에게는 낯선 영역의 지도가 되기를 바랍니다.

읽어 주셔서 감사합니다.
