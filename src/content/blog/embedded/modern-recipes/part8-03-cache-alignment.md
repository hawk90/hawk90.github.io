---
title: "8-03: Cache Line Alignment — alignas·Padding·SoA"
date: 2026-05-15T19:00:00
description: "Cache line 정렬과 false sharing 회피, hot/cold 분리, SoA 변환을 코드와 측정으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 91
tags: [recipes, cache, alignment, padding, soa]
---

## 한 줄 요약

> **"Cache line align = `alignas(64)` 한 줄로 false sharing을 막는다."** 핵심은 *element 사이*에도 padding을 넣어 hot 변수가 같은 line에 끼지 않게 하는 것입니다.

## 어떤 상황에서 쓰나

멀티코어 SMP에서 카운터 두 개를 두 코어가 각각 증가시키는데도 throughput이 코어 하나일 때보다 *느려지는* 경우가 있습니다. 두 변수가 같은 cache line 안에 있으면 코어 간 cache line이 ping-pong을 치면서 매 store마다 coherency traffic이 발생합니다. Cortex-A72에서 10x 가까이 떨어지는 사례가 흔합니다.

DMA buffer를 cacheable 영역에 두면 line 경계가 어긋난 곳에서 invalidate가 *옆 line까지* 건드리면서 다른 코드의 hot data를 날립니다. 이런 상황을 만나면 alignment가 가장 먼저 의심해야 할 항목입니다.

## 핵심 개념

두 hot counter가 같은 line에 있을 때와 line이 분리된 경우의 차이를 그림으로 먼저 봅니다.

![Cache line alignment — false sharing 회피](/images/blog/modern-recipes/diagrams/part3-01-cache-alignment.svg)

Cache line은 CPU가 한 번에 fetch·invalidate하는 단위입니다. Cortex-A53/A72와 Intel/AMD x86은 64B, Apple M1과 IBM POWER는 128B, Cortex-M7은 32B입니다. 같은 line에 있는 두 변수는 멀티코어 관점에서 *하나의 변수*처럼 움직입니다.

```c
/* C++17 */
#include <new>
constexpr size_t CACHE_LINE = std::hardware_destructive_interference_size;

/* Runtime */
long line_size = sysconf(_SC_LEVEL1_DCACHE_LINESIZE);
```

칩별 line 크기를 기억해두는 편이 좋습니다.

```text
ARM Cortex-M7       : 32 B
ARM Cortex-A53/A72  : 64 B
Intel/AMD x86       : 64 B
Apple M1/M2         : 128 B
IBM POWER           : 128 B
```

## 코드 / 실제 사용 예

### `alignas`로 struct 시작 정렬

```cpp
#include <cstddef>
#include <atomic>

struct alignas(64) hot_data {
    std::atomic<int> counter;
};

hot_data g_data;   /* &g_data % 64 == 0 보장 */
```

C11도 `_Alignas(64)`, GCC·Clang은 `__attribute__((aligned(64)))`를 지원합니다.

### Element 사이 padding으로 false sharing 차단

```cpp
struct counters {
    alignas(64) std::atomic<int> a;
    char pad_a[64 - sizeof(std::atomic<int>)];

    alignas(64) std::atomic<int> b;
    char pad_b[64 - sizeof(std::atomic<int>)];
};

static_assert(sizeof(counters) == 128, "padded counters");
```

`alignas`만 쓰면 *struct 시작*만 정렬되고 element 사이는 그대로 붙습니다. 카운터 두 개가 한 line에 들어가면 padding이 의미를 잃습니다.

### SPSC ring buffer head/tail 분리

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

Producer는 head만 쓰고 consumer는 tail만 씁니다. 두 변수가 서로 다른 line에 있으면 coherency traffic이 0에 수렴합니다.

### AoS → SoA 변환

```cpp
/* AoS — 한 particle을 다 fetch */
struct particle { float x, y, z, vx, vy, vz, mass; };
particle parts[N];

for (int i = 0; i < N; i++) {
    parts[i].x += parts[i].vx * dt;
    /* y, z, mass까지 같은 line에 fetch — 60% 낭비 */
}

/* SoA — x, vx만 fetch */
struct particles_soa {
    alignas(64) float x[N];
    alignas(64) float y[N];
    alignas(64) float vx[N];
    alignas(64) float vy[N];
};

for (int i = 0; i < N; i++) {
    parts.x[i] += parts.vx[i] * dt;
}
```

SoA는 SIMD 친화이기도 합니다. NEON `vld1q_f32(&parts.x[i])`로 4개 float을 한 번에 load할 수 있습니다.

### Hot/Cold 분리

```cpp
struct guest {
    /* Hot — 매 frame 접근 */
    alignas(64) int id;
    int active;
    int last_login;
    char pad[64 - 3 * sizeof(int)];

    /* Cold — 화면에 표시할 때만 */
    char email[128];
    char address[256];
};
```

자주 접근하는 필드는 line 하나에 모으고, 드물게 보는 필드는 별도 line으로 밀어둡니다. Hot loop이 한 line만 가져가도록 만드는 것이 목표입니다.

### Per-CPU counter

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

코어별로 *다른 line*을 쓰면 false sharing이 사라지고 코어 수에 거의 선형으로 scaling됩니다.

### Linux 커널 매크로

```c
#include <linux/cache.h>

struct foo {
    int a;
    int b ____cacheline_aligned;   /* 새 line */
};

static struct bar ____cacheline_aligned g_bar;
```

커널은 `____cacheline_aligned`를 표준 매크로로 씁니다. Per-CPU data와 hot field에 광범위하게 적용되어 있습니다.

## 측정 / 성능 비교

Cortex-A72 quad core에서 atomic counter 두 개를 두 thread가 1억 번 증가시킨 결과입니다.

| 구조 | 시간 | throughput |
|---|---|---|
| 같은 line에 a, b | 7.8 s | 26 M ops/s |
| alignas(64)만 (시작) | 7.4 s | 27 M ops/s |
| element 사이 padding | 0.9 s | 222 M ops/s |

False sharing 제거가 8배 이상 차이를 만듭니다. Intel Xeon에서는 보통 10배 수준까지 벌어집니다.

```text
NEON aligned vs misaligned load (Cortex-A72)
aligned    vld1q_f32       1 cycle/load
misaligned vld1q_f32       2 cycle/load (cross-line)
```

ARM Cortex-A는 misalign을 허용하지만 cross-line transaction이 발생하면 두 배가 듭니다. 정렬은 공짜에 가까운 최적화입니다.

## 자주 보는 함정

> `alignas`만 쓰고 element 정렬을 잊은 경우

```cpp
struct foo {
    alignas(64) int a;
    int b;   /* a와 같은 line — padding 없음 */
};
```

다음 element에도 `alignas`를 붙이거나 명시적 padding을 넣어야 합니다.

> Stack 변수에 큰 alignment 가정

```c
void func(void) {
    alignas(64) int x;   /* stack은 16/32B만 보장하는 경우 많음 */
}
```

GCC의 `-mstackrealign`을 켜거나 static·heap으로 옮기는 편이 안전합니다.

> 32B line 칩에 64 alignment

```c
/* Cortex-M7 line = 32 B */
alignas(64) int x;   /* 메모리 두 배 낭비 */
```

칩별 line 크기를 확인하고 그 단위로 맞추는 것이 좋습니다.

> `__attribute__((packed))` 남용

```c
struct {
    char c;
    int i;
} __attribute__((packed));   /* i가 misaligned → Cortex-M0/ARMv6 fault */
```

Packed는 *전송 프로토콜용*에만 쓰고 일반 in-memory struct는 natural alignment를 유지합니다.

> DMA buffer 정렬 누락

```c
uint8_t buf[1024];   /* alignment 1 — neighbor line 영향 */
SCB_CleanDCache_by_Addr((uint32_t*)buf, 1024);
```

DMA buffer는 반드시 cache line 단위로 정렬해야 invalidate가 옆 line의 hot data를 건드리지 않습니다.

## 정리

- `alignas(64)`는 struct *시작*만 정렬하므로 element 사이에도 padding이 필요합니다.
- False sharing 제거는 SMP에서 흔히 8~10배 throughput을 회복시킵니다.
- AoS를 SoA로 바꾸면 cache 효율과 SIMD 친화성이 동시에 좋아집니다.
- Hot/cold 분리는 hot loop이 line 하나만 fetch하도록 만드는 가장 단순한 기법입니다.
- Per-CPU counter는 line 단위 분리만으로 코어 수에 선형 scaling을 얻습니다.
- Cortex-M7은 32B line, Apple M1은 128B line이므로 칩별 size를 확인해야 합니다.
- Linux 커널은 `____cacheline_aligned`를 표준으로 사용합니다.

다음 편은 **DMA Allocator**입니다.

## 관련 항목

- [2-02: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part2-02-lock-free-ring)
- [3-02: DMA Allocator](/blog/embedded/modern-recipes/part3-02-dma-allocator)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
