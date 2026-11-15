---
title: "TLSF Allocator 분석 — Two-Level Segregated Fit O(1)"
slug: "embedded/rtos/practical-internals/part4-03-tlsf"
date: 2026-05-07T09:35:00
description: "고정한 mattconte TLSF 구현의 mapping·bitmap·split·coalesce와 API를 살펴보고, bucket 산술·pool 정렬·기능 검사와 시스템 시간 상한의 차이를 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 35
tags: [tlsf, allocator, deterministic, o1]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

TLSF는 두 단계 크기 분류와 bitmap으로 가변 크기 block을 찾고 반환합니다. **일정한 알고리즘 작업 수와 전체 시스템의 일정한 실행 시간은 다릅니다.** 이 글의 구현 기준은 mattconte/tlsf commit **deff9ab509341f264addbd3c8ada533678591905**입니다.

## 어떤 문제를 푸는가

주소순 free-list를 순회하는 allocator는 free block 수에 따라 탐색 작업이 달라집니다. TLSF는 크기 구간별 목록과 bitmap으로 이 탐색을 제한합니다. 지원 size 범위·원소 폭·compiler·동기화·memory 시스템은 여전히 시간 분석의 조건입니다.

특정 ECU·micro-ROS 기본 allocator·VxWorks 내부·게임 프로젝트가 모두 TLSF를 사용한다고 추정하지 않습니다. 프로젝트 채택과 알고리즘 특성은 다른 증거가 필요한 주장입니다.

## 두 단계 Segregation의 산술

first level에서 크기 구간을 나누고, second level에서 더 작은 구간으로 나눕니다. 예를 들어 [64,128)을 **16등분한 설명 모델**이면 폭은 4 byte입니다. [64,68), [68,72), …, [124,128)이며 64~71을 첫 구간으로 쓰면 16등분과 맞지 않습니다.

아래는 그 산술만 계산하는 예제입니다. 실제 TLSF mapping이나 작은 block 처리 전체가 아니며 결과 범위는 끝을 포함하지 않습니다.

```js title="tlsf-subdivision.mjs"
export function subdivision(fl, sl, bits = 4) {
  if (![fl, sl, bits].every(Number.isSafeInteger) || bits < 0 ||
      bits > 5 || fl < bits || fl > 63 || sl < 0 || sl >= 2 ** bits)
    throw new RangeError('bucket');
  const width = 1n << BigInt(fl - bits);
  const start = (1n << BigInt(fl)) + BigInt(sl) * width;
  return {start, end: start + width};
}
```

기존 그림도 이 **16등분 설명 모델**을 나타냅니다. 고정한 mattconte 구현은 SL_INDEX_COUNT_LOG2=5, 즉 32개 SL과 작은 block의 별도 mapping을 사용하므로 그림의 FL 번호를 실제 array index로 그대로 대입하지 않습니다.

![16등분 설명 모델의 TLSF 두 단계 bucket과 bitmap](/images/blog/rtos/diagrams/part4-03-tlsf-buckets.svg)

## Allocate 경로

고정 소스의 주요 흐름은 다음과 같습니다. application이 internal mapping 함수를 복사해 별도 allocator를 만드는 예제가 아닙니다.

| 함수·단계 | 역할 |
| --- | --- |
| adjust_request_size | alignment·최소/최대 요청 조건 |
| mapping_search | 적합한 bucket 탐색을 위한 반올림 |
| mapping_insert | 크기를 FL/SL로 분류, 작은 block 별도 처리 |
| search_suitable_block | 비어 있지 않은 bucket 탐색 |
| block_trim_free | 나머지가 유효하면 split·재등록 |

C builtin은 인자 폭과 0 입력, shift 범위를 확인해야 합니다. __builtin_clz(size_t)를 폭 확인 없이 쓰거나 작은 size에서 음수 shift하는 축약 코드로 원본을 대체하지 않습니다. CLZ·CTZ가 모두 같은 한 명령·한 cycle이라는 보장도 없습니다.

## Free와 Coalesce

원본 block_merge_prev·block_merge_next는 실제 이웃 block과 free 상태를 확인하고 free list에서 제거한 뒤 합칩니다. boundary tag·물리 이웃과 free-list 이웃은 다른 관계입니다. block_next의 header/size 계약을 생략한 pointer 산술은 잘못된 주소를 만들 수 있습니다.

doubly-linked free list를 사용하면 알려진 free node를 전체 목록 순회 없이 제거할 수 있습니다. 이것이 header·bitmap·split/merge 작업이 없어지거나 cache miss·lock wait까지 0이라는 뜻은 아닙니다.

## 단편화와 시간 상한

bucket 간격의 상대 오차를 allocator 전체의 internal/external fragmentation 상한으로 바로 해석하지 않습니다. header·alignment·최소 block·live object 배치·pool 분리와 workload가 사용 가능 capacity에 영향을 줍니다. 출처 없는 6.25%·전체 overhead 25%를 보편적인 수학적 보장으로 제시하지 않습니다.

malloc/free의 관리 작업이 상수 횟수인 설계여도 realloc의 payload copy, 외부 lock, interrupt·memory 간섭은 별도입니다. 관찰된 최대값과 worst-case 보장도 구분합니다.

## API 사용 — mattconte TLSF

이 저장소는 **BSD license**이며 tlsf_t는 opaque handle입니다. pool과 control storage를 담는 memory의 정렬·크기와 수명을 먼저 확인합니다. 다음 예제는 한 번 초기화한 단일 인스턴스를 외부에서 직렬화해서 사용하는 경우입니다.

```c title="tlsf-usage.c"
#include <stdbool.h>
#include <stddef.h>
#include "tlsf.h"
_Alignas(64) static unsigned char storage[64 * 1024];
static tlsf_t allocator;
bool memory_init(void) {
    if (allocator != NULL) return true;
    if (tlsf_align_size() > 64 ||
        sizeof storage <= tlsf_size() + tlsf_pool_overhead() + tlsf_block_size_min())
        return false;
    allocator = tlsf_create_with_pool(storage, sizeof storage);
    return allocator != NULL;
}
void *memory_alloc(size_t bytes) {
    return allocator != NULL ? tlsf_malloc(allocator, bytes) : NULL;
}
void memory_free(void *p) {
    /* p must be NULL or a live allocation from this initialized instance. */
    if (allocator != NULL) tlsf_free(allocator, p);
}
```

추가 pool은 tlsf_add_pool의 정렬·최소/최대 크기·비중첩 조건을 지켜 등록합니다. remove는 해당 pool의 live allocation이 없는 상태여야 합니다. 이를 DMA 특성이나 NUMA 배치 policy를 자동 제공하는 API로 해석하지 않습니다.

## Thread Safety와 대상 선택

원 구현은 thread-safe가 아니며 사용자가 동기화를 제공해야 한다고 명시합니다. ISR에서 task mutex를 기다리거나 SMP의 전역 lock 비용을 무시하면 알고리즘의 관리 비용과 다른 문제가 생깁니다. per-core pool은 contention을 줄일 수 있지만 다른 core에서 반환하는 ownership protocol이 더 필요합니다.

작은 heap·고정 크기 workload·hardware 명령 유무만으로 allocator를 결정하지 않습니다. 실제 관리 구조 크기는 tlsf_size 등의 API로 확인하고 코드·남는 capacity·실패 처리와 lock/IRQ 제한을 함께 비교합니다. O(1)이므로 모든 target에서 더 빠르다는 결론은 성립하지 않습니다.

## 검증할 항목

host에서는 0·작은 요청·정렬 경계·oversize/OOM·free 후 재사용·realloc 내용 보존과 tlsf_check/tlsf_check_pool 결과를 검사할 수 있습니다. 이 기능 검사는 firmware WCET benchmark가 아닙니다. CPU·clock·compiler·cache·동시성·workload 원시 로그가 없는 µs 표는 실측으로 제시하지 않습니다.

## 정리

- 실제 구현의 크기 범위·mapping·header 계약을 고정 commit으로 확인합니다.
- 설명용 16등분 모델과 고정 구현의 32개 SL·작은 block mapping을 구분합니다.
- CLZ/CTZ·관리 작업 수·wall time은 서로 다른 지표입니다.
- BSD license와 외부 동기화·pool 수명 조건을 지킵니다.
- 기능·단편화·시간 상한을 각각 검증해야 합니다.

다음 [4-04 Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)에서 RTOS 객체의 storage·초기화·linker 경계를 살펴봅니다.

## 근거 자료

- [mattconte/tlsf 고정 소스](https://github.com/mattconte/tlsf/tree/deff9ab509341f264addbd3c8ada533678591905): tlsf.c·tlsf.h·라이선스·thread safety.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
