---
title: "Ch 9: ML 워크로드 사례 — Conv·Attention"
date: 2027-11-01T09:00:00
description: "MSL로 conv2d·attention 작성과 성능 분석."
series: "Apple Metal Stack"
seriesOrder: 9
tags: [metal, convolution, attention, benchmark]
draft: true
---

> Outline — *Conv2d MSL* 직접 작성·MPS 비교. *FlashAttention 패턴*을 MSL/MPSGraph로. *Mixed-precision* — fp16·bf16 (M2+). *Performance counter* — instructions·cache hit·occupancy. *Apple Silicon GPU 특징* — fast threadgroup memory·register file. *호환 라이브러리* — llama.cpp·MLX.
