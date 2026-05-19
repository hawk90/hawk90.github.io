---
title: "Ch 5: 메모리 매핑 (mmap)"
date: 2026-05-16T05:00:00
description: "Driver의 buffer를 userspace VMA에 매핑."
series: "NPU 드라이버 개발"
seriesOrder: 5
tags: [npu, mmap, vma, fault]
draft: true
---

> Outline — *file_operations.mmap*. *VMA flags* — VM_IO·VM_PFNMAP·VM_DONTCOPY·VM_DONTEXPAND. *Fault handler* — on-demand page-in. *GEM mmap* — DRM의 객체별 mmap offset 모델. *Cached vs WriteCombine vs Uncached*. *Performance* — coherent ↔ non-coherent 결정.
