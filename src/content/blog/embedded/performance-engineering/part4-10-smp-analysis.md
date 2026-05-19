---
title: "4-10: SMP 분석 — Per-Core·Affinity·Load Balance·Migration"
date: 2026-05-08T19:00:00
description: "Per-core utilization. CPU affinity. Load balancing overhead. NUMA·migration cost."
series: "Embedded Performance Engineering"
seriesOrder: 38
tags: [smp, affinity, load-balancing, migration]
draft: true
---

## 한 줄 요약

> **"SMP 효율 = 모든 코어 활용 + cache locality 유지"** — 두 목표는 *trade-off*.

## Per-Core Utilization

```bash
# Linux — htop, top, mpstat
mpstat -P ALL 1

# 출력 예:
# CPU  %usr  %sys  %idle
# 0    98.0   2.0   0.0     ← 다 사용
# 1    50.0   1.0  49.0     ← 절반 idle
# 2     5.0   0.5  94.5     ← 거의 idle
# 3     5.0   0.5  94.5
```

CPU 0만 saturated → *불균등 부하*. Affinity·load balancing 점검.

## CPU Affinity

```bash
# Linux
taskset -c 0,1 ./prog       # CPU 0, 1만 사용
taskset -p 0xF 1234          # PID 1234, mask 0xF (4 CPU)

# C API
cpu_set_t set;
CPU_ZERO(&set);
CPU_SET(0, &set);
sched_setaffinity(0, sizeof(set), &set);
```

장점:
- Cache locality 유지
- Critical thread 우선 코어
- NUMA-aware allocation

단점:
- Idle core 있는데 thread 못 이동

## Linux CFS Load Balancing

```text
주기적 — 매 ms·tick
  - 가장 loaded 코어 → 가장 idle 코어
  - Task의 *cache footprint* 고려 (high cost task는 안 옮김)

Domain hierarchy:
  - SMT pair (HT thread)
  - Core (within cluster)
  - Cluster (LLC)
  - NUMA node
```

낮은 domain 안 balancing이 *우선* — cache 보존.

## Migration Cost

Thread A: cache hot on CPU 0 → migrate to CPU 1

```text
Cost:
  - L1·L2 cache invalidation: ~100 µs (cache 다시 채워야)
  - TLB miss + page walks: ~50 µs
  - Branch predictor cold: ~10 µs
  - 총: 100-500 µs warm-up
```

빈번한 migration — *throughput 30% 손실* 가능.

## NUMA-Aware

```c
/* numactl */
numactl --cpunodebind=0 --membind=0 ./prog

/* C API */
struct bitmask *node_mask = numa_allocate_nodemask();
numa_bitmask_setbit(node_mask, 0);
numa_set_membind(node_mask);
```

큰 메모리 사용 thread — local node 강제. Cross-node bandwidth는 *수십 % 작음*.

## Embedded RTOS — SMP

### FreeRTOS 11 SMP

```c
#define configNUMBER_OF_CORES 4
#define configUSE_CORE_AFFINITY 1

UBaseType_t core_affinity_mask = (1 << 0) | (1 << 1);
vTaskCoreAffinitySet(task_handle, core_affinity_mask);
```

Cortex-M55+M85·Cortex-A53 SMP 등에서 사용. 자동 load balance + manual affinity.

### Zephyr SMP

```c
k_thread_cpu_mask_disable_all(&thread);
k_thread_cpu_mask_enable(&thread, 0);   /* CPU 0만 */
```

Per-CPU runqueue + IPI (Inter-Processor Interrupt)로 migration.

## big.LITTLE Task 배치

```c
/* 모바일 — energy-aware */
struct task_attr {
    int min_compute;   /* MIPS */
    int latency_ms;    /* deadline */
};

/* 작은 task → little core */
/* 큰 task → big core */
/* Burst → 임시 big 후 little 복귀 */
```

Linux **EAS** (Energy-Aware Scheduling) — 자동.

## Inter-Processor Interrupt (IPI)

```text
Core 0이 Core 1에 signal:
  - "task wake" — runqueue 검사 요청
  - "TLB flush" — page table 변경 시
  - "function call" — RPC-like

비용:
  ~5 µs send-to-receive (Cortex-A53)
  Storm 시 — multi-core IPI overhead 큼
```

## RCU·Linux Scheduling Class

```text
SCHED_FIFO     — real-time, no preemption among same priority
SCHED_RR       — round-robin RT
SCHED_DEADLINE — EDF (Earliest Deadline First)
SCHED_OTHER    — normal (CFS)
SCHED_IDLE     — lowest
```

```c
struct sched_param sp = { .sched_priority = 99 };
sched_setscheduler(0, SCHED_FIFO, &sp);
```

RT task는 *FIFO/DEADLINE* — load balancing 안 함.

## Cache Topology Awareness

```bash
lscpu --extended
# CPU NODE SOCKET CORE L1d L1i L2 L3
#   0    0      0    0   0   0  0  0
#   1    0      0    0   0   0  0  0   ← SMT sibling of 0
#   2    0      0    1   1   1  1  0
#   ...
```

같은 core SMT thread — *같은 L1/L2*. Cache-sensitive thread 페어로 배치.

## RT Patch + isolcpus

```bash
# Boot parameter
isolcpus=2,3   /* CPU 2, 3은 *kernel scheduler가 안 건드림* */
```

```c
/* Explicit affinity로만 CPU 2,3 사용 */
sched_setaffinity(0, ..., {2, 3});
```

RT task 전용 코어 — *jitter 최소화*. 자동차·산업 표준.

## Workload Profiling — top·htop·atop

```bash
htop                   # interactive
top -H -p <pid>        # per-thread
atop -1                # historical
sar -P ALL 1 10        # 10 sec, 1 sec 간격
```

Per-thread CPU% — *어떤 thread*가 hot.

## Linux schedstat

```bash
echo 1 > /proc/sys/kernel/sched_schedstats
cat /proc/<pid>/sched
# wait_sum:  대기 시간
# nr_migrations: migration 횟수
# nr_voluntary_switches:  자발 switch
# nr_involuntary_switches: 강제 switch
```

`nr_migrations` 많음 → affinity 검토.

## Power Capping

```text
TDP 65 W:
  4 core × 16 W = 64 W (saturated)
  → 6 core 모두 100% 못 함
  → 일부 core throttle 또는 *모두 절반 freq*
```

Workload — 일부 core *boost*, 나머지 idle이 효율적.

## 자주 하는 실수

> ⚠️ 모든 thread max affinity

```c
sched_setaffinity(0, ..., all_cpus);  /* default — load balance 활성 */
```

→ critical thread만 *narrow affinity*.

> ⚠️ Cache hot thread 자주 migrate

`htop` 보고 thread bouncing 보임 → affinity pin.

> ⚠️ NUMA 무시한 large allocation

```c
buf = malloc(huge);   /* node 0 — 다른 node thread access 느림 */
```

→ `numa_alloc_local()` 또는 *node bind*.

> ⚠️ FIFO scheduling RT thread without limit

```c
sched_setscheduler(0, SCHED_FIFO, &sp);
/* infinite loop — kernel hang */
```

→ `sched_setattr` + budget 또는 hardware watchdog.

## 정리

- **Per-core utilization** + affinity로 *불균등 부하* 진단.
- **Migration cost** = cache warm-up overhead.
- **NUMA-aware** allocation 필수.
- FreeRTOS 11 SMP·Zephyr — *manual affinity + 자동 balance*.
- **isolcpus + sched_setaffinity** = RT 전용 코어.
- `htop`·`mpstat`·`schedstat`로 분석.

다음 part는 **Tooling & Profiling**.

## 관련 항목

- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
