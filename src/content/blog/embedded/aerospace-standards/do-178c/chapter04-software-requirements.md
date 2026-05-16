---
title: "Ch 4: Software Requirements (HLR — High-Level Requirements)"
date: 2025-09-25T05:00:00
description: "System Requirements → HLR 파생, DOORS 활용, 7 attribute, derived requirement, requirement review의 전체 과정."
tags: [do-178c, requirements, hlr, doors, polarion, traceability, derived]
series: "DO-178C"
seriesOrder: 4
draft: false
---

DO-178C의 *Software Requirements Process*가 *Group A-2의 5 obj + Group A-3의 7 obj = 12 obj*를 차지한다. 전체 71 obj의 약 17%. HLR(High-Level Requirements)이 *모든 후속 개발의 starting point*. 이 장은 *HLR을 어떻게 쓰고 관리하고 검증하는가*를 본다.

## HLR의 정의 — DO-178C §11.9

> **High-Level Requirements**: Software requirements developed from analysis of system requirements, safety-related requirements, and system architecture.

System requirements (SR)에서 *SW로 할당된 부분*을 *SW 관점에서 다시 쓴 것*. 한 단계 *추상화*하지만 *구체화하지 않은* 단계.

```
System Requirements (SR)        ← 시스템 전체 (HW + SW)
   │
   ↓ (allocation to SW)
Software Requirements (HLR)     ← SW 관점, 시스템 동작 명세
   │
   ↓ (design decomposition)
Low-Level Requirements (LLR)    ← 구현 단계, 모듈별
   │
   ↓ (coding)
Source Code
```

## HLR vs SR 차이 — 구체적 예

```
System Requirement (SR-FCS-014):
   "The flight control system shall detect aircraft stall condition
    based on angle-of-attack (AoA), airspeed, and load factor, and
    issue audio/visual warnings to the pilot within 100 ms of
    confirmed stall conditions."

→ SW Requirement (HLR-FCS-014a):
   "The Stall Warning Software shall compute the AoA threshold based
    on current weight, altitude, and configuration (flap position),
    using lookup table SW-FCS-LUT-014, every 50 ms."

→ SW Requirement (HLR-FCS-014b):
   "The Stall Warning Software shall declare a 'pre-stall' condition
    when AoA exceeds 80% of computed threshold for 3 consecutive 50ms
    samples."

→ SW Requirement (HLR-FCS-014c):
   "The Stall Warning Software shall send AURAL_STALL_WARN message
    to Audio Manager via CAN bus message 0x142 within 50 ms of
    declaring pre-stall condition."
```

SR 한 줄이 *3+ HLR로 decompose*. 각 HLR은 *측정·검증 가능*.

## HLR의 7 Attributes (DO-178C §11.9)

각 HLR은 *7개 속성*을 모두 가져야:

```
1. Functional and performance requirements
   - "무엇을" 한다
   - 성능 (응답시간, 처리량, 정확도)

2. Safety / reliability requirements
   - Safety 영향 명시
   - Failure modes 고려

3. Time / memory budgets
   - WCET 할당
   - RAM/ROM 예산

4. Hardware / software interfaces
   - 입출력 신호
   - Bus message
   - Memory-mapped register

5. Failure detection / fault tolerance
   - 감지할 failure 종류
   - 대응 동작

6. Partitioning requirements
   - 다른 SW와의 격리
   - 시간·공간·통신 partitioning

7. Input/output mapping
   - 입력 → 출력 명세
```

### HLR 형식 — 좋은 예

```
=== HLR-FCS-014b ===

ID:                  HLR-FCS-014b
Title:               Stall Pre-warning Detection
Description:         The Stall Warning Software shall declare a
                     "pre-stall" condition when AoA exceeds 80% of
                     computed threshold for 3 consecutive 50ms
                     samples.

Rationale:           ARP 4761 §7.2 requires advance warning to
                     allow pilot recovery action before actual stall.
                     80% threshold validated by flight test FT-2024-042.

Source:              SR-FCS-014 (Flight Control System Stall Warning)

Allocation:          Module: stall_warning.c
                     Function: detect_pre_stall()

Verification Method: Test (HIL with replay of recorded flight data)

Test Cases:          TC-FCS-014b-001 — Normal flight, no warning
                     TC-FCS-014b-002 — Slow approach to stall
                     TC-FCS-014b-003 — Sudden AoA spike
                     TC-FCS-014b-004 — Borderline case (78% for 5 samples)

Status:              Approved (2024-04-15)
DAL:                 A (catastrophic if missed warning)

Attributes:
- Functional:        Yes (defines threshold logic)
- Performance:       Yes (3 × 50ms = 150ms latency budget)
- Safety:            Yes (catastrophic failure prevented)
- Time/Memory:       Yes (50ms cycle, in stall_warning module budget)
- HW/SW Interface:   No (internal SW)
- Failure/Fault:     Yes (loss of detection → reverts to actual-stall mode)
- Partition:         No (within Stall Warning Partition)
- I/O Mapping:       Yes (input: AoA + threshold; output: pre-stall flag)

Derived:             No (allocated from SR)
```

이 *세부 수준*이 *DAL A HLR의 표준*. 단순한 한 줄 ("Stall warning shall be detected")는 *검증 불가능* — finding 발생.

## Derived Requirements

System Requirements에 *없는데 SW 설계 과정에서 필요*해진 requirement. *명시적으로 표시*.

```
=== HLR-FCS-014d (Derived) ===

ID:                  HLR-FCS-014d
Title:               Stall Warning Internal State Persistence
Description:         The Stall Warning Software shall reset its
                     pre-stall detection state to "idle" upon
                     receiving a SYSTEM_RESET signal.

Rationale:           Internal state must be initialized on reset to
                     ensure deterministic behavior. Not derivable
                     from system requirements alone.

Derived:             YES (no SR parent)

Allocated Back to:   System Process (SR review needed)
                     Tracked in: System-Tracking-Item STI-2024-089
                     Status: Acknowledged by System Team (2024-05-02)
```

### Derived Requirement 처리 — DO-178C §5.1.2

> "Derived requirements not directly traceable to higher level requirements shall be communicated to the process that is responsible for the higher level."

*Derived requirement는 system process에 통보*해야. System team이 *재검토*하고 *system safety analysis에 반영*. 누락하면 *Safety case 무효화* — finding 폭주.

## Tool — DOORS, Polarion

HLR은 *문서로 관리하지 않음*. *Requirements management tool* 사용.

### IBM Engineering Requirements Management DOORS

```
DOORS의 강점:
- 항공·우주 산업 표준 (50% 이상 시장)
- Strong traceability
- Baseline 관리
- Configuration item attribute
- DXL scripting

약점:
- UI 90년대 풍
- 라이선스 비쌈 ($5-10k/seat)
- Cloud 적응 늦음
- 학습 곡선 가파름
```

### Siemens Polarion

```
Polarion의 강점:
- Modern web UI
- Git 통합
- Open API
- DOORS 마이그레이션 지원

약점:
- 항공 시장 DOORS만큼 검증되지 않음
- 일부 항공 OEM은 거부
```

### Atlassian Jira + Plugin

```
- Aha! Roadmaps
- ReqIF integration plugins
- 항공 인증에는 *아직 부족*하나 점진 채택
```

DOORS가 *항공 산업 큰 시장 점유*. Boeing, Airbus 등 대형 OEM이 *DOORS + 자체 시스템*을 결합하는 사례 공개. 각 한국 기업의 *내부 tool stack*은 *비공개*.

## Traceability Matrix

각 HLR은 *위·아래로 추적 가능*해야.

```
System Req  →  HLR (다대다)  →  LLR  →  Code  →  Tests
                                              ↓
                                          Coverage
```

DOORS의 *Traceability View*:

| SR | HLR | LLR | Test |
|----|-----|-----|------|
| SR-FCS-014 | HLR-FCS-014a | LLR-SW-042, LLR-SW-043 | TC-014a-001, TC-014a-002 |
|  | HLR-FCS-014b | LLR-SW-048 | TC-014b-001, TC-014b-002, TC-014b-003 |
|  | HLR-FCS-014c | LLR-SW-052, LLR-CAN-007 | TC-014c-001 |
|  | HLR-FCS-014d (Derived) | LLR-SW-055 | TC-014d-001 |

이 매트릭스가 *Coverage 입증의 핵심*. DAL A는 *모든 셀이 채워져야*.

### Coverage Holes

```
SR Coverage by HLR:        100% — 모든 SR이 HLR에 매핑됨
HLR Coverage by LLR:       100% — 모든 HLR이 LLR에 매핑됨
LLR Coverage by Code:      99.5% — 일부 LLR이 코드 없음 (PR-1042 open)
HLR Coverage by Tests:     100% — 모든 HLR이 test 있음
LLR Coverage by Tests:     100%
```

*99.5%*도 finding. *100% 달성*하거나 *justify*해야.

## A-3 — HLR Verification (Group A-3)

15 obj가 *HLR 검증*에 할당. DAL A는 *7개 with Independence*.

### A-3-1 — HLR ↔ System Requirements

> "High-level requirements comply with system requirements."

각 HLR이 *system req와 일치*하는지 검증.

**Method**: Review + Traceability analysis.

**Tool**: DOORS의 *Coverage Wizard*.

```
Coverage check (DOORS DXL):
   for each SR in module "System Requirements":
       linked_hlrs = SR.outgoing_links("derives")
       if linked_hlrs.empty():
           print "WARNING: SR " + SR.ID + " has no HLR allocation"
       else:
           print "OK: SR " + SR.ID + " → " + len(linked_hlrs) + " HLRs"
```

이 스크립트가 *모든 SR의 HLR 할당* 검증. 누락 발견 시 *PR (Problem Report) 발행*.

### A-3-2 — HLR 정확·일관

> "High-level requirements are accurate and consistent."

*Internal consistency*: 두 HLR이 *서로 모순* 안 함.

**Common Inconsistency**:

```
HLR-FCS-014b: "pre-stall is declared after 3 consecutive 50ms samples"
HLR-FCS-022:  "stall warning shall activate within 100ms of stall onset"

Conflict: pre-stall detection = 150ms,
         which exceeds 100ms warning requirement.

Resolution: Update HLR-FCS-014b to 2 samples (100ms)
            OR update HLR-FCS-022 to 200ms.
```

이런 *cross-HLR 분석*이 review의 핵심. *수십~수백 HLR* 사이 *모순 발견* 어려움.

### A-3-3 — HLR ↔ Target Computer

> "High-level requirements are compatible with target computer."

HLR이 *실제 hardware*에서 구현 가능한가.

```
Examples:
- HLR이 *128MB RAM* 요구. Target은 *64MB만 가짐* → 불가능.
- HLR이 *μs 단위 응답* 요구. Target CPU가 *그 빠르기 안 됨* → 불가능.
- HLR이 *부동소수점 연산* 요구. Target에 *FPU 없음* → 가능하지만 느림.
```

*Target compatibility analysis*가 *Design 시작 전*에 필요.

### A-3-4 — HLR Verifiable

> "High-level requirements are verifiable."

각 HLR이 *test/analysis/review로 검증 가능*한가.

**Unverifiable HLR examples**:

```
"The system shall be user-friendly."        → 측정 불가
"Response shall be quick."                  → 정량화 없음
"The software shall be robust."             → 무엇이 robust인가
"The interface shall be intuitive."         → 주관적

Fix:
"The system shall present primary controls within 1 click from main screen."
"Response time shall be < 50ms for 95th percentile inputs."
"The software shall continue operation under [list of 12 fault conditions]."
"The interface shall be testable by users with no prior training in 10 trials."
```

**Verification Method**가 *HLR attribute*에 명시:

```
- Test: HIL or unit test
- Analysis: static analysis, formal proof, simulation
- Review: peer review, expert review
- Demonstration: 종합 동작 시연
```

### A-3-5 — HLR ↔ Standards

> "High-level requirements conform to standards."

HLR이 *프로젝트 SRS (Software Requirements Standards)* 준수.

SRS가 정한 *format, attributes, examples*에 *모든 HLR이 따름*.

### A-3-6 — HLR Traceable

> "High-level requirements are traceable to system requirements."

위에서 본 traceability. 모든 HLR이 *적어도 하나의 SR에 연결* 또는 *Derived로 표시*.

### A-3-7 — HLR Algorithms Accuracy

> "Algorithms used in the high-level requirements are accurate."

HLR에 *수학적 알고리즘*이 있으면 *정확성 입증*.

**예**: Kalman filter 수렴, PID 게인 안정성, GPS 좌표 변환 정확도.

**Tool**: MATLAB, Mathematica로 *수치 검증*. 또는 *공식 증명 (Coq, Isabelle)*.

```
=== Algorithm Verification Example ===

HLR-NAV-007:
"GPS WGS-84 coordinates shall be converted to local UTM coordinates
 using the algorithm specified in Annex A."

Verification:
- MATLAB simulation with 10,000 random WGS-84 points
- Compare to ground truth (PROJ.4 library output)
- Acceptance: max error < 0.5m for all points within zone
- Result: max error = 0.3m, mean = 0.1m → PASS

Document: Algorithm Verification Report AVR-NAV-007
```

## HLR Peer Review — Procedure

A-3 objectives는 *주로 review로 충족*. *Peer Review*가 *공식 procedure*.

### Review Process

```
1. Author finalizes HLR draft in DOORS
   → Status: Draft

2. Author submits for review
   → Status: Under Review
   → DOORS notification to reviewers

3. Reviewers (3-5 people):
   - Author's lead
   - Independent verifier (Independence 요구 시)
   - Domain expert
   - Test engineer (verifiability)
   - Optionally: Customer / Stakeholder

4. Reviewers add comments in DOORS
   - Issue type: Critical / Major / Minor / Question
   - Comment text
   - Suggested resolution

5. Author addresses each comment
   - Accept → modify HLR
   - Reject → justify rejection
   - Defer → create PR for later

6. Reviewers verify resolutions
   - Mark resolved/not-resolved
   - Re-review if needed

7. Review chair declares review complete
   → Status: Approved
   → HLR baseline locked

8. Review record archived
   - Attendees, duration, comments, resolutions
   - SQA audit trail
```

### Review Checklist (HLR 일부)

```
□ Each HLR has unique ID per SRS naming convention.
□ Each HLR is atomic (one requirement per statement).
□ Each HLR uses "shall" for normative.
□ Each HLR is verifiable (testable/analyzable/reviewable).
□ Each HLR has rationale.
□ Each HLR has at least one SR parent OR is marked Derived.
□ Each HLR has allocation (module).
□ Each HLR has DAL.
□ Each HLR has at least one Verification Method.
□ HLR set is internally consistent (no contradictions).
□ HLR set is complete (covers all SR allocated to SW).
□ Performance HLRs are quantified.
□ Safety HLRs reference SSA.
□ Memory/timing HLRs have specific values.
□ Interface HLRs have signal/message references.
```

수십 개 항목. 수백 HLR 검토 시 *상당한 작업량*.

## Common Findings — HLR

```
가장 흔한 Finding (Major):

1. "HLR-XXX는 'appropriate', 'optimized' 등 측정 불가 단어 사용"
   → Verifiable 위반

2. "HLR-XXX와 HLR-YYY가 모순 (timing budget 불일치)"
   → Consistency 위반

3. "HLR-XXX는 derived지만 system team에 통보된 기록 없음"
   → DO-178C §5.1.2 위반

4. "SR-ZZZ가 HLR에 할당되지 않음"
   → Coverage 위반

5. "HLR-XXX의 rationale 누락"
   → SRS 위반

6. "HLR-XXX 검증 방법 'Inspection'이 너무 모호함"
   → A-3-4 위반
```

Major finding 1개 발생 시 *해결 + 재리뷰*. 평균 *HLR 100개당 5~10 major*. *DAL A 프로젝트*는 *HLR 200~500개*. 총 *수십 major finding* 가능.

## HLR Quality Metric

```
DOORS 자동 측정:

Total HLRs                          : 247
With SR parent                      : 235 (95.1%)
Marked Derived (without SR parent)  : 12 (4.9%)
With allocation                     : 247 (100%)
With test cases                     : 245 (99.2%)  ← 2 missing
With "shall" form                   : 247 (100%)
With rationale                      : 230 (93.1%)  ← 17 missing
With DAL specified                  : 247 (100%)

Average HLR length                  : 18 words
Median test cases per HLR           : 3
Max test cases per HLR              : 12
```

자동 metric으로 *quality 지표*. *95% 미만*은 finding 위험.

## Requirements Engineering Tool Comparison

| Tool | 라이선스 | 항공 시장 | 강점 |
|------|---------|---------|------|
| IBM DOORS | $5-10k/seat | 50%+ | 검증된 traceability |
| IBM DOORS NG | 비슷 | 증가 | Cloud, modern UI |
| Siemens Polarion | $4-8k/seat | 20% | Git 통합 |
| Visure Solutions | $3-6k/seat | 10% | Mid-market |
| Jama Connect | $3-5k/seat | 5% | Agile-friendly |
| 3SL Cradle | $3-5k/seat | 10% | UK/Europe |

대형 OEM = *DOORS + 자체 시스템*. 신생 스타트업이 *Polarion 또는 Jama*를 채택하는 경우 흔하다. 각 회사의 *공식 tool stack 발표*만 인용.

## 정리

- HLR은 *system req에서 SW로 할당된 부분*을 *SW 관점에서 다시 쓴 것*.
- 7 attribute (functional, safety, time/memory, interface, failure, partition, I/O).
- *Verifiable* — 측정 가능한 표현 필수.
- Derived requirement는 *system process에 통보* 의무.
- *Traceability* — System Req ↔ HLR ↔ LLR ↔ Code ↔ Test, 양방향 100%.
- DOORS가 *항공 산업 큰 시장 점유*.
- A-3 그룹의 obj 다수가 HLR 검증. DAL A는 일부 *Independence* 의무.
- Peer review가 공식 procedure (DOORS / Polarion 등의 workflow).

## 다음 장 예고

5장은 *Software Design (LLR + Architecture)* — HLR → LLR decomposition, architecture 표기, SCADE/Simulink 사용.

## 관련 항목

- [Ch 3 — Planning Phase](/blog/embedded/aerospace-standards/do-178c/chapter03-planning-phase)
- [Ch 5 — Software Design (LLR + Architecture)](/blog/embedded/aerospace-standards/do-178c/chapter05-software-design)
- [Ch 9 — Coverage Analysis (MC/DC)](/blog/embedded/aerospace-standards/do-178c/chapter09-coverage-mcdc)
- [IBM DOORS](https://www.ibm.com/products/requirements-management)
- [Siemens Polarion](https://polarion.plm.automation.siemens.com/)
- [ARP 4761 — Safety Assessment](https://www.sae.org/standards/content/arp4761a/)
