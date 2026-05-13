---
title: "Tip 34: Don't Assume It—Prove It"
date: 2026-05-13
description: "가정하지 마라 — 증명하라. 실제 데이터·실제 입력·실제 환경으로."
series: "The Pragmatic Programmer"
seriesOrder: 34
tags: [pragmatic-programmer, debugging]
---

## 이 팁의 메시지

> **Don't Assume It—Prove It** — "이 함수는 — 분명히 ..." → 증명하라.

## 핵심 내용

- 가정은 — 디버깅의 적.
- 모든 가정을 — 의심.
- 실제 데이터로 — 검증.
- 코드의 행동을 — 자기 눈으로 본다.

## 가정의 함정

> "이 변수가 — 분명히 null이 아닐 거야."
> "이 분기는 — 절대 안 들어와."
> "이 호출은 — 항상 성공."

이런 가정이 — 깨지는 자리가 — 버그의 자리.

## 증명의 방법

- **로그** — 실제 값을 — 출력.
- **디버거** — 변수를 — 확인.
- **테스트** — 가정을 — 검증.
- **assert** — 코드에 — 명시.

## 실제 데이터로

- 가짜 데이터 — 가정을 — 깨지 못함.
- 실제 데이터 — 가정의 함정을 — 보여 줌.
- 운영 환경 — 가능하면 — 모방.

## 정리

- 가정 X — 증명.
- 실제 데이터·환경.
- 로그·디버거·테스트·assert.

## 관련 항목

- [Tip 33: select Isn't Broken](/blog/programming/engineering/pragmatic-programmer/tip33)
- [Tip 35: Text Manipulation Language](/blog/programming/engineering/pragmatic-programmer/tip35)
- [Tip 39: Use Assertions](/blog/programming/engineering/pragmatic-programmer/tip39)
