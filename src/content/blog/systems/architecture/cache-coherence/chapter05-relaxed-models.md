---
title: "Ch 5: Relaxed Memory Consistency"
date: 2026-09-01T05:00:00
description: "ARM·Power의 weak model — 거의 모든 reorder 허용."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 5
tags: [relaxed-memory, arm, riscv, fence]
draft: true
---

> Outline — *Relaxed models* — ARM·Power·RISC-V WMO. *모든 reorder 허용*, fence로 명시 제어. *Fence 종류* — full·acquire·release·data dependency. *C++11 memory_order* — relaxed·consume·acquire·release·acq_rel·seq_cst. *Litmus test* — IRIW·SB가 어떻게 표현되는지. *왜 weak가 빠른가* — 하드웨어 자유도.
