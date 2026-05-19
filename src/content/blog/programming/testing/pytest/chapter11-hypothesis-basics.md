---
title: "Ch 11: Property-based — Hypothesis 기초"
date: 2026-05-10T11:00:00
description: "strategies·examples·settings — example-based 테스트를 property-based로."
series: "pytest 심화"
seriesOrder: 11
tags: [pytest, hypothesis, property-based, strategies]
draft: true
---

> Outline — `@given(st.integers())`로 *난수 입력 생성*. `st.lists`, `st.text`, `st.dictionaries` 등 전략. `@example(...)`로 *반드시 포함될 케이스*. `settings(deadline=None, max_examples=200)`. *property* — 함수의 *불변성* 표현 (예: `decode(encode(x)) == x`).
