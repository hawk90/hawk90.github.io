---
title: "8-11: 전력 최적화"
date: 2026-05-16T03:00:00
description: "Active와 sleep, peripheral clock gating, DVFS, tickless idle, µA-level 측정까지 임베디드 전력 절감 기법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 99
tags: [recipes, performance, power]
---

## 한 줄 요약

> **"전력은 *얼마나 빨리 sleep으로 가느냐*가 90%를 결정합니다."** 다음 90%는 어떤 sleep mode를 고르고 어떤 peripheral을 꺼두느냐입니다.

## 어떤 상황에서 쓰나

배터리 IoT device, BLE beacon, sensor logger처럼 *전원 빠진 후 수년*을 돌아야 하는 펌웨어가 전형적입니다. CR2032 한 알(220 mAh)로 1년을 가게 하려면 평균 전류가 25 µA 이하여야 합니다. Active에서 5 mA를 쓰는 MCU가 99% 시간을 sleep으로 보내면 평균이 50 µA가 됩니다.

또 한 가지 상황은 자동차나 산업 device의 ECO 모드입니다. 전체 시간의 작은 부분만 active를 유지하면 thermal 설계가 단순해집니다.

## 핵심 개념

```text
power 소비 = V × I = V × (I_active × t_active + I_sleep × t_sleep) / t_total

핵심은 두 가지
- t_sleep을 최대화
- I_sleep을 최소화
```

대표 ARM Cortex-M sleep 단계입니다.

```text
mode              CPU clock  RAM 유지   peripheral   wake latency  대표 전류
run               on         all        all          0             5~30 mA
sleep             off        all        all          ~1 µs         1~10 mA
stop / standby    off        partial    선택         10~100 µs     10~100 µA
deep sleep        off        none       RTC만        ms            <1 µA
```

각 칩별 mode는 datasheet의 "Power modes" 표가 가장 정확합니다.

```text
peripheral clock gating
  쓰지 않는 SPI/I2C/UART의 clock을 꺼서 µA 단위 절약
DVFS
  동적으로 voltage와 frequency를 낮춰 active power 절감
tickless idle
  RTOS tick interrupt를 멈춰 sleep 시간을 늘림
```

## 코드 / 실제 사용 예

### WFI 한 줄로 시작

```c
int main(void) {
    hw_init();
    while (1) {
        process_events();
        __WFI();      /* Wait For Interrupt — CPU clock 멈춤 */
    }
}
```

WFI 한 줄만으로도 active 5 mA에서 sleep 1~2 mA로 떨어집니다. Idle hook에서 항상 호출합니다.

### Stop mode (STM32 예시)

```c
void enter_stop(void) {
    PWR->CR1 |= PWR_CR1_LPMS_STOP1;
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;
}
```

STM32 stop mode는 모든 clock을 끄고 RAM은 유지합니다. 깨어날 source(EXTI, RTC alarm)만 활성으로 두면 100 µA 이하로 떨어집니다.

### Standby mode (가장 깊은 sleep)

```c
void enter_standby(void) {
    PWR->CR1 |= PWR_CR1_LPMS_STANDBY;
    PWR->SCR |= PWR_SCR_CWUF1;
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();
    /* RAM 잃음 — RTC backup register에 state 저장 */
}
```

Standby는 reset과 비슷한 비용으로 깨어나지만 µA 수준 전력을 달성합니다. backup register에 wake-up 시 필요한 state만 미리 저장합니다.

### Peripheral clock gating

```c
/* 안 쓰는 peripheral의 clock을 끔 */
RCC->APB1ENR &= ~(RCC_APB1ENR_USART2EN | RCC_APB1ENR_SPI3EN);
RCC->APB2ENR &= ~RCC_APB2ENR_ADC1EN;

/* 사용 직전에 다시 켬 */
RCC->APB1ENR |= RCC_APB1ENR_USART2EN;
USART2->BRR = 0x683;
USART2->CR1 = USART_CR1_UE | USART_CR1_TE;
```

쓰지 않는 peripheral 한 개당 보통 수십 µA씩 줄어듭니다. 부팅 시 모두 끄고 사용 직전에 켜는 패턴이 표준입니다.

### Tickless idle (FreeRTOS)

```c
/* FreeRTOSConfig.h */
#define configUSE_TICKLESS_IDLE                 1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP   2
#define configPRE_SLEEP_PROCESSING(x)           hw_prepare_sleep(&(x))
#define configPOST_SLEEP_PROCESSING(x)          hw_resume(x)

void hw_prepare_sleep(uint32_t *xExpectedIdleTime) {
    /* RTC alarm을 *xExpectedIdleTime ms 후로 설정 */
    setup_rtc_wakeup(*xExpectedIdleTime);
    SystemClock_Slow();          /* 8 MHz로 떨어뜨림 */
}

void hw_resume(uint32_t actual_sleep_ms) {
    SystemClock_Fast();           /* 80 MHz로 복귀 */
    vTaskStepTick(actual_sleep_ms);
}
```

ms 단위로 sleep할 수 있을 때 tick interrupt를 끄고 RTC alarm으로 깨우면 평균 전류가 mA에서 µA로 떨어집니다.

### DVFS

```c
/* CPU가 한가할 때 frequency를 낮춤 */
void cpu_set_freq(int mhz) {
    if (mhz <= 8) {
        switch_to_msi();              /* MSI 8 MHz */
        voltage_scale(VOLTAGE_RANGE_2); /* 1.0 V */
    } else {
        switch_to_pll();              /* PLL 80 MHz */
        voltage_scale(VOLTAGE_RANGE_1); /* 1.2 V */
    }
}
```

전력은 P = C × V² × f이므로 voltage 0.83x + frequency 0.1x이면 전력이 약 7%로 떨어집니다.

### µA-level 측정

```text
도구             특징
multimeter      mA 이상만 정확, µA는 noise floor에 묻힘
shunt + scope   shunt 저항 + oscilloscope, profile 가능
Otii Arc / EEM  µA부터 mA까지, profile + sync trigger
Power Profiler Kit (Nordic) µA부터 mA, BLE 친화
```

µA 단위 측정은 multimeter로는 불가능합니다. 전용 power profiler가 필요합니다.

### Pin float 방지

```c
/* unused GPIO는 input + pull-down 또는 push-pull output low로 */
configure_unused_pins_to_pulldown();
```

floating input은 noise로 input buffer가 진동해 µA가 새어 나옵니다. 모든 GPIO는 명시적 상태로 설정합니다.

## 측정 / 성능 비교

대표 BLE sensor의 평균 전류 측정값입니다.

```text
시나리오                          평균 전류        배터리(CR2032) 수명
WFI 없이 run loop                 5 mA            ~44 시간
WFI in idle                       1.2 mA          ~180 시간
+ peripheral clock gating         800 µA          ~11 일
+ stop mode (1초마다 wake)        80 µA           ~115 일
+ tickless idle + RTC wake-up     8 µA            ~3 년
```

각 단계가 *한 자릿수씩* 개선됩니다. 누적이 중요합니다.

```text
DVFS 효과
80 MHz, 1.2 V                    5 mA
8 MHz, 1.0 V                     400 µA
```

clock과 voltage를 함께 낮추는 것이 핵심입니다.

## 자주 보는 함정

> Idle hook 없이 busy loop

```c
while (1) { do_things(); }    /* WFI 없음 */
```

idle hook에 WFI 한 줄이 mA 단위 차이를 만듭니다. 항상 켭니다.

> Peripheral clock을 모두 켜둠

```c
RCC->APB1ENR = 0xFFFFFFFF;    /* 다 켜져 있음 */
```

부팅 시 모두 끄고 driver init 시 켭니다. 사용 안 한 채로 켜져 있으면 µA가 새어 나옵니다.

> Wake-up source 너무 많음

```c
EXTI->IMR1 = 0xFFFFFFFF;    /* 모든 EXTI 활성 */
```

active state로 wake가 너무 자주 일어나면 sleep 효과가 사라집니다. 정말 필요한 line만 활성으로 둡니다.

> Stop mode 후 clock 미복원

```c
enter_stop();
USART2->DR = 'X';     /* 그러나 USART clock이 아직 reset 상태 */
```

stop mode에서 깨어나면 일부 clock이 default로 돌아가 있습니다. 깨어난 직후 system clock과 peripheral clock을 재설정합니다.

> µA를 multimeter로 측정

```text
DMM 0.1 µA 단위 → noise로 결과 부정확
```

전용 power profiler를 사용해야 µA 정밀도가 나옵니다.

## 정리

- 전력 절감의 핵심은 sleep 시간을 최대화하는 것입니다.
- WFI 한 줄만으로도 mA 단위가 줄어듭니다.
- Stop mode와 standby mode는 µA 수준 전력을 달성합니다.
- Peripheral clock gating은 µA 단위 누적 효과가 큽니다.
- Tickless idle은 RTOS 환경의 표준 절전입니다.
- DVFS로 active 전력 자체를 줄일 수 있습니다.
- 측정은 multimeter가 아닌 전용 power profiler로 합니다.
- 부팅 시 모든 unused peripheral과 floating pin을 명시적으로 처리합니다.

다음 편은 **WCET 분석**입니다. Worst-case execution time과 cache 영향을 다룹니다.

## 관련 항목

- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-03: Scheduler 동작 이해](/blog/embedded/modern-recipes/part6-03-scheduler-internals)
- [8-10: 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
- [8-12: WCET 분석](/blog/embedded/modern-recipes/part8-12-wcet-analysis)
- [PE 3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
