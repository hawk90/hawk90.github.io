---
title: "Ch 2: IEEE 1588 PTP — 정밀 시간 동기"
date: 2026-05-15T02:00:00
description: "산업용 이더넷의 공통 토대. 슬레이브들의 시계를 ≤1µs 정확도로 마스터에 맞추기."
series: "Industrial Ethernet"
seriesOrder: 2
tags: [ptp, ieee-1588, time-sync, master-clock]
draft: true
---

> Outline — *왜 동기*  — 모션 축들이 동시 출발/정지하려면. *NTP vs PTP* — NTP ms, PTP µs (HW timestamp 시 ns). *PTP 4-step message* — Sync → Follow_Up → Delay_Req → Delay_Resp. *Best Master Clock Algorithm* — grandmaster 선출. *Boundary clock vs Transparent clock* — 스위치 처리 방식. *PTPv2 (IEEE 1588-2008)*. *Hardware timestamp* — PHY/MAC 레벨 timestamp가 ns 정확도의 핵심. 백본이 되는 표준.
