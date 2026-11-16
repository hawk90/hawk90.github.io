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

## WCET — 네 가지 접근

WCET 분석 기법을 정리한 대표 문헌은 Wilhelm 외 14인의 "The Worst-Case Execution-Time Problem—Overview of Methods and Survey of Tools"(*ACM TECS* 7(3), 2008)입니다. 이 논문 2.2절은 방법을 *static*과 *measurement-based* 두 부류로 나눕니다. 여기에 두 방법을 섞은 hybrid와, 결과를 확률 분포로 내는 probabilistic 분석을 더하면 네 가지가 됩니다.

### 1. Static Analysis (정적 분석)

Wilhelm 2.2절의 정의로 static 방법은 코드를 실제 하드웨어나 시뮬레이터에서 실행하지 않습니다. 코드의 가능한 제어 흐름 경로 집합을 분석하고, 이를 하드웨어의 추상 모델과 결합해 *상한*을 얻습니다.

$$\text{WCET}_{\text{func}} = \max_{p \in \text{paths}} \text{WCET}(p)$$

같은 절은 static 방법이 실행 시간이 넘지 않음을 *보장하는* 상한을 내고, 그래서 hard real-time의 schedulability 분석에 안전하게 쓸 수 있다고 적습니다. 논문 6.1절은 AbsInt의 aiT를, 6.2절은 Tidorum의 Bound-T를 이런 도구로 소개합니다. aiT는 소스가 아니라 실행 파일을 분석하고, 루프 상한 같은 정보는 사용자 annotation으로 보충합니다(6.1절).

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

이 코드는 시험한 입력에서의 **관측 최대**만 계산합니다(호스트에서 `clang -O0 -Wall`로 실행해 assert 통과). Wilhelm 4절은 이 점을 이렇게 적습니다. 가능한 실행의 일부만 끝에서 끝까지 잰 결과는, 그 일부가 최악의 경우를 포함한다는 보장이 없는 한 상한이 아니라 추정값이나 분포입니다. 임의의 safety factor를 곱해도 보장으로 바뀌지 않습니다.

### 3. Hybrid

Wilhelm 4절이 설명하는 두 번째 측정 방식입니다. 끝에서 끝까지 재는 대신 basic block 같은 코드 조각의 실행 시간을 재고, 그 값을 static 분석의 제어 흐름 정보와 상한 계산으로 합칩니다. 측정이 하드웨어 모델 분석을 대신하는 셈입니다. 논문은 이 방법도 각 조각을 일부 초기 상태(캐시 내용 등)에서만 쟀다면 결과가 안전하지 않을 수 있다고 적습니다.

### 4. Probabilistic WCET (pWCET)

Davis와 Cucu-Grosjean의 "A Survey of Probabilistic Timing Analysis Techniques for Real-Time Systems"(*LITES* 6(1), 2019)에 따르면 pWCET은 하나의 값이 아니라 분포이고, 그 초과 함수(1−CDF)는 실행 시간이 예산 x를 넘을 확률 p의 상한을 줍니다. 측정 기반 기법(MBPTA)은 대부분 Extreme Value Theory로 이 분포를 추정합니다. 같은 논문은 관심 있는 초과 확률이 보통 10⁻⁴~10⁻¹⁵ 범위이고, 이 값이 응용의 시간당 허용 고장률에서 나온다고 적습니다. 그리고 추정이 유효하려면 측정에 쓴 입력 상태와 하드웨어 상태가 미래 운용 시나리오를 대표해야 한다는 점을 MBPTA의 핵심 과제로 꼽습니다.

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

이 예제는 예정 시각 기준의 phase error를 기록합니다. 보드에서 실행하지 않았습니다. `expected_cycles`는 tick 단위로 누적하므로, 코어 클럭이 DVFS로 바뀌면 `CYCLES_PER_TICK`도 바뀌어 기준이 어긋납니다. `expected_cycles`는 2³²를 법으로 누적되므로 카운터의 wrap 자체는 문제가 아니고, `(int32_t)` phase error가 ±2³¹ cycle(168 MHz에서 약 12.8초) 안에 있는 한 올바릅니다.

Jitter의 원인 후보는 1-04의 "Long Tail 원인 찾기" 표와 같습니다. 여기에 더 높은 우선순위 task의 선점과, tick이 꺼진 상태에서 깨어나는 지연이 더해집니다.

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

각 작업의 완료 시각을 예정 release 기준 deadline과 비교합니다. `(int32_t)(completed - deadline) > 0` 비교는 32비트 타이머가 한 번 wrap해도 올바릅니다. 위 코드는 호스트에서 실행해 종료 코드 0을 확인했습니다.

## Tardiness — 얼마나 늦었나

Deadline을 넘긴 *시간*을 의미합니다. 단순 miss count보다 정보량이 많습니다.

```c
int32_t tardiness = (now - deadline);  // > 0이면 늦음
log_tardiness(tardiness);
```

Tardiness 분포를 보면서 *얼마나 심각한지*를 판정합니다.

## Cyclictest — Linux RT 표준

cyclictest는 주기 thread를 절대 시각 timer로 깨우고, 예정 시각보다 얼마나 늦게 깨어났는지를 셉니다. Debian 13 게스트(QEMU HVF, 커널 6.12.116, `CONFIG_PREEMPT_VOLUNTARY=y`, `CONFIG_PREEMPT_RT` 없음)에서 30초씩 네 번 돌렸습니다.

```bash
cyclictest -m -t1 -p80 -i1000 -l30000 -q
# 부하 조건: 별도 셸에서 stress-ng --cpu 4 --timeout 40s
```

| 조건 | Min | Avg | Max |
|---|---:|---:|---:|
| 부하 없음, 1회 | 1 µs | 290 µs | 13,490 µs |
| 부하 없음, 2회 | 1 µs | 439 µs | 34,040 µs |
| `stress-ng --cpu 4`, 1회 | 0 µs | 733 µs | 125,767 µs |
| `stress-ng --cpu 4`, 2회 | 0 µs | 106 µs | 50,478 µs |

같은 조건을 두 번 돌렸는데도 Max가 2.5배씩 차이 납니다. 이 게스트는 PREEMPT_RT가 아니고 호스트에서 다른 VM들이 함께 돌았으므로 실시간 시스템의 예는 아닙니다. 그래도 요점은 같습니다. 30초 측정의 Max는 그 30초의 Max일 뿐이고, 측정을 늘리면 더 큰 값이 나올 수 있습니다. cyclictest 결과는 wake-up 지연의 표본이지 WCET 증명이 아닙니다.

## Latency Budget 분석

주기 task 하나의 응답 시간을 구성 요소로 나누고, 각 요소의 상한을 *어디서* 얻는지 적어 두면 빈칸이 보입니다. 숫자가 출처를 가진 칸은 하나뿐입니다.

| 구성 요소 | 상한의 출처 |
|---|---|
| 인터럽트 진입 | Cortex-M4 TRM(DDI 0439B) 3.9.1: wait state 없는 메모리에서 인터럽트 assert부터 ISR 첫 명령까지 최대 12 cycle. 168 MHz면 71 ns |
| 더 높은 우선순위 task와 ISR의 간섭 | 아래 RTA의 간섭 항 |
| 낮은 우선순위 task의 blocking | 공유 자원의 가장 긴 임계 구역 |
| task 자체의 실행 | static 분석 도구가 낸 상한, 또는 측정 최대(이 경우 보장 아님) |
| 출력(actuator write) | 주변장치 데이터시트의 쓰기 시간 |

12 cycle은 wait state가 없을 때의 값입니다. flash wait state가 있으면 이 값이 늘어나므로, 실제 보드에서는 벡터 테이블과 ISR이 어느 메모리에 있는지까지 적습니다.

## Hard vs Soft RT — 측정 차이

1-02에서 인용한 *Mastering the FreeRTOS Real Time Kernel* 1.1절의 정의를 측정에 옮기면 다음과 같습니다.

| 구분 | Hard real-time | Soft real-time |
| --- | --- | --- |
| deadline miss의 의미 | 시스템의 완전한 실패 | 품질 저하. 시스템은 쓸 수 있음 |
| 실행 시간의 근거 | 상한(static 분석 등). Wilhelm 2.2절은 hard real-time의 schedulability 분석에 안전한 상한이 필요하다고 적음 | 측정한 분포와 miss 비율 |
| 보고할 것 | 상한과 그 가정 | 분위수, max, miss 횟수, 측정 시간 |

## Schedulability Analysis

실행시간 상한과 task/scheduler 모델이 확보되면 해당 가정 아래 schedulability를 분석할 수 있습니다. 입력 상한, blocking, interrupt, overhead 등 빠진 요인은 결과 범위 밖입니다.

### Rate-Monotonic Utilization Sufficient Bound (Liu–Layland)

$$\sum_{i=1}^{n} \frac{C_i}{T_i} \leq n \cdot (2^{1/n} - 1)$$

Liu와 Layland의 1973년 논문(*JACM* 20(1), pp.46-61) Theorem 5는 고정 우선순위 m개 task의 최소 상한 사용률을 m(2^(1/m) − 1)로 줍니다. 논문 모델은 단일 프로세서, 주기 task, deadline = 주기, task 사이의 독립입니다. 이 식은 충분 조건이라 넘어도 schedulable일 수 있습니다. 아래 RTA 예가 그 경우입니다.

### Response Time Analysis (RTA)

각 task의 *worst response time*은 다음과 같이 구합니다.

$$R_i = C_i + B_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i}{T_j} \right\rceil \cdot C_j$$

이 식은 Audsley, Burns, Richardson, Tindell, Wellings의 "Applying New Scheduling Theory to Static Priority Pre-emptive Scheduling"(*Software Engineering Journal*, 1993, pp.284-292) 식 (1) $r_i = C_i + B_i + I_i$에 간섭 항 $I_i$의 식 (2)를 넣은 것입니다. 같은 논문에 따르면 $B_i$는 priority ceiling 프로토콜에서 낮은 우선순위 task가 i 이상의 ceiling을 가진 세마포어를 잡고 있는 가장 긴 임계 구역이고, deadline이 있으면 $r_i \leq D_i$여야 합니다. 논문은 이 분석이 사용률에 기대지 않는다는 점을 강조합니다. $R_i$가 양변에 있으므로 $R_i = C_i$에서 시작해 값이 변하지 않을 때까지 반복합니다.

세 task (C, T) = (1, 4), (2, 6), (3, 12), D = T, rate-monotonic 우선순위, B = 0으로 계산해 보았습니다(`bench/rta.py`).

| task | C | T = D | 반복 | R | R ≤ D |
|---|---:|---:|---|---:|---|
| 1 | 1 | 4 | 1 → 1 | 1 | 예 |
| 2 | 2 | 6 | 2 → 3 → 3 | 3 | 예 |
| 3 | 3 | 12 | 3 → 6 → 7 → 9 → 10 → 10 | 10 | 예 |

사용률은 0.8333으로 n = 3의 Liu–Layland 상한 0.7798을 넘지만, RTA로는 세 task 모두 deadline 안에 끝납니다. 충분 조건을 통과하지 못했다고 schedulable하지 않은 것은 아닙니다.

## Release Jitter

Task가 *도착한 시점*과 *실제로 release된(실행 가능 큐에 들어간) 시점*의 차이를 의미합니다.

Audsley 외(1993)는 이것을 $J_i$로 두고 "task가 도착한 뒤 release되기를 기다릴 수 있는 최악의 시간"으로 정의하며, 위 분석이 0이 아닌 release jitter로 쉽게 확장된다고 적습니다. cyclictest의 wake-up 지연은 release jitter에 dispatch까지의 지연이 더해진 값의 표본입니다. 위 표의 부하 없음 1회 측정에서는 최악 13.5 ms였습니다.

tick 기반 RTOS에서는 release 시각이 tick 경계로 양자화됩니다. 1 kHz tick이면 이벤트가 tick 직후에 도착한 task는 다음 tick까지 최대 1 ms를 기다립니다.

## 측정 시 함정

### Probe Effect

측정 코드 자체가 측정 대상의 시간을 바꿉니다. 1-03에서 계산했듯 115200 baud UART로 20글자를 내보내면 1.74 ms가 걸리므로, 1 ms 주기 task에 printf 한 줄을 넣으면 그것만으로 deadline을 넘깁니다. 측정값은 DWT, GPIO, ring buffer처럼 비용이 작은 방법으로 기록합니다.

### Thermal Drift

장시간 측정에서는 온도 센서 값을 함께 기록합니다. 후반부 지연이 늘었을 때 그것이 throttling 때문인지를 구분하려면 같은 시간축의 온도와 클럭이 필요합니다(3-10).

### Stationarity

1-04에서 같은 10만 표본의 연속 1만 개 구간 p99가 559~7,062 µs로 흔들렸습니다. 부하가 시간에 따라 바뀌는 시스템에서는 측정 시간 전체를 하나로 요약하지 말고 구간별로 나눠 봅니다. warmup은 1-06에서 다룹니다.

## 자주 하는 실수

> ⚠️ 표본 최대를 WCET 보장으로 부르기

시험한 표본 최대와 검증된 실행시간 상한을 구분합니다. 임의의 safety factor는 상한 증명이 아닙니다.

> ⚠️ Single workload만

Wilhelm 4절의 말대로, 최악 입력을 알면 실행 한 번으로 충분하지만 대개는 모릅니다. 입력 집합에 경계값과 가장 긴 경로를 타는 입력을 일부러 넣습니다.

> ⚠️ Lab 환경 = production

위 cyclictest 표에서 `stress-ng --cpu 4`로 부하를 걸자 Max가 13.5~34 ms에서 50~126 ms가 됐습니다. 실제 제품의 DMA, 인터럽트, 다른 task를 켠 상태에서 다시 잽니다.

> ⚠️ Linux mainline = real-time

Linux 6.12 `kernel/Kconfig.preempt`의 `PREEMPT_RT` 도움말에 따르면 이 옵션은 spinlock·rwlock을 선점 가능하고 priority inheritance를 아는 변형으로 바꾸고, 인터럽트를 thread로 강제하며, 긴 비선점 구간을 쪼갭니다. 커널 문서 "Theory of operation"은 PREEMPT_RT가 높은 우선순위 task가 runnable이 된 뒤 실제로 실행되기까지의 지연을 *줄인다*고 적을 뿐 상한을 약속하지 않습니다. 이 시리즈의 Debian 커널은 `CONFIG_PREEMPT_VOLUNTARY=y`이고 `CONFIG_PREEMPT_RT`는 꺼져 있습니다.

## 정리

- Real-time에서는 **WCET, jitter, deadline miss, tardiness**를 측정합니다.
- WCET 접근은 static, measurement, hybrid, probabilistic입니다. Wilhelm 외(2008)에 따르면 상한을 *보장*하는 것은 static 방법이고, 끝에서 끝까지 잰 측정은 추정값입니다.
- **cyclictest**는 wake-up 지연의 표본을 줍니다. HVF 게스트에서 같은 조건 두 번의 Max가 2.5배 달랐습니다.
- Latency budget은 구성 요소마다 상한의 출처를 적어 빈칸을 드러냅니다. Cortex-M4 인터럽트 진입은 TRM이 최대 12 cycle로 줍니다.
- Liu–Layland 상한은 충분 조건입니다. U = 0.833인 예제는 상한을 넘었지만 RTA로 schedulable이었습니다.

다음 편은 **벤치마킹 기초**입니다. 재현성과 warmup, 노이즈 제거를 다룹니다.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [1-06: 벤치마킹 기초](/blog/embedded/performance-engineering/part1-06-benchmark)
- [Practical RTOS Internals 1-10](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)

## 참고 자료

- [Linux PREEMPT_RT theory](https://docs.kernel.org/core-api/real-time/theory.html)
- [Linux RT kernel configuration](https://docs.kernel.org/next/core-api/real-time/kernel-configuration.html)
- [Linux `rtla timerlat hist`](https://docs.kernel.org/tools/rtla/rtla-timerlat-hist.html)
- C. L. Liu, J. W. Layland, "Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment," *JACM* 20(1), 1973, pp.46-61 ([PDF](https://www.cis.upenn.edu/~lee/07cis505/Lec/liu73scheduling.pdf))
- R. Wilhelm et al., "The Worst-Case Execution-Time Problem—Overview of Methods and Survey of Tools," *ACM TECS* 7(3), 2008 ([PDF](https://www.es.mdu.se/pdf_publications/1258.pdf))
- R. I. Davis, L. Cucu-Grosjean, "A Survey of Probabilistic Timing Analysis Techniques for Real-Time Systems," *LITES* 6(1), 2019 ([PDF](https://www-users.york.ac.uk/~rd17/papers/LITESProbabilisticTiming.pdf))
- N. Audsley et al., "Applying New Scheduling Theory to Static Priority Pre-emptive Scheduling," *Software Engineering Journal*, 1993, pp.284-292 ([York 목록](https://www.cs.york.ac.uk/rts/publications/Audsley1993.html))
- Cortex-M4 Technical Reference Manual (DDI 0439B) 3.9.1
