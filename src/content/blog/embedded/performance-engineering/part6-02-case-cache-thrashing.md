---
title: "사례 분석 — 행렬 곱 성능과 메모리 접근 패턴"
slug: "embedded/performance-engineering/part6-02-case-cache-thrashing"
date: 2026-04-28T09:01:00
description: "1024×1024 행렬 곱을 M2 Pro와 arm64 VM에서 여섯 가지로 재 보고, 느린 원인이 cache miss인지 덧셈 의존 사슬인지 가려 봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 51
tags: [case-study, cache, thrashing, tiling, layout]
topics: ["embedded"]
---

## 한 줄 요약

> **"행렬 곱이 느릴 때 cache miss부터 의심하기 쉽지만, 재 보면 다른 병목이 먼저 나올 수 있습니다. 가설마다 *그 가설만 바꾸는* 변형을 만들어 비교합니다."**

## 증상 — 재현한 문제

이미지 처리 파이프라인에서 1024×1024 float 행렬 곱이 예상보다 한참 느리다는 보고를 받았다고 해 봅니다. 이 글은 그 상황을 직접 만들어 측정했습니다. 연산량부터 계산하면 곱셈과 덧셈을 합쳐 2 × 1024³ = 2,147,483,648 FLOP, 약 2.15 GFLOP입니다. 행렬 하나는 1024 × 1024 × 4 B = 4 MiB이고, A·B·C를 합치면 12 MiB입니다.

출발점은 교과서 그대로의 삼중 루프입니다.

```c
static void naive(const float *A, const float *B, float *C, int N) {
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) {
            float sum = 0;
            for (int k = 0; k < N; k++) sum += A[i * N + k] * B[k * N + j];
            C[i * N + j] = sum;
        }
}
```

측정 환경은 두 가지입니다. 같은 `matmul.c`를 Mac에서 직접, 그리고 같은 Mac 위의 arm64 VM에서 빌드했습니다. 각 변형을 5번씩 돌려 중앙값을 씁니다. 첫 실행은 버리는 워밍업입니다. 실행 시간에는 transpose 시간(Mac 약 4 ms, VM 약 7 ms)이 포함됩니다.

| 항목 | Mac | VM |
|---|---|---|
| CPU | Apple M2 Pro P-core | 같은 M2 Pro (QEMU 11.1.3 HVF, `-cpu host`), `taskset -c 2` |
| OS | macOS 27.2.1 | Debian 13 arm64, kernel 6.12.116 |
| 컴파일러 | Apple clang 21.0.0, `-O2` | GCC 14.2.0, `-O2` |
| 캐시(OS 보고) | L1D 128 KiB, L2 16 MiB(4코어 공유), line 128 B (`sysctl hw.perflevel0.*`) | guest의 `getconf`는 L1D 크기 0, line 64 B 보고 |

여기서 이미 중요한 사실 하나가 보입니다. M2 Pro P-core 클러스터의 L2는 16 MiB이므로 **A·B·C 12 MiB가 L2에 다 들어갑니다**. "working set이 L2를 넘는다"는 전제는 L2가 1 MiB인 작은 코어에서는 맞지만, 이 측정 환경에서는 맞지 않습니다.

naive의 중앙값은 Mac 1,414.7 ms(1.52 GFLOP/s), VM 1,244.3 ms(1.73 GFLOP/s)였습니다. 같은 Mac에서 다른 작업이 함께 돌았기 때문에 Mac 쪽 naive 한 번은 6,071 ms까지 튀었습니다. 중앙값을 쓰는 이유입니다.

## 가설 1 — SIMD 미사용

처음 의심할 것은 컴파일러가 NEON을 쓰지 않았을 가능성입니다. 두 컴파일러에 vectorization 보고를 요청했습니다.

```bash
clang -O2 -Rpass=loop-vectorize -Rpass-missed=loop-vectorize -c matmul.c -o /dev/null
gcc -O2 -fopt-info-vec-all -o matmul matmul.c
```

naive의 k 루프(13행)에 대한 답은 두 컴파일러 모두 "안 한다"였습니다.

```text
13:13: remark: the cost-model indicates that vectorization is not beneficial [-Rpass-missed=loop-vectorize]
matmul.c:13:64: missed: not vectorized: not suitable for strided load _135 = *_134;
```

GCC는 이유를 `B[k * N + j]`의 strided load로 듭니다. k가 1 늘 때마다 주소가 4,096 B씩 뛰니, 연속된 4개를 한 번에 읽는 벡터 load를 쓸 수 없습니다.

**가설 1 확인**: naive는 벡터화되지 않았습니다. 다만 이것만으로 느린 이유가 설명되는지는 아래에서 따로 봅니다.

## 가설 2 — Cache miss 폭주

다음 후보는 cache miss입니다. `B[k * N + j]`는 한 번 읽을 때마다 다른 cache line을 건드립니다. 64 B line이면 line 하나에 float 16개가 들어 있는데, column 순회 한 번에서는 그중 1개만 씁니다. 도서관에서 책 한 권의 한 쪽만 읽으려고 매번 다른 서가를 다녀오는 것과 같습니다.

이 VM에서는 하드웨어 PMU 이벤트를 쓸 수 없었습니다(`perf stat -e cycles`가 `<not supported>`). 대신 Valgrind 3.24.0의 Cachegrind로 miss를 *시뮬레이션*했습니다. Cachegrind는 이 CPU의 캐시 구성을 자동 감지하지 못해 기본값(D1 16 KiB 4-way, LL 256 KiB 8-way, 64 B line)을 썼고, 실행 시간 때문에 N=512로 줄였습니다. 따라서 아래 숫자는 M2의 실제 miss율이 아니라 **같은 가상 캐시에서의 상대 비교**입니다.

```bash
valgrind --tool=cachegrind --cache-sim=yes --cachegrind-out-file=/dev/null ./matmul naive 512
```

```text
==8415== D refs:        288,209,888  (281,639,837 rd   + 6,570,051 wr)
==8415== D1  misses:    134,854,793  (134,555,711 rd   +   299,082 wr)
==8415== D1  miss rate:        46.8% (       47.8%     +       4.6%  )
```

B를 미리 transpose해 k를 따라 연속으로 읽게 바꾸면(아래 `trans`), 같은 시뮬레이션에서 D1 miss는 134,854,793에서 8,774,292로 15분의 1이 됩니다.

```c
static void trans(const float *A, const float *BT, float *C, int N) {
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) {
            float sum = 0;
            for (int k = 0; k < N; k++) sum += A[i * N + k] * BT[j * N + k];
            C[i * N + j] = sum;
        }
}
```

그런데 실행 시간은 기대만큼 줄지 않았습니다.

| 변형 (N=1024) | Mac 중앙값 | VM 중앙값 |
|---|---|---|
| naive | 1,414.7 ms | 1,244.3 ms |
| trans | 869.3 ms | 1,235.5 ms |

VM에서는 miss를 15분의 1로 줄였는데도 시간이 0.7%밖에 줄지 않았습니다. Mac에서도 1.6배입니다. **miss가 주된 병목이었다면 이렇게 나올 수 없습니다.**

## 원인 — 덧셈 의존 사슬이 먼저다

`sum += ...`를 다시 봅니다. k번째 덧셈은 k−1번째 덧셈 결과가 나와야 시작할 수 있습니다. 1,024번의 덧셈이 한 줄로 늘어선 사슬이고, 이 사슬은 메모리가 아무리 빨라도 덧셈 latency × 1,024보다 짧아질 수 없습니다. 계산대가 하나뿐인 마트에서는 손님이 빨리 도착해도 줄이 줄지 않는 것과 같습니다.

컴파일러가 이 사슬을 대신 끊어 주지 않는 이유도 있습니다. 부동소수점 덧셈은 결합 법칙이 성립하지 않아, 순서를 바꾸면 결과 비트가 달라질 수 있습니다. clang은 `trans`의 k 루프(25행)를 "vectorized loop (vectorization width: 4, interleaved count: 4)"라고 보고했지만, 실제 어셈블리를 보면 곱셈만 벡터(`fmul.4s`)이고 덧셈은 원래 순서대로 스칼라로 이어집니다.

```text
	ldp	q1, q2, [x4, #-32]
	ldp	q3, q4, [x4], #64
	ldp	q5, q6, [x3, #-32]
	ldp	q7, q16, [x3], #64
	fmul.4s	v1, v1, v5
	mov	s5, v1[3]
	mov	s17, v1[2]
	mov	s18, v1[1]
	...
	fadd	s0, s0, s1
	fadd	s0, s0, s18
	fadd	s0, s0, s17
	fadd	s0, s0, s5
	...
```

`clang -O2 -S`로 뽑은 이 루프 본문에는 `fmul.4s` 4개 뒤에 `fadd s0, s0, …`가 16개 이어지고, 모든 `fadd`가 `s0`에 누적됩니다. 사슬이 그대로 남아 있습니다. GCC는 같은 루프를 아예 벡터화하지 않았습니다(`matmul.c:25:65: missed: not vectorized: complicated access pattern.`).

이 가설을 확인하려고 메모리 접근은 그대로 두고 *합만 4개로 쪼갠* 변형을 만들었습니다. `naive4`는 naive와 같은 strided 접근, `trans4`는 trans와 같은 연속 접근이고, 각각 독립된 누산기 4개를 씁니다.

```c
float s0 = 0, s1 = 0, s2 = 0, s3 = 0;
for (int k = 0; k < N; k += 4) {
    s0 += A[i * N + k] * BT[j * N + k];         s1 += A[i * N + k + 1] * BT[j * N + k + 1];
    s2 += A[i * N + k + 2] * BT[j * N + k + 2]; s3 += A[i * N + k + 3] * BT[j * N + k + 3];
}
C[i * N + j] = (s0 + s1) + (s2 + s3);
```

결과가 원인을 둘로 나눠 보여 줍니다.

| 변형 | 접근 패턴 | 누산기 | Mac | VM |
|---|---|---|---|---|
| naive | column-stride | 1 | 1,414.7 ms | 1,244.3 ms |
| naive4 | column-stride | 4 | 1,248.6 ms | 985.7 ms |
| trans | 연속 | 1 | 869.3 ms | 1,235.5 ms |
| trans4 | 연속 | 4 | 256.1 ms | 253.3 ms |

- 접근이 연속이면 사슬을 끊는 것만으로 3.4배(Mac)~4.9배(VM) 빨라집니다(trans → trans4).
- 사슬을 끊어도 접근이 strided면 조금만 빨라집니다(naive → naive4, Mac 12%, VM 21%). 이때는 메모리 접근이 병목입니다.
- 사슬을 끊은 상태에서 접근 패턴만 바꾸면 3.9배(VM, naive4 → trans4) 차이가 납니다.

정리하면 **두 병목이 겹쳐 있었고, 덧셈 사슬이 앞을 가리고 있었습니다.** 하나만 고치면 다른 하나가 드러나지 않습니다.

## 해결 — Transpose, Tiling, NEON

앞의 결과대로라면 해결은 두 병목을 모두 다뤄야 합니다. transpose로 접근을 연속으로 만들고, 사슬을 끊어야 합니다. 이 글에서 잰 변형은 다음 두 가지를 더 포함합니다.

**Tiling (32×32 block)**: transpose한 BT 위에서 32×32 블록 단위로 곱합니다. 32×32 float 블록 하나는 4 KiB입니다.

```c
#define TILE 32
for (int ii = 0; ii < N; ii += TILE)
    for (int jj = 0; jj < N; jj += TILE)
        for (int kk = 0; kk < N; kk += TILE)
            for (int i = ii; i < ii + TILE; i++)
                for (int j = jj; j < jj + TILE; j++) {
                    float sum = C[i * N + j];
                    for (int k = kk; k < kk + TILE; k++) sum += A[i * N + k] * BT[j * N + k];
                    C[i * N + j] = sum;
                }
```

이 코드는 N이 TILE의 배수라고 가정하며(1024는 32의 배수), C를 0으로 먼저 채웁니다. 안쪽 k 루프가 32번만 돌기 때문에 사슬 길이가 32로 짧아집니다. 사슬이 짧으면 CPU는 다음 j의 사슬을 미리 시작할 수 있습니다. GCC는 이 루프(`matmul.c` 59행)를 "loop vectorized using 16 byte vectors"라고 보고했습니다. 같은 GCC는 누산기 4개짜리 `trans4`(33행)도 벡터화했습니다.

**Tiling + NEON (AArch64)**: 같은 블록에서 `vfmaq_f32`로 4개 lane에 곱셈-누산을 하고, 블록 끝에서 `vaddvq_f32`로 4개를 더합니다. 4개 lane이 곧 4개의 독립 누산기입니다.

```c
float32x4_t acc = vdupq_n_f32(0.0f);
for (int k = kk; k < kk + TILE; k += 4)
    acc = vfmaq_f32(acc, vld1q_f32(&A[i * N + k]), vld1q_f32(&BT[j * N + k]));
C[i * N + j] += vaddvq_f32(acc);   /* AArch64 horizontal add */
```

intrinsic의 의미는 [Arm ACLE Advanced SIMD 문서](https://developer.arm.com/documentation/101028/0009/Advanced-SIMD--Neon--intrinsics)에 있습니다. 합산 순서가 바뀌므로 결과도 조금 달라집니다. 이 프로그램은 64개 원소를 double 정밀도 기준값과 비교하는데, Mac에서 최대 상대 오차는 naive 1.05e-06, trans 1.11e-06, NEON 변형 1.74e-07이었습니다. 이 입력에서는 순서를 바꾼 쪽이 오히려 기준값에 더 가까웠습니다. 다만 결과가 비트 단위로 같아야 하는 시스템이라면 이런 변경 자체를 검토해야 합니다.

## 검증 — Before / After

여섯 변형 모두 같은 `matmul.c`, 같은 입력(`srand(1)`)입니다. GFLOP/s는 2.15 GFLOP을 중앙값 시간으로 나눈 값입니다.

| 단계 | Mac 중앙값 | Mac GFLOP/s | VM 중앙값 | VM GFLOP/s |
|---|---|---|---|---|
| naive | 1,414.7 ms | 1.52 | 1,244.3 ms | 1.73 |
| + transpose (trans) | 869.3 ms | 2.47 | 1,235.5 ms | 1.74 |
| + 누산기 4개 (trans4) | 256.1 ms | 8.39 | 253.3 ms | 8.48 |
| + tiling (tiled) | 235.2 ms | 9.13 | 253.6 ms | 8.47 |
| + tiling + NEON (tiled_neon) | 81.2 ms | 26.45 | 124.8 ms | 17.21 |

Cachegrind 시뮬레이션(N=512, 기본 캐시 구성)의 D1 miss는 다음과 같습니다.

| 변형 | D1 misses | D1 miss rate | LLd miss rate |
|---|---|---|---|
| naive | 134,854,793 | 46.8% | 46.8% |
| trans | 8,774,292 | 3.0% | 3.0% |
| trans4 | 8,774,292 | 10.0% | 10.0% |
| tiled | 13,737,921 | 14.4% | 0.7% |

`trans4`의 miss율이 `trans`보다 높은 것은 miss가 늘어서가 아니라 GCC가 load를 벡터로 묶어 전체 참조 수(D refs)가 288,734,227에서 87,407,535로 줄었기 때문입니다. miss 개수는 같습니다. `tiled`는 D1 miss가 trans보다 많지만 LL miss율이 0.7%로 낮습니다. 한 번에 다루는 A·BT 블록이 각 4 KiB라 시뮬레이션의 LL(256 KiB) 안에서 재사용되기 때문입니다. **miss율 하나만 보고 판단하면 틀립니다.** 개수와 실행 시간을 같이 봐야 합니다.

naive에서 tiled_neon까지 Mac에서 17.4배, VM에서 10.0배 빨라졌습니다. 이 중 tiling 단독의 몫은 trans4 대비 Mac 8%, VM 0%로 작았습니다. 이 크기(12 MiB)는 M2 Pro의 16 MiB L2에 들어가기 때문으로 봅니다. L2가 1 MiB인 코어라면 tiling의 몫이 달라질 것이므로, 대상 보드에서 같은 표를 다시 만들어야 합니다.

## 교훈

- **가설마다 그 가설만 바꾸는 변형을 만듭니다.** `naive4`와 `trans4`가 없었다면 transpose가 "효과 없다"고 잘못 결론 냈을 것입니다.
- **cache miss를 줄였는데 빨라지지 않으면 다른 병목이 있습니다.** 이 사례에서는 1,024개짜리 부동소수점 덧셈 사슬이었습니다.
- **컴파일러 보고와 어셈블리를 함께 봅니다.** clang은 "vectorized"라고 보고했지만 덧셈은 스칼라 사슬로 남아 있었습니다.
- **부동소수점 합의 순서를 바꾸면 결과가 바뀝니다.** NEON 변형의 오차는 이 입력에서 더 작았지만, 비트 단위 재현이 필요한지는 시스템 요구사항으로 정합니다.
- **캐시 크기 전제를 측정 환경에서 확인합니다.** 12 MiB는 M2 Pro의 L2에 들어가므로 tiling의 이득이 작았습니다. 같은 코드도 L2가 작은 보드에서는 다르게 나옵니다.
- **PMU가 없으면 시뮬레이터로 상대 비교를 합니다.** Cachegrind의 기본 캐시는 실제 캐시가 아니므로 절대값이 아니라 변형 간 차이를 봅니다.
- **transpose 비용을 포함합니다.** BT 4 MiB가 추가로 필요하고(합계 16 MiB), transpose 시간(Mac 약 4 ms, VM 약 7 ms)은 위 시간에 이미 들어 있습니다.

측정 소스 `matmul.c`의 여섯 변형은 위 코드 조각을 모은 것이며, 빌드는 `clang -O2`(Mac), `gcc -O2`(VM)입니다.

다음 사례에서는 [worker 간 lock 경합](/blog/embedded/performance-engineering/part6-03-case-lock-contention)을 조사합니다.

## 관련 항목

- [6-01: ISR Latency 사례](/blog/embedded/performance-engineering/part6-01-case-isr-latency)
- [6-03: Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [2-06: Cache Miss와 영향](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
