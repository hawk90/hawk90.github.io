---
title: "Ch 3: 인터프리터와 메모리 할당"
date: 2026-05-16T03:00:00
description: "Tensor arena·greedy allocator — 메모리를 어떻게 짜는가."
series: "TinyML·Edge AI"
seriesOrder: 3
tags: [tflite-micro, memory, arena, allocator]
draft: true
---

> Outline — *Tensor arena* — single contiguous buffer. *Greedy memory planner* — non-overlapping live tensor 합산. *Persistent vs scratch buffer*. *Activation memory* peak. *Stack/heap* 분리. *Arena size* 계산. *Memory map 출력* — `MicroPrintf`로 디버깅. *2-pass 할당*과 op-level optimization.
