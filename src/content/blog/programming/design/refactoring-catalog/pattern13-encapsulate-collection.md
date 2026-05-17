---
title: "Pattern 13: Encapsulate Collection"
date: 2026-06-01T13:00:00
description: "Collection을 method 뒤로 — 변경 통로 통일."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 13
tags: [refactoring, encapsulate-collection, fowler]
draft: true
---

> Outline — *Motivation* — collection을 직접 노출하면 외부에서 자유롭게 mutate → invariant 깨짐. *Mechanics* — getter returns copy·add/remove method 제공. *Variation* — return immutable view (Java `Collections.unmodifiableList`·Kotlin readonly). *Pitfall* — 깊은 mutation 방어.
