---
title: "Ch 10: NPU 프로그래밍 모델 비교"
date: 2026-05-16T10:00:00
description: "Graph·command stream·kernel — NPU를 다루는 길들."
series: "NPU 아키텍처"
seriesOrder: 10
tags: [npu, programming-model, graph, command-stream]
draft: true
---

> Outline — *Graph-level* — Core ML·ONNX Runtime·OpenVINO·QNN. *Command stream* — TPU XLA·Habana SynapseAI·Rebellions runtime. *Kernel-level* — 거의 없음 (NPU는 fixed-function 위주). *Cooperative* — host+device split (Mediatek APU). *언제 graph로·언제 cmd stream으로*. NPU compiler 진입로.
