---
title: "3-09: ISR-Safe API — FromISR 패턴·Higher Priority Wake·Deferred Work"
date: 2026-05-13T06:00:00
description: "*FromISR API 내부 — pxHigherPriorityTaskWoken·yield 결정·deferred work pattern."
series: "Practical RTOS Internals"
seriesOrder: 30
tags: [isr-safe, fromisr, higher-priority, deferred]
draft: true
---

## 한 줄 요약

> **"FromISR API = block 불가 + yield 명시"** — *task API와 분리*해 안전성 확보.

## API 명명 규칙

```c
/* Task context */
xQueueSend(q, &item, xTicksToWait);
xSemaphoreTake(sem, xTicksToWait);

/* ISR context */
xQueueSendFromISR(q, &item, &xHigherPriorityTaskWoken);
xSemaphoreGiveFromISR(sem, &xHigherPriorityTaskWoken);
```

차이점:

| 항목 | Task API | ISR API |
|---|---|---|
| Block 가능 | O (timeout) | X (timeout 인자 없음) |
| Critical section | `portENTER_CRITICAL` | `portENTER_CRITICAL_FROM_ISR` |
| Wake 결과 | 자동 yield | `pxHigherPriorityTaskWoken` 반환 |
| Reschedule | 함수 내부 | 호출자가 명시 |

## pxHigherPriorityTaskWoken — 왜 필요한가

ISR이 task wake → 깨어난 task의 priority가 *interrupted task*보다 높으면 *ISR 종료 후 context switch*. 그러나 ISR 자체는 *task switch 직접 호출 못 함* — pending 비트만 set, ISR exit 시점에 처리.

```c
void uart_rx_isr(void) {
    uint8_t byte = UART->RDR;
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    
    xQueueSendFromISR(rx_queue, &byte, &xHigherPriorityTaskWoken);
    
    /* ISR 끝에서 — 더 높은 priority task wake됐다면 yield */
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}
```

`portYIELD_FROM_ISR` — Cortex-M에서는 `SCB->ICSR = PENDSVSET` → PendSV 호출.

## portENTER_CRITICAL_FROM_ISR

```c
uint32_t saved = portSET_INTERRUPT_MASK_FROM_ISR();
{
    /* ISR-safe critical — IRQ priority temp boost */
}
portCLEAR_INTERRUPT_MASK_FROM_ISR(saved);
```

ISR 내부에서 *더 높은 priority ISR* 차단 — `BASEPRI` 설정. 기존 BASEPRI 값을 *save/restore*.

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

## ISR 내부 Block 금지 이유

```c
void some_isr(void) {
    xSemaphoreTake(sem, 100);   // ✗ 컴파일 에러
}
```

- ISR은 *task가 아님* — TCB 없음, block list에 못 들어감
- Block → 다른 ISR/task 무한 대기 → deadlock
- ISR 길이 = system response time 결정

**규칙** — ISR은 *비동기 신호 송신*만, 처리 자체는 *task에 위임*.

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

장점:
- ISR 길이 최소화 (수 µs)
- Task context에서 *blocking API 사용 가능*
- Priority 조정으로 *latency 제어*

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

ISR이 *복잡한 작업* 필요 시:

```c
void heavy_isr(void) {
    BaseType_t pxHP = pdFALSE;
    
    xTimerPendFunctionCallFromISR(do_heavy_work, arg1, arg2, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

Daemon task가 `do_heavy_work(arg1, arg2)` 실행.

## ISR Priority — configMAX_SYSCALL_INTERRUPT_PRIORITY

FreeRTOS API는 *낮은 priority ISR*에서만 호출 가능.

```c
/* FreeRTOSConfig.h */
#define configMAX_SYSCALL_INTERRUPT_PRIORITY     191   // = 0xBF
#define configKERNEL_INTERRUPT_PRIORITY          255   // = 0xFF (lowest)
```

```text
                  Priority
0 (highest) ─┬─── Hard real-time IRQ (FreeRTOS API 금지)
             │
0xBF (191) ──┤──── configMAX_SYSCALL_INTERRUPT_PRIORITY
             │     ↑ 이 line 위 (priority value < 191) IRQ는 FreeRTOS API 금지
             │     ↓ 이 line 아래 (priority value ≥ 191) IRQ는 *FromISR 호출 OK*
0xFF (255) ──┴─── Kernel·Tick·SysCall (lowest)
```

> ⚠️ Cortex-M priority *수치 ↑ = priority ↓*. 헷갈리기 쉬움.

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

`xHigherPriorityTaskWoken == pdFALSE` → 그대로 ISR 종료, 같은 task 복귀.
`xHigherPriorityTaskWoken == pdTRUE` → ISR 종료 직후 PendSV → context switch.

## Atomic Operation — ISR ↔ Task Variable

ISR이 task와 공유 변수 R/W 시 *barrier* 필요.

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

32-bit alignment + 32-bit access는 *Cortex-M에서 atomic*. 64-bit 변수는 *split read* — critical section 필수.

## 자주 하는 실수

> ⚠️ ISR에서 Task API 호출

```c
void isr(void) {
    xQueueSend(q, ...);   // ✗ task API
}
```

Block 가능 → 컴파일은 됨, 런타임에 *hard fault* 또는 *데이터 corruption*. 항상 `*FromISR` 사용.

> ⚠️ pxHigherPriorityTaskWoken 누락

```c
void isr(void) {
    BaseType_t pxHP = pdFALSE;
    xSemaphoreGiveFromISR(sem, &pxHP);
    /* portYIELD_FROM_ISR 안 호출 */
}
```

Wake 발생해도 *yield 안 함* → high-priority task 대기. *Latency 증가*.

> ⚠️ ISR Priority가 configMAX_SYSCALL_INTERRUPT_PRIORITY 위

```c
NVIC_SetPriority(UART1_IRQn, 0);   // Highest — FreeRTOS API 금지 영역
```

여기서 `xQueueSendFromISR` 호출 시 *kernel data 손상*. 항상 *낮은 priority*.

> ⚠️ Critical section 안 nested ISR

낮은 priority IRQ 안 `portENTER_CRITICAL_FROM_ISR()` 후 *직접 BASEPRI 변경*. Stack 깨짐.

## 정리

- ISR API = **non-blocking + 명시 yield**.
- **pxHigherPriorityTaskWoken**으로 task wake 결과 전달.
- **portYIELD_FROM_ISR** = PendSV pending → ISR 종료 후 switch.
- **Deferred handler**로 ISR 짧게, 무거운 처리는 task에서.
- **configMAX_SYSCALL_INTERRUPT_PRIORITY** 위 IRQ는 FreeRTOS API 금지.

다음 편은 **Deadlock 패턴** — 발견·예방.

## 관련 항목

- [3-08: Event Group](/blog/embedded/rtos/practical-internals/part3-08-event-group)
- [3-10: Deadlock 패턴](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
