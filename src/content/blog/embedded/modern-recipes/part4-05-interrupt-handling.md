---
title: "4-05: 인터럽트 핸들링"
date: 2026-05-13T15:00:00
description: "NVIC 설정·ISR 작성·prologue/epilogue·priority."
series: "Modern Embedded Recipes"
seriesOrder: 39
tags: [recipes, bare-metal, interrupt]
draft: false
---

## 한 줄 요약

> **"NVIC enable + ISR 이름 일치 + priority 설정."** Cortex-M의 인터럽트는 이 세 가지만 맞으면 동작합니다. 그 외는 모두 디테일입니다.

## 어떤 상황에서 쓰나

polling으로 처리하는 모든 일은 인터럽트로 옮길 수 있습니다. UART 수신, button press, timer expire, ADC complete, DMA done. 차이는 *CPU가 다른 일을 할 수 있느냐*입니다. 처음 ISR을 작성하면 *동작은 하는데* 의도와 다른 일이 벌어집니다 — flag clear를 안 했거나, priority가 잘못됐거나, ISR 이름이 weak symbol과 안 맞아 default로 빠지거나.

이 글은 Cortex-M NVIC 사용법을 한 번에 정리합니다.

## 핵심 개념

### Vector table과 ISR 명명

Cortex-M의 vector table은 reset 시 Flash 시작 (보통 `0x08000000`)에 배치되고, `SCB->VTOR`로 재배치합니다.

```text
Offset  Vector
0x00    Initial MSP
0x04    Reset_Handler
0x08    NMI_Handler
0x0C    HardFault_Handler
0x10    MemManage_Handler
0x14    BusFault_Handler
0x18    UsageFault_Handler
...
0x40    WWDG_IRQHandler       ← IRQ 0
0x44    PVD_IRQHandler        ← IRQ 1
...
0x58    EXTI0_IRQHandler      ← IRQ 6
...
0xD4    USART1_IRQHandler     ← IRQ 37
```

CMSIS startup 파일은 모든 ISR을 `weak` symbol로 정의해 두고, 사용자가 같은 이름으로 정의하면 *그쪽이 우선*합니다.

```c
// startup_stm32f411xe.c
__attribute__((weak)) void USART1_IRQHandler(void) { while(1); }

// user code
void USART1_IRQHandler(void) {
    // 사용자 코드 — weak를 덮어씀
}
```

이름을 한 글자라도 틀리면 weak symbol이 살아남아 *while(1)에서 hang*합니다. 모든 IRQ 이름은 vendor의 startup 파일에서 확인합니다.

### NVIC 구성

```text
                  ┌─────────────────┐
peripheral IRQ ──→│   NVIC          │──→ CPU
                  │  - enable        │
                  │  - pending       │
                  │  - active        │
                  │  - priority      │
                  └─────────────────┘
```

세 가지 API가 핵심입니다.

```c
NVIC_EnableIRQ(USART1_IRQn);            // mask 풀어서 받기 시작
NVIC_DisableIRQ(USART1_IRQn);           // mask 걸기
NVIC_SetPriority(USART1_IRQn, 6);       // priority 설정
```

### Priority

Cortex-M의 priority는 *값이 작을수록 높습니다*. 8-bit field지만, 보통 상위 4-bit (16 levels)만 implement됩니다.

```c
// 0 (highest) ~ 15 (lowest) for 4-bit priority
NVIC_SetPriority(EXTI0_IRQn, 0);     // 가장 높음
NVIC_SetPriority(USART1_IRQn, 8);    // 중간
NVIC_SetPriority(TIM2_IRQn, 15);     // 가장 낮음
```

priority가 같으면 *IRQ 번호가 작은 쪽이 먼저*입니다.

### Pre-empt vs Sub-priority

8-bit priority를 *pre-empt group*과 *sub-group*으로 나눌 수 있습니다 (`SCB->AIRCR.PRIGROUP`). 같은 pre-empt group이면 *다른 ISR이 실행 중일 때 인터럽트 못 함*, sub-priority는 동시에 pending되었을 때만 의미.

대부분의 프로젝트는 *all pre-empt*로 두는 편이 안전합니다.

```c
NVIC_SetPriorityGrouping(0);   // all 4 bits = pre-empt
```

### Tail-Chaining과 Late Arrival

ISR 끝나면 *context restore 없이* 다음 pending IRQ로 바로 진입 (6-12 cycle 절약). late arrival은 *낮은 priority ISR이 stacking 중일 때 높은 priority가 오면* 그쪽을 먼저 처리하고 돌아옵니다. 둘 다 hardware가 자동입니다.

## 코드 예제

### 1. EXTI button — GPIO interrupt

PC13 button (active-low)을 EXTI13으로 받습니다.

```c
void exti_init(void) {
    // 1. GPIOC enable, PC13 input + pull-up
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOCEN;
    gpio_init(GPIOC, 13, &(gpio_config_t){
        .mode = GPIO_MODE_INPUT, .pull = GPIO_PULL_UP,
    });

    // 2. SYSCFG enable, EXTI13 source = port C
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;
    SYSCFG->EXTICR[3] &= ~(0xFu << 4);     // EXTI13 (3번째 word, bits 7:4)
    SYSCFG->EXTICR[3] |=  (2u  << 4);      // 2 = PortC

    // 3. EXTI 설정 — falling edge trigger
    EXTI->IMR  |=  (1u << 13);   // unmask
    EXTI->FTSR |=  (1u << 13);   // falling
    EXTI->RTSR &= ~(1u << 13);   // rising off

    // 4. NVIC
    NVIC_SetPriority(EXTI15_10_IRQn, 8);
    NVIC_EnableIRQ(EXTI15_10_IRQn);
}

volatile uint32_t button_count;

void EXTI15_10_IRQHandler(void) {
    if (EXTI->PR & (1u << 13)) {
        EXTI->PR = (1u << 13);   // clear (write 1 to clear)
        button_count++;
    }
}
```

### 2. TIM2 periodic interrupt

```c
void tim2_init_1khz(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;

    // TIM2 clock = 84 MHz (APB1 × 2)
    // prescaler 84 → 1 MHz; period 1000 → 1 kHz
    TIM2->PSC = 84 - 1;
    TIM2->ARR = 1000 - 1;
    TIM2->DIER = TIM_DIER_UIE;     // update interrupt enable
    TIM2->CR1  = TIM_CR1_CEN;

    NVIC_SetPriority(TIM2_IRQn, 10);
    NVIC_EnableIRQ(TIM2_IRQn);
}

volatile uint32_t ms_count;

void TIM2_IRQHandler(void) {
    if (TIM2->SR & TIM_SR_UIF) {
        TIM2->SR &= ~TIM_SR_UIF;   // clear
        ms_count++;
    }
}
```

### 3. ISR 안에서 yield (RTOS-free critical section)

```c
volatile int g_flag;

void EXTI0_IRQHandler(void) {
    EXTI->PR = (1u << 0);
    g_flag = 1;
    __SEV();   // event signal — WFE 깨움
}

// main
while (1) {
    if (!g_flag) {
        __WFE();   // wait for event (low power)
    } else {
        g_flag = 0;
        handle_event();
    }
}
```

WFE/SEV는 RTOS 없이도 *event-driven loop*을 만드는 가장 간단한 패턴입니다.

## 측정 / 동작 확인

ISR이 들어오는지 확인은 GPIO toggle이 가장 단순합니다.

```c
void EXTI15_10_IRQHandler(void) {
    GPIOA->BSRR = (1u << 5);    // PA5 high
    if (EXTI->PR & (1u << 13)) {
        EXTI->PR = (1u << 13);
        button_count++;
    }
    GPIOA->BSRR = (1u << 21);   // PA5 low
}
```

스코프로 PA5를 보면 ISR entry-exit 시간이 *pulse width*로 보입니다. 보통 100-300 ns 정도 (168 MHz 기준 ISR overhead + 본문).

ISR이 들어오지 않으면 *NVIC pending register*를 확인합니다.

```text
(gdb) p/x NVIC->ISPR[1]
$1 = 0x00000040   ← EXTI15_10 pending
```

pending이 set인데 ISR이 안 들어온다면 enable이나 priority 마스크 (BASEPRI, PRIMASK) 문제입니다.

## 자주 보는 함정

> ⚠️ ISR 이름 오타

`EXTI15_10_IRQHandler`를 `Exti15_10_IRQHandler`로 쓰면 weak symbol이 살아 default로 빠집니다. ISR이 *조용히 안 들어오는* 가장 흔한 원인.

> ⚠️ Flag clear를 안 함

EXTI의 `PR`, USART의 `SR`, TIM의 `SR`은 *ISR 안에서 clear*해야 합니다. 안 하면 ISR이 끝나자마자 다시 들어와서 *infinite loop*.

> ⚠️ Priority 0으로 모두 설정

priority가 같으면 nested가 안 됩니다. critical work는 priority를 높이고 일반 work는 낮춥니다.

> ⚠️ ISR 안에서 긴 작업

50 µs 이상 걸리면 다른 ISR이 막힙니다. flag만 set하고 main loop이나 task로 work를 넘기는 *bottom-half 패턴*을 씁니다.

> ⚠️ Shared 변수에 `volatile` 누락

main과 ISR이 공유하는 변수는 `volatile`. 안 그러면 compiler가 register에 캐싱해 main이 ISR 변화를 못 봅니다.

> ⚠️ Floating-point in ISR (Cortex-M4F/M7)

FPU lazy stacking 설정에 따라 stack 사용량이 늘어납니다. ISR 안에서는 float을 피하거나 `FPU_LAZYSTATE`를 명시적으로 관리합니다.

## 정리

- ISR은 **weak symbol을 덮는 방식**. 이름 정확히 일치.
- 세 단계: **peripheral configure → NVIC enable → priority set**.
- **Flag clear**는 ISR 첫 줄에. 안 하면 즉시 재진입.
- Cortex-M priority는 **값 작을수록 높음**.
- ISR은 짧게, 긴 일은 **main loop으로 넘김**.

다음 편은 **SysTick 타이머**입니다. RTOS 없이 시간 처리, delay, jiffies를 다룹니다.

## 관련 항목

- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortexm-exceptions)
- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
