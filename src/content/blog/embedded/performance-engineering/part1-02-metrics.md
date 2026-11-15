---
title: "성능 지표 정의 — Latency·Throughput·Utilization 분석"
slug: "embedded/performance-engineering/part1-02-metrics"
date: 2026-04-23T09:02:00
description: "3 핵심 지표 + 임베디드 추가 — Jitter·Deadline. Service time vs Response time."
series: "Embedded Performance Engineering"
seriesOrder: 2
tags: [performance, latency, throughput, utilization, jitter, deadline]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Latency·Throughput·Utilization"** 세 축으로 성능을 그립니다. 임베디드에서는 *jitter·deadline*이 추가됩니다.

## 3 핵심 지표

### Latency

**한 작업이 완료되기까지 걸리는 시간**을 의미합니다.

![요청부터 응답까지의 latency 구간](/images/blog/perf-eng/diagrams/part1-02-latency-request.svg)

단위는 µs, ms, s입니다. 측정 방식은 single request 시간이거나 *분포*(p50·p99·max)입니다.

### Throughput

**단위 시간당 처리량**을 의미합니다.

```text
초당 요청 수 (req/s)
초당 byte 수 (MB/s, Gbps)
초당 프레임 수 (FPS)
```

단위는 req/s, bytes/s, ops/s입니다.

### Utilization

**자원 사용률(%)**을 의미합니다.

$$U_{CPU} = \frac{t_{busy}}{t_{total}}, \quad U_{mem} = \frac{u}{m_{total}}, \quad U_{bus} = \frac{c_{active}}{c_{total}}$$

포화는 자원별 서비스 능력과 도착 부하에 따라 나타납니다. 이용률이 100%에 가까워지면 대기 시간이 급격히 커질 수 있지만, 특정 임계 비율은 작업량과 시스템의 변동성에 따라 달라집니다.

## Latency vs Throughput — 상호 의존

작은 시스템에서는 보통 trade-off거나 직교 관계입니다.

```text
초기 (utilization 낮음):  throughput↑ → latency 거의 변화 X
중간 (50-70%):           throughput↑ → latency 살짝 증가
포화 (자원별 임계점 부근): throughput 한계 → latency 증가
```

**Queueing Theory** (Little's Law)는 다음과 같습니다.

$$L = \lambda \cdot W$$

여기서 $L$은 평균 대기 수, $\lambda$는 도착률, $W$는 평균 대기 시간입니다.

안정된 단일 큐 모델에서 이용률이 1에 가까워지면 대기 시간이 크게 늘어날 수 있습니다. 실제 임계점은 도착·서비스 분포와 자원 구조에 달려 있으므로 고정된 80% 한계로 일반화하지 않습니다.

## Service Time vs Response Time

![Service time과 Response time의 관계 — queue 대기 시간 포함 여부](/images/blog/perf-eng/diagrams/part1-02-service-vs-response.svg)

- **Service Time**은 실제 *처리 시간*입니다(queue 제외).
- **Response Time**은 *대기와 처리*를 합한 시간이며, 사용자가 체감하는 값입니다.

평균 service time이 좋아도 *queue 적체가 일어나면 response time이 폭증*합니다.

## 임베디드 — Jitter

Latency의 *변동성*을 의미합니다.

```text
주기적 1ms PID task:
실제 wake: 1.000, 1.001, 0.998, 1.003, 0.997 ...
```

$$\text{Jitter} = \max - \min = 6\ \mu s$$

jitter가 허용 범위를 넘으면 제어·동기화 품질에 영향을 줄 수 있습니다. 허용 한계는 시스템 요구사항으로 정합니다.

### Jitter 측정

```c title="phase-jitter-sample"
TickType_t last_wake = xTaskGetTickCount();
uint32_t expected_cycles = DWT->CYCCNT;
while (1) {
    vTaskDelayUntil(&last_wake, period);
    expected_cycles += (uint32_t)period * CYCLES_PER_TICK;
    uint32_t actual_cycles = DWT->CYCCNT;
    int32_t phase_error = (int32_t)(actual_cycles - expected_cycles);
    log_phase_error_cycles(phase_error);
    do_work();
}
```

Histogram을 누적하면서 분포를 분석합니다.

## 임베디드 — Deadline

작업이 *반드시 끝나야 할 시점*을 의미합니다.

| Type | Miss 결과 |
| --- | --- |
| **Hard** | deadline miss가 허용되지 않도록 요구되는 작업; 결과는 시스템 위험 분석에 따름 |
| **Firm** | 늦은 결과는 사용하지 않지만 제한된 miss가 시스템 실패를 뜻하지는 않음 |
| **Soft** | 늦은 결과의 유용성이 감소하며, 품질 저하는 애플리케이션에 따라 정의 |

Latency 대신 deadline 만족 여부가 metric이 됩니다. 즉, *deadline 안에 들어왔는가? 몇 % 들어왔는가?*를 봅니다.

## Percentile 표기

| 표기 | 의미 |
| --- | --- |
| p50 (median) | 절반은 더 빠름 |
| p90 | 10% 케이스만 더 느림 |
| p99 | 1% 케이스만 더 느림 |
| p999 | 0.1% (1000 중 1) |
| p9999 | 0.01% |
| max | worst-case |

요구사항과 분석 모델에 따라 deadline 충족을 평가합니다. 유한한 시험에서 관측한 max는 하드 실시간 보장을 증명하지 않으며, p99/p999 목표는 소프트 실시간 서비스 목표의 한 예일 뿐입니다.

## Long Tail

**Histogram:**

- ▓▓▓▓▓▓▓▓
- ▓ ▓▓▓▓▓▓▓▓▓
- ▓ ▓ ▓▓▓▓▓▓▓▓▓ ▓        ▓                     ▓ ← long tail
- 1   10           100              1000 ms

평균 10 ms, p99 100 ms, max 1 s인 분포입니다. 사용자 체감을 결정하는 것은 *long tail*입니다.

원인으로는 cache miss, GC, context switch, bus contention이 있습니다. RAS(Reliability·Availability·Serviceability) 도구로 추적합니다.

## Saturation 측정

![Resource 사용률과 응답 시간의 관계 — 부하 증가에 따른 대기 시간 예시](/images/blog/perf-eng/diagrams/part1-02-saturation-curve.svg)

이 곡선은 특정 대기열 모델의 예시입니다. 안전 한계는 시스템 요구사항과 측정 결과로 설정합니다.

## 임베디드 추가 지표

### IPC (Instructions Per Cycle)

`PMU CPU_CYCLES`와 `INST_RETIRED`의 ratio입니다.

| IPC | 해석 |
|-----|------|
| 0.5 | 해당 실행에서 평균 0.5 instructions/cycle |
| 1.0 | 해당 실행에서 평균 1 instruction/cycle |
| 2.0+ | 다중 발행이 가능한 구현에서는 가능할 수 있음 |

IPC가 낮으면 *왜 낮은지* 분석합니다. 원인은 cache miss, branch mispredict, stall 등입니다.

### Cache Hit Rate

```c
double hit_rate = 1.0 - (cache_miss / cache_access);
```

Cache hit rate는 작업량, 계층, 계측 event 정의에 따라 달라집니다. 비교할 때는 같은 workload와 counter 정의를 사용합니다.

### MIPS / DMIPS

옛 단위입니다. **MIPS**는 millions of instructions per second입니다. **DMIPS**는 Dhrystone MIPS 벤치마크입니다.

CPU별 DMIPS 수치를 비교할 때는 Dhrystone 구현, compiler flags, clock, memory placement와 보고 규칙을 함께 확인해야 합니다. 단일 표의 수치만으로 실제 workload 성능을 예측하지 않습니다.

DMIPS는 *아주 거친* 비교에만 적합합니다. 더 정밀하게 비교하려면 CoreMark나 EEMBC를 씁니다.

### CoreMark

EEMBC가 만든 임베디드 benchmark로 정해진 integer workload를 측정합니다.

CoreMark 결과는 해당 benchmark의 validation/run rules, compiler와 flags, memory placement, clock frequency를 함께 기록해 비교합니다. 이 글은 특정 칩 점수를 제시하지 않습니다.

CoreMark/MHz는 동일한 검증 조건과 보고 규칙을 지켰을 때 참고할 수 있는 정규화 값이며, 단독으로 architecture 효율 전체를 나타내지는 않습니다.

## 측정 — Time Source

| 시계 | 반환 단위·해상도 | 사용 |
| --- | --- | --- |
| `xTaskGetTickCount()` | RTOS tick 단위; tick period 설정에 따름 | task 단위 timing |
| `DWT->CYCCNT` | 코어 cycle 단위 (지원·활성화된 경우) | 짧은 구간; 타깃별 확인 |
| `clock_gettime(CLOCK_MONOTONIC_RAW)` | ns 단위 반환; 실제 해상도는 플랫폼별 확인 | Linux 경과시간 측정 |
| GPIO + 로직 분석기 | 장비·샘플링 설정에 따름 | 외부 측정 (HW) |
| HW timer | clock 단위 | 임베디드 정밀 |

## Latency 분포 측정 예

```c title="bounded-latency-histogram"
#include <assert.h>
#include <stdint.h>

#define BUCKETS 32
static uint32_t hist[BUCKETS];
static uint32_t max_val;

static unsigned bucket_index(uint32_t us) {
    unsigned i = 0;
    while (us > 1u) { us >>= 1; ++i; }
    return i;
}
static void log_latency_us(uint32_t us) {
    ++hist[bucket_index(us)];
    if (us > max_val) max_val = us;
}
int main(void) {
    log_latency_us(0); log_latency_us(1); log_latency_us(2);
    log_latency_us(UINT32_MAX);
    assert(hist[0] == 2 && hist[1] == 1 && hist[31] == 1);
    assert(max_val == UINT32_MAX);
    return 0;
}
```

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

Median이 좋아도 *long tail*은 보이지 않습니다. 항상 *p99·max*를 함께 봅니다.

> ⚠️ Utilization 90%+ 목표

Queueing latency는 부하와 자원 모델에 따라 달라집니다. 고정 이용률을 보편적 한계로 두지 않습니다.

> ⚠️ Tick rate으로 µs 측정 시도

1 kHz tick으로 *µs latency*를 측정하면 0 또는 1 ms로만 보입니다. 이때는 *DWT* 또는 hw timer를 씁니다.

> ⚠️ Throughput만 최적화

Throughput을 2배 빠르게 했는데 *p99 latency가 3배 느려지면* 사용자에게는 오히려 느려진 셈입니다. Trade-off를 인지해야 합니다.

## 정리

- 3 핵심 지표는 **Latency, Throughput, Utilization**입니다.
- 임베디드에서는 **Jitter와 Deadline**이 추가됩니다.
- Service time과 Response time은 다릅니다(queueing 영향).
- 분포, 표본 수와 표본 최대를 요구사항에 맞춰 해석합니다.
- 포화 임계점은 작업량과 자원에 따라 측정하고 요구사항에 맞춰 정합니다.
- IPC와 CoreMark는 event 정의와 검증 조건을 함께 고려해 제한된 비교에 사용합니다.

다음 편은 **측정의 기본**입니다. wall-clock, CPU cycle, instruction count를 다룹니다.

## 관련 항목

- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)

## 참고 자료

- [FreeRTOS `vTaskDelayUntil()` API](https://freertos.org/Documentation/02-Kernel/04-API-references/02-Task-control/02-vTaskDelayUntil)
- [EEMBC CoreMark](https://github.com/eembc/coremark/blob/main/README.md)
