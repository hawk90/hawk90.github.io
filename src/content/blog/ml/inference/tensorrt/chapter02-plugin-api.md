---
title: "Ch 2: Plugin API — 커스텀 Op"
date: 2026-05-16T02:00:00
description: "지원되지 않는 op·custom kernel — IPluginV3로 확장."
series: "TensorRT 심화"
seriesOrder: 2
tags: [tensorrt, plugin, custom-op]
draft: true
---

> Outline — *IPluginV3* (modern) — IPluginV2 deprecated. *Lifecycle* — createPlugin·enqueue·destroy. *Custom CUDA kernel* 통합. *Plugin registry* — name·version·namespace. *ONNX parser plugin*. *Plugin attribute serialization*. *Use case* — non-standard ops (Triton fused kernel·exotic activation).
