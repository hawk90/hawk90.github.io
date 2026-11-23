---
title: "NUMA Memory Topology — numactl·numa_alloc·HBM 적용"
slug: "embedded/modern-recipes/part8-06-numa"
date: 2026-04-17T09:05:00
description: "Linux NUMA topology와 CPU affinity·memory policy, libnuma 실패 처리, HBM/CXL의 노드 노출 조건을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 94
tags: [recipes, numa, memory, hbm, cxl]
topics: ["embedded"]
---

## 한 줄 요약

> **NUMA는 Linux가 노출한 CPU·메모리 node와 허용 범위를 확인한 뒤 배치합니다.** CPU affinity, 새 page의 배치 정책, 이미 존재하는 page의 위치는 서로 다른 상태입니다.

## 어떤 상황에서 쓰나

worker를 특정 CPU에 고정했는데 데이터는 다른 node에 이미 올라가 있을 수 있습니다. 사람의 자리를 바꿨다고 창고의 물건이 함께 이동하지 않는 것과 같습니다. allocator를 바꿔도 기존 page가 자동으로 worker 가까이 옮겨지는 것은 아닙니다.

first-touch는 빈 서류함을 처음 예약한 순간보다 실제로 서류를 넣는 순간에 보관 장소를 정하는 과정에 가깝습니다. 새 anonymous page를 처음 쓰는 thread와 policy가 중요합니다. 하지만 malloc이 기존 arena의 resident page를 재사용하면 그 page의 과거 위치도 남습니다.

이 글은 **실제 Linux node와 cpuset 허용 범위를 관찰하고, 새 mapping에 정책을 설정하며 실패를 처리하는 방법**을 다룹니다. QEMU의 가상 topology에서 page 배치 기능을 검사할 수는 있지만, 그 실행 시간으로 실제 socket·HBM·CXL 성능을 비교하지 않습니다.

## CPU cluster와 NUMA node는 같은 개념이 아님

다음 그림은 두 node의 CPU와 메모리를 설명하는 개념도입니다. 실제 CPU 수·link·메모리 용량은 시스템의 topology를 읽어 확인합니다.

![NUMA topology — CPU와 메모리 node의 관계](/images/blog/modern-recipes/diagrams/part3-04-numa-topology.svg)

Linux NUMA node는 CPU가 없고 메모리만 가질 수도 있고, node ID가 연속이라는 보장도 없습니다. 여러 socket이 하나의 node로 보이거나 하나의 socket이 여러 node로 나뉠 수도 있습니다. 공유 L2가 다른 CPU cluster 두 개라는 이유만으로 서로 다른 NUMA memory node라고 부르지 않습니다.

Cortex-A78AE라는 CPU 이름만으로 “8 core·2 cluster·cluster마다 독립 DRAM channel”을 정할 수 없습니다. 그런 연결은 실제 SoC와 firmware의 구성입니다. Linux node에 차이가 없다면 cache·interconnect·affinity 문제로 분석하고, 근거 없는 mini-NUMA topology를 만들어내지 않습니다. ASIL 같은 안전 요구의 격리는 CPU pinning만으로 달성되지 않습니다.

### 먼저 읽을 정보

다음 명령은 시스템의 실제 설정을 조회합니다. 출력 예시를 가상의 장비 측정값처럼 넣지 않습니다.

```bash
numactl --hardware
cat /sys/devices/system/node/online
cat /sys/devices/system/node/node*/cpulist
cat /sys/devices/system/node/node*/meminfo
cat /sys/devices/system/node/node*/distance
grep -E 'Cpus_allowed_list|Mems_allowed_list' /proc/self/status
```

distance는 firmware/kernel이 제공하는 상대 비용 지표이며 측정한 ns나 대역폭 비율이 아닙니다. local 값이 10인 시스템의 remote 값 21을 곧바로 latency 2.1배로 해석하지 않습니다. NUMA balancing이나 page migration이 실행되면 page 위치도 관측 시점에 따라 달라질 수 있습니다.

## Affinity와 memory policy의 적용 범위

다음은 실제 topology와 허용 범위를 확인한 뒤 node 0이 있는 환경에서 실행하는 예입니다. node ID를 제품 전체의 고정 번호로 쓰는 설정은 아닙니다.

```bash
numactl --cpunodebind=0 --membind=0 ./prog
numactl --interleave=all ./prog
numactl --localalloc ./prog
```

| 설정 | 의미 | 주의할 점 |
|---|---|---|
| CPU affinity | thread가 실행할 수 있는 CPU를 제한합니다. | 기존 page를 이동시키지 않으며 IRQ 격리도 아닙니다. |
| membind | 허용 node의 allocation policy를 지정합니다. | cpuset·용량·page fault 실패를 처리해야 합니다. |
| interleave | 대상 node 사이에 page를 분산합니다. | 모든 thread에서 local이 되거나 throughput이 개선되는 보장은 없습니다. |
| local allocation | 현재 실행 CPU 기준의 local 선호 정책입니다. | migration·허용 node·fallback 영향을 받습니다. |

worker별 private 데이터는 CPU와 메모리를 가까이 배치하는 후보입니다. 여러 node의 worker가 같은 데이터를 읽거나 memory-only node를 쓸 때는 단일 node 집중이 목표가 아닐 수 있습니다. PCIe 장치의 locality·공유 데이터량·memory bandwidth도 같이 봅니다.

## Libnuma의 포인터 성공과 정책 성공 구분하기

libnuma의 `numa_alloc_onnode`와 `numa_set_membind`를 호출했다고 반환 포인터만 검사해서 placement 성공으로 판단하지 않습니다. libnuma는 policy 오류를 진단하는 경로와 mapping 반환을 구분하며, 설정 실패 시 warning을 남기고 mapping이 존재할 수 있습니다. `numa_set_membind`는 void API여서 일반적인 int 반환 검사도 할 수 없습니다.

아래는 libnuma의 nodemask를 사용하되 `get_mempolicy`와 `mbind` 반환값을 직접 검사하는 Linux helper입니다. 새 anonymous mapping에만 적용하며 policy를 설정하기 전에 page를 쓰지 않습니다. out은 0 초기화하고 단일 owner가 관리합니다.

```c title="numa-bound-region.c"
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <errno.h>
#include <stddef.h>
#include <sys/mman.h>
#include <numa.h>
#include <numaif.h>

struct bound_region { void *address; size_t length; };

int allocate_bound_region(int node, size_t length, struct bound_region *out)
{
    struct bitmask *mask;
    void *address;
    int ret;
    if (!out || node < 0 || !length) return -EINVAL;
    if (out->address || out->length) return -EBUSY;
    if (numa_available() < 0) return -ENOSYS;
    mask = numa_allocate_nodemask();
    if (!mask) return -ENOMEM;
    if (get_mempolicy(NULL, mask->maskp, mask->size, NULL, MPOL_F_MEMS_ALLOWED) < 0) {
        ret = -errno;
        goto free_mask;
    }
    if ((unsigned int)node >= mask->size || !numa_bitmask_isbitset(mask, node)) {
        ret = -EINVAL;
        goto free_mask;
    }
    numa_bitmask_clearall(mask);
    numa_bitmask_setbit(mask, node);
    address = mmap(NULL, length, PROT_READ | PROT_WRITE,
                   MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (address == MAP_FAILED) { ret = -errno; goto free_mask; }
    if (mbind(address, length, MPOL_BIND, mask->maskp, mask->size, 0) < 0) {
        ret = -errno;
        munmap(address, length);
        goto free_mask;
    }
    *out = (struct bound_region){ address, length };
    ret = 0;
free_mask:
    numa_bitmask_free(mask);
    return ret;
}

int release_bound_region(struct bound_region *region)
{
    if (!region) return -EINVAL;
    if (!region->address && !region->length) return 0;
    if (!region->address || !region->length) return -EINVAL;
    if (munmap(region->address, region->length) < 0) return -errno;
    *region = (struct bound_region){ 0 };
    return 0;
}
```

syscall 차단·권한·cpuset·잘못된 node·mmap 실패를 성공처럼 계속 진행하지 않습니다. 실패 시 out은 그대로이고 임시 mask와 mapping을 정리합니다. 이 helper가 성공해도 물리 메모리를 미리 예약한 것은 아닙니다. 나중의 write fault에서 실제 page를 얻는 과정과 memory pressure는 남습니다.

mask의 size를 node 개수처럼 순회하거나 `0..numa_max_node()`의 모든 node가 online·허용이라고 가정하지 않습니다. mask bit를 확인하며 CPU-less memory node도 CPU node와 구분합니다. 위 region 구조체를 복사해서 중복 munmap하지 않습니다.

## 현재 thread의 affinity 설정과 복원

다음 helper는 CPU_SETSIZE 범위의 CPU를 지원하며, 현재 허용 affinity에서 선택한 CPU로 좁힙니다. 더 큰 CPU 집합이 필요한 제품은 동적 CPU mask API를 사용합니다.

```c title="thread-affinity.c"
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <errno.h>
#include <sched.h>

int pin_current_thread(int cpu, cpu_set_t *previous)
{
    cpu_set_t allowed, chosen;
    if (!previous || cpu < 0 || cpu >= CPU_SETSIZE) return -EINVAL;
    if (sched_getaffinity(0, sizeof(allowed), &allowed) < 0) return -errno;
    if (!CPU_ISSET(cpu, &allowed)) return -EINVAL;
    CPU_ZERO(&chosen);
    CPU_SET(cpu, &chosen);
    if (sched_setaffinity(0, sizeof(chosen), &chosen) < 0) return -errno;
    *previous = allowed;
    return 0;
}
int restore_current_thread(const cpu_set_t *previous)
{
    if (!previous) return -EINVAL;
    return sched_setaffinity(0, sizeof(*previous), previous) < 0 ? -errno : 0;
}
```

설정 뒤 `sched_getcpu`와 affinity를 확인하고, 처리 종료 뒤 복원도 검사합니다. `pthread_setaffinity_np`를 직접 쓰는 변형은 errno가 아니라 함수의 양수 error code를 해석해야 합니다. 호출 실패를 무시한 채 memory policy를 계속 설정하지 않습니다.

memory policy는 이미 만들어진 모든 malloc 객체를 소급 배치하지 않습니다. thread policy의 상속과 다른 thread의 first write를 함께 봅니다. 프로그램 전체의 default policy를 바꾸는 방식과 특정 새 mapping에만 mbind하는 방식도 구분합니다.

## First write와 실제 page 위치 확인

새 anonymous mapping을 읽기만 하면 공용 zero page를 볼 수 있어 private page의 first-touch placement를 확인한 것이 아닐 수 있습니다. placement 실험에서는 원하는 CPU·policy를 설정한 뒤 page마다 실제로 씁니다. malloc을 먼저 호출했다는 이유만으로 모든 page가 그 thread의 node에 배치됐다고 결론내리지 않습니다.

page 위치는 `move_pages`의 조회 모드 또는 `get_mempolicy`의 MPOL_F_NODE|MPOL_F_ADDR, `/proc/PID/numa_maps` 등으로 확인합니다. 반환 status·권한·page가 아직 존재하지 않는 경우를 처리합니다. policy 조회와 실제 resident page의 node 조회는 다른 검사입니다.

다음은 프로세스의 실제 배치와 balancing 설정을 읽는 명령입니다. PID는 조회할 프로세스의 번호로 지정합니다.

```bash
numastat -p PID
cat /proc/PID/numa_maps
cat /proc/sys/kernel/numa_balancing
cat /sys/devices/system/cpu/isolated
```

numastat의 node별 사용량은 그 시점의 배치 정보이며 모든 memory access의 local/remote 비율은 아닙니다. PMU 기반 traffic을 보려면 먼저 `perf list`에서 해당 CPU가 지원하는 event를 확인합니다. 특정 Intel 이벤트 이름을 ARM 전체에 적용하지 않습니다.

## HBM·CXL tier의 node는 실제 노출 상태로 선택

HBM이라는 이름이 Linux의 일반 node allocation을 뜻하지는 않습니다. CPU 주소 공간에 노출되는 HBM과 GPU의 device-private HBM을 구분합니다. CUDA/ROCm 등 장치 메모리 API로 관리하는 저장소를 libnuma만으로 할당할 수 있다고 가정하지 않습니다.

CXL memory도 devdax 경로인지 System RAM으로 online된 경로인지에 따라 다릅니다. NUMA node와 memory tier로 노출된 경우에만 해당 node의 허용 범위와 capacity를 확인해서 정책을 적용합니다. memory-only node에는 실행할 CPU가 없으므로 `cpunodebind`와 `membind`의 node를 항상 동일하게 만들 수는 없습니다.

cache에 자주 쓰는 물건과 큰 창고에 보관할 물건을 나누듯 hot/cold 배치를 생각할 수는 있습니다. 다만 page를 옮기는 비용과 데이터 공유·대역폭·장치 locality가 있으므로 hot은 HBM, cold는 CXL이라는 이름만으로 최적 배치를 정하지 않습니다. allocator arena를 늘리거나 jemalloc/tcmalloc을 preload하는 것도 NUMA placement 검증을 대신하지 않습니다.

## Balancing·격리·실시간 조건

automatic NUMA balancing은 workload의 접근을 관찰하고 migration을 시도하는 기능입니다. 비용과 효과는 workload·kernel·policy에 따라 달라집니다. 새 정책을 썼다면 기존 page의 migration 여부와 balancing의 상호작용도 기록합니다.

CPU pinning은 실시간 deadline 보증이 아닙니다. IRQ·softirq·timer·RCU·housekeeping·scheduler policy와 공유 bus/cache 간섭을 따로 관리합니다. isolcpus/nohz_full/rcu_nocbs를 나열했다고 코어에서 모든 OS 활동이 사라지지 않으며, 제품의 safety partition을 입증하지도 않습니다. 시스템 전체 balancing 설정을 설명 없이 바꾸는 대신 실험의 전후 상태와 영향 범위를 관리합니다.

## 보드 없이 하는 기능 검증과 성능 측정 구분

가상 2-node Linux에서도 node 존재·allowed mask·affinity·mbind 오류·page 위치 조회를 검사할 수 있습니다. 가상 distance와 CPU 명령 실행 비용이 실제 remote DRAM의 지연·대역폭을 모델링한다는 뜻은 아닙니다.

| 검사 | 기능 확인 | 제품에서 추가할 근거 |
|---|---|---|
| topology | online node·CPU/memory mask·CPU-less node를 구분합니다. | 실제 firmware/SoC topology와 접근 비용을 대조합니다. |
| allocation | node/size 거부·정책 실패 정리·첫 write 뒤 위치를 봅니다. | memory pressure·migration·대형 working set을 확인합니다. |
| affinity | 허용 CPU 선택·설정 확인·복원·실패를 검사합니다. | IRQ·scheduler·공유 자원 간섭을 측정합니다. |
| local/remote 비교 | 동일 결과와 실제 page 위치를 확인합니다. | 동일 workload의 latency/throughput 분포를 측정합니다. |

“single-node가 항상 가장 빠름”, “interleave면 throughput이 안정적”, “pinning으로 jitter가 크게 줄어듦”을 빈 측정 표와 함께 결론내리지 않습니다. node별 물리 page 위치가 의도와 맞는지 먼저 확인하고, 성능을 비교할 때는 CPU·node·page size·정책·초기화 thread·balancing·동시 부하를 기록합니다.

### 이번 예제 검증 결과

QEMU가 제공하는 두 memory node의 실제 Linux 6.12.116·libnuma 2.0.19에서 helper를 실행했습니다. thread를 허용 CPU 하나에 고정한 뒤 각 허용 node에 새 mapping을 bind하고 page마다 쓴 후 MPOL_F_NODE|MPOL_F_ADDR로 resident node가 맞는지 검사했습니다. CPU affinity 복원과 잘못된 CPU/node/크기 거부도 확인했습니다.

policy 조회·mbind·munmap 실패를 별도로 주입해 출력 상태 유지와 정리를 검사했습니다. mbind 실패 뒤 임시 mapping이 제거되었는지는 mincore의 ENOMEM으로 확인했습니다. numactl의 membind·interleave·localalloc 명령도 실행했으며 가상 환경의 시간으로 local/remote 성능을 비교하지 않았습니다.

## 정리

- Linux NUMA node를 CPU cluster·socket 수와 동일시하지 않습니다.
- CPU affinity·allocation policy·기존 resident page 위치를 구분합니다.
- libnuma 호출의 포인터 반환만으로 mbind 성공을 판단하지 않습니다.
- 허용 mask·크기·node·syscall 실패를 검사하고 임시 자원을 정리합니다.
- anonymous page의 첫 write와 실제 page node를 확인합니다.
- HBM/CXL의 실제 노출 형태와 memory-only node를 고려합니다.
- 가상 topology 기능 검사와 실물 지연·대역폭·실시간 보증을 구분합니다.

다음 편은 **SIMD intrinsics**입니다. 메모리 위치를 확인한 뒤 한 명령으로 여러 값을 처리할 때의 타입·정렬·tail 조건을 다룹니다.

## 관련 항목

- [8-05: Zero-Copy Pipeline](/blog/embedded/modern-recipes/part8-05-zero-copy)
- [8-07: SIMD](/blog/embedded/modern-recipes/part8-07-simd)
- [12-10: Zero-Copy Camera](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [PE 4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [RTOS 4-07: SMP Scheduling](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)

## 1차 자료

- [Linux 6.12 NUMA policy](https://docs.kernel.org/6.12/admin-guide/mm/numa_memory_policy.html): policy 범위·first touch·cpuset 관계의 기준입니다.
- [numactl/libnuma](https://github.com/numactl/numactl), [numa(3)](https://man7.org/linux/man-pages/man3/numa.3.html): nodemask·할당·정책 API의 계약입니다.
- [mbind(2)](https://man7.org/linux/man-pages/man2/mbind.2.html), [get_mempolicy(2)](https://man7.org/linux/man-pages/man2/get_mempolicy.2.html), [move_pages(2)](https://man7.org/linux/man-pages/man2/move_pages.2.html): 정책과 page 위치·오류 조회를 구분합니다.
- [sched_setaffinity(2)](https://man7.org/linux/man-pages/man2/sched_setaffinity.2.html): 현재 thread·허용 CPU·오류 계약입니다.
