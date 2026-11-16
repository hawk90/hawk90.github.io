---
title: "False Sharing 해결 — Cache Line Padding·SoA 적용"
slug: "embedded/modern-recipes/part9-09-false-sharing"
date: 2026-04-18T09:08:00
description: "False sharing의 원리와 영향, perf c2c 감지, alignas(64) padding, per-CPU 변수, thread-local까지 해결 전략을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 109
tags: [recipes, concurrency, cache, false-sharing]
topics: ["embedded"]
---

## 한 줄 요약

> **"False sharing = 다른 변수인데 *같은 cache line*에 있어 코어들이 그 line을 서로 빼앗는 현상."** 이 글은 같은 프로그램에서 카운터 간격만 8 B, 64 B, 128 B로 바꿔 Apple M2에서 처리량이 8스레드 기준 60~136배 달라지는 것을 보이고, "64 B로 띄우면 된다"가 왜 이 칩에서는 틀리는지 측정으로 확인합니다.

## 어떤 상황에서 쓰나

스레드마다 자기 카운터를 배열에 두었는데 스레드를 늘릴수록 오히려 느려지는 경우가 대표적입니다. 각 스레드는 자기 칸만 쓰므로 논리적으로는 공유가 없지만, 칸들이 같은 cache line에 있으면 한 코어가 쓸 때마다 다른 코어의 그 line이 무효가 됩니다. 한 사물함을 칸막이로 나눠 여러 사람이 쓰는데, 문은 하나라서 누군가 열 때마다 다른 사람은 기다려야 하는 셈입니다. [9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)의 SPSC ring에서 head와 tail이 그런 관계였습니다.

## 핵심 개념

Cache line은 코어가 한 번에 가져오고 무효화하는 단위이고, 그 크기는 칩마다 다릅니다. 이 글에서 직접 확인한 값만 적습니다.

| 대상 | line 크기 | 근거 |
|------|-----------|------|
| Cortex-M7 D-cache | 32 B | CMSIS 5.9.0 `cachel1_armv7.h` 46행 `__SCB_DCACHE_LINE_SIZE 32U` ("fixed to 32 bytes") |
| Apple M2 Pro (macOS) | 128 B | `sysctl hw.cachelinesize` |
| 같은 M2 위 Debian arm64 guest | 64 B로 보고 | `getconf LEVEL1_DCACHE_LINESIZE` |
| Linux arm64 커널의 `____cacheline_aligned` | 64 B | v6.12 `arch/arm64/include/asm/cache.h` 8–9행 `L1_CACHE_SHIFT (6)` |

같은 칩인데 macOS는 128, guest의 glibc는 64를 보고했습니다. 아래 측정에서 실제로 서로 간섭하지 않는 간격은 128 B였으므로, guest가 보고한 64를 그대로 믿으면 틀립니다. 칩의 문서나 측정으로 확인한 값을 씁니다.

## 코드 / 실제 사용 예

### 간격만 바꿔 재기

스레드마다 카운터 하나를 `fetch_add`로 5천만 번 올립니다. 카운터 하나를 `alignas(N)` 구조체에 넣어 `sizeof`가 N이 되게 하고, N만 8·64·128로 바꿉니다.

```cpp
// fs.cpp — T threads, each incrementing its own counter; only the layout of the counters changes
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <thread>
#include <vector>

template <size_t ALIGN>
struct alignas(ALIGN) slot { std::atomic<long> v; };          // sizeof(slot) == ALIGN

template <class S>
double run(int threads, long ops)
{
    static S slots[16];
    std::vector<std::thread> t;
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < threads; i++)
        t.emplace_back([i, ops] { for (long k = 0; k < ops; k++) slots[i].v.fetch_add(1, std::memory_order_relaxed); });
    for (auto &x : t) x.join();
    std::chrono::duration<double> d = std::chrono::steady_clock::now() - t0;
    return threads * ops / d.count() / 1e6;
}

int main(int argc, char **argv)
{
    int threads = std::atoi(argv[1]);
    const long ops = 50000000;
    std::printf("threads=%d  8 B apart %7.1f   64 B apart %7.1f   128 B apart %7.1f   M incs/s\n", threads,
                run<slot<8>>(threads, ops), run<slot<64>>(threads, ops), run<slot<128>>(threads, ops));
}
```

```text
host: Apple M2 Pro (8P+4E), macOS 27.2.1, Apple clang 21.0.0
$ clang++ -std=c++17 -O2 fs.cpp -o fs && ./fs 2; ./fs 4; ./fs 8   # 3 rounds
threads=2  8 B apart   139.2   64 B apart   990.8   128 B apart  1007.5   M incs/s
threads=4  8 B apart    67.6   64 B apart   798.0   128 B apart  2013.0   M incs/s
threads=8  8 B apart    27.1   64 B apart  1059.9   128 B apart  3522.1   M incs/s
threads=2  8 B apart   138.3   64 B apart   639.0   128 B apart   999.6   M incs/s
threads=4  8 B apart    61.8   64 B apart  1418.5   128 B apart  2004.0   M incs/s
threads=8  8 B apart    27.5   64 B apart  1100.7   128 B apart  3680.2   M incs/s
threads=2  8 B apart   142.4   64 B apart   674.9   128 B apart  1006.9   M incs/s
threads=4  8 B apart    61.1   64 B apart   987.9   128 B apart  1986.9   M incs/s
threads=8  8 B apart    32.5   64 B apart  1180.1   128 B apart  1935.3   M incs/s
```

| 스레드 | 8 B 간격 | 64 B 간격 | 128 B 간격 (M incs/s) |
| ---: | --- | --- | --- |
| 2 | 138~142 | 639~991 | 1,000~1,008 |
| 4 | 61~68 | 798~1,418 | 1,987~2,013 |
| 8 | 27~32 | 1,060~1,180 | 1,935~3,680 |

8 B 간격(카운터들이 한두 line에 몰림)은 스레드를 늘릴수록 *총* 처리량이 줄었습니다. 64 B 간격은 두 카운터가 한 128 B line을 나눠 쓰므로 여전히 간섭해서, 8스레드에서도 2스레드 근처에 머물렀습니다. 128 B 간격에서야 스레드 수에 따라 처리량이 늘었습니다. 이 Mac에서 "alignas(64)로 띄운다"는 처방은 절반만 맞습니다.

### C++17 `hardware_destructive_interference_size`

C++ working draft [hardware.interference]p1은 이 값을 "the minimum recommended offset between two concurrently-accessed objects to avoid additional performance degradation due to contention"이라고 정의하고, 값은 구현이 정합니다. 이 글의 두 툴체인에서 실제 값과 스택 정렬, `thread_local` 배치를 함께 확인했습니다.

```cpp
// probe.cpp — what the toolchain and OS say about line size and alignment
#include <atomic>
#include <cstdint>
#include <cstdio>
#include <new>
#include <thread>

thread_local long tl_counter;

static void show_local()
{
    alignas(128) long x = 0;                         // over-aligned automatic variable
    std::printf("alignas(128) local at %p, address %% 128 = %lu\n", (void *)&x,
                (unsigned long)((std::uintptr_t)&x % 128));
}

int main()
{
#ifdef __cpp_lib_hardware_interference_size
    std::printf("hardware_destructive_interference_size = %zu, constructive = %zu\n",
                std::hardware_destructive_interference_size, std::hardware_constructive_interference_size);
#else
    std::printf("__cpp_lib_hardware_interference_size not defined\n");
#endif
    show_local();
    std::uintptr_t a = 0, b = 0;
    std::atomic<int> alive{0};
    auto grab = [&](std::uintptr_t &out) {             // both threads stay alive until both have looked
        out = (std::uintptr_t)&tl_counter;
        alive.fetch_add(1);
        while (alive.load() < 2) {}
    };
    std::thread t1(grab, std::ref(a));
    std::thread t2(grab, std::ref(b));
    t1.join(); t2.join();
    std::printf("thread_local in two threads: %#lx and %#lx (distance %lu bytes)\n",
                (unsigned long)a, (unsigned long)b, (unsigned long)(a > b ? a - b : b - a));
}
```

```text
### macOS: Apple M2 Pro, macOS 27.2.1, Apple clang 21.0.0 (libc++)
$ sysctl hw.cachelinesize
hw.cachelinesize: 128
$ clang++ -std=c++17 -O2 probe.cpp -o probe && ./probe
hardware_destructive_interference_size = 256, constructive = 64
alignas(128) local at 0x16d2ae100, address % 128 = 0
thread_local in two threads: 0x1032552b0 and 0x1032552c0 (distance 16 bytes)
### Debian 13 arm64 guest, g++ 14.2.0 (libstdc++)
$ getconf LEVEL1_DCACHE_LINESIZE
64
$ g++ -std=c++17 -O2 probe.cpp -o probe && ./probe
hardware_destructive_interference_size = 256, constructive = 64
alignas(128) local at 0xffffda202000, address % 128 = 0
thread_local in two threads: 0xffffaec8f890 and 0xffffae47f890 (distance 8454144 bytes)
$ perf --version; perf c2c record -o /tmp/c2c.data -- true
perf version 6.12.117
failed: no PMU supports the memory events
```

두 표준 라이브러리 모두 destructive 256, constructive 64였습니다. 256은 M2의 128보다 커서 *안전한 쪽*이지만 메모리를 두 배 씁니다. 한편 Linux guest에서 `getconf`가 보고한 64를 쓰면 위 측정처럼 간섭이 남습니다. 상수와 OS 보고값이 서로 다르므로, 어느 값을 쓸지는 대상 칩에서 위 `fs.cpp` 같은 측정으로 정합니다.

### Per-CPU counter

```cpp
constexpr int N_CPU = 8;
struct alignas(128) shard { std::atomic<long> v; };   // 128 = hw.cachelinesize on the M2
shard counters[N_CPU];

void inc(int cpu) { counters[cpu].v.fetch_add(1, std::memory_order_relaxed); }

long total()
{
    long s = 0;
    for (int i = 0; i < N_CPU; i++) s += counters[i].v.load(std::memory_order_relaxed);
    return s;
}
```

위 `fs.cpp`의 `slot<128>` 배열이 바로 이 구조이고, 8스레드에서 1,935~3,680 M incs/s였습니다. `alignas`를 구조체에 붙이면 `sizeof`가 정렬값의 배수가 되므로 배열 원소마다 자기 line을 갖고, `pad` 배열을 손으로 넣을 필요가 없습니다.

### Thread-local 변종

`thread_local` 변수는 스레드마다 따로 있으니 false sharing이 없다고 생각하기 쉽습니다. 위 `probe` 출력의 마지막 줄을 보면 macOS에서는 동시에 살아 있는 두 스레드의 `thread_local` 변수가 16바이트 떨어져 있었습니다. 같은 128 B line입니다. Debian guest에서는 약 8 MB 떨어져 있었습니다. 즉 `thread_local`의 배치는 OS와 런타임이 정하고, 이 Mac에서는 false sharing이 생길 수 있는 배치였습니다. 자주 쓰는 스레드별 카운터라면 `thread_local`에도 `alignas(128)`을 붙이거나 위의 shard 배열을 씁니다.

### SPSC ring buffer head/tail 분리

```cpp
template <typename T, size_t N>
struct spsc_ring {
    alignas(128) std::atomic<size_t> head;    // producer writes
    alignas(128) std::atomic<size_t> tail;    // consumer writes
    alignas(128) T buf[N];
};
```

[9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)에서 head·tail을 4 B, 64 B, 128 B로 떼어 재 보니 다섯 라운드 중 네 번은 떼어 놓은 쪽이 빨랐지만, 64 B와 128 B의 순위는 측정 잡음 때문에 가르지 못했습니다. 위 카운터 측정처럼 *쓰기만 하는* 경우보다 ring은 상대 index를 읽어야 하므로 그 자체로 line이 오가는 몫이 있습니다.

### Linux kernel `____cacheline_aligned`

```c
#include <linux/cache.h>

struct foo {
    int a;
    int b ____cacheline_aligned;    /* starts a new SMP_CACHE_BYTES-aligned line */
};
```

v6.12 `include/linux/cache.h` 67행은 `____cacheline_aligned`를 `__aligned__(SMP_CACHE_BYTES)`로 정의하고, `SMP_CACHE_BYTES`는 `L1_CACHE_BYTES`이며(13행), arm64에서 그 값은 64입니다. 128 B line인 칩에서는 이 매크로만으로 서로 다른 line이 보장되지 않습니다.

### `perf c2c`로 감지

`perf c2c`는 cache line 경합(HITM)을 찾는 도구입니다. 문서는 Arm64에서 SPE(Statistical Profiling Extension)로 load/store를 샘플링하므로 "hardware and kernel support is required"라고 적습니다(v6.12 `tools/perf/Documentation/perf-c2c.txt` 19–30행). 이 글의 hvf guest에서는 PMU가 없어 기록 단계에서 멈췄습니다.

```bash
perf c2c record -o c2c.data -- ./mybin
perf c2c report -i c2c.data
```

위 `probe.log`의 마지막 줄 "failed: no PMU supports the memory events"가 이 guest의 결과입니다. SPE가 있는 실제 Arm 보드나 Intel·AMD 머신에서 다시 해 보아야 하고, 이 글에서는 c2c 보고서 자체를 보지 못했습니다.

## 측정 / 성능 비교

위 `fs.cpp` 표가 이 글의 측정입니다(Apple M2 Pro, macOS 27.2.1, Apple clang 21.0.0, `-O2`, 세 라운드 범위). 8스레드 기준으로 8 B 간격은 27~32, 64 B는 1,060~1,180, 128 B는 1,935~3,680 M incs/s였습니다. 64 B로 바꾸면 크게 좋아지지만, 이 칩의 line 크기인 128 B까지 가야 스레드 수에 따라 늘어납니다. 다른 칩에서는 그 칩의 line 크기로 같은 측정을 해야 합니다.

## 자주 보는 함정

> ⚠️ 첫 멤버에만 `alignas`

```cpp
struct counters {
    alignas(128) std::atomic<long> a;
    std::atomic<long> b;          /* right after a: same line */
};
```

`alignas`는 그 멤버의 *시작*만 맞춥니다. 각 멤버에 붙이거나, 위 `slot<N>`처럼 원소 구조체에 붙입니다.

> ⚠️ 64 B를 상수로 박음

위 측정에서 M2는 128 B였고 64 B 간격은 여전히 간섭했습니다. Cortex-M7은 32 B라 반대로 64 B가 낭비입니다. 대상 칩의 값을 쓰고, 여러 칩을 지원한다면 `std::hardware_destructive_interference_size`(이 글의 두 툴체인에서 256)처럼 넉넉한 값을 고릅니다.

> ⚠️ shard 배열에 `alignas` 누락

```cpp
struct shard { std::atomic<long> v; };
shard arr[8];      /* 8 B each: all eight in one or two lines */
```

위 표의 "8 B 간격" 열이 이 경우이고, 8스레드에서 가장 느렸습니다.

> ⚠️ "스택 변수에는 큰 정렬이 안 된다"는 오해

위 `probe` 출력처럼 `alignas(128)` 지역 변수는 macOS clang과 Debian g++ 모두 128의 배수 주소에 놓였습니다. 컴파일러가 스택 프레임을 맞춰 줍니다.

> ⚠️ `thread_local`이면 자동으로 떨어져 있다고 가정

macOS에서는 두 스레드의 `thread_local`이 16바이트 떨어져 있었습니다. 자주 쓰는 스레드별 변수는 정렬을 명시합니다.

## 정리

- False sharing은 서로 다른 변수가 한 cache line을 쓸 때 생기고, M2에서 카운터 간격 8 B와 128 B의 처리량 차이는 8스레드에서 60~136배였습니다.
- M2의 line은 128 B라 64 B 간격으로는 간섭이 남았습니다. 같은 칩의 Linux guest는 64를 보고했고, arm64 커널의 `____cacheline_aligned`도 64입니다.
- `std::hardware_destructive_interference_size`는 이 글의 두 툴체인에서 256이었습니다.
- macOS의 `thread_local`은 스레드끼리 같은 line에 놓일 수 있었습니다.
- `perf c2c`는 Arm64에서 SPE가 필요하고, hvf guest에서는 동작하지 않았습니다.
- 간격은 대상 칩에서 `fs.cpp` 같은 측정으로 정합니다.

다음 편은 [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)입니다.

## 관련 항목

- [8-03: Cache Line Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)
- [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
- [PE 4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
