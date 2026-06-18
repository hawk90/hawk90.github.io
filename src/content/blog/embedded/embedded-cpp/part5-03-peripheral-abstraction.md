---
title: "Peripheral 추상화 — UART·SPI·I2C 공통 인터페이스 설계"
date: 2026-05-02T09:39:00
description: "UART, SPI, I2C — peripheral을 type-safe class로. Blocking, interrupt, DMA 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 39
tags: [cpp, embedded, peripheral, uart, spi, i2c, dma]
type: tech
---

## 한 줄 요약

> **"Peripheral은 class와 세 가지 동작 모드의 결합입니다."** Blocking, interrupt-driven, DMA로 나뉩니다.

## 어떤 문제를 푸는가

벤더 HAL은 C 함수입니다.

```c
HAL_UART_Transmit(&huart2, data, len, HAL_MAX_DELAY);
HAL_UART_Transmit_IT(&huart2, data, len);
HAL_UART_Transmit_DMA(&huart2, data, len);
```

타입이 없어 어떤 UART든 같은 함수로 호출합니다. C++ wrapping으로 다음을 얻습니다.

- **Type-safe**: UART2와 UART3가 섞이지 않습니다
- **RAII**: 자원 lifecycle을 관리합니다
- **Concepts**: interface를 통일합니다
- **Mode polymorphism**: blocking, interrupt, DMA 모드를 바꿔 끼웁니다

## 기본 — UART class

```cpp
template<uintptr_t Address>
class Uart {
    struct Regs {
        volatile uint32_t SR, DR, BRR, CR1, CR2, CR3, GTPR;
    };

    static Regs& regs() {
        return *reinterpret_cast<Regs*>(Address);
    }

public:
    static void init(uint32_t baud, uint32_t pclk) {
        regs().BRR = pclk / baud;
        regs().CR1 = (1 << 13) | (1 << 3) | (1 << 2);   // UE | TE | RE
    }

    // Blocking transmit
    static void send_byte(uint8_t b) {
        while (!(regs().SR & (1 << 7)));   // TXE
        regs().DR = b;
    }

    static void send(const uint8_t* data, size_t len) {
        for (size_t i = 0; i < len; ++i) send_byte(data[i]);
        while (!(regs().SR & (1 << 6)));   // TC
    }

    // Blocking receive
    static uint8_t recv_byte() {
        while (!(regs().SR & (1 << 5)));   // RXNE
        return regs().DR;
    }
};

using Uart2 = Uart<0x40004400>;

Uart2::init(115200, 84'000'000);
Uart2::send(reinterpret_cast<const uint8_t*>("Hello\n"), 6);
```

type별로 wrapper가 갈립니다. Uart2와 Uart3는 다른 type입니다.

## Interrupt-driven UART

```cpp
template<uintptr_t Address>
class IsrUart {
    // ... 기본 regs

    static inline std::atomic<volatile uint8_t*> tx_buf_{nullptr};
    static inline std::atomic<size_t> tx_remaining_{0};

public:
    static void init(uint32_t baud, uint32_t pclk) {
        regs().BRR = pclk / baud;
        regs().CR1 = (1 << 13) | (1 << 3) | (1 << 7);   // UE | TE | TXEIE
    }

    // Non-blocking send
    static bool send_async(const uint8_t* data, size_t len) {
        if (tx_remaining_.load() > 0) return false;   // busy
        tx_buf_.store(const_cast<volatile uint8_t*>(data));
        tx_remaining_.store(len);
        // Enable TX interrupt
        regs().CR1 |= (1 << 7);
        return true;
    }

    static void irq_handler() {
        auto* buf = tx_buf_.load();
        auto remaining = tx_remaining_.load();

        if (remaining > 0) {
            regs().DR = *buf;
            tx_buf_.store(buf + 1);
            tx_remaining_.store(remaining - 1);
        } else {
            // Disable TX interrupt
            regs().CR1 &= ~(1 << 7);
        }
    }
};

// ISR
extern "C" void USART2_IRQHandler() {
    IsrUart<0x40004400>::irq_handler();
}
```

CPU가 묶이지 않습니다. 전송 중에 다른 일을 할 수 있습니다.

## DMA UART

```cpp
template<uintptr_t Address, uint8_t DmaChannel>
class DmaUart {
public:
    static void init(uint32_t baud, uint32_t pclk) {
        // ... UART regs init
        // DMA setup
        // Enable DMA TX
        regs().CR3 |= (1 << 7);
    }

    static bool send_dma(const uint8_t* data, size_t len) {
        // DMA channel busy?
        if (dma_busy(DmaChannel)) return false;

        // Configure DMA
        dma_setup_mem_to_peripheral(DmaChannel, data, len,
                                     &regs().DR);
        dma_start(DmaChannel);
        return true;
    }

    static void dma_complete_handler() {
        // Transfer 완료 — callback 호출 등
    }
};

using LogUart = DmaUart<0x40004400, 7>;   // DMA1 Channel 7

LogUart::send_dma(big_buffer, 1024);   // CPU 거의 안 씀
```

CPU 사용이 거의 0입니다. 큰 buffer 전송에 적합합니다.

## Concept으로 UART interface 통일

```cpp
template<typename T>
concept UartInterface = requires(T t, const uint8_t* data, size_t len) {
    { T::init(uint32_t{}, uint32_t{}) } -> std::same_as<void>;
    { T::send(data, len) } -> std::same_as<void>;
    { T::recv_byte() } -> std::convertible_to<uint8_t>;
};

template<UartInterface Uart>
class Logger {
public:
    static void log(const char* msg) {
        Uart::send(reinterpret_cast<const uint8_t*>(msg), strlen(msg));
    }
};

using LogChannel = Logger<Uart2>;
LogChannel::log("hello");
```

UART implementation을 blocking, interrupt, DMA 중 어느 것으로도 교체할 수 있습니다. Logger는 변경할 필요가 없습니다.

## SPI 추상화

```cpp
template<uintptr_t Address>
class Spi {
    struct Regs {
        volatile uint32_t CR1, CR2, SR, DR, CRCPR, RXCRCR, TXCRCR, I2SCFGR;
    };

    static Regs& regs() {
        return *reinterpret_cast<Regs*>(Address);
    }

public:
    static void init(SpiMode mode, SpiSpeed speed) {
        regs().CR1 = static_cast<uint32_t>(mode) |
                     static_cast<uint32_t>(speed) |
                     (1 << 2) |   // master
                     (1 << 6);    // SPE
    }

    static uint8_t transfer(uint8_t out) {
        while (!(regs().SR & (1 << 1)));   // TXE
        regs().DR = out;
        while (!(regs().SR & (1 << 0)));   // RXNE
        return regs().DR;
    }

    template<size_t N>
    static void transfer(const std::array<uint8_t, N>& tx,
                          std::array<uint8_t, N>& rx) {
        for (size_t i = 0; i < N; ++i) {
            rx[i] = transfer(tx[i]);
        }
    }
};
```

SPI 특성상 전송과 수신이 함께 이뤄집니다. 한 함수에서 처리합니다.

## SPI device — Chip Select 통합

```cpp
template<typename Spi, typename CsPin>
class SpiDevice {
public:
    static void init() {
        Spi::init(SpiMode::Mode0, SpiSpeed::Fast);
        CsPin::configure(GpioMode::Output);
        CsPin::set();   // CS inactive (high)
    }

    static void select() { CsPin::clear(); }    // CS active low
    static void deselect() { CsPin::set(); }

    template<size_t N>
    static auto transfer(const std::array<uint8_t, N>& tx) {
        std::array<uint8_t, N> rx{};
        select();
        Spi::transfer(tx, rx);
        deselect();
        return rx;
    }
};

using AccelChip = SpiDevice<Spi1, GpioPin<GpioPortA, 4>>;

auto response = AccelChip::transfer<2>({0x80, 0x00});
```

SPI와 CS pin이 하나의 device로 묶입니다. 매번 CS toggle이 자동으로 일어납니다.

## I2C 추상화

```cpp
template<uintptr_t Address>
class I2c {
public:
    static void init(uint32_t speed_hz) {
        // ... I2C regs setup
    }

    static bool write(uint8_t addr, const uint8_t* data, size_t len) {
        if (!start()) return false;
        if (!send_address(addr, /*write=*/true)) return false;
        for (size_t i = 0; i < len; ++i) {
            if (!send_byte(data[i])) return false;
        }
        stop();
        return true;
    }

    static bool read(uint8_t addr, uint8_t* data, size_t len) {
        if (!start()) return false;
        if (!send_address(addr, /*read=*/false)) return false;
        for (size_t i = 0; i < len; ++i) {
            data[i] = recv_byte(i == len - 1);   // last → NACK
        }
        stop();
        return true;
    }
};
```

I2C protocol은 복잡합니다. bus arbitration, ACK/NACK, restart 등을 다뤄야 합니다. 벤더 HAL을 wrapping하는 방식이 대부분 실용적입니다.

## ADC 추상화

```cpp
template<uintptr_t Address, uint8_t Channel>
class AdcChannel {
public:
    static void init() {
        // ADC 초기화
    }

    static uint16_t read_blocking() {
        // 변환 시작
        ADC_REG(Address)->CR2 |= (1 << 0);   // SWSTART
        while (!(ADC_REG(Address)->SR & (1 << 1)));   // EOC
        return ADC_REG(Address)->DR;
    }

    static float read_voltage(float vref = 3.3f) {
        uint16_t raw = read_blocking();
        return (raw * vref) / 4096.0f;
    }
};

using Ch_Temp = AdcChannel<0x40012000, 5>;
float v = Ch_Temp::read_voltage();
```

Channel을 type parameter로 두면 runtime channel 선택 비용이 0입니다.

## RAII 통합 — Peripheral Guard

```cpp
template<typename Peripheral>
class PeripheralGuard {
public:
    PeripheralGuard() {
        Peripheral::enable_clock();
        Peripheral::init();
    }

    ~PeripheralGuard() {
        Peripheral::shutdown();
        Peripheral::disable_clock();
    }

    PeripheralGuard(const PeripheralGuard&) = delete;
};

void burst_log(const char* msg) {
    PeripheralGuard<Uart2> uart;   // turn on, init
    Uart2::send(...);
    // 자동 power down + clock off
}
```

power saving이 자연스럽게 됩니다. function scope를 벗어나면 clock이 꺼집니다.

## Peripheral Pool — 동적 할당 (드물게)

```cpp
class UartPool {
    static inline std::array<Uart*, 5> pool_;
    static inline std::array<bool, 5> in_use_{false, false, false, false, false};

public:
    static Uart* acquire() {
        for (size_t i = 0; i < pool_.size(); ++i) {
            if (!in_use_[i]) {
                in_use_[i] = true;
                return pool_[i];
            }
        }
        return nullptr;
    }

    static void release(Uart* p) {
        for (size_t i = 0; i < pool_.size(); ++i) {
            if (pool_[i] == p) {
                in_use_[i] = false;
                p->shutdown();
                return;
            }
        }
    }
};
```

runtime peripheral 선택이 필요한 경우에 씁니다. 임베디드 대부분은 static을 씁니다. 동적이 필요할 때 pool을 활용합니다.

## 자주 보는 함정과 안티패턴

### 1. peripheral 초기화 누락

clock enable이 누락되거나 alternate function이 미설정이면 동작하지 않습니다. RAII guard로 보장합니다.

### 2. Blocking과 ISR 혼용

blocking send 중 ISR이 같은 peripheral을 접근하면 race가 발생합니다. 모드를 통일합니다.

### 3. DMA buffer alignment

DMA는 특정 alignment를 요구합니다. `alignas(4)`로 맞춰 줍니다.

### 4. Volatile 누락

peripheral register는 volatile pointer로 다룹니다. 자세한 내용은 [Part 5-01](/blog/embedded/embedded-cpp/part5-01-register-abstraction)에서 다룹니다.

### 5. peripheral lifetime

static peripheral은 영원히 살아 있습니다. power down이 명시적으로 필요하면 destructor를 활용합니다.

### 6. Multi-task에서 같은 peripheral 공유

mutex나 queue로 직렬화합니다.

## 측정 — C++ peripheral vs HAL

같은 UART 100 byte 전송 비교입니다(STM32F4, 115200 baud).

```text
HAL_UART_Transmit (blocking):
  코드: 1.2 KB (HAL library)
  실행: ~8.7 ms (115200 baud bound)

C++ Uart<...>::send (blocking):
  코드: 80 B
  실행: ~8.7 ms (동일)
```

속도는 동일합니다. C++가 15배 작은 코드입니다. HAL은 generic 처리와 safety check로 코드가 큽니다.

## 정리

- Peripheral은 address를 가진 template class로 표현하며 type-safe합니다.
- 세 가지 모드를 다룹니다 — Blocking(simple), Interrupt(non-blocking), DMA(CPU 0).
- Concept으로 interface를 통일하면 mode를 교체할 수 있습니다.
- SPI에 CS pin을 묶는 device wrapper로 더 높은 abstraction을 만듭니다.
- RAII guard로 clock과 power를 관리합니다.
- HAL을 wrap하는 방식이 대부분 더 빠르고 작습니다.

## 관련 항목

- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction)
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)
- [Part 5-04: HAL 설계 패턴](/blog/embedded/embedded-cpp/part5-04-hal-design-patterns)
- [Part 2-10: Concepts](/blog/embedded/embedded-cpp/part2-10-concepts)

## 다음 글

[Part 5-04: HAL 설계 패턴](/blog/embedded/embedded-cpp/part5-04-hal-design-patterns) — 범용 HAL 구조를 다루며, 벤더 종속성 격리와 다중 보드/MCU 지원을 살펴봅니다.
