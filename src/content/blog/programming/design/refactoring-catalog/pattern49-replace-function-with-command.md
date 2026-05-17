---
title: "Pattern 49: Replace Function with Command"
date: 2026-06-03T01:00:00
description: "복잡한 함수를 object로 — 분해·상태·확장."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 49
tags: [refactoring, command-object, fowler]
draft: true
---

* Outline — *Motivation* — 함수가 *복잡하고 state·하위 함수 많음* → command object. *Mechanics* — class 만들기·local variable을 field로·각 단계를 private method로. *결과* — sub-step extraction·long parameter list 분해·undo 가능. GoF *Command* 패턴. *Inverse* — Replace Command with Function.
