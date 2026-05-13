---
title: "Tip 32: Read the Damn Error Message"
date: 2026-05-13
description: "에러 메시지를 — 정말 읽어라. 가장 자주 무시되는 — 가장 값진 정보."
series: "The Pragmatic Programmer"
seriesOrder: 32
tags: [pragmatic-programmer, debugging]
---

## 이 팁의 메시지

> **Read the Damn Error Message** — 에러 메시지를 — **읽어라**. 정말로.

## 핵심 내용

- 에러 메시지는 — 가장 값진 정보.
- 그런데 — 가장 자주 무시.
- 한 줄씩 — 읽는다.
- 스택 트레이스 — 끝까지 본다.

## 흔한 함정

> 에러 → 즉시 스택오버플로 검색 → 첫 답 시도.

에러 메시지 — 보지 않았다. 답을 따라 했지만 — 해결 X.

## 올바른 순서

1. 에러 메시지 — **천천히** 읽는다.
2. 스택 트레이스 — 가장 깊은 자리부터.
3. 자기 코드의 — 첫 줄을 찾는다.
4. 그 줄에서 — 무엇이 잘못?
5. 검색 (필요 시).

## 메시지의 정보

- **에러 타입** — NullPointerException, TypeError.
- **메시지** — "expected X, got Y".
- **위치** — 파일·줄.
- **스택** — 호출 경로.

이 모두를 — 무시하면 — 시간 낭비.

## 정리

- 에러 메시지 = 값진 정보.
- 천천히 읽어라.
- 스택 트레이스 = 호출 경로.
- 검색 전에 — 메시지 이해.

## 관련 항목

- [Tip 31: Failing Test Before Fixing](/blog/programming/engineering/pragmatic-programmer/tip31)
- [Tip 33: select Isn't Broken](/blog/programming/engineering/pragmatic-programmer/tip33)
- [Code Complete Ch 23: Debugging](/blog/programming/engineering/code-complete/ch23-Debugging)
