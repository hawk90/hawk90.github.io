---
title: "Ch 8: Verification — Review, Analysis, Test (RAT)"
date: 2025-09-25T09:00:00
description: "3가지 verification 방법의 분류·적용·증거. HIL/SIL 환경, robustness testing, KAI HIL lab 실제."
tags: [do-178c, verification, review, analysis, test, hil, sil, robustness]
series: "DO-178C"
seriesOrder: 8
draft: false
---

DO-178C는 *verification*을 *Review, Analysis, Test (RAT)*  3 종류로 정의한다. 각각 *어떤 obj에 효과적*인지 정해져 있다. 이 장은 *RAT의 본질, test level, HIL/SIL 환경, robustness testing*까지.

## RAT의 정의 — DO-178C §6

```
Review     : Subjective evaluation by qualified personnel.
             Examples: code review, design review, requirements review.

Analysis   : Detailed examination using static or formal methods.
             Examples: static analysis, WCET analysis, control/data
                       flow analysis, formal proof.

Test       : Execution of software with specified inputs and observation
             of outputs.
             Examples: unit test, integration test, system test, HIL.
```

### 어느 obj에 어느 방법

```
Activity                         Review  Analysis  Test
─────────────────────────────────────────────────────
HLR ↔ SR (A-3-1)                  ✓       △        -
HLR ↔ Algorithm accuracy (A-3-7)  -       ✓        ✓
LLR ↔ HLR (A-4-1)                 ✓       △        -
LLR ↔ Code (A-5-3)                ✓       ✓        -
Code ↔ Standards (A-5-2)          -       ✓        -
Code ↔ Test (A-7-3)               -       ✓        ✓
EOC testing (A-6)                 -       -        ✓
Coverage (A-7-5)                  -       ✓        ✓
```

A-6 (Testing of Outputs)은 *Test 전용*. 나머지는 *RAT 혼합*.

## Review — Subjective + Structured

Review는 *전문가의 주관적 판단*. 단 *체크리스트 기반*으로 *구조화*.

### Review 종류

```
1. Peer Review
   - 같은 팀원
   - 가장 빈번 (일상)
   - 비공식적

2. Formal Inspection (Fagan Inspection)
   - 공식 절차
   - 3-5 명 + Moderator
   - 사전 *individual 분석*
   - 미팅에서 *공동 토론*
   - 보고서 생성

3. Audit Review
   - SQA 또는 외부
   - 프로세스 준수 확인
   - 표본 추출

4. Independent Review
   - 다른 팀
   - DAL B+ 의무
   - DAL A는 다른 조직
```

### Fagan Inspection — 항공 표준

가장 형식적인 review. *1976년 Michael Fagan (IBM)*. 항공·우주·국방에서 표준.

```
Phase 1: Planning
  - Moderator 지명
  - 참가자 선정 (Author, Reader, Tester, SQA)
  - 자료 배포 (1주 전)

Phase 2: Overview (옵션)
  - Author가 핵심 개념 설명 (30분-1시간)
  - 신규 도메인이면 의무

Phase 3: Preparation
  - 각자 개별 검토 (1-3일)
  - 발견 사항 기록

Phase 4: Inspection Meeting
  - Moderator 진행
  - Reader가 자료 line-by-line 읽음
  - 참가자가 issue 제기
  - 미팅 시간: 2시간 미만 권장
  - 다루는 분량: 100-200 LoC 또는 5-10 페이지

Phase 5: Rework
  - Author가 모든 issue 해소
  - Major issue는 별도 PR

Phase 6: Follow-up
  - Moderator가 fix 확인
  - 미해결 issue 추적

Phase 7: Causal Analysis (옵션)
  - 발견된 buggy 패턴 분석
  - 절차 개선
```

### Review Records

각 review가 *기록*. *SQA audit trail*.

```
=== Review Record FRR-2024-127 ===

Date:              2024-06-12
Subject:           Pitch Controller Module (pitch_controller.c)
                   LLR-PFC-100 through LLR-PFC-115

Moderator:         Jane Doe (Quality)
Author:            John Smith (Engineering)
Reader:            Alex Park (Engineering, peer)
Tester:            Mike Lee (Test Engineering)
SQA Observer:      Sue Kim
Independent:       Tom Cho (separate team, DAL B Independence)

Preparation Time:  3 hours per participant
Meeting Duration:  1h 45min
Pages Reviewed:    pitch_controller.c (245 LoC) + LLR docs (8 pages)

Issues Found:
  Critical:  0
  Major:     3
  Minor:     7
  Question:  2

Major Issues:
  M1: pitch_pid_compute() lines 78-92, anti-windup logic has off-by-one
      → Fixed: changed clamp condition to ≥ instead of >
  M2: LLR-PFC-108 not implemented (missing function)
      → Fixed: Added missing function 'pitch_emergency_disengage()'
  M3: Stack usage estimate exceeds budget (4.5 KB > 4 KB allocated)
      → Fixed: Refactored local arrays to reduce stack use to 3.8 KB

Minor Issues:
  m1-m7: Code style, comment quality, log message format

All Issues Resolved by 2024-06-15 in commit abc1234.

Re-review: Not required (all fixes verified by individual reviewer).

Conclusion: Module approved for integration.
Signatures: [redacted]
```

이런 *공식 기록*이 *심사관 evidence*. 각 LLR-PFC 항목이 *어떤 review로 검증됐는지* 추적.

## Analysis — 형식적 검증

Static + Dynamic 분석. *수학적·논리적 도출*.

### Static Analysis 분류

```
Syntactic Analysis
  - Helix QAC, Polyspace Bug Finder, clang-tidy
  - MISRA, naming convention, complexity metric

Semantic Analysis (Abstract Interpretation)
  - Polyspace Code Prover, Astrée, Frama-C
  - Runtime error 검출 (overflow, divide-by-zero, null deref)
  - 모든 가능한 input의 *모든 가능한 동작* 추적

Formal Methods (DO-333)
  - SPARK Ada, Coq, Isabelle, Frama-C+ACSL
  - 수학적 proof
  - Specification에서 implementation 자동 검증
```

### Astrée — Abstract Interpretation 예

Airbus, Boeing, NASA 사용. *runtime error의 absence를 증명*.

```c
// 분석 대상 코드
int compute_index(int a, int b) {
    int x = a + b;          // 1
    int idx = x * 2;        // 2
    return arr[idx];        // 3 — overflow? OOB?
}
```

Astrée 출력:

```
Function: compute_index
Inputs:
  a ∈ [-100, +100]   (from caller annotation)
  b ∈ [-50, +50]

Line 1: x = a + b
  x ∈ [-150, +150]
  Overflow check: -150 < INT_MAX, +150 < INT_MAX → SAFE

Line 2: idx = x * 2
  idx ∈ [-300, +300]
  Overflow check: SAFE

Line 3: arr[idx]
  arr size = 100
  Index range: [-300, +300]
  Bounds check: -300 < 0 → UNSAFE (potential OOB read)
                +300 > 100 → UNSAFE (potential OOB read)

ALARM: Potential array out-of-bounds at line 3.
```

*모든 input*에 대해 *모든 가능한 동작*을 *symbolic*하게 추적. *Exhaustive*하지만 *false positive* 있을 수 있음.

Astrée가 *Airbus A380/A350 FBW 검증의 마지막 단계*. *수만 줄 코드*에서 *수일 분석*. *runtime error 0 입증*.

### Data Flow Analysis

각 변수가 *어디서 정의*되고 *어디서 사용*되는지 추적.

```
□ 모든 변수가 사용 전 초기화? (CERT EXP33)
□ 변수가 항상 사용? (dead variable 아님)
□ 변수가 적절한 lifetime?
□ Shared variable이 동기화?
```

### Control Flow Analysis

함수의 *모든 가능한 실행 경로* 분석.

```
□ 모든 경로가 *예상한 종료*에 도달?
□ Unreachable 경로 (dead code)?
□ 무한 루프 가능성?
□ 재귀 깊이 한계?
```

### A-7-9 — Data Coupling / Control Coupling Analysis

DAL A/B 의무.

```
Data Coupling: 한 모듈이 다른 모듈에 *데이터 전달*하는 패턴
  - Parameter (좋음)
  - Return value (좋음)
  - Global variable (회피)
  - File/database (회피)

Control Coupling: 한 모듈이 다른 모듈의 *흐름 영향*
  - Function call + return (좋음)
  - Function pointer (회피)
  - Goto (금지)
  - Exception (회피)
```

```python
# Data Coupling 측정 (단순화)
for each pair (A, B) of modules:
    couplings = count of:
        - parameters from A to B
        - return values from B to A
        - shared globals accessed by both
        - shared files accessed by both

    if couplings > threshold:
        flag as "tight coupling — refactor"
```

낮은 coupling이 *좋은 design*. 도구 측정 + review.

## Test — Execution 기반 검증

Test가 *most concrete evidence*. *수치로 측정 가능*.

### Test Level 구조

```
Level 1: Low-Level (Unit) Testing
  목적: 각 함수·모듈
  환경: Host 또는 target
  도구: Google Test, Cantata, VectorCAST
  Coverage: 100% statement + decision + MC/DC (DAL A)
  관련 LLR

Level 2: Software Integration Testing
  목적: 모듈 간 인터페이스
  환경: Host 또는 target
  도구: 위와 같음
  Coverage: integration paths

Level 3: System Test (Hardware/Software Integration)
  목적: 전체 SW가 target HW에서
  환경: Target board 또는 HIL
  도구: 자체 자동화
  Coverage: HLR 기반 (functional)

Level 4: HIL (Hardware-In-the-Loop)
  목적: SW + 실제 sensor/actuator 모사
  환경: HIL lab
  도구: ETAS LABCAR, dSPACE, NI VeriStand
  Coverage: 모든 HLR + robustness

Level 5: Flight Test
  목적: 실제 항공기에서 비행
  환경: 시제기
  도구: 비행 데이터 기록 + 분석
  Coverage: 최종 검증
```

각 level이 *별도 test cases + test results*. *모두 SVR (Software Verification Results)에 기록*.

### Test Case 작성

```
=== Test Case TC-PFC-103-001 ===

ID:             TC-PFC-103-001
Title:          Pitch PID Normal Step Response
Level:          Unit Test
Module:         pitch_controller.c
Function:       pitch_pid_compute()
LLR:            LLR-PFC-103
HLR:            HLR-PFC-014

Pre-conditions:
  - state = pitch_pid_init() called
  - state->i_term = 0
  - state->prev_error = 0

Test Procedure:
  Input:
    setpoint = 10.0 (target pitch +10 deg)
    measure  = 5.0  (current pitch +5 deg)
    Δt       = 20 ms

  Expected (theory):
    error    = 10 - 5 = 5
    p_term   = K_P * 5     = 2.5 * 5    = 12.5
    i_term  += K_I * 5 * 0.02 = 0.8 * 5 * 0.02 = 0.08
    d_term   = K_D * (5 - 0) / 0.02 = 0.15 * 5 / 0.02 = 37.5
    output  = 12.5 + 0.08 + 37.5 = 50.08
    saturated: min(50.08, 100) = 50.08

Expected Output:
  *output       = 50.08 ± 0.01 (floating point precision)
  state->i_term = 0.08
  state->prev_error = 5.0
  return value  = 0

Pass Criteria:
  - return == 0
  - *output ∈ [50.07, 50.09]
  - state->i_term ∈ [0.075, 0.085]
  - state->prev_error == 5.0

Tolerance:
  Floating point: ±0.01 (1 ULP at this magnitude)

Test Environment:
  Host:    GCC 12.2 native build
  Target:  arm-none-eabi-gcc 12.2, Cortex-A53, hard-float

Result:
  Host:    PASS (output = 50.0801)
  Target:  PASS (output = 50.0800)
  Time:    8.2 μs (within 25 μs budget)

Date:    2024-06-15
Tester:  Mike Lee
Witness: Sue Kim (SQA)
```

*수치 비교*가 *deterministic*. 부동소수점은 *tolerance 명시*.

### Test Categories

DO-178C §6.4.2.1이 *3 종류*의 test 요구.

```
1. Normal Range Tests
   - 정상 입력 범위
   - Expected behavior 검증

2. Robustness Tests
   - Out-of-range 입력
   - Boundary values
   - Invalid combinations
   - Error injection (HW failure)

3. Requirements-based Tests
   - 각 HLR/LLR을 직접 검증
   - Trace 가능
```

### Robustness Test 예

```
=== TC-PFC-103-009: Robustness — Out-of-Range Setpoint ===

Input:
  setpoint = 25.0 (above max ±20 deg)
  measure  = 0.0
  state    = initialized

Expected:
  return == -ERANGE (per pre-condition violation)
  *output unchanged
  state unchanged

Pass Criteria:
  - return == -ERANGE
  - System recovers gracefully (no crash, no hang)
  - Subsequent calls with valid input work normally

Result: PASS

=== TC-PFC-103-010: Robustness — NaN Input ===

Input:
  setpoint = NaN
  measure  = 5.0

Expected:
  return == -EINVAL (NaN detected)
  No infinite loop
  System stable

Result: PASS (NaN detected by ASSERT in pitch_pid_compute)

=== TC-PFC-103-011: Robustness — Memory Corruption ===

Setup: Corrupt state->prev_error to NaN before call
Input:
  setpoint = 10.0
  measure  = 5.0

Expected:
  Function detects invalid state OR
  Output bounded (no crash)
  Watchdog can recover

Result: PASS (ASSERT triggered, emergency_halt() called)
```

Robustness가 *DAL A의 핵심*. *모든 가능한 fault*에 *graceful response*.

## Test Environment — HIL Lab

### HIL의 역할

```
Software-In-the-Loop (SIL)
  - 컴파일된 SW가 host에서 실행
  - Simulink/Python 모델이 sensor/actuator 모사
  - Sensor → SW → Actuator 전 흐름 시뮬레이션
  - 빠르고 저렴

Processor-In-the-Loop (PIL)
  - 컴파일된 SW가 *evaluation board*에서 실행
  - Simulink가 nearby PC에서 모사
  - Target processor 실 동작

Hardware-In-the-Loop (HIL)
  - 실제 FCC(Flight Control Computer)
  - 실제 sensor/actuator의 *electronic signal* 모사
  - 비행 동역학 simulator가 실시간 계산
  - Closed-loop test

Iron Bird
  - 실제 항공기 부품 다 연결 (engine, hydraulics, actuators)
  - HIL의 확장형
  - Boeing 787, Airbus A350 가짐
```

### KAI HIL Lab — KF-21 예

KAI 사천에 *KF-21용 HIL Lab*. 수십억 원 시설.

```
=== KF-21 FCC HIL Configuration ===

Real Hardware:
  - FCC (Flight Control Computer) — 시제품
  - FLIR (Forward-Looking Infrared) interface card
  - AESA Radar interface card
  - Cockpit MFD displays

Simulated Hardware:
  - GPS receiver (NMEA 0183 over RS-422)
  - IRS (Inertial Reference System)
  - Air Data Computer
  - Engine (FADEC interface)
  - Hydraulic actuators (force feedback)

Real-time Simulator (dSPACE SCALEXIO):
  - 6-DOF aircraft dynamics
  - Aerodynamic database (wind tunnel data)
  - Engine model (Pratt & Whitney F100)
  - Sensor models (noise, latency, failure)
  - Environment (atmosphere, wind, turbulence)

Test Scenarios:
  - Normal flight (takeoff, cruise, landing)
  - Aerobatic maneuvers (G-load up to ±9G)
  - System failures (engine flame-out, sensor failure)
  - Combat maneuvers (BVR engagement)
  - Emergency landing
```

조종사가 *시뮬레이션 cockpit*에서 *실제 비행처럼* 조작. FCC SW가 *전 비행 envelope* 검증.

### HIL Test Procedure

```
=== HIL Test TC-HIL-FCC-014 ===

Title:        Stall Warning System Functional Test
HLR:          HLR-FCS-014 (Stall Warning)
DAL:          A

Setup:
  1. Load FCC SW version 2.0.0
  2. Initialize HIL with: A=0, altitude=10000ft, M=0.5
  3. Engage simulation

Scenario:
  - Pilot pulls back on stick gradually
  - AoA increases from 5° to 18° over 30 seconds
  - Air speed decreases from 250 KIAS to 110 KIAS
  - Eventually AoA exceeds stall threshold

Expected Results:
  - At AoA 14° (80% of 17.5° threshold):
    → Pre-stall warning AURAL "STALL" sound
    → Stick shaker activates
    → Display shows warning
  - At AoA 17.5° (actual stall):
    → Continuous AURAL
    → Auto-pitch-down command (if engaged)

Recording:
  - All sensor inputs (sample rate 1 kHz)
  - All FCC outputs (sample rate 1 kHz)
  - All display states
  - Audio output
  - Pilot input

Result:
  - Pre-stall at AoA 14.02° (within 0.1° of expected) → PASS
  - Audio activation latency: 38 ms (< 100ms budget) → PASS
  - Stick shaker activation latency: 42 ms → PASS
  - All systems behave per HLR → PASS

Witnesses: KAI Test Engineer, KAA (Korean Aviation Authority) DER, ROKAF representative
Date: 2024-08-15
Video Recording: HILR-2024-0815-014.mp4
```

HIL test 1개에 *수십 명 + 수 시간*. *항공의 큰 비용 요소*.

### HIL Lab 시설

```
세계 항공 HIL Lab 비용 (대략):
  Boeing 787 Iron Bird   : $500M+
  Airbus A350 Iron Bird  : $300M+
  Embraer E190 HIL       : $50M
  KAI KF-21 HIL          : ~$30M (추정)
  KARI 무인기 HIL         : ~$10M

Operational cost:
  HIL Test session       : ~$5000-50000/day
  (Engineers, facility, energy)
```

큰 비용이라 *작은 회사는 자체 보유 어려움*. *External HIL services* 사용 (Boeing 787, A380 일부 supplier가 사용).

## Robustness Testing — DAL A의 핵심

A-7-7: *Test cases include robustness testing*.

### Robustness Categories

```
1. Input Robustness
   - Out-of-range values
   - Boundary values (min/max ±1)
   - Invalid combinations
   - Malformed data (CRC error)

2. Hardware Failure Injection
   - Sensor stuck (constant value)
   - Sensor noisy (random spike)
   - Sensor latency (delayed input)
   - Sensor offset (calibration error)
   - Actuator stuck
   - Communication loss

3. Timing Robustness
   - Test at WCET boundary
   - Test under maximum load
   - Test with interrupt storm
   - Test with reduced CPU clock

4. Memory Robustness
   - Test with full RAM
   - Stack near limit
   - Memory corruption injection

5. State Robustness
   - Unexpected state transitions
   - Recovery from invalid state
   - Power-cycle during operation
```

### Fault Injection HIL

```
HIL이 *제어된 fault 주입* 가능:

  - GPS antenna 단절 시뮬레이션
  - IMU 1축 데이터 오염
  - CAN bus packet drop 10%
  - 전원 noise injection
  - 온도 환경 변화 (HIL chamber)
  - EMI/RFI 노출 (별도 chamber)
```

각 fault에 *SW가 detect + isolate + recover* 검증.

## Verification Tools

```
Unit/Integration Testing:
  Google Test (gtest)        : 오픈소스, host-side. 가벼움
  Cantata (QA Systems)       : 항공 산업 표준 (LDRA 회사 산하)
  VectorCAST (Vector)        : 항공·자동차 표준
  LDRA Testbed/TBrun         : 항공 광범위
  IBM Rational Test RT       : 일부 OEM
  Parasoft C/C++ Test        : 일부

HIL Systems:
  dSPACE SCALEXIO            : 자동차·항공 양쪽
  ETAS LABCAR                : 자동차 강함, 항공 일부
  NI VeriStand               : 다목적
  RT-Lab (Opal-RT)           : 전력·항공

Coverage Analysis:
  VectorCAST/Cover           : 자동 instrumentation
  LDRA Testbed               : MC/DC 강함
  Cantata                    : 항공 적합
  Bullseye Coverage          : 일반 commercial
  gcov + lcov                : 오픈소스, host-side만

Static Analysis:
  Helix QAC                  : 항공 표준
  Polyspace Bug Finder/Code Prover : Abstract interpretation
  LDRA Testbed               : 통합 (test + coverage + analysis)
  Astrée (AbsInt)            : Airbus/Boeing 표준 abstract interp
  Frama-C                    : 오픈소스, formal methods

WCET Analysis:
  aiT (AbsInt)               : 정적 WCET, 항공 표준
  RapiTime (Rapita)          : 통계적 WCET
  Bound-T                    : 상용
  SymTA/S (Symtavision)      : 자동차+항공
```

## Verification 결과 — SVR

모든 verification 결과가 *SVR (Software Verification Results)*에 기록.

```
=== SVR for Module pitch_controller.c ===

1. Review Records
   - FRR-2024-127 (LLR review): pitch_controller, all LLRs OK
   - FRR-2024-138 (code review): pitch_controller.c, 0 critical findings
   - FRR-2024-145 (test plan review): TC-PFC-103 series approved

2. Static Analysis Results
   - Helix QAC: 0 MISRA violations
   - Polyspace Code Prover: 0 runtime errors proven
   - Astrée: 0 alarms, exhaustive analysis complete
   - Cyclomatic complexity: max 8 (within ≤10 limit)
   - Stack depth: max 256 bytes (within 4KB budget)
   - Data Coupling: 4 (low — good)

3. Test Results
   Host Unit Tests (TC-PFC-103-001 ~ 010):
     - 10 tests, 10 PASS, 0 FAIL
     - Coverage: 100% statement, 100% decision, 100% MC/DC
   Target Unit Tests (same):
     - 10 tests, 10 PASS, 0 FAIL
     - Coverage: 100% statement, 100% decision, 100% MC/DC
     - WCET measured: 8.2 μs (< 25 μs budget)
   Integration Tests:
     - 5 integration scenarios, all PASS
   HIL Tests (related):
     - TC-HIL-FCC-014: Stall warning PASS
     - TC-HIL-FCC-022: Pitch loop stability PASS
     - TC-HIL-FCC-035: Robustness — fault injection PASS

4. Coverage Analysis
   Per LLR coverage:
     LLR-PFC-100 → 100% (TC-PFC-100-001 ~ 003)
     LLR-PFC-101 → 100% (TC-PFC-101-001 ~ 002)
     ...
     LLR-PFC-115 → 100% (TC-PFC-115-001 ~ 004)
   Per HLR coverage:
     HLR-PFC-014 → 100% (via LLR-PFC-100-115 + TC-HIL)

5. Anomalies
   - PR-2024-089: Minor — Comment in LLR-PFC-108 ambiguous
                  Resolution: LLR updated 2024-06-20

6. Conclusion
   Pitch Controller Module meets all DO-178C DAL B objectives
   for code verification and test coverage.

Approved:
   Verification Lead:  Sarah Kim     2024-08-30
   SQA:                Tom Park       2024-08-31
   FAA DER:            Jim Wilson     2024-09-05
```

이 *SVR가 SOI 3 review에 제출*. 심사관이 *line-by-line 검토*.

## SOI 3 Review

Planning(SOI 1), Development(SOI 2), 그리고 *Verification 종료 시 SOI 3*.

```
SOI 3 Agenda:
  Day 1: Test approach review
         - SVCP (Verification Cases & Procedures)
         - Test environment
  Day 2: Test execution review
         - Sample test execution (witness)
         - Test results
         - Anomalies
  Day 3: Coverage analysis review
         - Coverage reports
         - MC/DC results
         - Untestable code justifications
  Day 4: Review of reviews
         - Sampling of code/design reviews
         - SQA audit records
  Day 5: Findings + closeout
```

심사관이 *random test 직접 실행*. *재현 가능*해야 함.

## Test 통계 — DAL A 시스템

```
시스템 규모: 100 KLoC

LLR 개수:          ~2000
Unit Test Cases:   ~6000 (LLR당 평균 3)
Integration TCs:   ~500
System TCs:        ~200
HIL TCs:           ~100
Flight Tests:      ~30 (envelope)

Coverage Achieved:
  Statement:  100%
  Decision:   100%
  MC/DC:      99.8% (3 untestable, justified)

Anomalies (PR) Total: ~500
  Resolved:        490
  Open (deferred):  10 (all minor, scheduled for next release)

Total Verification Effort:
  Unit test creation:        10 person-years
  Integration test:           5 person-years
  HIL test:                   8 person-years
  Coverage analysis:          3 person-years
  Static analysis tuning:     2 person-years
  Review:                    15 person-years
  Total:                     43 person-years

Verification Cost: ~43 × $250k = $10.75M
```

DAL A *Verification만으로 ~$10M*. 전체 인증 비용의 *50%+*.

## 정리

- DO-178C는 *Review, Analysis, Test* 3 가지 verification.
- Review: peer + Fagan Inspection. *공식 기록 + checklist*.
- Analysis: static + abstract interpretation (Astrée) + formal methods.
- Test: Unit → Integration → System → HIL → Flight test.
- *Robustness test*가 DAL A의 핵심. Fault injection HIL이 표준.
- HIL Lab은 *수십~수백 M$* 시설. KAI/KARI는 자체 보유.
- Tool: VectorCAST/LDRA/Cantata (test), Polyspace/Astrée (static).
- SVR이 *모든 verification evidence* 통합. SOI 3 review에 제출.
- DAL A 전체 verification ~$10M, 인증 비용 50%+.

## 다음 장 예고

9장은 *Coverage Analysis* — Statement, Decision, MC/DC의 깊은 해부. truth table 작성.

## 관련 항목

- [Ch 7 — Integration·Build·EOC](/blog/embedded/aerospace-standards/do-178c/chapter07-integration-build)
- [Ch 9 — Coverage Analysis (MC/DC)](/blog/embedded/aerospace-standards/do-178c/chapter09-coverage-mcdc)
- [Ch 11 — Tool Qualification (DO-330)](/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330)
- [VectorCAST](https://www.vector.com/int/en/products/products-a-z/software/vectorcast/)
- [LDRA Testbed](https://ldra.com/)
- [AbsInt Astrée](https://www.absint.com/astree/)
- [dSPACE HIL](https://www.dspace.com/en/inc/home/products/systems/processorhardware/hilsystems.cfm)
