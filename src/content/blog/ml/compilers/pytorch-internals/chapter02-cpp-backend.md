---
title: "Ch 2: C++ Backend — ATen·c10"
date: 2026-05-16T02:00:00
description: "PyTorch의 심장 — Tensor 라이브러리와 core."
series: "PyTorch Internals"
seriesOrder: 2
tags: [pytorch, aten, c10, tensor-impl]
draft: true
---

> Outline — *c10* — core library (Tensor·Storage·Allocator·Device). *ATen* — operator implementation. *TensorImpl* 내부 — shape·stride·storage·dispatch key set. *Storage·Allocator*. *Caching allocator* (GPU). *Memory format* — channels-last 등. *Reference count* + intrusive_ptr.
