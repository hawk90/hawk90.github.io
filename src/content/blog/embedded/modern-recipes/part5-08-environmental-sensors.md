---
title: "환경 센서 활용 — BME280 온습압·SHT3x 비교"
slug: "embedded/modern-recipes/part5-08-environmental-sensors"
date: 2026-04-14T09:56:00
description: "BME280 SPI driver(calibration 읽기·보상식)와 SHT3x I2C driver(CRC-8·single shot)를 datasheet 기준으로 작성하고 host에서 보상식과 CRC를 검증합니다."
series: "Modern Embedded Recipes"
seriesOrder: 56
tags: [recipes, peripheral, sensor]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"센서의 raw 값은 ADC count이고, °C·hPa·%RH로 바꾸는 식과 계수는 datasheet와 chip 안에 있습니다."** BME280은 chip마다 다른 calibration word를 읽어 보상식에 넣고, SHT3x는 고정된 변환식과 CRC-8로 값을 검사합니다.

## 어떤 상황에서 쓰나

실내 공기 monitor, 기상 기록기, 냉장 logger처럼 온도·습도·기압을 읽어야 하는 곳입니다. Bosch BME280은 한 chip에서 셋을 재고 I2C와 SPI를 모두 지원합니다. Sensirion SHT3x-DIS는 온도·습도를 재고 I2C로만 통신합니다.

이 글은 STM32F407에서 BME280을 SPI로, SHT3x를 I2C로 읽는 driver를 씁니다. 수치는 Bosch BME280 datasheet BST-BME280-DS001-10 Rev 1.1(May 2015)과 Sensirion SHT3x-DIS datasheet Version 7(December 2022)에서 가져왔습니다. ARM 쪽 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall -Wextra` 경고 없이 빌드되고, calibration 해석·온도 보상식·CRC는 host에서 돌려 확인했습니다. 센서로 한 측정은 없습니다.

## 핵심 개념

### BME280

| 항목 | datasheet 값 |
|---|---|
| Operating range | -40…+85 °C, 0…100 % rel. humidity, 300…1100 hPa |
| Interface | "I²C (up to 3.4 MHz) and SPI (3 and 4 wire, up to 10 MHz)" |
| I2C 주소 | "111011x": SDO를 GND에 두면 0x76, VDDIO에 두면 0x77 |
| SPI mode | mode '00'과 '11'을 자동 선택 |
| SPI 주소 byte | bit 7이 RW("RW = '0' for write and RW = '1' for read"), 나머지 7 bit가 register 주소 |

### Register map

datasheet Table 18(memory map)과 5.4절 register 설명에서 이 글이 쓰는 것만 옮겼습니다.

| Address | 이름 | 내용 |
|---------|------|------|
| 0xD0 | id | chip_id, "which is 0x60" (5.4.1) |
| 0xE0 | reset | 0xB6을 쓰면 power-on-reset 절차로 reset |
| 0xF3 | status | im_update[0]: calibration을 NVM에서 image register로 복사하는 중이면 1 |
| 0xF2 | ctrl_hum | osrs_h[2:0]. "only become effective after a write operation to 'ctrl_meas'" |
| 0xF4 | ctrl_meas | osrs_t[2:0] (bit 7:5), osrs_p[2:0] (bit 4:2), mode[1:0] (11 = normal) |
| 0xF5 | config | t_sb[2:0] (bit 7:5), filter[2:0] (bit 4:2). "Writes to the 'config' register in normal mode may be ignored." |
| 0xF7–0xFE | data | press (20 bit), temp (20 bit), hum (16 bit) |
| 0x88–0xA1 | calib00..25 | dig_T1..T3, dig_P1..P9, dig_H1 |
| 0xE1–0xE7 | calib26.. | dig_H2..H6 |

config는 normal mode에서 쓴 값이 무시될 수 있습니다. sleep mode는 power on reset 뒤 기본값이지만, MCU만 reset되면 센서는 이전 mode를 그대로 유지하므로, 아래 코드는 Bosch SensorAPI의 `bme280_init()`처럼 먼저 0xB6으로 soft reset해 sleep으로 돌리고, start-up time(tstartup 2 ms)과 im_update가 0이 되기를 기다린 뒤 config를 쓰고 마지막에 ctrl_meas로 normal mode에 들어갑니다. data는 datasheet 4.1절 "Data register shadowing"대로 0xF7부터 한 번의 burst read로 읽어야 한 측정의 값끼리 섞이지 않습니다.

### Calibration word

datasheet Table 16은 calibration word의 위치와 type을 정합니다.

| word | 주소 | type |
|---|---|---|
| dig_T1 | 0x88 / 0x89 | unsigned short |
| dig_T2, dig_T3 | 0x8A–0x8D | signed short |
| dig_P1 | 0x8E / 0x8F | unsigned short |
| dig_P2..dig_P9 | 0x90–0x9F | signed short |
| dig_H1 | 0xA1 | unsigned char |
| dig_H2 | 0xE1 / 0xE2 | signed short |
| dig_H3 | 0xE3 | unsigned char |
| dig_H4 | 0xE4 → [11:4], 0xE5[3:0] → [3:0] | signed short |
| dig_H5 | 0xE5[7:4] → [3:0], 0xE6 → [11:4] | signed short |
| dig_H6 | 0xE7 | signed char |

모두 little-endian(낮은 주소가 [7:0])이고, dig_H4·dig_H5만 12 bit가 0xE5를 나눠 씁니다.

### 보상식

datasheet 4.2.3절은 정수 보상식을 주면서 "it is strongly advised to use the API available from Bosch Sensortec"라고 덧붙입니다. 온도 식은 짧아 아래 코드에 옮겼고, 결과는 0.01 °C 단위("Output value of '5123' equals 51.23 DegC")입니다. 같은 계산에서 나오는 `t_fine`이 기압·습도 식의 입력이 되므로 온도를 항상 먼저 보상합니다. 기압(64-bit, Q24.8 Pa)과 습도(Q22.10 %RH) 식은 4.2.3절의 `BME280_compensate_P_int64()`·`bme280_compensate_H_int32()`를 그대로 쓰거나, Bosch [BME280_SensorAPI](https://github.com/boschsensortec/BME280_SensorAPI)(v3.5.1, BSD-3-Clause)의 `bme280_get_sensor_data()`를 씁니다.

### SHT3x-DIS

| 항목 | datasheet 값 |
|---|---|
| I2C 주소 | 0x44 (ADDR → logic low, default), 0x45 (logic high) |
| fSCL | 0 ~ 1000 kHz |
| Single shot, high repeatability, clock stretching disabled | command 0x2400 |
| tMEAS,h (high repeatability) | typ 12.5 ms, max 15 ms (2.4 ~ 5.5 V), max 15.5 ms (2.15 ~ 2.4 V) |
| 읽기 | T MSB, T LSB, CRC, RH MSB, RH LSB, CRC |
| CRC | CRC-8, polynomial 0x31, initialization 0xFF, final XOR 0x00, "CRC (0xBEEF) = 0x92" |
| 변환 | T = −45 + 175 × S_T / (2^16 − 1) °C, RH = 100 × S_RH / (2^16 − 1) % |

clock stretching을 끈 command에서는 "the sensor responds to a read header with a not acknowledge (NACK), if no data is present"이므로, tMEAS가 지나기 전에 읽으면 주소 byte에서 NACK가 납니다.

## 코드 예제

`spi_init_master()`·`spi_xfer8()`은 [4-08](/blog/embedded/modern-recipes/part4-08-spi-driver), `i2c_write()`·`i2c_read()`는 [4-09](/blog/embedded/modern-recipes/part4-09-i2c-driver), `delay_ms()`는 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer)의 것입니다. 4-08의 SPI1은 BR = 3(5.25 MHz)이면 BME280의 10 MHz 상한 안이고, 4-09의 400 kHz는 SHT3x의 1000 kHz 안입니다.

### 1. BME280 SPI register 접근

```c
// CS=PA4 (4-08 spi_init_master() makes it an output, high)
#define CS_LOW()  (GPIOA->BSRR = (1u << (4+16)))
#define CS_HIGH() (GPIOA->BSRR = (1u << 4))

static void bme_read_n(uint8_t reg, uint8_t *buf, uint16_t n) {
    CS_LOW();
    spi_xfer8(reg | 0x80);                 // RW = 1: read
    for (uint16_t i = 0; i < n; i++) buf[i] = spi_xfer8(0xFF);
    while (SPI1->SR & SPI_SR_BSY);
    CS_HIGH();
}

static uint8_t bme_read(uint8_t reg) {
    uint8_t v;
    bme_read_n(reg, &v, 1);
    return v;
}

static void bme_write(uint8_t reg, uint8_t val) {
    CS_LOW();
    spi_xfer8(reg & 0x7F);                 // RW = 0: write
    spi_xfer8(val);
    while (SPI1->SR & SPI_SR_BSY);
    CS_HIGH();
}
```

### 2. Calibration 해석과 온도 보상

```c
/* bme280_cal.h */
#include <stdint.h>

typedef struct {
    uint16_t T1; int16_t T2, T3;
    uint16_t P1; int16_t P2, P3, P4, P5, P6, P7, P8, P9;
    uint8_t  H1; int16_t H2; uint8_t H3;
    int16_t  H4, H5; int8_t H6;
} bme_calib_t;

#define U16(b, i) ((uint16_t)((b)[i] | ((b)[(i) + 1] << 8)))
#define S16(b, i) ((int16_t)U16(b, i))

/* a = 26 bytes from 0x88, h = 7 bytes from 0xE1 (Table 16) */
static void bme_parse_calib(const uint8_t *a, const uint8_t *h, bme_calib_t *c) {
    c->T1 = U16(a, 0);  c->T2 = S16(a, 2);  c->T3 = S16(a, 4);
    c->P1 = U16(a, 6);  c->P2 = S16(a, 8);  c->P3 = S16(a, 10);
    c->P4 = S16(a, 12); c->P5 = S16(a, 14); c->P6 = S16(a, 16);
    c->P7 = S16(a, 18); c->P8 = S16(a, 20); c->P9 = S16(a, 22);
    c->H1 = a[25];                                   /* 0xA1 */
    c->H2 = S16(h, 0);                               /* 0xE1/0xE2 */
    c->H3 = h[2];                                    /* 0xE3 */
    c->H4 = (int16_t)(((int8_t)h[3] * 16) | (h[4] & 0x0F));   /* 0xE4[11:4], 0xE5[3:0] */
    c->H5 = (int16_t)(((int8_t)h[5] * 16) | (h[4] >> 4));     /* 0xE6[11:4], 0xE5[7:4] */
    c->H6 = (int8_t)h[6];                            /* 0xE7 */
}

/* datasheet 4.2.3: 0.01 degC; t_fine feeds the P and H formulas */
static int32_t t_fine;
static int32_t bme_comp_T(int32_t adc_T, const bme_calib_t *c) {
    int32_t var1 = ((((adc_T >> 3) - ((int32_t)c->T1 << 1))) * ((int32_t)c->T2)) >> 11;
    int32_t var2 = (((((adc_T >> 4) - ((int32_t)c->T1)) *
                      ((adc_T >> 4) - ((int32_t)c->T1))) >> 12) * ((int32_t)c->T3)) >> 14;
    t_fine = var1 + var2;
    return (t_fine * 5 + 128) >> 8;
}
```

`(int8_t)h[3] * 16`은 Bosch SensorAPI의 `parse_humidity_calib_data()`처럼 12 bit 값의 상위 byte를 부호 있는 값으로 읽고 왼쪽으로 4 bit 옮깁니다.

### 3. BME280 초기화와 측정

```c
#include "bme280_cal.h"

static bme_calib_t cal;

int bme_init(void) {
    if (bme_read(0xD0) != 0x60) return -1;           // chip_id

    bme_write(0xE0, 0xB6);                           // soft reset -> sleep mode
    delay_ms(3);                                     // > 2 ms (tstartup, delay_ms per 4-06)
    while (bme_read(0xF3) & 0x01) { }                // im_update: NVM copy in progress

    uint8_t a[26], h[7];
    bme_read_n(0x88, a, sizeof a);
    bme_read_n(0xE1, h, sizeof h);
    bme_parse_calib(a, h, &cal);

    // sleep mode after the soft reset: config is not ignored here
    bme_write(0xF5, (5u << 5) | (0u << 2));          // t_sb = 1000 ms, filter off
    bme_write(0xF2, 0x01);                           // osrs_h = x1
    bme_write(0xF4, (1u << 5) | (1u << 2) | 3u);     // osrs_t = x1, osrs_p = x1, normal
    return 0;
}

void bme_read_raw(int32_t *adc_P, int32_t *adc_T, int32_t *adc_H) {
    uint8_t b[8];
    bme_read_n(0xF7, b, 8);                          // one burst: shadowing
    *adc_P = ((int32_t)b[0] << 12) | ((int32_t)b[1] << 4) | (b[2] >> 4);
    *adc_T = ((int32_t)b[3] << 12) | ((int32_t)b[4] << 4) | (b[5] >> 4);
    *adc_H = ((int32_t)b[6] << 8)  |  b[7];
}

int32_t bme_temp_centi(void) {
    int32_t p, t, h;
    bme_read_raw(&p, &t, &h);
    return bme_comp_T(t, &cal);                      // 2345 = 23.45 degC
}
```

### 4. SHT3x I2C driver

```c
/* sht3x_crc.h */
#include <stddef.h>
#include <stdint.h>

/* CRC-8, poly 0x31, init 0xFF, no reflection, final XOR 0x00 (Table 20) */
static uint8_t sht_crc8(const uint8_t *data, size_t n) {
    uint8_t crc = 0xFF;
    for (size_t i = 0; i < n; i++) {
        crc ^= data[i];
        for (int j = 0; j < 8; j++)
            crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1);
    }
    return crc;
}

/* 6 bytes: T MSB, T LSB, CRC, RH MSB, RH LSB, CRC */
static int sht_decode(const uint8_t b[6], int32_t *t_centi, int32_t *rh_centi) {
    if (sht_crc8(&b[0], 2) != b[2] || sht_crc8(&b[3], 2) != b[5])
        return -1;
    uint32_t st  = ((uint32_t)b[0] << 8) | b[1];
    uint32_t srh = ((uint32_t)b[3] << 8) | b[4];
    *t_centi  = -4500 + (int32_t)((17500u * st) / 65535u);   // 0.01 degC
    *rh_centi = (int32_t)((10000u * srh) / 65535u);          // 0.01 %RH
    return 0;
}
```

```c
#include "sht3x_crc.h"
#define SHT3X_ADDR 0x44                  // ADDR pin low

int sht3x_read(int32_t *t_centi, int32_t *rh_centi) {
    const uint8_t cmd[2] = {0x24, 0x00}; // single shot, high repeatability, no stretching
    if (i2c_write(SHT3X_ADDR, cmd, 2) != 0) return -1;

    delay_ms(17);                        // > 16 ms (4-06): covers tMEAS,h max 15.5 ms

    uint8_t b[6];
    if (i2c_read(SHT3X_ADDR, b, 6) != 0) return -1;   // NACK if not ready
    return sht_decode(b, t_centi, rh_centi);
}
```

변환식을 정수로 옮기면서 0.01 단위로 잘랐습니다. `17500u * st`의 최대값은 17500 × 65535 = 1,146,862,500으로 `uint32_t`에 들어갑니다.

## 측정 / 동작 확인

### host에서 calibration·보상식·CRC 확인

보드 없이 확인할 수 있는 세 가지를 host에서 돌렸습니다.

1. **CRC**: datasheet Table 20의 예 "CRC (0xBEEF) = 0x92"를 `sht_crc8()`이 재현하는지, 그리고 CRC가 틀린 byte열을 `sht_decode()`가 거부하는지.
2. **calibration 해석**: 임의의 calibration word(실제 chip 값이 아니라 이 글이 고른 값, dig_H4·H5는 음수 포함)를 Table 16 배치대로 byte에 써 넣은 뒤 `bme_parse_calib()`이 같은 word를 돌려주는지.
3. **온도 보상**: 정수 식 `bme_comp_T()`와 datasheet 8.1절의 double 식 `BME280_compensate_T_double()`이 같은 입력에서 0.01 °C 안에서 맞는지. 2의 calibration으로 adc_T를 300000부터 700000까지 1000 간격으로 넣습니다.

```c
/* sensor_host.c */
#include <stdio.h>
#include "bme280_cal.h"
#include "sht3x_crc.h"

/* datasheet 8.1 double-precision temperature */
static double comp_T_double(int32_t adc_T, const bme_calib_t *c) {
    double var1 = ((double)adc_T / 16384.0 - (double)c->T1 / 1024.0) * (double)c->T2;
    double var2 = ((double)adc_T / 131072.0 - (double)c->T1 / 8192.0) *
                  ((double)adc_T / 131072.0 - (double)c->T1 / 8192.0) * (double)c->T3;
    return (var1 + var2) / 5120.0;
}

static void put16(uint8_t *b, int i, int v) { b[i] = (uint8_t)v; b[i + 1] = (uint8_t)(v >> 8); }

int main(void) {
    const uint8_t beef[2] = {0xBE, 0xEF};
    printf("crc8(BEEF) = 0x%02X\n", sht_crc8(beef, 2));

    uint8_t s[6] = {0x66, 0x66, 0, 0x80, 0x00, 0};
    s[2] = sht_crc8(&s[0], 2); s[5] = sht_crc8(&s[3], 2);
    int32_t t, rh;
    int r = sht_decode(s, &t, &rh);
    printf("sht 0x6666/0x8000: rc=%d T=%ld.%02ld C RH=%ld.%02ld %%\n",
           r, (long)t / 100, (long)t % 100, (long)rh / 100, (long)rh % 100);
    s[4] ^= 1;
    printf("sht with flipped bit: rc=%d\n", sht_decode(s, &t, &rh));

    const bme_calib_t want = {28000, 26000, 50, 36000, -10500, 3000, 7000, -50,
                              -7, 9900, -10230, 4285, 75, 360, 0, -300, -1000, 30};
    uint8_t a[26] = {0}, h[7] = {0};
    put16(a, 0, want.T1); put16(a, 2, want.T2); put16(a, 4, want.T3);
    put16(a, 6, want.P1); put16(a, 8, want.P2); put16(a, 10, want.P3);
    put16(a, 12, want.P4); put16(a, 14, want.P5); put16(a, 16, want.P6);
    put16(a, 18, want.P7); put16(a, 20, want.P8); put16(a, 22, want.P9);
    a[25] = want.H1; put16(h, 0, want.H2); h[2] = want.H3;
    h[3] = (uint8_t)(want.H4 >> 4);
    h[4] = (uint8_t)((want.H4 & 0x0F) | ((want.H5 & 0x0F) << 4));
    h[5] = (uint8_t)(want.H5 >> 4);
    h[6] = (uint8_t)want.H6;
    bme_calib_t got;
    bme_parse_calib(a, h, &got);
    /* compare field by field: struct padding is not part of the data */
    int same = got.T1 == want.T1 && got.T2 == want.T2 && got.T3 == want.T3 &&
               got.P1 == want.P1 && got.P2 == want.P2 && got.P3 == want.P3 &&
               got.P4 == want.P4 && got.P5 == want.P5 && got.P6 == want.P6 &&
               got.P7 == want.P7 && got.P8 == want.P8 && got.P9 == want.P9 &&
               got.H1 == want.H1 && got.H2 == want.H2 && got.H3 == want.H3 &&
               got.H4 == want.H4 && got.H5 == want.H5 && got.H6 == want.H6;
    printf("calib round trip: %s (H4=%d H5=%d)\n", same ? "ok" : "MISMATCH",
           got.H4, got.H5);

    double maxdiff = 0;
    for (int32_t adc = 300000; adc <= 700000; adc += 1000) {
        double d = bme_comp_T(adc, &got) / 100.0 - comp_T_double(adc, &got);
        if (d < 0) d = -d;
        if (d > maxdiff) maxdiff = d;
    }
    printf("T int vs double, 401 points: max |diff| = %.4f C\n", maxdiff);
    printf("adc_T=500000 -> int %ld, double %.4f C\n",
           (long)bme_comp_T(500000, &got), comp_T_double(500000, &got));
    return 0;
}
```

```bash
clang -O2 -Wall -o sensor_host sensor_host.c && ./sensor_host
```

```text
crc8(BEEF) = 0x92
sht 0x6666/0x8000: rc=0 T=25.00 C RH=50.00 %
sht with flipped bit: rc=-1
calib round trip: ok (H4=-300 H5=-1000)
T int vs double, 401 points: max |diff| = 0.0052 C
adc_T=500000 -> int 1612, double 16.1186 C
```

CRC 예제값 0x92가 나오고, 0x6666(26214)은 65535의 정확히 0.4이므로 T = 25.0000 °C이고, 0x8000은 50.0008 %RH로 잘려 50.00이 됩니다. bit 하나를 뒤집으면 -1입니다. calibration은 음수 dig_H4·H5까지 같은 word로 돌아오고, 정수 온도 식은 401개 입력에서 double 식과 최대 0.0052 °C 차이로 출력 1 LSB(0.01 °C)보다 작습니다. 이 calibration 값은 실제 chip 값이 아니므로 16.12 °C라는 결과 자체에는 의미가 없습니다.

### 보드에서

`bme_init()`이 -1이면 chip_id 0x60을 못 읽은 것이므로 SPI 배선과 CS부터 봅니다. SHT3x에서 `i2c_read()`가 실패하면, 주소(ADDR 핀)와 대기 시간을 봅니다. 대기가 tMEAS보다 짧으면 datasheet대로 NACK가 나므로, 이 경우는 실패가 정상 동작입니다.

## 자주 보는 함정

> ⚠️ calibration을 읽지 않고 raw 값을 씀

BME280의 raw 값은 chip마다 다른 calibration word를 거쳐야 단위가 생깁니다. `bme_init()`에서 0x88·0xE1 두 구간을 다 읽습니다.

> ⚠️ 온도보다 기압·습도를 먼저 보상

기압·습도 식은 온도 식이 남긴 `t_fine`을 씁니다. 같은 burst에서 읽은 adc_T로 `bme_comp_T()`를 먼저 부릅니다.

> ⚠️ normal mode에서 config를 바꿈

"Writes to the 'config' register in normal mode may be ignored." config를 바꾸려면 ctrl_meas로 sleep mode(mode = 00)에 넣고 쓴 뒤 다시 normal로 돌립니다.

> ⚠️ ctrl_hum만 쓰고 끝냄

ctrl_hum은 ctrl_meas를 쓸 때 적용됩니다. 습도 oversampling을 바꾸면 ctrl_meas도 한 번 다시 씁니다.

> ⚠️ data를 register마다 따로 읽음

0xF7–0xFE를 여러 번에 나눠 읽으면 그 사이 새 측정이 들어와 기압·온도·습도가 서로 다른 측정에서 올 수 있습니다. datasheet 4.1절대로 burst read 한 번으로 읽습니다.

> ⚠️ SHT3x CRC를 건너뜀

CRC가 틀린 값은 버리고 다시 읽습니다. 위 host 실행에서 bit 하나를 뒤집은 byte열은 `sht_decode()`가 -1로 거부합니다.

## 정리

- BME280: chip_id **0x60**, SPI는 bit 7이 RW, calibration은 **0x88–0xA1·0xE1–0xE7**(Table 16).
- 설정 순서는 **sleep에서 config → ctrl_hum → ctrl_meas(normal)**.
- 온도 보상은 4.2.3절 정수 식, **`t_fine`을 먼저** 만들고 기압·습도는 datasheet 식이나 Bosch SensorAPI.
- SHT3x: **0x2400** single shot, **tMEAS,h max 15 ms**, CRC-8 **0x31/0xFF**.
- host에서 **CRC 예제값, calibration 해석, 정수·double 온도 식 일치**를 확인.

다음 편은 **IMU 센서**입니다. MPU-6050 초기화·14 byte burst read·Data Ready 인터럽트와 complementary filter를 다룹니다.

## 관련 항목

- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [5-09: IMU 센서](/blog/embedded/modern-recipes/part5-09-imu-sensor)
