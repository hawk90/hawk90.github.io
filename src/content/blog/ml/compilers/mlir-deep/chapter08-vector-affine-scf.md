---
title: "Ch 8: vector·affine·scf·memref"
date: 2026-05-16T08:00:00
description: "Loop·memory·SIMD를 추상하는 mid-level dialect 4종."
series: "MLIR 심화"
seriesOrder: 8
tags: [mlir, vector, affine, scf, memref]
draft: true
---

> Outline — *vector* — SIMD 추상. *affine* — affine loop nest·affine map. *scf* — structured control flow (`for`·`if`·`while`). *memref* — pointer-like memory abstraction. 각 dialect 간 lowering 경로. *affine analysis*·*polyhedral transformation*. Linalg → vector/affine/scf 변환 예.
