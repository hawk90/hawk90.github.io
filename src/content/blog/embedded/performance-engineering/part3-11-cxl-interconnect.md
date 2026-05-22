---
title: "3-11: CXL·Interconnect — AI 시대 메모리 대역폭"
date: 2026-05-08T10:00:00
description: "CXL 2.0/3.1과 Neoverse V2가 만든 cache-coherent interconnect. CXL.io·CXL.cache·CXL.mem 세 프로토콜, Type 1/2/3 디바이스, latency·대역폭의 현실."
series: "Embedded Performance Engineering"
seriesOrder: 29
tags: [cxl, interconnect, memory-bandwidth, ai, neoverse, accelerator]
---

## 한 줄 요약

> **"CXL은 PCIe 위에 cache coherency를 올린 interconnect입니다."** — CPU·가속기·메모리 풀이 *같은 주소 공간*을 공유하면서도 PCIe 인프라를 그대로 씁니다.

## 어떤 문제를 푸는가

전통적인 PCIe 가속기는 *별도 주소 공간*에 살고, CPU와 데이터를 주고받으려면 매번 DMA를 명시적으로 돌려야 합니다. GPU에 텐서를 올렸다가 결과를 받아오는 코드를 떠올려 보면 `cudaMemcpy`가 줄줄이 등장하는 이유가 여기 있습니다. CPU와 가속기가 같은 자료구조를 *coherent하게* 볼 수 없기 때문입니다.

AI 워크로드는 이 한계를 점점 더 아프게 건드립니다. 모델 파라미터가 GPU HBM에 다 들어가지 않고, CPU DRAM에서 frequent하게 swap이 필요합니다. PCIe 5.0의 *32 GB/s* 양방향 대역폭으로는 turn-around가 한계입니다. 데이터 이동을 줄이거나 *없애야* 합니다.

CXL(Compute Express Link)은 이 문제를 두 방향으로 해결합니다. 첫째, *cache coherency를 hardware에 위임*해서 DMA 없이도 CPU·가속기가 같은 메모리를 봅니다. 둘째, *memory expansion*과 *pooling*을 가능하게 만들어서 한 서버가 수 TB의 unified memory를 쓸 수 있게 합니다.

이 글에서는 CXL의 세 프로토콜, Type 1/2/3 디바이스 분류, ARM Neoverse V2의 CHI-E와의 통합, 그리고 latency·대역폭의 실측 의미를 살펴봅니다.

## CXL 세대별 정리

| 세대 | 발표 | 기반 PCIe | 대역폭 (x16) | 주요 추가 |
|---|---|---|---|---|
| 1.1 | 2019 | PCIe 5.0 | 64 GB/s | 세 프로토콜, Type 1/2/3 |
| 2.0 | 2020 | PCIe 5.0 | 64 GB/s | switch, memory pooling, hot-plug |
| 3.0 | 2022 | PCIe 6.0 | 128 GB/s | fabric, peer-to-peer, multi-level switch |
| 3.1 | 2023 | PCIe 6.0 | 128 GB/s | TSP(Trusted Security Protocol), fabric 확장 |

CXL 1.x는 *direct attach*만 가능했지만 2.0의 switch 도입으로 *one-to-many fanout*과 *memory pool* 구성이 가능해졌습니다. 3.x는 fabric으로 발전해 *수십 개 노드*가 같은 메모리를 공유할 수 있습니다.

## 세 프로토콜 — CXL.io·cache·mem

CXL 링크 위에는 세 프로토콜이 *동시에* 흐릅니다. PCIe 5.0 PHY를 공유하면서 트래픽 타입에 따라 다른 의미를 가집니다.

| 프로토콜 | 용도 | 비유 |
|---|---|---|
| CXL.io | discovery, configuration, DMA | 기존 PCIe와 동일 |
| CXL.cache | device가 host memory를 coherent하게 cache | accelerator → CPU 메모리 읽기/쓰기 |
| CXL.mem | host가 device memory를 coherent하게 access | CPU → expander DRAM 직접 접근 |

CXL.io는 *모든 디바이스에 필수*입니다. PCIe 호환 enumeration을 위해서입니다. CXL.cache와 CXL.mem은 디바이스 *타입에 따라 선택적*입니다.

![CXL 세 프로토콜 — PCIe 5.0 PHY 위에서 시분할](/images/blog/perf-eng/diagrams/part3-11-cxl-protocols.svg)

세 채널이 *Flex Bus* 위에서 시분할로 흐르고, 트랜잭션 종류에 따라 protocol layer가 라우팅합니다.

## Type 1/2/3 디바이스

CXL 디바이스는 어떤 프로토콜을 쓰느냐로 세 분류로 나뉩니다.

| Type | 프로토콜 | 예시 | 특징 |
|---|---|---|---|
| Type 1 | CXL.io + CXL.cache | NIC, accelerator without local memory | host memory를 coherent하게 캐시 |
| Type 2 | CXL.io + CXL.cache + CXL.mem | GPU, FPGA with HBM | 양방향 coherent (host ↔ device memory) |
| Type 3 | CXL.io + CXL.mem | memory expander (CXL DDR module) | host에서만 access, device는 dumb memory |

Type 2가 가장 흥미롭습니다. GPU가 자기 HBM도 가지고 있으면서 CPU DRAM도 coherent하게 cache할 수 있습니다. 데이터 이동 없이도 *진짜 unified memory*가 가능해집니다.

Type 3는 데이터센터에서 *DRAM bottleneck 완화*에 쓰입니다. CPU 소켓의 DIMM slot 수가 모자랄 때 CXL.mem expander로 *수 TB*를 추가할 수 있습니다.

세 타입의 topology와 어떤 프로토콜이 어디로 흐르는지 한 그림으로 정리하면 다음과 같습니다.

![CXL Type 1/2/3 device topology — accelerator, accelerator+mem, memory expander](/images/blog/perf-eng/diagrams/part3-11-cxl-types.svg)

## Neoverse V2와 CHI-E

ARM Neoverse V2(2023)는 서버급 코어로, *CHI-E*(Coherent Hub Interface, Enhanced) interconnect 위에 올라갑니다. CHI-E는 CXL과 직접 mapping이 가능하게 설계되었습니다.

![Neoverse V2 + CHI-E + CXL 연결 구조](/images/blog/perf-eng/diagrams/part3-11-neoverse-chi.svg)

CHI-E는 *directory-based coherency*입니다(4-09편 참고). Snoop broadcast 없이 *home node*가 누가 cache 보유 중인지 추적합니다. CXL.cache 트랜잭션이 들어오면 home node가 *device를 cache holder로 등록*하고, host CPU의 invalidate가 발생하면 CXL link로 message를 보내 device cache를 갱신합니다.

이 설계 덕분에 *64 코어 + 다수 CXL Type 2 디바이스*가 같은 coherency domain에 들어갈 수 있습니다.

## 코드 — Type 3 expander 인식

Linux에서 CXL.mem expander는 *별도 NUMA node*로 인식됩니다.

```bash
# CXL memory device 확인
$ ls /sys/bus/cxl/devices/
mem0  port1  root0  decoder0.0

# NUMA topology
$ numactl --hardware
available: 3 nodes (0-2)
node 0 cpus: 0-31
node 0 size: 128000 MB        # local DRAM
node 1 cpus: 32-63
node 1 size: 128000 MB        # 다른 socket DRAM
node 2 cpus:                  # CPU 없음 — CXL memory only
node 2 size: 524288 MB        # 512 GB CXL expander
node distances:
node   0   1   2
  0:  10  21  35              # CXL = local의 3.5x
  1:  21  10  35
  2:  35  35  10
```

CXL expander는 *coreless NUMA node*입니다. 거리(latency proxy)가 local DRAM의 *3배 이상*입니다. 자주 쓰는 데이터는 local, cold 데이터를 CXL에 두는 *tiered memory* 전략이 자연스럽습니다.

## 측정 — Latency penalty

대표적인 측정값입니다. 서버급 플랫폼 기준이며 디바이스 세대에 따라 차이가 큽니다.

| 메모리 종류 | Read latency | Write latency |
|---|---|---|
| Local DRAM | 80 ns | 80 ns |
| Remote socket DRAM (NUMA) | 130 ns | 130 ns |
| CXL.mem expander (direct) | 170 ns | 170 ns |
| CXL.mem expander (switch 경유) | 230 ns | 230 ns |
| CXL.cache (device → host) | 200 ns | 250 ns |

CXL.mem direct는 *remote socket DRAM과 비슷한 수준*입니다. Switch가 끼면 *2x*까지 늘어납니다. CXL.cache는 coherency 트랜잭션 자체가 더 비싸기 때문에 mem보다 *살짝 더 느립니다*.

```c
// 간단한 latency 측정
void measure_latency(void *buf, size_t size) {
    uint64_t start, end;
    volatile uint64_t *p = buf;
    asm volatile("mrs %0, cntvct_el0" : "=r"(start));
    for (int i = 0; i < 1000000; i++) {
        p = (uint64_t *)*p;     // pointer chase — cache miss 강제
    }
    asm volatile("mrs %0, cntvct_el0" : "=r"(end));
    printf("Avg latency: %lu ns\n", (end - start) / 1000000);
}
```

Buf를 local·remote·CXL에 각각 할당해 비교하면 위 표와 비슷한 결과가 나옵니다.

## 대역폭 — Peak vs Sustained

CXL 2.0 x16 링크는 *peak 64 GB/s*입니다. 하지만 실측 sustained는 그보다 한참 낮습니다.

```text
CXL 2.0 x16
  Peak (PCIe 5.0):    64 GB/s
  FLIT overhead:     -10%
  Protocol overhead: -15%
  Effective peak:    ~48 GB/s
  Sustained random:  ~30 GB/s
```

여러 요인이 겹칩니다.

- *FLIT(68-byte)* 단위 전송이라 64-byte cache line에 4 byte overhead가 붙습니다.
- CXL.cache·CXL.mem이 *같은 PHY를 시분할*하므로 두 트래픽이 섞이면 효율이 떨어집니다.
- Switch 경유 시 추가 hop마다 *queueing delay*가 누적됩니다.

Peak 숫자만 보고 설계하면 실측에서 *60% 수준*만 나옵니다. 처음부터 sustained 기준으로 헤드룸을 잡습니다.

## Embedded·Edge AI 영향

CXL은 데이터센터 기술처럼 보이지만 embedded·edge에도 영향을 미칩니다.

- *NVIDIA Grace Hopper Superchip*은 Grace CPU(Neoverse V2)와 Hopper GPU를 *NVLink-C2C*로 연결합니다. NVLink-C2C는 CXL과 비슷한 cache coherency 모델을 제공합니다. Edge AI 박스에서도 같은 패러다임이 등장합니다.
- *자동차 SDV(Software-Defined Vehicle)*에서 zonal controller가 *AI 가속기 + 비전 ISP + CPU 클러스터*를 한 박스에 묶을 때 CXL-class interconnect가 후보로 거론됩니다. Coherency가 manual DMA를 제거합니다.
- *5G O-RAN*의 baseband processing은 PHY 가속기 + ARM 코어 + L1 메모리 풀로 구성되는데, CXL이 이 분리된 자원을 *unified pool*로 묶는 인프라가 될 수 있습니다.

Embedded 엔지니어 입장에서 당장의 작업은 아니지만, *5년 뒤 자기 도메인의 SoC가 어떻게 변할지* 이해하는 데 도움이 됩니다.

## CXL.cache 트랜잭션 흐름

CXL.cache는 *MESI 같은 coherency 프로토콜*을 device-host 간에 확장합니다.

```text
Device가 cache line X를 읽으려고 함:
  1. Device → host: CXL.cache Read request
  2. Host home node: 다른 cache가 가지고 있나? snoop
  3. Host → device: data + state (E or S)
  4. Device cache: line X를 E/S 상태로 저장

Host CPU가 같은 line X에 write:
  1. Host home node: device가 cache holder
  2. Host → device: CXL.cache Invalidate
  3. Device → host: ack
  4. Host CPU: write 진행, line → M
```

각 트랜잭션이 *왕복 ~200 ns*입니다. Tight loop 안에서 host·device가 *번갈아 같은 line을 건드리면* coherency ping-pong이 발생해 성능이 무너집니다. False sharing이 CXL 위에서 *수십 배 더 비싸게* 나타납니다.

## 자주 보는 함정과 안티패턴

> ⚠️ CXL.cache에서 false sharing

같은 64-byte 라인을 host와 device가 *번갈아* 쓰면 매번 200 ns 왕복이 발생합니다. Local DRAM 대비 1000x 이상 느릴 수 있습니다. `alignas(64)`로 라인을 분리하고, *디바이스가 쓰는 영역*과 *호스트가 쓰는 영역*을 page 단위로 나누는 게 안전합니다.

> ⚠️ CXL.mem을 hot data 저장소로 사용

CXL.mem expander는 *cold tier*입니다. Hot working set을 CXL에 두면 매 access마다 170+ ns가 들어 cache miss penalty가 폭증합니다. `numactl --membind`나 `mbind()`로 hot allocation을 local node에 고정합니다.

> ⚠️ Peak 대역폭 가정

64 GB/s를 그대로 가정하고 throughput 모델을 세우면 *실측 30 GB/s*에서 절반밖에 안 나옵니다. 처음부터 *sustained 60%* 기준으로 설계합니다.

> ⚠️ Switch hop 수 무시

CXL 2.0/3.x switch는 hop당 *30~50 ns* latency를 추가합니다. 3-hop fabric에서는 single-hop 대비 *2x latency*가 됩니다. Topology 설계 시 hop 수가 critical path에 들어가는지 확인합니다.

> ⚠️ Type 2 디바이스의 device memory를 host가 자주 read

Type 2 GPU·FPGA의 HBM/LPDDR이 host에서 보이긴 하지만 *host → device 방향은 latency가 큽니다*. Bulk transfer가 필요하면 CXL.io DMA가 여전히 유리한 경우가 많습니다.

## 정리

- CXL은 PCIe 5.0/6.0 PHY 위에 cache coherency를 올린 interconnect입니다.
- 세 프로토콜(CXL.io, CXL.cache, CXL.mem)이 같은 링크에서 시분할로 흐릅니다.
- Type 1은 가속기, Type 2는 메모리 가진 가속기, Type 3은 메모리 expander입니다.
- ARM Neoverse V2의 CHI-E가 CXL과 자연스럽게 mapping되어 수십 코어급 coherency domain을 만듭니다.
- 실측 latency는 local DRAM의 2~3배, sustained 대역폭은 peak의 60% 수준입니다.
- False sharing이 CXL.cache 위에서 수십 배 더 비싸지므로 line 분리가 중요합니다.
- Edge AI·SDV·O-RAN 등 embedded 영역에서도 같은 패러다임이 점점 등장합니다.

다음 편은 **3-12: 차세대 SoC 트렌드** — chiplet, 3D stacking, near-memory compute를 정리합니다.

## 관련 항목

- [3-01: Bus Architecture — AMBA·AXI·CHI](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [4-09: Cache Coherency — MESI·MOESI](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [3-10: Thermal과 DVFS](/blog/embedded/performance-engineering/part3-10-thermal)
