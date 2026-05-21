---
title: "1-04: 통계적 분석 — Percentile, Histogram, 평균의 함정"
date: 2026-05-08T04:00:00
description: "평균은 거짓말. p99·p999·max·long tail. HdrHistogram·임베디드 fixed-bucket."
series: "Embedded Performance Engineering"
seriesOrder: 4
tags: [statistics, percentile, histogram, hdr-histogram]
draft: false
---

## 한 줄 요약

> **"평균은 거짓말"**입니다. Latency 분포는 *long tail*을 가지므로, p99와 max가 진실에 가깝습니다.

## 평균의 함정

```text
Latency 측정 100회:
99회: 10 ms
 1회: 1000 ms

Average: (99 × 10 + 1 × 1000) / 100 = 19.9 ms
Median (p50): 10 ms
Max: 1000 ms
```

평균 20 ms만 보고 OK라고 판단하면, 1% 사용자가 1초를 기다린다는 사실을 놓칩니다. *Real-time 시스템이라면 곧바로 fail*입니다.

## Percentile — 분포의 점

| Percentile | 의미 |
| --- | --- |
| p50 (median) | 절반이 더 빠름 |
| p90 | 10% 더 느림 |
| **p99** | 1% 더 느림 — *user experience의 표준* |
| p999 | 0.1% — *1000 req 중 1* |
| p9999 | 0.01% |
| max | worst-case |

**Web service**는 p99를 보장합니다. **Real-time system**은 max를 보장합니다.

## Histogram

분포를 시각화합니다. *bucket 개수 × 카운트* 형태로 표현합니다.

```text
< 1 ms:    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (140)
1-2 ms:    ▓▓▓▓▓▓▓▓ (80)
2-5 ms:    ▓▓ (20)
5-10 ms:   ▓ (10)
10-50 ms:  ▓ (5)
> 50 ms:   ▓ (3)        ← long tail
```

평균은 보이지 않지만 분포는 *눈으로 즉시 식별*할 수 있습니다. Mode, skew, outlier가 모두 한눈에 들어옵니다.

## HdrHistogram — 정밀 분포

[HdrHistogram](http://hdrhistogram.org/)은 Gil Tene이 Azul Systems에서 만든 도구입니다. *Logarithmic bucket*과 *configurable precision*을 제공합니다.

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

**1 µs~60 s 범위**에 **3 자리 정밀도**를 가지면서, 메모리는 *수십 KB*만 씁니다. Web과 database benchmark의 표준입니다.

## 임베디드 — Fixed-Bucket Histogram

HdrHistogram이 너무 크면 *고정 64-128 bucket log2 분포*를 쓰면 됩니다.

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

64 bucket × 4 byte = 256 byte입니다. *임베디드에서도 충분*합니다. p99와 max는 bucket을 누적해서 계산합니다.

## 통계 지표 — 본질

| 지표 | 공식 | 의미 |
| --- | --- | --- |
| Mean | $\mu = \frac{1}{N}\sum_{i} x_i$ | 평균 — outlier에 민감 |
| Median | $\text{sorted}[N/2]$ | 50th percentile — robust |
| Mode | 가장 빈번 값 | 일상적 값 |
| Variance | $\sigma^2 = \frac{1}{N}\sum_{i}(x_i - \mu)^2$ | 분산 |
| Stdev | $\sigma = \sqrt{\sigma^2}$ | 표준편차 |
| Min, Max | — | 극단값 |

Real-time에서는 max에 신경 써야 합니다. Mean과 stdev는 *정규분포를 가정*하지만, latency는 *비대칭 long-tail*이라 적합하지 않습니다.

## Outlier — 무시할까 분석할까

```text
99회: 10 ms (정상)
 1회: 1000 ms (outlier)
```

*1초 outlier의 원인이 cache miss나 context switch*라면, 이는 시스템 자체의 특성입니다. *random noise*가 아니라 *systematic*인 현상입니다.

그래서 **outlier 분석이야말로 핵심 가치**입니다. 평균만 보면 *해결해야 할 진짜 문제를 못 봅니다*.

## Coordinated Omission

Gil Tene의 유명한 글입니다. **Load generator가 측정 도중 멈추면** *measurement 자체가 누락*됩니다.

**시스템이 1초 freeze:**

- 그 동안 도착할 요청들이 *측정 누락*
- 측정 latency는 *얼토당토 적게*
- 실제 user latency는 *훨씬 더 큼*

해결책은 *coordinated omission correction*입니다. HdrHistogram에 내장 지원이 있습니다.

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

각 원인은 *다른 분포 패턴*을 보입니다. histogram으로 시그니처를 식별할 수 있습니다.

## Sample Size

```text
N=10:   잡음 큼, 결론 X
N=100:  대략적 분포
N=1000: 신뢰할 만
N=10000: 정밀
N=100000+: production grade
```

p99를 신뢰하려면 *최소 N=1000* 이상이 필요합니다(1% 케이스를 추정해야 하기 때문입니다).

## Box Plot

![Box plot 구조 — min, p25, median, p75, max와 outlier 표시](/images/blog/perf-eng/diagrams/part1-04-box-plot.svg)

5-number summary를 시각화합니다. 여러 측정을 *비교*할 때 좋습니다.

## Latency vs Sustained Load

```c
for (load = 10%; load <= 100%; load += 10%) {
    run_with_load(load);
    measure_p99(load);
}
```

**Latency curve**의 knee 지점이 capacity 한계입니다. 보통 *80%* 근처입니다.

## 자주 하는 실수

> ⚠️ 평균만 보고 결정

위에서 본 것처럼 *p99와 max*가 필수입니다.

> ⚠️ N 너무 적음

10개 sample로 p99를 추정하면 noise만 남습니다. **최소 1000개**가 필요합니다.

> ⚠️ Histogram bucket 너무 적거나 많음

10 bucket이면 정밀도가 부족하고, 1000 bucket이면 메모리가 과합니다. log2 기반 64-128이 sweet spot입니다.

> ⚠️ Stationarity 가정

시스템 부하가 변동하는 동안에는 *전구간 평균*이 의미가 없습니다. 시간대별로 분리해서 봅니다.

## 정리

- 평균은 사용자 경험과 다릅니다. **p99·p999·max**가 진실에 가깝습니다.
- **Histogram과 percentile**이 분포 분석의 정석입니다.
- **HdrHistogram**은 web과 DB의 표준이며, 임베디드에서는 *log2 64-bucket*으로도 충분합니다.
- **Coordinated omission**이 흔한 측정 함정입니다.
- *Long tail*의 원인은 cache, context switch, bus contention, GC 등입니다.

다음 편은 **실시간 성능 분석**입니다. WCET와 jitter, deadline miss를 다룹니다.

## 관련 항목

- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-05: 실시간 성능 분석](/blog/embedded/performance-engineering/part1-05-realtime)
- [HdrHistogram](http://hdrhistogram.org/)
