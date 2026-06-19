---
title: "SPDM과 CMA 인증 흐름 — 디바이스 신원과 펌웨어 측정 검증"
date: 2026-06-17T09:02:00
description: "SPDM(Security Protocol Data Model) 메시지 흐름, CMA(Component Measurement Attestation) — PCIe·CXL 디바이스 신원 확인과 firmware integrity 검증."
series: "Embedded Security"
seriesOrder: 12
tags: [spdm, cma, attestation, pcie-security, cxl-security, dice]
draft: false
---

## 한 줄 요약

> **"IDE가 *링크를 암호화*하기 *전에* 양쪽이 *서로 누구인지* 확인해야 합니다."** — SPDM은 *디바이스 인증·키 교환·세션 협상*을 담당하는 DMTF 표준입니다. *CMA*는 *디바이스 firmware의 hash 측정값*을 *서명된 형태로 호스트에 증명*합니다. 둘이 합쳐 *Confidential Computing의 신뢰 사슬 끝단*을 만듭니다.

[Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)에서 *IDE가 링크를 AES-GCM으로 암호화*하는 걸 봤습니다. 그런데 *키를 어떻게 안전하게 교환*하는지, *상대편이 진짜인지 어떻게 확인*하는지는 IDE 밖의 문제입니다. 그게 *SPDM·CMA의 역할*입니다.

## 왜 인증이 필요한가

IDE만으로는 부족한 이유:

1. *공격자가 디바이스 자체를 교체*했다면 — *교체된 디바이스와 IDE 키 교환·암호화*가 정상 진행됩니다. 데이터가 *암호화되어 새지는 않지만* *공격자에게 전달*됩니다.
2. *Firmware downgrade* — 디바이스에 *알려진 취약점이 있는 옛 firmware*가 설치되어 있어도, IDE는 그걸 막지 못합니다.
3. *Counterfeit 디바이스* — 정품처럼 가장한 디바이스가 *동작은 비슷*해도 *backdoor 포함*일 수 있습니다.

SPDM은 *이 모든 시나리오*를 *제거*합니다. 디바이스가 *정품임을 증명*하고, *firmware가 알려진 정상 hash와 일치*함을 증명한 뒤에야 *IDE를 활성화*합니다.

## SPDM이란

*SPDM (Security Protocol Data Model)*은 *DMTF DSP0274*가 정의한 *디바이스 인증 표준 프로토콜*입니다.

| 항목 | 값 |
|------|----|
| 정의 단체 | DMTF (Distributed Management Task Force) |
| 표준 번호 | DSP0274 |
| 첫 릴리스 | 1.0 (2019) |
| 현 릴리스 | 1.3 (2024+) |
| 전송 layer | PCIe DOE, MCTP, USB, I2C 등 |
| 적용 | PCIe·CXL·NVMe·USB 디바이스 인증 |

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

이 시퀀스가 끝나면 *호스트와 디바이스는 서로의 신원을 확인*했고, *공유 세션 키*를 갖습니다. 이 키가 *IDE 키 유도*의 입력입니다.

## DOE 채널 — SPDM 전송

PCIe·CXL에서 SPDM 메시지는 *DOE (Data Object Exchange)*로 전송됩니다.

```bash
# DOE capability 확인
$ lspci -vvv -s 5e:00.0 | grep -A 5 "Data Object Exchange"
Capabilities: [70] Data Object Exchange
    DOE Mailbox: 1 instance
    Supported Protocols:
        Vendor=DMTF, ID=0x01 (CMA SPDM)
        Vendor=DMTF, ID=0x02 (Secured CMA SPDM)
```

DOE는 *config space에 mailbox*를 두고, *호스트가 명령 write → 디바이스 응답 read* 하는 단순 인터페이스입니다.

## CMA — Component Measurement Attestation

*CMA (Component Measurement and Attestation)*는 *SPDM 위에서 정의된 attestation 프로토콜*입니다. PCIe-SIG ECN으로 추가됐습니다.

CMA가 제공하는 정보:

| Measurement Block | 내용 |
|-------------------|------|
| Index 0 | Manifest (어떤 component들이 등록되어 있나) |
| Index 1 | Immutable firmware (ROM·initial bootloader) |
| Index 2 | Mutable firmware (업데이트 가능 부분) |
| Index 3+ | Vendor-specific (configuration·state) |

호스트는 `GET_MEASUREMENTS`로 이 hash들을 요청하고, 디바이스는 *DICE-derived key로 서명*해 응답합니다.

## DICE — Device Identifier Composition Engine

*DICE*는 *공장에서 박힌 UDS (Unique Device Secret)*에서 *layer별 identity*를 *derive*하는 표준 (TCG).

| Layer | Identity | Source |
|-------|---------|--------|
| L0 | UDS (Unique Device Secret) | 공장 fuse |
| L1 | CDI (Compound Device Identifier) | KDF(UDS, hash(firmware_L1)) |
| L2 | Alias Key | KDF(CDI, hash(firmware_L2)) |

핵심 성질: *L1 firmware가 변하면 CDI가 변하고*, *변한 CDI는 다른 Alias Key를 derive*합니다. *공격자가 firmware를 바꾸면 신원도 바뀝니다*.

DICE는 *secure boot의 root of trust*와 *attestation의 신원*을 한 메커니즘으로 통합합니다.

## TPM 2.0 통합

호스트 측에는 *TPM 2.0*이 있어 *attestation 결과를 영구 기록*합니다. 통합 흐름:

1. Device가 SPDM 인증을 완료하고 MEASUREMENTS 응답을 host에 전송
2. Host가 그 hash를 *TPM의 적절한 PCR(Platform Configuration Register)*에 *extension*. PCR 값은 `PCR_new = SHA256(PCR_prev || new_hash)`로 누적되며, *어느 PCR을 쓸지*는 *플랫폼 정책 (PFP·CCA 등)*이 결정합니다
3. Remote Attestation Server가 *TPM Quote (AIK로 서명된 PCR 값 묶음)*를 요청
4. Server가 *예상 PCR 값*과 비교해 *전체 시스템 신뢰성*을 판단

PCR에 *디바이스 measurement가 누적 extension*되어 *재부팅 사이에 영구 기록*됩니다. SPDM 한 번이 *TPM의 한 layer*로 연결되는 구조입니다.

## 공격 시나리오와 SPDM의 방어

| 공격 | SPDM 방어 |
|------|----------|
| Counterfeit 디바이스 spoofing | X.509 인증서 chain 검증 → 정품만 통과 |
| Firmware downgrade | MEASUREMENT가 옛 firmware hash → 정상값과 다름 → 거부 |
| Replay attack | CHALLENGE의 nonce가 매번 다름 → 재사용 불가 |
| Man-in-the-middle | 서명 검증 → MITM은 서명 못 함 |
| TOCTOU | KEY_EXCHANGE까지 *연결된 세션* → 도중 교체 불가 |

SPDM 자체가 *MITM·spoofing·replay*를 막아 *IDE 키 교환*이 *진짜 정품 디바이스*와 이루어지게 보장합니다.

## 자주 하는 실수

### "SPDM만 활성화하면 보안 끝"

*디바이스 한 번 인증된 뒤 트래픽 자체*는 *별도 보호 메커니즘 (IDE)*이 필요합니다. SPDM은 *세션 시작 전 한 번*, IDE는 *세션 내내*. 둘이 *상호 보완*이지 *대체 관계가 아닙니다*.

### "인증서 chain을 짧게 만들면 빠르다"

*인증서 chain 검증은 부팅 시 한 번*입니다. *짧게 줄여서 얻는 시간이 1-2 ms*. 그런데 *chain이 짧으면 revocation 유연성·트러스트 모델 단순성을 잃습니다*. 일반적으로 *Root → Manufacturer → Device 3단*이 표준.

### "MEASUREMENT의 hash를 어떤 값과 비교할지 다 안다"

*Reference Integrity Manifest (RIM)*가 *디바이스 제조사로부터* 제공되어야 합니다. *RIM 없으면 MEASUREMENT는 의미 없는 hash*에 불과. *RIM provisioning이 attestation의 hidden 작업*.

### "DICE는 secure boot과 별개"

*같은 메커니즘*입니다. *DICE에서 layer별 hash가 식별성*이 되고, *secure boot의 measurement*가 *그대로 사용*됩니다. 분리 구현하면 *두 번 hash 계산*하는 낭비.

### "TPM 없어도 SPDM 동작"

*동작은 합니다*. 그러나 *measurement가 한 boot에서만 기억*되고 *재부팅 시 잃음*. *Remote attestation·long-term audit*에는 TPM 필수.

## 정리

- *SPDM*은 DMTF DSP0274 표준으로 *디바이스 인증·키 교환·세션 협상*을 담당합니다.
- PCIe·CXL에서는 *DOE (Data Object Exchange)* 채널로 SPDM 메시지가 흐릅니다.
- *CMA*는 SPDM 위 *PCIe-SIG attestation 프로토콜*로 *firmware measurement hash*를 *서명된 형태로* 호스트에 증명합니다.
- *DICE*는 *공장 UDS에서 layer별 identity를 derive*해 *firmware 변경 시 신원도 변경*되게 합니다.
- *TPM 2.0*과 통합되어 *재부팅·long-term audit*까지 *신뢰 사슬 확장*.
- *SPDM + IDE 조합*이 *Confidential Computing의 신원 검증 + 트래픽 보호* 두 축을 완성합니다.

다음 편은 **Ch 13: CXL TEE 확장** — *SPDM 위에서 디바이스가 인증*되면 *그 디바이스를 TVM (Trusted Virtual Machine)에 안전하게 attach*하는 *TDISP 표준*과 *AMD SEV-TIO·Intel TDX Connect·ARM CCA의 CXL 통합*까지 분해합니다.

## 관련 항목

- [Ch 11: PCIe·CXL IDE 분석 — 링크 무결성과 데이터 암호화](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee) (다음 편)
- [Ch 2: Secure Boot 분석](/blog/embedded/embedded-security/chapter02-secure-boot) — DICE와 같은 chain of trust
- [Ch 5: TEE 비교 분석 — OP-TEE·ARM CCA·SGX](/blog/embedded/embedded-security/chapter05-tee)
- [원문 — DMTF DSP0274 (SPDM)](https://www.dmtf.org/standards/spdm)
