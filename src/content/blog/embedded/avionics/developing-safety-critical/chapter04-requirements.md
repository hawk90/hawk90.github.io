---
title: "Ch 4: 요구사항 — High-Level·Low-Level·Derived·Traceability"
date: 2026-05-26T04:00:00
description: "DO-178C requirements process. HLR·LLR·Derived. Traceability·DOORS·validation."
series: "Developing Safety-Critical Software"
seriesOrder: 4
tags: [avionics, do-178c, requirements, traceability]
draft: true
---

## 한 줄 요약

> **"DO-178C SW = Requirements-driven"** — HLR + LLR + traceability가 *증명의 뿌리*.

## Requirements 종류

```text
System Requirements (System SR):
  Aircraft·LV system level
  ARP-4754A에서 작성
  → SW 또는 HW로 allocation

High-Level Requirements (HLR):
  SW functional·non-functional
  "What" 정의 (Behavior)
  System requirements에서 derive

Low-Level Requirements (LLR):
  Module·unit level
  "How" 정의 (Architecture·design)
  HLR에서 derive

Derived Requirements:
  Source가 *higher level에 없는* 추가 requirement
  보통 design decision에서 발생
  → Safety assessment에 영향 review 필요
```

## HLR 작성 표준

```text
SRS (SW Requirements Standards) — Ch 3 SDP에서 정의:
  Notation: 자연어 + 수식
  Each requirement: ID·text·rationale·source
  Verifiable (testable·measurable)
  Unambiguous
  Single requirement per statement
  Numbered (HLR-001·...)

Example:
  HLR-1.1.1: 
    "The system shall display airspeed
     with accuracy ±0.5 kt within 100 ms
     of receiving the air data input."
  Source: SR-1.2.3
  Rationale: Pilot situational awareness
  Verification: Test·Analysis·Review
```

## Requirements Quality Attributes

```text
Verifiable:
  Test·analysis로 확인 가능
  "shall display" — yes
  "shall provide good response" — vague

Unambiguous:
  "Within 100 ms" — clear
  "Quick response" — interpretable

Complete:
  All conditions covered
  Edge case 명시

Consistent:
  Other req와 충돌 X

Modifiable:
  Single change point per change

Traceable:
  Source·destination link
```

각 req — *5+ attribute* 통과.

## Derived Requirements 처리

```text
Source가 안 보임 → Derived
  Example: "Buffer size shall be 4096 byte"
  System level에 없는 implementation choice

DO-178C 요구:
  - Identified as derived
  - Safety assessment에 reflect
  - System safety team에 *제출* + *review*
  - 영향 평가
```

Derived 너무 많음 → *system req 분석 부족 신호*.

## Traceability

```text
Trace types:
  System req → HLR
  HLR → LLR
  LLR → Source code
  Source code → Test
  HLR → Verification activity
  LLR → Verification activity

Bidirectional:
  Forward: req → impl
  Backward: impl → req

Coverage:
  All req → impl + test
  No orphan code (req 없는 코드)
```

매 변경 — *traceability matrix update*.

## DOORS·Polarion·Jama

```text
Requirements Tools:
  IBM DOORS·DOORS Next (가장 인기)
  Polarion (Siemens·자동차)
  Jama Connect
  Visure
  Cradle·Aligned

Features:
  Requirement DB·versioning
  Traceability matrix
  Change impact analysis
  Baseline·report
  Export·import

Korea:
  방사청·KARI — DOORS 표준
  일부 internal tool
```

DOORS — *수십만 달러 license*. 대형 project 표준.

## Requirements-Based Testing

```text
Test 종류:
  Requirements-based test:
    각 HLR·LLR → test case
    100% HLR·LLR coverage
    Normal range + robustness
    
  Structural coverage test:
    Source code coverage (8장)
    
DO-178C Test categories:
  - Hardware/software integration
  - Software integration
  - Low-level
```

각 req — *최소 한 test case*. Robustness test로 *경계·error 검증*.

## Bidirectional Trace Matrix

```text
                Forward                Backward
System Req      → HLR (1+)              ← HLR
HLR             → LLR (1+)              ← LLR
LLR             → Code (line)           ← Code
HLR             → Test (1+)             ← Test
LLR             → Test (1+)             ← Test
Derived         → System assess          ← assess

Matrix output:
  Each row = artifact
  Each column = trace direction
  Cell = trace link
```

Cell *비어 있음* → *orphan 또는 missing trace*.

## Reviews

```text
HLR Review checklist:
  [ ] Verifiable
  [ ] Unambiguous  
  [ ] Complete
  [ ] Consistent
  [ ] Traceable to system req
  [ ] Identifies derived
  [ ] Allocations·constraints

LLR Review:
  [ ] Trace to HLR
  [ ] Architecture·design 일치
  [ ] Code 구현 가능
  [ ] Verifiable

Code Review:
  [ ] Coding standard 준수
  [ ] Trace to LLR
  [ ] No dead code
```

각 review — *signed off* + *records*.

## Requirements Validation

```text
Validation:
  "Right requirements" 확인
  Stakeholder·system engineering review
  
Verification:
  "Requirements met" 확인
  Test·analysis·review

Validation methods:
  - Inspection
  - Walkthrough
  - Prototype
  - Simulation
  - Analysis
```

Req 자체가 *틀린* 경우 — design·code 옳아도 *system 실패*.

## Requirements Change Management

```text
Change request (CR):
  Originator·date·description
  Affected requirements·artifacts
  Impact assessment
  
Change control board (CCB):
  Approves·rejects
  Documents rationale

Implementation:
  Update req
  Re-trace
  Re-verify affected artifacts
  Update test
```

매 CR — *full lifecycle re-execution* (affected portion).

## Korean 적용 — 방사청

```text
방사청 SW 신뢰성시험:
  요구사항 추적성 — DO-178C 동일
  DOORS·자체 tool 사용
  
KARI:
  Internal requirement DB
  Excel·DOORS 혼용
  Mission별 baseline
```

## 자주 하는 실수

> ⚠️ Vague requirement

```text
"System shall be fast" — 비검증
```

→ 정량 + verifiable.

> ⚠️ Compound requirement

```text
"shall do A and B and C" → fail one = whole fail
```

→ 분리.

> ⚠️ Trace 누락

```text
LLR 없는 HLR, code 없는 LLR → orphan
```

→ 매 변경 trace update.

> ⚠️ Derived 모음

```text
50% derived → system analysis 부족
```

→ system level에서 명시.

## 정리

- DO-178C = **HLR + LLR + Derived + Trace**.
- Requirements = **verifiable·unambiguous·complete·consistent·modifiable·traceable**.
- DOORS·Polarion — *대형 project 표준*.
- Bidirectional trace matrix — *coverage·orphan 검출*.
- Reviews·CCB — *change discipline*.

다음 편은 **Design**.

## 관련 항목

- [Ch 3: Plans](/blog/embedded/avionics/developing-safety-critical/chapter03-plans)
- [Ch 5: Design](/blog/embedded/avionics/developing-safety-critical/chapter05-design)
