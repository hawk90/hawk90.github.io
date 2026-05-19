---
title: "Ch 10: Quantization — PTQ·QAT"
date: 2026-05-16T10:00:00
description: "Post-training·QAT — INT8/INT4·fp8까지."
series: "PyTorch Internals"
seriesOrder: 10
tags: [pytorch, quantization, ptq, qat, fp8]
draft: true
---

> Outline — *PyTorch quantization 라이브러리* — `torch.ao`. *PTQ*·*QAT*·*dynamic*. *Per-tensor vs per-channel*·*symmetric vs asymmetric*. *FX-based quantization* — graph mode. *fp8 (E4M3·E5M2)* — H100·MI300·Sapeon X220. *Calibration*·*observer*·*fake-quant*. *Mobile·NPU 대상* 양자화.
