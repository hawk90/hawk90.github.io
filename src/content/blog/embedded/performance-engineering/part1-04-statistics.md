---
title: "1-04: 통계적 분석 — Percentile, Histogram, 평균의 함정"
date: 2026-05-08T04:00:00
description: "평균은 거짓말. p99·p999·max·long tail. HdrHistogram·임베디드 fixed-bucket."
series: "Embedded Performance Engineering"
seriesOrder: 4
tags: [statistics, percentile, histogram, hdr-histogram]
draft: true
---

## 한 줄 요약

> **"평균은 거짓말"** — Latency 분포는 *long tail*. p99·max가 진실.

## 평균의 함정

```text
Latency 측정 100회:
99회: 10 ms
 1회: 1000 ms

Average: (99 × 10 + 1 × 1000) / 100 = 19.9 ms
Median (p50): 10 ms
Max: 1000 ms
```

**평균 20 ms 보고 OK** → 1% 사용자가 1초 대기. *Real-time 시스템이면 fail*.

## Percentile — 분포의 점

| Percentile | 의미 |
| --- | --- |
| p50 (median) | 절반이 더 빠름 |
| p90 | 10% 더 느림 |
| **p99** | 1% 더 느림 — *user experience의 표준* |
| p999 | 0.1% — *1000 req 중 1* |
| p9999 | 0.01% |
| max | worst-case |

**Web service** = p99 보장. **Real-time system** = max 보장.

## Histogram

분포 시각화. *bucket 개수* × *카운트*.

```text
< 1 ms:    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (140)
1-2 ms:    ▓▓▓▓▓▓▓▓ (80)
2-5 ms:    ▓▓ (20)
5-10 ms:   ▓ (10)
10-50 ms:  ▓ (5)
> 50 ms:   ▓ (3)        ← long tail
```

평균 안 보임, 분포 *눈으로 즉시 식별*. *Mode·skew·outlier* 모두 가시.

## HdrHistogram — 정밀 분포

[HdrHistogram](http://hdrhistogram.org/) (Gil Tene, Azul Systems). *Logarithmic bucket* + *configurable precision*.

```c
#include "hdr_histogram.h"

struct hdr_histogram *h;
hdr_init(1, 60 * 1000 * 1000, 3, &h);  // 1µs~60s, 3 significant digits

hdr_record_value(h, latency_us);

// 결과
int64_t p99 = hdr_value_at_percentile(h, 99.0);
int64_t p999 = hdr_value_at_percentile(h, 99.9);
int64_t max = hdr_max(h);
```

**1 µs~60 s 범위**, **3 자리 정밀**, *수십 KB 메모리*. Web/database benchmark의 표준.

## 임베디드 — Fixed-Bucket Histogram

HdrHistogram이 너무 크면 *고정 64-128 bucket log2 분포*:

```c
#define BUCKETS 64
static uint32_t hist[BUCKETS];

void record(uint32_t us) {
    int idx;
    if (us == 0) idx = 0;
    else if (us >= (1u << (BUCKETS - 1))) idx = BUCKETS - 1;
    else idx = 32 - __clz(us);
    hist[idx]++;
}

void print(void) {
    for (int i = 0; i < BUCKETS; i++)
        if (hist[i]) printf("%d-%d us: %u\n", 1<<i, (1<<(i+1))-1, hist[i]);
}
```

64 bucket × 4 byte = 256 byte. *임베디드도 충분*. p99·max 계산은 buckets 누적.

## 통계 지표 — 본질

| 지표 | 공식 | 의미 |
| --- | --- | --- |
| Mean | Σx / N | 평균 — outlier에 민감 |
| Median | sorted[N/2] | 50th percentile — robust |
| Mode | 가장 빈번 값 | 일상적 값 |
| Variance | Σ(x-μ)² / N | 분산 |
| Stdev | √variance | 표준편차 |
| Min, Max | — | 극단값 |

**Real-time = max 신경**. *Mean·stdev는 정규분포 가정* — latency는 *비대칭 long-tail*이라 부적합.

## Outlier — 무시할까 분석할까

```text
99회: 10 ms (정상)
 1회: 1000 ms (outlier)
```

*1초 outlier의 원인이 cache miss·context switch* — 시스템 자체 특성. *random noise*가 아닌 *systematic*.

→ **Outlier 분석이 핵심 가치**. 평균만 보면 *해결할 진짜 문제 못 봄*.

## Coordinated Omission

Gil Tene의 유명한 글. **Load generator가 측정 도중 멈추면** *measurement 자체 누락*.

```text
시스템이 1초 freeze:
- 그 동안 도착할 요청들이 *측정 누락*
- 측정 latency는 *얼토당토 적게*
- 실제 user latency는 *훨씬 더 큼*
```

해결 — *coordinated omission correction*. HdrHistogram에 내장 지원.

## Long Tail 원인 분류

| 원인 | 시그니처 |
| --- | --- |
| **Cache miss** | µs-단위 spike, 주기 X |
| **GC pause** (Java/Go) | 수십 ms 정기 |
| **Context switch** | µs-수십 µs, IRQ/scheduler |
| **Bus contention** | 시스템 부하 중 |
| **TLB miss** (Cortex-A) | process switch 시 |
| **DMA contention** | 데이터 전송 중 |
| **Thermal throttle** | 고온 도달 시 |

각 원인이 *다른 분포 패턴* — histogram으로 시그니처 식별.

## Sample Size

```text
N=10:   잡음 큼, 결론 X
N=100:  대략적 분포
N=1000: 신뢰할 만
N=10000: 정밀
N=100000+: production grade
```

p99 신뢰하려면 *최소 N=1000* (1% 케이스 추정).

## Box Plot

```text
     ┌───┬─────┐
     │   │     │  ── max
─────┤   │     ├───── outliers
     │   │     │  ── p75
     │   │     │
     │   │     │  ── median (p50)
     │   │     │
     │   │     │  ── p25
─────┤   │     ├───── outliers
     │   │     │  ── min
     └───┴─────┘
```

5-number summary 시각화. 여러 측정 *비교*에 좋음.

## Latency vs Sustained Load

```c
for (load = 10%; load <= 100%; load += 10%) {
    run_with_load(load);
    measure_p99(load);
}
```

**Latency curve** — knee 지점 = capacity 한계. 보통 *80%* 근처.

## 자주 하는 실수

> ⚠️ 평균만 보고 결정

위에서 — *p99·max* 필수.

> ⚠️ N 너무 적음

10개 sample로 p99 추정 → noise. **최소 1000**.

> ⚠️ Histogram bucket 너무 적거나 많음

10 bucket = 정밀 부족, 1000 bucket = 메모리 과다. log2 64-128이 sweet.

> ⚠️ Stationarity 가정

시스템 부하 변동 시 *전구간 평균* 의미 X. 시간대별 분리.

## 정리

- 평균 ≠ 사용자 경험. **p99·p999·max**.
- **Histogram + percentile**이 분포 분석의 정석.
- **HdrHistogram** = web/DB 표준, 임베디드는 *log2 64-bucket*으로 충분.
- **Coordinated omission**이 측정 함정.
- *Long tail* 원인 — cache·context switch·bus contention·GC.

다음 편은 **실시간 성능 분석** — WCET·jitter·deadline miss.

## 관련 항목

- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-05: 실시간 성능 분석](/blog/embedded/performance-engineering/part1-05-realtime)
- [HdrHistogram](http://hdrhistogram.org/)
