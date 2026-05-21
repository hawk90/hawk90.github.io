---
title: "Ch 11: Low Power Support"
date: 2026-05-09T11:00:00
description: "tickless idle·sleep modes — RTOS에서 전력 소비 줄이기."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 11
tags: [freertos, low-power, tickless, sleep]
draft: false
---

## 한 줄 요약

> **"Tickless idle은 *idle 진입 시 tick 인터럽트를 끄고* MCU를 sleep으로 보낸 뒤, *다음 깰 태스크의 deadline까지 자도록* 하는 메커니즘입니다. `configUSE_TICKLESS_IDLE`을 켜고 `portSUPPRESS_TICKS_AND_SLEEP` 매크로로 *RTC·LPTIM 같은 저전력 타이머와 MCU sleep mode를 연결*하면, RTOS를 켠 채로도 평균 전류를 *수 µA*까지 끌어내릴 수 있습니다."**

RTOS의 기본 idle은 *tick마다 깨어나기 때문에* sleep을 진입해도 *1 kHz로 wake-up*이 반복됩니다. 결과적으로 sleep이 *수백 µs 단위*로 잘게 쪼개져서 평균 전류가 거의 떨어지지 않습니다. Tickless idle은 *예상 idle 기간 전체*를 한 번에 자고, *그 동안 흐른 시간을 보정*하는 기법으로 이 한계를 풉니다. 이번 장에서는 활성화 방법, 표준 hook, 그리고 STM32 STOP / NRF52 SoftDevice 환경에서의 실전을 다룹니다.

## configUSE_TICKLESS_IDLE — 1 vs 2

```c
/* FreeRTOSConfig.h */
#define configUSE_TICKLESS_IDLE      1   /* 기본 ARM Cortex-M port 구현 */
/* 또는 */
#define configUSE_TICKLESS_IDLE      2   /* 사용자 정의 (vPortSuppressTicksAndSleep 직접 구현) */
```

| 값 | 동작 |
|---|------|
| 0 | tickless 비활성. tick마다 깨어남. |
| 1 | port에서 제공하는 *기본 구현* 사용. SysTick 정지 + `__WFI`. |
| 2 | `vPortSuppressTicksAndSleep`을 *사용자가 작성*. 특수 LPTIM/RTC와 deep sleep을 직접 다룸. |

값 1은 *SysTick에 의존*하기 때문에, sleep 진입 시 *SysTick clock이 꺼지는 STOP/STANDBY 모드는 불가*합니다. 진짜 µA 영역까지 가려면 *값 2*로 가서 *LPTIM·RTC 같은 wake-up 타이머*를 직접 다뤄야 합니다.

## portSUPPRESS_TICKS_AND_SLEEP — 흐름

Idle 태스크가 *남은 idle 시간이 충분*하면 (`configEXPECTED_IDLE_TIME_BEFORE_SLEEP` 이상) 다음 매크로를 호출합니다.

```c
#define portSUPPRESS_TICKS_AND_SLEEP(xExpectedIdleTime) \
    vPortSuppressTicksAndSleep(xExpectedIdleTime)
```

`xExpectedIdleTime`은 *tick 단위의 예상 sleep 기간*입니다. 사용자 구현은 다음 순서로 진행합니다.

**1. tick 인터럽트 정지 (SysTick disable)**


**2. wake-up 타이머 설정 (LPTIM/RTC → xExpectedIdleTime tick 후 인터럽트)**


**3. interrupt 마스킹 — eTaskConfirmSleepModeStatus()로 sleep OK인지 확인**


**4. WFI / 또는 deep sleep 진입 (HAL_PWR_EnterSTOPMode 등)**


**5. ─── wake ───**


**6. 실제로 잔 시간 측정 (wake-up 타이머 카운터 읽기)**


**7. vTaskStepTick(actual_ticks)로 RTOS tick 보정**


**8. tick 인터럽트 재개**

## 기본 구현 — Cortex-M default

`configUSE_TICKLESS_IDLE=1`이면 FreeRTOSConfig는 port가 제공하는 `vPortSuppressTicksAndSleep`을 그대로 씁니다. 핵심 부분만 보면 다음과 같습니다.

```c
/* ports/GCC/ARM_CM4F/port.c (요약) */
void vPortSuppressTicksAndSleep(TickType_t xExpectedIdleTime)
{
    /* SysTick 다음 reload 값을 expectedIdle * cyclesPerTick으로 */
    portNVIC_SYSTICK_LOAD_REG = ulReloadValue - portNVIC_SYSTICK_CURRENT_VALUE_REG;
    portNVIC_SYSTICK_CTRL_REG = portNVIC_SYSTICK_ENABLE_BIT
                              | portNVIC_SYSTICK_CLK_BIT;

    __disable_irq();
    __dsb(portSY_FULL_READ_WRITE);
    __isb(portSY_FULL_READ_WRITE);

    if (eTaskConfirmSleepModeStatus() == eAbortSleep) {
        /* sleep 직전에 이벤트 도착 — 취소 */
    } else {
        __wfi();   /* sleep */
        __isb(portSY_FULL_READ_WRITE);
    }

    __enable_irq();
    __dsb(portSY_FULL_READ_WRITE);

    /* 실제 흐른 tick 보정 */
    vTaskStepTick(ulCompleteTickPeriods);
}
```

이 구현은 `__WFI`만 부르므로 *Cortex-M sleep mode*입니다. *core clock은 정지*되지만 *peripheral clock과 SysTick은 살아 있어서* deep sleep까지는 못 갑니다.

## STM32 STOP 모드 — RTC wakeup

STM32L4·STM32U5에서 *진짜 deep sleep*은 *STOP mode*입니다. SysTick이 꺼지므로 *LPTIM/RTC wake-up*과 연동해야 합니다.

```c
/* FreeRTOSConfig.h */
#define configUSE_TICKLESS_IDLE                 2
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP   10
#define configPRE_SLEEP_PROCESSING(t)           pre_sleep(&(t))
#define configPOST_SLEEP_PROCESSING(t)          post_sleep(t)

/* main.c */
static void pre_sleep(TickType_t *xExpectedIdleTime)
{
    /* 1. peripheral 비활성 (UART CLK 끄기 등) */
    HAL_UART_DeInit(&huart2);

    /* 2. wake-up RTC 설정 — xExpectedIdleTime tick 후 ALARM */
    uint32_t wake_seconds = (*xExpectedIdleTime) / configTICK_RATE_HZ;
    if (wake_seconds == 0) { *xExpectedIdleTime = 0; return; }
    HAL_RTCEx_SetWakeUpTimer_IT(&hrtc, wake_seconds * 2048,
                                 RTC_WAKEUPCLOCK_RTCCLK_DIV16);
}

static void post_sleep(TickType_t xExpectedIdleTime)
{
    /* clock/peripheral 복구 */
    SystemClock_Config();
    HAL_UART_Init(&huart2);
    HAL_RTCEx_DeactivateWakeUpTimer(&hrtc);
}

void vPortSuppressTicksAndSleep(TickType_t xExpectedIdleTime)
{
    __disable_irq();
    if (eTaskConfirmSleepModeStatus() == eAbortSleep) {
        __enable_irq(); return;
    }

    pre_sleep(&xExpectedIdleTime);
    if (xExpectedIdleTime == 0) {
        post_sleep(xExpectedIdleTime);
        __enable_irq(); return;
    }

    /* STOP 진입 */
    HAL_PWR_EnterSTOPMode(PWR_LOWPOWERREGULATOR_ON, PWR_STOPENTRY_WFI);

    /* wake — 실제 흐른 시간 = wake-up timer 카운터 */
    uint32_t elapsed_ticks = read_rtc_elapsed_ticks();
    post_sleep(xExpectedIdleTime);
    __enable_irq();

    vTaskStepTick(elapsed_ticks);
}
```

이 구조로 STM32L4가 *평균 2~3 µA*까지 떨어집니다. 5초 sleep 후 50 ms 작업하는 패턴이면 *평균 ≈ 3 µA + (5 mA × 50 ms / 5050 ms) ≈ 53 µA*가 됩니다.

## NRF52 + SoftDevice

Nordic nRF52에서는 *SoftDevice*가 sleep을 관리합니다. 사용자 코드가 직접 STOP을 호출하면 BLE 스택이 깨집니다. 대신 `sd_app_evt_wait()`을 부르고 SoftDevice가 *내부적으로 RTC + WFE*로 자고 깨어나는 흐름입니다.

```c
/* tickless 구현 */
void vPortSuppressTicksAndSleep(TickType_t xExpectedIdleTime)
{
    __disable_irq();
    if (eTaskConfirmSleepModeStatus() == eAbortSleep) {
        __enable_irq(); return;
    }

    /* SoftDevice가 RTC0를 점유 — RTC1로 wake-up 설정 */
    uint32_t ticks_to_wake = xExpectedIdleTime;
    nrf_rtc_cc_set(NRF_RTC1, 0, nrf_rtc_counter_get(NRF_RTC1) + ticks_to_wake);
    nrf_rtc_int_enable(NRF_RTC1, NRF_RTC_INT_COMPARE0_MASK);

    __enable_irq();
    sd_app_evt_wait();   /* SoftDevice가 안전하게 sleep 진입 */

    nrf_rtc_int_disable(NRF_RTC1, NRF_RTC_INT_COMPARE0_MASK);
    uint32_t elapsed = read_rtc1_elapsed();
    vTaskStepTick(elapsed);
}
```

nRF52840은 *System ON sleep*에서 *1.5 µA*, *System OFF*에서 *0.4 µA*까지 갑니다. BLE 광고 1초 주기로 동작 중인 펌웨어가 평균 *5~10 µA*면 양호한 수준입니다.

## eTaskConfirmSleepModeStatus

Sleep 진입 직전에 *큐·세마포·타이머 이벤트가 막 도착*했을 가능성을 검사합니다.

```c
eSleepModeStatus eTaskConfirmSleepModeStatus(void);

eAbortSleep      /* sleep 취소 — pending이 있음 */
eStandardSleep   /* light sleep 가능 */
eNoTasksWaitingTimeout  /* deep sleep 가능 (어떤 태스크도 timeout 대기 안 함) */
```

`eNoTasksWaitingTimeout`이면 *RTOS tick을 영원히 멈춰도* 안전하므로 *standby/shipping mode* 같은 *극저전력 모드*에 진입할 수 있습니다.

## 자주 하는 실수 — missed tick

```text
[정상]                                  [버그]
sleep 5000 ms 후 wake                  sleep 5000 ms 후 wake
elapsed = 5000 tick                    elapsed = 1 tick (보정 누락)
vTaskStepTick(5000)                    vTaskStepTick(1)
RTOS 시각 +5000                        RTOS 시각 +1 (4999 tick 손실)
                                        → 모든 timeout이 99% 짧아짐
```

`vTaskStepTick`에 *실제 흐른 tick 수*를 넣지 않으면 RTOS의 *내부 시각*이 잘못 흘러서 모든 timeout이 깨집니다. RTC counter 차이를 *정확히 tick 단위로 변환*해서 넘기는 것이 핵심입니다.

```c
/* RTC가 32768 Hz, tick = 1 ms 라면 */
uint32_t elapsed_ticks = (rtc_cnt_after - rtc_cnt_before) * 1000U / 32768U;
vTaskStepTick(elapsed_ticks);
```

## Peripheral suspend — pre/post hook

Sleep 직전에 *UART/SPI/I2C clock*을 끄지 않으면 *주변 회로가 µA를 끌어가서* MCU만 µA로 떨어져도 *전체 시스템은 mA 단위*에 머뭅니다.

```c
static void pre_sleep(TickType_t *t)
{
    /* GPIO를 analog input(NoPull)로 — leakage 차단 */
    HAL_GPIO_DeInit(GPIOA, GPIO_PIN_ALL);
    /* peripheral disable */
    __HAL_RCC_USART2_CLK_DISABLE();
    __HAL_RCC_SPI1_CLK_DISABLE();
    __HAL_RCC_I2C1_CLK_DISABLE();
}

static void post_sleep(TickType_t t)
{
    /* 복구 — clock 먼저, 그 다음 peripheral init */
    __HAL_RCC_USART2_CLK_ENABLE();
    HAL_UART_Init(&huart2);
    /* ... */
}
```

floating GPIO 한 핀이 *수 µA*를 끌 수 있어서, 모든 *미사용 핀을 analog input + no pull*로 두는 것이 정석입니다.

## 측정 — Power Profiler

이론치는 *실측 전*까지는 *가정*에 가깝습니다. *Nordic PPK II, Joulescope, Otii* 같은 µA-급 측정기로 *실제 평균 전류*를 확인합니다.

**PPK II 측정 — 1 s 광고 BLE peripheral**:

- 광고 burst ~3 ms 동안 약 **5 mA**
- 그 외 STOP 구간 (~997 ms) 동안 약 **3 µA**
- 평균 ≈ `(5 mA × 3 ms + 3 µA × 997 ms) / 1000 ms ≈ 18 µA`

코드 변경 한 줄이 평균에 어떻게 영향하는지 *PPK 화면으로 즉시 보면서* 튜닝하는 것이 가장 빠릅니다.

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| sleep 진입 후 wake 안 함 | wake-up source 미설정 | LPTIM/RTC interrupt 활성 |
| RTOS 시각이 점점 어긋남 | vTaskStepTick 인자 잘못 | 실측 tick 수로 보정 |
| deep sleep 후 SysTick reload 깨짐 | reload 값 보존 누락 | pre-sleep에 저장 |
| UART 출력이 뚝뚝 끊김 | peripheral suspend 후 미복구 | post-sleep에 init 다시 |
| GPIO에서 누설 mA | floating GPIO | analog + nopull |
| SoftDevice 펌웨어가 lockup | sd_app_evt_wait 미사용 | SD 환경에선 SD API 사용 |
| configEXPECTED_IDLE_TIME 너무 작음 | 매번 sleep 비용 > 절감 | 4~10 tick 권장 |

가장 큰 함정은 *deep sleep 진입 후 clock 복구*입니다. STOP mode에서 깨어나면 *PLL이 꺼져서 16/8 MHz 기본 클럭*으로 돌아갑니다. `SystemClock_Config()`를 다시 호출하지 않으면 *작업이 10배 느려져서* 오히려 평균 전류가 늘 수도 있습니다.

## 정리

- Tickless idle은 *예상 idle 구간을 한 번에 자고* 흐른 시간을 보정하는 표준 기법입니다.
- `configUSE_TICKLESS_IDLE=1`은 port 기본, 값 2는 *사용자 정의 LPTIM/RTC wake-up*입니다.
- `portSUPPRESS_TICKS_AND_SLEEP` 매크로의 흐름은 *peripheral suspend → wake-up timer 설정 → WFI/STOP → tick 보정*입니다.
- `eTaskConfirmSleepModeStatus`로 *마지막 race를 검사*합니다. `eAbortSleep`이면 sleep을 취소합니다.
- STM32 STOP mode는 *2~3 µA*, nRF52 System ON sleep은 *1.5 µA*까지 갈 수 있습니다.
- *missed tick* 버그가 가장 잦습니다. RTC counter 차이를 *정확히 tick으로 환산*해서 `vTaskStepTick`에 넘깁니다.
- *Peripheral clock과 floating GPIO*가 시스템 전류의 큰 부분을 차지합니다. pre-sleep hook에서 끄고, post-sleep에서 다시 켭니다.
- *Power Profiler*로 실측하지 않은 전력 수치는 거의 항상 50% 이상 오차입니다.

## 다음 편

[Ch 12: Memory Protection Unit (MPU) Support](/blog/embedded/rtos/freertos-mastering/chapter12-mpu-support)에서는 *Cortex-M MPU*로 태스크를 격리하는 FreeRTOS-MPU를 다룹니다. 보안과 fault containment를 위한 기능입니다.

## 관련 항목

- [Ch 4: Idle Task](/blog/embedded/rtos/freertos-mastering/chapter04-idle-task) — idle hook과의 관계
- [Ch 7: Software Timers](/blog/embedded/rtos/freertos-mastering/chapter07-software-timers) — sleep 동안 timer 보정
- [Practical RTOS Internals — Low Power](/blog/embedded/rtos/practical-internals/) — 더 깊은 내부 동작
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 실전 sleep 패턴
- [원문 — FreeRTOS Low Power Tickless](https://www.freertos.org/low-power-tickless-rtos.html)
