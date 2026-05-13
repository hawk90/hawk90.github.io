---
title: "Tip 5: Don't Live with Broken Windows"
date: 2026-05-13
description: "깨진 창문과 살지 마라 — 작은 부패가 큰 부패를 부른다. 즉시 고치거나, 표시하라."
series: "The Pragmatic Programmer"
seriesOrder: 5
tags: [pragmatic-programmer, code-quality]
---

## 이 팁의 메시지

> **Don't Live with Broken Windows** — 깨진 창문 하나 = 더 큰 깨짐의 신호.

이 책의 가장 유명한 메타포다. **깨진 창문 이론**(범죄학)을 — 코드에 적용.

## 핵심 내용

- 깨진 창문 하나 — 무관심의 신호.
- 무관심 → 더 큰 깨짐.
- 즉시 **고치거나** — 표시(`TODO`/이슈)하라.
- 방치 X = **방치도 결정**이다.

## 깨진 창문 이론

> 빈 건물의 창문 하나가 깨져 있고 — 일주일 방치된다면, 곧 — 모든 창문이 깨진다.

코드도 같다.

- 더러운 함수 하나가 — 방치되면, 다음 함수도 더러워진다.
- "이미 이러니까 ..." 라는 핑계.
- 부패는 — 빠르게 확산.

## 코드의 깨진 창문

- 죽은 코드.
- 모호한 이름.
- 깨진 테스트.
- 무시된 경고.
- TODO 채로 1년 묵은 자리.

## 두 옵션

1. **고친다** — 즉시 또는 다음 PR에서.
2. **표시한다** — 이슈·티켓·TODO + 마감일.

> 절대 — **방치 X**.

## 보이스카우트 규칙과 연결

> 발견한 자리보다 — 더 깨끗하게 떠나라.

깨진 창문을 본 즉시 — 고쳐 두는 습관. 시간이 지나면 — 시스템 전체가 깨끗해진다.

## 정리

- 깨진 창문 = 부패의 신호.
- 즉시 고치거나 표시.
- 방치 X — 방치도 결정.
- 보이스카우트 규칙과 짝.

## 관련 항목

- [Tip 4: Provide Options](/blog/programming/engineering/pragmatic-programmer/tip04)
- [Tip 6: Be a Catalyst for Change](/blog/programming/engineering/pragmatic-programmer/tip06)
- [Clean Code Ch 1: Clean Code](/blog/programming/engineering/clean-code/chapter01-clean-code)
- [Code Complete Ch 24: Refactoring](/blog/programming/engineering/code-complete/ch24-Refactoring)
