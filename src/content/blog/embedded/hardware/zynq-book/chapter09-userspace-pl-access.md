---
title: "Ch 9: Userspace ↔ PL Access — UIO·mmap·DMA buf"
date: 2026-08-01T09:00:00
description: "Linux userspace에서 PL IP를 다루는 세 가지 길."
series: "The Zynq Book"
seriesOrder: 9
tags: [zynq, uio, mmap, dma-buf, userspace]
draft: true
---

> Outline — *Option 1 — UIO* (Userspace I/O) — `/dev/uioN` mmap·poll for IRQ. *Option 2 — `/dev/mem`* — 빠른 prototype, root 권한 필요. *Option 3 — 전용 커널 드라이버* — DMA buf·char device. *xilinx_axidma* / *Xilinx VFIO* 옵션. *언제 무엇을 쓸지* 결정 기준.
