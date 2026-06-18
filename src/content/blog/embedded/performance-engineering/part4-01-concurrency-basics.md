---
title: "Concurrency 기초 — Concurrency vs Parallelism·Race·Memory Model"
date: 2026-04-26T09:00:00
description: "Concurrency vs Parallelism (Rob Pike). Race condition. Memory model 도입."
series: "Embedded Performance Engineering"
seriesOrder: 30
tags: [concurrency, parallel, race, memory-model]
draft: false
---

## 한 줄 요약

> **"Concurrency는 처리할 일들의 조직이고, Parallelism은 동시 실행"** 이라는 Rob Pike의 정의가 출발점입니다.

## Concurrency vs Parallelism

![Concurrency vs Parallelism — single core time-slicing과 multi-core 동시 실행 비교](/images/blog/perf-eng/diagrams/part4-01-concurrency.svg)

단일 코어 RTOS는 concurrency만 제공하고, SMP Linux는 둘 다 제공합니다.

## Race Condition — 정의

여러 thread가 순서 보장 없이 공유 자원에 접근하는 상황을 race condition이라 합니다.

```c
int counter = 0;

void task1(void) { counter++; }   // RMW: read, add 1, write
void task2(void) { counter++; }
```

가능한 결과:

```text
Thread 1            Thread 2          counter
read 0
                    read 0
add → 1
                    add → 1
write 1
                    write 1            ← 1 (잘못! 2여야)
```

`counter++`는 실제로는 3개의 명령으로 나뉘기 때문에, 중간에 인터럽트가 들어올 수 있습니다.

## Atomic

```c
#include <stdatomic.h>

atomic_int counter = 0;
atomic_fetch_add(&counter, 1);   // 원자적
```

Hardware 지원으로는 ARM의 `LDREX/STREX`와 x86의 `LOCK XADD`가 대표적입니다.

```asm
; ARM atomic add
1: ldrex r0, [r1]
   add r0, r0, #1
   strex r2, r0, [r1]
   cbnz r2, 1b   ; STREX 실패 (다른 thread가 끼어듦) → retry
```

## Memory Model — 왜 필요한가

```c
/* Thread 1 */
x = 1;
y = 1;

/* Thread 2 */
if (y == 1)
    assert(x == 1);   // ← 항상 참? OoO·cache 때문에 *아닐 수 있음*
```

CPU와 컴파일러가 명령을 재정렬할 수 있기 때문에, Thread 2가 y=1을 보고도 x=0을 볼 가능성이 생깁니다.

**Memory model**은 어떤 재정렬이 허용되는지를 정의합니다.

## ARM Memory Model — Weak

```text
ARMv7/v8: weakly ordered
  Load → Load: 재정렬 OK
  Load → Store: 재정렬 OK
  Store → Load: 재정렬 OK
  Store → Store: 재정렬 OK
```

explicit barrier 없이는 어떤 순서도 보장되지 않습니다.

```c
__DMB();   // 이전 access 모두 완료 보장
```

## x86 Memory Model — Strong

**x86 (TSO — Total Store Order):**

- Load → Load: in order
- Store → Store: in order
- Load → Store: in order
- Store → Load: *재정렬 가능* (store buffer)

x86은 약한 재정렬만 허용해서 거의 sequential에 가깝지만, ARM과 POWER는 훨씬 자유롭게 재정렬됩니다.

## C11/C++11 Atomic — Memory Order

```c
atomic_store_explicit(&x, 1, memory_order_release);
int v = atomic_load_explicit(&y, memory_order_acquire);
```

| Order | 의미 | 비용 |
|---|---|---|
| `relaxed` | 순서 무관 atomic | 가장 싸다 |
| `consume` | data dependency만 (사실상 deprecated) | — |
| `acquire` | read 후 access 재정렬 금지 | 보통 |
| `release` | write 전 access 재정렬 금지 | 보통 |
| `acq_rel` | both | 보통 |
| `seq_cst` | 모든 thread 같은 순서 (sequential consistency) | 비쌈 |

기본값은 `seq_cst`이고, 안전한 대신 가장 느립니다.

## Acquire-Release Pattern

```c
/* Producer */
data = 42;
atomic_store_explicit(&ready, 1, memory_order_release);

/* Consumer */
if (atomic_load_explicit(&ready, memory_order_acquire) == 1) {
    use(data);   // ← data = 42 보장
}
```

Release는 write barrier 역할을, acquire는 read barrier 역할을 합니다. 가장 흔한 lock-free 패턴입니다.

## Sequential Consistency vs Acquire-Release

```c
/* Thread 1 */
x.store(1, seq_cst);
r1 = y.load(seq_cst);

/* Thread 2 */
y.store(1, seq_cst);
r2 = x.load(seq_cst);

/* seq_cst: r1==0 && r2==0 *불가* */
/* acq_rel: r1==0 && r2==0 *가능* — 양쪽 store가 다른 thread에 *다른 순서*로 보임 */
```

Sequential consistency는 모든 thread가 같은 글로벌 순서를 보게 만드는 모델입니다.

## ARM·POWER에서 SC 비용

```text
ARM: seq_cst store → DMB ISH 명령 추가 (~30 cycle)
     release store → 더 가벼움 (~5 cycle)

Linux kernel — 대부분 release/acquire 사용.
```

## DMB·DSB·ISB

```c
__DMB();   // Data Memory Barrier — memory access ordering
__DSB();   // Data Sync Barrier — *모든* access *완료*까지 대기
__ISB();   // Instruction Sync Barrier — pipeline flush, instruction refetch
```

`DMB`는 atomic과 lock에 사용합니다.
`DSB`는 clock enable이나 MPU 변경 후에 사용합니다.
`ISB`는 self-modifying code나 mode change 시점에 사용합니다.

## Concurrent Data Structure

### Lock-based

```c
xSemaphoreTake(mtx, ...);
queue.push(item);
xSemaphoreGive(mtx);
```

### Lock-free

```c
/* SPSC (single-producer single-consumer) queue */
atomic_size_t head, tail;

bool push(T item) {
    size_t h = atomic_load_explicit(&head, memory_order_relaxed);
    size_t t = atomic_load_explicit(&tail, memory_order_acquire);
    if (h - t == CAPACITY) return false;
    buf[h % CAPACITY] = item;
    atomic_store_explicit(&head, h + 1, memory_order_release);
    return true;
}
```

Producer와 consumer가 분리되어 있는 경우에는 lock 없이도 안전하게 동작하므로, 더 빠릅니다.

## False Sharing — 다음 편 주제

```c
struct {
    atomic_int a;   // CPU 0 사용
    atomic_int b;   // CPU 1 사용
} stats;
```

같은 cache line에 있으면 update가 일어날 때마다 다른 CPU의 cache를 invalidate시켜 100배까지 느려질 수 있습니다.

## ABA Problem

```c
/* Lock-free stack */
T* top;

pop():
    T* old = top;            // read top = X
    /* preempt — 누군가 X pop, Y push, X 다시 push */
    /* top = X 다시 (그러나 next 다름) */
    cas(&top, old, old->next);  // ← 성공! 그러나 잘못된 next
```

해결책으로는 **tagged pointer** (top + version) 또는 hazard pointer를 사용합니다.

## 자주 하는 실수

> ⚠️ `volatile`로 atomic 가정

```c
volatile int counter;
counter++;   // ← 여전히 RMW, atomic 아님
```

`volatile`은 컴파일러의 최적화를 차단할 뿐이고, atomic은 그것과 별개입니다.

> ⚠️ Lock-free가 항상 빠름

작은 데이터에 낮은 contention 상황에서는 lock과 비슷하거나 오히려 더 느립니다. CAS retry overhead 때문입니다.

> ⚠️ Memory order 무시

```c
atomic_store(&flag, 1);    // default seq_cst → 비쌈
atomic_load(&flag);         // seq_cst → barrier
```

실제로는 `memory_order_release/acquire`만으로 충분한 경우가 많습니다.

> ⚠️ Race condition은 *희박해서 무시*

```text
Race가 1M 중 1회 발생 → 1 day in production → bug
```

UI bug보다 훨씬 무섭습니다. 재현이 되지 않기 때문입니다.

## 정리

- **Concurrency는 조직이고, Parallelism은 동시 실행**입니다.
- Race condition은 atomic과 memory order의 조합으로 해결합니다.
- ARM과 POWER는 **weak memory model**이라 explicit barrier가 필요합니다.
- x86은 TSO 모델이라 거의 strong에 가깝습니다.
- C11의 `memory_order_*`는 상황에 맞게 정확히 선택해야 합니다.
- Acquire-release가 *seq_cst*보다 가볍고 충분한 경우가 많습니다.

다음 편은 **False Sharing**을 다룹니다.

## 관련 항목

- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
