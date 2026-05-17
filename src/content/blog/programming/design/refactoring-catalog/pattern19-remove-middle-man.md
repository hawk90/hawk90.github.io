---
title: "Pattern 19: Remove Middle Man"
date: 2026-06-01T19:00:00
description: "Delegate가 너무 많으면 — 중개자 제거."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 19
tags: [refactoring, middle-man, remove-delegate, fowler]
draft: true
---

> Outline — *Motivation* — Hide Delegate 결과가 *너무 많은 위임*·class가 거의 forwarding만. *Mechanics* — delegate getter 제공·client가 직접 호출. *Inverse* — Hide Delegate. *Trade-off* — Demeter 엄격성 vs simplicity·balance.
