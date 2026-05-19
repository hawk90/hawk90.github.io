---
title: "4-09: Cache Coherency — MESI·MOESI·Snoop·Directory"
date: 2026-05-08T18:00:00
description: "MESI·MOESI 프로토콜. Snoop-based vs Directory. ACE/CHI. Coherency overhead 측정."
series: "Embedded Performance Engineering"
seriesOrder: 37
tags: [coherency, mesi, moesi, snoop, directory]
draft: true
---

## 한 줄 요약

> **"Cache coherency = 여러 cache의 같은 line이 *일관된 view*"** — hardware가 자동 관리.

## MESI 4-State

| State | 의미 | 다른 cache | Memory |
|---|---|---|---|
| **M** Modified | 이 cache만 valid, dirty | Invalid | stale |
| **E** Exclusive | 이 cache만 valid, clean | Invalid | latest |
| **S** Shared | 여러 cache valid, clean | possibly S | latest |
| **I** Invalid | 무효 | — | — |

## MESI 전이

```text
Read miss (S/E):
  - 다른 cache에 M? → flush + → I, this → S, memory updated
  - 다른 cache에 E? → both → S
  - 다른 cache에 S? → this → S
  - 어떤 cache에도 없음? → memory에서 → E

Write to S:
  - 다른 cache S → Invalidate broadcast → I
  - this → M

Write to M: 그냥 cache에 (이미 exclusive)

Write to I (miss):
  - "RFO" (Read For Ownership) — 다른 cache invalidate
  - this → M, memory not updated
```

## ARM MOESI — Owned 추가

ARM Cortex-A — *MOESI*.

| State | 의미 |
|---|---|
| **M** Modified | 같음 |
| **O** Owned | 여러 cache valid, but *this responsible for write-back* |
| **E** Exclusive | 같음 |
| **S** Shared | 같음 |
| **I** Invalid | 같음 |

Owned — *dirty 데이터를 cache-to-cache 공유* 가능 → memory write-back 지연. ARM의 효율.

## Snoop-Based (Bus-Based)

```text
Bus가 *모든 cache* 보도록 broadcast:
  Cache A read miss for line X
    → bus broadcast
    → Cache B has X? → respond + change state
```

장점 — 단순.
단점 — bus가 *bottleneck* in 8+ core.

ARM CCI-400 (Cluster Coherence Interconnect) — snoop based, 5-master, 4-cluster.

## Directory-Based

```text
각 line의 *home directory*가 *누가 cache 가지고 있나* 기록:
  Cache A miss → home directory query
  Home: cache B,C in S state
  → direct request to B (or C)
```

장점 — *대규모 SoC* scalable (수십 코어).
단점 — directory storage overhead.

ARM CHI (Coherent Hub Interface) — directory-based. Cortex-A78+ 서버급.

## False Sharing — Coherency 직접 영향

```c
struct {
    atomic_int a;   /* CPU 0 사용 */
    atomic_int b;   /* CPU 1 사용 */
} stats;   /* 같은 64-byte line */

/* 매 write — Invalidate broadcast → 다른 cache의 line → I */
/* 다음 read — Snoop or directory query → → S */
/* → ping-pong */
```

해결 — alignas(64). 4-02 편 참고.

## Coherency Overhead 측정

ARMv8 PMU events:

| Event | 의미 |
|---|---|
| `r2A` (BUS_ACCESS_LD) | bus 트래픽 read |
| `r2B` (BUS_ACCESS_ST) | bus 트래픽 write |
| `r2D` (REMOTE_ACCESS) | 다른 cluster cache access |
| Snoop hit | 다른 cache에서 가져옴 |

```bash
perf stat -e r2A,r2B,r2D ./prog
```

`REMOTE_ACCESS` 큼 → *cross-cluster traffic 많음* → cluster pinning 고려.

## NUMA — Multi-Socket Coherency

```text
Socket 0: Core 0-7, DRAM 0
Socket 1: Core 8-15, DRAM 1

QPI/UPI (Intel) 또는 CCIX (ARM) — socket 간 coherent
Remote DRAM access = local의 *1.5-2x latency*
```

```c
/* Linux numactl */
numactl --cpunodebind=0 --membind=0 ./prog
```

같은 node에 *CPU + memory binding* → cross-socket traffic 0.

## CXL — Compute Express Link

```text
CXL 2.0/3.0 — PCIe 기반, *cache coherent*
- 'CXL.cache' — accelerator가 host memory coherent access
- 'CXL.mem' — host가 device memory coherent access

GPU·FPGA·CXL DDR module — *모두 같은 메모리 공간*
```

CXL pool — *수 TB unified coherent memory* — 데이터센터 차세대.

## ARM ACE·CHI

| Interface | 용도 |
|---|---|
| **AXI** | non-coherent |
| **ACE** | full coherency — cluster 내 |
| **ACE-Lite** | partial — I/O coherency만 |
| **CHI** | scalable mesh — server |

ACE — Master·Subordinate snoop broadcast. CHI — message-based directory.

## Coherency 비활성 가능

```c
/* Device memory — coherency 자동 없음 */
struct device_mem __iomem *m;

/* 또는 Normal memory에서 coherency 꺼짐 (조심) */
MPU->RBAR = ... | MPU_ATTR_NON_SHAREABLE;
```

DMA buffer 등 *coherency 불필요 영역*은 *non-shareable* — coherency traffic 0.

## False Sharing 측정 — perf c2c

```bash
sudo perf c2c record -F 60000 ./prog
sudo perf c2c report

# Output:
# Total HITM events: 1234
# Per cache line:
#   line 0xABCDEF00: HITM=500, threads=4
#   source: src.c:42
```

HITM (Hit in Modified) = false sharing의 *직접 signature*.

## Coherency Workshop — 자동차 ASIL

```text
ASIL-D ECU:
  - Lock-step dual core (CPU0 + CPU0_redundant)
  - Each cache = same state
  - Cache coherence + lock-step 동기 — *결정성 critical*
```

Cortex-R52 — *DCLS* (Dual-Core Lock Step) 옵션. 자동차 표준.

## 자주 하는 실수

> ⚠️ Coherency 가정 — Cortex-M에선 *부재*

```c
/* Cortex-M7 — single core, but: */
DMA write → memory   /* cache stale */
CPU read              /* cache miss? No — cache hit, stale data */
```

Cortex-M cache는 *non-coherent* with DMA. *Cache maintenance* 명시 필수.

> ⚠️ False sharing 무시

→ perf c2c로 진단, alignas로 해결.

> ⚠️ NUMA-unaware allocation

```c
malloc(huge);   /* node 0 alloc, but used by node 1 thread */
```

→ `numa_alloc_local()` 또는 thread-local allocator.

> ⚠️ Coherency 일부만 가정

```c
MPU 설정 — region A coherent, region B non-coherent
DMA가 cross-region copy → 일부만 coherent → 미정의 동작
```

→ DMA buffer 전체 *non-coherent + 명시 maintenance*.

## 정리

- MESI — **Modified·Exclusive·Shared·Invalid**.
- ARM **MOESI** — Owned 추가, cache-to-cache 효율.
- **Snoop-based** (CCI-400) vs **Directory-based** (CHI).
- False sharing = coherency 부산물 — `perf c2c`로 진단.
- NUMA·CXL — multi-socket·heterogeneous coherency.
- Cortex-M — DMA와 *non-coherent*, *maintenance 명시*.

다음 편은 **SMP 분석**.

## 관련 항목

- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [4-10: SMP 분석](/blog/embedded/performance-engineering/part4-10-smp-analysis)
