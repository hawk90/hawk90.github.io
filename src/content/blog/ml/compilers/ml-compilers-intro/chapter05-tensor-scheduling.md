---
title: "Ch 5: 텐서 스케줄링"
date: 2026-05-16T05:00:00
description: "Loop-level transformation — tiling·vectorization·parallel."
series: "ML 컴파일러"
seriesOrder: 5
tags: [scheduling, tiling, vectorization, halide]
draft: true
---

> Outline — *Halide* 영감 — algorithm·schedule 분리. *TVM schedule primitive*. *Tile size*·*outer/inner loop*. *Reorder·split·fuse*. *Parallelize·vectorize*. *Tensorize* — hardware intrinsic mapping. *Bind* — thread·block·warp. *Cache_read·cache_write*. *Compute_at·compute_inline*.
