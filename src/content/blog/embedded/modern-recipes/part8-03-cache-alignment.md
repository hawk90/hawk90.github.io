---
title: "Cache Line Alignment — alignas·Padding·SoA 적용"
slug: "embedded/modern-recipes/part8-03-cache-alignment"
date: 2026-04-17T09:02:00
description: "Cache line 정렬과 false sharing 회피, hot/cold 분리, SoA 변환을 코드와 측정으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 91
tags: [recipes, cache, alignment, padding, soa]
topics: ["embedded"]
---

## 한 줄 요약

> **객체의 시작 정렬, 배열 원소의 간격, 함께 읽는 데이터의 배치를 각각 설계합니다.** false sharing 완화와 DMA cache 관리는 목적이 다르며, alignment 하나로 동기화나 소유권 문제가 해결되지는 않습니다.

## 어떤 상황에서 쓰나

서로 다른 코어가 독립적인 카운터를 갱신해도 같은 cache line을 공유하면 소유권을 주고받는 traffic이 생길 수 있습니다. 같은 건물의 별도 방을 쓰더라도 공용 출입문 하나를 번갈아 잠그는 상황과 비슷합니다. 필요한 것은 카운터의 주소가 다르다는 사실보다 실제 coherence 단위가 겹치는지입니다.

반면 SoA는 한 종류의 부품만 쓰는 조립 라인에 필요한 상자만 가까이 두는 방식입니다. cache line마다 관심 없는 field를 함께 가져오는 일을 줄이려는 설계이며, atomic 카운터를 떨어뜨리는 문제와 구별합니다. DMA에서는 한 묶음의 캐시 라인을 통째로 소유하는 것이 중요합니다. 한 장의 종이를 나눠 쓰다가 한쪽 메모를 지우면 옆 메모도 잃을 수 있듯, invalidate 범위에 다른 객체의 dirty byte가 끼어 있으면 데이터가 사라질 수 있습니다.

이 글은 **정렬과 데이터 배치를 만드는 코드**에 집중합니다. 상세한 false-sharing 진단·부하 비교는 [9-09](/blog/embedded/modern-recipes/part9-09-false-sharing), DMA 할당 영역과 장치 계약은 [8-04](/blog/embedded/modern-recipes/part8-04-dma-allocator)로 이어집니다. 보드 실측 없이 고정 cycle이나 배속을 제시하지 않습니다.

## 먼저 분리할 세 가지 조건

다음 그림은 같은 line의 독립 counter와 분리된 counter를 비교합니다. 그림의 line 폭은 설명용이며 모든 CPU에서 같은 byte 수를 뜻하지 않습니다.

![Cache line alignment — false sharing 회피](/images/blog/modern-recipes/diagrams/part3-01-cache-alignment.svg)

| 조건 | 검사 방법 | 보장하지 않는 것 |
|---|---|---|
| 객체 시작 정렬 | alignof와 주소 나머지 | 내부 field가 서로 다른 line에 있음 |
| 배열 원소 간격 | sizeof와 인접 원소 주소 차이 | 실제 CPU의 coherence 단위와 일치함 |
| 접근할 데이터의 밀집 | field offset·loop의 접근 집합 | throughput·vectorization 개선 |

C++17의 `std::hardware_destructive_interference_size`는 구현이 제공하는 배치 권고 상수입니다. runtime에서 현재 CPU의 모든 cache level을 조회한 결과가 아니며, library에서 해당 기능을 제공하는지도 feature-test macro로 확인합니다. 이 값을 공개 ABI에 직접 넣으면 toolchain 옵션에 따라 구조체 layout이 바뀔 수 있으므로 안정된 ABI에서는 프로젝트의 배치 상수를 명시적으로 관리합니다.

Linux에서 `sysconf(_SC_LEVEL1_DCACHE_LINESIZE)`를 쓰는 경우도 해당 상수가 지원되는지와 실패 반환을 처리해야 합니다. L1 line 크기 하나를 SMP 전체의 모든 간섭 범위나 DMA 최소 정렬로 일반화하지 않습니다. 아래 C++ 예제는 **64-byte 간격을 선택한 배치 실험**이며 실행 중인 Mac이나 target의 실제 line 크기라는 주장이 아닙니다.

## 타입 정렬로 배열 원소 간격 만들기

배열 시작만 정렬하면 원소는 원래 sizeof만큼 이어집니다. 각 원소가 떨어져 있어야 한다면 원소 타입에 alignment를 부여하고 실제 stride를 검사합니다. 빈 padding 배열을 직접 계산하면 `line - sizeof(T)`의 underflow나 길이 0 배열 문제가 생길 수 있으므로 compiler의 tail padding을 활용합니다.

다음 C++17 코드는 선택한 간격보다 큰 payload를 컴파일 시 거부합니다.

```cpp title="cache-slot.hpp"
#pragma once
#include <atomic>
#include <cstddef>

template<std::size_t Spacing, class T>
struct alignas(Spacing) CacheSlot {
    static_assert(Spacing != 0 && (Spacing & (Spacing - 1)) == 0,
                  "spacing must be a power of two");
    static_assert(sizeof(T) <= Spacing && alignof(T) <= Spacing,
                  "payload exceeds chosen spacing");
    T value{};
};

constexpr std::size_t kSpacing = 64;
using CounterSlot = CacheSlot<kSpacing, std::atomic<unsigned>>;
static_assert(alignof(CounterSlot) == kSpacing, "slot alignment");
static_assert(sizeof(CounterSlot) == kSpacing, "slot stride");
```

`CounterSlot counters[2]`에서는 시작 정렬뿐 아니라 원소 사이 간격도 64 byte입니다. 실제 coherence 단위가 더 크면 두 slot이 여전히 같은 단위를 공유할 수 있습니다. 반대로 간격을 과하게 키우면 RAM·cache 용량·TLB 부담이 커집니다. 배열 하나의 시작에만 alignas를 붙이는 것과는 구별합니다.

### SPSC head/tail은 배치와 순서 보장 구분하기

다음은 head/tail을 떨어뜨리는 저장 구조만 보여 줍니다. `CacheSlot`의 정의와 함께 사용합니다.

```cpp title="spsc-layout.hpp"
#pragma once
#include "cache-slot.hpp"

template<class T, std::size_t N>
struct SpscLayout {
    static_assert(N > 1, "at least two slots required");
    CacheSlot<kSpacing, std::atomic<std::size_t>> head;
    CacheSlot<kSpacing, std::atomic<std::size_t>> tail;
    alignas(kSpacing) T buf[N]{};
};
```

producer가 head를 쓰고 consumer가 tail을 쓰더라도 양쪽은 상대 index를 읽습니다. index 게시·조회와 payload 전달에 필요한 coherence traffic은 남습니다. alignment가 release/acquire 순서, 슬롯 재사용, full/empty 판정이나 atomic의 lock-free 성질을 보장하지 않습니다. 실제 queue 연산은 [SPSC 구현](/blog/embedded/modern-recipes/part9-01-lock-free-ring)의 별도 계약입니다.

## AoS와 SoA는 같은 데이터를 유지하며 비교하기

x와 vx만 읽는 loop라면 AoS의 다른 field가 같은 line에 들어올 수 있습니다. SoA는 x와 vx를 연속 배열로 만들지만 모든 field를 함께 쓰는 loop에서는 AoS도 후보입니다. 비교할 때 한쪽 데이터나 field를 없애서 이득처럼 보이게 만들지 않습니다.

다음 예제는 두 layout 모두 동일한 7개 float field를 유지하며 x만 갱신합니다.

```cpp title="particle-layout.hpp"
#pragma once
#include <cstddef>

constexpr std::size_t kParticles = 128;
struct Particle { float x, y, z, vx, vy, vz, mass; };
struct ParticleSoa {
    alignas(64) float x[kParticles]{};
    alignas(64) float y[kParticles]{};
    alignas(64) float z[kParticles]{};
    alignas(64) float vx[kParticles]{};
    alignas(64) float vy[kParticles]{};
    alignas(64) float vz[kParticles]{};
    alignas(64) float mass[kParticles]{};
};

inline void advance_aos(Particle (&p)[kParticles], float dt) {
    for (std::size_t i = 0; i < kParticles; ++i) p[i].x += p[i].vx * dt;
}
inline void advance_soa(ParticleSoa& p, float dt) {
    for (std::size_t i = 0; i < kParticles; ++i) p.x[i] += p.vx[i] * dt;
}
```

x와 vx 두 field만 읽는다고 해서 정확히 나머지 비율만큼 메모리 traffic이 낭비된다고 계산하지 않습니다. cache line 재사용·write allocate·prefetch·vectorization·working set이 실제 traffic을 결정합니다. SIMD를 적용하면 별도로 tail·load 범위·floating-point 계산 순서도 확인합니다.

### Hot/cold는 배열 단위로 분리하기

큰 struct의 앞부분에 hot field를 모아도 다음 요소까지의 stride에는 cold 영역이 들어갑니다. 자주 순회하는 데이터가 작다면 두 배열로 나눠 hot 요소끼리 모으는 방법을 비교할 수 있습니다.

다음은 같은 index가 한 사용자를 뜻하는 배치 예제입니다.

```cpp title="hot-cold.hpp"
#pragma once
#include <cstddef>
#include <cstdint>

constexpr std::size_t kGuests = 128;
struct GuestHot { std::uint32_t id, active, last_login; };
struct GuestCold { char email[128]; char address[256]; };
struct GuestStore {
    GuestHot hot[kGuests]{};
    GuestCold cold[kGuests]{};
};
```

삭제·정렬·압축 시 두 배열의 index 대응을 함께 유지해야 합니다. hot 필드를 여럿이 동시에 갱신하면 이 배열에도 false sharing이 생길 수 있습니다. 데이터 밀집과 독립 writer의 격리는 서로 다른 목표이므로 무조건 모든 요소에 padding을 넣지는 않습니다.

## C11 카운터의 정렬과 합산 의미

C11에서는 C++의 `struct alignas(...)` 문법 대신 member에 alignas를 붙입니다. 다음은 4개 shard를 갖는 예제이며 `cpu` 값은 호출자가 매핑한 유효 index입니다. 배열을 만든 것만으로 scheduler가 task를 코어에 고정하지는 않습니다.

```c title="counter-shards.c"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdalign.h>
#include <stdatomic.h>

enum { COUNTER_SHARDS = 4, COUNTER_SPACING = 64 };
struct counter_shard { alignas(COUNTER_SPACING) _Atomic(uint64_t) value; };
_Static_assert(sizeof(struct counter_shard) == COUNTER_SPACING, "shard stride");
static struct counter_shard counters[COUNTER_SHARDS];

bool counter_add(size_t cpu, uint64_t delta) {
    if (cpu >= COUNTER_SHARDS) return false;
    atomic_fetch_add_explicit(&counters[cpu].value, delta, memory_order_relaxed);
    return true;
}
uint64_t counter_sum(void) {
    uint64_t result = 0;
    for (size_t i = 0; i < COUNTER_SHARDS; ++i)
        result += atomic_load_explicit(&counters[i].value, memory_order_relaxed);
    return result;
}
```

각 load는 atomic이어도 전체 합은 한 시점의 일관된 snapshot이 아닙니다. 종료 후 모든 writer와 join한 상태에서는 최종 합을 비교할 수 있습니다. unsigned 합산은 64-bit 범위를 넘으면 modulo로 돌아가며, payload를 게시하는 동기화 용도로 쓰지 않습니다. `_Atomic(uint64_t)`가 target에서 lock-free인지도 별도 확인하며 ISR에 적합하다고 가정하지 않습니다.

Linux kernel의 [v6.12 include/linux/cache.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/cache.h)는 `____cacheline_aligned`를 `SMP_CACHE_BYTES` 기반 alignment attribute로 정의합니다. `CONFIG_SMP`에 따른 변종과 section을 함께 지정하는 변종도 있습니다. 사용자 공간의 C++ 상수를 kernel macro와 섞거나 모든 kernel 구성에서 같은 byte 수라고 가정하지 않습니다.

## DMA에서는 line 전체의 소유권 관리하기

invalidate는 단순히 hot data를 cache에서 빼는 문제가 아닙니다. CPU가 수정했지만 메모리에 쓰지 않은 dirty line을 버리면 옆 객체의 최신 값까지 잃을 수 있습니다. receive buffer는 시작 주소와 전체 저장 크기를 cache line에 맞춰 다른 객체와 line을 나누어 쓰지 않는 것이 한 가지 설계입니다.

다음은 CMSIS의 Cortex-M7 D-cache API에 맞춰 32-byte line을 사용하는 예입니다. 실제 DMA 전송 길이는 65 byte지만 소유하는 저장소는 96 byte입니다. `SCB_InvalidateDCache_by_Addr` 선언은 사용 중인 device/CMSIS 헤더를 통해 포함합니다.

```c title="dma-cache-storage.c"
#include <stdint.h>
#include <stdalign.h>

enum { M7_LINE = 32, RX_BYTES = 65 };
enum { RX_STORAGE = ((RX_BYTES + M7_LINE - 1) / M7_LINE) * M7_LINE };
alignas(M7_LINE) static uint8_t dma_rx[RX_STORAGE];
_Static_assert(sizeof(dma_rx) % M7_LINE == 0, "whole cache lines");

void rx_before_dma(void) {
    SCB_InvalidateDCache_by_Addr(dma_rx, (int32_t)sizeof(dma_rx));
}
void rx_after_dma_complete(void) {
    SCB_InvalidateDCache_by_Addr(dma_rx, (int32_t)sizeof(dma_rx));
}
```

호출자는 전용 buffer의 이전 내용을 버려도 되는 상태에서 첫 함수를 호출하고, DMA가 실제로 멈춘 뒤 두 번째 함수를 호출합니다. 그 사이 CPU는 해당 buffer에 접근하지 않습니다. DMA error·취소도 장치가 더 이상 쓰지 않는지 확인한 뒤 소유권을 돌려줍니다. 이 코드는 cache 관리 단계만 보이며 DMA stream 설정·interrupt·완료 판정은 구현하지 않습니다.

TX에서는 CPU가 준비한 데이터를 DMA가 읽기 전에 clean하는 등 방향별 protocol이 다릅니다. coherent DMA와 non-cacheable 영역은 별도 계약을 사용합니다. cache 함수가 내부에서 범위를 확장해 준다고 해도 shared boundary line의 소유권 문제를 해결해 주지는 않습니다. 자세한 allocator·영역 선택은 다음 장에서 다룹니다.

## 검증할 것은 배치, 결과 동일성, 제품 성능

먼저 코드가 의도한 layout을 만드는지 검사합니다. C++17의 over-aligned 타입은 지원되는 toolchain과 allocator에서 올바르게 배치되어야 합니다. 지역 객체의 alignas가 조용히 무시된다고 설명하거나 ARM에서 x86용 stack 옵션을 권하지 않습니다. 전역 객체는 최종 linker 배치도 검사합니다.

| 대상 | 기능·구조 검사 | 별도 제품 검증 |
|---|---|---|
| CacheSlot | type alignment·배열 stride·큰 payload 거부 | 실제 coherence 단위·RAM/working set 비용 |
| SPSC layout | head/tail/buffer offset | 게시 순서·race·목표 부하 |
| AoS/SoA | 같은 입력의 결과와 미갱신 field 유지 | compiler vectorization·cache traffic·처리량 |
| shard counter | index 거부·동시 갱신 뒤 최종 합 | affinity·NUMA·주기적 합산 비용 |
| DMA buffer | 시작 정렬·저장 크기 96 byte | cache API·장치 종료·dirty line 소유권 |

기존의 Cortex-A72 고정 load cycle, 측정하지 않은 8~10배 개선, 코어 수에 따른 선형 scaling 주장은 사용하지 않습니다. 최종 성능 비교에는 CPU/SoC·clock·compiler/flag·thread 배치·메모리 속성·반복 조건·분포와 실제 입력을 함께 기록합니다.

### 이번 예제 검증 결과

Clang 23.1.6의 ASan/UBSan에서 stack·C++17 new 배열의 slot 정렬과 stride, SPSC 저장 구조의 offset, 너무 큰 payload의 컴파일 거부를 확인했습니다. AoS/SoA에 동일한 128개 입력을 넣어 x의 계산 결과와 나머지 6개 field가 같음을 검사했습니다. shard별 4개 host thread가 각각 10000회 갱신한 뒤 join하고 최종 합 40000을 확인했으며 실행 시간은 비교하지 않았습니다.

실제 CMSIS 6 헤더로 Cortex-M7 cache API 호출을 교차 컴파일하고, 최종 ARM ELF에서 dma_rx의 32-byte 시작 정렬과 96-byte 저장소를 확인했습니다. 이 결과는 DMA·cache 유지보수 명령을 실제 보드에서 실행했다는 뜻이 아닙니다.

## 정리

- 타입 정렬은 sizeof와 배열 stride에 반영되며, 배열 시작만 정렬하는 것과 구별합니다.
- 64 byte는 본문 배치 실험의 선택값이며 실제 target의 coherence 단위로 일반화하지 않습니다.
- head/tail을 분리해도 index와 payload 전달에 필요한 traffic·동기화는 남습니다.
- AoS/SoA는 같은 field와 결과를 유지하며, hot/cold 분리는 index 대응을 지킵니다.
- shard별 atomic 갱신과 전체 합의 snapshot 의미는 다릅니다.
- non-coherent DMA의 cache 관리는 line 소유권과 전송 방향·완료를 함께 다룹니다.

다음 편은 **DMA Allocator**입니다. alignment 외에 DMA가 접근할 수 있는 영역과 할당·반납 계약을 확인합니다.

## 관련 항목

- [8-02: 메모리 정렬](/blog/embedded/modern-recipes/part8-02-memory-alignment)
- [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
- [8-04: DMA Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)

## 1차 자료

- [C++ draft hardware interference size](https://eel.is/c++draft/hardware.interference): 구현이 제공하는 배치 권고값의 의미입니다.
- [C++ draft alignment](https://eel.is/c++draft/basic.align), [sizeof](https://eel.is/c++draft/expr.sizeof): 타입 정렬·배열 stride의 근거입니다.
- [C11 draft N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf), §6.7.5·7.17: C11 정렬 문법과 atomic 계약입니다.
- [CMSIS Cortex-M7 D-cache API](https://arm-software.github.io/CMSIS_6/main/Core/group__Dcache__functions__m7.html): 주소·크기·clean/invalidate 계약입니다.
- [Linux v6.12 cache.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/cache.h): cache alignment macro의 실제 정의입니다.
