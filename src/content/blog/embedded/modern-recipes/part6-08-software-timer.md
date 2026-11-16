---
title: "RTOS Software Timer 활용 — One-shot·Auto-reload·Daemon Task"
slug: "embedded/modern-recipes/part6-08-software-timer"
date: 2026-04-15T09:07:00
description: "Software timer와 hardware timer의 분기점, one-shot/auto-reload, timer task context, delete 시 race를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 70
tags: [recipes, rtos, timer]
topics: ["embedded"]
---

## 한 줄 요약

> **"Software timer는 timer service task가 다음 만료 시각까지 잠들었다가 깨어나 callback을 부르는 구조입니다."** 해상도는 RTOS tick이고, callback 하나가 막히면 다른 모든 timer가 함께 늦어집니다.

## 어떤 상황에서 쓰나

LED를 250 ms마다 깜빡이고, 30초 동안 입력이 없으면 화면을 끄고, watchdog ping을 1초마다 보내는 펌웨어처럼 ms 단위 알람이 여럿일 때 씁니다. hardware timer를 알람마다 하나씩 쓰지 않고, RTOS tick 위에 필요한 만큼 software timer를 만듭니다.

tick보다 짧은 주기(예: 50 µs)나 tick에 묶이지 않는 시각이 필요한 작업은 hardware timer와 그 ISR로 처리합니다.

실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3`, `configTIMER_TASK_PRIORITY` 7, `configTIMER_QUEUE_LENGTH` 8, QEMU 11.1.3 `mps2-an385` `-icount shift=5`). 아래 코드 중 `screen_off()`, `led_set()` 같은 함수는 애플리케이션 함수이고, 실행한 코드는 "측정" 절에 있습니다.

## 핵심 개념

두 timer는 개수와 해상도가 다릅니다.

| 종류 | 특성 |
|------|------|
| HW timer | peripheral 한 개 = timer 한 개, peripheral 설정에 따른 정밀도 |
| SW timer | timer task 한 개 = N개 가상 timer, RTOS tick 정밀도 |

FreeRTOS software timer 구조입니다.

| API | 동작 |
|-----|------|
| `xTimerCreate` | callback, period, auto-reload 옵션 |
| `xTimerStart` | timer command queue로 명령 전달 |
| `xTimerStop` / `xTimerDelete` | 같은 queue로 전달 |
| timer service task | 다음 만료 시각까지 command queue에서 잠들었다가, 만료된 timer의 callback 호출 |

timer service task는 tick마다 깨어나지 않습니다. `timers.c`의 `prvProcessTimerOrBlockTask()`는 가장 가까운 만료 시각까지 남은 tick을 `vQueueWaitForMessageRestricted( xTimerQueue, ( xNextExpireTime - xTimeNow ), … )`에 넘겨 command queue에서 기다립니다. callback은 이 task 안에서 차례로 실행되므로, callback이 막히거나 오래 걸리면 다른 timer의 callback이 모두 그만큼 늦어집니다(아래 측정).

## 코드 / 실제 사용 예

### One-shot timer

```c
TimerHandle_t inactivity;

void inactivity_cb(TimerHandle_t t) {
    screen_off();
}

void on_user_input(void) {
    xTimerReset(inactivity, 0);   /* 30초 새로 셈 */
}

void init(void) {
    inactivity = xTimerCreate(
        "idle",
        pdMS_TO_TICKS(30000),
        pdFALSE,            /* one-shot */
        NULL,
        inactivity_cb);
    xTimerStart(inactivity, 0);
}
```

`pdFALSE`가 one-shot입니다. callback이 한 번 실행되고 timer는 dormant 상태가 됩니다. `xTimerReset()`은 dormant인 timer도 다시 시작하므로 입력이 올 때마다 30초를 새로 셉니다.

### Auto-reload timer

```c
TimerHandle_t heartbeat;

void hb_cb(TimerHandle_t t) {
    static int phase;
    led_set(phase ^= 1);
    watchdog_ping();
}

void init(void) {
    heartbeat = xTimerCreate(
        "hb",
        pdMS_TO_TICKS(500),
        pdTRUE,             /* auto-reload */
        NULL,
        hb_cb);
    xTimerStart(heartbeat, 0);
}
```

`pdTRUE`가 auto-reload입니다. 다음 만료 시각은 이전 만료 시각에 period를 더한 값이라, callback이 늦게 불려도 주기가 밀리지 않습니다(아래 측정의 B).

### Timer ID로 instance 구분

```c
TimerHandle_t led_timers[4];

void led_cb(TimerHandle_t t) {
    int idx = (int)(uintptr_t)pvTimerGetTimerID(t);
    led_toggle(idx);
}

void init(void) {
    for (int i = 0; i < 4; i++) {
        led_timers[i] = xTimerCreate("led", pdMS_TO_TICKS(100 * (i + 1)),
                                      pdTRUE, (void *)(uintptr_t)i, led_cb);
        xTimerStart(led_timers[i], 0);
    }
}
```

timer 넷이 callback 하나를 나눠 쓰고, `pvTimerGetTimerID()`로 어느 timer인지 구분합니다.

### Static timer

```c
static StaticTimer_t hb_buf;
TimerHandle_t hb;

void init(void) {
    hb = xTimerCreateStatic(
        "hb", pdMS_TO_TICKS(500),
        pdTRUE, NULL, hb_cb, &hb_buf);
    xTimerStart(hb, 0);
}
```

`xTimerCreateStatic()`은 heap 대신 호출자가 넘긴 `StaticTimer_t`에 timer를 만듭니다.

### ISR에서 reset

```c
void EXTI_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    xTimerResetFromISR(inactivity, &hp);   /* 30s timer reset */
    portYIELD_FROM_ISR(hp);
}
```

`xTimerResetFromISR()`은 timer service task의 command queue에 명령을 넣습니다. 실제 reset은 그 task가 돌 때 일어납니다.

### HW timer가 필요한 경우

```c
/* 50 us period: below the 1 ms tick, so a hardware timer ISR */
void TIM2_IRQHandler(void) {
    pwm_update();
}
```

tick(여기서 1 ms)보다 짧은 주기는 software timer로 만들 수 없습니다. software timer callback은 timer service task의 우선순위와 앞선 callback의 실행 시간만큼 늦어집니다.

### Timer 종료 시 race 처리

```c
void shutdown_module(void) {
    xTimerStop(t, pdMS_TO_TICKS(100));
    /* the stop command may not have been processed yet */
    if (xTimerDelete(t, pdMS_TO_TICKS(100)) != pdPASS) {
        log_err("timer delete failed");
    }
    /* callback이 사용하던 자원은 callback 완료 후 free */
}
```

`xTimerStop()`·`xTimerDelete()`는 command queue에 명령을 넣을 뿐입니다. 이 함수를 부른 task가 timer service task보다 우선순위가 높으면, 명령이 처리되기 전에 돌아오므로 callback이 그 뒤에 한 번 더 불릴 수 있습니다. callback이 쓰는 자원은 명령이 처리된 것을 확인한 뒤 정리합니다.

## 측정

### callback이 막히면

one-shot A(tick 15)와 auto-reload B(10 tick)를 만들고, A의 callback 안에서 `vTaskDelay(25)`로 막히게 한 빌드와 막히지 않는 빌드를 비교했습니다.

```c
/* swtimer.c: timer service behaviour on FreeRTOS V11.2.0.
   -DBLOCKING makes timer A's callback block for 25 ticks. */
#include "FreeRTOS.h"
#include "task.h"
#include "timers.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

static TimerHandle_t ta, tb;
static int nb;

static void cb_a(TimerHandle_t t) {               /* one-shot at tick 15 */
    (void)t;
    pr("A fires at %u\n", (unsigned)xTaskGetTickCount());
#ifdef BLOCKING
    vTaskDelay(25);                               /* blocks the timer task */
#endif
}

static void cb_b(TimerHandle_t t) {               /* auto-reload every 10 ticks */
    (void)t;
    pr("  B fires at %u\n", (unsigned)xTaskGetTickCount());
    if (++nb == 6) hosted_exit(0);
}

int main(void) {
    ta = xTimerCreate("A", 15, pdFALSE, NULL, cb_a);
    tb = xTimerCreate("B", 10, pdTRUE, NULL, cb_b);
    xTimerStart(ta, 0);
    xTimerStart(tb, 0);
    vTaskStartScheduler();
    return 0;
}
```

| 막히지 않음 | A callback이 25 tick 막힘 |
|---|---|
| `B fires at 10` | `B fires at 10` |
| `A fires at 15` | `A fires at 15` |
| `B fires at 20` | `B fires at 40` |
| `B fires at 30` | `B fires at 40` |
| `B fires at 40` | `B fires at 40` |
| `B fires at 50` | `B fires at 50` |
| `B fires at 60` | `B fires at 60` |

A의 callback이 timer service task를 tick 15부터 40까지 막는 동안, tick 20과 30에 만료된 B의 callback은 불리지 못하고 tick 40에 세 번 연달아 불렸습니다. 그 뒤 50, 60은 원래 주기대로입니다. auto-reload의 다음 만료가 이전 만료 시각 + period라서 밀린 만큼 한꺼번에 따라잡은 것입니다.

### period 0

```c
/* period0.c: a software timer with period 0 */
#include "FreeRTOS.h"
#include "task.h"
#include "timers.h"
extern void hosted_exit(int);
static void cb(TimerHandle_t t) { (void)t; }
int main(void) { xTimerCreate("x", 0, pdTRUE, NULL, cb); hosted_exit(0); return 0; }
```

```text
ASSERT failed: timers.c line 425
```

`xTimerCreate()`는 `timers.c` 425행 `configASSERT( ( xTimerPeriodInTicks > 0 ) )`로 period 0을 거부합니다.

## 자주 보는 함정

> Callback에서 block

```c
void cb(TimerHandle_t t) {
    xQueueReceive(q, &item, portMAX_DELAY);   /* timer task 자체가 멈춤 */
}
```

위 측정처럼 timer service task가 막힌 동안 다른 timer의 callback이 모두 밀립니다. callback에서는 기다리는 API를 부르지 않습니다(timeout 0으로만).

> Callback에서 무거운 작업

```c
void cb(TimerHandle_t t) {
    flash_write(buf, 4096);   /* 수십 ms — 다음 callback 늦어짐 */
}
```

막히는 것과 같은 효과입니다. callback은 worker task에 notification이나 queue로 신호만 보내고, 긴 일은 worker가 합니다.

> Timer command queue full

```c
xTimerStart(t, 0);   /* timer queue 가득 차면 fail */
```

command queue 길이는 `configTIMER_QUEUE_LENGTH`(이 설정에서 8)입니다. timer service task가 돌기 전에 명령이 그보다 많이 쌓이면 block time 0인 `xTimerStart()`는 `pdFAIL`을 돌려줍니다. 반환값을 확인합니다.

> Period를 0으로

```c
xTimerCreate("x", 0, pdTRUE, NULL, cb);   /* configASSERT, timers.c 425 */
```

period는 1 tick 이상이어야 합니다(위 측정). 1 ms tick에서 1 ms보다 짧은 주기는 software timer로 만들 수 없습니다.

> Delete 후 자원 즉시 free

```c
xTimerDelete(t, 0);
free(my_buf);   /* 마지막 callback이 my_buf 사용 중이면 use-after-free */
```

delete 명령은 queue에 들어갈 뿐이라, `xTimerDelete()`가 돌아온 시점에 timer service task가 그 명령을 처리했다는 보장이 없습니다. callback이 쓰는 자원은 명령 처리 뒤에 해제합니다.

## 정리

- SW timer의 해상도는 **RTOS tick**(이 설정에서 1 ms)이고, 더 짧은 주기는 HW timer ISR로 만듭니다.
- One-shot은 `pdFALSE`, auto-reload는 `pdTRUE`입니다.
- Callback은 **timer service task 안에서** 차례로 돕니다. 하나가 25 tick 막히자 B의 두 주기가 tick 40으로 밀렸습니다.
- 명령은 timer command queue로 전달됩니다. queue 길이와 ISR 빈도를 확인합니다.
- Stop·delete는 명령을 넣을 뿐이므로, callback 자원은 명령이 처리된 뒤 정리합니다.

다음 편은 **ISR-Safe API 설계**입니다.

## 관련 항목

- [PRTOS 2-08: Tick Timer](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-07: Event Group](/blog/embedded/modern-recipes/part6-07-event-group)
- [6-09: ISR-Safe API 설계](/blog/embedded/modern-recipes/part6-09-isr-api)
- [6-12: RTOS 디버깅](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
