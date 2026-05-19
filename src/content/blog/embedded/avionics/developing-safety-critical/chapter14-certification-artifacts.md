---
title: "Ch 14: 인증 산출물"
date: 2026-05-26T14:00:00
description: "DO-178C — 5 plans + 5 standards + 12 data items의 전체 산출물 카탈로그."
series: "Developing Safety-Critical Software"
seriesOrder: 14
tags: [avionics, do-178c, certification, artifacts]
draft: true
---

## 한 줄 요약

> **"5 plans + 5 standards + 12 data items"** — 전체 산출물 카탈로그.

## DO-178C 산출물 전체 — 22개

```text
5 Plans:
  PSAC (Plan for SW Aspects of Certification)
  SDP  (SW Development Plan)
  SVP  (SW Verification Plan)
  SCMP (SW Configuration Management Plan)
  SQAP (SW Quality Assurance Plan)

5 Standards:
  SRS  (SW Requirements Standards)
  SDS  (SW Design Standards)
  SCS  (SW Code Standards)
  + DO-331 Model Standards (MBD 시)
  + DO-332 OO Standards (OO 시)

12 Data Items:
  HLR  (High-Level Requirements)
  LLR  (Low-Level Requirements)
  SDD  (Software Design Description)
  SC   (Source Code)
  TC   (Test Cases)
  TP   (Test Procedures)
  TR   (Test Results)
  SCI  (SW Configuration Index)
  SECI (SW Environment Configuration Index)
  SAS  (SW Accomplishment Summary)
  SoC  (Software of Compliance)
  PSL  (Problem·Status·Logs)
```

22 산출물 — 전체 인증 evidence.

## 5 Plans 정리 (Ch 3 보완)

```text
PSAC — FAA·EASA 제출 (외부)
  Project overview, lifecycle, DAL, schedule
  
SDP — 개발 process (내부)
  Phases, transitions, deliverables
  
SVP — verification (내부)
  Reviews·analyses·test methods
  
SCMP — configuration (내부)
  Versioning, baseline, CCB
  
SQAP — QA (내부)
  Audits, independence, records
  
모두 *living document* — project 동안 update
```

5 plans — *project 시작점*. Ch 3 자세히.

## 5 Standards 정리

```text
SRS (Requirements Standards):
  Notation, format, naming, traceability format
  Verifiability criteria

SDS (Design Standards):
  Architecture notation, module structure
  Interface definition

SCS (Code Standards):
  Language subset (MISRA·CERT·JSF C++)
  Naming, error handling

DO-331 Model Standards (MBD 시):
  Model notation, simulation, code gen config

DO-332 OO Standards (OO 시):
  OO subset, inheritance limit, exception policy
```

Standards = *concrete rules*. Engineers daily reference.

## 12 Data Items 상세

```text
HLR (High-Level Requirements):
  System requirement에서 derive
  External behavior 명시
  형식 — DOORS, table, document

LLR (Low-Level Requirements):
  HLR refinement
  Implementation 직전
  Pseudo-code, formula 가능
  Algorithm spec

SDD (Software Design Description):
  Architecture
  Module structure
  Interfaces
  Data·control flow

SC (Source Code):
  Implementation
  Comments per SCS
  Traceability to LLR

TC (Test Cases):
  Each HLR·LLR test 1+
  Input·expected output
  Pre·post condition

TP (Test Procedures):
  Test execution step
  Setup·teardown
  Environment

TR (Test Results):
  Pass·fail
  Coverage achieved
  Anomaly

SCI (SW Configuration Index):
  Each SW item 정의
  Version·baseline
  Deliverable list

SECI (SW Environment Config Index):
  Tool list with version·qualification
  OS·hardware environment

SAS (SW Accomplishment Summary):
  Final summary — FAA·EASA 제출
  All evidence reference
  Compliance to PSAC

SoC (Statement of Compliance):
  Vendor·third-party SW declaration
  Reusable SW evidence

PSL (Problem Reports·Status·Logs):
  Defect tracking
  Change history
  Re-verification record
```

각 *deliverable + signoff*.

## SCI vs SECI

```text
SCI (Configuration Index):
  *Product* configuration
  Source code, binary, data file
  Each item version

  Example entries:
    altitude_filter.c v3.2.1
    altitude_filter.h v3.2.0
    control_law.c v2.1.5
    main.c v4.0.1

SECI (Environment Configuration Index):
  *Tool·Environment* configuration
  Build tool, OS, hardware
  Each tool version

  Example entries:
    GCC ARM Embedded 11.3.0
    Polyspace R2024a (TQL-4 qualified)
    VectorCAST 2024 SP1
    Ubuntu 22.04 LTS
    Build server: HP ProLiant DL380
```

SCI·SECI 차이 — *product 자체* vs *환경·도구*.

## Trace Matrix — Master Artifact

```text
Trace matrix (DO-178C 권장):

System Req ←→ HLR ←→ LLR ←→ SC ←→ TC ←→ TR

각 link 양방향 가능

도구:
  - IBM DOORS (de facto)
  - Polarion
  - Jama Connect
  - 자체 Excel·DB

Trace metrics:
  HLR coverage  - 모든 HLR이 LLR 가짐?
  LLR coverage  - 모든 LLR이 SC 가짐?
  Test coverage - 모든 LLR이 TC 가짐?
  Reverse trace - 모든 SC가 LLR derived?
```

Trace missing — *audit 직접 fail*. 모든 SW item 양방향.

## Document Versioning

```text
Each artifact — version·date·signoff:

Document Header (typical):
  Title: SW Development Plan
  Project: Avionics Block 4
  Version: 2.1.0
  Date: 2026-05-19
  Status: Approved
  
  Author:    [Name, Date, Signature]
  Reviewer:  [Name, Date, Signature]
  Approver:  [Name, Date, Signature]
  QA:        [Name, Date, Signature]
  
Change history:
  v2.1.0 (2026-05-19): Updated coverage tool
  v2.0.0 (2026-03-15): Added DO-332 OO supplement
  v1.0.0 (2025-12-01): Initial baseline
```

각 audit — *latest baseline*.

## SAS — Final Document

```text
SAS (SW Accomplishment Summary):
  Project 끝 — FAA·EASA 제출 (final)
  
Content:
  1. System overview
  2. SW description
  3. Software lifecycle activities
  4. Lifecycle data evidence
  5. Plans·standards reference
  6. Reviews·analyses·test results
  7. Compliance demonstrate
  8. Outstanding issues (deviation·waiver)
  9. Re-verification activities
  10. Tool qualification reference
  
SAS Sample size:
  Level A — 100~500 pages
  Level B — 50~200 pages
  Level C — 20~100 pages
  
+ Appendix:
  Detailed evidence reference
  Trace matrix
  Audit history
```

SAS = *final 인증 deliverable*. SOI-4 review.

## Configuration Item Categorization

```text
DO-178C Configuration Categories:

Category 1 (CC1):
  Lifecycle data — full control
  PSAC, SDP, etc., source code, test
  Strict change control (CCB approval)

Category 2 (CC2):
  Less critical items
  Templates, internal notes
  Lighter control
  
Each SCI entry — *CC1 or CC2*
```

CC1 — *audit 추적 가능*. CC2 — lighter.

## Problem Report·Defect Tracking

```text
PR (Problem Report) lifecycle:

1. Open:
   Issue ID, description, severity, reporter
   
2. Triage:
   CCB review
   Severity confirm
   Affected baseline
   Assignment
   
3. Resolution:
   Fix·workaround·waiver·duplicate
   Code change reference
   Test addition
   
4. Verification:
   Fix verify
   Regression test
   
5. Close:
   Final approval
   Document update
   
Tool:
  Jira, IBM DOORS, Polarion, Bugzilla
  Trace to source change·test
```

PR — *audit trail*. Each PR — *evidence*.

## Audit Records

```text
QA Audit (SQAP 정의):

Audit type:
  In-process audit
  Document audit
  Tool usage audit
  Transition audit
  Final audit
  
Audit record:
  Date
  Auditor (independence)
  Scope
  Findings (compliance·non-compliance)
  Action items
  Closure
  
Frequency:
  Per phase, per transition
  Typical — quarterly
  
Audit result — *SAS reference*.
```

QA audit — *internal evidence + external proof*.

## Artifact Size Estimate

```text
Project size별 산출물 양:

Small project (Level C·D, <50K SLOC):
  Plans          - 100 pages
  Standards      - 50 pages
  HLR·LLR        - 200 pages
  SDD            - 100 pages
  TC·TP          - 300 pages
  TR·logs        - 500 pages
  SAS            - 50 pages
  Total          - ~1500 pages

Large project (Level A, >500K SLOC):
  Plans          - 1000+ pages
  Standards      - 200+ pages
  HLR·LLR        - 5000+ pages
  SDD            - 2000+ pages
  TC·TP          - 10000+ pages
  TR·logs        - 50000+ pages
  SAS            - 500+ pages
  Total          - 100K+ pages
```

F-35·787 — *수십만 pages*. Years of work.

## Tool for Artifact Management

```text
Requirements: DOORS (IBM), Polarion (Siemens), Jama
Design: Rhapsody, Cameo, Enterprise Architect, Capella
Source: Git·SVN·ClearCase
Test: Vector CAST, LDRA, Cantata
Coverage: Same as test
PR: Jira, DOORS Change, Polarion
Document: Word, FrameMaker, LaTeX, Confluence
Build·CI: Jenkins, GitLab CI

CM tool 통합:
  Requirements → Design → Code → Test
  Trace matrix auto-gen
  Audit-ready
```

도구 통합 — *audit trail 자동화*.

## Korean Artifact Practice

```text
방사청 SW 신뢰성시험:
  요구 산출물 (대표):
    - SW 개발 계획서 (SDP equivalent)
    - SW 요구사항 명세서 (HLR·LLR)
    - SW 설계 명세서 (SDD)
    - 소스 코드
    - 시험 계획서·시험 절차서·시험 결과서 (TC·TP·TR)
    - 형상관리 계획서·index (SCMP·SCI)
    - 품질 보증 계획서 (SQAP)
    - 최종 보고서 (SAS equivalent)
  
KARI Flight SW:
  KSLV-II — 자체 + 외부 IV&V
  KOMPSAT — ESA·NASA 협력 시 ECSS·NPR

한국 산출물 — *DO-178C와 유사 구조*. 한국어 보고서.
```

한국 — 한국어 + 영문 일부. 구조는 유사.

## EASA·FAA·DAPA Submission

```text
FAA·EASA (서구):
  PSAC submission (SOI-1)
  SOI-2·3·4 — incremental review
  Final SAS submission → certification
  
DAPA (한국 방산):
  연구개발 기본계획
  시제 SW 개발 — 시험·평가
  무기체계 SW 신뢰성시험
  최종 보고서 → 인증

각 authority — *제출 형식 다름*. 본질 — *evidence-based*.
```

## 자주 하는 실수

> ⚠️ Trace matrix 부분만

```text
"중요 HLR·LLR만 trace"
→ 다른 부분 *evidence 부족*
→ Audit fail
```

→ *완전 trace*. 100% 양방향.

> ⚠️ Living document 미update

```text
Plan v1.0 → 1년 미update
→ Actual practice와 mismatch
→ Audit fail
```

→ Plans·standards *지속 update*.

> ⚠️ Signoff 누락

```text
Document v3.2 — author signoff만
→ Reviewer·QA signoff 부재
→ Audit fail
```

→ 4-corner signoff: Author·Reviewer·Approver·QA.

> ⚠️ Tool version 산출물 명시 누락

```text
SECI — "GCC 사용"
→ Version·configuration unspecified
```

→ Each tool — *exact version + config + qualification*.

## 정리

- **22 산출물** — 5 plans + 5 standards + 12 data items.
- **SCI** = product configuration, **SECI** = environment config.
- **SAS** = final FAA·EASA deliverable.
- Trace matrix — *complete + 양방향*.
- Each artifact — *version·date·4-corner signoff*.
- Tool — DOORS·Polarion·Jama·Vector CAST·Git.
- F-35·787 — *수십만 pages*. Years of work.
- 한국 방사청 — 유사 구조, 한국어 보고서.

다음 편은 **방사청·KARI Application**.

## 관련 항목

- [Ch 13: Formal Methods](/blog/embedded/avionics/developing-safety-critical/chapter13-formal-methods)
- [Ch 15: 방사청·KARI](/blog/embedded/avionics/developing-safety-critical/chapter15-korea-defense)
- [Ch 3: 5 Plans](/blog/embedded/avionics/developing-safety-critical/chapter03-plans)
