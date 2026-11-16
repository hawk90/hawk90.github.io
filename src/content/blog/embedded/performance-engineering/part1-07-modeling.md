---
title: "성능 모델링 — Amdahl·Gustafson·Roofline Model 적용"
slug: "embedded/performance-engineering/part1-07-modeling"
date: 2026-04-23T09:07:00
description: "최적화 한계를 예측하는 수학 모델. Serial 부분이 결정. Memory-bound vs Compute-bound."
series: "Embedded Performance Engineering"
seriesOrder: 7
tags: [amdahl, gustafson, roofline, operational-intensity]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **Serial 부분이 한계를 결정합니다** (Amdahl). **Memory bandwidth가 한계가 됩니다** (Roofline).

## Amdahl의 법칙

**한 부분을 빠르게 해도 전체 개선은 *나머지 부분에 의해 제한*됩니다.** Gene Amdahl이 1967년 "Validity of the single-processor approach to achieving large scale computing capabilities"(AFIPS Conference Proceedings vol. 30, pp.483-485)에서 편 논증이고, 식으로는 John L. Gustafson의 "Reevaluating Amdahl's Law"가 정리한 형태로 많이 씁니다. Gustafson은 직렬 부분의 시간을 s, 병렬화할 수 있는 부분을 p(s + p = 1), 프로세서 수를 N으로 두고 Speedup = 1/(s + p/N)로 씁니다. 아래 식은 같은 식을 "가속할 수 있는 비율 P, 그 부분의 가속 S"로 일반화한 것입니다.

$$\text{Speedup} = \frac{1}{(1 - P) + \frac{P}{S}}$$

여기서 $P$는 병렬화(또는 최적화) 가능한 비율, $S$는 그 부분의 speedup입니다.

### 예

전체 100 ms 코드 중:
- 90 ms는 *병렬화가 가능합니다* (P = 0.9)
- 10 ms는 *serial입니다* (1 − P = 0.1)

병렬화로 *90ms → 0ms* ($S = \infty$)가 되어도 다음과 같습니다.

$$\text{Speedup} = \frac{1}{0.1 + \frac{0.9}{\infty}} = \frac{1}{0.1} = 10\times$$

**아무리 빠르게 해도 10× 가 한계**입니다. 코어를 100개 써도 S = 100이면 1/(0.1 + 0.009) = 9.17배입니다.

### 시사점

- *작은 serial 부분이 큰 영향*을 미칩니다.
- *최적화는 hot path*에 집중해야 합니다.
- Profiler로 *시간 사용 분포*를 먼저 확인합니다.

## Gustafson의 법칙 — 문제 크기가 함께 커질 때

Amdahl은 *고정 문제 크기*를 가정합니다. Gustafson은 같은 글에서, Sandia의 1024 프로세서 시스템에서는 프로세서를 늘릴 때 문제도 함께 키웠고 직렬 부분(벡터 startup, 프로그램 로딩, I/O 등)은 문제 크기와 함께 늘지 않았다고 적습니다. 병렬 시스템에서 잰 직렬·병렬 시간을 s′, p′(s′ + p′ = 1)라 하면, 같은 일을 직렬 프로세서는 s′ + p′N 시간에 하므로

$$\text{Scaled speedup} = s' + p' N = N + (1 - N)\, s'$$

입니다. 이 식은 s′에 대한 직선(기울기 1 − N)이고, Gustafson은 s = 0 근처에서 가파른 Amdahl 곡선보다 훨씬 완만하다고 적습니다. N에 대해서는 포화하지 않고 계속 커집니다.

임베디드에서 문제 크기가 고정인 경우(정해진 해상도의 프레임 하나를 deadline 안에 처리하는 경우 등)에는 Amdahl 쪽 가정이 맞습니다. 코어가 늘었을 때 같은 시간에 더 큰 일을 하는 경우(더 높은 해상도, 더 많은 채널)에는 Gustafson 쪽 가정이 맞습니다.

## Roofline Model

**Operational Intensity (OI)**, **Peak FLOPS**, **Memory Bandwidth**로 *상한선*을 결정합니다.

$$\text{OI} = \frac{\text{FLOP}}{\text{DRAM byte}}$$

Williams, Waterman, Patterson의 Roofline 논문(Berkeley 기술 보고서 UCB/EECS-2008-134, 2009년 *CACM*에 실림)은 operational intensity를 "operations per byte of DRAM traffic"으로 정의합니다. 여기서 byte는 캐시 계층을 거치고 남아 *주메모리로 가는* traffic입니다. 논문은 프로세서와 캐시 사이의 traffic을 재는 arithmetic intensity와 일부러 구분했다고 적습니다. 그래서 캐시 재사용이 좋아지면 같은 코드라도 OI가 올라갑니다. 같은 논문의 상한식은 다음과 같습니다.

$$\text{Attainable GFlops/s} = \min(\text{Peak FP Performance},\ \text{Peak Memory BW} \times \text{OI})$$

논문은 두 선이 코어마다 한 번 정해지는 것이지 kernel마다 정해지는 것이 아니라고 덧붙이고, peak memory bandwidth는 STREAM으로도 잴 수 있지만 이 논문은 직접 만든 단계별 최적화 microbenchmark로 지속 가능한 DRAM 대역폭을 쟀다고 적습니다.

### Roofline 그래프

![Roofline 모델 — memory roof와 compute roof, ridge point에서 bound 전환](/images/blog/perf-eng/diagrams/part1-07-roofline.svg)

알고리즘의 OI가 ridge point보다 작으면 **Memory-bound**입니다.
알고리즘의 OI가 ridge point 이상이면 **Compute-bound**입니다.

### 예 — STREAM Triad

```c
for (i = 0; i < N; i++)
    a[i] = b[i] + c[i] * d;
```

- `float` 원소 4 byte, 배열 `b`와 `c`에서 각각 한 번 읽고 `a`에 한 번 씁니다. 반복당 곱셈 하나, 덧셈 하나로 2 FLOP입니다.
- 배열이 캐시보다 훨씬 크면 재사용이 없으므로 DRAM traffic은 읽기 8 byte + 쓰기 4 byte = 12 byte이고, **OI = 2/12 ≈ 0.167 FLOP/byte**입니다.
- 쓰기 전에 `a`의 캐시 라인을 먼저 읽어 오는 캐시(write-allocate)라면 읽기가 4 byte 더 붙어 16 byte, OI = 0.125입니다. 어느 쪽인지는 코어의 캐시 정책에 달렸으므로 OI를 적을 때 가정도 함께 적습니다.

### 예 — Matrix Multiplication (Naive)

```c
for (i) for (j) for (k)
    C[i][j] += A[i][k] * B[k][j];
```

- 반복당 곱셈과 덧셈으로 2 FLOP이고, n×n 행렬이면 전체 2n³ FLOP입니다.
- 캐시가 무한히 커서 세 행렬을 한 번씩만 DRAM에서 오간다면 traffic은 4 byte × 3n² 정도이고 OI는 n/6으로 n에 비례해 커집니다. 반대로 캐시가 `B`의 열 하나도 담지 못하면 매 반복 `B[k][j]`가 든 캐시 라인을 DRAM에서 다시 가져오므로, 64 byte 라인이면 OI가 2/64 ≈ 0.03까지 떨어집니다.
- 실제 OI는 이 두 극단 사이 어딘가이고, blocking·tiling은 재사용을 늘려 OI를 위쪽 극단으로 끌어올립니다. 같은 코드의 OI가 캐시와 loop order로 바뀐다는 점이 Roofline 논문이 DRAM traffic을 기준으로 삼은 이유입니다.

### Roofline 활용

1. 알고리즘의 *OI를 계산*합니다.
2. CPU의 *peak FLOPS와 memory BW*를 확인합니다.
3. *Ridge point*와 비교해 bound를 식별합니다.
4. Memory-bound면 *cache, prefetch, blocking*을 활용합니다.
5. Compute-bound면 *SIMD, SMT, algorithm 개선*을 시도합니다.

## Little's Law

$$L = \lambda \cdot W$$

여기서 $L$은 평균 in-system 수, $\lambda$는 도착률, $W$는 평균 system 시간입니다.

*concurrency 한계*를 분석할 때 활용합니다.

메모리 시스템에 적용하면, 대역폭 BW를 latency W 동안 유지하려면 그 시간 동안 BW × W byte가 동시에 진행 중이어야 합니다.

$$\text{Bytes-in-flight} = \text{BW} \cdot \text{latency}$$

예를 들어 10 GB/s를 100 ns latency로 유지하려면 1,000 byte, 64 byte 캐시 라인으로 약 16개의 요청이 동시에 나가 있어야 합니다. 코어 하나가 동시에 낼 수 있는 miss 요청 수가 이보다 적으면 그 코어 혼자서는 이 대역폭에 도달할 수 없습니다. 1-02의 `chase` 측정(IPC 0.11)은 한 번에 요청 하나만 나가는 극단입니다.

## Universal Scalability Law (USL)

Neil J. Gunther가 1993년 CMG 학회 논문 "A Simple Capacity Model of Massively Parallel Transaction Systems"에서 처음 제시했습니다([Gunther의 USL 페이지](http://www.perfdynamics.com/Manifesto/USLscalability.html)). Amdahl 식에 coherency 항을 더한 모델입니다.

$$C(N) = \frac{N}{1 + \alpha(N-1) + \beta N(N-1)}$$

같은 페이지는 $\alpha$를 공유 자원을 기다리는 contention, $\beta$를 데이터가 일관된 상태가 되기까지의 지연인 coherency의 비례 계수로 설명합니다. $\beta = 0$이면 Amdahl 식과 같은 모양이 되어 $1/\alpha$에 점근합니다. $\beta > 0$이면 분모의 N² 항 때문에 어느 N을 넘으면 C(N)이 오히려 줄어듭니다. 식을 미분해 보면 최대점은 $N^* = \sqrt{(1-\alpha)/\beta}$입니다.

## 임베디드 — Cycle Budgeting

168 MHz Cortex-M4에서 1 ms 주기 task라면 한 주기는 168,000 cycle입니다. 이 예산을 구성 요소로 나누고, 각 칸에 상한의 근거를 적습니다.

| 구성 요소 | cycle | 근거 |
|---|---:|---|
| 인터럽트 진입 | 12 | Cortex-M4 TRM(DDI 0439B) 3.9.1, wait state 없는 메모리 기준 최대값 |
| 인터럽트 복귀 | 12 | 같은 절 |
| 센서 읽기 | TBD | 버스 클럭과 주변장치 데이터시트, 또는 DWT 측정 |
| 제어 계산 | TBD | static 분석 상한, 또는 DWT 측정 최대(보장 아님) |
| 출력 | TBD | 주변장치 데이터시트 |
| 합계 | ≤ 168,000 | |

TBD 칸은 이 글에서 보드로 재지 않았기 때문에 비워 두었습니다. 예산표의 가치는 빈칸이 어디인지 보여 주는 데 있습니다.

## Speedup Saturation — 실측

Amdahl과 USL이 말하는 포화를 M2 Pro(P코어 8개, E코어 4개)에서 직접 보았습니다. 같은 총 작업을 T개 thread로 나누는 프로그램 두 개입니다(`bench/scale.c`, `clang -O2`, T마다 5회의 중앙값). `cpu`는 메모리를 거의 쓰지 않는 정수 해시 루프 20억 번, `mem`은 1 GiB `uint64_t` 배열 합입니다. 측정 동안 호스트에서는 다른 VM들이 돌고 있었고 load average가 7.6~20이었습니다. 두 번 돌린 결과를 나란히 적습니다.

| T | `cpu` 1회차 | `cpu` 2회차 | `mem` 1회차 | `mem` 2회차 |
|---:|---:|---:|---:|---:|
| 1 | 3,096 ms | 3,069 ms | 47.9 ms | 21.9 ms |
| 2 | 1,573 ms | 1,553 ms | 17.3 ms | 18.5 ms |
| 4 | 861 ms | 924 ms | 13.3 ms | 15.2 ms |
| 8 | 954 ms | 505 ms | 12.8 ms | 13.7 ms |
| 12 | 481 ms | 503 ms | 10.6 ms | 17.3 ms |

`cpu`는 T = 2에서 두 번 모두 2.0배, T = 4에서 3.3~3.6배로 거의 선형입니다. T = 8부터는 다른 VM과 코어를 나눠 쓰고 P·E 코어가 섞이면서 실행마다 흔들립니다. `mem`은 T = 2~4에서 이미 13~18 ms 근처에 머물고, 그 뒤로는 thread를 늘려도 줄지 않습니다. 1 GiB를 10.6 ms에 읽은 것은 약 101 GB/s이고, 여기서 더 빨라지지 않는 것은 코어가 아니라 메모리 쪽이 한계이기 때문입니다. 이 측정은 부하가 걸린 호스트에서 한 것이라 곡선에 USL 계수를 맞추지는 않았습니다.

## 자주 하는 실수

> ⚠️ 모든 작업 병렬화 가정

Amdahl 법칙에서 작은 serial 부분이 한계를 결정합니다. *측정 후 분포 확인*이 필요합니다.

> ⚠️ Memory-bound 코드를 CPU 최적화

위 `mem` 측정에서 thread를 4개에서 12개로 늘려도 시간이 거의 줄지 않았습니다. Roofline의 memory roof 아래에 있는 코드는 연산을 빠르게 해도 상한이 그대로이므로, 재사용을 늘려 DRAM traffic을 줄입니다.

> ⚠️ Roofline 무시

알고리즘 OI를 모르면 *어디에 최적화 노력*을 들일지 알 수 없습니다.

> ⚠️ Multicore 무조건 scale

같은 M2 Pro에서도 계산 위주 작업은 4 thread까지 거의 선형이었고, 메모리 위주 작업은 2~4 thread에서 이미 멈췄습니다. 몇 코어에서 포화하는지는 작업의 종류가 정하므로, thread 수를 바꿔 가며 직접 잽니다.

## 정리

- **Amdahl**: $\text{Speedup} = 1 / ((1-P) + P/S)$ — serial 부분이 한계가 됩니다.
- **Gustafson**: 문제 크기가 프로세서 수와 함께 커지면 scaled speedup = N + (1 − N)s′입니다.
- **Roofline**: OI는 DRAM byte당 연산이고, 상한은 min(peak FP, BW × OI)입니다.
- **Little's Law**: BW × latency = bytes in flight입니다.
- **USL**: β > 0이면 $N^* = \sqrt{(1-\alpha)/\beta}$를 넘어서 오히려 느려집니다.
- M2 Pro에서 계산 위주 작업은 4 thread까지 거의 선형, 1 GiB 배열 합은 2~4 thread에서 포화했습니다.
- 임베디드에서는 *cycle budget*에 칸마다 근거를 적어 빈칸을 드러냅니다.

다음 편은 **프로파일링 개요**입니다. Sampling과 Instrumentation을 비교합니다.

## 관련 항목

- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [1-08: 프로파일링 개요](/blog/embedded/performance-engineering/part1-08-profiling-overview)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)

## 참고 자료

- S. Williams, A. Waterman, D. Patterson, [Roofline: An Insightful Visual Performance Model for Floating-Point Programs and Multicore Architectures](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.html), UCB/EECS-2008-134
- John L. Gustafson, [Reevaluating Amdahl's Law](http://www.johngustafson.net/pubs/pub13/amdahl.htm)
- Neil J. Gunther, [Universal Scalability Law](http://www.perfdynamics.com/Manifesto/USLscalability.html)
- Cortex-M4 Technical Reference Manual (DDI 0439B) 3.9.1
