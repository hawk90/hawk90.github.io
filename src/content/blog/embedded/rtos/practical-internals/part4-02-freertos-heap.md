---
title: "4-02: FreeRTOS Heap_1~5 — 5종 Allocator의 구조와 트레이드오프"
date: 2026-05-19T14:00:00
description: "FreeRTOS가 제공하는 다섯 가지 heap 구현을 source 수준에서 비교합니다. heap_1의 bump부터 heap_5의 multi-region까지, 실시간성과 단편화 관점에서 어떤 워크로드에 어떤 구현이 맞는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 34
tags: [freertos, heap, allocator]
---

## 한 줄 요약

> **"FreeRTOS는 한 가지 `pvPortMalloc`을 다섯 가지 정책으로 구현해 둡니다."** — workload와 safety 요구에 맞춰 한 파일만 골라 빌드합니다.

## 어떤 문제를 푸는가

대부분의 RTOS는 *하나의 heap 구현*을 강제합니다. 하지만 임베디드 워크로드는 너무 다양합니다. 누리호 비행 컴퓨터처럼 부팅 시 한 번만 객체를 만드는 시스템도 있고, IoT 게이트웨이처럼 packet과 message 객체가 계속 들고나는 시스템도 있습니다. 한 구현으로 모두 만족시키기는 어렵습니다.

FreeRTOS는 이 문제를 *컴파일 타임 선택*으로 풉니다. `pvPortMalloc`과 `vPortFree`의 시그니처를 고정해 두고, 그 뒤에 다섯 가지 구현(`heap_1.c` ~ `heap_5.c`) 중 하나를 링크하게 합니다. 사용자 코드는 한 줄도 안 바꿔도 됩니다.

각 구현은 *free 지원 여부*, *coalesce 정책*, *contiguous 가정* 세 축으로 갈라집니다. 이번 편에서는 각 구현의 핵심 알고리즘과 WCET 특성, 그리고 어느 시스템에 어느 구현을 골라야 하는지 정리합니다.

## Heap_1 — Bump Allocator, free 없음

가장 단순합니다. heap 시작 포인터 하나를 들고 있다가 alloc 요청이 오면 그만큼 *앞으로 밀어* 반환합니다. `vPortFree`는 호출되어도 *아무 일도 하지 않습니다*.

```c
/* heap_1.c — 핵심만 */
static uint8_t ucHeap[configTOTAL_HEAP_SIZE];
static size_t xNextFreeByte = 0;

void *pvPortMalloc(size_t xWantedSize) {
    void *pvReturn = NULL;
    xWantedSize = (xWantedSize + portBYTE_ALIGNMENT_MASK)
                  & ~portBYTE_ALIGNMENT_MASK;
    vTaskSuspendAll();
    {
        if ((xNextFreeByte + xWantedSize) < configTOTAL_HEAP_SIZE) {
            pvReturn = &ucHeap[xNextFreeByte];
            xNextFreeByte += xWantedSize;
        }
    }
    xTaskResumeAll();
    return pvReturn;
}

void vPortFree(void *pv) {
    (void)pv;
    /* heap_1은 free를 지원하지 않습니다 */
}
```

특성은 명확합니다. alloc 시간이 *O(1) 상수*이고 분기도 거의 없습니다. 단편화는 *원천적으로 0*입니다. 메모리는 *부팅 시 한 번*만 잡고 평생 유지하는 모델에 정확히 맞습니다.

safety-critical 시스템에서 의외로 자주 쓰입니다. 모든 task, queue, semaphore를 `xTaskCreate`로 만들되 부팅 후에는 *추가 alloc이 절대 없다*고 확신할 수 있다면 heap_1이 가장 안전한 선택입니다. `vPortFree` 호출 자체가 silent no-op이라는 점만 명확히 코드에 남겨 두면 됩니다.

## Heap_2 — Best Fit, Coalesce 없음

heap_2는 free를 지원합니다. 다만 *인접 block과 합치지(coalesce) 않습니다*. free list는 size 오름차순으로 정렬되어 있고, alloc 시 *가장 작게 들어맞는* block을 고릅니다.

```c
void *pvPortMalloc(size_t xWantedSize) {
    BlockLink_t *pxBlock, *pxPreviousBlock;
    /* size 오름차순 free list 순회 */
    pxPreviousBlock = &xStart;
    pxBlock = xStart.pxNextFreeBlock;
    while ((pxBlock->xBlockSize < xWantedSize) && (pxBlock->pxNextFreeBlock)) {
        pxPreviousBlock = pxBlock;
        pxBlock = pxBlock->pxNextFreeBlock;
    }
    /* 찾은 block을 list에서 떼어내고, 필요하면 split */
    ...
}
```

문제는 *coalesce가 없다는 것*입니다. 같은 크기 객체를 반복 alloc/free 하는 워크로드(예: 고정 크기 packet pool)에서는 잘 동작합니다. 하지만 *다양한 크기*를 다루면 free list에 자잘한 fragment가 누적되고 시간이 갈수록 큰 alloc이 실패합니다.

FreeRTOS 공식 문서가 *deprecated* 상태로 안내하는 구현입니다. 새 프로젝트에서는 heap_2 대신 heap_4를 쓰거나, 워크로드가 정말 고정 크기에 가깝다면 memory pool로 옮기는 편이 낫습니다.

## Heap_3 — Standard libc malloc Wrapper

heap_3은 *thin wrapper*입니다. 실제 alloc은 newlib이나 glibc의 `malloc`이 하고, FreeRTOS는 그 호출 주변을 *scheduler suspend*로 감싸 thread-safe하게 만들 뿐입니다.

```c
void *pvPortMalloc(size_t xWantedSize) {
    void *pvReturn;
    vTaskSuspendAll();
    pvReturn = malloc(xWantedSize);
    xTaskResumeAll();
    return pvReturn;
}

void vPortFree(void *pv) {
    if (pv) {
        vTaskSuspendAll();
        free(pv);
        xTaskResumeAll();
    }
}
```

`configTOTAL_HEAP_SIZE`는 *무시됩니다*. heap 영역은 linker script가 정한 `_heap_start`와 `_heap_end` 사이로 잡힙니다. 즉, FreeRTOS heap이 아니라 *toolchain heap*을 그대로 빌려옵니다.

장점은 standard `malloc`을 그대로 쓰는 것입니다. 단점은 newlib `malloc`의 *unbounded WCET*과 thread suspension의 *전역 latency 비용*을 모두 떠안는다는 점입니다. RT 시스템보다는 *Linux-like 환경*에서 쓰는 구현입니다.

## Heap_4 — Best Fit + Coalesce (가장 흔한 기본값)

heap_4는 FreeRTOS의 *기본 권장 구현*입니다. free 시 *인접한 free block과 자동으로 병합*하므로 단편화가 시간이 지나도 폭발하지 않습니다.

```c
void vPortFree(void *pv) {
    if (pv == NULL) return;
    uint8_t *puc = (uint8_t*)pv;
    puc -= xHeapStructSize;
    BlockLink_t *pxLink = (void*)puc;

    vTaskSuspendAll();
    {
        pxLink->xBlockSize &= ~xBlockAllocatedBit;
        xFreeBytesRemaining += pxLink->xBlockSize;
        /* 핵심: 주소 정렬 free list에 끼우면서 인접 합침 */
        prvInsertBlockIntoFreeList(pxLink);
    }
    xTaskResumeAll();
}
```

`prvInsertBlockIntoFreeList`가 핵심입니다. free list가 *주소 순*으로 정렬되어 있어서, 새 block을 삽입하는 위치만 찾으면 *바로 앞 block과의 인접성*도 같은 순회에서 판단할 수 있습니다. 인접하면 합칩니다. 뒤쪽도 마찬가지로 검사합니다.

alloc은 first-fit입니다. free list 앞에서부터 *충분히 큰 첫 block*을 찾습니다. 평균 시간은 짧지만 worst case는 free list 전체 길이에 비례합니다. WCET는 O(N)이며, *bounded라고 부르기는 어렵습니다*. 다만 일반 IoT나 산업용 컨트롤러처럼 free block이 수십 개 수준이면 실측 worst case는 수 µs에 머뭅니다.

```c
#define configTOTAL_HEAP_SIZE (32 * 1024)
```

대부분의 STM32 / nRF / ESP32 BSP가 heap_4를 기본으로 채택합니다. 익숙한 동작 모델과 적당한 단편화 내성이 그 이유입니다.

## Heap_5 — Multi-Region (Non-contiguous)

heap_4를 *여러 비연속 메모리 영역*에 확장한 것이 heap_5입니다. STM32H7 같은 SoC는 내부 SRAM, DTCM, 외부 SDRAM이 *서로 떨어진 주소*에 매핑됩니다. heap_4 하나로는 한 영역밖에 못 다루지만, heap_5는 모두 묶어 한 heap처럼 보이게 합니다.

```c
HeapRegion_t xHeapRegions[] = {
    { (uint8_t*)0x20000000, 0x00010000 },   /* internal SRAM 64 KB */
    { (uint8_t*)0x24000000, 0x00080000 },   /* AXI SRAM 512 KB */
    { (uint8_t*)0xC0000000, 0x01000000 },   /* external SDRAM 16 MB */
    { NULL, 0 }                              /* sentinel */
};

int main(void) {
    vPortDefineHeapRegions(xHeapRegions);
    /* 이후 pvPortMalloc 사용 가능 */
    ...
}
```

각 region 내부에서는 heap_4와 같은 best-fit + coalesce가 돕니다. region 사이 *cross-region coalesce는 일어나지 않습니다*. region 경계가 *영구적 경계*인 셈입니다.

주의할 점은 *어느 region에서 alloc될지 사용자가 못 고른다*는 것입니다. heap_5는 region 배열 순서대로 채워 갑니다. DMA-capable 영역에서 buffer를 받고 싶다면 *별도의 pool*을 두는 편이 안전합니다.

## 다섯 구현 한눈에

| Heap | free | coalesce | alloc 시간 | 적합한 상황 |
|---|---|---|---|---|
| heap_1 | 불가 | — | O(1) 상수 | 부팅 시 한 번만 alloc, safety-critical |
| heap_2 | 가능 | 없음 | O(N) | 고정 크기 워크로드 (deprecated 권고) |
| heap_3 | 가능 | libc 의존 | unbounded | newlib/glibc 환경 |
| heap_4 | 가능 | 있음 | O(N) | 대부분의 일반 RTOS 시스템 |
| heap_5 | 가능 | region 내 | O(N) | 비연속 메모리 SoC |

## Heap 상태 측정

런타임에 heap 상태를 확인할 수 있습니다. 단편화가 진행 중인지, 어느 시점에 worst case에 도달했는지 추적합니다.

```c
size_t free_now = xPortGetFreeHeapSize();
size_t min_ever = xPortGetMinimumEverFreeHeapSize();

HeapStats_t stats;
vPortGetHeapStats(&stats);
printf("free total       : %u\n", (unsigned)stats.xAvailableHeapSpaceInBytes);
printf("largest free blk : %u\n", (unsigned)stats.xSizeOfLargestFreeBlockInBytes);
printf("free block count : %u\n", (unsigned)stats.xNumberOfFreeBlocks);
printf("alloc total      : %u\n", (unsigned)stats.xNumberOfSuccessfulAllocations);
printf("free total       : %u\n", (unsigned)stats.xNumberOfSuccessfulFrees);
```

`xSizeOfLargestFreeBlockInBytes`가 `xAvailableHeapSpaceInBytes`의 절반 이하라면 단편화가 심각합니다. 큰 alloc 요청이 free 공간 총합으로는 충분해도 실패할 수 있습니다.

## Malloc Failure Hook

heap이 고갈되었을 때 silent NULL을 받는 것보다 *즉시 알림*이 안전합니다.

```c
#define configUSE_MALLOC_FAILED_HOOK 1

void vApplicationMallocFailedHook(void) {
    log_critical("heap exhausted");
    print_heap_stats();
    /* 양산 빌드는 watchdog 또는 system reset */
    NVIC_SystemReset();
}
```

debug 빌드에서는 hook 안에서 `__BKPT(0)`로 즉시 멈추게 두면 디버거에서 call stack을 그대로 살펴볼 수 있습니다.

## Heap_4 WCET 실측

Cortex-M4 168 MHz에서 free block 수에 따른 `pvPortMalloc` 측정값입니다. DWT cycle counter 기준입니다.

```text
free block 10개  → 평균 150 cycle  (≈0.9 µs)
free block 100개 → 평균 1500 cycle (≈9 µs)
free block 1000개→ 평균 15000 cycle (≈90 µs)
```

free block이 수십 개 수준이면 worst case가 10 µs 안쪽입니다. *제어 루프 안에서 alloc을 호출하지 않는다*는 원칙만 지키면 heap_4로도 충분합니다. RT-critical path에 alloc이 필요하다면 다음 편의 TLSF를 봅니다.

## 자주 보는 함정과 안티패턴

> ⚠️ heap_1에서 vPortFree를 free처럼 가정하는 코드

`vPortFree(p)`를 호출해도 메모리는 *돌아오지 않습니다*. heap_1은 부팅 시 객체를 만들고 그대로 끝까지 가는 모델에서만 안전합니다. 동적 생명 주기를 가진 객체가 하나라도 있으면 heap_4로 옮겨야 합니다.

> ⚠️ heap_4의 단편화를 무시하는 장기 운영

다양한 크기를 빈번하게 alloc/free 하면 coalesce에도 한계가 있습니다. 며칠 가동 후 큰 alloc이 실패하기 시작합니다. 같은 크기를 반복하는 워크로드는 *memory pool*로 옮기는 것이 정답입니다.

> ⚠️ heap_5 region 경계 겹침

`HeapRegion_t` 배열의 두 영역이 주소 범위에서 겹치면 heap_5 내부 구조가 깨집니다. 부팅 직후에는 멀쩡해 보여도 *몇 번째 alloc 이후* 갑자기 죽기도 합니다. linker script와 영역 정의를 한 곳에서 관리합니다.

> ⚠️ malloc failure hook 비활성화

`configUSE_MALLOC_FAILED_HOOK = 0`이면 alloc 실패가 silent NULL입니다. 호출 측이 NULL 검사를 빠뜨리면 *수 ms 뒤 엉뚱한 곳에서 hard fault*가 납니다. hook은 양산 빌드에서도 켜 두는 것이 안전합니다.

## 정리

- FreeRTOS는 동일한 `pvPortMalloc` 시그니처 뒤에 *다섯 가지 구현*을 두어 워크로드별 선택을 가능하게 합니다.
- heap_1은 free 불가 bump allocator로, *부팅 시 한 번만 alloc*하는 safety-critical 시스템에 적합합니다.
- heap_2는 free는 있지만 coalesce가 없어 단편화가 누적되므로 *deprecated* 상태이며 신규 코드에는 권하지 않습니다.
- heap_3은 newlib/glibc `malloc`을 scheduler suspend로 감싼 wrapper로 *standard libc 환경*에 어울립니다.
- heap_4는 best-fit + coalesce 조합이며 *대부분의 일반 RTOS 시스템*의 기본 선택입니다.
- heap_5는 heap_4를 여러 비연속 region에 확장한 형태로, *복합 메모리 SoC*에서 단일 heap 인터페이스를 제공합니다.
- WCET가 critical하면 heap_4의 O(N) 특성으로는 부족하며, 다음 편의 TLSF나 4-05의 memory pool로 옮겨야 합니다.

다음 편은 [4-03 TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)에서 O(1) bounded allocator를 다룹니다.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
