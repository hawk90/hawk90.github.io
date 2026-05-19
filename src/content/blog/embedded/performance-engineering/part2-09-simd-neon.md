---
title: "2-09: SIMD·NEON — 128-bit 벡터, Auto-Vectorization, SVE/SVE2"
date: 2026-05-08T16:00:00
description: "ARM NEON 128-bit, SVE 가변폭. Auto-vectorize (-O3). Intrinsics. Cortex-M Helium (MVE)."
series: "Embedded Performance Engineering"
seriesOrder: 17
tags: [simd, neon, sve, helium, intrinsics]
draft: false
---

## 한 줄 요약

> **"SIMD = 한 명령으로 여러 데이터"**입니다. 4배 speedup이 흔합니다.

## ARM NEON — 128-bit Vector

Cortex-A 시리즈의 표준입니다. 128-bit register 32개(`v0-v31`)를 제공합니다.

![NEON 128-bit register의 다양한 해석 — 4xf32, 8xi16, 16xi8 등](/images/blog/perf-eng/diagrams/part2-09-neon-register.svg)

## Auto-Vectorization — 첫 시도

```bash
gcc -O3 -mfpu=neon -ftree-vectorize -ftree-vectorizer-verbose=2 source.c
```

```c
void scale(float *a, float k, int N) {
    for (int i = 0; i < N; i++) {
        a[i] *= k;
    }
}
```

`-O3`를 켜면 컴파일러가 자동으로 NEON `fmul.f32 q0, q1, q2`로 4-way 처리합니다.

조건은 다음과 같습니다.

- 명확한 stride가 있어야 합니다 (보통 1).
- Alias가 없어야 합니다 (`restrict` 키워드가 도움이 됩니다).
- Branch가 없어야 합니다.
- 길이가 vector width의 배수이거나 epilogue로 처리 가능해야 합니다.

## restrict로 vectorizer 도움

```c
// 회피
void add(float *a, float *b, float *c, int N) {
    for (int i = 0; i < N; i++) c[i] = a[i] + b[i];
    // 컴파일러: a와 c가 alias할 수도 → vector 못 함
}

// Good
void add(float * restrict a, float * restrict b, float * restrict c, int N) {
    for (int i = 0; i < N; i++) c[i] = a[i] + b[i];
}
```

## NEON Intrinsics로 직접 작성

```c
#include <arm_neon.h>

void add_neon(float *a, float *b, float *c, int N) {
    int i;
    for (i = 0; i + 4 <= N; i += 4) {
        float32x4_t va = vld1q_f32(&a[i]);
        float32x4_t vb = vld1q_f32(&b[i]);
        float32x4_t vc = vaddq_f32(va, vb);
        vst1q_f32(&c[i], vc);
    }
    /* Tail */
    for (; i < N; i++) c[i] = a[i] + b[i];
}
```

자주 쓰는 intrinsic은 다음과 같습니다.

| Intrinsic | 동작 |
|---|---|
| `vld1q_f32` | 4 float load |
| `vst1q_f32` | 4 float store |
| `vaddq_f32` | 4 float add |
| `vmulq_f32` | 4 float mul |
| `vfmaq_f32` | fused multiply-add |
| `vdupq_n_f32` | scalar → 4 element broadcast |

## 실전 — Dot Product

```c
float dot(const float *a, const float *b, int N) {
    float32x4_t sum = vdupq_n_f32(0.0f);
    int i;
    for (i = 0; i + 4 <= N; i += 4) {
        float32x4_t va = vld1q_f32(&a[i]);
        float32x4_t vb = vld1q_f32(&b[i]);
        sum = vfmaq_f32(sum, va, vb);   // sum += a * b
    }
    /* Horizontal sum */
    float32x2_t h = vadd_f32(vget_low_f32(sum), vget_high_f32(sum));
    h = vpadd_f32(h, h);
    float result = vget_lane_f32(h, 0);
    
    for (; i < N; i++) result += a[i] * b[i];
    return result;
}
```

Scalar 대비 3-4배 빠릅니다.

## Helium (MVE) — Cortex-M 용 SIMD

Cortex-M55와 M85에서는 MVE(M-profile Vector Extension)를 제공합니다.

```c
#include <arm_mve.h>

void add_mve(int16_t *a, int16_t *b, int16_t *c, int N) {
    for (int i = 0; i < N; i += 8) {
        int16x8_t va = vld1q(&a[i]);
        int16x8_t vb = vld1q(&b[i]);
        int16x8_t vc = vaddq(va, vb);
        vst1q(&c[i], vc);
    }
}
```

NEON과 다른 점은 다음과 같습니다.

- *Beat scheme*: 4 beat를 한 cycle씩 처리합니다 (low power).
- *Predication*: tail handling을 자동으로 처리합니다.
- 레지스터가 8개뿐입니다 (NEON은 32개).

주로 DSP, 오디오, ML inference에 사용합니다.

## SVE — 가변폭 SIMD

Cortex-A510·A78·X1 등에 SVE 또는 SVE2가 들어 있습니다. 폭은 구현에 따라 128 ~ 2048 bit으로 다양합니다.

```c
#include <arm_sve.h>

void add_sve(float *a, float *b, float *c, int N) {
    int i = 0;
    svbool_t pg = svwhilelt_b32(i, N);
    while (svptest_first(svptrue_b32(), pg)) {
        svfloat32_t va = svld1(pg, &a[i]);
        svfloat32_t vb = svld1(pg, &b[i]);
        svst1(pg, &c[i], svadd_z(pg, va, vb));
        i += svcntw();
        pg = svwhilelt_b32(i, N);
    }
}
```

**Predication**(mask)으로 tail handling이 자동으로 됩니다. 길이를 모르는 loop도 안전합니다.

같은 binary가 128-bit, 256-bit SVE 양쪽에서 그대로 동작합니다.

## 측정 — IPC와 Throughput

```c
// Scalar
for (i = 0; i < N; i++) c[i] = a[i] + b[i];
// → 1 add per cycle (Cortex-M)

// NEON
float32x4_t va = vld1q_f32(...);
// → 4 add per cycle

// 이론 4x — 실측 3.2-3.8x (load/store가 병목)
```

`perf` 또는 DWT CYCCNT로 측정합니다.

## Reduction Pattern

```c
// 회피 — RAW chain
float sum = 0;
for (i = 0; i < N; i++) sum += a[i];   // 1 add/cycle (RAW)

// Good — 4-way reduction
float32x4_t acc0 = vdupq_n_f32(0);
float32x4_t acc1 = vdupq_n_f32(0);
float32x4_t acc2 = vdupq_n_f32(0);
float32x4_t acc3 = vdupq_n_f32(0);

for (i = 0; i + 16 <= N; i += 16) {
    acc0 = vaddq_f32(acc0, vld1q_f32(&a[i]));
    acc1 = vaddq_f32(acc1, vld1q_f32(&a[i+4]));
    acc2 = vaddq_f32(acc2, vld1q_f32(&a[i+8]));
    acc3 = vaddq_f32(acc3, vld1q_f32(&a[i+12]));
}
/* 16-way ILP — load + add latency 가림 */
```

## Memory Alignment

```c
__attribute__((aligned(16))) float a[1024];
float32x4_t v = vld1q_f32(a);   // ← aligned load 빠름
```

NEON은 misaligned 접근도 가능하지만, 정렬해 두면 10-20% 더 빠릅니다. Cortex-M MVE는 정렬을 권장합니다.

## SIMD 적용 어려운 경우

- **Branch가 많은 경우**: predicated 명령으로 회피합니다.
- **Indirect access**: gather/scatter를 써야 하는데 SVE2만 지원합니다.
- **Cross-element dependency**: prefix sum 같은 recurrence가 어렵습니다.
- **Bit-level operation**: bit manipulation은 vector에 친화적이지 않습니다.

## 자주 하는 실수

> ⚠️ Auto-vectorize 신뢰

`gcc -O3`라고 해서 항상 vectorize되는 것은 아닙니다. `-fopt-info-vec`로 확인합니다.

```bash
gcc -O3 -fopt-info-vec -c src.c
# loop vectorized using 16 byte vectors    ← 성공
# loop turned into non-loop                 ← 다른 최적화
```

Vectorize가 안 되었다면 intrinsics를 쓰거나 OpenMP `#pragma omp simd`를 적용합니다.

> ⚠️ Tail handling 누락

```c
for (i = 0; i < N; i += 4) {   // N=10이면 i=8까지 → tail 2 남음
    process_4(arr + i);
}
```

tail은 scalar로 처리하거나 SVE predicate으로 마무리합니다.

> ⚠️ Mixed precision 무시

```c
int16_t a[N]; float b[N];
for (i) b[i] = (float)a[i] * 2.0f;   // ← conversion 비쌈
```

NEON `vcvtq_f32_s16`를 명시하거나, 아예 fixed-point로 유지합니다.

> ⚠️ FP exception 가정

NEON에서는 NaN/Inf 동작이 IEEE-754 flush-to-zero 모드일 수 있습니다. 정밀 수치 코드를 다룬다면 주의가 필요합니다.

## 정리

- ARM NEON은 **128-bit, 4 × float** 구조입니다.
- Auto-vectorize는 조건이 까다롭습니다. `-O3 -ftree-vectorize`와 restrict를 함께 씁니다.
- **Intrinsics**로 직접 작성하면 확실하게 통제할 수 있습니다.
- Cortex-M55 이상은 **Helium MVE**를 지원합니다.
- 모던 Cortex-A는 **SVE/SVE2**로 가변폭을 제공합니다.
- Reduction은 multiple accumulator로 RAW chain을 회피합니다.

다음 편에서는 **PMU**를 다룹니다.

## 관련 항목

- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
