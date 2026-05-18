---
title: "Ch 9: Connection 관리 — Interval·Latency·Supervision Timeout"
date: 2026-05-08T09:00:00
description: "3가지 connection parameter가 처리량과 배터리를 결정한다."
series: "Getting Started with BLE"
seriesOrder: 9
tags: [ble, connection, interval, latency, throughput]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

> Outline — *Connection Interval* — 7.5ms ~ 4s, central이 결정. *Slave Latency* — peripheral이 skip 가능한 interval 수. *Supervision Timeout* — 연결 끊김 판정 시간. *Connection Parameter Update Request* — peripheral이 권장 값 제안. *Channel hopping* — 37개 데이터 채널 중 매 interval마다 변경 (Adaptive Frequency Hopping). *DLE (Data Length Extension, 4.2+)* — 27B → 251B payload. *처리량 계산* — interval, MTU, packets-per-event.
