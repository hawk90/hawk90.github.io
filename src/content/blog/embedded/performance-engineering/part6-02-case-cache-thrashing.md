---
title: "6-02: 사례 — Matrix Multiply가 예상의 10배 느린 이유"
date: 2026-05-08T31:00:00
description: "1024×1024 matrix multiply가 이론값의 10배 느렸다. SIMD부터 의심했지만 진짜 범인은 캐시 미스 90%였다."
series: "Embedded Performance Engineering"
seriesOrder: 51
tags: [case-study, cache, thrashing, tiling, layout]
---

## 한 줄 요약

> **"알고리즘이 같아도 데이터 접근 패턴이 다르면 10배의 성능 차이가 납니다."**

## 증상 — 보고된 문제

이미지 처리 파이프라인에서 1024×1024 float matrix multiply가 예상보다 한참 느리다는 보고가 들어왔습니다.

```text
HW: Cortex-A72 quad-core, 1.8 GHz, L1D 32 KB, L2 1 MB
워크로드: C = A × B, 모두 1024×1024 float (4 MB each)
이론값: 2.1 GFLOPS × 1.8 GHz × 4 core ≈ 15 GFLOPS
       → 1024^3 × 2 / 15e9 ≈ 0.14 초 예상

실측: 1.4 초 — 이론의 10배 느림
```

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

가장 먼저 의심한 것은 컴파일러가 NEON SIMD를 활용하지 못했을 가능성이었습니다. Float 연산이 scalar로만 돌면 4배 손해입니다.

```bash
# 어셈블리 확인
arm-linux-gnueabihf-objdump -d matmul.o | grep -E 'fmla|vld1'
# fmla 명령 거의 없음, scalar fmul만
```

SIMD가 안 들어가는 것은 사실이었습니다. `-O3 -ftree-vectorize -mfpu=neon`을 추가하고 inner loop를 vectorize 가능하게 살짝 재작성했습니다.

```c
for (int k = 0; k < N; k += 4) {
    float32x4_t va = vld1q_f32(&A[i * N + k]);
    float32x4_t vb = {B[k * N + j], B[(k+1) * N + j],
                      B[(k+2) * N + j], B[(k+3) * N + j]};
    sum = vmlaq_f32(sum, va, vb);
}
```

측정 결과 1.4 초 → 1.0 초. 30% 개선만 있었습니다. 4배를 기대했는데 한참 모자랐습니다.

**가설 1 부분 성공이지만 주범 아님**: 다른 원인이 더 큽니다.

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

L1 miss rate 90%. 거의 모든 load가 캐시를 빗나가고 있었습니다. IPC 0.46도 stall로 명령어가 거의 진행되지 못함을 보여 줍니다.

**가설 2 확정**: cache thrashing이 진짜 원인입니다.

## 원인 — Column 순회의 비용

문제를 정리해 봅니다. C는 row-major 저장입니다. `B[k * N + j]`에서 inner loop가 k에 대해 도는데, k가 1 증가하면 주소는 한 행을 통째로 건너뜁니다.

```text
B 행렬 (row-major, 1024×1024):

  B[0][j], B[0][j+1], ... (64 byte 한 line)
  B[1][j], B[1][j+1], ...
  B[2][j], B[2][j+1], ...

inner loop가 k에 대해 돌면서 B[k][j]를 읽으면
→ 한 cache line에서 B[k][j] 1 element만 사용
→ 다음 k에서 또 다른 line fetch
→ cache hit 거의 0
```

게다가 L1D가 32 KB인데 B 한 column을 읽으려면 1024 line × 64 byte = 64 KB가 필요합니다. L1에 들어가지도 않습니다. L2(1 MB)에도 A와 B 두 행렬의 일부만 들어갑니다.

원인은 두 가지로 압축됩니다.

1. **Column 순회**: B 접근이 cache line 효율 1/16
2. **Working set 초과**: A·B·C 합치면 12 MB, L2(1 MB)에 안 들어감

## 해결 — Loop Tiling과 Transpose

표준 해법은 두 가지입니다. B를 미리 transpose해 row-major 순회로 바꾸거나, loop tiling으로 작은 블록 단위로 곱셈을 분할하는 것입니다. 두 가지를 모두 적용했습니다.

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
                for (int i = ii; i < ii + TILE; i++) {
                    for (int j = jj; j < jj + TILE; j++) {
                        float sum = C[i * N + j];
                        for (int k = kk; k < kk + TILE; k++) {
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

32×32 float block은 4 KB로 L1D에 여유 있게 들어갑니다. 한 번 가져온 block을 여러 번 재사용하므로 cache hit rate가 극적으로 올라갑니다.

**Step 3**: NEON SIMD 적용

Tiling 후 inner loop는 32 element를 연속 접근하므로 vectorize가 자연스럽습니다.

```c
for (int k = kk; k + 4 <= kk + TILE; k += 4) {
    float32x4_t va = vld1q_f32(&A[i * N + k]);
    float32x4_t vb = vld1q_f32(&BT[j * N + k]);
    vsum = vmlaq_f32(vsum, va, vb);
}
```

## 검증 — Before / After

각 단계의 효과를 측정했습니다.

| 단계 | 실행 시간 | L1 miss rate | IPC | GFLOPS |
|---|---|---|---|---|
| Original | 1400 ms | 90% | 0.46 | 1.5 |
| + NEON | 1000 ms | 90% | 0.65 | 2.1 |
| + Transpose | 350 ms | 25% | 1.40 | 6.1 |
| + Tiling | 180 ms | 8% | 2.10 | 11.9 |
| + Tiling + NEON | 140 ms | 6% | 2.85 | 15.3 |

처음 시도한 NEON만 했을 때는 30% 개선. 진짜 효과는 데이터 접근 패턴을 바꿨을 때 나왔습니다. Transpose만으로도 4배, tiling을 추가해 8배, NEON까지 더해 10배의 개선이 있었습니다.

이론값 15 GFLOPS에 도달했습니다.

## 교훈

이번 사례의 핵심 교훈을 정리합니다.

- **알고리즘 < 데이터 접근 패턴**. 같은 O(N³) 알고리즘이라도 cache friendly한 순회가 10배 차이를 만듭니다. 알고리즘 복잡도 분석은 메모리가 free이고 latency가 균일하다는 가정 위에 서 있으며, 현실은 그렇지 않습니다.
- **SIMD는 cache friendly 위에 얹어야 한다**. Cache miss가 90%인 상태에서 SIMD를 적용해도 효과가 미미합니다. CPU는 메모리를 기다리느라 idle이고, SIMD unit도 같이 idle합니다. Memory bound 코드에서 SIMD는 30% 정도가 한계입니다.
- **L1 miss rate를 첫 지표로**. `perf stat -e L1-dcache-loads,L1-dcache-load-misses` 한 줄이 진짜 병목을 빨리 짚어 줍니다. 5% 이하가 정상이고, 30%를 넘으면 즉시 데이터 레이아웃 점검 대상입니다.
- **Working set이 cache 크기를 넘으면 tiling**. 데이터 전체를 L1에 못 넣으면 작은 블록으로 잘라 한 블록을 끝낸 뒤 다음으로 넘어가는 것이 표준입니다. Matrix multiply, FFT, convolution, image filter 모두 같은 패턴입니다.
- **Transpose도 한 옵션**. 메모리 사용량이 2배 늘지만, 한 번 transpose하고 여러 번 곱하는 워크로드라면 이득이 분명합니다.
- **IPC가 진짜 지표**. 실행 시간이 줄었는지보다 "사이클당 얼마나 일했는지"가 본질입니다. IPC 2.0 이상이면 CPU를 잘 활용하고 있다는 신호입니다.

가장 큰 교훈은 첫 가설이 부분적으로만 맞을 수 있다는 점입니다. SIMD가 의심됐고 실제로 일부 효과도 있었지만, 진짜 병목은 그 뒤에 가려져 있었습니다. 측정 없이 한 단계의 가설로 끝내면 90%를 놓칩니다.

## 관련 항목

- [6-01: ISR Latency 사례](/blog/embedded/performance-engineering/part6-01-case-isr-latency)
- [6-03: Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [2-06: Cache Miss와 영향](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
