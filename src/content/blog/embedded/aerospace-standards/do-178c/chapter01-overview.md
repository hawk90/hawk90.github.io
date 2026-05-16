---
title: "Ch 1: DO-178C란 무엇이고 왜 항공 SW의 표준이 됐는가"
date: 2025-09-25T02:00:00
description: "RTCA DO-178C / EUROCAE ED-12C — 모든 항공 SW 인증의 모표준. 역사, 구조, ISO 26262와의 비교, 국내 적용 (KAI, Korean Air, KARI)."
tags: [do-178c, ed-12c, rtca, eurocae, airworthiness, faa, easa, kai, certification]
series: "DO-178C"
seriesOrder: 1
draft: false
---

**DO-178C** (RTCA DO-178C, 유럽 동일 EUROCAE ED-12C)는 *항공 SW 인증의 모표준*이다. 모든 *민간 항공기*에 탑재되는 SW는 *FAA, EASA, 국내 KAA*가 *DO-178C 준수*를 요구한다. 2011년 발행된 *C 버전*이 현행. 그 전 B 버전(1992)이 *20년간 표준*이었다.

자동차의 *ISO 26262*에 해당. *항공 SW의 ISO 26262 + MISRA C + Tool Qualification* 모두 *한 문서에 통합*돼 있다.

## 출처와 위상

```
Full name : RTCA DO-178C — Software Considerations in Airborne Systems and Equipment Certification
Issued    : 2011-12-13
ICAO 인정 : ICAO Annex 8 (Airworthiness)을 통한 국제 표준
유럽 동일 : EUROCAE ED-12C (같은 내용)
페이지   : 145
가격     : RTCA에서 약 $200, EUROCAE 비슷
```

**RTCA**(Radio Technical Commission for Aeronautics)는 미국 정부의 *항공 자문 조직*. FAA가 *공식 사용*. **EUROCAE**(European Organisation for Civil Aviation Equipment)는 유럽 EASA가 사용. 두 문서는 *동일 내용*.

## 적용 — 어디에 쓰는가

```
민간 여객기 (Boeing 787, Airbus A350, COMAC C919)
민간 화물기 (Boeing 747F, Airbus A330F)
지역 항공기 (Embraer E-Jet, Bombardier CRJ)
비즈니스 제트 (Gulfstream, Cessna Citation, Bombardier Global)
헬기 (AW139, EC135, Bell 525)
무인기 (Predator, MQ-9, 일부 민간 UAV)
항공 부품 (engine FADEC, autopilot, FMS, EICAS, FBW)
지상 ATC SW (관제 시스템)
```

군용기는 *DO-178C 직접 적용 아니지만 비슷한 기준*. 미군은 *MIL-STD-498*, NATO는 *AQAP*, 한국 방산은 *국방규격* + DO-178C 변형.

## 국내 적용

| 회사·기관 | 적용 사례 |
|----------|----------|
| **KAI** | T-50/FA-50 (수출용), KUH-1 Surion (마린온), KF-21 Boramae, LAH/LCH |
| **Korean Air Aerospace Division** | A380/B747 정비 시 SW 변경, B737 MAX MRO |
| **KARI** | KAI와 협력 — 무인기 SW, 위성 통신 |
| **LIG Nex1** | 항공 통신·navigation SW, 미사일 유도 (관련 표준 변형) |
| **Hanwha Aerospace** | 엔진 FADEC (Rolls-Royce 협력), 위성 |
| **AP Systems** | 항공 부품 SW |

특히 *수출용 무기·항공기*는 *DO-178C 인증 필수*. *국제 시장 진입 비용*이다.

## ISO 26262 vs DO-178C — 비교

| | DO-178C (항공) | ISO 26262 (자동차) |
|---|---------------|--------------------|
| 등급 | DAL A~E (5단계) | ASIL D~A + QM (5단계) |
| 인증 주체 | FAA, EASA, ... | TÜV, UL, ... |
| 코딩 표준 명시 | 없음 (자체 정의) | 없음 (자체 정의, MISRA 권장) |
| Tool Qualification | DO-330 별도 표준 | Part 8 안에 통합 |
| Formal Methods | DO-333 supplement | Part 6 권장 |
| 보안 | DO-326A supplement | Part 6 일부 |
| MC/DC 요구 | DAL A 필수 | ASIL D 필수 |
| 발행 | 2011 | 2018 (2판) |

두 표준이 *상호 영향*. ISO 26262가 *후발*이지만 *MC/DC, formal methods, security supplement*를 *DO-178C에서 학습*.

## DO-178B → DO-178C 차이

```
DO-178B (1992)         DO-178C (2011)
─────────────         ────────────────
주 문서만               + 4개 Supplement
                       - DO-330 Tool Qualification
                       - DO-331 Model-Based Development
                       - DO-332 Object-Oriented Technology
                       - DO-333 Formal Methods
```

B 버전이 *20년간* 사용되어 *Boeing 787, Airbus A380이 B로 인증*. C가 *더 명확*하지만 *기본 정신은 동일*.

## DAL (Design Assurance Level) — 5단계

위험도에 따라 *5단계*. 등급별로 *요구 objectives 수*가 다르다.

| Level | Failure Effect | Effect Severity | Objectives |
|-------|---------------|-----------------|-----------|
| **A** | Catastrophic | 인명 손실 가능 | 71 |
| **B** | Hazardous/Severe | 심각한 부상 | 69 |
| **C** | Major | 가벼운 부상, 불편 | 62 |
| **D** | Minor | 운영 capacity 약간 감소 | 26 |
| **E** | No Effect | 영향 없음 | 0 (DO-178C 면제) |

### Level A 예 — FBW (Fly-by-wire)

Airbus 320/330/340/380, A350의 *비행 제어*. Failure 시 *항공기 통제 상실*. 인명 손실 가능 → *DAL A 필수*.

```
요구사항 :  71개 objective 모두 충족
MC/DC    :  100% (Modified Condition/Decision Coverage)
Tool     :  TQL-1 (가장 엄격 qualification)
검증     :  독립 verification 팀
재정     :  코드 1라인당 *$100~1000* 인증 비용
```

### Level B 예 — Autopilot

자동조종 시스템. Failure 시 *조종사 즉시 인계 가능*하지만 *작업 부담 증가*. *DAL B*.

### Level C 예 — FMS (Flight Management System)

비행 경로 관리. Failure 시 *대안 navigation 사용 가능*. *Major* 영향. *DAL C*.

### Level D 예 — IFE (In-flight Entertainment)

승객 entertainment. Failure 시 *불편하지만 안전 영향 없음*. *DAL D*.

### Level E 예 — Maintenance log

승무원 maintenance 로깅. *영향 없음*. *DO-178C 면제*.

## 71개 Objectives — 구조

DAL A는 *71개 objective*를 모두 충족. 5개 그룹.

```
Group 1: Software Planning Process              7 obj
Group 2: Software Development Processes        15 obj
   - Requirements
   - Design
   - Code
   - Integration
Group 3: Verification Process                  39 obj
   - Verification of Requirements
   - Verification of Design
   - Verification of Code
   - Integration Test
   - Coverage Analysis
Group 4: Software Configuration Management      6 obj
Group 5: Software Quality Assurance             4 obj
```

각 objective는 *Output 형식*과 *control category*가 정해져 있다. 예:

```
Objective 5.1.1
Description: "Software requirements comply with system requirements."
Output:      Software Requirements Data (SRD)
Control:     CC1 (configuration management with traceability)
Independence (DAL A): Yes (개발자와 다른 사람이 verify)
```

## 핵심 산출물 — Lifecycle Data

DO-178C는 *모든 산출물*을 정의:

```
Planning
  - PSAC (Plan for Software Aspects of Certification)
  - SDP (Software Development Plan)
  - SVP (Software Verification Plan)
  - SCMP (Software Configuration Management Plan)
  - SQAP (Software Quality Assurance Plan)

Standards
  - Software Requirements Standards (SRS)
  - Software Design Standards (SDS)
  - Software Code Standards (SCS) ← 여기 MISRA 적용
  - Software Tool Qualification Plan

Development
  - SRD (Software Requirements Data)
  - SDD (Software Design Description)
  - Source Code
  - Executable Object Code

Verification
  - SVCP (Software Verification Cases and Procedures)
  - SVR (Software Verification Results)
  - Coverage Analysis Reports

Other
  - SCI (Software Configuration Index)
  - SECI (Software Environment Configuration Index)
  - SAS (Software Accomplishment Summary) ← 심사용
  - PDS (Problem Discovery Reports)
```

심사 시 *모든 문서 제출*. *수천 페이지*. 작은 시스템도 *1000+ 페이지*, 큰 시스템(Boeing 787 FBW)은 *수만 페이지*.

## 코딩 표준 — 자체 정의

DO-178C는 *특정 코딩 표준을 명시하지 않는다*. *프로젝트가 자체 SCS (Software Code Standards) 문서로 정의*.

실전:

```
대부분 SCS = MISRA C:2012 + 프로젝트 추가 규칙
일부 SCS  = JSF C++ 변형 (F-35 영향)
일부 SCS  = JPL Power of 10 + MISRA 결합
일부 SCS  = 회사 자체 (Boeing FSW, Airbus AFS 등)
```

심사관(FAA Designated Engineering Representative)이 *SCS 문서*를 보고 *충분한가* 판단. *MISRA C 적용*이 *가장 흔한 통과 경로*.

## MC/DC — Modified Condition/Decision Coverage

DAL A의 *결정적 요구사항*. *각 조건이 결과에 독립적으로 영향*을 미치는지 *모두 검증*.

```c
// 코드
if (a && (b || c)) {
    /* ... */
}
```

조건 셋(a, b, c)이 결과에 영향을 미치는 *case*를 모두 테스트.

```
Test  a  b  c  Result  영향
─────────────────────
T1    T  T  T   T      a=T → T;   a=F → F  (a의 영향)
T2    T  T  F   T      b=T → T;   b=F → ?  (b의 영향: F=T)
T3    T  F  T   T      c=T → T;   c=F → F  (c의 영향)
T4    T  F  F   F      (combined)
T5    F  T  T   F      a=F → F                  (위와 짝)
```

각 조건이 *독립적으로 결과를 바꾸는 case* 최소 1쌍.

수학적으로 *n 조건에 n+1 test case 최소*. *Statement coverage*나 *Branch coverage*보다 *훨씬 엄격*.

### MC/DC 검증 도구

```
LDRA Testbed         : DO-178C 가장 광범위 사용
VectorCAST           : LSS Coverage 도구
RTRT (IBM Rational)  : 일부 OEM
Cantata              : 가벼운 검증
```

## Tool Qualification (DO-330)

도구가 *실수*해 *잘못된 결과*를 내면 *항공기에 직접 영향*. 따라서 *모든 도구의 자격* 요구.

```
Tool Use Class:
  TQL-1 (DAL A에 used): 도구 검출 부재가 직접 catastrophic
  TQL-2-3 (DAL B/C):  중간
  TQL-4-5 (DAL D):    낮음

도구 종류:
  Verification Tool (정적 분석, 테스트):  Qualification 필요
  Development Tool (컴파일러, 코드 생성기): 더 엄격
  Configuration Tool (build):              간단한 qualification
```

GCC도 *FAA-qualified GCC*가 별도로 제공 (수만 달러). 일반 GCC를 *그대로 못 쓴다*.

## 인증 절차 — Outline

```
1. Plan
   - PSAC 작성 → FAA/EASA에 제출
   - 5개 plan + 3개 standard

2. Development
   - Requirements → Design → Code → Integration
   - 모든 단계에 traceability
   - 모든 산출물 review

3. Verification
   - Each level의 verification
   - Test (단위 + 통합 + 시스템)
   - Coverage analysis (statement + decision + MC/DC for DAL A)

4. Stage of Involvement (SOI)
   - SOI 1: Planning Review (FAA가 plan 검토)
   - SOI 2: Development Review
   - SOI 3: Verification Review
   - SOI 4: Final Certification Review

5. SAS Submission
   - Software Accomplishment Summary
   - FAA Approval

6. Type Certificate
   - 항공기 type 인증의 일부

Duration:
  Small system, DAL C   : 1~2 year
  Medium system, DAL B  : 2~4 year
  Large system, DAL A   : 5~10+ year (Boeing 787 FBW: 8 year)
```

## 비용 — Per Line of Code

```
DAL A : $50~200 per line       (Boeing 787 FBW: ~$150)
DAL B : $30~80
DAL C : $20~50
DAL D : $5~20
```

50만 줄짜리 DAL A 시스템 = *수천만 달러* 인증 비용. *항공 SW가 비싼 이유*.

## DO-178C Supplements

```
DO-330 — Software Tool Qualification Considerations
  도구 qualification 방법, TQL, validation

DO-331 — Model-Based Development and Verification
  Simulink, SCADE 등의 사용

DO-332 — Object-Oriented Technology and Related Techniques
  C++, Java 사용
  - Class, inheritance, polymorphism의 검증
  - Memory dynamic allocation 정책
  - Templates, exceptions, virtual functions

DO-333 — Formal Methods Supplement
  - Mathematical proof 기반 검증
  - SPARK Ada, Frama-C, ACSL, Coq, Isabelle
  - 일부 verification objective를 *formal proof*로 충족 가능

DO-326A — Airworthiness Security Process Specification (2014)
  보안 위협 모델링 (security counterpart of DO-178C)

DO-356A — Methods and Considerations for the Establishment of Security
  DO-326A의 방법론
```

각 supplement는 *DO-178C 위에 추가 요구*. 사용 시 *명시*.

## 국내 인증 절차

```
한국항공우주산업(KAI) T-50 수출 (인도네시아, 폴란드, 이라크 등):
  - FAA STC (Supplemental Type Certificate) 또는
  - 수입국 자체 인증 + FAA 인증서 참조

Korean Air B737 정비 SW 변경:
  - FAA Major Repair/Alteration approval
  - DO-178C 표시 (소규모 변경)

KARI 무인기 / KF-21 시제:
  - 국방규격 (KDS, KMS)
  - 비공식적 DO-178C 변형 적용
  - 수출 시 FAA·EASA 인증 별도
```

국내 *FAA Designated Engineering Representative* (DER)은 *십수 명* 수준. 인증 자원 부족이 *수출 SW 인증 병목*.

## 시리즈 로드맵

이 시리즈는 *DO-178C 전체 12장*에 걸쳐 다음 순서로 정리:

1. **Ch 1 (지금)** — DO-178C 개요·국내 적용
2. **Ch 2** — DAL 등급과 71 Objectives 상세
3. **Ch 3** — Planning 단계 (PSAC, SDP, SVP, SCMP, SQAP)
4. **Ch 4** — Software Requirements (HLR — High-Level Requirements)
5. **Ch 5** — Software Design (LLR — Low-Level Requirements + Architecture)
6. **Ch 6** — Source Code Standards 및 MISRA 적용
7. **Ch 7** — Integration·Build·Executable Object Code 검증
8. **Ch 8** — Verification — Review, Analysis, Test
9. **Ch 9** — Coverage Analysis (Statement, Decision, MC/DC)
10. **Ch 10** — Configuration Management & SQA
11. **Ch 11** — Tool Qualification (DO-330)
12. **Ch 12** — Formal Methods (DO-333) 및 보안 (DO-326A)

## 정리

- DO-178C는 *항공 SW 인증의 모표준*. FAA·EASA·국내 KAA가 사용.
- DAL A~E 5단계. *Catastrophic*은 DAL A, *No Effect*는 DAL E.
- *71 objectives* (DAL A 기준). 각 objective의 *output, control, independence* 정의.
- *코딩 표준은 자체 정의*. 대부분 *MISRA C + 추가*.
- DAL A 필수 — *MC/DC 100%*. Tool Qualification (DO-330) TQL-1.
- Supplement: DO-330 (도구), DO-331 (모델), DO-332 (OO), DO-333 (formal), DO-326A (보안).
- 국내 적용: KAI (T-50/KF-21), Korean Air, KARI. *수출 인증의 필수 조건*.
- 인증 비용: *코드 1라인당 $50~200* (DAL A).

## 다음 장 예고

2장은 *DAL 등급과 71 Objectives*. 각 objective의 의미·output·independence 요구.

## 관련 항목

- [MISRA C Ch 1 — MISRA란](/blog/embedded/car-standards/misra-c/chapter01-introduction)
- [JSF C++ Ch 1 — F-35 코딩 표준](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [RTCA DO-178C](https://www.rtca.org/training/do-178c-software-considerations-in-airborne-systems-and-equipment-certification/)
- [FAA AC 20-115D — DO-178C Acceptance](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/1029487)
