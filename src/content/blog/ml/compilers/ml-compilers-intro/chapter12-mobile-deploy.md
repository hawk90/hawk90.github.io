---
title: "Ch 12: 사례 — 모바일 배포"
date: 2026-05-16T12:00:00
description: "한 모델을 모바일 NPU·GPU·CPU에 — 컴파일러로 풀기."
series: "ML 컴파일러"
seriesOrder: 12
tags: [mobile, deployment, npu, on-device]
draft: true
---

> Outline — *End-to-end flow* — PyTorch → ONNX/StableHLO → 컴파일러 → device binary. *모바일 환경* 제약 — APK size·메모리·전력. *Vendor SDK 호출* — QNN·CoreML·OpenVINO. *Selective op kernel*·*dead code elimination*. *Performance debugging*. *Multi-device 분기*. *Real-world latency 측정*.
