---
title: "Pattern 50: Replace Command with Function"
date: 2026-06-03T02:00:00
description: "Command 단순화되면 — 다시 함수로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 50
tags: [refactoring, command-object, fowler]
draft: true
---

> Outline — *Motivation* — command class가 단순해져 *over-engineering*이 되면 함수가 더 적합. *Mechanics* — execute body를 함수로 추출·field를 parameter로·class 제거. *Inverse* — Replace Function with Command. *판단 기준* — 분해 필요·undo·queue가 없으면 함수가 충분.
