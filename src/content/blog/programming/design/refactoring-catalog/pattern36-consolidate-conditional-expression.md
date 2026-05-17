---
title: "Pattern 36: Consolidate Conditional Expression"
date: 2026-06-02T12:00:00
description: "여러 조건이 같은 결과면 — 하나로 묶기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 36
tags: [refactoring, conditional, consolidate, fowler]
draft: true
---

> Outline — *Motivation* — `if a then x; if b then x; if c then x` → `if (a || b || c) then x`. *Mechanics* — side effect 없음 확인·OR/AND로 통합·이름이 좋으면 Extract Function까지. *결과* — 의도가 또렷이 — *동일 결과의 조건들이 한 묶음*.
