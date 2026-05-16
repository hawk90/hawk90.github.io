---
title: "Ch 2: SW Process Assurance — 개발 절차 보증"
date: 2025-10-05T03:00:00
description: "ECSS-Q-ST-80C §5.2 — SPA Plan 작성, process metrics, periodic audit, tailoring. KARI 적용 절차."
tags: [ecss, spa, process-assurance, audit, review, tailoring, kari]
series: "ECSS-Q-ST-80C"
seriesOrder: 2
draft: false
---

ECSS-Q-ST-80C의 *9개 핵심 활동* 중 가장 큰 비중을 차지하는 *SW Process Assurance (SPA)*. *개발 절차가 정해진 대로 수행되는지*를 *독립적으로 검증*한다. DO-178C의 SQA에 해당하지만 *ESA 특유의 process tailoring* 개념이 더해진다. 이 장은 *SPA Plan 작성, audit·review 절차, KARI/Airbus 적용*까지.

## SPA의 정의 — ECSS-Q-ST-80C §5.2

> **Software Process Assurance**: The activities and procedures that ensure that the software life cycle processes are applied as planned and produce the expected output with the required properties.

핵심 차이 — DO-178C SQA와 비교:

```
DO-178C SQA           ECSS SPA
─────────────         ─────────
Process audit         Process audit + Process tailoring
Product audit         Product audit
Lifecycle audit        Lifecycle audit
Non-conformance        Non-conformance
                      Process metrics (정량)
                      Continuous improvement
```

ESA가 *정량적 metric*과 *지속 개선*을 더 강조.

## SPA의 4단계 활동

```
1. Process Assurance Planning (SPA Plan 작성)
2. Process Audit Execution
3. Process Metric Collection + Analysis
4. Process Improvement
```

## 1. SPA Plan — Software Process Assurance Plan

DO-178C의 SQAP에 해당. ECSS에서는 별도 문서.

### SPA Plan 구조

```
1. Introduction
   - Project context
   - Scope
   - Applicable documents

2. Process Assurance Organization
   - SPA team 구조
   - 독립성 보장
   - Roles + responsibilities

3. Process Assurance Activities
   - Planning
   - Audits
   - Reviews
   - Reporting

4. Process Assurance Resources
   - Tool
   - Skills
   - Effort

5. Process Tailoring (ECSS 특유)
   - 적용 ECSS 표준 목록
   - Tailoring 결정 (어느 obj 면제)
   - 정당화

6. Process Metrics
   - 측정 항목
   - 수집 절차
   - 분석 + 보고

7. Audit Plan
   - Schedule
   - Scope
   - Method

8. Non-Conformance Process
   - NCR (Non-Conformance Report) workflow
   - Escalation
   - Corrective Action tracking

9. Independence Justification
   - 조직 차원
   - 재정 차원
   - 기술 차원

10. Records
    - Audit records
    - Finding records
    - Metric records
```

### SPA Plan 작성 예 — KOMPSAT 위성

```
=== SPA Plan — KOMPSAT-6 Satellite Software ===

1. Introduction
   Project: KOMPSAT-6 X-band SAR satellite
   Launch: 2025
   SW components: 12 (각 Criticality A-C)

2. Process Assurance Organization
   SPA Manager: 김OO (KARI Quality Division)
   SPA Team: 4명 (full-time)
   Reports to: KARI Director of Quality (개발 조직과 분리)

3. Process Assurance Activities

   3.1 Planning
       - SPA Plan version control
       - Annual review

   3.2 Audits
       - Process audit: 매 분기
       - Product audit: 매 분기
       - Lifecycle audit: 각 milestone

   3.3 Reviews
       - 모든 review에 SPA observer
       - SPA review records

4. Process Tailoring

   Applied Standards:
   - ECSS-Q-ST-80C Rev.1 (Software Product Assurance)
   - ECSS-E-ST-40C (Software Engineering)
   - ECSS-Q-ST-30C (Dependability) — Criticality A 한정
   - ECSS-Q-ST-40C (Safety) — 부분 적용

   Tailoring Decisions:
   - Criticality D modules: Code review 의무, Independent V&V 면제
   - Criticality C: Independent V&V 권장
   - Criticality A/B: ISVV 의무 (외부 조직)

   Rationale: 비용 효율, criticality 기반 risk-driven approach

5. Process Metrics

   매월 수집:
   - Process compliance rate
   - Defect detection rate
   - Review effectiveness (issues found per hour)
   - Test coverage trend
   - Code churn rate
   - Open NCR count
   - NCR resolution time

   매 분기:
   - SPA Manager 보고 → Director
   - Trend analysis
   - 비교: 이전 미션 (KOMPSAT-3A)

6. Audit Plan

   매 분기:
   Q1: Requirements process audit
   Q2: Design process audit
   Q3: Coding + verification audit
   Q4: Integration + V&V audit

7. Non-Conformance Process
   - NCR 등록 → SPA review → 개발팀 통보
   - 4주 내 응답 의무
   - Open NCR > 30일: SPA Manager → Director escalation

8. Independence
   SPA Manager: Quality Division (개발 = Engineering Division)
   재정: Corporate quality budget (project budget 외)
   기술: 외부 ISVV (SCISYS 또는 Critical SW)

Approved:
   SPA Manager:        김OO   2024-03-15
   Quality Director:   박OO   2024-03-20
   Project Manager:    이OO   2024-03-22
```

## 2. Process Audit — 정기 절차

ESA의 process audit은 *checklist-based + sample-based*.

### Audit 종류

```
A. Compliance Audit
   - 정해진 절차 (SDP, SVP 등)가 *실제 수행*되는가
   - Sample-based (random 5-10 modules)
   - 매 분기

B. Document Audit
   - 산출물의 *완성도, 정확성, 일관성*
   - Document baseline review
   - 매 milestone

C. Process Effectiveness Audit
   - 절차가 *예상한 결과*를 만드는가
   - Outcome analysis
   - 매 6개월

D. Independence Audit
   - SPA 조직의 *독립성 유지* 확인
   - 외부 auditor (1년에 1회)
```

### Compliance Audit 절차

```
1. Planning (audit 1주 전)
   - Audit scope 결정 (어느 process, 어느 시기)
   - Sample 선택 (random 5-10 module)
   - Checklist 준비

2. Notification (audit 3일 전)
   - 개발팀 통보
   - 자료 요청

3. Execution (audit 1-2일)
   - Sample module의 산출물 review
   - 개발팀 interview
   - 절차 준수 확인
   - Finding 기록

4. Reporting (audit 후 1주)
   - Audit report 작성
   - Findings 분류 (Major/Minor/Observation)
   - 개발팀 response 요청

5. Follow-up (audit 후 4주)
   - Corrective action 검증
   - NCR closure 또는 escalation
```

### Audit Checklist — Code Review Process 예

```
=== Audit Checklist: Code Review Process ===

Audit Date: 2024-10-15
Auditor:    김OO (SPA)
Sample:     5 code reviews from Q3 2024
            (FRR-2024-301, 305, 308, 312, 318)

Checklist Items:

A. Review Procedure Compliance
   ☐ Review가 SDP §6.4 절차 따랐는가
   ☐ 모든 required attendees 참석
   ☐ Reviewer가 충분한 preparation 시간
   ☐ Review meeting duration 적절 (2시간 미만)
   ☐ 모든 issue 기록
   ☐ Closure 후 follow-up

B. Reviewer Independence
   ☐ Reviewer가 author와 다른 사람
   ☐ Criticality A/B: Independent Reviewer 포함

C. Quality of Review
   ☐ Issue가 substantive (style 외 포함)
   ☐ Issue rate 적절 (5-10 per 100 LoC)
   ☐ Resolution 검증

D. Records
   ☐ Review record 완전
   ☐ DOORS link 정확
   ☐ Signature 있음

Findings:
  Major Finding M-1:
    FRR-2024-308: Required SPA observer 누락
    Action: Re-conduct with SPA observer
    Due: 2024-10-30

  Minor Finding m-1:
    FRR-2024-301, 305: "preparation time" 기록 없음
    Action: Update form template
    Due: 2024-11-15

  Observation o-1:
    Issue rate가 평균보다 낮음 (FRR-2024-312, 318)
    → 추가 분석 필요 (효과적이지 못한 review?)
    Action: Review effectiveness 추가 분석
    Due: 2024-12-15

Conclusion: Process largely compliant.
            1 Major finding requires immediate action.
            Quality concern raised (Observation).

Approval:
   SPA Auditor:        김OO   2024-10-15
   SPA Manager:        박OO   2024-10-18
```

## 3. Process Metrics — 정량 측정

ECSS의 *고유 강조점*. *측정해서 개선*.

### 핵심 Metrics

```
1. Process Compliance Rate
   = (정상 수행된 절차 수 / 총 절차 수) × 100%
   Target: > 95%

2. Defect Detection Rate (per phase)
   Requirements phase: 30-40%
   Design phase: 20-30%
   Code phase: 20-30%
   Verification phase: 5-10%
   Post-release: < 5%

   분포가 *예상과 다르면* 문제

3. Review Effectiveness
   = (Major + Minor issues found) / (Review hours)
   Target: 5-10 issues per hour

4. Test Coverage Trend
   매주 측정
   Target: 매 milestone에 specific target

5. Code Churn Rate
   = LoC changed / total LoC
   너무 높으면: 불안정 design
   너무 낮으면: insufficient feedback

6. Open NCR Count
   매주 측정
   Trend 중요 (증가 = 문제)

7. NCR Resolution Time
   Average days to close
   Target: < 30 days

8. Process Cycle Time
   Phase 진입 → 종료 일수
   Schedule slippage 검출
```

### Metrics 보고서 예

```
=== Monthly Process Metrics — September 2024 ===

Project: KOMPSAT-6
Reporting Period: 2024-09

1. Process Compliance Rate
   September: 96.4% (Target ≥ 95%) ✓
   Trend (last 6 months): 95.2 → 96.4 ✓ (개선)

2. Defect Detection by Phase
   Requirements:  35% (44 defects)
   Design:        28% (35 defects)
   Coding:        25% (32 defects)
   Verification:   8% (10 defects)
   Post-release:   4% (5 defects)
   → Distribution: HEALTHY (Requirements/Design 비중 적절)

3. Review Effectiveness
   September: 7.2 issues/hour
   Trend: 6.5 → 7.2 (개선)
   Target: 5-10 ✓

4. Test Coverage
   Statement:  98.5% (target 100% by next milestone)
   Decision:   95.2%
   MC/DC:      89.1% (Criticality A modules)

5. Code Churn
   This month: 4.2% of total LoC
   Average: 3.8%
   → Slightly elevated, monitor

6. Open NCR
   Beginning of month: 23
   Opened: 31
   Closed: 28
   End of month: 26
   → Slight increase. Monitor.

7. NCR Resolution Time
   Average: 18 days
   Target: < 30 ✓
   Distribution:
     < 7 days:  20%
     7-30 days: 65%
     > 30 days: 15% ← improve

8. Schedule
   Planned milestone: PDR (Preliminary Design Review)
   Actual: 1 week ahead of schedule ✓

Conclusions:
  - Overall: Process healthy
  - Watch: Code churn slightly elevated
  - Watch: NCR aging (15% over 30 days)
  - Improvement: Review effectiveness

Action Items:
  - Analyze code churn root cause (architectural drift?)
  - NCR aging review with engineering management
  - Continue review effectiveness improvement initiative
```

이런 *monthly report*가 *management visibility*. *문제 조기 발견*.

## 4. Process Tailoring — ECSS 특유

ESA는 *one-size-fits-all 거부*. 각 mission에 맞춰 *tailoring*.

### Tailoring 절차

```
1. Default: 모든 ECSS obj 적용
2. Project Manager: tailoring 제안
3. Justification: 왜 면제·완화 필요한가
4. Risk Analysis: tailoring으로 인한 위험
5. ESA / Customer 승인
6. Tailoring 문서화 (SPA Plan에)
7. 후속 audit에서 tailoring 준수 확인
```

### Tailoring 예 — Small Satellite

```
=== Tailoring Decision — CubeSat Project ===

Project: Korea Aerospace University CubeSat (1U)
Mission: Educational + Tech Demo
Budget: $500k
Schedule: 18 months
Team: 5 students + 2 advisors

Applied Standards:
  - ECSS-Q-ST-80C Rev.1 (full)
  - ECSS-E-ST-40C (full)
  - ECSS-Q-ST-30C (Dependability) — NOT APPLIED
  - ECSS-Q-ST-40C (Safety) — NOT APPLIED

Tailoring Decisions:

T-1: Independent ISVV not required
     Justification:
     - Educational project, not commercial
     - Tech demo only, no critical mission
     - Self-review by advisors deemed sufficient
     Risk Mitigation:
     - Increased advisor review involvement
     - Open source code review

T-2: Process metrics simplified
     Original: 8 metrics
     Tailored: 3 metrics (compliance, NCR, coverage)
     Justification: Resource constraints
     Risk Mitigation: Manual quality review

T-3: Document set reduced
     SDP / SVP / SCMP / SQAP → combined into single
                                  "Project Management Plan"
     Justification: Small team, single document easier
     Risk Mitigation: All content preserved, just consolidated

T-4: Formal review milestones reduced
     SRR / PDR / CDR / QR / AR (5) → SRR / CDR / AR (3)
     Justification: Schedule + cost
     Risk Mitigation: Informal weekly review with advisors

Approved by:
   Project Manager:        Prof. 김OO   2024-02-15
   Customer (KAIST):       박OO        2024-02-20
   ESA Liaison (advisor):  Dr. Lee     2024-02-25
```

이런 tailoring이 *작은 프로젝트의 ECSS 적용 가능성* 보장. *과부담 회피*.

### Tailoring vs DO-178C

```
DO-178C: Tailoring 거의 불가
  - 71 obj가 거의 모든 case에 적용
  - DAL이 면제 결정 (DAL E만 면제)

ECSS:   Tailoring 광범위 가능
  - 각 obj 별도 justification으로 면제 가능
  - Mission size, criticality, schedule 고려
  - 더 유연
```

ESA의 유연성이 *작은 회사·신생 우주에 접근성*.

## Audit Reports — 보관 + 추적

모든 audit이 *기록*. SPA의 *audit trail*.

```
=== Audit Records (annual summary) ===

2024 Audit Summary — KOMPSAT-6 Project

Total Audits:           12
  Compliance:            4 (quarterly)
  Document:              5 (after milestones)
  Process Effectiveness: 2 (semi-annual)
  Independence:          1 (annual external)

Total Findings:
  Major:                 8
  Minor:                23
  Observations:         15

Resolution Status (end of year):
  Major: 7 closed, 1 open (in remediation)
  Minor: 21 closed, 2 open
  Observations: 12 closed, 3 deferred

Trend (vs 2023):
  Compliance rate:     94.2% → 96.4% ✓
  Major findings:      12 → 8 ✓
  NCR resolution time: 32 days → 18 days ✓

Conclusions:
  - 측정 가능한 process 개선
  - Major finding 감소
  - 응답 시간 개선
  - 1 open Major: tracked for Q1 2025 closure
```

이런 *연간 보고*가 *ESA project review*에 제출.

## Independence — ECSS의 강조

DO-178C와 같이 *Independence 의무*. 하지만 ECSS는 *외부 ISVV*를 더 강조.

```
Independence 수준 (ECSS-Q-ST-80C §5.9.4):

Level 1: Same person, different time
  - 약한 independence
  - Criticality D 적용

Level 2: Different person, same team
  - Peer review
  - Criticality C 적용

Level 3: Different team, same organization
  - 조직 차원 분리
  - Criticality B 적용

Level 4: Different organization
  - External ISVV
  - Criticality A 의무
```

Criticality A = *외부 회사 검증*. Critical SW, SCISYS, Solenix 등 *유럽 ISVV 회사*.

## KARI 실제 적용 — KOMPSAT 사례

### KOMPSAT-3A (2015 발사)

```
SW criticality:
  AOCS (자세 제어):              A
  PMC (탑재체 관리):              B
  TT&C (Telemetry, Telecommand): A
  TM/TC encoder/decoder:          B

ECSS 적용:
  Process: ECSS-Q-ST-80C full
  Engineering: ECSS-E-ST-40C
  Dependability: ECSS-Q-ST-30C (A 모듈만)
  Tailoring: 학교 협력 일부 면제

ISVV:
  - Astrium 검증 (협력사가 자체 ISVV)
  - KARI 추가 internal review
```

### KOMPSAT-6 (2025 예정)

```
KARI 첫 자체 SAR 위성

SW criticality:
  SAR 처리:                       A
  AOCS:                            A
  TT&C:                            A
  Payload data handler:            B
  Star tracker integration:        B

ECSS 적용:
  Full ECSS-Q-ST-80C
  ECSS-E-ST-40C (full V-model)
  External ISVV (외주)

Process metrics:
  매월 측정 + 보고
  Trend analysis 의무
```

### 누리호 (KSLV-II)

발사체 SW는 *Criticality A의 극단*. 일부 ECSS 참고, *자체 표준 우선*.

## 한국 우주 산업 ISVV 인력

```
한국 ISVV 인력 (2024 추정):
  KARI internal QA:    ~30
  Hanwha ISVV team:    ~15
  외주 회사:
    - 한국항공우주 인력:  ~20
    - 자체 검증 컨설팅:   ~10

총: ~75명

비교 — ESA 권역:
  Critical SW:        ~150
  SCISYS:             ~80
  Solenix:            ~40
  기타:                ~200
  총: ~500명

한국 ISVV 인력 *상당히 부족*. 신규 우주 확장의 *큰 도전*.
```

## 시작하는 회사를 위한 SPA 도입 가이드

```
Phase 1 (0-3 months) — 인식
  - ECSS 표준 학습 (무료 다운로드)
  - 한국 KARI 사례 분석
  - 자사에 맞는 tailoring 검토

Phase 2 (3-6 months) — 인프라
  - SPA Manager 채용 (또는 trained)
  - SPA tool (DOORS, JIRA 등)
  - Metric 수집 시스템

Phase 3 (6-12 months) — 적용
  - 첫 작은 프로젝트에 ECSS
  - 점진적 expansion
  - 외부 review 참여

Phase 4 (1-2 years) — 성숙
  - ISVV 협력 관계 구축
  - ESA 미션 참여
  - 자체 ISVV capability 개발
```

## 정리

- SPA는 *개발 절차의 정확한 수행*을 *독립 검증*.
- ECSS는 DO-178C와 비슷하나 *process metric*과 *tailoring*을 더 강조.
- SPA Plan이 *모든 SPA 활동의 기준*.
- 4 종류 audit: Compliance, Document, Process Effectiveness, Independence.
- *정량 metric*: compliance rate, defect detection, review effectiveness, coverage, churn, NCR.
- *Tailoring*이 ECSS 유연성의 핵심 — 작은 프로젝트 적용 가능.
- Criticality A는 *외부 ISVV 의무*.
- KARI/KOMPSAT가 *국내 ECSS 적용의 선두*.
- 한국 ISVV 인력 부족 — 우주 산업 성장의 *큰 도전*.

## 다음 장 예고

3장은 *SW Product Properties Assurance* — 코드 quality metric, maintainability, testability의 정량 측정.

## 관련 항목

- [Ch 1 — ECSS 표준 체계](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter01-introduction)
- [Ch 3 — Product Properties Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter03-product-properties)
- [Ch 7 — ISVV](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter07-isvv)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [ECSS-Q-ST-80C Rev.1](https://ecss.nl/)
- [ECSS Tailoring Guidance](https://ecss.nl/standards/active-standards/)
- [KARI 공식](https://www.kari.re.kr/)
