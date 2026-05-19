---
title: "3-04: NUMA Memory Topology — numactl·numa_alloc·HBM"
date: 2026-05-20T11:00:00
description: "NUMA node topology. numactl, numa_alloc_local, HBM, CXL pool, automotive ECU."
series: "Modern Embedded Recipes"
seriesOrder: 16
tags: [recipes, numa, memory, hbm, cxl]
draft: true
---

## 한 줄 요약

> **"NUMA = node별 local memory"** — *local* access는 빠름, *remote*는 *1.5-2x* 느림.

## NUMA Topology

```text
Server 2-socket:
  Socket 0 (CPU 0-15) ─── DDR4 64GB (node 0)
       │
       QPI/UPI (Intel) 또는 CCIX (ARM)
       │
  Socket 1 (CPU 16-31) ─── DDR4 64GB (node 1)
  
Latency:
  local DRAM:   80 ns
  remote DRAM:  130 ns (1.6x)
  
Bandwidth:
  local:   100 GB/s
  remote:  60 GB/s (60%)
```

## numactl — 시스템 정보

```bash
numactl --hardware

# available: 2 nodes (0-1)
# node 0 cpus: 0 1 2 3 4 5 6 7
# node 0 size: 65536 MB
# node 0 free: 32000 MB
# node 1 cpus: 8 9 10 11 12 13 14 15
# node 1 size: 65536 MB
# node 1 free: 30000 MB
# node distances:
# node   0   1
#   0:  10  21
#   1:  21  10
```

`distance` — relative latency (10 = local, 20+ = remote).

## numactl — 실행

```bash
# Node 0의 CPU·memory만 사용
numactl --cpunodebind=0 --membind=0 ./prog

# Interleave 모든 node (큰 workload)
numactl --interleave=all ./prog

# Local-only — 자기 node에 자동 alloc
numactl --localalloc ./prog
```

## libnuma — Programming API

```c
#include <numa.h>

if (numa_available() < 0) return -1;

int node = numa_node_of_cpu(sched_getcpu());
void *p = numa_alloc_onnode(SIZE, node);
/* 명시적 node에 alloc */

numa_free(p, SIZE);
```

또는:

```c
struct bitmask *mask = numa_allocate_nodemask();
numa_bitmask_setbit(mask, 0);
numa_set_membind(mask);
/* 이후 alloc은 node 0에 자동 */
```

## Per-Thread NUMA Pinning

```c
#include <pthread.h>
#include <numa.h>

void *thread_func(void *p) {
    /* CPU affinity */
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(target_cpu, &set);
    pthread_setaffinity_np(pthread_self(), sizeof(set), &set);
    
    /* NUMA memory bind */
    int node = numa_node_of_cpu(target_cpu);
    struct bitmask *mask = numa_allocate_nodemask();
    numa_bitmask_setbit(mask, node);
    numa_set_membind(mask);
    
    /* 이제 thread의 alloc·access *모두 local* */
    work();
}
```

각 thread를 *자기 node에 pinning* + *local alloc*. Cross-node 0.

## NUMA-Aware Allocator — jemalloc·tcmalloc

```bash
LD_PRELOAD=libjemalloc.so ./prog

# jemalloc — per-thread arena, NUMA aware
# tcmalloc — Google, fast malloc
```

DPDK·5G UPF·Cassandra — *NUMA-aware allocator* 사용.

## HBM — High Bandwidth Memory

```text
HBM3:
  - GPU·AI accelerator 옆 stacked memory
  - 819 GB/s per stack (8 stack = 6.5 TB/s)
  - 5-10 ns latency (DRAM의 절반)
  - 용량: 64 GB per stack
  
NVIDIA H100·B100, AMD MI300:
  - HBM3 + main DRAM 양쪽
  - Coherent (또는 explicit copy)
  
NUMA같이 *node*로 보임:
  node 0: HBM (가까움, 빠름, 작음)
  node 1: DRAM (멀리, 느림, 큼)
```

```c
/* HBM에 hot data, DRAM에 cold */
numa_alloc_onnode(hot_data_size, HBM_NODE);
numa_alloc_onnode(cold_data_size, DRAM_NODE);
```

## CXL — Tiered Memory

```text
CXL 2.0/3.0:
  - PCIe 기반 cache coherent memory
  - DRAM 외 *별도 memory pool*
  - Multi-host 공유 가능

Memory hierarchy:
  L1/L2 cache: ns
  HBM:        10 ns
  DRAM:       80 ns
  CXL DRAM:  200 ns
  CXL NAND/Optane: 1 µs+
```

```c
/* CXL memory가 NUMA node로 보임 */
numactl --hardware
# node 0 (DRAM):       64 GB
# node 1 (CXL DRAM):   1 TB   ← CXL pool
# node 2 (CXL Optane): 10 TB
```

차세대 서버 — *Tiered allocation*.

## Embedded NUMA — 자동차 ECU

```text
자동차 central computing:
  Cortex-A78AE × 8 (2 cluster):
    cluster 0 — 4 core + L2 + DRAM 0
    cluster 1 — 4 core + L2 + DRAM 1
    
  → mini-NUMA
  
ASIL workload — cluster 0에 pin
Infotainment — cluster 1
```

NVIDIA Drive Thor·Mobileye EyeQ7 — 비슷한 구조.

## NUMA Balancing — Kernel

```bash
# Linux automatic NUMA balancing
echo 1 > /proc/sys/kernel/numa_balancing

# Kernel이 자동으로:
#  - frequent access page 이동
#  - thread NUMA migration
#  - 통계로 학습
```

자동 — 그러나 *suboptimal*. 명시 pinning이 더 좋음 (예측 가능).

## numastat — 통계

```bash
numastat -p $(pidof prog)

# Per-node memory usage:
#                          Node 0          Node 1
# Huge                       0.00            0.00
# Heap                  12000.00          200.00     ← 대부분 node 0
# Stack                     0.50            0.00
# Private               3000.00          100.00
```

Cross-node access 진단.

## perf — NUMA Events

```bash
perf stat -e mem_load_l3_miss_retired.local_dram,\
mem_load_l3_miss_retired.remote_dram ./prog

# Remote DRAM access ↑ → NUMA 비효율
```

## 자율주행 — Sensor Fusion NUMA

```text
ADAS SoC:
  Camera → sensor cluster (node 0)
  LiDAR → 별도 cluster (node 1)
  Fusion thread → 하나에 pin
  
Sensor data가 다른 node에 있으면 — *cross-node 전송*
  → 명시 *DMA를 같은 node에 routing*
```

## Multi-Socket System Tuning

```bash
# CPU isolation
isolcpus=8-15 nohz_full=8-15 rcu_nocbs=8-15

# Process pinning
taskset -c 8-15 numactl --membind=1 ./rt_app
```

산업·자동차·금융 — *cross-NUMA 최소화*.

## 자주 하는 실수

> ⚠️ 한 thread에 모든 NUMA node 노출

```c
malloc(huge_data);   /* 어느 node? — 첫 touch on node */
```

→ `numa_alloc_onnode` 명시.

> ⚠️ Thread migration 빈번

```c
sched_setaffinity(...);   /* 일부 thread만 */
/* 다른 thread는 OS scheduler 자유 — cross-node 가능 */
```

→ 모든 hot thread *pin*.

> ⚠️ Server에서 NUMA 무시

```c
big_array_malloc();   /* 한 node에만 alloc → 다른 socket thread 느림 */
```

→ `numa_interleave_memory` 또는 *per-thread alloc*.

> ⚠️ Embedded "NUMA 없음" 가정

```text
Cortex-A SoC dual-cluster — *mini-NUMA*
  inter-cluster latency 큼
```

→ thread cluster 분리 고려.

## 정리

- NUMA = **node별 local memory**, remote 1.5-2x 느림.
- **numactl·libnuma**로 explicit binding.
- **HBM** = stacked memory (GPU·AI).
- **CXL** = tiered memory (DRAM·NAND·Optane).
- 자동차·자율주행 SoC도 *mini-NUMA*.
- 측정 — `numastat`·`perf NUMA events`.

다음 편은 **SIMD**.

## 관련 항목

- [3-03: Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)
- [3-05: SIMD](/blog/embedded/modern-recipes/part3-05-simd)
