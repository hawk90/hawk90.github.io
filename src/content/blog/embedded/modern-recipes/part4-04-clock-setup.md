---
title: "임베디드 클럭 설정 분석 — HSE·PLL·SYSCLK·AHB/APB 분주"
slug: "embedded/modern-recipes/part4-04-clock-setup"
date: 2026-04-13T09:38:00
description: "HSE/HSI·PLL·peripheral clock enable — 코어/주변기기 클럭 트리."
series: "Modern Embedded Recipes"
seriesOrder: 38
tags: [recipes, bare-metal, clock]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"clock tree를 모르면 peripheral은 죽어 있습니다."** STM32F407에서는 HSE → PLL → SYSCLK → AHB → APB → peripheral 순서로 clock이 나뉩니다.

## 어떤 상황에서 쓰나

STM32F407 datasheet(DS8626) 2.2.12절은 "On reset the 16 MHz internal RC oscillator is selected as the default CPU clock"이라고 적습니다. 같은 칩의 최대 AHB clock은 168 MHz이므로 reset 상태 그대로면 약 10분의 1(16/168 MHz) 속도로 돕니다. UART baud rate나 SPI clock은 모두 이 clock에서 나눠 만들기 때문에, clock 설정이 기대와 다르면 peripheral 설정값도 함께 틀어집니다.

이 글은 reset부터 PLL 활성화, AHB/APB prescaler, peripheral clock enable까지의 순서를 STM32F407 기준으로 정리합니다. 숫자는 DS8626 Rev 4(DocID022152, 2013-06)와 ST의 CMSIS 헤더(cmsis-device-f4), HAL v1.8.3 소스에서 가져왔습니다.

## 핵심 개념

### Clock tree 전체 그림

| 단계 | 입력 | 출력 | 근거 |
| --- | --- | --- | --- |
| Source | HSI 16 MHz / HSE 4–26 MHz crystal / LSI / LSE 32.768 kHz | — | DS8626 2.2.12, Table 31–34 |
| SYSCLK MUX | HSI, HSE, PLL 중 하나 | SYSCLK | `RCC_CFGR_SW` |
| AHB prescaler | SYSCLK | HCLK (max 168 MHz) | DS8626 Table 14 (VOS = 1) |
| APB1 prescaler | HCLK | PCLK1 (max 42 MHz) | DS8626 2.2.12, Table 14 |
| APB2 prescaler | HCLK | PCLK2 (max 84 MHz) | DS8626 2.2.12, Table 14 |
| Main PLL | HSE 8 MHz | 168 MHz SYSCLK / 48 MHz | M=8 → 1 MHz → N=336 → 336 MHz → P=2, Q=7 |

DS8626의 표에서 옮긴 source 특성은 이렇습니다.

- **HSI**: 16 MHz 내부 RC. Table 33의 factory-calibrated 정확도는 25 °C에서 ±1 %, −10~85 °C에서 ±4 %, −40~105 °C에서 −8~+4.5 %입니다.
- **HSE**: 2.2.12절과 Table 31의 4–26 MHz crystal/ceramic resonator. 외부 clock 입력(`fHSE_ext`)이면 1–50 MHz입니다. Table 31의 startup time `tSU(HSE)`는 typ 2 ms입니다.
- **LSI**: Table 34에서 17 / 32 / 47 kHz(min / typ / max). 정확도가 낮아 IWDG 같은 곳에 씁니다.
- **LSE**: 32.768 kHz crystal, RTC용입니다.

### PLL 계산 공식 (STM32F4)

```text
VCO_input  = PLL_input / PLL_M
VCO_output = VCO_input × PLL_N
SYSCLK     = VCO_output / PLL_P      (P = 2, 4, 6, 8)
48 MHz clk = VCO_output / PLL_Q      (Q = 2..15)
```

범위는 출처마다 조금 다르게 적혀 있습니다.

| 항목 | DS8626 Rev 4 Table 35 | ST 소스 |
| --- | --- | --- |
| VCO 입력 | 0.95 / 1 / 2.10 MHz (min/typ/max) | HAL `__HAL_RCC_PLL_PLLM_CONFIG` 주석: "ranges from 1 to 2 MHz. It is recommended to select a frequency of 2 MHz to limit PLL jitter" |
| VCO 출력 | 192–432 MHz | `stm32f407xx.h`: `RCC_PLLVCO_OUTPUT_MIN 100000000U`, `..._MAX 432000000U` |
| PLL_M / N / P / Q | — | HAL `IS_RCC_PLLM_VALUE` 2–63, `IS_RCC_PLLN_VALUE` 50–432, `IS_RCC_PLLP_VALUE` 2/4/6/8, `IS_RCC_PLLQ_VALUE` 2–15 |

VCO 출력 하한은 datasheet와 헤더가 다르므로, 두 값을 모두 만족하도록 192 MHz 이상으로 잡습니다. Q 출력에 대해서는 HAL `stm32f4xx_hal_rcc_ex.h`가 "If the USB OTG FS is used in your application, you have to set the PLLQ parameter correctly to have 48 MHz clock for the USB. However, the SDIO and RNG need a frequency lower than or equal to 48 MHz"라고 적습니다.

예: HSE 8 MHz → 168 MHz SYSCLK + 48 MHz. ST의 STM32F4-Discovery 예제(`GPIO/GPIO_EXTI/Src/main.c`의 `SystemClock_Config()` 주석)도 HSE 8 MHz, `PLL_M = 8`, `PLL_N = 336`, `PLL_P = 2`, `PLL_Q = 7`, APB1 /4, APB2 /2, "Flash Latency(WS) = 5"를 씁니다.

```text
PLL_M = 8   → VCO_input  = 8 MHz / 8   = 1 MHz
PLL_N = 336 → VCO_output = 1 MHz × 336 = 336 MHz
PLL_P = 2   → SYSCLK     = 336 MHz / 2 = 168 MHz
PLL_Q = 7   → 48 MHz clk = 336 MHz / 7 = 48 MHz
```

VCO 입력 1 MHz는 HAL 주석의 권장값(2 MHz)이 아니라 datasheet 범위 안의 typ 값입니다. 2 MHz로 하려면 `PLL_M = 4`, `PLL_N = 168`로 바꾸면 VCO 출력이 그대로 336 MHz입니다.

### Flash latency

코어 clock이 빠를수록 flash를 읽는 데 wait state가 더 필요하고, SYSCLK를 올리기 **전에** 설정해야 합니다. DS8626 Rev 4 5.3.6절(전류 측정 조건)은 flash 접근 시간을 "0 wait state from 0 to 30 MHz, 1 wait state from 30 to 60 MHz, 2 wait states from 60 to 90 MHz, 3 wait states from 90 to 120 MHz, 4 wait states from 120 to 150 MHz, and 5 wait states from 150 to 168 MHz"로 맞춘다고 적고, Table 15는 VDD 2.7–3.6 V에서 "168 MHz with 5 wait states"입니다. ST 헤더의 `FLASH_SCALE1_LATENCY1_FREQ`~`..._LATENCY5_FREQ`도 30/60/90/120/150 MHz로 같은 경계를 씁니다.

| HCLK (VDD 2.7–3.6 V) | Wait States |
|--------|-------------|
| ≤ 30 MHz | 0 WS |
| ≤ 60 MHz | 1 WS |
| ≤ 90 MHz | 2 WS |
| ≤ 120 MHz | 3 WS |
| ≤ 150 MHz | 4 WS |
| ≤ 168 MHz | 5 WS |

DS8626 Table 15는 전압이 낮으면 더 많은 wait state를 요구합니다(2.4–2.7 V에서 168 MHz에 6 WS, 2.1–2.4 V에서 168 MHz에 7 WS, 1.8–2.1 V에서는 최대 160 MHz에 7 WS).

### AHB / APB1 / APB2

DS8626 2.2.12절은 "The maximum frequency of the three AHB buses is 168 MHz while the maximum frequency of the high-speed APB domains is 84 MHz. The maximum allowed frequency of the low-speed APB domain is 42 MHz"라고 적습니다. 어떤 peripheral이 어느 bus에 있는지는 clock enable bit가 어느 register에 있는지로 알 수 있고, `stm32f407xx.h`에서 확인한 예는 다음과 같습니다.

| Bus | 최대 clock (F407) | 연결된 peripheral (ENR bit) |
|-----|------------------|-------------------|
| AHB1 | 168 MHz | GPIOA~I, DMA1/2, ETHMAC (`RCC_AHB1ENR_*`) |
| APB1 | 42 MHz | TIM2~7, USART2/3, UART4/5, SPI2/3, I2C1~3 (`RCC_APB1ENR_*`) |
| APB2 | 84 MHz | TIM1/8, USART1/6, SPI1, ADC1 (`RCC_APB2ENR_*`) |

## 코드 예제

### 1. 168 MHz boot — STM32F407 계열 예시

순서는 HSE → 전압 scaling → flash latency → PLL → prescaler → SYSCLK 전환입니다.

```c
#include "stm32f4xx.h"

void clock_init_168mhz(void) {
    // 1. HSE enable (8 MHz). ST-Link의 8 MHz 출력을 받는 Nucleo라면 RCC_CR_HSEBYP도 set
    RCC->CR |= RCC_CR_HSEON;
    while (!(RCC->CR & RCC_CR_HSERDY));   // HSE가 안 뜨면 여기서 영원히 멈춘다

    // 2. Voltage scaling — VOS = 1 (DS8626 Table 14: 168 MHz는 VOS = 1에서만)
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_VOS;

    // 3. Flash latency — 5 WS for 168 MHz, with prefetch/I-cache/D-cache
    FLASH->ACR = FLASH_ACR_LATENCY_5WS
               | FLASH_ACR_PRFTEN
               | FLASH_ACR_ICEN
               | FLASH_ACR_DCEN;

    // 4. PLL 설정 — 8MHz / 8 × 336 / 2 = 168 MHz
    RCC->PLLCFGR = (8u   <<  0)         // PLL_M = 8
                 | (336u <<  6)         // PLL_N = 336
                 | (0u   << 16)         // PLL_P = 2  (00=/2)
                 | (RCC_PLLCFGR_PLLSRC_HSE)
                 | (7u   << 24);        // PLL_Q = 7

    // 5. PLL on, wait ready
    RCC->CR |= RCC_CR_PLLON;
    while (!(RCC->CR & RCC_CR_PLLRDY));

    // 6. Bus prescalers
    //    AHB = SYSCLK / 1 = 168 MHz
    //    APB1 = AHB / 4   =  42 MHz
    //    APB2 = AHB / 2   =  84 MHz
    RCC->CFGR = (0u << 4)              // HPRE  = /1
              | (5u << 10)             // PPRE1 = /4
              | (4u << 13);            // PPRE2 = /2

    // 7. Switch SYSCLK to PLL
    RCC->CFGR |= (2u << 0);
    while (((RCC->CFGR >> 2) & 3u) != 2u);   // wait SWS = PLL
}
```

손으로 쓴 shift 값이 ST의 bit 정의와 같은지는 컴파일 시간에 확인했습니다. 아래 `_Static_assert`가 모두 통과합니다.

```c
#include "stm32f4xx.h"   /* -DSTM32F407xx */
_Static_assert(RCC_PLLCFGR_PLLM_Pos == 0 && RCC_PLLCFGR_PLLN_Pos == 6 && RCC_PLLCFGR_PLLP_Pos == 16 &&
               RCC_PLLCFGR_PLLSRC_Pos == 22 && RCC_PLLCFGR_PLLQ_Pos == 24, "PLLCFGR");
_Static_assert(RCC_CFGR_PPRE1_DIV4 == (5u << 10), "PPRE1 /4");
_Static_assert(RCC_CFGR_PPRE2_DIV2 == (4u << 13), "PPRE2 /2");
_Static_assert(RCC_CFGR_SW_PLL == 2u && RCC_CFGR_SWS_PLL == (2u << 2), "SW/SWS");
_Static_assert(FLASH_ACR_LATENCY_5WS == 5u, "5WS");
```

`PLLCFGR`를 통째로 쓰는 것은 HAL과 같습니다. HAL v1.8.3 `HAL_RCC_OscConfig()`도 `WRITE_REG(RCC->PLLCFGR, ...)`로 한 번에 씁니다.

### 2. QEMU에서 보는 HSE 대기 hang

위 함수를 arm-none-eabi-gcc 16.2.0으로 빌드해 QEMU 11.1.3 `netduinoplus2`(STM32F405)에서 돌렸습니다. QEMU의 F4 RCC 모델(`hw/misc/stm32_rcc.c`)은 `-d unimp`로 실행하면 "The RCC peripheral only supports enable and reset in QEMU"라는 로그를 남기고 나머지 register는 값만 저장하므로, `HSERDY`가 1이 되는 일이 없습니다. 1초 뒤 monitor로 본 상태입니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=soft -ffreestanding -nostdlib -O2 -Wall \
    -DSTM32F407xx -ICMSIS_6/CMSIS/Core/Include -Icmsis-device-f4/Include \
    -T stm32f411.ld -o clock.elf startup.c clock.c main.c
qemu-system-arm -M netduinoplus2 -nographic -kernel clock.elf -monitor stdio -serial null -d unimp
(qemu) info registers
(qemu) xp /1wx 0x40023800
```

```text
R12=00000000 R13=2001fff0 R14=080000e7 R15=0800007a
40023800: 0x00010000
```

`RCC->CR`은 `HSEON`(bit 16)만 켜진 `0x00010000`이고, PC `0x0800007a`는 disassembly의 `ldr r3, [r2, #0]` → `lsls r1, r3, #14` → `bpl.n 800007a`, 즉 `HSERDY`(bit 17) 대기 loop입니다. `main.c`는 `clock_init_168mhz()`를 부르고 `for (;;)`로 도는 두 줄이고, startup과 linker script는 [4-01](/blog/embedded/modern-recipes/part4-01-first-baremetal)의 것입니다.

HAL은 이 대기에 시간 제한을 둡니다. `HAL_RCC_OscConfig()`는 `HSE_TIMEOUT_VALUE`(= `HSE_STARTUP_TIMEOUT`)를 넘기면 `HAL_TIMEOUT`을 돌려줍니다. bare-metal에서도 같은 일을 하도록 고친 버전입니다. 시간 대신 loop 횟수로 제한했습니다.

```c
/* clock_safe.c */
#include "stm32f4xx.h"

static int wait_bit(volatile uint32_t *reg, uint32_t mask, uint32_t spins) {
    while (spins--) {
        if (*reg & mask) return 0;
    }
    return -1;                          /* timeout */
}

/* Returns 0 on 168 MHz, -1 if HSE never became ready (SYSCLK stays on HSI). */
int clock_init_168mhz_safe(void) {
    RCC->CR |= RCC_CR_HSEON;
    if (wait_bit(&RCC->CR, RCC_CR_HSERDY, 100000u) != 0) {
        RCC->CR &= ~RCC_CR_HSEON;       /* give up, keep HSI */
        return -1;
    }
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_VOS;
    FLASH->ACR = FLASH_ACR_LATENCY_5WS | FLASH_ACR_PRFTEN | FLASH_ACR_ICEN | FLASH_ACR_DCEN;
    RCC->PLLCFGR = (8u << RCC_PLLCFGR_PLLM_Pos) | (336u << RCC_PLLCFGR_PLLN_Pos)
                 | (0u << RCC_PLLCFGR_PLLP_Pos) | RCC_PLLCFGR_PLLSRC_HSE
                 | (7u << RCC_PLLCFGR_PLLQ_Pos);
    RCC->CR |= RCC_CR_PLLON;
    if (wait_bit(&RCC->CR, RCC_CR_PLLRDY, 100000u) != 0) return -1;
    RCC->CFGR = RCC_CFGR_HPRE_DIV1 | RCC_CFGR_PPRE1_DIV4 | RCC_CFGR_PPRE2_DIV2;
    RCC->CFGR |= RCC_CFGR_SW_PLL;
    while ((RCC->CFGR & RCC_CFGR_SWS) != RCC_CFGR_SWS_PLL) { }
    return 0;
}
```

```c
/* main_safe.c */
/* report the result through semihosting (QEMU -semihosting) */
#include <stdint.h>
int clock_init_168mhz_safe(void);
static void sh_write0(const char *s) {
    register uint32_t r0 __asm("r0") = 0x04; register const char *r1 __asm("r1") = s;
    __asm volatile ("bkpt 0xab" : "+r"(r0) : "r"(r1) : "memory");
}
static void sh_exit(void) {
    register uint32_t r0 __asm("r0") = 0x18; register uint32_t r1 __asm("r1") = 0x20026;
    __asm volatile ("bkpt 0xab" : "+r"(r0) : "r"(r1) : "memory");
}
int main(void) {
    sh_write0(clock_init_168mhz_safe() == 0 ? "SYSCLK = PLL 168 MHz\n"
                                             : "HSE timeout: SYSCLK stays on HSI\n");
    sh_exit();
    return 0;
}
```

```bash
qemu-system-arm -M netduinoplus2 -nographic -semihosting -kernel clock_safe.elf -serial null -monitor none
```

```text
HSE timeout: SYSCLK stays on HSI
```

QEMU에서는 HSE가 뜨지 않으므로 timeout 경로만 확인됩니다. 168 MHz 경로는 이 글에서 실행하지 않았습니다. 보드에서는 아래 MCO 출력으로 확인합니다.

### 3. Peripheral clock enable 순서

각 peripheral은 자기 bus의 ENR register에서 enable합니다.

```c
// AHB1 peripheral
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN
              | RCC_AHB1ENR_GPIOCEN
              | RCC_AHB1ENR_DMA1EN;

// APB1 peripheral
RCC->APB1ENR |= RCC_APB1ENR_USART2EN
              | RCC_APB1ENR_TIM2EN
              | RCC_APB1ENR_I2C1EN;

// APB2 peripheral
RCC->APB2ENR |= RCC_APB2ENR_USART1EN
              | RCC_APB2ENR_SPI1EN
              | RCC_APB2ENR_ADC1EN;
```

ST HAL의 `__HAL_RCC_xxx_CLK_ENABLE()`은 bit를 set한 뒤 같은 bit를 다시 읽고 "Delay after an RCC peripheral clock enabling"이라고 주석을 답니다([4-02](/blog/embedded/modern-recipes/part4-02-mmio-access)).

### 4. Timer clock ×2 규칙

DS8626 Rev 4의 clock tree 주석은 "The timers connected to APB2 are clocked from TIMxCLK up to 168 MHz, while the timers connected to APB1 are clocked from TIMxCLK either up to 84 MHz or 168 MHz, depending on TIMPRE bit configuration in the RCC_DCKCFGR register"라고 적습니다. 다만 ST의 `stm32f407xx.h`에는 `DCKCFGR`도 `TIMPRE`도 정의돼 있지 않고(`RCC_TypeDef`의 마지막 register가 `PLLI2SCFGR`), 같은 저장소의 `stm32f429xx.h`에는 있습니다. 이 글은 RM0090으로 확인하지 못했으므로 F407에서는 TIMPRE가 없는 경우, 즉 아래 ×2 규칙만 씁니다. Linux v6.12 `drivers/clk/clk-stm32f4.c`는 이 규칙을 `clk_apb_mul`로 구현하는데, 주석이 "if *not* running in 1:1 mode, they also tap out the one of the low order state bits to run the timers"이고, `RCC_CFGR`의 bit 12(APB1)·bit 15(APB2), 즉 PPRE 필드의 최상위 bit가 1이면 `parent_rate * 2`를 돌려줍니다.

```c
// SYSCLK 168, APB1 = /4 = 42 MHz → TIM2~7 clock = 84 MHz
// SYSCLK 168, APB2 = /2 = 84 MHz → TIM1/8 clock = 168 MHz
```

## 측정 / 동작 확인

보드에서는 **MCO (Master Clock Output)**로 확인합니다. ST open_pin_data의 STM32F407 GPIO 표에서 `RCC_MCO_1`은 PA8, `RCC_MCO_2`는 PC9이고 둘 다 AF0입니다. HAL `HAL_RCC_MCOConfig()`는 MCO2를 `MODIFY_REG(RCC->CFGR, (RCC_CFGR_MCO2 | RCC_CFGR_MCO2PRE), (RCC_MCOSource | (RCC_MCODiv << 3U)))`로 설정하고, `RCC_MCO2SOURCE_SYSCLK`는 0, `RCC_MCODIV_4`는 `RCC_CFGR_MCO1PRE_1 | RCC_CFGR_MCO1PRE_2`입니다. 3 bit 올리면 MCO2PRE 필드(bit 29:27) 값 `0b110` = 6이 됩니다.

```c
// MCO2(PC9)에 SYSCLK / 4 출력
RCC->CFGR &= ~(RCC_CFGR_MCO2 | RCC_CFGR_MCO2PRE);   // bit 31:30, 29:27
RCC->CFGR |=  (0u << 30)                            // MCO2 = SYSCLK
          |   (6u << 27);                           // MCO2PRE = /4

gpio_init(GPIOC, 9, &(gpio_config_t){
    .mode=GPIO_MODE_AF, .otype=GPIO_OTYPE_PP,
    .speed=GPIO_SPEED_VH, .af=0,
});
```

PC9에 168/4 = 42 MHz가 나오면 SYSCLK 설정이 맞습니다. DS8626 Rev 4 Table 15는 VDD 2.7–3.0 V에서 I/O 핀의 clock 출력을 48 MHz까지(3.0–3.6 V에서 60 MHz)로 적으므로 42 MHz는 그 안입니다. `gpio_init()`은 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 드라이버입니다.

scope가 없다면 같은 delay loop의 LED 주기를 reset 직후(HSI)와 PLL 전환 후에 비교합니다.

## 자주 보는 함정

> ⚠️ HSE crystal이 없는 보드에서 HSE를 켬

위 QEMU 실행처럼 `HSERDY` 대기에서 멈춥니다. Nucleo 계열은 crystal 대신 ST-Link의 8 MHz를 HSE 입력으로 받는 구성이 있습니다. Zephyr의 `nucleo_f411re.dts`는 `&clk_hse`에 `hse-bypass;`와 `clock-frequency = <DT_FREQ_M(8)>; /* STLink 8MHz clock */`를 둡니다. 이 경우에는 `RCC_CR_HSEBYP`를 같이 켜야 하고, HAL에서는 `RCC_HSE_BYPASS`(`RCC_CR_HSEBYP | RCC_CR_HSEON`)입니다.

> ⚠️ Flash latency를 나중에 설정

SYSCLK를 올린 뒤에 wait state를 올리면, 그 사이 flash는 datasheet 조건(168 MHz에 5 WS)을 벗어난 상태로 읽힙니다. HAL `HAL_RCC_ClockConfig()`는 "Increasing the number of wait states because of higher CPU frequency" 단계를 SYSCLK 전환보다 먼저 하고, 새 값이 `FLASH_ACR`에 반영됐는지 읽어서 확인한 뒤에야 진행합니다.

> ⚠️ PLL on 직후 ready를 안 기다림

HAL `HAL_RCC_ClockConfig()`는 PLL을 SYSCLK로 고를 때 `RCC_FLAG_PLLRDY`가 0이면 전환하지 않고 `HAL_ERROR`를 돌려줍니다. 직접 쓸 때도 `PLLRDY`를 확인한 뒤에 `SW`를 바꿉니다.

> ⚠️ APB1 prescaler를 /1로 두고 SYSCLK 168 MHz

PCLK1이 168 MHz가 되어 DS8626 Table 14의 최대 42 MHz를 넘습니다. 168 MHz에서 APB1은 /4, APB2는 /2가 위 ST 예제의 값입니다.

## 정리

- **Reset 직후는 HSI 16 MHz**(DS8626 2.2.12)입니다. main 앞부분에서 PLL로 올립니다.
- **Clock tree**: HSE/HSI → PLL → SYSCLK → AHB(168) → APB1(42)/APB2(84) → peripheral.
- **순서**: HSE → VOS → flash latency → PLL → prescaler → SYSCLK 전환. ready flag 대기에는 timeout을 둡니다.
- **TIM은 APB prescaler가 1이 아니면 APB의 2배**로 돕니다.
- **MCO 출력**으로 SYSCLK를 핀에 내보내 검증합니다.

다음 편은 **인터럽트 핸들링**입니다. NVIC enable, priority, ISR 명명, EXTI까지 정리합니다.

## 관련 항목

- [Part 1-02: 클럭과 타이밍](/blog/embedded/modern-recipes/part1-02-clock-timing)
- [Part 4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
- [Part 4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [Part 4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
