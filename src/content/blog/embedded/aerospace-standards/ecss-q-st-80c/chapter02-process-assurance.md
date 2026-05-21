---
title: "Ch 2: SW Process Assurance — 개발 절차 보증"
date: 2026-05-18T03:00:00
description: "ECSS-Q-ST-80C — SPA Plan 작성, process metrics, periodic audit, tailoring."
tags: [ecss, spa, process-assurance, audit, review, tailoring]
series: "ECSS-Q-ST-80C"
seriesOrder: 2
draft: false
---

ECSS-Q-ST-80C의 *9개 핵심 활동* 중 가장 큰 비중을 차지하는 *SW Process Assurance (SPA)*. *개발 절차가 정해진 대로 수행되는지*를 *독립적으로 검증*한다. DO-178C의 SQA에 해당하지만 *ESA 특유의 process tailoring* 개념이 더해진다. *정확한 절차·deliverable은 ECSS-Q-ST-80C 원문 참조*.

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

**1. Process Assurance Planning (SPA Plan 작성)**


**2. Process Audit Execution**


**3. Process Metric Collection + Analysis**


**4. Process Improvement**

## 1. SPA Plan — Software Process Assurance Plan

DO-178C의 SQAP에 해당. ECSS에서는 별도 문서.

### SPA Plan 구조

**1. Introduction**

- Project context
- Scope
- Applicable documents

**2. Process Assurance Organization**

- SPA team 구조
- 독립성 보장
- Roles + responsibilities

**3. Process Assurance Activities**

- Planning
- Audits
- Reviews
- Reporting

**4. Process Assurance Resources**

- Tool
- Skills
- Effort

**5. Process Tailoring (ECSS 특유)**

- 적용 ECSS 표준 목록
- Tailoring 결정 (어느 obj 면제)
- 정당화

**6. Process Metrics**

- 측정 항목
- 수집 절차
- 분석 + 보고

**7. Audit Plan**

- Schedule
- Scope
- Method

**8. Non-Conformance Process**

- NCR (Non-Conformance Report) workflow
- Escalation
- Corrective Action tracking

**9. Independence Justification**

- 조직 차원
- 재정 차원
- 기술 차원

**10. Records**

- Audit records
- Finding records
- Metric records

### SPA Plan 작성 — 일반 template

```
=== SPA Plan (일반 template) ===

1. Introduction
   Project context, scope, SW components + criticality

2. Process Assurance Organization
   SPA Manager + team (개발 조직과 분리)
   Reports to Quality Director (independent chain)

3. Process Assurance Activities
   3.1 Planning (version control, annual review)
   3.2 Audits (Process / Product / Lifecycle)
   3.3 Reviews (SPA observer 참석)

4. Process Tailoring
   Applied Standards 목록 (Q-ST-80C, E-ST-40C, Q-ST-30C, Q-ST-40C 등)
   각 Criticality별 tailoring 결정 + rationale

5. Process Metrics (매월 수집)
   - Compliance rate
   - Defect detection rate
   - Review effectiveness
   - Test coverage trend
   - Code churn rate
   - Open NCR count, resolution time

6. Audit Plan (분기별 schedule)

7. Non-Conformance Process
   - NCR 등록 → SPA review → 통보
   - 응답 timeline + escalation 규칙

8. Independence
   - 조직 차원 (분리된 reporting)
   - 재정 차원 (별도 budget)
   - 기술 차원 (외부 ISVV)

Approved chain:
   SPA Manager → Quality Director → Project Manager
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

**1. Planning (audit 1주 전)**

- Audit scope 결정 (어느 process, 어느 시기)
- Sample 선택 (random 5-10 module)
- Checklist 준비

**2. Notification (audit 3일 전)**

- 개발팀 통보
- 자료 요청

**3. Execution (audit 1-2일)**

- Sample module의 산출물 review
- 개발팀 interview
- 절차 준수 확인
- Finding 기록

**4. Reporting (audit 후 1주)**

- Audit report 작성
- Findings 분류 (Major/Minor/Observation)
- 개발팀 response 요청

**5. Follow-up (audit 후 4주)**

- Corrective action 검증
- NCR closure 또는 escalation

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

**1. Process Compliance Rate**

- = (정상 수행된 절차 수 / 총 절차 수) × 100%
- Target: > 95%

**2. Defect Detection Rate (per phase)**

- Requirements phase: 30-40%
- Design phase: 20-30%
- Code phase: 20-30%
- Verification phase: 5-10%
- Post-release: < 5%

분포가 *예상과 다르면* 문제

**3. Review Effectiveness**

- = (Major + Minor issues found) / (Review hours)
- Target: 5-10 issues per hour

**4. Test Coverage Trend**

- 매주 측정
- Target: 매 milestone에 specific target

**5. Code Churn Rate**

- = LoC changed / total LoC
- 너무 높으면: 불안정 design
- 너무 낮으면: insufficient feedback

**6. Open NCR Count**

- 매주 측정
- Trend 중요 (증가 = 문제)

**7. NCR Resolution Time**

- Average days to close
- Target: < 30 days

**8. Process Cycle Time**

- Phase 진입 → 종료 일수
- Schedule slippage 검출

### Metrics 보고서 — 일반 template

```
=== Monthly Process Metrics (일반 template) ===

1. Process Compliance Rate (target ≥ 95%)
   - 이번 달 수치 + 추세

2. Defect Detection by Phase
   - Requirements / Design / Coding / Verification / Post-release 분포
   - 분포가 예상 외면 문제 가능

3. Review Effectiveness (issues per review hour)
   - Target 5-10

4. Test Coverage (Statement / Decision / MC/DC)

5. Code Churn (% of total LoC)
   - 너무 높으면 design 불안정
   - 너무 낮으면 feedback 부족

6. Open NCR count + trend

7. NCR Resolution Time (average days, target < 30)

8. Schedule (milestone status)

Conclusions + Action Items
```

이런 *monthly report*가 *management visibility*에 활용. *문제 조기 발견* 목적.

## 4. Process Tailoring — ECSS 특유

ESA는 *one-size-fits-all 거부*. 각 mission에 맞춰 *tailoring*.

### Tailoring 절차

**1. Default: 모든 ECSS obj 적용**


**2. Project Manager: tailoring 제안**


**3. Justification: 왜 면제·완화 필요한가**


**4. Risk Analysis: tailoring으로 인한 위험**


**5. ESA / Customer 승인**


**6. Tailoring 문서화 (SPA Plan에)**


**7. 후속 audit에서 tailoring 준수 확인**

### Tailoring 예 — 작은 mission (가상)

```
=== Tailoring Decision (가상 작은 mission) ===

Context: 교육·기술 검증 cube-sat 수준
Resources: 적음 (학생 팀 + advisor)

Applied Standards:
  - ECSS-Q-ST-80C, ECSS-E-ST-40C (full or tailored)
  - Dependability / Safety: 적용 / 미적용 결정

Tailoring Decisions (예시):

T-1: Independent ISVV not required
     Justification:
       - Educational, not commercial mission
       - Self-review by advisors deemed sufficient
     Risk Mitigation:
       - Increased advisor review involvement

T-2: Process metrics simplified (8 → 3)

T-3: Document set reduced (SDP/SVP/SCMP/SQAP → 1 PMP)

T-4: Formal review milestones 줄임 (5 → 3)

Approved chain:
   Project Manager → Customer → External liaison
```

이런 tailoring이 *작은 프로젝트의 ECSS 적용 가능성* 보장. *과부담 회피*. 정확한 tailoring rule은 *ECSS tailoring 가이드 (ECSS-S-ST-00C-Rev.1 등)* 참조.

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
=== Annual Audit Summary (일반 template) ===

Total Audits:           [숫자]
  Compliance:            [분기별 등]
  Document:              [milestone마다]
  Process Effectiveness: [semi-annual 등]
  Independence:          [annual external]

Total Findings (severity별 count)

Resolution Status (end of year)

Trend (vs 이전 연도)
  - Compliance rate
  - Major finding 수
  - NCR resolution time

Conclusions + open item 추적
```

이런 *연간 보고*가 *project review*에 제출.

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

Criticality A는 일반적으로 *외부 회사 ISVV*. 유럽에 *Critical Software, CGI/SCISYS, Solenix* 등의 회사가 있다. 자세히는 Ch 7.

## 시작하는 회사를 위한 SPA 도입 — 일반 가이드

```
Phase 1 (인식)
  - ECSS 표준 학습 (무료 다운로드)
  - 자사 mission에 맞는 tailoring 검토

Phase 2 (인프라)
  - SPA Manager (또는 trained 역할)
  - Tool 설정 (requirements / NCR tracker / configuration)
  - Metric 수집 시스템

Phase 3 (적용)
  - 첫 작은 프로젝트에 ECSS
  - 점진적 expansion
  - 외부 review 참여

Phase 4 (성숙)
  - ISVV 협력 관계
  - 자체 capability 개발
```

각 phase의 *기간·비용*은 *조직 / mission*마다 다르다.

## 정리

- SPA는 *개발 절차의 정확한 수행*을 *독립 검증*.
- ECSS는 DO-178C와 비슷하나 *process metric*과 *tailoring*을 더 강조.
- SPA Plan이 *모든 SPA 활동의 기준*.
- 4 종류 audit: Compliance, Document, Process Effectiveness, Independence.
- *정량 metric*: compliance rate, defect detection, review effectiveness, coverage, churn, NCR.
- *Tailoring*이 ECSS 유연성의 핵심 — 작은 프로젝트 적용 가능.
- Criticality A는 일반적으로 *외부 ISVV 의무*.
- 정확한 wording·deliverable·승인 기준은 *ECSS-Q-ST-80C 원문*.

## 다음 장 예고

3장은 *SW Product Properties Assurance* — 코드 quality metric, maintainability, testability의 정량 측정.

## 관련 항목

- [Ch 1 — ECSS 표준 체계](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter01-introduction)
- [Ch 3 — Product Properties Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter03-product-properties)
- [Ch 7 — ISVV](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter07-isvv)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [ECSS-Q-ST-80C Rev.1](https://ecss.nl/)
- [ECSS Tailoring Guidance](https://ecss.nl/standards/active-standards/)
