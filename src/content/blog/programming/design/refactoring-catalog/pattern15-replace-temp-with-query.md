---
title: "Pattern 15: Replace Temp with Query"
date: 2026-06-01T15:00:00
description: "임시 변수를 query function으로 — Extract Function의 전 단계."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 15
tags: [refactoring, query-function, temp-variable, fowler]
draft: true
---

> Outline — *Motivation* — temp가 한 번만 계산되고 그대로 쓰임 → query로 빼면 다른 곳에서도 재사용·Extract Function의 전제. *Mechanics* — 변수의 right-hand를 method로 extract·변수 inline. *Caveat* — query가 비싸면 caching·Side effect 없을 때만.
