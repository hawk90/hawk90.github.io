---
title: "Preemption과 Cooperation — 강제 전환 vs 자발 양보"
date: 2026-05-04T09:04:00
description: "Preemptive는 tick과 IRQ에서 강제로 전환합니다. Cooperative는 yield를 명시해야 합니다. latency와 predictability의 trade-off를 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 4
tags: [rtos, preemption, cooperative, yield, tick]
draft: false
---

## 한 줄 요약

> **"Preemption은 실시간성을, Cooperation은 단순성을 제공합니다."** 둘 중 하나를 선택합니다. 임베디드 RTOS는 거의 다 preemptive를 씁니다.

## Preemption — 강제 전환

높은 priority task가 ready 되면 *현재 running task를 강제로 중단*시킵니다. 두 가지 트리거가 있습니다.

### Tick Preemption

시스템 tick (1 ms) → tick ISR → scheduler 호출 → 다음 task 결정. Higher priority ready가 있으면 전환됩니다.

매 tick(보통 1-10 ms)마다 scheduler를 확인합니다. *Time slice 만료* 또는 *higher-priority 등장* 시 전환됩니다.

### IRQ Preemption

ISR 종료 시 `portYIELD_FROM_ISR(needYield)`가 즉시 scheduler를 호출합니다.

ISR이 *higher-priority task를 깨우면* (`xSemaphoreGiveFromISR` 등) ISR 종료 시 즉시 그 task로 전환됩니다.

## Cooperation — 자발 양보

각 task가 *명시적 yield*로만 전환합니다.

```c
void taskA(void *arg) {
    while (1) {
        do_work();
        taskYIELD();    // 다른 task에 양보
    }
}
```

또는 *blocking API*가 implicit yield 역할을 합니다. `vTaskDelay()`, `xQueueReceive()` 등은 *내부적으로 yield*합니다.

### Cooperative만 사용 시

```c
configUSE_PREEMPTION = 0   // FreeRTOS
```

Tick 인터럽트는 *time keeping만* 담당하고 task 전환 트리거 역할을 하지 않습니다. 오직 *task가 yield*할 때만 scheduler가 동작합니다.

## 비교 — Preemptive vs Cooperative 타임라인

![Preemption vs Cooperation — 1ms PID + 5ms Log](/images/blog/practical-internals/diagrams/part1-04-preemption-vs-cooperation.svg)

## 비교 표

| 항목 | Preemptive | Cooperative |
| --- | --- | --- |
| **전환 트리거** | tick·IRQ·yield | yield만 |
| **실시간성** | High | Best-effort |
| **Race condition** | 자주 (atomicity 필요) | 적음 (전환점 명시) |
| **Code 복잡도** | Higher (sync 필수) | Lower |
| **응답성** | µs 단위 | task의 yield 빈도에 의존 |
| **디버그** | 어려움 (어디서 전환할지 모름) | 쉬움 |
| **사용처** | 99% 임베디드 RTOS | 작은 cooperative kernel, Lua coroutine |

## Trade-off — 예시

### 시나리오: 1 task가 5 ms 작업 + 다른 task가 1 ms 주기 PID

**Preemptive**의 경우:
- PID가 매 ms 깨어나 즉시 실행됩니다.
- 1 ms PID를 만족합니다.
- 5 ms 작업이 *조각조각* 진행되어 6-7 ms 안에 끝납니다.

**Cooperative**의 경우:
- 5 ms 작업이 *통째로* 실행되고, 그 동안 PID를 못 합니다.
- PID가 *최대 5 ms 지연*되어 deadline을 miss합니다.
- 5 ms 작업이 *깨끗하게* 5 ms에 끝납니다.

*Deadline이 있으면* preemptive를 쓰고, *없으면* cooperative를 씁니다.

## Preemption Disable (Critical Section)

Preemptive RTOS에서도 *짧은 구간은 preemption disable*이 필요합니다.

```c
taskENTER_CRITICAL();
shared_counter++;
shared_buffer[idx++] = value;
taskEXIT_CRITICAL();
```

`taskENTER_CRITICAL()`은 *interrupt mask (BASEPRI)*와 *scheduler suspend*를 합친 것입니다. 짧게 유지하는 게 핵심입니다.

## ISR과 Preemption

ISR은 *task가 아닙니다*. 단순히 *현재 task를 잠시 빼앗는* 코드입니다. ISR 도중에는 다음 규칙이 적용됩니다.

- task 전환을 하지 않습니다 (ISR이 끝날 때까지).
- 다른 ISR이 *더 높은 priority*면 nested IRQ가 가능합니다.
- ISR이 *task wake* 시 ISR 끝 직후 scheduler를 호출합니다.

```c
void TIM1_IRQHandler(void) {
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;

    xSemaphoreGiveFromISR(semHandle, &xHigherPriorityTaskWoken);
    /* 위 호출이 higher-priority task를 ready로 만들면
       xHigherPriorityTaskWoken = pdTRUE 설정됨 */

    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
    /* pdTRUE면 ISR 끝나면서 task 전환 발생 */
}
```

## Tick Rate 선택

| Tick Rate | Period | Trade-off |
| --- | --- | --- |
| 100 Hz | 10 ms | 저전력, 낮은 정밀도 |
| 1 kHz | 1 ms | **표준** — 대부분 RTOS 기본 |
| 10 kHz | 0.1 ms | 고정밀, ISR overhead 큼 |

FreeRTOS의 `configTICK_RATE_HZ = 1000`이 기본값입니다. 100 Hz면 *vTaskDelay(1)*이 *10 ms 지연*임에 주의해야 합니다.

## Tickless Mode

Idle 시 *tick interrupt를 멈추면* CPU sleep을 더 길게 할 수 있습니다. 배터리 동작에 필수입니다.

```c
configUSE_TICKLESS_IDLE = 1
configEXPECTED_IDLE_TIME_BEFORE_SLEEP = 2  // 2 tick 이상 idle 시 sleep
```

다음 task의 wake 시간을 알아내 *그 시점까지 timer를 동적으로 설정*합니다. 정밀한 hw timer가 필요합니다.

## SMP에서 Preemption

다중 코어에서는 *코어별 독립*적으로 preemption이 일어납니다. 한 코어의 ISR이 다른 코어의 task에 직접 영향을 주지 않습니다. **Inter-Processor Interrupt (IPI)**로 다른 코어를 깨웁니다.

예 — `Core 0: ISR → IPI → Core 1 wake → Core 1의 ready task 실행`.

## 흔한 함정

> ⚠️ ISR에서 long work

Preemptive RTOS에서도 *ISR 도중*에는 어떤 task도 실행하지 못합니다. ISR은 *짧게* 유지하고(수 µs), 긴 작업은 *deferred task*로 넘깁니다.

> ⚠️ Critical Section 너무 김

`taskENTER_CRITICAL()` 안에 printf 같은 *수 ms 작업*을 넣으면 그 동안 *모든 ISR과 task가 막힙니다*. 짧게 유지해야 합니다.

> ⚠️ Cooperative에서 무한 루프

Yield 없는 무한 루프는 시스템을 행 상태로 만듭니다. *while(1)에 항상 wait API*나 yield를 넣습니다.

> ⚠️ Tick rate 너무 높음

10 kHz tick은 매 100 µs마다 ISR이 발생합니다. CPU 부담이 커집니다. 1 kHz로 충분합니다.

## 정리

- **Preemptive**는 tick과 IRQ에서 강제로 전환하여 실시간성을 보장합니다.
- **Cooperative**는 yield만으로 전환되어 단순하지만 deadline을 보장하지 못합니다.
- 임베디드 RTOS는 거의 **preemptive**를 사용합니다.
- Critical section은 *짧게* 유지해야 합니다. preemption disable 구간이 latency를 결정합니다.
- Tickless mode가 배터리 동작의 핵심입니다.

다음 편에서는 **인터럽트와 RTOS**를 다룹니다. ISR context, deferred processing, FromISR API를 살펴봅니다.

## 관련 항목

- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
