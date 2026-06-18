---
title: "ARM Cortex-M 시리즈 비교 — M0·M3·M4·M7·M33·M55 분석"
date: 2026-04-11T09:13:00
description: "M0/M0+/M3/M4/M7/M33/M55/M85 — 어느 코어를 언제 쓰나."
series: "Modern Embedded Recipes"
seriesOrder: 13
tags: [recipes, arm, cortex-m]
draft: false
---

## 한 줄 요약

> **"Cortex-M은 한 줄로 정리됩니다."** M0 = 최저전력, M3 = 일반 제어, M4 = DSP, M7 = 고성능, M33/M55/M85 = 보안과 ML.

## 어떤 상황에서 쓰나

새 프로젝트의 칩 선택 단계에서 Cortex-M 패밀리 중 어느 코어가 적절한지 결정해야 할 때가 있습니다. 같은 ARM Cortex-M이라도 코어마다 파이프라인 깊이, 명령어, FPU, MPU, TrustZone 지원이 모두 다릅니다.

## 핵심 개념

### 1) Cortex-M 패밀리 한눈에

| 코어 | ARM 버전 | 파이프라인 | DSP | FPU | MPU | TrustZone | 대표 chip |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | v6-M | 3 단 | X | X | X | X | STM32F0 |
| M0+ | v6-M | 2 단 | X | X | 옵션 | X | nRF52 |
| M1 | v6-M | 3 단 | X | X | X | X | (FPGA 전용) |
| M3 | v7-M | 3 단 | X | X | 옵션 | X | STM32F1, LPC1768 |
| M4 | v7E-M | 3 단 | O (SIMD) | 옵션 (SP) | 옵션 | X | STM32F4, nRF52833 |
| M7 | v7E-M | 6 단 (super-scalar) | O | 옵션 (SP/DP) | 옵션 | X | STM32H7, i.MX RT |
| M23 | v8-M baseline | 2 단 | X | X | 옵션 | 옵션 | LPC55S0x |
| M33 | v8-M mainline | 3 단 | O | 옵션 | 옵션 | 옵션 | nRF9160, STM32L5 |
| M55 | v8.1-M | 4 단 | O + Helium | 옵션 | 옵션 | 옵션 | Alif Ensemble |
| M85 | v8.1-M | 7 단 | O + Helium | 옵션 | 옵션 | 옵션 | (latest, 2024+) |

### 2) 파이프라인 깊이의 의미

파이프라인이 깊을수록 같은 cycle에 더 많은 명령을 실행할 수 있지만, branch miss penalty도 큽니다.

```text
M0+ (2 단)          M7 (6 단, super-scalar dual-issue)
─ fetch ─ exec ─    ─ pre ─ fetch ─ dec ─ ren ─ exec ─ wb ─

   branch miss = 1 cycle                              
                       branch miss = 5 ~ 6 cycle (worst)
```

빠른 IRQ response가 중요한 작은 컨트롤러는 M0+, 신호 처리 throughput이 중요한 경우는 M7이 맞습니다.

### 3) DSP / SIMD / Helium

- **M3 / M0**: 일반 정수 명령만
- **M4 / M33**: DSP extension(`SMLAD`, `QADD8` 같은 16-bit SIMD)
- **M7**: M4의 DSP + 더 빠른 FPU
- **M55 / M85**: Helium (MVE, M-profile Vector Extension) — 128-bit SIMD

Helium은 8-bit ML 추론에 강력합니다. CMSIS-NN 라이브러리가 Helium 최적화 코드를 자동 사용합니다.

### 4) FPU 옵션

| 코어 | FPU 옵션 | 정밀도 |
| --- | --- | --- |
| M0 ~ M3 | 없음 | SW emulation |
| M4 | FPv4-SP (옵션) | single |
| M7 | FPv5-SP 또는 DP (옵션) | single 또는 double |
| M33 | FPv5-SP (옵션) | single |
| M55 / M85 | FPv5-SP/DP + Helium FP | single + double |

double precision은 M7-DP와 M55/M85에만 있습니다. 일반 control은 SP면 충분합니다.

### 5) Security — TrustZone-M

M23, M33, M35P, M55, M85가 TrustZone-M을 지원합니다. Secure/Non-Secure world 분리로 보안 부팅과 PUF 기반 키 관리가 가능합니다.

## 코드 / 실제 사용 예

같은 FIR filter 코드의 코어별 성능 차이입니다.

```c
// 64-tap FIR, 1024 sample
void fir(const int16_t *x, int16_t *y, int n) {
    static int16_t state[64];
    for (int i = 0; i < n; i++) {
        for (int j = 63; j > 0; j--) state[j] = state[j-1];
        state[0] = x[i];

        int32_t acc = 0;
        for (int j = 0; j < 64; j++) {
            acc += state[j] * coef[j];
        }
        y[i] = acc >> 15;
    }
}
```

CMSIS-DSP의 `arm_fir_q15`를 쓰면 코어 capability를 자동 활용합니다.

```c
arm_fir_instance_q15 S;
arm_fir_init_q15(&S, 64, coef, state, BLOCK_SIZE);
arm_fir_q15(&S, x, y, 1024);
```

## 측정 / 비교

| 코어 | CoreMark/MHz | FIR 64-tap (1024 sample) | 전력 (mA/MHz) |
| --- | --- | --- | --- |
| M0+ | 2.46 | 18 ms | 11 µA |
| M3 | 3.32 | 11 ms | 12 µA |
| M4 (FPU+DSP) | 3.42 | 2.1 ms (SIMD) | 14 µA |
| M7 | 5.01 | 0.8 ms | 25 µA |
| M33 | 4.02 | 1.8 ms | 13 µA |
| M55 (Helium) | 6.40 | 0.3 ms (MVE) | 30 µA |

같은 1 MHz라도 성능과 전력이 2 ~ 7배까지 차이가 납니다.

## 자주 보는 함정

> ⚠️ M7 선택 후 cache 설정 누락

M7은 L1 cache가 있는데, 기본값으로 disabled 상태입니다. cache를 enable하지 않으면 M4보다 느릴 수 있습니다.

> ⚠️ DSP 명령을 컴파일러 옵션으로 활성화 안 함

`-mcpu=cortex-m4` 만으로는 DSP 명령이 안 나옵니다. `-mfpu=fpv4-sp-d16 -mfloat-abi=hard`를 추가해야 합니다.

> ⚠️ Helium을 일반 컴파일러로 사용

Helium(MVE)을 쓰려면 GCC 10+, 또는 ARM Compiler 6 최신을 써야 합니다. 옛 컴파일러는 명령어 인코딩이 없습니다.

> ⚠️ TrustZone을 모르고 secure 영역에 코드 배치

M33/M55를 처음 쓸 때 secure/non-secure 분리를 모르면 모든 코드가 secure에 들어가 비효율적입니다. application code는 보통 non-secure에 둡니다.

> ⚠️ MPU 없는 코어로 RTOS 격리 시도

M0/M0+에는 보통 MPU가 없거나 region 수가 적습니다. 강한 격리가 필요하면 M3+ 코어가 필요합니다.

## 정리

- Cortex-M은 같은 ISA 패밀리지만 코어마다 파이프라인, DSP, FPU, TrustZone이 다릅니다.
- 일반 제어는 M3, DSP는 M4, 고성능은 M7, 보안은 M33/M55가 출발 선택입니다.
- Helium(M55/M85)은 ML 추론과 8-bit SIMD에 강합니다.
- FPU는 옵션이므로 chip별로 확인 필수입니다.
- M7 cache, DSP 컴파일러 플래그 같은 활성화 누락이 흔한 성능 저하 원인입니다.

다음 편에서는 **Cortex-A 시리즈 비교**를 다룹니다. 임베디드 Linux용 application 코어입니다.

## 관련 항목

- [1-12: LVDS / 차동 신호 일반](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- [2-02: Cortex-A 시리즈 비교](/blog/embedded/modern-recipes/part2-02-cortex-a-comparison)
- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- 더 깊이 — [Embedded C++ for Real Systems: 코어별 최적화](/blog/embedded/embedded-cpp/)
