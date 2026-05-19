---
title: "5-01: PWM 출력 (LED 밝기·모터)"
date: 2026-05-14T01:00:00
description: "Timer로 PWM 생성·duty 변경·complementary 출력."
series: "Modern Embedded Recipes"
seriesOrder: 49
tags: [recipes, peripheral, pwm]
draft: false
---

## 한 줄 요약

> **"Period와 duty 두 숫자로 모든 PWM이 만들어집니다."** ARR가 period, CCR가 duty. duty / ARR이 비율.

## 어떤 상황에서 쓰나

LED 밝기 조절, DC motor 속도, servo 위치, switching power, audio class-D — 모두 PWM의 같은 패턴입니다. duty cycle을 0%~100%로 변경하면 평균 전압 (또는 평균 power)이 비례합니다. STM32의 *advanced timer (TIM1/8)*는 complementary output + dead-time까지 hardware로 지원해 3-phase motor도 한 timer로 구동합니다.

이 글은 TIM2/3/4 같은 general purpose timer로 단일 PWM, 다중 채널 PWM, complementary PWM 세 변종을 모두 작성합니다.

## 핵심 개념

### Timer counter mode

```text
Up-counter (가장 일반):
0 ─→ ARR ─→ 0 ─→ ARR ─→ ...
        ↓ Update event (UEV) — interrupt 가능

CCR  ____|‾‾‾‾‾‾‾‾‾‾‾|____   (PWM mode 1)
         CCR값에서 toggle
```

- `ARR` (Auto-Reload Register): counter top. period = (ARR+1) × (PSC+1) / TIM_clk.
- `CCR` (Capture/Compare Register): duty 값. 0~ARR.
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
| PWM mode 1 (110) | counter < CCR → active (high), else inactive (low) |
| PWM mode 2 (111) | counter < CCR → inactive (low), else active (high) — inverted |

일반적인 *high-side duty 증가 = brightness 증가*는 mode 1.

### Resolution

```text
8-bit (ARR=255):  256 step
12-bit (ARR=4095): 4096 step
16-bit (ARR=65535): 65536 step
```

LED는 8-bit이면 충분 (human eye log perception). motor는 8-12 bit, audio는 12-16 bit가 표준.

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

    // 20 kHz PWM, 8-bit (256 step)
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
while (1) {
    for (int i = 0; i < 256; i++) { pwm_set_duty_8bit(i); delay_ms(5); }
    for (int i = 255; i >= 0; i--) { pwm_set_duty_8bit(i); delay_ms(5); }
}
```

### 2. Multi-channel — RGB LED

```c
void rgb_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;

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

3-phase BLDC, H-bridge에 필요한 *complementary output + dead-time*은 advanced timer만 지원합니다.

```c
void pwm_complementary_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_TIM1EN;

    // PA8 = TIM1_CH1 (high-side), PB13 = TIM1_CH1N (low-side, AF1)
    gpio_init(GPIOA, 8,  &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=1});
    gpio_init(GPIOB, 13, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=1});

    // 20 kHz center-aligned PWM
    TIM1->PSC = 0;
    TIM1->ARR = 4200 - 1;          // 168 MHz / 4200 = 40 kHz, center-aligned → 20 kHz
    TIM1->CR1 = TIM_CR1_CMS_0;     // center-aligned mode 1

    // PWM mode 1, complementary
    TIM1->CCMR1 = (6u << 4) | TIM_CCMR1_OC1PE;
    TIM1->CCER  = TIM_CCER_CC1E | TIM_CCER_CC1NE;

    // Dead-time: 250 ns @ 168 MHz = 42 cycle → DTG = 42
    TIM1->BDTR = (42u << 0) | TIM_BDTR_MOE;

    TIM1->CCR1 = 2100;             // 50% duty
    TIM1->EGR = TIM_EGR_UG;
    TIM1->CR1 |= TIM_CR1_CEN;
}
```

dead-time은 *high-side가 꺼지고 low-side가 켜지기 사이 gap*. shoot-through (short-circuit)를 막습니다.

```text
CH1   ‾‾‾‾‾‾‾|___|‾‾‾‾‾‾‾‾‾
CH1N  __________|‾|_________
                ↑ dead time
```

### 4. DMA-driven duty — waveform 생성

```c
static uint16_t sine_table[256];   // pre-computed

void pwm_dma_init(void) {
    // sine table 생성
    for (int i = 0; i < 256; i++)
        sine_table[i] = 128 + 127 * sinf(2 * 3.14159 * i / 256);

    // TIM3 CCR1을 DMA로 update
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA1EN;
    DMA1_Stream4->PAR  = (uint32_t)&TIM3->CCR1;
    DMA1_Stream4->M0AR = (uint32_t)sine_table;
    DMA1_Stream4->NDTR = 256;
    DMA1_Stream4->CR   = (5u << 25)
                       | DMA_SxCR_DIR_0
                       | DMA_SxCR_MINC
                       | (1u << 11) | (1u << 13)   // 16-bit
                       | DMA_SxCR_CIRC
                       | DMA_SxCR_EN;

    TIM3->DIER |= TIM_DIER_UDE;   // update DMA enable
}
```

sine table을 PWM duty로 출력 + RC filter → 사인파 generator. simple class-D audio도 같은 패턴.

## 측정 / 동작 확인

스코프로 PWM 출력을 봅니다.

```text
20 kHz, 25% duty:
  ┌──┐           ┌──┐
  │  │           │  │
──┘  └───────────┘  └──
  ←──── 50 µs ────→
   ← 12.5 µs duty

20 kHz, 75% duty:
  ┌──────────┐   ┌──────────┐
──┘          └───┘          └──
  ← 37.5 µs duty
```

LED의 경우 RC 적분기 같은 사람 눈이 시간 평균을 봅니다. duty 50%면 정확히 max의 절반 밝기 (실제로는 log 인지라 더 밝게 보임).

DC motor는 *coil이 PWM를 평균화*해 평균 전압이 회전 속도에 비례. *PWM 주파수가 너무 낮으면* (< 1 kHz) 가청 소음. 20 kHz 이상 사용.

## 자주 보는 함정

> ⚠️ Preload (OCxPE) 안 set

duty 변경이 *current period 중간*에 반영되어 glitch. preload + UG로 *next period 시작에 적용*되도록.

> ⚠️ UG event 안 트리거

`EGR = UG`로 register update 안 하면 처음 PWM이 *예상 duty가 아님*.

> ⚠️ Complementary PWM에 MOE 안 set

`BDTR.MOE` (Main Output Enable)가 0이면 *advanced timer 출력이 hardware로 차단*됩니다.

> ⚠️ Dead-time 너무 짧음

MOSFET의 turn-off time보다 짧으면 shoot-through → MOSFET 파괴. datasheet의 *t_off* 보고 결정.

> ⚠️ 가청 영역 PWM

PWM freq가 1-15 kHz면 코일이 사람 귀에 들리는 음을 냅니다. 20 kHz 이상으로 올립니다.

> ⚠️ CCR > ARR

duty 범위를 초과한 값을 쓰면 *항상 active* 또는 *항상 inactive*가 됨. clamp.

## 정리

- PWM = **ARR (period) + CCR (duty)**. PWM_freq = TIM_clk / ((PSC+1)(ARR+1)).
- General timer는 single-ended, **advanced timer (TIM1/8)**는 complementary + dead-time.
- Multi-channel 같은 ARR 공유, **CCR만 다르게**.
- **Preload + UG**로 glitch-free update.
- 20 kHz 이상으로 두면 motor에서 가청 소음 사라짐.

다음 편은 **DC motor 제어**입니다. H-bridge + PWM duty + direction 제어를 다룹니다.

## 관련 항목

- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [5-02: DC 모터 제어](/blog/embedded/modern-recipes/part5-02-dc-motor)
- [5-04: 서보 모터](/blog/embedded/modern-recipes/part5-04-servo-motor)
