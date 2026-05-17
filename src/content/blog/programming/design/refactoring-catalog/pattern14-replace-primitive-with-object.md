---
title: "Pattern 14: Replace Primitive with Object"
date: 2026-06-01T14:00:00
description: "Primitive obsession 해소 — 값 객체로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 14
tags: [refactoring, primitive-obsession, value-object, fowler]
draft: true
---

> Outline — *Motivation* — string `"USD"`, int `currency_code` 등이 의미 없는 primitive로 남는 *primitive obsession*. *Mechanics* — wrapping class·constructor validation·`equals`/`hashCode`·factory. *결과* — type safety·domain method 추가 가능. *DDD value object*와 정렬.
