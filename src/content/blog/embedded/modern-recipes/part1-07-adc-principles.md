---
title: "ADC 동작 원리 — SAR·Sigma-Delta 비교"
slug: "embedded/modern-recipes/part1-07-adc-principles"
date: 2026-04-10T09:07:00
description: "Sampling·quantization·SNR·ENOB의 기본, SAR와 Σ-Δ를 8채널 처리량·ENOB·입력 필터로 비교, STM32F407 내장 ADC의 source 저항과 sampling time 계산."
series: "Modern Embedded Recipes"
seriesOrder: 7
tags: [recipes, adc, hw-basics]
draft: false
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"비트 수는 SNR의 상한만 정하고, 실제 선택은 채널당 rate와 source 저항이 정합니다."** 여러 채널을 빠르게 돌리면 SAR, 채널당 rate가 낮아도 되고 노이즈가 작아야 하면 Σ-Δ이며, MCU 내장 SAR는 sampling cycle 수가 허용 source 저항을 정합니다.

이 글은 세 가지를 답합니다. 비트 수가 SNR을 얼마나 정하는가, SAR와 Σ-Δ 중 무엇을 고르는가, MCU 내장 SAR에 source를 직결해도 되는가. 옴의 법칙과 RC 시정수는 안다고 가정합니다. 인용한 자료의 판과 링크는 「참고 자료」에 모았습니다.

## 핵심 개념

### Sampling과 Nyquist

연속 신호를 일정 간격으로 sampling해 이산 신호로 만듭니다. 대역 제한된 신호를 복원하려면 sampling rate가 신호 최대 주파수의 2배보다 높아야 합니다.

이 조건을 어기면 없던 신호가 보입니다. 주파수 f인 성분을 rate f_s로 sampling하면 |f − k·f_s|(k는 정수)에 있는 성분과 구별되지 않습니다. 1 kHz sine을 1.5 kHz로 sampling하면 |1 − 1.5| = 0.5 kHz의 가짜 신호로 보입니다. 그래서 SAR 앞에는 f_s/2 위 성분을 줄이는 아날로그 LPF를 둡니다.

### Quantization과 SNR

N-bit ADC는 입력 범위를 2^N 단계로 나눕니다. 양자화 오차만 있는 이상적인 ADC에 full-scale sine을 넣었을 때 SNR은 다음과 같습니다.

SNR (dB) = 6.02 × N + 1.76

실제 ADC의 노이즈와 왜곡까지 포함한 SINAD를 이 식의 SNR 자리에 넣고 N을 풀면 ENOB, 곧 "몇 비트짜리 이상적 ADC와 같은가"가 나옵니다(SBAS343C의 ENOB 정의 SINAD = 6.02 × ENOB + 1.76).

| 비트 수 | 이론 SNR | 이 글의 예 |
| ---: | ---: | --- |
| 12 | 74.0 dB | STM32F407 내장 ADC |
| 16 | 98.1 dB | ADS8326 |
| 24 | 146.2 dB | ADS1256 |

이 표는 이상적인 ADC의 상한입니다. 부품별 실제 ENOB는 [SAR vs Sigma-Delta](#sar-vs-sigma-delta)의 비교 표에 있습니다.

### SAR vs Sigma-Delta

**SAR.** 입력을 sampling 커패시터에 잡아 두고 비교기로 한 비트씩 결정합니다. ADS8326은 capacitive redistribution 구조라 sample-and-hold가 내장돼 있습니다. 변환에 16 DCLOCK, sampling까지 포함한 한 주기에 최소 22 DCLOCK이 필요합니다. 250 kSPS 특성 조건은 f_DCLOCK = 24 × f_SAMPLE = 6 MHz여서, 167 ns마다 한 비트를 결정하고 한 주기는 24 DCLOCK = 4 µs입니다(SBAS343C 전기적 특성 표 머리글, serial interface timing 그림 주석 1, Layout 절). 한 sample의 결과는 그 주기 안에 나옵니다.

**Σ-Δ.** modulator가 입력을 빠르게 oversampling하고, 뒤의 디지털 필터가 평균을 내서 해상도를 얻습니다. ADS1256은 4차 Δ-Σ modulator와 프로그래머블 디지털 필터로 되어 있고, 데이터 레이트를 낮춰 평균을 늘릴수록 노이즈가 줄어듭니다(SBAS288K Noise Performance 절). 대가는 채널을 바꿀 때의 지연입니다. 30 kSPS로 설정해도 입력 multiplexer를 바꿔 가며 채널을 순환하면 정착된 데이터는 4374 Hz로 나옵니다(SBAS288K Table 14, f_CLKIN = 7.68 MHz, 3-byte WREG, f_SCLK = f_CLKIN/4).

세 부품을 같은 질문, "8채널을 돌리면 채널당 몇 sample인가"로 놓으면 다음과 같습니다.

| 부품 (구조, 해상도) | 단일 채널 최대 rate | 8채널 순환 시 채널당 rate | ENOB (데이터시트 typ, 조건) |
| --- | --- | --- | --- |
| STM32F407 (내장 SAR, 12 bit) | 2 MS/s (f_ADC = 30 MHz, t_S = 3 cycles, single ADC) | 138.9 kS/s (t_S = 15 cycles: 30 MHz ÷ (27 cycles × 8)) | TBD |
| ADS8326 (외장 SAR, 16 bit) | 250 kS/s | 해당 없음 (입력 1쌍) | 14.69 (SINAD 90 dB, I grade, 5 V_PP 2 kHz sine, V_REF = 5 V, f_SAMPLE = 250 kHz) |
| ADS1256 (Σ-Δ, 24 bit) | 30 kS/s | 546.75 S/s (Table 14의 4374 Hz ÷ 8) | 19.8 (입력 단락 rms 노이즈 기준, 30 kSPS, PGA 1, buffer on, V_REF = 2.5 V, AVDD = 5 V, 25 °C) |

- STM32F407의 단일 채널 rate는 DS8626 Rev 12 Table 67 값입니다. 8채널 값은 RM0090의 T_conv = sampling time + 12 cycles를 채널 수만큼 더해 이 글이 계산했습니다. scan mode는 한 채널 변환이 끝나면 다음 채널을 자동으로 변환합니다(RM0090 13.3.8). 15 cycles를 고른 이유는 [Source impedance와 sampling time](#source-impedance와-sampling-time)에 있습니다. DS8626에는 ENOB나 SINAD 항목이 없어서 TBD로 뒀습니다.
- ENOB 두 값은 정의가 다릅니다. ADS8326은 SINAD에서 구한 값이고(10 kHz 입력에서는 14.28), ADS1256은 입력을 단락하고 잰 rms 노이즈로 ln(FSR / rms noise) / ln 2를 계산한 값입니다(SBAS288K Table 2). 왜곡이 들어가지 않은 값이라 ADS8326과 같은 잣대로 비교할 수 없습니다. 데이터시트의 ENOB를 비교하기 전에 어느 정의인지부터 봅니다.

8채널이면 채널당 rate는 F407이 ADS1256의 약 254배입니다. 입력 필터 요구도 다릅니다. F407을 위 조건으로 돌리면 채널당 f_s/2가 69.4 kHz이므로, 그 위를 줄이는 아날로그 LPF가 채널마다 필요합니다. ADS1256은 디지털 필터가 30 kSPS 설정에서 −3 dB 대역폭 6106 Hz의 LPF로 동작하고(SBAS288K Table 12), 이 응답이 modulator rate f_CLKIN/4(1.92 MHz)의 배수마다 반복됩니다. 데이터시트는 그 반복 주파수 위에 큰 노이즈가 있으면 외부 필터로 제거하라고 하고, 그 필터를 간단한 RC 필터로 할 수 있다고 적습니다(SBAS288K Figure 25).

그래서 채널마다 수십 kS/s 이상이 필요하면 SAR를, 채널당 수백 S/s로 충분하고 노이즈 기준 ENOB 19.8 수준이 필요하면 Σ-Δ를 고릅니다.

### Source impedance와 sampling time

SAR는 sampling 시간 안에 내부 커패시터 C_ADC를 입력 전압까지 충전해야 합니다. 충전 경로는 source 저항 R_AIN과 sampling switch 저항 R_ADC를 거치므로, sampling 시간이 짧을수록 허용되는 R_AIN이 작아집니다.

STM32F405/407 데이터시트 DS8626 Rev 12는 오차 1/4 LSB 이내를 기준으로 다음 식(Equation 1)을 줍니다. k는 `ADC_SMPRx`로 고른 sampling cycle 수이고 N = 12입니다.

R_AIN = (k − 0.5) / (f_ADC × C_ADC × ln(2^(N+2))) − R_ADC

Table 67의 입력값에는 조건이 붙어 있습니다. C_ADC는 4 pF typ입니다. R_ADC는 최대값 6 kΩ만 있고, 그 값은 V_DD = 1.8 V 조건입니다(3.3 V 값은 비어 있음). f_ADC 최대는 V_DDA 1.8~2.4 V에서 18 MHz, 2.4~3.6 V에서 36 MHz(typ 30 MHz)이고, V_DDA는 V_DD에 연결해야 합니다(DS8626 3.14절). 그래서 R_ADC = 6 kΩ과 f_ADC = 30 MHz는 한 칩에서 함께 성립하지 않습니다. 아래 표는 두 동작점을 따로 계산했습니다. 변환 시간은 RM0090 Rev 22 13.5절의 T_conv = sampling time + 12 cycles입니다.

| sampling (cycles) | R_AIN 상한 (V_DD = V_DDA = 1.8 V, f_ADC = 18 MHz, R_ADC = 6 kΩ) | R_AIN + R_ADC 상한 (V_DDA 2.4~3.6 V, f_ADC = 30 MHz) | T_conv @ 30 MHz |
| ---: | ---: | ---: | ---: |
| 3 | 음수: 만족하지 못함 | 2.1 kΩ | 0.5 µs |
| 15 | 14.8 kΩ | 12.5 kΩ | 0.9 µs |
| 28 | 33.4 kΩ | 23.6 kΩ | 1.33 µs |
| 56 | 50 kΩ (식은 73.4 kΩ, Table 67의 R_AIN max 50 kΩ이 상한) | 47.7 kΩ | 2.27 µs |
| 84 이상 | 50 kΩ (R_AIN max) | 50 kΩ (R_AIN max) | 3.2 µs 이상 |

1.8 V 동작점에서 3 cycles는 R_AIN = 0이어도 1/4 LSB 기준을 만족하지 못합니다. R_ADC 하나만으로 상한을 넘기 때문에 op-amp buffer로 source 저항을 낮춰도 이 행은 살아나지 않습니다. buffer가 살리는 것은 15·28 cycles 행입니다. source 저항이 14.8 kΩ보다 큰 센서도 buffer를 거치면 15 cycles를 쓸 수 있습니다.

30 MHz 동작점은 R_AIN과 R_ADC의 합만 정해집니다. 3 cycles에서는 합이 2.1 kΩ 이하여야 하는데, DS8626이 3.3 V의 R_ADC를 주지 않으므로 buffer를 달아도 3 cycles가 이 기준을 만족하는지는 이 데이터시트로 판정할 수 없습니다. 비교 표의 8채널 계산에 15 cycles를 쓴 것은 이 때문입니다.

## 코드 / 실제 사용 예

STM32F407에서 PA0(ADC123_IN0)을 ADC1로 한 번 변환하는 bare-metal 코드입니다. 레지스터 이름은 [cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)에 있는 매크로입니다. 클럭 트리는 다른 곳에서 HCLK = 120 MHz, PCLK2 = 60 MHz로 맞춰 두었고 V_DDA는 2.4~3.6 V라고 가정합니다. PCLK2 = 60 MHz는 DS8626 Table 68과 RM0090 13.5절 예제의 조건입니다.

```c
#include "stm32f407xx.h"

#define HCLK_HZ       120000000u   /* assumed core clock */
#define ADC_TSTAB_US  3u           /* DS8626 Table 67: tSTAB max */

void adc_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    GPIOA->MODER |= GPIO_MODER_MODER0;              // PA0 = analog mode (0b11)

    RCC->APB2ENR |= RCC_APB2ENR_ADC1EN;

    ADC123_COMMON->CCR &= ~ADC_CCR_ADCPRE;          // ADCPRE = 00: ADCCLK = PCLK2 / 2 = 30 MHz
    ADC1->CR2   = 0;
    ADC1->SQR1  = 0;                                // L = 0: 1 conversion
    ADC1->SQR3  = 0;                                // 1st conversion = channel 0
    ADC1->SMPR2 = (0b111 << ADC_SMPR2_SMP0_Pos);    // 480 cycles

    ADC1->CR2 |= ADC_CR2_ADON;
    // each iteration takes at least one HCLK cycle: 360 cycles = 3 us at 120 MHz
    for (volatile uint32_t i = 0; i < ADC_TSTAB_US * (HCLK_HZ / 1000000u); i++) { }
}

uint16_t adc_read(void) {
    ADC1->CR2 |= ADC_CR2_SWSTART;
    while (!(ADC1->SR & ADC_SR_EOC)) { }
    return (uint16_t)ADC1->DR;                      // reading DR clears EOC
}

float adc_to_volt(uint16_t code, float vref) {
    return code * vref / 4096.0f;                   // 1 LSB = VREF+ / 2^12
}
```

- `ADCPRE`는 `ADC_CCR`의 17:16 비트이고 00이 PCLK2/2입니다(RM0090 13.13.16). 클럭이 다르면 f_ADC가 Table 67 최대값을 넘지 않게 고릅니다. HCLK 168 MHz, APB2 84 MHz(DS8626의 APB2 최대)에서 /2는 42 MHz로 V_DDA 2.4~3.6 V의 최대 36 MHz를 넘으므로 /4(21 MHz)를 씁니다.
- PA0을 analog mode로 두면 출력 버퍼, Schmitt trigger, pull-up/down이 꺼집니다(RM0090 8.3.12).
- `0b111`은 480 cycles입니다(RM0090 13.13.5 `ADC_SMPR2`). R_AIN 상한이 Table 67의 50 kΩ까지 올라가는 대신, 30 MHz에서 T_conv는 492 cycles = 16.4 µs입니다(Table 67 t_CONV 최대값과 같음).
- ADON 뒤 첫 변환 전에 power-up time t_STAB(Table 67 최대 3 µs)을 기다립니다. 반복 한 번이 HCLK 한 cycle 이상 걸리므로 360회 반복은 120 MHz에서 3 µs 이상입니다.
- 1 LSB = V_REF+/2^n는 DS8626 Figure 49의 정의입니다. 그래서 4095가 아니라 4096으로 나눕니다.

연속 변환을 DMA로 메모리에 쌓는 코드는 [4-10: 임베디드 DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)의 "ADC → memory" 절에 있습니다.

## 자주 보는 함정

> ⚠️ V_REF+ 디커플링 누락

변환 결과는 기준 전압에 대한 비율이라 V_REF+가 부하에 따라 흔들리지 않아야 합니다(AN2834 4.2.2절). AN2834 4.2.1절 본문은 100/144-pin 패키지에서 V_REF+에 별도 기준 전압을 넣으면 이 핀에 10 nF와 1 µF, 두 커패시터를 달아야 한다고 적고, V_REF+를 2.4 V와 V_DDA 사이에 두라고 합니다. 같은 절의 Figure 20은 V_REF+ 쪽에 1 µF // 100 nF, V_DDA 쪽에 1 µF // 10 nF를 그려서 V_REF+ 값이 본문과 다릅니다.

> ⚠️ 채널을 바꾼 직후의 잔류 전하

sampling switch가 닫히면 sampling 커패시터에 남은 전하가 입력 핀으로 넘어가 source 저항을 거쳐 방전되고, sampling 시간이 끝날 때 남은 전압이 결과에 더해집니다(AN2834 4.4.2절). 채널을 순환하면 이전 채널 전압이 이 잔류 전하가 됩니다. AN2834 4.4.3절은 이 오차를 1/2 LSB 이내로 묶는 식 T_S ≥ f_ADC × R_in × C_sh × ln(2^(N+1))을 줍니다. [Source impedance와 sampling time](#source-impedance와-sampling-time)의 표는 더 엄격한 DS8626 1/4 LSB 기준입니다. Equation 1의 ln(2^(N+2))를 ln(2^(N+1))로 바꾸면 R_AIN + R_ADC 상한이 14/13배가 됩니다. sampling cycle은 채널마다 따로 정할 수 있으므로(RM0090 13.5절) source 저항이 큰 채널만 표에 맞춰 늘립니다.

> ⚠️ Analog/digital ground를 여러 점에서 연결

AN2834 4.2.13절은 analog ground와 digital ground를 star 구조로 한 점에서만 연결하라고 권합니다. 디지털 스위칭 노이즈와 전류 서지가 analog 전원 회로로 들어가는 것을 막기 위해서입니다.

## 정리

- 비트 수는 SNR 상한(12 bit에서 74.0 dB)만 정합니다. 부품 비교는 정의가 같은 ENOB끼리 합니다.
- 여러 채널을 돌릴 때는 채널당 rate로 비교합니다. 숫자는 [SAR vs Sigma-Delta](#sar-vs-sigma-delta)의 비교 표에 있습니다.
- MCU 내장 SAR는 sampling cycle 수가 허용 source 저항을 정합니다. buffer는 15·28 cycles 행을 살리고, 1.8 V의 3 cycles는 살리지 못합니다.

다음 편에서는 **DAC 동작 원리**를 다룹니다. ADC의 반대 방향입니다.

## 참고 자료

TI 링크(`/lit/ds/symlink/`)는 항상 최신판을 열고, ST 링크도 판이 고정되지 않습니다. 이 글은 아래 판을 기준으로 2026-10-11에 확인했습니다.

- STMicroelectronics, [DS8626 STM32F405xx/STM32F407xx 데이터시트](https://www.st.com/resource/en/datasheet/stm32f407vg.pdf), Rev 12(2026-03). Table 67, Equation 1, Table 68, Figure 49, 3.14절.
- STMicroelectronics, [RM0090 참조 매뉴얼](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf), Rev 22(2026-05). 8.3.12, 13.3.8, 13.5, 13.13.5, 13.13.16절.
- STMicroelectronics, [AN2834 How to optimize the ADC accuracy in the STM32 MCUs](https://www.st.com/resource/en/application_note/an2834-how-to-improve-adc-accuracy-when-using-stm32f2xx-and-stm32f4xx-microcontrollers-stmicroelectronics.pdf), Rev 10(2024-10). 링크 주소에는 옛 제목이 남아 있습니다. 4.2.1·4.2.2·4.2.13·4.4.2·4.4.3절, Figure 20.
- Texas Instruments, [ADS8326 데이터시트](https://www.ti.com/lit/ds/symlink/ads8326.pdf), SBAS343C(2009-09 개정). 전기적 특성 표, serial interface timing 그림 주석, ENOB 정의, Layout 절.
- Texas Instruments, [ADS1255/ADS1256 데이터시트](https://www.ti.com/lit/ds/symlink/ads1256.pdf), SBAS288K(2013-09 개정). Noise Performance 절, Table 2, Table 12, Table 14, Figure 25.
- STMicroelectronics, [cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h). 레지스터 매크로.

## 관련 항목

- 이전 편: [1-06: I2C 하드웨어 분석](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- 다음 편: [1-08: DAC 동작 원리](/blog/embedded/modern-recipes/part1-08-dac-principles)
- [1-09: PWM 신호 생성 분석](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [4-10: 임베디드 DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics) — ADC 연속 변환을 DMA circular mode로 받는 예제
