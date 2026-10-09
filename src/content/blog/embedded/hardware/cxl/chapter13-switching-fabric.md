---
title: "Ch 13: Switching·Fabric Manager — 2.0 pooling에서 3.x fabric까지"
slug: "embedded/hardware/cxl/chapter13-switching-fabric"
date: 2026-05-16T09:13:00
description: "CXL switch의 진화와 Fabric Manager의 역할."
series: "CXL 4.0 Internals"
seriesOrder: 13
tags: [cxl, switch, fabric-manager, mctp, dcd]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL switch는 *2.0의 단일 계층 switch·MLD pooling*에서 *3.x의 multi-level switching·PBR fabric·G-FAM*으로 넓어졌고, 그 구성을 바꾸는 주체가 *Fabric Manager(FM)*입니다."** — switch 안은 *VCS(Virtual CXL Switch)*와 *vPPB*로 나뉘고, FM은 *FM API*로 vPPB를 물리 포트·LD에 bind/unbind하거나 DCD 용량을 붙입니다. FM API는 mailbox CCI나 MCTP로 전달됩니다.

[Ch 4 Pooling·GFAM](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0·3.x fabric의 개념*을 봤습니다. 이 장은 *그 토폴로지를 움직이는* switch 구조와 Fabric Manager를 봅니다.

## 세대별로 더해진 것

spec 개정 이력과 컨소시엄 발표 기준:

| 세대 | Switching·fabric 관련 추가 |
|------|-----------|
| CXL 2.0 | 단일 계층 switch, MLD를 이용한 memory pooling |
| CXL 3.0 | multi-level switching, fabric, G-FAM, memory sharing, Multi-headed MLD, DCD, PBR switch SW 관점(개요) |
| CXL 3.1 | PBR fabric 디코딩·라우팅과 FM API 정의, fabric deadlock 회피 규칙, Direct P2P CXL.mem, TSP |
| CXL 3.2 | CHMU(Hot-Page Monitoring Unit), PPR 개선, TSP 확장 |
| CXL 4.0 | 128 GT/s, native x2, Bundled Port, retimer 최대 4개 |

## Switch 안 — VCS와 vPPB

CXL switch는 PCIe switch처럼 upstream port 하나에 내부 bus와 downstream port가 붙는 구조를 *가상화*합니다(§7.1).

| 요소 | 의미 |
|------|------|
| VCS (Virtual CXL Switch) | host 하나가 보는 가상 switch. upstream vPPB 하나 + downstream vPPB 여러 개 |
| vPPB | 가상 PCI-to-PCI bridge. FM이 물리 포트(또는 MLD의 LD)에 bind |
| PPB | 물리 포트의 bridge |
| Multiple VCS | upstream port가 여럿인 switch. host마다 VCS 하나 |

Multiple VCS의 규칙(§7.1.2) 중 FM과 관련된 것:

- 초기 binding과 VCS 구조는 switch vendor 방식으로 정합니다.
- FM은 선택 사항입니다. 다만 *bind/unbind가 필요하거나 MLD 포트를 지원*하는 Multiple VCS에는 FM이 필요합니다.
- downstream port는 FM이 조율하는 managed hot-plug 흐름으로 다른 VCS에 재할당될 수 있습니다.

CXL.mem 요청은 VCS의 주소 디코드 레지스터(HDM Decode)가 어느 downstream PPB로 보낼지 정합니다(§7.3.3.1).

## Routing — HBR vs PBR

| 모델 | 풀이 | 내용 |
|------|---------|------|
| **HBR** | Hierarchy Based Routing | PCIe 계층과 같은 방식. 버스 번호·주소로 라우팅. 3.1 spec은 PBR과 비교할 때 기본 256B flit 메시지를 HBR 메시지라 부름 |
| **PBR** | Port Based Routing | 메시지에 *12-bit PID*(DPID, 경우에 따라 SPID)를 실어 라우팅. fabric당 PID 4096개 |

host와 디바이스는 기존 메시지를 쓰고, fabric 가장자리의 *Edge Switch*가 PBR 형식으로 바꿉니다(§2.7).

### PBR과 deadlock

PBR switch가 한 Fabric Port에서 다른 Fabric Port로 메시지를 넘기면 의존 관계가 생깁니다(§7.7.5.1).

- PCIe tree나 fat tree처럼 *loop가 없는* 토폴로지는 의존도 순환하지 않습니다.
- loop가 있는 토폴로지에서는 의존이 닫힌 고리를 이뤄 deadlock이 날 수 있습니다.
- 그래서 *FM이 PBR switch 라우팅 테이블을 짤 때* 의존이 닫힌 고리를 만들지 않게 해야 합니다.

spec은 이 규칙을 *mesh 토폴로지*의 라우팅 예시로 설명합니다(Figure 7-44). mesh가 금지된 것이 아니라, 라우팅 테이블이 순환을 피해야 한다는 뜻입니다.

## Fabric Manager

spec의 정의(§7.6.1): FM은 *재구성이 필요한 때를 판단하고 명령을 내리는 논리적 프로세스*입니다. 형태는 무엇이든 됩니다.

| FM 형태 (spec 예시) |
|------|
| host에서 도는 소프트웨어 |
| BMC의 embedded 소프트웨어 |
| 다른 CXL 디바이스나 CXL switch의 firmware |
| CXL 디바이스 안의 state machine |

FM은 *FM API* 명령 세트로 디바이스를 구성하고, 명령은 *CCI*(Component Command Interface)로 전달됩니다(§7.6.2). CCI는 두 가지로 노출됩니다.

| 경로 | 내용 |
|------|------|
| Mailbox 레지스터 | 디바이스·switch의 mailbox CCI |
| MCTP | SMBus 같은 MCTP 지원 인터페이스, PCIe VDM 등 |

switch에 붙은 FM은 *Tunnel Management Command*로 switch 아래 MLD에 명령을 터널링할 수 있습니다. FM 기능이 컴포넌트 안에 내장되면 그 내부 인터페이스는 vendor 구현 사항입니다.

FM API를 MCTP로 실을 때의 binding은 DMTF *DSP0234*(CXL Fabric Manager API over MCTP Binding)가 정합니다(§7.6.3). MCTP 자체는 DMTF DSP0236입니다.

## Pooling — bind와 unbind

FM이 MLD의 LD를 host에 붙이고 떼는 흐름(§7.6.6.5~7.6.6.6):

| 동작 | 단계 |
|------|------|
| Bind | FM이 *Bind vPPB*(Opcode 5201h)로 물리 포트·VCS ID·vPPB 번호를 지정. MLD면 LD-ID도 지정. host가 이미 부팅했으면 switch가 Managed Hot-Add를 시작할 수 있음. 끝나면 switch가 Virtual CXL Switch Event Record로 FM에 알림 |
| Unbind | FM이 *Unbind vPPB*(Opcode 5202h)로 VCS ID·vPPB 번호를 지정. 옵션에 따라 Managed Hot-Remove 또는 Surprise Hot-Remove. 끝나면 같은 Event Record |

host 입장에서는 LD가 *PCIe hot-plug*로 나타나고 사라지는 것입니다. CEDT가 바뀌는 것이 아닙니다.

## DCD — Dynamic Capacity Device

DCD는 CXL 3.0에서 들어온, *디바이스 리셋 없이 용량을 바꾸는* 메모리 디바이스입니다(§9.13.3).

| 항목 | 내용 |
|------|------|
| 구조 | Dynamic Capacity DPA 범위를 1~8개 *DC Region*으로 나누고, 각 region을 고정 크기 *DC block*으로 나눔 |
| HDM | host는 최대 용량 전체를 HDM decoder로 미리 덮어 둠. 용량이 바뀌어도 HDM은 그대로 |
| 상태 전달 | 디바이스가 *Extent List*(시작 DPA·길이)로 host가 쓸 수 있는 block을 알림 |
| 신호 | 할당이 바뀌면 디바이스가 이벤트로 host에 알림 |

용량을 붙이는 흐름:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | FM | *Initiate Dynamic Capacity Add*(Opcode 5604h). 선택 정책: Free, Contiguous, Prescriptive, Enable Shared Access |
| 2 | 디바이스 | Add Capacity 절차 시작, host에 이벤트 |
| 3 | host | *Add Dynamic Capacity Response*로 수락. 수락 전 extent는 Extent List에 없음 |

반납은 FM이 *Initiate Dynamic Capacity Release*(Opcode 5605h)로 시작하면 디바이스가 host에 이벤트를 보내고, host가 *Release Dynamic Capacity*(Opcode 4803h)로 돌려줍니다. host가 이벤트 없이 스스로 반납할 수도 있습니다(§8.2.9.9.9.4). 즉 용량 *추가는 FM이 시작*하고, host 드라이버는 이벤트를 받아 수락하거나 반납하는 쪽입니다.

## 자주 하는 실수

### "HBR은 Host-Based Routing"

*Hierarchy Based Routing*입니다. PCIe 계층 방식 라우팅을 가리킵니다.

### "PBR에서 mesh는 쓰면 안 된다"

spec은 mesh 라우팅 예시를 직접 듭니다. 조건은 FM이 라우팅 테이블을 짤 때 의존 순환을 만들지 않는 것입니다(§7.7.5.1).

### "Fabric Manager는 별도 서버·네트워크다"

FM은 *논리적 프로세스*이고 형태는 자유입니다. host 소프트웨어, BMC, switch firmware, 디바이스 내부 state machine 모두 됩니다(§7.6.1).

### "LD를 붙이면 host의 CEDT가 바뀐다"

bind는 vPPB를 물리 포트·LD에 연결하는 것이고, host는 이를 hot-plug로 봅니다. CEDT는 host bridge와 fixed memory window를 기술합니다.

## 정리

- CXL 2.0은 단일 계층 switch·MLD pooling, 3.0은 multi-level·fabric·G-FAM·DCD, 3.1은 PBR 라우팅·FM API·deadlock 규칙을 정의했습니다.
- switch는 *VCS·vPPB*로 host별 가상 switch를 만들고, FM이 vPPB를 포트·LD에 bind/unbind합니다.
- *HBR*은 Hierarchy Based Routing, *PBR*은 12-bit PID 기반이며 FM이 순환 없는 라우팅 테이블을 짜야 합니다.
- *FM*은 형태가 자유로운 논리 프로세스. FM API는 mailbox CCI나 MCTP(DSP0234 binding)로 전달합니다.
- *DCD*는 DC Region·DC block·Extent List로 용량을 바꾸고, 추가는 FM이 시작해 host가 수락합니다.

## 다음 편

[Ch 14: Security — IDE·SPDM·TSP·CXL TEE](/blog/embedded/hardware/cxl/chapter14-security)에서 *CXL 보안 메커니즘 4종*과 *fabric 환경의 confidential computing*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Postmortem Debugging Ch 6: CXL Fabric Postmortem](/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·DMTF·각 switch 벤더 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
