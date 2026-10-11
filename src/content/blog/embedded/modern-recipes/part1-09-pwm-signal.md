---
title: "PWM 신호 생성 분석 — Duty·Frequency·Dead Time·Center-Aligned"
slug: "embedded/modern-recipes/part1-09-pwm-signal"
date: 2026-04-10T09:09:00
description: "STM32F407 TIM1(168 MHz)을 기준으로 PWM 주파수와 duty 단계, edge·center-aligned의 주기 차이, dead-time이 양 끝 duty를 깎는 양을 RM0090으로 계산합니다."
series: "Modern Embedded Recipes"
seriesOrder: 9
tags: [recipes, pwm, hw-basics]
draft: false
topics: ["embedded"]
---

타이머 하나로 PWM을 만들 때 정해야 하는 값은 주파수, duty 단계 수, 정렬 방식, dead-time입니다. 넷 모두 같은 counter clock을 나눠 쓰므로 하나를 정하면 나머지의 범위가 줄어듭니다. 이 글은 STM32F407의 advanced-control timer TIM1을 기준으로, [RM0090 Rev 22](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf)(이하 RM0090)의 정의로 그 범위를 계산합니다. 레지스터 설정 코드는 [5-01: PWM 출력 실전](/blog/embedded/modern-recipes/part5-01-pwm-output)에 있고, 이 글은 그 코드에 넣을 숫자를 정하는 쪽을 다룹니다.

## 기준 타이머 — TIM1 counter clock 168 MHz

RM0090 §7.2(216쪽)에 따르면 STM32F405/407의 AHB 최대 주파수는 168 MHz, APB2 최대 주파수는 84 MHz이고, APB prescaler가 1이 아니면 그 버스에 붙은 타이머의 clock은 APB 주파수의 두 배입니다. TIM1은 APB2에 붙어 있으므로(§7.3.14 `RCC_APB2ENR`의 `TIM1EN`, 249쪽) HCLK 168 MHz, APB2 prescaler 2로 두면 TIM1 clock은 84 MHz × 2 = 168 MHz입니다. TIM1의 counter와 prescaler는 16-bit입니다(§17.2, 515쪽). 아래 계산은 모두 prescaler를 1로 둔(PSC = 0) 168 MHz를 쓰고, 한 tick은 1/168 MHz ≈ 5.95 ns입니다.

## Duty와 평균 전압

PWM은 고정 주기의 사각파이고, 한 주기 중 high 구간의 비율이 duty입니다. 출력이 0과 `V_H` 사이를 오가면 한 주기 평균은 duty × `V_H`입니다. 타이머가 정하는 것은 이 duty를 몇 단계로 나눌 수 있는가이고, 아래 절들이 그 단계 수를 계산합니다.

![PWM duty 50% vs 75% — duty 비율이 평균 전압](/images/blog/modern-recipes/diagrams/part1-09-pwm-duty.svg)

## Edge-aligned와 center-aligned — 주기와 duty 단계

두 정렬 방식은 counter가 세는 모양이 달라서, 같은 ARR이라도 주기와 duty 단계가 다릅니다. RM0090 §17.3.2(519·525쪽)의 정의는 다음과 같습니다.

- **Edge-aligned(upcounting)**: counter가 0부터 ARR까지 센 뒤 0으로 돌아갑니다. 한 주기는 ARR + 1 tick입니다.
- **Center-aligned**: counter가 0부터 ARR − 1까지 올라가 overflow를 내고, ARR부터 1까지 내려가 underflow를 낸 뒤 0부터 다시 셉니다. 한 주기는 2 × ARR tick입니다.

PWM mode 1에서 기준 신호 OCxREF는 upcounting 중에는 CNT < CCR인 동안 high이고, downcounting 중에는 CNT > CCR인 동안 low입니다. PWM mode 2는 그 반대입니다(§17.4.7 `OC1M`, 570쪽). 이 정의로 PWM mode 1의 high 구간을 세면 다음과 같습니다.

| 정렬 | 한 주기 | duty | CCR 범위 (단계 수, 단계당 폭) |
| --- | ---: | ---: | --- |
| Edge-aligned | ARR + 1 tick | CCR / (ARR + 1) | 0 ~ ARR + 1 (ARR + 2단계, 1 tick) |
| Center-aligned | 2 × ARR tick | CCR / ARR | 0 ~ ARR (ARR + 1단계, 2 tick) |

CCR이 ARR보다 크면 OCxREF는 1에 고정되고 CCR = 0이면 0에 고정되므로(§17.3.10, 540–542쪽) 0%와 100%가 모두 단계에 들어갑니다.

![Edge-aligned와 center-aligned의 PWM mode 1 — counter 모양, CCR 비교, OCxREF](/images/blog/modern-recipes/diagrams/part1-09-pwm-alignment.svg)

정렬만 바꾸고 ARR을 그대로 두면 주기가 ARR + 1 tick에서 2 × ARR tick으로 바뀌어 주파수가 (ARR + 1) / (2 × ARR)배가 됩니다. 절반에 가깝지만 정확히 절반은 아닙니다. 168 MHz에서 ARR = 4199로 edge-aligned 40 kHz를 만든 뒤 center-aligned로 바꾸면 168 MHz / 8398 ≈ 20.005 kHz입니다. center-aligned로 정확히 20 kHz를 만들려면 2 × ARR = 8400, 즉 ARR = 4200을 씁니다.

## 주파수와 duty 해상도

counter-compare PWM에서는 duty 한 단계가 counter tick 하나(center-aligned는 둘)입니다. 그래서 edge-aligned에서 한 주기를 N tick으로 나누려면 counter clock이 PWM 주파수 × N이어야 하고, counter clock이 168 MHz로 정해져 있으면 N tick으로 낼 수 있는 최고 주파수는 168 MHz / N입니다.

| 해상도 | 한 주기 tick 수 N | 100 kHz에 필요한 counter clock (TIM1 168 MHz) | TIM1의 최고 주파수 |
| --- | ---: | --- | ---: |
| 8-bit | 256 | 25.6 MHz (가능) | 656.25 kHz |
| 10-bit | 1024 | 102.4 MHz (가능) | 164.0625 kHz |
| 12-bit | 4096 | 409.6 MHz (불가, > 168 MHz) | 41.015625 kHz |
| 16-bit | 65536 | 6553.6 MHz (불가, > 168 MHz) | 약 2.563 kHz |

TIM1 168 MHz에서 두 주파수의 ARR은 다음과 같습니다.

| PWM 주파수 | Edge-aligned ARR (한 주기 tick) | Center-aligned ARR (duty 단계 수) |
| ---: | ---: | ---: |
| 20 kHz | 8399 (8400, 약 13.0-bit) | 4200 (4201) |
| 100 kHz | 1679 (1680, 약 10.7-bit) | 840 (841) |

100 kHz에서 12-bit duty가 필요하면 TIM1의 counter-compare PWM으로는 만족하지 못합니다. PWM 주파수를 41.015625 kHz 이하로 낮추거나, 100 kHz를 지키고 해상도를 1680 tick(edge-aligned)으로 줄이는 것 중에서 고릅니다.

## Dead-time — complementary 출력

H-bridge나 inverter의 한 다리에서 high-side와 low-side switch가 동시에 켜지면 전원이 두 switch를 거쳐 GND로 바로 이어집니다(shoot-through). dead-time은 한쪽을 끈 뒤 다른 쪽을 켜기까지 두 출력을 모두 끄는 간격입니다. RM0090 §17.3.11(543쪽)은 이 값을 출력에 연결된 소자의 특성, 즉 level shifter의 지연과 power switch의 지연에 맞춰 정한다고 씁니다.

![Complementary PWM with dead-time — shoot-through 방지](/images/blog/modern-recipes/diagrams/part1-09-pwm-deadtime.svg)

TIM1의 dead-time generator는 OCxREF 하나에서 OCx와 OCxN을 만듭니다(§17.3.11). 두 출력이 active high일 때 OCx는 OCxREF에서 rising edge만 dead-time만큼 늦춘 신호이고, OCxN은 OCxREF를 뒤집은 신호에서 rising edge를 늦춘 신호입니다. 지연이 active 펄스 폭보다 길면 그 펄스는 나오지 않습니다.

### DTG 값과 dead-time

dead-time의 기준 clock `t_DTS`는 `TIMx_CR1.CKD`로 정하고, `CKD = 00`이면 `t_DTS` = `t_CK_INT`입니다(§17.4.1, 560쪽). `TIMx_BDTR.DTG[7:0]`의 인코딩(§17.4.18, 582쪽)을 168 MHz, `CKD = 00`에 적용하면 범위가 다음과 같습니다.

| DTG[7:5] | 식 | tick 수 | 168 MHz에서의 범위 |
| --- | --- | ---: | ---: |
| 0xx | DTG[7:0] × `t_DTS` | 0 ~ 127 | 0 ~ 756.0 ns |
| 10x | (64 + DTG[5:0]) × 2 `t_DTS` | 128 ~ 254 | 761.9 ns ~ 1.512 µs |
| 110 | (32 + DTG[4:0]) × 8 `t_DTS` | 256 ~ 504 | 1.524 ~ 3.000 µs |
| 111 | (32 + DTG[4:0]) × 16 `t_DTS` | 512 ~ 1008 | 3.048 ~ 6.000 µs |

5-01의 complementary 예제가 쓰는 `DTG = 42`는 첫 행에 해당하고, 42 tick × 5.95 ns = 250 ns입니다.

### dead-time이 깎는 duty

center-aligned PWM mode 1에서 OCxREF의 high 폭은 2 × CCR tick입니다. dead-time이 42 tick이면 OCx의 high 폭은 2 × CCR − 42 tick이 되고, 2 × CCR ≤ 42, 즉 CCR ≤ 21이면 OCx 펄스가 나오지 않습니다. OCxN의 high 폭은 2 × (ARR − CCR) − 42 tick이므로 CCR ≥ ARR − 21이면 OCxN 펄스가 나오지 않습니다.

| PWM 주파수 (center ARR) | OCx 펄스가 없는 CCR | OCxN 펄스가 없는 CCR | 양 끝에서 잃는 duty |
| ---: | ---: | ---: | ---: |
| 20 kHz (4200) | 0 ~ 21 | 4179 ~ 4200 | 각각 21/4200 = 0.5% |
| 100 kHz (840) | 0 ~ 21 | 819 ~ 840 | 각각 21/840 = 2.5% |

dead-time은 tick 수로 고정되어 있으므로, PWM 주파수를 다섯 배 올리면 양 끝에서 잃는 duty도 다섯 배가 됩니다. 이 구간의 CCR에서는 한쪽 출력이 꺼진 채로 남으므로, 0%나 100% 근처까지 duty를 연속으로 움직이는 제어에서는 이 구간이 duty 한계입니다.

## 스코프로 확인할 값

위 설정(168 MHz, center-aligned PWM mode 1, ARR = 4200, `DTG = 42`)으로 5-01의 TIM1 코드를 돌렸다면, CH1과 CH1N을 두 채널로 함께 보면서 아래 값과 비교합니다. 모두 RM0090의 정의에서 계산한 예상값입니다.

- 주기: 8400 tick = 50 µs (20 kHz).
- CH1이 내려간 뒤 CH1N이 올라가기까지, CH1N이 내려간 뒤 CH1이 올라가기까지의 간격: 각각 250 ns.
- CCR = 2100일 때 CH1 high 폭: 2 × 2100 − 42 = 4158 tick = 24.75 µs.
- CCR을 21 이하로 내리면 CH1 펄스가, 4179 이상으로 올리면 CH1N 펄스가 사라짐.

## 정리

- 주파수와 duty 단계는 counter clock 하나를 나눠 씁니다. TIM1 168 MHz의 counter-compare PWM으로는 100 kHz·12-bit(409.6 MHz 필요)를 만들지 못합니다.
- 정렬을 center-aligned로 바꾸면 주기가 ARR + 1 tick에서 2 × ARR tick이 되므로 ARR을 다시 계산합니다.
- dead-time은 tick 수로 고정되어 PWM 주파수가 높을수록 양 끝에서 잃는 duty가 커집니다. 250 ns면 center-aligned 100 kHz에서 각각 2.5%입니다.

다음 편에서는 **CAN 버스 전기적 특성**을 다룹니다. 차동 신호 통신의 대표 예입니다.

## 관련 항목

- [1-08: DAC 동작 원리](/blog/embedded/modern-recipes/part1-08-dac-principles)
- [1-10: CAN 버스 전기적 특성](/blog/embedded/modern-recipes/part1-10-can-electrical)
- [5-01: PWM 출력 실전 — LED 밝기·모터 속도 제어](/blog/embedded/modern-recipes/part5-01-pwm-output)
