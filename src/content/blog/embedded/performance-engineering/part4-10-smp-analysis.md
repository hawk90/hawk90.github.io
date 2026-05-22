---
title: "4-10: SMP 분석 — Per-Core·Affinity·Load Balance·Scalability"
date: 2026-05-08T19:00:00
description: "Per-core utilization과 CPU affinity, NUMA, migration cost, Amdahl 한계."
series: "Embedded Performance Engineering"
seriesOrder: 39
tags: [smp, affinity, load-balancing, migration, scalability]
---

## 한 줄 요약

> **"SMP 효율은 모든 코어 활용과 cache locality 유지의 trade-off이며, 둘은 자주 충돌합니다."**

## 어떤 문제를 푸는가

코어 수를 늘렸는데 throughput이 그만큼 늘지 않는 경우가 흔합니다. 4-core를 8-core로 바꿔도 1.5배밖에 빨라지지 않으면 어디서 손실이 났는지 분석해야 합니다.

원인은 보통 둘 중 하나입니다. 첫째는 부하 불균등으로 일부 코어만 saturated이고 다른 코어는 idle인 경우입니다. 둘째는 lock contention이나 cache coherency 같은 동기화 overhead로 코어가 늘어날수록 비용이 커지는 경우입니다.

이 글에서는 per-core utilization으로 불균등을 진단하고, CPU affinity와 NUMA-aware allocation으로 cache locality를 유지하며, migration cost와 scalability curve를 측정하는 방법을 정리합니다.

## Per-Core Utilization

```bash
mpstat -P ALL 1

# 출력 예
# CPU  %usr  %sys  %idle
# 0    98.0   2.0   0.0
# 1    50.0   1.0  49.0
# 2     5.0   0.5  94.5
# 3     5.0   0.5  94.5
```

CPU 0만 saturated되어 있고 다른 코어는 거의 idle입니다. 이런 패턴이면 thread가 한 코어에 몰려 있거나, lock으로 직렬화되어 한 코어만 일하는 상태입니다.

`htop`의 per-core 막대 그래프나 `atop`의 historical view도 같은 정보를 제공합니다.

## CPU Affinity

```bash
taskset -c 0,1 ./prog       # CPU 0, 1만 사용
taskset -p 0xF 1234          # PID 1234, mask 0xF (4 CPU)
```

```c
cpu_set_t set;
CPU_ZERO(&set);
CPU_SET(0, &set);
sched_setaffinity(0, sizeof(set), &set);
```

Affinity의 장점은 다음과 같습니다.

- Cache locality 유지로 migration cost 회피
- Critical thread를 전용 코어에 할당해 jitter 감소
- NUMA-aware allocation 가능

단점은 idle core가 있어도 thread가 옮겨 가지 못한다는 점입니다. 워크로드 특성에 따라 narrow affinity와 wide affinity를 선택해야 합니다.

## Linux CFS Load Balancing

```text
주기적 (매 ms 또는 tick):
  - 가장 loaded 코어 → 가장 idle 코어
  - Task의 cache footprint 고려 (hot task는 안 옮김)

Domain hierarchy:
  - SMT pair (hyperthread)
  - Core (within cluster)
  - Cluster (LLC)
  - NUMA node
```

낮은 domain 내 balancing이 우선이며 cache 보존을 위해 가급적 같은 cluster 안에서 처리합니다. NUMA 경계를 넘는 migration은 가장 마지막에 시도됩니다.

## Migration Cost

Thread A가 CPU 0에서 cache hot 상태일 때 CPU 1로 migrate되면 다음 비용이 발생합니다.

```text
L1/L2 cache invalidation        100 µs   (cache 재충전)
TLB miss + page walks            50 µs
Branch predictor cold            10 µs
총 warm-up                   100-500 µs
```

빈번한 migration은 throughput을 30%까지 깎을 수 있습니다. 특히 cache footprint가 큰 thread는 affinity로 pin하는 것이 효과적입니다.

## NUMA-Aware Allocation

```c
numactl --cpunodebind=0 --membind=0 ./prog

struct bitmask *node_mask = numa_allocate_nodemask();
numa_bitmask_setbit(node_mask, 0);
numa_set_membind(node_mask);
```

큰 메모리를 사용하는 thread는 자기 node에 메모리를 할당해야 합니다. Cross-node bandwidth는 local의 60-70% 수준이며 latency는 1.5-2배입니다.

DPDK나 Spark처럼 대용량 데이터를 처리하는 시스템에서는 NUMA-aware allocation이 throughput을 두 배 가까이 올리기도 합니다.

## Embedded RTOS — FreeRTOS 11 SMP

```c
#define configNUMBER_OF_CORES 4
#define configUSE_CORE_AFFINITY 1

UBaseType_t core_affinity_mask = (1 << 0) | (1 << 1);
vTaskCoreAffinitySet(task_handle, core_affinity_mask);
```

FreeRTOS 11부터 SMP가 정식 지원되어 Cortex-A53이나 Cortex-M55+M85 같은 멀티코어 시스템에서 사용할 수 있습니다. 자동 load balancing과 수동 affinity를 함께 제공합니다.

## Zephyr SMP

```c
k_thread_cpu_mask_disable_all(&thread);
k_thread_cpu_mask_enable(&thread, 0);   /* CPU 0만 */
```

Zephyr는 per-CPU runqueue 구조를 사용하며 IPI(Inter-Processor Interrupt)로 다른 코어를 깨워 migration합니다.

## big.LITTLE Task 배치

모바일 SoC의 big.LITTLE 구성에서는 task의 compute 요구사항과 deadline에 따라 코어를 선택합니다.

```text
작은 task → little core (전력 절감)
큰 task   → big core (성능 우선)
Burst    → 임시 big 후 little 복귀
```

Linux의 EAS(Energy-Aware Scheduling)가 이 결정을 자동으로 합니다. Task의 utilization을 추적해 적절한 코어로 배치합니다.

## Inter-Processor Interrupt

```text
Core 0이 Core 1에 signal:
  - "task wake" — runqueue 검사 요청
  - "TLB flush" — page table 변경 시
  - "function call" — RPC-like 호출

비용:
  Cortex-A53에서 5 µs 정도
  IPI storm 시 multi-core overhead가 큼
```

빈번한 IPI는 그 자체로 부담입니다. Lock-free queue로 IPI 없이 통신하거나, IPI 빈도를 batching으로 줄이는 것이 도움이 됩니다.

## Scheduling Class

```text
SCHED_FIFO       real-time, 같은 priority는 voluntary yield까지 실행
SCHED_RR         round-robin RT
SCHED_DEADLINE   EDF (Earliest Deadline First)
SCHED_OTHER      normal CFS
SCHED_IDLE       lowest
```

```c
struct sched_param sp = { .sched_priority = 99 };
sched_setscheduler(0, SCHED_FIFO, &sp);
```

Real-time task는 FIFO나 DEADLINE으로 설정합니다. Load balancing 대상에서 제외되므로 affinity와 함께 설정하는 것이 일반적입니다.

## Cache Topology Awareness

```bash
lscpu --extended
# CPU NODE SOCKET CORE L1d L1i L2 L3
#   0    0      0    0   0   0  0  0
#   1    0      0    0   0   0  0  0   ← SMT sibling of 0
#   2    0      0    1   1   1  1  0
```

같은 core의 SMT thread 두 개는 L1과 L2를 공유합니다. Cache-sensitive thread를 SMT 쌍으로 배치하면 hot data를 공유할 수 있어 효율이 올라갑니다. 반대로 cache-thrashing thread는 분리해야 합니다.

## isolcpus와 RT 전용 코어

```bash
# Boot parameter
isolcpus=2,3   # CPU 2, 3은 kernel scheduler가 안 건드림
```

```c
sched_setaffinity(0, ..., {2, 3});
```

`isolcpus`로 일부 코어를 scheduler에서 제외하면 그 코어에는 명시적 affinity가 있는 thread만 올라갑니다. RT task 전용 코어로 사용해 jitter를 최소화할 수 있으며, 자동차나 산업 시스템에서 표준 패턴입니다.

## schedstat 분석

```bash
echo 1 > /proc/sys/kernel/sched_schedstats
cat /proc/<pid>/sched

# wait_sum:                 runqueue 대기 시간
# nr_migrations:            migration 횟수
# nr_voluntary_switches:    자발적 switch
# nr_involuntary_switches:  강제 switch
```

`nr_migrations`가 비정상적으로 많으면 affinity 검토가 필요합니다. `nr_involuntary_switches`가 크면 preemption 빈도가 높다는 의미이며 priority 조정이 필요합니다.

## Amdahl·USL — Scalability 한계

$$\text{Amdahl:} \quad S(N) = \frac{1}{s + \frac{1 - s}{N}}$$

$$\text{USL:} \quad S(N) = \frac{N}{1 + \alpha(N - 1) + \beta N(N - 1)}$$

여기서 $s$와 $\alpha$는 contention(serial 비율), $\beta$는 coherency overhead입니다.

Amdahl은 contention만 모델링하지만 USL은 coherency overhead까지 포함합니다. 실측 데이터로 $\alpha$와 $\beta$를 fitting하면 scaling 한계를 예측할 수 있습니다.

```text
α=0.1, β=0.01인 시스템:
  4 core:  3.0x
  8 core:  4.7x
  16 core: 5.8x
  32 core: 5.7x   ← peak 후 하락
```

USL은 coherency overhead 때문에 어느 시점부터 코어를 늘릴수록 성능이 떨어지는 현상을 잘 설명합니다.

## Power Capping과 Thermal

```text
TDP 65 W 시스템:
  4 core × 16 W = 64 W (saturated)
  → 6 core 모두 100% 못 함
  → 일부 core throttle 또는 모두 절반 freq
```

전력과 발열 제약 때문에 모든 코어가 동시에 max를 낼 수 없는 경우가 흔합니다. 워크로드를 일부 코어에 boost로 몰고 나머지를 idle로 두는 것이 평균 throughput에 유리하기도 합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ 모든 thread에 max affinity

```c
sched_setaffinity(0, ..., all_cpus);
```

기본값이 모든 CPU 허용이므로 load balancing이 활성화됩니다. Critical thread에만 narrow affinity를 적용해야 합니다.

> ⚠️ Cache hot thread의 빈번한 migration

`htop`이나 `schedstat`로 migration 빈도가 높은 thread를 식별하고 affinity로 pin 합니다.

> ⚠️ NUMA를 무시한 large allocation

```c
buf = malloc(huge);   /* node 0에 alloc, 다른 node thread가 사용 */
```

`numa_alloc_local()`이나 node bind로 local node에 할당합니다.

> ⚠️ FIFO scheduling RT task without limit

```c
sched_setscheduler(0, SCHED_FIFO, &sp);
/* infinite loop → kernel hang */
```

FIFO는 같은 priority의 task가 자발적으로 yield하지 않으면 영원히 실행됩니다. `sched_setattr`로 budget을 두거나 hardware watchdog을 활성화해야 합니다.

## 측정 — Scalability Curve

같은 워크로드를 N개 thread로 돌리면서 throughput을 측정합니다.

```text
Thread count   Throughput (ops/sec)   Speedup
     1               100 K              1.0
     2               195 K              1.95
     4               360 K              3.6
     8               520 K              5.2
    16               580 K              5.8
    32               540 K              5.4   ← 하락
```

8 thread까지는 거의 선형이지만 16에서 둔화되고 32에서 오히려 떨어집니다. USL fitting으로 α와 β를 추출하면 어느 동기화가 bottleneck인지 정량화할 수 있습니다.

## 정리

- Per-core utilization으로 부하 불균등을 먼저 진단합니다.
- CPU affinity는 cache locality를 보존하지만 idle core 활용을 제한합니다.
- Migration cost는 cache warm-up이 주 원인이며 빈번한 migration은 throughput을 깎습니다.
- NUMA-aware allocation으로 cross-node bandwidth 손실을 회피합니다.
- isolcpus와 sched_setaffinity로 RT 전용 코어를 만들 수 있습니다.
- Amdahl과 USL은 scalability 한계와 coherency overhead를 모델링합니다.

다음 파트는 **Tooling and Profiling** — perf, ftrace, LTTng 같은 측정 도구를 깊이 다룹니다.

## 관련 항목

- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [Practical RTOS Internals 3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
