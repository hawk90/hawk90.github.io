---
title: "Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유"
slug: "embedded/hardware/cxl/chapter04-pooling-gfam"
date: 2026-05-16T09:04:00
description: "CXL 2.0 pooling, CXL 3.x fabric, GFAM (Global Fabric Attached Memory)."
series: "CXL 4.0 Internals"
seriesOrder: 4
tags: [cxl, memory-pooling, gfam, fabric, fabric-manager]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL은 *단계적으로 multi-host 메모리 공유*를 넓혀 왔습니다."** — *2.0 pooling*은 영역마다 host 하나가 쓰는 *pooled memory*, *3.0*은 여러 host가 한 영역을 동시에 쓰는 *Shared FAM*과 *fabric*, 그리고 PBR로 더 크게 확장하는 *G-FAM*입니다. *Fabric Manager*와 *PBR(Port Based Routing)*이 그 메커니즘입니다.

[Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)·[Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 *디바이스 분류와 일관성*을 봤습니다. 이 장은 *디바이스 한 대*에서 *데이터센터 전체 토폴로지*로 시야를 확장합니다.

## 토폴로지 진화 단계

CXL은 *세 단계*로 *multi-host 메모리 공유*를 진화시켰습니다.

| 단계 | CXL 버전 | 토폴로지 | 특징 |
|------|---------|---------|------|
| **Direct Attach** | 1.1 | 호스트 1 ↔ 디바이스 1 | 단순. PCIe 카드 한 장 |
| **Switching·Pooling** | 2.0 | 호스트 N ↔ Switch ↔ 디바이스 N | fan-out, host별 LD 할당 |
| **Fabric** | 3.0 / 3.x | 호스트 N ↔ Multi-level Switch ↔ 디바이스 M | coherent multi-host, GFAM |

각 단계가 *해결하는 문제*:

- 1.1: *"메모리를 확장하고 싶다"*
- 2.0: *"디바이스를 여러 host가 공유하고 싶다"*
- 3.x: *"데이터센터 전체를 메모리 풀로 만들고 싶다"*

## CXL 2.0 Switching — Fan-out

CXL 2.0의 *single-level switch*는 *한 host*가 *여러 CXL 디바이스*를 *한 PCIe 포트로* 묶을 수 있게 합니다.

| 구성 요소 | 역할 |
|---------|------|
| Host CPU | CXL 2.0 link (PCIe 5.0 x16) |
| CXL Switch | 1대, 여러 downstream port |
| Memory Devices | 각 port에 attach |

memdev·region과 NUMA node는 서로 다른 객체입니다. decoder interleave는 주소 분산을 구성하고, NUMA topology와 System RAM 노출은 firmware의 proximity 정보와 OS 메모리 관리 조건도 따릅니다. “장치 하나당 NUMA node 하나” 또는 “interleave region 하나면 NUMA node 하나”라는 보편 대응은 두지 않습니다.

## CXL 2.0 Pooling — Multi-Host LD

Pooling에서는 같은 물리 디바이스의 서로 다른 영역을 host별로 전용 할당할 수 있습니다. 여러 host가 각자 할당받은 LD를 동시에 사용하는 것과 한 영역을 여러 host가 동시에 공유하는 것은 다릅니다.

| 요소 | 의미 |
|------|------|
| Logical Device (LD) | 디바이스 메모리의 *논리적 분할 단위* |
| LD-ID | host·디바이스 양쪽에서 LD 식별 |
| 전용 할당 | 해당 pooled 영역은 한 host interface에 전용으로 배정합니다. |
| Re-allocation | 워크로드 변화에 따라 *동적 재할당* |

가상 운영 예입니다. 2 TB를 512 GB씩 나누었다고 가정하며, 실제 장치의 지원 단위나 FM 명령 결과는 아닙니다. 회수·재할당 사이에는 다음과 같은 host 측 준비가 필요합니다.

| 단계 | LD0의 예 | 확인할 조건 |
|---|---|---|
| 사용 중 | Host A에 배정 | 페이지·DAX mapping·DMA 등 실제 사용자 추적 |
| 반환 준비 | A가 사용을 중지 | OS offline·unmap·cache·데이터 수명과 오류 처리 |
| 회수 | FM이 배정을 변경 | 이전 접근이 중단되었고 필요한 격리·데이터 정리가 완료됨 |
| 새 배정 | Host C에 제공 | C의 decoder·OS 매핑과 사용 가능 상태 확인 |

Fabric Manager가 구성 명령을 내리는 것과 운영체제가 사용 중인 메모리를 안전하게 반환하는 것은 서로 다른 작업입니다. 여기서는 실제 메모리를 offline하거나 LD를 bind/unbind하지 않습니다.

## CXL 3.0 Fabric — Coherent Multi-Host

CXL 3.0 계열은 multi-host가 같은 영역에 접근하는 Shared FAM과 fabric 기능을 추가합니다. 영역의 hardware/software coherency 모델과 참여 host의 지원 조건이 맞아야 하며, 모든 공유 영역에 hardware coherence가 자동으로 생기는 것은 아닙니다.

| 구성 요소 | 역할 |
|---------|------|
| Multi-level Switch | PBR로 라우팅, multi-hop fabric 가능 |
| Fabric Manager | 구성 정책·명령과 topology 관리. 실제 관리 transport는 별도 확인합니다. |
| Shared FAM | 여러 host가 *한 HDM 영역에 동시 접근* |
| BISnp | HDM-DB 영역에서 device가 host cache를 snoop·무효화 |

기존 2.0과의 차이:

| 항목 | 2.0 Pooling | 3.0 Fabric |
|------|------------|-----------|
| 공유 모델 | 영역마다 host 하나 (pooled) | 여러 host가 한 영역 (Shared FAM) 추가 |
| Coherency | 단일 host | Shared FAM은 hardware(HDM-DB) 또는 software 모델 |
| Routing | HBR (Hierarchy Based Routing) | PBR (Port Based Routing) 추가 |
| 토폴로지 | single-level | multi-level |

## GFAM — Global Fabric Attached Memory

규격은 여러 host에 노출되는 HDM을 *FAM(Fabric-Attached Memory)*이라 부릅니다. LD로 노출하면 *LD-FAM*, *PBR 링크를 써서 더 확장성 있게* 노출하면 *G-FAM(Global-FAM)*입니다(CXL 3.1 §2.4.3).

| 특성 | 의미 |
|------|------|
| 접근 | G-FAM 디바이스(GFD)는 여러 host·peer의 요청을 받고, 요청의 *Source PBR ID(SPID)*로 누구의 요청인지 구분 |
| 주소 변환 | GFD 안의 *GFD decoder*가 HPA를 DPA로 변환 |
| 일관성 | 여러 host가 일관성을 공유하려면 HDM-DB를 씀 |
| QoS | host·peer별 QoS 한도를 둘 수 있음 |

G-FAM의 가치는 *원래 network로 주고받던 데이터*를 *load/store로 접근*할 수 있게 되는 데 있습니다.

## PBR — Port-Based Routing

CXL switch에는 *HBR(Hierarchy Based Routing)* switch와 *PBR(Port Based Routing)* switch가 있습니다. HBR은 PCIe 같은 *계층 구조*를 따라 라우팅합니다. PBR은 메시지에 실린 *PBR ID(SPID·DPID)*와 라우팅 테이블로 라우팅해, 계층 구조에 묶이지 않는 fabric을 만듭니다.

| 라우팅 | 방식 | 적용 |
|--------|------|------|
| HBR | 계층 구조 기반 | 트리형 토폴로지 |
| PBR | PBR ID + 라우팅 테이블 | 다단계 fabric |

PBR이 있어야 계층 구조를 벗어난 *큰 fabric*을 만들 수 있습니다.

## Fabric Manager: 논리적 관리와 실제 transport

지금까지 본 pooling에는 *누가 LD를 어느 host에 붙일지 정하는가*라는 빈칸이 있습니다. 그 자리를 채우는 것이 *Fabric Manager (FM)*입니다.

[규격(CXL 3.1 §7.6.1)](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)은 FM을 *재구성이 필요한 시점을 정하고 구성 명령을 내리는 논리적 프로세스*로 정의합니다. 형태는 정해져 있지 않습니다. host에서 도는 소프트웨어, BMC의 embedded software, 다른 CXL 디바이스나 switch의 펌웨어, 디바이스 안의 state machine 어느 것이든 될 수 있습니다. FM은 규격의 *FM API* 명령으로 디바이스와 switch를 구성합니다.

§2.9와 §7.6.2는 CCI를 mailbox 또는 MCTP-capable interface로 노출하는 경로를 설명합니다. MCTP도 PCIe VDM의 in-band 경로와 별도 관리 interconnect의 out-of-band 경로를 구분해야 합니다. FM이 BMC에서 실행된다는 사실만으로 모든 명령이 out-of-band라고 판정하지 않습니다.

FM의 spec 정의(§7.6.1), FM API가 CCI로 전달되는 경로, bind·unbind 흐름은 [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric#fabric-manager)에서 다룹니다.

## 운영 사례 — hyperscale 도입

공개된 대표 연구는 두 가지입니다.

| 연구 | 내용 |
|------|------|
| [Pond (ASPLOS 2023)](https://arxiv.org/abs/2203.00241v4) | 클라우드 trace 기반 설계와 158 workload 평가. 논문 조건에서 DRAM 비용 7% 절감과 같은 NUMA node 기준 1~5% 이내 성능 차이를 보고합니다. |
| [TPP (ASPLOS 2023)](https://arxiv.org/abs/2206.02878v2) | OS 수준 hot/cold 페이지 배치. 논문 조건에서 기본 Linux보다 18%, NUMA Balancing·AutoTiering 등을 포함한 비교 대상보다 5~17% 성능 향상을 보고합니다. |

이 결과는 논문의 장치·배치 정책·workload와 비교 기준에 한정되며 상용 cloud 전체의 절감률이 아닙니다. 세부 비용·수요 모델은 [HBM Ch 12](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서 구분합니다.

별도 상용 발표로 [Astera Labs의 2025년 11월 18일 자료](https://ir.asteralabs.com/news-releases/news-release-details/astera-labs-leo-cxl-smart-memory-controllers-microsoft-azure-m)는 Azure M-series의 CXL 메모리 확장 **private preview**를 설명합니다. 당시 preview 발표는 전체 서비스의 GA나 multi-host coherent fabric 배치를 증명하지 않습니다.

## Composability — 데이터센터 비전

CXL 컨소시엄은 3.x의 방향을 *메모리와 가속기를 분리해 조합하는 composable fabric*으로 설명합니다.

**고정 구성의 제약**: 서버별 물리 자원 비율 때문에 한 서버의 여유를 다른 서버에 바로 제공하기 어려울 수 있습니다. 가상화·migration 등 기존 소프트웨어 수단까지 불가능하다는 뜻은 아닙니다.

**Composable — 동적 조합**: 자원을 종류별 풀로 나눠 두고, 워크로드가 시작할 때 필요한 만큼 빌리고 끝날 때 돌려줍니다.

이 그림은 *fabric, Fabric Manager, 이를 다루는 OS*가 함께 갖춰져야 성립합니다.

## 자주 하는 실수

### "CXL 2.0 pooling = CXL 3.0 fabric"

*다릅니다*. 2.0 pooling은 영역마다 *host 하나*입니다. 3.0은 여러 host가 *한 영역에 동시 접근*하는 Shared FAM과 PBR fabric을 더했습니다.

### "GFAM은 멀티 host가 자유롭게 read/write"

일관성 모델에 달렸습니다. FM이 영역마다 *hardware coherency*(HDM-DB, write는 소유권을 먼저 얻는 2단계) 또는 *software-managed coherency*를 지정합니다. software 모델이면 host 간 소프트웨어 ownership·flush/invalidate와 동기화 조건이 필요합니다. §2.4.4의 No Clean Writebacks 관련 조건 등도 확인해야 하며, 단순히 같은 주소를 mmap하는 것만으로 충분하지 않습니다.

### "Fabric Manager는 single point of failure"

FM의 형태는 규격이 정하지 않습니다. host 소프트웨어, BMC, switch 펌웨어 등 어디서든 돌 수 있으므로, 가용성은 FM의 배치뿐 아니라 상태 저장·중복 제어 방지·복구 정책·공유 관리 경로를 포함한 설계 문제입니다. 구현 위치가 자유롭다는 사실이 single point of failure를 제거하지는 않습니다.

### "PBR fabric은 정해진 토폴로지만 된다"

규격(§7.7)은 PBR fabric 토폴로지를 *정해 두지 않습니다*. *deadlock-free routing을 찾을 수 있는 토폴로지*면 됩니다. 규격이 드는 예는 PCIe 같은 tree, fat tree(folded Clos), mesh, ring, star, butterfly, HyperX와 그 조합입니다.

### "CXL fabric이 NVLink을 대체한다"

*용도가 다릅니다*. NVLink는 *GPU 간 고대역폭·저지연*. CXL fabric은 *general purpose memory*. *공존*이 *현실*입니다.

## 정리

- CXL은 *Direct → Switching → Fabric*의 *3단계 진화*를 통해 *single device에서 datacenter 전체*로 확장됩니다.
- *CXL 2.0 switching·pooling*은 *LD 단위로 영역을 host에 배정*합니다. 배정은 Fabric Manager가 FM API로 합니다.
- *CXL 3.0*은 *Shared FAM*(여러 host 동시 접근)과 *PBR fabric*을 더했습니다. HBR은 Hierarchy Based Routing, PBR은 Port Based Routing입니다.
- *G-FAM*은 PBR 링크로 확장성 있게 노출한 FAM이고, GFD decoder가 HPA를 DPA로 변환합니다.
- PBR fabric 토폴로지는 *deadlock-free routing*만 찾으면 자유롭습니다.
- 공개 연구로는 Pond(풀링 비용 절감)와 TPP(OS 수준 tiering)가 있습니다.

## 다음 편

[Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *CXL 4.0이 3.x 위에 더한 운용 기능*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric) — Switch 내부 동작과 FM 통신 프로토콜
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 spec, Pond·TPP 논문(ASPLOS 2023)를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
