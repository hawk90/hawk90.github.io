---
title: "1-04: Preemption과 Cooperation — 강제 전환 vs 자발 양보"
date: 2026-05-12T04:00:00
description: "Preemptive: tick·IRQ에서 강제 전환. Cooperative: yield 명시. trade-off — latency vs predictability."
series: "Practical RTOS Internals"
seriesOrder: 4
tags: [rtos, preemption, cooperative, yield, tick]
draft: true
---

## 한 줄 요약

> **"Preemption = 실시간성, Cooperation = 단순성"** — 둘 중 하나 선택. 임베디드 RTOS는 거의 다 preemptive.

## Preemption — 강제 전환

높은 priority task가 ready 되면 *현재 running task를 강제 중단*. 두 트리거:

### Tick Preemption

```text
시스템 tick (1 ms) → tick ISR → scheduler 호출 → 다음 task 결정
                                 ↓
                       Higher priority ready 있으면 전환
```

매 tick (보통 1-10 ms)마다 scheduler 확인. *Time slice 만료* 또는 *higher-priority 등장* 시 전환.

### IRQ Preemption

```text
ISR 끝 → portYIELD_FROM_ISR(needYield) → 즉시 scheduler
```

ISR이 *higher-priority task를 깨움* (`xSemaphoreGiveFromISR` 등) → ISR 종료 시 즉시 그 task로 전환.

## Cooperation — 자발 양보

각 task가 *명시적 yield*로만 전환.

```c
void taskA(void *arg) {
    while (1) {
        do_work();
        taskYIELD();    // 다른 task에 양보
    }
}
```

또는 *blocking API*가 implicit yield. `vTaskDelay()`·`xQueueReceive()` 등은 *내부적으로 yield*.

### Cooperative만 사용 시

```c
configUSE_PREEMPTION = 0   // FreeRTOS
```

Tick 인터럽트는 *time keeping만* — task 전환 트리거 X. 오직 *task가 yield*할 때만 scheduler 동작.

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

**Preemptive**:
- PID가 매 ms 깨어남, 즉시 실행
- 1 ms PID 만족 ✓
- 5 ms 작업이 *조각조각* 진행됨 → 6-7 ms 안에 끝남

**Cooperative**:
- 5 ms 작업이 *통째로* 실행, 그 동안 PID 못 함
- PID가 *최대 5 ms 지연* → deadline miss
- 5 ms 작업이 *깨끗하게* 5 ms에 끝남

→ *Deadline 있으면* preemptive. *없으면* cooperative.

## Preemption Disable (Critical Section)

Preemptive RTOS에서도 *짧은 구간은 preemption disable* 필요.

```c
taskENTER_CRITICAL();
shared_counter++;
shared_buffer[idx++] = value;
taskEXIT_CRITICAL();
```

`taskENTER_CRITICAL()` = *interrupt mask (BASEPRI)* + *scheduler suspend*. 짧게 유지가 핵심.

## ISR과 Preemption

ISR은 *task가 아님* — 단순히 *현재 task를 잠시 빼앗는* 코드. ISR 도중에는:

- task 전환 안 함 (ISR 끝까지)
- 다른 ISR이 *더 높은 priority*면 nested IRQ 가능
- ISR이 *task wake* 시 → ISR 끝 직후 scheduler 호출

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

FreeRTOS의 `configTICK_RATE_HZ = 1000`이 기본. 100 Hz면 *vTaskDelay(1)*이 *10 ms 지연*임에 주의.

## Tickless Mode

Idle 시 *tick interrupt 멈춤* → CPU sleep 더 길게. 배터리 동작에 필수.

```c
configUSE_TICKLESS_IDLE = 1
configEXPECTED_IDLE_TIME_BEFORE_SLEEP = 2  // 2 tick 이상 idle 시 sleep
```

다음 task wake 시간을 알아내 *그 시점까지 timer 동적 설정*. 정밀한 hw timer 필요.

## SMP에서 Preemption

다중 코어 — *코어별 독립* preemption. 한 코어의 ISR이 다른 코어의 task에 직접 영향 X. **Inter-Processor Interrupt (IPI)**로 다른 코어 깨움.

```text
Core 0: ISR → IPI → Core 1 wake → Core 1의 ready task 실행
```

## 흔한 함정

> ⚠️ ISR에서 long work

Preemptive RTOS도 *ISR 도중*은 어떤 task도 실행 못 함. ISR은 *짧게* (수 µs), 긴 작업은 *deferred task*로.

> ⚠️ Critical Section 너무 김

`taskENTER_CRITICAL()` 안에 printf 같은 *수 ms 작업* → 그 동안 *모든 ISR·task 막힘*. 짧게.

> ⚠️ Cooperative에서 무한 루프

Yield 없는 무한 루프 → 시스템 행. *while(1)에 항상 wait API* 또는 yield.

> ⚠️ Tick rate 너무 높음

10 kHz tick = 매 100 µs ISR. CPU 부담 ↑. 1 kHz로 충분.

## 정리

- **Preemptive** = tick·IRQ에서 강제 전환 → 실시간성 보장.
- **Cooperative** = yield만 → 단순하지만 deadline 보장 X.
- 임베디드 RTOS는 거의 **preemptive** 사용.
- Critical section은 *짧게* — preemption disable 구간이 latency 결정.
- Tickless mode가 배터리 동작 핵심.

다음 편은 **인터럽트와 RTOS** — ISR context, deferred processing, FromISR API.

## 관련 항목

- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
