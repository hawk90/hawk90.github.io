---
title: "4-02: FreeRTOS Heap_1~5 — 5 Allocator 비교 분석"
date: 2026-05-19T14:00:00
description: "Heap_1 no-free, Heap_2 best-fit, Heap_3 wrapper, Heap_4 coalescing, Heap_5 multi-region."
series: "Practical RTOS Internals"
seriesOrder: 34
tags: [freertos, heap, allocator]
draft: true
---

## 한 줄 요약

> **"FreeRTOS는 5종 heap 선택 가능"** — workload·safety 요구에 맞춰.

## Heap_1 — 가장 단순, 가장 안전

```c
/* heap_1.c */
void *pvPortMalloc(size_t xWantedSize) {
    if (next_free + xWantedSize <= heap_end) {
        void *ret = next_free;
        next_free += xWantedSize;
        return ret;
    }
    return NULL;
}

void vPortFree(void *pv) {
    /* 아무것도 안 함 */
}
```

특징:
- *Bump allocator* — pointer만 이동
- **`free` 없음** — 부팅 시 한 번 alloc, never free
- Deterministic, fragmentation 0
- Safety-critical에 적합

→ Task·Queue *초기화 시*만 생성하는 시스템에 적합.

## Heap_2 — Best Fit, No Coalesce

```c
struct BlockLink {
    BlockLink *next;
    size_t size;
};

void *malloc(size) {
    /* free list 순회 — 가장 작은 fit 찾음 */
    BlockLink *best = find_best_fit(size);
    if (best->size > size + MIN_BLOCK) split(best);
    return best;
}

void free(ptr) {
    /* free list에 추가 — *coalesce 안 함* */
    insert_to_free_list(ptr);
}
```

특징:
- Free 지원
- *Coalesce 없음* — fragmentation 점점 심해짐
- 같은 size 반복 alloc/free 워크로드에 OK
- Deprecated — Heap_4 권장

## Heap_3 — libc malloc Wrapper

```c
void *pvPortMalloc(size_t size) {
    vTaskSuspendAll();
    void *ret = malloc(size);   /* newlib·glibc */
    xTaskResumeAll();
    return ret;
}
```

특징:
- 표준 `malloc` 활용
- Scheduler suspend로 *thread-safe*
- `configTOTAL_HEAP_SIZE` 무시 — linker heap 사용
- Newlib·glibc 사용 가능 환경

## Heap_4 — Best Fit + Coalesce (가장 흔함)

```c
void free(ptr) {
    BlockLink *block = (BlockLink*)((char*)ptr - sizeof(BlockLink));
    insert_to_free_list(block);
    coalesce_with_neighbors(block);   /* ← 핵심 */
}

void coalesce_with_neighbors(block) {
    /* 앞 free block과 합침 */
    if (prev_block->next == block) merge(prev_block, block);
    /* 뒤 free block과 합침 */
    if (block->next == next_block) merge(block, next_block);
}
```

특징:
- First-fit allocation
- **Coalesce** — fragmentation 줄임
- Default·가장 흔함
- *Non-bounded* worst case (그러나 일반적으로 OK)

```c
#define configTOTAL_HEAP_SIZE   (32 * 1024)
```

## Heap_5 — Multi-Region (Non-contiguous)

```c
HeapRegion_t regions[] = {
    { (uint8_t*)0x20000000, 0x10000 },   /* internal SRAM */
    { (uint8_t*)0xC0000000, 0x100000 },  /* external SDRAM */
    { NULL, 0 }
};
vPortDefineHeapRegions(regions);
```

특징:
- 여러 *비연속* 메모리 영역
- 각 영역 *내부에서 Heap_4* 동작
- DTCM + DRAM 같이 *다른 메모리 영역* 통합

STM32H7·i.MX RT 같은 *복합 메모리* SoC.

## 비교 표

| Heap | Free | Coalesce | WCET | 용도 |
|---|---|---|---|---|
| heap_1 | ✗ | ✗ | O(1) | safety-critical, 초기 한 번만 |
| heap_2 | ✓ | ✗ | O(N) | deprecated |
| heap_3 | ✓ | ✓ | O(?) | libc 활용 |
| heap_4 | ✓ | ✓ | O(N) | 기본·가장 흔함 |
| heap_5 | ✓ | ✓ | O(N) | multi-region |

## Heap 사용량 측정

```c
size_t free_now = xPortGetFreeHeapSize();
size_t min_ever = xPortGetMinimumEverFreeHeapSize();

/* 디버깅 — 누가 얼마 썼나 */
HeapStats_t s;
vPortGetHeapStats(&s);
printf("Total free: %u\n", (unsigned)s.xAvailableHeapSpaceInBytes);
printf("Largest free block: %u\n", (unsigned)s.xSizeOfLargestFreeBlockInBytes);
printf("Number free blocks: %u\n", (unsigned)s.xNumberOfFreeBlocks);
printf("Total ever malloc'd: %u\n", (unsigned)s.xNumberOfSuccessfulAllocations);
```

`xSizeOfLargestFreeBlockInBytes < xAvailableHeapSpaceInBytes / 2` → fragmentation 심각.

## Malloc Failure Hook

```c
#define configUSE_MALLOC_FAILED_HOOK 1

void vApplicationMallocFailedHook(void) {
    /* 디버깅 — heap exhausted */
    log_critical("Heap exhausted!");
    print_heap_stats();
    while(1);   /* halt */
}
```

Production — *graceful fallback* 또는 *system reset*.

## Heap Corruption 탐지

`configHEAP_CLEAR_MEMORY_ON_FREE`·canary 사용 — corruption detect:

```c
#define configHEAP_CLEAR_MEMORY_ON_FREE 1   /* free 시 0 으로 채움 */
```

Corruption 시 *다음 alloc에서 fault* — 디버깅 도움.

## Heap_4 — Bounded WCET 분석

Worst case = *free list 끝까지 순회*. N free block 시 *O(N) iteration × cmp + ldr*.

```text
Cortex-M4 @ 168 MHz:
  10 free block: ~150 cycle = 0.9 µs
  100 free block: ~1500 cycle = 9 µs
  1000 free block: ~15 µs
```

Free block 100개 이내면 *< 10 µs WCET*. Critical loop에서 *malloc 피해야 안전*.

## STM32 사례 — Multi-Region

```c
HeapRegion_t regions[] = {
    { &__sram1_start, 16384 },   /* SRAM1 */
    { &__sdram_start, 8 * 1024 * 1024 },   /* SDRAM */
    { NULL, 0 }
};
vPortDefineHeapRegions(regions);

/* 사용 — alloc 영역 선택 못함, 첫 번째부터 채움 */
```

선택 alloc 필요 시 *별도 allocator*.

## Heap_4 vs TLSF — Embedded 선택

| 항목 | Heap_4 | TLSF |
|---|---|---|
| WCET | O(N) | **O(1)** |
| 코드 크기 | 작음 | 보통 (~2 KB) |
| Fragmentation | first-fit | bounded |
| 메모리 overhead | per-block 8 byte | per-block 4 byte + 1 KB bitmap |
| 사용처 | 일반 RTOS | RT critical |

다음 편에 TLSF 상세.

## 자주 하는 실수

> ⚠️ Heap_1을 free 가능하다 가정

```c
void *p = pvPortMalloc(100);
vPortFree(p);   /* heap_1에선 *아무 일도 안 함* */
```

→ heap_1은 *초기화용*만.

> ⚠️ Heap_4 fragmentation 무시

```c
/* 다양한 size 빈번 alloc/free */
/* → fragmentation 점점 ↑ → 결국 alloc fail */
```

→ memory pool 또는 TLSF.

> ⚠️ Heap_5 region overlap

```c
regions = { 0x20000000, 0x10000 },
          { 0x20008000, 0x10000 }   /* ← overlap! */
```

→ region 분명히 분리.

> ⚠️ Hook 비활성

`configUSE_MALLOC_FAILED_HOOK = 0` → alloc fail이 *silent NULL* → debug 어려움.

## 정리

- 5종 heap — **heap_1·2·3·4·5**.
- **Heap_1** = no-free, safety-critical용.
- **Heap_4** = default, coalesce, 가장 흔함.
- **Heap_5** = multi-region (DTCM + DRAM 등).
- `vPortGetHeapStats`로 모니터.
- WCET critical 시 **TLSF** 또는 *static*.

다음 편은 **TLSF**.

## 관련 항목

- [4-01: 실시간 메모리](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
