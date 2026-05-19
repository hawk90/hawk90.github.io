---
title: "Ch 2: Integrated Modular Avionics (IMA)"
date: 2026-05-25T02:00:00
description: "전통 federated 아키텍처에서 IMA로의 전환 — 공유 플랫폼·partition 분리."
series: "Digital Avionics Handbook"
seriesOrder: 2
tags: [avionics, ima, partitioned, architecture]
draft: true
---

## 한 줄 요약

> **"IMA = 공유 platform + robust partition"** — 무게·공간·비용 절감.

## Federated → IMA 전환

```text
Federated (전통):
  Function별 LRU 1개
    - GPS box
    - INS box
    - FMS box
    - Display computer box
    - Engine monitor box
    - ...
  
  → 30+ boxes (B747)
  → 무게 1톤+ (전자 시스템)
  → 케이블 수십 km

IMA (현대):
  공유 General-Purpose Module (GPM)
    - Powerful CPU
    - 표준 module
    - Partition 안에 SW 호스팅
  
  → 5~10 cabinets
  → 무게·공간 절반 이하
  → 표준 backplane bus
```

IMA — *consolidation*. Mainframe 아닌 *partitioned platform*.

## Robust Partitioning

```text
Partition 보장 (ARINC-653):

1. Space Partition:
   각 partition별 *별도 memory region*
   MMU·MPU로 enforce
   → Partition A 잘못 → B의 memory 못 건드림
   
2. Time Partition:
   각 partition별 *time slot* (보장된 CPU 시간)
   Periodic 주기 (frame)
   → Partition A 무한 루프 → B의 deadline 영향 없음
   
3. Fault Containment:
   Partition fail → 다른 partition *영향 0*
   Health Monitor (HM) — fault detect·isolate
   
4. Resource Isolation:
   I/O·comm·memory·CPU 각각 partition 정의
```

*Robust* = "잘못된 partition 코드가 다른 partition 손해 못 줌".

## IMA 아키텍처 — 전형

```text
Cabinet (예: ARINC-664·AFDX 기반):
  
  ┌────────────────────────────┐
  │  GPM 1  GPM 2  GPM 3  ...  │  ← Compute modules
  │  ┌──┐   ┌──┐   ┌──┐        │
  │  │CPU│  │CPU│  │CPU│       │
  │  │RAM│  │RAM│  │RAM│       │
  │  └─┬┘   └─┬┘   └─┬┘        │
  │    │      │      │          │
  │  ──┴──────┴──────┴───────── │  ← AFDX switch
  │                              │
  │  I/O Module 1  I/O Module 2 │  ← I/O modules
  │  (analog·digital·1553·429)  │
  └────────────────────────────┘
       │
    각 LRU·sensor·actuator
```

각 GPM — *여러 partition 호스팅*. 한 LRU에 여러 application.

## ARINC-653 — Partitioning Standard

```text
ARINC-653 APEX (Application/EXecutive):
  IMA의 *partition API* 표준
  Avionics-only RTOS interface

API 카테고리:
  - Process management (within partition)
  - Time management
  - Interpartition communication
    Queueing Port (FIFO message)
    Sampling Port (latest value)
  - Intrapartition communication
    Buffer
    Blackboard
    Semaphore
    Event
  - Health Monitor
  - Error handler

Partition spec (config table):
  - Memory size·base
  - Time slot·offset
  - Port·channel
  - HM action
```

ARINC-653 = *avionics 공통 partition API*. Ch 3 자세히.

## IMA 도입 사례

```text
B777 (1995):
  AIMS (Aircraft Information Management System)
  Honeywell 개발
  Federated → 부분 IMA 전환의 시초

B787 Dreamliner (2011):
  Common Core System (CCS)
  GE 개발
  IMA 전면 — *CCR* (Common Computing Resource) 2 cabinets
  AFDX bus
  
A380 (2007):
  IMA 도입
  Thales·Diehl 개발
  AFDX
  
A350 XWB (2015):
  Full IMA + ARINC-664-P7

F-22 Raptor (2005):
  Lockheed·Boeing·IBM
  CIP (Common Integrated Processor)
  부분 IMA
  
F-35 (2015):
  ICP (Integrated Core Processor)
  Lockheed·BAE Systems
  Full IMA + multi-core
  
A220·Embraer E2:
  IMA 채택
```

IMA — *현대 대형기 표준*. 군용기 점진 도입.

## IMA Computing Module — 예

```text
B787 CCR:
  16 GPM modules per cabinet
  PowerPC + VxWorks 653 또는 Green Hills INTEGRITY-178
  4 GB RAM (typical)
  AFDX 1 Gbps interconnect
  
F-35 ICP:
  Freescale PowerPC + Intel
  Green Hills INTEGRITY-178 tuMP (multi-core)
  
A380 CPIOM:
  Core Processing IO Module
  Wind River VxWorks 653
  
IMA RTOS market:
  Wind River VxWorks 653 (B787·A380·A350)
  Green Hills INTEGRITY-178 (F-22·F-35·B777X)
  Lynx LynxOS-178 (F-22·B787)
  SYSGO PikeOS (A350·Eurofighter)
```

각 RTOS — *DO-178C Level A* 인증.

## 인증 영향 — IMA

```text
Federated 인증:
  각 box = independent → 인증 separate
  
IMA 인증:
  Platform (RTOS + IMA service) — 한 번 *Level A* 인증
  + 각 application — DAL 따라 인증
  + Integration — composability proof
  
이득:
  Platform 재사용 → application 인증 효율 ↑
  
부담:
  Partitioning robustness *증명 필요*
  - Memory isolation evidence
  - Timing isolation evidence
  - HM·error handling

Acceptance:
  FAA AC 20-170 (IMA)
  EASA CRI on IMA
  DO-297 — IMA Development Guidance and Certification Considerations
```

DO-297 — IMA-specific guidance. DO-178C 보완.

## DO-297 — IMA Guidance

```text
DO-297 — Integrated Modular Avionics (IMA) Development Guidance:
  
  Task 1: IMA Platform development·acceptance
  Task 2: Hosted Application development·acceptance
  Task 3: IMA system integration
  Task 4: Operations·user manuals
  Task 5: Subsequent change

Players:
  IMA Platform Supplier (Honeywell·GE·Thales)
  Application Supplier (각 LRU vendor)
  System Integrator (Boeing·Airbus·KAI)
  
각 player — *book of evidence*.
```

DO-297 = *IMA 인증의 frame*. 복합 supply chain.

## Mixed-DAL — IMA의 핵심 장점

```text
Mixed-DAL 예 (B787 IMA):

Partition         Function          DAL
─────────────────────────────────────────
P1                Flight Control    A
P2                Auto Pilot        A
P3                Navigation        B
P4                Comm·Display      C
P5                Maintenance·log   D

같은 IMA platform에 *DAL A·B·C·D 공존*

조건:
  Robust partitioning evidence
  Platform itself — *highest DAL* (A)
  Application — 자체 DAL
  
효과:
  Low-DAL app의 Level A 부담 없음
  Cost·schedule 효율
```

Mixed-DAL = IMA *경제 가치*. Ch 3 ARINC-653 자세히.

## IMA의 한계

```text
- Single Platform Failure 위험:
  Cabinet 1개 fail → 다수 function 영향
  → Dual·triple cabinet 필요
  
- Cabling 표준화:
  AFDX·1553·discrete 혼재
  
- Vendor lock-in:
  Platform vendor (VxWorks·INTEGRITY)
  Migration 어려움
  
- 인증 복잡:
  Composability·partitioning evidence
  
- Cost (small fleet):
  IMA 효율 — large fleet에 명백
  Small fleet — federated 충분할 수도
```

IMA = *trade-off*. Large·long-life program에 적합.

## Distributed IMA — 차세대

```text
Centralized IMA (현재):
  Cabinet 1~2개
  중앙 컴퓨터 + 분산 I/O
  
Distributed IMA (미래):
  분산 컴퓨팅 + Time-Triggered Ethernet (TTEthernet)
  각 zone (cockpit·nose·tail·wing)에 mini-cabinet
  Function deploy 유연
  
표준화 추세:
  FACE (Future Airborne Capability Environment) — 군용
  SOSA (Sensor Open Systems Architecture)
  ARINC-664P7 (AFDX)·TTE
  
사례:
  F-35 Block 4 — distributed
  Boeing 777X — partial distributed
  Future — eVTOL·UAV
```

Distributed — *open architecture* + *modular*.

## LV에서 IMA — 미흡

```text
LV 분야 IMA 도입 — *제한적*:

이유:
  - LV mission time 짧음 (수십 분~시간)
  - Catastrophic fail tolerance 어려움
  - Mass·volume 제약 강함
  - 전통적으로 *custom federated*
  
실제:
  Falcon 9 — partial integrated (자체 set)
  KSLV-II — federated 위주
  Atlas V·Vulcan — modern integrated
  Ariane 6 — integrated
  
미래:
  Reusable LV → IMA 도입 추세
  SpaceX·Blue Origin·Vulcan
```

LV — IMA *부분 적용*. 항공기와 다른 trade-off.

## 한국 IMA 도입

```text
KAI KF-21 보라매:
  부분 IMA + federated
  국산 mission computer
  
KAI FA-50:
  KASS (Korean Avionics Subsystem)
  부분 통합
  
KARI KSLV-II:
  Federated avionics
  자체 + commercial RTOS

한화·LIG:
  자동차 — AUTOSAR + 부분 IMA
  방산 — 자체 + IMA 검토

미래:
  국산 IMA platform 개발 추진
```

한국 — *IMA 학습·도입 진행*. 자체 platform 개발 중.

## 자주 하는 실수

> ⚠️ "IMA = mainframe"

```text
"하나의 큰 컴퓨터에 모든 SW"
→ Mainframe과 혼동
→ Partition isolation 의미 모름
```

→ IMA = *partitioned + isolation enforced*.

> ⚠️ Mixed-DAL without partition isolation evidence

```text
"여러 DAL 공존" → partition만으로 자동 안전
→ Robustness evidence 필수
```

→ Memory·timing·HM 증명.

> ⚠️ Platform vendor lock-in 무시

```text
IMA 도입 시 RTOS 선택
→ 30년 program lifetime
→ Vendor 변경 비현실적
```

→ Vendor·source escrow·표준 호환.

## 정리

- **IMA = 공유 platform + robust partition**.
- ARINC-653 = *partition API 표준* (Ch 3).
- DO-297 = *IMA 인증 guidance*.
- Mixed-DAL 공존 — IMA *경제 가치*.
- B787·A380·A350·F-22·F-35 — 채택.
- LV — IMA *부분 적용*. 다른 trade-off.
- 한국 — *IMA 학습·자체 platform 개발*.

다음 편은 **ARINC-653 partitioning**.

## 관련 항목

- [Ch 1: Avionics 시스템 개요](/blog/embedded/avionics/digital-avionics-handbook/chapter01-avionics-overview)
- [Ch 3: ARINC-653](/blog/embedded/avionics/digital-avionics-handbook/chapter03-arinc-653)
- [Developing Safety-Critical SW Ch 5: Design](/blog/embedded/avionics/developing-safety-critical/chapter05-design)
- [Developing Safety-Critical SW Ch 10: Reusable Software](/blog/embedded/avionics/developing-safety-critical/chapter10-reusable-software)
