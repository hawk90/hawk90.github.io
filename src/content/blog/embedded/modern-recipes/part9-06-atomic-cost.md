---
title: "Atomic Operation 비용 분석 — Fence·Cache Line·Contention"
slug: "embedded/modern-recipes/part9-06-atomic-cost"
date: 2026-04-18T09:05:00
description: "memory_order별 ARM 명령어 차이, LSE vs LL/SC, hot spinning 회피까지 atomic 연산의 실측 비용을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 106
tags: [recipes, concurrency, atomic]
topics: ["embedded"]
---

## 한 줄 요약

> **"Atomic은 *공짜가 아닙니다*. 하지만 비싼 곳은 흔히 생각하는 곳이 아닙니다."** 이 글은 memory order마다 AArch64 명령이 어떻게 바뀌는지 컴파일러 출력으로 보고, 실제로 시간이 드는 곳이 memory order보다 *같은 cache line을 여러 코어가 쓰는 순간*이라는 것을 측정으로 확인합니다.

## 어떤 상황에서 쓰나

카운터, flag, ring buffer의 head/tail처럼 작은 공유 변수를 lock 없이 다룰 때 atomic을 씁니다. 이때 "seq_cst는 비싸니 relaxed로", "LSE가 빠르다", "spin할 때는 `yield`" 같은 조언을 자주 듣는데, 각각이 이 글의 측정 환경에서 맞는지 하나씩 확인합니다. 우편함에 비유하면 memory order는 "편지를 넣는 순서를 지키는가"이고, cache line 경합은 "우편함 하나를 여러 사람이 동시에 열려는가"입니다. 이 글의 측정에서는 후자가 훨씬 비쌌습니다.

## 핵심 개념

현재 C++ working draft의 `memory_order` 열거형은 `relaxed = 0, acquire = 2, release = 3, acq_rel = 4, seq_cst = 5`입니다([atomics.order], eel.is 2026-11-16). 1번 자리였던 `consume`은 이 열거형에 없습니다. C11(N1570 7.17.3p1)에는 `memory_order_consume`이 아직 있습니다.

| memory_order | 보장 ([atomics.order]p1) |
|---|---|
| relaxed | 순서를 정하지 않음. 그 객체에 대한 원자성만 |
| acquire | load가 acquire 연산이 됨 |
| release | store가 release 연산이 됨 |
| acq_rel | RMW가 둘 다 |
| seq_cst | 위에 더해 모든 seq_cst 연산이 하나의 전체 순서 S를 이룸(p4) |

### AArch64에서 무엇으로 컴파일되나

연산 하나에 함수 하나씩 만들어 Debian 13 arm64 guest의 g++ 14.2.0으로 네 가지 `-march`에 대해 컴파일했습니다. 아래 표는 주소 계산(`adrp`/`add`)과 `ret`을 뺀 명령입니다.

```cpp
// orders.cpp — one function per (operation, memory order)
#include <atomic>

std::atomic<long> a;

long load_relaxed() { return a.load(std::memory_order_relaxed); }
long load_acquire() { return a.load(std::memory_order_acquire); }
long load_seq_cst() { return a.load(std::memory_order_seq_cst); }
void store_relaxed(long v) { a.store(v, std::memory_order_relaxed); }
void store_release(long v) { a.store(v, std::memory_order_release); }
void store_seq_cst(long v) { a.store(v, std::memory_order_seq_cst); }
long add_relaxed() { return a.fetch_add(1, std::memory_order_relaxed); }
long add_seq_cst() { return a.fetch_add(1, std::memory_order_seq_cst); }
void fence_seq_cst() { std::atomic_thread_fence(std::memory_order_seq_cst); }
```

```bash
#!/bin/bash
# print the memory-access instructions each function compiles to, per -march
for m in "-march=armv8-a -mno-outline-atomics" "-march=armv8-a" "-march=armv8.1-a" "-march=armv8.3-a+rcpc"; do
  echo "### g++ -std=c++17 -O2 $m -c orders.cpp"
  g++ -std=c++17 -O2 $m -c orders.cpp -o o.o
  objdump -d --no-show-raw-insn -C o.o | python3 -c '
import re,sys
cur=None; ins=[]
def flush():
    if cur: print(f"{cur:14s} " + "; ".join(ins))
for l in sys.stdin:
    m=re.match(r"^[0-9a-f]+ <(\w+)\(", l)
    if m: flush(); cur=m.group(1); ins=[]; continue
    p=l.split("\t")
    if len(p)>=2 and cur:
        op=" ".join(x.strip() for x in p[1:]).split("//")[0].strip()
        if re.match(r"(adrp|nop|ret|stp|ldp|mov\s+x29|mov\s+x0, #0x1)\b",op) or re.match(r"add\s+x\d+, x\d+, #0x0$",op): continue
        ins.append(re.sub(r"\s+"," ",op))
flush()'
done
```

```text
$ g++ --version | head -1 && bash orders.sh
g++ (Debian 14.2.0-19) 14.2.0
### g++ -std=c++17 -O2 -march=armv8-a -mno-outline-atomics -c orders.cpp
load_relaxed   ldr x0, [x0]
load_acquire   ldar x0, [x0]
load_seq_cst   ldar x0, [x0]
store_relaxed  str x0, [x1]
store_release  stlr x0, [x1]
store_seq_cst  stlr x0, [x1]
add_relaxed    ldxr x0, [x1]; add x2, x0, #0x1; stxr w3, x2, [x1]; cbnz w3, 68 <add_relaxed()+0x8>
add_seq_cst    ldaxr x0, [x1]; add x2, x0, #0x1; stlxr w3, x2, [x1]; cbnz w3, 88 <add_seq_cst()+0x8>
fence_seq_cst  dmb ish
### g++ -std=c++17 -O2 -march=armv8-a -c orders.cpp
load_relaxed   ldr x0, [x0]
load_acquire   ldar x0, [x0]
load_seq_cst   ldar x0, [x0]
store_relaxed  str x0, [x1]
store_release  stlr x0, [x1]
store_seq_cst  stlr x0, [x1]
add_relaxed    bl 0 <__aarch64_ldadd8_relax>
add_seq_cst    bl 0 <__aarch64_ldadd8_acq_rel>
fence_seq_cst  dmb ish
### g++ -std=c++17 -O2 -march=armv8.1-a -c orders.cpp
load_relaxed   ldr x0, [x0]
load_acquire   ldar x0, [x0]
load_seq_cst   ldar x0, [x0]
store_relaxed  str x0, [x1]
store_release  stlr x0, [x1]
store_seq_cst  stlr x0, [x1]
add_relaxed    ldadd x0, x0, [x1]
add_seq_cst    ldaddal x0, x0, [x1]
fence_seq_cst  dmb ish
### g++ -std=c++17 -O2 -march=armv8.3-a+rcpc -c orders.cpp
load_relaxed   ldr x0, [x0]
load_acquire   ldapr x0, [x0]
load_seq_cst   ldar x0, [x0]
store_relaxed  str x0, [x1]
store_release  stlr x0, [x1]
store_seq_cst  stlr x0, [x1]
add_relaxed    ldadd x0, x0, [x1]
add_seq_cst    ldaddal x0, x0, [x1]
fence_seq_cst  dmb ish
```

읽을 점은 네 가지입니다.

- **seq_cst store는 `stlr` 하나입니다.** release store와 같은 명령이고, `dmb`가 붙지 않았습니다. seq_cst load도 `ldar`로 acquire load와 같습니다. 즉 GCC 14는 AArch64에서 seq_cst load/store를 별도 barrier 없이 이 두 명령으로 구현합니다. 실제로 [9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)의 store buffering 실험(Apple clang 21, M2 Pro)에서 seq_cst 판은 500만 번 중 두 load가 함께 0을 본 적이 없었고, acquire load가 `ldapr`로 컴파일된 release/acquire 판은 4,986,231번 봤습니다.
- **RCpc(`+rcpc`)가 있으면 acquire load만 `ldapr`로 바뀝니다.** seq_cst load는 여전히 `ldar`입니다. Acquire와 seq_cst가 명령 수준에서 갈라지는 곳은 이 한 군데입니다.
- **`fetch_add`는 ARMv8.0에서 `ldxr`/`stxr` 재시도 루프, ARMv8.1에서 `ldadd`/`ldaddal` 한 명령입니다.**
- **`-march=armv8-a`만 주면 GCC 14는 `__aarch64_ldadd8_relax` 같은 함수를 부릅니다.** GCC 14.2 문서는 `-moutline-atomics`가 "on by default"이고, 이 helper가 실행 시점에 LSE를 쓸 수 있는지 보고 아니면 load/store-exclusive를 쓴다고 적습니다. `-march=armv8.1-a`나 `+lse`를 주면 LSE 명령을 직접 씁니다(GCC 14.2.0 manual, AArch64 Options, `-moutline-atomics`).

## 코드 / 실제 사용 예

### memory_order 사용

다른 스레드에 데이터를 넘기는 표준 패턴은 데이터를 쓴 뒤 flag를 release로 세우고, 받는 쪽은 flag를 acquire로 본 뒤 데이터를 읽는 것입니다.

```cpp
std::atomic<bool> ready{false};
std::atomic<int>  data{0};

/* producer */
data.store(42, std::memory_order_relaxed);
ready.store(true, std::memory_order_release);

/* consumer */
while (!ready.load(std::memory_order_acquire)) {}
int v = data.load(std::memory_order_relaxed);   /* v == 42 */
```

Release store와 그 값을 읽은 acquire load가 synchronizes-with 관계를 만들어 `data` 쓰기가 읽기보다 happens-before가 됩니다. 이 패턴을 TSan으로 돌린 결과는 [9-02](/blog/embedded/modern-recipes/part9-02-wait-free)의 flag 예제에 있습니다. 위 컴파일 결과대로 AArch64에서는 이것이 `stlr`/`ldar` 한 쌍이고, seq_cst로 바꿔도 같은 명령입니다.

### fetch_add — LSE vs LL/SC, 그리고 실제 비용

같은 측정 프로그램을 LL/SC(`-march=armv8-a -mno-outline-atomics`)와 LSE(`-march=armv8.1-a`)로 각각 빌드해 같은 guest에서 두 번씩 돌렸습니다. 앞부분은 한 스레드가 같은 연산을 2억 번 반복한 평균이고, 뒷부분은 스레드 4개가 카운터를 올린 처리량입니다.

```cpp
// cost.cpp — single-thread cost per operation, and 4-thread contention on one counter
#include <atomic>
#include <chrono>
#include <cstdio>
#include <mutex>
#include <thread>
#include <vector>

std::atomic<long> a;
constexpr long N = 200000000;

template <class F>
void time_it(const char *name, F f)
{
    auto t0 = std::chrono::steady_clock::now();
    for (long i = 0; i < N; i++) f(i);
    std::chrono::duration<double, std::nano> d = std::chrono::steady_clock::now() - t0;
    std::printf("  %-28s %6.2f ns/op\n", name, d.count() / N);
}

struct alignas(128) shard { std::atomic<long> v; };

int main()
{
    long sink = 0;
    std::printf("single thread, %ld ops each\n", N);
    time_it("load relaxed",        [&](long) { sink += a.load(std::memory_order_relaxed); });
    time_it("load acquire",        [&](long) { sink += a.load(std::memory_order_acquire); });
    time_it("store relaxed",       [](long i) { a.store(i, std::memory_order_relaxed); });
    time_it("store release",       [](long i) { a.store(i, std::memory_order_release); });
    time_it("store seq_cst",       [](long i) { a.store(i, std::memory_order_seq_cst); });
    time_it("fetch_add relaxed",   [](long) { a.fetch_add(1, std::memory_order_relaxed); });
    time_it("fetch_add seq_cst",   [](long) { a.fetch_add(1, std::memory_order_seq_cst); });
    time_it("fence seq_cst",       [](long) { std::atomic_thread_fence(std::memory_order_seq_cst); });

    constexpr int T = 4;
    constexpr long M = 20000000;
    std::mutex mtx;
    long plain = 0;
    static shard shards[T];
    auto run = [&](const char *name, auto body) {
        std::vector<std::thread> th;
        auto t0 = std::chrono::steady_clock::now();
        for (int t = 0; t < T; t++) th.emplace_back([&, t] { for (long i = 0; i < M; i++) body(t); });
        for (auto &x : th) x.join();
        std::chrono::duration<double> d = std::chrono::steady_clock::now() - t0;
        std::printf("  %-28s %7.1f M incs/s\n", name, T * M / d.count() / 1e6);
    };
    std::printf("%d threads x %ld increments\n", T, M);
    run("shared fetch_add relaxed", [](int) { a.fetch_add(1, std::memory_order_relaxed); });
    run("std::mutex + plain ++", [&](int) { std::lock_guard<std::mutex> g(mtx); plain++; });
    run("per-thread shard fetch_add", [](int t) { shards[t].v.fetch_add(1, std::memory_order_relaxed); });
    std::printf("(sink %ld)\n", sink);
}
```

```text
# Debian 13 arm64 guest (QEMU -accel hvf, 6 vCPU, Apple M2 Pro host), g++ 14.2.0;  14:15:52 up  1:11,  2 users,  load average: 0.71, 0.66, 0.84
$ ./cost_llsc   # built with -march=armv8-a -mno-outline-atomics, round 1
single thread, 200000000 ops each
  load relaxed                   0.31 ns/op
  load acquire                   0.31 ns/op
  store relaxed                  0.31 ns/op
  store release                  0.31 ns/op
  store seq_cst                  0.31 ns/op
  fetch_add relaxed              2.17 ns/op
  fetch_add seq_cst              4.64 ns/op
  fence seq_cst                  0.32 ns/op
4 threads x 20000000 increments
  shared fetch_add relaxed       118.0 M incs/s
  std::mutex + plain ++           35.0 M incs/s
  per-thread shard fetch_add    1819.5 M incs/s
(sink 0)
$ ./cost_llsc   # built with -march=armv8-a -mno-outline-atomics, round 2
single thread, 200000000 ops each
  load relaxed                   0.31 ns/op
  load acquire                   0.31 ns/op
  store relaxed                  0.33 ns/op
  store release                  0.31 ns/op
  store seq_cst                  0.31 ns/op
  fetch_add relaxed              2.11 ns/op
  fetch_add seq_cst              4.65 ns/op
  fence seq_cst                  0.32 ns/op
4 threads x 20000000 increments
  shared fetch_add relaxed       214.3 M incs/s
  std::mutex + plain ++           35.8 M incs/s
  per-thread shard fetch_add    1830.4 M incs/s
(sink 0)
$ ./cost_lse   # built with -march=armv8.1-a, round 1
single thread, 200000000 ops each
  load relaxed                   0.31 ns/op
  load acquire                   0.31 ns/op
  store relaxed                  0.31 ns/op
  store release                  0.31 ns/op
  store seq_cst                  0.31 ns/op
  fetch_add relaxed              2.10 ns/op
  fetch_add seq_cst              4.09 ns/op
  fence seq_cst                  0.31 ns/op
4 threads x 20000000 increments
  shared fetch_add relaxed        70.7 M incs/s
  std::mutex + plain ++           28.7 M incs/s
  per-thread shard fetch_add    1867.4 M incs/s
(sink 0)
$ ./cost_lse   # built with -march=armv8.1-a, round 2
single thread, 200000000 ops each
  load relaxed                   0.31 ns/op
  load acquire                   0.30 ns/op
  store relaxed                  0.30 ns/op
  store release                  0.30 ns/op
  store seq_cst                  0.30 ns/op
  fetch_add relaxed              2.05 ns/op
  fetch_add seq_cst              3.99 ns/op
  fence seq_cst                  0.31 ns/op
4 threads x 20000000 increments
  shared fetch_add relaxed        82.0 M incs/s
  std::mutex + plain ++           30.1 M incs/s
  per-thread shard fetch_add    1888.5 M incs/s
(sink 0)
```

결과는 흔한 조언과 다른 곳이 많습니다.

- **경합 없는 한 스레드에서 load·store는 memory order와 상관없이 약 0.3 ns였습니다.** `seq_cst` store도 `stlr`이므로 release store와 같았고, 루프 안의 `dmb ish`(fence seq_cst)도 약 0.3 ns였습니다. "seq_cst는 DMB 때문에 비싸다"는 이 측정에서는 나타나지 않았습니다.
- **`fetch_add`는 relaxed 약 2.1 ns, seq_cst 약 4.0~4.7 ns였습니다.** RMW부터는 memory order가 비용에 보입니다.
- **스레드 4개가 공유 카운터 하나를 올리면 LL/SC 판이 118~214, LSE 판이 71~82 M incs/s였습니다.** 이 guest에서는 LSE가 경합 상황에서 오히려 느렸습니다. "LSE가 contention에 강하다"는 이 측정으로는 뒷받침되지 않습니다.
- **스레드마다 자기 shard를 올리면 1,820~1,890 M incs/s로, 공유 카운터보다 열 배 이상 빨랐습니다.** `std::mutex`는 29~36 M incs/s였습니다. 비용을 좌우한 것은 memory order도 명령 종류도 아니고 cache line을 공유하느냐였습니다.

이 숫자는 hvf 가상 머신 안의 값이고, 실제 보드에서는 코어·캐시 구조에 따라 다시 재야 합니다.

### 컴파일러 옵션

대상 CPU가 LSE를 확실히 지원하면 `-march=armv8.1-a`(또는 `+lse`, 해당 CPU의 `-mcpu=`)로 LSE를 직접 쓰고, 여러 CPU에서 같은 바이너리를 돌려야 하면 GCC 기본값인 `-moutline-atomics`가 실행 시점에 고릅니다. 위 표에서 `-march=armv8-a`의 `bl __aarch64_ldadd8_relax`가 그 경로입니다. 함수 호출이 하나 더 들어가므로, 경합 없는 hot loop라면 그 호출 비용도 재 봅니다.

```bash
g++ -O2 -march=armv8.1-a main.cpp                       # LSE instructions inline
g++ -O2 -march=armv8-a main.cpp                         # GCC default: -moutline-atomics helpers
g++ -O2 -march=armv8-a -mno-outline-atomics main.cpp    # LL/SC loops only
```

### Spin loop의 hot read

다른 스레드를 기다리며 flag를 계속 읽는 spin loop가 *같은 cache line에 쓰는 다른 스레드*를 얼마나 늦추는지 Mac에서 쟀습니다. Writer는 2억 번 store하고, spinner는 (1) 없음, (2) writer와 같은 line의 flag를 계속 읽음, (3) 같은 line을 읽되 매번 `yield`, (4) 다른 line의 flag를 읽음, 네 경우입니다.

```cpp
// spin.cpp — how a spinning reader slows a writer that stores to the same cache line
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <thread>

struct alignas(128) line { std::atomic<long> word; std::atomic<int> flag; };
line shared;                                   // writer's word and the spinner's flag share a line
alignas(128) std::atomic<int> other_flag;      // a flag on a different line
std::atomic<bool> stop;

int main(int argc, char **argv)
{
    const char *mode = argv[1];                // none | hot | yield | otherline
    std::thread spinner([mode] {
        if (!std::strcmp(mode, "none")) return;
        std::atomic<int> &f = !std::strcmp(mode, "otherline") ? other_flag : shared.flag;
        bool yield = !std::strcmp(mode, "yield");
        while (!stop.load(std::memory_order_relaxed)) {
            while (f.load(std::memory_order_acquire) == 0 && !stop.load(std::memory_order_relaxed))
                if (yield) __asm__ volatile("yield" ::: "memory");
        }
    });
    constexpr long N = 200000000;
    auto t0 = std::chrono::steady_clock::now();
    for (long i = 0; i < N; i++) shared.word.store(i, std::memory_order_relaxed);
    std::chrono::duration<double, std::nano> d = std::chrono::steady_clock::now() - t0;
    stop = true;
    spinner.join();
    std::printf("spinner=%-9s writer %.2f ns per store\n", mode, d.count() / N);
}
```

```text
host: Apple M2 Pro (8P+4E), macOS 27.2.1, Apple clang 21.0.0
$ clang++ -std=c++17 -O2 spin.cpp -o spin
spinner=none      writer 0.30 ns per store
spinner=hot       writer 0.55 ns per store
spinner=yield     writer 0.51 ns per store
spinner=otherline writer 0.30 ns per store
spinner=none      writer 0.30 ns per store
spinner=hot       writer 0.51 ns per store
spinner=yield     writer 0.56 ns per store
spinner=otherline writer 0.30 ns per store
spinner=none      writer 0.30 ns per store
spinner=hot       writer 0.54 ns per store
spinner=yield     writer 0.53 ns per store
spinner=otherline writer 0.31 ns per store
```

같은 line을 읽는 spinner가 있으면 writer의 store 한 번이 약 0.30 ns에서 0.51~0.56 ns로 늘었습니다. `yield`를 넣어도 줄지 않았고, spinner가 다른 line을 읽으면 영향이 사라졌습니다. 이 Mac에서 효과가 있었던 처방은 `yield`가 아니라 *기다리는 flag를 남이 자주 쓰는 데이터와 다른 cache line에 두는 것*이었습니다. Cache line 배치는 [9-09](/blog/embedded/modern-recipes/part9-09-false-sharing)에서 더 다룹니다.

### Per-CPU counter (sharding)

위 `cost.cpp`의 `shard` 배열이 그 형태입니다. 각 shard를 cache line 크기(이 Mac은 128 B)로 정렬해 스레드마다 다른 line을 쓰게 하고, 합계가 필요할 때만 모두 읽어 더합니다. 측정에서 공유 카운터보다 열 배 넘게 빨랐습니다. 합계는 다른 스레드가 올리는 중에 읽으면 그 순간의 근삿값입니다.

### relaxed counter의 함정

```cpp
/* OK: a statistics counter that nothing else depends on */
total.fetch_add(1, std::memory_order_relaxed);

/* NOT OK: a flag that tells another thread "data is ready" */
ready.store(true, std::memory_order_relaxed);    /* reader may see the flag but stale data */
```

Relaxed는 그 객체에 대한 원자성만 주고 다른 메모리와의 순서는 정하지 않습니다([atomics.order]p1.1). 데이터를 넘기는 flag라면 release/acquire가 필요하고, relaxed로 둔 CAS가 실제로 TSan race를 낸 실행은 [9-05](/blog/embedded/modern-recipes/part9-05-cas-patterns)에 있습니다.

### Atomic 크기와 lock-freedom

어떤 크기의 atomic이 lock-free인지는 대상 아키텍처가 정합니다. `arm-none-eabi-gcc` 16.2.0에서 `__atomic_always_lock_free(N, 0)`을 컴파일 시점에 계산하게 하고 어셈블리의 상수를 읽었습니다.

```bash
#!/bin/bash
# evaluate the builtin at compile time and read the constants from the assembly
for t in "-mthumb -mcpu=cortex-m0plus" "-mthumb -mcpu=cortex-m3" "-mthumb -mcpu=cortex-m4" "-march=armv7-a"; do
  printf 'int lf4 = __atomic_always_lock_free(4, 0);\nint lf8 = __atomic_always_lock_free(8, 0);\n' > lf_const.c
  v=$(arm-none-eabi-gcc -O2 $t -S lf_const.c -o - | awk '/^lf4:/{getline; a=($1==".word")?$2:0} /^lf8:/{getline; b=($1==".word")?$2:0} END{print "4-byte=" (a==""?0:a) "  8-byte=" (b==""?0:b)}')
  echo "arm-none-eabi-gcc $t: $v"
done
```

```text
arm-none-eabi-gcc -mthumb -mcpu=cortex-m0plus: 4-byte=0  8-byte=0
arm-none-eabi-gcc -mthumb -mcpu=cortex-m3: 4-byte=1  8-byte=0
arm-none-eabi-gcc -mthumb -mcpu=cortex-m4: 4-byte=1  8-byte=0
arm-none-eabi-gcc -march=armv7-a: 4-byte=1  8-byte=1
```

Cortex-M0+(ARMv6-M)는 RMW 명령이 없어 4바이트도 "항상 lock-free"가 아니었고, Cortex-M3·M4는 4바이트만, ARMv7-A는 `ldrexd`/`strexd`가 있어 8바이트까지 lock-free였습니다. Lock-free가 아닌 크기의 atomic 연산은 [9-02](/blog/embedded/modern-recipes/part9-02-wait-free)에서 본 것처럼 `__atomic_load_8` 같은 라이브러리 함수 호출이 되고, 그 함수를 제공하는 라이브러리를 링크해야 합니다. 16바이트 atomic도 같은 AArch64 위에서 컴파일러에 따라 달랐습니다([9-05](/blog/embedded/modern-recipes/part9-05-cas-patterns)의 tagged pointer).

## 측정 / 성능 비교

위 두 측정을 한 표로 모았습니다.

| 항목 | 측정값 | 환경 |
| --- | --- | --- |
| load / store (relaxed·acquire·release·seq_cst) | 약 0.30~0.33 ns | guest, 단일 스레드 반복 |
| `atomic_thread_fence(seq_cst)` (`dmb ish`) | 약 0.31~0.32 ns | 같음 |
| `fetch_add` relaxed / seq_cst | 약 2.1 / 4.0~4.7 ns | 같음, LL/SC·LSE 비슷 |
| 4스레드 공유 `fetch_add` | LL/SC 118~214, LSE 71~82 M/s | guest, 6 vCPU |
| 4스레드 `std::mutex` | 29~36 M/s | 같음 |
| 4스레드 shard | 1,820~1,890 M/s | 같음 |
| 같은 line을 hot spin할 때 writer store | 0.30 → 0.51~0.56 ns | Mac, `yield`도 같음 |

guest는 Debian 13 arm64(QEMU `-accel hvf`, vCPU 6개, Apple M2 Pro host)와 g++ 14.2.0, Mac은 Apple M2 Pro와 Apple clang 21.0.0입니다.

## 자주 보는 함정

> ⚠️ "기본값 seq_cst는 가장 비싸다"고 단정

```cpp
std::atomic<int> a;
a.store(1);    /* seq_cst: on AArch64 this was the same stlr as a release store */
```

AArch64에서는 seq_cst load/store가 acquire/release와 같은 명령이었습니다. RMW에서는 seq_cst가 약 2배였습니다. 약한 order를 고르는 이유는 비용보다 *의도를 드러내는 것*이고, 약하게 바꿀 때는 그 order로 충분한지를 먼저 확인합니다.

> ⚠️ `volatile`로 동기화

```cpp
volatile int flag;    /* not atomic, no happens-before */
```

`volatile`은 atomic이 아니라서 두 스레드가 동시에 접근하면 data race이고(N1570 5.1.2.4p25), [9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)의 실행에서는 실제로 틀린 바이트를 읽었습니다.

> ⚠️ 32비트 MCU에서 64비트 atomic

```cpp
std::atomic<int64_t> x;   /* Cortex-M3/M4: not always lock-free, becomes a library call */
```

위 표처럼 M3·M4에서 8바이트는 lock-free가 아니었습니다. ISR과 공유한다면 그 라이브러리 함수가 ISR에서 안전한지까지 확인해야 하므로, 32비트 두 개로 나누거나 [9-02](/blog/embedded/modern-recipes/part9-02-wait-free)의 seqlock처럼 읽습니다.

> ⚠️ `yield`를 넣었으니 spin이 무해하다고 믿음

```cpp
while (locked.load(std::memory_order_relaxed)) __asm__ volatile("yield");   /* still reads the line */
```

위 측정에서 `yield`는 같은 line을 쓰는 writer를 늦추는 정도를 줄이지 못했습니다. 기다리는 변수를 다른 line에 두는 것이 효과가 있었습니다.

> ⚠️ "LSE면 경합에 강하다"고 가정

이 guest에서는 4스레드 공유 카운터에서 LSE 판이 LL/SC 판보다 느렸습니다. 경합 비용은 명령이 아니라 공유 자체에서 나오므로, shard로 공유를 없애는 것이 먼저입니다.

## 정리

- AArch64에서 seq_cst load/store는 `ldar`/`stlr`로 acquire/release와 같은 명령이었고, RCpc가 있으면 acquire load만 `ldapr`로 바뀌었습니다.
- `fetch_add`는 ARMv8.0에서 LL/SC 루프, ARMv8.1에서 `ldadd`이고, GCC 14의 `-march=armv8-a` 기본값은 실행 시점에 고르는 helper 호출입니다.
- 경합 없는 load·store·fence는 order와 상관없이 약 0.3 ns, `fetch_add`는 약 2~4.7 ns였습니다.
- 비용을 좌우한 것은 cache line 공유였습니다. 공유 카운터는 shard보다 열 배 넘게 느렸고, 같은 line을 hot spin하면 writer가 1.7배쯤 느려졌습니다.
- `yield`와 LSE는 이 측정에서 경합 비용을 줄이지 못했습니다.
- 8바이트 atomic은 Cortex-M3·M4에서 lock-free가 아니고, M0+에서는 4바이트도 RMW가 lock-free가 아닙니다.

다음 편은 [9-07: Spinlock vs Mutex](/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex)입니다.

## 관련 항목

- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-07: Spinlock vs Mutex](/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex)
- [9-09: False sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [PE 4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [PE 4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
