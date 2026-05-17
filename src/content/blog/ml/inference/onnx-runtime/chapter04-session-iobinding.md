---
title: "Ch 4: Session·IO Binding"
date: 2028-07-01T04:00:00
description: "Pre-allocated buffer로 copy 최소화."
series: "ONNX Runtime 심화"
seriesOrder: 4
tags: [onnxruntime, iobinding, zero-copy]
draft: true
---

> Outline — *Default Run()* 한계 — 매번 copy. *IoBinding* — input·output buffer 미리 binding. *Pinned memory*·*device memory* 직접 사용. *Multiple session* — sharing allocators. *Run options* — terminate·log severity. *Async Run* — completion callback.
