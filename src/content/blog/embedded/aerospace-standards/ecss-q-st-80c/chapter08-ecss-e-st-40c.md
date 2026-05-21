---
title: "Ch 8: ECSS-E-ST-40C — SW Engineering V-model 11 단계"
date: 2026-05-18T09:00:00
description: "ECSS-Q-ST-80C의 짝꿍 표준. V-model 11 단계, 5 milestone review (SRR/PDR/CDR/QR/AR), 코딩 표준."
tags: [ecss, ecss-e-st-40c, engineering, v-model, srr, pdr, cdr, qr, ar]
series: "ECSS-Q-ST-80C"
seriesOrder: 8
draft: false
---

ECSS-Q-ST-80C가 *quality 측면*이라면 **ECSS-E-ST-40C**는 *engineering 측면*. *어떻게 SW를 만드는가*. 두 표준이 *반드시 함께 사용*. 이 장은 *V-model 11 단계, 5 milestone review, 코딩 표준, KARI 적용*까지.

## ECSS-E-ST-40C의 정의

```
Full name : ECSS-E-ST-40C — Space Engineering — Software
Issued    : 2009-03-06 (Rev.1 검토 중)
페이지   : 약 130
Pair      : ECSS-Q-ST-80C (Product Assurance 측면)
```

```
ECSS-E-ST-40C : SW를 *어떻게 만드는가* (Engineering)
ECSS-Q-ST-80C : 만든 SW가 *어떻게 좋은가* (Quality)

함께 사용:
  E-ST-40C가 *V-model lifecycle 정의*
  Q-ST-80C가 *각 단계의 quality 보증*
```

## V-Model — 11 단계

```
   Customer Side                              Verification Side
   ────────────                              ──────────────────
   
   1. SW Related System Req                  → System Validation
                                                ↑
   2. SW Requirements Analysis                → System Test
                                                ↑
   3. SW Architectural Design                 → SW Integration Test
                                                ↑
   4. SW Detailed Design                      → Unit Test
                                                ↑
   ─────────────────── 5. SW Coding ──────────────────────
   
   6. SW Unit Testing
   7. SW Integration Testing
   8. SW Validation against SR (Software Requirements)
   9. SW Delivery and Acceptance
   10. SW Operations and Maintenance
   11. SW Disposal
```

V-model의 *각 단계*가 *대응하는 verification*과 연결.

## 5 Milestone Reviews

각 phase 사이에 *공식 review*. ECSS의 핵심 *gate*.

```
SRR — System Requirements Review
  After: Phase 1 (System Req 확정)
  Output: Functional Baseline (FBL)
  Approval: Customer + Project Manager

PDR — Preliminary Design Review
  After: Phase 3 (Architectural Design)
  Output: Allocated Baseline (ABL)
  Approval: Customer + ESA / 정부

CDR — Critical Design Review
  After: Phase 4 (Detailed Design)
  Output: Design Baseline (DBL)
  Approval: Customer + ISVV
  Major decision: Design freeze

QR — Qualification Review
  After: Phase 8 (Validation)
  Output: Product Baseline (PBL)
  Approval: Customer + ISVV
  Major decision: "Ready for delivery?"

AR — Acceptance Review
  After: Phase 9 (Delivery)
  Output: Operational Baseline (OBL)
  Approval: Final customer signature
  Major decision: "Ready for operation?"
```

각 review에서 *fail 시 phase 재실행*. 큰 비용.

## Phase 1: SW Related System Requirements

```
입력:
  - System Requirements (HW + SW + Mechanical 통합)
  - Mission Concept Document
  - Operational Concept

활동:
  - SR 중 *SW에 할당된 부분 식별*
  - SW와 HW의 책임 분할
  - SW 외부 인터페이스 식별

출력:
  - SW-related System Requirements
  - SW-HW interface specification
  - Initial SW architecture concept

Review: SRR (System Requirements Review)
  - System-level (모든 stakeholder)
  - SW allocation 검증
  - Feasibility 평가
```

### Example — SR Allocation (가상)

**System Requirement SR-12:**

- "Satellite shall maintain pointing accuracy of X° (3-sigma)
- during nominal imaging mode."

**SR-12 Allocation:**


**HW responsible:**

- Star tracker accuracy (vendor spec)
- Reaction wheel torque resolution
- Body rigidity (mechanical)

**SW responsible:**

- Attitude estimation algorithm
- Control law (PID + feedforward)
- Mode management (transition logic)

**Combined budget:**

- HW: a° (3-sigma)
- SW: b° (3-sigma)
- Total: sqrt(a² + b²) ≤ X° (margin)

이런 *명시적 allocation*이 *후속 design의 기준*.

## Phase 2: SW Requirements Analysis

```
입력:
  - SW-related System Requirements
  - Operational concept
  - Heritage 분석

활동:
  - HLR (High-Level Requirements) 도출
  - Functional + non-functional 분리
  - Use case 정의
  - DOORS에 등록

출력:
  - SRD (Software Requirements Document)
  - Use Case 문서
  - Initial test plan

활동 시간:
  Small mission:  3-6 months
  Medium:         6-12 months
  Large:          12-24 months

Review: 내부 review (PDR로 통합)
```

DO-178C의 HLR (Ch 4)과 *내용 거의 동일*. ECSS 용어로 *Software Requirements*.

## Phase 3: SW Architectural Design

```
입력:
  - SRD
  - HW architecture
  - Heritage 분석

활동:
  - Module decomposition
  - Interface 정의
  - Memory + timing allocation
  - Concurrent task 설계
  - FDIR architecture
  - Data flow + control flow

출력:
  - SAD (Software Architecture Document)
  - ICD (Interface Control Document)
  - Resource budget (memory/CPU/power)
  - Initial timing analysis

Review: PDR — Preliminary Design Review

PDR Agenda (3-5 days):
  - SRD review
  - Architecture overview
  - Interface review
  - Resource budget review
  - Risk + open issues
  - Next phase plan
```

### PDR Outcomes

**Possible outcomes:**

- Approved → Allocated Baseline 설정
- Approved with conditions → 조건 충족 후 baseline
- Not approved → Phase 3 재실행

**PDR fail (rare):**

- Architecture가 SRD 미충족
- Resource budget 초과
- Major risk 미해결
- 비용/일정 영향 큼

## Phase 4: SW Detailed Design

```
입력:
  - SAD
  - SRD
  - Architectural baseline

활동:
  - LLR (Low-Level Requirements) 도출
  - 각 모듈 internal design
  - Algorithm 명세
  - Data structure 설계
  - Detailed timing analysis

출력:
  - SDD (Software Design Document)
  - Algorithm specification
  - Detailed ICD update

Review: CDR — Critical Design Review

CDR Agenda (5-10 days):
  - Detailed design walkthrough (모듈별)
  - Algorithm verification
  - LLR completeness
  - Resource analysis (updated)
  - Test plan
  - Risk update

CDR is "design freeze". 이후 변경 → CCB + 큰 영향
```

### CDR Effort — 일반 규모

**대형 mission CDR의 일반 규모:**

- Preparation: 수개월
- Review duration: 수일 ~ 1주
- Participants: 수십명 (개발 team + customer + ISVV + subcontractor reps)
- Documents reviewed: 수십~수백
- Findings: Major + Minor 다수
- Resolution time: 수개월

CDR이 *가장 큰 review*. *전체 design의 freeze*. 정확한 규모는 *mission*마다 다르다.

## Phase 5: SW Coding

```
입력:
  - SDD (LLR)
  - SCS (Software Coding Standards)
  - Toolchain (qualified)

활동:
  - Source code 작성
  - Code review (peer)
  - Static analysis (continuous)
  - Documentation (Doxygen)

출력:
  - Source code (versioned in repo)
  - Compiled object code
  - Documentation

표준:
  - SCS 100% 준수
  - MISRA C (또는 equivalent)
  - 각 함수 LLR traceable

Review: 일상 peer review (formal CDR/QR로 통합)
```

DO-178C Ch 6의 Source Code와 *내용 동일*. MISRA C 적용.

## Phase 6: SW Unit Testing

**입력:**

- Source code
- LLR
- Test environment

**활동:**

- Test case per LLR
- Unit test 실행
- Coverage 측정 (Statement/Decision/MC/DC)
- Anomaly handling

**출력:**

- Unit test results
- Coverage report
- PR (Problem Report)

**목표:**

- Criticality A: MC/DC 100%
- Criticality B: Decision 100%
- Criticality C: Statement 100%

## Phase 7: SW Integration Testing

**활동:**

- 모듈 간 인터페이스 test
- Data flow 검증
- Control flow 검증
- HIL test 시작

**출력:**

- Integration test results
- HIL test results

## Phase 8: SW Validation against SR

```
활동:
  - 시스템 차원에서 SR (System Requirement) 검증
  - HIL with full system simulation
  - Customer-witnessed test

출력:
  - Validation results
  - Acceptance evidence

Review: QR — Qualification Review

QR Agenda:
  - 전체 verification + validation 결과
  - HLR coverage
  - System-level pass/fail
  - Customer readiness
```

QR가 *delivery 직전 마지막 gate*. *통과하면 product baseline (PBL)*.

## Phase 9: SW Delivery and Acceptance

```
활동:
  - SW 인도 (image, documentation, source)
  - Customer가 own environment에서 test
  - Acceptance test
  - Documentation review

출력:
  - Delivered SW package
  - Acceptance certificate

Review: AR — Acceptance Review

AR가 마지막 review. Pass = mission ready.
```

## Phase 10: SW Operations and Maintenance

**활동 (mission 운영 중, 수년~수십년):**

- Monitor
- Anomaly handling
- In-orbit changes
- Periodic updates

**조직:**

- Operations team (운영)
- Engineering support
- Vendor support (필요 시)

**ECSS 적용:**

- 모든 change에 ECSS process
- In-orbit upload procedure (Ch 4)
- Annual review

## Phase 11: SW Disposal

**Mission 종료:**

- Final SW status capture
- Archive 30 years (ESA mission)
- Lessons learned documentation
- Re-use catalog 등록

**조직:**

- 마지막 1-2명 engineer + archive team

장기 운영 후 mission이 *disposal phase*에 진입하는 사례는 ESA / NASA / 각 국 우주청에 다수.

## Coding Standards (§5.5.6.2)

ECSS-E-ST-40C가 *coding standard 의무화*. 단 specific 표준 명시 X — 프로젝트 자체 정의.

**Required content of Coding Standard:**

- 적용 언어
- 명명 규칙
- 형식 (indentation, brackets)
- 주석 정책
- Error handling
- Concurrency rules
- Module/file organization

**External standard 채택:**

- C: MISRA C:2012
- C++: MISRA C++ / AUTOSAR / JSF C++
- Ada: SPARK Ada subset
- Python: PEP 8 + custom

대부분 ESA missions = *MISRA C* 또는 *Ada with SPARK*. *Ariane 5 launcher = Ada* (legacy + 새 missions은 C++ 검토 중).

### Ada — 항공우주에서의 일반

*Ada*는 launcher / 위성 등 critical 항공우주 SW에 광범위 사용되어 왔다. 일반 패턴:

- *Ada 2012* + *SPARK subset*으로 critical 부분 *formal verification*
- *AdaCore GNAT Pro* 같은 qualified compiler
- Ariane 등 *유럽 launcher*에 적용 사례 다수

각 mission이 실제로 *어떤 언어·표준 조합*을 사용하는지는 *해당 mission 공식 문서* 참조.

## V-Model vs Agile

ECSS는 *전통적 V-model*. Agile은 *공식 미지원*. 다만 *일부 phase 안*에서 *iterative* 허용.

```
ECSS와 Agile 조합:
  - Phase 2-4 (Requirements + Design): iterative sprint
  - Phase 5-7 (Coding + Testing): continuous integration
  - 단 *gate review (SRR/PDR/CDR)*는 *waterfall 준수*

Hybrid approach는 *신생 우주 회사*나 *small mission*에서 흔히 시도된다. 각 조직의 구체적 process는 *조직 발표*만 인용.
```

대형 mission은 일반적으로 *순수 V-model* 채택. Schedule risk 회피 + customer 친숙.

## Document Set — ECSS-E-ST-40C Required

각 phase의 *출력 문서*. 모두 *DOORS, Confluence, Git에 versioned*.

```
Phase 1: SR Document (SW-allocated subset)
Phase 2: SRD, Use Case Document
Phase 3: SAD, ICD, Resource Budget, Risk Register
Phase 4: SDD, Algorithm Spec, Updated ICD
Phase 5: Source code + Build environment (SCS conformance)
Phase 6: Unit Test Plan + Results + Coverage
Phase 7: Integration Test Plan + Results
Phase 8: Validation Plan + Results + HIL Reports
Phase 9: Delivery Note, User Manual, Operations Manual
Phase 10: Maintenance Plan, In-orbit Update Records
Phase 11: Archive Index, Lessons Learned
```

큰 mission = *수천 페이지 문서*. *Mission 자체보다 더 무거운 paperwork*.

## Cross-Phase 활동 (Continuous)

V-model의 *각 phase*만 있는 게 아니라 *continuous 활동*도.

**Continuous activities (전 lifecycle):**

- Configuration Management (Ch 4)
- Quality Assurance (Q-ST-80C)
- Risk Management (M-ST-80C)
- Documentation
- Training
- Audit (internal + external)

ECSS Standards 전체가 *완전한 ecosystem*.

## ESA Mission Lifecycle Phases

ECSS는 *SW phase*만 정의. 전체 mission lifecycle은 더 큼.

```
Mission Phases (ECSS-M-ST-10C):

Phase 0    : Mission Analysis
Phase A    : Feasibility (12-24 months)
Phase B    : Preliminary Definition
Phase C    : Detailed Definition
Phase D    : Production / Ground Qualification Testing
Phase E    : Operations / Utilization (수년~수십년)
Phase F    : Disposal

SW phase 매핑:
  Phase A: SW Phase 1 시작
  Phase B: SW Phase 2-3
  Phase C: SW Phase 4-5
  Phase D: SW Phase 6-9
  Phase E: SW Phase 10
  Phase F: SW Phase 11
```

ESA mission *15-30년* lifecycle. SW도 *그 동안 evolve*.

## Tailoring — ECSS-E-ST-40C의 적용

ECSS-E-ST-40C도 *tailoring 가능*. ECSS-Q-ST-80C와 같이.

**일반 tailoring 결정:**

**Small mission (CubeSat):**

- Phase 8 reduced
- Document set simplified
- Customer review 단순화

**Heritage mission (대부분 reused):**

- Phase 2-4 expedited
- Heritage acceptance가 design 대체

**Constellation (다수 위성):**

- 첫 위성에 full
- 후속 위성에 abbreviated

Constellation 형태의 mission은 *첫 unit에 full process, 후속 unit에 abbreviated*가 일반 패턴.

## V-Model 비판 + 진화

**V-Model 비판:**

- 변화에 느림
- Customer feedback 늦음
- Late discovery of issues
- 비용 증가

**진화 방향:**

- Iterative V-model (각 phase에서 mini-iteration)
- Spiral model
- Incremental development
- Agile-V hybrid

**ECSS의 점진적 변화:**

- ECSS-E-ST-40C Rev.1 (검토 중) — iterative 요소 추가
- Small mission tailoring 강화
- Agile-friendly process 일부 허용

## ECSS-E-ST-40C vs DO-178C

```
                ECSS-E-ST-40C         DO-178C
─────────────────────────────────────────────
Approach         V-model 11 phase      Objective-based (71 obj)
Lifecycle 강조    Long-term (mission)   Aircraft certification
Reviews          5 milestone (SRR-AR)  4 SOI (FAA)
Process tailoring 광범위                 Limited (DAL E만)
Coding standard   자체 (MISRA 권장)      자체 (MISRA 흔함)
Tool qualification Annex Q              DO-330 (별도)
```

DO-178C가 *objective-driven*이라면 ECSS는 *process-driven*. 둘 다 강점 약점.

## V-Model 운영 — 일반 timeline

```
대형 mission V-Model의 일반 schedule:

Year 1     Phase 1: System req 분석
Year 2     Phase 2: SW req (SRR 통과)
Year 3     Phase 3: Architecture (PDR 통과)
Year 4     Phase 4: Detailed design (CDR 통과)
Year 5-6   Phase 5-7: Code + Test
Year 6-7   Phase 8-9: Validation + Delivery (QR + AR)
Year 7+    Phase 10: Operations (수년~수십년)
End        Phase 11: Disposal
```

15-20년 lifecycle. *각 단계*가 *수개월~년*.

## 신생 우주 회사 — V-Model 적용 어려움

**신생 우주 회사의 일반 도전:**

- Schedule pressure
- 적은 budget
- 작은 team
- V-Model documentation 부담
- 5 milestone review 부담

**일반 해결:**

- Tailored ECSS (heavy reduction)
- 자체 표준 (ECSS 일부 차용)
- DO-178C-like (objective-based)

신생 우주는 *ECSS 변형* 또는 *자체 표준*이 흔하다.

## Documentation as Code (DAC)

전통 ECSS의 *paper-heavy*에 대응. Modern 도구.

**DAC 도구:**

- Sphinx (Python docs)
- mkdocs
- GitLab Wiki
- Confluence + Git plugin
- LaTeX + git

**Trend:**

- 모든 문서 git 관리
- Markdown 또는 reST
- Auto-build (PDF, HTML)
- Version controlled
- Diff 가능
- Review (PR-based)

**ECSS 채택 진행:**

- 많은 우주·항공 조직이 DAC 도구 부분 도입 중
- Boeing 등 대형 산업도 광범위 채택

DAC가 *paperwork 부담 감소*. ECSS process compliance 유지하면서.

## 도구 — Phase별

**Phase 1-2 (Requirements):**

- DOORS, Polarion, Jama Connect

**Phase 3-4 (Design):**

- Enterprise Architect (UML/SysML)
- MagicDraw / Cameo Systems Modeler
- Simulink / SCADE (model-based)

**Phase 5 (Coding):**

- Git + GitLab/Bitbucket/GitHub
- IDE: VS Code, CLion, Vim

**Phase 5 (Static Analysis):**

- Polyspace, QAC, LDRA

**Phase 6-7 (Testing):**

- Google Test (Unit)
- Cantata, VectorCAST
- Custom HIL

**Phase 8 (Validation):**

- dSPACE SCALEXIO (HIL)
- Custom validation framework

**Cross-phase:**

- Jira (NCR, CR)
- Confluence (docs)
- Jenkins / GitLab CI (build)
- SonarQube (quality)

## 정리

- ECSS-E-ST-40C가 *engineering 측면*. ECSS-Q-ST-80C와 *pair*.
- V-Model 11 phase + 5 milestone review (SRR/PDR/CDR/QR/AR).
- CDR가 *design freeze*. 가장 큰 review.
- AR가 *최종 인수*. Mission ready.
- Coding standard는 *프로젝트 자체* — MISRA C 또는 Ada/SPARK.
- Mission lifecycle 15-30년. SW도 그동안 evolve.
- Tailoring 광범위 — small mission에 적용 용이.
- Agile은 *공식 미지원*이지만 *부분 hybrid* 가능.
- DAC (Documentation as Code) 채택 증가.
- 신생 우주 회사는 *변형 ECSS* 또는 *자체*.

## 다음 장 예고

9장은 *Tool Qualification (Annex Q)* — ECSS의 도구 자격 절차. DO-330과 비교.

## 관련 항목

- [Ch 1 — ECSS 표준 체계](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter01-introduction)
- [Ch 9 — Tool Qualification](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter09-tool-qualification)
- [DO-178C Ch 3 — Planning Phase](/blog/embedded/aerospace-standards/do-178c/chapter03-planning-phase)
- [DO-178C Ch 4 — Software Requirements (HLR)](/blog/embedded/aerospace-standards/do-178c/chapter04-software-requirements)
- [ECSS-E-ST-40C](https://ecss.nl/)
- [Adacore SPARK Pro](https://www.adacore.com/sparkpro)
