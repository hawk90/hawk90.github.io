---
title: "Ch 13: Switching·Fabric Manager — 2.0 pooling에서 3.x fabric까지"
date: 2026-05-16T09:13:00
description: "CXL switch의 진화와 Fabric Manager의 역할."
series: "CXL 4.0 Internals"
seriesOrder: 13
tags: [cxl, switch, fabric-manager, mctp, dcd]
draft: false
---

## 한 줄 요약

> **"CXL switch는 *2.0의 single-level fan-out*에서 *3.x의 multi-level fabric + PBR + GFAM*까지 진화했고, *Fabric Manager가 out-of-band control plane*으로 모든 운용 결정을 합니다."** — Switch 내부는 *port table·routing·QoS 정책*으로 구성되고, FM은 *MCTP·DCD* 같은 보조 프로토콜로 *runtime 자원 재할당*을 수행합니다. *Composable Datacenter의 핵심 인프라*입니다.

[Ch 4 Pooling·GFAM](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0·3.x fabric의 개념*을 봤습니다. 이 장은 *그 토폴로지의 control plane*인 *switch 내부 동작과 Fabric Manager*를 본격 분해합니다.

## CXL Switch — 진화 단계

| 세대 | Switch 능력 |
|------|-----------|
| CXL 2.0 | Single-level switch, fan-out, multi-LD pooling |
| CXL 3.0 | Multi-level switch, PBR, fabric, GFAM, P2P |
| CXL 3.1 | Direct P2P CXL.mem, TSP 통합 |
| CXL 3.2 | DCD enhancements, hotness monitoring |
| **CXL 4.0** | Bundled Port awareness, x2 native, 4 retimer 지원 |

각 세대의 *추가 능력*이 *switch firmware의 복잡도*를 단계적으로 키웠습니다.

## Switch Internal — Port Table

Switch의 *기본 자료 구조*:

| 요소 | 의미 |
|------|------|
| Port table | upstream·downstream port 목록 |
| Routing table | SPA → 목적지 port 매핑 |
| LD allocation | logical device를 어느 host에 할당 |
| QoS policy | port·flow class별 우선순위 |
| Health state | port·device 상태 추적 |

이 정보들이 *switch firmware의 메모리*에 보관되고 *runtime에 update* 됩니다.

## Routing — HBR vs PBR

CXL switch의 *라우팅 결정 주체*가 *세대별로 다릅니다*.

| 모델 | 결정 주체 | 적용 |
|------|---------|------|
| **HBR** (Host-Based Routing) | Host | 1-hop switch, 작은 토폴로지 |
| **PBR** (Port-Based Routing) | Switch | multi-hop fabric, 대규모 |

HBR은 *host의 메모리 컨트롤러가 모든 routing 정보를 알아야* 합니다. *대규모 fabric에서 비현실적*. PBR은 *switch가 라우팅 결정*하므로 *multi-level fabric이 실용적*.

PBR의 *deadlock 회피*는 *fabric topology*에 의존:

| Topology | Deadlock-free | 적용 |
|----------|---------------|------|
| Clos | Yes (잘 정의된 layer) | 대표적 fabric |
| Dragonfly | Yes (with VCs) | HPC fabric |
| Fat-tree | Yes | 데이터센터 |
| Arbitrary mesh | No | *위험* |

## Switching·Pooling 흐름

CXL 2.0 *Multi-Host Pooling* 흐름 (구체적 단계):

| 단계 | 동작 |
|------|------|
| 1 | Boot 시 Fabric Manager가 *switch·device topology 탐색* |
| 2 | 디바이스 LD 분할 (예: 2 TB → 512 GB × 4 LD) |
| 3 | Host A·B·C가 enumeration 진행 |
| 4 | Fabric Manager가 *LD0 → Host A·LD1 → Host B·LD2 → Host C* 할당 결정 |
| 5 | Switch routing table 업데이트 |
| 6 | 각 Host가 *자기 LD를 CEDT로 인식*, region 생성 |
| 7 | Runtime에 워크로드 변화 — Fabric Manager가 *LD3을 Host A에 추가 할당* |
| 8 | Switch routing 업데이트 후 *hot-plug 이벤트 발생* → Host A의 driver가 인식 |

이 *동적 재할당이 CXL 2.0 pooling의 핵심 가치*입니다.

## Fabric Manager — Out-of-band Control Plane

*FM*은 *CXL 데이터 평면 (link traffic)과 분리된 control channel*입니다.

| 책임 | 역할 |
|------|------|
| Topology discovery | 모든 switch·device 등록·인식 |
| LD allocation | host별 메모리 할당·해제·migration |
| Hot-plug | device 추가·제거 처리 |
| Health monitoring | RAS 이벤트 수집·정책 적용 |
| Security policies | host별 권한·access control |
| QoS configuration | port·flow별 우선순위 |

FM은 *별도 네트워크* 또는 *전용 BMC link*로 동작. 데이터 평면과 분리되어 *FM 다운에도 기존 할당은 동작*하지만 *동적 재할당은 정지*합니다.

## MCTP — Management Component Transport Protocol

*MCTP (DSP0236)*는 DMTF 표준으로 *FM↔switch·FM↔device 통신*에 사용됩니다.

| 항목 | 의미 |
|------|------|
| 정의 | DMTF DSP0236 |
| Transport | I2C·SMBus·PCIe·USB 등 다양 |
| 용도 | management message exchange |
| CXL 사용 | FM ↔ switch firmware, FM ↔ device CCI |

MCTP 위에 *SPDM·CMA·FM-specific command set*가 흐릅니다. *Out-of-band 채널*이므로 *데이터 평면 영향 없음*.

## DCD — Dynamic Capacity Device

*DCD*는 CXL 3.x의 *runtime capacity 재할당* 메커니즘입니다.

| 항목 | 의미 |
|------|------|
| 능력 | Device의 capacity를 *runtime에 추가·제거* |
| 적용 | Memory expander, multi-LD pool |
| Trigger | FM이 *workload demand*에 따라 결정 |
| 메커니즘 | DCD mailbox command + hot-plug event |

운영 흐름:

| 시점 | 동작 |
|------|------|
| t1 | Host A 워크로드 시작, 512 GB 요청 |
| t2 | FM이 *pool에서 512 GB capacity 확보* |
| t3 | Switch가 *Host A의 region에 capacity 추가* (DCD add) |
| t4 | Host A의 region size 증가 인식 |
| t5 | 워크로드 종료, *capacity 회수* (DCD remove) |
| t6 | FM이 *capacity를 pool로 반환* |

DCD가 있어야 *진짜 elastic memory pool*이 가능. *2.0 pooling은 LD 단위 정적*이지만 *3.x DCD는 fine-grained dynamic*.

## Hot-plug 흐름

Switch의 *device hot-add* 처리:

| 단계 | 동작 |
|------|------|
| 1 | 새 device가 *switch downstream port에 attach* |
| 2 | Switch가 *PCIe hot-plug event* 발생 |
| 3 | Switch firmware가 *FM에 device discovery 보고* (MCTP) |
| 4 | FM이 *device capability·LD topology 확인* |
| 5 | Routing table에 *새 device 등록* |
| 6 | 필요 시 *host 측 hot-plug interrupt* trigger |
| 7 | Host kernel이 *device enumeration·driver attach* |

Hot-remove는 *역순* + *device offline 단계*.

## Switch Firmware의 복잡도

CXL switch는 *PCIe switch보다 훨씬 복잡한 firmware*를 요구합니다.

| 영역 | 복잡도 |
|------|--------|
| Routing | PBR + deadlock 회피 |
| QoS | per-port·per-flow 우선순위 |
| LD management | dynamic allocation·DCD |
| Security | TSP·IDE·SPDM 통합 |
| RAS | error containment·viral propagation prevention |
| Telemetry | FM에 status reporting |

이 *firmware*가 *vendor 차별화의 핵심*입니다. Switch chip 자체는 일반화되어도 *firmware의 운용 효율*이 *production 성능 차이*를 만듭니다.

## 실 사례 — CXL Switch 제품

CXL Consortium·각 벤더 공개 자료 기준:

| 회사 | 제품군 | 비고 |
|------|--------|------|
| Marvell | CXL Switch | datacenter focus |
| Astera Labs | Cosmos | smart memory + switch |
| Microchip | PCIe·CXL switch series | enterprise PCIe→CXL extension |
| XConn | CXL 3.0 fabric switch | high-port-count fabric |

*2024~2025 양산 시작*. *2026+에 본격 hyperscale 도입* 예상.

## 자주 하는 실수

### "Switch가 다 같다"

*Vendor·firmware마다 매우 다름*. *Port 수·routing 정책·DCD 지원 여부·security feature*가 *제품별 차이*. *데이터시트 비교 필수*.

### "Fabric Manager는 자동"

*Vendor·플랫폼별 다른 FM*. Open source FM (DMTF Redfish 기반)·vendor-specific FM. *상호 운용성에 한계*. *fabric 전체를 한 vendor로 통일*하는 게 일반적.

### "PBR이면 어떤 topology든 OK"

*Deadlock-free topology* 만이 안전. *임의 mesh*는 위험. Clos·Dragonfly·Fat-tree 같은 *검증된 topology* 사용.

### "DCD를 host가 직접 control"

*FM이 control plane*이고 *host는 hot-plug event 수신*. host의 *driver*는 *DCD 자체를 trigger 안 함*. *FM API*가 진입점.

### "MCTP가 빠르다"

*Out-of-band control 채널*이라 *slow path*. *bulk data*는 *CXL link*로, *config·status·control*만 MCTP. *수십 ms latency* 일반.

## 정리

- CXL switch는 *2.0 single-level → 3.x multi-level fabric*으로 진화. *PBR이 multi-hop fabric의 핵심*.
- *Switch internal*은 *port table·routing·QoS·LD allocation*. firmware 복잡도 매우 높음.
- *Fabric Manager*는 *out-of-band control plane*. allocation·hot-plug·health·security·QoS 담당.
- *MCTP*가 FM↔switch·FM↔device의 *management channel*. *SPDM·CMA·FM command* 위에 흐름.
- *DCD*는 *runtime capacity 재할당*. true elastic memory pool 가능.
- Vendor 제품: Marvell·Astera·Microchip·XConn 등. 2024~2025 양산, 2026+ hyperscale.

## 다음 편

[Ch 14: Security — IDE·SPDM·TSP·CXL TEE](/blog/embedded/hardware/cxl/chapter14-security)에서 *CXL 보안 메커니즘 4종*과 *fabric 환경의 confidential computing*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Postmortem Debugging Ch 6: CXL Fabric Postmortem](/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·DMTF·각 switch 벤더 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
