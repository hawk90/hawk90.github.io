---
title: "Embedded Performance Engineering: 서문"
date: 2026-05-12
description: "왜 느린가? Cache miss, pipeline stall, bus contention부터 profiling 도구 활용까지. 임베디드 시스템 성능 분석의 모든 것."
series: "Embedded Performance Engineering"
seriesOrder: 0
tags: [performance, profiling, cache, optimization, perf, embedded]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

"느려요."

개발자가 가장 듣기 싫어하는 말 중 하나입니다. 특히 임베디드 시스템에서는 더욱 그렇습니다. 서버라면 인스턴스를 늘리면 되지만, 임베디드는 **주어진 하드웨어 안에서** 해결해야 합니다.

문제는 "느리다"는 증상만으로는 **원인을 알 수 없다**는 것입니다:

- CPU가 바쁜 건가? I/O를 기다리는 건가?
- Cache miss가 많은 건가? Branch misprediction인가?
- Lock contention인가? False sharing인가?
- 메모리 bandwidth가 부족한가? Bus가 포화 상태인가?

이 시리즈는 **"왜 느린가?"**에 답하는 방법을 다룹니다.

## 왜 이 시리즈가 필요한가

성능 관련 서적은 많습니다. Brendan Gregg의 *Systems Performance*는 훌륭한 책입니다. 하지만:

1. **서버/클라우드 중심**: 대부분의 예제가 대규모 시스템
2. **Linux 가정**: Bare-metal이나 RTOS는 다루지 않음
3. **범용 도구 중심**: 임베디드 특화 도구(ARM DS-5, Trace32)는 없음

임베디드 성능 최적화에는 **다른 접근**이 필요합니다:

- 메모리가 수 MB~GB 수준
- CPU 코어가 1~8개
- 전용 프로파일러가 없거나 제한적
- 실시간 제약 조건 존재
- 전력 소모 고려 필요

## 성능 분석의 3단계

```
측정 → 분석 → 최적화
 ↑_______________↓
```

1. **측정 (Measure)**
   - 무엇이 느린지 정량화
   - "느린 것 같다" → "이 함수가 전체의 40%를 차지한다"

2. **분석 (Analyze)**
   - 왜 느린지 원인 파악
   - "40%를 차지한다" → "cache miss rate가 30%이다"

3. **최적화 (Optimize)**
   - 원인을 해결
   - "cache miss rate 30%" → "데이터 구조를 cache-friendly하게 변경"

이 시리즈는 각 단계에서 **무엇을 봐야 하는지**, **어떤 도구를 쓰는지**, **어떻게 해석하는지**를 다룹니다.

## 대상 독자

1. **"느려요" 버그를 자주 받는 분**
   - 어디서부터 봐야 할지 모르겠는 분
   - printf 찍어보는 것 외에 방법이 없는 분

2. **perf, ftrace를 들어봤지만 써본 적 없는 분**
   - 도구는 알지만 실전 적용이 어려운 분
   - 출력 결과를 어떻게 해석해야 할지 모르는 분

3. **하드웨어 성능 특성을 이해하고 싶은 분**
   - Cache hierarchy, memory bandwidth
   - Pipeline, branch prediction
   - Bus architecture, DMA

## 시리즈 구성

총 4개 Part, 16개 글로 구성됩니다:

| Part | 주제 | 글 수 |
|------|-----|-------|
| 1 | CPU & Memory | 4 |
| 2 | System Level | 4 |
| 3 | Concurrency | 4 |
| 4 | Profiling Tools | 4 |

### Part 1: CPU & Memory

마이크로아키텍처 수준의 성능 분석:

- Cache miss 분석 및 최적화
- Branch prediction과 speculative execution
- Pipeline stall 원인
- Memory ordering과 barrier

### Part 2: System Level

시스템 수준의 병목 분석:

- Bus contention과 arbitration
- DMA와 CPU overlap
- Interrupt storm 진단
- False sharing 탐지

### Part 3: Concurrency

병렬 처리 성능 분석:

- Lock contention 측정
- Spinlock vs mutex 선택
- Reader-writer 패턴
- Wait-free 알고리즘

### Part 4: Profiling Tools

도구별 실전 가이드:

- perf 완전 정복
- ftrace 활용법
- eBPF/bpftrace
- Flamegraph 분석

## 이 시리즈의 차별점

| 기존 자료 | 이 시리즈 |
|----------|----------|
| 서버/클라우드 중심 | 임베디드 중심 |
| 이론 설명 | 실전 예제 |
| 도구 소개 | 해석 방법 |
| "이렇게 하면 빨라진다" | "왜 느린지 찾는 법" |

## 자주 하는 실수

임베디드 성능 분석에서 반복적으로 보게 되는 실수들이 있습니다:

1. **측정 없이 최적화한다**
   - "왠지 여기일 것 같다"는 감으로 코드를 바꿈
   - 결과적으로 더 복잡해졌지만 빨라졌는지는 모름

2. **평균값만 본다**
   - 평균 latency는 괜찮지만 worst-case가 문제인 상황을 놓침
   - 실시간 시스템에서는 p99, max, jitter가 더 중요할 때가 많음

3. **CPU 사용률만 본다**
   - 실제 병목은 memory, bus, lock, interrupt일 수 있음
   - CPU가 30%인데도 체감상 느린 시스템이 존재함

4. **알고리즘과 마이크로아키텍처를 분리해서 본다**
   - 빅오가 좋아도 cache locality가 나쁘면 더 느릴 수 있음
   - 반대로 알고리즘은 단순해도 데이터 배치만 바꿔 큰 개선이 나올 수 있음

이 시리즈는 이런 실수를 피하기 위해 항상 **관측 지표 → 원인 후보 → 검증 실험** 순서로 설명합니다.

## 무엇을 측정할 것인가

속도 문제를 다룰 때는 적어도 다음 항목 중 몇 개는 같이 봐야 합니다:

- wall-clock latency
- CPU cycle
- instruction count
- cache miss / branch miss
- IRQ frequency
- lock wait time
- memory bandwidth
- DMA overlap ratio

같은 "느리다"라도 어떤 지표가 나쁜지에 따라 해법은 완전히 달라집니다.

## 읽는 순서

독자 상황에 따라 시작점을 다르게 잡아도 됩니다:

- bare-metal/RTOS에서 ISR, DMA, cache 문제가 많다면: Part 1 → Part 2
- Linux embedded에서 `perf`, `ftrace`가 필요하다면: Part 4 먼저
- multicore contention, spinlock, false sharing 문제가 있다면: Part 3 먼저

다만 최소한 첫 두세 글은 읽고 가는 편이 좋습니다. 성능 문제는 도구 사용법보다 **가설 세우는 순서**가 더 중요하기 때문입니다.

## 사전 지식

- C 프로그래밍
- Linux 기초 (터미널, 기본 명령어)
- 컴퓨터 구조 기초 (CPU, 메모리, 캐시 개념)

## 레퍼런스

**서적**
- *Systems Performance* (2nd ed) - Brendan Gregg
- *Computer Architecture: A Quantitative Approach* - Hennessy & Patterson
- *What Every Programmer Should Know About Memory* - Ulrich Drepper

**도구**
- [perf](https://www.brendangregg.com/perf.html)
- [eBPF](https://www.brendangregg.com/ebpf.html)
- [Flamegraphs](https://www.brendangregg.com/flamegraphs.html)

**블로그**
- [Brendan Gregg's Blog](https://www.brendangregg.com/)
- [Denis Bakhvalov's Blog](https://easyperf.net/)

**2025-2026 최신 도구**
- **eBPF/bpftrace**: 커널 5.15+ 완전 지원
- **timerlat tracer**: 실시간 latency 분석
- **Cortex-M85 + Helium**: 4x ML, 3x DSP 성능
- **NVIDIA Nsight Systems**: Edge AI 프로파일링

## 이 시리즈의 목표

이 시리즈를 다 읽고 나면 최소한 다음은 가능해야 합니다:

- "느리다"를 숫자로 다시 정의하기
- 병목을 CPU, 메모리, 버스, 동기화 문제로 분류하기
- 한 번의 측정 결과를 과해석하지 않고 검증 실험을 설계하기
- 최적화 후 성능과 코드 복잡도 사이의 trade-off를 설명하기

---

다음 글: [Part 1-1: Cache Miss 분석](/blog/embedded/performance-engineering/part1-01-cache-miss)
