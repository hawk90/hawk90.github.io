---
title: "I2C 하드웨어 분석 — Open-Drain·Clock Stretching·Arbitration"
slug: "embedded/modern-recipes/part1-06-i2c-hardware"
date: 2026-04-10T09:06:00
description: "SDA/SCL open-drain·START/STOP·ACK/NACK·arbitration·clock stretching·bus clear를 UM10204로 정리하고, 풀업 크기를 C_b와 V_DD로 계산하며 STM32F4 I2C 레지스터로 MPU-6050 WHO_AM_I를 읽습니다."
series: "Modern Embedded Recipes"
seriesOrder: 6
tags: [recipes, i2c, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"I2C는 두 선으로 여러 디바이스를 묶는 open-drain 버스입니다."** 실제 연결 가능한 수는 주소 충돌, 버스 커패시턴스, sink current와 전원 조건으로 결정됩니다.

## 어떤 상황에서 쓰나

- 센서(가속도계, 자이로, 온도, EEPROM) 다수 연결
- I/O expander, LED driver 같은 저속 주변기기
- 보드 식별, EDID 같은 메타데이터 read
- 핀 수가 부족할 때 가장 먼저 떠올리는 버스

## 핵심 개념

### 1) Open-drain wired-AND

I2C는 SDA와 SCL 두 선만 씁니다. 모든 디바이스가 open-drain으로 연결되고, 버스가 쉴 때는 외부 풀업 저항이 1을 유지합니다.

![I2C 버스 — SDA·SCL 두 선과 풀업 저항](/images/blog/modern-recipes/diagrams/part1-06-i2c-circuit.svg)

| 신호 | 연결 | 역할 |
| --- | --- | --- |
| VDD → Rp → SDA | 풀업 (값은 4절에서 계산) | idle 시 1 유지 |
| VDD → Rp → SCL | 풀업 (값은 4절에서 계산) | idle 시 1 유지 |
| Master ↔ SDA/SCL | open-drain | wired-AND 출력 |
| Slave  ↔ SDA/SCL | open-drain | wired-AND 출력 |

어느 디바이스든 0을 출력하면 line은 0이 됩니다. 모두가 high-Z(release)일 때만 풀업이 1로 끌어올립니다. 이 wired-AND 특성이 multi-master arbitration의 기반입니다.

UM10204 3.1.8절에 따르면 arbitration은 master가 둘 이상일 때만 필요하고 slave는 관여하지 않습니다. 두 master가 거의 동시에 START를 내면, 각 master는 매 비트 SCL이 high인 동안 SDA가 자기가 보낸 값과 같은지 봅니다. 1을 보냈는데 SDA가 0이면 진 것이므로 SDA 출력을 끄고, 이긴 쪽은 아무 정보도 잃지 않고 전송을 이어 갑니다. 진 master는 그 바이트가 끝날 때까지 클럭을 낼 수 있고, 버스가 비면 다시 시작해야 합니다. 주소 0x50과 0x48로 동시에 쓰기를 시작한 두 master를 wired-AND로 비트마다 계산해 본 결과입니다(`python3 arb.py`).

```python
def arbitrate(a, b, nbits=8):
    alive = {"A": a, "B": b}
    for i in range(nbits - 1, -1, -1):
        bits = {k: (v >> i) & 1 for k, v in alive.items()}
        sda = min(bits.values())                    # wired-AND: any 0 pulls low
        lost = [k for k in bits if bits[k] == 1 and sda == 0]
        for k in lost:
            del alive[k]
        if len(alive) == 1:
            return next(iter(alive))
    return "tie"
```

```text
bit7: A=1 B=1 -> SDA=1
bit6: A=0 B=0 -> SDA=0
bit5: A=1 B=0 -> SDA=0   A lost
winner: B
```

주소 바이트 0xA0과 0x90은 bit5에서 처음 갈립니다. 0을 보낸 B가 SDA를 0으로 당기므로 1을 보낸 A가 지고, 주소가 작은 쪽이 이깁니다. 두 master가 끝까지 같은 비트를 보내면 둘 다 오류 없이 같은 전송을 마칩니다.

### 2) 프레임 — START, address, data, ACK, STOP

![I2C 프레임 — START, 7-bit address, R/W, ACK](/images/blog/modern-recipes/diagrams/part1-06-i2c-frame.svg)

- **START**: SCL=1인 상태에서 SDA를 1 → 0으로 떨어뜨림
- **STOP**: SCL=1인 상태에서 SDA를 0 → 1로 올림
- **ACK**: 9번째 비트에서 수신 측(주소 단계에서는 slave)이 SDA를 0으로 끌어내림
- **NACK**: 수신 측이 9번째 비트에서 SDA를 놓아 풀업이 1로 유지됨. 주소·데이터를 받는 쪽이 거부하거나 받을 수 없을 때, 또는 master-receiver가 마지막 바이트를 표시할 때 냅니다(UM10204 3.1.6)

### 3) 속도 분류

NXP UM10204 Rev. 7.0의 속도 모드와, 풀업 계산에 쓰이는 버스 조건입니다. t_r·C_b는 Table 11, I_OL은 Table 10에서 옮겼습니다.

| 모드 | 최대 비트율 | t_r max | C_b max | I_OL min (V_OL 0.4 V) |
| --- | --- | ---: | ---: | ---: |
| Standard-mode (Sm) | 100 kbit/s | 1000 ns | 400 pF | 3 mA |
| Fast-mode (Fm) | 400 kbit/s | 300 ns | 400 pF | 3 mA |
| Fast-mode Plus (Fm+) | 1 Mbit/s | 120 ns | 550 pF | 20 mA |
| High-speed mode (Hs) | 3.4 Mbit/s | 별도 표(Table 12) | — | — |
| Ultra Fast-mode (UFm) | 5 Mbit/s, 단방향 | 별도 규격 | — | — |

Hs-mode는 master code로 진입하는 별도 프로토콜이고, UFm은 push-pull 단방향 버스라 이 글의 open-drain 계산과 다릅니다(UM10204 1장, 3.2절).

### 4) 풀업 저항 계산

풀업이 너무 크면 rise time이 길어 통신이 깨지고, 너무 작으면 디바이스가 V_OL을 지키며 끌어내릴 수 있는 전류(Sm·Fm은 3 mA)를 넘습니다. UM10204 7.1절의 두 식에 V_DD = 3.3 V, C_b = 100 pF를 넣은 값입니다. 0.8473은 0.3 V_DD에서 0.7 V_DD까지 RC 충전에 걸리는 시간 상수 배수 ln(0.7/0.3)입니다.

```text
R_min = (V_DD - V_OL) / I_OL
      = (3.3 - 0.4) / 3 mA = 967 Ω

R_max = t_r / (0.8473 × C_b)
      = 1000 ns / (0.8473 × 100 pF) = 11.8 kΩ (Standard-mode)
      =  300 ns / (0.8473 × 100 pF) =  3.54 kΩ (Fast-mode)
```

C_b는 보드마다 재야 하는 값입니다. UM10204가 주는 상한은 디바이스 I/O 핀 하나의 용량 C_i 최대 10 pF(Table 10)와 버스 전체 C_b 400 pF(Sm·Fm)입니다. 디바이스 10개면 핀 용량만으로 최대 100 pF이고, 여기에 배선 용량이 더해집니다. C_b별 범위 전체와 Fast-mode 400 pF 조건은 [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)의 계산표에 있습니다.

### 5) Clock stretching

slave가 느릴 때 SCL을 0으로 잡아 master를 기다리게 합니다. master는 SCL을 release한 후 line이 1이 되는지 확인합니다. 0으로 머물러 있으면 slave가 stretch 중이라는 뜻입니다.

```c
// Master에서의 stretch 인식 — SCL idle 후 1 대기
gpio_set_high(SCL);                    // release
while (gpio_read(SCL) == 0) { }        // wait slave to release too
```

## 코드 / 실제 사용 예

가속도계(MPU6050) WHO_AM_I 레지스터 read입니다.

```c
#include "stm32f407xx.h"

// I2C 초기화 — Fm 400 kHz 목표 @ PCLK1 42 MHz (RCC·GPIO AF 설정은 4-09)
void i2c1_init(void) {
    I2C1->CR2  = 42;                   // FREQ = PCLK1 in MHz
    I2C1->CCR  = (1 << 15) | 35;       // F/S = Fm, DUTY = 0: 42 MHz / (3 x 400 kHz)
    I2C1->TRISE = 13;                  // floor(300 ns / 23.8 ns) + 1
    I2C1->CR1 |= I2C_CR1_PE;
}

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

MPU-6050의 7비트 주소 0x68과 WHO_AM_I 레지스터 0x75(117), 기대값 0x68은 Linux v6.12의 `inv_mpu6050` 드라이버(`drivers/iio/imu/inv_mpu6050/inv_mpu_iio.h`의 `INV_MPU6050_REG_WHOAMI 117`, `INV_MPU6050_WHOAMI_VALUE 0x68`)와 DT 바인딩 예제(`reg = <0x68>`)에서 확인했습니다. 이 코드는 `cmsis_device_f4` 헤더로 `arm-none-eabi-gcc` 16.2.0에서 경고 없이 빌드됩니다. QEMU의 STM32F4 머신에는 I2C 컨트롤러 모델이 없어 실행은 하지 않았습니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -DSTM32F407xx \
  -I cmsis_device_f4/Include -I CMSIS_5/CMSIS/Core/Include -Wall -Wextra -c i2c.c
```

PCLK1은 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 `clock_init_168mhz()`가 만드는 42 MHz이고, STM32F405/407의 fPCLK1 최대값입니다(DS8626 Table 14; 이 글에서 직접 확인한 판은 Rev 4). CCR·TRISE는 RM0090 Rev 22 27.6.8·27.6.9의 식에 UM10204 Table 11의 Fm 최대 rise time 300 ns를 넣은 값입니다. RM0090 CCR note는 400 kHz 최대 Fm 클럭에 도달하려면 fPCLK1이 10 MHz의 배수여야 한다고 적으므로, 42 MHz에서 400 kHz는 식의 목표값이고 실제 SCL이 400 kHz라는 보장은 아닙니다. 계산 과정은 [4-09: I2C 드라이버 구현](/blog/embedded/modern-recipes/part4-09-i2c-driver)에 있습니다.

## 측정 / 비교

자주 쓰는 풀업 값을 C_b = 100 pF에서 t_r = 0.8473 × R × C_b로 계산해 UM10204 Table 11의 상한과 비교했습니다. V_DD = 3.3 V에서 저항이 끌어내리는 전류도 함께 적습니다.

| 풀업 저항 | t_r (100 pF) | Sm (≤ 1000 ns) | Fm (≤ 300 ns) | low일 때 전류 (3.3 V − 0.4 V) / R |
| --- | ---: | --- | --- | ---: |
| 1 kΩ | 85 ns | 통과 | 통과 | 2.9 mA |
| 2.2 kΩ | 186 ns | 통과 | 통과 | 1.3 mA |
| 4.7 kΩ | 398 ns | 통과 | 불통과 | 0.62 mA |
| 10 kΩ | 847 ns | 통과 | 불통과 | 0.29 mA |

1 kΩ은 3 mA 한도에 0.1 mA 차이로 들어가고, 4.7 kΩ은 100 pF에서 Fast-mode rise time을 넘습니다.

## 자주 보는 함정

> ⚠️ 풀업 없음 또는 너무 약함

STM32F405/407 내부 풀업은 30~50 kΩ(PA10·PB12 제외, DS8626 Table 47)입니다. 1-03의 계산대로 가장 작은 30 kΩ에 50 pF만 걸어도 rise time이 1271 ns라 Standard-mode 상한 1000 ns를 넘습니다.

> ⚠️ Bus stuck — SDA 0에 멈춤

master가 읽기 도중 리셋되면, slave는 다음 비트를 내보내려고 SDA를 0으로 잡은 채 SCL을 기다릴 수 있습니다. SCL이 high인 동안 SDA를 올려야 STOP인데 SDA가 0에 묶여 있으니 STOP을 만들 수 없습니다. UM10204 3.1.16절 *Bus clear*는 SDA가 low에 묶이면 controller가 클럭 9개를 보내고, 버스를 잡은 디바이스가 그 안에 SDA를 놓아야 하며, 그래도 안 되면 HW reset이나 전원 재투입을 하라고 적습니다.

```c
// Bus recovery — SCL을 9번 토글해 slave를 idle로 강제
#define CPU_HZ 168000000u   // SYSCLK after clock_init_168mhz() (4-04)

void i2c_recover(void) {
    for (int i = 0; i < 9; i++) {
        gpio_set_low(SCL);  delay_us_dwt(5, CPU_HZ);
        gpio_set_high(SCL); delay_us_dwt(5, CPU_HZ);
    }
    // Manual STOP
    gpio_set_low(SCL);  delay_us_dwt(5, CPU_HZ);
    gpio_set_low(SDA);  delay_us_dwt(5, CPU_HZ);   // SCL low: no START
    gpio_set_high(SCL); delay_us_dwt(5, CPU_HZ);
    gpio_set_high(SDA); delay_us_dwt(5, CPU_HZ);   // SCL high: STOP
}
```

SCL이 high인 동안 SDA가 high에서 low로 바뀌면 START, low에서 high로 바뀌면 STOP입니다(UM10204 Rev 7.0 3.1.4). 루프가 SCL을 high로 두고 끝나므로 SCL을 먼저 내린 뒤 SDA를 내려야 STOP 앞에 START가 끼지 않습니다. `delay_us_dwt()`는 [4-06: SysTick 타이머 활용](/blog/embedded/modern-recipes/part4-06-systick-timer)의 DWT cycle counter delay입니다.

> ⚠️ Address 충돌

같은 7-bit 주소를 가진 디바이스를 두 개 붙이면 둘 다 ACK하고, 읽기에서는 두 출력이 wired-AND로 섞입니다. 주소 선택 핀이 있는 디바이스는 그 핀의 연결로 주소를 나누고, 없으면 같은 주소의 디바이스를 다른 버스로 옮깁니다.

> ⚠️ Repeated START 미지원

UM10204 3.1.4절은 START 뒤 버스가 busy가 되고, STOP 대신 repeated START(Sr)를 내면 버스가 계속 busy로 남는다고 적습니다. 그래서 레지스터 주소를 쓰고 읽는 사이에 STOP을 넣으면 multi-master 버스에서 다른 master가 그 틈에 버스를 가져갈 수 있습니다. 위 `mpu_who_am_i()`가 두 번째 `START`를 STOP 없이 내는 이유입니다.

## 정리

- I2C는 두 선(SDA, SCL) open-drain wired-AND 버스입니다.
- 풀업 저항은 UM10204 7.1절 식으로 C_b와 V_DD에서 범위를 구합니다. 100 pF·3.3 V면 Sm 0.97~11.8 kΩ, Fm 0.97~3.54 kΩ입니다.
- NACK는 수신 측이 바이트를 받지 않았다는 신호이고, 주소 단계의 NACK는 그 주소의 디바이스가 응답하지 않았다는 뜻입니다(UM10204 3.1.6).
- Clock stretching으로 slave가 master를 기다리게 할 수 있습니다.
- SDA가 low에 묶이면 클럭 9개를 보내고(UM10204 3.1.16), 그래도 안 되면 리셋이나 전원 재투입입니다.

다음 편에서는 **ADC 동작 원리**를 다룹니다. 아날로그 → 디지털 변환의 내부입니다.

## 관련 항목

- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [1-07: ADC 동작 원리](/blog/embedded/modern-recipes/part1-07-adc-principles)
- [4-09: I2C 드라이버 구현](/blog/embedded/modern-recipes/part4-09-i2c-driver)
