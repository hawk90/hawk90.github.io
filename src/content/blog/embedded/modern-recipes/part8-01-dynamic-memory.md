---
title: "임베디드 동적 메모리 — malloc 위험·결정성·대안 분석"
slug: "embedded/modern-recipes/part8-01-dynamic-memory"
date: 2026-04-17T09:00:00
description: "Malloc의 fragmentation과 비결정성, pool/arena/slab 대안, FreeRTOS heap_4/5와 정적 대안까지 임베디드의 메모리 전략을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 89
tags: [recipes, memory, allocator]
topics: ["embedded"]
---

## 한 줄 요약

> **할당 크기·최대 동시 수·해제 시점을 먼저 정하고, 실패를 처리할 수 있는 allocator를 고릅니다.** 고정 pool도 고갈되며, O(1) 연산도 그 자체로 제품의 WCET를 보장하지 않습니다.

## 어떤 상황에서 쓰나

센서 프레임 16개를 보관하는 수신 경로와 연결 수가 달라지는 통신 서버는 같은 할당 전략을 쓸 필요가 없습니다. pool은 같은 크기 사물함을 정해진 개수만 두는 방식이고, arena는 작업이 끝날 때 작업대 전체를 비우는 방식입니다. 어느 쪽도 필요한 총용량을 알아서 늘려 주지는 않습니다.

OOM은 leak·최대 동시 수요·외부 fragmentation을 구분해서 진단합니다. 빈 주차 공간의 총합이 커도 긴 차량이 들어갈 연속 구간이 없을 수 있듯이, free heap 합계가 요청 크기보다 커도 할당은 실패합니다. 반대로 largest free block이 충분해도 alignment·metadata 비용을 포함하면 요청이 들어가지 않을 수 있습니다.

이 글은 **고정 크기 byte buffer의 대여·반납, batch 수명, 관측 항목**을 다룹니다. 일반적인 C++ 객체의 생성·소멸과 allocator 모델은 [ECPP 메모리 전략](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)에서 이어집니다. 예제의 CPU 기능 검사는 target의 ISR 안전성이나 실행 시간을 대신하지 않습니다.

## 크기와 수명으로 전략 고르기

선택 기준은 allocator 이름보다 자원 계약입니다. 특히 실패 후 데이터를 버릴지, 이전 상태를 유지할지, producer에 backpressure를 걸지 정해야 합니다.

| 알고 있는 조건 | 선택 후보 | 남는 비용과 실패 |
|---|---|---|
| 객체 수와 수명이 고정됨 | static 객체·배열 | 정적 RAM·stack 예산 초과, 내부 객체의 별도 할당 |
| 크기와 최대 동시 수가 고정됨 | 고정 block pool | 고갈·내부 여유 공간·metadata·경합 |
| 여러 할당을 한 batch로 폐기함 | arena | 정렬 낭비·고갈·reset 뒤 참조 무효화 |
| 반복되는 여러 객체 종류가 있음 | 크기별 pool·slab 계열 cache | 크기 class 사이 불균형·캐시 보유량 |
| 크기가 가변이고 개별 해제가 필요함 | heap_4/5·TLSF 등 | 구현별 metadata·동기화·fragmentation |

고정 block pool은 block을 더 작은 조각으로 쪼개지 않아 그 pool 내부의 외부 fragmentation을 피합니다. 256-byte block에 20 byte를 넣는 내부 낭비와 비어 있는 다른 크기 pool의 용량을 빌릴 수 없는 문제는 남습니다.

## 고정 byte pool: 실패와 잘못된 반납 처리

다음은 FreeRTOS task 문맥에서 사용하는 C11 예제입니다. `portMUX_TYPE`은 ESP-IDF 계열 port의 API이므로 일반 FreeRTOS 예제에 섞지 않고 `taskENTER_CRITICAL()`/`taskEXIT_CRITICAL()`을 사용합니다. 실제 exclusion 범위는 사용하는 port와 interrupt 우선순위 계약을 따릅니다.

```c title="byte-pool.c"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdalign.h>
#include "FreeRTOS.h"
#include "task.h"

enum { POOL_N = 16, BLOCK_SZ = 256 };
alignas(max_align_t) static unsigned char pool_buf[POOL_N][BLOCK_SZ];
static bool pool_used[POOL_N];
_Static_assert(BLOCK_SZ % alignof(max_align_t) == 0, "block stride alignment");

void *pool_alloc(void) {
    void *result = NULL;
    taskENTER_CRITICAL();
    for (size_t i = 0; i < POOL_N; ++i) {
        if (!pool_used[i]) {
            pool_used[i] = true;
            result = pool_buf[i];
            break;
        }
    }
    taskEXIT_CRITICAL();
    return result;
}

bool pool_free(void *p) {
    bool released = false;
    taskENTER_CRITICAL();
    for (size_t i = 0; i < POOL_N; ++i) {
        if (p == (void *)pool_buf[i]) {
            released = pool_used[i];
            pool_used[i] = false;
            break;
        }
    }
    taskEXIT_CRITICAL();
    return released;
}
```

`pool_alloc`은 고갈 시 NULL, `pool_free`는 NULL·다른 객체의 주소·block 내부 주소·이미 반납한 block에 false를 반환합니다. 서로 다른 객체의 포인터를 빼서 index를 만드는 코드는 사용하지 않습니다. 포인터 뺄셈은 같은 배열 객체 안이라는 전제가 필요하기 때문입니다.

두 연산 모두 최대 `POOL_N`개를 확인하는 O(N) 구현입니다. critical section 안의 scan도 지연 예산에 포함합니다. 이 코드는 byte 저장소이며 임의 C/C++ 객체의 생성 API가 아닙니다. 초기화된 typed 객체가 필요하면 타입별 배열 또는 생성·소멸을 관리하는 [객체 pool](/blog/embedded/embedded-cpp/part3-03-pool-allocator)을 사용합니다.

포인터 주소만으로 대여 세대를 구별할 수는 없습니다. A가 block을 반납하고 B가 재대여한 뒤 A의 오래된 포인터로 반납하면 B의 대여를 취소할 수 있습니다. 호출자는 반납 뒤 포인터를 사용하지 않아야 하며, 이 계약을 검증해야 하는 경계에는 generation을 포함한 handle을 설계합니다. ISR에서는 이 task용 API를 호출하지 않습니다.

## Arena: 정렬과 overflow를 함께 검사하기

한 번의 프레임 처리에서 만들어진 임시 데이터가 모두 같은 시점에 사라진다면 개별 free가 필요하지 않습니다. arena는 작업대의 다음 빈 위치를 이동시키지만, 시작 주소 정렬과 덧셈 overflow까지 확인해야 안전합니다.

```c title="byte-arena.c"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdalign.h>

typedef struct {
    unsigned char *base;
    size_t cap, off;
} arena_t;

bool arena_init(arena_t *a, void *mem, size_t cap) {
    if (!a || !mem || (uintptr_t)mem % alignof(max_align_t) != 0)
        return false;
    *a = (arena_t){ .base = mem, .cap = cap, .off = 0 };
    return true;
}

void *arena_alloc(arena_t *a, size_t n) {
    const size_t mask = alignof(max_align_t) - 1;
    if (!a || !a->base || n == 0 || a->off > a->cap ||
        a->off % alignof(max_align_t) != 0 || n > SIZE_MAX - mask)
        return NULL;
    const size_t rounded = (n + mask) & ~mask;
    if (rounded > a->cap - a->off) return NULL;
    void *result = a->base + a->off;
    a->off += rounded;
    return result;
}

void arena_reset(arena_t *a) { if (a) a->off = 0; }
```

호출자는 살아 있는 배열과 실제 용량을 전달합니다. 다음은 저장소를 함께 준비하는 예입니다.

```c title="arena-storage.c"
alignas(max_align_t) static unsigned char scratch[1024];
static arena_t request_arena;

bool init_request_arena(void) {
    return arena_init(&request_arena, scratch, sizeof(scratch));
}
```

호출자는 `cap` byte 이상인 하나의 살아 있는 저장소를 전달하고 `arena_t`의 필드를 임의로 바꾸지 않습니다. 이 구현은 해당 C 구현의 `max_align_t`까지만 정렬하며 over-aligned 타입·특정 DMA 접근 가능 영역을 보장하지 않습니다. 저장소가 선언된 byte 배열인 이 예제는 byte 처리용이며 typed 객체의 유효 타입·수명은 별도 계약입니다.

실패 시 offset은 그대로입니다. `arena_reset`은 offset만 돌리며 내용을 지우거나 C++ 소멸자를 호출하지 않습니다. reset 전에 batch의 비동기 전송과 모든 참조 사용이 끝나야 합니다. 재사용된 주소의 과거 포인터는 새 대여 권한을 뜻하지 않습니다. arena는 단일 owner가 쓰며 공유하려면 전체 할당/reset 계약을 직렬화합니다.

## FreeRTOS 정적 객체와 heap 구현 구분

RTOS 객체를 정적으로 만들면 해당 객체의 저장소 출처를 통제할 수 있습니다. 이것만으로 애플리케이션의 libc·C++·통신 라이브러리까지 무할당이 되지는 않습니다.

아래 예제는 `configSUPPORT_STATIC_ALLOCATION == 1`인 FreeRTOS V11.2.0에서 64개 값의 queue 저장소를 제공합니다.

```c title="static-queue.c"
#include <stdint.h>
#include <stdbool.h>
#include "FreeRTOS.h"
#include "queue.h"

typedef struct { uint32_t sequence; uint16_t value; } item_t;
static StaticQueue_t q_control;
static uint8_t q_storage[64 * sizeof(item_t)];
static QueueHandle_t q;

bool init_queue(void) {
    q = xQueueCreateStatic(64, sizeof(item_t), q_storage, &q_control);
    return q != NULL;
}
```

저장소와 control block은 queue 사용이 끝날 때까지 살아 있어야 하며, 위 초기화는 한 번만 수행합니다. queue는 `sizeof(item_t)` byte를 복사하며 C++ 생성자를 호출하지 않습니다. 포인터를 원소에 넣으면 pointee 수명은 별도로 관리합니다.

FreeRTOS의 heap 선택지는 다음과 같습니다. `heap_5`의 여러 region은 자동으로 DMA 접근성이나 cache 속성에 맞는 region을 골라 주는 기능이 아닙니다.

| 구현 | 할당·해제 방식 | 설계에서 확인할 점 |
|---|---|---|
| heap_1 | bump 할당, 개별 free 없음 | 누적 수요와 정렬·metadata 예산 |
| heap_2 | free 가능, 인접 free block 병합 없음 | 외부 fragmentation |
| heap_3 | libc malloc/free 위임 | 실제 libc 구현과 RTOS 연동 |
| heap_4 | free list 탐색과 인접 block 병합 | 최악 scan 길이·고갈·경합 |
| heap_5 | 여러 region에 heap_4 계열 방식 적용 | region 순서·초기화·영역별 접근 제약 |

[FreeRTOS V11.2.0 heap_4.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/MemMang/heap_4.c)의 block header 크기는 `sizeof(BlockLink_t)`와 `portBYTE_ALIGNMENT`로 계산됩니다. 이를 모든 target에서 16 byte라고 고정하면 안 됩니다. 주소 정렬, 요청 반올림, 분할되지 않는 작은 잔여 공간도 실제 RAM 비용에 포함됩니다.

## Slab 계열과 TLSF를 선택할 때

같은 타입을 반복 생성하는 cache는 같은 규격의 재사용 상자를 쌓아 두는 방식입니다. free list의 맨 앞만 떼고 붙이는 고정 pool은 O(1) bookkeeping을 만들 수 있지만, 올바른 block만 한 번 반납한다는 계약과 초기화·alignment 검사가 필요합니다. 메모리를 반환한 뒤 free-list link를 payload로 덮어쓰지 않도록 수명도 분리해야 합니다. Linux slab은 여기에 객체 cache·크기 class·동시성 등 별도 설계가 더해진 구현이며 단순 연결 리스트와 동일하지 않습니다.

TLSF는 크기 class와 bitmap을 사용하는 가변 크기 allocator입니다. 다음은 [mattconte/tlsf 3.1](https://github.com/mattconte/tlsf/tree/deff9ab509341f264addbd3c8ada533678591905)의 API를 사용하는 단일 문맥 예제입니다. 고정 64 KiB 저장소는 해당 구현의 control·pool metadata를 포함하며 모두 payload가 되지는 않습니다.

```c title="tlsf-storage.c"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdalign.h>
#include "tlsf.h"

alignas(max_align_t) static unsigned char tlsf_mem[64 * 1024];
static tlsf_t allocator;

bool init_allocator(void) {
    if ((uintptr_t)tlsf_mem % tlsf_align_size() != 0) return false;
    allocator = tlsf_create_with_pool(tlsf_mem, sizeof(tlsf_mem));
    return allocator != NULL;
}

void *my_malloc(size_t n) {
    return allocator && n != 0 ? tlsf_malloc(allocator, n) : NULL;
}
void my_free(void *p) { if (allocator && p) tlsf_free(allocator, p); }
```

초기화는 한 번만 하며 `my_free`에는 이 allocator에서 받은 아직 살아 있는 포인터만 전달합니다. 이 구현은 자체 thread safety를 제공하지 않으므로 여러 task가 공유하면 외부 동기화가 필요합니다. 알고리즘의 bounded bookkeeping과 CPU의 메모리 지연·lock 대기·interrupt를 포함하는 WCET는 구분합니다. 특정 allocator가 가장 빠르거나 fragmentation이 항상 낮다는 비교는 여기서 하지 않습니다.

## 통계는 할당과 해제를 한 쌍으로 기록하기

할당 때만 `used += n`을 하고 free에서 빼지 않으면 현재 사용량이 아니라 누적 요청량입니다. 다음은 metadata에 요청 크기를 저장해 짝을 맞추는 단일 문맥 예제입니다. 실제 malloc이 사용하는 header·정렬 여유는 이 카운터에 포함하지 않습니다.

```c title="tracked-allocation.c"
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

typedef union {
    struct { size_t requested; } info;
    max_align_t alignment;
} tracked_header;
typedef struct { size_t used, peak, fail; } heap_stats_t;
static heap_stats_t g_heap;

static void record_failure(void) {
    if (g_heap.fail != SIZE_MAX) ++g_heap.fail;
}
void *tracked_malloc(size_t n) {
    if (n == 0 || n > SIZE_MAX - sizeof(tracked_header) ||
        n > SIZE_MAX - g_heap.used) {
        record_failure();
        return NULL;
    }
    tracked_header *h = malloc(sizeof(*h) + n);
    if (!h) { record_failure(); return NULL; }
    h->info.requested = n;
    g_heap.used += n;
    if (g_heap.used > g_heap.peak) g_heap.peak = g_heap.used;
    return h + 1;
}
void tracked_free(void *p) {
    if (!p) return;
    tracked_header *h = (tracked_header *)p - 1;
    g_heap.used -= h->info.requested;
    free(h);
}
```

`tracked_free`도 표준 free처럼 동일 API의 살아 있는 포인터만 한 번 받습니다. handle을 복제하거나 다른 allocator와 섞지 않습니다. 공유하려면 allocator 호출과 통계 갱신 전체를 일관되게 보호해야 합니다. 요청별 counter나 통계 전송을 추가하면 그 비용도 실시간 경로의 일부가 됩니다.

FreeRTOS heap_4/5에서는 `vPortGetHeapStats`의 현재 free 합계·largest free block·free block 수와 최소 free 이력을 함께 봅니다. largest free block 값은 allocator의 block accounting 값이며 같은 크기 payload 요청이 반드시 성공한다는 보장은 아닙니다. 실패 크기·발생 문맥·동시 대여 수·반납 누락 기록을 함께 남기면 leak와 fragmentation을 구분하기 쉽습니다.

## 보드 없이 확인할 항목과 제품 측정

검사는 먼저 계산과 상태 전이부터 확인합니다. 빈 pool, 모두 대여한 pool, 반납 후 재사용, 잘못된 반납, arena의 경계·overflow·reset, 요청량 통계의 alloc/free 대칭을 본문 코드에서 재현할 수 있습니다.

| 항목 | 코드·소스로 확인하는 내용 | 제품에서 추가할 측정 |
|---|---|---|
| pool | 최대 16개·정렬·반납 검증·O(N) scan | 실제 critical section 지연·producer 고갈 정책 |
| arena | 반올림·잔여 용량·실패 후 offset 유지 | batch 최대 수요·비동기 사용 종료 |
| heap_4/5 | free list·병합·region 계약 | 최악 할당/해제 시간·실제 부하의 고갈 |
| TLSF | 실제 API 초기화·고갈·반납·재사용 | 외부 lock 대기·cache/bus 포함 지연 |
| 통계 | 요청량과 실제 heap 점유의 구분 | 계측 비용·최대 동시 수요·관측 손실 |

이 장의 검증은 실행 시간 수치를 만들지 않습니다. 고정 pool의 metadata도 `sizeof(pool_used)`만큼 존재하며 alignment 여유와 저장소 자체를 포함해 예산을 계산합니다. static으로 옮긴 자원은 heap 대신 정적 RAM을 차지합니다.

### 이번 예제 검증 결과

Clang 23.1.6의 ASan/UBSan 기능 검사에서 pool 고갈·재사용과 잘못된 반납 거부, arena의 정렬·경계·SIZE_MAX 거부·reset, 요청량 통계의 해제 반영을 확인했습니다. 실제 TLSF 3.1 구현(commit `deff9ab509341f264addbd3c8ada533678591905`)으로 정렬·고갈·반납 후 큰 요청의 재사용과 내부 일관성 검사를 통과했습니다.

FreeRTOS V11.2.0 heap_4에서는 512-byte 요청으로 채운 뒤 교대로 반납해, free 합계가 1024 byte보다 큰데도 1024-byte 요청이 실패하는 경우를 재현했습니다. 나머지를 반납하면 largest block과 free 합계가 원래 값으로 돌아오는 것도 확인했습니다. 이 host 검사는 scheduler/critical-section stub을 사용하는 단일 호출자 검사이며 실제 port의 동시성·ISR 안전성은 검사하지 않았습니다. 정적 queue 예제는 실제 FreeRTOS 헤더와 ARM_CM4F port로 Cortex-M4 object까지 컴파일했습니다.

## 자주 보는 함정

- **ISR에서 일반 allocator 호출:** task용 allocator나 위 critical-section API를 ISR에서 사용하지 않습니다. preallocated pool도 해당 ISR·task의 동시 접근을 지원하는 별도 계약이 있어야 합니다.
- **큰 free 합계만 보고 성공 가정:** header·alignment·연속 공간과 실패 당시 상태를 함께 봅니다.
- **size_t로 cast하면 안전하다는 가정:** 음수를 먼저 거부하고, 곱셈 전 `count > SIZE_MAX / element_size`를 검사합니다. unsigned 타입도 overflow·underflow를 막아 주지 않습니다.
- **reset 뒤 참조 사용:** arena의 메모리가 남아 있어도 과거 대여는 끝났습니다. DMA·callback이 완료된 뒤 reset합니다.
- **정적 queue로 바꾸면 시스템 heap 0:** 해당 queue의 저장소만 정적으로 바뀝니다. 내부 라이브러리와 다른 객체의 allocation 경로를 따로 조사합니다.

## 정리

- 크기·최대 동시 수·개별 해제 여부로 allocator를 선택합니다.
- pool은 고갈·내부 낭비·잘못된 반납과 오래된 대여를 다룹니다.
- arena는 정렬·덧셈 overflow·잔여 용량을 검사하고 batch 종료 뒤 reset합니다.
- FreeRTOS heap_4/5의 metadata와 scan은 실제 port·구현을 기준으로 계산합니다.
- TLSF의 알고리즘 계약과 동기화·하드웨어를 포함한 WCET를 구분합니다.
- 현재 요청량은 해제 때 감소시켜야 하며, free 합계·largest block·실패 요청도 함께 봅니다.

다음 편은 **메모리 정렬과 패딩**입니다. 같은 저장소라도 타입·ABI·접근 방법에 따라 달라지는 조건을 다룹니다.

## 관련 항목

- [PRTOS 4-01: Real-time Memory](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [PRTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [PRTOS 4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [PRTOS 4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [PRTOS 4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [8-02: 메모리 정렬](/blog/embedded/modern-recipes/part8-02-memory-alignment)

## 1차 자료

- [C11 draft N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf), §6.2.8·6.5·6.5.6·7.22.3: 정렬·유효 타입·포인터 연산·할당 계약입니다.
- [FreeRTOS V11.2.0 heap_4](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/MemMang/heap_4.c), [heap_5](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/MemMang/heap_5.c): metadata·탐색·병합·통계 구현입니다.
- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): 정적 queue 저장소와 byte-copy 계약입니다.
- [mattconte/tlsf 3.1](https://github.com/mattconte/tlsf/tree/deff9ab509341f264addbd3c8ada533678591905): 이 장이 사용하는 C API·alignment와 thread-safety 계약의 구현입니다.
