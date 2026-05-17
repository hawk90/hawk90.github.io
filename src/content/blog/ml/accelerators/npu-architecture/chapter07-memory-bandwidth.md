---
title: "Ch 7: 메모리 계층과 대역폭 병목"
date: 2028-01-01T07:00:00
description: "NPU 성능의 99%는 메모리 — tier별 설계 결정."
series: "NPU 아키텍처"
seriesOrder: 7
tags: [npu, memory-hierarchy, bandwidth, scratchpad]
draft: true
---

> Outline — *On-chip SRAM (scratchpad)* — MB 단위. *L1·L2 cache* (가속기는 cache 없는 경우 많음). *HBM·LPDDR·GDDR* off-chip. *Bandwidth wall* — compute는 빨리, BW는 느리게. *Operational intensity*. *Software-managed* (NPU) vs *cache* (GPU). *DMA descriptor*·*prefetch* 설계.
