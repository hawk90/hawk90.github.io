---
title: "Ch 8: IoT 표준 — ETSI EN 303 645 / IEC 62443 / NIST 8259 / EU CRA"
date: 2026-05-08T09:00:00
description: "IoT 소비자·산업·자동차 보안 표준. 한국 KISA·KICS 포함."
tags: [IoT, ETSI, IEC 62443, NIST, CRA, Standards]
series: "Embedded Security"
seriesOrder: 8
draft: false
---

## 한 줄 요약

> **"IoT 보안 표준은 *체크리스트*가 아니라 *법적 요구*가 되고 있습니다."** — 2025년 8월 EU Cyber Resilience Act 시행 이후 CE 마킹을 받으려면 표준 준수가 강제됩니다. 미국·영국도 비슷한 흐름입니다.

2010년대 IoT의 *기본값이 root/admin*이었던 시절이 끝나고 있습니다. Mirai botnet(2016) 이후 각국 규제 기관이 *최소한의 기준*을 법제화하기 시작했고, 2024~2026년 사이에 영국·EU·미국·일본·한국이 모두 단계적으로 시행에 들어갑니다.

이 장은 IoT 제품을 출시하려는 엔지니어가 *어떤 표준을 무엇 때문에 봐야 하는지* 정리합니다. ETSI EN 303 645는 소비자 IoT의 최소선, IEC 62443은 산업 자동화, NIST IR 8259/8425는 미국 정부 조달 기준, UNECE WP.29는 자동차, EU CRA는 *광범위한 디지털 제품 전체*에 적용됩니다.

## 표준의 지형도

| 표준 | 영역 | 시행 |
|------|------|------|
| **ETSI EN 303 645** | 소비자 IoT | EU 사실상 표준, UK PSTI 법제화 |
| **IEC 62443** | 산업 자동화 / OT | 글로벌, 발전소·공장 의무 다수 |
| **NIST IR 8259 / IR 8425** | 미국 IoT 핵심 baseline | 연방 조달 필수 |
| **NIST SP 800-213 / 213A** | 정부용 IoT 디바이스 | 연방 시스템 |
| **UNECE WP.29 R155/R156** | 자동차 사이버보안·OTA | EU·일·한 강제, 2024부터 |
| **ISO/SAE 21434** | 자동차 V&V | OEM·Tier1 사실상 의무 |
| **EU CRA** | 광범위 디지털 제품 | 2027 11월 완전 시행 |
| **US Cyber Trust Mark** | 자발적 라벨링 | 2024 시작 |
| **KISA IoT 보안 인증** | 한국 | KCSP-IoT, 의무 아님 |
| **K-ISMS / KICS** | 한국 시스템 보안 | 산업별 일부 의무 |

각 표준이 *다른 자리*를 보고 있어 중복도 있지만, 핵심 보안 항목은 80% 이상 겹칩니다. ETSI EN 303 645가 가장 *명확하고 짧아서*, 처음 보는 표준으로 권장됩니다.

## ETSI EN 303 645 — 소비자 IoT 13개 provision

EU의 *공식 IoT 사이버보안 표준*입니다. 영국이 이를 그대로 받아 *PSTI Act 2022*로 법제화했고, 2024년 4월부터 영국에서 IoT 제품을 팔려면 자기적합선언이 필요합니다. EU CRA도 이 표준을 기반으로 합니다.

13개 provision의 요지입니다.

| # | Provision | 핵심 |
|---|-----------|------|
| 5.1 | No universal default passwords | 공장 출하 시 기기별 고유 패스워드 또는 사용자 설정 강제 |
| 5.2 | Vulnerability disclosure | 보안 연락처 공개 + 처리 정책 |
| 5.3 | Keep software updated | 업데이트 가능 + 지원 기간 공개 |
| 5.4 | Securely store credentials | 평문 저장 금지, secure element 권장 |
| 5.5 | Communicate securely | TLS / 인증된 채널 |
| 5.6 | Minimize attack surfaces | 사용하지 않는 포트·서비스 비활성화 |
| 5.7 | Ensure software integrity | secure boot, signed update |
| 5.8 | Protect personal data | GDPR 정합성 |
| 5.9 | Make systems resilient to outages | 네트워크·전력 단절 시 안전 동작 |
| 5.10 | Examine system telemetry | 이상징후 탐지, 감사로그 |
| 5.11 | Make it easy to delete user data | 공장 초기화 |
| 5.12 | Make installation/maintenance easy | 보안 관련 사용자 안내 |
| 5.13 | Validate input data | 외부 입력 검증 |

5.1, 5.2, 5.3 세 가지가 *최우선*입니다. UK PSTI는 이 셋만 강제하고 나머지는 권장입니다. 5.1의 "기기별 고유 패스워드"는 *MAC 주소 같은 추측 가능한 값으로 만들면 안 됩니다*. 보통 *공장에서 무작위 생성 + QR 스티커*로 처리합니다.

### 자기적합선언 (Statement of Compliance) 예

```text
Product: SmartLock-X1
Manufacturer: ACME Corp.
Standard: ETSI EN 303 645 V2.1.1

Compliance:
  5.1 No default passwords         COMPLIANT (per-device random)
  5.2 Vulnerability disclosure     COMPLIANT (security@acme.example)
  5.3 Software updates             COMPLIANT (signed OTA, 5 years)
  5.4 Secure storage               COMPLIANT (ATECC608B secure element)
  5.5 Secure communication         COMPLIANT (TLS 1.3)
  5.6 Minimize attack surfaces     COMPLIANT (no debug port in production)
  ...

Minimum support period: 5 years from last unit shipped (2024-12-01)
```

영국은 이걸 *공개*해야 합니다. 거짓 선언은 행정 제재 대상입니다.

## IEC 62443 — 산업 자동화 보안

OT(Operational Technology) 영역의 *유일한 글로벌 표준*입니다. 발전소·정유·수처리·공장 자동화에 적용됩니다. 13개 문서로 나뉘는데, 임베디드 엔지니어가 주로 보는 것은 다음 셋입니다.

| 문서 | 대상 |
|------|------|
| IEC 62443-3-3 | 시스템 수준 보안 요구 (SR) |
| IEC 62443-4-1 | 제품 *개발 프로세스* 요구 |
| IEC 62443-4-2 | 제품(component) *기술적* 요구 |

핵심 개념은 *Zone*과 *Conduit*입니다.

```text
[Enterprise Zone]            ← 사무망
        |
   Conduit (firewall)
        |
[Control Zone]               ← MES, SCADA
        |
   Conduit (data diode)
        |
[Safety Zone]                ← Safety PLC (SIL-rated)
```

각 Zone에 *Security Level (SL)*을 1~4로 부여합니다.

| SL | 위협 모델 |
|----|---------|
| SL 1 | 우연한 위반, casual exposure |
| SL 2 | 일반적 기술 + 적은 자원 |
| SL 3 | 정교한 기술 + 중간 자원 |
| SL 4 | 정교한 기술 + 많은 자원 (국가 단위) |

대부분의 산업 시설은 *SL 2* 또는 *SL 3*를 목표로 합니다. SL 4는 핵발전소·국방 정도입니다.

제품 인증은 *ISASecure CSA / SDLA / EDSA*가 가장 대표적입니다. Siemens, Schneider, ABB, Rockwell 같은 회사가 모두 받습니다. 한국에서는 *KTL*이 IEC 62443 인증 기관입니다.

## NIST IR 8259 / IR 8425 — 미국 baseline

NIST IR 8259는 *제조사가 IoT 디바이스에 *최소한* 갖춰야 할 6개 capability*를 정의합니다.

**1. Device Identification          (각 디바이스를 유일하게 식별)**


**2. Device Configuration           (설정 변경, 인증된 접근)**


**3. Data Protection                (저장·전송 데이터 보호)**


**4. Logical Access to Interfaces   (인증된 접근만)**


**5. Software Update                (signed, authenticated update)**


**6. Cybersecurity State Awareness  (보안 상태 보고 가능)**

IR 8425는 *소비자 IoT 제품*의 baseline으로 ETSI EN 303 645와 매우 유사합니다. *US Cyber Trust Mark*(2024 시작)가 이 기준을 씁니다.

NIST SP 800-213은 *연방 정부가 IoT를 도입할 때* 보는 기준이고, SP 800-213A가 *카탈로그 형태*의 구체 요구입니다.

## EU Cyber Resilience Act (CRA) — 가장 광범위

2024년 12월 발효, *2027년 12월 11일 완전 시행*. *디지털 요소가 있는 거의 모든 제품*에 적용됩니다. 라우터·카메라뿐 아니라 *펌웨어가 있는 모든 가전*, *데스크톱 소프트웨어*, *모바일 앱*까지 포함됩니다.

핵심 의무는 세 가지입니다.

| 의무 | 내용 |
|------|------|
| Essential cybersecurity requirements | secure by default, 취약점 없는 출시, 업데이트 가능 |
| Vulnerability handling | 24시간 내 ENISA에 actively exploited vuln 보고 |
| Support period | 제품 *예상 수명* 동안 보안 업데이트 (최소 5년) |

이 *24시간 보고* 요구가 가장 충격적입니다. 알고도 늦으면 *전 EU 매출의 2.5% 또는 1500만 EUR* 중 더 큰 금액의 벌금 대상입니다.

제품은 위험도에 따라 분류됩니다.

```text
Class I (default)         자기적합선언
Class II (important)      OS, password manager, VPN, network mgmt
Class III (critical)      hardware security module, smart meter gateway
                          → 제3자 인증 의무
```

대부분의 IoT는 *Class I*입니다. CE 마킹이 가능합니다. 다만 *secure boot 검증*, *서명된 업데이트*, *SBOM 제출*은 기본입니다. SBOM은 [Ch 10: SDLC](/blog/embedded/embedded-security/chapter10-sdlc)에서 다룹니다.

## UNECE WP.29 R155/R156 — 자동차

자동차 사이버보안의 *국제 강제 표준*입니다.

| 규정 | 대상 |
|------|------|
| R155 | 차량 사이버보안 + CSMS (Cybersecurity Management System) |
| R156 | 차량 *소프트웨어 업데이트* + SUMS |

EU·일본·한국에서 *2022년 7월 이후 신차 type approval*에 필수. *2024년 7월 이후 모든 신차*. 한국 KMVSS도 이를 반영합니다.

R155는 *차량 자체*의 보안뿐 아니라 *OEM의 조직과 프로세스*를 평가합니다. ISO/SAE 21434가 R155 준수의 사실상 *기술적 표준*입니다. R156은 [Ch 6의 OTA](/blog/embedded/embedded-security/chapter06-ota-update) 요건을 강제합니다.

자동차 분야는 [Embedded Automotive 시리즈](/blog/embedded/automotive/misra-c)와 깊게 연결됩니다.

## 항공·우주 — 별도 트랙

항공기·우주기기는 별도 표준 트랙입니다.

| 표준 | 대상 |
|------|------|
| DO-326A / ED-202A | 항공기 사이버보안 (Airworthiness) |
| DO-356A / ED-203A | 보안 평가 방법론 |
| DO-355A / ED-204A | 항공기 운영 보안 |
| ECSS-Q-ST-80C | 우주 소프트웨어 |

DO-178C가 *기능 안전*이라면 DO-326A는 *보안*입니다. 자세한 내용은 [Aerospace Standards 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)를 참고합니다.

## 한국 — KISA, KICS, KCSP

한국은 *의무가 적고 자발 인증 위주*입니다.

| 인증 | 운영 | 대상 |
|------|------|------|
| KISA IoT 보안 인증 | KISA | 소비자 IoT, 자발적 |
| KCSP (사물인터넷 보안 인증) | KISA | 디바이스·게이트웨이·서비스 |
| K-ISMS / K-ISMS-P | KISA | 정보보호 관리체계, 일부 사업자 의무 |
| KICS (한국 산업 사이버보안) | 한전·산업부 | 발전·전력망 |
| KMVSS-자동차 사이버보안 | 국토부 | UNECE R155 국내 적용 |

KISA IoT 보안 인증의 평가 항목은 *ETSI EN 303 645와 매우 유사*합니다. *공식적 매핑*이 KISA 가이드라인에 정리되어 있어, 글로벌 표준을 충족하면 한국 인증은 추가 비용이 작습니다.

K-ISMS는 *시스템 운영자*의 관리체계입니다. 통신사·금융사·일정 규모 이상 IT 서비스에 *법적 의무*가 있습니다. 일반 IoT 제조사는 *자발 인증*입니다.

## 표준 매핑 — 공통 요구사항

표준을 동시에 만족하려면 *공통 요구*를 먼저 다집니다. 다음 8개를 만족하면 거의 모든 표준의 핵심 요구를 80% 이상 커버합니다.

| # | 요구 | 만족 도구 |
|---|------|---------|
| 1 | No default password | 기기별 random + QR |
| 2 | Signed firmware + secure boot | [Ch 2](/blog/embedded/embedded-security/chapter02-secure-boot), MCUboot |
| 3 | Signed OTA | [Ch 6](/blog/embedded/embedded-security/chapter06-ota-update), MCUboot/Mender |
| 4 | TLS + cert pinning | mbedTLS, wolfSSL |
| 5 | Secure credential storage | secure element / TrustZone |
| 6 | Vulnerability disclosure policy | security.txt, contact email |
| 7 | SBOM | SPDX / CycloneDX |
| 8 | Support period | 5년 이상 공시 |

이 8개를 *제품 출시 전*에 검증하면 ETSI/NIST/CRA/UNECE 다수가 동시에 처리됩니다.

## 적용 워크플로

새 제품 한 대를 출시할 때의 전형 흐름:

**1. 시장 결정     : 어느 시장? (EU/US/KR/CN/JP)**


**2. 표준 매핑    : 시장별 의무 표준 식별**


**3. Gap 분석     : 현재 설계 대비 missing 요구 확인**


**4. 설계 보강    : secure boot, 서명 OTA, secure storage 등**


**5. 자체 평가    : ETSI 13개 등 체크리스트**


**6. 인증 (필요시): KTL/TUV/Bureau Veritas**


**7. 적합선언     : CE/UKCA + SoC 게시**


**8. 사후 관리    : vuln disclosure, 24시간 보고 (CRA)**

5번 *자체 평가*는 ETSI가 IXIT (Implementation eXtra InformaTion for Testing)라는 형식을 제공합니다. *질문에 답하는 형태*라 엔지니어가 작성 가능합니다.

## 자주 하는 실수

### "우리는 B2B니까 소비자 표준 안 봐도 된다"

CRA는 *B2B/B2C 구분 없이* 적용됩니다. *지원 기간 5년*과 *24시간 vuln 보고*는 모든 제품 대상입니다.

### MAC 주소를 device-unique password로 사용

ETSI 5.1 위반입니다. MAC은 *추측 가능*하고 *Wi-Fi probe로 노출*됩니다. *진짜 random*이어야 합니다.

### 인증 받은 다음에 보안 업데이트 종료

지원 기간을 *명시 공개*했으면 *그 기간 동안 유지*해야 합니다. CRA는 이를 *법적 의무*로 만듭니다.

### SBOM을 한 번 만들고 끝

SBOM은 *매 release마다* 갱신되어야 합니다. 자동 생성(CycloneDX-CLI, syft)을 CI에 묶습니다.

### 한국 시장만 보고 글로벌 표준 무시

한국 시장만 노린다고 해도, *EU CRA 호환*을 미리 맞춰 두면 나중 비용이 훨씬 작습니다. KCSP는 ETSI와 거의 동등하므로 *동시 인증*이 효율적입니다.

### 표준 문서를 직접 보지 않고 컨설팅에 맡김

표준 문서는 *읽으면 의외로 짧고 구체적*입니다. ETSI EN 303 645는 본문 24쪽입니다. 한 번은 직접 읽어야 *왜 그렇게 설계해야 하는지*가 보입니다.

## 정리

- IoT 보안 표준은 *체크리스트*에서 *법적 요구*로 이동 중입니다. EU CRA가 분기점입니다.
- ETSI EN 303 645의 13개 provision이 *공통 baseline*입니다. 처음 보는 표준으로 권장합니다.
- IEC 62443은 *산업 자동화* 영역의 글로벌 표준, Zone/Conduit이 핵심 모델입니다.
- NIST IR 8259/8425는 *미국 baseline*, US Cyber Trust Mark의 기반입니다.
- EU CRA는 *24시간 vuln 보고*와 *5년 지원*을 강제합니다. 위반 시 매출 2.5% 벌금.
- 자동차는 *UNECE R155/R156* 의무, ISO/SAE 21434가 기술 표준입니다.
- 한국은 KISA IoT 보안 인증·KCSP가 ETSI와 거의 동등합니다. 글로벌 호환이 효율적입니다.
- 8개의 *공통 요구*(no default password, signed FW/OTA, TLS, secure storage, vuln policy, SBOM, support period)를 만족하면 다수 표준의 핵심을 커버합니다.

다음 편은 **Ch 9: 펌웨어 분석 / 리버싱**.

## 관련 항목

- [Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 10: 보안 SDLC + SBOM](/blog/embedded/embedded-security/chapter10-sdlc)
- [Embedded Automotive — MISRA C 시리즈](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [Embedded Automotive — AUTOSAR Adaptive 시리즈](/blog/embedded/automotive/autosar-adaptive/00-overview)
- [Aerospace Standards — DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [원문 — ETSI EN 303 645 V2.1.1](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.01_60/en_303645v020101p.pdf)
- [원문 — IEC 62443 (ISA)](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards)
- [원문 — NIST IR 8259 / 8425](https://csrc.nist.gov/publications/detail/nistir/8425/final)
- [원문 — EU Cyber Resilience Act](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act)
- [원문 — UK PSTI Act 2022](https://www.legislation.gov.uk/ukpga/2022/46/contents)
- [원문 — KISA IoT 보안 인증](https://www.kisa.or.kr/)
