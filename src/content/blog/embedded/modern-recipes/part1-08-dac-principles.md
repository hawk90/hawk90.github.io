---
title: "DAC 동작 원리 — R-2R Ladder·Sigma-Delta·Settling Time"
slug: "embedded/modern-recipes/part1-08-dac-principles"
date: 2026-04-10T09:08:00
description: "R-2R 저항 오차와 DNL·단조성, 1차 Σ-Δ modulator, zero-order hold 감쇠를 계산으로 보이고, STM32F407 DAC를 TIM6+DMA로 돌리는 코드를 데이터시트·HAL 근거와 함께 빌드합니다."
series: "Modern Embedded Recipes"
seriesOrder: 8
tags: [recipes, dac, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DAC는 디지털 숫자를 연속 전압으로 펴는 장치입니다."** 출력은 계단 모양이고, reconstruction filter로 매끈하게 만듭니다.

## 어떤 상황에서 쓰나

- 오디오 출력 (speaker, headphone)
- Analog 제어 신호 (밸브, 모터 reference)
- Function generator, waveform 생성
- Calibration용 정밀 전압 생성

## 핵심 개념

### 1) R-2R Ladder

가장 직관적인 DAC 구조입니다. R과 2R 저항 망으로 binary-weighted 전류를 합칩니다.

![R-2R Ladder DAC 구조](/images/blog/modern-recipes/diagrams/part1-08-r2r-ladder.svg)

각 비트가 1이면 2R 저항이 V_REF로 연결되고, 0이면 GND로 연결됩니다. 어느 노드에서 LSB 쪽을 들여다봐도 저항이 2R로 보이도록 짜여 있어서, 비트 하나가 출력에 주는 몫이 한 칸 올라갈 때마다 정확히 두 배가 됩니다. 무부하 출력은 V_REF × code / 2^N입니다.

이 "정확히 두 배"는 저항이 공칭값일 때만 성립합니다. 저항 오차가 정확도를 얼마나 깎는지 보려고, 12비트 R-2R을 노드마다 Thevenin 등가로 줄여 4096개 코드의 출력을 모두 계산하는 스크립트를 짰습니다. 저항마다 표준편차 σ의 가우스 오차를 주고(seed 1~3), 이웃 코드 간 계단 크기에서 DNL을 구했습니다.

```python
def ladder(code, R, R2, R2t, vref=1.0, n=12):
    vth, rth = 0.0, R2t                     # LSB end: 2R termination to GND
    for i in range(n):
        v = vref if (code >> i) & 1 else 0.0
        g1, g2 = 1 / rth, 1 / R2[i]
        vth, rth = (vth * g1 + v * g2) / (g1 + g2), 1 / (g1 + g2)
        if i < n - 1:
            rth += R[i]                     # series R to next node
    return vth
```

`python3 r2r.py` 결과입니다.

```text
ideal: max|DNL|=0.00e+00 LSB monotonic=True
sigma=0.01% seed=1: max|DNL|=0.186 LSB, worst -0.076 at code 0x3FF->0x400, monotonic=True
sigma=0.01% seed=2: max|DNL|=0.164 LSB, worst -0.164 at code 0x7FF->0x800, monotonic=True
sigma=0.01% seed=3: max|DNL|=0.406 LSB, worst -0.000 at code 0xF4C->0xF4D, monotonic=True
sigma=0.10% seed=1: max|DNL|=1.860 LSB, worst -0.759 at code 0xBFF->0xC00, monotonic=True
sigma=0.10% seed=2: max|DNL|=1.640 LSB, worst -1.640 at code 0x7FF->0x800, monotonic=False
sigma=0.10% seed=3: max|DNL|=4.063 LSB, worst -0.005 at code 0x492->0x493, monotonic=True
sigma=1.00% seed=1: max|DNL|=18.561 LSB, worst -7.536 at code 0xBFF->0xC00, monotonic=False
sigma=1.00% seed=2: max|DNL|=16.435 LSB, worst -16.435 at code 0x7FF->0x800, monotonic=False
sigma=1.00% seed=3: max|DNL|=40.754 LSB, worst -0.048 at code 0xD82->0xD83, monotonic=True
```

σ = 0.01%면 세 번 모두 |DNL|이 0.41 LSB 이하이고 단조입니다. σ = 0.1%에서는 seed 2가 0x7FF → 0x800에서 DNL −1.64 LSB로 출력이 오히려 내려가고, σ = 1%에서는 DNL이 수십 LSB까지 벌어집니다. 가장 나쁜 계단이 0x7FF → 0x800, 0x3FF → 0x400, 0xBFF → 0xC00처럼 하위 비트가 한꺼번에 뒤집히는 코드에 몰리는 것도 보입니다. 이 코드에서는 MSB 쪽 가지 하나가 켜지고 나머지가 모두 꺼지므로, 큰 가지의 오차가 그대로 계단 크기에 실립니다.

### 2) Sigma-Delta DAC

Σ-Δ DAC는 입력 샘플을 OSR배로 보간한 뒤, modulator가 그 값을 1-bit 펄스열로 바꾸고, 아날로그 LPF가 펄스열을 평균 내 연속 전압으로 만듭니다.

![Σ-Δ DAC 신호 흐름 — 입력 코드, oversampling 보간, Σ-Δ modulator의 1-bit 출력, 아날로그 LPF, 연속 전압](/images/blog/modern-recipes/diagrams/part1-08-sigma-delta-chain.svg)

1-bit 출력이 어떻게 여러 비트의 값을 담는지는 가장 단순한 1차 modulator로 볼 수 있습니다. 매 클럭마다 입력과 직전 출력(±1)의 차이를 적분하고, 적분값의 부호를 다음 출력으로 냅니다.

```python
def modulate(xs):
    integ, y, out = 0.0, 0.0, []
    for x in xs:
        integ += x - y                 # integrate the error
        y = 1.0 if integ >= 0 else -1.0
        out.append(y)
    return out
```

DC 입력 세 개와, 0.5 FS sine을 OSR 64로 변조한 뒤 64개씩 단순 평균한 결과입니다(`python3 sd.py`).

```text
DC +0.0: first 16 bits 1010101010101010, mean of 4096 = +0.0000
DC +0.3: first 16 bits 1011011011010110, mean of 4096 = +0.2998
DC -0.7: first 16 bits 0001000001000000, mean of 4096 = -0.7002
sine 0.5 FS, OSR 64, boxcar decimation: rms error 0.0132 FS, max 0.0302 FS
```

+0.3을 넣으면 1이 0보다 조금 많은 펄스열이 나오고, 4096개 평균이 +0.2998입니다. 입력 크기가 펄스의 밀도로 바뀐 것입니다. 단순 평균은 가장 거친 LPF라 sine에서는 FS의 1.3% rms 오차가 남습니다. 이 오차를 줄이는 것이 고차 modulator와 더 가파른 디지털·아날로그 필터의 몫입니다. 1-bit 출력은 레벨이 둘뿐이라 R-2R처럼 가지 사이의 저항 비가 계단 크기를 정하지 않습니다.

### 3) Monotonicity와 DNL

단조성은 입력 코드가 커질 때 출력이 줄어들지 않는 성질입니다. DNL은 이웃 코드 사이 계단이 이상적인 1 LSB에서 벗어난 양이므로 실제 계단은 (1 + DNL) LSB이고, DNL이 −1 LSB보다 크면 계단이 양수라 단조가 보장됩니다. 위 R-2R 계산에서 단조가 깨진 경우가 모두 DNL < −1인 것도 이 때문입니다. 반대로 DNL이 +1을 넘는 것은 단조성과 무관하고 계단이 큰 것입니다.

데이터시트를 읽을 때는 두 값을 함께 봅니다. STM32F405/407 데이터시트(DS8626, DocID022152 Rev 4) Table 74는 내장 DAC의 DNL을 12비트 구성에서 최대 ±2 LSB, 10비트 구성에서 ±0.5 LSB로 적고, 같은 데이터시트의 기능 개요는 "8-bit or 12-bit monotonic output"이라고 적습니다. ±2 LSB라는 DNL 한계만으로는 단조성이 따라 나오지 않으므로, 단조성은 별도로 명시된 특성으로 읽어야 합니다. TI DAC8552(SLAS430A)는 DNL을 "16-bit monotonic" 조건에서 typ ±0.35, max ±1 LSB로 적습니다.

### 4) Glitch energy

DAC 출력이 코드를 바꿀 때 순간적인 spike가 나옵니다. 바뀌는 비트가 많을수록 내부 스위치가 같은 순간에 바뀌지 않는 영향이 커지므로, 데이터시트는 모든 하위 비트가 뒤집히는 major carry(16비트에서 0x7FFF → 0x8000)를 기준으로 glitch를 적습니다. TI DAC8552(SLAS430A)는 "Code change glitch impulse"를 "1LSB change around major carry" 조건에서 0.15 nV-s로 적습니다. 단위가 nV-s인 것은 glitch를 전압 × 시간의 면적으로 재기 때문입니다.

![DAC code transition glitch then settling](/images/blog/modern-recipes/diagrams/part1-08-dac-glitch.svg)



### 5) Reconstruction filter

DAC 출력은 새 코드가 올 때까지 값을 유지하는 계단(zero-order hold)입니다. 계단에는 샘플링 주파수 f_s 주변에 원래 신호의 image가 되풀이되어 있으므로, 후단 LPF로 f_s/2 위를 걸러 냅니다. 48 kHz로 갱신하면 f_s/2는 24 kHz입니다.

계단 자체도 대역 안 신호를 깎습니다. 폭 T = 1/f_s의 hold는 주파수 응답이 sin(πf/f_s) / (πf/f_s)입니다. f_s = 48 kHz로 계산하면 다음과 같습니다.

```text
ZOH sinc droop at 1000 Hz (fs 48000): -0.01 dB
ZOH sinc droop at 10000 Hz (fs 48000): -0.63 dB
ZOH sinc droop at 20000 Hz (fs 48000): -2.64 dB
ZOH sinc droop at 24000 Hz (fs 48000): -3.92 dB
```

20 kHz 성분은 계단만으로 2.6 dB 줄어듭니다. 오디오 대역 끝까지 평탄하게 내려면 이 감쇠를 디지털 필터로 미리 보정하거나, 앞 절의 Σ-Δ처럼 f_s를 올려 같은 주파수의 πf/f_s를 작게 만듭니다.

## 코드 / 실제 사용 예

STM32F407 내장 DAC1(PA4)로 750 Hz sine을 내는 코드입니다. TIM6의 update 이벤트가 48 kHz마다 DAC를 트리거하고, DMA가 64개짜리 표를 순환하며 `DHR12R1`에 넣으므로 CPU는 시작한 뒤 관여하지 않습니다. 48000 / 64 = 750 Hz입니다.

설정값의 근거는 다음과 같습니다. DAC1의 DMA 요청이 DMA1 Stream5 Channel 7이라는 것은 STM32CubeF4 `STM324xG_EVAL/Examples/DAC/DAC_SignalsGeneration`의 `main.h`(`DACx_DMA_STREAM1`, `DACx_DMA_CHANNEL1`)에서, TIM6 TRGO 트리거가 `TSEL1` = 000이라는 것은 HAL v1.8.6 `stm32f4xx_hal_dac.h` 173행(`DAC_TRIGGER_T6_TRGO`가 `DAC_CR_TEN1`만 켬)에서, update 이벤트를 TRGO로 내는 `MMS` = 010은 `stm32f4xx_hal_tim.h` 868행(`TIM_TRGO_UPDATE` = `TIM_CR2_MMS_1`)에서 가져왔습니다. TIM6 입력 클럭 84 MHz는 DS8626 Table 51의 "AHB/APB1 prescaler distinct from 1, f_TIMxCLK = 84 MHz" 조건(1-02의 APB1 = 42 MHz 설정)입니다. 원래 글은 `TSEL1` = 101을 "TIM2"라고 적었는데, HAL 171행에 따르면 101은 TIM4이고 TIM2는 100입니다.

```c
#include "stm32f407xx.h"

#define TIM6CLK_HZ  84000000u     /* PCLK1 42 MHz, APB1 prescaler /4 (DS8626 Table 51) */
#define FS_HZ       48000u        /* DAC update rate */

/* round(2048 + 2047*sin(2*pi*i/64)), i = 0..63 */
static const uint16_t sine_table[64] = {
    2048, 2249, 2447, 2642, 2831, 3013, 3185, 3347,
    3495, 3630, 3750, 3853, 3939, 4007, 4056, 4085,
    4095, 4085, 4056, 4007, 3939, 3853, 3750, 3630,
    3495, 3347, 3185, 3013, 2831, 2642, 2447, 2249,
    2048, 1847, 1649, 1454, 1265, 1083,  911,  749,
     601,  466,  346,  243,  157,   89,   40,   11,
       1,   11,   40,   89,  157,  243,  346,  466,
     601,  749,  911, 1083, 1265, 1454, 1649, 1847
};

void dac_sine_start(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_DMA1EN;
    RCC->APB1ENR |= RCC_APB1ENR_DACEN | RCC_APB1ENR_TIM6EN;
    GPIOA->MODER |= GPIO_MODER_MODER4;              /* PA4 = analog (DAC_OUT1) */

    /* DMA1 Stream5 Channel7 = DAC1 (STM32CubeF4 DAC_SignalsGeneration) */
    DMA1_Stream5->CR   = 0;
    while (DMA1_Stream5->CR & DMA_SxCR_EN) { }
    DMA1_Stream5->PAR  = (uint32_t)&DAC->DHR12R1;
    DMA1_Stream5->M0AR = (uint32_t)sine_table;
    DMA1_Stream5->NDTR = 64;
    DMA1_Stream5->CR   = (7u << DMA_SxCR_CHSEL_Pos)     /* channel 7 */
                       | DMA_SxCR_MSIZE_0 | DMA_SxCR_PSIZE_0   /* 16-bit */
                       | DMA_SxCR_MINC | DMA_SxCR_CIRC
                       | DMA_SxCR_DIR_0                 /* memory -> peripheral */
                       | DMA_SxCR_EN;

    /* TIM6 TRGO = update event -> DAC trigger (TSEL1 = 000) */
    TIM6->PSC = 0;
    TIM6->ARR = TIM6CLK_HZ / FS_HZ - 1;                 /* 1749 */
    TIM6->CR2 = TIM_CR2_MMS_1;                          /* MMS = 010: update -> TRGO */

    DAC->CR = DAC_CR_EN1 | DAC_CR_TEN1 | DAC_CR_DMAEN1; /* TSEL1 = 000: TIM6 TRGO */
    TIM6->CR1 = TIM_CR1_CEN;
}
```

`cmsis_device_f4` 헤더로 경고 없이 빌드됩니다(`arm-none-eabi-gcc` 16.2.0). QEMU의 STM32F4 머신에는 DAC 모델이 없어 실행은 하지 않았습니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -DSTM32F407xx \
  -I cmsis_device_f4/Include -I CMSIS_5/CMSIS/Core/Include -Wall -Wextra -c dac.c
```

표는 0~4095 전체를 씁니다. DS8626 Table 74에 따르면 출력 buffer를 켠 상태(`BOFF1` = 0, 위 코드처럼 `DAC->CR`에 `BOFF1`을 쓰지 않은 경우)의 출력 범위는 0.2 V ~ V_DDA − 0.2 V이고, V_REF+ = 3.6 V에서 코드 0x0E0~0xF1C에 해당합니다. 이 범위 밖 코드는 출력이 따라가지 않으므로, 끝이 잘리지 않은 sine이 필요하면 진폭을 이 범위 안으로 줄입니다.

## 측정 / 비교

이 글에서 인용한 두 DAC의 데이터시트 값입니다.

| 항목 | STM32F405/407 내장 DAC (DS8626 Table 74) | TI DAC8552 (SLAS430A) |
| --- | --- | --- |
| 해상도 | 12 bit (8 bit 모드도 있음) | 16 bit, 2채널 |
| DNL | max ±2 LSB (12 bit), ±0.5 LSB (10 bit) | typ ±0.35, max ±1 LSB, 16-bit monotonic |
| Settling | typ 3, max 6 µs (full scale, 10 bit, ±4 LSB, C_L ≤ 50 pF, R_L ≥ 5 kΩ) | 10 µs to ±0.003% FSR |
| Glitch | 표에 없음 | 0.15 nV-s (1 LSB change around major carry) |
| 갱신 속도 | max 1 MS/s (코드 i → i+1) | — |
| 출력 부하 | buffer ON: R_L ≥ 5 kΩ, C_L ≤ 50 pF. buffer OFF: R_O max 15 kΩ | — |

DS8626 Table 74의 THD 칸은 값이 비어 있어 옮기지 않았습니다.

## 자주 보는 함정

> ⚠️ Reconstruction filter 누락

LPF를 빼면 f_s 주변의 image가 부하로 그대로 갑니다. 48 kHz로 750 Hz를 낸다면 출력에는 47.25 kHz와 48.75 kHz의 image가 같이 있습니다(f_s ± f). 다음 단이 이 주파수를 통과시키는 앰프나 ADC라면, f_s/2 아래에서 충분히 꺾이는 LPF를 둡니다.

> ⚠️ Sample rate mismatch

44.1 kHz로 만든 샘플을 48 kHz로 내보내면 같은 샘플이 48/44.1 = 1.088배 빨리 재생되어 주파수가 8.8% 올라갑니다. 440 Hz는 479 Hz가 됩니다. 원래 속도로 내려면 sample rate converter로 샘플을 새로 만들거나 DAC 갱신 주파수를 44.1 kHz로 맞춥니다. 위 TIM6 설정이라면 84 MHz / 44.1 kHz = 1904.76이라 정수 분주로는 정확히 맞지 않습니다.

> ⚠️ V_REF 부족

DAC 출력은 V_REF × code / 2^N이라 V_REF의 오차와 잡음이 출력에 같은 비율로 실립니다. STM32F405/407은 V_REF+를 1.8 V ~ V_DDA 범위로 받고(DS8626 Table 74), 중간 코드(0x800)에서 V_REF+ 전류가 typ 170 µA, max 240 µA입니다. 코드에 따라 V_REF+ 전류가 달라지므로, V_REF+를 내는 회로는 이 전류 변화에서도 전압을 유지해야 합니다. ADC와 같은 핀이라 [1-07](/blog/embedded/modern-recipes/part1-07-adc-principles)의 디커플링 조건도 함께 적용됩니다.

> ⚠️ Glitch 무시

제어용 DAC라면 major carry 근처를 지나는 갱신에서 glitch가 나옵니다. 위 R-2R 계산처럼 같은 코드에서 DNL도 가장 나쁘므로, 제어 루프의 동작점이 0x7FF/0x800 근처에 걸리지 않게 오프셋을 두거나 glitch 사양이 작은 DAC를 고릅니다.

> ⚠️ 출력 부하 임피던스

STM32F405/407 DAC는 출력 buffer를 켜도 R_L ≥ 5 kΩ, C_L ≤ 50 pF가 조건이고, buffer를 끄면 출력 임피던스가 최대 15 kΩ이라 1% 정확도에 1.5 MΩ 이상의 부하가 필요합니다(DS8626 Table 74). 수 Ω인 스피커는 이 조건과 거리가 멀어 앰프가 필요합니다.

## 정리

- DAC 출력은 zero-order hold 계단입니다. f_s/2 위 image는 LPF로 거르고, 대역 안 감쇠 sin(πf/f_s)/(πf/f_s)는 48 kHz에서 20 kHz가 −2.6 dB입니다.
- 12비트 R-2R은 저항 σ 0.01%에서 단조, 0.1%에서 이미 major carry 근처 단조가 깨질 수 있습니다(계산).
- Σ-Δ는 1-bit 펄스의 밀도로 값을 표현하고, 정확도를 필터가 정합니다.
- DNL > −1 LSB면 단조입니다. 데이터시트의 DNL 한계와 단조성 표기를 따로 확인합니다.
- STM32F4 DAC는 TIM6 TRGO + DMA1 Stream5 Ch7로 CPU 없이 파형을 낼 수 있고, buffer ON 출력 범위(0.2 V ~ V_DDA − 0.2 V)와 부하 조건을 지켜야 합니다.

다음 편에서는 **PWM 신호 생성**을 다룹니다. DAC 없이 평균 전압을 만드는 흔한 방법입니다.

## 관련 항목

- [1-07: ADC 동작 원리](/blog/embedded/modern-recipes/part1-07-adc-principles)
- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [4-10: 임베디드 DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
