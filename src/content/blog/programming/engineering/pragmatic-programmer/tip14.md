---
title: "Tip 14: Good Design Is Easier to Change Than Bad Design"
date: 2026-05-13T14:00:00
description: "좋은 설계는 변경하기 쉽다 — 변경 비용이 설계 품질의 척도다."
series: "The Pragmatic Programmer"
seriesOrder: 14
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Good Design Is Easier to Change Than Bad Design** — 설계의 좋고 나쁨은 — **변경의 비용**으로 측정된다.

## 핵심 내용

- **변경 가능성** = 설계 품질의 핵심 척도.
- "아름다움"·"우아함" 같은 추상보다 — **구체적**.
- 변경이 어려운 설계 = 나쁜 설계.
- ETC(Easier To Change) — 원칙의 한 줄.

## ETC

> **Easier To Change** = ETC.

20주년 개정판이 만든 슬로건. 모든 설계 결정에 — 한 질문만 던진다.

> "이게 — 변경을 더 쉽게 하는가, 더 어렵게 하는가?"

## 좋은 설계 = 변경 쉬움

- 결합도 낮다 → 한 자리 수정.
- 응집도 높다 → 무엇이 어디인지 명확.
- 의존이 — 안정 방향.
- 추상이 — 적절.

## 나쁜 설계 = 변경 어려움

- 결합도 높다 → 한 변경이 — 도미노.
- 응집도 낮다 → 무엇이 어디인지 모름.
- 의존이 — 불안정 방향.
- 추상이 — 잘못된 자리.

## ETC를 일상에서

- 새 함수 짤 때 — "이게 변경 쉬워지나?"
- 리뷰할 때 — "이 변경이 — 다음 변경을 어렵게 하나?"
- 설계 회의 — "어느 옵션이 더 ETC인가?"

## 정리

- 좋은 설계 = **변경 쉬움**.
- ETC — 한 슬로건.
- 추상한 가치 X — 구체적 척도.

## 관련 항목

- [Tip 13: Build Documentation In](/blog/programming/engineering/pragmatic-programmer/tip13)
- [Tip 15: DRY](/blog/programming/engineering/pragmatic-programmer/tip15)
- [Clean Architecture Ch 1: What Is Design and Architecture?](/blog/programming/design/clean-architecture/)
- [Code Complete Ch 5: Design in Construction](/blog/programming/engineering/code-complete/ch05-Design-in-Construction)
