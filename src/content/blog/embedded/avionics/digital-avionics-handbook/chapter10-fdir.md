---
title: "Ch 10: FDIR — Fault Detection·Isolation·Recovery"
date: 2026-05-18T10:00:00
description: "시스템 차원의 fault handling — 감지·격리·복구의 3 단계 패턴."
series: "Digital Avionics Handbook"
seriesOrder: 10
tags: [avionics, fdir, fault-management]
draft: true
---

## 한 줄 요약

> **"FDIR = Detect → Isolate → Recover"** — fault handling의 *system-wide* 표준.

## FDIR 개요

FDIR = Fault Detection, Isolation, Recovery.

**각 단계:**

1. **Detection:** Fault 발생 *감지*. Sensor·logic·timing.
2. **Isolation:** *어느 component*가 fault인지 식별. Root cause analysis.
3. **Recovery:** Fault 영향 *완화·복구*. Switchover·reset·degrade.

**Level:**
- Component-level FDIR
- Subsystem-level FDIR
- System-level FDIR
- Mission-level FDIR

**Trigger:**
- Autonomous (SW·HW 자체)
- Ground-commanded
- Crew-commanded

FDIR — *avionics fault management* 표준 framework.

## Detection — 기법

**BIT (Built-In Test):**
- Power-on BIT (PBIT) — 시작 시
- Continuous BIT (CBIT) — 운용 중
- Initiated BIT (IBIT) — 명령 시 (maintenance)

**Watchdog Timer:**
- Periodic kick required
- Timeout → reset
- HW·SW level

**CRC·Checksum:**
- Data·firmware integrity
- Memory scrubbing

**Voter Mismatch:** Redundant channel 비교.

**Reasonableness Check:**
- Sensor reading out-of-range
- Physical limits
- Cross-correlation

**Heartbeat:**
- Periodic message
- Loss → fault

**Self-test:**
- Stimulus·expected response
- Round-trip verify

각 기법 — *coverage·response time trade-off*.

## BIT 예시 — Power-On

**PBIT (Power-On BIT):** Boot sequence.

**Steps:**
1. CPU self-test (ALU·registers·cache)
2. Memory test (RAM read·write pattern, ROM CRC)
3. Bus test (1553·SpaceWire·AFDX loopback)
4. Sensor sanity check (IMU·GPS available)
5. Actuator self-test (small movement·current)
6. Communication link test
7. Software integrity (CRC·signature)
8. Configuration data verify

**Result:**
- PASS → operational
- FAIL → maintenance message + degrade

**Time:**
- Aircraft — 1~5 minutes
- LV — second·subsecond (mission time critical)
- Spacecraft — minutes

PBIT — *시작 전 sanity*. 결함 사전 catch.

## Isolation — Root Cause

**Cross-comparison:**
- Redundant channel 결과 비교
- 3-of-3 fail → some common cause
- 2-of-3 fail → channel 식별

**Symptom analysis:**
- Error code 분석
- Failure mode catalog

**Time correlation:**
- Fault 발생 시각·순서
- Cascade fault 추적

**Voting algorithm:**
- Outlier detection (continuous value)
- Median filter

**LRU identification:**
- Line Replaceable Unit 단위 식별
- Maintenance crew가 swap 가능

**Isolation accuracy:**
- False isolation — good unit 교체
- Missed isolation — bad unit 운영
- 둘 다 mission impact

Isolation = *correct LRU 식별*. Maintenance 핵심.

## Recovery — 전략

**Recovery 전략 (severity 순):**

1. **Ignore:** Transient·low-severity. Continue.
2. **Retry:** Same operation 재시도. Transient fault — bus·comm timeout.
3. **Reset:** Component·partition reset. State preserved 또는 lost.
4. **Switchover:** Redundant channel 활성화. Primary → backup.
5. **Reconfigure:** Operational mode change. Degraded operation.
6. **Safe Mode:** Minimum function. Sun-pointing·Earth-pointing (위성). Hold attitude (LV). Manual control (aircraft).
7. **Mission Abort:** Worst case. Engine cutoff, range safety.

Recovery — *escalation*. Lowest impact 우선.

## Hierarchical FDIR

| Level | 영역 | 예 | Action | 응답 시간 |
|-------|------|-----|--------|-----------|
| 1 — Component | Per-component | Sensor self-test, actuator current limit | Local recovery | ms~s |
| 2 — Subsystem | Multiple components 통합 | GNC subsystem·power subsystem | Switchover·degrade | s~10s |
| 3 — System | Mission-wide | Multiple subsystems | Safe mode·abort | 10s~min |
| 4 — Mission | Mission planner·ground | Abort·alternate trajectory | Crew·ground decision | min~hr |

각 level — *appropriate response*. Lower level 신속, upper level deliberate.

## Watchdog Timer 패턴

**HW Watchdog:**
- Independent timer (TI·Microchip 등 chip)
- CPU bus와 무관
- Periodic refresh required (kick)
- Timeout → reset signal

Coverage:
- CPU hang
- Infinite loop
- Stack overflow corruption

Implementation:

```c
while (1) {
    watchdog_kick();
    /* critical work */
}
```

**SW Watchdog (task-level):**
- Each task — periodic check-in
- Master watchdog — task check-in 검증

Coverage: Single task hang (다른 task는 healthy).

**Window Watchdog:**
- Refresh window (too early·too late = fault)
- 더 tight timing

**Multistage Watchdog:**
- 1st timeout → soft reset
- 2nd timeout → hard reset

Watchdog — *대표 SW fault catch*. 모든 RTOS 표준.

## FMEA·FTA — Pre-design Analysis

**FMEA (Failure Mode and Effects Analysis):** Bottom-up. 각 component → failure mode → effect → severity.

Example:
- Component: Gyro X-axis
- Failure mode: Stuck output
- Effect: Wrong attitude → wrong control
- Severity: Catastrophic
- Mitigation: Triple redundant + voter

Output: FMEA table — 수백~수천 row.

**FTA (Fault Tree Analysis):** Top-down. Catastrophic event → contributing cause. Boolean logic (AND·OR gate).

Example:

```text
"Loss of altitude control"
  OR
  ├ "FCC fail" AND "backup FCC fail"
  ├ "Sensor fail" AND "redundancy fail"
  └ "Actuator fail"
```

Calculate probability — $10^{-9}$ per flight hour.

Both — ARP-4761 표준.

FMEA·FTA — *전체 fault scenario catalog*. Pre-design.

## Autonomous vs Ground-commanded

**Autonomous FDIR:** SW가 자체 결정·recover.

장점:
- Fast response (ms~s)
- Crew·ground workload ↓
- Remote mission 적합

단점:
- Complex SW
- Wrong recovery 위험
- Cert 부담

사용:
- Modern aircraft (FBW)
- LV ascent (no time for ground)
- Mars rovers (long round-trip delay)

**Ground-commanded:** Telemetry + ground analysis + uplink.

장점:
- Expert judgment
- Complex situation
- Conservative

단점:
- Latency (LEO ~10 min, Mars ~20 min)
- Crew workload
- Comm dependency

사용:
- 위성 routine (LEO)
- Crewed spacecraft (decision)
- Aircraft (some cases)

**Hybrid (대부분):**
- Autonomous immediate response (safe state)
- Ground-commanded full recovery

선택 — *latency·complexity·trust*.

## Mars Rover FDIR — 사례

**Mars rover 환경:**
- Round-trip delay 8~40 min
- Autonomous 필수

**Mars Curiosity FDIR:**
- Computer fault → switch to backup (RAD750)
- Safe mode — Earth-pointing antenna
- Ground review·command full recovery

**Mars Perseverance:**
- 유사한 FDIR
- Multi-level (component·subsystem·system)
- Ingenuity helicopter — 별도 FDIR (Linux)

**Anomaly 사례:**
- Curiosity (2013) — memory glitch → safe mode
- Perseverance (2021) — small anomalies → autonomous recovery

**Lesson:**
- Conservative autonomous behavior
- Frequent telemetry
- Recovery template ground-rehearsed

Mars rover — *FDIR proven*. 다년 운용.

## Aircraft Fault Reporting — CMC

**Centralized Maintenance Computer (CMC):** Aircraft 모든 system의 fault 집계.

**Function:**
- Fault collection from all LRU
- Correlation
- Maintenance message display
- Logbook entry
- ACARS uplink to maintenance center

**Categories:**
- Fault — system fail
- Warning — degraded
- Caution — anomaly
- Advisory — info

**Standard:**
- ATA Spec 100·Spec 2200
- ATA Spec 100 — chapter codes per system

Boeing — CMC. Airbus — CFDS·CFDIU·CMC.

CMC — *fleet maintenance*. SW 의존.

## LV FDIR — 시간 압박

**LV 환경:**
- Mission time 수 분~시간
- Comm delay 무시 가능 (수 ms)

**LV-specific FDIR:**
- Engine anomaly → autonomous response (throttle down 또는 cutoff)
- Stage separation fail → abort modes
- GNC fail → backup channel

**Range safety:**
- Ground-commanded (flight termination)
- Autonomous (modern LV)
- Range Safety Officer (RSO)

**Falcon 9 사례 (CRS-7, 2015):**
- Strut failure → tank rupture → LOX leak
- GNC detected anomaly
- Autonomous flight termination

**SpaceX learnings:**
- AFTS (Autonomous Flight Termination System)
- Onboard GPS + safety logic
- Ground RSO → autonomous transition

LV — *autonomous + range safety* 필수.

## Korean FDIR

**KARI KSLV-II:**
- Autonomous engine monitoring
- Stage separation fault detection
- Telemetry — KSC ground monitoring

1차 발사 (2021):
- 3단 LOX 탱크 압력 손실 → 부분 실패
- FDIR 미흡, 후속 modification

2·3차 발사 (2022·2023): 성공.

**KAI KF-21:**
- Quad FCC + FDIR
- Self-monitoring

**한화·LIG 미사일:**
- Autonomous FDIR
- Mission-specific

**KARI KOMPSAT·KPLO:**
- Multi-level FDIR
- Ground command + autonomous

한국 — *FDIR 도입 + 학습*. 실패 sample 분석으로 개선.

## FDIR Implementation 패턴

```c
// FDIR State Machine — simplified

typedef enum {
    OPERATIONAL,
    DEGRADED,
    SAFE_MODE,
    EMERGENCY
} mission_mode_t;

typedef struct {
    bool primary_gnc_ok;
    bool backup_gnc_ok;
    bool comm_ok;
    bool power_ok;
    mission_mode_t mode;
} system_state_t;

mission_mode_t fdir_evaluate(system_state_t *s) {
    if (!s->power_ok)
        return EMERGENCY;
    
    if (!s->primary_gnc_ok && !s->backup_gnc_ok)
        return SAFE_MODE;
    
    if (!s->primary_gnc_ok || !s->comm_ok)
        return DEGRADED;
    
    return OPERATIONAL;
}

void fdir_action(mission_mode_t mode) {
    switch (mode) {
        case EMERGENCY:
            shutdown_non_essential();
            emergency_safe();
            break;
        case SAFE_MODE:
            point_to_sun();
            broadcast_distress();
            break;
        case DEGRADED:
            limit_maneuvers();
            request_ground_assistance();
            break;
        case OPERATIONAL:
            normal_operation();
            break;
    }
}
```

각 *mode → 명확 action*. State machine pattern.

## 자주 하는 실수

> ⚠️ Detection만, isolation·recovery 부재

"Fault detect → halt"은 mission abort로 직결되어 recovery 기회를 잃는다.

→ DIR 완전 사이클.

> ⚠️ Watchdog refresh in critical loop only

Loop 자체 hang은 watchdog refresh도 멈춰서 catch한다. 하지만 *task 별 hang*에서는 다른 task가 계속 refresh를 해 watchdog을 miss한다.

→ Multi-task watchdog 또는 staggered.

> ⚠️ Common-cause 부분 무시

"Triple redundant"라도 같은 power를 쓰면 power fail 시 3 channel이 모두 down된다.

→ Independent power·cooling·clock.

> ⚠️ Safe mode entry recovery 없음

Safe mode 진입 후 recovery 절차가 부재하면 mission이 permanent loss된다.

→ Safe mode → ground review → recovery sequence.

## 정리

- **FDIR = Detect → Isolate → Recover**.
- **Hierarchical** — component·subsystem·system·mission.
- **BIT·watchdog·voter·CRC** — detection 기법.
- **FMEA·FTA** — pre-design analysis (ARP-4761).
- **Autonomous vs Ground-commanded** — *latency·complexity* trade-off.
- Mars rover — *autonomous FDIR proven*.
- LV — *AFTS + autonomous engine FDIR*.
- 한국 — *FDIR 도입 + 학습*, KSLV-II 사례.

다음 편은 **Avionics Software — RTOS 선택과 통합**.

## 관련 항목

- [Ch 9: Fault Tolerance](/blog/embedded/avionics/digital-avionics-handbook/chapter09-fault-tolerance)
- [Ch 11: RTOS](/blog/embedded/avionics/digital-avionics-handbook/chapter11-rtos)
- [Developing Safety-Critical SW Ch 5: Design](/blog/embedded/avionics/developing-safety-critical/chapter05-design)
