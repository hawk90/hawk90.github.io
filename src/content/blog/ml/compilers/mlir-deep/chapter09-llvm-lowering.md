---
title: "Ch 9: LLVM dialect로의 Lowering"
date: 2027-07-01T09:00:00
description: "MLIR의 종착역 — LLVM IR로 떨어지는 마지막 단계."
series: "MLIR 심화"
seriesOrder: 9
tags: [mlir, llvm-dialect, lowering, codegen]
draft: true
---

> Outline — *LLVM dialect* — LLVM IR을 MLIR로 모델링. *Convert-to-LLVM* pipeline — `--convert-X-to-llvm`. *Translate*·`mlir-translate -mlir-to-llvmir`. *Aggregate type* 변환. *ABI lowering*. *LLVM optimization*과 협력. *Standalone tool* vs *JIT (ExecutionEngine)*.
