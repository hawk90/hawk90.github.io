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

> **"NEON은 matrix, FFT, image processing처럼 반복적인 데이터 병렬 연산에서 유용하다."** 가속 폭은 ISA·메모리·컴파일러·알고리즘과 측정 조건에 따라 달라집니다.

## 어떤 상황에서 쓰나

자율주행 perception은 매 frame에 카메라 input을 preprocessing합니다. 1080p RGB를 YUV로 변환하고 box filter로 노이즈를 줄이고 Sobel로 edge를 찾는 시간 예산은 제품과 frame rate에 따라 달라집니다. Scalar와 NEON의 차이는 포맷·메모리 배치·라이브러리 구현을 포함해 대상 장치에서 측정해야 합니다.

자동차·드론의 attitude 제어에서는 quaternion 회전처럼 작은 벡터 연산이 반복됩니다. 4-element vector가 NEON 레지스터에 맞더라도 정렬·로드·스케줄링·전체 파이프라인을 확인해야 하며, 별도 최적화 없이 특정 배수의 가속을 보장하지 않습니다.

## 핵심 개념

ARMv8-A AArch64 NEON은 128-bit SIMD 레지스터 32개를 사용하며, AArch32의 레지스터 표현과 사용 가능한 명령은 다를 수 있습니다. 128-bit 벡터에는 float32 4개, int16 8개, int8 16개가 들어갑니다. Cortex-M55/M85의 MVE는 별도 ISA로 유사한 데이터 병렬 연산과 predication을 제공합니다.

```text
ARMv8 AArch64 NEON
  V0~V31, 128 bit each
  float32 4, float64 2, int16 8, int8 16

ARMv8 crypto extension
  AES, SHA-1/256, PMULL (hardware)

ARMv9 SVE2 (Neoverse V1/V2, Cortex-X)
  vector length는 구현별로 runtime 확인
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

`vmulq_lane_f32(b, a, idx)`는 vector × scalar입니다. 이 예시는 행렬 배치와 compiler가 허용하는 경우의 한 구현이며, load·FMA·store 수는 데이터 배치와 최적화에 따라 달라집니다. 자동차 sensor fusion과 자세 제어에서 검토할 수 있는 패턴입니다.

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

`vld2q_u8`과 `vst3q_u8`은 interleaved 데이터를 벡터 레지스터로 분리·저장하는 연산을 표현합니다. 실제 명령 수와 비용은 target ISA와 compiler에 따라 다르며, 포맷의 stride·packing이 예시와 일치해야 합니다.

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

세 row를 add하고 좌우 neighbor를 더해 9-element sum을 만듭니다. Computer vision preprocessing에서 자주 쓰이는 패턴 중 하나입니다.

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

CMSIS-DSP는 Arm이 배포하는 DSP 라이브러리로 target에 따라 NEON·MVE 최적화 경로를 제공합니다. 오디오·radar·진동 분석에서 사용할 수 있지만 지원 ISA와 build 옵션을 확인해야 합니다.

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

ARMv8 crypto extension은 AES·SHA 관련 primitive를 하드웨어 명령으로 가속할 수 있습니다. TLS와 secure boot의 실제 이득은 라이브러리 경로·키 길이·버퍼 크기와 target 지원 여부를 측정해야 합니다.

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

VFMA latency와 실행 포트 수는 Cortex-A 세대와 구현에 따라 다릅니다. 누산기를 여러 개 사용하면 의존성을 줄일 수 있지만 register pressure와 memory bandwidth를 함께 측정해야 합니다.

## 측정 / 성능 비교

Cortex-A72에서 측정할 수 있는 workload별 benchmark 형식입니다. 실제 값은 compiler·cache·주파수·메모리 배치와 구현에 따라 달라집니다.

```text
Workload                       Scalar      NEON     Speedup
4x4 matrix multiply            측정 필요   측정 필요  측정 필요 (load/store 지배 가능)
1024 dot product                측정 필요   측정 필요  측정 필요
3x3 box filter (1080p)         측정 필요   측정 필요  측정 필요
Sobel edge (1080p)             측정 필요   측정 필요  측정 필요
512-point FFT                  측정 필요   측정 필요  측정 필요
AES-128 1 KB encrypt           측정 필요   측정 필요  측정 필요
YUV → RGB 1080p                측정 필요   측정 필요  측정 필요
```

이미지·crypto·DSP는 NEON 적용을 검토하기 좋은 영역입니다. Matrix multiply의 이득은 load/store와 cache가 병목인지에 따라 달라집니다.

## 자주 보는 함정

> Saturating과 wrapping 혼동

```c
v = vaddq_u8(a, b);    /* 255 + 1 = 0 */
v = vqaddq_u8(a, b);   /* 255 + 1 = 255 */
```

이미지와 오디오는 saturating이 정답입니다. Wrapping을 쓰면 white pixel이 black으로 뒤집힙니다.

> Misaligned load

```c
float *p = malloc(N * 4);   /* 필요한 정렬은 allocator·ABI 확인 */
float32x4_t v = vld1q_f32(p);   /* 정렬 요구와 성능은 target ISA 확인 */
```

`aligned_alloc(16, ...)`이나 `posix_memalign`을 사용합니다.

> Interleaved vs planar 혼동

| vld1q_u8 | sequential |
|---|---|
| vld2q_u8 | 2-way (예: YUV422) |
| vld3q_u8 | 3-way (예: RGB pixel) |
| vld4q_u8 | 4-way (예: RGBA) |

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
- Image filter는 데이터 배치·메모리·구현에 따라 큰 가속이 가능하지만 대상 장치에서 측정합니다.
- CMSIS-DSP는 Arm이 배포하는 라이브러리이며 target과 build 옵션별 지원 범위를 확인합니다.
- `vld2`/`vld3`로 색상 채널 분리를 한 명령에 끝냅니다.
- ARMv8 crypto extension은 AES와 SHA를 hardware로 가속합니다.
- Cortex-M55/M85의 MVE로 MCU에서도 SIMD가 가능합니다.
- Multiple accumulator로 latency를 숨기고, alignment와 tail 처리를 잊지 않습니다.

이 시리즈 Part 3은 여기까지입니다.

## 관련 항목

- [3-05: SIMD 활용](/blog/embedded/modern-recipes/part8-07-simd)
- [3-01: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
