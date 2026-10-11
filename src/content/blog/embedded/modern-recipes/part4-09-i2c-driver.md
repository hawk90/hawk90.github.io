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

> **"I2C master 드라이버는 이벤트 flag를 순서대로 기다리는 state machine이고, 모든 기다림에는 timeout이 붙습니다."** START → 주소 → DATA → STOP의 각 단계에서 SR1 flag를 확인하고, 수신 마지막 byte의 NACK·STOP은 reference manual이 정한 순서로 겁니다.

## 어떤 상황에서 쓰나

이 글은 STM32F405/407의 I2C1([RM0090 Rev 22](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf) 27장)을 single-master 버스의 polling master로 구동하는 코드를 다룹니다. 읽기 함수는 *register 주소 write → repeated START → read*를 한 transaction으로 처리합니다. 버스의 전기적 구조·프레임·풀업 계산은 [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)에 있습니다.

interrupt·DMA 구동과 multi-master 버스는 다루지 않습니다. RM0090 27.3.4 "Arbitration lost (ARLO)"에 따르면 arbitration을 잃은 interface는 ARLO를 set하고 target mode로 돌아가 선을 놓는데, 아래 `wait_sr1`은 ARLO를 보지 않습니다. 주소·데이터 전송 중 엉뚱한 START·STOP을 감지해 set되는 BERR도 보지 않습니다. 같은 절 "Bus error (BERR)"에 따르면 controller mode에서는 선을 놓지 않고 현재 전송을 중단할지를 소프트웨어에 맡기므로, BERR를 처리하려면 `wait_sr1`에 검사를 더해야 합니다. STM32H7의 I2C는 CCR·TRISE 대신 TIMINGR로 timing을 잡는 다른 register 세트라([stm32h7xx_ll_i2c.h, v1.9.0](https://github.com/STMicroelectronics/stm32h7xx-hal-driver/blob/v1.9.0/Inc/stm32h7xx_ll_i2c.h)) 아래 코드를 그대로 쓸 수 없습니다.

## 핵심 개념

### SR1 이벤트와 소프트웨어 동작

아래 코드가 기다리는 flag와 그때 할 일입니다. 전체 순서도는 RM0090 Figure 243(transmitter)·244(receiver)에 있습니다.

| 이벤트 | 기다릴 flag | 소프트웨어 동작 |
|------|------------|-----------|
| EV5 | SB (SR1 bit 0) | SR1 read 후 DR에 주소 write |
| EV6 | ADDR (SR1 bit 1) | SR1 read 후 SR2 read로 clear |
| EV8 | TxE (SR1 bit 7) | DR에 다음 byte write |
| EV8_2 | TxE + BTF (SR1 bit 2) | CR1의 STOP set |
| EV7 | RxNE (SR1 bit 6) | DR read |

STOP은 하드웨어가 알아서 내지 않습니다. 소프트웨어가 CR1의 STOP bit를 set해야 생성됩니다(RM0090 27.3.3 "Closing the communication").

NACK를 받으면 ADDR·BTF가 set되지 않고 AF(SR1 bit 10)가 set됩니다(SR1 ADDR·BTF·AF bit 설명). 그래서 flag 하나만 기다리는 루프는 NACK에서 끝나지 않고, AF를 함께 보거나 timeout이 있어야 빠져나옵니다. AF를 받은 controller는 STOP이나 repeated START를 소프트웨어로 내야 합니다(RM0090 27.3.4 "Acknowledge failure").

### Clock stretching은 peripheral이 기다린다

target이 SCL을 low로 잡으면 이 I2C peripheral은 SCL high 구간 카운터를 멈추고 SCL이 high로 올라올 때까지 기다립니다(RM0090 27.3.3 "SCL controller clock generation"). 그래서 드라이버에 clock stretching을 처리하는 코드는 따로 없습니다. 소프트웨어가 보는 것은 다음 flag가 늦게 set된다는 사실뿐이고, target이 SCL을 놓지 않으면 flag가 끝내 set되지 않으므로 timeout으로 빠져나와야 합니다.

반대 방향도 있습니다. EV5·EV6·EV8_2는 소프트웨어 처리가 끝날 때까지 *peripheral 자신이* SCL을 low로 잡습니다(Figure 243 note 1, Figure 244 note 2). 그래서 이 이벤트들에서는 polling 루프가 interrupt로 늦어져도 버스가 멈춰 기다립니다. 이 보호가 끝난 뒤에 STOP을 거는 1-byte 수신은 아래 "Read (repeated START)" 절에서 다룹니다.

### Clock 설정

RM0090 CCR register 설명의 Thigh·Tlow 정의와 TRISE 규칙(최대 SCL rise time ÷ TPCLK1의 정수부 + 1)에 [I2C-bus 규격 UM10204 Rev. 7.0](https://www.nxp.com/docs/en/user-guide/UM10204.pdf) Table 11의 최대 rise time(Sm 1000 ns, Fm 300 ns)을 넣으면 다음 식이 됩니다.

```text
Sm, 100 kHz:         CCR = PCLK1 / (2  x 100 kHz)
Fm, 400 kHz, DUTY=0: CCR = PCLK1 / (3  x 400 kHz)
Fm, 400 kHz, DUTY=1: CCR = PCLK1 / (25 x 400 kHz)

Sm: TRISE = floor(1000 ns / TPCLK1) + 1 = PCLK1[MHz] + 1
Fm: TRISE = floor( 300 ns / TPCLK1) + 1 = floor(PCLK1[MHz] x 0.3) + 1
```

이 글의 기준은 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 `clock_init_168mhz()`가 만드는 SYSCLK 168 MHz, PCLK1 = 168 MHz / 4 = 42 MHz입니다. 42 MHz는 STM32F405/407의 fPCLK1 최대값입니다([DS8626 Rev 12](https://www.st.com/resource/en/datasheet/stm32f405rg.pdf) Table 14 "General operating conditions"). Fm, DUTY=0이면 CCR = 42 MHz / 1.2 MHz = 35, TRISE = floor(12.6) + 1 = 13이고, 식으로 계산한 SCL은 42 MHz / (3 × 35) = 400 kHz입니다. 그러나 RM0090 CCR register note는 400 kHz 최대 Fm 클럭에 도달하려면 fPCLK1이 10 MHz의 배수여야 한다고 적고, 42 MHz는 이 조건을 만족하지 못합니다. 그래서 아래 `i2c_init_fm()`의 400 kHz는 식의 목표값이고, 실제 SCL이 400 kHz라는 보장은 아닙니다. 같은 note는 실제 SCL 주파수가 analog noise filter 입력 지연 때문에 식과 다를 수 있다고 덧붙입니다.

## 코드 예제

helper는 시리즈 앞 편의 것을 씁니다. `gpio_init`·`gpio_config_t`는 [4-03: GPIO 드라이버](/blog/embedded/modern-recipes/part4-03-gpio-driver), `millis`와 `delay_us_dwt(uint32_t us, uint32_t cpu_hz)`는 [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)에 있습니다. `delay_us_dwt`를 쓰기 전에 [Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)의 "DWT Cycle Counter — Cortex-M3 이상" 절에 있는 `dwt_init()`을 한 번 불러 둡니다. register·bit 이름은 [cmsis-device-f4 v2.6.9](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)의 정의입니다.

### 1. I2C init

PB8·PB9는 AF4에서 I2C1_SCL·I2C1_SDA입니다(DS8626 Rev 12 Table 9 "Alternate function mapping", 65쪽 Port B 행). 풀업 저항값은 1-06의 [풀업 저항 계산](/blog/embedded/modern-recipes/part1-06-i2c-hardware#4-풀업-저항-계산) 절을 따릅니다.

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

CCR과 TRISE는 PE = 0일 때만 설정해야 하므로(RM0090 CCR·TRISE 설명) PE를 마지막에 켭니다.

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
    if ((e = wait_sr1(I2C_SR1_SB))) return e;      // EV5
    I2C1->DR = sla;
    return wait_sr1(I2C_SR1_ADDR);                 // EV6
}

int i2c_write(uint8_t addr7, const uint8_t *data, size_t n) {
    int e;
    if ((e = wait_idle())) return e;
    if ((e = i2c_start((uint8_t)(addr7 << 1)))) return i2c_abort(e);
    (void)I2C1->SR1; (void)I2C1->SR2;                           // clear ADDR

    for (size_t i = 0; i < n; i++) {
        if ((e = wait_sr1(I2C_SR1_TXE))) return i2c_abort(e);   // EV8
        I2C1->DR = data[i];
    }
    if (n > 0 && (e = wait_sr1(I2C_SR1_BTF))) return i2c_abort(e);  // EV8_2

    I2C1->CR1 |= I2C_CR1_STOP;
    return 0;
}
```

START 전에는 SR2의 BUSY가 풀리기를 기다립니다. BUSY는 SDA나 SCL이 low인 것을 감지하면 set되고 STOP을 감지해야 풀리며, PE = 0일 때도 갱신됩니다(RM0090 SR2 BUSY bit 설명). 그래서 앞 transaction이 버스를 잡은 채 끝났거나 target이 SDA를 붙잡고 있으면 START를 걸기 전에 -3으로 돌아옵니다.

`n == 0`이면 BTF를 기다리지 않고 주소만 보낸 뒤 STOP을 겁니다. BTF는 보낼 byte가 있는데 DR이 비어 있을 때 set되므로(SR1 BTF bit 설명), 데이터 byte가 없는 write에서 BTF를 기다리면 timeout으로 끝납니다. [ST HAL v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_i2c.c)의 `HAL_I2C_Master_Transmit()`도 Size = 0이면 ADDR을 지운 뒤 데이터 루프를 건너뛰고 STOP을 겁니다.

AF는 소프트웨어가 0을 써야 지워집니다(SR1 AF bit 설명). SR1의 error flag는 rc_w0라 1을 쓴 bit는 바뀌지 않으므로, `i2c_abort`는 `~I2C_SR1_AF`를 통째로 씁니다.

### 3. Read (repeated START)

수신 마지막 byte에는 NACK를 보내고 STOP을 걸어야 합니다. RM0090 27.3.3 "Controller receiver"가 정한 순서는 byte 수에 따라 셋입니다.

- **1 byte**: ADDR을 clear하기 *전에* ACK를 끄고, ADDR을 clear한 *뒤에* STOP을 set합니다.
- **2 byte**: ADDR = 1에서 ACK를 끄고 POS를 켠 뒤 ADDR을 clear하고, BTF = 1을 기다려 STOP을 set한 다음 두 byte를 읽습니다.
- **N > 2 byte**: N-2번째 byte부터 BTF = 1을 기다려 ACK를 끄고 N-2번째를 읽고, 다시 BTF = 1을 기다려 STOP을 set한 뒤 N-1번째와 N번째를 읽습니다.

RxNE만 보고 "끝에서 두 번째 byte를 읽은 직후 ACK = 0, STOP = 1"을 거는 방식(EV7_1)은 그 처리가 현재 byte의 ACK pulse 전에 끝나야 성립합니다(Figure 244 note 4). polling 루프가 interrupt로 늦어지면 이를 보장할 수 없으므로, 아래 코드는 RM0090이 그 경우에 권하는 BTF 기반 순서를 씁니다. BTF = 1인 동안 peripheral이 SCL을 low로 잡아 두기 때문에 소프트웨어가 늦어도 ACK가 제때 꺼집니다.

```c
// (repeated) START + SLA+R, receive n >= 1 bytes, STOP
static int i2c_rx(uint8_t addr7, uint8_t *buf, size_t n) {
    int e;
    if ((e = i2c_start((uint8_t)((addr7 << 1) | 1)))) return i2c_abort(e);

    if (n == 1) {
        I2C1->CR1 &= ~I2C_CR1_ACK;            // during EV6, before ADDR clear
        (void)I2C1->SR1; (void)I2C1->SR2;     // clear ADDR: SCL released
        I2C1->CR1 |= I2C_CR1_STOP;            // after EV6
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

1-byte 분기의 STOP은 위 "Clock stretching은 peripheral이 기다린다" 절의 보호가 끝난 뒤에 걸립니다. EV6의 SCL stretching은 ADDR을 지우는 소프트웨어 처리가 끝날 때까지만 이어지고(Figure 244 note 2), ADDR을 지운 뒤 interface는 수신을 시작합니다(27.3.3 "Controller receiver"). 그래도 이 코드는 ADDR clear와 STOP set 사이에 interrupt가 끼는 것을 막지 않습니다. ACK는 ADDR clear 전에 이미 꺼져 있고, RM0090 27.3.8 "DMA requests"는 1 byte를 받을 때 STOP을 ADDR clear 직후에 걸어도, DR이 차서 DMA가 byte를 옮긴 뒤의 Transfer Complete interrupt 루틴에서 걸어도 된다고 적습니다. [ST HAL v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_i2c.c#L1227-L1236)의 `HAL_I2C_Master_Receive()`도 Size = 1에서 ACK clear → ADDR clear → STOP을 interrupt를 막지 않고 씁니다. 이 분기의 RxNE timeout은 STOP을 이미 요청한 뒤라 `i2c_abort`를 거치지 않습니다.

2-byte 분기 끝에서 POS를 다시 끄는 것은 RM0090 CR1 POS bit 설명이 POS를 controller mode의 2-byte 수신 구성에서만 쓰라고 정하기 때문입니다. `i2c_read`는 register 주소 없이 바로 읽는 장치(명령 write 뒤 결과를 읽는 센서 등)에 씁니다. 두 read 함수는 읽을 byte가 없으면 버스를 건드리지 않고 0을 돌려줍니다.

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

핀을 GPIO 출력으로 바꾸기 전에 BSRR로 ODR8·ODR9를 1로 써 두는 것은 MODER를 출력으로 바꾸는 순간 핀이 ODR 값을 내보내기 때문입니다. open-drain 출력에서 ODR = 0은 N-MOS를 켜 선을 low로 끌고, ODR = 1은 핀을 Hi-Z로 둡니다(RM0090 8.3.10 "Output configuration"). GPIOx_ODR의 reset 값은 0이므로(8.4.6) ODR을 미리 1로 두지 않으면 PB8이 먼저 출력이 되며 SCL이 low로, 이어 PB9가 SDA를 low로 끌어 MCU가 SDA를 스스로 붙잡습니다. 그러면 9-clock 루프가 SDA high를 끝내 보지 못하고 -4로 끝납니다. SDA를 출력으로 둔 채 IDR로 읽을 수 있는 것은 출력 모드에서도 핀 상태가 AHB1 clock마다 IDR에 샘플링되기 때문입니다(같은 절).

마지막 STOP 순서는 UM10204 3.1.4의 정의에서 나옵니다. SCL이 high인 동안 SDA가 high에서 low로 바뀌면 START, low에서 high로 바뀌면 STOP입니다. 그래서 SDA는 SCL이 low일 때 내려 START를 만들지 않고, SCL을 올린 뒤에 SDA를 올려 STOP을 냅니다.

`scl_release()`는 SCL을 놓은 뒤 IDR로 선이 실제로 올라왔는지 확인합니다. target이 SCL을 붙잡고 있으면 -5로 끝나고, 이때는 위 Bus clear 절차대로 HW reset이나 전원 재투입을 합니다. 5 µs low와 "올라온 뒤 5 µs" high는 UM10204 Table 11 Standard-mode의 tLOW 최소 4.7 µs, tHIGH 최소 4.0 µs, tSU;STO 최소 4.0 µs를 만족합니다. `i2c_init_fm()`은 SWRST로 peripheral을 다시 초기화하는데, RM0090 CR1 SWRST 설명이 SWRST를 풀기 전에 I2C 선이 해제되고 버스가 비어 있어야 한다고 정하므로 버스가 풀린 경우에만 부릅니다.

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

> ⚠️ 두 선이 모두 high인데 BUSY가 풀리지 않음

로직 애널라이저에서는 SCL·SDA가 모두 high인데 `wait_idle()`이 계속 -3을 돌려주는 경우입니다. RM0090 CR1 SWRST bit 설명은 버스의 glitch 때문에 BUSY가 set된 채 잠길 수 있고, 이때 SWRST로 이 상태를 빠져나올 수 있다고 적습니다. 위 `i2c_bus_recover()`는 SDA가 이미 high이면 9-clock 루프를 건너뛰고 STOP을 낸 뒤 `i2c_init_fm()`의 SWRST로 peripheral을 다시 초기화하므로, -3에서 이 함수를 부르면 이 상태를 빠져나올 수 있습니다.

## 정리

- 모든 flag 대기에 AF 검사와 timeout을 붙이고, START 전에는 BUSY가 풀리기를 기다립니다. clock stretching은 peripheral이 처리합니다.
- 수신은 byte 수에 따라 RM0090의 세 순서를 따르고, 2·N byte에서는 BTF 기반 순서로 interrupt 지연에도 ACK가 제때 꺼지게 합니다.
- CCR·TRISE는 PCLK1에서 계산하되, PCLK1이 10 MHz 배수가 아니면 400 kHz 최대 Fm 클럭에 닿지 못한다는 RM0090 조건을 함께 봅니다.
- recovery는 ODR을 먼저 1로 쓰고 SCL이 실제로 올라오는지 확인하며, 풀리지 않으면 HW reset·전원 재투입으로 넘어갑니다.

다음 편은 **DMA 기초**입니다. memory-to-memory·peripheral·circular mode를 다룹니다.

## 관련 항목

- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-08: 환경 센서](/blog/embedded/modern-recipes/part5-08-environmental-sensors)
