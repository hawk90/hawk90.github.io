---
title: "Ch 1: LV 에비오닉스 vs 항공기 에비오닉스"
date: 2026-05-18T01:00:00
description: "발사체와 항공기 에비오닉스 차이 — 시간·환경·이중화·정비성, SW 아키텍처 영향."
series: "Launch Vehicle Flight Software"
seriesOrder: 1
tags: [avionics, launch-vehicle, aircraft, comparison]
draft: true
---

## 한 줄 요약

> **"항공기 = 수십 년 운용, LV = 수십 분 mission"** — SW 아키텍처가 근본부터 다릅니다.

## 시간 스케일

| 항목 | 항공기 (B787·A350) | 발사체 (Falcon 9·누리·SLS) |
|---|---|---|
| Mission 시간 | 수 시간 ~ 수십 시간 | 8-30분 |
| 운용 수명 | 25-30년 (3만 사이클) | 1회 (Falcon 9는 ~20회 재사용) |
| Daily availability | 99%+ | launch 1회/대 |

항공기 SW = 수십 년 유지보수. LV SW = 짧고 정확 1회.

## 환경 비교

| 항목 | 항공기 | 발사체 |
|---|---|---|
| 온도 | -55 ~ +85°C | -55 ~ +125°C + 진공 |
| 진동 | 100 Hz, 5 g | 2000 Hz, 50 g (이륙) |
| EMI | 항공 RF | 추진 noise, plasma |
| Radiation | 고고도 cosmic ray | LEO SAA + GCR |
| 압력 | 0.5 ~ 1 atm | 1 atm → 진공 |
| 정비 | MRO 가능 | 발사 후 *접근 불가* |

LV가 훨씬 가혹하지만 시간은 짧음.

## 이중화 패턴

항공기

- Pilot + Co-pilot (human redundancy)
- TMR FCC
- Dispatch reliability (ground crew)

발사체

- 완전 자율
- Pilot 없음
- Range Safety Officer (FTS)
- TMR + voting 또는 lock-step
- Sensor fusion

LV는 *autonomous decision* — 모든 fault detection·recovery가 비행 중.

## 안전 표준

| 도메인 | 표준 |
|---|---|
| 민간 항공 | DO-178C (A·B·C·D·E) |
| LV — NASA | NPR 7150.2 |
| LV — USAF | AFI 11-2RP, MIL-STD-1540 |
| LV — Commercial | FAA AST §437 |
| LV — Korea | KARI SW Standard, 방사청 |
| LV — ESA | ECSS-Q-ST-80 |

LV는 NASA·ESA·각국 표준 변형.

## SW 아키텍처 차이

### 항공기 FMS

- Continuous control over hours
- Crew interaction (display·input)
- Long-term state (logs·trends)
- Maintenance interface
- Database (nav·airport)

### LV FCC

- Mission timeline pre-programmed
- Autonomous response only
- Real-time control (TVC, RCS)
- Telemetry downlink (not interactive)
- Single mission state machine

LV — state machine 단순. 짧고 명확.

## Mission Phase 예

1. T-3 hr: 연료 충전, GSE 점검
2. T-10 min: ground sequence
3. T-0: 점화 + 발사
4. T+10 sec: clear tower
5. T+1 min: Max-Q
6. T+2 min: 1단 분리
7. T+3 min: 2단 점화
8. T+8 min: 위성 분리
9. T+30 min: 궤도 진입 확인

각 phase = 별도 SW state, sensor·actuator·제어법칙 다름.

## Real-Time 요구

TVC (Thrust Vector Control)

- 1-10 kHz control loop
- Sub-ms latency
- Hard real-time deadline

Sensor fusion

- IMU 1 kHz
- GPS 10 Hz
- Star tracker: 1 Hz

Mission event timing

- Stage separation: ±10 ms
- Engine cutoff: ±10 ms

µs 단위 RT — 결정성 절대 요구.

## 재사용 — Falcon 9·Starship

Falcon 9 reuse

- Booster return (boostback·entry·landing)
- Refurbishment cycle
- 항공기 일부 요구 (long-run)

새 SW 요구

- Reentry guidance
- Grid fin control
- Landing burn
- Fault recovery for reuse

재사용은 항공기·LV의 hybrid — SpaceX가 redefining.

## Korean LV — KSLV-II 누리

누리

- 3-stage liquid (75톤·7톤·7톤 엔진)
- Mission duration: 16분
- Payload: 1500 kg to 700 km LEO

Flight SW

- KARI 자체 개발
- RTEMS·VxWorks
- TMR FCC
- CCSDS telemetry

2022·2023·2025 발사 성공. KARI·한화에어로스페이스 협력.

## SW 비용·규모

| 항목 | 항공기 FCC SW | LV Flight SW |
|---|---|---|
| 규모 | ~5-10M LoC | ~100K - 1M LoC |
| 개발 기간 | 10년+ | 3-5년 |
| 인증 비용 | $1B+ | $100M - $1B |

LV는 훨씬 작지만 결정성·검증은 동등 이상.

## 자주 하는 실수

> ⚠️ 항공기 SW 패턴 그대로 LV에

환경·timing·이중화 spec 다름 → 재검증·재인증 필수.

> ⚠️ "Single-use"라 정비 무시

GSE·hold sequence는 수십 시간. 그동안 SW가 robust해야.

> ⚠️ 항공기·LV "비슷" 가정

Engineer 채용·교육은 *전혀 다른 트랙*.

## 정리

- 항공기 = 수십 년 운용, LV = 수십 분 mission.
- 환경 — LV가 더 가혹.
- LV는 *autonomous*, 항공기는 *crew + redundancy*.
- 표준 — 항공기 DO-178C, LV NASA·ESA·KARI.
- 재사용 (Falcon·Starship) — 두 도메인 경계 흐림.

다음 편은 **FCC 아키텍처**.

## 관련 항목

- [Ch 2: FCC Architecture](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter02-fcc-architecture)
- [Digital Avionics Handbook Ch 1](/blog/embedded/avionics/digital-avionics-handbook/chapter01-avionics-overview)
- [Developing Safety-Critical SW Ch 1](/blog/embedded/avionics/developing-safety-critical/chapter01-assurance-overview)
