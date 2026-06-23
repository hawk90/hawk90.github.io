---
title: "PWM 신호 생성 분석 — Duty·Frequency·Dead Time·Center-Aligned"
date: 2026-04-10T09:09:00
description: "Duty·frequency·dead-time·center-aligned·complementary 출력."
series: "Modern Embedded Recipes"
seriesOrder: 9
tags: [recipes, pwm, hw-basics]
draft: false
---

## 한 줄 요약

> **"PWM은 디지털 펄스 폭으로 아날로그 평균 전압을 흉내냅니다."** DAC 없이도 LED 디밍, 모터 속도, DC-DC 변환을 모두 할 수 있습니다.

## 어떤 상황에서 쓰나

- LED 밝기 조정, RGB 컬러 제어
- DC 모터 속도, 서보 motor 위치 제어
- BLDC, SR motor의 inverter 구동
- DC-DC converter, class-D amplifier
- Heater, peltier 같은 thermal 제어

## 핵심 개념

### 1) Duty와 평균 전압

PWM은 고정 주파수의 사각파인데, on/off 비율(duty)로 평균을 만듭니다.

![PWM duty 50% vs 75% — duty 비율이 평균 전압](/images/blog/modern-recipes/diagrams/part1-09-pwm-duty.svg)

부하가 inductive(모터 코일 등)이면 자체 적분 효과로 평균 전압이 흐릅니다. resistive 부하는 RC 필터를 후단에 답니다.

### 2) Edge-aligned vs Center-aligned

타이머가 counter를 0 ~ ARR로 올리는 동안 비교 값 CCR보다 작으면 0, 크면 1을 출력합니다.

![Edge-aligned vs Center-aligned PWM — counter ramp 차이](/images/blog/modern-recipes/diagrams/part1-09-pwm-alignment.svg)

Edge-aligned는 LED나 일반 부하에 쓰입니다. Center-aligned는 모터의 ripple 전류와 harmonic을 줄여 줍니다.

### 3) Dead-time — Complementary 출력

H-bridge나 inverter에서 high-side와 low-side switch가 동시에 ON이면 short(shoot-through)가 발생합니다. dead-time은 한 쪽이 OFF된 후 다른 쪽이 ON까지 일부러 두는 간격입니다.

![Complementary PWM with dead-time — shoot-through 방지](/images/blog/modern-recipes/diagrams/part1-09-pwm-deadtime.svg)

dead-time이 짧으면 short, 길면 전류 distortion이 발생합니다. 보통 100 ns ~ 1 µs로 설정합니다.

### 4) PWM frequency 선택

| 응용 | 권장 주파수 | 이유 |
| --- | --- | --- |
| LED 디밍 | 200 Hz ~ 2 kHz | 깜빡임 방지(>100 Hz), 효율 |
| DC motor | 20 kHz | 가청 노이즈 회피 |
| BLDC | 16 ~ 40 kHz | 가청 회피 + iron loss |
| Switching converter | 100 kHz ~ 1 MHz | 인덕터 크기 |
| Class-D audio | 384 kHz 이상 | THD 감소 |

## 코드 / 실제 사용 예

STM32F4 TIM1로 1 kHz PWM 출력입니다.

```c
// TIM1 channel 1 — PA8, 1 kHz, duty 50%
RCC->APB2ENR |= RCC_APB2ENR_TIM1EN;

// 84 MHz / 84 = 1 MHz tick
TIM1->PSC = 83;
// 1 MHz / 1000 = 1 kHz
TIM1->ARR = 999;
// 50% duty
TIM1->CCR1 = 500;

// PWM mode 1 (high until match)
TIM1->CCMR1 = (0b110 << TIM_CCMR1_OC1M_Pos)
            | TIM_CCMR1_OC1PE;
TIM1->CCER  = TIM_CCER_CC1E;
TIM1->BDTR |= TIM_BDTR_MOE;
TIM1->CR1   = TIM_CR1_ARPE | TIM_CR1_CEN;
```

Complementary 출력 + dead-time:

```c
// PA8 (CH1), PA7 (CH1N) — complementary
TIM1->CCER |= TIM_CCER_CC1NE;             // CH1N enable

// Dead-time = 12 × 1/84MHz = 143 ns (대략)
TIM1->BDTR = TIM_BDTR_MOE
           | (12 << TIM_BDTR_DTG_Pos);
```

DMA로 dynamic waveform 생성도 가능합니다.

```c
static uint16_t pwm_table[256];   // 256 단계 sine 또는 envelope

TIM1->DIER |= TIM_DIER_UDE;
DMA2_Stream5->PAR  = (uint32_t)&TIM1->CCR1;
DMA2_Stream5->M0AR = (uint32_t)pwm_table;
DMA2_Stream5->NDTR = 256;
DMA2_Stream5->CR   = DMA_SxCR_CIRC | DMA_SxCR_MINC
                   | DMA_SxCR_MSIZE_0 | DMA_SxCR_PSIZE_0
                   | DMA_SxCR_DIR_0 | DMA_SxCR_EN;
```

## 측정 / 비교

| Duty 해상도 (12-bit) | CCR 단위 | 1 kHz 기준 분해능 |
| --- | --- | --- |
| 8-bit | 1 / 256 | 3.9 µs |
| 10-bit | 1 / 1024 | 977 ns |
| 12-bit | 1 / 4096 | 244 ns |
| 16-bit | 1 / 65536 | 15 ns |

높은 PWM 주파수 + 높은 해상도는 timer clock이 충분해야 합니다.

| Timer clock | 100 kHz × 12-bit | 100 kHz × 16-bit |
| --- | --- | --- |
| 84 MHz | 가능 (210 MHz 필요) | 불가 (계산 < 7 MHz) |
| 200 MHz | 가능 | 가능 |

## 자주 보는 함정

> ⚠️ Dead-time 없이 complementary

H-bridge에서 dead-time 없으면 한 switch가 끄기 전에 다른 쪽이 켜집니다. 큰 전류가 흐르고 MOSFET이 죽습니다.

> ⚠️ ARR=0 또는 CCR > ARR

duty가 0% 또는 100%로 fixed 됩니다. 0%/100% 처리는 timer 설정 자체로 강제하지 말고 코드 분기로 처리합니다.

> ⚠️ Update preload 미사용

CCR 업데이트가 cycle 중간에 반영되면 한 cycle만 잘못된 duty가 나옵니다. `OCxPE`(preload enable)와 `ARPE`로 update event에서만 적용되게 합니다.

> ⚠️ LED를 너무 낮은 주파수로

100 Hz 미만은 사람 눈에 깜빡임이 보입니다. 카메라로 찍으면 더 잘 보입니다. 200 Hz 이상으로 올리거나 BCM(binary code modulation) 사용.

> ⚠️ Audio range 모터 PWM

8 kHz 같은 가청 주파수는 모터가 휘파람 소리를 냅니다. 20 kHz 이상으로 설정합니다.

## 정리

- PWM은 디지털로 평균 전압을 만드는 가장 효율적인 방법입니다.
- Edge-aligned는 일반용, Center-aligned는 모터·BLDC 같은 ripple 민감 응용에 씁니다.
- Dead-time은 H-bridge의 shoot-through를 막습니다. 100 ns ~ 1 µs가 일반적입니다.
- 주파수 선택은 가청, 효율, 인덕터 크기를 고려합니다.
- Preload(`OCxPE`, `ARPE`)로 cycle 중간 변경 시 race를 방지합니다.

다음 편에서는 **CAN 버스 전기적 특성**을 다룹니다. 차동 신호 통신의 대표 예입니다.

## 관련 항목

- [1-08: DAC 동작 원리](/blog/embedded/modern-recipes/part1-08-dac-principles)
- [1-10: CAN 버스 전기적 특성](/blog/embedded/modern-recipes/part1-10-can-electrical)
- 더 깊이 — [Practical RTOS Internals: Timer subsystem](/blog/embedded/rtos/practical-internals/00-preface)
