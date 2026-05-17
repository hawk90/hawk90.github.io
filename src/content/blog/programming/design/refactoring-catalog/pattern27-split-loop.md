---
title: "Pattern 27: Split Loop"
date: 2026-06-02T03:00:00
description: "한 loop가 두 가지 일을 하면 — 분리."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 27
tags: [refactoring, split-loop, single-responsibility, fowler]
draft: true
---

> Outline — *Motivation* — 한 loop에서 *서로 무관한 계산 2가지* — Extract Function의 전 단계. *Mechanics* — loop body 복사·두 loop로 분리·각각이 한 가지 책임. *Performance worry는 일단 무시* — 측정하고 결정. *후속* — Extract Function·Pipeline 가능.
