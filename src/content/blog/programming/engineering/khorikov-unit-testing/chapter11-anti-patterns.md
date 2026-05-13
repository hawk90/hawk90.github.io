---
title: "Ch 11: Unit Testing Anti-Patterns"
date: 2026-10-18T01:00:00
description: "흔한 안티패턴 — private method 테스트, time leak, code pollution. 시리즈 마무리."
tags: [TDD, Anti-Patterns]
series: "Khorikov Unit Testing"
seriesOrder: 11
draft: true
---

## 예정 내용
- private method 직접 테스트 X
- time leak — DateTime.Now / Math.random 의존
- code pollution — test-only flag in prod
- mocking concrete classes (인터페이스로)
- Code Polluted with Tests
- 시리즈 마무리 — GOOS / TDD by Example 비교
