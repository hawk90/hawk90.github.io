---
title: "Peripheral Clock 분석 — PLL·Divider·Gating·DVFS"
slug: "embedded/performance-engineering/part3-08-peripheral-clock"
date: 2026-04-25T09:07:00
description: "STM32H7 HAL 소스로 SPI·UART clock 계산을 확인하고, Linux CCF의 unused clock 처리와 OPP의 전압·주파수 순서를 커널 소스로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 26
tags: [clock, peripheral, dvfs, rcc, pll]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Peripheral clock = 속도 + 전력"** 입니다. 분주가 SPI MHz와 UART baud를 결정합니다.

STM32 코드의 함수·매크로 이름은 STM32CubeH7 HAL 드라이버 소스(`stm32h7xx-hal-driver`, 커밋 `65e5c7e`)에서 확인했고, 보드에서 실행하지는 않았습니다. 칩별 전류·wakeup 시간·PLL lock 시간 같은 사양값은 reference manual과 datasheet가 정하므로 이 글에 숫자로 싣지 않습니다.

## Clock Tree — STM32H743 예

![STM32H7 clock tree — HSE, PLL1/2/3, AHB/APB divider, peripheral clock source 선택](/images/blog/perf-eng/diagrams/part3-08-clock-tree.svg)

발진기(HSE, HSI)에서 PLL을 거쳐 버스 clock과 주변장치 clock이 나뉩니다. 주변장치 하나가 쓰는 clock과 그 주파수는 reference manual의 clock tree와 레지스터 설정으로 정해집니다.

## RCC Enable·Disable

```c
__HAL_RCC_USART1_CLK_ENABLE();
__HAL_RCC_SPI1_CLK_ENABLE();
__HAL_RCC_GPIOA_CLK_ENABLE();

__HAL_RCC_USART2_CLK_DISABLE();   /* 쓰지 않는 주변장치의 clock을 끔 */
```

STM32H7 HAL의 `__HAL_RCC_USART1_CLK_ENABLE()`(`stm32h7xx_hal_rcc.h` 2190행)은 enable bit를 쓴 뒤 같은 레지스터를 한 번 다시 읽는 `do { ... } while(0)` 매크로입니다. 직접 레지스터를 쓸 때는 3-07처럼 `DSB`로 write 완료를 보장합니다. `DSB`는 write가 끝났다는 것만 보장하며, 주변장치 쪽에 필요한 추가 지연은 reference manual이 정합니다.

```c
RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
__DSB();
USART1->BRR = 868;
```

## SPI Clock 계산

STM32H7 HAL의 SPI prescaler 매크로는 `SPI_BAUDRATEPRESCALER_2`부터 `SPI_BAUDRATEPRESCALER_256`까지입니다(`stm32h7xx_hal_spi.h` 389~396행). SPI 커널 clock이 100 MHz라면:

| Prescaler | SCK | 주기 |
|---|---:|---:|
| /2 | 50 MHz | 20 ns |
| /4 | 25 MHz | 40 ns |
| /8 | 12.5 MHz | 80 ns |
| /16 | 6.25 MHz | 160 ns |

상대 장치 데이터시트의 최대 SCK 주파수를 넘지 않는 가장 작은 prescaler를 고릅니다. SPI 커널 clock이 어디서 오는지(PLL 출력인지 버스 clock인지)는 STM32H7 reference manual의 clock 선택 레지스터가 정합니다.

## UART Baud Rate

STM32H7 HAL은 16배 oversampling일 때 BRR 값을 `UART_DIV_SAMPLING16(PCLK, BAUD, PRESC)` = `((PCLK / PRESC) + BAUD/2) / BAUD`로, 즉 반올림한 정수로 계산합니다(`stm32h7xx_hal_uart.h` 1277~1278행). 커널 clock 100 MHz, prescaler 1, 115200 baud라면:

$$\text{BRR} = \left\lfloor \frac{100{,}000{,}000 + 57{,}600}{115{,}200} \right\rfloor = 868$$

$$\text{실제 baud} = \frac{100{,}000{,}000}{868} = 115{,}207, \qquad \text{오차} = \frac{115{,}207 - 115{,}200}{115{,}200} = 0.006\%$$

이 오차를 받아들일 수 있는지는 상대 장치와 프로토콜의 허용치로 판단합니다. 커널 clock이 baud의 정수배이면 반올림이 없으므로 오차는 0입니다.

## Clock Gating — Linux CCF

Linux Common Clock Framework에서 드라이버는 자기 clock을 얻어 켜고 끕니다.

```c
struct clk *clk = devm_clk_get(dev, "core");
clk_prepare_enable(clk);
/* 주변장치 사용 */
clk_disable_unprepare(clk);
```

아무 드라이버도 켜지 않은 clock은 부팅 끝 무렵에 꺼집니다. Linux 6.12 `drivers/clk/clk.c`의 `clk_disable_unused()`(1531행)가 `late_initcall_sync`(1570행)로 돌면서 쓰이지 않는 clock을 끄고, 커널 인자 `clk_ignore_unused`를 주면 건너뜁니다. Debian 게스트의 부팅 로그에도 `clk: Disabling unused clocks`가 찍혔습니다.

```bash
cat /sys/kernel/debug/clk/clk_summary
```

게스트의 `clk_summary`에는 `apb_pclk` 하나만 있었습니다(QEMU virt 보드가 기술한 clock이 그것뿐). 실제 SoC에서는 여기에 clock tree 전체와 각 clock의 enable count, rate가 나옵니다(`logs/p3-08-clk.log`).

## DVFS — Dynamic Voltage·Frequency Scaling

부하가 높으면 주파수와 전압을 올리고, 낮으면 내립니다. Linux에서는 cpufreq가 이것을 합니다.

```bash
echo ondemand > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

echo userspace > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo 600000 > /sys/devices/system/cpu/cpu0/cpufreq/scaling_setspeed   # kHz
```

`Documentation/admin-guide/pm/cpufreq.rst`에 따르면 `ondemand`는 CPU 부하를 주파수 선택 기준으로 쓰고, `userspace`는 스스로 아무것도 하지 않으며 사용자 공간이 `scaling_setspeed`에 쓴 주파수를 적용합니다. 이 시리즈의 게스트에는 `/sys/devices/system/cpu/cpufreq`가 없어(1-06) 실행하지 못했습니다.

전압을 낮추는 이유는 동적 전력 때문입니다. `Documentation/power/energy-model.rst`는 cpufreq의 간단한 energy model이 `Power = C * V^2 * f` 식을 쓴다고 적고, 누설(static) 전력이 중요한 장치에서는 이 모델이 실제와 맞지 않을 수 있다고 덧붙입니다. 이 식대로라면 같은 주파수에서 전압을 10% 낮추면 동적 전력은 0.9² = 0.81배가 됩니다.

## 전압과 주파수의 순서

```c
void scale_up(void) {
    set_voltage(VDD_HIGH);     /* 먼저 전압 */
    wait_regulator_settle();
    set_pll(FREQ_HIGH);        /* 그다음 주파수 */
}

void scale_down(void) {
    set_pll(FREQ_LOW);         /* 먼저 주파수 */
    set_voltage(VDD_LOW);      /* 그다음 전압 */
}
```

Linux OPP 프레임워크가 이 순서를 지킵니다. `drivers/opp/core.c`의 OPP 전환 코드(1236~1300행)는 "Scaling up? Configure required OPPs before frequency"라는 주석 아래에서 regulator 전압을 먼저 바꾼 뒤 clock을 바꾸고, 내려갈 때는 clock을 먼저 바꾼 뒤 regulator를 바꿉니다. 높은 주파수는 그에 맞는 전압이 먼저 갖춰져 있어야 동작하기 때문입니다. `set_voltage()` 같은 이름은 예시입니다.

## PLL Lock

```c
RCC->CR |= RCC_CR_PLL1ON;
while (!(RCC->CR & RCC_CR_PLL1RDY)) { }   /* lock될 때까지 */
```

PLL을 켜면 ready flag가 설 때까지 기다려야 하고, 그동안 그 clock은 쓸 수 없습니다. STM32H7 HAL은 이 대기의 timeout을 `PLL_TIMEOUT_VALUE` 2 ms로 둡니다(`stm32h7xx_hal_rcc.h` 8015행). 실제 lock 시간은 datasheet의 PLL 특성 표에 있습니다. DVFS로 PLL을 다시 잡아야 한다면, 그 사이에는 다른 clock(HSI 등)으로 시스템을 돌리거나 이 시간만큼의 정지를 감수합니다.

## CSS — Clock Security System

```c
HAL_RCC_EnableCSS();

void NMI_Handler(void) {
    HAL_RCC_NMI_IRQHandler();   /* HSE 실패 처리 */
}
```

CSS는 외부 발진기(HSE)의 고장을 감지합니다. STM32H7 HAL에는 `HAL_RCC_EnableCSS()`와 NMI에서 부르는 `HAL_RCC_NMI_IRQHandler()`가 있습니다(`stm32h7xx_hal_rcc.h` 7982·7991행). 고장 시 어떤 clock으로 넘어가는지는 reference manual이 정합니다.

## Sleep·Stop·Standby — Cortex-M

```c
/* Sleep: 코어만 멈춤 */
__WFI();

/* Stop (STM32H7 HAL) */
HAL_PWR_EnterSTOPMode(PWR_MAINREGULATOR_ON, PWR_STOPENTRY_WFI);
HAL_PWREx_EnterSTOPMode(PWR_MAINREGULATOR_ON, PWR_STOPENTRY_WFI, PWR_D3_DOMAIN);

/* Standby */
HAL_PWR_EnterSTANDBYMode();
```

STM32H7 HAL에는 `HAL_PWR_EnterSTOPMode(Regulator, STOPEntry)`(`stm32h7xx_hal_pwr.h` 704행) 외에 power domain을 인자로 받는 `HAL_PWREx_EnterSTOPMode(Regulator, STOPEntry, Domain)`(`stm32h7xx_hal_pwr_ex.h` 526행)이 있습니다. 각 모드에서 무엇이 꺼지고 무엇이 유지되는지는 칩의 reference manual이, 모드별 전류와 wakeup 시간은 그 칩 datasheet의 전기적 특성 표(전원 전압, 온도, 켜 둔 domain 조건과 함께)가 정합니다. 이 글은 그 표를 확인하지 못해 수치를 싣지 않습니다.

## 자주 하는 실수

> ⚠️ Clock enable 전에 register 접근

```c
USART1->CR1 = USART_CR1_UE;   /* clock이 꺼진 주변장치 */
```

`__HAL_RCC_USART1_CLK_ENABLE()`를 먼저 호출합니다.

> ⚠️ DVFS에서 순서 거꾸로

```c
set_pll(FREQ_HIGH);    /* 전압이 아직 낮음 */
set_voltage(VDD_HIGH);
```

올릴 때는 전압 먼저, 내릴 때는 주파수 먼저입니다(Linux OPP `_set_opp` 순서).

> ⚠️ Stop mode에서 PLL을 쓰는 주변장치가 돈다고 기대

Stop에서 꺼지는 clock과 남는 clock은 reference manual의 low-power mode 표가 정합니다. PLL을 쓰는 주변장치는 깨어난 뒤 PLL을 다시 켜야 할 수 있으므로, 깨어난 직후의 clock 설정을 함께 점검합니다.

## 정리

- STM32H7 HAL은 UART BRR을 반올림한 정수로 계산합니다. 100 MHz, 115200 baud면 BRR 868, 오차 0.006%입니다.
- Linux CCF는 `late_initcall_sync`에서 쓰이지 않는 clock을 끄고, `clk_ignore_unused`로 막을 수 있습니다.
- cpufreq의 간단한 energy model은 `C·V²·f`이고, 전압 10% 감소는 동적 전력 0.81배입니다(누설 전력 제외).
- Linux OPP는 올릴 때 전압 → 주파수, 내릴 때 주파수 → 전압 순서로 바꿉니다.
- 저전력 모드의 전류와 wakeup 시간, PLL lock 시간은 datasheet 값을 씁니다.

다음 편은 **Power vs Performance**를 다룹니다.

## 관련 항목

- [3-07: MMIO](/blog/embedded/performance-engineering/part3-07-mmio)
- [3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)

## 참고 자료

- [STM32CubeH7 HAL driver](https://github.com/STMicroelectronics/stm32h7xx-hal-driver) (`stm32h7xx_hal_rcc.h`, `_spi.h`, `_uart.h`, `_pwr.h`, `_pwr_ex.h`)
- Linux v6.12 `drivers/clk/clk.c`, `drivers/opp/core.c`, `Documentation/admin-guide/pm/cpufreq.rst`, `Documentation/power/energy-model.rst`
