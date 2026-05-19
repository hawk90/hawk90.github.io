---
title: "Ch 8: Fence·Sync 객체"
date: 2026-05-16T08:00:00
description: "Cross-device synchronization — DMA fence·syncobj·timeline."
series: "NPU 드라이버 개발"
seriesOrder: 8
tags: [npu, dma-fence, syncobj, timeline-semaphore]
draft: true
---

> Outline — *dma_fence* — kernel sync primitive. *Implicit fence* — DMA-BUF에 첨부. *Explicit fence* — *drm_syncobj* binary·timeline. *Timeline semaphore* — Vulkan style monotonic value. *Cross-driver sync* — NPU 끝나면 GPU/encoder 시작. *Deadlock detection* (fence chain).
