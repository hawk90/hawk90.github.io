---
title: "Pattern 51: Method Object"
date: 2026-07-03T03:00:00
description: "복잡한 method를 새 class로 — local 변수 = field."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 51
tags: [tdd, beck, method-object, refactor]
draft: true
---

> Outline — *Long method with many local vars → 새 class로 추출*. *Local vars become fields*·*sub-step을 private method로 분해*. *Fowler Catalog의 Replace Function with Command과 같은 정신*. *Refactoring 후 더 다양한 method 분해 가능*. ch31 §8.
