---
title: "Pattern 23: Move Statements into Function"
date: 2026-06-01T23:00:00
description: "함수 호출 전·후 statement가 항상 함께 — 안으로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 23
tags: [refactoring, move-statements, fowler]
draft: true
---

> Outline — *Motivation* — 같은 statement가 모든 호출 직전/직후에 — 함수 안에 두면 중복 제거. *Mechanics* — 모든 호출 위치 확인·statement를 함수 시작/끝으로 옮김·호출자에서 제거. *Inverse* — Move Statements to Callers.
