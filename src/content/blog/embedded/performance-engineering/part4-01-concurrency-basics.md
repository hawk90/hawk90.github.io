---
title: "4-01: Concurrency 기초 — Concurrency vs Parallelism·Race·Memory Model"
date: 2026-05-08T10:00:00
description: "Concurrency vs Parallelism (Rob Pike). Race condition. Memory model 도입."
series: "Embedded Performance Engineering"
seriesOrder: 29
tags: [concurrency, parallel, race, memory-model]
draft: true
---

## 한 줄 요약

> **"Concurrency = 처리할 일들의 조직, Parallelism = 동시 실행"** — Rob Pike.

## Concurrency vs Parallelism

```text
Concurrency — 여러 일을 *동시 진행 중*으로 보이게 (한 코어로도 가능)
Parallelism — 정말 *동시 실행* (multi-core 필요)
```

```text
Single core + concurrency:
  Time → [Task A]──[Task B]──[Task A]──[Task C]──[Task B]
         time-slice context switch
         
Multi-core + parallelism:
  Core 0: [Task A continuous]
  Core 1: [Task B continuous]
  Core 2: [Task C continuous]
```

RTOS 단일 코어 = concurrency only. SMP Linux = both.

## Race Condition — 정의

**여러 thread가 *순서 보장 없이* 공유 자원 access**.

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

`counter++` = *3 명령* → 중간 인터럽트 가능.

## Atomic

```c
#include <stdatomic.h>

atomic_int counter = 0;
atomic_fetch_add(&counter, 1);   // 원자적
```

Hardware 지원 — ARM `LDREX/STREX`, x86 `LOCK XADD`.

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

CPU·컴파일러가 *명령 재정렬* → Thread 2가 y=1 보고 x=0 본 가능.

**Memory model** = 어떤 재정렬이 허용되는지 *정의*.

## ARM Memory Model — Weak

```text
ARMv7/v8: weakly ordered
  Load → Load: 재정렬 OK
  Load → Store: 재정렬 OK
  Store → Load: 재정렬 OK
  Store → Store: 재정렬 OK
```

→ explicit barrier 없이는 *순서 보장 없음*.

```c
__DMB();   // 이전 access 모두 완료 보장
```

## x86 Memory Model — Strong

```text
x86 (TSO — Total Store Order):
  Load → Load: in order
  Store → Store: in order
  Load → Store: in order
  Store → Load: *재정렬 가능* (store buffer)
```

x86은 약한 재정렬만 — 거의 sequential. ARM·POWER는 *훨씬 자유*.

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

Default = `seq_cst` (안전, 느림).

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

Release가 *write barrier*, acquire가 *read barrier*. 가장 흔한 lock-free 패턴.

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

Sequential consistency = 모든 thread가 *같은 글로벌 순서* 봄.

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

`DMB` — atomic·lock에 사용.
`DSB` — clock enable, MPU 변경 후.
`ISB` — self-modifying code, mode change.

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

Producer·consumer 분리된 경우 — lock 없이 가능. 더 빠름.

## False Sharing — 다음 편 주제

```c
struct {
    atomic_int a;   // CPU 0 사용
    atomic_int b;   // CPU 1 사용
} stats;
```

같은 cache line — 매 update가 *다른 CPU cache invalidate* → 100x slowdown.

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

해결 — **tagged pointer** (top + version) 또는 *hazard pointer*.

## 자주 하는 실수

> ⚠️ `volatile`로 atomic 가정

```c
volatile int counter;
counter++;   // ← 여전히 RMW, atomic 아님
```

`volatile` = 컴파일러 차단만. Atomic은 *별도*.

> ⚠️ Lock-free가 항상 빠름

작은 데이터·낮은 contention — lock보다 *비슷 또는 더 느림*. CAS retry overhead.

> ⚠️ Memory order 무시

```c
atomic_store(&flag, 1);    // default seq_cst → 비쌈
atomic_load(&flag);         // seq_cst → barrier
```

→ `memory_order_release/acquire`가 충분한 경우 많음.

> ⚠️ Race condition은 *희박해서 무시*

```text
Race가 1M 중 1회 발생 → 1 day in production → bug
```

UI bug보다 무서움 — *재현 안 됨*.

## 정리

- **Concurrency = 조직, Parallelism = 동시 실행**.
- Race condition은 *atomic + memory order*로 해결.
- ARM·POWER = **weak memory model** — explicit barrier 필요.
- x86 = TSO (거의 strong).
- C11 `memory_order_*` 정확히 선택.
- Acquire-release가 *seq_cst*보다 *가볍고 충분*한 경우 많음.

다음 편은 **False Sharing**.

## 관련 항목

- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
