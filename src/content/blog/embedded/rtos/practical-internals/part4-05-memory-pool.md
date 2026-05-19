---
title: "4-05: Memory Pool — Fixed-Size Block Allocator의 단순함과 강력함"
date: 2026-05-07T17:00:00
description: "같은 크기 객체를 다수 alloc/free하는 패턴을 위한 fixed-size pool입니다. free list 구조, O(1) 보장, per-class pool, lock-free 변형까지 실전 패턴을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 37
tags: [pool, fixed-size, free-list, slab]
---

## 한 줄 요약

> **"Memory pool은 같은 크기 block의 free list입니다."** — alloc과 free 모두 *O(1) 상수*, 단편화는 *원천적으로 0*입니다.

## 어떤 문제를 푸는가

임베디드 시스템의 동적 메모리 사용 패턴을 자세히 보면 *대부분이 고정 크기*입니다. UDP packet buffer, MQTT message object, sensor sample, event descriptor가 모두 같은 크기로 들어왔다 나갑니다. 이런 워크로드에 [heap_4](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)나 [TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)를 쓰는 것은 *과한 도구*입니다.

같은 크기를 다룬다면 *fragmentation이 발생할 수 없습니다*. 한 block을 free하면 그 자리에 *정확히 같은 크기*의 다음 alloc이 들어갑니다. 자료구조도 단순해집니다. *free block을 단방향 linked stack*으로 묶어 두면 alloc은 pop, free는 push로 끝납니다. 둘 다 *명령 몇 개*입니다.

이 단순한 구조가 *임베디드 메모리 관리의 주력 도구*입니다. lwIP의 mbuf, FreeRTOS+TCP의 buffer pool, Zephyr의 mem_slab, Linux 커널의 slab allocator가 모두 같은 사상의 변형입니다. 이번 편은 기본 구조부터 lock-free 변형, 실전 sizing까지 정리합니다.

## 기본 Pool 구조

block 안에 *next 포인터*를 두는 것이 핵심입니다. block이 free 상태일 때는 *사용자 데이터 자리*가 비어 있으므로, 그 자리를 그대로 *연결 포인터*로 재활용합니다. 추가 오버헤드 없이 free list가 만들어집니다.

```c
#define POOL_BLOCKS  32
#define BLOCK_SIZE   64

typedef struct block { struct block *next; } block_t;

static uint8_t  pool_memory[POOL_BLOCKS * BLOCK_SIZE];
static block_t *free_list;
static mutex_t  pool_lock;

void pool_init(void) {
    free_list = (block_t*)pool_memory;
    block_t *cur = free_list;
    for (int i = 0; i < POOL_BLOCKS - 1; i++) {
        cur->next = (block_t*)(pool_memory + (i + 1) * BLOCK_SIZE);
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
    if (!ptr) return;
    mutex_take(&pool_lock);
    block_t *b = (block_t*)ptr;
    b->next = free_list;
    free_list = b;
    mutex_give(&pool_lock);
}
```

`pool_init`이 모든 block을 *주소순으로 연결*해 둡니다. 이후 alloc과 free는 *list head 하나*만 갱신합니다. block 수에 무관하게 *고정 명령 수*입니다.

block size가 sizeof(pointer)보다 크기만 하면 동작합니다. 32-bit 시스템에서 4 byte block, 64-bit 시스템에서 8 byte block이 minimum입니다.

## Per-Class Pool

객체 종류별로 *별도의 pool*을 둡니다. 같은 size를 굳이 한 pool에 섞을 필요가 없고, *contention 분산* 효과도 큽니다.

```c
static pool_t packet_pool;     /* 64 byte network packets */
static pool_t message_pool;    /* 256 byte MQTT messages */
static pool_t large_pool;      /* 4 KB transfer buffers */

void pool_setup(void) {
    pool_create(&packet_pool,  64,   128);
    pool_create(&message_pool, 256,   32);
    pool_create(&large_pool,   4096,   8);
}

packet_t *p   = pool_alloc(&packet_pool);
message_t *m  = pool_alloc(&message_pool);
```

각 pool이 *독립된 lock*을 가지므로 한 종류의 burst가 다른 종류를 막지 않습니다. *cache locality*도 좋아집니다. 같은 종류의 block이 *연속된 주소 범위*에 모여 있어 prefetcher가 잘 동작합니다.

## CMSIS-RTOS 표준 API

CMSIS-RTOS v2는 *memory pool을 first-class API*로 제공합니다. Zephyr의 `k_mem_slab`도 동일한 사상입니다.

```c
osMemoryPoolId_t   packet_pool;
osMemoryPoolAttr_t attr = { .name = "packet" };

void init(void) {
    packet_pool = osMemoryPoolNew(32, sizeof(packet_t), &attr);
}

void *p = osMemoryPoolAlloc(packet_pool, osWaitForever);
/* ... use ... */
osMemoryPoolFree(packet_pool, p);
```

`osWaitForever` 대신 timeout을 주면 *pool 고갈 시 대기*에 상한이 생깁니다. RT 시스템에서는 보통 *0 timeout으로 즉시 실패*하고 caller가 drop을 결정합니다.

## FreeRTOS Queue를 Pool로 쓰기

FreeRTOS는 별도 pool API가 없지만 *Queue를 그대로 pool*로 쓸 수 있습니다. queue가 *block list*를 내부적으로 관리해 주는 셈입니다.

```c
static StaticQueue_t pool_q_buf;
static uint8_t       pool_q_storage[32 * sizeof(packet_t*)];
static packet_t      packets[32];  /* 실제 block storage */
QueueHandle_t        packet_pool_q;

void init(void) {
    packet_pool_q = xQueueCreateStatic(
        32, sizeof(packet_t*), pool_q_storage, &pool_q_buf);
    for (int i = 0; i < 32; i++) {
        packet_t *p = &packets[i];
        xQueueSend(packet_pool_q, &p, 0);
    }
}

packet_t *get_packet(void) {
    packet_t *p;
    if (xQueueReceive(packet_pool_q, &p, 0) == pdTRUE) return p;
    return NULL;
}

void put_packet(packet_t *p) {
    xQueueSend(packet_pool_q, &p, 0);
}
```

queue 자체가 *thread-safe*이므로 별도 lock이 필요 없습니다. ISR에서도 `xQueueSendFromISR`로 free가 가능합니다. 작은 시스템에 deep dependency 없이 적용하기 좋은 패턴입니다.

## lwIP / FreeRTOS+TCP의 mbuf Pool

네트워크 스택의 표준 자료구조가 *mbuf*(memory buffer) 또는 *pbuf*(packet buffer)입니다. RX path에서 packet이 들어오는 즉시 pool에서 mbuf를 할당하고, 처리 후 free합니다.

```c
struct mbuf {
    struct mbuf *next;
    uint16_t     len;
    uint8_t      data[MBUF_DATA];
};

#define MBUF_POOL_SIZE 256
static struct mbuf mbuf_storage[MBUF_POOL_SIZE];
static pool_t      mbuf_pool;

/* ISR — RX */
void eth_rx_isr(uint8_t *bytes, int len) {
    struct mbuf *m = pool_alloc(&mbuf_pool);
    if (!m) { drop_counter++; return; }
    memcpy(m->data, bytes, len);
    m->len = len;
    queue_for_processing(m);
}

/* Task — process */
void net_task(void) {
    struct mbuf *m;
    while (dequeue(&m)) {
        process_packet(m);
        pool_free(&mbuf_pool, m);
    }
}
```

ISR에서 *O(1) 시간 안에* mbuf를 잡지 못하면 packet은 *drop*됩니다. mbuf pool 크기는 *peak burst를 흡수할 만큼*은 되어야 합니다. 4-04에서 본 정적 sizing 원칙이 그대로 적용됩니다.

## Lock-Free Pool — SPSC

producer 하나, consumer 하나가 정해진 경우라면 *lock 없이* 구현이 가능합니다. atomic CAS로 list head를 갱신합니다.

```c
#include <stdatomic.h>

static _Atomic(block_t*) free_list_head;

void *pool_alloc_lf(void) {
    block_t *old, *next;
    do {
        old = atomic_load_explicit(&free_list_head, memory_order_acquire);
        if (!old) return NULL;
        next = old->next;
    } while (!atomic_compare_exchange_weak_explicit(
                 &free_list_head, &old, next,
                 memory_order_acq_rel, memory_order_acquire));
    return old;
}

void pool_free_lf(void *ptr) {
    block_t *b = (block_t*)ptr;
    block_t *old;
    do {
        old = atomic_load_explicit(&free_list_head, memory_order_relaxed);
        b->next = old;
    } while (!atomic_compare_exchange_weak_explicit(
                 &free_list_head, &old, b,
                 memory_order_release, memory_order_relaxed));
}
```

MPMC(multi-producer multi-consumer)에서는 *ABA 문제*가 생깁니다. CAS가 *주소만 비교*하므로 같은 주소가 *해제되었다가 다시 alloc*된 경우를 구분하지 못합니다. tagged pointer(주소 + 16-bit counter)나 hazard pointer로 보강해야 합니다. ISR에서 free만 호출되는 SPSC 패턴이면 ABA가 *원리적으로* 발생하지 않으므로 단순한 CAS로 충분합니다.

## Linux 커널의 Slab Allocator

같은 사상이 *커널 스케일*로 확장된 것이 slab allocator입니다. Linux는 SLAB → SLUB → SLOB → SLUB(현재 기본) 변형을 거쳤습니다.

```c
struct kmem_cache *packet_cache;

void init(void) {
    packet_cache = kmem_cache_create("packet",
                                     sizeof(struct packet),
                                     0, SLAB_HWCACHE_ALIGN, NULL);
}

struct packet *p = kmem_cache_alloc(packet_cache, GFP_KERNEL);
kmem_cache_free(packet_cache, p);
```

SLUB는 *per-CPU 캐시*를 두어 multi-core에서 lock-free에 가깝게 동작합니다. SMP RTOS에서 같은 사상을 적용한 것이 *per-core memory pool*입니다.

## Pool Sizing — Peak Burst 측정

pool 크기는 *peak burst + margin*으로 정합니다. 평균 사용량이 아니라 *동시 in-flight 최댓값*입니다.

```text
워크로드 분석 예시:
  - peak RX burst : 64 packet / 1 ms
  - 평균 처리 시간 : 200 µs
  - in-flight     : 64 × 200µs / 1ms = 12.8 → round up 16
  - margin (25%)  : 4
  pool size       = 20 block
```

burst가 평균 처리 시간보다 *빨리 도착*하면 pool이 빠르게 비고 drop이 발생합니다. drop이 허용되지 않는 경로라면 *pool을 크게* 잡거나 *back-pressure*를 위로 전달합니다.

운영 중 sizing 검증을 위해 *peak use counter*를 둡니다.

```c
typedef struct {
    _Atomic int allocated;
    _Atomic int peak_use;
    _Atomic int alloc_fail;
} pool_stats_t;

void *pool_alloc_inst(pool_t *p) {
    block_t *b = pool_alloc(p);
    if (b) {
        int n = atomic_fetch_add(&p->stats.allocated, 1) + 1;
        int peak = atomic_load(&p->stats.peak_use);
        while (n > peak &&
               !atomic_compare_exchange_weak(&p->stats.peak_use, &peak, n));
    } else {
        atomic_fetch_add(&p->stats.alloc_fail, 1);
    }
    return b;
}
```

peak_use가 pool size의 *80%를 넘기면 alarm*, *fail이 0이 아니면 즉시 조사* 같은 운영 규칙을 설계 단계에서 정합니다.

## Cache-Friendly Alignment

block을 *cache line 크기로 정렬*하면 false sharing이 사라지고 prefetcher가 더 잘 동작합니다. Cortex-M7 / Cortex-A의 cache line은 보통 32 또는 64 byte입니다.

```c
struct __attribute__((aligned(64))) block_aligned {
    block_t hdr;
    uint8_t data[60];
};
```

DMA buffer로 쓰이는 block은 *cache line 정렬이 필수*입니다. 정렬되지 않으면 `cache_clean_invalidate`가 *인접 데이터까지 무효화*해 미묘한 corruption을 만듭니다.

## Multi-Size Bucketed Pool

여러 size class를 함께 운영하면 `malloc` 인터페이스 대용으로 쓸 수 있습니다.

```c
struct multi_pool {
    pool_t p64, p256, p1024, p4096;
};

void *multi_alloc(struct multi_pool *mp, size_t size) {
    if (size <=   64) return pool_alloc(&mp->p64);
    if (size <=  256) return pool_alloc(&mp->p256);
    if (size <= 1024) return pool_alloc(&mp->p1024);
    if (size <= 4096) return pool_alloc(&mp->p4096);
    return NULL;
}
```

크기별 *internal fragmentation*은 있지만 (예: 100 byte 요청에 256 byte block) *external fragmentation은 0*입니다. TLSF보다 단순하면서 worst case는 더 예측 가능합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Pool 크기를 평균으로 잡음

peak burst가 평균의 *수 배*인 경우가 많습니다. 평균에 맞추면 burst 시점에 *대부분 drop*됩니다. 측정한 peak에 25% margin을 더한 값을 시작점으로 합니다.

> ⚠️ Multi-thread에서 lock 누락

lock 없이 두 task가 동시에 `pool_alloc`을 호출하면 free list head가 깨집니다. mutex로 감싸거나 lock-free 변형을 쓰거나, *RTOS queue 기반 pool*로 옮깁니다.

> ⚠️ Free 후 포인터 재사용 (use-after-free)

`pool_free(p)` 직후 `p->data = 0`을 하면 *이미 다른 alloc에 넘어간 block*을 덮어씁니다. free 후에는 *즉시 포인터를 NULL로 덮어쓰는* 습관이 유일한 방어입니다.

> ⚠️ 다른 pool에 free

block의 출처를 추적하지 않으면 *엉뚱한 pool에 free*해서 list가 깨집니다. block header에 *pool ID*를 박아 두거나, free 함수에 *명시적으로 pool 인자*를 받게 합니다.

> ⚠️ ISR에서 mutex-기반 pool 호출

기본 `pool_alloc`이 mutex를 take하면 *ISR에서 호출 시 deadlock*입니다. ISR이 접근하는 pool은 *lock-free* 또는 *RTOS queue + FromISR API* 변형으로 만듭니다.

## 정리

- Memory pool은 *같은 크기 block의 free list*로, alloc·free 모두 O(1) 상수입니다.
- block이 비어 있을 때 사용자 데이터 자리를 *next 포인터*로 재활용하므로 별도 오버헤드가 없습니다.
- 객체 종류별 *per-class pool*은 contention 분산과 cache locality에 모두 유리합니다.
- CMSIS-RTOS, Zephyr `k_mem_slab`, FreeRTOS queue 기반 패턴, Linux SLUB가 모두 같은 사상의 변형입니다.
- SPSC 환경에서는 lock-free 변형이 가능하며, MPMC는 ABA 보강이 필요합니다.
- pool 크기는 *peak burst + margin*으로 정하고, 운영 중 *peak_use counter*로 검증합니다.
- DMA buffer는 *cache line 정렬*이 필수이며 정렬되지 않은 block은 silent corruption을 만듭니다.

다음 편은 [4-06 Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)에서 *임베디드 가장 흔한 silent bug*를 다룹니다.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
