---
title: "Preemption과 Cooperation — 강제 전환 vs 자발 양보"
slug: "embedded/rtos/practical-internals/part1-04-preemption"
date: 2026-05-04T09:04:00
description: "선점형과 협력형의 전환 지점, tick·IRQ·blocking API, interrupt mask와 응답시간 분석의 차이를 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 4
tags: [rtos, preemption, cooperative, yield, tick]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **선점 여부만으로 실시간성은 보장되지 않습니다.** 두 방식의 최대 비선점 구간·우선순위·blocking·ISR 간섭을 비교합니다.

## Preemption — 강제 전환

높은 priority task가 ready 되면 *현재 running task를 강제로 중단*시킵니다. tick·ISR 이후 전환뿐 아니라 task 문맥의 API가 고우선 task를 깨우는 경우도 있습니다. 실제 전환은 scheduler lock·interrupt mask·포트 조건에 영향을 받습니다.

### Tick Preemption

설정한 주기의 시스템 tick → tick ISR → scheduler 호출 → 다음 task 결정. Higher priority ready가 있으면 전환됩니다.

각 tick마다 scheduler를 확인합니다. *Time slice 만료* 또는 *higher-priority 등장* 시 전환됩니다.

### IRQ Preemption

Cortex-M4F 포트의 `portYIELD_FROM_ISR(needYield)`는 필요할 때 PendSV를 pend합니다. 호출 지점에서 곧바로 task를 실행하는 함수가 아닙니다. PendSV가 실행 가능한 예외 경계에서 context를 전환합니다.

ISR이 *higher-priority task를 깨우면* (`xSemaphoreGiveFromISR` 등) ISR 중 전달한 yield 요청과 선점·마스킹 조건에 따라 전환할 수 있습니다. 중첩된 더 높은 우선순위 예외가 있으면 지연될 수 있습니다.

## Cooperation — 자발 양보

task는 명시적 yield 또는 실제 blocking·suspend·delete 등으로 실행권을 넘길 수 있습니다.

```c
void taskA(void *arg) {
    while (1) {
        do_work();
        taskYIELD();    // 다른 task에 양보
    }
}
```

또는 *blocking API*가 implicit yield 역할을 합니다. 대기 시간이 양수인 delay나 실제 대기 조건이 성립한 queue receive 등이 전환을 유발합니다. 데이터가 이미 있거나 timeout0이면 receive가 즉시 반환할 수 있습니다.

### Cooperative만 사용 시

```c
#define configUSE_PREEMPTION 0   // FreeRTOSConfig.h
```

Tick 인터럽트는 *time keeping만* 담당하고 task 전환 트리거 역할을 하지 않습니다. task가 실행권을 넘기는 동작과 포트가 허용한 명시적 전환 지점에서 scheduler가 선택합니다. 특히 FromISR+명시적 yield 경로는 해당 포트·설정으로 확인해야 하므로 단순히 “tick만 전환하지 않으면 어떤 IRQ 경로도 전환할 수 없다”고 일반화하지 않습니다.

## 비교 — Preemptive vs Cooperative 타임라인

아래 그림은 전환 순서를 설명하는 개념 모델이며 특정 보드에서 측정한 시간선이 아닙니다.

![Preemption vs Cooperation — 1ms PID + 5ms Log](/images/blog/practical-internals/diagrams/part1-04-preemption-vs-cooperation.svg)

## 비교 표

| 항목 | Preemptive | Cooperative |
| --- | --- | --- |
| **전환 트리거** | tick·IRQ·API wake·yield·blocking 등 | yield·blocking·suspend 등, 포트별 명시적 전환 |
| **실시간성** | 최악 간섭·blocking 분석 필요 | 비선점 구간을 제한한 분석 필요 |
| **Race condition** | 자주 (atomicity 필요) | 적음 (전환점 명시) |
| **Code 복잡도** | Higher (sync 필수) | Lower |
| **응답성** | 우선순위·IRQ·비선점 구간·전환 비용에 의존 | 실행권을 넘기기까지의 최장 구간에 의존 |
| **디버그** | 어려움 (어디서 전환할지 모름) | 쉬움 |
| **사용처** | 독립적인 우선순위 응답이 필요한 흐름 | bounded event loop·협력형 thread 등 |

## Trade-off — 예시

### 시나리오: 1 task가 5 ms 작업 + 다른 task가 1 ms 주기 PID

PID 주기는 1 ms, CPU 실행 시간은 0.2 ms이고 logger가 CPU 5 ms를 사용한다고 **가정**합니다. 단일 CPU·PID 최고 priority·ISR/전환/공유 자원 blocking 0인 설명 모델입니다.

- 선점형에서는 logger보다 PID를 먼저 실행할 수 있습니다. logger는 남는 CPU에서 진행하며, 5 ms의 자기 실행이 끝나는 wall time은 release 위상과 선점 횟수에 따라 달라집니다.
- 협력형에서 logger가 5 ms 동안 실행권을 넘기지 않으면, 그 사이 ready가 된 PID가 기다릴 수 있습니다. logger를 bounded chunk로 나누거나 대기·yield 지점을 설계해 분석할 수 있습니다.

어느 방식도 “deadline이 있으면 무조건 이것”으로 고르지 않습니다. [앞선 RTA 예제](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)처럼 모델과 비용을 명시한 뒤 검증합니다.

## Preemption Disable (Critical Section)

Preemptive RTOS에서도 *짧은 구간은 preemption disable*이 필요합니다.

```c
taskENTER_CRITICAL();
shared_counter++;
shared_buffer[idx++] = value;
taskEXIT_CRITICAL();
```

FreeRTOS V11.2.0 ARM_CM4F의 task critical section은 BASEPRI와 nesting으로 kernel을 사용하는 IRQ를 마스킹합니다. `vTaskSuspendAll()`을 함께 호출하는 API가 아니며, syscall 경계보다 높은 우선순위 IRQ·NMI까지 모두 막지 않습니다. 단일 코어와 SMP의 보호 범위도 구분합니다.

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
| 1 kHz | 1 ms | tick 분해능과 CPU 비용을 비교할 한 가지 설정 |
| 10 kHz | 0.1 ms | 고정밀, ISR overhead 큼 |

`configTICK_RATE_HZ`는 프로젝트가 정합니다. 100 Hz에서는 1 tick 구간이 10 ms이지만 `vTaskDelay(1)`의 호출→Ready 시간은 다음 tick까지의 위상에 따라 달라지고, Ready→실행 지연도 별도입니다. 정확한 10 ms 지연이라고 해석하지 않습니다.

## Tickless Mode

Idle 시 *tick interrupt를 멈추면* CPU sleep을 더 길게 할 수 있습니다. 조건이 맞으면 저전력 대기시간을 늘릴 수 있습니다.

```c
#define configUSE_TICKLESS_IDLE 1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP 2  // 2 tick 이상 idle 시 sleep
```

다음 task의 wake 시간을 알아내 *그 시점까지 timer를 동적으로 설정*합니다. 정밀한 hw timer가 필요합니다.

## SMP에서 Preemption

다중 코어에서는 *코어별 독립*적으로 preemption이 일어납니다. 한 코어의 ISR도 공유 ready 구조·lock·깨우기 경로를 통해 다른 코어의 task에 영향을 줄 수 있습니다. **Inter-Processor Interrupt (IPI)**로 다른 코어를 깨웁니다.

예 — `Core 0: ISR → IPI → Core 1 wake → Core 1의 ready task 실행`.

## 흔한 함정

> ⚠️ ISR에서 long work

Preemptive RTOS에서도 같은 코어에서는 ISR 실행 중 task 명령을 실행하지 않습니다. SMP의 다른 코어까지 모두 멈춘다는 뜻은 아닙니다. ISR은 *짧게* 유지하고(수 µs), 긴 작업은 *deferred task*로 넘깁니다.

> ⚠️ Critical Section 너무 김

`taskENTER_CRITICAL()` 안에 printf 같은 *수 ms 작업*을 넣으면 보호 범위의 IRQ와 해당 코어 task 전환이 지연됩니다. syscall 경계보다 높은 IRQ는 계속 실행될 수 있습니다. 짧게 유지해야 합니다.

> ⚠️ Cooperative에서 무한 루프

Yield 없는 무한 루프는 시스템을 행 상태로 만듭니다. *while(1)에 항상 wait API*나 yield를 넣습니다.

> ⚠️ Tick rate 너무 높음

10 kHz tick은 매 100 µs마다 ISR이 발생합니다. CPU 부담이 커집니다. 필요한 timeout 분해능과 실측 tick 비용·전력으로 결정합니다.

## 정리

- **Preemptive**는 tick과 IRQ에서 전환할 수 있으며 최악 지연의 별도 분석이 필요합니다.
- **Cooperative**는 명시적 양보·blocking 경로를 사용하며 bounded 비선점 구간으로 deadline을 분석합니다.
- FreeRTOS는 설정에 따라 선점형·협력형을 선택합니다.
- Critical section은 *짧게* 유지해야 합니다. preemption disable 구간이 latency를 결정합니다.
- Tickless mode가 배터리 동작의 핵심입니다.

다음 편에서는 **인터럽트와 RTOS**를 다룹니다. ISR context, deferred processing, FromISR API를 살펴봅니다.

## 재현 — 포트의 mask와 yield 코드 생성

다음 소스를 V11.2.0 ARM_CM4F 공식 헤더로 교차 컴파일하면 ISR critical section의 BASEPRI 저장·복원과 PendSV 요청을 관찰할 수 있습니다. 함수들은 보드에서 호출하지 않는 컴파일 검사 용도이며, IRQ 상태·주변 장치를 초기화한 firmware가 아닙니다.

```c title="critical-port.c"
#include "FreeRTOS.h"
#include "task.h"
void inspect_isr_mask(void) {
    UBaseType_t old = taskENTER_CRITICAL_FROM_ISR();
    __asm volatile ("" ::: "memory");
    taskEXIT_CRITICAL_FROM_ISR(old);
}
void request_switch(void) { portYIELD_FROM_ISR(pdTRUE); }
```

`BASEPRI`가 설정된다는 사실은 모든 IRQ가 차단된다는 증거가 아닙니다. 해당 포트의 공식 소스와 마스킹된 priority 범위까지 함께 읽습니다.

## 1차 자료와 확인 범위

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): `vPortEnterCritical`·`xPortPendSVHandler`
- [동일 포트 portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): BASEPRI와`portYIELD_FROM_ISR`

본문의 ISR·critical section 코드는 platform 자원 선언·초기화가 필요한 API 조각입니다. 실제 보드의 IRQ/PendSV/latency를 측정한 결과로 제시하지 않습니다.

## 관련 항목

- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
