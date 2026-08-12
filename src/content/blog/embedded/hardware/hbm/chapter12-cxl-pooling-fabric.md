---
title: "메모리 풀링과 데이터센터 토폴로지 — CXL Switch와 Fabric"
date: 2026-06-15T09:04:00
description: "CXL 2.0/3.x switch가 만드는 메모리 풀링 — 다중 호스트가 공유하는 메모리 풀과 Coherent Fabric 토폴로지."
series: "HBM·GDDR 심화"
seriesOrder: 12
tags: [cxl, memory-pooling, fabric, datacenter, gfam]
draft: false
topics: ["embedded", "embedded/hardware"]
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
| Samsung·SK Hynix | CMM-D / Niagara | 양산 (자사 데이터센터 도입 검토·공개 보고 자료 있음) |
| 기타 hyperscale | (공개 자료 제한) | TPU·GPU 클러스터의 CXL 확장 검토·시범 적용 보고 |

대부분 *CXL 2.0 pooling*이 *2024~2025 양산 적용*, *3.0 fabric*은 *2026+ 본격 도입*입니다.

## Composability — 데이터센터 비전

CXL 3.x의 종착점은 *Composable Datacenter*입니다.

현재의 정적 서버는 자원 구성이 고정입니다. 서버 1이 CPU 32개·DDR 256 GB·GPU 8개·NVMe 4 TB로 묶여 있고, 서버 2는 CPU 32개·DDR 256 GB·GPU 0개·NVMe 1 TB로 묶여 있는 식입니다. 이때 어떤 워크로드가 GPU를 더 필요로 해도 서버 경계를 넘어 옮길 수 없습니다. 서버 1이 고장 나면 그 자원은 그대로 사라집니다.

CXL Composable 모델은 자원을 종류별 풀로 분리합니다.

| 풀 | 규모 |
|-----|------|
| CPU 풀 | CPU 1024개 |
| 메모리 풀 | 1 PB |
| GPU 풀 | GPU 256개 |
| NVMe 풀 | 100 PB |

워크로드 X가 시작하면 필요한 만큼(예: CPU 64개 + 메모리 4 TB + GPU 16개 + NVMe 50 TB)을 각 풀에서 동적으로 할당합니다. 워크로드가 끝나면 자원을 모두 회수해 다른 워크로드에 재할당합니다.

이 비전은 *CXL fabric + Fabric Manager + composable OS*가 *모두 성숙*해야 가능합니다. *2026~2028*에 *부분적 실현*, *2030+에 본격 도입* 예상.

## 메모리 계층에서 자주 어긋나는 판단

이 시리즈는 on-package HBM에서 출발해 여기까지 왔습니다. 그래서 마지막으로 짚을 것은 fabric의 동작 방식이 아니라, *풀링된 메모리를 계층 어디에 놓을 것인가*에서 어긋나는 판단들입니다.

### "풀에서 가져온 메모리도 결국 DDR이니 성능은 비슷하다"

용량은 늘지만 *지연은 늘어납니다*. Direct-attach CXL 메모리부터가 로컬 DDR보다 한 단계 먼 자리이고, switch를 한 단 거치면 그만큼 더 멀어집니다. 대역폭이 아니라 *지연에 민감한 워크로드*를 풀 메모리 위에 올리면, 용량이 넉넉해졌는데 처리량은 떨어지는 결과가 나옵니다. 풀은 *cold tier*로 두고 hot working set은 로컬에 남기는 배치가 기본입니다.

### "HBM이 있으니 CXL 풀은 필요 없다"

두 메모리는 *경쟁 관계가 아닙니다*. HBM은 on-package라 용량이 스택 수에 묶이고, 그 한계가 곧 모델 크기의 한계가 됩니다. CXL 풀은 그 한계 밖의 용량을 맡습니다. [Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 본 NPU·GPU 구성이 HBM과 CXL을 함께 쓰는 이유가 이것입니다. 대역폭은 HBM이, 용량은 풀이 담당하는 분업입니다.

### "풀링하면 메모리를 산 만큼 다 쓴다"

*할당 단위가 발목을 잡습니다*. CXL 2.0 pooling은 LD 단위로 host에 붙입니다. 워크로드가 요구하는 크기가 LD 경계와 맞지 않으면 남는 조각이 생기고, 그 조각은 다른 host가 쓰지 못합니다. 실제 이용률은 LD 분할 설계에 좌우되므로, 도입 전에 *워크로드의 메모리 요구 분포*를 먼저 봐야 합니다.

### "tiering은 OS가 알아서 해 준다"

*자동 승격·강등은 접근 패턴을 뒤늦게 따라갑니다*. 페이지가 hot으로 판정돼 로컬로 올라올 때쯤 워크로드의 관심은 이미 다른 곳에 가 있는 경우가 흔합니다. Meta의 Memory Tiering 사례처럼, 실제 운영에서는 *워크로드가 자기 데이터의 성격을 알려 주는* 힌트가 함께 있어야 이득이 납니다.

### "CXL fabric이 NVLink을 대체한다"

*용도가 다릅니다*. NVLink는 GPU 사이의 고대역폭·저지연 경로이고, CXL fabric은 범용 메모리 공유 경로입니다. 대역폭과 지연의 자릿수가 다르기 때문에 한쪽이 다른 쪽을 흡수하지 않습니다. 공존이 현실입니다.

> **메모**: fabric 자체의 오해 — 2.0 pooling과 3.0 fabric의 coherency 차이, GFAM의 invalidation 비용, Fabric Manager의 SPOF 여부, PBR 토폴로지의 deadlock 조건 — 은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam#자주-하는-실수)에 정리돼 있습니다.

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
- [CXL 4.0 Internals Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam) — GFAM·PBR·Coherency Domain ID의 메커니즘
