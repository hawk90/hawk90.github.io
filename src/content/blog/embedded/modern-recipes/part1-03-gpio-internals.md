---
title: "1-03: GPIO 내부 구조"
date: 2026-05-12T03:00:00
description: "Push-pull·open-drain·pull-up/down·drive strength·slew rate."
series: "Modern Embedded Recipes"
seriesOrder: 3
tags: [recipes, gpio, hw-basics]
draft: false
---

## 한 줄 요약

> **"GPIO는 단순한 핀이 아니라 작은 회로 블록입니다."** 출력 트랜지스터 두 개와 풀업·풀다운, 슈미트 트리거 입력으로 구성된 미니 회로입니다.

## 어떤 상황에서 쓰나

- LED는 켜지는데 다른 보드와의 인터페이스에서 1이 안 나올 때
- I2C 라인을 GPIO로 흉내 내려는데 통신이 안 될 때
- 버튼 입력이 가끔 두 번씩 들어올 때
- 외부 입력이 3.3V 보드에 5V를 줄 때

## 핵심 개념

### 1) 출력 단 — Push-Pull vs Open-Drain

GPIO 출력은 보통 두 개의 트랜지스터로 구성됩니다.

| 구조 요소 | Push-Pull | Open-Drain |
| --- | --- | --- |
| VDD 측 | P-MOS (1 출력) | 외부 풀업 저항 (10 kΩ 등) |
| OUT → pin | 양방향 driver | drain only |
| GND 측 | N-MOS (0 출력) | N-MOS (0 출력만, high-Z로 1) |

| 구분 | Push-Pull | Open-Drain |
| --- | --- | --- |
| 0 출력 | N-MOS ON | N-MOS ON |
| 1 출력 | P-MOS ON | high-Z (풀업이 끌어올림) |
| 외부 풀업 | 불필요 | 필수 |
| 양방향 가능 | 어려움 | 가능 (wired-OR) |
| 사용 예 | LED, 일반 출력 | I2C, alert, IRQ |

I2C가 open-drain인 이유는 여러 디바이스가 같은 라인을 공유해야 하기 때문입니다. Push-pull이면 한 디바이스는 1, 다른 디바이스는 0을 동시에 출력해 short가 발생합니다.

### 2) 입력 단 — 풀업/풀다운/플로팅

입력 모드는 핀이 어디에도 연결되지 않은 경우(플로팅)와 풀업/풀다운으로 명시 레벨을 잡는 경우가 있습니다.

```c
// STM32F4 입력 설정
// MODER = 00 (input)
GPIOA->MODER &= ~(0b11 << (0 * 2));

// PUPDR = 01 (pull-up), 10 (pull-down), 00 (no pull)
GPIOA->PUPDR &= ~(0b11 << (0 * 2));
GPIOA->PUPDR |=  (0b01 << (0 * 2));   // pull-up
```

내부 풀업·풀다운 저항은 보통 30 ~ 50 kΩ입니다. I2C용 풀업으로는 너무 약합니다. 그래서 외부 풀업(2.2k ~ 10k)을 따로 답니다.

### 3) Drive strength

같은 push-pull이라도 출력 트랜지스터의 W/L 비율에 따라 driver 강도가 다릅니다. 강한 driver는 부하 커패시터를 빨리 충전·방전해 rise/fall time을 줄입니다.

```c
// STM32F4 OSPEEDR
// 00 = low (2 MHz), 01 = medium (25 MHz)
// 10 = high (50 MHz), 11 = very high (100 MHz)
GPIOA->OSPEEDR |= (0b11 << (5 * 2));   // very high speed
```

빠를수록 좋아 보이지만 EMI 방사가 커집니다. 50 cm 떨어진 거리에서 30 dBμV가 5 dBμV가 될 수 있습니다.

### 4) Schmitt trigger 입력

입력 비교기는 일반 비교기가 아니라 히스테리시스가 있는 Schmitt trigger입니다. 0 → 1 임계와 1 → 0 임계가 다릅니다.

```text
       ┌─────┐
1 ─────┘     │
        ↑     ↓
   V_IH   V_IL  (V_IH > V_IL → hysteresis)
```

이 덕분에 천천히 변하는 신호도 입력단에서 잡음 없이 디지털로 변환됩니다.

## 코드 / 실제 사용 예

5V 신호를 3.3V MCU에 안전하게 받기 위한 방법입니다.

```c
// 잘못된 방법 — 3.3V GPIO 입력에 5V 직접 인가
// → ESD 다이오드 통해 VDD로 흘러 칩 파손 가능

// 올바른 방법 1: 5V tolerant 핀 사용
// STM32 데이터시트의 "FT" (5V tolerant) 표시 확인

// 올바른 방법 2: 저항 분압
// 5V ── R1(10k) ── input ── R2(20k) ── GND
//            → input = 5 × 20 / 30 = 3.33V

// 올바른 방법 3: 레벨 시프터 IC
// SN74LVC2T45 (양방향), TXB0108 (자동 감지)
```

소프트웨어 I2C bit-bang 시 GPIO mode를 어떻게 바꿔야 하는지도 자주 헷갈립니다.

```c
// I2C SDA — open-drain emulation
static inline void sda_low(void) {
    // output mode + push-pull → 강제 0
    GPIOB->MODER |= (0b01 << (7 * 2));
}

static inline void sda_release(void) {
    // input mode (high-Z), 외부 풀업이 1로 끌어올림
    GPIOB->MODER &= ~(0b11 << (7 * 2));
}

static inline int sda_read(void) {
    return (GPIOB->IDR >> 7) & 1;
}
```

## 측정 / 비교

| 부하 | 50 pF 부하 시 rise time (Cortex-M4, 3.3V) |
| --- | --- |
| OSPEEDR=00 (low) | 약 100 ns |
| OSPEEDR=01 (medium) | 약 25 ns |
| OSPEEDR=10 (high) | 약 10 ns |
| OSPEEDR=11 (very high) | 약 5 ns |

| Pull 저항 | I2C 풀업 적절성 |
| --- | --- |
| 1 kΩ | 너무 강함 (싱크 전류 초과) |
| 2.2 kΩ | 400 kHz 적합 |
| 4.7 kΩ | 100 kHz 표준 |
| 10 kΩ | low-speed sleep 시 |
| 50 kΩ (internal) | rise time 느려 통신 불가 |

## 자주 보는 함정

> ⚠️ Open-drain만 설정하고 풀업을 안 달기

LED는 NPN으로 끌어 내리는 회로면 잘 켜지지만, 핀 자체가 1을 능동적으로 출력하지 않으므로 *측정 시* 0V로 보입니다.

> ⚠️ 입력으로 두고 플로팅

설정 안 한 핀은 random 노이즈를 잡아 IRQ가 미친 듯이 발생합니다. 미사용 핀은 풀업 또는 풀다운으로 고정합니다.

> ⚠️ 5V 입력을 3.3V FT 아닌 핀에 직결

ESD 다이오드가 0.7V drop으로 견디는 동안은 동작합니다. 며칠 후 칩이 죽거나 다른 핀에 노이즈가 침투합니다.

> ⚠️ Drive strength 과다

근거리(같은 보드 안)에서 100 MHz drive를 쓰면 PCB 자체가 안테나가 되어 인접 라인에 크로스토크가 발생합니다.

## 정리

- GPIO는 push-pull 또는 open-drain 출력, 풀업/풀다운/플로팅 입력으로 구성됩니다.
- Open-drain은 공유 버스(I2C 등)나 양방향 IRQ에 필수입니다. 풀업이 반드시 있어야 합니다.
- 내부 풀업은 30 ~ 50 kΩ이므로 I2C에는 부족합니다. 외부 풀업(2.2k ~ 10k)을 답니다.
- Drive strength는 필요한 만큼만 설정합니다. 과한 속도는 EMI를 만듭니다.
- 5V 입력은 FT 핀 또는 레벨 시프터로 받습니다. 직결은 칩을 죽입니다.

다음 편에서는 **UART 하드웨어 동작**을 다룹니다. 가장 흔한 시리얼 통신의 내부 구조입니다.

## 관련 항목

- [1-02: 클럭과 타이밍](/blog/embedded/modern-recipes/part1-02-clock-timing)
- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- 더 깊이 — [Embedded Performance Engineering: GPIO 토글 측정](/blog/embedded/performance-engineering/)
