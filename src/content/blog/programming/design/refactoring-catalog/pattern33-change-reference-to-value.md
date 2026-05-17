---
title: "Pattern 33: Change Reference to Value"
date: 2026-06-02T09:00:00
description: "Reference 객체를 immutable value로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 33
tags: [refactoring, value-object, immutability, fowler]
draft: true
---

> Outline — *Motivation* — sharing 필요 없는데 reference로 다루면 *불필요한 동기화*·variants 추적 어려움. *Mechanics* — value 객체로 만들기·equality 재정의·immutable한 builder/with-method. *DDD value object* 패턴과 일치. *Inverse* — Change Value to Reference.
