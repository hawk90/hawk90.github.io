---
title: "서보 모터 제어 — 50 Hz PWM·다채널·Calibration"
slug: "embedded/modern-recipes/part5-04-servo-motor"
date: 2026-04-14T09:52:00
description: "50 Hz PWM pulse 폭(1.5 ms 중앙)으로 각도 매핑·TIM3 4채널·calibration·smooth move."
series: "Modern Embedded Recipes"
seriesOrder: 52
tags: [recipes, peripheral, servo]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"hobby servo는 주기적인 pulse의 폭으로 각도를 받습니다."** 이 글의 코드는 20 ms 주기, 1.5 ms 중앙, 1000 µs당 90°를 가정하고, 실제 끝점은 calibration으로 맞춥니다.

## 어떤 상황에서 쓰나

RC car 조향, 로봇 관절, 카메라 pan/tilt처럼 정해진 각도로 움직여야 하는 곳에 hobby servo를 씁니다. MCU는 pulse 폭으로 목표 각도만 보냅니다.

이 글은 STM32F407 TIM3의 PWM 채널로 pulse를 만들고, 여러 servo를 한 timer로 다루는 방법과 calibration을 다룹니다. 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall` 경고 없이 빌드되는 것을 확인했고, 각도 → pulse 변환은 host에서 돌려 값을 확인했습니다. servo로 한 측정은 없습니다. servo 쪽 규격(허용 pulse 범위, 주기)은 제조사마다 다르고 이 글이 연 공식 datasheet가 없으므로, 아래 숫자는 코드의 가정으로 읽습니다.

## 핵심 개념

### 서보 PWM 사양

| pulse 폭 | 20 ms 중 비율 | `servo_set_angle()`의 각도 |
| --- | --- | --- |
| 500 µs | 2.5 % | −90° |
| 1000 µs | 5 % | −45° |
| 1500 µs | 7.5 % | 0° (center) |
| 2000 µs | 10 % | +45° |
| 2500 µs | 12.5 % | +90° |

이 표는 아래 코드의 변환식(1500 + deg × 1000 / 90)을 그대로 옮긴 것입니다. servo마다 실제 중앙과 끝점이 다르므로 4절의 calibration으로 맞춥니다.

### Multi-channel 제어

`stm32f407xx.h`의 `IS_TIM_CC4_INSTANCE`가 TIM2·TIM3·TIM4를 포함하므로 세 timer 모두 CH1~CH4 네 채널을 가지고, 같은 50 Hz 설정을 세 timer에 하면 12 channel이 됩니다.

| Timer | servo |
| --- | --- |
| TIM3 CH1-4 | 0-3 |
| TIM4 CH1-4 | 4-7 |
| TIM2 CH1-4 | 8-11 |

더 많은 채널은 I2C PWM controller로 늘립니다. NXP PCA9685(datasheet Rev. 4)는 "16-channel, 12-bit PWM Fm+ I2C-bus LED controller"이고, 출력 주파수를 "a typical of 24 Hz to 1526 Hz"에서 고를 수 있어 50 Hz도 들어갑니다.

## 코드 예제

### 1. 단일 servo

[4-04](/blog/embedded/modern-recipes/part4-04-clock-setup)의 clock 설정(SYSCLK 168 MHz, APB1 /4 = 42 MHz)에서 APB1 timer clock은 PCLK1의 2배인 84 MHz입니다(`stm32f4xx_ll_rcc.h`의 `LL_RCC_TIM_PRESCALER_TWICE`: "Timers clock to twice PCLK").

```c
void servo_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA6 = TIM3_CH1
    gpio_init(GPIOA, 6, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});

    // 50 Hz, resolution 1 µs
    // TIM3 clock = 84 MHz; PSC = 84-1 → 1 MHz tick (1 µs)
    // ARR = 20000-1 → 20 ms period (50 Hz); CCR1 = pulse width in µs
    TIM3->PSC = 84 - 1;
    TIM3->ARR = 20000 - 1;
    TIM3->CCMR1 = (6u << 4) | TIM_CCMR1_OC1PE;   // PWM mode 1
    TIM3->CCER  = TIM_CCER_CC1E;
    TIM3->CCR1  = 1500;                           // center (1.5 ms)
    TIM3->CR1   = TIM_CR1_ARPE | TIM_CR1_CEN;
    TIM3->EGR   = TIM_EGR_UG;
}

void servo_set_us(uint16_t pulse_us) {
    if (pulse_us < 500)  pulse_us = 500;          // clamp
    if (pulse_us > 2500) pulse_us = 2500;
    TIM3->CCR1 = pulse_us;
}

void servo_set_angle(int16_t deg) {
    // -90~+90 → 500~2500 µs
    if (deg < -90) deg = -90;
    if (deg >  90) deg =  90;
    uint16_t pulse = 1500 + (deg * 1000) / 90;
    servo_set_us(pulse);
}
```

### 2. 4-channel — TIM3 모든 채널

```c
void servo4_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN;

    // PA6/7/B0/B1 = TIM3 CH1-4 (AF2)
    gpio_init(GPIOA, 6, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});
    gpio_init(GPIOA, 7, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});
    gpio_init(GPIOB, 0, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});
    gpio_init(GPIOB, 1, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});

    TIM3->PSC = 84 - 1;
    TIM3->ARR = 20000 - 1;

    TIM3->CCMR1 = (6u << 4)  | TIM_CCMR1_OC1PE
                | (6u << 12) | TIM_CCMR1_OC2PE;
    TIM3->CCMR2 = (6u << 4)  | TIM_CCMR2_OC3PE
                | (6u << 12) | TIM_CCMR2_OC4PE;
    TIM3->CCER  = TIM_CCER_CC1E | TIM_CCER_CC2E
                | TIM_CCER_CC3E | TIM_CCER_CC4E;

    TIM3->CCR1 = TIM3->CCR2 = TIM3->CCR3 = TIM3->CCR4 = 1500;
    TIM3->CR1 = TIM_CR1_ARPE | TIM_CR1_CEN;
    TIM3->EGR = TIM_EGR_UG;
}

void servo4_set(uint8_t ch, uint16_t pulse_us) {
    if (pulse_us < 500) pulse_us = 500;
    if (pulse_us > 2500) pulse_us = 2500;
    switch (ch) {
        case 0: TIM3->CCR1 = pulse_us; break;
        case 1: TIM3->CCR2 = pulse_us; break;
        case 2: TIM3->CCR3 = pulse_us; break;
        case 3: TIM3->CCR4 = pulse_us; break;
    }
}
```

### 3. Smooth move — interpolation

목표 pulse로 바로 바꾸지 않고 10 ms마다 5 µs씩 다가가면, 1000 µs(90°)를 움직이는 데 200 tick = 2 s가 걸립니다. 움직이는 속도를 펌웨어가 정하는 방법입니다.

```c
typedef struct {
    int16_t current_us;
    int16_t target_us;
    int16_t step;        // per tick
} servo_smooth_t;

static servo_smooth_t s = {1500, 1500, 5};

void servo_smooth_set(int16_t target) { s.target_us = target; }

// 10 ms 주기 호출
void servo_smooth_tick(void) {
    if (s.current_us < s.target_us) {
        s.current_us += s.step;
        if (s.current_us > s.target_us) s.current_us = s.target_us;
    } else if (s.current_us > s.target_us) {
        s.current_us -= s.step;
        if (s.current_us < s.target_us) s.current_us = s.target_us;
    }
    servo_set_us(s.current_us);
}
```

### 4. Calibration

servo마다 중앙과 끝점의 pulse가 다르므로, 각도를 바꿔 가며 실제 각도를 재서 min/center/max를 표로 둡니다. 아래 `cal`의 숫자는 예시 값입니다.

```c
typedef struct {
    uint16_t min_us;     // -90°
    uint16_t center_us;  // 0° (center)
    uint16_t max_us;     // +90°
} servo_cal_t;

static servo_cal_t cal = {550, 1480, 2400};  // example values; measure your servo

void servo_set_angle_cal(int16_t deg) {
    uint16_t pulse;
    if (deg < -90) deg = -90;
    if (deg >  90) deg =  90;
    if (deg < 0)
        pulse = cal.center_us + (deg * (cal.center_us - cal.min_us)) / 90;
    else
        pulse = cal.center_us + (deg * (cal.max_us - cal.center_us)) / 90;
    servo_set_us(pulse);
}
```

`servo_set_us()`의 `TIM3->CCR1` 쓰기를 변수 대입으로 바꿔 host(clang)에서 `servo_set_angle()`과 `servo_set_angle_cal()`을 돌린 결과입니다. 범위 밖 ±150°는 양쪽 다 끝점으로 clamp됩니다.

```text
-150 deg ->  500 us (2.5%), cal  550 us
 -90 deg ->  500 us (2.5%), cal  550 us
 -45 deg -> 1000 us (5.0%), cal 1015 us
   0 deg -> 1500 us (7.5%), cal 1480 us
  45 deg -> 2000 us (10.0%), cal 1940 us
  90 deg -> 2500 us (12.5%), cal 2400 us
 150 deg -> 2500 us (12.5%), cal 2400 us
```

## 측정 / 동작 확인

스코프로 signal 핀을 봅니다.

![Servo PWM — 50 Hz period, 1.5 ms center pulse](/images/blog/modern-recipes/diagrams/part5-04-servo-pulse.svg)

scope에서 주기가 20 ms(50 Hz), high 폭이 `CCR1` µs인지 봅니다. 명령 각도와 실제 각도가 어긋나면 calibration 표를 다시 잽니다. 이 글은 보드에서 파형을 재지 않았습니다.

## 자주 보는 함정

> ⚠️ MCU 전원에서 servo 전원을 끌어 씀

servo motor 전류는 MCU용 regulator가 아니라 servo 전원으로 공급하고, 신호 기준이 맞도록 GND만 MCU와 공통으로 묶습니다. 필요한 전류는 쓰는 servo의 사양으로 정합니다.

> ⚠️ 신호 level

STM32 GPIO push-pull 출력의 high는 MCU의 VDD 근처입니다(이 글은 VDD = 3.3 V 가정). servo 입력이 3.3 V를 high로 받는지는 쓰는 servo의 사양으로 확인하고, 아니면 level shifter를 둡니다.

> ⚠️ Pulse 범위 초과

위 코드는 500 ~ 2500 µs로 clamp합니다. calibration으로 잰 끝점이 이보다 좁으면 clamp 범위도 그 값으로 줄입니다.

## 정리

- 이 글의 코드는 **50 Hz, 1.5 ms 중앙, 1000 µs당 90°**를 가정하고, 실제 center와 endpoint는 calibration합니다.
- TIM을 **PSC=83, ARR=19999**로 두면 1 µs resolution, 20 ms period가 됩니다.
- 한 TIM의 **4 channel로 servo 4개**를 다룹니다. 12 channel보다 많으면 PCA9685(16 channel) 같은 I2C PWM controller(24 ~ 1526 Hz)를 씁니다.
- **Calibration** (min/center/max)과 **smooth interpolation**으로 motion을 부드럽게 만듭니다.
- **servo 전원은 분리**하고 **GND는 공통**으로 묶습니다.

다음 편은 **Character LCD (HD44780)**입니다. 4/8-bit 모드, command, custom character를 다룹니다.

## 관련 항목

- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- [5-02: DC 모터 제어](/blog/embedded/modern-recipes/part5-02-dc-motor)
- [5-03: 스테퍼 모터](/blog/embedded/modern-recipes/part5-03-stepper-motor)

