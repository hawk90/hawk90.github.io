---
title: "Pattern 55: Push Down Field"
date: 2026-06-03T07:00:00
description: "Superclass field가 일부 subclass에만 — 내려보내기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 55
tags: [refactoring, inheritance, push-down-field, fowler]
draft: true
---

> Outline — *Motivation* — superclass field가 대부분 subclass에서 안 쓰임 → 위치가 잘못됨. *Mechanics* — field를 해당 subclass로 옮김·다른 subclass·superclass 사용처 정리. *Inverse* — Pull Up Field.
