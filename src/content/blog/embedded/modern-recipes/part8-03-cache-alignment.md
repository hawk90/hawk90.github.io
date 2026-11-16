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

> **"Cache line alignment는 false sharing을 줄이는 한 수단입니다."** 다만 "64바이트"는 상수가 아닙니다. 이 글의 측정에서 Apple M2 Pro는 64바이트 간격으로 떼어 놓은 두 카운터가 128바이트 간격보다 2.3배 느렸고, 같은 기계의 Linux 게스트는 line 크기를 64로 보고했습니다. 대상에서 재 보고 그 값으로 element 사이 간격을 정합니다.

## 어떤 상황에서 쓰나

멀티코어에서 두 코어가 각자 자기 카운터만 증가시키는데도, 두 카운터가 같은 cache line에 있으면 그 line이 두 코어 사이를 오가며 느려집니다. 두 사람이 각자 다른 칸에 적는데 공책이 한 권뿐이라 계속 건네주고 받는 상황과 같습니다. 아래 측정에서 같은 line에 둔 두 카운터는 128바이트 떨어뜨려 둔 경우보다 5.5배 느렸습니다.

DMA buffer를 cacheable 영역에 둘 때도 line 단위가 문제가 됩니다. cache 유지 보수 명령은 byte가 아니라 line 단위로 동작하므로, buffer의 시작과 끝이 line 경계에 맞지 않으면 옆 변수가 같은 line에 섞여 함께 clean·invalidate됩니다.

## 핵심 개념

두 hot counter가 같은 line에 있을 때와 line이 분리된 경우의 차이를 그림으로 먼저 봅니다.

![Cache line alignment — false sharing 회피](/images/blog/modern-recipes/diagrams/part3-01-cache-alignment.svg)

그림은 64바이트 line을 가정했습니다. 실제 크기는 CPU마다 다르고, 같은 CPU에서도 어디에 묻느냐에 따라 답이 달랐습니다.

| 출처 | 값 | 확인 방법 |
| --- | ---: | --- |
| Cortex-M7 D-cache line | 32 B | CMSIS 5.9.0 `cachel1_armv7.h`: "Cortex-M7 cache line size is fixed to 32 bytes (8 words)" |
| Linux v6.12 arm64 `L1_CACHE_BYTES` | 64 B | `arch/arm64/include/asm/cache.h`의 `L1_CACHE_SHIFT (6)` |
| Apple M2 Pro, macOS `sysctl hw.cachelinesize` | 128 B | 이 글의 실행 |
| 같은 Mac의 Debian 13 게스트, `sysconf(_SC_LEVEL1_DCACHE_LINESIZE)` | 64 B | 이 글의 실행(Linux 6.12.116, GCC 14.2) |
| Apple clang 21 `std::hardware_destructive_interference_size` | 256 B | 이 글의 실행. 같은 실행의 `hardware_constructive_interference_size`는 64 |

C++17의 `std::hardware_destructive_interference_size`는 컴파일러가 정한 권장 상수이지 실행 중인 CPU를 잰 값이 아닙니다. 그래서 가장 확실한 방법은 아래처럼 간격을 바꿔 가며 직접 재는 것입니다. 같은 M2 Pro에서 thread 수와 접근 방식을 더 넓게 바꾼 측정은 [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)에 있고, 이 글의 결과도 그 글과 같은 방향입니다.

## 코드 / 실제 사용 예

아래 layout은 모두 Apple clang 21.0.0 `-std=c++17 -O2`로 컴파일해 `sizeof`·`offsetof`를 찍어 확인했습니다(전체 확인 코드는 [재현 환경](#재현-환경)의 `layouts.cpp`).

```text
Apple clang version 21.0.0 (clang-2100.4.1.1)
sizeof(hot_data)=64 alignof=64
counters_padded: sizeof=128 offsetof(b)=64
counters (no pad): sizeof=128 offsetof(b)=64
spsc_ring<int,16>: offsetof(tail)=64 offsetof(buf)=128 sizeof=192
guest: offsetof(email)=64 sizeof=448
foo: offsetof(b)=4 sizeof=64
percpu.c: cc -std=c11 -c OK
```

### `alignas`로 struct 시작 정렬

```cpp
#include <atomic>

struct alignas(64) hot_data {
    std::atomic<int> counter;
};

hot_data g_data;   /* &g_data % 64 == 0 */
```

type에 붙인 `alignas(64)`는 객체의 시작 주소와 `sizeof`(64)를 정합니다. C에서는 type이 아니라 멤버나 객체에 `_Alignas(64)`(`alignas`)를 붙이고, GCC·Clang 속성 `__attribute__((aligned(64)))`도 씁니다([8-02](/blog/embedded/modern-recipes/part8-02-memory-alignment#explicit-alignment)).

### Element 사이 간격으로 false sharing 차단

```cpp
struct counters {
    alignas(64) std::atomic<int> a;
    alignas(64) std::atomic<int> b;
};

static_assert(offsetof(counters, b) == 64 && sizeof(counters) == 128, "one line each");
```

멤버마다 `alignas(64)`를 붙이면 `b`는 이미 offset 64에서 시작합니다. 위 출력에서 `char pad_a[64 - sizeof(...)]`를 넣은 `counters_padded`와 넣지 않은 `counters`는 `sizeof`·`offsetof(b)`가 같았습니다. 수동 padding은 멤버에 `alignas`를 붙일 수 없는 경우(예: 다른 사람이 정의한 type을 배열로 둘 때)에만 필요합니다. 반대로 struct 머리에만 `alignas(64)`를 붙이고 멤버에는 안 붙이면(`foo`) `b`는 offset 4로 `a`와 같은 line에 붙습니다.

### SPSC ring buffer head/tail 분리

```cpp
template<typename T, size_t N>
struct spsc_ring {
    alignas(64) std::atomic<size_t> head;
    alignas(64) std::atomic<size_t> tail;
    alignas(64) T buf[N];
};
```

producer는 `head`만, consumer는 `tail`만 씁니다. 위 출력에서 `tail`은 offset 64, `buf`는 128에서 시작했습니다. 다만 두 쪽이 상대방 index를 읽어야 full/empty를 판단하므로, 서로 다른 line에 두어도 그 읽기 때문에 line 이동이 0이 되지는 않습니다. 줄이는 방법(상대 index 캐시)은 [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)에서 다룹니다. M2 Pro처럼 128바이트 간격이 필요한 CPU라면 64를 그 값으로 바꿉니다.

### AoS → SoA 변환

```cpp
/* AoS: one particle = 28 B; the loop uses x and vx only */
struct particle { float x, y, z, vx, vy, vz, mass; };

/* SoA: each field is its own array */
struct particles_soa {
    alignas(64) float x[N];
    alignas(64) float y[N];
    alignas(64) float vx[N];
    alignas(64) float vy[N];
};
```

`x += vx * dt` 루프는 particle 하나에서 `x`와 `vx` 8 B만 쓰지만, AoS에서는 28 B 전체가 같은 line들로 함께 올라옵니다. 가져온 byte 중 (28 − 8) / 28 ≈ 71%를 이 루프는 쓰지 않습니다. SoA에서는 가져온 line이 모두 이 루프의 데이터입니다. 4 Mi개 particle에 50번 갱신한 시간을 M2 Pro에서 쟀습니다.

```cpp
// AoS vs SoA: x += vx * dt over N particles, 50 sweeps, median of 5
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <vector>

constexpr int N = 1 << 22;                    // 4 Mi particles
struct particle { float x, y, z, vx, vy, vz, mass; };   // 28 B
struct particles_soa {
    alignas(64) float x[N];
    alignas(64) float y[N];
    alignas(64) float vx[N];
    alignas(64) float vy[N];
};

static particle parts[N];
static particles_soa soa;

template <class F> static double median5(F f)
{
    std::vector<double> v;
    for (int r = 0; r < 5; r++) {
        auto t0 = std::chrono::steady_clock::now();
        f();
        v.push_back(std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count());
    }
    std::sort(v.begin(), v.end());
    return v[2];
}

int main()
{
    const float dt = 0.001f;
    for (int i = 0; i < N; i++) { parts[i].vx = soa.vx[i] = 1.0f; }
    double aos = median5([&] { for (int s = 0; s < 50; s++) for (int i = 0; i < N; i++) parts[i].x += parts[i].vx * dt; });
    double so  = median5([&] { for (int s = 0; s < 50; s++) for (int i = 0; i < N; i++) soa.x[i] += soa.vx[i] * dt; });
    std::printf("sizeof(particle) = %zu B\n", sizeof(particle));
    std::printf("AoS %.3f s, SoA %.3f s (50 sweeps x %d)\n", aos, so, N);
    std::printf("check %.1f %.1f\n", parts[N - 1].x, soa.x[N - 1]);
}
```

```text
sizeof(particle) = 28 B
AoS 0.124 s, SoA 0.029 s (50 sweeps x 4194304)
check 0.3 0.3
```

SoA가 4.3배 빨랐습니다. `-Rpass=loop-vectorize`로 보면 clang은 두 루프를 모두 폭 4로 vectorize했지만, AoS 루프는 interleave 1, SoA 루프는 interleave 4였습니다(`soa.cpp:35`, `:36`). 그래서 이 차이에는 가져오는 byte 수의 차이와 SIMD 코드 품질의 차이가 함께 들어 있습니다.

### Hot/Cold 분리

```cpp
struct guest {
    /* hot: touched every frame */
    alignas(64) int id;
    int active;
    int last_login;

    /* cold: only when shown on screen */
    alignas(64) char email[128];
    char address[256];
};
```

자주 접근하는 필드는 line 하나에 모으고, 드물게 보는 필드는 다음 line부터 둡니다. 수동 `pad` 배열 대신 cold 쪽 첫 멤버에 `alignas(64)`를 붙이면 hot 필드를 늘려도 계산을 다시 할 필요가 없습니다. 위 출력에서 `email`은 offset 64에서 시작했습니다.

### Per-CPU counter

```c
#include <stdalign.h>
#include <stdatomic.h>

#define NUM_CORES 8
#define LINE 128            /* measured on Apple M2 Pro; use the target's value */

struct counter_per_cpu {
    alignas(LINE) atomic_long value;
} per_cpu_counters[NUM_CORES];

_Static_assert(sizeof(struct counter_per_cpu) == LINE, "one slot per line");

void inc(int cpu)
{
    atomic_fetch_add_explicit(&per_cpu_counters[cpu].value, 1, memory_order_relaxed);
}

long sum_all(void)
{
    long s = 0;
    for (int i = 0; i < NUM_CORES; i++)
        s += atomic_load_explicit(&per_cpu_counters[i].value, memory_order_relaxed);
    return s;
}
```

core마다 자기 line의 slot만 쓰고, 읽을 때만 합칩니다. slot 간격이 실제로 얼마나 중요한지 thread 수를 늘리며 쟀습니다. 각 thread가 자기 slot을 1억 번 증가시킨 시간(5회 중앙값)입니다.

```text
slot stride   8 B:  T=1 0.210 s  T=2 1.208 s  T=4 5.970 s  T=8 8.069 s
slot stride 128 B:  T=1 0.262 s  T=2 0.259 s  T=4 0.217 s  T=8 0.251 s
```

128 B 간격에서는 thread가 8개로 늘어도 시간이 0.22~0.26초로 그대로였습니다. 일이 thread 수만큼 늘었는데 시간이 같으니 처리량은 thread 수에 비례해 늘었습니다. 8 B 간격(배열에 붙여 둔 경우)은 자기 T=1 시간(0.210초)보다 thread 2개에서 5.8배, 8개에서 38배 오래 걸렸습니다. 이 Mac의 P-core는 8개라(`hw.perflevel0.physicalcpu` = 8) T=8까지만 쟀습니다.

### Linux 커널 매크로

```c
#include <linux/cache.h>

struct foo {
    int a;
    int b ____cacheline_aligned;   /* starts a new line */
};

static struct bar ____cacheline_aligned g_bar;
```

v6.12 `include/linux/cache.h:67`은 `____cacheline_aligned`를 `__attribute__((__aligned__(SMP_CACHE_BYTES)))`로 정의하고, `SMP_CACHE_BYTES`는 `L1_CACHE_BYTES`입니다(`:13`). arm64에서 이 값은 64입니다. v6.12 소스의 `.c`·`.h` 165개 파일에서 정의를 뺀 332곳이 이 매크로를 씁니다(`grep -rw`).

## 측정 / 성능 비교

두 thread가 각자 `std::atomic<long>` 카운터를 `fetch_add(1, relaxed)`로 1억 번 증가시킨 시간입니다. Apple M2 Pro, macOS, Apple clang 21.0.0 `-std=c++17 -O2 -pthread`, 각 배치 5회 중앙값입니다. macOS에는 CPU affinity API가 없어 thread마다 `QOS_CLASS_USER_INTERACTIVE`로 P-core 배치를 요청만 했습니다.

```cpp
// false sharing: two threads, each fetch_add on its own counter, 1e8 times
#include <atomic>
#include <chrono>
#include <cstddef>
#include <cstdio>
#include <cstdlib>
#include <thread>
#include <vector>
#include <algorithm>
#include <pthread.h>

struct same_line   { std::atomic<long> a, b; };
struct alignas(64) start_only64 { std::atomic<long> a, b; };
struct each64      { alignas(64) std::atomic<long> a; alignas(64) std::atomic<long> b; };
struct each128     { alignas(128) std::atomic<long> a; alignas(128) std::atomic<long> b; };

static constexpr long N = 100000000;

template <class S>
static double run_once()
{
    static S s;                              // static storage: alignment honoured
    s.a = 0; s.b = 0;
    auto work = [](std::atomic<long> *c) {
#ifdef __APPLE__
        pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0);
#endif
        for (long i = 0; i < N; i++) c->fetch_add(1, std::memory_order_relaxed);
    };
    auto t0 = std::chrono::steady_clock::now();
    std::thread t1(work, &s.a), t2(work, &s.b);
    t1.join(); t2.join();
    auto t = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    if (s.a != N || s.b != N) std::abort();
    return t;
}

template <class S>
static void report(const char *name)
{
    std::vector<double> v;
    for (int r = 0; r < 5; r++) v.push_back(run_once<S>());
    std::sort(v.begin(), v.end());
    std::printf("%-14s b-a=%3zu B  median %.3f s  (min %.3f, max %.3f)\n", name,
                offsetof(S, b) - offsetof(S, a), v[2], v[0], v[4]);
}

int main()
{
    static_assert(offsetof(each64, b) == 64 && sizeof(each64) == 128, "each64");
    report<same_line>("same line");
    report<start_only64>("alignas(64) struct");
    report<each64>("alignas(64) each");
    report<each128>("alignas(128) each");
}
```

```text
Apple clang version 21.0.0 (clang-2100.4.1.1)
hw.cachelinesize=128 machdep=Apple M2 Pro
same line      b-a=  8 B  median 1.142 s  (min 1.101, max 1.184)
alignas(64) struct b-a=  8 B  median 1.160 s  (min 1.050, max 1.212)
alignas(64) each b-a= 64 B  median 0.481 s  (min 0.374, max 0.604)
alignas(128) each b-a=128 B  median 0.206 s  (min 0.204, max 0.209)
```

| 배치 | 두 카운터 간격 | 중앙값 | 128 B 간격 대비 |
| --- | ---: | ---: | ---: |
| 같은 struct에 나란히 | 8 B | 1.142 s | 5.5배 |
| struct 머리에만 `alignas(64)` | 8 B | 1.160 s | 5.6배 |
| 멤버마다 `alignas(64)` | 64 B | 0.481 s | 2.3배 |
| 멤버마다 `alignas(128)` | 128 B | 0.206 s | 1.0 |

- **struct 머리의 `alignas(64)`는 아무것도 바꾸지 못했습니다.** 두 카운터가 여전히 8 B 간격입니다.
- **이 CPU에서는 64 B 간격으로도 부족했습니다.** `hw.cachelinesize`가 보고한 128 B 간격에서 차이가 사라졌습니다. 64 B 줄은 5회 안에서도 0.374~0.604초로 가장 많이 흔들렸고, 같은 프로그램을 한 번 더 돌린 실행에서는 중앙값이 0.340초(1.6배)였습니다. 다른 세 줄은 두 실행에서 4% 안쪽으로 같았습니다. 같은 기계의 Linux 게스트가 64를 보고한 것과 다르므로, 숫자를 가져다 쓰지 말고 이 측정처럼 간격을 바꿔 봅니다.
- 이 숫자는 M2 Pro의 것입니다. 임베디드 Cortex-A에서는 같은 프로그램을 그 보드에서 돌려 표를 다시 채웁니다.

## 자주 보는 함정

> ⚠️ struct 머리에만 `alignas`

```cpp
struct foo {
    alignas(64) int a;
    int b;   /* offset 4: same line as a */
};
```

위 출력에서 `offsetof(foo, b)`는 4였습니다. thread마다 나눠 쓰는 멤버라면 각 멤버에 `alignas`를 붙입니다.

> ⚠️ Stack 변수의 큰 alignment를 믿지 못함

[8-02](/blog/embedded/modern-recipes/part8-02-memory-alignment#stack-위의-over-aligned-변수)의 실행에서 `arm-none-eabi-gcc` 16.2와 Apple clang 21은 `alignas(64)` 지역 변수를 모두 64 정렬로 만들었습니다(frame을 더 잡고 `bic`로 주소를 내립니다). 따로 옵션을 켤 필요는 없지만 frame이 커지므로 작은 task stack에서는 `static`으로 옮기는 편이 낫습니다. GCC의 `-mstackrealign`은 x86 옵션이라 Arm에는 해당하지 않습니다.

> ⚠️ 32 B line 칩에 64 정렬

```c
/* Cortex-M7 D-cache line = 32 B (CMSIS cachel1_armv7.h) */
alignas(64) static uint8_t rx_buf[32];   /* half of the 64 B slot is padding */
```

Cortex-M7은 32 B line이므로 32 정렬이면 충분하고, 64로 맞추면 작은 객체마다 그만큼 padding이 늡니다. 반대로 M2 Pro처럼 128 B가 필요한 CPU에 64를 쓰면 위 표처럼 효과가 절반에 그칩니다.

> ⚠️ DMA buffer 정렬 누락

```c
uint8_t buf[1000];   /* alignment 1: shares its first and last line with neighbours */
SCB_InvalidateDCache_by_Addr(buf, sizeof buf);
```

CMSIS 5.9.0 `SCB_InvalidateDCache_by_Addr`의 설명은 "D-Cache is invalidated starting from a 32 byte aligned address in 32 byte granularity"이고, 구현은 `addr`의 하위 5비트를 크기에 더해 line 단위로 반복합니다(`cachel1_armv7.h` 318–345행). 그래서 `buf`가 line 중간에서 시작하면 앞 변수의 일부가 같은 line에 있어 함께 invalidate되고, CPU가 그 변수에 막 쓴 값이 cache에만 있었다면 사라집니다. DMA buffer는 시작을 32 B로 정렬하고 크기도 32의 배수로 올려 다른 변수와 line을 나누지 않게 합니다. 이 함정은 Cortex-M7 보드가 없어 실행하지 않았고, 위 CMSIS 소스로만 확인했습니다.

## 재현 환경

모든 측정은 Apple M2 Pro(macOS)에서 Apple clang 21.0.0으로 했습니다. Linux 게스트 값은 같은 Mac의 QEMU(`-accel hvf`) Debian 13 arm64에서 GCC 14.2로 얻었습니다.

```bash
c++ -std=c++17 -O2 -pthread fs.cpp -o fs && ./fs
c++ -std=c++17 -O2 -pthread pc.cpp -o pc && ./pc
c++ -std=c++17 -O2 soa.cpp -o soa && ./soa
c++ -std=c++17 -O2 layouts.cpp -o layouts && ./layouts
cc -std=c11 -O2 -Wall -Wextra -c percpu.c
sysctl -n hw.cachelinesize hw.perflevel0.physicalcpu
```

`pc.cpp`는 thread 수를 바꿔 가며 같은 일을 시키는 per-thread counter 측정입니다.

```cpp
// per-thread counters: T threads, each fetch_add 1e8 on its own slot
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <thread>
#include <vector>
#include <algorithm>
#include <pthread.h>

template <std::size_t Align> struct slot { alignas(Align) std::atomic<long> value; };

static constexpr long N = 100000000;

template <std::size_t Align>
static double run_once(int T)
{
    static slot<Align> s[8];
    for (auto &x : s) x.value = 0;
    std::vector<std::thread> th;
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < T; i++)
        th.emplace_back([i] {
#ifdef __APPLE__
            pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0);
#endif
            for (long k = 0; k < N; k++) s[i].value.fetch_add(1, std::memory_order_relaxed);
        });
    for (auto &t : th) t.join();
    double t = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    long sum = 0;
    for (int i = 0; i < T; i++) sum += s[i].value.load();
    if (sum != N * T) std::abort();
    return t;
}

template <std::size_t Align>
static void row()
{
    std::printf("slot stride %3zu B:", sizeof(slot<Align>));
    for (int T : {1, 2, 4, 8}) {
        std::vector<double> v;
        for (int r = 0; r < 5; r++) v.push_back(run_once<Align>(T));
        std::sort(v.begin(), v.end());
        std::printf("  T=%d %.3f s", T, v[2]);
    }
    std::printf("\n");
}

int main() { row<8>(); row<128>(); }
```

`layouts.cpp`는 이 글의 struct를 모아 `sizeof`·`offsetof`를 찍습니다.

```cpp
#include <atomic>
#include <cstddef>
#include <cstdio>

struct alignas(64) hot_data { std::atomic<int> counter; };

struct counters_padded {
    alignas(64) std::atomic<int> a;
    char pad_a[64 - sizeof(std::atomic<int>)];
    alignas(64) std::atomic<int> b;
    char pad_b[64 - sizeof(std::atomic<int>)];
};
struct counters { alignas(64) std::atomic<int> a; alignas(64) std::atomic<int> b; };

template <typename T, std::size_t N>
struct spsc_ring {
    alignas(64) std::atomic<std::size_t> head;
    alignas(64) std::atomic<std::size_t> tail;
    alignas(64) T buf[N];
};

struct guest {
    alignas(64) int id;
    int active;
    int last_login;
    alignas(64) char email[128];      /* cold: starts on the next line */
    char address[256];
};

struct foo { alignas(64) int a; int b; };

using ring16 = spsc_ring<int, 16>;

int main()
{
    std::printf("sizeof(hot_data)=%zu alignof=%zu\n", sizeof(hot_data), alignof(hot_data));
    std::printf("counters_padded: sizeof=%zu offsetof(b)=%zu\n", sizeof(counters_padded), offsetof(counters_padded, b));
    std::printf("counters (no pad): sizeof=%zu offsetof(b)=%zu\n", sizeof(counters), offsetof(counters, b));
    std::printf("spsc_ring<int,16>: offsetof(tail)=%zu offsetof(buf)=%zu sizeof=%zu\n",
                offsetof(ring16, tail), offsetof(ring16, buf), sizeof(ring16));
    std::printf("guest: offsetof(email)=%zu sizeof=%zu\n", offsetof(guest, email), sizeof(guest));
    std::printf("foo: offsetof(b)=%zu sizeof=%zu\n", offsetof(foo, b), sizeof(foo));
}
```

## 정리

- line 크기는 Cortex-M7 32 B, Linux arm64 매크로 64 B, M2 Pro `hw.cachelinesize` 128 B로 서로 달랐고, 같은 Mac의 Linux 게스트는 64를 보고했습니다.
- struct 머리의 `alignas(64)`는 멤버 사이 간격을 바꾸지 않습니다. 멤버마다 `alignas`를 붙이면 수동 padding은 필요 없습니다.
- M2 Pro에서 같은 line의 두 카운터는 128 B 간격보다 5.5배, 64 B 간격도 2.3배 느렸습니다.
- 128 B 간격의 per-thread counter는 thread 8개까지 시간이 그대로였고, 8 B 간격은 8개에서 1개일 때의 38배가 걸렸습니다.
- SoA는 이 루프에서 AoS보다 4.3배 빨랐습니다(가져오는 byte 수와 vectorize된 코드의 차이가 함께 들어 있습니다).
- DMA buffer는 시작과 크기를 line 단위로 맞춥니다. CMSIS의 invalidate는 32 B line 단위로 동작합니다.
- Linux는 `____cacheline_aligned`(`SMP_CACHE_BYTES` 정렬)를 v6.12에서 332곳에 씁니다.

다음 편은 **DMA Allocator**입니다.

## 관련 항목

- [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
- [8-04: DMA Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator)
- [8-02: 메모리 정렬](/blog/embedded/modern-recipes/part8-02-memory-alignment)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [PE 2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
