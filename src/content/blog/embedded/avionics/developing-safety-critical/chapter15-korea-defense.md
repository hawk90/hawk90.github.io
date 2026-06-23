---
title: "Ch 15: 방사청 SW 신뢰성시험 + KARI"
date: 2026-05-18T15:00:00
description: "한국 방산·항공우주 — 방위사업청·KARI의 SW 표준과 DO-178C와의 매핑."
series: "Developing Safety-Critical Software"
seriesOrder: 15
tags: [avionics, korea, kari, dapa, defense]
draft: true
---

## 한 줄 요약

> **"방사청 SW 신뢰성시험 + KARI"** — 한국 방산·항공우주의 *DO-178C 한국적 변형*.

## 한국 방산·우주 SW 표준 — 책의 갭

**Rierson 책 (DO-178C 위주)** — 미국·서구 항공기·우주 표준.

**한국 갭**:

- 방위사업청 (DAPA) — 군 SW
- 한국항공우주연구원 (KARI) — 위성·발사체
- 국방기술품질원 (DTAQ) — 군 SW 시험
- ETRI·KAIST — 연구·표준

**필요성** — 채용 우대사항: *DO-160·방사청 SW 신뢰성시험*. InnoSpace·Perigee·UNASTELLA·한화 등 직결.

이 챕터 — *책에 없는 한국 응용*.

## 방위사업청 SW 신뢰성시험

**방위사업청 (DAPA)** — 국방·무기체계 획득 주무 기관.

**무기체계 SW 신뢰성시험**:

- 군 SW의 *신뢰성·안전성* 검증
- DO-178C에 영감 받음
- 한국 적응 (한국어·한국 절차)

**적용 대상**:

- 항공기 (KFX·F-X 후속)
- 미사일·로켓
- 위성 (군용)
- 함정·잠수함 SW
- 지상 무기체계

DAPA 표준 — *한국 방산 SW의 frame*.

## 무기체계 SW 신뢰성시험 가이드 — 구조

**주요 산출물**:

1. SW 개발 계획서 (SDP 유사)
2. SW 요구사항 명세서 (HLR·LLR)
3. SW 설계 명세서 (SDD)
4. 소스 코드
5. 시험 계획서 (Test Plan)
6. 시험 절차서 (Test Procedure)
7. 시험 결과 보고서 (Test Report)
8. 형상관리 계획서 (SCMP)
9. 품질 보증 계획서 (SQAP)
10. 최종 시험 보고서 (SAS 유사)

**+ 한국 특유**:

- 보안 등급 분류 (군사기밀)
- 국방규격 (DEF-STAN)
- ITAR·EAR 회피

DO-178C 구조 + *한국 보안*.

## SW 신뢰성 등급

방사청 SW 등급 (4 단계):

| 등급 | 의미 | 영향 | DO-178C 대응 |
|---|---|---|---|
| A급 | 임무 핵심 (Mission-critical) | 인명·임무 catastrophic | Level A·B |
| B급 | 임무 중요 (Mission-important) | 임무 약화 | Level C |
| C급 | 일반 (Standard) | mission 영향 적음 | Level D |
| D급 | 보조 (Auxiliary) | 영향 없음 | No formal cert |

DO-178C DAL과 유사 매핑.

## IV&V — 방사청 권고

**IV&V (Independent Verification & Validation)** — 방사청 SW에 *권고 또는 필수*.

**IV&V 기관**:

- 국방기술품질원 (DTAQ)
- 표준화시험원
- 신뢰성 시험원
- 중소 IV&V 회사

**역할**:

- 요구사항 review
- 설계 review
- 코드 review
- 시험 결과 verify
- 산출물 audit

IV&V 결과 → 방사청 보고 → 방사청: 양산·운용 승인.

IV&V — *외부 독립 검증*. 신뢰성 핵심.

## 무기체계 사례

- **KF-21 보라매 (KAI)** — Flight control SW. 자체 IV&V + 외부 IV&V. DO-178C-style 변형.
- **천궁·천궁-II 미사일 (LIG넥스원)** — Guidance·target tracking SW. 방사청 신뢰성시험.
- **현무 미사일 (LIG)** — 관성 항법·제어 SW.
- **K-9 자주포 (한화)** — 사격 통제·통신 SW.
- **KSS-III 잠수함 (한화·대우조선)** — 전투체계 SW. 방사청 표준 적용.

각 program — *방사청 신뢰성시험* 통과 필수.

## KARI — 한국항공우주연구원

**KARI** — 대한민국 우주 R&D 핵심.

**주요 program**:

- KSLV-I 나로호 (2009·2013) — 발사 성공
- KSLV-II 누리 (2021·2022·2023) — 발사 성공
- KSLV-III (개발 중) — 차세대
- KOMPSAT 시리즈 — 지구 관측 위성
- Chollian (천리안) — 정지궤도 위성
- KPLO 다누리 (2022) — 달 탐사선

**SW 표준** — KARI 자체 + ECSS 일부 + NASA NPR 일부. 보안·국가 IP 고려.

KARI — *한국 우주 SW의 중심*.

## KSLV-II 누리 SW 특징 (공개 자료)

KSLV-II 누리 발사체 avionics.

**Flight Computer**:

- ARM Cortex 기반 (정확 spec 비공개)
- RTOS — 자체 개발 또는 commercial

**Flight Software**:

- **Guidance** — 자체 알고리즘
- **Navigation** — IMU + GPS
- **Control** — pitch·yaw·roll
- **Telemetry** — TM/TC

**검증**:

- Simulation (Simulink·자체)
- HIL test
- 발사대 시험
- 단계별 비행시험

**발사 결과**:

- **1차 발사 (2021)** — 3단 LOX 탱크 조기 압력 손실 → 부분 실패
- **2차 발사 (2022)** — 성공
- **3차 발사 (2023)** — 성공 (위성 8기 궤도 진입)

KARI — *수십 년 SW 노하우*. 비공개 IP.

## KARI SW 개발 가이드 (공개·간접)

**ECSS 일부 채택**:

- ECSS-E-ST-40C (SW 일반)
- ECSS-Q-ST-80C (Product Assurance)
- ECSS-E-ST-10-12C (SW Configuration)

**NASA NPR 7150.2** — Class A·B·C. KOMPSAT 일부 적용.

**KARI 내부**:

- 자체 SW 개발 lifecycle
- 자체 verification process
- Code review·test
- 국문 + 영문 산출물

KARI — *국제 표준 + 자체 보완*.

## KOMPSAT — ESA·NASA 협력

- **KOMPSAT-5 (2013·SAR 위성)** — ECSS 일부 적용. ESA 자문.
- **KOMPSAT-3·3A (지구관측)** — 자체 + ESA 일부.
- **다누리 (KPLO·2022)** — NASA Deep Space Network 협력. NASA NPR 7150.2 일부 적용. KARI + NASA Ames + JPL 협력.

KARI 국제 협력 — *서구 표준 학습 + 이전*.

## 민간 우주 — InnoSpace·Perigee·UNASTELLA

**InnoSpace (인노스페이스)**:

- Hyperbolic Sounding Rocket
- 2024년 3월 첫 발사 (브라질)
- 소형 발사체 — *상업화* 초점
- SW — 자체 + 일부 NASA cFS·F-Prime

**Perigee Aerospace (페리지)**:

- Blue Whale 발사체
- 2024 운용 준비

**UNASTELLA (유나스텔라)**:

- 민간 우주 관광
- 서비스 개발 중

방위사업청·KARI 표준 *직접 적용 X*. 자체 + 국제 best practice.

민간 LV — *agility 우선*. 산업화·인증.

## 방사청 vs DO-178C 매핑

| 방사청 | DO-178C |
|---|---|
| A급 (mission critical) | Level A·B |
| B급 (important) | Level C |
| C급 (standard) | Level D |
| D급 (auxiliary) | None |
| SW 신뢰성시험 가이드 | DO-178C Annex A |
| SW 개발 계획서 | SDP |
| SW 요구사항 명세서 | HLR·LLR |
| SW 설계 명세서 | SDD |
| 시험 계획서 | SVP·TC·TP |
| 형상관리 계획서 | SCMP |
| 품질 보증 계획서 | SQAP |
| IV&V 보고서 | SVR |

**한국 특유**:

- 보안 등급
- 한국어 산출물
- 한국 IP·소스 권리
- 국방규격 적용

구조 유사 — *세부 절차 한국화*.

## DTAQ — 국방기술품질원

**DTAQ (Defense Technology Quality Agency)** — 방산 품질 보증 기관.

**역할**:

- 무기체계 시험·평가
- SW 신뢰성시험 수행
- 품질 관리
- 국방규격 (KDS·DEF-STAN) 적용

**SW 시험**:

- 자체 시험 capability
- 또는 IV&V 회사 위탁
- 결과 → 방사청 보고

DTAQ — 방사청과 *복합 검증*.

## 한국 채용 시장 요구

방산 SW 엔지니어 채용 (대표 자격).

**필수**:

- C/C++ 임베디드 (5+년)
- RTOS 경험 (VxWorks·FreeRTOS·자체)
- 항공·방산 SW 경험

**우대**:

- **방사청 SW 신뢰성시험** 경험
- **DO-178C** 인증 경험
- DO-160 환경시험 이해
- MISRA C·CERT C
- 영어 (FAA·NATO 협력)
- 보안 등급 (비밀취급인가)

**주요 채용사**:

- 한화에어로스페이스 (LV·항공·미사일)
- LIG넥스원 (미사일·레이더)
- KAI (KF-21·전투기)
- LSP (Lockheed Korea)
- 한국항공우주연구원 (KARI)
- 인노스페이스·페리지·UNASTELLA (민간 LV)

DO-178C + 방사청 — *우대사항 핵심*.

## 한국 SW 표준 도구

사용 도구 (방사청·KARI·산업).

**Requirements**:

- IBM DOORS — 일부
- Polarion — 도입 추세
- 자체 + Excel — 많음

**Static analysis**:

- Coverity (Synopsys)
- Polyspace (MathWorks)
- CodeSonar (Code Sonar)
- cppcheck (자체용)

**Test**:

- Vector CAST — 도입 시작
- LDRA — 검토
- 자체 framework

**Coverage**:

- Vector CAST·LDRA
- GCOV (자체)

**CM**:

- Git, SVN, Jira
- 자체 + DOORS Change

한국 — *commercial tool 도입 진행*. 자체 tool 병행.

## 한국 우주·방산 보안

**보안 분류**:

- 일반 (개방)
- 대외비 (Restricted)
- II급 비밀 (Secret)
- I급 비밀 (Top Secret)

**SW 개발자** — 비밀 SW 작업: 보안 인가 (비밀취급인가) 필요.

**환경**:

- 격리된 네트워크
- 보안 USB·HW
- 외부 인터넷 차단
- 출입 보안

**IP·소스**:

- 국가 보유
- Vendor lock-in 회피
- Open source 사용 제한 (라이선스·국가 안보 검토)

방산 SW — *보안 우선*. Cleared engineer 필수.

## 한국 표준의 진화

| 시기 | 표준 |
|---|---|
| 과거 (1990·2000년대) | 자체 표준, ISO 9001 적용 |
| 2010년대 | DO-178C 인식 시작, ISO 26262 (자동차) 영향, ECSS (우주) 일부 채택 |
| 2020년대 | 방사청 SW 신뢰성시험 *고도화*, 민간 LV 부상 (InnoSpace·Perigee), 국제 협력 증가 (NASA·ESA·일본), C++·MBD·AI 도입 |
| 미래 | DO-178D (가능성), AI·자율 SW 표준 (UL 4600·EASA AI roadmap), 한국 자체 표준 + 국제 정합 |

한국 — *국제 표준 정합* 추세.

## 자주 하는 실수

> ⚠️ 방사청 표준 = DO-178C 100% 일치 가정

"DO-178C 인증 — 방사청 자동 통과" → 구조 유사하지만 *한국 절차·산출물* 별도.

→ 각 인증 frame 별도 *적용·매핑*.

> ⚠️ 한국어 산출물 영문화 누락

국내 program → 한국어 산출물 only → 국제 수출·협력 시 *영문화 비용*.

→ 처음부터 한국어+영문 병행 권장.

> ⚠️ 보안 등급 무시

방산 SW 산출물 — 외부 cloud·git 저장 → 보안 위반.

→ 분류 + 격리 환경 작업.

> ⚠️ 민간 LV에 방사청 표준 강제

인노스페이스·페리지 — 민간 → 방사청 표준 *직접 적용 어려움* → 자체 + DO-178C-style + 비용 최적화.

→ 민간은 *agile + 실질*. 표준 *학습·참고*.

## 정리

- 방사청 SW 신뢰성시험 — *DO-178C 한국 변형*.
- **SW 등급 A·B·C·D** — DAL과 유사 매핑.
- **DTAQ·IV&V 회사** — 독립 검증.
- KARI — *KSLV-II·KOMPSAT·KPLO 다누리* SW 노하우.
- 민간 LV — *InnoSpace·Perigee·UNASTELLA* 부상.
- 채용 우대 — **방사청 + DO-178C + DO-160** 조합.
- 보안 등급 + 비밀취급인가 — 방산 필수.
- 한국 표준 — *국제 정합* 진행 중.

## 시리즈 마무리

이 시리즈 — Leanna Rierson *Developing Safety-Critical Software*의 핵심 + 한국 방산·항공우주 응용을 다루었다.

핵심 정리:

- **Chapter 1·2**: Avionics SW assurance + DO-178C 개요
- **Chapter 3**: 5 Plans — PSAC·SDP·SVP·SCMP·SQAP
- **Chapter 4**: Requirements — HLR·LLR·derived·traceability
- **Chapter 5**: Design — Architecture·ARINC-653·partitioning
- **Chapter 6**: Coding Standards — MISRA·CERT·JSF C++
- **Chapter 7**: Verification — Review·Analysis·Test
- **Chapter 8**: Coverage — Statement·Decision·MC/DC
- **Chapter 9**: Tool Qualification (DO-330)
- **Chapter 10**: Reusable Software — RSC·COTS·SOI·PDS
- **Chapter 11**: Model-Based Development (DO-331)
- **Chapter 12**: Object-Oriented (DO-332) — C++ in avionics
- **Chapter 13**: Formal Methods (DO-333)
- **Chapter 14**: Certification Artifacts — 22 deliverables
- **Chapter 15**: 방사청·KARI — 한국 응용

DO-178C는 *50년 항공 안전 진화의 결정*. 한국 방산·우주 — 이를 *학습·도입·자체화* 진행 중.

## 다음 추천 시리즈

같은 카테고리 (embedded/avionics):

1. **Digital Avionics Handbook (Spitzer) 책 리뷰** — 14 chapters. IMA·ARINC-653·sensors·actuators·FDIR. 인증보다 *기술 깊이* 우선.
2. **Launch Vehicle Flight Software** (원본) — 10 chapters (이미 완료). LV 특수성·CCSDS·cFS·F-Prime. KSLV-II 사례.

**cross-link**:

- embedded/rtos — VxWorks·INTEGRITY·Zephyr
- embedded/automotive — MISRA·AUTOSAR
- embedded/standards — MISRA·CERT·Google C++

## 관련 항목

- [Ch 14: 인증 산출물](/blog/embedded/avionics/developing-safety-critical/chapter14-certification-artifacts)
- [Ch 1: Assurance 개요](/blog/embedded/avionics/developing-safety-critical/chapter01-assurance-overview)
- [Launch Vehicle Flight SW Ch 10: KSLV-II](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter10-kslv-case-study)
- [원문 — Leanna Rierson, *Developing Safety-Critical Software: A Practical Guide for Aviation Software and DO-178C Compliance*](https://www.routledge.com/Developing-Safety-Critical-Software-A-Practical-Guide-for-Aviation-Software/Rierson/p/book/9781439813683)
