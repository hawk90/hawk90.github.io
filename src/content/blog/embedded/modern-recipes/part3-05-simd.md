---
title: "3-05: SIMD 활용 — Intrinsics·Auto-Vectorization·OpenMP SIMD"
date: 2026-05-20T12:00:00
description: "SIMD 적용 전략. Auto-vectorize, intrinsics, OpenMP SIMD pragma, ISPC."
series: "Modern Embedded Recipes"
seriesOrder: 17
tags: [recipes, simd, vectorization, intrinsics, openmp, ispc]
draft: true
---

## 한 줄 요약

> **"SIMD = 한 명령 여러 데이터"** — 4-16x 가속, 데이터 layout이 핵심.

## SIMD 적용 옵션 3 가지

```text
1. Auto-vectorization — 컴파일러가 자동
   장: 코드 수정 0
   단: 조건 까다로움
   
2. Intrinsics — 직접 명령 호출
   장: 정확한 통제
   단: vendor-specific
   
3. OpenMP SIMD pragma — 힌트
   장: portable·간단
   단: 100% 자동 아님
```

## Auto-Vectorization 활성

```bash
# GCC
gcc -O3 -ftree-vectorize -ftree-vectorizer-verbose=2 source.c

# Clang
clang -O3 -Rpass=loop-vectorize -Rpass-missed=loop-vectorize source.c

# ARM
gcc -mfpu=neon -ftree-vectorize source.c

# AArch64 default — auto NEON
gcc-aarch64 -O3 source.c
```

`-O3` + flags — vectorize 시도.

## Vectorize 친화 코드

```c
/* Good — vectorizer 친화 */
void scale(float * restrict a, float k, int N) {
    for (int i = 0; i < N; i++) {
        a[i] *= k;
    }
}
```

조건:
- `restrict` keyword — alias 없음
- Sequential access
- 조건 없음
- Loop trip count known·multiple of vector

## Vectorize 안 되는 케이스

```c
/* Pointer aliasing 가능 */
void copy(float *a, float *b, int N) {
    for (int i = 0; i < N; i++) a[i] = b[i];   /* aliasing? */
}
/* → restrict 추가 */

/* Conditional */
for (int i = 0; i < N; i++) {
    if (a[i] > 0) b[i] = a[i];   /* 일부만 — predicated */
}
/* → SVE 또는 mask intrinsic 사용 */

/* Dependency */
for (int i = 1; i < N; i++) {
    a[i] += a[i-1];   /* recurrence — vectorize 불가 */
}
```

## NEON Intrinsics

```c
#include <arm_neon.h>

void add(float *a, float *b, float *c, int N) {
    int i = 0;
    for (; i + 4 <= N; i += 4) {
        float32x4_t va = vld1q_f32(&a[i]);
        float32x4_t vb = vld1q_f32(&b[i]);
        float32x4_t vc = vaddq_f32(va, vb);
        vst1q_f32(&c[i], vc);
    }
    for (; i < N; i++) c[i] = a[i] + b[i];
}
```

128-bit vector = 4 × float32 또는 8 × int16 또는 16 × int8.

## Helium / MVE — Cortex-M

```c
/* Cortex-M55/M85 MVE */
#include <arm_mve.h>

void add_mve(int16_t *a, int16_t *b, int16_t *c, int N) {
    int i = 0;
    for (int n = N; n > 0; n -= 8) {
        mve_pred16_t p = vctp16q(n);
        int16x8_t va = vld1q_z_s16(&a[i], p);
        int16x8_t vb = vld1q_z_s16(&b[i], p);
        int16x8_t vc = vaddq_x_s16(va, vb, p);
        vst1q_p_s16(&c[i], vc, p);
        i += 8;
    }
}
```

**Predication** — tail 자동 처리 (`vctp16q`).

Cortex-M MVE = NEON과 다른 ISA, 같은 컨셉.

## SVE / SVE2 — Variable-Width

```c
#include <arm_sve.h>

void add_sve(float *a, float *b, float *c, int N) {
    int i = 0;
    svbool_t pg = svwhilelt_b32(i, N);
    while (svptest_first(svptrue_b32(), pg)) {
        svfloat32_t va = svld1(pg, &a[i]);
        svfloat32_t vb = svld1(pg, &b[i]);
        svst1(pg, &c[i], svadd_x(pg, va, vb));
        i += svcntw();
        pg = svwhilelt_b32(i, N);
    }
}
```

Vector width 128-2048 bit — *runtime 결정*. *Length-agnostic* code.

## x86 AVX·AVX-512

```c
#include <immintrin.h>

void add_avx(float *a, float *b, float *c, int N) {
    int i = 0;
    for (; i + 8 <= N; i += 8) {
        __m256 va = _mm256_load_ps(&a[i]);
        __m256 vb = _mm256_load_ps(&b[i]);
        __m256 vc = _mm256_add_ps(va, vb);
        _mm256_store_ps(&c[i], vc);
    }
}
```

AVX2 = 256-bit (8 float), AVX-512 = 512-bit (16 float).

## OpenMP SIMD

```c
#pragma omp simd
for (int i = 0; i < N; i++) {
    c[i] = a[i] + b[i];
}

#pragma omp simd reduction(+:sum)
for (int i = 0; i < N; i++) sum += data[i];

#pragma omp simd aligned(a:64, b:64, c:64)
for (int i = 0; i < N; i++) {
    c[i] = a[i] * b[i];
}
```

Portable hint — GCC·Clang·Intel ICC 모두 지원. *Vendor 독립*.

## ISPC — Intel SPMD

```c
/* ISPC kernel */
export void add(uniform float a[], uniform float b[],
                 uniform float c[], uniform int N) {
    foreach (i = 0 ... N) {
        c[i] = a[i] + b[i];
    }
}
```

Intel SPMD Program Compiler — *GPU-like* model, SSE·AVX·NEON 자동 generate. 게임·렌더링 표준.

## Reduction Pattern

```c
/* RAW chain — SIMD 안 됨 */
float sum = 0;
for (int i = 0; i < N; i++) sum += data[i];
/* sum dependency — 컴파일러 인식 시 reduction tree */

/* 명시 multiple accumulator */
float32x4_t acc0 = vdupq_n_f32(0);
float32x4_t acc1 = vdupq_n_f32(0);
float32x4_t acc2 = vdupq_n_f32(0);
float32x4_t acc3 = vdupq_n_f32(0);

for (int i = 0; i + 16 <= N; i += 16) {
    acc0 = vaddq_f32(acc0, vld1q_f32(&data[i]));
    acc1 = vaddq_f32(acc1, vld1q_f32(&data[i+4]));
    acc2 = vaddq_f32(acc2, vld1q_f32(&data[i+8]));
    acc3 = vaddq_f32(acc3, vld1q_f32(&data[i+12]));
}
/* horizontal sum */
```

ILP 보장 — *latency hide*. 4x 이상 빠름.

## Gather / Scatter

```c
/* AVX-512 gather */
__m512i indices = _mm512_loadu_si512(idx);
__m512 v = _mm512_i32gather_ps(indices, base, 4);

/* SVE2 gather */
svfloat32_t v = svld1_gather_s32index_f32(pg, base, indices);
```

Random access pattern — *hardware gather instruction*. SVE2·AVX-512.

ARM Cortex-A78/X1+ — SVE2 지원. 미래 표준.

## Saturating Arithmetic

```c
/* 픽셀·오디오 — clip to 0~255 */
uint8x16_t va = vld1q_u8(in_a);
uint8x16_t vb = vld1q_u8(in_b);
uint8x16_t result = vqaddq_u8(va, vb);   /* saturate */
vst1q_u8(out, result);
```

NEON `vq*` — saturating ops. 이미지·오디오 표준.

## Polynomial Multiply — Crypto·CRC

```c
/* AES instruction (NEON crypto) */
#include <arm_neon.h>

uint8x16_t state = ...;
uint8x16_t key = ...;
state = vaesmcq_u8(vaeseq_u8(state, key));
```

ARMv8 AES·SHA·PMULL — *hardware crypto*. TLS·encryption.

## 자동차 — Sensor Fusion SIMD

```text
Kalman filter — matrix ops:
  - 4×4 matrix multiply = 16 fmla = 4 vector op
  - Quaternion rotation = NEON 4-element

Vector dot product, cross product — *모두 SIMD*.

NEON·MVE 표준.
```

## 자주 하는 실수

> ⚠️ Auto-vectorize 신뢰

```bash
gcc -O3 ./prog
# 그러나 vectorizer 보고 — disabled (alias)
```

→ `-fopt-info-vec` 확인 + `restrict`.

> ⚠️ Tail loop 누락

```c
for (int i = 0; i + 4 <= N; i += 4) { ... }
/* N=10 → i=8까지 → tail 2 element 처리 안 됨 */
```

→ scalar tail 또는 SVE predication.

> ⚠️ Misalignment 무시

```c
float *p = malloc(N * sizeof(float));   /* default align 8 */
float32x4_t v = vld1q_f32(p);   /* OK on NEON, but slow */
```

→ `aligned_alloc(16, ...)` 또는 `alignas(16)`.

> ⚠️ Cross-platform intrinsics

```c
#include <arm_neon.h>
__m256 v;   /* x86 AVX — ARM에선 fail */
```

→ wrapper library (Sleef, SIMD-Everywhere).

## 정리

- SIMD = **한 명령 여러 데이터**, 4-16x 가속.
- **Auto-vectorize** + `restrict` + SoA가 첫 단계.
- **Intrinsics** = 정확한 통제, vendor-specific.
- **OpenMP SIMD** = portable hint.
- **SVE/MVE** = predication으로 tail handling.
- **Reduction** = multiple accumulator로 ILP.
- 자동차·자율주행·이미지·오디오 표준.

다음 편은 **NEON 심화**.

## 관련 항목

- [3-04: NUMA](/blog/embedded/modern-recipes/part3-04-numa)
- [3-06: NEON 심화](/blog/embedded/modern-recipes/part3-06-neon)
