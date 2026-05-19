---
title: "3-06: ARM NEON 심화 — Matrix Multiply·FFT·Image Filter"
date: 2026-05-20T13:00:00
description: "NEON 실전 최적화. Matrix multiply·FFT·convolution·color conversion·image filter."
series: "Modern Embedded Recipes"
seriesOrder: 18
tags: [recipes, neon, matrix, fft, image, simd]
draft: true
---

## 한 줄 요약

> **"NEON 진짜 효과 = matrix·FFT·image processing"** — 4-8x 가속.

## Matrix Multiply 4x4

```c
#include <arm_neon.h>

void mat_mul_4x4(const float A[16], const float B[16], float C[16]) {
    float32x4_t b0 = vld1q_f32(&B[0]);
    float32x4_t b1 = vld1q_f32(&B[4]);
    float32x4_t b2 = vld1q_f32(&B[8]);
    float32x4_t b3 = vld1q_f32(&B[12]);
    
    for (int i = 0; i < 4; i++) {
        float32x4_t a = vld1q_f32(&A[i * 4]);
        float32x4_t row = vmulq_lane_f32(b0, vget_low_f32(a), 0);
        row = vfmaq_lane_f32(row, b1, vget_low_f32(a), 1);
        row = vfmaq_lane_f32(row, b2, vget_high_f32(a), 0);
        row = vfmaq_lane_f32(row, b3, vget_high_f32(a), 1);
        vst1q_f32(&C[i * 4], row);
    }
}
```

`vmulq_lane_f32(b, a, idx)` — `b * a[idx]` (vector × scalar). 4×4 matrix → *16 FMA, 8 load, 4 store*.

자동차 sensor fusion·자세 제어 — 4x4·3x3 matrix 핵심.

## Color Conversion — YUV → RGB

```c
void yuv422_to_rgb(const uint8_t *yuv, uint8_t *rgb, int N) {
    /* YUV422: Y0 U Y1 V Y2 U Y3 V ... */
    /* RGB: R G B R G B ... */
    
    int16x8_t y_offset = vdupq_n_s16(-16);
    int16x8_t uv_offset = vdupq_n_s16(-128);
    
    for (int i = 0; i + 16 <= N; i += 16) {
        uint8x16x2_t yuv_pair = vld2q_u8(&yuv[i * 2]);
        uint8x16_t y = yuv_pair.val[0];   /* Y0,Y1,Y2,... */
        uint8x16_t uv = yuv_pair.val[1];  /* U,V,U,V,... */
        
        /* Process and convert (~10 NEON ops) */
        /* ... */
        
        uint8x16x3_t rgb_pair = { r, g, b };
        vst3q_u8(&rgb[i * 3], rgb_pair);
    }
}
```

`vld2q_u8` — interleaved load. `vst3q_u8` — 3-channel interleaved store.

Camera·video codec 표준.

## Box Filter 3×3

```c
void box_filter_3x3(const uint8_t *in, uint8_t *out, int W, int H) {
    for (int y = 1; y < H - 1; y++) {
        for (int x = 0; x + 16 <= W; x += 16) {
            const uint8_t *p = &in[y * W + x];
            
            uint16x8_t sum0 = vmovl_u8(vld1_u8(p - W));    /* up */
            uint16x8_t sum1 = vmovl_u8(vld1_u8(p));        /* center */
            uint16x8_t sum2 = vmovl_u8(vld1_u8(p + W));    /* down */
            
            /* Sum 3 rows */
            uint16x8_t sum = vaddq_u16(vaddq_u16(sum0, sum1), sum2);
            
            /* Horizontal sum 3 — neighboring pixels */
            uint16x8_t left = vextq_u16(sum, sum, 7);
            uint16x8_t right = vextq_u16(sum, sum, 1);
            uint16x8_t total = vaddq_u16(vaddq_u16(left, sum), right);
            
            /* Divide by 9 — approximate with shift */
            uint8x8_t result = vshrn_n_u16(total, 4);   /* ÷16 + bias */
            vst1_u8(&out[y * W + x], result);
        }
    }
}
```

3×3 = 9 elements. Scalar ~100 cycle/pixel, NEON ~5 cycle/pixel — *20x*.

Computer vision·preprocessing 핵심.

## Sobel Edge Detection

```c
/* Gx = [-1 0 1; -2 0 2; -1 0 1]
   Gy = [-1 -2 -1; 0 0 0; 1 2 1] */

void sobel_neon(const uint8_t *in, uint8_t *out, int W, int H) {
    for (int y = 1; y < H - 1; y++) {
        for (int x = 1; x + 16 <= W - 1; x += 16) {
            const uint8_t *p = &in[y * W + x];
            
            int16x8_t up_l = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - W - 1)));
            int16x8_t up_r = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - W + 1)));
            int16x8_t dn_l = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + W - 1)));
            int16x8_t dn_r = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + W + 1)));
            int16x8_t mid_l = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - 1)));
            int16x8_t mid_r = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + 1)));
            
            int16x8_t gx = vsubq_s16(vaddq_s16(vaddq_s16(up_r, dn_r),
                                                vshlq_n_s16(mid_r, 1)),
                                       vaddq_s16(vaddq_s16(up_l, dn_l),
                                                vshlq_n_s16(mid_l, 1)));
            
            int16x8_t abs_gx = vabsq_s16(gx);
            uint8x8_t result = vqmovun_s16(abs_gx);
            vst1_u8(&out[y * W + x], result);
        }
    }
}
```

ARM compute library (`libarm_compute`) — *production-grade NEON image processing*.

## FFT — CMSIS-DSP

```c
#include "arm_math.h"

#define FFT_SIZE 512
arm_rfft_fast_instance_f32 fft;
arm_rfft_fast_init_f32(&fft, FFT_SIZE);

float32_t input[FFT_SIZE];
float32_t output[FFT_SIZE];

/* Forward FFT */
arm_rfft_fast_f32(&fft, input, output, 0);

/* Magnitude */
arm_cmplx_mag_f32(output, magnitude, FFT_SIZE / 2);
```

CMSIS-DSP — ARM 공식 *NEON·DSP optimized*. Cortex-M·A 모두.

오디오·radar·진동 분석 표준.

## Quaternion Rotation

```c
/* 자동차·드론 자세 — quaternion */
float32x4_t q = vld1q_f32(quat);   /* (x, y, z, w) */
float32x4_t v = vld1q_f32(vec);    /* (x, y, z, 0) */

/* v' = q * v * q⁻¹ — Hamilton product */
float32x4_t q_v = quat_mul(q, v);
float32x4_t q_inv = quat_conjugate(q);
float32x4_t result = quat_mul(q_v, q_inv);
```

IMU·attitude·VR — quaternion 사용. NEON 4-element 자연스러움.

## Crypto — AES + Hash

```c
/* ARMv8 crypto extensions */
#include <arm_neon.h>

uint8x16_t state = ...;
uint8x16_t key = ...;

state = vaesmcq_u8(vaeseq_u8(state, key));   /* AES round */

/* SHA-256 */
uint32x4_t s = vsha256hq_u32(s, t, msg);
```

TLS·secure boot — hardware AES *수 십 cycle/block*.

## Cortex-M Helium (MVE)

```c
#include <arm_mve.h>

/* Predicated NEON-like */
void scale_mve(int16_t *a, int16_t k, int N) {
    for (int n = N; n > 0; n -= 8) {
        mve_pred16_t p = vctp16q(n);
        int16x8_t v = vld1q_z_s16(a, p);
        v = vmulq_x_s16(v, vdupq_n_s16(k), p);
        vst1q_p_s16(a, v, p);
        a += 8;
    }
}
```

Cortex-M55·M85 — *4 beat per cycle* (low-power version of NEON). MCU에서 SIMD 가능.

## Latency Hiding — Multiple Accumulators

```c
/* dot product — RAW chain */
float32x4_t acc0 = vdupq_n_f32(0);
float32x4_t acc1 = vdupq_n_f32(0);
float32x4_t acc2 = vdupq_n_f32(0);
float32x4_t acc3 = vdupq_n_f32(0);

for (int i = 0; i + 16 <= N; i += 16) {
    float32x4_t va = vld1q_f32(&a[i]);
    float32x4_t vb = vld1q_f32(&b[i]);
    acc0 = vfmaq_f32(acc0, va, vb);
    
    va = vld1q_f32(&a[i+4]);
    vb = vld1q_f32(&b[i+4]);
    acc1 = vfmaq_f32(acc1, va, vb);
    
    /* ... acc2, acc3 */
}

/* horizontal sum */
float32x4_t acc = vaddq_f32(vaddq_f32(acc0, acc1), vaddq_f32(acc2, acc3));
float result = vaddvq_f32(acc);
```

VFMA latency 3-4 cycle (Cortex-A) — 4 acc로 *latency hide*. Throughput full.

## NEON vs Scalar — 측정

```text
Workload                    Scalar     NEON      Speedup
4x4 matrix multiply         16 mul     16 fmla   2-4x (load/store dominated)
1024 dot product            512 op     128 op    4x
3x3 box filter (1080p)      210 ms     12 ms     17x
Sobel edge (1080p)          280 ms     22 ms     12x
512 FFT                     32 µs      8 µs      4x
AES-128 encrypt 1 KB        2.5 µs     0.3 µs    8x
YUV→RGB convert 1080p       45 ms      6 ms      7x
```

이미지·crypto·DSP — *압도적 NEON 우세*.

## Auto-Vectorize 시도

```bash
# GCC -O3 + verbose
gcc -O3 -ftree-vectorize -fopt-info-vec source.c

# Output 예
# source.c:42:5: note: loop vectorized using 16 byte vectors
```

성공 시 — *intrinsics 안 써도 NEON 사용*. 그러나 *복잡한 패턴*은 *수동 intrinsics 필요*.

## NEON 라이브러리

| Library | 용도 |
|---|---|
| **CMSIS-DSP** | ARM 공식 DSP (filter·FFT·matrix) |
| **libarm_compute** | ARM Compute Library (CV·ML) |
| **Sleef** | NEON·SVE math (sin·cos·exp) |
| **NEONv7** wrapper | x86 SSE → NEON 변환 |
| **simd-everywhere** | Cross-ISA SIMD |
| **ne10** | Neon-optimized DSP (deprecated) |

## 자동차·자율주행

```text
ADAS pipeline:
  Image preprocessing — NEON (color·resize·filter)
  Feature extraction — NEON (Sobel·Harris·SIFT)
  Inference — NPU + GPU
  Sensor fusion — NEON (quaternion·matrix)
  Path planning — scalar 충분

NEON = 매 frame의 CPU work 핵심.
```

## 자주 하는 실수

> ⚠️ Saturating vs wrapping 혼동

```c
/* unsigned wrap */
v = vaddq_u8(a, b);
/* 255 + 1 = 0 */

/* saturating */
v = vqaddq_u8(a, b);
/* 255 + 1 = 255 */
```

이미지·오디오 — *saturating 명시*.

> ⚠️ Misaligned load

```c
float *p = malloc(N * 4);   /* 8-byte align */
float32x4_t v = vld1q_f32(p);   /* 16-byte align 권장 */
```

→ `aligned_alloc(16, ...)`.

> ⚠️ Interleaved vs planar 혼동

```c
vld1q_u8 — sequential
vld2q_u8 — 2-way interleaved (RGB→RR..GG..BB.. → R,G order)
vld3q_u8 — 3-way (RGB pixel data)
```

→ data layout 명확히.

> ⚠️ Tail handling 누락

```c
for (i = 0; i + 4 <= N; i += 4) { ... }
/* N=10 → tail 2 element 미처리 */
```

→ scalar tail loop 또는 *predication (MVE/SVE)*.

## 정리

- NEON 적용 영역 — **matrix·FFT·image·crypto**.
- Image filter — *10-20x* speedup.
- **CMSIS-DSP** = ARM 공식 standard.
- **vld2/vld3** = interleaved access.
- ARMv8 crypto — AES·SHA hardware.
- Cortex-M55+ MVE — MCU SIMD.
- 자동차·자율주행 — *매 frame NEON 핵심*.

이 시리즈 Part 3은 여기까지.

## 관련 항목

- [3-05: SIMD](/blog/embedded/modern-recipes/part3-05-simd)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
