---
title: "성능 모델링 — Amdahl·Gustafson·Roofline Model 적용"
date: 2026-04-23T09:07:00
description: "최적화 한계를 예측하는 수학 모델. Serial 부분이 결정. Memory-bound vs Compute-bound."
series: "Embedded Performance Engineering"
seriesOrder: 7
tags: [amdahl, gustafson, roofline, operational-intensity]
draft: false
---

## 한 줄 요약

> **Serial 부분이 한계를 결정합니다** (Amdahl). **Memory bandwidth가 한계가 됩니다** (Roofline).

## Amdahl의 법칙 (1967)

**한 부분을 빠르게 해도 전체 개선은 *나머지 부분에 의해 제한*됩니다.**

$$\text{Speedup} = \frac{1}{(1 - P) + \frac{P}{S}}$$

여기서 $P$는 병렬화(또는 최적화) 가능한 비율, $S$는 그 부분의 speedup입니다.

### 예

전체 100 ms 코드 중:
- 90 ms는 *병렬화가 가능합니다* (P = 0.9)
- 10 ms는 *serial입니다* (P = 0.1)

병렬화로 *90ms → 0ms* ($S = \infty$)가 되어도 다음과 같습니다.

$$\text{Speedup} = \frac{1}{0.1 + \frac{0.9}{\infty}} = \frac{1}{0.1} = 10\times$$

**아무리 빠르게 해도 10× 가 한계**입니다. 100 코어를 써도 마찬가지입니다.

### 시사점

- *작은 serial 부분이 큰 영향*을 미칩니다.
- *최적화는 hot path*에 집중해야 합니다.
- Profiler로 *시간 사용 분포*를 먼저 확인합니다.

## Gustafson의 법칙 (1988) — Amdahl 보완

Amdahl은 *고정 문제 크기*를 가정합니다. 실제로는 *큰 컴퓨터엔 큰 문제*가 주어집니다.

$$\text{Speedup} = S - P \cdot (S - 1) = 1 + P \cdot (S - 1)$$

문제가 *N배 커지면* parallel 부분도 N배가 되어 *효과적 speedup이 커집니다*.

HPC와 과학계산에 적용됩니다. 임베디드에서는 문제 크기가 고정이라 *Amdahl이 우세*합니다.

## Roofline Model

**Operational Intensity (OI)**, **Peak FLOPS**, **Memory Bandwidth**로 *상한선*을 결정합니다.

$$\text{OI} = \frac{\text{FLOP}}{\text{byte loaded}}$$

각 알고리즘이 *1 byte memory access마다 몇 FLOP*을 하는지 나타냅니다.

### Roofline 그래프

![Roofline 모델 — memory roof와 compute roof, ridge point에서 bound 전환](/images/blog/perf-eng/diagrams/part1-07-roofline.svg)

알고리즘의 OI가 ridge point보다 작으면 **Memory-bound**입니다.
알고리즘의 OI가 ridge point 이상이면 **Compute-bound**입니다.

### 예 — STREAM Triad

```c
for (i = 0; i < N; i++)
    a[i] = b[i] + c[i] * d;
```

- 3 byte load와 1 byte store (assuming 1 byte per element)
- 2 FLOP (mul + add)
- **OI = 2/16 = 0.125 FLOP/byte** (assuming float = 4 byte, total 16 byte/iter)

Memory-bound입니다. 더 빠른 CPU는 의미가 없습니다. **메모리 BW를 늘리거나** *cache locality*를 개선해야 합니다.

### 예 — Matrix Multiplication (Naive)

```c
for (i) for (j) for (k)
    C[i][j] += A[i][k] * B[k][j];
```

- 2 byte load + 1 store = 3 byte
- 2 FLOP
- **OI = 2/12 = 0.17 (cold cache)**

Naive matmul도 memory-bound입니다. **Blocking·tiling**으로 OI를 키우면 compute-bound 영역으로 옮길 수 있습니다.

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

$$\text{Bytes-in-flight} = \text{BW} \cdot \text{latency} = 10\ \text{GB/s} \cdot 100\ \text{ns} = 1000\ \text{byte}$$

DRAM access latency 100 ns 동안 *1 KB pipeline을 채워야* 최대 BW에 도달합니다.

## Universal Scalability Law (USL)

Neil Gunther가 제안했습니다. Amdahl에 *coherency cost*를 추가한 모델입니다.

$$C(N) = \frac{N}{1 + \alpha(N-1) + \beta N(N-1)}$$

여기서 $\alpha$는 contention, $\beta$는 coherency입니다.

- $\alpha$가 큰 시스템은 적은 코어에서 plateau에 도달합니다.
- $\beta$가 큰 시스템은 적정 코어 수를 넘으면 *역효과 (negative scalability)*가 발생합니다.

**Multicore는 무한히 scale되지 않습니다.** Optimal core count가 존재합니다.

## 임베디드 — Cycle Budgeting

```text
1 ms PID @ 168 MHz Cortex-M4:
Total cycles: 168,000

Allocation:
- ISR latency: 200 cycle (0.1%)
- Sensor read: 30,000 cycle (18%)
- PID compute: 5,000 cycle (3%)
- Filter: 10,000 cycle (6%)
- Actuator write: 5,000 cycle (3%)
Used: 50,200 cycle (30%)
Free: 117,800 cycle (70%)
```

각 컴포넌트에 *cycle budget*을 할당하고, 초과 시 *해당 컴포넌트를 최적화*합니다.

## Speedup Saturation

Multi-core 임베디드 (Cortex-A SMP)에서는 다음과 같습니다.

```text
1 core: 100 ms
2 core: 60 ms (1.67× — 좋음)
4 core: 40 ms (2.5× — 감소)
8 core: 35 ms (2.86× — 거의 한계)
```

Cache와 bus contention 증가로 diminishing returns가 나타납니다.

## 인터프리터 모델

Performance = *Best of (memory, compute, control)*.

각 path가 *독립적 maximum*을 가집니다. 한 path가 saturate 되어도 다른 path는 *idle*일 수 있습니다.

OoO CPU의 *ILP, MLP, TLP*가 이걸 활용합니다.

## 자주 하는 실수

> ⚠️ 모든 작업 병렬화 가정

Amdahl 법칙에서 작은 serial 부분이 한계를 결정합니다. *측정 후 분포 확인*이 필요합니다.

> ⚠️ Memory-bound 코드를 CPU 최적화

Cache miss가 90% 시간을 차지하면 SIMD나 intrinsics는 의미가 없습니다. *DRAM access를 줄여야* 합니다.

> ⚠️ Roofline 무시

알고리즘 OI를 모르면 *어디에 최적화 노력*을 들일지 알 수 없습니다.

> ⚠️ Multicore 무조건 scale

USL의 coherency cost 때문에 *2-4 core에서 plateau*가 흔합니다.

## 정리

- **Amdahl**: $\text{Speedup} = 1 / ((1-P) + P/S)$ — serial 부분이 한계가 됩니다.
- **Gustafson**: 문제 크기 scaling 시 더 낙관적입니다.
- **Roofline**: OI, peak FLOPS, memory BW로 bound를 식별합니다.
- **Little's Law**: BW × latency = bytes in flight입니다.
- **USL**: Multicore의 coherency cost로 무한 scale은 불가능합니다.
- 임베디드에서는 *cycle budget*으로 컴포넌트를 관리합니다.

다음 편은 **프로파일링 개요**입니다. Sampling과 Instrumentation을 비교합니다.

## 관련 항목

- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [1-08: 프로파일링 개요](/blog/embedded/performance-engineering/part1-08-profiling-overview)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
