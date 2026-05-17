---
title: "Pattern 56: Replace Type Code with Subclasses"
date: 2026-06-03T08:00:00
description: "Type code (enum·string) — 다형성 subclass로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 56
tags: [refactoring, type-code, subclass, fowler]
draft: true
---

> Outline — *Motivation* — `type` field로 분기 → switch statements 곳곳에. *Mechanics* — type별 subclass 생성·factory가 적절한 subclass 반환·type-specific 동작을 override. *결과* — Replace Conditional with Polymorphism 가능. *대안* — strategy pattern·state pattern·sealed type.
