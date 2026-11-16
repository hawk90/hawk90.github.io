---
title: "Peripheral 추상화 — UART·SPI·I2C 공통 인터페이스 설계"
slug: "embedded/embedded-cpp/part5-03-peripheral-abstraction"
date: 2026-05-02T09:39:00
description: "UART, SPI, I2C — peripheral을 type-safe class로. Blocking, interrupt, DMA 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 39
tags: [cpp, embedded, peripheral, uart, spi, i2c, dma]
type: tech
topics: ["embedded"]
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

C HAL도 `UART_HandleTypeDef*`처럼 타입을 가진 handle을 받지만 같은 handle 타입으로 여러 인스턴스를 표현합니다. C++에서는 주소나 인스턴스를 타입 인자로 분리하는 선택지가 있습니다. C++ wrapping으로 다음을 얻습니다.

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

Uart2::init(115200, 42'000'000);   // 예: APB1이 실제 42MHz인 구성
Uart2::send(reinterpret_cast<const uint8_t*>("Hello\n"), 6);
```

이 UART 스케치는 STM32F407식 SR/DR/CR1, OVER8=0을 가정하며 실제 APB1 PCLK를 전달해야 합니다. OVER8=0에서 BRR은 USARTDIV를 1/16 단위로 담으므로 `pclk / baud`가 그대로 BRR 값이 되고, 실제 baud는 `pclk / BRR`입니다. 위 예의 42 MHz·115200에서 정수 나눗셈은 BRR 364(0x16C)로 실제 baud 115,384.6(+0.16%), 반올림하면 365(0x16D)로 115,068.5(−0.11%)입니다. 이 예에서는 반올림 쪽 오차가 작습니다. baud=0·오류와 timeout·RCC/AF 핀 설정은 생략했으므로 완전한 드라이버가 아닙니다. Uart2/Uart3는 주소 인자가 다르면 다른 type이지만 자원 독점이나 초기화 완료까지 보장하지 않습니다.

## Interrupt-driven UART

interrupt 송신에서는 UART interrupt flag와 enable 상태를 확인하고, 새 버퍼 공개와 상태 변경을 하나의 계약으로 직렬화해야 합니다. 두 atomic 변수에 각각 포인터·남은 길이를 저장하는 것만으로 여러 송신자의 검사와 획득을 원자적으로 만들 수는 없습니다.

버퍼를 publish하기 전에 TXE interrupt를 켜거나 마지막 바이트를 DR에 쓴 직후 버퍼 소유권을 반환하면 초기화되지 않은 상태·실제 wire 전송 미완료 문제도 생깁니다. 아래 호스트 예제는 단일 실행 문맥의 queued 상태와 borrowed buffer 수명만 검사합니다. 실제 ISR에서는 critical section 또는 검증된 상태 전이, IRQ flag 처리, release/acquire 정책을 별도로 구현합니다.

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

using LogUart = DmaUart<0x40004400, 4>;   // 예시 요청 channel 값; stream도 별도 선택 필요

LogUart::send_dma(big_buffer, 1024);   // 전송 중 CPU는 설정·완료 처리만
```

이 코드는 DMA adapter의 인터페이스 스케치이며 `dma_*` 함수·stream 선택·error IRQ·cache 처리·완료 통지는 구현하지 않았습니다. STM32F4는 stream과 channel 조합을 선택합니다. ST의 STM32CubeF4 예제(`STM32F4-Discovery/Examples/UART/UART_TwoBoards_ComDMA/Inc/main.h`)가 USART2_TX를 DMA1 Stream 6·Channel 4로 정의하므로(RM0090 DMA1 request mapping 표와 같은 조합), 템플릿 인자에 channel만 두면 stream 선택이 빠집니다. DMA 완료와 UART TC(wire 송신 완료)는 다른 사건이고, 버퍼는 DMA 완료 또는 취소 확인까지 살아 있어야 합니다. 설정·인터럽트·cache 관리 CPU 비용이 0이 되는 것도 아닙니다.

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

이 concept은 위 blocking Uart의 `send`/`recv_byte` 계약에만 맞습니다. `send_async`나 `send_dma`만 제공하는 타입은 만족하지 않습니다. 비동기로 교체하려면 시작 결과·busy·완료/취소·버퍼 수명 계약을 별도 API로 정의하고 Logger도 그 계약을 따라야 합니다.

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
        struct CsGuard { ~CsGuard() { CsPin::set(); } } guard;
        Spi::transfer(tx, rx);
        return rx;
    }
};

using AccelChip = SpiDevice<Spi1, GpioPin<GpioPortA, 4>>;

auto response = AccelChip::transfer<2>({0x80, 0x00});
```

SPI와 CS pin이 하나의 device로 묶입니다. scope 이탈에서 CS를 복원하지만 전송 함수가 실패를 보고하지 않으면 데이터 오류를 알 수 없습니다. 실제 driver는 timeout·OVR·BUSY와 CS setup/hold 시간을 정의해야 합니다. 위 `Spi1`, `GpioPin`은 보드 adapter가 제공해야 하는 설명용 이름입니다.

## I2C 추상화

I2C의 실패 경로에서도 버스 소유권에 맞게 정리해야 합니다. I2C-bus 규격(NXP UM10204)에서 bus를 가진 master는 address NACK나 data NACK를 받으면 STOP(또는 repeated START)으로 전송을 끝냅니다. 반면 arbitration을 잃은 master는 그 순간 bus를 잃은 것이라 STOP을 보내면 안 됩니다.

따라서 adapter에는 START/주소/byte 전송뿐 아니라 현재 bus ownership과 제한 시간, NACK·arbitration lost·bus error 구분이 필요합니다. 아래 실행 예제의 transaction guard는 소유 중일 때만 STOP을 보냅니다. 이는 프로토콜 흐름 검사이며 실제 STM32 I2C ACK/STOP 레지스터 시퀀스를 구현한 것은 아닙니다.

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
        ADC_REG(Address)->CR2 |= (1u << 30);   // STM32F407 SWSTART; bit0은 ADON
        while (!(ADC_REG(Address)->SR & (1 << 1)));   // EOC
        return ADC_REG(Address)->DR;
    }

    static float read_voltage(float vref = 3.3f) {
        uint16_t raw = read_blocking();
        return (raw * vref) / 4096.0f;
    }
};

using ExternalAdc5 = AdcChannel<0x40012000, 5>;
float v = ExternalAdc5::read_voltage();
```

이 스케치의 init은 비어 있으므로 Channel을 sequence와 sample time 레지스터에 반영해야 실제 선택이 이뤄집니다. STM32F407의 SWSTART는 bit30이며 bit0은 ADON입니다. 12비트 변환, EOC 확인, timeout, Vref와 양자화 오차를 대상 보드에서 확인해야 합니다. 위 ADC5는 내부 온도 센서라는 뜻이 아닙니다.

## RAII 통합 — Peripheral Guard

guard가 요구하는 함수 시그니처는 실제 peripheral adapter와 일치해야 합니다. 위 Uart는 init(baud,pclk)를 받으며 enable_clock/shutdown/disable_clock을 제공하지 않으므로 generic guard에 그대로 넣을 수 없습니다.

완전한 adapter를 구현할 때는 초기화 성공 뒤에만 소유권을 얻고, 종료 전에 TC 또는 취소 완료를 확인합니다. 소멸자에서 무제한 대기를 하지 않도록 timeout·오류 기록 경로를 정하고, copy를 금지해 중복 종료를 막습니다.

## Peripheral pool과 runtime 선택

주소 기반 class template의 이름 `Uart`만으로 `Uart*` 배열을 만들 수는 없습니다. runtime에 서로 다른 UART를 같은 풀에서 선택하려면 공통 interface나 type erasure가 필요합니다. pool의 모든 슬롯을 실제 객체로 초기화하고, acquire/release를 동시 접근에서 직렬화하며, 이미 반환된 handle과 실패 획득을 구분합니다. 하드웨어가 고정된 단순 보드는 명시적 소유 객체와 DI부터 검토합니다.

## 자주 보는 함정과 안티패턴

### 1. peripheral 초기화 누락

clock enable이 누락되거나 alternate function이 미설정이면 동작하지 않습니다. RAII guard로 보장합니다.

### 2. Blocking과 ISR 혼용

blocking send 중 ISR이 같은 peripheral을 접근하면 race가 발생합니다. 모드를 통일합니다.

### 3. DMA buffer alignment

DMA의 전송 폭·burst·controller에 따라 정렬 조건이 다릅니다. `alignas(4)` 하나로 모든 DMA를 해결하지 않으며 DMA 접근 가능 RAM·cache line·버퍼 수명도 확인합니다.

### 4. Volatile 누락

peripheral register는 volatile pointer로 다룹니다. 자세한 내용은 [Part 5-01](/blog/embedded/embedded-cpp/part5-01-register-abstraction)에서 다룹니다.

### 5. peripheral lifetime

static peripheral 객체의 소멸자는 `main`이 끝나지 않는 firmware에서는 돌지 않습니다([Part 2-01](/blog/embedded/embedded-cpp/part2-01-raii-basics)). power down이 필요하면 소멸자에 기대지 말고 저전력 진입 경로에서 명시적인 shutdown 함수를 부릅니다.

### 6. Multi-task에서 같은 peripheral 공유

mutex나 queue로 직렬화합니다.

## 작은 예제 — busy·NACK·arbitration 정리

버퍼는 송신 완료를 호출할 때까지 호출자가 보존하며 동시 호출은 외부에서 직렬화한다고 가정합니다. 이 예제의 complete는 fake 상태 전이이고 실제 IRQ·DMA 완료가 아닙니다.

```cpp title="peripheral-check.cpp"
#include <cassert>
#include <cstddef>
#include <cstdint>
struct AsyncTx {
    const std::uint8_t* data=nullptr; std::size_t size=0;
    bool start(const std::uint8_t* p, std::size_t n) {
        if (size || (n && !p)) return false;
        if (!n) return true;
        data=p; size=n; return true;
    }
    void complete() { data=nullptr; size=0; }
};
struct Bus {
    bool owned=false, address_ack=true, lost=false; int stops=0;
    bool start() { owned=true; return true; }
    bool address() { if(lost) owned=false; return address_ack && !lost; }
    void stop() { assert(owned); owned=false; ++stops; }
};
bool transaction(Bus& b) {
    if(!b.start()) return false;
    struct Guard { Bus& b; ~Guard(){ if(b.owned) b.stop(); } } guard{b};
    if(!b.address()) return false;
    return true;
}
int main() {
    AsyncTx tx; std::uint8_t data[]{1,2};
    assert(tx.start(nullptr,0));
    assert(!tx.start(nullptr,2));
    assert(tx.start(data,2));
    assert(!tx.start(data,2)); tx.complete();
    assert(tx.start(data,2)); tx.complete();
    Bus ok; assert(transaction(ok) && ok.stops==1);
    Bus nack; nack.address_ack=false;
    assert(!transaction(nack) && nack.stops==1);
    Bus lost; lost.lost=true;
    assert(!transaction(lost) && lost.stops==0);
}
```

Homebrew Clang 23.1.5와 g++-16, arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors peripheral-check.cpp -o peripheral-check && ./peripheral-check`가 ASan·UBSan으로 exit 0이었습니다. 실제 송신 파형·ISR publication·DMA cache·I2C timing은 실행하지 않았습니다. 참고로 100바이트를 8N1(바이트당 10비트)·115200 baud로 보내는 이상적인 wire 시간은 1000 / 115200 = 8.68ms이며, 드라이버 실행 시간이 아니라 계산값입니다.

레지스터 정의는 [ST CMSIS STM32F407xx v2.6.10](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.10/Include/stm32f407xx.h), 실제 상태·오류 처리는 [ST HAL UART v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_uart.c) 및 [ST HAL I2C v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_i2c.c)를 기준으로 대상 구현을 확인합니다. 이 글의 fake 검사를 실제 HAL의 성능 비교로 해석하지 않습니다.

## 정리

- Peripheral은 address를 가진 template class로 표현하며 type-safe합니다.
- 세 가지 모드를 다룹니다 — Blocking(simple), Interrupt(non-blocking), DMA(설정·완료 처리 필요).
- Concept은 인터페이스 형태를 검사하며 모드별 완료·수명 계약을 맞춘 adapter가 있어야 교체할 수 있습니다.
- SPI에 CS pin을 묶는 device wrapper로 더 높은 abstraction을 만듭니다.
- RAII guard로 clock과 power를 관리하려면 adapter가 초기화 성공·종료 함수를 실제로 제공해야 합니다.
- HAL wrapper와 직접 구현의 크기·시간은 같은 기능·오류 처리 조건으로 비교합니다.

## 관련 항목

- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction)
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction)
- [Part 5-04: HAL 설계 패턴](/blog/embedded/embedded-cpp/part5-04-hal-design-patterns)
- [Part 2-10: Concepts](/blog/embedded/embedded-cpp/part2-10-concepts)

## 다음 글

[Part 5-04: HAL 설계 패턴](/blog/embedded/embedded-cpp/part5-04-hal-design-patterns) — 범용 HAL 구조를 다루며, 벤더 종속성 격리와 다중 보드/MCU 지원을 살펴봅니다.
