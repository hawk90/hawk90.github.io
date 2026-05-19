---
title: "Ch 1: CAN — 자동차 표준의 40년 진화 (1986 → CAN XL)"
date: 2026-05-16T01:00:00
description: "Bosch가 1986년 발표한 차동 버스. 우선순위 중재로 멀티마스터에 강하다."
series: "CAN Bus 심화"
seriesOrder: 1
tags: [can, can-bus, automotive, bosch, iso-11898]
draft: true
---

## 한 줄 요약

> **"우선순위 ID로 중재되는 차동 멀티마스터 버스"** — 한 줄로 외워두면 90% 결정이 끝납니다.

## 어떤 문제를 푸는가

1980년대 자동차 ECU 수가 폭증하면서 *점대점 배선*이 한계에 다다랐습니다. 차 한 대에 케이블 무게가 50 kg를 넘던 시절.

해결책 — **한 버스에 ECU 다 묶기**. 그러나 다음 요구가 까다로움:

- **결정성** — 브레이크 신호가 늦으면 사람이 죽습니다.
- **노이즈 내성** — 모터·인버터·점화 코일 옆에서도 동작.
- **멀티 마스터** — ECU 어느 것이든 송신 시작 가능, 충돌 시 *결정론적* 우선순위.
- **간단·저비용** — 2 라인, 트랜시버 IC 한 개.

Bosch가 1986년 **CAN 2.0**으로 답을 냈고, ISO 11898로 표준화. 자동차·산업·의료·항공 보조 버스의 *사실상 표준*이 됨.

## 한눈에 보는 구조

![CAN bus topology](/images/blog/can-bus/diagrams/ch01-can-topology.svg)

CAN High·CAN Low 두 라인의 *차이*로 비트를 표현. ECU들은 같은 버스에 *병렬*로 붙음. 양 끝에 120 Ω 종단.

## 왜 자동차에 적합한가

| 요구 | CAN의 답 |
| --- | --- |
| **결정성** | 우선순위 ID — 가장 낮은 ID가 항상 이김 |
| **노이즈 내성** | Differential — common-mode 노이즈 제거 |
| **멀티 마스터** | CSMA/CA + 비파괴 비트 단위 중재 |
| **고장 봉쇄** | Error counter — 결함 노드 자동 격리 |
| **저비용** | 트랜시버 IC ($1 미만), 2 라인 |
| **물리적 robustness** | -40 ~ +85 °C, 자동차 등급 |

이 6가지가 *35년 살아남은* 이유. 모든 자동차 (가솔린·디젤·EV)에 적어도 한 개 이상의 CAN 버스.

## 경쟁 표준 — 자리매김

| 표준 | 속도 | 특징 | CAN과 관계 |
| --- | --- | --- | --- |
| **CAN 2.0** | 1 Mbps | 본 시리즈 주제 | 기준 |
| **CAN FD** | 5 Mbps (data) | 데이터 페이로드 가속 | 후속 (호환) |
| **CAN XL** | 10 Mbps | 페이로드 2048B | CAN 3세대 |
| **LIN** | 19.2 kbps | UART 기반, single-wire | 보조 (도어·창문) |
| **FlexRay** | 10 Mbps | TDMA, 결정성↑ | 안전 (X-by-wire) |
| **Automotive Ethernet** (100/1000BASE-T1) | 100M-1Gbps | 카메라·인포테인먼트 | 대역폭 분야 |
| **MOST** | 25-150 Mbps | 광·infotainment | 옛 인포테인먼트 |

**전형적 차량 — 4 종 혼용**:
- 파워트레인·바디·섀시 = CAN/CAN FD
- 도어·시트·창 = LIN (CAN 보조)
- 카메라·디스플레이 = Automotive Ethernet
- 안전 critical = FlexRay (점차 CAN FD로 대체)

## CAN 2.0 핵심 사양

| 항목 | 값 |
| --- | --- |
| Bit rate | 5 kbps - 1 Mbps |
| 거리 | 1000 m @ 50 kbps, 40 m @ 1 Mbps |
| 노드 수 | 최대 110 (트랜시버 부하 조건) |
| Frame ID | 11-bit (Standard) 또는 29-bit (Extended) |
| Payload | 0-8 byte |
| 토폴로지 | Linear bus, 양 끝 120 Ω 종단 |
| 전기 | Differential, 2-wire (CAN_H·CAN_L) |
| 비트 인코딩 | NRZ + bit stuffing (≥5 동일 비트 후 1 stuff) |

## ISO 11898 시리즈

자동차 등급 CAN의 *법적 표준*:

- **ISO 11898-1** — 데이터 링크 계층 (CAN 2.0 / CAN FD)
- **ISO 11898-2** — 고속 CAN 물리 계층 (Tx/Rx 임피던스)
- **ISO 11898-3** — 저속 fault-tolerant CAN (deprecated)
- **ISO 11898-4** — Time-Triggered CAN (TTCAN)
- **ISO 11898-5** — 고속 + selective wake-up
- **ISO 11898-6** — selective wake-up 확장

대부분 임베디드 개발자는 *11898-1·-2*만 알면 충분.

## 응용 영역

### 자동차 (원조)

- 파워트레인 CAN (엔진·변속기) — 500 kbps
- 바디 CAN (도어·라이트·HVAC) — 125 kbps
- 진단 CAN (OBD-II) — 500 kbps, ID 0x7DF (request) / 0x7E8-7EF (response)

### 산업 자동화

- **CANopen** — IEC 61131 기반, 모션·센서·로봇 (9편)
- **DeviceNet** — Rockwell, CIP over CAN (CAN 2.0 + extra)

### 상용차·중장비

- **J1939** — SAE 표준, 트럭·버스·건설 (10편)
- 29-bit Extended ID 사용
- PGN (Parameter Group Number) 체계

### 의료

- **NMEA 2000** — 보트·해양 (J1939 변형)
- 일부 의료 장비 (수술 로봇 등)

### 항공·우주

- CAN 자체보다 *변형* (TTCAN, ARINC 825)

## 이 시리즈에서 다룰 것

1. **CAN 2.0** (1-5) — 물리·프레임·중재·에러
2. **CAN FD** (6-7) — Flexible Data-Rate, ISO 11898-1:2015
3. **CAN XL** (8) — 10 Mbps, 2048B (2020년 발표)
4. **상위 프로토콜** (9-10) — CANopen, J1939
5. **Linux** (11) — SocketCAN, can-utils
6. **디버깅** (12) — CANalyzer, candump, sniffer

각 챕터에서 **MCU 페리퍼럴 설정·코드·디버깅**까지.

## 정리

- CAN = **우선순위 ID 중재 + differential + 멀티 마스터** = 자동차의 35년 표준.
- ISO 11898 시리즈가 법적 표준. **-1·-2가 핵심**.
- CAN 2.0 → CAN FD → CAN XL 진화로 *데이터 페이로드*를 가속.
- LIN·FlexRay·Auto Ethernet과 *상호 보완*해 한 차에 공존.

다음 편은 **CAN 2.0 물리 계층** — differential signaling, recessive/dominant, bit timing.

## 관련 항목

- [Ch 2: 물리 계층](/blog/embedded/protocols/can-bus/chapter02-physical)
- [Embedded Serial (SPI/I²C/UART)](/blog/embedded/protocols/embedded-serial/chapter01-overview)
- [Industrial Ethernet (EtherCAT/PROFINET)](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
