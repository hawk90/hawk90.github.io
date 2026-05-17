---
title: "Pattern 47: Remove Setting Method"
date: 2026-06-02T23:00:00
description: "Constructor 이후 변경되면 안 되는 field — setter 제거."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 47
tags: [refactoring, immutability, setter, fowler]
draft: true
---

> Outline — *Motivation* — `customer.setId(...)` 같은 setter가 *생성 후 변경 의도 없는 field*에 노출됨 → invariant 위험. *Mechanics* — constructor에서만 설정·setter 제거. *결과* — immutable·thread-safe. *DDD value object* 정렬.
