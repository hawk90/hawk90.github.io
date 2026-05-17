---
title: "Ch 5: Conversion·Lowering 패턴"
date: 2027-07-01T05:00:00
description: "Dialect 간 lowering — partial·full·dialect conversion."
series: "MLIR 심화"
seriesOrder: 5
tags: [mlir, conversion, lowering, type-converter]
draft: true
---

> Outline — *Dialect Conversion framework*. *Type converter* — type 변환 규칙. *ConversionTarget* — legal/illegal/dynamic. *Partial vs full conversion*. *Materialization* — type 불일치 해결. *Progressive lowering* 전략 — high-level → low-level 단계별. 예 — TensorFlow → TOSA → Linalg → Affine → LLVM.
