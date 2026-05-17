---
title: "Ch 6: Layout Assignment"
date: 2027-08-01T06:00:00
description: "Tensor의 메모리 순서를 결정한다 — minor-to-major dimension."
series: "XLA·OpenXLA 심화"
seriesOrder: 6
tags: [xla, layout, tensor-order, transpose]
draft: true
---

> Outline — *Layout* — minor-to-major order. *Layout assignment pass* — frontend hint·constraint·cost-driven 결정. *Forced layouts* — convolution이 채널 순서 요구. *Transpose insertion* 비용. *Cross-op consistency*. *AllReduce·Collective*과의 상호작용. *Memory bandwidth*가 결정 요인.
