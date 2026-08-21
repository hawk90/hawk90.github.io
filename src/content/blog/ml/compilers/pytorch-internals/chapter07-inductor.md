---
title: "Ch 7: TorchInductor — Triton·C++ Codegen"
slug: "ml/compilers/pytorch-internals/chapter07-inductor"
date: 2026-05-16T07:00:00
description: "FX graph → Triton kernel·C++ — PyTorch의 backend compiler."
series: "PyTorch Internals"
seriesOrder: 7
tags: [pytorch, inductor, triton, codegen]
draft: true
topics: ["ml", "ml/compilers"]
---

> Outline — *Inductor pipeline* — FX → IR → scheduler → codegen. *GPU backend* — Triton kernel 생성. *CPU backend* — C++ + OpenMP. *Fusion·scheduling*. *Buffer management*. *Cache directory*. *Configuration* — `torch._inductor.config`. *Cudagraphs* 통합.
