---
title: "Ch 7: ISVV — Independent Software Verification & Validation"
date: 2025-10-05T08:00:00
description: "ECSS의 특징 — 외부 독립 V&V 팀. ISVV 활동, ESA 표준 procedure, 한국 적용 (KARI 협력사)."
tags: [ecss, isvv, verification, validation, independence, esa, kari]
series: "ECSS-Q-ST-80C"
seriesOrder: 7
draft: false
---

ECSS의 *가장 특징적인* 활동 — **ISVV (Independent Software Verification & Validation)**. DO-178C는 *Independence*를 *조직 내 분리*로 충족 가능하나 ECSS는 *별도 회사*로 강제. *Criticality A/B 의무*. *유럽 우주 산업의 ISVV 회사*가 *수십 년 형성한 ecosystem*. 이 장은 *ISVV 활동, 산업 실태, 한국 적용*까지.

## ISVV의 정의 — ECSS-Q-ST-80C §5.9

> **Independent Software Verification and Validation**: V&V activities performed by an organization that is technically, managerially, and financially independent of the development organization.

핵심 — *3 차원 독립*:

```
1. Technical Independence
   - 별도 도구
   - 별도 방법론
   - 독립적 분석

2. Managerial Independence
   - 별도 reporting chain
   - 별도 조직
   - 결정 권한 분리

3. Financial Independence
   - 별도 funding
   - 별도 budget
   - 가능하면 별도 회사
```

DO-178C의 *Independence*는 *조직 내 다른 팀*도 가능. ECSS의 *ISVV*는 *별도 회사 권장*.

## ISVV 적용 — Criticality별

```
Criticality   ISVV 의무   Independence Level
─────────────────────────────────────────
A             의무        Level 4 (separate organization)
B             의무        Level 3 (separate team in same org)
C             권장        Level 2 (peer review with different person)
D             optional   Level 1 (self-review)
```

Criticality A/B = *외부 회사 ISVV*. Criticality C는 *프로젝트 결정*. D는 *자체 가능*.

## ISVV vs Internal V&V — 차이

```
Internal V&V (개발 회사 자체):
  - 같은 도구, 같은 환경
  - 같은 mindset
  - Confirmation bias 위험
  - 빠르고 저렴

ISVV (외부 회사):
  - 다른 도구 + 방법
  - Fresh perspective
  - Confirmation bias 차단
  - 비싸고 느림

조합:
  Internal V&V가 *first level*
  ISVV가 *second level* — 외부 검증으로 신뢰 강화
```

ECSS는 *조합 권장*. ISVV가 internal V&V를 *대체하지 않음*.

## ISVV의 7 Activities (ECSS-Q-ST-80C Annex K)

```
1. ISVV Planning
2. Requirements V&V
3. Design V&V
4. Code V&V
5. Test V&V
6. Process Audit
7. Anomaly Analysis
```

각각이 *Internal V&V 결과를 *재검증* 또는 *추가 분석*.

## 1. ISVV Planning

```
=== ISVV Plan — KOMPSAT-6 ===

ISVV Provider: SCISYS (UK) (예시)
ISVV Contract:  EUR €2.5M over 18 months

Scope:
  - AOCS module (Criticality A): 전체 V&V
  - PMC module (Criticality B): Code + Test V&V
  - TT&C module (Criticality A): 전체 V&V
  - Other modules: Documentation review only

Out of Scope:
  - Ground software
  - Operations procedure

Activities:
  - Requirements V&V (Q1 2025)
  - Design V&V (Q2-Q3 2025)
  - Code V&V (Q3-Q4 2025)
  - Test V&V (Q4 2025-Q1 2026)
  - Final report (Q1 2026)

Deliverables:
  - ISVV Plan
  - V&V activity reports per phase
  - Anomaly reports (ISVV-AR)
  - Final ISVV report
  - Recommendation for acceptance/rejection

Approval Chain:
  KARI Project Manager
  KARI Quality Manager
  KARI Director
  ESA (customer for some missions)
```

## 2. Requirements V&V

ISVV가 *HLR/LLR 독립 review*.

```
ISVV Requirements V&V Activities:

A. Completeness
   - 모든 system req가 HLR에 derived?
   - 누락된 functional req?
   - 누락된 non-functional req?

B. Correctness
   - HLR이 system req를 정확히 표현?
   - Algorithm 정확성

C. Consistency
   - HLR 간 모순?
   - LLR과 HLR 일관?

D. Verifiability
   - 각 HLR이 측정 가능?
   - Test 또는 analysis 방법 명확?

E. Traceability
   - System req ↔ HLR ↔ LLR 100%

Methods:
  - Manual review (sample-based)
  - Formal review (random selection)
  - 도구 분석 (DOORS link analysis)
  - Cross-check with similar missions
```

### ISVV Anomaly Report 예

```
=== ISVV Anomaly Report ISVV-AR-K6-2025-014 ===

Subject: HLR-AOCS-027 Algorithm Specification 부정확
Severity: Major
Found by: SCISYS Senior Engineer
Date: 2025-03-15

Original HLR-AOCS-027:
"The attitude control software shall apply quaternion-based control
 to maintain pointing accuracy of 0.01 degree."

ISVV Finding:
The requirement is *not measurable* as stated:
  1. "pointing accuracy" undefined (3-sigma? max?)
  2. "0.01 degree" without time window (always? at steady state?)
  3. Reference frame not specified

Comparison with similar mission:
  KOMPSAT-3A had HLR-AOCS-030 with:
  "Pointing accuracy 0.01° (3-sigma) at steady state in nadir-pointing
   mode, measured against TRF (Terrestrial Reference Frame)."

Recommendation:
  Update HLR-AOCS-027 to include:
    - Statistical definition (3-sigma)
    - Mode applicability (nadir, etc.)
    - Reference frame
    - Steady state vs transient

Impact:
  Current HLR allows ambiguous interpretation
  Test may pass false positive or false negative
  Mission risk: Major (could affect SAR image quality)

KARI Response (within 7 days expected):
  Accept ✓ / Discuss / Reject (with justification)
```

ISVV가 *external perspective*를 가져옴. *internal team이 놓친 ambiguity 발견*.

## 3. Design V&V

ISVV가 *Architecture + LLR* 독립 검토.

```
ISVV Design V&V Activities:

A. Architecture Adequacy
   - HLR을 모두 cover?
   - Modular decomposition 합리적?
   - Interface 명확?

B. LLR Accuracy
   - HLR에서 정확히 derive?
   - Algorithm correctness
   - Numerical analysis

C. Resource Budget
   - Memory + timing + CPU
   - Worst-case 분석

D. Failure Mode Coverage
   - FMEA 완전?
   - FDIR 적절?

Methods:
  - Independent FMEA
  - Numerical re-analysis (예: filter stability)
  - Simulation comparison
  - Cross-check with heritage
```

### ISVV 발견 예 — Stability Analysis

```
=== ISVV Anomaly Report ISVV-AR-K6-2025-022 ===

Subject: AOCS PID controller stability margin 부족
Severity: Critical
Found by: SCISYS Control Engineer
Date: 2025-04-22

Analysis:
ISVV가 KARI의 AOCS PID 설계를 *독립 분석*.

Original design (KARI):
  K_P = 2.5, K_I = 0.8, K_D = 0.15
  Stability margin claim: 50% gain margin, 30° phase margin

ISVV Independent Analysis (using Matlab Robust Control Toolbox):
  - Linearized model
  - Nyquist analysis
  - Robust stability under parametric uncertainty

Findings:
  Nominal: Gain margin 48%, Phase margin 32° ✓ (per spec)
  But with sensor noise + actuator saturation:
    Gain margin drops to 12% (insufficient)
    Risk of limit cycle under disturbance

  Specific scenario:
    Solar panel deployment (one-time large disturbance)
    Combined with star tracker temporary outage
    → System could enter limit cycle

  Probability: Low (specific conjunction needed)
  Impact: Mission degraded (pointing error > 0.1°)
         Mission failure 가능 (worst case)

Recommendation:
  1. Increase gain margin to 30% (target)
  2. Reduce K_P from 2.5 to 1.8
  3. Add anti-windup with adaptive limit
  4. Verify with Monte Carlo simulation (1000+ runs)

KARI Response:
  Investigated, confirmed analysis
  Implemented recommendation
  Re-verified: gain margin 35%, phase margin 28°
  Closure: 2025-05-30

This finding alone justifies ISVV cost for the mission.
```

이런 *critical finding*이 ISVV의 가치. *Mission failure 차단*.

## 4. Code V&V

ISVV가 *source code를 독립 분석*.

```
ISVV Code V&V Activities:

A. Manual Code Review
   - Critical 모듈 sample-based
   - Algorithm 정확성
   - Defensive programming
   - Edge case handling

B. Static Analysis (다른 도구)
   - KARI가 Helix QAC 사용 → ISVV는 Polyspace
   - 다른 rule set
   - Cross-comparison

C. Formal Methods (가능 시)
   - SPARK Ada 또는 Frama-C
   - Critical algorithm formal proof

D. Compliance Check
   - MISRA + project-specific rule
   - ECSS-E-ST-40C compliance

Methods:
  - 다른 toolchain (cross-check)
  - 다른 reviewer (fresh eyes)
  - Independent compile + analyze
```

### Code V&V 발견 예

```
=== ISVV Anomaly Report ISVV-AR-K6-2025-045 ===

Subject: Race condition in shared FDIR state
Severity: Major
Found by: SCISYS Concurrent Programming Specialist
Date: 2025-08-12

Code:
  // fdir_manager.c line 234
  if (fdir_state.fault_count >= FAULT_THRESHOLD) {
      enter_safe_mode();
      fdir_state.fault_count = 0;
  }

  // fault_detector.c line 78 (interrupted task)
  fdir_state.fault_count++;

Issue:
  Race condition:
    1. fault_count = 4
    2. fdir_manager checks: 4 < 5 (threshold), 진입 안 함
    3. ISR fires, fault_count = 5
    4. fdir_manager moves on (안 unsafe-mode)
    5. Next cycle: fdir_manager checks: 5 == 5
                   enters safe mode
                   sets fault_count = 0
    6. ISR fires again: fault_count = 1
    → 일관성 깨짐, 추가 fault 손실 가능

KARI's Internal V&V didn't catch this because:
  - 단일 thread test 위주
  - ISR + main thread interaction test 부족

ISVV detected via:
  - 다른 angle (concurrent programming expertise)
  - Manual code review focusing on shared data
  - 별도 tool (TSan-like analysis)

Recommendation:
  1. Make fdir_state.fault_count atomic (C11 atomic_int)
  2. Use compare-and-swap for reset
  3. Add concurrent test cases

KARI Response:
  - Accepted finding
  - Implemented atomic
  - Added 12 new concurrent test cases (T-AOCS-CONC-*)
  - All tests pass
  - Closure: 2025-09-15
```

ISVV의 *expertise diversity*가 *bug 잡음*.

## 5. Test V&V

```
ISVV Test V&V Activities:

A. Test Plan Adequacy
   - 모든 HLR이 test에 cover?
   - Test 깊이 충분?
   - Robustness test 포함?

B. Test Execution (Independent)
   - 일부 test를 ISVV가 *직접 실행*
   - KARI의 test environment에서
   - 또는 ISVV 자체 environment

C. Coverage Re-analysis
   - 다른 도구로 measure
   - Cross-comparison

D. Anomaly Validation
   - KARI가 보고한 anomaly가 *진짜 fixed*?
   - Re-test 일부 sample
```

### Test V&V 발견 예

```
=== ISVV Anomaly Report ISVV-AR-K6-2025-061 ===

Subject: Test 통과했으나 robustness 부족
Severity: Minor (but indicative)
Found by: SCISYS Test Engineer
Date: 2025-09-30

Test Reviewed: TC-AOCS-INT-103 (Attitude recovery from tumble)

Original Test:
  Initial tumble rate: 5 deg/sec
  Initial attitude: random
  Duration: 30 seconds
  Pass criterion: |attitude error| < 0.1° at end

ISVV Re-test (broader scenarios):
  Tumble rate: 5, 10, 20, 50 deg/sec
  Initial conditions: 50 random
  Duration: 30, 60, 120 seconds

Results:
  5 deg/sec, 30 sec:   PASS (matches KARI)
  10 deg/sec, 30 sec:  PASS
  20 deg/sec, 30 sec:  FAIL (error 0.15°)
  50 deg/sec, 30 sec:  FAIL (does not converge in 30s)
  20 deg/sec, 60 sec:  PASS
  50 deg/sec, 120 sec: PASS

Finding:
  Original test only covers *nominal* tumble (5 deg/sec).
  Spec (HLR-AOCS-022) says "tumble" without quantifying max rate.
  Higher tumble rates may occur (deployment, attitude perturbation).

Recommendation:
  Update HLR-AOCS-022 to specify max tumble rate spec covers.
  Add test cases for 10, 20 deg/sec.
  50 deg/sec rare but should be covered as off-nominal.

KARI Response:
  Updated HLR to specify 20 deg/sec max.
  Added 3 new test cases.
  Closure: 2025-11-05
```

ISVV가 *spec gap도 발견*. *broader test coverage*.

## 6. Process Audit (by ISVV)

```
ISVV Process Audit Activities:

A. Process Compliance
   - SDP, SVP, SCMP, SQAP 따랐나?
   - Sample-based check

B. Process Maturity
   - 정의된 절차가 실제 수행?
   - Tailoring 적절?

C. Documentation Adequacy
   - 산출물 완전?
   - Cross-references 정확?

D. Records Adequacy
   - Audit trail 완전?
   - Approval signatures 있음?
```

ISVV의 process audit이 *SPA audit (Ch 2)와 다름*. *external perspective + cross-mission comparison*.

## 7. Anomaly Analysis (by ISVV)

ISVV가 *KARI의 NCR pattern 분석*. *trend, root cause cluster*.

```
=== ISVV Anomaly Analysis Q3 2025 ===

KARI NCR statistics (Q3):
  Total opened: 87
  Total closed: 92

ISVV Independent Analysis:
  - 87 NCR을 cluster (root cause 기반)
  - 8 cluster identified

Top clusters:
  1. "Floating point precision" — 18 NCR
     → ISVV: Algorithm review needed across modules

  2. "Concurrent access" — 12 NCR
     → ISVV: Architecture-level concurrency review

  3. "Documentation drift" — 15 NCR
     → ISVV: Doc-as-code adoption

Comparison to similar missions (KOMPSAT-3A, GEO-3):
  KARI's NCR rate higher than KOMPSAT-3A at same phase
  Possibly due to:
    - More aggressive schedule
    - 신규 algorithm 도입
    - Team turnover

ISVV Recommendations:
  - Algorithm robustness training program
  - Architecture review for concurrency
  - Schedule re-evaluation if NCR doesn't decrease in Q4
```

ISVV가 *수많은 mission 경험* 가져옴. *KARI single mission perspective*보다 광범위.

## Final ISVV Report

Mission 종료 직전 *Final ISVV Report*. *전체 평가 + recommendation*.

```
=== Final ISVV Report — KOMPSAT-6 ===

Mission: KOMPSAT-6 (X-band SAR)
ISVV Provider: SCISYS UK
Date: 2026-03-15

Executive Summary:
  ISVV activities completed per ISVV Plan v1.2.
  Total ISVV anomalies: 247
    Critical: 3 (all resolved)
    Major: 38 (all resolved or accepted)
    Minor: 142
    Observation: 64
  
  Recommendation: ACCEPT for flight, contingent on closure
                  of 2 open observations.

Detailed Findings:
  [상세 — 200 페이지+]

Quality Assessment:
  Process Maturity:        Excellent
  Code Quality:            Good (heritage advantage)
  Test Coverage:           Excellent
  Documentation:           Good
  Anomaly Handling:        Excellent

Key Strengths:
  - Strong heritage reuse from KOMPSAT-3A
  - Disciplined NCR handling
  - Comprehensive HIL testing

Key Improvement Areas (for KOMPSAT-7A):
  - Algorithm robustness analysis upfront
  - Concurrent architecture review
  - Schedule contingency for late issues

Conclusion:
  KOMPSAT-6 Software meets ECSS-Q-ST-80C requirements.
  Recommendation: APPROVAL for AR (Acceptance Review).

Approved:
  ISVV Manager (SCISYS):   J. Smith       2026-03-15
  ISVV Technical Lead:     A. Williams    2026-03-15
  KARI ISVV Liaison:       김OO          2026-03-20
  ESA Observer:            (if applicable) 2026-03-25
```

이 *Final Report*가 *Acceptance Review에 제출*. 인증의 *결정적 evidence*.

## 유럽 ISVV Ecosystem

ESA mission 30+ 년이 *ISVV industry*를 형성.

```
Major European ISVV Companies:

1. Critical Software (Portugal)
   - Founded 1998
   - Galileo, Sentinel, BepiColombo
   - ~150 engineers

2. SCISYS (UK) → now part of CGI
   - Long history (BAE Systems origins)
   - Many ESA missions
   - Aerospace + defense

3. Solenix (Germany/Switzerland)
   - ESA core supplier
   - Mission operations focused

4. RHEA Group (Belgium/Italy)
   - ESA + EU programs
   - Multi-mission

5. Logica → CGI
   - Larger consolidation

6. OHB (Germany)
   - Both spacecraft maker + some ISVV

총 유럽 ISVV 인력: ~500-700명
```

이런 *전문 회사*가 *수많은 mission*에서 *cross-pollination*. 한 mission의 lesson learned가 *다른 mission에 즉시 적용*.

## 한국 ISVV — 현황과 도전

```
한국 ISVV 인력 (2024 추정):
  KARI internal QA team:  ~30
  Hanwha ISVV:            ~15
  외주 컨설팅:
    - 한국항공우주 ISVV:   ~20
    - 자체 검증 회사:      ~10
  
  Total: ~75

비교 — 유럽 권역: ~500-700
       NASA + JPL: ~1000+
```

한국 ISVV 인력 *상당히 부족*. 도전:

```
도전 1: 전문 인력 부족
  - 우주 산업 신생
  - 인력 양성 늦음
  - 학교 교육 부족

도전 2: 회사 규모 작음
  - Multi-mission experience 부족
  - 1-2 회사가 모든 mission 담당 (cross-comparison 부족)

도전 3: ISVV 비용
  - Mission budget 부담
  - 정부 funding 제약

도전 4: 인증 인프라
  - ESA-equivalent inspection 부족
  - 한국 우주 인증 framework 진화 중
```

해결 방향:
- 학교 우주 SW 교육 (KAIST, KAU 등 확대)
- ISVV 회사 양성 (정부 R&D 지원)
- 유럽 ISVV 회사와 협력 (KARI + 유럽 회사)
- ESA mission 참여로 experience 축적

## KARI ISVV 전략 — 진화

```
2010s: Astrium 의존
  - KOMPSAT-3 / 3A
  - Astrium이 외부 ISVV 수행
  - 비용 큼, 의존성 높음

2020s: 점진적 자체 capacity
  - KOMPSAT-5 / 6 / 7A
  - 자체 internal QA team 확대
  - 일부 외주 (한국 회사)

2030s 비전: 자체 + 한국 ISVV
  - 자체 capability 성숙
  - 한국 ISVV 회사 활용
  - 유럽 mission ISVV 수출까지
```

## 작은 회사를 위한 ISVV 도입

```
신생 우주 회사 ISVV 도입 가이드:

Phase 1: 자체 internal V&V 성숙
  - 작은 missionsfor 자체 가능
  - DAL D / Criticality D scope만

Phase 2: 외부 컨설턴트 활용
  - 작은 ISVV company contract
  - Critical 부분만

Phase 3: Mature operation
  - Mission criticality 증가에 따라
  - Multi-provider for cross-check
  - 자체 ISVV team 형성 (선택)

Phase 4: Full ECSS compliance
  - Large mission
  - 별도 회사 ISVV
  - 정기 audit
```

## 정리

- ISVV는 *Technical + Managerial + Financial 독립*. ECSS의 차별점.
- Criticality A/B = *외부 회사 ISVV 의무*.
- 7 활동: Planning, Req V&V, Design V&V, Code V&V, Test V&V, Process Audit, Anomaly Analysis.
- 다른 도구·다른 방법론·다른 perspective로 *internal V&V가 놓친 것 발견*.
- 유럽 ISVV ecosystem 성숙 — Critical SW, SCISYS, Solenix 등 ~500-700명.
- 한국 ISVV ~75명, *상당히 부족*. 우주 산업 성장의 도전.
- KARI 진화 — Astrium 의존 → 자체 capability → 한국 ISVV 활용.
- Final ISVV Report가 *Acceptance Review의 결정적 evidence*.

## 다음 장 예고

8장은 *ECSS-E-ST-40C — SW Engineering*. SW의 *기술적* 측면 표준. 11 단계 V-model.

## 관련 항목

- [Ch 6 — Procurement Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter06-procurement)
- [Ch 8 — ECSS-E-ST-40C](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter08-ecss-e-st-40c)
- [DO-178C Ch 8 — Verification (RAT)](/blog/embedded/aerospace-standards/do-178c/chapter08-verification-rat)
- [Critical Software](https://www.criticalsoftware.com/)
- [CGI Space Services](https://www.cgi.com/uk/en-gb/space-services)
- [Solenix](https://www.solenix.ch/)
