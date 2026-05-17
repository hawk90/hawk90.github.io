---
title: "Pattern 11: Split Phase"
date: 2026-06-01T11:00:00
description: "처리를 두 단계로 — 한 함수가 여러 의무를 다할 때."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 11
tags: [refactoring, split-phase, pipeline, fowler]
draft: true
---

> Outline — *Motivation* — 함수가 *서로 다른 단계*(parsing·calculating·rendering)를 섞어 함. *Mechanics* — intermediate data 만들기·각 phase를 별도 함수로·intermediate를 통해 데이터 전달. *결과* — 단계별 변경 독립. *Use case* — parser→AST→codegen·DTO→domain.
