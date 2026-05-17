---
title: "Ch 3: Memory Consistency Motivation and Sequential Consistency"
date: 2026-09-01T03:00:00
description: "Lamport의 SC — 가장 단순하고 가장 비싼 일관성 모델."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 3
tags: [memory-consistency, sequential-consistency, lamport]
draft: true
---

> Outline — *왜 consistency가 필요한가* — out-of-order·store buffer가 program order를 깬다. *Sequential Consistency (SC)* — Lamport 정의: program order + total order. *Litmus test* — Dekker's algorithm·SB·MP. *SC 구현* — in-order pipeline·write atomicity. *비용* — 거의 모든 modern CPU가 SC를 포기한 이유.
