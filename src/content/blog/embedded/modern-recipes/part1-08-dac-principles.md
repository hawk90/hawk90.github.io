---
title: "DAC 동작 원리 — R-2R Ladder·Sigma-Delta·Settling Time"
date: 2026-04-10T09:08:00
description: "R-2R·delta-sigma DAC·glitch energy·monotonicity."
series: "Modern Embedded Recipes"
seriesOrder: 8
tags: [recipes, dac, hw-basics]
draft: false
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

각 비트가 1이면 2R 저항이 V_REF로 연결되고, 0이면 GND로 연결됩니다. 합성 전류가 R-2R 망을 통과해 가중 합 전압이 됩니다.

장점은 매우 빠른 settle time(보통 < 1 µs)입니다. 단점은 저항 매칭 정밀도가 직접 정확도를 결정한다는 점입니다(12 bit는 ±0.01% 매칭 필요).

### 2) Sigma-Delta DAC

오디오 DAC의 대부분은 Σ-Δ입니다. 1-bit 출력을 매우 빠른 속도로 토글하고, low-pass filter로 평균 내 연속 신호를 만듭니다.

```text
입력 코드 (16-bit, 48 kHz)
        │
        ▼
  Oversampler (× 256 → 12.288 MHz)
        │
        ▼
  Σ-Δ modulator (1-bit out)
        │
        ▼  PDM stream
  Analog LPF (RC 또는 active)
        │
        ▼  연속 전압
```

장점은 높은 해상도와 우수한 INL/DNL입니다. 단점은 latency(보통 0.5 ms 이상)와 high-frequency noise 처리 부담입니다.

### 3) Monotonicity와 DNL

DAC는 입력 코드가 증가하면 출력도 단조 증가해야 합니다. 한 코드에서 다음 코드로 갈 때 0.5 LSB 미만으로 감소하는 비단조 영역이 있으면 제어 루프가 발진할 수 있습니다.

DNL(Differential Non-Linearity)이 ±1 LSB를 넘으면 단조성이 깨질 가능성이 큽니다.

### 4) Glitch energy

DAC 출력이 코드를 바꿀 때 순간적으로 큰 spike가 나옵니다. 특히 binary가 많이 바뀌는 천이(예: 0x7FFF → 0x8000)에서 큽니다.

![DAC code transition glitch then settling](/images/blog/modern-recipes/diagrams/part1-08-dac-glitch.svg)

오디오 DAC는 deglitcher(sample-and-hold)로 spike를 잘라냅니다.

### 5) Reconstruction filter

DAC 출력은 계단 모양입니다. Nyquist 위 성분이 가득하므로, 후단 LPF로 매끈하게 만듭니다.

```text
48 kHz sampling → Nyquist 24 kHz
LPF cutoff ~ 20 kHz (오디오 대역 유지, 24 kHz 위 차단)
```

차단이 가파를수록 phase distortion이 생기므로 절충이 필요합니다.

## 코드 / 실제 사용 예

STM32F4 내장 DAC로 sine wave 출력입니다.

```c
// DAC1 ch1 (PA4) 초기화
RCC->APB1ENR |= RCC_APB1ENR_DACEN;
GPIOA->MODER |= (0b11 << (4 * 2));   // analog mode

DAC->CR = DAC_CR_EN1 | DAC_CR_TEN1
        | (0b101 << DAC_CR_TSEL1_Pos);   // TIM2 trigger

// Sine table — 64 sample, 12-bit
static const uint16_t sine_table[64] = {
    2048, 2248, 2447, ... 1849
};

// TIM2를 48 kHz로 설정 후 DAC update
volatile int idx = 0;
void TIM2_IRQHandler(void) {
    TIM2->SR = 0;
    DAC->DHR12R1 = sine_table[idx];
    idx = (idx + 1) % 64;
}
// → 48000 / 64 = 750 Hz sine 출력
```

DMA로 IRQ 부하 없이 더 높은 sample rate도 가능합니다.

```c
DAC->CR |= DAC_CR_DMAEN1;
DMA1_Stream5->PAR  = (uint32_t)&DAC->DHR12R1;
DMA1_Stream5->M0AR = (uint32_t)sine_table;
DMA1_Stream5->NDTR = 64;
DMA1_Stream5->CR   = DMA_SxCR_CIRC | DMA_SxCR_MINC
                   | DMA_SxCR_MSIZE_0 | DMA_SxCR_PSIZE_0
                   | DMA_SxCR_DIR_0
                   | (7 << DMA_SxCR_CHSEL_Pos)
                   | DMA_SxCR_EN;
```

## 측정 / 비교

| 구조 | 해상도 | Settle time | 사용 예 |
| --- | --- | --- | --- |
| R-2R (MCU 내장) | 12 bit | < 1 µs | 일반 reference |
| R-2R (외장 HS) | 16 bit | 50 ns | RF, function gen |
| Σ-Δ (오디오) | 24 bit | 0.5 ms | DAC for amp |
| Σ-Δ (정밀) | 32 bit | 10 ms | Calibration |

| THD+N (오디오 DAC) | 음질 등급 |
| --- | --- |
| -100 dB | 고급 audiophile |
| -90 dB | 일반 hi-fi |
| -80 dB | 보급형 |
| -60 dB 이하 | MCU 내장 (오디오에 부적합) |

## 자주 보는 함정

> ⚠️ Reconstruction filter 누락

DAC 출력을 그대로 op-amp에 넣으면 계단의 high-frequency 성분이 그대로 증폭됩니다. 항상 LPF가 필요합니다.

> ⚠️ Sample rate mismatch

오디오 file이 44.1 kHz인데 DAC를 48 kHz로 돌리면 pitch가 변하고 sample rate converter가 필요합니다.

> ⚠️ V_REF 부족

DAC는 V_REF 핀을 별도 갖습니다. 누설 전류로 V_REF가 흔들리면 출력 전체가 흔들립니다.

> ⚠️ Glitch 무시

제어용 DAC라면 glitch가 actuator를 흔들 수 있습니다. deglitcher(sample-and-hold) 또는 monotonic update 가드.

> ⚠️ 출력 부하 임피던스

내장 DAC는 보통 출력 임피던스가 수 kΩ이라 직접 speaker를 못 답니다. op-amp buffer 필수.

## 정리

- DAC는 디지털 코드를 계단 전압으로 만들고, reconstruction filter로 매끈한 신호를 만듭니다.
- R-2R는 빠르고 직관적이지만 저항 매칭 한계가 있습니다.
- Σ-Δ는 1-bit를 빠르게 토글해 평균으로 고해상도를 얻습니다. 오디오의 표준입니다.
- Monotonicity와 glitch energy가 실제 응용에서 중요합니다.
- 출력 부하와 V_REF가 모든 정확도의 전제입니다.

다음 편에서는 **PWM 신호 생성**을 다룹니다. DAC 없이 평균 전압을 만드는 흔한 방법입니다.

## 관련 항목

- [1-07: ADC 동작 원리](/blog/embedded/modern-recipes/part1-07-adc-principles)
- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- 더 깊이 — [Embedded Performance Engineering: 신호 처리](/blog/embedded/performance-engineering/00-preface)
