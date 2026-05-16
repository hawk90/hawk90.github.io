---
title: "Ch 4: SW Configuration Management"
date: 2025-10-05T05:00:00
description: "ECSS-Q-ST-80C §5.5 — SCM Plan, identification, baseline, change control, status accounting, audits."
tags: [ecss, scm, configuration-management, baseline, ccb, change-control, audit]
series: "ECSS-Q-ST-80C"
seriesOrder: 4
draft: false
---

ECSS의 *Software Configuration Management (SCM)*. DO-178C의 SCM과 *거의 동일*하지만 *ESA의 미션 lifecycle*(10-30년)에 적응. 위성이 *발사 후 10년+ 운영*되며 *지상에서 SW update*가 흔하다. 이 장은 *SCM 4 활동, baseline 4종류, Change Control Board, KARI 적용*까지.

## SCM의 정의 — ECSS-Q-ST-80C §5.5

> **Software Configuration Management**: The discipline of identifying the configuration of a software at discrete points in time for systematically controlling changes and maintaining the integrity and traceability throughout the software life cycle.

핵심 — *언제, 무엇이, 누가, 왜* 변경되었는지 *완벽 추적* + *재현 가능*.

## SCM의 4 활동 (ECSS-Q-ST-80C §5.5.2)

```
1. Configuration Identification (식별)
2. Configuration Control (변경 통제)
3. Configuration Status Accounting (현황 추적)
4. Configuration Audits (감사)
```

추가로:

```
5. Release Management
6. Archive (장기 보관 — ESA 특유 강조)
```

DO-178C와 *기본 동일*. 차이는 *long-term archive* + *space-specific concerns*.

## 1. Configuration Identification

### SCI (Software Configuration Items)

DO-178C와 같이 *모든 산출물*이 SCI.

```
ECSS-specific SCI categories:

1. Source Code (.c, .h, .ada, .py)
2. Object Code, Executable
3. Plans (SDP, SVP, SCMP, SPA Plan)
4. Standards (SCS, SRS, SDS)
5. Requirements (DOORS items)
6. Design Documentation
7. Test cases + procedures + results
8. Verification reports
9. Quality records
10. Tool configuration
11. Build scripts
12. Heritage SW (재사용 산출물)
13. COTS / OSS components
14. Documentation (manuals, user guides)
15. Training material
```

### Naming Convention — ECSS-style

```
Format: <Project>-<Subsystem>-<Type>-<Number>-<Version>

예 (가상 mission):
  PRJ-AOCS-SRC-AC_ATT-2.0.0          # source code
  PRJ-AOCS-DOC-SRD-1.4.0              # requirements document
  PRJ-AOCS-TEST-TC-AC-103-2.1.0       # test case
  PRJ-AOCS-EOC-aocs_image-2.0.0       # executable
  PRJ-COTS-RTOS-vxworks-7.0           # COTS component
  PRJ-HERITAGE-AOCS-from-prev-1.0     # heritage component
```

ESA는 *long mission name*을 사용해 *수십 년 후*도 식별 가능.

## 2. Configuration Control

### Baseline 종류 — ECSS

ECSS는 *6 baseline*. DO-178C의 4보다 많음.

```
Type A — Functional Baseline (FBL)
  After:  SRR (System Requirements Review)
  Frozen: System requirements
  Changes: 시스템 수준 영향 분석

Type B — Allocated Baseline (ABL)
  After:  PDR (Preliminary Design Review)
  Frozen: HLR + High-level Architecture
  Changes: Subsystem level CCB

Type C — Design Baseline (DBL)
  After:  CDR (Critical Design Review)
  Frozen: LLR + Detailed Design
  Changes: 코드와 함께

Type D — Product Baseline (PBL)
  After:  QR (Qualification Review)
  Frozen: 양산 SW
  Changes: Service Bulletin

Type E — Operational Baseline (OBL)
  After:  AR (Acceptance Review) + Launch
  Frozen: 발사된 SW
  Changes: In-orbit update만 (매우 신중)

Type F — Maintenance Baseline (MBL)
  매년 또는 분기
  Operational 중 누적 변경
  Frozen: 정기 release
```

DO-178C(4 baseline)는 *항공기 1회 인증* 모델. ECSS(6 baseline)는 *지속 운영* 모델.

## Baseline 흐름 — 위성 mission 예

```
Time  Phase           Baseline       SW Activities
─────────────────────────────────────────────
2024  Concept         (none)
2024  SRR             FBL freeze     System req baseline
2025  PDR             ABL freeze     HLR + Arch
2025  CDR             DBL freeze     LLR + Code (alpha)
2026  QR              PBL freeze     Qualified SW
2026  AR              OBL freeze     Acceptance + Launch
2026  Launch
2026  In-orbit:
  Month 1            (commission)    First check, no changes
  Month 6-12         MBL v1.1         Bug fix update
  Year 2             MBL v1.2         Feature enhancement
  Year 5             MBL v2.0         Major update
  Year 10            EOL
```

10년 동안 *수십 개 baseline*. 각각 추적.

## Change Control — CCB

### CCB 구성 (ECSS-Q-ST-80C §5.5.3)

```
Chair         : Project Manager 또는 Engineering Director
Permanent:
  - Configuration Manager
  - Quality Manager (SPA)
  - Lead System Engineer
  - Lead Software Engineer
  - Customer Representative (project 후기)

Rotating:
  - Module Owner (변경 관련)
  - Test Lead
  - Operations (운영 중 변경 시)

Special participants (in-orbit 변경 시):
  - Mission Operations Manager
  - Spacecraft Engineer
  - Mission Director (운영기관)
```

### Change Request (CR) Workflow — ECSS

```
1. CR Submission
   - Originator: Anyone with valid reason
   - CR Form (ECSS Annex E template)
   - Impact analysis 요청

2. Impact Analysis (Engineering)
   - Technical impact
   - Schedule impact
   - Cost impact
   - Mission impact (operational change 시)
   - Affected SCIs identified

3. CCB Review
   - Discussion
   - Decision: Approve / Approve conditional / Reject / Defer / Withdraw

4. Implementation
   - If approved: 개발팀 implement
   - CR linked to SCI changes

5. Verification (SPA)
   - Change implemented per spec
   - Tests updated/added
   - Coverage maintained
   - No regressions

6. CCB Closure
   - Verification evidence
   - CCB approves closure
   - Baseline 업데이트
```

### CR Document — 일반 template

```
=== Change Request (일반 template) ===

Title:       [한 줄 요약]
Originator:  [submitter]
Date:        [submission date]

1. Change Description
   [기술적 변경 내용]

2. Justification
   [왜 필요한가 — quantitative reason 권장]

3. Affected SCIs
   [영향 받는 source / doc / test / baseline]

4. Impact Analysis
   - Technical (accuracy / performance / memory / power)
   - Schedule
   - Cost
   - Mission

5. Risks
   - Risk level
   - Mitigation
   - Rollback procedure

6. Recommendation: Approve / Conditional / Reject

7. CCB Decision + Conditions

8. Status timeline (submission → impact analysis → CCB → impl → test → closure)

Approvals: CCB Chair, Config Manager, SPA Manager
```

### 위성 In-orbit Change — 특별 절차

가장 *위험한 변경*. 발사된 SW를 *원격 update*.

```
In-orbit Change Procedure:

1. CR submission (operational team)
2. Ground simulation (HIL with current OBSW)
3. Engineering analysis
4. CCB review (operational members + customer)
5. Customer / ESA approval (mission director)
6. Risk mitigation plan
   - Rollback procedure (이전 baseline 보존)
   - Recovery from failed upload
   - Safe mode trigger 정의
7. Upload preparation
   - Patch package (delta or full)
   - Cryptographic signing
   - Multiple ground station 준비
8. Upload window (visibility window)
9. Upload + verification
10. Post-upload monitoring (30+ days)
11. CCB closure
```

### In-orbit Change — 일반 관찰

장기 운영 mission (10+ 년)에서는 *수십 회의 in-orbit update*가 일반적. 종류:
- Calibration coefficient update
- Protocol patch
- Battery / power management 조정
- Algorithm 개선
- Bug fix

각 mission의 *정확한 update 횟수, 성공률*은 *운영 기관 공식 발표*만 인용.

## 3. Configuration Status Accounting

*현황 추적 + 보고*. *어느 SCI가 어느 baseline에 있는지* 항상 알아야.

### Status Accounting Reports

```
Daily Reports (자동):
  - Open CR count
  - CR status distribution
  - Recent baselines
  - Build status

Weekly Reports:
  - CR throughput (opened, closed, in progress)
  - Module change frequency
  - Test execution status

Monthly Reports:
  - Baseline summary
  - Module-level change analysis
  - Resource utilization
  - Trend analysis

Milestone Reports:
  - Complete configuration index
  - Configuration audit report
  - Customer delivery
```

### Configuration Index — 일반 template

```
=== Configuration Index (일반 template) ===

Baseline: [version label]
Date:     [date]
Approved: [CCB meeting reference]

Contents:
1. Plans + Standards (count)
2. Requirements (count in tracking tool)
3. Design Documents (count)
4. Source Code (모듈 count, LoC)
5. Test Cases (count)
6. Test Results (count, pass status)
7. Build Artifacts (hash + size)
8. Tool Configurations (toolchain manifest)
9. Heritage SW (component count + source)
10. Customer Documentation (manual count)

Summary metrics:
  Total SCIs, Total LoC, Test Coverage, Open NCRs

Conclusion: review readiness

Approvals: Configuration Manager, SPA Manager, Project Manager
```

이 *Configuration Index*가 *공식 산출물*. 심사관·고객 review.

## 4. Configuration Audits

### Functional Configuration Audit (FCA)

> *기능적 일치*를 확인. SW가 *요구사항대로* 동작?

```
FCA 절차:
1. Sample requirements 선택 (random 10%)
2. 각 requirement에 대한 test result 확인
3. Tests pass 확인
4. Implementation 일치 확인 (code review)
5. Audit report
```

### Physical Configuration Audit (PCA)

> *문서와 실제의 일치*. 모든 SCI가 *정의된 대로* 존재?

```
PCA 절차:
1. Configuration Index와 repository 비교
2. 각 SCI의 hash 검증
3. Toolchain 버전 일치 확인
4. Heritage / COTS 출처 확인
5. Audit report
```

### Audit 시점

```
Project Phase    Audit
─────────────   ──────
CDR              FCA + PCA
QR (Qualification) FCA + PCA
AR (Acceptance)  FCA + PCA
매년 (operational) FCA + PCA
In-orbit change    PCA before upload
```

ESA mission은 *수십 회 audit*. 모든 audit이 *기록*.

## Tool — SCM 도구

```
IBM Rational ClearCase
  - 항공 + 우주 표준 (20년+)
  - 강한 trigger + branch 관리
  - 비싸고 느림

Git + GitLab/GitHub
  - 새로운 표준
  - Fast, distributed
  - 항공 + 우주 점진 채택
  - LFS for binary

Subversion (SVN)
  - Legacy 일부 ESA
  - 점차 Git으로

Custom systems
  - 매우 큰 ESA mission이 자체 시스템
  - Airbus, Thales 등
```

### Git for Space — KARI 사례

```
KARI Git Infrastructure (2024):
  - GitLab Enterprise
  - 자체 host (security)
  - Per-mission repository
  - LFS for binary (image, test data)
  - CI/CD: GitLab Runner

Workflow:
  - Protected main branch
  - PR/MR review required
  - Signed commits (GPG)
  - Linear history (no force push)
  - Tag for each baseline
```

GitLab의 *audit log* + *signed commits*이 *ECSS 인증 trail*.

## Heritage SW + COTS — SCM 특수

ECSS는 *재사용*을 강조. 그에 따른 *추가 SCM 의무*.

### Heritage SW Tracking — 일반 template

```
=== Heritage SW Manifest (일반 template) ===

Component: [name]
  Source: [previous mission / catalog name]
  Reuse status: As-is / Minor modification / Major rework / COTS
  Modification log:
    [previous version] → [current version]:
      - [변경 내용]
  Operational data:
    [operating hours, anomalies — 이전 mission에서 수집]
  Heritage approval: [QA review / customer approval]
```

각 heritage component가 *완전 추적*. *재인증 minimum*이 목표.

## ECSS vs DO-178C — SCM 비교

```
                    DO-178C            ECSS-Q-ST-80C
─────────────────────────────────────────────────
Baseline 수         4                  6 (operational + maintenance)
Long-term archive   언급               의무 강조
In-orbit change     N/A                정식 procedure
Heritage SW         PDS / SOUP         별도 활동 (강조)
COTS                PDS / SOUP         별도 활동 (강조)
Customer 참여       FAA late           Customer early + 지속
```

ESA가 *고객 (운영자) 참여*를 더 강조. 위성·발사체는 *대형 고객 (정부)*가 *전 lifecycle 참여*.

## SCM — 일반 운영 cadence

### Tool Stack (일반 예)

```
Requirements:    DOORS / Polarion / Jama 등
Design:          MagicDraw / Simulink 등
Code:            Git (GitLab / GitHub) / ClearCase
Build:           CMake / Make + Jenkins / GitLab CI
CCB:             JIRA workflow + Requirements tool
Status:          Dashboard tool (Power BI / Grafana 등)
Archive:         LTO tape + cloud backup
```

### Process — 일반 cadence

```
주간:
  - Build daily
  - CR review
  - SPA spot check

월간:
  - CCB meeting
  - Status accounting report
  - Customer status meeting

분기:
  - Compliance audit
  - Customer milestone review

연간:
  - Configuration audit (외부)
  - SCM Plan review
  - Tool update review
```

## Common Findings — SCM

```
가장 흔한 finding:

1. "CR-XXX implemented but verification step missing"
   → workflow 누락

2. "Baseline manifest와 actual repository 불일치"
   → SCI integrity 위반

3. "Heritage component K3A-AOCS-v2.5의 modification log 누락"
   → heritage tracking 부족

4. "CCB minute 일부 누락 (2024 Q2)"
   → record-keeping 부실

5. "In-orbit change procedure documented but never tested"
   → procedure validation 누락

6. "Open CR 50+ for 30+ days"
   → CR aging 문제
```

## ESA Mission 종료 — Archive

수십 년 후 *재해석*을 위해 *전체 configuration archive*.

```
Archive Requirements (ECSS-Q-ST-80C §5.5.6):

기간:
  - End of mission + 10 years 최소
  - 일부 critical mission: 30 years
  - James Webb: 30+ years (운영 끝나도 archive)

Format:
  - Open formats (PDF/A, XML, plain text)
  - No vendor-locked binary (Word .doc 금지)
  - Toolchain virtualization (재현 가능)

Storage:
  - 여러 매체 (tape, optical, cloud)
  - Geographic redundancy
  - 정기 integrity check

Cataloging:
  - Master catalog
  - Index 검색 가능
```

장기 운영 mission의 archive가 *후속 mission의 heritage*로 재사용 가능.

## 정리

- ECSS SCM은 *DO-178C와 기본 동일* + *long-term operation 강조*.
- 6 baseline: FBL / ABL / DBL / PBL / OBL / MBL.
- CCB가 *모든 변경 승인*. In-orbit change는 *별도 절차* + *customer approval*.
- Heritage SW + COTS는 *별도 tracking*. ESA SAVOIR catalog.
- Tool stack은 *조직 선택* — Git, DOORS, JIRA, Jenkins 등.
- Archive: *end-of-mission + 10년 최소*. 일부 30년.
- Open format + 여러 매체 + geographic redundancy.
- 정확한 절차·산출물은 *ECSS-Q-ST-80C 원문*.

## 다음 장 예고

5장은 *SW Non-Conformance Control* — NCR (Non-Conformance Report) workflow, classification, escalation.

## 관련 항목

- [Ch 3 — Product Properties Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter03-product-properties)
- [Ch 5 — Non-Conformance Control](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter05-non-conformance)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [GitLab for Aerospace](https://about.gitlab.com/solutions/)
- [Wind River VxWorks Cert](https://www.windriver.com/products/vxworks)
- [ESA SAVOIR catalog](https://savoir.estec.esa.int/)
