---
title: "Ch 14: Security — IDE·SPDM·TSP·CXL TEE"
slug: "embedded/hardware/cxl/chapter14-security"
date: 2026-05-16T09:14:00
description: "SPDM·CXL IDE·CXL_IDE_KM·TSP가 각각 무엇을 지키고 어떻게 맞물리는지."
series: "CXL 4.0 Internals"
seriesOrder: 14
tags: [cxl-security, ide, spdm, tsp, tdisp]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL 보안은 *SPDM 인증*, *CXL IDE 링크 보호*, *TSP(TEE Security Protocol)*가 맡고, PCIe 쪽 *TDISP*와 함께 쓸 수 있습니다."** — SPDM(DMTF DSP0274)으로 디바이스를 인증하고 secure session을 열고, 그 session으로 보호된 *CXL_IDE_KM* 메시지로 IDE 키를 넣습니다. TSP(CXL 3.1)는 *직접 연결된 Type 3 메모리*를 TVM 신뢰 경계 안에 넣는 프로토콜입니다. 이 장은 CXL 3.1 spec §11 기준입니다.

[Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 *Fabric Manager의 control plane*을 봤습니다. 이 장은 *링크와 디바이스의 보안*입니다.

기준 문서는 [CXL 3.1 §11](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)입니다. 이 장은 프로토콜의 역할과 실패 경계를 대조한 설명이며, 실제 인증서 검증·IDE 활성화·TSP 잠금 시험을 수행한 결과가 아닙니다. 보안 세대명이나 capability만으로 현재 연결의 보호 상태를 판단할 수 없으므로, 각 단계에서 필요한 증거를 함께 봅니다.

## IDE가 막는 위협

CXL 3.1 §11.1의 IDE 보안 모델이 범위로 잡는 것:

| 구분 | 내용 |
|------|---------|
| 보호 대상 | 물리 링크 양 끝 사이를 오가는 트랜잭션(데이터 + 메타데이터) |
| 위협 | 실험 장비·interposer·악성 Extension Device로 링크 데이터를 들여다보기, 데이터·프로토콜 메타데이터 변조, 기록 후 재전송, flit 재배열·삭제, 트랜잭션 주입 |
| 위협 | 신뢰하는 디바이스를 다른 디바이스로 바꾸거나, 떼어 내 공격자 시스템에 붙이기 |
| 범위 밖 | 디바이스 내부 구현의 취약점, 호스트·디바이스 안의 키 보호, DoS |

CXL.cachemem IDE는 *point-to-point* 보호라, 경로 위 switch도 이 spec을 지원해야 하고 TCB에 들어갑니다.

## 구성 요소 한눈에

| 구성 요소 | 정의 주체 | 역할 |
|-------|------|------|
| **SPDM** | DMTF DSP0274 | 디바이스 인증·측정, secure session |
| **CXL IDE** | CXL (CXL.io는 PCIe IDE 따름) | 링크 트래픽의 기밀성·무결성·재전송 방지 |
| **CXL_IDE_KM** | CXL §11.4 | SPDM session 위에서 CXL.cachemem IDE 키·IV 설정 |
| **TSP** | CXL §11.5 (3.1에서 추가) | 직접 연결 Type 3 메모리를 TVM 신뢰 경계에 포함 |
| **TDISP** | PCI-SIG | PCIe 디바이스를 TVM 신뢰 경계에 포함. TSP는 이를 보완 |

## SPDM — 디바이스 인증

*SPDM (Security Protocol and Data Model)*은 DMTF DSP0274입니다. 메시지 시퀀스 자체는 CXL 고유가 아닙니다. 버전 협상, 알고리즘 합의, 인증서 확보, challenge, 측정, session 키 확립까지의 흐름은 [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)에 정리돼 있습니다.

CXL에서 SPDM 메시지는 *PCIe DOE*나 *MCTP*로 오갑니다(§11.4). DOE는 [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서 본 config space mailbox입니다. TSP는 SPDM 1.2 이상을 요구합니다(§11.5.2).

## CXL IDE — 링크 보호

*CXL IDE*는 CXL.io·CXL.cache·CXL.mem 트래픽을 모두 가리키는 말이고, *CXL.cachemem IDE*는 그중 CXL.cache·CXL.mem 쪽입니다(§11.1).

### CXL.io IDE

PCIe IDE 정의를 따르고, 차이만 spec에 적혀 있습니다(§11.2).

| PCIe IDE 항목 | CXL.io에서 |
|------|-----|
| Link IDE stream | 지원. CXL.cachemem IDE는 Link IDE stream에 묶인 키만 씀 |
| Selective IDE stream | 지원. CXL.io에만 적용 |
| Switch | CXL switch는 Link IDE stream을 지원해야 함 |

### CXL.cachemem IDE

| 항목 | 내용 (§11.3) |
|------|-----|
| 알고리즘 | AES-GCM (NIST SP 800-38D), 256-bit 키 |
| 단위 | flit 단위. 프로토콜 계층에서 retry 대상인 flit은 모두 암호화·무결성 보호 |
| 보호 안 되는 것 | 68B: link layer control flit·CRC. 256B: link layer control 정보·flit header·CRC/FEC |
| 순서 | Link CRC는 암호화된 flit으로 계산. CRC 통과한 flit만 복호화 후 무결성 검사 |
| 무결성 실패 시 | 이후 모든 보안 트래픽을 버림 |
| PCRC | 암호 엔진 내부 오류 대비. CXL.cachemem IDE에서 필수, 기본 활성 |
| 키 갱신 | 데이터 손실 없이 지원해야 함. 자주 일어나지 않을 것으로 보고 지연·대역폭 손해는 허용 |

무결성 값을 얼마나 자주 보내느냐로 두 모드가 있습니다(§11.3.5).

| 모드 | 동작 | Aggregation Flit Count |
|------|------|------|
| Containment | 무결성 검사를 통과한 뒤에만 데이터를 넘김. 여러 flit을 버퍼링해야 해서 지연·대역폭 모두 손해 | 68B 5, 256B 2 |
| Skid | 검사 전에 데이터를 넘겨 검사 완료 대기를 줄임. 변조 데이터가 먼저 소비될 수 있고 나중에 검사에서 잡힘 | 68B 128, 256B 32 |

Skid 모드를 쓰려면 그 창 안의 공격을 소프트웨어 스택이 견딜 수 있어야 하고, 그렇지 않으면 결과는 정의되지 않습니다. 위 수치는 CXL 3.1 §11.3.5의 모드별 aggregation 설정이며, 특정 제품의 성능 측정값이 아닙니다. 먼저 소비된 데이터의 영향을 나중의 무결성 실패 알림이 자동으로 되돌려 주지는 않습니다.

자세한 내용은 [Embedded Security Ch 11 PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide).

## CXL_IDE_KM — 키 넣기

CXL.cachemem IDE 키를 설정하는 쪽을 spec은 *CIKMA*(CXL.cachemem IDE Key Management Agent)라 부릅니다. 절차는 세 단계입니다(§11.4).

| 단계 | 동작 |
|------|------|
| 1 | 링크 양 끝의 CXL IDE capability 레지스터를 읽고 제어 레지스터 설정 |
| 2 | 양 끝 포트와 각각 *SPDM secure session* 수립 (PCIe DOE 또는 MCTP) |
| 3 | *CXL_IDE_KM* 메시지로 capability 조회, 필요하면 포트가 만든 키·IV 받기, Rx/Tx 키·IV 설정, IDE 활성화. 이 메시지는 2단계 session 키로 보호됨 |

CXL_IDE_KM 메시지는 SPDM vendor-defined 요청·응답으로 만들어집니다. Root Port는 host 고유 방식으로 키를 넣을 수 있고, 그 경우 Root Port와의 SPDM session은 없어도 됩니다.

정리하면 SPDM session 키가 곧 IDE 키는 아닙니다. session은 *IDE 키를 안전하게 나르는 통로*입니다.

## TSP — TEE Security Protocol

이 장에서 쓰는 이름은 CXL 3.1 §11.5의 *CXL Trusted Execution Environments Security Protocol*입니다.

목적은 *직접 연결된 CXL 메모리 디바이스*를 TVM 신뢰 경계 안에 넣는 것입니다. PCI-SIG TDISP가 PCIe 디바이스에 대해 하는 일을 CXL 메모리 쪽에서 *보완*합니다(§11.5.1). IDE·TDISP와 함께 쓸 수 있지만 둘 중 어느 것에도 의존하지 않습니다(3.1 개정 이력).

CXL 3.1 TSP의 범위(§11.5.2):

| 포함 | 제외 |
|------|------|
| host Root Port에 *직접* 연결된 Type 3 (LD, SLD, MH-SLD) | CXL switch, switch 뒤 디바이스(MLD 포함) |
| Dynamic Capacity 디바이스 | Direct P2P (UIO, CXL.mem, CXL.io) |
| HDM-H 메모리 | HDM-D·HDM-DB, Type 1·2의 Type 3 HDM 접근 |
| 256B flit | PBR, 68B flit |
| pooling (같은 물리 메모리를 공유하지 않는 여러 initiator) | sharing (동시 공유) |

즉 3.1의 TSP는 *fabric 보안*이 아니라 *직접 연결 메모리의 confidential computing*입니다.

### Target 보안 상태

TSP target의 상태(§11.5.4.8, Figure 11-30):

| 상태 | 의미 | 전이 |
|------|------|----------|
| CONFIG_UNLOCKED | Conventional Reset 뒤 기본. 보안 설정을 하는 상태. TEE opcode 트랜잭션 불가 | 잠금 성공 → CONFIG_LOCKED |
| CONFIG_LOCKED | 레지스터·CCI 접근 제한, TE State 저장·검사. TEE 트랜잭션 허용 | Transport Security 실패(IDE가 안전하지 않게 됨 등)·CXL Reset → ERROR. Conventional Reset → CONFIG_UNLOCKED |
| ERROR | TVM 데이터는 계속 보호, 새 TEE 트랜잭션 거부 | 세션·데이터 정리 후 자동으로, 또는 Conventional Reset → CONFIG_UNLOCKED |

설정과 잠금은 host가 *PrimarySession*으로 합니다. host가 모든 설정 정책을 갖는 단일 권한 모델입니다.

## 지원 기능과 활성 상태를 구분하기

TDISP는 PCI-SIG의 TEE Device Interface Security Protocol입니다. TSP와 역할이 연결되지만, 한쪽의 지원 여부로 다른 쪽이 활성화됐다고 판정할 수는 없습니다. 이 시리즈에서 실제로 대조한 Linux 소스는 [v6.12의 CXL 드라이버](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl)이며, 그 소스 검토는 최신 커널의 TDISP·TSP 지원 현황이나 특정 플랫폼의 confidential computing 동작을 입증하지 않습니다.

다음 표는 장비 검증 시 필요한 관찰을 분리한 것입니다. 아래 실패 사례는 판단 기준이며, 실제 공격 실험의 결과가 아닙니다.

| 확인 단계 | 필요한 증거 | 그 증거만으로 부족한 경우 |
|------|------|------|
| 디바이스 신원 | 신뢰 anchor와 인증서 체인·challenge 검증 | 유효한 인증서가 있어도 측정값이 허용한 firmware와 다를 수 있음 |
| 디바이스 측정 | 서명·freshness와 허용 측정값 정책의 대조 | 측정 응답 수신만으로 정책 승인이라고 할 수 없음 |
| SPDM session | 협상과 key exchange·session 수립 성공 | session 키가 IDE 트래픽 키와 같다는 뜻은 아님 |
| IDE | 양 끝의 해당 stream 설정·키 갱신·활성 상태와 오류 처리 | capability 비트 또는 키 입력 성공만으로 보호된 트래픽을 확인할 수 없음 |
| TSP | 올바른 target 범위·메모리 정책·CONFIG_LOCKED 상태 | switch 뒤 디바이스를 3.1의 직접 연결 범위에 포함하거나, 잠금 실패 뒤 접근을 계속하면 안 됨 |
| 실패 뒤 복구 | 새 TEE 접근 차단과 session·데이터 정리, 재설정 결과 | ERROR 표시가 사라졌다는 이유만으로 기존 TVM 데이터를 재사용하면 안 됨 |

SPDM의 신원·측정·session 역할은 [DMTF DSP0274 v1.2.3 §7](https://www.dmtf.org/sites/default/files/standards/documents/DSP0274_1.2.3.pdf)을 참고하세요. 신원은 출입증, 측정값 정책은 반입 장비 검사에 가깝습니다. 출입증 검사와 실제 링크 보호 상태를 각각 확인해야 전체 경계를 설명할 수 있습니다.

자세한 내용은 [Embedded Security Ch 13 CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee).

## 자주 하는 실수

### "IDE만 켜면 디바이스 안의 데이터도 안전"

IDE의 보호 대상은 *링크 위 트랜잭션*입니다. 디바이스 내부 데이터 보호는 구현 몫이고 spec 범위 밖입니다(§11.1). 메모리 내용을 TVM 단위로 지키려면 TSP의 메모리 암호화·접근 제어가 필요합니다.

### "SPDM session 키로 IDE를 암호화한다"

session은 CXL_IDE_KM 메시지를 보호하고, 그 메시지로 IDE 키·IV를 따로 설정합니다(§11.4).

### "TSP는 multi-host fabric 보안"

CXL 3.1 TSP는 switch·PBR·memory sharing을 *범위에서 뺍니다*. 직접 연결된 Type 3 메모리용입니다(§11.5.2).

### "TDISP는 CXL 표준이다"

TDISP는 PCI-SIG 표준입니다. CXL 쪽 대응물이 TSP이고, 둘은 보완 관계입니다.

### "Skid 모드면 보호가 없다"

무결성 검사는 그대로 하고, 데이터를 *검사 전에* 넘길 뿐입니다. 변조는 나중에 검출되지만, 그 사이 소비된 데이터를 소프트웨어가 감당해야 합니다(§11.3.5).

## 정리

- *SPDM*(DSP0274)이 인증과 secure session을, *CXL_IDE_KM*이 그 session 위에서 IDE 키 설정을 맡습니다.
- *CXL.io IDE*는 PCIe IDE를 따르고, *CXL.cachemem IDE*는 flit 단위 AES-GCM 256, PCRC 필수, Containment/Skid 모드.
- *TSP*(CXL 3.1)는 직접 연결 Type 3 메모리를 TVM 신뢰 경계에 넣습니다. switch·PBR·sharing은 3.1 범위 밖.
- TSP target 상태는 CONFIG_UNLOCKED → CONFIG_LOCKED → (ERROR).
- *TDISP*는 PCI-SIG 표준입니다. 실제 보호 여부는 플랫폼·소프트웨어 버전과 해당 연결의 활성 상태로 확인합니다.

## 다음 편

[Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계](/blog/embedded/hardware/cxl/chapter15-ras-performance)에서 *Reliability·Availability·Serviceability*, *Performance Considerations*, *Compliance Testing*을 분해하고 *시리즈 마무리*합니다.

## 관련 항목

- [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Embedded Security Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee)

## 시리즈 자료 출처 안내

이 글은 위 CXL 3.1 §11과 DMTF DSP0274 v1.2.3을 대조했습니다. §11.3.5의 모드별 수치, §11.5.2·§11.5.3.2의 SPDM 1.2 이상 조건, §11.5.4.8의 ERROR 후 정리를 각각 확인했습니다. 이 설명을 CXL 4.0의 전체 보안 기능이나 특정 OS의 지원 검증으로 확장하지 않습니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
