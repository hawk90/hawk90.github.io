---
title: "SMP 성능 분석 — Per-Core·Affinity·Load Balance·Scalability"
slug: "embedded/performance-engineering/part4-10-smp-analysis"
date: 2026-04-26T09:09:00
description: "Per-core utilization과 CPU affinity, NUMA, migration cost, Amdahl 한계."
series: "Embedded Performance Engineering"
seriesOrder: 39
tags: [smp, affinity, load-balancing, migration, scalability]
topics: ["embedded"]
---

## 한 줄 요약

> **"SMP 효율은 모든 코어를 쓰는 것과 cache locality를 지키는 것 사이의 trade-off이며, 둘은 자주 충돌합니다."**

## 어떤 문제를 푸는가

코어를 두 배로 늘렸는데 처리량이 두 배가 되지 않는 일은 흔한 질문입니다. 식당 주방에 요리사를 더 들였는데 도마가 하나뿐이면 요리사만 늘고 음식은 그대로 나옵니다. 원인은 두 갈래입니다. 하나는 부하 불균등으로 일부 코어만 바쁘고 나머지는 노는 경우이고, 다른 하나는 lock이나 공유 cache line 같은 동기화 비용이 코어 수와 함께 커지는 경우입니다.

이 글은 두 원인을 각각 실제로 만들어 보고, per-core utilization·affinity·migration·IPI·scalability curve를 Linux 도구로 재는 방법을 보여 줍니다. 측정 환경은 Apple M2 Pro 위 QEMU 11.1.3(`-accel hvf -cpu host`, vCPU 4개, 3 GiB) Debian 13 arm64 guest, kernel 6.12.116, gcc 14.2.0입니다. 호스트를 다른 작업과 공유했으므로(load average 약 20) 5회 실행의 중앙값과 범위를 적습니다. Guest의 vCPU는 호스트에서 thread로 돌기 때문에 물리 코어와 1:1로 고정돼 있지 않다는 점도 함께 읽어야 합니다.

## Per-Core Utilization

전체 CPU 사용률만 보면 불균등이 숨습니다. 4코어에서 "25% 사용"은 네 코어가 고르게 25%일 수도, 한 코어가 100%이고 셋이 놀 수도 있습니다. 그래서 코어별로 봅니다.

일부러 불균등을 만들었습니다. 계산 thread 3개를 `taskset -c 0`으로 CPU 0 하나에 몰아 넣고 `mpstat -P ALL 2 1`을 실행했습니다.

```text
Average:     CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle
Average:     all   24.37    0.00    0.13    0.00    0.00    0.00    0.00    0.00    0.00   75.50
Average:       0  100.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00
Average:       1    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00  100.00
Average:       2    0.00    0.00    0.50    0.00    0.00    0.00    0.00    0.00    0.00   99.50
Average:       3    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00  100.00
```

`all` 줄은 24%로 여유가 있어 보이지만 CPU 0은 100%이고 나머지는 놉니다. 이런 모양이면 affinity가 좁게 걸렸거나, lock 때문에 한 번에 한 thread만 일하는 상태를 의심합니다. 이 실험은 앞의 경우를 일부러 만든 것입니다.

## CPU Affinity

Affinity는 thread가 돌 수 있는 CPU 집합입니다. 단골 손님에게 늘 같은 자리를 주면 그 자리에 손님의 물건(cache 내용)이 그대로 남아 있는 것과 같습니다.

```bash
taskset -c 0,1 ./prog        # CPU 0, 1에서만 실행
taskset -p 0xF 1234          # PID 1234의 mask를 CPU 0-3으로
```

```c
cpu_set_t set;
CPU_ZERO(&set);
CPU_SET(0, &set);
sched_setaffinity(0, sizeof(set), &set);   /* 호출한 thread를 CPU 0에 고정 */
```

장점은 뒤의 migration 측정에서 보듯 cache를 다시 채우는 비용을 피하고, 중요한 thread를 다른 부하와 떼어 jitter를 줄이는 것입니다. 단점은 앞 절의 `mpstat`처럼 다른 코어가 놀아도 그쪽으로 옮겨 가지 못한다는 것입니다.

## Linux CFS Load Balancing

먼저 이름부터 바로잡습니다. v6.12 [`Documentation/scheduler/sched-eevdf.rst`](https://docs.kernel.org/scheduler/sched-eevdf.html)는 kernel이 6.6부터 CFS에서 EEVDF(Earliest Eligible Virtual Deadline First)로 옮겨 가기 시작했다고 적습니다. 일반 task의 "누가 다음에 도느냐"는 EEVDF가 정하고, "어느 CPU에서 도느냐"를 정하는 load balancing은 sched domain 구조가 맡습니다.

[`sched-domains.rst`](https://docs.kernel.org/scheduler/sched-domains.html)에 따르면 각 CPU에서 `sched_tick()`이 `sched_balance_trigger()`를 주기적으로 부르고, 다음 rebalance 시점이 되면 `SCHED_SOFTIRQ`에서 `sched_balance_domains()`가 자기 domain부터 parent 쪽으로 올라가며 rebalance 간격이 지난 domain마다 `sched_balance_rq()`를 실행합니다. `sched_balance_rq()`는 그 domain에서 가장 바쁜 group과 그 안의 가장 바쁜 runqueue를 찾아 task를 끌어옵니다. 이 guest의 domain은 하나뿐이었습니다.

```text
/sys/kernel/debug/sched/domains/cpu0/domain0 name=MC flags=SD_BALANCE_NEWIDLE SD_BALANCE_EXEC SD_BALANCE_FORK SD_WAKE_AFFINE SD_SHARE_LLC SD_PREFER_SIBLING
```

"cache가 뜨거운 task는 옮기지 않는다"는 규칙도 코드로 확인할 수 있습니다. v6.12 `kernel/sched/fair.c:9260`의 `task_hot()`은 task가 마지막으로 실행을 시작한 지 `sysctl_sched_migration_cost`보다 짧으면 cache-hot으로 보고, 이 값의 기본은 같은 파일 79행의 `500000UL`(0.5 ms)입니다. Guest의 `/sys/kernel/debug/sched/migration_cost_ns`도 `500000`이었습니다. 같은 함수는 SMT sibling끼리(`SD_SHARE_CPUCAPACITY`)는 cache를 공유하므로 hot 판정을 하지 않습니다.

## Migration Cost

Migration 비용이 실제로 얼마인지 `migrate.c`로 쟀습니다. 한 thread가 working set 전체를 64-byte 간격으로 읽는 pass를 2,000번 반복합니다. `pinned`는 CPU 1에 머물고, `bounce`는 pass마다 `sched_setaffinity()`로 CPU 1과 2를 오갑니다. 시간은 읽기 pass만 재고 affinity 변경 호출은 뺐으므로, 차이는 새 CPU에서 cache를 다시 채우는 비용입니다(5회 중앙값).

| Working set | pinned (ns/pass) | bounce (ns/pass) | 차이 | 비율 |
|---:|---:|---:|---:|---:|
| 64 KiB | 358 | 1,054 | 696 | 2.94 |
| 512 KiB | 5,139 | 8,479 | 3,340 | 1.65 |
| 2 MiB | 22,265 | 37,455 | 15,190 | 1.68 |
| 8 MiB | 102,868 | 149,599 | 46,731 | 1.45 |

64 KiB에서는 옮길 때마다 pass가 세 배 느려졌고, 차이의 절대값은 working set과 함께 8 MiB에서 약 47 µs까지 커졌습니다. 즉 migration의 비용은 "한 번에 얼마"라는 고정값이 아니라 그 thread가 cache에 쌓아 둔 데이터의 양에 비례합니다.

Migration 횟수는 `/proc/<pid>/sched`에서 봅니다. 같은 프로그램(512 KiB)을 1초 돌린 뒤 읽은 값입니다(`sched_schedstats`를 켠 상태).

```text
## pinned
se.nr_migrations                             :                    1
nr_involuntary_switches                      :                    5
wait_sum                                     :             0.184585
## bounce
se.nr_migrations                             :                19807
nr_involuntary_switches                      :                19807
wait_sum                                     :            96.301816
```

Bounce 쪽은 1초에 19,807번 옮겨졌고, 그 대가로 runqueue 대기(`wait_sum`, ms)가 96 ms 쌓였습니다.

## NUMA-Aware Allocation

NUMA 시스템에서는 메모리가 node마다 붙어 있어, thread와 그 데이터를 같은 node에 두는 것이 기본입니다.

```bash
numactl --cpunodebind=0 --membind=0 ./prog
```

```c
struct bitmask *node_mask = numa_allocate_nodemask();
numa_bitmask_setbit(node_mask, 0);
numa_set_membind(node_mask);            /* 이후 할당을 node 0으로 */
void *buf = numa_alloc_onnode(size, 0); /* 특정 버퍼만 node 0에 */
```

v6.12 [`numa_memory_policy.rst`](https://docs.kernel.org/admin-guide/mm/numa_memory_policy.html)에 따르면 부팅 후 기본 정책은 "local allocation"이고, page를 할당하는 CPU의 node에서 시작합니다. 그래서 초기화 thread 하나가 큰 버퍼를 먼저 건드리면 전부 그 node에 놓입니다. Node 사이 지연·대역폭 차이는 이 글에서 재지 않았습니다. 이 guest의 `numactl --hardware`는 `available: 1 nodes (0)`였습니다. Node 간 비용은 [4-09](/blog/embedded/performance-engineering/part4-09-cache-coherency#numa--multi-socket-coherency)와 [3-12](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)에서 다룹니다.

## Embedded RTOS — FreeRTOS 11 SMP

FreeRTOS-Kernel의 `History.txt`는 V11.0.0(2023년 12월 18일)을 "the first to merge Symmetric Multiprocessing (SMP) support into the mainline release"라고 적고, SMP를 "one instance of the FreeRTOS Kernel to schedule tasks across multiple identical processor cores"로 설명합니다. Affinity API는 `include/task.h`에 있습니다.

```c
/* FreeRTOSConfig.h */
#define configNUMBER_OF_CORES     2
#define configUSE_CORE_AFFINITY   1

/* 선언 task.h:1436, 정의 tasks.c:3057 (configNUMBER_OF_CORES > 1 && configUSE_CORE_AFFINITY == 1) */
vTaskCoreAffinitySet(task_handle, (1 << 0));   /* core 0에서만 실행 */
```

같은 저장소의 `portable/ThirdParty/GCC/`에는 RP2040, Xtensa_ESP32 같은 포트가 있고, `History.txt`에는 Armv8-M 포트와 Cortex-R82 포트의 SMP 지원 추가가 기록돼 있습니다.

## Zephyr SMP

Zephyr의 [SMP 문서](https://docs.zephyrproject.org/latest/kernel/services/smp/smp.html) "CPU Mask" 절은 `CONFIG_SCHED_CPU_MASK`를 켜면 thread마다 실행 가능한 CPU를 정할 수 있다고 설명합니다.

```c
/* thread는 생성 직후(K_FOREVER 지연) 또는 정지 상태여야 함 */
k_thread_cpu_mask_clear(&thread);
k_thread_cpu_mask_enable(&thread, 0);   /* CPU 0만 */
k_thread_start(&thread);
```

Zephyr [thread 문서](https://docs.zephyrproject.org/latest/kernel/services/threads/index.html)에 따르면 `K_FOREVER` 시작 지연으로 만든 thread는 `k_thread_start()`를 부를 때까지 시작하지 않으므로, 그 사이에 mask를 정합니다. SMP 문서의 같은 절은 이 API가 "illegal if called on a runnable thread"이고 실행 가능한 thread에 부르면 `-EINVAL`을 돌려줍니다. 또 runqueue는 기본적으로 CPU 사이에 공유되고, `CONFIG_SCHED_CPU_MASK_PIN_ONLY`일 때만 "each CPU maintains its own independent run queue"입니다. IPI는 `arch_sched_broadcast_ipi()`가 기본이고, `CONFIG_ARCH_HAS_DIRECTED_IPIS`인 아키텍처는 특정 CPU만 깨우는 `arch_sched_directed_ipi()`도 제공합니다.

## big.LITTLE Task 배치

big.LITTLE처럼 코어 성능이 다른 SoC에서는 작은 task를 LITTLE에, 큰 task를 big에 두어야 전력과 성능을 함께 챙깁니다. Linux의 EAS(Energy Aware Scheduling)가 이 결정을 합니다. v6.12 [`sched-energy.rst`](https://docs.kernel.org/scheduler/sched-energy.html)는 EAS가 CPU의 Energy Model로 "an energy efficient CPU for each task"를 고른다고 설명하고, "EAS does not support platforms with symmetric CPU topologies"라고 못 박습니다. 이 글의 guest처럼 모든 CPU가 같은 시스템에서는 EAS가 동작하지 않습니다.

## Inter-Processor Interrupt

다른 CPU에서 잠든 thread를 깨우려면 그 CPU에 IPI를 보내야 합니다. 옆 사무실 동료에게 일을 넘길 때 메신저로 부르는 것과 같아서, 같은 책상에서 넘기는 것보다 단계가 많습니다.

`pipepp.c`는 두 process를 원하는 CPU에 고정하고 pipe로 1바이트를 주고받습니다(10만 왕복, 5회 중앙값).

| 배치 | 왕복 1회 |
|---|---:|
| 같은 CPU (0 ↔ 0) | 1.86 µs |
| 다른 CPU (0 ↔ 1) | 66.38 µs |

다른 CPU로 깨우는 쪽이 이 guest에서는 35배 느렸습니다. 이 숫자는 vCPU가 잠들었다가 깨어나는 가상화 경로를 포함하므로 실기기의 IPI 비용으로 읽으면 안 됩니다. 대상 vCPU에 `SCHED_IDLE` spinner를 두고 다시 재도 중앙값 63.51 µs(범위 28.65~161.58 µs)로 차이가 줄지 않았습니다.

어떤 IPI가 쓰였는지는 `/proc/interrupts`에 남습니다. 다른 CPU 왕복 10만 회 전후의 값입니다.

```text
IPI0:      1957      22050      22033       1934       Rescheduling interrupts
IPI1:   1966323    1963379    1490428    1839900       Function call interrupts
...
IPI0:      1958      22051      22035       1935       Rescheduling interrupts
IPI1:   2065071    2063398    1490725    1839919       Function call interrupts
```

CPU 0과 1의 `Function call interrupts`가 각각 98,748회, 100,019회 늘었고 `Rescheduling interrupts`는 1회씩만 늘었습니다. v6.12 `kernel/sched/core.c:3821`의 `__ttwu_queue_wakelist()`는 깨울 task를 대상 CPU의 wake list에 넣고 `__smp_call_single_queue()`를 부르며, arm64의 `arch_send_call_function_single_ipi()`(`arch/arm64/kernel/smp.c:860`)는 `IPI_CALL_FUNC`를 보냅니다. 그래서 wakeup이 "Function call" 줄에 잡힙니다.

## Scheduling Class

| Class | [`sched(7)`](https://man7.org/linux/man-pages/man7/sched.7.html)(man-pages 6.19)의 설명 |
|-------|------|
| `SCHED_FIFO` | I/O로 block되거나, 더 높은 priority에 선점되거나, `sched_yield()`를 부를 때까지 실행 |
| `SCHED_RR` | FIFO와 같되 thread마다 최대 time quantum이 있음 |
| `SCHED_DEADLINE` | Linux 3.14부터, GEDF + CBS로 구현 |
| `SCHED_OTHER` | 일반 time-sharing (위 EEVDF) |
| `SCHED_IDLE` | 매우 낮은 priority 작업용 |

```c
struct sched_param sp = { .sched_priority = 80 };
sched_setscheduler(0, SCHED_FIFO, &sp);
```

RT task를 특정 CPU에 두려면 affinity를 함께 설정합니다. 다음 절의 `isolcpus`·cpuset과 짝을 이룹니다.

## Cache Topology Awareness

`lscpu --extended`는 CPU마다 어떤 cache를 공유하는지 보여 줍니다. 이 guest의 출력입니다.

```text
CPU NODE SOCKET CORE L1d:L1i:L2 ONLINE
  0    0      0    0 0:0:0         yes
  1    0      0    1 0:0:0         yes
  2    0      0    2 0:0:0         yes
  3    0      0    3 0:0:0         yes
```

`CORE` 열이 모두 달라 SMT sibling은 없고, `L1d:L1i:L2` 열은 QEMU가 노출한 가상 topology라 모두 `0:0:0`입니다. 실기기에서 같은 `CORE` 번호를 가진 CPU가 둘이면 SMT sibling이고, 앞의 `task_hot()`처럼 kernel도 그 쌍은 cache를 공유한다고 봅니다. 데이터를 주고받는 thread 쌍은 cache를 공유하는 CPU에, 서로 cache를 밀어내는 thread는 떨어진 CPU에 둡니다.

## isolcpus와 RT 전용 코어

특정 코어를 RT task 전용으로 비워 두려면 일반 task와 load balancing이 그 코어에 들어오지 않게 해야 합니다.

```bash
# kernel command line
isolcpus=2,3
```

v6.12 `Documentation/admin-guide/kernel-parameters.txt`의 `isolcpus=` 항목은 "Isolate a given set of CPUs from disturbance"라고 하면서 바로 다음 줄에 "[Deprecated - use cpusets instead]"라고 적습니다. 새 시스템에서는 cgroup cpuset으로 같은 분리를 구성합니다.

## schedstat 분석

`/proc/<pid>/sched`의 상세 통계는 `sched_schedstats`를 켜야 채워집니다. v6.12 `Documentation/admin-guide/sysctl/kernel.rst`는 이 설정이 "a small amount of overhead"를 더한다고 적습니다.

```bash
echo 1 > /proc/sys/kernel/sched_schedstats
grep -E 'nr_migrations|wait_sum|nr_involuntary' /proc/<pid>/sched
```

앞의 migration 절에서 본 것처럼 `se.nr_migrations`가 초당 수만이면 affinity나 wakeup 패턴을 의심하고, `nr_involuntary_switches`와 `wait_sum`이 함께 크면 그 thread가 runqueue에서 기다리는 시간이 길다는 뜻입니다.

## Amdahl·USL — Scalability 한계

$$\text{Amdahl:} \quad S(N) = \frac{1}{s + \frac{1 - s}{N}}$$

$$\text{USL:} \quad S(N) = \frac{N}{1 + \alpha(N - 1) + \beta N(N - 1)}$$

Amdahl의 $s$는 직렬 부분의 비율입니다. USL(Universal Scalability Law)의 $\alpha$는 경합(contention), $\beta$는 coherency(코어끼리 상태를 맞추는 비용)이며, $\beta$ 항이 $N^2$로 커지므로 어느 지점부터 코어를 늘릴수록 처리량이 떨어집니다. 예를 들어 $\alpha=0.1$, $\beta=0.01$을 넣으면 $S(4)=2.82$, $S(8)=3.54$, $S(16)=3.27$, $S(32)=2.28$이고, 최대점은 $N^*=\sqrt{(1-\alpha)/\beta}\approx 9.5$로 $S(9)=S(10)\approx 3.57$입니다(식에 값을 대입한 계산).

## 자주 보는 함정과 안티패턴

> ⚠️ 모든 thread에 narrow affinity

기본 affinity는 모든 CPU이고, 그래야 load balancing이 동작합니다. 앞의 `mpstat` 예처럼 thread를 한 CPU에 몰면 나머지가 놉니다. 좁은 affinity는 측정으로 이득이 확인된 thread에만 겁니다.

> ⚠️ Cache hot thread의 빈번한 migration

`se.nr_migrations`가 큰 thread를 찾아 affinity를 검토합니다. 64 KiB working set에서도 옮길 때마다 pass가 세 배 느려졌습니다.

> ⚠️ NUMA를 무시한 large allocation

```c
buf = malloc(huge);   /* 기본 정책: 처음 건드린 CPU의 node에 배치 */
```

> ⚠️ 제한 없는 SCHED_FIFO 루프

```c
sched_setscheduler(0, SCHED_FIFO, &sp);
for (;;) { }   /* 같은 CPU의 일반 task는 fair server 몫만 받음 */
```

`sched(7)`은 `/proc/sys/kernel/sched_rt_runtime_us`의 기본값이 950,000(1초 중 0.95초)이고, 5%를 RT·deadline이 아닌 process에 남긴다고 적습니다. 이 guest도 `sched_rt_period_us=1000000`, `sched_rt_runtime_us=950000`이었습니다. 그런데 v6.12에서는 이 값과 별개로 CPU마다 fair server가 있습니다. `kernel/sched/deadline.c:1637~1638`의 `dl_server_start()`는 일반(fair) task용 deadline server에 runtime 50 ms, period 1000 ms를 주고, guest의 `/sys/kernel/debug/sched/fair_server/cpu1/runtime`·`period`도 `50000000`·`1000000000`(ns)이었습니다.

실제로 확인했습니다. CPU 1에 일반 spinner를 띄운 뒤 `timeout 3 chrt -f 50 taskset -c 1`로 같은 CPU에 FIFO spinner를 3초 돌리고, 그 동안 일반 spinner의 `se.sum_exec_runtime` 증가량을 쟀습니다(3회씩).

| `sched_rt_runtime_us` | 3초 동안 일반 spinner가 받은 시간 |
|---|---:|
| 950000 (기본) | 165.91 ms (161.89~182.50) |
| -1 | 161.91 ms (161.89~165.89) |

두 설정 모두 3초에 약 160 ms, 즉 fair server 몫인 1초당 50 ms 남짓이었습니다. 즉 이 kernel에서는 무한 루프 FIFO task가 있어도 같은 CPU의 일반 task가 굶지 않고, `sched_rt_runtime_us`를 `-1`로 바꿔도 그 몫은 그대로였습니다. 다만 그 CPU의 일반 작업은 1초에 약 50 ms로 버텨야 합니다. 처음 시도에서 `chrt -f 50 taskset -c 1 timeout 3 ...` 순서로 쓰자 `timeout` 자신이 같은 CPU의 FIFO 50이 되어 시간이 지나도 spinner를 끝내지 못했습니다. RT hog를 실험할 때는 감시 process를 hog 밖에 둡니다.

## 비교 예시 — Scalability Curve

같은 작업을 thread 수만 바꿔 돌린 실측입니다. `scale.c`는 thread마다 xorshift 계산을 5,000만 번 하고, `share_every`마다 공유 atomic counter를 한 번 올립니다. 값은 전체 처리량(Mops/s)의 5회 중앙값과 1 thread 대비 배율입니다. vCPU는 4개이므로 6·8 thread는 과다 할당입니다.

| Threads | 공유 없음 | 1,000회마다 공유 | 매번 공유 |
|---:|---:|---:|---:|
| 1 | 475.7 (1.00) | 437.8 (1.00) | 429.1 (1.00) |
| 2 | 816.4 (1.72) | 602.0 (1.38) | 215.4 (0.50) |
| 3 | 1,045.8 (2.20) | 954.4 (2.18) | 186.1 (0.43) |
| 4 | 1,483.4 (3.12) | 1,083.2 (2.47) | 82.8 (0.19) |
| 6 | 1,248.1 (2.62) | 1,096.4 (2.50) | 118.2 (0.28) |
| 8 | 1,227.1 (2.58) | 939.2 (2.15) | 116.2 (0.27) |

공유가 없으면 4 thread에서 3.12배까지 올라갔다가 vCPU 수를 넘자 떨어졌습니다. 매 연산마다 같은 cache line을 쓰면 2 thread에서 이미 절반이 됐고 4 thread에서는 1 thread의 19%까지 떨어졌습니다. 이것이 USL의 $\beta$ 항이 그리는 "늘릴수록 느려지는" 구간입니다. 다만 이 표는 공유 호스트에서 잰 것이라 공유 없음 4 thread의 범위가 963.6~1,741.8 Mops/s로 넓습니다. USL fitting은 곡선의 모양을 요약할 뿐 어떤 동기화가 원인인지는 알려 주지 않으므로, 원인은 [4-09](/blog/embedded/performance-engineering/part4-09-cache-coherency)의 방법으로 따로 찾습니다.

## 정리

- `mpstat -P ALL`의 `all` 줄 24%가 실제로는 CPU 0 100% + 세 코어 유휴였습니다. 코어별로 봅니다.
- 6.6 이후 일반 task 스케줄러는 EEVDF이고, load balancing은 sched domain 단위로 `sched_balance_rq()`가 합니다. 0.5 ms 안에 돈 task는 `task_hot()`이 cache-hot으로 봅니다.
- Migration 비용은 working set에 비례했습니다(64 KiB에서 2.94배, 8 MiB에서 pass당 약 47 µs 추가).
- 다른 CPU를 깨우는 wakeup은 arm64에서 `Function call interrupts`(IPI_CALL_FUNC)로 잡혔습니다. Guest의 왕복 66 µs는 가상화 경로를 포함합니다.
- FreeRTOS는 V11.0.0부터 SMP가 mainline이고, Zephyr는 `CONFIG_SCHED_CPU_MASK`로 affinity를 주되 runqueue는 PIN_ONLY일 때만 CPU별입니다.
- `isolcpus`는 deprecated이고 cpuset이 권장됩니다. v6.12에서는 fair server(1초당 50 ms)가 `sched_rt_runtime_us`와 무관하게 일반 task 몫을 남겼습니다.
- 공유 counter를 매번 쓰면 4 thread 처리량이 1 thread의 19%로 떨어졌습니다.

다음 파트는 **Tooling and Profiling** — perf, ftrace, eBPF 같은 측정 도구를 깊이 다룹니다.

## 관련 항목

- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [Practical RTOS Internals 3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
