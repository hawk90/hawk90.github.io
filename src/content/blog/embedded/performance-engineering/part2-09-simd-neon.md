---
title: "SIMD·NEON 활용 — 128-bit Vector·Auto-Vectorization·SVE/SVE2"
slug: "embedded/performance-engineering/part2-09-simd-neon"
date: 2026-04-24T09:08:00
description: "AArch64 NEON의 auto-vectorization 보고와 intrinsics를 실제 컴파일러로 확인하고 M2 Pro에서 dot product를 재며, Helium(MVE)과 SVE를 컴파일 결과로 봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 17
tags: [simd, neon, sve, helium, intrinsics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SIMD = 한 명령으로 여러 데이터"**입니다. M2 Pro에서 dot product는 scalar 0.87 ns/원소에서 NEON 누산기 넷으로 0.07 ns/원소가 됐습니다.

## ARM NEON — 128-bit Vector

AArch64의 Advanced SIMD(NEON)는 128-bit 벡터 레지스터를 씁니다. Arm의 AAPCS64(Procedure Call Standard)는 이 레지스터를 "a further thirty-two registers, v0-v31, which can be used by SIMD and Floating-Point operations"로 소개합니다.

![NEON 128-bit register의 다양한 해석 — 4xf32, 8xi16, 16xi8 등](/images/blog/perf-eng/diagrams/part2-09-neon-register.svg)

## Auto-Vectorization — 첫 시도

AArch64 GCC에서는 NEON이 기본으로 켜져 있어 따로 켤 옵션이 없습니다. 예전 글에 흔한 `-mfpu=neon`은 32-bit Arm용 옵션이라, Debian 게스트의 aarch64 GCC 14.2에 주면 `gcc: error: unrecognized command-line option '-mfpu=neon'`이 납니다. vectorizer 보고는 `-fopt-info-vec`로 봅니다.

```bash
gcc -O3 -fopt-info-vec -c vec.c
```

```c
void scale(float *a, float k, int N) {
    for (int i = 0; i < N; i++) {
        a[i] *= k;
    }
}
```

게스트의 GCC 14.2(`-O3 -fopt-info-vec-all`)는 이 루프에 `vec.c:1:58: optimized: loop vectorized using 16 byte vectors`를 냈습니다(`bench/simd/vec.c`, `vec-gcc-vm.log`). 16 byte, 즉 `float` 넷씩입니다. 같은 파일의 부동소수점 합 `s += a[i]`는 `missed: Loop costings may not be worthwhile`로 벡터화되지 않았고, `-ffast-math`를 주자 벡터화됐습니다. 벡터로 더하면 합의 순서가 바뀌기 때문입니다(2-02).

## restrict로 vectorizer 도움

```c
void add(float *a, float *b, float *c, int N) {
    for (int i = 0; i < N; i++) c[i] = a[i] + b[i];
}

void add_r(float * restrict a, float * restrict b, float * restrict c, int N) {
    for (int i = 0; i < N; i++) c[i] = a[i] + b[i];
}
```

`restrict`가 없다고 벡터화를 못 하는 것은 아닙니다. GCC 14.2는 `add`도 벡터화했고, 대신 `loop versioned for vectorization because of possible aliasing`을 보고했습니다. 실행 시간에 포인터가 겹치는지 검사해 벡터 버전과 scalar 버전 중 하나를 고르는 코드를 만든 것입니다. `restrict`를 붙인 `add_r`에는 이 검사가 없습니다. 즉 `restrict`는 검사 비용과 코드 크기를 줄여 줍니다.

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

M2 Pro에서 L1에 들어가는 4,096원소 배열로 20만 번 돌렸습니다(`bench/simd/dot.c`, `clang -O2`, 각 3회). `dot_neon4`는 아래 "Reduction Pattern"처럼 누산기를 넷으로 나눈 버전입니다.

| 버전 | 원소당 시간 (3회) |
|---|---|
| scalar (`-O2`, 부동소수점이라 벡터화 안 됨) | 0.870, 0.844, 0.883 ns |
| NEON, 누산기 1개 (위 코드) | 0.278, 0.278, 0.276 ns |
| NEON, 누산기 4개 | 0.077, 0.070, 0.070 ns |

세 버전 모두 결과는 9213.75로 같았습니다. 벡터 하나로 바꾼 것만으로는 3.1배였습니다. 누산기 하나짜리는 `vfmaq_f32`의 결과를 다음 `vfmaq_f32`가 기다리는 의존 사슬이라, 2-02의 scalar 사슬과 같은 문제가 벡터 단위로 남습니다. 사슬을 넷으로 나누자 12배가 됐습니다.

## Helium (MVE) — Cortex-M 용 SIMD

MVE(M-profile Vector Extension)는 Armv8.1-M의 확장입니다. GCC 14.2의 ARM Options 문서는 `armv8.1-m.main` 아래에 `+mve`(MVE 정수 명령)와 `+mve.fp`(정수와 단정밀도 부동소수점)를 두고, Cortex-M52·M55·M85에 이 확장을 끄는 `+nomve` 옵션을 적습니다.

```c
#include <arm_mve.h>

void add_mve(int16_t *a, int16_t *b, int16_t *c, int N) {
    int i = 0;
    for (; i + 8 <= N; i += 8) {
        int16x8_t va = vld1q(&a[i]);
        int16x8_t vb = vld1q(&b[i]);
        int16x8_t vc = vaddq(va, vb);
        vst1q(&c[i], vc);
    }
    for (; i < N; ++i) c[i] = a[i] + b[i];
}
```

`arm-none-eabi-gcc` 16.2(`-mcpu=cortex-m55 -mthumb -mfloat-abi=hard -O3`)로 컴파일하면 루프 본문은 `vldrh.16`, `vadd.i16`, `vstrh.16`이 되고, 루프 자체는 `dls lr, lr` / `le lr, .L3` 짝의 low-overhead loop가 됩니다(`bench/simd/mve-m55.log`). 같은 일을 `restrict` C 루프로 쓴 `add_auto`도 같은 벡터 명령으로 자동 벡터화됐습니다. 두 경우 모두 이 컴파일 결과에서 꼬리 원소는 scalar 코드가 처리했습니다. QEMU 같은 실행 환경에서 돌리지는 않았습니다.

## SVE — 가변폭 SIMD

SVE는 벡터 길이를 코드에 박아 두지 않는 확장입니다. Linux `Documentation/arch/arm64/sve.rst`에 따르면 Z 레지스터의 크기(VL)는 16 byte의 배수이고, 하드웨어 최대값 VLmax는 16~256 byte(128~2048 bit)입니다. 문서는 SVE 아키텍처가 256 byte를 상한으로 정하되 이후 개정에서 올릴 수 있다고 덧붙입니다.

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

`svwhilelt_b32(i, N)`은 i부터 N 전까지의 원소만 켜진 predicate를 만들고, `svcntw()`는 이 하드웨어의 벡터 하나에 든 32-bit 원소 수를 돌려줍니다. 그래서 같은 코드가 벡터 길이와 상관없이 마지막 원소까지 정확히 처리하고, 꼬리를 위한 scalar 루프가 필요 없습니다. 게스트의 GCC 14.2(`-O2 -march=armv8.2-a+sve`)로 컴파일하면 `whilelt`, `ld1w`, `fadd z30.s, p7/m, ...`, `cntw`가 나옵니다(`bench/simd/sve-vm.log`). M2 Pro와 이 게스트에는 SVE가 없어(`/proc/cpuinfo`의 Features에 `sve` 없음) 실행하지는 못했습니다.

## 측정 — IPC와 Throughput

이론적으로 `float` 넷을 한 번에 하면 4배지만, 실제 배수는 데이터가 어디 있느냐에 달려 있습니다. 위 dot product는 데이터가 L1에 있어 연산이 병목이었고, 누산기 넷으로 12배가 나왔습니다. 같은 일을 DRAM에 있는 큰 배열에 하면 2-08의 STREAM처럼 메모리 대역폭이 상한을 정하므로, 벡터화의 이득이 그만큼 나오지 않습니다. 측정은 이 글처럼 `clock_gettime`, Linux에서는 perf, Cortex-M에서는 DWT CYCCNT로 합니다.

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
/* 독립 사슬 4개 × 4 lane: 한 사슬의 add를 기다리는 동안 나머지가 진행 */
```

## Memory Alignment

```c
__attribute__((aligned(16))) float a[1024];
float32x4_t v = vld1q_f32(a);   // ← aligned load 빠름
```

AArch64의 `vld1q_f32`는 정렬되지 않은 주소도 읽습니다. 정렬이 성능에 주는 영향은 이 글에서 재지 않았습니다.

## SIMD 적용 어려운 경우

- **Branch가 많은 경우**: lane마다 다른 경로를 타면 비교 결과로 mask를 만들어 두 결과 중 하나를 고르는 방식으로 바꿔야 합니다.
- **Indirect access**: `a[idx[i]]`처럼 주소가 lane마다 다르면 연속한 원소를 읽는 `vld1q`를 쓸 수 없습니다.
- **Cross-element dependency**: `a[i] = a[i-1] + x[i]` 같은 점화식은 앞 원소의 결과가 있어야 다음을 계산하므로 lane으로 나눌 수 없습니다.

## 자주 하는 실수

> ⚠️ Auto-vectorize 신뢰

`gcc -O3`라고 해서 항상 벡터화되는 것은 아닙니다. 위 `sum`처럼 부동소수점 reduction은 GCC 14.2 `-O3`에서 벡터화되지 않았습니다. `-fopt-info-vec`(성공)와 `-fopt-info-vec-missed`(실패와 이유)로 확인합니다.

```bash
gcc -O3 -fopt-info-vec-missed -c vec.c
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
for (i = 0; i < N; i++) b[i] = (float)a[i] * 2.0f;
```

NEON에는 `int16`을 `float`으로 바로 바꾸는 intrinsic이 없습니다. 이전 판이 권한 `vcvtq_f32_s16`은 존재하지 않아, `clang -O2`가 `call to undeclared function 'vcvtq_f32_s16'` 오류를 냅니다(`bench/simd/cvt.log`). 먼저 `vmovl_s16`으로 32-bit로 넓힌 뒤 `vcvtq_f32_s32`로 바꿉니다. 이 둘은 `sshll.4s`와 `scvtf.4s` 두 명령이 됩니다. 16-bit 8개를 담던 128-bit 벡터가 32-bit로 넓어지면 4개만 들어가므로 같은 원소 수에 명령이 두 배로 듭니다. 변환 없이 정수 그대로 계산할 수 있다면 그쪽이 명령이 적습니다.

## 정리

- AArch64 NEON은 128-bit 레지스터 v0~v31에 `float` 넷을 담습니다. aarch64 GCC에는 `-mfpu=neon`이 없습니다.
- GCC 14.2는 `restrict` 없이도 실행 시 alias 검사로 벡터화했습니다. 부동소수점 reduction은 `-ffast-math` 없이는 벡터화하지 않았습니다.
- M2 Pro dot product: scalar 0.87, NEON 1 누산기 0.28, 4 누산기 0.07 ns/원소였습니다.
- MVE는 Armv8.1-M 확장이고(Cortex-M52·M55·M85), SVE는 VL이 128~2048 bit인 가변폭 확장입니다.

다음 편에서는 **PMU**를 다룹니다.

## 관련 항목

- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)

## 참고 자료

- [Arm AAPCS64](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst) (SIMD and Floating-Point registers)
- [GCC 14.2 ARM Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/ARM-Options.html) (`+mve`, `+mve.fp`, `+nomve`)
- Linux v6.12 `Documentation/arch/arm64/sve.rst`
