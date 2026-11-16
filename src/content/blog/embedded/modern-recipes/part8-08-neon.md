---
title: "ARM NEON 심화 — Matrix Multiply·FFT·Image Filter 적용"
slug: "embedded/modern-recipes/part8-08-neon"
date: 2026-04-17T09:07:00
description: "NEON 실전 사례를 matrix multiply, color conversion, box filter, Sobel, FFT, crypto로 묶어 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 96
tags: [recipes, neon, matrix, fft, image, simd]
topics: ["embedded"]
---

## 한 줄 요약

> **"NEON은 행렬, 영상 처리, 암호처럼 반복적인 데이터 병렬 연산에서 유용하다."** 이 글의 커널 다섯 개는 모두 scalar 참조 구현과 byte 단위로 같은 결과를 냈고, Apple M2 Pro에서 1.3~7.9배 빨랐습니다. 배수의 폭이 넓은 이유는 비교 대상인 C 코드를 컴파일러가 이미 얼마나 벡터화했느냐에 있었습니다.

## 어떤 상황에서 쓰나

카메라 전처리는 매 frame마다 색 공간 변환, 잡음 제거(box filter), edge 검출(Sobel)을 1080p 전체에 반복합니다. 사람이 1,920 × 1,080개의 칸을 하나씩 칠하는 대신 16칸짜리 도장을 찍는 것이 NEON이고, 이 글은 그 도장을 정확히 만드는 방법(scalar와 결과가 같은지)과 실제로 몇 배가 되는지를 함께 봅니다.

자세 제어에서는 quaternion 곱, 4×4 행렬 곱처럼 작은 벡터 연산이 반복됩니다. 원소 넷이 NEON 레지스터 하나에 들어가지만, 곱셈 공식이 lane마다 다른 원소를 섞으므로 shuffle이 필요합니다. 아래 `quat_mul`이 그 예입니다.

## 핵심 개념

AArch64에서 NEON은 128-bit 레지스터 32개를 씁니다. AAPCS64(2025Q4)는 이를 "a further thirty-two registers, v0-v31, which can be used by SIMD and Floating-Point operations"로 소개합니다. 128 bit에는 `float32` 4개, `float64` 2개, `int16` 8개, `int8` 16개가 들어갑니다.

자주 쓰는 패턴은 세 가지입니다.

- **load → 계산 → store**: 연속 데이터를 `vld1q`로 읽고 같은 연산을 lane마다 합니다.
- **interleaved load/store**: `vld2`·`vld3`·`vld4`는 섞여 있는 채널(YUYV, RGB, RGBA)을 레지스터별로 나눠 읽고, `vst3` 등은 다시 섞어 씁니다.
- **누산기 여러 개**: 합처럼 앞 결과를 기다리는 사슬을 나눕니다([8-07](/blog/embedded/modern-recipes/part8-07-simd)에서 4.6배 차이).

| intrinsic | 메모리 배치 | 예 |
| --- | --- | --- |
| `vld1q_u8` | 연속 | 회색조 영상 |
| `vld2q_u8` | 두 채널 교대 | UV 평면 |
| `vld3q_u8` | 세 채널 교대 | RGB24 |
| `vld4_u8`·`vld4q_u8` | 네 채널 교대 | RGBA, YUYV(Y0 U Y1 V) |

## 코드 / 실제 사용 예

아래 커널은 모두 `kernels.h` 한 파일에 있고, 각 커널 바로 뒤에 같은 일을 하는 scalar 참조 함수가 있습니다. 측정 프로그램 `neon_bench.c`는 먼저 두 결과가 같은지 확인한 뒤 시간을 잽니다.

```c
/* NEON kernels and their scalar references */
#include <arm_neon.h>
#include <stdint.h>

/* ---- 4x4 matrix multiply, row-major, C = A * B ---- */
static void mat_mul_4x4(const float A[16], const float B[16], float C[16])
{
    float32x4_t b0 = vld1q_f32(&B[0]), b1 = vld1q_f32(&B[4]);
    float32x4_t b2 = vld1q_f32(&B[8]), b3 = vld1q_f32(&B[12]);
    for (int i = 0; i < 4; i++) {
        float32x4_t a = vld1q_f32(&A[i * 4]);
        float32x4_t row = vmulq_lane_f32(b0, vget_low_f32(a), 0);   /* a[i][0] * B row 0 */
        row = vfmaq_lane_f32(row, b1, vget_low_f32(a), 1);
        row = vfmaq_lane_f32(row, b2, vget_high_f32(a), 0);
        row = vfmaq_lane_f32(row, b3, vget_high_f32(a), 1);
        vst1q_f32(&C[i * 4], row);
    }
}
static void mat_mul_4x4_ref(const float A[16], const float B[16], float C[16])
{
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 4; j++) {
            float s = 0;
            for (int k = 0; k < 4; k++) s += A[i * 4 + k] * B[k * 4 + j];
            C[i * 4 + j] = s;
        }
}

/* ---- YUYV (YUV 4:2:2 packed) -> RGB24, full-range V4L2_YCBCR_ENC_601, Q8 coefficients ---- */
static inline uint8_t clamp8(int v) { return v < 0 ? 0 : v > 255 ? 255 : (uint8_t)v; }
static void yuyv_to_rgb_ref(const uint8_t *yuyv, uint8_t *rgb, int pixels)
{
    for (int i = 0; i < pixels; i += 2) {
        int u = yuyv[i * 2 + 1] - 128, v = yuyv[i * 2 + 3] - 128;
        for (int k = 0; k < 2; k++) {
            int y = yuyv[i * 2 + k * 2] * 256;
            rgb[(i + k) * 3 + 0] = clamp8((y + 359 * v + 128) >> 8);
            rgb[(i + k) * 3 + 1] = clamp8((y - 88 * u - 183 * v + 128) >> 8);
            rgb[(i + k) * 3 + 2] = clamp8((y + 454 * u + 128) >> 8);
        }
    }
}
/* 8 Y values + their U,V (one per pair, already duplicated) -> 8 R, G, B */
static inline void yuv8_to_rgb(uint8x8_t y, int16x8_t u, int16x8_t v,
                               uint8x8_t *r, uint8x8_t *g, uint8x8_t *b)
{
    int32x4_t ylo = vshll_n_s16(vget_low_s16(vreinterpretq_s16_u16(vmovl_u8(y))), 8);
    int32x4_t yhi = vshll_n_s16(vget_high_s16(vreinterpretq_s16_u16(vmovl_u8(y))), 8);
    int32x4_t rnd = vdupq_n_s32(128);
#define CH(dst, cu, cv) do {                                                             \
        int32x4_t lo = vaddq_s32(vaddq_s32(ylo, rnd),                                     \
            vaddq_s32(vmull_n_s16(vget_low_s16(u), cu), vmull_n_s16(vget_low_s16(v), cv)));   \
        int32x4_t hi = vaddq_s32(vaddq_s32(yhi, rnd),                                     \
            vaddq_s32(vmull_n_s16(vget_high_s16(u), cu), vmull_n_s16(vget_high_s16(v), cv))); \
        dst = vqmovun_s16(vcombine_s16(vshrn_n_s32(lo, 8), vshrn_n_s32(hi, 8)));         \
    } while (0)
    CH(*r, 0, 359);
    CH(*g, -88, -183);
    CH(*b, 454, 0);
#undef CH
}
static void yuyv_to_rgb_neon(const uint8_t *yuyv, uint8_t *rgb, int pixels)
{
    int i = 0;
    for (; i + 16 <= pixels; i += 16) {
        uint8x8x4_t q = vld4_u8(&yuyv[i * 2]);       /* Y0 U Y1 V, 8 pairs = 16 pixels */
        int16x8_t u = vsubq_s16(vreinterpretq_s16_u16(vmovl_u8(q.val[1])), vdupq_n_s16(128));
        int16x8_t v = vsubq_s16(vreinterpretq_s16_u16(vmovl_u8(q.val[3])), vdupq_n_s16(128));
        uint8x8_t r0, g0, b0, r1, g1, b1;
        yuv8_to_rgb(q.val[0], u, v, &r0, &g0, &b0);  /* even pixels */
        yuv8_to_rgb(q.val[2], u, v, &r1, &g1, &b1);  /* odd pixels share U, V */
        uint8x8x2_t r = vzip_u8(r0, r1), g = vzip_u8(g0, g1), b = vzip_u8(b0, b1);
        uint8x16x3_t out = { { vcombine_u8(r.val[0], r.val[1]),
                               vcombine_u8(g.val[0], g.val[1]),
                               vcombine_u8(b.val[0], b.val[1]) } };
        vst3q_u8(&rgb[i * 3], out);
    }
    yuyv_to_rgb_ref(yuyv + i * 2, rgb + i * 3, pixels - i);   /* tail */
}

/* ---- 3x3 box filter (mean of 9, truncating), interior pixels only ---- */
static void box3_ref(const uint8_t *in, uint8_t *out, int W, int H)
{
    for (int y = 1; y < H - 1; y++)
        for (int x = 1; x < W - 1; x++) {
            int s = 0;
            for (int dy = -1; dy <= 1; dy++)
                for (int dx = -1; dx <= 1; dx++) s += in[(y + dy) * W + x + dx];
            out[y * W + x] = (uint8_t)(s / 9);
        }
}
static void box3_neon(const uint8_t *in, uint8_t *out, int W, int H)
{
    for (int y = 1; y < H - 1; y++) {
        int x = 1;
        for (; x + 8 <= W - 1; x += 8) {
            const uint8_t *p = &in[y * W + x];
            uint16x8_t s = vdupq_n_u16(0);
            for (int dy = -1; dy <= 1; dy++) {          /* three rows, each with left/centre/right */
                const uint8_t *q = p + dy * W;
                s = vaddw_u8(s, vld1_u8(q - 1));
                s = vaddw_u8(s, vld1_u8(q));
                s = vaddw_u8(s, vld1_u8(q + 1));
            }
            /* s <= 2295, and (s * 7282) >> 16 == s / 9 for all of them */
            uint32x4_t lo = vmull_n_u16(vget_low_u16(s), 7282), hi = vmull_n_u16(vget_high_u16(s), 7282);
            uint16x8_t q9 = vcombine_u16(vshrn_n_u32(lo, 16), vshrn_n_u32(hi, 16));
            vst1_u8(&out[y * W + x], vmovn_u16(q9));
        }
        for (; x < W - 1; x++) {                       /* tail */
            int s = 0;
            for (int dy = -1; dy <= 1; dy++)
                for (int dx = -1; dx <= 1; dx++) s += in[(y + dy) * W + x + dx];
            out[y * W + x] = (uint8_t)(s / 9);
        }
    }
}

/* ---- Sobel Gx = [-1 0 1; -2 0 2; -1 0 1], |Gx| saturated to 255 ---- */
static void sobel_gx_ref(const uint8_t *in, uint8_t *out, int W, int H)
{
    for (int y = 1; y < H - 1; y++)
        for (int x = 1; x < W - 1; x++) {
            const uint8_t *p = &in[y * W + x];
            int gx = (p[-W + 1] + 2 * p[1] + p[W + 1]) - (p[-W - 1] + 2 * p[-1] + p[W - 1]);
            gx = gx < 0 ? -gx : gx;
            out[y * W + x] = (uint8_t)(gx > 255 ? 255 : gx);
        }
}
static void sobel_gx_neon(const uint8_t *in, uint8_t *out, int W, int H)
{
    for (int y = 1; y < H - 1; y++) {
        int x = 1;
        for (; x + 8 <= W - 1; x += 8) {               /* 8 pixels per step */
            const uint8_t *p = &in[y * W + x];
            int16x8_t r = vreinterpretq_s16_u16(vaddl_u8(vld1_u8(p - W + 1), vld1_u8(p + W + 1)));
            int16x8_t l = vreinterpretq_s16_u16(vaddl_u8(vld1_u8(p - W - 1), vld1_u8(p + W - 1)));
            r = vaddq_s16(r, vshlq_n_s16(vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + 1))), 1));
            l = vaddq_s16(l, vshlq_n_s16(vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - 1))), 1));
            vst1_u8(&out[y * W + x], vqmovun_s16(vabsq_s16(vsubq_s16(r, l))));
        }
        for (; x < W - 1; x++) {
            const uint8_t *p = &in[y * W + x];
            int gx = (p[-W + 1] + 2 * p[1] + p[W + 1]) - (p[-W - 1] + 2 * p[-1] + p[W - 1]);
            gx = gx < 0 ? -gx : gx;
            out[y * W + x] = (uint8_t)(gx > 255 ? 255 : gx);
        }
    }
}

/* ---- quaternion product (x, y, z, w) layout ---- */
static void quat_mul_ref(const float a[4], const float b[4], float r[4])
{
    r[0] = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1];
    r[1] = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0];
    r[2] = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3];
    r[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
}
static float32x4_t quat_mul(float32x4_t a, float32x4_t b)
{
    /* r = a.w*b + a.x*(w,-z,y,-x) + a.y*(z,w,-x,-y) + a.z*(-y,x,w,-z), b = (x,y,z,w) */
    static const float sx[4] = { 1, -1, 1, -1 }, sy[4] = { 1, 1, -1, -1 }, sz[4] = { -1, 1, 1, -1 };
    float32x4_t bx = vmulq_f32(vrev64q_f32(vextq_f32(b, b, 2)), vld1q_f32(sx));  /* (w, z, y, x) * sx */
    float32x4_t by = vmulq_f32(vextq_f32(b, b, 2), vld1q_f32(sy));               /* (z, w, x, y) * sy */
    float32x4_t bz = vmulq_f32(vrev64q_f32(b), vld1q_f32(sz));                   /* (y, x, w, z) * sz */
    float32x4_t r = vmulq_laneq_f32(b, a, 3);
    r = vfmaq_laneq_f32(r, bx, a, 0);
    r = vfmaq_laneq_f32(r, by, a, 1);
    return vfmaq_laneq_f32(r, bz, a, 2);
}
```

- **4×4 행렬 곱**: `vmulq_lane_f32(b0, a, 0)`은 B의 0행 벡터에 A의 원소 하나를 곱합니다. 출력 한 행을 B의 네 행의 선형 결합으로 만드는 방식입니다.
- **YUYV → RGB**: `vld4_u8`이 16 pixel 분량의 Y0·U·Y1·V를 네 레지스터로 나누고, 짝수·홀수 pixel을 따로 계산한 뒤 `vzip_u8`로 다시 섞어 `vst3q_u8`로 RGB24를 씁니다. 계수는 v6.12 `colorspaces-details.rst`의 `V4L2_YCBCR_ENC_601` 식(Y' = 0.2990R' + 0.5870G' + 0.1140B' 등)을 역행렬로 푼 R = Y + 1.402 Cr, G = Y − 0.3441 Cb − 0.7141 Cr, B = Y + 1.772 Cb를 256배해 반올림한 값(359, 88, 183, 454)이고, 이 역산은 이 글의 계산입니다. 0~255 전체를 쓰는 full range를 가정했습니다.
- **3×3 box filter**: 세 행 각각의 왼쪽·가운데·오른쪽을 `vld1_u8`로 읽어 16-bit로 더합니다. 9로 나누기는 곱셈과 shift로 바꿨습니다. 합의 최댓값 9 × 255 = 2,295 이하의 모든 값에서 `(s × 7282) >> 16`이 `s / 9`와 같다는 것을 0~2,295 전수 검사로 확인했습니다.
- **Sobel Gx**: 왼쪽 열과 오른쪽 열을 따로 모아 빼고 `vabsq_s16`·`vqmovun_s16`으로 0~255에 넣습니다. 한 번에 8 pixel을 처리하므로 루프도 8씩 전진합니다.
- **quaternion 곱**: 결과의 각 lane이 b의 서로 다른 원소를 필요로 하므로 `vextq_f32`·`vrev64q_f32`로 b를 (w,z,y,x), (z,w,x,y), (y,x,w,z) 순서로 돌리고 부호 벡터를 곱한 뒤 a의 lane 값으로 FMA합니다.

### 결과가 같은지, 그리고 몇 배인지

```c
/* correctness against scalar references, then scalar vs NEON timing */
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "kernels.h"

#define W 1920
#define H 1080
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static float *launder(float *p) { __asm__ volatile("" : "+r"(p) :: "memory"); return p; }
#define BEST5(var, body) do { var = 1e9; for (int t_ = 0; t_ < 5; t_++) { double t0_ = now(); body; double e_ = now() - t0_; if (e_ < var) var = e_; } } while (0)

int main(void)
{
    static uint8_t img[W * H], o1[W * H], o2[W * H], yuyv[W * H * 2], rgb1[W * H * 3], rgb2[W * H * 3];
    srand(1);
    for (int i = 0; i < W * H; i++) img[i] = (uint8_t)rand();
    for (int i = 0; i < W * H * 2; i++) yuyv[i] = (uint8_t)rand();

    /* correctness */
    float A[16], B[16], C1[16], C2[16];
    for (int i = 0; i < 16; i++) { A[i] = (float)(rand() % 1000) / 1000.0f - 0.5f; B[i] = (float)(rand() % 1000) / 1000.0f - 0.5f; }
    mat_mul_4x4(A, B, C1); mat_mul_4x4_ref(A, B, C2);
    float md = 0; for (int i = 0; i < 16; i++) md = fmaxf(md, fabsf(C1[i] - C2[i]));
    printf("mat_mul_4x4 max |neon - ref| = %.2g\n", md);

    yuyv_to_rgb_neon(yuyv, rgb1, W * H); yuyv_to_rgb_ref(yuyv, rgb2, W * H);
    printf("yuyv_to_rgb 1080p: %s\n", memcmp(rgb1, rgb2, sizeof rgb1) ? "MISMATCH" : "identical to scalar");
    memset(o1, 0, sizeof o1); memset(o2, 0, sizeof o2);
    box3_neon(img, o1, W, H); box3_ref(img, o2, W, H);
    printf("box3 1080p: %s\n", memcmp(o1, o2, sizeof o1) ? "MISMATCH" : "identical to scalar");
    memset(o1, 0, sizeof o1); memset(o2, 0, sizeof o2);
    sobel_gx_neon(img, o1, W, H); sobel_gx_ref(img, o2, W, H);
    printf("sobel_gx 1080p: %s\n", memcmp(o1, o2, sizeof o1) ? "MISMATCH" : "identical to scalar");
    float qa[4] = { 0.1f, 0.2f, 0.3f, 0.927f }, qb[4] = { -0.5f, 0.4f, 0.1f, 0.76f }, qr[4], qn[4];
    quat_mul_ref(qa, qb, qr); vst1q_f32(qn, quat_mul(vld1q_f32(qa), vld1q_f32(qb)));
    md = 0; for (int i = 0; i < 4; i++) md = fmaxf(md, fabsf(qr[i] - qn[i]));
    printf("quat_mul max |neon - ref| = %.2g\n", md);

    /* timing: best of 5 */
    double ts, tn;
    BEST5(ts, for (int r = 0; r < 1000000; r++) mat_mul_4x4_ref(launder(A), B, launder(C2)););
    BEST5(tn, for (int r = 0; r < 1000000; r++) mat_mul_4x4(launder(A), B, launder(C1)););
    printf("%-22s scalar %8.3f ms  NEON %8.3f ms  x%.1f\n", "4x4 matmul x1e6", ts * 1e3, tn * 1e3, ts / tn);
    BEST5(ts, yuyv_to_rgb_ref(yuyv, rgb2, W * H));
    BEST5(tn, yuyv_to_rgb_neon(yuyv, rgb1, W * H));
    printf("%-22s scalar %8.3f ms  NEON %8.3f ms  x%.1f\n", "YUYV->RGB 1080p", ts * 1e3, tn * 1e3, ts / tn);
    BEST5(ts, box3_ref(img, o2, W, H));
    BEST5(tn, box3_neon(img, o1, W, H));
    printf("%-22s scalar %8.3f ms  NEON %8.3f ms  x%.1f\n", "box 3x3 1080p", ts * 1e3, tn * 1e3, ts / tn);
    BEST5(ts, sobel_gx_ref(img, o2, W, H));
    BEST5(tn, sobel_gx_neon(img, o1, W, H));
    printf("%-22s scalar %8.3f ms  NEON %8.3f ms  x%.1f\n", "Sobel Gx 1080p", ts * 1e3, tn * 1e3, ts / tn);
    return 0;
}
```

참조 C 코드는 clang이 스스로 벡터화할 수 있으므로, 같은 프로그램을 자동 벡터화를 켠 채와 끈 채(`-fno-vectorize -fno-slp-vectorize`) 두 번 빌드했습니다. NEON 경로는 intrinsics라 두 빌드에서 같습니다.

```bash
#!/bin/bash
# reference C at -O2 (clang may auto-vectorize it) and with vectorization off; NEON paths are intrinsics either way
cc --version | head -1
for f in "" "-fno-vectorize -fno-slp-vectorize"; do
  echo "== cc -std=c11 -O2 $f"
  cc -std=c11 -O2 -Wall $f -o neon_bench neon_bench.c && ./neon_bench
done
cc -std=c11 -O2 -Wall -march=armv8-a+crypto -o aes aes.c && ./aes
```

```text
Apple clang version 21.0.0 (clang-2100.4.1.1)
== cc -std=c11 -O2 
mat_mul_4x4 max |neon - ref| = 0
yuyv_to_rgb 1080p: identical to scalar
box3 1080p: identical to scalar
sobel_gx 1080p: identical to scalar
quat_mul max |neon - ref| = 0
4x4 matmul x1e6        scalar    5.562 ms  NEON    1.307 ms  x4.3
YUYV->RGB 1080p        scalar    1.236 ms  NEON    0.627 ms  x2.0
box 3x3 1080p          scalar    0.650 ms  NEON    0.336 ms  x1.9
Sobel Gx 1080p         scalar    0.298 ms  NEON    0.228 ms  x1.3
== cc -std=c11 -O2 -fno-vectorize -fno-slp-vectorize
mat_mul_4x4 max |neon - ref| = 0
yuyv_to_rgb 1080p: identical to scalar
box3 1080p: identical to scalar
sobel_gx 1080p: identical to scalar
quat_mul max |neon - ref| = 0
4x4 matmul x1e6        scalar    5.515 ms  NEON    1.281 ms  x4.3
YUYV->RGB 1080p        scalar    2.931 ms  NEON    0.608 ms  x4.8
box 3x3 1080p          scalar    2.059 ms  NEON    0.325 ms  x6.3
Sobel Gx 1080p         scalar    1.757 ms  NEON    0.223 ms  x7.9
AESE/AESMC : 69c4e0d86a7b0430d8cdb78070b4c55a
CommonCrypto: 69c4e0d86a7b0430d8cdb78070b4c55a
match
```

| 커널 | C, 자동 벡터화 끔 | C, `-O2` 기본 | NEON | NEON 배수 (끔 / 기본) |
| --- | ---: | ---: | ---: | ---: |
| 4×4 행렬 곱 100만 번 | 5.515 ms | 5.562 ms | 1.28~1.31 ms | 4.3 / 4.3 |
| YUYV → RGB 1080p | 2.931 ms | 1.236 ms | 0.61~0.63 ms | 4.8 / 2.0 |
| box 3×3 1080p | 2.059 ms | 0.650 ms | 0.33 ms | 6.3 / 1.9 |
| Sobel Gx 1080p | 1.757 ms | 0.298 ms | 0.22 ms | 7.9 / 1.3 |

- **다섯 커널 모두 scalar와 결과가 같았습니다.** 영상 셋은 1080p 전체에서 byte 단위로 같았고, 행렬·quaternion은 최대 차이가 0이었습니다. 정확도부터 확인해야 배수에 의미가 있습니다.
- **"몇 배"는 무엇과 비교하느냐에 달려 있었습니다.** Sobel은 순수 scalar 대비 7.9배였지만, 컴파일러가 이미 벡터화한 C 대비는 1.3배였습니다. 단순한 영상 루프는 `-O2`만으로 상당 부분 벡터화되므로, intrinsics의 이득은 자동 벡터화가 못 하는 곳(YUYV처럼 채널이 섞인 데이터, 행렬처럼 lane을 넘나드는 연산)에서 더 컸습니다.
- 이 숫자는 M2 Pro의 것입니다. Cortex-A 보드에서는 같은 `run-neon.sh`로 다시 잽니다.

### AES crypto extension

ARMv8의 crypto extension은 AES 한 round의 일부를 명령 하나로 합니다. `vaeseq_u8`는 AddRoundKey·SubBytes·ShiftRows, `vaesmcq_u8`는 MixColumns입니다. AES-128 한 block을 이 두 명령으로 암호화하고, 같은 key·입력을 macOS CommonCrypto(`CCCrypt`, ECB)에 넣은 결과와 비교했습니다. 이 Mac은 `sysctl hw.optional.arm.FEAT_AES`가 1입니다.

```c
/* one AES-128 block with AESE/AESMC, checked against CommonCrypto (macOS) */
#include <arm_neon.h>
#include <CommonCrypto/CommonCryptor.h>
#include <stdio.h>
#include <string.h>

/* FIPS-197 key expansion for AES-128 (software), 11 round keys */
static void expand(const uint8_t key[16], uint8_t rk[11][16])
{
    static const uint8_t sbox[256] = {
#include "sbox.inc"
    };
    static const uint8_t rcon[10] = { 1, 2, 4, 8, 16, 32, 64, 128, 0x1b, 0x36 };
    memcpy(rk[0], key, 16);
    for (int i = 1; i < 11; i++) {
        const uint8_t *p = rk[i - 1];
        uint8_t t[4] = { sbox[p[13]] ^ rcon[i - 1], sbox[p[14]], sbox[p[15]], sbox[p[12]] };
        for (int j = 0; j < 16; j++) rk[i][j] = p[j] ^ (j < 4 ? t[j] : rk[i][j - 4]);
    }
}

int main(void)
{
    uint8_t key[16], in[16], rk[11][16], hw[16], ref[16];
    for (int i = 0; i < 16; i++) { key[i] = (uint8_t)i; in[i] = (uint8_t)(i * 0x11); }   /* FIPS-197 C.1 */
    expand(key, rk);

    uint8x16_t s = vld1q_u8(in);
    for (int r = 0; r < 9; r++) s = vaesmcq_u8(vaeseq_u8(s, vld1q_u8(rk[r])));   /* AddRoundKey+SubBytes+ShiftRows, MixColumns */
    s = veorq_u8(vaeseq_u8(s, vld1q_u8(rk[9])), vld1q_u8(rk[10]));                 /* last round: no MixColumns */
    vst1q_u8(hw, s);

    size_t n;
    CCCrypt(kCCEncrypt, kCCAlgorithmAES, kCCOptionECBMode, key, 16, NULL, in, 16, ref, 16, &n);
    printf("AESE/AESMC : "); for (int i = 0; i < 16; i++) printf("%02x", hw[i]);
    printf("\nCommonCrypto: "); for (int i = 0; i < 16; i++) printf("%02x", ref[i]);
    printf("\n%s\n", memcmp(hw, ref, 16) ? "MISMATCH" : "match");
    return 0;
}
```

key expansion에 쓰는 S-box는 FIPS-197 5.1.1의 정의(GF(2^8) 역원 + affine 변환)대로 아래 스크립트가 만듭니다.

```python
# AES S-box from FIPS-197 5.1.1: multiplicative inverse in GF(2^8), then the affine transform
def mul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = ((a << 1) ^ 0x11B) if a & 0x80 else a << 1
        b >>= 1
    return r

inv = [0] * 256
for a in range(1, 256):
    inv[a] = next(b for b in range(1, 256) if mul(a, b) == 1)
sbox = []
for a in range(256):
    x = s = inv[a]
    for k in range(1, 5):
        s ^= ((x << k) | (x >> (8 - k))) & 0xFF
    sbox.append(s ^ 0x63)
with open("sbox.inc", "w") as f:
    f.write(",\n".join(", ".join("0x%02x" % v for v in sbox[i:i + 16]) for i in range(0, 256, 16)) + "\n")
```

두 결과가 `69c4e0d86a7b0430d8cdb78070b4c55a`로 같았습니다(위 출력 마지막 세 줄). SHA-256 쪽 intrinsic `vsha256hq_u32`는 clang 21 `arm_neon.h`에서 `(uint32x4_t, uint32x4_t, uint32x4_t)`를 받는 함수로, 이 글에서는 실행하지 않았습니다. TLS나 secure boot에서 실제 이득은 OpenSSL·mbedTLS 같은 라이브러리가 이 경로를 쓰는지에 달려 있습니다.

### CMSIS-DSP FFT

```c
#include "arm_math.h"

#define FFT_SIZE 512
static arm_rfft_fast_instance_f32 fft;
static float32_t input[FFT_SIZE], output[FFT_SIZE], magnitude[FFT_SIZE / 2];

void spectrum(void)
{
    arm_rfft_fast_init_f32(&fft, FFT_SIZE);
    arm_rfft_fast_f32(&fft, input, output, 0);     /* input is overwritten */
    arm_cmplx_mag_f32(output, magnitude, FFT_SIZE / 2);
    /* magnitude[0] mixes DC and Nyquist: output[0] is DC, output[1] is the Nyquist value */
}
```

함수 시그니처는 CMSIS-DSP v1.16.2 `transform_functions.h`(586–594행)와 `complex_math_functions.h`(141–144행)에 있습니다. `arm_rfft_fast_f32.c`의 설명에는 두 가지 함정이 적혀 있습니다. 입력 buffer `p`는 "Source buffer is modified by this function"이고, 출력 N개 float 중 첫 복소수의 허수부 자리에 Nyquist 주파수의 실수값을 넣는다("the last real is packaged in the imaginary part of the first complex")는 것입니다. 그래서 위처럼 `arm_cmplx_mag_f32`를 그대로 부르면 `magnitude[0]`은 DC가 아니라 DC와 Nyquist를 섞은 값입니다. 지원 길이는 32~4,096입니다. 이 절은 CMSIS-DSP를 빌드하지 않아 실행하지 않았습니다.

### Cortex-M55 Helium (MVE)과 CPACR

MVE는 NEON과 다른 ISA지만 생각하는 방식은 같고, tail을 predicate로 처리합니다. QEMU `mps3-an547`(Cortex-M55)에서 21개 원소를 3배하고, CPACR을 켜지 않은 빌드도 함께 돌렸습니다. `bm.h`·`startup_bm.c`·`link-an547.ld`는 [8-07의 재현 환경](/blog/embedded/modern-recipes/part8-07-simd#재현-환경)과 같습니다.

```c
/* Helium in-place scale on Cortex-M55, then the same without enabling CP10/CP11 */
#include <arm_mve.h>
#include "bm.h"

void scale_mve(int16_t *a, int16_t k, int N)
{
    for (int n = N; n > 0; n -= 8) {
        mve_pred16_t p = vctp16q(n);
        int16x8_t v = vld1q_z_s16(a, p);
        v = vmulq_x_s16(v, vdupq_n_s16(k), p);
        vst1q_p_s16(a, v, p);
        a += 8;
    }
}

void HardFault_Handler(void)
{
    puts_("HardFault: CFSR="); putx(*(volatile uint32_t *)0xE000ED28);
    puts_(" HFSR="); putx(*(volatile uint32_t *)0xE000ED2C); puts_("\n");
    exit_();
}

static int16_t a[21 + 4];

int main(void)
{
#ifndef SKIP_CPACR
    *(volatile uint32_t *)0xE000ED88 |= 0xFu << 20;   /* CPACR: CP10, CP11 full access */
    __asm volatile("dsb\n isb");
#endif
    for (int i = 0; i < 21; i++) a[i] = (int16_t)(i - 10);
    for (int i = 21; i < 25; i++) a[i] = 0x5555;
    scale_mve(a, 3, 21);
    int bad = 0;
    for (int i = 0; i < 21; i++) bad += a[i] != (int16_t)(3 * (i - 10));
    for (int i = 21; i < 25; i++) bad += a[i] != 0x5555;
    puts_("scale_mve N=21 k=3: a[0]="); putu((unsigned)(a[0] + 0x10000) & 0xffff);
    puts_(" a[20]="); putu((unsigned)a[20]); puts_(" mismatches="); putu((unsigned)bad); puts_("\n");
    exit_();
}
```

```bash
#!/bin/bash
CF="-O2 -g -ffreestanding -nostdlib -fno-builtin -mthumb -mcpu=cortex-m55 -mfloat-abi=hard"
for d in "" -DSKIP_CPACR; do
  arm-none-eabi-gcc $CF $d -T link-an547.ld -o mve_scale.elf startup_bm.c mve_scale.c -lgcc
  echo "== $d"
  timeout 10 qemu-system-arm -M mps3-an547 -nographic -semihosting -kernel mve_scale.elf
done
```

```text
== 
scale_mve N=21 k=3: a[0]=65506 a[20]=30 mismatches=0
== -DSKIP_CPACR
HardFault: CFSR=0x00080000 HFSR=0x40000000
```

첫 실행은 21개 모두 맞았고 guard도 그대로였습니다(`a[0]`은 −30을 16-bit unsigned로 찍은 65506입니다). CPACR을 건너뛴 실행은 첫 벡터 명령에서 HardFault가 났고, CFSR `0x00080000`은 bit 19, 즉 CMSIS `core_cm3.h`의 `SCB_CFSR_NOCP_Pos`(UFSR 시작 16 + 3)입니다. ARMv7-M ARM(DDI 0403E.b) B3.2.20은 CPACR(`0xE000ED88`)의 CP10·CP11이 0b00이면 "Any attempted access generates a NOCP UsageFault"라고 적습니다. UsageFault handler를 켜지 않았으므로 HardFault(HFSR FORCED)로 올라왔습니다. Cortex-M55는 ARMv8.1-M이라 이 ARMv7-M 문서가 직접 그 코어를 정의하지는 않지만, 같은 레지스터와 같은 결과가 관찰됐습니다.

### 누산기 여러 개

```c
float32x4_t acc0 = vdupq_n_f32(0), acc1 = acc0, acc2 = acc0, acc3 = acc0;

for (int i = 0; i + 16 <= N; i += 16) {
    acc0 = vfmaq_f32(acc0, vld1q_f32(&a[i]),      vld1q_f32(&b[i]));
    acc1 = vfmaq_f32(acc1, vld1q_f32(&a[i + 4]),  vld1q_f32(&b[i + 4]));
    acc2 = vfmaq_f32(acc2, vld1q_f32(&a[i + 8]),  vld1q_f32(&b[i + 8]));
    acc3 = vfmaq_f32(acc3, vld1q_f32(&a[i + 12]), vld1q_f32(&b[i + 12]));
}
float result = vaddvq_f32(vaddq_f32(vaddq_f32(acc0, acc1), vaddq_f32(acc2, acc3)));
/* plus a scalar tail for N % 16 */
```

이 dot product는 [PE 2-09](/blog/embedded/performance-engineering/part2-09-simd-neon)가 같은 M2 Pro에서 쟀습니다(누산기 1개 0.28 ns/원소, 4개 0.07 ns/원소). 합만 하는 같은 구조는 [8-07](/blog/embedded/modern-recipes/part8-07-simd)에서 1개 0.243 → 4개 0.053 ns/원소였습니다.

## 측정 / 성능 비교

위 표가 이 글의 측정입니다. 정리하면 다음과 같습니다.

- 정확도: 다섯 커널 모두 scalar 참조와 byte 단위(실수는 차이 0)로 같았고, AES block은 CommonCrypto와 같았습니다.
- 배수: 순수 scalar 대비 4.3~7.9배, 컴파일러가 벡터화한 C 대비 1.3~4.3배였습니다(M2 Pro, clang 21 `-O2`, 5회 중 최솟값).
- 행렬 곱은 두 빌드 모두 4.3배였습니다. `-O2` 빌드에서 clang은 참조 루프의 store를 SLP로 묶었다고 보고했지만(`-Rpass=slp-vectorizer`: "Stores SLP vectorized with cost -3"), 시간은 끈 빌드와 같았습니다(5.562 대 5.515 ms).

FFT, SHA-256의 시간은 재지 않았습니다.

## 자주 보는 함정

> ⚠️ Saturating과 wrapping 혼동

```c
uint8x16_t w = vaddq_u8(a, b);    /* 255 + 1 = 0   */
uint8x16_t s = vqaddq_u8(a, b);   /* 255 + 1 = 255 */
```

영상 밝기를 더할 때 wrap하면 가장 밝은 pixel이 가장 어두워집니다. [8-07](/blog/embedded/modern-recipes/part8-07-simd#saturating-arithmetic) 실행에서 200 + 60이 `vqaddq_u8`로 255, 일반 덧셈으로 4가 됐습니다. 이 글의 Sobel과 YUYV 변환도 마지막에 `vqmovun_s16`으로 0~255에 가둡니다.

> ⚠️ 루프 보폭과 처리 폭 불일치

```c
for (int x = 1; x + 16 <= W - 1; x += 16) {
    uint8x8_t px = vld1_u8(&row[x]);   /* 8 pixels */
    /* ... store 8 results ... */
}
```

16씩 전진하면서 8개만 처리하면 절반의 pixel이 빈 채로 남습니다. 이 글의 Sobel·box filter는 8씩 전진하고, 결과를 scalar 참조와 비교해 빠진 pixel이 없는지 확인했습니다.

> ⚠️ 벡터 안에서 이웃을 회전시켜 얻음

```c
uint16x8_t left = vextq_u16(sum, sum, 7);   /* lane 0 gets lane 7, not the pixel to its left */
```

같은 벡터를 회전하면 첫 lane의 "왼쪽"은 실제 왼쪽 pixel이 아니라 같은 벡터의 마지막 lane입니다. 이 글의 box filter처럼 `p - 1`, `p + 1`에서 따로 load하거나, 이웃 벡터와 `vextq`합니다.

> ⚠️ Interleaved와 planar 혼동

YUYV를 `vld1q_u8`로 읽으면 Y와 U·V가 한 레지스터에 섞입니다. 위 표처럼 채널 수에 맞는 `vldN`을 고릅니다.

> ⚠️ Tail 처리 누락

이 글의 영상 커널은 8 pixel 단위 뒤에 scalar tail을 두었고, YUYV는 16 pixel 단위 뒤에 참조 함수를 다시 부릅니다. MVE는 위 `scale_mve`처럼 predicate로 처리합니다.

> ⚠️ Register pressure

AArch64 NEON 레지스터는 32개입니다(AAPCS64). 누산기와 load 값이 이보다 많아지면 컴파일러가 stack으로 spill합니다. 펼치는 폭을 늘렸다면 디스어셈블에서 `sp`에 대한 `str q`/`ldr q`가 생겼는지 확인합니다.

> ⚠️ Cortex-M에서 FPU·MVE를 켜지 않음

위 `-DSKIP_CPACR` 실행처럼 첫 벡터·부동소수점 명령에서 NOCP UsageFault가 납니다. startup 코드에서 CPACR의 CP10·CP11을 켜고 `dsb`·`isb`를 둔 뒤 그 명령을 씁니다.

## 재현 환경

Mac 측정은 Apple M2 Pro, macOS, Apple clang 21.0.0입니다. `kernels.h`·`neon_bench.c`·`run-neon.sh`·`aes.c`·`gen_sbox.py`를 한 디렉터리에 두고 다음을 실행합니다.

```bash
python3 gen_sbox.py        # writes sbox.inc for aes.c
bash run-neon.sh
```

Cortex-M55 실행은 `arm-none-eabi-gcc` 16.2.0과 QEMU 11.1.3 `mps3-an547`이고 `bash run-mve.sh`입니다.

## 정리

- NEON 커널은 먼저 scalar 참조와 결과를 비교합니다. 이 글의 다섯 커널은 모두 같았습니다.
- 영상 커널의 이득은 순수 scalar 대비 4.8~7.9배였지만, 컴파일러가 벡터화한 C 대비는 1.3~2.0배였습니다.
- 채널이 섞인 데이터(YUYV)는 `vld4`·`vzip`·`vst3`로 다루고, 4×4 행렬처럼 lane을 넘나드는 연산에서 intrinsics의 이득(4.3배)이 컸습니다.
- `vaeseq_u8`·`vaesmcq_u8`로 만든 AES-128 block은 CommonCrypto와 같았습니다.
- CMSIS-DSP real FFT는 입력을 덮어쓰고, 첫 출력 복소수에 Nyquist 값을 함께 담습니다.
- Cortex-M55 MVE는 predicate로 tail을 처리했고, CPACR을 켜지 않으면 NOCP fault가 났습니다.

이 시리즈 Part 8의 SIMD 두 편은 여기까지입니다. 다음 편은 **스택 분석**입니다.

## 관련 항목

- [8-07: SIMD 활용](/blog/embedded/modern-recipes/part8-07-simd)
- [8-03: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
