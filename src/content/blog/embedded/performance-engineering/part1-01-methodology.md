---
title: "1-01: 성능 분석 방법론 — Measure → Analyze → Optimize"
date: 2026-05-08T01:00:00
description: "감으로 최적화 금지. USE·RED 메서드, 임베디드 적용. 과학적 접근의 시작."
series: "Embedded Performance Engineering"
seriesOrder: 1
tags: [performance, methodology, use-method, red-method]
draft: false
---

## 한 줄 요약

> **"측정 → 가설 → 검증"** 사이클이 핵심입니다. 추측으로 코드를 바꾸지 않습니다. 데이터가 답합니다.

## 왜 방법론이 필요한가

"느려요"라는 보고가 들어오면 80% 개발자가 *코드를 읽으면서 추측*합니다. "여기일 것 같다"고 결론짓고 수정한 뒤 측정해 보면 변화가 없습니다. 그래서 다른 곳을 또 만지고, 이렇게 추측과 수정을 반복합니다.

이렇게 작업하면 시간만 낭비됩니다. 더 큰 문제는 *원래 안 느렸던 코드*까지 망가뜨릴 수 있다는 점입니다.

방법론은 *추측 대신 측정*하고, *체계적으로 좁혀 가는* 일을 의미합니다.

## Brendan Gregg의 USE 메서드

각 자원(CPU, memory, disk, network)에 대해 세 가지 지표를 확인합니다.

| 지표 | 의미 |
| --- | --- |
| **U**tilization | 자원 사용률 (%) |
| **S**aturation | 대기열 길이 (queueing) |
| **E**rrors | 오류 카운트 |

| 시나리오 | 진단 |
|---|---|
| CPU U=95%, S=0, E=0 | CPU bound |
| CPU U=50%, S=10, E=0 | run queue 적체 (스케줄링 문제) |
| CPU U=50%, S=0, E=많음 | 다른 곳 (디스크·메모리) |

먼저 모든 자원의 3 지표를 훑어 병목을 찾고, 그 다음에 deep dive로 들어갑니다.

## RED 메서드 (Service-Oriented)

서비스 endpoint에 대해 다음 세 지표를 봅니다.

| | 의미 |
| --- | --- |
| **R**ate | 초당 요청 수 |
| **E**rrors | 실패율 |
| **D**uration | latency 분포 (p50, p99, p999) |

임베디드에서는 *task별*로 적용합니다. 즉, 매 task의 *처리 빈도, 오류, 처리 시간*을 추적합니다.

## 임베디드 적용

| 자원 | Utilization | Saturation | Errors |
| --- | --- | --- | --- |
| CPU | run 시간 / total | run queue 길이 | watchdog reset |
| RAM | heap used / total | OOM 카운트 | malloc 실패 |
| Flash | bandwidth 사용률 | wait state | ECC 오류 |
| Bus (AXI·AHB) | 트랜잭션/sec | outstanding TX | bus fault |
| Cache | hit rate | line refill stall | (없음) |
| DMA | 채널 사용률 | 대기 descriptor | DMA error |
| ISR | duty cycle | nested depth | spurious IRQ |
| Mutex | hold time | wait list 길이 | timeout |

각 행을 모니터링하다가 비정상을 발견하면 drill down으로 좁혀 갑니다.

## 측정 → 가설 → 검증 사이클

### Step 1: Measure

```c
uint32_t t1 = DWT->CYCCNT;
suspicious_function();
uint32_t t2 = DWT->CYCCNT;
log_max(t2 - t1);
```

여러 input을 시도하면서 *분포*를 수집합니다. 평균보다 *p99·max*가 중요합니다.

### Step 2: Hypothesize

"이 함수가 cache miss로 느리다"처럼 구체적인 가설을 세웁니다.

### Step 3: Verify

PMU counter를 활성화합니다.

```c
// L1D cache miss count
read_pmu(L1D_CACHE_REFILL);
```

수치가 예측과 일치하면 가설이 맞은 것이므로 해결책을 적용합니다. 일치하지 않으면 다른 가설을 세웁니다.

## 흔한 함정

### 1. 평균만 본다

| 지표 | 값 | 판정 |
|---|---|---|
| Avg latency | 10 ms | 좋아 보임 |
| p99 | 50 ms | 나쁨 |
| max | 500 ms | 끔찍 |

Real-time에서는 *worst case가 진실*입니다. 그래서 항상 percentile과 max를 함께 봅니다.

### 2. 측정 환경 = 실 환경 가정

벤치 환경은 cool cache에 no contention이라 빠르게 나옵니다. 반대로 실 환경은 hot system, bus saturation 상태라 훨씬 느립니다.

실 환경에서 *오랜 시간*에 걸쳐 측정해야 합니다.

### 3. Observer Effect

측정 코드 자체가 시스템에 영향을 줍니다. printf나 trace overhead가 대표적입니다. 그래서 DWT 카운터, ring buffer 같은 light-weight tracing을 씁니다.

### 4. Single Run

한 번 측정하고 "이 정도구나"라고 결론을 내리면 다음 실행에서는 완전히 다른 결과가 나옵니다. 최소 N=100회 측정으로 분포를 확인해야 합니다.

## 임베디드 특화 — Bottleneck 우선순위

대부분의 임베디드 시스템에서 문제 발생 빈도는 다음과 같습니다.

1. ISR 길거나 nested (40%)
2. Critical section / lock contention (25%)
3. Memory bandwidth (15%)
4. Cache miss (10%)
5. DMA bottleneck (5%)
6. 기타 (5%)

처음에는 ISR과 lock부터 확인합니다. Cache와 DMA는 그 다음 순서입니다.

## Roofline Model 미리보기

성능은 *min(peak compute, memory bandwidth)*로 결정됩니다. 자세한 내용은 1-07에서 다룹니다.

![Roofline Model Preview — memory bound vs compute bound](/images/blog/perf-eng/diagrams/part1-01-roofline-preview.svg)

*Memory-bound* 코드는 CPU를 아무리 빠르게 해도 변화가 없습니다. 진단이 먼저입니다.

## 도구 분류 — 1-08에서 자세히

| 카테고리 | 도구 |
| --- | --- |
| Sampling | perf, gprof |
| Tracing | ftrace, LTTng, SystemView |
| HW counter | PMU, DWT, ITM |
| Profiling visualization | Flamegraph, Tracealyzer |
| 베어메탈 | GPIO + 로직 분석기 |

## 자주 하는 실수

> ⚠️ "여기일 것 같다"

코드 읽기만으로 결정하면 80%는 틀립니다. 항상 측정합니다.

> ⚠️ Premature optimization

Donald Knuth가 "premature optimization is the root of all evil"이라고 했습니다. 측정한 다음에 최적화합니다.

> ⚠️ Micro-optimization

10% 시간만 차지하는 코드를 100배 빠르게 해도 전체로는 9% 개선에 그칩니다. 90% 코드를 2배 개선하는 쪽이 훨씬 큽니다.

> ⚠️ Optimize after release

production 데이터가 *최고의 input*입니다. 출시 후 실 사용 환경에서 프로파일링을 수행합니다.

## 정리

- **방법론 = 측정 → 가설 → 검증**입니다. 추측은 금지입니다.
- **USE**(Utilization·Saturation·Errors)와 **RED**(Rate·Errors·Duration)를 함께 씁니다.
- 임베디드에서는 *모든 자원에 USE를 적용*합니다(CPU·RAM·Bus·Cache·DMA·ISR·Mutex).
- 평균이나 single run의 함정을 피하려면 *분포와 다중 측정*이 필요합니다.
- ISR과 Lock이 *임베디드 bottleneck 상위 65%*를 차지합니다.

다음 편은 **성능 지표 정의**입니다. Latency·Throughput·Utilization을 다룹니다.

## 관련 항목

- [1-02: 성능 지표 정의](/blog/embedded/performance-engineering/part1-02-metrics)
- [1-07: 성능 모델링 (Amdahl, Roofline)](/blog/embedded/performance-engineering/part1-07-modeling)
- [Brendan Gregg's Systems Performance](https://www.brendangregg.com/sysperfbook.html)
