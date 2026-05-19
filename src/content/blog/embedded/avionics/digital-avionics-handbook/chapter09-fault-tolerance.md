---
title: "Ch 9: Fault Tolerance — TMR·이중화"
date: 2026-05-18T09:00:00
description: "Triple Modular Redundancy·dual·hot/cold spare — avionics 이중화 패턴."
series: "Digital Avionics Handbook"
seriesOrder: 9
tags: [avionics, fault-tolerance, tmr, redundancy]
draft: true
---

## 한 줄 요약

> **"Fault tolerance = redundancy + voting + diversity"** — single fail tolerant.

## Fault Tolerance — Why

**Avionics 환경:**
- 방사선 (SEU·SEFI)
- 진동·열·전자기
- 부품 결함 (manufacturing·aging)
- Software bug
- Human error

**영향:**
- Aircraft — catastrophic fail = 인명 손실
- LV — mission failure
- Spacecraft — multi-million dollar asset

**요구:**
- Fail-operational — fault 후 *full function 유지*
- Fail-passive — fault 후 *safe state*
- Fail-safe — fault 후 *no harm*

DAL A — fail-operational typical. DAL B — fail-passive 또는 dual fault-tolerant.

Fault tolerance = *redundancy + 관리 정책*.

## Redundancy 종류

**1. Hardware Redundancy:**
- 동일 또는 diverse HW 복제
- TMR·DMR·hot/cold spare

**2. Software Redundancy:**
- N-version programming
- Diverse 알고리즘
- Self-check 코드

**3. Time Redundancy:**
- 같은 계산 반복 + compare
- Transient fault detect

**4. Information Redundancy:**
- ECC (Error Correcting Code)
- CRC
- Parity

**5. Functional Redundancy:**
- Alternative method
- Backup mode

각 layer — *조합 사용*.

## DMR — Dual Modular Redundancy

**DMR (Dual):** 2 identical channel + comparator.

Topology:

![DMR — Dual channel + comparator](/images/blog/avionics/diagrams/ch09-dmr.svg)

**장점:**
- Simple
- Fault detect 가능

**단점:**
- Fault detect만, *fault recover* 불가
- 어느 channel이 잘못인지 모름
- Both halt (fail-safe)

**사용:**
- 안전 critical 비-mission-essential
- Industrial safety (ISO 13849·61508)
- 자동차 ASIL-D 일부
- Avionics — actuator monitor

DMR = *detect, no auto-recover*. Voted 필요 시 third 추가.

## TMR — Triple Modular Redundancy

**TMR (Triple):** 3 identical channel + majority voter.

Topology:

![TMR — Three channels + majority voter](/images/blog/avionics/diagrams/ch09-tmr.svg)

**장점:**
- Single fault tolerant
- Mask fault (continue 가능)
- Identify faulty channel

**단점:**
- 3x hardware
- 3x power
- Voter도 fail 가능 (single point)

**대안:**
- Triplex with separate voter
- Quadruplex (4-channel) — fail-op-fail-safe

TMR — *space·aviation 표준*. Apollo·Shuttle·B747·F-22.

## Voter — Critical Component

**Voter 종류:**

**Hardware voter:**
- FPGA·ASIC
- Bit-level 비교
- Very fast

**Software voter:**
- Same CPU 위에서 비교
- Consistency check

**Hybrid:**
- HW voter for critical signals
- SW voter for data

**Voter design 자체:**
- Self-checking voter (no single point)
- Triplex voter (3 voters)
- Different voter algorithm

**Algorithm:**
- Bit majority (binary)
- Median (continuous value)
- Average (within tolerance)
- Best-2-of-3

**Voter failure mode:**
- Stuck output
- Incorrect comparison
- Latency

Voter = *TMR 핵심 + 약점*. Self-check 필요.

## Hot Spare vs Cold Spare

**Hot Spare (Active):**
- Spare channel — 실행 중
- Synchronized state
- Primary fail → instant takeover
- Latency — zero/minimal
- Cost — 2x power·resource
- 사용 — flight-critical (FCC)

**Cold Spare (Standby):**
- Spare channel — powered off 또는 idle
- Primary fail → power up·boot
- Latency — seconds·minutes
- Cost — low power, takeover risk
- 사용 — mission-essential, deep space
- Mars Curiosity — cold spare RAD750

**Warm Spare (Intermediate):**
- Spare — partial state synchronized
- Faster than cold, less than hot

선택 — *takeover time + cost*.

## Synchronization — Lock-step vs Loose

**Lock-step (Cycle-accurate):**
- Same instruction same cycle
- Output bit-level identical
- Mismatch detect = fault

Implementation:
- Hardware (Cortex-R5·R52 DCLS)
- Voter at every cycle·instruction

장점 — strong fault detect.
단점 — clock·power coupling. Random transient — both same → undetected.

**Loose-synchronization:**
- Multiple channels — independent clock
- Periodic state compare (예: 10 ms)
- Compare key state·output only

Implementation:
- Software-level
- Bus message compare

장점 — independent fault, diverse possible.
단점 — slower fault detection.

Voter design dependent on sync model.

Lock-step — *random fault catch*. Loose — *diverse design 가능*.

## N-Version Programming

**N-version programming:** *Diverse 구현*의 N개 독립 channel.

**Hardware diverse:**
- Different chip vendor
- Different architecture

**Software diverse:**
- Different language (Ada·C++·Java)
- Different algorithm
- Different team

Channel 예:
- A — Ada on PowerPC
- B — C on ARM
- C — Java on x86

효과:
- Common-mode fault 회피
- 하나 channel bug → 다른 channel 영향 없음

**사례:**
- **Boeing 777 PFC (Primary Flight Computer):** 3 lanes, different vendor·language.
- **Airbus A380 FCS:** Diverse FCC, hardware·software 분리.

**한계:**
- Cost 매우 큼
- Specification은 공유 → common-mode 가능성

N-version = *common-mode 회피*. 매우 비싸.

## Software Redundancy 패턴

**Time redundancy:**
- Same code 2번 실행
- 결과 compare
- Transient SEU 감지

**Cyclic checks:** Periodic data integrity (CRC·checksum).

**Self-test (BIT):** Built-In Test
- Power-on BIT (PBIT)
- Continuous BIT (CBIT)
- Initiated BIT (IBIT)

**Watchdog:**
- Periodic kick required
- Timeout → reset

**Recovery block:**
- Primary algorithm + alternative
- Primary fail → alternative

**Acceptance test:**
- Output sanity check
- Out-of-range → fault declared

SW redundancy — *cheap·effective*. HW redundancy 보완.

## Apollo LVDC (Launch Vehicle Digital Computer)

**Saturn V LVDC:** IBM 1968.

**Architecture:**
- TMR (Triple Modular Redundancy)
- 3 identical computers
- Bit-level voting at each instruction

**Specs:**
- Memory — 32K words (28 bit)
- Clock — 2 MHz
- Adder triple voted

**사용:**
- Apollo Saturn V launch
- Skylab launches
- Inertial guidance·sequencing

**Legacy:**
- TMR concept 정립
- Avionics fault tolerance 원형

LVDC — *TMR avionics의 표준*. 50+ year inheritance.

## Space Shuttle GPC

**Space Shuttle GPC (General Purpose Computer):** IBM AP-101.

**Architecture:**
- 5 GPC (Quadplex + 1 backup)
- 4 GPC — same SW (PASS)
- 5th GPC — diverse SW (BFS) Backup Flight System

**PASS (Primary Avionics SW System):**
- 4 GPC vote
- HAL/S language (custom)
- Single common-mode bug catch 불가

**BFS (Backup Flight System):**
- Independent diverse design
- Different vendor·different team
- Activate only on PASS catastrophic fail

**History:**
- STS-1 (1981) — PASS 실수, BFS 활성화 직전 fix
- STS-1 to 135 — BFS 한 번도 activate 안 됨

Shuttle — *5-channel diverse*. Most fault-tolerant.

## Modern Aircraft Fault Tolerance

**B777 PFC (Primary Flight Computer):**
- 3 lanes
- Each lane:
  - Different vendor (GE·Honeywell·Lockheed)
  - Different processor (Intel·AMD·Motorola)
  - Different language (Ada·C·C++)
- Diverse design — common-mode 회피

**B787 CCS (Common Core System):**
- IMA-based
- Multiple GPM modules
- ARINC-653 partitions
- Cross-channel data flow

**A380·A350 FCS:**
- Dual·triple FCC (varies)
- ELAC (Elevator Aileron Computer)
- SEC (Spoiler Elevator Computer)
- FCDC (Flight Control Data Computer)

**F-22·F-35:**
- Triple architecture
- IMA-based
- Multi-core

각 commercial — *유사 redundancy 철학*. 인증 frame.

## LV Fault Tolerance — 사례

- **SpaceX Falcon 9:** Dual flight computer (x86). Linux + custom RTOS. Software-level redundancy. Sensors triplicated.
- **Atlas V·Vulcan:** Honeywell flight computer. Triple processor.
- **Delta IV·Delta IV Heavy:** Triple architecture. Boeing developed.
- **KSLV-II 누리:** Dual-redundant ARM. 자체 + 외산. Cross-comparison.
- **Ariane 5·6:** Triple FCC. Diverse design. Astrium·Airbus.
- **Apollo Saturn V (legacy):** TMR LVDC.

LV — *dual·triple* depending on mission criticality.

## Fault Detection·Isolation·Recovery

**3-step process:**

**Detection:**
- Sensor reading out-of-range
- Voter mismatch
- Timeout (watchdog)
- Self-test fail
- Status flag

**Isolation:**
- Identify *which* channel failed
- Cross-comparison
- Reasonableness check
- Manual·automatic

**Recovery:**
- Switch to redundant
- Reset·restart
- Reconfigure (degraded mode)
- Mission abort (worst)

각 — *implementation 별 cost·complexity*.

FDR cycle — *avionics fault tolerance 핵심*. Ch 10 자세히.

## Common-Mode Failure

**Common-mode failure:**
- 여러 채널 *동시 fail*
- Identical fault mode

**원인:**
- Power supply 공유 → power fail
- Cooling 공유 → 열 fail
- Clock 공유 → clock fail
- Software (identical code) → bug fail
- Specification → design fail
- Maintenance error → human fail

**완화:**
- Independent power
- Independent cooling
- Independent clock
- Diverse design (N-version)
- Independent maintenance
- Diverse specification reviews

**인증:**
- ARP-4761 — Common Mode Analysis (CMA)
- Each potential common-mode 식별 + mitigation

Common-mode = *redundancy의 천적*. ARP-4761 강제.

## Korea Fault Tolerance

- **KAI KF-21 보라매:** Quad FCC. Diverse design (자체 + 외산). Lock-step monitor.
- **한화 미사일·LV:** Dual·triple architecture. Self-checking.
- **KARI KSLV-II:** Dual redundancy. Cross-comparison. Software fault tolerance.
- **KARI KOMPSAT·KPLO:** Hot·cold spare. Reaction wheel redundancy. Bus dual.
- **민간 LV:** Cost trade-off. Dual 위주.

한국 — *dual·triple* 위주. 비용 trade-off.

## 자주 하는 실수

> ⚠️ "TMR = 자동 안전"

TMR을 도입했다고 보장이 끝난 것이 아니다. Voter·power·clock common-mode를 놓치면 안 된다.

→ Common-mode analysis 필수.

> ⚠️ Hot spare without sync

Spare가 동작 중이어도 state가 unsync면 takeover 시 wrong state로 시작한다.

→ State replication·sync.

> ⚠️ Diversity 단순 가정

"Different compiler version = diverse"는 잘못된 가정이다. Same algorithm·spec이면 common-mode가 여전히 남는다.

→ Algorithm·architecture diverse.

> ⚠️ Recovery 절차 없음

Detect만 하고 recovery를 안 하면 fault 후 mission이 손상된다.

→ Detection + isolation + recovery 모두.

## 정리

- **TMR·DMR** — 핵심 redundancy 패턴.
- **Hot vs Cold spare** — takeover latency trade-off.
- **Lock-step vs Loose** — sync model.
- **N-version programming** — common-mode 회피.
- Apollo LVDC·Shuttle GPC — *TMR 표준 정립*.
- B777 PFC — 3-lane diverse design.
- ARP-4761 *Common Mode Analysis*.
- 한국 — *dual·triple* + 자체 fault tolerance.

다음 편은 **FDIR — Fault Detection·Isolation·Recovery**.

## 관련 항목

- [Ch 8: FMS](/blog/embedded/avionics/digital-avionics-handbook/chapter08-fms)
- [Ch 10: FDIR](/blog/embedded/avionics/digital-avionics-handbook/chapter10-fdir)
- [Developing Safety-Critical SW Ch 5: Design](/blog/embedded/avionics/developing-safety-critical/chapter05-design)
