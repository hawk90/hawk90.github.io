---
title: "Ch 5: SW Non-Conformance Control — NCR Workflow + Root Cause Analysis"
date: 2026-05-18T06:00:00
description: "ECSS-Q-ST-80C §5.6 — NCR 등록·분류·추적·종결. Root cause analysis 방법 (5-Why, Fishbone, FTA). Corrective Action Plan."
tags: [ecss, non-conformance, ncr, rca, fishbone, fta, corrective-action]
series: "ECSS-Q-ST-80C"
seriesOrder: 5
draft: false
---

ECSS의 *Non-Conformance Control*은 *결함 발견 → 분석 → 수정 → 재발 방지*의 closed-loop. 단순 *bug tracking* 이상이다. *Root cause analysis*가 의무이고, *Corrective Action*이 *similar bug 재발 차단*까지. *정확한 절차·deliverable은 ECSS-Q-ST-80C 원문 참조*.

## NCR의 정의 — ECSS-Q-ST-80C §5.6

> **Non-Conformance**: A departure of a software product property from specified requirements, or from agreed upon practices.

핵심:
- *결함* (defect)
- *spec 위반* (requirement non-compliance)
- *절차 위반* (process non-conformance)

DO-178C의 *Problem Report (PR)*에 해당하지만 *broader scope*. *코드 외에 절차 위반도 포함*.

## NCR vs PR vs CR — 비교

```
NCR (Non-Conformance Report)
  - 정의된 spec/standard에서 *벗어남*
  - 발견 후 *수정 의무*
  - ECSS, ISO 9001

PR (Problem Report)
  - 코드/시스템의 *결함*
  - DO-178C 용어
  - NCR의 subset

CR (Change Request)
  - 의도된 *변경 요청*
  - 결함 아님 (improvement)
  - 모든 표준 공통

관계:
  PR → CR (defect 발견 → 수정 요청)
  Process violation → NCR (PR 아니지만 NCR)
```

ECSS는 *모두 NCR* 통합. *broader umbrella*.

## NCR Classification

```
By Severity:
  Critical    : 미션 실패 또는 인명 손실 가능
  Major       : 미션 기능 손실
  Minor       : 사용자 불편, 기능 영향 미미
  Observation : 결함은 아니지만 개선 가능

By Type:
  Functional   : 기능 결함
  Performance  : 성능 미달
  Safety       : 안전 영향
  Security     : 보안 영향
  Documentation: 문서 부정확
  Process      : 절차 미준수
  Tool         : 도구 결함

By Origin:
  Internal review
  Customer review
  Test failure
  Field operation
  Audit finding
  External party (ESA, supplier)
```

## NCR Lifecycle

```
STATE          Action                    Owner
─────────────────────────────────────────────
OPEN           Initial registration      Originator
NEW            Triaged + assigned         NCR Manager
INVESTIGATING  Root cause analysis        Engineer
ANALYZED       Cause identified           Engineer + SPA
FIXING         Implementation             Engineer
FIXED          Code committed             Engineer
VERIFIED       Independent verification   QA / SPA
CLOSED         Confirmed resolved         SPA Manager

Side states:
  REJECTED     : Not a defect (with justification)
  DUPLICATE    : Already tracked
  DEFERRED     : Acknowledged, fix postponed
  WONT-FIX     : 결정적으로 fix 안 함 (드물게)
```

## NCR Form — ECSS Annex G template

ECSS-Q-ST-80C가 *공식 template* 제공.

```
=== NCR (일반 template) ===

Identification
  NCR ID:            [고유 ID]
  Date Reported:     [YYYY-MM-DD]
  Reported by:       [reporter]
  Project / Subsystem

Classification
  Severity:          Critical / Major / Minor / Observation
  Type:              Functional / Performance / Safety / Security / Doc / Process / Tool
  Origin:            Internal review / Test failure / Audit / Customer review / External

Description
  - 발견 사항 정확히
  - Expected vs Actual
  - 재현 조건 (parameters, reproducibility)

Affected SCIs
  - 영향 source / doc / test

Initial Assessment
  - Impact (technical, mission)
  - Workaround if available

Status / Assigned / Priority / Target Resolution
```

## Root Cause Analysis (RCA) — ECSS 의무

ECSS-Q-ST-80C §5.6.3.2: *Major + Critical NCR은 RCA 의무*.

### Method 1: 5-Why Analysis

```
일반 5-Why 흐름 (가상 예 — quaternion drift):

Why 1: 결과 / 증상의 이유?
  Because (mechanism)

Why 2: Why does that mechanism trigger?
  Because (immediate cause)

Why 3: Why was that cause not prevented?
  Because (process gap)

Why 4: Why did process gap exist?
  Because (organizational reason)

Why 5: Why did organizational reason exist?
  Because (systemic root)

ROOT CAUSE: technical + process 양쪽
```

5-Why는 *간단하지만 효과적*. Toyota Production System에서 시작, 항공·우주 광범위.

### Method 2: Fishbone (Ishikawa) Diagram

![Ishikawa Fishbone Diagram — 5 cause categories converging to effect](/images/blog/ecss-q-st-80c/diagrams/ch05-fishbone.svg)

Fishbone이 *multiple cause* 분석에 유리. 5M 카테고리 (People, Process, Tool, Method, Material) 기준으로 *cause 식별*. ECSS는 *Critical NCR*에 권장.

### Method 3: Fault Tree Analysis (FTA)

![Fault Tree Analysis — top event decomposed via OR/AND gates](/images/blog/ecss-q-st-80c/diagrams/ch05-fta.svg)

FTA는 *top event*를 *OR/AND gate*로 분해. 각 basic event의 *확률 × 게이트 logic*으로 *top event 확률 계산*. *Critical safety NCR*에 표준.

## Corrective Action Plan (CAP)

RCA 후 *재발 방지 계획*. ECSS-Q-ST-80C §5.6.4 의무.

```
=== Corrective Action Plan (일반 template) ===

Immediate (Corrective Action):
  CA-N: [기술적 fix — revert / patch / restore]
        Due, Owner, Verification

Short-term (Corrective Action):
  CA-N: [개선된 long-term solution]
        Due, Owner, Verification

Preventive Action (재발 방지):
  PA-N: [process update — checklist, training, tool rule 등]
        Due, Owner, Verification

Process Update:
  P-N: [SCMP / SDP / SVP 문서 개정]
       CCB 승인 필요

Tracking:
  Each action: NCR sub-ticket
  Weekly status update
  Closure verified by SPA Manager
```

이 *CAP가 ECSS의 핵심 차별점*. *기술적 fix + process improvement* 양쪽.

## NCR Statistics — Trend Analysis

NCR이 *축적되면 통계*. *Process health 진단*.

```
=== NCR Quarterly Report (일반 template) ===

Q3 NCR Activity:
  Opened:     47
  Closed:     38
  Net change: +9
  Total open at end: 26

Distribution by Severity:
  Critical:    0 (0%)
  Major:       8 (17%)
  Minor:      31 (66%)
  Observation: 8 (17%)

Distribution by Type:
  Functional:    18 (38%)
  Performance:    7 (15%)
  Safety:         2 (4%)
  Security:       1 (2%)
  Documentation: 12 (26%)
  Process:        5 (11%)
  Tool:           2 (4%)

Distribution by Origin:
  Internal review:  21 (45%)
  Test failure:     15 (32%)
  Audit:             6 (13%)
  Customer review:    3 (6%)
  External:           2 (4%)

Distribution by Phase Detected:
  Requirements:      8 (17%)
  Design:            12 (26%)
  Coding:            15 (32%)
  Integration test:  9 (19%)
  System test:       3 (6%)
  → Distribution: HEALTHY (early detection)

Average Resolution Time:
  Critical: N/A (none)
  Major:    18 days (target < 30) ✓
  Minor:    22 days (target < 30) ✓
  Observation: 35 days (slow, lower priority)

Recurring Themes (RCA):
  - "Change impact analysis incomplete" (3 NCR이 이 root cause)
    → Process update PA-1 (NCR-K6-2024-247)
  - "Algorithm robustness gap" (5 NCR)
    → Training PA-2

Trend vs Q2:
  Total open: 18 → 26 (증가)
  Major rate: 12 → 17% (증가)
  → Watch: Q4에 추가 모니터링

Conclusions:
  - Overall: Acceptable
  - Major increase: 코드 churn 증가와 상관 (Ch 3 metric)
  - Resolution time: Good
  - Recurring theme: PA-1, PA-2 implementation 추적
```

이 *trend report*가 *management 의사결정*. *Process 개선 방향*.

## Defect Density 계산

ECSS는 *defect density*를 *quality metric*으로.

```
Defect Density Definition:
  = (Total defects found) / (Total LoC) × 1000
  = defects per KLoC

When measured:
  Cumulative: 프로젝트 시작부터 누적
  Phase-specific: 각 phase의 defect

Industry benchmarks:
  Aerospace average: 0.5 - 2.0 per KLoC
  Critical SW (DAL A/Crit A): 0.1 - 0.5 per KLoC
  Commercial software: 5 - 15 per KLoC

Project target은 *criticality / mission*에 따라 결정.
```

### Calculating Defect Removal Efficiency (DRE)

```
DRE = (Defects found in development) /
      (Defects found in development + Field defects)
    × 100%

Target: > 95% (일반적)
```

높은 DRE가 *ECSS verification의 효과* 지표 중 하나.

## In-Orbit NCR — 특수 처리

발사 후 발견된 NCR은 *완전 다른 process*.

```
=== In-orbit NCR Procedure ===

1. Detection
   - Operations team이 anomaly 발견
   - Ground station data 분석
   - Pattern emergence

2. Initial Triage
   - Severity assessment
   - Spacecraft 즉각 위협? → Safe Mode 진입 권한
   - 즉각 위협 X → Investigation 시작

3. Investigation (ground)
   - Engineering team 소집
   - 가능한 모든 telemetry 분석
   - Simulation 재현
   - Vendor 연락 (필요 시)

4. Workaround
   - 즉각 적용 가능한 운영 변경
   - 예: Sensor 사용 방식 변경

5. Permanent Fix
   - Ground SW 개발
   - HIL 시뮬레이션 검증
   - Customer + ESA approval
   - In-orbit upload (Ch 4 절차)

6. Closure
   - Fix 확인 (수주~수개월 monitoring)
   - Lessons learned 문서화
   - 다음 mission에 반영
```

### In-Orbit NCR — 일반 패턴

위성·우주선의 *in-orbit NCR*은 일반적으로 다음 패턴:

```
1. Detection — operations team이 anomaly 식별
2. Initial triage — severity + safe-mode 여부
3. Investigation (수주~수개월) — telemetry 분석, vendor 자문, simulation 재현
4. Workaround — 즉각 적용 가능한 operational 변경
5. Permanent fix — ground SW + HIL test + customer approval + in-orbit upload
6. Verification — 수주~수개월 monitoring
7. Lessons learned — 다음 mission에 반영

특성:
  - 비용 큼 (수 person-month 이상)
  - 시간 큼 (수개월)
  - Mission impact (degraded operation 가능)
```

이런 *비싼 in-orbit NCR* 때문에 *pre-launch에 최대 발견*이 목표.

## Tool — NCR Management

```
ESA 표준 도구:
  IBM Rational Quality Manager (RQM)
  IBM DOORS Next Gen (RTC integration)
  Jira (점차 표준)
  Polarion (Siemens)
  Custom (Airbus 자체 시스템)

일반 stack 예:
  Jira (NCR tracking)
  Requirements tool (linked to req)
  Wiki (RCA documentation)
  Dashboard tool

Open source:
  Bugzilla (legacy)
  Redmine
  GitLab Issues
```

## Customer/Supplier Coordination

ECSS는 *다국가 협력*이 흔함. NCR을 *공유* 시 표준 필요.

```
Cross-organization NCR sharing:
  - 공통 format (ECSS Annex G)
  - Shared classification
  - Anonymization (proprietary info 제거)
  - Lessons learned database

일반 collaboration 패턴:
  - 공통 NCR database (혹은 export 가능 format)
  - 정기 cross-review meeting
  - Lessons learned 공유
  - Anonymized statistics 외부 공유
```

## NCR ↔ FRACAS

방산·항공에서 *FRACAS (Failure Reporting, Analysis, and Corrective Action System)*이 NCR과 유사.

```
FRACAS:
  - DoD MIL-STD-2155 + 자체
  - Failure 중심 (NCR보다 narrow)
  - 통계적 분석 강조
  - Reliability prediction

ECSS NCR:
  - 모든 non-conformance 포함
  - Process violation도
  - Less reliability-focused
  - More process improvement-focused

Tool overlap:
  많은 회사가 FRACAS + NCR을 *통합 system*에서 운영
```

## NCR과 Risk Management

NCR이 *risk indicator*. ECSS-M-ST-80C (Risk Management)와 연결.

```
NCR Trend → Risk Impact:

증가 trend:
  → Risk: Project schedule slip
  → Risk: Quality degradation
  → Action: Resource increase

Critical NCR 발생:
  → Risk: Mission failure
  → Action: Risk register update
  → Action: Customer notification

Recurring root cause:
  → Risk: Process inadequacy
  → Action: Process improvement project
```

NCR과 Risk가 *서로 영향*. 통합 관리 필요.

## NCR Workflow Automation

```python
# Pseudo-code: Jira NCR workflow automation

def on_ncr_created(ncr):
    # Auto-classification
    severity = analyze_keywords(ncr.description)
    ncr.severity = severity

    # Auto-assignment
    if ncr.module in module_to_owner:
        ncr.assignee = module_to_owner[ncr.module]

    # Priority + SLA
    if severity == 'Critical':
        ncr.priority = 'P0'
        ncr.sla_days = 7
        send_alert(team_lead, ncr)
    elif severity == 'Major':
        ncr.priority = 'P1'
        ncr.sla_days = 30

def on_ncr_status_change(ncr, old_status, new_status):
    if new_status == 'ANALYZED':
        # Check RCA documented
        if not ncr.rca_document_attached:
            raise WorkflowError("RCA required before status change")

    if new_status == 'FIXED':
        # Check commit linked
        if not ncr.linked_commits:
            raise WorkflowError("Fix commit required")

    if new_status == 'CLOSED':
        # Independent verification required
        if not ncr.verifier or ncr.verifier == ncr.fixer:
            raise WorkflowError("Independent verification required")

def daily_report():
    for ncr in get_overdue_ncrs():
        notify_assignee_and_lead(ncr)
        if ncr.days_overdue > 7:
            escalate_to_manager(ncr)

def weekly_metric_collection():
    metrics = {
        'opened_this_week': count_ncrs_opened(),
        'closed_this_week': count_ncrs_closed(),
        'aging_distribution': bucket_by_age(),
        'top_root_causes': aggregate_root_causes(),
    }
    publish_to_dashboard(metrics)
```

Automation이 *NCR 관리 부담 감소*. 수동 작업 → tool.

## Common NCR Pitfalls

```
1. RCA가 "fix and move on" — Process improvement 누락
   교훈: 모든 Major NCR이 *Preventive Action* 가져야

2. NCR이 누적 (aging)
   교훈: SLA + escalation procedure

3. Same root cause 반복
   교훈: Pattern 분석 + process 개선

4. NCR이 단순 bug tracker로 격하
   교훈: Process violation, doc error 등 포함

5. Customer에 늦은 통보
   교훈: Critical/Major는 즉시 통보 의무

6. RCA가 "human error"로 종결
   교훈: 항상 *system fix* 가능 (training, checklist, tool)
```

## NCR 운영 — 일반 dashboard 구조

```
=== NCR Dashboard (일반 구조) ===

Active projects: [count]
Total NCR open / closed (period)

Distribution by:
  - Severity (Critical / Major / Minor / Observation)
  - Origin (Test failure / Internal review / Audit / Customer / External)
  - Type (Functional / Performance / Safety / etc.)

RCA outcomes (Major+ NCR):
  - Process improvement count
  - Training need
  - Tool gap

Average resolution time (target < N days per severity)
```

이런 정량 데이터로 *process health 추적* + *trend 분석*.

## 정리

- NCR이 *결함 + 절차 위반*의 broader umbrella.
- Severity (Critical/Major/Minor/Observation) + Type + Origin 분류.
- Lifecycle: Open → Analyzing → Analyzed → Fixing → Fixed → Verified → Closed.
- Major+ NCR은 *RCA 의무*. 5-Why, Fishbone, FTA 방법.
- *Corrective Action* + *Preventive Action* 양쪽 필요.
- Defect Density, DRE 같은 *정량 metric*.
- In-orbit NCR은 *완전 다른 procedure* — 비싸고 복잡.
- Tool: Jira, DOORS, RTC, Custom dashboard.
- 자동화로 *NCR 관리 부담 감소*.

## 다음 장 예고

6장은 *SW Procurement Assurance* — 외부 SW (COTS, OSS, supplier) 인수 절차.

## 관련 항목

- [Ch 4 — Configuration Management](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter04-configuration-management)
- [Ch 6 — Procurement](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter06-procurement)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [ECSS-Q-ST-80C §5.6](https://ecss.nl/)
- [ECSS-M-ST-80C Risk Management](https://ecss.nl/)
- [Jira Software](https://www.atlassian.com/software/jira)
