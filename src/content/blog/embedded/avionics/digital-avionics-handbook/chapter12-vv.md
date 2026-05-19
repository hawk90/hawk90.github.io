---
title: "Ch 12: Verification & Validation"
date: 2026-05-18T12:00:00
description: "HIL·SIL·MIL·certification — avionics V&V의 전체 그림."
series: "Digital Avionics Handbook"
seriesOrder: 12
tags: [avionics, verification, validation, hil, sil]
draft: true
---

## 한 줄 요약

> **"V&V = Verification + Validation"** — *requirement → flight*까지의 단계적 검증.

## V Model

```text
V Model — Avionics 전형:

Requirements ───┐         ┌─── Acceptance Test
                │         │
   Design ─────┐│         ││─── System Test
              ││         ││
       Code ──┐│└─── Unit Test
              │└─── Integration Test
              └─── Module Test
              
좌측 — Development
우측 — Verification
각 level — 좌우 대응

각 stage:
  Requirement engineering
  Design (architecture·detailed)
  Implementation (code·model)
  Unit test
  Integration test
  System test
  Acceptance test
  Flight test
```

V model — *각 level 검증*. Forward + backward trace.

## Verification vs Validation

```text
Verification:
  "Did we build the system right?"
  Process compliance
  Specification 일치 확인
  Inspector·tester 검증
  
  Methods:
    Review
    Analysis (static·dynamic)
    Test
  
Validation:
  "Did we build the right system?"
  Operational suitability
  Customer·mission 요구 충족
  
  Methods:
    Stakeholder review
    Flight test
    Mission rehearsal
    Operational evaluation
    
Avionics — 둘 다 필요
DO-178C — 주로 *verification* (process·SW)
ARP-4754A·4761 — *validation* (system·requirements)
```

V&V — *complementary*. 둘 다 인증 필수.

## SIL — Software-in-the-Loop

```text
SIL (Software-in-the-Loop):
  Production SW
  Host computer
  Simulated environment
  
구조:
  ┌────────────────┐    ┌────────────────┐
  │ Production SW  │←──→│ Plant Simulator│
  │ (C code)       │    │ (Simulink·자체)│
  └────────────────┘    └────────────────┘
  
사용:
  Control law verification
  Algorithm tuning
  Regression test
  
Tool:
  Simulink + Embedded Coder PIL
  Vector CAST + simulator
  자체 framework

장점:
  - Fast iteration
  - Cheap (no HW)
  - Repeatable

단점:
  - No real timing
  - No HW fault
  - No I/O latency
```

SIL — *early algorithm verify*. Production timing 부족.

## MIL — Model-in-the-Loop

```text
MIL (Model-in-the-Loop):
  Algorithm in *model* (Simulink·SCADE)
  Plant in *model*
  Closed-loop simulation
  
구조:
  ┌────────────────┐    ┌────────────────┐
  │ Algorithm Model│←──→│ Plant Model    │
  │ (Simulink)     │    │ (Simulink)     │
  └────────────────┘    └────────────────┘

사용:
  Initial design
  Algorithm exploration
  Pre-implementation verify
  
Tool:
  Simulink + Stateflow
  SCADE Suite
  
장점:
  - Earliest verify stage
  - Model coverage
  - Simulation only

단점:
  - Real code 차이
  - Integer overflow·precision
```

MIL → SIL → PIL → HIL 진행.

## PIL — Processor-in-the-Loop

```text
PIL (Processor-in-the-Loop):
  Target processor 위 production code
  Plant simulator (host)
  
구조:
  ┌────────────────┐    ┌────────────────┐
  │ Target board   │←──→│ Plant Simulator│
  │ (PowerPC·ARM)  │    │ (host computer)│
  │ Production SW  │    │                │
  └────────────────┘    └────────────────┘
  
사용:
  Code optimization verify
  Timing on target
  Integer·precision verify
  
Tool:
  Simulink + Embedded Coder PIL
  Vector CAST + ICE
  자체 + JTAG
  
장점:
  - Real processor timing
  - Real compile result
  
단점:
  - I/O simulated
  - Real sensor·actuator absent
```

PIL — *target-specific verify*. WCET·precision.

## HIL — Hardware-in-the-Loop

```text
HIL (Hardware-in-the-Loop):
  Real flight computer
  Real I/O
  Plant simulator (real-time)
  
구조:
  ┌────────────────┐    ┌────────────────┐
  │ Flight Computer│←──→│ Real-time plant│
  │ (real FCC)     │    │ simulator      │
  │ Real I/O bus   │    │ (dSPACE·       │
  │ (1553·AFDX)    │    │  speedgoat·    │
  │                │    │  NI VeriStand) │
  └────────────────┘    └────────────────┘

사용:
  Integrated test
  Fault injection
  Mission rehearsal
  Schedule verify

장점:
  - Real HW·SW behavior
  - Real timing
  - Real I/O
  - Fault inject

단점:
  - Expensive setup
  - Real sensor·actuator simulated
  - Plant simulation accuracy
```

HIL — *integration verify의 표준*. 거의 모든 avionics 사용.

## HIL Setup 사례

```text
Aircraft HIL bench (typical):

Flight Computer (real):
  Quad PFC
  Mission Computer
  FMS
  
Bus interface:
  1553·AFDX·ARINC-429·CAN
  Switch·tap·monitor
  
I/O cards:
  Analog·digital
  Discrete (switch·LED)
  
Real-time simulator:
  dSPACE Scalexio
  NI VeriStand·PXI
  RTI Concurrent
  Speedgoat
  
Simulated:
  Aerodynamics·gravity·atmosphere
  Engine·fuel
  Sensor (IMU·GPS·radio)
  
Test scenarios:
  Normal flight
  Abnormal (engine out·sensor fail)
  Boundary (max speed·Min altitude)
  
Duration:
  Each test — minutes
  Total campaign — weeks
```

HIL — *수십 박스 + 수백 ms 응답 검증*.

## Iron Bird — Mechanical Mockup

```text
Iron Bird (Aircraft):
  Full-scale mechanical mockup
  Real hydraulic·electric·actuator
  Sensor·actuator real
  Control surface mounted
  
사용:
  Hydraulic system test
  Actuator integration
  Wiring verify
  Pilot interaction
  
사례:
  Boeing 787 iron bird — 2007
  Airbus A380 iron bird
  KAI KF-21 iron bird
  
장점:
  Real physical interaction
  Full system test
  
단점:
  Cost ↑
  Fixed location
  Limited reconfiguration
```

Iron bird — *완성 직전 검증*. 수십~수백 million dollar.

## Flight Test

```text
Flight test phases:

Ground test:
  Power-on·BIT
  Engine start·idle
  Taxi
  
First flight:
  Conservative envelope
  Performance·handling baseline
  
Envelope expansion:
  Speed·altitude·g-load 점진 확대
  Stall test
  Emergency procedure
  
Certification test:
  FAA·EASA inspector 참여
  Required scenarios
  Compliance demonstration
  
Service trial:
  Pre-delivery
  Final acceptance
  
Aircraft —  certification flight ~수백 hours
F-35 — 30,000+ flight hours pre-IOC
B787 — ~4,800 flight hours certification
KF-21 — ~수백 hours during program
```

Flight test — *진짜 검증*. Iron bird·HIL 보완.

## LV V&V

```text
LV-specific V&V:

Cold flow:
  Tank·valve·plumbing — fluid simulated
  
Hot fire test:
  Real engine on test stand
  Multi-second burn
  Performance measurement
  
Engine integration test:
  Stage with real engine
  Static fire (vertical test stand)
  
Stage qual test:
  Full stage·environmental
  Vibration·acoustic·thermal
  
Wet dress rehearsal:
  Full propellant load·countdown
  No ignition
  
Static fire (full):
  All engines·full duration
  Ground hold-down
  
Launch:
  Real flight (no rehearsal)
  
KSLV-II:
  Ground test → static fire → launch
  TLI test → flight
```

LV — *flight test = real launch*. No rehearsal.

## V&V Tool

```text
Test management:
  IBM Rational Quality Manager
  Polarion
  Jama
  
Unit test:
  Vector CAST
  LDRA TBrun
  Cantata++
  Google Test
  
Coverage:
  Vector CAST
  LDRA Testbed
  Cantata
  RapiCover
  GCOV
  
Static analysis:
  Polyspace
  Coverity
  CodeSonar
  LDRA Testbed
  
HIL:
  dSPACE SCALEXIO
  NI VeriStand
  Speedgoat
  RTI Concurrent
  
Flight test:
  Wireshark + custom 1553·AFDX dissector
  자체 telemetry decoder
  
Tool qualification — DO-330 (Ch 9 Rierson series).
```

V&V tool — *큰 비용 + license + qualification*.

## Traceability Matrix

```text
DO-178C 핵심:

System Req ←→ HLR ←→ LLR ←→ SC ←→ TC ←→ TR

Forward trace:
  Each requirement → test case (s) 존재
  Coverage — *모든 req tested*
  
Backward trace:
  Each test case → requirement 존재
  No "orphan" test
  Each line of code — req-justified
  
Bidirectional:
  Forward + Backward
  
Tool:
  IBM DOORS
  Polarion
  Jama
  자체 + Excel

Trace 평가:
  Each link — manual review·analysis
  Tool 보조 가능
```

Trace — *DO-178C 필수*. Audit primary evidence.

## Test Pyramid in Avionics

```text
일반 SW pyramid:
            /\
           /  \  System (적음·느림·비싼)
          /────\
         / Int  \
        /────────\
       /  Unit    \ Unit (많음·빠름·싼)
      /────────────\

Avionics V&V:
                  /\
                 / Flight\  (수십·매우 비쌈)
                /─────────\
               / HIL Test  \
              /─────────────\
             /  SIL Test    \
            /─────────────────\
           /   Unit Test       \

각 layer:
  Unit test — most volume
  SIL — algorithm·integration
  HIL — system-level
  Flight test — final acceptance

Flight test minimization:
  HIL·SIL이 catch 많이
  Flight = 최종 확인
```

Lower-level test — *cost-effective*. Flight = expensive.

## Coverage Targets

```text
DO-178C coverage (Ch 8 Rierson):

Level A:
  Statement
  + Decision
  + MC/DC (Modified Condition·Decision)
  + Object code
  
Level B:
  Statement + Decision
  
Level C:
  Statement
  
Level D·E:
  None (req-based only)

Coverage 측정:
  Vector CAST·LDRA·Cantata
  HW probe (RapiCover)
  GCOV (self-cert)
```

Coverage = *test 충분성 metric*. Requirement-based test 보조.

## LV V&V — KSLV-II 사례

```text
KSLV-II 누리:

Engine:
  KRE-075 engine 자체 개발
  Test stand — Nara test site
  수십 회 hot fire test
  단일 engine·cluster (4 engine)
  
Stage:
  1단 (4 engine)·2단 (1 engine)·3단 (1 engine 변형)
  각 stage hot fire test
  
Avionics:
  HIL test — KARI 시설
  Telemetry encoder test
  GNC closed-loop SIL
  
1차 발사 (2021-10):
  부분 실패 — 3단 LOX 탱크 압력 상실
  → 조사·수정·재실험
  
2차 발사 (2022-06):
  성공 — 위성 perfomance demonstrator
  
3차 발사 (2023-05):
  성공 — 차세대 위성 8기 궤도 진입

Lesson:
  V&V는 *모든 결함 catch 보장 못 함*
  실제 비행 = ultimate test
  사고 분석·후속 조치 중요
```

KSLV-II — *iterative V&V improvement*. 한국 우주 V&V history.

## Korean V&V Industry

```text
KARI V&V:
  자체 HIL·SIL 시설
  Mission control 통합
  
KAI V&V:
  KF-21·FA-50·KUH iron bird
  Flight test (사천 공항·다양 군 비행장)
  
한화·LIG V&V:
  Missile·LV ground test
  Test ranges (마라도·서산·태안)
  
국방기술품질원 (DTAQ):
  방산 V&V 검증
  IV&V
  
민간 LV (인노스페이스·페리지):
  Brazil 발사장 (Alcantara)
  자체 ground test·flight test
```

한국 — *V&V infrastructure 강화*. KARI·KAI·한화 핵심.

## 자주 하는 실수

> ⚠️ HIL skip → Flight first

```text
"HIL 부족 → 곧장 flight test"
→ Bug catch flight 단계
→ Schedule slip·cost ↑
```

→ HIL bench 충분 활용.

> ⚠️ Validation vs Verification 혼동

```text
"V&V — same"
→ Verification 만 강조 (process)
→ Validation 부족 (operational)
```

→ Both required.

> ⚠️ Flight test count 부족

```text
Cert 최소 hours 만족
→ Edge case 미검증
→ In-service issue
```

→ Adequate envelope expansion.

> ⚠️ Trace 부분만

```text
"중요 req만 trace"
→ Audit fail
```

→ Complete bidirectional.

## 정리

- **V model** — requirement → flight 단계 검증.
- **MIL → SIL → PIL → HIL → Flight test** 진행.
- HIL — *integration verify의 표준*.
- Iron bird — *aircraft mechanical mockup*.
- LV — *flight = real launch*, ground·hot fire·static fire.
- Coverage — DAL별 (statement·decision·MC/DC·object).
- Trace — *bidirectional*, DOORS·Polarion·Jama.
- 한국 — *V&V infrastructure 강화*, KSLV-II *iterative*.

다음 편은 **Environmental Qualification (DO-160 개관)**.

## 관련 항목

- [Ch 11: RTOS](/blog/embedded/avionics/digital-avionics-handbook/chapter11-rtos)
- [Ch 13: DO-160](/blog/embedded/avionics/digital-avionics-handbook/chapter13-do-160)
- [Developing Safety-Critical SW Ch 7: Verification](/blog/embedded/avionics/developing-safety-critical/chapter07-verification)
- [Developing Safety-Critical SW Ch 8: Coverage](/blog/embedded/avionics/developing-safety-critical/chapter08-coverage)
