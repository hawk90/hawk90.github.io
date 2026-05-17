---
title: "Ch 3: INT8 Calibration"
date: 2028-06-01T03:00:00
description: "Entropy calibrator·MinMax — INT8 변환 정확도 보존."
series: "TensorRT 심화"
seriesOrder: 3
tags: [tensorrt, int8, calibration, quantization]
draft: true
---

> Outline — *IInt8Calibrator* 인터페이스. *Calibration dataset* — representative sample 100-1000. *Algorithm* — Entropy 2·Legacy·MinMax·Percentile. *Calibration cache* — `.cache` 파일 재사용. *Per-channel quantization*·*per-tensor*. *Accuracy drop* 진단·*sensitive layer*는 FP16 fallback.
