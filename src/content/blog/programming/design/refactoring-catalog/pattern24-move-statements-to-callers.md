---
title: "Pattern 24: Move Statements to Callers"
date: 2026-06-02T00:00:00
description: "함수 일부가 호출자별로 달라야 — 밖으로 빼기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 24
tags: [refactoring, move-statements, callers, fowler]
draft: true
---

> Outline — *Motivation* — 함수 본문 일부가 모든 호출에 적합하지 않음·일부 호출자만 그 동작이 필요. *Mechanics* — statement를 모든 호출 사이트로 복사·함수에서 제거. *Inverse* — Move Statements into Function. *책임 분리*.
