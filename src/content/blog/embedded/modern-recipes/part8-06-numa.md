---
title: "NUMA Memory Topology — numactl·numa_alloc·first touch"
slug: "embedded/modern-recipes/part8-06-numa"
date: 2026-04-17T09:05:00
description: "NUMA node topology와 numactl·libnuma로 페이지가 놓이는 node를 2-node QEMU에서 페이지 단위로 확인하고, memory-only node(HBM·CXL)와 numa_balancing tiering을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 94
tags: [recipes, numa, memory, hbm, cxl]
topics: ["embedded"]
---

## 한 줄 요약

> **"NUMA = node별 local memory."** CPU와 memory를 같은 node에 두는 것이 기본이고, Linux에서 페이지가 어느 node에 놓이는지는 "누가 처음 썼는가"가 정합니다. 이 글은 QEMU로 2-node 시스템을 만들어 first touch, `numa_alloc_onnode`, membind, interleave가 페이지를 실제로 어디에 두는지 페이지 단위로 확인합니다.

## 어떤 상황에서 쓰나

2-socket 서버에서 main thread가 큰 배열을 할당하고 worker가 다른 socket에서 그 배열을 처리하면, worker는 다른 socket의 memory를 읽게 됩니다. 사무실이 두 건물에 나뉘어 있는데 서류함이 전부 한 건물에 있으면, 다른 건물 사람은 매번 건물을 건너가야 하는 것과 같습니다. 어느 쪽 건물에 서류함을 둘지는 "처음 그 서류를 만든 사람"이 정합니다. 아래 실행에서 CPU 0이 `malloc`한 64 MiB를 CPU 2(node 1)가 먼저 쓰자, 16,384 page 중 16,383 page가 node 1에 놓였습니다.

같은 원리가 HBM·CXL 같은 이종 메모리에도 쓰입니다. v6.12 `numaperf.rst`는 이런 메모리를 CPU가 없는 "memory only nodes"로 묶어 NUMA node로 보인다고 설명합니다. 그래서 이 글의 API는 서버뿐 아니라 이종 메모리를 가진 SoC에서도 같은 방식으로 씁니다.

## 핵심 개념

2-socket 서버의 토폴로지를 그림으로 보면 local과 remote의 차이가 분명합니다.

![2-socket NUMA topology — 각 socket이 자기 DRAM을 local로 가짐](/images/blog/modern-recipes/diagrams/part3-04-numa-topology.svg)

배치를 정하는 축은 두 가지입니다. 하나는 thread가 도는 CPU(affinity), 다른 하나는 페이지가 놓이는 node(memory policy)입니다. v6.12 `numa_memory_policy.rst`의 "System Default Policy"는 시스템이 올라온 뒤에는 "local allocation", 곧 페이지를 할당하는 순간(첫 page fault) 그 CPU의 node를 쓴다고 적습니다. 그래서 affinity만 묶고 첫 touch를 다른 CPU가 하면, 이후에 같은 node로 thread를 옮겨도 페이지는 처음 놓인 곳에 남습니다.

## 코드 / 실제 사용 예

### 실행 환경

Apple M2 Pro 위 QEMU 11.1.3(`-M virt -accel hvf -cpu host`)에 node 두 개를 만들어 Debian 13 arm64(커널 6.12.116+deb13-arm64, `numactl`·`libnuma-dev` 2.0.19, GCC 14.2.0)를 올렸습니다.

```bash
qemu-system-aarch64 -M virt,gic-version=3 -accel hvf -cpu host -smp 4 -m 4g \
  -object memory-backend-ram,id=m0,size=2G -object memory-backend-ram,id=m1,size=2G \
  -numa node,nodeid=0,cpus=0-1,memdev=m0 -numa node,nodeid=1,cpus=2-3,memdev=m1 \
  -numa dist,src=0,dst=1,val=21 \
  -bios /opt/homebrew/share/qemu/edk2-aarch64-code.fd \
  -drive if=none,id=d0,file=vm.qcow2,format=qcow2 -device virtio-blk-pci,drive=d0 \
  -nic user,model=virtio-net-pci -nographic
```

두 node의 memory는 결국 같은 Mac의 RAM이므로, 이 VM은 **토폴로지와 페이지 배치**를 확인하는 용도입니다. remote 접근의 지연·대역폭 차이는 재현되지 않습니다(아래 [측정](#측정--성능-비교)에서 직접 확인합니다).

### `numactl --hardware`로 토폴로지 확인

```text
$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1
node 0 size: 1976 MB
node 0 free: 1352 MB
node 1 cpus: 2 3
node 1 size: 1942 MB
node 1 free: 1627 MB
node distances:
node     0    1 
   0:   10   21 
   1:   21   10 
```

`node distances`는 firmware(ACPI SLIT 또는 DT)가 준 상대 비용입니다. v6.12 `include/linux/topology.h`는 "Conform to ACPI 2.0 SLIT distance definitions"라는 주석과 함께 `LOCAL_DISTANCE` 10, `REMOTE_DISTANCE` 20을 정의합니다. 21은 이 VM에 `-numa dist,...,val=21`로 준 값이 그대로 보인 것이므로, distance는 측정값이 아니라 firmware가 알려 준 숫자입니다.

### 실행 시 binding

```bash
numactl --cpunodebind=0 --membind=0 ./prog        # CPU and memory on node 0
numactl --interleave=all ./prog                   # spread pages over all nodes
numactl --localalloc ./prog                       # allocate on the node of the faulting CPU
```

`--membind`는 할당을 허용 node로 제한하고, `--interleave`는 페이지를 node마다 번갈아 둡니다. 아래는 2-node QEMU guest에서 `numastat -p python3`을 실행한 출력입니다. node 1에 메모리를 둔 python3 프로세스(PID 1746)가 207.42 MB 중 거의 전부를 node 1에 두고 있습니다. 이 프로세스를 띄운 명령은 기록에 남아 있지 않아, 어떤 정책으로 띄웠는지는 이 출력만으로 말하지 않습니다. 정책별 배치는 바로 아래 절의 `numa_demo`가 페이지 단위로 보여 줍니다.

```text
Per-node process memory usage (in MBs)
PID                             Node 0          Node 1           Total
---------------------  --------------- --------------- ---------------
576 (unattended-upgr)             1.71           18.21           19.93
1746 (python3)                    0.12          207.42          207.55
---------------------  --------------- --------------- ---------------
Total                             1.84          225.63          227.47
```

`numastat -p python3`은 이름에 python3가 들어간 프로세스를 모두 보여 주므로, 같은 Python으로 도는 `unattended-upgrades`도 함께 나왔습니다.

### 페이지가 실제로 어디 놓이는지 — first touch, `numa_alloc_onnode`, membind, interleave

아래 프로그램은 64 MiB 영역을 여러 방법으로 만든 뒤, `move_pages(2)`에 목적 node를 주지 않고(`nodes == NULL`) 불러 각 페이지가 지금 어느 node에 있는지만 묻습니다.

```c
/* where do pages land? first touch, numa_alloc_onnode, membind, interleave */
#define _GNU_SOURCE
#include <numa.h>
#include <numaif.h>
#include <pthread.h>
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define SIZE (64UL << 20)                     /* 64 MiB */

static void pin(int cpu)
{
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(cpu, &set);
    pthread_setaffinity_np(pthread_self(), sizeof set, &set);
}

/* count which node each page of [p, p+len) is on (move_pages with nodes == NULL only queries) */
static void where(const char *what, void *p, size_t len)
{
    long pg = sysconf(_SC_PAGESIZE), n = len / pg, cnt[8] = { 0 };
    void **pages = malloc(n * sizeof *pages);
    int *status = malloc(n * sizeof *status);
    for (long i = 0; i < n; i++) pages[i] = (char *)p + i * pg;
    move_pages(0, n, pages, NULL, status, 0);
    for (long i = 0; i < n; i++) if (status[i] >= 0 && status[i] < 8) cnt[status[i]]++;
    printf("%-34s node0 %6ld pages, node1 %6ld pages\n", what, cnt[0], cnt[1]);
    free(pages); free(status);
}

static void *touch(void *p) { pin(2); memset(p, 1, SIZE); return NULL; }   /* CPU 2 = node 1 */

static void *membind_worker(void *arg)
{
    (void)arg;
    pin(0);                                   /* runs on node 0 ... */
    struct bitmask *mask = numa_allocate_nodemask();
    numa_bitmask_setbit(mask, 1);             /* ... but allocates on node 1 */
    numa_set_membind(mask);
    numa_free_nodemask(mask);
    char *p = malloc(SIZE);
    memset(p, 1, SIZE);
    where("membind(1) thread on CPU 0", p, SIZE);
    free(p);
    return NULL;
}

int main(void)
{
    if (numa_available() < 0) { puts("no NUMA"); return 1; }
    pin(0);
    for (int c = 0; c < 4; c++) printf("cpu %d -> node %d\n", c, numa_node_of_cpu(c));
    printf("numa_distance(0,1) = %d\n", numa_distance(0, 1));

    char *a = malloc(SIZE);                   /* allocated on CPU 0 ... */
    pthread_t t;
    pthread_create(&t, NULL, touch, a);       /* ... first touched on CPU 2 */
    pthread_join(t, NULL);
    where("malloc on CPU 0, touched on CPU 2", a, SIZE);

    char *b = malloc(SIZE);
    memset(b, 1, SIZE);
    where("malloc and touch on CPU 0", b, SIZE);

    char *c = numa_alloc_onnode(SIZE, 1);
    memset(c, 1, SIZE);
    where("numa_alloc_onnode(1)", c, SIZE);

    char *d = numa_alloc_interleaved(SIZE);
    memset(d, 1, SIZE);
    where("numa_alloc_interleaved", d, SIZE);

    pthread_create(&t, NULL, membind_worker, NULL);
    pthread_join(t, NULL);

    free(a); free(b); numa_free(c, SIZE); numa_free(d, SIZE);
    return 0;
}
```

```text
cpu 0 -> node 0
cpu 1 -> node 0
cpu 2 -> node 1
cpu 3 -> node 1
numa_distance(0,1) = 21
malloc on CPU 0, touched on CPU 2  node0      1 pages, node1  16383 pages
malloc and touch on CPU 0          node0  16384 pages, node1      0 pages
numa_alloc_onnode(1)               node0      0 pages, node1  16384 pages
numa_alloc_interleaved             node0   8192 pages, node1   8192 pages
membind(1) thread on CPU 0         node0      0 pages, node1  16384 pages
```

- **first touch가 node를 정했습니다.** CPU 0에서 `malloc`하고 CPU 2에서 처음 쓴 영역은 16,384 page 중 16,383 page가 node 1에 있었습니다. 남은 1 page는 `malloc`이 CPU 0에서 할당 정보를 쓰느라 먼저 건드린 첫 page입니다.
- **같은 CPU에서 할당하고 쓰면 전부 local입니다.**
- **`numa_alloc_onnode(1)`과 membind는 CPU와 무관하게 node 1에 두었습니다.** membind thread는 CPU 0에서 돌았지만 페이지는 모두 node 1이었습니다. CPU와 memory를 다른 node에 묶는 것도 이렇게 쉽게 되므로, 둘을 같은 node로 맞추는 것은 프로그래머의 몫입니다.
- **interleave는 정확히 반씩 나눴습니다.**

thread마다 CPU와 memory를 같은 node에 묶는 패턴은 위 `pin()`과 `membind_worker()`를 합친 것입니다. CPU를 먼저 고르고, 그 CPU의 node를 `numa_node_of_cpu()`로 얻어 membind에 넣습니다.

### Kernel automatic balancing

```bash
cat /proc/sys/kernel/numa_balancing     # 1 on this VM
```

v6.12 `sysctl/kernel.rst`의 `numa_balancing` 항목은 이 기능이 "periodically unmapping pages and later trapping a page fault"로 접근을 표본 추출해 페이지를 옮긴다고 설명합니다. 같은 항목은 그 비용이 "ideally is offset by improved memory locality but there is no universal guarantee"이고, "If the target workload is already bound to NUMA nodes then this feature should be disabled"라고 적습니다. 값 2(`NUMA_BALANCING_MEMORY_TIERING`)는 이종 메모리 node 사이에서 hot page를 빠른 메모리로 올리는 모드입니다.

### Latency-critical CPU 분리

```bash
# kernel command line
nohz_full=2-3 rcu_nocbs=2-3
# run on node 1 CPUs with node 1 memory
taskset -c 2-3 numactl --membind=1 ./rt_app
```

v6.12 `kernel-parameters.txt`는 `isolcpus=`를 "[Deprecated - use cpusets instead]"로 표시합니다. 그래서 CPU 분리는 cpuset으로 하고(cgroup v2 `cpuset.cpus.partition`에 `"isolated"`를 쓰면 "Partition root without load balancing"이 됩니다, `cgroup-v2.rst`), `nohz_full`·`rcu_nocbs`로 그 CPU의 tick과 RCU callback을 줄입니다. CPU 분리와 memory node를 같은 쪽으로 맞추는 것이 이 절의 요점입니다. 이 VM에서는 latency를 재지 않았습니다.

## 측정 / 성능 비교

512 MiB 배열을 5번 더하는 `sum.c`를 CPU는 node 0에 두고 memory 정책만 바꿔 각 3번 돌렸습니다.

```c
/* sum a 512 MiB array 5 times; run under numactl to choose CPU and memory nodes */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

int main(void)
{
    size_t n = (512UL << 20) / sizeof(uint64_t);
    uint64_t *a = malloc(n * sizeof *a), s = 0;
    memset(a, 1, n * sizeof *a);                       /* first touch under the numactl policy */
    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (int r = 0; r < 5; r++) for (size_t i = 0; i < n; i++) s += a[i];
    clock_gettime(CLOCK_MONOTONIC, &t1);
    printf("%.3f s (sum %llu)\n", (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9, (unsigned long long)s);
    return 0;
}
```

```text
numactl --cpunodebind=0 --membind=0: 0.204 s (sum 1446803456760217600)
numactl --cpunodebind=0 --membind=0: 0.123 s (sum 1446803456760217600)
numactl --cpunodebind=0 --membind=0: 0.130 s (sum 1446803456760217600)
numactl --cpunodebind=0 --membind=1: 0.170 s (sum 1446803456760217600)
numactl --cpunodebind=0 --membind=1: 0.124 s (sum 1446803456760217600)
numactl --cpunodebind=0 --membind=1: 0.120 s (sum 1446803456760217600)
numactl --cpunodebind=0 --interleave=all: 0.119 s (sum 1446803456760217600)
numactl --cpunodebind=0 --interleave=all: 0.116 s (sum 1446803456760217600)
numactl --cpunodebind=0 --interleave=all: 0.125 s (sum 1446803456760217600)
```

local(`--membind=0`), remote(`--membind=1`), interleave 모두 0.12~0.13초였습니다(첫 실행의 0.204·0.170초는 처음 페이지를 채우는 비용이 섞인 값입니다). 재현 절차대로 새로 한 번씩 돌렸을 때는 0.341·0.139·0.373초로, 정책과 무관하게 Mac의 다른 작업에 따라 흔들렸습니다. 정책 사이에 일정한 차이가 없는 것이 정상입니다. 이 VM의 두 node는 같은 Mac RAM이고 QEMU가 지연을 흉내 내지 않기 때문입니다. 위 페이지 배치 결과는 실제 NUMA 하드웨어에서도 같지만, local과 remote의 비용 차이는 multi-socket 서버나 이종 메모리 SoC에서 같은 `sum.c`로 다시 재야 합니다.

## 자주 보는 함정

> ⚠️ first touch를 무시

```c
char *data = malloc(huge);   /* no page has a node yet */
memset(data, 0, huge);       /* main thread on node 0: every page goes to node 0 */
```

위 실행처럼 처음 쓴 CPU의 node에 페이지가 놓입니다. main thread가 0으로 초기화하고 worker가 다른 node에서 처리하면 worker의 접근은 모두 remote입니다. 각 worker가 자기 몫을 처음 쓰게 하거나 `numa_alloc_onnode`로 명시합니다.

> ⚠️ 일부 thread만 pin

affinity가 없는 thread는 scheduler가 다른 node로 옮길 수 있고, 옮겨 간 뒤에는 이미 놓인 페이지가 remote가 됩니다. hot path thread는 모두 pin하거나 cpuset으로 node 안에 가둡니다.

> ⚠️ 큰 공유 배열을 한 node에

모든 worker가 읽는 큰 배열 하나를 main thread가 초기화하면 한 node에 몰립니다. `numa_alloc_interleaved`나 `numactl --interleave`로 나누면 위 실행처럼 반씩 놓입니다.

> ⚠️ distance를 측정값으로 읽음

`numactl --hardware`의 21은 이 VM에 직접 준 값이었습니다. 실제 지연은 `sum.c` 같은 측정으로 확인합니다.

> ⚠️ binding과 automatic balancing을 함께 켬

이미 node에 묶은 workload라면 `kernel.rst`의 권고대로 `numa_balancing`을 끕니다. 그대로 두면 표본 추출용 page fault가 계속 생깁니다.

## 재현 환경

VM 명령은 위 [실행 환경](#실행-환경)에 있고, 게스트 안에서는 다음과 같이 돌렸습니다.

```bash
apt-get install -y numactl libnuma-dev gcc
numactl --hardware
gcc -O2 -Wall -o numa_demo numa_demo.c -lnuma -lpthread && ./numa_demo
gcc -O2 -o sum sum.c
numactl --cpunodebind=0 --membind=0 ./sum
numactl --cpunodebind=0 --membind=1 ./sum
numactl --cpunodebind=0 --interleave=all ./sum
```

## 정리

- Linux의 기본 정책은 local allocation이고, 페이지 node는 처음 쓴 CPU가 정합니다. CPU 0이 할당하고 CPU 2가 처음 쓴 64 MiB는 1 page를 빼고 모두 node 1에 놓였습니다.
- `numa_alloc_onnode`와 membind는 thread가 도는 CPU와 무관하게 지정한 node에 둡니다. CPU와 memory를 같은 node로 맞추는 것은 직접 해야 합니다.
- interleave는 페이지를 node마다 정확히 번갈아 둡니다.
- `numactl --hardware`의 distance는 firmware가 준 값이고, Linux의 기준은 local 10, remote 20입니다.
- 이미 bind한 workload는 `numa_balancing`을 끕니다. `isolcpus=`는 v6.12에서 deprecated이고 cpuset을 씁니다.
- QEMU NUMA는 배치를 확인하는 도구이고, local·remote 비용은 실제 하드웨어에서 잽니다.

다음 편은 **SIMD intrinsics**입니다.

## 관련 항목

- [8-05: Zero-Copy Pipeline](/blog/embedded/modern-recipes/part8-05-zero-copy)
- [8-07: SIMD](/blog/embedded/modern-recipes/part8-07-simd)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [RTOS 4-07: SMP Scheduling](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
