---
title: "Pattern 46: Replace Query with Parameter"
date: 2026-06-02T22:00:00
description: "함수 내부의 외부 dependency를 parameter로 빼기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 46
tags: [refactoring, dependency-injection, fowler]
draft: true
---

> Outline — *Motivation* — 함수가 *global·implicit 의존성* 호출 → testing·reasoning 어려움. *Mechanics* — query 결과를 parameter로 빼기·caller가 전달. *결과* — pure function에 가까워짐·DI. *Inverse* — Replace Parameter with Query. *Pattern·anti-pattern 균형*.
