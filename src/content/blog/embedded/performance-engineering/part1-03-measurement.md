---
title: "성능 측정의 기본 — Wall-Clock·CPU Cycle·Instruction Count"
slug: "embedded/performance-engineering/part1-03-measurement"
date: 2026-04-23T09:03:00
description: "어떻게 측정하나. DWT, PMU, clock_gettime, GPIO + 로직 분석기. Overhead 줄이기."
series: "Embedded Performance Engineering"
seriesOrder: 3
tags: [measurement, dwt, pmu, clock-gettime, gpio]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"무엇을 측정하느냐가 절반"**입니다. wall-clock, cycle, instruction은 *각각 다른 답*을 줍니다.

## 3 종류의 시간

### Wall-Clock Time

*실제 경과 시간*입니다. 사용자가 체감하는 값과 같습니다.

```c
struct timespec t1, t2;
clock_gettime(CLOCK_MONOTONIC_RAW, &t1);
work();
clock_gettime(CLOCK_MONOTONIC_RAW, &t2);
long ns = (t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec);
```

직관적이라는 장점이 있습니다. 다만 *context switch, IRQ, DMA가 포함*되면 코드 자체의 시간으로는 부정확해집니다.

### CPU Cycle (CPU Time)

DWT cycle counter는 활성화된 구현에서 코어 cycle을 셉니다. 계측 구간에 인터럽트나 context switch가 들어오면 그 구간의 경과 cycle에도 반영될 수 있으며, idle·정지 동작의 처리 방식은 타깃 문서에서 확인해야 합니다.

```c
// Cortex-M
DWT->CYCCNT = 0;
work();
uint32_t cycles = DWT->CYCCNT;
```

CYCCNT 차이는 실행 구간의 cycle 수이지, 호출한 함수만의 순수 실행 시간이라고 단정할 수 없습니다.

### Instruction Count

PMU의 `INST_RETIRED` event를 씁니다.

```c
read_pmu(INST_RETIRED);
work();
uint64_t insts = read_pmu(INST_RETIRED) - start;
```

IPC는 inst / cycle로 계산합니다. *architecture 효율*을 분석할 때 씁니다.

## Bare-Metal — DWT_CYCCNT

DWT cycle counter는 여러 Cortex-M 구현에서 제공되지만 모든 Cortex-M 구성에 보장되는 것은 아닙니다. 해당 코어와 SoC의 TRM 및 설정을 확인합니다.

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

카운터 단위는 코어 cycle입니다. 읽기 지연과 타이밍 불확실성은 코어·버스·컴파일러에 따라 확인해야 합니다. 32-bit @ 168 MHz에서는 약 25초마다 wraparound가 일어나므로 *짧은 측정*에만 적합합니다.

### Cortex-M0 계열의 대체 타이머

Armv6-M 코어에는 DWT가 없으므로 대상 SoC의 타이머나 SysTick 같은 대안을 확인합니다. SysTick 자체도 SoC에서 제공·설정되는지 확인합니다.

```c
uint32_t systick_get_us(void) {
    return (SysTick->LOAD - SysTick->VAL) / (SystemCoreClock / 1000000);
}
```

Reload value에 의존합니다. *카운터가 reload될 때* tick interrupt가 발생하므로, 측정이 *1 tick을 넘으면* 누적해서 계산해야 합니다.

## Linux — clock_gettime

```c
struct timespec t;
clock_gettime(CLOCK_MONOTONIC_RAW, &t);
// CLOCK_MONOTONIC_RAW = NTP·adjustment 영향 X
// CLOCK_PROCESS_CPUTIME_ID = 이 프로세스 CPU 시간만
// CLOCK_THREAD_CPUTIME_ID = 이 thread만
```

각 clock의 의미는 다음과 같습니다.

| Clock | 의미 |
| --- | --- |
| `CLOCK_REALTIME` | Wall clock (date) — 변경 가능 |
| `CLOCK_MONOTONIC` | 부팅 후 시간 — NTP 조정 |
| `CLOCK_MONOTONIC_RAW` | NTP 조정 없음 — *측정에 적합* |
| `CLOCK_PROCESS_CPUTIME_ID` | 이 process CPU 시간 |
| `CLOCK_THREAD_CPUTIME_ID` | 이 thread CPU 시간 |

## RDTSC — x86

Intel과 AMD의 cycle counter입니다.

```c
static inline uint64_t rdtsc(void) {
    uint32_t lo, hi;
    __asm__ volatile ("rdtsc" : "=a"(lo), "=d"(hi));
    return ((uint64_t)hi << 32) | lo;
}
```

⚠️ **out-of-order execution** 때문에 측정 구간의 직렬화가 필요할 수 있습니다. 적절한 fence와 counter semantics는 CPU vendor manual 및 대상 microarchitecture에서 확인합니다.

## PMU — Hardware Performance Counters

Cortex-A와 Cortex-M55+에 있는 *Performance Monitor Unit*입니다. 다양한 event를 카운트할 수 있습니다.

```c
// ARMv8 cortex-a (EL1)
uint64_t cnt;
asm volatile ("mrs %0, pmccntr_el0" : "=r"(cnt));   // CPU cycles
```

흔히 쓰는 event는 다음과 같습니다.

- `CPU_CYCLES` (0x11)
- `INST_RETIRED` (0x08)
- `L1D_CACHE_REFILL` (0x03)
- `L2D_CACHE_REFILL` (0x17)
- `BR_MIS_PRED` (0x10)

가용 programmable counter 수와 event 지원은 PMU 구현에 따라 다릅니다. `perf`는 counter가 부족할 때 event를 multiplex할 수 있으며, 결과의 running/enabled time을 확인해야 합니다.

## GPIO + 로직 분석기 — 외부 측정

외부 계측은 CPU counter에 의존하지 않지만 GPIO 쓰기와 보드 신호 경로의 영향은 남습니다. 코드에 GPIO 전환을 추가합니다.

```c
void critical_function(void) {
    GPIO_SET(DEBUG_PIN);
    work();
    GPIO_CLR(DEBUG_PIN);
}
```

로직 분석기나 오실로스코프로 펄스 폭을 측정합니다. 해상도와 입력 경로는 장비 설정 및 신호 경로에 따릅니다.

### Latency between events

```c
ISR_ENTRY: GPIO_TOGGLE(IRQ_PIN);
// ...
ISR_EXIT;

TASK_START: GPIO_TOGGLE(TASK_PIN);
```

두 pin 사이의 *시간 차*로 scheduler latency를 측정합니다.

## Overhead 줄이기

측정 코드 자체가 시스템에 영향을 줍니다.

| 측정 | Overhead |
| --- | --- |
| DWT_CYCCNT read | 코어·버스·컴파일러별 측정 필요 |
| GPIO toggle | SoC·핀·버스별 측정 필요 |
| `clock_gettime` (Linux user) | vDSO·커널·플랫폼별 측정 필요 |
| `printf` | 포맷·출력 경로에 따라 다름 |
| Trace ring buffer | 구현·동기화·메모리 경로별 측정 필요 |

**Lightweight tracing**의 예는 다음과 같습니다.

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

Trace 비용과 저장 용량은 구현, 정렬, 동기화, 메모리 경로와 버퍼 크기에 따라 측정합니다. 단일 writer인지 확인하고 덮어쓰기 정책도 정합니다.

## SystemView / Segger RTT

Production-grade tracer입니다. J-Link로 *수 MB/s* 전송이 가능합니다.

```c
#include "SEGGER_SYSVIEW.h"
SEGGER_SYSVIEW_RecordEnterISR();
// ... ISR work
SEGGER_SYSVIEW_RecordExitISR();
```

PC 측에서는 *Timeline viewer*로 ms 단위로 시각화합니다.

## Hardware Trace (ETM·ITM)

ETM은 지원되는 구현과 외부 trace 경로에서 명령 추적을 제공할 수 있습니다. trace 포트·압축·필터 설정과 디버그 도구 지원은 SoC별로 확인해야 합니다.

**ITM (Instrumentation Trace Macrocell)**은 *32 channel debug print*를 제공하며, RTT보다 가볍습니다.

```c
ITM->PORT[0].u8 = 'A';   // write latency and trace impact are implementation-specific
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

컴파일러가 *hot path*를 우대해서 처리합니다. Branch prediction과 inline 결정이 개선됩니다.

## 자주 하는 실수

> ⚠️ Wall-clock으로 CPU 시간 측정

DMA와 context switch가 포함되면서 코드 자체의 시간이 과대 추정됩니다.

> ⚠️ DWT_CYCCNT 설정 확인

TRCENA와 CYCCNTENA 설정만으로 동작이 보장되지는 않습니다. 타깃 구현, debug/auth 설정, clock gating을 확인합니다.

> ⚠️ Out-of-order CPU에서 단순 RDTSC

명령이 reorder되면서 *측정 영역 밖*에서 실행됩니다. target manual에 맞는 serialization과 compiler barrier를 사용합니다.

> ⚠️ printf로 timing 측정

printf 자체가 ms 단위입니다. 그래서 *Trace buffer*나 GPIO를 씁니다.

## 정리

- Wall-clock, CPU cycle, instruction은 *각각 다른 답*을 제공합니다.
- DWT_CYCCNT는 지원되는 Cortex-M에서 쓸 수 있는 cycle source 중 하나입니다. 모든 M-class 타깃에서 사용할 수 있는 표준이라고 단정하지 않습니다.
- Linux에서는 `CLOCK_MONOTONIC_RAW`와 PMU를 씁니다.
- **GPIO + 로직 분석기**가 외부 정밀 측정 수단입니다.
- Trace buffer로 *lightweight production tracing*을 구현합니다.

다음 편은 **통계적 분석**입니다. percentile과 histogram을 다룹니다.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [2-10: PMU와 하드웨어 카운터](/blog/embedded/performance-engineering/part2-10-pmu)
- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)

## 참고 자료

- [Arm Cortex-M7 Processor Datasheet](https://developer.arm.com/documentation/100166/latest/)
- [Arm PMU profiling overview](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/profile-firmware-with-performance-monitor-unit-in-armv8-a-cpu)
