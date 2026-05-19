---
title: "3-08: Peripheral Clock — PLL·Divider·Gating·DVFS"
date: 2026-05-08T07:00:00
description: "PLL/divider/gating으로 peripheral clock. STM32 RCC, Linux CCF. Power vs Performance."
series: "Embedded Performance Engineering"
seriesOrder: 26
tags: [clock, peripheral, dvfs, rcc, pll]
draft: false
---

## 한 줄 요약

> **"Peripheral clock = 속도 + 전력"** 입니다. 분주가 SPI MHz와 UART baud를 결정합니다.

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

각 peripheral은 별도의 clock source를 선택할 수 있고, 이렇게 하면 power를 최적화할 수 있습니다.

## RCC Enable·Disable

```c
__HAL_RCC_USART1_CLK_ENABLE();
__HAL_RCC_SPI1_CLK_ENABLE();
__HAL_RCC_GPIOA_CLK_ENABLE();

/* Disable when unused → power 절약 */
__HAL_RCC_USART2_CLK_DISABLE();
```

Cortex-M은 reset 직후 모든 peripheral clock이 OFF 상태이므로, 사용하기 전에 반드시 활성화해야 합니다.

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

Prescaler는 2, 4, 8, 16, 32, 64, 128, 256 중에서 고릅니다.

| BaudRate | Prescaler | Period |
|---|---|---|
| 50 MHz | /2 | 20 ns |
| 25 MHz | /4 | 40 ns |
| 12.5 MHz | /8 | 80 ns |
| 6.25 MHz | /16 | 160 ns |

SPI slave 데이터시트의 *fSPI_MAX*를 넘기지 않도록 합니다.

## UART Baud Rate

```c
huart1.Init.BaudRate = 115200;
/* USART_BRR = PCLK / baud
   = 100,000,000 / 115200 = 868.05...
   → 정수만 가능, fractional은 *DIV_FRACTION* 필드 */
```

오차:

$$\text{ideal} = \frac{100{,}000{,}000}{868} = 115{,}207$$

$$\text{error} = \frac{115{,}207 - 115{,}200}{115{,}200} = 0.006\%$$

3% 이내이므로 OK입니다. PLL이 깨끗한 정수 비율이면 오차가 0이 됩니다.

## Clock Gating — Linux CCF

```text
Common Clock Framework — kernel/clk-provider.h

각 driver:
struct clk *clk = devm_clk_get(dev, "core");
clk_prepare_enable(clk);
/* peripheral 사용 */
clk_disable_unprepare(clk);
```

사용하지 않는 driver는 clock이 자동으로 disable되어 전력을 절약해 줍니다.

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

전력은 V² × f에 비례하므로, V를 약간만 줄여도 전력을 크게 절약할 수 있습니다.

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

순서는 voltage를 먼저 올리고 frequency를 나중에 올리는 것입니다. 반대로 하면 under-voltage fault가 발생합니다.

## PLL Lock Time

```c
RCC->PLLCFGR = PLL_CONFIG;
RCC->CR |= RCC_CR_PLLON;
while (!(RCC->CR & RCC_CR_PLLRDY)) {}   // ~100 µs wait

RCC->CFGR |= RCC_CFGR_SW_PLL;
```

PLL lock에는 수십 µs가 걸리고, power-up이나 DVFS 시점에는 그 동안 blocking됩니다. RTC backup으로 이 구간을 우회할 수 있습니다.

## CSS — Clock Security System

```c
RCC->CR |= RCC_CR_CSSON;
```

HSE 실패(XTAL 깨짐)를 감지하면 자동으로 HSI로 fallback합니다. 자동차나 항공처럼 안전이 중요한 영역에서 자주 쓰입니다.

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

각 모드는 wakeup latency와 트레이드오프 관계입니다.

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

IoT 센서는 99% deep sleep + 1% active 패턴으로 배터리를 수 년 단위로 끌고 갑니다.

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

`__HAL_RCC_USART1_CLK_ENABLE()`를 먼저 호출해야 합니다.

> ⚠️ DVFS 시 voltage·frequency 순서 잘못

```c
set_pll(600_MHZ);          // → under-voltage fault
set_voltage(VDD_1_1V);
```

상승할 때는 voltage를 먼저, frequency를 나중에 올립니다. 하강할 때는 반대로 frequency를 먼저 내립니다.

> ⚠️ Stop mode에서 USB·Ethernet 동작 기대

`Stop`은 모든 PLL을 끄기 때문에 USB와 Ethernet이 멈춥니다. 이런 peripheral을 살려두려면 Sleep만 사용해야 합니다.

> ⚠️ CSS 비활성

XTAL이 깨지면 system이 hang하므로, CSS를 enable해서 자동 fallback이 동작하게 해야 합니다.

## 정리

- Clock tree는 **HSE/HSI → PLL → AHB → APB → peripheral** 순서로 흐릅니다.
- Peripheral clock을 *enable*한 뒤에 register에 접근해야 합니다.
- SPI와 UART baud는 *prescaler*로 맞춥니다.
- **DVFS**는 워크로드에 따라 V와 f를 동적으로 조정해서 V² × f만큼 전력을 절약합니다.
- **PLL lock**에는 수십 µs가 걸립니다.
- Sleep, Stop, Standby는 wakeup latency와 current 사이의 트레이드오프를 만듭니다.

다음 편은 **Power vs Performance**를 다룹니다.

## 관련 항목

- [3-07: MMIO](/blog/embedded/performance-engineering/part3-07-mmio)
- [3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
