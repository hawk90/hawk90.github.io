---
title: "IMU 센서 활용 — MPU-6050·Data Ready·Complementary Filter"
slug: "embedded/modern-recipes/part5-09-imu-sensor"
date: 2026-04-14T09:57:00
description: "MPU-6050 register map대로 초기화·14 byte burst read·Data Ready 인터럽트를 만들고, complementary filter의 drift 억제를 host에서 시뮬레이션합니다."
series: "Modern Embedded Recipes"
seriesOrder: 57
tags: [recipes, peripheral, imu]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"gyro는 적분하면 bias만큼 흐르고, accel은 움직이면 흔들립니다. complementary filter는 둘을 시정수 τ로 나눠 섞습니다."** MPU-6050에서 raw 값을 정해진 주기로 읽어 오는 것이 그 첫 단계입니다.

## 어떤 상황에서 쓰나

self-balancing robot, 짐벌, 기울기 센서처럼 자세(roll·pitch)를 알아야 하는 곳입니다. IMU는 가속도와 각속도를 내고, MCU는 이를 일정한 주기로 읽어 자세로 바꿉니다.

이 글은 InvenSense MPU-6050(3축 accel + 3축 gyro, I2C)을 STM32F407의 I2C1로 읽고, Data Ready 인터럽트로 주기를 맞추고, complementary filter로 roll·pitch를 만듭니다. register 값은 MPU-6000/MPU-6050 Register Map RM-MPU-6000A-00 Revision 4.0과 Product Specification PS-MPU-6000A-00 Revision 3.1에서 가져왔습니다. MCU 쪽 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall -Wextra` 경고 없이 빌드되고, filter는 host에서 합성 신호로 돌려 결과를 확인했습니다. 센서로 한 측정은 없습니다.

## 핵심 개념

### MPU-6050 register

Register Map 3장과 4장에서 이 글이 쓰는 것만 옮겼습니다.

| Addr | 이름 | 이 글이 쓰는 필드 |
|------|------|------|
| 0x19 | SMPLRT_DIV | Sample Rate = Gyroscope Output Rate / (1 + SMPLRT_DIV) |
| 0x1A | CONFIG | DLPF_CFG[2:0] |
| 0x1B | GYRO_CONFIG | FS_SEL[1:0] (bit 4:3) |
| 0x1C | ACCEL_CONFIG | AFS_SEL[1:0] (bit 4:3) |
| 0x37 | INT_PIN_CFG | INT_LEVEL(7), INT_OPEN(6), LATCH_INT_EN(5), INT_RD_CLEAR(4) |
| 0x38 | INT_ENABLE | DATA_RDY_EN(0) |
| 0x3B–0x48 | ACCEL/TEMP/GYRO_OUT | 14 byte, 각 16-bit big-endian 2의 보수 |
| 0x6B | PWR_MGMT_1 | DEVICE_RESET(7), SLEEP(6), CLKSEL[2:0] |
| 0x75 | WHO_AM_I | 기본값 0x68 |

"The reset value is 0x00 for all registers other than the registers below": Register 107(PWR_MGMT_1)은 0x40, Register 117(WHO_AM_I)은 0x68입니다. 0x40은 SLEEP bit라서, 전원 직후 MPU-6050은 잠든 상태입니다.

I2C 주소는 Product Specification의 표대로 AD0 = 0이면 1101000(0x68), AD0 = 1이면 1101001(0x69)이고, I2C는 "All registers, Fast-mode" 400 kHz입니다. WHO_AM_I는 주소의 상위 6 bit만 담으므로 AD0 = 1이어도 0x68로 읽힙니다.

### 감도

| AFS_SEL | 범위 | LSB/g | FS_SEL | 범위 | LSB/(°/s) |
|---|---|---|---|---|---|
| 0 | ±2 g | 16384 | 0 | ±250 °/s | 131 |
| 1 | ±4 g | 8192 | 1 | ±500 °/s | 65.5 |
| 2 | ±8 g | 4096 | 2 | ±1000 °/s | 32.8 |
| 3 | ±16 g | 2048 | 3 | ±2000 °/s | 16.4 |

온도는 "Temperature in degrees C = (TEMP_OUT Register Value as a signed quantity)/340 + 36.53"입니다.

### Sample rate와 DLPF

Gyroscope Output Rate는 "8kHz when the DLPF is disabled (DLPF_CFG = 0 or 7), and 1kHz when the DLPF is enabled"입니다. DLPF_CFG 표의 일부입니다.

| DLPF_CFG | Accel BW (Hz) | Accel delay (ms) | Gyro BW (Hz) | Gyro delay (ms) | Fs |
|---|---|---|---|---|---|
| 1 | 184 | 2.0 | 188 | 1.9 | 1 kHz |
| 3 | 44 | 4.9 | 42 | 4.8 | 1 kHz |
| 5 | 10 | 13.8 | 10 | 13.4 | 1 kHz |

이 글은 DLPF_CFG = 3, SMPLRT_DIV = 9로 1 kHz / (1 + 9) = 100 Hz입니다. 대역을 낮추면 진동 성분이 줄지만 표의 delay만큼 값이 늦게 나옵니다.

### Complementary filter의 시정수

sample 주기 dt마다 다음을 합니다.

angle ← α × (angle + ω × dt) + (1 − α) × angle_acc

gyro 쪽은 high-pass, accel 쪽은 low-pass로 걸리고, 둘이 갈리는 시정수는 τ = α × dt / (1 − α)입니다. gyro에 bias b가 남아 있으면 gyro만 적분한 각도는 b × t로 계속 흐르지만, filter에서는 b × τ에서 멈춥니다. dt = 10 ms, α = 0.98이면 τ = 0.49 s이고, b = 1 °/s일 때 정상 상태 오차는 0.49°입니다. 아래 host 실행이 이 값을 확인합니다.

## 코드 예제

`i2c_write()`·`i2c_read_reg()`는 [4-09](/blog/embedded/modern-recipes/part4-09-i2c-driver)(Fast-mode 400 kHz), `delay_ms()`는 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer), `gpio_init()`은 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 것입니다.

### 1. MPU-6050 init + read

```c
#define MPU_ADDR 0x68                 // AD0 = 0

static uint8_t mpu_read(uint8_t reg) {
    uint8_t v = 0;
    i2c_read_reg(MPU_ADDR, reg, &v, 1);
    return v;
}

static void mpu_write(uint8_t reg, uint8_t val) {
    uint8_t buf[2] = {reg, val};
    i2c_write(MPU_ADDR, buf, 2);
}

int mpu_init(void) {
    if (mpu_read(0x75) != 0x68) return -1;          // WHO_AM_I

    mpu_write(0x6B, 0x80);                          // DEVICE_RESET
    for (int i = 0; i < 100 && (mpu_read(0x6B) & 0x80); i++)
        delay_ms(1);                                // bit clears when reset is done
    mpu_write(0x6B, 0x01);                          // SLEEP = 0, CLKSEL = 1 (PLL, X gyro)
    mpu_write(0x1A, 0x03);                          // DLPF_CFG = 3: 44/42 Hz, Fs 1 kHz
    mpu_write(0x19, 9);                             // 1 kHz / (1 + 9) = 100 Hz
    mpu_write(0x1B, 1u << 3);                       // FS_SEL = 1: +-500 dps
    mpu_write(0x1C, 1u << 3);                       // AFS_SEL = 1: +-4 g
    return 0;
}

typedef struct {
    float ax, ay, az;   // g
    float gx, gy, gz;   // deg/s
    float temp_c;
} mpu_data_t;

void mpu_read_all(mpu_data_t *d) {
    uint8_t b[14];
    i2c_read_reg(MPU_ADDR, 0x3B, b, 14);            // one burst: same sample

    int16_t ax = (int16_t)((b[0]  << 8) | b[1]);
    int16_t ay = (int16_t)((b[2]  << 8) | b[3]);
    int16_t az = (int16_t)((b[4]  << 8) | b[5]);
    int16_t t  = (int16_t)((b[6]  << 8) | b[7]);
    int16_t gx = (int16_t)((b[8]  << 8) | b[9]);
    int16_t gy = (int16_t)((b[10] << 8) | b[11]);
    int16_t gz = (int16_t)((b[12] << 8) | b[13]);

    d->ax = ax / 8192.0f;  d->ay = ay / 8192.0f;  d->az = az / 8192.0f;
    d->gx = gx / 65.5f;    d->gy = gy / 65.5f;    d->gz = gz / 65.5f;
    d->temp_c = t / 340.0f + 36.53f;
}
```

CLKSEL = 1은 Register Map의 권고 "it is highly recommended that the device be configured to use one of the gyroscopes (or an external clock source) as the clock reference for improved stability"를 따릅니다.

### 2. Gyro bias

```c
typedef struct { float bx, by, bz; } gyro_bias_t;

void gyro_calibrate(gyro_bias_t *b) {
    // call with the board at rest
    float sx = 0, sy = 0, sz = 0;
    const int N = 200;                              // 2 s at 100 Hz
    for (int i = 0; i < N; i++) {
        mpu_data_t d;
        mpu_read_all(&d);
        sx += d.gx; sy += d.gy; sz += d.gz;
        delay_ms(10);                               // one new sample per read
    }
    b->bx = sx / N; b->by = sy / N; b->bz = sz / N;
}
```

sample rate가 100 Hz이므로 10 ms보다 빨리 읽으면 같은 sample을 여러 번 더하게 됩니다.

### 3. Roll/pitch와 complementary filter

```c
/* imu_filter.h */
#include <math.h>

#define RAD2DEG (180.0f / 3.14159265f)

typedef struct { float ax, ay, az, gx, gy; } imu_in_t;   // g, deg/s (bias removed)

static void accel_to_rp(const imu_in_t *d, float *roll, float *pitch) {
    *roll  = atan2f(d->ay, d->az) * RAD2DEG;
    *pitch = atan2f(-d->ax, sqrtf(d->ay * d->ay + d->az * d->az)) * RAD2DEG;
}

typedef struct {
    float roll, pitch;
    float dt;       // s
    float alpha;    // tau = alpha * dt / (1 - alpha)
} compl_t;

static void compl_update(compl_t *f, const imu_in_t *d) {
    float roll_acc, pitch_acc;
    accel_to_rp(d, &roll_acc, &pitch_acc);
    f->roll  = f->alpha * (f->roll  + d->gx * f->dt) + (1.0f - f->alpha) * roll_acc;
    f->pitch = f->alpha * (f->pitch + d->gy * f->dt) + (1.0f - f->alpha) * pitch_acc;
}
```

`accel_to_rp()`는 x축 회전 φ에서 중력이 센서 좌표로 (0, sin φ, cos φ), y축 회전 θ에서 (−sin θ, 0, cos θ)가 되는 것을 거꾸로 푼 식입니다. 그래서 gx가 roll, gy가 pitch의 변화율과 부호가 맞습니다. 이 식은 정지 상태에서 accel이 중력만 잴 때 맞고, 가속 중에는 그 가속도가 각도 오차로 들어옵니다.

### 4. Data Ready 인터럽트로 주기 맞추기

```c
// MPU INT -> PA0 (EXTI0). SYSCFG EXTICR1 reset value maps EXTI0 to PA0.
void mpu_int_init(void) {
    mpu_write(0x37, 0x30);   // INT active high, push-pull, LATCH_INT_EN, INT_RD_CLEAR
    mpu_write(0x38, 0x01);   // DATA_RDY_EN

    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_INPUT});
    EXTI->IMR  |= (1u << 0);
    EXTI->RTSR |= (1u << 0); // rising edge: INT goes high
    NVIC_EnableIRQ(EXTI0_IRQn);
}

volatile int data_ready;

void EXTI0_IRQHandler(void) {
    EXTI->PR = (1u << 0);
    data_ready = 1;
}

void imu_loop(compl_t *f, const gyro_bias_t *b) {
    for (;;) {
        if (!data_ready) continue;
        data_ready = 0;
        mpu_data_t d;
        mpu_read_all(&d);    // any read clears the latched INT (INT_RD_CLEAR)
        imu_in_t in = {d.ax, d.ay, d.az, d.gx - b->bx, d.gy - b->by};
        compl_update(f, &in);
    }
}
```

INT_PIN_CFG의 LATCH_INT_EN = 0이면 "the INT pin emits a 50us long pulse"이고, 1이면 "held high until the interrupt is cleared"입니다. INT_RD_CLEAR = 0이면 INT_STATUS(0x3A)를 읽어야 지워지고, 1이면 "cleared on any read operation"입니다. 0x30은 둘 다 1이라 14 byte data read가 INT를 내립니다. 0x20만 쓰면 data만 읽고 INT_STATUS를 안 읽는 이 loop에서는 INT가 high로 남아 다음 rising edge가 오지 않습니다.

DATA_RDY_EN은 "occurs each time a write operation to all of the sensor registers has been completed"이므로, 100 Hz 설정에서 10 ms마다 한 번입니다.

### 14 byte read의 bus 시간

4-09의 `i2c_read_reg()`는 주소(W), register 주소, 반복 START 뒤 주소(R), data 14 byte를 보냅니다. byte마다 ACK까지 9 clock이므로 17 × 9 = 153 clock이고, 400 kHz에서 START·STOP을 빼고도 382.5 µs입니다. 100 Hz면 10 ms 중 3.8 %, 1 kHz sample rate면 38 %를 bus가 차지합니다.

## 측정 / 동작 확인

### host에서 filter 확인

`imu_filter.h`를 host에서 합성 신호로 돌렸습니다. 실제 roll은 0~2 s 0°, 2~3 s에 30°까지 일정 속도로 기울고 그 뒤 30°를 유지합니다. gyro x는 실제 각속도에 bias 1 °/s를 더하고, accel은 실제 roll에서 (0, sin φ, cos φ)로 만들되 ±0.05 g 범위의 의사 난수 잡음을 y축에 더합니다. 같은 입력으로 gyro만 적분한 각도, accel만으로 구한 각도, filter(dt = 10 ms, α = 0.98) 결과를 10 s까지 비교합니다.

```c
/* imu_host.c */
#include <stdio.h>
#include "imu_filter.h"

static unsigned lcg = 12345;
static float noise(float amp) {                 /* uniform in [-amp, amp] */
    lcg = lcg * 1103515245u + 12345u;
    return amp * (((lcg >> 8) & 0xFFFF) / 32767.5f - 1.0f);
}

int main(void) {
    const float dt = 0.01f, bias = 1.0f;
    compl_t f = {0, 0, dt, 0.98f};
    float gyro_only = 0, max_acc_err = 0, max_f_err_hold = 0;
    printf("tau = %.3f s, expected steady error = %.3f deg\n",
           f.alpha * dt / (1 - f.alpha), bias * f.alpha * dt / (1 - f.alpha));
    printf("   t(s)  true   gyro-only  accel-only  filter\n");
    for (int k = 1; k <= 1000; k++) {
        float t = k * dt;
        float truth = t < 2 ? 0 : t < 3 ? 30 * (t - 2) : 30;
        float rate  = (t > 2 && t <= 3) ? 30.0f : 0.0f;
        float r = truth / RAD2DEG;
        imu_in_t in = {0, sinf(r) + noise(0.05f), cosf(r), rate + bias, 0};
        float ra, pa;
        accel_to_rp(&in, &ra, &pa);
        gyro_only += in.gx * dt;
        compl_update(&f, &in);
        float ea = ra - truth, ef = f.roll - truth;
        if (ea < 0) ea = -ea;
        if (ef < 0) ef = -ef;
        if (ea > max_acc_err) max_acc_err = ea;
        if (t >= 6 && ef > max_f_err_hold) max_f_err_hold = ef;
        if (k % 100 == 0)
            printf("%7.2f %6.2f %10.2f %11.2f %7.2f\n", t, truth, gyro_only, ra, f.roll);
    }
    printf("max |accel-only error| = %.2f deg\n", max_acc_err);
    printf("max |filter error| for t >= 6 s = %.2f deg\n", max_f_err_hold);
    return 0;
}
```

```bash
clang -O2 -Wall -o imu_host imu_host.c -lm && ./imu_host
```

```text
tau = 0.490 s, expected steady error = 0.490 deg
   t(s)  true   gyro-only  accel-only  filter
   1.00   0.00       1.00        2.39    0.43
   2.00   0.00       2.00       -1.59    0.61
   3.00  30.00      33.00       28.00   30.65
   4.00  30.00      34.00       27.47   30.55
   5.00  30.00      35.00       29.80   30.52
   6.00  30.00      36.00       31.18   30.69
   7.00  30.00      37.00       28.40   30.56
   8.00  30.00      38.00       29.08   30.48
   9.00  30.00      39.00       31.04   30.42
  10.00  30.00      40.00       30.48   30.43
max |accel-only error| = 2.86 deg
max |filter error| for t >= 6 s = 0.79 deg
```

gyro만 적분한 각도는 bias 때문에 10 s에 40°로, 실제보다 10° 위에 있습니다. accel만으로 구한 각도는 drift가 없지만 잡음 때문에 최대 2.86° 흔들립니다. filter는 6 s 이후 30.42~30.69°로, 계산한 정상 상태 오차 0.49° 근처에 머물고 잡음을 더해 최대 0.79° 어긋납니다. 2~3 s의 기울기 구간도 3 s에 30.65°로 따라옵니다.

### 보드에서

보드를 평평하게 두면 az ≈ +1 g, 나머지 accel ≈ 0이어야 하고, `accel_to_rp()`가 roll·pitch ≈ 0을 냅니다. x축으로 기울이면 ay = sin φ로 바뀌고 roll이 따라 움직입니다. 부호가 반대면 MPU-6050이 보드에 붙은 방향(Product Specification 11.1 "Orientation of Axes")과 이 글의 축 정의가 다르므로, 축이나 부호를 바꿔 맞춥니다.

## 자주 보는 함정

> ⚠️ Wake up 안 함

PWR_MGMT_1의 reset 값 0x40은 SLEEP = 1입니다. 0x00이나 0x01을 쓰기 전에는 data register가 바뀌지 않습니다.

> ⚠️ Scale factor 불일치

AFS_SEL = 1(±4 g)인데 16384로 나누면 값이 절반으로 나옵니다. 설정과 나눗수를 같은 표에서 가져옵니다.

> ⚠️ Data를 여러 번에 나눠 읽음

0x3B부터 14 byte를 한 번에 읽어야 accel·temp·gyro가 같은 sample입니다. 축마다 따로 읽으면 그 사이 sample이 바뀔 수 있습니다.

> ⚠️ INT가 한 번만 들어옴

LATCH_INT_EN만 켜고 INT_RD_CLEAR를 끈 채 INT_STATUS를 읽지 않으면 INT가 high로 남습니다. 위 4절처럼 0x30을 쓰거나 ISR 뒤에 INT_STATUS(0x3A)를 읽습니다.

> ⚠️ bias를 빼지 않고 적분

gyro만 적분하면 bias가 시간에 비례해 쌓입니다. host 실행에서 1 °/s bias는 10 s 뒤 gyro-only 각도를 10° 어긋나게 합니다.

## 정리

- MPU-6050은 **reset 후 SLEEP**(PWR_MGMT_1 = 0x40), 0x01로 깨우고 gyro PLL clock을 고릅니다.
- **DLPF_CFG = 3, SMPLRT_DIV = 9 → 100 Hz**, ±4 g는 8192 LSB/g, ±500 °/s는 65.5 LSB/(°/s).
- **0x3B부터 14 byte burst**, 400 kHz에서 382.5 µs.
- Data Ready는 **INT_PIN_CFG = 0x30**(latch + clear on any read)으로 EXTI에 맞춥니다.
- complementary filter의 **τ = α·dt/(1 − α)**, gyro bias b는 b·τ의 정상 상태 오차로 남습니다.

다음 편은 **CAN 통신**입니다. frame format, filter, bit timing, error frame을 다룹니다.

## 관련 항목

- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [5-08: 환경 센서](/blog/embedded/modern-recipes/part5-08-environmental-sensors)
- [5-10: CAN 통신](/blog/embedded/modern-recipes/part5-10-can-communication)
