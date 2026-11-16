---
title: "임베디드 HAL 설계 패턴 — Static·Dynamic·Hybrid 비교"
slug: "embedded/embedded-cpp/part5-04-hal-design-patterns"
date: 2026-05-02T09:40:00
description: "범용 HAL 구조 — 벤더 종속성 격리, 다중 보드/MCU 지원, 시리즈 마무리."
series: "Embedded C++ for Real Systems"
seriesOrder: 40
tags: [cpp, embedded, hal, abstraction, portability, board-support]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"HAL은 application과 hardware 사이의 통역입니다."** 벤더별 설정과 호출을 adapter 뒤에 모아 application 변경 범위를 줄입니다.

## 어떤 문제를 푸는가

벤더 HAL(STM32 HAL, NXP MCUXpresso, Nordic SDK)은 벤더에 종속됩니다. application이 이 함수를 직접 부르면, 보드를 바꿀 때 그 호출부를 모두 고쳐야 합니다.

```c
// STM32
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);

// NXP
GPIO_PortToggle(GPIO5, 1u << 6);

// Nordic
nrf_gpio_pin_set(LED_PIN);
```

위 예는 GPIO 출력 조작이며 set과 toggle은 같은 동작이 아닙니다. 이식 시에는 함수 이름뿐 아니라 active level·초기 상태·timing·오류 처리 계약도 맞춰야 합니다. application이 벤더 호출에 직접 의존하면 변경 범위가 커집니다.

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

- 호출마다 vtable을 거칩니다. 아래 [비교](#패턴-2--template-based-hal-정적-dispatch)에서 `blink`의 `set()`·`clear()`가 각각 load 2번과 `blx` 간접 호출이 됐습니다
- 구현 클래스마다 vtable과 객체 안의 vptr이 필요합니다. 아래 측정은 `set()`·`clear()`만 가진 가상 소멸자 없는 interface로 해 vtable이 16바이트였고, 위 `hal::IGpio`(가상 소멸자 + 네 함수)라면 더 큽니다. virtual 호출 자체가 RTTI를 요구하지는 않으며, 아래 `hal-check.cpp`도 `-fno-rtti`로 빌드했습니다.

## 패턴 2 — Template-based HAL (정적 dispatch)

여기서는 CRTP로 공통 forwarding을 표현합니다. 단순 generic 함수는 CRTP 상속 없이도 작성할 수 있습니다.

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
blink(led);   // 컴파일 타임 dispatch
```

두 방식의 `blink`를 arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -mthumb -Os -fno-rtti`로 컴파일해 비교했습니다. `sleep_ms`는 외부 함수로 두고, `StmGpio`는 BSRR에 직접 쓰는 구현을 채웠습니다.

| | `blink` 크기 | `set()`·`clear()` 호출 | 별도 코드·데이터 |
| --- | ---: | --- | --- |
| `IGpio&` (패턴 1) | 38 B | vtable load 2번 + `blx r3` 각각 | `VGpio::set`·`clear` 12·16 B, vtable 16 B |
| `StmGpio<0x40020000, 5>&` (패턴 2) | 40 B | 인라인되어 BSRR `str` 하나씩 | 없음 |

template 쪽 `blink` 본문이 약간 큰 것은 BSRR 주소를 literal pool에 두었기 때문이고, 대신 별도의 `set`/`clear` 함수와 vtable이 없습니다.

장점은 다음과 같습니다.

- 가상 dispatch가 없고, 위 측정처럼 구현이 호출자에 인라인됩니다
- Compile-time 검증이 가능합니다

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
    LedGpio led;
    led.set();
    sleep_ms(500);
    led.clear();
    sleep_ms(500);
}
```

장점은 다음과 같습니다.

- Compile-time에 보드를 선택합니다
- Application은 `LedGpio` 객체의 인스턴스 메서드를 씁니다
- alias 자체는 런타임 상태를 추가하지 않습니다. 구현 메서드 비용은 별도입니다

단점은 다음과 같습니다.

- 런타임에 보드를 변경할 수 없습니다. 보드마다 다른 firmware 이미지를 빌드하는 경우라면 문제가 되지 않습니다

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
else()
    message(FATAL_ERROR "Unsupported BOARD: ${BOARD}")
endif()

target_compile_definitions(${TARGET} PRIVATE BOARD_HEADER="${BOARD_HEADER}")
```

## 작은 예제 — Static·Dynamic·Hybrid의 같은 관찰 계약

호스트 fake 출력이 두 번의 set/clear 순서를 기록합니다. virtual DI, template 호출, template adapter를 virtual interface로 사용하는 hybrid를 같은 기대 관찰로 비교합니다. delay와 보드 I/O를 제외하므로 이 결과는 파형·시간·Flash 사용량의 비교가 아닙니다.

```cpp title="hal-check.cpp"
#include <array>
#include <cassert>
struct History {
    std::array<bool,4> values{}; unsigned size=0;
    void push(bool v) { assert(size<values.size()); values[size++]=v; }
};
struct IGpio {
    virtual ~IGpio() = default;
    virtual void set() = 0; virtual void clear() = 0;
};
struct Mock : IGpio {
    History history;
    void set() override { history.push(true); }
    void clear() override { history.push(false); }
};
template<class Backend> struct Adapter : IGpio {
    Backend& backend; explicit Adapter(Backend& b):backend(b) {}
    void set() override { backend.set(); }
    void clear() override { backend.clear(); }
};
template<class Pin> void blink_twice(Pin& p) {
    for(int i=0;i<2;++i) { p.set(); p.clear(); }
}
void dynamic_blink(IGpio& p) { blink_twice(p); }
struct StaticPin {
    History history;
    void set() { history.push(true); }
    void clear() { history.push(false); }
};
void check(const History& h) {
    assert(h.size==4 && h.values[0] && !h.values[1] && h.values[2] && !h.values[3]);
}
int main() {
    Mock dynamic; dynamic_blink(dynamic); check(dynamic.history);
    StaticPin direct; blink_twice(direct); check(direct.history);
    StaticPin backend; Adapter<StaticPin> hybrid(backend);
    dynamic_blink(hybrid); check(backend.history);
#ifdef BAD_STATIC
    StaticPin::set();
#endif
}
```

Homebrew Clang 23.1.5와 g++-16, arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors -fno-rtti hal-check.cpp -o hal-check && ./hal-check`가 exit 0으로 세 방식의 동일한 출력 순서를 통과했습니다. `-DBAD_STATIC`은 g++-16에서 `error: cannot call member function 'void StaticPin::set()' without object`로 실패합니다. alias는 원래 메서드를 static으로 바꾸지 않습니다.

## Application 설계 — Dependency Injection

위 hybrid 예제는 board에서 만든 backend를 adapter에 주입하고 application은 IGpio 참조를 받습니다. mock의 history는 hardware 효과와 별개로 application 호출 순서를 검증합니다. 실제 프로젝트에서는 UART·SPI도 각자의 전송 결과·timeout·버퍼 소유권 계약을 완성한 인터페이스로 주입합니다. 존재하지 않는 send_string이나 초기화되지 않은 SPI 객체를 가정하지 않습니다.

벤더를 바꿀 때 GPIO high가 실제 LED on인지, DMA 완료가 wire 완료인지, blocking 호출의 timeout 단위가 같은지까지 확인해야 합니다. 타입 이름만 바꾸는 것으로 이 계약이 자동으로 같아지지는 않습니다. [Core Guidelines I.25](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#i25-prefer-empty-abstract-classes-as-interfaces-to-class-hierarchies)는 상태가 없는 추상 클래스를 인터페이스로 두는 원칙을 설명합니다.

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

1. **추가 비용은 측정합니다** — 언어 기능별 계약을 이해하고 같은 기능의 코드를 비교합니다
2. **런타임 기능은 요구에 맞춰 선택합니다** — 예외·RTTI·local static 동기화를 끄기 전에 프로그램과 라이브러리의 전제를 확인합니다
3. **정적 할당을 우선합니다** — `std::array`, ETL, pool, placement new
4. **컴파일 타임으로 옮깁니다** — `constexpr`, template, CRTP, concepts
5. **소유권을 명시합니다** — `unique_ptr`이 기본, `shared_ptr`은 드물게, raw pointer는 non-owning에만 씁니다
6. **의존성은 주입합니다** — main에서 wiring하고, 진짜 하나뿐인 하드웨어도 interface로 넘깁니다([Part 4-08](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives))
7. **HAL로 vendor를 격리합니다** — application을 portable하게 만듭니다

## 다음 시리즈 추천

이 시리즈가 Modern C++ in Embedded를 다뤘다면 다음으로는 이런 시리즈를 추천합니다.

- **[Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)** — 측정과 최적화
- **[Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface)** — FreeRTOS/Zephyr/RT-Thread 소스 분석
- **[Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface)** — 일상 recipe 모음

## 자주 보는 함정과 안티패턴

### 1. HAL이 너무 두꺼움

모든 추상화에 virtual을 두면 구현 클래스마다 vtable과 out-of-line 함수가 생기고 호출마다 간접 분기가 남습니다(위 측정). 교체가 런타임에 필요 없는 driver는 template으로, application 경계만 interface로 두는 패턴 4를 씁니다.

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

application이 벤더 호출을 직접 쓰기 시작하면, 벤더를 바꿀 때 그 호출부를 모두 찾아 고쳐야 합니다. 함정 2의 `hal::` 경계를 처음부터 둡니다.

### 6. Performance 측정 안 함

HAL의 비용은 위 표처럼 `nm -S`와 디스어셈블리로 바로 보입니다. 설계를 고를 때 같은 표를 프로젝트 코드로 만듭니다([Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)).

## 정리

- HAL은 application과 vendor 사이의 통역 계층입니다.
- 여기서는 Interface(virtual), Template, alias 기반 board 선택, Hybrid를 구분했습니다.
- Board-specific 헤더로 type alias를 통일합니다.
- Mock HAL을 두면 host에서 테스트할 수 있습니다.
- DI로 dependency wiring을 명시합니다.

## 관련 항목

- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction)
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction)
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)
- [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives)

## 시리즈 마무리

40 chapter, 5 Part로 Modern C++의 임베디드 사용을 전 범위에서 다뤘습니다. 각 기능의 언어 계약과 실제 대상에서 측정해야 할 비용을 구분했습니다.

C++가 임베디드에서 안전하게 강력하다는 사실을 증명하는 것이 시리즈의 목표였습니다. RAII, constexpr, templates, concepts, `std::expected`, `std::variant` 같은 도구는 목적에 맞는 계약을 표현하는 선택지이며 메모리·호출·코드 크기 비용은 구현과 사용 조건에 따라 확인합니다.

C++ 도입을 망설이던 팀에는 증거가 되기를, 이미 C++를 쓰는 팀에는 더 깊은 활용이 되기를, 처음 임베디드를 만나는 Modern C++ 개발자에게는 낯선 영역의 지도가 되기를 바랍니다.

읽어 주셔서 감사합니다.
