---
title: "4-05: Memory Pool — Fixed-Size·O(1)·Per-Class Pool"
date: 2026-05-19T17:00:00
description: "고정 size block. Free list. O(1) alloc/free. Per-class pool 패턴. FreeRTOS MPU."
series: "Practical RTOS Internals"
seriesOrder: 37
tags: [pool, fixed-size, free-list, slab]
draft: true
---

## 한 줄 요약

> **"Pool = 같은 size block의 free list"** — O(1) alloc/free, fragmentation 0.

## 기본 Pool

```c
#define POOL_BLOCKS  32
#define BLOCK_SIZE   64

typedef struct block { struct block *next; } block_t;

static uint8_t pool_memory[POOL_BLOCKS * BLOCK_SIZE];
static block_t *free_list;
static mutex_t pool_lock;

void pool_init(void) {
    free_list = (block_t*)pool_memory;
    block_t *cur = free_list;
    for (int i = 0; i < POOL_BLOCKS - 1; i++) {
        cur->next = (block_t*)(pool_memory + (i+1) * BLOCK_SIZE);
        cur = cur->next;
    }
    cur->next = NULL;
}

void *pool_alloc(void) {
    mutex_take(&pool_lock);
    block_t *b = free_list;
    if (b) free_list = b->next;
    mutex_give(&pool_lock);
    return b;
}

void pool_free(void *ptr) {
    mutex_take(&pool_lock);
    block_t *b = (block_t*)ptr;
    b->next = free_list;
    free_list = b;
    mutex_give(&pool_lock);
}
```

O(1) — free list push/pop.

## Per-Class Pool

```c
struct pool packet_pool;       /* 64 byte packets */
struct pool message_pool;      /* 256 byte messages */
struct pool large_pool;        /* 4 KB buffers */

void *p64 = pool_alloc(&packet_pool);
void *p256 = pool_alloc(&message_pool);
```

크기별 별도 pool — *fragmentation 0*, *contention 분산*.

## Lock-Free Pool — SPSC

```c
/* Producer: pool_alloc, Consumer: pool_free
   또는 reverse */
   
atomic_uintptr_t free_list_head;

void *pool_alloc_lf(void) {
    block_t *old, *new;
    do {
        old = (block_t*)atomic_load(&free_list_head);
        if (!old) return NULL;
        new = old->next;
    } while (!atomic_compare_exchange_weak(&free_list_head, &old, new));
    return old;
}
```

ABA 위험 — *tagged pointer* 또는 hazard pointer로 보강.

## FreeRTOS — `pvPortMalloc` 대신 Pool

```c
/* 사용자 정의 pool */
QueueHandle_t packet_pool_q;

void init(void) {
    static uint8_t storage[32 * sizeof(packet_t*)];
    packet_pool_q = xQueueCreateStatic(32, sizeof(packet_t*), storage, ...);
    
    /* Initial fill */
    static packet_t packets[32];
    for (int i = 0; i < 32; i++) {
        packet_t *p = &packets[i];
        xQueueSend(packet_pool_q, &p, 0);
    }
}

packet_t *get_packet(void) {
    packet_t *p;
    xQueueReceive(packet_pool_q, &p, portMAX_DELAY);
    return p;
}

void put_packet(packet_t *p) {
    xQueueSend(packet_pool_q, &p, 0);
}
```

Queue가 자체적으로 *Block list 추적* — pool 역할.

## CMSIS-RTOS — Memory Pool API

```c
osMemoryPoolId_t pool;
osMemoryPoolAttr_t attr = {0};

pool = osMemoryPoolNew(32, sizeof(packet_t), &attr);

packet_t *p = osMemoryPoolAlloc(pool, osWaitForever);
/* ... use ... */
osMemoryPoolFree(pool, p);
```

CMSIS-RTOS v2 표준. Zephyr·RT-Thread도 비슷.

## Pool 정밀 사용 예 — UDP Stack

```c
struct mbuf {
    struct mbuf *next;
    uint16_t len;
    uint8_t data[MBUF_DATA];
};

#define MBUF_POOL_SIZE 256
static struct mbuf mbuf_storage[MBUF_POOL_SIZE];
static pool_t mbuf_pool;

/* RX path */
void udp_rx(uint8_t *bytes, int len) {
    struct mbuf *m = pool_alloc(&mbuf_pool);
    if (!m) { drop(); return; }
    memcpy(m->data, bytes, len);
    m->len = len;
    queue_for_processing(m);
}

void process(struct mbuf *m) {
    /* ... */
    pool_free(&mbuf_pool, m);
}
```

lwIP·FreeRTOS+TCP·Zephyr networking — *모두 mbuf pool 패턴*.

## Slab Allocator (Linux Kernel)

```text
kmem_cache_create("packet", sizeof(packet), align, flags);

packet_t *p = kmem_cache_alloc(packet_cache, GFP_KERNEL);
kmem_cache_free(packet_cache, p);
```

Per-type cache — slab/slob/slub variants. Pool 개념의 *kernel scale*.

## Pool Sizing

```text
Workload analysis:
  - Peak burst: 64 packets in 1 ms
  - Processing time: 200 µs avg
  - In-flight: 64 × 200µs / 1ms = 12.8 → round up 16

Pool size = peak burst + margin
         = 64 + 20% = ~80 blocks
```

Per-class별 *peak burst 측정*. 너무 작으면 *drop*, 너무 크면 *RAM 낭비*.

## Pool Exhaustion 시

```c
void *p = pool_alloc(&packet_pool);
if (!p) {
    /* 정책 — drop·wait·log·priority */
    metrics.dropped++;
    return -ENOMEM;
}
```

Production — *drop 우선* (RT critical 시), *block은 secondary*.

## Multi-Pool Allocator

```c
struct multi_pool {
    pool_t p64;
    pool_t p256;
    pool_t p1024;
    pool_t p4096;
};

void *multi_alloc(struct multi_pool *mp, size_t size) {
    if (size <= 64) return pool_alloc(&mp->p64);
    if (size <= 256) return pool_alloc(&mp->p256);
    if (size <= 1024) return pool_alloc(&mp->p1024);
    if (size <= 4096) return pool_alloc(&mp->p4096);
    return NULL;   /* too large */
}
```

`malloc` interface 대용 — TLSF 대안. **Bucketed pool**.

## Pool 사용 측정

```c
struct pool_stats {
    atomic_int allocated;
    atomic_int total;
    atomic_int peak_use;
    atomic_int alloc_fail;
};

void *pool_alloc_inst(struct pool *p) {
    block_t *b = ...;
    if (b) {
        int n = atomic_fetch_add(&p->stats.allocated, 1) + 1;
        update_peak(&p->stats.peak_use, n);
    } else {
        atomic_fetch_add(&p->stats.alloc_fail, 1);
    }
    return b;
}
```

운영 중 *peak / total 비율*로 *pool size 조정*.

## Cache-Friendly Pool

```c
struct __attribute__((aligned(64))) block_aligned {
    block_t hdr;
    uint8_t data[60];
};
```

Block을 *cache line 정렬* — false sharing 없음, prefetcher 활용.

## 자주 하는 실수

> ⚠️ Pool 크기 underestimate

```c
#define POOL_SIZE 8   /* burst 16개 → 절반 drop */
```

→ peak burst 측정 후 *적정 margin*.

> ⚠️ Lock 없이 multi-thread

```c
pool_alloc();   /* race */
```

→ mutex 또는 lock-free.

> ⚠️ Free한 ptr 다시 사용

```c
pool_free(p);
p->data = 0;   /* ← UAF */
```

→ `free 후 ptr = NULL`.

> ⚠️ Different pool에 free

```c
void *p = pool_alloc(&pool_a);
pool_free(&pool_b, p);   /* ← corruption */
```

→ pool ID embed 또는 disciplined usage.

## 정리

- Memory Pool = **fixed-size block의 free list**.
- O(1) alloc·free — fragmentation 0.
- **Per-class pool**으로 size별 분리.
- CMSIS-RTOS·FreeRTOS Queue·Linux slab 모두 pool 패턴.
- Lock-free pool — SPSC OK, MPMC는 ABA 보강.
- Pool sizing — *peak burst + margin*.

다음 편은 **Stack Overflow**.

## 관련 항목

- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
