---
title: "Ch 2: Heap Memory Management"
date: 2026-07-01T02:00:00
description: "heap_1·heap_2·heap_3·heap_4·heap_5 — 다섯 가지 메모리 할당 전략."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 2
tags: [freertos, heap, memory, allocator]
draft: true
---

> Outline — `pvPortMalloc`·`vPortFree` API. *heap_1* — free 불가, deterministic. *heap_2* — free 가능, fragmentation 위험. *heap_3* — libc malloc 래퍼. *heap_4* — adjacent block 병합, best general purpose. *heap_5* — 여러 비인접 영역 통합. *static allocation* — `configSUPPORT_STATIC_ALLOCATION`.
