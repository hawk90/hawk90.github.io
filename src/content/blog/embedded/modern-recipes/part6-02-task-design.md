---
title: "RTOS Task 설계 패턴 — 우선순위·스택·State Machine"
slug: "embedded/modern-recipes/part6-02-task-design"
date: 2026-04-15T09:01:00
description: "Periodic, event-driven, state machine 세 가지 task 패턴과 priority 산정 기준을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 64
tags: [recipes, rtos, task]
topics: ["embedded"]
---

## 한 줄 요약

> **"Task는 마감과 입력 형태로 정해집니다."** 주기적 입력이면 periodic, 외부 트리거면 event-driven, 단계 전이가 길면 state machine입니다.

## 어떤 상황에서 쓰나

RTOS를 켜면 먼저 task를 어떻게 나눌지 정합니다. 잘못 나누면 한 task가 모든 일을 하고 다른 task는 기다리기만 하거나, 마감이 짧은 일이 긴 일 뒤에 줄을 섭니다. 설계 단계에서 각 task의 입력, 주기(또는 트리거), 마감을 한 줄씩 적어 봅니다.

"센서 task", "통신 task"처럼 하드웨어 기준으로만 자르면 같은 task 안에 마감이 다른 일이 섞입니다. 입력의 형태와 마감을 먼저 본 다음 task를 분리하면, 같은 센서라도 빠른 응답이 필요한 부분과 backlog로 모아두면 되는 부분을 따로 둘 수 있습니다.

## 핵심 개념

이 글이 다루는 패턴은 세 가지입니다.

| 패턴 | 설명 |
|------|------|
| Periodic | 일정 주기로 실행 (sensor 10 ms, control 1 ms) |
| Event-driven | 외부 신호로 시작 (button, packet 도착) |
| State machine | 상태 전이가 긴 흐름 (BLE connect, file upload) |

Priority는 마감이 짧을수록 높게 줍니다. 주기가 짧을수록 우선순위를 높이는 Rate Monotonic 배정이 출발점입니다(이론은 [PRTOS 1-03](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)).

| Task | Priority |
|------|----------|
| period 1 ms | 5 (가장 높음) |
| period 10 ms | 4 |
| period 100 ms | 3 |
| event-driven UI | 2 |
| background log | 1 (가장 낮음) |

FreeRTOS에서 같은 우선순위의 ready task들은 `configUSE_PREEMPTION`과 `configUSE_TIME_SLICING`이 모두 1이면 tick마다 번갈아 돕니다. 아래 측정처럼 그만큼 각 task의 일이 늘어지므로, 마감이 다른 task에는 다른 우선순위를 줍니다.

아래 코드 중 `pid_step()`, `update_screen()`, `radio_*()` 같은 함수는 애플리케이션 함수이고, 구조를 보이는 발췌입니다. 실행한 코드는 "측정" 절에 있습니다. 실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3`, QEMU `mps2-an385` `-icount shift=5`, `configTICK_RATE_HZ` 1000).

## 코드 / 실제 사용 예

### Periodic task

```c
void task_control(void *arg) {
    TickType_t next = xTaskGetTickCount();
    const TickType_t period = pdMS_TO_TICKS(1);

    for (;;) {
        vTaskDelayUntil(&next, period);    /* drift 없음 */
        pid_step();
    }
}
```

`vTaskDelay()`는 호출한 시점부터 세고, `vTaskDelayUntil()`은 `next`에 저장한 이전 깨어남 시각부터 셉니다. 그래서 일의 길이가 바뀌어도 깨어나는 tick이 주기의 배수에 머뭅니다(아래 측정). 실행 시간이 주기를 넘으면 deadline miss는 따로 처리합니다.

### Event-driven task

```c
QueueHandle_t btn_q;

void EXTI0_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    uint8_t code = 1;
    xQueueSendFromISR(btn_q, &code, &hp);
    portYIELD_FROM_ISR(hp);
}

void task_ui(void *arg) {
    uint8_t code;
    for (;;) {
        xQueueReceive(btn_q, &code, portMAX_DELAY);
        update_screen(code);
    }
}
```

`portMAX_DELAY`로 막혀 있다가 ISR이 queue에 넣으면 그때만 실행합니다. `INCLUDE_vTaskSuspend`가 1이면 `portMAX_DELAY`는 시간 제한 없는 대기입니다.

### State machine task

```c
typedef enum { S_DISC, S_CONN, S_AUTH, S_READY } ble_state_t;

void task_ble(void *arg) {
    ble_state_t s = S_DISC;
    ble_event_t e;

    for (;;) {
        xQueueReceive(ble_evt_q, &e, portMAX_DELAY);

        switch (s) {
        case S_DISC: if (e == E_CONNECTED)  s = S_CONN; break;
        case S_CONN: if (e == E_AUTH_OK)    s = S_AUTH; break;
        case S_AUTH: if (e == E_NOTIFY_EN)  s = S_READY; break;
        case S_READY:
            if (e == E_PACKET)     handle_packet();
            if (e == E_DISCONNECT) s = S_DISC;
            break;
        }
    }
}
```

단계가 긴 흐름은 상태와 event로 적습니다. event는 모두 한 queue로 들어오므로, task는 queue 하나에서만 기다립니다.

### Producer-consumer 분리

```c
void task_radio_rx(void *arg) {       /* high priority — packet 받기만 */
    packet_t p;
    for (;;) {
        radio_wait_irq();
        radio_read(&p);
        xQueueSend(rx_q, &p, 0);
    }
}

void task_parser(void *arg) {         /* low priority — 가공 */
    packet_t p;
    for (;;) {
        xQueueReceive(rx_q, &p, portMAX_DELAY);
        parse_and_log(&p);
    }
}
```

받는 쪽은 높은 우선순위에서 받기만 하고, 무거운 처리는 낮은 우선순위 task로 넘깁니다. ISR → task 구조를 task 사이에 한 번 더 둔 것입니다. `xQueueSend(rx_q, &p, 0)`은 queue가 차면 기다리지 않고 `errQUEUE_FULL`을 돌려주므로 그 packet은 버려집니다.

### Worker pool

```c
QueueHandle_t job_q;

void task_worker(void *arg) {
    job_t j;
    for (;;) {
        xQueueReceive(job_q, &j, portMAX_DELAY);
        execute(&j);
    }
}

int main(void) {
    for (int i = 0; i < 3; i++)
        xTaskCreate(task_worker, "w", 1024, NULL, 2, NULL);
}
```

같은 우선순위 worker N개가 한 queue에서 일을 꺼냅니다. 단일 코어에서는 병렬 실행이 아니고, 한 worker가 막힌(예: I/O 대기) 동안 다른 worker가 다음 일을 꺼낼 수 있다는 점이 이득입니다. worker마다 stack(여기서는 1024 word)이 듭니다.

## 측정

### vTaskDelay와 vTaskDelayUntil

10 tick 주기 task가 매번 0, 1, 2, 3 tick의 일을 번갈아 하게 하고, 깨어난 tick을 찍었습니다.

```c
/* period.c: 10-tick periodic task whose work takes 0..3 ticks.
   -DUSE_UNTIL selects vTaskDelayUntil(), otherwise vTaskDelay(). */
#include "FreeRTOS.h"
#include "task.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

static void busy_ticks(TickType_t n) {          /* simulated work */
    TickType_t t0 = xTaskGetTickCount();
    while (xTaskGetTickCount() - t0 < n) { }
}

static void periodic(void *arg) {
    (void)arg;
    TickType_t next = xTaskGetTickCount();
    for (int k = 0; k < 8; k++) {
#ifdef USE_UNTIL
        vTaskDelayUntil(&next, 10);
#else
        vTaskDelay(10);
#endif
        TickType_t now = xTaskGetTickCount();
        pr("k=%d wake=%u\n", k, (unsigned)now);
        busy_ticks(k % 4);                      /* 0,1,2,3 ticks of work */
    }
    hosted_exit(0);
}

int main(void) {
    xTaskCreate(periodic, "p", 256, NULL, 2, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh period.c              && qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel period.elf
./build.sh period.c -DUSE_UNTIL  && qemu-system-arm ... -kernel period.elf
```

| k | `vTaskDelay(10)` | `vTaskDelayUntil(&next, 10)` |
|---|---:|---:|
| 0 | 10 | 10 |
| 1 | 20 | 20 |
| 2 | 31 | 30 |
| 3 | 43 | 40 |
| 4 | 56 | 50 |
| 5 | 66 | 60 |
| 6 | 77 | 70 |
| 7 | 89 | 80 |

`vTaskDelay()`는 일의 길이만큼 깨어남이 밀려 8번째에 tick 89가 되었고, `vTaskDelayUntil()`은 일의 길이와 상관없이 10의 배수에서 깨어났습니다.

### 같은 우선순위에 CPU를 놓지 않는 task가 있을 때

20 tick 주기 control task가 고정된 양의 일(빈 loop 20,000번)을 하는 옆에, 절대 막히지 않는 우선순위 1 task를 두었습니다. control의 우선순위를 2와 1로 바꿔 일에 걸린 tick 수를 쟀습니다.

```c
/* prio.c: 20-tick control task doing a fixed amount of work next to a
   CPU-bound task. CTRL_PRIO = 1 puts it at the hog's priority, 2 above it. */
#include "FreeRTOS.h"
#include "task.h"
extern void pr(const char *, ...); extern void hosted_exit(int);
#ifndef CTRL_PRIO
#define CTRL_PRIO 2
#endif

static void hog(void *arg) { (void)arg; for (;;) { } }   /* never blocks */

static void work(void) {                                  /* fixed instruction count */
    for (volatile uint32_t i = 0; i < 20000; i++) { }
}

static void control(void *arg) {
    (void)arg;
    TickType_t next = xTaskGetTickCount(), worst = 0;
    for (int k = 0; k < 10; k++) {
        vTaskDelayUntil(&next, 20);
        TickType_t t0 = xTaskGetTickCount();
        work();
        TickType_t d = xTaskGetTickCount() - t0;
        if (d > worst) worst = d;
    }
    pr("control prio %d (hog prio 1): work took up to %u tick(s)\n", CTRL_PRIO, (unsigned)worst);
    hosted_exit(0);
}

int main(void) {
    xTaskCreate(hog, "hog", 256, NULL, 1, NULL);
    xTaskCreate(control, "ctl", 256, NULL, CTRL_PRIO, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```text
control prio 2 (hog prio 1): work took up to 3 tick(s)
control prio 1 (hog prio 1): work took up to 6 tick(s)
```

control이 hog보다 높으면 일이 3 tick 안에 끝나고, 같은 우선순위면 time slicing으로 hog와 tick마다 번갈아 돌아 6 tick이 걸렸습니다. QEMU icount의 tick 수이므로 실제 보드의 시간이 아니라 두 설정의 비율을 보는 값입니다.

## 자주 보는 함정

> Hardware 기준 task 분할

```c
xTaskCreate(task_uart, ...);
xTaskCreate(task_spi,  ...);
xTaskCreate(task_i2c,  ...);
```

같은 priority의 driver task가 나란히 있으면 마감이 짧은 일과 긴 일이 같은 줄에 섭니다. 입력의 마감을 기준으로 다시 묶으면 우선순위를 달리 줄 단위가 보입니다.

> `vTaskDelay`로 주기 task

```c
for (;;) {
    do_work();           /* 길이가 변함 */
    vTaskDelay(pdMS_TO_TICKS(10));   /* drift */
}
```

위 측정처럼 `vTaskDelay()`는 일의 길이만큼 주기가 밀립니다. `vTaskDelayUntil()`로 바꿉니다.

> 모든 task에 같은 priority

```c
xTaskCreate(t1, ..., 2, NULL);
xTaskCreate(t2, ..., 2, NULL);
```

time slicing으로 tick마다 번갈아 돌아, 위 측정에서는 일의 길이가 3 tick에서 6 tick으로 늘었습니다. 마감이 다른 task는 priority를 분리합니다.

> Task 안에서 busy wait

```c
while (!sensor_ready());     /* CPU 100% 잡아먹음 */
```

이 loop가 도는 동안 낮은 우선순위 task는 CPU를 받지 못하고, 같은 우선순위 task와는 tick마다 CPU를 나눕니다. ISR이 주는 semaphore를 `xSemaphoreTake()`로 기다리게 바꿉니다.

## 정리

- Task는 마감과 입력 형태로 자릅니다. 하드웨어 기준이 아닙니다.
- Periodic은 **`vTaskDelayUntil()`**: 위 측정에서 `vTaskDelay()`는 8주기 만에 9 tick 밀렸습니다.
- Event-driven은 queue나 semaphore에서 막혀 기다리고, 단계가 긴 흐름은 event queue 하나를 받는 state machine task로 씁니다.
- Priority는 Rate Monotonic으로 시작하고, 마감이 다른 task에는 다른 값을 줍니다. 같은 값이면 time slicing으로 일이 늘어집니다(3 → 6 tick).
- 받기만 하는 task와 처리하는 task를 우선순위로 나눕니다.

다음 편은 **Scheduler 동작 이해**입니다. Preemptive와 cooperative, time-slice, context switch 비용을 다룹니다.

## 관련 항목

- [PRTOS 1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [PRTOS 1-03: Scheduling Algorithm](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [6-03: Scheduler 동작 이해](/blog/embedded/modern-recipes/part6-03-scheduler-internals)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
