---
title: "Ch 4: Total Store Order and the x86 Memory Model"
date: 2026-05-19T04:00:00
description: "TSO — store buffer를 허용하는 가장 실용적인 일관성 모델."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 4
tags: [tso, x86, memory-model, store-buffer]
draft: true
---

> Outline — *TSO* — SC + store buffer. *Reorder 허용* — store→load. *x86 (and SPARC)* 채택. *Litmus test 변화* — Dekker's가 깨진다. *Fence* — `MFENCE` (x86) — store buffer flush. *Atomic operation* — `LOCK` prefix. *Total Store Order vs PSO·RMO*.
