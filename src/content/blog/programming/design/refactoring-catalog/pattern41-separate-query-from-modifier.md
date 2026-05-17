---
title: "Pattern 41: Separate Query from Modifier"
date: 2026-06-02T17:00:00
description: "값 반환과 부작용을 한 함수에 섞지 말 것."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 41
tags: [refactoring, cqs, command-query, fowler]
draft: true
---

> Outline — *Motivation* — Command-Query Separation (CQS, Meyer) 원칙. *값 반환 = query·side effect = command*. *Mechanics* — query 함수 추출·기존 함수는 modifier만. *결과* — testing 쉬워짐·reasoning 단순. *Practical exception* — pop·next 같은 stdlib는 양쪽 다.
