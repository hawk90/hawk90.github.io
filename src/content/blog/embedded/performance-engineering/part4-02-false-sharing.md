---
title: "4-02: False Sharing — Cache Line Ping-Pong·Padding·Measurement"
date: 2026-05-08T11:00:00
description: "False sharing 원인. Cache coherence ping-pong. Padding으로 line 분리. 측정 방법."
series: "Embedded Performance Engineering"
seriesOrder: 30
tags: [false-sharing, cacheline, padding, coherence]
draft: false
---

## 한 줄 요약

> **"False Sharing = 다른 변수, 같은 cache line"** 입니다. 코어 간 ping-pong이 일어나 10~100배까지 느려집니다.

## 메커니즘

```text
struct {
    int counter_a;   // CPU 0 사용
    int counter_b;   // CPU 1 사용
} stats;   // 8 byte — 같은 64-byte line

CPU 0: writes counter_a
  → cache line state = Modified (CPU 0)
  → CPU 1 line state = Invalid

CPU 1: writes counter_b
  → coherence protocol triggered
  → CPU 0 line evict (flush to L2)
  → CPU 1 fetch from L2 (or CPU 0 cache)
  → CPU 1 cache state = Modified
  → CPU 0 = Invalid
  
* 매 access마다 *line bounces between caches* (ping-pong)
```

실제로 공유되는 데이터는 하나도 없는데, 단지 같은 line에 들어 있다는 이유로 coherence가 계속 동작합니다.

그림으로 보면 두 코어가 *같은 line*을 두고 핑퐁하는 모습이 분명해집니다.

![두 코어가 같은 cache line의 다른 변수에 접근할 때의 invalidate ping-pong](/images/blog/perf-eng/diagrams/part4-02-false-sharing.svg)

## MESI Protocol

```text
M (Modified)  — 이 cache만 valid, dirty
E (Exclusive) — 이 cache만 valid, clean
S (Shared)    — 여러 cache valid, clean
I (Invalid)   — 무효
```

State 변화는 다음과 같이 일어납니다.

```text
CPU 0 write: I → M, 다른 cache invalidate broadcast
CPU 1 read after CPU 0 write: 
  - CPU 0 cache의 M line → flush to memory
  - CPU 0: M → S, CPU 1: I → S
  
False sharing = 매번 M → I → M → I 반복.
```

## 측정 — 실 cycle

```c
struct {
    atomic_int a;
    atomic_int b;
} bad;

struct {
    alignas(64) atomic_int a;
    alignas(64) atomic_int b;
} good;

void thread1_func(void *p) {
    for (int i = 0; i < 10M; i++) atomic_fetch_add(&bad.a, 1);
}
void thread2_func(void *p) {
    for (int i = 0; i < 10M; i++) atomic_fetch_add(&bad.b, 1);
}
```

Cortex-A72 4-core 환경에서 실측한 결과는 다음과 같습니다.

```text
Bad (false sharing):  4.2 sec
Good (padded):        0.3 sec
                      → 14x slowdown
```

## Padding

```c
struct counters {
    alignas(64) atomic_int a;
    char pad_a[64 - sizeof(atomic_int)];
    
    alignas(64) atomic_int b;
    char pad_b[64 - sizeof(atomic_int)];
};
```

또는 C++17:

```cpp
#include <new>
struct alignas(std::hardware_destructive_interference_size) Counter {
    std::atomic<int> value;
};

std::array<Counter, 4> counters;   // 각 element가 다른 line
```

`hardware_destructive_interference_size`는 일반적으로 64이고, Apple M1은 128입니다.

## 흔한 false sharing 패턴

### 1. Per-CPU 변수

```c
int counters[NUM_CPUS];   // ← 8개 × 4 byte = 32 byte → 한 line 안
each cpu: counters[cpu]++ 
→ false sharing
```

padding을 넣거나 per-CPU memory로 분리해야 합니다.

```c
struct counter_per_cpu {
    alignas(64) int value;
};
struct counter_per_cpu counters[NUM_CPUS];
```

### 2. Producer/Consumer Queue

```c
struct queue {
    size_t head;   // producer writes
    size_t tail;   // consumer writes
    /* ... data ... */
};
```

producer와 consumer가 다른 코어에서 동작하면 head와 tail이 같은 line에 들어가서 ping-pong이 발생합니다.

```c
struct queue {
    alignas(64) atomic_size_t head;
    char pad[64 - sizeof(atomic_size_t)];
    alignas(64) atomic_size_t tail;
    char pad2[64 - sizeof(atomic_size_t)];
    /* ... data ... */
};
```

### 3. Spinlock 인접 데이터

```c
struct {
    spinlock_t lock;
    int data1;   // ← lock 잡힌 코어와 다른 코어가 동시 access 시 ping-pong
    int data2;
} resource;
```

lock과 data를 서로 다른 line에 분리해야 합니다.

## perf c2c — Cache-to-Cache 진단

```bash
sudo perf c2c record ./prog
sudo perf c2c report

# Output:
# - HITM events (Hit in Modified state — false sharing 시그너처)
# - Per-cache-line contention
# - Source code location
```

Linux kernel 4.10 이상에서 사용할 수 있으며, false sharing을 탐지하는 가장 강력한 도구입니다.

## Intel VTune Memory Access

VTune의 Memory Access analysis는 다음과 같은 정보를 제공합니다.

- Per cache line latency
- Local vs Remote DRAM access
- Contended cache lines 보고

## Embedded — Cortex-A SMP

```c
/* Linux on Cortex-A — 4 코어 */
DEFINE_PER_CPU(int, my_counter);   // 자동 padded

/* RTOS SMP — FreeRTOS 11 SMP 또는 Zephyr */
static atomic_t counters[NUM_CORES] __attribute__((aligned(64)));
```

Zephyr는 `Z_KERNEL_STACK_DEFINE` 등을 통해 자동으로 정렬을 맞춰 줍니다.

## False Sharing은 항상 나쁜가?

반드시 그렇지는 않습니다. Workload에 따라 다음과 같이 갈립니다.

- Read 위주 → 모든 cache S state, ping-pong 없음, OK
- Per-CPU 누적 → padding 필요
- 가끔 write → 측정해서 결정

모든 변수에 padding을 넣으면 line 하나당 실제 정보가 1 byte 수준으로 줄어 cache 효율이 떨어집니다.

## True Sharing — 진짜 공유 시

```c
atomic_int global_counter;
/* 모든 thread가 update */
```

이런 경우는 진짜 공유이지 false sharing이 아닙니다. 해결책으로는 다음 두 가지가 있습니다.

- Per-CPU에서 누적한 뒤 주기적으로 합산
- Sharded counter

```c
atomic_int counter[NUM_CPUS];

int total(void) {
    int sum = 0;
    for (i = 0) sum += counter[i];
    return sum;
}
```

Read는 가끔이고 write가 자주 일어나는 경우라면 per-CPU shard를 쓰는 편이 좋습니다.

## Lock-free Queue 디자인

```c
struct lockfree_spsc {
    alignas(64) atomic_size_t head;   // producer-only
    alignas(64) atomic_size_t tail;   // consumer-only
    alignas(64) T buf[CAPACITY];      // 별도 line
};
```

각 hot field가 서로 다른 line에 놓이도록 해서 false sharing을 0으로 만듭니다.

## 자주 하는 실수

> ⚠️ 작은 변수만 padding

```c
alignas(64) int a;
int b;                 // ← a 같은 line에 들어감
```

`a` 뒤 64 byte 영역은 다른 변수가 차지할 수 있습니다. 모든 변수에 alignas를 붙이거나 명시적으로 pad를 넣어야 합니다.

> ⚠️ Padding 안에 다른 data

```c
struct foo {
    alignas(64) int a;
    char tmp[60];
    alignas(64) int b;
    /* tmp 안 다른 데이터 두지 마라 — 그것도 line bouncing */
};
```

> ⚠️ Stack 변수 padding

```c
void func(void) {
    alignas(64) int x;   // ← stack alignment 보장 안 됨
}
```

GCC의 `-mstackrealign` 옵션을 쓰거나, 해당 변수를 heap이나 static 영역에 두는 방식으로 해결합니다.

> ⚠️ 작은 시스템에서 over-pad

```c
/* Cortex-M7 — 32 byte cache line */
alignas(64) int x;   // ← 32 byte로 충분
```

Embedded 환경에서는 cache line size를 확인한 다음 정확히 그 크기에 맞춰 align해야 합니다.

## 정리

- False sharing은 **다른 변수가 같은 line**에 있어서 coherence ping-pong이 발생하는 현상입니다.
- 해결책은 line size에 맞춘 **`alignas(64)` padding**입니다.
- 진단에는 **perf c2c**를 사용합니다.
- Producer/consumer queue와 per-CPU counter는 기본적으로 padding을 넣어야 합니다.
- True sharing은 별도의 문제이며, sharding으로 해결합니다.
- Cache line size는 Cortex-M7에서 32, 대부분의 CPU에서 64, Apple M1에서 128입니다.

다음 편은 **Lock Contention**을 다룹니다.

## 관련 항목

- [4-01: Concurrency 기초](/blog/embedded/performance-engineering/part4-01-concurrency-basics)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
