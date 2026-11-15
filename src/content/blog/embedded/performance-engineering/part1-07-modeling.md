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

$$\text{OI} = \frac{\text{FLOP}}{\text{byte transferred at a specified memory level}}$$

OI는 지정한 메모리 계층에서 전송되는 byte당 연산 수입니다. 재사용, write allocate, cache hit를 어떤 계층의 traffic으로 셌는지 명시해야 합니다.

### Roofline 그래프

![Roofline 모델 — memory roof와 compute roof, ridge point에서 bound 전환](/images/blog/perf-eng/diagrams/part1-07-roofline.svg)

알고리즘의 OI가 ridge point보다 작으면 **Memory-bound**입니다.
알고리즘의 OI가 ridge point 이상이면 **Compute-bound**입니다.

### 예 — STREAM Triad

```c
for (i = 0; i < N; i++)
    a[i] = b[i] + c[i] * d;
```

- `float` 원소 4 byte, 배열 `b`와 `c`에서 각각 한 번 읽고 `a`에 한 번 씁니다.
- 이 단순 모델은 반복당 12 byte traffic과 2 FLOP으로 **OI = 2/12 ≈ 0.167 FLOP/byte**를 가정합니다.
- 실제 DRAM traffic은 cache 재사용, write allocate, 배열 배치와 측정 계층에 따라 달라집니다. 그 가정에서 Roofline의 memory roof 아래라면 memory-bound로 분류합니다. 이때도 compute 최적화가 무의미하다고 단정하지 않습니다.

### 예 — Matrix Multiplication (Naive)

```c
for (i) for (j) for (k)
    C[i][j] += A[i][k] * B[k][j];
```

- 반복당 산술 연산은 보통 곱셈과 덧셈 2 FLOP으로 셉니다.
- DRAM byte 수는 행렬 원소 형식, cache 상태, loop order, 재사용에 따라 달라지므로 이 코드만으로 고정 OI를 정할 수 없습니다.
- Blocking·tiling은 데이터 재사용을 높여 지정 계층의 traffic을 줄일 수 있습니다. 실제 bound는 측정된 traffic과 해당 시스템의 roof로 판단합니다.

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

가정한 10 GB/s와 100 ns의 곱은 1000 byte입니다. 이는 그 대역폭을 latency 동안 유지하기 위한 대략적인 동시 in-flight 데이터 양이며, 실제 요구량은 측정 단위와 프로토콜 overhead에 달려 있습니다.

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

수치는 allocation을 보여주는 가정 예시이며 실제 측정이 아닙니다. 실제 target에서는 component별 budget과 분석 근거를 요구사항에 맞춰 정합니다.

## Speedup Saturation

Multi-core 임베디드 (Cortex-A SMP)에서는 다음과 같습니다.

```text
1 core: 100 ms
2 core: 60 ms (1.67× — 좋음)
4 core: 40 ms (2.5× — 감소)
8 core: 35 ms (2.86× — 거의 한계)
```

이 수열은 scaling 저하를 보여주는 가상 예시입니다. 실제 scaling 원인은 profiling과 자원 계측으로 확인합니다.

## 인터프리터 모델

지정한 Roofline 모델에서 달성 가능한 성능은 compute roof와 bandwidth × operational intensity roof 중 더 낮은 값으로 제한됩니다.

모델을 확장해 control 및 다른 자원을 고려할 수 있지만, path가 독립적이거나 한 자원의 포화가 다른 자원을 idle 상태로 만든다고 일반화하지 않습니다.

OoO CPU의 *ILP, MLP, TLP*가 이걸 활용합니다.

## 자주 하는 실수

> ⚠️ 모든 작업 병렬화 가정

Amdahl 법칙에서 작은 serial 부분이 한계를 결정합니다. *측정 후 분포 확인*이 필요합니다.

> ⚠️ Memory-bound 코드를 CPU 최적화

데이터 이동이 병목이라는 증거가 있으면 먼저 재사용·배치를 조사하고, SIMD가 측정된 상한을 바꾸는지도 따로 평가합니다. *DRAM access를 줄여야* 합니다.

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

## 참고 자료

- [Williams, Waterman, and Patterson, Roofline model](https://escholarship.org/uc/item/5tz795vq)
