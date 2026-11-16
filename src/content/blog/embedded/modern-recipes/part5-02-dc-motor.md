---
title: "DC 모터 제어 — H-Bridge·PWM Duty·Encoder Feedback"
slug: "embedded/modern-recipes/part5-02-dc-motor"
date: 2026-04-14T09:50:00
description: "H-bridge·PWM·방향·역기전력 보호."
series: "Modern Embedded Recipes"
seriesOrder: 50
tags: [recipes, peripheral, motor]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DC 모터 구동은 H-bridge driver의 진리표를 PWM으로 오가는 일입니다."** 어느 두 상태 사이를 PWM하는지가 방향과 속도를 정합니다.

## 어떤 상황에서 쓰나

작은 로봇 바퀴나 fan, pump의 DC motor는 STM32 GPIO가 직접 구동하지 않고 H-bridge driver IC를 거칩니다. driver가 motor 전류를 스위칭하고, 과전류·과열 보호를 맡습니다.

이 글은 driver IC 네 개(L293D, TB6612FNG, DRV8833, DRV8871)의 datasheet 값을 비교하고, DRV8833과 TB6612FNG에 STM32F407의 TIM2 PWM을 연결하는 코드를 씁니다. 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall` 경고 없이 빌드되는 것을 확인했고, DRV8833 진리표에 코드의 핀 상태를 대입하는 host 시뮬레이션을 돌렸습니다. 모터와 보드로 한 측정은 없습니다.

## 핵심 개념

### H-bridge 토폴로지

H-bridge는 4개 스위치 (Q1·Q3 high-side, Q2·Q4 low-side)와 모터로 구성됩니다. VBAT — Q1·Q3 — Motor — Q2·Q4 — GND.

| 동작 | ON 스위치 | 결과 |
| --- | --- | --- |
| 방향 1 (forward) | Q1, Q4 | 좌 → 우 전류 |
| 방향 2 (reverse) | Q3, Q2 | 우 → 좌 전류 |
| Brake | Q1+Q3 (또는 Q2+Q4) | 모터 단락 — 빠른 정지 |
| Coast | 모두 off | 자유 회전 |
| Shoot-through (금지) | Q1+Q2 또는 Q3+Q4 | 전원 short, IC 파손 |

대각선 두 스위치가 켜지면 한 방향, 반대 대각선이면 반대 방향. Q1+Q2 또는 Q3+Q4 동시 ON은 *shoot-through* (short-circuit) — 절대 금지.

### Driver IC 비교

각 칸은 해당 datasheet의 표지 사양입니다(L293D: TI SLRS008D, TB6612FNG: Toshiba datasheet, DRV8833: TI SLVSAR1E, DRV8871: TI SLVSCY9B).

| IC | H-bridge | 출력 전류 | motor 전원 | 입력 |
|----|------|---------|------|-----------|
| L293D | 2 (half-H 4개) | 600 mA/ch, peak 1.2 A | 4.5 ~ 36 V | 1A·2A, 1,2EN 등 |
| TB6612FNG | 2 | 1.2 A(ave) / 3.2 A(peak) per ch | VM 4.5 ~ 13.5 V (operating range), abs max 15 V | IN1, IN2, PWM, STBY |
| DRV8833 | 2 | 1.5 A RMS, 2 A peak per bridge (PWP, VM = 5 V, 25 °C) | 2.7 ~ 10.8 V | xIN1, xIN2 |
| DRV8871 | 1 | 3.6 A peak | 6.5 ~ 45 V | IN1, IN2 (+ ILIM 저항) |

DRV8833과 DRV8871은 별도 PWM 핀이 없어, 두 입력 중 하나에 PWM을 넣습니다. L293D는 datasheet가 "Output Clamp Diodes for Inductive Transient Suppression (L293D)"라고 적듯 clamp diode를 내장합니다.

### Control 방식 두 가지

PWM으로 속도를 바꾸는 방법은 두 가지입니다.

- **Sign-magnitude (DIR + PWM)**: 한 입력은 방향을 정하는 고정 level로 두고, 다른 입력에 PWM을 넣습니다. duty가 속도입니다.
- **Locked anti-phase**: 두 입력에 서로 반대인 PWM을 넣어, duty 50 %에서 정방향·역방향 시간이 같아 평균 0이 되고, 50 %보다 크면 한쪽, 작으면 반대쪽으로 돕니다.

이 글은 sign-magnitude를 씁니다.

### 역기전력 (Back-EMF)

DRV8833 datasheet 7.3.2절은 "when the drive current is interrupted, the inductive nature of the motor requires that the current must continue to flow"라고 하고, 이 recirculation current를 처리하는 두 상태를 둡니다. fast decay는 H-bridge를 끄고 body diode로 전류를 흘리며, slow decay는 "the motor winding is shorted" 상태입니다. driver IC 없이 MOSFET으로 H-bridge를 만들면 이 전류 경로를 회로에서 직접 마련해야 합니다.

## 코드 예제

### 1. DRV8833 — sign-magnitude

DRV8833 datasheet의 Table 1(H-Bridge Logic)은 xIN1/xIN2가 0/0이면 coast, 0/1이면 reverse, 1/0이면 forward, 1/1이면 brake입니다. Table 2는 PWM 방식을 정리합니다. xIN1 = PWM, xIN2 = 0이면 "Forward PWM, fast decay", xIN1 = PWM, xIN2 = 1이면 "Reverse PWM, slow decay"입니다. 아래 코드는 AIN1에 PWM, AIN2를 GPIO level로 두어 정방향은 fast decay(PWM/0), 역방향은 slow decay(PWM/1)로 구동합니다.

```c
// AIN1 = PA0 (PWM TIM2_CH1, AF1), AIN2 = PA1 (GPIO), nSLEEP = PA4 (GPIO)
void motor_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=1});
    gpio_init(GPIOA, 1, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    gpio_init(GPIOA, 4, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    GPIOA->BSRR = (1u << 4);       // nSLEEP = 1 (internal pulldown keeps the chip asleep)

    // 20 kHz PWM
    TIM2->PSC = 0;
    TIM2->ARR = 4200 - 1;          // 84 MHz / 4200 = 20 kHz
    TIM2->CCMR1 = (6u << 4) | TIM_CCMR1_OC1PE;
    TIM2->CCER  = TIM_CCER_CC1E;
    TIM2->CCR1  = 0;
    TIM2->CR1   = TIM_CR1_ARPE | TIM_CR1_CEN;
    TIM2->EGR   = TIM_EGR_UG;
}

void motor_set(int16_t speed) {
    // speed = -1000 ~ +1000
    if (speed >= 0) {
        GPIOA->BSRR = (1u << (1 + 16));   // AIN2 = 0
        TIM2->CCR1 = (uint32_t)speed * (TIM2->ARR + 1) / 1000;
    } else {
        GPIOA->BSRR = (1u << 1);          // AIN2 = 1: AIN1 low = reverse, AIN1 high = brake
        // reverse time is the LOW part of the PWM, so invert the duty
        TIM2->CCR1 = (uint32_t)(1000 + speed) * (TIM2->ARR + 1) / 1000;
    }
}

void motor_brake(void) {
    GPIOA->BSRR = (1u << 1);              // AIN2 = 1
    TIM2->CCR1 = TIM2->ARR + 1;           // AIN1 = always 1 → short
}

void motor_coast(void) {
    GPIOA->BSRR = (1u << (1 + 16));       // AIN2 = 0
    TIM2->CCR1 = 0;                        // AIN1 = 0 → high-Z
}
```

역방향의 duty를 뒤집는 이유는 Table 1에서 나옵니다. AIN2 = 1인 동안 AIN1이 high면 1/1 = brake, low면 0/1 = reverse이므로, 역방향으로 구동되는 시간은 PWM의 **low** 구간입니다. 이 글의 처음 판은 역방향에서도 `CCR1 = |speed| × (ARR+1) / 1000`을 써서, speed가 −1000이면 AIN1이 늘 high인 brake가 됐습니다. 코드의 핀 상태를 Table 1에 대입해 확인했습니다.

```c
/* drv8833_sim.c */
/* Apply DRV8833 Table 1 (H-bridge logic) to the two pin states motor_set() produces
   and report how much of one PWM period is forward / reverse / brake / coast. */
#include <stdio.h>
#include <stdint.h>

static const char *state(int in1, int in2) {
    if (!in1 && !in2) return "coast";
    if (!in1 &&  in2) return "reverse";
    if ( in1 && !in2) return "forward";
    return "brake";
}

/* returns IN1 duty (0..ARR+1) and IN2 level, like the post's motor_set() */
static void post_motor_set(int16_t speed, uint32_t arr1, uint32_t *ccr, int *in2) {
    if (speed >= 0) { *in2 = 0; *ccr = (uint32_t)speed * arr1 / 1000; }
    else            { *in2 = 1; *ccr = (uint32_t)(-speed) * arr1 / 1000; }
}
static void fixed_motor_set(int16_t speed, uint32_t arr1, uint32_t *ccr, int *in2) {
    if (speed >= 0) { *in2 = 0; *ccr = (uint32_t)speed * arr1 / 1000; }
    else            { *in2 = 1; *ccr = (uint32_t)(1000 + speed) * arr1 / 1000; }  /* reverse while IN1 low */
}

static void report(const char *name, void (*f)(int16_t, uint32_t, uint32_t *, int *)) {
    const uint32_t arr1 = 4200;
    int16_t speeds[] = { 1000, 500, 0, -250, -750, -1000 };
    printf("%s\n", name);
    for (unsigned k = 0; k < sizeof speeds / sizeof speeds[0]; k++) {
        uint32_t ccr; int in2;
        f(speeds[k], arr1, &ccr, &in2);
        double hi = 100.0 * ccr / arr1;          /* IN1 high for CNT < CCR */
        printf("  speed %+5d: %5.1f %% %-7s + %5.1f %% %s\n", speeds[k],
               hi, state(1, in2), 100.0 - hi, state(0, in2));
    }
}

int main(void) {
    report("post motor_set():", post_motor_set);
    report("fixed motor_set():", fixed_motor_set);
    return 0;
}
```

```bash
clang -O2 -Wall -o drv8833_sim drv8833_sim.c && ./drv8833_sim
```

```text
post motor_set():
  speed +1000: 100.0 % forward +   0.0 % coast
  speed  +500:  50.0 % forward +  50.0 % coast
  speed    +0:   0.0 % forward + 100.0 % coast
  speed  -250:  25.0 % brake   +  75.0 % reverse
  speed  -750:  75.0 % brake   +  25.0 % reverse
  speed -1000: 100.0 % brake   +   0.0 % reverse
fixed motor_set():
  speed +1000: 100.0 % forward +   0.0 % coast
  speed  +500:  50.0 % forward +  50.0 % coast
  speed    +0:   0.0 % forward + 100.0 % coast
  speed  -250:  75.0 % brake   +  25.0 % reverse
  speed  -750:  25.0 % brake   +  75.0 % reverse
  speed -1000:   0.0 % brake   + 100.0 % reverse
```

처음 판(post)은 −750에서 역방향이 25 %뿐이고 −1000에서는 0 %(완전 brake)였습니다. 고친 판은 |speed|에 비례합니다.

### 2. TB6612FNG — separate PWM input

```c
// PWMA = PA0 (TIM2_CH1, motor_init()), AIN1 = PA1, AIN2 = PA4, STBY = PA5 (GPIO outputs)
void motor_set_tb(int16_t speed) {
    GPIOA->BSRR = (1u << 5);                       // STBY = H (L = standby)
    if (speed > 0) {
        GPIOA->BSRR = (1u << 1) | (1u << (4 + 16)); // AIN1=1, AIN2=0: CW while PWM=H
        TIM2->CCR1 = (uint32_t)speed * 4200 / 1000;
    } else if (speed < 0) {
        GPIOA->BSRR = (1u << (1 + 16)) | (1u << 4); // AIN1=0, AIN2=1: CCW while PWM=H
        TIM2->CCR1 = (uint32_t)(-speed) * 4200 / 1000;
    } else {
        GPIOA->BSRR = (1u << 1) | (1u << 4);        // AIN1=AIN2=1: short brake
        TIM2->CCR1 = 0;
    }
}
```

TB6612FNG datasheet의 진리표에서 IN1/IN2 = H/L이면 PWM = H일 때 CW, L일 때 short brake이고, IN1 = IN2 = H면 PWM과 관계없이 short brake, STBY = L이면 standby입니다. 그래서 이 driver는 sign-magnitude에서도 duty를 뒤집을 필요가 없습니다. datasheet는 모드 전환 때 "To prevent penetrating current, dead time t2 and t4 is provided"라고 내부 dead time도 적습니다.

### 3. Soft-start / ramp

목표 속도로 바로 바꾸지 않고 10 ms마다 `RAMP_STEP`만큼 다가가게 하면, 0에서 1000까지 100 tick, 즉 1 s에 걸쳐 duty가 오릅니다. 기동 전류가 전원에 주는 영향은 보드에서 current probe로 재서 `RAMP_STEP`을 정합니다.

```c
static int16_t current_speed;
static int16_t target_speed;
#define RAMP_STEP 10   // per 10 ms

void motor_set_target(int16_t s) { target_speed = s; }

// 10 ms 주기 호출
void motor_ramp_tick(void) {
    if (current_speed < target_speed) {
        current_speed += RAMP_STEP;
        if (current_speed > target_speed) current_speed = target_speed;
    } else if (current_speed > target_speed) {
        current_speed -= RAMP_STEP;
        if (current_speed < target_speed) current_speed = target_speed;
    }
    motor_set(current_speed);
}
```

### 4. Current sensing

shunt 저항에 걸리는 전압을 증폭해 ADC로 읽습니다. 아래는 0.1 Ω과 ×10 증폭으로 1 V/A가 되는 회로를 가정합니다. ADC 초기화(clock, `ADON`, 채널 sampling time)는 생략했습니다. DRV8871은 전류를 읽어 내는 핀 대신 ILIM 핀에 저항을 달아 "current chopping threshold"를 정하는 방식이라, 이런 sense 회로 없이도 driver가 전류를 제한합니다.

```c
// PA2 = ADC1_IN2, shunt 0.1Ω → amp ×10 → 1V/A
uint16_t motor_current_ma(void) {
    ADC1->SQR3 = 2;                  // channel 2
    ADC1->CR2 |= ADC_CR2_SWSTART;
    while (!(ADC1->SR & ADC_SR_EOC));
    uint16_t adc = ADC1->DR;          // 0~4095
    // V = adc / 4095 * 3.3
    // I = V (since 1V/A)
    return adc * 3300u / 4095u;       // mA
}

// 보호: over-current cut-off
void motor_protect_task(void) {
    if (motor_current_ma() > 2000) {
        motor_coast();
        printf("Over-current trip!\n");
    }
}
```

## 측정 / 동작 확인

아래 그림은 측정이 아니라, 50 % duty에서 motor 양단 전압을 이상적으로 그린 것입니다. 평균이 VM × duty가 되는 것은 off 구간에 양단이 0 V인 slow decay의 경우이고, fast decay(위 정방향 코드)의 off 구간에는 전류가 body diode로 흘러 양단 전압이 0 V가 아닙니다(DRV8833 7.3.2절).

![이상적 H-bridge 출력, 50% duty @ 20 kHz — 평균 VM/2](/images/blog/modern-recipes/diagrams/part5-02-hbridge-pwm.svg)

current sensing이 있으면 ADC로 transient를 봅니다.

이 글은 보드에서 파형을 재지 않았습니다. 기동 전류는 current probe로 재서 soft-start와 current limit을 정합니다.

## 자주 보는 함정

> ⚠️ Direction 핀과 PWM 동시 변경 timing

DRV8833 datasheet는 tDEAD 450 ns(VM = 5 V)를, TB6612FNG는 내부 dead time을 적습니다. 위 코드는 이 내부 dead time에 기대고, 방향과 duty를 같은 함수 안에서 바꿉니다.

> ⚠️ Flyback diode 누락 (discrete H-bridge)

driver IC 없이 MOSFET으로 만들 때는 위 recirculation current의 경로(body diode, 외부 diode 등)를 회로에서 직접 정합니다. L293D처럼 clamp diode를 내장한 driver는 datasheet에 그 사실을 적습니다.

> ⚠️ PWM 주파수가 너무 낮음

위 코드는 20 kHz(84 MHz / 4200)를 씁니다. 주파수를 바꾸면 ARR, 즉 duty resolution도 함께 바뀝니다([5-01](/blog/embedded/modern-recipes/part5-01-pwm-output)).

> ⚠️ Stalled motor가 무한 current 흘림

motor가 물리적으로 막히면 회전에 따른 역기전력이 없어 전류가 커집니다. stall 전류가 IOCP를 넘으면 DRV8833의 OCP가 동작합니다. datasheet의 IOCP는 최소 2 A, typ 3.3 A이고, "all FETs in the H-bridge will be disabled and the nFAULT pin will be driven low"였다가 tOCP(1.35 ms) 뒤 다시 켜집니다. 위 `motor_protect_task()`는 OCP와 별개로 소프트웨어에서 끊는 장치입니다.

## 정리

- DC motor = **H-bridge driver + PWM duty + direction**.
- **Sign-magnitude**에서 짝이 되는 입력이 high(slow decay)면 duty의 의미가 뒤집힙니다(DRV8833).
- DRV8833은 OCP, TB6612FNG는 내부 dead time, L293D는 clamp diode를 datasheet에 적습니다.
- **Soft-start**로 inrush current 제한, **current sensing**으로 over-current protect.
- 위 코드는 **PWM 20 kHz**(TIM2, ARR 4199)입니다.

다음 편은 **스테퍼 모터**입니다. step 시퀀스, micro-stepping, acceleration ramp를 다룹니다.

## 관련 항목

- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- [5-03: 스테퍼 모터](/blog/embedded/modern-recipes/part5-03-stepper-motor)
- [5-04: 서보 모터](/blog/embedded/modern-recipes/part5-04-servo-motor)
