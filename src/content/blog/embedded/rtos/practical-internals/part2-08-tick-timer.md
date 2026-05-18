---
title: "2-08: Tick과 타이머 — SysTick, Generic Timer, configTICK_RATE_HZ"
date: 2026-05-12T18:00:00
description: "RTOS의 심장 박동. SysTick 1 kHz가 표준 — Hz 선택의 trade-off."
series: "Practical RTOS Internals"
seriesOrder: 18
tags: [tick, systick, hw-timer, time-slice]
draft: true
---

## 한 줄 요약

> **"Tick = RTOS의 심장 박동"** — 주기적 IRQ가 *scheduler·timeout·preemption*의 토대.

## Cortex-M SysTick

Cortex-M에 *내장된 24-bit down-counter*. RTOS의 default tick source.

```c
// FreeRTOSConfig.h
#define configTICK_RATE_HZ              ((TickType_t) 1000)   // 1 kHz
#define configCPU_CLOCK_HZ              ((unsigned long) 168000000)   // 168 MHz
```

내부:

```c
void vPortSetupTimerInterrupt(void) {
    /* SysTick 설정 */
    portNVIC_SYSTICK_LOAD_REG = (configCPU_CLOCK_HZ / configTICK_RATE_HZ) - 1UL;
    portNVIC_SYSTICK_CTRL_REG = (portNVIC_SYSTICK_CLK_BIT |
                                  portNVIC_SYSTICK_INT_BIT |
                                  portNVIC_SYSTICK_ENABLE_BIT);
}
```

168 MHz / 1 kHz = 168,000 cycle → 매 1 ms마다 SysTick 인터럽트.

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

`xTaskIncrementTick()`:
- `xTickCount++`
- Delayed list에서 expired task wake → ready로
- 같은 priority RR rotation
- preempt 필요 시 pdTRUE return

## Tick Rate Trade-off

| Rate | Period | 장단점 |
| --- | --- | --- |
| 100 Hz | 10 ms | 저전력, 낮은 정밀도 |
| 500 Hz | 2 ms | 균형 |
| **1 kHz** | 1 ms | **표준 — 대부분 RTOS 기본** |
| 10 kHz | 100 µs | 정밀, ISR overhead 큼 |

`vTaskDelay(1)`은 *1 tick 후 wake* — 100 Hz면 10 ms, 1 kHz면 1 ms. 의미 다름.

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

부담 적음. **10 kHz면 0.7-3% CPU** — 여전히 OK.

## Cortex-A Generic Timer

Cortex-A는 SysTick 없음. 대신 **Generic Timer** (ARM Architecture Timer).

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

64-bit counter라 *wraparound 거의 없음* (24 MHz × 64-bit = 24,000년).

## RISC-V — mtime / mtimecmp

```c
// PLIC·CLINT의 mtime memory-mapped
#define MTIME        (*(volatile uint64_t *)0x0200BFF8)
#define MTIMECMP     (*(volatile uint64_t *)0x02004000)

// Tick 설정
MTIMECMP = MTIME + (FREQ_HZ / TICK_HZ);
```

`mtime` 64-bit. `mtimecmp ≤ mtime`이면 *interrupt pending* (mip.MTIP). Wraparound 없음.

## Time Slicing

`configUSE_TIME_SLICING = 1` (default):

매 tick마다 *같은 priority 내 round-robin*. 다른 priority엔 영향 X.

```c
// vTaskSwitchContext
if (uxTopReadyPriority == pxCurrentTCB->uxPriority) {
    // 다른 same-priority task가 있으면 yield
    listGET_OWNER_OF_NEXT_ENTRY(...);
}
```

`configUSE_TIME_SLICING = 0` 시 — 같은 priority는 *task가 yield할 때만* 전환.

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

`vTaskDelayUntil`이 *주기 정확*. `do_work()`가 50 ms 걸려도 다음 wake = `xLastWake + 100 tick`.

## Tickless Idle

`configUSE_TICKLESS_IDLE = 1`:

Idle 시 *SysTick 멈춤* → CPU sleep 더 길게. Wake 시점에 *놓친 tick 보충*.

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

배터리 IoT 디바이스 (5+년 동작)의 핵심.

## Tick 정확도 — Drift

내부 RC oscillator (HSI): ±1-2% drift. 외부 crystal (HSE): ±50 ppm.

```text
HSI @ 168 MHz, ±1.5%:
1 day = 86400 sec × 0.015 = 1296 sec drift = 21분 오차

HSE @ 168 MHz, ±50 ppm:
1 day × 0.005% = 4.3 sec drift
```

Long-running·sync-sensitive (NTP·time-stamp)는 *외부 crystal* 필수.

## RTC와의 차이

| | RTC (Real-Time Clock) | RTOS Tick |
| --- | --- | --- |
| 용도 | Wall clock (date, time) | Scheduler·timeout |
| 정밀도 | 초 단위 | µs 단위 |
| 저전력 모드 | 동작 (battery) | 멈춤 (tickless 제외) |
| 정확도 | 32 kHz crystal | 시스템 클럭 |

대부분 시스템은 *RTC + Tick 모두* — RTC가 *시간 추적*, Tick이 *제어*.

## 자주 하는 실수

> ⚠️ Tick rate 가정

`vTaskDelay(10)`이 *10 ms*라 가정 → 실은 *configTICK_RATE_HZ에 의존*. `pdMS_TO_TICKS()` 매크로로 변환.

```c
vTaskDelay(pdMS_TO_TICKS(10));   // 명시적
```

> ⚠️ Tickless에서 wake source 누락

WFI 후 *깨울 source가 SysTick뿐*인데 그것까지 끔 → 영원히 sleep. 다른 wake source (RTC alarm, GPIO IRQ) 보장.

> ⚠️ HSI로 long-running sync

±1% drift로 1 day = 14 분 어긋남. HSE 필수.

> ⚠️ vTaskDelay 대신 busy-wait

작은 delay라도 *busy-wait* 시 CPU 100% — 다른 task 굶음. *vTaskDelay 항상*.

## 정리

- **SysTick** (Cortex-M), **Generic Timer** (Cortex-A), **mtime** (RISC-V)가 tick source.
- **1 kHz**가 RTOS 표준 tick rate.
- Tick ISR overhead ~0.1% CPU — 부담 작음.
- **Tickless mode**가 배터리 동작 핵심.
- `pdMS_TO_TICKS()`로 절대 시간 명시 — tick rate 의존 회피.

다음 편은 **Tickless 모드 구현** 상세.

## 관련 항목

- [1-04: Preemption (tickless)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [2-09: Tickless 모드 구현](/blog/embedded/rtos/practical-internals/part2-09-tickless)
