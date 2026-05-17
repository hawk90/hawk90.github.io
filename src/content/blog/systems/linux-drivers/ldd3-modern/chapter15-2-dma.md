---
title: "Ch 15.2: DMA — Coherent·Streaming·Scatter-Gather"
date: 2026-06-01T15:30:00
description: "dma_alloc_coherent·dma_map_single·sg_table — 디바이스 ↔ 메모리 직접 전송."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 16
tags: [linux, driver, dma, iommu, scatter-gather]
draft: true
---

> Outline — *DMA 매핑* 두 종류 — *coherent* (`dma_alloc_coherent`) vs *streaming* (`dma_map_single`). *DMA mask* — addressable 범위. *scatter-gather* — `sg_table`·`dma_map_sg`. *IOMMU* — 가상 주소 매핑. 6.x의 `dma-buf` — cross-driver buffer sharing. *cache coherency*와 barrier.
