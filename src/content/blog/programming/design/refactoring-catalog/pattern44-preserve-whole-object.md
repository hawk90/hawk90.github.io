---
title: "Pattern 44: Preserve Whole Object"
date: 2026-06-02T20:00:00
description: "객체의 여러 field만 빼서 넘기지 말고 — 객체 통째로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 44
tags: [refactoring, preserve-whole-object, fowler]
draft: true
---

> Outline — *Motivation* — `f(obj.a, obj.b, obj.c)` 같이 객체 일부만 전달은 의존성 늘림·새 field 추가 시 signature 변경. *Mechanics* — argument를 객체로 교체·내부에서 .a·.b·.c 접근. *Trade-off* — 객체 전체 의존 vs 작은 surface. *DI·testing 시각*에서 균형.
