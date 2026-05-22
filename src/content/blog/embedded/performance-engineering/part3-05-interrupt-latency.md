---
title: "3-05: Interrupt Latency - 진입·종료·Tail-Chaining·Late Arrival"
date: 2026-05-08T04:00:00
description: "Cortex-M 12-cycle latency. Tail-chaining 6-cycle. Late arrival, lazy stacking, FreeRTOS hooks."
series: "Embedded Performance Engineering"
seriesOrder: 23
tags: [interrupt, latency, tail-chaining, lazy-stacking]
draft: false
---

## 한 줄 요약

> **"Interrupt latency는 IRQ 발생부터 ISR의 첫 명령까지 걸리는 시간입니다."** 짧을수록 *real-time 응답이 강력*해집니다.

## Cortex-M Interrupt Latency

| CPU | Cycle | @ 168 MHz |
|---|---|---|
| Cortex-M0 | 16 | 95 ns |
| Cortex-M0+ | 15 | 89 ns |
| Cortex-M3 | 12 | 71 ns |
| Cortex-M4 | 12 | 71 ns |
| Cortex-M7 | 12 (lower with cache) | 71 ns |
| Cortex-M33 | 11 | 65 ns |

내부적으로는 *8개 register의 hardware push*와 *vector fetch*, *pipeline refill*로 구성됩니다.

![Cortex-M interrupt latency 구성 — instruction 완료, register push, vector fetch, pipeline refill](/images/blog/perf-eng/diagrams/part3-05-irq-latency.svg)

## Tail-Chaining - 핵심 트릭

![Tail-chaining 비교 — 옛 ARM7은 pop/push를 반복하지만 Cortex-M은 pop을 생략하고 곧바로 ISR B에 진입한다](/images/blog/perf-eng/diagrams/part3-05-tail-chaining.svg)

연속 IRQ 상황에서 *50% 효율*을 얻습니다.

## Late Arrival

![Late arrival — A의 push 진행 중에 더 높은 priority B가 도착하면 push를 그대로 활용하고 vector fetch만 B로 변경한다](/images/blog/perf-eng/diagrams/part3-05-late-arrival.svg)

Higher priority IRQ가 *최소 손실로 선점*합니다. Cortex-M3 이상의 표준 동작입니다.

## Lazy Stacking (M4·M7 with FP)

FPU를 사용할 때는 *16개 floating register*를 추가로 push해야 해서 latency가 *32 cycle 더 늘어납니다*.

```text
ISR 진입 시 FPU context는 *push하지 않음* (lazy)
ISR이 FPU 명령을 쓰면 그때 push (lazy stacking trigger)
ISR이 FPU를 안 쓰면 push 자체를 생략 (latency 절약)
```

```c
FPU->FPCCR |= FPU_FPCCR_LSPEN_Msk;   // lazy stacking enable (기본)
FPU->FPCCR &= ~FPU_FPCCR_LSPEN_Msk;  // disable - 항상 push
```

## IRQ 진입·종료 시간 측정하기

```c
volatile uint32_t isr_entry_cycle;

void EXTI0_IRQHandler(void) {
    isr_entry_cycle = DWT->CYCCNT;   // ← 진입 시점
    /* ... */
    EXTI->PR1 = EXTI_PR1_PIF0;
}

/* Main */
__DSB();
uint32_t t = DWT->CYCCNT;
EXTI->SWIER1 |= EXTI_SWIER1_SWI0;   // soft trigger IRQ
__DSB();
uint32_t latency = isr_entry_cycle - t;
printf("Latency: %u cycle\n", latency);
```

## ISR 처리 시간 단축 - Top-Half / Bottom-Half

```c
volatile uint32_t flag;

void UART_IRQHandler(void) {
    /* Top half - *짧게* */
    uint8_t byte = UART->RDR;
    ring_buffer_put(byte);
    flag = 1;   // signal
}

void main_loop(void) {
    if (flag) {
        flag = 0;
        process_packet();   // Bottom half - task context
    }
}
```

RTOS에서는 semaphore와 event group으로 bottom half를 깨웁니다.

```c
void UART_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    uint8_t byte = UART->RDR;
    xQueueSendFromISR(rx_queue, &byte, &hp);
    portYIELD_FROM_ISR(hp);
}
```

## NVIC Priority Grouping

```c
NVIC_SetPriorityGrouping(3);   // 4 group, 4 sub-priority
NVIC_SetPriority(EXTI0_IRQn, NVIC_EncodePriority(3, 1, 0));
                                              /* group, preempt, sub */
```

- **Preempt priority**가 높으면 다른 IRQ를 선점할 수 있습니다.
- **Sub priority**는 pending 중인 IRQ의 선택 순서를 결정합니다.

같은 preempt 그룹이면 *먼저 발생한 IRQ가 먼저 처리*됩니다. Critical signal에는 *높은 preempt*를 줍니다.

## Critical Section - IRQ Disable

```c
__disable_irq();
/* critical */
__enable_irq();
```

Disable 동안 *모든 IRQ가 차단*되어 response 시간이 늘어납니다. **최대 disable 시간**을 측정하는 것이 곧 *worst-case latency 측정*입니다.

### BASEPRI - Selective Disable

```c
__set_BASEPRI(0x40);   // priority 4 이상 차단, 0-3는 통과
/* critical, 그러나 high IRQ는 처리됨 */
__set_BASEPRI(0);
```

FreeRTOS의 `portENTER_CRITICAL`이 BASEPRI를 사용합니다.

## Cortex-A - GIC IRQ Latency

| 단계 | Cycle |
|---|---|
| Distribute → CPU IF | ~5 |
| Acknowledge (read GIC) | ~10 |
| Pipeline flush·context save | ~30 (OoO 시) |
| ISR 진입 | **~50 cycle** |

Cortex-A53 1 GHz 기준으로 50 ns 수준입니다. 다만 *cache miss와 OoO drain*이 겹치면 *수백 cycle*까지 늘어납니다.

자동차 brake와 airbag처럼 *sub-µs response*가 필요한 곳에서는 Cortex-R5(in-order, 8-cycle IRQ)를 씁니다.

## IRQ Storm 회피

```c
void timer_isr(void) {
    /* 매 µs 트리거 - CPU를 다 잡아먹음 */
}
```

해결책은 다음과 같습니다.
- **Coalescing**으로 N개 이벤트마다 한 번만 처리합니다.
- **Polling 전환**은 매우 빈번한 이벤트에 적합합니다.
- **DMA**로 IRQ 자체를 회피하는 방법도 있습니다.

## FreeRTOS의 ISR Overhead

```text
configMAX_SYSCALL_INTERRUPT_PRIORITY = 5 가정
IRQ priority 5+ - FromISR API 사용
  → entry: 12 cycle (hardware)
  → kernel hook: ~30 cycle
  → bottom half wake: ~50 cycle
  → portYIELD_FROM_ISR: pendSV pending
  → return + PendSV: ~100 cycle (context switch)
  Total: ~200 cycle

IRQ priority 0-4 (configMAX_SYSCALL 위) - 직접 hardware ISR
  → entry: 12 cycle
  → ISR work만
  → exit: 12 cycle
  Total: ~25 cycle (FreeRTOS 비관여)
```

Hard real-time IRQ는 *configMAX_SYSCALL 위*에 두고 RTOS API를 쓰지 않습니다.

## ISR 안에서 lock 금지

```c
void ISR(void) {
    xSemaphoreTake(mtx, ...);   // 차단될 수 있어 hard fault로 이어집니다
}
```

`*FromISR`이나 hardware-only IRQ를 써야 합니다.

## 자주 하는 실수

> ⚠️ Long ISR

```c
void ADC_IRQ(void) {
    process_sample();        // 빠름
    calculate_fft();         // 수 ms 걸리며 다른 IRQ를 차단합니다
}
```

FFT는 *task로 defer*해야 합니다.

> ⚠️ Disable IRQ 너무 김

```c
__disable_irq();
xSemaphoreTake(sem, portMAX_DELAY);   // block + IRQ 차단으로 deadlock
```

Critical section은 *수 µs* 이내로 유지해야 합니다.

> ⚠️ Tail-chaining 효과 무시

작은 ISR 여러 개와 한 큰 ISR을 비교해 보면 *작은 ISR 여러 개가 더 빠를 수도* 있습니다 (tail-chain 활용).

> ⚠️ FPU stacking overhead 미인식

FP를 사용하지 않을 때는 lazy stacking을 활용합니다. FPU register를 clobber하는 함수를 IRQ 안에서 호출하는 것은 *권장하지 않습니다*.

## 정리

- Cortex-M의 IRQ latency는 M3와 M4 기준 **12 cycle**입니다.
- **Tail-chaining**은 6 cycle, **late arrival**은 seamless하게 선점합니다.
- Lazy FP stacking은 M4/M7의 latency를 줄여 줍니다.
- ISR top half는 *짧게* 유지하고 bottom half는 task로 미룹니다.
- `BASEPRI`로 선택적 disable을 걸면 high IRQ는 통과시킬 수 있습니다.
- Hard real-time IRQ는 *configMAX_SYSCALL 위*에 둡니다.

다음 편은 **Interrupt Storm**을 다룹니다.

## 관련 항목

- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)
- [3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
