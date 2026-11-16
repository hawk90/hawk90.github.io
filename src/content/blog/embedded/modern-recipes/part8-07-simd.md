---
title: "SIMD 활용 분석 — Intrinsics·Auto-Vectorization·OpenMP SIMD"
slug: "embedded/modern-recipes/part8-07-simd"
date: 2026-04-17T09:06:00
description: "Auto-vectorize, intrinsics, OpenMP SIMD pragma 세 갈래를 데이터 layout과 함께 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 95
tags: [recipes, simd, vectorization, intrinsics, openmp]
topics: ["embedded"]
---

## 한 줄 요약

> **"SIMD = 한 명령으로 여러 데이터."** 같은 덧셈 루프가 Apple M2 Pro에서 scalar 0.27 ns/원소, 자동 벡터화 0.06 ns/원소였지만, 데이터가 cache를 벗어나자 둘 다 메모리 속도(0.14 ns/원소)에 묶였습니다. SIMD의 효과는 ISA보다 데이터 layout, 의존 사슬, 메모리 계층이 더 많이 정합니다.

## 어떤 상황에서 쓰나

오디오 mixer, 카메라 frame 변환, IMU sensor fusion처럼 같은 연산을 많은 원소에 반복하는 코드가 SIMD의 대상입니다. 공장 라인에서 한 사람이 부품 하나씩 조립하는 대신 같은 동작을 네 개의 부품에 한 번에 하는 기계를 들이는 것과 같습니다. 다만 기계가 빨라도 부품이 늦게 도착하면(메모리 대역폭) 라인 속도는 그대로입니다.

문제는 컴파일러가 언제 그 기계를 쓰고 언제 포기하는지 알기 어렵다는 점입니다. 아래 실행에서 같은 GCC 14.2가 `-O2`에서는 루프 넷 중 하나도 벡터화하지 않았고, `-O3`에서는 둘, SVE를 켜자 셋을 벡터화했습니다.

## 핵심 개념

적용 방법은 세 가지입니다.

| 방법 | 하는 일 | 확인 방법 |
| --- | --- | --- |
| Auto-vectorization | 컴파일러가 루프를 벡터 코드로 바꿈 | GCC `-fopt-info-vec-all`, clang `-Rpass=loop-vectorize` |
| Intrinsics | `arm_neon.h`·`arm_mve.h`·`arm_sve.h`·`immintrin.h`의 함수로 명령을 직접 고름 | 디스어셈블 |
| OpenMP SIMD pragma | 컴파일러에 "이 루프는 벡터화해도 된다"고 알림 | `-fopenmp-simd`를 켰는지, 디스어셈블 |

세 방법은 보완 관계입니다. 먼저 컴파일러 보고서로 어느 루프가 왜 벡터화되지 않았는지 보고, `restrict`·pragma로 풀리지 않는 hot loop만 intrinsics로 다시 씁니다.

## 코드 / 실제 사용 예

### Auto-vectorization 보고서 읽기

아래 네 함수는 자주 보는 네 가지 경우입니다.

```c
void scale(float *restrict a, float k, int N)
{
    for (int i = 0; i < N; i++) a[i] *= k;
}

void copy(float *a, float *b, int N)              /* no restrict: may alias */
{
    for (int i = 0; i < N; i++) a[i] = b[i];
}

void select_pos(const float *restrict a, float *restrict b, int N)
{
    for (int i = 0; i < N; i++)
        if (a[i] > 0) b[i] = a[i];
}

void prefix(float *a, int N)                      /* loop-carried dependency */
{
    for (int i = 1; i < N; i++) a[i] += a[i - 1];
}
```

Debian 13 arm64 게스트의 GCC 14.2.0에서 `-O2`, `-O3`, `-O3 -march=armv8-a+sve`로 보고서를 뽑았습니다.

```text
== gcc -O2 -fopt-info-vec-all -c vec.c
vec.c:13:23: missed: couldn't vectorize loop
vec.c:13:23: missed: not vectorized: unsupported control flow in loop.
vec.c:19:23: missed: couldn't vectorize loop
vec.c:19:42: missed: not vectorized, possible dependence between data-refs *_6 and *_3
vec.c:3:23: missed: Loop costings not worthwhile.
vec.c:3:23: missed: couldn't vectorize loop
vec.c:8:23: missed: couldn't vectorize loop
== gcc -O3 -fopt-info-vec-all -c vec.c
vec.c:13:23: missed: couldn't vectorize loop
vec.c:13:23: missed: not vectorized: unsupported control flow in loop.
vec.c:19:23: missed: couldn't vectorize loop
vec.c:19:42: missed: not vectorized, possible dependence between data-refs *_6 and *_3
vec.c:3:23: optimized: loop vectorized using 16 byte vectors
vec.c:8:23: optimized: loop vectorized using 16 byte vectors
== gcc -O3 -march=armv8-a+sve
vec.c:13:23: optimized: loop vectorized using variable length vectors
vec.c:19:23: missed: couldn't vectorize loop
vec.c:3:23: optimized: loop vectorized using variable length vectors
vec.c:8:23: optimized: loop vectorized using variable length vectors
```

- **`-O2`는 넷 다 하지 않았습니다.** `scale`도 "Loop costings not worthwhile"로 포기했습니다. GCC 14.2의 `-O2`는 `-fvect-cost-model=very-cheap`이고(`gcc -Q -O2 --help=optimizers`로 확인), GCC 14.2 매뉴얼은 이 모델이 "only allows vectorization if the vector code would entirely replace the scalar code", 예를 들어 반복 횟수가 4의 배수로 알려져 있을 때만 허용한다고 적습니다. `N`을 모르는 `scale`은 tail 처리 코드가 필요하므로 거절됐습니다. 벡터화를 기대한다면 `-O3`이거나 보고서로 확인합니다.
- **`copy`는 `restrict`가 없어도 `-O3`에서 벡터화됐습니다.** 대신 GCC는 포인터가 겹치는지 실행 중에 검사하는 버전을 만들었다고 보고합니다(`-fopt-info-vec-all` 전체 출력의 "loop versioned for vectorization because of possible aliasing"). `restrict`는 그 검사와 코드 크기를 없앱니다.
- **조건부 대입(`select_pos`)은 NEON에서 "unsupported control flow"였고, SVE에서는 벡터화됐습니다.** SVE는 lane마다 켜고 끄는 predicate로 조건부 store를 표현할 수 있기 때문입니다.
- **`prefix`는 어느 설정에서도 안 됐습니다.** `a[i]`가 바로 앞 `a[i-1]`의 결과를 기다리는 의존 사슬이라, 벡터화하려면 prefix-sum 알고리즘으로 다시 설계해야 합니다.

### NEON intrinsics와 측정

Apple M2 Pro(macOS, Apple clang 21.0.0 `-std=c11 -O2`)에서 덧셈 `c = a + b`와 합 `sum(a)`을 여러 방식으로 쟀습니다. 크기는 세 배열이 L1에 들어가는 4,096원소와, 들어가지 않는 4 Mi원소(배열 셋 48 MiB) 두 가지이고, 각 5회 중 가장 빠른 값입니다.

```c
/* add c = a + b and sum(data): scalar, auto-vectorized, NEON (1 and 4 accumulators) */
#include <arm_neon.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }

__attribute__((noinline)) void add_scalar(float *restrict a, float *restrict b, float *restrict c, int N)
{
#pragma clang loop vectorize(disable) interleave(disable)
    for (int i = 0; i < N; i++) c[i] = a[i] + b[i];
}

__attribute__((noinline)) void add_auto(float *restrict a, float *restrict b, float *restrict c, int N)
{
    for (int i = 0; i < N; i++) c[i] = a[i] + b[i];
}

__attribute__((noinline)) void add_neon(float *a, float *b, float *c, int N)
{
    int i = 0;
    for (; i + 4 <= N; i += 4) {
        float32x4_t va = vld1q_f32(&a[i]);
        float32x4_t vb = vld1q_f32(&b[i]);
        vst1q_f32(&c[i], vaddq_f32(va, vb));
    }
    for (; i < N; i++) c[i] = a[i] + b[i];          /* tail */
}

__attribute__((noinline)) float sum_scalar(const float *d, int N)
{
    float s = 0;
    for (int i = 0; i < N; i++) s += d[i];          /* strict FP order: not vectorized */
    return s;
}

__attribute__((noinline)) float sum_neon1(const float *d, int N)
{
    float32x4_t acc = vdupq_n_f32(0);
    int i = 0;
    for (; i + 4 <= N; i += 4) acc = vaddq_f32(acc, vld1q_f32(&d[i]));
    float s = vaddvq_f32(acc);
    for (; i < N; i++) s += d[i];
    return s;
}

__attribute__((noinline)) float sum_neon4(const float *d, int N)
{
    float32x4_t acc0 = vdupq_n_f32(0), acc1 = acc0, acc2 = acc0, acc3 = acc0;
    int i = 0;
    for (; i + 16 <= N; i += 16) {
        acc0 = vaddq_f32(acc0, vld1q_f32(&d[i]));
        acc1 = vaddq_f32(acc1, vld1q_f32(&d[i + 4]));
        acc2 = vaddq_f32(acc2, vld1q_f32(&d[i + 8]));
        acc3 = vaddq_f32(acc3, vld1q_f32(&d[i + 12]));
    }
    float s = vaddvq_f32(vaddq_f32(vaddq_f32(acc0, acc1), vaddq_f32(acc2, acc3)));
    for (; i < N; i++) s += d[i];
    return s;
}

#define BENCH(label, N, reps, call) do {                                        \
    double best = 1e9;                                                          \
    for (int t = 0; t < 5; t++) {                                               \
        double t0 = now();                                                      \
        for (int r = 0; r < (reps); r++) { call; }                              \
        double e = (now() - t0) / ((double)(reps) * (N)) * 1e9;                 \
        if (e < best) best = e;                                                 \
    }                                                                           \
    printf("%-28s N=%-8d %.3f ns/element\n", label, (N), best);                 \
} while (0)

static volatile float sink;

/* hide the pointer value from the optimizer so each call really runs */
static inline const float *launder(const float *p) { __asm__ volatile("" : "+r"(p)); return p; }

int main(void)
{
    const int sizes[2] = { 4096, 1 << 22 };            /* 48 KiB set fits L1; 48 MiB does not */
    for (int k = 0; k < 2; k++) {
        int N = sizes[k], reps = (int)(400000000LL / N);
        float *a = aligned_alloc(64, N * sizeof(float)), *b = aligned_alloc(64, N * sizeof(float)),
              *c = aligned_alloc(64, N * sizeof(float));
        for (int i = 0; i < N; i++) { a[i] = (float)(i % 7); b[i] = 1.0f; }
        BENCH("add scalar (no vectorize)", N, reps, add_scalar(a, b, c, N));
        BENCH("add auto-vectorized -O2", N, reps, add_auto(a, b, c, N));
        BENCH("add NEON intrinsics", N, reps, add_neon(a, b, c, N));
        BENCH("sum scalar", N, reps, sink = sum_scalar(launder(a), N));
        BENCH("sum NEON, 1 accumulator", N, reps, sink = sum_neon1(launder(a), N));
        BENCH("sum NEON, 4 accumulators", N, reps, sink = sum_neon4(launder(a), N));
        printf("sums: %.1f %.1f %.1f\n", sum_scalar(a, N), sum_neon1(a, N), sum_neon4(a, N));
        free(a); free(b); free(c);
    }
    uint8_t x[16], y[16], z[16];
    for (int i = 0; i < 16; i++) { x[i] = 200; y[i] = (uint8_t)(i * 10); }
    vst1q_u8(z, vqaddq_u8(vld1q_u8(x), vld1q_u8(y)));
    printf("vqaddq_u8(200, 0..150 step 10):");
    for (int i = 0; i < 16; i++) printf(" %u", z[i]);
    printf("\nwrapping add for comparison:   ");
    for (int i = 0; i < 16; i++) printf(" %u", (uint8_t)(x[i] + y[i]));
    printf("\n");
    return 0;
}
```

```text
Apple clang version 21.0.0 (clang-2100.4.1.1)
Apple M2 Pro
add scalar (no vectorize)    N=4096     0.271 ns/element
add auto-vectorized -O2      N=4096     0.059 ns/element
add NEON intrinsics          N=4096     0.094 ns/element
sum scalar                   N=4096     0.899 ns/element
sum NEON, 1 accumulator      N=4096     0.243 ns/element
sum NEON, 4 accumulators     N=4096     0.053 ns/element
sums: 12285.0 12285.0 12285.0
add scalar (no vectorize)    N=4194304  0.273 ns/element
add auto-vectorized -O2      N=4194304  0.141 ns/element
add NEON intrinsics          N=4194304  0.144 ns/element
sum scalar                   N=4194304  0.914 ns/element
sum NEON, 1 accumulator      N=4194304  0.229 ns/element
sum NEON, 4 accumulators     N=4194304  0.059 ns/element
sums: 12582907.0 12582907.0 12582907.0
vqaddq_u8(200, 0..150 step 10): 200 210 220 230 240 250 255 255 255 255 255 255 255 255 255 255
wrapping add for comparison:    200 210 220 230 240 250 4 14 24 34 44 54 64 74 84 94
```

| 측정 | 4,096원소 (L1) | 4 Mi원소 (메모리) |
| --- | ---: | ---: |
| add scalar (벡터화 끔) | 0.271 ns | 0.273 ns |
| add 자동 벡터화 | 0.059 ns | 0.141 ns |
| add NEON intrinsics | 0.094 ns | 0.144 ns |
| sum scalar | 0.899 ns | 0.914 ns |
| sum NEON, 누산기 1개 | 0.243 ns | 0.229 ns |
| sum NEON, 누산기 4개 | 0.053 ns | 0.059 ns |

같은 코드 블록을 새 디렉터리에서 다시 빌드해 돌렸을 때 각 값은 최대 15%(누산기 1개 sum, 0.243 → 0.206 ns) 달랐고, 표의 순서와 배수 관계는 같았습니다.

- **덧셈은 L1에서 4.6배, 메모리에서는 1.9배였습니다.** 데이터가 cache 밖에 있으면 자동 벡터화와 intrinsics가 같은 0.14 ns에 멈췄습니다. 벡터 폭보다 메모리가 먼저 한계입니다.
- **손으로 쓴 NEON이 자동 벡터화보다 느렸습니다(L1에서 0.094 대 0.059 ns).** clang 보고서는 `add_auto`를 "vectorization width: 4, interleaved count: 4", 즉 벡터 넷을 한 반복에 처리하도록 펼쳤다고 적고, 손으로 쓴 루프는 반복마다 벡터 하나만 처리합니다. intrinsics로 바꾼다고 저절로 빨라지지는 않습니다.
- **합은 의존 사슬이 문제였습니다.** scalar는 0.9 ns/원소였고, 벡터 누산기 하나로 3.7배, 넷으로 나누자 17배가 됐습니다. 같은 M2 Pro에서 dot product를 잰 [PE 2-09](/blog/embedded/performance-engineering/part2-09-simd-neon)도 누산기 1개 0.28 ns, 4개 0.07 ns로 같은 경향입니다.

`sum_scalar`가 0.9 ns로 느린 이유는 디스어셈블에 보입니다. clang은 이 루프도 "vectorized loop"라고 보고했지만, 실제로는 벡터로 load한 뒤 `mov sN, vM[k]`로 원소를 하나씩 꺼내 순서대로 `fadd s0, s0, ...`로 더합니다. 아래는 `cc -std=c11 -O2 -S simd.c` 출력의 안쪽 루프 전체입니다.

```text
LBB3_7:                                 ; =>This Inner Loop Header: Depth=1
	ldp	q1, q2, [x10, #-32]
	mov	s3, v1[3]
	mov	s4, v1[2]
	mov	s5, v1[1]
	mov	s6, v2[3]
	mov	s7, v2[2]
	mov	s16, v2[1]
	ldp	q17, q18, [x10], #64
	mov	s19, v17[3]
	mov	s20, v17[2]
	mov	s21, v17[1]
	mov	s22, v18[3]
	mov	s23, v18[2]
	mov	s24, v18[1]
	fadd	s0, s0, s1
	fadd	s0, s0, s5
	fadd	s0, s0, s4
	fadd	s0, s0, s3
	fadd	s0, s0, s2
	fadd	s0, s0, s16
	fadd	s0, s0, s7
	fadd	s0, s0, s6
	fadd	s0, s0, s17
	fadd	s0, s0, s21
	fadd	s0, s0, s20
	fadd	s0, s0, s19
	fadd	s0, s0, s18
	fadd	s0, s0, s24
	fadd	s0, s0, s23
	fadd	s0, s0, s22
	subs	x11, x11, #16
	b.ne	LBB3_7
```

C의 부동소수점 덧셈은 순서를 바꾸면 결과가 달라질 수 있으므로, 컴파일러는 허락 없이 합의 순서를 바꾸지 않습니다. 누산기를 넷으로 나누는 것은 그 순서를 프로그래머가 바꾸겠다고 정하는 일입니다. 이 실행에서는 세 방식의 합이 같았지만, 값의 크기가 크게 다른 데이터에서는 마지막 자리가 달라질 수 있습니다.

### Saturating arithmetic

위 `simd.c` 마지막 부분이 `vqaddq_u8`를 돌린 결과입니다. 200에 0~150을 더하면 255에서 멈추고(saturate), 일반 `uint8_t` 덧셈은 256을 넘는 순간 4, 14, 24…로 돌아갑니다(wrap). 이미지 밝기 조정처럼 넘친 값을 최댓값으로 두어야 하는 처리에 `vq*` 계열을 씁니다.

### Cortex-M55 Helium (MVE)

Cortex-M55는 MVE(M-profile Vector Extension, Helium)를 가진 MCU 코어이고, QEMU `mps3-an547`이 이 코어를 모델링합니다(QEMU v11.1.0 `hw/arm/mps2-tz.c`의 기본 CPU `cortex-m55`). 원소 37개(8의 배수가 아님)를 더해 tail 처리와 guard 영역을 확인했습니다.

```c
/* Helium (MVE) predicated add on Cortex-M55; compare with a scalar loop for odd N */
#include <arm_mve.h>
#include "bm.h"

void add_mve(const int16_t *a, const int16_t *b, int16_t *c, int N)
{
    for (int i = 0, n = N; n > 0; n -= 8, i += 8) {
        mve_pred16_t p = vctp16q(n);              /* lanes [0, min(n,8)) active */
        int16x8_t va = vld1q_z_s16(&a[i], p);
        int16x8_t vb = vld1q_z_s16(&b[i], p);
        vst1q_p_s16(&c[i], vaddq_x_s16(va, vb, p), p);
    }
}

static int16_t a[37], b[37], c[37 + 8];

int main(void)
{
    /* enable CP10/CP11 (FPU and MVE) in CPACR before the first vector instruction */
    *(volatile uint32_t *)0xE000ED88 |= 0xFu << 20;
    __asm volatile("dsb\n isb");

    const int N = 37;                              /* not a multiple of 8 */
    for (int i = 0; i < N; i++) { a[i] = (int16_t)(i * 3); b[i] = (int16_t)(1000 - i); }
    for (int i = N; i < N + 8; i++) c[i] = 0x7777;  /* guard: must stay untouched */
    add_mve(a, b, c, N);

    int bad = 0;
    for (int i = 0; i < N; i++) bad += c[i] != (int16_t)(a[i] + b[i]);
    for (int i = N; i < N + 8; i++) bad += c[i] != 0x7777;
    puts_("N=37: c[0]="); putu((unsigned)c[0]); puts_(" c[36]="); putu((unsigned)c[36]);
    puts_(" guard c[37]="); putx((unsigned short)c[37]); puts_(" mismatches="); putu((unsigned)bad); puts_("\n");
    exit_();
}
```

```text
00000108 <add_mve>:
 108:	cmp	r3, #0
 10a:	ble.n	128 <add_mve+0x20>
 10c:	push	{lr}
 10e:	dlstp.16	lr, r3
 112:	vldrh.u16	q3, [r0], #16
 116:	vldrh.u16	q2, [r1], #16
 11a:	vadd.i16	q3, q3, q2
 11e:	vstrh.16	q3, [r2], #16
 122:	letp	lr, 112 <add_mve+0xa>
 126:	pop	{pc}
 128:	bx	lr
 12a:	nop

N=37: c[0]=1000 c[36]=1072 guard c[37]=0x00007777 mismatches=0
```

- `vctp16q(n)`이 남은 원소 수만큼만 lane을 켠 predicate를 만들어, 마지막 반복에서 5개만 쓰고 guard `c[37]`(`0x7777`)은 그대로 두었습니다. scalar tail 루프가 없습니다.
- GCC 16.2는 이 루프를 `dlstp.16`/`letp` 저부담 루프로 바꿨습니다. 반복 횟수와 predicate를 하드웨어 루프가 관리하므로 루프 안에 비교·분기 명령이 없습니다.
- MVE 명령 전에 CPACR(`0xE000ED88`)의 CP10·CP11을 켜야 합니다. 이 프로그램은 그 두 비트를 켠 뒤 시작합니다.

### SVE — vector length를 모르는 코드

SVE의 vector 길이는 CPU마다 다르고(128~2048 bit), 코드는 실행 중에 `svcntw()`로 그 길이를 묻습니다. M2 Pro에는 SVE가 없어서, 게스트에서 `qemu-user`(QEMU 10.0.13)로 vector 길이를 바꿔 가며 같은 바이너리를 돌렸습니다.

```c
/* vector-length-agnostic SVE add; run under qemu-aarch64 with several vector lengths */
#include <arm_sve.h>
#include <stdio.h>

void add_sve(const float *a, const float *b, float *c, int N)
{
    int i = 0;
    svbool_t pg = svwhilelt_b32(i, N);
    while (svptest_first(svptrue_b32(), pg)) {
        svfloat32_t va = svld1(pg, &a[i]);
        svfloat32_t vb = svld1(pg, &b[i]);
        svst1(pg, &c[i], svadd_x(pg, va, vb));
        i += svcntw();                             /* floats per vector on this CPU */
        pg = svwhilelt_b32(i, N);
    }
}

int main(void)
{
    enum { N = 37 };
    float a[N], b[N], c[N + 4];
    for (int i = 0; i < N; i++) { a[i] = i; b[i] = 0.5f; }
    for (int i = N; i < N + 4; i++) c[i] = -1;
    add_sve(a, b, c, N);
    int bad = 0;
    for (int i = 0; i < N; i++) bad += c[i] != a[i] + 0.5f;
    for (int i = N; i < N + 4; i++) bad += c[i] != -1;
    printf("svcntw()=%d (vector = %d bits), loop trips=%d, c[36]=%.1f, mismatches=%d\n",
           (int)svcntw(), (int)svcntw() * 32, (N + (int)svcntw() - 1) / (int)svcntw(), c[36], bad);
    return 0;
}
```

```text
sve-default-vector-length=16: svcntw()=4 (vector = 128 bits), loop trips=10, c[36]=36.5, mismatches=0
sve-default-vector-length=32: svcntw()=8 (vector = 256 bits), loop trips=5, c[36]=36.5, mismatches=0
sve-default-vector-length=64: svcntw()=16 (vector = 512 bits), loop trips=3, c[36]=36.5, mismatches=0
sve-default-vector-length=256: svcntw()=64 (vector = 2048 bits), loop trips=1, c[36]=36.5, mismatches=0
native (host CPU): bash: line 1: 188922 Illegal instruction     ./sve
exit=132
```

같은 바이너리가 vector 길이 128 bit에서 2048 bit까지 모두 같은 결과를 냈습니다. `loop trips`는 프로그램이 `svcntw()`로 계산한 반복 수(128 bit에서 10번, 2048 bit에서 1번)입니다. `sve-default-vector-length`의 단위는 byte입니다(QEMU `docs/system/arm/cpu-features.rst`: "in units of bytes and must be between 16 and 8192"). SVE가 없는 M2 Pro 위 게스트에서 직접 실행하면 `Illegal instruction`으로 끝났습니다. 그래서 SVE 코드를 배포할 때는 `getauxval(AT_HWCAP) & HWCAP_SVE`(v6.12 `arch/arm64/include/uapi/asm/hwcap.h:48`) 같은 실행 시 검사로 NEON 경로와 나눕니다.

### x86 AVX

```c
#include <immintrin.h>

void add_avx(const float *a, const float *b, float *c, int N)
{
    int i = 0;
    for (; i + 8 <= N; i += 8) {
        __m256 va = _mm256_loadu_ps(&a[i]);
        __m256 vb = _mm256_loadu_ps(&b[i]);
        _mm256_storeu_ps(&c[i], _mm256_add_ps(va, vb));
    }
    for (; i < N; i++) c[i] = a[i] + b[i];        /* tail */
}
```

`_mm256_load_ps`는 "a 32-byte aligned pointer"를 요구하는 `VMOVAPS`이고, `_mm256_loadu_ps`가 정렬을 요구하지 않는 `VMOVUPS`입니다(clang 21 `avxintrin.h` 3164–3205행 주석). 정렬을 보장하지 않는 포인터라면 `loadu`를 씁니다. 위 코드는 Mac에서 `cc --target=x86_64-apple-macos13 -mavx2 -O2 -c avx.c`로 컴파일해 `vmovups`·`vaddps`가 나오는 것만 확인했고, x86 머신이 없어 실행하지 않았습니다.

### OpenMP SIMD pragma

```c
float sum_omp(const float *data, int N)
{
    float sum = 0;
#pragma omp simd reduction(+:sum)
    for (int i = 0; i < N; i++) sum += data[i];
    return sum;
}

void mul_omp(const float *a, const float *b, float *c, int N)
{
#pragma omp simd aligned(a, b, c : 64)
    for (int i = 0; i < N; i++) c[i] = a[i] * b[i];
}
```

pragma는 컴파일러가 OpenMP를 켰을 때만 의미가 있습니다. 같은 파일을 두 번 컴파일해 `sum_omp`의 덧셈 명령을 셌습니다.

```text
== cc -std=c11 -O2  -c omp.c
  21 fadd
== cc -std=c11 -O2 -fopenmp-simd -c omp.c
   6 fadd
   8 fadd.4s
   2 faddp.2s
```

`-fopenmp-simd` 없이는 pragma가 무시되어 21개의 scalar `fadd` 사슬이 남았고, 켜자 `reduction(+:sum)` 허락을 받아 `fadd.4s` 벡터 누산으로 바뀌었습니다. 경고도 없었습니다. `-fopenmp-simd`는 스레드 런타임 없이 `simd` pragma만 켜는 옵션입니다.

## 측정 / 성능 비교

위 표가 이 글의 측정 전부입니다. 정리하면 다음 세 가지입니다.

- L1 안에서는 벡터화가 덧셈을 4.6배 빠르게 했지만, 48 MiB 데이터에서는 메모리가 한계가 되어 1.9배에 그쳤습니다.
- 합처럼 의존 사슬이 있는 연산은 벡터화보다 누산기를 나누는 것이 더 큰 차이(누산기 1개 → 4개에서 4.6배)를 냈습니다.
- 숫자는 M2 Pro의 것이고, Cortex-A·Cortex-M 보드에서는 같은 프로그램으로 다시 잽니다. QEMU로 돌린 MVE·SVE 결과는 동작 확인이고 속도 측정이 아닙니다.

## 자주 보는 함정

> ⚠️ `-O2`에서 벡터화를 기대

위 보고서처럼 GCC 14.2 `-O2`는 네 루프를 모두 벡터화하지 않았습니다. `-fopt-info-vec-all`(GCC)이나 `-Rpass-missed=loop-vectorize`(clang)로 확인합니다.

> ⚠️ Tail loop 누락

```c
for (int i = 0; i + 4 <= N; i += 4) { /* ... */ }
/* N = 10: elements 8 and 9 are never processed */
```

scalar tail을 붙이거나, MVE·SVE처럼 predicate로 마지막 반복을 처리합니다. 위 MVE 실행이 guard를 건드리지 않은 것이 그 확인입니다.

> ⚠️ 정렬을 요구하는 load에 아무 포인터나

`_mm256_load_ps`는 32 B 정렬을 요구합니다. NEON의 `vld1q_f32`는 이 글의 `simd.c`가 `aligned_alloc(64, ...)`로 잡은 배열에서 썼고, 정렬하지 않은 포인터에서의 비용은 재지 않았습니다. 정렬은 `aligned_alloc`이나 `alignas`로 보장합니다([8-02](/blog/embedded/modern-recipes/part8-02-memory-alignment)).

> ⚠️ ISA를 가정한 바이너리

SVE 바이너리는 SVE가 없는 CPU에서 `Illegal instruction`으로 죽었습니다. 같은 이유로 `arm_neon.h` 코드는 x86에서 컴파일되지 않습니다. ISA마다 파일을 나누고 빌드 설정이나 실행 시 검사로 고릅니다.

> ⚠️ AoS를 그대로 둔 채 intrinsics

```c
struct vec3 { float x, y, z; } v[N];
/* x values are 12 B apart: a plain vld1q_f32 cannot load four of them */
```

`x`만 모아 연속으로 두는 SoA로 바꾸면 위 `add`처럼 연속 load가 됩니다. [8-03](/blog/embedded/modern-recipes/part8-03-cache-alignment#aos--soa-변환)에서 AoS → SoA가 같은 루프를 4.3배 빠르게 했습니다.

## 재현 환경

```bash
# Apple M2 Pro, macOS
cc -std=c11 -O2 -Wall -o simd simd.c && ./simd
cc -std=c11 -O2 -Rpass=loop-vectorize -Rpass-missed=loop-vectorize -c simd.c
bash run-omp.sh
cc --target=x86_64-apple-macos13 -mavx2 -O2 -c avx.c && objdump -d avx.o

# Debian 13 arm64 guest (GCC 14.2.0, qemu-user 10.0.13)
gcc -O3 -fopt-info-vec-all -c vec.c
gcc -O2 -march=armv8-a+sve -static -o sve sve.c
qemu-aarch64 -cpu max,sve-default-vector-length=32 ./sve

# Cortex-M55 on QEMU 11.1.3 mps3-an547, arm-none-eabi-gcc 16.2.0
bash run-mve.sh
```

`run-mve.sh`와 `run-omp.sh`는 다음과 같습니다. `bm.h`와 `startup_bm.c`는 [8-02의 재현 환경](/blog/embedded/modern-recipes/part8-02-memory-alignment#재현-환경)과 같고, `link-an547.ld`는 그 글의 `link-an385.ld`에서 FLASH와 RAM 길이를 각각 `512K`로 바꾼 것입니다(SSE-300의 ITCM `0x0`, DTCM `0x20000000`가 각 512 KiB입니다. QEMU v11.1.0 `hw/arm/armsse.c` 1228–1238행).

```bash
#!/bin/bash
CF="-O2 -g -ffreestanding -nostdlib -fno-builtin -mthumb"
arm-none-eabi-gcc $CF -mcpu=cortex-m55 -mfloat-abi=hard -T link-an547.ld -o mve.elf startup_bm.c mve.c -lgcc
arm-none-eabi-objdump -d --no-show-raw-insn mve.elf | awk '/<add_mve>:/,/^$/'
timeout 10 qemu-system-arm -M mps3-an547 -nographic -semihosting -kernel mve.elf
```

```bash
#!/bin/bash
for f in "" -fopenmp-simd; do
  echo "== cc -std=c11 -O2 $f -c omp.c"
  cc -std=c11 -O2 $f -c omp.c -o omp.o
  objdump -d --no-show-raw-insn omp.o | awk '/<_mul_omp>:/{exit} /fadd/' | awk '{print $2}' | sort | uniq -c
done
```

## 정리

- 컴파일러 보고서를 먼저 봅니다. GCC 14.2 `-O2`는 이 글의 루프 넷을 하나도 벡터화하지 않았습니다.
- `restrict`가 없으면 GCC는 실행 중 alias 검사 버전을 만들고, 조건부 대입은 NEON에서 안 되고 SVE에서 됐고, prefix 의존 사슬은 어디서도 안 됐습니다.
- 덧셈은 L1에서 4.6배였지만 메모리에서는 1.9배였습니다. 데이터가 cache를 벗어나면 벡터 폭보다 대역폭이 한계입니다.
- 손으로 쓴 NEON이 펼침(interleave) 덕분에 자동 벡터화보다 느릴 수 있었습니다.
- 합은 누산기 넷으로 나누자 scalar의 17배가 됐습니다. 컴파일러는 부동소수점 합의 순서를 허락 없이 바꾸지 않습니다.
- MVE의 `vctp`와 SVE의 `whilelt`는 tail을 predicate로 처리했고, SVE 코드 하나가 128~2048 bit에서 같은 결과를 냈습니다.
- `#pragma omp simd`는 `-fopenmp-simd` 없이는 경고 없이 무시됐습니다.

다음 편은 **ARM NEON 심화**입니다.

## 관련 항목

- [8-06: NUMA](/blog/embedded/modern-recipes/part8-06-numa)
- [8-08: ARM NEON 심화](/blog/embedded/modern-recipes/part8-08-neon)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [8-03: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
