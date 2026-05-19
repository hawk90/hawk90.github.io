---
title: "Ch 3: 레이어별 지연 분석"
date: 2026-05-16T03:00:00
description: "어느 layer가 느린가 — top-K hotspot 찾기."
series: "ML 시스템 프로파일링"
seriesOrder: 3
tags: [latency, hotspot, layer-profile]
draft: true
---

> Outline — *Per-op timing* — host queue + device execute. *Cold start vs steady state* — JIT compile·cache miss. *Launch overhead* — small kernel 다수가 누적 비용. *Synchronization stall* — DMA·collective. *Cudagraph·graph capture*로 launch 축소. *Workload별 hotspot 패턴*.
