---
title: "4-08: Memory Ordering — Acquire·Release·Seq-Cst·ARM Relaxed Model"
date: 2026-05-08T17:00:00
description: "C11/C++11 memory_order. Acquire-release pair. Seq-cst 비용. ARM ldar/stlr."
series: "Embedded Performance Engineering"
seriesOrder: 36
tags: [memory-ordering, acquire, release, seq-cst, ldar]
draft: true
---

## 한 줄 요약

> **"Memory ordering = 다른 thread가 access를 어떤 순서로 보나"** — CPU·컴파일러 재정렬 통제.

## C11/C++11 Memory Order

```c
#include <stdatomic.h>

memory_order_relaxed     // 순서 무관, atomic만
memory_order_consume     // dependency만 (deprecated)
memory_order_acquire     // 다음 access 재정렬 금지
memory_order_release     // 이전 access 재정렬 금지
memory_order_acq_rel     // both
memory_order_seq_cst     // 모든 thread 같은 순서
```

## 6 Orders 시각화

```text
relaxed:    A B C atomic operations — 순서 보장 0

acquire:    [load A] | B C ...
                     ↑ 이후 access 위로 못 감

release:    ... B C | [store A]
                    ↑ 이전 access 아래로 못 감

seq_cst:    모든 atomic의 *global total order* 존재
```

## Acquire-Release Pair

```c
/* Producer */
data = compute();
atomic_store_explicit(&ready, true, memory_order_release);

/* Consumer */
if (atomic_load_explicit(&ready, memory_order_acquire)) {
    use(data);   /* data 변경 가시 보장 */
}
```

Release store와 acquire load — *synchronization point* 형성.

## Seq-Cst — Sequential Consistency

```c
/* Dekker's algorithm — seq_cst 필요 */
atomic_store(&flag1, true, seq_cst);
if (!atomic_load(&flag2, seq_cst)) enter_critical();

atomic_store(&flag2, true, seq_cst);
if (!atomic_load(&flag1, seq_cst)) enter_critical();
```

Acquire-release만으로는 *위 알고리즘 깨짐* — 두 thread 모두 enter 가능.

Seq-cst — 모든 thread가 *동일한 글로벌 순서*. 비싼 만큼 확실.

## ARM 명령

| Operation | order | 명령 |
|---|---|---|
| `load relaxed` | — | `LDR` |
| `load acquire` | acquire | `LDAR` (ARMv8) |
| `store relaxed` | — | `STR` |
| `store release` | release | `STLR` (ARMv8) |
| `load seq_cst` | seq_cst | `LDAR` (ARMv8) |
| `store seq_cst` | seq_cst | `STLR` (ARMv8) + barrier |
| CAS | varies | `CASAL`·`CAS` (ARMv8.1+) |

`LDAR`/`STLR` — atomic + half-fence in *one instruction*. ARMv8의 효율 핵심.

## DMB·DSB·ISB

```c
__DMB();    /* Data Memory Barrier */
__DSB();    /* Data Sync Barrier */
__ISB();    /* Instruction Sync */
```

| Barrier | 의미 | 사용 |
|---|---|---|
| `DMB` | 이전 memory access *완료 후* 이후 access | acquire/release 보강 |
| `DSB` | 모든 memory + 그 후의 명령 *완료* 대기 | clock·MPU 변경 |
| `ISB` | pipeline flush + instruction refetch | self-modifying code |

ARMv7 — atomic + DMB 조합. ARMv8 — LDAR/STLR 단일.

## DMB Variant

```c
__DMB();         /* Full system */
__DMB_ISH();     /* Inner Shareable — multi-core same cluster */
__DMB_NSH();     /* Non-shareable — same CPU */
__DMB_OSH();     /* Outer Shareable — across clusters */
```

좁은 scope일수록 *빠름*. SMP cluster 안만 영향 — `ISH` 충분.

## x86 vs ARM Cost

```text
x86 (strong):
  - Load: 자동 acquire (1 cycle)
  - Store: 자동 release (1 cycle)
  - seq_cst store: MFENCE 추가 (~10 cycle)
  - CAS: LOCK CMPXCHG (~20 cycle)

ARM (weak):
  - Load relaxed: 1 cycle
  - LDAR (acquire): ~5 cycle
  - STLR (release): ~5 cycle
  - Seq_cst: same as LDAR/STLR (~5 cycle)
  - DMB ISH: ~20-50 cycle
```

ARM은 *명시적으로* acquire/release 사용 → 비용 인지.

## Release-Consume Pattern (deprecated)

```c
/* Consumer */
ptr = atomic_load_explicit(&shared, memory_order_consume);
use(ptr->field);   /* dependency ordering — pointer dependency만 */
```

`consume` — `acquire`보다 *가벼움* (data dependency only).

문제 — 컴파일러 구현 어려움 → *대부분 acquire로 fallback*. C++17 deprecated.

## Lock-Free Queue 적용

```c
/* SPSC push */
data[h] = value;
atomic_store_explicit(&head, h + 1, memory_order_release);
                                    /* ← data write 보장 */

/* SPSC pop */
size_t h = atomic_load_explicit(&head, memory_order_acquire);
                                    /* ← data read 위에 옴 */
return data[t];
```

Release-acquire pair — *seq_cst 불필요*.

## Linux Kernel — smp_rmb·smp_wmb

```c
smp_rmb();   /* read memory barrier */
smp_wmb();   /* write memory barrier */
smp_mb();    /* full barrier */
```

Linux의 wrapper — architecture별 적절 명령 emit.

`smp_load_acquire(p)`·`smp_store_release(p, v)` — modern style.

## Embedded Cortex-M — Single Core

```text
Cortex-M3/4 — single core, memory ordering 거의 무의미
  - DMB는 *DMA·MMIO와의 ordering*에 필요
  - Atomic만 atomic, ordering은 자연 sequential
```

```c
/* DMA buffer 준비 후 시작 */
fill_buf();
__DMB();   /* memory write 완료 */
DMA->CR = DMA_START;
```

## Cortex-M55+ Dual-Core·Cluster — Ordering 필요

```c
/* Core 0 → Core 1 통신 */
atomic_store_explicit(&shared, value, memory_order_release);

/* Core 1 */
val = atomic_load_explicit(&shared, memory_order_acquire);
```

Dual-core Cortex-M (RP2040 Cortex-M0+ 2개) — *cross-core* memory ordering 적용.

## 자주 하는 실수

> ⚠️ Volatile = atomic 가정

```c
volatile int x;
x++;   /* ← read-modify-write, atomic 아님 */
```

`volatile`은 컴파일러용. Ordering·atomicity 별도.

> ⚠️ Default seq_cst 사용 (성능 의도 무시)

```c
atomic_int counter = 0;
counter++;   /* default seq_cst — 비쌈 */
```

`memory_order_relaxed`로 충분한 경우 많음 (counter 누적 등).

> ⚠️ Acquire 또는 release만

```c
atomic_store(&flag, 1, memory_order_acquire);   /* ← invalid for store */
```

Store는 release만, load는 acquire만. (acq_rel는 RMW에서만 의미).

> ⚠️ Barrier만 추가

```c
*ptr_a = 1;
__DMB();
*ptr_b = 1;
```

Barrier는 *이미 store된 access* 순서만 — *비atomic 변수*는 race 위험.

## 정리

- `memory_order_*` — **relaxed·acquire·release·seq_cst**.
- **Acquire-release pair**가 가장 흔한 lock-free 패턴.
- Seq-cst는 *Dekker's·peterson's*에 필요 — 비쌈.
- ARMv8 `LDAR`·`STLR` = 효율적 acquire·release.
- DMB `ISH`로 cluster 내 ordering.
- Cortex-M 단일 core — DMB는 MMIO·DMA용.

다음 편은 **Cache Coherency**.

## 관련 항목

- [4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
