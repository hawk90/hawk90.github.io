---
title: "Ch 10: Bufferization 패스"
date: 2027-07-01T10:00:00
description: "Tensor → memref 변환 — value semantics에서 memory로."
series: "MLIR 심화"
seriesOrder: 10
tags: [mlir, bufferization, tensor, memref]
draft: true
---

> Outline — *Value semantic (tensor)* vs *reference semantic (memref)*. *One-shot bufferize* — modern API. *In-place 분석* — alias·dependency. *Buffer allocation*·*deallocation* 자동화. *Function boundary* 처리. *Performance* — 불필요한 copy 제거. 모던 IR은 *tensor-first* 설계 + late bufferization.
