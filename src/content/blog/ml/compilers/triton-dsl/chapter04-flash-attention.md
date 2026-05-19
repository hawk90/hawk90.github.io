---
title: "Ch 4: Attention 구현 — FlashAttention 스타일"
date: 2026-05-16T04:00:00
description: "Online softmax·tiling — 메모리에서 자유로운 attention."
series: "Triton DSL"
seriesOrder: 4
tags: [triton, flash-attention, softmax, attention]
draft: true
---

> Outline — *Standard attention* — O(N²) memory. *FlashAttention 아이디어* — Q,K,V를 tile로 streaming. *Online softmax* — running max·sum. *Causal masking*. *Backward pass* — recompute approach. *Triton FA kernel*의 line-by-line. *Variants* — FA-2·FA-3·MQA·GQA.
