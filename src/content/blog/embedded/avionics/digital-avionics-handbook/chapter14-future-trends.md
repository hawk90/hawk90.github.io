---
title: "Ch 14: Future Trends — open architecture·SDR·AI"
date: 2026-05-18T14:00:00
description: "FACE·OMS·SDR·AI/ML이 가져오는 avionics 추세."
series: "Digital Avionics Handbook"
seriesOrder: 14
tags: [avionics, future, face, sdr, ai]
draft: true
---

## 한 줄 요약

> **"Future avionics = open + adaptive + intelligent"** — FACE·SDR·AI·reusability.

## 변화의 동인

```text
2020년대 avionics 추세:

1. Cost pressure:
   상용 부품 도입
   Open architecture
   
2. Multi-program reuse:
   FACE·SOSA·OMS
   Vendor 다양화
   
3. New mission:
   eVTOL·UAV·UAM·Hypersonic
   New paradigm
   
4. Software:
   SW 비중 ↑↑
   AI·ML 도입
   
5. Reusability:
   Falcon 9 — reuse 가능 LV
   Avionics — repair·refurbish
   
6. Cybersecurity:
   Threat 증가
   Standard (DO-326A·ED-202A)
```

대변화 — *open + connected + intelligent*.

## FACE — Future Airborne Capability Environment

```text
FACE:
  US DoD / OSA initiative
  Open architecture for military aircraft·UAV
  
역사:
  2010 — initiated
  2020+ — wider adoption
  
목적:
  - Vendor 다양화
  - Cross-program portability
  - Cost reduction
  - Update agility

Reference architecture:
  Operating System Segment (OSS)
  Transport Services Segment (TSS)
  Platform-Specific Services Segment (PSSS)
  Portable Components Segment (PCS)
  Configuration Segment

표준:
  Linux RTOS·VxWorks·INTEGRITY·...
  DDS·CORBA·protobuf
  C++·Ada
```

FACE — *DoD 표준화 추진*. 점진 채택.

## SOSA — Sensor Open Systems Architecture

```text
SOSA:
  Sensor Open Systems Architecture
  US DoD
  
대상:
  Sensor·EW (Electronic Warfare)·comm payload
  
표준:
  Hardware standards:
    VPX (3U·6U card)
    Optical·copper backplane
  
  Software interfaces:
    REDHAWK SDR framework
    Open standards
  
사용:
  F-35 future blocks
  Future fighter
  
한국:
  KF-21 일부 검토
  방산 표준화 영향
```

SOSA — *sensor·EW 표준*. Hardware modularity.

## OMS — Open Mission Systems

```text
OMS:
  Open Mission Systems
  US Air Force initiative
  
대상:
  Mission system architecture
  Avionics·sensor·weapon integration
  
구조:
  Service-based
  Publish-subscribe (DDS)
  Microservice
  
사례:
  F-22 future upgrade
  T-7A Red Hawk
  Future fighter
  
영향:
  Vendor competition
  Faster upgrade cycle
  Common framework
```

OMS — *mission system 통합*. SW agility.

## SDR — Software-Defined Radio

```text
SDR (Software-Defined Radio):
  RF · baseband processing in *SW*
  Antenna·ADC·DAC만 HW
  
이점:
  - Multi-band (VHF·UHF·SATCOM·datalink)
  - Re-programmable (mission별)
  - Over-the-air update
  - Adaptive (jamming·interference)
  
플랫폼:
  Xilinx Zynq (FPGA + ARM)
  GPU (limited)
  Custom DSP
  
프로토콜:
  ARINC-664 (AFDX)
  CCSDS
  L-band·S-band
  Tactical Link 16
  
인증:
  DO-178C (waveform SW)
  DO-254 (FPGA)
  
사용:
  Military aircraft — Link 16, MIDS-LVT
  Commercial — ACARS·SATCOM
  LV·우주 — telemetry·command
```

SDR = *cognitive·adaptive radio*. 군·우주 핵심.

## AI/ML in Avionics

```text
AI 응용 영역:

1. Image-based navigation:
   Terrain matching
   Visual landing aid
   Smart camera
   
2. Anomaly detection:
   Engine·airframe health
   Sensor fusion
   
3. Pilot assist:
   Auto-land (advanced)
   Decision support
   Workload reduction
   
4. Mission planning:
   Optimal route
   Trajectory replanning
   
5. Image processing:
   Target ID
   Threat detection
   SAR processing
   
6. Predictive maintenance:
   Fleet-wide ML
   Failure prediction
```

AI — *non-safety critical 위주* 도입.

## AI 인증 도전

```text
AI·ML 인증 문제:

Traditional SW:
  Deterministic
  Coverage·MC/DC measurable
  Code review possible
  
ML 모델:
  Non-deterministic (보통)
  Coverage 불명
  Black-box (deep NN)
  Training data dependency
  Adversarial vulnerability
  
DO-178C 한계:
  ML 직접 지원 안 함
  Workaround:
    - ML output as *advice*, not autonomous
    - Human-in-the-loop
    - Rule-based safety net
  
표준 진행:
  EASA AI Roadmap (1.0·2.0)
  FAA AI Coordination
  UL 4600 (autonomous vehicle)
  ISO/IEC TR 5469 (AI safety)
  SAE G-34 (Aerospace AI)
  
KAIST·ETRI:
  AI for aerospace 연구
  XAI (Explainable AI)
```

AI 인증 — *current frontier*. 향후 10년 표준화.

## Mars Ingenuity — AI·Linux 사례

```text
Mars Helicopter Ingenuity (2021):
  Mars rotorcraft
  
Architecture:
  Snapdragon 801 (commercial)
  Linux (cellphone OS)
  Python·C++ flight code
  Open source library
  Stereo camera vision
  
Mission:
  Tech demo — 5 flight planned
  → 72 successful flight by 2024
  
Significance:
  First Linux + commercial chip on Mars
  Cost-effective
  AI·CV onboard
  
Lesson:
  Conservative redundancy
  Ground rehearsal
  Commercial parts viable
  
영향:
  Future Mars rotorcraft (Dragonfly to Titan)
  Asteroid·comet
  Outer space exploration
  
KARI·인노스페이스 검토:
  Commercial parts approach
  Mission-specific qualification
```

Ingenuity — *commercial + Linux + AI* viable.

## eVTOL·UAM — Urban Air Mobility

```text
eVTOL (Electric Vertical Take-Off and Landing):
  Joby Aviation
  Archer Aviation
  Volocopter
  Lilium
  Wisk
  
Avionics:
  Modern IMA
  FBW (DO-178C Level A)
  AI for navigation·collision avoidance
  Distributed propulsion control
  
인증:
  FAA Part 23·Special Class
  EASA SC-VTOL
  
한국:
  현대모비스·현대자동차·Doosan
  K-UAM consortium
  Hyundai Supernal
  
일정:
  2025~ — first commercial UAM
  2030+ — wide adoption (예측)
```

UAM — *avionics + AI* 결합. 한국 active development.

## Reusability — LV Avionics 영향

```text
Falcon 9 reuse 영향:
  Avionics — 다회 비행
  진동·열·shock 누적
  
설계 변화:
  - Inspection·refurbish 가능
  - Health monitor + flight log
  - Predictive maintenance
  - Component traceability
  
SpaceX Falcon 9:
  Single core 20+ reuse
  Avionics inspection·certification per flight
  
LV trend:
  Vulcan·New Glenn·Ariane Next — reusability 검토
  KSLV-III — reuse 옵션 연구
  Starship — full reuse 목표
  
민간 LV:
  인노스페이스·페리지·UNASTELLA
  Cost-driven reuse 추구
```

Reuse — *avionics health·diagnostics 강화*.

## Cybersecurity in Avionics

```text
위협:
  - Connected aircraft (gate·in-flight Wi-Fi)
  - Avionics-IFE separation
  - Software supply chain
  - SDR · datalink
  
표준:
  DO-326A — Airworthiness Security Process
  ED-202A — equivalent (EUROCAE)
  DO-355 — Information Security Guidance
  DO-356 — Airworthiness Security Methods
  
NIST·DARPA:
  Cyber resilience research
  Zero trust architecture
  
대표 incident:
  2015 — alleged in-flight hack (claim)
  ARM Cortex-M security
  
Korea — 방사청·KARI:
  Cybersecurity 표준 적용 진행
  방산 SW 신뢰성시험 + security 통합 추세
```

Cybersecurity — *항공 SW의 새 차원*. 인증 추가.

## Multi-Core·Heterogeneous

```text
Multi-core 표준화 (다시):
  CAST-32A → AMC 20-193 (2021)
  Interference channel — 명시
  Worst-case analysis 도구
  Lockstep core 추가
  
Heterogeneous SoC:
  ARM + DSP + FPGA + GPU
  Mission-specific compute
  
GPU in avionics:
  - Image processing
  - AI inference
  - Display rendering
  
인증:
  GPU SW — DO-178C
  GPU HW — DO-254
  Cert 부담 큼
  
사례:
  F-35 — multi-core ARM
  Boeing 777X — multi-core upgrade
  Mars Perseverance — RAD750 + FPGA + Snapdragon (Ingenuity)
```

Heterogeneous — *avionics SW 복잡성 ↑*.

## Quantum·Optical Technology

```text
미래 — 10+년 후 가능:

Quantum sensor:
  Quantum gyroscope·magnetometer
  Drift 극소
  GPS-denied navigation

Quantum communication:
  Quantum key distribution
  Secure satellite link
  
Optical communication:
  Laser inter-satellite
  Ground-to-space
  
Optical computing:
  Limited adoption — research

연구 단계:
  NASA·DARPA·KAIST 연구
  Production deployment 2030+
```

먼 미래 — *avionics 차세대*.

## 한국 미래 Avionics

```text
KARI:
  KSLV-III — 차세대 LV (reusability·larger)
  KOMPSAT 후속
  KPLO 후속 — 화성·소행성 탐사
  
KAI:
  KF-21 Block 2·3·Phase 2
  Future fighter (FCAS·GCAP 참여 검토)
  UAM
  
한화·LIG·KAI:
  방산 modernization
  자율 무기·드론 군집
  AI·ML
  
민간 LV:
  인노스페이스 (브라질 발사)
  페리지 — 향후 발사
  UNASTELLA — 우주 관광

자체 기술:
  SDR
  AI/ML
  Quantum sensor 연구
  사이버 보안
```

한국 — *2030년 모든 영역 자체 capability* 목표.

## SW Engineer 진로

```text
Avionics SW engineer — future skill:

Core (불변):
  - C/C++ embedded
  - RTOS (VxWorks·INTEGRITY·RTEMS)
  - DO-178C·certification
  - MISRA C·CERT C
  - 1553·CCSDS·AFDX

Modern (증가):
  - Modern C++ (14·17·20)
  - Python (test·ground software)
  - AI/ML basics
  - Linux for space (Ingenuity-like)
  - SDR·DSP
  - Cybersecurity (DO-326A)
  - Multi-core (CAST-32A·AMC 20-193)
  - Open architecture (FACE·SOSA·OMS)

Emerging:
  - Autonomous algorithms
  - Quantum
  - Distributed avionics
```

미래 Avionics SW — *traditional + modern + AI*.

## 산업 채용 추세

```text
한국 채용 변화 (2020~):

기존 channel (KAI·한화·LIG·KARI):
  지속 채용
  방산·항공·우주

신규 channel:
  인노스페이스·페리지·UNASTELLA — 민간 LV
  K-UAM 컨소시엄 — UAM
  AI·자율 시스템 startup
  
자격 요구 변화:
  Traditional + AI·ML
  Open architecture + 인증
  Cybersecurity
  영어 (국제 협력 증가)
  비밀취급인가 (군·우주)

매년 수백 명 신규 — 시장 확대
```

채용 — *양 + 질* 확대.

## 자주 하는 실수

> ⚠️ Open architecture = free

```text
"FACE·SOSA — open source"
→ Cert·license·integration cost 무시
```

→ Open standard ≠ free.

> ⚠️ AI/ML 즉시 도입

```text
"AI for safety-critical"
→ DO-178C 미흡
→ Cert 부재
```

→ Non-safety advisory부터 시작.

> ⚠️ Reusability 무시

```text
"단일 사용 — 인증 단순"
→ Future business 손실
→ Cost 경쟁력 ↓
```

→ Reusability 설계 고려.

> ⚠️ Cybersecurity 후순위

```text
"Avionics 격리"
→ Connected aircraft·datalink 취약
```

→ DO-326A·ED-202A 처음부터.

## 정리

- **FACE·SOSA·OMS** — open architecture 추세.
- **SDR** — adaptive·multi-band radio.
- **AI/ML** — *non-safety advisory* 위주 시작.
- **eVTOL·UAM** — modern IMA + AI 결합.
- **Reusability** — avionics health·diagnostics 강화.
- **Cybersecurity** — DO-326A·ED-202A 표준.
- **Multi-core·Heterogeneous** — 차세대 SoC.
- 한국 — *KARI·KAI·민간 LV·UAM 모두 active*.

## 시리즈 마무리

이 시리즈 — Cary Spitzer *Digital Avionics Handbook*의 14 chapters를 발사체·항공우주 관점에서 정리했다.

```text
14 chapters:
  Ch 1:  Avionics 시스템 개요
  Ch 2:  Integrated Modular Avionics (IMA)
  Ch 3:  ARINC-653 partitioning
  Ch 4:  Avionics Computer Architecture
  Ch 5:  Avionics Buses (1553·429·AFDX·SpaceWire)
  Ch 6:  Sensors (IMU·GPS·Star tracker)
  Ch 7:  Actuators (TVC·RCS·서보)
  Ch 8:  Flight Management Systems
  Ch 9:  Fault Tolerance (TMR·DMR)
  Ch 10: FDIR
  Ch 11: Avionics RTOS
  Ch 12: V&V (MIL·SIL·PIL·HIL·Flight test)
  Ch 13: DO-160G 환경 시험
  Ch 14: Future Trends (open·SDR·AI)
```

Avionics — *aviation electronics*의 50년 진화. 다음 50년 — *open·adaptive·intelligent*.

## 다음 추천 시리즈

```text
같은 카테고리 (embedded/avionics):

1. Developing Safety-Critical Software (Rierson)
   ✅ 완료 — 15 chapters
   DO-178C 깊이
   
2. Launch Vehicle Flight Software
   ✅ 완료 — 10 chapters
   LV-specific 원본

3. (Future)
   Civil Avionics Systems (Moir·Seabridge)
   Spacecraft Systems Engineering (Fortescue)
   각 책 필요 시 추가

Cross-link:
  - embedded/rtos — VxWorks·INTEGRITY·Zephyr 깊이
  - embedded/standards — MISRA·CERT C·JSF C++
  - embedded/automotive — AUTOSAR·MISRA C++
```

## 관련 항목

- [Ch 13: DO-160](/blog/embedded/avionics/digital-avionics-handbook/chapter13-do-160)
- [Ch 1: Avionics 시스템 개요](/blog/embedded/avionics/digital-avionics-handbook/chapter01-avionics-overview)
- [Developing Safety-Critical SW Ch 15: 방사청·KARI](/blog/embedded/avionics/developing-safety-critical/chapter15-korea-defense)
- [Launch Vehicle Flight SW Ch 10: KSLV-II](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter10-kslv-ii)
- [원문 — Cary Spitzer (ed.), *Digital Avionics Handbook*, 3rd ed., CRC Press](https://www.routledge.com/Digital-Avionics-Handbook/Spitzer-Ferrell-Ferrell/p/book/9781439868980)
