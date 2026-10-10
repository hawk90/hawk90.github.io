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

> **"IDE는 *PCIe 링크 자체*를 *암호화된 통로*로 만듭니다."** — TrustZone이 *CPU 안*을 보호하고 TEE가 *Secure World 안*을 보호한다면, IDE는 *디바이스 사이의 케이블*을 보호합니다. AES-GCM 256-bit으로 *TLP·CXL.mem flit*을 암호화·인증해 *물리 접근 공격자*가 *링크를 sniffing·tampering*해도 *데이터가 새지 않게* 합니다.

## 왜 링크 암호화가 필요한가

[Ch 4 (TrustZone)](/blog/embedded/embedded-security/chapter04-trustzone)에서 *CPU 안 Secure World*를 격리했고, [Ch 5 (TEE)](/blog/embedded/embedded-security/chapter05-tee)에서 *TA가 안전한 환경에서 동작*하는 걸 봤습니다. 그러나 *CPU 밖으로 나가는 순간*은 다른 문제입니다.

PCIe 카드 한 장을 *분리해서 별도 보드에 장착하면* TLP를 *그대로 볼 수 있습니다*. 데이터센터에서 *물리 접근 가능한 운영자*가 *interposer·protocol analyzer*를 끼우면 *링크를 흐르는 모든 트래픽*을 *읽을 수 있고*, *심지어 수정도* 가능합니다.

이 위협이 *클라우드 신뢰 모델의 마지막 약점*입니다. *Confidential Computing*에서 *CPU에서 GPU로 가속기 작업을 넘길 때*, 또는 *CXL.mem expander에 KV cache가 저장될 때*, *그 경로 자체*가 *암호화되지 않으면* 모든 *CPU/TEE 안의 보안*은 *디바이스 밖에서 무력화*됩니다.

PCIe·CXL IDE(Integrity and Data Encryption)는 이 *링크 구간*을 *암호화 통로*로 만드는 표준입니다.

## 위협 모델

IDE가 푸는 *세 가지 공격*:

| 공격 | 방법 | IDE 방어 |
|------|------|---------|
| Passive eavesdropping | Protocol analyzer로 TLP·flit 읽기 | AES-GCM 암호화로 *내용 은닉* |
| Active tampering | TLP·flit 수정·재전송 | GMAC 96-bit으로 *무결성 검증* |
| Replay attack | 과거 패킷 다시 보냄 | 매번 증가하는 IV counter로 *재사용 차단* |

IDE는 *MITM 자체를 막지는 않습니다*. 공격자가 *링크 중간에 끼는* 것은 가능하지만, *암호화·인증된 데이터를 의미 있게 조작*하지는 못합니다.

링크 끝점 자체(host CPU, 디바이스 controller)의 *키 보호*는 *IDE의 책임 밖*입니다. 그건 *TEE·HSM*의 영역입니다.

## IDE의 두 모드 — Selective vs Link

PCIe Base Spec IDE(커널 `drivers/pci/ide.c`는 r7.0 §6.33으로 인용)는 *두 종류의 stream*을 정의합니다.

| Stream | 보호 범위 | 비고 |
|------|----------|---------|
| **Link IDE** | 인접한 두 포트 사이 링크의 TLP | traffic class(TC)별 stream |
| **Selective IDE** | RID·주소 범위에 연결된 TLP | switch를 flow-through로 지나 endpoint까지 갈 수 있음 |

CXL에서는 두 종류를 나눠 씁니다(CXL 3.1 §11.2, Table 11-1). *CXL.io*는 PCIe IDE를 따라 Link·Selective IDE stream을 모두 지원하고, Selective IDE stream은 CXL.io에만 적용됩니다. *CXL.cachemem IDE*는 Link IDE stream에 묶인 키만 쓰고, CXL switch는 Link IDE stream을 지원해야 합니다.

## 암호화 알고리즘 — AES-GCM 256

CXL.cachemem IDE는 NIST SP 800-38D의 *AES-GCM*을 256-bit 키로 써서 기밀성·무결성·재전송 방지를 한 번에 얻습니다(CXL 3.1 §11.3).

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

키 갱신(key refresh)은 *데이터 손실 없이* 지원해야 합니다. spec이 드는 예는 가속기를 다른 VM으로 옮길 때와, 오래 도는 디바이스의 *key wear-out* 우려입니다. spec은 key refresh가 *자주 일어나지 않는다*고 보고 그때의 지연·대역폭 손해를 허용합니다(§11.3). IV의 invocation counter는 flit마다 증가하는 64-bit 값이고, 송수신 양쪽 모두 rollover를 검출할 의무가 없습니다(§11.3.4).

## 성능 영향

CXL.cachemem IDE는 무결성 값(MAC)을 얼마나 자주 보내느냐로 두 모드를 둡니다(CXL 3.1 §11.3.5).

| 모드 | 동작 |
|------|------|
| Containment | 무결성 검사를 통과한 뒤에만 데이터를 넘김. 여러 flit을 버퍼링해야 해서 지연·대역폭 모두 손해 |
| Skid | 검사 전에 데이터를 넘김. 지연 손해는 거의 없고 대역폭 손해도 작음. 변조된 데이터가 잠깐 소비될 수 있고 나중에 검사에서 잡힘 |

PCRC(암호 엔진 내부 오류 대비 CRC)는 CXL.cachemem IDE에서 필수이고 기본으로 켜지며, MAC 검사에 합쳐져 추가 링크 대역폭을 쓰지 않습니다(§11.3).

구체적인 throughput·지연 비용은 구현마다 다르고, 이 글의 자료에는 실측이 없습니다(TBD).

## 운영 — 활성화 확인

Linux 환경에서 IDE 상태 확인:

```bash
# PCIe IDE capability (레지스터 내용은 -vv 이상에서 출력)
$ lspci -vvv -s 5e:00.0 | grep -A 12 "Integrity & Data Encryption"
```

pciutils는 IDE extended capability를 `Integrity & Data Encryption` 제목 아래 `IDECap`(Link IDE TC 수, Selective IDE stream 수, Aggregation·PCRC·IDE_KM 지원 여부, 알고리즘)과 `IDECtl` 줄로 보여 주고, stream마다 `LinkIDE#n`·`SelectiveIDE#n`의 Ctl·Sta 줄을 출력합니다. Sta의 `Status=secure`가 stream이 보안 상태라는 뜻입니다(`ls-ecaps.c`).

## 자주 하는 실수

### "IDE만 켜면 데이터센터가 안전하다"

IDE는 *링크만* 보호합니다. *디바이스 안의 메모리·캐시·레지스터*는 *별도 보호 메커니즘*이 필요합니다. CXL 메모리 디바이스에 저장된 *plain DRAM 내용*은 *physical attack에 그대로 노출*됩니다 — 그건 [Ch 13](/blog/embedded/embedded-security/chapter13-cxl-tee)의 *CXL TEE 영역*입니다.

### "한 번 키 교환하면 끝"

*아닙니다*. key refresh는 데이터 손실 없이 지원해야 하는 기능이고, VM 이동이나 key wear-out 같은 상황에서 씁니다(CXL 3.1 §11.3).

### "Skid 모드면 보호가 없다"

무결성 검사는 그대로 하고, 데이터를 *검사 전에* 넘길 뿐입니다. 변조는 나중에 검출되지만 그 사이 소비된 데이터를 소프트웨어 스택이 감당해야 합니다(§11.3.5).

## 정리

- IDE는 *PCIe·CXL 링크 자체*를 *AES-GCM 256으로 암호화·인증*하는 표준입니다.
- PCIe IDE는 *Link IDE*(인접 포트 사이)와 *Selective IDE*(RID·주소 범위) stream을 둡니다. CXL.cachemem IDE는 Link IDE stream의 키만 씁니다.
- 위협은 *eavesdropping·tampering·replay* 세 가지. *MITM 자체는 못 막지만 의미 있는 조작은 차단*합니다.
- CXL.cachemem IDE 키는 *SPDM session으로 보호된 CXL_IDE_KM* 메시지로 설정됩니다. key refresh는 데이터 손실 없이 지원해야 합니다.
- *Containment*와 *Skid* 모드가 무결성 검사와 데이터 전달 시점의 trade-off를 정합니다.

다음 편은 **Ch 12: SPDM과 CMA 인증 흐름** — *IDE 키 교환을 떠받치는 SPDM 프로토콜*과 *CMA(Component Measurement and Authentication)*의 *디바이스 신원 검증·firmware 측정*을 분해합니다.

## 관련 항목

- [Ch 4: ARM TrustZone 분석](/blog/embedded/embedded-security/chapter04-trustzone) — CPU 안 격리
- [Ch 5: TEE 비교 분석](/blog/embedded/embedded-security/chapter05-tee) — Secure World 안의 격리
- [Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma) (다음 편)
- [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee) — Trusted Execution을 메모리 디바이스까지
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
