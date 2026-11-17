---
title: "임베디드 클럭과 타이밍 — Skew·Jitter·PLL 분석"
slug: "embedded/modern-recipes/part1-02-clock-timing"
date: 2026-04-10T09:02:00
description: "STM32F4 168 MHz PLL 설정을 레지스터로 짜고, jitter 정의·측정법, 트레이스 skew 계산, setup/hold와 metastability, UART baud 오차 예산을 1차 자료와 계산으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 2
tags: [recipes, clock, timing, pll]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"클럭은 디지털 시스템의 심장이고, jitter와 skew는 그 박동의 흔들림입니다."** 이 글은 클럭을 만드는 순서와, 흔들림이 timing margin과 UART 오차 예산을 얼마나 먹는지를 숫자로 봅니다.

## 어떤 상황에서 쓰나

- 외부 크리스털을 바꾸고 UART baud rate가 살짝 어긋나기 시작했을 때
- 100 MHz 이상으로 SPI/QSPI를 돌리려는데 read가 깨질 때
- DDR memory를 새 보드에서 처음 동작시킬 때
- 카메라 센서 PCLK이 들어오지만 픽셀이 일정하게 시프트될 때

## 핵심 개념

### 1) Clock source 계층

MCU는 원본 발진기 하나를 PLL로 체배한 뒤 버스마다 나눠 씁니다. 아래 표는 ST의 STM32CubeF4(v1.28.3) `Projects/STM32F4-Discovery/Examples/GPIO/GPIO_EXTI/Src/main.c`의 `SystemClock_Config()` 주석에 적힌 설정값과, 그 값으로 계산한 각 단계 클럭입니다. PLLQ 출력의 용도(OTG FS·SDIO·RNG)는 HAL `stm32f4xx_hal_rcc_ex.h` 63행의 설명을 따랐습니다.

| 단계 | 클럭 | 비고 |
| --- | --- | --- |
| 소스 | HSE = 8 MHz | 외부 크리스털 |
| PLL 입력 | 1 MHz | ÷ M (M = 8) |
| PLL VCO | 336 MHz | × N (N = 336) |
| PLL 출력 | 168 MHz | ÷ P (P = 2) |
| OTG FS·SDIO·RNG용 | 48 MHz | VCO ÷ Q (Q = 7) |
| 시스템 버스 | 168 MHz | SYSCLK |
| AHB | 168 MHz | HCLK (/1) |
| APB1 | 42 MHz | PCLK1 (/4) |
| APB2 | 84 MHz | PCLK2 (/2) |

같은 `SystemClock_Config()` 주석은 이 설정에서 V_DD = 3.3 V, 레귤레이터 Scale 1, **Flash latency 5 WS**를 함께 적습니다. HAL을 쓰지 않고 레지스터로 같은 일을 하면 다음 순서가 됩니다. 클럭을 올리기 *전에* wait state부터 늘리고, prescaler를 정한 뒤 SYSCLK를 PLL로 바꾸고, 전환이 끝났는지 `SWS`로 확인합니다.

```c
#include "stm32f4xx.h"

/* STM32F407: 8 MHz HSE -> PLL -> 168 MHz SYSCLK, AHB /1, APB1 /4, APB2 /2. */
void clock_168mhz(void)
{
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;          /* PWR clock */
    (void)RCC->APB1ENR;                         /* HAL처럼 enable 뒤 read-back */
    PWR->CR |= PWR_CR_VOS;                      /* regulator Scale 1 */

    FLASH->ACR = FLASH_ACR_ICEN | FLASH_ACR_DCEN | FLASH_ACR_PRFTEN
               | FLASH_ACR_LATENCY_5WS;         /* 5 wait states first */

    RCC->CR |= RCC_CR_HSEON;
    while (!(RCC->CR & RCC_CR_HSERDY)) { }

    RCC->PLLCFGR = (8u   << RCC_PLLCFGR_PLLM_Pos)   /* 8 MHz / 8   = 1 MHz   */
                 | (336u << RCC_PLLCFGR_PLLN_Pos)   /* 1 MHz x 336 = 336 MHz */
                 | (0u   << RCC_PLLCFGR_PLLP_Pos)   /* 0 = /2  -> 168 MHz    */
                 | (7u   << RCC_PLLCFGR_PLLQ_Pos)   /* 336 / 7 = 48 MHz      */
                 | RCC_PLLCFGR_PLLSRC_HSE;

    RCC->CR |= RCC_CR_PLLON;
    while (!(RCC->CR & RCC_CR_PLLRDY)) { }

    RCC->CFGR = (RCC->CFGR & ~(RCC_CFGR_HPRE | RCC_CFGR_PPRE1 | RCC_CFGR_PPRE2))
              | RCC_CFGR_HPRE_DIV1 | RCC_CFGR_PPRE1_DIV4 | RCC_CFGR_PPRE2_DIV2;

    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_SW) | RCC_CFGR_SW_PLL;
    while ((RCC->CFGR & RCC_CFGR_SWS) != RCC_CFGR_SWS_PLL) { }
}
```

`PLLP` 필드가 0일 때 ÷2인 것은 HAL이 확인해 줍니다. HAL v1.8.6의 `RCC_PLLP_DIV2`는 2이고(`stm32f4xx_hal_rcc.h` 168행), `HAL_RCC_OscConfig()`는 이 값을 `((PLLP >> 1) - 1)`로 바꿔 필드에 씁니다(`stm32f4xx_hal_rcc.c` 495행). 2를 넣으면 0입니다. 같은 HAL은 M을 2~63, N을 50~432로 검사합니다(`IS_RCC_PLLM_VALUE`, `IS_RCC_PLLN_VALUE`).

`arm-none-eabi-gcc` 16.2.0으로 `cmsis_device_f4`(commit 9192c7b)와 `CMSIS_5` Core 헤더를 써서 경고 없이 빌드됩니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -DSTM32F407xx \
  -I cmsis_device_f4/Include -I CMSIS_5/CMSIS/Core/Include -Wall -Wextra -c clock168.c
```

read-back 한 줄은 HAL의 `__HAL_RCC_PWR_CLK_ENABLE()`(`stm32f4xx_hal_rcc.h` 510~516행)이 "Delay after an RCC peripheral clock enabling"이라는 주석과 함께 하는 일을 따라 한 것입니다.

보드에서는 실행하지 않았습니다. QEMU 11.1의 STM32F405 머신(`netduinoplus2`)에도 RCC 모델(`hw/misc/stm32_rcc.c`)은 있지만, 파일 첫 주석대로 reset·enable 레지스터만 구현하고 나머지는 쓴 값을 저장만 합니다. `HSERDY` 같은 ready 비트를 세우지 않으므로 코드는 첫 `HSERDY` 대기에서 멈춥니다. 실제 보드에서 HSE가 발진하지 않을 때도 같은 자리에서 멈춥니다. 양산 코드라면 이 대기 루프에 timeout을 둡니다.

### 2) Jitter — 주기의 흔들림

이상적 클럭은 정확히 같은 간격으로 떨어집니다. 실제 클럭은 매 cycle 미세하게 떨립니다.

SiTime 앱노트 AN10007(Rev 1.21) 2절은 jitter의 주요 종류로 period·cycle-to-cycle·long-term·phase jitter·TIE를 듭니다. 아래는 그중 시간 영역의 세 가지입니다. period jitter와 cycle-to-cycle jitter의 정의는 JEDEC JESD65B를 따른다고 같은 문서가 적습니다.

| 종류 | AN10007의 정의 | 쓰임 (AN10007) |
| --- | --- | --- |
| Period jitter | 무작위로 고른 여러 cycle에서 cycle 길이가 이상적 주기에서 벗어난 정도. 실측에서는 평균 주기를 이상적 주기로 본다 | 디지털 시스템의 timing margin 계산 |
| Cycle-to-cycle | 인접한 두 cycle 길이의 차이. JESD65B는 표본을 1,000개 이상 요구 | spread spectrum 클럭의 안정성 확인 |
| Long-term | 연속한 여러 cycle 뒤 에지가 이상적 위치에서 누적해 벗어난 정도 | 그래픽·비디오 디스플레이, 장거리 텔레메트리 |

AN10007 2.1.1절의 예가 period jitter의 의미를 잘 보여 줍니다. 프로세서가 클럭 상승 1 ns 전에 데이터가 준비되기를 요구하는데 period jitter가 −1.5 ns면, 클럭 에지가 데이터가 유효해지기 전에 와 버려 잘못된 값을 읽습니다.

### 3) Clock skew

같은 클럭이 여러 곳에 분배될 때, 도착 시각이 다르면 그 차이가 skew입니다. PCB 트레이스 길이, FPGA 내부 라우팅, clock buffer 지연 등이 원인입니다.

![Clock skew from PCB trace length mismatch](/images/blog/modern-recipes/diagrams/part1-02-clock-skew.svg)

트레이스 지연은 유효 유전율 ε_eff로 정해집니다. 전파 속도가 c / √ε_eff이므로 단위 길이 지연은 √ε_eff / c입니다. ε_eff는 기판 재질과 microstrip·stripline 구조에 따라 정해지는 값이라, 아래는 값을 바꿔 가며 계산만 했습니다.

```text
eps_eff=3.0: 5.78 ns/m, 10 cm=0.578 ns, 5 cm=0.289 ns, skew=0.289 ns
eps_eff=4.0: 6.67 ns/m, 10 cm=0.667 ns, 5 cm=0.334 ns, skew=0.334 ns
eps_eff=4.3: 6.92 ns/m, 10 cm=0.692 ns, 5 cm=0.346 ns, skew=0.346 ns
```

그림은 ε_eff = 4를 가정한 줄입니다. 10 cm와 5 cm 트레이스의 길이 차 5 cm가 약 0.33 ns skew가 됩니다.

### 4) Setup time / Hold time

플립플롭이 데이터를 안정적으로 잡으려면 클럭 에지 직전·직후에 데이터가 변하지 않아야 합니다.

![Setup time / Hold time](/images/blog/modern-recipes/diagrams/part1-02-setup-hold.svg)

TI 앱노트 SCZA004A(*Metastability Performance of Clocked FIFOs*)는 이 창을 이렇게 설명합니다. 데이터는 클럭 전 setup time 동안, 클럭 뒤 hold time 동안 유효해야 출력이 예측대로 움직입니다. 그 창 안에서 데이터가 바뀌면 출력이 두 유효 레벨 사이의 중간 레벨로 가서 정해지지 않은 시간 동안 머물다가 high나 low로 정착하거나, 정상 전이가 그냥 늦어집니다. 이것이 metastability이고, 다음 단이 그 값을 써야 하는 시점까지 정착하지 못했을 때만 실패가 됩니다.

## 코드 / 실제 사용 예

클럭이 UART baud에 어떻게 번지는지 계산해 봅니다. STM32F4 USART의 BRR 값은 HAL v1.8.6 `stm32f4xx_hal_uart.h` 860~868행의 `UART_BRR_SAMPLING16()` 매크로가 만듭니다. 이 매크로는 USARTDIV = PCLK / (16 × baud)를 1/100 단위로 구해 정수부를 상위 12비트, 소수부 × 16을 반올림해 하위 4비트에 넣습니다. 그래서 BRR 값 자체가 16 × USARTDIV이고, 실제 baud는 PCLK / BRR입니다. 매크로를 그대로 복사해 호스트에서 돌리는 코드입니다.

```c
#include <stdio.h>
#include <stdint.h>
/* stm32f4xx_hal_uart.h (HAL v1.8.6) 860~868행 그대로 */
#define UART_DIV_SAMPLING16(_PCLK_, _BAUD_)            ((uint32_t)((((uint64_t)(_PCLK_))*25U)/(4U*((uint64_t)(_BAUD_)))))
#define UART_DIVMANT_SAMPLING16(_PCLK_, _BAUD_)        (UART_DIV_SAMPLING16((_PCLK_), (_BAUD_))/100U)
#define UART_DIVFRAQ_SAMPLING16(_PCLK_, _BAUD_)        ((((UART_DIV_SAMPLING16((_PCLK_), (_BAUD_)) - (UART_DIVMANT_SAMPLING16((_PCLK_), (_BAUD_)) * 100U)) * 16U)\
                                                         + 50U) / 100U)
/* UART BRR = mantissa + overflow + fraction
            = (UART DIVMANT << 4) + (UART DIVFRAQ & 0xF0) + (UART DIVFRAQ & 0x0FU) */
#define UART_BRR_SAMPLING16(_PCLK_, _BAUD_)            ((UART_DIVMANT_SAMPLING16((_PCLK_), (_BAUD_)) << 4U) + \
                                                        (UART_DIVFRAQ_SAMPLING16((_PCLK_), (_BAUD_)) & 0xF0U) + \
                                                        (UART_DIVFRAQ_SAMPLING16((_PCLK_), (_BAUD_)) & 0x0FU))

int main(void) {
    const uint32_t clks[] = { 8000000, 16000000, 42000000, 84000000 };
    const uint32_t bauds[] = { 9600, 115200 };
    for (unsigned i = 0; i < 4; i++)
        for (unsigned j = 0; j < 2; j++) {
            uint32_t brr = UART_BRR_SAMPLING16(clks[i], bauds[j]);
            double actual = (double)clks[i] / brr;   /* BRR = 16 x USARTDIV */
            printf("PCLK=%8u baud=%6u BRR=0x%04x (%5u) actual=%10.2f err=%+.3f%%\n",
                   clks[i], bauds[j], brr, brr, actual, 100.0 * (actual / bauds[j] - 1));
        }
    return 0;
}
```

`cc -O2 -Wall -o baud baud.c && ./baud` (Apple clang 21) 결과입니다.

```text
PCLK= 8000000 baud=  9600 BRR=0x0341 (  833) actual=   9603.84 err=+0.040%
PCLK= 8000000 baud=115200 BRR=0x0045 (   69) actual= 115942.03 err=+0.644%
PCLK=16000000 baud=  9600 BRR=0x0683 ( 1667) actual=   9598.08 err=-0.020%
PCLK=16000000 baud=115200 BRR=0x008b (  139) actual= 115107.91 err=-0.080%
PCLK=42000000 baud=  9600 BRR=0x1117 ( 4375) actual=   9600.00 err=+0.000%
PCLK=42000000 baud=115200 BRR=0x016c (  364) actual= 115384.62 err=+0.160%
PCLK=84000000 baud=  9600 BRR=0x222e ( 8750) actual=   9600.00 err=+0.000%
PCLK=84000000 baud=115200 BRR=0x02d9 (  729) actual= 115226.34 err=+0.023%
```

16 MHz에서 `16000000 / 9600`을 정수 나눗셈으로 자르면 1666(+0.04%)이지만 HAL은 반올림해 1667(−0.02%)을 씁니다. 위 168 MHz 설정의 APB1 42 MHz·APB2 84 MHz는 9600 baud를 오차 0으로 만듭니다. 8 MHz로 115200을 내면 +0.64%로, 아래 수신기 권장치 ±2.0%의 약 1/3을 나눗셈 오차만으로 씁니다.

그 예산이 얼마인지는 수신기 구조에서 나옵니다. Microchip ATmega328P 데이터시트(7810D) 19.8.3절은 16× 샘플링 수신기가 받아들일 수 있는 속도 비를 식으로 줍니다. D는 데이터+패리티 비트 수, S = 16, 다수결 샘플 위치 SF = 8, SM = 9입니다.

```python
S, SF, SM = 16, 8, 9
for D in (7, 8, 9):
    rs = (D+1)*S / (S-1+D*S+SF); rf = (D+2)*S / ((D+1)*S+SM)
    print(f'D={D}: Rslow={100*rs:.2f}% Rfast={100*rf:.2f}%  -> tolerable {100*(rf-1):+.2f}%/{100*(rs-1):+.2f}%')
```

```text
D=7: Rslow=94.81% Rfast=105.11%  -> tolerable +5.11%/-5.19%
D=8: Rslow=95.36% Rfast=104.58%  -> tolerable +4.58%/-4.64%
D=9: Rslow=95.81% Rfast=104.14%  -> tolerable +4.14%/-4.19%
```

데이터시트 Table 19-2는 8N1(D = 8)의 최대 총 오차를 +4.58/−4.54%로 적는데, 같은 표의 R_slow 95.36%와 식을 그대로 계산하면 −4.64%라 표 쪽 값이 0.1%p 다릅니다. 같은 표는 송신기와 수신기가 총 오차를 반씩 나눈다는 가정으로 **수신기 권장 최대 오차 ±2.0%**를 적습니다. 이 값은 AVR 수신기 기준이고, STM32 USART의 허용치는 그 레퍼런스 매뉴얼의 표를 봐야 합니다. 1-04에서 STM32H7 USART의 허용 오차를 다룹니다.

## 측정 / 비교

UART 예산이 정해지면 클럭 소스의 오차를 그 안에 맞춥니다. 위 계산에서 나눗셈 오차는 0~0.64%였으므로, 나머지가 발진기 몫입니다. 발진기 오차는 클럭 소스 종류의 일반값이 아니라 쓰는 부품 데이터시트의 정확도 항목(STM32F4 HSI라면 데이터시트의 HSI oscillator characteristics 표)으로 확인합니다. STM32F405/407 데이터시트(DS8626, DocID022152 Rev 4) Table 33은 공장 보정된 HSI 16 MHz의 정확도를 25 °C에서 ±1%, −10~85 °C에서 ±4%, −40~105 °C에서 −8~+4.5%로 적습니다. 25 °C 값만 써도 ±1% + 나눗셈 0.04%로 AVR 기준 수신기 권장 ±2.0% 안이지만, −40~105 °C 범위의 −8%는 총 허용치 −4.64%도 넘습니다. 넓은 온도에서 UART를 쓰려면 HSE가 필요하다는 결론이 숫자로 나옵니다.

jitter는 스코프로 잽니다. SiTime AN10007 3.2.1절의 period jitter 측정법(Method A)은 다음과 같습니다.

1. 스코프가 첫 cycle만이 아니라 화면 안의 모든 주기를 재도록 설정합니다.
2. 화면에 10,000 cycle이 들어오게 합니다. 100 MHz 클럭이면 100 µs, 10칸이므로 10 µs/div입니다.
3. 평균·표준편차·peak-to-peak를 기록합니다.
4. peak-to-peak는 상한이 없는 값이라 한 번으로는 정확하지 않으므로, 2~3단계를 25번 반복해 peak-to-peak의 평균을 냅니다.

## 자주 보는 함정

> ⚠️ 외부 크리스털 부하 커패시터 미스매치

Microchip AN826(DS00826A)에 따르면 parallel resonant 크리스털은 지정한 부하 용량 C_L에서 지정 주파수로 발진합니다. Pierce 발진기의 부하는 두 외부 커패시터의 직렬 합에 stray C_S를 더한 값, C_L = C2·C3 / (C2 + C3) + C_S입니다. 두 값을 같게 두면 C2 = C3 = 2 × (C_L − C_S)이고, AN826은 C_S를 2~5 pF로 잡으라고 적습니다. AN826의 예시 크리스털처럼 C_L = 13 pF이고 C_S = 5 pF면 커패시터는 16 pF입니다. 회로 부하가 C_L과 다르면 지정 주파수에서 발진하지 않고, 커패시터를 키우면 주파수가 series resonant 쪽으로 내려갑니다. 커패시터가 크면 안정성은 좋아지지만 loop gain이 줄어 시동 문제가 생길 수 있다고 같은 문서가 적습니다.

> ⚠️ HSI로 부팅한 채 그대로 동작

STM32F4는 reset 뒤 HSI로 시작합니다. `cmsis_device_f4`의 `system_stm32f4xx.c`도 `SystemCoreClock`의 초깃값을 16000000(`HSI_VALUE`)으로 둡니다(137행). PLL 전환 코드가 빠지면 클럭이 16 MHz에 머물고, 168 MHz를 기대한 코드는 16/168, 약 1/10.5 속도로 돕니다.

> ⚠️ PLL lock 대기 누락

위 코드는 `PLLRDY`를 기다린 뒤 SW를 바꾸고, 다시 `SWS`가 PLL을 가리킬 때까지 기다립니다. HAL도 같은 순서를 밟습니다. `HAL_RCC_OscConfig()`는 PLL을 켠 뒤 `PLLRDY`가 설 때까지 기다리고, `HAL_RCC_ClockConfig()`는 SW를 바꾼 뒤 `SWS`를 확인합니다.

> ⚠️ Flash wait state 미설정

STM32CubeF4 예제는 168 MHz·3.3 V에서 Flash latency 5 WS를 씁니다. HAL v1.8.6 `HAL_RCC_ClockConfig()`의 주석도 클럭을 올릴 때는 latency를 먼저 늘리고, 내릴 때는 클럭을 바꾼 뒤 줄이라는 순서를 따릅니다. 위 코드가 `FLASH->ACR`을 가장 먼저 쓰는 이유입니다.

## 정리

- STM32F4의 168 MHz 설정은 HSE 8 MHz ÷ 8 × 336 ÷ 2이고, Flash 5 WS를 먼저 설정합니다(STM32CubeF4 예제).
- Jitter는 period·cycle-to-cycle·long-term으로 나누고, period jitter는 10,000 cycle × 25회로 잽니다(SiTime AN10007).
- Setup/hold 창 안에서 데이터가 바뀌면 metastability가 생기고, 다음 단이 쓰기 전에 정착하지 못할 때 실패가 됩니다(TI SCZA004A).
- UART 오차 예산은 수신기 구조에서 나옵니다. AVR 8N1은 총 +4.58/−4.64%, 수신기 권장 ±2.0%이고, BRR 나눗셈만으로 0.64%를 쓸 수 있습니다.
- 크리스털 커패시터는 C = 2 × (C_L − C_S)로 고르고 C_S는 2~5 pF로 잡습니다(Microchip AN826).

다음 편에서는 **GPIO 내부 구조**를 다룹니다. 가장 단순해 보이는 디지털 I/O의 실제 회로입니다.

## 관련 항목

- [1-01: 디지털 신호 기초](/blog/embedded/modern-recipes/part1-01-digital-signal-basics)
- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- 더 깊이 — [Practical RTOS Internals 2-08: RTOS Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
