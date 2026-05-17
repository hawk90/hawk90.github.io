---
title: "Ch 7: BL602 개요"
date: 2025-05-19T13:00:00
description: "BL602 — RV32IMFC 코어, Wi-Fi/BLE, 메모리 맵을 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 7
tags: [RISC-V, BL602, Bouffalo, IoT]
draft: true
---

## 개요

BL602는 Bouffalo Lab의 저가 RISC-V Wi-Fi/BLE SoC다.

---

## 스펙 요약

TODO:

| 항목 | 스펙 |
|------|------|
| 코어 | RV32IMFC (SiFive E24) |
| 클럭 | 192MHz |
| SRAM | 276KB |
| Flash | 외장 2MB (일반) |
| Wi-Fi | 802.11 b/g/n |
| Bluetooth | BLE 5.0 |

---

## BL602 vs ESP32-C3

TODO:

| 항목 | BL602 | ESP32-C3 |
|------|-------|----------|
| 가격 | 더 저렴 | 약간 높음 |
| FPU | 있음 | 없음 |
| 문서 | 적음 | 풍부 |
| SDK | bl_mcu_sdk | ESP-IDF |

---

## 메모리 맵

TODO:

| 주소 | 용도 |
|------|------|
| 0x21000000 | 내부 ROM |
| 0x22000000 | Flash XIP |
| 0x42000000 | SRAM |
| 0x40000000 | 주변장치 |

---

## 주변장치

TODO:

- GPIO
- UART x2
- SPI, I2C
- PWM, ADC, DAC
- DMA

---

## 보드 종류

TODO:

- Ai-Thinker Ai-WB2
- Pine64 PineCone
- DT-BL10

---

## 정리

- BL602는 초저가 RISC-V Wi-Fi SoC
- FPU 내장 (RV32IMFC)
- 문서는 ESP32-C3보다 부족
- 커뮤니티 활발

---

## 다음 장 예고

Ch 8에서는 bl_mcu_sdk 환경을 다룬다.

---

## 참고 자료

- [BL602 Datasheet](https://github.com/bouffalolab/bl_docs)
- [bl_mcu_sdk](https://github.com/bouffalolab/bouffalo_sdk)
