---
title: "Ch 9: 한계와 Trade-off"
date: 2026-05-16T09:00:00
description: "Triton이 못 하는 것 — 언제 CUDA·CUTLASS로 돌아가야 하나."
series: "Triton DSL"
seriesOrder: 9
tags: [triton, cuda, cutlass, comparison]
draft: true
---

> Outline — *Triton 강점* — 빠른 개발·decent 성능. *약점* — 매우 세밀한 PTX 튜닝 불가·일부 hardware feature 접근 제한. *CUTLASS·cuBLAS*와 비교 — 극단적 GEMM 성능. *Custom CUDA kernel*이 필요한 경우. *Triton + CUDA hybrid* — interop pattern. *Future* — block-level abstraction의 확장.
