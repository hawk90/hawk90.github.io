---
title: "2-01: ISR-Safe API 설계 — Reentrant·Atomic·Defer 패턴"
date: 2026-05-20T02:00:00
description: "ISR 안전 함수 작성. Reentrant, atomic 변수, deferred work, FromISR variant."
series: "Modern Embedded Recipes"
seriesOrder: 7
tags: [recipes, isr, reentrant, atomic, defer]
draft: true
---

## 한 줄 요약

> **"ISR-safe = reentrant + non-blocking + short"** — 위 셋 다 만족해야 안전.

## ISR-Safe 함수의 조건

| 조건 | 의미 |
|---|---|
| **Reentrant** | 중간에 끊겨도 재실행 안전 |
| **Non-blocking** | sleep·spin·malloc 없음 |
| **Short** | 수 µs 이내 |
| **No side effect outside protected** | shared state는 atomic 또는 lock-free |

## Reentrant 함수 체크

```c
/* 회피 — non-reentrant */
static int last_value;

int compute(int x) {
    last_value = x * 2;    /* ← global state */
    return last_value;
}

/* Good — reentrant */
int compute(int x) {
    return x * 2;          /* stack only */
}
```

ISR이 task 도중 *같은 함수 재진입* 가능 → static·global 변경 시 corruption.

## strtok·rand 등 함정

```c
char *p = strtok(s, ",");   /* ← non-reentrant (static state) */
int n = rand();             /* ← non-reentrant */
```

대체:
- `strtok_r` (POSIX) — reentrant variant
- `rand_r(&seed)` — seed local
- newlib `*_r` family

## Atomic 변수만 공유

```c
/* OK — Cortex-M 32-bit aligned */
volatile uint32_t isr_counter;

void ISR(void) {
    isr_counter++;   /* atomic on 32-bit */
}

void task(void) {
    uint32_t v = isr_counter;   /* atomic read */
}
```

ARM Cortex-M — 32-bit aligned word access *자동 atomic*. 64-bit은 *split read* — race.

## ISR ↔ Task — Lock-Free Ring

```c
#define SIZE 64
volatile uint8_t buf[SIZE];
volatile uint8_t head, tail;   /* ISR writes head, task reads */

void ISR(void) {
    uint8_t byte = UART->RDR;
    uint8_t next = (head + 1) % SIZE;
    if (next != tail) {
        buf[head] = byte;
        head = next;   /* atomic write */
    }
    /* else — overflow, drop */
}

void task(void) {
    while (tail != head) {
        uint8_t byte = buf[tail];
        tail = (tail + 1) % SIZE;
        process(byte);
    }
}
```

SPSC ring — *lock 없음*. ISR/task가 다른 변수 (head/tail) write.

## FromISR Variant

```c
void ISR(void) {
    BaseType_t pxHP = pdFALSE;
    xQueueSendFromISR(rx_q, &byte, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

FreeRTOS·Zephyr — *ISR variant 분리*. Task API와 *시그니처 다름*.

## Deferred Work — Bottom Half

```c
volatile int rx_pending = 0;
uint8_t rx_buffer[256];

void ISR(void) {
    rx_buffer[rx_pending++] = UART->RDR;
    if (rx_pending == 256) signal_task();
}

void task(void) {
    for (;;) {
        wait_for_signal();
        for (int i = 0; i < rx_pending; i++) process(rx_buffer[i]);
        rx_pending = 0;
    }
}
```

ISR — 짧고 *수집*만. Task — 처리. RT-friendly.

## 자동차 ISR — 최소 처리

```c
/* CAN RX ISR */
void CAN_RX_IRQHandler(void) {
    can_msg_t msg;
    msg.id = CAN->RIR;
    msg.dlc = CAN->RDTR & 0xF;
    for (int i = 0; i < msg.dlc; i++) msg.data[i] = CAN->RDLR >> (i*8);
    
    /* Lock-free push to ring */
    can_ring_push(&msg);
    
    /* Wake handler task */
    BaseType_t pxHP = pdFALSE;
    xSemaphoreGiveFromISR(can_sem, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

CAN 1 Mbps → 14k frame/sec → 70 µs/frame budget. ISR *수 µs 이내*만.

## Critical Section Helper

```c
typedef struct { uint32_t primask; } critical_section_t;

static inline critical_section_t critical_enter(void) {
    critical_section_t cs;
    cs.primask = __get_PRIMASK();
    __disable_irq();
    return cs;
}

static inline void critical_exit(critical_section_t cs) {
    __set_PRIMASK(cs.primask);
}

/* 사용 */
{
    critical_section_t cs = critical_enter();
    shared_var++;
    critical_exit(cs);
}
```

자동 IRQ 복원 — 코드 어느 path에서 빠져도 안전.

## BASEPRI — Selective Disable

```c
/* FreeRTOS — kernel critical */
__set_BASEPRI(configMAX_SYSCALL_INTERRUPT_PRIORITY << (8 - __NVIC_PRIO_BITS));
/* High priority ISR은 통과, kernel·low priority 차단 */
critical();
__set_BASEPRI(0);
```

자동차·항공 high RT ISR — *kernel API 안 쓰지만 동작*.

## printf in ISR — 회피

```c
ISR: printf("byte: %02X\n", byte);   /* ✗ stack 큼·UART blocking */
```

대안:
- ITM `ITM_SendChar` — *cycle 수준*
- Ring buffer + task에서 printf
- *Conditional* — debug build only

## 자주 하는 실수

> ⚠️ ISR에서 malloc/free

```c
ISR: void *p = malloc(64);   /* heap lock — deadlock 가능 */
```

→ static buffer + pool.

> ⚠️ FromISR variant 누락

```c
ISR: xQueueSend(q, ...);   /* ✗ — block 가능 함수 */
```

→ `xQueueSendFromISR`.

> ⚠️ Long ISR

```c
void ISR(void) {
    process_packet();   /* 1 ms — 다른 IRQ 다 latency */
}
```

→ ring buffer + task에서.

> ⚠️ Shared variable 64-bit

```c
volatile uint64_t timestamp;
ISR: timestamp = read_64();   /* ← Cortex-M에서 *2 store* — split */
task: read timestamp           /* ← race */
```

→ critical section 또는 atomic_load_64.

## 정리

- ISR-safe = **reentrant + non-blocking + short**.
- 32-bit aligned 변수만 atomic.
- **FromISR variant** 명시.
- **Deferred work pattern** — ISR 짧게, task에서 처리.
- Critical section은 `__disable_irq` 또는 BASEPRI.
- printf·malloc 회피 — ITM·pool 사용.

다음 편은 **Lock-Free Ring Buffer**.

## 관련 항목

- [1-06: JTAG·SWD](/blog/embedded/modern-recipes/part1-06-jtag)
- [2-02: Lock-Free Ring](/blog/embedded/modern-recipes/part2-02-lock-free-ring)
