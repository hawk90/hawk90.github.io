---
title: "Ch 3: Task Management"
date: 2026-05-09T03:00:00
description: "xTaskCreate·priority·state — FreeRTOS 태스크의 생성·상태·스케줄링."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 3
tags: [freertos, task, scheduler, priority]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: false
---

## 한 줄 요약

> **"FreeRTOS 태스크는 *함수 + 스택 + TCB*의 묶음이고, 스케줄러는 *Ready 큐 중 가장 높은 우선순위*를 *항상* 실행합니다. 같은 우선순위가 여럿이면 *time-slicing으로 round-robin*입니다."**

태스크는 *FreeRTOS의 기본 단위*입니다. 인터럽트가 *비동기 이벤트의 진입점*이라면, 태스크는 *동기 코드의 흐름*입니다. *우선순위 기반 선점 + 같은 우선순위 round-robin*이 FreeRTOS의 기본 스케줄링이고, 이 규칙만 이해하면 *왜 내 태스크가 안 도는지·왜 너무 자주 도는지*가 풀립니다.

이번 장에서는 *`xTaskCreate`의 형태*, *태스크 함수가 반드시 무한 루프인 이유*, *Running·Ready·Blocked·Suspended 4상태*, *선점·time-slicing·협력형의 차이*, *`vTaskDelay` vs `vTaskDelayUntil`*, 그리고 *Idle task의 역할*을 다룹니다.

## xTaskCreate — 시그니처와 의미

```c
BaseType_t xTaskCreate(
    TaskFunction_t           pxTaskCode,
    const char * const       pcName,
    const configSTACK_DEPTH_TYPE  usStackDepth,
    void * const             pvParameters,
    UBaseType_t              uxPriority,
    TaskHandle_t * const     pxCreatedTask
);
```

| 인자 | 의미 |
|------|------|
| `pxTaskCode` | 태스크가 실행할 함수 (`void f(void *)`) |
| `pcName` | 디버그용 이름 (최대 `configMAX_TASK_NAME_LEN`) |
| `usStackDepth` | 스택 깊이 (*byte가 아닌 word 단위*) |
| `pvParameters` | 함수에 넘기는 인자 |
| `uxPriority` | 0(idle)~`configMAX_PRIORITIES-1` |
| `pxCreatedTask` | 생성된 태스크 핸들 출력 |

반환값은 `pdPASS` 또는 `errCOULD_NOT_ALLOCATE_REQUIRED_MEMORY`입니다. *반드시 검사*합니다. 부팅 단계라도 무시하면 *추후 NULL handle로 vTaskDelete가 죽습니다*.

```c
TaskHandle_t xSensorHandle = NULL;

void prvSensorTask(void *pv)
{
    SensorConfig_t *cfg = (SensorConfig_t *)pv;

    for(;;) {                                      /* 무한 루프 */
        uint16_t v = sensor_read(cfg->channel);
        publish(cfg->topic, v);
        vTaskDelay(pdMS_TO_TICKS(cfg->period_ms));
    }
    /* 도달 불가. 만약 도달하면 vTaskDelete(NULL) */
}

int main(void) {
    static SensorConfig_t cfg = { .channel = 0, .period_ms = 100, .topic = "tmp" };

    BaseType_t rc = xTaskCreate(prvSensorTask, "Sensor",
                                configMINIMAL_STACK_SIZE * 2,
                                &cfg,
                                tskIDLE_PRIORITY + 2,
                                &xSensorHandle);
    configASSERT(rc == pdPASS);

    vTaskStartScheduler();
    for(;;);
}
```

## 태스크 함수는 왜 무한 루프인가

태스크 함수가 *return하면* FreeRTOS는 *그 사실을 모릅니다*. 정확히는 *return 후 떨어지는 주소가 정의되지 않아 즉시 HardFault*가 발생합니다. 그래서 두 가지 패턴 중 하나여야 합니다.

```c
/* 패턴 1: 영원히 도는 루프 */
void prvTask(void *pv) {
    for(;;) { /* work */ }
}

/* 패턴 2: 한 번 일하고 스스로 종료 */
void prvOneShot(void *pv) {
    do_init();
    vTaskDelete(NULL);   /* NULL = 자기 자신 삭제 */
}
```

`vTaskDelete(NULL)`은 *자신을 Ready 큐에서 제거하고 idle task에게 메모리 회수를 맡깁니다*. heap_1을 쓰면 *호출 자체가 assert*입니다.

## 우선순위와 스케줄링 정책

`configMAX_PRIORITIES`로 *총 우선순위 단계*를 정합니다. 0이 *가장 낮은* idle이고, *큰 숫자가 더 높은 우선순위*입니다. ARM 인터럽트 우선순위와 *반대 방향*이라 혼동에 주의합니다.

```text
configMAX_PRIORITIES = 5

priority  4  ─── critical work (motor control)
priority  3  ─── high (network rx)
priority  2  ─── normal (sensor, app)
priority  1  ─── background (logging, telemetry)
priority  0  ─── idle (Idle task 전용)
```

스케줄러의 규칙은 단순합니다.

```text
1. Ready 상태인 태스크 중 가장 높은 우선순위가 Running이 된다.
2. 같은 최고 우선순위가 여럿이면 time-slicing으로 돌아간다.
3. 더 높은 우선순위가 Ready가 되면 현재 태스크를 즉시 선점한다.
4. Running 태스크가 블로킹하면 다음으로 높은 Ready 태스크가 실행된다.
```

`configUSE_PREEMPTION=0`이면 *협력형(cooperative)*입니다. 태스크가 *스스로 yield하지 않으면* 다음 태스크가 안 옵니다. 실전에서는 거의 안 씁니다.

`configUSE_TIME_SLICING=0`이면 *선점은 하지만 같은 우선순위 사이 자동 전환은 없습니다*. CPU를 *block 또는 yield* 호출까지 잡고 있습니다.

## 태스크 상태 머신 — 4상태

![FreeRTOS Task 상태 머신](/images/blog/rtos/diagrams/chapter03-task-states.svg)

| 상태 | 진입 방법 | 빠져나가는 조건 |
|------|----------|----------------|
| Running | 스케줄러가 선택 | 선점, 블록, yield, suspend, delete |
| Ready | 생성 직후, 블록 해제 후 | 스케줄러가 선택 |
| Blocked | 큐·세마포·이벤트 대기, `vTaskDelay` | 조건 충족, timeout |
| Suspended | `vTaskSuspend()` | `vTaskResume()` |

*Blocked*와 *Suspended*는 *둘 다 Ready 큐에 없다*는 점은 같지만 *Blocked는 timeout을 가질 수 있고*, *Suspended는 명시적 resume까지 기다립니다*.

## vTaskDelay vs vTaskDelayUntil

```c
void vTaskDelay(const TickType_t xTicksToDelay);
BaseType_t xTaskDelayUntil(TickType_t *pxPreviousWakeTime,
                            const TickType_t xTimeIncrement);
```

`vTaskDelay`는 *호출 시점부터 지정한 tick 후에 깨우라*는 의미입니다. *블로킹 시작 시점을 기준*으로 합니다. 따라서 *주기 일정함이 보장되지 않습니다*. 태스크가 *실행 도중 다른 일에 시간을 보내면* 주기가 *밀립니다*.

```c
for(;;) {
    do_work();                              /* 실행 시간 가변 */
    vTaskDelay(pdMS_TO_TICKS(100));         /* delay 시작 = work 끝난 시점 */
}
/* 실제 주기 = work + 100ms (정확한 100ms 아님) */
```

`xTaskDelayUntil`은 *이전 깨어난 시점에서 정확히 N ticks 후*에 깨우라는 의미입니다. *주기가 정확*합니다.

```c
TickType_t xLastWakeTime = xTaskGetTickCount();
for(;;) {
    do_work();
    xTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(100));
}
/* 실제 주기 = 정확히 100ms (work가 100ms 미만이라면) */
```

| 함수 | 기준점 | 주기 정확성 | 용도 |
|------|--------|------------|------|
| `vTaskDelay` | 호출 시점 | 가변 | 단순 sleep, 폴링 간격 |
| `xTaskDelayUntil` | 이전 wake 시점 | 정확 | 주기 제어 (PID, 센서 샘플링) |

*센서 50Hz 샘플링 같은 정확 주기*는 *반드시 `xTaskDelayUntil`*입니다.

## pdMS_TO_TICKS — tick과 ms의 변환

`configTICK_RATE_HZ`가 1000이면 1 tick = 1 ms입니다. 100이면 1 tick = 10 ms입니다. *코드 안에 tick 숫자를 직접 쓰면 tick rate 변경 시 깨지므로* `pdMS_TO_TICKS` 매크로를 항상 씁니다.

```c
#define pdMS_TO_TICKS(xTimeInMs) \
    ((TickType_t)(((TickType_t)(xTimeInMs) * (TickType_t)configTICK_RATE_HZ) / (TickType_t)1000))

vTaskDelay(pdMS_TO_TICKS(250));  /* tick rate에 무관 */
```

## 스케줄링 시나리오 — 두 가지 예

### 시나리오 A: 다른 우선순위

```text
priority 3: Sensor task (every 10ms, work 2ms)
priority 1: Logger task (always Ready, no block)
priority 0: Idle

시간축
   0───10───20───30─── (ms)
   S++       S++         S++       S = Sensor (priority 3)
       L───────────L────────L       L = Logger (priority 1)
                                    Idle은 거의 못 돔
       ↑
       Sensor가 vTaskDelay 호출
       Logger가 그동안 실행
       Sensor가 깨어나면 Logger 선점
```

### 시나리오 B: 같은 우선순위

```text
priority 2: WorkerA (busy loop, no block)
priority 2: WorkerB (busy loop, no block)

configUSE_TIME_SLICING = 1, configTICK_RATE_HZ = 1000

시간축 (1ms tick)
   0─1─2─3─4─5─6─7─8─ (ms)
   A B A B A B A B A      매 tick 마다 전환 (round-robin)
```

`configUSE_TIME_SLICING=0`이면 *A가 영원히 도는* 것을 막을 방법이 없습니다.

## Idle Task와 Hook

스케줄러가 시작되면 *최소 우선순위 0의 Idle task*가 자동으로 생성됩니다. *Ready 태스크가 하나도 없을 때 도는 안전망*입니다. 두 가지 책임이 있습니다.

1. *`vTaskDelete`로 삭제 요청된 태스크의 메모리 회수*
2. *CPU가 할 일이 없을 때 일정한 곳에서 도는 보장*

`configUSE_IDLE_HOOK=1`로 *Idle hook*을 켜면 idle 안에서 *사용자 함수가 호출*됩니다.

```c
void vApplicationIdleHook(void)
{
    /* Idle 중 호출됨 — 짧고 non-blocking이어야 함 */
    enter_low_power_wait();
}
```

*Idle hook 안에서 블로킹 API를 호출하면 안 됩니다*. Idle task가 Block되면 *시스템에 Ready 태스크가 없어도 Idle 우선순위 0에서 동작하는 다음 단계가 없어 crash*합니다. CPU sleep 진입 같은 *경량 작업*만 적합합니다.

### Tickless Idle

`configUSE_TICKLESS_IDLE=1`이면 *Idle 중 SysTick을 일시 정지*하고 *예상 wake-up 시점까지 깊은 sleep*에 들어갑니다. 배터리 펌웨어에서 *수십 배 전력 차이*를 만듭니다.

## 스택 크기 정하기 — uxTaskGetStackHighWaterMark

`usStackDepth`를 *word 단위*로 정합니다. Cortex-M에서 1 word = 4 byte입니다. *128*이면 *512 byte*입니다.

너무 작으면 *stack overflow로 HardFault*, 너무 크면 *RAM 낭비*입니다. *측정해서 줄이는* 게 정답입니다.

```c
UBaseType_t uxStackRemaining = uxTaskGetStackHighWaterMark(xSensorHandle);
printf("Sensor min free stack: %u words\n", (unsigned)uxStackRemaining);
```

`uxTaskGetStackHighWaterMark`는 *지금까지 가장 빠듯했던 순간의 free word 수*를 반환합니다. *이 값이 32 이상*이면 안전 마진이라 봅니다.

`configCHECK_FOR_STACK_OVERFLOW=2`로 설정하면 *각 context switch마다* 스택 끝 패턴을 검사해 *오버플로 시 hook*을 부릅니다.

```c
void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName)
{
    /* 여기 도달 = pcTaskName 태스크의 스택이 overflow */
    taskDISABLE_INTERRUPTS();
    for(;;) { }
}
```

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| xTaskCreate가 pdFAIL | heap 부족 또는 스택 크기 과대 | 스택 줄임·heap 늘림 |
| 태스크 함수 return 후 HardFault | vTaskDelete(NULL) 없음 | 루프나 self-delete 추가 |
| 높은 우선순위 태스크가 CPU 독점 | 블로킹 API 호출 없음 | vTaskDelay·큐 wait 도입 |
| vTaskDelay(0) 호출 | yield 의미 (다음 same-priority로) | 의도라면 OK, 아니면 1+ |
| 정확한 주기가 안 맞음 | vTaskDelay 사용 | xTaskDelayUntil로 변경 |
| 스택 크기 충분한데 HardFault | ISR이 태스크 스택 위에서 동작 | ISR 안 sprintf/printf 회피 |
| configMAX_PRIORITIES 16+ | RAM 낭비 (Ready list가 priority 수만큼) | 보통 5~8이면 충분 |
| 같은 우선순위 task가 dead-lock 비슷 | time-slicing OFF | configUSE_TIME_SLICING=1 |
| idle hook이 block | 시스템 hang | hook 내 블로킹 API 금지 |

## 정리

- 태스크는 *함수·스택·TCB*의 묶음이고, *`xTaskCreate`*가 *heap에서 메모리를 떼어 생성*합니다. *반환값 검사*를 잊지 않습니다.
- 태스크 함수는 *무한 루프*이거나 *`vTaskDelete(NULL)`로 자기 삭제*해야 합니다. *그냥 return하면 HardFault*입니다.
- 우선순위는 *큰 숫자가 높음*입니다. ARM 인터럽트 우선순위와 *방향이 반대*라 혼동에 주의합니다.
- 스케줄러는 *최고 우선순위 Ready를 항상 실행*하고, *같은 우선순위는 time-slicing*으로 round-robin합니다.
- 4상태는 *Running, Ready, Blocked, Suspended*입니다. *Blocked는 조건·timeout으로 자동 해제*, *Suspended는 명시적 resume*까지 기다립니다.
- *`vTaskDelay`*는 *호출 시점 기준*이라 주기가 가변, *`xTaskDelayUntil`*은 *이전 wake 시점 기준*이라 정확 주기입니다.
- *Idle task*는 *최소 우선순위 0*이고, *삭제된 태스크의 메모리 회수*를 담당합니다. *Idle hook*은 *짧고 non-blocking*이어야 합니다.
- *`uxTaskGetStackHighWaterMark`*로 스택 마진을 측정하고, *`configCHECK_FOR_STACK_OVERFLOW=2`*로 overflow를 잡습니다.

## 다음 편

[Ch 4: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter04-queue-management)에서 *태스크 간 메시지 전달*을 다룹니다. *`xQueueCreate`의 의미*, *블로킹 send/receive*, *큐 집합(queue set)*, *mailbox 패턴*, *by-copy vs by-reference의 트레이드오프*를 봅니다.

## 관련 항목

- [Ch 2: Heap Memory Management](/blog/embedded/rtos/freertos-mastering/chapter02-heap-memory)
- [Ch 4: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter04-queue-management)
- [Ch 7: Resource Management](/blog/embedded/rtos/freertos-mastering/chapter07-resource-management) — 우선순위 역전
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — 스케줄러 내부
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/)
- [원문 — FreeRTOS Task Management](https://www.freertos.org/taskandcr.html)
