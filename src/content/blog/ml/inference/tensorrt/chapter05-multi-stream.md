---
title: "Ch 5: Multi-Stream Inference"
date: 2026-05-16T05:00:00
description: "CUDA Stream으로 throughput 끌어올리기."
series: "TensorRT 심화"
seriesOrder: 5
tags: [tensorrt, cuda-stream, throughput, concurrency]
draft: true
---

> Outline — *IExecutionContext*당 stream 하나. *Multiple context* — 동시 inference. *cudaStream_t* 명시. *Async H2D / Compute / D2H* 동시 진행. *Pinned memory*·*zero-copy*. *Triton Inference Server 모델 매핑*. *MIG (Multi-Instance GPU)* + multi-stream.
