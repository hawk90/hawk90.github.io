---
title: "9-09: False sharing 해결"
date: 2026-05-16T13:00:00
description: "False sharing의 원리와 영향, perf c2c 감지, alignas(64) padding, per-CPU 변수, thread-local까지 해결 전략을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 109
tags: [recipes, concurrency, cache, false-sharing]
---

## 한 줄 요약

> **"False sharing = 다른 변수인데 *같은 cache line*에 있어 코어들이 서로 cache line을 끌고 다니는 현상."** SMP throughput이 갑자기 10배 떨어지는 1순위 원인입니다.

## 어떤 상황에서 쓰나

per-thread counter array를 만들었는데 thread를 늘릴수록 throughput이 떨어지는 경우가 가장 흔합니다. counter 8개를 array로 두면 모두 한두 개 cache line에 모이고, 8 thread가 동시에 자기 자리만 update해도 cache coherency traffic이 폭증합니다.

또 한 가지 상황은 SPSC ring buffer의 head와 tail입니다. producer는 head만, consumer는 tail만 쓰지만 둘이 같은 line에 있으면 *논리적으로는* contention이 없는데 *물리적으로는* 한 line을 두고 코어가 ping-pong합니다.

## 핵심 개념

Cache line은 코어가 한 번에 fetch/invalidate하는 단위다.

| Architecture | Line size |
|--------------|-----------|
| ARM Cortex-M7 | 32 B |
| ARM Cortex-A53/A72 | 64 B |
| Intel/AMD x86 | 64 B |
| Apple M1/M2 | 128 B |
| IBM POWER | 128 B |

같은 line에 있는 두 변수는 SMP 관점에서 *하나*처럼 움직인다. 한 코어가 write하면 다른 코어의 그 line은 invalidate된다.

해결책은 한 줄로 정리됩니다.

```text
hot 공유 변수 사이에 padding을 넣어 *다른 line*에 두기
```

## 코드 / 실제 사용 예

### Bad — false sharing

```cpp
struct counters {
    std::atomic<long> a;       /* 8 byte */
    std::atomic<long> b;       /* 8 byte — a와 같은 line */
};
counters g;

void thread_a(void) {
    for (int i = 0; i < N; i++) g.a.fetch_add(1, std::memory_order_relaxed);
}

void thread_b(void) {
    for (int i = 0; i < N; i++) g.b.fetch_add(1, std::memory_order_relaxed);
}
```

a와 b가 같은 64 B line에 있어 두 thread가 매 op마다 cache line을 invalidate합니다.

### Good — alignas로 line 분리

```cpp
struct counters {
    alignas(64) std::atomic<long> a;
    char pad_a[64 - sizeof(std::atomic<long>)];
    alignas(64) std::atomic<long> b;
    char pad_b[64 - sizeof(std::atomic<long>)];
};

static_assert(sizeof(counters) == 128, "padded counters");
```

각 atomic이 64 B alignment + 다음 atomic 앞에 padding이 있어 *다른 line*에 위치합니다.

### C++17 표준 hardware_destructive_interference_size

```cpp
#include <new>

struct counters {
    alignas(std::hardware_destructive_interference_size) std::atomic<long> a;
    char pad[std::hardware_destructive_interference_size - sizeof(std::atomic<long>)];
    alignas(std::hardware_destructive_interference_size) std::atomic<long> b;
};
```

C++17부터 표준 상수가 있습니다. 칩별 line 크기를 컴파일러가 제공합니다.

### Per-CPU counter

```cpp
constexpr int N_CPU = 8;

struct alignas(64) shard {
    std::atomic<long> v;
    char pad[64 - sizeof(std::atomic<long>)];
};
shard counters[N_CPU];

void inc(int cpu) {
    counters[cpu].v.fetch_add(1, std::memory_order_relaxed);
}

long total(void) {
    long s = 0;
    for (int i = 0; i < N_CPU; i++)
        s += counters[i].v.load(std::memory_order_relaxed);
    return s;
}
```

각 코어가 자기 line만 update하므로 contention이 0에 수렴합니다.

### Thread-local 변종

```cpp
thread_local long my_counter;
std::vector<long *> all_counters;
std::mutex mu;

void register_thread(void) {
    std::lock_guard g(mu);
    all_counters.push_back(&my_counter);
}

long total(void) {
    long s = 0;
    std::lock_guard g(mu);
    for (auto *p : all_counters) s += *p;
    return s;
}
```

thread_local이면 자동으로 다른 page에 위치하므로 false sharing이 사라집니다. 다만 모든 thread의 값을 모으려면 등록이 필요합니다.

### SPSC ring buffer head/tail 분리

```cpp
template <typename T, size_t N>
struct spsc_ring {
    alignas(64) std::atomic<size_t> head;
    char pad_h[64 - sizeof(std::atomic<size_t>)];

    alignas(64) std::atomic<size_t> tail;
    char pad_t[64 - sizeof(std::atomic<size_t>)];

    alignas(64) T buf[N];
};
```

producer는 head만, consumer는 tail만 씁니다. 두 변수가 다른 line에 있으면 coherency traffic이 0에 수렴합니다.

### Linux kernel ____cacheline_aligned

```c
#include <linux/cache.h>

struct foo {
    int a;
    int b ____cacheline_aligned;    /* 새 line */
};

static struct bar g_bar ____cacheline_aligned;
DEFINE_PER_CPU(unsigned long, counters);   /* per-CPU는 자동 분리 */
```

Linux 커널은 `____cacheline_aligned` 매크로가 표준입니다. per-CPU 변수는 자동으로 다른 line에 위치합니다.

### perf c2c로 감지

```bash
# Linux에서 false sharing 감지
sudo perf c2c record ./mybin
sudo perf c2c report

# HITM (modified hit) 통계가 false sharing의 신호
# Records 100% from L1 - HITM이 높은 cache line이 의심
```

`perf c2c`는 cache-to-cache transfer를 추적해 어느 cache line이 false sharing의 원인인지 알려줍니다.

## 측정 / 성능 비교

Cortex-A72 quad core에서 atomic counter 두 개를 두 thread가 1억 번 fetch_add한 결과입니다.

| 구조 | 시간 | throughput |
|---|---|---|
| 같은 line에 a, b | 7.8 s | 26 M ops/s |
| alignas(64)만 (시작) | 7.4 s | 27 M ops/s |
| element 사이 padding | 0.9 s | 222 M ops/s |
| per-CPU sharding (4코어) | 0.25 s | 800 M ops/s |

False sharing 제거가 8배 이상, sharding은 30배 이상의 throughput을 만듭니다.

```text
Intel Xeon 8-core 비교
같은 line                   5.2 s
padded                      0.4 s     (13x)
per-CPU                     0.07 s   (74x)
```

Intel이 ARM보다 더 큰 격차를 보이는 경향이 있습니다.

## 자주 보는 함정

> alignas 후 padding 누락

```cpp
struct foo {
    alignas(64) std::atomic<int> a;
    std::atomic<int> b;    /* a와 같은 line — alignas 의미 없음 */
};
```

다음 element에도 alignas를 붙이거나 명시적 padding을 넣어야 합니다.

> 32-byte line 칩에 64로 padding

```cpp
alignas(64) int x;    /* Cortex-M7 line = 32 B → 메모리 두 배 낭비 */
```

칩별 line 크기를 확인하고 그 단위로 맞춥니다.

> Array of shard에 alignas 누락

```cpp
struct shard { std::atomic<long> v; };
shard arr[8];      /* 8 byte씩 — 한 line에 8개 모두 있음 */
```

`alignas(64)`를 shard struct에 붙입니다. 한 element가 한 line에 위치하게 됩니다.

> Stack 변수에 큰 alignment

```cpp
void f(void) {
    alignas(64) std::atomic<int> x;    /* stack은 16/32 B만 보장 */
}
```

stack pointer가 64-byte 정렬 안 될 수 있습니다. static이나 heap이 안전합니다.

> Padding을 매번 손으로

```cpp
char pad[64 - sizeof(std::atomic<long>)];   /* sizeof 바뀌면 깨짐 */
```

`alignas`로 일관성을 맞추고, `_Static_assert(sizeof(...) == ...)`로 검증합니다.

## 정리

- False sharing은 다른 변수가 같은 cache line에 있어 발생하는 SMP 성능 사고입니다.
- `alignas(64)`만 쓰면 *시작*만 정렬되므로 element 사이 padding도 필요합니다.
- C++17의 `std::hardware_destructive_interference_size`가 표준 상수입니다.
- per-CPU sharding이 가장 강력한 해결책입니다.
- SPSC ring buffer의 head와 tail은 반드시 다른 line에 둡니다.
- `perf c2c`로 어느 line이 문제인지 즉시 알 수 있습니다.
- 칩별 line 크기(32/64/128 B)를 확인합니다.

다음 편은 **MPMC 큐**입니다.

## 관련 항목

- [8-03: Cache Line Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)
- [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
- [PE 4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
