---
title: "Ch 8: Flight Management Systems"
date: 2026-05-18T08:00:00
description: "FMS — mission mode·navigation·trajectory management의 통합."
series: "Digital Avionics Handbook"
seriesOrder: 8
tags: [avionics, fms, mission, navigation]
draft: true
---

## 한 줄 요약

> **"FMS = flight plan + nav DB + perf DB + guidance + autothrottle"** — mission 자동화 hub.

## FMS 정의·역할

```text
FMS (Flight Management System):
  Flight plan 관리 + 항법 + 성능 최적화
  Pilot의 *route planning + execution* 보조
  
주요 기능:
  1. Flight plan management (input·display·edit)
  2. Navigation (position·track·time)
  3. Performance (fuel·speed·altitude)
  4. Guidance (autopilot·autothrottle command)
  5. Communication interface (uplink·downlink)
  6. Crew interface (CDU·MCDU)

Hosted in:
  Federated — 자체 FMC (Flight Management Computer)
  IMA — partition으로 호스팅
```

FMS — *현대 민항기 표준*. 군용·UAV에도 변형.

## FMS Building Blocks

```text
Components:

NAV Database:
  Airport (ICAO code, position, runway)
  Waypoint (intersection, VOR, NDB)
  Airway·SID·STAR·approach procedure
  Update — every 28-day cycle (AIRAC)
  Provided by Jeppesen·Lido·NavBlue

Performance Database:
  Aircraft model (B737-800·A320·...)
  Engine specifics
  Weight·CG envelope
  Fuel flow tables
  Climb·cruise·descent profiles

Flight Plan:
  Origin·destination
  Waypoints sequence
  Altitudes·speeds
  ETA per waypoint
  Fuel calculation

Position Estimator:
  IRU (Inertial Reference Unit)
  GPS·DME·VOR
  Multi-sensor blend
  
Guidance:
  LNAV (lateral navigation)
  VNAV (vertical navigation)
  Autopilot mode coupling
  Autothrottle coupling
```

각 component — *전체 mission cycle 협력*.

## Mission Modes — Aircraft

```text
Flight phases:

Pre-flight:
  Flight plan input (origin·destination·route)
  Weight & balance
  Performance calc
  Fuel calc·flight time estimate
  
Taxi·Takeoff:
  Pre-departure checklist
  V-speeds (V1·VR·V2) calc
  N1·thrust setting
  
Climb:
  Cruise altitude target
  Climb speed schedule
  Flight level achievement
  
Cruise:
  LNAV·VNAV active
  Lateral path tracking
  Top-of-Descent (TOD) calc
  Step climb 권장
  
Descent:
  Descent path optimization
  Speed reduction
  
Approach:
  Approach procedure selection
  ILS·RNAV·VNAV approach
  Missed approach procedure
  
Landing:
  Landing performance verify
  Autoland (capable aircraft)
```

각 phase별 — *autopilot mode + FMS guidance*.

## CDU·MCDU — Pilot Interface

```text
CDU (Control Display Unit):
  Boeing
  
MCDU (Multipurpose Control Display Unit):
  Airbus
  
일반 구조:
  CRT 또는 LCD 화면
  Alphanumeric keyboard
  Function key (DIR·F-PLN·PROG·INIT 등)
  
Common pages:
  INIT — 초기화·flight plan
  PROG — progress·time·fuel
  F-PLN — flight plan edit
  PERF — performance
  RAD NAV — radio nav tuning
  NAV DATA — airport·waypoint info
  
Input workflow:
  1. INIT — origin·destination·fuel·weight
  2. F-PLN — waypoints
  3. PERF — cost index·target speed
  4. EXECUTE → flight plan active
```

CDU = *pilot ↔ FMS*. Modern aircraft에서 *touch screen* 변형.

## VNAV·LNAV

```text
LNAV (Lateral Navigation):
  Flight plan을 따라 *수평면 path tracking*
  Cross-track error → autopilot turn command
  
  Inputs:
    Current position (FMS estimate)
    Flight plan path
  
  Output:
    Heading 또는 roll command
  
VNAV (Vertical Navigation):
  Flight plan의 *고도·속도 schedule* track
  Climb·cruise·descent profile
  
  Inputs:
    Current altitude·speed
    Target profile
    Engine performance·fuel
  
  Output:
    Pitch·throttle command
  
Modes:
  LNAV + VNAV — fully managed
  LNAV only — heading manual
  Heading + altitude — basic autopilot
  Approach mode — ILS·RNAV-LPV
```

LNAV·VNAV — *flight envelope 자동화*. Crew workload ↓.

## 발사체 FMS — Mission Mode

```text
LV mission phases:

Pre-launch:
  Countdown
  Stage·engine config
  GNC initialization
  Tank pressurization
  Ignition sequence

Lift-off:
  Engine ignition
  Hold-down release
  Lift-off detect (acceleration sensor)
  
Initial ascent:
  Pitch program (open-loop trajectory)
  Pitchover maneuver
  Max-Q (maximum aerodynamic pressure)
  
Booster phase:
  Roll·pitch·yaw control
  Throttle control (some engines)
  Heat·structural margin
  
Stage separation:
  Engine cutoff
  Pyro firing
  Stage jettison
  Next-stage ignition
  
Coast:
  Inertial coast
  Attitude maintenance (RCS)
  
Orbit insertion:
  Engine restart (some)
  Velocity adjustment
  Payload deploy
  
Each phase — autonomous timing 또는 ground command
```

LV FMS — *autonomous mission sequencer*. 짧고 정밀.

## LV Guidance — 예

```text
Open-loop pitch program:
  Pre-computed trajectory
  Time-based schedule
  Used in initial ascent (aerodynamic phase)
  
  Example:
    T+0 : 90° pitch
    T+10s: 90° (vertical)
    T+15s: pitch-over begin
    T+60s: 70° (after Max-Q)
    T+120s: 50°
    T+200s: 30° (near horizontal)

Closed-loop guidance:
  GPS·IMU 기반 *targeted trajectory*
  Used in mid·late ascent (above atmosphere)
  
  Example — explicit guidance (Saturn V·Falcon):
    Calculate target velocity vector
    Steer engine to minimize deviation
  
  Example — PEG (Powered Explicit Guidance):
    Apollo, Space Shuttle
    Iterative target velocity·position calc

Falcon 9·KSLV-II — combination
```

LV — *open-loop ascent + closed-loop orbit*.

## Position Estimator — FMS

```text
Aircraft FMS position:
  IRU (Inertial Reference Unit) — high rate
  GPS — accurate
  DME·VOR·NDB — ground-aided
  Air data (altitude·speed)
  
Multi-sensor blend:
  Kalman filter
  Fault detection·exclusion (FDE)
  
Accuracy:
  GPS — 5~10 m horizontal
  IRU alone — 1~2 NM/hr drift
  RNAV approach — 0.3 NM accuracy req
  RNP approach — 0.1·0.3 NM containment

LV position:
  IMU (high rate)
  GPS (가능 구간)
  Star tracker (orbital)
  
Velocity·attitude in body frame
+ Earth-fixed conversion
```

Position — *redundant·blended*. FDE 핵심.

## RNAV·RNP — Required Navigation Performance

```text
RNAV (Area Navigation):
  Direct-to-waypoint
  Not constrained to ground beacon

RNP (Required Navigation Performance):
  Containment requirement
  RNP 1.0 — within 1 NM 95% of time
  RNP 0.3 — within 0.3 NM
  
Approach types:
  RNP APCH (LNAV) — 0.3 NM
  RNP APCH (LNAV/VNAV) — vertical
  RNP AR (Authorization Required) — 0.1 NM
  
Equipment requirement:
  Dual FMS
  Dual GPS
  Dual IRU
  
사용:
  Modern transport (B777·B787·A320·A350)
  Helicopter (RNP for narrow valley)
  Military
```

RNP — *현대 항법 표준*. Equipment + crew certified.

## Cost Index — VNAV Optimization

```text
Cost Index:
  Time cost / fuel cost ratio
  
  CI = (time cost per minute) / (fuel cost per kg)
  
  Lower CI — fuel-saving speed (slower)
  Higher CI — time-saving speed (faster)
  
Range:
  0 — minimum fuel (max range)
  9999 — maximum speed
  
Typical:
  B737 — 20~80 (depending on operator·route)
  A320 — 0~99
  
효과:
  CI = 50 → 2% fuel save vs CI = 100
  CI = 0 → 10% fuel save (서비스 시간 길어짐)
```

Cost Index — *FMS 핵심 변수*. Airline operation cost.

## FMS Architecture — Modern

```text
Honeywell Pegasus FMS:
  B747-400·B757·B767
  
Honeywell NG FMS:
  B737NG·B777·B787

Thales Topflight FMS:
  A320·A330·A340·A380·A350
  
Garmin G1000 NXi·G3000·G5000:
  Cessna·Cirrus·biz jet
  Integrated cockpit

CMC Electronics:
  Bombardier·smaller fleet
  
Universal Avionics:
  Retrofit market

Korea:
  KF-21 — mission system (자체 + Lockheed)
  FA-50 — KASS (Korean Avionics)
  KAI·LIG — 일부 자체

LV FMS:
  Autonomous mission sequencer
  Vendor-internal (SpaceX·Rocket Lab·KARI)
```

FMS — *수십 년 lifecycle*. 한정 vendor.

## FMS SW Architecture

```text
Typical structure:

Application Layer:
  Flight plan manager
  Navigation manager
  Performance calculator
  Guidance generator
  Display manager
  CDU interface

Middleware:
  Database access
  Inter-process comm
  Logging·BIT

Real-time OS:
  VxWorks 653·INTEGRITY-178·PikeOS
  ARINC-653 partitioned
  
I/O Drivers:
  ARINC-429·1553·AFDX
  Discrete I/O
  
NAV Database:
  Encrypted Jeppesen·NavBlue
  AIRAC 28-day update
```

FMS = *real-time + data-driven*. DB·algorithms.

## FMS Cert·SW

```text
FMS DAL:
  Typically Level B
  일부 critical (autoland) — Level A
  
SW evidence:
  DO-178C (typical B)
  DOORS requirements
  Modeling — partial Simulink·SCADE
  Manual C·C++ heavy
  
NAV Database:
  Separate cert process
  ARP 5757 — NAV DB design
  RTCA DO-200B — data processing
  Each 28-day cycle — separate cert
  
Pilot training:
  Type rating (each aircraft·FMS)
  CDU input procedure
  Mode awareness training
```

FMS — *복합 인증*. SW + DB + training.

## Korean FMS

```text
KF-21 보라매:
  Mission system (FMS + tactical computer)
  KAI·LIG·삼성탈레스 협력
  국산 + 일부 외산
  
FA-50:
  KASS (Korean Avionics Subsystem)
  KAI·LIG
  자체 + 외산 modules
  
KUH 수리온:
  Mission computer 자체
  CSD (Cockpit Systems Display)
  
민간 항공:
  국산 항공기 (KC-X 등) — FMS commercial integration
  
KARI LV (KSLV-II):
  자체 mission sequencer
  Autonomous ascent·orbit insertion
  지상 monitoring + ground command
```

한국 — *FMS 자체화 진행*. Mission computer 국산.

## 자주 하는 실수

> ⚠️ NAV DB 28-day update 미실시

```text
AIRAC update 미반영 → outdated waypoint
→ Wrong navigation
```

→ Operator의 *update obligation*.

> ⚠️ Mode awareness 부족

```text
"Autopilot active" → 모드 혼란
→ Mode confusion 사고 (AF447·Asiana 214 등)
```

→ Crew training + clear mode display.

> ⚠️ LV mission sequence 단일

```text
Open-loop 만 → contingency 부재
→ Engine anomaly 대응 불가
```

→ Closed-loop guidance + abort modes.

> ⚠️ FMS-FCC 통신 latency

```text
"FMS command → FCC instant"
→ Bus latency 무시
→ Mode transition lag
```

→ Latency budget design.

## 정리

- FMS = *flight plan + nav DB + perf DB + guidance*.
- LNAV·VNAV — *flight envelope 자동화*.
- CDU·MCDU — pilot interface.
- LV FMS — *autonomous mission sequencer*.
- RNP — *현대 navigation 표준*, 0.3·0.1 NM containment.
- Cost Index — VNAV optimization.
- DO-178C Level B (typical) — autoland Level A.
- 한국 — *FMS·mission system 자체화* 진행.

다음 편은 **Fault Tolerance — TMR·이중화**.

## 관련 항목

- [Ch 7: Actuators](/blog/embedded/avionics/digital-avionics-handbook/chapter07-actuators)
- [Ch 9: Fault Tolerance](/blog/embedded/avionics/digital-avionics-handbook/chapter09-fault-tolerance)
- [Launch Vehicle Flight SW Ch 2: FCC Architecture](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter02-fcc-architecture)
