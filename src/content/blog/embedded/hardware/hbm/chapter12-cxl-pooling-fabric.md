---
title: "메모리 풀링과 데이터센터 토폴로지 — CXL Switch와 Fabric"
date: 2026-06-15T09:04:00
description: "CXL 2.0/3.x switch가 만드는 메모리 풀링 — 다중 호스트가 공유하는 메모리 풀과 Coherent Fabric 토폴로지."
series: "HBM·GDDR 심화"
seriesOrder: 12
tags: [cxl, memory-pooling, fabric, datacenter, gfam]
draft: false
---

## 한 줄 요약

> **"디바이스 한 대에서 시작한 CXL은 *switch 한 단을 거치면 풀*이 되고, *fabric을 거치면 데이터센터 전체의 메모리 자원*이 됩니다."** — CXL 2.0 switch는 *single-host fan-out과 multi-host pooling*을, CXL 3.0 fabric은 *coherent multi-host sharing과 GFAM*을 가능하게 합니다. *workload별로 메모리·CPU·가속기를 동적 조합*하는 *composable datacenter*가 *이 표준의 종착점*입니다.

[Ch 11](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서 *디바이스 한 대*의 *유형 분류*를 봤습니다. 이 마지막 장은 *시야를 데이터센터 전체*로 확장합니다. *Switch·Pooling·Fabric*이 *어떻게 multi-host 메모리 공유*를 가능하게 하는지, 그리고 *HBM 시리즈 전체의 마무리*까지.

## 토폴로지 진화 단계

CXL은 *세 단계 진화*를 보여 왔습니다.

| 단계 | CXL 버전 | 토폴로지 | 특징 |
|------|---------|---------|------|
| **Direct Attach** | 1.1 | 호스트 1 ↔ 디바이스 1 | 단순. PCIe 카드 한 장 |
| **Switching·Pooling** | 2.0 | 호스트 1 ↔ Switch ↔ 디바이스 N | fan-out, multi-LD pooling |
| **Fabric** | 3.0 / 3.x | 호스트 N ↔ Multi-level Switch ↔ 디바이스 M | coherent fabric, GFAM |

각 단계가 *해결하는 문제*:

- 1.1: *"메모리를 확장하고 싶다"*
- 2.0: *"디바이스를 여러 host가 공유하고 싶다"*
- 3.x: *"데이터센터 전체를 메모리 풀로 만들고 싶다"*

## CXL 2.0 Switching — Single-Host Fan-out

CXL 2.0 switch는 *한 host*가 *여러 CXL 디바이스*를 *한 PCIe 포트로* 묶을 수 있게 합니다.

Single-Host Fan-out 구성 예:

| 컴포넌트 | 수량·연결 |
|---------|----------|
| Host CPU | 1대, CXL 2.0 link (PCIe 5.0 x16) |
| CXL Switch | 1대, 4개 downstream port |
| Memory Device | 4대 × 256 GB each |
| 총 메모리 | 1 TB |

*Host CPU 입장*에서는 *4개의 mem device*가 *각각 별도 NUMA 노드*로 보이거나, *HDM Decoder의 interleave region*으로 *하나의 큰 NUMA로 묶을 수* 있습니다.

## CXL 2.0 Pooling — Multi-Host LD

같은 디바이스를 *여러 host가 시간 분할*해 사용하는 게 *pooling*입니다.

Multi-Host Pooling 구성 예 (LD = Logical Device 단위):

| 컴포넌트 | 구성 |
|---------|------|
| Hosts | Host A, B, C (각자 CXL 2.0 link) |
| CXL Switch | 1대 |
| CXL Memory | 2 TB pool |
| LD 분할 | LD0 512 GB → Host A, LD1 512 GB → Host B, LD2 512 GB → Host C, LD3 512 GB 미할당(dynamic) |

*Logical Device (LD)*는 *디바이스의 메모리를 논리적으로 분할*한 단위입니다. *Fabric Manager*가 *out-of-band 컨트롤*로 *어느 host에 어느 LD를 할당*할지 관리.

워크로드 변화에 따라:
- *Host A의 워크로드가 끝남* → LD0 회수
- *Host C가 추가 메모리 필요* → LD0을 C에 동적 할당

이 *동적 재할당*이 *CXL 2.0 pooling의 핵심 가치*입니다.

## CXL 3.0 Fabric — Coherent Multi-Host

CXL 3.0은 *2.0의 time-sharing pooling*을 넘어 *multi-host가 동시에 같은 메모리 영역 접근*을 가능하게 합니다 — *coherency를 유지하면서*.

CXL 3.0 Coherent Fabric 구성 예:

| 컴포넌트 | 구성 |
|---------|------|
| Hosts | Host A, B, C, D (모두 동시 active) |
| Switch | Multi-level switch with PBR (Port-Based Routing) |
| Control plane | Fabric Manager |
| 메모리 | Shared CXL Memory Pool, 10 TB GFAM |

*GFAM (Global Fabric Attached Memory)*는 *fabric 전역에서 보이는 메모리 풀*입니다. *모든 host가 같은 SPA로 같은 데이터를 봅니다*. *Cache coherency*는 *back-invalidation snoop*을 통해 *디바이스가 host들의 캐시를 무효화*해 유지.

## PBR — Port-Based Routing

CXL 2.0의 *HBR (Host-Based Routing)*은 *host가 모든 라우팅 정보를 알아야* 합니다. multi-level switch나 큰 fabric에서는 *비현실적*입니다.

CXL 3.0의 *PBR*은 *switch가 라우팅 결정*을 합니다.

| 라우팅 | 결정 주체 | 적용 |
|--------|----------|------|
| HBR | Host | 1-hop switch, 작은 토폴로지 |
| PBR | Switch | multi-hop fabric, 대규모 |

PBR이 있어야 *수십~수백 디바이스의 fabric*이 *실용*적이 됩니다.

## Fabric Manager

*Fabric Manager (FM)*는 *out-of-band 컨트롤 평면*입니다.

| 책임 | 역할 |
|------|------|
| Topology discovery | 모든 switch·device 등록 |
| LD allocation | host별 메모리 할당·해제 |
| Hot-plug 관리 | 디바이스 추가·제거 |
| Health monitoring | RAS 이벤트 수집 |
| Security policies | host 별 권한 관리 |

FM은 *별도 네트워크* 또는 *전용 BMC link*로 동작합니다. *데이터 평면(CXL link)과 분리*되어 *FM 다운에도 기존 할당은 동작*하지만 *동적 재할당은 정지*합니다.

## 운영 사례

각 hyperscale의 *CXL 도입 현황*:

| 회사 | 프로젝트 | 적용 |
|------|---------|------|
| Meta | Memory Tiering | 컨테이너 host overcommit + CXL.mem cold tier |
| Microsoft Azure | Project Pond | 다중 VM 메모리 풀링 |
| AMD | MI300 Cluster | EPYC + Instinct + CXL pool |
| 삼성·SK Hynix | CMM-D / Niagara fleet | 자사 데이터센터 양산 적용 |
| 기타 hyperscale | (공개 자료 제한) | TPU·GPU 클러스터의 CXL 확장 검토·시범 적용 보고 |

대부분 *CXL 2.0 pooling*이 *2024~2025 양산 적용*, *3.0 fabric*은 *2026+ 본격 도입*입니다.

## Composability — 데이터센터 비전

CXL 3.x의 종착점은 *Composable Datacenter*입니다.

```text
[현재 — 정적 서버]
서버 1: 32 CPU + 256 GB DDR + 8 GPU + 4 TB NVMe
서버 2: 32 CPU + 256 GB DDR + 0 GPU + 1 TB NVMe
서버 3: ...

→ 워크로드가 GPU 더 필요해도 못 옮김. 서버 1 사고 끝.

[CXL Composable — 동적 조합]
풀 1: CPU 1024개
풀 2: 메모리 1 PB
풀 3: GPU 256개
풀 4: NVMe 100 PB

워크로드 X 시작:
  → CPU 64개 + 메모리 4 TB + GPU 16개 + NVMe 50 TB 할당
워크로드 X 종료:
  → 다 회수, 다른 워크로드에 재할당
```

이 비전은 *CXL fabric + Fabric Manager + composable OS*가 *모두 성숙*해야 가능합니다. *2026~2028*에 *부분적 실현*, *2030+에 본격 도입* 예상.

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

*용도가 다릅니다*. NVLink는 *GPU 간 고대역폭·저지연 (900 GB/s, 5 ns)*. CXL fabric은 *general purpose 메모리 공유 (~100 GB/s, ~300 ns)*. *공존*이 *현실*입니다.

## 정리

- CXL은 *Direct → Switching → Fabric*의 *3단계 진화*를 통해 *single device에서 datacenter 전체*로 확장됩니다.
- *CXL 2.0 switching·pooling*은 *LD 단위 host 시분할*. Fabric Manager가 *out-of-band로 할당 관리*.
- *CXL 3.0 fabric*은 *coherent multi-host*. *PBR + GFAM + Back-Invalidation*이 핵심 메커니즘.
- *Composable Datacenter*는 *CXL fabric의 종착점* — workload별 *CPU·메모리·가속기 동적 조합*.
- Hyperscale은 *2024~2025 pooling*, *2026+ fabric*. Samsung·SK Hynix가 *공급망 선두*에서 자사 데이터센터에도 적용.
- *NVLink과 공존*. CXL은 *general purpose memory*, NVLink은 *GPU compute fabric*으로 *역할 분담*.

## 다음 편

HBM·GDDR 심화 시리즈의 *두 번째 마무리*입니다. 본 시리즈는 *HBM의 on-package 대역폭*에서 시작해 *CXL의 datacenter pooling*까지 *메모리 계층 전체*를 다뤘습니다.

CXL 관련 다음 깊이는 *기존 다른 시리즈*에 *분산 추가*된 챕터로 이어집니다:

- *프로토콜·드라이버*: [Modern Embedded Recipes Ch 149~151](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- *성능 분석*: [Embedded Performance Engineering Ch 54~56](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- *보안*: [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- *부팅·BIOS*: [Bootloader Internals Ch 34~36](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- *디버깅·진단*: 4개 디버깅 시리즈에 분산

## 관련 항목

- [Ch 1: HBM과 GDDR 분기점 분석](/blog/embedded/hardware/hbm/chapter01-overview) — 시리즈 시작
- [Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
- [Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
