---
title: "ISR-Safe API 설계 — FromISR 패턴·Higher Priority Wake·Deferred Work"
date: 2026-05-06T09:30:00
description: "FromISR API 내부 구조와 pxHigherPriorityTaskWoken, yield 결정, deferred work 패턴을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 30
tags: [isr-safe, fromisr, higher-priority, deferred]
draft: false
---

## 한 줄 요약

> **"FromISR API는 block이 불가능하고 yield를 명시해야 합니다"** — task API와 분리해 안전성을 확보합니다.

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

ISR이 어떤 task를 wake했을 때, 깨어난 task의 priority가 interrupted task보다 높으면 ISR 종료 후 context switch가 발생합니다. 그러나 ISR 자체는 task switch를 직접 호출할 수 없습니다. 대신 pending 비트만 set해 두고, ISR exit 시점에 실제 switch가 처리됩니다.

```c
void uart_rx_isr(void) {
    uint8_t byte = UART->RDR;
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    
    xQueueSendFromISR(rx_queue, &byte, &xHigherPriorityTaskWoken);
    
    /* ISR 끝에서 — 더 높은 priority task wake됐다면 yield */
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}
```

`portYIELD_FROM_ISR`은 Cortex-M에서 `SCB->ICSR = PENDSVSET`을 통해 PendSV를 호출합니다.

## portENTER_CRITICAL_FROM_ISR

```c
uint32_t saved = portSET_INTERRUPT_MASK_FROM_ISR();
{
    /* ISR-safe critical — IRQ priority temp boost */
}
portCLEAR_INTERRUPT_MASK_FROM_ISR(saved);
```

ISR 내부에서 더 높은 priority ISR을 차단할 때는 `BASEPRI`를 설정합니다. 이때 기존 BASEPRI 값을 save/restore하는 것이 핵심입니다.

```c
static inline uint32_t portSET_INTERRUPT_MASK_FROM_ISR(void) {
    uint32_t saved_basepri;
    __asm volatile (
        "mrs %0, basepri              \n"
        "mov r0, %1                   \n"
        "msr basepri, r0              \n"
        : "=r"(saved_basepri)
        : "i"(configMAX_SYSCALL_INTERRUPT_PRIORITY)
        : "r0"
    );
    return saved_basepri;
}
```

## ISR 내부에서 Block을 금지하는 이유

```c
void some_isr(void) {
    xSemaphoreTake(sem, 100);   // ✗ 컴파일 에러
}
```

이유를 정리하면 다음과 같습니다.

- ISR은 task가 아니므로 TCB가 없고 block list에도 들어갈 수 없습니다.
- Block이 발생하면 다른 ISR이나 task가 무한 대기에 빠져 deadlock으로 이어집니다.
- ISR 길이가 곧 system response time을 결정합니다.

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

- ISR 길이를 수 µs 수준으로 최소화할 수 있습니다.
- Task context에서 blocking API를 자유롭게 사용할 수 있습니다.
- Priority 조정으로 latency를 제어할 수 있습니다.

## Timer Service (Daemon) Task

```c
/* FreeRTOS internal — config로 활성화 */
void prvTimerTask(void *p) {
    for (;;) {
        /* Wait for command */
        xQueueReceive(xTimerQueue, &cmd, portMAX_DELAY);
        
        switch (cmd.type) {
            case PEND_FUNC_CALL:
                cmd.func(cmd.arg1, cmd.arg2);   // ISR에서 요청한 함수 실행
                break;
            case TIMER_EXPIRED:
                cmd.timer->callback();
                break;
        }
    }
}
```

ISR이 복잡한 작업을 수행해야 한다면 다음과 같이 위임합니다.

```c
void heavy_isr(void) {
    BaseType_t pxHP = pdFALSE;
    
    xTimerPendFunctionCallFromISR(do_heavy_work, arg1, arg2, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

이렇게 하면 daemon task가 `do_heavy_work(arg1, arg2)`를 대신 실행합니다.

## ISR Priority와 configMAX_SYSCALL_INTERRUPT_PRIORITY

FreeRTOS API는 낮은 priority ISR에서만 호출할 수 있습니다.

```c
/* FreeRTOSConfig.h */
#define configMAX_SYSCALL_INTERRUPT_PRIORITY     191   // = 0xBF
#define configKERNEL_INTERRUPT_PRIORITY          255   // = 0xFF (lowest)
```

![Cortex-M priority bands separated by configMAX_SYSCALL_INTERRUPT_PRIORITY](/images/blog/practical-internals/diagrams/part3-09-priority-bands.svg)

> ⚠️ Cortex-M에서 priority는 수치가 클수록 실제 우선순위가 낮아집니다. 헷갈리기 쉬운 부분입니다.

## taskYIELD_FROM_ISR (Cortex-M)

```c
#define portYIELD_FROM_ISR(x) do { \
    if (x != pdFALSE) { \
        portYIELD();   /* SCB->ICSR = PENDSVSET */ \
    } \
} while (0)
```

또는 일부 포트:

```c
portEND_SWITCHING_ISR(xHigherPriorityTaskWoken);
```

`xHigherPriorityTaskWoken == pdFALSE`이면 그대로 ISR이 종료되고 같은 task로 복귀합니다.
`xHigherPriorityTaskWoken == pdTRUE`이면 ISR 종료 직후 PendSV가 발생하고 context switch가 일어납니다.

## ISR과 Task 간 공유 변수의 Atomic Operation

ISR이 task와 공유 변수를 읽고 쓸 때는 barrier가 필요합니다.

```c
volatile uint32_t shared_counter;

void task(void *p) {
    portENTER_CRITICAL();
    uint32_t v = shared_counter;
    portEXIT_CRITICAL();
    /* use v */
}

void isr(void) {
    shared_counter++;   // 32-bit atomic on M-class
}
```

Cortex-M에서 32-bit alignment에 32-bit access는 atomic입니다. 그러나 64-bit 변수는 split read가 발생하므로 critical section이 반드시 필요합니다.

## 자주 하는 실수

> ⚠️ ISR에서 Task API를 호출하는 경우

```c
void isr(void) {
    xQueueSend(q, ...);   // ✗ task API
}
```

이 코드는 block이 가능한 API를 ISR에서 부르는 형태입니다. 컴파일은 통과하지만 런타임에 hard fault나 데이터 corruption이 발생합니다. 항상 `*FromISR` 변형을 사용해야 합니다.

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

낮은 priority IRQ 안에서 `portENTER_CRITICAL_FROM_ISR()`을 호출한 뒤 BASEPRI를 직접 바꾸면 stack이 깨집니다.

## 정리

- ISR API는 non-blocking이며 yield를 명시적으로 호출해야 합니다.
- `pxHigherPriorityTaskWoken`을 통해 task wake 결과를 전달합니다.
- `portYIELD_FROM_ISR`은 PendSV를 pending시켜 ISR 종료 후 switch를 일으킵니다.
- Deferred handler를 사용해 ISR을 짧게 유지하고 무거운 처리는 task에 맡깁니다.
- `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 우선순위가 높은 IRQ에서는 FreeRTOS API를 호출하면 안 됩니다.

다음 편에서는 deadlock 패턴의 발견과 예방을 다룹니다.

## 관련 항목

- [3-08: Event Group](/blog/embedded/rtos/practical-internals/part3-08-event-group)
- [3-10: Deadlock 패턴](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
