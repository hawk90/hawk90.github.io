---
title: "Tip 29: Fix the Problem, Not the Blame"
date: 2026-05-11T05:00:00
description: "비난이 아니라 문제를 고쳐라 — 누구의 잘못인지 따지는 시간에 — 문제를 해결할 수 있다."
series: "The Pragmatic Programmer"
seriesOrder: 29
tags: [pragmatic-programmer, debugging]
draft: true
---

## 이 팁의 메시지

> **Fix the Problem, Not the Blame** — 누구의 잘못? 별로 중요하지 X. **문제 해결**이 — 중요.

## 핵심 내용

- 버그가 — 자기 코드인지 — 라이브러리인지 — 시스템인지.
- 누구의 잘못 X.
- 해결의 — 가장 빠른 길.
- 비난은 — 학습을 방해.

## "내 코드 아니야" 함정

> "이건 — 운영체제 버그야."
> "이건 — 컴파일러 버그야."
> "이건 — 라이브러리 버그야."

가능성은 — 매우 낮다. 99% — **내 코드의 가정 어딘가**. 가능성 낮은 자리부터 찾으면 — 시간 낭비.

## 자기 코드부터

- 가장 자주 — **자기 코드**.
- 다음 — 사용 중인 의존성.
- 마지막 — 시스템·언어.

이 순서로 의심한다.

## 팀에서

- "누가 했어?" X.
- "어떻게 일어났나?" O.
- 비난 문화 = 학습 멈춤.
- 책임 문화 ≠ 비난 문화.

## 정리

- 비난 X — 해결 O.
- 자기 코드 가장 먼저.
- 팀에서는 "어떻게 일어났는가" 질문.

## 관련 항목

- [Tip 28: Always Use Version Control](/blog/programming/engineering/pragmatic-programmer/tip28)
- [Tip 30: Don't Panic](/blog/programming/engineering/pragmatic-programmer/tip30)
- [Code Complete Ch 23: Debugging](/blog/programming/engineering/code-complete/ch23-Debugging)
