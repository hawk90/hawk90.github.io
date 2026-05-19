---
title: "4-03: TLSF — Two-Level Segregated Fit O(1) Allocator"
date: 2026-05-07T15:00:00
description: "Masmano 2004의 TLSF 알고리즘을 풀어봅니다. Bitmap과 CLZ 명령으로 alloc·free·coalesce 모두 O(1)을 보장하며, 자동차·로봇·RT 게임의 표준 dynamic allocator가 된 이유를 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 35
tags: [tlsf, allocator, deterministic, o1]
---

## 한 줄 요약

> **"TLSF는 alloc과 free 모두 O(1)을 보장하는 bounded heap입니다."** — bitmap과 CLZ 명령 한 번이면 적합한 bucket을 즉시 찾습니다.

## 어떤 문제를 푸는가

[heap_4](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)의 worst case는 free list 길이에 비례합니다. 평균은 빠르지만 *bounded라고 말하기는 어렵습니다*. RT 시스템에서 alloc이 control loop 안에 들어가면 *수 µs ~ 수십 µs 변동*이 곧 jitter로 이어집니다.

이 문제를 정면으로 푼 것이 TLSF입니다. Miguel Masmano 등이 2004년 발표한 알고리즘으로, *block 크기에 무관하게 alloc·free·coalesce 모두 상수 시간*을 보장합니다. 핵심 트릭은 bitmap과 CPU의 leading-zero-count 명령(ARM의 CLZ, x86의 LZCNT)을 결합해 *적합한 free list bucket을 한 번의 비트 연산으로 찾는 것*입니다.

채택 범위가 넓습니다. Linux PREEMPT_RT의 일부 경로, VxWorks memory partition, micro-ROS 기본 allocator, 그리고 AAA 게임의 frame allocator가 모두 TLSF나 그 변형을 씁니다. 임베디드 RT에서는 *사실상의 표준 dynamic allocator*입니다.

## 구조 — 두 단계 Segregation

TLSF는 free block을 *2차원 격자*에 분류합니다.

```text
Level 1 (first-level, FL) — power-of-2 bucket
  FL[4]  : 16  ~ 31  byte
  FL[5]  : 32  ~ 63  byte
  FL[6]  : 64  ~ 127 byte
  ...
  FL[n]  : 2^n ~ 2^(n+1)-1

Level 2 (second-level, SL) — 각 FL bucket을 2^M 등분 (보통 M=4 → 16등분)
  FL[6] (64~127):
    SL[0]=64-71  SL[1]=72-79  SL[2]=80-87  ... SL[15]=120-127
```

같은 FL bucket 안에서도 *4-bit linear subdivision*으로 더 정밀하게 분류합니다. M=4이면 *internal fragmentation 상한이 1/16 ≈ 6.25%*로 묶입니다.

각 SL bucket이 *별도의 free list*를 갖습니다. 그리고 어느 bucket에 free block이 *있는지 없는지*를 추적하는 두 단계 bitmap이 핵심 자료구조입니다.

전체 구조를 한 장으로 정리하면 이렇습니다. FL bitmap에서 set bit를 찾고, 해당 FL[i]의 SL bitmap에서 다시 set bit를 찾아 `blocks[FL][SL]` free list 머리에 도달합니다. CTZ 두 번에 적합 bucket이 결정됩니다.

![TLSF two-level segregated buckets](/images/blog/rtos/diagrams/part4-03-tlsf-buckets.svg)

```c
typedef struct tlsf {
    uint32_t fl_bitmap;          /* FL bucket 점유 여부 — 32 bit */
    uint32_t sl_bitmap[FL_MAX];  /* 각 FL의 SL bucket 점유 여부 */
    block_t *blocks[FL_MAX][SL_MAX];  /* 실제 free list head */
} tlsf_t;
```

bit가 1이면 그 bucket에 free block이 *적어도 하나* 있다는 뜻입니다.

## Allocate — O(1)

요청 size로부터 *FL, SL index*를 계산하고, bitmap에서 *그 이상의 첫 1*을 찾아 해당 bucket head를 pop합니다. 모두 비트 연산입니다.

```c
void *tlsf_malloc(tlsf_t *t, size_t size) {
    /* 1) size → (fl, sl) mapping */
    int fl = sizeof(size_t) * 8 - 1 - __builtin_clz(size);
    int sl = (size >> (fl - SL_BITS)) & (SL_MAX - 1);

    /* 2) round up — 다음 bucket */
    if (++sl == SL_MAX) { fl++; sl = 0; }

    /* 3) bitmap에서 fl 이상의 첫 1을 찾음 */
    uint32_t sl_map = t->sl_bitmap[fl] & (~0U << sl);
    if (sl_map == 0) {
        uint32_t fl_map = t->fl_bitmap & (~0U << (fl + 1));
        if (fl_map == 0) return NULL;        /* OOM */
        fl = __builtin_ctz(fl_map);
        sl_map = t->sl_bitmap[fl];
    }
    sl = __builtin_ctz(sl_map);

    /* 4) bucket head pop */
    block_t *b = t->blocks[fl][sl];
    t->blocks[fl][sl] = b->next_free;
    if (!b->next_free) {
        t->sl_bitmap[fl] &= ~(1U << sl);
        if (!t->sl_bitmap[fl]) t->fl_bitmap &= ~(1U << fl);
    }

    /* 5) too large하면 split, 나머지를 다시 insert */
    if (b->size >= size + MIN_BLOCK + HEADER) {
        block_t *rest = block_split(b, size);
        tlsf_insert(t, rest);
    }
    return block_to_ptr(b);
}
```

step 1~5 모두 *고정 횟수의 명령*입니다. free list 순회가 없습니다. block 수가 10개든 100만 개든 *같은 시간*에 끝납니다.

## ARM CLZ — Bucket 즉시 찾기

bitmap에서 *첫 1의 위치*를 찾는 것은 일반적으로 비싼 연산입니다. 그런데 ARM Cortex-M3 이상에는 `CLZ` 명령이 있습니다. 32-bit 값의 leading zero 개수를 *1 cycle*에 반환합니다. `__builtin_clz`와 `__builtin_ctz`가 이 명령으로 직접 컴파일됩니다.

```asm
clz r1, r0    ; r1 = leading zero count of r0
              ; MSB의 bit 위치를 즉시 얻음
```

TLSF가 *원리적으로* O(1)이라는 것은 알고리즘 단계의 횟수가 상수라는 뜻입니다. *실용적으로* 빠르다는 것은 그 단계가 모두 CLZ 같은 single-cycle 명령으로 구현된다는 것입니다. 두 조건이 모두 맞아야 RT에서 의미가 있습니다.

Cortex-M0 / M0+에는 CLZ가 없어서 software emulation을 써야 합니다. 이때는 TLSF의 우위가 약해집니다. M0급 타깃은 *static + memory pool*이 더 적합합니다.

## Free — O(1) + Coalesce

free에서 가장 비싼 부분은 *인접 block과 합치는 작업*입니다. TLSF는 block header에 *물리적으로 직전 block을 가리키는 포인터*(`prev_phys_block`)를 두어 *주소 산술*로 이웃을 즉시 찾습니다.

```c
void tlsf_free(tlsf_t *t, void *ptr) {
    block_t *b = ptr_to_block(ptr);

    /* 1) 직전 block과 coalesce */
    if (b->prev_phys && b->prev_phys->is_free) {
        tlsf_remove(t, b->prev_phys);
        b->prev_phys->size += b->size + HEADER;
        b = b->prev_phys;
    }

    /* 2) 직후 block과 coalesce */
    block_t *next = (block_t*)((uint8_t*)b + b->size);
    if (next->is_free) {
        tlsf_remove(t, next);
        b->size += next->size + HEADER;
    }

    /* 3) 합쳐진 block을 다시 적절한 bucket에 insert */
    tlsf_insert(t, b);
}
```

`tlsf_remove`와 `tlsf_insert`는 *해당 bucket의 free list 머리만 갱신*하면 됩니다. doubly-linked list로 free list를 유지하면 *임의 block의 제거도 O(1)*입니다.

이 구조 덕분에 *coalesce가 free의 평균 비용에 추가되지 않습니다*. heap_4가 coalesce를 위해 free list를 주소순으로 *유지*해야 했던 부담이 TLSF에는 없습니다.

## 단편화 상한

Masmano의 원 논문은 TLSF의 단편화 상한을 수학적으로 정리합니다.

- **Internal fragmentation** ≤ $1 / 2^{\text{SL\_BITS}}$ (SL_BITS=4 → 6.25%)
- **Worst-case overhead** ≤ 25% (대부분의 워크로드에서 실측)

heap_4의 단편화는 *unbounded*입니다. 워크로드가 나쁘면 가용 메모리의 90% 이상이 사용 불가 상태로 갈 수도 있습니다. TLSF는 *수학적으로 보장된 상한*을 갖는다는 점이 임베디드에서 큰 차이를 만듭니다.

## API 사용 — tlsf-bsd

`mattconte/tlsf`(MIT license, 약 2 KB 코드)가 가장 널리 쓰이는 구현입니다. 한 pool로 시작해 필요 시 region을 더할 수 있습니다.

```c
#include "tlsf.h"

static uint8_t pool_memory[1024 * 1024];  /* 1 MB */
static tlsf_t tlsf;

void mem_init(void) {
    tlsf = tlsf_create_with_pool(pool_memory, sizeof(pool_memory));
}

void *mem_alloc(size_t n) {
    return tlsf_malloc(tlsf, n);
}

void mem_free(void *p) {
    tlsf_free(tlsf, p);
}

/* 비연속 region 추가 — heap_5와 같은 효과 */
void mem_add_region(void *base, size_t size) {
    tlsf_add_pool(tlsf, base, size);
}
```

`tlsf_create_with_pool`이 한 번에 자료구조를 초기화하고, 그 뒤에는 `tlsf_malloc` / `tlsf_free`만 호출하면 됩니다.

## 성능 비교 — heap_4 vs TLSF

Cortex-M4 168 MHz, 32 KB heap, random size alloc/free 100회를 섞은 워크로드입니다.

| Allocator | alloc avg | alloc worst | free avg | free worst |
|---|---|---|---|---|
| heap_4 | 1.5 µs | 15 µs (가변) | 1.2 µs | 10 µs |
| TLSF | 0.8 µs | 1.5 µs (bounded) | 0.7 µs | 1.3 µs |

평균은 두 배쯤 차이입니다. *worst case는 10배 차이*입니다. RT 시스템에서 의미 있는 차이는 평균이 아니라 *worst*입니다.

## micro-ROS와 자율주행

ROS 2의 micro-ROS는 RTOS 위에서 ROS 노드를 돌리는 런타임입니다. 기본 allocator를 외부에서 주입할 수 있어 *TLSF allocator*를 끼우는 것이 표준 권장입니다.

```c
#include "rcl/allocator.h"

static rcl_allocator_t alloc = {
    .allocate    = tlsf_allocate_wrapper,
    .deallocate  = tlsf_deallocate_wrapper,
    .reallocate  = tlsf_reallocate_wrapper,
    .zero_allocate = tlsf_calloc_wrapper,
    .state       = &tlsf_instance,
};
```

자율주행 ECU에서 PREEMPT_RT Linux + TLSF + ROS 2 조합이 점점 표준에 가까워지고 있습니다. *bounded latency*가 자율주행의 안전성과 직결되기 때문입니다.

## VxWorks Memory Partition

VxWorks는 *partition* 개념으로 TLSF와 유사한 격리를 제공합니다.

```c
PART_ID part = memPartCreate(pool, size);
void *p = memPartAlloc(part, 100);
memPartFree(part, p);
```

partition마다 *별도의 allocator 인스턴스*가 돌고, 한 partition의 단편화가 다른 partition에 영향을 주지 않습니다. TLSF가 한 인스턴스 안에서 worst case를 보장한다면, partition은 *서브시스템 사이 격리*를 보장합니다. 두 기법은 보완 관계입니다.

## TLSF의 단점

만능은 아닙니다.

- 메모리 overhead가 *고정 1 KB 가량* 필요합니다. bitmap과 bucket head 배열입니다.
- 코드 크기가 *약 2 KB*입니다. heap_1보다는 큽니다.
- 매우 작은 heap(<4 KB)에서는 *overhead 비율이 50% 이상*이 되어 의미가 없습니다.
- 작은 alloc(16 byte 이하)은 minimum block size 때문에 *낭비*가 큽니다.

tiny embedded(STM32L0급)에서는 TLSF보다 *static + memory pool* 조합이 훨씬 효율적입니다. TLSF는 *수십 KB 이상 heap*을 다루는 mid-range 이상에서 진가를 발휘합니다.

## Linux SLUB와의 차이

Linux 커널의 SLUB allocator도 *size class 기반*이라는 점에서 TLSF와 닮았습니다. 하지만 SLUB는 *per-CPU cache*와 *NUMA-aware 분배*가 핵심이고, single-thread WCET 보장은 목표가 아닙니다.

TLSF는 *single-thread WCET를 수학적으로 보장*하는 것이 목표입니다. multi-core에서는 별도 lock이 필요하며, 그 lock이 또 다른 latency 변수입니다. SMP RTOS에서는 *per-core TLSF 인스턴스*를 두는 패턴이 자주 쓰입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ 작은 pool에 TLSF 적용

2 KB pool에 TLSF를 올리면 overhead가 50%를 넘습니다. *수십 KB 이상*에서만 의미가 있습니다. tiny system은 4-05의 memory pool이 답입니다.

> ⚠️ TLSF의 thread safety를 가정

`mattconte/tlsf`를 비롯한 대부분의 구현은 *thread-unsafe*입니다. 여러 task가 같은 인스턴스에 접근하면 *mutex로 직접 wrap*해야 합니다. 또는 per-thread 인스턴스를 둡니다.

> ⚠️ 같은 크기 반복 alloc/free에 TLSF

같은 크기를 계속 들고나면 coalesce가 일어날 일이 거의 없습니다. 이 워크로드는 *memory pool*이 훨씬 빠르고 단순합니다. TLSF는 *다양한 크기*가 섞일 때 진가를 발휘합니다.

> ⚠️ Cortex-M0에 TLSF 적용

CLZ 명령이 없어 software CLZ로 대체됩니다. 이러면 *한 단계가 수십 cycle*로 늘어나 O(1)의 실용적 의미가 약해집니다. M0급에서는 *static + pool*이 안전합니다.

## 정리

- TLSF는 alloc·free·coalesce 모두 *O(1) bounded*를 보장하는 dynamic allocator입니다.
- 핵심 트릭은 *two-level segregation + bitmap*이며, ARM CLZ 명령으로 적합 bucket을 1 cycle에 찾습니다.
- block header의 `prev_phys_block`으로 *인접 block에 주소 산술로 접근*하여 coalesce도 O(1)입니다.
- 단편화 상한은 *internal 6.25%, worst-case overhead 25%*로 수학적으로 보장됩니다.
- 자동차 ECU, 로봇 ROS 2, RT 게임, VxWorks 등 *bounded latency가 필요한 거의 모든 영역*에서 표준입니다.
- 메모리·코드 overhead가 약 *3 KB* 필요하므로 *tiny embedded에는 부적합*합니다.
- Cortex-M0급 또는 같은 크기 반복 워크로드는 *memory pool*이 더 적합합니다.

다음 편은 [4-04 Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)에서 *동적 할당을 완전히 배제*하는 패턴을 다룹니다.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
