---
title: "I2C 드라이버 구현 — STM32F405/407 Master·Repeated START·Clock Stretching·Bus Recovery"
slug: "embedded/modern-recipes/part4-09-i2c-driver"
date: 2026-04-13T09:43:00
description: "NACK·clock stretching·SDA 고착에서 멈추지 않는 STM32F405/407 polling I2C master. 1·2·N byte 수신 순서, repeated START read, 모든 대기의 timeout, 9-clock bus recovery."
series: "Modern Embedded Recipes"
seriesOrder: 43
tags: [recipes, bare-metal, i2c]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"I2C master 드라이버는 이벤트 flag를 순서대로 기다리는 state machine이고, 모든 기다림에는 timeout이 붙습니다."** START → 주소 → DATA → STOP의 각 단계에서 SR1 flag를 확인하고, 수신 마지막 byte의 NACK·STOP은 ST HAL과 같은 순서로 겁니다.

## 어떤 상황에서 쓰나

이 글은 STM32F405/407의 I2C1을 single-master 버스의 polling master로 구동하는 코드를 다룹니다. register·bit 이름은 cmsis-device-f4 v2.6.9의 `stm32f407xx.h`, 각 단계의 순서는 [ST HAL v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_i2c.c)의 `HAL_I2C_Init()`·`HAL_I2C_Master_Transmit()`·`HAL_I2C_Master_Receive()` 구현과 맞춰 봤습니다. 이 순서의 원전인 reference manual RM0090은 이 글을 고치는 동안 st.com에서 내려받지 못해 다시 대조하지 못했으므로, 아래 설명은 HAL 코드와 I2C 규격으로 확인할 수 있는 것만 적습니다. 읽기 함수는 *register 주소 write → repeated START → read*를 한 transaction으로 처리합니다. 버스의 전기적 구조·프레임·풀업 계산은 [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)에 있습니다.

interrupt·DMA 구동과 multi-master 버스는 다루지 않습니다. 아래 `wait_sr1`은 SR1의 ARLO(bit 9, arbitration lost)와 BERR(bit 8, bus error)를 보지 않으므로, multi-master 버스나 잡음이 많은 버스에서는 이 둘의 검사를 더해야 합니다. STM32H7의 I2C는 CCR·TRISE 대신 TIMINGR로 timing을 잡는 다른 register 세트라([stm32h7xx_ll_i2c.h, v1.9.0](https://github.com/STMicroelectronics/stm32h7xx-hal-driver/blob/v1.9.0/Inc/stm32h7xx_ll_i2c.h)) 아래 코드를 그대로 쓸 수 없습니다.

## 핵심 개념

### SR1 이벤트와 소프트웨어 동작

아래 코드가 기다리는 flag와 그때 할 일입니다. bit 위치는 `stm32f407xx.h`의 `I2C_SR1_*_Pos`입니다.

| 단계 | 기다릴 flag | 소프트웨어 동작 |
|------|------------|-----------|
| START 생성 뒤 | SB (SR1 bit 0) | SR1 read 후 DR에 주소 write |
| 주소 전송 뒤 | ADDR (SR1 bit 1) | SR1 read 후 SR2 read로 clear |
| 데이터 송신 중 | TxE (SR1 bit 7) | DR에 다음 byte write |
| 마지막 송신 뒤 | BTF (SR1 bit 2) | CR1의 STOP set |
| 데이터 수신 중 | RxNE (SR1 bit 6) | DR read |

HAL은 transaction마다 `SET_BIT(hi2c->Instance->CR1, I2C_CR1_STOP)`으로 STOP을 직접 겁니다. 아래 코드도 같습니다.

NACK는 AF(SR1 bit 10)로 보입니다. HAL의 대기 함수(`I2C_WaitOnTXEFlagUntilTimeout()`, `I2C_WaitOnBTFFlagUntilTimeout()`)는 기다리는 flag 말고도 AF를 매번 확인해 에러로 빠져나오고, 호출한 `HAL_I2C_Master_Transmit()`은 `HAL_I2C_ERROR_AF`면 STOP을 겁니다. flag 하나만 기다리는 루프는 NACK에서 끝나지 않으므로, 아래 `wait_sr1`도 AF와 timeout을 함께 봅니다.

### Clock stretching과 timeout

UM10204 Rev. 7.0의 표는 clock stretching을 "a feature of some targets"라고 설명합니다. target이 SCL을 low로 잡고 있는 동안에는 다음 flag가 늦게 서고, target이 SCL을 끝내 놓지 않으면 flag는 서지 않습니다. 그래서 이 드라이버의 모든 대기에는 `I2C_TIMEOUT_MS`가 붙습니다. HAL도 모든 대기 함수에 `Timeout`과 `tickstart`를 넘깁니다.

### Clock 설정

HAL v1.8.5 `stm32f4xx_hal_i2c.h`의 매크로가 계산식을 그대로 보여 줍니다. `I2C_SPEED_STANDARD()`는 계수 2, `I2C_SPEED_FAST()`는 DUTY에 따라 계수 3 또는 25로 `I2C_CCR_CALCULATION(PCLK, SPEED, COEFF) = ((PCLK - 1) / (SPEED × COEFF)) + 1`을 쓰고, `I2C_RISE_TIME()`은 100 kHz 이하에서 `FREQRANGE + 1`, 그 위에서 `FREQRANGE × 300 / 1000 + 1`입니다(`FREQRANGE` = PCLK1 / 1 MHz). 1000 ns와 300 ns는 [I2C-bus 규격 UM10204 Rev. 7.0](https://www.nxp.com/docs/en/user-guide/UM10204.pdf) Table 11의 SDA·SCL 최대 rise time(Standard-mode 1000 ns, Fast-mode 300 ns)입니다.

```text
Sm, 100 kHz:         CCR = ceil(PCLK1 / (2  x 100 kHz))
Fm, 400 kHz, DUTY=0: CCR = ceil(PCLK1 / (3  x 400 kHz))
Fm, 400 kHz, DUTY=1: CCR = ceil(PCLK1 / (25 x 400 kHz))

Sm: TRISE = PCLK1[MHz] + 1
Fm: TRISE = floor(PCLK1[MHz] x 300 / 1000) + 1
```

이 글의 기준은 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 `clock_init_168mhz()`가 만드는 SYSCLK 168 MHz, PCLK1 = 168 MHz / 4 = 42 MHz입니다. 42 MHz는 STM32F405/407의 fPCLK1 최대값입니다(DS8626 Rev 4 Table 14 "General operating conditions"). Fm, DUTY=0이면 CCR = (42,000,000 − 1) / 1,200,000 + 1 = 35, TRISE = 42 × 300 / 1000 + 1 = 13이고, 식으로 계산한 SCL은 42 MHz / (3 × 35) = 400 kHz입니다. 이 값은 식의 목표값이고, 실제 SCL 주파수는 이 글에서 재지 않았으므로 보드에서 logic analyzer로 확인합니다.

## 코드 예제

helper는 시리즈 앞 편의 것을 씁니다. `gpio_init`·`gpio_config_t`는 [4-03: GPIO 드라이버](/blog/embedded/modern-recipes/part4-03-gpio-driver), `millis`와 `delay_us_dwt(uint32_t us, uint32_t cpu_hz)`는 [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)에 있습니다. `delay_us_dwt`를 쓰기 전에 [Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)의 "DWT Cycle Counter — 구현 확인" 절에 있는 `dwt_init()`을 한 번 불러 둡니다. register·bit 이름은 [cmsis-device-f4 v2.6.9](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)의 정의입니다.

### 1. I2C init

PB8·PB9는 AF4에서 I2C1_SCL·I2C1_SDA입니다(ST open_pin_data의 STM32F407 GPIO 표, `GPIO_AF4_I2C1`). 풀업 저항값은 1-06의 [풀업 저항 계산](/blog/embedded/modern-recipes/part1-06-i2c-hardware#4-풀업-저항-계산) 절을 따릅니다.

```c
void i2c_init_fm(void) {
    RCC->APB1ENR |= RCC_APB1ENR_I2C1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOBEN;

    // PB8 SCL, PB9 SDA: AF4, open-drain, external pull-ups
    gpio_init(GPIOB, 8, &(gpio_config_t){.mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_OD,
                                          .speed=GPIO_SPEED_MED, .af=4});
    gpio_init(GPIOB, 9, &(gpio_config_t){.mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_OD,
                                          .speed=GPIO_SPEED_MED, .af=4});

    I2C1->CR1 = I2C_CR1_SWRST;
    I2C1->CR1 = 0;

    I2C1->CR2   = 42u;             // FREQ = PCLK1 in MHz
    I2C1->CCR   = I2C_CCR_FS | 35; // Fm, DUTY=0
    I2C1->TRISE = 13;
    I2C1->CR1   = I2C_CR1_PE;      // CCR/TRISE written while PE=0
}
```

순서는 HAL v1.8.5 `HAL_I2C_Init()`과 같습니다. HAL은 `__HAL_I2C_DISABLE()`로 PE를 끄고, SWRST를 set했다가 지운 뒤, CR2의 FREQ, TRISE, CCR을 쓰고 마지막에 `__HAL_I2C_ENABLE()`로 PE를 켭니다.

### 2. 공통 단계와 Write (master TX)

```c
#define I2C_TIMEOUT_MS 50

// 0: flag set, -1: timeout, -2: NACK (AF)
static int wait_sr1(uint32_t mask) {
    uint32_t start = millis();
    while ((I2C1->SR1 & mask) == 0) {
        if (I2C1->SR1 & I2C_SR1_AF) return -2;
        if (millis() - start > I2C_TIMEOUT_MS) return -1;
    }
    return 0;
}

// -3: SDA or SCL held low before START (BUSY never cleared)
static int wait_idle(void) {
    uint32_t start = millis();
    while (I2C1->SR2 & I2C_SR2_BUSY) {
        if (millis() - start > I2C_TIMEOUT_MS) return -3;
    }
    return 0;
}

static int i2c_abort(int err) {
    I2C1->CR1 |= I2C_CR1_STOP;
    I2C1->SR1 = ~I2C_SR1_AF;     // rc_w0: writing 1 to other bits has no effect
    return err;
}

// START (or repeated START) + address byte; returns with ADDR set, not yet cleared
static int i2c_start(uint8_t sla) {
    int e;
    I2C1->CR1 |= I2C_CR1_START;
    if ((e = wait_sr1(I2C_SR1_SB))) return e;      // START sent
    I2C1->DR = sla;
    return wait_sr1(I2C_SR1_ADDR);                 // address sent
}

int i2c_write(uint8_t addr7, const uint8_t *data, size_t n) {
    int e;
    if ((e = wait_idle())) return e;
    if ((e = i2c_start((uint8_t)(addr7 << 1)))) return i2c_abort(e);
    (void)I2C1->SR1; (void)I2C1->SR2;                           // clear ADDR

    for (size_t i = 0; i < n; i++) {
        if ((e = wait_sr1(I2C_SR1_TXE))) return i2c_abort(e);   // DR empty
        I2C1->DR = data[i];
    }
    if (n > 0 && (e = wait_sr1(I2C_SR1_BTF))) return i2c_abort(e);  // last byte out

    I2C1->CR1 |= I2C_CR1_STOP;
    return 0;
}
```

START 전에는 SR2의 BUSY(bit 1)가 풀리기를 기다립니다. HAL의 `HAL_I2C_Master_Transmit()`도 첫 단계에서 "Wait until BUSY flag is reset"을 `I2C_TIMEOUT_BUSY_FLAG`까지 기다리고, 넘기면 `HAL_BUSY`를 돌려줍니다. 앞 transaction이 버스를 잡은 채 끝났거나 target이 선을 붙잡고 있으면 아래 코드는 START를 걸기 전에 -3으로 돌아옵니다.

`n == 0`이면 BTF를 기다리지 않고 주소만 보낸 뒤 STOP을 겁니다. 보낸 데이터 byte가 없으니 "마지막 byte가 나갔다"는 BTF를 기다릴 대상도 없습니다. [ST HAL v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_i2c.c)의 `HAL_I2C_Master_Transmit()`도 Size = 0이면 ADDR을 지운 뒤 데이터 루프를 건너뛰고 STOP을 겁니다.

`i2c_abort`는 AF를 `I2C1->SR1 = ~I2C_SR1_AF`로 지웁니다. HAL의 `__HAL_I2C_CLEAR_FLAG()`도 `((__HANDLE__)->Instance->SR1 = ~((__FLAG__) & I2C_FLAG_MASK))`로, 지울 bit만 0이고 나머지는 1인 값을 통째로 씁니다.

### 3. Read (repeated START)

수신 마지막 byte에는 NACK를 보내고 STOP을 걸어야 합니다. HAL v1.8.5 `HAL_I2C_Master_Receive()`는 byte 수에 따라 순서를 나눕니다.

- **1 byte**: ACK를 끄고("Disable Acknowledge"), ADDR을 지운 뒤 STOP을 set하고, RxNE를 기다려 읽습니다.
- **2 byte**: ACK를 끄고 POS를 켠 뒤 ADDR을 지우고, BTF를 기다려 STOP을 set한 다음 두 byte를 읽습니다.
- **3 byte 이상**: ACK를 켠 채 ADDR을 지우고 RxNE로 읽다가, 남은 byte가 3개가 되면 BTF를 기다려 ACK를 끄고 하나를 읽고, 다시 BTF를 기다려 STOP을 set한 뒤 마지막 두 byte를 읽습니다.

아래 `i2c_rx`는 이 세 갈래를 그대로 옮겼습니다.

```c
// (repeated) START + SLA+R, receive n >= 1 bytes, STOP
static int i2c_rx(uint8_t addr7, uint8_t *buf, size_t n) {
    int e;
    if ((e = i2c_start((uint8_t)((addr7 << 1) | 1)))) return i2c_abort(e);

    if (n == 1) {
        I2C1->CR1 &= ~I2C_CR1_ACK;            // before ADDR clear
        (void)I2C1->SR1; (void)I2C1->SR2;     // clear ADDR: SCL released
        I2C1->CR1 |= I2C_CR1_STOP;            // after ADDR clear
        if ((e = wait_sr1(I2C_SR1_RXNE))) return e;   // STOP already requested
        buf[0] = I2C1->DR;
    } else if (n == 2) {
        I2C1->CR1 &= ~I2C_CR1_ACK;
        I2C1->CR1 |= I2C_CR1_POS;
        (void)I2C1->SR1; (void)I2C1->SR2;
        if ((e = wait_sr1(I2C_SR1_BTF))) return i2c_abort(e);
        I2C1->CR1 |= I2C_CR1_STOP;
        buf[0] = I2C1->DR;
        buf[1] = I2C1->DR;
        I2C1->CR1 &= ~I2C_CR1_POS;
    } else {
        I2C1->CR1 |= I2C_CR1_ACK;
        (void)I2C1->SR1; (void)I2C1->SR2;
        size_t i = 0;
        for (; i < n - 3; i++) {              // bytes 1 .. N-3
            if ((e = wait_sr1(I2C_SR1_RXNE))) return i2c_abort(e);
            buf[i] = I2C1->DR;
        }
        if ((e = wait_sr1(I2C_SR1_BTF))) return i2c_abort(e);  // N-2 in DR, N-1 in shift reg
        I2C1->CR1 &= ~I2C_CR1_ACK;
        buf[i++] = I2C1->DR;                                    // N-2
        if ((e = wait_sr1(I2C_SR1_BTF))) return i2c_abort(e);  // N-1 in DR, N in shift reg
        I2C1->CR1 |= I2C_CR1_STOP;
        buf[i++] = I2C1->DR;                                    // N-1
        buf[i]   = I2C1->DR;                                    // N
    }
    return 0;
}

int i2c_read(uint8_t addr7, uint8_t *buf, size_t n) {
    int e;
    if (n == 0) return 0;
    if ((e = wait_idle())) return e;
    return i2c_rx(addr7, buf, n);
}

int i2c_read_reg(uint8_t addr7, uint8_t reg, uint8_t *buf, size_t n) {
    int e;
    if (n == 0) return 0;
    if ((e = wait_idle())) return e;

    // Phase 1: write register address, no STOP
    if ((e = i2c_start((uint8_t)(addr7 << 1)))) return i2c_abort(e);
    (void)I2C1->SR1; (void)I2C1->SR2;
    if ((e = wait_sr1(I2C_SR1_TXE))) return i2c_abort(e);
    I2C1->DR = reg;
    if ((e = wait_sr1(I2C_SR1_BTF))) return i2c_abort(e);

    // Phase 2: repeated START + read
    return i2c_rx(addr7, buf, n);
}
```

1-byte 분기는 HAL v1.8.5 `HAL_I2C_Master_Receive()`의 Size = 1 분기(ACK clear → ADDR clear → STOP)와 같은 순서이고, HAL처럼 그 사이에 interrupt를 막지 않습니다. 이 분기의 RxNE timeout은 STOP을 이미 요청한 뒤라 `i2c_abort`를 거치지 않습니다.

2-byte 분기 끝에서 POS를 다시 끕니다. HAL LL `stm32f4xx_ll_i2c.h`의 설명대로 POS가 켜져 있으면 "the ACK bit controls the (N)ACK of the next byte received"이고, 꺼져 있어야 "the current byte"를 제어하므로, 다음 transaction의 1·3+ byte 순서가 기대하는 상태로 되돌립니다. `i2c_read`는 register 주소 없이 바로 읽는 장치(명령 write 뒤 결과를 읽는 센서 등)에 씁니다. 두 read 함수는 읽을 byte가 없으면 버스를 건드리지 않고 0을 돌려줍니다.

### 4. Bus recovery — target이 SDA를 low로 잡고 있으면

UM10204 3.1.16 "Bus clear"는 SDA가 low로 묶이면 controller가 clock pulse 9개를 보내야 한다고(should) 적고, 그 안에 풀리지 않으면 HW reset이나 전원 재투입을 쓰라고 합니다. SCL이 low로 묶인 경우에는 HW reset 입력으로 버스를 reset하는 것을 우선 절차로 두고, reset 입력이 없으면 전원 재투입을 권합니다.

`delay_us_dwt`의 두 번째 인자는 CPU 클럭이므로, 4-04의 `clock_init_168mhz()`가 만드는 SYSCLK를 `CPU_HZ`로 둡니다.

```c
#define CPU_HZ 168000000u   // SYSCLK after clock_init_168mhz() (4-04)

// SCL high, then wait for the line to actually rise (a stuck SCL never does)
static int scl_release(void) {
    GPIOB->BSRR = (1u << 8);
    uint32_t start = millis();
    while (!(GPIOB->IDR & (1u << 8))) {
        if (millis() - start > I2C_TIMEOUT_MS) return -5;
    }
    delay_us_dwt(5, CPU_HZ);
    return 0;
}

// 0: bus free, -4: SDA still low after 9 clocks, -5: SCL stuck low
int i2c_bus_recover(void) {
    // ODR = 1 first: both pins stay released when they become open-drain outputs
    GPIOB->BSRR = (1u << 8) | (1u << 9);
    gpio_init(GPIOB, 8, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .otype=GPIO_OTYPE_OD});
    gpio_init(GPIOB, 9, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .otype=GPIO_OTYPE_OD});
    if (scl_release()) return -5;

    for (int i = 0; i < 9 && !(GPIOB->IDR & (1u << 9)); i++) {
        GPIOB->BSRR = (1u << (8 + 16)); delay_us_dwt(5, CPU_HZ);   // SCL low
        if (scl_release()) return -5;                               // SCL high
    }
    if (!(GPIOB->IDR & (1u << 9))) return -4;

    // STOP: SDA low -> high while SCL is high
    GPIOB->BSRR = (1u << (8 + 16)); delay_us_dwt(5, CPU_HZ);   // SCL low
    GPIOB->BSRR = (1u << (9 + 16)); delay_us_dwt(5, CPU_HZ);   // SDA low (SCL low: no START)
    if (scl_release()) return -5;                               // SCL high
    GPIOB->BSRR = (1u << 9);        delay_us_dwt(5, CPU_HZ);   // SDA high: STOP

    i2c_init_fm();      // back to AF4, SWRST, reprogram timing
    return 0;
}
```

핀을 GPIO 출력으로 바꾸기 전에 BSRR로 ODR8·ODR9를 1로 써 두는 이유는 출력으로 바뀌는 순간 핀이 ODR 값을 내보내기 때문입니다. QEMU의 STM32L475 GPIO 모델([4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)에서 쓴 `b-l475e-iot01a`)로 PB9를 같은 순서로 바꿔 보면 이렇게 됩니다.

```c
/* od_test.c */
/* QEMU b-l475e-iot01a: what IDR reads when PB9 turns into an open-drain output with ODR = 0 vs 1 */
#include "stm32l475xx.h"
static volatile uint32_t r[4];
int main(void) {
    RCC->AHB2ENR |= RCC_AHB2ENR_GPIOBEN; (void)RCC->AHB2ENR;
    GPIOB->PUPDR = (GPIOB->PUPDR & ~(3u << 18)) | (1u << 18);   /* PB9 pull-up (stands in for the bus pull-up) */
    GPIOB->MODER &= ~(3u << 18);                                /* input */
    r[0] = (GPIOB->IDR >> 9) & 1;
    GPIOB->OTYPER |= (1u << 9);                                 /* open-drain */
    r[1] = (GPIOB->ODR >> 9) & 1;                               /* ODR left at its reset value */
    GPIOB->MODER = (GPIOB->MODER & ~(3u << 18)) | (1u << 18);   /* -> output: drives ODR */
    r[2] = (GPIOB->IDR >> 9) & 1;
    GPIOB->BSRR = (1u << 9);                                    /* ODR = 1: release */
    r[3] = (GPIOB->IDR >> 9) & 1;
    for (;;) { }
}
```

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -ffreestanding -nostdlib -O2 -Wall -DSTM32L475xx \
    -Icmsis-device-l4/Include -ICMSIS_6/CMSIS/Core/Include -T l475.ld -o od.elf startup.c od_test.c
qemu-system-arm -M b-l475e-iot01a -nographic -kernel od.elf -monitor stdio -serial null
(qemu) xp /4wx 0x20000000          # r[0..3]; nm: 20000000 b r
```

```text
20000000: 0x00000001 0x00000000 0x00000000 0x00000001
```

`r[0]`부터 차례로 pull-up 입력의 IDR, ODR의 reset 값, ODR을 둔 채 open-drain 출력으로 바꾼 직후의 IDR, BSRR로 ODR을 1로 쓴 뒤의 IDR입니다.

pull-up만 걸린 입력에서 1로 읽히던 선이, ODR을 건드리지 않은 채 open-drain 출력으로 바꾸자 0이 됐습니다. reset 값 그대로인 ODR = 0이 선을 끌어내린 것입니다. I2C 버스에서 이 일이 SDA에 일어나면 MCU가 SDA를 스스로 붙잡고, 9-clock 루프는 SDA high를 끝내 보지 못해 -4로 끝납니다. 출력 상태에서 IDR로 선을 읽을 수 있다는 것도 같은 실행에서 확인됩니다. QEMU는 logic level만 모델링하므로 이 확인은 순서에 대한 것이고, 전기적 특성은 보드에서 봅니다.

마지막 STOP 순서는 UM10204 3.1.4의 정의에서 나옵니다. SCL이 high인 동안 SDA가 high에서 low로 바뀌면 START, low에서 high로 바뀌면 STOP입니다. 그래서 SDA는 SCL이 low일 때 내려 START를 만들지 않고, SCL을 올린 뒤에 SDA를 올려 STOP을 냅니다.

`scl_release()`는 SCL을 놓은 뒤 IDR로 선이 실제로 올라왔는지 확인합니다. target이 SCL을 붙잡고 있으면 -5로 끝나고, 이때는 위 Bus clear 절차대로 HW reset이나 전원 재투입을 합니다. 5 µs low와 "올라온 뒤 5 µs" high는 UM10204 Table 11 Standard-mode의 tLOW 최소 4.7 µs, tHIGH 최소 4.0 µs, tSU;STO 최소 4.0 µs를 만족합니다. `i2c_init_fm()`은 HAL `HAL_I2C_Init()`처럼 SWRST로 peripheral을 다시 초기화하고 AF4로 핀을 되돌립니다. 이 함수는 버스가 풀린 경우(반환값 0)에만 부릅니다.

## 측정 / 동작 확인

로직 애널라이저로 SCL·SDA를 함께 잡으면 반환값마다 다음 파형이 보여야 합니다.

![I2C transaction — START, address+ACK, data+ACK, STOP](/images/blog/modern-recipes/diagrams/part4-09-i2c-transaction.svg)

| 반환값 | 기대 파형 | 다음 조치 |
| --- | --- | --- |
| 0 | 위 그림처럼 START, byte마다 9번째 clock의 ACK(SDA low), STOP. read는 마지막 byte만 NACK(SDA high) | — |
| -2 | 주소나 데이터 byte 뒤 9번째 clock에서 SDA high(NACK) | 7-bit 주소(shift 전 값)와 target 전원 확인 |
| -1 | transaction 도중 SCL이 low에 머묾 | `i2c_bus_recover()`를 부르고 그 반환값대로 |
| -3 | START 전부터 SDA나 SCL이 low, 또는 앞 transaction이 STOP 없이 끝남 | `i2c_bus_recover()`를 부르고 그 반환값대로 |

`i2c_bus_recover()`의 반환값은 다음과 같습니다.

| 반환값 | 기대 파형 | 다음 조치 |
| --- | --- | --- |
| 0 | SDA가 풀린 뒤 STOP(SCL high에서 SDA low → high) | transaction 재시도 |
| -4 | SCL clock 9개 뒤에도 SDA low | HW reset 또는 전원 재투입(UM10204 3.1.16) |
| -5 | SCL을 놓은 뒤에도 low에 머묾 | HW reset 또는 전원 재투입(UM10204 3.1.16) |

## 자주 보는 함정

> ⚠️ 7-bit 주소를 shift하지 않고 넘김

datasheet의 7-bit 주소(예: `0x76`)는 주소 byte의 bit 7:1에 들어가고, bit 0이 R/W입니다(UM10204 3.1.10). 위 코드는 `addr7 << 1`로 이 byte를 만듭니다. HAL은 반대로 shift된 값을 받습니다. `HAL_I2C_Master_Transmit()`의 `DevAddress` 설명이 "The device 7 bits address value in datasheet must be shifted to the left before calling the interface"입니다. HAL과 이 드라이버를 섞어 쓰다 shift를 두 번 하거나 한 번도 안 하면 다른 주소로 나가므로, 그 주소에 장치가 없으면 -2(NACK)가 돌아옵니다.

## 정리

- 모든 flag 대기에 AF 검사와 timeout을 붙이고, START 전에는 BUSY가 풀리기를 기다립니다. clock stretching은 peripheral이 처리합니다.
- 수신은 byte 수에 따라 HAL `HAL_I2C_Master_Receive()`와 같은 세 순서를 따르고, 2·3+ byte의 마지막 부분은 BTF를 기다린 뒤 ACK·STOP을 겁니다.
- CCR·TRISE는 HAL 매크로와 같은 식으로 PCLK1에서 계산하고(42 MHz Fm: CCR 35, TRISE 13), 실제 SCL은 보드에서 잽니다.
- recovery는 ODR을 먼저 1로 쓰고 SCL이 실제로 올라오는지 확인하며, 풀리지 않으면 HW reset·전원 재투입으로 넘어갑니다.

다음 편은 **DMA 기초**입니다. memory-to-memory·peripheral·circular mode를 다룹니다.

## 관련 항목

- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-08: 환경 센서](/blog/embedded/modern-recipes/part5-08-environmental-sensors)
