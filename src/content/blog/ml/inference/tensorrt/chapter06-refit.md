---
title: "Ch 6: Engine Refit"
date: 2026-05-16T06:00:00
description: "Engine 재빌드 없이 weight만 갱신."
series: "TensorRT 심화"
seriesOrder: 6
tags: [tensorrt, refit, weight-update]
draft: true
---

* Outline — *IRefitter* — engine에서 weight만 변경. *Refit flag* — `kREFIT` enable해서 빌드. *Weight name 매핑* — ONNX initializer name이나 API name. *Use case* — fine-tune된 weight 배포·LoRA swap. *Refit 영향* — engine size 약간 증가. *Performance impact* — kernel 동일하므로 동일.
