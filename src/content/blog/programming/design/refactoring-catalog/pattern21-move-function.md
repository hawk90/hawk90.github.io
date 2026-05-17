---
title: "Pattern 21: Move Function"
date: 2026-06-01T21:00:00
description: "함수를 적절한 module로 이동."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 21
tags: [refactoring, move-function, modules, fowler]
draft: true
---

> Outline — *Motivation* — 함수가 자기 module 밖 데이터를 더 많이 만지면 잘못된 위치. *Mechanics* — destination에 함수 복사·source에서 deletes·호출자 업데이트·or delegate. *언제* — *feature envy* 신호일 때.
