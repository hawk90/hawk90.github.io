---
title: "인터럽트 누락·중복 진단 — Priority·Pending·Re-entry 추적"
date: 2026-04-19T09:06:00
description: "NVIC pending·priority·level vs edge·shared IRQ — 인터럽트 동작 이상의 흔한 원인을 잡습니다."
series: "Modern Embedded Recipes"
seriesOrder: 117
tags: [recipes, debugging, interrupt, nvic]
---

## 한 줄 요약

> **"인터럽트는 *enable 했다고 떨어지지* 않습니다."** 소스 → peripheral mask → NVIC → priority → CPU mask → ISR 진입의 6단계 중 한 곳만 막혀도 누락이 일어납니다.

## 어떤 상황에서 쓰나

"분명 EXTI enable 했는데 ISR이 안 들어와요." "ADC 변환 완료 IRQ가 가끔 두 번 들어와요." "타이머가 1초마다 떨어져야 하는데 가끔 2초 만에 떨어져요." 이런 류는 거의 모두 *경로 상의 한 단계*가 빠졌거나 *bit clear 순서*가 잘못된 경우입니다.

## 핵심 개념 — IRQ 경로 6단계

1. **외부/내부 event** — GPIO edge, UART byte, timer wrap
2. **Peripheral IRQ enable** — `USART_CR1.RXNEIE`, `TIM_DIER.UIE`
3. **Peripheral event flag** — `USART_SR.RXNE`, `TIM_SR.UIF`
4. **NVIC enable** — `NVIC_ISER[n]`
5. **NVIC priority** — `< BASEPRI`
6. **CPU PRIMASK / FAULTMASK** — global enable

이 6단계가 모두 통과해야 ISR이 떨어집니다. 하나라도 막히면 *조용히* 사라집니다.

## Step 1 — Pending bit 보기

```c
/* NVIC->ISPR[n] — pending set 또는 read */
uint32_t pending = NVIC->ISPR[USART1_IRQn / 32] & (1U << (USART1_IRQn % 32));

if (pending) {
    printf("IRQ pending이지만 진입 안 됨\n");
}
```

Pending이 *떠 있는데 진입 안 됨* = NVIC enable 또는 priority 문제.
Pending이 *떠 있지 않음* = source가 trigger 안 되었거나 peripheral mask 막힘.

이 한 줄로 위 6단계의 어느 쪽 문제인지 둘로 나눕니다.

## NVIC 상태 dump 함수

```c
void nvic_dump(int irqn) {
    uint32_t en  = NVIC->ISER[irqn / 32] & (1U << (irqn % 32));
    uint32_t pen = NVIC->ISPR[irqn / 32] & (1U << (irqn % 32));
    uint32_t act = NVIC->IABR[irqn / 32] & (1U << (irqn % 32));
    uint32_t pri = NVIC_GetPriority(irqn);

    printf("IRQ %d: en=%lu pen=%lu act=%lu pri=%lu\n",
           irqn, !!en, !!pen, !!act, pri);
    printf("BASEPRI=0x%02lx PRIMASK=%lu\n",
           __get_BASEPRI(), __get_PRIMASK());
}
```

ISER(enable), ISPR(pending), IABR(active), priority 한 줄에 다 보입니다. 디버깅 시 첫 호출.

## 사례 1 — Peripheral 측 mask 누락

```c
// EXTI line 0 GPIO interrupt 설정
HAL_NVIC_SetPriority(EXTI0_IRQn, 5, 0);
HAL_NVIC_EnableIRQ(EXTI0_IRQn);

// → ISR 안 들어옴
```

NVIC는 enable 했는데 EXTI peripheral 측에서 막혔습니다.

```c
EXTI->IMR  |= (1 << 0);   // ← interrupt mask 해제
EXTI->RTSR |= (1 << 0);   // rising edge
```

CubeMX가 보통 자동으로 넣지만, hand-written 코드에서 잘 빠집니다.

체크리스트.

| Peripheral | Mask Register | Event Flag |
|---|---|---|
| EXTI | EXTI_IMR | EXTI_PR (W1C) |
| USART | USART_CR1.{RXNEIE, TXEIE, TCIE} | USART_SR.{RXNE, TXE, TC} |
| TIM | TIM_DIER.{UIE, CCxIE} | TIM_SR.{UIF, CCxIF} (W0C) |
| ADC | ADC_CR1.EOCIE | ADC_SR.EOC |
| I2C | I2C_CR2.{ITEVTEN, ITERREN} | I2C_SR1 |
| DMA | DMA_CCRx.{TCIE, HTIE, TEIE} | DMA_ISR |

## 사례 2 — Flag clear 빠짐 → 무한 IRQ

```c
void TIM2_IRQHandler(void) {
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    /* UIF clear 빠짐 → ISR exit 직후 다시 진입 → CPU 100% */
}
```

다음을 추가해야 합니다.

```c
void TIM2_IRQHandler(void) {
    if (TIM2->SR & TIM_SR_UIF) {
        TIM2->SR &= ~TIM_SR_UIF;   /* W0C — 1 쓰면 안 됨 */
        HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    }
}
```

Clear 방식이 *W1C(Write 1 to Clear)*냐 *W0C*냐는 peripheral마다 다릅니다. STM32 TIM_SR은 W0C, EXTI_PR은 W1C입니다. 데이터시트 확인 필수.

## 사례 3 — Level vs Edge 혼동

```text
GPIO interrupt: edge-triggered (rising/falling)
UART RXNE:      level (RXNE = 1인 동안 IRQ pending)
```

UART RXNE를 *읽지 않고* ISR을 빠져나가면 RXNE가 그대로 1이라 다시 IRQ가 떨어집니다.

```c
void USART1_IRQHandler(void) {
    if (USART1->SR & USART_SR_RXNE) {
        uint8_t b = USART1->DR;   /* DR 읽기로 RXNE clear */
        ring_push(b);
    }
}
```

Edge-triggered EXTI는 *한 번만* 떨어집니다. Level-triggered peripheral은 *조건이 사라질 때까지* 계속 떨어집니다.

## 사례 4 — Priority 역전

```c
HAL_NVIC_SetPriority(EXTI0_IRQn,   3, 0);   // 높은 priority (숫자 작음)
HAL_NVIC_SetPriority(USART1_IRQn,  5, 0);

// FreeRTOS configMAX_SYSCALL_INTERRUPT_PRIORITY = 5
// USART1은 RTOS API 호출 가능, EXTI0는 *불가*
```

EXTI0 ISR에서 `xQueueSendFromISR`을 호출하면 ConfigMAX 위라 *assertion fail* 또는 *조용한 동작 불량*. FreeRTOS configASSERT가 켜져 있어야 잡힙니다.

```c
configASSERT(intpri >= configMAX_SYSCALL_INTERRUPT_PRIORITY);
```

또 다른 함정. ARM은 priority bit가 *상위 비트*에 위치합니다. STM32F4는 4 bit priority이므로 `SetPriority(irq, 5, 0)`은 실제로 `0x50`이 register에 쓰입니다. AIRCR PRIGROUP 설정에 따라 preemption/sub-priority 분할이 바뀝니다.

## 사례 5 — IRQ 중복 — Shared IRQ

```c
// STM32F4 EXTI 9_5는 EXTI5~9 모두 같은 ISR
void EXTI9_5_IRQHandler(void) {
    handle_button();   /* line 6 가정 */
}
```

EXTI5와 EXTI8이 모두 enable되어 있으면 두 line 다 같은 ISR로 들어옵니다. ISR 안에서 *어느 line인지* 확인해야 합니다.

```c
void EXTI9_5_IRQHandler(void) {
    if (EXTI->PR & (1 << 5)) {
        EXTI->PR = (1 << 5);
        handle_line5();
    }
    if (EXTI->PR & (1 << 6)) {
        EXTI->PR = (1 << 6);
        handle_line6();
    }
    /* ... */
}
```

USART error/event도 같은 IRQ인 chip이 있습니다. `SR` 전체를 확인하고 *모든 source*를 처리해야 합니다.

## 사례 6 — Tail-chaining으로 보이는 누락

```text
ISR A 진입 → 실행 중 ISR A 다시 trigger → pending 1로 set
ISR A 종료 → 즉시 ISR A 재진입 (tail-chain)
```

이 자체는 정상입니다. 문제는 *코드가 두 번 처리하길 기대하지 않은* 경우입니다.

```c
// 잘못된 가정
if (timer_overflow_count > 5) action();

// → tail-chain으로 count가 한 번에 +2 될 수 있음
```

Counter 증가 자체는 atomic이지만, *몇 번 떨어졌는지*를 정확히 잡으려면 hardware로 보내는 게 안전합니다 (예: timer capture/compare).

## 사례 7 — Interrupt latency로 보이는 누락

```text
ISR B priority 1, 실행 중 5ms
ISR A priority 5, B 동안에 두 번 trigger
→ A는 한 번만 진입 (pending bit는 *1 bit*)
```

같은 IRQ가 ISR 동안 *두 번* trigger되어도 pending은 1로 합쳐집니다. UART에서 byte 단위 RXNE로 받지 못하고 누락이 발생하는 가장 흔한 원인입니다.

해결.

- DMA + circular buffer로 옮김
- FIFO가 있는 UART는 FIFO threshold 활용
- ISR B를 짧게 (deferred work으로 옮김)

## 진단 도구 — GPIO toggle로 ISR 진입 가시화

```c
void EXTI0_IRQHandler(void) {
    GPIOC->BSRR = GPIO_PIN_0;   /* ISR entry */
    EXTI->PR = (1 << 0);
    handle_button();
    GPIOC->BSRR = (uint32_t)GPIO_PIN_0 << 16;  /* exit */
}
```

GPIO_PIN_0에 logic analyzer를 걸면 *몇 번, 언제, 얼마나 걸리는지* 한 화면에 보입니다. printf보다 부담이 작고 정확합니다.

## DWT cycle counter로 latency 측정

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
DWT->CYCCNT = 0;

uint32_t enter_cyc;

void TIM2_IRQHandler(void) {
    enter_cyc = DWT->CYCCNT;
    /* ... */
    uint32_t isr_cyc = DWT->CYCCNT - enter_cyc;
    if (isr_cyc > max_isr_cyc) max_isr_cyc = isr_cyc;
}
```

ISR latency·duration histogram을 만들면 worst-case가 보입니다.

## 자주 보는 함정

> NVIC enable 전에 peripheral enable

```c
USART1->CR1 |= USART_CR1_RXNEIE;   /* RXNE flag 이미 1일 수 있음 */
NVIC_EnableIRQ(USART1_IRQn);
/* → enable 즉시 IRQ 떨어짐, ISR 아직 setup 미완 */
```

순서: peripheral mask → flag clear → NVIC pending clear → NVIC enable.

> Spurious IRQ

```c
HAL_NVIC_EnableIRQ(EXTI0_IRQn);   /* EXTI_PR.0 이미 1 */
/* → 즉시 ISR 진입 */
```

Enable 직전에 pending clear.

```c
NVIC_ClearPendingIRQ(EXTI0_IRQn);
EXTI->PR = (1 << 0);
HAL_NVIC_EnableIRQ(EXTI0_IRQn);
```

> Critical section 너무 김

```c
__disable_irq();
slow_work();   /* 100µs — 그 동안 IRQ 누락 */
__enable_irq();
```

Critical section은 µs 단위로 짧게. Priority masking(`BASEPRI`)으로 *고우선* IRQ는 살려 둡니다.

> RTOS API를 priority 위에서 호출

`configMAX_SYSCALL_INTERRUPT_PRIORITY` 위 priority ISR에서는 `*FromISR` API조차 호출 금지. 잘못 호출하면 ready list가 깨집니다.

> Edge-triggered EXTI에 noisy 입력

Bouncy 버튼은 한 번 눌러도 수십 번 edge가 떨어집니다. RC debounce 또는 software debounce를 둡니다.

## 정리

- IRQ 경로 6단계 중 어느 하나만 막혀도 누락이 일어납니다.
- Pending bit가 *떠 있는데 진입 안 됨* = NVIC/priority 문제.
- Pending이 *떠 있지 않음* = peripheral mask 또는 source 문제.
- Flag clear 빠뜨리면 무한 IRQ로 CPU 100%.
- Clear 방식 W1C/W0C는 peripheral마다 다릅니다.
- Shared IRQ는 ISR 안에서 *모든 source*를 dispatch해야 합니다.
- 같은 IRQ가 ISR 동안 두 번 trigger되면 pending이 1로 합쳐져 누락이 됩니다.
- GPIO toggle + logic analyzer가 ISR 진입 가시화의 최단 경로.
- `configMAX_SYSCALL_INTERRUPT_PRIORITY` 위에서는 RTOS API 호출 금지.

다음 편은 **메모리 오버플로우/오염**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [RTOS 3-04: ISR 디자인](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
