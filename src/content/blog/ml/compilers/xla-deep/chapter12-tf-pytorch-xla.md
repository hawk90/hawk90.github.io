---
title: "Ch 12: TF·PyTorch와 XLA 통합"
date: 2027-08-01T12:00:00
description: "tf.function·torch_xla — 두 framework가 XLA에 다다르는 길."
series: "XLA·OpenXLA 심화"
seriesOrder: 12
tags: [tensorflow, pytorch, xla, torch-xla]
draft: true
---

> Outline — *TensorFlow* — `tf.function(jit_compile=True)`·SavedModel-to-HLO. *PyTorch/XLA* — lazy tensor·trace + dispatch. *PyTorch + StableHLO* — Torch-MLIR via PJRT. *Common pitfall* — dynamic shape·python side effect. *PJRT integration* — TPU·GPU·NPU. Migrate path — `torch.compile` + OpenXLA backend.
