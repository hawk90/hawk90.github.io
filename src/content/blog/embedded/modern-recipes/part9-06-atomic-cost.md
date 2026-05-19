---
title: "9-06: Atomic operation 비용"
date: 2026-05-16T10:00:00
description: "memory_order별 ARM 명령어 차이, LSE vs LL/SC, hot spinning 회피까지 atomic 연산의 실측 비용을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 106
tags: [recipes, concurrency, atomic]
---

## 한 줄 요약

> **"Atomic은 *공짜가 아닙니다*."** Memory order에 따라 LDR/STR이 LDAR/STLR로 바뀌고, contention이 있는 순간 cache line ping-pong이 발생합니다.

## 어떤 상황에서 쓰나

counter, flag, ring buffer head/tail처럼 *작은 공유 변수*를 lock 없이 처리할 때 atomic이 필수입니다. lock보다 빠르다고 알려져 있지만, 실은 *어떤 memory order로 어떤 architecture에서*에 따라 lock과 비슷하거나 더 느릴 수도 있습니다.

또 한 가지 흔한 상황은 spin loop입니다. busy wait가 cache line을 끊임없이 read하면 다른 코어의 store latency가 폭증합니다. `pause`/`yield`와 backoff로 영향을 줄여야 합니다.

## 핵심 개념

| memory_order | 보장 |
|---|---|
| relaxed | atomic만, 순서 보장 없음 |
| consume | 단일 dependency chain (실무에서 acquire로 격상) |
| acquire | load 이후의 메모리 동작이 *재배열 안 됨* |
| release | store 이전의 메모리 동작이 *재배열 안 됨* |
| acq_rel | acquire + release |
| seq_cst | global total order (가장 비쌈) |

ARMv8에서 매핑되는 명령어입니다.

```text
load
  relaxed       LDR
  acquire       LDAR        (one-way acquire fence)
  seq_cst       LDAR

store
  relaxed       STR
  release       STLR        (one-way release fence)
  seq_cst       STLR + DMB ISH

fetch_add
  relaxed       LDXR/STXR loop (ARMv8.0) or LDADD (ARMv8.1 LSE)
  seq_cst       LDAXR/STLXR loop or LDADDAL
```

ARMv8.1의 LSE(Large System Extensions)가 LL/SC retry를 single instruction으로 대체해 contention에서 큰 이점을 줍니다.

## 코드 / 실제 사용 예

### memory_order 사용

```cpp
std::atomic<bool> ready{false};
std::atomic<int>  data{0};

/* producer */
data.store(42, std::memory_order_relaxed);
ready.store(true, std::memory_order_release);

/* consumer */
while (!ready.load(std::memory_order_acquire));
int v = data.load(std::memory_order_relaxed);
/* v == 42 보장 */
```

publish 한 쪽에 release, consume 한 쪽에 acquire가 표준 패턴입니다. seq_cst가 필요한 경우는 의외로 적습니다.

### fetch_add — LSE vs LL/SC

```cpp
std::atomic<long> counter;

void inc(void) { counter.fetch_add(1, std::memory_order_relaxed); }
```

ARMv8.0 코드:

```asm
1:  ldxr    x0, [x1]
    add     x0, x0, #1
    stxr    w2, x0, [x1]
    cbnz    w2, 1b      // retry on failure
```

ARMv8.1 LSE 코드:

```asm
mov     x0, #1
ldadd   x0, xzr, [x1]    // single atomic
```

LSE는 contention 시 RMW retry가 사라져 cache line ping-pong이 크게 줄어듭니다.

### 컴파일러 옵션

```bash
# LSE 강제 사용 (Cortex-A55, A76 이상)
gcc -march=armv8.1-a+lse main.c

# auto detection
gcc -march=armv8.1-a main.c -moutline-atomics
# -moutline-atomics: 런타임에 LSE 지원 시 LSE, 아니면 LL/SC 자동 선택
```

`-moutline-atomics`는 컴파일된 binary가 칩별 최적 atomic을 자동 선택합니다.

### Spin loop의 hot read 회피

```cpp
/* 나쁨 — atomic load만 hot loop */
while (flag.load(std::memory_order_acquire)) {
    /* 매 iteration LDAR — cache line invalidate */
}

/* 좋음 — yield/pause로 backoff */
while (flag.load(std::memory_order_relaxed)) {
    __asm__ volatile("yield" ::: "memory");
}
if (flag.load(std::memory_order_acquire)) { ... }
```

hot loop의 LDR/LDAR이 다른 코어의 store latency를 폭증시킵니다. yield로 hardware에 hint를 주면 micro-architecture가 backoff를 처리합니다.

### Per-CPU counter (sharding)

```cpp
struct alignas(64) shard {
    std::atomic<long> v;
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

contention 자체를 줄이는 가장 강력한 도구는 sharding입니다. relaxed로도 충분하니 비용이 거의 없습니다.

### relaxed counter의 함정

```cpp
/* OK — counter는 monotonic increment만, 순서 무관 */
total.fetch_add(1, std::memory_order_relaxed);

/* NOK — flag 후 data 읽기는 release/acquire 필요 */
ready.store(true, std::memory_order_relaxed);    /* 다른 thread가 data를 못 봄 */
```

relaxed는 *atomicity*만 보장합니다. happens-before 관계가 필요한 곳에는 release/acquire를 씁니다.

### Atomic 크기와 lock-freeness

```cpp
std::atomic<int> a;       // is_always_lock_free == true
std::atomic<int64_t> b;   // 32-bit arch에서 false (mutex 내장)
std::atomic<__int128> c;  // 대부분 false (DCAS)
```

`std::atomic<T>::is_always_lock_free`로 확인합니다. lock-free가 아니면 내부적으로 mutex가 쓰이므로 성능이 매우 떨어집니다.

## 측정 / 성능 비교

```text
연산 (Cortex-A72, no contention)
LDR / STR                  1 cycle
LDAR (acquire load)        2 cycle
STLR (release store)       2 cycle
LDAXR/STLXR loop           4~6 cycle
LDADD (LSE)                3 cycle
DMB ISH                    10~20 cycle
```

acquire/release는 거의 무료, seq_cst의 DMB가 큰 비용입니다.

```text
contention 시 (8 thread, 같은 변수)
LL/SC fetch_add            >200 cycle/op
LSE   fetch_add            ~50 cycle/op
mutex lock/unlock          ~150 ns
per-CPU counter            10 cycle/op
```

contention이 있는 순간 비용이 폭증합니다. sharding이 가장 큰 효과를 냅니다.

```text
spin loop 영향 (다른 코어에서 store)
hot LDAR 없음              store latency 4 cycle
hot LDAR 있음              store latency 60+ cycle
yield로 backoff            store latency 8 cycle
```

hot spin은 다른 코어의 정상적인 work까지 망칩니다.

## 자주 보는 함정

> seq_cst 남용

```cpp
std::atomic<int> a;
a.fetch_add(1);    /* default = seq_cst — 가장 비쌈 */
```

명시적으로 relaxed/acquire/release를 골라야 합니다. 기본값이 가장 무겁습니다.

> volatile로 동기화

```cpp
volatile int flag;    /* 동기화 안 됨 — UB */
```

`volatile`은 atomic이 아니고 memory order도 보장 안 합니다. atomic을 써야 합니다.

> 32-bit 환경에서 64-bit atomic

```cpp
std::atomic<int64_t> x;   /* mutex 사용 — lock-free 아님 */
```

architecture를 확인해 lock-free인지 검증합니다.

> Backoff 없는 spin

```cpp
while (locked.load());   /* hot LDR — 시스템 전반 영향 */
```

`yield`/`pause`로 hardware hint를 줍니다.

> Memory order를 단계적으로 확인 안 함

```cpp
flag.store(true);    /* default seq_cst */
/* 코드 다 짜고 나서 "relaxed로 되나?" 고민 — 위험 */
```

설계 시 memory order를 먼저 결정합니다. 나중에 약하게 바꾸면 race가 생길 수 있습니다.

## 정리

- atomic 비용은 memory order에 따라 1 cycle에서 20 cycle 이상까지 변합니다.
- ARMv8.1의 LSE는 LL/SC retry를 single instruction으로 대체해 contention에 강합니다.
- spin loop은 yield/pause로 backoff를 둬야 다른 코어 work를 망치지 않습니다.
- sharding(per-CPU counter)이 contention을 가장 효과적으로 줄입니다.
- relaxed는 monotonic counter에만, publish/consume은 release/acquire가 표준입니다.
- 32-bit 환경에서 64-bit atomic은 lock-free가 아닐 수 있습니다.
- `volatile`은 atomic이 아닙니다. atomic을 씁니다.

다음 편은 **Spinlock vs Mutex 결정**입니다.

## 관련 항목

- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-07: Spinlock vs Mutex](/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex)
- [9-09: False sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [PE 4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [PE 4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
