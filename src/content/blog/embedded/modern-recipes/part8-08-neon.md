---
title: "ARM NEON 심화 — Matrix Multiply·FFT·Image Filter 적용"
slug: "embedded/modern-recipes/part8-08-neon"
date: 2026-04-17T09:07:00
description: "NEON 행렬·픽셀 연산과 CMSIS-DSP FFT의 데이터 형식, 경계·수치 계약을 확인합니다."
series: "Modern Embedded Recipes"
seriesOrder: 96
tags: [recipes, neon, matrix, fft, image]
topics: ["embedded"]
---

## 한 줄 요약

NEON은 ARM의 Advanced SIMD 명령을 C intrinsic으로 표현하는 방법입니다. lane별 산술뿐 아니라 load/store, interleaved 데이터, tail과 수치 의미까지 맞아야 결과가 올바릅니다.

행렬과 픽셀 처리는 같은 연산을 반복해 벡터화 후보가 되지만, 작은 데이터셋에서는 setup·메모리 이동이 계산보다 클 수 있습니다. 먼저 스칼라 기준 결과를 만들고 입력 형식·stride·overflow를 명시한 뒤 NEON 결과와 비교합니다. 실제 CPU에서 실행하거나 측정하지 않은 코드는 동작·가속 검증으로 부르지 않습니다.

NEON lane은 같은 작업대 위의 여러 칸과 비슷합니다. 한 칸에 들어가는 값의 형식과 순서를 맞춰야 하며, 배열이 그 칸 수보다 짧을 때 마지막 칸을 어떻게 처리할지도 정해야 합니다.

## 대상 ISA와 도구

AArch64 NEON은 128-bit Advanced SIMD register를 사용합니다. 32-bit float 네 개나 8-bit 정수 열여섯 개를 한 vector register에 담을 수 있지만, 이 폭은 lane 표현을 설명할 뿐 명령 하나로 전체 알고리즘이 끝난다는 뜻은 아닙니다. AArch32와 AArch64는 ABI와 지원 instruction set이 다를 수 있으므로 compile target을 명시합니다.

NEON intrinsic의 타입·함수·lane 제한은 [Arm ACLE Advanced SIMD 문서](https://developer.arm.com/documentation/101028/latest/)를 따릅니다. Cortex-M55/M85의 MVE는 NEON과 구별되는 ISA이며 이 글의 `arm_neon.h` 예제를 MVE 코드로 바꿔 쓸 수 없습니다. CMSIS-DSP의 target별 구현은 [공식 CMSIS-DSP 문서](https://arm-software.github.io/CMSIS-DSP/latest/)와 library build 옵션을 확인합니다.

## 4×4 행렬 곱

다음 함수는 row-major 4×4 행렬 `a`, `b`를 곱해 별도 `out`에 씁니다. 입력과 출력은 16개 float을 제공하고 서로 겹치지 않아야 합니다. 각 `b` 행을 vector로 읽고 `a` 한 행의 원소를 scalar lane 계수로 곱해 결과 행을 구성합니다.

각 결과 행은 네 개의 가중치로 상대 행들을 섞는 계산입니다. 행과 열의 방향을 바꾸면 그럴듯한 숫자가 나오면서도 다른 행렬 연산이 되므로 비대칭 입력을 기준 결과와 비교합니다.

```c title="neon-matmul-4x4.c"
#include <arm_neon.h>

void matmul4_neon(const float * restrict a, const float * restrict b,
                  float * restrict out) {
    const float32x4_t b0 = vld1q_f32(b + 0);
    const float32x4_t b1 = vld1q_f32(b + 4);
    const float32x4_t b2 = vld1q_f32(b + 8);
    const float32x4_t b3 = vld1q_f32(b + 12);
    for (int row = 0; row < 4; ++row) {
        const float *ar = a + row * 4;
        float32x4_t v = vmulq_n_f32(b0, ar[0]);
        v = vfmaq_n_f32(v, b1, ar[1]);
        v = vfmaq_n_f32(v, b2, ar[2]);
        v = vfmaq_n_f32(v, b3, ar[3]);
        vst1q_f32(out + row * 4, v);
    }
}
```

FMA는 곱셈과 덧셈을 한 번 반올림할 수 있어 별도 multiply/add와 마지막 bit가 달라질 수 있습니다. 기존 scalar 구현과 bitwise 일치가 필요한지, 허용 오차 비교가 가능한지 정합니다. 이 고정 크기 예제는 알고리즘을 설명하며 일반 행렬 곱이나 특정 CPU의 빠른 구현을 대신하지 않습니다.

## RGB 픽셀을 회색조로 변환

픽셀의 byte 순서가 RGB인지 BGR인지, stride에 padding이 있는지, 계수가 full-range인지 제한 범위인지 확인해야 합니다. 아래 예제는 **연속된 RGB byte 3개씩**을 입력으로 받고 `Y = (77R + 150G + 29B + 128) >> 8`로 회색조 byte 하나를 출력합니다. 입력·출력은 겹치지 않아야 하고 `pixels`개 전체가 유효해야 합니다.

RGB pixel은 세 열짜리 표처럼 세 byte가 한 묶음입니다. `vld3`는 이 interleaved 묶음을 색상별 lane으로 나누므로, 입력이 BGR이거나 padding이 끼어 있으면 같은 계산을 다른 channel에 적용하게 됩니다.

```c title="neon-rgb-gray.c"
#include <arm_neon.h>
#include <stddef.h>
#include <stdint.h>

void rgb_to_gray(const uint8_t * restrict rgb,
                 uint8_t * restrict gray, size_t pixels) {
    while (pixels >= 8) {
        const uint8x8x3_t p = vld3_u8(rgb);
        uint16x8_t y = vmull_u8(p.val[0], vdup_n_u8(77));
        y = vmlal_u8(y, p.val[1], vdup_n_u8(150));
        y = vmlal_u8(y, p.val[2], vdup_n_u8(29));
        y = vaddq_u16(y, vdupq_n_u16(128));
        vst1_u8(gray, vshrn_n_u16(y, 8));
        rgb += 24; gray += 8; pixels -= 8;
    }
    while (pixels != 0) {
        const unsigned y = 77u * rgb[0] + 150u * rgb[1] + 29u * rgb[2] + 128u;
        *gray++ = (uint8_t)(y >> 8);
        rgb += 3; --pixels;
    }
}
```

계수 합은 256이고 최대 중간값은 16-bit unsigned 범위 안에 있습니다. 이 함수는 camera YUV buffer를 직접 변환하지 않으며 RGB byte order와 colorimetry가 다르면 결과식부터 바꿔야 합니다. 마지막 1~7 pixel은 scalar tail이 처리합니다.

## Sobel 수평 gradient와 경계

Sobel은 가장자리 pixel을 계산할 때 주변 행·열을 읽으므로 입력 폭·높이와 border 정책이 필요합니다. 아래 함수는 grayscale 8-bit image에서 `Gx`만 계산하고, `|Gx|`를 0~255로 saturate해 내부 영역에 기록합니다. 첫·마지막 행과 열의 출력은 그대로 두며 입력과 출력은 겹치지 않아야 합니다.

각 출력은 중심 pixel 하나가 아니라 주변 3×3 이웃을 보는 작은 창에서 계산됩니다. 그래서 화면 바깥을 읽지 않도록 내부 영역만 처리하고, border는 호출자가 정한 기존 값으로 남깁니다.

```c title="neon-sobel-gx.c"
#include <arm_neon.h>
#include <stddef.h>
#include <stdint.h>

static int gx_scalar(const uint8_t *p, size_t w) {
    const int right = p[-w + 1] + 2 * p[1] + p[w + 1];
    const int left  = p[-w - 1] + 2 * p[-1] + p[w - 1];
    const int d = right - left;
    return d < 0 ? -d : d;
}

void sobel_gx(const uint8_t * restrict in, uint8_t * restrict out,
              size_t width, size_t height) {
    if (width < 3 || height < 3) return;
    for (size_t y = 1; y < height - 1; ++y) {
        const uint8_t *p = in + y * width;
        size_t x = 1;
        for (; width - x > 8; x += 8) {
            const int16x8_t ur = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - width + x + 1)));
            const int16x8_t mr = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + x + 1)));
            const int16x8_t dr = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + width + x + 1)));
            const int16x8_t ul = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p - width + x - 1)));
            const int16x8_t ml = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + x - 1)));
            const int16x8_t dl = vreinterpretq_s16_u16(vmovl_u8(vld1_u8(p + width + x - 1)));
            int16x8_t g = vaddq_s16(vaddq_s16(ur, dr), vshlq_n_s16(mr, 1));
            g = vsubq_s16(g, vaddq_s16(vaddq_s16(ul, dl), vshlq_n_s16(ml, 1)));
            vst1_u8(out + y * width + x, vqmovun_s16(vabsq_s16(g)));
        }
        for (; x < width - 1; ++x) out[y * width + x] = (uint8_t)gx_scalar(p + x, width);
    }
}
```

중간값 `Gx`의 범위는 입력 byte가 0~255일 때 -1020~1020이므로 signed 16-bit lane에 들어갑니다. 이 코드는 gradient magnitude `sqrt(Gx²+Gy²)`나 방향 판정까지 구현하지 않습니다. 입력 크기 곱 `width * height`와 row stride가 실제 버퍼 범위에 맞는지는 호출자가 보장해야 합니다.

## Saturation과 wrapping

8-bit unsigned 더하기는 일반 `vadd`에서 255 다음에 0으로 wrap하고, `vqadd`는 255에 포화합니다. 두 연산은 출력 범위와 이미지 의미가 다르므로 “이미지 처리는 늘 saturation”처럼 일괄 선택하지 않습니다. 실제 format이 modulo arithmetic을 요구하는지도 확인합니다.

```c title="neon-saturating-add.c"
#include <arm_neon.h>

uint8x16_t add_wrapping(uint8x16_t a, uint8x16_t b) {
    return vaddq_u8(a, b);
}

uint8x16_t add_saturating(uint8x16_t a, uint8x16_t b) {
    return vqaddq_u8(a, b);
}
```

vector 연산을 scalar reference와 비교할 때는 `255 + 1` 같은 경계, lane 순서, 잘못된 format tag를 포함합니다. sanitizer는 호스트에서 실행한 scalar fixture의 메모리 오류를 찾는 데 도움이 되지만 ARM intrinsic 실행 결과를 대신하지 않습니다.

## CMSIS-DSP real FFT

CMSIS-DSP real FFT의 initializer는 요청 길이를 지원하지 않으면 status를 반환하므로 무시하지 않습니다. `arm_rfft_fast_f32`의 packed output은 `N`개 float buffer에 저장되며 index 0은 DC, index 1은 Nyquist, 나머지는 양의 주파수 bin의 실수·허수 쌍입니다. 따라서 packed buffer의 시작 주소를 그대로 `arm_cmplx_mag_f32`에 넘기면 DC/Nyquist를 일반 복소수 쌍으로 잘못 해석합니다. [공식 Real FFT API](https://arm-software.github.io/CMSIS-DSP/latest/group__RealFFTF32.html)의 함수별 입출력 형식을 따릅니다.

아래 후처리는 scalar/Cortex-M API 형태의 forward real FFT 결과를 `magnitude[0..N/2]`의 크기 스펙트럼으로 바꿉니다. CMSIS-DSP의 AArch64 NEON 버전은 별도의 FFT 임시 buffer 인자를 받으므로 이 호출 signature를 그대로 재사용하면 안 됩니다. 해당 target의 [API와 buffer 크기 표](https://arm-software.github.io/CMSIS-DSP/latest/group__RealFFTF32.html)를 확인합니다.

```c title="cmsis-real-fft-magnitude.c"
#include "arm_math.h"
#include <math.h>

enum { FFT_SIZE = 512 };
static arm_rfft_fast_instance_f32 fft;
static float input[FFT_SIZE], packed[FFT_SIZE];
static float magnitude[FFT_SIZE / 2 + 1];

int init_fft(void) {
    return arm_rfft_fast_init_f32(&fft, FFT_SIZE) == ARM_MATH_SUCCESS;
}

void calculate_spectrum(void) {
    arm_rfft_fast_f32(&fft, input, packed, 0);
    magnitude[0] = fabsf(packed[0]);
    magnitude[FFT_SIZE / 2] = fabsf(packed[1]);
    for (unsigned k = 1; k < FFT_SIZE / 2; ++k) {
        const float re = packed[2 * k], im = packed[2 * k + 1];
        magnitude[k] = sqrtf(re * re + im * im);
    }
}
```

이 API는 입력 buffer를 수정할 수 있습니다. 코드는 magnitude를 계산할 뿐 windowing·정규화·dB 변환·입력 범위 검사를 하지 않습니다. CMSIS-DSP의 prototype과 buffer 크기는 library version에서 재확인하고, target에 맞는 최적화 macro와 source/library를 함께 빌드합니다.

## 빌드와 수치 검증

각 코드 조각은 대상 ISA를 지정해 compile하고 warning을 오류로 취급합니다. RGB 변환은 모든 byte 입력의 범위와 대표 색상을 scalar 식으로 대조하고, Sobel은 작은 영상의 모든 내부 좌표와 border 보존·폭이 8의 배수가 아닌 tail을 확인합니다. 행렬 곱은 단위행렬, 영행렬, 비대칭 행렬을 사용해 transpose 오류를 찾습니다.

```bash title="neon-cross-compile"
aarch64-linux-gnu-gcc -std=c11 -O2 -Wall -Wextra -Werror -march=armv8-a+simd -c kernels.c
aarch64-linux-gnu-objdump -d kernels.o
```

Cross compile과 disassembly는 대상 명령이 생성됐는지 확인하지만, 실행 결과나 target 성능은 확인하지 않습니다. 보드가 없으면 host scalar reference와 sanitizer로 계약을 테스트하고, ARM 실행은 emulator가 해당 instruction을 지원하는지 별도로 확인해 결과 범위를 기록합니다.

## 정리

- 행렬·픽셀 예제는 layout, stride, overlap, border와 tail을 코드 계약으로 둡니다.
- NEON lane arithmetic의 saturation·rounding은 scalar 수학과 같다고 가정하지 않습니다.
- CMSIS-DSP FFT는 initialization status와 packed output 형식을 확인합니다.
- cross compile/assembly는 실행·측정 결과와 구분합니다.
- 실제 적용은 대표 입력, 극단 크기, reference 결과와 대상 CPU에서 확인합니다.

다음 편은 high-water, 정적 stack 사용량, FreeRTOS 검사와 MPU guard를 구분합니다.

## 관련 항목

- [8-07: SIMD](/blog/embedded/modern-recipes/part8-07-simd)
- [8-09: Stack Analysis](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-03: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
