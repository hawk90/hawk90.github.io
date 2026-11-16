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

> **"임베디드에서 범용 `malloc`은 *피하라*가 기본 규칙입니다."** 대신 static, pool, arena, slab 중 *미리 알 수 있는 패턴*에 맞는 것을 고릅니다. 이 글은 다섯 가지 allocator를 FreeRTOS V11.2.0 위에서 한 프로그램으로 돌려, 한 번 할당하는 비용과 단편화가 쌓일 때의 비용이 어떻게 갈리는지 직접 봅니다.

## 어떤 상황에서 쓰나

양산 firmware가 며칠 돌다 할당에 실패했다면 원인은 하나가 아닙니다. 누수(leak), 순간 최대 수요(peak), 그리고 남은 총량은 충분한데 연속된 빈 영역이 없는 단편화가 모두 같은 증상을 냅니다. [6-12](/blog/embedded/modern-recipes/part6-12-rtos-debugging)의 실행에서 heap_4는 28,168 B가 비어 있는데도 1 KiB 할당에 실패했습니다.

또 하나는 실행 시간입니다. 범용 allocator는 빈 블록 목록을 훑으므로, 한 번의 호출 비용이 그때까지 쌓인 빈 블록 수에 따라 달라집니다. 제어 루프 안에서는 "평균"이 아니라 "최악"이 문제이므로, 이 비용이 무엇에 비례하는지 알아야 allocator를 고를 수 있습니다. 아래 측정이 그 비례 관계를 보여 줍니다.

## 핵심 개념

범용 `malloc`이 만드는 문제는 세 가지입니다.

- **실행 시간의 변동** — free list를 훑고, 쪼개고, 합치는 비용이 heap 상태에 따라 달라집니다.
- **단편화** — 빈 공간이 작은 구멍으로 흩어져, 총량이 충분해도 큰 요청이 실패합니다.
- **실패 처리** — NULL 반환을 모든 호출자가 처리해야 합니다.

대안은 무엇을 미리 아느냐에 따라 갈립니다. 식당에 비유하면 static은 모든 손님의 좌석을 개업 전에 지정하는 것이고, pool은 같은 크기의 2인석만 여러 개 두는 것, arena는 단체 손님에게 한 구역을 통째로 내주고 나갈 때 구역째 치우는 것입니다.

| 미리 아는 것 | 대안 | 할당 | 해제 | 단편화 |
| --- | --- | --- | --- | --- |
| 객체 수 전부 | static (`*Static` API, 전역 배열) | 컴파일 시 | 없음 | 없음 |
| 크기가 하나 | pool, free-list cache(slab 형태) | 빈 칸 하나 꺼냄 | 칸 하나 반납 | 외부 단편화 없음 |
| lifetime이 같은 묶음 | arena | 포인터 전진 | 묶음 전체 reset | reset 전까지 회수 없음 |
| 크기가 다양함 | heap_4, TLSF 같은 범용 allocator | 탐색 | 병합 | workload 의존 |

## 코드 / 실제 사용 예

아래 블록들을 순서대로 이어 붙이면 이 글에서 돌린 `allocbench.c` 한 파일이 됩니다. 빌드 명령과 하네스는 맨 뒤 [재현 환경](#재현-환경)에 있습니다.

### 공통 머리말

측정 시계는 `mps2-an385`의 CMSDK TIMER0(25 MHz)입니다. QEMU를 `-icount shift=0`으로 돌리면 guest 명령 하나가 가상 시간 2^0 = 1 ns로 계산되므로(QEMU v11.1.0 `qemu-options.hx`의 `-icount` 설명: "The virtual cpu will execute one instruction every 2^N ns of virtual time", 같은 절에 "it does not provide cycle accurate emulation"이라는 경고도 있습니다), TIMER0 한 tick(40 ns)은 guest 명령 40개에 해당합니다. 그래서 아래 숫자는 **사이클이 아니라 QEMU가 센 명령 수**이고, 해상도는 40 명령입니다.

```c
#include <stdint.h>
#include <stddef.h>
#include "FreeRTOS.h"
#include "task.h"
#include "tlsf.h"

void pr(const char *fmt, ...);
void hosted_exit(int code);
void vApplicationStackOverflowHook(TaskHandle_t t, char *n) { (void)t; pr("overflow %s\n", n); hosted_exit(1); }
void vApplicationMallocFailedHook(void) { }

/* 25 MHz CMSDK TIMER0 ticks; with -icount shift=0 one tick = 40 guest instructions */
#define NOW() ((uint32_t)portGET_RUN_TIME_COUNTER_VALUE())
```

### Pool allocator (vanilla FreeRTOS)

같은 크기 블록 16개를 배열로 잡고, 사용 여부를 byte 하나로 표시합니다. 보호는 vanilla FreeRTOS의 `taskENTER_CRITICAL()`로 합니다. ESP-IDF의 `portMUX_TYPE`·`portENTER_CRITICAL(&mux)`는 ESP-IDF 포트의 확장이라 FreeRTOS-Kernel 포트에는 없습니다. `pool_free`는 포인터가 이 pool의 블록 경계인지 먼저 확인합니다.

```c
/* ---- fixed-size pool, vanilla FreeRTOS critical section ---- */
#define POOL_N   16
#define BLOCK_SZ 256
static uint8_t pool_buf[POOL_N][BLOCK_SZ] __attribute__((aligned(8)));
static uint8_t pool_used[POOL_N];

void *pool_alloc(void)
{
    void *p = NULL;
    taskENTER_CRITICAL();
    for (int i = 0; i < POOL_N; i++) {
        if (!pool_used[i]) { pool_used[i] = 1; p = pool_buf[i]; break; }
    }
    taskEXIT_CRITICAL();
    return p;
}

int pool_free(void *p)
{
    uintptr_t off = (uintptr_t)p - (uintptr_t)pool_buf;
    if (off >= sizeof pool_buf || off % BLOCK_SZ) return -1;   /* not ours */
    taskENTER_CRITICAL();
    pool_used[off / BLOCK_SZ] = 0;
    taskEXIT_CRITICAL();
    return 0;
}
```

빈 칸을 앞에서부터 찾으므로 할당 비용은 앞쪽에 쌓인 사용 중 블록 수에 비례합니다. 블록 수가 많아지면 아래 free-list 방식이 탐색을 없앱니다.

### Arena (linear allocator)

```c
/* ---- arena ---- */
typedef struct { uint8_t *base; size_t cap, off; } arena_t;

void *arena_alloc(arena_t *a, size_t n)
{
    n = (n + 7) & ~(size_t)7;                /* 8-byte alignment */
    if (n > a->cap - a->off) return NULL;    /* no overflow in a->off + n */
    void *p = a->base + a->off;
    a->off += n;
    return p;
}
void arena_reset(arena_t *a) { a->off = 0; }
```

한 작업 단위(예: 패킷 하나의 파싱)가 끝나면 `arena_reset` 한 번으로 모든 할당이 사라집니다. 범위 검사를 `a->off + n > a->cap` 대신 `n > a->cap - a->off`로 쓴 것은 `n`이 매우 클 때 덧셈이 넘쳐 검사를 통과하는 일을 막기 위해서입니다.

### Free-list cache (slab 형태)

빈 블록의 첫 word에 다음 빈 블록의 주소를 적어, 별도 관리 배열 없이 free list를 만듭니다. Linux SLUB도 빈 object를 slab 안의 freelist로 잇습니다(v6.12 `mm/slub.c` 73행 주석: "slab->freelist -> List of free objects in a slab"). 블록 크기는 포인터 크기 이상이어야 합니다.

```c
/* ---- free-list cache of one block size ---- */
typedef struct { void *free_list; } slab_t;

void slab_init(slab_t *s, void *mem, size_t n, size_t sz)   /* sz >= sizeof(void *) */
{
    for (size_t i = 0; i + 1 < n; i++)
        *(void **)((char *)mem + i * sz) = (char *)mem + (i + 1) * sz;
    *(void **)((char *)mem + (n - 1) * sz) = NULL;
    s->free_list = mem;
}
void *slab_alloc(slab_t *s) { void *p = s->free_list; if (p) s->free_list = *(void **)p; return p; }
void slab_free(slab_t *s, void *p) { *(void **)p = s->free_list; s->free_list = p; }
```

이 코드에는 lock이 없습니다. 여러 task가 쓰면 pool처럼 critical section으로 감싸거나 task마다 따로 둡니다.

### FreeRTOS heap_1~heap_5

FreeRTOS-Kernel V11.2.0 `portable/MemMang/` 각 파일의 머리 주석이 정의하는 차이입니다.

| 파일 | 머리 주석이 말하는 동작 |
| --- | --- |
| heap_1 | "does NOT allow allocated memory to be freed again" |
| heap_2 | 해제는 되지만 "does not combine adjacent free blocks ... (and so will fragment memory)" |
| heap_3 | "relies on the compilers own malloc() and free() implementations" |
| heap_4 | 해제할 때 "combines (coalescences) adjacent memory blocks" |
| heap_5 | heap_4처럼 병합하면서 "across multiple non-contiguous blocks"에 heap을 둠. `vPortDefineHeapRegions()`를 `pvPortMalloc()`보다 먼저 불러야 함 |

heap_4·heap_5의 블록 헤더 `BlockLink_t`는 다음 빈 블록 포인터와 크기 두 필드입니다(`heap_4.c:100-104`). 32비트 Cortex-M에서는 8 B이고, 요청 크기에 이 헤더를 더해 `portBYTE_ALIGNMENT`(8)로 올립니다. 그래서 100 B 요청은 112 B를 씁니다([PRTOS 4-02](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)의 실행과 같은 값입니다).

### Static 변종

`xQueueCreate`는 queue 구조체와 저장 영역을 heap에서 가져오고, `xQueueCreateStatic`은 호출자가 준 두 버퍼를 씁니다. 이 차이를 heap 감소량으로 확인하는 코드는 아래 `static_vs_dynamic()`에 있고, 결과는 [측정](#측정--성능-비교) 절에 있습니다. `configSUPPORT_STATIC_ALLOCATION 1`이 필요하고, idle·timer task의 static 메모리를 직접 주지 않으려면 V11.2.0의 `configKERNEL_PROVIDED_STATIC_MEMORY 1`을 함께 켭니다(`FreeRTOS.h:2824-2825`).

### TLSF (Two-Level Segregated Fit)

크기가 다양한데 탐색 시간을 빈 블록 수와 떼어 놓고 싶을 때 TLSF를 씁니다. 이 글은 mattconte/tlsf commit `deff9ab`(GitHub master와 같은 commit)를 그대로 빌드했습니다. README가 밝히는 특성은 "O(1) cost for malloc, free, realloc, memalign", 할당당 overhead 4 B, 그리고 "Not designed to be thread safe; the user must provide this"입니다. 쓰는 방법은 pool 메모리를 넘겨 handle을 만드는 것이 전부입니다.

```c
tlsf_t tl = tlsf_create_with_pool(tlsf_mem, sizeof tlsf_mem);
void *p = tlsf_malloc(tl, 64);
tlsf_free(tl, p);
```

mapping과 bitmap 구조는 [PRTOS 4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)에서 다룹니다.

### 측정 코드 1 — 한 번의 비용

다섯 allocator에 할당·해제를 1,000번씩 시키고 평균을 냅니다. 측정 구간은 `taskENTER_CRITICAL()`로 감싸 SysTick이 끼지 않게 했고, `sink`는 컴파일러가 결과를 쓰지 않는 루프를 지우지 못하게 하는 volatile 변수입니다.

```c
/* ---- measurements ---- */
#define REPS 1000
static uint8_t arena_mem[REPS * 64] __attribute__((aligned(8)));
static uint8_t slab_mem[POOL_N * BLOCK_SZ] __attribute__((aligned(8)));
static uint8_t tlsf_mem[64 * 1024] __attribute__((aligned(8)));
static void *ptrs[1200];

static uint32_t per_op_insn(uint32_t ticks) { return ticks * 40u / REPS; }
static void *volatile sink;     /* keeps the loops from being optimised away */

static void bench_average(tlsf_t tl)
{
    uint32_t t0, t;
    arena_t a = { arena_mem, sizeof arena_mem, 0 };
    slab_t s;
    slab_init(&s, slab_mem, POOL_N, BLOCK_SZ);

    taskENTER_CRITICAL();
    t0 = NOW(); for (int i = 0; i < REPS; i++) pool_free(pool_alloc()); t = NOW() - t0;
    pr("pool   alloc+free  %u insn/op\n", per_op_insn(t));
    t0 = NOW(); for (int i = 0; i < REPS; i++) { sink = slab_alloc(&s); slab_free(&s, sink); } t = NOW() - t0;
    pr("slab   alloc+free  %u insn/op\n", per_op_insn(t));
    t0 = NOW(); for (int i = 0; i < REPS; i++) sink = arena_alloc(&a, 64); t = NOW() - t0;
    pr("arena  alloc       %u insn/op\n", per_op_insn(t));
    t0 = NOW(); for (int i = 0; i < REPS; i++) vPortFree(pvPortMalloc(64)); t = NOW() - t0;
    pr("heap_4 alloc+free  %u insn/op (empty heap)\n", per_op_insn(t));
    t0 = NOW(); for (int i = 0; i < REPS; i++) tlsf_free(tl, tlsf_malloc(tl, 64)); t = NOW() - t0;
    pr("tlsf   alloc+free  %u insn/op (empty pool)\n", per_op_insn(t));
    taskEXIT_CRITICAL();
}
```

### 측정 코드 2 — 단편화가 쌓일 때

heap을 64 B 블록으로 가득 채운 뒤, 맨 끝 블록 네 개를 풀어 200 B가 들어갈 구멍을 하나 만듭니다. 그다음 앞에서부터 하나 건너 하나씩 풀어 64 B짜리 작은 구멍 K개를 그 앞에 깔고, `malloc(200)` 한 번의 비용을 잽니다. 첫 번째로 맞는 블록을 주소 순서로 찾는 allocator라면 K개를 모두 지나야 끝의 구멍에 닿습니다.

```c
/* fill with 64 B blocks, free the last 4 (one hole that fits 200 B),
   then free every other block from the start: K small holes in front */
static void bench_scan(const char *name, void *(*m)(size_t), void (*f)(void *))
{
    int n = 0;
    while (n < 1200 && (ptrs[n] = m(64)) != NULL) n++;
    for (int i = n - 4; i < n; i++) f(ptrs[i]);
    int k = 0;
    pr("%s: %d blocks of 64 B filled the heap\n", name, n);
    for (int target = 0; target <= 400 && 2 * target < n - 4; target = target ? target * 2 : 50) {
        while (k < target) { f(ptrs[2 * k]); k++; }
        taskENTER_CRITICAL();
        uint32_t t0 = NOW();
        void *p = m(200);
        uint32_t t = NOW() - t0;
        taskEXIT_CRITICAL();
        pr("%s: %d small holes in front -> malloc(200) %s, %u insn\n", name, k, p ? "ok" : "NULL", t * 40u);
        if (p) f(p);
    }
    for (int i = 0; i < n - 4; i++) if (i % 2 || i / 2 >= k) f(ptrs[i]);
}

static tlsf_t g_tl;
static void *tl_m(size_t n) { return tlsf_malloc(g_tl, n); }
static void tl_f(void *p) { tlsf_free(g_tl, p); }

#ifdef ISR_MALLOC
void TIMER1_IRQHandler(void)
{
    ((volatile unsigned *)0x40001000)[3] = 1;            /* INTSTATUS, write 1 to clear */
    pr("ISR: calling pvPortMalloc(32)\n");
    void *p = pvPortMalloc(32);
    pr("ISR: got %x\n", (unsigned)p);
}
#endif
```

`ISR_MALLOC`을 정의하면 TIMER1 interrupt 안에서 `pvPortMalloc`을 부르는 변형이 됩니다. 마지막 블록이 static 비교와 task, `main`입니다.

```c
#include "queue.h"
typedef struct { uint32_t id, value[3]; } item_t;    /* 16 B */
static StaticQueue_t q_buf;
static uint8_t q_storage[64 * sizeof(item_t)];

static void static_vs_dynamic(void)
{
    size_t f0 = xPortGetFreeHeapSize();
    QueueHandle_t qd = xQueueCreate(64, sizeof(item_t));
    size_t f1 = xPortGetFreeHeapSize();
    QueueHandle_t qs = xQueueCreateStatic(64, sizeof(item_t), q_storage, &q_buf);
    size_t f2 = xPortGetFreeHeapSize();
    pr("xQueueCreate(64, 16):       heap -%u B\n", (unsigned)(f0 - f1));
    pr("xQueueCreateStatic(64, 16): heap -%u B (sizeof(StaticQueue_t)=%u)\n",
       (unsigned)(f1 - f2), (unsigned)sizeof(StaticQueue_t));
    vQueueDelete(qd);
    vQueueDelete(qs);
}

static void bench_task(void *arg)
{
    (void)arg;
    static_vs_dynamic();
    g_tl = tlsf_create_with_pool(tlsf_mem, sizeof tlsf_mem);
    bench_average(g_tl);
    bench_scan("heap_4", pvPortMalloc, vPortFree);
    bench_scan("tlsf  ", tl_m, tl_f);
#ifdef ISR_MALLOC
    volatile unsigned *t1 = (volatile unsigned *)0x40001000;
    *(volatile unsigned *)0xE000E100 = 1u << 9;          /* NVIC enable IRQ 9 = TIMER1 */
    *(volatile uint8_t *)(0xE000E400 + 9) = 0xE0;         /* lowest priority */
    t1[2] = 25000; t1[1] = 25000; t1[0] = 1u | 8u;        /* RELOAD, VALUE, CTRL: enable + IRQ */
    vTaskDelay(10);
    pr("no assert\n");
#endif
    hosted_exit(0);
}

int main(void)
{
    xTaskCreate(bench_task, "bench", 1024, NULL, 2, NULL);
    vTaskStartScheduler();
    return 0;
}
```

## 측정 / 성능 비교

QEMU 11.1.3 `mps2-an385`(Cortex-M3), `arm-none-eabi-gcc` 16.2.0 `-O2`에서의 전체 출력입니다. 두 번 돌려 `diff`가 비었습니다.

```text
xQueueCreate(64, 16):       heap -1112 B
xQueueCreateStatic(64, 16): heap -0 B (sizeof(StaticQueue_t)=80)
pool   alloc+free  59 insn/op
slab   alloc+free  5 insn/op
arena  alloc       8 insn/op
heap_4 alloc+free  238 insn/op (empty heap)
tlsf   alloc+free  388 insn/op (empty pool)
heap_4: 851 blocks of 64 B filled the heap
heap_4: 0 small holes in front -> malloc(200) ok, 120 insn
heap_4: 50 small holes in front -> malloc(200) ok, 720 insn
heap_4: 100 small holes in front -> malloc(200) ok, 1360 insn
heap_4: 200 small holes in front -> malloc(200) ok, 2560 insn
heap_4: 400 small holes in front -> malloc(200) ok, 4920 insn
tlsf  : 916 blocks of 64 B filled the heap
tlsf  : 0 small holes in front -> malloc(200) ok, 240 insn
tlsf  : 50 small holes in front -> malloc(200) ok, 240 insn
tlsf  : 100 small holes in front -> malloc(200) ok, 240 insn
tlsf  : 200 small holes in front -> malloc(200) ok, 280 insn
tlsf  : 400 small holes in front -> malloc(200) ok, 240 insn
```

결과를 표로 옮기면 다음과 같습니다. 단위는 QEMU 명령 수이고 해상도는 40입니다.

| allocator | 빈 상태 한 번(할당+해제) | 작은 구멍 0 → 400개일 때 `malloc(200)` |
| --- | ---: | --- |
| slab(free list) | 5 | — |
| arena(할당만) | 8 | — |
| pool(첫 칸에서 찾음 + critical section 진입·해제) | 59 | — |
| heap_4 | 238 | 120 → 720 → 1,360 → 2,560 → 4,920 |
| TLSF | 388 | 240 → 240 → 240 → 280 → 240 |

읽을 것은 두 가지입니다.

- **빈 heap에서 한 번의 비용은 TLSF가 heap_4보다 큽니다.** TLSF는 크기를 두 단계 index로 바꾸고 bitmap을 찾는 고정 작업을 매번 합니다. "O(1)"은 빠르다는 뜻이 아니라 빈 블록 수와 무관하다는 뜻입니다.
- **구멍이 쌓이면 heap_4의 비용은 구멍 수에 비례해 늘고, TLSF는 그대로입니다.** heap_4는 50개 늘 때마다 약 600 명령, 구멍 하나당 약 12 명령씩 늘었습니다. heap_4가 free list를 주소 순서로 앞에서부터 훑는 first fit이기 때문입니다(`heap_4.c:248`). 구멍 0개일 때 120 대 240이던 비용이 50개일 때 720 대 240으로 뒤집혔고, 구멍당 12 명령이라는 기울기로 보면 교차점은 구멍 10개 근처입니다.

`xQueueCreate(64, 16)`는 heap에서 1,112 B를 가져갔습니다. 저장 영역 64 × 16 = 1,024 B, queue 구조체(`sizeof(StaticQueue_t)` = 80 B), heap_4 헤더 8 B를 더한 값입니다. `xQueueCreateStatic`은 heap을 전혀 쓰지 않았습니다.

이 숫자는 QEMU의 명령 수라 실제 Cortex-M3의 사이클(파이프라인, flash wait state, bus)과는 다릅니다. 실제 보드에서는 같은 코드를 DWT `CYCCNT` 같은 사이클 카운터로 다시 재야 합니다. 비례 관계(heap_4는 구멍 수에 비례, TLSF·pool·slab은 무관)는 코드 경로에서 나오는 성질이라 보드가 바뀌어도 같습니다.

## 자주 보는 함정

> ⚠️ free heap 총량만 보고 안심함

남은 총량과 가장 큰 연속 블록은 다른 숫자입니다. heap_4·heap_5라면 `vPortGetHeapStats()`의 `xSizeOfLargestFreeBlockInBytes`를 함께 기록합니다. `xPortGetMinimumEverFreeHeapSize()`는 부팅 뒤 가장 적게 남았던 총량이라 단편화를 보여 주지 않습니다.

> ⚠️ 오류 경로의 해제 누락

```c
buf = pvPortMalloc(len);
if (parse(buf) < 0)
    return -1;          /* buf leaks */
```

오류 경로마다 해제가 필요합니다. C에서는 `goto cleanup`으로 해제를 한 곳에 모으고, C++에서는 소멸자에 맡깁니다. arena를 쓰면 작업 단위 끝의 `arena_reset` 하나가 모든 경로의 해제를 대신합니다.

> ⚠️ ISR에서 `pvPortMalloc`

TIMER1 ISR에서 `pvPortMalloc(32)`를 부른 `ISR_MALLOC` 빌드의 마지막 출력입니다.

```text
ISR: calling pvPortMalloc(32)
ASSERT failed: FreeRTOS-Kernel/portable/GCC/ARM_CM3/port.c line 438
```

heap_4의 `pvPortMalloc`은 `vTaskSuspendAll()`로 시작해 `xTaskResumeAll()`로 끝나고(`heap_4.c:221`, `:334`), `xTaskResumeAll()`은 `taskENTER_CRITICAL()`을 부릅니다(`tasks.c:4027`). ARM_CM3 포트의 `vPortEnterCritical()`은 interrupt 안에서 불리면 `configASSERT`로 멈춥니다(`port.c:430-438`, 주석: "Only API functions that end in "FromISR" can be used in an interrupt"). heap_4에는 `FromISR` 할당 함수가 없으므로, ISR에서는 미리 채워 둔 pool이나 queue에서 꺼내 씁니다. ISR이 pool을 쓴다면 pool의 보호도 `taskENTER_CRITICAL_FROM_ISR()` 쪽으로 바꿔야 합니다.

> ⚠️ 크기 계산의 unsigned underflow

```c
size_t payload = len - HDR_LEN;   /* len = 10, HDR_LEN = 14 */
```

`size_t`는 부호가 없으므로 32비트에서 이 값은 2^32 − 4 = 4,294,967,292가 됩니다. 뺄셈 전에 `len < HDR_LEN`을 먼저 검사합니다. heap_4는 헤더를 더하다 넘치는 크기를 `heapADD_WILL_OVERFLOW`로 걸러 NULL을 돌려주지만, 그 전에 호출자가 잘못된 크기를 만든 것이 원인입니다.

> ⚠️ 부팅 때만 만드는 객체를 동적으로 만듦

```c
QueueHandle_t q = xQueueCreate(64, sizeof(item_t));   /* 1,112 B from heap_4 */
```

부팅 때 만들고 끝까지 지우지 않는 객체라면 `*Static` 변종으로 옮기면 그 객체 몫의 heap 사용이 0이 됩니다. 위 측정에서 같은 queue가 1,112 B를 덜 썼습니다.

## 재현 환경

하네스(`startup.c`, `io.c`, `link.ld`, `libc/`)와 `FreeRTOSConfig.h`는 [6-12의 재현 환경](/blog/embedded/modern-recipes/part6-12-rtos-debugging#재현-환경)과 같고, 다음 네 군데만 바꿉니다.

- `FreeRTOSConfig.h`: `configSUPPORT_DYNAMIC_ALLOCATION` 아래에 `#define configSUPPORT_STATIC_ALLOCATION 1`과 `#define configKERNEL_PROVIDED_STATIC_MEMORY 1`을 더합니다.
- `startup.c`: vector table을 `vectors[16 + 32]`로 늘리고 `[16 + 9] = TIMER1_IRQHandler`를 넣습니다. `TIMER1_IRQHandler`는 `Default_Handler`의 weak alias로 선언합니다(`mps2-an385`에서 TIMER1은 IRQ 9입니다. QEMU `hw/arm/mps2.c`가 timer *i*에 IRQ `8 + i`를 줍니다).
- `libc/assert.h`(새 파일): TLSF가 쓰는 `assert`를 하네스의 `assert_fail`로 잇습니다.
- `libc/stdio.h`: TLSF의 `printf`를 하네스의 `pr`로 잇습니다.

```c
/* libc/assert.h */
#pragma once
void assert_fail(const char *file, unsigned line);
#define assert(x) do { if (!(x)) assert_fail(__FILE__, __LINE__); } while (0)

/* libc/stdio.h */
#pragma once
#include <stddef.h>
int snprintf(char *, size_t, const char *, ...);
void pr(const char *, ...);
#define printf pr
```

```bash
git clone --depth 1 --branch V11.2.0 https://github.com/FreeRTOS/FreeRTOS-Kernel.git
git clone https://github.com/mattconte/tlsf.git && git -C tlsf checkout deff9ab509341f264addbd3c8ada533678591905
cp tlsf/tlsf.c tlsf/tlsf.h .
K=FreeRTOS-Kernel P=$K/portable/GCC/ARM_CM3
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -O2 -g -ffreestanding -nostdlib -fno-builtin \
  -I. -Ilibc -I$K/include -I$P -T link.ld -o allocbench.elf \
  startup.c io.c allocbench.c tlsf.c $K/tasks.c $K/queue.c $K/list.c $K/timers.c \
  $P/port.c $K/portable/MemMang/heap_4.c -lgcc
qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=0 -kernel allocbench.elf
```

gcc 명령에 `-DISR_MALLOC`을 더하면 ISR 변형이 됩니다. 도구는 `arm-none-eabi-gcc` 16.2.0(newlib 없음)과 QEMU 11.1.3입니다.

## 정리

- 범용 `malloc`의 문제는 실행 시간 변동, 단편화, 실패 처리 세 가지이고, 대안은 미리 아는 것(개수·크기·lifetime)에 따라 고릅니다.
- 이 실행에서 slab 5, arena 8, pool 59, heap_4 238, TLSF 388 명령이 한 번의 비용이었습니다.
- heap_4의 비용은 앞쪽 빈 구멍 수에 비례해 0개 120 → 400개 4,920 명령으로 늘었고, TLSF는 240~280에 머물렀습니다. O(1)은 "빠르다"가 아니라 "빈 블록 수와 무관하다"입니다.
- heap_4 블록 헤더는 32비트에서 8 B, TLSF는 할당당 4 B입니다.
- `*Static` 변종으로 옮긴 queue 하나가 heap 1,112 B를 덜 썼습니다.
- ISR에서 `pvPortMalloc`을 부르면 V11.2.0 ARM_CM3 포트는 `port.c:438`의 assert로 멈춥니다. ISR은 미리 채운 pool에서 꺼냅니다.

다음 편은 **메모리 정렬과 패딩**입니다. natural alignment, struct padding, packed의 함정을 다룹니다.

## 관련 항목

- [PRTOS 4-01: Real-time Memory](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [PRTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [PRTOS 4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [PRTOS 4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [PRTOS 4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [ECPP 3-01: No Dynamic Alloc](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [6-12: RTOS 디버깅 기법](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
- [8-02: 메모리 정렬](/blog/embedded/modern-recipes/part8-02-memory-alignment)
