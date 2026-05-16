---
title: "Ch 5: Software Design — LLR + Architecture"
date: 2025-09-25T06:00:00
description: "HLR → LLR decomposition, Architecture 설계, SCADE/Simulink model-based, memory/timing budget, A-4 verification."
tags: [do-178c, design, llr, architecture, scade, simulink, do-331, model-based]
series: "DO-178C"
seriesOrder: 5
draft: false
---

HLR이 *"무엇을"* 정의했다면, LLR(Low-Level Requirements)은 *"어떻게"* 한다. *Software Design Process*는 *A-2-3 + A-2-4 + A-4의 14 obj* — 전체 71 obj의 약 20%. 이 장은 *LLR 작성, Architecture 설계, Model-Based Development (DO-331)*까지 본다.

## LLR의 정의 — DO-178C §11.10

> **Low-Level Requirements**: Software requirements developed from high-level requirements, derived requirements, and design constraints from which Source Code can be directly implemented without further information.

핵심: *"Source Code를 직접 구현할 수 있는 수준"*. LLR을 보고 *바로 코딩 가능*. 더 이상 디자인 결정 필요 없음.

## HLR vs LLR — 추상화 단계

```
SR (System):
   "Flight management system shall compute optimal trajectory for fuel economy."

HLR (Software):
   "FMS Trajectory Optimizer shall compute waypoint sequence minimizing fuel
    burn subject to wind, altitude, and ATC constraints."

LLR (Design):
   "trajectory_optimizer.c:: optimize_waypoints() shall:
    1. Accept input: current_position, destination, ATC_constraints
    2. Call get_wind_at_altitudes(altitude_range) → wind_array[100]
    3. Iterate altitudes from FL280 to FL420 in 1000ft steps
    4. For each altitude, compute fuel_burn using Equation 5.3.2
       (BADA aircraft performance model, ICAO Doc 9587)
    5. Select altitude with minimum fuel_burn satisfying ATC
    6. Return waypoint sequence in optimized_route_t struct
    7. Maximum execution time: 500ms"

Code (Implementation):
   int optimize_waypoints(const position_t *current,
                          const position_t *dest,
                          const atc_constraints_t *atc,
                          optimized_route_t *route) {
       /* 정확히 LLR 그대로 */
   }
```

LLR → Code = *기계적 translation*. LLR을 *재해석*하지 않는다.

## LLR의 9 Attributes

DO-178C는 LLR이 가질 *attributes*를 정의 (§11.10):

```
1. 알고리즘 명세
2. 데이터 흐름·제어 흐름
3. 모듈 인터페이스
4. 메모리 매핑
5. 시간 budget (WCET)
6. 통신 protocol
7. 에러 처리
8. 부분 partitioning
9. HW/SW 인터페이스 세부
```

각 LLR에 적용 가능한 attributes를 *모두 명시*.

## LLR 작성 예 — 항공 ECU

```
=== LLR-PFC-103 ===

ID:                  LLR-PFC-103
Title:               Pitch Control PID Calculation
Parent HLR:          HLR-PFC-014 (Pitch Control Loop)
Description:         The pitch_pid_compute() function shall implement
                     PID control with anti-windup as follows:

                     setpoint  = pitch_command (from autopilot, ±20°)
                     measure   = current_pitch (from IRS, ±90°)
                     error     = setpoint - measure
                     i_term   += K_I × error × Δt  (Δt = 20ms)
                     i_term    = clamp(i_term, -10.0, 10.0)  /* anti-windup */
                     d_term    = (error - prev_error) / Δt
                     output    = K_P × error + i_term + K_D × d_term
                     output    = clamp(output, -100%, +100%)

Constants:
   K_P = 2.5
   K_I = 0.8
   K_D = 0.15
   Δt  = 20 ms

Algorithm Source:    Pitch Control Design Doc PCD-2024-007, §3.2.1

Function Interface:
   void pitch_pid_compute(
       float setpoint,        /* IN:  desired pitch (deg) */
       float measure,         /* IN:  measured pitch (deg) */
       float *output,         /* OUT: elevator command (%) */
       float *internal_state  /* IN/OUT: i_term, prev_error */
   );

Pre-conditions:
   - |setpoint| ≤ 20.0
   - |measure| ≤ 90.0
   - internal_state != NULL, output != NULL
   - internal_state initialized via pitch_pid_init()

Post-conditions:
   - |*output| ≤ 100.0
   - internal_state.i_term ∈ [-10.0, +10.0]
   - internal_state.prev_error = (setpoint - measure)

WCET:                ≤ 25 μs (measured on Cortex-A53 @ 1GHz)
Memory:              Stack: 32 bytes, no heap
Module:              pitch_controller.c
Call frequency:      50 Hz (20ms period)

Verification:        Unit test TC-PFC-103-001 ~ 010
                     - Normal step response
                     - Saturated input
                     - Anti-windup activation
                     - Noisy measurement
```

이 *수준의 세부*가 LLR. *Pseudocode와 의사 코드 사이*. 코더가 *해석 여지 없이* 구현 가능.

## Architecture 설계

LLR과 *동시에* SW Architecture 작성. *모듈 구조, 데이터 흐름, 제어 흐름*.

### Architecture 구성 요소

```
1. Module Decomposition
   - 모듈 목록
   - 모듈 간 dependency (acyclic)
   - 각 모듈의 책임 정의

2. Data Flow
   - 모듈 간 데이터 이동
   - Shared data 식별
   - Data ownership

3. Control Flow
   - Task/Thread 구조
   - Scheduler
   - Inter-task communication

4. Memory Architecture
   - Code segment (text)
   - Data segment (RAM)
   - Stack per task
   - Heap (보통 면제)
   - Memory protection

5. Timing Architecture
   - Periodic tasks + frequency
   - Aperiodic tasks (interrupt-driven)
   - Critical sections
   - WCET budget per module

6. Partitioning (IMA의 경우)
   - ARINC 653 partition 정의
   - Time slot 할당
   - Memory region 할당
```

### Architecture Notation — SysML

![FMS SysML Block Diagram](/images/blog/do-178c/diagrams/ch05-fms-architecture.svg)

각 *block*이 모듈. *line*이 data/control flow. *port*가 interface.

### Architecture Notation — UML

OO 시스템(JSF C++, AUTOSAR)은 *UML Class Diagram*:

![UML Class Diagram — ISensor + concrete implementations](/images/blog/do-178c/diagrams/ch05-uml-class.svg)

C 시스템도 *적절히 UML 차용* 가능 — 모듈을 class 비유.

## Architecture 문서 — 실제 예

```
=== Software Architecture Document (SAD) ===

Project: Engine FADEC v3.0
DAL: A

1. Overview
   - System: Full Authority Digital Engine Control
   - Engine: PW1100G turbofan
   - 책임: 연료 분사, 펌프 제어, monitoring, fault detection

2. Module Decomposition
   The FADEC SW is decomposed into the following modules:

   M1: I/O Manager        — Hardware I/O abstraction
   M2: Sensor Processing  — Filter, validate, calibrate
   M3: Engine State       — Engine state machine
   M4: Control Law        — Fuel/air ratio computation
   M5: Fault Detector     — FDIR (Fault Detection, Isolation, Recovery)
   M6: Communications     — ARINC 429 + CAN buses
   M7: Built-in Test (BIT)— self-diagnostic
   M8: Logger             — non-volatile event log

3. Dependency Graph

   M1 (I/O Manager)        ← 최하위 (HW와 직접)
       ↑
   M2 (Sensor Processing)
       ↑
   M3 (Engine State) ←─── M5 (Fault Detector)
       ↑                       ↑
   M4 (Control Law) ──────────┘
       ↑
   M6 (Comms)  M7 (BIT)  M8 (Logger)    ← cross-cutting

   No circular dependencies. M1 has no upstream.

4. Data Flow
   Sensors → M1 → M2 → M3 → M4 → M1 (actuators)
                  ↓    ↓
                 M5 (analysis)
                  ↓
                 M3 (state transitions)

5. Control Flow (Task Architecture)

   T1: Main Control Loop        (50 Hz, 20ms)
       M1.input → M2 → M3 → M4 → M1.output

   T2: Fault Monitor             (10 Hz, 100ms)
       M5 (cross-check + watchdog reset)

   T3: BIT Background            (1 Hz, 1s)
       M7 (memory check, ROM CRC)

   T4: Communications            (event-driven)
       M6 (ARINC 429 RX/TX, CAN RX/TX)

   T5: Logger                    (low priority, opportunistic)
       M8 (write to NVM when CPU idle)

6. Memory Architecture
   ROM:     384 KB
   RAM:      96 KB
   NVM:     128 KB (event log)
   Stack per task:
     T1: 4 KB
     T2: 2 KB
     T3: 2 KB
     T4: 2 KB
     T5: 1 KB
   Heap: 0 (no dynamic allocation post-init)

   Memory Protection:
   - Code segment: read-only
   - Data segment: read-write per task (MPU)
   - Stack overflow: MPU guard pages

7. Timing Architecture
   Worst-Case Execution Time per task:
     T1: 15 ms (75% of 20ms budget)
     T2: 30 ms (within 100ms budget)
     T3: 50 ms (within 1s budget)
     T4: 1 ms per message (event-driven)
     T5: ~ (background)

   CPU utilization (worst-case): 78%
   Schedulability proven via Rate Monotonic Analysis (RMA).
   See Timing Analysis Report TAR-FADEC-2024-003.

8. Partitioning
   No partitioning (single criticality at DAL A).
   For multi-DAL systems, ARINC 653 IMA would be used.

9. HW/SW Interface
   See ICD-FADEC-HW-2024-001 for hardware interface details.
```

이런 *3~10 페이지 SAD*가 *시스템 디자인의 모든 결정*을 *한 곳*에. 후속 코드는 *SAD 안에서만 동작*.

## Memory & Timing Budget Allocation

### Memory Budget

```
Total RAM: 96 KB
─────────────────
  M1 (I/O Manager):           4 KB
  M2 (Sensor Processing):     8 KB
  M3 (Engine State):          2 KB
  M4 (Control Law):          12 KB
  M5 (Fault Detector):        6 KB
  M6 (Comms):                 8 KB (TX/RX buffers)
  M7 (BIT):                   2 KB
  M8 (Logger):                4 KB
  Stack (all tasks):         11 KB
  RTOS overhead:              4 KB
  Margin:                    35 KB (37%)
─────────────────
  Total used:                61 KB (63%)
```

각 모듈에 *RAM budget 명시*. 모듈 개발 중 *초과 시 경고*. 후속 *re-balance*.

### Timing Budget — Rate Monotonic Analysis

```
Tasks (sorted by frequency, highest first):
  T4 (Comms ISR):  event,     1 ms each, ~50 events/s = 50 ms/s
  T1 (Main):       50 Hz,    15 ms, total 750 ms/s
  T2 (Fault):      10 Hz,    30 ms, total 300 ms/s (50 of 100ms slot)

Schedulability check (RMA, single CPU):
  U = sum of (WCET / Period)
  U = 0.05 + 15/20 + 30/100 = 0.05 + 0.75 + 0.30 = 1.10

  Liu & Layland bound for 3 tasks: n(2^(1/n) - 1) ≈ 0.78
  U = 1.10 > 0.78  ← OVERLOADED

  Fix: 다음 중 하나
  - T1 WCET 줄이기 (목표 12ms, 25% 감소)
  - T2 period 늘리기 (200ms로)
  - CPU 빠른 것 사용
  - Multi-core 분산
```

이 *분석을 LLR/Architecture에 포함*. *과부하 발견 시 디자인 재검토*.

## A-2-3 — SW Architecture Development

> "Software architecture is developed."

**Required outputs**:
- SAD (Software Architecture Document)
- Dependency graph
- Task table
- Memory map
- Timing budget

**Tool**:
- Drawing: PowerPoint, Visio, draw.io (대부분의 OEM)
- Formal: SysML (Enterprise Architect, MagicDraw)
- Generated: SCADE Suite, MATLAB/Simulink (model-based)

## A-2-4 — LLR Development

> "Low-level requirements are developed."

**Required outputs**:
- SDD (Software Design Description) — LLR 모음
- DOORS에 LLR 항목

각 LLR이 *HLR 또는 derived* 명시. *HLR-LLR traceability* 100%.

## A-4 — Verification of Software Design Outputs (14 obj)

A-4 그룹이 LLR + Architecture 검증.

```
A-4-1  LLR ↔ HLR consistency               ✓+I (DAL A/B)
A-4-2  LLR accuracy + consistency          ✓+I (DAL A/B)
A-4-3  LLR ↔ target compatibility          ✓ (DAL A/B/C)
A-4-4  LLR verifiable                      ✓+I (DAL A/B)
A-4-5  LLR ↔ standards                     ✓ (DAL A/B/C)
A-4-6  LLR traceable to HLR                ✓+I (DAL A/B)
A-4-7  LLR algorithms accurate             ✓+I (DAL A/B)
A-4-8  Architecture ↔ HLR consistency      ✓+I (DAL A/B)
A-4-9  Architecture consistency            ✓ (DAL A/B/C)
A-4-10 Architecture ↔ target compatibility ✓ (DAL A/B/C)
A-4-11 Architecture verifiable             ✓ (DAL A/B)
A-4-12 Architecture ↔ standards            ✓ (DAL A/B)
A-4-13 SW partitioning integrity           ✓ (DAL A/B/C)
A-4-14 (추가)                              ✓
```

LLR 검증은 HLR 검증과 *같은 패턴*. 다만 *traceability가 LLR ↔ HLR*.

### A-4-13 — Partitioning Integrity

> "Software partitioning integrity is confirmed."

ARINC 653 IMA 시스템에서 *partition 격리* 검증.

```
=== Partitioning Integrity Verification ===

Test: P-INTEGRITY-001
Setup: Partition A (DAL A FBW) + Partition B (DAL D IFE)

Scenario 1: Memory protection
   Partition B attempts to write to Partition A memory region.
   Expected: MPU exception, Partition B fault confined.
   Result: PASS — Partition A unaffected.

Scenario 2: Time protection
   Partition B has infinite loop bug, exceeds time slot.
   Expected: Time slot exhaustion, Partition B preempted.
   Result: PASS — Partition A timing unaffected.

Scenario 3: I/O protection
   Partition B attempts to write to Partition A's I/O port.
   Expected: Bus access denied, fault confined.
   Result: PASS — I/O integrity preserved.
```

ARINC 653 시스템은 *partition 사이에 완전 격리* — 한 partition의 *crash가 다른 partition에 영향 없음*.

## Model-Based Development — DO-331

C++/C 코드 대신 *모델*을 *디자인의 1차 산출물*로. DO-178C의 *Supplement DO-331*이 정의.

### 주요 도구

```
Simulink + Stateflow (MathWorks)
  - 항공·자동차 동시 큰 시장
  - 자동 코드 생성 (Embedded Coder)
  - DO-178B/C 인증 toolset 별도

SCADE Suite (Ansys)
  - 항공 특화
  - Formal semantics (Lustre)
  - DO-178C TQL-1 qualified code generator
  - Airbus, Boeing 표준

Stateflow ↔ Simulink ↔ C/C++ 변환
ASCET (ETAS)
  - 자동차 특화 (Bosch 표준)
```

### Model-Based Design 흐름

```
HLR    : SCADE/Simulink 모델 (Block + State machine)
   ↓ (Automatic code generation)
Source : C 코드 (자동 생성)
   ↓ (Compilation)
EOC    : Executable Object Code

검증:
  - 모델 simulation (HLR 검증)
  - 모델 ↔ 코드 일관성 (자동 생성이므로 항상 일치, 단 *generator qualification*)
  - 코드 실행 vs 모델 simulation (back-to-back)
```

### DO-331의 추가 obj

DO-331은 *기본 DO-178C 위에 추가 의무*:

```
MB-1: Model accurately represents intended function
MB-2: Model is verifiable
MB-3: Model coverage analysis
MB-4: Tool (code generator) qualification
MB-5: Model standards conformance
```

장점:
- *디자인 결정이 시각적*
- *Simulation으로 조기 검증*
- *코드 생성 자동화* (수동 코딩 오류 차단)

단점:
- *Tool qualification 비용* ($수십만)
- *모델 자체 검증 추가*
- *생성된 코드 디버깅 어려움*

### Model-Based 적용 — 일반 관찰

항공·우주 산업에서 *Simulink, SCADE 같은 model-based 도구*의 적용은 일반적. *제어 algorithm, 항법, 안전 critical 모듈*에 광범위. 각 한국 회사의 *내부 적용 범위*는 *공식 발표 한정*.

## LLR Common Findings

```
가장 흔한 finding (Major):

1. "LLR-XXX는 HLR-YYY 구현 부족 — 일부 case 누락"
   → A-4-1 위반 (HLR-LLR consistency)

2. "LLR-XXX의 알고리즘 정확성 검증 없음"
   → A-4-7 위반

3. "Architecture에 task T2 WCET 정의 없음"
   → A-4-11 위반 (verifiable)

4. "Module M5의 dependency가 circular (M5 → M3 → M5)"
   → A-4-9 위반 (consistency)

5. "Partition A 메모리 protection 입증 부족"
   → A-4-13 위반

6. "LLR-XXX는 'reasonable' 표현 — 측정 불가"
   → A-4-4 위반
```

## SCADE 적용 예 — Pitch Control

![SCADE PID Block Diagram — error → P/I/D → output](/images/blog/do-178c/diagrams/ch05-scade-pid.svg)

SCADE가 *이 diagram을 직접 C로 변환*. K_P/K_I/K_D 같은 *상수도 모델 안에서 변경*.

```c
// SCADE 생성 코드 (단순화)
void pitch_pid_compute(
    /* inputs */
    const float pitch_command,
    const float pitch_measure,
    /* outputs */
    float *elevator_command,
    /* state */
    pitch_pid_state_t *state)
{
    float error = pitch_command - pitch_measure;
    float p_term = K_P * error;

    state->i_term += K_I * error * DT;
    if (state->i_term > 10.0f) state->i_term = 10.0f;
    if (state->i_term < -10.0f) state->i_term = -10.0f;

    float d_term = K_D * (error - state->prev_error) / DT;
    state->prev_error = error;

    float output = p_term + state->i_term + d_term;
    if (output > 100.0f) output = 100.0f;
    if (output < -100.0f) output = -100.0f;

    *elevator_command = output;
}
```

수작업 C와 *기능적으로 동일*. *자동 생성*이라 *코딩 오류 차단*.

## Design Review

LLR + Architecture가 작성되면 *Design Review*:

```
참석자:
  - Author (LLR/Architecture)
  - Systems Engineer (HLR 일관성 확인)
  - Integration Engineer (다른 모듈과의 인터페이스 확인)
  - Test Engineer (verifiability 확인)
  - Independent Reviewer (DAL A는 의무)
  - SQA Observer

Agenda:
  - Architecture overview (1 hour)
  - Module-by-module LLR walkthrough (2-4 hours)
  - Cross-module interaction (1 hour)
  - Memory/timing analysis (1 hour)
  - Findings discussion (1 hour)

Output:
  - Review record
  - Action items
  - PR list (open issues)
```

큰 시스템은 *수일~수주의 review*. Boeing 787 FBW design review는 *수개월에 걸친 weekly meeting*.

## SW Architecture 검증 — Verification of Architecture

A-4-8 ~ A-4-12.

```
Architecture verification 방법:
1. Manual review (전 architecture 문서)
2. Tool analysis:
   - Static analysis: dependency cycle, fan-out
   - Memory analysis: stack usage (StackAnalyzer)
   - Timing analysis: WCET (aiT, Bound-T)
3. Simulation:
   - Architecture-level simulation (SystemC)
   - Schedulability simulation (TimeWiz)
```

### WCET Tool

```
aiT (AbsInt):       정적 WCET 분석. 항공 산업 표준.
Bound-T:            상용 도구.
RapiTime (Rapita):  통계적 WCET. 항공 인기.
SymTA/S (Symtavision): 자동차 + 항공.
```

각 함수의 *worst-case 실행 시간* 계산. *모든 경로*에서 최악. Cache, pipeline 효과 모델.

## 정리

- LLR은 *"Source Code 직접 구현 가능 수준"*의 design.
- HLR → LLR이 *추상화 단계의 핵심 분기*.
- LLR의 9 attributes — 알고리즘, 데이터/제어 흐름, 인터페이스, 메모리, 타이밍, 통신, 에러 처리, partitioning, HW/SW.
- Architecture: 모듈 분해, 의존성, task 구조, 메모리/타이밍 budget.
- A-4 그룹 *14 obj*가 LLR + Architecture 검증.
- Model-Based Development (DO-331)는 Simulink/SCADE로 *모델 → 자동 코드 생성*.
- Model-based (Simulink, SCADE 등) 적용이 industry 일반.
- Partitioning integrity (A-4-13)는 ARINC 653 IMA에서 핵심.
- WCET 도구(aiT, RapiTime)로 *실시간 보장 입증*.

## 다음 장 예고

6장은 *Source Code Standards* — SCS 작성, MISRA C 적용, 코딩 규칙 + 코드 review.

## 관련 항목

- [Ch 4 — Software Requirements (HLR)](/blog/embedded/aerospace-standards/do-178c/chapter04-software-requirements)
- [Ch 6 — Source Code Standards](/blog/embedded/aerospace-standards/do-178c/chapter06-source-code-standards)
- [Ch 9 — Coverage Analysis (MC/DC)](/blog/embedded/aerospace-standards/do-178c/chapter09-coverage-mcdc)
- [MISRA C Ch 1](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [Ansys SCADE](https://www.ansys.com/products/embedded-software/ansys-scade-suite)
- [MathWorks Simulink](https://www.mathworks.com/products/simulink.html)
- [AbsInt aiT — WCET Analyzer](https://www.absint.com/ait/)
