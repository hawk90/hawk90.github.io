---
title: "Ch 5: IO·메모리 최적화"
date: 2026-05-16T05:00:00
description: "Memory arena·prepacking·external initializer."
series: "ONNX Runtime 심화"
seriesOrder: 5
tags: [onnxruntime, memory-arena, prepacking]
draft: true
---

> Outline — *MemoryArena* — alloc pool. *Memory pattern* — first-run profile로 알맞은 buffer. *Weight prepacking* — weight를 kernel-friendly layout으로 한 번에. *External initializer* — model 파일과 weight 분리 (>2 GB). *MemoryStrategy* config. *Cross-session sharing* — initializer 공유.
