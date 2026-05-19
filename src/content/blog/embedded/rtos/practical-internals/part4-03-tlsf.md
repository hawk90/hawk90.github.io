---
title: "4-03: TLSF — Two-Level Segregated Fit O(1) Allocator"
date: 2026-05-19T15:00:00
description: "Masmano 2004 TLSF 알고리즘. Bitmap + CLZ로 O(1) alloc·free·coalesce."
series: "Practical RTOS Internals"
seriesOrder: 35
tags: [tlsf, allocator, deterministic, o1]
draft: true
---

## 한 줄 요약

> **"TLSF = O(1) bounded heap"** — RT 시스템의 표준 dynamic allocator.

## 도입 — Masmano 2004

Miguel Masmano (Universitat Politècnica de València). 임베디드 RT를 위한 *O(1) bounded* heap.

채택:
- Linux PREEMPT_RT
- VxWorks
- L4 microkernel
- AAA 게임 (실시간 GC 대용)
- WebAssembly·Lua engines

## 구조 — Two Levels

```text
Level 1 — Power-of-2 bucket
  bucket[0] = 16-31 byte
  bucket[1] = 32-63 byte
  bucket[2] = 64-127 byte
  ...
  bucket[n] = 2^n ~ 2^(n+1)-1

Level 2 — Linear sub-divide
  각 L1 bucket을 2^M sub-bucket
  e.g. 64-byte bucket (L1=6) + M=4:
    sub[0] = 64-67
    sub[1] = 68-71
    sub[2] = 72-75
    ...
    sub[15] = 124-127
```

## Bitmap

```c
uint32_t fl_bitmap;       /* 32 bit — L1 bucket 비어있나 */
uint32_t sl_bitmap[32];   /* 각 L1 bucket의 SL bucket 비어있나 */
BlockHeader *blocks[32][16];   /* 실제 free list */
```

bit 1 = 해당 bucket에 free block 있음.

## Allocate — O(1)

```c
void *tlsf_alloc(size_t size) {
    /* 1. size → mapping (fl, sl) */
    int fl = msb(size);              /* ARM CLZ + 31 */
    int sl = (size >> (fl - 4)) & 0xF;
    
    /* Round up — 다음 bucket */
    sl++;
    if (sl == 16) { fl++; sl = 0; }
    
    /* 2. bitmap에서 *처음 1* 찾음 */
    int fl_idx = msb(fl_bitmap & ~((1 << fl) - 1));   /* fl 이상 첫 1 */
    if (fl_idx < 0) return NULL;
    
    int sl_idx = msb(sl_bitmap[fl_idx]);
    
    /* 3. 그 bucket head pop */
    BlockHeader *block = blocks[fl_idx][sl_idx];
    blocks[fl_idx][sl_idx] = block->next;
    if (!block->next) clear_bit(sl_bitmap[fl_idx], sl_idx);
    
    /* 4. Split if too large */
    if (block->size > size + MIN_BLOCK) {
        BlockHeader *rest = split(block, size);
        insert_into_bucket(rest);
    }
    
    return block + 1;
}
```

각 step *O(1)* — bitmap scan은 *CLZ 명령* 한 번.

## ARM CLZ 명령

```asm
clz r1, r0    ; r1 = leading zero count of r0
              ; bit position of MSB
```

Cortex-M3+ 표준. 1 cycle. → bucket index 즉시 계산.

## Free — O(1) + Coalesce

```c
void tlsf_free(void *ptr) {
    BlockHeader *block = (BlockHeader*)ptr - 1;
    
    /* Coalesce with prev */
    BlockHeader *prev = block->prev_phys;
    if (prev && prev->is_free) {
        remove_from_bucket(prev);
        prev->size += block->size + HEADER_SIZE;
        block = prev;
    }
    
    /* Coalesce with next */
    BlockHeader *next = block + block->size;
    if (next->is_free) {
        remove_from_bucket(next);
        block->size += next->size + HEADER_SIZE;
    }
    
    /* Insert back */
    insert_into_bucket(block);
}
```

이웃 block — *physical address*로 O(1) access. Coalesce O(1).

## Fragmentation Bound

Masmano paper:

```text
worst case fragmentation < 25% (for typical workload)
internal frag < 6.25% (4-bit SL)
```

`Heap_4` (FreeRTOS)는 *unbounded* worst case fragmentation. TLSF는 *bounded*.

## API — tlsf-bsd

```c
#include "tlsf.h"

uint8_t pool_memory[1024 * 1024];   /* 1 MB pool */
tlsf_t tlsf;
pool_t pool;

void init(void) {
    tlsf = tlsf_create_with_pool(pool_memory, sizeof(pool_memory));
    pool = tlsf_get_pool(tlsf);
}

void *p = tlsf_malloc(tlsf, 100);
tlsf_free(tlsf, p);

tlsf_destroy(tlsf);
```

mattconte/tlsf-bsd — GitHub 오픈소스. ~2 KB code, MIT license.

## Multi-Pool

```c
tlsf_add_pool(tlsf, additional_memory, size);
```

Heap_5와 비슷 — non-contiguous memory 통합.

## 성능 — Heap_4 vs TLSF

```text
Cortex-M4 @ 168 MHz, 32 KB heap, 100 random alloc/free:

Heap_4:
  alloc: avg 1.5 µs, worst 15 µs
  free:  avg 1.2 µs, worst 10 µs

TLSF:
  alloc: avg 0.8 µs, worst 1.5 µs   ← bounded
  free:  avg 0.7 µs, worst 1.3 µs   ← bounded

Worst case 10x 차이 — RT 시스템에 critical.
```

## Linux PREEMPT_RT Kernel

```text
PREEMPT_RT — RT patch:
  - 거의 모든 lock이 *preemptible*
  - SLAB allocator → SLUB (better latency)
  - 일부 critical path에 *TLSF 변형* 사용
```

자동차·산업 Linux (BMW iX·Bosch IoT Suite) — *PREEMPT_RT + TLSF-like alloc*.

## VxWorks Memory Partition

```c
PART_ID partId = memPartCreate((char*)pool, size);
void *p = memPartAlloc(partId, 100);
memPartFree(partId, p);
```

VxWorks의 partition = TLSF 또는 best-fit. *Per-partition* — 격리.

## TLSF 단점

- **Overhead**: ~1 KB bitmap (32 × 32 bit + 32 × 16 ptr)
- **Code size**: ~2 KB
- 작은 heap (<4 KB) — *overhead 비율 큼*
- 매우 작은 alloc (16 byte 이하) — minimum block size 영향

→ tiny embedded는 *static + pool*이 효율.

## Real-Time Robotics — TLSF

ROS 2 micro-ROS — *TLSF allocator* 옵션. Bounded WCET 보장.

```c
rcl_allocator_t alloc = rcl_get_default_allocator();
alloc.allocate = tlsf_allocate;
alloc.deallocate = tlsf_deallocate;
```

자율주행 차량 — *PREEMPT_RT + TLSF + ROS 2*.

## 자주 하는 실수

> ⚠️ 작은 pool에 TLSF

```c
uint8_t pool[2048];   /* ← 2 KB — TLSF overhead가 50%+ */
```

→ tiny system은 *memory pool*.

> ⚠️ TLSF 다중 thread 동기화

```c
/* TLSF 자체는 thread-unsafe */
tlsf_alloc();   /* ← race */
```

→ mutex로 wrap 또는 *per-thread pool*.

> ⚠️ Coalesce 의존하지 않은 사용

```c
/* 같은 size 반복 alloc/free */
/* → coalesce 안 일어남, fragment 점진 ↑ */
```

→ *memory pool*이 더 적합.

> ⚠️ Stack에 TLSF 결과 사용

```c
void *p = tlsf_malloc(...);
some_dma_function(p);
return;   /* p 그대로 — free 안 함, 누수 */
```

당연한 누수 주의 — RAII (C++) 또는 명시 free.

## 정리

- TLSF = **O(1) bounded** alloc·free.
- Bitmap + ARM **CLZ**로 즉시 bucket 찾음.
- **Two-level** = power-of-2 bucket + linear sub-bucket.
- Fragmentation **< 25%** worst case.
- 자동차·로봇·RT 게임에서 표준.
- Tiny heap엔 overhead 큼 — *pool 우선*.

다음 편은 **Static Allocation**.

## 관련 항목

- [4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
