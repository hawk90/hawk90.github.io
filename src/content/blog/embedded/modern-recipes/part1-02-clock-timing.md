---
title: "임베디드 클럭과 타이밍 — Skew·Jitter·PLL·MMCM 분석"
date: 2026-04-10T09:02:00
description: "PLL·jitter·skew·setup/hold time — 디지털 시스템의 모든 동작의 근간."
series: "Modern Embedded Recipes"
seriesOrder: 2
tags: [recipes, clock, timing, pll]
draft: false
---

## 한 줄 요약

> **"클럭은 디지털 시스템의 심장이고, jitter와 skew는 그 박동의 흔들림입니다."** 빠른 MCU일수록 이 흔들림이 동작 한계를 정합니다.

## 어떤 상황에서 쓰나

- 외부 크리스털을 바꾸고 UART baud rate가 살짝 어긋나기 시작했을 때
- 100 MHz 이상으로 SPI/QSPI를 돌리려는데 read가 깨질 때
- DDR memory를 새 보드에서 처음 동작시킬 때
- 카메라 센서 PCLK이 들어오지만 픽셀이 일정하게 시프트될 때

## 핵심 개념

### 1) Clock source 계층

대부분의 MCU는 여러 단계로 클럭을 만듭니다.

| 단계 | 클럭 | 비고 |
| --- | --- | --- |
| 소스 | HSE = 8 MHz | 외부 크리스털 |
| PLL 출력 | 168 MHz | × N 체배 |
| 시스템 버스 | 168 MHz | SYSCLK |
| AHB | 168 MHz | HCLK (/1) |
| APB1 | 42 MHz | PCLK1 (/4) |
| APB2 | 84 MHz | PCLK2 (/2) |

STM32F4 기준 예시입니다. 외부 8 MHz 크리스털을 PLL로 168 MHz까지 끌어올리고, 버스마다 prescaler로 나눠 분배합니다.

```c
// STM32F4 — 8 MHz HSE → 168 MHz SYSCLK
RCC->CR |= RCC_CR_HSEON;
while (!(RCC->CR & RCC_CR_HSERDY));

RCC->PLLCFGR = (8  << RCC_PLLCFGR_PLLM_Pos)   // M = 8  → 1 MHz
             | (336 << RCC_PLLCFGR_PLLN_Pos)  // N = 336 → 336 MHz
             | (0  << RCC_PLLCFGR_PLLP_Pos)   // P = 2  → 168 MHz
             | RCC_PLLCFGR_PLLSRC_HSE;

RCC->CR |= RCC_CR_PLLON;
while (!(RCC->CR & RCC_CR_PLLRDY));

RCC->CFGR |= RCC_CFGR_SW_PLL;
```

### 2) Jitter — 주기의 흔들림

이상적 클럭은 정확히 같은 간격으로 떨어집니다. 실제 클럭은 매 cycle 미세하게 떨립니다.

| 종류 | 의미 | 영향 |
| --- | --- | --- |
| Period jitter | 한 cycle의 길이 변동 | setup/hold 마진 감소 |
| Cycle-to-cycle | 인접 두 cycle 차이 | DDR write strobe 불안 |
| Long-term | 수천 cycle 평균 이동 | PLL lock 품질 |

PLL은 jitter를 완전히 없애 주지 않습니다. 입력의 phase noise를 부분적으로 필터링할 뿐이고, 자체 jitter(보통 5 ~ 50 ps RMS)를 더합니다.

### 3) Clock skew

같은 클럭이 여러 곳에 분배될 때, 도착 시각이 다르면 그 차이가 skew입니다. PCB 트레이스 길이, FPGA 내부 라우팅, clock buffer 지연 등이 원인입니다.

![Clock skew from PCB trace length mismatch](/images/blog/modern-recipes/diagrams/part1-02-clock-skew.svg)

PCB 트레이스는 보통 6 ns / m 정도 지연을 줍니다.

### 4) Setup time / Hold time

플립플롭이 데이터를 안정적으로 잡으려면 클럭 에지 직전·직후에 데이터가 변하지 않아야 합니다.

![Setup time / Hold time](/images/blog/modern-recipes/diagrams/part1-02-setup-hold.svg)

`T_setup`을 어기면 metastability(준안정 상태)에 빠지고, 결과가 0인지 1인지 불확정해집니다.

## 코드 / 실제 사용 예

UART baud rate가 어긋나는 흔한 원인을 봅니다.

```c
// 9600 baud 가정, 16x oversampling
// brr = clk / baud
// 8 MHz HSE에서 PLL 미사용 시
uint32_t brr = 8000000 / 9600;          // 833.33 → 833 (truncated)
USART1->BRR = 833;
// 실제 baud = 8000000 / 833 = 9603.84 → 0.04% 오차 (OK)

// 16 MHz HSI(내부 RC, 1% 오차)에서
brr = 16000000 / 9600;                  // 1666.67 → 1666
// 실제 baud = 9603.84 (소수 절삭) + RC 오차 ±1%
// 합쳐서 ±1.04% → 9 bit 전송 후 누적 9%, FRAME ERROR
```

내부 RC oscillator는 편하지만 ±1 ~ 2% 오차가 있습니다. UART 같은 비동기 통신은 누적 오차 2.5% 이하를 권장합니다. 외부 크리스털은 보통 ±20 ppm = 0.002%이므로 안전합니다.

## 측정 / 비교

| 클럭 소스 | 정확도 | jitter | 비고 |
| --- | --- | --- | --- |
| 내부 RC (HSI) | ±1 ~ 2% | 보통 100 ps | factory trim 가능 |
| Crystal | ±20 ~ 50 ppm | 1 ~ 10 ps | 표준 선택 |
| TCXO | ±0.5 ~ 2 ppm | 1 ps | GPS 보조 등 |
| OCXO | ±0.01 ppm | sub-ps | 통신 인프라 |

오실로스코프로 jitter를 측정하려면 infinite persistence 모드로 클럭 에지에 trigger를 걸고 수 분간 누적합니다. 에지가 흐려진 폭이 peak-to-peak jitter입니다.

## 자주 보는 함정

> ⚠️ 외부 크리스털 부하 커패시터 미스매치

크리스털 사양서의 `C_L` 값(보통 8 ~ 18 pF)과 PCB 부하가 다르면 발진 주파수가 어긋나거나 시동이 안 됩니다. `C1 = C2 = 2 × (C_L - C_stray)` 공식을 쓰고, 보통 PCB stray는 3 ~ 5 pF를 잡습니다.

> ⚠️ HSI로 부팅한 채 그대로 동작

대부분 MCU는 reset 후 내부 RC로 시작합니다. PLL 전환 코드가 빠지면 클럭이 16 MHz에 머무릅니다. 빠른 줄 알았던 코드가 실제로는 1/10 속도로 돕니다.

> ⚠️ PLL lock 대기 누락

`while (!(RCC->CR & RCC_CR_PLLRDY));` 같은 lock 확인 없이 SW=PLL로 바꾸면 클럭이 모호한 시점에 전환되어 시스템이 행업합니다.

> ⚠️ Flash wait state 미설정

168 MHz로 동작시키면서 flash wait state를 0으로 두면 instruction fetch가 깨집니다. 데이터시트의 wait state 표를 보고 클럭 변경 *전에* 설정합니다.

## 정리

- 클럭 계층은 HSE → PLL → bus prescaler 순으로 구성됩니다. 각 단계에서 jitter와 정확도가 결정됩니다.
- Jitter는 PLL이 완전히 제거하지 못합니다. 통신 속도가 빨라질수록 한계로 다가옵니다.
- Setup/hold time을 어기면 metastability에 빠집니다. 보드 설계의 skew 관리가 중요합니다.
- 내부 RC는 ±1 ~ 2% 오차이므로 비동기 통신에 부적합합니다. 크리스털을 씁니다.
- 부하 커패시터·wait state·PLL lock 같은 작은 실수가 모든 동작을 무너뜨립니다.

다음 편에서는 **GPIO 내부 구조**를 다룹니다. 가장 단순해 보이는 디지털 I/O의 실제 회로입니다.

## 관련 항목

- [1-01: 디지털 신호 기초](/blog/embedded/modern-recipes/part1-01-digital-signal-basics)
- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- 더 깊이 — [Practical RTOS Internals 2-01: SysTick](/blog/embedded/rtos/practical-internals/00-preface)
