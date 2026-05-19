---
title: "Ch 2: 보드 선택 가이드"
date: 2026-05-17T08:00:00
description: "RISC-V 보드 — ESP32-C3, BL602, Longan Nano, SiFive HiFive 비교를 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 2
tags: [RISC-V, ESP32-C3, BL602, SiFive, Board]
draft: true
---

## 개요

RISC-V 학습과 개발에 적합한 보드를 비교한다.

---

## 보드 비교표

TODO:

| 보드 | 코어 | 클럭 | RAM | Flash | 가격 | 특징 |
|------|------|------|-----|-------|------|------|
| ESP32-C3 | RV32IMC | 160MHz | 400KB | 4MB | ~$5 | Wi-Fi, BLE |
| BL602 | RV32IMFC | 192MHz | 276KB | 2MB | ~$3 | Wi-Fi, BLE |
| Longan Nano | RV32IMAC | 108MHz | 32KB | 128KB | ~$5 | LCD, 저렴 |
| HiFive1 Rev B | RV32IMAC | 320MHz | 16KB | 4MB | ~$60 | 학습용 |
| HiFive Unmatched | RV64GC | 1.2GHz | 16GB | - | ~$700 | Linux 실행 |

---

## ESP32-C3

TODO:

- Espressif
- Wi-Fi + BLE 5.0
- ESP-IDF + FreeRTOS
- Arduino 지원

---

## BL602/BL616

TODO:

- Bouffalo Lab
- Wi-Fi + BLE
- 저렴한 가격
- 커뮤니티 활발

---

## Longan Nano

TODO:

- Sipeed
- GD32VF103
- 0.96" LCD 내장
- 저렴, 입문용

---

## SiFive HiFive

TODO:

- SiFive 공식 보드
- 학습/개발용
- 문서 풍부
- 가격 높음

---

## 선택 기준

TODO:

| 목적 | 추천 보드 |
|------|----------|
| Wi-Fi/BLE IoT | ESP32-C3 |
| 초저가 입문 | BL602, Longan Nano |
| 학습/문서 중시 | HiFive1 |
| Linux 실행 | HiFive Unmatched |

---

## 정리

- ESP32-C3가 가성비 최고
- BL602는 초저가
- 문서 중시하면 SiFive
- 목적에 맞게 선택

---

## 다음 장 예고

Ch 3에서는 개발 환경 설정을 다룬다.

---

## 참고 자료

- [ESP32-C3](https://www.espressif.com/en/products/socs/esp32-c3)
- [BL602](https://www.bouffalolab.com/)
- [SiFive](https://www.sifive.com/)
