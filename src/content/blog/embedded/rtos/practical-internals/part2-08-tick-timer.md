---
title: "2-08: Tick과 타이머 — SysTick, Generic Timer, configTICK_RATE_HZ"
date: 2026-05-07T18:00:00
description: "RTOS의 심장 박동. SysTick 1 kHz가 표준 — Hz 선택의 trade-off."
series: "Practical RTOS Internals"
seriesOrder: 18
tags: [tick, systick, hw-timer, time-slice]
draft: false
---

## 한 줄 요약

> Tick은 RTOS의 심장 박동에 해당합니다. 주기적인 IRQ가 scheduler, timeout, preemption의 토대가 됩니다.

## Cortex-M SysTick

Cortex-M에는 24-bit down-counter가 내장되어 있습니다. 대부분의 RTOS가 이를 기본 tick source로 사용합니다.

```c
// FreeRTOSConfig.h
#define configTICK_RATE_HZ              ((TickType_t) 1000)   // 1 kHz
#define configCPU_CLOCK_HZ              ((unsigned long) 168000000)   // 168 MHz
```

내부 구현은 다음과 같습니다.

```c
void vPortSetupTimerInterrupt(void) {
    /* SysTick 설정 */
    portNVIC_SYSTICK_LOAD_REG = (configCPU_CLOCK_HZ / configTICK_RATE_HZ) - 1UL;
    portNVIC_SYSTICK_CTRL_REG = (portNVIC_SYSTICK_CLK_BIT |
                                  portNVIC_SYSTICK_INT_BIT |
                                  portNVIC_SYSTICK_ENABLE_BIT);
}
```

168 MHz를 1 kHz로 나누면 168,000 cycle입니다. 이 카운트마다 SysTick 인터럽트가 한 번씩 발생합니다.

## SysTick Handler

```c
void xPortSysTickHandler(void) {
    vPortRaiseBASEPRI();              // IRQ mask
    if (xTaskIncrementTick() != pdFALSE) {
        portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;   // preempt 필요
    }
    vPortClearBASEPRIFromISR();
}
```

`xTaskIncrementTick()`이 하는 일은 다음과 같습니다.

- `xTickCount`를 1 증가시킵니다.
- delayed list에서 만료된 task를 wake해 ready로 옮깁니다.
- 같은 priority 안에서 round-robin rotation을 진행합니다.
- preemption이 필요하면 `pdTRUE`를 반환합니다.

## Tick Rate Trade-off

| Rate | Period | 장단점 |
| --- | --- | --- |
| 100 Hz | 10 ms | 저전력, 낮은 정밀도 |
| 500 Hz | 2 ms | 균형 |
| **1 kHz** | 1 ms | **표준 — 대부분 RTOS 기본** |
| 10 kHz | 100 µs | 정밀, ISR overhead 큼 |

`vTaskDelay(1)`은 1 tick 뒤에 wake합니다. tick rate에 따라 실제 시간이 달라지므로, 100 Hz면 10 ms, 1 kHz면 1 ms로 의미가 달라집니다.

## Tick Overhead

```text
SysTick ISR @ 1 kHz:
- HW enter: 12 cycle
- BASEPRI set: 2 cycle
- xTaskIncrementTick: 100-500 cycle (delayed list 처리에 따라)
- BASEPRI clear: 2 cycle
- HW exit: 6 cycle (tail-chain)
Total ≈ 120-520 cycle/tick

@ 168 MHz: 0.7-3 µs/tick = 0.07-0.3% CPU
```

부담이 작은 편입니다. 10 kHz로 올려도 0.7~3% CPU 정도라 여전히 견딜 만합니다.

## Cortex-A Generic Timer

Cortex-A에는 SysTick이 없습니다. 대신 Generic Timer(ARM Architecture Timer)를 제공합니다.

```c
// CNTFRQ_EL0 — 시스템 frequency (보통 24 MHz)
// CNTPCT_EL0 — 64-bit physical counter (count up)
// CNTP_CVAL_EL0 — compare value (interrupt trigger)
```

```c
uint64_t now = read_cntpct();
uint64_t deadline = now + ticks_per_ms;
write_cntp_cval(deadline);
```

64-bit counter라 wraparound가 사실상 일어나지 않습니다. 24 MHz로 돌려도 64-bit를 다 채우려면 약 24,000년이 걸립니다.

## RISC-V — mtime / mtimecmp

```c
// PLIC·CLINT의 mtime memory-mapped
#define MTIME        (*(volatile uint64_t *)0x0200BFF8)
#define MTIMECMP     (*(volatile uint64_t *)0x02004000)

// Tick 설정
MTIMECMP = MTIME + (FREQ_HZ / TICK_HZ);
```

`mtime`은 64-bit입니다. `mtimecmp ≤ mtime` 조건이 성립하면 `mip.MTIP`가 set되어 interrupt가 pending됩니다. wraparound는 사실상 없습니다.

## Time Slicing

`configUSE_TIME_SLICING = 1`(기본값)이면 매 tick마다 같은 priority 안에서 round-robin이 발생합니다. 다른 priority에는 영향을 주지 않습니다.

```c
// vTaskSwitchContext
if (uxTopReadyPriority == pxCurrentTCB->uxPriority) {
    // 다른 same-priority task가 있으면 yield
    listGET_OWNER_OF_NEXT_ENTRY(...);
}
```

`configUSE_TIME_SLICING = 0`으로 두면 같은 priority의 task끼리는 명시적으로 yield할 때만 전환됩니다.

## vTaskDelay vs vTaskDelayUntil

```c
// Relative delay
vTaskDelay(100);                   // 지금부터 100 tick 대기

// Absolute periodic delay
TickType_t xLastWake = xTaskGetTickCount();
while (1) {
    do_work();
    vTaskDelayUntil(&xLastWake, 100);  // 정확한 100 tick 주기
}
```

`vTaskDelayUntil`은 주기를 정확히 유지합니다. `do_work()`가 50 ms를 잡아먹어도 다음 wake는 여전히 `xLastWake + 100 tick`입니다.

## Tickless Idle

`configUSE_TICKLESS_IDLE = 1`을 켜면 다음과 같이 동작합니다.

Idle 동안 SysTick을 멈춰 두고 CPU를 더 오래 sleep시킵니다. 깨어날 때 그동안 놓친 tick을 한 번에 보충합니다.

```c
void vPortSuppressTicksAndSleep(TickType_t xExpectedIdleTime) {
    /* SysTick 다음 wake까지 reprogram */
    uint32_t ulReloadValue = ulTimerCountsForOneTick * xExpectedIdleTime;
    portNVIC_SYSTICK_LOAD_REG = ulReloadValue;
    
    __WFI();  /* sleep */
    
    /* 깨어났을 때 — 실제 경과 tick 보충 */
    TickType_t ulCompleteTickPeriods = 
        (configSYSTICK_CLOCK_HZ - portNVIC_SYSTICK_CURRENT_VALUE_REG)
        / ulTimerCountsForOneTick;
    vTaskStepTick(ulCompleteTickPeriods);
}
```

5년 이상 동작해야 하는 배터리 기반 IoT 디바이스의 핵심 기술입니다.

## Tick 정확도 — Drift

내부 RC oscillator(HSI)는 ±1~2%의 drift를 보입니다. 외부 crystal(HSE)은 ±50 ppm 수준으로 훨씬 안정적입니다.

```text
HSI @ 168 MHz, ±1.5%:
1 day = 86400 sec × 0.015 = 1296 sec drift = 21분 오차

HSE @ 168 MHz, ±50 ppm:
1 day × 0.005% = 4.3 sec drift
```

장시간 동작하거나 NTP, time-stamp처럼 동기화에 민감한 시스템에는 외부 crystal이 필수입니다.

## RTC와의 차이

| | RTC (Real-Time Clock) | RTOS Tick |
| --- | --- | --- |
| 용도 | Wall clock (date, time) | Scheduler·timeout |
| 정밀도 | 초 단위 | µs 단위 |
| 저전력 모드 | 동작 (battery) | 멈춤 (tickless 제외) |
| 정확도 | 32 kHz crystal | 시스템 클럭 |

대부분의 시스템은 RTC와 Tick을 동시에 사용합니다. RTC가 시간을 추적하고, Tick이 제어를 담당합니다.

## 자주 하는 실수

> ⚠️ Tick rate를 임의로 가정합니다

`vTaskDelay(10)`을 10 ms라고 가정하기 쉽지만 실제로는 `configTICK_RATE_HZ`에 따라 달라집니다. `pdMS_TO_TICKS()` 매크로로 명시 변환을 거쳐야 합니다.

```c
vTaskDelay(pdMS_TO_TICKS(10));   // 명시적
```

> ⚠️ Tickless에서 wake source를 빠뜨립니다

WFI 이후 깨울 수단이 SysTick뿐인데 그것까지 꺼 버리면 영원히 sleep 상태에 머뭅니다. RTC alarm이나 GPIO IRQ 같은 다른 wake source를 반드시 마련해 둬야 합니다.

> ⚠️ HSI로 장시간 sync를 시도합니다

±1% drift만으로도 하루에 14분이 어긋납니다. 장시간 동기화가 필요하다면 HSE가 필수입니다.

> ⚠️ vTaskDelay 대신 busy-wait를 씁니다

짧은 delay라도 busy-wait를 쓰면 CPU가 100%에 머물러 다른 task가 굶게 됩니다. 항상 `vTaskDelay`를 사용해야 합니다.

## 정리

- Cortex-M의 SysTick, Cortex-A의 Generic Timer, RISC-V의 mtime이 tick source입니다.
- 1 kHz가 RTOS의 표준 tick rate입니다.
- Tick ISR overhead는 약 0.1% CPU 수준이라 부담이 작습니다.
- Tickless mode가 배터리 동작의 핵심입니다.
- `pdMS_TO_TICKS()`로 절대 시간을 명시해 tick rate 의존을 피합니다.

다음 편은 tickless 모드 구현을 자세히 다룹니다.

## 관련 항목

- [1-04: Preemption (tickless)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [2-09: Tickless 모드 구현](/blog/embedded/rtos/practical-internals/part2-09-tickless)
