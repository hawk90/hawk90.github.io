---
title: "임베디드 전력 최적화 — Sleep Mode·Clock Gating·DVFS"
slug: "embedded/modern-recipes/part8-11-power-optimization"
date: 2026-04-17T09:10:00
description: "Active와 sleep, peripheral clock gating, DVFS, tickless idle, µA-level 측정까지 임베디드 전력 절감 기법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 99
tags: [recipes, performance, power]
topics: ["embedded"]
---

## 한 줄 요약

> **"전력은 각 상태의 전류와 그 상태에 머문 시간의 곱으로 결정됩니다."** 펌웨어가 바꿀 수 있는 것은 깨어 있는 시간과 잠든 동안의 상태입니다. 이 글은 그중 "얼마나 자주 깨어나는가"를 FreeRTOS tickless idle로 직접 세어 보고(10초 동안 SysTick 10,000번 → 20번), STM32L4의 저전력 레지스터 코드를 ST 헤더로 컴파일해 바로잡습니다.

## 어떤 상황에서 쓰나

배터리로 몇 년을 버텨야 하는 BLE beacon이나 sensor logger가 전형적인 예입니다. 이런 장치는 대부분의 시간을 잠들어 있고, 평균 전류는 "깨어 있는 동안의 전류 × 깨어 있는 비율 + 잠든 동안의 전류 × 잠든 비율"로 정해집니다. 냉장고 문을 자주 열수록 전기를 많이 쓰는 것처럼, 1 ms마다 tick interrupt로 깨어나는 펌웨어는 할 일이 없어도 그만큼 잠을 깹니다.

각 상태의 전류는 칩마다 다르고 datasheet의 전기적 특성 표가 정합니다. 전류를 재는 장비 없이 썼으므로 이 글은 전류 값을 싣지 않고, 펌웨어 쪽에서 셀 수 있는 것(깨어난 횟수)과 코드의 정확성을 다룹니다.

## 핵심 개념

평균 전력은 다음과 같이 쓸 수 있습니다.

$$
P_{avg} = V \times \frac{I_{active}\,t_{active} + I_{sleep}\,t_{sleep}}{t_{active} + t_{sleep}}
$$

펌웨어가 움직일 수 있는 축은 세 가지입니다.

- **잠드는 시간(t_sleep)을 늘림** — 할 일이 없으면 즉시 `WFI`로 잠들고, 주기적 tick 때문에 깨지 않게 합니다(tickless idle).
- **잠든 동안의 전류(I_sleep)를 줄임** — 더 깊은 저전력 모드로 들어가고, 쓰지 않는 peripheral의 clock을 끊고, 떠 있는 GPIO를 정리합니다.
- **깨어 있는 동안의 전류(I_active)를 줄임** — clock 주파수와 전압을 함께 낮춥니다(DVFS).

동적 전력은 α·C·V²·f(α: switching activity)이므로 주파수만 낮추면 같은 일을 더 오래 하게 되어 이득이 작고, 전압을 함께 낮춰야 효과가 큽니다. 이 비례식은 누설 전류를 빼 단순화한 것이라, 실제 이득은 대상 보드에서 재야 합니다.

## 코드 / 실제 사용 예

### WFI로 잠들기

```c
int main(void)
{
    hw_init();
    for (;;) {
        process_events();
        __WFI();          /* sleep until the next interrupt */
    }
}
```

`WFI`는 interrupt가 올 때까지 core를 멈춥니다. 문제는 그 interrupt가 1 ms마다 오는 SysTick이라면 1초에 1,000번 깨어난다는 점입니다. 아래 tickless idle이 그 횟수를 줄입니다.

### Tickless idle — 깨어나는 횟수 세기

FreeRTOS V11.2.0의 ARM_CM3 port는 `configUSE_TICKLESS_IDLE 1`이면 idle task에서 `vPortSuppressTicksAndSleep()`을 불러, 다음 task가 깨어날 때까지 SysTick을 멈추고 `wfi`로 잡니다(`port.c:520-609`). 깬 뒤에는 잠든 tick 수만큼 `vTaskStepTick()`으로 kernel 시간을 앞당깁니다(`port.c:729`). 이 효과를 QEMU `mps2-an385`에서 셌습니다. task 하나가 1초마다 10번 깨어나고, SysTick interrupt와 idle의 잠듦 횟수를 각각 셉니다.

[6-12의 재현 환경](/blog/embedded/modern-recipes/part6-12-rtos-debugging#재현-환경) 하네스에서 `FreeRTOSConfig.h`의 stack 검사·malloc hook·run-time stats를 0으로 두고, `INCLUDE_vTaskDelay` 아래에 다음을 더했습니다.

```c
/* tickless idle: on with -DTICKLESS=1 */
#ifndef TICKLESS
#define TICKLESS 0
#endif
#define configUSE_TICKLESS_IDLE                 TICKLESS
extern volatile unsigned sleeps;
#define configPRE_SLEEP_PROCESSING(x)           do { sleeps++; } while (0)
#define INCLUDE_vTaskSuspend                    1
#define INCLUDE_xTaskGetSchedulerState          1
#define INCLUDE_xSemaphoreGetMutexHolder        1
```

`startup.c`는 SysTick vector를 횟수를 세는 함수로 감쌉니다.

```c
#include <stdint.h>
extern uint32_t _etext, _sdata, _edata, _sbss, _ebss, _estack;
extern int main(void);
extern void vPortSVCHandler(void), xPortPendSVHandler(void), xPortSysTickHandler(void);
void pr(const char *f, ...);
void hosted_exit(int code);

volatile unsigned systicks;                 /* every SysTick interrupt, counted */
void SysTick_Handler(void) { systicks++; xPortSysTickHandler(); }

void Reset_Handler(void)
{
    uint32_t *s = &_etext, *d = &_sdata;
    while (d < &_edata) *d++ = *s++;
    for (d = &_sbss; d < &_ebss;) *d++ = 0;
    main();
    for (;;) { }
}
void Default_Handler(void)   { hosted_exit(99); }
void HardFault_Handler(void) { pr("HardFault\n"); hosted_exit(98); }

__attribute__((section(".vectors"), used))
void (*const vectors[16])(void) = {
    (void (*)(void))&_estack, Reset_Handler, Default_Handler, HardFault_Handler,
    Default_Handler, Default_Handler, Default_Handler, 0, 0, 0, 0,
    vPortSVCHandler, Default_Handler, 0, xPortPendSVHandler, SysTick_Handler,
};
```

```c
/* one task wakes once per second for 10 s; count SysTick interrupts and idle sleeps */
#include "FreeRTOS.h"
#include "task.h"
void pr(const char *f, ...);
void hosted_exit(int code);
extern volatile unsigned systicks;
volatile unsigned sleeps;

static void worker(void *arg)
{
    (void)arg;
    unsigned t0 = systicks;
    TickType_t k0 = xTaskGetTickCount();
    for (int i = 0; i < 10; i++) vTaskDelay(pdMS_TO_TICKS(1000));
    pr("configUSE_TICKLESS_IDLE=%d: kernel ticks %u, SysTick interrupts %u, idle sleeps %u\n",
       configUSE_TICKLESS_IDLE, (unsigned)(xTaskGetTickCount() - k0), systicks - t0, sleeps);
    hosted_exit(0);
}

int main(void)
{
    xTaskCreate(worker, "worker", 256, NULL, 2, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
#!/bin/bash
K=${K:-FreeRTOS-Kernel}; P=$K/portable/GCC/ARM_CM3
for t in 0 1; do
  arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -O2 -g -ffreestanding -nostdlib -fno-builtin -DTICKLESS=$t \
    -I. -Ilibc -I$K/include -I$P -T link.ld -o idle.elf \
    startup.c io.c idle.c $K/tasks.c $K/queue.c $K/list.c $K/timers.c $P/port.c $K/portable/MemMang/heap_4.c -lgcc
  timeout 60 qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5,sleep=off -kernel idle.elf
done
```

```text
configUSE_TICKLESS_IDLE=0: kernel ticks 10000, SysTick interrupts 10000, idle sleeps 0
configUSE_TICKLESS_IDLE=1: kernel ticks 10000, SysTick interrupts 20, idle sleeps 20
```

- **kernel 시간은 둘 다 정확히 10,000 tick이었습니다.** tickless에서도 `xTaskGetTickCount()`는 같은 값을 가리킵니다.
- **SysTick interrupt는 10,000번에서 20번으로 줄었습니다.** core가 깨어난 횟수가 500분의 1이 된 것입니다.
- **1초 delay 한 번에 두 번씩 잠들었습니다(20 = 10 × 2).** SysTick은 24-bit counter라, port는 한 번에 잘 수 있는 최대 tick을 `portMAX_24_BIT_NUMBER / ulTimerCountsForOneTick`으로 정합니다(`port.c:749`). 이 설정(`configCPU_CLOCK_HZ` 25 MHz)과 1 kHz tick에서는 0xFFFFFF / 25,000 = 671 tick이므로, 1,000 tick을 자려면 671 + 329로 두 번 나눠 잡니다. 더 길게 자려면 SysTick 대신 저전력 timer(RTC·LPTIM)로 `vPortSuppressTicksAndSleep()`을 직접 구현합니다.

QEMU는 전류를 모델링하지 않으므로 이 결과는 깨어난 횟수이지 전력이 아닙니다. 전류는 아래처럼 보드에서 잽니다.

### `configPRE_SLEEP_PROCESSING`·`configPOST_SLEEP_PROCESSING` 바로 쓰기

```c
/* FreeRTOSConfig.h */
#define configUSE_TICKLESS_IDLE                1
#define configPRE_SLEEP_PROCESSING(x)          board_pre_sleep(&(x))
#define configPOST_SLEEP_PROCESSING(x)         board_post_sleep(x)

void board_pre_sleep(TickType_t *ticks)
{
    clock_slow();             /* optional: run from a slower clock while asleep */
    /* setting *ticks = 0 tells the port that this hook already slept (no wfi) */
}

void board_post_sleep(TickType_t expected_ticks)
{
    (void)expected_ticks;     /* the port steps the tick count itself */
    clock_fast();
}
```

V11.2.0 ARM_CM3 `port.c`를 보면 두 hook에는 정해진 계약이 있습니다. `configPRE_SLEEP_PROCESSING(xModifiableIdleTime)`은 값을 바꿀 수 있는 변수를 받고, hook이 그 값을 0으로 만들면 port는 `wfi`를 건너뜁니다(599–605행). `configPOST_SLEEP_PROCESSING(xExpectedIdleTime)`은 실제로 잔 시간이 아니라 *예상* 시간을 받습니다(609행). 그리고 tick을 앞당기는 `vTaskStepTick()`은 port가 729행에서 직접 부릅니다. 그래서 post hook에서 `vTaskStepTick()`을 다시 부르면 kernel 시간이 두 번 앞당겨집니다.

### STM32L4 Stop·Standby와 clock gating

아래 코드는 STM32L476을 대상으로, ST `cmsis_device_l4`(GitHub master, commit `ca0bfa2`)의 `stm32l476xx.h`와 CMSIS 5.9.0 core 헤더로 `arm-none-eabi-gcc -mcpu=cortex-m4 -c`해 컴파일되는 것을 확인했습니다. 보드가 없어 실행하지는 않았습니다.

```c
/* STM32L476 low-power snippets, compile-checked against ST cmsis_device_l4 + CMSIS 5.9.0 */
#include "stm32l476xx.h"

void enter_stop1(void)
{
    PWR->CR1 = (PWR->CR1 & ~PWR_CR1_LPMS_Msk) | PWR_CR1_LPMS_STOP1;   /* LPMS is a 3-bit field */
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;
    /* after wake-up: restore the system clock before using peripherals */
}

void enter_standby(void)
{
    PWR->CR1 = (PWR->CR1 & ~PWR_CR1_LPMS_Msk) | PWR_CR1_LPMS_STANDBY;
    PWR->SCR = PWR_SCR_CWUF;                                          /* clear wake-up flags */
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();                                                         /* SRAM2 is kept only if PWR_CR3_RRS is set */
}

void gate_unused_clocks(void)
{
    RCC->APB1ENR1 &= ~(RCC_APB1ENR1_USART2EN | RCC_APB1ENR1_SPI3EN);
    RCC->AHB2ENR &= ~RCC_AHB2ENR_ADCEN;
}

void uart2_send(char c)
{
    RCC->APB1ENR1 |= RCC_APB1ENR1_USART2EN;
    (void)RCC->APB1ENR1;                         /* read back: let the enable take effect */
    USART2->CR1 = USART_CR1_UE | USART_CR1_TE;
    while (!(USART2->ISR & USART_ISR_TXE)) { }
    USART2->TDR = (uint8_t)c;
}
```

흔히 보는 STM32 예제 코드와 다른 곳은 세 군데입니다.

- **LPMS는 3-bit 필드입니다**(`PWR_CR1_LPMS_Msk` = `0x7`, 헤더 9593행). `PWR->CR1 |= PWR_CR1_LPMS_STOP1`처럼 OR만 하면 이전 값(예: Standby의 `0x3`)이 남아 Stop 1이 아닌 다른 모드로 들어갑니다. 필드를 먼저 지우고 씁니다. 위 코드를 디스어셈블하면 `bic.w r3, r3, #7` 다음 `orr.w r3, r3, #1`입니다.
- **L4에는 `RCC->APB1ENR`과 `USART2->DR`이 없습니다.** APB1 enable 레지스터는 `APB1ENR1`·`APB1ENR2`로 나뉘고, USART 송신은 `TDR`입니다. 예전 코드를 같은 헤더로 컴파일하면 다음 오류가 납니다.

```text
orig.c:2:20: error: 'RCC_TypeDef' has no member named 'APB1ENR'; did you mean 'AHB1ENR'?
orig.c:2:44: error: 'USART_TypeDef' has no member named 'DR'; did you mean 'RDR'?
```

- **ADC clock은 L4에서 `AHB2ENR_ADCEN`입니다.** `RCC_APB2ENR_ADC1EN`은 이 헤더에 없습니다.

Stop·Standby 모드에서 무엇이 유지되고 얼마의 전류가 흐르는지, 깨어난 뒤 어떤 clock이 기본값으로 돌아오는지는 STM32L4 reference manual과 datasheet가 정합니다. 이 글은 그 문서를 열지 못해 그 값을 싣지 않습니다. 코드에는 깨어난 직후 system clock을 다시 설정하라는 자리만 표시했습니다.

### 전류 측정

전류는 장비로 잽니다. 잠든 상태의 µA와 깨어난 순간의 mA가 섞인 파형을 보려면, 일반 멀티미터의 평균값보다 sample 단위로 기록하는 power profiler나 shunt 저항 + oscilloscope가 낫습니다. 멀티미터의 전류 측정 범위를 µA로 두면 내부 shunt에 걸리는 전압(burden voltage) 때문에 깨어나는 순간 MCU 전원이 흔들릴 수 있다는 점도 확인합니다. 이 글은 측정 장비가 없어 전류를 재지 않았습니다.

### 떠 있는 GPIO 정리

```c
configure_unused_pins_as_analog_or_pulled();   /* no floating digital inputs */
```

연결되지 않은 핀을 digital input으로 두면 입력이 중간 전압에서 흔들려 input buffer가 전류를 씁니다. 쓰지 않는 핀을 어떤 상태로 둘지(analog, pull-up/down, output low)는 MCU reference manual의 GPIO 장이 권하는 대로 정합니다.

## 측정 / 성능 비교

이 글에서 잰 것은 깨어난 횟수입니다.

| 설정 (FreeRTOS V11.2.0, QEMU mps2-an385, 10초) | kernel tick | SysTick interrupt | idle에서 잠든 횟수 |
| --- | ---: | ---: | ---: |
| `configUSE_TICKLESS_IDLE 0` | 10,000 | 10,000 | 0 (port의 tickless 경로 미사용) |
| `configUSE_TICKLESS_IDLE 1` | 10,000 | 20 | 20 |

평균 전류와 배터리 수명은 위 식에 대상 보드에서 잰 각 상태의 전류와 체류 시간을 넣어 계산합니다. tickless로 깨어나는 횟수가 줄어드는 효과는, 깨어날 때마다 드는 전류·시간(clock 안정화 포함)이 클수록 커집니다.

## 자주 보는 함정

> ⚠️ Idle에서 바쁘게 돎

```c
for (;;) { do_things(); }    /* no WFI */
```

할 일이 없을 때도 core가 계속 돕니다. idle 경로에 `WFI`(또는 RTOS의 idle hook·tickless)를 둡니다.

> ⚠️ Tickless를 켜고 post hook에서 tick을 또 앞당김

위 절처럼 port가 이미 `vTaskStepTick()`을 부릅니다. 두 번 부르면 `vTaskDelay`와 timeout이 일찍 끝납니다.

> ⚠️ 필드를 OR로만 씀

`PWR->CR1 |= PWR_CR1_LPMS_STOP1`은 이전 모드 값과 섞입니다. 다중 bit 필드는 mask로 지운 뒤 씁니다.

> ⚠️ 모든 peripheral clock을 켜 둠

```c
RCC->APB1ENR1 = 0xFFFFFFFF;    /* every APB1 clock on */
```

부팅 때 필요한 것만 켜고, 쓰지 않을 때 끕니다. enable 직후에 레지스터를 쓰기 전 한 번 읽어 두는 것은 위 `uart2_send`처럼 clock이 실제로 켜질 시간을 주기 위해서입니다.

> ⚠️ 깨우는 source가 너무 많음

```c
EXTI->IMR1 = 0xFFFFFFFF;    /* every EXTI line can wake the core */
```

잠들어도 곧 다시 깨면 tickless의 효과가 사라집니다. 정말 필요한 line만 켭니다.

## 재현 환경

- tickless 측정: `arm-none-eabi-gcc` 16.2.0, FreeRTOS-Kernel V11.2.0, QEMU 11.1.3 `mps2-an385` `-icount shift=5,sleep=off`. `K=FreeRTOS-Kernel bash run.sh`. 하네스(`io.c`·`link.ld`·`libc/`·`FreeRTOSConfig.h`)는 6-12와 같고 위 차이만 있습니다.
- STM32L4 코드: ST `cmsis_device_l4` master(`ca0bfa2`), CMSIS 5.9.0 `CMSIS/Core/Include`, `arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -Wall -I<l4>/Include -I<cmsis>/CMSIS/Core/Include -c l4_power.c`.

## 정리

- 평균 전력은 상태별 전류 × 체류 시간으로 정해지고, 펌웨어는 잠드는 시간과 잠든 상태를 바꿉니다.
- tickless idle은 10초 동안 SysTick interrupt를 10,000번에서 20번으로 줄였고, kernel 시간은 그대로였습니다.
- SysTick tickless는 24-bit 한계 때문에 이 설정에서 한 번에 671 tick까지만 잡니다. 더 길게는 RTC·LPTIM으로 직접 구현합니다.
- post-sleep hook에서 `vTaskStepTick()`을 다시 부르지 않습니다. port가 이미 부릅니다.
- STM32L4의 LPMS는 3-bit 필드라 mask 후 쓰고, `APB1ENR1`·`TDR`·`AHB2ENR_ADCEN`처럼 그 칩의 레지스터 이름을 씁니다.
- 각 모드의 전류는 datasheet와 측정 장비로 확인합니다. 이 글에는 전류 값이 없습니다.

다음 편은 **WCET 분석**입니다. Worst-case execution time과 cache 영향을 다룹니다.

## 관련 항목

- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-03: Scheduler 동작 이해](/blog/embedded/modern-recipes/part6-03-scheduler-internals)
- [8-10: 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
- [8-12: WCET 분석](/blog/embedded/modern-recipes/part8-12-wcet-analysis)
- [PE 3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
