---
title: "Pattern 61: Replace Superclass with Delegate"
date: 2026-06-03T13:00:00
description: "Inheritance가 안 맞으면 — Superclass도 delegate로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 61
tags: [refactoring, delegation, composition, superclass, fowler]
draft: true
---

> Outline — *Motivation* — superclass의 일부만 필요·LSP 위반. *Mechanics* — superclass를 field로 가지기·필요한 method만 forward·`extends` 제거. *결과* — composition 기반 더 유연한 구조. *유명한 예* — Stack을 Vector 상속 → composition으로 (Java legacy). Catalog 마무리.
