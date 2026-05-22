---
title: "4-09: Cache Coherency — MESI·MOESI·Snoop·Directory"
date: 2026-05-08T18:00:00
description: "MESI와 MOESI 프로토콜, snoop과 directory 방식, coherency overhead 측정."
series: "Embedded Performance Engineering"
seriesOrder: 38
tags: [coherency, mesi, moesi, snoop, directory]
---

## 한 줄 요약

> **"Cache coherency는 여러 cache가 같은 line에 대해 일관된 view를 갖도록 hardware가 자동으로 관리하는 mechanism입니다."**

## 어떤 문제를 푸는가

각 CPU 코어는 자기 L1 cache를 가지고 있습니다. 한 코어가 변수에 write를 하면 그 값은 자기 L1에만 들어가고, 다른 코어의 L1은 옛 값을 그대로 가지고 있게 됩니다. 별다른 처리가 없다면 두 코어는 서로 다른 값을 보게 되어 모든 multi-threaded 코드가 깨집니다.

Cache coherence protocol은 이 문제를 hardware 차원에서 자동으로 해결합니다. 한 코어가 write하면 다른 코어의 cache line을 invalidate하거나 update해서 모두가 같은 값을 보도록 만듭니다.

이 글에서는 MESI 4-state 프로토콜과 ARM의 MOESI 확장, snoop-based와 directory-based 두 가지 구현 방식, 그리고 PMU로 coherency overhead를 측정하는 방법을 살펴봅니다.

## MESI 4-State

| State | 의미 | 다른 cache | Memory |
|---|---|---|---|
| M (Modified) | 이 cache만 valid, dirty | Invalid | stale |
| E (Exclusive) | 이 cache만 valid, clean | Invalid | latest |
| S (Shared) | 여러 cache valid, clean | 가능 (S) | latest |
| I (Invalid) | 무효 | — | — |

각 cache line이 이 네 상태 중 하나를 가지며, read와 write에 따라 상태가 전이됩니다. 그림으로 보면 어떤 동작이 어떤 전이를 일으키는지 한눈에 보입니다.

![MESI 상태 전이 — local read/write(초록)와 remote read/write(빨강)](/images/blog/perf-eng/diagrams/part4-09-mesi-states.svg)

## MESI 상태 전이

```text
Read miss:
  - 다른 cache에 M? → flush + → I, this → S, memory updated
  - 다른 cache에 E? → both → S
  - 다른 cache에 S? → this → S
  - 어떤 cache에도 없음? → memory에서 → E

Write to S:
  - 다른 cache S → Invalidate broadcast → I
  - this → M

Write to M: 그냥 cache에 (이미 exclusive)

Write to I (write miss):
  - RFO (Read For Ownership) → 다른 cache invalidate
  - this → M, memory not updated
```

RFO는 write 직전에 발생하는 read입니다. Write할 cache line을 먼저 자기 cache로 가져오면서 다른 cache의 동일 line을 invalidate합니다. 이 트래픽이 false sharing의 주범입니다.

## ARM MOESI — Owned 상태 추가

ARM Cortex-A는 MOESI를 사용합니다. Owned 상태가 추가됩니다.

| State | 의미 |
|---|---|
| M (Modified) | 이 cache만 valid, dirty |
| O (Owned) | 여러 cache valid, this가 write-back 책임 |
| E (Exclusive) | 이 cache만 valid, clean |
| S (Shared) | 여러 cache valid, clean |
| I (Invalid) | 무효 |

Owned 상태 덕분에 dirty 데이터를 cache-to-cache로 공유할 수 있습니다. Memory에 write-back을 지연시킬 수 있어 bus traffic이 줄어듭니다.

## Snoop-Based — Bus-Based

```text
Cache A read miss for line X
  → bus broadcast
  → Cache B has X? → respond + change state
```

모든 cache가 bus를 listen하면서 다른 cache의 트랜잭션에 반응합니다. 구조가 단순하고 latency가 낮습니다.

단점은 bus가 bottleneck이 된다는 점입니다. 8개 이상의 코어가 같은 bus에 연결되면 broadcast traffic이 폭발해 scalability가 떨어집니다.

ARM CCI-400(Cluster Coherence Interconnect)이 snoop-based이며 최대 5 master, 4 cluster까지 연결합니다. 모바일 SoC에서 흔히 사용됩니다.

## Directory-Based

```text
각 line의 home directory가 누가 cache 보유 중인지 기록
  Cache A miss → home directory query
  Home: cache B,C in S state
  → direct request to B (or C)
```

각 cache line마다 home node가 있어 어느 코어가 그 line을 가지고 있는지 추적합니다. Bus broadcast 대신 point-to-point 메시지로 처리하므로 scalability가 훨씬 좋습니다.

단점은 directory storage overhead입니다. Line마다 N-bit vector(N = 코어 수)가 필요합니다.

ARM CHI(Coherent Hub Interface)가 directory-based이며 Cortex-A78 이상의 서버급 SoC에서 사용됩니다. Mesh interconnect로 64코어 이상을 지원합니다.

## False Sharing은 Coherency의 부산물

```c
struct {
    atomic_int a;   /* CPU 0 사용 */
    atomic_int b;   /* CPU 1 사용 */
} stats;   /* 같은 64-byte line */
```

논리적으로는 두 변수가 독립이지만 같은 cache line에 들어 있어 한쪽이 write할 때마다 다른 쪽 cache가 invalidate됩니다. 매 access마다 coherency traffic이 발생해 throughput이 크게 떨어집니다.

해결은 `alignas(64)`로 line을 분리하는 것입니다. 자세한 분석은 4-02 편에 있습니다.

## Coherency Overhead 측정

ARMv8 PMU events입니다.

| Event | 의미 |
|---|---|
| `r2A` (BUS_ACCESS_LD) | bus 트래픽 read |
| `r2B` (BUS_ACCESS_ST) | bus 트래픽 write |
| `r2D` (REMOTE_ACCESS) | 다른 cluster cache access |
| Snoop hit | 다른 cache에서 데이터 fetch |

```bash
perf stat -e r2A,r2B,r2D ./prog
```

`REMOTE_ACCESS`가 큰 값을 보이면 cross-cluster traffic이 많다는 의미입니다. Thread를 같은 cluster의 코어로 pin해서 줄일 수 있습니다.

## NUMA — Multi-Socket Coherency

```text
Socket 0: Core 0-7, DRAM 0
Socket 1: Core 8-15, DRAM 1

QPI/UPI (Intel) 또는 CCIX (ARM)로 socket 간 coherent
Remote DRAM access = local의 1.5-2x latency
```

여러 socket이 있을 때 자기 socket의 메모리에 접근하면 빠르고, 다른 socket의 메모리에 접근하면 느립니다. 그래서 thread와 memory를 같은 NUMA node에 두는 것이 필요합니다.

```c
numactl --cpunodebind=0 --membind=0 ./prog
```

위 명령은 process를 node 0에 묶어 cross-socket coherency traffic을 0으로 만듭니다.

## CXL — Compute Express Link

CXL 2.0과 3.0은 PCIe 기반의 cache coherent interconnect입니다.

```text
CXL.cache — accelerator가 host memory를 coherent하게 access
CXL.mem   — host가 device memory를 coherent하게 access

GPU, FPGA, CXL DDR module이 모두 같은 메모리 공간
```

CXL pool은 수 TB의 unified coherent memory를 만들 수 있어 데이터센터의 차세대 메모리 아키텍처로 주목받고 있습니다.

## ARM ACE와 CHI

| Interface | 용도 |
|---|---|
| AXI | non-coherent |
| ACE | full coherency, cluster 내 |
| ACE-Lite | partial, I/O coherency만 |
| CHI | scalable mesh, server |

ACE는 master-subordinate snoop broadcast 방식이며 CHI는 message-based directory 방식입니다. Embedded SoC는 보통 ACE를 사용하고, server급 SoC가 CHI를 사용합니다.

## Coherency 비활성화

```c
/* Device memory — coherency 자동 없음 */
struct device_mem __iomem *m;

/* Normal memory에서 coherency 끄기 */
MPU->RBAR = ... | MPU_ATTR_NON_SHAREABLE;
```

DMA buffer처럼 coherency가 불필요한 영역은 non-shareable로 설정해 coherency traffic을 0으로 만들 수 있습니다. 대신 software가 cache maintenance를 명시적으로 해야 합니다.

## False Sharing 측정 — perf c2c

```bash
sudo perf c2c record -F 60000 ./prog
sudo perf c2c report

# 출력 예
# Total HITM events: 1234
# Per cache line:
#   line 0xABCDEF00: HITM=500, threads=4
#   source: src.c:42
```

HITM(Hit in Modified)은 다른 코어가 Modified 상태로 가지고 있는 line에 접근했을 때 발생하는 이벤트입니다. False sharing의 직접적인 signature이며, `perf c2c`가 발생 line과 소스 위치까지 알려 줍니다.

## ASIL Lock-Step

```text
ASIL-D ECU:
  Lock-step dual core (CPU0 + CPU0_redundant)
  두 코어가 cycle 단위로 동일한 명령을 실행
  Cache 상태도 동기 유지
```

자동차의 brake나 steering 같은 ASIL-D 시스템에서는 Cortex-R52의 DCLS(Dual-Core Lock Step) 옵션을 사용합니다. 두 코어가 같은 명령을 cycle 단위로 동기 실행하고, cache 상태도 함께 유지해 결정성을 보장합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Cortex-M의 cache는 DMA와 coherent하지 않음

```c
DMA write → memory   /* cache는 stale */
CPU read              /* cache hit, stale data */
```

Cortex-M cache는 single core용으로 설계되었으며 DMA controller와의 자동 coherency를 지원하지 않습니다. `SCB_InvalidateDCache_by_Addr`나 `SCB_CleanDCache_by_Addr`를 명시적으로 호출해야 합니다.

> ⚠️ False sharing 무시

`perf c2c`로 진단하고 `alignas(64)`로 해결합니다.

> ⚠️ NUMA-unaware allocation

```c
buf = malloc(huge);   /* node 0에 alloc, node 1 thread가 사용 */
```

`numa_alloc_local()`이나 thread-local allocator를 사용해야 합니다.

> ⚠️ Coherency를 일부만 가정

MPU에서 region A는 coherent, region B는 non-coherent로 설정한 뒤 DMA가 region 경계를 넘으면 일부는 coherent하고 일부는 아닌 상태가 되어 동작이 미정의됩니다. DMA buffer는 전체를 non-coherent로 두고 maintenance를 명시하는 것이 안전합니다.

## 측정 — 실측 결과

Cortex-A72 4-core cluster에서 측정한 cache coherency 트래픽입니다.

```text
Workload                       BUS_ACCESS    REMOTE_ACCESS    Cycles
Local read (cache hit)              0              0           1
Local read (L2 miss)                1              0           15
Snoop hit (다른 cache에서)          1              0           25
Cross-cluster snoop                 1              1           80
False sharing (high freq)         high           low           100+
```

Cross-cluster snoop이 local L2 miss보다 5배 이상 비쌉니다. Thread affinity로 같은 cluster에 묶는 것이 큰 효과를 줍니다.

## 정리

- MESI는 Modified, Exclusive, Shared, Invalid 4-state 프로토콜입니다.
- ARM MOESI는 Owned 상태를 추가해 cache-to-cache 공유 효율을 높입니다.
- Snoop-based(CCI-400)는 단순하지만 scalability가 제한적이며 directory-based(CHI)는 server급에서 사용됩니다.
- False sharing은 coherency의 부산물이며 `perf c2c`로 진단합니다.
- NUMA와 CXL은 multi-socket과 heterogeneous coherency를 다룹니다.
- Cortex-M cache는 DMA와 non-coherent이므로 software maintenance가 필수입니다.

다음 편은 **SMP 성능 분석** — 코어별 부하와 affinity, scalability를 살펴봅니다.

## 관련 항목

- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [4-10: SMP 분석](/blog/embedded/performance-engineering/part4-10-smp-analysis)
