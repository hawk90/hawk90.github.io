---
title: "GPIO 드라이버 직접 구현 — STM32 HAL 없이 레지스터로"
date: 2026-04-13T09:37:00
description: "Mode/speed/pull/AF — STM32 기준 register-level driver."
series: "Modern Embedded Recipes"
seriesOrder: 37
tags: [recipes, bare-metal, gpio]
draft: false
---

## 한 줄 요약

> **"한 핀이 어떻게 동작할지는 다섯 개 register로 정해집니다."** MODER·OTYPER·OSPEEDR·PUPDR·AFR. 이 다섯이 STM32 GPIO 전부입니다.

## 어떤 상황에서 쓰나

STM32 GPIO는 *대단히 유연*합니다. 한 핀이 input·output·analog·alternate function 중 어느 것이든 될 수 있고, output이면 push-pull/open-drain, speed는 4단계, pull-up/down까지 선택할 수 있습니다. 그래서 한 핀을 쓰려면 매번 register 5개를 만져야 합니다.

HAL을 쓰면 `HAL_GPIO_Init()` 하나로 끝나지만, *왜 그렇게 동작하는지* 모르면 멀티 boards 환경, custom SoC, 또는 timing이 빠듯한 상황에서 막힙니다. 이 글은 그 다섯 register를 한 번에 정리합니다.

## 핵심 개념

### 다섯 register의 역할

| Register | 비트/핀 | 역할 |
|----------|---------|------|
| `MODER` | 2 | 00=input, 01=output, 10=AF, 11=analog |
| `OTYPER` | 1 | 0=push-pull, 1=open-drain |
| `OSPEEDR` | 2 | 00=low, 01=med, 10=high, 11=very-high |
| `PUPDR` | 2 | 00=none, 01=pull-up, 10=pull-down |
| `AFR[0..1]` | 4 | AF0~AF15 선택 (pin 0-7은 AFR[0], 8-15는 AFR[1]) |
| `IDR` | 1 | input data (read-only) |
| `ODR` | 1 | output data (read·write) |
| `BSRR` | 1+1 | atomic set/reset |

핀마다 비트 수가 다르므로 *비트 시프트 양*도 다릅니다.

```c
#define PIN  5
GPIOA->MODER &= ~(3u << (PIN * 2));   // MODER: 2-bit per pin
GPIOA->OTYPER &= ~(1u << PIN);        // OTYPER: 1-bit per pin
GPIOA->OSPEEDR |= (3u << (PIN * 2));  // OSPEEDR: 2-bit per pin
GPIOA->PUPDR &= ~(3u << (PIN * 2));   // PUPDR: 2-bit per pin

// AF 설정 — pin 0-7은 AFR[0], 8-15는 AFR[1]
GPIOA->AFR[PIN / 8] &= ~(0xFu << ((PIN % 8) * 4));
GPIOA->AFR[PIN / 8] |=  (AF7  << ((PIN % 8) * 4));  // AF7 = USART1
```

### Mode 4가지의 의미

| Mode | 데이터 경로 | 비고 |
| --- | --- | --- |
| Input | pin → IDR | digital read |
| Output | ODR / BSRR → pin | PP 또는 OD |
| Alternate | peripheral ↔ pin | USART / SPI / TIM 등 |
| Analog | pin ↔ ADC mux / DAC | digital buffer off |

- **Input**: digital input, IDR로 읽기.
- **Output**: digital output, BSRR/ODR로 쓰기.
- **Alternate Function**: peripheral과 핀을 매칭 (UART, SPI, TIM, ...).
- **Analog**: digital buffer를 끄고 ADC/DAC가 직접 연결.

Analog 모드는 *소비전력 측면에서도 중요*합니다. 사용하지 않는 ADC 핀은 analog로 두는 편이 power 절약에 좋습니다.

### Push-Pull vs Open-Drain

| 구성 | Push-Pull | Open-Drain |
| --- | --- | --- |
| 3.3 V 측 | PMOS (1 drive) | 없음 (외부 pull-up 필요) |
| GND 측 | NMOS (0 drive) | NMOS (0 drive) |
| 1 출력 | active high | high-Z (외부 풀업이 끌어올림) |

- **Push-Pull**: 0과 1을 *모두 능동적으로* drive. 일반 출력.
- **Open-Drain**: 0만 drive, 1은 *high-Z* (외부 pull-up 필요). I2C, level shifter, wired-OR에 사용.

I2C는 항상 open-drain이어야 합니다. push-pull로 설정하면 multi-master나 clock stretching이 깨집니다.

### Output speed의 의미

OSPEEDR는 slew rate를 조절합니다. 빠를수록 EMI가 늘고, 느리면 high-frequency signal이 죽습니다.

| Setting | Slew rate | 권장 사용 |
|---------|-----------|-----------|
| Low (00) | 가장 느림 | LED, button 등 정적 신호 |
| Medium (01) | 보통 | UART < 1 Mbps |
| High (10) | 빠름 | SPI 20 MHz, UART 빠름 |
| Very-High (11) | 가장 빠름 | SDIO, 50+ MHz parallel |

상관없는 핀에 very-high를 주면 *crosstalk와 EMI*가 늘어납니다. 필요한 속도로만 맞춥니다.

## 코드 예제

### 1. GPIO HAL — 직접 작성

```c
// gpio.h
typedef enum {
    GPIO_MODE_INPUT  = 0,
    GPIO_MODE_OUTPUT = 1,
    GPIO_MODE_AF     = 2,
    GPIO_MODE_ANALOG = 3,
} gpio_mode_t;

typedef enum {
    GPIO_OTYPE_PP = 0,
    GPIO_OTYPE_OD = 1,
} gpio_otype_t;

typedef enum {
    GPIO_SPEED_LOW = 0,
    GPIO_SPEED_MED = 1,
    GPIO_SPEED_HIGH = 2,
    GPIO_SPEED_VH = 3,
} gpio_speed_t;

typedef enum {
    GPIO_PULL_NONE = 0,
    GPIO_PULL_UP   = 1,
    GPIO_PULL_DOWN = 2,
} gpio_pull_t;

typedef struct {
    gpio_mode_t  mode;
    gpio_otype_t otype;
    gpio_speed_t speed;
    gpio_pull_t  pull;
    uint8_t      af;   // AF0~15, AF 모드에서만 의미
} gpio_config_t;

void gpio_init(GPIO_TypeDef *port, uint32_t pin, const gpio_config_t *cfg);
void gpio_write(GPIO_TypeDef *port, uint32_t pin, int high);
int  gpio_read(GPIO_TypeDef *port, uint32_t pin);
```

```c
// gpio.c
void gpio_init(GPIO_TypeDef *port, uint32_t pin, const gpio_config_t *cfg) {
    // MODER
    port->MODER &= ~(3u << (pin * 2));
    port->MODER |=  ((uint32_t)cfg->mode << (pin * 2));

    // OTYPER
    port->OTYPER &= ~(1u << pin);
    port->OTYPER |=  ((uint32_t)cfg->otype << pin);

    // OSPEEDR
    port->OSPEEDR &= ~(3u << (pin * 2));
    port->OSPEEDR |=  ((uint32_t)cfg->speed << (pin * 2));

    // PUPDR
    port->PUPDR &= ~(3u << (pin * 2));
    port->PUPDR |=  ((uint32_t)cfg->pull << (pin * 2));

    // AFR — only if AF mode
    if (cfg->mode == GPIO_MODE_AF) {
        uint32_t idx = pin / 8;
        uint32_t shift = (pin % 8) * 4;
        port->AFR[idx] &= ~(0xFu << shift);
        port->AFR[idx] |=  ((uint32_t)cfg->af << shift);
    }
}

void gpio_write(GPIO_TypeDef *port, uint32_t pin, int high) {
    port->BSRR = high ? (1u << pin) : (1u << (pin + 16));
}

int gpio_read(GPIO_TypeDef *port, uint32_t pin) {
    return (port->IDR >> pin) & 1u;
}
```

### 2. 사용 예시

```c
// PA5 LED (output, push-pull, low speed)
gpio_init(GPIOA, 5, &(gpio_config_t){
    .mode  = GPIO_MODE_OUTPUT,
    .otype = GPIO_OTYPE_PP,
    .speed = GPIO_SPEED_LOW,
    .pull  = GPIO_PULL_NONE,
});

// PC13 button (input, pull-up)
gpio_init(GPIOC, 13, &(gpio_config_t){
    .mode = GPIO_MODE_INPUT,
    .pull = GPIO_PULL_UP,
});

// PA9/PA10 UART1 (AF7)
gpio_init(GPIOA, 9, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_PP,
    .speed = GPIO_SPEED_HIGH, .pull = GPIO_PULL_UP, .af = 7,
});
gpio_init(GPIOA, 10, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_PP,
    .speed = GPIO_SPEED_HIGH, .pull = GPIO_PULL_UP, .af = 7,
});

// PB6/PB7 I2C1 (AF4, open-drain, no pull — 외부 pull-up 사용)
gpio_init(GPIOB, 6, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_OD,
    .speed = GPIO_SPEED_MED, .pull = GPIO_PULL_NONE, .af = 4,
});
```

### 3. Atomic toggle

BSRR을 활용한 race-free toggle은 두 write로 분리합니다.

```c
static inline void gpio_toggle(GPIO_TypeDef *port, uint32_t pin) {
    uint32_t odr = port->ODR;
    port->BSRR = ((odr & (1u << pin)) << 16) | (~odr & (1u << pin));
}
```

ODR XOR보다 안전하지만, *완벽한 atomicity*가 필요하면 BSRR set/reset을 별도 함수로 분리합니다.

## 측정 / 동작 확인

설정이 잘 됐는지는 register dump로 확인할 수 있습니다.

```text
(gdb) p/x *GPIOA
$1 = {
  MODER   = 0x28000c00,   // PA5=01 (output), PA9/10=10 (AF), PA13/14=10
  OTYPER  = 0x00000000,   // all push-pull
  OSPEEDR = 0x0c000c00,   // PA5=high, ...
  PUPDR   = 0x64000600,   // PA13=pull-up, PA14=pull-down ...
  IDR     = 0x0000a020,
  ODR     = 0x00000020,   // PA5=1 (LED on)
  ...
}
```

`MODER`의 PA5 자리 (bits 11:10)를 확인합니다. `0x28000c00 >> 10 & 3 = 1` → output 모드입니다.

스코프로 PA5를 보면 push-pull 출력은 0V↔3.3V를 즉시 전환합니다. open-drain이라면 1로 갈 때 *RC time constant*만큼 ramp가 보입니다.

## 자주 보는 함정

> ⚠️ Clock enable 안 함

`RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN`을 빠뜨리면 register write가 효과 없습니다. 매 init 함수의 첫 줄에 둡니다.

> ⚠️ AF 번호 잘못 매김

datasheet의 "alternate function mapping" 표를 확인합니다. STM32F4의 USART1 TX는 PA9의 AF7, USART6 TX는 PC6의 AF8. 핀과 peripheral에 따라 AF 번호가 다릅니다.

> ⚠️ I2C에 push-pull 설정

I2C는 *반드시 open-drain*입니다. push-pull로 두면 두 master가 동시에 drive 할 때 short-circuit이 발생합니다.

> ⚠️ Pull-up이 필요한 input을 floating으로 둠

외부 button이 *active-low* (눌리지 않으면 floating)면 internal pull-up이 필요합니다. floating input은 ADC noise를 흡수해 chatter처럼 보입니다.

> ⚠️ Analog 모드를 안 쓰고 digital input으로 남김

ADC 채널로 사용할 핀은 *반드시 analog mode*. digital input 상태로 두면 Schmitt trigger가 살아 있어 *불필요한 전류*를 흘립니다 (특히 입력이 mid-rail에 있을 때).

## 정리

- STM32 GPIO는 **MODER·OTYPER·OSPEEDR·PUPDR·AFR** 5개 register로 전부 설정됩니다.
- Mode 4가지: **input·output·AF·analog**. 각각 의미와 power 특성이 다릅니다.
- I2C는 **open-drain**, SPI/UART는 **push-pull**, ADC는 **analog**.
- **BSRR**은 atomic set/reset. ODR XOR보다 안전합니다.
- speed는 **필요한 만큼만** 올립니다 — EMI와 power 측면에서 손해.

다음 편은 **클럭 설정**입니다. HSE/HSI 선택부터 PLL·prescaler·peripheral clock enable까지 STM32의 클럭 트리를 한 번에 정리합니다.

## 관련 항목

- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [4-02: 레지스터 직접 접근](/blog/embedded/modern-recipes/part4-02-mmio-access)
- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-07: UART 드라이버](/blog/embedded/modern-recipes/part4-07-uart-driver)
