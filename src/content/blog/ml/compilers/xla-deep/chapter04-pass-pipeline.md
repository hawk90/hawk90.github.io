---
title: "Ch 4: HLO 패스 파이프라인"
date: 2026-05-16T04:00:00
description: "Algebraic simplifier·CSE·DCE·constant folding — HLO 최적화 단계."
series: "XLA·OpenXLA 심화"
seriesOrder: 4
tags: [xla, hlo-pass, optimization, pipeline]
draft: true
---

> Outline — *Pass pipeline* 구성 — common (target-independent) + target-specific. *Algebraic simplifier*·*reshape moving*·*transpose folding*·*dynamic slice fusion*. *CSE·DCE·sub-computation inlining*. *HLO pass scheduling*. *Pass output dump* via `XLA_FLAGS`. *Module-level transform* vs *fusion-level*.
