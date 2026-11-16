---
title: "성능 데이터 통계적 분석 — Percentile·Histogram·평균의 함정"
slug: "embedded/performance-engineering/part1-04-statistics"
date: 2026-04-23T09:04:00
description: "평균은 거짓말. p99·p999·max·long tail. HdrHistogram·임베디드 fixed-bucket."
series: "Embedded Performance Engineering"
seriesOrder: 4
tags: [statistics, percentile, histogram, hdr-histogram]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"평균은 거짓말"**입니다. Latency 분포는 *long tail*을 가지므로, p99와 max가 진실에 가깝습니다.

## 평균의 함정

이 글의 데이터는 하나입니다. Debian 13 게스트(QEMU HVF, M2 Pro 호스트)에서 `cyclictest`(rt-tests 2.60)로 1 ms 주기 thread 하나의 wake-up 지연을 10만 번 쟀습니다. 호스트에서는 다른 QEMU 게스트들이 함께 돌고 있었으므로, 이 값은 "부하가 걸린 가상 머신"의 분포입니다.

```bash
cyclictest -m -t1 -p80 -i1000 -l100000 -q -v
```

`-v`는 표본 하나하나를 출력합니다. 마지막 줄 요약은 `Min: 1 Act: 247 Avg: 265 Max: 24084`(µs)였고, 표본 전체를 다시 계산한 값은 다음과 같습니다(`bench/ct_stats.py`).

| 지표 | 값 |
|---|---:|
| mean | 265.8 µs |
| p50 | 210 µs |
| p90 | 304 µs |
| p99 | 2,397 µs |
| p99.9 | 8,910 µs |
| max | 24,084 µs |

평균 266 µs만 보면 1 ms 주기에 충분히 여유가 있어 보입니다. 하지만 p99에서 이미 주기의 2.4배를 넘고, 최악은 24주기를 놓쳤습니다. 1,024 µs 이상 늦게 깨어난 표본만 2,685개(2.7%)이고, 이 표본들은 다음 주기가 시작될 때까지 이번 주기의 일을 시작하지도 못했습니다. 평균은 이 사실을 전혀 보여 주지 않습니다.

## Percentile — 분포의 점

| Percentile | 의미 |
| --- | --- |
| p50 (median) | 절반이 더 빠름 |
| p90 | 10% 더 느림 |
| **p99** | 1% 더 느림 |
| p999 | 0.1%, 1000개 중 1개 |
| p9999 | 0.01% |
| max | 관측한 최댓값 |

서비스는 p99 같은 분위수 목표를 두고, 실시간 시스템은 deadline 보장을 분석합니다. 관측한 max는 그 시험에서 본 최댓값일 뿐 보장값이 아닙니다.

## Histogram

같은 10만 표본을 log2 버킷으로 나눴습니다.

| 구간 (µs) | 표본 수 |
|---|---:|
| 0~64 | 20,211 |
| 64~128 | 8,894 |
| 128~256 | 49,331 |
| 256~512 | 16,133 |
| 512~1,024 | 2,746 |
| 1,024~2,048 | 1,458 |
| 2,048~4,096 | 813 |
| 4,096~8,192 | 298 |
| 8,192~16,384 | 106 |
| 16,384~32,768 | 10 |

본체는 128~256 µs 버킷이지만, 0~64 µs에도 따로 덩어리가 있습니다. 봉우리가 둘이라는 사실은 평균과 표준편차로는 보이지 않습니다. 1 ms 위로 올라가면 버킷마다 표본이 줄지만, 꼬리는 16 ms 넘게까지 이어집니다.

## HdrHistogram — 정밀 분포

[HdrHistogram](https://github.com/HdrHistogram/HdrHistogram_c)은 값의 범위와 유효 자릿수를 정해 두고, 그 정밀도를 유지하는 버킷 구조로 값을 셉니다. C 구현(`HdrHistogram_c`, 커밋 `13a13ec`)의 `include/hdr/hdr_histogram.h`에 있는 함수로 쓰면 다음과 같습니다. 이 코드는 실행하지 않았고, 함수 이름과 인자 순서는 헤더에서 확인했습니다.

```c
#include "hdr/hdr_histogram.h"

struct hdr_histogram *h;
hdr_init(1, 60 * 1000 * 1000, 3, &h);  // 1 µs~60 s, 유효 숫자 3자리

hdr_record_value(h, latency_us);

int64_t p99  = hdr_value_at_percentile(h, 99.0);
int64_t p999 = hdr_value_at_percentile(h, 99.9);
int64_t max  = hdr_max(h);
```

헤더 주석에 따르면 `significant_figures`는 1~5 사이이고, 3이면 결과가 앞 세 자리까지 정확합니다. 메모리 크기는 범위와 자릿수로 정해지며 `hdr_get_memory_size()`로 확인합니다.

## 임베디드 — Fixed-Bucket Histogram

RAM이 수십 KB인 MCU에서는 32비트 값의 log2를 버킷 번호로 쓰는 고정 배열이면 충분합니다. 32비트 값의 log2는 0~31이므로 버킷은 32개면 됩니다. 아래 코드는 호스트에서 `clang -O0 -Wall`로 컴파일해 assert가 모두 통과했습니다.

```c title="bounded-log2-histogram"
#include <assert.h>
#include <stdint.h>

#define BUCKETS 32
static uint32_t hist[BUCKETS];
static unsigned bucket_index(uint32_t value) {
    unsigned i = 0;
    while (value > 1u) { value >>= 1; ++i; }
    return i;
}
static void record(uint32_t us) { ++hist[bucket_index(us)]; }
int main(void) {
    record(0); record(1); record(2); record(4095); record(UINT32_MAX);
    assert(hist[0] == 2);
    assert(hist[1] == 1 && hist[11] == 1 && hist[31] == 1);
    return 0;
}
```

카운터 배열은 32 × 4 = 128 byte입니다. 대신 percentile은 버킷 경계로만 알 수 있습니다. 위 histogram 표로 말하면 p99는 "2,048~4,096 µs 버킷 안"까지만 정해지고, 정확한 2,397 µs는 알 수 없습니다. 더 촘촘한 해상도가 필요하면 각 2배 구간을 다시 4~8칸으로 나눕니다.

## 통계 지표 — 무엇을 요약하는가

| 지표 | 공식 | 위 데이터 |
| --- | --- | ---: |
| Mean | $\mu = \frac{1}{N}\sum_{i} x_i$ | 265.8 µs |
| Median | 정렬한 표본의 가운데 | 210 µs |
| Stdev | $\sigma = \sqrt{\frac{1}{N}\sum_{i}(x_i - \mu)^2}$ | 591.1 µs |
| Min, Max | 극단값 | 1, 24,084 µs |

평균과 표준편차 자체는 어떤 분포에서도 계산할 수 있습니다. 문제는 해석입니다. 정규분포라면 μ + 3σ를 넘는 표본이 0.135%뿐이라는 직관을 쓰지만, 이 데이터에서 μ + 3σ = 2,039 µs를 넘은 표본은 1,231개, 즉 1.23%로 아홉 배였습니다. 그리고 max는 μ + 40σ 근처에 있습니다. 꼬리가 긴 지연 분포에서는 σ로 최악을 추정하지 않고 분위수와 max를 직접 봅니다.

## Outlier — 무시할까 분석할까

위 데이터의 16 ms 넘는 표본 10개를 측정 잡음으로 지우면 max가 사라지고 분포가 깨끗해 보입니다. 하지만 이 표본들은 실제로 thread가 16주기 넘게 깨어나지 못한 사건입니다. 원인이 호스트의 다른 게스트든, 게스트 안의 무엇이든 이 시스템에서 일어나는 일이고, 1 ms 제어 루프라면 그 순간 제어가 끊깁니다.

그래서 outlier는 지우기 전에 원인을 찾습니다. 지울 수 있는 것은 측정 도구 자체의 오류로 확인된 표본뿐입니다.

## Coordinated Omission

부하 생성기가 요청을 보내고 응답을 기다린 다음 다음 요청을 보내는 구조라면, 시스템이 1초 멈춘 동안 생성기도 함께 멈춥니다. 그 1초 동안 보냈어야 할 요청들이 아예 측정되지 않으므로, 기록된 분포는 실제 사용자가 겪는 것보다 좋아 보입니다. 이것을 coordinated omission이라 부릅니다.

HdrHistogram_c는 이를 보정하는 `hdr_record_corrected_value(h, value, expected_interval)`을 제공합니다. 헤더 주석에 따르면 값이 기대 간격보다 크면 coordinated omission이 일어난 것으로 보고, 부하를 주던 쪽이 막히지 않았다면 생겼을 값들을 채워 넣습니다. `cyclictest` man page에 따르면 기본 동작은 absolute timer이고, `-r`을 줄 때만 relative timer를 씁니다. 다음 깨어날 시각이 앞 표본과 무관하게 정해지므로 이 문제가 없습니다. 늦게 깨어난 만큼이 그대로 그 표본의 지연이 됩니다.

## Long Tail 원인 찾기

꼬리의 원인 후보는 시스템마다 다르고, 히스토그램 모양만으로 원인을 정할 수는 없습니다. 후보를 하나씩 켜고 끄며 꼬리가 줄어드는지 봅니다. 이 시리즈에서 각 후보를 재는 글은 다음과 같습니다.

| 후보 | 재는 방법이 나오는 글 |
| --- | --- |
| Cache miss | 2-06 |
| Bus contention | 3-02 |
| DMA 동시 접근 | 3-03 |
| Interrupt | 3-05, 3-06 |
| Thermal throttling | 3-10 |
| Lock 대기 | 4-03 |

## Sample Size

p99를 추정할 때 필요한 표본 수는 두 가지로 볼 수 있습니다.

첫째는 순서통계량입니다. 참 p99보다 작은 표본 개수는 Binomial(N, 0.99)를 따르므로, 분포 모양과 무관하게 정렬된 표본 몇 번째와 몇 번째 사이에 참 p99가 있는지 계산할 수 있습니다(`bench/p99ci.py`).

| N | 참 p99를 95% 확률로 포함하는 구간 |
|---:|---|
| 100 | 표본 안에서 양쪽 구간을 만들 수 없음 |
| 1,000 | 983번째~996번째 값 (포함 확률 0.957) |
| 10,000 | 9,881번째~9,920번째 값 (포함 확률 0.950) |

N = 100이면 p99에 대해 양쪽이 닫힌 95% 구간을 표본 안에서 만들 수 없습니다. N = 1,000이면 구간이 표본의 p98.3~p99.6에 걸칩니다.

둘째는 실제 데이터에서 잘라 보는 것입니다. 위 10만 표본에서 길이 N인 연속 구간을 무작위로 200개 골라 각각 p99를 계산했습니다.

| N | p99 추정값의 5%~95% 범위 | 중앙값 |
|---:|---|---:|
| 100 | 278~9,585 µs | 856 µs |
| 1,000 | 293~4,751 µs | 1,217 µs |
| 10,000 | 559~7,062 µs | 1,525 µs |

N = 10,000에서도 범위가 넓게 남는 것은 표본 수가 아니라 시간 때문입니다. 연속 1만 표본은 10초 분량이고, 어느 10초를 골랐느냐에 따라 호스트 부하가 달랐습니다. 이 경우 표본을 더 모아도 하나의 p99로 수렴하지 않으므로, 시간 구간별로 나눠 보고합니다(아래 Stationarity).

## Box Plot

![Box plot 구조 — min, p25, median, p75, max와 outlier 표시](/images/blog/perf-eng/diagrams/part1-04-box-plot.svg)

5-number summary를 시각화합니다. 여러 측정을 *비교*할 때 좋습니다.

## Latency vs Sustained Load

부하를 단계적으로 올리면서 단계마다 분위수를 따로 재면, 어느 부하부터 꼬리가 길어지는지 보입니다.

```c
for (int load_pct = 10; load_pct <= 100; load_pct += 10) {
    run_with_load(load_pct);
    record_p99(load_pct, measure_p99());
}
```

1-02의 M/M/1 시뮬레이션에서는 사용률 0.5→0.9에서 p99가 4.7배가 됐습니다. 실제 시스템에서 곡선의 기울기가 바뀌는 지점은 이렇게 측정으로 찾습니다.

## 자주 하는 실수

> ⚠️ 평균만 보고 결정

위 데이터의 평균은 266 µs였지만 1,024 µs 넘게 늦은 표본이 2.7%였습니다. 분위수, max, 표본 수를 함께 적습니다.

> ⚠️ N 너무 적음

N = 100으로는 p99의 양쪽 신뢰구간도 만들 수 없습니다. 보려는 분위수에서 거꾸로 표본 수를 정합니다.

> ⚠️ 표준편차로 최악값 추정

이 데이터에서 μ + 3σ를 넘은 표본은 정규분포 기대치의 아홉 배였습니다.

> ⚠️ Stationarity 가정

같은 데이터의 연속 1만 표본 p99가 559~7,062 µs로 흔들렸습니다. 부하가 시간에 따라 바뀌면 전 구간을 하나로 요약하지 말고, 시간대별로 나눠 봅니다.

## 정리

- 부하가 걸린 VM의 cyclictest 10만 표본에서 평균은 266 µs, p99는 2,397 µs, max는 24 ms였습니다. 평균은 deadline miss를 보여 주지 않습니다.
- Histogram은 평균이 숨기는 봉우리와 꼬리를 보여 줍니다. MCU에서는 32칸 log2 배열(128 byte)로 충분합니다.
- 평균·표준편차의 정규분포식 해석은 지연 분포에 맞지 않습니다. μ + 3σ 초과 표본이 1.23%였습니다.
- p99에 95% 구간을 붙이려면 N이 적어도 수백 개 이상이어야 하고, 부하가 변하면 시간대별로 나눠 봅니다.
- Coordinated omission은 닫힌 루프 부하 생성기의 함정입니다. HdrHistogram은 보정 함수를 제공합니다.

다음 편은 **실시간 성능 분석**입니다. WCET와 jitter, deadline miss를 다룹니다.

## 관련 항목

- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-05: 실시간 성능 분석](/blog/embedded/performance-engineering/part1-05-realtime)
- [HdrHistogram_c](https://github.com/HdrHistogram/HdrHistogram_c)

## 참고 자료

- [HdrHistogram project](https://github.com/HdrHistogram/HdrHistogram)
- [rt-tests (cyclictest)](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/)
