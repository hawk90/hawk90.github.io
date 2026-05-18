---
title: "1-01: 성능 분석 방법론 — Measure → Analyze → Optimize"
date: 2026-05-12T01:00:00
description: "감으로 최적화 금지. USE·RED 메서드, 임베디드 적용. 과학적 접근의 시작."
series: "Embedded Performance Engineering"
seriesOrder: 1
tags: [performance, methodology, use-method, red-method]
draft: true
---

## 한 줄 요약

> **"측정 → 가설 → 검증"** — 추측으로 코드 안 바꾼다. 데이터가 답한다.

## 왜 방법론이 필요한가

"느려요" 보고. 80% 개발자가 *코드 읽으며 추측* → "여기일 것 같다" → 수정 → 측정 → 변화 없음 → 다른 곳 → ...

**시간 낭비**. 더 큰 문제 — *원래 안 느렸던 코드*를 망가뜨림.

방법론 = *추측 대신 측정* + *체계적 좁히기*.

## Brendan Gregg의 USE 메서드

각 자원 (CPU, memory, disk, network)에 대해 3 지표 확인:

| 지표 | 의미 |
| --- | --- |
| **U**tilization | 자원 사용률 (%) |
| **S**aturation | 대기열 길이 (queueing) |
| **E**rrors | 오류 카운트 |

```text
CPU U=95%, S=0, E=0 → CPU bound
CPU U=50%, S=10, E=0 → run queue 적체 (스케줄링 문제)
CPU U=50%, S=0, E=많음 → 다른 곳 (디스크·메모리)
```

**먼저 모든 자원의 3 지표 훑기** → 병목 찾기. 그 다음 deep dive.

## RED 메서드 (Service-Oriented)

서비스 endpoint에 대해:

| | 의미 |
| --- | --- |
| **R**ate | 초당 요청 수 |
| **E**rrors | 실패율 |
| **D**uration | latency 분포 (p50, p99, p999) |

임베디드의 *task별* 적용 — 매 task의 *처리 빈도, 오류, 처리 시간*.

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

각 행을 *모니터링* → 비정상 발견 → drill down.

## 측정 → 가설 → 검증 사이클

### Step 1: Measure

```c
uint32_t t1 = DWT->CYCCNT;
suspicious_function();
uint32_t t2 = DWT->CYCCNT;
log_max(t2 - t1);
```

여러 input 시도, *분포* 수집. 평균보다 *p99·max*.

### Step 2: Hypothesize

"이 함수가 *cache miss*로 느리다" — 구체적 가설.

### Step 3: Verify

PMU counter 활성:

```c
// L1D cache miss count
read_pmu(L1D_CACHE_REFILL);
```

수치가 *예측*과 일치하면 가설 OK → 해결책 적용. 일치 안 하면 *다른 가설*.

## 흔한 함정

### 1. 평균만 본다

```text
Avg latency: 10 ms — 좋아 보임
p99: 50 ms        — 나쁨
max: 500 ms       — 끔찍
```

Real-time에선 *worst case가 진실*. **항상 percentile + max**.

### 2. 측정 환경 = 실 환경 가정

벤치: cool cache, no contention → 빠름
실 환경: hot system, bus saturation → 느림

**실 환경에서 측정** + *오랜 시간*.

### 3. Observer Effect

측정 코드 자체가 *시스템 영향* — printf, trace overhead. **Light-weight tracing** (DWT 카운터, ring buffer).

### 4. Single Run

한 번 측정 후 "이 정도구나" → 다음 실행 *완전 다름*. **최소 N=100 측정**, 분포 확인.

## 임베디드 특화 — Bottleneck 우선순위

대부분 임베디드 시스템에서 *문제 빈도*:

```text
1. ISR 길거나 nested (40%)
2. Critical section / lock contention (25%)
3. Memory bandwidth (15%)
4. Cache miss (10%)
5. DMA bottleneck (5%)
6. 기타 (5%)
```

처음엔 *ISR·lock* 확인. *Cache·DMA*는 그 다음.

## Roofline Model 미리보기

성능 = *min(peak compute, memory bandwidth)*. 1-07에서 자세히.

```text
Operational Intensity (FLOP/byte)
    ↑
    │ ✓ compute-bound (peak FLOPS)
    │
    │ × memory-bound (BW × intensity)
    └──────→
```

*Memory-bound* 코드는 CPU 빠르게 해도 *변화 없음*. 진단이 첫.

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

코드 읽기로 결정 → 80% 틀림. *항상 측정*.

> ⚠️ Premature optimization

Donald Knuth — "premature optimization is the root of all evil". 측정 *후* 최적화.

> ⚠️ Micro-optimization

10% 시간 차지하는 코드를 100× 빠르게 → 전체 9% 개선. 90% 코드의 *2× 개선*이 더 큼.

> ⚠️ Optimize after release

production 데이터가 *최고의 input*. 출시 후 실 사용 *프로파일링*.

## 정리

- **방법론 = 측정 → 가설 → 검증** — 추측 금지.
- **USE** (Utilization·Saturation·Errors) + **RED** (Rate·Errors·Duration).
- 임베디드는 *모든 자원에 USE 적용* (CPU·RAM·Bus·Cache·DMA·ISR·Mutex).
- 평균·single run 함정 회피 — **분포 + 다중 측정**.
- ISR·Lock이 *임베디드 bottleneck 상위 65%*.

다음 편은 **성능 지표 정의** — Latency·Throughput·Utilization.

## 관련 항목

- [1-02: 성능 지표 정의](/blog/embedded/performance-engineering/part1-02-metrics)
- [1-07: 성능 모델링 (Amdahl, Roofline)](/blog/embedded/performance-engineering/part1-07-modeling)
- [Brendan Gregg's Systems Performance](https://www.brendangregg.com/sysperfbook.html)
