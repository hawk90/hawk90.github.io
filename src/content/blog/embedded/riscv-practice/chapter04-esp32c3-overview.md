---
title: "Ch 4: ESP32-C3 개요"
date: 2026-05-17T10:00:00
description: "ESP32-C3 — RV32IMC 코어, 메모리 맵, 주변장치를 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 4
tags: [RISC-V, ESP32-C3, Espressif, IoT]
draft: true
---

## 개요

ESP32-C3는 Espressif의 RISC-V 기반 Wi-Fi/BLE SoC다.

---

## 스펙 요약

TODO:

| 항목 | 스펙 |
|------|------|
| 코어 | RV32IMC |
| 클럭 | 160MHz |
| SRAM | 400KB |
| Flash | 외장 4MB (일반) |
| Wi-Fi | 802.11 b/g/n |
| Bluetooth | BLE 5.0 |

---

## 메모리 맵

TODO:

| 주소 | 용도 |
|------|------|
| 0x00000000 | 예약 |
| 0x3C000000 | 외부 Flash (매핑) |
| 0x3FC80000 | 내부 SRAM |
| 0x40000000 | 내부 ROM |
| 0x42000000 | 외부 Flash (실행) |
| 0x60000000 | 주변장치 |

---

## 주변장치

TODO:

- GPIO (22핀)
- UART x2
- SPI x3
- I2C x1
- ADC, PWM, RMT
- USB Serial/JTAG

---

## 부트 모드

TODO:

| GPIO | 모드 |
|------|------|
| GPIO9 = 1 | SPI Flash 부트 |
| GPIO9 = 0 | 다운로드 모드 |

---

## 전원 모드

TODO:

- Active
- Modem-sleep
- Light-sleep
- Deep-sleep

---

## 정리

- RV32IMC 코어
- Wi-Fi + BLE 통합
- 풍부한 주변장치
- 저전력 모드 지원

---

## 다음 장 예고

Ch 5에서는 베어메탈 LED 깜빡이기를 다룬다.

---

## 참고 자료

- [ESP32-C3 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)
