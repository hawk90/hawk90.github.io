---
title: "4-09: Software Timer — Daemon Task·Sorted List·One-Shot·Auto-Reload"
date: 2026-05-19T21:00:00
description: "FreeRTOS Software Timer 내부. Daemon task, sorted expiry list, callback context."
series: "Practical RTOS Internals"
seriesOrder: 41
tags: [software-timer, daemon, callback]
draft: true
---

## 한 줄 요약

> **"Software Timer = daemon task에서 callback 실행"** — hardware timer 적은 시스템의 답.

## Hardware vs Software Timer

```text
Hardware Timer:
  - HW peripheral (TIM1, TIM2, ...)
  - 직접 IRQ
  - 매우 정확 (cycle level)
  - 갯수 제한 (수 개)

Software Timer:
  - OS 관리
  - Sorted list + tick
  - 부정확 (tick 단위)
  - 갯수 무제한 (메모리만)
```

## FreeRTOS Timer 구조

```c
typedef struct timer_t {
    char *name;
    ListItem_t list_item;          /* sorted by expiry */
    TickType_t period;
    UBaseType_t auto_reload;
    void *id;
    TimerCallbackFunction_t callback;
} Timer_t;
```

각 timer는 *sorted list*에 expiry tick 순으로 배치.

## Timer Service Task (Daemon)

```c
void prvTimerTask(void *p) {
    for (;;) {
        TickType_t now = xTaskGetTickCount();
        
        /* Process expired timers */
        while (head_of_list && head_of_list->expiry <= now) {
            Timer_t *t = pop(timer_list);
            t->callback(t);
            if (t->auto_reload) {
                t->expiry = now + t->period;
                insert_sorted(t);
            }
        }
        
        /* Wait for next expiry or command */
        TickType_t wait = head_of_list ? head_of_list->expiry - now : portMAX_DELAY;
        xQueueReceive(timer_cmd_q, &cmd, wait);
        
        /* Process commands (start·stop·reset·delete) */
        process_command(&cmd);
    }
}
```

Timer task — *highest priority* (`configTIMER_TASK_PRIORITY`). Tick ISR이 *직접 callback* 안 함.

## API 사용

```c
TimerHandle_t t = xTimerCreate(
    "LED",                   /* name */
    pdMS_TO_TICKS(500),      /* period */
    pdTRUE,                  /* auto-reload */
    (void*)0,                /* id */
    led_callback);            /* function */

xTimerStart(t, 0);
/* ... */
xTimerStop(t, 0);
xTimerReset(t, 0);    /* restart from now */
xTimerChangePeriod(t, pdMS_TO_TICKS(1000), 0);
xTimerDelete(t, 0);
```

각 API — *command 전송*. Daemon task가 *실제 처리*.

## One-Shot vs Auto-Reload

```c
/* One-shot — 한 번 발화 후 stop */
TimerHandle_t t = xTimerCreate("once", 1000, pdFALSE, NULL, cb);
xTimerStart(t, 0);
/* cb 실행 후 timer 자동 stop. xTimerStart 다시 호출하면 재실행 */

/* Auto-reload — 주기 발화 */
TimerHandle_t t = xTimerCreate("periodic", 100, pdTRUE, NULL, cb);
xTimerStart(t, 0);
/* 매 100 tick마다 cb 실행 */
```

## Callback Context — Daemon Task

```c
void cb(TimerHandle_t t) {
    /* Daemon task context — task API 가능 */
    xQueueSend(work_queue, &data, 0);
    /* 그러나 *오래 blocking 안 됨* — 다른 timer 영향 */
}
```

⚠️ Callback에서 *오래 걸리는 작업* — 다른 timer가 *delayed*.

→ Callback은 *짧게* + work를 *다른 task로 defer*.

## ISR-Safe Variant

```c
void some_isr(void) {
    BaseType_t pxHP = pdFALSE;
    xTimerStartFromISR(t, &pxHP);
    /* 또는 */
    xTimerPendFunctionCallFromISR(my_func, arg1, arg2, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

`xTimerPendFunctionCall` — 임의 함수를 *daemon task에서 호출*. ISR에서 *복잡한 작업 defer*.

## 정확도

```text
Tick frequency = 100 Hz → 10 ms per tick
Timer period = 50 ms → 5 tick
실제 expiry: 5 tick 후 daemon task에서 처리
  - Daemon task가 다른 timer 처리 중일 수 → 추가 지연
  - 다른 high-priority task 진행 중일 수 → 추가 지연
  
Worst-case 정확도: ±1 tick + daemon overhead
```

높은 정확도 필요 → `configTICK_RATE_HZ` ↑ + daemon priority ↑.

## 더 높은 해상도 — Tickless Idle

```c
#define configUSE_TICKLESS_IDLE 1
```

Idle 중 *tick 끔* — sleep mode 사용 + *다음 expiry에 wake*. Power 절약.

그러나 *high-resolution timer*는 hardware 또는 *hardware compare 채널*.

## Linux — hrtimer (High Resolution)

```c
struct hrtimer t;
hrtimer_init(&t, CLOCK_MONOTONIC, HRTIMER_MODE_REL);
t.function = callback;
hrtimer_start(&t, ktime_set(0, 100000000), HRTIMER_MODE_REL);  /* 100ms */
```

Linux — nanosecond 해상도. *Posted in red-black tree* — O(log N).

## ARM Generic Timer (Cortex-A)

```c
/* Architectural timer */
ARMv8 — CNTPCT_EL0 (physical count)
        CNTVCT_EL0 (virtual count)
        CNTFRQ_EL0 (frequency)

Linux kernel — CNTVOFF_EL2로 virtualization 지원
```

System counter — *동기화된 시간* 모든 core에. Linux `arch_timer` driver.

## STM32 — Hardware Timer

```c
TIM_HandleTypeDef htim;
htim.Instance = TIM2;
htim.Init.Prescaler = 84 - 1;       /* 84 MHz / 84 = 1 MHz */
htim.Init.Period = 1000 - 1;        /* 1000 µs = 1 ms */
htim.Init.CounterMode = TIM_COUNTERMODE_UP;
HAL_TIM_Base_Init(&htim);
HAL_TIM_Base_Start_IT(&htim);

void TIM2_IRQHandler(void) {
    HAL_TIM_IRQHandler(&htim);
}

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim) {
    /* 1 ms마다 */
}
```

Hardware timer — *직접 IRQ*, *수십 ns 정확*. SW timer보다 *훨씬 정확*.

## Tickless Tick 구현

```c
/* configUSE_TICKLESS_IDLE = 1 */
void portSUPPRESS_TICKS_AND_SLEEP(TickType_t idle_ticks) {
    /* Set next expiry timer */
    SysTick->LOAD = idle_ticks * cycles_per_tick - 1;
    SysTick->VAL = 0;
    SysTick->CTRL = 0;   /* disable normal tick */
    
    __WFI();   /* sleep */
    
    /* Wake — Calculate elapsed ticks */
    uint32_t elapsed = ...;
    vTaskStepTick(elapsed);
    
    /* Restore normal tick */
    SysTick->LOAD = cycles_per_tick - 1;
    SysTick->CTRL = SysTick_CTRL_ENABLE_Msk | ...;
}
```

Sleep 중 *tick 안 받음*. Battery IoT 핵심.

## 자동차 — Periodic Task with Hardware Timer

```c
/* Brake task — 1 ms 정확 주기 */
TIM_HandleTypeDef brake_tim;
brake_tim.Init.Period = 1000;   /* 1 ms */

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim) {
    if (htim == &brake_tim) {
        BaseType_t pxHP = pdFALSE;
        xSemaphoreGiveFromISR(brake_sem, &pxHP);
        portYIELD_FROM_ISR(pxHP);
    }
}

void brake_task(void *p) {
    for (;;) {
        xSemaphoreTake(brake_sem, portMAX_DELAY);
        do_brake_cycle();
    }
}
```

HW timer = 정확 주기, daemon은 *덜 정확 (jitter ±1 tick)*. RT critical은 HW.

## 자주 하는 실수

> ⚠️ Callback long blocking

```c
void cb(TimerHandle_t t) {
    vTaskDelay(100);   /* ← daemon task block — 다른 timer 다 정지 */
}
```

→ semaphore signal → 다른 task에서 처리.

> ⚠️ Daemon priority 낮음

```c
#define configTIMER_TASK_PRIORITY 1   /* ← 다른 task가 daemon 차단 → timer 부정확 */
```

→ Daemon은 *높은 priority*.

> ⚠️ Timer queue 작음

```c
#define configTIMER_QUEUE_LENGTH 5   /* ← burst start/stop 시 overflow */
```

→ 충분히 크게 (20+).

> ⚠️ ISR에서 task API 호출

```c
void isr(void) {
    xTimerStart(t, 0);   /* ✗ — *FromISR variant 필요 */
}
```

→ `xTimerStartFromISR`.

## 정리

- Software Timer = **daemon task에서 callback**.
- Hardware timer = 정확·갯수 제한, Software = 무제한·tick 정확.
- One-shot vs **Auto-reload**.
- Callback은 *daemon context*, 짧게.
- **xTimerPendFunctionCall**로 ISR work defer.
- 정확 주기 RT는 HW timer + semaphore signal.

다음 편은 **System Call**.

## 관련 항목

- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
