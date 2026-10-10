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

> **"SPI는 흔히 4선 풀듀플렉스로 사용하지만, half-duplex·3-wire 변형도 있습니다."** CPOL/CPHA·data width·CS timing을 맞추고, multi-slave에서는 보통 CS를 GPIO로 직접 제어합니다.

## 어떤 상황에서 쓰나

SPI는 sensor·flash·display·SD card·radio module에 널리 쓰입니다. I2C보다 빠르게 구성할 수 있지만 실제 clock 한계는 controller·slave·배선에 따라 다릅니다. STM32 SPI의 master/slave·data width·DMA 기능도 family별 reference manual을 확인해야 합니다.

이 글은 SPI master 드라이버를 polling·interrupt·DMA로 작성하고, 멀티 슬레이브 환경에서의 CS 제어 패턴을 다룹니다.

## 핵심 개념

### SPI 신호선

| 신호 | 방향 | 비고 |
| --- | --- | --- |
| SCK | Master → Slave | serial clock |
| MOSI | Master → Slave | data out |
| MISO | Master ← Slave | data in |
| NSS / CS | Master → Slave | active-low chip select |

NSS (또는 CS, SS)는 *active-low*입니다. 둘 이상의 slave가 있으면 *master 측 GPIO* 여러 개로 각 slave의 CS를 제어합니다. STM32의 HW NSS는 한 핀만 지원해 multi-slave에서는 *수동 CS*가 표준입니다.

### CPOL / CPHA (Mode 0~3)

| Mode | CPOL | CPHA | Idle clock | Sample edge |
|------|------|------|------------|--------------|
| 0 | 0 | 0 | LOW | Rising |
| 1 | 0 | 1 | LOW | Falling |
| 2 | 1 | 0 | HIGH | Falling |
| 3 | 1 | 1 | HIGH | Rising |

많은 sensor·flash가 **Mode 0**을 지원하지만, 일부 ADC·audio codec·display는 다른 모드를 요구합니다. datasheet의 "SPI timing diagram"을 항상 확인합니다.

### Baud divider

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
| 4 | /32 | 2.6 MHz |
| 5 | /64 | 1.3 MHz |

flash·SD·sensor·display의 허용 clock은 부품과 board signal integrity에 따라 다르므로 datasheet와 실제 파형으로 정합니다.

### Full-duplex 동작

SPI는 *동시에 1바이트 송신·수신*합니다. write할 데이터가 없어도 *dummy byte (0xFF 등) 송신*하면서 receive합니다.

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

**핵심 디테일**: `BSY` flag가 clear되기 *전에* CS를 high로 올리면 마지막 비트가 깨집니다. 항상 `while(BSY)` 후 CS 올림.

### 3. DMA transfer

```c
void spi_init_dma(void) {
    // 아래 Stream/Channel은 특정 STM32F4 DMA mapping 예시
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN;

    // RX
    DMA2_Stream0->PAR = (uint32_t)&SPI1->DR;
    DMA2_Stream0->CR  = (3u << 25)
                      | DMA_SxCR_MINC
                      | DMA_SxCR_TCIE;

    // TX
    DMA2_Stream3->PAR = (uint32_t)&SPI1->DR;
    DMA2_Stream3->CR  = (3u << 25)
                      | DMA_SxCR_DIR_0
                      | DMA_SxCR_MINC
                      | DMA_SxCR_TCIE;

    SPI1->CR2 |= SPI_CR2_TXDMAEN | SPI_CR2_RXDMAEN;
    NVIC_EnableIRQ(DMA2_Stream0_IRQn);
}

volatile int spi_dma_done;

void spi_xfer_dma(const uint8_t *tx, uint8_t *rx, size_t n) {
    spi_dma_done = 0;
    cs_low();

    DMA2_Stream0->M0AR = (uint32_t)rx;
    DMA2_Stream0->NDTR = n;
    DMA2_Stream0->CR  |= DMA_SxCR_EN;

    DMA2_Stream3->M0AR = (uint32_t)tx;
    DMA2_Stream3->NDTR = n;
    DMA2_Stream3->CR  |= DMA_SxCR_EN;

    while (!spi_dma_done);
    while (SPI1->SR & SPI_SR_BSY);
    cs_high();
}

void DMA2_Stream0_IRQHandler(void) {
    DMA2->LIFCR = DMA_LIFCR_CTCIF0;
    spi_dma_done = 1;
}
```

DMA의 이점은 전송 길이, interrupt/setup overhead와 peripheral에 따라 달라집니다. 짧은 register read·write는 polling이 더 빠를 수 있으므로 target에서 측정합니다.

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
```

각 slave가 다른 mode·divider일 수 있으므로 *select 시점에 재구성*합니다.

## 측정 / 동작 확인

로직 애널라이저로 SCK·MOSI·MISO·CS 4채널을 보면 *완전한 transaction*이 보입니다.

![SPI transaction — CS · SCK · MOSI · MISO 4채널](/images/blog/modern-recipes/diagrams/part4-08-spi-transaction.svg)

`while(BSY)` 빠뜨림은 *CS edge가 마지막 SCK falling보다 빠른* 패턴으로 보입니다. 마지막 비트가 잘립니다.

오실로스코프로 SCK clock 주기를 보면 divider 검증이 됩니다 (`PCLK / 2^(BR+1)`).

## 자주 보는 함정

> ⚠️ `BSY` 폴링 전 CS 올림

마지막 비트가 깨집니다. 항상 `while(SPI->SR & BSY)` 후 CS 올림.

> ⚠️ Mode 잘못

scope에 SCK는 보이는데 *수신 데이터가 이상*하면 CPOL/CPHA 의심. datasheet timing diagram과 직접 비교합니다.

> ⚠️ MISO line bias를 무조건 pull-up으로 해결하려는 경우

slave deselect 시 high-Z가 되는지와 bus idle 요구사항을 datasheet로 확인합니다. pull-up은 bus contention·signal level 요구사항을 검토한 뒤 사용합니다.

> ⚠️ 8-bit transfer인데 16-bit access

data width는 SPI peripheral 설정과 허용 access width에 의해 결정됩니다. `DR`에 어떤 C width로 접근해야 하는지는 해당 STM32 reference manual과 설정을 따르며, 8-bit transfer라고 무조건 같은 access 표현을 다른 family에 재사용해서는 안 됩니다.

> ⚠️ DMA 사용 시 CR2 enable 누락

`TXDMAEN`/`RXDMAEN` 빠뜨리면 DMA가 trigger되지 않습니다.

> ⚠️ Clock speed가 PCB 한계 초과

flying wires로 50 MHz는 동작 안 함. 짧은 PCB trace + ground plane이 있어야 25-50 MHz가 안정. 보드 prototype에는 5-10 MHz에서 시작.

## 정리

- SPI는 4선 (SCK/MOSI/MISO/CS). 멀티 slave는 **CS를 GPIO로 직접** 제어.
- Mode 0이 기본, **CPOL/CPHA**는 datasheet timing 확인 필수.
- **`BSY` 폴링 후 CS up**이 가장 흔한 디테일 함정.
- DMA 효과는 전송 길이·setup overhead·peripheral에 따라 측정하고, 짧은 transaction은 polling을 고려합니다.
- baud는 PCB 품질에 의존 — prototype은 5 MHz에서 시작해 올려 봅니다.

다음 편은 **I2C 드라이버**입니다. state machine, repeated start, NACK 회복, timeout을 다룹니다.

## 관련 항목

- [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-13: SD card + FatFs](/blog/embedded/modern-recipes/part5-13-sd-card-fatfs)
