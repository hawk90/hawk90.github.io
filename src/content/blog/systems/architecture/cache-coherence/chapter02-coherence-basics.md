---
title: "Ch 2: Coherence Basics"
date: 2026-09-01T02:00:00
description: "SWMR·data-value invariant — coherence가 보장하는 두 invariant."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 2
tags: [cache-coherence, swmr, invariant]
draft: true
---

> Outline — *SWMR* — Single-Writer-Multiple-Reader invariant (시간 epoch별로). *Data-Value invariant* — read epoch 시작 시 값은 직전 write epoch의 값. *Coherence는 캐시 시스템이 enforce*. *Cache line granularity* — false sharing 등장. 추상화 — 캐시 없는 시스템과 *구별 불가*해야 한다는 목표.
