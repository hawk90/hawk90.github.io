---
title: "2-04: Cortex-M 예외 처리"
date: 2026-05-12T16:00:00
description: "NVIC·vector table·tail-chaining·late-arrival의 hardware 기반."
series: "Modern Embedded Recipes"
seriesOrder: 16
tags: [recipes, arm, nvic, exceptions]
draft: false
---

## 한 줄 요약

> **"Cortex-M 예외 처리는 하드웨어가 대부분을 합니다."** 12 cycle 안에 stacking·vector fetch·jump가 끝나고, tail-chaining으로 cycle을 더 줄입니다.

## 어떤 상황에서 쓰나

- ISR latency 최적화가 필요할 때
- 우선순위 grouping이 의도대로 동작하지 않을 때
- Fault handler에서 stack frame을 분석할 때
- 보드를 새로 설계하며 IRQ 우선순위를 설계할 때

## 핵심 개념

### 1) Vector table

Cortex-M은 reset 직후 0x00000000(또는 VTOR이 가리키는 곳)에서 vector table을 읽습니다.

```text
offset    내용
0x00      Initial MSP
0x04      Reset_Handler
0x08      NMI_Handler
0x0C      HardFault_Handler
0x10      MemManage_Handler
0x14      BusFault_Handler
0x18      UsageFault_Handler
...
0x40      IRQ0 (NVIC 외부 IRQ)
0x44      IRQ1
...
```

각 entry는 handler 주소입니다. Reset_Handler는 boot 시작 함수의 주소이고, MSP 초기값은 RAM 끝(보통).

```c
// VTOR로 vector table 위치 이동 (Bootloader → App)
SCB->VTOR = 0x08010000;   // app vector table 위치
```

### 2) Exception entry — 12 cycle stacking

IRQ가 들어오면 hardware가 다음을 자동 수행합니다.

```text
1) PC, LR, R0~R3, R12, xPSR를 stack에 push (8 word = 32 byte)
2) Vector table에서 handler 주소 fetch
3) PC = handler 주소
4) LR = EXC_RETURN
5) Mode = handler mode
6) Stack = MSP
```

이 전체가 12 cycle(M3/M4 기준), no-cache 시 16 ~ 25 cycle 정도 걸립니다.

```text
   IRQ pending → CPU 현재 명령 완료
                 ↓
        12 cycle (HW stacking + vector fetch)
                 ↓
        IRQ handler 첫 명령 실행
```

### 3) Tail-chaining

IRQ handler가 끝나는데 다음 pending IRQ가 있으면, stack을 pop하지 않고 바로 다음 handler로 점프합니다.

```text
일반 종료:
   handler1 끝 → unstack (8 word) → handler2 entry stack (8 word)

Tail-chained:
   handler1 끝 → handler2 entry (stack 그대로) → 6 cycle만 소요
```

5 ~ 6 cycle을 절약합니다.

### 4) Late-arrival

handler가 entry stacking 중인데 더 높은 priority의 IRQ가 들어오면, 진행 중인 stacking을 그대로 두고 새 IRQ의 handler로 진입합니다.

```text
IRQ A (priority 5) 진입 stacking 중
   → IRQ B (priority 3) pending
   → stacking 마무리 후 handler B로 (A 대기)
```

높은 priority IRQ의 latency가 증가하지 않게 합니다.

### 5) Priority 와 grouping

Cortex-M3/M4는 priority bit를 group과 sub-priority로 나눠 쓸 수 있습니다.

```c
// STM32 — 4 group bit, 0 sub-priority (default)
NVIC_SetPriorityGrouping(3);   // PRIGROUP = 3 (4 group, 0 sub)

NVIC_SetPriority(USART1_IRQn, 5);
NVIC_EnableIRQ(USART1_IRQn);
```

priority 숫자가 **낮을수록** 높은 우선순위입니다. 0이 가장 높고, 15 또는 255가 가장 낮습니다.

Group이 같은 IRQ끼리는 nesting 안 됩니다(preempt 불가). Sub-priority는 pending 시 처리 순서만 결정합니다.

## 코드 / 실제 사용 예

UART RX IRQ handler 예시입니다.

```c
// Vector table entry — startup_stm32f4.s
.word USART1_IRQHandler

void USART1_IRQHandler(void) {
    if (USART1->SR & USART_SR_RXNE) {
        uint8_t c = USART1->DR;
        ring_push(&rx_ring, c);
    }
    if (USART1->SR & USART_SR_TXE) {
        if (!ring_empty(&tx_ring)) {
            USART1->DR = ring_pop(&tx_ring);
        } else {
            USART1->CR1 &= ~USART_CR1_TXEIE;
        }
    }
}
```

NVIC 설정:

```c
// Group 0 ~ 15 priority, sub-priority 없음
NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_4);

// USART1: priority 7 (mid-level)
NVIC_SetPriority(USART1_IRQn, 7);
NVIC_EnableIRQ(USART1_IRQn);

// SysTick: priority 15 (lowest)
NVIC_SetPriority(SysTick_IRQn, 15);

// High-priority sensor IRQ: priority 2
NVIC_SetPriority(EXTI0_IRQn, 2);
NVIC_EnableIRQ(EXTI0_IRQn);
```

## 측정 / 비교

| 동작 | Cortex-M3/M4 cycle | Cortex-M7 cycle |
| --- | --- | --- |
| Exception entry (cold cache) | 12 | 11 |
| Exception entry (warm) | 12 | 11 |
| Exception exit | 12 | 11 |
| Tail-chained entry | 6 | 7 |
| Late-arrival switch | 6 | 7 |
| FPU lazy stacking | +17 (시 사용) | +17 |

| Priority 종류 | 의미 |
| --- | --- |
| Priority 0 ~ 3 | Reset, NMI, HardFault, MemManage (대부분 fixed) |
| Priority 4 ~ 255 | NVIC IRQ (chip별 priority bit 수 다름) |
| Priority bit 수 | STM32 = 4, NXP = 3 ~ 4 |

## 자주 보는 함정

> ⚠️ Handler 이름 typo

vector table은 weak alias로 default handler에 연결됩니다. handler 이름을 잘못 쓰면 IRQ가 발생해도 default(보통 무한 loop)로 들어가 멈춥니다.

> ⚠️ Priority bit 수 가정 오류

ARM 표준은 8 bit이지만 chip별로 3 ~ 4 bit만 구현돼 있습니다. `NVIC_SetPriority(IRQn, 0x0F)`가 chip에 따라 의미가 다릅니다. CMSIS의 `__NVIC_PRIO_BITS` 매크로 사용.

> ⚠️ Group 0(no preempt grouping) 사용

전체를 sub-priority로 두면 IRQ가 다른 IRQ를 preempt 못합니다. 긴 IRQ가 다음 IRQ를 막습니다.

> ⚠️ FPU 사용 task에서 lazy stacking 미설정

M4 FPU가 켜진 상태에서 IRQ 진입 시 FPU register를 자동 push 합니다. context switch와 충돌할 수 있어 FPCAR 활용 필수.

> ⚠️ Pending bit 클리어 누락

EXTI 같은 peripheral IRQ는 NVIC pending 외에 peripheral 자체 pending도 클리어해야 합니다. 안 하면 handler가 끝나는 즉시 다시 호출됩니다.

```c
void EXTI0_IRQHandler(void) {
    EXTI->PR = (1 << 0);    // pending 클리어 필수
    /* ... */
}
```

## 정리

- Cortex-M 예외 처리는 hardware가 12 cycle 안에 stacking·vector fetch·jump를 끝냅니다.
- Tail-chaining과 late-arrival로 cycle을 더 절약합니다.
- Priority는 숫자가 낮을수록 높습니다. group과 sub-priority로 나눕니다.
- Vector table은 startup file에 정의되고, VTOR로 위치를 옮길 수 있습니다.
- Handler 이름, priority bit 수, peripheral pending 클리어가 흔한 디버깅 원인입니다.

다음 편에서는 **ARM 메모리 맵**을 다룹니다. 0x00000000 ~ 0xFFFFFFFF의 표준 배치입니다.

## 관련 항목

- [2-03: ARM 레지스터 구조](/blog/embedded/modern-recipes/part2-03-arm-registers)
- [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- 더 깊이 — [Practical RTOS Internals: PendSV 구현](/blog/embedded/rtos/practical-internals/)
