---
title: "Tip 13: Build Documentation In, Don't Bolt It On"
date: 2026-05-13T13:00:00
description: "문서를 안으로 짜 넣어라 — 마지막에 덧붙이지 마라. 코드와 함께 자란다."
series: "The Pragmatic Programmer"
seriesOrder: 13
tags: [pragmatic-programmer, documentation]
draft: true
---

## 이 팁의 메시지

> **Build Documentation In, Don't Bolt It On** — 문서를 — 작업의 **마지막 단계**가 아니라 **과정의 일부**로.

## 핵심 내용

- 문서 = 코드와 함께 자란다.
- 마지막에 덧붙임 = **부패**한 문서.
- 코드 가까이에 — 둔다(JavaDoc, docstring).
- 변경 시 — 함께 업데이트.

## 마지막에 덧붙임의 함정

- 마감 임박 — 문서가 후순위.
- 작성자 기억이 — 흐릿.
- 코드와 — 어긋남.
- 다음 사람 = 코드만 신뢰.

## 안으로 짜 넣음

- 함수 위 — 의도 한 줄.
- 모듈 가까이 — README.
- API 문서 — 코드에서 생성.
- 테스트 = — 실행 가능한 문서.

## 좋은 문서

- **왜** — 결정의 배경.
- **불변식** — 항상 참인 조건.
- **함정** — 미래의 함정.
- ~~무엇~~ — 코드가 말한다.
- ~~어떻게~~ — 코드가 말한다.

## DRY 원칙

> 정보는 — **한 자리**.

코드에 표현된 정보를 — 문서에 다시 쓰지 마라. 어긋난다.

## 정리

- 문서 = 과정의 일부, 끝의 덧붙임 X.
- 코드 가까이 — 변경과 함께.
- **왜·불변식·함정**을 담는다.

## 관련 항목

- [Tip 12: What You Say and How](/blog/programming/engineering/pragmatic-programmer/tip12)
- [Tip 14: Good Design Is Easier to Change](/blog/programming/engineering/pragmatic-programmer/tip14)
- [Code Complete Ch 32: Self-Documenting Code](/blog/programming/engineering/code-complete/ch32-Self-Documenting-Code)
- [Clean Code Ch 4: Comments](/blog/programming/engineering/clean-code/chapter04-comments)
