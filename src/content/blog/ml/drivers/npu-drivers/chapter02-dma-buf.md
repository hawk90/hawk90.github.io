---
title: "Ch 2: DMA-BUF와 버퍼 공유"
date: 2026-05-16T02:00:00
description: "Cross-driver buffer sharing — NPU·camera·codec이 같은 버퍼를."
series: "NPU 드라이버 개발"
seriesOrder: 2
tags: [npu, dma-buf, sharing, sync]
draft: true
---

> Outline — *DMA-BUF* — Linux kernel cross-driver buffer sharing. *Exporter·importer*. *fd 기반* — userspace에서 다른 driver로 전달. *map·unmap·sync* operation. *Implicit fence* — old semantic. *Explicit fence* — sync_file·drm_syncobj. *V4L2·DRM·NPU* 간 zero-copy.
