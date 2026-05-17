---
title: "Ch 10: Consistency and Coherence for Heterogeneous Systems"
date: 2026-09-01T10:00:00
description: "GPU·NPU·FPGA — 가속기가 끼면 일관성 모델이 달라진다."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 10
tags: [heterogeneous, gpu, npu, cxl]
draft: true
---

> Outline — *Heterogeneous coherence* — CPU·GPU·NPU·FPGA가 한 메모리를 공유. *GPU memory model* — scoped consistency·release/acquire per scope. *NVLink·CXL.cache·CCIX* — 표준 interconnect와 일관성. *Bulk transfer* — DMA에서의 coherence. *NPU 가속기 관점* — *scratchpad + coherent path* hybrid. CUDA·OpenCL·SYCL의 일관성 모델.
