---
title: "Ch 12: 전력 관리 — Modem/Light/Deep Sleep와 Wake 소스"
date: 2026-05-01T12:00:00
description: "5단계 power mode, RTC 도메인 활용, ULP 코프로세서 미지원 — C3는 RTC GPIO만."
series: "ESP32-C3 Mastering"
seriesOrder: 12
tags: [power, sleep, low-power, rtc, esp32-c3]
draft: true
---

> Outline — *Active* (240MHz, WiFi/BLE on) → *Modem Sleep* → *Light Sleep* → *Deep Sleep*. *전류* 대략 — 80mA → 15mA → 130µA → 5µA. *Wake 소스* — RTC timer, RTC GPIO (1-5 핀), UART break, WiFi (light sleep 한정). *RTC SRAM* — 8KB, deep sleep 보존. *ESP32-C3는 ULP 없음* — 원본 ESP32와 차이. 실제 배터리 수명 계산 예. 시리즈 마무리 — 다음에 다룰 만한 토픽 (BL602, ESP32-H2 등).
