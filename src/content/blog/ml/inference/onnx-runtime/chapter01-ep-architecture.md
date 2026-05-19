---
title: "Ch 1: Execution Provider 구조"
date: 2026-05-16T01:00:00
description: "ORT의 vendor 추상 — CPU·CUDA·TensorRT·CoreML·QNN."
series: "ONNX Runtime 심화"
seriesOrder: 1
tags: [onnxruntime, ep, execution-provider]
draft: true
---

> Outline — *Execution Provider (EP)* — backend 추상화. *Built-in EP* — CPU·CUDA·TensorRT·DirectML·CoreML·QNN·OpenVINO·SNPE·CANN·ROCm. *Capability* — supported op list. *Graph partitioning* — supported subgraph는 EP가 실행, 나머지는 CPU fallback. *Priority order*. *Plugin EP 개발* — NPU vendor 진입로.
