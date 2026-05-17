---
title: "Ch 8: Performance — Tile Shader·Raster Order"
date: 2027-11-01T08:00:00
description: "Apple GPU-only 가속 기법 — tile·imageblock·simdgroup."
series: "Apple Metal Stack"
seriesOrder: 8
tags: [metal, tile-shader, simdgroup, performance]
draft: true
---

> Outline — *Tile shader* — render pass 중간에 compute. *Imageblock* — TBDR (Tile-Based Deferred Rendering) tile memory. *Simdgroup matrix* — 8×8 matrix op (M3+). *Raster Order Group* — pixel level sync. *Heaps·argument buffers*로 binding 최소화. *Xcode GPU Frame Capture·Counters*.
