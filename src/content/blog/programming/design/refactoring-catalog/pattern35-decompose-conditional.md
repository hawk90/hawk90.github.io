---
title: "Pattern 35: Decompose Conditional"
date: 2026-06-02T11:00:00
description: "복잡한 조건문을 named function으로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 35
tags: [refactoring, conditional, named-function, fowler]
draft: true
---

> Outline — *Motivation* — 복잡한 if·else·switch는 *왜·무엇*을 가림. *Mechanics* — condition·then-block·else-block 각각 Extract Function. *결과* — `if (isSummer()) bill = summerBill(); else bill = regularBill();`. *읽기 좋고 변경 용이*.
