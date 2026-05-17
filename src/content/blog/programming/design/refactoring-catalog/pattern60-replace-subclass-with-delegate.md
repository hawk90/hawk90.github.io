---
title: "Pattern 60: Replace Subclass with Delegate"
date: 2026-06-03T12:00:00
description: "상속이 너무 강한 결합 — 위임으로 교체."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 60
tags: [refactoring, delegation, composition, fowler]
draft: true
---

> Outline — *Motivation* — *prefer composition over inheritance*·subclass 다양화 어려움·다중 차원 분류. *Mechanics* — subclass 동작을 delegate object로·main class에 delegate field·dispatch. *결과* — runtime 변경 가능·multiple delegates. *Inverse* — Inheritance 회복.
