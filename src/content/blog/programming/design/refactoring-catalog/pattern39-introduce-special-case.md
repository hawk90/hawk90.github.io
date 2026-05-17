---
title: "Pattern 39: Introduce Special Case"
date: 2026-06-02T15:00:00
description: "Null·missing 처리를 special case object로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 39
tags: [refactoring, special-case, null-object, fowler]
draft: true
---

> Outline — *Motivation* — `if (customer == null || customer.isUnknown())` 분기가 여러 곳·logic 중복. *Mechanics* — special case class·null-object 대신 *unknown* impl·factory 반환. *Variant* — Null Object pattern (Fowler·Beck). *결과* — caller가 special check 안 함.
