---
title: "Pattern 46: Migrate Data"
date: 2026-07-02T22:00:00
description: "Data representation 변경 — 양쪽 유지하면서 점진."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 46
tags: [tdd, beck, migrate-data, refactor]
draft: true
---

> Outline — *Data structure를 새로운 것으로 점진적 교체*. *Old·new 모두 유지하다 점진적 caller migrate·old 제거*. *Test가 양쪽 끝에서 모두 green 유지*. *Branch by abstraction 패턴*. *Big-bang 회피*. ch31 §3.
