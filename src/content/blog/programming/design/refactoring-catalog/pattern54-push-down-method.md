---
title: "Pattern 54: Push Down Method"
date: 2026-06-03T06:00:00
description: "Superclass method가 일부 subclass에만 필요 — 내려보내기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 54
tags: [refactoring, inheritance, push-down-method, fowler]
draft: true
---

> Outline — *Motivation* — superclass method가 *일부 subclass에만 의미*가 있음·LSP 위반 회피. *Mechanics* — 해당 subclass로 method 복사·superclass에서 제거·다른 subclass에서 사용처가 있다면 다른 분석 필요. *Inverse* — Pull Up Method.
