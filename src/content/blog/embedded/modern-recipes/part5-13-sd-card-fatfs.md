---
title: "SD 카드 SPI 모드 + FatFs — 초기화·diskio 포팅·다중 블록 쓰기와 f_sync"
slug: "embedded/modern-recipes/part5-13-sd-card-fatfs"
date: 2026-04-14T10:01:00
description: "STM32F407 SPI1에서 SD 카드를 SPI 모드로 초기화하고 FatFs R0.16의 disk I/O 함수에 연결합니다. 다중 블록 쓰기와 f_sync 주기가 카드 쓰기 횟수와 전원 차단 때 잃는 데이터에 주는 영향도 다룹니다."
series: "Modern Embedded Recipes"
seriesOrder: 61
tags: [recipes, peripheral, sd, fatfs]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SD 카드를 SPI 모드로 초기화(CMD0 → CMD8 → ACMD41 → CMD58)하고 FatFs의 disk I/O 함수 다섯 개에 연결하면, MCU가 쓴 FAT 볼륨을 PC에서 그대로 읽을 수 있습니다."** 카드 쓰기 횟수를 줄이려면 `disk_write`가 다중 블록 쓰기(CMD25)를 써야 하고, 전원이 끊기면 열려 있던 파일에서 보통 마지막 `f_sync` 이후에 쓴 데이터를 잃고, FatFs 앱노트가 말하는 critical section에서 끊기면 파일이 처음 상태로 돌아가는 식으로 그보다 많이 잃을 수 있습니다.

## 어떤 상황에서 쓰나

MCU가 기록하고 PC가 읽는 파일이 필요할 때 씁니다. 데이터 로거가 대표적이고, 아래 "쓰기 횟수와 전원 차단" 절은 로거처럼 파일을 오래 열어 두고 쓰는 경우의 선택을 다룹니다.

이 글은 SD 카드를 SPI 모드로만 구현합니다. SD 모드(1-bit·4-bit)와는 표 하나로 비교하고 초기화 코드는 다루지 않습니다.

이 글의 기준 환경은 앞 편들과 같습니다. MCU는 STM32F407이고 클럭은 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 `clock_init_168mhz()`(PCLK2 = 84 MHz), SPI는 [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)의 SPI1(PA5 SCK, PA6 MISO, PA7 MOSI, PA4 CS), 1 ms tick은 [4-06: SysTick](/blog/embedded/modern-recipes/part4-06-systick-timer)의 `millis()`입니다.

출처: [SD Physical Layer Simplified Specification Version 9.10](https://www.sdcard.org/downloads/pls/)(Part 1, 2023-12-01), [FatFs R0.16](http://elm-chan.org/fsw/ff/) 배포본 [ff16.zip](http://elm-chan.org/fsw/ff/arc/ff16.zip), FatFs 예제 드라이버 [ffsample.zip](http://elm-chan.org/fsw/ff/ffsample.zip)의 `stm32/mmc_stm32f1_spi.c`, [RM0090 Rev 22](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf). 아래 절 번호는 이 판들의 번호입니다.

## 핵심 개념

### SPI 모드와 SD 모드

| 항목 | SPI 모드 | SD 모드 1-bit | SD 모드 4-bit |
|------|---------|---------------|---------------|
| 신호선(전원 제외) | 4: CS, DI, SCLK, DO | 3: CLK, CMD, DAT0 | 6: CLK, CMD, DAT0~3 |
| Default Speed(25 MHz)에서 데이터 원시 상한 | 25 Mbit/s = 3.125 MB/s | 3.125 MB/s | 12.5 MB/s |
| 호스트 | 범용 SPI 주변장치 | SD 버스 프로토콜을 처리하는 호스트 | 같음 |

신호선은 사양 3.7.1절 Table 3-1, 25 MHz와 4-bit 12.5 MB/s는 2장(System Features)의 Default Speed 항목입니다. SPI 모드의 버스 타이밍은 SD 모드와 같다고 7.8절이 정하므로 같은 25 MHz를 썼고, 데이터선이 하나라 원시 상한은 25 Mbit/s ÷ 8 = 3.125 MB/s입니다. 명령·토큰·CRC·busy 시간이 빠지기 전의 값입니다.

7.1절은 SPI 모드의 장점을 범용 호스트를 쓸 수 있다는 점으로, 단점을 데이터선 하나에서 오는 성능 손실로 적습니다. 같은 절에 따라 SDUC 카드(2 TB 초과)는 SPI 모드를 지원하지 않습니다. 이 글은 범용 SPI만 있는 MCU에서 SDSC·SDHC·SDXC 카드를 쓰는 경우를 다룹니다.

### SPI 모드 초기화 순서

사양 7.2.1절 Figure 7-2의 흐름을 이 글 코드가 따르는 단계로 옮기면 다음과 같습니다.

| 단계 | 명령 | 이 글 코드의 판정 | 사양 |
|------|------|------------------|------|
| 1 | CS high로 클럭 74개 이상 | 0xFF 10바이트 = 80클럭 | 6.4.1.1절 |
| 2 | CMD0, CS low | R1 = `0x01`(idle)이면 SPI 모드 진입. CRC는 `0x95` 고정 | 7.2.1절, 7.2.2절 |
| 3 | CMD8, 인자 `0x1AA` | R1 = `0x01`이고 R7 echo가 `0x01`·`0xAA`면 Ver2.00 이상, R1 = `0x05`(idle + illegal command)면 Ver1.X 또는 SD 카드가 아님 | 7.2.1절, 7.3.2.6절 |
| 4 | CMD55 + ACMD41 반복 | R1 = `0x00`이 될 때까지. Ver2.00 이상이면 HCS(bit 30) = 1. 첫 ACMD41부터 1100 ms가 지나도 `0x00`이 아니면 실패 | 7.2.1절, 4.2.3절 |
| 5 | CMD58(Ver2.00 이상만) | OCR bit 30(CCS) = 1이면 SDHC/SDXC, 명령 인자가 512바이트 블록 주소. 0이면 SDSC, 바이트 주소 | 7.2.1절, 5.1절 Table 5-1, 4.3.14절 |
| 6 | CMD16, 인자 512(SDSC만) | SDHC/SDXC는 블록 길이가 512바이트로 고정 | 7.2.3절 |

ACMD41 반복 동안의 클럭에는 사양 4.4절의 제한이 있습니다. 호스트는 100~400 kHz 클럭을 계속 주거나, 클럭을 멈춘다면 ACMD41을 50 ms보다 짧은 간격으로 다시 보내야 합니다. 아래 코드는 초기화 전체를 84 MHz ÷ 256 = 328.125 kHz SCLK로 돌리고, ready 대기와 R1 대기 중에도 `0xFF`를 보내며 클럭을 주므로 SCLK가 서는 구간은 바이트 사이의 CPU 실행뿐입니다. ACMD41은 지연 없이 다시 보내므로, 카드가 ready 확인을 첫 바이트에 통과시키면 CMD55와 ACMD41 한 쌍은 많아야 34바이트(명령마다 ready 확인 1바이트, 명령 6바이트, R1 대기 10바이트) = 272클럭 = 0.83 ms 간격입니다. CMD8의 CRC는 항상 검사되므로 `0x87`을 정확히 넣어야 합니다(7.2.2절).

### FatFs가 요구하는 함수

FatFs R0.16 앱노트의 Required Functions 표에 따르면 `disk_status`·`disk_initialize`·`disk_read`는 항상 필요하고, 쓰기를 켠 구성(`FF_FS_READONLY == 0`)에서는 `disk_write`와 `disk_ioctl`(`CTRL_SYNC`), `get_fattime`이 더 필요합니다. 쓰기 구성에서 구현할 disk I/O 함수는 다섯 개이고, 시각 함수 `get_fattime`은 `FF_FS_NORTC = 1`이면 빠집니다. 프로토타입은 R0.16 `diskio.h`와 같습니다.

```c
DSTATUS disk_initialize(BYTE pdrv);
DSTATUS disk_status(BYTE pdrv);
DRESULT disk_read(BYTE pdrv, BYTE *buff, LBA_t sector, UINT count);
DRESULT disk_write(BYTE pdrv, const BYTE *buff, LBA_t sector, UINT count);
DRESULT disk_ioctl(BYTE pdrv, BYTE cmd, void *buff);
```

같은 표에서 `disk_ioctl`의 다른 명령은 조건부입니다. `GET_SECTOR_COUNT`·`GET_BLOCK_SIZE`는 `FF_USE_MKFS == 1`, `GET_SECTOR_SIZE`는 `FF_MAX_SS != FF_MIN_SS`, `CTRL_TRIM`은 `FF_USE_TRIM == 1`일 때만 쓰입니다. R0.16 `ffconf.h` 기본값은 `FF_USE_MKFS = 0`, `FF_MIN_SS = FF_MAX_SS = 512`, `FF_USE_TRIM = 0`이므로 이 글은 `CTRL_SYNC`만 구현합니다.

## 코드 예제

### 1. 명령 전송과 초기화

SPI 바이트 전송은 4-08의 "Polling transfer" 절에 있는 `spi_xfer8()`을 쓰고, SPI1과 GPIOA 클럭 enable과 핀 설정도 그 글의 `spi_init_master()`가 이미 했다고 봅니다. SCLK 분주는 SPI_CR1의 BR[2:0]으로 바꿉니다(RM0090 28.5.1절: `111` = fPCLK/256, `001` = fPCLK/4). PCLK2 = 84 MHz에서 저속은 328.125 kHz, 고속은 21 MHz로 Default Speed 25 MHz 이하입니다. 같은 절은 BR을 통신 중에 바꾸지 말라고 하므로 BSY가 내려간 뒤 씁니다.

```c
#include <stdint.h>
#include "stm32f4xx.h"                  // CMSIS device header, build with -DSTM32F407xx

#define CS_LOW()  (GPIOA->BSRR = (1u << (4 + 16)))
#define CS_HIGH() (GPIOA->BSRR = (1u << 4))

uint8_t  spi_xfer8(uint8_t tx);         // 4-08
uint32_t millis(void);                  // 4-06

static void spi_set_br(uint32_t br) {   // RM0090 28.5.1 SPI_CR1.BR[2:0]
    while (SPI1->SR & SPI_SR_BSY) { }
    SPI1->CR1 = (SPI1->CR1 & ~SPI_CR1_BR) | (br << SPI_CR1_BR_Pos);
}
static void spi_set_speed_low(void)  { spi_set_br(7u); }   // 84 MHz / 256 = 328.125 kHz
static void spi_set_speed_high(void) { spi_set_br(1u); }   // 84 MHz / 4 = 21 MHz

static int sd_block_addressing;         // 1: SDHC/SDXC (LBA), 0: SDSC (byte address)

static int sd_wait_ready(uint32_t ms) {
    uint32_t t0 = millis();
    while (spi_xfer8(0xFF) != 0xFF) {           // DO held low while busy
        if (millis() - t0 >= ms) return -1;
    }
    return 0;
}

static uint8_t sd_cmd(uint8_t cmd, uint32_t arg, uint8_t crc) {
    if (sd_wait_ready(500) < 0) return 0xFF;
    spi_xfer8(0x40 | cmd);
    spi_xfer8(arg >> 24);
    spi_xfer8(arg >> 16);
    spi_xfer8(arg >> 8);
    spi_xfer8(arg);
    spi_xfer8(crc);

    uint8_t r = 0xFF;
    for (int i = 0; i < 10; i++) {               // R1: up to 10 bytes
        r = spi_xfer8(0xFF);
        if ((r & 0x80) == 0) break;
    }
    return r;                                    // bit 7 set: no response
}

int sd_init(void) {                              // 1: SDHC/SDXC, 0: SDSC, -1: fail
    int v2, sdhc = 0;
    uint8_t r, r7[4];
    uint32_t t0, ocr = 0;

    spi_set_speed_low();
    CS_HIGH();
    for (int i = 0; i < 10; i++) spi_xfer8(0xFF);      // 80 clocks

    CS_LOW();
    if (sd_cmd(0, 0, 0x95) != 0x01) goto fail;         // CMD0

    r = sd_cmd(8, 0x1AA, 0x87);                         // CMD8
    if (r == 0x01) {
        for (int i = 0; i < 4; i++) r7[i] = spi_xfer8(0xFF);
        if (r7[2] != 0x01 || r7[3] != 0xAA) goto fail; // voltage / check pattern
        v2 = 1;
    } else if (r == 0x05) {
        v2 = 0;
    } else {
        goto fail;
    }

    sd_cmd(55, 0, 0xFF);
    r = sd_cmd(41, v2 ? (1u << 30) : 0, 0xFF);          // first ACMD41
    t0 = millis();                                      // 4.2.3: count from the first ACMD41
    while (r != 0x00) {                                 // ACMD41 until R1 = 0x00
        if (millis() - t0 > 1100) goto fail;            // timeout must exceed 1 s
        sd_cmd(55, 0, 0xFF);
        r = sd_cmd(41, v2 ? (1u << 30) : 0, 0xFF);
    }

    if (v2) {
        if (sd_cmd(58, 0, 0xFF) != 0x00) goto fail;     // CMD58
        for (int i = 0; i < 4; i++) ocr = (ocr << 8) | spi_xfer8(0xFF);
        sdhc = (ocr >> 30) & 1;                         // CCS
    }
    if (!sdhc && sd_cmd(16, 512, 0xFF) != 0x00) goto fail;

    sd_block_addressing = sdhc;
    CS_HIGH();
    spi_xfer8(0xFF);
    spi_set_speed_high();
    return sdhc;

fail:
    CS_HIGH();
    spi_xfer8(0xFF);
    return -1;
}
```

명령마다 먼저 카드가 busy가 아닌지(DO = `0xFF`) 500 ms까지 기다리고, R1은 최대 10바이트까지 기다립니다. 두 값은 FatFs 예제 드라이버의 `select()`·`send_cmd()`에서 가져왔고, 응답 대기 바이트 수(N_CR)를 정하는 사양 7.5절 타이밍 표는 Simplified 판에서 빠져 있습니다. 단계마다 시간 제한을 둔 이유는 카드가 없거나 응답하지 않을 때 `sd_init()`이 멈추지 않고 -1을 돌려주게 하려는 것입니다.

ACMD41 제한은 사양 4.2.3절이 정합니다. 카드는 첫 ACMD41부터 1초 안에 초기화를 끝내야 하고, 호스트는 첫 ACMD41부터 세어 1초보다 긴 timeout을 둬야 합니다. 그래서 코드는 첫 ACMD41의 응답을 받은 뒤 `t0`를 잡고, 1 ms tick으로 재도 1초를 넘도록 100 ms 여유를 둔 `> 1100`으로 비교합니다.

### 2. 블록 읽기와 쓰기

단일 블록 읽기는 CMD17, 단일 블록 쓰기는 CMD24, 다중 블록 쓰기는 CMD25입니다(7.2.3절, 7.2.4절). 시작 토큰은 읽기와 단일 쓰기가 `0xFE`, 다중 쓰기가 블록마다 `0xFC`이고, 다중 쓰기는 Stop Tran 토큰 `0xFD`로 끝냅니다. 카드는 받은 블록마다 data response 토큰을 돌려주며 하위 5비트가 `0b00101`(`0x05`)이면 수락입니다(7.3.3절).

```c
int sd_read_block(uint32_t lba, uint8_t *buf) {
    uint32_t arg = sd_block_addressing ? lba : lba * 512u;
    uint32_t t0;
    uint8_t tok;

    CS_LOW();
    if (sd_cmd(17, arg, 0xFF) != 0x00) goto fail;

    t0 = millis();
    while ((tok = spi_xfer8(0xFF)) == 0xFF) {           // wait for start block token
        if (millis() - t0 >= 100) goto fail;
    }
    if (tok != 0xFE) goto fail;                         // data error token

    for (int i = 0; i < 512; i++) buf[i] = spi_xfer8(0xFF);
    spi_xfer8(0xFF); spi_xfer8(0xFF);                   // CRC16, not checked
    CS_HIGH();
    spi_xfer8(0xFF);
    return 0;

fail:
    CS_HIGH();
    spi_xfer8(0xFF);
    return -1;
}

static int sd_send_block(const uint8_t *buf, uint8_t token) {
    spi_xfer8(token);
    for (int i = 0; i < 512; i++) spi_xfer8(buf[i]);
    spi_xfer8(0xFF); spi_xfer8(0xFF);                   // dummy CRC
    if ((spi_xfer8(0xFF) & 0x1F) != 0x05) return -1;    // not accepted
    return sd_wait_ready(1000);                         // programming busy
}

int sd_write_blocks(uint32_t lba, const uint8_t *buf, uint32_t n) {
    uint32_t arg = sd_block_addressing ? lba : lba * 512u;
    int rc = 0;

    CS_LOW();
    if (n == 1) {
        if (sd_cmd(24, arg, 0xFF) != 0x00 || sd_send_block(buf, 0xFE) < 0) rc = -1;
    } else if (sd_cmd(25, arg, 0xFF) != 0x00) {
        rc = -1;
    } else {
        for (uint32_t i = 0; i < n && rc == 0; i++) {
            if (sd_send_block(buf + i * 512u, 0xFC) < 0) rc = -1;
        }
        if (rc == 0) {
            spi_xfer8(0xFD);                            // Stop Tran
            if (sd_wait_ready(1000) < 0) rc = -1;       // may end before busy starts; see sd_sync()
        } else {
            sd_cmd(12, 0, 0xFF);                        // error during CMD25: stop with CMD12
        }
    }
    CS_HIGH();
    spi_xfer8(0xFF);
    return rc;
}

int sd_sync(void) {                                     // wait until the card releases DO
    int rc;

    CS_LOW();
    spi_xfer8(0xFF);
    rc = sd_wait_ready(1000);
    CS_HIGH();
    spi_xfer8(0xFF);
    return rc;
}
```

시간 제한은 사양 4.6.2절에서 왔습니다. 읽기는 SDHC/SDXC에 100 ms(최소)를 쓰라고 하고, SDSC에는 TAAC·NSAC 합의 100배와 100 ms 중 작은 값을 정하므로(4.6.2.1절) 위 코드는 모든 카드에 100 ms를 씁니다. 쓰기 busy는 카드가 250 ms 최대를 표시해도 500 ms보다 긴 제한을 강하게 권하므로(4.6.2.2절) 위 코드는 쓰기 busy에 1000 ms를 씁니다. 다중 블록 쓰기 중 CRC 오류나 Write Error가 나면 CMD12로 전송을 멈추라는 규칙은 7.3.3.1절에 있습니다.

Stop Tran 뒤 busy가 몇 바이트 뒤에 시작하는지 정하는 타이밍(7.5.3절)은 Simplified 판에서 빠져 있습니다. 그래서 `0xFD` 직후 첫 바이트가 `0xFF`면 `sd_write_blocks`의 대기는 busy가 시작되기 전에 끝납니다. 마지막 블록의 프로그래밍이 끝났는지는 카드를 다시 선택해 ready를 기다리는 `sd_sync()`가 확인하고, FatFs는 이것을 `CTRL_SYNC`로 부릅니다. FatFs 예제 드라이버도 `CTRL_SYNC`에서 같은 방식(`select()`)으로 기다립니다.

### 3. FatFs diskio.c

```c
#include <stdint.h>
#include "ff.h"
#include "diskio.h"

int sd_init(void);
int sd_read_block(uint32_t lba, uint8_t *buf);
int sd_write_blocks(uint32_t lba, const uint8_t *buf, uint32_t n);
int sd_sync(void);

static DSTATUS stat = STA_NOINIT;

DSTATUS disk_initialize(BYTE pdrv) {
    if (pdrv != 0) return STA_NOINIT;
    stat = (sd_init() < 0) ? STA_NOINIT : 0;
    return stat;
}

DSTATUS disk_status(BYTE pdrv) {
    return (pdrv != 0) ? STA_NOINIT : stat;
}

DRESULT disk_read(BYTE pdrv, BYTE *buf, LBA_t lba, UINT n) {
    if (pdrv != 0 || n == 0) return RES_PARERR;
    if (stat & STA_NOINIT) return RES_NOTRDY;
    for (UINT i = 0; i < n; i++) {
        if (sd_read_block((uint32_t)(lba + i), buf + i * 512u) < 0) return RES_ERROR;
    }
    return RES_OK;
}

DRESULT disk_write(BYTE pdrv, const BYTE *buf, LBA_t lba, UINT n) {
    if (pdrv != 0 || n == 0) return RES_PARERR;
    if (stat & STA_NOINIT) return RES_NOTRDY;
    return (sd_write_blocks((uint32_t)lba, buf, n) < 0) ? RES_ERROR : RES_OK;
}

DRESULT disk_ioctl(BYTE pdrv, BYTE cmd, void *buf) {
    (void)buf;
    if (pdrv != 0) return RES_PARERR;
    if (stat & STA_NOINIT) return RES_NOTRDY;
    if (cmd == CTRL_SYNC) return (sd_sync() < 0) ? RES_ERROR : RES_OK;
    return RES_PARERR;
}

DWORD get_fattime(void) {                   // fixed 2026-01-01 00:00:00 until an RTC is wired
    return ((DWORD)(2026 - 1980) << 25) | ((DWORD)1 << 21) | ((DWORD)1 << 16);
}
```

카드 감지 핀을 읽지 않으므로 카드를 바꾸면 애플리케이션이 `f_mount`로 다시 마운트해야 합니다(FatFs `disk_status` 문서). `disk_write`는 `n > 1`이면 CMD25 한 번으로 보냅니다. 왜 그래야 하는지는 아래 "다중 블록 쓰기" 절에 있습니다. 반면 `disk_read`는 블록마다 CMD17을 보내 코드를 짧게 두었습니다. 여러 블록을 명령 하나로 읽으려면 CMD18로 시작해 CMD12로 멈추는 다중 블록 읽기(7.2.3절)를 쓰고, FatFs 예제 드라이버의 `disk_read`가 그렇게 합니다.

`get_fattime`의 비트 배치는 FatFs 문서의 형식(bit 31:25 = 1980년부터의 연도, 24:21 = 월, 20:16 = 일, 15:11 = 시, 10:5 = 분, 4:0 = 초 ÷ 2)을 따릅니다. RTC가 없어도 유효한 시각을 돌려줘야 하므로 위처럼 고정값을 쓰고, 시각을 넣지 않으려면 `FF_FS_NORTC = 1`로 이 함수를 뺍니다.

### 4. 사용 예 — 마운트, 쓰기, 읽기

```c
#include <stdio.h>
#include "ff.h"

static FATFS fs;

int sd_demo(void) {
    FIL fp;
    UINT bw, br;
    char line[64];
    FRESULT fr, fc;

    fr = f_mount(&fs, "", 1);                   // opt = 1: mount now and report errors
    if (fr != FR_OK) { printf("f_mount: %d\n", fr); return -1; }

    fr = f_open(&fp, "log.txt", FA_CREATE_ALWAYS | FA_WRITE);
    if (fr != FR_OK) { printf("f_open(w): %d\n", fr); return -1; }
    fr = f_write(&fp, "Hello, SD!\n", 11, &bw);
    fc = f_close(&fp);
    if (fr == FR_OK) fr = fc;
    if (fr != FR_OK || bw != 11) { printf("write: %d, %u\n", fr, bw); return -1; }

    fr = f_open(&fp, "log.txt", FA_READ);
    if (fr != FR_OK) { printf("f_open(r): %d\n", fr); return -1; }
    fr = f_read(&fp, line, sizeof(line) - 1, &br);
    f_close(&fp);
    if (fr != FR_OK) { printf("f_read: %d\n", fr); return -1; }
    line[br] = 0;
    printf("Read: %s", line);
    return 0;
}
```

## 동작 확인

PC에서 카드를 FAT32로 포맷하고 보드에 꽂아 `sd_demo()`를 부릅니다. 직렬 출력과 PC에서 본 결과로 다음처럼 판정합니다.

| 관찰 | 판정 | 볼 곳 |
|------|------|------|
| `Read: Hello, SD!`가 나오고, 카드를 PC에 꽂으면 `log.txt` 내용이 `Hello, SD!` 한 줄 | 합격 | — |
| `f_mount: 3` (`FR_NOT_READY`) | 실패: `disk_initialize`가 준비되지 않았다고 보고 | `sd_init()`의 어느 단계에서 `fail`로 갔는지 |
| `f_mount: 13` (`FR_NO_FILESYSTEM`) | 실패: 유효한 FAT 볼륨을 찾지 못함 | 카드 포맷, 또는 하위 계층 구현(블록·바이트 주소 변환 포함) |
| `f_mount: 1` 또는 `write: 1, …` (`FR_DISK_ERR`) | 실패: `disk_read`·`disk_write`·`disk_ioctl`이 `RES_ERROR`를 돌려줌 | `sd_read_block`·`sd_write_blocks`·`sd_sync`의 시간 제한과 토큰 |

반환 코드 값은 R0.16 `ff.h`의 `FRESULT` 열거, 원인 설명은 FatFs 반환 코드 문서에서 옮겼습니다.

## 쓰기 횟수와 전원 차단

### 다중 블록 쓰기

FatFs 앱노트의 "Considerations on Flash Memory Media" 절은 단일 섹터 쓰기에서 플래시 매체의 쓰기 처리량이 가장 나쁘고, 이 차이는 빠른 인터페이스일수록 더 크게 나타나 성능 비가 10을 넘는 경우가 많다고 적습니다. SPI 모드는 위 표에서 원시 상한이 3.125 MB/s로 SD 모드 1-bit와 함께 가장 낮은 인터페이스이므로, 이 글의 구성에서 10배를 기대할 근거는 이 문장에 없습니다. 같은 절에는 쓰기 트랜잭션 수가 매체 수명에도 영향을 준다는 근거가 따로 있습니다. Figure 6에서 같은 양을 쓸 때 단일 섹터 쓰기가 매체를 다중 섹터 쓰기보다 16배 더 소모했고, 앱노트는 다중 섹터 쓰기 요청을 단일 섹터 트랜잭션으로 쪼개지 말라고 적습니다. 위 `disk_write`가 `n > 1`을 CMD25 한 번으로 보내는 이유입니다.

드라이버가 CMD25를 지원해도 FatFs가 `n > 1`로 부르는 것은 애플리케이션이 큰 덩어리로 쓸 때뿐입니다. R0.16 `f_write`는 파일 위치가 섹터 경계에 있고 남은 쓰기 길이가 섹터 크기 이상이면, 그 섹터들을 클러스터 경계까지 `disk_write` 한 번으로 바로 넘깁니다. 그래서 512바이트씩 `f_write`하면 `disk_write`는 매번 `n = 1`로 불리고, 클러스터가 한 섹터인 볼륨에서는 큰 덩어리로 써도 `n = 1`입니다. 앱노트도 쓰기 단위를 섹터 크기의 배수로, 가장 좋게는 클러스터 크기로 맞추라고 권합니다.

다음 코드는 같은 512 KiB를 512바이트 단위와 16 KiB 단위로 써서 시간을 비교하고, 볼륨의 클러스터 크기(`csize`, 섹터 수)를 함께 출력합니다.

```c
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "ff.h"

uint32_t millis(void);                         // 4-06

#define TOTAL (512u * 1024u)

static BYTE wbuf[16384];

void write_bench(UINT chunk) {                 // chunk: 512 or 16384
    FIL fp;
    UINT bw;
    uint32_t t0, ms, done;

    memset(wbuf, 0xA5, sizeof(wbuf));
    if (f_open(&fp, "bench.bin", FA_CREATE_ALWAYS | FA_WRITE) != FR_OK) return;
    t0 = millis();
    for (done = 0; done < TOTAL; done += chunk) {
        if (f_write(&fp, wbuf, chunk, &bw) != FR_OK || bw != chunk) break;
    }
    f_sync(&fp);
    ms = millis() - t0;
    printf("csize %u, chunk %u B: %lu bytes in %lu ms\n",
           (unsigned)fp.obj.fs->csize, chunk, (unsigned long)done, (unsigned long)ms);
    f_close(&fp);
}
```

`write_bench(512)`와 `write_bench(16384)`를 차례로 부르고 두 줄을 비교합니다.

| 관찰 | 판정 | 볼 곳 |
|------|------|------|
| 두 줄 모두 `524288 bytes`, `csize`가 2 이상, 16384 B 줄의 ms가 512 B 줄보다 작음 | 합격: 16 KiB 쪽에서 `disk_write`가 `n > 1`로 불려 CMD25 경로를 탐 | — |
| `csize 1` | 판정 불가: 이 볼륨에서는 16 KiB로 써도 `disk_write`가 늘 `n = 1` | PC에서 할당 단위를 키워 다시 포맷 |
| `csize`가 2 이상인데 16384 B 줄이 더 짧지 않음 | 실패 | `disk_write`에 중단점을 걸어 `n > 1`로 불리는지, `sd_write_blocks`가 CMD25 분기로 들어가는지 |
| `524288`보다 작은 bytes | 실패: `f_write`가 중간에 멈춤 | `FR_DISK_ERR`이면 위 "동작 확인" 표의 마지막 행 |

### f_sync 주기

FatFs 앱노트의 "Critical Section" 절에 따르면 쓰기 도중 전원이 끊기면 FAT 구조가 깨질 수 있습니다. 앱노트는 그 위험을 줄이는 방법으로 파일을 쓰기 모드로 여는 시간을 줄이거나 `f_sync`를 쓰라고 하고, `f_sync` 문서는 끊긴 시점에서 마지막 `f_sync` 뒤에 쓴 데이터를 잃는다고 그립니다. 다만 `f_sync`는 critical section을 줄일 뿐 없애지 않습니다. 앱노트에 따르면 남은 구간에서 끊기면 cross link로 바뀌던 객체를 잃거나, 덧붙이던 파일이 처음 상태로 돌아갈 수 있습니다. 아래 셈은 이런 경우를 뺀 보통의 손실입니다.

`f_sync`에는 쓰기 비용이 따릅니다. R0.16 `f_sync`는 파일이 바뀌었으면 캐시된 데이터 섹터가 더럽혀져 있을 때 그 섹터를, 그리고 디렉터리 엔트리 섹터를 각각 `disk_write(…, 1)`로 씁니다. 마지막 sync 뒤에 클러스터를 새로 잡았으면 FAT 섹터(FAT가 둘이면 두 섹터)와 FAT32의 FSInfo 섹터도 단일 섹터로 씁니다. `f_sync` 없이 작은 `f_write`만 이어지면 데이터 섹터는 512바이트가 찰 때마다 한 번 쓰입니다.

예를 들어 64바이트 로그 줄을 초당 10줄(640 B/s) 쓰는 로거를 셈해 보면 다음과 같습니다. FAT·FSInfo 쓰기는 빼고 센 최소값입니다.

| `f_sync` 주기 | 데이터·디렉터리 단일 섹터 쓰기 | 전원 차단 때 잃는 양(critical section 밖에서 끊긴 경우) |
|------|------|------|
| 부르지 않음(`f_close`까지) | 640 ÷ 512 = 1.25회/s | 연 뒤에 쓴 전부 |
| 10초마다 | 1.25 + 2 ÷ 10 = 1.45회/s | 10 s × 640 B = 6,400 B |
| 줄마다 | 10 × 2 = 20회/s | 64 B(쓰던 한 줄) |

로거는 파일을 한 번 열어 두고, critical section 밖에서 끊길 때 잃어도 되는 양 ÷ 데이터율로 주기를 정합니다. 위 예에서 6,400바이트까지 잃어도 되면 10초 주기가 되고, 그 대가는 초당 0.2회의 단일 섹터 쓰기입니다.

전원 차단 뒤 마지막 정상 상태로 돌아가는 동작이 필요하면 FAT 대신 [littlefs v2.11.3](https://github.com/littlefs-project/littlefs/blob/v2.11.3/README.md)를 검토합니다. README는 모든 파일 연산이 copy-on-write 보장을 가지고 전원이 끊기면 마지막으로 알려진 정상 상태로 돌아가며, 동적 블록에 대한 wear leveling을 한다고 적습니다. littlefs 볼륨은 FAT가 아니므로 이 글의 전제인 PC와의 FAT 파일 교환은 포기해야 합니다.

## 자주 보는 함정

> ⚠️ SDUC 카드를 꽂으면 `f_mount: 3`

SDUC 카드는 SPI 모드를 지원하지 않고(7.1절), 실패 지점은 두 가지입니다. Figure 7-1 주석에 따라 CS를 low로 둔 CMD0에 SDUC 카드는 응답하지 않으므로 `sd_cmd(0, …)`이 `0xFF`를 돌려주고 `sd_init()`은 CMD0 단계에서 바로 실패합니다. 같은 그림의 각주 (*3)대로 카드가 ACMD41에 busy를 계속 돌려주면 1100 ms 제한에 걸려 실패합니다. 어느 쪽이든 `disk_initialize`가 `STA_NOINIT`을 돌려 `f_mount: 3`(`FR_NOT_READY`)이 나옵니다. 2 TB 이하 카드(SDSC·SDHC·SDXC)를 씁니다.

> ⚠️ 선로 오류가 데이터에 그대로 들어감

SPI 모드는 기본으로 CRC OFF 상태이고(7.2.2절), 이 글 코드는 CMD59로 CRC를 켜지 않으며 읽기 데이터의 CRC16도 버립니다. 7.2.2절은 ACMD41 전에 CRC 검사를 켜라고 권합니다(should). 배선이 길거나 SCLK를 올린 보드에서 깨진 블록을 잡아야 하면 CMD59로 CRC를 켜고, 명령마다 CRC7을, 데이터 블록마다 CRC16을 계산하도록 `sd_cmd`와 블록 함수를 확장합니다.

## 정리

- 주소 단위는 CMD58의 **CCS** 하나로 갈리므로, 블록·바이트 변환은 `sd_read_block`·`sd_write_blocks`의 인자 계산 한 곳에 둡니다.
- 쓰기 완료 확인은 `0xFD` 직후 대기가 아니라 `CTRL_SYNC`에서 카드를 다시 선택해 ready를 기다리는 **`sd_sync()`**에 맡깁니다.
- 애플리케이션은 **클러스터 단위**로 `f_write`해야 `disk_write`의 CMD25 경로가 실제로 쓰입니다.
- 로거의 `f_sync` 주기는 잃어도 되는 양 ÷ 데이터율로 구합니다. 이 손실은 critical section 밖에서 끊긴 경우이고, `f_sync`는 critical section을 줄일 뿐 없애지 않습니다. 줄마다 sync하면 위 예에서 단일 섹터 쓰기가 초당 20회가 됩니다.

다음 편 [5-14: STM32F4 RTC 활용](/blog/embedded/modern-recipes/part5-14-rtc-utilization)은 STM32F407 RTC를 LSE로 돌려 BCD calendar를 읽고 쓰고, alarm·sub-second·tamper·backup register를 설정합니다. 이 글 `get_fattime()`의 고정 시각을 실제 날짜로 바꿀 때 그 calendar 값을 씁니다.

## 관련 항목

- [4-04: 임베디드 클럭 설정 분석](/blog/embedded/modern-recipes/part4-04-clock-setup) — PCLK2 = 84 MHz
- [4-06: SysTick 타이머 활용](/blog/embedded/modern-recipes/part4-06-systick-timer) — `millis()`
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver) — `spi_xfer8()`과 SPI1·CS 핀 설정
- [5-12: Ethernet MAC + PHY](/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy) — 이전 편
- [5-14: STM32F4 RTC 활용](/blog/embedded/modern-recipes/part5-14-rtc-utilization) — 다음 편
