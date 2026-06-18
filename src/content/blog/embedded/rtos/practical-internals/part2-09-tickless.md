---
title: "Tickless 모드 구현 — Idle Tick Suppression·Sleep·Wake 보정"
date: 2026-05-05T09:19:00
description: "Idle 시 SysTick 멈춤 + CPU sleep. 다음 task wake 시점까지 동적 timer 설정. 배터리 IoT 핵심."
series: "Practical RTOS Internals"
seriesOrder: 19
tags: [tickless, low-power, suppress-tick, wfi, sleep]
draft: false
---

## 한 줄 요약

> **"Idle일 때 1 kHz tick을 멈추고 CPU를 sleep으로 보냅니다."** 이것이 배터리 IoT 기기를 5년 넘게 동작시키는 비결입니다.

## 문제 — 매 ms마다 깨어납니다

1 kHz tick은 매 ms마다 CPU를 깨웁니다. Sleep current가 µA 단위라 해도 매 ms wake가 누적되면 평균 mA가 됩니다. 결국 배터리는 1주일을 못 갑니다.

```text
@ 1 ms tick:
Active during ISR (~3 µs): 10 mA × 3 µs = 30 nC/ms
Sleep (~1 µA): 1 µA × 997 µs ≈ 1 nC/ms
평균: ~31 µA  (1년 = 270 mAh)
```

**Tickless 모드**는 idle 구간에서 tick을 suppress하고 sleep을 길게 가져갑니다. 그 결과 평균 전류가 수 µA 수준으로 떨어집니다.

## 동작 원리

**1. 모든 task가 Blocked**


**2. Idle task entry**


**3. configUSE_TICKLESS_IDLE 시 portSUPPRESS_TICKS_AND_SLEEP() 호출**


**4. 다음 task wake까지의 tick 수 계산**


**5. SysTick reload value = (wake - now) × cycles/tick**


**6. WFI (Wait For Interrupt) → CPU sleep**


**7. Interrupt 발생 → wake**


**8. 실제 경과 tick 보충 (vTaskStepTick)**


**9. Idle 다시**

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

기본 WFI는 Run mode WFI에 해당합니다. 더 깊은 sleep으로 들어가려면 추가 코드가 필요합니다.

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

WFI 이후에는 반드시 깨워 줄 source가 있어야 합니다. 그렇지 않으면 시스템이 영원히 sleep에 머무릅니다.

- SysTick (active한 경우)
- RTC alarm
- EXTI (GPIO IRQ, 버튼 등)
- UART RX
- Watchdog (timeout 시 reset)

배터리 IoT의 전형적인 패턴은 다음과 같습니다.

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

다른 모든 task가 Blocked 상태로 떨어지면 idle task가 tickless 경로로 들어가 약 59초 동안 sleep합니다. 매분 깨어났을 때 0.1초만 active하면 duty cycle은 0.17%에 불과합니다.

## RTC alarm 활용

SysTick은 system clock에 의존하기 때문에 Stop mode에서는 멈춰 버립니다. 반면 RTC는 별도의 LSE crystal (32 kHz)로 동작하여 Stop·Standby 구간에서도 살아 있습니다.

```c
// 다음 wake 시점을 RTC alarm으로
RTC_AlarmTypeDef alarm;
alarm.AlarmTime.Hours = ...;
alarm.AlarmTime.Minutes = ...;
HAL_RTC_SetAlarm_IT(&hrtc, &alarm, RTC_FORMAT_BIN);

/* Standby 진입 */
HAL_PWR_EnterSTANDBYMode();
```

Standby는 wake 시 full reset이 일어나는 모드입니다. context가 모두 사라지고 `main()`부터 다시 시작합니다.

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

Zephyr는 idle 시간을 예측해 적절한 power state를 자동 선택합니다. FreeRTOS보다 한층 정교한 방식입니다.

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

LPM3는 TI MSP430·CC2640 계열에서 수 µA 수준으로 동작합니다. 임베디드 wireless IoT의 사실상 표준이라 할 수 있습니다.

## 측정 — Current Profiler

| 도구 | 가격 | 정밀도 |
| --- | --- | --- |
| **Otii Arc** | $1k | 0.1 nA |
| **Nordic Power Profiler Kit II** | $80 | 100 nA |
| **JouleScope** | $500 | 1 nA |
| Oscilloscope + shunt | (자체) | 노이즈 영향 |

Active 구간과 sleep 구간의 current를 시간 분포로 측정하면 battery life를 정확히 예측할 수 있습니다.

## 자주 하는 실수

> ⚠️ Tickless를 활성화한 뒤 driver를 손보지 않습니다

UART·SPI driver는 system clock에 의존합니다. Stop mode에서 깨어났을 때 재초기화를 하지 않으면 데이터가 그대로 사라집니다.

> ⚠️ Wake source가 부족합니다

WFI 이후 깨워 줄 IRQ가 없으면 시스템은 영원히 sleep에 빠집니다. 안전을 위해 RTC alarm을 백업으로 두는 편이 좋습니다.

> ⚠️ Stop mode 이후 `SystemClock_Config`를 호출하지 않습니다

Stop에서 빠져나오면 HSI로 시작합니다. HSE·PLL은 꺼진 상태이므로 명시적으로 다시 설정해야 합니다.

> ⚠️ Idle threshold가 너무 작습니다

`configEXPECTED_IDLE_TIME_BEFORE_SLEEP = 2`는 2 tick 미만의 짧은 idle에서는 sleep으로 들어가지 않도록 합니다. 진입·복귀 overhead를 회피하기 위한 설정입니다.

## 정리

- Tickless의 핵심은 idle 구간에서 SysTick을 멈추고 WFI를 사용하는 것입니다.
- Power mode는 Sleep, Stop, Standby로 이어지며 µA에서 nA 단위까지 내려갑니다.
- Stop·Standby에서 쓸 수 있는 유일한 wake source는 사실상 RTC alarm입니다.
- `configPRE_SLEEP_PROCESSING`와 `configPOST_SLEEP_PROCESSING`에서 clock을 다시 설정해야 합니다.
- 배터리 IoT의 5년 이상 동작은 tickless, deep sleep, duty cycle을 결합해야 가능합니다.

다음 편은 Part 2의 마지막인 **Scheduler Latency 측정**입니다.

## 관련 항목

- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [1-04: Preemption (tickless 도입)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
