---
title: "실시간 메모리 요구사항 — Determinism·Fragmentation·WCET"
date: 2026-05-07T09:33:00
description: "동적 할당의 한계와 fragmentation, WCET-bounded allocator, safety-critical 기준을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 33
tags: [memory, determinism, fragmentation, wcet]
draft: false
---

## 한 줄 요약

> **"RT 시스템에서는 allocation 시간이 bounded해야 합니다."** `malloc`의 가변 시간은 deadline을 위협합니다.

## 일반 `malloc`의 문제

```c
void *ptr = malloc(1024);
```

내부에서는 다음과 같은 단계가 일어납니다.

- Size class별 free list를 순회합니다.
- Block을 split합니다.
- Coalesce 가능 여부를 검사합니다.
- Heap lock을 acquire합니다.

그 결과 실행 시간이 수 µs에서 수 ms까지 들쭉날쭉합니다. WCET 보장이 어려워집니다.

## Fragmentation

### External Fragmentation

```text
Free 영역:  ████░░██░░███░░██  (총 free 6KB)
요청:      [████████] (8 KB 연속)
→ 6 KB free 있어도 *연속 8 KB 없음* → 할당 실패
```

총 free 메모리가 충분해도 연속 영역이 부족해 할당이 실패하는 상황입니다.

### Internal Fragmentation

```text
요청: 100 byte
할당: 128 byte block (size class) → 28 byte 낭비
```

Size class에 맞춰 올림 할당하면서 발생하는 낭비입니다.

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

자세한 내용은 4-03 편에서 다룹니다.

## Static Allocation 패턴

```c
static uint8_t task1_stack[2048];
static StaticTask_t task1_tcb;

TaskHandle_t xTaskCreateStatic(
    task1_function, "task1", 2048 / sizeof(StackType_t),
    NULL, 5, task1_stack, &task1_tcb);
```

FreeRTOS, Zephyr, Wind River 모두 static variant API를 제공합니다.

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

Block 크기를 고정해 fragmentation이 0이 되고 WCET도 보장됩니다.

## Buddy Allocator

Linux 커널과 일부 RTOS에서 사용하는 방식입니다.

```text
초기:  [   2MB   ]
요청 256KB:
   [256K][256K][512K][1M]
   할당하나 free 3개
```

Power-of-2 단위로 split하고 coalesce하므로 bounded O(log N)을 보장합니다.

## 측정: Heap 상태

```c
/* FreeRTOS */
size_t free = xPortGetFreeHeapSize();
size_t min  = xPortGetMinimumEverFreeHeapSize();
HeapStats_t stats;
vPortGetHeapStats(&stats);
/* stats.xMaximumFreeBlockSize, xNumberOfFreeBlocks */
```

`xMaximumFreeBlockSize`가 작은데 `xNumberOfFreeBlocks`가 많으면 fragmentation이 심하다는 신호입니다.

## Embedded에서 DRAM과 SRAM 분리

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];   /* TCM */
__attribute__((section(".sdram"))) uint8_t big_buf[256 * 1024]; /* ext SDRAM */
__attribute__((section(".sram"))) uint8_t medium_buf[16384];
```

Memory region마다 속도와 용량의 trade-off가 다릅니다. Linker script로 영역을 명시합니다.

## 자동차와 항공: Static Only

ASIL-D ECU에서는

- 모든 task stack을 static으로 둡니다.
- 모든 buffer를 compile-time fixed로 잡습니다.
- 모든 message queue를 static으로 만듭니다.
- malloc 자체를 *제외*합니다.

KSLV-II 누리호 flight computer에는 malloc이 아예 없습니다. 모든 메모리는 부팅 시점에 고정됩니다.

## DO-178C Level A에서 Heap 사용

가능은 하지만 *극도로 어렵습니다*.

- WCET 분석
- Worst-case fragmentation 증명
- 모든 path coverage
- Robustness testing

이 모든 항목을 증명하는 비용이 크기 때문에 보통은 heap을 *피합니다*. ITAR이나 NIST 같은 표준도 같은 방향을 권장합니다.

## 자주 하는 실수

> ⚠️ Production 코드에서 heap을 안일하게 사용하는 경우

```c
/* Production code에 */
void *buf = malloc(rand() % 1024);
```

Embedded 환경에서는 malloc 자체를 피하는 편이 안전합니다.

> ⚠️ Fragmentation을 인지하지 못하는 경우

```c
malloc(100); free();
malloc(200); free();
malloc(50);  free();
/* → free list 흩어짐 */
malloc(150);   /* ← 가능하나 fragmented free 영역 search */
```

이 패턴이 반복되면 free list가 흩어집니다. memory pool이나 TLSF로 대체해야 합니다.

> ⚠️ Stack을 dynamic하게 할당하는 경우

```c
xTaskCreate(... uxStackDepth ... );
/* → heap에서 stack 할당 */
```

대신 `xTaskCreateStatic`을 사용합니다.

> ⚠️ ISR에서 malloc을 호출하는 경우

```c
ISR: malloc(...);   /* ✗ heap lock — deadlock */
```

ISR에서는 static buffer만 사용해야 합니다.

## 정리

- RT 메모리는 bounded allocation과 no fragmentation을 동시에 충족해야 합니다.
- Safety-critical 표준(MISRA, DO-178C, ASIL)에서는 `malloc`을 금지하거나 회피합니다.
- 대안으로 static 할당, memory pool, TLSF, buddy allocator가 있습니다.
- 상태 측정은 FreeRTOS의 `vPortGetHeapStats`로 확인합니다.
- 발사체나 자동차 ECU는 거의 static-only로 운영합니다.

다음 편에서는 FreeRTOS Heap_1부터 Heap_5까지 다섯 가지 구현을 비교합니다.

## 관련 항목

- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
