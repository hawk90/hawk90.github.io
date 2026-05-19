---
title: "5-08: 환경 센서 (온도·습도·기압)"
date: 2026-05-14T08:00:00
description: "BME280·SHT3x — I2C·SPI 센서 driver 패턴."
series: "Modern Embedded Recipes"
seriesOrder: 56
tags: [recipes, peripheral, sensor]
draft: false
---

## 한 줄 요약

> **"센서 raw value는 그냥 ADC count입니다. 계수와 compensation 공식이 datasheet에 있습니다."** 그걸 따라 적용하면 °C / %RH / hPa가 됩니다.

## 어떤 상황에서 쓰나

날씨 스테이션, 실내 공기 monitor, drone barometric altimeter, refrigeration logger, 산업 공정 monitor — *온도·습도·기압 측정*은 임베디드의 기본 임무. BME280 (Bosch) 한 chip이 셋을 모두 — I2C/SPI 둘 다 지원. SHT3x (Sensirion)는 온습도만, 더 정확한 ±0.1°C / ±1.5%RH.

이 글은 BME280 SPI driver와 SHT3x I2C driver를 모두 작성합니다.

## 핵심 개념

### BME280 chip

```text
Bosch BME280:
  Temperature: -40 ~ +85°C, ±1°C
  Humidity:    0~100%RH, ±3%
  Pressure:    300~1100 hPa, ±1 hPa

I2C address: 0x76 (SDO=GND) or 0x77 (SDO=VDD)
SPI: mode 0 or mode 3, max 10 MHz
```

### Register map (요약)

| Address | 이름 | 역할 |
|---------|------|------|
| 0xD0 | id | chip ID = 0x60 |
| 0xE0 | reset | 0xB6 write → soft reset |
| 0xF2 | ctrl_hum | humidity oversampling |
| 0xF4 | ctrl_meas | temp/pressure oversampling, mode |
| 0xF5 | config | standby, filter |
| 0xF7-FE | data | raw temp, pressure, humidity (총 8 byte) |
| 0x88-A1 | calib1 | T, P calibration |
| 0xE1-F0 | calib2 | H calibration |

### Compensation 공식

raw ADC → 실제 값 변환은 *Bosch가 제공하는 fixed-point 또는 float 공식*. datasheet appendix에 있습니다.

```c
// 단순화된 float 공식 (실제는 더 복잡)
double t_fine;
double compensate_temp(int32_t adc_T, const calib_t *c) {
    double var1 = (((double)adc_T) / 16384.0 - ((double)c->T1) / 1024.0) * c->T2;
    double var2 = ((((double)adc_T) / 131072.0 - ((double)c->T1) / 8192.0) *
                   (((double)adc_T) / 131072.0 - ((double)c->T1) / 8192.0)) * c->T3;
    t_fine = var1 + var2;
    return t_fine / 5120.0;   // °C
}
```

손으로 안 짭니다. Bosch BME280 driver (GitHub `BoschSensortec/BME280_driver`)를 *그대로 사용*.

### SHT3x — CRC가 들어간 I2C

SHT3x는 *모든 measurement에 CRC-8 byte*. error detection.

```text
Read response: [MSB] [LSB] [CRC]

CRC-8 polynomial: 0x31
init: 0xFF
```

CRC가 안 맞으면 *재시도*. I2C noise 환경에서 중요.

## 코드 예제

### 1. BME280 SPI driver

```c
#include "bme280_defs.h"

// CS=PA4
#define CS_LOW()  GPIOA->BSRR = (1u << (4+16))
#define CS_HIGH() GPIOA->BSRR = (1u << 4)

static uint8_t bme_read(uint8_t reg) {
    uint8_t v;
    CS_LOW();
    spi_xfer8(reg | 0x80);   // read = bit7 set
    v = spi_xfer8(0xFF);
    while (SPI1->SR & SPI_SR_BSY);
    CS_HIGH();
    return v;
}

static void bme_read_n(uint8_t reg, uint8_t *buf, uint16_t n) {
    CS_LOW();
    spi_xfer8(reg | 0x80);
    for (uint16_t i = 0; i < n; i++) buf[i] = spi_xfer8(0xFF);
    while (SPI1->SR & SPI_SR_BSY);
    CS_HIGH();
}

static void bme_write(uint8_t reg, uint8_t val) {
    CS_LOW();
    spi_xfer8(reg & 0x7F);   // write = bit7 clear
    spi_xfer8(val);
    while (SPI1->SR & SPI_SR_BSY);
    CS_HIGH();
}

// Calibration
typedef struct {
    uint16_t T1; int16_t T2, T3;
    uint16_t P1; int16_t P2, P3, P4, P5, P6, P7, P8, P9;
    uint8_t H1; int16_t H2; uint8_t H3;
    int16_t H4, H5; int8_t H6;
} bme_calib_t;

static bme_calib_t cal;

void bme_init(void) {
    if (bme_read(0xD0) != 0x60) {
        printf("BME280 not found!\n");
        return;
    }

    // Read calibration
    uint8_t buf[26];
    bme_read_n(0x88, buf, 26);
    cal.T1 = buf[0]  | (buf[1]  << 8);
    cal.T2 = buf[2]  | (buf[3]  << 8);
    cal.T3 = buf[4]  | (buf[5]  << 8);
    cal.P1 = buf[6]  | (buf[7]  << 8);
    // ... P2-P9, H1
    cal.H1 = buf[25];

    bme_read_n(0xE1, buf, 7);
    cal.H2 = buf[0] | (buf[1] << 8);
    cal.H3 = buf[2];
    cal.H4 = (buf[3] << 4) | (buf[4] & 0xF);
    cal.H5 = (buf[5] << 4) | (buf[4] >> 4);
    cal.H6 = buf[6];

    // Configuration: humidity ×1, temp ×1, pressure ×1, normal mode
    bme_write(0xF2, 0x01);            // ctrl_hum
    bme_write(0xF4, (1<<5)|(1<<2)|3); // ctrl_meas: T×1, P×1, normal
    bme_write(0xF5, (4<<5)|(0<<2));   // config: 500 ms standby, no filter
}

void bme_read_measurements(float *temp_c, float *pres_hpa, float *rh) {
    uint8_t buf[8];
    bme_read_n(0xF7, buf, 8);

    int32_t adc_P = ((int32_t)buf[0] << 12) | ((int32_t)buf[1] << 4) | (buf[2] >> 4);
    int32_t adc_T = ((int32_t)buf[3] << 12) | ((int32_t)buf[4] << 4) | (buf[5] >> 4);
    int32_t adc_H = ((int32_t)buf[6] << 8)  |  buf[7];

    *temp_c   = compensate_temp(adc_T, &cal);
    *pres_hpa = compensate_pres(adc_P, &cal) / 100.0;
    *rh       = compensate_humid(adc_H, &cal);
}
```

(`compensate_*` 함수는 Bosch reference에서 그대로 가져옴.)

### 2. SHT3x I2C driver

```c
#define SHT3X_ADDR 0x44   // 또는 0x45

static uint8_t crc8(const uint8_t *data, size_t n) {
    uint8_t crc = 0xFF;
    for (size_t i = 0; i < n; i++) {
        crc ^= data[i];
        for (int j = 0; j < 8; j++) {
            crc = (crc & 0x80) ? (crc << 1) ^ 0x31 : (crc << 1);
        }
    }
    return crc;
}

int sht3x_read(float *temp_c, float *rh) {
    // Trigger single shot, high repeatability
    uint8_t cmd[] = {0x24, 0x00};
    i2c_write(SHT3X_ADDR, cmd, 2);

    delay_ms(20);   // high repeatability: max 15.5 ms

    uint8_t buf[6];
    i2c_read(SHT3X_ADDR, buf, 6);

    // Check CRC
    if (crc8(&buf[0], 2) != buf[2] || crc8(&buf[3], 2) != buf[5])
        return -1;

    uint16_t t_raw = (buf[0] << 8) | buf[1];
    uint16_t h_raw = (buf[3] << 8) | buf[4];

    *temp_c = -45.0f + 175.0f * t_raw / 65535.0f;
    *rh     = 100.0f * h_raw / 65535.0f;
    return 0;
}
```

SHT3x는 *공식이 단순* — 곱셈·덧셈만. BME280과 대조적.

### 3. 평균과 outlier 필터

센서는 *noise spike*가 있습니다. moving average + median filter가 표준.

```c
#define BUF 16
static float temp_buf[BUF];
static int buf_idx;

float temp_smooth(float new) {
    temp_buf[buf_idx++] = new;
    if (buf_idx >= BUF) buf_idx = 0;

    // sort copy, take median
    float sorted[BUF];
    memcpy(sorted, temp_buf, sizeof(sorted));
    for (int i = 1; i < BUF; i++) {
        float k = sorted[i]; int j = i - 1;
        while (j >= 0 && sorted[j] > k) { sorted[j+1] = sorted[j]; j--; }
        sorted[j+1] = k;
    }
    return sorted[BUF/2];
}
```

## 측정 / 동작 확인

값이 합리적인 범위(20-25°C, 40-60%RH, 1000-1020 hPa)에서 *정상 변동*해야 합니다.

```text
정상 측정:
  T = 23.4 °C
  P = 1013.2 hPa
  RH = 47.3 %

이상 측정:
  T = -40.0 °C (sensor 미연결 또는 spi 오류)
  T = +85.0 °C (calibration 잘못)
  P = 0 (i2c address 잘못)
```

검증: *손으로 sensor를 잡으면* 온도가 1-2°C 올라야 함. *입김*을 불면 RH가 80%+로 튐. 안 변하면 sensor가 동작 안 함.

## 자주 보는 함정

> ⚠️ Calibration data를 읽지 않음

raw ADC만 출력해서 *나쁜 값*. 항상 calibration 먼저 읽고 compensation 적용.

> ⚠️ SHT3x command 후 *대기 안 함*

15 ms 안 기다리고 read하면 *이전 measurement* 또는 *NACK*. delay 필수.

> ⚠️ I2C pull-up 약함

400 kHz fast mode에 internal pull-up만 쓰면 *rise time 부족*. 4.7 kΩ external.

> ⚠️ Self-heating

센서 자체 *발열로 측정 오차*. continuous mode + high oversampling이면 +0.5°C 오차. *intermittent mode* (1초 한 번 측정 후 sleep) 권장.

> ⚠️ Calibration overflow

float이 아닌 *int 공식*에서 overflow. Bosch reference의 `int32_t`·`int64_t` 형식 정확히 따라야.

> ⚠️ CRC를 무시

I2C error가 가끔 발생. CRC 안 보면 *spike value*가 정상으로 보고됨.

## 정리

- BME280 = **T + P + H 통합**, I2C/SPI 둘 다, calibration + compensation 공식 필수.
- SHT3x = T + H, *CRC-8 byte*가 모든 measurement에 포함.
- **Bosch driver를 그대로 사용**, compensation 공식 직접 안 짬.
- **moving average + median filter**로 spike 제거.
- **외부 pull-up 4.7 kΩ**, **400 kHz fast mode** 안전.

다음 편은 **IMU (가속도·자이로·지자기)**입니다. MPU6050, BMI270 driver와 sensor fusion 입력 단계를 다룹니다.

## 관련 항목

- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [5-09: IMU 센서](/blog/embedded/modern-recipes/part5-09-imu-sensor)
- [9-05: PID 제어 기본](/blog/embedded/modern-recipes/part9-05-pid-control)
