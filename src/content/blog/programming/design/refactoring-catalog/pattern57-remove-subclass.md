---
title: "Pattern 57: Remove Subclass"
date: 2026-06-03T09:00:00
description: "Subclass가 더 이상 가치 없을 때 — 제거."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 57
tags: [refactoring, remove-subclass, fowler]
draft: true
---

> Outline — *Motivation* — subclass가 trivial·override 없음·존재 이유 사라짐. *Mechanics* — 사용처를 superclass·factory 호출로 교체·subclass 제거. *Inverse* — Replace Type Code with Subclasses (반대 방향). *Pragmatic* — 단순함이 미덕.
