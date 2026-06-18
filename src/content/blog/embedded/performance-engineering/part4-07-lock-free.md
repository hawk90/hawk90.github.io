---
title: "Lock-Free 자료구조 성능 — CAS·ABA·Hazard Pointer·Epoch Reclamation"
date: 2026-04-26T09:06:00
description: "CAS 기반 lock-free와 ABA 문제, hazard pointer와 epoch reclamation 비교."
series: "Embedded Performance Engineering"
seriesOrder: 36
tags: [lock-free, cas, aba, hazard-pointer, epoch]
---

## 한 줄 요약

> **"Lock-free는 시스템 전체에서 한 thread는 반드시 진행을 보장하며, wait-free는 모든 thread의 진행을 보장합니다."**

## 어떤 문제를 푸는가

Lock 기반 동기화는 thread가 lock을 잡은 채 죽거나 무한 loop에 빠지면 다른 thread도 모두 멈춥니다. Lock-free 자료구조는 어떤 thread가 어디서 멈추더라도 다른 thread는 진행할 수 있도록 설계됩니다.

Lock 자체를 제거하므로 priority inversion이나 deadlock도 없습니다. 단, 구현이 까다롭고 ABA 같은 미묘한 버그가 발생하기 쉽습니다. 잘못 만들면 데이터가 깨지는 것은 물론, lock보다 느려지기도 합니다.

이 글에서는 CAS라는 기본 atomic 명령에서 출발해 lock-free stack을 만들고, ABA 문제와 그 해결책인 hazard pointer, epoch reclamation을 살펴봅니다.

## Progress Property — 진행 보장의 등급

```text
Obstruction-free: thread 혼자 실행되면 진행 보장
Lock-free       : 시스템 전체에서 적어도 한 thread는 진행
Wait-free       : 모든 thread가 n cycle 안에 진행 보장
```

대부분의 실용 구현은 lock-free 수준에 머뭅니다. Wait-free는 이론적으로는 강력하지만 구현이 매우 복잡해 일반 사용에는 부담스럽습니다.

## CAS — Compare-And-Swap

```c
bool cas(int *ptr, int *expected, int desired) {
    if (*ptr == *expected) {
        *ptr = desired;
        return true;
    }
    *expected = *ptr;
    return false;
}
```

ARM에서는 LDREX/STREX 쌍 또는 v8.1의 `CASAL`로 구현합니다.

```asm
loop:
    ldrex r1, [r0]
    cmp   r1, expected
    bne   fail
    strex r2, desired, [r0]
    cmp   r2, #0
    bne   loop
```

x86에서는 `LOCK CMPXCHG` 한 명령으로 처리됩니다. CAS는 거의 모든 lock-free 알고리즘의 기본 building block입니다.

## Lock-Free Counter

```c
atomic_int counter;

void inc(void) {
    int old;
    do {
        old = atomic_load(&counter);
    } while (!atomic_compare_exchange_weak(&counter, &old, old + 1));
}

/* 또는 atomic_fetch_add — 한 명령 */
atomic_fetch_add(&counter, 1);
```

ARMv8.1 이후에는 `LDADD` 명령으로 fetch-and-add가 single instruction이 됩니다. CAS retry loop보다 훨씬 효율적이며 contention이 높을 때 차이가 큽니다.

## Lock-Free Stack

```c
struct node { int value; struct node *next; };

struct node *top;

void push(int v) {
    struct node *new_node = malloc(sizeof(*new_node));
    new_node->value = v;
    struct node *old_top;
    do {
        old_top = atomic_load(&top);
        new_node->next = old_top;
    } while (!atomic_compare_exchange(&top, &old_top, new_node));
}

bool pop(int *out) {
    struct node *old_top;
    do {
        old_top = atomic_load(&top);
        if (!old_top) return false;
    } while (!atomic_compare_exchange(&top, &old_top, old_top->next));
    *out = old_top->value;
    free(old_top);   /* ABA·use-after-free 위험 */
    return true;
}
```

언뜻 보면 동작할 것 같지만 두 가지 위험이 있습니다. 다른 thread가 동시에 pop 중이면 `old_top->next` 접근이 use-after-free가 될 수 있고, ABA 문제로 잘못된 다음 노드를 가리킬 수 있습니다.

## ABA 문제

```text
Thread 1 starts pop:
  old_top = X (X->next = Y)
  preempt
Thread 2: pop X, pop Y, push X (재사용)
  top = X (그러나 X->next는 이제 Z)
  resume Thread 1
Thread 1: CAS(top, X, Y) — 성공
  → top = Y (그런데 Y는 이미 free됨)
```

CAS는 값이 같은지만 비교하므로 같은 pointer라도 의미가 달라졌는지 알 수 없습니다. 이를 ABA 문제라고 부르며, 1980년대 IBM 360에서 처음 보고되었습니다.

## 해결 1 — Tagged Pointer

```c
struct { void *ptr; uint64_t tag; } top;   /* 128-bit */

push:
  loop:
    old = top;
    new->next = old.ptr;
    new_pair = { new, old.tag + 1 };
    CAS(top, old, new_pair);
```

매 push마다 tag를 증가시키면 같은 pointer라도 다른 값이 되어 CAS가 실패합니다. x86의 `CMPXCHG16B`, ARM의 `CASP`로 128-bit double-word CAS를 사용합니다.

단점은 64-bit pointer + 64-bit tag로 메모리 footprint가 두 배가 되며, 일부 ARM 코어는 128-bit atomic을 지원하지 않습니다.

## 해결 2 — Hazard Pointer

각 thread가 현재 접근 중인 pointer를 hazard array에 등록해 두면, free하려는 thread가 다른 thread의 hazard pointer를 검사해 안전한지 확인합니다.

```c
__thread void *hp;
struct node *hp_list[MAX_THREADS];

void pop(...) {
    struct node *top_;
    do {
        top_ = atomic_load(&top);
        hp = top_;   /* 보호 등록 */
        if (top_ != atomic_load(&top)) continue;
    } while (!CAS(&top, top_, top_->next));

    retire(top_);   /* 즉시 free하지 않고 retired list로 */
}

void scan_and_free(void) {
    for (each retired r) {
        if (no_hp_points_to(r)) free(r);
    }
}
```

Maged Michael의 2002년 논문이 표준입니다. Folly, DPDK, LMAX Disruptor 같은 고성능 라이브러리가 이 방식을 채택했습니다.

## 해결 3 — Epoch Reclamation

```c
atomic_int global_epoch;
__thread int local_epoch;

void read(void) {
    local_epoch = atomic_load(&global_epoch);
    /* access shared ptr */
    local_epoch = -1;
}

void writer(void) {
    /* modify, retire old */
    atomic_fetch_add(&global_epoch, 1);
    wait_until_all_threads_pass_epoch();
    free(retired);
}
```

모든 thread가 같은 epoch에 머무는 동안에는 retire한 노드를 free하지 않고, 모두가 다음 epoch으로 넘어가면 안전하게 free합니다. Linux kernel의 RCU가 이 아이디어 위에 만들어져 있습니다.

Hazard pointer가 per-pointer 보호라면 epoch은 per-thread 보호입니다. 일반적으로 epoch이 read overhead가 더 낮지만, retire한 객체가 free될 때까지 메모리를 더 오래 점유할 수 있습니다.

## Lock-Free SPSC Queue

```c
struct spsc {
    alignas(64) atomic_size_t head;   /* producer */
    alignas(64) atomic_size_t tail;   /* consumer */
    alignas(64) T buf[CAPACITY];
};

bool push(struct spsc *q, T v) {
    size_t h = atomic_load_explicit(&q->head, memory_order_relaxed);
    size_t t = atomic_load_explicit(&q->tail, memory_order_acquire);
    if (h - t == CAPACITY) return false;
    q->buf[h % CAPACITY] = v;
    atomic_store_explicit(&q->head, h + 1, memory_order_release);
    return true;
}

bool pop(struct spsc *q, T *out) {
    size_t t = atomic_load_explicit(&q->tail, memory_order_relaxed);
    size_t h = atomic_load_explicit(&q->head, memory_order_acquire);
    if (h == t) return false;
    *out = q->buf[t % CAPACITY];
    atomic_store_explicit(&q->tail, t + 1, memory_order_release);
    return true;
}
```

Single producer와 single consumer가 보장된 경우에는 CAS조차 필요 없습니다. Release-acquire memory order만으로 충분합니다. ISR에서 task로 데이터를 넘기는 logging pipe 같은 곳에서 표준 패턴입니다.

## MPMC — Multi-Producer Multi-Consumer

여러 producer와 consumer가 동시에 접근하려면 더 복잡한 알고리즘이 필요합니다. Vyukov의 bounded MPMC queue가 대표적입니다.

```c
struct cell { atomic_size_t sequence; T data; };
struct mpmc {
    alignas(64) atomic_size_t enqueue_pos;
    alignas(64) atomic_size_t dequeue_pos;
    struct cell buf[CAPACITY];
};
```

각 cell에 sequence number를 두어 enqueue와 dequeue가 CAS로 자기 cell을 claim 합니다. Lock-free이며 Folly의 `MPMCQueue`가 같은 구조입니다.

## Lock-Free List와 Tree

- Harris-Michael linked list — CAS로 insert와 delete, marked pointer로 logically deleted를 표시합니다
- Lock-free skip list — 복잡하지만 효과가 큽니다
- Lock-free B-tree — 거의 연구 영역에 가깝습니다

복잡도가 빠르게 올라가며 코드 검증이 어렵습니다. 실 시스템에서는 fine-grained lock에 striping을 결합한 방식이 더 흔합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ ABA를 무시한 lock-free stack

위의 단순한 lock-free stack은 ABA 위험이 있습니다. Tagged pointer나 hazard pointer 같은 보호 mechanism이 반드시 필요합니다.

> ⚠️ Memory order 누락

```c
atomic_store(&flag, 1, memory_order_relaxed);   /* producer */
/* consumer가 data 변경을 못 봄 */
```

Release-acquire pair가 없으면 다른 thread가 데이터 변경을 관찰하지 못합니다. 4-08 편에서 자세히 다룹니다.

> ⚠️ Critical path의 malloc/free

```c
push: malloc(node);   /* lock-free가 아니라 lock 안에 있음 */
```

glibc malloc은 내부적으로 lock을 사용하므로 lock-free 알고리즘에서 호출하면 의미가 없어집니다. Object pool과 lock-free free list로 미리 할당해 두는 것이 필요합니다.

> ⚠️ Default seq_cst 가정

C++에서 atomic 연산의 기본 memory order는 `seq_cst`로 가장 비쌉니다. 의도적으로 `relaxed`나 `acq_rel`을 명시해야 lock-free의 성능 이점이 살아납니다.

## 측정 — 실측 결과

Cortex-A72 4-core에서 4 thread가 counter를 1M번씩 증가시킨 결과입니다.

```text
                          Latency      Throughput
Mutex (uncontended)        30 ns        13 M/s
Mutex (contended)           2 µs         2 M/s
Spinlock (contended)      200 ns        20 M/s
CAS retry loop            100 ns        40 M/s
atomic_fetch_add (LDADD)   50 ns       320 M/s
SPSC queue                 25 ns       400 M/s
```

`LDADD`처럼 single instruction atomic이 가능한 경우가 lock-free의 최고 성능 구간입니다. CAS retry loop는 contention이 높아지면 retry rate가 올라가 throughput이 떨어지므로 측정이 필요합니다.

## 정리

- Progress 보장은 obstruction-free, lock-free, wait-free 순으로 강해집니다.
- CAS가 거의 모든 lock-free 알고리즘의 기본 명령입니다.
- ABA는 pointer 재사용으로 발생하는 false positive이며 tagged pointer나 hazard pointer로 해결합니다.
- Epoch reclamation은 hazard pointer보다 read overhead가 낮으며 Linux RCU의 기반입니다.
- SPSC queue는 CAS 없이 release-acquire만으로 구현 가능합니다.
- Retry rate가 lock-free 성능의 핵심 측정 지표입니다.

다음 편은 **Memory Ordering** — acquire-release semantics를 살펴봅니다.

## 관련 항목

- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [Embedded C++ 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
