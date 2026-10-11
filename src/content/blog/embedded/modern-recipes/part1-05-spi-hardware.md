---
title: "SPI 하드웨어 분석 — Clock Mode·MOSI/MISO·Chip Select"
slug: "embedded/modern-recipes/part1-05-spi-hardware"
date: 2026-04-10T09:05:00
lastVerified: 2026-10-11
description: "STM32F407 SPI1에 W25Q32JV flash를 붙일 때 CPOL/CPHA 모드, CS 경계, SCK 상한(fSCK 사양과 MISO 타이밍 예산)을 두 데이터시트 수치로 판정합니다."
series: "Modern Embedded Recipes"
seriesOrder: 5
tags: [recipes, spi, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SPI는 master가 만든 SCK에 맞춰 MOSI와 MISO로 한 비트씩 동시에 주고받는 동기식 직렬 버스입니다."** STM32F407 SPI1과 W25Q32JV를 3.3 V로 붙이면 두 부품의 fSCK 사양은 42 MHz를 허용하지만, 읽기 경로의 MISO 타이밍 예산이 42 MHz에서 모자라 먼저 걸립니다.

이 글은 STM32F407의 SPI1에 Winbond W25Q32JV SPI flash를 붙일 때 어떤 모드를 쓰고, 명령을 CS로 어떻게 묶고, SCK를 어디까지 올릴 수 있는지를 두 부품의 데이터시트 수치로 판정합니다. 레지스터 맵을 읽을 줄 알고 [1-04: UART 하드웨어 동작 분석](/blog/embedded/modern-recipes/part1-04-uart-hardware)의 비동기 직렬 개념을 아는 독자를 가정합니다.

출처는 다음 판을 씁니다. STM32F407 전기 사양은 [DS8626 Rev 12](https://www.st.com/resource/en/datasheet/stm32f407vg.pdf), 레지스터 동작은 [RM0090 Rev 22](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf), 레지스터 이름은 [CMSIS `stm32f407xx.h` v2.6.9](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Include/stm32f407xx.h), flash 수치는 [W25Q32JV 데이터시트 Revision G (2018-03-27)](https://www.winbond.com/resource-files/w25q32jv%20revg%2003272018%20plus.pdf)입니다. ST 링크는 판이 고정되지 않은 최신본 주소이고, 본문 수치는 위에 적은 판에서 읽었습니다.

## 핵심 개념

### 4선과 full-duplex

SCK·MOSI·MISO·CS#는 W25Q32JV에서 각각 CLK·DI·DO·/CS입니다(W25Q32JV 6.1절). STM32F407 SPI master는 full-duplex(`RXONLY` = 0)에서 `SPI_DR`에 쓰는 순간 전송을 시작하고, 같은 SCK로 MISO의 비트를 받아 들입니다(RM0090 28.3.5). 그래서 응답만 받을 때도 dummy byte를 써야 SCK가 돕니다. 아래 JEDEC ID 코드가 응답 3바이트를 받으려고 `spi_xfer(0)`을 세 번 부르는 이유입니다.

### CPOL/CPHA와 모드 번호

모드 번호는 CPOL(SCK의 idle 레벨)을 상위 비트, CPHA(첫 sampling이 leading edge인지 trailing edge인지)를 하위 비트로 둔 값입니다([Linux `spi-summary.rst` v6.12](https://github.com/torvalds/linux/blob/v6.12/Documentation/spi/spi-summary.rst), [`spi.h`의 `SPI_MODE_0`~`SPI_MODE_3`](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/spi/spi.h)). STM32F407에서는 `SPI_CR1`의 `CPOL`·`CPHA` 비트가 그대로 이 두 값입니다(RM0090 28.5.1).

| Mode | CPOL | CPHA | SCK idle | 데이터 sampling | W25Q32JV (6.1절) |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | low | rising edge | 지원 |
| 1 | 0 | 1 | low | falling edge | 지원 목록에 없음 |
| 2 | 1 | 0 | high | falling edge | 지원 목록에 없음 |
| 3 | 1 | 1 | high | rising edge | 지원 |

![SPI Mode 0 — SCK idle low, sample at rising edge](/images/blog/modern-recipes/diagrams/part1-05-spi-mode0.svg)

Linux 문서는 많은 디바이스가 mode 0과 3을 함께 지원하는 이유를 "they don't care about polarity, and always clock data in/out on rising clock edges"라고 적습니다. W25Q32JV는 이 설명과 입력 쪽만 맞습니다. DI는 CLK rising edge에서 받지만 DO는 falling edge에서 내보냅니다(4.2절, 6.1절). master는 rising edge에서 MISO를 sample하므로, flash가 falling edge에서 바꾼 DO는 SCK low 구간 반주기 안에 master 입력에 자리 잡아야 합니다. 이 반주기가 아래 "SCK 상한" 절의 MISO 예산입니다.

비트 순서와 프레임 길이도 맞춥니다. W25Q32JV는 명령·주소·데이터를 MSB first로 주고받고(8절), STM32F407 `SPI_CR1`은 `LSBFIRST` = 0이 MSB first, `DFF` = 0이 8비트 프레임입니다(RM0090 28.5.1, reset 값 `0x0000`).

### Multi-slave — CS 분리 vs daisy-chain

![SPI multi-slave: CS-per-slave vs daisy-chain](/images/blog/modern-recipes/diagrams/part1-05-spi-topologies.svg)

**CS 분리.** SCK·MOSI·MISO를 여러 slave에 병렬로 잇고 slave마다 CS를 하나씩 둡니다. MISO를 공유하려면 선택되지 않은 slave가 출력을 놓아야 하는데, W25Q32JV는 /CS가 high인 동안 DO가 high impedance입니다(4.1절). 대가는 slave 수만큼의 CS 핀입니다.

**Daisy-chain.** CS 하나를 모든 slave가 공유하고 앞 slave의 출력을 다음 slave의 입력에 잇습니다. Linux 드라이버 [`gpio-74x164.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/gpio/gpio-74x164.c)가 이 구성의 비용을 보여 줍니다. 이름과 달리 이 드라이버가 실제로 연결되는 칩은 출력 latch가 있는 74HC595와 74LVC594뿐입니다(`gen_74x164_spi_ids`·`gen_74x164_dt_ids`). 보낸 바이트마다 이전 바이트가 체인의 다음 레지스터로 밀리므로 처음 보낸 바이트가 마지막 레지스터에 남고, 드라이버는 핀 번호를 논리 순서로 매기려고 버퍼를 역순으로 저장합니다. 핀 하나를 바꿀 때도 `chip->registers` 바이트 전체를 `spi_write` 한 번으로 다시 보내므로, 이 칩 n개 체인에서 출력 하나를 바꾸는 데 SCK 8n 주기가 듭니다.

### SCK 상한 — 네 제약 중 가장 낮은 값

SCK 상한 후보는 controller 분주기, controller의 fSCK 사양, slave의 fSCK 사양, 읽기 경로의 MISO 타이밍입니다. 앞의 셋은 표의 값을 비교하면 됩니다. 두 부품 모두 VDD 2.7–3.6 V로 둡니다.

| 제약 | 값 | 조건·출처 |
| --- | --- | --- |
| SPI1 분주기 최고값 | 42 MHz | fPCLK2 최대 84 MHz(DS8626 Table 14) ÷ 2(`BR` = `000`, RM0090 28.5.1) |
| SPI1 master fSCK 최대 | 42 MHz | DS8626 Table 55, SPI1 master, 2.7 V < VDD < 3.6 V. 1.7 V < VDD < 3.6 V에서는 21 MHz |
| W25Q32JV Read Data (03h) fR | 50 MHz | 9.6절 |
| W25Q32JV 03h 외 명령 FR | 133 MHz / 104 MHz | 9.6절, VCC 3.0–3.6 V / 2.7–3.0 V |

SPI1 SCK는 fPCLK2를 `BR[2:0]`로 나눈 값, 즉 fPCLK2 / 2^(BR+1)입니다(RM0090 28.5.1). DS8626 Table 55의 값은 `OSPEEDR` = `10`, 부하 30 pF, 0.5 VDD 측정점 조건이고 "characterization - not tested in production"입니다. W25Q32JV 9.6절 값은 9.5절의 부하 30 pF, 출력 기준 0.5 VCC 조건입니다.

표만 보면 42 MHz가 통과합니다. 읽기 경로를 보면 결과가 다릅니다. Mode 0·3에서 flash는 SCK falling edge 뒤 tCLQV 안에 DO를 내고, master는 다음 rising edge보다 tsu(MI) 먼저 MISO가 안정되어 있어야 합니다(DS8626 Figure 41). 둘을 SCK low 구간에서 빼면 SCK가 flash까지 가는 지연과 DO가 MCU로 돌아오는 지연의 합에 남는 시간이 나옵니다.

| 항목 | `BR` = `000` (42 MHz) | `BR` = `001` (21 MHz) | 출처 |
| --- | --- | --- | --- |
| SCK low 구간 | 11.9 ns | 23.8 ns | 42 MHz는 DS8626 Table 55 tw(SCKL) typ = TPCLK(1/84 MHz). 21 MHz는 Table 55에 값이 없어 공칭 반주기 |
| W25Q32JV tCLQV max | 6 ns | 6 ns | 9.6절, 2.7–3.6 V |
| SPI1 tsu(MI) min | 6.5 ns | 6.5 ns | DS8626 Table 55, master mode |
| 배선 왕복 지연에 남는 시간 | −0.6 ns | 11.3 ns | 첫 행 − 둘째 행 − 셋째 행 |
| 판정 | 불통과 | 배선 왕복 11.3 ns 이하에서 통과 | |

42 MHz는 배선 지연을 0으로 두어도 0.6 ns 모자라고, tw(SCKL) min(TPCLK − 2 ns, 1.7–3.6 V 행)을 쓰면 2.6 ns 모자랍니다. 쓰기 방향은 다릅니다. master는 falling edge 뒤 tv(MO) 2.5 ns 안에 MOSI를 내고(DS8626 Table 55, SPI1, 2.7–3.6 V) flash는 rising edge 1 ns 전부터 DI가 안정되면 되므로(tDVCH, 9.6절), 42 MHz low 구간 11.9 ns에서 8.4 ns가 남습니다. 이 조합에서 가장 먼저 걸리는 상한은 fSCK 사양이 아니라 읽기 경로의 MISO 타이밍이고, 데이터시트 값으로 통과하는 가장 빠른 분주는 `BR` = `001`(21 MHz)입니다.

## 코드 — W25Q32JV JEDEC ID 읽기

PA5·PA6·PA7을 AF5(SPI1_SCK·SPI1_MISO·SPI1_MOSI, DS8626 Table 9)로, PA4를 /CS용 GPIO 출력으로 씁니다. PCLK2를 84 MHz로 맞추는 RCC 클럭 트리 설정은 생략했습니다. 첫 bring-up이라 `BR` = `010`(/8, 10.5 MHz)으로 시작합니다.

```c
#include "stm32f407xx.h"

static void spi1_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    RCC->APB2ENR |= RCC_APB2ENR_SPI1EN;

    GPIOA->BSRR    = GPIO_BSRR_BS4;                                       // /CS high before PA4 becomes an output
    GPIOA->AFR[0]  = (GPIOA->AFR[0]  & ~(0xFFFu << 20)) | (0x555u << 20); // PA5-7 = AF5 (SPI1)
    GPIOA->OSPEEDR = (GPIOA->OSPEEDR & ~(0xFFu  << 8))  | (0xAAu  << 8);  // PA4-7 = 10 (high speed)
    GPIOA->MODER   = (GPIOA->MODER   & ~(0xFFu  << 8))  | (0xA9u  << 8);  // PA4 = 01 output, PA5-7 = 10 AF

    // Mode 0 (CPOL=0, CPHA=0), 8-bit, MSB first, master, software NSS, PCLK2/8
    SPI1->CR1  = SPI_CR1_MSTR | SPI_CR1_SSI | SPI_CR1_SSM | SPI_CR1_BR_1;
    SPI1->CR1 |= SPI_CR1_SPE;                                             // enable last (RM0090 28.3.3 step 7)
}

static inline void cs_low(void)  { GPIOA->BSRR = GPIO_BSRR_BR4; }
static inline void cs_high(void) { GPIOA->BSRR = GPIO_BSRR_BS4; }

static uint8_t spi_xfer(uint8_t tx) {
    while (!(SPI1->SR & SPI_SR_TXE));
    SPI1->DR = tx;
    while (!(SPI1->SR & SPI_SR_RXNE));
    return (uint8_t)SPI1->DR;
}

static void w25q_read_id(uint8_t id[3]) {
    cs_low();
    spi_xfer(0x9F);            // Read JEDEC ID
    id[0] = spi_xfer(0);       // manufacturer ID
    id[1] = spi_xfer(0);       // device ID bits 15-8
    id[2] = spi_xfer(0);       // device ID bits 7-0
    cs_high();
}
```

`OSPEEDR` = `10`은 DS8626 Table 55가 SPI 타이밍을 정한 조건과 같은 값입니다(RM0090 8.4.3에서 `10` = High speed). `SPI_CR1`은 RM0090 28.3.3 절차의 설정 비트(`BR`·`CPOL`/`CPHA`·`DFF`·`LSBFIRST`·`SSM`/`SSI`)와 `MSTR`을 먼저 쓰고, 절차의 마지막 단계인 `SPE`는 따로 켭니다. `SSM`·`SSI`를 켜야 NSS 핀 대신 내부 high가 들어가 `MSTR`·`SPE`가 유지됩니다. interrupt·DMA 버전과 multi-slave CS 관리는 [4-08: SPI 드라이버 구현](/blog/embedded/modern-recipes/part4-08-spi-driver)에 있습니다.

데이터시트 8.1절의 ID 표 기준으로 기대값은 다음과 같습니다.

| 부품 | `id[0]` | `id[1]` | `id[2]` |
| --- | --- | --- | --- |
| W25Q32JV-IQ/JQ | `0xEF` | `0x40` | `0x16` |
| W25Q32JV-IM/JM | `0xEF` | `0x70` | `0x16` |

## 전송 시간 하한

Read Data(03h) 한 번은 명령 1바이트와 주소 3바이트(Instruction Set Table 1) 뒤에 데이터가 이어집니다. 1 KiB를 읽으면 SCK는 (4 + 1024) × 8 = 8224 주기입니다. 아래 값은 그 주기 수를 SCK로 나눈 하한이고, byte 사이에 SCK가 멈춘 시간은 들어 있지 않습니다. MB는 10^6 바이트입니다.

| SCK | 근거 | 1 KiB 03h read | 데이터 구간 처리량 상한 (SCK/8) |
| --- | --- | --- | --- |
| 10.5 MHz | 위 코드의 `BR` = `010` | 783.2 µs | 1.3125 MB/s |
| 21 MHz | "SCK 상한" 절에서 MISO 예산을 통과하는 가장 빠른 분주 | 391.6 µs | 2.625 MB/s |

DMA는 이 상한을 올리지 않습니다. 비트는 여전히 SCK 한 주기에 하나씩 나가고, DMA가 대신하는 것은 TXE·RXNE마다 `SPI_DR`을 쓰고 읽는 일입니다(RM0090 28.3.9). full-duplex(`RXONLY` = 0)에서는 `SPI_DR` 쓰기가 전송을 시작하므로(28.3.5) 이 모드로 03h 응답을 DMA로 받을 때도 TX 스트림이 dummy byte를 써 줘야 합니다.

## 자주 보는 함정

> ⚠️ 모드 불일치

JEDEC ID가 "코드 — W25Q32JV JEDEC ID 읽기" 절의 기대값과 다르게 읽히면 모드부터 봅니다. logic analyzer로 CS가 내려가는 순간의 SCK 레벨(CPOL)과 MISO가 바뀌는 edge를 보고 "CPOL/CPHA와 모드 번호" 절의 표와 대조합니다. W25Q32JV의 DO는 falling edge에서 바뀌어야 정상입니다.

> ⚠️ 한 명령 안에서 CS를 byte마다 토글

W25Q32JV는 /CS falling edge에서 명령을 시작하고 rising edge에서 끝냅니다(8절). Page Program(02h)은 명령 전체 동안 /CS를 low로 유지해야 하고, 마지막 바이트의 여덟째 비트 뒤에 /CS를 올리지 않으면 실행되지 않습니다(8.2절). 그래서 위 코드는 명령 전체를 `cs_low()`와 `cs_high()` 사이에 둡니다.

> ⚠️ CS를 내린 뒤에 CPOL을 바꿈

Linux 문서는 host가 target을 선택하기 전에 클럭을 idle 레벨로 두어야 하고, target은 select가 활성화될 때 클럭 레벨을 sample해 극성을 알 수 있다고 적습니다. W25Q32JV 6.1절도 Mode 0과 3의 차이를 /CS edge에서의 CLK 레벨(Mode 0은 low, Mode 3은 high)로 설명합니다. RM0090은 `CPOL`·`CPHA`를 통신 중에 바꾸지 말라고 적으므로(28.5.1), 모드 설정은 `cs_low()` 전에 끝냅니다.

> ⚠️ reset 동안 /CS가 떠 있음

W25Q32JV는 전원 투입·차단 동안 /CS가 VCC 레벨을 따라가야 하고, 이를 위해 /CS에 pull-up 저항을 쓸 수 있다고 적습니다(4.1절, 6.5절). PA4는 reset 뒤 `spi1_init()`이 돌기 전까지 입력(`MODER` reset `0xA800 0000`)이고 pull도 없으므로(`PUPDR` reset `0x6400 0000`, RM0090 8.4.1·8.4.4), 그 동안 /CS를 잡아 주는 것은 보드의 pull-up뿐입니다.

## 정리

- W25Q32JV의 지원 모드는 Mode 0과 3이고 비트 순서는 MSB first입니다. STM32F407 `SPI_CR1`의 reset 값(MSB first, 8비트 프레임) 위에 `CPOL`·`CPHA`를 맞춥니다.
- 한 명령은 CS 한 번의 low 구간입니다. 명령 중간에 CS를 올리지 않습니다.
- SPI1과 W25Q32JV를 3.3 V로 붙이면 읽기 경로의 MISO 타이밍이 fSCK 사양보다 먼저 걸리고, 데이터시트 값으로 통과하는 가장 빠른 분주는 `BR` = `001`입니다.
- 처리량 상한은 SCK/8 바이트/초이고, DMA는 이 상한이 아니라 CPU 부하를 바꿉니다.

다음 편에서는 **I2C 하드웨어**를 다룹니다. 두 선으로 여러 디바이스를 묶는 방법입니다.

## 관련 항목

- [1-04: UART 하드웨어 동작 분석](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- [1-06: I2C 하드웨어 분석](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- [4-08: SPI 드라이버 구현 — Master·Slave·CRC·DMA](/blog/embedded/modern-recipes/part4-08-spi-driver)
- 더 깊이 — [Embedded Performance Engineering: DMA 성능 최적화](/blog/embedded/performance-engineering/part3-03-dma-performance)
