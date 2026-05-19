---
title: "Ch 2: 프레임워크 → ONNX 변환"
date: 2026-05-16T02:00:00
description: "PyTorch·TensorFlow·JAX 모델을 ONNX로."
series: "ONNX 실전"
seriesOrder: 2
tags: [onnx, conversion, torch-onnx, tf2onnx]
draft: true
---

> Outline — *PyTorch* — `torch.onnx.export` (legacy)·`torch.onnx.dynamo_export` (modern). *TensorFlow* — `tf2onnx`. *JAX* — `jax-to-tf` 경유. *Common pitfalls* — control flow·dynamic shape·custom op. *Symbolic shape inference*. *Constant folding* on export.
