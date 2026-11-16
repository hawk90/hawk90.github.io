---
title: "Cache Coherency 프로토콜 — MESI·MOESI·Snoop·Directory"
slug: "embedded/performance-engineering/part4-09-cache-coherency"
date: 2026-04-26T09:08:00
description: "MESI와 MOESI 프로토콜, snoop과 directory 방식, coherency overhead 측정."
series: "Embedded Performance Engineering"
seriesOrder: 38
tags: [coherency, mesi, moesi, snoop, directory]
topics: ["embedded"]
---

## 한 줄 요약

> **"Cache coherency는 여러 cache가 같은 line을 일관되게 보도록 하드웨어가 관리하는 규칙이고, 그 비용은 line이 코어 사이를 오갈 때마다 치릅니다."**

## 어떤 문제를 푸는가

각 코어는 자기 L1 cache를 가집니다. 한 코어가 변수에 쓰면 그 값은 먼저 자기 L1에 들어가고, 다른 코어의 L1에는 옛 값이 남아 있을 수 있습니다. 같은 문서를 여러 사람이 각자 출력해 들고 있는 상황과 같습니다. 누군가 원본을 고치면 다른 사람의 출력본은 낡은 것이 됩니다.

Cache coherence protocol은 이 문제를 하드웨어에서 해결합니다. 한 코어가 쓰면 다른 코어의 사본을 무효화하거나 최신 데이터를 전달해 모두가 같은 값을 보게 합니다. 공짜는 아닙니다. 이 글의 측정에서 cache line 하나를 두 코어 사이에서 한 번 넘기는 데 약 42 ns가 걸렸고, 서로 다른 변수라도 같은 line에 있으면 쓰기 루프가 3~4배 느려졌습니다.

이 글은 MESI와 MOESI 상태, snoop과 directory(snoop filter) 방식을 Arm TRM과 Linux 소스로 확인하고, 측정할 때 쓰는 PMU 이벤트와 그 한계를 정리합니다. 측정 환경은 Apple M2 Pro의 macOS 네이티브 실행(Apple clang 21.0.0)과 QEMU 11.1.3 `-accel hvf -cpu host` Debian 13 arm64 guest(vCPU 4개, gcc 14.2.0) 두 가지입니다.

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

| 동작 | 조건 | 전이 |
|------|------|------|
| Read miss | 다른 cache에 M | 보유 cache가 최신 데이터를 제공하고 M → S로 전이, 요청 cache도 S가 됨 |
| Read miss | 다른 cache에 E | 양쪽 모두 → S |
| Read miss | 다른 cache에 S | this → S |
| Read miss | 어떤 cache에도 없음 | memory에서 읽어 → E |
| Write to S | 다른 cache가 S | Invalidate로 그쪽은 → I, this → M |
| Write to M | — | 이미 exclusive이므로 cache에 그냥 write |
| Write to I (write miss) | — | RFO(Read For Ownership)로 다른 cache invalidate, this → M |

첫 줄의 경로는 Intel의 ["Faster Core-to-Core Communications"](https://www.intel.com/content/www/us/en/developer/articles/technical/fast-core-to-core-communications.html)가 설명하는 예와 같습니다. 이 글은 home agent가 소유 agent에게 "move to state shared"를 요청하고, 소유 agent가 수정된 데이터를 돌려주면 home agent가 요청 코어에 전달한다고 적습니다. 즉 dirty line을 다른 코어가 읽으면 데이터가 코어 사이를 한 번 이동합니다. 그 이동이 아래 측정에서 재는 비용입니다.

## ARM MOESI — Owned 상태 추가

Arm의 [Cortex-A53 MPCore TRM](https://documentation-service.arm.com/static/5e9075f9c8052b1608761519)(r0p3, ARM DDI 0500E) 6.2.5절은 "The Cortex-A53 processor uses the MOESI protocol to maintain data coherency between multiple cores"라고 적고, 각 상태를 AMBA 이름과 함께 정의합니다.

| MOESI | AMBA 이름 | Cortex-A53 TRM 6.2.5절의 정의 |
|---|---|---|
| M (Modified) | UniqueDirty (UD) | 이 cache에만 있고 dirty |
| O (Owned) | SharedDirty (SD) | 둘 이상의 cache에 있을 수 있고 dirty |
| E (Exclusive) | UniqueClean (UC) | 이 cache에만 있고 clean |
| S (Shared) | SharedClean (SC) | 둘 이상의 cache에 있을 수 있고 clean |
| I (Invalid) | Invalid (I) | 이 cache에 없음 |

O 상태가 있으면 dirty line을 메모리에 먼저 쓰지 않고도 다른 cache와 공유할 수 있습니다. MESI의 첫 전이(M → S)에서는 dirty 데이터의 처리가 필요하지만, O에서는 한 cache가 write-back 책임을 쥔 채로 공유가 이어집니다. 같은 절의 Note는 실무적으로 중요한 한 가지를 덧붙입니다. "Data coherency is enabled only when the CPUECTLR.SMPEN bit is set"이며, data cache를 켜기 전에 SMPEN을 설정하지 않으면 다른 코어와 coherent하지 않아 "data corruption could occur"입니다. Bring-up 코드에서 이 비트 하나를 빠뜨리면 coherency가 통째로 꺼집니다.

## Snoop-Based — Bus-Based

Snoop 방식은 cache가 다른 cache의 요청을 엿듣고(snoop) 자기 사본의 상태를 바꾸는 방식입니다. 회의실에서 누가 "이 문서 고칠게요"라고 말하면 모두가 듣고 자기 출력본을 버리는 것과 같습니다.

Arm의 [CoreLink CCI-400 TRM](https://documentation-service.arm.com/static/5e8f14137100066a414f72ae)(r1p2, ARM DDI 0470H)이 이 계열의 예입니다. 1장은 CCI-400이 "up to two ACE masters, for example, Cortex-A15 or Cortex-A7 processor, and three ACE-Lite masters, for example, Mali-T604"를 연결한다고 적습니다. 2장의 "Snoop connectivity and control"은 "fully-connected snoop topology"로, 각 ACE slave interface가 다른 ACE interface를 snoop하고 ACE-Lite interface는 두 ACE interface를 snoop한다고 설명합니다. 또 snoop이 reset 시 꺼져 있어 Snoop Control Register로 켜야 한다고 적습니다.

## Directory-Based

Directory 방식은 "누가 이 line을 갖고 있는지"를 따로 기록해 두고, 필요한 cache에만 메시지를 보냅니다. 회의실 방송 대신 문서 대출 장부를 보고 빌려 간 사람에게만 연락하는 것과 같습니다.

Arm의 mesh interconnect인 CMN-600이 이 방식을 씁니다. Linux v6.12 [`Documentation/admin-guide/perf/arm-cmn.rst`](https://docs.kernel.org/admin-guide/perf/arm-cmn.html)는 CMN-600을 "a configurable mesh interconnect consisting of a rectangular grid of crosspoints (XPs)"이고 각 XP에 "AMBA CHI agents"가 붙는다고 설명합니다. Arm의 [CMN-600 TRM](https://documentation-service.arm.com/static/5fe3521b89a395015c28e485)(r3p2, 100180_0302_01_en) 2.1.3절에 따르면 HN-F(Fully coherent Home Node)는 주소 공간의 일부를 맡고, 그 안의 Snoop Filter(SF)가 "tracks cachelines that are present in the RN-Fs"이며 "favoring directed snoops over snoop broadcasts when possible"로 snoop 응답 트래픽을 줄입니다. 대출 장부가 바로 이 SF입니다.

같은 TRM의 HN-F PMU 이벤트 목록과 kernel `drivers/perf/arm-cmn.c`의 이름을 맞춰 보면 다음과 같습니다.

| `arm-cmn.c` 이벤트 | ID | CMN-600 TRM r3p2의 설명 |
|---|---|---|
| `hnf_sf_hit` | 0x06 | number of SF hits |
| `hnf_sf_evictions` | 0x07 | number of SF eviction cache invalidations initiated |
| `hnf_dir_snoops_sent` | 0x08 | number of directed snoops sent (SF back invalidation 제외) |
| `hnf_brd_snoops_sent` | 0x09 | number of multicast snoops sent (SF back invalidation 제외) |

지정 snoop(0x08)과 multicast snoop(0x09)을 따로 세므로, 두 값의 비율이 SF가 대상을 얼마나 좁혀 주는지 보여 줍니다. SF 용량이 모자라 항목을 쫓아내면 0x07이 오르고, 쫓겨난 line을 가진 cache에 back invalidation snoop이 나갑니다(같은 목록의 0x19/0x1a). 이 글에서는 CMN 하드웨어가 없어 이 이벤트를 실제로 세지 않았습니다.

## False Sharing은 Coherency의 부산물

서로 다른 thread가 서로 다른 변수만 쓰더라도 두 변수가 같은 line에 있으면, 쓸 때마다 line 소유권이 오갑니다. 같은 책상 서랍을 두 사람이 번갈아 쓰는 것과 같아서, 각자 자기 칸만 써도 서랍을 넘겨받는 시간이 듭니다.

`cohere.c`의 `fs` 모드는 두 thread가 각자 자기 counter에 5,000만 번 쓰고, 두 counter의 간격만 바꿉니다(5회 중앙값, 연산 1회당 ns).

| 두 counter 간격 | macOS 네이티브 | Linux guest (hvf) |
|---:|---:|---:|
| 8 byte (같은 line) | 1.44 | 1.20 |
| 64 byte | 0.38 | 0.41 |
| 128 byte | 0.34 | 0.39 |
| 256 byte | 0.33 | 0.39 |

같은 line에 있을 때 3~4배 느렸습니다. 흥미로운 점은 64 byte 간격에서 이미 비용이 사라졌다는 것입니다. 이 Mac의 `sysctl hw.cachelinesize`는 128이지만, 이 쓰기 패턴에서 코어 사이 충돌이 생기는 단위는 64 byte 이하였습니다. 정렬 크기는 `sysctl` 값이나 관례가 아니라 이런 측정으로 정합니다. 자세한 배치 방법은 [4-02](/blog/embedded/performance-engineering/part4-02-false-sharing)에서 다룹니다.

## Coherency Overhead 측정

Line 하나를 코어 사이에서 넘기는 비용은 ping-pong으로 직접 잴 수 있습니다. 두 thread가 한 counter를 번갈아 1씩 올리고, 상대가 올린 값을 볼 때까지 기다립니다. 100만 왕복의 결과를 한 번 넘기는 시간으로 나눴습니다(5회).

| 환경 | 한 번 넘기는 시간 (중앙값) | 범위 |
|---|---:|---:|
| Linux guest (hvf, vCPU 4개) | 42.1 ns | 38.2~51.2 ns |
| macOS 네이티브 (thread 고정 없음) | 105.9 ns | 40.5~174.8 ns |

macOS 실행에서는 thread를 코어에 고정하지 않았고, 범위가 40.5~174.8 ns로 guest보다 훨씬 넓었습니다. 최솟값(40.5 ns)은 guest의 중앙값과 비슷합니다. 두 thread가 실행마다 다른 코어 쌍(예: 같은 cluster 또는 P/E cluster)에 놓였을 가능성이 있지만, 배치를 기록하지 않았으므로 이 글에서는 원인을 확정하지 않습니다.

PMU로 보려면 Armv8 PMU의 이벤트를 씁니다. 이벤트 번호는 기억이 아니라 kernel 헤더에서 확인합니다. v6.12 `include/linux/perf/arm_pmuv3.h`의 정의입니다.

| Event | 번호 | 정의 위치 |
|---|---|---|
| `BUS_ACCESS` | 0x19 | `ARMV8_PMUV3_PERFCTR_BUS_ACCESS` |
| `REMOTE_ACCESS` | 0x31 | `ARMV8_PMUV3_PERFCTR_REMOTE_ACCESS` |
| `REMOTE_ACCESS_RD` | 0x38 | `ARMV8_PMUV3_PERFCTR_REMOTE_ACCESS_RD` |
| `BUS_ACCESS_RD` / `_WR` | 0x60 / 0x61 | `ARMV8_IMPDEF_PERFCTR_BUS_ACCESS_RD/WR` (구현 정의) |

```bash
perf stat -e r19,r31,r60 ./prog
```

같은 헤더에서 0x2A는 `L3D_CACHE_REFILL`, 0x2B는 `L3D_CACHE`, 0x2D는 `L2D_TLB_REFILL`이므로, `r2A`·`r2B`·`r2D`를 bus·remote 이벤트로 쓰면 전혀 다른 값을 읽게 됩니다. 이 글의 hvf guest에서는 PMU 이벤트를 쓸 수 없었습니다. `dmesg`가 `armv8_pmuv3_0 PMU driver, 1 (0,80000000) counters available`을 보고했고, 위 명령은 세 이벤트 모두 `<not supported>`를 출력했습니다. 위의 ping-pong과 간격 측정은 PMU 없이도 같은 질문에 답하는 방법입니다.

## NUMA — Multi-Socket Coherency

Socket이 여러 개인 시스템에서는 메모리도 socket마다 붙어 있고, coherency 메시지가 socket 사이 링크를 건넙니다. 그래서 thread와 그 thread가 쓰는 메모리를 같은 node에 두는 것이 기본입니다.

```bash
numactl --cpunodebind=0 --membind=0 ./prog
```

C에서는 libnuma의 `numa_alloc_local()`, `numa_alloc_onnode()`, `numa_set_membind()`를 씁니다(Debian libnuma-dev 2.0.19의 `/usr/include/numa.h`에서 확인). Node 사이 비용은 이 글의 환경에서 잴 수 없었습니다. Guest의 `numactl --hardware`는 `available: 1 nodes (0)`였습니다. NUMA 배치와 측정은 [4-10](/blog/embedded/performance-engineering/part4-10-smp-analysis#numa-aware-allocation)에서 이어집니다.

## CXL — Compute Express Link

CXL은 PCIe 물리 계층 위에서 coherent 접근을 제공하는 interconnect입니다. [CXL 3.1 Specification](https://computeexpresslink.org/) 3.2.1절은 CXL.cache를 "the interactions between the device and host"를 요청·응답·데이터 채널로 정의하는 프로토콜로 설명하고, 3.3.1절은 CXL.mem을 "a transactional interface between the CPU and Memory"로 정의합니다.

- **CXL.cache** — 장치가 host 메모리를 coherent하게 cache할 때 쓰는 프로토콜입니다.
- **CXL.mem** — host CPU가 장치에 붙은 메모리에 접근하는 프로토콜이며, 3.3.1절은 메모리 컨트롤러가 host에 있든, 가속기에 있든, 별도 버퍼 칩에 있든 쓸 수 있다고 적습니다.

CXL의 타입, 지연, Linux 지원은 [3-11: CXL Interconnect](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)에서 다룹니다.

## ARM ACE와 CHI

| Interface | 이 글에서 확인한 역할 |
|---|---|
| ACE | CCI-400에서 CPU cluster(예: Cortex-A15, A7)가 붙는 fully coherent 포트, 서로 snoop |
| ACE-Lite | CCI-400에서 GPU 같은 master(예: Mali-T604)가 붙는 포트, ACE 포트를 snoop하지만 자신은 snoop되지 않음 |
| CHI | CMN-600 mesh의 crosspoint에 붙는 agent 인터페이스, HN-F의 snoop filter가 지정 snoop을 우선 |

ACE-Lite 줄의 "자신은 snoop되지 않음"은 CCI-400 TRM이 snoop 대상을 ACE slave interface로만 적은 데서 나온 것입니다.

## Coherency 비활성화

Coherency는 꺼질 수도 있습니다. 앞에서 본 대로 Cortex-A53은 CPUECTLR.SMPEN이 꺼져 있으면 data cache가 다른 코어와 coherent하지 않습니다. CCI-400은 reset 시 snoop이 꺼져 있어 software가 Snoop Control Register로 켜야 합니다. 두 경우 모두 bring-up 코드의 설정 누락이 "가끔 값이 틀리는" 버그로 나타납니다.

Coherent하지 않은 장치(DMA)와 데이터를 주고받을 때는 software가 cache를 직접 관리합니다. Cortex-M7은 CMSIS 5.9.0 `cachel1_armv7.h`의 `SCB_CleanDCache_by_Addr()`(358행)와 `SCB_InvalidateDCache_by_Addr()`(328행)를 씁니다.

## False Sharing 측정 — perf c2c

`perf c2c`는 false sharing을 cache line 단위로 찾아 주는 도구입니다. v6.12 `tools/perf/Documentation/perf-c2c.txt`는 이 도구를 "Shared Data C2C/HITM Analyzer"라고 부르고, x86에서는 HITM(다른 코어의 Modified line을 읽음) 이벤트를 쓰며, Arm64에서는 SPE(Statistical Profiling Extension)를 쓰고 기본 표시가 HITM 대신 "peer" snoop 모드라고 적습니다.

```bash
perf c2c record -- ./prog
perf c2c report
```

SPE가 없는 이 글의 hvf guest에서 `perf c2c record`는 다음처럼 실패했습니다.

```text
failed: no PMU supports the memory events
```

그래서 이 글의 false sharing 증거는 위의 간격별 측정입니다. SPE가 있는 Arm 서버나 x86 서버라면 `perf c2c report`가 line 주소와 접근한 소스 위치를 함께 보여 줍니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Cortex-M7 cache와 DMA

```c
SCB_CleanDCache_by_Addr(tx_buf, len);        /* CPU가 쓴 데이터를 메모리로 */
start_dma_tx(tx_buf, len);
/* ... DMA 수신 완료 후 ... */
SCB_InvalidateDCache_by_Addr(rx_buf, len);   /* cache의 옛 사본 버리기 */
```

Cortex-M7의 data cache는 DMA controller와 coherent하지 않으므로 송신 전 clean, 수신 후 invalidate를 명시합니다. 두 함수는 CMSIS 5.9.0 `cachel1_armv7.h`에 정의돼 있습니다.

> ⚠️ False sharing 무시

같은 line에 있는 counter 두 개만으로 쓰기 비용이 3~4배가 됐습니다. 패딩 크기는 대상 하드웨어에서 간격을 바꿔 가며 확인합니다.

> ⚠️ NUMA-unaware allocation

```c
buf = malloc(huge);   /* 기본 정책: page를 할당(첫 접근)한 CPU의 node */
```

v6.12 `Documentation/admin-guide/mm/numa_memory_policy.rst`에 따르면 부팅 후 기본 정책은 "local allocation"이고, 이는 "the node containing the cpu where the allocation takes place"에서 시작합니다. 그래서 초기화 thread가 버퍼 전체를 먼저 건드리면 다른 node의 worker도 그 node 메모리를 쓰게 됩니다. 다른 node의 thread가 주로 쓸 버퍼라면 `numa_alloc_onnode()`로 그 node에 할당합니다.

> ⚠️ PMU 이벤트 번호를 기억으로 쓰기

`r2A`(L3D_CACHE_REFILL)를 bus 이벤트로 착각하는 것처럼, raw 번호는 `arm_pmuv3.h`나 `perf list`에서 확인합니다.

## 측정 — 실측 결과

이 글의 수치는 두 프로그램에서 나왔습니다.

| 프로그램 | 명령 | 결과 |
|---|---|---|
| `cohere.c` ping-pong | `./cohere pingpong 1000000` (5회) | guest 42.1 ns, macOS 105.9 ns(범위 40.5~174.8) |
| `cohere.c` false sharing | `./cohere fs <8\|64\|128\|256> 50000000` (5회) | 같은 line 1.20~1.44 ns, 분리 0.33~0.41 ns |
| PMU / c2c 확인 | `perf stat -e r19,r31,r60`, `perf c2c record` | hvf guest에서 미지원(위 출력) |

모든 false sharing 실행에서 두 counter의 최종값이 5,000만으로 정확했습니다. 측정은 다른 작업과 공유한 호스트에서 했으므로(load average 약 20) 중앙값과 범위를 함께 적었습니다. Cross-cluster 비용을 정확히 나누려면 thread를 코어에 고정할 수 있는 Linux 실기기에서 `taskset`으로 코어 쌍마다 ping-pong을 반복합니다.

## 정리

- MESI의 M → S 전이는 dirty 데이터를 다른 코어로 옮기며, 그 이동 한 번이 이 환경에서 약 42 ns였습니다.
- Cortex-A53은 TRM 6.2.5절대로 MOESI를 쓰고, O(SharedDirty)로 dirty line을 메모리 쓰기 없이 공유합니다. CPUECTLR.SMPEN이 꺼져 있으면 coherency 자체가 없습니다.
- CCI-400은 ACE master 2개와 ACE-Lite master 3개를 fully-connected snoop으로 묶고, CMN-600은 HN-F snoop filter로 broadcast 대신 지정 snoop을 우선합니다.
- 같은 line의 counter 두 개는 쓰기를 3~4배 느리게 했고, M2에서는 64 byte 간격으로 충분했습니다.
- PMU raw 번호는 `arm_pmuv3.h`에서 확인합니다(BUS_ACCESS 0x19, REMOTE_ACCESS 0x31). 0x2A는 L3D_CACHE_REFILL입니다.
- `perf c2c`는 Arm64에서 SPE가 필요하고, 이 hvf guest에서는 동작하지 않았습니다.

다음 편은 **SMP 성능 분석** — 코어별 부하와 affinity, scalability를 살펴봅니다.

## 관련 항목

- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [4-10: SMP 분석](/blog/embedded/performance-engineering/part4-10-smp-analysis)
