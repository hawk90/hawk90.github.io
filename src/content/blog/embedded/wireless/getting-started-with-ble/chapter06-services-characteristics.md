---
title: "Ch 6: 표준 서비스와 직접 만든 서비스"
date: 2026-05-08T06:00:00
description: "SIG가 정의한 표준 서비스(Battery, Heart Rate, HID 등) vs Custom Service. 언제 어느 쪽?"
series: "Getting Started with BLE"
seriesOrder: 6
tags: [ble, services, sig, custom, profiles]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

> Outline — *SIG-adopted services* — Battery Service (0x180F), Heart Rate, HID, Cycling Speed, Health Thermometer 등 100+. *모바일·OS가 알아서 처리* — Android/iOS 기본 지원. *Custom service* — 128-bit UUID, 자기 데이터 모델. *선택 기준* — 표준에 맞으면 무조건 표준 (상호운용성). 비콘·센서 데이터 등 표준에 없는 건 custom. 책 후반 예제 (heart rate, battery)와 연결. *Service Specification* 문서 읽는 법.
