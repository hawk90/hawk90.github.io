---
title: "스테퍼 모터 제어 — Full Step·Half Step·Microstepping"
slug: "embedded/modern-recipes/part5-03-stepper-motor"
date: 2026-04-14T09:51:00
description: "Full-step·half-step·micro-step·가속/감속 프로파일."
series: "Modern Embedded Recipes"
seriesOrder: 51
tags: [recipes, peripheral, motor, stepper]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"step pulse 빈도가 회전 속도를, 누적 pulse 수가 명령 위치를 정합니다."** 1.8°/step은 흔한 모터 사양 중 하나일 뿐 모든 stepper의 공통값은 아닙니다.

## 어떤 상황에서 쓰나

3D printer, CNC, camera focus, syringe pump, telescope mount — 정확한 *위치 제어*가 필요한 곳입니다. encoder 없이 *step 펄스만 카운트*해 위치를 알 수 있어 *open-loop control*이 가능합니다. 다만 *과도한 가속이나 부하*에서 step 잃으면 회복이 안 됩니다.

이 글은 흔히 쓰는 NEMA 17 stepper + DRV8825/A4988 driver 조합으로 step pulse 생성, micro-stepping, 가속 ramp를 다룹니다.

## 핵심 개념

### Stepper 동작 원리

2-phase bipolar stepper는 두 코일 (A: A+/A−, B: B+/B−)을 가집니다. 한 phase씩 ON 하면 full-step 시퀀스로 회전합니다.

| Step | A | B | 각도 |
| --- | --- | --- | --- |
| 1 | + | 0 | 0° |
| 2 | 0 | + | 90° |
| 3 | − | 0 | 180° |
| 4 | 0 | − | 270° |

NEMA 17은 외형 규격명이며 step angle·전류·토크는 모델마다 다릅니다. micro-step 분해능과 지원 단계도 driver마다 다르며, 명령 pulse 수가 실제 위치 정확도를 그대로 보장하지는 않습니다.

### Full-step / Half-step / Micro-step

| Mode | Step/회전 (200 기본) | Torque | Smoothness |
|------|---------------------|--------|------------|
| Full | 200 | 100% | 거침 |
| Half | 400 | 70.7% (한 phase ON) ~ 100% | 보통 |
| Micro 1/8 | 1600 | 변동 | 부드러움 |
| Micro 1/16 | 3200 | 변동 | 매우 부드러움 |
| Micro 1/32 | 6400 | 변동 | 거의 무음 |

micro-step은 coil current를 사인파에 가깝게 제어해 중간 위치를 만듭니다. driver의 current regulation, load와 resonance에 따라 torque와 위치 오차가 달라지며, mode pin 또는 register 설정 방식도 driver마다 다릅니다.

### DRV8825 / A4988 인터페이스

| MCU 신호 | DRV8825 핀 | 의미 |
| --- | --- | --- |
| STEP (GPIO) | STEP | rising edge마다 1 step |
| DIR (GPIO) | DIR | 0 = CW, 1 = CCW |
| EN (GPIO) | /EN | 0 = enable (active-low) |
| GPIO × 3 | MS1 / MS2 / MS3 | micro-step select |
| — | AOUT1/2, BOUT1/2 | motor coil |
| — | VMOT | 8 ~ 45 V motor power |
| — | VREF | current limit formula is driver/sense-resistor specific |

current limit는 driver datasheet의 VREF·Rsense 식과 thermal limit로 설정합니다. DRV8825의 식도 board variant와 Rsense 값을 확인합니다.

### Acceleration ramp

stepper는 *기계적 inertia* 때문에 stop에서 max speed로 *바로 못 갑니다*. 천천히 가속해야 step 안 잃습니다.

**Linear ramp:**

- speed(t) = a × t  (a = 가속도, step/s²)
- delay(n) = 1 / speed(n)

**S-curve (jerk-limited):**

- 더 부드럽지만 계산 복잡

3D printer (Marlin firmware)는 *trapezoidal velocity profile* (가속 → 등속 → 감속)을 표준으로 씁니다.

## 코드 예제

### 1. Basic step pulse

```c
// STEP = PA0, DIR = PA1, /EN = PA2
void stepper_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .speed=GPIO_SPEED_HIGH});
    gpio_init(GPIOA, 1, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    gpio_init(GPIOA, 2, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});

    GPIOA->BSRR = (1u << (2 + 16));   // EN low = enable
}

void stepper_step(int dir) {
    if (dir > 0) GPIOA->BSRR = (1u << (1 + 16));   // DIR=0
    else         GPIOA->BSRR = (1u << 1);          // DIR=1

    GPIOA->BSRR = (1u << 0);          // STEP high
    delay_us(2);                       // satisfy the selected driver's pulse timing
    GPIOA->BSRR = (1u << (0 + 16));   // STEP low
    delay_us(2);
}

// 1초에 1 회전 (200 step → 5 ms/step)
for (int i = 0; i < 200; i++) {
    stepper_step(1);
    delay_us(5000 - 4);
}
```

### 2. Timer-driven step pulse

`delay`로 step을 보내면 *CPU를 꽉 잡습니다*. TIM update IRQ로 *background에서* step.

```c
volatile int32_t target_steps;
volatile int32_t current_steps;
volatile int8_t  step_dir;

void stepper_tim_init(uint32_t step_hz) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    TIM3->PSC = 84 - 1;                // 84 MHz / 84 = 1 MHz tick
    TIM3->ARR = (1000000u / step_hz) - 1;
    TIM3->DIER = TIM_DIER_UIE;
    TIM3->CR1 = TIM_CR1_CEN;
    NVIC_EnableIRQ(TIM3_IRQn);
}

void stepper_move(int32_t steps) {
    if (steps > 0) { step_dir = +1; GPIOA->BSRR = (1u << (1+16)); }
    else           { step_dir = -1; GPIOA->BSRR = (1u << 1); }
    target_steps = current_steps + steps;
}

void TIM3_IRQHandler(void) {
    TIM3->SR &= ~TIM_SR_UIF;
    if (current_steps != target_steps) {
        GPIOA->BSRR = (1u << 0);
        // 약간의 delay 후 low (간단히 다음 IRQ 사이에 low되도록)
        for (volatile int i = 0; i < 5; i++);
        GPIOA->BSRR = (1u << (0+16));
        current_steps += step_dir;
    }
}
```

### 3. Acceleration ramp — linear

```c
typedef struct {
    int32_t target;
    int32_t current;
    int32_t accel;     // step/s²
    int32_t max_vel;   // step/s
    int32_t velocity;  // current
    uint32_t last_step_us;
} stepper_t;

uint32_t stepper_next_delay_us(stepper_t *s) {
    int32_t remaining = abs(s->target - s->current);

    // Decelerate if needed: v² = 2 a d
    int32_t decel_dist = (s->velocity * s->velocity) / (2 * s->accel);

    if (remaining <= decel_dist) {
        s->velocity = (int32_t)sqrtf(2.0f * s->accel * remaining);
    } else if (s->velocity < s->max_vel) {
        // Accelerate
        s->velocity += s->accel / 1000;   // small step
        if (s->velocity > s->max_vel) s->velocity = s->max_vel;
    }

    if (s->velocity < 100) s->velocity = 100;   // min
    return 1000000u / s->velocity;
}
```

`stepper_next_delay_us()`가 *다음 step pulse까지의 delay*를 반환. 매 step마다 호출.

### 4. Micro-step 설정

```c
void stepper_set_microstep(uint8_t div) {
    // div: 1, 2, 4, 8, 16, 32
    // MS1/MS2/MS3 mapping is driver-specific; verify the datasheet table.
    uint8_t ms = 0;
    switch (div) {
        case 1:  ms = 0b000; break;
        case 2:  ms = 0b001; break;
        case 4:  ms = 0b010; break;
        case 8:  ms = 0b011; break;
        case 16: ms = 0b100; break;
        case 32: ms = 0b111; break;
    }
    GPIOB->BSRR = (ms & 1)      ? (1u << 0)  : (1u << 16);
    GPIOB->BSRR = (ms & 2)      ? (1u << 1)  : (1u << 17);
    GPIOB->BSRR = (ms & 4)      ? (1u << 2)  : (1u << 18);
}
```

## 측정 / 동작 확인

스코프로 STEP 핀을 보면 *step rate*가 보입니다.

- **등속 1000 step/s** — 1 ms 주기 균등 펄스 트레인
- **Trapezoidal ramp** — 주파수가 점차 증가 → 일정 → 감소. step 누적이 정확히 target과 일치해야 함

stepper가 *step을 잃으면* 회전 각도가 명령과 다릅니다. 가능한 진단:
- *가속이 너무 가파름* → ramp 완화
- *current 부족* → VREF 조정
- *부하 초과* → torque margin 확인

## 자주 보는 함정

> ⚠️ Current limit 잘못

VREF와 current limit는 motor 정격, Rsense, driver variant와 cooling 조건에 맞춰 설정합니다. 너무 높으면 motor와 driver IC 모두 *발열·thermal shutdown* 위험이 있습니다.

> ⚠️ Step rate 가속 없이 max로 시작

stepper는 *0 → max에 못 갑니다*. ramp 안 하면 *step lost*.

> ⚠️ STEP pulse가 너무 짧음

STEP HIGH/LOW minimum과 DIR setup time은 driver별 datasheet 값으로 검증합니다. 임의의 2 µs 값을 모든 driver에 적용하지 않습니다.

> ⚠️ DIR 변경 직후 즉시 STEP

DIR 변경 후에는 선택한 driver의 setup/hold time을 만족시킨 뒤 STEP을 발생시킵니다.

> ⚠️ EN을 운영 중 toggle

EN을 disable로 toggle하면 *current 사라지고 motor가 holding torque 잃음* → 외력에 회전. 운영 중에는 EN 유지, idle 시 disable로 발열 감소.

> ⚠️ Resonance 영역

stepper resonance 영역은 motor, load, current와 mechanics에 따라 달라집니다. 진동·step loss를 측정하고 acceleration profile과 microstep 설정을 조정합니다.

## 정리

- Stepper = **STEP pulse 카운트로 명령 위치**. 실제 step angle과 load에 따라 오차·step loss를 검증합니다.
- DRV8825/A4988 driver는 **STEP/DIR/EN + MS1/2/3**.
- **Acceleration ramp** 필수 — trapezoidal 또는 S-curve.
- **Micro-step**으로 vibration·noise를 줄일 수 있지만 torque와 위치 정확도는 driver/load에 따라 달라집니다.
- VREF로 **current limit** 정확히 설정 — 너무 높으면 발열, 낮으면 torque 부족.

다음 편은 **서보 모터**입니다. 50 Hz PWM과 1-2 ms duty로 각도 제어를 다룹니다.

## 관련 항목

- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- [5-02: DC 모터 제어](/blog/embedded/modern-recipes/part5-02-dc-motor)
- [5-04: 서보 모터](/blog/embedded/modern-recipes/part5-04-servo-motor)
- 9-05: PID 제어 기본
