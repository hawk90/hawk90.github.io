---
title: "Ch 3: Planning Phase — 5개 Plan + 3개 Standard"
date: 2026-05-18T04:00:00
description: "PSAC·SDP·SVP·SCMP·SQAP 5 plan과 SRS·SDS·SCS 3 standard 작성. FAA SOI 1 review 대응 가이드."
tags: [do-178c, planning, psac, sdp, svp, scmp, sqap, srs, sds, scs, soi-1]
series: "DO-178C"
seriesOrder: 3
draft: false
---

DO-178C 인증은 *Planning Phase에서 80%가 결정*된다. 이 단계의 *8개 산출물*(5 plan + 3 standard)이 *전체 프로젝트의 헌법*. FAA *SOI 1 review*에서 이 문서들이 *심사관 첫인상*을 결정한다. 부실한 계획은 *전체 인증을 5년 끌게* 할 수 있다.

## Planning Phase의 위치

![DO-178C 4-Phase Flow — Planning → Development → Verification → Final Certification](/images/blog/do-178c/diagrams/ch03-phase-flow.svg)

Planning Phase는 *프로젝트 시작 후 3~6 개월*. 큰 시스템(Boeing 787 FBW)은 *1년+*.

## 8개 산출물 — 한눈에

```
PLANS (5)
  1. PSAC  — Plan for Software Aspects of Certification
  2. SDP   — Software Development Plan
  3. SVP   — Software Verification Plan
  4. SCMP  — Software Configuration Management Plan
  5. SQAP  — Software Quality Assurance Plan

STANDARDS (3)
  6. SRS   — Software Requirements Standards
  7. SDS   — Software Design Standards
  8. SCS   — Software Code Standards
```

각 문서가 *수십~수백 페이지*. *총 1000~3000 페이지*.

## 1. PSAC — Plan for Software Aspects of Certification

**가장 중요한 문서**. 심사관이 *제일 먼저 읽는다*. PSAC만 보고 *프로젝트 성공 가능성*을 판단.

### PSAC 구조 (DO-178C §11.1)

```
1. Introduction
   - Purpose
   - Scope
   - Definitions, Acronyms

2. System Overview
   - Aircraft / system context
   - SW의 역할
   - Operating environment

3. Software Overview
   - Identification
   - Architecture summary
   - Features

4. Certification Considerations
   - 적용 인증 기준 (FAR Part 25, EASA CS-25 등)
   - DAL 결정 근거 (System safety assessment 참조)
   - Means of Compliance (MoC) — 어떻게 충족할 것인가

5. Software Life Cycle
   - 채택한 lifecycle (V-model, iterative 등)
   - 각 phase의 *transition criteria*

6. Software Life Cycle Data
   - 모든 산출물 목록
   - 각 산출물의 *control category* (CC1/CC2)

7. Schedule
   - SOI milestones
   - Critical path

8. Additional Considerations
   - Previously Developed Software (PDS)
   - Tool Qualification (DO-330)
   - Alternative methods
   - Deactivated code
   - User-modifiable software

9. References
```

### PSAC 작성 예 — Section 4 Certification Considerations

```
=== PSAC §4 — Certification Considerations ===

4.1 Applicable Regulations
   - FAR 25.1309 (Equipment, systems, and installations)
   - FAR 25.671 (Control systems)
   - AC 20-115D — RTCA DO-178C as Means of Compliance
   - AC 20-189 — Management of Open Problem Reports
   - AC 20-193 — Engine Models and Simulation

4.2 Software Level Determination
   The Software Level for this Flight Management Function is
   established as DAL B (Hazardous) based on the System Safety
   Assessment Document SSA-FMS-2024-001, dated 2024-03-15.

   Rationale: Loss of FMS function during cruise can result in
   crew workload increase and potential navigation error,
   classified as Hazardous per ARP 4761 §7.4.2.

4.3 Software Life Cycle Process
   The DO-178C objectives applicable to DAL B (69 objectives)
   shall be satisfied as documented in this Plan and the
   associated SDP, SVP, SCMP, and SQAP.

4.4 Means of Compliance
   See Table 4-1 for objective-to-evidence mapping.

   For Objective A-3-1 through A-3-7 (Verification of HLR):
   - Review of HLR documents (peer review records)
   - Static analysis (Helix QAC + Polyspace)
   - Independence: Verification by separate engineer

   For Objective A-5-6 (Executable Object Code testing):
   - Hardware-In-the-Loop (HIL) at supplier facility
   - Software-In-the-Loop (SIL) for early integration
   - Black-box testing at integration level

4.5 Alternative Methods
   No alternative methods to standard DO-178C process are claimed.
   (Formal Methods per DO-333 are NOT used in this project.)

4.6 Previously Developed Software (PDS)
   The following PDS components are integrated:
   - DDC-I Deos RTOS v8.1 — TQL pre-qualified (cert ref: ...)
   - LDRA Math Library v2.4 — DO-178B DAL B certified
   - Custom CRC32 library v1.0 — re-certified for this project

4.7 Tool Qualification
   See separate Tool Qualification Plan (TQP-FMS-2024-001).
   Tools requiring qualification:
   - Helix QAC 2024.2: TQL-4 (verification tool, DAL B)
   - LDRA Testbed 10.0: TQL-4
   - VectorCAST 23: TQL-4
   - GHS MULTI 8.1 compiler: NOT qualified, mitigated by EOC test
```

이런 *세부 수준*이 *PSAC의 합격선*. *모호한 표현 거부*. 모든 문장이 *측정 가능한 명세*.

### PSAC 작성 시간

```
Small DAL D system    : 1 주 + 검토 1주
Medium DAL C system   : 1 개월 + 검토 1개월
Large DAL B system    : 3 개월 + 검토 1개월
DAL A system (FBW급)  : 6~12 개월 + 검토 2-3개월
```

## 2. SDP — Software Development Plan

*개발 절차*의 상세 정의. SDP가 *팀의 일상 작업 매뉴얼*.

### SDP 구조 (DO-178C §11.2)

```
1. Introduction
2. Standards
   - SRS, SDS, SCS 참조
3. Software Development Environment
   - 개발 환경 (OS, IDE, 컴파일러 버전)
   - 빌드 시스템
   - VCS (보통 ClearCase 또는 Git)
4. Software Requirements Process
   - HLR 작성 procedure
   - 도구 사용 (DOORS 등)
5. Software Design Process
   - LLR + Architecture
   - 도구 (SCADE, Simulink, ASCET)
6. Software Coding Process
   - 컴파일러 설정
   - 코드 review procedure
7. Software Integration Process
   - Build automation
   - Integration test 준비
8. Transition Criteria
   - 각 phase 진입·종료 기준
9. Traceability
   - System Req → HLR → LLR → Code → Tests
10. Software Development Standards
    - 참조 standards
```

### SDP의 핵심 — Transition Criteria

각 phase 진입·종료 기준이 *명시*돼야 다음 단계 진행 가능.

```
=== SDP §8 — Transition Criteria ===

8.1 Transition into Requirements Process
   Entry Criteria:
   - System requirements baseline approved
   - PSAC approved by FAA (SOI 1 complete)
   - HLR Standards (SRS) approved
   - DOORS database initialized

   Exit Criteria:
   - All HLRs documented in DOORS
   - HLRs traced to system requirements (100%)
   - HLR peer review complete (0 critical issues)
   - HLR baseline frozen

8.2 Transition into Design Process
   Entry Criteria: SDP §8.1 exit complete + Design Standards approved
   Exit Criteria:
   - LLRs documented and reviewed
   - Architecture document complete
   - LLR-to-HLR traceability 100%
   - Memory/timing budget allocated

8.3 Transition into Coding
   ...

8.4 Transition into Integration
   ...
```

*Transition criteria가 부실하면* 각 phase가 *부정합 상태로 다음으로 진행*. 후속 finding 폭주.

## 3. SVP — Software Verification Plan

*검증 절차*. *Test, Review, Analysis 3 종류*를 어떻게 수행할지.

### SVP 구조 (DO-178C §11.3)

```
1. Introduction
2. Verification Process Overview
3. Independence Considerations
   - 어느 obj에 Independence 필요
   - 어떻게 보장 (조직, 인력)
4. Verification of Requirements
   - HLR review checklist
   - HLR test approach
5. Verification of Design
   - LLR review checklist
   - Architecture analysis
6. Verification of Code
   - Code review checklist
   - Static analysis configuration
7. Testing
   - Test strategy (unit, integration, system, HIL)
   - Test environment description
   - Test coverage criteria
8. Coverage Analysis
   - Statement, Decision, MC/DC
9. Reviews and Analyses
   - 누가, 언제, 무엇을, 어떻게
10. Re-verification
    - Change 후 어디까지 다시 검증
11. Verification of Verification
12. Tool Considerations
```

### SVP의 핵심 — Coverage Strategy

```
=== SVP §8 — Coverage Analysis Strategy ===

8.1 Required Coverage (DAL B)
   - Statement Coverage: 100%
   - Decision (Branch) Coverage: 100%
   - Data Coupling and Control Coupling: complete

   MC/DC: NOT required for DAL B.

8.2 Coverage Measurement
   Tool: VectorCAST 23
   Method: Instrumentation at compile time
   Test execution: Both host and target

8.3 Uncovered Code Resolution
   For each line/branch not covered:
   1. Determine if reachable
   2. If unreachable: justify as defensive code, document in SVR
   3. If reachable: add test case
   4. If untestable in operational scenario: structural coverage analysis

8.4 Coverage at Different Levels
   Unit tests:      100% statement, 100% branch (per module)
   Integration:     additional path through integrated modules
   System:          requirements-based test (HLR coverage)
   HIL:             requirements-based test (system level)

8.5 Re-coverage After Change
   Code change → affected modules → re-run unit tests
   Verify coverage maintained at 100%
```

## 4. SCMP — Software Configuration Management Plan

*형상 관리*. 모든 산출물의 *baseline·change control·traceability*.

### SCMP 구조 (DO-178C §11.4)

```
1. Introduction
2. SCM Organization
   - CCB (Change Control Board) 구성
   - 역할 정의
3. Identification of SCIs
   - Software Configuration Items 목록
   - Naming scheme
4. Baseline Identification
   - Baseline 분류 (Functional, Allocated, Product, Operational)
5. Change Control
   - CR (Change Request) workflow
   - PR (Problem Report) workflow
6. Configuration Status Accounting
   - 보고서 종류와 주기
7. Audits
   - Functional Configuration Audit (FCA)
   - Physical Configuration Audit (PCA)
8. SCM Environment
   - Tool (ClearCase, Git, SVN)
   - Repository structure
9. Archive
10. Release Management
```

### SCM의 핵심 — Baseline 흐름

```
Functional Baseline    (after SRR)
  - System requirements 확정
  - 변경 시 CCB 승인

Allocated Baseline     (after PDR)
  - SW requirements allocation 확정
  - HLR baseline

Product Baseline       (after CDR)
  - Design + Code 확정
  - 변경 시 PR/CR

Operational Baseline   (post-certification)
  - 운영 중인 SW
  - Service Bulletin으로 변경
```

각 baseline 사이의 *change*는 *모두 추적*돼야 함.

## 5. SQAP — Software Quality Assurance Plan

*품질 보증*. SQA 활동의 *조직 차원 보장*.

### SQAP 구조 (DO-178C §11.5)

```
1. Introduction
2. SQA Organization
   - SQA Manager
   - 개발 조직과의 *독립성*
   - 보고 라인 (조직도 포함)
3. SQA Activities
   - Process audits
   - Product audits
   - Lifecycle audit
   - Non-conformance handling
4. SQA Records
5. Independence Justification
   - DO-178C가 요구하는 *Independence 충족 입증*
6. Reviews
   - SQA가 수행하는 review 종류
7. SQA Schedule
8. SQA Tools and Methods
9. SAS (Software Accomplishment Summary) 작성
```

### SQA의 핵심 — Independence

```
=== SQAP §5 — Independence ===

5.1 Organizational Independence
   The SQA Manager reports to the VP Quality Assurance, who reports
   to the CTO. The SQA team is funded separately from the SW
   development team.

   No SQA team member shall:
   - Be assigned development tasks for this project
   - Be evaluated based on SW development metrics
   - Have line management over SW developers

5.2 Independence Audits
   Every 6 months, an external auditor (TÜV SÜD or equivalent)
   shall verify SQA independence by:
   - Reviewing organization chart
   - Interviewing SQA staff
   - Sampling SQA records

5.3 Conflict of Interest
   Any potential conflict (e.g., prior development work on same
   project) requires CTO approval and documented mitigation.

5.4 Findings Resolution
   SQA findings against development:
   - Open: SQA reports to PM
   - Disagreement: Escalate to VP Engineering
   - Final: VP Quality has veto on closure
```

이 *구체성*이 *심사관 신뢰*를 만든다. *추상적 약속*만 있으면 다음 단계에서 *Independence finding* 발생.

## 6-8. Standards — SRS, SDS, SCS

3개 *표준 문서*. *Plan*은 *어떻게 일할지*, *Standard*는 *결과물이 어떻게 보일지*.

### SRS — Software Requirements Standards

HLR의 *작성 형식·언어·규칙*.

```
=== SRS — Software Requirements Standards ===

1. Requirement Format
   Each requirement shall:
   - Have unique identifier (HLR-NNNN)
   - Be a single, atomic statement
   - Use "shall" for normative requirements
   - Use "should" only for non-normative recommendations
   - Avoid ambiguous terms ("appropriate", "as needed", "fast")
   - Include rationale (if non-obvious)
   - Be testable

2. Requirement Categories
   - Functional
   - Performance
   - Safety
   - Interface
   - Resource (memory, CPU)
   - Constraint

3. Requirement Attributes
   Each requirement in DOORS shall have:
   - ID
   - Text
   - Category (above)
   - Rationale
   - Source (allocated from System Req)
   - Allocation (which module implements it)
   - Test cases (which tests verify it)
   - Verification Method (Test/Analysis/Review)
   - Status (Draft/Reviewed/Approved/Implemented/Verified)

4. Examples

   Good HLR:
   "HLR-014: The brake control SW shall apply brake force
    proportional to pedal position with response time < 50ms
    from pedal change to actuator command."

   Bad HLR (rejected by review):
   "HLR-014: The brake control SW shall apply brake force quickly."
   (Not measurable: "quickly" undefined.)
```

### SDS — Software Design Standards

LLR + Architecture의 *작성 형식·notation*.

```
=== SDS — Software Design Standards ===

1. Architecture Notation
   - SysML for system structure
   - UML class diagrams for OO (if used)
   - Sequence diagrams for interaction
   - State machines for stateful logic

2. Module Decomposition Rules
   - Module ≠ class. Modules can group multiple classes.
   - Modules shall have explicit interfaces (header file).
   - Module dependencies shall be unidirectional (acyclic).

3. Memory and Timing Budget
   Each module shall declare:
   - Memory: ROM, RAM, stack (worst-case)
   - Timing: Worst-case execution time (WCET)
   - Frequency: Call frequency from upper layers

4. Interfaces
   Each interface shall specify:
   - Function signature
   - Pre-conditions
   - Post-conditions
   - Side effects
   - Error returns
   - Performance constraints

5. State Machine Notation
   - Stateflow (Simulink) for complex
   - C enum + switch for simple
   - Document all transitions

6. LLR-to-HLR Allocation
   Each LLR shall trace to one or more HLR.
   Coverage matrix in DOORS.
```

### SCS — Software Code Standards

*코드 자체*의 규칙. *MISRA C + 프로젝트 추가*.

```
=== SCS — Software Code Standards ===

1. Base Standard
   MISRA C:2012 Amendment 4 — all Mandatory and Required rules.
   See Project Coding Standard Document (PCSD) for advisory promotions.

2. Project-Specific Rules

   PR-001: All public functions documented with Doxygen.
   PR-002: All functions ≤ 60 LSLOC (excluding comments).
   PR-003: McCabe Cyclomatic ≤ 10.
   PR-004: Nesting depth ≤ 4.
   PR-005: Function parameters ≤ 6.
   PR-006: All non-void function returns checked or (void) cast.
   PR-007: No dynamic memory after init (MISRA 21.3 strict).
   PR-008: No recursion (MISRA 17.2 strict, no deviation).
   PR-009: All header files have include guards (Dir 4.10).
   PR-010: ISR functions ≤ 30 LSLOC.

3. Naming Conventions

   File names: lowercase, underscore. flight_ctrl.c, can_driver.h
   Types: PascalCase. FlightState, CanMessage
   Functions: snake_case. flight_ctrl_init()
   Variables: snake_case. current_altitude
   Constants: SCREAMING_SNAKE. MAX_ALTITUDE, MIN_AIRSPEED
   Macros: SCREAMING_SNAKE. DEG_TO_RAD(x)

4. File Organization

   Header (.h):
   - Include guard
   - Doxygen file-level comment
   - Includes (system first, then project)
   - Forward declarations
   - Public types
   - Public functions

   Implementation (.c):
   - Doxygen file-level comment
   - Includes
   - Private types
   - Static (file-scope) variables
   - Static (private) functions
   - Public functions (matching .h order)

5. Documentation
   Every public function: Doxygen with:
   - @brief
   - @param (each parameter)
   - @return
   - @pre
   - @post
   - @note (if non-obvious)
   - @requirement (traceability)

6. Code Examples

   Good function:
   /**
    * @brief Compute commanded thrust from throttle position.
    *
    * @param throttle_pct Throttle position (0-100%).
    * @return Commanded thrust in Newtons (0-150000 N).
    * @pre throttle_pct ∈ [0, 100]
    * @post return value ∈ [0, 150000]
    * @requirement HLR-PROP-014
    */
   uint32_t propulsion_compute_thrust(uint8_t throttle_pct);
```

## FAA SOI 1 Review — 첫 관문

Planning Phase 완료 후 *SOI 1 Review*. FAA Designated Engineering Representative (DER)가 *모든 8개 산출물 검토*.

### SOI 1 Agenda

```
Day 1
  Morning:    Project introduction, organization
  Afternoon:  PSAC review
              - Certification basis
              - DAL determination
              - Means of Compliance
              - Schedule

Day 2
  Morning:    SDP review
              - Lifecycle adequacy
              - Transition criteria
              - Tool selection
  Afternoon:  SVP review
              - Verification strategy
              - Independence
              - Coverage approach

Day 3
  Morning:    SCMP, SQAP review
  Afternoon:  SRS, SDS, SCS review

Day 4
  Morning:    Findings discussion
  Afternoon:  Closeout, next steps
```

### Typical Findings — SOI 1

```
가장 흔한 Finding (Major):
1. "PSAC §6.2 — Software Lifecycle Data 목록에 SAS Plan 누락"
2. "SVP §5.3 — Independence claim에 조직 차트 미첨부"
3. "SCMP §4 — Baseline 정의가 모호. 'after major milestones'는 부족"
4. "SCS §3 — Naming convention 예시 부족"
5. "PSAC §4.4 — DAL B의 obj A-5-6 verification approach 불충분"

Minor Findings:
- Document version inconsistency between PSAC and SDP
- Reference list incomplete
- Acronym definitions missing
- Cross-reference errors
```

각 Major finding 해소 후 *FAA 재검토*. 2-3 round 일반적.

### Resolution Timeline

```
Day +1   : Findings sent in writing
Day +14  : Project response to findings
Day +28  : Updated documents submitted
Day +42  : FAA acceptance review
Day +45  : SOI 1 closure (if all closed)
```

*Major finding 5개*면 *2~3개월 추가*. 일정 영향 큼.

## Planning Phase 일정 — 실전

```
Month 1-2  : 초기 작성
  Week 1: PSAC outline + DAL 결정
  Week 2: SDP outline + Tool 선택
  Week 3: SVP outline + Independence 설계
  Week 4: SCMP, SQAP outline
  Week 5: SRS, SDS, SCS outline
  Week 6: 내부 review (전 문서 1차)
  Week 7-8: 수정

Month 3    : 내부 baseline
  Week 1-2: 내부 baseline review
  Week 3: FAA pre-submit meeting (informal)
  Week 4: 수정 + submit

Month 4    : FAA SOI 1 review
  - 4일 on-site or virtual review
  - Day after: findings

Month 5-6  : Findings resolution
  - 5-10 major findings resolution
  - Documents update + re-submit

Month 7    : SOI 1 closure
  - FAA acceptance letter
  - Planning Phase 종료
  - Development Phase 진입
```

## 모범 사례

### 1. Template 사용

처음부터 *직접 작성하지 마라*. *유사 프로젝트의 PSAC*을 *base*로 시작.

```
시중 templates:
- AFuzion DO-178C Templates (paid)
- PRQA / Helix QAC examples
- Industry consortia (AEEC, RTCA)
- 개인 컨설턴트 (Ravensbeach, Konrad Riek)
```

### 2. DER을 미리 만나라

PSAC 작성 *시작 단계*에서 *FAA DER과 informal meeting*. 결정적 차이를 *미리 확인*.

```
Pre-submit meeting agenda:
- DAL 결정 sanity check
- 사용 도구 acceptability
- Alternative methods 의향
- Schedule realism
```

### 3. Cross-team review

Plan/Standard 작성 후 *engineering 팀과 SQA가 같이* review. *현실 가능성* 검증.

### 4. Living document

Plan은 *고정 문서 아님*. 프로젝트 중 *상황 변화* 시 *update + DER 알림*.

```
변경 trigger:
- DAL 변경 (system safety re-assessment)
- 새 도구 도입
- Independence 모델 변화
- Schedule slip
- Subcontractor 변경
```

## 정리

- Planning Phase는 *3~7 개월*. 5 plan + 3 standard 작성.
- PSAC가 *가장 중요*. 심사관 첫 인상.
- Transition criteria가 *구체적·측정 가능*해야 finding 회피.
- Independence는 *조직 차원 보장* + 문서화.
- Standards (SRS/SDS/SCS)가 *결과물 형식 정의*. 코딩 표준은 *MISRA + 추가*.
- SOI 1 review는 *4일 on-site*. Major finding 5-10개 일반적.
- Findings resolution은 *추가 2-3 개월*.
- Templates 사용 + DER pre-meeting + cross-team review가 모범 사례.

## 다음 장 예고

4장은 *Software Requirements (HLR)* — DOORS를 활용한 HLR 작성·관리, requirement attribute, peer review 절차.

## 관련 항목

- [Ch 2 — DAL과 71 Objectives](/blog/embedded/aerospace-standards/do-178c/chapter02-dal-and-objectives)
- [Ch 4 — Software Requirements (HLR)](/blog/embedded/aerospace-standards/do-178c/chapter04-software-requirements)
- [Ch 10 — Configuration Management & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [Ch 11 — Tool Qualification (DO-330)](/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330)
- [FAA AC 20-115D](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/1029487)
