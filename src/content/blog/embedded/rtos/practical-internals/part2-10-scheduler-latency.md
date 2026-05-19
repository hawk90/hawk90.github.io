---
title: "2-10: Scheduler Latency 측정 — GPIO Toggle, DWT, ftrace, cyclictest"
date: 2026-05-07T20:00:00
description: "ISR 종료 → ready task 실행까지의 시간. 측정 방법과 worst-case 추적."
series: "Practical RTOS Internals"
seriesOrder: 20
tags: [scheduler, latency, measurement, dwt, gpio, ftrace, cyclictest]
draft: false
---

## 한 줄 요약

> **"Scheduler latency는 ISR이 끝난 시점부터 task가 실행을 시작하기까지의 시간입니다."** Hard real-time에서 의미가 있는 값은 평균이 아니라 worst-case입니다.

## Latency 구간 정의

```text
External event (IRQ trigger)
        ↓
   t1: HW interrupt 인지
        ↓
   t2: ISR 첫 줄
        ↓
   t3: xSemaphoreGiveFromISR 호출 (task wake signal)
        ↓
   t4: ISR 끝, PendSV trigger
        ↓
   t5: PendSV handler 진입
        ↓
   t6: vTaskSwitchContext (next task 결정)
        ↓
   t7: 새 task 첫 줄
        
Interrupt latency  = t2 - t1
Scheduler latency  = t7 - t4
Total wake latency = t7 - t1
```

## GPIO Toggle 방법 — Bare-metal·간단

```c
// ISR
void TIM1_IRQHandler(void) {
    GPIO_SET(DEBUG_PIN);              // t2 (ISR 시작)
    /* ... */
    xSemaphoreGiveFromISR(sem, &woken);
    portYIELD_FROM_ISR(woken);
    GPIO_CLR(DEBUG_PIN);              // t4 (ISR 끝)
}

// Task
void rx_task(void *arg) {
    while (1) {
        xSemaphoreTake(sem, portMAX_DELAY);
        GPIO_TOGGLE(DEBUG_PIN);       // t7 (task 시작)
        // ...
    }
}
```

로직 분석기로 GPIO 펄스 폭을 측정합니다. ISR 시작, ISR 끝, task 시작이 세 개의 edge로 나타납니다.

```text
Pin:  ─┐      ┌────┐
       │      │    │
       └──────┘    └─────
       t2     t4   t7
       └─ISR─┘ └ Sch ┘
```

## DWT Cycle Counter — Cortex-M

```c
// 초기화
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CYCCNT = 0;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

// ISR
volatile uint32_t t_isr_start, t_isr_end;
void TIM1_IRQHandler(void) {
    t_isr_start = DWT->CYCCNT;
    /* ... */
    t_isr_end = DWT->CYCCNT;
}

// Task
void task(void *arg) {
    while (1) {
        xSemaphoreTake(sem, portMAX_DELAY);
        uint32_t t_task = DWT->CYCCNT;
        uint32_t sched_latency = t_task - t_isr_end;
        log_max(sched_latency);
    }
}
```

1 cycle 단위로 측정합니다. 168 MHz면 약 6 ns의 해상도입니다. worst-case 값만 보관해 두고 주기적으로 로그를 남기면 충분합니다.

## ftrace — Linux RT 환경

```bash
# Function tracer
echo function > /sys/kernel/debug/tracing/current_tracer
echo 'schedule:*' > /sys/kernel/debug/tracing/set_ftrace_filter
echo 1 > /sys/kernel/debug/tracing/tracing_on

# 실행 후
cat /sys/kernel/debug/tracing/trace
```

Linux kernel의 모든 function entry/exit를 추적합니다. schedule 호출 시점을 살펴볼 수 있습니다.

### irqsoff Tracer

가장 길게 interrupt가 disable되어 있던 구간을 자동으로 추적합니다.

```bash
echo irqsoff > /sys/kernel/debug/tracing/current_tracer
echo 1 > /sys/kernel/debug/tracing/tracing_on
sleep 60
cat /sys/kernel/debug/tracing/trace | head -50
```

```text
# CPU#  TASK            DELAY    FUNCTION
   0)               |  120 us  __schedule()
   0) [worst case]      ^^^ — 120 µs IRQ disabled
```

## cyclictest — Linux PREEMPT_RT

```bash
sudo cyclictest -p 80 -t 4 -i 1000 -l 100000 -m
```

옵션:
- `-p 80` priority (real-time)
- `-t 4` 4 thread
- `-i 1000` 1000 µs interval
- `-l 100000` loop count
- `-m` mlockall (page fault 방지)

출력:

```text
T: 0 (12345) P:80 I:1000 C:100000 Min:5      Avg:7      Max:23
T: 1 (12346) P:80 I:1500 C: 66667 Min:6      Avg:8      Max:31
```

여기서 Max 값이 worst-case wake latency입니다. Hard real-time이라면 이 값이 deadline 안에 들어와야 합니다.

## SystemView — Segger 시각화

J-Link와 SystemView app을 사용하면 RTOS event를 실시간으로 트레이스할 수 있습니다. Context switch, IRQ, API 호출이 모두 timeline 위에 표시됩니다.

```c
// Init
SEGGER_SYSVIEW_Conf();

// Trace 자동 — FreeRTOS trace macro 활용
```

GUI에서 task 실행 구간과 IRQ 구간을 색으로 구분해 보여 줍니다. Latency 문제를 즉시 식별할 수 있습니다.

## Tracealyzer

Percepio의 비슷한 도구입니다.

```c
vTraceEnable(TRC_START);
// 자동 trace
```

Recording을 PC tool로 분석합니다. FreeRTOS, Zephyr, ThreadX 등 RTOS별로 특화되어 있습니다.

## Latency 원인 분류

| 원인 | 추가 latency | 해결 |
| --- | --- | --- |
| Critical section 길게 | ~10-1000 µs | 짧게 분할 |
| BASEPRI mask | ~수 µs | priority 분리 |
| 다른 ISR 처리 중 | 그 ISR 길이 | ISR 짧게 |
| Cache miss (Cortex-A) | ~수 µs | hot path lock·prefetch |
| MMU TLB miss | ~수 µs | hugepage |
| Bus contention | 가변 | priority QoS |
| FPU lazy stacking | 0-1 µs | 자동 |

## Worst-Case 추적 — Statistical

```c
static uint32_t latency_buckets[100];
static uint32_t max_latency = 0;

void log_latency(uint32_t cycles) {
    int us = cycles / (CPU_HZ / 1000000);
    if (us >= 100) us = 99;
    latency_buckets[us]++;
    if (cycles > max_latency) max_latency = cycles;
}

// 주기적 출력
for (int i = 0; i < 100; i++) {
    if (latency_buckets[i] > 0)
        printf("%d us: %u\n", i, latency_buckets[i]);
}
```

Histogram과 max를 함께 기록하면 p99, p999, max를 모두 추적할 수 있습니다. 위험한 것은 평균이 아니라 long tail입니다.

## 실제 측정 사례

| 시스템 | Avg | p99 | Max | 비고 |
| --- | --- | --- | --- | --- |
| FreeRTOS Cortex-M4 @ 168 MHz | 0.5 µs | 1 µs | 2 µs | Bare-metal |
| Zephyr Cortex-M4 | 0.7 µs | 1.5 µs | 3 µs | |
| Linux mainline | 50 µs | 200 µs | 5 ms | non-RT |
| Linux PREEMPT_RT | 10 µs | 30 µs | 100 µs | RT patch |
| Xenomai | 5 µs | 15 µs | 50 µs | Cobalt core |
| QNX | 3 µs | 10 µs | 30 µs | Hard RT 인증 |

Bare-metal Cortex-M이 가장 deterministic한 결과를 보입니다. Linux는 PREEMPT_RT를 적용해도 100 µs 수준에 머무릅니다.

## 자주 하는 실수

> ⚠️ 평균만 보고 OK라고 판정합니다

Hard real-time에서는 max가 deadline 이내에 들어와야 합니다. 평균이 1 µs라도 max가 1 ms면 그 시스템은 실패한 것입니다.

> ⚠️ 측정 환경이 실 환경과 다릅니다

Bench에서는 빠른데 실 환경에서는 cache, DMA, bus contention이 더해집니다. 실제 운용 조건에서 며칠 단위로 측정해야 의미가 있습니다.

> ⚠️ DWT를 켜는 것을 잊습니다

`CoreDebug->DEMCR`와 `DWT->CTRL`를 활성화하지 않으면 CYCCNT가 0에 머무릅니다.

> ⚠️ cyclictest의 priority가 너무 낮습니다

p1 같은 낮은 priority로 돌리면 다른 task에 preempt되어 측정이 부정확해집니다. 최고 priority에 `mlockall`을 함께 적용해야 합니다.

## 정리 — Part 2 마무리

- Scheduler latency는 ISR이 끝난 시점부터 ready task가 실행을 시작하기까지의 시간을 말합니다.
- 측정 방법은 GPIO와 로직 분석기, DWT CYCCNT, ftrace, cyclictest, SystemView가 대표적입니다.
- 평균은 거의 의미가 없습니다. Hard real-time의 진실은 worst-case (max)입니다.
- Bare-metal RTOS는 1-2 µs 수준, Linux PREEMPT_RT는 30-100 µs 수준입니다.

이로써 Part 2 (Scheduler & Context Switch)를 마무리합니다. Part 3에서는 IPC와 Sync 내부 구현으로 넘어갑니다.

## 관련 항목

- [1-10: 실시간성 분석 (WCET)](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [Performance Engineering Part 1](/blog/embedded/performance-engineering/00-preface)
