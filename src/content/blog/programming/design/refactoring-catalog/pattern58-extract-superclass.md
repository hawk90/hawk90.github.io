---
title: "Pattern 58: Extract Superclass"
date: 2026-06-03T10:00:00
description: "두 class에 공통 부분 — 공통 superclass 추출."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 58
tags: [refactoring, extract-superclass, fowler]
draft: true
---

> Outline — *Motivation* — 두 class에 공통 method·field이 명확히 보이는 *is-a* 관계. *Mechanics* — 공통 abstract class 만들기·field·method 옮김. *주의* — 단순 공유라면 *Extract Class (composition)* 가 더 좋을 수도 — *favor composition*. *Inverse* — Collapse Hierarchy.
