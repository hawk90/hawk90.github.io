---
title: "Tip 36: You Can't Write Perfect Software"
date: 2026-05-11T12:00:00
description: "완벽한 소프트웨어는 못 쓴다 — 받아들이고, 방어적으로 코드를 짜라."
series: "The Pragmatic Programmer"
seriesOrder: 36
tags: [pragmatic-programmer, defensive-programming]
draft: true
---

## 이 팁의 메시지

> **You Can't Write Perfect Software** — 받아들이고, **방어적**으로 짜라.

## 핵심 내용

- 완벽한 코드 = 신화.
- 자기 코드를 — 의심.
- 타인의 코드는 — 더 의심.
- 방어적 = **자기 코드의 한계**를 인정.

## 자기 자신을 신뢰 X

- 자기 입력 — 항상 검증.
- 자기 출력 — 계약을 — 지킨다.
- 자기 가정 — 명시(assert).

## 다른 사람의 코드를 더 신뢰 X

- API 호출 — 실패 처리.
- 파일 I/O — 에러 처리.
- 네트워크 — 시간 초과·재시도.

## 사용자 입력을 더더욱 X

- 모든 입력 — 적대적이라 가정.
- 검증 → 정상화 → 사용.

## 방어적 ≠ 망설임

- 방어 = 의도된 한계 인식.
- 망설임 = 무엇이 — 변할지 모름.

방어는 — **자신감**의 표현. "내 코드의 한계를 알고 있다."

## 정리

- 완벽 X — 받아들임.
- 자기·타인·사용자 — 모두 의심.
- 방어 = 자신감.

## 관련 항목

- [Tip 35: Text Manipulation Language](/blog/programming/engineering/pragmatic-programmer/tip35)
- [Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)
- [Code Complete Ch 8: Defensive Programming](/blog/programming/engineering/code-complete/ch08-Defensive-Programming)
