---
title: "Ch 5: Triton 컴파일러 흐름"
date: 2026-05-16T05:00:00
description: "Python AST → Triton IR → TritonGPU IR → LLVM/PTX."
series: "Triton DSL"
seriesOrder: 5
tags: [triton, compiler, mlir, ptx]
draft: true
---

> Outline — *Frontend* — Python AST → Triton IR (MLIR dialect). *TritonGPU IR* — layout·encoding annotation. *Pass* — coalescing·memory hierarchy·pipelining·async copy. *LLVM IR → PTX·AMDGCN·SPIR-V*. *Cache key* — kernel source + constexpr + autotune. *Compilation cost*과 캐싱.
