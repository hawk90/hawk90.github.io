---
title: "Ch 1: 항공우주 SW Assurance 개요 — DO-178C·NASA·방사청"
date: 2026-05-18T01:00:00
description: "SW assurance vs testing. 영역별 표준 — civil avionics·defense·space·Korea."
series: "Developing Safety-Critical Software"
seriesOrder: 1
tags: [avionics, do-178c, assurance, safety-critical]
draft: true
---

## 한 줄 요약

> **"SW Assurance = 과정·증거 + 결과"** — testing만으로 부족, *life-cycle 전체* 증명.

## 왜 Assurance인가

```text
항공·우주 SW 실패:
  - 인명 손실 (B737 MAX MCAS 2018-2019, 346명)
  - 재산 손실 (Ariane 5 1996, $370M)
  - Mission 손실 (Mars Climate Orbiter 1999)
  - 신뢰 손실 (long-term industry impact)
  
일반 SW vs safety-critical:
  - 일반: bug → patch
  - safety: bug → catastrophic
  - 한 번 실패 = 전체 fleet ground
```

> Bjarne Stroustrup: "프로그램 정확성은 *증명* — testing만으로 보장 안 됨."

## Assurance vs Testing

```text
Testing:
  - 동작 확인
  - 일부 경로 실행
  - "Bug가 *있다*" 발견
  - 100% 정확성 증명 X

Assurance:
  - Process + 문서 + 검증
  - 모든 요구사항 추적
  - "Bug가 *없다고 믿을 근거*" 제공
  - Certification authority 만족
```

→ Assurance는 *life-cycle 전체 과정*. Testing은 *그 중 한 부분*.

## 영역별 표준

| 도메인 | 표준 | 적용 |
|---|---|---|
| **Civil Avionics** | DO-178C, DO-254, DO-160G, ARP-4754A·4761 | B787·A350·E-jet |
| **Defense** | MIL-STD-498, MIL-HDBK-516, DO-178C 채택 | F-35·F-22·UAS |
| **Space — NASA** | NPR 7150.2·NPR 7123.1 | Artemis·SLS·Mars |
| **Space — ESA** | ECSS-E-ST-40C, ECSS-Q-ST-80C | Sentinel·Galileo |
| **Korea Defense** | 방사청 무기체계 SW 신뢰성시험 가이드 | KF-21·천궁·정찰위성 |
| **Korea Space** | KARI SW 개발 가이드 | KSLV-II·KOMPSAT |
| **Medical** | IEC 62304 | Pacemaker·Insulin pump |
| **Automotive** | ISO 26262 (ASIL A-D) | BMW·Mercedes·현대 |
| **Industrial** | IEC 61508 (SIL 1-4) | PLC·robotics |

## DO-178C — 민항 표준

```text
DO-178C (RTCA·2011 update):
  "Software Considerations in Airborne Systems
   and Equipment Certification"
  
Levels (severity of failure):
  A — Catastrophic   (lives lost)
  B — Hazardous      (serious injury)
  C — Major          (significant)
  D — Minor          (some inconvenience)
  E — No effect      (no consequence)
  
DAL (Design Assurance Level)이 *증명 부담* 결정:
  Level A — 71 objectives, 30 with independence
  Level B — 69 objectives, 18 with independence
  Level C — 62 objectives, 5 with independence
  Level D — 26 objectives
  Level E — 1 objective
```

LV·항공기 — 보통 Level A 또는 B.

## DO-178C Supplements

```text
DO-330: Tool Qualification
DO-331: Model-Based Development (Simulink·SCADE)
DO-332: Object-Oriented (C++·Ada)
DO-333: Formal Methods
DO-178C 본문 + 4개 supplement.
```

## NASA NPR 7150.2

```text
NASA Procedural Requirements 7150.2:
  Software Engineering Requirements
  
SW Class:
  A — flight safety critical
  B — primary mission critical
  C — secondary mission
  D — research·analysis
  E — test·prototype
  F — general purpose
  G — public release
  H — open source contribution
  
각 class별 *required activities + work products*
```

DO-178C와 *유사하나 더 light* (less prescriptive).

## ECSS — ESA 표준

```text
European Cooperation for Space Standardization:
  ECSS-E-ST-40C  Software engineering
  ECSS-Q-ST-80C  Software product assurance
  ECSS-Q-ST-30C  Dependability
  
Criticality category:
  A — catastrophic (life·mission loss)
  B — critical
  C — major
  D — minor·negligible
  
ESA mission — 표준 적용
```

## 방사청 SW 신뢰성시험

```text
대한민국 방사청 (DAPA):
  무기체계 SW 신뢰성시험 가이드
  
대상:
  국방 무기체계 SW
  - 미사일 (천궁·해성)
  - 전투기 SW (KF-21)
  - 정찰·통신 위성
  - 잠수함·지상장비
  
요구사항:
  요구사항 traceability
  코드 표준 (MISRA C·CERT)
  Unit·integration·system test
  Static analysis (Coverity·Klocwork)
  Coverage measurement
  Documentation
  IV&V
```

DO-178C 영향 받음. 한국 *고유 process + 일부 DO-178C 차용*.

## KARI SW 개발 가이드

```text
KARI Internal:
  Satellite SW process
  LV SW process
  
적용:
  KOMPSAT 시리즈 (다목적실용위성)
  KSLV-II 누리
  GEO-KOMPSAT (천리안)
  
방법론:
  V-model 또는 modified Waterfall
  Requirements → Design → Code → Test → Acceptance
  DO-178C 영향 (intermediate level)
```

KARI 내부 — *NDA 보호*. 공개 자료 한정.

## ARP-4754A·4761 — System-Level

```text
ARP-4754A (System Development):
  Aircraft system architecture
  Functional hazard assessment
  Allocation to HW·SW
  
ARP-4761 (Safety Assessment):
  PSSA (Preliminary System Safety)
  SSA (System Safety)
  FTA (Fault Tree Analysis)
  FMEA (Failure Mode & Effects)
  
DO-178C는 ARP-4754A의 *결과물*로 시작
```

System → SW assurance level 할당.

## Process Models

```text
V-Model (전형적):
  Requirements ← System Test
  Architecture ← Integration Test
  Detailed Design ← Unit Test
  Code

Modified Waterfall:
  Phased gates
  Each phase has *exit criteria*
  
Agile/Iterative:
  DO-178C 호환 가능 (Scaled Agile + DO-178C)
  Iterations within bounded structure
```

Modern — *DO-178C friendly Agile* 등장.

## SW Life-Cycle 5 Phases

```text
1. Planning
   PSAC·SDP·SVP·SCMP·SQAP (5 plans)
   
2. Development
   Requirements (high·low level)
   Architecture·Design
   Coding
   Integration
   
3. Verification
   Reviews·Analyses·Tests
   Coverage
   Traceability
   
4. Configuration Management
   Versioning·Change control
   Problem reports
   
5. Quality Assurance
   Audit
   Independence
   Records
```

5 phase — *Rierson book 전체 구조*.

## Data Items — 12개

```text
Required SW data items:
  1. PSAC (Plan for SW Aspects of Certification)
  2. SDP (SW Development Plan)
  3. SVP (SW Verification Plan)
  4. SCMP (SW Configuration Management Plan)
  5. SQAP (SW Quality Assurance Plan)
  6. SW Requirements Standards
  7. SW Design Standards
  8. SW Code Standards
  9. SW Requirements Data
  10. Design Description
  11. SW Verification Cases·Procedures
  12. SW Verification Results
  + Final Reports·Records
```

각 *data item* — 인증 audit 대상.

## Independence — 5 Objectives at Level A

```text
DO-178C Level A — 30 objectives with independence:
  - SW Plans 작성자 ≠ reviewer
  - Verification 작성자 ≠ SW author
  - Tool 사용자 ≠ tool qualifier
  
Reason:
  Self-review bias 방지
  외부 시각 강제
```

Project structure → *별도 IV&V team 필요*.

## Tool Qualification

```text
DO-330 Tool Qualification Levels (TQL):
  TQL-1 (highest) — tool 결과가 *verification activity 대체*
  TQL-2 — 일부 대체
  TQL-3 — verification 보조
  TQL-4 — automated tool 검증
  TQL-5 — development tool (Level A·B 영향)
  
예:
  Compiler (gcc·llvm)            TQL-5
  Coverage tool (Cantata)        TQL-1 to 3
  Static analyzer (Coverity)     TQL-2 to 4
  Auto-code generator (Simulink) TQL-1
```

도구 자체 qualify — *수개월·수십만 달러*.

## Korean Adaptation

```text
방사청 가이드 — DO-178C 영향:
  - 5 plans (PSAC equivalent)
  - Requirements traceability
  - Static analysis (보통 LDRA·Coverity)
  - Coverage (Cantata 흔함)
  - MISRA C·CERT C 표준
  - 한국어·영문 문서 양쪽

KARI guide — 위와 유사:
  KSLV·KOMPSAT mission 위주
  In-house tool 일부
  DO-178C principle 적용
```

방산·우주 SW engineer — *DO-178C 이해 + 한국 표준 적용*.

## 채용 우대 — 명시 사례

```text
방사청 산하 KAI·LIG넥스원·풍산:
  "DO-178C 또는 동등 표준 SW 개발 경험"
  "AUTOSAR·MISRA·CERT C 준수"

KARI·한화에어로스페이스 (LV·위성):
  "임베디드 RTOS·인증 SW 경력"
  "방사청 SW 신뢰성시험 또는 DO-178C 경력 우대"
```

이 시리즈 학습 = *직접적 채용 자격 강화*.

## Rierson Book — 책 소개

```text
"Developing Safety-Critical Software:
 A Practical Guide for Aviation Software
 and DO-178C Compliance"
 
저자: Leanna Rierson (FAA 출신)
출판: CRC Press 2013
600+ pages, 21 chapters
가격: 대략 $100-150

가치:
  DO-178C 표준 *유일한 deep book*
  Practical guide — checklist·example
  FAA·EASA inspector 시각
  
한국 적용:
  방사청 가이드와 80%+ overlap
  KARI 가이드와도 호환
  → 한국 우주·방산 채용 *직결*
```

이 시리즈 — *Rierson 책 14 chapter + Korea-specific chapter 1개*.

## 자주 하는 실수

> ⚠️ "Assurance = Testing만"

```text
Test pass → done 가정
→ 추적성·process·문서 누락
→ certification fail
```

→ life-cycle 전체.

> ⚠️ Tool 신뢰

```text
"Coverity가 OK이라 했음"
→ Tool 자체 qualification 안 했으면 — 증거 부족
```

→ DO-330 tool qualification.

> ⚠️ DO-178C·NPR·ECSS 혼동

```text
각 표준 *세부 다름*. 
프로젝트별 *적용 표준 명확*히.
```

→ 시작 단계에 *target standard* 결정.

> ⚠️ Korea standard 무시

```text
KARI·방사청 standard 별도 study 필요
DO-178C 만으로 부족
```

→ Korea-specific chapter (Ch 15).

## 정리

- SW Assurance = **life-cycle 전체 + 증거 + 문서**.
- Testing만으로 부족 — *추적성·process·tool*.
- 표준 — **DO-178C** (civil·defense), **NPR 7150.2** (NASA), **ECSS** (ESA), **방사청·KARI** (Korea).
- **DAL/Class** — failure severity → 증명 부담.
- 12 data items + 5 plans = 인증 산출물.
- **Tool qualification (DO-330)** 별도 process.
- 한국 LV·방산 채용 — *DO-178C + 방사청 표준 둘 다*.

다음 편은 **DO-178C 개요**.

## 관련 항목

- [Ch 2: DO-178C Overview](/blog/embedded/avionics/developing-safety-critical/chapter02-do-178c-overview)
- [LV Ch 1: LV vs Aircraft](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter01-lv-vs-aircraft)
