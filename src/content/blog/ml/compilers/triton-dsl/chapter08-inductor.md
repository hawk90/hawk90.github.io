---
title: "Ch 8: PyTorch Inductor와의 통합"
date: 2026-05-16T08:00:00
description: "torch.compile이 Triton kernel을 생성한다."
series: "Triton DSL"
seriesOrder: 8
tags: [triton, inductor, torch-compile, codegen]
draft: true
---

> Outline — *TorchInductor* — torch.compile의 default backend. *Triton codegen* — pointwise·reduction·matmul template. *Generated Triton* 보는 법 — `TORCH_LOGS=inductor`. *Custom op*과 Triton kernel 결합. *Inductor cache*. *Performance* — 대부분 eager 대비 1.3-3× 빠름.
