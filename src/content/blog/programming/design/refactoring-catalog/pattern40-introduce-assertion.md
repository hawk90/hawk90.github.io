---
title: "Pattern 40: Introduce Assertion"
date: 2026-06-02T16:00:00
description: "암묵적 invariant를 코드로 명시."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 40
tags: [refactoring, assertion, invariant, fowler]
draft: true
---

> Outline — *Motivation* — "이 시점에 x>0이어야 한다" 같은 *암묵적 가정*을 assertion으로. *Mechanics* — `assert` statement 추가·dev에서 검증·production에서 disable 가능. *vs business logic* — assertion은 *프로그래머가 보장하는* 조건. *Design-by-contract* 정신.
