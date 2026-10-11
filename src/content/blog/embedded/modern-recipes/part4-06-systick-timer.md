---
title: "SysTick 타이머 활용 — 24-bit Counter·1ms Tick·delay 구현"
slug: "embedded/modern-recipes/part4-06-systick-timer"
date: 2026-04-13T09:40:00
description: "STM32F407(Cortex-M4)의 SysTick으로 1 ms jiffies, delay_ms, wrap에 안전한 timeout을 만들고, SystemCoreClock·우선순위·PRIMASK·디버그 정지에서 tick이 틀어지는 경우를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 40
tags: [recipes, bare-metal, systick]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SysTick은 reload 값에서 0까지 세는 24-bit down-counter입니다."** 0에 닿을 때마다 오는 예외로 1 ms jiffies를 세고, delay·timeout·주기 작업은 unsigned 뺄셈으로 wrap에 안전하게 비교합니다. reload 값은 실제 HCLK에서 계산합니다. 4-04처럼 RCC 레지스터를 직접 써서 클럭을 바꾸면 CMSIS의 `SystemCoreClock`은 갱신되지 않습니다.

## 어떤 상황에서 쓰나

RTOS 없는 펌웨어에서 "100 ms 뒤 LED 끄기"나 "센서 응답을 100 ms까지 기다리기" 같은 시간 처리가 필요할 때 씁니다. 명령어 개수로 시간을 맞추는 busy loop은 클럭을 바꾸면 길이가 같이 바뀌고, 도는 동안 다른 일을 못 합니다. SysTick이 세는 tick은 클럭 설정에서 계산한 reload 값으로 주기가 정해집니다.

이 글의 코드는 STM32F407(Cortex-M4) 기준입니다. 레지스터 동작은 Arm [Cortex-M4 Devices Generic User Guide (DUI 0553A)](https://developer.arm.com/documentation/dui0553/a/)의 4.4절 "System timer, SysTick", 코드의 이름은 [CMSIS 5.9.0 `core_cm4.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h)와 [cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)를 따릅니다. 클럭은 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 `clock_init_168mhz()`(8 MHz HSE, SYSCLK = HCLK = 168 MHz)를 그대로 쓴다고 둡니다. 우선순위 숫자의 의미는 [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)의 Priority 절을 전제로 합니다.

## 핵심 개념

### SysTick register 네 개

DUI 0553A의 Table 4-32~4-36을 정리한 표입니다.

| Register | CMSIS 이름 | 역할 |
|----------|-----------|------|
| `SYST_CSR` | `SysTick->CTRL` | `ENABLE`, `TICKINT`(0 도달 시 예외 요청), `CLKSOURCE`(0 = external clock, 1 = processor clock), `COUNTFLAG`(마지막 읽기 뒤 0에 닿았으면 1) |
| `SYST_RVR` | `SysTick->LOAD` | `RELOAD`, bits [23:0]. 0에 닿은 다음 이 값으로 다시 시작 |
| `SYST_CVR` | `SysTick->VAL` | 현재 값. 아무 값이나 쓰면 0이 되고 `COUNTFLAG`도 0이 됨 |
| `SYST_CALIB` | `SysTick->CALIB` | `TENMS`(10 ms용 reload 값), `SKEW`, `NOREF`. 리셋 값은 implementation-defined |

DUI 0553A 4.4.5절 "SysTick usage hints and tips"는 reload와 현재 값이 하드웨어로 초기화되지 않으므로 RELOAD 설정 → 현재 값 지우기 → CTRL 설정 순서로 초기화하라고 적습니다. 아래 init 코드가 이 순서를 따릅니다.

### Tick 주기 계산

DUI 0553A의 "Calculating the RELOAD value"는 N 클럭 주기의 반복 타이머에 RELOAD = N − 1을 쓰라고 합니다. `CLKSOURCE = 1`이면 N은 프로세서 클럭 기준입니다.

```text
RELOAD = f_clk / f_tick - 1
f_clk = 168000000, f_tick = 1000
RELOAD = 168000 - 1 = 167999
```

RELOAD에 쓸 수 있는 값은 0x00000001~0x00FFFFFF입니다. 그래서 한 주기는 최대 2^24 클럭이고, 168 MHz에서는 2^24 / 168 MHz ≈ 99.86 ms입니다. 1 Hz tick처럼 이보다 긴 주기는 SysTick 하나로 만들 수 없으므로 1 ms tick을 세거나, 4-05의 "TIM2 periodic interrupt" 절처럼 prescaler가 있는 TIM을 씁니다.

### Wrap에 안전한 시간 비교

1 ms마다 1씩 느는 32-bit `uint32_t` 카운터는 2^32 ms ≈ 49.71일마다 0으로 돌아갑니다. 값끼리 직접 비교하면 `deadline = now + ms`가 wrap을 넘은 경우(예: now = 0xFFFFFFF0, deadline = 0x00000010) 바로 참이 됩니다.

```c
// wrong: true at once when deadline wrapped past 0
if (now >= deadline) { /* ... */ }

// right: modular difference, reached while it is below 2^31
static inline int time_reached(uint32_t now, uint32_t deadline) {
    return (uint32_t)(now - deadline) < 0x80000000u;
}
```

unsigned 뺄셈은 2^32로 나눈 나머지로 계산되므로(C11 [N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) 6.2.5p9) `now - deadline`은 wrap과 상관없이 deadline에서 지난 tick 수가 됩니다. Linux v6.6의 [`time_after_eq(a, b)`](https://github.com/torvalds/linux/blob/v6.6/include/linux/jiffies.h#L144-L147)는 같은 판정(a가 b와 같거나 뒤)을 `((long)((a) - (b)) >= 0)`처럼 차이를 signed로 바꿔서 합니다. 표준 C에서 signed 형의 범위를 넘는 값을 signed로 바꾼 결과는 implementation-defined(N1570 6.3.1.3p3)이므로, 이 글은 같은 판정을 `< 0x80000000u` 비교로 씁니다.

어느 쪽이든 두 시각의 간격이 2^31 tick보다 작아야 맞습니다. 1 ms tick이면 2^31 ms ≈ 24.86일이고, 아래 timeout·주기 작업의 인자도 이 범위 안에 둡니다. 49.71일은 카운터 전체가 한 바퀴 도는 주기일 뿐 이 한계가 아닙니다.

## 코드 예제

### 1. SysTick init + handler

```c
volatile uint32_t g_jiffies;

void systick_init_1ms(uint32_t cpu_hz) {
    SysTick->LOAD = (cpu_hz / 1000u) - 1u;
    NVIC_SetPriority(SysTick_IRQn, (1UL << __NVIC_PRIO_BITS) - 1UL);
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk
                  | SysTick_CTRL_TICKINT_Msk
                  | SysTick_CTRL_ENABLE_Msk;
}

void SysTick_Handler(void) {
    g_jiffies++;
}

uint32_t millis(void) {
    return g_jiffies;
}
```

```c
clock_init_168mhz();             /* 4-04 */
systick_init_1ms(168000000u);
```

순서와 우선순위는 CMSIS 5.9.0의 [`SysTick_Config()`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h#L2022-L2036)와 같습니다. SysTick을 15(가장 낮음)에 둔 배치와 다른 IRQ와의 선점 관계는 [2-04: Cortex-M4 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)의 "IRQ 우선순위 배치"·"이 설정에서 예외 경로" 절에서 다룹니다. `SysTick_Config()`는 `ticks - 1`이 `0xFFFFFF`를 넘으면 레지스터를 건드리지 않고 1을 반환하지만, 위 함수에는 그 범위 검사가 없으므로 `cpu_hz / 1000`이 2^24 이하일 때만 씁니다.

클럭을 인자로 받는 이유는 4-04의 설정 뒤 `SystemCoreClock`이 168 MHz가 아니기 때문입니다. cmsis-device-f4 v2.6.9의 [`system_stm32f4xx.c`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Source/Templates/system_stm32f4xx.c#L129-L137)에서 이 변수의 초기값은 16000000이고, 같은 곳의 주석은 갱신 경로로 `SystemCoreClockUpdate()`, HAL의 `HAL_RCC_GetHCLKFreq()`, `HAL_RCC_ClockConfig()` 세 가지를 듭니다. 4-04의 `clock_init_168mhz()`는 RCC 레지스터를 직접 쓰고 셋 중 어느 것도 부르지 않습니다. 그래서 그 뒤 `SysTick_Config(SystemCoreClock / 1000u)`를 부르면 RELOAD가 15999가 되어 tick이 16000 / 168 MHz ≈ 95.24 µs마다, 즉 1 ms보다 10.5배 자주 옵니다.

`SystemCoreClockUpdate()`를 불러도 바로 맞지는 않습니다. 이 함수는 PLL 입력을 `HSE_VALUE` 상수로 계산하는데, 정의하지 않으면 기본값이 25000000입니다([L50-L52](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Source/Templates/system_stm32f4xx.c#L50-L52), [L220-L255](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Source/Templates/system_stm32f4xx.c#L220-L255)). 8 MHz crystal에 PLL_M = 8, PLL_N = 336, PLL_P = 2인 4-04 설정에서는 (25000000 / 8) × 336 / 2 = 525,000,000이 나옵니다. `SystemCoreClock`을 쓰려면 빌드에 `HSE_VALUE=8000000`을 정의하고 클럭 전환 뒤 `SystemCoreClockUpdate()`를 부릅니다. 이 글은 클럭을 인자로 넘겨 그 의존을 없앴습니다.

### 2. delay_ms

```c
void delay_ms(uint32_t ms) {
    uint32_t start = g_jiffies;
    while ((g_jiffies - start) < ms) {
        __WFI();
    }
}
```

`__WFI()`는 프로세서를 sleep으로 보냅니다. DUI 0553A 2.5.2절 "Wakeup from sleep mode"에 따르면 프로세서는 보통 예외 진입이 가능한 우선순위의 예외가 오면 깨어납니다. SysTick 말고 다른 인터럽트로 깨어나도 조건을 다시 검사하므로 결과는 같습니다. PRIMASK가 1일 때의 예외는 아래 "자주 보는 함정"에서 다룹니다.

이 delay의 해상도는 1 tick입니다. `start`를 읽는 순간은 tick 사이 어디쯤이므로 첫 증가는 0 ms 초과 1 ms 이하 뒤에 옵니다. 조건을 마지막으로 검사한 직후, `__WFI()`를 실행하기 전에 n번째 증가가 오면 WFI는 다음 인터럽트까지 잠듭니다. DUI 0553A 3.12.12절 "WFI"에 따르면 WFI는 인터럽트가 와서 처리되거나, PRIMASK로 막힌 인터럽트가 pending되거나, 디버그 진입 요청이 있을 때까지 실행을 멈춥니다. 다른 인터럽트가 없으면 다음 tick까지 1 ms를 더 잡니다. 따라서 `delay_ms(n)`은 n − 1 ms 초과 n + 1 ms 이하를 기다리고(ISR 지연 제외), `delay_ms(0)`은 조건이 처음부터 거짓이라 바로 반환하며, `delay_ms(1)`은 0 ms 초과 2 ms 이하를 기다립니다. 최소 n ms를 보장해야 하면 `delay_ms(n + 1)`을 부릅니다.

`g_jiffies`가 `volatile`이어야 하는 이유는 C11 6.7.3p7입니다. volatile 객체를 가리키는 식은 추상 기계 규칙대로 평가해야 하므로 루프를 돌 때마다 메모리에서 다시 읽습니다. `volatile`이 없으면 컴파일러는 ISR이 값을 바꾼다는 것을 모르므로 읽기를 루프 밖으로 옮길 수 있고, 그러면 루프가 끝나지 않습니다.

### 3. Timeout 패턴

```c
typedef struct {
    uint32_t deadline;
} timeout_t;

static inline void timeout_start(timeout_t *t, uint32_t ms) {
    t->deadline = g_jiffies + ms;
}

static inline int timeout_expired(const timeout_t *t) {
    return time_reached(g_jiffies, t->deadline);
}

extern int sensor_ready(void);   /* board-specific status check */

int wait_sensor(void) {
    timeout_t t;
    timeout_start(&t, 100);
    while (!sensor_ready()) {
        if (timeout_expired(&t)) {
            return -1;           /* timed out */
        }
    }
    return 0;
}
```

`ETIMEDOUT`은 C11 `<errno.h>`가 아니라 POSIX가 정의하는 이름이라 bare-metal 툴체인에 있다고 가정하지 않고 `-1`을 돌려줍니다.

### 4. Microsecond delay — DWT cycle counter

`delay_ms`의 해상도가 1 tick이므로 µs 단위는 DWT의 clock cycle counter `CYCCNT`로 셉니다. `dwt_init()`(DEMCR `TRCENA` → `CYCCNT = 0` → `CYCCNTENA`)은 [Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)의 "DWT Cycle Counter — Cortex-M3 이상" 절 코드를 그대로 씁니다.

```c
void delay_us_dwt(uint32_t us, uint32_t cpu_hz) {
    uint32_t start = DWT->CYCCNT;
    uint32_t cycles = us * (cpu_hz / 1000000u);
    while ((DWT->CYCCNT - start) < cycles) {
    }
}
```

`systick_init_1ms()`와 같은 이유로 `SystemCoreClock` 대신 클럭을 인자로 받습니다. `cpu_hz / 1000000u`는 정수 나눗셈이라 168 MHz처럼 1 MHz의 배수일 때 정확합니다.

DWT는 구현에 따라 빠질 수 있습니다. Cortex-M4 TRM([DDI 0439B](https://developer.arm.com/documentation/ddi0439/b/)) 9.3절은 일부 DWT 레지스터가 없을 수 있고 없는 레지스터는 0으로 읽힌다고 적으며, CMSIS 5.9.0의 `core_cm0plus.h`에는 DWT 정의가 아예 없습니다. 그래서 `dwt_init()` 뒤 `CYCCNT`가 늘지 않으면 이 방식은 그 칩에서 쓸 수 없습니다. `CYCCNT`는 32-bit이므로 168 MHz에서 2^32 / 168 MHz ≈ 25.57초마다 wrap하고, `us * (cpu_hz / 1000000u)`가 `uint32_t` 범위를 넘으면 `cycles`가 wrap해 짧아지므로, 168 MHz에서 `us`는 25,565,281 이하여야 합니다.

### 5. Periodic task (deadline 누적)

```c
static uint32_t next_run;

void task_100hz(void) {
    if (time_reached(g_jiffies, next_run)) {
        next_run += 10;   // 10 ms = 100 Hz
        do_work();
    }
}
```

`next_run = g_jiffies + 10`으로 두면 호출이 늦은 만큼 다음 실행도 밀려 주기가 10 ms보다 길어집니다. `next_run += 10`은 deadline을 10 ms 격자에 묶어 두므로 늦어진 시간이 쌓이지 않습니다. 대신 한 호출이 deadline보다 10 ms 이상 늦으면 `next_run`이 여전히 과거라 다음 호출들이 쉬지 않고 연달아 `do_work()`를 실행해 밀린 횟수를 따라잡습니다. 따라잡기가 문제라면 늦었을 때 `next_run = g_jiffies + 10`으로 다시 맞춥니다.

## 측정 / 동작 확인

PA5에 LED를 단 STM32F407 보드라면 1초 toggle로 tick 주기를 확인합니다. GPIOA 클럭을 켜고 PA5를 general purpose output(`MODER5 = 01`)으로 둔 뒤 돌립니다.

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
GPIOA->MODER  = (GPIOA->MODER & ~GPIO_MODER_MODER5) | GPIO_MODER_MODER5_0;

uint32_t last = millis();
while (1) {
    if (millis() - last >= 1000) {
        last += 1000;
        GPIOA->ODR ^= (1u << 5);
    }
}
```

LED는 1초 켜지고 1초 꺼집니다. 다른 간격이 나오면 아래 표에서 원인을 찾습니다. 각 값은 HCLK = 168 MHz에서 계산한 것입니다.

| 설정 실수 | 1 tick | LED 한 상태 |
|-----------|--------|-------------|
| `SysTick_Config(SystemCoreClock / 1000u)`, `SystemCoreClock` 갱신 안 함(16000000) | ≈ 95.24 µs | ≈ 95.24 ms |
| `SystemCoreClockUpdate()`를 불렀지만 `HSE_VALUE` 미정의(525,000,000으로 계산) | 3.125 ms | 3.125 s |
| `CLKSOURCE = 0`(STM32F4에서는 HCLK / 8 = 21 MHz) | 8 ms | 8 s |

앞의 두 행은 "SysTick init + handler" 절의 `SystemCoreClock` 문제입니다. 셋째 행은 위 init 코드가 아니라 HAL의 `HAL_SYSTICK_CLKSourceConfig(SYSTICK_CLKSOURCE_HCLK_DIV8)`처럼 `CLKSOURCE`를 0으로 바꾼 경우입니다(stm32f4xx_hal_driver v1.8.3 [`stm32f4xx_hal_cortex.h` L105](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Inc/stm32f4xx_hal_cortex.h#L105), [`stm32f4xx_hal_cortex.c` L484](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_cortex.c#L484)).

오실로스코프로 SysTick 진입 간격을 보려면 ISR 첫 줄에서 같은 PA5에 짧은 pulse를 냅니다. `stm32f407xx.h`에서 `BSRR`의 bit 5는 `GPIO_BSRR_BS5`(set), bit 21은 `GPIO_BSRR_BR5`(reset)입니다.

```c
void SysTick_Handler(void) {
    GPIOA->BSRR = GPIO_BSRR_BS5;
    GPIOA->BSRR = GPIO_BSRR_BR5;
    g_jiffies++;
}
```

이 handler는 1절의 `SysTick_Handler`를 대신합니다. 같은 이름의 함수를 둘 두면 링크 오류가 납니다. pulse 간격은 1 ms여야 하고, 다르면 위 표의 1 tick 열과 맞춰 봅니다.

## 자주 보는 함정

> ⚠️ ISR 안이나 인터럽트를 막은 구간에서 `delay_ms()` 호출

SysTick은 가장 낮은 우선순위입니다. DUI 0553A 2.3.5절 "Exception priorities"에 따르면 실행 중인 handler는 더 높은 우선순위의 예외가 올 때만 선점되므로, 우선순위가 같거나 높은 ISR 안에서는 `SysTick_Handler`가 돌지 못하고 `g_jiffies`가 멈춥니다. `__disable_irq()`로 PRIMASK를 1로 둔 구간도 같습니다. DUI 0553A 2.5.2절은 PRIMASK = 1일 때 인터럽트가 오면 프로세서가 WFI에서 깨어나지만 PRIMASK가 0이 될 때까지 handler를 실행하지 않는다고 적습니다. 그래서 `delay_ms()`의 루프는 깨어나기만 반복하고 `g_jiffies`는 늘지 않아 끝나지 않습니다.

> ⚠️ Debugger break 뒤 시간이 밀림

DUI 0553A 4.4절에 따르면 프로세서가 디버그로 halt된 동안 SysTick counter는 줄지 않습니다. resume하면 `g_jiffies`는 멈춰 있던 시간만큼 실제 시간보다 뒤처지고, 그 사이 걸어 둔 timeout도 그만큼 늦게 만료됩니다. 워치독의 디버그 정지는 [4-12: 워치독](/blog/embedded/modern-recipes/part4-12-watchdog)의 "Debug freeze" 절에서 다룹니다.

> ⚠️ Stop mode 동안 jiffies가 멈춤

DUI 0553A 4.4.5절은 deep sleep에서 프로세서 클럭을 모두 멈추는 구현이 있고, 그러면 SysTick counter도 멈춘다고 적습니다. STM32F4의 Stop mode는 `SLEEPDEEP`을 켜고 들어가며, 그동안 1.2 V 영역의 클럭이 모두 멈추고 PLL·HSI·HSE가 꺼집니다(stm32f4xx_hal_driver v1.8.3 [`stm32f4xx_hal_pwr.c` L196-L201](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_pwr.c#L196-L201), [L454-L455](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_pwr.c#L454-L455)). SYSCLK를 만들 수 있는 HSI·HSE·PLL이 모두 꺼지므로 SysTick의 두 클럭(HCLK, HCLK / 8)도 서고, 깨어난 뒤 `g_jiffies`는 Stop에 머문 시간만큼 뒤처집니다. 또 깨어날 때 system clock은 HSI(16 MHz)로 바뀌므로([L425-L427](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_pwr.c#L425-L427)), `clock_init_168mhz()`를 다시 부르기 전까지 RELOAD 167999인 SysTick은 168000 / 16 MHz = 10.5 ms마다 옵니다. Stop 진입·복귀 코드는 [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)의 "Stop mode (EXTI wake-up)" 절에 있습니다.

## 정리

- reload 값은 `SystemCoreClock`이 아니라 실제로 설정한 HCLK에서 계산합니다. CMSIS 변수를 쓰려면 `HSE_VALUE`를 맞추고 `SystemCoreClockUpdate()`를 부른 뒤에 씁니다.
- 시간 비교는 `(uint32_t)(now - deadline) < 0x80000000u`로 하고, 간격은 2^31 tick 미만으로 둡니다.
- 최소 n ms를 보장하려면 `delay_ms(n + 1)`을 부르고, µs 단위는 DWT `CYCCNT`로 셉니다.
- `g_jiffies`는 우선순위가 같거나 높은 ISR, PRIMASK = 1 구간, 디버그 halt, Stop mode에서 멈춥니다.

다음 편은 **UART 드라이버**입니다. polling·interrupt·DMA 세 방식을 모두 작성해 trade-off를 비교합니다.

## 관련 항목

- [2-04: Cortex-M4 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [4-07: UART 드라이버](/blog/embedded/modern-recipes/part4-07-uart-driver)
- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
- [Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
