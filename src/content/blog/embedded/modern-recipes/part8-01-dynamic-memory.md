---
title: "8-01: 동적 메모리 (malloc 위험·대안)"
date: 2026-05-15T17:00:00
description: "Malloc의 fragmentation과 비결정성, pool/arena/slab 대안, FreeRTOS heap_4/5와 정적 대안까지 임베디드의 메모리 전략을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 89
tags: [recipes, memory, allocator]
---

## 한 줄 요약

> **"임베디드에서 `malloc`은 *피하라*가 기본 규칙입니다."** 대신 pool, arena, slab, static 중에 *알 수 있는 패턴*에 맞는 것을 고릅니다.

## 어떤 상황에서 쓰나

양산 firmware가 며칠을 돌면 OOM으로 reboot 되는 사고는 거의 모두 heap fragmentation입니다. 처음에는 16 KB free heap이 충분해 보이지만, 작은 chunk가 산발적으로 free되면 큰 contiguous 영역이 사라져 1 KB malloc이 실패합니다.

또 한 가지 상황은 hard real-time입니다. 일반 malloc은 worst-case가 free list 길이에 비례하므로 한 호출에 수십 µs 이상 걸릴 수 있습니다. Control loop 안에서 이런 비결정성은 받아들이기 어렵습니다.

## 핵심 개념

```text
malloc 문제
- 비결정성     free list scan, coalesce, fragmentation 처리
- fragmentation 사용 가능 메모리가 작은 hole로 흩어짐
- 실패 처리    NULL 반환을 모든 호출자가 처리해야 함

대안
- static       모든 자원을 컴파일 시 결정 — 0 byte heap
- pool         같은 크기 N개 — fragmentation 0
- arena        한 lifetime에 묶인 군집 — 한 번에 reset
- slab         OS 커널식 — 같은 size 캐싱
```

각 대안의 적합한 상황입니다.

| 패턴 | 알 수 있는 것 | 추천 allocator |
|---|---|---|
| 모두 컴파일 타임 | 모든 객체 수 | static |
| 같은 크기, 동적 수 | 크기 = 하나 | pool |
| 일시적 작업의 묶음 | lifetime이 같은 단위 | arena |
| 종류 많고 크기 다양 | 크기마다 빈도가 다름 | slab + cache |

## 코드 / 실제 사용 예

### Pool allocator (FreeRTOS style)

```c
#define POOL_N    16
#define BLOCK_SZ  256

static uint8_t pool_buf[POOL_N][BLOCK_SZ];
static uint8_t pool_used[POOL_N];
static portMUX_TYPE pool_lock = portMUX_INITIALIZER_UNLOCKED;

void *pool_alloc(void) {
    void *p = NULL;
    portENTER_CRITICAL(&pool_lock);
    for (int i = 0; i < POOL_N; i++) {
        if (!pool_used[i]) {
            pool_used[i] = 1;
            p = pool_buf[i];
            break;
        }
    }
    portEXIT_CRITICAL(&pool_lock);
    return p;
}

void pool_free(void *p) {
    int idx = ((uint8_t *)p - (uint8_t *)pool_buf) / BLOCK_SZ;
    portENTER_CRITICAL(&pool_lock);
    pool_used[idx] = 0;
    portEXIT_CRITICAL(&pool_lock);
}
```

크기 256 byte짜리 chunk 16개의 pool입니다. fragmentation이 0이고 alloc/free가 상수 시간입니다.

### Arena (linear allocator)

```c
typedef struct {
    uint8_t *base;
    size_t   cap;
    size_t   off;
} arena_t;

void *arena_alloc(arena_t *a, size_t n) {
    n = (n + 7) & ~7;       /* 8-byte 정렬 */
    if (a->off + n > a->cap) return NULL;
    void *p = a->base + a->off;
    a->off += n;
    return p;
}

void arena_reset(arena_t *a) { a->off = 0; }
```

한 작업 단위(예: HTTP request 처리)가 끝나면 `arena_reset` 한 번으로 모든 할당이 사라집니다. free 호출이 없어 가장 빠릅니다.

### Static 변종 (RTOS)

```c
static StaticQueue_t  q_buf;
static uint8_t        q_storage[64 * sizeof(item_t)];
QueueHandle_t q;

void init(void) {
    q = xQueueCreateStatic(64, sizeof(item_t), q_storage, &q_buf);
}
```

FreeRTOS의 모든 객체는 `*Static` 변종이 있습니다. 양산 firmware에서 heap 사용량을 0으로 만들 수 있습니다.

### FreeRTOS heap_4 / heap_5

| heap_1 | 할당만 가능, free 불가 — 가장 단순 |
|---|---|
| heap_2 | 할당과 free 가능, coalesce 없음 — fragmentation 심함 |
| heap_3 | 표준 malloc/free — 비결정적 |
| heap_4 | 할당, free, coalesce — 일반적 선택 |
| heap_5 | heap_4 + 여러 region (DTCM, SRAM, SDRAM 등) |

작은 device는 보통 heap_4를 쓰지만, 양산 firmware에서는 가능한 한 static + pool로 옮깁니다.

### Slab-like cache

```c
typedef struct slab {
    void *free_list;
    void *blocks;
    size_t block_sz, n;
} slab_t;

void slab_init(slab_t *s, void *mem, size_t n, size_t sz) {
    s->blocks = mem;
    s->free_list = mem;
    s->block_sz = sz;
    s->n = n;
    for (size_t i = 0; i < n - 1; i++)
        *(void **)((char *)mem + i * sz) = (char *)mem + (i + 1) * sz;
    *(void **)((char *)mem + (n - 1) * sz) = NULL;
}

void *slab_alloc(slab_t *s) {
    void *p = s->free_list;
    if (p) s->free_list = *(void **)p;
    return p;
}

void slab_free(slab_t *s, void *p) {
    *(void **)p = s->free_list;
    s->free_list = p;
}
```

free list를 linked list로 들고 있어 alloc/free가 O(1)입니다. Linux kernel slab allocator의 단순화 버전입니다.

### Two-Level Segregated Fit (TLSF)

```c
/* general-purpose 실시간 allocator
   alloc/free O(1) worst-case, fragmentation 매우 낮음
   embedded에서 heap_4를 대체하는 가장 인기 있는 선택 */

#include "tlsf.h"
static uint8_t pool_buf[64 * 1024];
tlsf_t tlsf;

void init(void) {
    tlsf = tlsf_create_with_pool(pool_buf, sizeof(pool_buf));
}

void *my_malloc(size_t n) { return tlsf_malloc(tlsf, n); }
void  my_free(void *p)    { tlsf_free(tlsf, p); }
```

TLSF는 free list를 size class로 나눠 worst-case가 상수입니다. 가변 크기 할당이 꼭 필요할 때의 표준 선택입니다.

### Statistics와 모니터링

```c
typedef struct { size_t used, peak, fail; } heap_stats_t;
heap_stats_t g_heap;

void *tracked_malloc(size_t n) {
    void *p = malloc(n);
    if (!p) { g_heap.fail++; return NULL; }
    g_heap.used += n;
    if (g_heap.used > g_heap.peak) g_heap.peak = g_heap.used;
    return p;
}
```

부팅 후 peak 사용량을 봐야 size를 결정할 수 있습니다. 양산 telemetry로 항상 보내두는 것이 안전합니다.

## 측정 / 성능 비교

```text
allocator                alloc time       free time      fragmentation
static + pool            O(1) ~50 ns      O(1) ~30 ns    0
arena                    O(1) ~20 ns      n/a            전체 reset만
FreeRTOS heap_4          O(N) 0.5~5 µs    O(N) 1~10 µs   중간
TLSF                     O(1) ~200 ns     O(1) ~150 ns   매우 낮음
newlib malloc            가변, 길어질 수 있음            높음
```

실시간 control loop에서는 TLSF 이상이거나 static + pool이 안전합니다.

```text
RAM 사용량
heap_4 overhead per block    ~16 B
TLSF overhead per block      ~8~16 B
pool overhead per block      0 (free list 외 자체 없음)
```

## 자주 보는 함정

> 부팅 후 OOM

```text
malloc failed: free=12 KB but no contiguous 1 KB
```

free heap 숫자만 보면 충분해 보이지만 fragmentation으로 큰 블록을 못 잡습니다. `xPortGetMinimumEverFreeHeapSize`보다 *largest free block*을 추적합니다.

> Cleanup 누락

```c
buf = malloc(...);
if (err) return -1;     /* buf leak */
```

C에서는 error path마다 free를 명시해야 합니다. `goto cleanup` 패턴 또는 RAII(C++)를 사용합니다.

> ISR에서 malloc

```c
void IRQ(void) { p = malloc(64); }
```

`malloc`은 critical section을 잡으므로 ISR에서 호출하면 deadlock 위험이 있습니다. ISR에서는 pre-allocated pool에서만 가져옵니다.

> 잘못된 크기 가정

```c
p = malloc(N);    /* N이 0 또는 음수 cast 결과인 경우 */
```

`size_t`로 모든 size를 통일하고 cast를 명시합니다. unsigned underflow가 가장 흔한 사고입니다.

> Static 변종을 안 씀

```c
QueueHandle_t q = xQueueCreate(64, sizeof(item_t));   /* heap에서 */
```

양산은 static 변종으로 옮겨 heap 사용량을 0으로 만듭니다. fragmentation 사고 자체가 사라집니다.

## 정리

- 임베디드에서 `malloc`은 피하라가 기본 규칙입니다.
- Pool은 같은 크기, arena는 같은 lifetime, static은 컴파일 타임 결정에 씁니다.
- FreeRTOS heap_4는 일반적이지만 fragmentation에 시달립니다.
- TLSF는 O(1) worst-case 실시간 allocator의 표준 선택입니다.
- 통계는 free heap이 아니라 largest free block을 추적합니다.
- ISR에서 malloc은 금지. pre-allocated pool에서만 가져옵니다.
- 양산 firmware는 모든 RTOS 객체를 `*Static` 변종으로 옮깁니다.

다음 편은 **메모리 정렬과 패딩**입니다. natural alignment, struct padding, packed의 함정을 다룹니다.

## 관련 항목

- [PRTOS 4-01: Real-time Memory](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [PRTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [PRTOS 4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [PRTOS 4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [PRTOS 4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [ECPP 3-01: No Dynamic Alloc](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [8-02: 메모리 정렬](/blog/embedded/modern-recipes/part8-02-memory-alignment)
