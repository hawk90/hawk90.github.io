---
title: "SPI 하드웨어 분석 — Clock Mode·MOSI/MISO·Chip Select"
date: 2026-04-10T09:05:00
description: "MOSI/MISO/SCK/CS·CPOL/CPHA 4 모드·daisy-chain·high-speed signal 고려사항."
series: "Modern Embedded Recipes"
seriesOrder: 5
tags: [recipes, spi, hw-basics]
draft: false
---

## 한 줄 요약

> **"SPI는 클럭을 공유하는 가장 빠른 4선 시리얼입니다."** 누가 master인지 명확하고, 클럭이 있으니 100 MHz 이상도 가능합니다.

## 어떤 상황에서 쓰나

- 외부 flash(W25Q, MX25 등) read/write
- TFT LCD나 ADC/DAC 같은 고속 주변기기
- SD card SPI 모드
- 보드 안 chip-to-chip 고속 데이터

## 핵심 개념

### 1) 4선 구성

| 핀 | 방향 | 의미 |
| --- | --- | --- |
| SCK | M → S | Serial clock (master가 만듬) |
| MOSI | M → S | Master Out Slave In |
| MISO | M ← S | Master In Slave Out |
| CS# | M → S | Chip Select (active-low) |

송신·수신이 같은 클럭에서 동시에 이뤄지므로 **full-duplex**입니다. UART의 두 배 처리량을 같은 baud로 달성합니다.

### 2) Mode 0 ~ 3 — CPOL/CPHA

가장 헷갈리는 부분입니다. 두 비트(CPOL, CPHA)로 4가지 모드를 만듭니다.

| Mode | CPOL | CPHA | SCK idle | 데이터 sampling |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | low | rising edge |
| 1 | 0 | 1 | low | falling edge |
| 2 | 1 | 0 | high | falling edge |
| 3 | 1 | 1 | high | rising edge |

![SPI Mode 0 — SCK idle low, sample at rising edge](/images/blog/modern-recipes/diagrams/part1-05-spi-mode0.svg)

대부분의 디바이스는 **Mode 0**을 씁니다. 데이터시트의 timing diagram을 보고 CPOL/CPHA를 결정합니다.

### 3) Multi-slave — CS vs Daisy-chain

여러 slave가 같은 SPI 버스에 붙을 때 두 가지 방식이 있습니다.

![SPI multi-slave: CS-per-slave vs daisy-chain](/images/blog/modern-recipes/diagrams/part1-05-spi-topologies.svg)

Daisy-chain은 CS 핀을 아낄 수 있지만, 모든 슬레이브가 동시에 응답해야 하고 read latency가 길어집니다.

### 4) 클럭 속도 한계

SPI는 클럭 속도가 free입니다. 다만 신호 무결성이 한계를 정합니다.

| 속도 | PCB 길이 한계 (FR-4) | 비고 |
| --- | --- | --- |
| 1 MHz | 1 m | 일반 sensor |
| 10 MHz | 30 cm | TFT LCD |
| 50 MHz | 10 cm | SPI flash read |
| 100 MHz+ | 5 cm | QSPI, HyperBus |

50 MHz 이상은 LVDS 수준의 신호 무결성 설계가 필요합니다. 임피던스 매칭, 종단 저항, 그라운드 평면 모두 중요합니다.

## 코드 / 실제 사용 예

SPI flash(W25Q32) ID 읽기 예제입니다.

```c
// SPI 초기화 — Mode 0, 10 MHz
SPI1->CR1 = SPI_CR1_MSTR
          | SPI_CR1_SSI | SPI_CR1_SSM
          | (0b011 << SPI_CR1_BR_Pos)    // /8 → 10.5 MHz @84 MHz
          | SPI_CR1_SPE;

static uint8_t spi_xfer(uint8_t tx) {
    while (!(SPI1->SR & SPI_SR_TXE));
    SPI1->DR = tx;
    while (!(SPI1->SR & SPI_SR_RXNE));
    return SPI1->DR;
}

static void w25q_read_id(uint8_t id[3]) {
    cs_low();
    spi_xfer(0x9F);            // JEDEC ID
    id[0] = spi_xfer(0);
    id[1] = spi_xfer(0);
    id[2] = spi_xfer(0);
    cs_high();
}
```

DMA로 대량 read 시 IRQ 부하 없이 50 MB/s가 가능합니다.

```c
// DMA RX (read flash)
DMA2_Stream0->PAR  = (uint32_t)&SPI1->DR;
DMA2_Stream0->M0AR = (uint32_t)rx_buf;
DMA2_Stream0->NDTR = len;
DMA2_Stream0->CR   = DMA_SxCR_MINC | DMA_SxCR_TCIE | DMA_SxCR_EN;
SPI1->CR2 |= SPI_CR2_RXDMAEN;
```

## 측정 / 비교

| Bus 속도 | 1 KB 전송 시간 (1 byte = 8 SCK) |
| --- | --- |
| 1 MHz | 8.2 ms |
| 10 MHz | 820 µs |
| 50 MHz | 164 µs |
| 100 MHz | 82 µs |

| 통신 방식 | 풀-듀플렉스 | 클럭 공유 | 핀 수 (1 slave) |
| --- | --- | --- | --- |
| UART | O | X | 2 |
| I2C | X | O (1 wire) | 2 |
| SPI | O | O | 4 |

## 자주 보는 함정

> ⚠️ CPOL/CPHA 잘못 설정

가장 흔한 SPI 디버깅 원인입니다. logic analyzer로 SCK idle 상태와 첫 sample edge를 확인하면 모드를 식별할 수 있습니다.

> ⚠️ CS를 byte마다 토글

여러 byte를 한 transaction으로 처리해야 하는 명령(예: flash page write 256 byte)을 byte마다 CS를 올렸다 내리면 디바이스가 transaction 종료로 해석해 명령이 깨집니다.

> ⚠️ MISO 풀업/풀다운 누락

CS가 deassert 되었을 때 slave가 MISO를 high-Z로 띄우면 다른 slave와 충돌 시 떠 있는 라인이 됩니다. weak pull-up을 다는 것이 안전합니다.

> ⚠️ Bus 속도 데이터시트 무시

slave 데이터시트에 명시된 최대 SCK를 넘어서면 sporadic하게 read가 깨집니다. 처음에는 1 MHz로 동작 확인 후 단계적으로 올립니다.

> ⚠️ SCK idle 상태 글리치

마스터 SPI 모듈을 enable 하기 전에 SCK가 high(또는 low)로 안정되지 않으면 첫 byte가 어긋납니다. SPE 활성 순서를 데이터시트로 확인합니다.

## 정리

- SPI는 4선(SCK, MOSI, MISO, CS) 동기 full-duplex입니다.
- CPOL/CPHA 4 모드 중 Mode 0이 가장 흔합니다. 데이터시트로 확인합니다.
- Multi-slave는 보통 CS line을 디바이스마다 분리합니다. Daisy-chain은 특수 경우입니다.
- 클럭은 무한대가 아닙니다. 50 MHz 이상은 PCB 설계 자체가 LVDS급 수준이어야 합니다.
- DMA를 쓰면 50 MB/s 이상의 throughput이 가능합니다.

다음 편에서는 **I2C 하드웨어**를 다룹니다. 두 선으로 여러 디바이스를 묶는 방법입니다.

## 관련 항목

- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- [1-12: LVDS / 차동 신호 일반](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- 더 깊이 — [Embedded Performance Engineering: DMA throughput](/blog/embedded/performance-engineering/)
