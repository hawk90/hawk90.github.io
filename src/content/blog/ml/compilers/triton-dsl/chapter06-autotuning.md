---
title: "Ch 6: Autotuning"
date: 2026-05-16T06:00:00
description: "@triton.autotune·configs·key — 실측 기반 kernel 선택."
series: "Triton DSL"
seriesOrder: 6
tags: [triton, autotune, configs]
draft: true
---

> Outline — *@triton.autotune* decorator. *Config* — BLOCK·warp·num_stages 조합. *Key* — autotune signature (shape·dtype). *Pruning* — bad config 제거. *Heuristics* fallback. *Cache 영속화*. *Compilation overhead* trade-off. *Best practice* — config space 설계.
