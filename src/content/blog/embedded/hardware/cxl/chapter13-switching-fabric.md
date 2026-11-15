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

구조와 명령은 [CXL 3.1](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) §7·§9.13.3을 기준으로 설명합니다. 핵심 질문은 “연결 명령이 끝난 뒤 누가 메모리를 사용할 권한을 갖는가”입니다. switch의 binding 완료, host의 디바이스 발견, 애플리케이션의 안전한 메모리 사용은 각각 확인해야 합니다. 이 장에서는 실제 FM 명령이나 용량 회수를 실행하지 않았습니다.

## 세대별로 더해진 것

spec 개정 이력과 컨소시엄 발표 기준:

| 세대 | Switching·fabric 관련 추가 |
|------|-----------|
| CXL 2.0 | 단일 계층 switch, MLD를 이용한 memory pooling |
| CXL 3.0 | multi-level switching, fabric, G-FAM, memory sharing, Multi-headed MLD, DCD, PBR switch SW 관점(개요) |
| CXL 3.1 | PBR fabric 디코딩·라우팅과 관련 FM API 확장, fabric deadlock 회피 규칙, Direct P2P CXL.mem, TSP |
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
| **PBR** | Port Based Routing | 메시지에 *12-bit PID*(DPID, 경우에 따라 SPID)를 실어 라우팅. 4096개 인코딩 공간이며 사용 가능한 host 수와 같지 않음 |

기존 host·디바이스가 연결된 fabric 가장자리에서는 *Edge Switch*가 기본 메시지와 PBR 메시지 사이를 변환합니다(§2.7). 모든 링크가 PBR 형식인 것은 아닙니다. PID의 역할·예약 값과 구현 자원 제한도 있으므로 12-bit라는 사실만으로 4096대의 host를 연결할 수 있다고 계산하면 안 됩니다.

### PBR과 deadlock

PBR switch가 한 Fabric Port에서 다른 Fabric Port로 메시지를 넘기면 의존 관계가 생깁니다(§7.7.5.1).

- spec은 PCIe tree·fat tree의 계층적 구성을 순환 없는 예로 듭니다.
- 여기서 검토할 순환은 선택한 경로의 *채널·전달 의존 관계*입니다. 물리 배선 그림에 고리가 있는지만 확인해서는 부족합니다.
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

FM API를 MCTP로 실을 때의 binding은 DMTF [DSP0234 v1.0.0](https://www.dmtf.org/sites/default/files/standards/documents/DSP0234_1.0.0.pdf)이 정합니다(§7.6.3). MCTP 자체는 [DSP0236 v1.3.1](https://www.dmtf.org/sites/default/files/standards/documents/DSP0236_1.3.1.pdf)을 참고할 수 있습니다. 이 binding은 메시지 운반 규칙이며, FM의 고가용성·tenant 권한 정책·실패 후 구성 복구까지 자동으로 제공하지는 않습니다.

## Pooling — bind와 unbind

FM이 MLD의 LD를 host에 붙이고 떼는 흐름(§7.6.6.5~7.6.6.6):

| 동작 | 단계 |
|------|------|
| Bind | FM이 *Bind vPPB*(Opcode 5201h)로 물리 포트·VCS ID·vPPB 번호를 지정. MLD면 LD-ID도 지정. host가 이미 부팅했으면 switch가 Managed Hot-Add를 시작할 수 있음. 끝나면 switch가 Virtual CXL Switch Event Record로 FM에 알림 |
| Unbind | FM이 *Unbind vPPB*(Opcode 5202h)로 VCS ID·vPPB 번호를 지정. 옵션에 따라 Managed Hot-Remove 또는 Surprise Hot-Remove. 끝나면 같은 Event Record |

host 입장에서는 LD가 *PCIe hot-plug*로 나타나고 사라지는 것입니다. CEDT가 바뀌는 것이 아닙니다.

다만 hot-remove는 사용 중인 메모리를 다른 host로 안전하게 옮기는 명령이 아닙니다. System RAM이면 사용 페이지의 이동·회수와 offline 가능 여부, DAX이면 매핑과 접근 중단을 먼저 확인해야 합니다. 캐시·미완료 접근·기존 데이터의 격리까지 정리해야 다음 소유자에게 넘길 수 있습니다. Surprise Hot-Remove는 이런 정리가 성공했다는 증거가 아닙니다.

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

추가 이벤트나 host의 extent 수락도 곧바로 Linux 메모리 online을 뜻하지 않습니다. 주소 공간 예약, 해당 커널의 DCD 지원, 사용 방식에 따른 매핑·online 단계가 따로 필요합니다. 반납할 때는 현재 사용 중인 범위를 실제로 비울 수 있는지가 조건입니다.

## 부분 실패를 확인하는 순서

FM은 switch 구성과 host 상태를 동시에 완성하는 단일 트랜잭션이 아닙니다. 아래는 spec의 명령·이벤트를 운영 관점에서 나눈 점검표이며, 실행 결과가 아닙니다. 도서관 장부에서 소유자를 바꿔도 대출된 책이 자동 회수되지 않는 것처럼, binding 변경만으로 기존 접근이 사라지지는 않습니다.

| 관찰 | 아직 입증하지 못한 것 | 다음 확인 |
|------|------|------|
| Bind 완료 이벤트 | host의 열거·드라이버 초기화·사용 가능한 용량 | host의 PCI/메모리 디바이스와 decoder·region 상태 |
| DC Add 이벤트 | host가 해당 extent를 수락했는지 | 응답과 갱신된 extent 목록, host의 매핑 상태 |
| Release 요청 전송 | 사용 페이지·DAX 매핑이 모두 해제됐는지 | 사용 중단과 host 반납 완료, 디바이스의 최종 소유 상태 |
| FM 통신 시간 초과 | 명령 미실행 또는 취소 | 실제 binding·extent 상태 재조회 후 조정. 맹목적 재전송·되돌리기 금지 |

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

- CXL 2.0은 단일 계층 switch·MLD pooling, 3.0은 multi-level·fabric·G-FAM·DCD, 3.1은 PBR 라우팅·관련 FM API 확장·deadlock 규칙을 정의했습니다.
- switch는 *VCS·vPPB*로 host별 가상 switch를 만들고, FM이 vPPB를 포트·LD에 bind/unbind합니다.
- *HBR*은 Hierarchy Based Routing, *PBR*은 12-bit PID 기반이며 FM이 순환 없는 라우팅 테이블을 짜야 합니다.
- *FM*은 형태가 자유로운 논리 프로세스. FM API는 mailbox CCI나 MCTP(DSP0234 binding)로 전달합니다.
- *DCD*는 DC Region·DC block·Extent List로 용량을 바꾸고, 추가는 FM이 시작해 host가 수락합니다.

## 다음 편

[Ch 14: Security — IDE·SPDM·TSP·CXL TEE](/blog/embedded/hardware/cxl/chapter14-security)에서 *SPDM·IDE·TSP*가 각각 무엇을 지키는지, 직접 연결 메모리의 confidential computing까지 봅니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Postmortem Debugging Ch 6: CXL Fabric Postmortem](/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 spec(§7, §8.2.9.9.9, §9.13.3)과 개정 이력, [CXL 4.0 웨비나](https://computeexpresslink.org/wp-content/uploads/2025/12/CXL_4.0-Webinar_December-2025_FINAL.pdf), 위 DMTF binding을 대조했습니다. 세대별 신기능은 [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)의 공식 발표 출처를 참고하세요. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
