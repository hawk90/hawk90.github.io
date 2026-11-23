---
title: "WCET 분석 기법 — Static·Measurement·Hybrid 방법론"
slug: "embedded/modern-recipes/part8-12-wcet-analysis"
date: 2026-04-17T09:11:00
description: "WCET와 ACET의 차이, 측정 기반과 static analysis, cache 영향, hard real-time 요구사항을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 100
tags: [recipes, performance, wcet]
topics: ["embedded"]
---

## 한 줄 요약

> WCET는 명시한 코드·입력·하드웨어·간섭 조건에서 가능한 실행시간의 상한입니다. 측정 중 관찰한 최댓값과 구분하고, 시스템의 deadline은 선점·blocking·IRQ 간섭까지 포함해 분석합니다.

## 어떤 상황에서 쓰나

자동차 brake control, 의료기기 dosing pump, 항공 flight controller처럼 *마감을 놓치면 위험*한 시스템에서는 ACET(평균)만으로는 부족하고 검증 가능한 실행시간 상한이 필요합니다. 평균과 관측된 worst-case가 deadline 안에 있어도 분석 범위 밖의 경로·간섭을 놓치지 않았는지 확인해야 합니다.

상대적으로 가벼운 환경(soft real-time)에서도 WCET 분석은 유용합니다. *얼마나 느려질 수 있는지*를 알면 jitter 한계와 backlog 정책을 합리적으로 정할 수 있습니다.

## 핵심 개념

| 약어 | 의미 |
|------|------|
| ACET | Average-Case Execution Time |
| WCET | Worst-Case Execution Time |
| BCET | Best-Case Execution Time |

접근은 보통 세 가지로 조합합니다.

- **measurement-based** — 정한 시험 범위에서 실행을 측정. 관측 최댓값은 상한 증명이 아님
- **static analysis** — control flow와 processor/platform model 및 가정으로 upper bound 계산
- **hybrid** — 정적 구조 분석과 target 측정·실험을 결합하고 각 증거 범위를 기록

실행시간 상한에 영향을 주는 대표 요소입니다.

| 요소 | 영향 예 |
|---|---|
| branch | 입력에 따라 control-flow path가 달라짐 |
| loop | 입력·상태에 따라 반복 수가 달라짐 |
| cache/memory | hit/miss, bus contention, memory latency |
| interrupt | IRQ와 higher-priority task의 interference |

| 등급 | 의미 |
|------|------|
| hard real-time | 시스템 응답시간 상한이 deadline 이내여야 함. 실행시간 외 blocking·선점·IRQ도 포함 |
| firm real-time | 늦게 끝난 결과의 가치는 보통 없지만, 시스템이 일부 miss를 허용할 수 있음 |
| soft real-time | 늦을수록 유용성이 낮아지는 경향. 안전 영향은 응용 시스템으로 판단 |

## 코드 / 실제 사용 예

### 측정 기반 WCET 접근

```c
#include "core_cm4.h" /* 예: CMSIS header. DWT가 있는 core와 구현에서만 사용 */

uint32_t max_cycles = 0;

void measure_loop(void) {
    uint32_t start = DWT->CYCCNT; /* counter initialization is platform-specific */
    do_work();
    uint32_t c = DWT->CYCCNT - start; /* unsigned wrap; 구간은 counter 한 주기보다 짧아야 함 */
    if (c > max_cycles) max_cycles = c;
}

/* 여러 입력 시나리오로 반복 호출 후 max 추출 */
```

DWT CYCCNT는 모든 Cortex-M에 있는 기능이 아니며, core·debug 구현·clock 설정에 따라 사용 조건이 다릅니다. 초기화에서 trace/cycle counter enable과 counter wrap을 확인하고 계측 구간의 함수 호출·interrupt 조건을 기록합니다. measurement interval에 선점 IRQ가 포함되는지, timer read와 wrapper의 계측 비용이 얼마인지도 정의합니다. 반복 측정의 최대값은 관측 결과이지 WCET 증명이 아닙니다. [CMSIS DWT register map](https://arm-software.github.io/CMSIS_6/latest/Core/regMap_pg.html).

### Loop bound 명시

```c
/* fragment: MAX_N은 입력 계약이 보장하는 최대 record 수 */
if (n > MAX_N) return INPUT_OUT_OF_RANGE;
for (size_t i = 0; i < n; i++) {
    process(buf[i]);
}
```

분석에는 loop 반복 수의 상한과 입력 범위가 필요합니다. 정적 분석기가 상한을 추론하지 못하면 결과가 미산출되거나 보수적으로 커질 수 있습니다. 상한을 문서·annotation으로 보탤 때는 제품 입력 계약과 실제 코드 검사를 일치시킵니다.

### Worst-case input 만들기

parser 입력은 정상 길이, 최대 길이, escaping, malformed data와 error path 등 요구사항의 partition으로 나눠 시험합니다. 어떤 입력 경로가 느린지는 코드와 compiler output으로 확인한 뒤 target에서 측정합니다. 특정 escape 문자가 항상 worst라고 가정하지 않으며, 입력 집합 시험은 미실행 경로·IRQ 간섭·hardware state를 자동으로 증명하지 않습니다.

### Cache의 영향 측정

실험 전에 cache state를 명시하고 hot·cold·전이 상태의 입력과 계측 경계를 나눕니다. cold cache가 항상 worst case는 아닙니다. 임의의 `invalidate_dcache()`는 dirty line 처리·다른 task 영향·instruction cache를 고려하지 않으면 안전하지 않습니다. target에 맞는 cache maintenance 절차를 사용하고, DMA·bus contention·interrupt와 cache 상태의 조합을 분석합니다.

### ISR jitter 가산

응답시간 상한에는 분석 대상 실행시간, 우선순위가 높은 작업과 IRQ 간섭, blocking, 포함하기로 한 계측·scheduler overhead를 반영합니다. 실제 response-time analysis는 IRQ 주기·최악 실행시간·중첩/우선순위·비선점 구간과 shared-resource blocking을 포함합니다. mock 측정만으로 시스템 간섭의 상한을 확정하지 않습니다.

### Static analysis 결과 읽기

도구를 선택할 때는 target ISA/CPU와 memory hierarchy 지원, compiler/binary 형식, loop-bound 입력 방식, 분석 결과의 가정·미해결 경로를 확인합니다. 분석 보고서는 binary hash, tool/model version, 설정·annotation, 경고와 미분석 경로를 함께 보존합니다. 도구의 상한은 그 processor model과 명시된 가정 범위 안에서만 해석하며, certification 적합성은 도구 이름만으로 결정되지 않습니다.

도구 예로 AbsInt는 aiT를 binary 기반 static WCET analyzer로, Rapita는 RapiTime을 measurement와 분석을 결합하는 timing/WCET 도구로 소개합니다. 둘은 접근 방식이 다르므로 대상 processor, compiler와 요구 assurance 수준을 공급자 문서에서 대조합니다. ([aiT overview](https://www.absint.com/flyers/aiT.pdf), [RapiTime overview](https://www.rapitasystems.com/products/rapitime))

### Cache-aware coding

```c
/* 특정 section 배치는 linker와 cache 모델을 함께 설계해야 함 */
__attribute__((section(".critical_text"), aligned(64)))
void critical_loop(void) {
    /* 함수 정렬만으로 호출·데이터의 cache hit을 보장하지 않음 */
}
```

section 배치와 정렬은 cache line 크기와 실제 linker placement를 맞추기 위한 수단일 뿐 cache hit이나 WCET를 보장하지 않습니다. instruction/data cache, eviction, bus arbitration과 code/data 경로를 포함해 분석합니다.

### Cache lockdown

Cache lockdown은 core 이름만으로 지원 여부나 범위를 단정할 수 없습니다. 해당 core와 SoC manual을 확인하고, 사용 가능한 way/line 범위와 memory·bus 간섭을 분석해야 deterministic latency를 주장할 수 있습니다.

### Disable cache (극단)

cache를 끄면 접근 경로·latency·coherency·DMA 동작이 바뀝니다. 모든 access가 같은 시간이 되거나 deterministic해지는 것은 아니며, 임의 critical section에서 cache 상태를 바꾸지 않습니다.

## 측정 / 성능 비교

다음 수치는 설명을 위한 가정값이며 보드 측정 결과가 아닙니다. cycle-to-time 환산은 다음과 같습니다.

```text
가정한 구간               cycles      µs (72 MHz 가정)
sample A                   5400        75.0
sample B                   8200        113.9
sample C                  13800        191.7
sample D                  18400        255.6
```

계산은 `time = cycles / clock_hz`입니다. 이 가정값은 평균·WCET를 나타내지 않으며, cycle만으로 100 µs 주기의 schedulability나 300 µs deadline의 안전성을 결론내릴 수 없습니다.

측정 기반 최대와 static upper bound를 나란히 기록할 때는 binary·입력 범위·processor model·interrupt 조건을 맞추고, 각 결과가 포함하는 overhead를 적습니다. static 결과가 항상 측정보다 크거나, 도구 출력만으로 요구사항에 대한 안전성이 증명되는 것은 아닙니다.

## 자주 보는 함정

> ACET로 마감 계산

평균 50 µs라는 정보만으로 100 µs deadline을 만족한다고 판단할 수 없습니다. task response time에는 실행시간 외 선점·blocking·IRQ와 release jitter를 포함합니다.

> Hot cache로만 측정

```c
for (int i = 0; i < 1000; i++) measure(work); /* 뒤의 표본은 같은 cache state가 아님 */
```

반복 호출은 cache와 predictor state를 바꿉니다. hot/cold/상태 전이별 측정 목표를 정하고, cache invalidate는 dirty line·DMA coherency·다른 task 영향을 반영한 target-specific 절차로 수행합니다. invalidate가 항상 요구되는 것은 아닙니다.

> Unbounded loop

```c
while (!data_ready);    /* 언제 끝날지 모름 */
```

loop 종료 조건과 최대 반복 횟수를 입력 계약·코드로 제한합니다. timeout도 timer 오차와 timeout 처리 경로를 포함해 분석해야 합니다.

> Recursion

```c
int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
```

recursion depth가 제한되지 않거나 증명되지 않으면 stack과 실행시간 상한 분석이 어려워집니다. 최대 깊이를 제한·검사하거나 반복문으로 바꾸고, 선택한 분석 도구의 recursion 지원과 stack 모델을 확인합니다.

> Dynamic allocation 사용

```c
void rt_loop(void) {
    p = malloc(...);     /* allocator 자체의 WCET가 불분명 */
}
```

allocator의 worst-case는 구현·heap state·동기화에 좌우됩니다. critical path에서는 allocation을 피하거나 bounded request/state와 synchronization을 전제로 상한을 분석한 allocator를 사용합니다.

## 정리

- WCET는 *worst case*입니다. ACET로 deadline을 계산하면 가끔 fail합니다.
- 측정 기반은 입력 경계와 cache/interrupt 상태를 정의해 관측 결과의 범위를 기록합니다.
- 정적 분석 도구는 명시한 모델과 가정 범위에서 상한을 계산하며, 인증 필요 여부는 시스템 표준과 프로젝트 범위로 정합니다.
- branch, loop, cache와 IRQ는 가능한 실행시간·간섭에 영향을 주는 요소입니다.
- Cache lockdown/disable은 target이 지원하는지 확인하고 전체 memory hierarchy와 coherency 영향을 분석합니다.
- allocation·recursion·loop은 bounded 동작과 상한을 입증할 수 있는지 확인합니다.
- WCET와 deadline 사이의 margin은 간섭·측정 오차·요구사항으로 정하고 근거를 남깁니다.

다음 편부터 Part 9 **Concurrency 응용**으로 넘어갑니다.

## 관련 항목

- [PRTOS 1-10: Realtime Analysis](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [PRTOS 2-10: Scheduler Latency](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [PE 1-05: Realtime](/blog/embedded/performance-engineering/part1-05-realtime)
- [PE 2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
