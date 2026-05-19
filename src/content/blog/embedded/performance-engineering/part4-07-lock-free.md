---
title: "4-07: Lock-Free — CAS·ABA·Hazard Pointer·Epoch Reclamation"
date: 2026-05-08T16:00:00
description: "CAS 기반 lock-free. ABA 문제. Hazard pointer, epoch, RCU 비교."
series: "Embedded Performance Engineering"
seriesOrder: 35
tags: [lock-free, cas, aba, hazard-pointer, epoch]
draft: true
---

## 한 줄 요약

> **"Lock-free = 한 thread 보장 진행"** — wait-free는 *모든 thread 보장*.

## Progress Property

```text
- Obstruction-free: thread 혼자면 진행 보장
- Lock-free:        시스템 전체 *한 thread는* 진행
- Wait-free:        *모든 thread* 진행 보장 (n cycle 이내)
```

대부분의 lock-free 구현 — *lock-free* level. Wait-free는 *훨씬 어려움*.

## CAS (Compare-And-Swap)

```c
/* atomic_compare_exchange */
bool cas(int *ptr, int *expected, int desired) {
    if (*ptr == *expected) {
        *ptr = desired;
        return true;
    }
    *expected = *ptr;
    return false;
}
```

ARM `LDREX/STREX` 또는 `CASAL`:

```asm
loop:
    ldrex r1, [r0]        ; load with monitor
    cmp r1, expected
    bne fail
    strex r2, desired, [r0]
    cmp r2, #0
    bne loop              ; STREX 실패 시 retry
```

x86 `CMPXCHG`.

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

ARM `LDADD` (8.1+) — *single instruction atomic add*.

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
    free(old_top);    /* ← ABA·use-after-free 문제 */
    return true;
}
```

`free(old_top)` — 다른 thread가 *동시 pop* 중이면 *use-after-free*.

## ABA Problem

```text
Thread 1 starts pop:
  old_top = X (X->next = Y)
  /* preempt */
Thread 2: pop X, pop Y, push X (재사용)
  top = X (그러나 X->next 변경됨, 예: Z)
  /* resume Thread 1 */
Thread 1: CAS(top, X, Y) — *성공*! 그러나 잘못된 다음 노드
  → top = Y (그런데 Y는 이미 free됨!)
```

CAS는 *value만 비교* — *identity 모름*.

## 해결 1: Tagged Pointer (DCAS)

```c
struct { void *ptr; uint64_t tag; } top;   /* 128-bit */

push:
  loop:
    old = top
    new->next = old.ptr
    new_pair = { new, old.tag + 1 }   /* increment tag */
    CAS(top, old, new_pair)
```

`tag` — push마다 증가 → ABA 검출.

x86 `CMPXCHG16B`, ARM `CASP` (paired CAS).

## 해결 2: Hazard Pointer

각 thread가 *현재 보고 있는 pointer*를 *hazard array*에 등록:

```c
__thread void *hp;   /* per-thread hazard pointer */
struct node *hp_list[MAX_THREADS];   /* 전체 */

void pop(...) {
    struct node *top_;
    do {
        top_ = atomic_load(&top);
        hp = top_;   /* 보호 등록 */
        if (top_ != atomic_load(&top)) continue;   /* 재확인 */
    } while (!CAS(&top, top_, top_->next));
    
    /* 즉시 free 아닌 *retired list*에 */
    retire(top_);
}

void scan_and_free(void) {
    /* 다른 thread의 hp가 가리키지 않는 retired만 free */
    for (each retired r)
        if (no_hp_points_to(r)) free(r);
}
```

Maged Michael (IBM) 1996. 표준 — *Folly·DPDK·LMAX*.

## 해결 3: Epoch Reclamation (RCU와 비슷)

```c
atomic_int global_epoch;
__thread int local_epoch;

void read(void) {
    local_epoch = atomic_load(&global_epoch);
    /* ... access shared ptr ... */
    local_epoch = -1;   /* exit */
}

void writer(void) {
    /* modify, retire old */
    atomic_fetch_add(&global_epoch, 1);
    wait_until_all_threads_pass_epoch();
    free(retired);
}
```

여러 thread 같은 epoch 안 들어가면 — *retire 안전*. Linux RCU의 기반.

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

**Single producer + single consumer** = *CAS 없이* possible. Release-acquire memory order만.

## MPMC (Multi-Producer Multi-Consumer)

```c
/* Vyukov bounded MPMC */
struct cell { atomic_size_t sequence; T data; };
struct mpmc {
    alignas(64) atomic_size_t enqueue_pos;
    alignas(64) atomic_size_t dequeue_pos;
    struct cell buf[CAPACITY];
};
```

각 cell이 *sequence number* — CAS로 enqueue·dequeue 가능. *Lock-free*. Folly 등 표준.

## Lock-Free List·Tree

Linked list:
- **Harris-Michael list** — CAS로 insert·delete, marked pointer로 logically deleted 표시
- Lock-free skip list — 복잡, 그러나 효과 있음
- Lock-free B-tree — 거의 연구 영역

복잡도 ↑ — *코드 검증 어려움*. 실 시스템엔 *lock + fine granularity*가 흔함.

## 비용 — 측정 실측

```text
Workload: 4 thread × 1M counter inc

Mutex (uncontended): 30 ns/op
Mutex (contended):   2 µs/op (block + wake)
Spinlock (contended): 200 ns/op (cache bounce)
Lock-free CAS:        100 ns/op (CAS retry rare)
Lock-free atomic_add: 50 ns/op (ARM LDADD)
```

Lock-free가 *항상 빠른 건 아님* — *retry rate* 측정 필수.

## Wait-Free — 어려움

```c
/* Wait-free queue (Kogan-Petrank 2011) */
/* 매우 복잡 — 일반 사용 어려움 */
```

대부분 lock-free로 충분. Wait-free는 *real-time 보장* 시.

## 자주 하는 실수

> ⚠️ ABA 무시

```c
lock_free_stack stack;
pop();   /* ← ABA로 잘못된 데이터 */
```

→ tagged pointer 또는 hazard pointer.

> ⚠️ Memory order 잘못

```c
atomic_store(&flag, 1, memory_order_relaxed);   /* ← producer */
/* consumer가 data 변경 못 봄 */
```

→ release/acquire pair.

> ⚠️ malloc/free in critical path

```c
push: malloc(node);   /* ← lock-free 아니라 lock 있음! */
```

→ object pool + lock-free free list.

> ⚠️ Lock-free 가정 안 검증

```c
atomic_int x;
x = 1;   /* ← C++에서 default seq_cst, 그러나 알고 있나? */
```

→ memory order 명시.

## 정리

- Progress — obstruction·**lock-free**·wait-free.
- **CAS** (compare-and-swap)이 기반 명령.
- **ABA** = pointer 재사용 시 false positive.
- 해결 — **tagged pointer**·**hazard pointer**·**epoch (RCU)**.
- **SPSC queue**는 CAS 없이 가능.
- 측정 — retry rate가 핵심 지표.

다음 편은 **Memory Ordering**.

## 관련 항목

- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
