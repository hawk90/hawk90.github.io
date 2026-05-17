---
title: "Pattern 9: Combine Functions into Class"
date: 2026-06-01T09:00:00
description: "같은 데이터를 다루는 함수들을 한 클래스로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 9
tags: [refactoring, class-extraction, fowler]
draft: true
---

> Outline — *Motivation* — 함수 묶음이 같은 data를 만지면 *암묵적 객체*가 숨어 있음. *Mechanics* — Encapsulate Record→class·각 함수를 method로 이동·derived value는 계산 method로. *Alternative* — Combine Functions into Transform (read-only flow). *결과* — domain model 표면화.
