---
title: "Ch 3: Tiled Matmul 예제"
date: 2026-05-16T03:00:00
description: "K-loop·accumulator·shared memory — Triton matmul anatomy."
series: "Triton DSL"
seriesOrder: 3
tags: [triton, matmul, gemm, tile]
draft: true
---

> Outline — *BLOCK_M·BLOCK_N·BLOCK_K* tile. *K-loop accumulator*. *tl.dot* — tensor core 활용. *Pointer advance*·`group_M` swizzle for L2 reuse. *Boundary check* — `mask`. *Mixed-precision* (fp16 → fp32 acc). *Comparison vs cuBLAS GEMM*.
