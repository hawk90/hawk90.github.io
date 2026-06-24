---
title: "SD Card + FatFs 구현 — SPI/SDIO 모드·CSD/CID·Wear"
date: 2026-04-14T10:01:00
description: "SPI 모드 vs SDIO·FatFs port·long filename."
series: "Modern Embedded Recipes"
seriesOrder: 61
tags: [recipes, peripheral, sd, fatfs]
draft: false
---

## 한 줄 요약

> **"SD card는 SPI 모드면 어디든 동작합니다. SDIO는 빠르지만 핀이 많고 까다롭습니다."** 위에 FatFs를 얹으면 PC의 FAT32와 호환.

## 어떤 상황에서 쓰나

데이터 로거 (전력, 환경, vehicle), camera image storage, audio recorder, firmware update via SD, configuration file storage — 대용량 영구 저장이 필요할 때. PC와 *직접 file 교환*이 가능한 점이 큰 장점.

이 글은 SD card SPI 모드와 SDIO 모드 init을 다루고, FatFs (open-source FAT filesystem)를 통합합니다.

## 핵심 개념

### SPI 모드 vs SDIO 모드

| 측면 | SPI | SDIO 1-bit | SDIO 4-bit |
|------|-----|------------|------------|
| Wire | 4 | 3 | 6 |
| Speed | ~25 MHz | ~25 MHz | ~50 MHz × 4 = 200 Mbps |
| MCU 요구사항 | 모든 STM32 | SDIO 전용 peripheral | 동상 |
| Code 복잡도 | 단순 | 보통 | 복잡 |

대부분의 application은 SPI로 충분. *오디오·video* 같은 throughput-critical은 SDIO 4-bit.

### SD card init sequence

1. Power-up wait (74 clock cycles, CS high)
2. `CMD0 (GO_IDLE_STATE)` → R1 = `0x01`
3. `CMD8 (SEND_IF_COND)` → check voltage range
   - 응답 `0x01`: V2.0+ card
   - 응답 `0x05`: V1.x card
4. ACMD41 반복까지 R1 = `0x00` (ready)
5. `CMD58 (READ_OCR)` → check CCS bit
   - CCS=1: SDHC/SDXC, block address
   - CCS=0: SDSC, byte address
6. `CMD16 (SET_BLOCKLEN)` = 512 (SPI mode only)

각 단계마다 *response timeout* 처리. 안 그러면 missing card에서 hang.

### Block-level access

SD card는 *512-byte block* 단위 read/write가 표준. FAT filesystem이 위에서 *cluster (4-32 KB)* 단위로 관리.

```text
CMD17 READ_SINGLE_BLOCK
CMD18 READ_MULTIPLE_BLOCK
CMD24 WRITE_BLOCK
CMD25 WRITE_MULTIPLE_BLOCK
```

### FatFs

ChaN의 *FatFs* (free, open-source)가 STM32·AVR·ARM 임베디드의 사실상 표준. *diskio.c*에 4개 함수만 구현하면 됨:

```c
DSTATUS disk_initialize(BYTE pdrv);
DSTATUS disk_status(BYTE pdrv);
DRESULT disk_read(BYTE pdrv, BYTE *buff, LBA_t sector, UINT count);
DRESULT disk_write(BYTE pdrv, const BYTE *buff, LBA_t sector, UINT count);
DRESULT disk_ioctl(BYTE pdrv, BYTE cmd, void *buff);
```

이 4개를 SD card driver에 연결하면 *그 위에 모든 FatFs API*가 동작.

## 코드 예제

### 1. SD SPI driver — 핵심 함수

```c
#define CS_LOW()  GPIOA->BSRR = (1u << (4+16))
#define CS_HIGH() GPIOA->BSRR = (1u << 4)

uint8_t spi_xfer8(uint8_t tx);   // 4-08 참고

static uint8_t sd_cmd(uint8_t cmd, uint32_t arg, uint8_t crc) {
    spi_xfer8(0xFF);
    spi_xfer8(0x40 | cmd);
    spi_xfer8(arg >> 24);
    spi_xfer8(arg >> 16);
    spi_xfer8(arg >> 8);
    spi_xfer8(arg);
    spi_xfer8(crc);

    // R1 response (max 8 tries)
    uint8_t r;
    for (int i = 0; i < 10; i++) {
        r = spi_xfer8(0xFF);
        if ((r & 0x80) == 0) return r;
    }
    return 0xFF;
}

int sd_init(void) {
    CS_HIGH();
    spi_set_speed_low();           // 100-400 kHz
    for (int i = 0; i < 10; i++) spi_xfer8(0xFF);  // 80 clock

    CS_LOW();
    if (sd_cmd(0, 0, 0x95) != 0x01) { CS_HIGH(); return -1; }   // CMD0

    uint8_t r = sd_cmd(8, 0x1AA, 0x87);
    int v2 = (r == 0x01);
    if (v2) {
        for (int i = 0; i < 4; i++) spi_xfer8(0xFF);   // discard 32-bit echo
    }

    // ACMD41
    for (int t = 0; t < 1000; t++) {
        sd_cmd(55, 0, 0xFF);
        if (sd_cmd(41, v2 ? 0x40000000 : 0, 0xFF) == 0x00) break;
        delay_ms(10);
    }

    // CMD58 → CCS bit
    int sdhc = 0;
    if (sd_cmd(58, 0, 0xFF) == 0x00) {
        uint32_t ocr = (spi_xfer8(0xFF) << 24) | (spi_xfer8(0xFF) << 16)
                     | (spi_xfer8(0xFF) << 8)  |  spi_xfer8(0xFF);
        sdhc = (ocr & (1u << 30)) ? 1 : 0;
    }

    if (!sdhc) sd_cmd(16, 512, 0xFF);   // block size

    CS_HIGH();
    spi_set_speed_high();   // 10-25 MHz
    return sdhc ? 1 : 0;
}
```

### 2. Block read/write

```c
int sd_read_block(uint32_t lba, uint8_t *buf) {
    CS_LOW();
    if (sd_cmd(17, lba, 0xFF) != 0x00) { CS_HIGH(); return -1; }

    // wait data token 0xFE
    uint8_t r;
    for (int t = 0; t < 100000; t++) {
        r = spi_xfer8(0xFF);
        if (r == 0xFE) break;
    }
    if (r != 0xFE) { CS_HIGH(); return -2; }

    for (int i = 0; i < 512; i++) buf[i] = spi_xfer8(0xFF);
    spi_xfer8(0xFF); spi_xfer8(0xFF);   // CRC (ignored)
    CS_HIGH();
    return 0;
}

int sd_write_block(uint32_t lba, const uint8_t *buf) {
    CS_LOW();
    if (sd_cmd(24, lba, 0xFF) != 0x00) { CS_HIGH(); return -1; }

    spi_xfer8(0xFF);
    spi_xfer8(0xFE);             // data token
    for (int i = 0; i < 512; i++) spi_xfer8(buf[i]);
    spi_xfer8(0xFF); spi_xfer8(0xFF);   // CRC

    uint8_t r = spi_xfer8(0xFF);
    if ((r & 0x1F) != 0x05) { CS_HIGH(); return -2; }   // not accepted

    // wait busy
    while (spi_xfer8(0xFF) != 0xFF);
    CS_HIGH();
    return 0;
}
```

### 3. FatFs diskio.c

```c
#include "diskio.h"

DSTATUS disk_initialize(BYTE pdrv) {
    return (sd_init() < 0) ? STA_NOINIT : 0;
}

DSTATUS disk_status(BYTE pdrv) { return 0; }

DRESULT disk_read(BYTE pdrv, BYTE *buf, LBA_t lba, UINT n) {
    for (UINT i = 0; i < n; i++) {
        if (sd_read_block(lba + i, buf + i * 512) < 0) return RES_ERROR;
    }
    return RES_OK;
}

DRESULT disk_write(BYTE pdrv, const BYTE *buf, LBA_t lba, UINT n) {
    for (UINT i = 0; i < n; i++) {
        if (sd_write_block(lba + i, buf + i * 512) < 0) return RES_ERROR;
    }
    return RES_OK;
}

DRESULT disk_ioctl(BYTE pdrv, BYTE cmd, void *buf) {
    switch (cmd) {
        case CTRL_SYNC: return RES_OK;
        case GET_SECTOR_SIZE: *(WORD *)buf = 512; return RES_OK;
        // 더 자세한 IOCTL은 FatFs docs 참고
    }
    return RES_PARERR;
}

DWORD get_fattime(void) {
    // RTC 연결되어 있으면 그 시간, 없으면 fixed
    return ((2026 - 1980) << 25) | (5 << 21) | (14 << 16);
}
```

### 4. 사용 예 — 파일 write/read

```c
#include "ff.h"

void demo(void) {
    FATFS fs;
    FIL fp;
    UINT bw, br;
    char line[64];

    f_mount(&fs, "", 0);

    // Write
    if (f_open(&fp, "log.txt", FA_CREATE_ALWAYS | FA_WRITE) == FR_OK) {
        f_write(&fp, "Hello, SD!\n", 11, &bw);
        f_close(&fp);
    }

    // Read
    if (f_open(&fp, "log.txt", FA_READ) == FR_OK) {
        f_read(&fp, line, sizeof(line) - 1, &br);
        line[br] = 0;
        printf("Read: %s", line);
        f_close(&fp);
    }
}
```

### 5. Long filename 활성화

`ffconf.h`:

```c
#define FF_USE_LFN  1     // 0=off, 1=static, 2=stack, 3=heap
#define FF_MAX_LFN  255
#define FF_LFN_UNICODE 0  // 0=ANSI/OEM, 1=UTF-16, 2=UTF-8
```

long filename은 *각 file에 LFN entry 추가*로 SRAM·flash 사용량 증가. 작은 MCU는 short filename 8.3으로 충분한 경우 많음.

## 측정 / 동작 확인

PC에 SD card 꽂아 *FAT32 format*. STM32에서 write 후 PC에 다시 꽂으면 file이 보여야 함.

```bash
$ ls /Volumes/SD
log.txt

$ cat /Volumes/SD/log.txt
Hello, SD!
```

write speed 측정:

```c
uint32_t t = millis();
char buf[512];
for (int i = 0; i < 1000; i++) {
    UINT bw;
    f_write(&fp, buf, 512, &bw);
}
f_sync(&fp);
printf("Write 500 KB: %lu ms\n", millis() - t);
```

SPI mode 25 MHz: ~2 MB/s, SDIO 4-bit: ~10-15 MB/s.

## 자주 보는 함정

> ⚠️ SD card init speed 너무 높음

CMD0 단계는 *100-400 kHz*만 허용. 25 MHz로 시도하면 init fail.

> ⚠️ Block address vs byte address

SDSC (≤ 2 GB)는 byte address, SDHC/SDXC는 *block (512 byte) address*. CCS bit 확인 필수.

> ⚠️ Long ACMD41 wait

card 따라 init에 ~500 ms 걸림. timeout 짧으면 *card not ready*. 1-2초 timeout.

> ⚠️ MMC card

옛 MMC는 SD와 SPI command 일부 다름. 요즘은 거의 없지만 발견하면 다른 init 시퀀스.

> ⚠️ FatFs FA_OPEN_APPEND를 매번 호출

매 write에 open/close 반복하면 *각 close에 metadata write* → wear-out 가속. 가능하면 한 번 open 후 여러 번 write, periodic `f_sync()`.

> ⚠️ Power-loss에 file corruption

write 중 power-off → FAT metadata 깨짐. *journaling*이 필요하면 FatFs는 부족, *LittleFS* 같은 wear-leveling FS 고려.

## 정리

- SD card는 **SPI 모드**로 모든 MCU에서 동작. SDIO는 더 빠름.
- Init sequence: **100-400 kHz로 CMD0 → CMD8 → ACMD41 → CMD58**.
- **FatFs diskio.c**의 4개 함수만 구현하면 FAT32 호환.
- **Block 512 byte** 단위 read/write.
- **Long filename**은 메모리 소모, **journaling 없음** — power-loss 주의.

다음 편은 **RTC 활용**입니다. battery backup, alarm, calendar, tamper detection을 다룹니다.

## 관련 항목

- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-13: Flash 프로그래밍](/blog/embedded/modern-recipes/part4-13-flash-programming)
- [5-12: Ethernet MAC + PHY](/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy)
- [5-14: RTC 활용](/blog/embedded/modern-recipes/part5-14-rtc-utilization)
