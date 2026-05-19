---
title: "Ch 9: 양자화 컴파일"
date: 2026-05-16T09:00:00
description: "Compiler가 본 quantization — fake quant·QDQ·dequantize folding."
series: "ML 컴파일러"
seriesOrder: 9
tags: [quantization, qdq, ptq, qat]
draft: true
---

* Outline — *Quant IR representation* — fake-quant op·QDQ pair. *PTQ flow* — calibration data·observer·scale/zero-point 계산. *QAT* — gradient through fake-quant. *Quantize·Dequantize op folding*. *Mixed-precision* policy — sensitivity analysis. *Hardware target별 quantization spec* — INT8 symmetric·per-channel.
