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

- stack과 예외 저장 규약은 포트별로 다릅니다. Cortex-M에서 PSP를 사용하는 task가 예외에 진입하면 최초 frame은 PSP에 쌓일 수 있지만 handler 실행은 MSP를 사용합니다.
- 같은 코어의 task 실행은 ISR이 점유합니다. scheduler 자료구조와 다른 코어까지 모두 비활성화되는 것은 아닙니다.
- **다른 ISR만 nested로 가능합니다** (priority가 더 높은 경우).
- **blocking이 불가능합니다** (semaphore wait 등은 절대 금지입니다).

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

Linux 커널의 전통적 용어이고, RTOS에도 동일하게 적용됩니다.

### Top-Half (ISR)

- HW interrupt를 직접 처리합니다.
- *최소 작업만* 합니다 (flag 설정, 데이터 캡처, signal task).
- 다른 IRQ·task의 deadline에서 허용한 시간 안에 종료하도록 최대 실행량을 제한합니다.

### Bottom-Half (Task)

- 실제 데이터 처리, 로깅, 전송을 합니다.
- 일반 task이므로 자신의 문맥·소유권·lock·대기 조건을 만족하는 task용 API를 사용할 수 있습니다.
- ms 단위 작업도 괜찮습니다.

### 패턴 예 — UART 수신

아래는 하드웨어 레지스터 이름에 종속되지 않는 UART 수신 API 조각입니다. `read_uart_byte_from_isr`가 status 확인·필요한 acknowledge/오류 처리를 담당하며, 바이트를 얻었을 때만 true를 반환한다고 가정합니다. RX queue는 IRQ 활성화 전에 1바이트 item으로 생성하고 성공 여부를 확인해야 합니다.

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

본문의 큐 전달 API는 공식 ARM 헤더로 컴파일 검사합니다. UART IRQ 발생·주변 장치 ack·실제 포화·수신 파형을 실행한 예제가 아닙니다. F4의 `DR`과 다른 STM32 계열의 `RDR` 같은 레지스터 차이를 범용 주소로 혼합하지 않습니다.

## FromISR API — RTOS의 ISR-safe 변종

| Task용 | ISR용 |
| --- | --- |
| `xQueueSend` | `xQueueSendFromISR` |
| `xQueueReceive` | `xQueueReceiveFromISR` |
| `xSemaphoreGive` | `xSemaphoreGiveFromISR` |
| `xSemaphoreTake` | `xSemaphoreTakeFromISR` (binary/counting만, 대기 없음) |
| `xTaskNotify` | `xTaskNotifyFromISR` |
| `xEventGroupSetBits` | `xEventGroupSetBitsFromISR` |

*FromISR*은 차이가 있습니다. *blocking이 없고*, 대기하지 않고 필요 시 task를 Ready로 만들며, `xHigherPriorityTaskWoken`으로 yield 필요성을 전달할 수 있습니다. `xEventGroupSetBitsFromISR`는 timer daemon에 처리를 위임하는 별도 경로이므로 queue·daemon 실행 조건과 지연도 확인합니다.

```c
BaseType_t xHigherPriorityTaskWoken = pdFALSE;

xQueueSendFromISR(q, &data, &xHigherPriorityTaskWoken);
// 위 호출이 higher-priority task를 ready로 만들면 pdTRUE

portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
// pdTRUE면 ISR 끝나면서 task 전환
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

위 숫자는 priority 비트 4개를 구현한 Cortex-M4F 포트의 예시입니다. `NVIC_SetPriority`에는 논리값을, BASEPRI 설정에는 shift된 값을 사용합니다. priority grouping도 검토합니다. **Cortex-M의 priority는 값이 작을수록 urgency가 높습니다.** 처음 만나면 헷갈리는 부분입니다.

### Priority 분리

- **High priority** (값 0-4): RTOS와 무관한 *순수 HW critical* 영역입니다 (모터 제어 ISR 등). FromISR API를 **사용할 수 없습니다**.
- **Medium priority** (값 5+): FromISR API를 사용할 수 있습니다. 일반 ISR입니다.
- `configKERNEL_INTERRUPT_PRIORITY` (값 15): tick과 PendSV가 여기에 속합니다.

## ISR Latency

ISR이 trigger 되고 *실제 ISR 코드 첫 줄이 실행될 때*까지의 시간을 말합니다.

고정된 단계별 cycle 수를 더해 모든 Cortex-M의 latency라고 제시하지 않습니다. IRQ 허용 상태·더 높은 우선순위 예외·메모리 wait state·FPU stacking·vector fetch와 bus 경합에 따라 달라집니다. tail-chaining도 조건에 따른 예외 전환 최적화입니다.

실측 시에는 외부 event/GPIO/trace 중 시작·끝 경계를 정하고 CPU·메모리·우선순위·부하·표본 수를 함께 기록합니다. 이 장에서는 cycle 또는 ns 값을 실측하지 않았습니다.

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

위 코드는 개념도이며 실제 Linux NAPI 구현이 아닙니다. polling에 budget을 두고 작업이 남으면 yield/재스케줄해야 task 굶주림을 피할 수 있습니다. IRQ 재활성화·pending 재검사·wait 전환은 driver와 신호 primitive의 기억성으로 lost-wakeup을 막아야 합니다. [Linux NAPI 문서](https://docs.kernel.org/networking/napi.html)의 완료·IRQ unmask 계약을 확인합니다.

## ISR과 Task 통신 메커니즘 비교

| 방법 | 확인할 계약 |
| --- | --- |
| volatile flag | 관찰 가능한 접근 지정이며 atomicity·동기화·event 누적을 보증하지 않음 |
| atomic counter | target의 lock-free 여부와 RMW 경합·overflow·ISR 허용 여부 |
| ring buffer | producer/consumer 수·게시 순서·full/empty·overflow 정책 |
| queue | item copy 크기·포화·실패·대기자와 IRQ priority 조건 |
| binary/counting semaphore | 신호 합쳐짐 또는 최대 count·give 실패 처리 |
| task notification | 단일 수신 task·bit/count/action·누적/덮어쓰기 계약 |

Task notification은 일부 용도에서 queue 객체 없이 직접 알릴 수 있지만, 다른 primitive와 전달 의미가 같지 않습니다. 보편적인 시간·처리량 순위를 제시하지 않고 같은 요구로 측정합니다.

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

`xQueueSend()`(FromISR이 아닌)를 호출하면 crash나 deadlock이 발생합니다. *항상 FromISR*을 써야 합니다.

> ⚠️ Priority 설정 잘못

Cortex-M priority는 0이 *제일 높습니다*(값이 작을수록 높음). 다른 아키텍처·interrupt controller도 같다고 가정하지 않고 포트 문서와 데이터시트를 확인합니다.

> ⚠️ ISR이 너무 김

허용 시간은 다른 IRQ의 마감과 urgency·mask 상태에 따라 달라집니다. 낮거나 같은 urgency의 IRQ는 대기하고 높은 IRQ는 선점할 수 있습니다. 데이터 캡처만 하고 나머지는 task로 넘깁니다.

> ⚠️ ISR 사이 공유 변수 atomic 안 함

32비트 MCU라는 이름만으로 모든 32비트 접근이 atomic이라고 가정하지 않습니다. 정렬·메모리 속성·컴파일러·접근 폭을 확인하고, 단일 load/store가 원자적이어도 `counter++` 같은 RMW는 별도입니다. *interrupt disable*이나 *atomic API*를 사용해야 합니다.

## 정리

- ISR은 **task가 아니므로** blocking API를 사용할 수 없습니다.
- **Top-Half (ISR) + Bottom-Half (task)** 패턴이 표준입니다.
- FreeRTOS의 **FromISR API**, `xHigherPriorityTaskWoken`, `portYIELD_FROM_ISR()` 3종 세트를 사용합니다.
- Cortex-M priority는 *값이 작을수록 높습니다*. `configMAX_SYSCALL_INTERRUPT_PRIORITY` 경계에 주의해야 합니다.
- Task notification은 수신 대상과 전달 의미가 맞을 때 선택하고, queue·세마포어와 같은 조건으로 비용을 측정합니다.

다음 편에서는 **동기화 기초**를 다룹니다. Critical Section과 Mutual Exclusion을 살펴봅니다.

## 1차 자료

- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h)와 [semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): FromISR 반환값·제약
- [ARM_CM4F portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): BASEPRI·PendSV

## 관련 항목

- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-09: ISR-safe API 설계](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
