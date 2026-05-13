---
title: "Ch 7: Refactoring Toward Valuable Unit Tests"
date: 2026-10-17T01:00:00
description: "코드 4 분류 — Domain / Trivial / Controllers / Overcomplicated. 리팩토링 방향."
tags: [TDD, Refactoring, Code Categories]
series: "Khorikov Unit Testing"
seriesOrder: 7
draft: true
---

## 예정 내용
- 코드 4 사분면 (복잡 × 의존 많음)
  - Domain model / algorithm — 복잡 + 의존 적음 → 단위 테스트
  - Trivial — 단순 + 의존 적음 → 테스트 X (저가치)
  - Controllers — 단순 + 의존 많음 → 통합 테스트
  - Overcomplicated — 복잡 + 의존 많음 → 안티 (분리해야)
- humble object 패턴
- functional core 추출
