---
title: "Pattern 20: Substitute Algorithm"
date: 2026-06-01T20:00:00
description: "알고리즘 자체를 더 명확한 것으로 교체."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 20
tags: [refactoring, substitute-algorithm, fowler]
draft: true
---

> Outline — *Motivation* — 같은 결과를 *더 단순/효율적* 알고리즘으로. *Mechanics* — 새 알고리즘으로 테스트 추가·교체·all tests pass. *예* — quadratic search → hash map·custom sort → standard library. *주의* — 행동 동일 확인 (edge case).
