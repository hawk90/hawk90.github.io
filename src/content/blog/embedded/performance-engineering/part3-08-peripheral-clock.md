---
title: "3-08: Peripheral Clock — PLL·Divider·Gating·DVFS"
date: 2026-05-19T07:00:00
description: "PLL/divider/gating으로 peripheral clock. STM32 RCC, Linux CCF. Power vs Performance."
series: "Embedded Performance Engineering"
seriesOrder: 26
tags: [clock, peripheral, dvfs, rcc, pll]
draft: true
---

## 한 줄 요약

> **"Peripheral clock = 속도 + 전력"** — 분주가 SPI MHz·UART baud 결정.

## Clock Tree — STM32H743 예

```text
HSE 25 MHz
    ↓
[PLL1 ×64] → 400 MHz (SYSCLK)
    ├ AHB1·2·3·4 = SYSCLK / 2 = 200 MHz
    │   ├ APB1 = 100 MHz (timer kernel: 200 MHz)
    │   ├ APB2 = 100 MHz
    │   ├ APB3
    │   └ APB4
    ├ HSI 64 MHz (backup)
    ↓
[PLL2 ×40] → 200 MHz (PER_CK)
    └ ADC, SPI, USART (별도 source)

[PLL3] → 48 MHz (USB), 24 MHz (LCD-TFT pixel clock)
```

각 peripheral이 *별도 clock source* 선택 가능 — power 최적화.

## RCC Enable·Disable

```c
__HAL_RCC_USART1_CLK_ENABLE();
__HAL_RCC_SPI1_CLK_ENABLE();
__HAL_RCC_GPIOA_CLK_ENABLE();

/* Disable when unused → power 절약 */
__HAL_RCC_USART2_CLK_DISABLE();
```

Cortex-M reset 직후 — *모든 peripheral clock OFF*. 사용 전 활성화 필수.

```c
RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
__DSB();   // ← clock stable 대기
USART1->BRR = 1000;   // safe
```

## SPI Clock 계산

```c
hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_8;
/* SPI1 source = APB2 = 100 MHz
   SPI_CLK = 100 / 8 = 12.5 MHz */
```

Prescaler — 2, 4, 8, 16, 32, 64, 128, 256.

| BaudRate | Prescaler | Period |
|---|---|---|
| 50 MHz | /2 | 20 ns |
| 25 MHz | /4 | 40 ns |
| 12.5 MHz | /8 | 80 ns |
| 6.25 MHz | /16 | 160 ns |

SPI slave 데이터시트의 *fSPI_MAX* 안 넘게.

## UART Baud Rate

```c
huart1.Init.BaudRate = 115200;
/* USART_BRR = PCLK / baud
   = 100,000,000 / 115200 = 868.05...
   → 정수만 가능, fractional은 *DIV_FRACTION* 필드 */
```

오차:

```text
ideal:  100,000,000 / 868 = 115,207
error:  (115207 - 115200) / 115200 = 0.006%
→ OK (3% 이내)
```

PLL이 *깨끗한 정수 비율*이면 오차 0.

## Clock Gating — Linux CCF

```text
Common Clock Framework — kernel/clk-provider.h

각 driver:
struct clk *clk = devm_clk_get(dev, "core");
clk_prepare_enable(clk);
/* peripheral 사용 */
clk_disable_unprepare(clk);
```

미사용 driver — clock 자동 disable → *전력 절약*.

```bash
# 현재 상태
cat /sys/kernel/debug/clk/clk_summary
```

## DVFS — Dynamic Voltage·Frequency Scaling

```text
Workload high → CPU freq ↑, voltage ↑
Workload low → CPU freq ↓, voltage ↓
```

Linux `cpufreq`:

```bash
# governor 설정
echo ondemand > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# 강제 frequency
echo userspace > .../scaling_governor
echo 600000 > .../scaling_setspeed   # 600 MHz
```

전력 ≈ V² × f → V를 *약간 줄여도* 전력 *크게 절약*.

## 자동차 사례 — 변속·정차에 따른 DVFS

```c
void on_idle(void) {
    /* 차량 정차 — CPU 100 MHz */
    set_pll(100_MHZ);
    set_voltage(VDD_0_9V);
}

void on_accel(void) {
    /* 가속 — CPU 600 MHz */
    set_voltage(VDD_1_1V);   // *먼저* voltage 올림
    settle_us(100);
    set_pll(600_MHZ);
}
```

순서 — voltage 먼저, frequency 나중. 반대로 하면 *under-voltage fault*.

## PLL Lock Time

```c
RCC->PLLCFGR = PLL_CONFIG;
RCC->CR |= RCC_CR_PLLON;
while (!(RCC->CR & RCC_CR_PLLRDY)) {}   // ~100 µs wait

RCC->CFGR |= RCC_CFGR_SW_PLL;
```

PLL lock = *수십 µs*. Power-up·DVFS 시 *blocking*. RTC backup → bypass.

## CSS — Clock Security System

```c
RCC->CR |= RCC_CR_CSSON;
```

HSE 실패 (XTAL 깨짐) 감지 → *자동 HSI로 fallback*. 자동차·항공 안전.

```c
void NMI_Handler(void) {
    if (RCC->CIR & RCC_CIR_CSSF) {
        log_fault();
        reset_or_fallback();
    }
}
```

## Sleep·Stop·Standby — Cortex-M

```c
/* Sleep — CPU off, peripheral on */
__WFI();

/* Stop — clock off, RAM 유지 */
HAL_PWR_EnterSTOPMode(PWR_MAINREGULATOR_ON, PWR_STOPENTRY_WFI);

/* Standby — 모든 것 off, RAM 잃음 */
HAL_PWR_EnterSTANDBYMode();
```

각 모드 — wakeup latency 트레이드오프:

| Mode | Wakeup | Current |
|---|---|---|
| Sleep | 0 µs | 5 mA |
| Stop | ~10 µs | 200 µA |
| Standby | ~200 µs (reset) | 1 µA |

## ESP32 — Light Sleep·Deep Sleep

```c
/* Light sleep — 1 ms wakeup, RTC 유지 */
esp_light_sleep_start();

/* Deep sleep — 수 µA */
esp_deep_sleep_start();
/* → 깨어나면 reset에 가까움 (RTC RAM만 유지) */
```

IoT 센서 — 99% deep sleep + 1% active = 배터리 *수 년*.

## Linux 측정 — powertop·turbostat

```bash
sudo powertop --auto-tune
# 자동으로 전력 절약 설정 권장

turbostat
# CPU package power·core frequency·C-state residency
```

## 자주 하는 실수

> ⚠️ Clock enable 안 하고 register access

```c
USART1->CR1 = USART_CR1_UE;   // ← fault: clock 미활성
```

→ `__HAL_RCC_USART1_CLK_ENABLE()` 먼저.

> ⚠️ DVFS 시 voltage·frequency 순서 잘못

```c
set_pll(600_MHZ);          // → under-voltage fault
set_voltage(VDD_1_1V);
```

→ 상승: voltage 먼저, frequency 나중. 하강: frequency 먼저.

> ⚠️ Stop mode에서 USB·Ethernet 동작 기대

`Stop`은 *모든 PLL off* → USB·Ethernet 멈춤. Sleep만 가능.

> ⚠️ CSS 비활성

XTAL 깨지면 *system hang* — CSS enable로 *자동 fallback*.

## 정리

- Clock tree = **HSE/HSI → PLL → AHB → APB → peripheral**.
- Peripheral clock *enable* 후에 access.
- SPI·UART baud는 *prescaler*로.
- **DVFS** = 워크로드별 V·f 동적 — V² × f 전력 절약.
- **PLL lock** = 수십 µs.
- Sleep·Stop·Standby — wakeup latency vs current trade-off.

다음 편은 **Power vs Performance**.

## 관련 항목

- [3-07: MMIO](/blog/embedded/performance-engineering/part3-07-mmio)
- [3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
