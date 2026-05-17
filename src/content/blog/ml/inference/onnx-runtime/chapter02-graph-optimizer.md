---
title: "Ch 2: Graph Optimizer"
date: 2028-07-01T02:00:00
description: "Basic·Extended·Layout — 3-tier graph optimization."
series: "ONNX Runtime 심화"
seriesOrder: 2
tags: [onnxruntime, graph-optimization, fusion]
draft: true
---

> Outline — *GraphOptimizationLevel* — `DISABLE_ALL·BASIC·EXTENDED·ALL`. *Basic* — DCE·constant folding·shape inference. *Extended* — fusion (conv+bn+relu·attention·gelu·layernorm). *Layout* — NCHW ↔ NHWC. *Transformer-specific* — attention·embedding fusion. *Saving optimized model* via `optimized_model_filepath`.
