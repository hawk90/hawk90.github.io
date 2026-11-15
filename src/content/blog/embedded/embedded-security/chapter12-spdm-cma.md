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

> **"IDE가 *링크를 암호화*하기 *전에* 양쪽이 *서로 누구인지* 확인해야 합니다."** — SPDM은 *디바이스 인증·키 교환·세션 협상*을 담당하는 DMTF 표준입니다. *CMA*는 PCIe·CXL 디바이스가 *SPDM으로 인증받고 측정값을 내놓는* 방식입니다. 프로토콜이 제공하는 증거와 호스트의 신뢰·수락 정책을 함께 확인해야 합니다.

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
| 이 장의 대조 판 | [DSP0274 1.2.3, 2024-08-21](https://www.dmtf.org/sites/default/files/standards/documents/DSP0274_1.2.3.pdf) |
| 범위 | 선택한 절·메시지 표 대조, 최신 판이라는 뜻 아님 |
| 전송 layer | PCIe DOE, MCTP(DSP0275) 등 |
| 적용 | PCIe·CXL 디바이스 인증 (CMA-SPDM) |

SPDM 자체는 *전송 무관*입니다. *어느 채널*로 보낼지는 별도 결정. PCIe·CXL은 보통 *DOE (Data Object Exchange)* 채널을 통합니다.

## SPDM 메시지 시퀀스

다음은 인증서 기반 경로의 개념적 예입니다. 모든 구현이 18단계를 반드시 같은 순서로 수행하는 고정 handshake가 아닙니다. 협상 capability·인증 정책·PSK 경로·session 내 measurement 여부에 따라 달라집니다.

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
| 10 | CERTIFICATE | Device → Host | 요청 offset·길이에 맞춘 인증서 chain 조각 |
| 11 | CHALLENGE | Host → Device | nonce + measurement summary 요청 |
| 12 | CHALLENGE_AUTH | Device → Host | 서명된 응답 (proof of possession) |
| 13 | GET_MEASUREMENTS | Host → Device | firmware hash 요청 |
| 14 | MEASUREMENTS | Device → Host | 요청·capability에 따른 measurement와 선택적 서명 |
| 15 | KEY_EXCHANGE | Host → Device | session 키 교환 시작 |
| 16 | KEY_EXCHANGE_RSP | Device → Host | 교환 응답 |
| 17 | FINISH | Host → Device | 인증 완료 |
| 18 | FINISH_RSP | Device → Host | 세션 활성화 |

정상 응답을 받았다는 것만으로 수락하지 않습니다. 버전·algorithm downgrade 정책, chain 신뢰·용도·유효기간, transcript 서명·freshness, FINISH 검증 등 해당 경로의 조건을 확인해야 합니다. ERROR·Busy·ResponseNotReady·timeout·unsupported capability를 처리하고 제한 없이 재시도하거나 인증 없이 계속 진행하지 않습니다. 성공적으로 수립한 secure session에서는 필요한 key update·종료·재측정 정책을 적용합니다. CXL에서는 이 session이 IDE 키를 설정하는 *CXL_IDE_KM* 메시지를 보호합니다(CXL 3.1 §11.4). session 키가 곧 IDE 키는 아닙니다.

## DOE 채널 — SPDM 전송

DOE capability는 mailbox의 존재를 보여 주며 SPDM 인증 성공을 뜻하지 않습니다. [Linux ABI 문서](https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci)의 `doe_features` 예는 discovery 0001:00, CMA-SPDM 0001:01, secured CMA-SPDM 0001:02를 구분합니다. 해당 kernel/config·device가 지원해야 합니다. Linux6.12의 public DOE API만 보고 이 sysfs directory가 있다고 추정하지 않습니다.

```bash
lspci -n -vv -s 0000:5e:00.0
ls /sys/bus/pci/devices/0000:5e:00.0/doe_features/
```

명령과 BDF는 조사 예이며 실제 장치 출력은 아닙니다. 이 작업의 pciutils3.13.0 synthetic dump 실험은 DOECap·DOECtl·DOESta를 decode했지만 SPDM feature discovery나 mailbox 요청은 하지 않았습니다. `lspci`의 register 출력과 kernel이 수행한 DOE discovery를 구분합니다. Protocol의 vendor/type 식별자에서 PCI-SIG가 나온다고 SPDM 자체의 정의 주체가 DMTF에서 바뀌는 것은 아닙니다.

## CMA — Component Measurement and Authentication

*CMA (Component Measurement and Authentication)*는 PCIe·CXL 디바이스가 DOE 위에서 SPDM으로 *인증*과 *측정값 보고*를 하는 방식입니다. CXL 3.1 spec은 compliance 항목 §14.11.1을 이 이름으로 두고, Linux는 `CMA-SPDM`이라 부릅니다.

측정값은 SPDM `GET_MEASUREMENTS`로 받습니다(DSP0274).

| Param2 | 의미 |
|--------|------|
| 0x00 | 디바이스가 가진 measurement block 개수 조회 |
| 0x01~0xFE | 그 index의 measurement block 요청 |
| 0xFF | 모든 measurement block 요청 |

index에 무엇을 둘지는 디바이스가 정하고, DMTF measurement format인 block은 `DMTFSpecMeasurementValueType`의 하위7bit로 종류를, bit7로 digest(0)/raw(1)를 밝힙니다. 모든 index가 firmware hash이거나 모든 값이 digest인 것은 아닙니다. DSP0274 1.2.3 Table38~43을 대조합니다.

| 값 | 종류 |
|----|------|
| 0x0 | Immutable ROM |
| 0x1 | Mutable firmware |
| 0x2 | Hardware configuration (strap 등) |
| 0x3 | Firmware configuration |
| 0x4 | Measurement manifest |
| 0x5 | Debug·device mode의 구조화된 표현, raw 필수 |
| 0x6 | Mutable firmware version |
| 0x7 | Mutable firmware security version |

서명 가능한 capability를 협상하고 Param1 bit0을 켜면 요청에 nonce·slot 정보가 붙고 measurement log의 서명을 요청합니다. 서명 대상 transcript와 nonce를 검증해야 하며, raw firmware hash 하나의 서명을 확인하는 것과 같지 않습니다. 서명을 요청하지 않은 응답도 가능하므로 서명·session 보호·freshness 정책을 명시합니다.

## DICE — Device Identifier Composition Engine

[Open Profile for DICE v2.6](https://pigweed.googlesource.com/open-dice/+/refs/heads/main/docs/specification.md)은 TCG DICE를 기반으로 UDS·CDI·layering을 구체화합니다. Mutable software가 UDS를 직접 읽지 못하도록 하는 구현 경계가 전제입니다. 이 profile의 Attestation CDI와 Sealing CDI를 같은 간단한 식으로 쓰지 않습니다.

| 종류 | profile 입력의 차이 | 관찰할 점 |
|------|------|------|
| CDI_Attest | code·config·authority·mode·hidden | 코드·설정 변경을 attestation identity에 반영 |
| CDI_Seal | authority·mode·hidden의 stable 입력 | 코드가 바뀌면 모든 sealing identity도 반드시 바뀐다고 단정하지 않음 |

DICE에서 파생한 identity가 SPDM credential로 쓰이는지는 제품 provisioning·certificate chain·verifier 정책의 연결 문제입니다. DICE 구현이나 인증서를 실제 장치에서 검사한 결과는 아닙니다.

## 공격 시나리오와 SPDM의 방어

| 상황 | 확인할 증거 | 수락하지 않아야 할 조건 |
|------|------|------|
| Device 교체 | 신뢰 anchor·identity·제품 정책 | 서명은 맞아도 허용하지 않은 issuer/장치 |
| Firmware 변경 | 인증된 measurement와 version별 reference | 서명은 맞아도 금지된 구버전·설정 |
| 응답 재사용 | nonce·transcript·session 상태 | 현재 요청과 결합되지 않은 과거 응답 |
| Key·algorithm 교체 | 협상·용도·수명주기 정책 | 지원하지 않거나 금지된 경로로 fallback |

SPDM만으로 정품·정상 firmware를 자동 판별하지 않습니다. Reference는 인증된 별도 경로로 확보하고 제품·revision·config·측정 index·정책 version을 연결합니다.

## 작은 host 실험 — 서명 유효성과 정책 수락을 분리

다음은 **SPDM wire format이 아닌 자체 고정 형식의 교육용 envelope**입니다. 이미 신뢰한 P-256 public key 하나와 SHA-256 digest·32-byte nonce를 받아, Node의 DER ECDSA 서명과 고정 reference 정책을 검사합니다. 실제 SPDM의 signature encoding·협상·transcript·certificate 검증을 구현한 코드가 아닙니다.

```js title="measurement-policy-demo.mjs"
import {verify, timingSafeEqual} from 'node:crypto';

export function acceptDemo(trustedKey, expectedNonce, allowedDigest,
                           nonce, digest, signature) {
  if (![expectedNonce, allowedDigest, nonce, digest]
        .every(b => Buffer.isBuffer(b) && b.length === 32) ||
      !Buffer.isBuffer(signature) || signature.length < 8 ||
      signature.length > 72)
    return false;
  if (!timingSafeEqual(nonce, expectedNonce))
    return false;
  const message = Buffer.concat([
    Buffer.from('MEASUREMENT-DEMO-v1\0'), nonce, digest
  ]);
  return verify('sha256', message, trustedKey, signature) &&
         timingSafeEqual(digest, allowedDigest);
}
```

Trusted key는 caller가 별도 신뢰 경로로 정한 P-256 KeyObject라는 전제입니다. 합성 firmware bytes·일회용 key로 정상 수락, 다른 key·nonce·digest·signature·잘린 입력 거부를 실행했습니다. 특히 **금지한 구버전 digest는 올바르게 서명했어도 정책에서 거부**됐습니다. 이는 서명 확인만으로 정상 version을 정할 수 없다는 실험이며, 실제 SPDM device attestation 성공은 아닙니다.

## 자주 하는 실수

### "SPDM만 활성화하면 보안 끝"

*디바이스 한 번 인증된 뒤 트래픽 자체*는 *별도 보호 메커니즘 (IDE)*이 필요합니다. SPDM은 초기 인증만으로 끝나는 개념이 아니며 secure session·key update·measurement·종료 등 기능을 포함합니다. IDE traffic 보호와 역할을 구분합니다.

### "MEASUREMENT의 hash를 어떤 값과 비교할지 SPDM이 정해 준다"

*아닙니다*. SPDM은 측정값을 서명해 전달할 뿐이고, 어느 값을 받아들일지는 정책의 몫이며 spec 범위 밖입니다(DSP0274). 기준값은 따로 확보해야 합니다.

## 정리

- *SPDM*은 DMTF DSP0274 표준으로 *디바이스 인증·측정·secure session*을 담당합니다.
- PCIe·CXL에서는 *DOE (Data Object Exchange)* 채널로 SPDM 메시지가 흐릅니다. DOE feature 0001:01이 CMA-SPDM입니다.
- *CMA*(Component Measurement and Authentication)는 DOE 위의 SPDM 인증·측정 방식입니다.
- DICE profile의 attestation·sealing 입력과 SPDM credential provisioning을 구분합니다.
- 서명·freshness·reference 정책·session·실제 IDE traffic에는 각각 다른 증거가 필요합니다.

다음 편은 **Ch 13: CXL TEE 확장** — *SPDM 위에서 디바이스가 인증*되면 *그 디바이스를 TVM (Trusted Virtual Machine)에 안전하게 attach*하는 PCI-SIG *TDISP*, CXL *TSP*, Linux PCI TSM 프레임워크를 분해합니다.

## 관련 항목

- [Ch 11: PCIe·CXL IDE 분석 — 링크 무결성과 데이터 암호화](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee) (다음 편)
- [Ch 2: Secure Boot 분석](/blog/embedded/embedded-security/chapter02-secure-boot) — DICE와 같은 chain of trust
- [Ch 5: OP-TEE — 호출과 저장소 경계](/blog/embedded/embedded-security/chapter05-tee)
- [원문 — DMTF DSP0274 (SPDM)](https://www.dmtf.org/standards/spdm)
