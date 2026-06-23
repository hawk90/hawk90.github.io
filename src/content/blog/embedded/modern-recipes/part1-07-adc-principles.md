---
title: "ADC 동작 원리 — SAR·Sigma-Delta·Pipelined 비교"
date: 2026-04-10T09:07:00
description: "Sampling·quantization·SAR vs sigma-delta·SNR·ENOB·aliasing."
series: "Modern Embedded Recipes"
seriesOrder: 7
tags: [recipes, adc, hw-basics]
draft: false
---

## 한 줄 요약

> **"ADC는 연속 신호를 셈할 수 있는 숫자로 압축합니다."** Sampling 속도와 비트 수 둘 다 충분해야 의미 있는 데이터가 됩니다.

## 어떤 상황에서 쓰나

- 배터리 전압, 온도, 광 센서 같은 아날로그 측정
- 마이크 입력 같은 오디오 신호 수집
- 모터 전류 sensing
- 정밀 측정기기, 데이터 로거

## 핵심 개념

### 1) Sampling과 Nyquist

연속 신호를 일정 간격으로 sampling 해 이산 신호로 만듭니다. Nyquist 정리에 따르면 **신호 최대 주파수 × 2** 이상으로 sampling 해야 원래 신호를 복원할 수 있습니다.

```text
1 kHz sine wave를 1.5 kHz로 sampling하면?
→ 1.5 - 1 = 0.5 kHz의 alias 신호로 보임
(원본보다 더 낮은 가짜 신호)
```

10 kHz 오디오를 잡으려면 최소 20 kHz sampling이 필요합니다. 보통은 안전 마진으로 2.5 ~ 4 배를 씁니다.

### 2) Quantization과 SNR

연속 값을 N-bit로 표현하면 2^N 단계로 양자화됩니다. 양자화 오차의 한계가 SNR의 이론치입니다.

```text
SNR (dB) = 6.02 × N + 1.76

8-bit  → 49.9 dB
10-bit → 62.0 dB
12-bit → 74.0 dB
16-bit → 98.1 dB
24-bit → 146.2 dB (이론, 실제는 90 dB 부근)
```

비트 수가 많을수록 SNR이 좋아지지만, 실제 ADC는 노이즈·INL/DNL·input buffer 한계로 이론치를 다 살리지 못합니다.

### 3) SAR vs Sigma-Delta

대표적인 두 가지 ADC 구조입니다.

| 항목 | SAR (Successive Approximation) | Sigma-Delta (Σ-Δ) |
| --- | --- | --- |
| 변환 시간 | 1 µs (Mbps급) | 1 ms (low) ~ 100 µs (high) |
| 해상도 | 8 ~ 18 bit | 16 ~ 32 bit |
| Latency | 매우 낮음 | 높음 (oversampling) |
| Power | 낮음 | 높음 |
| 사용 예 | MCU 내장, 일반 측정 | 오디오, 정밀 계측 |

SAR은 한 sample을 빠르게 변환합니다. 각 비트를 비교기로 하나씩 결정합니다. Σ-Δ는 1-bit 비교기를 매우 빠르게 돌리고, 결과를 디지털 필터로 평균 내 고해상도를 얻습니다.

### 4) Input impedance와 sampling capacitor

SAR ADC는 입력을 sampling 커패시터(보통 5 ~ 20 pF)로 받습니다. 이 커패시터를 충전하려면 입력 source impedance가 충분히 낮아야 합니다.

**샘플 시간 t_s 동안 0.5 LSB 이내로 충전:**

- τ = R_source × C_sample
- t_s > τ × ln(2^(N+1))

**12-bit, 10 pF cap, 1 µs sample time:**

- τ_max = 1 µs / 9 ≈ 110 ns
- R_max = 110 ns / 10 pF = 11 kΩ

10 kΩ 이상의 source 임피던스로 직결하면 측정값이 부정확합니다. op-amp buffer 또는 sample time을 늘립니다.

### 5) Anti-alias filter

Nyquist 위 주파수를 사전에 제거해야 alias가 생기지 않습니다.

```text
Sampling 1 kHz → Nyquist = 500 Hz
LPF cutoff 400 Hz (안전 마진)
   ── 신호 ─→ Anti-alias LPF ─→ ADC ─→
              passive (R/C) 또는 active (op-amp) LPF
```

cutoff와 sampling rate 사이의 거리가 filter 차수를 결정합니다. 가까울수록 가파른 filter가 필요합니다.

## 코드 / 실제 사용 예

STM32F4 ADC로 채널 0 read입니다.

```c
// ADC1 channel 0 단일 변환
RCC->APB2ENR |= RCC_APB2ENR_ADC1EN;

ADC1->CR2 = 0;
ADC1->SQR1 = 0;                                // 1 conversion
ADC1->SQR3 = 0;                                // channel 0
ADC1->SMPR2 = (0b111 << ADC_SMPR2_SMP0_Pos);   // 480 cycles

ADC1->CR2 |= ADC_CR2_ADON;

uint16_t adc_read(void) {
    ADC1->CR2 |= ADC_CR2_SWSTART;
    while (!(ADC1->SR & ADC_SR_EOC));
    return ADC1->DR;                            // 12-bit 결과
}

// 전압 환산 (V_REF = 3.3V)
float voltage(uint16_t code) {
    return (code * 3.3f) / 4095.0f;
}
```

DMA로 연속 sampling 시 CPU 부하 없이 1 MS/s 가능합니다.

```c
ADC1->CR2 |= ADC_CR2_CONT | ADC_CR2_DMA | ADC_CR2_DDS;
DMA2_Stream0->PAR  = (uint32_t)&ADC1->DR;
DMA2_Stream0->M0AR = (uint32_t)adc_buf;
DMA2_Stream0->NDTR = 1024;
DMA2_Stream0->CR   = DMA_SxCR_CIRC | DMA_SxCR_MINC
                   | DMA_SxCR_MSIZE_0 | DMA_SxCR_PSIZE_0
                   | DMA_SxCR_EN;
```

## 측정 / 비교

| ADC 구조 | 대표 chip | 속도 | 해상도 | ENOB(실측) |
| --- | --- | --- | --- | --- |
| SAR (MCU 내장) | STM32F4 | 2.4 MS/s | 12 bit | 10 ~ 11 |
| SAR (외장) | ADS8326 | 250 kS/s | 16 bit | 14.5 |
| Σ-Δ (오디오) | WM8731 | 96 kS/s | 24 bit | 17 ~ 18 |
| Σ-Δ (정밀) | ADS1256 | 30 kS/s | 24 bit | 20 ~ 21 |

ENOB(Effective Number Of Bits)는 실제 노이즈를 포함한 유효 비트 수입니다. nominal 16-bit가 실제로는 14 bit 수준일 수 있습니다.

## 자주 보는 함정

> ⚠️ Source 임피던스 과다

10 kΩ 이상의 source를 직결하면 sampling cap이 다 충전되지 못해 측정값이 낮게 나옵니다. op-amp buffer를 답니다.

> ⚠️ Anti-alias filter 누락

높은 주파수 노이즈(예: 스위칭 노이즈)가 alias되어 DC offset처럼 보입니다. ADC 앞에 100 Hz ~ 10 kHz LPF가 거의 항상 필요합니다.

> ⚠️ V_REF 노이즈

V_REF가 흔들리면 모든 측정이 비례적으로 흔들립니다. V_REF 핀에 별도 RC 필터(보통 1 µF + 100 nF) 필수.

> ⚠️ Multi-channel sampling 사이의 cross-talk

여러 채널을 빠르게 전환하면 이전 채널의 잔류 전하가 다음 sample에 섞입니다. sample time을 충분히 주거나 dummy read를 끼웁니다.

> ⚠️ Ground bounce

ADC ground와 analog ground를 한 점에서만 연결해야 합니다. 여러 곳에서 연결하면 loop 전류가 측정에 섞입니다.

## 정리

- ADC는 sampling rate(Nyquist)와 bit 해상도(SNR) 둘 다 충분해야 의미 있는 데이터를 줍니다.
- SAR는 빠른 단발, Σ-Δ는 느린 고해상도입니다. 용도에 맞게 선택합니다.
- Source 임피던스, sampling cap, sample time이 SAR의 정확도를 좌우합니다.
- Anti-alias filter는 거의 항상 필요합니다. cutoff와 sampling rate의 거리가 filter 차수를 결정합니다.
- ENOB는 nominal bit보다 작습니다. 실측을 확인합니다.

다음 편에서는 **DAC 동작 원리**를 다룹니다. ADC의 반대 방향입니다.

## 관련 항목

- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- [1-08: DAC 동작 원리](/blog/embedded/modern-recipes/part1-08-dac-principles)
- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- 더 깊이 — [Embedded Performance Engineering: ADC 신호 처리](/blog/embedded/performance-engineering/00-preface)
