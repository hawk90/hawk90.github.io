---
title: "Pattern 38: Pluggable Selector"
date: 2026-07-02T14:00:00
description: "Method name을 string으로 — reflection 기반 dispatch."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 38
tags: [tdd, beck, pluggable-selector, reflection]
draft: true
---

> Outline — *Object에 *call할 method name을 string으로* 보관*·*reflection으로 dispatch*. *Lightweight dynamic dispatch — strategy의 단순 변형*. *Smalltalk·Ruby에서 자연스럽지만 Java·C++에선 trade-off*. *언제 OK·언제 over-engineering*. ch30 §6.
