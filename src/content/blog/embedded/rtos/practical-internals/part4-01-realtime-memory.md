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

allocator의 크기 분류·split/coalesce·lock·page 공급은 구현에 따라 다릅니다. malloc이라는 이름만으로 수 µs~ms 또는 특정 탐색 방식이라고 결정하지 않습니다. 실시간 경로에서는 allocator뿐 아니라 lock 대기·memory/cache·interrupt 간섭·실패 처리를 포함한 상한을 검토해야 합니다.

고정 크기 heap의 linked-list allocator도 최대 node 수를 제한하면 이론적 상한을 분석할 수 있습니다. O(N)은 “상한이 절대로 없다”는 뜻이 아니라 상태 크기에 비용이 의존한다는 뜻입니다. 측정된 평균·최대는 모든 경로의 WCET 증명과 다릅니다.

## Fragmentation

external fragmentation은 총 free 공간은 충분해도 한 요청을 담는 연속 block이 없는 상태입니다. 예를 들어 서로 떨어진 4 KiB block 두 개는 총 8 KiB지만 하나의 8 KiB 요청을 만족하지 못할 수 있습니다. 총 free 6 KiB에서 8 KiB 요청이 실패한 것만으로 단편화를 증명할 수는 없습니다.

internal fragmentation은 정렬·header·최소 크기·size class 등에 따른 낭비입니다. 100 byte 요청에 128 byte 저장소를 쓰면 차이는 28 byte이며, 이것이 전체 allocator의 고정 비율은 아닙니다.

## RT 시스템의 메모리 전략

| 전략 | 장점 | 단점 |
|---|---|---|
| **실행 중 동적 할당 제외** | 해당 alloc 경로의 실패·탐색 분석을 줄임 | 다른 경로의 시간·수명 분석은 필요 |
| **Static allocation** | 초기화 시 결정 | 메모리 oversized |
| **Memory pool** | free-list 갱신을 일정한 작업으로 구성 가능 | 고갈·정렬·lock·크기별 낭비 분석 |
| **TLSF** | O(1) bounded | 약간 복잡 |
| **Heap_4 (FreeRTOS)** | first-fit와 coalesce | free-list 길이·대기 등 시간 분석 필요 |
| **Heap_5 (FreeRTOS)** | non-contiguous | first-fit |

## 표준과 제품 정책을 구분하기

안전 표준의 의무와 프로젝트 coding policy는 판·적용 범위·deviation 조건을 확인해야 합니다. DO-178C·ISO 26262의 특정 등급이면 모든 동적 할당이 일률적으로 금지된다고 일반화하지 않습니다. 이 글은 표준 적합성 판정이나 인증 절차를 제공하지 않습니다.

CERT C의 MEM34-C는 동적으로 할당한 메모리만 free하라는 규칙입니다. realloc의 실패 처리 규칙과 혼동하지 않습니다. 정적 storage를 선택해도 lifetime·bounds·stack·동시성 오류의 검증은 남습니다.

## Bounded Allocator — TLSF

TLSF는 두 단계 크기 분류와 bitmap으로 free-list 전체 탐색을 피합니다. 고정된 size 범위와 구현 가정에서 알고리즘 작업 수를 제한하는 설계이며, memory/cache·lock·copy와 시스템 간섭까지 항상 같은 시간이라는 뜻은 아닙니다. [4-03](/blog/embedded/rtos/practical-internals/part4-03-tlsf)에서 고정 구현과 실제 예제를 확인합니다.

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

static allocation 지원 설정과 idle/timer storage 설정도 해당 kernel·port에서 확인합니다. 이 코드만으로 application 전체가 heap을 전혀 쓰지 않는다는 증거가 되지는 않습니다.

## Memory Pool

고정 크기 block을 재사용하면 같은 pool 내부의 동일 크기 요청에 external fragmentation을 피할 수 있습니다. 반면 padding·과대 block·class 간 용량 분리·고갈과 lock 대기는 남습니다. [4-05](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)에서 실제 정상·고갈·잘못된 반환 검사를 다룹니다.

## Buddy Allocator

buddy는 power-of-two 크기로 split·merge하는 방식입니다. 시간 분석에는 최대 order·free-list 상태·동기화와 backing memory 공급까지 포함해야 합니다. Linux의 일반 allocation 전체가 buddy 조작 횟수만으로 제한된다고 설명하지 않습니다.

## 측정: Heap 상태

```c
/* FreeRTOS */
size_t free = xPortGetFreeHeapSize();
size_t min  = xPortGetMinimumEverFreeHeapSize();
HeapStats_t stats;
vPortGetHeapStats(&stats);
/* stats.xSizeOfLargestFreeBlockInBytes, stats.xNumberOfFreeBlocks */
```

위 stats API는 사용하는 heap 구현에서 지원하는지 확인합니다. 큰 요청의 실패를 판단하려면 header·정렬·다른 사용자의 변화와 최대 free block을 함께 봅니다. 총량/최대값 비율 하나로 모든 workload의 단편화 심각도를 결정하지 않습니다.

## Embedded에서 DRAM과 SRAM 분리

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];   /* TCM */
__attribute__((section(".sdram"))) uint8_t big_buf[256 * 1024]; /* ext SDRAM */
__attribute__((section(".sram"))) uint8_t medium_buf[16384];
```

Memory region마다 속도와 용량의 trade-off가 다릅니다. Linker script로 영역을 명시합니다.

## 메모리 선택 근거를 남기기

제품별 최대 동시 객체 수·최대 payload·task stack·DMA/cache 요구와 실패 대응을 기록합니다. 공개 근거 없는 누리호·특정 ECU의 malloc 사용 여부를 사례로 쓰지 않습니다. 초기화 시에만 할당할지, runtime에 pool이나 가변 heap을 쓸지는 요구와 검증 가능한 상한으로 결정합니다.

## 자주 하는 실수

- 평균 alloc 시간만 보고 deadline을 판단합니다. 상태별 실패·탐색·lock 대기도 확인합니다.
- total free만 봅니다. 연속 block·header·alignment를 함께 봅니다.
- static이면 자동 인증·안전이라고 생각합니다. bounds·수명·실행 stack·동시성 검증은 남습니다.
- ISR에서 일반 allocator를 호출합니다. 해당 API가 명시적으로 지원하는 문맥과 시간 계약을 확인합니다.

## 정리

- allocator의 알고리즘 복잡도와 전체 시스템 WCET는 다른 주장입니다.
- external/internal fragmentation과 단순 용량 부족을 구분합니다.
- static·pool·TLSF·일반 heap은 객체 수명과 요구에 맞춰 선택합니다.
- FreeRTOS API·통계 필드는 고정 태그와 선택 heap을 기준으로 확인합니다.
- 표준 적합성과 제품 채택 사례는 별도 증거가 필요합니다.

다음 [4-02](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)에서 FreeRTOS V11.2.0 heap_1~5를 비교합니다.

## 근거 자료

- [FreeRTOS V11.2.0 MemMang](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/MemMang), [portable.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/portable.h).
- [CERT C MEM34-C](https://wiki.sei.cmu.edu/confluence/display/c/MEM34-C.+Only+free+memory+allocated+dynamically): free 대상의 provenance.

## 관련 항목

- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
