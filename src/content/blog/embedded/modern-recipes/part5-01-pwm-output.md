---
title: "PWM 출력 실전 — LED 밝기·모터 속도 제어"
slug: "embedded/modern-recipes/part5-01-pwm-output"
date: 2026-04-14T09:49:00
description: "Timer로 PWM 생성·duty 변경·complementary 출력."
series: "Modern Embedded Recipes"
seriesOrder: 49
tags: [recipes, peripheral, pwm]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Period와 duty 두 숫자로 모든 PWM이 만들어집니다."** ARR가 period, CCR가 duty. `CCR / (ARR+1)`이 비율입니다.

## 어떤 상황에서 쓰나

LED 밝기, DC motor 속도, servo 위치처럼 "켜져 있는 시간의 비율"로 조절하는 출력에 PWM을 씁니다. STM32F407에서 complementary output과 dead-time을 내는 것은 advanced timer인 TIM1·TIM8이고(`stm32f407xx.h`의 `IS_TIM_CCXN_INSTANCE`·`IS_TIM_BREAK_INSTANCE`가 TIM1·TIM8만 받습니다), 이 글의 나머지 예제는 general purpose timer TIM3을 씁니다.

이 글은 단일 PWM, 다중 채널 PWM, complementary PWM, DMA로 duty를 바꾸는 PWM 네 가지를 작성합니다. register·bit 이름은 `stm32f407xx.h`, PWM mode와 dead-time의 정의는 ST HAL v1.8.3의 LL 헤더 `stm32f4xx_ll_tim.h`, 핀의 AF 번호는 ST open_pin_data에서 확인했습니다. QEMU의 F4 TIM 모델은 출력 핀을 모델링하지 않으므로, 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall` 경고 없이 빌드되는 것까지 확인했습니다.

## 핵심 개념

### Timer counter mode

up-counter는 0부터 `ARR`까지 센 뒤 0으로 돌아가고, 돌아가는 순간 update event(UEV)가 납니다. PWM mode 1에서는 counter가 `CCR`보다 작은 동안 출력이 active이므로, 한 주기 안에서 active 구간의 길이가 `CCR`에 비례합니다.

- `ARR` (Auto-Reload Register): counter top. period = (ARR+1) × (PSC+1) / TIM_clk.
- `CCR` (Capture/Compare Register): duty 값. 0~ARR+1 (ARR+1이면 100%).
- `PSC` (Prescaler): clock을 나눔.

### PWM frequency 계산

```text
PWM_freq = TIM_clk / ((PSC+1) × (ARR+1))

예) TIM2 clock = 84 MHz (APB1 × 2), PSC=0, ARR=4199
    PWM_freq = 84_000_000 / (1 × 4200) = 20 kHz
```

### PWM mode 1 vs 2

| Mode | OC 동작 |
|------|---------|
| PWM mode 1 (`OCxM` = 110) | upcounting에서 "active as long as TIMx_CNT<TIMx_CCRy else inactive" |
| PWM mode 2 (`OCxM` = 111) | upcounting에서 "inactive as long as TIMx_CNT<TIMx_CCRy else active" |

인용은 LL 헤더의 `LL_TIM_OCMODE_PWM1`·`PWM2` 설명입니다. 이 글은 `CCR`을 키우면 active 구간이 길어지는 mode 1을 씁니다. active가 high인지는 `CCER`의 `CCxP` polarity bit로 정하고, 아래 코드는 reset 값(0, active high)을 그대로 둡니다.

### Resolution

```text
8-bit (ARR=255):  256 step
12-bit (ARR=4095): 4096 step
16-bit (ARR=65535): 65536 step
```

resolution과 주파수는 서로 묶여 있습니다. timer clock이 84 MHz일 때 PSC = 0이면 16-bit(ARR = 65535)의 PWM 주파수는 84 MHz / 65536 ≈ 1.28 kHz, 8-bit(ARR = 255)는 328 kHz입니다.

## 코드 예제

### 1. Single channel PWM — LED dimming

```c
void pwm_led_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA6 = TIM3_CH1 (AF2)
    gpio_init(GPIOA, 6, &(gpio_config_t){
        .mode=GPIO_MODE_AF, .speed=GPIO_SPEED_HIGH, .af=2,
    });

    // ~20.5 kHz PWM, 8-bit (256 step)
    TIM3->PSC = 16 - 1;            // 84 MHz / 16 = 5.25 MHz
    TIM3->ARR = 256 - 1;           // 5.25 MHz / 256 = ~20.5 kHz

    // Channel 1 PWM mode 1, preload enable
    TIM3->CCMR1 = (6u << 4) | TIM_CCMR1_OC1PE;
    TIM3->CCER  = TIM_CCER_CC1E;
    TIM3->CCR1  = 0;               // duty = 0 (LED off)

    TIM3->CR1 = TIM_CR1_ARPE | TIM_CR1_CEN;
    TIM3->EGR = TIM_EGR_UG;        // load preload
}

void pwm_set_duty_8bit(uint8_t duty) {
    TIM3->CCR1 = duty;             // 0~255
}

// Fade demo
void fade(void) {
while (1) {
    for (int i = 0; i < 256; i++) { pwm_set_duty_8bit(i); delay_ms(5); }
    for (int i = 255; i >= 0; i--) { pwm_set_duty_8bit(i); delay_ms(5); }
}
}
```

### 2. Multi-channel — RGB LED

```c
void rgb_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN;

    // PA6 R, PA7 G, PB0 B (TIM3 CH1/2/3, AF2)
    gpio_init(GPIOA, 6, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});
    gpio_init(GPIOA, 7, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});
    gpio_init(GPIOB, 0, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});

    TIM3->PSC = 16 - 1;
    TIM3->ARR = 256 - 1;

    TIM3->CCMR1 = (6u << 4) | TIM_CCMR1_OC1PE
                | (6u << 12) | TIM_CCMR1_OC2PE;
    TIM3->CCMR2 = (6u << 4) | TIM_CCMR2_OC3PE;
    TIM3->CCER  = TIM_CCER_CC1E | TIM_CCER_CC2E | TIM_CCER_CC3E;

    TIM3->CR1 = TIM_CR1_ARPE | TIM_CR1_CEN;
    TIM3->EGR = TIM_EGR_UG;
}

void rgb_set(uint8_t r, uint8_t g, uint8_t b) {
    TIM3->CCR1 = r;
    TIM3->CCR2 = g;
    TIM3->CCR3 = b;
}
```

세 channel이 *동일한 ARR을 공유*하므로 frequency·resolution이 동일합니다.

### 3. Complementary PWM + dead-time (TIM1)

H-bridge나 3-phase inverter의 high-side·low-side 한 쌍에는 서로 반대인 두 출력과 그 사이의 dead-time이 필요합니다. F407에서는 TIM1·TIM8의 `CHxN` 출력과 `BDTR`가 그 일을 합니다. TIM1은 APB2 timer라 [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup) 설정에서 168 MHz로 돕니다.

```c
void pwm_complementary_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_TIM1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN;

    // PA8 = TIM1_CH1 (high-side), PB13 = TIM1_CH1N (low-side, AF1)
    gpio_init(GPIOA, 8,  &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=1});
    gpio_init(GPIOB, 13, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=1});

    // center-aligned PWM, 168 MHz / 8398 = 20.005 kHz
    TIM1->PSC = 0;
    TIM1->ARR = 4200 - 1;          // one up+down cycle = 2 x ARR = 8398 clocks at 168 MHz
    TIM1->CR1 = TIM_CR1_CMS_0;     // center-aligned mode 1

    // PWM mode 1, complementary
    TIM1->CCMR1 = (6u << 4) | TIM_CCMR1_OC1PE;
    TIM1->CCER  = TIM_CCER_CC1E | TIM_CCER_CC1NE;

    // DTG = 42 -> 42 x tDTS = 42 / 168 MHz = 250 ns (CKD = 0)
    TIM1->BDTR = (42u << 0) | TIM_BDTR_MOE;

    TIM1->CCR1 = 2100;             // 50% duty
    TIM1->EGR = TIM_EGR_UG;
    TIM1->CR1 |= TIM_CR1_CEN;
}
```

dead-time은 한쪽 출력이 꺼진 뒤 다른 쪽이 켜지기까지 두 출력이 모두 꺼져 있는 시간입니다. high-side와 low-side가 동시에 켜지면 전원과 GND가 바로 이어지므로 이 간격을 둡니다. `BDTR`의 `DTG` 값과 시간의 관계는 LL 헤더의 `__LL_TIM_CALC_DEADTIME()`가 보여 줍니다. 원하는 시간이 `(DT_DELAY_1 + 1) × tDTS`(`DT_DELAY_1` = 0x7F)보다 짧으면 `DTG = DT / tDTS`이고, `CKD` = 0이면 tDTS는 timer clock 주기입니다. 그래서 168 MHz에서 `DTG` = 42는 42 / 168 MHz = 250 ns입니다. 더 긴 시간은 `DTG`의 상위 bit로 범위(`DT_RANGE_2`~`4`)를 바꿔 냅니다.

center-aligned mode(`TIM_CR1_CMS_0`)에서 counter는 RM0090 Rev 22(st.com이 응답하지 않아 [stm32.dirba.io](https://stm32.dirba.io/rm0090-stm32f405-415-407-417-427-437-429-439/)의 본문 판으로 확인) 17.3.2절대로 "counts from 0 to the auto-reload value (content of the TIMx_ARR register) – 1, generates a counter overflow event, then counts from the auto-reload value down to 1"입니다. 올라갈 때 ARR개, 내려갈 때 ARR개를 세므로 한 주기가 2 × ARR = 2 × 4199 = 8,398 clock이고, 168 MHz / 8,398 = 20.005 kHz입니다.

### 4. DMA-driven duty — waveform 생성

DMA가 compare event마다 table의 다음 값을 `CCR`에 넣으면 duty가 주기마다 바뀝니다. stream·channel은 ST STM32CubeF4의 STM324xG_EVAL(F407 보드) `TIM/TIM_DMA` 예제 `main.h`가 쓰는 조합(TIM1 CH3, `DMA2_Stream6`, `DMA_CHANNEL_6`, 핀 PE13 AF1)을 따랐습니다.

```c
#include <math.h>                  // sinf()

static uint16_t sine_table[256];   // pre-computed

void pwm_dma_init(void) {
    for (int i = 0; i < 256; i++)
        sine_table[i] = (uint16_t)(128 + 127 * sinf(2 * 3.14159f * i / 256));

    RCC->APB2ENR |= RCC_APB2ENR_TIM1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN | RCC_AHB1ENR_GPIOEEN;
    gpio_init(GPIOE, 13, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=1});

    TIM1->PSC = 0;
    TIM1->ARR = 256 - 1;                        // 168 MHz / 256 = 656 kHz PWM
    TIM1->CCMR2 = (6u << 4) | TIM_CCMR2_OC3PE;  // CH3 PWM mode 1
    TIM1->CCER  = TIM_CCER_CC3E;
    TIM1->BDTR  = TIM_BDTR_MOE;

    DMA2_Stream6->CR   = 0;
    while (DMA2_Stream6->CR & DMA_SxCR_EN);
    DMA2_Stream6->PAR  = (uint32_t)&TIM1->CCR3;
    DMA2_Stream6->M0AR = (uint32_t)sine_table;
    DMA2_Stream6->NDTR = 256;
    DMA2_Stream6->CR   = (6u << 25)                 // channel 6
                       | DMA_SxCR_DIR_0             // memory -> peripheral
                       | DMA_SxCR_MINC
                       | (1u << 11) | (1u << 13)    // 16-bit
                       | DMA_SxCR_CIRC
                       | DMA_SxCR_EN;

    TIM1->DIER |= TIM_DIER_CC3DE;               // CC3 event requests DMA
    TIM1->EGR = TIM_EGR_UG;
    TIM1->CR1 = TIM_CR1_ARPE | TIM_CR1_CEN;
}
```

출력에 RC low-pass filter를 달면 256 PWM 주기마다 한 바퀴 도는 사인파를 얻습니다. 이 글은 이 파형을 보드에서 재지 않았습니다.

## 측정 / 동작 확인

스코프로 PWM 출력을 봅니다.

![20 kHz PWM, 25% vs 75% duty](/images/blog/modern-recipes/diagrams/part5-01-pwm-duty-compare.svg)

scope에서 확인할 것은 두 가지입니다. 주기가 `(PSC+1)(ARR+1) / TIM_clk`와 같은지(위 LED 예제는 16 × 256 / 84 MHz = 48.8 µs, 20.5 kHz), high 구간이 `CCR / (ARR+1)` 비율인지입니다. complementary 출력이면 CH1과 CH1N이 바뀌는 사이에 250 ns의 dead-time이 보여야 합니다.

## 자주 보는 함정

> ⚠️ Preload (OCxPE) 안 set

LL 헤더는 `OCxPE`를 "Enable compare register (TIMx_CCRx) preload"라고 설명합니다. preload가 언제 비교 register로 옮겨지는지의 정확한 규칙은 RM0090에 있어 이 글은 다루지 않고, 위 코드는 HAL처럼 `OCxPE`를 켜 둡니다.

> ⚠️ UG event 안 트리거

LL 헤더의 `LL_TIM_SetPrescaler()` 설명대로 `PSC`는 "The new prescaler ratio is taken into account at the next update event"이므로, 처음 한 번은 `EGR = UG`로 update를 강제해 첫 주기부터 새 값으로 돌게 합니다. HAL의 `TIM_Base_SetConfig()`도 마지막에 `TIMx->EGR = TIM_EGR_UG`를 씁니다.

> ⚠️ Complementary PWM에 MOE 안 set

TIM1·TIM8은 `BDTR.MOE`(Main Output Enable)가 1이어야 출력이 나옵니다. HAL의 `__HAL_TIM_MOE_ENABLE()`가 이 bit를 set하고, `HAL_TIM_PWM_Start()`도 break 기능이 있는 timer에서는 이 macro를 부릅니다.

> ⚠️ Dead-time 너무 짧음

dead-time은 쓰는 MOSFET과 gate driver의 datasheet에 있는 turn-off 시간보다 길게 잡습니다. 위 계산식으로 그 시간을 `DTG` 값으로 바꿉니다.

> ⚠️ 가청 영역 PWM

motor PWM의 주파수를 높이면 같은 timer clock에서 resolution이 줄어드므로 둘을 함께 정합니다. 84 MHz timer에서 20 kHz는 ARR이 4199까지라 4200단계 resolution입니다.

> ⚠️ CCR > ARR

PWM mode 1의 정의("active as long as TIMx_CNT<TIMx_CCRy")대로라면 `CCR` > `ARR`이면 counter가 늘 `CCR`보다 작으므로 출력은 주기 내내 active입니다. duty를 계산해서 넣을 때는 `ARR + 1` 이하로 clamp합니다.

## 정리

- PWM = **ARR (period) + CCR (duty)**. PWM_freq = TIM_clk / ((PSC+1)(ARR+1)).
- General timer는 single-ended, **advanced timer (TIM1/8)**는 complementary + dead-time.
- Multi-channel 같은 ARR 공유, **CCR만 다르게**.
- **Preload + UG**로 glitch-free update.
- **dead-time**은 `DTG × tDTS`(168 MHz에서 42 → 250 ns)로 계산합니다.

다음 편은 **DC motor 제어**입니다. H-bridge + PWM duty + direction 제어를 다룹니다.

## 관련 항목

- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [5-02: DC 모터 제어](/blog/embedded/modern-recipes/part5-02-dc-motor)
- [5-04: 서보 모터](/blog/embedded/modern-recipes/part5-04-servo-motor)
