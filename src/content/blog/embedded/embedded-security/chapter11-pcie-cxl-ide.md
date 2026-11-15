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

이 장은 **pciutils3.13.0의 실제 decoder**와 **CXL3.1 §11.1~11.4**를 기준으로 상태 관찰의 한계를 설명합니다. PCIe Base Specification 전체를 독립 검증하거나 실제 IDE link를 수립한 결과는 아닙니다. PCI-SIG의 [2020 IDE 공개 webinar](https://pcisig.com/sites/default/files/files/PCIe%20Security%20Webinar_Aug%202020_PDF.pdf)는 stream 개념의 배경으로만 사용하며, 당시 개발 중인 ECN 자료를 최신 normative spec으로 쓰지 않습니다.

## 위협 모델

정상적으로 설정된 IDE stream의 보호 목적은 다음과 같습니다. 보호되는 field와 신뢰 끝점을 먼저 확인합니다.

| 공격 | 방법 | IDE 방어 |
|------|------|---------|
| Passive eavesdropping | Protocol analyzer로 TLP·flit 읽기 | AES-GCM 암호화로 *내용 은닉* |
| Active tampering | TLP·flit 수정·재전송 | AES-GCM 인증값과 protocol 규칙으로 변조 검출 |
| Replay attack | 과거 패킷 다시 보냄 | 규격의 counter·IV·수신 상태 관리로 replay 검출 |

IDE가 물리적인 interposer 삽입을 막는 것은 아닙니다. 신뢰 끝점·키·상태 관리가 올바른 보호 범위 안에서 도청·변조·replay에 대응합니다. CXL3.1 §11.1은 불완전한 device 구현과 DoS를 별도 범위로 둡니다.

링크 끝점 자체(host CPU, 디바이스 controller)의 *키 보호*는 *IDE의 책임 밖*입니다. 그건 *TEE·HSM*의 영역입니다.

## IDE의 두 모드 — Selective vs Link

PCIe IDE의 두 stream 개념은 다음과 같습니다. 여기서는 버전이 고정되지 않은 Linux master 주석을 PCIe7.0 원문 검증으로 대신하지 않습니다.

| Stream | 보호 범위 | 비고 |
|------|----------|---------|
| **Link IDE** | 인접한 두 포트 사이 링크의 TLP | traffic class(TC)별 stream |
| **Selective IDE** | RID·주소 범위에 연결된 TLP | switch를 flow-through로 지나 endpoint까지 갈 수 있음 |

CXL에서는 두 종류를 나눠 씁니다(CXL 3.1 §11.2, Table 11-1). *CXL.io*는 PCIe IDE를 따라 Link·Selective IDE stream을 모두 지원하고, Selective IDE stream은 CXL.io에만 적용됩니다. *CXL.cachemem IDE*는 Link IDE stream에 묶인 키만 쓰고, CXL switch는 Link IDE stream을 지원해야 합니다.

## 암호화 알고리즘 — AES-GCM 256

CXL.cachemem IDE는 NIST SP 800-38D의 *AES-GCM*을 256-bit 키로 써서 보호를 구성합니다([CXL3.1 §11.3](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)). Flit 전체의 모든 bit가 암호화되는 것은 아닙니다. §11.3.2는 암호화·인증 대상, 인증만 하는 AAD, 보호 제외 field를 나눕니다.

| 요소 | 값 | 출처 |
|------|----|----|
| 대칭 키 | 256-bit | §11.3 |
| IV | 96-bit. 상위 32-bit 고정 필드 + 하위 64-bit invocation counter | §11.3.4 |
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

키 갱신(key refresh)은 *데이터 손실 없이* 지원해야 합니다. spec이 드는 예는 가속기를 다른 VM으로 옮길 때와, 오래 도는 디바이스의 *key wear-out* 우려입니다. spec은 key refresh가 *자주 일어나지 않는다*고 보고 그때의 지연·대역폭 손해를 허용합니다(§11.3). IV의 invocation counter는 IV를 소비할 때마다 증가하는 64-bit 값이고, 송수신 양쪽 모두 rollover를 검출할 의무가 없습니다(§11.3.4).

## 성능 영향

CXL.cachemem IDE는 무결성 값(MAC)을 얼마나 자주 보내느냐로 두 모드를 둡니다(CXL 3.1 §11.3.5).

| 모드 | 동작 |
|------|------|
| Containment | 무결성 검사를 통과한 뒤에만 데이터를 넘김. 여러 flit을 버퍼링해야 해서 지연·대역폭 모두 손해 |
| Skid | 검사 전에 데이터를 넘김. 지연 손해는 거의 없고 대역폭 손해도 작음. 변조된 데이터가 잠깐 소비될 수 있고 나중에 검사에서 잡힘 |

PCRC(암호 엔진 내부 오류 대비 CRC)는 CXL.cachemem IDE에서 필수이고 기본으로 켜지며, MAC 검사에 합쳐져 추가 링크 대역폭을 쓰지 않습니다(§11.3).

구체적인 throughput·지연 비용은 구현·traffic·mode 조건으로 측정해야 합니다. 이 작업에는 실측이 없으며 near-zero라는 규격 설명을 모든 workload의 측정 결과로 확대하지 않습니다. Aggregation count와 상세 보호 범위는 [CXL Ch14](/blog/embedded/hardware/cxl/chapter14-security)를 참고합니다.

## 운영 — 활성화 확인

실제 장치는 양 끝 port·stream ID·RID/address association·enable/state와 failure log를 함께 확인해야 합니다. 한 BDF의 capability 출력만으로 전체 경로를 판정하지 않습니다.

```bash
lspci -n -vv -s 0000:5e:00.0
```

위 BDF는 조사 명령의 예이며 여기서 실제 장치에 실행하지 않았습니다. 상세 출력은 선택한 pciutils release에 의존합니다.

### 실행한 검사 — synthetic dump를 실제 lspci로 decode

[pciutils3.13.0 고정 source](https://github.com/pciutils/pciutils/blob/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee/ls-ecaps.c)의 `cap_ide()`·`cap_doe()`를 사용했습니다. 자체 생성한 4096-byte config fixture를 dump backend로 읽습니다.

```bash
lspci -F fixture.dump -n -vv
```

15개 fixture에서 Link/Selective 부재·각각·동시 구성, 최대 8개 Link block과 16개 Selective block의 예, insecure/reserved/secure 값을 검사했습니다. 아래는 Link·Selective 각 하나와 secure 값을 넣은 fixture의 실제 출력 일부입니다. Whitespace만 정리했습니다.

```text
LinkIDE#0 Sta: Status=secure RecvChkFail-
SelectiveIDE#0 Sta: secure RecvChkFail-
DOECap: IntSup-
DOECtl: IntEn-
DOESta: Busy- IntSta- Error- ObjectReady-
```

이 값은 fixture에 심은 상태를 decoder가 읽었다는 증거입니다. 키 설정·인증·실제 암호화 traffic의 증거가 아닙니다. Link 상태에는 `Status=`가 있고 이 판의 Selective 상태에는 없습니다. DOE register 출력에도 지원 SPDM protocol 목록은 포함되지 않습니다.

**이 판의 decoder 제한도 확인했습니다.** Link control의 Enable bit와 PCRC bit를 반대로 넣은 두 fixture에서 `cap_ide()`는 Link PCRC 표시를 Enable bit로 계산합니다. Selective PCRC는 별도 bit로 계산합니다. 따라서 3.13.0의 Link `PCRC+`만 믿지 말고 raw register·실제 bit 정의를 대조해야 합니다. Upstream source를 수정해 성공한 것처럼 제시하지 않았습니다.

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

IDE는 *링크만* 보호합니다. *디바이스 안의 메모리·캐시·레지스터*는 *별도 보호 메커니즘*이 필요합니다. DRAM·cache·debug에 대한 보호는 device 구현과 별도 기능에 따라 달라집니다. IDE를 켰다는 사실만으로 저장 데이터 보호를 추론하지 않습니다. 이 경계는 [Ch 13](/blog/embedded/embedded-security/chapter13-cxl-tee)의 *CXL TEE 영역*입니다.

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
