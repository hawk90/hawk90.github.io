---
title: "Ch 7: 검증 — Reviews·Analyses·Testing"
date: 2026-05-18T07:00:00
description: "DO-178C verification process — review·analysis·test의 3축과 trace 요구."
series: "Developing Safety-Critical Software"
seriesOrder: 7
tags: [avionics, do-178c, verification, review, test]
draft: true
---

## 한 줄 요약

> **"Verification = Review + Analysis + Test"** — 세 방법의 *조합*으로 objective 충족.

## DO-178C Verification 3축

**Review** (정적, 사람·문서 중심):

- HLR review
- LLR review
- Architecture review
- Code review
- Test cases·procedures review
- Test results review

**Analysis** (도구·수학적):

- Static code analysis (MISRA·CERT)
- Control flow analysis
- Data flow analysis
- Timing analysis (WCET)
- Stack analysis
- Coverage analysis (Ch 8)

**Test** (실행 기반):

- Requirements-based test (HLR·LLR)
- Robustness test
- Hardware·Software integration test
- System test
- Stress test

DO-178C Annex A — *71 objectives*. Verification이 *최대 비중*.

## Review — Process Detail

**Review checklist 예 (HLR)**:

- [ ] 명확성 (clarity)
- [ ] 검증 가능 (verifiability)
- [ ] 일관성 (consistency)
- [ ] 완전성 (completeness)
- [ ] 수정 가능 (modifiability)
- [ ] 추적 가능 (traceability)
- [ ] System requirement에 trace

**Review meeting** — Author + reviewer 2+ + QA + 가끔 customer.

Comment 분류:

- **Defect** (수정 필요)
- **Suggestion** (선택)
- **Question** (clarification)

**Resolution** — Comment별 author 응답. Re-review 후 close.

Audit trail — *who·when·what comment·resolution*.

## Independence in Review

**DAL 별 independence 요구**:

- **Level A** — HLR·LLR·architecture·test 모두 independence 필요
- **Level B** — HLR·LLR·architecture independence 필요
- **Level C** — HLR·architecture independence 필요
- **Level D** — Independence 권장

**Independence** = "검증자 ≠ 개발자".

- 같은 회사 가능
- 다른 팀 권장
- IV&V (Independent Verification & Validation) 별도 회사도 가능

방위·우주 — *IV&V 회사 별도 계약* 흔함.

## Analysis — Control Flow

**Control flow analysis**:

- Cyclomatic complexity (McCabe)
- Function·module별 path 수
- Unreachable code 검출
- Infinite loop 검출

**도구**:

- LDRA Testbed
- Polyspace
- Coverity
- QA·C/C++
- 자체 + clang

**Output**:

- Function별 complexity score
- Unreachable code 경고
- Recommendation

Cyclomatic > 10 — *경고*. > 15 — *refactor*.

## Analysis — Data Flow

**Data flow analysis**:

- Uninitialized variable read
- Unused variable·function
- Variable lifetime
- Race condition
- Use-after-free

**도구**:

- 위와 동일
- Polyspace (formal — abstract interpretation)
- Frama-C (C)
- SPARK (Ada)

Race·use-after-free — *전형적 결함*. Catch 가능.

## Analysis — Timing·WCET

**WCET (Worst-Case Execution Time) analysis**:

- **Static** — 코드·아키텍처 기반 *수학적 상한*
- **Dynamic** — measurement 기반 *통계*

**도구**:

- aiT (AbsInt) — static WCET (de facto)
- RapiTime — measurement
- Heap·stack analysis 별도

**중요성**:

- Hard real-time deadline 보장
- Interrupt latency 분석
- Cache·pipeline 효과 고려

예 — Flight control loop period = 1 ms → 모든 함수 WCET 합 < 1 ms 필수.

DO-178C Level A·B — *WCET evidence* 요구.

## Analysis — Stack

**Stack analysis** — Static analyzer가 각 function 스택 사용량 계산. Call tree 따라 최대 누적.

**Tools**:

- GCC `-fstack-usage` (per-function)
- 자체 script + linker map
- AbsInt StackAnalyzer

예시 call tree:

```text
Function       Stack    Cumulative
main           32       32
 → init        128      160
 → loop        16       
  → control    256      304
  → telemetry  64       
```

Max stack 304 bytes / Allocated 1024 bytes ← 충분.

Stack overflow — *flight 중 catastrophic*. WCET와 함께 *증명 필수*.

## Test — Requirements-based

**HLR-based test** (high-level requirement):

- 각 HLR마다 test case 1+
- Black-box (interface 위주)
- System·integration level

**LLR-based test** (low-level requirement):

- 각 LLR마다 test case 1+
- White-box (internal 위주)
- Unit·module level

**DO-178C 핵심** — HLR이 *not just covered* → 명시적 *test가 존재*해야. Coverage만으로 부족.

각 *requirement → test case → test result* trace.

## Test Procedure 예

```text
Test Case: TC-AVIONICS-ALT-001
Title: Normal altitude estimate update
Requirement: HLR-AVIONICS-ALT-0001

Setup:
  Filter initialized with default state
  Mock IMU·GPS·barometer

Inputs:
  IMU sample (acc=9.81, gyr=0)
  GPS altitude = 100 m
  Baro pressure = 101325 Pa
  
Expected Output:
  Estimated altitude in [100±5] m
  No NaN·Inf
  
Procedure:
  1. Initialize filter
  2. Feed measurements
  3. Read estimate
  4. Verify range
  
Pass criteria:
  All 5 measurements yield estimate in range
  
Results:
  Run 1: alt=99.8 → PASS
  Run 2: alt=100.2 → PASS
  ...
  Run 1000: alt=100.1 → PASS
  
Verdict: PASS
```

각 TC — *runnable·repeatable·documented*.

## Test — Robustness

**Robustness test** — 보통 input 외 *경계·invalid·overflow*.

**Examples**:

- NaN·Inf input
- Negative time
- Out-of-range temperature
- Communication timeout
- Memory corruption
- Power glitch (HW + SW)
- Stack overflow
- Buffer overflow

DO-178C — *robustness test* per requirement 권장.

Robustness = *비정상 input에 graceful 대응*. Not crash.

## Test — Coverage

Coverage 종류 (Ch 8 자세히).

- **Statement coverage (Level C+)** — 각 statement 1번 이상 실행.
- **Decision coverage (Level B+)** — 각 if·while·for의 true·false 각각.
- **MC/DC (Modified Condition/Decision Coverage, Level A)** — 각 condition이 *독립적으로 outcome 결정*.

예 — `if (A && B) { ... }`:

- A=T, B=T (decision=T)
- A=F, B=T (decision=F, A가 결정)
- A=T, B=F (decision=F, B가 결정)
- → 3 test 필요

Coverage = *quality metric*. Plan에 *target 명시*.

## HW·SW Integration Test

**HW·SW Integration Test (HSIT)** — Real HW + real SW. Final integration step.

**환경**:

- Actual FCC board
- Real sensor·actuator (또는 simulator)
- Real bus (1553·SpaceWire·UART)

**Test**:

- Boot·initialization
- Sensor read (정밀도·timing)
- Actuator command
- Communication
- Error injection (sensor fail·comm loss)

**Coverage**:

- HW·SW interface 100%
- Init·shutdown
- All operational modes

소프트웨어만 아닌 *통합 시스템* test.

## Test Tools

**Unit test**:

- Vector CAST (TQL-1 qualified)
- LDRA TBrun
- Cantata++
- Google Test (자체 qualification)

**Integration·system test**:

- dSPACE — HIL
- National Instruments VeriStand
- Vector CANoe — bus test
- Mathworks Simulink Test
- Python·custom framework

**Robustness·fault injection**:

- dSPACE fault injection
- 자체 hook + simulator

각 tool — *DO-330 qualification* 필요.

## Trace Matrix — 양방향

Trace 요구 (DO-178C 핵심):

```text
System Requirement (SyR)
  ↑↓
HLR (High-Level Requirement)
  ↑↓
LLR (Low-Level Requirement)
  ↑↓
Code
  ↑↓
Test Case
  ↑↓
Test Result
```

각 link — 양방향 trace 가능해야 한다.

**Tools**:

- IBM DOORS (de facto)
- Polarion
- Jama
- 자체 DB + Excel

미흡한 trace — *audit 시 직접 fail 원인*.

## Verification Results — Document

**SVR (Software Verification Results)**:

- Test summary
- Pass·fail 통계
- Coverage achieved
- Anomaly 분석
- Re-test history

**SAS (Software Accomplishment Summary)**:

- Final document — FAA·EASA 제출
- All evidence 요약
- Compliance to PSAC
- Outstanding issues

SVR + SAS — *certification artifacts*. Ch 14 자세히.

## Re-verification

Code change → re-verification.

- Same test re-run
- Coverage re-check
- Analysis re-run
- Review re-do

**Regression strategy** — Full re-run 또는 impact analysis. Trace matrix 활용.

**DO-178C 권장** — Sufficient regression test. Modification 영향 분석 + adequate test.

Code change minor라도 *충분 regression* 권장.

## Automation

**CI·CD for safety-critical**:

- Build automation (CMake·Make)
- Unit test automation
- Coverage automation
- Static analysis automation
- Report generation

**Tools**:

- Jenkins·GitLab CI·Bamboo
- 자체 + Python

**주의**:

- Tool 자체 qualification (DO-330)
- Build·test reproducibility
- Audit trail
- Tool version control

Automation — *발전 추세*. 단 qualification 부담.

## Korean Verification — 방사청·IV&V

**방사청 SW 신뢰성시험** — 보통 IV&V 회사 contract. 표준화시험원·신뢰성 시험원·중소 IV&V 회사.

**IV&V 활동**:

- Requirements review
- Design review
- Code review
- Test cases·procedures review
- Test execution
- Coverage·analysis 결과 verify
- Final report

**한국 특수** — 방사청·국방기술품질원 (DTAQ) 표준 따름. 방사청 directive 적용.

IV&V — 방사청 *권고 또는 필수*. 한국 방산 표준.

## Verification Effort

SW Development effort distribution (typical):

| Phase | Effort |
|---|---|
| Plans·Standards | 5% |
| Requirements | 10% |
| Design | 10% |
| Code | 15% |
| **Verification** | **50% ← 최대** |
| Configuration·QA | 10% |

**Level A·B 인증** — Verification effort가 *development 보다 더 큼*.

**DO-178C "expensive" 이유** — Verification rigor, Documentation, Tool qualification.

Cost 50% — *verification에 투입*. Plan·budget 시 고려.

## 자주 하는 실수

> ⚠️ Coverage만 챙기고 *requirement-based test 부족*

"100% coverage 달성" → Coverage는 *어디 실행*만, *왜·언제* 아님 → HLR·LLR이 명시 test 없으면 fail.

→ *requirement → test 양방향 trace*.

> ⚠️ Robustness test skip

Normal case 100% → robustness 미실시 → Edge case·boundary·fault 미검증 → 실제 비행 시 corner case crash.

→ *robustness test 필수*.

> ⚠️ Re-verification 누락

Bug fix → 해당 test만 재실행 → Side effect catch 못함.

→ *impact analysis + regression test*.

> ⚠️ Manual review skip

"Static analyzer pass → 충분" → Algorithmic·semantic 결함 catch 불가.

→ *manual review 필수*.

## 정리

- DO-178C verification = **Review + Analysis + Test**.
- Each requirement — *명시적 test case + 양방향 trace*.
- WCET·stack analysis — Level A·B 필수 evidence.
- Robustness test — *경계·invalid input* 검증.
- IV&V — independence 강화, 한국 방사청 표준.
- Verification effort — *총 50%* 비중.
- Tool — DO-330 qualified.

다음 편은 **Coverage — Statement·Decision·MC/DC**.

## 관련 항목

- [Ch 6: Coding Standards](/blog/embedded/avionics/developing-safety-critical/chapter06-coding-standards)
- [Ch 8: Coverage](/blog/embedded/avionics/developing-safety-critical/chapter08-coverage)
- [Ch 9: Tool Qualification](/blog/embedded/avionics/developing-safety-critical/chapter09-tool-qualification)
