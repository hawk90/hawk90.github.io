---
title: "ISR-Safe API 설계 — FromISR 패턴·Higher Priority Wake·Deferred Work"
slug: "embedded/rtos/practical-internals/part3-09-isr-safe-api"
date: 2026-05-06T09:30:00
description: "FromISR API 내부 구조와 pxHigherPriorityTaskWoken, yield 결정, deferred work 패턴을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 30
tags: [isr-safe, fromisr, higher-priority, deferred]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"FromISR API는 block이 불가능하고 yield를 명시해야 합니다"** — task API와 분리해 안전성을 확보합니다.

이 글의 register·PendSV 설명은 **FreeRTOS V11.2.0 GCC/ARM_CM4F** 범위입니다. 다른 architecture의 FromISR 계약은 해당 port를 확인합니다.

## API 명명 규칙

```c
/* Task context */
xQueueSend(q, &item, xTicksToWait);
xSemaphoreTake(sem, xTicksToWait);

/* ISR context */
xQueueSendFromISR(q, &item, &xHigherPriorityTaskWoken);
xSemaphoreGiveFromISR(sem, &xHigherPriorityTaskWoken);
```

두 API의 차이를 정리하면 다음과 같습니다.

| 항목 | Task API | ISR API |
|---|---|---|
| Block 가능 | O (timeout) | X (timeout 인자 없음) |
| Critical section | `portENTER_CRITICAL` | `portENTER_CRITICAL_FROM_ISR` |
| Wake 결과 | 자동 yield | `pxHigherPriorityTaskWoken` 반환 |
| Reschedule | 함수 내부 | 호출자가 명시 |

## pxHigherPriorityTaskWoken은 왜 필요한가

허용된 ISR에서 API가 더 높은 priority task를 unblock하면 woken을 pdTRUE로 표시할 수 있습니다. 여러 API가 같은 변수를 누적해서 사용하므로 ISR 처음에만 pdFALSE로 초기화합니다. 끝에서 portYIELD_FROM_ISR로 필요한 switch를 요청합니다.

```c title="deferred-queue-irq.c"
#include <stdint.h>
#include "FreeRTOS.h"
#include "queue.h"
extern QueueHandle_t rx_queue;
extern uint8_t read_and_ack_rx(void);
extern void count_rx_drop(void);
void rx_irq(void) {
    BaseType_t woken = pdFALSE;
    uint8_t byte = read_and_ack_rx();
    if (xQueueSendFromISR(rx_queue, &byte, &woken) != pdTRUE)
        count_rx_drop();
    portYIELD_FROM_ISR(woken);
}
```

실제 peripheral ACK·error 처리·queue 수명·IRQ priority와 ISR-safe drop counter를 board 코드가 제공해야 합니다. ARM_CM4F에서는 PendSV를 pending으로 만들며, mask·다른 예외·port 상태에 따라 실제 실행 시점이 달라집니다.

## portENTER_CRITICAL_FROM_ISR

ARM_CM4F의 taskENTER_CRITICAL_FROM_ISR는 이전 BASEPRI 상태를 받아 mask를 설정하고, taskEXIT_CRITICAL_FROM_ISR가 저장값을 복원하는 경로를 제공합니다. threshold보다 수치가 작아 긴급도가 높은 IRQ까지 모두 막는 것은 아닙니다. 해당 IRQ는 RTOS API를 사용하면 안 됩니다.

실제 portmacro.h의 ulPortRaiseBASEPRI·vPortSetBASEPRI를 확인합니다. 함수와 macro 이름을 재정의하는 축약 assembly를 application 구현으로 제공하지 않습니다.

## ISR 내부에서 Block을 금지하는 이유

```c
void some_isr(void) {
    xSemaphoreTake(sem, 100);   // Invalid ISR use; it may compile.
}
```

이유를 정리하면 다음과 같습니다.

- ISR은 task가 아니므로 TCB가 없고 block list에도 들어갈 수 없습니다.
- Block이 발생하면 다른 ISR이나 task가 무한 대기에 빠져 deadlock으로 이어집니다.
- ISR 길이는 응답 시간에 기여하며 다른 IRQ·mask·스케줄링 간섭도 포함해야 합니다.

**규칙은 단순합니다.** ISR은 비동기 신호 송신만 담당하고, 실제 처리는 task에 위임해야 합니다.

## Deferred Interrupt Pattern

```c
/* Deferred task — high priority */
void deferred_handler_task(void *p) {
    for (;;) {
        xSemaphoreTake(uart_rx_sem, portMAX_DELAY);
        
        /* ISR 대신 여기서 무거운 처리 */
        process_uart_packet();
    }
}

/* ISR — 짧게 */
void uart_irq(void) {
    BaseType_t pxHP = pdFALSE;
    
    xSemaphoreGiveFromISR(uart_rx_sem, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

장점은 세 가지입니다.

- ISR에서 수행하는 작업을 줄일 수 있지만 실제 길이는 타깃에서 측정해야 합니다.
- task context에서도 lock·deadline·callback 계약에 맞게 blocking을 선택합니다.
- Priority 조정으로 latency를 제어할 수 있습니다.

## Timer Service (Daemon) Task

xTimerPendFunctionCallFromISR는 함수 실행 요청을 timer command queue로 보냅니다. 반환값은 enqueue 성공 여부이며 queue가 가득 차면 실패할 수 있습니다. callback과 인자 저장소는 실행 시점까지 유효해야 합니다.

callback은 timer daemon에서 실행되므로 긴 처리나 blocking을 넣으면 다른 timer·deferred event도 지연됩니다. 큰 작업은 별도 worker task로 넘기고 daemon callback은 짧고 block하지 않게 유지합니다. 실제 timer loop는 timers.c의 명령 처리와 만료 목록을 확인하며, 가상의 TIMER_EXPIRED command switch로 설명하지 않습니다.

## ISR Priority와 Yield의 범위

configMAX_SYSCALL_INTERRUPT_PRIORITY는 port가 사용하는 encoded register 값입니다. 예를 들어 구현 priority bit가 4개이고 논리 threshold가 5이면 0x50을 사용하지만, 이 값도 MCU·priority grouping과 포트 설정이 일치해야 합니다. 0xBF를 모든 Cortex-M의 유효 threshold로 복사하지 않습니다.

NVIC_SetPriority의 논리 priority와 BASEPRI register 값을 구분합니다. woken=false는 이 API가 더 높은 task를 깨우지 않았다는 의미이지 다른 pending switch나 IRQ가 없다는 뜻은 아닙니다. yield 요청 역시 곧바로 다음 한 명령에 task가 실행된다는 보장이 아닙니다.

## ISR과 Task 간 공유 변수의 Atomic Operation

volatile은 접근 관찰과 관련되며 C의 상호 배제·동기화를 대신하지 않습니다. 정렬된 단일 load/store가 hardware에서 분할되지 않는 경우에도 shared_counter++는 read-modify-write이므로 둘 이상의 writer와 경쟁할 수 있습니다.

task의 critical 구간이 그 ISR을 실제로 mask하는지 확인하고 다른 core·DMA·고긴급도 ISR도 고려합니다. atomic API 역시 해당 target에서 lock-free인지와 ISR에서 허용되는지를 확인해야 합니다. barrier 하나로 data race가 해결된다고 설명하지 않습니다.

## 자주 하는 실수

> ⚠️ ISR에서 Task API를 호출하는 경우

```c
void isr(void) {
    xQueueSend(q, ...);   // ✗ task API
}
```

이 코드는 ISR 사용 계약 위반입니다. 컴파일 성공이나 특정 실행에서 문제가 보이지 않았다는 사실로 안전성을 판단할 수 없습니다. 항상 `*FromISR` 변형을 사용해야 합니다.

> ⚠️ pxHigherPriorityTaskWoken을 누락하는 경우

```c
void isr(void) {
    BaseType_t pxHP = pdFALSE;
    xSemaphoreGiveFromISR(sem, &pxHP);
    /* portYIELD_FROM_ISR 안 호출 */
}
```

Wake가 발생해도 yield가 일어나지 않으므로 high-priority task는 다음 스케줄링 시점까지 기다려야 합니다. 그만큼 latency가 늘어납니다.

> ⚠️ ISR Priority가 configMAX_SYSCALL_INTERRUPT_PRIORITY보다 높은 경우

```c
NVIC_SetPriority(UART1_IRQn, 0);   // Highest — FreeRTOS API 금지 영역
```

이 영역에서 `xQueueSendFromISR`을 호출하면 kernel data가 손상됩니다. 항상 낮은 priority로 설정해야 합니다.

> ⚠️ Critical section 안에서 nested ISR이 BASEPRI를 직접 변경하는 경우

kernel이 관리하는 mask를 직접 완화하면 보호 구간에 IRQ가 끼어들어 공유 상태를 훼손할 수 있습니다. 특정 결과를 stack 손상으로 고정하지 않습니다.

## 정리

- ISR API는 non-blocking이며 yield를 명시적으로 호출해야 합니다.
- `pxHigherPriorityTaskWoken`을 통해 task wake 결과를 전달합니다.
- `portYIELD_FROM_ISR`은 PendSV를 pending시켜 ISR 종료 후 switch를 일으킵니다.
- Deferred handler를 사용해 ISR을 짧게 유지하고 무거운 처리는 task에 맡깁니다.
- `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 우선순위가 높은 IRQ에서는 FreeRTOS API를 호출하면 안 됩니다.

다음 편에서는 deadlock 패턴의 발견과 예방을 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c), [timers.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/timers.c).

## 관련 항목

- [3-08: Event Group](/blog/embedded/rtos/practical-internals/part3-08-event-group)
- [3-10: Deadlock 패턴](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
