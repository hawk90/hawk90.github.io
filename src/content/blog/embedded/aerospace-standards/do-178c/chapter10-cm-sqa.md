---
title: "Ch 10: Configuration Management & Software Quality Assurance"
date: 2026-05-18T11:00:00
description: "SCM baseline·CCB·PR workflow. SQA audit·SAS 작성. 도구 (ClearCase, Git, JIRA). 항공 산업 거버넌스."
tags: [do-178c, scm, configuration-management, sqa, baseline, ccb, sas, clearcase]
series: "DO-178C"
seriesOrder: 10
draft: false
---

코드와 verification이 *완벽*해도 *형상 관리와 품질 보증*이 부실하면 인증 실패. *SCM (Software Configuration Management)*과 *SQA (Software Quality Assurance)*가 *모든 산출물의 baseline + change control + audit*을 보장한다. 이 장은 *SCM·SQA의 항공 적용 + SAS 작성*까지.

## SCM의 역할 — DO-178C §7

> **Software Configuration Management**: The discipline of identifying the configuration of a software at discrete points in time for systematically controlling changes and maintaining the integrity and traceability of the configuration throughout the software life cycle.

핵심: *언제, 무엇이, 누가, 왜 변경*되었는지 *완벽 추적*.

**SCM activities (DO-178C §7.2):**

- 1. Configuration Identification (SCI 식별)
- 2. Change Control (변경 통제)
- 3. Status Accounting (현황 추적)
- 4. Audits (감사)
- 5. Release Management
- 6. Archive (저장)

## A-8 — SCM Objectives (6 obj)

```
A-8-1  Configuration items 식별
A-8-2  Baseline + Traceability 정의
A-8-3  Problem reports + change control + 추적
A-8-4  Configuration Management 환경 구축
A-8-5  SECI (Software Environment Configuration Index) 작성
A-8-6  SCI (Software Configuration Index) 작성
```

모든 DAL에 의무 (A~D). DAL에 따라 *Independence 차이 없음* — SCM은 *기본 모든 프로젝트*.

## Software Configuration Items (SCI)

*configuration item*: *변경 관리 대상*. 모든 산출물이 *SCI*.

### SCI 분류

**1. Source Code Files (.c, .h, .py, .ada)**


**2. Object Code (.o, .a, .lib)**


**3. Executable (.elf, .bin, .hex)**


**4. Plans (PSAC, SDP, SVP, SCMP, SQAP)**


**5. Standards (SRS, SDS, SCS)**


**6. Requirements (HLR, LLR)**


**7. Design (SDD, SAD)**


**8. Test cases / procedures (SVCP)**


**9. Test results (SVR)**


**10. Coverage reports**


**11. Review records**


**12. Problem reports**


**13. Audit reports**


**14. Toolchain (compiler, linker version)**


**15. Build scripts**


**16. Configuration files**

각 SCI는 *unique identifier* + *version*.

### SCI Identification Scheme

**Naming convention:**

- <PROJECT>-<MODULE>-<TYPE>-<NUMBER>-<VERSION>

**Examples:**

- KF21-FMS-CODE-pitch_controller.c-2.0.3
- KF21-FMS-DOC-PSAC-1.4.0
- KF21-FMS-TEST-TC-PFC-103-2.1.0
- KF21-FMS-EOC-fms.elf-2.0.0

## Baseline 관리

### Baseline 종류

```
Functional Baseline (FBL)
  - System Requirements 확정
  - After System Requirements Review (SRR)
  - SCS Source: SR document

Allocated Baseline (ABL)
  - HLR + Architecture 확정
  - After Preliminary Design Review (PDR)
  - SCS Source: HLR + SAD

Product Baseline (PBL)
  - Code + Design + Tests 확정
  - After Critical Design Review (CDR)
  - SCS Source: All SCIs in repository

Operational Baseline (OBL)
  - Field 운영 중인 SW
  - After Certification + Type Certificate
  - Change via Service Bulletin only
```

각 baseline에서 *모든 SCI version freeze*. *변경 시 CCB 승인*.

### Baseline Snapshot

```
Baseline: KF21-FMS-PBL-v2.0.0
Date:     2024-09-30
Approved: CCB Meeting 2024-09-29 (minute 2024-095)

Contents (SCI manifest):
  KF21-FMS-DOC-PSAC-1.4.0
  KF21-FMS-DOC-SDP-2.1.0
  KF21-FMS-DOC-SVP-2.0.0
  KF21-FMS-DOC-SCMP-1.2.0
  KF21-FMS-DOC-SQAP-1.0.0
  ...
  KF21-FMS-CODE-flight_ctrl.c-2.0.0    (SHA-256: abc...)
  KF21-FMS-CODE-navigation.c-2.0.0      (SHA-256: def...)
  KF21-FMS-CODE-pitch_controller.c-2.0.3 (SHA-256: ghi...)
  ...
  KF21-FMS-EOC-fms.elf-2.0.0           (SHA-256: xyz...)
  KF21-FMS-TEST-TC-PFC-001-2.0.0
  ...

Total SCIs: 1247
Source LoC: 105,234
Documents: 856 pages
Test cases: 6,734
```

이 *manifest 파일*이 *baseline의 정의*. *재구축 가능*.

## Change Control — CCB

*Change Control Board*가 *모든 변경 승인*.

### CCB 구성

```
Chair        : Engineering Manager (or VP Engineering)
Members      : Module Owners (rotating)
Permanent    : Configuration Manager (Secretary)
Permanent    : Quality Manager
Permanent    : Test/Verification Lead
Permanent    : SQA Representative
Permanent    : Certification Liaison (FAA DER 인지)

Frequency: Weekly (active development), Monthly (maintenance)
```

### Change Request (CR) Workflow

**1. CR Submission**

- Originator: Anyone
- Description, justification, impact analysis
- Attached: design proposal, code diff, test plan

**2. Impact Analysis**

- Affected SCIs identified
- LLR/HLR impact
- Test impact
- Schedule impact
- Cost estimate

**3. CCB Review**

- Discussion at CCB meeting
- Decision: Approve / Approve with conditions / Reject / Defer

**4. Implementation**

- If approved: Engineering implements
- CR linked to commit(s)

**5. Verification**

- Code review of CR implementation
- Test execution
- Coverage verification

**6. CCB Closure**

- Verification evidence presented
- CCB confirms completion
- CR closed, baseline updated

### Problem Report (PR) Workflow

PR이 *defect 발견 시* 작성.

**PR Lifecycle:**

**1. OPEN**

- Found by: Tester / Reviewer / Field
- Description, repro steps
- Severity: Critical / Major / Minor

**2. ANALYZING**

- Engineering investigates
- Root cause identification
- Fix proposal

**3. FIXED**

- Code commit
- PR linked to commit
- Tests added/updated

**4. VERIFIED**

- Independent verification (different person)
- Fix confirmed
- No regressions

**5. CLOSED**

- SQA confirms
- Baseline updated

**Optional states:**

- DEFERRED  : Acknowledged but fix postponed (with justification)
- REJECTED  : Not a defect (with explanation)
- DUPLICATE : Already tracked elsewhere

### CR vs PR

```
CR (Change Request) : Planned change for *new functionality* or *enhancement*
PR (Problem Report) : *Defect* discovered, requires fix
```

큰 CR은 *수십 PR*로 분해될 수 있음.

### CR/PR Document Example

```
=== Problem Report PR-2024-1089 ===

ID:                PR-2024-1089
Title:             Pitch PID anti-windup off-by-one in negative direction
Severity:          Major
Reporter:          Mike Lee (Test Engineer)
Reported Date:     2024-08-12

Affected:
  SCI:             KF21-FMS-CODE-pitch_controller.c-2.0.2
  LLR:             LLR-PFC-103
  Test:            TC-PFC-103-005 (Pitch with negative integral wind-up)

Description:
  When negative integral term accumulates, the clamp at -10.0 is NOT
  applied correctly. Observed: i_term reached -10.5 in 0.1 second.
  Expected: i_term capped at -10.0.

Steps to Reproduce:
  1. Initialize: state.i_term = -9.5, state.prev_error = 0
  2. Call pitch_pid_compute(-20.0, +10.0, ...) repeatedly
  3. Observe state.i_term after 5 iterations
  Result: i_term = -10.45 (expected -10.0)

Root Cause:
  Line 78: if (state->i_term < -I_TERM_LIMIT) state->i_term = -I_TERM_LIMIT;
  But ordering: clamp BEFORE adding new contribution

Fix:
  Add clamp AFTER all accumulation:
    state->i_term += K_I * error * DT;
    state->i_term = clamp(state->i_term, -I_TERM_LIMIT, +I_TERM_LIMIT);

Affected Components:
  - pitch_controller.c (fix code)
  - TC-PFC-103-005 (update test, was checking wrong condition)
  - TC-PFC-103-012 (add new test for boundary)

Impact:
  - 비행 안전: Pitch overshoot in extreme maneuvers (HIL detected)
  - Schedule: 1 week delay
  - DAL impact: A/B both affected, same fix

Discovered During: HIL test session 2024-08-12, aerobatic scenario

Status History:
  OPEN       2024-08-12   Mike Lee
  ANALYZING  2024-08-13   John Smith
  FIXED      2024-08-15   John Smith (commit 4f2a8c1)
  VERIFIED   2024-08-19   Alex Park (independent verifier)
  CLOSED     2024-08-22   Sarah Kim (SQA)

Resolution Verified:
  - Original failing test TC-PFC-103-005: PASS
  - New boundary test TC-PFC-103-012: PASS
  - HIL re-test scenario 2024-08-12: PASS
  - Coverage maintained 100%

Approvals:
  Module Owner:    John Smith
  Test Lead:       Mike Lee
  SQA:             Sarah Kim
  CCB Closure:     CCB Meeting 2024-08-26 (minute 2024-086)
```

이런 *level of detail*이 *open PR 수 적게 유지*. *심사관이 좋아하는 형식*.

## SCM Tools — 항공 산업

### IBM Rational ClearCase

```
20년+ 항공 산업 표준
강점:
  - UCM (Unified Change Management) — branch+CR 통합
  - Triggers (custom workflow)
  - 큰 binary 처리

약점:
  - Slow, complex, 비쌈
  - Modern dev workflow와 충돌
  - 점점 시장에서 밀려남
```

대형 항공 OEM과 legacy 프로젝트가 *ClearCase* 광범위 사용한 사례 공개 (Boeing, Airbus 등).

### Git (with workflow)

```
신세대 항공 + 자동차 표준
강점:
  - Fast, distributed
  - 풍부한 toolchain
  - Open source

약점:
  - Binary 파일 부적합 (LFS 필요)
  - 인증 trail 직접 구축
```

신규 항공·우주 프로젝트와 신생 회사가 *Git* 채택하는 추세.

### 인증 trail with Git

**1. Signed commits**

- git config user.signingkey ...
- git commit -S -m "Fix PR-2024-1089: anti-windup boundary"

**2. Linear history (no force-push)**

- git config receive.denyNonFastForwards true

**3. Protected branches**

- main branch: only via reviewed PR
- Tagged releases: signed tags

**4. Audit log**

- GitLab/GitHub의 audit feature
- Every action logged

**5. PR/MR template**

- Linking to CR/PR
- Reviewer requirement
- Test results attached

이런 구성으로 *Git 기반 항공 인증* 가능. 점점 *표준화*.

### JIRA / DOORS Next Gen for PR/CR Management

```
DOORS NG (IBM)         : 항공 표준, requirements + change
JIRA                    : 자동차 + 항공 신생
Polarion (Siemens)      : 통합 (requirements + change)
HP/Micro Focus ALM      : 일부 큰 OEM

각 도구가:
  - PR/CR 등록
  - Workflow 자동화
  - CCB 미팅 자료 생성
  - Status accounting report
```

## Audits — Configuration Audits

### Functional Configuration Audit (FCA)

> "Verify that the configuration item performs as required by the configuration documentation."

*기능적 일치 확인*. 코드가 *requirements를 정확히 구현*하는지.

**FCA 절차:**


**1. Test results 검토**


**2. Requirements coverage 확인 (DOORS)**


**3. Sampling 기반 PR review**


**4. SQA findings 검토**


**5. Audit report 작성**

### Physical Configuration Audit (PCA)

> "Verify the configuration of the configuration item with the documentation that describes it."

*문서와 실제 산출물의 일치 확인*.

**PCA 절차:**


**1. SCI manifest와 repository 비교**


**2. Each SCI hash 검증**


**3. Toolchain version 일치 확인**


**4. Build environment 일치 확인**


**5. Audit report 작성**

PCA가 *PSAC §6의 lifecycle data 목록과 일치* 확인.

### Audit 빈도

**대규모 프로젝트:**

- 내부 audit:   매 분기
- 외부 audit:   SOI 1/2/3 review 시 (FAA)

**소규모 프로젝트:**

- 내부 audit:   매 6개월
- 외부 audit:   SOI 시

## A-9 — SQA (5 obj)

```
A-9-1  Plans·Standards 적용·확인         ✓+I 모든 DAL
A-9-2  SW lifecycle process 적용·확인    ✓+I 모든 DAL
A-9-3  Transition criteria 충족          ✓+I DAL A/B/C
A-9-4  SAS 작성                          ✓+I 모든 DAL
A-9-5  SQA 활동 기록                     ✓+I 모든 DAL
```

**모든 obj에 Independence 의무**. SQA는 *조직 차원 독립* 필수.

## SQA Organization

### Independence 보장

**✗ Bad:**

- SQA가 PM에게 보고
- SQA가 development 팀의 일부
- SQA 평가 = SW 일정 준수
- SQA budget = SW 프로젝트 budget

**✓ Good:**

- SQA가 Quality VP에게 보고
- SQA가 별도 조직
- SQA 평가 = Quality metric (defect rate, audit findings)
- SQA budget = corporate quality budget

심사관이 *SQA Independence 직접 확인*. 조직도 + 인터뷰 + 기록 review.

### SQA Team Size

```
Project size       Engineering    SQA
─────────────────────────────────
Small (10 ppl)        7-8         1-2
Medium (50 ppl)      40-45        4-5
Large (200 ppl)     160-170      20-25

비율: 약 10-15% of total engineering
```

큰 조직은 *SQA가 별도 부서*. 작은 조직은 *전담 SQA 1-2명* + *consultants*.

## SQA Activities

**1. Plan/Standard Compliance Audit**

- 매월: 한 모듈 random 선택, plan/standard 준수 확인
- 발견된 비준수 → SQA Finding 발행
- 4 weeks 내 해결 의무

**2. Process Audit**

- 매 분기: 한 process (e.g., code review) 무작위 sample
- 절차 충실 이행 검증
- 통계 분석 (review duration, finding rate)

**3. Product Audit**

- 매 분기: 한 산출물 random sample
- Quality 직접 검증
- 외부 vs SQA 의견 비교

**4. Lifecycle Audit**

- 각 transition 시점
- Transition criteria 충족 확인
- Audit Report → CCB

**5. Non-conformance Tracking**

- Open findings 추적
- 보고 (월간, 분기간)
- Escalation if no resolution

각 활동이 *공식 기록*. *SAS에 통합*.

### SQA Finding Example

```
=== SQA Finding SQAF-2024-067 ===

Date:           2024-09-15
Subject:        Code review compliance audit
Auditor:        Sarah Kim (SQA)
Audit Type:     Process Audit

Sample:         5 code review records from past 30 days
                FRR-2024-130, 131, 132, 133, 134

Findings:

  Major Finding M-1:
    FRR-2024-131 (pitch_controller.c review)
    Required attendees per SDP §6.4: Author, Independent Reviewer,
    Test Engineer, SQA
    Actual attendees: Author + Reviewer only
    Missing: Test Engineer, SQA

    Impact: Review not compliant with DO-178C A-5-2 with Independence

    Required Action:
      1. Re-conduct review with all required attendees
      2. Update SDP §6.4 to clarify required attendees
      3. Train review chairs on attendee requirements

    Due Date: 2024-09-29

  Minor Finding m-1:
    Review records FRR-130, 132, 133 missing "Total preparation time"
    field as required by Review Procedure RP-001 §4.

    Required Action:
      Update Review Procedure form to make field mandatory.

    Due Date: 2024-10-15

Status:         OPEN
SQA Manager:    T. Park (notified)
Tracked:        DOORS module SQA-Findings

Closure Plan:   Re-audit after fixes (2024-10-30)
```

이런 *공식 finding*이 *SOI 3 audit*에서 *과거 record 검토 시 사용*.

## Software Accomplishment Summary (SAS)

*최종 산출물*. 모든 71 obj 충족을 *한 문서에 요약*.

### SAS 구조 (DO-178C §11.20)

**1. System Overview**

- Aircraft, system, SW의 위치

**2. Software Overview**

- Identification
- Architecture
- Functions
- Size (LoC, modules, requirements)

**3. Certification Considerations**

- Certification basis (FAR, AC)
- DAL determination
- SW functions and effect on aircraft

**4. Software Characteristics**

- Programming language
- Tools used
- Compiler version

**5. Software Life Cycle**

- Lifecycle model used
- Phases and transitions

**6. Software Life Cycle Data**

- Index of all submitted data
- Pages, version

**7. Compliance with DO-178C**

- Objective-by-objective compliance statement
- 71 obj × output × evidence reference

**8. Verification Process Outputs**

- Test summary
- Coverage summary
- Anomaly summary

**9. Software Configuration Management**

- SCI list
- Baseline status
- Change history

**10. Software Quality Assurance**

- SQA records summary
- Open findings
- Independence justification

**11. Tool Qualification**

- Qualified tools used
- TQL summary

**12. Open Problem Reports**

- List of deferred PRs (with justification)

**13. Alternative Methods**

- If formal methods used
- If model-based development

**14. Conclusion**

- Statement of compliance
- Recommendation for certification approval

### SAS — 71 Objectives Compliance Table

```
=== SAS §7: DO-178C Compliance Matrix ===

| Obj    | Description                | DAL B Required | Status  | Evidence Ref       |
|--------|----------------------------|----------------|---------|--------------------|
| A-1-1  | Process defined            | ✓+I            | Compl.  | SDP §2, SVP §2     |
| A-1-2  | Transition criteria        | ✓              | Compl.  | SDP §8             |
| A-1-3  | SW life cycle env defined  | ✓              | Compl.  | SDP §3, SECI       |
| A-1-4  | Additional considerations  | ✓              | Compl.  | PSAC §8            |
| A-1-5  | Plans developed            | ✓              | Compl.  | PSAC, SDP, SVP...  |
| A-1-6  | SW Plan/Standard consistent| ✓              | Compl.  | SQAP §3.1          |
| A-1-7  | SW life cycle env adequate | ✓              | Compl.  | TQP, SECI          |
| A-2-1  | HLR developed              | ✓              | Compl.  | SRD                |
| A-2-2  | Derived HLR communicated   | ✓              | Compl.  | DOORS Derived list |
| A-2-3  | SW Architecture developed  | ✓              | Compl.  | SAD                |
| A-2-4  | LLR developed              | ✓              | Compl.  | SDD                |
| A-2-5  | Derived LLR communicated   | ✓              | Compl.  | DOORS LLR Derived  |
| A-2-6  | Source Code developed      | ✓              | Compl.  | src/ repository    |
| A-2-7  | EOC produced               | ✓              | Compl.  | output.elf v2.0.0  |
| A-2-8  | SW integrated on HW        | ✓              | Compl.  | HIL test results   |
| A-3-1  | HLR ↔ SR consistent        | ✓+I            | Compl.  | FRR-2024-127       |
| A-3-2  | HLR accurate + consistent  | ✓+I            | Compl.  | FRR-2024-128       |
| A-3-3  | HLR ↔ target compatible    | ✓              | Compl.  | Analysis Report    |
| A-3-4  | HLR verifiable             | ✓+I            | Compl.  | SVCP, SVR          |
| A-3-5  | HLR ↔ Standards            | ✓              | Compl.  | FRR-2024-129       |
| A-3-6  | HLR traceable              | ✓+I            | Compl.  | DOORS link analysis|
| A-3-7  | HLR algorithms accurate    | ✓+I            | Compl.  | AVR-NAV-007        |
| A-4-1  | LLR ↔ HLR consistent       | ✓+I            | Compl.  | FRR-2024-130       |
| ... (계속 71개)
| A-9-5  | SQA records                | ✓+I            | Compl.  | SQA records 2024   |
| A-10-1 | FAA communication          | ✓              | Compl.  | SOI 1/2/3 records  |
| A-10-2 | Compliance evidence        | ✓              | Compl.  | This SAS           |
| A-10-3 | SAS submitted              | ✓              | Compl.  | This document      |

All 69 DAL B objectives: COMPLIANT
```

SAS가 *수백 페이지*. 각 obj에 *evidence reference*. FAA가 *모든 reference 추적 가능*.

### SAS — Open Problem Reports

```
=== SAS §12: Open Problem Reports ===

The following PRs are open at time of SAS submission:

PR-2024-0892
  Title: Minor — Log message format inconsistency
  Severity: Minor
  Status: DEFERRED to v2.1.0
  Justification: Cosmetic, no safety/functional impact.
                 Will be addressed in next release.
  FAA Acknowledged: 2024-09-15

PR-2024-1024
  Title: Minor — Documentation typo in LLR-FCS-022
  Severity: Minor
  Status: DEFERRED
  Justification: Typo in description, code is correct.
                 No safety impact.
  FAA Acknowledged: 2024-09-15

Total Open: 2 (both Minor, no Major or Critical)
```

*Open PR이 있어도 인증 가능* — *모두 정당화*하고 *FAA가 acknowledge*하면.

### SAS 작성 시간

```
DAL D system    : 1-2 person-months
DAL C system    : 3-6 person-months
DAL B system    : 6-12 person-months
DAL A system    : 12-24 person-months

SAS 페이지:
  DAL D    : 50-100 pages
  DAL C    : 100-300 pages
  DAL B    : 300-800 pages
  DAL A    : 500-2000 pages
```

큰 시스템(Boeing 787 FBW)의 SAS는 *수천 페이지*. *팀 전체가 수개월 작성*.

## SOI 4 — Final Review

SAS가 제출되면 *SOI 4*. 인증 직전 마지막 review.

**SOI 4 Agenda:**


**Day 1:**

- SAS overview
- Compliance matrix review
- Open PR review
- Any outstanding findings from SOI 3

**Day 2:**

- SQA records sampling
- Independence verification
- Final witnesses on test execution

**Day 3:**

- Closeout discussion
- Conditions for approval
- Schedule for Type Certificate

SOI 4 통과 = *FAA Type Certificate*. SW는 *AML (Approved Model List)*에 등재. *항공기 운항 가능*.

## SECI — Software Environment Configuration Index

A-8-5 의무. *Development + Verification 환경*의 *모든 도구 + 버전*.

```
=== SECI (일반 template) ===

Operating System:
  Linux:    Ubuntu 22.04.3 LTS, kernel 5.15.0
  Windows:  10 22H2 (for some test stations)

Toolchain:
  Compiler:        arm-none-eabi-gcc 12.2.1
  Assembler:       arm-none-eabi-as 2.40
  Linker:          arm-none-eabi-ld 2.40
  Library:         newlib 4.3.0
  Make:            GNU Make 4.3
  Python:          3.10.12

Tool Qualification:
  Helix QAC:       2024.2 — TQL-4 qualified
  Polyspace:       R2024a — TQL-4 qualified
  LDRA Testbed:    10.0 — TQL-4 qualified
  VectorCAST:      23 — TQL-4 qualified

Requirements Tools:
  DOORS:           9.7.2.4
  DOORS NG:        7.0.1

Version Control:
  Git:             2.40.1
  GitLab:          16.3

Build Tools:
  CMake:           3.27.7

Test Tools:
  Google Test:     1.14.0
  Cantata:         8.4

HIL System:
  dSPACE SCALEXIO: Release 2024-B
  dSPACE ControlDesk: 7.4
  Simulink:        R2023b

Documentation:
  LaTeX:           TeX Live 2023
  Pandoc:          3.1.6

Hash of Tool Manifests:
  toolchain.lock:  SHA-256 abc...
  test_env.lock:   SHA-256 def...
```

SECI가 *모든 binary tool 버전*을 *정확히 기록*. *재현 빌드 보장*.

## Common Findings — CM & SQA

**가장 흔한 finding:**

**1. "CCB minute 2024-XX에 PR-YYY 논의 기록 없음"**

- → Change control 추적 누락

**2. "Baseline v2.0.0 manifest와 repository 실제 hash 불일치"**

- → SCI integrity 위반

**3. "PR-2024-1089 fixed 후 verification record 누락"**

- → Workflow 누락

**4. "SQA Finding SQAF-2024-067 4 weeks 넘게 open"**

- → Resolution 지연

**5. "SECI에 CMake 버전 미기록"**

- → Tool tracking 누락

**6. "open PR 50개 중 30개 Major — DAL A 인증 부적합"**

- → 너무 많은 open issue

## 도구 통합 — 항공 산업

```
Stack 예 (일반 항공 프로젝트):

Requirements:    DOORS (IBM)
Design:          MagicDraw (Architecture), Simulink (Model)
Code:            Git (GitLab) + ClearCase (legacy)
Build:           CMake + Make + Jenkins
Static Analysis: Helix QAC + Polyspace + LDRA
Test:            VectorCAST + custom HIL
Coverage:        VectorCAST + LDRA
CM:              ClearCase (CR/PR) + Git (code)
SQA:             Custom DOORS module
Issue Tracking:  JIRA
CI/CD:           Jenkins + GitLab CI

Integration: 자체 개발 portal (DOORS, Git, JIRA, Jenkins 통합)
```

```
Stack 예 (Boeing 787):

Requirements:    DOORS
Design:          Custom + Simulink
Code:            ClearCase (전체)
Build:           자체 build system
Static:          QAC + Polyspace + Astrée
Test:            VectorCAST + LDRA + Cantata + 자체
Coverage:        모든 도구 결합
HIL:             dSPACE + 자체 Iron Bird
```

## 정리

- SCM은 *모든 산출물의 baseline + change control + traceability*.
- SCI: 코드부터 review record까지 *모든 산출물*.
- Baseline 4 종류: Functional, Allocated, Product, Operational.
- CCB가 *모든 변경 승인*. CR/PR workflow.
- 도구: ClearCase (legacy 항공), Git (신생), DOORS NG, JIRA, Polarion.
- SQA *모든 obj Independence 의무*. *조직 차원 분리*.
- SQA 활동: Plan/Standard, Process, Product, Lifecycle audit + Finding tracking.
- SAS가 *최종 산출물* — 71 obj × evidence 매트릭스.
- SECI가 *모든 toolchain 버전* 기록 → reproducibility.
- SOI 4가 인증 직전 마지막 review.

## 다음 장 예고

11장은 *Tool Qualification (DO-330)* — TQL-1~5, TOR, TQP, Vendor qualification kit.

## 관련 항목

- [Ch 9 — Coverage Analysis (MC/DC)](/blog/embedded/aerospace-standards/do-178c/chapter09-coverage-mcdc)
- [Ch 11 — Tool Qualification (DO-330)](/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330)
- [Ch 12 — Formal Methods + Security](/blog/embedded/aerospace-standards/do-178c/chapter12-formal-methods-security)
- [IBM Rational ClearCase](https://www.ibm.com/products/rational-clearcase)
- [IBM DOORS Next Gen](https://www.ibm.com/products/requirements-management)
- [JIRA for Aerospace](https://www.atlassian.com/)
