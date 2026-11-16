---
title: "임베디드 성능 분석 방법론 — Measure → Analyze → Optimize 사이클"
slug: "embedded/performance-engineering/part1-01-methodology"
date: 2026-04-23T09:01:00
description: "감으로 최적화 금지. USE·RED 메서드, 임베디드 적용. 과학적 접근의 시작."
series: "Embedded Performance Engineering"
seriesOrder: 1
tags: [performance, methodology, use-method, red-method]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"측정 → 가설 → 검증"** 사이클이 핵심입니다. 추측으로 코드를 바꾸지 않습니다. 데이터가 답합니다.

## 왜 방법론이 필요한가

"느려요"라는 보고가 들어오면 먼저 관측 가능한 지표와 재현 조건을 정합니다. 코드만 읽고 병목을 짐작해 고치면, 고친 곳이 병목이 아니었을 때 시간만 쓰고 느린 증상은 그대로 남습니다. 그래서 가설을 측정으로 검증하고, 결과가 맞지 않으면 다음 원인으로 넘어갑니다.

이 원칙은 새로운 이야기가 아닙니다. Donald Knuth는 1974년 논문 "Structured Programming with go to Statements"(*Computing Surveys* 6(4), p.268)에서 측정 도구를 쓰는 프로그래머들의 공통 경험으로 "their intuitive guesses fail"이라고 적었습니다. 방법론은 이 짐작을 측정으로 바꾸고, 원인 후보를 체계적으로 좁혀 가는 절차입니다.

## Brendan Gregg의 USE 메서드

Brendan Gregg의 [USE Method 페이지](https://www.brendangregg.com/usemethod.html)는 방법을 한 문장으로 요약합니다. "For every resource, check utilization, saturation, and errors." 여기서 자원은 CPU, 디스크, 버스 같은 물리적 기능 요소입니다. 세 지표의 정의도 같은 페이지에 있습니다.

| 지표 | USE Method 페이지의 정의 |
| --- | --- |
| **U**tilization | 자원이 작업을 처리하느라 바빴던 평균 시간 |
| **S**aturation | 자원이 처리하지 못한 추가 작업의 정도. 대개 대기열에 쌓인다 |
| **E**rrors | 오류 이벤트의 개수 |

같은 페이지는 두 가지를 덧붙입니다. 하나는 "Some of these components may not exhibit utilization or saturation characteristics"로, 모든 자원에 세 지표가 다 있지는 않다는 점입니다. 다른 하나는 100% 사용률은 대개 병목의 신호이지만 포화 지표로 확인해야 하고, 평균 70%가 짧은 100% 구간을 숨길 수 있다는 점입니다. 그래서 사용률 하나로 판정하지 않고, 먼저 모든 자원의 세 지표를 훑은 다음 이상이 보이는 자원으로 들어갑니다.

## RED 메서드 (Service-Oriented)

RED는 Tom Wilkie가 2015년에 소개한 서비스 모니터링 방법입니다([Grafana 블로그](https://grafana.com/blog/the-red-method-how-to-instrument-your-services/)). USE가 자원을 본다면 RED는 요청을 봅니다.

| | Grafana 글의 정의 |
| --- | --- |
| **R**ate | 초당 요청 수 |
| **E**rrors | 그 요청 가운데 실패한 수 |
| **D**uration | 요청이 걸린 시간(글은 "some distribution of latency"라고 적습니다) |

임베디드에 옮기면 요청 대신 task나 ISR 한 번의 실행이 단위가 됩니다. task마다 실행 빈도, 실패 횟수, 실행 시간 분포를 기록합니다. 분포를 어떻게 요약할지는 1-04에서 다룹니다.

## 임베디드 적용

| 자원 | Utilization | Saturation | Errors |
| --- | --- | --- | --- |
| CPU | run 시간 / total | run queue 길이 | watchdog reset |
| RAM | heap used / total | OOM 카운트 | malloc 실패 |
| Flash | bandwidth 사용률 | wait state | ECC 오류 |
| Bus (AXI·AHB) | 트랜잭션/sec | outstanding TX | bus fault |
| Cache | target-specific counter | refill/miss counter (지원 시) | 구현별 오류 지표 |
| DMA | 채널 사용률 | 대기 descriptor | DMA error |
| ISR | duty cycle | nested depth | spurious IRQ |
| Mutex | hold time | wait list 길이 | timeout |

각 행을 모니터링하다가 비정상을 발견하면 drill down으로 좁혀 갑니다.

## 측정 → 가설 → 검증 사이클

### Step 1: Measure

Cortex-M3/M4/M7이라면 DWT의 cycle counter로 함수 하나의 실행 cycle을 잽니다. ARMv7-M Architecture Reference Manual(DDI 0403E) C1.8.3에 따르면 `CYCCNT`는 구현 여부가 선택인 32비트 카운터이고, `DWT_CTRL.CYCCNTENA`로 켭니다. DWT 레지스터에 접근하려면 먼저 `DEMCR.TRCENA`를 1로 둡니다(C1.6.5). 아래는 CMSIS 이름으로 쓴 최소 코드입니다.

```c
#include "core_cm4.h"          /* CMSIS: CoreDebug, DWT */

static uint32_t max_cycles;

void cyccnt_init(void)
{
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->CYCCNT = 0;
    DWT->CTRL  |= DWT_CTRL_CYCCNTENA_Msk;
}

void measure_once(void)
{
    uint32_t t1 = DWT->CYCCNT;
    suspicious_function();
    uint32_t d = DWT->CYCCNT - t1;   /* unsigned 뺄셈이라 한 번의 wrap은 문제없음 */
    if (d > max_cycles) max_cycles = d;
}
```

입력을 바꿔 가며 여러 번 재서 *분포*를 모읍니다. 최댓값 하나만 남기면 분포를 잃으므로, 실제로는 히스토그램 버킷에 누적합니다(1-04).

### Step 2: Hypothesize

"이 함수가 cache miss로 느리다"처럼 구체적인 가설을 세웁니다.

### Step 3: Verify

가설에 맞는 카운터를 켭니다. Linux가 도는 Armv8-A라면 perf에 PMU 이벤트 이름을 줍니다. L1 데이터 캐시 refill(이벤트 번호 0x0003)은 Linux 6.12 `drivers/perf/arm_pmuv3.c` 178행에서 `l1d_cache_refill`이라는 sysfs 이름으로 등록되고, perf의 일반 이벤트 `cache-misses`도 같은 이벤트에 매핑됩니다(48행).

```bash
perf stat -e cycles,instructions,l1d_cache,l1d_cache_refill -- ./app
```

이 이름은 코어가 PMCEID 레지스터로 그 이벤트를 지원한다고 알릴 때만 sysfs에 보입니다(같은 파일 269~280행 `armv8pmu_event_attr_is_visible`). 이 시리즈의 Debian 게스트(QEMU HVF)에서는 커널 로그에 `1 (0,80000000) counters available`가 찍히고 `/sys/bus/event_source/devices/armv8_pmuv3_0/events/`가 비어 있습니다. 그래서 위 명령은 `Bad event name`으로 거부되고, `cycles`·`instructions`만 주면 `<not supported>`가 나옵니다. 하드웨어 카운터 측정은 2-10에서 다룹니다.

카운터 값이 예측과 맞으면 가설을 지지하는 증거가 됩니다. 다만 refill 횟수만으로는 그것이 실행 시간의 원인인지 알 수 없습니다. 같은 실행의 cycle 수, 작업량(입력 크기) 변화와 함께 비교합니다.

## 흔한 함정

### 1. 평균만 본다

M2 Pro에서 16 KiB 배열을 더하는 함수 하나를 10만 번 재 보았습니다. 시간은 `clock_gettime_nsec_np(CLOCK_UPTIME_RAW)`로 읽었고, 이 타이머는 24 MHz(`sysctl hw.tbfrequency`)라 값이 약 41.7 ns 단위로 끊깁니다. 컴파일은 `clang -O2`(Apple clang 21), 같은 실행 파일을 다섯 번 돌렸습니다.

| 실행 | mean | p50 | p99 | p99.9 | max |
|---:|---:|---:|---:|---:|---:|
| 1 | 157 ns | 166 ns | 209 ns | 291 ns | 11,333 ns |
| 2 | 158 ns | 166 ns | 209 ns | 292 ns | 13,708 ns |
| 3 | 160 ns | 167 ns | 209 ns | 292 ns | 2,334 ns |
| 4 | 160 ns | 167 ns | 209 ns | 292 ns | 9,834 ns |
| 5 | 157 ns | 166 ns | 209 ns | 250 ns | 15,583 ns |

평균과 p99는 다섯 번 모두 거의 같지만, max는 p50의 14~94배이고 실행마다 6배 넘게 흔들립니다. 평균만 보고하면 이 꼬리가 보이지 않습니다.

실시간 요구사항에서는 최악 실행 시간의 근거가 중요합니다. 관측한 최대값은 시험한 입력과 환경에서의 표본 최대이며, 그 자체로 WCET 상한을 보장하지 않습니다. 목적에 따라 percentile과 표본 최대를 함께 보고합니다.

### 2. 측정 환경 = 실 환경 가정

위 측정은 다른 일을 하지 않는 루프 안에서 같은 16 KiB를 계속 읽었으므로, 두 번째 반복부터는 데이터가 L1에 남아 있습니다. 실제 제품에서는 다른 task와 DMA가 같은 캐시와 버스를 씁니다. 그래서 벤치 결과는 그 조건에서의 값으로만 쓰고, 판정은 실제 작업 부하를 건 상태에서 다시 잽니다.

### 3. Observer Effect

측정 코드도 실행 시간을 씁니다. 위 표의 값에도 `clock_gettime_nsec_np` 호출 두 번의 비용이 들어 있습니다. 반복 안에서 `printf`를 부르면 그 비용이 측정 대상보다 커지기 쉬우므로, 값은 메모리 배열에 모아 두고 측정이 끝난 뒤 출력합니다. Cortex-M에서는 `CYCCNT`를 읽는 것이 레지스터 load 한 번이라 이 비용이 가장 작습니다.

### 4. Single Run

위 표에서 3번 실행만 봤다면 max를 2.3 µs로, 5번만 봤다면 15.6 µs로 보고했을 것입니다. 반복 횟수는 보려는 꼬리 확률에 맞춰 정합니다. p99.9를 보려면 한 실행에 적어도 수천 개 표본이 있어야 그 위치에 값이 몇 개라도 놓입니다. 입력·환경·표본 수는 결과와 함께 기록합니다.

## 임베디드 특화 — Bottleneck 우선순위

아래는 임베디드 시스템에서 USE 표의 각 행을 훑을 때의 진단 항목입니다. 순서는 우선순위가 아니며, 어느 항목부터 들어갈지는 위 표에서 이상이 보인 자원으로 정합니다.

1. ISR 실행 시간과 도착 빈도
2. critical section과 lock 대기
3. 메모리·버스 대역폭과 대기
4. 지원되는 PMU의 cache event
5. DMA 동시 접근과 대기열

## Roofline Model 미리보기

Roofline은 지정된 메모리 계층과 작업량 가정에서 성능 상한을 `min(peak compute, bandwidth × operational intensity)`로 나타냅니다. 자세한 내용은 1-07에서 다룹니다.

![Roofline Model Preview — memory bound vs compute bound](/images/blog/perf-eng/diagrams/part1-01-roofline-preview.svg)

이 식에서 bandwidth × operational intensity 쪽이 작은 *memory-bound* 영역에서는 peak compute를 올려도 상한이 그대로입니다. 어느 영역인지부터 확인하는 이유입니다.

## 도구 분류 — 1-08에서 자세히

| 카테고리 | 도구 |
| --- | --- |
| Sampling | perf, gprof(PC 샘플링 히스토그램. 호출 그래프는 `-pg`가 넣는 `mcount` 호출로 수집) |
| Tracing | ftrace, LTTng, SystemView |
| HW counter | PMU, DWT, ITM |
| Profiling visualization | Flamegraph, Tracealyzer |
| 베어메탈 | GPIO + 로직 분석기 |

## 자주 하는 실수

> ⚠️ "여기일 것 같다"

코드만으로 결론을 내리지 말고, 측정으로 가설을 확인합니다.

> ⚠️ Premature optimization을 문맥 없이 인용하기

Knuth의 원문(1974, p.268)은 "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%."입니다. 바로 뒤에서 그는 중요한 코드를 *측정으로 찾은 뒤에* 주의 깊게 보라고 적습니다. 최적화하지 말라는 말이 아니라, 측정해서 찾은 곳을 최적화하라는 말입니다.

> ⚠️ 비중이 작은 코드의 micro-optimization

실행 시간의 10%를 차지하는 코드를 100배 빠르게 하면 전체 시간은 0.9 + 0.1/100 = 0.901, 즉 9.9% 줄어듭니다. 90%를 차지하는 코드를 2배 빠르게 하면 0.1 + 0.9/2 = 0.55로 45% 줄어듭니다. 이 계산이 1-07의 Amdahl 법칙입니다.

> ⚠️ 출시 전 입력으로만 측정하기

벤치 입력은 개발자가 고른 입력이라 실제 사용 입력의 분포를 대표한다는 보장이 없습니다. 필드에서 같은 지표(task별 실행 시간 분포, 최댓값)를 계속 기록할 수 있게 측정 코드를 제품에 남겨 두면, 출시 후의 입력으로 다시 판단할 수 있습니다.

## 정리

- **방법론 = 측정 → 가설 → 검증**입니다. 추측은 금지입니다.
- **USE**(Utilization·Saturation·Errors)와 **RED**(Rate·Errors·Duration)를 함께 씁니다.
- 임베디드에서도 USE/RED를 참고하되, 지표가 실제로 정의되는 자원에 적용합니다.
- 평균이나 single run의 함정을 피하려면 *분포와 다중 측정*이 필요합니다.
- ISR, lock, 메모리, DMA를 진단 후보로 두되 순서는 관측 결과로 정합니다.
- M2 Pro 측정에서 평균·p99는 실행마다 거의 같았지만 max는 2.3~15.6 µs로 흔들렸습니다. 꼬리는 반복 실행으로만 보입니다.

다음 편은 **성능 지표 정의**입니다. Latency·Throughput·Utilization을 다룹니다.

## 관련 항목

- [1-02: 성능 지표 정의](/blog/embedded/performance-engineering/part1-02-metrics)
- [1-07: 성능 모델링 (Amdahl, Roofline)](/blog/embedded/performance-engineering/part1-07-modeling)
- [Brendan Gregg's Systems Performance](https://www.brendangregg.com/sysperfbook.html)

## 참고 자료

- [Brendan Gregg, USE Method](https://www.brendangregg.com/usemethod.html)
- [GNU gprof manual, Implementation of Profiling](https://sourceware.org/binutils/docs/gprof/Implementation.html)
- [Grafana, The RED Method: How to instrument your services](https://grafana.com/blog/the-red-method-how-to-instrument-your-services/)
- Donald E. Knuth, "Structured Programming with go to Statements," *Computing Surveys* 6(4), 1974, pp.261-301
- ARMv7-M Architecture Reference Manual (DDI 0403E), C1.6.5 DEMCR, C1.8.3 CYCCNT
- Linux v6.12 [`drivers/perf/arm_pmuv3.c`](https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/drivers/perf/arm_pmuv3.c?h=v6.12.58)
