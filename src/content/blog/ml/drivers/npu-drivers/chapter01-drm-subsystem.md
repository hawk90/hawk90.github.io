---
title: "Ch 1: 가속기 드라이버 개요 — DRM Subsystem"
date: 2027-12-01T01:00:00
description: "왜 NPU 드라이버를 DRM 위에 만드나."
series: "NPU 드라이버 개발"
seriesOrder: 1
tags: [npu, drm, kernel, driver]
draft: true
---

> Outline — *DRM (Direct Rendering Manager)* — GPU에서 시작했지만 *모든 가속기*의 표준화. *왜 DRM인가* — GEM·DMA-buf·fence·context·sync 표준 제공. *Accel subsystem* (Linux 6.1+) — non-GPU 가속기 전용 child. *대안* — char device·misc device·UIO. *Industry adoption* — Habana·Mediatek APU·Rockchip NPU.
