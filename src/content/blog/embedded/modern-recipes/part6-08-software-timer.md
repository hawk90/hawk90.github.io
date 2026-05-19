---
title: "6-08: Software Timer"
date: 2026-05-14T22:00:00
description: "Software timer와 hardware timer의 분기점, one-shot/auto-reload, timer task context, delete 시 race를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 70
tags: [recipes, rtos, timer]
---

## 한 줄 요약

> **"Software timer는 timer task가 tick마다 list를 훑어 callback을 부르는 구조입니다."** µs 정밀도가 필요하면 HW timer, ms 단위 알람이 많으면 SW timer입니다.

## 어떤 상황에서 쓰나

LED를 250 ms마다 깜빡이게 하고, 사용자가 30초 동안 입력이 없으면 화면을 꺼야 하며, watchdog ping을 1초 주기로 보내야 하는 펌웨어가 흔합니다. 모두 hardware timer 한 개로는 처리할 수 없을 만큼 알람의 종류가 많습니다. Software timer는 한 hardware tick 위에 N개의 가상 timer를 얹어줍니다.

반대로 motor PWM 50 µs cycle처럼 정밀하고 ISR latency가 결정적이어야 하는 작업은 hardware timer로 직접 처리해야 합니다.

## 핵심 개념

```text
HW timer        peripheral 한 개 = timer 한 개, µs 정밀
SW timer        timer task 한 개 = N개 가상 timer, tick 정밀(보통 1 ms)
```

FreeRTOS software timer 구조입니다.

| API | 동작 |
|-----|------|
| `xTimerCreate` | callback, period, auto-reload 옵션 |
| `xTimerStart` | timer command queue로 명령 전달 |
| `xTimerStop` / `xTimerDelete` | 같은 queue로 전달 |
| timer task | 매 tick마다 만료 timer를 골라 callback 호출 |

Callback은 timer task의 context에서 실행됩니다. 따라서 callback에서 block하거나 무거운 일을 하면 다른 timer가 지연됩니다.

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

`pdFALSE`가 one-shot입니다. callback이 한 번 실행되고 timer는 dormant 상태로 들어갑니다.

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

`pdTRUE`가 auto-reload입니다. callback이 끝나면 자동으로 다시 시작합니다.

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

같은 callback을 N개의 timer가 공유할 때 timer ID로 구분합니다. RAM이 callback 코드 한 벌만 듭니다.

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

양산은 static 변종이 표준입니다. heap fragmentation이 사라집니다.

### ISR에서 reset

```c
void EXTI_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    xTimerResetFromISR(inactivity, &hp);   /* 30s timer reset */
    portYIELD_FROM_ISR(hp);
}
```

ISR에서 직접 callback을 부를 수는 없고, `*FromISR` 변종이 timer task에 명령을 전달합니다.

### HW timer가 필요한 경우

```c
/* 정밀 50 µs PWM — HW timer가 답 */
void TIM2_IRQHandler(void) {
    pwm_update();           /* ISR에서 직접 — SW timer로는 불가능 */
}
```

µs 단위 정밀, ISR latency 보장이 필요하면 HW timer를 직접 다룹니다. SW timer는 tick 정밀이라 1 ms tick에서는 ±1 ms jitter가 항상 깔립니다.

### Timer 종료 시 race 처리

```c
void shutdown_module(void) {
    xTimerStop(t, pdMS_TO_TICKS(100));
    /* 이 시점 callback이 이미 실행 중일 수 있음 */
    if (xTimerDelete(t, pdMS_TO_TICKS(100)) != pdPASS) {
        log_err("timer delete failed");
    }
    /* callback이 사용하던 자원은 callback 완료 후 free */
}
```

`xTimerStop`은 명령을 queue에 넣을 뿐, 이미 실행 중인 callback을 멈추지 않습니다. callback이 module의 자원을 쓰고 있다면 reference count로 안전하게 정리합니다.

## 측정 / 성능 비교

| 연산 | 시간 (Cortex-M4 72 MHz) |
|------|--------------------------|
| `xTimerStart` | 2.1 µs (queue로 명령 전달) |
| SW timer callback latency | tick + 2 µs (보통 1 ms tick에 1 ms 지연) |
| HW timer ISR | 0.4 µs (직접 ISR 진입) |
| timer task per-tick overhead | 0.6 µs (active timer 4개) |

SW timer는 tick 정밀입니다. 1 ms tick에서는 callback이 0~1 ms 늦게 호출될 수 있습니다.

RAM 사용량:

| 종류 | 크기 |
|------|------|
| SW timer 1개 | 66 B |
| HW timer | 0 B (peripheral 사용) |
| timer task stack | 256 B (default) |

Timer task 자체가 항상 살아있으니 RTOS 도입 시 256 B 정도가 기본으로 소비됩니다.

## 자주 보는 함정

> Callback에서 block

```c
void cb(TimerHandle_t t) {
    xQueueReceive(q, &item, portMAX_DELAY);   /* timer task 자체가 멈춤 */
}
```

Timer task가 막히면 다른 모든 timer가 동시에 멈춥니다. callback에서는 block을 절대 하지 않습니다.

> Callback에서 무거운 작업

```c
void cb(TimerHandle_t t) {
    flash_write(buf, 4096);   /* 수십 ms — 다음 callback 늦어짐 */
}
```

긴 작업은 worker task로 넘깁니다. callback은 신호 한 줄만 보내고 worker가 처리합니다.

> Timer command queue full

```c
xTimerStart(t, 0);   /* timer queue 가득 차면 fail */
```

기본 queue 길이는 10입니다. 짧은 시간에 많은 timer 명령이 발생하면 길이를 늘립니다(`configTIMER_QUEUE_LENGTH`).

> Period를 0으로

```c
xTimerCreate("x", 0, pdTRUE, NULL, cb);   /* assert fail */
```

Period는 최소 1 tick이어야 합니다. 1 ms tick에서 1 ms 미만 timer는 SW timer로는 불가능합니다.

> Delete 후 자원 즉시 free

```c
xTimerDelete(t, 0);
free(my_buf);   /* 마지막 callback이 my_buf 사용 중이면 use-after-free */
```

Delete 명령은 queue에 들어갈 뿐, 이미 실행된 callback의 종료를 보장하지 않습니다. Reference count나 명시적 sync로 안전하게 처리합니다.

## 정리

- SW timer는 tick 정밀(보통 1 ms), HW timer는 µs 정밀입니다.
- One-shot은 `pdFALSE`, auto-reload는 `pdTRUE`입니다.
- Callback은 timer task context이므로 block과 long work를 금지합니다.
- 명령은 timer command queue로 전달됩니다. queue 길이와 ISR 빈도를 확인합니다.
- Delete는 callback 완료를 보장하지 않으니 race를 의식해 reference count로 정리합니다.
- 양산은 static timer를 표준으로 사용합니다.

다음 편부터 6-09~6-11은 별도로 다루고, 본 시리즈에서 마지막은 **RTOS 디버깅**입니다.

## 관련 항목

- [PRTOS 2-08: Tick Timer](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-07: Event Group](/blog/embedded/modern-recipes/part6-07-event-group)
- [6-12: RTOS 디버깅](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
