---
title: "Pattern 4: Inline Variable"
date: 2026-06-01T04:00:00
description: "변수 이름이 원래 표현식보다 더 정보를 주지 못할 때."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 4
tags: [refactoring, inline-variable, fowler]
draft: true
---

> Outline — *Motivation* — 변수가 의미 추가하지 못함·추후 리팩토링의 걸림돌. *Mechanics* — 모든 참조 위치를 표현식으로 교체·declaration 제거. *Inverse* — Extract Variable. *Side effect*가 있으면 inline 금지.
