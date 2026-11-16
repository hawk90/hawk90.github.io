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

TLSF는 두 단계 크기 분류와 bitmap으로 가변 크기 block을 찾고 반환합니다. 탐색이 free block 수와 무관하게 bitmap 두 번으로 끝나지만, **그것이 전체 시스템의 일정한 실행 시간을 뜻하지는 않습니다.** 이 글의 구현 기준은 mattconte/tlsf commit **deff9ab509341f264addbd3c8ada533678591905**(2020-03-29)입니다. 이 소스를 `arm-none-eabi-gcc` 16.2.0(`-mcpu=cortex-m3 -O1`)으로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 결과를 함께 봅니다.

## 어떤 문제를 푸는가

4-02의 heap_4는 주소순 free list를 앞에서부터 훑으므로, free block이 54개면 최대 54번을 봅니다. TLSF는 신발 가게의 치수별 선반과 비슷합니다. 손님이 오면 매장 전체를 뒤지지 않고 "260mm 선반에 재고가 있나"를 표시등(bitmap)으로 보고 바로 그 선반에서 꺼냅니다. 그 선반이 비었으면 표시등으로 다음 치수 선반을 찾습니다.

README(`README.md:4`)는 BSD license라고 적고, 이 구현이 TLSF 1.4 사양과 문서를 바탕으로 했다고 밝힙니다(`README.md:20-26`). 어떤 제품이 이 구현을 쓰는지는 이 글에서 다루지 않습니다.

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

Node.js v24.21.0에서 돌린 결과입니다. 16등분 모델의 첫 구간은 [64, 68), 마지막은 [124, 128)이고, 32등분(`bits = 5`)이면 [1024, 2048)이 32 byte 폭으로 나뉩니다.

```text
subdivision(6,0,4) = [64, 68)
subdivision(6,1,4) = [68, 72)
subdivision(6,15,4) = [124, 128)
subdivision(10,0,5) = [1024, 1056)
subdivision(10,31,5) = [2016, 2048)
subdivision(3,0,4) -> RangeError: bucket
```

그림은 이 **16등분 설명 모델**을 나타냅니다. 고정한 mattconte 구현은 `SL_INDEX_COUNT_LOG2 = 5`(`tlsf.c:211`), 즉 32개 SL을 쓰고, `SMALL_BLOCK_SIZE`(32-bit에서 128 byte) 미만은 FL 0 하나에 4 byte 간격으로 몰아넣습니다(`tlsf.c:226-233` 주석, `mapping_insert()` `:513-521`). 그래서 그림의 FL 번호를 실제 array index로 그대로 대입하지 않습니다.

![16등분 설명 모델의 TLSF 두 단계 bucket과 bitmap](/images/blog/rtos/diagrams/part4-03-tlsf-buckets.svg)

## Allocate 경로

고정 소스의 주요 흐름은 다음과 같습니다.

| 함수·단계 | 역할 |
| --- | --- |
| `adjust_request_size` (`tlsf.c:492`) | alignment·최소/최대 요청 조건 |
| `mapping_search` (`:533`) | 요청 크기를 다음 SL 경계로 올림 |
| `mapping_insert` (`:513`) | 크기를 FL/SL로 분류, 작은 block 별도 처리 |
| `search_suitable_block` (`:543`) | SL bitmap, 비었으면 FL bitmap을 한 번씩 보고 list 머리 반환 |
| `block_trim_free` | 나머지가 유효하면 split·재등록 |

`mapping_search()`가 올림을 하는 이유는 실행 결과에서 보입니다. 1000 byte block은 FL 3·SL 30 list에 들어가지만, 1000 byte 요청은 SL 31부터 찾습니다. SL 30 list에는 1000보다 작은 block도 섞여 있을 수 있으므로, 한 칸 위 list에서 꺼내면 어떤 block이든 크기 검사 없이 바로 쓸 수 있습니다. 대가는 SL 30에 딱 맞는 block이 있어도 못 쓴다는 것입니다.

```text
  size   12: insert fl=0 sl= 3 | search fl=0 sl= 3
  size  100: insert fl=0 sl=25 | search fl=0 sl=25
  size  128: insert fl=1 sl= 0 | search fl=1 sl= 0
  size 1000: insert fl=3 sl=30 | search fl=3 sl=31
  size 1023: insert fl=3 sl=31 | search fl=4 sl= 0
  size 1024: insert fl=4 sl= 0 | search fl=4 sl= 0
  size 1100: insert fl=4 sl= 2 | search fl=4 sl= 3
  size 4000: insert fl=5 sl=30 | search fl=5 sl=31
```

bitmap 검색은 `tlsf_ffs()`·`tlsf_fls()`가 합니다. GCC에서는 각각 `__builtin_ffs()`와 `__builtin_clz()`입니다(`tlsf.c:62-73`). Cortex-M3용 objdump에서 `fls`는 `clz` 한 명령, `ffs`는 `rbit` + `clz` 두 명령으로 나왔고 libgcc 호출은 없었습니다. 같은 소스를 `-mcpu=cortex-m0`으로 컴파일하면 `clz`는 한 번도 나오지 않고, 대신 libgcc의 `__clzsi2`와 `__ffssi2`를 부르는 call이 각각 두 번 생깁니다. "ffs/fls는 한 명령"이라는 가정은 target마다 objdump로 확인합니다.

## Free와 Coalesce

`block_merge_prev()`(`tlsf.c:679`)·`block_merge_next()`는 물리적으로 바로 앞·뒤 block이 free인지 header bit로 확인하고, free면 그 block을 free list에서 떼어 합칩니다. 앞 block은 header에 저장된 `prev_phys_block` 포인터로 찾습니다. 물리 이웃(메모리상 옆)과 free list 이웃(같은 크기 class)은 다른 관계입니다.

free list가 doubly-linked라서, 합칠 이웃을 list에서 떼는 일(`remove_free_block()`)도 list를 훑지 않고 앞뒤 포인터만 고칩니다. 그래서 free도 free block 수와 무관한 작업 횟수로 끝납니다.

## 단편화와 시간 상한

TLSF는 탐색을 빠르게 할 뿐 단편화를 없애지 않습니다. 4-01·4-02에서 heap_4로 돌린 1000/96 교대 할당을 64 KiB TLSF pool에 똑같이 돌렸습니다.

```text
allocated 112 blocks (1000/96 alternating) until NULL
after freeing every 1000: tlsf_malloc(2000) -> NULL, tlsf_check=0
after freeing all: tlsf_malloc(2000) -> ok, tlsf_check=0
```

1000 byte block을 모두 반납해도 사이에 96 byte block이 살아 있으면 합칠 이웃이 없어 2000 byte 요청은 heap_4와 똑같이 실패합니다. 예전 판의 "6.25%"·"전체 overhead 25%"는 출처가 없어 지웠습니다. 실제 낭비는 `mapping_search()`의 올림, block header(`tlsf_alloc_overhead()` = 4 byte), 최소 block(12 byte)에서 나옵니다.

관리 작업이 상수 횟수여도 `tlsf_realloc()`이 새 block으로 옮길 때의 payload copy는 크기에 비례합니다. 외부 lock 대기, cache miss도 별도입니다. 이 글에서는 시간을 재지 않았습니다.

## API 사용 — mattconte TLSF

이 저장소는 **BSD license**이며 `tlsf_t`는 opaque handle입니다. 다음 예제는 64 KiB static 배열 하나에 control 구조와 pool을 함께 만들고, 외부에서 직렬화해서 쓰는 단일 인스턴스입니다.

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

이 코드를 그대로 Cortex-M3 빌드에 넣어 돌렸습니다. 32-bit target의 크기 상수는 다음과 같습니다.

```text
sizeof(size_t)=4 SL_INDEX_COUNT=32 FL_INDEX_COUNT=24 SMALL_BLOCK_SIZE=128
tlsf_size()=3188 tlsf_align_size()=4 tlsf_block_size_min()=12 tlsf_block_size_max()=1073741824 tlsf_pool_overhead()=8 tlsf_alloc_overhead()=4
memory_init() -> 1
```

control 구조(`tlsf_size()`)가 3188 byte입니다. FL 24개 × SL 32개의 list 머리 포인터 배열이 대부분이라, 64 KiB pool이면 약 5%를 관리 구조에 씁니다. 작은 MCU에서는 `SL_INDEX_COUNT_LOG2`를 4로 줄이면 이 배열이 FL 25 × SL 16으로 약 절반이 됩니다(`tlsf.c:207-211` 주석이 4나 5를 전형적인 값으로 듭니다). 정렬은 4 byte이고(`ALIGN_SIZE_LOG2 = 2`, `:222`), 한 block의 최대 크기는 2^30 byte입니다.

경계 입력도 확인했습니다.

```text
tlsf_malloc(0) -> NULL
tlsf_malloc(1 MiB) from 64 KiB pool -> NULL
tlsf_realloc(8 -> 3000) preserved first 8 bytes: 1
```

추가 pool은 `tlsf_add_pool()`로 붙이고, `tlsf_remove_pool()`은 그 pool에 살아 있는 할당이 없을 때만 씁니다. pool 단위로 메모리 종류를 나눠 주는 기능은 없으므로, DMA용 메모리는 별도 TLSF 인스턴스로 만듭니다.

## Thread Safety와 대상 선택

README의 Caveats(`README.md:17-18`)는 "Not designed to be thread safe; the user must provide this"라고 적습니다. FreeRTOS에서 쓴다면 heap_4처럼 `vTaskSuspendAll()`/`xTaskResumeAll()`로 감싸 task 사이를 직렬화하고, ISR에서는 부르지 않습니다. ISR에서도 써야 한다면 critical section으로 감싸야 하는데, 그러면 할당 시간만큼 interrupt가 막힙니다. 같은 Caveats는 4 byte 정렬 접근이 가능한 architecture를 가정한다고도 적습니다.

선택 기준은 탐색 횟수의 상한이 필요한가입니다. heap_4의 free block 수가 작게 유지되는 시스템이라면 3188 byte의 control 구조를 따로 쓸 이유가 약하고, free block이 수십 개로 늘어나는 시스템에서 할당 시간의 상한이 필요하면 TLSF가 맞습니다.

## 검증할 항목

위 실행이 다룬 것은 0 byte 요청, pool보다 큰 요청, 단편화 상태의 실패와 전부 반납 후 회복, realloc 내용 보존, 그리고 각 단계의 `tlsf_check()` 결과(0 = 정상)입니다. 시간은 재지 않았습니다. 예전 판에도 원시 로그가 있는 µs 표는 없었습니다.

## 정리

- 고정 구현은 32개 SL, 128 byte 미만은 FL 0 하나에 4 byte 간격으로 둡니다.
- 할당은 요청을 다음 SL로 올려서 찾고, 그래서 1000 byte 요청은 SL 30이 아니라 31부터 봅니다.
- Cortex-M3에서 `fls`는 `clz` 한 명령, `ffs`는 `rbit`+`clz` 두 명령으로 컴파일됐습니다.
- 32-bit 빌드의 control 구조는 3188 byte이고, TLSF도 1000/96 교대 할당의 단편화는 heap_4와 똑같이 겪습니다.
- thread safety는 사용자가 제공해야 합니다.

다음 [4-04 Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)에서 RTOS 객체의 storage·초기화·linker 경계를 살펴봅니다.

## 근거 자료

- [mattconte/tlsf 고정 소스](https://github.com/mattconte/tlsf/tree/deff9ab509341f264addbd3c8ada533678591905): tlsf.c·tlsf.h·README(라이선스·thread safety). 본문 줄 번호는 이 commit 기준입니다.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
