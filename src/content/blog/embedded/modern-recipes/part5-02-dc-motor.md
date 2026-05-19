---
title: "5-02: DC 모터 제어"
date: 2026-05-14T02:00:00
description: "H-bridge·PWM·방향·역기전력 보호."
series: "Modern Embedded Recipes"
seriesOrder: 50
tags: [recipes, peripheral, motor]
draft: false
---

## 한 줄 요약

> **"DC 모터는 H-bridge + PWM duty + flyback diode가 전부입니다."** Duty가 속도, 방향은 IN1/IN2 swap.

## 어떤 상황에서 쓰나

소형 로봇 wheel, fan, pump, conveyor, RC car — 모두 DC motor에 H-bridge driver IC를 붙입니다. STM32에서 직접 motor를 *돌리지는 않습니다*. 전류가 수백 mA에서 수 A까지 흐르고 *역기전력 spike*가 발생하므로 *driver IC가 격리*합니다.

이 글은 흔히 쓰는 H-bridge driver (L293D, L298, DRV8833, TB6612)와 STM32 PWM 연결, 방향·속도 제어, 그리고 current sensing 패턴까지 다룹니다.

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

| IC | 채널 | 전류 (각) | 전압 | 인터페이스 |
|----|------|---------|------|-----------|
| L293D | 2 | 600 mA | 4.5-36 V | IN1, IN2, EN |
| L298 | 2 | 2 A | 5-46 V | IN1, IN2, EN |
| TB6612FNG | 2 | 1.2 A (peak 3A) | 4.5-13.5 V | IN1, IN2, PWM, STBY |
| DRV8833 | 2 | 1.5 A | 2.7-10.8 V | IN1, IN2 (no EN — PWM 둘 중 하나로) |
| DRV8871 | 1 | 3.6 A | 6.5-45 V | IN1, IN2 |

DRV8833·DRV8871은 *PWM을 IN1 또는 IN2 한쪽에 직접* 입력합니다.

### Control 방식 두 가지

**Sign-magnitude (DIR + PWM)**:

```text
DIR=0, PWM=duty: IN1=PWM,   IN2=0     → forward, speed=duty
DIR=1, PWM=duty: IN1=0,     IN2=PWM   → reverse
```

**Locked anti-phase (PWM only)**:

```text
PWM=50%:  정지 (양방향 동일 시간)
PWM=75%:  forward 25%
PWM=25%:  reverse 25%
```

Sign-magnitude가 효율 좋고 일반적입니다.

### 역기전력 (Back-EMF)

motor coil이 *전류 차단 순간 역방향 voltage spike*를 만듭니다 (V = L · di/dt). MOSFET를 파괴할 수 있어 *flyback diode*나 *driver IC 내부 protection*이 필요합니다. driver IC 대부분이 내장하지만, *discrete MOSFET H-bridge*를 만들면 Schottky diode를 외부에 추가.

## 코드 예제

### 1. DRV8833 — sign-magnitude

DRV8833은 한 채널이 IN1·IN2 두 핀. 한 핀에 PWM, 다른 핀은 GPIO direction.

```c
// AIN1 = PA0 (PWM TIM2_CH1, AF1), AIN2 = PA1 (GPIO)
void motor_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;

    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_AF, .af=1});
    gpio_init(GPIOA, 1, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});

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
        GPIOA->BSRR = (1u << 1);          // AIN2 = 1
        // 음수 speed: AIN1 PWM의 *off 시간*이 forward duty
        TIM2->CCR1 = (TIM2->ARR + 1) - ((uint32_t)(-speed) * (TIM2->ARR + 1) / 1000);
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

### 2. TB6612FNG — separate PWM input

```c
// AIN1, AIN2 = GPIO direction, PWMA = TIM PWM, STBY = GPIO enable
void motor_set_tb(int16_t speed) {
    if (speed > 0) {
        GPIOA->BSRR = (1u << 0);    // AIN1=1
        GPIOA->BSRR = (1u << 17);   // AIN2=0
        TIM2->CCR1 = (uint32_t)speed * 4200 / 1000;
    } else if (speed < 0) {
        GPIOA->BSRR = (1u << 16);   // AIN1=0
        GPIOA->BSRR = (1u << 1);    // AIN2=1
        TIM2->CCR1 = (uint32_t)(-speed) * 4200 / 1000;
    } else {
        // brake
        GPIOA->BSRR = (1u << 0) | (1u << 1);
        TIM2->CCR1 = 0;
    }
}
```

### 3. Soft-start / ramp

motor를 *급가속*하면 큰 inrush current가 흐르고 power supply가 droop합니다. ramp로 부드럽게.

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

shunt resistor (0.1 Ω 등) + op-amp + ADC. 또는 driver IC 내장 sense (DRV8871 IPROPI 핀).

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

스코프로 motor 양단 voltage를 봅니다.

```text
50% duty @ 20 kHz, 12V supply:
   12V ┐__┌──┐__┌──┐__┌──
        │  │  │  │  │  │
    0V ─┘  └──┘  └──┘  └──
       ← 25 µs duty ←→ 25 µs off ←

평균 전압 ≈ 6V (motor가 절반 속도로 회전)
```

current sensing이 있으면 ADC로 transient를 봅니다.

```text
Startup inrush:
  Steady state running: ~300 mA
  At startup:           ~2500 mA spike (0.1 sec)
  → soft-start로 ~800 mA로 제한 권장
```

## 자주 보는 함정

> ⚠️ Direction 핀과 PWM 동시 변경 timing

direction 핀 toggle하고 *바로 PWM duty* 올리면 H-bridge 내부에서 shoot-through 위험. driver IC의 *dead-time*이 있다면 안전하지만, *수십 µs는 띄우는 것이 안전*.

> ⚠️ Driver IC supply 분리 안 함

driver의 *logic supply*와 *motor supply*를 같은 source에 두면 motor inrush로 logic이 reset됩니다. 분리하고 큰 capacitor (1000 µF 이상).

> ⚠️ Flyback diode 누락 (discrete H-bridge)

driver IC 안 쓰고 직접 MOSFET로 만들 때 *Schottky diode 4개 필수*. 없으면 motor 끄는 순간 MOSFET 파괴.

> ⚠️ PWM 주파수 1 kHz 이하

가청 영역에서 *motor가 소리를 냅니다*. 20-30 kHz로 올림.

> ⚠️ Stalled motor가 무한 current 흘림

motor가 *물리적으로 막히면* coil resistance만 남아 *대전류*가 흐릅니다. driver IC 발열 → thermal shutdown 또는 파괴. current sensing으로 detect + auto cut-off.

> ⚠️ EMI

motor brush noise + PWM switching noise가 *근처 회로에 결합*. shielding, ferrite bead, *motor와 logic supply 분리*가 필수.

## 정리

- DC motor = **H-bridge driver + PWM duty + direction**.
- **Sign-magnitude (DIR + PWM)** 방식이 표준 — 효율 좋고 명확.
- **DRV8833·TB6612·L298** 등 driver IC가 flyback·dead-time·thermal protection 제공.
- **Soft-start**로 inrush current 제한, **current sensing**으로 over-current protect.
- **PWM 20 kHz+**, **motor supply 분리**, **logic decoupling**.

다음 편은 **스테퍼 모터**입니다. step 시퀀스, micro-stepping, acceleration ramp를 다룹니다.

## 관련 항목

- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- [5-03: 스테퍼 모터](/blog/embedded/modern-recipes/part5-03-stepper-motor)
- [5-04: 서보 모터](/blog/embedded/modern-recipes/part5-04-servo-motor)
