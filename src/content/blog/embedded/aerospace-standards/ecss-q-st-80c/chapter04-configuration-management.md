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
15. Training material (KARI 강조)
```

### Naming Convention — ECSS-style

```
Format: <Project>-<Subsystem>-<Type>-<Number>-<Version>

예 (KOMPSAT-6):
  K6-AOCS-SRC-AC_ATT-2.0.0          # source code
  K6-AOCS-DOC-SRD-1.4.0              # requirements document
  K6-AOCS-TEST-TC-AC-103-2.1.0       # test case
  K6-AOCS-EOC-aocs_image-2.0.0       # executable
  K6-COTS-RTOS-vxworks-7.0           # COTS component
  K6-HERITAGE-AOCS-from-K3A-1.0      # heritage component
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
  - ESA / KARI Mission Director
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

### CR Document — KOMPSAT 예

```
=== Change Request CR-KOMPSAT6-2024-089 ===

Title: AOCS Quaternion 계산 정밀도 개선
Originator: 김OO (Algorithm Engineer)
Submitted Date: 2024-08-15

1. Change Description
   Quaternion normalization을 *매 step*이 아닌 *매 10 step*마다
   수행. 누적 오차 분석 결과 매 10 step이 충분하고 *CPU 사용량
   20% 감소* 가능.

2. Justification
   - 현재 quaternion math가 CPU의 35% 차지
   - Normalization을 매 cycle 수행 → 불필요한 부담
   - 10 cycle마다도 IEEE 754 정밀도 내 (분석 완료)
   - CPU margin 확보 → 추가 monitoring 기능 가능

3. Affected SCIs
   K6-AOCS-SRC-quaternion_math.c-2.0.0 → 2.1.0
   K6-AOCS-DOC-SDD-1.4.0 → 1.5.0 (design rationale 추가)
   K6-AOCS-TEST-TC-AC-quat-* (test 업데이트)
   K6-AOCS-DOC-LLR-LLR-AC-042-1.2.0 → 1.3.0

4. Impact Analysis

   Technical:
   - Accuracy: 분석 보고서 첨부 (AVR-AOCS-2024-005)
     평균 오차: 0.0001° → 0.0003° (within ±0.001° budget)
   - Performance: CPU 35% → 28%
   - Memory: unchanged
   - Power: 소량 감소 (CPU 사용 감소로)

   Schedule:
   - Implementation: 2 weeks
   - Testing: 1 week
   - Review: 1 week
   - Total: 4 weeks (within sprint 30)

   Cost:
   - Engineering: 40 person-hours
   - Test execution: 20 person-hours
   - SPA review: 8 hours
   - Total: ~$15k

   Mission:
   - Improves CPU margin for future features
   - No degradation in current functionality

5. Risks
   - Low risk: numerical stability
   - Mitigation: extensive Monte Carlo testing
   - Rollback: revert to v2.0.0

6. Recommendation
   APPROVE

7. CCB Decision
   APPROVED unanimously
   Conditions:
   - Monte Carlo test results review at CCB closure
   - Performance benchmark in HIL test

8. Status
   2024-08-15: Submitted
   2024-08-20: Impact analysis complete
   2024-08-22: CCB review, APPROVED
   2024-09-12: Implementation complete
   2024-09-19: Tests pass, Monte Carlo OK
   2024-09-23: HIL benchmark CPU 28.3% ✓
   2024-09-26: CCB closure, baseline updated

Approvals:
   CCB Chair:           박OO          2024-08-22
   Configuration Mgr:   이OO          2024-09-26
   SPA Manager:         김OO          2024-09-26
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

### In-orbit Change 사례

```
KOMPSAT-3A (2015 발사) in-orbit updates:
  - 2016: Star tracker calibration update
  - 2017: TT&C protocol update
  - 2018: Battery management fine-tuning
  - 2019: SAR processing algorithm
  - 2020-2024: 매년 1-2회 minor update

Total in-orbit changes (9 years): ~15
Failure rate: 0 (모두 성공)
```

10년+ 운영하면서 *수십 회 SW update*. *지상 SW 만큼 자주*.

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

### Configuration Index — KOMPSAT 예

```
=== Configuration Index — KOMPSAT-6 v2.0.0 ===

Baseline: K6-PBL-v2.0.0
Date:     2024-10-15
Approved: CCB Meeting 2024-10-12

Contents:

1. Plans + Standards (45 documents)
   PSAC, SDP, SVP, SCMP, SPA Plan + standards
   See: K6-DOCS/Plans/

2. Requirements (1,247 items in DOORS)
   K6-AOCS-HLR: 247
   K6-PMC-HLR:  158
   K6-TTC-HLR:  189
   ...

3. Design Documents (87 documents)
   See: K6-DOCS/Design/

4. Source Code (15 modules, ~120 KLoC)
   K6-AOCS-SRC: 35 files, 28 KLoC
   K6-PMC-SRC:  22 files, 18 KLoC
   ...

5. Test Cases (8,234 items)
   K6-AOCS-TEST: 2,847
   K6-PMC-TEST:  1,932
   ...

6. Test Results (8,234 records, all passing)

7. Build Artifacts
   K6-EOC-image.bin    SHA-256 abc...
   K6-EOC-image.elf    SHA-256 def...
   K6-EOC-debug.elf    SHA-256 ghi...

8. Tool Configurations
   Toolchain manifest (SECI)
   Tool versions (45 tools tracked)

9. Heritage SW (12 reused components)
   K6-HERITAGE-from-K3A: 8 components
   K6-HERITAGE-from-K3:  2 components
   K6-COTS-SAVOIR:       2 components

10. Customer Documentation
    User Manual
    Operations Manual
    Maintenance Manual

Total SCIs: 9,567
Total LoC: 124,847
Total Documents: 132
Test Coverage: 95% (target)
Open NCRs: 8 (all Minor)

Conclusion: Configuration ready for Qualification Review.

Approved:
  Configuration Manager: 이OO     2024-10-15
  SPA Manager:           김OO     2024-10-15
  Project Manager:       박OO     2024-10-16
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

### Heritage SW Tracking

```
=== Heritage SW Manifest — KOMPSAT-6 ===

Component: AOCS Core Algorithm
  Source: KOMPSAT-3A (2015 launch)
  Reuse status: As-is with minor modification
  Modification log:
    K3A-v2.5.0 → K6-v1.0.0:
      - Updated for K6-specific orbit parameters
      - Removed deprecated TT&C interface
      - No algorithm changes
  Operational data from K3A:
    Operating hours: 9 years × 24/7 = ~80,000 hours
    Anomalies: 2 (both software fix, included in K3A-v2.5.0)
  Heritage approval: ESA-equivalent QA review

Component: Star Tracker Driver
  Source: ESA SAVOIR-FAIRE catalog
  Reuse status: Black-box COTS
  Vendor: Jena-Optronik (Germany)
  Heritage: 50+ ESA missions
  Documentation: Vendor-provided + KARI integration spec

Component: RTOS
  Source: VxWorks Cert (Wind River)
  Reuse status: COTS qualified product
  Heritage: DO-178C DAL A certification kit
  Customization: KARI port to ARM Cortex-A53
```

각 heritage component가 *완전 추적*. *re-qualification은 minimum*.

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

## KARI SCM — 실제 운영

### Tool Stack

```
Requirements:    DOORS (KARI 표준)
Design:          MagicDraw + Simulink
Code:            GitLab Enterprise (자체 호스트)
Build:           CMake + Jenkins
CCB:             자체 JIRA workflow + DOORS
Status:          Custom Power BI dashboard
Archive:         자체 LTO tape + cloud backup
```

### Process

```
주간 활동:
  - Build daily
  - CR review (운영 중인 CR)
  - SPA spot check

월간:
  - CCB meeting (4번)
  - Status accounting report
  - Customer (정부) status meeting

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

KARI도 *KOMPSAT mission archive* 보유. *수십 년 후* 후속 mission에 재사용 가능.

## 정리

- ECSS SCM은 *DO-178C와 기본 동일* + *long-term operation 강조*.
- 6 baseline: FBL/ABL/DBL/PBL/OBL/MBL.
- CCB가 *모든 변경 승인*. In-orbit change는 *별도 절차* + *customer approval*.
- Heritage SW + COTS는 *별도 tracking*. ESA SAVOIR-FAIRE catalog.
- KARI = GitLab Enterprise + DOORS + JIRA + Jenkins.
- KOMPSAT-3A in-orbit changes ~15회 (9년) — *모두 성공*.
- Archive: *end-of-mission + 10년 최소*. 일부 30년.
- Open format + 여러 매체 + geographic redundancy.

## 다음 장 예고

5장은 *SW Non-Conformance Control* — NCR (Non-Conformance Report) workflow, classification, escalation.

## 관련 항목

- [Ch 3 — Product Properties Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter03-product-properties)
- [Ch 5 — Non-Conformance Control](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter05-non-conformance)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [GitLab for Aerospace](https://about.gitlab.com/solutions/)
- [Wind River VxWorks Cert](https://www.windriver.com/products/vxworks)
- [Jena-Optronik Star Tracker (SAVOIR)](https://www.jena-optronik.de/)
