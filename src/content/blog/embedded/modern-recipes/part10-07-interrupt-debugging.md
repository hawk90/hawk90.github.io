---
title: "인터럽트 누락·중복 진단 — Priority·Pending·Re-entry 추적"
slug: "embedded/modern-recipes/part10-07-interrupt-debugging"
date: 2026-04-19T09:06:00
description: "IRQ가 ISR까지 가는 6단계를 나누고, NVIC pending·enable·PRIMASK 병합·BASEPRI 마스킹을 QEMU에서 실제로 돌려 확인하며, 플래그 지우는 방식과 우선순위 비트를 HAL·CMSIS·FreeRTOS 소스로 짚습니다."
series: "Modern Embedded Recipes"
seriesOrder: 117
tags: [recipes, debugging, interrupt, nvic]
topics: ["embedded"]
---

## 한 줄 요약

> **"인터럽트는 *enable했다고 해서 들어오지는* 않습니다."** 소스 → peripheral mask → NVIC → priority → CPU mask → ISR 진입의 6단계 중 한 곳만 막혀도 누락이 일어납니다.

## 어떤 상황에서 쓰나

"EXTI를 enable했는데 ISR이 안 들어온다", "IRQ가 가끔 두 번 들어온다", "주기 인터럽트가 가끔 한 번 빠진다" 같은 증상을 다룹니다. 이벤트가 ISR까지 가는 경로를 단계로 나누고, NVIC의 동작은 QEMU 11.1.3의 STM32F405 머신(`netduinoplus2`)에서 실제로 확인합니다. NVIC 동작의 근거는 ARMv7-M ARM(DDI 0403E)과 CMSIS, STM32 쪽 플래그 처리는 ST HAL v1.8.6입니다.

## 핵심 개념 — IRQ 경로 6단계

1. **외부/내부 event** — GPIO edge, UART byte, timer wrap
2. **Peripheral IRQ enable** — `USART_CR1.RXNEIE`, `TIM_DIER.UIE`
3. **Peripheral event flag** — `USART_SR.RXNE`, `TIM_SR.UIF`
4. **NVIC enable** — `NVIC_ISER[n]`
5. **NVIC priority** — `< BASEPRI`
6. **CPU PRIMASK / FAULTMASK** — global enable

이 6단계를 모두 통과해야 ISR이 실행됩니다. 하나라도 막히면 오류 없이 아무 일도 일어나지 않습니다.

## Step 1 — Pending bit 보기

```c
/* NVIC->ISPR[n] — pending set 또는 read */
uint32_t pending = NVIC->ISPR[USART1_IRQn / 32] & (1U << (USART1_IRQn % 32));

if (pending) {
    printf("IRQ pending이지만 진입 안 됨\n");
}
```

Pending이 *떠 있는데 진입하지 않으면* NVIC enable이나 priority 문제입니다.
Pending이 *떠 있지 않으면* source가 trigger되지 않았거나 peripheral mask에서 막힌 것입니다.

이 한 줄로 위 6단계의 어느 쪽 문제인지 둘로 나눕니다.

이 나눔이 실제로 성립하는지 QEMU에서 확인했습니다. EXTI0(IRQ 6)와 EXTI1(IRQ 7)을 소프트웨어로 pending시키며 세 가지를 봅니다. ISR은 호출 횟수만 셉니다.

```c
int main(void) {
    pr("__NVIC_PRIO_BITS = %d\n", __NVIC_PRIO_BITS);

    pr("1) pending but not enabled\n");
    NVIC_SetPriority(EXTI0_IRQn, 5);
    NVIC_SetPendingIRQ(EXTI0_IRQn);
    dump(EXTI0_IRQn); pr("  n_exti0=%u\n", n_exti0);
    NVIC_EnableIRQ(EXTI0_IRQn);
    pr("  after enable: n_exti0=%u\n", n_exti0); dump(EXTI0_IRQn);

    pr("2) two triggers while masked -> one entry\n");
    __disable_irq();
    NVIC_SetPendingIRQ(EXTI0_IRQn);
    NVIC_SetPendingIRQ(EXTI0_IRQn);
    __enable_irq();
    pr("  n_exti0=%u (expected +1)\n", n_exti0);

    pr("3) BASEPRI=0x50 masks priority 5, not priority 3\n");
    NVIC_SetPriority(EXTI1_IRQn, 3);
    NVIC_EnableIRQ(EXTI1_IRQn);
    __set_BASEPRI(5 << (8 - __NVIC_PRIO_BITS));
    NVIC_SetPendingIRQ(EXTI0_IRQn);
    NVIC_SetPendingIRQ(EXTI1_IRQn);
    pr("  n_exti0=%u n_exti1=%u\n", n_exti0, n_exti1); dump(EXTI0_IRQn);
    __set_BASEPRI(0);
    pr("  BASEPRI=0 -> n_exti0=%u\n", n_exti0);

    return 0;
}
```

1-03의 semihosting 하네스(`pr()`)로 빌드해 돌린 결과입니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -g -ffreestanding -nostdlib -DSTM32F407xx \
  -I cmsis_device_f4/Include -I CMSIS_5/CMSIS/Core/Include -Wall \
  -T link.ld startup.c sh.c irq.c -lgcc -o irq.elf
qemu-system-arm -M netduinoplus2 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native -kernel irq.elf
```

```text
__NVIC_PRIO_BITS = 4
1) pending but not enabled
  IRQ6 en=0 pend=1 active=0 IPR=0x50 prio=5
  n_exti0=0
  after enable: n_exti0=1
  IRQ6 en=1 pend=0 active=0 IPR=0x50 prio=5
2) two triggers while masked -> one entry
  n_exti0=2 (expected +1)
3) BASEPRI=0x50 masks priority 5, not priority 3
  n_exti0=2 n_exti1=1
  IRQ6 en=1 pend=1 active=0 IPR=0x50 prio=5
  BASEPRI=0 -> n_exti0=3
```

1)은 위 나눔 그대로입니다. pending은 1인데 enable이 0이라 ISR이 한 번도 실행되지 않고, enable하자마자 한 번 실행되며 pending이 0으로 내려갑니다. 2)는 아래 「사례 7」의 근거입니다. PRIMASK로 막아 둔 동안 두 번 pending시켜도 풀었을 때 ISR은 한 번만 실행됩니다. pending은 IRQ마다 비트 하나라서 두 번이 하나로 합쳐집니다. 3)은 「사례 4」의 근거입니다. `BASEPRI` = 0x50이면 우선순위 5(IPR 0x50)인 EXTI0는 pending으로 남고, 우선순위 3인 EXTI1은 실행됩니다. ARMv7-M ARM B1.4.3은 BASEPRI가 예외가 선점하는 데 필요한 우선순위 수준을 바꾸며, 실행 중인 소프트웨어의 우선순위보다 낮은 값일 때만 효과가 있다고 적습니다. 우선순위 값이 BASEPRI(0x50) 이상인 EXTI0는 막히고, 그보다 작은 EXTI1(0x30)은 통과합니다.

## NVIC 상태 dump 함수

```c
void nvic_dump(int irqn) {
    uint32_t en  = NVIC->ISER[irqn / 32] & (1U << (irqn % 32));
    uint32_t pen = NVIC->ISPR[irqn / 32] & (1U << (irqn % 32));
    uint32_t act = NVIC->IABR[irqn / 32] & (1U << (irqn % 32));
    uint32_t pri = NVIC_GetPriority(irqn);

    printf("IRQ %d: en=%d pen=%d act=%d pri=%lu\n",
           irqn, !!en, !!pen, !!act, pri);
    printf("BASEPRI=0x%02lx PRIMASK=%lu\n",
           __get_BASEPRI(), __get_PRIMASK());
}
```

ISER(enable), ISPR(pending), IABR(active), priority 한 줄에 다 보입니다. 디버깅을 시작할 때 가장 먼저 부릅니다.

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

HAL의 GPIO 초기화(`HAL_GPIO_Init()`에 EXTI 모드를 주는 경우)는 이 두 레지스터를 설정하지만, 레지스터를 직접 다루는 코드는 NVIC만 켜고 이 단계를 빠뜨리기 쉽습니다.

확인할 것은 다음과 같습니다.

| Peripheral | Mask Register | Event Flag |
|---|---|---|
| EXTI | EXTI_IMR | EXTI_PR (W1C) |
| USART | USART_CR1.{RXNEIE, TXEIE, TCIE} | USART_SR.{RXNE, TXE, TC} |
| TIM | TIM_DIER.{UIE, CCxIE} | TIM_SR.{UIF, CCxIF} (0을 써서 지움) |
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
        TIM2->SR = ~TIM_SR_UIF;    /* 0을 쓴 비트만 지워지고, 1을 쓴 비트는 그대로 */
        HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    }
}
```

지우는 방식은 레지스터마다 다릅니다. HAL v1.8.6이 그 차이를 보여 줍니다. `__HAL_TIM_CLEAR_FLAG()`는 `Instance->SR = ~(FLAG)`로 지울 비트에만 0을 쓰고(`stm32f4xx_hal_tim.h` 1224행), `__HAL_GPIO_EXTI_CLEAR_IT()`는 `EXTI->PR = (LINE)`으로 지울 비트에 1을 씁니다(`stm32f4xx_hal_gpio.h` 199행). TIM_SR을 `&=`로 지우면 읽고 다시 쓰는 사이에 새로 선 다른 플래그를 0으로 덮을 수 있으므로, HAL처럼 대입 한 번으로 씁니다.

## 사례 3 — Level vs Edge 혼동

EXTI는 설정한 edge(`RTSR`·`FTSR`)에서 한 번 플래그를 세웁니다. USART의 RXNE 인터럽트는 RXNE 플래그가 서 있는 동안 계속 요청을 내므로, 데이터 레지스터를 *읽지 않고* ISR을 빠져나가면 RXNE가 그대로 1이라 곧바로 다시 들어옵니다.

```c
void USART1_IRQHandler(void) {
    if (USART1->SR & USART_SR_RXNE) {
        uint8_t b = USART1->DR;   /* DR 읽기로 RXNE clear */
        ring_push(b);
    }
}
```

edge로 걸리는 EXTI는 플래그를 지우면 다음 edge까지 조용하고, 플래그가 서 있는 동안 요청하는 주변장치는 원인 조건이 사라질 때까지 계속 요청합니다.

## 사례 4 — Priority 역전

```c
HAL_NVIC_SetPriority(EXTI0_IRQn,   3, 0);   // 높은 priority (숫자 작음)
HAL_NVIC_SetPriority(USART1_IRQn,  5, 0);

// FreeRTOS configMAX_SYSCALL_INTERRUPT_PRIORITY = (5 << (8 - __NVIC_PRIO_BITS)) = 0x50
// USART1은 RTOS API 호출 가능, EXTI0는 *불가*
```

EXTI0 ISR에서 `xQueueSendFromISR()`을 부르면 FreeRTOS가 허용하는 범위 밖입니다. FreeRTOS V11.2.0 `portable/GCC/ARM_CM4F/port.c`의 `vPortValidateInterruptPriority()`는 이 경우를 다음 assert로 잡습니다(888행). `configASSERT()`를 정의해 둬야 동작합니다.

```c
configASSERT( ucCurrentPriority >= ucMaxSysCallPriority );
```

우선순위 비트는 레지스터의 상위 비트에 있습니다. STM32F4 CMSIS 헤더의 `__NVIC_PRIO_BITS`는 4이고, CMSIS `NVIC_SetPriority(irq, 5)`는 `5 << (8 - 4)` = 0x50을 IPR에 씁니다. 위 QEMU 실행의 `IPR=0x50 prio=5`가 그 값입니다. AIRCR의 PRIGROUP 설정에 따라 이 4비트가 preemption과 sub-priority로 나뉩니다.

## 사례 5 — Shared IRQ로 인한 중복

```c
// STM32F4 EXTI 9_5는 EXTI5~9 모두 같은 ISR
void EXTI9_5_IRQHandler(void) {
    handle_line5();    /* line 5만 처리 */
}
```

EXTI5와 EXTI6이 모두 enable되어 있으면 두 line 다 같은 ISR로 들어옵니다. ISR 안에서 *어느 line인지* 확인해야 합니다.

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

STM32F4의 USART1은 RXNE·TXE·TC·오류가 모두 `USART1_IRQn` 하나로 들어옵니다(CMSIS 헤더의 IRQ 번호 목록에 USART1은 하나뿐). ISR은 `SR`을 읽어 선 플래그를 모두 처리합니다.

## 사례 6 — Tail-chaining으로 보이는 누락

순서는 이렇습니다.

1. ISR A에 진입합니다.
2. 실행 중에 ISR A가 다시 trigger되어 pending 비트가 1로 set됩니다.
3. ISR A가 종료되자마자 ISR A로 재진입합니다 (tail-chain).

이 자체는 정상입니다. 문제는 *코드가 두 번 처리하길 기대하지 않은* 경우입니다.

```c
// 잘못된 가정
if (timer_overflow_count > 5) action();

// → pending이 합쳐지면 이벤트 2번에 count는 +1만 오를 수 있음
```

ISR 안의 카운터 증가는 그 ISR이 끝날 때까지 같은 ISR에 다시 끊기지 않으므로 한 번에 1씩 오르지만, 같은 시간에 이벤트가 몇 번 났는지는 위 2)처럼 pending이 합쳐지면 셀 수 없습니다. 이벤트 수가 중요하면 하드웨어 카운터(타이머의 외부 클럭 입력 등)로 셉니다.

## 사례 7 — Interrupt latency로 보이는 누락

우선순위 1인 긴 ISR B가 도는 동안 우선순위 5인 A의 이벤트가 두 번 오면, A의 pending 비트는 하나뿐이라 B가 끝난 뒤 A는 한 번만 실행됩니다. 위 QEMU 실행 2)가 PRIMASK로 같은 상황을 만든 것입니다. UART를 바이트마다 인터럽트로 받는데 ISR 진입이 한 문자 시간보다 늦어지면, 다음 바이트가 데이터 레지스터를 덮어 overrun이 됩니다. 115200 baud 8N1이면 한 문자가 86.8 µs이므로([10-05](/blog/embedded/modern-recipes/part10-05-uart-not-printing)), 더 높은 우선순위 ISR이 그보다 오래 붙잡으면 바이트를 잃습니다.

해결 방법은 다음과 같습니다.

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

GPIO_PIN_0에 logic analyzer를 걸면 ISR이 몇 번, 언제, 얼마나 걸리는지 한 화면에 보입니다. ISR에 더해지는 것은 레지스터 쓰기 두 번뿐입니다.

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

`max_isr_cyc`는 ISR 안에서 걸린 cycle 수의 최댓값입니다. DWT `CYCCNT`가 무엇을 재는지와 측정 경계의 오차는 [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)의 측정 편에서 다룹니다. QEMU는 cycle을 모델링하지 않으므로 이 값은 보드에서 잽니다.

## 자주 보는 함정

> NVIC enable 전에 peripheral enable

```c
USART1->CR1 |= USART_CR1_RXNEIE;   /* RXNE flag 이미 1일 수 있음 */
NVIC_EnableIRQ(USART1_IRQn);
/* → enable 즉시 IRQ 떨어짐, ISR 아직 setup 미완 */
```

enable하는 순간 이미 선 플래그 때문에 ISR이 바로 들어옵니다. 위 QEMU 실행 1)에서 pending이 먼저 서 있던 EXTI0가 enable 직후 실행된 것과 같습니다. 순서는 주변장치 플래그를 지우고, NVIC pending을 지우고, 주변장치 인터럽트를 켜고, NVIC를 켜는 것입니다.

> Spurious IRQ

```c
HAL_NVIC_EnableIRQ(EXTI0_IRQn);   /* EXTI_PR.0 이미 1 */
/* → 즉시 ISR 진입 */
```

Enable 직전에 pending을 지웁니다.

```c
NVIC_ClearPendingIRQ(EXTI0_IRQn);
EXTI->PR = (1 << 0);
HAL_NVIC_EnableIRQ(EXTI0_IRQn);
```

> Critical section 너무 김

```c
__disable_irq();
slow_work();   /* 이 동안 들어온 IRQ는 모두 __enable_irq()까지 기다림 */
__enable_irq();
```

PRIMASK로 막은 동안 들어온 IRQ는 풀 때까지 기다리고, 같은 IRQ가 여러 번 오면 위 2)처럼 하나로 합쳐집니다. 모든 IRQ를 막는 대신 위 3)처럼 `BASEPRI`로 일정 우선순위 이하만 막으면, 더 급한 IRQ는 계속 받습니다.

> RTOS API를 priority 위에서 호출

`configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 높은(숫자가 작은) 우선순위의 ISR은 FreeRTOS가 critical section에서도 막지 않으므로, 그 안에서 `*FromISR` API를 부르면 커널 자료구조를 보호 없이 건드립니다. 위 `configASSERT`가 그 호출을 잡습니다. 자세한 근거는 [Practical RTOS Internals 3-09: ISR-safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)에 있습니다.

> Edge-triggered EXTI에 noisy 입력

기계식 버튼은 접점이 붙는 동안 여러 번 열리고 닫히므로, edge로 거는 EXTI는 한 번 누름에 여러 번 들어올 수 있습니다. 횟수는 버튼과 회로에 따라 다르므로 logic analyzer로 그 버튼의 edge를 직접 세고, RC 필터나 소프트웨어 debounce를 둡니다.

## 정리

- IRQ 경로 6단계 중 어느 하나만 막혀도 누락이 일어납니다.
- Pending bit가 *떠 있는데 진입 안 됨* = NVIC/priority 문제.
- Pending이 *떠 있지 않음* = peripheral mask 또는 source 문제.
- 플래그를 지우지 않으면 ISR을 빠져나가자마자 다시 들어옵니다.
- TIM_SR은 0을 써서, EXTI_PR은 1을 써서 지웁니다(HAL 매크로).
- Shared IRQ는 ISR 안에서 *모든 source*를 dispatch해야 합니다.
- 같은 IRQ가 막혀 있는 동안 두 번 오면 pending이 하나로 합쳐져 ISR은 한 번만 실행됩니다(QEMU에서 확인).
- `BASEPRI` = 0x50은 우선순위 값 5 이상(덜 급한 쪽)을 막고 3은 통과시킵니다(QEMU에서 확인).
- ISR 진입은 GPIO toggle + logic analyzer로 가장 빨리 볼 수 있습니다.
- `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 높은 우선순위에서는 RTOS API를 부르지 않습니다.

다음 편은 **메모리 오염 진단**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [RTOS 2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
