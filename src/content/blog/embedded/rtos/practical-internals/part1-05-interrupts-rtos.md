---
title: "인터럽트와 RTOS — ISR Context·Deferred Processing·FromISR API"
slug: "embedded/rtos/practical-internals/part1-05-interrupts-rtos"
date: 2026-05-04T09:05:00
description: "ISR은 task가 아니므로 context도 따로 관리됩니다. Long work는 deferred task로 넘기고, FromISR API 패턴을 씁니다."
series: "Practical RTOS Internals"
seriesOrder: 5
tags: [rtos, isr, deferred, fromisr, bottom-half]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"ISR은 짧게, 일은 task에 맡깁니다."** Bottom-half 패턴이 RTOS와 OS의 공통 답입니다.

## ISR Context — task와 다른 세계

ISR이 실행 중일 때는 다음 규칙이 적용됩니다.

- Cortex-M의 FreeRTOS 포트에서 task는 PSP로 돌고(첫 task를 시작할 때 EXC_RETURN에 `orr r14, #0xd`, [`ARM_CM3/port.c` L239](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L239)), 예외가 들어오면 하드웨어가 8 word frame을 그 PSP에 쌓은 뒤 handler는 MSP로 실행합니다(DDI 0403E.b B1.5.6).
- 같은 코어의 task 실행은 ISR이 점유합니다. scheduler 자료구조와 다른 코어까지 모두 비활성화되는 것은 아닙니다.
- **다른 ISR만 nested로 가능합니다** (priority가 더 높은 경우).
- **blocking이 불가능합니다.** ISR은 task가 아니므로 Blocked 상태로 들어갈 TCB가 없습니다. 1-02에서 본 것처럼 Cortex-M3 포트는 ISR에서 task용 API를 부르면 `configASSERT`로 멈춥니다.

```c
void TIM1_IRQHandler(void) {
    // API 사용을 허용한 IRQ priority와 공유변수 보호 계약 필요
    counter++;
    xSemaphoreGiveFromISR(sem, &woken);

    // ✗ 절대 금지: blocking
    // xSemaphoreTake(sem, portMAX_DELAY);  // ISR 계약 위반
    // vTaskDelay(10);                       // ISR 계약 위반
    // printf("..."); // 구현의 lock·재진입·대기 계약을 확인하지 않은 일반 stdio
}
```

## Bottom-Half / Top-Half 패턴

![Top-Half (ISR) + Bottom-Half (Task) pattern](/images/blog/practical-internals/diagrams/part1-05-top-bottom-half.svg)

식당에 비유하면 top-half는 주문을 받아 주방에 전표를 꽂는 홀 직원이고, bottom-half는 실제로 요리하는 주방입니다. 홀 직원이 요리까지 하면 그동안 다른 손님의 주문을 받지 못합니다. Linux 커널 문서는 이 나중 처리 부분을 "bottom halves"라는 이름으로 불러 왔고([v6.12 `Documentation/kernel-hacking/hacking.rst`](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/Documentation/kernel-hacking/hacking.rst?h=v6.12) L95), RTOS에서는 ISR이 task를 깨우는 구조가 같은 역할을 합니다.

### Top-Half (ISR)

- HW interrupt를 직접 처리합니다.
- *최소 작업만* 합니다 (flag 설정, 데이터 캡처, signal task).
- ISR이 도는 동안 같거나 낮은 우선순위 IRQ와 모든 task가 기다리므로, 최대 실행량을 정해 둡니다.

### Bottom-Half (Task)

- 실제 데이터 처리, 로깅, 전송을 합니다.
- 일반 task이므로 자신의 문맥·소유권·lock·대기 조건을 만족하는 task용 API를 사용할 수 있습니다.
- 오래 걸려도 자기보다 높은 우선순위 task와 모든 IRQ는 선점해 들어올 수 있습니다.

### 패턴 예 — UART 수신

아래는 UART 수신 ISR이 바이트를 queue에 넣고, task가 꺼내 처리하는 구조입니다. `read_uart_byte_from_isr`가 status 확인과 인터럽트 acknowledge를 맡고 바이트를 얻었을 때만 true를 반환합니다. RX queue는 IRQ를 켜기 전에 1바이트 item으로 만들어 둡니다.

```c title="uart-handoff.c"
#include <stdbool.h>
#include <stdint.h>
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
extern QueueHandle_t rxQueue;
extern bool read_uart_byte_from_isr(uint8_t *out);
extern void record_rx_drop_from_isr(void); // 비차단·ISR-safe, platform 제공
extern void process_byte(uint8_t c);
void USART1_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    uint8_t c;
    if (read_uart_byte_from_isr(&c) &&
        xQueueSendFromISR(rxQueue, &c, &woken) != pdPASS) {
        record_rx_drop_from_isr();
    }
    portYIELD_FROM_ISR(woken);
}
void uart_rx_task(void *arg) {
    (void)arg;
    uint8_t c;
    for (;;) {
        if (xQueueReceive(rxQueue, &c, portMAX_DELAY) == pdPASS) process_byte(c);
    }
}
```

### QEMU에서 실제 UART 인터럽트로 돌려 보기

같은 구조를 QEMU `mps2-an385`의 CMSDK APB UART0에 맞춰, handler 이름을 `UART0RX_IRQHandler`로 바꾸고 ISR별 기록과 첫 바이트 이후 200 tick receive timeout을 더해 돌렸습니다. 이 보드에서 UART0 RX 인터럽트는 IRQ 0, TX는 IRQ 1입니다(QEMU v11.1.3 `hw/arm/mps2.c` L294-L309). 레지스터는 DATA(0x40004000)·STATE(+0x04, bit 1 = RX full)·CTRL(+0x08, bit 3 = RX 인터럽트 enable)·INTSTATUS/INTCLEAR(+0x0C, bit 1 = RX, 1을 써서 지움)입니다. queue 길이는 4, IRQ 0 우선순위는 0xE0입니다. 호스트에서 `ABCDEFGHIJ` 10바이트를 한 번에 보냈습니다.

```c title="uart-handoff.c (보드 의존 부분)"
static bool read_uart_byte_from_isr(uint8_t *out){ UART0_INTCLR=2; if(!(UART0_STATE & 2)) return false; *out=(uint8_t)UART0_DATA; return true; }  /* clear RX int before reading DATA */
```

```bash
(sleep 1; printf 'ABCDEFGHIJ'; sleep 3) | \
  qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel uart-handoff.elf
```

```text
rx[0]='A' at +0 ticks
rx[1]='B' at +0 ticks
rx[2]='C' at +0 ticks
rx[3]='D' at +0 ticks
received=4 isr_count=10 drops=6
isr 0: 'A' queued  at +0 ticks
isr 1: 'B' queued  at +0 ticks
isr 2: 'C' queued  at +0 ticks
isr 3: 'D' queued  at +0 ticks
isr 4: 'E' dropped at +0 ticks
isr 5: 'F' dropped at +0 ticks
isr 6: 'G' dropped at +0 ticks
isr 7: 'H' dropped at +0 ticks
isr 8: 'I' dropped at +0 ticks
isr 9: 'J' dropped at +0 ticks
```

ISR은 10번 돌았고 앞의 4바이트만 queue에 들어갔습니다. `A`가 들어가자 `uart_rx_task`가 ready가 되었지만, QEMU의 UART는 baud rate 지연 없이 DATA를 읽는 즉시 다음 바이트를 넣어 IRQ가 바로 다시 떴습니다. 그래서 task는 10바이트가 다 들어올 때까지 한 번도 돌지 못했고, 다섯 번째부터는 `xQueueSendFromISR()`가 실패해 `drops`가 6이 되었습니다. 실제 115200 baud UART라면 바이트 하나(10비트)가 약 86.8 µs마다 오므로 그 사이에 task가 돌 기회가 생깁니다. 하지만 ISR이 연달아 들어오면 bottom-half가 굶고 queue가 넘친다는 구조는 같습니다. 반환값을 검사해 drop을 세지 않았다면 이 6바이트는 흔적 없이 사라졌을 것입니다.

INTCLEAR를 DATA를 읽은 *뒤에* 쓰는 처음 버전은 첫 바이트 하나만 받고 멈췄습니다. QEMU의 UART 모델은 DATA를 읽을 때 RX full을 내리고 곧바로 `qemu_chr_fe_accept_input()`을 불러 다음 바이트를 받습니다([v11.1.3 `hw/char/cmsdk-apb-uart.c` L159-L168](https://github.com/qemu/qemu/blob/v11.1.3/hw/char/cmsdk-apb-uart.c#L159-L168)). 이때 `uart_receive()`가 RX 인터럽트 상태를 다시 세우는데(L147-L149), 그 직후의 INTCLEAR가 이를 지워 버렸습니다. 인터럽트 상태를 지우는 시점과 데이터를 읽는 시점의 순서가 인터럽트 하나를 잃게 만들 수 있다는 예입니다. 레지스터 이름과 순서 규칙은 칩마다 다르므로(예: STM32 F4의 `DR`과 다른 계열의 `RDR`) 그 칩의 reference manual을 따릅니다.

## FromISR API — RTOS의 ISR-safe 변종

| Task용 | ISR용 |
| --- | --- |
| `xQueueSend` | `xQueueSendFromISR` |
| `xQueueReceive` | `xQueueReceiveFromISR` |
| `xSemaphoreGive` | `xSemaphoreGiveFromISR` |
| `xSemaphoreTake` | `xSemaphoreTakeFromISR` (= `xQueueReceiveFromISR`, 대기 없음) |
| `xTaskNotify` | `xTaskNotifyFromISR` |
| `xEventGroupSetBits` | `xEventGroupSetBitsFromISR` |

*FromISR*은 차이가 있습니다. *blocking이 없고*, 대기하지 않고 필요 시 task를 Ready로 만들며, `xHigherPriorityTaskWoken`으로 yield 필요성을 전달합니다. `xSemaphoreTakeFromISR`은 `xQueueReceiveFromISR(..., NULL, ...)`의 매크로입니다([`semphr.h` L675](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L675)). `xEventGroupSetBitsFromISR`는 비트를 직접 세우지 않고 `xTimerPendFunctionCallFromISR()`로 timer daemon task에 처리를 넘깁니다([`event_groups.c` L826](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/event_groups.c#L826)). 그래서 `configUSE_TIMERS`가 켜져 있어야 하고, 비트가 실제로 세워지는 시점은 daemon task가 돌 때입니다([`event_groups.h` L541-L565](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/event_groups.h#L541-L565)).

```c
BaseType_t xHigherPriorityTaskWoken = pdFALSE;

xQueueSendFromISR(q, &data, &xHigherPriorityTaskWoken);
// 위 호출이 higher-priority task를 ready로 만들면 pdTRUE

portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
// 필요한 전환 요청; 실제 실행은 mask·예외 priority·중첩 상태에 따름
```

## ISR Priority 설정 — Cortex-M

NVIC에서 IRQ priority를 설정합니다. 중요한 점은 *FreeRTOS 호환 영역* 안에서만 FromISR API를 사용할 수 있다는 것입니다.

```c
// 4비트 NVIC priority, subpriority 없이 preemption priority로 사용하는 예
// FreeRTOSConfig.h
#define configMAX_SYSCALL_INTERRUPT_PRIORITY  (5 << (8 - __NVIC_PRIO_BITS))
#define configKERNEL_INTERRUPT_PRIORITY       (15 << (8 - __NVIC_PRIO_BITS))

// 적용
NVIC_SetPriority(USART1_IRQn, 6);
// NVIC 논리값6은 논리경계5보다 urgency가 낮음. 인코딩값0x50과 숫자6을 직접비교하지않음
// → FromISR API 사용 가능
```

위 숫자는 priority 비트 4개를 구현한 칩의 예시입니다. `NVIC_SetPriority`에는 논리값을, BASEPRI 설정에는 상위 비트로 shift된 값을 사용합니다. **Cortex-M의 priority는 값이 작을수록 urgency가 높습니다.** 은행 번호표와 반대라서 처음 만나면 헷갈립니다. 구현된 비트 수는 칩마다 다르므로 IPR에 0xFF를 써 보고 읽어 확인합니다. QEMU `mps2-an385`는 0xFF를 그대로 돌려주어 8비트를 모두 구현합니다.

경계를 넘으면 무슨 일이 생기는지 QEMU에서 확인했습니다. 이 장의 config는 `configMAX_SYSCALL_INTERRUPT_PRIORITY`가 `(5<<5)` = 0xA0입니다. TIMER0 IRQ(IRQ 8)의 우선순위를 0xE0, 0xA0, 0x80으로 바꿔 가며 handler에서 `xSemaphoreGiveFromISR()`를 불렀습니다.

```text
IRQ8 priority 0xe0 -> ok
IRQ8 priority 0xa0 -> ok
IRQ8 priority 0x80 -> ASSERT failed: portable/GCC/ARM_CM3/port.c line 803
```

0x80은 숫자가 경계보다 작으므로 *더 급한* IRQ입니다. FromISR API 안의 `portASSERT_IF_INTERRUPT_PRIORITY_INVALID()`가 `vPortValidateInterruptPriority()`를 부르고, 이 함수가 현재 IRQ의 우선순위가 `ucMaxSysCallPriority` 이상인지 검사합니다([`ARM_CM3/port.c` L803](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L803)). 이런 IRQ는 critical section의 BASEPRI로 막히지 않으므로 커널 자료구조를 고치는 도중에 끼어들 수 있기 때문입니다. `configASSERT`가 없는 빌드에서는 이 검사가 사라지고 경합만 남습니다.

### Priority 분리

- **High priority** (값 0-4): RTOS와 무관한 *순수 HW critical* 영역입니다 (모터 제어 ISR 등). FromISR API를 **사용할 수 없습니다**.
- **Medium priority** (값 5+): FromISR API를 사용할 수 있습니다. 일반 ISR입니다.
- `configKERNEL_INTERRUPT_PRIORITY` (값 15): tick과 PendSV가 여기에 속합니다.

## ISR Latency

ISR이 trigger 되고 *실제 ISR 코드 첫 줄이 실행될 때*까지의 시간을 말합니다.

Cortex-M4 TRM(ARM DDI 0439B) 3.9.1은 하드웨어 부분을 이렇게 적습니다. wait state가 없는 메모리에서 인터럽트 assert부터 ISR 첫 명령까지 최대 **12 cycle**이고(첫 명령 fetch는 stack push와 병렬), 복귀도 12 cycle, 연속 인터럽트의 tail-chaining은 **6 cycle**입니다. 나눗셈 명령은 버리고 다시 시작하며, LDM/STM은 중단 후 이어서 실행합니다.

이 숫자는 조건이 붙은 하드웨어 상한입니다. 다음은 그 위에 더해집니다.

- flash wait state (TRM 숫자는 zero wait state 기준)
- BASEPRI로 막힌 critical section의 길이와 더 높은 우선순위 ISR 실행 시간
- FPU를 쓰는 task가 인터럽트당했을 때의 FP 레지스터 stacking

이 장에서는 실제 보드의 cycle이나 ns를 재지 않았습니다. QEMU는 명령 단위로 실행하므로 cycle 수를 재현하지 않습니다. 측정 방법은 [2-10](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)에서 다룹니다.

## ISR Storm 방지

interrupt가 *너무 자주* 발생하면 main loop가 굶게 됩니다.

### NAPI 패턴 (Linux 네트워킹)

```c
void NIC_IRQHandler(void) {
    disable_nic_irq();              // 더 이상 IRQ 안 받음
    notify_napi_task();             // poll mode로 전환
}

void napi_task(void *arg) {
    while (1) {
        while (data_pending()) {
            read_packet();          // polling
        }
        enable_nic_irq();           // 다시 IRQ mode
        wait_for_signal();
    }
}
```

위 코드는 RTOS로 옮긴 개념도이며 Linux NAPI 구현이 아닙니다. Linux NAPI 문서([v6.12 `Documentation/networking/napi.rst`](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/Documentation/networking/napi.rst?h=v6.12))는 두 규칙을 둡니다. poll 함수는 한 번에 `budget`개까지만 처리하고 일이 남으면 정확히 `budget`을 반환해 다시 불리기를 기다리며(L63-L81), IRQ는 `napi_complete_done()`이 성공한 뒤에만 unmask합니다(L136). 위 조각에는 budget이 없어 데이터가 계속 오면 `napi_task`보다 낮은 task가 굶습니다. 또 `enable_nic_irq()`와 `wait_for_signal()` 사이에 도착한 패킷의 신호는 task notification처럼 *기억되는* primitive여야 잃지 않습니다. 앞의 UART 실험이 budget 없는 ISR이 bottom-half를 굶긴 실제 예입니다.

## ISR과 Task 통신 메커니즘 비교

| 방법 | 전달 의미 | 넘치면 |
| --- | --- | --- |
| volatile flag | 마지막 값 하나. 여러 번 세워도 한 번으로 보임 | 이전 신호가 합쳐짐 |
| queue | item을 값으로 복사해 순서대로 전달 | `xQueueSendFromISR`가 `errQUEUE_FULL` 반환 (위 UART 실험의 drop) |
| binary semaphore | 0/1. 여러 번 give해도 1 | 두 번째 give는 실패 반환 |
| counting semaphore | 최대 count까지 누적 | 최대에서 give 실패 |
| task notification | 수신 task 하나의 32비트 값. `eSetBits`는 OR, `eIncrement`는 +1, `eSetValueWithoutOverwrite`는 이전 값을 읽기 전이면 실패 | action에 따라 합쳐짐 또는 실패 |

task notification은 TCB 안의 `ulNotifiedValue[]`에 직접 쓰므로 별도 객체가 없고, 받는 쪽이 그 task 하나로 정해집니다([`task.h` L119-L122, L2589-L2610](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h#L2589-L2610)). queue와 바꿔 쓰려면 이 전달 의미가 요구와 맞는지가 먼저입니다.

```c
// ISR
xTaskNotifyFromISR(rx_task_handle, RX_EVENT, eSetBits, &woken);

// Task
uint32_t notif;
xTaskNotifyWait(0, UINT32_MAX, &notif, portMAX_DELAY);
if (notif & RX_EVENT) { /* ... */ }
```

## 자주 하는 실수

> ⚠️ ISR에서 blocking API

`xQueueSend()`(FromISR이 아닌)를 호출하면 Cortex-M3 포트에서는 `vPortEnterCritical()`의 `configASSERT`(`port.c` line 438)에 걸려 멈춥니다(1-02의 QEMU 실험). *항상 FromISR*을 써야 합니다.

> ⚠️ Priority 설정 잘못

Cortex-M priority는 0이 *제일 높습니다*(값이 작을수록 높음). 반면 FreeRTOS task 우선순위는 숫자가 클수록 높습니다(1-01). 위 QEMU 실험의 0x80처럼 "숫자를 줄이면 더 안전하겠지"라고 생각해 경계를 넘기 쉽습니다.

> ⚠️ ISR이 너무 김

ISR이 도는 동안 낮거나 같은 urgency의 IRQ는 대기하고 더 높은 IRQ만 선점합니다(DDI 0403E.b B1.5.4). UART 실험처럼 ISR이 연달아 들어오면 task는 아예 돌지 못합니다. 데이터 캡처만 하고 나머지는 task로 넘깁니다.

> ⚠️ ISR 사이 공유 변수 atomic 안 함

ARMv7-M에서 single-copy atomic이 보장되는 것은 byte 접근, halfword 정렬 halfword 접근, word 정렬 word 접근입니다(DDI 0403E.b A3.5.3). 정렬이 맞지 않은 word나 `LDRD`·`LDM`은 여러 접근으로 나뉩니다. 더 중요한 것은 정렬된 32비트 변수라도 `counter++`는 세 명령이라는 점입니다. arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m3 -O2`로 `volatile unsigned counter; void bump(void){ counter++; }`를 컴파일하면 다음과 같습니다.

```text
00000000 <bump>:
   0:	ldr	r2, [pc, #8]	@ (c <bump+0xc>)
   2:	ldr	r3, [r2, #0]
   4:	adds	r3, #1
   6:	str	r3, [r2, #0]
   8:	bx	lr
```

`ldr r3`와 `str r3` 사이에 ISR이 들어와 같은 변수를 올리면 그 증가분은 `str`이 덮어써 사라집니다. 이 구간을 *interrupt disable*(`taskENTER_CRITICAL_FROM_ISR` 등)로 감싸거나 LDREX/STREX 기반 atomic을 씁니다.

## 정리

- ISR은 **task가 아니므로** blocking API를 사용할 수 없습니다.
- **Top-Half (ISR) + Bottom-Half (task)** 패턴에서 ISR이 연달아 들어오면 task가 굶고 queue가 넘칩니다(QEMU UART 실험: 10바이트 중 6바이트 drop).
- FreeRTOS의 **FromISR API**, `xHigherPriorityTaskWoken`, `portYIELD_FROM_ISR()` 3종 세트를 사용합니다.
- Cortex-M priority는 *값이 작을수록 높습니다*. `configMAX_SYSCALL_INTERRUPT_PRIORITY` 경계에 주의해야 합니다.
- Cortex-M4의 하드웨어 진입 지연은 zero wait state에서 최대 12 cycle(TRM 3.9.1)이고, 그 위에 critical section과 상위 ISR 시간이 더해집니다.
- 정렬된 32비트 load/store는 atomic이지만 `counter++`는 세 명령입니다.

다음 편에서는 **동기화 기초**를 다룹니다. Critical Section과 Mutual Exclusion을 살펴봅니다.

## 1차 자료

- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h)와 [semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): FromISR 반환값·제약
- [ARM_CM3 port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c): `vPortValidateInterruptPriority`(L803)
- [event_groups.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/event_groups.c): `xEventGroupSetBitsFromISR`의 daemon 위임(L826)
- ARM DDI 0439B (Cortex-M4 TRM) 3.9.1, ARM DDI 0403E.b A3.5.3·B1.5.4·B1.5.6
- Linux v6.12 `Documentation/networking/napi.rst`

QEMU 실험은 FreeRTOS V11.2.0 `ARM_CM3` + `heap_4`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다. 순서와 개수는 커널·주변 장치 모델에서 나오지만, QEMU UART에는 baud rate 지연이 없다는 점이 실제 보드와 다릅니다.

## 관련 항목

- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-09: ISR-safe API 설계](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
