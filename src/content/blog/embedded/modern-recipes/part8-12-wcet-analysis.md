---
title: "8-12: WCET 분석"
date: 2026-05-16T04:00:00
description: "WCET와 ACET의 차이, 측정 기반과 static analysis, cache 영향, hard real-time 요구사항을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 100
tags: [recipes, performance, wcet]
---

## 한 줄 요약

> **"WCET는 *최악*의 실행 시간입니다."** Average가 아니라 worst가 마감 안에 들어와야 hard real-time이 성립합니다. cache, branch prediction, 분기 입력이 모두 변수입니다.

## 어떤 상황에서 쓰나

자동차 brake control, 의료기기 dosing pump, 항공 flight controller처럼 *마감을 놓치면 사고*인 시스템에서는 ACET(평균)이 아니라 WCET가 보장되어야 합니다. 평균 50 µs에 worst-case 200 µs인 control loop을 100 µs 주기로 돌리면 가끔 사고가 납니다.

상대적으로 가벼운 환경(soft real-time)에서도 WCET 분석은 유용합니다. *얼마나 느려질 수 있는지*를 알면 jitter 한계와 backlog 정책을 합리적으로 정할 수 있습니다.

## 핵심 개념

```text
ACET    Average-Case Execution Time
WCET    Worst-Case Execution Time
BCET    Best-Case Execution Time

WCET 분석 두 갈래
- measurement-based   여러 입력으로 측정해 worst를 추정
- static analysis     control flow + 칩 모델로 상한 증명
```

WCET를 키우는 4대 요인입니다.

| 1. branch | 분기 입력에 따라 다른 path |
|---|---|
| 2. loop | iteration 수가 input에 따라 변함 |
| 3. cache | miss/hit이 stream에 따라 달라짐 |
| 4. ISR | 다른 IRQ가 끼어들어 elongate |

```text
hard real-time     WCET ≤ deadline 필수 (mathematical guarantee)
firm real-time     일부 miss 허용 (quality 저하)
soft real-time     늦으면 useless이지만 안전엔 무관
```

## 코드 / 실제 사용 예

### 측정 기반 WCET 접근

```c
#include "DWT.h"    /* Cortex-M3+ Data Watchpoint and Trace */

uint32_t max_cycles = 0;

void measure_loop(void) {
    DWT->CYCCNT = 0;
    do_work();
    uint32_t c = DWT->CYCCNT;
    if (c > max_cycles) max_cycles = c;
}

/* 여러 입력 시나리오로 반복 호출 후 max 추출 */
```

DWT cycle counter는 Cortex-M3 이상에서 cycle 정밀도로 측정 가능합니다. 입력을 광범위하게 변화시켜 worst를 찾습니다.

### Loop bound 명시

```c
/* 정적 분석 도구에 loop bound를 알리는 annotation */
for (int i = 0; i < N; i++)
    process(buf[i]);
/* 이 N이 컴파일 시 결정되어야 정적 WCET 분석이 가능 */

/* 동적 N은 명시적 cap 필수 */
if (n > MAX_N) n = MAX_N;
for (int i = 0; i < n; i++) ...
```

WCET 분석 도구는 loop iteration 수의 상한을 알아야 합니다. unbounded loop은 도구에 *불가능 신호*를 줍니다.

### Worst-case input 만들기

```c
/* string parser의 WCET 측정 — escape 가 가장 비쌈 */
void test_worst(void) {
    char s[64];
    memset(s, '\\', 63);     /* 모두 escape */
    s[63] = 0;
    measure(parser, s);
}

void test_nominal(void) {
    measure(parser, "hello world");
}
```

worst-case input을 의도적으로 만들어 측정하면 측정 기반 분석의 한계를 메울 수 있습니다.

### Cache의 영향 측정

```c
/* cold cache vs hot cache */
void measure_cold(void) {
    invalidate_dcache();
    DWT->CYCCNT = 0;
    work();
    cold = DWT->CYCCNT;
}

void measure_hot(void) {
    work();     /* warm-up */
    DWT->CYCCNT = 0;
    work();
    hot = DWT->CYCCNT;
}
/* WCET = cold time */
```

cache가 비었을 때가 worst case입니다. WCET 측정은 *cold cache*로 합니다.

### ISR jitter 가산

```text
실제 WCET = code WCET + IRQ preemption + cache eviction
```

다른 ISR이 들어와 cache를 깨면 다음 iteration의 WCET가 더 늘어납니다. 시스템 전체 IRQ를 mock하여 측정합니다.

### Static analysis tool

| 도구 | 특징 |
|---|---|
| aiT (AbsInt) | ARM, PowerPC, AVR 지원, certification-grade |
| Bound-T | 오픈 source, control flow 분석 |
| Heptane | academic, simpler |
| TimeWeaver | Microsoft Research |

aiT 같은 도구는 binary와 칩 model을 함께 분석해 *수학적으로 증명된 WCET 상한*을 제공합니다. DO-178B/C 인증에 필요합니다.

### Cache-aware coding

```c
/* hot path를 cache line에 모음 */
__attribute__((section(".hot_text"), aligned(64)))
void critical_loop(void) {
    /* 모든 함수 호출이 같은 line 내에 있도록 */
}
```

WCET를 줄이려면 cache miss 가능성을 줄입니다. 작은 hot path는 cache lock으로 잠가두기도 합니다.

### Cache lock (Cortex-A)

```c
/* L2 cache lock — hot path를 evict 안 되게 */
l2_lock_range((uint32_t)critical_loop, 4096);
```

Cortex-A의 L2 cache는 way 단위 lock이 가능합니다. critical loop의 cache line을 영구히 잡아두면 deterministic latency가 보장됩니다.

### Disable cache (극단)

```c
/* 가장 결정적이지만 가장 느림 — control loop 안에서만 */
SCB_DisableDCache();
critical_section();
SCB_EnableDCache();
```

Cache를 끄면 모든 access가 RAM access이므로 deterministic하지만 평균 latency가 5~10배로 늘어납니다. 다른 모든 방법이 안 될 때 최후 수단입니다.

## 측정 / 성능 비교

PID control loop의 측정 결과 예시입니다.

```text
시나리오                  cycles      µs (Cortex-M4 72 MHz)
nominal input, hot cache  5400        75
nominal input, cold cache 8200        114
worst input, hot cache    9100        126
worst input, cold cache   13800       192
worst + IRQ preemption    18400       256
```

평균 75 µs인 loop의 WCET가 256 µs입니다. 100 µs 주기로는 쓸 수 없고, 300 µs는 되어야 안전합니다.

```text
도구별 결과 차이 (같은 코드)
measurement-based       9100 cycles (찾은 worst)
aiT static analysis    11400 cycles (증명된 상한)
```

정적 분석은 항상 더 보수적입니다. 안전한 상한을 *증명*하기 때문입니다.

## 자주 보는 함정

> ACET로 마감 계산

```text
"평균 50 µs인 loop을 100 µs 주기로" → 가끔 fail
```

deadline 계산은 *WCET 기반*입니다. 평균이 아닙니다.

> Hot cache로만 측정

```c
for (int i = 0; i < 1000; i++) measure(work);
```

1000번 반복하면 cache가 모두 hot이라 WCET 측정이 의미가 없습니다. 매 측정 전에 cache를 invalidate해야 합니다.

> Unbounded loop

```c
while (!data_ready);    /* 언제 끝날지 모름 */
```

unbounded loop은 WCET 분석 자체가 불가능합니다. timeout으로 상한을 둡니다.

> Recursion

```c
int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
```

recursion 깊이가 input에 의존하면 stack과 WCET 모두 unbounded입니다. iteration으로 변환합니다.

> Dynamic allocation 사용

```c
void rt_loop(void) {
    p = malloc(...);     /* allocator 자체의 WCET가 불분명 */
}
```

malloc의 WCET는 free list 길이에 의존합니다. real-time path에서는 pool 또는 static을 씁니다.

## 정리

- WCET는 *worst case*입니다. ACET로 deadline을 계산하면 가끔 fail합니다.
- 측정 기반은 worst input을 의도적으로 만들어 cold cache로 측정합니다.
- 정적 분석 도구는 수학적으로 증명된 상한을 제공합니다. 인증에 필수입니다.
- WCET를 키우는 4대 요인은 branch, loop, cache, ISR입니다.
- Cache lock과 cache disable은 deterministic latency를 위한 최후 수단입니다.
- malloc, recursion, unbounded loop은 real-time path에서 금지합니다.
- WCET와 deadline 사이에 안전 margin을 둡니다(50% 이상이 일반적).

다음 편부터 Part 9 **Concurrency 응용**으로 넘어갑니다.

## 관련 항목

- [PRTOS 1-10: Realtime Analysis](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [PRTOS 2-10: Scheduler Latency](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [PE 1-05: Realtime](/blog/embedded/performance-engineering/part1-05-realtime)
- [PE 2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
