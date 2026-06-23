---
title: "I2C 하드웨어 분석 — Open-Drain·Clock Stretching·Arbitration"
date: 2026-04-10T09:06:00
description: "SDA/SCL·7/10-bit addressing·ACK/NACK·clock stretching·풀업 크기 선정."
series: "Modern Embedded Recipes"
seriesOrder: 6
tags: [recipes, i2c, hw-basics]
draft: false
---

## 한 줄 요약

> **"I2C는 두 선으로 100 개의 디바이스를 묶는 open-drain 버스입니다."** 풀업 저항 하나가 속도와 전력 모두를 결정합니다.

## 어떤 상황에서 쓰나

- 센서(가속도계, 자이로, 온도, EEPROM) 다수 연결
- I/O expander, LED driver 같은 저속 주변기기
- 보드 식별, EDID 같은 메타데이터 read
- 핀 수가 부족할 때 가장 먼저 떠올리는 버스

## 핵심 개념

### 1) Open-drain wired-AND

I2C는 SDA와 SCL 두 선만 씁니다. 모든 디바이스가 open-drain으로 연결되고, 외부 풀업 저항으로 idle 시 1을 유지합니다.

![I2C 버스 — SDA·SCL 두 선과 풀업 저항](/images/blog/modern-recipes/diagrams/part1-06-i2c-circuit.svg)

| 신호 | 연결 | 역할 |
| --- | --- | --- |
| VDD → Rp → SDA | 풀업 (2.2 ~ 10 kΩ) | idle 시 1 유지 |
| VDD → Rp → SCL | 풀업 (2.2 ~ 10 kΩ) | idle 시 1 유지 |
| Master ↔ SDA/SCL | open-drain | wired-AND 출력 |
| Slave  ↔ SDA/SCL | open-drain | wired-AND 출력 |

누구든 한 디바이스가 0을 출력하면 line은 0이 됩니다. 모두가 high-Z(release)일 때만 풀업이 1로 끌어올립니다. 이 wired-AND 특성이 multi-master arbitration의 기반입니다.

### 2) 프레임 — START, address, data, ACK, STOP

![I2C 프레임 — START, 7-bit address, R/W, ACK](/images/blog/modern-recipes/diagrams/part1-06-i2c-frame.svg)

- **START**: SCL=1인 상태에서 SDA를 1 → 0으로 떨어뜨림
- **STOP**: SCL=1인 상태에서 SDA를 0 → 1로 올림
- **ACK**: 9번째 비트에서 슬레이브가 SDA를 0으로 끌어내림
- **NACK**: 슬레이브가 SDA를 그대로 두면 풀업이 1로 유지 (master에게 "그만"을 알림)

### 3) 속도 분류

| 표준 | 속도 | 풀업 |
| --- | --- | --- |
| Standard | 100 kHz | 4.7 kΩ 표준 |
| Fast | 400 kHz | 2.2 kΩ |
| Fast Plus | 1 MHz | 1 kΩ + push-pull boost |
| High Speed | 3.4 MHz | 전용 buffer 필요 |

### 4) 풀업 저항 계산

풀업이 너무 크면 rise time이 길어 통신이 깨집니다. 너무 작으면 sink 전류가 슬레이브 사양(보통 3 mA)을 초과합니다.

```text
R_min = (V_DD - V_OL) / I_sink_max
      = (3.3 - 0.4) / 3 mA ≈ 970 Ω → 1 kΩ 이상

R_max = T_rise / (0.847 × C_bus)
      = 1000 ns / (0.847 × 100 pF) ≈ 11.8 kΩ (Standard mode)
      = 300 ns / (0.847 × 100 pF) ≈ 3.5 kΩ (Fast mode)
```

100 pF 부하 가정입니다. 실제 보드는 트레이스·디바이스 입력 커패시턴스로 50 ~ 400 pF가 됩니다.

### 5) Clock stretching

슬레이브가 느릴 때 SCL을 0으로 잡아 master를 기다리게 합니다. master는 SCL을 release한 후 line이 1이 되는지 확인합니다. 0으로 머물러 있으면 slave가 stretch 중이라는 뜻입니다.

```c
// Master에서의 stretch 인식 — SCL idle 후 1 대기
gpio_set_high(SCL);                    // release
while (gpio_read(SCL) == 0) { }        // wait slave to release too
```

## 코드 / 실제 사용 예

가속도계(MPU6050) WHO_AM_I 레지스터 read입니다.

```c
// I2C 초기화 — 400 kHz @ 84 MHz APB
I2C1->CR2  = 84;                       // PCLK = 84 MHz
I2C1->CCR  = (1 << 15) | 1;            // FM mode, t_high = 1 cycle
I2C1->TRISE = 26;                      // max rise time
I2C1->CR1 |= I2C_CR1_PE;

uint8_t mpu_who_am_i(void) {
    uint8_t val;

    // START + write addr (0x68 << 1 | 0)
    I2C1->CR1 |= I2C_CR1_START;
    while (!(I2C1->SR1 & I2C_SR1_SB));
    I2C1->DR = (0x68 << 1) | 0;
    while (!(I2C1->SR1 & I2C_SR1_ADDR));
    (void)I2C1->SR2;

    // Write register address 0x75
    I2C1->DR = 0x75;
    while (!(I2C1->SR1 & I2C_SR1_BTF));

    // Repeated START + read
    I2C1->CR1 |= I2C_CR1_START;
    while (!(I2C1->SR1 & I2C_SR1_SB));
    I2C1->DR = (0x68 << 1) | 1;
    while (!(I2C1->SR1 & I2C_SR1_ADDR));
    I2C1->CR1 &= ~I2C_CR1_ACK;          // NACK after 1 byte
    (void)I2C1->SR2;
    I2C1->CR1 |= I2C_CR1_STOP;

    while (!(I2C1->SR1 & I2C_SR1_RXNE));
    val = I2C1->DR;
    return val;                          // 0x68 (default)
}
```

## 측정 / 비교

| 풀업 저항 | 100 pF 부하 rise time | 100 kHz 동작 | 400 kHz 동작 |
| --- | --- | --- | --- |
| 1 kΩ | 85 ns | OK (전력 큼) | OK (전력 큼) |
| 2.2 kΩ | 186 ns | OK | OK |
| 4.7 kΩ | 398 ns | OK | 한계 |
| 10 kΩ | 847 ns | 한계 | 불가 |

| 디바이스 수 | 전형적인 bus 커패시턴스 |
| --- | --- |
| 2 ~ 3 | 50 ~ 80 pF |
| 5 ~ 10 | 100 ~ 200 pF |
| 16+ | 300 pF 초과 (buffer 필요) |

## 자주 보는 함정

> ⚠️ 풀업 없음 또는 너무 약함

내부 풀업(30 ~ 50 kΩ)만 켜고 외부 풀업이 없으면 100 kHz도 동작하지 않습니다. SDA가 high로 올라오는 데 1 µs 이상 걸려 깨집니다.

> ⚠️ Bus stuck — SDA 0에 멈춤

슬레이브가 read 도중 reset되면 SDA가 0인 상태로 멈춥니다. master가 STOP을 보낼 수 없게 되어 영원히 멈춥니다.

```c
// Bus recovery — SCL을 9번 토글해 slave를 idle로 강제
void i2c_recover(void) {
    for (int i = 0; i < 9; i++) {
        gpio_set_low(SCL); delay_us(5);
        gpio_set_high(SCL); delay_us(5);
    }
    // Manual STOP
    gpio_set_low(SDA); delay_us(5);
    gpio_set_high(SCL); delay_us(5);
    gpio_set_high(SDA); delay_us(5);
}
```

> ⚠️ Address 충돌

같은 7-bit 주소를 가진 디바이스를 두 개 붙이면 둘 다 ACK를 시도합니다. 데이터시트의 address pin 또는 OTP로 주소를 분리합니다.

> ⚠️ 10-bit address 미지원 master

대부분의 디바이스는 7-bit이지만 일부 sensor는 10-bit를 씁니다. master 드라이버가 지원하는지 확인합니다.

> ⚠️ Repeated START 미지원

write-then-read 시 STOP을 거치면 다른 master가 끼어들 수 있습니다. Repeated START로 한 transaction을 만들어야 atomic 합니다.

## 정리

- I2C는 두 선(SDA, SCL) open-drain wired-AND 버스입니다.
- 풀업 저항이 핵심입니다. 100 kHz에 4.7k, 400 kHz에 2.2k가 표준입니다.
- ACK/NACK로 슬레이브 응답을 확인합니다. NACK는 "디바이스 없음"의 신호입니다.
- Clock stretching으로 슬레이브가 master를 기다리게 할 수 있습니다.
- Bus stuck은 SCL 9-toggle 시퀀스로 복구합니다.

다음 편에서는 **ADC 동작 원리**를 다룹니다. 아날로그 → 디지털 변환의 내부입니다.

## 관련 항목

- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [1-07: ADC 동작 원리](/blog/embedded/modern-recipes/part1-07-adc-principles)
- 더 깊이 — [Embedded Performance Engineering: Bus 통계](/blog/embedded/performance-engineering/00-preface)
