---
title: "Ch 8: Advertising·Scanning — 발견의 비대칭"
date: 2026-05-08T08:00:00
description: "광고 채널 37/38/39, 비콘과 스캐너의 듀티 사이클. iBeacon·Eddystone 포맷."
series: "Getting Started with BLE"
seriesOrder: 8
tags: [ble, advertising, scanning, beacon, ibeacon]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

> Outline — *광고 채널 3개* — 37(2402), 38(2426), 39(2480) — WiFi 회피. *Adv interval + delay* — 0-10ms jitter. *Scan modes* — passive (수신만), active (Scan Request 송신). *Adv PDU types* — ADV_IND, ADV_NONCONN_IND, ADV_DIRECT_IND, ADV_SCAN_IND. *31B payload* (Bluetooth 4) → *255B* (BLE 5 Extended Adv). *iBeacon* — 16B Apple UUID + major + minor. *Eddystone* — UID/URL/TLM (Google, deprecated). *AltBeacon*. *비콘 배터리 수명* — adv interval로 결정.
