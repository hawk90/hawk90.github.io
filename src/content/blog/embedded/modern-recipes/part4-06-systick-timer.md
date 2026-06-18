---
title: "SysTick 타이머 활용 — 24-bit Counter·1ms Tick·delay 구현"
date: 2026-04-13T09:40:00
description: "1ms tick·delay·jiffies — RTOS 없이 시간 처리."
series: "Modern Embedded Recipes"
seriesOrder: 40
tags: [recipes, bare-metal, systick]
draft: false
---

## 한 줄 요약

> **"SysTick은 모든 Cortex-M에 있는 1ms tick generator입니다."** Reload + IRQ 두 줄로 jiffies, delay, timeout이 끝납니다.

## 어떤 상황에서 쓰나

RTOS 없는 펌웨어에서 "100ms 후에 LED 끄기" 같은 단순 시간 처리가 필요할 때마다 polling delay를 쓰지 않습니다. delay loop은 *CPU clock 변화에 취약*하고 *다른 일을 막습니다*. SysTick은 *Cortex-M에 표준으로 들어있는* 24-bit down-counter로 reload 시 IRQ를 발생시킵니다.

이 글은 SysTick으로 1ms jiffies counter를 만들고, 안전한 `delay_ms()`, overflow-safe timeout 비교를 작성합니다.

## 핵심 개념

### SysTick register 네 개

| Register | 역할 |
|----------|------|
| `SYST_CSR` | enable, source select (proc clk vs ext), TICKINT |
| `SYST_RVR` | reload value (24-bit) |
| `SYST_CVR` | current value (read·write — write 시 0) |
| `SYST_CALIB` | calibration value (vendor-defined) |

CMSIS에서는 `SysTick->CTRL`, `SysTick->LOAD`, `SysTick->VAL`로 접근합니다.

### Tick frequency 계산

```text
reload + 1 = SYSCLK / desired_tick_hz

예) SYSCLK = 168 MHz, 1 ms tick (1000 Hz)
    reload + 1 = 168000000 / 1000 = 168000
    → SysTick->LOAD = 168000 - 1 = 167999
```

24-bit 한계는 16,777,215. 168 MHz에서 *최대 100ms 주기*까지 가능합니다. 더 긴 주기는 *TIM*을 씁니다.

### Overflow-safe timing

32-bit jiffies 카운터는 ~49.7일 후 wrap합니다. 직접 비교는 *wrap 직후 잘못된 결과*가 나옵니다.

```c
// ✗ 잘못 — wrap 시점에 false negative
if (jiffies > deadline) { ... }

// ✓ 옳음 — signed 차이로 비교
if ((int32_t)(jiffies - deadline) >= 0) { ... }
```

Linux kernel의 `time_after()`·`time_before()` 매크로가 같은 패턴입니다.

## 코드 예제

### 1. SysTick init + handler

```c
volatile uint32_t g_jiffies;

void systick_init_1ms(uint32_t sysclk_hz) {
    SysTick->LOAD = (sysclk_hz / 1000u) - 1;
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk
                  | SysTick_CTRL_TICKINT_Msk
                  | SysTick_CTRL_ENABLE_Msk;
    NVIC_SetPriority(SysTick_IRQn, 15);   // 일반적으로 가장 낮게
}

void SysTick_Handler(void) {
    g_jiffies++;
}

uint32_t millis(void) {
    return g_jiffies;
}
```

### 2. Safe delay

```c
void delay_ms(uint32_t ms) {
    uint32_t start = g_jiffies;
    while ((g_jiffies - start) < ms) {
        __WFI();   // wait for interrupt — low power
    }
}
```

`g_jiffies`는 `volatile`이어야 합니다. 안 그러면 compiler가 register에 캐싱해 *infinite loop*.

### 3. Timeout 패턴

```c
typedef struct {
    uint32_t deadline;
} timeout_t;

static inline void timeout_start(timeout_t *t, uint32_t ms) {
    t->deadline = g_jiffies + ms;
}

static inline int timeout_expired(const timeout_t *t) {
    return (int32_t)(g_jiffies - t->deadline) >= 0;
}

// 사용
timeout_t t;
timeout_start(&t, 100);
while (!sensor_ready()) {
    if (timeout_expired(&t)) {
        return -ETIMEDOUT;
    }
}
```

`int32_t` cast가 핵심입니다. 49.7일 wrap 직후에도 정확히 동작합니다.

### 4. Microsecond delay — busy loop

`__WFI()`는 1 ms 단위입니다. 더 짧은 delay는 cycle 카운터(DWT) 또는 SysTick `VAL`을 직접 읽습니다.

```c
void delay_us_dwt(uint32_t us) {
    uint32_t start = DWT->CYCCNT;
    uint32_t cycles = us * (SystemCoreClock / 1000000u);
    while ((DWT->CYCCNT - start) < cycles);
}

// DWT init (한 번만)
void dwt_init(void) {
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->CYCCNT = 0;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
}
```

DWT cycle counter는 32-bit, SYSCLK 168 MHz에서 ~25.5초 wrap. 짧은 timing 측정의 표준 도구입니다.

### 5. Periodic task (deadline 누적)

```c
static uint32_t next_run;

void task_100hz(void) {
    if ((int32_t)(g_jiffies - next_run) >= 0) {
        next_run += 10;   // 10 ms = 100 Hz
        do_work();
    }
}
```

`next_run = g_jiffies + 10` (slip 발생)이 아니라 `next_run += 10` (정확한 평균 주기 유지).

## 측정 / 동작 확인

SysTick이 동작하는지는 LED 1초 toggle로 확인합니다.

```c
uint32_t last = millis();
while (1) {
    if (millis() - last >= 1000) {
        last += 1000;
        GPIOA->ODR ^= (1u << 5);
    }
}
```

LED가 정확히 1Hz로 깜빡이면 tick이 1 ms로 들어오고 있다는 뜻입니다. 두 배 빠르거나 느리면 *SYSCLK 계산 오류* — clock setup을 다시 봅니다.

오실로스코프로 SysTick 진입 시점을 보려면 ISR 첫 줄에 GPIO toggle을 넣습니다.

```c
void SysTick_Handler(void) {
    GPIOA->BSRR = (1u << 5); GPIOA->BSRR = (1u << 21);
    g_jiffies++;
}
```

스코프 trigger를 PA5에 걸면 1 ms 주기 pulse가 보입니다. 주기가 다르면 reload 값이 잘못된 것입니다.

## 자주 보는 함정

> ⚠️ `g_jiffies`에 `volatile` 누락

main에서 `while (g_jiffies < target)`이 *영원히 false*가 됩니다 (compiler가 첫 read를 캐싱).

> ⚠️ Reload 값을 ÷1000 안 함

`SysTick->LOAD = 168000000`으로 두면 1 Hz tick. 168000으로 두면 1 kHz. SystemCoreClock 변수가 *현재 클럭과 일치하는지* 확인합니다.

> ⚠️ Direct compare `if (jiffies > deadline)`

wrap 시점에 잘못된 비교. signed 차이로 비교합니다.

> ⚠️ `delay_ms(0)`이 한 cycle 도는 게 아니라 99% 1 ms 대기

`g_jiffies - start = 0`이라 첫 iter는 들어옵니다. 그러나 SysTick 발생 직전에 진입하면 *0 ms로 끝나기도 합니다*. 정확한 0 dwell이 필요하면 별도 처리.

> ⚠️ SysTick priority를 너무 높게

priority 0~4에 두면 다른 ISR이 SysTick에 의해 막힙니다. 일반적으로 가장 낮은 priority (예: 15)에 둡니다.

> ⚠️ Debugger break 후 timing 어긋남

break 동안 SysTick은 멈추지 않으므로 jiffies가 *훨씬 늦은 값*이 됩니다. 디버깅 후 reset 한 번 해서 baseline 맞춥니다.

## 정리

- SysTick는 모든 Cortex-M의 **표준 24-bit down-counter + IRQ**.
- reload = SYSCLK / tick_hz - 1. 1 ms tick이 표준.
- `g_jiffies`는 **volatile**, timing 비교는 **signed 차이**로.
- µs 단위는 **DWT cycle counter**가 더 정확합니다.
- `__WFI()`로 wait — low power와 결합됩니다.

다음 편은 **UART 드라이버**입니다. polling·interrupt·DMA 세 방식을 모두 작성해 trade-off를 비교합니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
