---
title: "PCIe·CXL IDE 분석 — 링크 무결성과 데이터 암호화"
slug: "embedded/embedded-security/chapter11-pcie-cxl-ide"
date: 2026-06-17T09:01:00
description: "PCIe·CXL IDE (Integrity and Data Encryption) — 링크 sniff·MITM 위협, AES-GCM 암호화, Selective vs Link IDE, CXL_IDE_KM 키 관리, Containment·Skid 모드."
series: "Embedded Security"
seriesOrder: 11
tags: [cxl, pcie, ide, integrity, encryption, aes-gcm, link-security]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> IDE capability, stream enable, secure 상태, 실제 traffic 보호는 각각 확인해야 합니다. PCIe/CXL.io와 CXL.cachemem의 보호 단위·설정 경로를 혼동하지 않습니다.

[Ch 4](/blog/embedded/embedded-security/chapter04-trustzone)·[Ch 5](/blog/embedded/embedded-security/chapter05-tee)의 격리는 CPU·실행 환경의 경계이고, IDE는 port 사이 전송 데이터의 경계입니다. Link encryption이 필요한지는 실제 데이터 경로·물리 접근·신뢰 끝점·device 내부 보호를 포함한 threat model로 정합니다.

이 장은 **pciutils 3.13.0의 실제 decoder**와 [**CXL 3.1**](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)(Revision 3.1, Version 1.0, 2023-08-07) §11.1~11.4를 기준으로 합니다. PCIe Base Specification 원문은 대조하지 않았고, 실제 IDE link를 수립하지도 않았습니다. PCI-SIG의 [2020 IDE 공개 webinar](https://pcisig.com/sites/default/files/files/PCIe%20Security%20Webinar_Aug%202020_PDF.pdf)는 stream 개념의 배경으로만 사용하며, 당시 개발 중인 ECN 자료를 최신 normative spec으로 쓰지 않습니다.

## 위협 모델

정상적으로 설정된 IDE stream의 보호 목적은 다음과 같습니다. 보호되는 field와 신뢰 끝점을 먼저 확인합니다.

| 공격 | 방법 | IDE 방어 |
|------|------|---------|
| Passive eavesdropping | Protocol analyzer로 TLP·flit 읽기 | AES-GCM 암호화로 *내용 은닉* |
| Active tampering | TLP·flit 수정·재전송 | AES-GCM 인증값과 protocol 규칙으로 변조 검출 |
| Replay attack | 과거 패킷 다시 보냄 | 규격의 counter·IV·수신 상태 관리로 replay 검출 |

CXL 3.1 §11.1의 security model은 lab 장비·전용 interposer·악성 extension device로 link를 들여다보고, 바꾸고, 재전송·재정렬·삭제·삽입하는 물리 공격을 위협으로 듭니다. 신뢰하던 device를 untrusted device로 바꿔 끼우는 공격도 포함합니다. 반대로 "부적절한 device 구현"으로 생기는 노출과 denial of service는 범위 밖이라고 명시합니다. Interposer를 꽂는 것 자체는 막지 못하고, 꽂힌 interposer가 traffic을 읽거나 바꾸지 못하게 할 뿐입니다.

링크 끝점 자체(host CPU, 디바이스 controller)의 *키 보호*는 *IDE의 책임 밖*입니다. 같은 절은 "host와 device 내부에서 이 key를 보호하는 메커니즘은 정의하지 않는다"고 적습니다.

## IDE의 두 모드 — Selective vs Link

PCIe IDE의 두 stream은 다음과 같습니다. 보호 범위 설명은 CXL 3.1 Table 11-1과 pciutils의 register 정의(Link block은 TC별, Selective block은 RID·주소 association register를 가짐)에서 옮겼습니다.

| Stream | 보호 범위 | 비고 |
|------|----------|---------|
| **Link IDE** | 인접한 두 포트 사이 링크의 TLP | traffic class(TC)별 stream |
| **Selective IDE** | RID·주소 범위에 연결된 TLP | switch를 flow-through로 지나 endpoint까지 갈 수 있음 |

CXL에서는 두 종류를 나눠 씁니다(CXL 3.1 §11.2, Table 11-1). *CXL.io*는 PCIe IDE를 따라 Link·Selective IDE stream을 모두 지원하고, Selective IDE stream은 CXL.io에만 적용됩니다. *CXL.cachemem IDE*는 Link IDE stream에 묶인 키만 쓰고, CXL switch는 Link IDE stream을 지원해야 합니다.

## 암호화 알고리즘 — AES-GCM 256

CXL.cachemem IDE는 NIST SP 800-38D의 *AES-GCM*을 256-bit 키로 씁니다(CXL 3.1 §11.3). Flit의 모든 bit가 보호되지는 않습니다. §11.3에 따르면 68B flit mode에서 link layer control flit과 flit CRC는 암호화도 무결성 보호도 없고, 256B flit mode에서도 link layer control 정보·flit header·CRC/FEC는 보호 대상이 아닙니다. Link CRC는 암호화된 flit 위에서 계산하므로 link retry가 먼저 일어나고, CRC를 통과한 flit만 복호화·무결성 검사로 갑니다. 68B mode의 protocol header flit에서 slot 0의 32-bit header는 AAD(인증만), 나머지 slot은 암호화·인증 대상입니다(§11.3.1).

| 요소 | 값 | 출처 |
|------|----|----|
| 대칭 키 | 256-bit | §11.3 |
| IV | 96-bit. bit 95:64 고정 필드(95:92 = sub-stream `1000b`, 91:64 = 0) + bit 63:0 invocation counter, 초기값 `0000 0001h` | §11.3.4 |
| MAC | 96-bit | §11.3.1 |
| 보호 단위 | flit. 여러 flit을 묶은 *MAC epoch* 단위로 MAC 계산 | §11.3.1 |

## 키 관리 — IDE_KM (Key Management)

IDE 자체는 *데이터 흐름의 암호화*만 정의합니다. *키를 어떻게 넣고 바꿀지*는 별도 프로토콜이 담당합니다. CXL.cachemem IDE에서는 *CXL_IDE_KM*입니다(CXL 3.1 §11.4).

| 단계 | 동작 |
|------|------|
| 1 | 링크 양 끝의 CXL IDE capability 레지스터를 읽고 제어 레지스터 설정 |
| 2 | 양 끝 포트와 각각 *SPDM secure session* 수립 (PCIe DOE 또는 MCTP, [Ch 12](/blog/embedded/embedded-security/chapter12-spdm-cma)) |
| 3 | *CXL_IDE_KM* 메시지로 capability 조회, 필요하면 포트가 만든 키·IV 받기, Rx/Tx 키·IV 설정, IDE 활성화 |

CXL_IDE_KM 메시지는 SPDM vendor-defined 요청·응답으로 만들어지고 2단계 session으로 보호됩니다. 즉 SPDM session 키가 IDE 키가 되는 것이 아니라, session이 *IDE 키를 안전하게 나르는 통로*입니다. 송수신에 쓰는 키는 서로 달라야 합니다(§11.3.4).

키 갱신(key refresh)은 *데이터 손실 없이* 지원해야 합니다. spec이 드는 예는 가속기를 다른 VM으로 옮길 때와, 오래 도는 디바이스의 *key wear-out* 우려입니다. spec은 key refresh가 *자주 일어나지 않는다*고 보고 그때의 지연·대역폭 손해를 허용합니다(§11.3). IV의 invocation counter는 IV를 소비할 때마다 증가하는 64-bit 값이고, 송수신 양쪽 모두 rollover를 검출할 의무가 없습니다(§11.3.4). 이유는 같은 절의 각주에 있습니다. x16 link를 32 GT/s로 돌려도 64-bit IV가 한 바퀴 도는 데 1,000년이 넘게 걸립니다. 이 IV는 SP 800-38D의 결정적 구성이므로 [Ch 3](/blog/embedded/embedded-security/chapter03-mcu-crypto)에서 본 난수 IV의 2^32 상한에 걸리지 않습니다.

## 성능 영향

CXL.cachemem IDE는 무결성 값(MAC)을 얼마나 자주 보내느냐로 두 모드를 둡니다(CXL 3.1 §11.3.5).

| 모드 | 동작 |
|------|------|
| Containment | 무결성 검사를 통과한 뒤에만 데이터를 넘김. MAC을 자주 보내야 하고 flit을 버퍼링해야 해서 지연·대역폭 모두 손해. Aggregation Flit Count는 68B mode 5, 256B mode 2. 모든 device가 지원해야 함(§11.3.5.1) |
| Skid | 검사 전에 데이터를 넘김. 지연 손해는 거의 없고 대역폭 손해도 작음. Aggregation Flit Count는 68B mode 128, 256B mode 32. 변조된 데이터가 잠깐 소비될 수 있고 나중에 검사에서 잡힘 |

PCRC(암호 엔진 내부 오류 대비 CRC)는 CXL.cachemem IDE에서 필수이고 기본으로 켜지며, MAC 검사에 합쳐져 추가 링크 대역폭을 쓰지 않습니다(§11.3).

Skid의 "near-zero latency overhead"는 §11.3.5의 설명이고 측정값이 아닙니다. 이 글에서도 throughput·지연을 측정하지 않았습니다. 무결성 검사가 실패하면 어떻게 될까요? §11.3은 "이후의 모든 secure traffic을 drop한다"고 정합니다. 변조 하나가 link 전체의 secure traffic 중단으로 이어지므로, Skid에서 잠깐 소비된 데이터를 되돌리는 일과 link 복구가 소프트웨어 몫으로 남습니다. 상세 보호 범위는 [CXL Ch14](/blog/embedded/hardware/cxl/chapter14-security)를 참고합니다.

## 운영 — 활성화 확인

실제 장치는 양 끝 port·stream ID·RID/address association·enable/state와 failure log를 함께 확인해야 합니다. 한 BDF의 capability 출력만으로 전체 경로를 판정하지 않습니다.

```bash
lspci -n -vv -s 0000:5e:00.0
```

위 BDF는 조사 명령의 예이며 실제 장치에 실행하지 않았습니다. 대신 아래처럼 dump fixture를 decode했습니다.

### 실행한 검사 — synthetic dump를 실제 lspci로 decode

[pciutils 3.13.0](https://github.com/pciutils/pciutils/tree/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee)을 Debian 13 VM에서 빌드하고, Python으로 만든 4,096-byte config space dump를 `-F` dump backend로 읽었습니다. Fixture는 PCIe capability 하나와 extended capability 두 개(0x100 DOE `0x2e`, 0x140 IDE `0x30`)를 갖습니다. IDE capability에는 Link·Selective stream 지원 bit와 IDE_KM 지원 bit를 켰습니다.

```bash
lspci -F fixture.dump -n -vv
```

Link·Selective stream을 하나씩 켜고 state를 secure(`2`)로 넣은 fixture의 출력입니다(tab만 정리).

```text
Capabilities: [100 v1] Data Object Exchange
    DOECap: IntSup-
    DOECtl: IntEn-
    DOESta: Busy- IntSta- Error- ObjectReady-
Capabilities: [140 v1] Integrity & Data Encryption
    IDECap: Lnk=1 Sel=1 FlowThru- PartHdr- Aggr- PCPC- IDE_KM+ Alg='AES-GCM-256-96b' TCs=1 TeeLim-
    IDECtl: FTEn-
    LinkIDE#0 Ctl: En+ NPR- PR- CPL- PCRC+ HdrEnc=no Alg='AES-GCM-256-96b' TC0 ID0
    LinkIDE#0 Sta: Status=secure RecvChkFail-
    SelectiveIDE#0 Cap: RID#=0
    SelectiveIDE#0 Ctl: En+ NPR- PR- CPL- PCRC- CFG- HdrEnc=no Alg='AES-GCM-256-96b' TC0 ID0
    SelectiveIDE#0 Sta: secure RecvChkFail-
    SelectiveIDE#0 RID: Valid- Base=0 Limit=0 SegBase=0
```

이 값은 fixture에 심은 상태를 decoder가 읽었다는 증거입니다. 키 설정·인증·실제 암호화 traffic의 증거가 아닙니다. Link 상태에는 `Status=`가 있고 이 판의 Selective 상태에는 없습니다. DOE register 출력에도 지원 SPDM protocol 목록은 포함되지 않습니다.

위 출력에서 Link의 `PCRC+`는 이상합니다. Fixture의 Link control 값은 `0x1`(Enable bit만)이고 PCRC Enable bit(`0x100`)는 0이었기 때문입니다. 두 bit를 반대로 넣은 fixture 두 개로 확인했습니다.

| Fixture | Link control | `LinkIDE#0 Ctl` 출력 | Selective control | `SelectiveIDE#0 Ctl` 출력 |
|------|------|------|------|------|
| En=1, PCRC=0 | `0x001` | `En+ ... PCRC+` | `0x001` | `En+ ... PCRC-` |
| En=0, PCRC=1 | `0x100` | `En- ... PCRC-` | `0x100` | `En- ... PCRC+` |

Selective는 맞게 읽고 Link만 틀립니다. 원인은 [`ls-ecaps.c`](https://github.com/pciutils/pciutils/blob/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee/ls-ecaps.c#L1590-L1598)에 있습니다. Link stream control을 찍는 `printf`의 PCRC 자리에 `PCI_IDE_LINK_CTL_PCRC_EN`이 아니라 `PCI_IDE_LINK_CTL_EN`이 한 번 더 들어가 있습니다(1594·1598행). 같은 함수의 capability 줄은 PCRC 지원 bit를 `PCPC`라는 오타 label로 찍습니다. 2026-10-20 commit `f3bf6459`(VERSION 3.15.0)의 master에서도 두 곳 모두 그대로였습니다. 그래서 `lspci`의 Link `PCRC+/-`는 PCRC 상태가 아니라 Enable 상태를 한 번 더 보여 줍니다. Link PCRC는 `lspci -xxxx`의 raw 값에서 Link IDE Stream Control register(IDE capability + 0xC)의 bit 8을 직접 읽습니다.

### 운영 판정에 추가할 실패 조건

| 관찰 | 그것만으로 부족한 것 | 추가 증거 |
|------|------|------|
| IDE capability 존재 | 실제 활성·보호 대상 | 양 끝 stream 설정·association |
| Enable=1 | secure 운용·error 이후 상태 | state·오류·key lifecycle |
| 한쪽 secure | 다른 port·다른 stream 보호 | 경로별 양 끝 일치 |
| SPDM 인증 성공 | 올바른 IDE key 설정 | 별도 IDE_KM·활성·실패 처리 |
| IDE link 정상 | device DRAM·cache·debug 보호 | device·TEE·수명주기 평가 |

Host synthetic decode 외의 항목은 이 작업에서 실행하지 않았습니다.

## 자주 하는 실수

### "IDE만 켜면 데이터센터가 안전하다"

IDE는 *링크만* 보호합니다. *디바이스 안의 메모리·캐시·레지스터*는 *별도 보호 메커니즘*이 필요합니다. CXL 3.1 §11.1의 security model도 link 양쪽 agent가 "device 내부 data를 보호하는 구현별 메커니즘"을 따로 제공해야 하며 그 메커니즘은 이 정의의 범위 밖이라고 적습니다. IDE를 켰다는 사실만으로 저장 데이터 보호를 추론하지 않습니다. 이 경계는 [Ch 13](/blog/embedded/embedded-security/chapter13-cxl-tee)의 *CXL TEE 영역*입니다.

### "한 번 키 교환하면 끝"

*아닙니다*. key refresh는 데이터 손실 없이 지원해야 하는 기능이고, VM 이동이나 key wear-out 같은 상황에서 씁니다(CXL 3.1 §11.3).

### "Skid 모드면 보호가 없다"

무결성 검사는 그대로 하고, 데이터를 *검사 전에* 넘길 뿐입니다. 변조는 나중에 검출되지만 그 사이 소비된 데이터를 소프트웨어 스택이 감당해야 합니다(§11.3.5).

## 정리

- IDE는 정의된 port 사이 traffic의 기밀성·무결성·replay 보호를 구성합니다. 모든 field·device 내부가 같은 보호 범위는 아닙니다.
- PCIe IDE는 *Link IDE*(인접 포트 사이)와 *Selective IDE*(RID·주소 범위) stream을 둡니다. CXL.cachemem IDE는 Link IDE stream의 키만 씁니다.
- Capability·enable·secure 표시와 실제 경로의 인증·키·실패 처리를 구분합니다.
- CXL.cachemem IDE 키는 *SPDM session으로 보호된 CXL_IDE_KM* 메시지로 설정됩니다. key refresh는 데이터 손실 없이 지원해야 합니다.
- *Containment*와 *Skid* 모드가 무결성 검사와 데이터 전달 시점의 trade-off를 정합니다.

다음 편은 **Ch 12: SPDM과 CMA 인증 흐름** — *IDE 키 교환을 떠받치는 SPDM 프로토콜*과 *CMA(Component Measurement and Authentication)*의 *디바이스 신원 검증·firmware 측정*을 분해합니다.

## 관련 항목

- [CXL Ch14: security — 상세 IDE·TSP 범위](/blog/embedded/hardware/cxl/chapter14-security)

- [Ch 4: ARM TrustZone 분석](/blog/embedded/embedded-security/chapter04-trustzone) — CPU 안 격리
- [Ch 5: OP-TEE 호출·저장소 경계](/blog/embedded/embedded-security/chapter05-tee) — Secure World 안의 격리
- [Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma) (다음 편)
- [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee) — Trusted Execution을 메모리 디바이스까지
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
