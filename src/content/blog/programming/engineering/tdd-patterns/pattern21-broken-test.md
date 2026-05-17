---
title: "Pattern 21: Broken Test"
date: 2026-07-01T21:00:00
description: "Solo 작업 끝낼 때 — failing test로 놔두기."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 21
tags: [tdd, beck, broken-test, context-switching]
draft: true
---

> Outline — *Solo 작업 중단 시 *마지막 test를 failing 상태로* 두기*. *돌아왔을 때 *어디서 멈췄는지* 즉시 알 수 있음·바로 cycle 재개*. *Solo only* — pair·CI 환경에선 부적합. *Bookmark for context switching*. ch27 §6.
