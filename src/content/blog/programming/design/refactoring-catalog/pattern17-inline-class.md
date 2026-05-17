---
title: "Pattern 17: Inline Class"
date: 2026-06-01T17:00:00
description: "Class가 더 이상 책임 충분 안 가지면 — 합치기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 17
tags: [refactoring, inline-class, fowler]
draft: true
---

> Outline — *Motivation* — class가 너무 작아 추상 비용이 가치보다 큼·잘못된 Extract Class 복구. *Mechanics* — 모든 method·field를 다른 class로 이동·delete original. *Inverse* — Extract Class. *판단* — class가 단지 wrapper일 때.
