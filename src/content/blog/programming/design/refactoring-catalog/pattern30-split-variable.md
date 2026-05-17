---
title: "Pattern 30: Split Variable"
date: 2026-06-02T06:00:00
description: "한 변수가 두 의미로 쓰이면 — 둘로 나누기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 30
tags: [refactoring, split-variable, fowler]
draft: true
---

> Outline — *Motivation* — 변수가 *서로 다른 두 책임*에 재사용됨·loop accumulator 외 다른 용도. *Mechanics* — 새 변수 도입·첫 책임에서 사용·둘째에선 또 다른 변수. *결과* — 각 변수가 single purpose. *Inverse* — 보통 inline.
