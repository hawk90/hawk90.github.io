---
title: "5-09: IMU (가속도·자이로·지자기)"
date: 2026-05-14T09:00:00
description: "MPU6050·BMI270 — sensor fusion 입력 단계."
series: "Modern Embedded Recipes"
seriesOrder: 57
tags: [recipes, peripheral, imu]
draft: false
---

## 한 줄 요약

> **"6축 또는 9축 raw data를 100-1000 Hz로 sampling."** 그 위에 sensor fusion (Madgwick, Mahony, EKF)이 올라갑니다.

## 어떤 상황에서 쓰나

drone flight controller, self-balancing robot, smartphone orientation, VR headset, athletic activity tracker — 모두 *IMU + fusion algorithm*. IMU가 *raw accel + gyro + mag*를 빠르게 sampling, fusion이 *roll·pitch·yaw*로 변환.

이 글은 MPU6050 (6축, I2C, 가장 흔함)과 BMI270 (6축, SPI, 더 최신)을 다룹니다. magnetometer는 *HMC5883L* 또는 BMI270 + BMM150 조합.

## 핵심 개념

### IMU의 세 sensor

**Accelerometer (가속도계):**

- 3축 가속도 (g 단위)
- 중력 + linear motion 측정
- 사용: tilt 각도, motion detection

**Gyroscope (자이로):**

- 3축 angular velocity (°/s)
- rotation rate 직접 측정
- 사용: turn rate, drift 보정

**Magnetometer (지자기):**

- 3축 magnetic field (µT)
- 지구 자기장 방향
- 사용: yaw absolute reference (compass)

6축 = accel + gyro. 9축 = + mag.

### MPU6050 register map (요약)

| Address | 이름 | 역할 |
|---------|------|------|
| 0x6B | PWR_MGMT_1 | sleep, clock source |
| 0x1B | GYRO_CONFIG | ±250/500/1000/2000 °/s |
| 0x1C | ACCEL_CONFIG | ±2/4/8/16 g |
| 0x19 | SMPLRT_DIV | sample rate divider |
| 0x1A | CONFIG | DLPF (low-pass filter) |
| 0x3B-48 | ACCEL/TEMP/GYRO | 14 byte raw data |
| 0x75 | WHO_AM_I | 0x68 (chip id) |

I2C address 0x68 (ADO=GND) 또는 0x69 (ADO=VDD).

### Scale 환산

**Accel:**

- ±2 g  → 16384 LSB/g
- ±4 g  → 8192
- ±8 g  → 4096
- ±16 g → 2048

**Gyro:**

- ±250 °/s  → 131 LSB/(°/s)
- ±500     → 65.5
- ±1000    → 32.8
- ±2000    → 16.4

raw_int16 / scale = physical value.

### Sampling 전략

**Polling (low-rate ≤ 100 Hz):**

- 매 SysTick으로 read

**Interrupt-driven (≤ 1 kHz):**

- Data Ready (DRDY) 핀에 IMU가 1 kHz로 pulse → ISR → read

**FIFO + DMA (high-rate, batch):**

- IMU 내부 FIFO에 누적 → 가득 차면 DMA로 한꺼번에 read

### Calibration

**Accel:**

- 6-position calibration (각 축 ±g) → bias, scale 보정

**Gyro:**

- 정지 상태 평균 → bias offset (drift 보정)

**Magnetometer:**

- hard iron (offset) + soft iron (matrix)
- → 8자 또는 구 모양으로 회전시키며 calib

calibration 없으면 *zero에 떠 있을 때도 0이 아님* — fusion이 drift합니다.

## 코드 예제

### 1. MPU6050 init + read

```c
#define MPU_ADDR 0x68

uint8_t mpu_read(uint8_t reg) {
    uint8_t v;
    i2c_read_reg(MPU_ADDR, reg, &v, 1);
    return v;
}

void mpu_write(uint8_t reg, uint8_t val) {
    uint8_t buf[2] = {reg, val};
    i2c_write(MPU_ADDR, buf, 2);
}

int mpu_init(void) {
    if (mpu_read(0x75) != 0x68) return -1;

    mpu_write(0x6B, 0x80);        // reset
    delay_ms(100);
    mpu_write(0x6B, 0x01);        // wake up, gyro clock
    mpu_write(0x1A, 0x03);        // DLPF: 44 Hz BW
    mpu_write(0x19, 9);           // sample rate 1kHz / (1+9) = 100 Hz
    mpu_write(0x1B, (1 << 3));    // gyro ±500 °/s
    mpu_write(0x1C, (1 << 3));    // accel ±4 g
    return 0;
}

typedef struct {
    float ax, ay, az;   // g
    float gx, gy, gz;   // °/s
    float temp_c;
} mpu_data_t;

void mpu_read_all(mpu_data_t *d) {
    uint8_t buf[14];
    i2c_read_reg(MPU_ADDR, 0x3B, buf, 14);

    int16_t ax = (buf[0]  << 8) | buf[1];
    int16_t ay = (buf[2]  << 8) | buf[3];
    int16_t az = (buf[4]  << 8) | buf[5];
    int16_t t  = (buf[6]  << 8) | buf[7];
    int16_t gx = (buf[8]  << 8) | buf[9];
    int16_t gy = (buf[10] << 8) | buf[11];
    int16_t gz = (buf[12] << 8) | buf[13];

    d->ax = ax / 8192.0f;   // ±4 g → 8192
    d->ay = ay / 8192.0f;
    d->az = az / 8192.0f;
    d->gx = gx / 65.5f;     // ±500 °/s → 65.5
    d->gy = gy / 65.5f;
    d->gz = gz / 65.5f;
    d->temp_c = t / 340.0f + 36.53f;
}
```

### 2. Gyro bias calibration

```c
typedef struct {
    float bx, by, bz;
} gyro_bias_t;

void gyro_calibrate(gyro_bias_t *b) {
    // 보드를 정지시킨 상태에서 호출
    float sum_x = 0, sum_y = 0, sum_z = 0;
    const int N = 500;

    for (int i = 0; i < N; i++) {
        mpu_data_t d;
        mpu_read_all(&d);
        sum_x += d.gx;
        sum_y += d.gy;
        sum_z += d.gz;
        delay_ms(2);
    }
    b->bx = sum_x / N;
    b->by = sum_y / N;
    b->bz = sum_z / N;
}

void mpu_read_calibrated(mpu_data_t *d, const gyro_bias_t *b) {
    mpu_read_all(d);
    d->gx -= b->bx;
    d->gy -= b->by;
    d->gz -= b->bz;
}
```

### 3. Roll/pitch — accelerometer only

```c
float atan2_deg(float y, float x) {
    return atan2f(y, x) * (180.0f / 3.14159f);
}

void accel_to_rp(const mpu_data_t *d, float *roll, float *pitch) {
    *roll  = atan2_deg(d->ay, d->az);
    *pitch = atan2_deg(-d->ax, sqrtf(d->ay * d->ay + d->az * d->az));
}
```

accel만으로 *정적 자세*는 정확하지만, *동적 motion*은 부정확. fusion이 필요한 이유.

### 4. Complementary filter — 간단한 fusion

```c
typedef struct {
    float roll, pitch;
    float dt;
    float alpha;   // 0.98 등
} compl_t;

void compl_update(compl_t *f, const mpu_data_t *d) {
    float roll_acc, pitch_acc;
    accel_to_rp(d, &roll_acc, &pitch_acc);

    // gyro integration
    f->roll  += d->gx * f->dt;
    f->pitch += d->gy * f->dt;

    // blend
    f->roll  = f->alpha * f->roll  + (1 - f->alpha) * roll_acc;
    f->pitch = f->alpha * f->pitch + (1 - f->alpha) * pitch_acc;
}
```

`alpha = 0.98`이면 *gyro 98% + accel 2%*. gyro의 빠른 응답 + accel의 long-term 정확도 결합.

더 정교한 방법은 *Madgwick filter*나 *Kalman filter* — quaternion 기반.

### 5. INT pin으로 sampling 동기화

```c
// MPU INT pin = PA0 EXTI0
void mpu_int_init(void) {
    mpu_write(0x37, 0x20);   // INT pin: latched, clear on read
    mpu_write(0x38, 0x01);   // data ready interrupt enable

    EXTI->IMR  |= (1u << 0);
    EXTI->RTSR |= (1u << 0);
    NVIC_EnableIRQ(EXTI0_IRQn);
}

volatile int data_ready;

void EXTI0_IRQHandler(void) {
    EXTI->PR = (1u << 0);
    data_ready = 1;
}

// main
while (1) {
    if (data_ready) {
        data_ready = 0;
        mpu_read_all(&d);
        process(&d);
    }
}
```

100 Hz보다 빠른 sampling은 *INT 동기*가 jitter를 줄입니다.

## 측정 / 동작 확인

**보드 평평한 책상 위:**

- ax = 0.00 g, ay = 0.00 g, az = 1.00 g
- gx = 0, gy = 0, gz = 0 (calibration 후)

**보드를 좌측으로 90°:**

- ax = 0, ay = 1.00 g, az = 0

값이 변하면 sensor 동작. drift가 *몇 °/min* 정도면 정상, 더 크면 calibration 부족.

## 자주 보는 함정

> ⚠️ Wake up 안 함

PWR_MGMT_1 = 0x40 (sleep mode)이 default. 0x01로 wake.

> ⚠️ Scale factor 잘못

±2g인데 ±4g scale 적용 → 값이 절반. config register 확인.

> ⚠️ Calibration 없음

gyro drift가 *수 °/sec*씩 누적 → integration이 빠르게 발산.

> ⚠️ DLPF disable

cutoff 너무 높으면 vibration noise가 들어옴. application에 맞게 (drone 44 Hz, 일반 motion 10 Hz).

> ⚠️ I2C 400 kHz 한계

14 byte read @ 400 kHz = 280 µs. 1 kHz sampling이면 28% I2C bus. SPI가 더 빠름.

> ⚠️ Magnetometer를 motor·전류 옆에 둠

motor·고전류 wire의 magnetic field가 *지자기보다 훨씬 큼*. mag sensor는 *전기 noise source에서 떨어진 위치*에.

## 정리

- IMU = **accel (g) + gyro (°/s) + (optional) mag (µT)** raw output.
- **Calibration**: gyro bias (정지 평균), accel 6-position, mag hard/soft iron.
- **Complementary filter (alpha=0.98)**가 가장 간단한 fusion.
- **INT pin + EXTI**로 jitter-free sampling.
- 더 정교한 fusion은 **Madgwick·Mahony·Kalman** — quaternion 기반.

다음 편은 **CAN 통신**입니다. frame format, filter, bit timing, error frame을 다룹니다.

## 관련 항목

- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [5-08: 환경 센서](/blog/embedded/modern-recipes/part5-08-environmental-sensors)
- [5-10: CAN 통신](/blog/embedded/modern-recipes/part5-10-can-communication)
- [9-05: PID 제어 기본](/blog/embedded/modern-recipes/part9-05-pid-control)
