---
title: "Ch 12: Property-based 심화"
date: 2026-05-10T12:00:00
description: "composite strategies·shrinking·stateful testing — 복합 도메인 모델링."
series: "pytest 심화"
seriesOrder: 12
tags: [pytest, hypothesis, composite, shrinking, stateful]
draft: true
---

> Outline — `@composite`로 *도메인 객체* 전략 작성. *shrinking* — 실패 케이스를 *최소 형태*로 자동 축소. `RuleBasedStateMachine`으로 *상태 기계* 테스트 (큐·DB·캐시 같은 stateful object). `@settings(database=...)`로 실패 케이스 재현.
