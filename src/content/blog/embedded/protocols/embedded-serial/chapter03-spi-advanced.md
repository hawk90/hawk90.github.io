---
title: "Ch 3: SPI 심화 — Daisy Chain, Dual/Quad/Octal SPI, XIP"
date: 2026-05-16T03:00:00
description: "데이터 라인을 1→2→4→8로 늘려 50 MHz × 8 = 400 MB/s. 모던 MCU의 boot 매체."
series: "Embedded Protocols 심화"
seriesOrder: 3
tags: [spi, qspi, octospi, xip, daisy-chain, flash]
draft: true
---

## 한 줄 요약

> **"라인 수 × 클럭 = 대역폭"** — SPI를 빠르게 만드는 두 방법: 클럭을 올리거나, 데이터 라인을 늘리거나.

## 어떤 문제를 푸는가

기본 SPI는 1 라인 × 50 MHz ≈ **6 MB/s**. 코드 실행용 NOR 플래시에는 부족합니다. Cortex-M7 ~ 500 MHz로 도는데 코드를 6 MB/s로 읽으면 *대기*만 하다 끝납니다.

해결책은 **데이터 라인을 늘리기**. Dual(2 lane), Quad(4 lane), Octal(8 lane)로 가면서 같은 클럭에 2-8배 처리량.

## 한눈에 보는 구조

![SPI advanced — daisy and QSPI](/images/blog/embedded-serial/diagrams/ch03-spi-advanced.svg)

왼쪽이 **daisy chain** (CS 하나 공유), 오른쪽이 **QSPI** (1 마스터 + 1 슬레이브에 4 데이터 라인).

## Multi-slave 두 토폴로지

### Independent CS (표준)

각 슬레이브가 별개의 CS 핀. 마스터가 *N개 CS 핀* 필요. 기본 모드, 데이터 라인 (SCLK/MOSI/MISO)은 공유.

| 장점 | 단점 |
| --- | --- |
| 각 슬레이브 *독립* 접근 | CS 핀 다수 소비 |
| 모드 (CPOL/CPHA) 슬레이브별 다르게 가능 | 보드 라우팅 복잡 |

### Daisy Chain

![SPI daisy chain](/images/blog/embedded-serial/diagrams/ch03-spi-daisy-chain.svg)

슬레이브가 *시프트 레지스터*처럼 연결 — 마스터의 MOSI → S1의 MISO → S2의 MOSI → ... 한 줄로. CS 한 개 공유.

| 장점 | 단점 |
| --- | --- |
| CS 핀 1개 | 모든 슬레이브가 daisy 지원해야 |
| 라우팅 단순 | 한 슬레이브만 읽기 불가 (전체 시프트) |
| LED 드라이버·DAC 어레이에 흔함 | 지연 = N × 1바이트 |

## Dual / Quad / Octal SPI

| 모드 | 데이터 라인 | 대역폭 @ 100 MHz | 흔한 용도 |
| --- | --- | --- | --- |
| Standard (1-1-1) | 1 (MOSI + MISO 분리) | 12.5 MB/s | 일반 SPI 디바이스 |
| Dual (1-1-2) | 2 양방향 | 25 MB/s | 일부 EEPROM |
| Quad (1-1-4) | 4 양방향 | 50 MB/s | **NOR 플래시 표준** |
| Octal (1-1-8) | 8 양방향 | 100 MB/s | 고속 NOR (Cypress, Macronix) |
| Octal DDR | 8 × 2 edges | 200 MB/s | Cortex-M7/H7 XIP 매체 |

표기 `(1-1-4)` — `명령(1) - 주소(1) - 데이터(4)` 라인 수.

### XIP — eXecute In Place

![SPI Flash XIP — Memory-Mapped Mode data flow](/images/blog/embedded-serial/diagrams/ch03-spi-xip-flow.svg)

QSPI/OctSPI 플래시를 **CPU 주소 공간에 매핑**해 코드를 직접 fetch. RAM 복사 없이 실행. 단점은 fetch latency가 RAM보다 길어 *캐시*가 필수.

```text
CPU ── AXI bus ── QSPI controller ── NOR flash
       fetch 0x9000_0000           QSPI cmd: Fast Read Quad I/O
       ← cache line                ← 32B in ~50ns
```

ST Cortex-M7 보드 (STM32H7)에서 `0x9000_0000` 영역을 QSPI flash로 매핑하는 게 표준 패턴.

### Memory-Mapped Mode

QSPI 컨트롤러가 모든 SPI 트랜잭션을 *자동*으로 발생시키는 모드. 펌웨어는 마치 RAM처럼 read.

```c
// STM32 HAL — Memory-mapped 모드 진입
QSPI_CommandTypeDef cmd = {0};
cmd.Instruction = 0xEB;  // Fast Read Quad I/O
cmd.AddressMode = QSPI_ADDRESS_4_LINES;
cmd.DataMode = QSPI_DATA_4_LINES;
cmd.AddressSize = QSPI_ADDRESS_24_BITS;
cmd.DummyCycles = 6;

QSPI_MemoryMappedTypeDef mmcfg = {0};
mmcfg.TimeOutPeriod = 0;
mmcfg.TimeOutActivation = QSPI_TIMEOUT_COUNTER_DISABLE;

HAL_QSPI_MemoryMapped(&hqspi, &cmd, &mmcfg);

// 이후 *(uint32_t*)0x90000000 가 flash 첫 워드
```

## SPI Flash 명령 셋 — JEDEC 표준

NOR 플래시 (Winbond·Macronix·Cypress·ISSI 등)는 *JEDEC 표준 명령 셋*. 칩 데이터시트 첫 페이지의 *Command Table*을 보면 거의 동일.

### 필수 명령 7개

| 명령 | 코드 | 동작 |
| --- | --- | --- |
| **RDID** (Read ID) | `0x9F` | 3-byte JEDEC ID (Manufacturer + Memory Type + Capacity) |
| **RDSR** (Read Status) | `0x05` | Status Register (WIP, WEL 등) |
| **WREN** (Write Enable) | `0x06` | 쓰기 전 잠금 해제 |
| **READ** | `0x03` | 일반 Read (≤ 50 MHz) |
| **Fast READ** | `0x0B` | 한 dummy byte 후 read (100+ MHz) |
| **PP** (Page Program) | `0x02` | 256 byte 페이지 쓰기 |
| **SE** (Sector Erase) | `0x20` | 4 KB sector erase |
| **BE** (Block Erase) | `0xD8` | 64 KB block erase |
| **CE** (Chip Erase) | `0xC7` | 전체 erase |

### 한 트랜잭션 예 — JEDEC ID 읽기

```text
CS Low
MOSI: 0x9F  0x00  0x00  0x00
MISO: --    MFR   TYPE  CAP
CS High
```

예 — Winbond W25Q128: MFR=0xEF, TYPE=0x40, CAP=0x18 (16 MB).

### 쓰기 흐름 — WREN → PP → 폴링

```c
// 1. Write Enable
cs_low();
spi_xfer(0x06);    // WREN
cs_high();

// 2. Page Program (256 byte 한 페이지)
cs_low();
spi_xfer(0x02);                       // PP
spi_xfer((addr >> 16) & 0xFF);        // 24-bit 주소
spi_xfer((addr >> 8) & 0xFF);
spi_xfer(addr & 0xFF);
for (int i = 0; i < 256; i++)
    spi_xfer(data[i]);
cs_high();

// 3. WIP 비트 폴링 — write 완료 대기
do {
    cs_low();
    spi_xfer(0x05);                   // RDSR
    uint8_t sr = spi_xfer(0x00);
    cs_high();
    if ((sr & 0x01) == 0) break;      // WIP = 0
} while (1);
```

> ⚠️ **Sector Erase 후에만 Program**. NOR 플래시는 *bit을 0→1 못 함*. erase 없이 program → 일부 비트만 0 됨.

### Quad/Octal SPI 확장 명령

- `0x32` — Quad Page Program
- `0xEB` — Fast Read Quad I/O (1-1-4 또는 4-4-4)
- `0xE7` — Fast Read Quad I/O (no dummy)
- `0x77` — Set Burst with Wrap (XIP)

벤더마다 *세부 차이* 있어 데이터시트 *Command Set Reference* 필수.

## DMA 활용

대용량 전송은 DMA에 맡깁니다. 마스터 SPI + DMA TX/RX 채널 두 개로 설정.

```c
HAL_SPI_TransmitReceive_DMA(&hspi1, tx_buf, rx_buf, 256);
// 256 바이트 전송 동안 CPU는 다른 작업
// 끝나면 HAL_SPI_TxRxCpltCallback() 호출
```

### Half-duplex vs Full-duplex DMA

- **Full-duplex DMA** — TX/RX 동시 — 2 DMA 채널 필요.
- **TX-only / RX-only** — 한 방향만 — 1 채널.
- 일부 SPI 페리퍼럴은 단방향만 지원 (확인 필요).

## 실 회로 예 — W25Q128 SPI Flash

![SPI Flash circuit (CircuiTikZ)](/images/blog/embedded-serial/diagrams/ch03-spi-flash-circuit.svg)

100 nF + 10 µF 디커플링 캡을 IC VCC 핀 ≤ 5 mm 근접 배치. /WP·/HOLD 안 쓰면 풀업으로 *High 고정*. CS는 *MCU GPIO* 외에 풀업 추가로 *부팅 중 idle High* 보장.

## 보드 레이아웃 주의

SPI는 single-ended고 고속이면 *반사*와 *크로스토크*에 약합니다.

| 주의 | 대책 |
| --- | --- |
| 데이지 체인이 짧지 않으면 reflection | 종단 저항 (33-100 Ω) |
| SCLK·MOSI/MISO 인접 라우팅 | 거리 ≥ 3W (트레이스 폭의 3배) |
| 100 MHz 이상 single-ended는 EMI 약함 | 그라운드 차폐 |
| QSPI 4 라인 트레이스 길이 mismatch | matched length ≤ ±5 mm |

QSPI 100 MHz 보드는 *PCB 노하우*가 결정합니다.

## 자주 하는 실수

> ⚠️ Daisy chain인데 modes 섞기

daisy의 모든 슬레이브는 **같은 SPI 모드**여야 합니다. 한 슬레이브만 다르면 비트가 깨집니다.

> ⚠️ QSPI Dummy cycles 누락

Fast Read 명령은 명령+주소 후 *N dummy cycles* 후 데이터 시작. 데이터시트 값 (보통 4·6·8) 정확히 설정 안 하면 *주소 + dummy 일부가 데이터로 해석*됩니다.

> ⚠️ XIP 진입 후 erase 시도

Memory-Mapped 모드 진입 후 erase·write 명령을 보내려면 *Indirect mode 복귀* 후 가능. 실수 시 *코드 fetch 멈춤* → CPU 행.

## 정리

- **Daisy chain**으로 CS 핀 절약, **Independent CS**가 표준.
- **Quad/Octal SPI**가 NOR 플래시·MCU XIP의 표준 인터페이스.
- **Memory-mapped mode**가 XIP의 핵심 메커니즘.
- DMA + Full-duplex로 처리량 최대.
- 고속 SPI는 *보드 레이아웃이 결정*. 트레이스 길이 매칭 필수.

다음 편은 **I²C 기초** — 2-wire, open-drain, start/stop, ACK.

## 관련 항목

- [Ch 2: SPI 기초](/blog/embedded/protocols/embedded-serial/chapter02-spi-basics)
- [Ch 4: I²C 기초](/blog/embedded/protocols/embedded-serial/chapter04-i2c-basics)
