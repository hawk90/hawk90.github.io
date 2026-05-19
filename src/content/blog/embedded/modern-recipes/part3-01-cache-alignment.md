---
title: "3-01: Cache Line Alignment — alignas·Padding·SoA"
date: 2026-05-20T08:00:00
description: "Cache line 정렬 실전. alignas, struct padding, false sharing 회피, SoA 변환."
series: "Modern Embedded Recipes"
seriesOrder: 13
tags: [recipes, cache, alignment, padding, soa]
draft: true
---

## 한 줄 요약

> **"Cache line align = 1줄짜리 magic"** — alignas(64)·하나로 false sharing 회피.

## Cache Line Size 확인

```c
/* C++17 */
#include <new>
constexpr size_t CACHE_LINE = std::hardware_destructive_interference_size;
/* 보통 64, Apple M1 = 128 */

/* Runtime */
long line_size = sysconf(_SC_LEVEL1_DCACHE_LINESIZE);

/* CPU별 */
ARM Cortex-M7: 32
ARM Cortex-A53/A72: 64
Intel/AMD: 64
Apple M1/M2: 128
IBM POWER: 128
```

## alignas — Struct 정렬

```cpp
#include <cstddef>

struct alignas(64) hot_data {
    std::atomic<int> counter;
    /* ... */
};

hot_data g_data;
/* &g_data % 64 == 0 보장 */
```

C++11+. C11도 `_Alignas(64)`.

```c
/* C11 */
#include <stdalign.h>
alignas(64) struct hot_data g_data;

/* GCC·Clang */
struct hot_data { ... } __attribute__((aligned(64)));
```

## False Sharing 회피 — Padding

```cpp
struct counters {
    alignas(64) std::atomic<int> a;
    /* 60 byte padding 자동 */
    
    alignas(64) std::atomic<int> b;
    /* 60 byte padding */
};

static_assert(sizeof(counters) == 128);
```

각 atomic이 *다른 line* — multi-core write에도 ping-pong 없음.

## 명시 Padding

```c
struct counters {
    std::atomic<int> a;
    char pad_a[64 - sizeof(std::atomic<int>)];
    
    std::atomic<int> b;
    char pad_b[64 - sizeof(std::atomic<int>)];
} __attribute__((aligned(64)));
```

alignas만으로는 *struct 시작*만 정렬. *element 사이* padding 필요.

## SPSC Ring Buffer

```cpp
template<typename T, size_t N>
struct spsc_ring {
    alignas(64) std::atomic<size_t> head;
    char pad_h[64 - sizeof(std::atomic<size_t>)];
    
    alignas(64) std::atomic<size_t> tail;
    char pad_t[64 - sizeof(std::atomic<size_t>)];
    
    alignas(64) T buf[N];
};
```

Producer·consumer가 *서로 다른 line의 변수* update → coherency traffic 0.

## Array of Structures vs Structure of Arrays

```cpp
/* AoS — Array of Structures */
struct particle { float x, y, z, vx, vy, vz, mass; };
particle parts[N];

for (int i = 0; i < N; i++) {
    parts[i].x += parts[i].vx * dt;
    /* y/z/mass도 fetch — *낭비* */
}

/* SoA — Structure of Arrays */
struct particles_soa {
    alignas(64) float x[N];
    alignas(64) float y[N];
    alignas(64) float z[N];
    alignas(64) float vx[N];
    alignas(64) float vy[N];
    alignas(64) float vz[N];
    alignas(64) float mass[N];
};

for (int i = 0; i < N; i++) {
    parts.x[i] += parts.vx[i] * dt;
    /* x·vx만 fetch */
}
```

SoA — *SIMD 친화*. NEON `vld1q_f32(&parts.x[i])`로 4 float load.

## DMA Buffer Alignment

```c
/* DMA buffer — cache line aligned */
alignas(64) uint8_t dma_buf[1024];

/* Cortex-M7 DMA */
HAL_DMA_Start(&hdma, src, (uint32_t)dma_buf, sizeof(dma_buf));

/* Cache maintenance */
SCB_CleanDCache_by_Addr((uint32_t*)dma_buf, sizeof(dma_buf));
```

DMA + cacheable buffer — *line aligned* 권장. Misalign 시 *neighbor line도 영향*.

## Per-CPU Counter

```c
struct counter_per_cpu {
    alignas(64) atomic_long value;
} per_cpu_counters[NUM_CORES];

void inc(int cpu) {
    atomic_fetch_add(&per_cpu_counters[cpu].value, 1);
}

long sum_all(void) {
    long s = 0;
    for (int i = 0; i < NUM_CORES; i++)
        s += atomic_load(&per_cpu_counters[i].value);
    return s;
}
```

SMP — false sharing 0 + scaling 선형.

## SIMD Load Alignment

```c
/* NEON */
float32x4_t va = vld1q_f32(&data[i]);   /* aligned: 1 cycle */
                                         /* misaligned: 2 cycle */
```

Aligned access — *bus efficiency ↑*. 정렬되지 않으면 *split transaction*.

## C++17 PMR — 정렬 Allocator

```cpp
#include <memory_resource>

std::pmr::aligned_alloc_resource res(64);
std::pmr::vector<int> v(&res);
```

C++17 polymorphic allocator — *custom alignment*.

## Hot/Cold 분리

```cpp
struct guest {
    /* Hot — 자주 사용, alignas(64) */
    alignas(64) int id;
    int active;
    int last_login;
    /* 56 byte pad to fill cache line */
    
    /* Cold — 드물게 */
    char email[128];
    char address[256];
};
```

Hot loop은 *line 1개만* fetch. Cold는 별도 line.

## Struct Layout 측정

```cpp
#include <iostream>
#include <type_traits>

std::cout << sizeof(particle) << "\n";
std::cout << alignof(particle) << "\n";
std::cout << offsetof(particle, vx) << "\n";

static_assert(sizeof(particle) % 64 == 0,
              "particle should be multiple of cache line");
```

## C++20 — `std::aligned_alloc`

```cpp
#include <cstdlib>

void *p = std::aligned_alloc(64, 1024);
free(p);   /* 표준 free */
```

C11 `aligned_alloc(64, 1024)`. POSIX `posix_memalign`도 동일.

## Misalignment 비용

```text
Cortex-M3/M4: hard fault on misalign (default)
Cortex-M7+: configurable trap
Cortex-A: 2-3 cycle slow (cross-line)
Intel/AMD: ~10% slow
```

ARMv7 `SCB->CCR.UNALIGN_TRP=0` — fault 안 함 (성능↓).

## Linux Kernel — `__cacheline_aligned`

```c
#include <linux/cache.h>

struct foo {
    int a;
    int b ____cacheline_aligned;   /* 새 line */
};

static struct bar ____cacheline_aligned g_bar;
```

Linux kernel — *standard 매크로*. Per-CPU data·hot field에 사용.

## 자주 하는 실수

> ⚠️ alignas로 element 모두 정렬

```cpp
struct foo {
    alignas(64) int a;
    int b;   /* a 같은 line — *padding 없음* */
};
```

→ b도 alignas 또는 *명시 pad*.

> ⚠️ Stack 변수 align 가정

```c
void func(void) {
    alignas(64) int x;   /* stack align 보장 안 됨 */
}
```

→ GCC `-mstackrealign` 또는 *static·heap*.

> ⚠️ 32-byte cache line MCU에 64 align

```c
/* Cortex-M7 — 32 byte line */
alignas(64) int x;   /* 2x 낭비 */
```

→ chip별 정확한 line size.

> ⚠️ Misalign 전제 코드

```c
struct {
    char c;
    int i;
} packed __attribute__((packed));
/* i가 misaligned → ARMv6/M0에선 fault */
```

→ `aligned` 또는 *natural alignment*.

## 정리

- **alignas(64)** = false sharing 회피 1줄.
- 각 element도 정렬 — 명시 padding 또는 alignas.
- **SoA**가 SIMD·sequential access에 유리.
- Per-CPU counter — alignas로 scaling.
- Cortex-M3/M4 misalign = hard fault.
- Linux kernel `____cacheline_aligned` 표준.

다음 편은 **DMA Allocator**.

## 관련 항목

- [2-06: Timer Wheel](/blog/embedded/modern-recipes/part2-06-timer-wheel)
- [3-02: DMA Allocator](/blog/embedded/modern-recipes/part3-02-dma-allocator)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
