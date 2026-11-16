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

기준 문서는 [CXL 3.1 §11](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)입니다. 은행 금고에 비유하면 SPDM은 직원 신분 확인, IDE는 현금 수송차의 잠금, TSP는 금고 안 개인 대여함입니다. 셋은 지키는 대상이 다릅니다.

이 장의 보안 흐름은 실행하지 않았습니다. 이 시리즈의 환경에는 이를 시험할 대상이 없었습니다. QEMU 11.1.3 Type 3 endpoint의 `lspci -vvv`에는 MSI-X, PCIe, Device Serial Number, CXL DVSEC 네 개, DOE, AER만 있고 IDE extended capability가 없습니다. Linux v6.12 `drivers/cxl/` 전체에서 `ide`·`spdm`·`tsp`·`tdisp`를 단어 단위로(`grep -iw`) 찾으면 나오는 것은 `core/trace.h:47-48`의 RAS 오류 이름 `"IDE Tx Error"`·`"IDE Rx Error"` 두 줄뿐입니다. 그래서 아래 내용은 모두 규격 본문의 절·표로 설명합니다.

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

§11.3.5는 Skid 모드를 쓰려면 그 짧은 시간 창 안의 공격을 소프트웨어·애플리케이션 스택이 견딜 수 있어야 하고, 그렇지 않으면 결과가 정의되지 않는다고 씁니다. §11.3.4의 각주는 x16·32 GT/s 링크에서 64-bit IV가 한 바퀴 도는 데 1000년이 넘게 걸린다고 적습니다. §11.3.5.1은 모든 장치가 Containment 모드를 지원해야 한다고 정합니다.

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

TDISP는 PCI-SIG의 TEE Device Interface Security Protocol입니다. §11.5.1은 TSP가 TDISP를 보완한다고 쓰고, 3.1 개정 이력은 TSP가 IDE·TDISP와 함께 쓸 수 있지만 둘 중 어느 것에도 의존하지 않는다고 적습니다. 그래서 한쪽이 켜졌다는 사실로 다른 쪽의 상태를 알 수 없습니다.

규격이 단계마다 요구하는 것을 모으면 다음과 같습니다.

| 단계 | 규격이 정한 것 | 출처 |
|------|------|------|
| 디바이스 신원·측정 | SPDM 메시지 교환(버전 협상부터 측정·session까지). TSP는 SPDM 1.2 이상 | DSP0274 1.2.3 §7, CXL 3.1 §11.5.2 |
| SPDM session | session은 CXL_IDE_KM 메시지를 보호하고, IDE 키·IV는 그 메시지로 따로 설정 | §11.4 |
| CXL.cachemem IDE | 무결성 검사가 한 번 실패하면 이후 모든 보안 트래픽을 버림 (68B·256B 공통) | §11.3 |
| IDE 모드 | 모든 장치가 Containment 모드 지원 | §11.3.5.1 |
| TSP 잠금 | CONFIG_LOCKED에서만 TEE 트랜잭션 허용, Transport Security 실패·CXL Reset이면 ERROR | §11.5.4.8, Figure 11-30 |
| TSP 범위 | root port에 직접 연결된 Type 3, HDM-H, 256B flit만 | §11.5.2 |

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
- *TDISP*는 PCI-SIG 표준이고, TSP는 이를 보완하되 의존하지 않습니다.
- QEMU 11.1.3 Type 3에는 IDE capability가 없고, Linux v6.12 `drivers/cxl/`에는 IDE 관련 코드가 RAS 오류 이름 두 줄뿐이라 이 장의 흐름은 실행하지 않았습니다.

## 다음 편

[Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계](/blog/embedded/hardware/cxl/chapter15-ras-performance)에서 *Reliability·Availability·Serviceability*, *Performance Considerations*, *Compliance Testing*을 분해하고 *시리즈 마무리*합니다.

## 관련 항목

- [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Embedded Security Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee)

## 시리즈 자료 출처 안내

이 글은 위 CXL 3.1 §11과 DMTF DSP0274 v1.2.3을 대조했습니다. §11.3.5의 모드별 수치, §11.5.2·§11.5.3.2의 SPDM 1.2 이상 조건, §11.5.4.8의 ERROR 후 정리를 각각 확인했습니다. QEMU 11.1.3 게스트의 `lspci -vvv`와 Linux v6.12 `drivers/cxl/` grep 결과로 실행 환경에 해당 기능이 없음을 확인했습니다. 4.0 백서의 제목에 'Security'가 들어 있지만 본문은 보안 변경을 설명하지 않아, 4.0의 보안 변경은 다루지 않습니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
