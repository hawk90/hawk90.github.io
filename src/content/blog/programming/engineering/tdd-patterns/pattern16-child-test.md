---
title: "Pattern 16: Child Test"
date: 2026-07-01T16:00:00
description: "큰 test가 막히면 — 더 작은 test로."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 16
tags: [tdd, beck, child-test, decomposition]
draft: true
---

> Outline — *현재 test가 너무 크면 *그 일부를 통과시키는 더 작은 test* 작성*. *부모 test는 일단 ignore·child가 통과하면 parent로 돌아옴*. *Stuck 해결의 가장 흔한 도구*. *Step size 동적 조절*. ch27 §1.
