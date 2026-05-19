---
title: "2-01: ISR-Safe API 설계 — Reentrant·Atomic·Defer 패턴"
date: 2026-05-07T02:00:00
description: "ISR 안전 함수 작성. Reentrant, atomic 변수, deferred work, FromISR variant."
series: "Modern Embedded Recipes"
seriesOrder: 7
tags: [recipes, isr, reentrant, atomic, defer]
draft: false
---

## 한 줄 요약

> **"ISR-safe = reentrant + non-blocking + short"** 위 셋을 모두 만족해야 안전합니다.

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

ISR은 task 실행 도중에 *같은 함수에 재진입*할 수 있습니다. 이때 static·global을 변경하면 corruption이 발생합니다.

## strtok·rand 등 함정

```c
char *p = strtok(s, ",");   /* ← non-reentrant (static state) */
int n = rand();             /* ← non-reentrant */
```

대체 수단은 다음과 같습니다.

- `strtok_r` (POSIX)은 reentrant variant입니다.
- `rand_r(&seed)`는 seed를 local로 둡니다.
- newlib `*_r` family도 같은 목적으로 제공됩니다.

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

ARM Cortex-M에서는 32-bit aligned word access가 *자동으로 atomic*합니다. 다만 64-bit은 *split read*가 발생해 race로 이어집니다.

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

SPSC ring은 *lock이 없습니다*. ISR과 task가 서로 다른 변수(head/tail)에만 write하기 때문입니다.

## FromISR Variant

```c
void ISR(void) {
    BaseType_t pxHP = pdFALSE;
    xQueueSendFromISR(rx_q, &byte, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

FreeRTOS와 Zephyr은 *ISR variant를 분리*해 제공합니다. Task API와는 시그니처가 다릅니다.

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

ISR은 짧게 *수집*만 하고, task가 처리를 맡습니다. 이 방식이 RT-friendly합니다.

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

CAN 1 Mbps에서는 14k frame/sec, 즉 frame당 70 µs의 budget이 주어집니다. 그래서 ISR은 *수 µs 이내*로만 동작해야 합니다.

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

IRQ가 자동으로 복원되므로 코드의 어느 path에서 빠져나가도 안전합니다.

## BASEPRI — Selective Disable

```c
/* FreeRTOS — kernel critical */
__set_BASEPRI(configMAX_SYSCALL_INTERRUPT_PRIORITY << (8 - __NVIC_PRIO_BITS));
/* High priority ISR은 통과, kernel·low priority 차단 */
critical();
__set_BASEPRI(0);
```

자동차·항공의 high RT ISR은 *kernel API를 쓰지 않으면서도 동작*합니다.

## printf in ISR — 회피

```c
ISR: printf("byte: %02X\n", byte);   /* ✗ stack 큼·UART blocking */
```

대안은 다음과 같습니다.

- ITM `ITM_SendChar`는 *cycle 수준*의 비용으로 끝납니다.
- Ring buffer에 기록하고 task에서 printf를 호출합니다.
- *Conditional*로 묶어 debug build에서만 활성화합니다.

## 자주 하는 실수

> ⚠️ ISR에서 malloc/free

```c
ISR: void *p = malloc(64);   /* heap lock — deadlock 가능 */
```

대신 static buffer와 pool을 사용합니다.

> ⚠️ FromISR variant 누락

```c
ISR: xQueueSend(q, ...);   /* ✗ — block 가능 함수 */
```

대신 `xQueueSendFromISR`을 사용해야 합니다.

> ⚠️ Long ISR

```c
void ISR(void) {
    process_packet();   /* 1 ms — 다른 IRQ 다 latency */
}
```

대신 ring buffer에 모아 두고 task에서 처리합니다.

> ⚠️ Shared variable 64-bit

```c
volatile uint64_t timestamp;
ISR: timestamp = read_64();   /* ← Cortex-M에서 *2 store* — split */
task: read timestamp           /* ← race */
```

이때는 critical section을 두거나 `atomic_load_64`를 써야 합니다.

## 정리

- ISR-safe는 **reentrant + non-blocking + short**를 모두 만족해야 합니다.
- 32-bit aligned 변수만 atomic으로 다룰 수 있습니다.
- **FromISR variant**를 명시적으로 호출합니다.
- **Deferred work pattern**으로 ISR은 짧게 유지하고 task가 처리합니다.
- Critical section은 `__disable_irq` 또는 BASEPRI로 구성합니다.
- printf와 malloc은 피하고 ITM과 pool을 사용합니다.

다음 편은 **Lock-Free Ring Buffer**입니다.

## 관련 항목

- [1-06: JTAG·SWD](/blog/embedded/modern-recipes/part1-06-jtag)
- [2-02: Lock-Free Ring](/blog/embedded/modern-recipes/part2-02-lock-free-ring)
