---
title: "Ch 4: TensorRT와 ONNX"
date: 2026-05-16T04:00:00
description: "ONNX → TensorRT engine — NVIDIA inference 최적화."
series: "ONNX 실전"
seriesOrder: 4
tags: [tensorrt, onnx, nvidia, engine-builder]
draft: true
---

> Outline — *TensorRT* — NVIDIA inference engine. *Workflow* — ONNX parser → network → builder → engine (`.engine`/`.plan`). *Precision* — fp32·fp16·INT8·fp8·INT4. *Calibration* — INT8 entropy calibrator. *Dynamic shape* — optimization profiles. *Layer fusion*·*kernel autotuning*. *Plugin*으로 custom op.
