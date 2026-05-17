---
title: "Pattern 25: Replace Inline Code with Function Call"
date: 2026-06-02T01:00:00
description: "Inline 코드가 기존 함수와 같은 일을 하면 — 호출로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 25
tags: [refactoring, dry, function-call, fowler]
draft: true
---

> Outline — *Motivation* — DRY 원칙·동일 로직 중복 → 함수 호출로 통일. *Mechanics* — 기존 함수 식별·inline 코드를 호출로 교체·동작 동일 확인. *주의* — 라이브러리 함수 발견·표준 lib 호출. *Inverse* — Inline Function.
