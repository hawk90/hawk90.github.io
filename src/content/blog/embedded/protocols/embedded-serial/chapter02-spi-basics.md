---
title: "Ch 2: SPI 기초 — 4-wire, CPOL/CPHA, 4가지 모드"
date: 2027-03-01T02:00:00
description: "MOSI·MISO·SCLK·CS 4-wire. CPOL과 CPHA의 조합이 만드는 4가지 SPI 모드를 한눈에."
series: "Embedded Protocols 심화"
seriesOrder: 2
tags: [spi, mosi, miso, cpol, cpha, mode]
draft: true
---

## 한 줄 요약

> **"SCLK 어디 떨어지면 데이터 잡냐"** — CPOL은 idle level, CPHA는 sampling edge. 두 비트 = 4 모드.

## 어떤 문제를 푸는가

SPI는 *동기 직렬*이라 마스터가 클럭을 흘리고, 그 클럭의 *어느 엣지*에서 데이터를 잡을지 양쪽이 합의해야 합니다. 그 합의가 **CPOL**·**CPHA** 두 비트.

데이터시트에 *"This device uses SPI Mode 0"* 또는 *"CPOL=0, CPHA=1"* 식으로 적혀 있습니다. 한쪽이라도 잘못 설정하면 **데이터가 한 비트씩 밀려서** 알 수 없는 값이 나옵니다.

## 한눈에 보는 구조

![SPI 4-wire topology](/images/blog/embedded-serial/diagrams/ch02-spi-topology.svg)

마스터 한 개, 슬레이브 N개. 각 슬레이브는 자기 **CS (Chip Select)** 핀을 가집니다. 데이터 라인은 *공유*, 활성화된 슬레이브만 응답.

| 신호 | 방향 | 의미 |
| --- | --- | --- |
| **SCLK** | 마스터 → 슬레이브 | 클럭 |
| **MOSI** | 마스터 → 슬레이브 | Master Out, Slave In |
| **MISO** | 슬레이브 → 마스터 | Master In, Slave Out |
| **CS** (`SS`, `NSS`, `nCS`) | 마스터 → 슬레이브 | Low active 선택 신호 |

## 4가지 모드 — CPOL × CPHA

![SPI 4 modes timing](/images/blog/embedded-serial/diagrams/ch02-spi-modes.svg)

또는 *tikz-timing* 표기로:

![SPI 4 modes (tikz-timing)](/images/blog/embedded-serial/diagrams/ch02-spi-modes-tt.svg)

| Mode | CPOL | CPHA | SCLK idle | 샘플 엣지 | 흔한 디바이스 |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | Low | 첫 (rising) | 가장 흔함 — ADXL345, MAX3100 |
| 1 | 0 | 1 | Low | 두 번째 (falling) | 일부 ADC |
| 2 | 1 | 0 | High | 첫 (falling) | 일부 RTC |
| 3 | 1 | 1 | High | 두 번째 (rising) | SD card SPI |

### CPOL — 클럭 극성

- `CPOL=0` — idle 상태에서 SCLK가 **Low**
- `CPOL=1` — idle 상태에서 SCLK가 **High**

### CPHA — 클럭 위상

- `CPHA=0` — 데이터는 **첫 번째** SCLK 엣지에서 샘플
- `CPHA=1` — 데이터는 **두 번째** SCLK 엣지에서 샘플

`CPOL=0, CPHA=0`은 SCLK가 Low에서 시작해 *상승 엣지*에서 샘플. `CPOL=1, CPHA=0`은 High에서 시작해 *하강 엣지*에서 샘플. CPHA가 결정하는 건 "idle 후 첫 엣지냐 두 번째 엣지냐"입니다.

## 한 트랜잭션의 흐름

```text
1. 마스터 CS Low
2. SCLK 펄스 시작 — N bits (보통 8, 16, 32)
3. 매 SCLK 사이클마다:
   - MOSI: 마스터가 한 비트 송신
   - MISO: 슬레이브가 한 비트 송신 (동시)
4. 마지막 비트 후 SCLK 멈춤
5. 마스터 CS High → 트랜잭션 종료
```

핵심은 *Full-duplex* — MOSI와 MISO가 **동시에** 흐릅니다. 마스터가 데이터 쓰면서 슬레이브도 동시에 데이터 보냄.

## STM32 HAL 예제

```c
SPI_HandleTypeDef hspi1;

// 초기화 (CubeMX 생성 후)
void spi_init(void) {
    hspi1.Instance = SPI1;
    hspi1.Init.Mode = SPI_MODE_MASTER;
    hspi1.Init.Direction = SPI_DIRECTION_2LINES;
    hspi1.Init.DataSize = SPI_DATASIZE_8BIT;
    hspi1.Init.CLKPolarity = SPI_POLARITY_LOW;    // CPOL=0
    hspi1.Init.CLKPhase = SPI_PHASE_1EDGE;        // CPHA=0
    hspi1.Init.NSS = SPI_NSS_SOFT;                // CS는 GPIO로 제어
    hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_16;
    hspi1.Init.FirstBit = SPI_FIRSTBIT_MSB;
    HAL_SPI_Init(&hspi1);
}

// 한 바이트 read/write (full-duplex)
uint8_t spi_xfer(uint8_t tx) {
    uint8_t rx;
    HAL_GPIO_WritePin(CS_GPIO_Port, CS_Pin, GPIO_PIN_RESET);  // CS Low
    HAL_SPI_TransmitReceive(&hspi1, &tx, &rx, 1, HAL_MAX_DELAY);
    HAL_GPIO_WritePin(CS_GPIO_Port, CS_Pin, GPIO_PIN_SET);    // CS High
    return rx;
}
```

## 3-wire SPI — MOSI/MISO 단일 양방향

표준 4-wire의 *변형* — MOSI와 MISO를 *한 라인*으로 합쳐 *bidirectional half-duplex*. 핀 1개 절약.

```text
표준 4-wire:  SCLK · MOSI · MISO · CS
3-wire:       SCLK · SISO · CS     (SISO = Serial In/Out)
```

방향은 *명령 단계*에서 결정 — 처음 N 비트는 마스터→슬레이브 (명령), 그 후 슬레이브→마스터 (응답).

### 사용처

- 일부 LCD 컨트롤러 (ST7789 등) — 8-bit 명령 + 데이터 단방향
- ADC 일부 (TI ADS1148 등) — 작은 PCB
- 일부 RF 모듈 (Nordic nRF24L01의 일부 모드)

### MCU 페리퍼럴 지원

STM32 SPI의 `Direction = SPI_DIRECTION_1LINE` 또는 `SPI_DIRECTION_BIDIRECTIONAL` 모드 — `HAL_SPI_Transmit/Receive` 각자 호출 시 페리퍼럴이 IO 핀 방향 자동 전환.

## Microwire — SPI의 옛 부분집합

National Semiconductor가 1980년대 발표한 *간소화 SPI*. 모드 0 (CPOL=0, CPHA=0) + 8-bit + 단방향 4-wire만 지원.

| | Microwire | SPI |
| --- | --- | --- |
| 모드 | 0 only | 0/1/2/3 |
| 라인 폭 | 8-bit only | 4-32 bit |
| 클럭 | 마스터 | 마스터 |
| 단/양방향 | 단방향 (DO·DI 분리) | 양방향 동시 |

### 사용처 — 옛 EEPROM

Atmel AT93C46/AT93C56/AT93C66 등 *직렬 EEPROM*이 Microwire. 명령 셋:

```text
EWEN (Write Enable) | 0x6, addr=0xC0
ERASE | 0x7, addr
WRITE | 0x5, addr, data (16-bit)
READ  | 0x6, addr  → 16-bit data
EWDS (Write Disable) | 0x6, addr=0x00
```

요즘은 *I²C 또는 SPI EEPROM*으로 거의 대체됨. *Legacy 시스템 유지보수* 시에만.

## Bit-bang vs 하드웨어 페리퍼럴

![SPI bit-bang timing — Mode 0 (tikz-timing)](/images/blog/embedded-serial/diagrams/ch02-spi-bitbang.svg)

| | Bit-bang (GPIO) | HW SPI |
| --- | --- | --- |
| 최대 속도 | ~1 MHz (MCU 따라) | 50+ MHz |
| CPU 사용률 | 매우 높음 | 낮음 (DMA 시 0) |
| 동시성 | 인터럽트로 깨짐 | 페리퍼럴 자체 처리 |
| 코드 양 | 많음 | 적음 |
| 사용처 | GPIO 부족·임시 디버그 | 양산 거의 항상 |

가능하면 **HW SPI + DMA**. 비트뱅은 디버그 용도로만.

## 자주 하는 실수

> ⚠️ Mode 불일치

`Mode 0`으로 설정했는데 슬레이브는 `Mode 3` — 첫 비트가 깨져 모든 값이 한 비트씩 밀립니다. 해결 — **데이터시트 SPI 섹션의 timing diagram을 한 번 더 확인**.

> ⚠️ CS를 안 토글

CS Low → 데이터 → CS High 흐름을 무시하고 CS를 계속 Low로 두면 *연속 트랜잭션*으로 해석돼 슬레이브 내부 state machine이 망가집니다.

> ⚠️ MOSI/MISO 반대 연결

마스터의 MOSI가 슬레이브의 *MISO*에 연결되면 → 데이터 0 안 가고 0 안 옴. 보드 설계 단계에서 가장 잦은 실수.

> ⚠️ 클럭 속도가 슬레이브 한계 초과

데이터시트의 `f_SCLK(max)`를 무시하고 가속하면 *불규칙 비트 에러*. 디지털 분석기로 잡지 않으면 *간헐적*이라 찾기 어렵습니다.

## 정리

- SPI는 **4-wire** (SCLK·MOSI·MISO·CS), 1 master + N slaves.
- **CPOL** = 클럭 idle level, **CPHA** = 샘플 엣지 → 4 모드.
- Mode 0 (CPOL=0, CPHA=0)이 가장 흔함. SD card는 Mode 3.
- **Full-duplex** — MOSI/MISO가 동시에 흐름.
- HW SPI + DMA가 표준. Bit-bang은 디버그용.

다음 편은 **SPI 심화** — daisy chain, multi-slave, QSPI/Octal SPI, 보드 레이아웃.

## 관련 항목

- [Ch 3: SPI 심화](/blog/embedded/protocols/embedded-serial/chapter03-spi-advanced)
- [Ch 12: 디버깅](/blog/embedded/protocols/embedded-serial/chapter12-debugging) — 로직 분석기로 Mode 확인
