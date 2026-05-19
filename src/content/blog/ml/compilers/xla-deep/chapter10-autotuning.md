---
title: "Ch 10: Autotuning"
date: 2026-05-16T10:00:00
description: "Heuristic으로는 부족 — 실측 기반 kernel selection."
series: "XLA·OpenXLA 심화"
seriesOrder: 10
tags: [xla, autotuning, kernel-selection, cache]
draft: true
---

* Outline — *Why autotune* — heuristic 비용 모델의 한계. *Algorithm autotuning* — conv·gemm variant 후보 실측. *Block-size·split-k* exploration. *Persistent cache* — 같은 shape에 재사용. *Triton autotuning vs XLA*. *AOT vs JIT* 모드 차이. *Trade-off* — 컴파일 시간.
