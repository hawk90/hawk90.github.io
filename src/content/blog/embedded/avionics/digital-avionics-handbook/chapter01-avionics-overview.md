---
title: "Ch 1: Avionics 시스템 개요"
date: 2026-05-18T01:00:00
description: "Sensor → FCC → actuator → comm — avionics 시스템 구성 요소와 흐름의 한 장 정리."
series: "Digital Avionics Handbook"
seriesOrder: 1
tags: [avionics, aerospace, overview, spitzer]
draft: true
---

## 한 줄 요약

> **"Avionics = Aviation Electronics"** — sensor·FCC·actuator·comm의 4축 체계.

## Avionics 정의·범위

**Avionics:**
- Aviation + Electronics 합성어
- 비행체에 탑재되는 *전자 시스템 전체*

**대상:**
- 민항기 (Boeing·Airbus·KAI)
- 군용기 (F-22·F-35·KF-21)
- 발사체·로켓 (KSLV·Falcon·Atlas)
- 위성·우주선 (KOMPSAT·Dragon·Orion)
- UAV·드론

**범위:**
- Sensors
- Flight Computer (FCC)
- Communication
- Navigation
- Display·HMI
- Power management
- Actuator electronics

광의 — 비행체의 *모든 전자 시스템*.

## 4축 구성

**1. Sensors:**
- IMU (관성 측정)
- GPS·GNSS
- 압력·고도계
- 온도·습도
- Radar·LIDAR
- 카메라·optical

**2. Flight Computer (FCC):**
- Sensor fusion
- Guidance·Navigation·Control (GNC)
- Mission logic
- Data handling

**3. Actuators:**
- 항공기 — control surface (aileron·elevator·rudder)
- 발사체 — TVC (Thrust Vector Control)
- 위성 — RCS (Reaction Control System)
- 엔진 제어 (FADEC)

**4. Communication:**
- Air-to-ground (radio, satcom)
- Inter-bus (1553·SpaceWire·AFDX)
- Telemetry·Telecommand (CCSDS)
- GPS receive

각 *node 간 데이터 흐름*이 avionics의 본질.

## 데이터 흐름

```text
External → Sensor → FCC → Actuator → Physical world
                     ↑↓
                  Comm (ground·other vehicles)
```

**세부 cycle (typical 100~1000 Hz):**
1. Sensor sample (IMU·GPS·...)
2. Filter·fuse (Kalman·complementary)
3. State estimate (position·attitude·velocity)
4. Guidance (trajectory)
5. Control law (PID·LQR·MPC)
6. Actuator command
7. Telemetry (ground)

전체 loop — *deterministic·real-time*.

## 항공기 vs 발사체 vs 위성

| 항목 | 항공기 (Aircraft) | 발사체 (Launch Vehicle) | 위성·우주선 |
|------|-------------------|-------------------------|-------------|
| Mission time | 수 시간 | 수 분~시간 | 수 년~수십 년 |
| Environment | 대기·온도 변화 | 극한 vibration·thermal·radiation | vacuum, radiation, thermal cycle |
| Comm | VHF/UHF·SATCOM | Telemetry (S-band·Ku) + LOS | CCSDS·DSN·통신 위성 link |
| Sensors | IMU + GPS + air data + radar | IMU 우선 + GPS (가능 구간) | IMU + star tracker + sun sensor + GPS |
| Actuators | Control surface + engine | TVC + RCS + engine | RCS·CMG·magnetic torquer |
| 인증 | DO-178C, DO-254 (FAA·EASA) | RCC 319·범 NASA·KARI 자체 | ECSS·NPR 7150.2·KARI |
| Redundancy | Triple·quad | Dual (보통) 또는 fault-tolerant | Cold·hot standby |

세 영역 — *공통 구조 + 환경·time scale 차이*.

## Avionics 발전사

**1세대 (1950~70년대):**
- Analog computer
- Mechanical gyro
- Vacuum tube → transistor

**2세대 (1980~90년대):**
- Digital computer (MIL-STD-1750A 등)
- MIL-STD-1553 bus
- ARINC-429
- Glass cockpit (CRT)

**3세대 (2000년대~):**
- Integrated Modular Avionics (IMA)
- Multi-core·DSP·FPGA
- AFDX (ARINC-664) — Ethernet 기반
- ARINC-653 partitioning
- Software-defined avionics

**4세대 (2010·20년대):**
- AI·ML 도입
- Autonomous flight
- Distributed avionics
- Open architecture (FACE·SOSA)

각 세대 — *전기·전자 진화* + *SW 비중* 증가.

## Federated vs Integrated

**Federated Avionics (전통):** 각 function = *별도 LRU* (Line Replaceable Unit)

- Navigation box
- Display box
- Engine control box
- Communication box

장점:
- Function isolation
- 독립 fail
- Easier certification

단점:
- 무게·공간 ↑
- Cabling 복잡
- 비용 ↑

**Integrated Modular Avionics (IMA):** *공유 platform* + partitioning

- 하나의 강력한 cabinet
- 여러 function이 partition으로 분리

장점:
- 경량·공간 효율
- Cabling 감소
- Cost (per function)

단점:
- Platform 의존
- 인증 복잡
- Single point of failure 위험

IMA — Ch 2 자세히. Boeing 787·A380·A350 채택.

## Avionics SW 비중

**프로그램별 SW Lines of Code (typical):**

| 프로그램 | 시기 | LOC |
|---------|------|-----|
| F-15 | 1970s | 50K |
| F-16 | 1980s | 150K |
| Boeing 747-400 | 1990s | 500K |
| Boeing 777 | 1990s | 1.5M |
| Boeing 787 | 2010s | ~6.5M |
| Airbus A380 | 2010s | ~10M |
| F-22 | 2000s | ~2M |
| F-35 | 2010s | ~25M (최대) |

**LV 비교:**

| 프로그램 | 시기 | LOC |
|---------|------|-----|
| Apollo | 1960s | ~145K |
| Space Shuttle | 1980s | ~400K |
| KSLV-II 누리 | 2020s | 수십만 |

50년간 — *수십~수백배 증가*. SW 복잡성이 인증 부담.

## 인증 Framework

**민항 (Civil aviation):** FAA·EASA·KOCA(국토교통부) 인증

표준:
- SW — DO-178C
- HW — DO-254
- Environment — DO-160
- System safety — ARP-4754A·ARP-4761

**방산 (Military):**
- 미국 — MIL-STD-498·MIL-STD-882E
- 한국 — 방사청 SW 신뢰성시험
- NATO — STANAG

**우주:**
- NASA — NPR 7150.2
- ESA — ECSS-E/Q/S series
- KARI — 자체 + 국제 정합
- RCC 319 (range safety)

각 영역 — *별도 표준 + 일부 cross-applicable*.

## Spitzer 책의 위치

**Cary Spitzer (ed.):**
- *Digital Avionics Handbook*
- 3rd ed., CRC Press, 2014
- ~50 chapters (3 권)

**다루는 영역:**
- Volume I — Development·Implementation·Integration
- Volume II — Avionics Subsystems
- Volume III — Communication·Networking·Architecture

**관점:**
- Avionics *engineer 입문~중급* reference
- Industry practice 중심
- Academic theory 보조

**이 시리즈에서 다루는 14 chapters:** 발사체·항공우주 *직접 가치 있는* 항목 선별.

50+ chapters의 *avionics 입문~중급 reference*.

## 이 시리즈의 14 chapters

- Ch 1: Avionics 시스템 개요 (이 글)
- Ch 2: Integrated Modular Avionics (IMA)
- Ch 3: ARINC-653 partitioning
- Ch 4: Avionics Computer Architecture
- Ch 5: Avionics Buses — MIL-STD-1553·ARINC-429·AFDX
- Ch 6: Sensors — IMU·GPS·Star tracker·Pressure
- Ch 7: Actuators — TVC·RCS·서보
- Ch 8: Flight Management Systems
- Ch 9: Fault Tolerance — TMR·이중화
- Ch 10: FDIR — Fault Detection·Isolation·Recovery
- Ch 11: Avionics Software — RTOS 선택과 통합
- Ch 12: Verification & Validation
- Ch 13: Environmental Qualification (DO-160 개관)
- Ch 14: Future Trends — open architecture·SDR·AI

발사체·항공우주 *career 직결* 14 chapters 선별.

## Avionics Engineer의 역할

**주요 직무:**

**System Engineering:**
- Requirement·architecture·trade-off

**Hardware Engineering:**
- Board·FPGA·ASIC design
- Power·EMI·thermal

**Software Engineering:**
- Flight SW·driver·BSP·RTOS
- Sensor fusion·control law

**Verification·Validation:**
- HIL·SIL·simulation·test

**Integration·Test:**
- System-level integration
- Flight test

**Certification·Quality:**
- Plans·standards·evidence
- IV&V

Avionics는 *multi-discipline*. SW·HW·시스템·인증 cross.

## 한국 Avionics 산업

**주요 업체:**

- **KARI (한국항공우주연구원):** KSLV-II 누리, KOMPSAT, KPLO 다누리
- **KAI (한국항공우주산업):** KF-21 보라매, FA-50, KUH 수리온
- **한화에어로스페이스:** 엔진·로켓·미사일, 발사체 (Nuri 추진계)
- **LIG넥스원:** 미사일·레이더·전자전
- **한화시스템:** 레이더·EW·통신
- **인노스페이스·페리지·UNASTELLA:** 민간 LV·우주
- **중소·중견:** Doowon Heavy·Hyundai Rotem 등

한국 — *국가 + 민간* 우주·항공 양축.

## 발사체 SW 엔지니어 — 채용 요구

**대표 채용 요구사항 (한화·KAI·LIG·InnoSpace):**

필수:
- C/C++ embedded (3~10년)
- ARM·DSP RTOS 경험
- 항공·방산·우주 SW 경험
- 영어 (technical documents)

우대:
- DO-178C·DO-160
- 방사청 SW 신뢰성시험
- MISRA C
- Simulink·SCADE MBD
- FPGA·DSP 통합
- CCSDS·1553·SpaceWire
- 비밀취급인가

본 시리즈 — *우대사항 직접 학습*.

## 정리

- **Avionics = Aviation Electronics** — 4축 (sensor·FCC·actuator·comm).
- **Federated vs IMA** — 전통 isolated vs 현대 integrated.
- F-35 SW *25M LOC* — 인증 부담 거대.
- 인증 framework — DO-178C·DO-254·DO-160·ARP-4754A.
- 한국 — KARI·KAI·한화·LIG 중심.
- Spitzer 책 — *avionics 입문~중급 reference*.
- 이 시리즈 — *14 chapters* 선별 (LV·항공우주 직결).

다음 편은 **Integrated Modular Avionics (IMA)**.

## 관련 항목

- [Ch 2: IMA](/blog/embedded/avionics/digital-avionics-handbook/chapter02-ima)
- [Developing Safety-Critical SW Ch 1](/blog/embedded/avionics/developing-safety-critical/chapter01-assurance-overview)
- [Launch Vehicle Flight SW Ch 1](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter01-lv-vs-aircraft)
- [원문 — Cary Spitzer (ed.), *Digital Avionics Handbook*, 3rd ed., CRC Press](https://www.routledge.com/Digital-Avionics-Handbook/Spitzer-Ferrell-Ferrell/p/book/9781439868980)
