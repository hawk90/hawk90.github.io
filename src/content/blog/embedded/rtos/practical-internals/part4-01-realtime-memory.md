---
title: "실시간 메모리 요구사항 — Determinism·Fragmentation·WCET"
slug: "embedded/rtos/practical-internals/part4-01-realtime-memory"
date: 2026-05-07T09:33:00
description: "동적 할당의 한계와 fragmentation, WCET-bounded allocator, safety-critical 기준을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 33
tags: [memory, determinism, fragmentation, wcet]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"RT 시스템에서는 allocation 시간이 bounded해야 합니다."** `malloc`의 가변 시간은 deadline을 위협합니다.

## 일반 malloc의 비용을 확인하기

식당 좌석 배정에 비유하면, 손님(요청)이 올 때마다 빈 자리를 처음부터 훑어보는 지배인은 손님이 적을 때는 빠르지만 홀이 붐비면 오래 걸립니다. allocator도 같습니다. 같은 `malloc()`이라도 지금 heap에 빈 조각이 몇 개 있느냐에 따라 걸리는 시간이 달라지고, deadline을 지켜야 하는 코드에는 이 "상태에 따른 시간"이 문제입니다.

FreeRTOS V11.2.0(commit `0adc196d`)의 `heap_4.c`가 좋은 예입니다. `pvPortMalloc()`은 `vTaskSuspendAll()`로 scheduler를 멈춘 뒤(`heap_4.c:221`) 주소순 free list를 앞에서부터 훑어 충분히 큰 첫 block을 찾습니다(`:248`). 훑는 횟수는 그 순간 free block의 수입니다. 그러니 O(N)은 "상한이 없다"는 뜻이 아니라 "상한이 heap 상태에 달렸다"는 뜻입니다. heap 크기가 고정이면 free block 수에도 최댓값이 있어서 이론적 상한은 계산할 수 있습니다. 다만 한 번 잰 평균이나 최대가 그 상한이 되지는 않습니다.

이 글의 실행 결과는 이 커널을 `ARM_CM3` 포트로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 출력입니다(`arm-none-eabi-gcc` 16.2.0, `configTOTAL_HEAP_SIZE` 65536). 시간은 재지 않았고, heap 상태만 `vPortGetHeapStats()`로 읽었습니다.

## Fragmentation

external fragmentation은 총 free 공간은 충분해도 한 요청을 담는 연속 block이 없는 상태입니다. 주차장에 빈 칸이 50개 있어도 버스 한 대가 설 연속 다섯 칸이 없으면 버스는 못 들어갑니다. heap_4에 1000 byte와 96 byte를 번갈아 heap이 찰 때까지 할당한 뒤, 1000 byte 쪽만 모두 반납했습니다.

```text
  allocated 106 blocks (1000/96 alternating) until NULL
  heap exhausted             avail=896 largest=896 smallest=896 freeblocks=1 min_ever=32
  after freeing every 1000   avail=54320 largest=1008 smallest=896 freeblocks=54 min_ever=32
  pvPortMalloc(2000) -> NULL (fragmented)
```

free 공간은 54320 byte인데 가장 큰 block은 1008 byte라 2000 byte 요청이 실패했습니다. 반납한 1000 byte block 사이마다 96 byte block이 살아 있어 coalesce할 이웃이 없기 때문입니다. 남은 96 byte block까지 모두 반납하자 다시 하나의 59832 byte block으로 합쳐졌습니다. 그래서 총량만 보면 단편화가 보이지 않고, 가장 큰 free block을 같이 봐야 합니다.

internal fragmentation은 header·정렬·최소 크기 때문에 요청보다 더 쓰는 공간입니다. 같은 커널에서 잰 값입니다.

| 요청 | heap_1 소비 | heap_4 소비 | 이유 |
| --- | --- | --- | --- |
| 100 byte | 104 | 112 | 8 byte 정렬, heap_4는 8 byte `BlockLink_t` header 추가 |
| 1 byte | 8 | 16 | heap_4는 8 byte header를 더한 9 byte를 8 byte 단위로 올림(`heap_4.c:182-200`) |

1 byte 요청이 16 byte를 쓰므로 작은 객체를 많이 할당하는 코드에서는 낭비 비율이 커집니다.

## RT 시스템의 메모리 전략

| 전략 | 장점 | 단점 |
|---|---|---|
| **실행 중 동적 할당 제외** | 해당 alloc 경로의 실패·탐색 분석을 줄임 | 다른 경로의 시간·수명 분석은 필요 |
| **Static allocation** | 초기화 시 결정 | 메모리 oversized |
| **Memory pool** | free-list 갱신을 일정한 작업으로 구성 가능 | 고갈·정렬·lock·크기별 낭비 분석 |
| **TLSF** | 두 단계 bitmap으로 free list 탐색 횟수 상한 | 구현이 복잡하고 size class 낭비 |
| **Heap_4 (FreeRTOS)** | first-fit와 coalesce | 탐색 횟수가 free block 수에 비례 |
| **Heap_5 (FreeRTOS)** | 여러 비연속 region | heap_4와 같은 first-fit, region 사이 coalesce 없음 |

## 표준과 제품 정책을 구분하기

DO-178C·ISO 26262 같은 안전 표준이 동적 할당을 어떻게 다루는지는 이 글에서 다루지 않습니다. 원문을 확인하지 않았기 때문에 "특정 등급이면 금지" 같은 문장도 쓰지 않습니다.

CERT C의 MEM34-C는 제목 그대로 "Only free memory allocated dynamically"입니다. 이 규칙은 C 표준 Annex J를 인용해, 동적으로 할당하지 않은 포인터를 `free()`에 넘기면 undefined behavior라고 설명하고, `realloc()`에 그런 포인터를 넘겨도 같은 상황이라고 덧붙입니다. FreeRTOS에서도 같은 실수를 할 수 있습니다. heap_4의 `vPortFree()`는 먼저 포인터가 `ucHeap` 범위 안인지(`heapVALIDATE_BLOCK_POINTER`, `heap_4.c:134-136`, 호출은 `:368`), 그다음 header의 allocated bit(`:369`)와 next 포인터가 NULL인지(`:370`)를 `configASSERT`로 검사합니다. static 배열 주소를 넘기면 첫 검사에서 멈춥니다.

```text
vPortFree(&not_heap[2]) on heap_4 (static array, not from pvPortMalloc)
ASSERT FAIL ( ( uint8_t * ) ( pxLink ) >= &( ucHeap[ 0 ] ) ) && ( ( uint8_t * ) ( pxLink ) <= &( ucHeap[ configTOTAL_HEAP_SIZE - 1 ] ) ) at ../src/freertos-V11.2.0/portable/MemMang/heap_4.c:368
```

assert를 끈 빌드에서는 범위 검사가 사라지고, allocated bit 조건이 거짓이면 아무 일도 하지 않고 돌아갑니다(`:372`).

## Bounded Allocator — TLSF

TLSF는 두 단계 크기 분류와 bitmap으로 free list 전체 탐색을 피합니다. 요청 크기로 두 bitmap을 한 번씩 보고 바로 해당 list의 머리를 꺼내므로, heap_4와 달리 탐색 횟수가 free block 수에 묶이지 않습니다. 그 대신 cache miss나 lock 대기 같은 시스템 쪽 시간은 여전히 남습니다. [4-03](/blog/embedded/rtos/practical-internals/part4-03-tlsf)에서 구현과 예제를 확인합니다.

## Static Allocation 패턴

FreeRTOS V11.2.0의 task stack은 StackType_t 원소 수로 지정합니다. uint8_t 배열을 그대로 StackType_t pointer 인자에 전달하지 않습니다. 아래 함수는 이용자 시작 전에 한 번만 호출하며 storage는 task보다 오래 살아 있어야 합니다.

```c title="static-task-storage.c"
#include "FreeRTOS.h"
#include "task.h"
static StackType_t sample_stack[256];
static StaticTask_t sample_tcb;
extern void sample_task(void *arg);
TaskHandle_t create_sample_task(void) {
    return xTaskCreateStatic(sample_task, "sample", 256,
                              NULL, 2, sample_stack, &sample_tcb);
}
```

이 코드는 `configSUPPORT_STATIC_ALLOCATION 1`이 필요하고, `configKERNEL_PROVIDED_STATIC_MEMORY`가 0(기본값)이면 application이 `vApplicationGetIdleTaskMemory()`와(timer를 쓰면) `vApplicationGetTimerTaskMemory()`도 제공해야 합니다. 그대로 빌드해 돌린 결과입니다.

```text
xTaskCreateStatic -> handle, free heap before scheduler=0
sample_task running, stack high water mark 247 words
```

free heap이 0으로 찍힌 것은 heap이 비어서가 아니라, heap_4가 첫 `pvPortMalloc()` 때 초기화되기 때문입니다. 이 시점까지 아무도 heap을 쓰지 않았다는 뜻입니다. 다만 `configSUPPORT_DYNAMIC_ALLOCATION`이 1이면 scheduler 시작 뒤 다른 코드가 heap을 쓸 수 있으니, heap을 아예 쓰지 않으려면 그 설정을 0으로 두고 heap 파일을 링크하지 않습니다.

## Memory Pool

고정 크기 block을 재사용하면 같은 pool 안에서는 위의 1000/96 실행 같은 external fragmentation이 생기지 않습니다. 모든 칸이 같은 크기라 어느 칸이 비어도 다음 요청을 담을 수 있기 때문입니다. 반면 요청보다 큰 block을 쓰는 낭비, class마다 따로 잡아 둔 용량, 고갈은 남습니다. [4-05](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)에서 실제 정상·고갈·잘못된 반환 검사를 다룹니다.

## Buddy Allocator

buddy는 2의 거듭제곱 크기로 block을 쪼개고, 반납할 때 짝(buddy)이 비어 있으면 다시 합치는 방식입니다. split·merge 횟수는 최대 order로 제한되지만, 요청을 2의 거듭제곱으로 올리므로 internal fragmentation이 큽니다. 이 글에서는 buddy 구현을 돌리지 않았습니다.

## 측정: Heap 상태

```c
/* FreeRTOS */
size_t free = xPortGetFreeHeapSize();
size_t min  = xPortGetMinimumEverFreeHeapSize();
HeapStats_t stats;
vPortGetHeapStats(&stats);
/* stats.xSizeOfLargestFreeBlockInBytes, stats.xNumberOfFreeBlocks */
```

V11.2.0에서 `vPortGetHeapStats()`는 `heap_4.c:572`와 `heap_5.c:672`에만 있습니다. heap_1·2·3을 쓰면 링크 오류가 납니다. 큰 요청이 성공할지는 `xSizeOfLargestFreeBlockInBytes`가 요청 크기 + header(heap_4에서 8 byte)를 8 byte 단위로 올린 값 이상인지로 봅니다. 앞의 실행처럼 총량이 54320 byte여도 largest가 1008이면 2000 byte는 실패합니다.

## Embedded에서 DRAM과 SRAM 분리

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];   /* TCM */
__attribute__((section(".sdram"))) uint8_t big_buf[256 * 1024]; /* ext SDRAM */
__attribute__((section(".sram"))) uint8_t medium_buf[16384];
```

section 이름(`.dtcm`, `.sdram`, `.sram`)은 예시이고, 실제 이름과 주소는 그 보드의 linker script에 정의돼 있어야 합니다. 빌드 후 map 파일에서 각 변수가 의도한 주소 범위에 놓였는지 확인합니다. 이 코드는 실행하지 않았습니다.

## 메모리 선택 근거를 남기기

제품별 최대 동시 객체 수·최대 payload·task stack·DMA/cache 요구와 실패 대응을 기록합니다. 공개 근거 없는 누리호·특정 ECU의 malloc 사용 여부를 사례로 쓰지 않습니다. 초기화 시에만 할당할지, runtime에 pool이나 가변 heap을 쓸지는 요구와 검증 가능한 상한으로 결정합니다.

## 자주 하는 실수

- 평균 alloc 시간만 보고 deadline을 판단합니다. heap_4는 free block 수에 따라 탐색이 길어지므로 최악 상태의 block 수로 따집니다.
- total free만 봅니다. 앞의 실행처럼 총량 54320 byte에서도 2000 byte가 실패합니다.
- static이면 끝났다고 생각합니다. 배열 범위·수명·task stack 크기·동시 접근 문제는 static이어도 그대로입니다.
- ISR에서 `pvPortMalloc()`을 호출합니다. heap_4는 `vTaskSuspendAll()`로 보호하므로(`heap_4.c:221`) task 사이의 경쟁만 막고 ISR은 막지 않습니다. FreeRTOS에는 FromISR allocator가 없습니다.

## 정리

- heap_4 할당 시간은 free block 수에 비례합니다. O(N)은 상한이 heap 상태에 달렸다는 뜻입니다.
- QEMU 실행에서 free 총량 54320 byte, 최대 block 1008 byte인 heap이 2000 byte 요청에 실패했습니다.
- heap_4는 100 byte 요청에 112 byte, 1 byte 요청에 16 byte를 씁니다.
- static·pool·TLSF·일반 heap은 객체 수명과 시간 요구에 맞춰 고릅니다.
- `vPortGetHeapStats()`는 heap_4·heap_5에만 있습니다.

다음 [4-02](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)에서 FreeRTOS V11.2.0 heap_1~5를 비교합니다.

## 근거 자료

- [FreeRTOS V11.2.0 MemMang](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/MemMang), [portable.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/portable.h).
- [CERT C MEM34-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/memory-management-mem/mem34-c): free 대상의 provenance.

## 관련 항목

- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
