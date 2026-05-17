---
title: "Pattern 2: Inline Function"
date: 2026-06-01T02:00:00
description: "함수 본문이 이름만큼 명확하면 — 인라인."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 2
tags: [refactoring, inline-function, fowler]
draft: true
---

> Outline — *Motivation* — 함수가 너무 단순해 의도가 명확하면·잘못된 추출의 복구. *Mechanics* — overridden 아닌지 확인·호출 모두에 본문 inline·함수 정의 제거. *Inverse* — Extract Function. *언제* — Function 추출이 잘못됐거나 helper가 한 줄짜리일 때.
