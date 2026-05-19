---
title: "Ch 10: PL Acceleration — HLS·AXI DMA Workflow"
date: 2026-05-19T10:00:00
description: "SW 관점에서 PL 가속기 호출하기 — HLS IP·AXI DMA·register map."
series: "The Zynq Book"
seriesOrder: 10
tags: [zynq, hls, acceleration, axi-dma]
draft: true
---

> Outline — *Vitis HLS*로 C/C++ → IP 변환 흐름 (SW 엔지니어 관점). *AXI DMA* — scatter-gather 모드. *Driver call sequence* — bitstream 로드 → register write → DMA transfer → IRQ. *Latency vs throughput* 트레이드오프. *Zero-copy* — DMA buf reuse. *디버깅* — ILA·system trace.
