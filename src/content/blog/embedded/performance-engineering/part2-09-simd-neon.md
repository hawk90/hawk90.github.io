---
title: "2-09: SIMD·NEON — 128-bit 벡터, Auto-Vectorization, SVE/SVE2"
date: 2026-05-08T16:00:00
description: "ARM NEON 128-bit, SVE 가변폭. Auto-vectorize (-O3). Intrinsics. Cortex-M Helium (MVE)."
series: "Embedded Performance Engineering"
seriesOrder: 17
tags: [simd, neon, sve, helium, intrinsics]
draft: true
---

## 한 줄 요약

> **"SIMD = 한 명령으로 여러 데이터"** — 4x speedup 흔함.

## ARM NEON — 128-bit Vector

Cortex-A 시리즈 표준. *32 × 128-bit register* (`v0-v31`).

```text
NEON register Q0 (128 bit):
  ┌──────┬──────┬──────┬──────┐
  │  f32 │  f32 │  f32 │  f32 │   ← 4 × float (SP)
  └──────┴──────┴──────┴──────┘
  ┌────┬────┬────┬────┬────┬────┬────┬────┐
  │ i16│ i16│ i16│ i16│ i16│ i16│ i16│ i16│   ← 8 × int16
  └────┴────┴────┴────┴────┴────┴────┴────┘
  16 × int8 / 2 × float64 / 2 × int64 also
```

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

`-O3` 시 자동으로 NEON `fmul.f32 q0, q1, q2` 4-way 처리.

조건:
- 명확한 stride (보통 1)
- Alias 없음 (`restrict` 키워드 도움)
- Branch 없음
- 길이가 vector width의 배수 또는 epilogue 처리

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

## NEON Intrinsics — Manual

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

자주 쓰는 intrinsic:

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

Scalar 대비 *3-4x* 빠름.

## Helium (MVE) — Cortex-M 용 SIMD

Cortex-M55·M85 — *MVE* (M-profile Vector Extension).

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

NEON과 다른 점:
- *Beat scheme* — 4 beat 한 cycle씩 (low power)
- *Predication* — tail handle 자동
- 8 register만 (NEON은 32)

DSP·오디오·ML inference 용.

## SVE — 가변폭 SIMD

Cortex-A510·A78·X1 등에 SVE 또는 *SVE2*. 폭 = 128~2048 bit (구현마다).

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

**Predication** (mask)로 *tail handling 자동* — 길이 모르는 loop도 안전.

같은 binary가 128-bit·256-bit SVE 둘 다에서 동작.

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

`perf` 또는 DWT CYCCNT로 측정.

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

NEON은 *misaligned 가능*하나 정렬 시 *10-20% 빠름*. Cortex-M MVE는 *정렬 권장*.

## SIMD 적용 어려운 경우

- **Branch 많음** — predicated 명령으로 회피
- **Indirect access** — gather/scatter (SVE2만 지원)
- **Cross-element dependency** — recurrence (e.g. prefix sum)
- **Bit-level operation** — bit manipulation은 *vector unfriendly*

## 자주 하는 실수

> ⚠️ Auto-vectorize 신뢰

`gcc -O3`가 항상 vectorize 안 함. `-fopt-info-vec`로 확인:

```bash
gcc -O3 -fopt-info-vec -c src.c
# loop vectorized using 16 byte vectors    ← 성공
# loop turned into non-loop                 ← 다른 최적화
```

Vectorize 안 됐으면 intrinsics 또는 OpenMP `#pragma omp simd`.

> ⚠️ Tail handling 누락

```c
for (i = 0; i < N; i += 4) {   // N=10이면 i=8까지 → tail 2 남음
    process_4(arr + i);
}
```

→ tail scalar 처리 또는 SVE predicate.

> ⚠️ Mixed precision 무시

```c
int16_t a[N]; float b[N];
for (i) b[i] = (float)a[i] * 2.0f;   // ← conversion 비쌈
```

NEON `vcvtq_f32_s16` 명시. 또는 *fixed-point* 유지.

> ⚠️ FP exception 가정

NEON에서 *NaN/Inf* 동작이 IEEE-754 *flush-to-zero* mode일 수 있음. 정밀 수치 코드는 *주의*.

## 정리

- ARM NEON = **128-bit, 4 × float**.
- Auto-vectorize는 *조건 까다로움* — `-O3 -ftree-vectorize` + restrict.
- Manual **intrinsics**로 확실한 통제.
- Cortex-M55+ — **Helium MVE**.
- 모던 Cortex-A — **SVE/SVE2** 가변폭.
- Reduction은 *multiple accumulator*로 RAW 회피.

다음 편은 **PMU**.

## 관련 항목

- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
