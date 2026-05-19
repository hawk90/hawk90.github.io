---
title: "2-10: Scheduler Latency 측정 — GPIO Toggle, DWT, ftrace, cyclictest"
date: 2026-05-08T20:00:00
description: "ISR 종료 → ready task 실행까지의 시간. 측정 방법과 worst-case 추적."
series: "Practical RTOS Internals"
seriesOrder: 20
tags: [scheduler, latency, measurement, dwt, gpio, ftrace, cyclictest]
draft: true
---

## 한 줄 요약

> **"Scheduler latency = ISR 끝 → task 시작"** — 평균이 아닌 worst-case가 hard real-time의 진실.

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

**로직 분석기**로 GPIO 펄스 폭 측정. ISR 시작·끝·task 시작이 *3 edge*로 보임.

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

**1-cycle 정밀**. 168 MHz면 6 ns. *Worst-case*만 보관 후 *주기 로그*.

## ftrace — Linux RT 환경

```bash
# Function tracer
echo function > /sys/kernel/debug/tracing/current_tracer
echo 'schedule:*' > /sys/kernel/debug/tracing/set_ftrace_filter
echo 1 > /sys/kernel/debug/tracing/tracing_on

# 실행 후
cat /sys/kernel/debug/tracing/trace
```

Linux kernel의 *모든 function entry/exit* 추적. Schedule 호출 시점 분석.

### irqsoff Tracer

가장 긴 *interrupt disabled* 구간 자동 추적.

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

**Max** = worst-case wake latency. Hard real-time이면 *deadline 안*.

## SystemView — Segger 시각화

J-Link + SystemView app — *RTOS event 실시간 트레이스*. Context switch, IRQ, API call 모두 timeline에 표시.

```c
// Init
SEGGER_SYSVIEW_Conf();

// Trace 자동 — FreeRTOS trace macro 활용
```

GUI에서 *각 task 실행 구간 + IRQ 구간*을 색깔로 시각화. Latency 즉시 식별.

## Tracealyzer

비슷한 도구. Percepio.

```c
vTraceEnable(TRC_START);
// 자동 trace
```

Recording → PC tool로 분석. RTOS-specific (FreeRTOS·Zephyr·ThreadX).

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

**Histogram + max** — p99·p999·max 모두 추적. *Long tail*이 위험.

## 실제 측정 사례

| 시스템 | Avg | p99 | Max | 비고 |
| --- | --- | --- | --- | --- |
| FreeRTOS Cortex-M4 @ 168 MHz | 0.5 µs | 1 µs | 2 µs | Bare-metal |
| Zephyr Cortex-M4 | 0.7 µs | 1.5 µs | 3 µs | |
| Linux mainline | 50 µs | 200 µs | 5 ms | non-RT |
| Linux PREEMPT_RT | 10 µs | 30 µs | 100 µs | RT patch |
| Xenomai | 5 µs | 15 µs | 50 µs | Cobalt core |
| QNX | 3 µs | 10 µs | 30 µs | Hard RT 인증 |

Bare-metal Cortex-M이 *가장 deterministic*. Linux는 *PREEMPT_RT 가도 100 µs*.

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

Hard real-time이면 *max가 deadline 이내*. Avg 1 µs도 max 1 ms면 fail.

> ⚠️ 측정 환경 ≠ 실 환경

Bench에서 빠른데 *실 환경*에 cache·DMA·bus contention 추가. 실 환경에서 *수일 측정*.

> ⚠️ DWT 빠짐

`CoreDebug->DEMCR`·`DWT->CTRL` 활성 안 함 → CYCCNT 0 유지.

> ⚠️ cyclictest priority 너무 낮음

p1 (낮음)이면 다른 task에 preempt → 측정 부정확. *최고 priority + mlockall*.

## 정리 — Part 2 마무리

- Scheduler latency = **ISR 끝 → ready task 시작**.
- 측정 방법 — **GPIO + 로직 분석기**, **DWT CYCCNT**, **ftrace**, **cyclictest**, **SystemView**.
- **Worst-case (max)**가 hard real-time의 진실 — 평균 무용.
- Bare-metal RTOS ≈ 1-2 µs, Linux PREEMPT_RT ≈ 30-100 µs.

**Part 2 (Scheduler & Context Switch) 종료**. Part 3은 *IPC & Sync 내부 구현*.

## 관련 항목

- [1-10: 실시간성 분석 (WCET)](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [Performance Engineering Part 1](/blog/embedded/performance-engineering/00-preface)
