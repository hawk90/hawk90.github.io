---
title: "Pattern 53: Method Parameter to Constructor Parameter"
date: 2026-07-03T05:00:00
description: "모든 호출에 같은 값 전달 — constructor로 옮기기."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 53
tags: [tdd, beck, constructor-parameter, refactor]
draft: true
---

> Outline — *Method가 매번 같은 dependency를 parameter로 받으면 → constructor에서 한 번만 주입*. *Class field로 보관·method signature 간소*. *DI principle의 적용*. *Object state vs ephemeral parameter 결정*. TDD Part III 마지막 pattern. ch31 §10.
