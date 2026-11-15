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

[ETSI EN 303 645 V2.1.1 (2020-06)](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.01_60/en_303645v020101p.pdf)의 §5는 아래 13개 주제이며 §6의 개인정보 보호 조항도 있습니다. 최신 판이라는 뜻이 아닙니다. Annex B의 필수·권고·조건부 항목을 제품 기능에 맞춰 읽으며, 이 표준을 읽었다는 사실만으로 CRA 적합성을 선언하지 않습니다.

13개 provision의 요지입니다.

| # | Provision | 핵심 |
|---|-----------|------|
| 5.1 | No universal default passwords | 공장 출하 시 기기별 고유 패스워드 또는 사용자 설정 강제 |
| 5.2 | Vulnerability disclosure | 보안 연락처 공개 + 처리 정책 |
| 5.3 | Keep software updated | 업데이트 가능 + 지원 기간 공개 |
| 5.4 | Securely store credentials | 민감한 보안 parameter의 안전한 저장 |
| 5.5 | Communicate securely | TLS / 인증된 채널 |
| 5.6 | Minimize attack surfaces | 사용하지 않는 포트·서비스 비활성화 |
| 5.7 | Ensure software integrity | secure boot, signed update |
| 5.8 | Protect personal data | 전송 중 민감한 개인정보 보호 |
| 5.9 | Make systems resilient to outages | 네트워크·전력 단절 시 안전 동작 |
| 5.10 | Examine system telemetry | 이상징후 탐지, 감사로그 |
| 5.11 | Make it easy to delete user data | 공장 초기화 |
| 5.12 | Make installation/maintenance easy | 보안 관련 사용자 안내 |
| 5.13 | Validate input data | 외부 입력 검증 |

5.1의 비밀번호 요구는 password를 사용하는 제품의 적용 조건까지 읽습니다. MAC 주소·단순 증가 counter 같은 추측 가능한 값을 비밀번호로 쓰지 않습니다. 각 항목의 구체적인 구현은 threat model과 수명주기에서 평가합니다.

### UK PSTI — 세 법적 요구와 Statement of Compliance

[영국 정부 안내](https://www.gov.uk/government/publications/the-uk-product-security-and-telecommunications-infrastructure-product-security-regime)는 2024-04-29부터 적용되는 제도의 세 요구를 구분합니다. ETSI 전체를 그대로 법제화한 것과 같지 않습니다.

| 요구 | 준비할 증거 | 실패 예 |
|------|------|------|
| 비밀번호 | 기기별 고유 값 또는 사용자 설정, 추측 가능성 검토 | 전 제품 공통 admin·공개 serial로 유추 가능 |
| 보안 문제 보고 정보 | 연락 경로, 수신 확인·처리 상태 안내 일정 | 메일 주소만 있고 답변 정책 없음 |
| 최소 보안 업데이트 기간 정보 | 기간과 종료일을 이해하기 쉽게 공개 | 지원 종료일이 없거나 판매 자료와 불일치 |

[2023 Regulations Schedule 4](https://www.legislation.gov.uk/uksi/2023/1007/schedule/4/made)의 SoC 필드를 제품 식별·제조사·선언·지원 기간·서명 등 실제 법정 항목과 대조합니다. 특정 secure element와 TLS를 썼다는 목록은 SoC나 시험 결과를 대신하지 않습니다. SoC가 제품에 동반되어야 한다는 요구와 웹사이트 게시 요구를 같은 것으로 쓰지 않습니다. PSTI 자체에 보편적인 5년 지원 기간이 있다고 가정하지 않습니다.

## IEC 62443 — 산업 자동화 보안

산업 자동화·제어 시스템(IACS)의 보안을 다루는 표준 계열입니다. 모든 OT 시설에 일괄 의무이거나 유일한 표준이라고 일반화하지 않습니다. 이 글은 다음 판의 공개 IEC scope를 비교했습니다.

| 문서 | 대상 | 평가 질문 |
|------|------|------|
| [IEC 62443-3-3:2013](https://webstore.iec.ch/en/publication/7033) | system 요구·security level | 정의한 system·zone·conduit에서 어떤 요구를 충족하는가? |
| [IEC 62443-4-1:2018](https://webstore.iec.ch/en/publication/33615) | 공급자의 개발·유지·종료 프로세스 | 요구·검증·patch·end-of-life 절차의 증거가 있는가? |
| [IEC 62443-4-2:2019](https://webstore.iec.ch/en/publication/34421) | IACS component의 기술 요구 | component capability가 통합 환경의 목표를 지원하는가? |

Zone은 보안 요구를 공유하는 자산을 묶고 conduit는 zone 사이 통신을 다룹니다. 사무망·제어망·안전망의 고정 3단 구성이나 물리적 분리만을 뜻하지 않습니다. 목표 SL-T와 capability SL-C를 구분하고 component 인증을 전체 system 달성 수준으로 확대하지 않습니다. Cybersecurity SL과 기능 안전의 SIL도 같은 척도가 아닙니다.

인증 범위·판·구성·통합 조건을 실제 certificate와 시험 문서로 확인합니다. 이 작업에서는 유료 표준 전문, 실제 제품 인증이나 공장 망 분리를 시험하지 않았습니다.

## NIST IR 8259 / IR 8425 — 미국 baseline

[NIST의 문서 계열 안내](https://www.nist.gov/itl/applied-cybersecurity/nist-cybersecurity-iot-program/nistir-8259-series)는 제조사 활동인 8259와 기기 기술 capability baseline인 **8259A**, 비기술 지원 capability인 **8259B**를 구분합니다. 8259A의 여섯 영역은 다음처럼 제품 증거에 연결할 수 있습니다.

| 기기 capability | 검토할 제품 증거 |
|------|------|
| Device Identification | 재부팅·재등록 후 식별과 중복 처리 |
| Device Configuration | 허용 주체·변경 이력·초기화 정책 |
| Data Protection | 저장·전송 범위와 키 수명주기 |
| Logical Access to Interfaces | 문서화한 interface의 인증·권한·비활성화 |
| Software Update | 업데이트 주체·인증·실패 복구 |
| Cybersecurity State Awareness | 상태의 관찰·보고 대상과 접근 제어 |

[IR 8425 (2022)](https://csrc.nist.gov/pubs/ir/8425/final)는 소비자 IoT **제품 전체**의 profile입니다. 기기만 검사하고 cloud·app·운영 지원을 제외하지 않습니다. 이 문서들의 존재가 모든 미국 IoT 제품의 동일한 법적 의무를 뜻하지 않습니다. 연방 시스템은 SP 800-213/213A와 실제 기관 조달 조건을 별도로 대조합니다.

## EU Cyber Resilience Act (CRA) — 가장 광범위

[EU 집행위원회 시행 안내](https://digital-strategy.ec.europa.eu/en/factpages/cyber-resilience-act-implementation)와 [규정 요약](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)은 적용 시점을 구분합니다.

| 사건 | 날짜 |
|------|------|
| Regulation (EU) 2024/2847 발효 | 2024-12-10 |
| 적합성평가기관 통지 관련 Chapter IV 적용 | 2026-06-11 |
| Article 14 보고 의무 적용 | 2026-09-11 |
| 주요 제품 요구 적용 | 2027-12-11 |

2025-08-01은 특정 무선기기에 대한 [RED Delegated Regulation (EU) 2022/30 적용](https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en)과 구분합니다. CRA 대상은 EU 시장에 제공되는 디지털 요소 제품의 정의·연결 조건·제외 조항으로 판단하며, 펌웨어가 있다는 이유만으로 모든 제품을 포함하지 않습니다.

[제조사 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-manufacturers)는 위험 평가·기술 문서·적합성평가, 시장 출시 시 표시·사용 정보, 출시 후 취약점 처리를 연결합니다. 지원 기간은 예상 사용 기간을 반영해야 합니다. [집행위원회 FAQ §4.5](https://ec.europa.eu/newsroom/dae/redirection/document/122331)가 설명하는 Article 13(8)의 최소 5년 원칙에는 예상 사용 기간이 5년 미만인 제품의 예외가 있으며, 오래 사용하는 제품의 지원을 무조건 5년으로 끝내는 뜻도 아닙니다.

### 제품 분류는 I/II/III의 단일 등급표가 아닙니다

[집행위원회 적합성평가 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-conformity-assessment)에 따라 일반 제품, Annex III의 important Class I·II, Annex IV의 critical 제품을 구분합니다. 일반 제품은 자체 평가가 가능하지만, important 제품은 class와 적용한 조화표준 등 조건에 따라 제3자 평가가 필요합니다. Important Class II를 일괄 자기선언 가능이라고 적지 않습니다. Critical 제품은 더 엄격한 평가 경로를 확인합니다. 실제 제품 정의와 절차는 규정·관련 시행 규정으로 대조합니다.

### 보고 시계는 인지 시점과 보고 종류에 따라 다릅니다

[CRA 보고 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting)는 실제 악용 취약점과 제품 보안에 영향을 미치는 심각한 incident를 대상으로 합니다. 단순히 CVE가 검색된 모든 경우와 같지 않습니다. 인지 후 부당한 지체 없이, 각 기한 안에 SRP를 통해 지정 CSIRT와 ENISA에 보고하는 체계를 준비합니다.

| 단계 | 실제 악용 취약점 | 심각한 incident |
|------|------|------|
| Early warning | 인지 후 24시간 이내 | 인지 후 24시간 이내 |
| 후속 notification | 인지 후 72시간 이내 | 인지 후 72시간 이내 |
| 최종 보고 | 시정·완화 조치가 제공된 뒤 14일 이내 | 72시간 notification 제출 뒤 1개월 이내 |

24시간 내 모든 분석·수정을 끝내야 한다는 뜻은 아닙니다. 모든 사건을 고정 90일에 공개한다는 정책으로도 바꿀 수 없습니다. SBOM·영향 분석과 사고 대응 절차는 [Ch 10](/blog/embedded/embedded-security/chapter10-sdlc)에서 release별 증거로 연결합니다.

## UNECE WP.29 R155/R156 — 자동차

차량 보안과 업데이트는 형식승인 관할·차량 범주별 조건을 확인합니다. [UNECE R156](https://unece.org/transport/documents/2021/03/standards/un-regulation-no-156-software-update-and-software-update)은 소프트웨어 업데이트와 관리체계, R155는 차량 cybersecurity와 CSMS를 다룹니다. EU·일본·한국의 적용 날짜를 하나의 2022/2024 일정으로 합치지 않습니다. ISO/SAE 21434에 따른 개발 활동이나 OTA 서명 기능 하나로 형식승인 전체가 충족되지는 않습니다.

## 한국 — 제품 인증 범위를 먼저 확인

[KISA IoT 보안인증 안내](https://www.kisa.or.kr/1050608)의 제품 인증과 조직의 ISMS·ISMS-P 관리체계를 구분합니다. 이 글의 이전 KCSP·KICS 명칭과 해외 표준과의 자동 동등성·추가 비용 주장은 확인 근거가 없어 제거했습니다. 국내 대상 제품·인증 등급·납품 요건은 해당 제도의 공고·시험 기준으로 판단하며, ETSI에 맞췄다는 이유로 시험을 생략하지 않습니다.

항공·우주·자동차와 산업별 인증은 소비자 IoT baseline과 평가 단위가 다릅니다. 이 장에서 특정 관할의 형식승인이나 제품 인증을 받았다고 주장하지 않습니다.

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

B2B 제품도 CRA 적용 가능성이 있지만 모든 B2B 제품이 같은 분류는 아닙니다. 최소 지원 기간의 예외와 장기 사용 제품 조건을 무시하지 않습니다. MAC 주소 같은 공개 식별자를 비밀번호로 바꾸는 대신 credential 생성·저장·초기화 전 과정을 검토합니다.

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
