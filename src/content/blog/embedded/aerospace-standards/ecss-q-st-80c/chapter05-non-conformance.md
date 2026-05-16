---
title: "Ch 5: SW Non-Conformance Control — NCR Workflow + Root Cause Analysis"
date: 2025-10-05T06:00:00
description: "ECSS-Q-ST-80C §5.6 — NCR 등록·분류·추적·종결. Root cause analysis 방법 (5-Why, Fishbone, FTA). Corrective Action Plan."
tags: [ecss, non-conformance, ncr, rca, fishbone, fta, corrective-action]
series: "ECSS-Q-ST-80C"
seriesOrder: 5
draft: false
---

ECSS의 *Non-Conformance Control*은 *결함 발견 → 분석 → 수정 → 재발 방지*의 closed-loop. 단순 *bug tracking* 이상이다. *Root cause analysis*가 의무이고, *Corrective Action*이 *similar bug 재발 차단*까지. 이 장은 *NCR workflow + RCA 방법 + 실제 KARI 적용*까지.

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
=== Non-Conformance Report NCR-K6-2024-247 ===

Identification
  NCR ID:            NCR-K6-2024-247
  Date Reported:     2024-09-12
  Reported by:       박OO (Test Engineer)
  Project:           KOMPSAT-6
  Subsystem:         AOCS

Classification
  Severity:          Major
  Type:              Functional
  Origin:            Test failure (Integration Test)

Description
  TC-AOCS-INT-042 (Attitude Recovery from Tumble) 실행 시,
  quaternion magnitude가 1.0에서 1.0023으로 drift.
  Expected: |q| = 1.0 ± 0.0001 (per LLR-AC-053)
  Actual: |q| = 1.0023 (over 30 sec simulation)

  Test parameters:
    Initial tumble rate: 5 deg/sec all axes
    Simulation duration: 30 seconds
    Sample rate: 100 Hz

  Repro: 100% reliable (same input → same drift)

Affected SCIs
  K6-AOCS-SRC-quaternion_math.c-2.1.0 (suspected)
  K6-AOCS-SRC-attitude_estimator.c-2.0.3 (possibly)
  K6-AOCS-LLR-LLR-AC-053-1.3.0 (requirement clarification?)
  TC-AOCS-INT-042-1.0 (test correctness?)

Initial Assessment
  Impact: Attitude pointing accuracy degradation
  Mission impact: SAR image quality may degrade
  Workaround: Force renormalization every 100 cycles (CR pending)

Status: OPEN
Assigned to: 김OO (Algorithm Engineer)
Priority: P1 (Major + on critical path)
Target Resolution: 2024-09-26 (2 weeks)

[다음 단계 — Investigation 진행]
```

## Root Cause Analysis (RCA) — ECSS 의무

ECSS-Q-ST-80C §5.6.3.2: *Major + Critical NCR은 RCA 의무*.

### Method 1: 5-Why Analysis

```
NCR-K6-2024-247: Quaternion magnitude drift

Why 1: Quaternion drifts from 1.0?
  Because Ch3-Ch4의 normalization 매 10 step으로 변경
  (CR-2024-089으로 인한 변경)

Why 2: Why does 10-step interval cause drift?
  Because integration error accumulates over more steps
  Floating point precision insufficient at 10 step interval

Why 3: Why was 10-step interval considered safe in CR-2024-089 analysis?
  Because analysis assumed *quasi-static* conditions
  Tumble (5 deg/sec) is *highly dynamic*

Why 4: Why didn't the analysis include tumble scenario?
  Because the analyst (김OO) used *cruise mode* assumptions only
  Tumble + recovery scenario not in test matrix

Why 5: Why was the test matrix incomplete?
  Because change impact analysis didn't include *operational mode coverage*
  Process gap: No checklist for change impact mode coverage

ROOT CAUSE:
  Technical: 10-step normalization inadequate for high-dynamic scenarios
  Process:   Change impact analysis missed operational mode coverage
```

5-Why는 *간단하지만 효과적*. Toyota Production System에서 시작, 항공·우주 광범위.

### Method 2: Fishbone (Ishikawa) Diagram

```
              ┌────────────────────────────────────────────┐
              │                                                │
              │              Quaternion Drift                  │
              │                                                │
              └────────────────────────────────────────────────┘
                      │
       ┌─────────┬────┴────┬────────┬─────────┐
       │         │         │         │           │
   People     Process    Tool     Method    Material
       │         │         │         │           │
       │         │         │         │           │
김OO 분석      Change      QAC      10-step    Floating
경험 부족      impact      false   normalize  point
              missed mode  positive  (CR-089)  precision
              coverage    only      변경
       │         │         │         │           │
       │         │         │         │           │
   Training    Checklist  Tool     Algorithm   Hardware
   부족        update      update   re-design   upgrade
   필요        필요         필요    필요         (long-term)

Root causes identified:
  Primary:   Change impact missed mode coverage (Process)
  Secondary: Insufficient training on algorithm fragility (People)
  Tertiary:  Tool didn't catch drift (Tool gap)
```

Fishbone이 *multiple cause* 분석에 유리. ECSS는 *Critical NCR*에 권장.

### Method 3: Fault Tree Analysis (FTA)

```
                  Top Event:
        ┌──────────────────────────┐
        │ Quaternion drift > spec  │
        └──────────────┬─────────────┘
                       │
                       │ OR
        ┌──────────────┼──────────────────┐
        │              │                    │
   ┌────▼────┐   ┌─────▼─────┐      ┌──────▼──────┐
   │ Normali- │  │ Integration│       │ Initial value│
   │ zation   │  │ error      │       │ wrong       │
   │ infreq.   │  │ accumulate │       │             │
   └────┬────┘   └─────┬─────┘      └─────────────┘
        │              │
        │              │ AND
   ┌────▼────┐   ┌─────▼─────┐
   │CR-089    │  │ Quaternion │
   │implemented│  │ math      │
   │           │  │ precision  │
   └─────────┘   └───────────┘

Probability:
  Top event: P(quaternion drift)
           = P(infrequent normalization) AND P(integration error)
           = high × high
           ≈ 0.95 (under tumble conditions)
```

FTA가 *Critical safety NCR*에 표준. *수학적 확률 계산*.

## Corrective Action Plan (CAP)

RCA 후 *재발 방지 계획*. ECSS-Q-ST-80C §5.6.4 의무.

```
=== Corrective Action Plan for NCR-K6-2024-247 ===

Immediate (Corrective Action):
  CA-1: quaternion_math.c v2.1.0 → revert to v2.0.0
        (full per-step normalization restored)
        Due: 2024-09-19
        Owner: 김OO
        Verification: TC-AOCS-INT-042 re-pass

Short-term (Corrective Action):
  CA-2: 더 효율적인 normalization 방법 연구
        Renormalize every N cycles, where N is adaptive
        based on dynamic mode
        Due: 2024-10-31
        Owner: 김OO + 박OO
        Verification: TC-AOCS-INT-042 + 5 new tumble tests

Long-term (Preventive Action — 재발 방지):
  PA-1: Change impact analysis checklist 업데이트
        Include "operational mode coverage" 항목
        Due: 2024-09-30
        Owner: SPA Manager
        Affected document: SCMP §4.3

  PA-2: Algorithm robustness training
        모든 algorithm engineer 대상
        Topic: numerical stability, edge cases, dynamic conditions
        Due: 2024-11-30
        Owner: Engineering Manager
        Verification: Training records + test by trainer

  PA-3: Static analysis tool update
        Polyspace에 *floating point drift detection* rule 추가
        검토 후 적용
        Due: 2024-12-31
        Owner: Tool Manager

Process Update:
  P-1: SCMP §4.3 (Change Impact Analysis) 개정
       "Mode coverage 검증" 항목 추가
       CCB 승인 필요

  P-2: Code review checklist 업데이트
       Algorithm change 시 "robustness test" 항목 추가

Tracking:
  Each action assigned NCR sub-ticket
  Weekly status update
  Closure verified by SPA Manager
```

이 *CAP가 ECSS의 핵심 차별점*. *기술적 fix + process improvement* 양쪽.

## NCR Statistics — Trend Analysis

NCR이 *축적되면 통계*. *Process health 진단*.

```
=== NCR Quarterly Report — Q3 2024 (KOMPSAT-6) ===

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

KOMPSAT-6 target: < 1.0 per KLoC (overall)
```

### Calculating Defect Removal Efficiency (DRE)

```
DRE = (Defects found in development) /
      (Defects found in development + Field defects)
    × 100%

Target: > 95% (excellent)

KOMPSAT-3A operational data (5 years):
  Pre-launch defects:  1,247
  In-orbit defects:      18
  DRE = 1247 / (1247 + 18) = 98.6% ✓ (excellent)
```

높은 DRE가 *ECSS의 verification 효과*를 입증.

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

### In-Orbit NCR 예 — KOMPSAT-3A

```
=== In-Orbit NCR K3A-IO-2018-005 ===

Date: 2018-07-15
Anomaly: Star tracker intermittent failure
  - 약 1주에 1회 invalid attitude reading
  - 항상 spacecraft entry/exit eclipse 부근

Investigation (3 months):
  - Telemetry 분석: 온도 + radiation 상관
  - Vendor (Jena-Optronik) 자문
  - Simulation: thermal cycling 영향

Root cause:
  Star tracker firmware의 *temperature compensation*이
  특정 thermal gradient에서 부정확. 알려진 firmware issue
  (vendor에 logged), but K3A는 patched 전 firmware

Workaround (2018-08, immediate):
  Operations team이 invalid reading 발생 시
  *gyro-only attitude estimation* fallback (2 hours)

Permanent Fix (2018-12):
  Vendor patched firmware upload
  - Patch package preparation: 1 month
  - Ground test: 1 month
  - Customer approval: 2 weeks
  - Upload window: 1 day
  - Verification: 2 months monitoring

Outcome:
  - In-orbit upload successful
  - Anomaly rate: weekly → 0 (zero over next 5 years)
  - Lessons learned: KOMPSAT-6 procurement에 반영
                     (Star tracker patched firmware 의무화)

Effort: ~6 person-months
Cost: ~$500k
Mission Impact: 4 months degraded operation
```

In-orbit NCR이 *비싸고 복잡*. 그래서 *pre-launch에 최대 발견*이 목표.

## Tool — NCR Management

```
ESA 표준 도구:
  IBM Rational Quality Manager (RQM)
  IBM DOORS Next Gen (RTC integration)
  Jira (점차 표준)
  Polarion (Siemens)
  Custom (Airbus 자체 시스템)

KARI Tool Stack (2024):
  Jira (NCR tracking)
  DOORS (linked to req)
  Confluence (RCA documentation)
  Custom dashboard (Power BI)

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

Examples:
  KARI - Airbus DS (KOMPSAT-7A 협력):
    공통 NCR database
    매월 cross-review meeting
    Lessons learned 공유

  KARI - ESA (research collaboration):
    제한적 NCR 공유
    Anonymized statistics
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

## KARI NCR System — 운영 데이터

```
KARI 2024 NCR 통계 (전 mission 합):

Projects active:    5 (KOMPSAT-6, 7A, GEO-KOMPSAT-3, 누리호, 차세대중형위성)
Total NCR open:     ~150
Total NCR closed (2024): ~480

By severity:
  Critical: 2 (in-orbit, KOMPSAT-3A — fixed)
  Major: 35 (15% of total)
  Minor: 380 (79%)
  Observation: 13

By origin:
  Test failure: 240 (50%)
  Internal review: 145 (30%)
  Audit: 60 (13%)
  Customer: 25 (5%)
  External: 10 (2%)

RCA outcomes:
  Process improvement: 22 (Major NCR의 63%)
  Training need: 8
  Tool gap: 5

Average resolution:
  Critical: 14 days
  Major: 21 days
  Minor: 28 days
```

데이터로 *process health 추적*. *trend 분석*.

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
