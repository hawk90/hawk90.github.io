---
title: "1-07: 성능 모델링 — Amdahl, Gustafson, Roofline"
date: 2026-05-12T07:00:00
description: "최적화 한계를 예측하는 수학 모델. Serial 부분이 결정. Memory-bound vs Compute-bound."
series: "Embedded Performance Engineering"
seriesOrder: 7
tags: [amdahl, gustafson, roofline, operational-intensity]
draft: true
---

## 한 줄 요약

> **"Serial 부분이 한계를 결정"** — Amdahl. **Memory bandwidth가 한계** — Roofline.

## Amdahl의 법칙 (1967)

**한 부분을 빠르게 해도 전체 개선은 *나머지 부분에 의해 제한***.

```
Speedup = 1 / ((1 - P) + P/S)

P = 병렬화 (또는 최적화) 가능한 비율
S = 그 부분의 speedup
```

### 예

전체 100 ms 코드 중:
- 90 ms는 *병렬화 가능* (P = 0.9)
- 10 ms는 *serial* (P = 0.1)

병렬화로 *90ms → 0ms* (S=∞):

```
Speedup = 1 / (0.1 + 0.9/∞) = 1 / 0.1 = 10×
```

**아무리 빠르게 해도 10× 한계**. 100 코어 써도.

### 시사점

- *작은 serial 부분이 큰 영향*
- *최적화는 hot path*에 집중
- Profiler로 *시간 사용 분포* 먼저 확인

## Gustafson의 법칙 (1988) — Amdahl 보완

Amdahl은 *고정 문제 크기* 가정. 실제로는 *큰 컴퓨터엔 큰 문제*.

```
Speedup = S - P × (S - 1)
       = 1 + (P × (S - 1))
```

문제가 *N배 커지면* parallel 부분도 N배 — *효과적 speedup 큼*.

→ HPC·과학계산에 적용. 임베디드에선 *Amdahl 우세* (문제 크기 고정).

## Roofline Model

**Operational Intensity (OI)** + **Peak FLOPS** + **Memory Bandwidth**로 *상한선* 결정.

```text
Operational Intensity = FLOP / byte loaded
```

각 알고리즘이 *1 byte memory access마다 몇 FLOP* 하는가.

### Roofline 그래프

```text
Performance (GFLOPS)
    ↑
Peak│         ━━━━━━━━━━━ Peak FLOPS (compute roof)
    │      ╱
    │   ╱
    │ ╱  Memory bandwidth (memory roof) = BW × OI
    └────────────────────→ OI (FLOP/byte)
```

알고리즘의 OI < ridge point → **Memory-bound**
알고리즘의 OI ≥ ridge point → **Compute-bound**

### 예 — STREAM Triad

```c
for (i = 0; i < N; i++)
    a[i] = b[i] + c[i] * d;
```

- 3 byte load·1 byte store (assuming 1 byte per element)
- 2 FLOP (mul + add)
- **OI = 2/16 = 0.125 FLOP/byte** (assuming float = 4 byte, total 16 byte/iter)

Memory-bound. 더 빠른 CPU 의미 없음. **메모리 BW 늘리기** 또는 *cache locality*.

### 예 — Matrix Multiplication (Naive)

```c
for (i) for (j) for (k)
    C[i][j] += A[i][k] * B[k][j];
```

- 2 byte load + 1 store = 3 byte
- 2 FLOP
- **OI = 2/12 = 0.17 (cold cache)**

Naive matmul도 memory-bound. **Blocking·tiling**으로 OI 증가 → compute-bound 영역으로.

### Roofline 활용

1. 알고리즘의 *OI 계산*
2. CPU의 *peak FLOPS + memory BW* 확인
3. *Ridge point*와 비교 → bound 식별
4. Memory-bound면 → *cache·prefetch·blocking*
5. Compute-bound면 → *SIMD·SMT·algorithm*

## Little's Law

```
L = λ × W
L = 평균 in-system 수, λ = 도착률, W = 평균 system 시간
```

응용 — *concurrency 한계*:

```text
Bandwidth: 10 GB/s
Latency: 100 ns

Bytes-in-flight = 10 GB/s × 100 ns = 1000 byte
```

DRAM access latency 100 ns 동안 *1 KB pipeline 채워야* 최대 BW.

## Universal Scalability Law (USL)

Neil Gunther. Amdahl의 *coherency cost* 추가.

```
C(N) = N / (1 + α(N-1) + βN(N-1))
α = contention, β = coherency
```

- α 큰 시스템 — 적은 코어에서 plateau
- β 큰 시스템 — 적정 코어 넘으면 *역효과* (negative scalability)

→ **Multicore는 무한 scale 안 됨**. Optimal core count 존재.

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

각 컴포넌트 *cycle budget* 할당 → 초과 시 *해당 컴포넌트 최적화*.

## Speedup Saturation

Multi-core 임베디드 (Cortex-A SMP):

```text
1 core: 100 ms
2 core: 60 ms (1.67× — 좋음)
4 core: 40 ms (2.5× — 감소)
8 core: 35 ms (2.86× — 거의 한계)
```

Cache·bus contention 증가 → diminishing returns.

## 인터프리터 모델

Performance = *Best of (memory, compute, control)*.

각 path가 *독립 maximum* — 한 path가 saturate 되어도 다른 path *idle* 가능.

OoO CPU의 *ILP·MLP·TLP*가 이걸 활용.

## 자주 하는 실수

> ⚠️ 모든 작업 병렬화 가정

Amdahl — 작은 serial 부분이 한계 결정. *측정 후 분포 확인*.

> ⚠️ Memory-bound 코드를 CPU 최적화

Cache miss가 90% 시간 → SIMD·intrinsics 의미 없음. *DRAM access 줄이기*.

> ⚠️ Roofline 무시

알고리즘 OI 모르면 *어디에 최적화 노력*인지 모름.

> ⚠️ Multicore 무조건 scale

USL의 coherency cost — *2-4 core에서 plateau* 흔함.

## 정리

- **Amdahl**: 1 / ((1-P) + P/S) — serial 부분이 한계.
- **Gustafson**: 문제 크기 scaling 시 더 낙관.
- **Roofline**: OI vs peak FLOPS vs memory BW → bound 식별.
- **Little's Law**: BW × latency = bytes in flight.
- **USL**: Multicore의 coherency cost — 무한 scale 안 됨.
- 임베디드 — *cycle budget*으로 컴포넌트 관리.

다음 편은 **프로파일링 개요** — Sampling vs Instrumentation.

## 관련 항목

- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [1-08: 프로파일링 개요](/blog/embedded/performance-engineering/part1-08-profiling-overview)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
