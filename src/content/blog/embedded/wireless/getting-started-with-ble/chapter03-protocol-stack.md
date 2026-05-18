---
title: "Ch 3: 프로토콜 스택 — PHY·LL·HCI·L2CAP·ATT·GATT·GAP"
date: 2026-05-08T03:00:00
description: "BLE 스택 7층. Controller(PHY/LL)와 Host(HCI 이상) 분리, GATT가 사용자 인터페이스."
series: "Getting Started with BLE"
seriesOrder: 3
tags: [ble, stack, phy, ll, hci, l2cap, att, gatt]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

> Outline — *Controller* (하드웨어 가까이) — PHY (2.4GHz ISM, 40 채널), Link Layer (advertising·connection 상태기계). *HCI* — Host/Controller 인터페이스 (UART/USB/SPI). *Host* — L2CAP (logical channel) → ATT (attribute protocol) → GATT (profile). *GAP* — 전체 디바이스 정체성·모드. 칩 분류 — Single-chip (nRF52, ESP32) vs Dual-chip (controller + external host).
