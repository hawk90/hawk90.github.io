---
title: "3-05: Interrupt Latency — 진입·종료·Tail-Chaining·Late Arrival"
date: 2026-05-19T04:00:00
description: "Cortex-M 12-cycle latency. Tail-chaining 6-cycle. Late arrival, lazy stacking, FreeRTOS hooks."
series: "Embedded Performance Engineering"
seriesOrder: 23
tags: [interrupt, latency, tail-chaining, lazy-stacking]
draft: true
---

## 한 줄 요약

> **"Interrupt latency = IRQ 발생 → ISR 첫 명령"** — 짧을수록 *real-time 강력*.

## Cortex-M Interrupt Latency

| CPU | Cycle | @ 168 MHz |
|---|---|---|
| Cortex-M0 | 16 | 95 ns |
| Cortex-M0+ | 15 | 89 ns |
| Cortex-M3 | 12 | 71 ns |
| Cortex-M4 | 12 | 71 ns |
| Cortex-M7 | 12 (lower with cache) | 71 ns |
| Cortex-M33 | 11 | 65 ns |

내부 — *8 register hardware push* + *vector fetch* + *pipeline refill*.

```text
IRQ assert
  ↓
+1 cycle: current instruction 완료
+8 cycle: R0-R3, R12, LR, PC, xPSR 자동 push (stack)
+2 cycle: vector table read (ISR address)
+1 cycle: pipeline refill
─────────────────
12 cycle 후 ISR 첫 명령
```

## Tail-Chaining — 핵심 트릭

```text
ISR A 종료 → ISR B 대기 중

회피 (옛 ARM7):
  ISR A 종료 → pop 8 reg → main 명령 1개 → 또 push 8 reg → ISR B 진입
  = 12 + 12 + idle = ~30 cycle

Cortex-M Tail-Chaining:
  ISR A 종료 → pop 안 함 → 곧바로 ISR B 진입
  = 6 cycle
```

연속 IRQ 시 *50% 효율*.

## Late Arrival

```text
ISR A 진입 중 — 더 높은 priority B 도착
  → A의 push 진행 중이므로 *그대로 활용* → B로 vector fetch만 변경
  → A는 *영원 대기 (B 끝난 후 진행)*
```

Higher priority IRQ가 *최소 손실로 선점*. Cortex-M3+ 표준.

## Lazy Stacking (M4·M7 with FP)

FPU 사용 시 *16 floating reg* 추가 push 필요 → latency *32 cycle 추가*.

```text
ISR 진입 — FPU context는 *push 안 함* (lazy)
ISR이 FPU 명령 사용 → 그때 push (lazy stacking trigger)
ISR이 FPU 안 쓰면 → push 안 함 (latency 절약)
```

```c
FPU->FPCCR |= FPU_FPCCR_LSPEN_Msk;   // lazy stacking enable (기본)
FPU->FPCCR &= ~FPU_FPCCR_LSPEN_Msk;  // disable — 항상 push
```

## IRQ 진입·종료 시간 측정

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

## ISR 처리 시간 단축 — Top-Half / Bottom-Half

```c
volatile uint32_t flag;

void UART_IRQHandler(void) {
    /* Top half — *짧게* */
    uint8_t byte = UART->RDR;
    ring_buffer_put(byte);
    flag = 1;   // signal
}

void main_loop(void) {
    if (flag) {
        flag = 0;
        process_packet();   // Bottom half — task context
    }
}
```

RTOS — semaphore·event group으로 bottom half 깨우기:

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

- **Preempt priority** — 다른 IRQ 선점 가능
- **Sub priority** — pending 중 선택 순서

같은 preempt 그룹이면 *first-come*. Critical signal은 *높은 preempt*.

## Critical Section — IRQ Disable

```c
__disable_irq();
/* critical */
__enable_irq();
```

Disable 동안 *모든 IRQ 차단* → response 시간 길어짐. **최대 disable 시간** 측정 — *worst-case latency*.

### BASEPRI — Selective Disable

```c
__set_BASEPRI(0x40);   // priority 4 이상 차단, 0-3는 통과
/* critical, 그러나 high IRQ는 처리됨 */
__set_BASEPRI(0);
```

FreeRTOS `portENTER_CRITICAL` = BASEPRI 사용.

## Cortex-A — GIC IRQ Latency

| 단계 | Cycle |
|---|---|
| Distribute → CPU IF | ~5 |
| Acknowledge (read GIC) | ~10 |
| Pipeline flush·context save | ~30 (OoO 시) |
| ISR 진입 | **~50 cycle** |

Cortex-A53 @ 1 GHz → 50 ns. 그러나 *cache miss·OoO drain*으로 *수백 cycle* 까지.

자동차 brake·airbag 등 *sub-µs response* — Cortex-R5 (in-order, 8-cycle IRQ).

## IRQ Storm 회피

```c
void timer_isr(void) {
    /* 매 µs 트리거 — CPU 다 잡아먹음 */
}
```

해결:
- **Coalescing** — N 이벤트마다 한 번만
- **Polling 전환** — 매우 빈번한 이벤트
- **DMA** — IRQ 자체 회피

## FreeRTOS — ISR Overhead

```text
configMAX_SYSCALL_INTERRUPT_PRIORITY = 5 가정
IRQ priority 5+ — FromISR API 사용
  → entry: 12 cycle (hardware)
  → kernel hook: ~30 cycle
  → bottom half wake: ~50 cycle
  → portYIELD_FROM_ISR: pendSV pending
  → return + PendSV: ~100 cycle (context switch)
  Total: ~200 cycle

IRQ priority 0-4 (configMAX_SYSCALL 위) — 직접 hardware ISR
  → entry: 12 cycle
  → ISR work만
  → exit: 12 cycle
  Total: ~25 cycle (FreeRTOS 비관여)
```

Hard real-time IRQ는 *configMAX_SYSCALL 위*에 두고 RTOS API *안 씀*.

## ISR 안에서 lock 금지

```c
void ISR(void) {
    xSemaphoreTake(mtx, ...);   // ✗ block 가능 → hard fault
}
```

→ `*FromISR` 또는 hardware-only IRQ.

## 자주 하는 실수

> ⚠️ Long ISR

```c
void ADC_IRQ(void) {
    process_sample();        // 빠름
    calculate_fft();         // ← 수 ms — 다른 IRQ blocked
}
```

→ FFT는 *task에 defer*.

> ⚠️ Disable IRQ 너무 김

```c
__disable_irq();
xSemaphoreTake(sem, portMAX_DELAY);   // ← block + IRQ 차단 → deadlock
```

Critical section은 *수 µs* 이내.

> ⚠️ Tail-chaining 효과 무시

작은 ISR 여러 개 vs 한 큰 ISR — *작은 ISR 여러 개가 더 빠를 수 있음* (tail-chain 활용).

> ⚠️ FPU stacking overhead 미인식

FP 미사용 시 — lazy stacking 활용. FPU register clobber 함수 IRQ에서 호출은 *비추*.

## 정리

- Cortex-M IRQ latency = **12 cycle** (M3-M4).
- **Tail-chaining** 6 cycle, **late arrival** seamless preempt.
- Lazy FP stacking = M4/M7 latency 절약.
- ISR top half *짧게* — bottom half는 task.
- `BASEPRI`로 선택적 disable — high IRQ는 통과.
- Hard real-time IRQ는 *configMAX_SYSCALL 위*.

다음 편은 **Interrupt Storm**.

## 관련 항목

- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)
- [3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
