---
title: "Pattern 28: Replace Loop with Pipeline"
date: 2026-06-02T04:00:00
description: "Loop를 filter·map·reduce — 함수형 표현."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 28
tags: [refactoring, pipeline, functional, fowler]
draft: true
---

> Outline — *Motivation* — loop의 의도가 *collection pipeline*으로 더 잘 표현됨. *Mechanics* — collection을 source로·filter·map·reduce 단계별 연결·imperative loop 제거. *언어별* — JS Array methods·Java Stream·Python list comp·LINQ. *Trade-off* — readability vs debugger 친화도.
