---
title: "Pattern 43: Remove Flag Argument"
date: 2026-06-02T19:00:00
description: "Boolean flag는 함수의 *두 가지 모드* — 분리."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 43
tags: [refactoring, flag-argument, boolean-flag, fowler]
draft: true
---

> Outline — *Motivation* — `setDeleted(true)`·`process(force=True)`처럼 flag로 *behavior 모드 분기*는 호출 사이트에서 의도 모호. *Mechanics* — 각 모드를 별도 함수로·call site 업데이트. *결과* — `setDeleted()`·`process()` vs `processForce()` 등 명료. *Smell* — flag argument 자체가 코드 냄새.
