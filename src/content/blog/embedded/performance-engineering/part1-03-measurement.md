---
title: "1-03: 측정의 기본 — Wall-Clock, CPU Cycle, Instruction Count"
date: 2026-05-12T03:00:00
description: "어떻게 측정하나. DWT, PMU, clock_gettime, GPIO + 로직 분석기. Overhead 줄이기."
series: "Embedded Performance Engineering"
seriesOrder: 3
tags: [measurement, dwt, pmu, clock-gettime, gpio]
draft: true
---

## 한 줄 요약

> **"무엇을 측정하느냐가 절반"** — wall-clock·cycle·instruction이 *다른 답*을 준다.

## 3 종류의 시간

### Wall-Clock Time

*실제 경과 시간* — 사용자 체감.

```c
struct timespec t1, t2;
clock_gettime(CLOCK_MONOTONIC_RAW, &t1);
work();
clock_gettime(CLOCK_MONOTONIC_RAW, &t2);
long ns = (t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec);
```

장점 — 직관적. 단점 — *context switch·IRQ·DMA 포함* 시 부정확.

### CPU Cycle (CPU Time)

*실제 코드 실행 cycle*. IRQ·idle 제외.

```c
// Cortex-M
DWT->CYCCNT = 0;
work();
uint32_t cycles = DWT->CYCCNT;
```

*pure compute time*. Context switch 영향 X (CYCCNT는 cycle 그대로).

### Instruction Count

PMU의 `INST_RETIRED` event.

```c
read_pmu(INST_RETIRED);
work();
uint64_t insts = read_pmu(INST_RETIRED) - start;
```

IPC = inst / cycle. *architecture 효율* 분석.

## Bare-Metal — DWT_CYCCNT

Cortex-M3+ 내장 32-bit cycle counter.

```c
// Initialization (once)
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CYCCNT = 0;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

// Use
uint32_t start = DWT->CYCCNT;
work();
uint32_t cycles = DWT->CYCCNT - start;
uint32_t us = cycles / (SystemCoreClock / 1000000);
```

**1-cycle 정밀**. 32-bit @ 168 MHz → ~25 sec wraparound. *짧은 측정만*.

### Cortex-M0 — DWT 없음

ARMv6-M에는 DWT 없음. **SysTick** 사용:

```c
uint32_t systick_get_us(void) {
    return (SysTick->LOAD - SysTick->VAL) / (SystemCoreClock / 1000000);
}
```

Reload value에 의존 — *카운터가 reload될 때* tick interrupt. 측정 *> 1 tick* 시 누적.

## Linux — clock_gettime

```c
struct timespec t;
clock_gettime(CLOCK_MONOTONIC_RAW, &t);
// CLOCK_MONOTONIC_RAW = NTP·adjustment 영향 X
// CLOCK_PROCESS_CPUTIME_ID = 이 프로세스 CPU 시간만
// CLOCK_THREAD_CPUTIME_ID = 이 thread만
```

각 clock의 의미:

| Clock | 의미 |
| --- | --- |
| `CLOCK_REALTIME` | Wall clock (date) — 변경 가능 |
| `CLOCK_MONOTONIC` | 부팅 후 시간 — NTP 조정 |
| `CLOCK_MONOTONIC_RAW` | NTP 조정 없음 — *측정에 적합* |
| `CLOCK_PROCESS_CPUTIME_ID` | 이 process CPU 시간 |
| `CLOCK_THREAD_CPUTIME_ID` | 이 thread CPU 시간 |

## RDTSC — x86

Intel/AMD의 cycle counter.

```c
static inline uint64_t rdtsc(void) {
    uint32_t lo, hi;
    __asm__ volatile ("rdtsc" : "=a"(lo), "=d"(hi));
    return ((uint64_t)hi << 32) | lo;
}
```

⚠️ **out-of-order execution** — 진짜 측정엔 `rdtscp` + `cpuid` barrier.

## PMU — Hardware Performance Counters

Cortex-A·Cortex-M55+의 *Performance Monitor Unit*. 다양한 event 카운트.

```c
// ARMv8 cortex-a (EL1)
uint64_t cnt;
asm volatile ("mrs %0, pmccntr_el0" : "=r"(cnt));   // CPU cycles
```

흔한 event:
- `CPU_CYCLES` (0x11)
- `INST_RETIRED` (0x08)
- `L1D_CACHE_REFILL` (0x03)
- `L2D_CACHE_REFILL` (0x17)
- `BR_MIS_PRED` (0x10)

각 PMU는 *제한된 counter 수* (보통 4-6). `perf` (Linux)이 다중 event 시 *time-multiplex*.

## GPIO + 로직 분석기 — 외부 측정

가장 *비침습적*. 코드에 GPIO toggle만.

```c
void critical_function(void) {
    GPIO_SET(DEBUG_PIN);
    work();
    GPIO_CLR(DEBUG_PIN);
}
```

**Saleae·Sigrok**으로 펄스 폭 측정. CPU 자체 측정 도구의 *overhead 0*.

### Latency between events

```c
ISR_ENTRY: GPIO_TOGGLE(IRQ_PIN);
// ...
ISR_EXIT;

TASK_START: GPIO_TOGGLE(TASK_PIN);
```

두 pin 사이 *시간 차*로 scheduler latency 측정.

## Overhead 줄이기

측정 코드 자체가 시스템 영향.

| 측정 | Overhead |
| --- | --- |
| DWT_CYCCNT read | 1 cycle |
| GPIO toggle | 2-4 cycle |
| `clock_gettime` (Linux user) | ~30 ns |
| `printf` | 수 µs-ms |
| Trace ring buffer | 수십 cycle |

**Lightweight tracing**:

```c
struct trace_record {
    uint32_t cycles;
    uint16_t event_id;
    uint16_t data;
};
static struct trace_record trace_buf[TRACE_SIZE];
static volatile int trace_idx;

#define TRACE(id, data) do { \
    int i = trace_idx++ & (TRACE_SIZE - 1); \
    trace_buf[i].cycles = DWT->CYCCNT; \
    trace_buf[i].event_id = (id); \
    trace_buf[i].data = (data); \
} while (0)
```

각 trace = *5 cycle*. 1000개 = 5 KB. 충분.

## SystemView / Segger RTT

Production-grade tracer. J-Link로 *수 MB/s* 전송 가능.

```c
#include "SEGGER_SYSVIEW.h"
SEGGER_SYSVIEW_RecordEnterISR();
// ... ISR work
SEGGER_SYSVIEW_RecordExitISR();
```

PC 측 *Timeline viewer* — ms 단위 시각화.

## Hardware Trace (ETM·ITM)

Cortex-M3+의 **Embedded Trace Macrocell (ETM)** — *모든 명령 trace*. J-Trace 같은 비싼 도구 필요.

**ITM (Instrumentation Trace Macrocell)** — *32 channel debug print*. RTT보다 가벼움.

```c
ITM->PORT[0].u8 = 'A';   // 1 cycle, non-intrusive
```

## Profile-Guided Optimization (PGO)

```bash
# 1. Instrument 빌드
gcc -fprofile-generate -o app app.c

# 2. 실 데이터로 실행
./app < real_input

# 3. Profile로 최적 빌드
gcc -fprofile-use -O3 -o app app.c
```

컴파일러가 *hot path* 우대. Branch prediction·inline 결정 개선.

## 자주 하는 실수

> ⚠️ Wall-clock으로 CPU 시간 측정

DMA·context switch 포함 → 코드 자체 시간 과대 추정.

> ⚠️ DWT_CYCCNT init 누락

`DEMCR.TRCENA` 활성 안 함 → CYCCNT 항상 0.

> ⚠️ Out-of-order CPU에서 단순 RDTSC

명령 reorder로 *측정 영역 밖*에 실행됨. `rdtscp` + memory barrier.

> ⚠️ printf로 timing 측정

printf 자체가 ms 단위. *Trace buffer* 또는 GPIO.

## 정리

- Wall-clock·CPU cycle·instruction은 *다른 답* 제공.
- **DWT_CYCCNT** (Cortex-M3+)가 µs 측정의 표준.
- Linux는 `CLOCK_MONOTONIC_RAW` + PMU.
- **GPIO + 로직 분석기**가 외부 정밀 측정.
- Trace buffer로 *lightweight production tracing*.

다음 편은 **통계적 분석** — percentile, histogram.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [2-10: PMU와 하드웨어 카운터](/blog/embedded/performance-engineering/part2-10-pmu)
- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
