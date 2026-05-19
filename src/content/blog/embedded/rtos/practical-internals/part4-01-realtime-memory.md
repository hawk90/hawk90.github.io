---
title: "4-01: 실시간 메모리 요구사항 — Determinism·Fragmentation·WCET"
date: 2026-05-19T13:00:00
description: "동적 할당의 한계. Fragmentation. WCET-bounded allocator. Safety-critical 기준."
series: "Practical RTOS Internals"
seriesOrder: 33
tags: [memory, determinism, fragmentation, wcet]
draft: true
---

## 한 줄 요약

> **"RT 시스템 = bounded allocation time"** — `malloc`의 가변 시간은 *deadline 위협*.

## 일반 `malloc` 문제

```c
void *ptr = malloc(1024);
```

내부:
- Free list 순회 (size class)
- Block split
- Coalesce 검사
- Lock acquire (heap)

→ 실행 시간 *수 µs ~ 수 ms* 가변. WCET 보장 *어려움*.

## Fragmentation

### External Fragmentation

```text
Free 영역:  ████░░██░░███░░██  (총 free 6KB)
요청:      [████████] (8 KB 연속)
→ 6 KB free 있어도 *연속 8 KB 없음* → 할당 실패
```

### Internal Fragmentation

```text
요청: 100 byte
할당: 128 byte block (size class) → 28 byte 낭비
```

## RT 시스템의 메모리 전략

| 전략 | 장점 | 단점 |
|---|---|---|
| **No malloc** | WCET 보장, 가장 안전 | 유연성 ↓ |
| **Static allocation** | 초기화 시 결정 | 메모리 oversized |
| **Memory pool** | O(1) alloc/free | 크기별 고정 |
| **TLSF** | O(1) bounded | 약간 복잡 |
| **Heap_4 (FreeRTOS)** | first-fit | non-bounded WCET |
| **Heap_5 (FreeRTOS)** | non-contiguous | first-fit |

## Safety-Critical Standards

| 표준 | 영향 |
|---|---|
| **MISRA C** | Rule 21.3 — `malloc`/`free` 사용 금지 (Dir 4.12) |
| **DO-178C** | Level A·B에 dynamic allocation 회피 |
| **CERT C** | MEM34-C — `realloc` 후 NULL 검사 |
| **AUTOSAR** | Static allocation 우선 |
| **ISO 26262** | ASIL-D에 dynamic 자제 |

## Bounded Allocator — TLSF

**Two-Level Segregated Fit** (Masmano 2004):

```text
First level — size 2^n bucket (16, 32, 64, ..., 64K)
Second level — 각 bucket을 2^m sub-bucket
  e.g. 2 KB bucket → 2k, 2.25k, 2.5k, 2.75k

allocate(size):
  - first level idx = floor(log2(size))
  - second level idx = (size - 2^fl) / (2^(fl-4))
  - bitmap에서 *가장 가까운 큰 bucket* 찾음 (CLZ)
  - O(1)
```

상세 — 4-03 편.

## Static Allocation 패턴

```c
static uint8_t task1_stack[2048];
static StaticTask_t task1_tcb;

TaskHandle_t xTaskCreateStatic(
    task1_function, "task1", 2048 / sizeof(StackType_t),
    NULL, 5, task1_stack, &task1_tcb);
```

FreeRTOS·Zephyr·Wind River — 모두 *static variant* 제공.

## Memory Pool

```c
#define POOL_SIZE 32
#define BLOCK_SIZE 64

static uint8_t pool_buf[POOL_SIZE * BLOCK_SIZE];
static struct { uint8_t *free_list; mutex_t lock; } pool;

void *pool_alloc(void) {
    /* O(1) — free list pop */
}
void pool_free(void *ptr) {
    /* O(1) — free list push */
}
```

크기 고정 — *fragmentation 0*, WCET 보장.

## Buddy Allocator

Linux kernel·일부 RTOS:

```text
초기:  [   2MB   ]
요청 256KB:
   [256K][256K][512K][1M]
   할당하나 free 3개
```

Power-of-2 split·coalesce. *Bounded* O(log N).

## 측정 — Heap 상태

```c
/* FreeRTOS */
size_t free = xPortGetFreeHeapSize();
size_t min  = xPortGetMinimumEverFreeHeapSize();
HeapStats_t stats;
vPortGetHeapStats(&stats);
/* stats.xMaximumFreeBlockSize, xNumberOfFreeBlocks */
```

`xMaximumFreeBlockSize` 작음 + `xNumberOfFreeBlocks` 많음 → *fragmentation 심함*.

## Embedded — DRAM/SRAM 분리

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];   /* TCM */
__attribute__((section(".sdram"))) uint8_t big_buf[256 * 1024]; /* ext SDRAM */
__attribute__((section(".sram"))) uint8_t medium_buf[16384];
```

Memory region별 *속도·용량 trade-off*. Linker script로 명시.

## 자동차·항공 — Static Only

```text
ASIL-D ECU:
  - 모든 task stack — static
  - 모든 buffer — compile-time fixed
  - 모든 message queue — static
  - malloc 자체 *제외*
```

KSLV-II 누리 flight computer — *malloc 없음*. 모든 메모리 *부팅 시 fixed*.

## DO-178C Level A에서 Heap 사용

```text
가능하나 — *극도로 어려움*:
  - WCET 분석
  - Worst-case fragmentation 증명
  - 모든 path coverage
  - Robustness testing
  
→ 보통 *피함*. ITAR·NIST 같은 표준도 같은 방향.
```

## 자주 하는 실수

> ⚠️ Heap 사용 결정

```c
/* Production code에 */
void *buf = malloc(rand() % 1024);
```

→ Embedded에선 *malloc 자체* 피하는 게 안전.

> ⚠️ Fragmentation 인지 못함

```c
malloc(100); free();
malloc(200); free();
malloc(50);  free();
/* → free list 흩어짐 */
malloc(150);   /* ← 가능하나 fragmented free 영역 search */
```

→ Memory pool 또는 TLSF.

> ⚠️ Stack도 dynamic

```c
xTaskCreate(... uxStackDepth ... );
/* → heap에서 stack 할당 */
```

→ `xTaskCreateStatic`.

> ⚠️ ISR이 malloc

```c
ISR: malloc(...);   /* ✗ heap lock — deadlock */
```

ISR은 *static buffer*만.

## 정리

- RT 메모리 = **bounded allocation + no fragmentation**.
- Safety-critical (MISRA·DO-178C·ASIL) — `malloc` 금지/회피.
- 대안 — **static / memory pool / TLSF / buddy**.
- 측정 — FreeRTOS `vPortGetHeapStats`.
- LV·자동차 — 거의 *static-only*.

다음 편은 **FreeRTOS Heap_1~5**.

## 관련 항목

- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
