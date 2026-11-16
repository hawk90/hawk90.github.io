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

부팅 때 객체를 다 만들고 끝까지 쓰는 시스템이 있고, packet과 message 객체가 계속 들고나는 시스템도 있습니다. 앞쪽에는 반납이 없는 가장 단순한 allocator가 맞고, 뒤쪽에는 반납과 병합이 필요합니다. 이사할 때 짐을 트럭 앞에서부터 차곡차곡 싣기만 하면 되는 경우와, 짐을 내렸다 실었다 하며 빈 공간을 계속 메워야 하는 경우의 차이입니다.

FreeRTOS는 이 문제를 *컴파일 타임 선택*으로 풉니다. `pvPortMalloc`과 `vPortFree`의 시그니처를 고정해 두고, 그 뒤에 다섯 가지 구현(`heap_1.c` ~ `heap_5.c`) 중 하나를 링크하게 합니다. 사용자 코드는 한 줄도 안 바꿔도 됩니다.

각 구현은 *free 지원 여부*, *coalesce 정책*, *contiguous 가정* 세 축으로 갈라집니다. 이 글은 **FreeRTOS V11.2.0**(commit `0adc196d`)의 `portable/MemMang/heap_N.c`를 읽고, heap_1·2·4·5를 같은 테스트 프로그램으로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 결과로 차이를 확인합니다(`ARM_CM3` 포트, `arm-none-eabi-gcc` 16.2.0, `configTOTAL_HEAP_SIZE` 65536). heap_3은 이 툴체인에 C 라이브러리 `malloc()`이 없어 돌리지 않았습니다.

## Heap_1 — Bump Allocator, free 없음

heap_1의 `pvPortMalloc()`(`heap_1.c:79`)은 요청을 `portBYTE_ALIGNMENT`(이 포트에서 8)로 올린 뒤 다음 위치를 돌려주고 index를 전진시킵니다. header가 없어서 100 byte 요청은 104 byte, 1 byte 요청은 8 byte만 씁니다. 탐색이 없으니 시간도 요청 크기와 무관합니다.

**V11.2.0 `vPortFree()`는 non-NULL 포인터를 받지 않습니다.** 본문은 `configASSERT(pv == NULL)` 한 줄입니다(`heap_1.c:151`). 실제로 넘기면 멈춥니다.

```text
heap_1, configTOTAL_HEAP_SIZE=65536, portBYTE_ALIGNMENT=8
  pvPortMalloc(100) consumed 104 bytes
  pvPortMalloc(1) consumed 8 bytes
  vPortFree(non-NULL) on heap_1:
ASSERT FAIL pv == NULL at ../src/freertos-V11.2.0/portable/MemMang/heap_1.c:151
```

assert를 끈 빌드에서는 조용히 아무 일도 하지 않으므로, 반납이 있는 코드에 heap_1을 쓰면 메모리가 새는데도 알아채기 어렵습니다.

## Heap_2 — Best Fit, Coalesce 없음

heap_2는 free를 지원합니다. 다만 *인접 block과 합치지(coalesce) 않습니다*. free list는 size 오름차순으로 정렬되어 있고, alloc 시 *가장 작게 들어맞는* block을 고릅니다.

탐색 부분은 `heap_2.c:222-231`에 있습니다. free list가 크기순이라 앞에서부터 처음 맞는 block이 곧 best fit입니다.

```c
/* heap_2.c:222-231 (V11.2.0) */
/* Blocks are stored in byte order - traverse the list from the start
 * (smallest) block until one of adequate size is found. */
pxPreviousBlock = &xStart;
pxBlock = xStart.pxNextFreeBlock;

while( ( pxBlock->xBlockSize < xWantedSize ) && ( pxBlock->pxNextFreeBlock != NULL ) )
{
    pxPreviousBlock = pxBlock;
    pxBlock = pxBlock->pxNextFreeBlock;
}
```

반납은 `prvInsertBlockIntoFreeList()` 매크로(`heap_2.c:135`)가 크기순 위치에 끼워 넣을 뿐, 이웃 block과 합치지 않습니다. 파일 머리 주석(`heap_2.c:29-33`)도 "does not combine adjacent free blocks into a single larger block (and so will fragment memory)"라고 적고 같은 일을 병합까지 하는 구현으로 heap_4를 가리킵니다.

글 아래쪽의 `check_heap_coalescing()`이 이 차이를 직접 보여 줍니다. 512 byte block으로 heap을 채운 뒤 이웃한 두 block을 반납하고 900 byte를 요청하면, heap_2에서는 실패합니다. heap_2는 현재 소스에 남아 있지만, 크기가 섞이는 workload라면 heap_4가 같은 API에 병합까지 해 줍니다.

## Heap_3 — Standard libc malloc Wrapper

heap_3은 *thin wrapper*입니다. 실제 alloc은 newlib이나 glibc의 `malloc`이 하고, FreeRTOS는 그 호출 주변을 *scheduler suspend*로 감싸 thread-safe하게 만들 뿐입니다.

```c
/* heap_3.c:59-96 (V11.2.0) 요약, trace 매크로 생략 */
void * pvPortMalloc( size_t xWantedSize )
{
    void * pvReturn;
    vTaskSuspendAll();
    {
        pvReturn = malloc( xWantedSize );
    }
    ( void ) xTaskResumeAll();
    #if ( configUSE_MALLOC_FAILED_HOOK == 1 )
        if( pvReturn == NULL ) vApplicationMallocFailedHook();
    #endif
    return pvReturn;
}

void vPortFree( void * pv )
{
    if( pv != NULL )
    {
        vTaskSuspendAll();
        free( pv );
        ( void ) xTaskResumeAll();
    }
}
```

heap_3.c에는 `ucHeap` 배열이 없으므로 `configTOTAL_HEAP_SIZE`는 쓰이지 않습니다. 파일 머리 주석(`heap_3.c:30-34`)은 "linker가 heap 영역을 만들도록 설정된 경우에만" 쓸 수 있다고 적습니다. 즉, FreeRTOS heap이 아니라 *toolchain heap*을 그대로 빌려옵니다.

보호 범위도 코드 그대로입니다. `vTaskSuspendAll()`은 다른 task로의 전환만 막으므로, 이 wrapper를 거치지 않고 libc `malloc()`을 직접 부르는 코드(예: libc 내부의 `printf()`)나 ISR과의 경쟁은 막지 않습니다. 이 툴체인(Homebrew `arm-none-eabi-gcc` 16.2.0)에는 C 라이브러리가 없어 heap_3은 돌리지 않았습니다.

## Heap_4 — First Fit + Coalesce

heap_4는 주소순 free list에서 first-fit으로 탐색하고(`heap_4.c:248`) 반납할 때 인접 free block을 합칩니다. 그래도 살아 있는 block이 사이에 끼면 합칠 이웃이 없어서 external fragmentation은 남습니다(아래 실행).

V11.2.0의 allocated 표시는 별도 변수가 아니라 `xBlockSize`의 최상위 bit입니다. `heapALLOCATE_BLOCK`·`heapFREE_BLOCK`·`heapBLOCK_IS_ALLOCATED` 매크로가 그 bit를 다룹니다(`heap_4.c:82-84`). `vPortFree()`는 포인터가 `ucHeap` 안인지, allocated bit가 켜졌는지, next 포인터가 NULL인지 차례로 `configASSERT`한 뒤(`:368-370`) bit를 지우고 `prvInsertBlockIntoFreeList()`(`:504`)로 넘깁니다. 예전 판의 `xBlockAllocatedBit` 변수는 V11.2.0에 없습니다.

`prvInsertBlockIntoFreeList`가 핵심입니다. free list가 *주소 순*으로 정렬되어 있어서, 새 block을 삽입하는 위치만 찾으면 *바로 앞 block과의 인접성*도 같은 순회에서 판단할 수 있습니다. 인접하면 합칩니다. 뒤쪽도 마찬가지로 검사합니다.

alloc은 first-fit입니다. free list 앞에서부터 *충분히 큰 첫 block*을 찾으므로, 탐색 횟수는 최대 그 순간의 free block 수입니다. 아래 실행에서 free block은 1개에서 54개까지 변했고, 54개 상태에서 실패한 2000 byte 요청은 54개를 모두 훑고 나서 NULL을 돌려줬습니다. heap 크기가 고정이면 free block 수의 최댓값도 정해지므로 상한은 계산할 수 있습니다.

1000 byte와 96 byte를 번갈아 heap이 찰 때까지 할당한 뒤 1000 byte 쪽만 반납하고, 이어서 전부 반납했습니다.

```text
heap_4, configTOTAL_HEAP_SIZE=65536, portBYTE_ALIGNMENT=8
  pvPortMalloc(100) consumed 112 bytes
  pvPortMalloc(1) consumed 16 bytes
  check_heap_coalescing(expect_coalesce=1): passed
  fresh                      avail=59832 largest=59832 smallest=59832 freeblocks=1 min_ever=32
  allocated 106 blocks (1000/96 alternating) until NULL
  heap exhausted             avail=896 largest=896 smallest=896 freeblocks=1 min_ever=32
  after freeing every 1000   avail=54320 largest=1008 smallest=896 freeblocks=54 min_ever=32
  pvPortMalloc(2000) -> NULL (fragmented)
  after freeing all          avail=59832 largest=59832 smallest=59832 freeblocks=1 min_ever=32
```

100 byte 요청이 112 byte를 쓰는 것은 8 byte header 때문이고, 1 byte가 16 byte인 것은 최소 block 크기 `heapMINIMUM_BLOCK_SIZE = xHeapStructSize << 1`(`heap_4.c:59`) 때문입니다. fresh 상태가 65536이 아니라 59832인 것은 제어 task의 stack과 TCB, timer task가 이미 heap에서 나갔기 때문입니다. 마지막 줄에서 다시 block 하나로 돌아온 것이 coalesce의 증거입니다.

## Heap_5 — Multi-Region (Non-contiguous)

heap_4를 *여러 비연속 메모리 영역*에 확장한 것이 heap_5입니다. 내부 SRAM과 외부 SDRAM처럼 주소가 떨어진 RAM이 여럿인 MCU에서, heap_4 하나로는 한 영역밖에 못 다루지만 heap_5는 모두 묶어 한 heap처럼 보이게 합니다. 파일 머리 주석(`heap_5.c:39-40`)대로 `vPortDefineHeapRegions()`를 `pvPortMalloc()`보다 먼저 불러야 합니다.

실험에서는 32 KiB와 16 KiB 두 개, 세 static 배열을 region으로 넘겼습니다. 먼저 linker가 배치한 주소 그대로(내림차순) 넘겨 봤습니다.

```text
region 0 at 0x2000c408 size 16384
region 1 at 0x20008408 size 16384
region 2 at 0x20000408 size 32768
ASSERT FAIL ( size_t ) xAddress > ( size_t ) pxEnd at ../src/freertos-V11.2.0/portable/MemMang/heap_5.c:607
```

`heap_5.c:607`은 region이 시작 주소 오름차순인지 검사합니다. 배열 선언 순서가 주소 순서라는 보장은 없으므로, 주소로 정렬해서 넘깁니다.

```c
HeapRegion_t regions[] = { { r1, sizeof r1 }, { r2, sizeof r2 }, { r3, sizeof r3 }, { NULL, 0 } };
/* 시작 주소 오름차순으로 정렬 */
for (int i = 0; i < 3; i++)
    for (int j = i + 1; j < 3; j++)
        if (regions[j].pucStartAddress < regions[i].pucStartAddress) {
            HeapRegion_t t = regions[i]; regions[i] = regions[j]; regions[j] = t;
        }
vPortDefineHeapRegions(regions);
```

정렬 뒤 heap_4와 같은 시험을 돌린 결과입니다.

```text
region 0 at 0x20000408 size 32768
region 1 at 0x20008408 size 16384
region 2 at 0x2000c408 size 16384
heap_5, configTOTAL_HEAP_SIZE=65536, portBYTE_ALIGNMENT=8
  pvPortMalloc(100) consumed 112 bytes
  pvPortMalloc(1) consumed 16 bytes
  fresh                      avail=59824 largest=27072 smallest=16376 freeblocks=5 min_ever=59696
  allocated 106 blocks (1000/96 alternating) until NULL
  heap exhausted             avail=880 largest=808 smallest=72 freeblocks=4 min_ever=880
  after freeing every 1000   avail=54304 largest=4032 smallest=72 freeblocks=54 min_ever=880
  pvPortMalloc(2000) -> ok
  after freeing all          avail=59824 largest=27072 smallest=16376 freeblocks=4 min_ever=880
```

세 배열은 실제로 주소가 맞붙어 있는데도, 전부 반납한 뒤 가장 큰 block은 첫 region의 남은 크기 27072에 머뭅니다. 각 region 끝에 크기 0인 연결 block(`pxEnd`, `heap_5.c:629-631`)이 놓이므로 region 사이는 합쳐지지 않습니다. 출력 첫 줄의 `configTOTAL_HEAP_SIZE`는 테스트 프로그램이 찍은 설정값일 뿐 heap_5는 이 값을 쓰지 않습니다. 실제 총량은 region 크기의 합입니다.

어느 region에서 할당될지는 사용자가 고르지 못합니다. 주소순 free list에서 처음 맞는 block이 선택됩니다. DMA가 접근할 수 있는 영역에서만 buffer를 받아야 한다면 그 영역은 heap_5에 넣지 말고 별도 pool로 관리합니다.

## 다섯 구현 한눈에

| Heap | free | coalesce | alloc 시간 | 적합한 상황 |
|---|---|---|---|---|
| heap_1 | 불가 (`configASSERT`) | — | 탐색 없음 | 부팅 때만 할당하고 반납하지 않는 시스템 |
| heap_2 | 가능 | 없음 | free block 수에 비례 (best fit) | 같은 크기만 반복하는 workload |
| heap_3 | 가능 | libc에 따름 | libc에 따름 | linker가 heap 영역을 만드는 libc 환경 |
| heap_4 | 가능 | 있음 | free block 수에 비례 (first fit) | 크기가 섞이는 일반 workload |
| heap_5 | 가능 | region 안에서만 | free block 수에 비례 (first fit) | 주소가 떨어진 RAM이 여럿인 MCU |

## Heap 상태 측정

런타임에 heap 상태를 확인합니다. 단편화가 진행 중인지, 어느 시점에 가장 비었었는지 추적합니다. `vPortGetHeapStats()`는 heap_4(`heap_4.c:572`)와 heap_5(`heap_5.c:672`)에만 있습니다.

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

요청이 성공할지는 `xSizeOfLargestFreeBlockInBytes`가 요청 크기 + 8 byte header를 넘는지로 봅니다. 앞의 heap_4 실행처럼 총량이 54320 byte여도 가장 큰 block이 1008 byte면 2000 byte 요청은 실패합니다.

## Malloc Failure Hook

`configUSE_MALLOC_FAILED_HOOK 1`이면 heap_4는 할당 실패 시 `vApplicationMallocFailedHook()`을 부릅니다(`heap_4.c:340`). 이 호출은 `xTaskResumeAll()` 뒤라 scheduler는 다시 돌고 있지만, 실패한 `pvPortMalloc()`을 부른 task의 문맥입니다. hook이 돌아오면 caller는 여전히 NULL을 받으므로 caller 쪽 NULL 처리도 필요합니다.

## Heap_4 기능과 시간 검증

다음은 **heap_2 또는 heap_4 하나를 연결한 기능 검사**입니다. test heap을 64 KiB로 구성하고 assert를 켭니다. 512 byte block으로 고갈시킨 뒤 인접한 두 block을 반환하고, 900 byte 요청이 coalesce 여부에 따라 달라지는지 확인합니다.

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

heap_2에는 `expect_coalesce=0`, heap_4에는 `1`을 넘겨 QEMU에서 돌렸고, 두 빌드 모두 assert를 통과했습니다.

```text
  check_heap_coalescing(expect_coalesce=0): passed
  check_heap_coalescing(expect_coalesce=1): passed
```

이 글에서는 사이클을 재지 않았습니다. 이 커널을 올린 실보드가 없어, 예전 판의 "150/1500/15000 cycle"은 출처가 없어 지웠습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ heap_1에서 vPortFree를 free처럼 가정하는 코드

`vPortFree(p)`는 assert를 켜면 멈추고(위 실행), 끄면 아무 일도 하지 않아 메모리가 돌아오지 않습니다. heap_1은 부팅 시 객체를 만들고 그대로 끝까지 가는 모델에만 맞습니다. 반납되는 객체가 하나라도 있으면 heap_4로 옮깁니다.

> ⚠️ heap_4의 단편화를 무시하는 장기 운영

coalesce는 이웃이 비어 있을 때만 합칩니다. 앞의 실행처럼 오래 사는 작은 block이 사이사이 끼어 있으면 총량이 충분해도 큰 요청이 실패합니다. `xSizeOfLargestFreeBlockInBytes`를 주기적으로 기록해 줄어드는 추세를 봅니다. 같은 크기를 반복하는 객체는 memory pool(4-05)로 옮깁니다.

> ⚠️ heap_5 region 경계 겹침

`heap_5.c:607`의 assert는 새 region의 시작 주소가 앞 region 끝에 둔 marker(`pxEnd`)보다 큰지 봅니다. 순서가 틀리거나 앞 region과 겹치면 시작 주소가 그 marker 이하가 되므로 앞의 실행처럼 걸립니다. assert를 끈 빌드에서는 이 검사가 사라지므로, region은 linker script의 심볼로 정의해 linker가 겹침을 막게 합니다.

> ⚠️ malloc failure hook 비활성화

hook이 꺼져 있으면 실패는 NULL 반환으로만 드러나고, NULL을 검사하지 않은 caller는 그 포인터를 그대로 씁니다. hook을 켜 두면 실패한 바로 그 호출에서 알 수 있습니다.

## 정리

- FreeRTOS는 동일한 `pvPortMalloc` 시그니처 뒤에 *다섯 가지 구현*을 두어 워크로드별 선택을 가능하게 합니다.
- heap_1은 반납이 없는 bump allocator이고, non-NULL `vPortFree()`는 `heap_1.c:151`의 assert에 걸립니다.
- heap_2는 반납은 되지만 병합하지 않아, 이웃한 두 512 byte block을 반납해도 900 byte가 실패합니다.
- heap_3은 libc `malloc()`을 scheduler suspend로 감싼 wrapper이고 `configTOTAL_HEAP_SIZE`를 쓰지 않습니다.
- heap_4는 first fit + coalesce이고, 100 byte 요청에 112 byte를 씁니다. 살아 있는 block이 끼면 병합되지 않습니다.
- heap_5는 region을 오름차순으로 넘겨야 하고, region 사이는 맞붙어 있어도 합치지 않습니다.
- 탐색 횟수가 free block 수에 묶이는 것이 문제라면, 다음 편의 TLSF나 4-05의 memory pool을 봅니다.

다음 편은 [4-03 TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)에서 O(1) bounded allocator를 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 heap_1~5](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/MemMang): 해당 함수·검사·탐색·region 정의.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)

V11.2.0 heap_5의 `vPortGetHeapStats()`는 region 사이의 크기 0 연결 marker도 `xNumberOfFreeBlocks`에 셉니다. 소스 주석(`heap_5.c:696-698`)이 이 block을 "not a real block"이라 부르면서도 최솟값 계산에서만 빼고 개수는 셉니다. 앞의 heap_5 실행에서 region 3개짜리 fresh heap이 `freeblocks=5`로 나온 것이 그 결과입니다.
