---
title: "Pattern 22: Move Field"
date: 2026-06-01T22:00:00
description: "Field가 다른 class에서 더 자주 쓰이면 — 이동."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 22
tags: [refactoring, move-field, data-class, fowler]
draft: true
---

> Outline — *Motivation* — field가 자기 class보다 다른 class에서 더 쓰임·*feature envy* 데이터 측면. *Mechanics* — destination class에 field 추가·source에서 setter·getter를 새 위치로 redirect·점진적 이동. *주의* — sync 시점·invariant.
