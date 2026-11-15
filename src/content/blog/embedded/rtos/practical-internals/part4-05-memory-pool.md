---
title: "Memory Pool — Fixed-Size Block Allocator의 단순함과 강력함"
slug: "embedded/rtos/practical-internals/part4-05-memory-pool"
date: 2026-05-07T09:37:00
description: "고정 크기 pool의 저장소·정렬·고갈·반환 검증을 살펴보고, class별 용량·burst sizing·RTOS queue·CAS ownership의 한계를 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 37
tags: [pool, fixed-size, free-list, slab]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

고정 크기 pool은 정한 수의 block을 재사용합니다. 같은 pool의 동일 크기 요청에 external fragmentation을 피할 수 있지만 **고갈·internal 낭비·다른 class의 유휴 용량·동기화 비용**은 남습니다. free-list 작업 수와 전체 API의 시간 상한을 구분해야 합니다.

## 기본 Pool 구조와 수명

다음은 최대 정렬을 제공하는 64-byte block 32개와 별도 index metadata를 사용하는 **단일 호출자용 진단 예제**입니다. alloc은 head를 갱신하고, free는 잘못된 주소·중복 반환을 확인하기 위해 최대 32개 block을 순회합니다. 이 free를 가변 N에 대한 O(1) 구현이라고 부르지 않습니다.

```c title="checked-pool.c"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#define POOL_COUNT 32u
union PoolBlock { max_align_t alignment; unsigned char bytes[64]; };
static union PoolBlock blocks[POOL_COUNT];
static unsigned next_index[POOL_COUNT], head;
static bool used[POOL_COUNT];
void pool_init(void) {
    for (unsigned i = 0; i < POOL_COUNT; ++i) {
        next_index[i] = i + 1; used[i] = false;
    }
    head = 0;
}
void *pool_alloc(void) {
    if (head == POOL_COUNT) return NULL;
    unsigned i = head; head = next_index[i]; used[i] = true;
    return blocks[i].bytes;
}
bool pool_free(void *p) {
    if (p == NULL) return false;
    for (unsigned i = 0; i < POOL_COUNT; ++i) {
        if (p == blocks[i].bytes) {
            if (!used[i]) return false;
            used[i] = false; next_index[i] = head; head = i;
            return true;
        }
    }
    return false;
}
```

pool_init는 이용자 시작 전 한 번만 호출합니다. allocation을 외부 type으로 사용할 때에는 그 type의 alignment·크기·수명 계약도 맞아야 합니다. 반환 후 원래 pointer를 NULL로 만드는 습관만으로 다른 alias의 use-after-free를 막지는 못합니다.

## Per-Class Pool과 메모리 회계

size class별 pool은 용량·고갈·lock을 분리할 수 있지만 한 class의 free block이 다른 class에 자동 제공되지는 않습니다. 같은 class도 cache locality나 contention 개선이 항상 보장되는 것은 아닙니다. payload뿐 아니라 metadata·padding·control block과 미사용 capacity를 집계합니다.

free block 안에 next pointer를 저장하는 구현은 pointer 정렬과 object lifetime을 따로 검토해야 합니다. byte 배열을 alignment 없이 구조체 pointer로 cast하는 예제를 복사하지 않습니다. 위 예제는 metadata를 분리하여 그 alias 문제를 피하는 대신 공간을 더 씁니다.

## RTOS API로 Pool을 구성할 때

CMSIS-RTOS2 memory-pool API와 Zephyr k_mem_slab은 사용 문맥·timeout·정렬·ISR 제한을 공식 API로 확인해야 합니다. FreeRTOS에서는 block pointer를 queue에 보관하는 패턴을 쓸 수 있지만 queue가 관리하는 것은 pointer 복사와 대기입니다. **중복 반환·잘못된 pool·반환 후 사용은 queue가 자동 검증하지 않습니다.**

FromISR API로 pointer를 반환할 때에도 queue full 반환값, 실제 block 소유권과 지원 IRQ priority를 확인합니다. 일반 mutex를 사용하는 pool을 ISR에서 호출하면 안 됩니다. 실제 network stack은 lwIP의 pbuf/memp 등 그 구현의 객체를 사용하며 임의의 mbuf 구조를 내부 API처럼 제시하지 않습니다.

## CAS Pool의 ABA와 재사용 문제

free-list head만 CAS한다고 next pointer의 안전성과 node 수명이 자동 보장되지는 않습니다. alloc 한 경로·free 한 경로라는 이름만으로 next 필드의 모든 접근이 race-free라고 선언할 수 없습니다. 재사용 시점과 실제 실행 순서·memory order·ownership을 증명해야 합니다.

tag counter도 유한 폭이면 wrap 조건이 있고, hazard pointer는 획득·retire·재사용 protocol이 필요합니다. 이런 계약을 생략한 CAS stack을 ISR-safe pool의 완성 구현으로 제시하지 않습니다. 단순한 RTOS queue 또는 지원된 pool API가 요구를 만족하는지 먼저 검토합니다.

## Pool Sizing — 평균과 Burst

평균 도착률 64 packet/ms와 평균 체류 200 µs를 곱한 12.8개는 평균적인 in-flight 추정입니다. 64개가 한 번에 도착하면 처리 전에 64개를 보유할 수 있으므로 이것을 최대 16개로 축소할 수 없습니다. 기존 미처리·재전송·DMA descriptor·queue와 송신 보유도 포함합니다.

제품의 허용 도착 burst와 최악 서비스 지연·drain rate로 backlog 상한을 검토합니다. 고정 25% margin이나 80% alarm은 보편 규칙이 아니며 실제 요구와 telemetry로 정합니다. 고갈·drop·back-pressure·안전 상태를 설계하고 가능한 burst와 실패를 재현합니다.

## Alignment·DMA·동기화

block 크기가 pointer보다 크다는 조건만으로 충분하지 않습니다. 각 block 시작의 alignment와 stride, payload type과 metadata를 확인합니다. DMA에는 controller의 주소/크기 제약과 cache line 공유·clean/invalidate·ownership 전환이 더 필요합니다.

cache line 정렬은 독립 block의 false sharing을 줄일 수 있지만 모든 공유 metadata나 DMA coherency 문제를 없애지는 않습니다. 이 글의 host pool 기능 검사는 실제 DMA·cache·ISR 또는 concurrent allocator 검증이 아닙니다.

## 정리

- pool의 고정 크기·가용 수·수명·정렬을 명시합니다.
- alloc/free 관리 비용과 validation·lock·대기 비용을 구분합니다.
- 잘못된 주소·중복 반환·고갈·다른 이용자의 alias를 검토합니다.
- 평균 점유량을 burst 최대값으로 사용하지 않습니다.
- RTOS queue와 CAS는 각각 추가 ownership 검증이 필요합니다.

다음 [4-06 Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)에서 canary·watermark·hardware 보호의 검출 범위를 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): pointer queue와 task/ISR 반환 계약.
- [CMSIS-RTOS2 memory pool](https://arm-software.github.io/CMSIS_6/latest/RTOS2/group__CMSIS__RTOS__PoolMgmt.html).
- [Zephyr 3.7.0 memory slabs](https://docs.zephyrproject.org/3.7.0/kernel/memory_management/slabs.html).

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
