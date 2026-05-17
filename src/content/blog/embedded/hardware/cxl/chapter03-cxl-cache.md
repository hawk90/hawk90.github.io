---
title: "Ch 3: CXL.cache — 호스트 메모리 캐싱"
date: 2026-10-01T03:00:00
description: "Device가 host DRAM을 캐싱한다 — coherency 전송."
series: "CXL 심화"
seriesOrder: 3
tags: [cxl, cxl-cache, coherence]
draft: true
---

> Outline — *Device → Host* 방향 caching. *D2H request* — Rd·RdShared·RdOwn·CLFlush. *H2D snoop* — Inv·Data·Resp. *MESI 상태*가 device cache에. *Bias mode* — host bias vs device bias. *Latency 예산* — ns 단위 round-trip.
