---
title: "1-01: 디지털 신호 기초"
date: 2026-05-12T01:00:00
description: "Voltage level·rise/fall time·noise margin·신호 무결성의 기본기."
series: "Modern Embedded Recipes"
seriesOrder: 1
tags: [recipes, signal-integrity, hw-basics]
draft: false
---

## 한 줄 요약

> **"디지털 신호는 사실 아날로그입니다."** 0과 1로 보이지만, 오실로스코프로 보면 모두 비스듬한 경사와 흔들리는 평탄부입니다.

## 어떤 상황에서 쓰나

- 새 보드를 처음 부팅해서 GPIO가 "왜 안 잡히지"를 디버깅할 때
- SPI/I2C 속도를 올리다 통신이 깨지기 시작할 때
- EMI 인증 시험에서 노이즈 스펙을 초과할 때
- 모터 드라이브 등 강전 회로 옆에서 디지털 라인이 오동작할 때

위 상황은 모두 "디지털 신호의 아날로그적 특성"을 무시했을 때 발생합니다. 코드가 아니라 전기 신호를 봐야 풀립니다.

## 핵심 개념

### 1) 전압 레벨

| 신호 패밀리 | V_OH (min) | V_OL (max) | V_IH (min) | V_IL (max) |
| --- | --- | --- | --- | --- |
| TTL (5 V) | 2.4 V | 0.4 V | 2.0 V | 0.8 V |
| LVTTL (3.3 V) | 2.4 V | 0.4 V | 2.0 V | 0.8 V |
| CMOS 3.3 V | 3.0 V | 0.5 V | 2.0 V | 0.8 V |
| CMOS 1.8 V | 1.7 V | 0.1 V | 1.17 V | 0.63 V |

V_OH / V_OL은 출력 측이 보장하는 값이고, V_IH / V_IL은 입력 측이 0/1로 해석하는 경계입니다. 둘 사이의 차이가 **noise margin**입니다.

![3.3V CMOS voltage levels with noise margins](/images/blog/modern-recipes/diagrams/part1-01-cmos-levels.svg)

### 2) Rise time / Fall time

이상적 디지털 신호는 즉시 0 → 1로 전환합니다. 실제로는 그렇지 않습니다. 보통 **10% → 90%** 도달 시간을 rise time이라고 합니다.

```c
// STM32F4 GPIO drive strength 설정 예
GPIOC->OSPEEDR &= ~(0b11 << (5 * 2));
GPIOC->OSPEEDR |=  (0b11 << (5 * 2));   // 0b11 = very high speed
```

| OSPEEDR | 일반 속도 | rise time (3.3V, 50pF 부하) |
| --- | --- | --- |
| 0b00 | low | 약 100 ns |
| 0b01 | medium | 약 25 ns |
| 0b10 | high | 약 10 ns |
| 0b11 | very high | 약 5 ns |

빠를수록 좋아 보이지만, 그만큼 EMI 방사도 커집니다. 필요 없는 라인은 일부러 느린 모드로 둡니다.

### 3) Noise margin과 신호 무결성

전송선이 길거나 종단이 부족하면 신호가 오버슈트·언더슈트합니다. 이 진폭이 noise margin 안에 머물면 동작은 정상이지만, 넘으면 입력 회로가 잘못 토글합니다.

![Ringing waveform with overshoot and undershoot](/images/blog/modern-recipes/diagrams/part1-01-ringing-waveform.svg)

## 코드 / 실제 사용 예

GPIO 토글을 오실로스코프로 보며 drive strength 영향을 확인합니다.

```c
// STM32F4 — PA5에 LED, prove 신호로 사용
void gpio_speed_test(uint32_t speed_bits) {
    GPIOA->MODER   |= (0b01 << (5 * 2));   // output
    GPIOA->OSPEEDR &= ~(0b11 << (5 * 2));
    GPIOA->OSPEEDR |=  (speed_bits << (5 * 2));
    GPIOA->OTYPER  &= ~(1 << 5);            // push-pull
    while (1) {
        GPIOA->BSRR = (1 << 5);
        GPIOA->BSRR = (1 << (5 + 16));
    }
}
```

이 코드를 4가지 speed로 돌리고 오실로스코프로 보면, rise time이 5 ns에서 100 ns로 변하는 게 눈에 들어옵니다.

## 측정 / 비교

| 항목 | 측정 방법 | 양호 기준 (3.3V CMOS) |
| --- | --- | --- |
| Rise time | 10% → 90% 시간 | 0.5 × bit period 이하 |
| Overshoot | 정상 값 위로 튄 폭 | V_DD + 0.3 V 이내 |
| Undershoot | GND 아래로 떨어진 폭 | GND - 0.3 V 이내 |
| Ringing | 진폭이 50%로 감소까지 시간 | 한 bit period 이내 |

오실로스코프 대역폭은 신호 rise time 기준 **3 ~ 5배**가 필요합니다. 5 ns rise time 신호를 100 MHz 스코프로 보면 측정값 자체가 왜곡됩니다.

## 자주 보는 함정

> ⚠️ 모든 GPIO를 최고 속도로 설정

EMI 인증에서 떨어지는 흔한 원인입니다. 필요한 라인만 high speed로, 나머지는 low/medium으로 둡니다.

> ⚠️ V_IH 경계의 입력 신호

3.3 V CMOS 입력에 2.1 V 신호를 줘도 0/1은 정확히 판정됩니다. 다만 noise 한 번에 0으로 바뀝니다. 마진을 위해 0.5 V 이상 여유를 둡니다.

> ⚠️ Open-drain 신호의 풀업 누락

I2C나 alert 라인 같은 open-drain 출력에 풀업이 없으면, 0은 잘 나오지만 1은 끝없이 떠 있습니다. 입력 회로가 흔들립니다.

> ⚠️ 스코프 probe ground spring 미사용

20 cm 악어클립으로 GND를 잡고 측정하면 rise time이 부풀려 보입니다. 짧은 스프링 접지(2 cm 이하)로 측정해야 실제 신호에 가까워집니다.

## 정리

- 디지털 신호도 결국 아날로그입니다. V_OH / V_OL, V_IH / V_IL 사이의 noise margin이 신뢰성을 결정합니다.
- Rise time은 drive strength로 조절합니다. 빠를수록 EMI가 커지므로, 필요한 라인만 빠르게 설정합니다.
- 오버슈트·언더슈트·링잉은 모두 전송선 효과입니다. 종단·풀업·드라이브 강도로 다스립니다.
- 스코프 측정 시 대역폭 5배, 짧은 GND 스프링을 확보해야 실제 파형을 봅니다.

다음 편에서는 **클럭과 타이밍**을 다룹니다. 디지털 시스템 모든 동작의 근간입니다.

## 관련 항목

- [1-02: 클럭과 타이밍](/blog/embedded/modern-recipes/part1-02-clock-timing)
- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-12: LVDS / 차동 신호 일반](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- 더 깊이 — [Embedded Performance Engineering: I/O 측정](/blog/embedded/performance-engineering/)
