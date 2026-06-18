---
title: "저전력 모드 분석 — Sleep·Stop·Standby·Wake-up Source"
date: 2026-04-13T09:45:00
description: "Sleep/Stop/Standby·wake-up source·전류 측정."
series: "Modern Embedded Recipes"
seriesOrder: 45
tags: [recipes, bare-metal, low-power]
draft: false
---

## 한 줄 요약

> **"코어를 꺼두는 시간이 곧 전원 수명입니다."** Sleep → Stop → Standby. 단계마다 µA가 한 자릿수씩 줄어듭니다.

## 어떤 상황에서 쓰나

배터리로 동작하는 IoT sensor, wearable, BLE beacon은 *대부분의 시간 동안 자고 있어야* 합니다. 보드를 풀로 돌리면 30 mA 소비, sleep 모드면 5 mA, stop이면 5 µA, standby면 1 µA. 6,000배 차이가 납니다. CR2032 coin cell(220 mAh)로 active 일주일 vs standby 25년 차이입니다.

이 글은 STM32F4 기준으로 세 저전력 모드와 wake-up source를 정리합니다. 모델마다 low-power run, low-power sleep, shutdown 같은 추가 모드가 있지만 개념은 같습니다.

## 핵심 개념

### 세 가지 저전력 모드

| 모드 | CPU | Peripheral | SRAM | Wake latency | F411 typ |
|------|-----|-----------|------|--------------|----------|
| **Run** | 활성 | 활성 | 활성 | — | 30 mA |
| **Sleep** | 정지 | 활성 | 활성 | < 1 µs | 5 mA |
| **Stop** | 정지 | 정지 (일부 wake) | 활성 | 5-15 µs | 100 µA |
| **Standby** | 정지 | 정지 | 사라짐 (백업 영역만) | 50-200 µs | 1 µA |

- **Sleep**: 코어만 멈춤. 모든 peripheral은 자기 clock으로 동작. UART RX 등으로 즉시 깨움.
- **Stop**: peripheral도 멈추되 SRAM은 유지. RTC, EXTI, IWDG로 wake-up.
- **Standby**: 거의 reset 수준. SRAM 내용 사라짐 (backup register만 유지). 가장 적은 전류.

### Wake-up 메커니즘

**Sleep:**

- 모든 IRQ (NVIC)
- WFI (wait for interrupt) / WFE (wait for event)

**Stop:**

- EXTI line (GPIO edge)
- RTC alarm / wake-up timer
- IWDG
- PVD (power voltage detector)
- Comparator
- 일부 USART (RXNE — STOP 1 only)

**Standby:**

- WKUP pin (PA0 등, datasheet 확인)
- RTC alarm / wake-up
- IWDG
- reset

깰 때 standby는 reset 동작과 유사하므로 Reset_Handler가 다시 호출됩니다. `PWR->CSR`의 SBF bit를 보면 "이게 standby에서 깬 것인지" 알 수 있습니다.

### Duty-cycling 전략

예 — 1 s 주기로 10 ms active (30 mA) + 990 ms Stop (100 µA). active 비중 1 %. 평균 전류 ≈ `30 mA × 10 ms / 1000 ms = 0.3 mA`. 슬립 구간이 길수록 평균이 µA 수준에 가까워집니다.

평균 전류 = (active × active_time + sleep × sleep_time) / period.

## 코드 예제

### 1. Sleep on WFI

```c
void sleep_now(void) {
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;   // sleep mode (not deep)
    __WFI();                              // wait for interrupt
    // wake here
}

while (1) {
    do_work();
    sleep_now();
}
```

가장 간단합니다. SysTick IRQ가 1 ms마다 깨우니까, 더 절약하려면 SysTick을 끄고 더 긴 wake source를 씁니다.

### 2. Stop mode (EXTI wake-up)

```c
void stop_mode_enter(void) {
    PWR->CR |= PWR_CR_LPDS;       // low-power deep sleep regulator
    PWR->CR &= ~PWR_CR_PDDS;      // 0 = Stop (1 = Standby)

    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();

    // === wake ===
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;

    // Stop 깨면 clock이 HSI로 떨어짐 → PLL 재구성
    clock_init_168mhz();
}

void exti0_wake_init(void) {
    EXTI->IMR  |= (1u << 0);
    EXTI->RTSR |= (1u << 0);
    SYSCFG->EXTICR[0] &= ~(0xFu << 0);   // PA0
    NVIC_EnableIRQ(EXTI0_IRQn);
}

void EXTI0_IRQHandler(void) {
    EXTI->PR = (1u << 0);
}
```

중요: Stop에서 깨면 SYSCLK이 HSI 16 MHz로 되돌아갑니다. PLL을 다시 켜야 168 MHz로 복귀합니다.

### 3. Standby + RTC wake-up

RTC는 LSE/LSI로 동작하므로 standby에서도 살아 있습니다.

```c
void standby_with_rtc_wake(uint32_t seconds) {
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_DBP;             // RCC backup domain unlock

    RCC->BDCR |= RCC_BDCR_LSEON;
    while (!(RCC->BDCR & RCC_BDCR_LSERDY));
    RCC->BDCR |= (1u << 8);             // RTC source = LSE
    RCC->BDCR |= RCC_BDCR_RTCEN;

    RTC->WPR = 0xCA; RTC->WPR = 0x53;
    RTC->CR &= ~RTC_CR_WUTE;
    while (!(RTC->ISR & RTC_ISR_WUTWF));
    RTC->WUTR = seconds * 2048 - 1;     // clock = RTC/16 = 2048 Hz
    RTC->CR |= RTC_CR_WUTE | RTC_CR_WUTIE;
    RTC->WPR = 0xFF;

    EXTI->IMR |= (1u << 22);
    EXTI->RTSR |= (1u << 22);

    PWR->CR |= PWR_CR_PDDS | PWR_CR_CWUF;
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();

    // standby에서 깨면 reset과 같음 → 여기 도달 안 함
}
```

깨면 `Reset_Handler`부터 시작합니다. `PWR->CSR & PWR_CSR_SBF`로 "standby wake"인지 확인합니다.

### 4. Unused peripheral power down

active 모드에서도 사용하지 않는 peripheral을 꺼두면 전류가 줄어듭니다.

```c
RCC->AHB1ENR = RCC_AHB1ENR_GPIOAEN;   // 필요한 것만
RCC->APB1ENR = RCC_APB1ENR_USART2EN;
RCC->APB2ENR = 0;

// 미사용 GPIO는 analog 모드로 둠 (Schmitt trigger 차단)
gpio_init(GPIOB, 0, &(gpio_config_t){.mode=GPIO_MODE_ANALOG});
```

## 측정 / 동작 확인

저전력 전류 측정은 µA meter (Joulescope, Nordic Power Profiler Kit II, Qoitech Otii)가 필요합니다. 일반 멀티미터는 µA 분해능이 낮고 측정 자체가 부담입니다.

Joulescope 측정 예 (PPK2도 유사):

| Mode | 전류 @ 3.3V | 비고 |
|------|--------------|------|
| Run mode (loop) | 30.2 mA | |
| `__WFI` sleep (SysTick) | 5.1 mA | SysTick 1 kHz가 깨움 |
| Stop mode (EXTI) | 98 µA | regulator main |
| Stop mode + LPDS | 32 µA | low-power regulator |
| Standby + RTC | 1.8 µA | |

예상보다 안 줄어들면 어떤 peripheral이 살아 있는지 확인합니다. RCC ENR register dump가 빠릅니다.

## 자주 보는 함정

> ⚠️ 미사용 GPIO를 floating

input float 핀이 mid-rail에 떠 있으면 Schmitt trigger가 수십 µA를 흘립니다. 미사용 핀은 pull-down 또는 analog mode.

> ⚠️ SWD pin debug active

stop·standby에서 SWD가 active면 µA 단위가 안 나옵니다. release build는 `DBGMCU->CR`에서 DBG_SLEEP/DBG_STOP/DBG_STANDBY를 clear.

> ⚠️ Stop 후 PLL 재구성 누락

stop에서 깨면 HSI 16 MHz. PLL을 다시 안 켜면 168 MHz가 아니라 16 MHz로 돕니다. 단순히 느린 동작이 아니라 baud rate 등 모든 timing이 깨집니다.

> ⚠️ Sleep 후 SysTick이 다시 깨움

`__WFI()`는 next IRQ까지 자는데 SysTick이 1 kHz면 1 ms마다 깹니다. 진짜 sleep이 필요하면 SysTick disable.

> ⚠️ Wake-up source 누락

EXTI line만 enable하고 NVIC 안 켜면 깰 수가 없습니다. 둘 다 set.

> ⚠️ Brown-out reset이 자주 발생

저전압에서 동작하다가 BOR로 reset이 반복. PVD level을 적절히 설정합니다.

## 정리

- 세 모드: **Sleep (5 mA), Stop (~100 µA), Standby (~1 µA)**. 단계별로 wake source 제한이 다름.
- **Stop에서 깨면 HSI 16 MHz** — PLL 재구성 필수.
- **Standby는 reset과 유사** — SRAM 사라짐, Backup register만 유지.
- 평균 전류는 **duty-cycling**이 좌우. 1% duty면 active/sleep 차이만큼 잘립니다.
- **µA meter** + **미사용 peripheral 차단** + **SWD release**가 측정의 3대 조건.

다음 편은 **워치독**입니다. IWDG/WWDG, multi-task refresh, debug freeze를 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
- [5-14: RTC 활용](/blog/embedded/modern-recipes/part5-14-rtc-utilization)
