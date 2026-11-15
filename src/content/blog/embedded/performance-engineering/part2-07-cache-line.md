---
title: "Cache Line 최적화 — Alignment·Prefetch·False Sharing 처리"
slug: "embedded/performance-engineering/part2-07-cache-line"
date: 2026-04-24T09:06:00
description: "64-byte line alignment, software prefetch, false sharing 회피, SoA·AoS 선택."
series: "Embedded Performance Engineering"
seriesOrder: 15
tags: [cache, line, alignment, prefetch, false-sharing]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cache line 활용 = spatial locality 활용"**입니다. 한 번 fetch한 line 안에서 최대한 많은 일을 처리합니다.

## Cache Line 크기

| 대상 | line size 확인 방법 |
|---|---|
| Cortex-M7 | 해당 revision TRM 및 MCU cache 구성 확인 |
| Cortex-A / x86 / Apple / IBM POWER | 코어 세대와 cache level별 공식 자료 또는 런타임 조회 확인; 하나의 값으로 일반화하지 않음 |

매크로:

```c
#define CACHE_LINE_SIZE 64

#if defined(__cpp_lib_hardware_interference_size)
#include <new>
constexpr size_t CACHE_LINE = std::hardware_destructive_interference_size;
#endif
```

## Alignment

```c
__attribute__((aligned(64))) struct hot_data {
    uint32_t counter;
    uint32_t flag;
};

// 또는 C11
alignas(64) uint32_t buffer[256];

// 또는 C++11
alignas(64) struct Foo { ... };
```

배열 정렬:

```c
__attribute__((aligned(64))) static int matrix[1024][1024];
```

DMA descriptor/buffer alignment는 주변장치·DMA·cache maintenance 규칙을 따릅니다. SIMD load는 ISA가 허용하는 정렬을 확인합니다. misaligned access의 penalty 또는 fault 여부는 target core와 memory region에 따라 다릅니다.

64-byte line 안의 데이터 배치가 성능을 결정합니다. 같은 line에 무엇이 들어 있느냐에 따라 좋은/나쁜 패턴이 갈립니다.

![64-byte cache line의 세 가지 배치 — 섞임/분리/false sharing](/images/blog/perf-eng/diagrams/part2-07-cache-line-layout.svg)

## False Sharing 방지

```c
// 회피 — 두 atomic이 같은 line
struct counters {
    atomic_int producer_count;
    atomic_int consumer_count;
};

// Good — line 분리
struct counters {
    alignas(64) atomic_int producer_count;
    alignas(64) atomic_int consumer_count;
};
```

false sharing의 비용은 coherence protocol, access rate, thread placement와 workload에 따라 달라집니다. 원인을 확인하려면 대상 PMU/coherence event 또는 대조 실험을 사용합니다.

## Hot-Cold Splitting

```c
// 회피 — 자주 / 드물게 쓰는 field 섞임
struct guest {
    int id;
    int active;
    char address[256];        // 드물게 사용
    char email[128];          // 드물게
    int last_login;           // hot
};

// Good — hot/cold 분리
struct guest_hot {
    int id;
    int active;
    int last_login;
};

struct guest_cold {
    char address[256];
    char email[128];
};
```

hot loop이 guest_hot만 순회하므로 cache 효율이 올라갑니다.

## SoA vs AoS

```c
// AoS — Array of Structures
struct particle { float x, y, z, vx, vy, vz, mass; } parts[N];
for (i = 0; i < N; i++) {
    parts[i].x += parts[i].vx * dt;   // x, vx만 사용, y/z/mass도 fetch됨
}

// SoA — Structure of Arrays
struct {
    float x[N], y[N], z[N];
    float vx[N], vy[N], vz[N];
    float mass[N];
} parts_soa;
for (i = 0; i < N; i++) {
    parts_soa.x[i] += parts_soa.vx[i] * dt;   // x, vx만 fetch
}
```

SIMD에 최적입니다. 연속된 x 4개를 NEON 벡터로 load할 수 있습니다. 게임 엔진과 물리 시뮬에서는 표준 패턴입니다.

## Software Prefetch

```c
for (i = 0; i < N; i++) {
    __builtin_prefetch(&data[i + 8], 0 /* read */, 0 /* no temp */);
    process(data[i]);
}
```

매개변수는 다음과 같습니다.

| 인자 | 의미 |
|---|---|
| addr | prefetch 주소 |
| rw | 0 = read, 1 = write (write intent) |
| locality | 0 = NTA (non-temporal), 1-3 = temporal hint (3=highest) |

ARM 명령은 다음과 같습니다.

```asm
pld [r0, #64]    ; preload data
pldw [r0, #64]   ; preload data for write
pli [r0, #64]    ; preload instruction
```

거리는 *latency / cycle per iter*로 잡습니다. L1 miss가 12 cycle이고 iter가 3 cycle이면 4 element 앞을 prefetch합니다.

## Hardware Prefetcher 활성화

Hardware prefetcher의 존재·제어 방법은 코어 구현별입니다. Cortex-M7의 `CCR.BP`는 branch prediction 관련 비트이지 일반 data prefetch 제어 레지스터가 아닙니다. 해당 MCU TRM을 확인합니다.

## Streaming Access — Non-Temporal Stores

```c
for (i = 0; i < N; i++) {
    arr[i] = compute(i);   // 한 번 쓰고 안 읽음 — cache 입력 의미 없음
}
```

AArch64 `STNP`는 non-temporal hint가 붙은 pair store입니다. 이것만으로 모든 구현에서 cache bypass를 보장한다고 해석하지 않습니다. x86에서는 `MOVNT`에 해당합니다.

```c
__builtin_nontemporal_store(value, &arr[i]);
```

큰 buffer 초기화나 copy에서 효과를 보며 cache pollution을 방지합니다.

## Cache Line Pad — Producer/Consumer Queue

```c
struct spsc_queue {
    alignas(64) atomic_size_t head;   // producer만 쓰는 line
    char pad1[64 - sizeof(atomic_size_t)];
    
    alignas(64) atomic_size_t tail;   // consumer만 쓰는 line
    char pad2[64 - sizeof(atomic_size_t)];
    
    alignas(64) T data[CAPACITY];
};
```

Producer와 consumer가 서로 다른 CPU core에 있을 때 false sharing을 회피할 수 있습니다.

## Cache Maintenance — DMA·Coherence

```c
/* Cortex-M7 + DMA receive */
uint8_t dma_buf[256] __attribute__((aligned(32)));

HAL_UART_Receive_DMA(&huart, dma_buf, 256);
/* DMA wrote to memory, CPU cache는 stale */

SCB_InvalidateDCache_by_Addr((uint32_t*)dma_buf, 256);
/* 이제 CPU read시 fresh data */

process(dma_buf);
```

```c
/* DMA transmit — CPU writes to buf */
fill_data(dma_buf);
SCB_CleanDCache_by_Addr((uint32_t*)dma_buf, 256);   // flush cache → memory
HAL_UART_Transmit_DMA(&huart, dma_buf, 256);
```

| 함수 | 동작 |
|---|---|
| `Clean` | cache → memory (write-back) |
| `Invalidate` | cache line 폐기 |
| `CleanInvalidate` | flush + 폐기 |

## Hot Path 정렬

```c
__attribute__((hot)) void critical_function(void) { ... }
__attribute__((cold)) void error_handler(void) { ... }
```

GCC가 hot 함수를 연속 배치해 I-cache locality를 향상시킵니다.

`-fprofile-use`로 PGO(Profile-Guided Optimization)를 적용하면 실제 실행 분포에 따라 배치합니다.

## 자주 하는 실수

> ⚠️ Misaligned struct

```c
struct {
    char flag;       // 1 byte
    int value;       // 4 byte — offset 1? 또는 4 (padding)?
    char name[3];
} thing;             // → 12 byte? sizeof 확인
```

Unaligned access의 지원과 예외 동작은 instruction, memory type, core와 configuration에 따라 다릅니다. Target TRM과 memory attributes를 확인합니다.

> ⚠️ Prefetch 거리 잘못

```c
__builtin_prefetch(&arr[i + 1]);   // 너무 가까움 — 효과 없음
__builtin_prefetch(&arr[i + 1000]); // 너무 멈 — evict 가능
```

벤치마크 측정으로 최적 거리를 찾습니다.

> ⚠️ Volatile + cache line padding

```c
volatile struct { alignas(64) int a; alignas(64) int b; } v;
```

`volatile`은 컴파일러의 캐싱을 차단합니다. False sharing은 hardware 차원의 문제로 두 개념은 별개입니다.

> ⚠️ SoA를 모든 경우에 사용

Random access나 한 객체의 여러 field를 동시에 사용하는 패턴에서는 AoS가 유리합니다. 적용 전에 반드시 접근 패턴을 분석해야 합니다.

## 정리

- Cache line 크기는 target별로 확인하고 필요한 alignment를 `alignas` 등으로 지정합니다.
- **False sharing**은 multi-CPU 변수를 line 단위로 분리해 회피합니다.
- **SoA**는 SIMD와 streaming에 유리합니다.
- **Software prefetch**는 적절한 거리에서만 효과가 있습니다.
- data cache가 활성화된 Cortex-M7 MCU에서 non-coherent DMA buffer를 공유할 때는 DMA 방향·ownership 전환·cache line 정렬에 맞춰 clean/invalidate를 수행합니다. MCU reference manual과 vendor HAL 요구사항을 따릅니다.

다음 편은 **Memory Bandwidth**입니다.

## 관련 항목

- [2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
