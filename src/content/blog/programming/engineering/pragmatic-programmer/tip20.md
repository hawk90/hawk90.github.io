---
title: "Tip 20: Use Tracer Bullets to Find the Target"
date: 2026-05-13T20:00:00
description: "조명탄을 써서 표적을 찾아라 — 끝과 끝을 잇는 얇은 코드로 — 빠른 피드백."
series: "The Pragmatic Programmer"
seriesOrder: 20
tags: [pragmatic-programmer, development]
draft: true
---

## 이 팁의 메시지

> **Use Tracer Bullets to Find the Target** — 조명탄(tracer)을 — 어둠 속에서 발사. 궤적이 — 표적을 찾도록 안내.

## 메타포

군인이 어둠 속에서 — 표적을 못 보는 상황. 조명탄을 — 발사한다. 궤적이 보이면 — 점차 조준이 정확해진다.

## 핵심 내용

- 큰 시스템 → 끝과 끝을 잇는 **얇은 코드** 먼저.
- 동작 → 피드백 → 조정.
- 프로토타입 ≠ 조명탄.
- 조명탄 = **실제 코드**(단순하지만 동작).

## 조명탄 vs 프로토타입

| 조명탄 | 프로토타입 |
|---|---|
| 살아남는 코드 | 폐기되는 코드 |
| 점차 완성 | 학습 후 폐기 |
| 모든 층을 통과 | 한 측면만 |

## 적용

- 새 웹앱? → "Hello world" 한 페이지를 — DB·인증·배포까지 전부 통과시킨다.
- 그 후 — 한 기능씩 살을 붙인다.
- 각 단계 = **동작하는** 시스템.

## 이점

- 빠른 피드백.
- 통합 문제 — 일찍 발견.
- 사용자가 — 일찍 본다.
- 동기 유지.

## 정리

- 조명탄 = **얇은 끝-끝 코드**.
- 동작 → 피드백 → 조정.
- 프로토타입과 다름.

## 관련 항목

- [Tip 19: Forgo Following Fads](/blog/programming/engineering/pragmatic-programmer/tip19)
- [Tip 21: Prototype to Learn](/blog/programming/engineering/pragmatic-programmer/tip21)
- [Code Complete Ch 29: Integration](/blog/programming/engineering/code-complete/ch29-Integration)
