---
title: "4-04: 클럭 설정"
date: 2026-05-13T14:00:00
description: "HSE/HSI·PLL·peripheral clock enable — 코어/주변기기 클럭 트리."
series: "Modern Embedded Recipes"
seriesOrder: 38
tags: [recipes, bare-metal, clock]
draft: false
---

## 한 줄 요약

> **"clock tree를 모르면 peripheral은 죽어 있습니다."** HSE → PLL → SYSCLK → AHB → APB → peripheral. 이 한 줄을 머리에 그리면 모든 STM32가 같은 패턴입니다.

## 어떤 상황에서 쓰나

reset 직후 STM32는 *HSI 16 MHz로 동작*합니다. 동작은 하지만 100 MHz 코어의 1/6 속도입니다. UART가 baud rate가 안 맞아서 깨지거나, SPI가 너무 느려서 sensor가 timeout 나는 경우의 90%는 *clock 설정 누락*입니다.

이 글은 reset부터 PLL 활성화, AHB/APB prescaler 설정, peripheral clock enable까지 *clock 부팅 시퀀스*를 정리합니다. STM32F4 (Cortex-M4)를 기준으로 합니다.

## 핵심 개념

### Clock tree 전체 그림

| 단계 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| Source candidates | HSI 16 MHz / HSE 8 MHz / LSI 32 kHz / LSE 32 kHz | — | MUX 입력 |
| SYSCLK MUX | source 중 하나 | SYSCLK | PLL 출력도 입력 가능 |
| AHB prescaler | SYSCLK | HCLK | /1 기본 |
| APB1 prescaler | HCLK | PCLK1 (max 42 MHz) | /1, /2, /4 |
| APB2 prescaler | HCLK | PCLK2 (max 84 MHz) | /1, /2, /4 |
| PLL chain | HSE 8 MHz | 168 MHz SYSCLK / 48 MHz USB | M=8 → 1 MHz → N=336 → 336 MHz → P=2, Q=7 |

- **HSE** (High-Speed External): 외부 crystal, 보통 8/16/25 MHz. 정밀도 ±20 ppm.
- **HSI** (High-Speed Internal): 내부 RC, 16 MHz. 정밀도 ±1% (온도에 따라).
- **LSE**: 외부 32.768 kHz, RTC용.
- **LSI**: 내부 32 kHz, IWDG·RTC fallback용.
- **PLL**: HSI/HSE를 곱셈해 168 MHz 같은 고주파를 생성.

### PLL 계산 공식 (STM32F4)

```text
VCO_input  = PLL_input / PLL_M       (must be 1 ~ 2 MHz, 2 MHz 권장)
VCO_output = VCO_input × PLL_N       (must be 100 ~ 432 MHz)
SYSCLK     = VCO_output / PLL_P      (P = 2, 4, 6, 8)
USB clock  = VCO_output / PLL_Q      (must be 48 MHz)
```

예: HSE 8 MHz → 168 MHz SYSCLK + 48 MHz USB

```text
PLL_M = 8   → VCO_input  = 8MHz / 8 = 1 MHz
PLL_N = 336 → VCO_output = 1MHz × 336 = 336 MHz
PLL_P = 2   → SYSCLK     = 336MHz / 2 = 168 MHz ✓
PLL_Q = 7   → USB clock  = 336MHz / 7 = 48 MHz ✓
```

### Flash latency

코어 클럭이 빠르면 *Flash 액세스 시간이 더 필요*합니다. SYSCLK 변경 *전에* 설정해야 합니다.

| SYSCLK | Wait States |
|--------|-------------|
| ≤ 30 MHz | 0 WS |
| ≤ 64 MHz | 1 WS |
| ≤ 90 MHz | 2 WS |
| ≤ 120 MHz | 3 WS |
| ≤ 150 MHz | 4 WS |
| ≤ 168 MHz | 5 WS |

### AHB / APB1 / APB2

| Bus | 최대 clock (F411) | 최대 clock (F407) | 연결된 peripheral |
|-----|------------------|------------------|-------------------|
| AHB | 100 MHz | 168 MHz | GPIO, DMA, Ethernet |
| APB1 | 50 MHz | 42 MHz | TIM2~7, USART2~5, SPI2/3, I2C1~3 |
| APB2 | 100 MHz | 84 MHz | TIM1/8, USART1/6, SPI1, ADC |

prescaler를 잘못 잡으면 APB가 한계를 넘어 *peripheral이 비정상*이 됩니다.

## 코드 예제

### 1. 168 MHz boot — STM32F411 기준

```c
#include "stm32f4xx.h"

void clock_init_168mhz(void) {
    // 1. HSE enable (8 MHz crystal on Nucleo)
    RCC->CR |= RCC_CR_HSEON;
    while (!(RCC->CR & RCC_CR_HSERDY));   // wait stable (~ ms)

    // 2. Voltage scaling — high performance
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_VOS;   // scale 1 (max performance)

    // 3. Flash latency — 5 WS for 168 MHz, with prefetch/I-cache/D-cache
    FLASH->ACR = FLASH_ACR_LATENCY_5WS
               | FLASH_ACR_PRFTEN
               | FLASH_ACR_ICEN
               | FLASH_ACR_DCEN;

    // 4. PLL 설정 — 8MHz / 8 × 336 / 2 = 168 MHz
    RCC->PLLCFGR = (8u   <<  0)         // PLL_M = 8
                 | (336u <<  6)         // PLL_N = 336
                 | (0u   << 16)         // PLL_P = 2  (00=/2)
                 | (RCC_PLLCFGR_PLLSRC_HSE)
                 | (7u   << 24);        // PLL_Q = 7

    // 5. PLL on, wait ready
    RCC->CR |= RCC_CR_PLLON;
    while (!(RCC->CR & RCC_CR_PLLRDY));

    // 6. Bus prescalers
    //    AHB = SYSCLK / 1 = 168 MHz
    //    APB1 = AHB / 4   =  42 MHz (max for F411)
    //    APB2 = AHB / 2   =  84 MHz
    RCC->CFGR = (0u << 4)              // HPRE  = /1
              | (5u << 10)             // PPRE1 = /4
              | (4u << 13);            // PPRE2 = /2

    // 7. Switch SYSCLK to PLL
    RCC->CFGR |= (2u << 0);
    while (((RCC->CFGR >> 2) & 3u) != 2u);   // wait SWS = PLL
}
```

### 2. Peripheral clock enable 순서

각 peripheral은 *자기 bus의 ENR register*에서 enable해야 합니다.

```c
// AHB1 peripheral
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN
              | RCC_AHB1ENR_GPIOCEN
              | RCC_AHB1ENR_DMA1EN;

// APB1 peripheral
RCC->APB1ENR |= RCC_APB1ENR_USART2EN
              | RCC_APB1ENR_TIM2EN
              | RCC_APB1ENR_I2C1EN;

// APB2 peripheral
RCC->APB2ENR |= RCC_APB2ENR_USART1EN
              | RCC_APB2ENR_SPI1EN
              | RCC_APB2ENR_ADC1EN;
```

이 직후 GPIO·UART access가 가능합니다. enable 안 한 peripheral의 register write는 *조용히 무시*되니 가장 흔한 디버깅 함정입니다.

### 3. PCLK timer ×2 규칙

TIM은 *APB clock의 2배*로 동작합니다 (prescaler 1이 아니면). datasheet의 RCC clock chart를 보면 *TIM clock multiplier*가 별도로 그려져 있습니다.

```c
// SYSCLK 168, APB1 = 42 → TIM2~7 clock = 84 MHz
// SYSCLK 168, APB2 = 84 → TIM1/8 clock = 168 MHz
```

## 측정 / 동작 확인

가장 쉬운 확인은 **MCO (Master Clock Output)**입니다. 코어 클럭을 핀으로 직접 출력해 스코프로 봅니다.

```c
// MCO1 = PA8, MCO2 = PC9
// MCO2 에 SYSCLK / 4 출력
RCC->CFGR &= ~(7u << 30);   // MCO2 select
RCC->CFGR |=  (0u << 30);   // 0=SYSCLK
RCC->CFGR &= ~(7u << 27);
RCC->CFGR |=  (6u << 27);   // prescaler /4

gpio_init(GPIOC, 9, &(gpio_config_t){
    .mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_PP,
    .speed=GPIO_SPEED_VH, .af=0,
});
```

PC9에 168/4 = 42 MHz 사각파가 보이면 SYSCLK 설정 성공입니다.

대안으로 LED toggle 주기로 확인합니다. delay loop을 동일하게 두고 reset (HSI 16 MHz) → PLL on (168 MHz) 전후 주기 비교: 약 10배 차이가 보입니다.

## 자주 보는 함정

> ⚠️ HSE crystal 미장착 보드인데 HSE 사용 시도

Nucleo는 ST-Link MCO에서 8 MHz를 공급해 HSE처럼 사용할 수 있습니다(특수 jumper 설정). Bare-board는 외부 crystal이 없으면 HSE 안 켜집니다. HSI만 가능합니다.

> ⚠️ Flash latency를 *나중에* 설정

PLL on → SYSCLK switch *전에* flash latency를 올려야 합니다. 안 그러면 fetch가 깨져 HardFault.

> ⚠️ PLL on 직후 ready를 안 기다림

`while (!(RCC->CR & RCC_CR_PLLRDY));` 빼먹으면 미동작 PLL로 SYSCLK를 switch해 보드가 죽습니다.

> ⚠️ APB1 prescaler 1로 두고 SYSCLK 168 MHz

APB1 한계 42 MHz를 초과합니다. peripheral이 비정상 동작하거나 reset. 처음에는 안전한 값(/4, /2)으로 두고 필요시 줄입니다.

> ⚠️ Peripheral clock enable 후 즉시 access

대부분 안전하지만 일부 SoC는 1-2 cycle 지연이 필요합니다. `__DSB()`로 안전을 추가합니다.

## 정리

- **Reset 직후는 HSI 16 MHz**. SystemInit이나 main 첫 줄에 PLL boot.
- **Clock tree**: HSE/HSI → PLL → SYSCLK → AHB → APB1/APB2 → peripheral.
- **Flash latency·voltage·PLL·prescaler·switch** 순서가 중요합니다.
- **TIM은 APB의 2배** 동작 (APB prescaler가 1이 아닐 때).
- **MCO 출력**으로 SYSCLK를 핀에 내보내 검증합니다.

다음 편은 **인터럽트 핸들링**입니다. NVIC enable, priority, ISR 명명, EXTI까지 정리합니다.

## 관련 항목

- [1-02: 클럭과 타이밍](/blog/embedded/modern-recipes/part1-02-clock-timing)
- [4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
