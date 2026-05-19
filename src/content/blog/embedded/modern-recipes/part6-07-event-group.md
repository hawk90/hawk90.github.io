---
title: "6-07: Event Group"
date: 2026-05-14T21:00:00
description: "Event group bit, set/clear, AND/OR 조건 wait, broadcast로 다중 task synchronization을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 69
tags: [recipes, rtos, event]
---

## 한 줄 요약

> **"Event group은 24비트 flag 묶음입니다."** 여러 비트의 set/clear, AND/OR 조건 대기, 한 번에 여러 task 깨우기까지 한 객체로 처리합니다.

## 어떤 상황에서 쓰나

"Wi-Fi 연결됨", "NTP 동기화 완료", "config 로드됨" 세 조건이 모두 갖춰져야 application task가 시작해야 하는 부팅 시나리오가 흔합니다. Semaphore 세 개로 take를 차례로 하면 순서가 강제되고 코드가 지저분해집니다. Event group은 세 비트의 AND wait 한 줄로 끝납니다.

반대로 한 task가 setting을 바꿨을 때 여러 subscriber task를 모두 깨우고 싶을 때도 event group이 답입니다. Queue는 1:1 또는 1:N broadcast가 안 됩니다.

## 핵심 개념

```text
EventBits_t = uint24_t (FreeRTOS) — 24개 bit
xEventGroupCreate            새 group
xEventGroupSetBits           특정 비트 set, wait중 task 깨움 여부 평가
xEventGroupClearBits         특정 비트 clear
xEventGroupWaitBits          AND or OR 조건 대기
xEventGroupSync              여러 task의 rendezvous
```

가장 중요한 API가 `xEventGroupWaitBits`입니다.

```c
EventBits_t got = xEventGroupWaitBits(
    eg,            /* event group */
    bits,          /* 어떤 bit를 기다리나 */
    clear_on_exit, /* return 직전에 clear할지 */
    wait_all,      /* AND(pdTRUE) vs OR(pdFALSE) */
    timeout);
```

이 4-옵션 조합이 거의 모든 동기화 패턴을 표현합니다.

## 코드 / 실제 사용 예

### 부팅 조건 wait (AND)

```c
#define BIT_WIFI    (1 << 0)
#define BIT_NTP     (1 << 1)
#define BIT_CFG     (1 << 2)

EventGroupHandle_t boot;

void task_wifi(void *arg) {
    wifi_connect();
    xEventGroupSetBits(boot, BIT_WIFI);
    vTaskDelete(NULL);
}

void task_ntp(void *arg) {
    xEventGroupWaitBits(boot, BIT_WIFI, pdFALSE, pdTRUE, portMAX_DELAY);
    ntp_sync();
    xEventGroupSetBits(boot, BIT_NTP);
    vTaskDelete(NULL);
}

void task_app(void *arg) {
    const EventBits_t all = BIT_WIFI | BIT_NTP | BIT_CFG;
    xEventGroupWaitBits(boot, all, pdFALSE, pdTRUE, portMAX_DELAY);   /* AND */
    application_main();
}

int main(void) {
    boot = xEventGroupCreate();
}
```

세 조건을 한 줄로 기다립니다. 어떤 순서로 set 되어도 모두 set되는 순간 task_app이 깨어납니다.

### Event 중 어느 하나라도 (OR)

```c
#define BIT_BUTTON   (1 << 0)
#define BIT_TIMEOUT  (1 << 1)
#define BIT_CMD      (1 << 2)

EventBits_t got = xEventGroupWaitBits(
    ui_events,
    BIT_BUTTON | BIT_TIMEOUT | BIT_CMD,
    pdTRUE,        /* return 시 clear */
    pdFALSE,       /* OR */
    pdMS_TO_TICKS(1000));

if (got & BIT_BUTTON)  handle_button();
if (got & BIT_TIMEOUT) handle_timeout();
if (got & BIT_CMD)     handle_cmd();
if (got == 0)          handle_no_event();   /* timeout */
```

여러 source 중 아무거나 들어오면 깨어나서 *어느 비트가 set 되었는지*를 확인합니다. `pdTRUE`로 clear 옵션을 주면 다음 wait를 위해 비트가 자동으로 비워집니다.

### Broadcast (1:N wake)

```c
EventGroupHandle_t cfg_changed;

void admin(void) {
    update_config();
    xEventGroupSetBits(cfg_changed, BIT_RELOAD);   /* 모든 wait task 깨움 */
}

void task_subscriber(void *arg) {
    for (;;) {
        xEventGroupWaitBits(cfg_changed, BIT_RELOAD, pdFALSE, pdTRUE, portMAX_DELAY);
        reload_local_state();
    }
}
```

여러 task가 같은 비트를 기다리면 set 한 번에 모두 깨어납니다. Subscriber 패턴을 RTOS primitive 하나로 구현할 수 있습니다.

### Sync barrier (`xEventGroupSync`)

```c
#define BIT_TASK_A   (1 << 0)
#define BIT_TASK_B   (1 << 1)
#define BIT_TASK_C   (1 << 2)
#define ALL_TASKS    (BIT_TASK_A | BIT_TASK_B | BIT_TASK_C)

void task_a(void *arg) {
    for (;;) {
        compute_part_a();
        xEventGroupSync(barrier, BIT_TASK_A, ALL_TASKS, portMAX_DELAY);
        /* 세 task 모두 도착한 후 진행 */
    }
}
```

세 task가 같은 지점에 모두 도착할 때까지 대기합니다. parallel 알고리즘의 phase 동기화에 깔끔합니다.

### ISR에서 set

```c
void EXTI_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    xEventGroupSetBitsFromISR(ui_events, BIT_BUTTON, &hp);
    portYIELD_FROM_ISR(hp);
}
```

`*FromISR` 변종은 daemon task에 메시지를 보내 set을 deferred 처리합니다. ISR 자체는 길어지지 않습니다.

## 측정 / 성능 비교

```text
연산                              시간 (Cortex-M4 72 MHz)
xEventGroupSetBits (waiter 0)     1.3 µs
xEventGroupSetBits (waiter 3)     5.6 µs  ← 3개 깨우기
xEventGroupWaitBits (already set) 0.9 µs
xEventGroupSync (3 task barrier)  8.1 µs
xEventGroupSetBitsFromISR         2.1 µs (deferred)
```

여러 task를 깨울수록 set 비용이 비례해 늘어납니다. ISR에서는 deferred 호출이므로 일정 latency가 더 듭니다.

```text
대체 비교
3 semaphore로 AND               9.0 µs (3 give + 3 take)
1 event group AND               2.0 µs
```

다중 조건 wait는 event group이 훨씬 효율적입니다.

## 자주 보는 함정

> Clear 타이밍 오류

```c
xEventGroupWaitBits(eg, BIT, pdFALSE, ...);   /* clear 안 함 */
/* 다음 cycle에도 즉시 return — busy loop */
```

매 cycle 새 event를 기다리려면 `clear_on_exit = pdTRUE` 또는 명시적 `xEventGroupClearBits`가 필요합니다.

> 24비트 한계 초과

```c
#define BIT_X   (1 << 24)   /* 사용 안 됨 — 상위 8비트는 system reserved */
```

FreeRTOS는 24비트만 사용자에게 줍니다. ZEPHYR k_event는 32비트, FreeRTOS는 24비트라는 점을 기억합니다.

> Race in set + clear

```c
xEventGroupSetBits(eg, B);
/* 다른 task가 즉시 clear할 수 있음 */
xEventGroupClearBits(eg, B);
```

Set과 clear가 다른 task에서 비동기로 일어나면 의도와 다른 상태가 됩니다. State 전이는 *한 owner*가 관리하는 패턴이 안전합니다.

> ISR에서 직접 `SetBits` 사용

```c
void IRQ(void) {
    xEventGroupSetBits(eg, BIT);   /* assert fail */
}
```

ISR에서는 반드시 `*FromISR` 변종을 씁니다. 일반 API는 critical section 보호가 다릅니다.

## 정리

- Event group은 24비트 flag 묶음으로 AND, OR, broadcast를 한 객체로 처리합니다.
- `xEventGroupWaitBits`의 4가지 옵션이 거의 모든 동기화 패턴을 표현합니다.
- 부팅 조건, multi-source dispatch, subscriber broadcast 패턴에 적합합니다.
- `xEventGroupSync`는 multi-task barrier 한 줄 구현입니다.
- ISR set은 deferred 처리이므로 latency가 일반 API보다 약간 큽니다.
- Clear 정책을 명확히 두고, 24비트 한계를 기억합니다.

다음 편은 **Software Timer**입니다. One-shot, auto-reload, timer task의 안전한 사용을 다룹니다.

## 관련 항목

- [PRTOS 3-08: Event Group Implementation](/blog/embedded/rtos/practical-internals/part3-08-event-group)
- [6-04: Semaphore 활용](/blog/embedded/modern-recipes/part6-04-semaphore-usage)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
- [6-08: Software Timer](/blog/embedded/modern-recipes/part6-08-software-timer)
