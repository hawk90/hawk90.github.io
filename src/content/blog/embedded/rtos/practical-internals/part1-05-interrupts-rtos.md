---
title: "1-05: 인터럽트와 RTOS — ISR Context, Deferred Processing, FromISR API"
date: 2026-05-07T05:00:00
description: "ISR은 task가 아니므로 context도 따로 관리됩니다. Long work는 deferred task로 넘기고, FromISR API 패턴을 씁니다."
series: "Practical RTOS Internals"
seriesOrder: 5
tags: [rtos, isr, deferred, fromisr, bottom-half]
draft: false
---

## 한 줄 요약

> **"ISR은 짧게, 일은 task에 맡깁니다."** Bottom-half 패턴이 RTOS와 OS의 공통 답입니다.

## ISR Context — task와 다른 세계

ISR이 실행 중일 때는 다음 규칙이 적용됩니다.

- **현재 task의 stack을 사용합니다** (또는 별도 ISR stack을 씁니다. Cortex-A나 RISC-V).
- **scheduler가 비활성화됩니다** (preemption이 일어나지 않습니다).
- **다른 ISR만 nested로 가능합니다** (priority가 더 높은 경우).
- **blocking이 불가능합니다** (semaphore wait 등은 절대 금지입니다).

```c
void TIM1_IRQHandler(void) {
    // ✓ 가능: 변수 업데이트, FromISR API
    counter++;
    xSemaphoreGiveFromISR(sem, &woken);

    // ✗ 절대 금지: blocking
    // xSemaphoreTake(sem, portMAX_DELAY);  // CRASH
    // vTaskDelay(10);                       // CRASH
    // printf("...");                        // mutex 내부 → block
}
```

## Bottom-Half / Top-Half 패턴

![Top-Half (ISR) + Bottom-Half (Task) pattern](/images/blog/practical-internals/diagrams/part1-05-top-bottom-half.svg)

Linux 커널의 전통적 용어이고, RTOS에도 동일하게 적용됩니다.

### Top-Half (ISR)

- HW interrupt를 직접 처리합니다.
- *최소 작업만* 합니다 (flag 설정, 데이터 캡처, signal task).
- 수 µs 안에 종료합니다.

### Bottom-Half (Task)

- 실제 데이터 처리, 로깅, 전송을 합니다.
- 일반 task이므로 RTOS의 모든 API를 사용할 수 있습니다.
- ms 단위 작업도 괜찮습니다.

### 패턴 예 — UART 수신

```c
// Top-Half
void USART1_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    uint8_t c = USART1->RDR;
    xQueueSendFromISR(rxQueue, &c, &woken);
    portYIELD_FROM_ISR(woken);
}

// Bottom-Half
void uart_rx_task(void *arg) {
    uint8_t c;
    while (1) {
        xQueueReceive(rxQueue, &c, portMAX_DELAY);
        process_byte(c);   // 복잡한 파싱·검증·로그
    }
}
```

ISR에서는 *1바이트만* 큐에 넣고 끝냅니다. 모든 작업은 task에서 처리합니다.

## FromISR API — RTOS의 ISR-safe 변종

| Task용 | ISR용 |
| --- | --- |
| `xQueueSend` | `xQueueSendFromISR` |
| `xQueueReceive` | `xQueueReceiveFromISR` |
| `xSemaphoreGive` | `xSemaphoreGiveFromISR` |
| `xSemaphoreTake` | (ISR에서 사용 안 함) |
| `xTaskNotify` | `xTaskNotifyFromISR` |
| `xEventGroupSetBits` | `xEventGroupSetBitsFromISR` |

*FromISR*은 차이가 있습니다. *blocking이 없고*, *scheduler를 호출하지 않으며*, *xHigherPriorityTaskWoken*으로 *지연 yield 신호*를 전달합니다.

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
// FreeRTOSConfig.h
#define configMAX_SYSCALL_INTERRUPT_PRIORITY  (5 << (8 - __NVIC_PRIO_BITS))
#define configKERNEL_INTERRUPT_PRIORITY       (15 << (8 - __NVIC_PRIO_BITS))

// 적용
NVIC_SetPriority(USART1_IRQn, 6);
// 6은 configMAX_SYSCALL_INTERRUPT_PRIORITY (5)보다 *낮음* (값이 클수록 낮음)
// → FromISR API 사용 가능
```

**Cortex-M의 priority는 값이 작을수록 높습니다.** 처음 만나면 헷갈리는 부분입니다.

### Priority 분리

- **High priority** (값 0-4): RTOS와 무관한 *순수 HW critical* 영역입니다 (모터 제어 ISR 등). FromISR API를 **사용할 수 없습니다**.
- **Medium priority** (값 5+): FromISR API를 사용할 수 있습니다. 일반 ISR입니다.
- `configKERNEL_INTERRUPT_PRIORITY` (값 15): tick과 PendSV가 여기에 속합니다.

## ISR Latency

ISR이 trigger 되고 *실제 ISR 코드 첫 줄이 실행될 때*까지의 시간을 말합니다.

| 구간 | 시간 |
| --- | --- |
| HW interrupt 발생 → CPU 인지 | < 1 cycle |
| Pipeline flush | 2-12 cycle |
| Stack에 context 자동 push | 12 cycle (Cortex-M) |
| Vector table read + branch | 4-6 cycle |
| **Total** | **~12-25 cycle** (~75-150 ns @ 168 MHz) |

**Tail-chaining**은 ISR끼리 연속 발생 시 *context push/pop을 생략*해 6-12 cycle을 절약합니다.

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

IRQ에서 polling으로 전환해 *부하 한계 안*에서만 IRQ를 사용합니다.

## ISR과 Task 통신 메커니즘 비교

| 방법 | 처리량 | latency | 사용처 |
| --- | --- | --- | --- |
| **Volatile flag** | 수십 µs | 매우 빠름 | 단순 신호 (event 발생) |
| **Atomic counter** | µs | 빠름 | 이벤트 카운트 |
| **Ring buffer** | µs | 빠름 | 바이트 스트림 (UART RX) |
| **Queue (RTOS)** | µs-ms | 보통 | 구조체 메시지 |
| **Semaphore Give** | µs-ms | 보통 | "이벤트 발생" 신호 |
| **Task Notification** | µs | 가장 빠름 (FreeRTOS) | task 직접 signal |

Task Notification이 *가장 효율적*입니다. queue나 semaphore의 overhead 없이 task의 *notification value*를 직접 update합니다.

```c
// ISR
xTaskNotifyFromISR(rx_task_handle, RX_EVENT, eSetBits, &woken);

// Task
uint32_t notif;
xTaskNotifyWait(0, ULONG_MAX, &notif, portMAX_DELAY);
if (notif & RX_EVENT) { /* ... */ }
```

## 자주 하는 실수

> ⚠️ ISR에서 blocking API

`xQueueSend()`(FromISR이 아닌)를 호출하면 crash나 deadlock이 발생합니다. *항상 FromISR*을 써야 합니다.

> ⚠️ Priority 설정 잘못

Cortex-M priority는 0이 *제일 높습니다*(값이 작을수록 높음). 다른 시스템(PowerPC, MIPS)은 반대입니다. 데이터시트를 확인해야 합니다.

> ⚠️ ISR이 너무 김

50 µs 이상 걸리면 *다른 ISR이 막힙니다*. 데이터 캡처만 하고 나머지는 task로 넘깁니다.

> ⚠️ ISR 사이 공유 변수 atomic 안 함

32-bit MCU에서 32-bit read와 write는 atomic이지만, 64-bit나 struct는 그렇지 않습니다. *interrupt disable*이나 *atomic API*를 사용해야 합니다.

## 정리

- ISR은 **task가 아니므로** blocking API를 사용할 수 없습니다.
- **Top-Half (ISR) + Bottom-Half (task)** 패턴이 표준입니다.
- FreeRTOS의 **FromISR API**, `xHigherPriorityTaskWoken`, `portYIELD_FROM_ISR()` 3종 세트를 사용합니다.
- Cortex-M priority는 *값이 작을수록 높습니다*. `configMAX_SYSCALL_INTERRUPT_PRIORITY` 경계에 주의해야 합니다.
- **Task Notification**이 가장 빠른 ISR과 task 간 통신 방법입니다.

다음 편에서는 **동기화 기초**를 다룹니다. Critical Section과 Mutual Exclusion을 살펴봅니다.

## 관련 항목

- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-09: ISR-safe API 설계](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
