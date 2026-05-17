---
title: "Pattern 16: Extract Class"
date: 2026-06-01T16:00:00
description: "Class가 너무 많은 책임 — 일부를 분리."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 16
tags: [refactoring, extract-class, srp, fowler]
draft: true
---

> Outline — *Motivation* — class가 *너무 많은 일* (SRP 위반)·data 그룹이 함께 다님. *Mechanics* — 새 class 생성·해당 field·method 이동·기존 class는 새 class에 위임. *Pitfall* — 양방향 reference·circular dependency. *결과* — focused, testable smaller class.
