---
title: "5-04: 서보 모터"
date: 2026-05-14T04:00:00
description: "PWM-based 제어 (50Hz, 1~2ms duty)·각도 매핑."
series: "Modern Embedded Recipes"
seriesOrder: 52
tags: [recipes, peripheral, servo]
draft: false
---

## 한 줄 요약

> **"20 ms 주기에 1~2 ms pulse가 0~180°."** Hobby servo의 표준 신호. 다른 건 다 같습니다.

## 어떤 상황에서 쓰나

RC car 조향, 로봇 관절, 카메라 pan/tilt gimbal, 작은 quadcopter actuator — 0~180° 회전 위치 제어가 필요한 곳에 *SG90, MG996R, MG90S* 같은 hobby servo를 씁니다. 내부에 *DC motor + reduction gear + position feedback + PID*가 모두 들어있어 *MCU는 PWM pulse 하나만 보냅니다*.

이 글은 STM32 TIM의 PWM 채널로 1-2 ms pulse를 만들고, 다중 servo 동시 제어 패턴, 그리고 servo의 한계와 진단을 다룹니다.

## 핵심 개념

### 서보 PWM 사양

```text
Period: 20 ms (50 Hz)

Pulse width → angle:
  0.5 ms (2.5%)  → -90° (또는 0°)
  1.0 ms (5%)    → -45°
  1.5 ms (7.5%)  →   0° (center)
  2.0 ms (10%)   →  +45°
  2.5 ms (12.5%) → +90° (또는 180°)
```

표준은 *1-2 ms = 90°범위*입니다. 일부 servo는 *0.5-2.5 ms = 180°* (확장 범위). datasheet 확인.

### Servo 종류

| Type | 회전 | 토크 | Feedback |
|------|------|------|----------|
| 표준 servo (SG90) | 0~180° | 1.8 kg·cm @ 4.8V | 내장 (위치) |
| Continuous servo | 무한 회전 | — | 없음 (속도 제어) |
| Digital servo | 0~180° | 더 빠른 응답 | 내장 + 300 Hz 가능 |
| Metal gear (MG996R) | 0~180° | 11 kg·cm | 내장 |

### Multi-channel 제어

12-channel servo (로봇 팔 등) 제어가 흔합니다. STM32 TIM이 4 channel을 가지므로 *TIM 3개*로 12 channel.

```text
TIM3 CH1-4: servo 0-3 (50 Hz, 4 CCR로 duty)
TIM4 CH1-4: servo 4-7
TIM2 CH1-4: servo 8-11
```

또는 *외부 PCA9685* (16-channel PWM driver, I2C)로 더 많이.

## 코드 예제

### 1. 단일 servo

```c
void servo_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA6 = TIM3_CH1
    gpio_init(GPIOA, 6, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=2});

    // 50 Hz, resolution 1 µs
    // TIM3 clock = 84 MHz; PSC = 84-1 → 1 MHz tick (1 µs)
    // ARR = 20000-1 → 20 ms period (50 Hz)
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

급격히 각도 변경하면 servo가 빠르게 회전 + 큰 current. 부드러운 motion에는 *interpolation*.

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

servo마다 정확한 *center / min / max*가 다릅니다. 사용 전 calibration.

```c
typedef struct {
    uint16_t min_us;     // 0° or -90°
    uint16_t center_us;  // 0° (center)
    uint16_t max_us;     // 180° or +90°
} servo_cal_t;

static servo_cal_t cal = {550, 1480, 2400};  // 실측값

void servo_set_angle_cal(int16_t deg) {
    uint16_t pulse;
    if (deg < 0)
        pulse = cal.center_us + (deg * (cal.center_us - cal.min_us)) / 90;
    else
        pulse = cal.center_us + (deg * (cal.max_us - cal.center_us)) / 90;
    servo_set_us(pulse);
}
```

## 측정 / 동작 확인

스코프로 signal 핀을 봅니다.

![Servo PWM — 50 Hz period, 1.5 ms center pulse](/images/blog/modern-recipes/diagrams/part5-04-servo-pulse.svg)

각도 변경 시 pulse width만 바뀝니다 (period는 20 ms 고정).

physical 회전 각도와 명령 각도가 *어긋나면* calibration 다시.

power supply current로 *stall 여부* 확인. servo가 *물리적으로 막혀* (limit switch 닿거나, 부하 초과) 있으면 *지속 high current*. 발열 → burn-out.

## 자주 보는 함정

> ⚠️ 5V servo를 3.3V signal로 구동

대부분의 servo는 *3.3V signal로도 동작*하지만, 일부는 5V threshold. 안 움직이면 *level shifter* 또는 5V GPIO 사용.

> ⚠️ MCU에서 직접 servo power 공급

SG90도 stall에 700 mA 흘림. STM32 3.3V regulator (typ 300 mA)에서는 *brown-out reset*. *servo는 별도 5V supply*에서 연결, GND는 공통.

> ⚠️ Pulse 범위 초과

500 µs 이하나 2500 µs 이상을 보내면 servo가 *internal end-stop에 부딪힘* → buzz + 발열. clamp 필수.

> ⚠️ 50 Hz 이외 frequency

대부분 servo는 50 Hz 전용. *digital servo*만 200-300 Hz 가능.

> ⚠️ 정전기·voltage spike

servo가 외력으로 회전당하면 *back-EMF*가 signal line으로 결합. signal에 *직렬 100 Ω + 1 nF*로 protection.

> ⚠️ Multiple servo 동시 startup

여러 servo가 *동시에 0° → 180°* 가면 power supply가 droop. 시간차 startup.

## 정리

- Hobby servo = **50 Hz PWM, 1-2 ms pulse**. 1.5 ms가 center.
- TIM의 **PSC=83, ARR=19999**로 1 µs resolution, 20 ms period.
- 한 TIM의 **4 channel로 4 servo**. 12 channel 이상은 PCA9685 I2C driver.
- **Calibration** (min/center/max) + **smooth interpolation**으로 부드러운 motion.
- **Power 분리** (servo VBUS 별도), **GND 공통**, **signal에 protection** 권장.

다음 편은 **Character LCD (HD44780)**입니다. 4/8-bit 모드, command, custom character를 다룹니다.

## 관련 항목

- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- [5-02: DC 모터 제어](/blog/embedded/modern-recipes/part5-02-dc-motor)
- [5-03: 스테퍼 모터](/blog/embedded/modern-recipes/part5-03-stepper-motor)
- [9-05: PID 제어 기본](/blog/embedded/modern-recipes/part9-05-pid-control)
