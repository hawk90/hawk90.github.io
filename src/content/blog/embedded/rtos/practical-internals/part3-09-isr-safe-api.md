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

이 글의 register·PendSV 설명은 **FreeRTOS V11.2.0(commit `0adc196d`) GCC/ARM_CM4F** 포트 기준입니다. 실행 결과는 이 포트를 `arm-none-eabi-gcc` 16.2.0(`-mcpu=cortex-m4 -mfpu=fpv4-sp-d16 -mfloat-abi=hard`)으로 빌드해 QEMU 11.1.3 `mps2-an386`(Cortex-M4)에서 돌린 출력입니다. interrupt는 NVIC의 ISPR 레지스터에 직접 써서 pending시켰습니다.

ISR은 응급실 접수 창구와 비슷합니다. 창구 직원은 환자를 직접 치료하지 않고 접수만 한 뒤 의사(task)를 호출합니다. 창구에서 줄을 서서 기다리는 일(block)은 할 수 없고, 의사를 부를지 말지는 접수가 끝날 때 한 번에 정합니다.

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
| Critical section | `taskENTER_CRITICAL()` → `vPortEnterCritical()` (nesting count) | `taskENTER_CRITICAL_FROM_ISR()` → `ulPortRaiseBASEPRI()` (이전 BASEPRI 반환) |
| Wake 결과 | 함수 안에서 yield | `pxHigherPriorityTaskWoken`에 기록 |
| Reschedule | 함수 내부 | 호출자가 `portYIELD_FROM_ISR()`로 요청 |

## pxHigherPriorityTaskWoken은 왜 필요한가

FromISR API는 깨운 task의 priority가 지금 interrupt당한 task보다 높으면 `*pxHigherPriorityTaskWoken`을 `pdTRUE`로 씁니다. `pdFALSE`로 되돌려 쓰지는 않으므로, 한 ISR에서 여러 API를 부를 때는 ISR 처음에 한 번만 `pdFALSE`로 초기화하고 같은 변수를 넘깁니다. 끝에서 `portYIELD_FROM_ISR()`로 switch를 요청합니다.

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

`read_and_ack_rx()`와 `count_rx_drop()`은 보드 코드가 채울 자리입니다. ARM_CM4F의 `portYIELD_FROM_ISR(x)`는 `portEND_SWITCHING_ISR(x)`이고(`portmacro.h:101-114`), `x`가 참이면 `portYIELD()`가 ICSR(`0xe000ed04`)에 `PENDSVSET`(bit 28)을 씁니다(`:88-100`). switch는 PendSV가 실행될 때 일어나는데, `xPortStartScheduler()`가 PendSV를 가장 낮은 priority(255)로 설정하므로(`port.c:65-66`, `:433`) 지금 ISR과 중첩된 다른 ISR이 모두 끝난 뒤에 돕니다.

yield를 부를 때와 안 부를 때의 차이를 직접 쟀습니다. priority 1의 low task가 카운터를 올리는 도중 IRQ 3을 pending시키고, ISR이 binary semaphore를 give해 priority 3의 handler task를 깨웁니다. handler는 깨어난 순간의 카운터 값과 tick을 찍습니다.

```text
[with portYIELD_FROM_ISR]
  pend IRQ at tick=3
  handler ran: low-task progress at ISR=0, at handler=0, tick=3
[without portYIELD_FROM_ISR]
  pend IRQ at tick=66
  handler ran: low-task progress at ISR=0, at handler=19430, tick=67
```

yield를 부르면 ISR이 끝나자마자 handler가 돌아서 low task는 한 번도 더 돌지 못했습니다. 부르지 않으면 handler는 다음 SysTick(tick 67)까지 기다리고, 그동안 low task가 카운터를 19430까지 올렸습니다. 카운터 값 자체는 QEMU 속도라 의미가 없고, 볼 것은 "다음 tick까지 밀린다"는 점입니다. 1 kHz tick이면 최대 1 ms입니다.

## portENTER_CRITICAL_FROM_ISR

ARM_CM4F에서 `portSET_INTERRUPT_MASK_FROM_ISR()`는 `ulPortRaiseBASEPRI()`, `portCLEAR_INTERRUPT_MASK_FROM_ISR(x)`는 `vPortSetBASEPRI(x)`입니다(`portmacro.h:120-121`). `ulPortRaiseBASEPRI()`(`:229`)는 현재 BASEPRI를 읽어 돌려주고, BASEPRI에 `configMAX_SYSCALL_INTERRUPT_PRIORITY`를 쓴 뒤 `isb`·`dsb`를 합니다. 이전 값을 돌려받아 나갈 때 그대로 복원하므로 중첩된 ISR에서도 안전합니다. task 쪽 `vPortEnterCritical()`처럼 nesting count를 쓰지 않는 이유가 이것입니다.

BASEPRI는 그 값 이상(긴급도가 같거나 낮은) interrupt만 막습니다. 그래서 threshold보다 숫자가 작은 IRQ는 FreeRTOS critical section 안에서도 들어옵니다. 그런 IRQ는 kernel 자료구조를 건드리면 안 되므로 FreeRTOS API를 부를 수 없습니다.

## ISR 내부에서 Block을 금지하는 이유

```c
void some_isr(void) {
    xSemaphoreTake(sem, 100);   // 회피: 컴파일은 됩니다
}
```

block은 "현재 task"의 TCB를 event list와 delayed list에 넣고 다른 task로 switch하는 일입니다. ISR이 실행 중일 때 `pxCurrentTCB`는 interrupt당한 task를 가리키므로, ISR에서 block하면 그 task를 엉뚱하게 재우게 됩니다. 게다가 ISR이 끝나지 않으면 PendSV도 돌 수 없어서 switch 자체가 일어나지 않습니다.

ARM_CM4F 포트는 이 실수를 잡는 assert를 둡니다. `vPortEnterCritical()`은 nesting이 1일 때 ICSR의 `VECTACTIVE`가 0인지 확인합니다(`port.c:475-487`). 모든 task API는 critical section으로 들어가므로, ISR에서 task API를 부르면 여기서 걸립니다.

**규칙은 단순합니다.** ISR은 비동기 신호 송신만 담당하고, 실제 처리는 task에 위임합니다.

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

이렇게 나누면 얻는 것은 세 가지입니다.

- ISR 안에는 give 한 번만 남습니다. 무거운 처리는 interrupt를 열어 둔 채 task에서 합니다.
- handler task 안에서는 mutex·queue·delay 같은 blocking API를 그대로 쓸 수 있습니다.
- handler task의 priority로 처리 순서를 정할 수 있습니다. 앞의 실행처럼 `portYIELD_FROM_ISR()`과 함께 쓰면 ISR이 끝나자마자 handler가 돕니다.

## Timer Service (Daemon) Task

`xTimerPendFunctionCallFromISR()`는 `tmrCOMMAND_EXECUTE_CALLBACK_FROM_ISR` 메시지를 만들어 `xQueueSendFromISR()`로 timer command queue에 넣습니다(`timers.c:1248-1253`). 그래서 반환값은 enqueue 성공 여부이고, queue(`configTIMER_QUEUE_LENGTH`)가 차 있으면 `pdFAIL`입니다. 함수 포인터와 인자 두 개(`void *`, `uint32_t`)만 복사되므로, 포인터로 넘긴 데이터는 callback이 실행될 때까지 살아 있어야 합니다. 3-08의 `xEventGroupSetBitsFromISR()`가 이 경로로 bit 설정을 미룹니다.

callback은 timer daemon task 안에서 차례로 실행되므로, 한 callback이 오래 걸리면 다른 timer의 만료 처리도 그만큼 밀립니다. 큰 작업은 별도 worker task로 넘기고 daemon callback은 짧고 block하지 않게 유지합니다.

## ISR Priority와 Yield의 범위

`configMAX_SYSCALL_INTERRUPT_PRIORITY`는 NVIC IPR·BASEPRI에 그대로 쓰는 8-bit register 값입니다. `xPortStartScheduler()`는 첫 user IPR에 `0xff`를 쓰고 읽어 남은 bit를 구한 뒤(`port.c:364-367`), bit 7부터 연속된 1을 셉니다(`:387-391`). 구현된 bit가 byte의 상위에 붙어 있다는 뜻이고, 그래서 구현 bit가 4개인 칩에서 논리 priority 5는 `5 << (8 - 4) = 0x50`이 됩니다. 같은 함수는 threshold가 마스킹 후 0이 되면 assert로 멈춥니다(`:378`). 소스 주석은 그 이유로 BASEPRI 0은 모든 interrupt를 풀고, priority 0 interrupt는 BASEPRI로 막을 수 없다고 적습니다. QEMU `mps2-an386`은 8 bit를 모두 구현합니다. 이 경우 주석(`:393-399`)대로 PRIGROUP으로 sub-priority를 없앨 수 없어 최하위 bit는 항상 sub-priority가 됩니다.

```text
NVIC priority bits implemented: IPR readback of 0xFF = 0xff
```

![ARM_CM4F의 interrupt priority 구간 — threshold보다 register 값이 작은 IRQ는 FreeRTOS API 금지, 같거나 큰 IRQ는 FromISR API 사용 가능, PendSV와 SysTick은 가장 낮은 priority](/images/blog/practical-internals/diagrams/part3-09-priority-bands.svg)

그림의 경계선 하나가 이 절의 규칙 전부입니다. `port.c`의 `vPortValidateInterruptPriority()`(`:851`)는 현재 IRQ의 priority 값이 threshold 이상인지 `configASSERT`로 검사하고(`:888`), queue의 FromISR 함수들은 시작할 때 `portASSERT_IF_INTERRUPT_PRIORITY_INVALID()`로 이 함수를 부릅니다(`queue.c:1189`).

`woken == pdFALSE`는 그 API가 더 높은 task를 깨우지 않았다는 뜻일 뿐입니다. 다른 ISR이 이미 PendSV를 걸어 두었을 수 있습니다.

## ISR과 Task 간 공유 변수의 Atomic Operation

`volatile`은 컴파일러가 접근을 없애거나 합치지 못하게 할 뿐, 상호 배제를 주지 않습니다. `shared_counter++`는 load·add·store 세 명령이라, task가 load와 store 사이에서 interrupt당하고 ISR이 같은 변수를 올리면 ISR의 증가분이 사라집니다.

task 쪽에서는 그 구간을 `taskENTER_CRITICAL()`로 감쌉니다. ARM_CM4F에서 이것은 BASEPRI를 threshold로 올리므로, threshold 이상(숫자가 큰) IRQ만 막습니다. threshold보다 높은 IRQ와 공유하는 변수는 critical section으로 보호되지 않습니다. 그런 IRQ와는 변수를 공유하지 않거나, 한쪽만 쓰고 다른 쪽은 읽기만 하는 구조로 설계합니다.

## 자주 하는 실수

> ⚠️ ISR에서 Task API를 호출하는 경우

```c
void isr(void) {
    xQueueSend(q, ...);   // ✗ task API
}
```

이 코드는 컴파일이 되고, `configASSERT`를 끈 빌드에서는 그대로 실행됩니다. assert를 켠 빌드에서 ISR 안에 `xQueueSend(q, &v, 0)`을 넣고 돌렸더니 첫 critical section 진입에서 멈췄습니다.

```text
[xQueueSend() (task API) called inside an ISR]
ASSERT FAIL ( portNVIC_INT_CTRL_REG & portVECTACTIVE_MASK ) == 0 at ../src/freertos-V11.2.0/portable/GCC/ARM_CM4F/port.c:487
```

개발 빌드에서 `configASSERT`를 켜 두면 이런 실수를 첫 실행에 잡습니다. ISR에서는 항상 `*FromISR` 변형을 씁니다.

> ⚠️ pxHigherPriorityTaskWoken을 누락하는 경우

```c
void isr(void) {
    BaseType_t pxHP = pdFALSE;
    xSemaphoreGiveFromISR(sem, &pxHP);
    /* portYIELD_FROM_ISR 안 호출 */
}
```

앞의 실행에서 본 대로 high-priority task는 다음 SysTick까지 기다립니다. 1 kHz tick에서 최대 1 ms가 늘어납니다.

> ⚠️ ISR Priority가 configMAX_SYSCALL_INTERRUPT_PRIORITY보다 높은 경우

```c
NVIC_SetPriority(UART1_IRQn, 0);   // Highest — FreeRTOS API 금지 영역
```

이 IRQ는 FreeRTOS critical section 안에서도 들어오므로, 여기서 FromISR API를 부르면 task 쪽이 고치고 있던 list를 동시에 고치게 됩니다. assert를 켠 빌드에서 priority 0 IRQ가 `xSemaphoreGiveFromISR()`를 부르게 했더니 `vPortValidateInterruptPriority()`가 잡았습니다.

```text
[IRQ priority 0x00 (above configMAX_SYSCALL_INTERRUPT_PRIORITY=0x40) calls FromISR]
ASSERT FAIL ucCurrentPriority >= ucMaxSysCallPriority at ../src/freertos-V11.2.0/portable/GCC/ARM_CM4F/port.c:888
```

FreeRTOS API를 부르는 IRQ는 threshold 이상(숫자가 같거나 큰) priority로 설정합니다.

> ⚠️ Critical section 안에서 nested ISR이 BASEPRI를 직접 변경하는 경우

`ulPortRaiseBASEPRI()`가 돌려준 값을 무시하고 ISR 안에서 BASEPRI를 0으로 쓰면, 바깥 critical section이 막아 두었던 IRQ가 그 자리에서 들어옵니다. 바깥 코드가 고치던 list를 그 IRQ가 동시에 고치게 됩니다. BASEPRI는 `portSET_INTERRUPT_MASK_FROM_ISR()`·`portCLEAR_INTERRUPT_MASK_FROM_ISR()` 쌍으로만 바꿉니다.

## 정리

- ISR API는 non-blocking이며 yield를 명시적으로 호출해야 합니다.
- `pxHigherPriorityTaskWoken`을 통해 task wake 결과를 전달합니다.
- `portYIELD_FROM_ISR`은 PendSV를 pending시켜 ISR 종료 후 switch를 일으킵니다. 빠뜨리면 깨운 task가 다음 tick까지 밀립니다(QEMU 실행으로 확인).
- Deferred handler를 사용해 ISR을 짧게 유지하고 무거운 처리는 task에 맡깁니다.
- `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 우선순위가 높은 IRQ에서는 FreeRTOS API를 호출하면 안 됩니다. `configASSERT`를 켜면 `port.c:888`과 `:487`의 assert가 두 실수를 잡습니다.

다음 [3-10](/blog/embedded/rtos/practical-internals/part3-10-deadlock)에서는 deadlock 패턴의 발견과 예방을 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h), [port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c), [timers.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/timers.c).

## 관련 항목

- [3-08: Event Group](/blog/embedded/rtos/practical-internals/part3-08-event-group)
- [3-10: Deadlock 패턴](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
