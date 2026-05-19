---
title: "1-05: 실시간 성능 분석 — WCET, Jitter, Deadline Miss"
date: 2026-05-08T05:00:00
description: "Real-time 시스템의 측정 — 평균 아닌 worst-case. WCET 4 방법과 jitter·tardiness 분석."
series: "Embedded Performance Engineering"
seriesOrder: 5
tags: [realtime, wcet, jitter, deadline, tardiness, cyclictest]
draft: true
---

## 한 줄 요약

> **"평균 아닌 worst"** — Real-time은 *max ≤ deadline*. 일반 시스템과 *완전히 다른* 평가 기준.

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

소스 + CPU 모델 → *모든 path WCET 계산*. 상용 도구: aiT (AbsInt), Bound-T.

```text
Function WCET = max(path_i WCET for i in all_paths)
```

장점 — *수학적 보장*. 단점 — *비싸고 setup 복잡*.

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

**Coverage 보장 X** — 측정 안 한 path가 더 느릴 가능성.

### 3. Hybrid

Static analysis로 *bound 계산* + measurement로 *typical case*. 정밀 + 비용 균형.

### 4. Probabilistic WCET (pWCET)

확률 분포로. "99.999% 확률로 80 µs 미만". *Extreme Value Theory* 활용. 자동차·항공에서 도입.

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

Jitter 분포 → *기준 ±10% 안*이면 OK. 더 크면 *원인 추적*.

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

*Counter 누적* + 주기적 출력. Production에서 *miss rate alerting*.

## Tardiness — 얼마나 늦었나

Deadline 넘긴 *시간*. 단순 miss count보다 풍부.

```c
int32_t tardiness = (now - deadline);  // > 0이면 늦음
log_tardiness(tardiness);
```

Tardiness 분포 → *얼마나 심각한가* 판정.

## Cyclictest — Linux RT 표준

```bash
sudo cyclictest -p 80 -t 1 -i 1000 -l 100000 -m

# T: 0 (12345) P:80 I:1000 C:100000 Min:5 Avg:7 Max:23
```

- p99·max latency 측정
- PREEMPT_RT 시 worst-case 검증
- 핵심 — *수일 측정으로* outlier capture

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

Component별 budget *고정* → 컴포넌트별 *WCET 분석*.

## Hard vs Soft RT — 측정 차이

| | Hard RT | Soft RT |
| --- | --- | --- |
| Deadline miss | 0회 (모든 경우) | <1% |
| 측정 기간 | *무한* (수학 증명) | 수일 |
| WCET 산출 | Static analysis | Measurement + 1.5× |
| Test coverage | MC/DC | functional |
| 인증 | DO-178C·ISO 26262 ASIL D | 없음 |

## Schedulability Analysis

WCET를 알면 *전체 시스템 schedulability 증명*:

### Utilization Bound (Liu-Layland)

```
Σ Ci/Ti ≤ n(2^(1/n) - 1)
```

### Response Time Analysis (RTA)

각 task의 *worst response time*:

```
R_i = C_i + Σ_higher_prio ⌈R_i / T_j⌉ × C_j
```

Iterative. `R_i ≤ D_i` (deadline)이면 schedulable.

Cheddar·SymTA/S 같은 도구가 자동화.

## Release Jitter

Task가 *정확히 release 되어야 할 시점*과 *실제 시작 시점*의 차이.

```text
이상: release at t=0, 5, 10, 15, ... ms (정확 5ms 주기)
실제: t=0.05, 5.12, 9.98, 15.30, ...
release jitter = 5.30 - 5.00 = 0.30 ms
```

원인 — *tick granularity*, *higher-priority preemption*, *ISR latency*.

## 측정 시 함정

### Probe Effect

측정 코드 자체가 *측정 대상 영향*. printf 추가 → 1 ms 지연.

해결 — *light-weight tracing* (DWT, GPIO, ring buffer).

### Thermal Drift

장시간 부하 시 *온도 상승 → throttling*. 측정 후반부 latency 증가.

해결 — *fan/heatsink + thermal sensor 모니터링*.

### Stationarity

부팅 직후 시스템 cold → 점차 warm. *최소 1분 warmup* 후 측정.

## 자주 하는 실수

> ⚠️ Avg WCET 사용

평균은 WCET 아님. *Max + safety factor*.

> ⚠️ Single workload만

Worst-case 발생 input 다르다. *대표 input set*.

> ⚠️ Lab 환경 = production

Production 환경의 *DMA·noise·thermal* 추가. 실 환경 측정.

> ⚠️ Linux mainline = real-time

Mainline은 best-effort. *PREEMPT_RT 패치*만 RT-capable.

## 정리

- Real-time = **WCET·jitter·deadline miss·tardiness** 측정.
- WCET 4 방법 — static·measurement·hybrid·probabilistic.
- **Cyclictest**가 Linux RT 표준.
- Latency budget 분석 → 컴포넌트별 *WCET 책임*.
- **Schedulability proof** = RTA + WCET.

다음 편은 **벤치마킹 기초** — 재현성·warmup·노이즈 제거.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [Practical RTOS Internals 1-10](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
