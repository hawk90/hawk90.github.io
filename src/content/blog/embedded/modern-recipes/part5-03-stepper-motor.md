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

> **"step pulse 빈도가 회전 속도를, 누적 pulse 수가 명령 위치를 정합니다."**

## 어떤 상황에서 쓰나

stepper motor는 encoder 없이 보낸 step pulse 수로 위치를 아는 open-loop 구동에 씁니다. 그 대신 motor가 pulse를 따라가지 못하고 step을 잃으면 펌웨어가 아는 위치와 실제 위치가 어긋나고, encoder가 없으니 그 사실을 알 수 없습니다.

이 글은 TI DRV8825(datasheet SLVSA73F) driver를 기준으로 step pulse 생성, micro-stepping, 가속 ramp를 다룹니다. 코드는 STM32F407용으로 arm-none-eabi-gcc 16.2.0에서 `-Wall` 경고 없이 빌드되는 것을 확인했고, 가속 ramp 함수는 host에서 한 번의 이동을 시뮬레이션해 속도 profile을 쟀습니다. motor로 한 측정은 없습니다.

## 핵심 개념

### Stepper 동작 원리

2-phase bipolar stepper는 두 코일 (A: A+/A−, B: B+/B−)을 가집니다. 한 phase씩 ON 하면 full-step 시퀀스로 회전합니다.

| Step | A | B | 전기각 |
| --- | --- | --- | --- |
| 1 | + | 0 | 0° |
| 2 | 0 | + | 90° |
| 3 | − | 0 | 180° |
| 4 | 0 | − | 270° |

이 표는 한 코일씩 켜는 one-phase-on 순서입니다. DRV8825의 full step(MODE = 000)은 두 코일을 71 %씩 켜는 2-phase excitation이라, datasheet Table 2대로 45°(home state)·135°·225°·315°(전기각)에 섭니다.

아래 표의 "200"은 한 바퀴 200 full step(1.8°/step) motor를 가정한 값입니다.

### Full-step / Half-step / Micro-step

| DRV8825 MODE2/1/0 | Step mode (datasheet Table 1) | Step/회전 (200 full step motor) |
|------|---------------------|--------|
| 000 | Full step (2-phase excitation) with 71% current | 200 |
| 001 | 1/2 step | 400 |
| 010 | 1/4 step | 800 |
| 011 | 8 microsteps/step | 1600 |
| 100 | 16 microsteps/step | 3200 |
| 101, 110, 111 | 32 microsteps/step | 6400 |

DRV8825 datasheet 8.3.2절(Current Regulation)은 "current regulation is used to vary the current in the two windings in a semi-sinusoidal fashion to provide smooth motion"이라고 설명합니다. micro-step은 두 코일 전류를 사인에 가까운 값으로 나눠 그 사이 위치를 만드는 방식입니다.

### DRV8825 인터페이스

| MCU 신호 | DRV8825 핀 | 의미 |
| --- | --- | --- |
| STEP (GPIO) | STEP | rising edge마다 1 step |
| DIR (GPIO) | DIR | "Level sets the direction of stepping" |
| EN (GPIO) | nENBL | "logic low to enable" |
| GPIO × 3 | MODE0 / MODE1 / MODE2 | micro-step select (위 표) |
| — | AOUT1/2, BOUT1/2 | motor coil |
| — | VMA, VMB | 8.2 ~ 45 V motor power |
| — | AVREF, BVREF | 전류 한계 기준 전압 |
| 3.3 V 또는 GPIO high | nSLEEP, nRESET | "need to be driven to logic high for device operation"(8.3.6절). 둘 다 내부 pulldown |

전류 한계는 datasheet Equation 1의 ICHOP = V(xREF) / (5 × RISENSE)입니다. datasheet의 예는 0.25 Ω sense 저항과 VREF 2.5 V에서 2.5 / (5 × 0.25) = 2 A입니다. 보드마다 sense 저항 값이 다르므로 그 보드의 회로도에서 RISENSE를 읽어 넣습니다.

### Acceleration ramp

정지 상태에서 바로 최고 속도의 pulse를 보내면 rotor와 부하가 그 속도를 따라가지 못하므로 속도를 가속도 a로 올립니다. 거리 d를 가속하는 동안 속도는 v² = v₀² + 2ad를 따르므로, step마다(d = 1) v_next = √(v² + 2a)로 올리고, 남은 거리 r에서는 √(2ar)로 내리면 가속 → 등속 → 감속의 사다리꼴(trapezoidal) profile이 됩니다.

## 코드 예제

### 1. Basic step pulse

`delay_us_dwt()`는 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer)의 함수이고, 쓰기 전에 `dwt_init()`을 한 번 불러야 `CYCCNT`가 셉니다.

```c
// STEP = PA0, DIR = PA1, /EN = PA2
void stepper_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT, .speed=GPIO_SPEED_HIGH});
    gpio_init(GPIOA, 1, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    gpio_init(GPIOA, 2, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});

    GPIOA->BSRR = (1u << (2 + 16));   // EN low = enable
}

#define CPU_HZ 168000000u   // 4-04

void stepper_step(int dir) {
    if (dir > 0) GPIOA->BSRR = (1u << (1 + 16));   // DIR=0
    else         GPIOA->BSRR = (1u << 1);          // DIR=1
    delay_us_dwt(1, CPU_HZ);                       // tSU(STEP) >= 650 ns

    GPIOA->BSRR = (1u << 0);          // STEP high
    delay_us_dwt(2, CPU_HZ);           // tWH(STEP) >= 1.9 us
    GPIOA->BSRR = (1u << (0 + 16));   // STEP low
    delay_us_dwt(2, CPU_HZ);           // tWL(STEP) >= 1.9 us
}

// 200 step at 5 ms/step = 1 s (one turn of a 200-step motor in full step)
void one_turn(void) {
    for (int i = 0; i < 200; i++) {
        stepper_step(1);
        delay_us_dwt(5000 - 5, CPU_HZ);
    }
}
```

### 2. Timer-driven step pulse

위 방식은 step 사이 내내 CPU가 기다립니다. TIM3 update 인터럽트에서 pulse를 내면 main은 다른 일을 할 수 있습니다. pulse 폭은 여전히 tWH(STEP) 1.9 µs 이상이어야 하므로 ISR 안에서 `delay_us_dwt()`로 맞춥니다.

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
    delay_us_dwt(1, CPU_HZ);           // tSU(STEP) >= 650 ns before the ISR's next STEP
    target_steps = current_steps + steps;
}

void TIM3_IRQHandler(void) {
    TIM3->SR = ~TIM_SR_UIF;            // clear UIF only (4-05)
    if (current_steps != target_steps) {
        GPIOA->BSRR = (1u << 0);
        delay_us_dwt(2, CPU_HZ);       // tWH(STEP) >= 1.9 us
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
    float   velocity;  // current, step/s (float: the sqrt update must not truncate)
    uint32_t last_step_us;
} stepper_t;

uint32_t stepper_next_delay_us(stepper_t *s) {
    int32_t remaining = abs(s->target - s->current);

    // Decelerate if needed: v² = 2 a d
    float decel_dist = s->velocity * s->velocity / (2.0f * s->accel);

    if (remaining <= decel_dist) {
        s->velocity = sqrtf(2.0f * s->accel * remaining);
    } else if (s->velocity < s->max_vel) {
        // Accelerate: same v^2 = v0^2 + 2a·(1 step) law as the deceleration branch
        s->velocity = sqrtf(s->velocity * s->velocity + 2.0f * s->accel);
        if (s->velocity > s->max_vel) s->velocity = (float)s->max_vel;
    }

    if (s->velocity < 100.0f) s->velocity = 100.0f;   // min
    return (uint32_t)(1000000.0f / s->velocity);
}

```

`stepper_next_delay_us()`는 다음 step pulse까지의 시간을 돌려주고, step마다 한 번 부릅니다. 이 글의 처음 판은 가속 구간에서 `velocity += accel / 1000`처럼 step마다 같은 양을 더하고 velocity를 정수로 두었습니다. 감속 구간은 v² = 2ad를 쓰므로 두 구간의 규칙이 달랐습니다. host에서 한 번의 이동(4000 step, a = 4000 step/s², max 2000 step/s)을 돌려 실제 가속도를 쟀습니다.

```c
/* ramp_sim.c */
/* Run stepper_next_delay_us() for one move on the host and measure the profile it produces. */
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include "ramp.inc"   /* stepper_t + stepper_next_delay_us() from this section */

int main(void) {
    stepper_t s = { .target = 4000, .current = 0, .accel = 4000, .max_vel = 2000, .velocity = 0 };
    double t = 0, t_reach_max = -1;
    int32_t step_reach_max = -1, steps_at_max = 0;
    while (s.current != s.target) {
        uint32_t d = stepper_next_delay_us(&s);
        t += d / 1e6;
        s.current++;
        if (s.velocity >= s.max_vel) { steps_at_max++; if (t_reach_max < 0) { t_reach_max = t; step_reach_max = s.current; } }
    }
    printf("accel param = %d step/s^2, max_vel = %d step/s, move = %d steps\n", 4000, 2000, 4000);
    printf("reached max_vel at step %d, t = %.3f s -> average accel %.0f step/s^2\n",
           step_reach_max, t_reach_max, (2000 - 100) / t_reach_max);
    printf("ideal (v^2 = 2ad): %.0f steps, %.3f s\n", (2000.0*2000 - 100.0*100) / (2 * 4000), (2000 - 100) / 4000.0);
    printf("steps at max_vel = %d, total time = %.3f s, last velocity = %.0f\n", steps_at_max, t, (double)s.velocity);
    return 0;
}
```

```bash
clang -O2 -Wall -o ramp_sim ramp_sim.c -lm && ./ramp_sim
```

처음 판:

```text
accel param = 4000 step/s^2, max_vel = 2000 step/s, move = 4000 steps
reached max_vel at step 476, t = 0.754 s -> average accel 2520 step/s^2
ideal (v^2 = 2ad): 499 steps, 0.475 s
steps at max_vel = 3026, total time = 2.749 s, last velocity = 100
```

위 코드(같은 v² 법칙, float velocity):

```text
accel param = 4000 step/s^2, max_vel = 2000 step/s, move = 4000 steps
reached max_vel at step 500, t = 0.480 s -> average accel 3955 step/s^2
ideal (v^2 = 2ad): 499 steps, 0.475 s
steps at max_vel = 3002, total time = 2.463 s, last velocity = 100
```

처음 판은 최고 속도까지 0.754 s, 평균 가속도 2520 step/s²로 설정값 4000보다 느렸습니다. 고친 판은 0.480 s, 3955 step/s²로 이론값(499 step, 0.475 s)에 맞습니다. 중간 판에서 v² 법칙만 쓰고 velocity를 `int32_t`로 남겨 두었을 때는 매 step 소수점이 잘려 0.545 s(3486 step/s²)였습니다.

### 4. Micro-step 설정

```c
void stepper_set_microstep(uint8_t div) {
    // div: 1, 2, 4, 8, 16, 32 -> DRV8825 MODE2..0 (datasheet Table 1)
    // MODE0 = PB0, MODE1 = PB1, MODE2 = PB2
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

scope로 STEP 핀을 보면 확인할 것이 셋입니다. high 폭이 1.9 µs 이상인지(tWH), DIR이 바뀐 뒤 첫 STEP rising까지 650 ns 이상인지(tSU), ramp 구간에서 pulse 간격이 위 시뮬레이션처럼 줄었다가 일정해지고 다시 늘어나는지입니다. 이 글은 이 측정을 하지 않았습니다. step을 잃었는지는 같은 위치로 되돌아왔을 때 기계적 기준점과 비교해 봅니다.

## 자주 보는 함정

> ⚠️ Current limit 잘못

VREF는 위 ICHOP 식으로 motor의 정격 전류에 맞춥니다. DRV8825 datasheet는 최대 2.5 A를 "with proper heat sinking, at 24 V and 25°C" 조건으로 적습니다.

> ⚠️ Step rate 가속 없이 max로 시작

위 ramp 함수를 거치지 않고 처음부터 최고 속도의 pulse를 보내는 경우입니다. 가속도와 최고 속도는 motor·부하로 시험해 정합니다.

> ⚠️ STEP pulse가 너무 짧음

DRV8825는 tWH(STEP)·tWL(STEP) 각각 1.9 µs 이상입니다. 이 글의 처음 판은 ISR에서 `for (volatile int i = 0; i < 5; i++);`로 폭을 만들었는데, 이 loop의 길이는 clock과 compiler에 따라 달라 1.9 µs를 보장하지 못하므로 `delay_us_dwt()`로 바꿨습니다.

> ⚠️ DIR 변경 직후 즉시 STEP

DRV8825의 tSU(STEP) "Setup time, command before STEP rising"은 650 ns입니다. 처음 판의 `stepper_step()`은 DIR을 쓰자마자 STEP을 올렸으므로 위 코드에 1 µs 대기를 넣었습니다.

> ⚠️ EN을 운영 중 toggle

nENBL을 high로 올리면 datasheet대로 "disable device outputs and indexer operation"이므로 코일 전류가 끊깁니다. 위치를 붙잡아 둬야 하는 동안에는 low로 유지합니다.

## 정리

- Stepper는 **STEP pulse 카운트로 명령 위치**를 정합니다. 실제 step angle과 load에 따라 오차·step loss를 검증합니다.
- DRV8825는 **STEP/DIR/nENBL + MODE0~2**이고, STEP high/low 1.9 µs, DIR setup 650 ns를 지킵니다.
- **가속 ramp**는 가속·감속 모두 v² = v₀² + 2ad로 계산하고, 속도를 정수로 자르지 않습니다.
- **Micro-step**은 MODE 핀으로 1/2 ~ 1/32를 고르고, full step은 71 % 전류로 구동됩니다.
- **전류 한계**는 ICHOP = VREF / (5 × RISENSE)입니다.

다음 편은 **서보 모터**입니다. 50 Hz PWM과 1-2 ms duty로 각도 제어를 다룹니다.

## 관련 항목

- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- [5-02: DC 모터 제어](/blog/embedded/modern-recipes/part5-02-dc-motor)
- [5-04: 서보 모터](/blog/embedded/modern-recipes/part5-04-servo-motor)

