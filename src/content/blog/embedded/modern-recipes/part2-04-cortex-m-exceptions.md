---
title: "Cortex-M4 예외 처리 — Vector Table·NVIC 우선순위·Tail-Chaining"
slug: "embedded/modern-recipes/part2-04-cortex-m-exceptions"
date: 2026-04-11T09:16:00
description: "Cortex-M4가 예외를 받고 돌아오는 동안 하드웨어가 하는 일과, NVIC 우선순위·mask 설정이 preemption·tail-chaining·late-arrival을 어떻게 정하는지 STM32F407 설정 예로 따라가고, bootloader에서 application의 vector table로 넘기는 순서를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 16
tags: [recipes, arm, nvic, exceptions]
draft: false
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"우선순위 숫자가 예외 경로를 정합니다."** 어떤 IRQ가 실행 중인 handler에 끼어들지는 NVIC의 group priority와 mask register가 정하고, 끼어들지 못한 IRQ는 pending으로 남았다가 tail-chaining으로 이어 받습니다. 같은 숫자라도 칩에 구현된 priority bit 수에 따라 레지스터에 들어가는 값이 달라집니다.

## 어떤 상황에서 쓰나

- IRQ 우선순위를 처음 배치하거나, 기대한 IRQ가 다른 handler를 선점하지 못할 때
- 다른 칩으로 옮긴 뒤 같은 `NVIC_SetPriority` 값이 다른 우선순위가 될 때
- bootloader에서 application으로 넘어가며 vector table을 옮길 때

전제 지식: [2-03: Cortex-M 레지스터 구조 분석](/blog/embedded/modern-recipes/part2-03-arm-registers)의 MSP/PSP, `EXC_RETURN`, PRIMASK·BASEPRI를 안다고 보고 씁니다.

이 글의 수치와 레지스터 동작은 Cortex-M4 기준입니다. 코어 동작은 [Cortex-M4 TRM r0p0 (ARM DDI 0439B)](https://documentation-service.arm.com/static/5f19da2a20b7cf4bc524d99a)과 [Cortex-M4 Devices Generic User Guide (ARM DUI 0553A)](https://documentation-service.arm.com/static/5f2ac4ab60a93e65927bbdbf)(이하 UG), 예제 장치 값은 STM32F407의 [CMSIS device v2.6.9](https://github.com/STMicroelectronics/cmsis_device_f4/tree/v2.6.9), [CMSIS 5.9.0](https://github.com/ARM-software/CMSIS_5/tree/5.9.0), [STM32F4 HAL v1.8.5](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/tree/v1.8.5)에서 가져왔고, 2026-10-11에 각 문서와 태그를 열어 대조했습니다.

## 핵심 개념

### 1) Vector table

Reset 때 vector table은 0x00000000에 있습니다. 첫 word가 MSP 초기값, 다음 word부터 handler 주소입니다(UG 2.3.4, Table 2-16). 아래 표는 Reserved와 Reserved for Debug 자리(0x1C~0x28, 0x30~0x34)를 뺐습니다.

| Offset | Exception | 우선순위 |
| --- | --- | --- |
| 0x00 | Initial SP 값 | — |
| 0x04 | Reset | -3 (고정) |
| 0x08 | NMI | -2 (고정) |
| 0x0C | HardFault | -1 (고정) |
| 0x10 | MemManage | 설정 가능 |
| 0x14 | BusFault | 설정 가능 |
| 0x18 | UsageFault | 설정 가능 |
| 0x2C | SVCall | 설정 가능 |
| 0x38 | PendSV | 설정 가능 |
| 0x3C | SysTick | 설정 가능 |
| 0x40 + 4n | IRQn | 설정 가능 |

각 vector의 bit 0은 1이어야 합니다(Thumb). STM32 GCC startup 파일은 첫 entry에 linker script의 `_estack`을 둡니다([startup_stm32f407xx.s v2.6.9 L128](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Source/Templates/gcc/startup_stm32f407xx.s#L128)).

Reset 뒤에는 `SCB->VTOR`에 다른 주소를 써서 table을 옮길 수 있습니다. TBLOFF는 table 크기를 2의 거듭제곱으로 올린 값에 맞춰 정렬해야 하고 최소 32 word입니다(UG 4.3.4). STM32F407의 IRQ vector 자리는 0~81의 82개입니다(`FPU_IRQn = 81`). `stm32f407xx.h`에는 79번이 없고, startup 파일은 그 자리(CRYP)를 `.word 0`으로 채웁니다([stm32f407xx.h L155-L157](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Include/stm32f407xx.h#L155-L157), [startup L225](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Source/Templates/gcc/startup_stm32f407xx.s#L225)). table은 16 + 82 = 98 word이므로 128 word, 곧 512 byte(0x200) 경계가 필요합니다. ST의 `system_stm32f4xx.c` 템플릿도 VTOR 주소를 "a multiple of 0x200"으로 적어 이 계산과 같습니다([L101-L109](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Source/Templates/system_stm32f4xx.c#L101-L109)).

### 2) Exception entry

예외 진입에는 두 조건이 필요합니다. 우선순위가 mask register가 정한 한계보다 높아야 하고(sufficient priority), 프로세서가 Thread mode이거나 새 예외가 실행 중인 handler보다 우선순위가 높아야 합니다(UG 2.3.7). 한계를 넘지 못한 예외는 pending으로 남습니다. mask register 중 이 글의 예제에 쓰는 것은 다음 둘입니다(UG 2.1.3).

- PRIMASK = 1이면 설정 가능한 우선순위의 예외를 모두 막습니다.
- BASEPRI가 0이 아니면 우선순위 값이 BASEPRI 이상인 예외를 막습니다. BASEPRI도 IRQ priority와 같은 8 bit 필드라 구현하지 않은 하위 bit는 0으로 읽힙니다(UG Table 2-9).

진입하면 하드웨어가 다음을 수행합니다(UG 2.3.7).

1. R0~R3, R12, LR, PC, xPSR 8 word를 **현재 stack**에 push합니다. Thread mode에서 PSP를 쓰고 있었다면 PSP stack입니다.
2. stacking과 병렬로 vector table에서 handler 주소를 읽습니다.
3. LR에 `EXC_RETURN`을 쓰고 handler를 실행합니다. Handler mode는 항상 MSP를 씁니다(UG 2.1.2).

floating-point 연산을 쓰는 중이면 S0~S15·FPSCR 자리를 더한 frame이 쓰입니다(UG Figure 2-3). RTOS context switch에서 이 frame을 다루는 방법은 [Practical RTOS Internals: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)에 있습니다.

### 3) Tail-chaining과 late-arrival

handler가 끝날 때 진입 조건을 만족하는 pending 예외가 있으면 stack pop을 건너뛰고 바로 다음 handler로 갑니다(tail-chaining, UG 2.3.7). Cortex-M4 TRM 3.9.1은 wait state가 없는 메모리 조건에서 진입(IRQ assert → ISR 첫 명령) 최대 12 cycle, 복귀 12 cycle, tail-chaining 6 cycle을 적습니다. 복귀 뒤 다시 진입하면 24 cycle이 걸릴 경로를 tail-chaining은 6 cycle에 끝내므로 18 cycle이 줄어듭니다.

STM32F407의 flash는 HCLK와 전원 전압에 맞춰 wait state(`FLASH_ACR` LATENCY)를 설정하고 읽습니다([stm32f4xx_hal_rcc.c v1.8.5 L605-L607](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Src/stm32f4xx_hal_rcc.c#L605-L607)). LATENCY를 0이 아닌 값으로 둔 구성에서 flash의 vector와 handler를 읽으면 위 조건 밖이고, 그때의 cycle 수는 TRM에 없습니다. 그래서 아래 예제 표에는 cycle 수를 적지 않았습니다.

먼저 들어온 예외의 stacking 중에 더 높은 우선순위 예외가 오면, 프로세서는 stacking을 그대로 계속하고 vector fetch만 새 예외로 바꿉니다(late-arrival). 저장할 상태가 두 예외에 대해 같기 때문입니다. 원래 예외의 handler 첫 명령이 execute 단계에 들어가기 전까지 late-arrival로 받을 수 있고, 원래 예외는 pending으로 남았다가 tail-chaining 규칙으로 처리됩니다(UG 2.3.7). TRM 3.9.1과 UG 2.3.7 모두 late-arrival 전환의 cycle 수는 적지 않습니다.

### 4) Priority와 grouping

priority 필드는 IRQ마다 8 bit이고, 구현하지 않은 하위 bit는 0으로 읽히며 쓰기를 무시합니다(UG 4.2.7). 값이 낮을수록 우선순위가 높습니다. STM32F4는 `__NVIC_PRIO_BITS = 4`라 상위 4 bit [7:4]만 있습니다([stm32f407xx.h L49](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Include/stm32f407xx.h#L49)). CMSIS `NVIC_SetPriority`는 인자를 `8 - __NVIC_PRIO_BITS`만큼 왼쪽으로 밀고 하위 8 bit만 쓰므로, STM32F4에서 인자 범위는 0~15입니다([core_cm4.h 5.9.0 L1814-L1824](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h#L1814-L1824)).

`SCB->AIRCR.PRIGROUP`은 이 8 bit를 group priority와 subpriority로 나눕니다(UG 4.3.5 Table 4-18).

- **preemption은 group priority만 봅니다.** 실행 중인 handler와 group priority가 같은 IRQ는 선점하지 못합니다(UG 2.3.6).
- subpriority는 group이 같은 IRQ 여럿이 pending일 때 처리 순서만 정합니다. 둘 다 같으면 IRQ 번호가 낮은 쪽이 먼저입니다(UG 2.3.6).

STM32F4에서는 PRIGROUP 0~3이 같은 결과입니다. Table 4-18에서 PRIGROUP 0b000의 group bit는 [7:1], 0b011은 [7:4]인데, 구현된 [7:4]가 어느 쪽에서도 모두 group bit이기 때문입니다. AIRCR reset 값 0xFA050000(UG Table 4-12)의 PRIGROUP은 0이므로, 아무것도 설정하지 않아도 16단계가 모두 group priority입니다. group bit가 줄어드는 것은 PRIGROUP 4(0b100, group [7:5])부터입니다. STM32 HAL의 `NVIC_PRIORITYGROUP_4`는 PRIGROUP = 3이고([stm32f4xx_hal_cortex.h v1.8.5 L88-L97](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Inc/stm32f4xx_hal_cortex.h#L88-L97)), `HAL_Init()`이 이 값을 설정합니다.

## 코드 / 실제 사용 예

### IRQ 우선순위 배치

STM32F407에서 EXTI0(센서 edge)을 2, USART1을 7, SysTick을 15에 두는 예입니다. HAL 프로젝트에서는 `HAL_Init()`이 grouping을 `NVIC_PRIORITYGROUP_4`로 두고, `HAL_InitTick(TICK_INT_PRIORITY)`로 SysTick 우선순위를 정합니다([stm32f4xx_hal.c v1.8.5 L173-L176](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Src/stm32f4xx_hal.c#L173-L176), [L253-L265](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Src/stm32f4xx_hal.c#L253-L265)). `stm32f4xx_hal_conf_template.h`의 `TICK_INT_PRIORITY`는 0x0F입니다([L147](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Inc/stm32f4xx_hal_conf_template.h#L147)). HAL 없이 CMSIS만 쓰면 `SysTick_Config()`가 SysTick을 `(1 << __NVIC_PRIO_BITS) - 1` = 15에 두고([core_cm4.h L2022-L2036](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h#L2022-L2036)), grouping은 "Priority와 grouping" 절에서 본 대로 reset 값으로 충분합니다. 어느 쪽이든 직접 정할 것은 IRQ 두 개입니다.

```c
NVIC_SetPriority(EXTI0_IRQn, 2);     // sensor edge, byte 0x20
NVIC_EnableIRQ(EXTI0_IRQn);

NVIC_SetPriority(USART1_IRQn, 7);    // UART RX/TX, byte 0x70
NVIC_EnableIRQ(USART1_IRQn);
```

handler 이름을 vector에 잇는 weak alias와 peripheral flag clear는 [4-05: Cortex-M 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)에서 다룹니다.

### 이 설정에서 예외 경로

위 우선순위에 preemption·mask·tail-chaining·late-arrival이 어떻게 적용되는지 따라가 봅니다. cycle 수는 "Tail-chaining과 late-arrival" 절에 적은 이유로 넣지 않았습니다.

| 상황 | 결과 | 근거 |
| --- | --- | --- |
| USART1(7) handler 실행 중 EXTI0(2) assert | EXTI0이 선점. MSP에 새 frame을 쌓고 EXTI0 handler 시작 | group 2 < 7 |
| Thread mode에서 들어간 EXTI0 handler 실행 중 USART1 pending | 기다림. EXTI0 handler가 끝날 때 tail-chaining으로 USART1 handler 시작 | group 7 > 2 |
| Thread mode에서 USART1 stacking 중 EXTI0 assert | late-arrival. stacking은 그대로, EXTI0 handler 먼저 실행 후 USART1을 tail-chaining | 2 < 7, USART1 handler 첫 명령 실행 전 |
| USART1 handler 실행 중 SysTick | 기다림 | group 15 > 7 |
| EXTI0도 7로 둔 경우, USART1 handler 실행 중 EXTI0 assert | 기다림. USART1 handler가 끝난 뒤 tail-chaining으로 시작 | 같은 group 7은 선점 없음 |
| Thread mode에서 BASEPRI = 0x30(`3 << 4`)인 구간에 USART1·EXTI0 assert | USART1은 pending으로 남고 BASEPRI를 0으로 되돌린 뒤 진입. EXTI0은 바로 진입 | 0x70 ≥ 0x30은 차단, 0x20 < 0x30은 통과 |

### Bootloader에서 application으로 넘기기

bootloader를 0x08000000에, application을 0x08010000에 link한 구성의 예입니다. 0x08010000은 하위 9 bit가 0이라 0x200의 배수이고, "Vector table" 절의 512 byte 정렬을 만족합니다. `main()`처럼 Thread mode에서 호출합니다. handler 안에서 부르면 exception return을 거치지 않으므로 application이 Handler mode로 시작합니다(UG 2.3.7 Exception return).

```c
#define APP_BASE 0x08010000UL   /* multiple of 0x200 */

static void jump_to_app(void)
{
    const uint32_t *app = (const uint32_t *)APP_BASE;
    void (*app_reset)(void) = (void (*)(void))app[1];

    __disable_irq();
    SysTick->CTRL = 0;
    for (uint32_t i = 0; i <= ((uint32_t)FPU_IRQn >> 5); i++) {
        NVIC->ICER[i] = 0xFFFFFFFFUL;
        NVIC->ICPR[i] = 0xFFFFFFFFUL;
    }

    SCB->VTOR = APP_BASE;
    __set_MSP(app[0]);
    __enable_irq();
    app_reset();
}
```

각 단계가 막는 문제는 다음과 같습니다.

- **SysTick과 NVIC enable을 끕니다.** VTOR를 바꾸기 전에 새 table에 fault handler, NMI, enable된 모든 예외의 entry가 있어야 합니다(UG 4.2.10). bootloader가 켜 둔 IRQ(`ICER`, UG 4.2.3)와 SysTick(`SYST_CSR`, UG 4.4.1)을 꺼 두면, application이 자기 peripheral을 초기화하기 전에 그 handler로 들어가지 않습니다. loop 상한 `FPU_IRQn >> 5` = 2는 IRQ 0~81이 `ICER[0]`~`ICER[2]`에 들어간다는 뜻입니다.
- **pending을 지웁니다.** IRQ는 disable 상태에서도 pending이 될 수 있습니다(UG 4.2.10). `ICPR`로 지우지 않으면(UG 4.2.5) application이 그 IRQ를 enable할 때 bootloader 시절의 요청으로 진입합니다.
- **MSP를 새 table의 word 0으로 둡니다.** ST GCC startup의 `Reset_Handler`는 첫 명령에서 `ldr sp, =_estack`으로 MSP를 다시 쓰므로([startup L61](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Source/Templates/gcc/startup_stm32f407xx.s#L61)) 이 startup에서는 결과가 같습니다. 첫 명령 전에 stack을 쓰는 startup에는 이 단계가 필요합니다.
- **PRIMASK를 0으로 되돌립니다.** PRIMASK의 0은 reset 값입니다(UG Table 2-2). 함수 호출로 넘어가면 reset이 일어나지 않으므로 `__disable_irq()` 상태가 그대로 application에 넘어가고, application이 `__enable_irq()`를 부르기 전까지 설정 가능한 예외가 하나도 진입하지 못합니다.

application 쪽에서는 `SystemInit()`을 봅니다. 템플릿은 `USER_VECT_TAB_ADDRESS`를 정의했을 때만 `SCB->VTOR = VECT_TAB_BASE_ADDRESS | VECT_TAB_OFFSET`을 쓰고, `VECT_TAB_OFFSET`의 기본값은 0입니다([system_stm32f4xx.c L94-L111](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Source/Templates/system_stm32f4xx.c#L94-L111), [L179-L181](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.9/Source/Templates/system_stm32f4xx.c#L179-L181)). `USER_VECT_TAB_ADDRESS`만 켜고 offset을 0x10000으로 바꾸지 않으면 VTOR가 0x08000000, 곧 bootloader의 table로 돌아갑니다. 둘 다 그대로 두면 `SystemInit()`은 VTOR를 건드리지 않고 bootloader가 쓴 값이 남습니다.

## 자주 보는 함정

> ⚠️ Priority bit 수가 다른 칩으로 이식

CMSIS `NVIC_SetPriority`는 인자를 `8 - __NVIC_PRIO_BITS`만큼 밀고 하위 8 bit만 남깁니다. 4 bit 칩에서 쓰던 `NVIC_SetPriority(IRQn, 9)`를 `__NVIC_PRIO_BITS`가 3인 장치에서 쓰면 9 << 5 = 0x120 → 0x20이 저장되어 우선순위 1이 됩니다. 낮은 우선순위로 두려던 IRQ가 8단계 중 두 번째로 높은 우선순위가 됩니다. 장치에 구현된 bit 수는 IRQ를 enable하기 전에 priority 바이트에 0xFF를 써서 읽어 보면 알 수 있습니다. 구현하지 않은 bit는 0으로 읽히므로(UG 4.2.7) STM32F407에서는 0xF0이 나와야 합니다. BASEPRI에 shift하지 않은 값을 쓰는 같은 종류의 실수는 [2-03](/blog/embedded/modern-recipes/part2-03-arm-registers)의 함정 절에 있습니다.

```c
uint8_t saved = NVIC->IP[EXTI0_IRQn];
NVIC->IP[EXTI0_IRQn] = 0xFF;
uint8_t implemented_mask = NVIC->IP[EXTI0_IRQn];
NVIC->IP[EXTI0_IRQn] = saved;
```

> ⚠️ subpriority만 쓰는 grouping

HAL의 `NVIC_PRIORITYGROUP_0`은 PRIGROUP = 7이라 group priority bit가 없습니다(UG Table 4-18의 0b111). 모든 IRQ가 같은 group이 되어 IRQ끼리는 서로 선점하지 못하고, 긴 handler가 끝날 때까지 나머지 IRQ가 기다립니다. 고정 우선순위인 Reset·NMI·HardFault는 이 설정과 상관없이 선점합니다(UG 2.3.5).

## 정리

- 선점 여부는 group priority만으로 정해집니다. 급하게 끼어들어야 하는 IRQ는 다른 group에 둡니다.
- 연속으로 pending되는 IRQ는 tail-chaining으로 이어집니다. cycle 비교는 "Tail-chaining과 late-arrival" 절의 메모리 조건과 함께 읽습니다.
- `NVIC_SetPriority` 값의 의미는 `__NVIC_PRIO_BITS`에 달려 있습니다. 칩을 바꾸면 구현 bit 수부터 읽어 봅니다.
- application으로 넘길 때는 IRQ를 끄고 pending을 지운 뒤 VTOR를 512 byte 경계의 새 table로 바꾸고, application의 `SystemInit()`이 그 값을 덮어쓰지 않는지 봅니다.

수정 이력: 2026-10-11 — tail-chaining 절감량 "5~6 cycle" → 18 cycle(TRM 3.9.1, zero wait state 조건). 우선순위 표 "0~3 = Reset·NMI·HardFault·MemManage" → Reset −3·NMI −2·HardFault −1 고정, MemManage 설정 가능(UG Table 2-16). 출처를 확인하지 못한 Cortex-M7 cycle 수와 late-arrival 6 cycle은 뺐습니다.

다음 편에서는 **ARM 메모리 맵**을 다룹니다. Normal·Device·Strongly-Ordered region을 구분합니다.

## 관련 항목

- [2-03: Cortex-M 레지스터 구조 분석](/blog/embedded/modern-recipes/part2-03-arm-registers) — MSP/PSP, `EXC_RETURN`, BASEPRI 설정
- [2-05: ARM 메모리 맵 분석](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-07: ARM MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [4-05: Cortex-M 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling) — handler 이름과 weak alias, EXTI 등 peripheral flag clear
- [Practical RTOS Internals: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context) — PendSV, lazy FPU
