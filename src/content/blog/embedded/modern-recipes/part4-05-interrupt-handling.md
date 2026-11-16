---
title: "Cortex-M 인터럽트 핸들링 — NVIC·Priority·Vector·EXTI"
slug: "embedded/modern-recipes/part4-05-interrupt-handling"
date: 2026-04-13T09:39:00
description: "NVIC 설정·ISR 작성·prologue/epilogue·priority."
series: "Modern Embedded Recipes"
seriesOrder: 39
tags: [recipes, bare-metal, interrupt]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"peripheral 설정, ISR 이름 일치, NVIC 설정이 맞아야 인터럽트가 들어옵니다."** Cortex-M 인터럽트의 기본 흐름은 이 세 축으로 확인하고, flag clear·priority grouping·vector 배치는 코어와 peripheral 문서로 함께 검증합니다.

## 어떤 상황에서 쓰나

polling으로 처리하던 UART 수신, button press, timer expire, ADC complete, DMA done은 인터럽트로 옮길 수 있습니다. 차이는 CPU가 기다리는 동안 다른 일을 할 수 있느냐입니다. ISR이 동작은 하는데 의도와 다른 결과가 나오는 원인으로 이 글은 세 가지를 실제로 재현합니다. flag clear를 안 한 경우, priority가 잘못된 경우, ISR 이름이 vector table의 weak symbol과 안 맞아 default handler로 빠지는 경우입니다.

이 글은 Cortex-M NVIC 사용법을 STM32F4 기준으로 정리하고, priority·preemption·이름 오타를 QEMU 11.1.3 `netduinoplus2`(STM32F405)에서 직접 돌려 확인합니다.

## 핵심 개념

### Vector table과 ISR 명명

ARMv7-M ARM(DDI 0403E.b) B1.5.3의 Table B1-5는 vector table의 word 0이 `SP_main` 초기값, 그 뒤가 exception 번호 순이라고 정의합니다. 외부 인터럽트 IRQ n은 exception 번호 16+n이므로 offset `0x40 + 4n`에 있습니다. reset 때 table 주소는 "IMPLEMENTATION DEFINED"이고 VTOR로 옮길 수 있습니다([4-01](/blog/embedded/modern-recipes/part4-01-first-baremetal)). IRQ 번호는 `stm32f407xx.h`의 `IRQn_Type`에서 왔고(`WWDG_IRQn = 0`, `PVD_IRQn = 1`, `EXTI0_IRQn = 6`, `TIM2_IRQn = 28`, `USART1_IRQn = 37`, `EXTI15_10_IRQn = 40`), 아래 offset은 ST startup으로 빌드한 ELF의 `.isr_vector`에서 읽은 값과 같습니다.

| Offset | Vector |
| --- | --- |
| `0x00` | Initial MSP |
| `0x04` | `Reset_Handler` |
| `0x08` | `NMI_Handler` |
| `0x0C` | `HardFault_Handler` |
| `0x10`·`0x14`·`0x18` | `MemManage_Handler`·`BusFault_Handler`·`UsageFault_Handler` |
| `0x40` | `WWDG_IRQHandler` (IRQ 0) |
| `0x44` | `PVD_IRQHandler` (IRQ 1) |
| `0x58` | `EXTI0_IRQHandler` (IRQ 6) |
| `0xB0` | `TIM2_IRQHandler` (IRQ 28) |
| `0xD4` | `USART1_IRQHandler` (IRQ 37) |
| `0xE0` | `EXTI15_10_IRQHandler` (IRQ 40) |

ST의 GCC startup(cmsis-device-f4 `Source/Templates/gcc/startup_stm32f405xx.s`)은 handler마다 weak alias를 둡니다.

```text
   .weak      EXTI15_10_IRQHandler
   .thumb_set EXTI15_10_IRQHandler,Default_Handler
```

`Default_Handler`는 같은 파일에서 `Infinite_Loop: b Infinite_Loop` 한 줄입니다. 사용자가 같은 이름으로 함수를 정의하면 그쪽이 vector에 들어가고, 이름이 한 글자라도 다르면 weak alias가 그대로 남아 인터럽트가 이 무한 loop로 갑니다. 아래 "자주 보는 함정"에서 실제로 돌려 봅니다.

### NVIC 구성

| 흐름 | NVIC 내부 상태 / 필드 | 비고 |
| --- | --- | --- |
| peripheral IRQ → NVIC | enable (`ISER`/`ICER`) | 받을지 결정 |
| NVIC 내부 | pending (`ISPR`/`ICPR`) | 미처리 IRQ 표시 |
| NVIC 내부 | active (`IABR`) | 처리 중 표시 |
| NVIC 내부 | priority (`IPR`) | 작을수록 높음 |
| NVIC → CPU | 가장 높은 priority의 pending 선택 | CPU에 인터럽트 신호 |

CMSIS의 핵심 API는 세 개입니다.

```c
NVIC_EnableIRQ(USART1_IRQn);            // mask 풀어서 받기 시작
NVIC_DisableIRQ(USART1_IRQn);           // mask 걸기
NVIC_SetPriority(USART1_IRQn, 6);       // priority 설정
```

### Priority

DDI 0403E.b B1.5.4는 priority 값이 작을수록 높고, 모든 priority field가 8 bit이며, 구현이 256단계보다 적으면 "low-order bits of these fields are RAZ"라고 합니다. 구현 단계 수는 8~256 사이의 2의 거듭제곱입니다(Table B1-6). STM32F4는 ST 헤더의 `__NVIC_PRIO_BITS`가 4이고, QEMU의 F405 모델도 `num-prio-bits`를 4로 둡니다. CMSIS_6 `core_cm4.h`의 `NVIC_SetPriority()`는 넘긴 값을 `8U - __NVIC_PRIO_BITS`(= 4) bit만큼 왼쪽으로 밀어 상위 bit에 넣으므로, 4 bit 구현에서는 0~15를 씁니다.

```c
// priority bit가 4개인 STM32F4
NVIC_SetPriority(EXTI0_IRQn, 0);     // 가장 높음
NVIC_SetPriority(USART1_IRQn, 8);    // 중간
NVIC_SetPriority(TIM2_IRQn, 15);     // 가장 낮음
```

같은 절은 "When multiple pending exceptions have the same priority number, the exception with the lowest exception number takes precedence. When an exception is active, only an exception with a higher priority can preempt it"라고 적습니다. 같은 priority끼리는 선점하지 못합니다.

### Pre-empt vs Sub-priority

B1.5.4의 priority grouping은 `AIRCR.PRIGROUP`으로 8 bit field를 group priority와 subpriority로 나눕니다. PRIGROUP 0이면 group이 bit[7:1], 3이면 bit[7:4], 6이면 bit[7]뿐입니다. 문서는 "The group priority field defines the priority for preemption"이라고 하고, subpriority는 같은 group 안에서 동시에 pending일 때 순서만 정합니다. 4 bit 구현(bit[7:4])에서 PRIGROUP 0~3은 네 bit가 모두 group priority가 됩니다.

FreeRTOS도 이 설정을 요구합니다. FreeRTOS-Kernel(2026-10 main)의 `portable/GCC/ARM_CM4F/port.c`의 `vPortValidateInterruptPriority()`는 "For simplicity all bits must be defined to be pre-emption priority bits"라고 적고, CMSIS만 쓰는 경우 "calling NVIC_SetPriorityGrouping( 0 ); before starting the scheduler"로 맞출 수 있다며 `configASSERT`로 검사합니다.

```c
NVIC_SetPriorityGrouping(0);   // 4-bit 구현에서는 네 bit 모두 pre-empt
```

### Tail-Chaining과 Late Arrival

Cortex-M4 TRM(DDI 0439B) 3.9절은 late-arrival과 tail-chaining을 "as defined by the ARMv7-M architecture"로 구현한다고 하고, zero wait state 메모리 기준으로 세 값을 적습니다. 인터럽트 assert부터 ISR 첫 명령까지 최대 12 cycle, 복귀도 12 cycle, tail-chaining은 "6 cycles"이고 이때는 "No stack pushes or pops are performed"입니다.

## 코드 예제

### 1. EXTI button — GPIO interrupt

PC13 button(active-low)을 EXTI13으로 받습니다. `SYSCFG->EXTICR[3]`의 bit 7:4가 EXTI13 source이고(`SYSCFG_EXTICR4_EXTI13_Pos` = 4), port C 값은 `SYSCFG_EXTICR4_EXTI13_PC` = `0x0020`, 즉 field 값 2입니다. `gpio_init()`은 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 드라이버입니다.

```c
void exti_init(void) {
    // 1. GPIOC enable, PC13 input + pull-up
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOCEN;
    gpio_init(GPIOC, 13, &(gpio_config_t){
        .mode = GPIO_MODE_INPUT, .pull = GPIO_PULL_UP,
    });

    // 2. SYSCFG enable, EXTI13 source = port C
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;
    SYSCFG->EXTICR[3] &= ~(0xFu << 4);     // EXTI13 (EXTICR4 = EXTICR[3], bits 7:4)
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

EXTI의 PR은 1을 써서 지웁니다. HAL v1.8.3의 `__HAL_GPIO_EXTI_CLEAR_IT(__EXTI_LINE__)`도 `(EXTI->PR = (__EXTI_LINE__))`입니다.

### 2. TIM2 periodic interrupt

TIM2는 APB1 timer이고, [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup)의 설정(APB1 = 168/4 = 42 MHz, prescaler ≠ 1)에서는 timer clock이 그 두 배인 84 MHz입니다.

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
        TIM2->SR = ~TIM_SR_UIF;    // clear UIF only (write 0 to clear, 1 = no change)
        ms_count++;
    }
}
```

UIF 지우기는 `SR &= ~TIM_SR_UIF`가 아니라 `SR = ~TIM_SR_UIF`로 씁니다. HAL v1.8.3 `stm32f4xx_hal_tim.h`의 `__HAL_TIM_CLEAR_IT()`가 `((__HANDLE__)->Instance->SR = ~(__INTERRUPT__))`입니다. `&=`는 SR을 읽고 다시 쓰므로, 읽은 뒤 쓰기 전에 다른 flag가 서면 그 flag가 읽은 값(0)으로 덮여 함께 지워집니다. [4-02](/blog/embedded/modern-recipes/part4-02-mmio-access)의 read-modify-write 경합과 같은 구조입니다.

### 3. ISR이 깨우는 WFE loop

RTOS 없이 main을 재우고 ISR이 깨우는 패턴입니다.

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

`if (!g_flag)`를 본 직후, `__WFE()` 전에 인터럽트가 들어와도 놓치지 않는 이유는 Event Register에 있습니다. DDI 0403E.b B1.5.18은 "Any WFE wakeup event, or the execution of an exception return instruction, sets the Event Register"라고 하고, WFE는 Event Register가 set이면 지우기만 하고 바로 돌아옵니다. ISR에서 돌아오는 것만으로 Event Register가 서므로, 이 구조에서 ISR의 `__SEV()`는 없어도 됩니다.

## 측정 / 동작 확인

### QEMU에서 priority와 preemption 보기

`netduinoplus2`의 NVIC와 TIM2는 QEMU가 모델링합니다(`hw/arm/stm32f405_soc.c`는 "only Timer 2 to 5 are modelled"라고 적음). 아래 프로그램은 ST의 startup과 `system_stm32f4xx.c` 템플릿을 그대로 링크하고, 결과를 semihosting으로 찍습니다. TIM2 ISR(priority 10) 안에서 EXTI0를 pending으로 만들어, EXTI0 ISR이 TIM2 ISR 중간에 끼어드는지(`[0]`) 끝난 뒤에 도는지(`[]0`)를 기록합니다.

```c
/* int_test.c */
/* NVIC behaviour on QEMU netduinoplus2 (STM32F405), output via semihosting */
#include "stm32f4xx.h"

void __libc_init_array(void) { }     /* ST startup calls it; no C++ ctors here */

static void sh_write0(const char *s) {
    register uint32_t r0 __asm("r0") = 0x04; register const char *r1 __asm("r1") = s;
    __asm volatile ("bkpt 0xab" : "+r"(r0) : "r"(r1) : "memory");
}
static void sh_hex(uint32_t v) {
    char b[11] = "0x00000000"; for (int i = 0; i < 8; i++) b[9 - i] = "0123456789abcdef"[(v >> (4 * i)) & 0xf];
    sh_write0(b);
}
static void sh_exit(void) {
    register uint32_t r0 __asm("r0") = 0x18; register uint32_t r1 __asm("r1") = 0x20026;
    __asm volatile ("bkpt 0xab" : "+r"(r0) : "r"(r1) : "memory");
}

static char trace[64]; static volatile int ti;
static void mark(char c) { if (ti < 63) trace[ti++] = c; }

void EXTI0_IRQHandler(void)     { mark('0'); }
#ifdef TYPO
void Exti15_10_IRQHandler(void) { mark('E'); }   /* wrong case: never in the vector table */
#else
void EXTI15_10_IRQHandler(void) { mark('E'); }
#endif
static volatile int g_flag, wfe_mode, use_sev;
void TIM2_IRQHandler(void) {
    TIM2->SR = ~TIM_SR_UIF;                  /* clear only UIF (HAL __HAL_TIM_CLEAR_IT form) */
    if (wfe_mode) { g_flag = 1; if (use_sev) __SEV(); return; }
    mark('[');
    NVIC_SetPendingIRQ(EXTI0_IRQn);          /* higher or equal priority? */
    mark(']');
    TIM2->CR1 = 0;                           /* one shot for this test */
}

static void run_tim2_once(void) {
    ti = 0;
    TIM2->PSC = 84 - 1; TIM2->ARR = 1000 - 1; TIM2->CNT = 0;
    TIM2->DIER = TIM_DIER_UIE; TIM2->CR1 = TIM_CR1_CEN;
    while (TIM2->CR1 & TIM_CR1_CEN) { }
    for (volatile int i = 0; i < 1000; i++) { }
    trace[ti] = 0; sh_write0(trace); sh_write0("\n");
}

int main(void) {
    NVIC_SetPriorityGrouping(0);
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;

    /* 1. pending while disabled */
    NVIC_SetPendingIRQ(EXTI15_10_IRQn);
    sh_write0("ISPR[1] while disabled = "); sh_hex(NVIC->ISPR[1]); sh_write0("\n");
    NVIC_SetPriority(EXTI15_10_IRQn, 8);
    NVIC_EnableIRQ(EXTI15_10_IRQn);
    trace[ti] = 0; sh_write0("after enable: "); sh_write0(trace); sh_write0("\n");

    /* 2. preemption: TIM2 prio 10 pends EXTI0 */
    NVIC_SetPriority(TIM2_IRQn, 10); NVIC_EnableIRQ(TIM2_IRQn); NVIC_EnableIRQ(EXTI0_IRQn);
    NVIC_SetPriority(EXTI0_IRQn, 4);  sh_write0("EXTI0 prio 4 : "); run_tim2_once();
    NVIC_SetPriority(EXTI0_IRQn, 10); sh_write0("EXTI0 prio 10: "); run_tim2_once();
    NVIC_SetPriority(EXTI0_IRQn, 12); sh_write0("EXTI0 prio 12: "); run_tim2_once();
    NVIC_SetPriority(EXTI0_IRQn, 9);  sh_write0("EXTI0 prio 9 : "); run_tim2_once();

    /* 3. PRIGROUP 6: group = bit 7 only. prio 9 (0x90) and 10 (0xA0) share group 1 */
    NVIC_SetPriorityGrouping(6);
    NVIC_SetPriority(EXTI0_IRQn, 9);  sh_write0("PRIGROUP 6, EXTI0 prio 9: "); run_tim2_once();

    /* 4. WFE loop woken by TIM2 (periodic) */
    NVIC_SetPriorityGrouping(0);
    for (use_sev = 1; use_sev >= 0; use_sev--) {
        int handled = 0; wfe_mode = 1;
        TIM2->CNT = 0; TIM2->CR1 = TIM_CR1_CEN;
        while (handled < 3) {
            if (!g_flag) { __WFE(); }
            else { g_flag = 0; handled++; }
        }
        TIM2->CR1 = 0; wfe_mode = 0;
        sh_write0(use_sev ? "WFE loop with __SEV(): 3 events handled\n"
                          : "WFE loop without __SEV(): 3 events handled\n");
    }

    sh_write0("__NVIC_PRIO_BITS = "); sh_hex(__NVIC_PRIO_BITS); sh_write0("\n");
    sh_exit();
    return 0;
}
```

```bash
T=cmsis-device-f4/Source/Templates
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=soft -ffreestanding -nostdlib -O2 -Wall \
    -DSTM32F405xx -ICMSIS_6/CMSIS/Core/Include -Icmsis-device-f4/Include \
    -T stm32f411.ld -o int_test.elf $T/gcc/startup_stm32f405xx.s $T/system_stm32f4xx.c int_test.c
qemu-system-arm -M netduinoplus2 -nographic -semihosting -kernel int_test.elf -serial null -monitor none
```

```text
ISPR[1] while disabled = 0x00000100
after enable: E
EXTI0 prio 4 : [0]
EXTI0 prio 10: []0
EXTI0 prio 12: []0
EXTI0 prio 9 : [0]
PRIGROUP 6, EXTI0 prio 9: []0
WFE loop with __SEV(): 3 events handled
WFE loop without __SEV(): 3 events handled
__NVIC_PRIO_BITS = 0x00000004
```

| 결과 | 의미 |
| --- | --- |
| `ISPR[1] = 0x00000100` | disable 상태에서 pending만 섰습니다. IRQ 40은 `ISPR[1]`의 bit 8입니다 |
| `after enable: E` | enable하는 순간 pending이던 IRQ가 바로 처리됐습니다 |
| prio 4·9 → `[0]` | TIM2(10)보다 값이 작으면 TIM2 ISR 중간에 선점합니다 |
| prio 10·12 → `[]0` | 같거나 낮으면 TIM2 ISR이 끝난 뒤 처리됩니다(실보드에서는 이 전환이 TRM 3.9.1의 tail-chaining) |
| PRIGROUP 6, prio 9 → `[]0` | group이 bit[7]뿐이면 9(`0x90`)와 10(`0xA0`)은 같은 group이라 선점하지 못합니다 |

TIM2를 쓴 WFE loop는 `__SEV()`가 있든 없든 세 번 모두 깨어났습니다. QEMU에서 WFE가 실제로 잠드는지는 이 실험으로 알 수 없으므로, `__SEV()`가 필요 없다는 근거는 위의 Event Register 정의입니다. 또 QEMU의 TIM2 모델은 `clock-frequency`를 1 GHz로 받으므로(`stm32f405_soc.c`), `PSC = 83`, `ARR = 999`가 QEMU 안에서 1 kHz가 되지는 않습니다. 주기는 보드에서 확인합니다.

### 보드에서 ISR 시간 재기

ISR이 들어오는지와 얼마나 걸리는지는 GPIO toggle로 봅니다.

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

scope로 PA5를 보면 ISR 본문의 실행 시간이 pulse 폭으로 보입니다. entry·exit의 stacking 시간(위 TRM의 12 cycle)은 pulse 바깥에 있습니다.

ISR이 들어오지 않으면 NVIC pending register부터 봅니다. `EXTI15_10_IRQn` = 40이면 `ISPR[1]`(`0xE000E204`)의 bit 8입니다.

```text
(gdb) p/x NVIC->ISPR[1]
$1 = 0x100   ← IRQ 40 (EXTI15_10) pending
```

위 QEMU 실행에서도 disable 상태의 pending은 `0x00000100`으로 읽혔습니다. pending이 섰는데 ISR이 안 들어온다면 enable(`ISER`)이나 PRIMASK·BASEPRI 마스크를 봅니다.

## 자주 보는 함정

> ⚠️ ISR 이름 오타

위 `int_test.c`를 `-DTYPO`로 빌드하면 handler 이름이 `Exti15_10_IRQHandler`가 됩니다. 링크는 경고 없이 끝나고, `nm`은 두 symbol을 따로 보여 줍니다.

```text
080001ec T Default_Handler
08000340 T Exti15_10_IRQHandler
080001ec W EXTI15_10_IRQHandler
```

vector table의 `EXTI15_10_IRQHandler`는 weak(`W`)로 남아 `Default_Handler`와 같은 주소입니다. 실행하면 첫 줄만 찍히고 멈추며, monitor로 보면 이렇습니다.

```text
ISPR[1] while disabled = 0x00000100
R12=00000100 R14=fffffff9 R15=080001ec
XPSR=21000038 --C- T handler
```

PC는 `Default_Handler`(`0x080001ec`)이고, XPSR의 하위 bit(IPSR) `0x38` = 56 = 16 + 40이 지금 처리 중인 exception이 IRQ 40이라는 뜻입니다. 오류 메시지 없이 멈추므로, handler 이름은 startup 파일의 `.word` 목록에서 복사해 씁니다.

> ⚠️ Flag clear를 안 함

DDI 0403E.b B3.4.1은 level 인터럽트에 대해 "If the interrupt is still asserted on return from the ISR, it becomes pending again"이라고 적습니다. peripheral flag를 지우지 않으면 ISR이 끝나자마자 다시 들어와 main이 진행하지 못합니다. ST HAL의 `HAL_GPIO_EXTI_IRQHandler()`도 callback을 부르기 전에 `__HAL_GPIO_EXTI_CLEAR_IT()`로 PR부터 지웁니다. QEMU의 `stm32f2xx_timer`는 IRQ를 `qemu_irq_pulse()`로 내보내므로 이 재진입은 QEMU에서 재현되지 않습니다.

> ⚠️ Priority를 모두 같은 값으로 설정

위 실행의 prio 10 결과처럼 같은 priority끼리는 선점이 없습니다. 반응이 급한 인터럽트는 값을 낮춰(높은 priority) 따로 둡니다. reset 직후 모든 설정 가능 priority는 0입니다(B1.5.4, "A reset clears these software-configured priority settings to 0").

> ⚠️ ISR 안에서 긴 작업

ISR이 도는 동안 같거나 낮은 priority의 인터럽트는 기다립니다(위 `[]0`). ISR에서는 flag만 세우고 처리를 main loop나 task로 넘기는 bottom-half 패턴이 그래서 쓰입니다.

> ⚠️ Shared 변수에 `volatile` 누락

main과 ISR이 공유하는 변수는 `volatile`로 선언합니다. [4-02](/blog/embedded/modern-recipes/part4-02-mmio-access)에서 `volatile` 없는 polling loop가 `-O2`에서 한 번만 읽고 무한 loop가 되는 것을 disassembly로 봤습니다. RAM 변수도 같습니다.

> ⚠️ Floating-point in ISR (Cortex-M4F/M7)

DDI 0403E.b B1.5.6의 exception entry 의사코드에서 `CONTROL.FPCA == '1'`이면 stack frame이 `0x20`(32 byte) 대신 `0x68`(104 byte)이 되고, `FPCCR.LSPEN`이 1이면 FP register 저장을 미룹니다(lazy stacking). reset 때 `FPCCR.ASPEN`·`LSPEN`은 둘 다 1입니다(B1.5.5 `TakeReset()`). FPCA는 exception 진입 때 0이 되고(`CONTROL.FPCA = '0'`) FP 명령을 실행하면 1이 되므로, 104 byte frame이 쌓이는지는 **선점당하는 쪽**이 FP를 쓰고 있었는지로 정해집니다. FP를 쓴 task가 선점되면 그 task stack에, float을 쓰는 ISR이 다시 선점되면 MSP에 104 byte frame이 쌓이므로, 해당 stack 크기를 이 기준으로 잡습니다.

## 정리

- ISR은 **weak symbol을 같은 이름으로 덮어** 등록합니다. 이름이 다르면 링크는 성공하고 인터럽트는 `Default_Handler`의 무한 loop로 갑니다.
- 세 단계: **peripheral configure → priority set → NVIC enable**. enable 전에 pending된 IRQ는 enable 순간 처리됩니다.
- **Flag clear**는 ST HAL과 같은 형태(`EXTI->PR = line`, `TIM->SR = ~flag`)로 씁니다.
- Cortex-M priority는 **값이 작을수록 높고**, 선점은 group priority로만 정해집니다.
- ISR은 짧게, 긴 일은 **main loop으로 넘깁니다**. WFE loop는 exception return이 Event Register를 세우므로 깨움을 놓치지 않습니다.

다음 편은 **SysTick 타이머**입니다. RTOS 없이 시간 처리, delay, jiffies를 다룹니다.

## 관련 항목

- [Part 2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [Part 4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [Part 4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [Practical RTOS Internals 1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
