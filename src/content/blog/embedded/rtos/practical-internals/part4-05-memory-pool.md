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

고정 크기 pool은 정한 수의 block을 재사용합니다. 모든 칸이 같은 크기라 같은 pool 안에서는 4-01의 1000/96 실행 같은 external fragmentation이 생기지 않습니다. 대신 **고갈·요청보다 큰 block의 낭비·다른 class의 유휴 용량·동기화 비용**은 남습니다. 이 글의 실행 결과는 FreeRTOS V11.2.0(commit `0adc196d`) `ARM_CM3` 포트를 QEMU 11.1.3 `mps2-an385`에서 돌린 출력입니다(`arm-none-eabi-gcc` 16.2.0).

코인 로커에 비유할 수 있습니다. 칸 크기와 개수가 정해져 있어서 빈 칸이 하나라도 있으면 바로 열쇠를 받고, 다 차면 기다리거나 돌아가야 합니다. 작은 가방을 넣어도 칸 하나를 통째로 씁니다.

## 기본 Pool 구조와 수명

다음은 `max_align_t` 정렬의 64-byte block 32개와 별도 index metadata를 쓰는 **단일 호출자용 진단 예제**입니다. alloc은 head만 갱신하고, free는 잘못된 주소·중복 반환을 잡으려고 최대 32개 block을 비교합니다. 그래서 free는 block 수에 비례합니다.

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

이 코드를 그대로 test task에서 돌렸습니다. 32번 할당이 성공하고 33번째는 NULL입니다. 이중 반환, block 안쪽 주소, NULL은 모두 `false`로 거절됐고, 반환한 block이 다음 할당에 그대로 돌아왔습니다.

```text
checked pool: 32 allocs succeeded, next -> NULL; block stride 64 bytes, alignof(max_align_t)=8
  free(b[0]) -> 1, free(b[0]) again -> 0, free(b[0]+1) -> 0, free(NULL) -> 0
  after one free, pool_alloc() returns b[0] again: 1
```

이 Cortex-M3 빌드에서 `max_align_t` 정렬은 8 byte이고 block 간격은 64 byte입니다. 마지막 줄이 보여 주듯 방금 반납한 block이 바로 다음 요청에 나가므로(LIFO), 반납한 뒤에도 옛 포인터로 쓰는 코드가 있으면 새 주인의 데이터를 덮어씁니다. 반납 후 포인터를 NULL로 바꾸는 습관은 그 변수 하나만 막고, 다른 곳에 복사된 포인터는 막지 못합니다.

## Per-Class Pool과 메모리 회계

size class별 pool(예: 64·256·1024 byte)은 class마다 용량과 고갈을 따로 관리합니다. 그 대가로 64 byte class가 바닥나도 1024 byte class의 빈 block을 빌려 쓰지 못합니다. RAM 예산을 잡을 때는 payload뿐 아니라 metadata, padding, 그리고 class별로 비어 있는 block까지 셉니다. 위 예제의 metadata는 `next_index`(4 byte × 32)와 `used`(1 byte × 32)로 160 byte입니다.

free block 안에 next pointer를 저장하는 구현은 metadata를 따로 두지 않아 RAM을 아끼지만, block이 pointer 정렬을 만족해야 하고 반납된 block의 앞 4 byte가 list로 덮어써집니다. Zephyr의 `k_mem_slab`이 이 방식입니다. v3.7.0 문서(`doc/kernel/memory_management/slabs.rst:61-62`)는 "the first 4 bytes of each unused block provide the necessary linkage"라고 적고, 버퍼를 4 이상의 2의 거듭제곱 N byte에 맞추고 block 크기도 N의 배수로 하라고 요구합니다(`:33-36`).

## RTOS API로 Pool을 구성할 때

Zephyr v3.7.0의 `k_mem_slab_alloc()`은 `include/zephyr/kernel.h`의 doc comment에 `\isr_ok`가 붙어 있고, ISR에서는 timeout을 `K_NO_WAIT`로 주라고 적습니다. 빈 block이 없을 때 기다리는 thread가 여럿이면 "highest-priority thread that has waited the longest"에게 줍니다(`slabs.rst`). `k_mem_slab_free()`는 `__ASSERT(slab_ptr_is_good(slab, mem), ...)`로 잘못된 포인터를 검사합니다(`kernel/mem_slab.c:268` 함수 안).

FreeRTOS에는 pool API가 없어서, block 포인터를 queue에 넣어 두고 꺼내 쓰는 패턴을 씁니다. 이때 queue가 관리하는 것은 포인터 복사와 대기뿐입니다. block 4개짜리 pool을 길이 8 queue로 만들고, 하나를 꺼낸 뒤 같은 포인터를 두 번 반납했습니다.

```text
queue pool: return the same block twice -> 1, 1 (1 = accepted)
  then 5 allocs succeed from a 4-block pool, 1 pair(s) share one block
```

queue는 두 번 다 받았고, 그 뒤 block 4개짜리 pool에서 할당이 5번 성공했으며 그중 두 번은 같은 block입니다. 두 task가 같은 buffer를 자기 것으로 알고 쓰게 됩니다. queue 길이를 block 수와 같게 잡으면 두 번째 반납이 queue full로 실패해 일부는 드러나지만, 그것도 다른 block이 하나도 나가 있지 않을 때만입니다. 다른 block이 하나라도 나가 있으면 빈자리가 있어 두 번째 반납도 받아들여집니다. **중복 반환·다른 pool의 block·반환 후 사용은 queue가 검사하지 않으니**, 위 checked pool처럼 반납할 때 주소와 사용 여부를 검사하는 층을 둡니다.

ISR에서 반납한다면 `xQueueSendFromISR()`를 쓰고 반환값을 확인합니다. pool을 mutex로 보호했다면 그 pool은 ISR에서 부르지 못합니다(3-09).

## CAS Pool의 ABA와 재사용 문제

free list의 head를 CAS로 바꾸는 lock-free pool은 ABA 문제를 겪습니다. 순서는 이렇습니다. task A가 head `X`와 `X->next == Y`를 읽고 CAS 직전에 밀립니다. 그 사이 다른 쪽이 `X`와 `Y`를 꺼내고 `X`만 반납하면 head는 다시 `X`가 됩니다. A가 돌아와 CAS(`head: X → Y`)를 하면 성공하지만, `Y`는 이미 누군가 쓰는 block입니다. head 값이 같다는 것만 보고 그 사이의 변화를 놓친 것입니다.

대책으로 head에 version tag를 붙여 함께 CAS하는 방법이 있는데, tag도 유한 폭이라 wrap됩니다. 단일 코어 RTOS라면 alloc/free를 짧은 critical section으로 감싸면 ABA가 생길 틈 자체가 없습니다. 이 글에서는 CAS pool을 구현하거나 돌리지 않았습니다.

## Pool Sizing — 평균과 Burst

평균 도착률 64 packet/ms에 평균 체류 200 µs를 곱하면 12.8개입니다(Little의 법칙, L = λW). 이것은 평균 in-flight 수입니다. 그런데 64개가 한 번에 도착하면 처리 전에 64개를 동시에 쥐어야 하므로, 평균에 여유를 조금 더한 16개 pool은 그 burst에서 48개를 잃습니다. pool 크기는 평균이 아니라 "한 번에 몰릴 수 있는 최대 수 + 아직 처리 중인 수"로 잡습니다. 그 최대 수는 입력 쪽 사양(예: DMA descriptor 개수, 상대편의 최대 전송 window)에서 나옵니다.

운영 중에는 pool의 최소 여유 개수(heap의 `xMinimumEverFreeBytesRemaining`처럼)를 기록해 두면, 설계한 burst가 실제로 얼마나 찼는지 알 수 있습니다.

## Alignment·DMA·동기화

각 block 시작 주소는 payload type의 정렬을 만족해야 합니다. 위 예제는 `union`에 `max_align_t`를 넣어 배열 원소마다 8 byte 정렬을 보장하고, block 크기 64가 8의 배수라 stride도 정렬을 유지합니다. DMA buffer로 쓴다면 controller의 주소·크기 제약과, data cache가 있는 core에서는 cache line 정렬이 더 필요합니다. block 하나가 다른 block과 cache line을 공유하면 한쪽의 cache 유지 작업이 다른 쪽 데이터를 건드립니다. 이 글의 실행은 QEMU 위의 기능 검사라 DMA·cache는 확인하지 않았습니다.

## 정리

- checked pool은 32개 할당 뒤 NULL을 주고, 이중 반환·내부 주소·NULL 반환을 거절했습니다.
- 반납한 block이 바로 다음에 나가므로(LIFO) use-after-free가 곧바로 남의 데이터를 덮습니다.
- FreeRTOS queue pool은 이중 반환을 받아들여, 4-block pool에서 5번 할당되고 한 block이 두 번 나갔습니다.
- Zephyr `k_mem_slab`은 free block 앞 4 byte에 link를 두고, ISR에서는 `K_NO_WAIT`로만 할당합니다.
- pool 크기는 평균 in-flight(Little의 법칙)가 아니라 최대 burst로 잡습니다.

다음 [4-06 Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)에서 canary·watermark·hardware 보호의 검출 범위를 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): pointer queue와 task/ISR 반환 계약.
- [Zephyr 3.7.0 memory slabs](https://docs.zephyrproject.org/3.7.0/kernel/memory_management/slabs.html), [kernel/mem_slab.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/mem_slab.c).

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
