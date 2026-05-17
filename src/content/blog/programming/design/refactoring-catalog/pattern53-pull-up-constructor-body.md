---
title: "Pattern 53: Pull Up Constructor Body"
date: 2026-06-03T05:00:00
description: "Subclass constructor의 공통 부분 — superclass로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 53
tags: [refactoring, inheritance, constructor, fowler]
draft: true
---

> Outline — *Motivation* — subclass constructor가 거의 같은 setup 코드. *Mechanics* — superclass constructor 만들기·subclass에서 super() 호출·중복 제거. *Caveat* — initialization 순서·field 가시성. *결과* — DRY constructor·super 호출 일관성.
