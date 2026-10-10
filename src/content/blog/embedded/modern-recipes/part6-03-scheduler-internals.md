---
title: "RTOS Scheduler 동작 분석 — Tick·Context Switch·Yield"
slug: "embedded/modern-recipes/part6-03-scheduler-internals"
date: 2026-04-15T09:02:00
description: "Preemptive와 cooperative, time-slice, context switch 비용, tickless idle까지 scheduler가 실제로 어떻게 도는지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 65
tags: [recipes, rtos, scheduler]
topics: ["embedded"]
---

## 한 줄 요약

> **"Scheduler는 매 tick과 매 yield마다 ready list의 가장 높은 priority를 고르는 단순한 루프입니다."** 그 단순함을 이해해야 priority 역전과 jitter의 원인을 즉시 짚을 수 있습니다.

## 어떤 상황에서 쓰나

설계는 깨끗한데 양산 직전에 jitter가 튀어 디버깅을 시작할 때, scheduler의 동작을 정확히 알면 5분 만에 원인이 보입니다. "왜 우선순위 5짜리 task가 100 µs를 기다리지?"라는 질문에 답하려면 context switch가 언제 일어나는지, idle task가 무슨 일을 하는지 알아야 합니다.

또 한 가지 흔한 상황은 전력입니다. 1 ms마다 tick interrupt가 들어와 sleep을 깨우면 µA 단위 절전이 불가능합니다. Tickless idle이 어떻게 작동하는지 알면 sleep 정책을 설계할 수 있습니다.

## 핵심 개념

일반적인 preemptive RTOS에서 scheduler가 다시 실행될 수 있는 대표 시점은 다음과 같습니다.

1. **Tick interrupt** — 설정한 tick — delay 만료와 time-slice 처리
2. **Task가 block** — delay, queue wait, semaphore take
3. **Task가 unblock** — ISR이나 다른 task가 깨움
4. **`yield` / `yield_from_isr`** — 명시적 양보

이 네 시점에서만 가장 높은 priority의 ready task를 골라 실행합니다. 그 사이에는 현재 task가 계속 돕니다.

| 방식 | 동작 |
|------|------|
| preemptive | higher priority가 ready 되면 즉시 빼앗음 |
| cooperative | yield하지 않으면 영원히 안 바뀜 |
| time-slice | 같은 priority에서 tick마다 round-robin |

FreeRTOS·Zephyr·ThreadX 모두 preemptive/cooperative와 time-slice 동작이 설정·port에 따라 달라집니다. Cooperative에서는 yield 없는 task가 다른 task 실행을 지연시킬 수 있습니다.

## 코드 / 실제 사용 예

### Tick interrupt → scheduler 호출

```c
void SysTick_Handler(void) {
    portTICK_HOOK();
    if (xTaskIncrementTick() != pdFALSE) {
        portYIELD_FROM_ISR(pdTRUE);   /* 더 높은 task가 깨었으면 switch */
    }
}
```

매 tick마다 `xTaskIncrementTick`이 delay 만료와 time-slice를 확인합니다. 더 높은 priority가 깨면 ISR 종료 직후 PendSV로 context switch가 일어납니다.

### Cooperative 모드

```c
#define configUSE_PREEMPTION  0

void task_a(void *arg) {
    for (;;) {
        do_work();
        taskYIELD();    /* 명시적으로 양보해야 함 */
    }
}
```

`configUSE_PREEMPTION = 0`이면 현재 task가 block하거나 yield할 때까지 scheduler 전환이 제한됩니다. 단순한 control loop라도 모든 경로가 양보하는지 검증해야 합니다.

### Time-slice

```c
#define configUSE_TIME_SLICING   1
#define configTICK_RATE_HZ       1000

/* 같은 priority task의 tick 기반 교대는 port/config와 ready 상태에 따름 */
xTaskCreate(task_x, "x", 1024, NULL, 2, NULL);
xTaskCreate(task_y, "y", 1024, NULL, 2, NULL);
```

`configUSE_TIME_SLICING`을 켜면 같은 priority의 ready task들이 tick마다 회전합니다. 끄면 한 task가 끝까지 다 돕니다.

### Idle hook과 sleep

```c
void vApplicationIdleHook(void) {
    /* 다른 task가 ready 될 때까지 sleep */
    __WFI();
}
```

Idle task는 실행 가능한 더 높은 priority task가 없을 때 동작하는 가장 낮은 priority의 task입니다. WFI(Wait For Interrupt)는 port와 interrupt 설정에 맞게 사용해야 합니다.

### Tickless idle

```c
#define configUSE_TICKLESS_IDLE   1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP  2   /* tick 이상 sleep 가능하면 */

/* FreeRTOS가 자동으로 tick interrupt를 끄고 RTC로 깨움 */
```

깨어날 task가 충분히 늦다면 port가 tick을 보정하며 저전력 모드로 들어갈 수 있습니다. 절전 효과와 wake-up clock은 MCU port와 tickless 구현을 확인해 측정합니다.

### Context switch 코드 (Cortex-M)

PendSV에서 호출되는 핵심 4단계.

1. **현재 task의 SP 저장** — R0~R12, LR, PSR은 HW가 자동 push
2. **ready list에서 다음 task 선택** — `prvSelectHighestPriorityTask`
3. **다음 task의 SP 복원**
4. **exception return** — HW가 R0~R12, LR, PSR 자동 pop

Cortex-M은 exception entry/return에서 일부 register를 hardware가 저장·복원합니다. 전체 비용은 port, FPU 사용, compiler와 clock에 따라 측정해야 합니다.

### Yield 패턴

```c
/* 큰 작업을 잘게 나눠 다른 task가 끼어들 여지를 만듦 */
for (int i = 0; i < N; i += CHUNK) {
    process_chunk(i);
    taskYIELD();
}
```

Cooperative 환경이나 같은 priority의 worker들 사이에서 fairness를 만들 때 씁니다. Preemptive에서는 보통 필요 없습니다.

## 측정 / 성능 비교

Cortex-M4 72 MHz, FreeRTOS 10.5에서 측정하는 예시 항목입니다. 아래 수치는 특정 port·빌드·측정 방법 없이는 일반값으로 사용할 수 없습니다.

```text
이벤트                         시간
tick handler                  측정 필요
xTaskIncrementTick             측정 필요
context switch (PendSV)        측정 필요
ISR → task wake (전체)         측정 필요
xQueueSend → receiver 깨움     측정 필요
```

Tick handler overhead는 tick rate와 port 설정에 따라 누적됩니다. Latency와 전력 요구에 맞춰 tick rate와 tickless를 측정해 선택합니다.

```text
전력 (STM32L4, 80 MHz active)
tick 1 kHz, idle hook 없음        측정 필요
tick 1 kHz + WFI in idle hook     측정 필요
tickless idle                     측정 필요
```

WFI와 tickless의 효과는 MCU clock tree, peripheral, wake source와 측정 조건에 따라 크게 달라집니다.

## 자주 보는 함정

> Tick rate를 올리면 jitter가 좋아진다는 오해

```c
#define configTICK_RATE_HZ   10000   /* 0.1 ms */
```

tick rate를 10배로 올리면 overhead도 10배입니다. Tick rate는 가장 짧은 delay 정밀도만 결정합니다. Jitter는 context switch와 priority가 결정합니다.

> Idle hook에서 무거운 작업

```c
void vApplicationIdleHook(void) {
    log_to_flash();   /* 다른 task가 굶음 */
}
```

Idle hook은 다른 모든 task가 block일 때만 도는 곳입니다. 긴 작업을 넣으면 latency를 가늠할 수 없습니다.

> Cooperative에서 무한 루프

```c
for (;;) {
    do_work();    /* yield 없음 */
}
```

Cooperative와 yield 없음이 만나면 전체 시스템이 정지합니다. Watchdog이 없으면 reset도 안 됩니다.

> ISR 안에서 너무 많은 task 깨움

```c
for (int i = 0; i < N; i++)
    xSemaphoreGiveFromISR(s[i], &hp);
```

ISR이 길어지면 다른 ISR과 task가 모두 지연됩니다. ISR에서는 flag만 세우고 worker task가 N개를 처리하도록 합니다.

## 정리

- Scheduler는 tick, block, unblock, yield 네 시점에서만 호출됩니다.
- Preemptive 기본에 같은 priority에 한해 time-slice가 표준입니다.
- Cortex-M의 context switch는 HW 도움으로 1~3 µs 수준입니다.
- Tick rate는 정밀도를, priority는 jitter를 결정합니다. 둘은 별개입니다.
- Idle hook의 WFI 한 줄이 mA 단위 전력 차이를 만듭니다.
- Tickless idle은 RTC wake-up이 정확해야 안전합니다.
- ISR은 항상 짧게 유지하고, 무거운 일은 task로 넘깁니다.

다음 편은 **Semaphore 활용**입니다. Binary, counting, resource pool 패턴을 정리합니다.

## 관련 항목

- [PRTOS 1-03: Scheduling Algorithm](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [PRTOS 2-04: Context Switch](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-02: Task 설계 패턴](/blog/embedded/modern-recipes/part6-02-task-design)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
