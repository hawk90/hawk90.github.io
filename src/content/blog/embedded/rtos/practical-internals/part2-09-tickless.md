---
title: "2-09: Tickless 모드 구현 — Idle 시 Tick Suppression, Sleep, Wake 보정"
date: 2026-05-12T19:00:00
description: "Idle 시 SysTick 멈춤 + CPU sleep. 다음 task wake 시점까지 동적 timer 설정. 배터리 IoT 핵심."
series: "Practical RTOS Internals"
seriesOrder: 19
tags: [tickless, low-power, suppress-tick, wfi, sleep]
draft: true
---

## 한 줄 요약

> **"Idle 시 1 kHz tick 멈춤 → CPU sleep"** — 배터리 IoT가 5+년 동작하는 비결.

## 문제 — 매 ms 깨어남

1 kHz tick = 매 ms CPU wake. Sleep current가 µA여도 *매 ms wake → 평균 mA*. 배터리 1주일.

```text
@ 1 ms tick:
Active during ISR (~3 µs): 10 mA × 3 µs = 30 nC/ms
Sleep (~1 µA): 1 µA × 997 µs ≈ 1 nC/ms
평균: ~31 µA  (1년 = 270 mAh)
```

**Tickless** = idle 시 tick *suppress* + sleep 길게 → 평균 *수 µA*.

## 동작 원리

```text
1. 모든 task가 Blocked
2. Idle task entry
3. configUSE_TICKLESS_IDLE 시 portSUPPRESS_TICKS_AND_SLEEP() 호출
4. 다음 task wake까지의 tick 수 계산
5. SysTick reload value = (wake - now) × cycles/tick
6. WFI (Wait For Interrupt) → CPU sleep
7. Interrupt 발생 → wake
8. 실제 경과 tick 보충 (vTaskStepTick)
9. Idle 다시
```

## FreeRTOS Tickless 구현

```c
#define configUSE_TICKLESS_IDLE                 1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP   2

void vPortSuppressTicksAndSleep(TickType_t xExpectedIdleTime) {
    uint32_t ulReloadValue, ulCompletedSysTickDecrements;
    TickType_t xModifiableIdleTime;
    
    /* SysTick 멈춤 */
    portNVIC_SYSTICK_CTRL_REG &= ~portNVIC_SYSTICK_ENABLE_BIT;
    
    /* IRQ disable — atomic check */
    __disable_irq();
    __dsb(portSY_FULL_READ_WRITE);
    __isb(portSY_FULL_READ_WRITE);
    
    if (eTaskConfirmSleepModeStatus() == eAbortSleep) {
        /* 마지막에 ready task 생김 — abort */
        portNVIC_SYSTICK_CTRL_REG |= portNVIC_SYSTICK_ENABLE_BIT;
        __enable_irq();
        return;
    }
    
    /* 다음 wake까지 SysTick reload */
    ulReloadValue = portNVIC_SYSTICK_CURRENT_VALUE_REG +
                    (ulTimerCountsForOneTick * (xExpectedIdleTime - 1UL));
    portNVIC_SYSTICK_LOAD_REG = ulReloadValue;
    portNVIC_SYSTICK_CURRENT_VALUE_REG = 0UL;
    portNVIC_SYSTICK_CTRL_REG |= portNVIC_SYSTICK_ENABLE_BIT;
    
    /* Sleep — WFI */
    xModifiableIdleTime = xExpectedIdleTime;
    configPRE_SLEEP_PROCESSING(xModifiableIdleTime);
    if (xModifiableIdleTime > 0) {
        __dsb(portSY_FULL_READ_WRITE);
        __wfi();
        __isb(portSY_FULL_READ_WRITE);
    }
    configPOST_SLEEP_PROCESSING(xExpectedIdleTime);
    
    /* SysTick 다시 default reload */
    portNVIC_SYSTICK_CTRL_REG &= ~portNVIC_SYSTICK_ENABLE_BIT;
    portNVIC_SYSTICK_LOAD_REG = ulTimerCountsForOneTick - 1UL;
    
    /* 실제 경과 tick 보충 */
    if (/* SysTick interrupt가 trigger 됐다면 */) {
        ulCompletedSysTickDecrements = (xExpectedIdleTime * ulTimerCountsForOneTick) -
                                         portNVIC_SYSTICK_CURRENT_VALUE_REG;
        ulCompleteTickPeriods = ulCompletedSysTickDecrements / ulTimerCountsForOneTick;
    } else {
        /* 다른 IRQ로 깨어남 */
        ulCompleteTickPeriods = /* 계산 */;
    }
    vTaskStepTick(ulCompleteTickPeriods);
    
    portNVIC_SYSTICK_CURRENT_VALUE_REG = 0UL;
    portNVIC_SYSTICK_CTRL_REG |= portNVIC_SYSTICK_ENABLE_BIT;
    __enable_irq();
}
```

## Power Modes — Cortex-M

| Mode | Current | Wake source | Latency |
| --- | --- | --- | --- |
| **Run** | 30-100 mA | (활성) | 0 |
| **Sleep** (WFI) | 5-20 mA | 모든 IRQ | 1-5 µs |
| **Stop** | 100-500 µA | EXTI·RTC | 5-20 µs |
| **Standby** | 1-5 µA | RTC·WKUP pin | 100+ µs (full reset) |

WFI = *Run mode WFI*. *Deeper sleep*은 추가 코드:

```c
void configPRE_SLEEP_PROCESSING(TickType_t xExpectedIdleTime) {
    /* Switch clocks to low power */
    HAL_SuspendTick();
    
    /* Stop mode 진입 */
    HAL_PWR_EnterSTOPMode(PWR_LOWPOWERREGULATOR_ON, PWR_STOPENTRY_WFI);
}

void configPOST_SLEEP_PROCESSING(TickType_t xExpectedIdleTime) {
    /* Stop mode에서 깨어남 — clock 재설정 */
    SystemClock_Config();   // PLL 등 재시작
    HAL_ResumeTick();
}
```

## Wake Source 보장

**WFI 후 깨울 source가 있어야** → 안 그러면 영원히 sleep.

- SysTick (active면)
- RTC alarm
- EXTI (GPIO IRQ — 버튼 등)
- UART RX
- Watchdog (timeout 시 reset)

배터리 IoT 패턴:

```c
// Main task — 매 분 wake
void sensor_task(void *arg) {
    while (1) {
        read_sensor();
        send_radio();
        vTaskDelay(pdMS_TO_TICKS(60000));   // 1분 — tickless OK
    }
}
```

다른 모든 task가 Blocked → idle → tickless → *59초 sleep*. 매분 wake 시 0.1초 active = **0.17% duty cycle**.

## RTC alarm 활용

SysTick은 *system clock 의존* → Stop mode에선 정지. **RTC**가 *별도 LSE crystal (32 kHz)*로 *Stop·Standby 중에도 동작*.

```c
// 다음 wake 시점을 RTC alarm으로
RTC_AlarmTypeDef alarm;
alarm.AlarmTime.Hours = ...;
alarm.AlarmTime.Minutes = ...;
HAL_RTC_SetAlarm_IT(&hrtc, &alarm, RTC_FORMAT_BIN);

/* Standby 진입 */
HAL_PWR_EnterSTANDBYMode();
```

**Standby = full reset on wake** — context 손실. Main()부터 다시 시작.

## Zephyr Power Management

```c
// devicetree
power-states {
    state0: state0 {
        compatible = "zephyr,power-state";
        power-state-name = "suspend-to-idle";
        min-residency-us = <100>;
    };
    state1: state1 {
        compatible = "zephyr,power-state";
        power-state-name = "standby";
        min-residency-us = <100000>;
        exit-latency-us = <300>;
    };
};
```

Zephyr가 *idle 시간 예측 → 적절한 power state 선택*. 더 정교.

## TI ULP — Ultra Low Power 패턴

```c
void main(void) {
    init();
    while (1) {
        do_minimal_work();
        WDT_kick();
        __low_power_mode_3();   // LPM3
    }
}
```

LPM3 (TI MSP430·CC2640 등) — *수 µA*. 임베디드 wireless IoT의 표준.

## 측정 — Current Profiler

| 도구 | 가격 | 정밀도 |
| --- | --- | --- |
| **Otii Arc** | $1k | 0.1 nA |
| **Nordic Power Profiler Kit II** | $80 | 100 nA |
| **JouleScope** | $500 | 1 nA |
| Oscilloscope + shunt | (자체) | 노이즈 영향 |

Active vs sleep current를 *시간 분포*로 측정 → battery life 예측.

## 자주 하는 실수

> ⚠️ Tickless enable 후 driver 미수정

UART·SPI driver가 *system clock 의존* → Stop mode에서 깨어났을 때 *재초기화* 안 함 → 데이터 손실.

> ⚠️ Wake source 부족

WFI 후 깨울 IRQ 없음 → 영원히 sleep. 항상 *RTC alarm 백업*.

> ⚠️ Stop mode 후 SystemClock_Config 호출 안 함

Stop 후엔 *HSI*로 시작 (HSE·PLL 꺼짐). 명시적 reconfig.

> ⚠️ Idle threshold 너무 작음

`configEXPECTED_IDLE_TIME_BEFORE_SLEEP = 2` — 2 tick 미만 idle은 *sleep 안 함*. Overhead 회피.

## 정리

- Tickless = **idle 시 SysTick 멈춤 + WFI**.
- Mode — Sleep·Stop·Standby (각각 µA → nA 단위).
- **RTC alarm**이 Stop·Standby의 wake source.
- `configPRE_SLEEP_PROCESSING`·`POST_SLEEP_PROCESSING`로 *clock 재설정*.
- 배터리 IoT의 *5+년 동작*은 tickless + deep sleep + duty cycle 결합.

다음 편 (Part 2 마지막) — **Scheduler Latency 측정**.

## 관련 항목

- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [1-04: Preemption (tickless 도입)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
