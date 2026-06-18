---
title: "I2C 드라이버 구현 — Master·7-bit/10-bit·Clock Stretching 처리"
date: 2026-04-13T09:43:00
description: "Master·repeated start·NACK 처리·timeout."
series: "Modern Embedded Recipes"
seriesOrder: 43
tags: [recipes, bare-metal, i2c]
draft: false
---

## 한 줄 요약

> **"I2C는 state machine + timeout이 전부입니다."** START → ADDR → DATA → STOP. 각 단계가 flag를 set하기를 timeout 안에 기다립니다.

## 어떤 상황에서 쓰나

I2C는 *센서·EEPROM·RTC·OLED*가 가장 자주 쓰는 버스입니다. SPI보다 신호선이 적고 (2선), 같은 버스에 여러 device를 붙일 수 있습니다. 단점은 *느리고* (100k/400k/1M Hz), *clock stretching이나 NACK에 hang하기 쉽다*는 점입니다.

이 글은 STM32F4 I2C peripheral을 master mode로 다루며, NACK 회복과 timeout으로 hang을 방지하는 패턴을 정리합니다. (참고: STM32F7/H7/G0/G4의 I2C는 *완전히 다른 design*이라 register가 다르나, 개념은 동일합니다.)

## 핵심 개념

### I2C 신호 흐름

| 단계 | 송신자 | 내용 |
| --- | --- | --- |
| 1 | Master | START condition |
| 2 | Master | SLA + W (7-bit addr + 0) |
| 3 | Slave | ACK |
| 4 | Master | DATA byte (write) |
| 5 | Slave | ACK |
| 6 | Master | Repeated START |
| 7 | Master | SLA + R |
| 8 | Slave | ACK |
| 9 | Slave | DATA byte (read) |
| 10 | Master | ACK (or NACK if last) |
| 11 | Master | STOP condition |

### STM32F4 I2C state machine

| 단계 | 기다릴 flag | 다음 동작 |
|------|------------|-----------|
| START | SB (SR1 bit 0) | DR에 SLA+W/R write |
| Address sent | ADDR (SR1 bit 1) | SR1·SR2 read해서 clear, then DR write |
| Byte transferred | TxE / BTF | 다음 byte write 또는 STOP |
| Byte received | RxNE | DR read |
| STOP | (자동) | bus 해제 |

각 단계마다 *timeout과 함께 폴링*합니다. timeout 없으면 *slave가 죽을 때 영원히 hang*합니다.

### Clock speed setup

```text
Standard mode (100 kHz):
CCR = PCLK / (2 × 100000)

Fast mode (400 kHz):
CCR = PCLK / (3 × 400000)   (DUTY=0)
CCR = PCLK / (25 × 400000)  (DUTY=1)

TRISE = (PCLK / 1MHz) + 1    (standard)
TRISE = (PCLK × 0.3) + 1     (fast)
```

예: PCLK1 = 42 MHz, 400 kHz fast mode → CCR = 35, TRISE = 13.

## 코드 예제

### 1. I2C init

```c
void i2c_init_400k(void) {
    RCC->APB1ENR |= RCC_APB1ENR_I2C1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOBEN;

    // PB8 SCL, PB9 SDA (AF4, open-drain, no pull — 외부 4.7k pull-up)
    gpio_init(GPIOB, 8, &(gpio_config_t){.mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_OD,
                                          .speed=GPIO_SPEED_MED, .af=4});
    gpio_init(GPIOB, 9, &(gpio_config_t){.mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_OD,
                                          .speed=GPIO_SPEED_MED, .af=4});

    I2C1->CR1 = I2C_CR1_SWRST;
    I2C1->CR1 = 0;

    I2C1->CR2   = 42u;             // PCLK1 = 42 MHz
    I2C1->CCR   = I2C_CCR_FS | 35; // fast mode, 400 kHz
    I2C1->TRISE = 13;
    I2C1->CR1   = I2C_CR1_PE;       // enable
}
```

### 2. Write (master TX)

```c
#define I2C_TIMEOUT_MS 50

static int wait_flag(volatile uint32_t *reg, uint32_t mask, int set) {
    uint32_t start = millis();
    while (((*reg & mask) != 0) != set) {
        if (millis() - start > I2C_TIMEOUT_MS) return -1;
    }
    return 0;
}

int i2c_write(uint8_t addr7, const uint8_t *data, size_t n) {
    // START
    I2C1->CR1 |= I2C_CR1_START;
    if (wait_flag(&I2C1->SR1, I2C_SR1_SB, 1)) return -1;

    // SLA+W
    I2C1->DR = (addr7 << 1) | 0;
    if (wait_flag(&I2C1->SR1, I2C_SR1_ADDR, 1)) {
        I2C1->CR1 |= I2C_CR1_STOP;
        return -2;   // NACK or bus error
    }
    (void)I2C1->SR1; (void)I2C1->SR2;   // clear ADDR

    // DATA bytes
    for (size_t i = 0; i < n; i++) {
        if (wait_flag(&I2C1->SR1, I2C_SR1_TXE, 1)) goto err;
        I2C1->DR = data[i];
    }
    if (wait_flag(&I2C1->SR1, I2C_SR1_BTF, 1)) goto err;

    // STOP
    I2C1->CR1 |= I2C_CR1_STOP;
    return 0;

err:
    I2C1->CR1 |= I2C_CR1_STOP;
    return -3;
}
```

### 3. Read (repeated START)

대부분의 sensor는 *register address write → repeated START → read* 패턴입니다.

```c
int i2c_read_reg(uint8_t addr7, uint8_t reg, uint8_t *buf, size_t n) {
    if (n == 0) return 0;

    // === Phase 1: write reg address ===
    I2C1->CR1 |= I2C_CR1_START;
    if (wait_flag(&I2C1->SR1, I2C_SR1_SB, 1)) return -1;

    I2C1->DR = (addr7 << 1) | 0;
    if (wait_flag(&I2C1->SR1, I2C_SR1_ADDR, 1)) goto stop;
    (void)I2C1->SR1; (void)I2C1->SR2;

    if (wait_flag(&I2C1->SR1, I2C_SR1_TXE, 1)) goto stop;
    I2C1->DR = reg;
    if (wait_flag(&I2C1->SR1, I2C_SR1_BTF, 1)) goto stop;

    // === Phase 2: repeated START + read ===
    I2C1->CR1 |= I2C_CR1_START;
    if (wait_flag(&I2C1->SR1, I2C_SR1_SB, 1)) goto stop;

    I2C1->DR = (addr7 << 1) | 1;

    if (n == 1) {
        I2C1->CR1 &= ~I2C_CR1_ACK;       // NACK after first byte
        if (wait_flag(&I2C1->SR1, I2C_SR1_ADDR, 1)) goto stop;
        (void)I2C1->SR1; (void)I2C1->SR2;
        I2C1->CR1 |= I2C_CR1_STOP;
        if (wait_flag(&I2C1->SR1, I2C_SR1_RXNE, 1)) return -1;
        buf[0] = I2C1->DR;
    } else {
        I2C1->CR1 |= I2C_CR1_ACK;
        if (wait_flag(&I2C1->SR1, I2C_SR1_ADDR, 1)) goto stop;
        (void)I2C1->SR1; (void)I2C1->SR2;

        for (size_t i = 0; i < n; i++) {
            if (i == n - 1) {
                I2C1->CR1 &= ~I2C_CR1_ACK;
                I2C1->CR1 |= I2C_CR1_STOP;
            }
            if (wait_flag(&I2C1->SR1, I2C_SR1_RXNE, 1)) return -1;
            buf[i] = I2C1->DR;
        }
    }
    return 0;

stop:
    I2C1->CR1 |= I2C_CR1_STOP;
    return -2;
}
```

### 4. Bus recovery — slave가 SDA를 hold하면

I2C는 *slave가 unexpectedly reset된 후* SDA를 low로 hold할 수 있습니다. master가 SCL을 *수동으로 9개 발생*시키면 slave가 풀어 줍니다.

```c
void i2c_bus_recover(void) {
    // SCL/SDA를 GPIO output으로 임시 전환
    gpio_init(GPIOB, 8, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .otype=GPIO_OTYPE_OD});
    gpio_init(GPIOB, 9, &(gpio_config_t){.mode=GPIO_MODE_INPUT, .pull=GPIO_PULL_UP});

    for (int i = 0; i < 9; i++) {
        GPIOB->BSRR = (1u << (8 + 16)); delay_us(5);
        GPIOB->BSRR = (1u << 8);        delay_us(5);
        if (GPIOB->IDR & (1u << 9)) break;   // SDA released
    }

    // STOP manually: SDA low → SCL high → SDA high
    gpio_init(GPIOB, 9, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .otype=GPIO_OTYPE_OD});
    GPIOB->BSRR = (1u << (9 + 16)); delay_us(5);
    GPIOB->BSRR = (1u << 8);        delay_us(5);
    GPIOB->BSRR = (1u << 9);        delay_us(5);

    // Back to AF
    gpio_init(GPIOB, 8, &(gpio_config_t){.mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_OD, .af=4});
    gpio_init(GPIOB, 9, &(gpio_config_t){.mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_OD, .af=4});

    I2C1->CR1 |= I2C_CR1_SWRST;
    I2C1->CR1 = 0;
    i2c_init_400k();
}
```

## 측정 / 동작 확인

로직 애널라이저로 SCL·SDA를 보면 전체 transaction이 보입니다.

![I2C transaction — START, address+ACK, data+ACK, STOP](/images/blog/modern-recipes/diagrams/part4-09-i2c-transaction.svg)

가장 흔한 진단:
- **ACK가 NACK로 보이면**: device address가 틀렸거나 device가 power-off.
- **SCL이 stuck low**: slave가 clock stretching 중. timeout 후 reset.
- **SDA가 stuck low**: slave가 hang. bus recovery 9-pulse 시도.

## 자주 보는 함정

> ⚠️ Pull-up 누락

I2C는 *반드시 외부 pull-up* (보통 4.7 kΩ). MCU internal pull-up은 약해 (40 kΩ) 400 kHz에서 동작 안 합니다.

> ⚠️ Internal pull-up만으로 시도

400 kHz fast mode는 rise time이 빠듯해 *external pull-up 필수*. 100 kHz에서는 internal로도 가까스로 동작.

> ⚠️ ADDR clear 순서 (SR1 → SR2)

`(void)I2C1->SR1; (void)I2C1->SR2;` 순서가 중요. 다른 순서면 clear 안 되고 hang.

> ⚠️ Repeated START에서 ACK/STOP 타이밍

1-byte read는 *ADDR clear 전*에 NACK + STOP을 set해야 합니다. N-byte는 *N-1번째 byte read 후* set. STM32F4 reference manual의 figure를 따라야 합니다.

> ⚠️ Timeout 없음

slave가 죽으면 `while (!(SR1 & SB))`가 영원히 돕니다. *모든 wait에 timeout*.

> ⚠️ Bus arbitration loss 무시

multi-master 환경에서 다른 master가 동시에 START하면 ARLO flag. 이 경우 *재시도*가 표준.

## 정리

- I2C는 **state machine + timeout**. 각 단계의 flag 폴링.
- master TX는 START → ADDR+W → ADDR clear → DATA → STOP.
- master RX는 register address write → **repeated START** → ADDR+R → read → NACK + STOP.
- **bus recovery** 9-clock pulse는 stuck SDA에서 필수 패턴.
- **외부 pull-up** 4.7 kΩ + timeout이 안정성의 80%.

다음 편은 **DMA 기초**입니다. channel/trigger·circular·half/full complete를 다룹니다.

## 관련 항목

- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-08: 환경 센서](/blog/embedded/modern-recipes/part5-08-environmental-sensors)
