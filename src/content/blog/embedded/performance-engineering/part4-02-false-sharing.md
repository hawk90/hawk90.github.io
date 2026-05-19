---
title: "4-02: False Sharing — Cache Line Ping-Pong·Padding·Measurement"
date: 2026-05-08T11:00:00
description: "False sharing 원인. Cache coherence ping-pong. Padding으로 line 분리. 측정 방법."
series: "Embedded Performance Engineering"
seriesOrder: 30
tags: [false-sharing, cacheline, padding, coherence]
draft: true
---

## 한 줄 요약

> **"False Sharing = 다른 변수, 같은 cache line"** — 코어 간 ping-pong으로 10-100x slowdown.

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

**아무 데이터도 실제 공유 안 됨 — 그러나 같은 line이라 coherence 동작.**

## MESI Protocol

```text
M (Modified)  — 이 cache만 valid, dirty
E (Exclusive) — 이 cache만 valid, clean
S (Shared)    — 여러 cache valid, clean
I (Invalid)   — 무효
```

State 변화:

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

실측 (Cortex-A72 4-core):

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

`hardware_destructive_interference_size` = 일반적으로 64. Apple M1 = 128.

## 흔한 false sharing 패턴

### 1. Per-CPU 변수

```c
int counters[NUM_CPUS];   // ← 8개 × 4 byte = 32 byte → 한 line 안
each cpu: counters[cpu]++ 
→ false sharing
```

→ padding 또는 *per-CPU memory*:

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

P·C가 다른 코어 → head·tail이 *같은 line* → ping-pong.

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

→ lock과 data 분리 line.

## perf c2c — Cache-to-Cache 진단

```bash
sudo perf c2c record ./prog
sudo perf c2c report

# Output:
# - HITM events (Hit in Modified state — false sharing 시그너처)
# - Per-cache-line contention
# - Source code location
```

Linux kernel 4.10+. 가장 강력한 false sharing 탐지.

## Intel VTune Memory Access

VTune Memory Access analysis:
- Per cache line latency
- Local vs Remote DRAM access
- *Contended cache lines* 보고

## Embedded — Cortex-A SMP

```c
/* Linux on Cortex-A — 4 코어 */
DEFINE_PER_CPU(int, my_counter);   // 자동 padded

/* RTOS SMP — FreeRTOS 11 SMP 또는 Zephyr */
static atomic_t counters[NUM_CORES] __attribute__((aligned(64)));
```

Zephyr — `Z_KERNEL_STACK_DEFINE` 등 자동 정렬.

## False Sharing은 항상 나쁜가?

**아니.** Workload에 따라:

```text
- Read 위주 → 모든 cache S state, ping-pong 없음, OK
- Per-CPU 누적 → padding 필요
- 가끔 write → 측정해서 결정
```

매 변수 padding하면 *cache 효율 떨어짐* (line 하나당 정보 1 byte).

## True Sharing — 진짜 공유 시

```c
atomic_int global_counter;
/* 모든 thread가 update */
```

이건 *진짜* 공유 — false 아님. 해결:
- Per-CPU 누적 + 주기적 합산
- Sharded counter

```c
atomic_int counter[NUM_CPUS];

int total(void) {
    int sum = 0;
    for (i = 0) sum += counter[i];
    return sum;
}
```

Read는 가끔, write는 자주 → per-CPU shard.

## Lock-free Queue 디자인

```c
struct lockfree_spsc {
    alignas(64) atomic_size_t head;   // producer-only
    alignas(64) atomic_size_t tail;   // consumer-only
    alignas(64) T buf[CAPACITY];      // 별도 line
};
```

각 *hot field*가 다른 line — false sharing 0.

## 자주 하는 실수

> ⚠️ 작은 변수만 padding

```c
alignas(64) int a;
int b;                 // ← a 같은 line에 들어감
```

`a` 뒤 64 byte는 *다른 변수*도 차지. 변수 *모두* alignas 또는 *명시 pad*.

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

GCC `-mstackrealign` 또는 *heap·static*에 두기.

> ⚠️ 작은 시스템에서 over-pad

```c
/* Cortex-M7 — 32 byte cache line */
alignas(64) int x;   // ← 32 byte로 충분
```

Embedded는 *cache line size 확인* 후 정확히 align.

## 정리

- False sharing = **다른 변수, 같은 line** → coherence ping-pong.
- **Padding alignas(64)** (또는 line size에 맞춰).
- **perf c2c**로 진단.
- Producer/consumer queue·per-CPU counter는 *기본 padding*.
- True sharing은 *별도 문제* — sharding으로 해결.
- Cache line size = 32 (M7), 64 (대부분), 128 (Apple M1).

다음 편은 **Lock Contention**.

## 관련 항목

- [4-01: Concurrency 기초](/blog/embedded/performance-engineering/part4-01-concurrency-basics)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
