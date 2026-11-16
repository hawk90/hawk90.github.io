---
title: "IoT 보안 표준 비교 — ETSI EN 303 645·IEC 62443·NIST 8259·EU CRA"
slug: "embedded/embedded-security/chapter08-iot-standards"
date: 2026-05-21T09:08:00
description: "소비자·산업 IoT 표준과 CRA·UK PSTI의 적용 범위, 일정, 검증 증거를 구분합니다."
tags: [IoT, ETSI, iec-62443, NIST, CRA, Standards]
series: "Embedded Security"
seriesOrder: 8
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> 표준의 기술 요구, 시장별 법적 의무, 제품 인증의 평가 범위를 구분해야 합니다. 같은 TLS·OTA 기능을 써도 적용 법규와 제출 증거가 같아지지는 않습니다.

이 장은 소비자·산업 IoT 제품의 적용 범위를 정리합니다. 법규 일정은 **2026-10-24 확인 기준**이며, 원래 글의 2025년 8월 CRA 시행·2027년 11월 완전 시행 표기는 잘못된 것입니다. EU CRA는 Regulation (EU) 2024/2847이고, RED의 무선기기 보안 요구와 별도입니다.

## 표준의 지형도

| 문서·제도 | 주된 대상 | 구분할 것 |
|------|------|------|
| ETSI EN 303 645 V2.1.1 | 소비자 IoT 보안 baseline | 표준의 권고·필수·적용 조건과 법적 의무는 별도 |
| IEC 62443 | 산업 자동화·제어 시스템 | 개발 프로세스, component, system의 평가 범위 |
| NIST IR 8259 계열·8425 | 제조사 활동·기기 capability·소비자 제품 | 기술 지침과 실제 조달·인증 요구 |
| EU CRA | 적용 범위에 해당하는 디지털 요소 제품 | 단계별 적용일, 제품 분류, 적합성평가 절차 |
| UK PSTI | 적용 대상 consumer connectable product | 2024-04-29 적용, 세 보안 요구와 SoC |
| UN R155/R156 | 적용 관할의 차량 형식승인 | 차량 범주·채택국·시행 조건별 확인 |
| KISA IoT 보안인증 | IoT 제품 인증 | 제품·등급·시험 범위와 해외 제도 대응을 따로 확인 |

B2B라는 이름이나 사용한 암호 library만으로 어느 제도의 적용 여부도 결정하지 않습니다.

## ETSI EN 303 645 — 소비자 IoT 13개 provision

[ETSI EN 303 645 V2.1.1 (2020-06)](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.01_60/en_303645v020101p.pdf)의 §5는 아래 13개 절이고 §6이 data protection입니다. 2024-09에 나온 [V3.1.3](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf)은 같은 13개 절 앞에 §5.0 "Reporting implementation"을 추가했습니다. 그 Provision 5.0-1은 해당 없거나 충족하지 않은 권고마다 정당화 사유를 기록하라고 요구하고, 그 기록 서식으로 Table B.1을 가리킵니다. 각 절 안의 provision은 "shall"(필수)과 "should"(권고)로 갈립니다.

13개 절의 제목(V2.1.1 원문)과 요지입니다.

| # | Provision | 핵심 |
|---|-----------|------|
| 5.1 | No universal default passwords | 공장 출하 시 기기별 고유 패스워드 또는 사용자 설정 강제 |
| 5.2 | Implement a means to manage reports of vulnerabilities | 보안 연락처 공개 + 처리 정책 |
| 5.3 | Keep software updated | 업데이트 가능 + 지원 기간 공개 |
| 5.4 | Securely store sensitive security parameters | 민감한 보안 parameter의 안전한 저장 |
| 5.5 | Communicate securely | TLS / 인증된 채널 |
| 5.6 | Minimize exposed attack surfaces | 사용하지 않는 포트·서비스 비활성화 |
| 5.7 | Ensure software integrity | secure boot, signed update |
| 5.8 | Ensure that personal data is secure | 전송 중 민감한 개인정보 보호 |
| 5.9 | Make systems resilient to outages | 네트워크·전력 단절 시 안전 동작 |
| 5.10 | Examine system telemetry data | 이상징후 탐지, 감사로그 |
| 5.11 | Make it easy for users to delete user data | 공장 초기화 |
| 5.12 | Make installation and maintenance of devices easy | 보안 관련 사용자 안내 |
| 5.13 | Validate input data | 외부 입력 검증 |

5.1의 첫 provision에는 조건이 붙어 있습니다. V2.1.1의 Provision 5.1-1은 "password를 쓰고, 공장 기본 상태가 아닌 모든 상태에서" 기기별로 고유하거나 사용자가 정한 password여야 한다고 적습니다. Password가 없는 기기에는 이 provision이 적용되지 않습니다. 기기별로 다르게 만든 password도 MAC 주소나 단순 증가 serial에서 유추된다면 "고유"의 취지를 지키지 못합니다.

### UK PSTI — 세 법적 요구와 Statement of Compliance

[영국 정부 안내](https://www.gov.uk/government/publications/the-uk-product-security-and-telecommunications-infrastructure-product-security-regime)에 따르면 이 제도는 2024-04-29에 시행됐고, 요구는 세 가지입니다. Password는 제품마다 고유하거나 사용자가 정할 수 있어야 하고, 제조사는 보안 문제 보고 방법을 알려야 하며, 최소 보안 업데이트 기간 정보를 공개해야 합니다. ETSI의 5.1(password)·5.2(취약점 보고)·5.3(업데이트) 절 일부에 해당하는 요구만 법적 의무가 된 것이고, 나머지 10개 절은 PSTI의 의무가 아닙니다.

| 요구 | 준비할 증거 | 실패 예 |
|------|------|------|
| 비밀번호 | 기기별 고유 값 또는 사용자 설정, 추측 가능성 검토 | 전 제품 공통 admin·공개 serial로 유추 가능 |
| 보안 문제 보고 정보 | 연락 경로, 수신 확인·처리 상태 안내 일정 | 메일 주소만 있고 답변 정책 없음 |
| 최소 보안 업데이트 기간 정보 | 기간과 종료일을 이해하기 쉽게 공개 | 지원 종료일이 없거나 판매 자료와 불일치 |

SoC(Statement of Compliance)의 필드는 [2023 Regulations Schedule 4](https://www.legislation.gov.uk/uksi/2023/1007/schedule/4/made)가 정합니다. 같은 정부 안내는 SoC가 제품에 "동반(accompany)"되어야 하며, 법이 종이 문서를 요구하지 않으므로 디지털이어도 된다고 적습니다. 지원 기간은 제조사가 정해 공개하는 값이고, PSTI가 정한 고정 연수는 없습니다.

## IEC 62443 — 산업 자동화 보안

산업 자동화·제어 시스템(IACS)의 보안을 다루는 표준 계열입니다. 법이 아니라 자발적 표준이며, 고객 계약이나 조달 조건으로 요구될 때 의무가 됩니다. 다음 판의 IEC webstore 페이지를 대조했습니다.

| 문서 | 대상 | 평가 질문 |
|------|------|------|
| [IEC 62443-3-3:2013](https://webstore.iec.ch/en/publication/7033) | system 요구·security level | 정의한 system·zone·conduit에서 어떤 요구를 충족하는가? |
| [IEC 62443-4-1:2018](https://webstore.iec.ch/en/publication/33615) | 공급자의 개발·유지·종료 프로세스 | 요구·검증·patch·end-of-life 절차의 증거가 있는가? |
| [IEC 62443-4-2:2019](https://webstore.iec.ch/en/publication/34421) | IACS component의 기술 요구 | component capability가 통합 환경의 목표를 지원하는가? |

IEC webstore의 62443-3-3:2013 설명은 이 표준이 IEC 62443-1-1의 일곱 foundational requirement(FR)에 대응하는 system requirement와 control system의 capability security level(SL-C)을 정하고, 사용자는 대상 system의 zone·conduit 정의와 함께 이를 써서 target SL(SL-T)을 정한다고 적습니다. 62443-4-2:2019는 같은 일곱 FR에 대응하는 component requirement와 SL-C(component)를 정합니다. SL-C는 제품이 낼 수 있는 수준이고 SL-T는 system이 목표로 하는 수준이므로, component의 SL-C 인증이 곧 system의 SL-T 달성은 아닙니다.

이 글에서는 유료 표준 전문을 읽지 않았고, 위 내용은 IEC 공개 scope와 webstore 정보 범위입니다.

## NIST IR 8259 / IR 8425 — 미국 baseline

[NIST의 문서 계열 안내](https://www.nist.gov/itl/applied-cybersecurity/nist-cybersecurity-iot-program/nistir-8259-series)는 제조사 활동인 8259(2026-04-09에 R1 개정), 기기 기술 capability baseline인 **8259A**(2020-05), 비기술 지원 capability인 **8259B**(2021-08)를 나눕니다. [8259A](https://nvlpubs.nist.gov/nistpubs/ir/2020/NIST.IR.8259A.pdf)의 여섯 capability를 제품 증거에 연결하면 다음과 같습니다.

| 기기 capability | 검토할 제품 증거 |
|------|------|
| Device Identification | 재부팅·재등록 후 식별과 중복 처리 |
| Device Configuration | 허용 주체·변경 이력·초기화 정책 |
| Data Protection | 저장·전송 범위와 키 수명주기 |
| Logical Access to Interfaces | 문서화한 interface의 인증·권한·비활성화 |
| Software Update | 업데이트 주체·인증·실패 복구 |
| Cybersecurity State Awareness | 상태의 관찰·보고 대상과 접근 제어 |

[IR 8425](https://csrc.nist.gov/pubs/ir/8425/final)(2022-09, "Profile of the IoT Core Baseline for Consumer IoT Products")는 그 결과가 "IoT 제품 전체(entire IoT product)"에 적용된다고 적습니다. 기기만이 아니라 함께 동작하는 app·backend도 대상입니다. NIST 문서는 지침이며 그 자체로 법적 의무는 아닙니다.

## EU Cyber Resilience Act (CRA) — 가장 광범위

[EU 집행위원회 시행 안내](https://digital-strategy.ec.europa.eu/en/factpages/cyber-resilience-act-implementation)와 [규정 요약](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)은 적용 시점을 구분합니다.

| 사건 | 날짜 |
|------|------|
| Regulation (EU) 2024/2847 발효 | 2024-12-10 |
| 적합성평가기관 통지 관련 Chapter IV 적용 | 2026-06-11 |
| Article 14 보고 의무 적용 | 2026-09-11 |
| 주요 제품 요구 적용 | 2027-12-11 |

2025-08-01은 특정 무선기기에 대한 [RED Delegated Regulation (EU) 2022/30 적용](https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en)과 구분합니다. [규정 요약](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)에 따르면 CRA 대상은 EU 시장에 상업적으로 제공되고, 의도된 용도나 합리적으로 예상되는 사용에 "직접 또는 간접의 논리적·물리적 data 연결"이 포함된 digital 요소 제품입니다. 다른 EU 법이 이미 다루는 일부 제품은 제외되며, 요약 페이지는 그 예로 Regulation (EU) No 168/2013 대상 일부를 제외한 Delegated Regulation (EU) 2025/1535를 듭니다. 상업적으로 제공되지 않는 제품도 대상이 아닙니다.

[제조사 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-manufacturers)는 위험 평가·기술 문서·적합성평가, 시장 출시 시 표시·사용 정보, 출시 후 취약점 처리를 연결합니다. [규정 요약](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)은 제조사가 지원 기간을 정하고, 그 종료일을 월·연까지 구매 시점에 알기 쉽게 표시해야 한다고 적습니다. [집행위원회 FAQ §4.5](https://ec.europa.eu/newsroom/dae/redirection/document/122331)가 설명하는 Article 13(8)의 최소 5년 원칙에는 예상 사용 기간이 5년 미만인 제품의 예외가 있으며, 오래 사용하는 제품의 지원을 무조건 5년으로 끝내는 뜻도 아닙니다.

### 제품 분류는 I/II/III의 단일 등급표가 아닙니다

[집행위원회 적합성평가 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-conformity-assessment)와 [규정 요약](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)은 일반 제품, Annex III의 important Class I·II, Annex IV의 critical 제품을 나눕니다. 평가 경로는 다음과 같습니다.

| 분류 | 적합성평가 |
|------|------|
| 일반 제품 | 제조사 자체 평가 |
| Important Class I | 조화표준을 적용했으면 자체 평가, 아니면 notified body의 제3자 평가 |
| Important Class II | 제3자 평가 |
| Critical (Annex IV) | 제3자 평가 |

### 보고 시계는 인지 시점과 보고 종류에 따라 다릅니다

[CRA 보고 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting)의 대상은 실제 악용 중인 취약점과 제품 보안에 영향을 주는 심각한 incident입니다. CVE가 있다는 것만으로는 대상이 아닙니다. 제조사는 ENISA가 만든 CRA Single Reporting Platform(SRP)으로 주 사업장이 있는 회원국의 CSIRT에 보고하고, 정보는 ENISA에도 동시에 전달됩니다. 같은 안내는 open-source software steward의 보고 의무 적용일을 2027-12-11로 따로 둡니다.

| 단계 | 실제 악용 취약점 | 심각한 incident |
|------|------|------|
| Early warning | 인지 후 24시간 이내 | 인지 후 24시간 이내 |
| 후속 notification | 인지 후 72시간 이내 | 인지 후 72시간 이내 |
| 최종 보고 | 시정·완화 조치가 제공된 뒤 14일 이내 | 72시간 notification 제출 뒤 1개월 이내 |

24시간 안에 내는 것은 early warning이고, 분석과 수정은 그 뒤 단계에서 이어집니다. SBOM·영향 분석과 사고 대응 절차는 [Ch 10](/blog/embedded/embedded-security/chapter10-sdlc)에서 release별 증거로 연결합니다.

## UNECE WP.29 R155/R156 — 자동차

[UNECE R156](https://unece.org/transport/documents/2021/03/standards/un-regulation-no-156-software-update-and-software-update)은 소프트웨어 업데이트와 그 관리체계(SUMS), R155는 차량 cybersecurity와 관리체계(CSMS)를 다룹니다. 둘 다 2020년 6월 WP.29에서 채택됐고, [UN 조약 기록](https://treaties.un.org/doc/Publication/MTDSG/Volume%20I/Chapter%20XI/XI-B-16-156.en.xml)상 R156은 2021-01-22에 발효했습니다. 형식승인 규정이므로 의무를 지는 주체는 차량 형식승인을 받는 제조사입니다. OTA 서명 기능 하나는 R156의 일부 요구일 뿐 관리체계 전체가 아닙니다.

## 한국 — 제품 인증 범위를 먼저 확인

[KISA IoT 보안인증 안내](https://www.kisa.or.kr/1050608)의 제품 인증은 조직 단위 관리체계 인증인 ISMS·ISMS-P와 별개입니다. 해외 표준과의 상호 인정 근거는 찾지 못했으므로, ETSI에 맞췄다는 이유로 국내 시험이 면제된다고 보지 않습니다.



## 표준 매핑 — 공통 요구사항

공통 구현은 재사용할 수 있지만 요구사항별 증거를 따로 남겨야 합니다. 아래는 법적 동등성이나 충족률 표가 아니라 engineering evidence의 시작점입니다.

| 관심 영역 | 정상 확인 | 실패·예외 확인 |
|------|------|------|
| 초기 인증 | 허용 사용자만 등록 | 공통·추측 가능한 credential, 재등록 |
| Boot·OTA | 허용 key·제품·version 수락 | 변조·다른 제품·구버전·전원 차단 |
| 통신·저장 | 신뢰 anchor·키 소유자·보호 범위 | 만료·폐기·분실·복구 |
| 취약점 대응 | 담당자·지원 종료·release 식별 | 부재 시 대리인, 영향 판정 지연 |
| SBOM | 배포 artifact와 component 대응 | 빠진 정적 library·변형 source·오탐 |

## 적용 워크플로 — 판정 결과를 남기기

| 단계 | 남길 결과 | 완료를 막는 조건 |
|------|------|------|
| 시장·제품 식별 | 판매 관할, 기기·app·서비스 경계 | 시장·수입자·제외 여부 미정 |
| 적용성 판단 | 규정 번호·판·일정·제품 분류 | 인증 이름만 있고 적용 조문 없음 |
| 요구 추적 | 각 요구와 설계·시험·문서의 연결 | TLS 사용처럼 구현명만 있음 |
| 정상·실패 평가 | build·환경·입력·결과·잔여 제한 | 미실행 명령을 시험 성공으로 기록 |
| 적합성평가·표시 | 해당 절차·담당자·SoC/DoC 등 | 제품·판·지원 종료일 불일치 |
| 운영 유지 | 변경별 재평가·취약점·보고 책임 | release와 현장 장치 대응 불가 |

ETSI의 구현 적합성 선언 서식, 시험 정보(IXIT), 실제 평가 specification은 역할이 다릅니다. UK SoC·EU DoC를 같은 서식으로 취급하지 않습니다.

## 자주 하는 실수

CRA는 소비자 제품만이 아니라 B2B 제품도 대상이고, 분류는 제품 종류(Annex III·IV)로 정해집니다. 지원 기간은 5년이 기본이지만 예상 사용 기간이 더 짧으면 그 기간으로, 더 길면 더 길게 정합니다. MAC 주소 같은 공개 식별자에서 유도한 password는 ETSI 5.1이 막으려는 바로 그 경우입니다.

SBOM은 release와 일치해야 하며 단순 생성 성공이 누락 없는 inventory를 보장하지 않습니다. 표준 번호·판·제품 범위·시험 결과가 없으면 인증명이나 보안 chip만으로 적합성을 판단하지 않습니다.

## 정리

표준 비교의 산출물은 모든 제도에 통하는 공통 체크 표시가 아닙니다. 제품별 적용성, 요구와 증거의 연결, 실패 시험, 지원·보고 책임을 남깁니다. 이 장은 공개 공식 안내의 대조이며 실제 법적 적합성평가나 인증 시험을 수행한 결과가 아닙니다.

다음 편은 **Ch 9: 펌웨어 분석 / 리버싱**.

## 관련 항목

- [Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 10: 보안 SDLC + SBOM](/blog/embedded/embedded-security/chapter10-sdlc)
- [원문 — ETSI EN 303 645 V2.1.1](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.01_60/en_303645v020101p.pdf)
- [원문 — IEC 62443 (ISA)](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards)
- [원문 — NIST IR 8425](https://csrc.nist.gov/publications/detail/nistir/8425/final)
- [원문 — EU Cyber Resilience Act](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act)
- [원문 — UK PSTI Act 2022](https://www.legislation.gov.uk/ukpga/2022/46/contents)
- [원문 — KISA IoT 보안 인증](https://www.kisa.or.kr/1050608)
