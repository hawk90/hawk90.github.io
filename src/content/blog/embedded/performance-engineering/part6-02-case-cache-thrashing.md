---
title: "사례 분석 — 행렬 곱 성능과 메모리 접근 패턴"
slug: "embedded/performance-engineering/part6-02-case-cache-thrashing"
date: 2026-04-28T09:01:00
description: "1024×1024 행렬 곱 사례로 SIMD와 메모리 접근 패턴을 점검하는 절차를 설명합니다. 측정 표는 재현된 보드 결과가 아닌 계산 예시입니다."
series: "Embedded Performance Engineering"
seriesOrder: 51
tags: [case-study, cache, thrashing, tiling, layout]
topics: ["embedded"]
---

## 한 줄 요약

> **"같은 행렬 곱에서도 데이터 접근 패턴은 실행 시간에 영향을 줍니다. 개선량은 타깃에서 측정합니다."**

## 증상 — 보고된 문제

이미지 처리 파이프라인에서 1024×1024 float matrix multiply가 예상보다 한참 느리다는 보고가 들어왔습니다.

HW·perf 출력·단계별 시간이 원시 기록과 함께 제공되지 않아 이 장은 재현된 보드 사례가 아니라 설명용 시나리오입니다. NEON 조각은 타깃에서 빌드·측정하지 않았습니다.

```text
HW: Cortex-A72 quad-core, 1.8 GHz, L1D 32 KB, L2 1 MB
워크로드: C = A × B, 모두 1024×1024 float (4 MB each)
연산량: 2 × 1024³ = 2,147,483,648 FLOP ≈ 2.15 GFLOP
가정한 지속 처리량: 15 GFLOP/s (가정값, 기기 peak 사양이 아님)
       → 2.15 GFLOP / 15 GFLOP/s ≈ 0.143 초

시간 비교용 사례 값: 1.4 초 (원시 측정 기록이 없어 실측으로 확인되지 않음)
```

여기서 15 GFLOP/s는 원문의 `2.1 GFLOPS × 1.8 GHz × 4 core` 식에서 나온 값이 아닙니다. 이미 초당 연산량 단위인 GFLOP/s에 클럭을 다시 곱할 수 없습니다. 처리량 가정과 실제 벤치마크는 따로 확인해야 합니다.

알고리즘은 교과서 그대로의 삼중 루프였습니다.

```c
void matmul(float *A, float *B, float *C, int N)
{
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            float sum = 0;
            for (int k = 0; k < N; k++) {
                sum += A[i * N + k] * B[k * N + j];
            }
            C[i * N + j] = sum;
        }
    }
}
```

## 가설 1 — SIMD 미사용

가장 먼저 의심한 것은 컴파일러가 NEON SIMD를 활용하지 못했을 가능성이었습니다. FP32 NEON은 벡터당 4개 lane을 다루지만 실행 시간의 4배 개선을 보장하지는 않습니다.

```bash
# 어셈블리 확인
arm-linux-gnueabihf-objdump -d matmul.o | grep -E 'vmla\.f32|vld1\.32|vldr'
# AArch32 후보 명령; 전체 루프와 compiler vectorization report를 함께 확인
```

아래 명령은 해당 타깃의 disassembly를 확인하는 예시입니다. 원래 출력에는 툴체인·컴파일 옵션·대상 object가 없어 SIMD 미사용을 확인한 결과로 볼 수 없습니다.

```c
float32x4_t acc = vdupq_n_f32(0.0f);
for (int k = 0; k < N; k += 4) {
    float32x4_t va = vld1q_f32(&A[i * N + k]);
    float32x4_t vb = (float32x4_t){B[k * N + j], B[(k + 1) * N + j],
                                   B[(k + 2) * N + j], B[(k + 3) * N + j]};
    acc = vmlaq_f32(acc, va, vb);
}
float32x2_t pair = vadd_f32(vget_low_f32(acc), vget_high_f32(acc));
pair = vpadd_f32(pair, pair);
float sum = vget_lane_f32(pair, 0); /* AArch32 NEON horizontal reduction */
C[i * N + j] = sum;
```

이 조각은 N이 4의 배수인 경우의 AArch32 NEON 예시입니다. Intrinsic 모델은 [Arm ACLE Advanced SIMD 문서](https://developer.arm.com/documentation/101028/0009/Advanced-SIMD--Neon--intrinsics)에 설명되어 있습니다. 실제 타깃 컴파일·성능 측정은 하지 않았습니다.

원문에 적힌 1.4초 → 1.0초는 설명용 가정값입니다. 이를 바탕으로 NEON의 실측 효과나 예상 성능을 결론내릴 수 없습니다.

**가설 1 미검증**: 대상 binary의 vectorization report와 실행 측정이 필요합니다.

## 가설 2 — Cache miss 폭주

다음으로 cache miss를 의심했습니다. `B[k * N + j]` 접근이 의심스러웠습니다. k가 1 증가할 때마다 메모리 주소가 `N * 4 = 4096 byte` 점프합니다. 한 cache line은 64 byte이므로 한 line당 element 하나만 쓰고 나머지는 버립니다.

```bash
perf stat -e cycles,instructions,L1-dcache-loads,L1-dcache-load-misses,\
LLC-loads,LLC-load-misses ./matmul

#  2,712,345,678   cycles
#  1,234,567,890   instructions          #    0.46  insn per cycle
#    345,678,901   L1-dcache-loads
#    312,345,678   L1-dcache-load-misses #   90.36% of all loads   ← !!
#     45,123,456   LLC-loads
#     23,456,789   LLC-load-misses       #   52.0%
```

이 표의 counters는 원시 출력이 없어 검증되지 않았습니다. 코드에서 column-stride 접근이 발생하는 것은 정적으로 확인할 수 있지만, target PMU의 miss rate나 IPC는 실행 측정이 필요합니다.

**원인 후보**: column-stride 접근은 locality를 떨어뜨릴 수 있으나, 이 예시의 실제 slowdown 원인이라고 확정하지 않습니다.

## 원인 — Column 순회의 비용

문제를 정리해 봅니다. C는 row-major 저장입니다. `B[k * N + j]`에서 inner loop가 k에 대해 도는데, k가 1 증가하면 주소는 한 행을 통째로 건너뜁니다.

1024×1024 크기의 `B` 행렬은 row-major이므로 메모리에 이렇게 놓입니다.

```text
B[0][j], B[0][j+1], ...   (64 byte 한 line)
B[1][j], B[1][j+1], ...
B[2][j], B[2][j+1], ...
```

inner loop가 k에 대해 돌면서 `B[k][j]`를 읽으면, 64 byte line과 FP32를 가정하면 한 번의 column 순회에서는 line의 16개 원소 중 하나만 사용합니다. 다음 열에서의 재사용과 실제 hit율은 cache의 associativity·교체 정책·prefetch·다른 배열 접근에 달려 있습니다.

게다가 L1D가 32 KB인데 B 한 column을 읽으려면 1024 line × 64 byte = 64 KB가 필요합니다. L1에 들어가지도 않습니다. L2(1 MB)에도 A와 B 두 행렬의 일부만 들어갑니다.

정적으로 확인할 locality 위험은 다음 두 가지입니다.

1. **Column 순회**: B 접근이 cache line 효율 1/16
2. **Working set 초과**: A·B·C 합치면 12 MB, L2(1 MB)에 안 들어감

## 해결 — Loop Tiling과 Transpose

표준 후보 해법은 B를 미리 transpose해 row-major 순회로 바꾸거나, loop tiling으로 작은 블록 단위로 곱셈을 분할하는 것입니다. 아래는 각각의 코드 예시이며 특정 보드에서 적용·측정했다는 뜻은 아닙니다.

**Step 1**: B를 transpose

```c
void transpose(float *B, float *BT, int N)
{
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            BT[j * N + i] = B[i * N + j];
}
```

이제 `B[k * N + j]`가 `BT[j * N + k]`로 바뀌고, inner loop가 k를 따라 BT의 한 행을 순차 접근합니다.

**Step 2**: Loop tiling (32×32 block)

```c
#define TILE 32

void matmul_tiled(float *A, float *BT, float *C, int N)
{
    for (int ii = 0; ii < N; ii += TILE) {
        for (int jj = 0; jj < N; jj += TILE) {
            for (int kk = 0; kk < N; kk += TILE) {
                /* TILE×TILE block multiply */
                int i_end = ii + TILE < N ? ii + TILE : N;
                int j_end = jj + TILE < N ? jj + TILE : N;
                int k_end = kk + TILE < N ? kk + TILE : N;
                for (int i = ii; i < i_end; i++) {
                    for (int j = jj; j < j_end; j++) {
                        float sum = kk == 0 ? 0.0f : C[i * N + j];
                        for (int k = kk; k < k_end; k++) {
                            sum += A[i * N + k] * BT[j * N + k];
                        }
                        C[i * N + j] = sum;
                    }
                }
            }
        }
    }
}
```

32×32 float 배열 하나는 4 KiB입니다. 실제 tile working set에는 A, BT, C 조각과 다른 데이터도 포함되므로 L1 적합 여부는 타깃 cache와 loop 구현으로 확인해야 합니다. 이 코드의 입력·출력 범위 처리는 N이 TILE의 배수가 아니어도 동작하도록 했습니다.

**Step 3**: NEON SIMD 적용

Tiling 후 inner loop는 32 element를 연속 접근하므로 vectorize가 자연스럽습니다.

```c
float32x4_t vsum = vdupq_n_f32(0.0f);
for (int k = kk; k + 4 <= k_end; k += 4) {
    float32x4_t va = vld1q_f32(&A[i * N + k]);
    float32x4_t vb = vld1q_f32(&BT[j * N + k]);
    vsum = vmlaq_f32(vsum, va, vb);
}
/* 수평 합산과 남은 원소 처리는 타깃 ABI에 맞춰 이어 붙여야 합니다. */
```

위 NEON 조각은 누산 초기화와 경계 조건을 보여 주는 부분 코드입니다. 수평 합산과 scalar tail을 포함한 완성 함수로 검증한 예제는 아닙니다.

## 검증 — Before / After

다음 수치는 설명용 시나리오 표이며, 원시 결과·compiler flags·실행 환경이 없어 측정치로 검증되지 않았습니다.

| 단계 | 실행 시간 | L1 miss rate | IPC | GFLOPS |
|---|---|---|---|---|
| Original | 1400 ms | 90% | 0.46 | 1.5 |
| + NEON | 1000 ms | 90% | 0.65 | 2.1 |
| + Transpose | 350 ms | 25% | 1.40 | 6.1 |
| + Tiling | 180 ms | 8% | 2.10 | 11.9 |
| + Tiling + NEON | 140 ms | 6% | 2.85 | 15.3 |

표 안의 시간과 counter가 맞다는 가정 아래 단계별 차이를 비교하는 예시입니다. transpose·tiling·NEON의 개선량은 타깃 측정 전에는 단정할 수 없습니다.

표의 15.3 GFLOP/s는 가정한 지속 처리량 15 GFLOP/s와 비슷하지만, 이 수치나 앞의 실행 시간 모두 실측으로 확인되지 않았습니다.

## 교훈

이번 사례의 핵심 교훈을 정리합니다.

- **연산량과 접근 패턴을 함께 봅니다**. O(N³)은 연산량 증가를 설명하지만 cache 비용과 실제 실행 시간을 결정하지 않습니다. 순회 변경의 개선 배수는 측정해야 합니다.
- **SIMD와 데이터 배치를 함께 봅니다**. 벡터화만으로 얻는 이득은 접근 패턴, 코어, 컴파일러, 데이터 크기에 따라 달라집니다. 보편적인 개선 상한은 없습니다.
- **cache counter는 타깃에서 해석합니다**. 이벤트 이름과 의미는 PMU에 따라 다르며, 하나의 miss율 임계값으로 정상/비정상을 단정하지 않습니다.
- **Working set이 cache 크기를 넘으면 tiling**. 데이터 전체를 L1에 못 넣으면 작은 블록으로 잘라 한 블록을 끝낸 뒤 다음으로 넘어가는 것이 표준입니다. Matrix multiply, FFT, convolution, image filter 모두 같은 패턴입니다.
- **Transpose 비용을 포함합니다**. 이 예시는 BT에 4 MiB를 추가해 A·B·C·BT가 총 16 MiB를 차지합니다. 원래 A·B·C의 12 MiB 대비 1/3 증가이며, transpose 시간과 재사용 횟수를 포함해 이득을 비교합니다.
- **IPC는 보조 지표입니다**. 실행 시간, 이벤트 정의, workload와 함께 비교하며 특정 IPC 값만으로 CPU 활용 상태를 판정하지 않습니다.

가장 큰 교훈은 첫 가설이 부분적으로만 맞을 수 있다는 점입니다. SIMD와 locality 가설을 각각 compiler output, counter, end-to-end runtime으로 검증해야 합니다. 이 시나리오에는 그 원시 증거가 없습니다.

다음 사례에서는 [worker 간 lock 경합](/blog/embedded/performance-engineering/part6-03-case-lock-contention)을 조사합니다.

## 관련 항목

- [6-01: ISR Latency 사례](/blog/embedded/performance-engineering/part6-01-case-isr-latency)
- [6-03: Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [2-06: Cache Miss와 영향](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
