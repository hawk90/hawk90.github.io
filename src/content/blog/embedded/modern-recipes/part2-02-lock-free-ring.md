---
title: "2-02: Lock-Free Ring Buffer — SPSC·Power-of-2·Memory Order"
date: 2026-05-20T03:00:00
description: "SPSC ring 구현. Power-of-2 size, head/tail atomic, memory order release/acquire."
series: "Modern Embedded Recipes"
seriesOrder: 8
tags: [recipes, lock-free, ring-buffer, spsc, atomic]
draft: true
---

## 한 줄 요약

> **"SPSC ring = head/tail + atomic + release/acquire"** — ISR↔task 가장 빠른 IPC.

## 기본 SPSC Ring

```c
#define RING_SIZE 64   /* power of 2 */
#define RING_MASK (RING_SIZE - 1)

typedef struct {
    uint8_t buf[RING_SIZE];
    volatile uint16_t head;   /* producer writes */
    volatile uint16_t tail;   /* consumer writes */
} ring_t;

bool ring_push(ring_t *r, uint8_t b) {
    uint16_t h = r->head;
    uint16_t next = (h + 1) & RING_MASK;
    if (next == r->tail) return false;   /* full */
    r->buf[h] = b;
    r->head = next;   /* commit */
    return true;
}

bool ring_pop(ring_t *r, uint8_t *out) {
    uint16_t t = r->tail;
    if (t == r->head) return false;   /* empty */
    *out = r->buf[t];
    r->tail = (t + 1) & RING_MASK;
    return true;
}
```

Producer만 head 변경, consumer만 tail 변경 → *별도 변수, race 없음*.

## Power-of-2 — 왜 중요한가

```c
uint16_t next = (h + 1) & RING_MASK;   /* AND — 1 cycle */
/* vs */
uint16_t next = (h + 1) % RING_SIZE;   /* MOD — 10+ cycle (div) */
```

Cortex-M3 — *div 명령 12 cycle*. AND mask 1 cycle.

→ `RING_SIZE`는 *반드시 power of 2* (16, 32, 64, 128, ...).

## Memory Order — Release/Acquire

```c
#include <stdatomic.h>

bool ring_push_atomic(ring_t *r, uint8_t b) {
    uint16_t h = atomic_load_explicit(&r->head, memory_order_relaxed);
    uint16_t next = (h + 1) & RING_MASK;
    uint16_t t = atomic_load_explicit(&r->tail, memory_order_acquire);
    if (next == t) return false;
    
    r->buf[h] = b;   /* data write */
    atomic_store_explicit(&r->head, next, memory_order_release);
                                          /* ↑ data write가 head 갱신 *전*에 가시화 */
    return true;
}
```

Release/acquire pair — producer의 `buf[h]` write가 consumer의 `head` read *후* 가시.

## ARM Cortex-M Single Core

```c
/* Cortex-M3/M4 single core — pipeline in-order */
/* DMB 없이도 program order 유지 */

volatile uint16_t head, tail;   /* volatile은 컴파일러 차단만 */
```

Single core — *재정렬 없음* (in-order pipeline + no store buffer reorder for same address). `volatile`로 충분.

## ARM SMP — DMB·LDAR/STLR 필요

```c
/* Cortex-A SMP 또는 RP2040 dual-M0+ */
atomic_store_explicit(&head, next, memory_order_release);
```

SMP에선 *반드시 atomic + memory order*. Race 발생 가능.

## Cache Alignment — False Sharing 방지

```c
typedef struct {
    alignas(64) volatile uint16_t head;
    char pad1[64 - sizeof(uint16_t)];
    
    alignas(64) volatile uint16_t tail;
    char pad2[64 - sizeof(uint16_t)];
    
    alignas(64) uint8_t buf[RING_SIZE];
} ring_t;
```

Cortex-A SMP — head·tail이 *같은 line*이면 false sharing → 10x slowdown.

## Multi-Byte Push

```c
size_t ring_push_n(ring_t *r, const uint8_t *data, size_t n) {
    uint16_t h = r->head, t = r->tail;
    size_t free = (t - h - 1) & RING_MASK;
    if (n > free) n = free;
    
    /* Split copy across wrap */
    size_t first = RING_SIZE - h;
    if (first > n) first = n;
    memcpy(&r->buf[h], data, first);
    memcpy(&r->buf[0], data + first, n - first);
    
    r->head = (h + n) & RING_MASK;
    return n;
}
```

Wrap 한 번에 처리 — *byte loop보다 빠름*. UART·CAN 큰 frame에 유리.

## ISR↔Task 사용

```c
ring_t uart_rx_ring;

void UART_IRQHandler(void) {
    uint8_t byte = UART->RDR;
    ring_push(&uart_rx_ring, byte);   /* lock-free */
}

void uart_task(void *p) {
    uint8_t byte;
    for (;;) {
        if (ring_pop(&uart_rx_ring, &byte)) {
            process(byte);
        } else {
            vTaskDelay(1);   /* yield */
        }
    }
}
```

ISR이 *queue API 안 씀* — 매우 빠름. *FromISR 호출 overhead 0*.

## Notification 합쳐서

```c
ring_t uart_rx_ring;
volatile bool data_ready;

void UART_IRQHandler(void) {
    BaseType_t pxHP = pdFALSE;
    uint8_t byte = UART->RDR;
    if (ring_push(&uart_rx_ring, byte)) {
        if (!data_ready) {
            data_ready = true;
            xSemaphoreGiveFromISR(uart_sem, &pxHP);
        }
    }
    portYIELD_FROM_ISR(pxHP);
}

void uart_task(void *p) {
    for (;;) {
        xSemaphoreTake(uart_sem, portMAX_DELAY);
        data_ready = false;
        uint8_t byte;
        while (ring_pop(&uart_rx_ring, &byte)) {
            process(byte);
        }
    }
}
```

매 byte semaphore give 대신 *flag로 합침* — ISR overhead ↓.

## Vyukov MPMC Queue

Multi-producer multi-consumer은 *훨씬 복잡*:

```c
struct cell {
    atomic_size_t sequence;
    T data;
};

bool mpmc_push(mpmc_t *q, T item) {
    size_t pos = atomic_load(&q->enq_pos);
    while (1) {
        struct cell *c = &q->buf[pos & MASK];
        size_t seq = atomic_load(&c->sequence);
        if (seq == pos) {
            if (atomic_compare_exchange_weak(&q->enq_pos, &pos, pos + 1)) {
                c->data = item;
                atomic_store(&c->sequence, pos + 1);
                return true;
            }
        } else if (seq < pos) {
            return false;   /* full */
        } else {
            pos = atomic_load(&q->enq_pos);
        }
    }
}
```

Dmitry Vyukov MPMC. Folly·LMAX·DPDK가 채택. *진짜 lock-free*.

## ABA — SPSC엔 없음

```text
SPSC — producer/consumer 각 1개
  → head는 producer만, tail은 consumer만 변경
  → 같은 변수 두 thread가 write 안 함 → ABA 없음
```

Lock-free stack·queue의 ABA 문제 — *SPSC엔 무관*.

## Static Allocation

```c
static ring_t g_uart_ring;   /* static — heap 안 씀 */

ring_t *get_ring(void) { return &g_uart_ring; }
```

ISR·task가 같은 *static instance* 사용.

## DPDK rte_ring — 표준 라이브러리

```c
struct rte_ring *r = rte_ring_create("name", 1024,
                                       SOCKET_ID_ANY,
                                       RING_F_SP_ENQ | RING_F_SC_DEQ);

rte_ring_sp_enqueue(r, obj);
rte_ring_sc_dequeue(r, &obj);
```

DPDK ring — *bulk operation* 최적화. 10G 이더넷에서 사용.

## STM32H7 — DMA UART + Ring

```c
/* DMA가 ring buffer에 직접 write */
HAL_UART_Receive_DMA(&huart, ring.buf, RING_SIZE);

/* Task — DMA NDTR로 head 계산 */
void uart_task(void *p) {
    for (;;) {
        uint16_t dma_ndtr = DMA->NDTR;   /* 남은 count */
        uint16_t head = RING_SIZE - dma_ndtr;
        
        while (ring.tail != head) {
            process(ring.buf[ring.tail]);
            ring.tail = (ring.tail + 1) & RING_MASK;
        }
        vTaskDelay(1);
    }
}
```

ISR 자체 없음 — DMA + polling. Very high baud (1 Mbps+) UART에서 표준.

## Stream Buffer — FreeRTOS Built-in

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);

/* ISR */
xStreamBufferSendFromISR(sb, &byte, 1, &pxHP);

/* Task */
xStreamBufferReceive(sb, buf, n, portMAX_DELAY);
```

FreeRTOS — *내부 ring buffer* + locking. 우리 직접 구현보다 *약간 느림*, 그러나 *API 깔끔*.

## 자주 하는 실수

> ⚠️ Power-of-2 아닌 size

```c
#define RING_SIZE 100   /* ← MOD operation 매번 */
```

→ 64 또는 128.

> ⚠️ Volatile만 + SMP

```c
volatile uint16_t head;   /* SMP에선 부족 */
```

→ `atomic_*` + memory order.

> ⚠️ False sharing 무시

```c
struct { volatile uint16_t head, tail; uint8_t buf[]; } ring;
/* head·tail 같은 line — SMP에서 ping-pong */
```

→ alignas(64).

> ⚠️ Multi-producer 가정

```c
/* 2 ISR이 같은 ring push */
ring_push(r, b);   /* race — SPSC 보장 깨짐 */
```

→ MPMC ring 또는 *lock + ring*.

## 정리

- SPSC ring = **head/tail + atomic + release/acquire**.
- **Power-of-2** size + AND mask로 *div 회피*.
- Cortex-M single core — volatile로 충분.
- SMP — *반드시 atomic·alignas(64)*.
- ABA는 SPSC엔 무관.
- DMA UART → ring → task는 *zero ISR* 패턴.

다음 편은 **Priority Inversion**.

## 관련 항목

- [2-01: ISR-Safe API](/blog/embedded/modern-recipes/part2-01-isr-safe)
- [2-03: Priority Inversion](/blog/embedded/modern-recipes/part2-03-priority-inversion)
