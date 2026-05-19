---
title: "Ch 4: 메모리 대역폭 병목"
date: 2026-05-16T04:00:00
description: "HBM·L2·SRAM — bandwidth가 어디서 막히는가."
series: "ML 시스템 프로파일링"
seriesOrder: 4
tags: [memory-bandwidth, hbm, cache, dram]
draft: true
---

> Outline — *Achieved bandwidth* 측정 — `dram__throughput`·`lts__throughput`. *Cache hit ratio*·*coalescing*. *Bank conflict* (GPU shared memory). *NUMA·multi-GPU 통신*. *MBU (Memory Bandwidth Utilization)* KPI. *Bandwidth saturation* 패턴 — model weight prefetch·KV cache.
