---
title: "Ch 8: BLE 5.0 — GAP·GATT·Coded PHY"
date: 2026-05-01T08:00:00
description: "BLE 5.0 — 2M PHY로 2배 처리량, Coded PHY로 4배 거리. GATT 서버 만들기."
series: "ESP32-C3 Mastering"
seriesOrder: 8
tags: [ble, bluetooth, gap, gatt, esp32-c3]
draft: true
---

> Outline — *BLE 5 신규* — 2M PHY, Coded PHY (S=2/S=8), Extended Advertising, 광고 데이터 ≥ 255B. *GAP roles* — Central, Peripheral, Broadcaster, Observer. *GATT* — service → characteristic → descriptor 계층. *NimBLE vs Bluedroid* — Espressif 두 스택 비교 (NimBLE가 메모리 효율). 실습 — battery service, HID, beacon. *Pairing* — Just Works, Passkey, OOB.
