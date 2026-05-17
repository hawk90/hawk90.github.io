---
title: "Pattern 42: Parameterize Function"
date: 2026-06-02T18:00:00
description: "비슷한 함수 여러 개 — 차이를 parameter로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 42
tags: [refactoring, parameterize, dry, fowler]
draft: true
---

> Outline — *Motivation* — `tenPercentRaise`·`fivePercentRaise` 등 거의 같은 함수가 *literal만 다름*. *Mechanics* — parameter 도입·차이를 인자로·기존 호출 일반화. *결과* — DRY·확장성. *주의* — over-parameterize는 readability 손해 — 균형.
