---
title: "실시간 성능 분석 — WCET·Jitter·Deadline Miss 측정"
date: 2026-04-23T09:05:00
description: "Real-time 시스템의 측정 — 평균 아닌 worst-case. WCET 4 방법과 jitter·tardiness 분석."
series: "Embedded Performance Engineering"
seriesOrder: 5
tags: [realtime, wcet, jitter, deadline, tardiness, cyclictest]
draft: false
---

## 한 줄 요약

> **"평균이 아니라 worst"**입니다. Real-time에서는 *max ≤ deadline*이 기준이며, 일반 시스템과 평가 기준 자체가 다릅니다.

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

```c
uint32_t max_cycles = 0;
for (int i = 0; i < N; i++) {
    uint32_t t = DWT->CYCCNT;
    work(input[i]);
    uint32_t elapsed = DWT->CYCCNT - t;
    if (elapsed > max_cycles) max_cycles = elapsed;
}
WCET_est = max_cycles * SAFETY_FACTOR;   // 보통 1.2-1.5×
```

**Coverage가 보장되지 않습니다**. 측정하지 않은 path가 더 느릴 가능성이 있습니다.

### 3. Hybrid

Static analysis로 *bound를 계산*하고 measurement로 *typical case*를 잡습니다. 정밀도와 비용의 균형이 좋습니다.

### 4. Probabilistic WCET (pWCET)

확률 분포로 표현합니다. 예를 들어 "99.999% 확률로 80 µs 미만"처럼 말합니다. *Extreme Value Theory*를 활용하며, 자동차나 항공 분야에서 도입되고 있습니다.

## Jitter 분석

```c
// 1ms 주기 task
TickType_t xLast = xTaskGetTickCount();
while (1) {
    uint32_t t = DWT->CYCCNT;
    process();
    vTaskDelayUntil(&xLast, pdMS_TO_TICKS(1));
    
    uint32_t period_actual = DWT->CYCCNT - t;
    uint32_t period_expected = SystemCoreClock / 1000;
    int32_t jitter = period_actual - period_expected;
    log_jitter(jitter);
}
```

Jitter 분포를 보면서 *기준 ±10% 안*이면 OK로 판정합니다. 더 크면 *원인을 추적*합니다.

### Jitter 원인

- Higher-priority preemption
- ISR latency
- Cache miss (Cortex-A)
- DMA contention
- Tickless wake delay

## Deadline Miss 카운트

```c
void task(void *arg) {
    TickType_t deadline = xTaskGetTickCount() + DEADLINE_TICKS;
    while (1) {
        if (xTaskGetTickCount() > deadline) {
            miss_count++;
        }
        process();
        deadline = xTaskGetTickCount() + DEADLINE_TICKS;
    }
}
```

*Counter를 누적*하고 주기적으로 출력합니다. Production에서는 *miss rate에 대한 alerting*을 둡니다.

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

p99와 max latency를 측정합니다. PREEMPT_RT에서 worst-case를 검증할 때 씁니다. 핵심은 *수일에 걸친 측정*으로 outlier를 capture하는 것입니다.

## Latency Budget 분석

```text
PID 1ms 주기, deadline 1ms

ISR latency      :  50 ns
Scheduler latency:  2 µs
Context switch  :  3 µs
PID compute    :  95 µs (WCET)
Actuator write  :  10 µs
────────────────────────
Total worst case: ~110 µs

여유 = 890 µs (89%) — 안전
```

Component별로 budget을 *고정*해 두고, 컴포넌트별로 *WCET를 분석*합니다.

## Hard vs Soft RT — 측정 차이

| | Hard RT | Soft RT |
| --- | --- | --- |
| Deadline miss | 0회 (모든 경우) | <1% |
| 측정 기간 | *무한* (수학 증명) | 수일 |
| WCET 산출 | Static analysis | Measurement + 1.5× |
| Test coverage | MC/DC | functional |
| 인증 | DO-178C·ISO 26262 ASIL D | 없음 |

## Schedulability Analysis

WCET를 알면 *전체 시스템의 schedulability를 증명*할 수 있습니다.

### Utilization Bound (Liu-Layland)

$$\sum_{i=1}^{n} \frac{C_i}{T_i} \leq n \cdot (2^{1/n} - 1)$$

### Response Time Analysis (RTA)

각 task의 *worst response time*은 다음과 같이 구합니다.

$$R_i = C_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i}{T_j} \right\rceil \cdot C_j$$

Iterative하게 풉니다. $R_i \leq D_i$(deadline)이면 schedulable입니다.

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

> ⚠️ Avg WCET 사용

평균은 WCET가 아닙니다. *Max에 safety factor*를 곱한 값을 씁니다.

> ⚠️ Single workload만

Worst-case를 유발하는 input은 다릅니다. *대표 input set*을 준비해야 합니다.

> ⚠️ Lab 환경 = production

Production 환경에는 *DMA, noise, thermal*이 추가됩니다. 실 환경에서 측정해야 합니다.

> ⚠️ Linux mainline = real-time

Mainline은 best-effort입니다. *PREEMPT_RT 패치*만 RT-capable입니다.

## 정리

- Real-time에서는 **WCET, jitter, deadline miss, tardiness**를 측정합니다.
- WCET 측정에는 4가지 방법이 있습니다. static, measurement, hybrid, probabilistic입니다.
- **Cyclictest**가 Linux RT의 표준입니다.
- Latency budget 분석으로 컴포넌트별 *WCET 책임*을 나눕니다.
- **Schedulability proof**는 RTA와 WCET의 조합으로 가능합니다.

다음 편은 **벤치마킹 기초**입니다. 재현성과 warmup, 노이즈 제거를 다룹니다.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [Practical RTOS Internals 1-10](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
