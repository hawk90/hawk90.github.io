---
title: "6-01: RTOS 도입 결정"
date: 2026-05-14T15:00:00
description: "Super-loop와 RTOS의 분기점, RAM/Flash 비용, 디버깅 복잡도, 결정 기준을 한 자리에 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 63
tags: [recipes, rtos, design]
---

## 한 줄 요약

> **"RTOS는 응답시간이 두 개 이상 동시에 마감을 가질 때부터 정답이 됩니다."** Task 한두 개, 주기 하나면 super-loop이 더 단순하고 안전합니다.

## 어떤 상황에서 쓰나

새 board를 받으면 가장 먼저 부딪히는 결정이 *RTOS를 쓸 것인가*입니다. Datasheet에 FreeRTOS가 포함되어 있으니 일단 켜는 팀이 많지만, 실제로 super-loop으로 충분한 펌웨어가 RTOS로 잘못 가서 더 복잡해지는 경우도 흔합니다.

가속도 센서 한 개를 100 Hz로 읽고 UART로 송신만 하는 펌웨어는 task가 늘어도 한 마디로 정리됩니다. 반면 디스플레이 업데이트, BLE link layer, motor PID, 사용자 입력이 동시에 마감을 가지는 product는 super-loop으로 짤 때마다 latency가 무너집니다. 어디에서 갈리는지 미리 알면 후회를 줄일 수 있습니다.

## 핵심 개념

판단 기준은 동시에 살아있는 마감의 수입니다.

```text
마감 1개          → super-loop + ISR
마감 2~3개 + 주기 ms 단위 → super-loop + state machine
마감 4개 이상 + jitter 요구 → RTOS
HW 차원의 동시성 (BLE, USB stack) → RTOS 또는 bare-metal stack
```

RTOS가 주는 것은 time-slicing이 아니라 blocking primitive입니다. `wait_for_event(timeout)`을 한 줄로 쓰는 능력이 본질이고, 그 대가로 stack 메모리와 context-switch 시간을 지불합니다.

비용을 숫자로 보면 결정이 쉽습니다.

| 항목 | super-loop | FreeRTOS (4 task) |
|------|------------|---------------------|
| Flash 추가 | 0 | 6~10 KB |
| RAM 추가 | 0 | 4~8 KB (task stack 포함) |
| context switch | 없음 | 1~3 µs (Cortex-M4) |
| 디버깅 난이도 | 낮음 | 중간 (race, deadlock) |
| 소스 재사용 | 낮음 | 높음 (driver 표준화) |

## 코드 / 실제 사용 예

### Super-loop 한 장

```c
int main(void) {
    hw_init();
    while (1) {
        if (sensor_ready())   process_sensor();
        if (button_pressed()) handle_button();
        if (uart_rx_pending()) parse_command();
        wfi();   /* 아무 ISR도 없으면 sleep */
    }
}
```

마감이 하나일 때는 이 구조가 가장 빠르고 가장 적게 틀립니다. ISR에서 flag만 세워두고 main loop이 dispatch하면 jitter도 ISR latency 수준에 가깝게 유지됩니다.

### Super-loop + state machine

```c
typedef enum { IDLE, MEASURING, REPORTING } state_t;
static state_t state = IDLE;

void tick_1ms(void) {
    switch (state) {
    case IDLE:
        if (trigger_set()) { adc_start(); state = MEASURING; }
        break;
    case MEASURING:
        if (adc_done()) { state = REPORTING; }
        break;
    case REPORTING:
        uart_send_async(result_buf);
        state = IDLE;
        break;
    }
}
```

State machine 하나로 짧은 비동기 흐름까지 처리할 수 있습니다. 반응 시간이 ms 수준이면 RTOS 도입의 비용이 이점을 압도하기 쉽습니다.

### RTOS로 갈아탔을 때

```c
void task_sensor(void *arg) {
    for (;;) {
        if (xSemaphoreTake(adc_ready, portMAX_DELAY) == pdTRUE)
            xQueueSend(meas_q, &sample, 0);
    }
}

void task_uart(void *arg) {
    measurement_t m;
    for (;;) {
        xQueueReceive(meas_q, &m, portMAX_DELAY);
        uart_send_blocking(&m, sizeof(m));
    }
}
```

ADC가 끝날 때까지 기다리는 코드를 동기처럼 쓸 수 있다는 점이 RTOS의 진짜 가치입니다. State machine 펼침이 더 이상 필요 없어집니다.

### Hybrid 구조

```c
/* RTOS task가 큰 그림을, ISR이 빠른 반응을 담당 */
void TIM2_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    xSemaphoreGiveFromISR(motor_tick, &hp);
    portYIELD_FROM_ISR(hp);
}

void task_motor(void *arg) {
    for (;;) {
        xSemaphoreTake(motor_tick, portMAX_DELAY);
        pid_step();    /* 200 µs 안에 끝내야 함 */
    }
}
```

정밀 timing이 필요한 부분은 ISR 또는 hardware timer로, 흐름 제어는 RTOS task로 분리하는 패턴이 보편적입니다.

## 측정 / 성능 비교

Cortex-M4 72 MHz에서 같은 펌웨어를 두 구조로 구현해 latency를 측정한 결과입니다.

| 시나리오 | super-loop | FreeRTOS |
|----------|------------|----------|
| ISR → main loop dispatch | 2 µs | 2 µs |
| event → task wake | n/a | 8 µs (context switch 포함) |
| 4개 동시 마감 시 worst jitter | 220 µs | 22 µs |

마감이 하나일 때는 super-loop이 빠르지만, 동시 마감이 많아질수록 RTOS의 우선순위 기반 스케줄링이 jitter를 크게 줄입니다.

```text
RAM 사용량 (4 task, stack 512 B씩)
super-loop                  1.2 KB
FreeRTOS (heap_4 + 4 task)  5.6 KB
```

RAM이 16 KB 이하인 MCU에서는 RTOS task 4개도 무거울 수 있습니다.

## 자주 보는 함정

> "RTOS는 무조건 좋다"는 가정

```c
/* 단순 LED blink 펌웨어에 task 5개를 만든 코드 */
xTaskCreate(blink_red,   ...);
xTaskCreate(blink_green, ...);
```

기능이 하나뿐인 펌웨어는 RTOS를 얹는 순간 디버깅·resource·전력 소모가 모두 늘어납니다. 정말 동시에 살아있어야 할 일이 무엇인지 먼저 세어봅니다.

> Task당 stack을 추정 없이 설정

```c
xTaskCreate(t, "t", 128, NULL, 1, NULL);   /* 너무 작음 */
```

`uxTaskGetStackHighWaterMark`로 측정 없이 추정하면 overflow가 양산 후에 터집니다. 8-09편의 분석 절차를 같이 적용합니다.

> ISR에서 RTOS API를 잘못 호출

```c
void IRQ(void) { xQueueSend(q, &v, 0); }  /* FromISR 누락 */
```

`*FromISR` 버전을 쓰지 않으면 critical section이 어긋나 deadlock이 발생합니다. RTOS 도입 전에 ISR-safe API 규약을 먼저 익혀야 합니다.

> Heap 사용량 폭주

```c
xTaskCreate(...);     /* dynamic */
xQueueCreate(...);    /* dynamic */
```

가능하면 `*Static` 변종을 써서 양산 firmware의 heap 사용량을 0으로 만듭니다. Heap fragmentation 자체가 사라집니다.

## 정리

- 동시에 살아있는 마감의 수가 1~2개면 super-loop이 거의 항상 더 안전합니다.
- RTOS의 본질은 time-slicing이 아니라 blocking primitive입니다.
- Flash 6~10 KB, RAM 4~8 KB 정도의 비용이 늘어납니다.
- Hybrid 구조(ISR + task)는 timing critical 부분에 가장 단순한 답입니다.
- Static API와 stack 측정은 RTOS를 도입한 다음에 가장 먼저 챙겨야 할 항목입니다.
- 결정이 애매하면 super-loop으로 시작하고, jitter가 망가질 때 RTOS로 옮깁니다.

다음 편은 **Task 설계 패턴**입니다. Periodic, event-driven, state machine을 어떤 기준으로 고를지 다룹니다.

## 관련 항목

- [PRTOS 1-01: Why RTOS](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [PRTOS 1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [6-02: Task 설계 패턴](/blog/embedded/modern-recipes/part6-02-task-design)
- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
