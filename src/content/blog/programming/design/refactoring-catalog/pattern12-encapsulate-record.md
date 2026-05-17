---
title: "Pattern 12: Encapsulate Record"
date: 2026-06-01T12:00:00
description: "Record를 class로 — 접근 통제 + 미래 변화 대비."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 12
tags: [refactoring, encapsulate-record, fowler]
draft: true
---

> Outline — *Motivation* — bare record (dict·struct)가 직접 노출되면 추후 derived field 추가·rename 어려움. *Mechanics* — class wrapper·getter/setter·deep copy 주의. *Alternative* — Replace Primitive with Object (단일 필드). *Languages* — Java getter·Python @property·JS Proxy.
