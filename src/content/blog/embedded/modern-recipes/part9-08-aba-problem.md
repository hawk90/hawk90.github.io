---
title: "9-08: ABA 문제 회피"
date: 2026-05-16T12:00:00
description: "ABA 시나리오, tagged pointer (64-bit + tag), version counter, hazard pointer 활용, 실제 사례를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 108
tags: [recipes, concurrency, aba]
---

## 한 줄 요약

> **"ABA = CAS가 *값은 같지만 의미가 다른* 상황을 못 구별하는 문제."** 해결은 tag 또는 version으로 *변경의 횟수*를 같이 비교하는 것입니다.

## 어떤 상황에서 쓰나

lock-free stack의 pop, free list 관리, lock-free hash table에서 가장 자주 마주칩니다. 어떤 thread가 head pointer A를 읽고 잠깐 멈췄을 때, 다른 thread가 A를 dequeue, free, 같은 주소를 다시 allocate해 A로 만들면, 멈췄던 thread가 다시 깨어나 CAS를 시도해 *성공*합니다. 그러나 의미는 깨졌습니다.

GC가 있는 언어(Java, C#)는 free 자체가 즉시 일어나지 않으므로 ABA가 거의 없습니다. C/C++의 lock-free 자료구조에서는 항상 고려해야 합니다.

## 핵심 개념

```text
시나리오
1. T1: read head → A
2. T1: 멈춤
3. T2: pop A → free A → allocate → 새 node가 같은 주소 A
4. T1: CAS(head, A, A->next) → 성공 (그러나 A->next는 이미 stale)
```

해결책 세 가지입니다.

```text
1. tagged pointer   pointer + tag (16-bit 또는 그 이상)
2. version counter   별도 atomic counter를 CAS 일부에 포함
3. hazard pointer    "지금 보호 중"을 광고해 free 자체를 막음
4. epoch / RCU       grace period 동안 free 지연
```

ARM64는 16-bit를 pointer 상위에 쓸 수 있으므로 tagged pointer가 자연스럽습니다. x86-64도 보통 16-bit가 free합니다. 또는 `__int128` DCAS로 64-bit pointer + 64-bit tag를 묶습니다.

## 코드 / 실제 사용 예

### Naive lock-free stack (ABA 취약)

```cpp
struct node { node *next; int v; };
std::atomic<node *> top;

int pop_naive(void) {
    node *cur;
    do {
        cur = top.load();
        if (!cur) return -1;
        /* 이 순간 다른 thread가 cur 제거, free, 재할당 가능 */
    } while (!top.compare_exchange_weak(cur, cur->next));
    int v = cur->v;
    delete cur;
    return v;
}
```

CAS는 성공하지만 `cur->next`가 이미 깨진 값이면 stack이 corruption됩니다.

### Tagged pointer (struct + 128-bit CAS)

```cpp
struct tagged_node {
    node *ptr;
    uint64_t tag;
};

std::atomic<tagged_node> top;    /* sizeof == 16, 128-bit CAS 필요 */

int pop_tagged(void) {
    tagged_node cur, neu;
    do {
        cur = top.load();
        if (!cur.ptr) return -1;
        neu = { cur.ptr->next, cur.tag + 1 };
    } while (!top.compare_exchange_weak(cur, neu));
    int v = cur.ptr->v;
    delete cur.ptr;
    return v;
}
```

매 update마다 tag를 증가시킵니다. 같은 주소가 다시 와도 tag가 다르므로 CAS가 fail합니다. ARM64는 `LDAXP/STLXP`, x86-64는 `CMPXCHG16B` 명령을 씁니다.

### Pointer 상위 비트 사용 (16-bit tag)

```cpp
/* ARM64/x86-64는 보통 상위 16-bit가 사용 가능 */
inline uintptr_t pack(node *p, uint16_t tag) {
    return (uintptr_t)p | ((uintptr_t)tag << 48);
}

inline node *unpack_ptr(uintptr_t v) {
    return (node *)(v & 0x0000FFFFFFFFFFFFull);
}

inline uint16_t unpack_tag(uintptr_t v) {
    return (uint16_t)(v >> 48);
}

std::atomic<uintptr_t> top;

int pop_packed(void) {
    uintptr_t cur, neu;
    node *p;
    do {
        cur = top.load();
        p = unpack_ptr(cur);
        if (!p) return -1;
        neu = pack(p->next, unpack_tag(cur) + 1);
    } while (!top.compare_exchange_weak(cur, neu));
    int v = p->v;
    delete p;
    return v;
}
```

64-bit atomic 하나로 처리되므로 가장 가볍습니다. 16-bit tag는 2^16 = 65536 update마다 wraparound하므로 매우 빠른 cycle에서는 부족할 수 있습니다.

### Version counter (DCAS 없이)

```cpp
std::atomic<node *> top;
std::atomic<uint64_t> version;

int pop_versioned(void) {
    node *cur, *next;
    uint64_t ver;
    do {
        ver = version.load();
        cur = top.load();
        if (!cur) return -1;
        next = cur->next;
    } while (!top.compare_exchange_weak(cur, next) ||
             version.fetch_add(1) != ver);
    /* 별도 atomic 두 개 — 일관성이 깨짐 — 비추천 */
}
```

CAS 두 개를 따로 쓰면 일관성이 깨집니다. DCAS가 가능한 architecture에서는 tagged pointer가 옳습니다.

### Hazard pointer로 회피

```cpp
int pop_hp(void) {
    node *cur;
    while (true) {
        cur = top.load();
        if (!cur) return -1;
        my_hp.store(cur);                    /* publish */
        if (top.load() != cur) continue;    /* re-validate */
        if (top.compare_exchange_weak(cur, cur->next)) {
            int v = cur->v;
            my_hp.store(nullptr);
            retire(cur);                     /* 즉시 free 안 함 */
            return v;
        }
    }
}
```

free 자체를 지연시키면 ABA가 근본적으로 사라집니다. 자세한 내용은 [9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)를 참고합니다.

### RCU 기반 (Linux 커널 식)

```c
rcu_read_lock();
list_for_each_entry_rcu(e, &head, list) {
    process(e);
}
rcu_read_unlock();

/* writer */
list_del_rcu(&e->list);
call_rcu(&e->rcu, free_entry);    /* grace period 후 free */
```

RCU도 free를 grace period까지 지연하므로 ABA가 발생할 수 없습니다.

### 실제 사례 — IBM의 lock-free queue

```text
원본 paper Michael & Scott (1996)
  CAS 두 번으로 enqueue/dequeue
  ABA 회피를 위해 tagged pointer 필수
  C++ 구현은 보통 atomic<__int128> 사용
```

기록된 거의 모든 lock-free queue가 tagged pointer 또는 RCU를 가집니다.

## 측정 / 성능 비교

```text
ABA 발생률 (8 thread stack, 1M op)
대처 없음                   매 100K op 중 ~수십 회 corruption
16-bit tag (packed)         양산 환경에서 거의 0 (wraparound risk)
64-bit tag (DCAS)           0
hazard pointer              0 (memory 약간 증가)
RCU                         0 (memory 더 증가)
```

```text
연산 비용
naive CAS                   1 CAS
tagged CAS (16-bit packed)  1 CAS (같은 비용)
tagged CAS (128-bit DCAS)   1 CMPXCHG16B (1.5x cycle)
hazard pointer              1 atomic store + 1 load + 1 CAS (3x)
RCU                         거의 0 (reader)
```

성능만 보면 packed tag가 가장 빠르지만 wraparound 위험이 있습니다. 안전 우선이면 hazard pointer나 RCU입니다.

## 자주 보는 함정

> 16-bit tag wraparound

```cpp
/* 매우 빠른 cycle에서 65536 update면 wraparound */
```

ms 단위 op이면 안전하지만 ns 단위 cycle이면 32-bit 이상 tag가 필요합니다.

> Tag만 증가하고 pointer는 검사 안 함

```cpp
tag++;
if (cur.tag == old.tag) { ... }    /* tag만 비교 — 의미 없음 */
```

CAS 자체가 *pointer + tag*를 한 번에 비교해야 합니다.

> Pointer 상위 비트 가정의 위험

```cpp
/* MTE/PAC 환경에서는 상위 비트가 다른 의미로 사용됨 */
```

ARMv8.5 MTE(Memory Tagging Extension)나 PAC(Pointer Authentication Code) 환경에서는 상위 비트가 다른 용도로 쓰입니다. binary가 그런 환경에서 돈다면 packed tag는 위험합니다.

> Hazard pointer + CAS 누락

```cpp
my_hp.store(cur);
/* 재확인 없이 사용 — race */
```

publish 후 재확인이 반드시 필요합니다.

> CAS 한 번으로 묶지 않음

```cpp
ptr.compare_exchange(...);
version.fetch_add(1);    /* 두 atomic — 일관성 깨짐 */
```

DCAS 또는 packed가 가능한 architecture가 아니면 hazard pointer/RCU로 우회합니다.

## 정리

- ABA는 CAS가 *값이 같지만 의미가 다른* 상황을 구별 못하는 문제입니다.
- 해결은 tag, version, hazard pointer, RCU 네 가지입니다.
- ARM64/x86-64에서 16-bit packed tag가 가장 가벼우나 wraparound 위험이 있습니다.
- 128-bit DCAS (`CMPXCHG16B`, `LDAXP/STLXP`)가 가장 안전한 tag 방식입니다.
- Hazard pointer와 RCU는 free 자체를 지연해 ABA를 근본 해결합니다.
- MTE/PAC 환경에서는 packed pointer가 안전하지 않을 수 있습니다.
- Lock-free 자료구조 모두 ABA 처리 전략이 명시되어야 합니다.

다음 편은 **False sharing 해결**입니다.

## 관련 항목

- [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)
- [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
- [ECPP 4-04: Lock-Free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
