---
title: "Ch 11: 프로파일링과 디버깅"
date: 2026-05-16T11:00:00
description: "ML 컴파일러의 성능 회귀·정확도 회귀 잡기."
series: "ML 컴파일러"
seriesOrder: 11
tags: [profiling, debugging, accuracy, regression]
draft: true
---

> Outline — *Per-op timing* — `tvm.runtime.profiler`. *Memory profiling* — peak usage·fragmentation. *Layer-wise accuracy*·*reference run*. *Bit-exact reproducibility*·deterministic flag. *MLIR `--mlir-print-ir-after-failure`*. *Compile time* 측정. *Bisect tooling* — pass·op-level 회귀.
