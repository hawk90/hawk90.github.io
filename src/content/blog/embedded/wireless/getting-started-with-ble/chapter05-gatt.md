---
title: "Ch 5: GATT — Generic Attribute Profile, 데이터 모델"
date: 2026-05-08T05:00:00
description: "Service → Characteristic → Descriptor 3층. 모든 BLE 애플리케이션 데이터의 골격."
series: "Getting Started with BLE"
seriesOrder: 5
tags: [ble, gatt, service, characteristic, descriptor]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

> Outline — *Attribute* — Handle(16-bit) + Type(UUID) + Value + Permission. *Service* — 관련 characteristic 묶음, primary/secondary. *Characteristic* — 실제 데이터 값 + properties (Read/Write/Notify/Indicate). *Descriptor* — characteristic의 메타 (CCCD = Client Char Config Desc로 notify on/off). *UUID* — 16-bit SIG-adopted vs 128-bit custom. *Operations* — Read, Write, Write Without Response, Notify, Indicate. ATT MTU 협상.
