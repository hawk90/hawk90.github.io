---
title: "Pattern 45: Replace Parameter with Query"
date: 2026-06-02T21:00:00
description: "함수가 스스로 알 수 있는 값을 parameter로 받지 말 것."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 45
tags: [refactoring, parameter-query, fowler]
draft: true
---

> Outline — *Motivation* — caller가 매번 같은 값 전달·함수 내부에서 계산 가능. *Mechanics* — parameter 제거·내부에서 query 호출. *주의* — query가 referential transparency·side effect 없어야. *Inverse* — Replace Query with Parameter.
