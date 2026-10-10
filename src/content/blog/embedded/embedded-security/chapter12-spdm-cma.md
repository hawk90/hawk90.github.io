---
title: "SPDM과 CMA 인증 흐름 — 디바이스 신원과 펌웨어 측정 검증"
slug: "embedded/embedded-security/chapter12-spdm-cma"
date: 2026-06-17T09:02:00
description: "SPDM(Security Protocol and Data Model) 메시지 흐름, CMA(Component Measurement and Authentication) — PCIe·CXL 디바이스 신원 확인과 firmware integrity 검증."
series: "Embedded Security"
seriesOrder: 12
tags: [spdm, cma, attestation, pcie-security, cxl-security, dice]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"IDE가 *링크를 암호화*하기 *전에* 양쪽이 *서로 누구인지* 확인해야 합니다."** — SPDM은 *디바이스 인증·키 교환·세션 협상*을 담당하는 DMTF 표준입니다. *CMA*는 PCIe·CXL 디바이스가 *SPDM으로 인증받고 측정값을 내놓는* 방식입니다. 둘이 합쳐 *Confidential Computing의 신뢰 사슬 끝단*을 만듭니다.

[Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)에서 *IDE가 링크를 AES-GCM으로 암호화*하는 걸 봤습니다. 그런데 *키를 어떻게 안전하게 교환*하는지, *상대편이 진짜인지 어떻게 확인*하는지는 IDE 밖의 문제입니다. 그게 *SPDM·CMA의 역할*입니다.

## 왜 인증이 필요한가

IDE만으로는 부족한 이유:

1. *공격자가 디바이스 자체를 교체*했다면 — *교체된 디바이스와 IDE 키 교환·암호화*가 정상 진행됩니다. 데이터가 *암호화되어 새지는 않지만* *공격자에게 전달*됩니다.
2. *Firmware downgrade* — 디바이스에 *알려진 취약점이 있는 옛 firmware*가 설치되어 있어도, IDE는 그걸 막지 못합니다.
3. *Counterfeit 디바이스* — 정품처럼 가장한 디바이스가 *동작은 비슷*해도 *backdoor 포함*일 수 있습니다.

SPDM은 이 시나리오를 판단할 *재료*를 줍니다. 디바이스의 *인증서 chain*과 *서명된 firmware 측정값*입니다. 그 값으로 어떤 디바이스를 받아들일지는 호스트 정책이 정하고, SPDM spec은 정책을 정하지 않습니다(DSP0274 Scope).

## SPDM이란

*SPDM (Security Protocol and Data Model)*은 *DMTF DSP0274*가 정의한 *디바이스 인증 표준 프로토콜*입니다.

| 항목 | 값 |
|------|----|
| 정의 단체 | DMTF (Distributed Management Task Force) |
| 표준 번호 | DSP0274 |
| 첫 릴리스 | 1.0.0 (2019-10-16) |
| 현 릴리스 | 1.4.1 (2026-06-26) |
| 전송 layer | PCIe DOE, MCTP(DSP0275) 등 |
| 적용 | PCIe·CXL 디바이스 인증 (CMA-SPDM) |

SPDM 자체는 *전송 무관*입니다. *어느 채널*로 보낼지는 별도 결정. PCIe·CXL은 보통 *DOE (Data Object Exchange)* 채널을 통합니다.

## SPDM 메시지 시퀀스

표준 *디바이스 인증·키 교환 흐름*:

| 순서 | 메시지 | 방향 | 내용 |
|------|--------|------|------|
| 1 | GET_VERSION | Host → Device | "어떤 SPDM 버전 지원?" |
| 2 | VERSION | Device → Host | 지원 버전 리스트 |
| 3 | GET_CAPABILITIES | Host → Device | 능력 요청 |
| 4 | CAPABILITIES | Device → Host | encrypt·KEX·measurement 등 능력 |
| 5 | NEGOTIATE_ALGORITHMS | Host → Device | 알고리즘 협상 (SHA·AES·ECC) |
| 6 | ALGORITHMS | Device → Host | 합의된 알고리즘 |
| 7 | GET_DIGESTS | Host → Device | 인증서 chain hash 요청 |
| 8 | DIGESTS | Device → Host | hash 리스트 |
| 9 | GET_CERTIFICATE | Host → Device | 특정 chain 요청 |
| 10 | CERTIFICATE | Device → Host | X.509 인증서 chain 전송 |
| 11 | CHALLENGE | Host → Device | nonce + measurement summary 요청 |
| 12 | CHALLENGE_AUTH | Device → Host | 서명된 응답 (proof of possession) |
| 13 | GET_MEASUREMENTS | Host → Device | firmware hash 요청 |
| 14 | MEASUREMENTS | Device → Host | 서명된 measurement block |
| 15 | KEY_EXCHANGE | Host → Device | session 키 교환 시작 |
| 16 | KEY_EXCHANGE_RSP | Device → Host | 교환 응답 |
| 17 | FINISH | Host → Device | 인증 완료 |
| 18 | FINISH_RSP | Device → Host | 세션 활성화 |

이 시퀀스가 끝나면 호스트는 디바이스의 신원을 확인했고, 둘은 *secure session*을 갖습니다. CXL에서는 이 session이 IDE 키를 설정하는 *CXL_IDE_KM* 메시지를 보호합니다(CXL 3.1 §11.4). session 키가 곧 IDE 키는 아닙니다.

## DOE 채널 — SPDM 전송

PCIe·CXL에서 SPDM 메시지는 *DOE (Data Object Exchange)*로 전송됩니다.

```bash
# DOE capability 레지스터 (pciutils는 DOECap·DOECtl·DOESta만 출력)
$ lspci -vvv -s 5e:00.0 | grep -A 4 "Data Object Exchange"

# 디바이스가 지원하는 DOE feature (Vendor ID:type)
$ ls /sys/bus/pci/devices/0000:5e:00.0/doe_features/
0001:01  0001:02  doe_discovery
```

DOE feature는 `Vendor ID:data object type`으로 식별합니다. Vendor 0001h(PCI-SIG) 아래 type 0이 Discovery, 1이 CMA-SPDM, 2가 Secured CMA-SPDM입니다(Linux `include/linux/pci-doe.h`, `Documentation/ABI/testing/sysfs-bus-pci`). `lspci`는 이 목록을 출력하지 않습니다.

DOE는 *config space에 mailbox*를 두고, *호스트가 명령 write → 디바이스 응답 read* 하는 단순 인터페이스입니다.

## CMA — Component Measurement and Authentication

*CMA (Component Measurement and Authentication)*는 PCIe·CXL 디바이스가 DOE 위에서 SPDM으로 *인증*과 *측정값 보고*를 하는 방식입니다. CXL 3.1 spec은 compliance 항목 §14.11.1을 이 이름으로 두고, Linux는 `CMA-SPDM`이라 부릅니다.

측정값은 SPDM `GET_MEASUREMENTS`로 받습니다(DSP0274).

| Param2 | 의미 |
|--------|------|
| 0x00 | 디바이스가 가진 measurement block 개수 조회 |
| 0x01~0xFE | 그 index의 measurement block 요청 |
| 0xFF | 모든 measurement block 요청 |

index에 무엇을 둘지는 디바이스가 정하고, 각 block은 `DMTFSpecMeasurementValueType`으로 종류를 밝힙니다.

| 값 | 종류 |
|----|------|
| 0x0 | Immutable ROM |
| 0x1 | Mutable firmware |
| 0x2 | Hardware configuration (strap 등) |
| 0x3 | Firmware configuration |
| 0x4 | Freeform measurement manifest |

Param1 bit 0을 켜서 요청하면 요청에 nonce가 붙고, 디바이스는 응답에 서명합니다.

## DICE — Device Identifier Composition Engine

*DICE*는 TCG가 정의한 방식으로, *하드웨어 수준의 디바이스 고유 비밀(UDS)*과 *다음 단계 software의 측정값*을 섞어 *CDI(Compound Device Identifier)*를 만듭니다. 아래 식은 Open Profile for DICE(Google open-dice)의 구성입니다.

| 단계 | 값 | 계산 |
|-------|---------|--------|
| 하드웨어 | UDS (Unique Device Secret) | 디바이스 고유 비밀. DICE가 쓴 뒤로는 접근 차단 |
| 첫 software layer | CDI | KDF(UDS, H(code + config + …)) |
| 다음 layer | CDI[n+1] | KDF(CDI[n], H(다음 layer의 code + config + …)) |

핵심 성질: *측정된 software가 변하면 CDI가 변합니다*. mutable software는 UDS에 접근하지 못하고 자기 단계의 CDI만 받습니다.

## 공격 시나리오와 SPDM의 방어

| 공격 | SPDM 방어 |
|------|----------|
| Counterfeit 디바이스 spoofing | X.509 인증서 chain 검증 → 정품만 통과 |
| Firmware downgrade | MEASUREMENT가 옛 firmware hash → 정상값과 다름 → 거부 |
| Replay attack | CHALLENGE의 nonce가 매번 다름 → 재사용 불가 |
| Man-in-the-middle | 서명 검증 → MITM은 서명 못 함 |

SPDM 자체가 *MITM·spoofing·replay*를 막아 *IDE 키 교환*이 *진짜 정품 디바이스*와 이루어지게 보장합니다.

## 자주 하는 실수

### "SPDM만 활성화하면 보안 끝"

*디바이스 한 번 인증된 뒤 트래픽 자체*는 *별도 보호 메커니즘 (IDE)*이 필요합니다. SPDM은 *세션 시작 전 한 번*, IDE는 *세션 내내*. 둘이 *상호 보완*이지 *대체 관계가 아닙니다*.

### "MEASUREMENT의 hash를 어떤 값과 비교할지 SPDM이 정해 준다"

*아닙니다*. SPDM은 측정값을 서명해 전달할 뿐이고, 어느 값을 받아들일지는 정책의 몫이며 spec 범위 밖입니다(DSP0274). 기준값은 따로 확보해야 합니다.

## 정리

- *SPDM*은 DMTF DSP0274 표준으로 *디바이스 인증·측정·secure session*을 담당합니다.
- PCIe·CXL에서는 *DOE (Data Object Exchange)* 채널로 SPDM 메시지가 흐릅니다. DOE feature 0001:01이 CMA-SPDM입니다.
- *CMA*(Component Measurement and Authentication)는 DOE 위의 SPDM 인증·측정 방식입니다.
- *DICE*는 *UDS와 측정값으로 CDI를 derive*해 *software 변경 시 신원도 변경*되게 합니다.
- *SPDM + IDE 조합*이 *Confidential Computing의 신원 검증 + 트래픽 보호* 두 축을 완성합니다.

다음 편은 **Ch 13: CXL TEE 확장** — *SPDM 위에서 디바이스가 인증*되면 *그 디바이스를 TVM (Trusted Virtual Machine)에 안전하게 attach*하는 PCI-SIG *TDISP*, CXL *TSP*, Linux PCI TSM 프레임워크를 분해합니다.

## 관련 항목

- [Ch 11: PCIe·CXL IDE 분석 — 링크 무결성과 데이터 암호화](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee) (다음 편)
- [Ch 2: Secure Boot 분석](/blog/embedded/embedded-security/chapter02-secure-boot) — DICE와 같은 chain of trust
- [Ch 5: TEE 비교 분석 — OP-TEE·ARM CCA·SGX](/blog/embedded/embedded-security/chapter05-tee)
- [원문 — DMTF DSP0274 (SPDM)](https://www.dmtf.org/standards/spdm)
