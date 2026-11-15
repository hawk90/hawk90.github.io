---
title: "실시간 성능 분석 — WCET·Jitter·Deadline Miss 측정"
slug: "embedded/performance-engineering/part1-05-realtime"
date: 2026-04-23T09:05:00
description: "Real-time 시스템의 측정 — 평균 아닌 worst-case. WCET 4 방법과 jitter·tardiness 분석."
series: "Embedded Performance Engineering"
seriesOrder: 5
tags: [realtime, wcet, jitter, deadline, tardiness, cyclictest]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"요구 deadline과 증거를 함께 본다"**가 핵심입니다. 표본 최대, 정적 상한, 시험 환경, 작업량 모델은 서로 다른 증거입니다.

## Real-Time의 핵심 지표

| 지표 | 의미 |
| --- | --- |
| **WCET** | Worst-Case Execution Time |
| **Deadline Miss** | Deadline 넘긴 횟수 |
| **Jitter** | Latency 변동 |
| **Tardiness** | 늦은 정도 (deadline 넘긴 시간) |
| **Release Jitter** | task 실행 시작 지연 |

## WCET — 측정 4 방법

### 1. Static Analysis (정적 분석)

소스와 CPU 모델로부터 *모든 path의 WCET를 계산*합니다. 상용 도구로는 aiT(AbsInt)와 Bound-T가 있습니다.

$$\text{WCET}_{\text{func}} = \max_{p \in \text{paths}} \text{WCET}(p)$$

*수학적 보장*이 장점입니다. 다만 비싸고 setup이 복잡합니다.

### 2. Measurement-Based

```c title="observed-maximum-is-not-wcet"
#include <assert.h>
#include <stdint.h>
static uint32_t observed_max(const uint32_t *samples, unsigned n) {
    uint32_t max = 0;
    for (unsigned i = 0; i < n; ++i) if (samples[i] > max) max = samples[i];
    return max;
}
int main(void) {
    const uint32_t tested[] = {12, 18, 15};
    const uint32_t later_unseen_path = 1000;
    uint32_t maximum = observed_max(tested, 3);
    assert(maximum == 18);
    assert(maximum < later_unseen_path); /* sampled max is not a bound */
    return 0;
}
```

이 코드는 시험한 입력·환경에서의 **관측 최대**만 계산합니다. 미실행 경로, 인터럽트, 캐시·메모리 상태를 포괄하는 WCET 상한이 아니며, 임의의 safety factor를 곱해도 보장으로 바뀌지 않습니다. 측정 기반 추정은 시험 범위와 가정, 초과 확률 또는 한계가 있으면 이를 명시합니다.

### 3. Hybrid

Static analysis로 *bound를 계산*하고 measurement로 *typical case*를 잡습니다. 정밀도와 비용의 균형이 좋습니다.

### 4. Probabilistic WCET (pWCET)

확률 분포로 표현합니다. 예를 들어 "99.999% 확률로 80 µs 미만"처럼 말합니다. *Extreme Value Theory*를 활용하며, 자동차나 항공 분야에서 도입되고 있습니다.

## Jitter 분석

```c title="periodic-release-phase-sample"
TickType_t last_wake = xTaskGetTickCount();
uint32_t expected_cycles = DWT->CYCCNT;
for (;;) {
    vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(1));
    expected_cycles += CYCLES_PER_TICK * pdMS_TO_TICKS(1);
    uint32_t actual_cycles = DWT->CYCCNT;
    int32_t phase_error = (int32_t)(actual_cycles - expected_cycles);
    log_phase_error_cycles(phase_error);
    process();
}
```

이 예제는 scheduled wake 기준의 phase error 표본을 기록합니다. tick 양자화, cycle frequency 변화, counter wrap, API tick conversion을 타깃에서 확인하고, 허용 범위는 요구사항으로 정합니다.

### Jitter 원인

- Higher-priority preemption
- ISR latency
- Cache miss (Cortex-A)
- DMA contention
- Tickless wake delay

## Deadline Miss 카운트

```c title="fixed-release-deadline-check"
#include <stdint.h>
static unsigned miss_count;
static int deadline_missed(uint32_t completed, uint32_t deadline) {
    return (int32_t)(completed - deadline) > 0;
}
int main(void) {
    const uint32_t release = 100, deadline = 110;
    if (deadline_missed(111, deadline)) ++miss_count;
    if (deadline_missed(110, deadline)) ++miss_count;
    return miss_count == 1 && release + 10 == deadline ? 0 : 1;
}
```

각 작업의 완료를 예정 release 기준 deadline과 비교합니다. 제품에서는 요구된 miss 정책과 timer 해상도로 검증합니다.

## Tardiness — 얼마나 늦었나

Deadline을 넘긴 *시간*을 의미합니다. 단순 miss count보다 정보량이 많습니다.

```c
int32_t tardiness = (now - deadline);  // > 0이면 늦음
log_tardiness(tardiness);
```

Tardiness 분포를 보면서 *얼마나 심각한지*를 판정합니다.

## Cyclictest — Linux RT 표준

```bash
sudo cyclictest -p 80 -t 1 -i 1000 -l 100000 -m

# T: 0 (12345) P:80 I:1000 C:100000 Min:5 Avg:7 Max:23
```

cyclictest는 설정한 조건에서 timer wake-up latency 표본과 요약 통계를 수집하는 도구입니다. 실행 결과만으로 worst-case 보장이나 WCET를 증명하지 않습니다. 핵심은 *수일에 걸친 측정*으로 outlier를 capture하는 것입니다.

## Latency Budget 분석 예시

```text
PID 1ms 주기, deadline 1ms (숫자는 계산 예시이며 측정값이 아님)

ISR latency      :  50 ns
Scheduler latency:  2 µs
Context switch  :  3 µs
PID compute    :  95 µs (WCET)
Actuator write  :  10 µs
────────────────────────
Total worst case: ~110 µs

계산 예시의 여유 = 890 µs (89%); 이 값만으로 시스템 안전을 판정할 수 없음
```

이 수치는 계산 예시일 뿐 실제 보드의 관측값이나 검증된 WCET가 아닙니다. 실제 시스템에서는 component별 상한의 근거와 동시성·차단·인터럽트 가정을 확인합니다.

## Hard vs Soft RT — 측정 차이

| 구분 | Hard real-time | Soft real-time |
| --- | --- | --- |
| deadline miss | 시스템 요구사항과 안전 분석으로 허용 여부 정의 | 허용 빈도와 품질 저하를 요구사항으로 정의 |
| 증거 | 명시된 모델·가정에 따른 분석과 검증 | workload에서 측정한 분포와 서비스 목표 |
| 실행시간 근거 | 검증된 상한 또는 안전한 분석 | 관측 표본과 통계적 목표를 구분 |

## Schedulability Analysis

실행시간 상한과 task/scheduler 모델이 확보되면 해당 가정 아래 schedulability를 분석할 수 있습니다. 입력 상한, blocking, interrupt, overhead 등 빠진 요인은 결과 범위 밖입니다.

### Rate-Monotonic Utilization Sufficient Bound (Liu–Layland)

$$\sum_{i=1}^{n} \frac{C_i}{T_i} \leq n \cdot (2^{1/n} - 1)$$

이 고전적 충분 조건은 단일 CPU, 독립된 주기 task, 고정 우선순위 RM, deadline=period 등 논문 모델을 전제로 합니다. 조건을 벗어나면 이 식만으로 schedulability를 판단하지 않습니다.

### Response Time Analysis (RTA)

각 task의 *worst response time*은 다음과 같이 구합니다.

$$R_i = C_i + B_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i}{T_j} \right\rceil \cdot C_j$$

여기서 $B_i$는 lower-priority task의 blocking입니다. 단일 CPU fixed-priority preemptive 모델에서 blocking과 interrupt/계측 overhead를 적절히 포함해 반복 계산하며, $R_i \leq D_i$일 때 해당 가정 아래 schedulable입니다.

Cheddar와 SymTA/S 같은 도구가 이 과정을 자동화합니다.

## Release Jitter

Task가 *정확히 release되어야 할 시점*과 *실제 시작 시점*의 차이를 의미합니다.

```text
이상: release at t=0, 5, 10, 15, ... ms (정확 5ms 주기)
실제: t=0.05, 5.12, 9.98, 15.30, ...
release jitter = 5.30 - 5.00 = 0.30 ms
```

원인으로는 *tick granularity*, *higher-priority preemption*, *ISR latency*가 있습니다.

## 측정 시 함정

### Probe Effect

측정 코드 자체가 *측정 대상에 영향*을 줍니다. printf를 추가하면 1 ms가 지연되기도 합니다.

해결책은 *light-weight tracing*(DWT, GPIO, ring buffer)입니다.

### Thermal Drift

장시간 부하가 걸리면 *온도가 상승하고 throttling*이 일어납니다. 측정 후반부의 latency가 증가합니다.

해결책은 *fan이나 heatsink를 두고 thermal sensor로 모니터링*하는 것입니다.

### Stationarity

부팅 직후에는 시스템이 cold 상태였다가 점차 warm해집니다. *최소 1분 warmup* 후에 측정합니다.

## 자주 하는 실수

> ⚠️ 표본 최대를 WCET 보장으로 부르기

시험한 표본 최대와 검증된 실행시간 상한을 구분합니다. 임의의 safety factor는 상한 증명이 아닙니다.

> ⚠️ Single workload만

Worst-case를 유발하는 input은 다릅니다. *대표 input set*을 준비해야 합니다.

> ⚠️ Lab 환경 = production

Production 환경에는 *DMA, noise, thermal*이 추가됩니다. 실 환경에서 측정해야 합니다.

> ⚠️ Linux mainline = real-time

PREEMPT_RT는 선점 가능성을 높이고 IRQ 처리를 조정합니다. 구성·장치·펌웨어·workload에 따라 결과가 달라지므로 이를 단독 보장으로 해석하지 않습니다.

## 정리

- Real-time에서는 **WCET, jitter, deadline miss, tardiness**를 측정합니다.
- WCET 측정에는 4가지 방법이 있습니다. static, measurement, hybrid, probabilistic입니다.
- **cyclictest**는 Linux timer wake-up latency를 측정하는 도구이며, 표본 측정과 WCET 증명은 구분합니다.
- Latency budget 분석으로 컴포넌트별 *WCET 책임*을 나눕니다.
- **Schedulability proof**는 RTA와 WCET의 조합으로 가능합니다.

다음 편은 **벤치마킹 기초**입니다. 재현성과 warmup, 노이즈 제거를 다룹니다.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [Practical RTOS Internals 1-10](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)

## 참고 자료

- [Linux PREEMPT_RT theory](https://docs.kernel.org/core-api/real-time/theory.html)
- [Linux RT kernel configuration](https://docs.kernel.org/next/core-api/real-time/kernel-configuration.html)
- [Linux `rtla timerlat hist`](https://docs.kernel.org/tools/rtla/rtla-timerlat-hist.html)
- [Liu and Layland, Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment (1973)](https://web.cs.wpi.edu/~cs3013/a09/Papers/Liu%20%26%20Layland%2C%20Real-time%20Scheduling.pdf)
