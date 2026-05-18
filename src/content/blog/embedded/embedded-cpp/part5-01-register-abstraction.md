---
title: "Part 5-01: Register 추상화"
date: 2026-05-17T01:00:00
description: "MMIO를 type-safe하게 — volatile, bit field, register wrapper class."
series: "Embedded C++ for Real Systems"
seriesOrder: 37
tags: [cpp, embedded, register, mmio, volatile, type-safe, hardware]
type: tech
---

## 한 줄 요약

> **"Register는 typed pointer와 bit operation의 결합입니다."** magic number 매크로 대신 type-safe wrapper를 씁니다.

## 어떤 문제를 푸는가

전통적인 C 매크로 방식입니다.

```c
#define GPIOA_ODR (*(volatile uint32_t*)0x40020014)
#define GPIO_PIN_5 (1 << 5)

GPIOA_ODR |= GPIO_PIN_5;
```

문제는 다음과 같습니다.

- magic number만 있고 type 정보가 없습니다
- wrong register에 wrong value를 쓸 수 있습니다
- 디버거에서 의미를 알 수 없습니다
- pin과 register 매칭이 보이지 않습니다

C++ type abstraction은 다음과 같습니다.

```cpp
template<uintptr_t Address>
struct Register {
    static volatile uint32_t& ref() {
        return *reinterpret_cast<volatile uint32_t*>(Address);
    }
    static void set(uint32_t mask) { ref() |= mask; }
    static void clear(uint32_t mask) { ref() &= ~mask; }
    static uint32_t read() { return ref(); }
};

using GpioA_ODR = Register<0x40020014>;
GpioA_ODR::set(1 << 5);
```

컴파일러가 인라인해 매크로와 동일한 어셈블리가 나옵니다. type-safe하고 디버깅도 가능합니다.

## volatile의 필수

memory-mapped register는 컴파일러 최적화를 회피해야 합니다.

```cpp
// 잘못 — volatile 없음
uint32_t* reg = reinterpret_cast<uint32_t*>(0x40020014);
*reg = 0xFF;
*reg = 0xFF;   // 컴파일러가 중복 제거 — 단 한 번만 실행

// 올바름 — volatile
volatile uint32_t* reg = reinterpret_cast<volatile uint32_t*>(0x40020014);
*reg = 0xFF;
*reg = 0xFF;   // 두 번 모두 실행 (hardware sequencing 필요)
```

`volatile`은 매 access를 강제합니다. peripheral과의 정확한 통신에 필수입니다.

## 단순 wrapper

```cpp
template<uintptr_t Address>
class Reg32 {
public:
    static void write(uint32_t value) {
        ptr() = value;
    }

    static uint32_t read() {
        return ptr();
    }

    static void set_bits(uint32_t mask) {
        ptr() |= mask;
    }

    static void clear_bits(uint32_t mask) {
        ptr() &= ~mask;
    }

    static void modify(uint32_t clear_mask, uint32_t set_mask) {
        uint32_t v = ptr();
        v = (v & ~clear_mask) | set_mask;
        ptr() = v;
    }

    static bool is_set(uint32_t mask) {
        return (ptr() & mask) != 0;
    }

private:
    static volatile uint32_t& ptr() {
        return *reinterpret_cast<volatile uint32_t*>(Address);
    }
};

using GPIOA_ODR = Reg32<0x40020014>;
using GPIOA_BSRR = Reg32<0x40020018>;
using USART2_DR = Reg32<0x40004404>;

GPIOA_ODR::set_bits(1 << 5);   // Pin 5 high
GPIOA_BSRR::write(1 << 5);     // Atomic set (HW supported)
```

각 register가 별도 type을 갖습니다. 서로 섞이지 않습니다.

## Bit field — 명명된 비트

32-bit MMIO 레지스터는 보통 여러 비트 필드로 쪼개져 있습니다. 예를 들어 STM32의 USART\_CR1은 다음처럼 enable 비트, mode 비트, parity 비트 등이 한 워드에 모여 있습니다.

![USART_CR1 32-bit register — bit field 레이아웃](/images/blog/embedded-cpp/diagrams/part5-01-mmio-bitfield.svg)

매직 넘버 대신 *타입으로 명명된 비트*를 두면 컴파일러가 검사하고 가독성이 살아납니다.

```cpp
template<int Bit>
struct BitField {
    static constexpr uint32_t mask = 1u << Bit;
};

namespace gpio_moder {
    struct Mode0 { static constexpr uint32_t mask = 0b11 << 0; };
    struct Mode1 { static constexpr uint32_t mask = 0b11 << 2; };
    struct Mode2 { static constexpr uint32_t mask = 0b11 << 4; };
    // ...
    struct Mode5 { static constexpr uint32_t mask = 0b11 << 10; };
}

// 사용
template<typename Field>
void set_gpio_mode_output(int pin) {
    constexpr uint32_t mask = Field::mask;
    constexpr uint32_t output = 0b01;   // output mode
    GPIOA_MODER::modify(mask, output << (pin * 2));
}
```

복잡합니다. 각 field에 enum class를 쓰는 편이 더 깔끔합니다.

```cpp
enum class GpioMode : uint32_t {
    Input    = 0b00,
    Output   = 0b01,
    Alt      = 0b10,
    Analog   = 0b11,
};

template<int Pin>
void set_mode(GpioMode mode) {
    constexpr uint32_t shift = Pin * 2;
    constexpr uint32_t clear_mask = 0b11u << shift;
    uint32_t set_mask = static_cast<uint32_t>(mode) << shift;
    GPIOA_MODER::modify(clear_mask, set_mask);
}

set_mode<5>(GpioMode::Output);
```

`Pin`이 컴파일 타임 상수이므로 `shift`도 컴파일 타임에 계산됩니다.

## CMSIS-style — 구조체 매핑

ARM CMSIS의 표준 패턴입니다. struct를 register block에 매핑합니다.

```cpp
struct GpioRegs {
    volatile uint32_t MODER;     // 0x00
    volatile uint32_t OTYPER;    // 0x04
    volatile uint32_t OSPEEDR;   // 0x08
    volatile uint32_t PUPDR;     // 0x0C
    volatile uint32_t IDR;       // 0x10
    volatile uint32_t ODR;       // 0x14
    volatile uint32_t BSRR;      // 0x18
    volatile uint32_t LCKR;      // 0x1C
    volatile uint32_t AFR[2];    // 0x20-0x24
};

static_assert(sizeof(GpioRegs) == 0x28);
static_assert(offsetof(GpioRegs, ODR) == 0x14);

#define GPIOA (reinterpret_cast<GpioRegs*>(0x40020000))
#define GPIOB (reinterpret_cast<GpioRegs*>(0x40020400))

GPIOA->ODR |= 1 << 5;
```

장점은 다음과 같습니다.

- struct member로 register 접근이 명확합니다
- 디버거가 모든 register를 보여줍니다
- offset이 자동으로 계산됩니다

단점은 다음과 같습니다.

- raw pointer와 macro 조합이라 type safety가 약합니다
- 수정 시 wrong register를 건드릴 수 있습니다

## Type-safe peripheral 객체

CMSIS struct를 wrapping합니다.

```cpp
class Gpio {
    GpioRegs* regs_;

public:
    explicit Gpio(GpioRegs* regs) : regs_(regs) {}

    void set_mode(int pin, GpioMode mode) {
        uint32_t v = regs_->MODER;
        v &= ~(0b11u << (pin * 2));
        v |= static_cast<uint32_t>(mode) << (pin * 2);
        regs_->MODER = v;
    }

    void set_pin(int pin)   { regs_->BSRR = 1u << pin; }
    void clear_pin(int pin) { regs_->BSRR = 1u << (pin + 16); }
    bool read_pin(int pin) const { return (regs_->IDR >> pin) & 1; }
};

static Gpio gpio_a(GPIOA);
static Gpio gpio_b(GPIOB);

gpio_a.set_mode(5, GpioMode::Output);
gpio_a.set_pin(5);
```

method 호출이 명확합니다. 디버거에서 step into도 가능합니다.

## Template 기반 register

가장 type-safe하고 zero-cost한 방식입니다.

```cpp
template<uintptr_t Address>
struct GpioPort {
    static constexpr uintptr_t base = Address;

    static GpioRegs& regs() {
        return *reinterpret_cast<GpioRegs*>(base);
    }

    template<int Pin>
    static void set_mode(GpioMode mode) {
        constexpr uint32_t shift = Pin * 2;
        constexpr uint32_t mask = 0b11u << shift;
        uint32_t v = regs().MODER;
        v = (v & ~mask) | (static_cast<uint32_t>(mode) << shift);
        regs().MODER = v;
    }

    template<int Pin>
    static void set_pin() {
        regs().BSRR = 1u << Pin;
    }

    template<int Pin>
    static void clear_pin() {
        regs().BSRR = 1u << (Pin + 16);
    }
};

using GpioA = GpioPort<0x40020000>;
using GpioB = GpioPort<0x40020400>;

GpioA::set_mode<5>(GpioMode::Output);
GpioA::set_pin<5>();
GpioA::clear_pin<5>();
```

Address와 Pin이 모두 template parameter로 들어가 완전히 컴파일 타임에 처리됩니다. 어셈블리 출력은 다음과 같습니다.

```text
GpioA::set_pin<5>:
    ldr     r3, =0x40020018
    movs    r2, #32     ; 1 << 5
    str     r2, [r3]
    bx      lr
```

매크로 출력과 완전히 동일합니다. zero-cost이면서 type-safe하고 IntelliSense도 받을 수 있습니다.

## 임베디드 — UART register 추상화

```cpp
template<uintptr_t Address>
class Uart {
    struct Regs {
        volatile uint32_t SR;
        volatile uint32_t DR;
        volatile uint32_t BRR;
        volatile uint32_t CR1;
        volatile uint32_t CR2;
        volatile uint32_t CR3;
        volatile uint32_t GTPR;
    };

    static Regs& regs() {
        return *reinterpret_cast<Regs*>(Address);
    }

public:
    static void init(uint32_t baud, uint32_t clock_hz) {
        regs().BRR = clock_hz / baud;
        regs().CR1 = (1 << 13) | (1 << 3) | (1 << 2);   // UE | TE | RE
    }

    static void send(uint8_t b) {
        while (!(regs().SR & (1 << 7)));   // TXE
        regs().DR = b;
    }

    static uint8_t receive() {
        while (!(regs().SR & (1 << 5)));   // RXNE
        return regs().DR;
    }
};

using Uart2 = Uart<0x40004400>;

Uart2::init(115200, 168'000'000);
Uart2::send('H');
```

peripheral별로 type이 갈립니다. 각 UART는 별도 인스턴스가 아니라 별도 type입니다.

## Bit operations

C++의 bit operation은 C와 동일하지만 type safety가 더 강합니다.

```cpp
// 옛 C 방식 — magic number
GPIOA->MODER &= ~(0b11 << 10);   // pin 5 clear
GPIOA->MODER |= (0b01 << 10);    // pin 5 output

// type-safe (위 패턴)
GpioA::set_mode<5>(GpioMode::Output);
```

## RAII로 peripheral lifecycle 관리

```cpp
template<typename Uart>
class UartGuard {
public:
    UartGuard() {
        Uart::init(115200, 168'000'000);
    }

    ~UartGuard() {
        Uart::shutdown();   // 자동 power down
    }
};

void burst_log() {
    UartGuard<Uart2> uart;   // turn on
    Uart2::send_string("hello");
    // 자동 power down at function exit
}
```

power saving이 자연스럽게 됩니다. 자세한 내용은 [Part 2-01 RAII](/blog/embedded/embedded-cpp/part2-01-raii-basics)에서 다룹니다.

## 자주 보는 함정과 안티패턴

### 1. volatile 누락

```cpp
uint32_t* reg = (uint32_t*)0x40020014;   // volatile 없음
*reg = 0xFF;   // 컴파일러 최적화로 사라질 수 있음
```

항상 volatile을 붙입니다.

### 2. Bit field struct 사용

```cpp
struct Reg {
    uint32_t bit0 : 1;
    uint32_t bit1 : 1;
    // ...
};
```

ABI에 의존합니다(endian, packing, ordering). portability가 깨집니다. 명시적 비트 마스크를 권장합니다.

### 3. Read-Modify-Write를 atomic으로 가정

```cpp
GPIOA->ODR |= mask;   // RMW — ISR이 끼어들면 race
```

대안은 BSRR을 사용하거나(HW atomic) critical section을 두는 것입니다.

### 4. Magic number 매크로

```cpp
#define GPIO_MODE 0b01
```

enum class를 활용해 type safety를 확보합니다.

### 5. Template parameter overflow

```cpp
GpioA::set_mode<32>(/* */);   // Pin 32? — 컴파일 OK but invalid
```

`static_assert(Pin < 16, "Invalid pin")`을 추가합니다.

### 6. Wrong alignment

64-bit register를 32-bit access하면 bus fault가 납니다. 알맞은 type을 사용합니다.

## 측정 — 매크로 vs Template

같은 GPIO blink 코드 비교입니다.

```text
# C 매크로
GPIOA_ODR |= (1 << 5);
GPIOA_ODR &= ~(1 << 5);

어셈블리: 8 bytes per call

# C++ Template
GpioA::set_pin<5>();
GpioA::clear_pin<5>();

어셈블리: 8 bytes per call (동일)
```

완전히 동일합니다. 다만 C++는 추가로 다음을 얻습니다.

- type safety
- 디버거에서 함수 이름이 보입니다
- IntelliSense를 받을 수 있습니다

## 정리

- Memory-mapped register는 volatile과 typed pointer의 결합으로 표현합니다.
- 템플릿으로 Address와 Pin을 모두 compile-time에 결정하면 zero-cost가 됩니다.
- CMSIS struct를 wrapper class로 감싸는 것이 표준 패턴입니다.
- enum class로 bit value를 type-safe하게 다룹니다.
- RAII로 peripheral lifecycle을 관리합니다.
- Bit field struct는 ABI 위험이 있으므로 명시적 마스크를 권장합니다.

## 관련 항목

- [Part 4-05: Type-safe Flags](/blog/embedded/embedded-cpp/part4-05-type-safe-flags) — bit flag
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction)
- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)

## 다음 글

[Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction) — GPIO pin을 template 기반 type으로 다루며 컴파일 타임 검증을 적용합니다.
