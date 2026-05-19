---
title: "3-06: ARM NEON 심화 — Matrix Multiply·FFT·Image Filter"
date: 2026-05-07T13:00:00
description: "NEON 실전 사례를 matrix multiply, color conversion, box filter, Sobel, FFT, crypto로 묶어 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 18
tags: [recipes, neon, matrix, fft, image, simd]
---

## 한 줄 요약

> **"NEON이 진짜 빛나는 영역은 matrix, FFT, image processing이다."** Pixel 단위 연산에서 10~20배 speedup이 흔합니다.

## 어떤 상황에서 쓰나

자율주행 perception은 매 frame에 카메라 input을 preprocessing합니다. 1080p RGB를 YUV로 변환하고 box filter로 노이즈를 줄이고 Sobel로 edge를 찾는 일이 수십 ms 안에 끝나야 합니다. Scalar 구현으로는 frame rate를 못 맞추는 경우가 대부분이고, NEON으로 다시 짜면 한 자릿수 ms로 떨어집니다.

자동차·드론의 attitude 제어는 quaternion 회전이 매 ms 단위로 돌아갑니다. 4-element vector 자체가 NEON과 자연스럽게 맞아 별도 최적화 없이도 scalar 대비 두 배 가깝게 빨라집니다.

## 핵심 개념

NEON은 128-bit SIMD register 32개를 가집니다. Float32 4개, int16 8개, int8 16개를 한 명령에 처리합니다. Cortex-M55/M85의 MVE는 동일한 아이디어를 4 beat 분할로 저전력 MCU에 옮긴 변종입니다.

```text
ARMv8 AArch64 NEON
  V0~V31, 128 bit each
  float32 4, float64 2, int16 8, int8 16

ARMv8 crypto extension
  AES, SHA-1/256, PMULL (hardware)

ARMv9 SVE2 (Neoverse V1/V2, Cortex-X)
  vector length runtime (128~2048 bit)
```

핵심 patterns는 *load → compute → store* 단순 흐름, multiple accumulator로 latency 숨기기, interleaved load (`vld2`, `vld3`)로 색상 채널 분리입니다.

## 코드 / 실제 사용 예

### 4×4 Matrix Multiply

```c
#include <arm_neon.h>

void mat_mul_4x4(const float A[16], const float B[16], float C[16]) {
    float32x4_t b0 = vld1q_f32(&B[0]);
    float32x4_t b1 = vld1q_f32(&B[4]);
    float32x4_t b2 = vld1q_f32(&B[8]);
    float32x4_t b3 = vld1q_f32(&B[12]);

    for (int i = 0; i < 4; i++) {
        float32x4_t a   = vld1q_f32(&A[i * 4]);
        float32x4_t row = vmulq_lane_f32(b0, vget_low_f32(a), 0);
        row = vfmaq_lane_f32(row, b1, vget_low_f32(a), 1);
        row = vfmaq_lane_f32(row, b2, vget_high_f32(a), 0);
        row = vfmaq_lane_f32(row, b3, vget_high_f32(a), 1);
        vst1q_f32(&C[i * 4], row);
    }
}
```

`vmulq_lane_f32(b, a, idx)`는 vector × scalar입니다. 4×4 matrix가 16 FMA, 8 load, 4 store로 끝납니다. 자동차 sensor fusion과 자세 제어가 표준으로 쓰는 패턴입니다.

### YUV422 → RGB Conversion

```c
void yuv422_to_rgb(const uint8_t *yuv, uint8_t *rgb, int N) {
    for (int i = 0; i + 16 <= N; i += 16) {
        uint8x16x2_t yuv_pair = vld2q_u8(&yuv[i * 2]);
        uint8x16_t y  = yuv_pair.val[0];
        uint8x16_t uv = yuv_pair.val[1];

        /* Y, U, V 분리 후 BT.601 계수 적용 */
        /* ... (~10 NEON ops) ... */

        uint8x16x3_t out = { r, g, b };
        vst3q_u8(&rgb[i * 3], out);
    }
}
```

`vld2q_u8`은 interleaved load로 Y와 UV를 자동 분리하고, `vst3q_u8`은 RGB 3 채널을 interleave해서 저장합니다. Scalar로는 채널 분리에 추가 cycle이 들지만 NEON에서는 한 명령으로 끝납니다.

### 3×3 Box Filter

```c
void box_filter_3x3(const uint8_t *in, uint8_t *out, int W, int H) {
    for (int y = 1; y < H - 1; y++) {
        for (int x = 0; x + 16 <= W; x += 16) {
            const uint8_t *p = &in[y * W + x];

            uint16x8_t sum0 = vmovl_u8(vld1_u8(p - W));
            uint16x8_t sum1 = vmovl_u8(vld1_u8(p));
            uint16x8_t sum2 = vmovl_u8(vld1_u8(p + W));

            uint16x8_t sum = vaddq_u16(vaddq_u16(sum0, sum1), sum2);

            uint16x8_t left  = vextq_u16(sum, sum, 7);
            uint16x8_t right = vextq_u16(sum, sum, 1);
            uint16x8_t total = vaddq_u16(vaddq_u16(left, sum), right);

            uint8x8_t result = vshrn_n_u16(total, 4);   /* approximate /16 */
            vst1_u8(&out[y * W + x], result);
        }
    }
}
```

세 row를 add하고 좌우 neighbor를 더해 9-element sum을 만듭니다. Computer vision preprocessing의 가장 흔한 패턴입니다.

### Sobel Edge Detection

```c
void sobel_neon(const uint8_t *in, uint8_t *out, int W, int H) {
    for (int y = 1; y < H - 1; y++) {
        for (int x = 1; x + 16 <= W - 1; x += 16) {
            const uint8_t *p = &in[y * W + x];

            int16x8_t up_l  = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - W - 1)));
            int16x8_t up_r  = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - W + 1)));
            int16x8_t dn_l  = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + W - 1)));
            int16x8_t dn_r  = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + W + 1)));
            int16x8_t mid_l = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - 1)));
            int16x8_t mid_r = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + 1)));

            int16x8_t gx = vsubq_s16(
                vaddq_s16(vaddq_s16(up_r, dn_r), vshlq_n_s16(mid_r, 1)),
                vaddq_s16(vaddq_s16(up_l, dn_l), vshlq_n_s16(mid_l, 1)));

            uint8x8_t result = vqmovun_s16(vabsq_s16(gx));
            vst1_u8(&out[y * W + x], result);
        }
    }
}
```

`Gx = [-1 0 1; -2 0 2; -1 0 1]` kernel을 NEON 6개 load + add/sub/shift로 표현합니다. ARM Compute Library가 production용 구현을 제공합니다.

### CMSIS-DSP FFT

```c
#include "arm_math.h"

#define FFT_SIZE 512
arm_rfft_fast_instance_f32 fft;
arm_rfft_fast_init_f32(&fft, FFT_SIZE);

float32_t input[FFT_SIZE];
float32_t output[FFT_SIZE];
float32_t magnitude[FFT_SIZE / 2];

arm_rfft_fast_f32(&fft, input, output, 0);
arm_cmplx_mag_f32(output, magnitude, FFT_SIZE / 2);
```

CMSIS-DSP는 ARM이 공식 배포하는 NEON·MVE optimized DSP 라이브러리입니다. 오디오, radar, 진동 분석의 표준 도구입니다.

### Quaternion Rotation

```c
float32x4_t q = vld1q_f32(quat);   /* (x, y, z, w) */
float32x4_t v = vld1q_f32(vec);    /* (x, y, z, 0) */

float32x4_t q_v   = quat_mul(q, v);
float32x4_t q_inv = quat_conjugate(q);
float32x4_t result = quat_mul(q_v, q_inv);
```

IMU와 VR 헤드셋의 자세 표현이 quaternion입니다. 4-element 자체가 NEON register와 1:1 대응이라 자연스럽게 SIMD화됩니다.

### AES + SHA crypto extension

```c
uint8x16_t state = ...;
uint8x16_t key   = ...;

state = vaesmcq_u8(vaeseq_u8(state, key));   /* AES round */

uint32x4_t s = vsha256hq_u32(s, t, msg);     /* SHA-256 */
```

ARMv8 crypto extension은 AES와 SHA를 hardware 한 명령으로 처리합니다. TLS와 secure boot에서 자릿수 단위 speedup을 줍니다.

### Cortex-M Helium (MVE)

```c
#include <arm_mve.h>

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

Cortex-M55/M85에서 MCU 단에 들어온 SIMD입니다. NEON과 ISA가 다르지만 컨셉은 동일합니다. Predication으로 tail loop를 자동 처리합니다.

### Multiple accumulator로 latency hide

```c
float32x4_t acc0 = vdupq_n_f32(0);
float32x4_t acc1 = vdupq_n_f32(0);
float32x4_t acc2 = vdupq_n_f32(0);
float32x4_t acc3 = vdupq_n_f32(0);

for (int i = 0; i + 16 <= N; i += 16) {
    acc0 = vfmaq_f32(acc0, vld1q_f32(&a[i]),    vld1q_f32(&b[i]));
    acc1 = vfmaq_f32(acc1, vld1q_f32(&a[i+4]),  vld1q_f32(&b[i+4]));
    acc2 = vfmaq_f32(acc2, vld1q_f32(&a[i+8]),  vld1q_f32(&b[i+8]));
    acc3 = vfmaq_f32(acc3, vld1q_f32(&a[i+12]), vld1q_f32(&b[i+12]));
}

float32x4_t acc = vaddq_f32(vaddq_f32(acc0, acc1), vaddq_f32(acc2, acc3));
float result = vaddvq_f32(acc);
```

VFMA latency가 3~4 cycle인 Cortex-A에서 누산기 4개로 latency를 숨기면 throughput이 거의 풀로 나옵니다.

## 측정 / 성능 비교

Cortex-A72에서 자주 보는 workload별 speedup입니다.

```text
Workload                       Scalar      NEON     Speedup
4x4 matrix multiply            16 mul      16 fmla  2~4x  (load/store 지배)
1024 dot product                512 op      128 op   4x
3x3 box filter (1080p)         210 ms      12 ms   17x
Sobel edge (1080p)             280 ms      22 ms   12x
512-point FFT                   32 µs       8 µs    4x
AES-128 1 KB encrypt           2.5 µs      0.3 µs   8x
YUV → RGB 1080p                 45 ms       6 ms    7x
```

이미지·crypto·DSP는 NEON의 압도적 우세 영역입니다. Matrix multiply는 load/store가 병목이라 speedup이 상대적으로 작습니다.

## 자주 보는 함정

> Saturating과 wrapping 혼동

```c
v = vaddq_u8(a, b);    /* 255 + 1 = 0 */
v = vqaddq_u8(a, b);   /* 255 + 1 = 255 */
```

이미지와 오디오는 saturating이 정답입니다. Wrapping을 쓰면 white pixel이 black으로 뒤집힙니다.

> Misaligned load

```c
float *p = malloc(N * 4);   /* 8-byte align */
float32x4_t v = vld1q_f32(p);   /* 16-byte align 권장 */
```

`aligned_alloc(16, ...)`이나 `posix_memalign`을 사용합니다.

> Interleaved vs planar 혼동

```text
vld1q_u8   sequential
vld2q_u8   2-way (예: YUV422)
vld3q_u8   3-way (예: RGB pixel)
vld4q_u8   4-way (예: RGBA)
```

Data layout을 명확히 결정하고 nq의 숫자를 맞춰야 합니다.

> Tail handling 누락

```c
for (i = 0; i + 4 <= N; i += 4) { ... }
```

N이 vector 배수가 아니면 마지막 element가 빠집니다. Scalar tail loop를 붙이거나 MVE/SVE predication을 사용합니다.

> Register pressure

```c
/* 16 accumulator + 16 load — 32개 register 한계 */
```

Cortex-A는 V0~V31의 32개 register를 갖지만 spill이 시작되면 stack access로 속도가 떨어집니다. Loop unroll 폭을 4~8로 제한합니다.

> FPU enable 누락

```c
/* Cortex-M에서 CPACR로 FPU 활성화 안 하면 UsageFault */
```

NEON·FPU 명령은 reset 직후 disabled입니다. Startup 코드에서 enable해야 합니다.

## 정리

- NEON이 빛나는 영역은 matrix, FFT, image, crypto입니다.
- Image filter는 10~20배 speedup이 흔합니다.
- CMSIS-DSP가 ARM 공식 표준 라이브러리이고 Cortex-M/A 모두 지원합니다.
- `vld2`/`vld3`로 색상 채널 분리를 한 명령에 끝냅니다.
- ARMv8 crypto extension은 AES와 SHA를 hardware로 가속합니다.
- Cortex-M55/M85의 MVE로 MCU에서도 SIMD가 가능합니다.
- Multiple accumulator로 latency를 숨기고, alignment와 tail 처리를 잊지 않습니다.

이 시리즈 Part 3은 여기까지입니다.

## 관련 항목

- [3-05: SIMD 활용](/blog/embedded/modern-recipes/part3-05-simd)
- [3-01: Cache Alignment](/blog/embedded/modern-recipes/part3-01-cache-alignment)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
