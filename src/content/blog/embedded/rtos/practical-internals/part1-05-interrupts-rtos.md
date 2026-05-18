---
title: "1-05: 인터럽트와 RTOS — ISR Context, Deferred Processing, FromISR API"
date: 2026-05-12T05:00:00
description: "ISR은 task가 아님 — context도 따로. Long work는 deferred task로. FromISR API 패턴."
series: "Practical RTOS Internals"
seriesOrder: 5
tags: [rtos, isr, deferred, fromisr, bottom-half]
draft: true
---

## 한 줄 요약

> **"ISR은 짧게, 일은 task에"** — Bottom-half 패턴이 RTOS·OS 공통 답.

## ISR Context — task와 다른 세계

ISR이 실행 중일 때:

- **현재 task의 stack 사용** (또는 별도 ISR stack — Cortex-A·RISC-V)
- **scheduler 비활성** (preemption 안 됨)
- **다른 ISR만 nested 가능** (priority가 더 높은)
- **blocking 불가** (semaphore wait 등 절대 금지)

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

Linux 커널의 전통적 용어. RTOS에도 동일.

### Top-Half (ISR)

- HW interrupt 직접 처리
- *최소 작업만* — flag 설정, 데이터 캡처, signal task
- 수 µs 안에 종료

### Bottom-Half (Task)

- 실제 데이터 처리·로깅·전송
- 일반 task — RTOS의 모든 API 사용 가능
- ms 단위도 OK

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

ISR에서는 *1바이트만* 큐에 넣고 끝. 모든 작업은 task에서.

## FromISR API — RTOS의 ISR-safe 변종

| Task용 | ISR용 |
| --- | --- |
| `xQueueSend` | `xQueueSendFromISR` |
| `xQueueReceive` | `xQueueReceiveFromISR` |
| `xSemaphoreGive` | `xSemaphoreGiveFromISR` |
| `xSemaphoreTake` | (ISR에서 사용 안 함) |
| `xTaskNotify` | `xTaskNotifyFromISR` |
| `xEventGroupSetBits` | `xEventGroupSetBitsFromISR` |

차이 — *FromISR*은 *blocking 없음*, *scheduler 호출 안 함*, *xHigherPriorityTaskWoken*으로 *지연 yield 신호*.

```c
BaseType_t xHigherPriorityTaskWoken = pdFALSE;

xQueueSendFromISR(q, &data, &xHigherPriorityTaskWoken);
// 위 호출이 higher-priority task를 ready로 만들면 pdTRUE

portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
// pdTRUE면 ISR 끝나면서 task 전환
```

## ISR Priority 설정 — Cortex-M

NVIC에서 IRQ priority 설정. 중요 — *FreeRTOS 호환 영역* 안에서만 FromISR API 사용 가능.

```c
// FreeRTOSConfig.h
#define configMAX_SYSCALL_INTERRUPT_PRIORITY  (5 << (8 - __NVIC_PRIO_BITS))
#define configKERNEL_INTERRUPT_PRIORITY       (15 << (8 - __NVIC_PRIO_BITS))

// 적용
NVIC_SetPriority(USART1_IRQn, 6);
// 6은 configMAX_SYSCALL_INTERRUPT_PRIORITY (5)보다 *낮음* (값이 클수록 낮음)
// → FromISR API 사용 가능
```

**Cortex-M의 priority — 값이 작을수록 높음**. 처음 만나면 헷갈림.

### Priority 분리

- **High priority** (값 0-4): RTOS 무관, *순수 HW critical* (모터 제어 ISR 등). FromISR API **사용 불가**.
- **Medium priority** (값 5+): FromISR API 사용 가능. 일반 ISR.
- `configKERNEL_INTERRUPT_PRIORITY` (값 15): tick·PendSV.

## ISR Latency

ISR이 trigger 되고 *실제 ISR 코드 첫 줄 실행*까지의 시간.

| 구간 | 시간 |
| --- | --- |
| HW interrupt 발생 → CPU 인지 | < 1 cycle |
| Pipeline flush | 2-12 cycle |
| Stack에 context 자동 push | 12 cycle (Cortex-M) |
| Vector table read + branch | 4-6 cycle |
| **Total** | **~12-25 cycle** (~75-150 ns @ 168 MHz) |

**Tail-chaining** — ISR끼리 연속 발생 시 *context push/pop 생략* → 6-12 cycle 절약.

## ISR Storm 방지

interrupt가 *너무 자주* 발생하면 main loop가 굶음.

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

IRQ → polling 전환으로 *부하 한계 안*에서만 IRQ 사용.

## ISR과 Task 통신 메커니즘 비교

| 방법 | 처리량 | latency | 사용처 |
| --- | --- | --- | --- |
| **Volatile flag** | 수십 µs | 매우 빠름 | 단순 신호 (event 발생) |
| **Atomic counter** | µs | 빠름 | 이벤트 카운트 |
| **Ring buffer** | µs | 빠름 | 바이트 스트림 (UART RX) |
| **Queue (RTOS)** | µs-ms | 보통 | 구조체 메시지 |
| **Semaphore Give** | µs-ms | 보통 | "이벤트 발생" 신호 |
| **Task Notification** | µs | 가장 빠름 (FreeRTOS) | task 직접 signal |

Task Notification이 *가장 효율* — queue·semaphore의 overhead 없이 task의 *notification value* 직접 update.

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

`xQueueSend()` (FromISR 아님) → crash 또는 deadlock. *항상 FromISR*.

> ⚠️ Priority 설정 잘못

Cortex-M priority 0이 *제일 높음* (값이 작을수록). 다른 시스템 (PowerPC, MIPS)은 반대. 데이터시트 확인.

> ⚠️ ISR이 너무 김

50 µs 이상 걸리면 *다른 ISR 막힘*. 데이터 캡처만 → task로.

> ⚠️ ISR 사이 공유 변수 atomic 안 함

32-bit MCU에서 32-bit read·write는 atomic이지만 64-bit·struct는 아님. *interrupt disable* 또는 *atomic API* 사용.

## 정리

- ISR은 **task가 아님** — blocking API 사용 금지.
- **Top-Half (ISR) + Bottom-Half (task)** 패턴 표준.
- FreeRTOS의 **FromISR API** + `xHigherPriorityTaskWoken` + `portYIELD_FROM_ISR()` 3종 세트.
- Cortex-M priority는 *값이 작을수록 높음*. `configMAX_SYSCALL_INTERRUPT_PRIORITY` 경계 주의.
- **Task Notification**이 가장 빠른 ISR↔task 통신.

다음 편은 **동기화 기초** — Critical Section, Mutual Exclusion.

## 관련 항목

- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-09: ISR-safe API 설계](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
