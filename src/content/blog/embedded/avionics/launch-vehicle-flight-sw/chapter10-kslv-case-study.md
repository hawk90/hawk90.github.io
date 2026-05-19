---
title: "Ch 10: KSLV-II 누리·민간 LV 공개 사례 — KARI·InnoSpace·Perigee·UNASTELLA"
date: 2026-05-18T10:00:00
description: "한국 발사체 avionics 공개 자료. KSLV-II 누리·민간 LV·국가 우주개발 로드맵."
series: "Launch Vehicle Flight Software"
seriesOrder: 10
tags: [avionics, kslv, korea, innospace, perigee, unastella]
draft: true
---

## 한 줄 요약

> **"한국 LV avionics = KARI 누리 + 민간 startup"** — 2020s 한국 우주 산업 본격 진입.

## KSLV-II 누리

한국형 발사체 (KSLV-II) "누리"

- Stage 1: 75톤급 액체엔진 × 4 (KRE-075)
- Stage 2: 75톤급 × 1
- Stage 3: 7톤급 (KRE-007)
- Payload: 1500 kg to 700 km LEO
- Mission duration: 16분

Development

- 2010-2022 (12년)
- $1.8 B 투자
- KARI lead·한화에어로스페이스·KAI 등

Launches

| 날짜 | 결과 |
|---|---|
| 2021-10 | 실패 (3단 조기 cutoff) |
| 2022-06 | 성공 |
| 2023-05 | 성공 |
| 2025-12 | 예정 (실용 위성 발사) |

세계 7번째 *자체 LV 보유국* (러시아·미국·중국·일본·유럽·인도·한국).

## 누리 Avionics

공개 자료 (AIAA·IEEE paper·KARI 발표) 기준입니다.

Flight Computer

- TMR architecture (3 modules)
- PowerPC 또는 ARM (구체 비공개)
- RTOS — VxWorks 또는 RTEMS (추정)

IMU

- Fiber Optic Gyro (FOG) — 정밀
- MEMS backup
- 3-axis acceleration

Navigation

- GPS + INS
- Star tracker (long mission 단계)

Communication

- S-band telemetry
- CCSDS standard
- Naro Space Center ground station

Software

- C language (DO-178C 기반)
- Ada 일부 (legacy)
- In-house developed

KARI — *자체 개발* (최소한의 라이선스 의존).

## 누리 Mission Phase

| 시각 | 이벤트 |
|---|---|
| T-12s | Engine start sequence |
| T-0 | Liftoff (sea level thrust ~300 tons) |
| T+10s | Clear tower |
| T+1min | Max-Q (max aerodynamic pressure) |
| T+2min | 1st stage separation |
| T+3min | 2nd stage burn |
| T+8min | Fairing jettison |
| T+10min | 2nd stage cutoff |
| T+11min | 3rd stage burn |
| T+13min | 3rd stage cutoff (orbit insertion) |
| T+15min | Payload separation |
| T+16min | Mission complete (FCC end) |

각 phase = *FSM state*. Pre-programmed timeline.

## 누리 SW 개발 Process

KARI internal SW process

1. Requirements (SRS·SRD)
2. Architecture (SAD)
3. Detailed design (SDD)
4. Implementation (C·Ada)
5. Unit test (LDRA·Cantata)
6. Integration test
7. HIL (Hardware-in-the-loop)

V-model 또는 modified waterfall. IV&V (Independent Verification·Validation).

Standards

- KARI internal (DO-178C 참고)
- 방사청 SW 신뢰성시험 일부
- ECSS-Q-ST-80C (ESA, 참고)

DO-178C *fully cert*는 아닌 — *Korea-adapted process*.

## 누리 사용된 기술

공개된 정보

- Fault detection·isolation·recovery (FDIR)
- Voting 3-of-3 또는 2-of-3
- Range Safety system 인터페이스
- Telemetry encoding (CCSDS-like)
- Stage separation logic
- Engine throttle control

비공개 (보안·경쟁력)

- 정확한 CPU·RTOS 종류
- Control algorithm 상세
- 통신 protocol 세부
- SW source code

## InnoSpace (이노스페이스)

InnoSpace

- 창립 2017
- 본사: 충북 청주
- 타입: Sub-orbital → orbital

HANBIT (한빛)

- Hybrid rocket engine (LNG + paraffin)
- HANBIT-Nano (~300 kg LEO, 2023 첫 발사)
- HANBIT-Micro·Mini

첫 비행

- 2023-03 브라질 알칸타라 (sub-orbital 성공)
- 2025+ 상업 발사 목표

Avionics (공개 정보 한정)

- ARM Cortex-A·M 기반
- 자체 flight SW
- CCSDS-compatible telemetry

한국 *최초 민간 LV*. SpaceX vs InnoSpace의 한국 버전.

## Perigee Aerospace (페리지)

Perigee Aerospace

- 창립 2018
- 본사: 대전
- 엔진: 액체 메탄 (methane-LOX)

Blue Whale (블루웨일)

- Small LV
- Payload 50-200 kg to LEO
- 재사용 목표 (장기)

2023-06에 시험 발사 (suborbital), 2024+ 본격 시험 단계.

메탄 엔진 — *SpaceX Raptor류*. *재사용 친화*.

## UNASTELLA (우나스텔라)

UNASTELLA

- 본사: 부산
- 타입: 전기펌프 사이클 (electric pump-fed)

특징

- Rocket Lab Electron류 (전기펌프)
- 소형 LV (~100 kg LEO)
- Suborbital tourism도 계획
- 2024-2025 시험 단계

다양화된 한국 *민간 LV scene*.

## 한국 우주 로드맵

2025+ 계획

- 누리 4-6차 (~2027)
- KSLV-III (차세대, 50톤급 메탄 엔진)
- 누리 후속 reusable variant
- Lunar mission Pathfinder (KPLO)

Industry growth

- 누리 기술 민간 이전 (한화에어로스페이스)
- 우주청 (KASA) 설립 (2024)
- 우주항공청 우주개발 진흥 (R&D 확대)

Workforce — Embedded SW engineer 수요 증가. RTOS·FPGA·DO-178C 전문성.

한국 — *국가 + 민간 우주 산업 확대*. SW engineer 채용 *증가*.

## 채용 시장 — Avionics SW

KARI

- Senior research engineer
- 연구원·박사급

한화에어로스페이스

- 민간 우주 발사체·위성 사업
- Embedded SW·firmware

민간 LV (InnoSpace·Perigee·UNASTELLA)

- Avionics SW lead·engineer
- FCC integration
- Ground software

방산 (LIG넥스원·KAI·풍산)

- Missile guidance
- Defense satellite
- Tactical comm

요구 skill:
- C·C++ embedded
- RTOS (VxWorks·RTEMS·FreeRTOS)
- FPGA-SW integration
- DO-178C·방사청 SW 신뢰성시험
- CCSDS·MIL-STD-1553
- Real-time control
- ARM·PowerPC·LEON architecture

## 우대사항 — 공통 패턴

일반 우대

- 항공·우주·방산 SW 경력 3년+
- DO-178C Level B+ 인증 경험
- AUTOSAR·ARINC-653 (자동차 연계)
- 영문 기술 문서 작성
- 학사 이상 (대학원 ↑)

선호 backgrounds

- 컴퓨터공학·항공우주공학·전자공학
- KAIST·서울대·POSTECH·항공대·연세대
- 군대 (방위산업·통신부대)
- 박사 (KARI·연구원)

## 산업체 특화 우대

KARI

- RTOS internals
- Mission SW architecture
- Cross-disciplinary (mechanical·electrical 협업)

한화에어로스페이스

- Embedded C++
- Functional safety
- System integration

민간 LV startup

- Modern dev tooling (Git·CI·Python)
- Open source 친화
- 빠른 prototyping
- Multi-disciplinary

## Open Source — 학습 진입점

- **PX4 Autopilot** — 드론·UAV 자율 비행 control law. NuttX 위. [px4.io](https://px4.io)
- **NASA cFS** — Flight SW framework. [github.com/nasa/cFS](https://github.com/nasa/cFS)
- **NASA F-Prime** — Modern flight SW. [github.com/nasa/fprime](https://github.com/nasa/fprime)
- **KSP Mod·Realism Overhaul** — Spaceflight 시뮬레이션, 실제 mission planning 학습

모두 *open + Apache 2.0/BSD*. 입사 전 *학습 자산*.

## 시리즈 정리 — Launch Vehicle Flight SW

| Ch | 주제 |
|---|---|
| 1 | LV vs Aircraft — 도메인 차이 |
| 2 | FCC Architecture — Heterogeneous SoC |
| 3 | Multiprocessor — AMP·OpenAMP |
| 4 | Control·Signal — PID·LQR·Kalman |
| 5 | FPGA-SW — AXI·DMA·IRQ |
| 6 | CCSDS Space Packet — APID·sequence |
| 7 | CCSDS Data Link — TM/TC·VC·COP-1 |
| 8 | NASA cFS — Message bus framework |
| 9 | F-Prime — Modern C++ framework |
| 10 | KSLV-II Case — 한국 적용·산업 |

**Launch Vehicle Flight Software 시리즈 완성** — 10편.

## 다음 학습 추천

인접 series

- Developing Safety-Critical SW (Rierson) book review
- Digital Avionics Handbook (Spitzer) book review
- Practical RTOS Internals (이미 완성)
- Modern Embedded Recipes (이미 완성)
- Embedded Performance Engineering (이미 완성)

Hands-on

- PX4 contribution
- NASA cFS sample mission
- KARI internship·연구원 채용

Networking

- 한국우주산업·위성기술협회 conference
- AIAA·KSAS 학회
- InnoSpace·Perigee·UNASTELLA 채용 fair

## 자주 하는 실수

> ⚠️ "민간 우주 = SpaceX 같음"

한국 민간 우주는 SpaceX 규모가 아닙니다. Startup 단계에 자본·인력 한계가 있지만 *기술적 잠재력*은 있습니다.

> ⚠️ KARI = 정부 = 보수적

KARI도 현대화를 진행 중입니다. Open source 채택 검토, Modern tooling 도입, AI·자율주행·UAM 연계.

> ⚠️ 우주 SW = 어렵고 인기 없음

2024-2030 transition period — KASA·우주청 신설, 민간 startup 확장, 인력 수요 폭발. 오히려 *지금이 entry point*입니다.

## 정리

- KSLV-II 누리 — *KARI 자체 avionics*, 3 단계 성공.
- 민간 LV — InnoSpace·Perigee·UNASTELLA.
- 한국 우주 로드맵 — KASA·KSLV-III·재사용·Lunar.
- 채용 — KARI·한화·민간 startup·방산.
- Skill — C·RTOS·FPGA·DO-178C·CCSDS.
- Open source — PX4·cFS·F-Prime 학습 가치 큼.

**시리즈 마무리** — 다음은 **Developing Safety-Critical SW** book review.

## 관련 항목

- [Ch 9: F-Prime](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter09-fprime)
- [Developing Safety-Critical SW Ch 1](/blog/embedded/avionics/developing-safety-critical/chapter01-overview)
- [Digital Avionics Handbook Ch 1](/blog/embedded/avionics/digital-avionics-handbook/chapter01-overview)
