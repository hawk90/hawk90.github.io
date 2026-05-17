---
title: "Pattern 51: Pull Up Method"
date: 2026-06-03T03:00:00
description: "Subclass에 중복된 method — superclass로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 51
tags: [refactoring, inheritance, pull-up-method, fowler]
draft: true
---

> Outline — *Motivation* — 여러 subclass에 동일·유사 method → superclass로 옮기면 DRY. *Mechanics* — 한 subclass의 method를 superclass에 복사·다른 subclass에서 제거·signature·body 일치 확인. *Caveat* — 일부만 동일하면 Form Template Method.
