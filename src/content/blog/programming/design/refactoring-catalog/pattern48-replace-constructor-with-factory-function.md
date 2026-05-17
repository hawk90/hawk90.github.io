---
title: "Pattern 48: Replace Constructor with Factory Function"
date: 2026-06-03T00:00:00
description: "Constructor의 한계 — factory function이 더 유연."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 48
tags: [refactoring, factory, constructor, fowler]
draft: true
---

> Outline — *Motivation* — constructor는 이름·subclass 반환·conditional 생성 등 제약. *Mechanics* — static factory method 도입·constructor를 private·factory가 다양한 구성 지원. *결과* — 의미 있는 이름 (`Customer.regular()`·`Customer.vip()`)·subtype 반환. GoF *Factory Method*와 정렬.
