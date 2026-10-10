---
title: "Lock-Free Ring Buffer 구현 — SPSC·Power-of-2·Memory Order"
slug: "embedded/modern-recipes/part9-01-lock-free-ring"
date: 2026-04-18T09:00:00
description: "SPSC ring 구현. Power-of-2 size, head/tail atomic, memory order release/acquire."
series: "Modern Embedded Recipes"
seriesOrder: 101
tags: [recipes, lock-free, ring-buffer, spsc, atomic]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SPSC ring = head/tail + atomic + release/acquire"** ISR과 task 사이에서 가장 빠른 IPC입니다.

## 기본 SPSC Ring

Ring 안에서 head와 tail이 어떻게 움직이는지 그림으로 먼저 잡고 코드를 봅니다.

![SPSC ring buffer — head는 producer, tail은 consumer](/images/blog/modern-recipes/diagrams/part2-02-lock-free-ring.svg)

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

Producer만 head를 변경하고 consumer만 tail을 변경합니다. 서로 *다른 변수에만 write*하므로 race가 발생하지 않습니다.

## Power-of-2 — 왜 중요한가

```c
uint16_t next = (h + 1) & RING_MASK;   /* power-of-2에서 modulo 대신 mask */
/* vs */
uint16_t next = (h + 1) % RING_SIZE;   /* non-power-of-2도 가능; 비용은 target 측정 */
```

Cortex-M에서 modulo와 mask의 비용은 compiler·target·상수 전파에 따라 달라집니다. power-of-2 크기에서는 mask가 단순한 경로를 제공할 수 있습니다.

`RING_SIZE`는 mask를 사용하려면 power of 2여야 합니다. modulo를 사용하면 다른 크기도 가능하지만 wrap·full/empty 계산을 함께 검증해야 합니다.

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

Release/acquire pair를 쓰면 producer의 `buf[h]` write가 consumer의 `head` read *이후*에 가시화됩니다.

## ARM Cortex-M Single Core

```c
/* Cortex-M3/M4 single core — pipeline in-order */
/* DMB 없이도 program order 유지 */

volatile uint16_t head, tail;   /* volatile은 컴파일러 차단만 */
```

단일 코어에서 ISR과 task가 공유하는 단순 SPSC는 target ABI와 인터럽트 모델에 따라 volatile/배리어로 구현할 수 있지만, C의 volatile만으로 일반적인 thread 간 atomicity와 memory ordering을 보장하지는 않습니다. portable한 C thread·SMP 경로는 atomic을 사용합니다.

## ARM SMP — DMB·LDAR/STLR 필요

```c
/* Cortex-A SMP 또는 RP2040 dual-M0+ */
atomic_store_explicit(&head, next, memory_order_release);
```

SMP에서는 *반드시 atomic과 memory order*를 함께 써야 합니다. 그렇지 않으면 race가 발생할 수 있습니다.

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

Cortex-A SMP에서는 head와 tail이 같은 cache line에 있으면 false sharing이 생길 수 있습니다. 영향은 cache topology와 workload로 측정합니다.

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

Wrap을 한 번에 처리하므로 *byte loop보다 빠릅니다*. UART와 CAN의 큰 frame에서 특히 유리합니다.

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

ISR이 queue API 대신 고정 크기 ring을 직접 갱신해 경로를 단순화할 수 있습니다. FromISR API보다 항상 빠르거나 overhead가 0이라고 가정하지 말고 측정합니다.

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

매 byte마다 semaphore give를 호출하는 대신 *flag로 합칩니다*. 그러면 ISR overhead가 줄어듭니다.

## Vyukov MPMC Queue

Multi-producer multi-consumer는 *훨씬 복잡*합니다.

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

Dmitry Vyukov가 제안한 계열의 MPMC 알고리즘입니다. 구현의 memory order·progress 보장과 실제 라이브러리 채택 여부는 각각 확인해야 하며, 예시 코드만으로 lock-free 성질을 보장하지 않습니다.

## ABA — SPSC엔 없음

Lock-free stack과 queue에서 흔히 등장하는 ABA 문제는 *SPSC에서는 발생하지 않습니다*. producer와 consumer가 각각 하나뿐이기 때문입니다.

- `head`는 producer만, `tail`은 consumer만 변경합니다.
- 같은 변수를 두 thread가 동시에 write하지 않으므로 ABA가 생길 여지가 없습니다.

## Static Allocation

```c
static ring_t g_uart_ring;   /* static — heap 안 씀 */

ring_t *get_ring(void) { return &g_uart_ring; }
```

ISR과 task가 같은 *static instance*를 공유해서 씁니다.

## DPDK rte_ring — 표준 라이브러리

```c
struct rte_ring *r = rte_ring_create("name", 1024,
                                       SOCKET_ID_ANY,
                                       RING_F_SP_ENQ | RING_F_SC_DEQ);

rte_ring_sp_enqueue(r, obj);
rte_ring_sc_dequeue(r, &obj);
```

DPDK ring은 bulk operation을 지원하도록 설계됐습니다. 적용 가능한 NIC·polling 모델과 처리율은 workload에서 측정합니다.

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

구성에 따라 ISR 없이 DMA와 polling만으로 동작할 수 있습니다. DMA head 갱신의 동시성·cache coherency·wrap 처리를 확인하고 baud rate별로 측정합니다.

## Stream Buffer — FreeRTOS Built-in

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);

/* ISR */
xStreamBufferSendFromISR(sb, &byte, 1, &pxHP);

/* Task */
xStreamBufferReceive(sb, buf, n, portMAX_DELAY);
```

FreeRTOS는 내부적으로 *ring buffer와 locking*을 함께 씁니다. 직접 구현한 것보다 약간 느리지만, *API가 깔끔합니다*.

## 자주 하는 실수

> ⚠️ Power-of-2 아닌 size

```c
#define RING_SIZE 100   /* ← MOD operation 매번 */
```

대신 64 또는 128처럼 power-of-2 크기를 씁니다.

> ⚠️ Volatile만 + SMP

```c
volatile uint16_t head;   /* SMP에선 부족 */
```

대신 `atomic_*`에 memory order를 함께 지정해야 합니다.

> ⚠️ False sharing 무시

```c
struct { volatile uint16_t head, tail; uint8_t buf[]; } ring;
/* head·tail 같은 line — SMP에서 ping-pong */
```

이때는 `alignas(64)`로 분리해야 합니다.

> ⚠️ Multi-producer 가정

```c
/* 2 ISR이 같은 ring push */
ring_push(r, b);   /* race — SPSC 보장 깨짐 */
```

이런 경우에는 MPMC ring을 쓰거나 *lock과 ring을 함께* 사용해야 합니다.

## 정리

- SPSC ring은 **head/tail + atomic + release/acquire** 조합으로 구성합니다.
- **Power-of-2** size에 AND mask를 써서 *div를 회피*합니다.
- Cortex-M single core에서는 volatile만으로 충분합니다.
- SMP에서는 *반드시 atomic과 alignas(64)*를 함께 적용합니다.
- ABA 문제는 SPSC에서는 무관합니다.
- DMA UART에서 ring을 거쳐 task로 가는 흐름이 *zero ISR* 패턴입니다.

다음 편은 **Priority Inversion**입니다.

## 관련 항목

- 2-01: ISR-Safe API
- [2-03: Priority Inversion](/blog/embedded/modern-recipes/part6-10-priority-inversion)
