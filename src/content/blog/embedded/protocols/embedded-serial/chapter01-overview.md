---
title: "Ch 1: 임베디드 직렬 통신 개요 — 4가지 주축"
date: 2026-05-16T01:00:00
description: "SPI·I²C·UART·RS-485. 30년 묵은 표준이 여전히 MCU 보드의 80%를 차지하는 이유."
series: "Embedded Protocols 심화"
seriesOrder: 1
tags: [protocols, spi, i2c, uart, rs485, embedded]
draft: true
---

## 한 줄 요약

> **"SPI 빠르고, I²C 핀 적고, UART 비동기, RS-485 멀리"** — 네 프로토콜의 트레이드오프를 한 줄로 외워두면 90% 결정이 끝납니다.

## 어떤 문제를 푸는가

MCU 보드를 보면 거의 모든 외부 디바이스가 이 넷 중 하나로 붙습니다. 센서·디스플레이·플래시·EEPROM·GPS·블루투스 모듈까지.

왜 이 네 가지일까요? — 30년 동안 *깨지지 않은* 이유가 있습니다.

- **간단한 하드웨어** — 단자 2-4개, MCU 내장 페리퍼럴로 충분.
- **표준화** — 칩 제조사가 "이 디바이스는 I²C입니다"라고만 적으면 끝.
- **저비용** — 케이블·커넥터·드라이버 IC가 다 양산화됨.
- **충분한 속도** — 센서 한두 개 읽는데 1Gbps가 필요 없음.

이 4종을 잘 다루는 게 임베디드 SW의 *기본기*입니다.

## 한눈에 보는 구조

![Protocol comparison map](/images/blog/embedded-serial/diagrams/ch01-overview.svg)

네 프로토콜을 **동기/비동기**·**핀 개수**·**최대 속도**·**거리** 두 축으로 매핑한 그림입니다. 각 영역의 *전형적 디바이스*도 함께 표시.

## 한 표로 비교

| 항목 | SPI | I²C | UART | RS-485 |
| --- | --- | --- | --- | --- |
| **동기/비동기** | 동기 (SCLK) | 동기 (SCL) | 비동기 (baud) | 비동기 (UART 위) |
| **마스터/슬레이브** | 1 master, N slaves | N master, N slaves | peer-to-peer | multi-drop |
| **핀 개수** | 4 (+CS per slave) | 2 (SCL/SDA) | 2 (TX/RX) | 2 (A/B) |
| **최대 속도** | 50+ MHz | 5 MHz (HS+) | 보통 ≤4 Mbps | 10 Mbps@12m |
| **거리** | ≤30 cm | ≤1 m | ≤15 m | ≤1200 m |
| **노이즈 내성** | 약 | 약 | 약 (single-ended) | 강 (differential) |
| **풀업 필요** | ✗ | ✓ (open-drain) | ✗ | ✗ (transceiver) |
| **주 용도** | 플래시·SD·디스플레이 | 센서·EEPROM·RTC | 디버그·모뎀·GPS | 산업 필드버스 |

이 표만 외워도 *어떤 디바이스를 어떻게 붙일지*가 절반은 결정됩니다.

## 어디서 어느 걸 쓰나

### SPI 선호 케이스

- **고속 데이터** — SD card, QSPI flash, LCD, 자이로/가속도 센서 (≥1 kHz 샘플)
- **마스터 1대 시스템** — MCU 한 개가 여러 페리퍼럴 잡을 때
- **전원 노이즈 적은 보드** — 클럭 신호가 깨끗해야 안정

### I²C 선호 케이스

- **저속 센서 다수** — 온도·습도·압력·자이로 (≤1 kHz)
- **핀 부족** — Cortex-M0 같이 GPIO 적은 MCU
- **여러 슬레이브** — 100개 넘게 한 버스에 (이론상 127개)

### UART 선호 케이스

- **모듈 사이 통신** — GPS, GSM, Bluetooth, LoRa 모듈
- **디버그 출력** — printf 라인 (보드 살리는 첫 인터페이스)
- **PC와 연결** — USB-Serial 어댑터로 손쉽게 (FT232 등)

### RS-485 선호 케이스

- **거리 1 m 초과** — 같은 빌딩, 같은 공장
- **전기 노이즈 환경** — 모터·인버터 근처
- **multi-drop** — 1 master + N slaves 한 버스에 (Modbus RTU 등)

## 다음 편부터 다룰 것

다음 4 챕터(2-5)는 **SPI**, 그 다음 3 챕터(6-8)는 **I²C**, 9-10편이 **UART**, 11편이 **RS-485**, 마지막 12편이 **디버깅**입니다.

각 프로토콜에서 다음을 다룹니다.

1. **신호 레벨** — 어떤 파형이 나오는지.
2. **프레임 구조** — 한 트랜잭션의 비트 배치.
3. **흔한 함정** — 보드에서 자주 만나는 버그.
4. **MCU 페리퍼럴 사용** — STM32 / nRF / ESP32 코드 예.
5. **Linux 통합** — 디바이스 트리·드라이버.

## 정리

- SPI·I²C·UART·RS-485 4종이 MCU 외부 통신의 80%를 덮는다.
- 동기 vs 비동기, 거리, 핀 개수, 노이즈 내성으로 선택.
- 빠르면 SPI, 핀 부족하면 I²C, 모듈이면 UART, 멀리면 RS-485.
- 30년 표준이라 *상호운용성*이 보장된 게 가장 큰 가치.

다음 편은 **SPI 기초** — 4-wire, CPOL/CPHA, 4가지 모드.

## 관련 항목

- [Ch 2: SPI 기초](/blog/embedded/protocols/embedded-serial/chapter02-spi-basics)
- [CAN 시리즈](/blog/embedded/protocols/can-bus/chapter01-overview)
- [MIPI 시리즈](/blog/embedded/protocols/mipi/chapter01-overview)
