---
title: "Ch 5: Software Timer Management"
date: 2026-05-09T05:00:00
description: "xTimerCreate·one-shot·auto-reload — 타이머 데몬과 콜백."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 5
tags: [freertos, timer, callback, daemon]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: false
---

## 한 줄 요약

> **"소프트웨어 타이머는 *전용 타이머 데몬 태스크 안에서 콜백이 실행되는 가벼운 시간 이벤트*입니다. 데몬은 *내부 큐로 명령을 받기 때문에 콜백 안에서 블로킹 호출을 하면 모든 타이머가 죽습니다*."**

태스크를 *주기 일을 위해 만들기에는 무거울 때*, 또는 *수십 개의 짧은 주기 일을 한 곳에서 처리하고 싶을 때* 소프트웨어 타이머가 답입니다. 한 *타이머 데몬 태스크*가 모든 타이머의 콜백을 실행하므로 *RAM이 절약*되고, 콜백은 *우선순위가 데몬과 같습니다*.

이번 장에서는 *타이머 데몬의 정체*, *`xTimerCreate`의 시그니처*, *one-shot vs auto-reload*, *콜백 안에서 지켜야 할 규칙*, *Timer ID로 인스턴스 식별*, *데몬 우선순위 결정*을 다룹니다.

## 활성화 — configUSE_TIMERS

```c
/* FreeRTOSConfig.h */
#define configUSE_TIMERS                        1
#define configTIMER_TASK_PRIORITY               (configMAX_PRIORITIES - 1)
#define configTIMER_QUEUE_LENGTH                10
#define configTIMER_TASK_STACK_DEPTH            (configMINIMAL_STACK_SIZE * 2)
```

`configUSE_TIMERS=1`이면 `vTaskStartScheduler` 안에서 *타이머 데몬 태스크가 자동 생성*됩니다. *콜백 실행을 책임지는 단일 태스크*입니다.

빌드에는 *`Source/timers.c`*를 포함해야 합니다.

## 타이머 데몬의 구조

```text
                          ┌──────────────────────────────┐
                          │       Timer Daemon Task      │
                          │  (configTIMER_TASK_PRIORITY) │
                          │                              │
   xTimerStart()  ──────► │  command queue (length=10)   │
   xTimerStop()           │  ┌──┬──┬──┬──┬──┬──┬──┐      │
   xTimerReset() ───────► │  │  │  │  │  │  │  │  │      │
   xTimerChangePeriod()   │  └──┴──┴──┴──┴──┴──┴──┘      │
                          │                              │
                          │  active timer list (정렬)    │
                          │   ─ Timer A: 다음 expire 10ms │
                          │   ─ Timer B: 다음 expire 50ms │
                          │   ─ Timer C: 다음 expire 100ms│
                          │                              │
                          │  loop:                       │
                          │   1. 다음 expire까지 wait    │
                          │   2. expire한 타이머 콜백 호출│ ──► callback()
                          │   3. command queue 처리      │
                          └──────────────────────────────┘
```

핵심은 *두 가지*입니다.

1. *데몬은 큐로 명령을 받는다* — `xTimerStart` 같은 API는 *큐에 명령을 넣을 뿐* 즉시 시작이 아닙니다. 데몬이 *순차적으로 처리*합니다.
2. *콜백이 데몬 안에서 실행된다* — 콜백이 *블로킹하면 다음 타이머가 모두 지연*됩니다.

## xTimerCreate — 시그니처

```c
TimerHandle_t xTimerCreate(
    const char * const   pcTimerName,
    const TickType_t     xTimerPeriodInTicks,
    const UBaseType_t    uxAutoReload,        /* pdTRUE = auto-reload */
    void * const         pvTimerID,
    TimerCallbackFunction_t pxCallbackFunction
);
```

| 인자 | 의미 |
|------|------|
| `pcTimerName` | 디버그용 이름 |
| `xTimerPeriodInTicks` | 주기 (tick). `pdMS_TO_TICKS` 권장 |
| `uxAutoReload` | `pdTRUE` = 반복, `pdFALSE` = one-shot |
| `pvTimerID` | 타이머에 붙이는 사용자 데이터 (포인터 또는 정수) |
| `pxCallbackFunction` | expire 시 호출될 함수 |

콜백 시그니처는 *고정*입니다.

```c
void Callback(TimerHandle_t xTimer);
```

타이머 핸들이 *인자로 들어오므로 콜백 내부에서 어떤 타이머인지 식별*할 수 있습니다.

## 첫 예제 — Blink 250ms

```c
static TimerHandle_t xBlinkTimer;

static void prvBlinkCallback(TimerHandle_t xTimer)
{
    (void)xTimer;
    HAL_GPIO_TogglePin(LED_PORT, LED_PIN);
}

int main(void) {
    HAL_Init();
    SystemClock_Config();
    led_init();

    xBlinkTimer = xTimerCreate(
        "Blink",
        pdMS_TO_TICKS(250),
        pdTRUE,                   /* auto-reload */
        NULL,
        prvBlinkCallback
    );
    configASSERT(xBlinkTimer != NULL);

    xTimerStart(xBlinkTimer, 0);

    vTaskStartScheduler();
    for(;;);
}
```

이 한 예제에 *별도의 태스크가 없습니다*. 데몬이 모든 일을 합니다.

## One-Shot vs Auto-Reload

```text
auto-reload (uxAutoReload=pdTRUE)
   T0  T1  T2  T3 ...
    ↓   ↓   ↓   ↓
    cb  cb  cb  cb       콜백이 주기적으로 반복
    period 마다

one-shot (uxAutoReload=pdFALSE)
   T0
    ↓
    cb                   한 번만 호출 후 dormant 상태
                         xTimerStart로 다시 시작 가능
```

| 용도 | 종류 |
|------|------|
| LED blink, polling, 주기 task | auto-reload |
| 디바운스, watchdog 일회성, retry 후 1회 | one-shot |
| 통신 타임아웃 | one-shot |

one-shot 타이머는 *expire 후에도 핸들이 유효*합니다. `xTimerStart`로 *재시작 가능*하고, `xTimerChangePeriod`로 주기를 바꿔 다시 시작할 수도 있습니다.

## API 모음

```c
BaseType_t xTimerStart(TimerHandle_t, TickType_t xBlockTime);
BaseType_t xTimerStop(TimerHandle_t, TickType_t xBlockTime);
BaseType_t xTimerReset(TimerHandle_t, TickType_t xBlockTime);
BaseType_t xTimerChangePeriod(TimerHandle_t, TickType_t newPeriod, TickType_t xBlockTime);
BaseType_t xTimerDelete(TimerHandle_t, TickType_t xBlockTime);

BaseType_t xTimerIsTimerActive(TimerHandle_t);
void *pvTimerGetTimerID(TimerHandle_t);
void  vTimerSetTimerID(TimerHandle_t, void *pvNewID);
```

`xBlockTime`은 *명령 큐에 명령을 넣는 동안의 timeout*입니다. 큐가 가득 차 있으면 그만큼 기다립니다. 보통 `0` 또는 `portMAX_DELAY`입니다.

### xTimerReset의 의미

자주 헷갈리는 게 *`xTimerReset`*입니다. 이미 실행 중인 타이머에 호출하면 *남은 시간을 초기화해서 처음부터 다시 카운트*합니다. 디바운스에 유용합니다.

```c
/* 버튼 디바운스: ISR이 trigger되면 50ms timer reset
   50ms 동안 새 trigger가 없어야 콜백 실행 */
static TimerHandle_t xDebounceTimer;

void EXTI0_IRQHandler(void) {
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    xTimerResetFromISR(xDebounceTimer, &xHigherPriorityTaskWoken);
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}

static void prvDebounceCallback(TimerHandle_t xTimer) {
    /* 50ms 안에 새 인터럽트가 없었으므로 진짜 button press */
    handle_button_press();
}
```

## Timer ID로 인스턴스 식별

같은 콜백을 *여러 타이머가 공유*하면 *어느 타이머가 expire했는지* 알아야 합니다. *Timer ID*가 그 식별자입니다.

```c
typedef enum { CH_RED, CH_GREEN, CH_BLUE } LedCh_t;

static void prvLedCallback(TimerHandle_t xTimer)
{
    LedCh_t ch = (LedCh_t)(uintptr_t)pvTimerGetTimerID(xTimer);
    switch(ch) {
        case CH_RED:   toggle_led(LED_R); break;
        case CH_GREEN: toggle_led(LED_G); break;
        case CH_BLUE:  toggle_led(LED_B); break;
    }
}

void init_leds(void) {
    TimerHandle_t r = xTimerCreate("R", pdMS_TO_TICKS(500), pdTRUE,
                                    (void *)(uintptr_t)CH_RED,  prvLedCallback);
    TimerHandle_t g = xTimerCreate("G", pdMS_TO_TICKS(300), pdTRUE,
                                    (void *)(uintptr_t)CH_GREEN, prvLedCallback);
    TimerHandle_t b = xTimerCreate("B", pdMS_TO_TICKS(700), pdTRUE,
                                    (void *)(uintptr_t)CH_BLUE,  prvLedCallback);
    xTimerStart(r, 0);
    xTimerStart(g, 0);
    xTimerStart(b, 0);
}
```

ID로 *구조체 포인터*를 넘기면 *더 많은 컨텍스트*를 콜백이 볼 수 있습니다.

```c
typedef struct {
    GPIO_TypeDef *port;
    uint16_t      pin;
    uint32_t      period_ms;
} BlinkCtx_t;

static void prvBlinkWithCtx(TimerHandle_t xTimer) {
    BlinkCtx_t *ctx = pvTimerGetTimerID(xTimer);
    HAL_GPIO_TogglePin(ctx->port, ctx->pin);
}
```

## 콜백 안에서 지켜야 할 규칙

타이머 데몬 안에서 콜백이 *직렬로* 실행됩니다. 따라서 *한 콜백이 길어지면 모든 타이머가 밀립니다*.

```text
규칙
1. 콜백은 짧게 (μs~ms 단위)
2. 콜백에서 블로킹 API 호출 금지
   → xQueueSend(..., portMAX_DELAY) 같은 호출 금지
   → vTaskDelay 호출 금지
3. 콜백에서 무거운 작업은 task notify·queue로 다른 태스크에 위임
4. 콜백 안에서 다른 타이머 API 호출은 OK (큐로 넣을 뿐)
```

블로킹 작업을 해야 하면 *콜백은 신호만 보내고 실제 일은 worker 태스크에서* 합니다.

```c
static SemaphoreHandle_t xWorkSem;

static void prvTimerCallback(TimerHandle_t xTimer) {
    /* 무거운 일은 worker에게 위임 */
    xSemaphoreGive(xWorkSem);
}

void prvWorkerTask(void *pv) {
    for(;;) {
        xSemaphoreTake(xWorkSem, portMAX_DELAY);
        do_heavy_work();   /* 여기서 블로킹·계산 자유 */
    }
}
```

## 데몬 우선순위 결정

`configTIMER_TASK_PRIORITY`가 데몬의 우선순위입니다.

```text
높게 (configMAX_PRIORITIES-1)
  + 정확한 시간 응답 (다른 일이 데몬을 지연시키지 않음)
  - 콜백이 길면 다른 모든 일이 멈춤

낮게 (1 또는 2)
  + 데몬이 다른 응답성에 영향 줄 일이 적음
  - 다른 태스크가 비잡으면 콜백이 지연됨
```

대부분은 *높은 우선순위 + 콜백 짧게*가 정답입니다. 콜백을 진짜 짧게 유지하면 *데몬이 항상 빨리 끝나 응답성에 영향이 미미*합니다.

## 명령 큐 길이

`configTIMER_QUEUE_LENGTH`가 *명령 큐의 깊이*입니다. ISR에서 *짧은 시간에 많은 타이머 명령을 한꺼번에 보내는* 워크로드는 *이 큐가 가득 차서 명령이 실패*할 수 있습니다.

```c
/* xTimerStart의 반환값 검사 */
if(xTimerStart(xT, pdMS_TO_TICKS(10)) != pdPASS) {
    /* 명령 큐 가득 → 다음 기회에 재시도 */
    pending_starts++;
}
```

큐 길이를 *최악 한 tick 동안의 명령 수 이상*으로 설정합니다. 기본 10이면 보통 충분합니다.

## ISR-Safe 변형

```c
xTimerStartFromISR(xTimer, &xHigherPriorityTaskWoken);
xTimerStopFromISR(xTimer, &xHigherPriorityTaskWoken);
xTimerResetFromISR(xTimer, &xHigherPriorityTaskWoken);
xTimerChangePeriodFromISR(xTimer, newPeriod, &xHigherPriorityTaskWoken);
```

```c
void EXTI3_IRQHandler(void) {
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    xTimerStartFromISR(xRetryTimer, &xHigherPriorityTaskWoken);
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}
```

## Hardware Timer와의 비교

| 항목 | 소프트웨어 타이머 | 하드웨어 타이머 |
|------|----------------|---------------|
| 해상도 | tick (`configTICK_RATE_HZ`) | CPU 클럭 수준 (μs 이하) |
| 지터 | 데몬 스케줄링에 따라 변동 | 매우 작음 |
| 자원 | RAM 한 control block | TIMx 페리퍼럴 점유 |
| 동시 개수 | 메모리만큼 (수십~수백) | 페리퍼럴 수만큼 |
| 콜백 컨텍스트 | 데몬 태스크 | ISR (제한 多) |

*μs 정밀도가 필요한 PWM·캡쳐*는 HW 타이머가 답입니다. *수십 ms~초 단위 일반 작업*은 소프트웨어 타이머가 *훨씬 단순하고 확장적*입니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| xTimerStart 후 콜백이 안 호출됨 | vTaskStartScheduler 전에 호출 | 스케줄러 후로 |
| 타이머 주기가 일정하지 않음 | 데몬 우선순위가 낮음, 다른 태스크가 비잡 | 데몬 우선순위 ↑·콜백 짧게 |
| 콜백 안에서 vTaskDelay → hang | 데몬 태스크가 자기 자신을 block | 콜백에서 블로킹 금지 |
| xTimerStop했는데 콜백이 한 번 더 호출됨 | stop 명령이 큐에 들어갔으나 expire가 먼저 | 큐 길이↑·우선순위 조정 |
| configUSE_TIMERS=0인데 timer API 호출 | link 에러 | configUSE_TIMERS=1 |
| xTimerCreate에 0 period | assert | 최소 1 tick |
| 타이머 데몬 스택 부족 → HardFault | configTIMER_TASK_STACK_DEPTH 작음 | 2~4배로 |
| xTimerChangePeriod로 0 넘김 | assert | 최소 1 tick |
| ISR에서 xTimerStart 직접 호출 | crash | FromISR 버전 사용 |

## 정리

- 소프트웨어 타이머는 *전용 데몬 태스크 안*에서 *모든 콜백을 직렬로* 실행합니다. *별도 태스크를 만들 필요 없이* 주기·지연 작업이 가능합니다.
- *`configUSE_TIMERS=1`*과 *`timers.c`* 포함이 필요합니다. 데몬은 `vTaskStartScheduler`에서 자동 생성됩니다.
- `xTimerCreate`는 *주기·auto-reload·ID·콜백*을 받습니다. *콜백 시그니처는 `void f(TimerHandle_t)`*로 고정입니다.
- *auto-reload*는 반복, *one-shot*은 1회 후 dormant입니다. one-shot도 *`xTimerStart`로 재시작 가능*합니다.
- *Timer ID*로 *같은 콜백을 여러 인스턴스가 공유*할 수 있습니다. 정수든 구조체 포인터든 의미는 사용자가 정합니다.
- *콜백 안에서 블로킹 API 호출은 금지*입니다. 데몬 자신이 멈춰 *모든 타이머가 동시에 죽습니다*. 무거운 일은 *세마포·큐로 worker 태스크에 위임*합니다.
- 데몬 우선순위는 *높게 + 콜백 짧게*가 정답입니다. *낮게 두면 다른 태스크가 데몬을 지연시켜 시간 정확도가 깨집니다*.
- ISR에서는 *`...FromISR` 변형*을 씁니다. 일반 API를 ISR에서 호출하면 *crash*합니다.

## 다음 편

[Ch 6: Interrupt Management](/blog/embedded/rtos/freertos-mastering/chapter06-interrupt-management)에서 *ISR과 태스크의 안전한 다리*를 다룹니다. *`...FromISR` API 패밀리*, *deferred interrupt processing*, *Cortex-M NVIC 우선순위 비트의 함정*, *`configMAX_SYSCALL_INTERRUPT_PRIORITY`의 의미*를 봅니다.

## 관련 항목

- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management)
- [Ch 4: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter04-queue-management)
- [Ch 6: Interrupt Management](/blog/embedded/rtos/freertos-mastering/chapter06-interrupt-management)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — 타이머 데몬 구현
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 디바운스·watchdog 패턴
- [원문 — FreeRTOS Software Timers](https://www.freertos.org/RTOS-software-timer.html)
