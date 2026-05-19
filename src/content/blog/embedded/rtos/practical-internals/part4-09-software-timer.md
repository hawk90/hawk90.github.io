---
title: "4-09: Software Timer — Daemon Task, 자료구조, ISR-Safe API"
date: 2026-05-07T21:00:00
description: "FreeRTOS Software Timer 내부를 따라가며 daemon task 구조, sorted list와 timer wheel 자료구조, one-shot/auto-reload 동작, xTimerStartFromISR과 xTimerPendFunctionCall을 통한 ISR 워크 deferral을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 41
tags: [software-timer, daemon, callback, timer-wheel]
---

## 한 줄 요약

> **"Software Timer는 하나의 hardware tick으로 수많은 software 만기를 관리합니다."** — 정확도는 떨어지지만 갯수가 사실상 무제한입니다.

## 어떤 문제를 푸는가

hardware timer는 정확합니다. STM32 TIM2 같은 peripheral은 *수십 ns 단위*로 만기를 잡고 ISR을 직접 호출합니다. 다만 그 수가 한정적입니다. STM32F4에 들어 있는 general-purpose timer는 10개 남짓에 불과합니다.

현실 시스템은 *수십~수백 개의 timeout*을 동시에 관리합니다. TCP retransmit timer, watchdog kick, LED blink, 센서 polling, session timeout, heartbeat. 모두에 hardware timer를 하나씩 붙일 수는 없습니다.

해결책이 software timer입니다. 단 *하나의 hardware tick*만 받고, 그 위에서 *수많은 software timer를 sorted 구조로 관리*합니다. tick마다 가장 가까운 만기를 검사해 expire된 timer의 callback을 실행합니다.

대표 구현이 FreeRTOS의 timer service task입니다. 이번 편은 이 구조의 자료구조 선택과 ISR-safe API를 풀어 봅니다.

## Hardware vs Software Timer

| 항목 | Hardware Timer | Software Timer |
|---|---|---|
| 정확도 | cycle 단위 | tick 단위 (보통 1~10 ms) |
| 갯수 | peripheral 수 | 메모리만큼 |
| 만기 처리 | IRQ에서 직접 | daemon task의 callback |
| 비용 | 매우 낮음 | tick + daemon overhead |
| 적합 용도 | 정확 주기 control loop | 일반 timeout, LED, polling |

RT 제어 루프처럼 *주기 정확성이 핵심*인 작업은 hardware timer가 맞습니다. 반대로 watchdog 갱신이나 session timeout처럼 *수 ms 오차가 무관한 작업*은 software timer가 효율적입니다.

## FreeRTOS Timer 구조

각 timer는 *list item + 만기 tick + period + callback*을 가진 구조체입니다.

```c
typedef struct timer_t {
    char                    *name;
    ListItem_t               list_item;   /* sorted list 노드 */
    TickType_t               period;
    UBaseType_t              auto_reload;
    void                    *id;
    TimerCallbackFunction_t  callback;
} Timer_t;
```

활성 timer들은 *만기 tick 오름차순*의 단일 list에 매달려 있습니다. head가 *가장 빨리 만료될 timer*입니다.

## Timer Service Task — Daemon

FreeRTOS는 timer 처리를 위한 *전용 task*를 부팅 시 자동으로 만듭니다. 일반적으로 `Tmr Svc`라는 이름으로 보이는 그 task입니다.

```c
void prvTimerTask(void *p) {
    for (;;) {
        TickType_t now = xTaskGetTickCount();

        /* 1. 만기 도달한 timer들 처리 */
        while (head && head->expiry_tick <= now) {
            Timer_t *t = pop_head(timer_list);
            t->callback(t);
            if (t->auto_reload) {
                t->expiry_tick = now + t->period;
                insert_sorted(t);
            }
        }

        /* 2. 다음 만기까지 또는 새 command까지 wait */
        TickType_t wait = head
                          ? head->expiry_tick - now
                          : portMAX_DELAY;
        TimerCmd_t cmd;
        if (xQueueReceive(timer_cmd_queue, &cmd, wait)) {
            process_command(&cmd);
        }
    }
}
```

핵심은 *tick ISR이 직접 callback을 호출하지 않는다*는 것입니다. SysTick은 tick count만 증가시키고, *daemon task가 깨어나 처리*합니다. 이 한 단계가 *callback을 task 컨텍스트*에서 실행하게 하여 RTOS API 호출을 안전하게 만듭니다.

`configTIMER_TASK_PRIORITY`로 daemon priority를 정합니다. 일반적으로 *높은 priority*를 줘서 timer 처리가 다른 task에 밀리지 않게 합니다.

## 자료구조 — Sorted List, Delta List, Timer Wheel, Heap

만기가 가까운 순서를 빠르게 찾아야 합니다. 자료구조 선택이 *전체 timer 시스템의 비용 곡선*을 결정합니다.

### Sorted List

가장 단순합니다. 만기 tick 오름차순으로 linked list를 유지합니다.

- **insert** — O(N), 적절한 위치 찾기
- **expire check** — O(1), head만 확인
- **pop expired** — O(1)

timer 수가 적으면(수십 개) 충분합니다. FreeRTOS가 이 구조를 씁니다.

### Delta List

각 노드가 *절대 만기*가 아닌 *앞 노드와의 차이*를 저장합니다.

```text
head → +5 → +3 → +10 → +2 → ...
```

tick마다 head의 delta만 1 감소시키면 됩니다. insert 비용은 sorted list와 같지만 *tick 처리가 O(1)*입니다. tick ISR에서 직접 처리하는 시스템에 적합합니다.

### Timer Wheel

원형 배열을 시계처럼 사용합니다. 각 slot이 *그 시각에 만료될 timer들의 list*를 가집니다.

```text
slot[0]   → timer A, timer B
slot[1]   → (empty)
slot[2]   → timer C
...
slot[N-1] → timer D
```

- **insert** — O(1), `slot index = expiry_tick % N`
- **expire check** — O(slot 안 timer 수), 보통 O(1)

Linux kernel의 `hrtimer`는 *hierarchical timer wheel*을 씁니다. 수 ms 정확도에서 *수천 개 timer를 O(1)*로 다룹니다.

### Min-Heap

priority queue로 구현하면 *insert와 pop 모두 O(log N)*입니다. Linux `posix-timers`가 이 구조 위에서 동작합니다.

### 비교

| Timer 수 | Sorted list | Min-heap | Timer wheel |
|---|---|---|---|
| 10 | insert 5 cycle 평균 | — | 4 cycle (slot 접근) |
| 1000 | 500 cycle 평균 (worst 1000) | ~30 cycle (log₂ 1000 ≈ 10) | 4 cycle |
| 10000 | 사실상 못 씀 | ~40 cycle | 4 cycle |

embedded에서 timer 수가 수십 개라면 sorted list로 충분합니다. 수백 개 이상이면 wheel이 답입니다.

## API 사용

FreeRTOS의 timer API는 모두 *command를 timer queue로 보내는 형태*입니다. 실제 작업은 daemon이 합니다.

```c
TimerHandle_t led = xTimerCreate(
    "LED",                       /* name */
    pdMS_TO_TICKS(500),          /* period */
    pdTRUE,                      /* auto-reload */
    (void*)0,                    /* timer id */
    led_callback);                /* callback */

xTimerStart(led, 0);                                 /* 시작 */
xTimerStop(led, 0);                                  /* 정지 */
xTimerReset(led, 0);                                 /* 만기 시각 = now + period */
xTimerChangePeriod(led, pdMS_TO_TICKS(1000), 0);    /* 주기 변경 */
xTimerDelete(led, 0);                                /* 제거 */
```

마지막 인자는 *command queue가 가득 찼을 때 block할 tick 수*입니다. 0이면 immediate fail/return입니다.

## One-Shot vs Auto-Reload

```c
/* One-shot — 한 번 발화 후 자동 stop */
TimerHandle_t once = xTimerCreate(
    "delay", pdMS_TO_TICKS(1000), pdFALSE, NULL, cb);
xTimerStart(once, 0);
/* callback 한 번 실행 후 timer는 dormant 상태. 다시 start 호출로 재실행 */

/* Auto-reload — 주기적 발화 */
TimerHandle_t periodic = xTimerCreate(
    "tick", pdMS_TO_TICKS(100), pdTRUE, NULL, cb);
xTimerStart(periodic, 0);
/* 매 100 ms마다 callback 자동 호출 */
```

one-shot은 *timeout 처리*에, auto-reload는 *주기 작업*에 씁니다.

## Callback Context — Daemon Task에서 실행

callback은 *daemon task 컨텍스트*에서 실행됩니다. 일반 task API를 모두 호출할 수 있습니다.

```c
static void worker_callback(TimerHandle_t t) {
    /* daemon task context — RTOS API 모두 사용 가능 */
    int id = (int)pvTimerGetTimerID(t);
    work_item_t w = make_work(id);
    xQueueSend(work_queue, &w, 0);
}
```

다만 *callback이 길어지면 모든 timer가 늦어집니다*. daemon이 한 callback을 처리하는 동안 다른 timer는 처리되지 않기 때문입니다.

```c
static void bad_callback(TimerHandle_t t) {
    vTaskDelay(pdMS_TO_TICKS(100));   /* daemon이 100 ms 동안 멈춤 */
    process_heavy();                   /* 다른 timer 모두 지연 */
}
```

원칙은 *callback은 짧게, 무거운 일은 work queue로 defer*입니다.

## ISR-Safe API

ISR에서는 일반 API 대신 `*FromISR` 변형을 씁니다.

```c
void some_isr(void) {
    BaseType_t higher_prio_woken = pdFALSE;

    xTimerStartFromISR(t, &higher_prio_woken);
    xTimerStopFromISR(t, &higher_prio_woken);
    xTimerResetFromISR(t, &higher_prio_woken);

    portYIELD_FROM_ISR(higher_prio_woken);
}
```

내부적으로 *interrupt-safe queue API*로 command를 daemon에 전달합니다. daemon이 그 명령을 받아 *task 컨텍스트*에서 처리하므로 *ISR이 timer 자료구조를 직접 만지지 않습니다*.

## xTimerPendFunctionCall — 임의 함수 Deferral

timer 자체가 필요 없을 때도 daemon을 *워크 deferral 큐*로 활용할 수 있습니다.

```c
static void deferred_work(void *arg1, uint32_t arg2) {
    /* daemon task context */
    process_isr_event((int)arg2, arg1);
}

void __attribute__((interrupt)) some_isr(void) {
    BaseType_t higher_prio_woken = pdFALSE;
    xTimerPendFunctionCallFromISR(
        deferred_work,
        event_data,
        event_id,
        &higher_prio_woken);
    portYIELD_FROM_ISR(higher_prio_woken);
}
```

ISR에서 *복잡한 처리를 직접 하지 않고* daemon으로 미루는 *deferred interrupt handling*의 전형입니다. ISR을 짧게 유지하면서 task 컨텍스트의 자유로움을 얻습니다.

## 정확도 한계

software timer의 정확도는 *tick 주기 + daemon scheduling*의 합으로 제한됩니다.

`configTICK_RATE_HZ = 100`이면 tick 주기는 10 ms입니다. timer 만기를 50 ms로 설정하면 5 tick 후에 daemon이 처리합니다.

- **best case** — 50.0 ms
- **worst case** — 50 ms + daemon 대기 + 다른 callback 처리 시간 → 보통 51~52 ms, 부하 심하면 60+ ms

수 µs 정확도가 필요한 control loop은 *hardware timer + semaphore*로 가야 합니다.

```c
/* Hardware timer ISR */
void TIM2_IRQHandler(void) {
    HAL_TIM_IRQHandler(&brake_tim);
}

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *t) {
    if (t == &brake_tim) {
        BaseType_t hp = pdFALSE;
        xSemaphoreGiveFromISR(brake_sem, &hp);
        portYIELD_FROM_ISR(hp);
    }
}

/* 제어 task — 1 ms 정확 주기 */
void brake_task(void *p) {
    for (;;) {
        xSemaphoreTake(brake_sem, portMAX_DELAY);
        do_brake_cycle();
    }
}
```

hardware timer가 *정확한 주기*를, semaphore가 *task 컨텍스트로의 전달*을 담당합니다.

## Tickless Idle — Battery 시스템

저전력이 중요한 IoT에서는 *tick 자체를 끄고* 다음 만기에 깨어나는 *tickless* 모드를 씁니다.

```c
#define configUSE_TICKLESS_IDLE 1
```

```c
void portSUPPRESS_TICKS_AND_SLEEP(TickType_t idle_ticks) {
    /* 다음 만기에 맞춰 SysTick reload */
    uint32_t reload = idle_ticks * cycles_per_tick - 1;
    SysTick->LOAD = reload;
    SysTick->VAL  = 0;

    __WFI();   /* sleep */

    /* 깨어난 뒤 실제 경과 tick 보정 */
    TickType_t actual = compute_elapsed();
    vTaskStepTick(actual);
}
```

활성 timer 중 가장 가까운 만기까지 *MCU 전체가 sleep*하므로 평균 전류가 *수십 µA* 수준으로 떨어집니다. 배터리 IoT 펌웨어의 표준입니다.

## 자주 보는 함정과 안티패턴

> 경고 — callback에서 긴 작업

```c
static void cb(TimerHandle_t t) {
    long_blocking_io();         /* 다른 timer 모두 정지 */
    vTaskDelay(pdMS_TO_TICKS(100));   /* daemon이 100 ms 멈춤 */
}
```

callback은 *수 µs 안에* 끝내거나 *signal만 보내고 즉시 return*하는 형태로 짭니다.

> 경고 — daemon priority가 너무 낮음

```c
#define configTIMER_TASK_PRIORITY 1   /* 다른 task가 daemon을 자주 막음 */
```

낮은 priority면 timer 정확도가 떨어지고 callback이 *수 tick씩 늦게 호출*됩니다. 일반적으로 *application의 highest priority 근처*로 둡니다.

> 경고 — timer command queue가 너무 작음

```c
#define configTIMER_QUEUE_LENGTH 5   /* burst 시 overflow */
```

`xTimerStart`가 silent fail하기 시작합니다. 동시에 만지는 timer 수의 *2~3배 이상*으로 잡습니다.

> 경고 — ISR에서 task API 사용

```c
void isr(void) {
    xTimerStart(t, 0);    /* 잘못 — `*FromISR` 변형 필요 */
}
```

immediate hard fault가 나지 않고 *silent 자료구조 corruption*으로 이어지는 경우가 많습니다. `xTimerStartFromISR`로 교체합니다.

## 정리

- Software timer는 *하나의 hardware tick으로 수많은 software 만기*를 관리하며, 갯수 제한 없이 timeout, polling, blink 같은 작업을 처리합니다.
- 만기 처리는 *daemon task*에서 수행되어 callback이 *task 컨텍스트*에서 동작합니다.
- 자료구조는 *sorted list, delta list, timer wheel, min-heap* 중에서 timer 수와 정확도 요구에 맞춰 고릅니다. 수십 개면 sorted list, 수백 이상이면 wheel이 합리적입니다.
- one-shot은 timeout에, auto-reload는 주기 작업에 어울리며, callback은 *짧게 + signal*이 원칙입니다.
- ISR에서는 `*FromISR` 변형과 `xTimerPendFunctionCall`로 *작업을 daemon에 deferral*합니다.
- µs 단위 정확도가 필요하면 *hardware timer + semaphore* 조합으로 가야 합니다.
- 저전력이 중요하면 *tickless idle*로 sleep 시간을 극대화합니다.

다음 편은 [4-10 System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)에서 user/kernel 모드 분리와 SVC trap을 다룹니다.

## 관련 항목

- [2-08: Tick Timer](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
