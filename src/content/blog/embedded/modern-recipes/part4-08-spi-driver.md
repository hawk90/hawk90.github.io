---
title: "SPI 드라이버 구현 — Master·Slave·CRC·DMA"
slug: "embedded/modern-recipes/part4-08-spi-driver"
date: 2026-04-13T09:42:00
description: "Master/slave·CPOL/CPHA·DMA·multi-slave CS."
series: "Modern Embedded Recipes"
seriesOrder: 42
tags: [recipes, bare-metal, spi]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SPI master는 SCK·MOSI·MISO·CS 네 선으로 1 byte를 보내는 동안 1 byte를 받습니다."** CPOL/CPHA·data width·CS timing을 slave에 맞추고, 이 글은 multi-slave의 CS를 GPIO로 직접 제어합니다.

## 어떤 상황에서 쓰나

SPI는 sensor·flash·display·SD card·radio module에 쓰입니다. 이 글의 대상은 STM32F407의 SPI1이고, register 이름과 bit는 `stm32f407xx.h`, 동작 순서는 ST HAL v1.8.3 `stm32f4xx_hal_spi.c`와 맞춰 봤습니다. 코드는 모두 arm-none-eabi-gcc 16.2.0으로 `-Wall` 경고 없이 빌드되는 것을 확인했지만, QEMU의 F4 모델에는 SPI bus에 붙은 slave가 없어 실제 transaction은 돌리지 않았습니다.

이 글은 SPI master 드라이버를 polling·interrupt·DMA로 작성하고, 멀티 슬레이브 환경에서의 CS 제어 패턴을 다룹니다.

## 핵심 개념

### SPI 신호선

| 신호 | 방향 | 비고 |
| --- | --- | --- |
| SCK | Master → Slave | serial clock |
| MOSI | Master → Slave | data out |
| MISO | Master ← Slave | data in |
| NSS / CS | Master → Slave | active-low chip select |

CS(NSS, SS)는 active-low입니다. ST의 open_pin_data에서 STM32F407의 SPI1 신호는 `SPI1_NSS` PA4, `SPI1_SCK` PA5, `SPI1_MISO` PA6, `SPI1_MOSI` PA7이고 모두 AF5입니다. 하드웨어 NSS 핀은 SPI 하나에 하나이므로 slave가 둘 이상이면 GPIO 여러 개로 각 slave의 CS를 따로 내립니다. 아래 코드는 slave가 하나일 때도 PA4를 GPIO output으로 두고 software로 제어합니다.

### CPOL / CPHA (Mode 0~3)

| Mode | CPOL | CPHA | Idle clock | Sample edge |
|------|------|------|------------|--------------|
| 0 | 0 | 0 | LOW | Rising |
| 1 | 0 | 1 | LOW | Falling |
| 2 | 1 | 0 | HIGH | Falling |
| 3 | 1 | 1 | HIGH | Rising |

이 표는 Linux v6.12 `Documentation/spi/spi-summary.rst`의 정의에서 나옵니다. "CPOL=0 means the clock starts low, so the first (leading) edge is rising", "CPHA=0 says sample on the leading edge, CPHA=1 means the trailing edge"이고, mode 번호는 "CPOL is the high order bit and CPHA is the low order bit"입니다. 같은 문서가 "Chip specs won't always say 'uses SPI mode X' in as many words, but their timing diagrams will make the CPOL and CPHA modes clear"라고 하듯, slave의 mode는 datasheet의 timing diagram에서 clock idle level과 sampling edge를 읽어 정합니다. STM32F4에서 CPHA는 `SPI_CR1` bit 0, CPOL은 bit 1입니다.

### Baud divider

SPI1은 APB2에 있으므로(`RCC_APB2ENR_SPI1EN`) [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup) 설정의 PCLK2 = 84 MHz가 입력입니다. HAL v1.8.3의 `SPI_BAUDRATEPRESCALER_2`가 0, `_4`가 `SPI_CR1_BR_0`, …, `_256`이 `BR_2 | BR_1 | BR_0`이므로 3 bit `BR` 필드(`SPI_CR1_BR_Pos` 3)의 값 n이 /2^(n+1)입니다.

```text
SPI clock = PCLK / 2^(BR + 1)

PCLK2 = 84 MHz, BR = 2 → 84 / 8 = 10.5 MHz
```

| BR | Divider | Clock @ 84 MHz |
|----|---------|----------------|
| 0 | /2 | 42 MHz |
| 1 | /4 | 21 MHz |
| 2 | /8 | 10.5 MHz |
| 3 | /16 | 5.25 MHz |
| 4 | /32 | 2.625 MHz |
| 5 | /64 | 1.3125 MHz |
| 6 | /128 | 656.25 kHz |
| 7 | /256 | 328.125 kHz |

어느 값을 쓸지는 slave datasheet의 최대 SCK 주파수와 setup/hold 조건으로 정하고, 보드에서는 scope로 SCK 주기를 재서 확인합니다.

### Full-duplex 동작

master는 1 byte를 내보내는 8 clock 동안 MISO에서 1 byte를 받습니다. 그래서 읽기만 할 때도 dummy byte(아래에서는 `0xFF`)를 보내야 clock이 나가고, 쓰기만 할 때도 받은 byte를 `DR`에서 읽어 버려야 다음 `RXNE`가 맞습니다.

```c
uint8_t spi_xfer(uint8_t tx) {
    while (!(SPI1->SR & SPI_SR_TXE));
    SPI1->DR = tx;
    while (!(SPI1->SR & SPI_SR_RXNE));
    return SPI1->DR;
}

// 사용
uint8_t rx = spi_xfer(0xFF);   // read only — TX는 don't care
spi_xfer(0xA5);                // write only — RX는 버림
```

## 코드 예제

### 1. SPI master init

```c
void spi_init_master(uint32_t div) {
    RCC->APB2ENR |= RCC_APB2ENR_SPI1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA5 SCK, PA6 MISO, PA7 MOSI (AF5)
    gpio_init(GPIOA, 5, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=5});
    gpio_init(GPIOA, 6, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=5, .pull=GPIO_PULL_UP});
    gpio_init(GPIOA, 7, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=5});

    // CS는 GPIO로 별도 제어 — PA4 (active-low)
    gpio_init(GPIOA, 4, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .speed=GPIO_SPEED_HIGH});
    GPIOA->BSRR = (1u << 4);   // CS high (deselect)

    SPI1->CR1 = SPI_CR1_MSTR              // master
              | (div << 3)                // BR
              | SPI_CR1_SSM | SPI_CR1_SSI // software NSS, NSS held high
              | SPI_CR1_SPE;              // enable
                                          // CPOL=0, CPHA=0, 8-bit, MSB-first
}
```

### 2. Polling transfer

```c
static inline void cs_low(void)  { GPIOA->BSRR = (1u << (4 + 16)); }
static inline void cs_high(void) { GPIOA->BSRR = (1u << 4); }

uint8_t spi_xfer8(uint8_t tx) {
    while (!(SPI1->SR & SPI_SR_TXE));
    *((volatile uint8_t *)&SPI1->DR) = tx;    // 8-bit access
    while (!(SPI1->SR & SPI_SR_RXNE));
    return *((volatile uint8_t *)&SPI1->DR);
}

void spi_write(const uint8_t *buf, size_t n) {
    cs_low();
    for (size_t i = 0; i < n; i++) spi_xfer8(buf[i]);
    while (SPI1->SR & SPI_SR_BSY);   // wait last bit out
    cs_high();
}

void spi_read(uint8_t *buf, size_t n) {
    cs_low();
    for (size_t i = 0; i < n; i++) buf[i] = spi_xfer8(0xFF);
    while (SPI1->SR & SPI_SR_BSY);
    cs_high();
}
```

`DR` 접근은 8-bit 포인터로 합니다. HAL v1.8.3도 8-bit data frame에서 `*((__IO uint8_t *)&hspi->Instance->DR)`로 쓰고 읽습니다. CS를 올리기 전에는 `BSY`(`SPI_SR_BSY`, bit 7)가 0이 될 때까지 기다립니다. HAL의 `SPI_EndRxTxTransaction()`도 master mode에서 `TXE`를 기다린 뒤 "Control the BSY flag" 주석과 함께 `BSY`가 0이 되기를 기다리고 나서 transaction을 끝냅니다. `RXNE`는 마지막 byte를 다 받았다는 뜻이지만, 그 뒤에도 `BSY`를 확인하는 것이 HAL과 같은 순서입니다.

### 3. DMA transfer

```c
void spi_init_dma(void) {
    // SPI1_RX = DMA2 Stream2 ch3, SPI1_TX = DMA2 Stream3 ch3 (ST STM32F412ZG-Nucleo 예제)
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN;

    // RX
    DMA2_Stream2->PAR = (uint32_t)&SPI1->DR;
    DMA2_Stream2->CR  = (3u << 25)
                      | DMA_SxCR_MINC
                      | DMA_SxCR_TCIE;

    // TX
    DMA2_Stream3->PAR = (uint32_t)&SPI1->DR;
    DMA2_Stream3->CR  = (3u << 25)
                      | DMA_SxCR_DIR_0
                      | DMA_SxCR_MINC;

    SPI1->CR2 |= SPI_CR2_TXDMAEN | SPI_CR2_RXDMAEN;
    NVIC_EnableIRQ(DMA2_Stream2_IRQn);
}

volatile int spi_dma_done;

void spi_xfer_dma(const uint8_t *tx, uint8_t *rx, size_t n) {
    spi_dma_done = 0;
    cs_low();

    DMA2->LIFCR = (0x3Fu << 16) | (0x3Fu << 22);   // clear stream 2/3 flags (HAL_DMA_Start_IT)

    DMA2_Stream2->M0AR = (uint32_t)rx;
    DMA2_Stream2->NDTR = n;
    DMA2_Stream2->CR  |= DMA_SxCR_EN;

    DMA2_Stream3->M0AR = (uint32_t)tx;
    DMA2_Stream3->NDTR = n;
    DMA2_Stream3->CR  |= DMA_SxCR_EN;

    while (!spi_dma_done);
    while (SPI1->SR & SPI_SR_BSY);
    cs_high();
}

void DMA2_Stream2_IRQHandler(void) {
    DMA2->LIFCR = DMA_LIFCR_CTCIF2;
    spi_dma_done = 1;
}
```

stream·channel은 ST STM32CubeF4의 `Projects/STM32F412ZG-Nucleo/Examples/SPI/SPI_FullDuplex_ComDMA/Inc/main.h`(SPI1: `SPIx_RX_DMA_STREAM DMA2_Stream2`, `SPIx_TX_DMA_STREAM DMA2_Stream3`, 둘 다 `DMA_CHANNEL_3`)를 따랐습니다. F412는 F407과 다른 reference manual을 쓰는 칩이고 이 글은 RM0090의 DMA request 표를 열어 보지 못했으므로, F407 보드에서는 그 표로 확인합니다. 순서는 HAL v1.8.3 `HAL_SPI_TransmitReceive_DMA()`처럼 RX stream을 먼저, TX stream을 나중에 켭니다. stream을 켜기 전에는 HAL `HAL_DMA_Start_IT()`가 하는 `regs->IFCR = 0x3FU << hdma->StreamIndex`처럼 두 stream의 flag를 지웁니다(stream 2는 bit 16부터, stream 3은 bit 22부터). transaction의 끝은 RX 완료로 봅니다. HAL도 "the communication closing is performed in DMA reception complete callback"이라는 주석과 함께 TX 완료 callback을 비워 두고 RX 완료에서 닫습니다. 그래서 TX stream의 `DMA_SxCR_TCIE`는 쓰지 않습니다.

### 4. Multi-slave CS pattern

```c
typedef struct {
    GPIO_TypeDef *cs_port;
    uint16_t      cs_pin;
    uint8_t       div;        // baud divider per slave
    uint8_t       mode;       // CPOL/CPHA
} spi_slave_t;

static spi_slave_t flash = {GPIOA, 4, 0, 0};
static spi_slave_t adc   = {GPIOA, 3, 2, 1};

void spi_select(const spi_slave_t *s) {
    SPI1->CR1 &= ~SPI_CR1_SPE;
    SPI1->CR1 = (SPI1->CR1 & ~((7u << 3) | SPI_CR1_CPOL | SPI_CR1_CPHA))
              | (s->div << 3)
              | ((s->mode & 2) ? SPI_CR1_CPOL : 0)
              | ((s->mode & 1) ? SPI_CR1_CPHA : 0)
              | SPI_CR1_SPE;
    s->cs_port->BSRR = (1u << (s->cs_pin + 16));   // CS low
}

void spi_deselect(const spi_slave_t *s) {
    while (SPI1->SR & SPI_SR_BSY);
    s->cs_port->BSRR = (1u << s->cs_pin);   // CS high
}

uint8_t read_both(void) {
    spi_select(&flash);
    uint8_t a = spi_xfer8(0x9F);            // e.g. a flash command byte
    spi_deselect(&flash);
    spi_select(&adc);
    uint8_t b = spi_xfer8(0x00);
    spi_deselect(&adc);
    return a ^ b;
}
```

이 예제의 flash(mode 0, BR 0)와 adc(mode 1, BR 2)는 mode·divider가 달라서 select할 때 SPE를 끄고 CR1을 다시 씁니다. `spi_select()`는 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 GPIO 설정으로 두 CS 핀이 이미 output이라고 가정합니다.

## 측정 / 동작 확인

logic analyzer로 SCK·MOSI·MISO·CS 4채널을 함께 잡으면 transaction 전체가 보입니다.

![SPI transaction — CS · SCK · MOSI · MISO 4채널](/images/blog/modern-recipes/diagrams/part4-08-spi-transaction.svg)

확인할 것은 CS의 rising edge가 마지막 SCK edge 뒤에 오는지, CPOL에 맞는 idle level에서 SCK가 시작하는지입니다.

오실로스코프로 SCK clock 주기를 보면 divider 검증이 됩니다 (`PCLK / 2^(BR+1)`).

## 자주 보는 함정

> ⚠️ `BSY` 폴링 전 CS 올림

`BSY`가 1인 동안은 SPI가 아직 전송 중입니다. HAL처럼 `BSY`가 0이 된 뒤 CS를 올립니다.

> ⚠️ Mode 잘못

SCK는 나오는데 받은 값이 틀리면 CPOL/CPHA를 slave datasheet의 timing diagram과 다시 맞춰 봅니다.

> ⚠️ 8-bit frame인데 32-bit로 `DR` 접근

`SPI1->DR`은 `stm32f407xx.h`에서 `__IO uint32_t`이므로 `SPI1->DR = tx;`는 32-bit 접근이 됩니다. 위 `spi_xfer8()`은 `-O2`에서 `strb r0, [r1, #12]`(offset `0x0C`가 `DR`)로 컴파일돼 8-bit로 씁니다. HAL도 8-bit frame에서 `DR`을 `uint8_t` 포인터로 접근합니다.

> ⚠️ DMA 사용 시 CR2 enable 누락

`SPI_CR2_TXDMAEN`/`SPI_CR2_RXDMAEN`을 켜지 않으면 SPI가 DMA request를 내지 않습니다. HAL은 RX stream을 켠 뒤 `RXDMAEN`을, TX stream을 켠 뒤 `TXDMAEN`을 set합니다.

## 정리

- SPI master는 SCK/MOSI/MISO/CS 네 선이고, 이 글은 **CS를 GPIO로 직접** 제어합니다.
- **CPOL/CPHA**는 slave datasheet의 timing diagram에서 읽습니다.
- **`BSY`가 0이 된 뒤 CS를 올립니다**(HAL `SPI_EndRxTxTransaction()`과 같은 순서).
- DMA는 RX stream을 먼저 켜고, RX 완료를 transaction의 끝으로 봅니다.
- SCK = PCLK2 / 2^(BR+1)이고, 실제 주기는 scope로 확인합니다.

다음 편은 **I2C 드라이버**입니다. state machine, repeated start, NACK 회복, timeout을 다룹니다.

## 관련 항목

- [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-13: SD 카드 SPI 모드 + FatFs](/blog/embedded/modern-recipes/part5-13-sd-card-fatfs)
