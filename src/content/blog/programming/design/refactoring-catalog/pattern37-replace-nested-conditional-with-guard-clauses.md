---
title: "Pattern 37: Replace Nested Conditional with Guard Clauses"
date: 2026-06-02T13:00:00
description: "Nested if 피라미드 — early return으로 평탄화."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 37
tags: [refactoring, guard-clause, early-return, fowler]
draft: true
---

> Outline — *Motivation* — 정상 흐름이 nested if 깊이 묻혀 가독성 추락. *Mechanics* — 각 edge case에 *early return*·메인 path는 마지막에 평탄히. *Style 충돌* — "single return point" 논쟁 — Fowler는 guard clause 우대. *결과* — main path가 한눈에.
