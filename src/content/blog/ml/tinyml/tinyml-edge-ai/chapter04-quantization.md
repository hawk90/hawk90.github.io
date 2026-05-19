---
title: "Ch 4: 모델 양자화 — INT8·INT4"
date: 2026-05-16T04:00:00
description: "Float32 → INT8 — 4× 작게, 빠르게."
series: "TinyML·Edge AI"
seriesOrder: 4
tags: [tinyml, quantization, int8, int4]
draft: true
---

> Outline — *Why quantize on MCU* — int8 MAC만 효율적. *Full integer quantization* — input·output까지 int. *Symmetric vs asymmetric*·*per-channel*. *Calibration dataset* — 100-500 sample. *Accuracy 손실 budget*. *Mixed precision*. *INT4* (weight-only). *Pruning* + quantization 결합.
