---
title: "3-04: NUMA Memory Topology — numactl·numa_alloc·HBM"
date: 2026-05-07T11:00:00
description: "NUMA node topology, numactl 운영, libnuma API, HBM/CXL tier, 자동차 ECU의 mini-NUMA까지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 16
tags: [recipes, numa, memory, hbm, cxl]
---

## 한 줄 요약

> **"NUMA = node별 local memory."** Local access는 빠르고, remote access는 1.5~2배 느립니다. Topology를 모른 채 thread를 띄우면 성능이 묵묵히 절반으로 떨어집니다.

## 어떤 상황에서 쓰나

2-socket 서버에서 thread를 무작정 띄우면 OS scheduler가 socket 사이를 옮겨 다닙니다. 그동안 thread의 hot data는 한 node에만 있어서 다른 socket으로 옮겨갈 때마다 cross-node access가 발생합니다. 같은 코드가 socket 하나에 pin했을 때보다 30~50% 느려지는 경우가 흔합니다.

자동차 central computing의 Cortex-A78AE 8 core SoC도 cluster 두 개로 나뉘고 각 cluster가 다른 L2와 DRAM channel을 갖습니다. 클래식한 NUMA는 아니지만 cluster 간 latency 차이는 같은 형태로 나타납니다. ASIL workload는 cluster 0, infotainment는 cluster 1 같은 분리가 시작점입니다.

## 핵심 개념

2-socket 서버의 토폴로지를 그림으로 보면 local과 remote의 차이가 분명합니다.

![2-socket NUMA topology — local 80 ns, remote 130 ns](/images/blog/modern-recipes/diagrams/part3-04-numa-topology.svg)

```text
Server 2-socket
  Socket 0 (CPU 0~15) ── DDR 64 GB (node 0)
       │
       UPI / QPI / CCIX
       │
  Socket 1 (CPU 16~31) ── DDR 64 GB (node 1)

Latency           local 80 ns,  remote 130 ns (1.6x)
Bandwidth         local 100 GB/s, remote 60 GB/s
```

Topology의 핵심 두 가지는 CPU affinity와 memory binding입니다. 둘 중 하나만 묶고 다른 하나가 움직이면 cross-node access가 발생합니다. *둘 다 같은 node에* 묶는 것이 NUMA tuning의 기본입니다.

## 코드 / 실제 사용 예

### `numactl --hardware`로 토폴로지 확인

```bash
numactl --hardware

# available: 2 nodes (0-1)
# node 0 cpus: 0 1 2 3 4 5 6 7
# node 0 size: 65536 MB
# node 1 cpus: 8 9 10 11 12 13 14 15
# node 1 size: 65536 MB
# node distances:
# node   0   1
#   0:  10  21
#   1:  21  10
```

`distance` 값이 10이면 local, 20 이상이면 remote입니다. 이 표가 NUMA tuning의 출발점입니다.

### 실행 시 binding

```bash
numactl --cpunodebind=0 --membind=0 ./prog        # 한 node로 묶음
numactl --interleave=all ./prog                   # 큰 workload 분산
numactl --localalloc ./prog                       # 자기 node에 자동 alloc
```

`--interleave`는 throughput 위주, `--membind`는 latency 위주의 선택입니다.

### `libnuma`로 명시 alloc

```c
#include <numa.h>

if (numa_available() < 0) return -1;

int node = numa_node_of_cpu(sched_getcpu());
void *p = numa_alloc_onnode(SIZE, node);
numa_free(p, SIZE);
```

또는 thread의 default policy를 바꿔 둡니다.

```c
struct bitmask *mask = numa_allocate_nodemask();
numa_bitmask_setbit(mask, 0);
numa_set_membind(mask);
/* 이후 모든 alloc이 node 0에 */
```

### Per-thread CPU + NUMA pin

```c
#include <pthread.h>
#include <numa.h>

void *thread_func(void *p) {
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(target_cpu, &set);
    pthread_setaffinity_np(pthread_self(), sizeof(set), &set);

    int node = numa_node_of_cpu(target_cpu);
    struct bitmask *mask = numa_allocate_nodemask();
    numa_bitmask_setbit(mask, node);
    numa_set_membind(mask);

    work();
    return NULL;
}
```

CPU affinity와 memory binding을 같은 node로 묶는 패턴입니다. DPDK, 5G UPF, Cassandra가 표준으로 씁니다.

### NUMA-aware allocator

```bash
LD_PRELOAD=libjemalloc.so ./prog
```

`jemalloc`은 per-thread arena를 가지며 NUMA를 인지합니다. `tcmalloc`도 비슷한 구조입니다. 일반 glibc malloc보다 cross-node fragmentation이 훨씬 적습니다.

### HBM과 CXL을 NUMA node로

```text
HBM3 stacked memory (GPU·AI accelerator 옆)
  819 GB/s per stack, 5~10 ns latency

CXL 2.0/3.0
  PCIe 기반 coherent memory pool
  multi-host 공유 가능
```

```c
/* HBM에 hot, DRAM에 cold */
numa_alloc_onnode(hot_data_size, HBM_NODE);
numa_alloc_onnode(cold_data_size, DRAM_NODE);
```

`numactl --hardware`가 보여주는 node는 HBM과 CXL을 *논리적으로 같은 NUMA*로 표시합니다. Tiered memory의 표준 인터페이스입니다.

### 자동차 ECU의 mini-NUMA

```text
Cortex-A78AE x 8 (2 cluster)
  cluster 0  4 core + L2 + DRAM channel 0
  cluster 1  4 core + L2 + DRAM channel 1

ASIL workload   cluster 0에 pin
Infotainment    cluster 1에 pin
```

NVIDIA Drive Thor와 Mobileye EyeQ7 같은 자율주행 SoC도 같은 구조입니다. Cluster 간 cache coherence는 보장되지만 latency는 분명히 다릅니다.

### Kernel automatic balancing

```bash
echo 1 > /proc/sys/kernel/numa_balancing
```

Kernel이 page와 thread를 자동 migration합니다. 단점은 *예측 불가능*하다는 것입니다. RT나 latency-critical workload에서는 자동 balancing을 끄고 명시 pinning을 선호합니다.

### 측정 — `numastat`

```bash
numastat -p $(pidof prog)

#                       Node 0       Node 1
# Heap                  12000        200       ← 거의 node 0
# Stack                 0.5          0
# Private               3000         100
```

특정 process가 두 node 메모리를 얼마나 쓰는지 한눈에 보입니다.

### `perf`로 cross-node access 측정

```bash
perf stat -e mem_load_l3_miss_retired.local_dram,\
mem_load_l3_miss_retired.remote_dram ./prog
```

`remote_dram` 비율이 높으면 cross-node access가 일어나고 있다는 신호입니다. 보통 5% 이하를 목표로 합니다.

### Multi-socket RT tuning

```bash
isolcpus=8-15 nohz_full=8-15 rcu_nocbs=8-15
taskset -c 8-15 numactl --membind=1 ./rt_app
```

CPU isolation으로 8~15번 코어를 OS scheduler에서 제외하고 그 위에서 RT app을 실행합니다. 산업·자동차·금융 latency-critical 시스템의 표준 패턴입니다.

## 측정 / 성능 비교

2-socket Xeon에서 4 GB array sum 결과입니다.

```text
실행                                   시간       remote DRAM 비율
default (anywhere)                    2.30 s     38%
numactl --cpunodebind=0 --membind=0   1.45 s     2%
numactl --interleave=all              1.70 s     50%
```

Latency 위주면 single-node pin이 가장 빠르고, throughput 위주면 interleave가 안정적입니다.

Cortex-A78AE 8 core SoC에서 image processing pipeline입니다.

```text
cluster scheduler 자유                jitter 6.2 ms
cluster 0에 pin                       jitter 1.8 ms
```

Mini-NUMA에서도 pin이 jitter를 크게 줄입니다.

## 자주 보는 함정

> 첫 touch 정책 무시

```c
malloc(huge_data);   /* 어느 node? — 첫 page fault가 일어난 CPU의 node */
```

Main thread가 alloc하고 worker thread가 다른 node에서 쓰면 remote access가 됩니다. `numa_alloc_onnode`로 명시하거나 worker가 첫 touch하도록 구조를 바꿉니다.

> Thread migration 빈번

```c
/* 일부 thread만 sched_setaffinity */
```

CPU affinity가 없는 thread는 OS가 자유롭게 옮깁니다. Hot path thread는 *모두 pin*하는 편이 안전합니다.

> 서버에서 NUMA를 무시

큰 array 하나를 main thread가 잡고 모든 worker가 공유하면 remote access가 사방에서 발생합니다. `numa_interleave_memory`로 분산하거나 per-thread alloc으로 쪼갭니다.

> 임베디드에서 "NUMA 없음" 가정

Cortex-A dual-cluster SoC도 inter-cluster latency가 있습니다. Mini-NUMA로 다루는 편이 jitter 분석에 유리합니다.

> Automatic balancing에만 의존

Kernel auto balancing은 background로 동작하지만 RT spec을 보장하지 못합니다. Hard real-time workload는 명시 pin이 정답입니다.

## 정리

- NUMA는 node별 local memory를 가지며 remote access는 1.5~2배 느립니다.
- CPU affinity와 memory binding을 *같은 node*로 묶는 것이 기본 패턴입니다.
- `numactl`은 운영용, `libnuma`는 프로그램용 API입니다.
- HBM과 CXL도 NUMA node로 노출되어 tiered memory 인터페이스가 됩니다.
- 자동차·자율주행 SoC는 cluster 단위 mini-NUMA로 다룹니다.
- `numastat`과 `perf remote_dram` 이벤트로 cross-node access를 측정합니다.
- RT/latency-critical workload는 auto balancing을 끄고 명시 pin을 씁니다.

다음 편은 **SIMD intrinsics**입니다.

## 관련 항목

- [3-03: Zero-Copy Pipeline](/blog/embedded/modern-recipes/part3-03-zero-copy)
- [3-05: SIMD](/blog/embedded/modern-recipes/part3-05-simd)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [RTOS 4-07: SMP Scheduling](/blog/embedded/rtos/practical-internals/part4-07-smp-scheduling)
