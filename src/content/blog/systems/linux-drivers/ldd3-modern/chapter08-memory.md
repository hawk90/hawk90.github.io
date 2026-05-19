---
title: "Ch 8: Allocating Memory"
date: 2026-05-13T08:00:00
description: "kmalloc·vmalloc·alloc_pages·slab·devm — 커널 메모리 할당 도구."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 8
tags: [linux, driver, memory, kmalloc, vmalloc, slab]
draft: true
---

> Outline — `kmalloc` flags — `GFP_KERNEL`·`GFP_ATOMIC`·`GFP_DMA`·`__GFP_ZERO`. `vmalloc` — large·non-contiguous. `alloc_pages`·`__get_free_pages`. slab — `kmem_cache_create`·`kmem_cache_alloc`. *devm 관리* (`devm_kmalloc`) — 모던 driver의 *resource auto-free*.
