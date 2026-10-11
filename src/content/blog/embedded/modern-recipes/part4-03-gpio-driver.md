---
title: "GPIO 드라이버 직접 구현 — STM32F407을 HAL 없이 레지스터로"
slug: "embedded/modern-recipes/part4-03-gpio-driver"
date: 2026-04-13T09:37:00
description: "STM32F407 기준으로 MODER·OTYPER·OSPEEDR·PUPDR·AFR을 직접 쓰는 GPIO 드라이버와, 설정이 맞았는지 레지스터 필드로 확인하는 방법."
series: "Modern Embedded Recipes"
seriesOrder: 37
tags: [recipes, bare-metal, gpio]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **STM32F407의 GPIO 핀 하나는 MODER·OTYPER·OSPEEDR·PUPDR·AFR 다섯 레지스터의 필드로 설정됩니다.** 이 글은 그 다섯 필드를 쓰는 작은 드라이버를 만들고, 설정 결과를 레지스터 값으로 확인하는 기대값까지 계산합니다.

## 어떤 상황에서 쓰나

HAL을 쓰면 `HAL_GPIO_Init()` 하나로 끝납니다. 그런데 HAL 없이 시작하는 bare-metal 프로젝트를 쓰거나, HAL이 무엇을 써 넣었는지 디버거로 들여다볼 때는 필드 하나하나를 알아야 합니다.

이 글의 대상은 **STM32F407**입니다. 레지스터 이름과 비트 위치는 ST의 CMSIS 헤더 [`stm32f407xx.h` (cmsis-device-f4 v2.6.9)](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)를, 필드 값의 의미는 ST HAL [`stm32f4xx_hal_gpio.h` (stm32f4xx-hal-driver v1.8.3)](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Inc/stm32f4xx_hal_gpio.h)의 정의를 기준으로 했습니다. 핀별 AF 번호는 F407 핀 데이터에서 읽었으므로, 다른 family에 옮길 때는 그 family의 핀 데이터로 다시 읽습니다.

[4-01](/blog/embedded/modern-recipes/part4-01-first-baremetal)은 Nucleo-F411RE를 기준으로 했고, 이 글은 대상을 F407로 바꿉니다. 예제의 PA5 LED는 보드를 정하지 않은 배선 예시이므로, 실제 보드에서는 4-01의 보드별 LED 표에서 핀을 고릅니다.

## 핵심 개념

### 다섯 설정 레지스터와 데이터 레지스터

| Register | 핀당 비트 | 값의 의미 (HAL 정의) |
|----------|---------|------|
| `MODER` | 2 | 0=input, 1=output, 2=alternate function, 3=analog (`MODE_INPUT`…`MODE_ANALOG`) |
| `OTYPER` | 1 | 0=push-pull, 1=open-drain (`OUTPUT_PP`·`OUTPUT_OD`) |
| `OSPEEDR` | 2 | 0=low, 1=medium, 2=high, 3=very high (`GPIO_SPEED_FREQ_*`) |
| `PUPDR` | 2 | 0=none, 1=pull-up, 2=pull-down (`GPIO_NOPULL`·`GPIO_PULLUP`·`GPIO_PULLDOWN`) |
| `AFR[0]`·`AFR[1]` | 4 | AF 번호. 핀 0–7은 `AFR[0]`, 8–15는 `AFR[1]` |
| `IDR` | 1 | 입력 레벨 읽기 |
| `ODR` | 1 | 출력 레벨 |
| `BSRR` | 1+1 | 하위 16비트=set, 상위 16비트=reset |

핀당 비트 수가 다르므로 시프트 양도 다릅니다. PA5의 `MODER` 필드는 bit 11:10(`GPIO_MODER_MODER5_Pos` = 10, 마스크 `0x00000C00`)이고, `AFR` 인덱스는 HAL처럼 `pin >> 3`, 필드 시프트는 `(pin & 7) * 4`입니다.

```c
#define PIN  9u   /* PA9 */
GPIOA->MODER   &= ~(3u << (PIN * 2));                 /* 2 bits per pin */
GPIOA->OTYPER  &= ~(1u << PIN);                       /* 1 bit per pin  */
GPIOA->PUPDR   &= ~(3u << (PIN * 2));                 /* 2 bits per pin */
GPIOA->AFR[PIN >> 3] &= ~(0xFu << ((PIN & 7u) * 4));  /* 4 bits per pin */
GPIOA->AFR[PIN >> 3] |=  (7u   << ((PIN & 7u) * 4));  /* AF7: USART1_TX on PA9 */
```

### 리셋 상태

HAL은 리셋 직후 상태를 "input floating mode (except JTAG pins)"라고 적습니다([`stm32f4xx_hal_gpio.c` 머리 주석](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_gpio.c)). STM32F407V(E-G)Tx 핀 데이터에서 PA13은 `SYS_JTMS-SWDIO`, PA14는 `SYS_JTCK-SWCLK`, PA15는 `SYS_JTDI`이므로 포트 A에는 이 예외 핀이 있습니다. 아래 확인 절에서 레지스터 전체가 아니라 *설정한 핀의 필드만* 비교하는 이유입니다.

### Output type — I2C는 open-drain

`OTYPER`는 output·AF 모드에서 출력단을 push-pull(0)과 open-drain(1) 중 하나로 고릅니다. 두 구조의 트랜지스터 동작은 [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)에서 다룹니다.

I2C 핀은 open-drain에 외부 pull-up으로 둡니다. 여러 디바이스가 한 라인을 공유해도 high를 강제로 내보내는 쪽이 없어 버스 충돌이 short로 번지지 않기 때문입니다([TI SLVA704 *Understanding the I2C Bus* (2015-06)](https://www.ti.com/lit/an/slva704/slva704.pdf) 1.1절).

### Output speed

`OSPEEDR`는 2비트로 네 단계를 고릅니다. HAL 주석의 단계별 값(low "IO works at 2 MHz"부터 very high "range 50 MHz to 200 MHz"까지)은 F4 family 전체가 함께 쓰는 HAL 헤더의 주석이고, 줄마다 "please refer to the product datasheet"가 붙습니다. F407 값은 [DS8626 Rev 12](https://www.st.com/resource/en/datasheet/stm32f407vg.pdf) Table 50(I/O AC characteristics)에 부하 용량별로 있습니다. 아래는 VDD > 2.70 V 조건의 최대 출력 주파수입니다.

| `OSPEEDR` | 큰 부하 | 10 pF |
| --- | --- | --- |
| 0 (low) | 4 MHz (50 pF) | 8 MHz |
| 1 (medium) | 25 MHz (50 pF) | 50 MHz |
| 2 (high) | 50 MHz (40 pF) | 100 MHz |
| 3 (very high) | 100 MHz (30 pF) | 180 MHz |

같은 표의 주석에 따르면 이 값은 characterization으로 평가했고 양산 시험은 하지 않으며, 50 MHz를 넘는 주파수에서는 compensation cell을 써야 합니다. 이 글의 예제는 정적 신호인 LED에 low, USART에 high를 씁니다.

## 코드 예제

### 1. 드라이버 인터페이스

```c
/* gpio.h */
#include "stm32f407xx.h"

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
    GPIO_SPEED_LOW  = 0,
    GPIO_SPEED_MED  = 1,
    GPIO_SPEED_HIGH = 2,
    GPIO_SPEED_VH   = 3,
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
    uint8_t      af;   /* AF0..AF15, used only in AF mode */
} gpio_config_t;

void gpio_init(GPIO_TypeDef *port, uint32_t pin, const gpio_config_t *cfg);
void gpio_write(GPIO_TypeDef *port, uint32_t pin, int high);
int  gpio_read(GPIO_TypeDef *port, uint32_t pin);
```

enum 값은 HAL 정의와 같은 숫자라서 그대로 필드에 시프트해 넣습니다. 이 헤더는 HAL 헤더와 함께 include하지 않습니다. `GPIO_MODE_INPUT` 같은 이름이 HAL 매크로와 겹치기 때문입니다.

### 2. 구현 — `MODER`는 마지막에 씁니다

```c
/* gpio.c */
#include "gpio.h"

void gpio_init(GPIO_TypeDef *port, uint32_t pin, const gpio_config_t *cfg) {
    const uint32_t s2 = pin * 2u;

    if (cfg->mode == GPIO_MODE_OUTPUT || cfg->mode == GPIO_MODE_AF) {
        port->OSPEEDR = (port->OSPEEDR & ~(3u << s2)) | ((uint32_t)cfg->speed << s2);
        port->OTYPER  = (port->OTYPER  & ~(1u << pin)) | ((uint32_t)cfg->otype << pin);
    }

    if (cfg->mode != GPIO_MODE_ANALOG) {
        port->PUPDR = (port->PUPDR & ~(3u << s2)) | ((uint32_t)cfg->pull << s2);
    }

    if (cfg->mode == GPIO_MODE_AF) {
        const uint32_t idx = pin >> 3;
        const uint32_t s4  = (pin & 7u) * 4u;
        port->AFR[idx] = (port->AFR[idx] & ~(0xFu << s4)) | ((uint32_t)cfg->af << s4);
    }

    /* mode last: the pin keeps its old mode until every other field is ready */
    port->MODER = (port->MODER & ~(3u << s2)) | ((uint32_t)cfg->mode << s2);
}

void gpio_write(GPIO_TypeDef *port, uint32_t pin, int high) {
    port->BSRR = high ? (1u << pin) : (1u << (pin + 16u));
}

int gpio_read(GPIO_TypeDef *port, uint32_t pin) {
    return (int)((port->IDR >> pin) & 1u);
}
```

순서와 조건은 HAL v1.8.3의 [`HAL_GPIO_Init()`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_gpio.c)을 따랐습니다. HAL은 speed·output type을 output·AF 모드에서만, pull을 analog가 아닐 때만 쓰고, 그다음 AF, 마지막에 `MODER`를 씁니다. `MODER`를 쓰기 전까지 핀은 이전 mode를 유지합니다.

`gpio_write()`가 `ODR`이 아니라 `BSRR`에 쓰는 이유는 [4-02: 레지스터 직접 접근](/blog/embedded/modern-recipes/part4-02-mmio-access)에서 다룬 read-modify-write 경합입니다. HAL `HAL_GPIO_WritePin()` 주석도 같은 이유("there is no risk of an IRQ occurring between the read and the modify access")를 적습니다.

### 3. 사용 예시

AF 번호는 ST의 [STM32_open_pin_data (STM32CubeMX-DB.6.0.90)](https://github.com/STMicroelectronics/STM32_open_pin_data/blob/STM32CubeMX-DB.6.0.90/mcu/IP/GPIO-STM32F417_gpio_v1_0_Modes.xml)에서 확인했습니다. STM32F407V(E-G)Tx는 이 `STM32F417_gpio_v1_0` 파일을 씁니다. PA9 = `USART1_TX` AF7, PA10 = `USART1_RX` AF7, PB6 = `I2C1_SCL` AF4, PB7 = `I2C1_SDA` AF4입니다.

```c
/* RCC clock for ports A, B, C must be enabled first (see pitfalls) */

/* PA5 LED: output, push-pull, low speed */
gpio_init(GPIOA, 5, &(gpio_config_t){
    .mode  = GPIO_MODE_OUTPUT,
    .otype = GPIO_OTYPE_PP,
    .speed = GPIO_SPEED_LOW,
    .pull  = GPIO_PULL_NONE,
});

/* PC13 button to GND: input, pull-up */
gpio_init(GPIOC, 13, &(gpio_config_t){
    .mode = GPIO_MODE_INPUT,
    .pull = GPIO_PULL_UP,
});

/* PA9/PA10 USART1 TX/RX: AF7 */
gpio_init(GPIOA, 9, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_PP,
    .speed = GPIO_SPEED_HIGH, .pull = GPIO_PULL_UP, .af = 7,
});
gpio_init(GPIOA, 10, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_PP,
    .speed = GPIO_SPEED_HIGH, .pull = GPIO_PULL_UP, .af = 7,
});

/* PB6/PB7 I2C1 SCL/SDA: AF4, open-drain, external pull-up */
gpio_init(GPIOB, 6, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_OD,
    .speed = GPIO_SPEED_MED, .pull = GPIO_PULL_NONE, .af = 4,
});
gpio_init(GPIOB, 7, &(gpio_config_t){
    .mode = GPIO_MODE_AF, .otype = GPIO_OTYPE_OD,
    .speed = GPIO_SPEED_MED, .pull = GPIO_PULL_NONE, .af = 4,
});
```

버튼이 핀을 GND로만 연결하는 회로라면, 눌리지 않았을 때 핀을 high로 잡아 주는 것이 없습니다. 리셋 상태가 input floating이므로 `PUPDR` pull-up을 켜야 `IDR`이 1로 읽힙니다.

### 4. Toggle

```c
static inline void gpio_toggle(GPIO_TypeDef *port, uint32_t pin) {
    uint32_t odr = port->ODR;
    port->BSRR = ((odr & (1u << pin)) << 16) | (~odr & (1u << pin));
}
```

이 코드는 HAL v1.8.3 `HAL_GPIO_TogglePin()`과 같은 식입니다. `ODR`을 읽고 `BSRR`에 한 번 씁니다. 지금 1인 핀은 상위 16비트(reset)에, 0인 핀은 하위 16비트(set)에 비트가 섭니다.

다른 핀은 건드리지 않지만, `ODR`을 읽은 뒤 `BSRR`을 쓰기 전에 인터럽트가 *같은 핀*을 바꾸면 toggle은 읽어 둔 옛 값을 기준으로 동작합니다. 같은 핀을 ISR과 메인 루프가 함께 쓰면 핀 상태를 변수로 들고 `gpio_write()`로 set과 reset을 명시합니다.

## 설정 확인 — 핀 필드의 기대값

디버거에서 `GPIOA`의 처음 열 워드를 덤프합니다. `GPIOA_BASE`는 `AHB1PERIPH_BASE + 0x0000` = `0x40020000`입니다.

```text
(gdb) x/10wx 0x40020000
```

워드 순서는 `GPIO_TypeDef` 정의대로 `MODER`, `OTYPER`, `OSPEEDR`, `PUPDR`, `IDR`, `ODR`, `BSRR`, `LCKR`, `AFR[0]`, `AFR[1]`입니다. 포트 A에는 HAL이 리셋 상태의 예외로 둔 JTAG 핀(PA13–PA15)이 있으므로, 위 사용 예시가 설정한 PA5·PA9·PA10 필드만 마스크해서 봅니다. `MODER`·`OSPEEDR`·`PUPDR`에서 세 핀의 마스크는 `(3 << 10) | (3 << 18) | (3 << 20)` = `0x003C0C00`입니다.

| 레지스터 | 마스크 | 기대값 | 계산 |
| --- | --- | --- | --- |
| `MODER` | `0x003C0C00` | `0x00280400` | PA5=1 (`0x400`), PA9=2 (`0x80000`), PA10=2 (`0x200000`) |
| `OSPEEDR` | `0x003C0C00` | `0x00280000` | PA5=0 (low), PA9·PA10=2 (high) |
| `PUPDR` | `0x003C0C00` | `0x00140000` | PA5=0, PA9·PA10=1 (pull-up) |
| `OTYPER` | `0x00000620` | `0x00000000` | 세 핀 모두 push-pull |
| `AFR[1]` | `0x00000FF0` | `0x00000770` | PA9 bit 7:4 = 7, PA10 bit 11:8 = 7 |

예를 들어 PA5만 확인하려면 `(MODER >> 10) & 3`을 계산합니다. 1이면 output이고 통과입니다. 0이면 리셋 상태(input, `MODE_INPUT` = 0) 그대로이므로 `gpio_init()`이 이 핀에 반영되지 않은 것이고 실패입니다. 이때는 아래 함정의 포트 클럭부터 봅니다. 2나 3이면 다른 mode를 넘긴 것이고 실패입니다. 표 전체로는 각 마스크 값이 기대값과 같으면 통과, 하나라도 다르면 실패입니다.

## 자주 보는 함정

> ⚠️ 포트 클럭을 켜지 않음

HAL 사용 순서의 첫 단계가 `__HAL_RCC_GPIOx_CLK_ENABLE()`입니다. GPIOA에서 이 매크로는 `RCC->AHB1ENR`에 `RCC_AHB1ENR_GPIOAEN`을 세우고, "Delay after an RCC peripheral clock enabling" 주석과 함께 같은 비트를 한 번 읽어 옵니다([`stm32f4xx_hal_rcc.h`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Inc/stm32f4xx_hal_rcc.h)). HAL 없이 쓸 때도 `gpio_init()` 전에 같은 일을 합니다. 사용 예시는 포트 A·B·C를 쓰므로 세 비트를 함께 켭니다.

```c
const uint32_t en = RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN | RCC_AHB1ENR_GPIOCEN;
RCC->AHB1ENR |= en;
(void)(RCC->AHB1ENR & en);  /* read back, as HAL does */
```

> ⚠️ AF 번호를 peripheral 이름만 보고 고름

AF 번호는 핀마다 정해져 있습니다. 같은 open_pin_data 파일에서 PA9는 `USART1_TX`가 AF7이고, PC6은 `USART6_TX`가 AF8입니다. PA5에는 AF7 항목 자체가 없습니다(AF1 `TIM2`, AF3 `TIM8`, AF5 `SPI1`, AF10 `OTG`). 핀을 바꾸면 AF 번호도 그 핀의 행에서 다시 읽습니다.

## 정리

- STM32F407 GPIO 설정은 `MODER`·`OTYPER`·`OSPEEDR`·`PUPDR`·`AFR` 다섯 필드이고, `MODER`는 다른 필드를 다 쓴 뒤 마지막에 씁니다.
- speed·output type·pull은 HAL처럼 mode에 따라 조건부로 쓰고, F407 speed 단계의 실제 주파수는 datasheet의 부하·VDD 조건과 함께 읽습니다.
- AF 번호는 peripheral이 아니라 핀별 매핑 표에서 읽습니다.
- 설정 확인은 설정한 핀의 필드만 마스크해서 기대값과 비교하고, PA5 `MODER` 필드가 0이면 init이 반영되지 않은 것입니다.

다음 편은 **클럭 설정**입니다. HSE/HSI 선택부터 PLL·prescaler·peripheral clock enable까지 STM32의 클럭 트리를 정리합니다.

## 관련 항목

- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [4-02: 레지스터 직접 접근](/blog/embedded/modern-recipes/part4-02-mmio-access)
- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-07: UART 드라이버](/blog/embedded/modern-recipes/part4-07-uart-driver)
