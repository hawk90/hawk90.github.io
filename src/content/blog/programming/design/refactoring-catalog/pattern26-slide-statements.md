---
title: "Pattern 26: Slide Statements"
date: 2026-06-02T02:00:00
description: "관련 코드를 가까이 — 가독성 향상의 작은 리팩토링."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 26
tags: [refactoring, slide-statements, readability, fowler]
draft: true
---

> Outline — *Motivation* — 변수 선언과 사용을 가까이·관련 statement 그룹화. *Mechanics* — dependency 확인 (side effect·read/write)·안전한 순서로 이동. *작은 리팩토링이지만 *큰* 리팩토링 (Extract Function 등)의 발판*. *Tool* — IDE의 move statement.
