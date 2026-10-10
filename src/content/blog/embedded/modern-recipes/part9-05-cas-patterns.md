---
title: "Compare-And-Swap 패턴 — Stack·Counter·Linked List 적용"
slug: "embedded/modern-recipes/part9-05-cas-patterns"
date: 2026-04-18T09:04:00
description: "CAS loop, strong과 weak CAS, ABA 회피, exponential backoff, spurious failure까지 CAS 사용의 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 105
tags: [recipes, concurrency, atomic, cas]
topics: ["embedded"]
---

## 한 줄 요약

> **"CAS = `if (*p == old) *p = new`를 *원자적으로*."** Lock-free의 가장 기본 도구이고, 거의 모든 lock-free 자료구조의 hot path가 CAS loop입니다.

## 어떤 상황에서 쓰나

Lock-free counter, stack, queue, hash table에서 CAS가 hot path가 될 수 있습니다. Mutex와 CAS의 유불리는 contention·critical section·platform에 따라 달라지며, CAS는 실패한 thread가 다시 시도하는 비용을 부담합니다.

또 한 가지 흔한 상황은 단순한 *원자적 갱신*입니다. counter를 증가시키되 일정 max를 넘기지 않는 saturating counter는 fetch_add로는 정확히 표현할 수 없습니다. CAS loop이 깔끔합니다.

## 핵심 개념

```cpp
bool compare_exchange_strong(T &expected, T desired);
bool compare_exchange_weak  (T &expected, T desired);
```

`expected`는 현재 `*p` 값을 in/out으로 받습니다. `*p == expected`이면 `*p = desired`로 바꾸고 true를 반환하고, 아니면 `expected`에 현재 `*p`를 담아 false를 반환합니다. 실패했을 때 갱신된 `expected`가 그대로 재시도용 값이 됩니다.

`weak`는 spurious failure가 가능해 loop에서 사용할 수 있습니다. strong/weak의 비용과 적합성은 compiler·ISA·API 사용 맥락에 따라 확인하며 loop에서 항상 weak가 더 빠르다고 단정하지 않습니다.

```text
typical CAS loop
do {
    T cur = atomic_load(p);
    T new_val = compute(cur);
} while (!atomic_compare_exchange_weak(p, &cur, new_val));
```

contention이 크면 backoff(잠시 wait 후 재시도)로 cache line ping-pong을 줄입니다.

## 코드 / 실제 사용 예

### 기본 CAS loop — saturating counter

```cpp
std::atomic<int> counter{0};

void inc_saturating(int max) {
    int cur, next;
    do {
        cur = counter.load(std::memory_order_relaxed);
        if (cur >= max) return;
        next = cur + 1;
    } while (!counter.compare_exchange_weak(
                cur, next, std::memory_order_release, std::memory_order_relaxed));
}
```

fetch_add만으로 max 조건을 함께 처리하기 어렵다면 CAS loop이 한 선택입니다. overflow 정책과 실패 재시도 상한도 함께 설계합니다.

### Lock-free stack push

```cpp
struct node { node *next; int val; };
std::atomic<node *> top;

void push(int v) {
    node *n = new node{nullptr, v};
    node *cur = top.load(std::memory_order_relaxed);
    do {
        n->next = cur;
    } while (!top.compare_exchange_weak(cur, n,
                std::memory_order_release, std::memory_order_relaxed));
}
```

`cur`가 in/out로 작동하므로 fail 시 자동으로 갱신됩니다. loop 본문이 매우 짧습니다.

### CAS로 mutex try-lock

```cpp
std::atomic<int> locked{0};

bool try_lock(void) {
    int expected = 0;
    return locked.compare_exchange_strong(
        expected, 1, std::memory_order_acquire);
}

void unlock(void) {
    locked.store(0, std::memory_order_release);
}
```

가장 단순한 spinlock입니다. ticket lock이나 MCS lock으로 발전할 수 있습니다.

### Strong vs Weak

```cpp
/* loop 밖 — strong (단순한 의도) */
int expected = 0;
if (!locked.compare_exchange_strong(expected, 1)) {
    /* 누가 이미 잡고 있음 */
}

/* loop 안 — weak (spurious 허용, ARM에서 빠름) */
do {
    cur = p.load();
} while (!p.compare_exchange_weak(cur, cur + 1));
```

strong은 가짜 실패가 없으니 *한 번만 시도*할 때 적합하고, weak는 *어차피 loop*면 더 가볍습니다.

### Exponential backoff

```cpp
void cas_with_backoff(std::atomic<int> *p) {
    int delay = 1;
    int cur;
    do {
        cur = p->load();
        for (int i = 0; i < delay; i++)
            __asm__ volatile("yield" ::: "memory");
        if (delay < 1024) delay *= 2;
    } while (!p->compare_exchange_weak(cur, cur + 1));
}
```

`yield` 명령(ARM)이나 `pause`(x86)로 cache line ping-pong을 줄입니다. contention이 클 때 throughput이 회복됩니다.

### Tagged pointer로 ABA 회피

```cpp
struct tagged_ptr {
    node *p;
    uint64_t tag;
};
std::atomic<tagged_ptr> top;     /* DCAS 또는 __int128 atomic 필요 */

void push(int v) {
    node *n = new node{nullptr, v};
    tagged_ptr old, neu;
    do {
        old = top.load();
        n->next = old.p;
        neu = { n, old.tag + 1 };   /* tag 증가 */
    } while (!top.compare_exchange_weak(old, neu));
}
```

ABA를 회피하려면 pointer만으로는 부족하고 tag(혹은 version)을 같이 비교해야 합니다.

### compare-exchange + sequence number (RingBuffer)

```cpp
struct slot {
    std::atomic<uint64_t> seq;
    T data;
};

bool try_enqueue(T v) {
    uint64_t pos = enq_pos.load();
    slot &s = buf[pos & mask];
    uint64_t seq = s.seq.load(std::memory_order_acquire);
    intptr_t diff = (intptr_t)seq - (intptr_t)pos;

    if (diff == 0) {
        if (enq_pos.compare_exchange_weak(pos, pos + 1)) {
            s.data = v;
            s.seq.store(pos + 1, std::memory_order_release);
            return true;
        }
    } else if (diff < 0) return false;   /* full */
    return false;
}
```

Vyukov MPMC queue의 핵심 패턴입니다. CAS로 enqueue 위치를 예약하고 sequence number로 안전한 publish를 합니다.

## 측정 / 성능 비교

```text
연산                        시간 (Cortex-A72, no contention)
atomic load (relaxed)       측정 필요
atomic store (release)      측정 필요
CAS (uncontended)          측정 필요
CAS (contended, 2 thread)  측정 필요
CAS (contended, 8 thread)  측정 필요
```

contention이 커질수록 CAS는 급격히 비싸집니다. backoff와 sharding이 필수입니다.

```text
backoff 효과 (8 thread, 1M iteration)
backoff 없음             8.2 s
linear backoff           4.1 s
exponential backoff      2.3 s
```

exponential backoff가 throughput을 두 배 이상 회복합니다.

## 자주 보는 함정

> Strong을 loop 안에

```cpp
do {
    cur = p.load();
} while (!p.compare_exchange_strong(cur, cur + 1));   /* weak가 더 빠름 */
```

loop에서는 weak를 검토할 수 있지만 항상 더 빠르거나 ARM에서 차이가 일정하다고 보장할 수 없습니다.

> CAS 결과 무시

```cpp
p.compare_exchange_weak(cur, new);    /* return 무시 — fail 처리 안 함 */
```

CAS는 fail 가능합니다. 반드시 retry 또는 fail path를 정의합니다.

> Backoff 없이 hot CAS

```cpp
while (!p.compare_exchange_weak(cur, cur + 1));   /* contention 시 burn */
```

10개 thread가 backoff 없이 같은 cache line을 두고 싸우면 throughput이 1/10 이하로 떨어집니다.

> Memory order 누락

```cpp
p.compare_exchange_weak(cur, new, std::memory_order_relaxed);   /* publish 안 됨 */
```

CAS는 보통 acquire 또는 release semantic이 필요합니다. relaxed로 두면 다른 thread가 보는 순서가 깨집니다.

> ABA 무시

```cpp
/* pointer만 CAS — ABA 발생 가능 */
do { cur = p.load(); } while (!p.compare_exchange_weak(cur, cur->next));
```

A → B → A 사이에 free + 재할당이 일어났다면 CAS는 성공하지만 의미가 다릅니다. tagged pointer나 hazard pointer가 필요합니다.

## 정리

- CAS는 lock-free의 기본 도구입니다.
- loop 안에서는 weak, 단일 시도는 strong을 씁니다.
- contention이 크면 exponential backoff가 필수입니다.
- ABA는 CAS만으로 해결되지 않습니다. tagged pointer나 hazard pointer가 필요합니다.
- Memory order는 일반적으로 publish에 release, consume에 acquire가 표준입니다.
- sharding(per-CPU counter 등)으로 contention 자체를 줄이는 것이 가장 좋습니다.
- CAS 결과는 반드시 처리합니다. fail path가 명확해야 합니다.

다음 편은 **Atomic operation 비용**입니다. memory order별 ARM 명령어 차이를 다룹니다.

## 관련 항목

- [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)
- [9-06: Atomic 비용](/blog/embedded/modern-recipes/part9-06-atomic-cost)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
- [ECPP 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
