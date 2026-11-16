---
title: "Embedded Performance Engineering — 임베디드 성능 엔지니어링 시리즈 소개"
slug: "embedded/performance-engineering/00-preface"
date: 2026-04-23T09:00:00
description: "왜 느린가? Cache miss, pipeline stall, bus contention부터 profiling 도구 활용까지. 임베디드 시스템 성능 분석의 모든 것."
series: "Embedded Performance Engineering"
seriesOrder: 0
tags: [performance, profiling, cache, optimization, perf, embedded, arm, risc-v]
type: tech
featured: true
topics: ["embedded"]
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

성능 관련 서적은 많습니다. Brendan Gregg의 *Systems Performance*는 훌륭한 책입니다. 다만 2판(Addison-Wesley, 2020)의 정식 제목은 *Systems Performance: Enterprise and the Cloud*이고, 저자 페이지에 실린 목차를 보면 겨냥하는 대상이 분명합니다.

1. **서버·클라우드 중심**: 11장이 Cloud Computing이고, 나머지 장도 CPUs·Memory·File Systems·Disks·Network처럼 서버 자원 단위로 나뉩니다.
2. **Linux 도구 중심**: 13~15장이 perf·Ftrace·BPF입니다.
3. **임베디드 장이 없음**: 목차에 bare-metal·RTOS·JTAG trace를 다루는 장이 없습니다.

임베디드에서는 출발점이 다릅니다.

- bare-metal이나 RTOS에는 perf·ftrace가 없습니다. 코어의 cycle counter를 직접 읽거나 GPIO를 토글해 오실로스코프로 봅니다. Armv7-M의 cycle counter는 DWT의 `CYCCNT`이고, ARMv7-M Architecture Reference Manual(DDI 0403E) C1.8.3은 이 32비트 카운터를 *선택 사항*으로 정의합니다. 구현 여부는 `DWT_CTRL.NOCYCCNT`로 확인합니다.
- 실시간 요구사항은 평균 처리량이 아니라 deadline으로 주어집니다. 그래서 최악값과 jitter를 따로 봅니다(1-05).
- 같은 일을 더 낮은 클럭으로 끝내는 것이 곧 전력 절감이라 성능과 전력을 함께 봅니다(3-08, 3-09).

## 이 시리즈의 실행 환경

글에 실린 측정값은 아래 환경에서 직접 돌린 결과이고, 글마다 명령과 반복 횟수를 함께 적습니다. 돌리지 못한 내용은 그렇다고 밝히고 TRM·사양서의 절 번호를 인용합니다.

| 환경 | 내용 | 할 수 있는 것과 없는 것 |
|---|---|---|
| Mac (Apple M2 Pro) | macOS 27.2.1, Apple clang 21. `sysctl` 기준 P코어 8개·E코어 4개, P코어 L1D 128 KiB·L2 16 MiB, E코어 L1D 64 KiB·L2 4 MiB, `hw.cachelinesize` 128 | 실제 하드웨어 시간 측정. `/usr/bin/time -l`이 instructions retired와 cycles elapsed를 보여 줍니다 |
| Debian 13 arm64 게스트 | QEMU HVF(`-cpu host`), 커널 6.12, GCC 14.2, perf 6.12, Valgrind 3.24 | perf의 소프트웨어 이벤트와 Cachegrind는 동작합니다. 게스트 부팅 로그에 `armv8_pmuv3_0 PMU driver, 1 (0,80000000) counters available`가 찍히고, `perf stat -e cycles,instructions`는 `<not supported>`를 돌려줍니다. 하드웨어 카운터 수치는 이 환경에서 얻지 못합니다 |
| arm-none-eabi-gcc 16.2 + QEMU 11.1 | `mps2-an386`(Cortex-M4) 등 | 코드 크기와 명령어 열은 확인할 수 있습니다. QEMU의 실행 시간은 하드웨어 타이밍이 아닙니다 |

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

**총 6개 Part, 56개 글**로 구성됩니다. 소개 글을 포함하면 이 시리즈는 57편입니다.

성능 분석의 기초부터 마이크로아키텍처, 시스템 레벨, 병렬 처리, 도구 활용, 실전 사례까지 체계적으로 다룹니다.

---

### Part 1: Performance Analysis Fundamentals (8개)

성능 분석의 기본 개념과 방법론을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 1-01 | 성능 분석 방법론 | 측정 → 분석 → 최적화 사이클 |
| 1-02 | 성능 지표 정의 | Latency, throughput, utilization |
| 1-03 | 측정의 기본 | wall-clock, CPU cycle, instruction |
| 1-04 | 통계적 분석 | 평균, 분산, 백분위수, 히스토그램 |
| 1-05 | 실시간 성능 분석 | WCET, jitter, deadline miss |
| 1-06 | 벤치마킹 기초 | 재현성, 워밍업, 노이즈 제거 |
| 1-07 | 성능 모델링 | Amdahl의 법칙, roofline model |
| 1-08 | 프로파일링 개요 | Sampling vs instrumentation |

---

### Part 2: CPU & Microarchitecture (10개)

마이크로아키텍처 수준의 성능 분석을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 2-01 | CPU 파이프라인 기초 | Fetch, decode, execute, writeback |
| 2-02 | Pipeline Stall 분석 | 데이터 해저드, 구조적 해저드 |
| 2-03 | Branch Prediction | 예측기 구조, misprediction 비용 |
| 2-04 | Speculative Execution | Out-of-order, 추측 실행 |
| 2-05 | Cache 기초 | L1/L2/L3, inclusive vs exclusive |
| 2-06 | Cache Miss 분석 | Compulsory, capacity, conflict |
| 2-07 | Cache Line 최적화 | 정렬, 프리페치, 패딩 |
| 2-08 | Memory Bandwidth | 대역폭 측정, 병목 진단 |
| 2-09 | SIMD/NEON 최적화 | 벡터화, intrinsics |
| 2-10 | PMU와 하드웨어 카운터 | ARM PMU, RISC-V HPM |

---

### Part 3: System Level Performance (12개)

시스템 수준의 병목을 분석합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 3-01 | Bus Architecture | AHB, AXI, 버스 대역폭 |
| 3-02 | Bus Contention | Arbitration, 우선순위, starvation |
| 3-03 | DMA 성능 분석 | 채널, 버스트, CPU overlap |
| 3-04 | DMA vs CPU Copy | 언제 DMA가 유리한가 |
| 3-05 | Interrupt Latency | ISR 진입 시간, tail-chaining |
| 3-06 | Interrupt Storm | 원인 진단, rate limiting |
| 3-07 | Memory-Mapped I/O | MMIO 성능, 캐시 정책 |
| 3-08 | Peripheral Clock | 클럭 설정, 전력-성능 trade-off |
| 3-09 | Power vs Performance | DVFS, 저전력 모드 영향 |
| 3-10 | Thermal Throttling | 온도 모니터링, 성능 저하 |
| 3-11 | CXL·Interconnect | CXL 2.0/3.1, Neoverse V2, AI 메모리 대역폭 |
| 3-12 | CXL 메모리 지연 | 지연 시간 측정과 메모리 계층 |

---

### Part 4: Concurrency & Synchronization (10개)

병렬 처리와 동기화의 성능을 분석합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 4-01 | Concurrency 기초 | 병렬성 vs 동시성 |
| 4-02 | False Sharing | 캐시라인 충돌, 패딩 해결 |
| 4-03 | Lock Contention 측정 | 대기 시간, 경합률 |
| 4-04 | Spinlock 성능 | 언제 spinlock이 유리한가 |
| 4-05 | Mutex 성능 | 컨텍스트 스위치 비용 |
| 4-06 | Reader-Writer Lock | 읽기 우선, 쓰기 우선 |
| 4-07 | Lock-free 기초 | CAS, ABA 문제 |
| 4-08 | Memory Ordering | Acquire-release, barrier |
| 4-09 | Cache Coherency | MESI, 멀티코어 동기화 |
| 4-10 | SMP 성능 분석 | 코어별 부하, affinity |

---

### Part 5: Profiling Tools (11개)

도구별 실전 가이드를 제공합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 5-01 | perf 기초 | stat, record, report |
| 5-02 | perf 고급 | 이벤트, 필터, 스크립트 |
| 5-03 | ftrace 활용 | function tracer, latency tracer |
| 5-04 | eBPF/bpftrace | 동적 추적, 커스텀 분석 |
| 5-05 | Flamegraph 분석 | CPU flamegraph, off-cpu |
| 5-06 | ARM DS / Lauterbach | 임베디드 전용 도구 |
| 5-07 | Bare-metal 프로파일링 | GPIO, DWT, cycle counter |
| 5-08 | Nsight Systems | GPU/NPU 포함 시스템 |
| 5-09 | Tracy·Hotspot·uftrace | 저오버헤드 모던 프로파일러 |
| 5-10 | Parca·Pixie·Cilium | eBPF 연속 프로파일링 |
| 5-11 | CXL 프로파일링 도구 | CXL 메모리 계층 관측 도구 |

---

### Part 6: Real-World Case Studies (5개)

실전 사례를 통해 분석 과정을 보여줍니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 6-01 | 사례: ISR Latency 문제 | 원인 추적, 해결 과정 |
| 6-02 | 사례: Cache Thrashing | 메모리 레이아웃 최적화 |
| 6-03 | 사례: Lock Contention | 동기화 구조 개선 |
| 6-04 | 사례: DMA 성능 튜닝 | 버스 최적화 |
| 6-05 | 사례: CXL LLM KV cache | 대용량 메모리 계층 분석 |

---

## 학습 로드맵

- **성능 분석 입문자** — Part 1 (기초) → Part 2 (CPU) → Part 5 (도구)
- **마이크로아키텍처 최적화** — Part 2 (CPU) → Part 3 (시스템) → Part 6 (사례)
- **멀티코어/동시성** — Part 4 (동시성) → Part 3-09/10 → Part 6 (사례)

## 핵심 원칙

### 측정 없이 최적화하지 않는다

"왠지 여기일 것 같다"는 감으로 코드를 바꾸지 않습니다.

### 평균값만 보지 않는다

실시간 시스템에서는 p99, max, jitter가 더 중요합니다.

### CPU 사용률만 보지 않는다

CPU 사용률이 낮아도 memory, bus, lock, interrupt를 기다리는 시간이 병목이 됩니다. 3-02에서는 CPU를 거의 쓰지 않는 thread가 다른 thread의 메모리 traffic 때문에 2.5배 이상 느려졌습니다.

### 관측 → 가설 → 검증

항상 **관측 지표 → 원인 후보 → 검증 실험** 순서로 진행합니다.

## 무엇을 측정할 것인가

| 지표 | 의미 | 측정 방법 |
|-----|-----|----------|
| wall-clock latency | 실제 경과 시간 | 타이머, GPIO toggle |
| CPU cycle | 명령어 실행 시간 | DWT, PMU |
| instruction count | 실행된 명령어 수 | PMU |
| cache miss | 캐시 적중 실패 | PMU counter |
| branch miss | 분기 예측 실패 | PMU counter |
| IRQ frequency | 인터럽트 빈도 | 카운터 |
| lock wait time | 락 대기 시간 | instrumentation |
| memory bandwidth | 메모리 대역폭 | PMU, 벤치마크 |

## 사전 지식

- C 프로그래밍
- 컴퓨터 구조 기초 (CPU, 메모리, 캐시)
- Linux 기초 (선택사항)
- 어셈블리 기초 (선택사항)

## 레퍼런스

**서적·문서**
- Brendan Gregg, *Systems Performance: Enterprise and the Cloud*, 2nd ed., Addison-Wesley, 2020 ([목차](https://www.brendangregg.com/systems-performance-2nd-edition-book.html))
- John L. Hennessy, David A. Patterson, *Computer Architecture: A Quantitative Approach*, 6th ed., 2017 ([Elsevier](https://shop.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1))
- Ulrich Drepper, [*What Every Programmer Should Know About Memory*](https://www.akkadia.org/drepper/cpumemory.pdf), Red Hat, 2007-11-21
- Denis Bakhvalov 외, [*Performance Analysis and Tuning on Modern CPUs*](https://github.com/dendibakh/perf-book)

**도구**
- [perf Wiki](https://perf.wiki.kernel.org/)
- [Brendan Gregg's perf](https://www.brendangregg.com/perf.html)
- [eBPF](https://www.brendangregg.com/ebpf.html)
- [Flamegraphs](https://www.brendangregg.com/flamegraphs.html)

**블로그**
- [Brendan Gregg's Blog](https://www.brendangregg.com/)
- [Denis Bakhvalov's Blog](https://easyperf.net/)
- [Daniel Lemire's Blog](https://lemire.me/blog/)

**임베디드 특화**
- **ARM PMU**: Performance Monitoring Unit
- **Lauterbach Trace32**: 하드웨어 트레이스
- **SEGGER SystemView**: RTOS 분석
- **Nsight Systems**: NVIDIA edge AI

## 이 시리즈의 목표

이 시리즈를 완주하면:

- **"느리다"를 숫자로 정의**할 수 있다
- **병목을 분류**할 수 있다 (CPU, 메모리, 버스, 동기화)
- **가설을 세우고 검증**할 수 있다
- **도구를 선택하고 해석**할 수 있다
- **최적화 trade-off를 설명**할 수 있다
- **실시간 성능 요구사항을 분석**할 수 있다

---

다음 글: [Part 1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
