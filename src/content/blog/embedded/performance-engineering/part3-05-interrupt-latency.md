---
title: "Interrupt Latency 분석 — 진입·종료·Tail-Chaining·Late Arrival"
slug: "embedded/performance-engineering/part3-05-interrupt-latency"
date: 2026-04-25T09:04:00
description: "Cortex-M 인터럽트 latency(M0 16, M0+ 15, M3·M4 12 cycle)와 tail-chaining·late arrival·lazy stacking·priority grouping·FreeRTOS 우선순위를 Arm 문서와 CMSIS·FreeRTOS 책으로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 23
tags: [interrupt, latency, tail-chaining, lazy-stacking]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Interrupt latency는 IRQ 발생부터 ISR의 첫 명령까지 걸리는 시간입니다."** 짧을수록 *real-time 응답이 강력*해집니다.

이 글의 Cortex-M 수치는 모두 Arm 문서에서 가져왔고, 보드에서 재지 않았습니다. QEMU는 cycle을 모델링하지 않으므로(1-03) 인터럽트 latency를 QEMU로 잴 수 없습니다. Linux 쪽 wake-up 지연은 1-04·1-05에서 cyclictest로 쟀습니다.

## Cortex-M Interrupt Latency

| CPU | Cycle | 출처 |
|---|---:|---|
| Cortex-M0 | 16 | Joseph Yiu, Arm Community 블로그(2016-04-01) 표 1 |
| Cortex-M0+ | 15 | 같은 표 |
| Cortex-M3 | 12 | 같은 표 |
| Cortex-M4 | 12 | 같은 표, Cortex-M4 TRM(DDI 0439B) 3.9.1 |

[Yiu의 글](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/beginner-guide-on-interrupt-latency-and-interrupt-latency-of-the-arm-cortex-m-processors)은 이 값의 가정을 적습니다. 메모리 wait state가 0이고 다른 bus master가 자원을 쓰지 않으며, 다른 예외가 처리 중이지 않고, Cortex-M4에서 FPU를 켰다면 lazy stacking이 켜져 있고(기본값), 현재 명령이 unaligned·bit-band 전송이 아니고, 칩의 시스템 설계가 인터럽트 신호 연결에 지연을 더하지 않을 때입니다. M4 TRM 3.9.1은 인터럽트 assert부터 ISR 첫 명령까지 *최대* 12 cycle(wait state 없는 메모리, 첫 명령 fetch는 stack push와 병렬), ISR 복귀도 12 cycle이라고 적습니다.

![Cortex-M interrupt latency 구성 — instruction 완료, register push, vector fetch, pipeline refill](/images/blog/perf-eng/diagrams/part3-05-irq-latency.svg)

## Tail-Chaining

![Tail-chaining 비교 — 옛 ARM7은 pop/push를 반복하지만 Cortex-M은 pop을 생략하고 곧바로 ISR B에 진입한다](/images/blog/perf-eng/diagrams/part3-05-tail-chaining.svg)

ISR A가 끝날 때 다른 인터럽트 B가 pending이면, 레지스터를 stack에서 꺼냈다가 다시 넣는 대신 바로 B로 넘어갑니다. ARMv7-M ARM(DDI 0403E) B1.5.12는 이 최적화를 tail-chaining으로 설명하고, M4 TRM 3.9.1은 wait state 없는 메모리에서 tail-chaining이 6 cycle이며 stack push·pop 없이 다음 ISR의 명령만 fetch한다고 적습니다. 복귀 12 cycle + 진입 12 cycle 대신 6 cycle입니다.

## Late Arrival

![Late arrival — A의 push 진행 중에 더 높은 priority B가 도착하면 push를 그대로 활용하고 vector fetch만 B로 변경한다](/images/blog/perf-eng/diagrams/part3-05-late-arrival.svg)

ARMv7-M ARM B1.5.11의 "Late-arriving exceptions" 항목에 따르면, 예외 진입 sequence 도중에 더 높은 우선순위 인터럽트가 도착하면 진입 sequence를 다시 하지 않고 그 인터럽트가 이 sequence를 이어받습니다. 원래 예외는 나중에 도착한 예외에서 돌아온 뒤 처리됩니다. 아키텍처는 프로세서가 진입 도중 어느 시점까지 이것을 인식하는지는 정하지 않습니다. M4 TRM 3.9.1은 late-arrival과 tail-chaining을 모두 구현한다고 적습니다.

## Lazy Stacking (FPU가 있는 M4·M7)

FPU 레지스터까지 stack에 넣으면 진입이 길어집니다. lazy stacking은 stack에 FP 레지스터 자리만 잡아 두고, ISR이 실제로 FP 명령을 쓸 때 저장합니다. ARMv7-M ARM B3.2.21에 따르면 `FPCCR.ASPEN`(bit 31, 리셋값 1)은 FP context의 자동 보존을, `FPCCR.LSPEN`(bit 30, 리셋값 1)은 lazy context save를 켭니다. 같은 절은 `LSPACT`가 lazy state 보존이 진행 중인지를 나타낸다고 적습니다.

```c
FPU->FPCCR |= FPU_FPCCR_LSPEN_Msk;    /* lazy stacking 켜기 (리셋값) */
FPU->FPCCR &= ~FPU_FPCCR_LSPEN_Msk;   /* 끄기: FP context가 있으면 진입 때 바로 저장 */
```

Yiu의 표에서 Cortex-M4의 12 cycle도 lazy stacking이 켜진 상태의 값입니다.

## IRQ 진입 시간 측정하기

CMSIS의 `NVIC_SetPendingIRQ()`로 인터럽트를 소프트웨어로 pending시키고, 직전 cycle과 ISR 첫머리의 cycle 차이를 봅니다. 보드에서 실행하지 않았습니다.

```c
static volatile uint32_t isr_entry_cycle;

void EXTI0_IRQHandler(void) {
    isr_entry_cycle = DWT->CYCCNT;        /* 진입 시점 */
    NVIC_ClearPendingIRQ(EXTI0_IRQn);
}

uint32_t measure_irq_entry(void) {
    uint32_t t = DWT->CYCCNT;
    NVIC_SetPendingIRQ(EXTI0_IRQn);       /* NVIC ISPR에 쓰기 */
    __DSB(); __ISB();
    return isr_entry_cycle - t;
}
```

이 값에는 `NVIC_SetPendingIRQ()`의 store와 ISR 첫 줄의 `CYCCNT` 읽기도 들어가므로, 표의 12 cycle보다 크게 나옵니다. 측정 경계의 비용은 빈 구간을 먼저 재서 뺍니다(1-03).

## ISR 처리 시간 단축 - Top-Half / Bottom-Half

```c
volatile uint32_t flag;

void UART_IRQHandler(void) {
    uint8_t byte = UART->RDR;   /* top half: 꼭 필요한 일만 */
    ring_buffer_put(byte);
    flag = 1;
}

void main_loop(void) {
    if (flag) {
        flag = 0;
        process_packet();       /* bottom half: task context */
    }
}
```

FreeRTOS에서는 ISR에서 queue나 notification으로 task를 깨웁니다. *Mastering the FreeRTOS Real Time Kernel* 7.2.1은 ISR에서 쓰는 API는 이름이 `FromISR`로 끝나며, "Never call a FreeRTOS API function that does not have "FromISR" in its name from an ISR"이라고 적습니다.

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
NVIC_SetPriorityGrouping(3);
NVIC_SetPriority(EXTI0_IRQn, NVIC_EncodePriority(3, 1, 0));   /* group, preempt, sub */
```

`NVIC_SetPriorityGrouping(3)`의 뜻은 칩이 구현한 priority bit 수(`__NVIC_PRIO_BITS`)에 따라 달라집니다. CMSIS `core_cm4.h`의 `NVIC_EncodePriority()`(1902~1909행)는 preempt bit 수를 min(7 − PriorityGroup, `__NVIC_PRIO_BITS`), sub bit 수를 `PriorityGroup + __NVIC_PRIO_BITS < 7`이면 0, 아니면 `PriorityGroup − 7 + __NVIC_PRIO_BITS`로 계산합니다. `__NVIC_PRIO_BITS`가 4인 칩이라면 PriorityGroup 3에서 preempt 4 bit(16단계), sub 0 bit입니다.

- **Preempt priority**가 더 높은(숫자가 작은) 인터럽트만 실행 중인 ISR을 선점합니다.
- **Sub priority**는 preempt priority가 같은 인터럽트가 동시에 pending일 때 고르는 순서입니다.

## Critical Section - IRQ Disable

```c
__disable_irq();
/* critical */
__enable_irq();
```

PRIMASK를 세우는 동안은 모든 설정 가능한 우선순위의 인터럽트가 기다립니다. 그래서 시스템의 최악 인터럽트 latency에는 가장 긴 critical section의 길이가 그대로 더해집니다. 이 길이를 재 두는 것이 worst-case latency 분석의 한 항목입니다(1-05의 RTA에서 blocking 항).

### BASEPRI - Selective Disable

```c
__set_BASEPRI(0x40);   /* 4-bit 칩: priority 값 4 이상(0x40~0xF0)을 막고 0~3은 통과 */
/* critical, 그러나 높은 우선순위 IRQ는 처리됨 */
__set_BASEPRI(0);
```

ARMv7-M ARM B1.5.4에 따르면 BASEPRI는 0이면 효과가 없고, 0이 아닌 값은 AIRCR.PRIGROUP에 따라 priority mask로 작용해 그 값보다 높은 우선순위만 실행되게 합니다. *Mastering the FreeRTOS Real Time Kernel* 7.8절은 `configMAX_SYSCALL_INTERRUPT_PRIORITY`(새 port에서는 `configMAX_API_CALL_INTERRUPT_PRIORITY`)를 "interrupt-safe API를 부를 수 있는 가장 높은 인터럽트 우선순위"로 정의하고, 그림 7.14의 예에서 그보다 높은 우선순위의 인터럽트는 critical section에 막히지 않지만 FreeRTOS API를 전혀 쓸 수 없다고 적습니다.

## IRQ Storm 회피

```c
void timer_isr(void) {
    /* 매 µs 트리거 */
}
```

인터럽트 하나의 고정 비용이 진입 12 + 복귀 12 cycle이라면, 168 MHz Cortex-M4에서 1 µs(168 cycle)마다 오는 인터럽트는 ISR 본문이 비어 있어도 CPU의 24 / 168 = 14%를 씁니다. 대처는 3-06에서 다룹니다.

- 여러 이벤트를 모아 한 번에 처리(coalescing)
- 이벤트가 아주 잦으면 polling으로 전환
- 데이터 이동이라면 DMA로 인터럽트 자체를 줄임(3-03)

## ISR 안에서 blocking API 금지

```c
void ISR(void) {
    xSemaphoreTake(mtx, portMAX_DELAY);   /* FromISR가 아닌 API */
}
```

위 FreeRTOS 책 7.2.1의 규칙대로 ISR에서는 `FromISR` 버전만 씁니다.

## 자주 하는 실수

> ⚠️ Long ISR

```c
void ADC_IRQ(void) {
    process_sample();
    calculate_fft();        /* 긴 계산 */
}
```

ISR이 도는 동안 같거나 낮은 우선순위 인터럽트는 기다립니다. FFT는 task로 미룹니다.

> ⚠️ IRQ를 끈 채 blocking

```c
__disable_irq();
xSemaphoreTake(sem, portMAX_DELAY);
```

인터럽트를 막아 둔 채로 다른 task나 인터럽트가 줘야 할 semaphore를 기다리면, 그것을 줄 쪽이 실행되지 못합니다.

> ⚠️ 작은 ISR 여러 개 vs 큰 ISR 하나

연달아 오는 인터럽트를 각자 ISR로 두면 tail-chaining으로 사이마다 6 cycle이 들고(M4 TRM 3.9.1), 처음 진입과 마지막 복귀만 12 cycle씩입니다. 비용을 비교할 때 이 숫자로 셉니다.

> ⚠️ FPU 사용 ISR

lazy stacking이 켜져 있으면 ISR이 FP 명령을 처음 쓰는 순간에 FP context 저장이 일어납니다. 짧은 ISR이라면 FP 연산을 task로 옮겨 저장 자체를 피합니다.

## 정리

- wait state가 없을 때 Cortex-M0 16, M0+ 15, M3·M4 12 cycle입니다(Yiu 2016, M4 TRM 3.9.1).
- M4의 tail-chaining은 6 cycle, 복귀는 12 cycle입니다.
- Late arrival은 진입 sequence를 다시 하지 않고 높은 우선순위 인터럽트가 이어받는 동작입니다(B1.5.11).
- `FPCCR.ASPEN`·`LSPEN`은 리셋값이 1이고, lazy stacking은 ISR이 FP를 쓸 때만 저장합니다.
- `NVIC_SetPriorityGrouping(3)`은 4-bit 칩에서 preempt 16단계, sub 0입니다.
- FreeRTOS에서 `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 높은 인터럽트는 critical section에 막히지 않지만 API를 쓸 수 없습니다.

다음 편은 **Interrupt Storm**을 다룹니다.

## 관련 항목

- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)
- [3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)

## 참고 자료

- [Joseph Yiu, A Beginner's Guide on Interrupt Latency - and Interrupt Latency of the Arm Cortex-M processors (2016)](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/beginner-guide-on-interrupt-latency-and-interrupt-latency-of-the-arm-cortex-m-processors)
- Cortex-M4 Technical Reference Manual (DDI 0439B) 3.9.1
- ARMv7-M Architecture Reference Manual (DDI 0403E) B1.5.4, B1.5.11, B1.5.12, B3.2.21
- CMSIS_5 `core_cm4.h` `NVIC_EncodePriority()`
- [*Mastering the FreeRTOS Real Time Kernel*](https://github.com/FreeRTOS/FreeRTOS-Kernel-Book) 7.2.1, 7.8
