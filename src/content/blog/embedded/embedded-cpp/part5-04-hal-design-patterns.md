---
title: "Part 5-04: HAL 설계 패턴"
date: 2026-05-17T04:00:00
description: "범용 HAL 구조 — 벤더 종속성 격리, 다중 보드/MCU 지원, 시리즈 마무리."
series: "Embedded C++ for Real Systems"
seriesOrder: 40
tags: [cpp, embedded, hal, abstraction, portability, board-support]
type: tech
---

## 한 줄 요약

> **"HAL = *application과 hardware 사이의 통역*."** — 벤더 변경에 application 영향 0이 목표.

## 어떤 문제를 푸는가

벤더 HAL (STM32 HAL, NXP MCUXpresso, Nordic SDK)은 *벤더 종속*. 보드 변경 = *application 대수정*.

```c
// STM32
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);

// NXP
GPIO_PortToggle(GPIO5, 1u << 6);

// Nordic
nrf_gpio_pin_set(LED_PIN);
```

같은 *LED toggle*이지만 *완전 다른 API*. application이 *이 모두 알아야* → 이식 불가.

**HAL** (Hardware Abstraction Layer)이 *통일된 interface* 제공:

```cpp
// Generic HAL
hal::Led::set();

// 내부적으로 보드별 분기 — application은 모름
```

이 글이 *시리즈의 마지막*. *전체 패턴 정리* + *HAL 설계*.

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

장점:
- *Application 코드가 IGpio 인터페이스만*
- *Vendor 변경 = StmGpio → NxpGpio*
- *테스트에서 MockGpio*

단점:
- *Virtual call overhead* — 작지만 있음
- *vtable + RTTI 비용*

## 패턴 2 — Template-based HAL (Zero-cost)

Virtual 대신 *CRTP*.

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

장점:
- *Zero overhead* — virtual call 없음
- *Compile-time 검증*
- *Inline 가능*

단점:
- *Application도 template* (header에 정의)
- *type 폭증 가능*

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

장점:
- *Compile-time 보드 선택*
- *Application은 그냥 LedGpio 사용*
- *zero overhead*

단점:
- *런타임 보드 변경 불가* (보통 OK)

## 패턴 4 — Mixed (interface + template)

복잡한 시스템에서 *application은 interface*, *driver는 template*.

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

application은 *interface로 polymorphic*. driver는 *최적 구현*.

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

벤더별 *별도 directory*. CMake에서 *조건부 컴파일*.

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

*application 로직 host에서 테스트*. 하드웨어 없이.

## Application 설계 — Dependency Injection

[Part 4-08](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) 적용.

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

*모든 dependency 명시*. *test에서 mock 주입*.

## 임베디드 — Vendor switch 시나리오

같은 application, STM32 → NXP.

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

*HAL implementation만 다름*. application *코드 0 변경*. 이게 *HAL의 목적*.

## 시리즈 마무리 — 40 chapter 정리

이 시리즈가 다룬 핵심.

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

1. **Modern C++의 대부분은 *zero-cost*** — 측정 후 사용.
2. **임베디드 = 끄는 기술** — -fno-exceptions, -fno-rtti, -fno-threadsafe-statics.
3. **정적 할당 우선** — std::array, ETL, pool, placement new.
4. **컴파일 타임으로 옮김** — constexpr, template, CRTP, concepts.
5. **명시적 소유권** — unique_ptr (기본), shared_ptr (드물게), raw pointer (non-owning).
6. **DI > Singleton** — main에서 wiring.
7. **HAL로 vendor 격리** — application 포터블.

## 다음 시리즈 추천

이 시리즈가 *Modern C++ in Embedded*를 다뤘다면, 다음은:

- **[Embedded Performance Engineering](/blog/embedded/performance-engineering)** — 측정과 최적화 (50 chapters)
- **[Practical RTOS Internals](/blog/embedded/rtos/practical-internals)** — FreeRTOS/Zephyr/RT-Thread 소스 분석 (45 chapters)
- **[Modern Embedded Recipes](/blog/embedded/modern-recipes)** — 일상 recipe 모음 (145 recipes)
- **[Refactoring Catalog](/blog/programming/design/refactoring-catalog/pattern01-extract-function)** — Fowler 61 패턴
- **[GoF Design Patterns](/blog/programming/design/gof-design-patterns)** — 23 패턴

## 자주 보는 함정과 안티패턴

### 1. *HAL이 너무 두꺼움*
모든 추상화에 *virtual*. *small MCU에 부담*. Mix or template.

### 2. *Application에 vendor 누출*
```cpp
// application 코드
HAL_GPIO_WritePin(...);   // STM32 직접 호출 — 포터블 깨짐
```
*hal:: namespace로만*.

### 3. *Mock 없음*
host에서 *application 로직 테스트 불가*. *Mock HAL 작성*.

### 4. *Board-specific 헤더 누락*
모든 보드에 *전체 HAL*. *board config 헤더로 분리*.

### 5. *Vendor switch 시나리오 미고려*
처음부터 *벤더 종속 가정* → 나중에 *재작성*. *HAL interface 처음부터*.

### 6. *Performance 측정 안 함*
HAL이 *얼마나 비싼지* 모름. *측정 도구* ([Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)).

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
- [TDD Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface)

## 시리즈 마무리

40 chapter, *5 Part*, *Modern C++의 임베디드 사용*을 *전 범위* 다뤘습니다. 측정 가능한 주장만 사용했고, 끄는 기술과 켜는 기술의 *균형*을 강조했습니다.

C++가 *임베디드에서 안전하게 강력*하다는 사실을 *증명*하는 것이 시리즈의 목표였습니다. *RAII, constexpr, templates, concepts, std::expected, std::variant* 같은 도구가 *런타임 비용 없이* *코드 품질*을 끌어올립니다.

C++ 도입을 망설이던 팀에 *증거*가 되기를. 이미 C++를 쓰는 팀에 *더 깊은 활용*이 되기를. 처음 임베디드를 만나는 *Modern C++ 개발자*에게는 *낯선 영역의 지도*가 되기를.

읽어 주셔서 감사합니다.
