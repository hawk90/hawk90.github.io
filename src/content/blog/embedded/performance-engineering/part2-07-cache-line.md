---
title: "2-07: Cache Line 최적화 — Alignment·Prefetch·False Sharing"
date: 2026-05-08T14:00:00
description: "64-byte line alignment, software prefetch, false sharing 회피, SoA·AoS 선택."
series: "Embedded Performance Engineering"
seriesOrder: 15
tags: [cache, line, alignment, prefetch, false-sharing]
draft: true
---

## 한 줄 요약

> **"Cache line 활용 = spatial locality 활용"** — 한 번 fetch한 line 안에서 *최대한 일 처리*.

## Cache Line 크기

| CPU | Line Size |
|---|---|
| Cortex-M7 | 32 byte |
| Cortex-A53/A72/A78 | 64 byte |
| Intel/AMD x86 | 64 byte |
| Apple M1/M2 | **128 byte** (특이) |
| IBM POWER | 128 byte |

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

DMA·SIMD에서 필수. Misaligned access는 *2 cycle* 또는 *fault* (Cortex-M0).

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

SMP 환경 — false sharing이 *10x slowdown* 흔함. 측정 — `cache-references` 폭증.

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

hot loop이 *guest_hot만* 순회 — cache 효율 ↑.

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

SIMD에 최적 — *연속 x 4개*를 NEON 벡터로 load. 게임 엔진·물리 시뮬에서 표준.

## Software Prefetch

```c
for (i = 0; i < N; i++) {
    __builtin_prefetch(&data[i + 8], 0 /* read */, 0 /* no temp */);
    process(data[i]);
}
```

매개변수:

| 인자 | 의미 |
|---|---|
| addr | prefetch 주소 |
| rw | 0 = read, 1 = write (write intent) |
| locality | 0 = NTA (non-temporal), 1-3 = temporal hint (3=highest) |

ARM 명령:

```asm
pld [r0, #64]    ; preload data
pldw [r0, #64]   ; preload data for write
pli [r0, #64]    ; preload instruction
```

거리 = *latency / cycle per iter*. L1 miss 12 cycle / iter 3 cycle → 4 element 앞.

## Hardware Prefetcher 활성화

Cortex-A 자동 — stride detect. Cortex-M7 — `MEMCTL` register:

```c
SCB->CCR |= SCB_CCR_BP_Msk;   // Branch prediction enable
// Cortex-M7 prefetch는 자동 (instruction은)
```

## Streaming Access — Non-Temporal Stores

```c
for (i = 0; i < N; i++) {
    arr[i] = compute(i);   // 한 번 쓰고 안 읽음 — cache 입력 의미 없음
}
```

ARM `STNP` (Store Non-temporal Pair) — *cache 우회 store*. x86 `MOVNT`.

```c
__builtin_nontemporal_store(value, &arr[i]);
```

큰 buffer 초기화·copy에 효과. Cache pollution 방지.

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

Producer·consumer가 *다른 CPU core*일 때 false sharing 회피.

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

GCC가 hot 함수를 *연속 배치* → I-cache locality 향상.

`-fprofile-use`로 *PGO* (Profile-Guided Optimization) — 실제 실행 분포로 배치.

## 자주 하는 실수

> ⚠️ Misaligned struct

```c
struct {
    char flag;       // 1 byte
    int value;       // 4 byte — offset 1? 또는 4 (padding)?
    char name[3];
} thing;             // → 12 byte? sizeof 확인
```

ARMv6+ misaligned access 일부 지원하나 *느림*. Cortex-M0/M1은 *fault*.

> ⚠️ Prefetch 거리 잘못

```c
__builtin_prefetch(&arr[i + 1]);   // 너무 가까움 — 효과 없음
__builtin_prefetch(&arr[i + 1000]); // 너무 멈 — evict 가능
```

벤치 측정해서 *최적 거리* 찾기.

> ⚠️ Volatile + cache line padding

```c
volatile struct { alignas(64) int a; alignas(64) int b; } v;
```

`volatile`은 *컴파일러 캐싱 차단*. False sharing은 *hardware 차원* — 두 개념 별개.

> ⚠️ SoA를 모든 경우에 사용

Random access나 *한 객체의 여러 field 동시 사용*은 *AoS가 유리*. 적용 시 *접근 패턴* 분석.

## 정리

- Cache line **64 byte** (Cortex-A·Intel) — alignas로 정렬.
- **False sharing** — multi-CPU 변수 *line 분리*.
- **SoA**가 SIMD·streaming에 유리.
- **Software prefetch** — 적절한 거리에서만 효과.
- Cortex-M7 DMA — *cache maintenance* 필수.

다음 편은 **Memory Bandwidth**.

## 관련 항목

- [2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
