---
title: "RTOS Event Group 활용 — Bit Wait·Sync·Notify"
slug: "embedded/modern-recipes/part6-07-event-group"
date: 2026-04-15T09:06:00
description: "Event group bit, set/clear, AND/OR 조건 wait, broadcast로 다중 task synchronization을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 69
tags: [recipes, rtos, event]
topics: ["embedded"]
---

## 한 줄 요약

> **"Event group은 flag bit 묶음입니다(32-bit tick에서 24개)."** 여러 비트의 set/clear, AND/OR 조건 대기, 한 번에 여러 task 깨우기까지 한 객체로 처리합니다.

## 어떤 상황에서 쓰나

"Wi-Fi 연결됨", "NTP 동기화 완료", "config 로드됨" 세 조건이 모두 갖춰져야 application task가 시작하는 부팅을 생각해 봅니다. semaphore 세 개를 차례로 take하면 코드가 기다리는 순서를 정해 버립니다. event group은 세 bit의 AND 대기 한 번으로, 어느 순서로 set되든 마지막 bit가 set될 때 깨어납니다.

한 번의 set으로 같은 bit를 기다리는 여러 task를 모두 깨울 때도 씁니다. queue item은 한 receiver만 꺼내므로 이런 broadcast에는 맞지 않습니다.

실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385` `-icount shift=5`). 아래 코드 중 `wifi_connect()`, `handle_button()` 같은 함수는 애플리케이션 함수이고, 실행한 코드는 "측정" 절에 있습니다.

## 핵심 개념

`event_groups.h`는 `typedef TickType_t EventBits_t;`로 정의하고, 상위 8 bit를 control용 `eventEVENT_BITS_CONTROL_BYTES`(32-bit tick에서 `0xff000000U`)로 씁니다. 그래서 `configTICK_TYPE_WIDTH_IN_BITS`가 32면 사용자 bit는 24개, 16이면 8개입니다.

| API | 동작 |
|-----|------|
| `xEventGroupCreate` | 새 group |
| `xEventGroupSetBits` | 특정 비트 set, wait중 task 깨움 여부 평가 |
| `xEventGroupClearBits` | 특정 비트 clear |
| `xEventGroupWaitBits` | AND or OR 조건 대기 |
| `xEventGroupSync` | 여러 task의 rendezvous |

가장 중요한 API가 `xEventGroupWaitBits`입니다.

```c
EventBits_t got = xEventGroupWaitBits(
    eg,            /* event group */
    bits,          /* 어떤 bit를 기다리나 */
    clear_on_exit, /* return 직전에 clear할지 */
    wait_all,      /* AND(pdTRUE) vs OR(pdFALSE) */
    timeout);
```

bit mask, clear 여부, AND/OR, timeout 네 인자로 아래 패턴을 모두 씁니다.

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

세 조건을 한 번에 기다립니다. 어떤 순서로 set되어도 마지막 bit가 set되는 순간 `task_app`이 깨어납니다(아래 측정: tick 10, 20, 30에 set → tick 30).

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

bit 중 하나라도 set되면 깨어나고, 돌려받은 값으로 어느 bit였는지 봅니다. 세 번째 인자 `pdTRUE`는 돌아가기 전에 기다린 bit를 지웁니다. timeout이면 그 시점의 bit 값을 돌려주므로, 위처럼 `got == 0`이면 아무 bit도 없었던 것입니다.

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

같은 bit를 기다리는 task는 set 한 번에 모두 깨어납니다(아래 측정: 3개 중 3개). 이 예처럼 clear하지 않으면 bit가 남아 다음 wait가 바로 돌아오므로, 다시 기다리게 하려면 누가 언제 지울지 정해야 합니다.

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

`xEventGroupSync()`는 자기 bit를 set하고, 지정한 bit가 모두 set될 때까지 기다립니다. 세 task가 모두 도착하면 함께 진행합니다.

### ISR에서 set

```c
void EXTI_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    xEventGroupSetBitsFromISR(ui_events, BIT_BUTTON, &hp);
    portYIELD_FROM_ISR(hp);
}
```

`xEventGroupSetBitsFromISR()`은 bit를 그 자리에서 set하지 않고 `xTimerPendFunctionCallFromISR()`로 timer service task에 set을 맡깁니다(`event_groups.c`). 그래서 `INCLUDE_xTimerPendFunctionCall`과 `configUSE_TIMERS`가 1이어야 하고, 아래 측정처럼 ISR 안에서 바로 읽으면 bit는 아직 0입니다. 실제 set은 timer service task(이 설정에서 우선순위 7)가 돌 때 일어납니다.

## 측정

AND 대기, broadcast, ISR에서의 set, clear하지 않은 wait, bit 24를 한 프로그램에서 차례로 돌렸습니다.

```c
#define INCLUDE_xTimerPendFunctionCall 1
```

```c
/* eg.c: event group behaviours on FreeRTOS V11.2.0 (build with EXTRA_CONFIG pend.h) */
#include "FreeRTOS.h"
#include "task.h"
#include "event_groups.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

#define TIMER0_CTRL   (*(volatile uint32_t *)0x40000000)
#define TIMER0_RELOAD (*(volatile uint32_t *)0x40000008)
#define TIMER0_INTCLR (*(volatile uint32_t *)0x4000000C)
#define NVIC_ISER0    (*(volatile uint32_t *)0xE000E100)
#define NVIC_IPR8     (*(volatile uint8_t  *)0xE000E408)

#define BIT_WIFI (1u << 0)
#define BIT_NTP  (1u << 1)
#define BIT_CFG  (1u << 2)
#define BIT_BTN  (1u << 3)
#define BIT_RLD  (1u << 4)

static EventGroupHandle_t eg;
static volatile EventBits_t seen_in_isr = 0xFFFFFFFFu;

static void setter(void *arg) {                    /* sets one bit after a delay */
    uint32_t v = (uint32_t)arg;
    vTaskDelay(v >> 8);
    xEventGroupSetBits(eg, v & 0xFF);
    vTaskDelete(NULL);
}

static void app(void *arg) {
    (void)arg;
    xEventGroupWaitBits(eg, BIT_WIFI | BIT_NTP | BIT_CFG, pdFALSE, pdTRUE, portMAX_DELAY);
    pr("AND: all three set, app runs at tick %u\n", (unsigned)xTaskGetTickCount());
    vTaskDelete(NULL);
}

static volatile int woke;
static void subscriber(void *arg) {
    (void)arg;
    xEventGroupWaitBits(eg, BIT_RLD, pdFALSE, pdTRUE, portMAX_DELAY);
    woke++;
    vTaskDelete(NULL);
}

void TIMER0_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    TIMER0_INTCLR = 1;
    TIMER0_CTRL = 0;                               /* one shot */
    xEventGroupSetBitsFromISR(eg, BIT_BTN, &hp);
    seen_in_isr = xEventGroupGetBitsFromISR(eg) & BIT_BTN;
    portYIELD_FROM_ISR(hp);
}

static void control(void *arg) {
    (void)arg;
    vTaskDelay(40);
    for (int i = 0; i < 3; i++) xTaskCreate(subscriber, "s", 256, NULL, 2, NULL);
    vTaskDelay(1);
    xEventGroupSetBits(eg, BIT_RLD);
    vTaskDelay(1);                                 /* let the prio-2 subscribers run */
    pr("broadcast: one SetBits woke %d of 3 subscribers\n", woke);

    NVIC_IPR8 = 6u << 5; NVIC_ISER0 = 1u << 8;
    TIMER0_RELOAD = 25000000u / 1000u; TIMER0_CTRL = (1u << 3) | 1u;
    xEventGroupWaitBits(eg, BIT_BTN, pdTRUE, pdTRUE, portMAX_DELAY);
    pr("FromISR: bit read inside the ISR right after the call = %u, task woke later\n",
       (unsigned)seen_in_isr);

    int n = 0;
    TickType_t t0 = xTaskGetTickCount();
    while (xTaskGetTickCount() == t0 && n < 1000)  /* bit still set: returns at once */
        { xEventGroupWaitBits(eg, BIT_WIFI, pdFALSE, pdTRUE, portMAX_DELAY); n++; }
    pr("clear_on_exit = pdFALSE: %d waits returned within one tick\n", n);

    pr("setting bit 24 ...\n");
    xEventGroupSetBits(eg, 1u << 24);
    hosted_exit(0);
}

int main(void) {
    eg = xEventGroupCreate();
    xTaskCreate(setter, "w", 256, (void *)((30u << 8) | BIT_WIFI), 1, NULL);
    xTaskCreate(setter, "n", 256, (void *)((10u << 8) | BIT_NTP), 1, NULL);
    xTaskCreate(setter, "c", 256, (void *)((20u << 8) | BIT_CFG), 1, NULL);
    xTaskCreate(app, "app", 256, NULL, 2, NULL);
    xTaskCreate(control, "ctl", 256, NULL, 3, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh eg.c -I. -DEXTRA_CONFIG='"pend.h"' && qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel eg.elf
```

```text
AND: all three set, app runs at tick 30
broadcast: one SetBits woke 3 of 3 subscribers
FromISR: bit read inside the ISR right after the call = 0, task woke later
clear_on_exit = pdFALSE: 268 waits returned within one tick
setting bit 24 ...
ASSERT failed: event_groups.c line 563
```

- tick 10(NTP), 20(CFG), 30(WIFI)에 set된 세 bit를 AND로 기다린 task는 마지막 set인 tick 30에 깨어났습니다.
- `xEventGroupSetBits()` 한 번이 같은 bit를 기다리던 subscriber 셋을 모두 깨웠습니다.
- `xEventGroupSetBitsFromISR()` 직후 ISR 안에서 읽은 bit는 0이었고, 기다리던 task는 그 뒤 timer service task가 set한 다음 깨어났습니다.
- bit를 지우지 않고 같은 bit를 기다리면 wait가 곧바로 돌아와, 한 tick 안에 268번 돌았습니다.
- bit 24를 set하면 `event_groups.c` 563행 `configASSERT( ( uxBitsToSet & eventEVENT_BITS_CONTROL_BYTES ) == 0 )`에서 멈췄습니다.

## 자주 보는 함정

> Clear 타이밍 오류

```c
xEventGroupWaitBits(eg, BIT, pdFALSE, ...);   /* clear 안 함 */
/* 다음 cycle에도 즉시 return — busy loop */
```

위 측정처럼 한 tick에 수백 번 돌아옵니다. 매번 새 event를 기다리려면 `clear_on_exit = pdTRUE`나 `xEventGroupClearBits()`로 지웁니다.

> 24비트 한계 초과

```c
#define BIT_X   (1u << 24)   /* control byte: configASSERT fires */
```

32-bit tick에서 bit 24–31은 control byte라 위 측정처럼 `configASSERT`에 걸립니다. 16-bit tick(`TICK_TYPE_WIDTH_16_BITS`)이면 사용자 bit는 0–7뿐입니다.

> Race in set + clear

```c
xEventGroupSetBits(eg, B);
/* another task may clear it here */
xEventGroupClearBits(eg, B);
```

set과 clear가 서로 다른 task에서 일어나면, 기다리던 task가 깨어나기 전에 bit가 지워져 event를 놓칠 수 있습니다. 한 bit를 지우는 쪽은 한 곳으로 정합니다.

> ISR에서 직접 `SetBits` 사용

```c
void IRQ(void) {
    xEventGroupSetBits(eg, BIT);   /* task-only API */
}
```

`xEventGroupSetBits()`는 `vTaskSuspendAll()`로 scheduler를 멈춘 채 대기 list를 훑는 task용 API입니다. ISR에서는 `xEventGroupSetBitsFromISR()`을 씁니다.

## 정리

- Event group은 32-bit tick에서 **사용자 bit 24개**(bit 24–31은 control)이고, AND·OR·broadcast를 한 객체로 처리합니다.
- 부팅 조건, multi-source dispatch, subscriber broadcast 패턴에 적합합니다.
- `xEventGroupSync`는 multi-task barrier 한 줄 구현입니다.
- ISR set은 **timer service task로 미뤄지므로** 그 task의 우선순위와 `INCLUDE_xTimerPendFunctionCall`이 관여합니다.
- 누가 언제 bit를 지울지 정합니다. 지우지 않으면 wait가 곧바로 돌아옵니다.

다음 편은 **Software Timer**입니다. One-shot, auto-reload, timer task의 안전한 사용을 다룹니다.

## 관련 항목

- [PRTOS 3-08: Event Group Implementation](/blog/embedded/rtos/practical-internals/part3-08-event-group)
- [6-04: Semaphore 활용](/blog/embedded/modern-recipes/part6-04-semaphore-usage)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
- [6-08: Software Timer](/blog/embedded/modern-recipes/part6-08-software-timer)
