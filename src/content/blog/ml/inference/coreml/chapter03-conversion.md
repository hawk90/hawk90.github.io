---
title: "Ch 3: Model Conversion — coremltools"
date: 2026-05-16T03:00:00
description: "PyTorch·TF → MIL → .mlpackage 변환 흐름."
series: "Core ML 심화"
seriesOrder: 3
tags: [coreml, coremltools, mil, conversion]
draft: true
---

> Outline — *coremltools* — Python lib. *Source* — PyTorch (TorchScript·ExportedProgram·ONNX)·TF·JAX. *MIL (Model Intermediate Language)* — internal IR. *ct.convert()*·`inputs`·`outputs`·`compute_units`. *Iterating MIL* — pass·custom ops. *Trouble shooting* — unsupported op·dynamic shape.
