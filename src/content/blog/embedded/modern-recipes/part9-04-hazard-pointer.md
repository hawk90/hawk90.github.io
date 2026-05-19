---
title: "9-04: Hazard Pointer"
date: 2026-05-16T08:00:00
description: "Lock-free 메모리 회수, ABA 회피, RCU와의 비교, C++ proposal까지 hazard pointer의 원리와 구현을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 104
tags: [recipes, concurrency, hazard-pointer]
---

## 한 줄 요약

> **"Hazard pointer는 reader가 *내가 지금 이 객체 쓰는 중*을 광고하는 표지판입니다."** Writer는 그 표지판이 가리키지 않는 객체만 free합니다.

## 어떤 상황에서 쓰나

Lock-free queue, stack, hash table을 만들 때 가장 큰 문제는 *언제 free할 수 있는가*입니다. 한 thread가 node를 막 dereference하기 직전, 다른 thread가 그 node를 dequeue하고 free하면 use-after-free가 발생합니다.

RCU가 grace period로 같은 문제를 풉니다. 차이는 *bounded vs unbounded memory*입니다. RCU는 grace period가 길어지면 메모리가 계속 쌓일 수 있지만, hazard pointer는 retired list 길이를 thread 수에 비례한 상한으로 잡습니다.

C++26에서 표준 라이브러리(`std::hazard_pointer`)에 들어올 예정입니다.

## 핵심 개념

```text
hazard pointer       각 thread가 "지금 보호 중인 pointer"를 공개
retired list         삭제 예정 객체들의 thread-local 모음
scan                 retired list 처리 시점에 모든 thread의 hazard pointer를 확인
```

기본 흐름입니다.

```text
reader
1. p = atomic_load(&head)
2. publish: my_hp = p
3. p가 여전히 head인지 재확인 (re-validate)
4. p를 안전하게 사용
5. my_hp = NULL

writer
1. old = atomic_exchange(&head, new)
2. retire(old)        /* free 즉시 X, retired list에 추가 */
3. retired list 크기가 임계 초과 시 scan
4. scan에서 어느 thread의 hp도 가리키지 않는 항목만 free
```

RCU와 비교하면 다음과 같습니다.

```text
                 RCU                  Hazard Pointer
reader cost     ~0 (preempt disable)  atomic store + reload
writer cost     grace period 대기      retired list scan
memory bound    grace period에 의존    O(thread 수)
sleep in reader 금지 (전통적)         가능
C++ 표준        없음                   C++26 std::hazard_pointer
```

## 코드 / 실제 사용 예

### 최소 hazard pointer

```cpp
#include <atomic>
#include <thread>
#include <vector>

static thread_local std::atomic<void *> my_hp{nullptr};

template <typename T>
T *acquire(std::atomic<T *> *src) {
    T *p;
    do {
        p = src->load(std::memory_order_acquire);
        my_hp.store(p, std::memory_order_release);
    } while (src->load(std::memory_order_acquire) != p);   /* 재확인 */
    return p;
}

void release(void) {
    my_hp.store(nullptr, std::memory_order_release);
}
```

publish 후 한 번 더 load해서 *내가 본 pointer가 아직 같은지*를 확인합니다. 그래야 publish와 동시에 일어난 변경이 안전하게 발견됩니다.

### Reader 사용

```cpp
struct node { std::atomic<node *> next; int val; };
std::atomic<node *> head;

int reader(void) {
    node *n = acquire(&head);
    if (!n) { release(); return 0; }
    int v = n->val;
    release();
    return v;
}
```

`acquire` ~ `release` 사이에서만 `n`을 안전하게 dereference할 수 있습니다.

### Writer + retire

```cpp
std::vector<node *> retired;

void retire(node *n) {
    retired.push_back(n);
    if (retired.size() >= 64) scan();
}

void scan(void) {
    /* 모든 thread의 hazard pointer 수집 */
    std::vector<void *> hps;
    for (auto *thread_hp : all_hps())
        if (auto *p = thread_hp->load()) hps.push_back(p);

    std::sort(hps.begin(), hps.end());

    std::vector<node *> still_retired;
    for (auto *n : retired) {
        if (std::binary_search(hps.begin(), hps.end(), n))
            still_retired.push_back(n);     /* 누군가 보고 있음 */
        else
            delete n;                        /* 안전하게 free */
    }
    retired = std::move(still_retired);
}
```

`scan`은 retired list가 임계를 넘을 때만 호출합니다. retire 자체는 O(1)입니다.

### Multiple hazard pointers per thread

```cpp
static thread_local std::array<std::atomic<void *>, 4> my_hps;

template <typename T>
T *acquire_at(std::atomic<T *> *src, int slot) {
    T *p;
    do {
        p = src->load();
        my_hps[slot].store(p);
    } while (src->load() != p);
    return p;
}
```

linked list traversal처럼 *현재 + 다음*을 동시에 보호해야 하는 경우 thread당 hazard pointer를 여러 개 둡니다. 보통 thread당 4~8개로 충분합니다.

### Lock-free stack (hazard pointer로 메모리 안전화)

```cpp
struct snode { snode *next; int val; };
std::atomic<snode *> top;

void push(int v) {
    snode *n = new snode{nullptr, v};
    snode *old;
    do {
        old = top.load();
        n->next = old;
    } while (!top.compare_exchange_weak(old, n));
}

int pop(void) {
    snode *old;
    int v = 0;
    while (true) {
        old = acquire(&top);
        if (!old) { release(); return 0; }
        if (top.compare_exchange_weak(old, old->next)) {
            v = old->val;
            release();
            retire(old);    /* 즉시 delete X */
            return v;
        }
        release();
    }
}
```

pop이 `old->next`에 접근하기 직전, 다른 thread가 old를 free하면 사고입니다. hazard pointer가 그 보호를 제공합니다.

### C++26 표준

```cpp
#include <hazard_pointer>     /* C++26 (proposal) */

std::hazard_pointer hp;
node *p = hp.protect(head);
process(p);
hp.reset_protection();

/* writer */
old->retire();    /* 자동 retired list 관리 */
```

C++26부터 표준 라이브러리에 들어와 보일러플레이트가 사라집니다.

## 측정 / 성능 비교

```text
패턴                    reader latency      throughput (8 thread)
spinlock-protected list 200 ns              100 K ops/s
RCU                     10 ns               5 M ops/s
hazard pointer          25 ns               4 M ops/s
```

RCU가 가장 빠르지만 hazard pointer도 매우 좋은 성능을 보입니다.

```text
메모리 bound
RCU                     grace period 비례 (수 ms 동안 retired 쌓임)
hazard pointer          ~thread 수 × retired threshold (bounded)
```

real-time 환경처럼 메모리 상한이 필요한 경우 hazard pointer가 더 안전합니다.

## 자주 보는 함정

> publish 후 재확인 누락

```cpp
p = src->load();
my_hp.store(p);
/* 재확인 안 함 — writer가 동시에 retire 가능 */
return p;
```

publish와 재확인을 모두 해야 race가 닫힙니다. 단순화로 보이지만 race window를 만듭니다.

> Thread-local hazard pointer 등록 누락

```cpp
/* main thread만 hp 슬롯 있음 — 새 thread는 없음 */
std::thread t([](){ acquire(...); });   /* hp 슬롯 없음 */
```

thread join 시점이 아닌 spawn 시점에 hp 슬롯을 할당해야 합니다.

> retire 후 hp 재사용

```cpp
release();
retire(n);
my_hp.store(n);    /* 이미 retired된 n을 다시 보호 — UB */
```

retire된 객체는 해당 thread도 다시 보호하면 안 됩니다.

> scan 빈도 잘못 잡음

```cpp
retire(n);
scan();    /* 매 retire마다 scan — 매우 비쌈 */
```

retired list가 임계(보통 thread 수 × 2)에 도달했을 때만 scan합니다.

> ABA 동시 회피 안 함

```cpp
/* hazard pointer만으로 ABA 해결되지 않음 */
```

hazard pointer는 *use-after-free*를 막을 뿐 ABA는 별도 처리가 필요합니다. tagged pointer를 같이 씁니다.

## 정리

- Hazard pointer는 reader가 보호 중인 pointer를 광고해 writer가 free 시점을 결정합니다.
- RCU와 비교해 memory가 bounded라는 점이 가장 큰 강점입니다.
- thread당 hazard pointer 수는 보통 4~8개로 충분합니다.
- C++26 표준 라이브러리에 들어옵니다(`std::hazard_pointer`).
- publish 후 *재확인*과 *thread-local 등록*이 정확성의 핵심입니다.
- ABA는 별도 처리가 필요합니다(tagged pointer 등).
- writer 메모리 회수가 *bounded*해야 하면 RCU보다 hazard pointer를 우선 고려합니다.

다음 편은 **Compare-And-Swap 패턴**입니다.

## 관련 항목

- [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [ECPP 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [ECPP 4-04: Lock-Free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
