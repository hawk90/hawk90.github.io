---
title: "Ch 10: PCIe over UCIe — I/O 확장"
date: 2026-11-01T10:00:00
description: "I/O 칩렛을 UCIe로 — root complex와 endpoint를 분리."
series: "UCIe 심화"
seriesOrder: 10
tags: [ucie, pcie, io-chiplet]
draft: true
---

> Outline — *I/O die* (Intel·AMD) — PCIe·Ethernet·USB가 별도 chiplet. *PCIe TLP를 UCIe flit에 매핑*. *Latency 영향*. *Multi-host* 시나리오. AMD Genoa·Intel Granite Rapids 사례. UCIe → 외부 PCIe로 가는 hop 비용 분석.
