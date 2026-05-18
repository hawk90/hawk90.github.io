---
title: "Ch 12: BLE 디버깅 — Wireshark, BLE Sniffer, nRF Connect"
date: 2026-05-08T12:00:00
description: "보이지 않는 무선 트래픽을 보는 법. nRF52840 Dongle + Wireshark가 표준 조합."
series: "Getting Started with BLE"
seriesOrder: 12
tags: [ble, debug, wireshark, sniffer, nrf-connect]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

> Outline — *왜 어렵나* — 무선·암호화·동시 광고. *Sniffer 옵션* — nRF52840 Dongle (Nordic 무료), Ellisys (전문가), TI CC1352. *Wireshark + Nordic sniffer plugin* — 캡처·필터·디스크립터. *nRF Connect 모바일 앱* — 안드로이드/iOS, 디바이스 검사. *btmon (Linux)* — HCI 레벨. *흔한 버그* — adv interval 너무 길어 못 잡힘, MTU 협상 실패, 페어링 mismatch, characteristic permissions. 시리즈 마무리.
