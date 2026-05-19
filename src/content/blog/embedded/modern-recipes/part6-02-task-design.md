---
title: "6-02: Task 설계 패턴"
date: 2026-05-14T16:00:00
description: "Periodic, event-driven, state machine 세 가지 task 패턴과 priority 산정 기준을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 64
tags: [recipes, rtos, task]
---

## 한 줄 요약

> **"Task는 마감과 입력 형태로 정해집니다."** 주기적 입력이면 periodic, 외부 트리거면 event-driven, 단계 전이가 길면 state machine입니다.

## 어떤 상황에서 쓰나

RTOS를 켜는 순간 가장 먼저 결정해야 할 것이 task 분할입니다. 잘못 자르면 한 task가 모든 일을 하고 다른 task는 굶거나, 두 task가 같은 자원을 계속 잡고 늘어집니다. 설계 단계에서 각 task의 역할과 주기를 한 줄로 적어보면 80%의 문제가 해결됩니다.

흔한 함정은 "센서 task", "통신 task"처럼 하드웨어를 기준으로 자르는 것입니다. 입력의 형태와 마감을 먼저 본 다음 task를 분리하면, 같은 센서라도 빠른 응답이 필요한 부분과 backlog로 모아두면 되는 부분을 따로 둘 수 있습니다.

## 핵심 개념

세 가지 표준 패턴이 있습니다.

```text
Periodic         일정 주기로 실행 (sensor 10 ms, control 1 ms)
Event-driven     외부 신호로 시작 (button, packet 도착)
State machine    상태 전이가 긴 흐름 (BLE connect, file upload)
```

Priority는 마감이 짧을수록 높게 줍니다. Rate Monotonic이 가장 단순한 출발점입니다.

```text
period 1 ms      priority 5 (가장 높음)
period 10 ms     priority 4
period 100 ms    priority 3
event-driven UI  priority 2
background log   priority 1 (가장 낮음)
```

같은 우선순위에 task가 여러 개 모이면 round-robin이 되지만, 디버깅이 어려워지므로 우선순위는 가능한 한 유일하게 줍니다.

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

`vTaskDelay`가 아니라 `vTaskDelayUntil`을 쓰는 것이 핵심입니다. 전자는 실행 후 delay라 코드 길이에 따라 주기가 drift하지만, 후자는 절대시각 기준이라 jitter가 누적되지 않습니다.

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

`portMAX_DELAY`로 무한 대기하다가 ISR이 깨우면 그때만 실행합니다. CPU를 0%에 가깝게 유지하면서도 외부 입력에 빠르게 반응합니다.

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

긴 사이드 이펙트가 있는 흐름에서는 상태와 event로 표현하는 편이 깨끗합니다. callback 지옥에 빠지지 않고도 비동기 흐름을 동기처럼 쓸 수 있습니다.

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

들어오는 일이 빠르고 짧다면 high priority로 받기만 하고, 무거운 처리는 다른 task로 넘깁니다. ISR과 정확히 같은 구조를 task 사이에도 적용한 것입니다.

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

같은 우선순위의 worker N개를 두면 굳이 thread pool 라이브러리 없이도 병렬 처리가 됩니다. 다만 MCU에서는 worker 수가 늘수록 stack RAM이 그만큼 늘어납니다.

## 측정 / 성능 비교

같은 product를 task 분할만 바꿔서 jitter를 측정해본 사례입니다.

```text
구조                              control jitter
모든 일을 task 하나에 (priority 3) 8 ms
control만 분리 (priority 5)        0.2 ms
control + sensor 분리              0.3 ms
sensor를 우선순위 5로 (실수)        12 ms (control이 굶음)
```

가장 짧은 마감을 가진 task에 가장 높은 priority를 주는 것만으로도 jitter가 한 자릿수 µs 수준으로 떨어집니다.

```text
context switch 비용 (Cortex-M4 72 MHz)
task 2개                  3.5 µs / switch
task 8개                  3.5 µs / switch (task 수 무관)
ISR → task wake           1.8 µs
```

Context switch는 task 수와 무관합니다. 다만 task가 너무 많으면 디버깅과 stack RAM이 부담입니다.

## 자주 보는 함정

> Hardware 기준 task 분할

```c
xTaskCreate(task_uart, ...);
xTaskCreate(task_spi,  ...);
xTaskCreate(task_i2c,  ...);
```

같은 priority의 driver task가 줄줄이 있으면 backlog가 한쪽에 쌓이고 다른 쪽은 굶습니다. 입력의 마감을 기준으로 다시 묶어보면 task 수가 절반으로 줄어드는 경우가 흔합니다.

> `vTaskDelay`로 주기 task

```c
for (;;) {
    do_work();           /* 길이가 변함 */
    vTaskDelay(pdMS_TO_TICKS(10));   /* drift */
}
```

`vTaskDelayUntil`로 바꾸면 do_work가 길어져도 다음 깨어남 시각이 그대로 유지됩니다.

> 모든 task에 같은 priority

```c
xTaskCreate(t1, ..., 2, NULL);
xTaskCreate(t2, ..., 2, NULL);
```

Round-robin이 되어 우선순위의 의미가 사라집니다. 마감이 다른 task는 priority를 분명히 분리합니다.

> Task 안에서 busy wait

```c
while (!sensor_ready());     /* CPU 100% 잡아먹음 */
```

`xSemaphoreTake(sensor_ready, ...)`로 바꿔 blocking 대기로 전환합니다. RTOS를 쓰는 거의 유일한 이유입니다.

## 정리

- Task는 마감과 입력 형태로 자릅니다. 하드웨어 기준이 아닙니다.
- Periodic은 `vTaskDelayUntil`, event-driven은 queue 또는 semaphore wait가 표준입니다.
- 긴 사이드 이펙트는 state machine task로 풀어내면 callback 지옥을 피할 수 있습니다.
- Priority는 Rate Monotonic으로 시작하고, 가능한 한 유일한 값을 줍니다.
- 빠르게 받기만 하는 task와 무거운 처리 task를 분리하면 jitter가 안정됩니다.
- Worker pool은 ScheduleQueue가 깊을 때 가장 단순한 병렬화입니다.

다음 편은 **Scheduler 동작 이해**입니다. Preemptive와 cooperative, time-slice, context switch 비용을 다룹니다.

## 관련 항목

- [PRTOS 1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [PRTOS 1-03: Scheduling Algorithm](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [6-03: Scheduler 동작 이해](/blog/embedded/modern-recipes/part6-03-scheduler-internals)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
