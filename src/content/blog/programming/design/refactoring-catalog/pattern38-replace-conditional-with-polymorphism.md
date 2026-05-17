---
title: "Pattern 38: Replace Conditional with Polymorphism"
date: 2026-06-02T14:00:00
description: "타입별 분기를 다형성으로 — switch가 사라진다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 38
tags: [refactoring, polymorphism, switch, fowler]
draft: true
---

> Outline — *Motivation* — `switch (type)` 한 가지가 여러 곳에 — 새 type 추가 시 모든 switch 수정. *Mechanics* — 각 case를 subclass override·factory가 적절한 subclass 반환·switch 제거. *Trade-off* — class 수 증가 vs 변경 격리. *현대 대안* — sealed class·pattern matching (Kotlin·Scala·Swift·Rust).
