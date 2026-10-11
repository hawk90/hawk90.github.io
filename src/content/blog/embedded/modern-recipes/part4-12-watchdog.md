---
title: "STM32F405/407 IWDG·WWDG 워치독 구현 — Independent vs Window 비교"
slug: "embedded/modern-recipes/part4-12-watchdog"
date: 2026-04-13T09:46:00
description: "STM32F405/407에서 IWDG와 WWDG를 레지스터로 설정하고, LSI 편차를 넣은 timeout·refresh window 계산, multi-task refresh, debug freeze, reset 원인 판별까지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 46
tags: [recipes, bare-metal, watchdog]
draft: false
topics: ["embedded"]
---

이 글은 STM32F405/407의 두 워치독, IWDG와 WWDG를 레지스터로 설정하고 어느 쪽을 어떤 조건에서 쓸지 정합니다. WWDG 시간 계산은 PCLK1 = 42 MHz를 전제로 하며, 이 값을 만드는 분주 설정은 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)에 있습니다.

출처는 다음 판을 씁니다. 동작과 타이밍은 [RM0090 Rev 22](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf), LSI 주파수 범위는 [DS8626 Rev 12](https://www.st.com/resource/en/datasheet/stm32f407vg.pdf), 레지스터 이름과 비트 위치는 [CMSIS `stm32f407xx.h` v2.6.9](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h), HAL과의 비교는 [STM32F4 HAL driver v1.8.5](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/tree/v1.8.5)입니다. ST 링크는 판이 고정되지 않은 최신본 주소이고, 본문 수치는 위에 적은 판에서 읽었습니다.

## 핵심 개념

### IWDG vs WWDG

| 특성 | IWDG | WWDG |
|------|------|------|
| Clock | LSI, 17 / 32 / 47 kHz (min / typ / max) | PCLK1 / 4096 / 2^WDGTB |
| Reset 조건 | counter가 0x000에 도달 | counter가 0x40 → 0x3F로 내려감, *또는* counter > W일 때 refresh |
| 시작 | `KR = 0xCCCC`, 또는 option bit `WDG_SW` = 0이면 power-on에 하드웨어가 시작 | `WDGA` = 1. reset 뒤에는 항상 꺼져 있음 |
| 켠 뒤 끄기 | 불가 (LSI도 강제로 켜진 채 유지) | 불가 (system reset 전까지) |
| Stop / Standby | 동작 (VDD domain), IWDG reset으로 Standby 탈출 | 정지 |
| reset 전 경고 | 없음 | EWI interrupt (counter = 0x40) |
| RM0090이 권하는 용도 | main 동작과 독립된 안전망, 낮은 timing 정확도 요구 | 정확한 timing window 안의 반응 |

LSI 값은 DS8626 Table 35(VDD = 3 V, TA = −40 ~ 105 °C, characterization 값, 양산 시험 아님)입니다. IWDG 열은 RM0090 21.1~21.3절과 Table 16(`WDG_SW`: 0 = hardware, 1 = software watchdog), "끄기 불가"는 [HAL IWDG 주석](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_iwdg.c#L33-L36)에서 옮겼습니다. WWDG 열은 RM0090 22.2~22.6절입니다. WWDG의 Stop/Standby 행은 RM0090의 세 문장을 이어 얻은 결론입니다. 1.2 V domain에는 core·memory·digital peripheral이 있고(5.1.3절), Stop에서는 이 domain의 clock이 모두 멈추며(5.3.4절), Standby에서는 이 domain의 전원이 꺼집니다(5.3절).

### IWDG timeout과 LSI 편차

```text
Timeout = (RLR + 1) x prescaler / f_LSI
  prescaler = 4, 8, 16, 32, 64, 128, 256   (PR = 0 ... 6)
  RLR       = 0 ... 4095                   (12-bit)
```

RM0090 Table 107은 이 식을 f_LSI = 32 kHz에 넣은 최소·최대값(/4·RLR = 0에서 0.125 ms, /256·RLR = 0xFFF에서 32768 ms)을 주고, 각주에서 실제 LSI가 데이터시트 범위 안에서 달라진다고 적습니다. 그래서 timeout은 f_LSI 하나가 아니라 17 ~ 47 kHz 범위로 계산합니다. 아래 코드 예제의 설정(PR = /64, RLR = 499)은 LSI 500 × 64 = 32000 주기를 셉니다.

| f_LSI | timeout |
| --- | --- |
| 47 kHz (max) | 0.681 s |
| 32 kHz (typ) | 1.000 s |
| 17 kHz (min) | 1.882 s |

refresh 간격의 상한은 가장 짧은 값인 0.681 s입니다. 그보다 촘촘한 판정이 필요하면 LSI를 직접 잽니다. F4에서는 LSI가 TIM5 CH4 input capture에 내부 연결돼 있어, 측정한 주파수로 RLR을 다시 계산할 수 있습니다([HAL IWDG 주석](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_iwdg.c#L52-L57)).

### WWDG window

WWDG는 7-bit counter `T[6:0]`이 0x40에서 0x3F로 내려가는 순간 reset을 냅니다. counter가 window 값 `W`보다 클 때 refresh해도 reset입니다(RM0090 22.3절). 같은 절의 다른 문장은 counter가 W보다 *작을 때* reload하라고 적어, counter = W인 순간은 두 문장이 다르게 읽힙니다. 아래 표와 시간 계산은 첫 문장을 따르며, 경계를 피하려면 counter가 W − 1 이하일 때 refresh합니다. 아래 코드 예제처럼 counter = 0x7F, W = 0x60이면 다음과 같습니다.

| Counter 값 | 이때 refresh하면 |
| --- | --- |
| 0x7F ~ 0x61 | 너무 이름 → reset |
| 0x60 ~ 0x40 (window) | refresh OK |
| 0x40 → 0x3F로 내려감 | refresh 없이 시간 초과 → reset |

## 코드 예제

### IWDG — 공칭 1초 timeout

```c
void iwdg_init_1sec(void) {
    IWDG->KR = 0xCCCC;            // start; LSI is forced on
    IWDG->KR = 0x5555;            // unlock PR/RLR
    IWDG->PR = 4;                 // /64
    IWDG->RLR = 499;              // 500 x 64 = 32000 LSI cycles
    while (IWDG->SR & (IWDG_SR_PVU | IWDG_SR_RVU)) { }  // wait for update
    IWDG->KR = 0xAAAA;            // reload counter with RLR
}

static inline void iwdg_kick(void) {
    IWDG->KR = 0xAAAA;
}

// main
iwdg_init_1sec();
while (1) {
    do_work();     // one pass must take < 0.681 s (LSI = 47 kHz)
    iwdg_kick();
}
```

순서는 `HAL_IWDG_Init()`과 같습니다. start(0xCCCC) → 쓰기 허용(0x5555) → PR·RLR 쓰기 → `IWDG_SR`의 PVU·RVU가 0이 될 때까지 대기 → reload(0xAAAA). `PR = 4`는 HAL의 `IWDG_PRESCALER_64`(`IWDG_PR_PR_2`)와 같은 값입니다([HAL IWDG header](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Inc/stm32f4xx_hal_iwdg.h#L83)).

첫 줄의 0xCCCC 뒤로는 IWDG를 끌 방법이 없습니다. `WDG_SW` = 0으로 programming된 칩은 이 줄이 없어도 power-on 때 IWDG가 이미 돌고 있고(RM0090 21.3.1절), 그때 설정은 reset 값인 PR = /4, counter 0xFFF(21.3절, 21.4.2절)입니다. 이 경우 4096 × 4 = 16384 LSI 주기, 즉 LSI max에서 0.349 s 안에 첫 refresh가 와야 합니다. IWDG가 시작된 시점부터 첫 `iwdg_kick()`까지의 경로(부트로더, clock 설정, 긴 초기화)가 이 시간을 넘으면 IWDG reset이 나고, 다음 부팅이 같은 경로를 다시 밟으므로 reset이 반복됩니다. 이 증상의 진단은 [10-06: 부팅 실패 진단](/blog/embedded/modern-recipes/part10-06-boot-failure)의 "Watchdog 활성으로 boot loop" 항목에 있습니다.

### Multi-task check-in 패턴

여러 task가 동작할 때 한 task만 멈춰도 전체가 reset되어야 합니다. supervisor는 모든 task가 신호했을 때만 refresh합니다.

```c
#define TASKS 4
#define ALL_TASKS_MASK ((1u << TASKS) - 1u)
static volatile uint32_t task_alive_mask;

void task_alive(unsigned id) {
    uint32_t primask = __get_PRIMASK();
    __disable_irq();
    task_alive_mask |= (1u << id);
    __set_PRIMASK(primask);
}

// called every T_sup
void watchdog_task(void) {
    uint32_t primask = __get_PRIMASK();
    __disable_irq();
    uint32_t all = (task_alive_mask == ALL_TASKS_MASK);
    if (all) {
        task_alive_mask = 0;
    }
    __set_PRIMASK(primask);
    if (all) {
        iwdg_kick();
    }
}
```

`|=`와 clear는 read-modify-write라서, 선점되는 사이에 다른 task의 신호가 지워지지 않도록 PRIMASK로 감쌌습니다. 이 패턴이 기대는 조건은 하나입니다. mask를 지운 직후 가장 느린 task가 다시 신호하기까지 최대 T_task_max가 걸리고, supervisor가 그것을 보기까지 최대 T_sup가 더 걸립니다. 따라서 T_task_max + T_sup < 0.681 s여야 정상 동작 중에 reset이 나지 않습니다. FreeRTOS 소프트웨어 timer callback에서 refresh하는 구조는 [6-12: RTOS 디버깅](/blog/embedded/modern-recipes/part6-12-rtos-debugging)의 "Watchdog 통합" 절에 있습니다. 그 절의 코드에는 flag를 지우는 부분이 없으므로, 옮겨 쓸 때는 위 `watchdog_task()`처럼 refresh할 때 flag를 함께 지웁니다.

### WWDG with window

```c
void wwdg_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_WWDGEN;

    // PCLK1 = 42 MHz, /4096, WDGTB = /8 -> 1 step = 0.780 ms
    // first step after a CR write: 0 ~ 1 step (prescaler state unknown)
    // counter reaches W = 0x60 after 31 steps: (23.41, 24.19] ms
    // counter rolls 0x40 -> 0x3F after 64 steps: (49.15, 49.93] ms -> reset
    WWDG->CFR = (3u << WWDG_CFR_WDGTB_Pos)   // WDGTB = 0b11 -> /8, EWI (bit 9) off
              | 0x60u;                       // W = 0x60
    WWDG->CR = WWDG_CR_WDGA | 0x7Fu;         // enable, counter = 0x7F
}

static inline void wwdg_kick(void) {
    WWDG->CR = WWDG_CR_WDGA | 0x7Fu;         // reload counter (0xFF)
}
```

`WDGTB`는 `WWDG_CFR` bit 8:7, `EWI`는 bit 9입니다([CMSIS header](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h#L12697-L12707)). counter는 PCLK1 4096 × 2^WDGTB 주기마다 1씩 줄어듭니다(RM0090 22.6.1절). 한 step은 `t_PCLK1 × 4096 × 2^WDGTB`(22.4절)이고, 42 MHz·/8에서 4096 × 8 / 42 MHz = 0.780 ms입니다. RM0090 22.3절은 `WWDG_CR`에 쓰는 순간 prescaler 상태를 알 수 없어 시간이 최소값과 최대값 사이에서 달라진다고 적습니다. 즉 쓰기 직후 첫 step은 0 ms 초과 0.780 ms 이하에서 끝나고, 모든 시점에 1 step의 불확실성이 붙습니다. counter가 W = 0x60에 닿아 window가 열리는 시점은 마지막 refresh 뒤 23.41 ms 초과 24.19 ms 이하이고, refresh가 없으면 64 step째인 49.15 ms 초과 49.93 ms 이하에서 reset이 납니다. window 안에 머무는 시간은 counter 0x60 ~ 0x40의 33 step, 25.75 ms로 일정합니다. [HAL WWDG 주석](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_wwdg.c#L53-L57)은 같은 설정(42 MHz, /8, T[5:0] = 0x3F)의 timeout을 "approximately 49.93ms"로 적는데, 이 값은 위 범위의 최대값입니다.

`HAL_WWDG_Init()`은 `CR`(WDGA·counter)을 먼저 쓰고 `CFR`을 나중에 씁니다([hal_wwdg.c](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Src/stm32f4xx_hal_wwdg.c#L209-L213)). 위 코드는 순서를 바꿔, `WDGA`로 워치독이 켜지는 순간 이미 W와 prescaler가 들어가 있게 했습니다. `wwdg_kick()`이 `WDGA`까지 함께 쓰는 것은 RM0090 22.3절이 `WWDG_CR`에 쓰는 값을 0xC0 ~ 0xFF로 정하기 때문입니다.

reset 전에 원인을 남기려면 `CFR`의 `EWI`를 켜고 NVIC에서 `WWDG_IRQn`을 enable합니다. counter가 0x40이 되면 interrupt가 오고, 그 다음 한 step 뒤에 reset이 나므로 위 설정에서 ISR이 기록에 쓸 수 있는 시간은 0.780 ms 이하입니다. `EWI`는 한번 켜면 reset 전에는 끌 수 없고, 더 높은 우선순위 코드가 막고 있어 ISR이 돌지 못해도 reset은 그대로 납니다(RM0090 22.3절, 22.6.2절). NVIC 설정은 [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)을 참고합니다.

```c
void WWDG_IRQHandler(void) {
    WWDG->SR = 0;   // clear EWIF: write 0 (writing 1 has no effect)
    // record the cause here (backup register, etc.); reset follows in <= 1 step
}
```

`EWIF`는 `WWDG_SR` bit 0이고, 소프트웨어가 0을 써서 지웁니다(RM0090 22.3절, 22.6.3절). RM0090 22.3절은 다른 쓰임도 적습니다. ISR에서 counter를 다시 load하면 reset 없이 시스템 점검이나 단계적 기능 축소를 할 수 있습니다. 이때 ISR은 counter가 0x40인 동안, 즉 window 안에서 `wwdg_kick()`과 같은 값을 씁니다.

### Debug freeze

디버거로 core를 halt하면 IWDG·WWDG counter는 `DBGMCU_APB1_FZ`의 `DBG_IWDG_STOP`·`DBG_WWDG_STOP` 비트에 따라 계속 돌거나 멈춥니다(RM0090 21.3.3절, 22.5절, 38.16.4절). 비트가 0이면 breakpoint에 멈춰 있는 동안 timeout이 지나 reset이 납니다.

```c
DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP
                | DBGMCU_APB1_FZ_DBG_WWDG_STOP;
```

HAL의 `__HAL_DBGMCU_FREEZE_IWDG()`·`__HAL_DBGMCU_FREEZE_WWDG()`가 같은 비트를 씁니다([`stm32f4xx_hal.h`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.5/Inc/stm32f4xx_hal.h#L81-L82)). 비트는 core가 halt된 동안에만 counter clock을 멈춥니다. 이 레지스터는 POR에서만 지워지고 system reset으로는 지워지지 않으므로(RM0090 38.16.4절), 한 번 set한 비트는 다른 이미지를 올리고 reset해도 전원을 끄기 전까지 남습니다. 디버거를 붙인 채 breakpoint에서 워치독 reset을 일부러 보려면 `__HAL_DBGMCU_UNFREEZE_IWDG()`처럼 비트를 직접 지웁니다.

### Reset 원인 확인

reset 후 `RCC_CSR`의 flag로 원인을 가립니다.

```c
typedef enum {
    RESET_UNKNOWN,   // no flag set
    RESET_POR,       // power-on / power-down
    RESET_PIN,       // NRST pin
    RESET_SOFT,      // NVIC_SystemReset()
    RESET_IWDG,      // independent watchdog
    RESET_WWDG,      // window watchdog
    RESET_LPWR,      // low-power management
    RESET_BOR,       // brown-out
} reset_cause_t;

reset_cause_t get_reset_cause(void) {
    uint32_t csr = RCC->CSR;
    RCC->CSR |= RCC_CSR_RMVF;  // clear flags

    if (csr & RCC_CSR_IWDGRSTF) return RESET_IWDG;
    if (csr & RCC_CSR_WWDGRSTF) return RESET_WWDG;
    if (csr & RCC_CSR_SFTRSTF)  return RESET_SOFT;
    if (csr & RCC_CSR_LPWRRSTF) return RESET_LPWR;
    if (csr & RCC_CSR_PORRSTF)  return RESET_POR;
    if (csr & RCC_CSR_PINRSTF)  return RESET_PIN;
    if (csr & RCC_CSR_BORRSTF)  return RESET_BOR;
    return RESET_UNKNOWN;
}
```

검사 순서는 RM0090 7.3.21절에서 나옵니다. `RCC_CSR`의 reset 값은 0x0E00 0000, 즉 POR 뒤에는 `PORRSTF`·`PINRSTF`·`BORRSTF` 세 개가 함께 set됩니다. `BORRSTF`는 "POR/PDR or BOR"에서 set되므로, `PORRSTF`를 먼저 보지 않으면 모든 전원 투입이 brown-out이나 pin reset으로 분류됩니다. flag는 `RMVF`로 지우기 전까지 남으므로 읽은 직후 지웁니다. 부트로더가 먼저 `RMVF`를 썼다면 application에서는 flag가 모두 0이고, 이 경우를 POR로 보고하지 않도록 `RESET_UNKNOWN`을 따로 둡니다. main 첫 줄에서 호출해 cause를 backup register나 Flash에 기록하면 field에서 IWDG reset 빈도를 셀 수 있습니다.

## 동작 확인

워치독 검증은 일부러 hang을 만듭니다. refresh하는 구간을 가장 긴 timeout, 즉 LSI min(17 kHz)에서의 1.882 s보다 길게 잡아야, refresh가 실제로 reset을 막는다는 것까지 함께 확인됩니다. 공칭 1 s를 기준으로 1.5 s를 잡으면 LSI가 느린 칩에서는 refresh가 없어도 reset이 나지 않아 통과처럼 보입니다. `delay_ms()`는 [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)의 "2. delay_ms" 절 코드를 쓰고, LED는 PA5에 달려 있다고 둡니다.

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
GPIOA->MODER = (GPIOA->MODER & ~GPIO_MODER_MODER5) | GPIO_MODER_MODER5_0;  // PA5 output

if (get_reset_cause() == RESET_IWDG) {
    while (1) {                 // pass: blink PA5 at 5 Hz
        GPIOA->ODR ^= (1u << 5);
        delay_ms(100);
        iwdg_kick();            // keep this branch alive if the IWDG is running
    }
}

iwdg_init_1sec();
GPIOA->BSRR = (1u << 5);        // LED on
for (int i = 0; i < 5; i++) {   // 5 x 500 ms = 2.5 s with kicks
    delay_ms(500);
    iwdg_kick();
}
GPIOA->BSRR = (1u << 21);       // LED off
while (1) { }                   // no kick: IWDG must reset
```

통과 조건은 다음과 같습니다. LED가 2.5 s 동안 켜져 있다가 꺼지고, 0.681 ~ 1.882 s 뒤 IWDG reset이 나면 5 Hz로 깜빡이기 시작합니다. 깜빡임은 `get_reset_cause()`가 `RESET_IWDG`를 돌려준 분기에서만 나오므로 디버거 없이 판정할 수 있습니다. 실패는 세 가지로 구별됩니다.

- LED가 2.5 s가 되기 전에 꺼짐: 500 ms 간격의 refresh가 LSI max에서의 timeout 0.681 s보다 짧은데도 reset이 났으므로 refresh 경로나 PR·RLR 설정이 틀린 것입니다.
- LED가 꺼진 채 깜빡이지 않음: IWDG가 reset을 내지 않은 것입니다. core는 마지막 `while (1)`에 머물러 있습니다.
- LED가 다시 2.5 s 동안 켜짐: IWDG가 아닌 원인으로 reset된 것입니다.

분기 안에서도 `iwdg_kick()`을 부르는 것은 IWDG가 이 분기에서 돌고 있을 때 깜빡임이 reset으로 끊기지 않게 하기 위해서입니다.

## 자주 보는 함정

> ⚠️ IWDG를 켠 채 Stop/Standby 진입

IWDG는 Stop·Standby에서도 돌기 때문에(RM0090 21.3절 Note), wake-up 주기가 0.681 s보다 길면 잠든 사이에 reset이 납니다. Standby에서는 이 reset이 wake-up 원인이 됩니다. RTC wake-up 주기를 0.681 s보다 짧게 두고 깰 때마다 refresh합니다. wake-up 원인 목록은 [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)에 있습니다.

> ⚠️ window를 넓히려고 W를 내림

window를 넓히려면 W를 *올립니다*. 위 설정(counter 0x7F, /8, PCLK1 42 MHz)에서 window 폭은 counter W ~ 0x40, 즉 (W − 0x3F) step입니다. W = 0x60이면 33 step = 25.75 ms이고, W = 0x70이면 window가 15 step(10.92 ~ 11.70 ms)에 열려 폭이 49 step = 38.23 ms로 넓어집니다. W를 0x50으로 내리면 47 step(35.89 ~ 36.67 ms)에야 열려 폭이 17 step = 13.26 ms로 좁아집니다. refresh 시점의 jitter가 window 폭보다 크면 정상 동작 중에도 reset이 납니다.

## 정리

- 독립 안전망은 IWDG, refresh가 너무 이른 것까지 잡아야 하면 WWDG입니다. 두 워치독 모두 켜면 끌 수 없습니다.
- IWDG timeout은 공칭 32 kHz가 아니라 LSI max(47 kHz)로 계산합니다. 이 글의 설정에서 refresh 간격과 sleep 길이의 상한은 0.681 s입니다.
- breakpoint를 쓰는 debug 빌드는 freeze 비트를 set합니다. 이 비트는 POR에서만 지워집니다.
- reset 원인은 IWDG·WWDG·SW·LPWR → POR → PIN → BOR 순으로 보고, flag가 없으면 `RESET_UNKNOWN`으로 남깁니다.

다음 편은 **Flash 프로그래밍**입니다. erase·program, dual bank, EEPROM emulation을 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
- [4-13: Flash 프로그래밍](/blog/embedded/modern-recipes/part4-13-flash-programming)
- [6-12: RTOS 디버깅](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
- [10-06: 부팅 실패 진단](/blog/embedded/modern-recipes/part10-06-boot-failure)
