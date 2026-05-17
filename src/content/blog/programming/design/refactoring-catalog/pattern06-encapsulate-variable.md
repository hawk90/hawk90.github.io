---
title: "Pattern 6: Encapsulate Variable"
date: 2026-06-01T06:00:00
description: "Data를 함수 뒤로 — 접근 통제."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 6
tags: [refactoring, encapsulation, fowler]
draft: true
---

> Outline — *Motivation* — global·widely-used data 접근을 함수로 감싸 추후 변경 용이. *Mechanics* — getter/setter 함수 만들기·모든 직접 접근을 함수 호출로 교체·data를 private. *Variation* — Encapsulate Record (전체 객체)·Encapsulate Collection (List 등). *예전 이름* — Self-Encapsulate Field.
