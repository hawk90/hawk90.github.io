---
title: "Pattern 32: Replace Derived Variable with Query"
date: 2026-06-02T08:00:00
description: "계산 가능한 변수를 query function으로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 32
tags: [refactoring, derived-variable, query, fowler]
draft: true
---

> Outline — *Motivation* — derived value를 stored field로 두면 *sync 책임*·invariant 위반 위험. *Mechanics* — getter를 derived 계산으로·field 제거. *Trade-off* — 비용이 크면 memoization. *DDD aggregate 시각* — single source of truth.
