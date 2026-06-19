---
title: "Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유"
date: 2026-05-16T09:04:00
description: "CXL 2.0 pooling, CXL 3.x fabric, GFAM (Global Fabric Attached Memory)."
series: "CXL 4.0 Internals"
seriesOrder: 4
tags: [cxl, memory-pooling, gfam, fabric, fabric-manager]
draft: false
---

## 한 줄 요약

> **"CXL은 *세 단계의 multi-host 메모리 공유*를 정의합니다."** — *2.0 pooling*은 *time-share*, *3.0 fabric*은 *coherent simultaneous share*, *3.x GFAM*은 *fabric 전역 메모리 풀*입니다. 각 단계는 *Fabric Manager·PBR·Coherency Domain*이라는 *새 메커니즘*을 도입합니다. *Composable Datacenter*의 종착점입니다.

[Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)·[Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 *디바이스 분류와 일관성*을 봤습니다. 이 장은 *디바이스 한 대*에서 *데이터센터 전체 토폴로지*로 시야를 확장합니다.

## 토폴로지 진화 단계

CXL은 *세 단계*로 *multi-host 메모리 공유*를 진화시켰습니다.

| 단계 | CXL 버전 | 토폴로지 | 특징 |
|------|---------|---------|------|
| **Direct Attach** | 1.1 | 호스트 1 ↔ 디바이스 1 | 단순. PCIe 카드 한 장 |
| **Switching·Pooling** | 2.0 | 호스트 N ↔ Switch ↔ 디바이스 N | fan-out, multi-LD time-share |
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

*Host CPU 입장*에서는 *여러 mem device*가 *각각 별도 NUMA 노드*로 보이거나, *HDM Decoder의 interleave region*으로 *하나의 큰 NUMA로 묶을 수* 있습니다.

## CXL 2.0 Pooling — Multi-Host LD

같은 디바이스를 *여러 host가 시간 분할*해 사용하는 게 *pooling*입니다.

| 요소 | 의미 |
|------|------|
| Logical Device (LD) | 디바이스 메모리의 *논리적 분할 단위* |
| LD-ID | host·디바이스 양쪽에서 LD 식별 |
| Time-share | 한 시점에 *한 host만* 특정 LD 사용 |
| Re-allocation | 워크로드 변화에 따라 *동적 재할당* |

운영 예시 — *2 TB pool memory를 4개 LD로 분할*:

| LD | 초기 할당 | 시간 t1 | 시간 t2 |
|----|---------|---------|---------|
| LD0 (512 GB) | Host A | (회수, unallocated) | Host C에 재할당 |
| LD1 (512 GB) | Host B | Host B 유지 | Host B 유지 |
| LD2 (512 GB) | Host C | Host C 유지 | Host D에 새로 할당 |
| LD3 (512 GB) | 미할당 | Host A에 할당 | Host A 유지 |

*Fabric Manager*가 *out-of-band control*로 이 할당을 관리합니다.

## CXL 3.0 Fabric — Coherent Multi-Host

CXL 3.0은 *2.0의 time-share pooling*을 넘어 *multi-host가 동시에 같은 메모리 영역 접근*을 가능하게 합니다 — *coherency를 유지하면서*.

| 구성 요소 | 역할 |
|---------|------|
| Multi-level Switch | PBR로 라우팅, multi-hop fabric 가능 |
| Fabric Manager | out-of-band control + topology 관리 |
| Coherent Memory Pool | 모든 host가 *같은 SPA로 같은 데이터* 봄 |
| BISnp | device가 host cache invalidate |

기존 2.0과의 차이:

| 항목 | 2.0 Pooling | 3.0 Fabric |
|------|------------|-----------|
| 공유 모델 | time-share | simultaneous coherent share |
| Coherency | 단일 owner | multi-owner with BISnp |
| Routing | host-managed (HBR) | switch-managed (PBR) |
| 토폴로지 | single-level | multi-level |

## GFAM — Global Fabric Attached Memory

*GFAM*은 *fabric 전역에서 보이는 메모리 풀*입니다. 모든 host가 *같은 SPA로 같은 데이터를 봅니다*.

| 특성 | 의미 |
|------|------|
| 전역 가시성 | 모든 attached host가 *동일 영역 접근 가능* |
| Coherent | BISnp로 *cache invalidation* 동적 처리 |
| Scale | TB~PB 규모 |
| 운영 | Fabric Manager가 *영역 할당·해제·migration* |

GFAM의 *진짜 가치*는 *application이 "내 메모리"가 아닌 "fabric 메모리"를 사용*하게 되는 것. *분산 DB·in-memory cache·shared model state* 같은 *원래는 network로 share*하던 영역이 *load/store로 접근* 가능해집니다.

## PBR — Port-Based Routing

CXL 2.0의 *HBR (Host-Based Routing)*은 *host가 모든 라우팅 정보를 알아야* 합니다. multi-level switch나 큰 fabric에서는 *비현실적*입니다.

CXL 3.0의 *PBR*은 *switch가 라우팅 결정*을 합니다.

| 라우팅 | 결정 주체 | 적용 |
|--------|----------|------|
| HBR | Host | 1-hop switch, 작은 토폴로지 |
| PBR | Switch | multi-hop fabric, 대규모 |

PBR이 있어야 *수십~수백 디바이스의 fabric*이 *실용적*이 됩니다.

## Fabric Manager — Out-of-band Control

*Fabric Manager (FM)*는 *out-of-band control plane*입니다.

| 책임 | 역할 |
|------|------|
| Topology discovery | 모든 switch·device 등록·인식 |
| LD allocation | host별 메모리 할당·해제·migration |
| Hot-plug | device 추가·제거 처리 |
| Health monitoring | RAS 이벤트 수집·정책 적용 |
| Security policies | host별 권한·access control |

FM은 *별도 네트워크* 또는 *전용 BMC link*로 동작. *데이터 평면(CXL link)과 분리*되어 *FM 다운에도 기존 할당은 동작*하지만 *동적 재할당은 정지*합니다.

## Coherency Domain ID

CXL 3.0 fabric에서는 *Coherency Domain ID*가 필요합니다.

| 의미 | 결과 |
|------|------|
| 같은 domain | *cache coherency 공유* — BISnp 등 일관성 메시지 흐름 |
| 다른 domain | *별도 관리* — domain 간 access는 별도 protocol |

운영 예:

| Domain | 소속 |
|--------|------|
| Domain 0 | Host A 단독, Memory Region 0·1 |
| Domain 1 | Host A·B 공유, Memory Region 2 |
| Domain 2 | Host B 단독, Memory Region 3 |

이 정보가 *fabric 토폴로지 인식과 BISnp 라우팅의 핵심*.

## 운영 사례 — hyperscale 도입

CXL Consortium 공식 발표·하이퍼스케일러 백서·기술 블로그가 *2024~2026 도입 사례*를 보고합니다.

| 회사 | 프로젝트 | 적용 (공개 자료 기준) |
|------|---------|-------------------|
| Meta | Memory Tiering 연구 | 컨테이너 host overcommit + CXL.mem cold tier 시범 |
| Microsoft Azure | Project Pond | 다중 VM 메모리 풀링 연구 |
| AMD | MI300 Cluster | EPYC + Instinct + CXL pool |
| Samsung·SK Hynix | CMM-D·Niagara 양산 | 자사 R&D·데이터센터 적용 보고 |

대부분 *CXL 2.0 pooling*이 *2024~2025 양산 적용*, *3.0 fabric*은 *2026+ 본격 도입*입니다.

## Composability — 데이터센터 비전

CXL 3.x의 종착점은 *Composable Datacenter*입니다.

**현재 — 정적 서버**:
- 서버마다 *CPU·메모리·GPU·NVMe가 고정 비율*로 묶여 있음.
- 워크로드가 GPU 더 필요해도 *옮길 수 없음*. 서버 통째로 사거나 끝.

**CXL Composable — 동적 조합**:
- *풀별로 자원 분리*: CPU pool 1024개, 메모리 pool 1 PB, GPU pool 256개, NVMe pool 100 PB
- 워크로드 X 시작 시 *필요한 양만 동적 할당*
- 워크로드 X 종료 시 *전부 회수, 다른 워크로드 재할당*

이 비전은 *CXL fabric + Fabric Manager + composable OS*가 *모두 성숙*해야 가능합니다. *2026~2028 부분적 실현*, *2030+ 본격 도입* 예상.

## 자주 하는 실수

### "CXL 2.0 pooling = CXL 3.0 fabric"

*완전히 다릅니다*. 2.0 pooling은 *time-share* — *한 시점에 한 host*. 3.0 fabric은 *coherent multi-host* — *동시 다중 접근*. coherency 메커니즘이 *완전히 다릅니다*.

### "GFAM은 멀티 host가 자유롭게 read/write"

*가능하지만 비용 큽니다*. *cache invalidation 트래픽*이 *워크로드 throughput을 무너뜨릴 수 있음*. *coordination protocol*(database transaction 등)이 *application 측에서 필요*합니다.

### "Fabric Manager는 single point of failure"

*맞고 틀립니다*. FM 다운 시 *기존 할당은 유지*되고 *데이터 평면은 동작*. *동적 재할당만 정지*. *FM redundancy*가 production 권장. *완전한 SPOF는 아님*.

### "PBR로 모든 토폴로지 OK"

*deadlock 위험*. *PBR fabric 토폴로지 설계*는 *Clos·Dragonfly·Fat-tree* 같은 *deadlock-free topology*를 골라야 합니다. *임의 mesh*는 위험.

### "CXL fabric이 NVLink을 대체한다"

*용도가 다릅니다*. NVLink는 *GPU 간 고대역폭·저지연*. CXL fabric은 *general purpose memory*. *공존*이 *현실*입니다.

## 정리

- CXL은 *Direct → Switching → Fabric*의 *3단계 진화*를 통해 *single device에서 datacenter 전체*로 확장됩니다.
- *CXL 2.0 switching·pooling*은 *LD 단위 host 시분할*. Fabric Manager가 *out-of-band 할당 관리*.
- *CXL 3.0 fabric*은 *coherent multi-host*. *PBR + GFAM + BISnp*가 핵심 메커니즘.
- *GFAM*은 *fabric 전역 메모리 풀* — 분산 DB·in-memory cache의 *load/store 접근* 가능.
- *Composable Datacenter*는 *CXL fabric의 종착점*. 2026+ 부분 실현, 2030+ 본격.

## 다음 편

[Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *CXL 4.0이 3.x 위에 더한 운용 기능*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric) — Switch 내부 동작과 FM 통신 프로토콜
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·hyperscaler 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
