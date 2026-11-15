---
title: "MMIO Register 추상화 — 타입 안전한 비트 필드 접근"
slug: "embedded/embedded-cpp/part5-01-register-abstraction"
date: 2026-05-02T09:37:00
description: "MMIO를 type-safe하게 — volatile, bit field, register wrapper class."
series: "Embedded C++ for Real Systems"
seriesOrder: 37
tags: [cpp, embedded, register, mmio, volatile, type-safe, hardware]
type: tech
topics: ["embedded"]
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

주소가 타입의 일부가 되지만 값은 여전히 uint32_t이므로 잘못된 비트 의미까지 검사하지는 못합니다. 인라인과 매크로 대비 명령 수는 실제 대상 컴파일 결과로 확인합니다. 아래의 일반 RMW wrapper는 부작용 없는 read/write 레지스터에만 사용합니다.

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

이처럼 서로 다른 문장의 volatile 접근을 구현이 관찰 가능한 접근으로 취급하게 합니다. 그러나 volatile은 스레드 간 동기화·atomic RMW·CPU 메모리 배리어를 제공하지 않으며, 일반 RAM 쓰기와 DMA 시작의 순서를 보장하지도 않습니다. 접근 폭·정렬·메모리 속성은 CPU와 주변장치 계약에 따릅니다. [GCC volatile 문서](https://gcc.gnu.org/onlinedocs/gcc/Volatiles.html)는 일반 메모리 접근과의 순서 한계를 설명합니다.

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

각 register 주소가 별도 type을 가지지만 둘 다 write(uint32_t)를 제공하므로 잘못된 값을 주는 실수까지 막지는 않습니다. BSRR처럼 명령용 쓰기 레지스터에는 write만 노출하고, W1C나 read-to-clear 레지스터에는 이 RMW API를 제공하지 않는 별도 정책이 필요합니다.

## Bit field — 명명된 비트

32-bit MMIO 레지스터는 보통 여러 비트 필드로 쪼개져 있습니다. 예를 들어 STM32의 USART\_CR1은 다음처럼 enable 비트, mode 비트, parity 비트 등이 한 워드에 모여 있습니다.

아래는 STM32F407xx의 CR1 일부입니다. 다른 STM32 계열에 그대로 적용하지 않습니다.

| 필드 | 비트 |
| --- | ---: |
| UE | 13 |
| M | 12 |
| PCE | 10 |
| TXEIE | 7 |
| RXNEIE | 5 |
| TE | 3 |
| RE | 2 |

매직 넘버 대신 *타입으로 명명된 비트*를 두면 컴파일러가 검사하고 가독성이 살아납니다.

```cpp
template<int Bit>
struct BitField {
    static_assert(Bit >= 0 && Bit < 32, "bit out of range");
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
    // 설명용 fragment: Field와 pin이 같은 필드를 가리켜야 함
    // 아래 단일 Pin template 방식으로 중복 인자를 제거하는 편이 안전
    if (pin < 0 || pin >= 16) return;
    constexpr uint32_t mask = Field::mask;
    constexpr uint32_t output = 0b01;   // output mode
    Reg32<0x40020000>::modify(mask, output << (pin * 2));
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

using GPIOA_MODER = Reg32<0x40020000>;
template<int Pin>
void set_mode(GpioMode mode) {
    static_assert(Pin >= 0 && Pin < 16, "pin out of range");
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
        if (pin < 0 || pin >= 16) return;
        uint32_t v = regs_->MODER;
        v &= ~(0b11u << (pin * 2));
        v |= static_cast<uint32_t>(mode) << (pin * 2);
        regs_->MODER = v;
    }

    void set_pin(int pin)   { if (pin >= 0 && pin < 16) regs_->BSRR = 1u << pin; }
    void clear_pin(int pin) { if (pin >= 0 && pin < 16) regs_->BSRR = 1u << (pin + 16); }
    bool read_pin(int pin) const { return pin >= 0 && pin < 16 && ((regs_->IDR >> pin) & 1); }
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
        static_assert(Pin >= 0 && Pin < 16, "pin out of range");
        constexpr uint32_t shift = Pin * 2;
        constexpr uint32_t mask = 0b11u << shift;
        uint32_t v = regs().MODER;
        v = (v & ~mask) | (static_cast<uint32_t>(mode) << shift);
        regs().MODER = v;
    }

    template<int Pin>
    static void set_pin() {
        static_assert(Pin >= 0 && Pin < 16, "pin out of range");
        regs().BSRR = 1u << Pin;
    }

    template<int Pin>
    static void clear_pin() {
        static_assert(Pin >= 0 && Pin < 16, "pin out of range");
        regs().BSRR = 1u << (Pin + 16);
    }
};

using GpioA = GpioPort<0x40020000>;
using GpioB = GpioPort<0x40020400>;

GpioA::set_mode<5>(GpioMode::Output);
GpioA::set_pin<5>();
GpioA::clear_pin<5>();
```

Address와 Pin이 모두 template parameter로 들어가 완전히 컴파일 타임에 처리됩니다. 다음은 명령 형태 설명용 예시이며 실제 빌드 출력은 아닙니다.

```text
GpioA::set_pin<5>:
    ldr     r3, =0x40020018
    movs    r2, #32     ; 1 << 5
    str     r2, [r3]
    bx      lr
```

별도 객체 상태가 필요 없는 구현입니다. 크기·호출 비용은 대상 도구로 확인하고, 실제 MMIO 주소의 유효성은 타입만으로 증명하지 않습니다.

## 임베디드 — UART register 추상화

USART2를 같은 레지스터 wrapper로 표현할 수 있지만 baud는 코어 클록이 아닌 실제 peripheral clock으로 계산해야 합니다. OVER8 설정과 반올림, RCC·핀 mux 준비, TXE/TC 대기 및 timeout이 필요합니다. 전송 방식과 수명 계약은 [Part 5-03](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction)에서 구분합니다.

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

RAII로 clock과 peripheral을 관리하려면 획득 성공·독점 소유·전송 완료/취소 계약이 먼저 필요합니다. 존재하지 않는 shutdown/send_string 함수를 붙인 guard 예제는 완전한 UART 구현이 아닙니다. 실제 보드에서 TC 확인과 timeout 없이 clock을 끄지 않으며 공유 자원이라면 이전 상태를 보존합니다([RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)).

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

접근 폭·정렬이 장치 계약과 다르면 fault가 발생하거나 값이 잘못될 수 있습니다. 64비트 레지스터의 두 32비트 접근이 허용되는 장치도 있으므로 항상 fault라고 일반화하지 않습니다. 장치 매뉴얼이 요구하는 폭과 순서를 사용합니다.

## 작은 예제 — RMW와 쓰기 전용 명령 구분

호스트 fake는 읽기·쓰기 횟수와 값만 관찰합니다. 실제 STM32 레지스터 주소를 호스트에서 역참조하지 않습니다.

```cpp title="register-check.cpp"
#include <cassert>
#include <cstdint>
struct Fake {
    static inline std::uint32_t value=0, last=0;
    static inline int reads=0, writes=0;
    static std::uint32_t read() { ++reads; return value; }
    static void write(std::uint32_t v) { ++writes; last=v; value=v; }
};
template<class Bus> struct ReadWrite {
    static void modify(std::uint32_t clear, std::uint32_t set) {
        Bus::write((Bus::read() & ~clear) | set);
    }
};
template<class Bus> struct Command {
    static void write(std::uint32_t value) { Bus::write(value); }
};
int main() {
    Fake::value=0xa5;
    ReadWrite<Fake>::modify(0x0f,0x02);
    assert(Fake::value==0xa2 && Fake::reads==1 && Fake::writes==1);
    Command<Fake>::write(1u<<5);
    assert(Fake::reads==1 && Fake::last==32 && Fake::writes==2);
#ifdef BAD_READ
    Command<Fake>::read();
#endif
}
```

Clang 23.1.3 arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors register-check.cpp -o register-check && ./register-check`로 확인했습니다. `-DBAD_READ`는 쓰기 전용 타입에 read가 없어 컴파일 실패합니다. W1C/read-to-clear의 실제 하드웨어 부작용은 이 fake의 검증 범위가 아닙니다.

[ST CMSIS STM32F407xx v2.6.10 헤더](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.10/Include/stm32f407xx.h)를 주소·구조체·CR1 비트의 기준으로 삼았습니다. 실제 사용에서는 보드 매뉴얼과 reference manual의 접근 속성도 확인해야 합니다.

## 정리

- Memory-mapped register는 volatile과 typed pointer의 결합으로 표현합니다.
- 템플릿으로 Address와 Pin을 고정해 직접 접근을 표현할 수 있으며 비용은 생성된 코드로 확인합니다.
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
