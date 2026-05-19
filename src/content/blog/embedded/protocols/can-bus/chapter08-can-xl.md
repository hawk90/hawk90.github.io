---
title: "Ch 8: CAN XL — 10 Mbps, 2048 byte, TCP/IP 운반"
date: 2026-05-16T08:00:00
description: "Bosch 2018·CiA 표준. 페이로드 64 → 2048 byte, 데이터 phase 10-20 Mbps. CAN 위에 IP 패킷."
series: "CAN Bus 심화"
seriesOrder: 8
tags: [can-xl, payload, vcid, ethernet-tunneling, cia-611-1]
draft: true
---

## 한 줄 요약

> **"CAN FD 위에 TCP/IP를 얹는 다리"** — 페이로드 2048B + 10 Mbps. 자동차에 *대용량 + 결정성*을 동시에.

## 어떤 문제를 푸는가

자동차에서 *고대역*은 Automotive Ethernet (100-1000 Mbps)이 정답, *결정성·우선순위*는 CAN이 정답. 그런데 *그 둘이 필요한* 워크로드가 있음:

- 카메라 ROI 데이터 (수 KB 단위) — Ethernet은 *결정성 부족*
- ECU 펌웨어 OTA 패키지 (수 MB) — CAN FD는 *너무 작음*
- IP 패킷 안에 *진단 메시지* — 두 표준 동시 운반

CAN XL이 답 — *2048 byte 페이로드 + 10 Mbps* + *기존 CAN의 우선순위 중재*.

## 표준 — CiA 611-1

Bosch가 2018년 발표, **CiA (CAN in Automation) 611-1**로 표준화. ISO 11898-1 4판 (2024)에 통합 진행 중.

## 한눈에 보는 — 3 세대 비교

| | CAN 2.0 | CAN FD | **CAN XL** |
| --- | --- | --- | --- |
| Nominal bit rate | 1 Mbps | 1 Mbps | 1 Mbps |
| Data bit rate | 1 Mbps | 5 Mbps | **10-20 Mbps** |
| Payload max | 8 byte | 64 byte | **2048 byte** |
| ID 폭 | 11 / 29 bit | 11 / 29 bit | **11 bit + VCID 8 bit** |
| SDT (Service Data Type) | — | — | **1 byte (프로토콜 식별자)** |
| CRC | 15 | 17/21 | **32 (CRC-32 IEEE)** |
| 트랜시버 | 일반 | Fast | **CAN SIC XL 신규** |

## 새 비트 — XLF·SDT·VCID·AF

| 비트 | 의미 |
| --- | --- |
| **XLF** (XL Format) | 1 = CAN XL (FDF의 자리 옆 r) |
| **SDT** (Service Data Type) | 8-bit — 페이로드의 프로토콜 (TCP/IP, 진단 등) |
| **VCID** (Virtual CAN ID) | 8-bit — 가상 채널 구분 |
| **AF** (Acceptance Field) | 32-bit — 더 정밀한 필터링 |

### SDT 카탈로그

CiA가 *SDT 값을 표준 등록*:

| SDT | 의미 |
| --- | --- |
| 0x00 | 사용자 정의 |
| 0x01 | CAN CC (classic) tunneling |
| 0x02 | CAN FD tunneling |
| 0x03 | IEEE 802.3 (Ethernet frame) |
| 0x04 | IETF IPv4 |
| 0x05 | IETF IPv6 |
| 0x06 | TCP segment |
| 0x07 | UDP datagram |
| 0x08-0xFF | CiA 예약 / 미래 |

→ **CAN XL 한 메시지가 *완전한 Ethernet 프레임*을 통째로 운반 가능**.

## CRC-32 — IEEE 표준

CAN FD의 CRC-17/21 대신 **CRC-32 (Ethernet과 동일)**. 더 강력한 무결성 + Ethernet 패킷과 *CRC 재계산 없이 통과*.

다항식: `0xEDB88320` reverse polynomial (IEEE 802.3).

## 트랜시버 — CAN SIC XL

10-20 Mbps에서 *기존 CAN FD 트랜시버*는 부족 (≤ 5 Mbps). 신규 표준:

- **CAN SIC XL** (Signal Improvement Capability XL) — NXP·TI·Infineon 신제품
- 양방향 *active driving*으로 *간섭 보정*
- 후방 호환 — 같은 칩이 CAN 2.0·CAN FD도 처리

NXP TJA1463 (CAN SIC XL transceiver) 2023년 양산. STM32 신제품 (STM32U5 등)이 CAN XL 페리퍼럴 내장 시작.

## VCID — 가상 채널

같은 ID라도 *VCID 다르면 다른 메시지*. 예 — VCID 0은 *컨트롤 채널*, VCID 1-255는 *데이터 채널*.

```text
ID = 0x100, VCID = 0  →  컨트롤 (시스템 상태)
ID = 0x100, VCID = 1  →  카메라 1 데이터
ID = 0x100, VCID = 2  →  카메라 2 데이터
```

→ ID 공간이 *2048 × 256 = 524k* 확장. AUTOSAR Adaptive 같은 *서비스 지향* 시스템에 유리.

## CAN 2.0/FD와 공존

CAN XL은 *기존 CAN 노드와 같은 버스에 못 섞임* (다른 비트 인코딩). 두 옵션:

1. **단일 XL 버스** — 모든 노드 XL 호환 (신차)
2. **Gateway ECU** — 한쪽 CAN FD, 다른쪽 CAN XL, *gateway가 변환*

자동차 OEM의 *2025-2030 도입 로드맵* — 메인 백본은 XL, 레거시 ECU는 FD 유지 + gateway.

## 응용 — 어디 쓰나

### 1) 자동차 IT/OT 융합

- 백본 CAN XL — 진단·OTA·고대역 센서 데이터
- 분기 CAN FD — 일반 ECU
- 분기 LIN — 도어/창문

### 2) 산업 IoT

- 공장 PLC ↔ 센서 노드 (1km 거리)
- TCP/IP 위 SCADA + 산업 결정성

### 3) 의료·로봇

- 다수 액추에이터 + 비전 데이터 동시
- 결정성 + 대역폭 동시

## 코드 — 페리퍼럴 부재

STM32 표준 라이브러리는 *2026년 5월 기준* CAN XL 미지원. 다음 칩에서 등장 예정:

- STM32U5 (Cortex-M33, 2024) — 페리퍼럴 미지원
- 차세대 — 미공개

당장은 *Bosch IP* 또는 *Microchip MCP25xFXL*을 외부 SPI 칩으로 부착하는 방식이 현실.

## 자주 하는 실수

> ⚠️ CAN FD 트랜시버로 CAN XL 시도

5 Mbps 한계 트랜시버로 10 Mbps 시도 → *신호 깨짐*. CAN SIC XL 트랜시버 필요.

> ⚠️ 같은 버스에 XL과 FD/CC 섞기

비트 인코딩 호환 안 됨. Gateway ECU 분리.

> ⚠️ SDT를 사용자 정의로 마구

SDT 0x00은 *완전 사용자 정의*. 표준 코덱 (TCP·UDP·Ethernet)이 있으면 등록된 SDT 사용 → *다른 회사 도구와 호환*.

> ⚠️ CRC-32 직접 구현 시도

페리퍼럴이 자동 처리. 펌웨어에서 *직접 CRC-32 계산 후 데이터에 포함*하면 *이중 CRC + 헷갈림*.

## 정리

- CAN XL = **2048 byte + 10-20 Mbps + CRC-32 + SDT/VCID**.
- *기존 CAN FD/CC와 같은 버스에 못 섞임* — gateway 필요.
- **TCP/IP·Ethernet frame** 그대로 운반 가능 (SDT 0x03-0x07).
- 트랜시버 — **CAN SIC XL** 신규 (NXP TJA1463 등).
- 자동차 백본의 *차세대* — 2025-2030 도입 본격화.

다음 편은 **CANopen** — 산업 자동화의 CAN 위 표준 프로토콜.

## 관련 항목

- [Ch 7: CAN FD 프레임](/blog/embedded/protocols/can-bus/chapter07-can-fd-frame)
- [Ch 9: CANopen](/blog/embedded/protocols/can-bus/chapter09-canopen)
