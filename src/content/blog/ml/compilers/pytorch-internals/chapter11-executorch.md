---
title: "Ch 11: ExecuTorch — 추론용"
date: 2026-05-16T11:00:00
description: "Mobile·embedded inference — PyTorch의 새로운 배포 경로."
series: "PyTorch Internals"
seriesOrder: 11
tags: [pytorch, executorch, inference, mobile]
draft: true
---

> Outline — *ExecuTorch* — TorchScript·LibTorch 후속. *Export → AOT compile → Runtime*. *.pte file* — portable executable. *Backend delegate* — XNNPACK·CoreML·Vulkan·Qualcomm. *Selective build* — 사용된 op만 link. *Embedded constraints* — heap·thread minimal. *Performance vs latency*.
