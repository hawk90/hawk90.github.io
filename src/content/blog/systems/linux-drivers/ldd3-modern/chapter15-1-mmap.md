---
title: "Ch 15.1: Memory Mapping — mmap"
date: 2026-05-13T15:00:00
description: "vma·remap_pfn_range·nopage — 디바이스 메모리를 userspace로."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 15
tags: [linux, driver, mmap, vma]
draft: true
---

> Outline — `mmap` file operation. *vm_area_struct* — VMA 표현. `remap_pfn_range` — 물리 주소 → VMA. `vm_operations_struct` — `fault`·`open`·`close`. *page fault* 모델 — `vmf_insert_pfn`·`vmf_insert_mixed`. `io_remap_pfn_range` for MMIO. 6.x의 `vm_flags_set`·VM_PFNMAP·VM_IO 플래그.
