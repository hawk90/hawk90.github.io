---
title: "FreeRTOS Heap_1~5 분석 — 5종 Allocator의 구조와 트레이드오프"
slug: "embedded/rtos/practical-internals/part4-02-freertos-heap"
date: 2026-05-07T09:34:00
description: "FreeRTOS가 제공하는 다섯 가지 heap 구현을 source 수준에서 비교합니다. heap_1의 bump부터 heap_5의 multi-region까지, 실시간성과 단편화 관점에서 어떤 워크로드에 어떤 구현이 맞는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 34
tags: [freertos, heap, allocator]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"FreeRTOS는 한 가지 `pvPortMalloc`을 다섯 가지 정책으로 구현해 둡니다."** — workload와 safety 요구에 맞춰 한 파일만 골라 빌드합니다.

## 어떤 문제를 푸는가

임베디드 워크로드는 다양합니다. 부팅 시에만 객체를 만드는 시스템도 있고, IoT 게이트웨이처럼 packet과 message 객체가 계속 들고나는 시스템도 있습니다. 한 구현으로 모두 만족시키기는 어렵습니다.

FreeRTOS는 이 문제를 *컴파일 타임 선택*으로 풉니다. `pvPortMalloc`과 `vPortFree`의 시그니처를 고정해 두고, 그 뒤에 다섯 가지 구현(`heap_1.c` ~ `heap_5.c`) 중 하나를 링크하게 합니다. 사용자 코드는 한 줄도 안 바꿔도 됩니다.

각 구현은 *free 지원 여부*, *coalesce 정책*, *contiguous 가정* 세 축으로 갈라집니다. 이 글은 **FreeRTOS V11.2.0**을 기준으로 각 구현의 핵심 알고리즘과 WCET 특성, 그리고 어느 시스템에 어느 구현을 골라야 하는지 정리합니다.

## Heap_1 — Bump Allocator, free 없음

heap_1은 정렬한 요청을 연속 heap의 다음 위치에 배치하고 index를 전진시킵니다. 정렬 padding·사용하지 못하는 꼬리 등은 남으므로 모든 메모리 낭비가 0인 것은 아닙니다. 요청 크기의 overflow 검사도 실제 구현의 일부입니다.

**V11.2.0 vPortFree는 non-NULL 반환을 지원하지 않고 configASSERT(pv == NULL)를 검사합니다.** assertion이 활성화돼 있으면 잘못된 free 호출이 중단될 수 있으며 silent no-op 계약으로 사용하면 안 됩니다. 할당 후 영구 보유하는 수명 모델에 맞춰 선택합니다.

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

heap_2는 현재 소스에도 포함되어 있지만 coalesce가 없는 기존 정책입니다. 공식 문서의 revision 없이 제거 예정·정식 deprecation으로 단정하지 않습니다. 새 프로젝트에서는 heap_2 대신 heap_4를 쓰거나, 워크로드가 정말 고정 크기에 가깝다면 memory pool로 옮기는 편이 낫습니다.

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

`configTOTAL_HEAP_SIZE`는 *무시됩니다*. 실제 영역과 확장 정책은 toolchain·libc·system call 구현에 달려 있습니다. 고정된 linker symbol 이름을 모든 target에 적용하지 않습니다. 즉, FreeRTOS heap이 아니라 *toolchain heap*을 그대로 빌려옵니다.

장점은 standard `malloc`을 그대로 쓰는 것입니다. 단점은 libc의 동작·synchronization과 scheduler suspend 구간을 함께 분석해야 한다는 점입니다. wrapper가 직접 libc를 쓰는 다른 경로나 ISR·SMP까지 모두 직렬화한다고 가정하지 않습니다.

## Heap_4 — First Fit + Coalesce

heap_4는 주소순 free list에서 first-fit으로 탐색하고 인접 free block을 합칩니다. coalesce가 모든 external fragmentation이나 장기 운영의 실패를 없애지는 않습니다.

원본은 header의 allocated bit·next pointer 등 유효 조건을 확인하고 heapFREE_BLOCK과 prvInsertBlockIntoFreeList 경로를 사용합니다. 이 검사를 생략하거나 다른 버전의 xBlockAllocatedBit 변수를 복사한 free 함수를 사용하지 않습니다.

`prvInsertBlockIntoFreeList`가 핵심입니다. free list가 *주소 순*으로 정렬되어 있어서, 새 block을 삽입하는 위치만 찾으면 *바로 앞 block과의 인접성*도 같은 순회에서 판단할 수 있습니다. 인접하면 합칩니다. 뒤쪽도 마찬가지로 검사합니다.

alloc은 first-fit입니다. free list 앞에서부터 *충분히 큰 첫 block*을 찾습니다. 평균 시간은 짧지만 worst case는 free list 전체 길이에 비례합니다. 작업 수는 free-list 길이에 의존합니다. 고정된 heap의 최대 block 수로 상한 분석이 가능할 수 있지만, 평균이나 특정 관찰 max를 전체 WCET로 부르지는 않습니다.

```c
#define configTOTAL_HEAP_SIZE (32 * 1024)
```

BSP마다 선택 allocator가 다르므로 실제 link map과 build 설정을 확인합니다. 특히 ESP-IDF의 heap-capability allocator를 upstream heap_4와 동일시하지 않습니다.

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

각 region 내부에서는 heap_4와 같은 first-fit + coalesce가 돕니다. region 사이 *cross-region coalesce는 일어나지 않습니다*. region 경계가 *영구적 경계*인 셈입니다.

주의할 점은 *어느 region에서 alloc될지 사용자가 못 고른다*는 것입니다. region은 주소순으로 정렬하고 겹치지 않게 정의해야 합니다. 주소순 free list에서 요청을 만족하는 첫 block을 찾는 것이며 한 region을 항상 다 채운다는 뜻은 아닙니다. DMA-capable 영역에서 buffer를 받고 싶다면 *별도의 pool*을 두는 편이 안전합니다.

## 다섯 구현 한눈에

| Heap | free | coalesce | alloc 시간 | 적합한 상황 |
|---|---|---|---|---|
| heap_1 | 불가 | — | O(1) 상수 | 부팅 시 한 번만 alloc, safety-critical |
| heap_2 | 가능 | 없음 | O(N) | coalesce 불필요한지 검토 |
| heap_3 | 가능 | libc 의존 | libc·동기화 의존 | newlib/glibc 환경 |
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

원하는 요청 크기·header·alignment와 최대 free block을 비교합니다. 비율 절반이라는 수치는 보편적인 심각도 기준이 아닙니다. 큰 alloc 요청이 free 공간 총합으로는 충분해도 실패할 수 있습니다.

## Malloc Failure Hook

configUSE_MALLOC_FAILED_HOOK을 켠 heap 구현은 실패 시 hook을 호출할 수 있지만 caller의 NULL 처리도 필요합니다. hook 문맥과 scheduler 상태를 확인하며 로그·다시 할당하는 함수·blocking 처리를 무조건 넣지 않습니다. reset 여부는 제품의 안전 상태와 복구 정책으로 결정합니다.

## Heap_4 기능과 시간 검증

다음은 **heap_2 또는 heap_4 하나를 연결한 호스트 기능 검사**입니다. test heap을 64 KiB로 구성하고 assert를 켭니다. 여러 512-byte block으로 고갈시킨 뒤 인접한 두 block을 반환하고 900-byte 요청이 coalesce 여부에 따라 달라지는지 확인합니다. 실보드 WCET benchmark는 아닙니다.

```c title="heap-coalesce-check.c"
#include <assert.h>
#include <stddef.h>
#include "FreeRTOS.h"
#include "portable.h"
void check_heap_coalescing(int expect_coalesce) {
    void *blocks[256]; size_t count = 0;
    while (count < 256 && (blocks[count] = pvPortMalloc(512)) != NULL)
        ++count;
    assert(count > 2 && count < 256);
    vPortFree(blocks[0]); vPortFree(blocks[1]);
    void *large = pvPortMalloc(900);
    assert((large != NULL) == (expect_coalesce != 0));
    if (large != NULL) vPortFree(large);
    for (size_t i = 2; i < count; ++i) vPortFree(blocks[i]);
}
```

실측에는 target·compiler·heap 이력·최대 free-list·lock·trace 조건이 필요합니다. 출처 없는 150/1500/15000 cycle을 실측값으로 사용하지 않습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ heap_1에서 vPortFree를 free처럼 가정하는 코드

`vPortFree(p)`를 호출해도 메모리는 *돌아오지 않습니다*. heap_1은 부팅 시 객체를 만들고 그대로 끝까지 가는 모델에서만 안전합니다. 동적 생명 주기를 가진 객체가 하나라도 있으면 heap_4로 옮겨야 합니다.

> ⚠️ heap_4의 단편화를 무시하는 장기 운영

다양한 크기를 빈번하게 alloc/free 하면 coalesce에도 한계가 있습니다. 며칠 가동 후 큰 alloc이 실패하기 시작합니다. 같은 크기를 반복하는 워크로드는 *memory pool*로 옮기는 것이 정답입니다.

> ⚠️ heap_5 region 경계 겹침

`HeapRegion_t` 배열의 두 영역이 주소 범위에서 겹치면 heap_5 내부 구조가 깨집니다. 부팅 직후에는 멀쩡해 보여도 *몇 번째 alloc 이후* 갑자기 죽기도 합니다. linker script와 영역 정의를 한 곳에서 관리합니다.

> ⚠️ malloc failure hook 비활성화

hook 유무와 별개로 caller는 NULL과 제품의 실패 정책을 처리해야 합니다. 오류가 나타나는 시점과 형태를 고정된 ms·fault로 단정하지 않습니다.

## 정리

- FreeRTOS는 동일한 `pvPortMalloc` 시그니처 뒤에 *다섯 가지 구현*을 두어 워크로드별 선택을 가능하게 합니다.
- heap_1은 free 불가 bump allocator로, *부팅 시 한 번만 alloc*하는 safety-critical 시스템에 적합합니다.
- heap_2는 free를 지원하지만 coalesce하지 않으므로 큰 연속 요청의 실패 조건을 검토해야 합니다.
- heap_3은 newlib/glibc `malloc`을 scheduler suspend로 감싼 wrapper로 *standard libc 환경*에 어울립니다.
- heap_4는 first-fit + coalesce 정책이며 workload와 시간·실패 분석에 맞춰 선택합니다.
- heap_5는 heap_4를 여러 비연속 region에 확장한 형태로, *복합 메모리 SoC*에서 단일 heap 인터페이스를 제공합니다.
- WCET가 critical하면 heap_4의 O(N) 특성으로는 부족하며, 다음 편의 TLSF나 4-05의 memory pool로 옮겨야 합니다.

다음 편은 [4-03 TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)에서 O(1) bounded allocator를 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 heap_1~5](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/MemMang): 해당 함수·검사·탐색·region 정의.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)

V11.2.0 heap_5의 vPortGetHeapStats는 중간 region의 zero-size 연결 marker도 xNumberOfFreeBlocks에 셉니다. 이 값만으로 실제 할당 가능한 free extent 수를 추정하지 말고 largest block·total과 소스를 함께 확인합니다.
