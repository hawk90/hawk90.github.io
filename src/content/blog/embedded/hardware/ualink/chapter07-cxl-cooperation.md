---
title: "Ch 7: CXL과의 협력 — 메모리 + GPU 연결"
date: 2026-12-01T07:00:00
description: "UALink는 가속기 간, CXL은 host-attached memory — 두 역할 구분."
series: "UALink 심화"
seriesOrder: 7
tags: [ualink, cxl, memory-hierarchy]
draft: true
---

> Outline — *역할 분리* — UALink (accelerator-to-accelerator) + CXL (host-to-device·memory pooling). 둘이 동시에 존재하는 시스템 구성. *Memory tier* — local HBM → UALink remote HBM → CXL DRAM → NVMe. *Coherence boundary*. *Training framework*에서 두 protocol 가시성.
