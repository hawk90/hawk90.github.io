---
title: "SIMD 활용 분석 — Intrinsics·Auto-Vectorization·OpenMP SIMD"
date: 2026-04-17T09:06:00
description: "Auto-vectorize, intrinsics, OpenMP SIMD pragma 세 갈래를 데이터 layout과 함께 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 95
tags: [recipes, simd, vectorization, intrinsics, openmp, ispc]
---

## 한 줄 요약

> **"SIMD = 한 명령으로 여러 데이터."** 4~16배 가속이 가능하지만 코드보다 *데이터 layout*이 효과를 결정합니다.

## 어떤 상황에서 쓰나

오디오 mixer, 카메라 frame conversion, IMU sensor fusion 같은 *동일 연산 반복*은 SIMD의 대표 무대입니다. 1 M element float add를 scalar로 돌리면 1.0 s, NEON으로는 0.25 s, AVX-512로는 0.06 s 수준입니다.

문제는 SIMD가 친화적인 코드를 *처음부터* 짜야 효과가 난다는 점입니다. AoS 구조를 그대로 둔 채 intrinsics만 끼워 넣으면 load/store가 모두 cross-line이 되어 기대만큼 빨라지지 않습니다.

## 핵심 개념

세 가지 적용 전략을 알아둡니다.

1. **Auto-vectorization** — 컴파일러가 자동.
   - 장점: 코드 수정 0
   - 단점: 조건이 까다로움
2. **Intrinsics** — 직접 명령 호출.
   - 장점: 정확한 통제
   - 단점: vendor-specific
3. **OpenMP SIMD pragma** — 컴파일러에 hint.
   - 장점: portable, 간단
   - 단점: 100% 자동은 아님

세 방식은 보완 관계입니다. 보통 OpenMP pragma + `restrict`로 시작하고, 안 풀리는 hot loop만 intrinsics로 다시 짭니다.

## 코드 / 실제 사용 예

### Auto-vectorization 켜기

```bash
gcc -O3 -ftree-vectorize -fopt-info-vec source.c
clang -O3 -Rpass=loop-vectorize source.c

gcc -mfpu=neon -ftree-vectorize source.c        # ARMv7
gcc-aarch64 -O3 source.c                        # AArch64 default
```

`-O3`만 켜도 시도하지만 어떤 loop가 vectorize됐는지 `-fopt-info-vec`로 확인하는 편이 안전합니다.

### Vectorize 친화 코드

```c
void scale(float * restrict a, float k, int N) {
    for (int i = 0; i < N; i++) {
        a[i] *= k;
    }
}
```

조건은 네 가지입니다.

- `restrict`로 alias 가능성을 제거
- Sequential access
- 조건 분기 없음
- Loop count가 알려져 있고 vector 크기의 배수

### Vectorize 안 되는 패턴

```c
void copy(float *a, float *b, int N) {
    for (int i = 0; i < N; i++) a[i] = b[i];   /* alias 가능 → restrict 추가 */
}

for (int i = 0; i < N; i++) {
    if (a[i] > 0) b[i] = a[i];                 /* SVE/AVX mask 필요 */
}

for (int i = 1; i < N; i++) {
    a[i] += a[i-1];                            /* dependency → vectorize 불가 */
}
```

Recurrence는 prefix sum 알고리즘으로 다시 설계해야 풀립니다.

### NEON intrinsics

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

128-bit vector = 4 × float32 또는 8 × int16 또는 16 × int8입니다. 마지막 tail loop를 잊으면 안 됩니다.

### Cortex-M Helium (MVE)

```c
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

`vctp16q`가 매 iteration의 predicate를 만들어 tail까지 자동 처리합니다. Cortex-M55/M85에서 MCU SIMD가 가능해진 핵심 기능입니다.

### SVE/SVE2 — vector length 가변

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

128~2048 bit가 runtime에 결정되는 length-agnostic 코드입니다. Neoverse V1/V2와 Cortex-X 계열의 미래 표준입니다.

### x86 AVX2

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

AVX2 = 256-bit (8 float), AVX-512 = 512-bit (16 float)입니다.

### OpenMP SIMD pragma

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

GCC, Clang, Intel ICC 모두 지원합니다. Vendor 독립이라는 점이 큰 장점입니다.

### Multiple accumulator로 ILP 확보

```c
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
```

FMA latency가 3~4 cycle인 Cortex-A에서 누산기 하나만 쓰면 매 iteration이 직렬화됩니다. 4개로 늘려 latency를 *숨기면* throughput이 거의 4배가 됩니다.

### Saturating arithmetic

```c
uint8x16_t va = vld1q_u8(in_a);
uint8x16_t vb = vld1q_u8(in_b);
uint8x16_t r  = vqaddq_u8(va, vb);   /* saturate at 255 */
vst1q_u8(out, r);
```

`vq*` 계열은 overflow 시 wrap 대신 clip합니다. 이미지·오디오 처리의 표준 동작입니다.

## 측정 / 성능 비교

1 M element float add (Cortex-A72)입니다.

| 구현 | 시간 | speedup |
|---|---|---|
| scalar -O2 | 3.20 ms | 1.0x |
| scalar -O3 auto-vec | 0.85 ms | 3.8x |
| NEON intrinsic | 0.78 ms | 4.1x |
| NEON + 4 acc | 0.42 ms | 7.6x |

Auto-vectorize만 잘 풀려도 4배에 도달합니다. ILP까지 챙기면 한 단계 더 갑니다.

```text
x86 AVX2 1 M float add
scalar                 1.40 ms
AVX2 (8-wide)          0.22 ms    6.4x
AVX-512 (16-wide)      0.11 ms    12.7x
```

Vector width가 그대로 speedup으로 이어지는 이상적 경우입니다.

## 자주 보는 함정

> Auto-vectorize를 무조건 신뢰

```bash
gcc -O3 ./prog
# 실제로는 alias 때문에 vectorizer가 포기하는 경우 흔함
```

`-fopt-info-vec`로 결과를 확인하고 `restrict`와 `__attribute__((aligned))`를 추가합니다.

> Tail loop 누락

```c
for (int i = 0; i + 4 <= N; i += 4) { ... }
/* N=10 → i=8까지만 처리 */
```

Scalar tail을 붙이거나 SVE/MVE의 predication을 활용합니다.

> Misalignment 무시

```c
float *p = malloc(N * sizeof(float));   /* 8B alignment */
float32x4_t v = vld1q_f32(p);           /* 16B aligned가 빠름 */
```

`aligned_alloc(16, ...)` 또는 `alignas(16)`을 씁니다.

> Cross-platform intrinsics

```c
#include <arm_neon.h>
__m256 v;   /* x86 AVX — ARM에서 fail */
```

`simd-everywhere`, `Sleef` 같은 wrapper를 쓰거나 ISA별로 분기합니다.

> AoS를 그대로 둔 채 intrinsics

```c
struct vec3 { float x, y, z; } v[N];
/* x만 vld1q_f32하려면 stride load — 효율 떨어짐 */
```

SIMD를 진지하게 쓸 때는 SoA 변환이 거의 필수입니다.

## 정리

- SIMD는 4~16배 가속이 가능하지만 데이터 layout이 성능을 결정합니다.
- Auto-vectorize + `restrict` + SoA가 첫 단계입니다.
- Intrinsics는 정확한 통제를 주는 대신 vendor lock-in을 만듭니다.
- OpenMP SIMD pragma는 portable한 hint입니다.
- SVE와 MVE는 predication으로 tail loop를 자동 처리합니다.
- Multiple accumulator로 ILP를 확보하면 한 배수 더 빨라집니다.
- 자동차·자율주행·이미지·오디오 코덱은 SIMD가 표준입니다.

다음 편은 **ARM NEON 심화**입니다.

## 관련 항목

- [3-04: NUMA](/blog/embedded/modern-recipes/part8-06-numa)
- [3-06: ARM NEON 심화](/blog/embedded/modern-recipes/part8-08-neon)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [3-01: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
