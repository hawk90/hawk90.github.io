---
title: "4-08: Memory Ordering — Acquire·Release·Seq-Cst·ARM Relaxed Model"
date: 2026-05-08T17:00:00
description: "C11/C++11 memory_order와 acquire-release pair, seq-cst 비용, ARM ldar/stlr."
series: "Embedded Performance Engineering"
seriesOrder: 36
tags: [memory-ordering, acquire, release, seq-cst, ldar]
---

## 한 줄 요약

> **"Memory ordering은 다른 thread가 메모리 접근을 어떤 순서로 관찰하는지를 결정하며 CPU와 컴파일러의 재정렬을 통제합니다."**

## 어떤 문제를 푸는가

현대 CPU는 out-of-order execution과 store buffer를 사용해 명령을 순서와 다르게 실행합니다. 단일 thread에서는 결과가 같아 보이지만, 다른 thread가 메모리를 보면 코드 순서와 다른 순서로 관찰할 수 있습니다. 컴파일러도 같은 종류의 재정렬을 합니다.

Lock 기반 코드에서는 lock 내부의 fence가 이 문제를 가려 줍니다. Lock-free 코드에서는 직접 ordering을 통제해야 하며, 잘못하면 producer가 데이터를 쓰기 전에 consumer가 flag를 보는 race가 발생합니다.

이 글에서는 C11/C++11의 6가지 memory order를 정리하고, acquire-release pair가 어떻게 synchronization point를 만드는지, 그리고 ARM과 x86의 실제 비용 차이를 살펴봅니다.

## C11/C++11 Memory Order

```c
#include <stdatomic.h>

memory_order_relaxed    /* 순서 무관, atomic만 보장 */
memory_order_consume    /* dependency만, deprecated */
memory_order_acquire    /* 이후 access가 위로 못 감 */
memory_order_release    /* 이전 access가 아래로 못 감 */
memory_order_acq_rel    /* 양쪽 */
memory_order_seq_cst    /* 모든 thread가 같은 순서로 관찰 */
```

가장 비싼 것이 `seq_cst`이며 기본값이기도 합니다. 의도적으로 약한 order를 지정해야 성능 이점을 얻습니다.

## 6가지 Order의 시각화

```text
relaxed:
  A B C atomic operations — 순서 보장 0

acquire:
  [load A] | B C ...
           ↑ 이후 access가 위로 못 감

release:
  ... B C | [store A]
          ↑ 이전 access가 아래로 못 감

seq_cst:
  모든 atomic의 global total order 존재
```

Acquire와 release는 한쪽 방향만 막는 half-fence입니다. 두 개가 짝을 이루어야 synchronization이 성립합니다.

## Acquire-Release Pair

```c
/* Producer */
data = compute();
atomic_store_explicit(&ready, true, memory_order_release);

/* Consumer */
if (atomic_load_explicit(&ready, memory_order_acquire)) {
    use(data);   /* data 변경이 가시화 보장됨 */
}
```

Release store와 acquire load가 같은 변수에 대해 짝을 이루면 synchronization point가 형성됩니다. Release 이전의 모든 write가 acquire 이후의 모든 read에서 관찰 가능해집니다.

이 pattern이 lock-free 자료구조의 핵심 building block입니다.

## Seq-Cst — Sequential Consistency

```c
/* Dekker's algorithm */
atomic_store(&flag1, true, seq_cst);
if (!atomic_load(&flag2, seq_cst)) enter_critical();

atomic_store(&flag2, true, seq_cst);
if (!atomic_load(&flag1, seq_cst)) enter_critical();
```

Dekker나 Peterson 알고리즘은 acquire-release만으로는 깨집니다. 두 thread 모두 critical section에 들어갈 수 있는 race가 존재합니다.

`seq_cst`는 모든 atomic 연산에 글로벌 total order를 부여하므로 이런 알고리즘이 동작합니다. 비싼 만큼 확실한 보장을 줍니다.

## ARM 명령

| Operation | Order | 명령 |
|---|---|---|
| Load relaxed | — | `LDR` |
| Load acquire | acquire | `LDAR` (ARMv8) |
| Store relaxed | — | `STR` |
| Store release | release | `STLR` (ARMv8) |
| Load seq_cst | seq_cst | `LDAR` |
| Store seq_cst | seq_cst | `STLR` + barrier |
| CAS | varies | `CASAL`, `CAS` (ARMv8.1+) |

ARMv8의 `LDAR`과 `STLR`은 atomic과 half-fence를 single instruction으로 처리하므로 매우 효율적입니다. ARMv7 시절에는 atomic 명령에 DMB를 별도로 붙여야 했습니다.

## DMB, DSB, ISB

```c
__DMB();    /* Data Memory Barrier */
__DSB();    /* Data Synchronization Barrier */
__ISB();    /* Instruction Synchronization */
```

| Barrier | 의미 | 사용처 |
|---|---|---|
| DMB | 이전 memory access 완료 후 이후 access 진행 | acquire/release 보강 |
| DSB | 모든 memory와 이후 명령 완료까지 대기 | clock 변경, MPU 설정 |
| ISB | pipeline flush, instruction refetch | self-modifying code |

ARMv7에서는 atomic + DMB 조합으로 acquire-release를 구현했습니다. ARMv8에서는 LDAR/STLR이 그 역할을 합니다.

## DMB Variant

```c
__DMB();         /* Full system */
__DMB_ISH();     /* Inner Shareable, same cluster */
__DMB_NSH();     /* Non-shareable, same CPU */
__DMB_OSH();     /* Outer Shareable, across clusters */
```

좁은 scope일수록 빠릅니다. SMP cluster 내부에만 영향을 주는 경우는 `DMB ISH`로 충분합니다. 멀티 cluster나 GPU와의 동기화에만 `OSH`가 필요합니다.

## x86 vs ARM — 비용 비교

```text
x86 (strong ordering):
  Load relaxed/acquire    1 cycle
  Store relaxed/release   1 cycle
  Store seq_cst (MFENCE)  10 cycle
  CAS (LOCK CMPXCHG)      20 cycle

ARM (weak ordering):
  Load relaxed            1 cycle
  LDAR (acquire)          5 cycle
  STLR (release)          5 cycle
  Store seq_cst           5 cycle (LDAR/STLR과 동일)
  DMB ISH                 20-50 cycle
```

x86은 거의 모든 load와 store가 자동으로 acquire와 release 의미를 가지므로 비용이 거의 무료입니다. ARM은 명시적으로 acquire/release를 지정해야 하지만 그 비용이 명확히 보입니다.

이 차이 때문에 x86에서 잘 동작하던 코드가 ARM에서 race를 일으키는 경우가 자주 발생합니다. ARM에서는 항상 의도된 memory order를 명시해야 합니다.

## Release-Consume Pattern (deprecated)

```c
/* Consumer */
ptr = atomic_load_explicit(&shared, memory_order_consume);
use(ptr->field);   /* data dependency만 */
```

`consume`은 acquire보다 가벼운 ordering으로, pointer dependency가 있는 access에만 ordering을 적용합니다.

문제는 컴파일러가 dependency를 정확히 추적하기 어려워 대부분 acquire로 fallback한다는 점입니다. C++17에서 deprecated 되었으며 새 코드에서는 acquire를 사용합니다.

## Lock-Free Queue에 적용

```c
/* SPSC push */
data[h] = value;
atomic_store_explicit(&head, h + 1, memory_order_release);
                                /* data write가 head 갱신 전에 가시화 */

/* SPSC pop */
size_t h = atomic_load_explicit(&head, memory_order_acquire);
                                /* data read가 head 관찰 후에 진행 */
return data[t];
```

Release-acquire pair만으로 충분하며 `seq_cst`는 필요 없습니다. Lock-free 자료구조에서 가장 흔한 ordering 조합입니다.

## Linux Kernel — smp_rmb, smp_wmb

```c
smp_rmb();   /* read memory barrier */
smp_wmb();   /* write memory barrier */
smp_mb();    /* full barrier */
```

Linux는 architecture별로 적절한 명령을 emit하는 wrapper를 제공합니다. Modern 코드에서는 `smp_load_acquire(p)`와 `smp_store_release(p, v)`를 사용해 C11 atomic과 비슷한 스타일로 작성합니다.

## Cortex-M Single Core

Cortex-M3/M4 같은 단일 코어 시스템에서는 thread 간 memory ordering이 거의 무의미합니다. Pipeline은 in-order이고 store buffer가 thread 간에 영향을 주지 않습니다.

DMB가 필요한 경우는 DMA나 MMIO와의 ordering입니다.

```c
fill_buf();
__DMB();   /* memory write 완료 보장 */
DMA->CR = DMA_START;
```

CPU가 buffer에 쓴 데이터가 메모리에 도달한 뒤에 DMA를 시작해야 하므로 DMB가 필요합니다.

## Dual-Core Cortex-M

RP2040의 dual Cortex-M0+나 Cortex-M55+M85 cluster에서는 cross-core memory ordering이 필요합니다.

```c
/* Core 0 → Core 1 통신 */
atomic_store_explicit(&shared, value, memory_order_release);

/* Core 1 */
val = atomic_load_explicit(&shared, memory_order_acquire);
```

Single core 시절의 가정이 더 이상 통하지 않으므로 lock-free IPC를 구현할 때는 ordering을 명시해야 합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ volatile을 atomic으로 가정

```c
volatile int x;
x++;   /* read-modify-write, atomic이 아님 */
```

`volatile`은 컴파일러에게 최적화를 막아 달라는 hint일 뿐 atomic과 ordering을 보장하지 않습니다. 두 개념은 독립적입니다.

> ⚠️ 기본 seq_cst의 비용 무시

```c
atomic_int counter = 0;
counter++;   /* default seq_cst — 비쌈 */
```

Counter 누적처럼 ordering이 필요 없는 경우에는 `memory_order_relaxed`를 명시해야 합니다.

> ⚠️ Store에 acquire, load에 release

```c
atomic_store(&flag, 1, memory_order_acquire);   /* invalid */
```

Store는 release만, load는 acquire만 의미가 있습니다. `acq_rel`은 read-modify-write 연산에서만 의미가 있습니다.

> ⚠️ Barrier만 추가하고 non-atomic 변수 사용

```c
*ptr_a = 1;
__DMB();
*ptr_b = 1;
```

Barrier는 이미 atomic으로 발행된 access의 순서만 통제합니다. Non-atomic 변수에 대한 동시 접근은 여전히 race입니다.

## 측정 — 실측 비용

Cortex-A72에서 측정한 단일 atomic 연산 비용입니다.

```text
                          Latency    비고
Load relaxed (LDR)         1 cycle    cache hit
Load acquire (LDAR)        5 cycle    pipeline drain
Store relaxed (STR)        1 cycle    store buffer
Store release (STLR)       5 cycle    store buffer drain
CAS (CASAL)               15 cycle    contention 없을 때
DMB ISH                   30 cycle    cluster 내
DMB OSH                   80 cycle    cluster 간
ISB                       40 cycle    pipeline flush
```

같은 cluster 내 DMB는 30 cycle이지만 cluster를 넘는 OSH는 80 cycle로 두 배 이상입니다. Scope를 좁히는 것이 중요합니다.

## 정리

- Memory order는 relaxed, acquire, release, acq_rel, seq_cst로 강도가 올라갑니다.
- Acquire-release pair가 lock-free의 가장 흔한 synchronization 패턴입니다.
- Seq-cst는 Dekker나 Peterson 같은 알고리즘에 필요하며 비용이 가장 비쌉니다.
- ARMv8의 LDAR과 STLR은 atomic과 half-fence를 single instruction으로 결합합니다.
- DMB scope를 좁히면 비용이 줄어듭니다.
- Cortex-M single core에서는 DMA와 MMIO에 대한 ordering이 주 사용처입니다.

다음 편은 **Cache Coherency** — MESI 프로토콜과 멀티코어 동기화입니다.

## 관련 항목

- [4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
